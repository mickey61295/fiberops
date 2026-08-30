# SPEC-M35 — Holidays Digest Adoption (the M28 OUT promise)

> Fourth six-task run, task 6 (FINAL). SPEC-M28 §OUT: "digest adoption"
> — the GovtHoliday planning reads (M28 surfaces, M31 arithmetic) now
> feed the daily digest. Frozen before code (2026-08-30).

## 1. Scope

**In:**
- `digest.ts` gains a **shutdowns section**: `getUpcomingHolidays({ days: 14 })`
  (the M28 read, reused verbatim) → `sections.shutdowns = { windowDays: 14,
  rows: {date, name, daysUntil}[] }`; the text block "Upcoming shutdowns"
  lists each holiday with days-until; **silent when empty** (the M28
  empty-card discipline — a quiet day adds no noise).
- The digest PAGE (`/notifications/digest`) renders the shutdowns
  section (amber, the MIS-card look; calendar deep-link) above the gate
  section, hidden when empty.
- **NEW agent tool `get_daily_digest`** (read, notifications domain):
  returns the digest text + a json summary (section counts + shutdown
  rows). This RESTORES the Phase-4.5 promise ("one chat prompt returns
  the owner-grade digest") — the tool never survived the rollback era;
  the digest existed only as service + page + cron route. Tools
  229 → 230.
- SYSTEM_PROMPT: the reports/ops line mentions get_daily_digest (one
  line, no restructuring).
- Tests: buildDigest shutdowns (in-window with days-until; out-of-window
  excluded; empty → empty section + NO text block); the text block
  ordering (shutdowns after gate); the tool registered + returns the
  text + json counts; page source pins.

**Out (deferred, documented):** per-order delivery-risk lines in the
digest (the Order Hub already warns; the digest stays a briefing) ·
weekday-vs-Sunday breakdown in the digest (M31 arithmetic is one prompt
away via get_working_days) · digest flag for the shutdown window length
(hardcoded 14 — a knob when a user asks) · WhatsApp/SMS channel (A4
lane).

## 2. Design

- Window = 14 days (a DAILY briefing wants the actionable near term;
  the MIS card keeps the 30-day view — different surfaces, different
  windows, both honest).
- The shutdowns section rides `getUpcomingHolidays` — ZERO new holiday
  queries; the M28 read is THE single source.
- The tool is a thin read over buildDigest (the page and the webhook
  carry the same rows — one shape everywhere).

## 3. Tests

1. buildDigest: holiday 5d out → one shutdown row with daysUntil 5 +
   the text line; holiday 30d out → excluded (window); no holidays →
   empty rows AND no text block.
2. Tool: registered (read, notifications), returns text containing the
   header + json with section counts.
3. Source pins: digest.ts section + text block; the page shutdowns
   section; SYSTEM_PROMPT mention.

## 4. Acceptance gates

tsc src/ 0 · vitest (1102+N) · eval --static PASS · context_check NO
DRIFT (+digest test pin; tools 229→230) · NEW route_smoke_m35 (page
renders the shutdowns card with a seeded holiday; the quiet page hides
it; zero residue) · LIVE browser-verified (screenshot
m35-digest-holidays.png).

## 5. Implementation record (filled at ship time)

- digest.ts as specced: DigestShutdownRow + DIGEST_SHUTDOWN_WINDOW_DAYS=14
  (exported) + the getUpcomingHolidays call joins the existing
  Promise.all (zero extra round-trips) + the shutdowns section + the
  text block with the TODAY/d-away distinction + the planning line.
- The digest page renders the amber shutdowns card (CalendarClock, days
  chips, TODAY variant, the /masters/govt-holiday deep-link) ABOVE the
  gate section — hidden when empty (M28 discipline, smoke-proven).
- get_daily_digest tool (229 → 230; read, reports domain; pins ×10
  files + context_check; SYSTEM_PROMPT reports line). The Phase-4.5
  promise RESTORED — the tool never survived the rollback era (the
  digest was service + page + cron route only).
- Tests: digest-holidays.test NEW 10 (in-window w/ days-until + text
  block; 30d excluded; quiet → no text block; block AFTER gate;
  TODAY case; tool registered + shape; source pins ×3) → **1112
  vitest** (1102+10).
- Gates: tsc src/ 0 · 1112 vitest · eval --static PASS 15/15 ·
  context_check 572→**574/574** NO DRIFT (+digest-holidays.test.ts
  +SPEC-M35.md pins; tools 230) · NEW route_smoke_m35 **12/12** · LIVE
  browser-verified (login → digest: the amber card with Deepavali +
  '6d away' chip + calendar link + the text block; FULL-PAGE screenshot
  m35-digest-holidays.png, VLM-confirmed all four sections).
- SSR lesson: React interpolates text with `<!-- -->` comment nodes —
  greps for interpolated captions must strip them first
  (`sed 's/<!-- -->//g'`), the M28 smoke's plain greps worked because
  their captions were static strings.
