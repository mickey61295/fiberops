# SPEC-M37 — Batch 1 Ops Foundation: Backup, WAL, IST Boundary, Idempotency, docNo Uniqueness

> Phase-6B Remediation Spec (docs/PRD/PHASE-6B-REMEDIATION-SPEC.md §4)
> Batch 1 — the five OPS requirements that gate trust in every number the app
> shows. Frozen after implementation + verification (2026-08-31).

## 1. Scope

**OPS-01 — Nightly SQLite backup.** `scripts/backup_db.py` (python3 stdlib
only): `VACUUM INTO` a consistent snapshot (safe under WAL), `PRAGMA
integrity_check` on every fresh snapshot, rotation = 7-day daily + 30-day
weekly (newest-per-ISO-week keeper), `--verify` restore-verifies the newest
snapshot into a temp DB (integrity + core-table counts — the monthly cron
line), off-box copy via `rsync -a --delete` to AppOption
`ops.backup.rsync_target` (row seeded on first run, editable at /masters,
group `ops`). `scripts/install_backup_cron.sh` installs (idempotently,
marker-detected) two `CRON_TZ=Asia/Kolkata` lines: nightly 02:30 + monthly
1st 03:30 with `--verify`. `db/backups/` gitignored. `recovery_drill.sh`
REWRITTEN: newest snapshot → integrity → temp-DB verify → swap (pre-restore
safety copy kept); the destructive `prisma db push --accept-data-loss` is
GONE from the recovery path (plain push fails loudly on drift; only a
MISSING db gets a fresh empty push); the dead `seed_stages.ts` call removed.
Digest gains an **Ops & data growth** section (spec §4 design note): DB size,
StockLedger/AuditLog/AgentTurn counts, newest backup + age (red when missing
or >26h) — rendered as a card on /notifications/digest and carried in the
webhook text.

**OPS-02 — WAL journal mode.** `src/lib/db.ts` runs `PRAGMA journal_mode=WAL`
once per process at first client creation (best-effort; journal_mode is
persistent in the file header, so every later connection — and every
VACUUM INTO snapshot — runs under WAL). Live custom.db verified `delete` →
`wal`. Pinned by test.

**OPS-03 — IST day boundary.** NEW shared module `src/lib/erp/dates.ts`:
`istToday()` / `istDateStr()` (UTC+5:30 arithmetic — India has no DST),
`istDayStart()` / `istTodayDate()` (UTC-midnight of the IST calendar day —
the storage convention), `istDayStartInstant()` (the REAL IST-midnight
instant, 18:30Z, for timestamp columns), `dateOrIstToday()` (explicit date
preserved, blank → IST today, invalid stays NaN so per-service validation
still fires), `endOfUtcDay()` (register to-filter ceiling in explicit UTC).
Migrated: 46 `? new Date(args.X) : new Date()` date fallbacks across all 24
posting services; production.ts `|| new Date().toISOString().slice(0,10)`;
attendance day-start; production-bill period defaults + journal date; agent
tools `today` (suggest_next_step skeletons); digest header date + gate
window; registers/resolve.ts end-of-day; registers/attendance.ts default
window; CSV filenames (server + client master-table); bundle-label print
fallback. **Deviation from spec wording (deliberate, documented): the
process TZ is NOT flipped to Asia/Kolkata** — that would silently re-base
every `new Date(y,m,d)` local-calendar constructor to IST-midnight and
off-by-one ~100 UTC-midnight display sites; the arithmetic module achieves
the IST day boundary with zero storage-convention change. The spec's own
acceptance test ("23:30 UTC = next-day IST") passes against the helpers
without any process-TZ dependency.

**OPS-04 — Commit idempotency.** New `IdempotencyKey` model (key unique =
the lock, door/actor/slug, status pending|done, resultJson). `runCommit`
gains `meta.idempotencyKey` with the insert-first pattern: key row INSERTED
before `plan.commit()` runs (a concurrent twin loses on the unique index),
result stored on success, row DELETED on failure so a retry can attempt.
Replays return the ORIGINAL result; the audit row is written only by the
winning commit. Doors: `commitDocAction(slug, payload, idempotencyKey?)`
(form door — DocScreen mints the token per reviewed plan in `save()`,
consumes it in `commit()`) and `/api/agent/approve` (agent door — the panel
mints the token when the pending-approval CARD is created, not per click;
the route short-circuits replays before even re-planning, returns
`replayed:true`). Verified live: two identical approve POSTs → one row, same
id/docNo on both responses. Timestamps (`gateDateTime`, `irnGeneratedAt`,
live-snapshot `ts`) keep `new Date()` semantics — they are event times.

**OPS-05 — Ledger docNos unique (doc-level).** `StockLedger.docKey
String? @unique` — the doc-level anchor. docNo itself can NEVER be unique
(GT/PT/RTC/RSP pairs share one docNo across out+in legs; GRN/cut/despatch
lines share it across N rows — live DB: GT 276 rows = 138 exact pairs).
Writers set docKey on exactly ONE row per document: ADJ/OPN/WST single row;
GT/PT/RTC/RSP the OUT leg (`postLedger` gained an optional `docKey`;
ready-to-cut + roll-split direct creates set it explicitly). A racing plan
minting the same number now fails the unique index INSIDE the commit
transaction and surfaces as "ADJ-0007 was just taken by another user —
retry" (`docKeyViolation()` mapper in ledger.ts); pre-existing rows
backfilled (142 anchors: 138 GT + 4 RSP out-legs; probe found zero true
duplicates, so no renumbering was needed).

## 2. Design notes

- **Idempotency scope**: keys are minted client-side (crypto.randomUUID) per
  reviewed plan / pending-approval card. Lifecycle actions and the masters
  door do not pass keys yet (runCommit supports them — opt-in per door);
  the spec names exactly the two commit doors that double-submit in
  practice. Key rows grow one-per-keyed-commit (no TTL) — retention rides
  the Phase-6 FR-B archival decision; the digest ops section now makes the
  AuditLog/AgentTurn growth visible daily.
- **`dateOrIstToday` invalid-date contract**: NaN propagates (attendance's
  "Invalid attDate" validation still fires) rather than silently defaulting
  to today.
- **Register end-of-day** is now explicit UTC (`endOfUtcDay`) — behavior
  identical for UTC-midnight-stored dates, but no longer hostage to the
  process TZ.
- **Attendance day-start** = `istDayStart(attDate)`: behavior-preserving for
  explicit 'YYYY-MM-DD' inputs (UTC midnight round-trips), IST-correct when
  the day is defaulted.
- **The sweep**: `scripts/ops3_ist_sweep.py` performed the 46 mechanical
  replacements (skip list: gate.ts gateDateTime — timestamp semantics);
  `scripts/ops5_backfill_dockey.py` the docKey backfill with a
  duplicate-abort guard. Both kept as recoverable artifacts.

## 3. Tests

`tests/pipeline/ops-batch1.test.ts` (22 pins):
- OPS-02: live `PRAGMA journal_mode` = wal + db.ts source contract.
- OPS-03: **the spec pin** (23:30 UTC → next IST day), the 18:30Z exact
  boundary, fixed +5:30 offset, istDayStart storage-convention round-trip +
  rollover, istDayStartInstant (18:30Z), dateOrIstToday
  explicit/blank/invalid, endOfUtcDay, and a behavioral posting default
  (fake clock 20:00Z → planned docDate = next-day IST midnight).
- OPS-04: replay returns the original row id and posts exactly once;
  concurrent same-key → one winner, one loud loser, one row; failed commit
  releases the key (retry possible).
- OPS-05: ADJ stamps docKey on its single row; GT pair stamps the out leg
  only (in leg stays NULL — the pair is legitimate); **the spec pin** — a
  second doc minting the same number fails loudly ("was just taken") and
  mints no duplicate rows; docKeyViolation maps only P2002-on-docKey.
- OPS-01: backup script source contract (VACUUM INTO / integrity /
  verify / rotation / rsync target), recovery drill has NO executable
  --accept-data-loss, backups dir non-empty, digest ops section + IST header
  date.
- Updated 2 existing suites for the honest IST windows: attendance fixtures
  post on `istToday()` (was the server-local UTC date); digest gate test
  unchanged (the window fix made it pass again — gate entries are
  timestamps, window now starts at the real IST-midnight instant).

## 4. Acceptance gates (all green, 2026-08-31)

- vitest **1153/1153** (1131 + 22 new) · tsc src **0 errors** ·
  eval --static **100%** (15/15)
- `scripts/route_smoke_batch1.sh` **15/15**: 9 screens render (money,
  ledger-family docs, digest, attendance, production, stock), digest shows
  the ops section + backup status, custom.db journal_mode=wal, docKey index
  + IdempotencyKey table live, backfill = 142 anchors
- LIVE browser (agent-browser): /notifications/digest renders the Ops &
  data growth card — `DB 5.4 MB · StockLedger 1,181 · AuditLog 7 ·
  AgentTurn 428 · Backup: custom-20260831-004319.db · <1h old`
  (screenshot: scripts/m37-digest-ops-card.png)
- LIVE double-click on /api/agent/approve: two identical POSTs → one
  committed row (ADJ-0001), second response `"replayed":true` with the same
  id/docNo; test data reverted (bucket, ledger, key, audit)
- backup_db.py run 3× live: snapshot 2.9MB + integrity ok + rotation
  verified with fabricated 3d/10d/40d files (10d kept as weekly keeper, 40d
  deleted) + restore-verify PASSED (Order=208, StockLedger=1181 rows)
- context_check: 1 expected drift (79 Prisma models — IdempotencyKey) →
  STATE.md updated in the same commit

**Next per spec §16**: Batch 2 (CHAT-01..12 — agent QoL & screen-awareness,
builds on the HFX-14..19 render surface).
