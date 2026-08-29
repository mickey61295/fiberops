# SPEC-M14 — Performance & Scale (SPEC-M9 §9 P2-2)

Status: **FROZEN + SHIPPED** 2026-08-30. Scope frozen by SPEC-M9 §9-M14; this
document records the implementation decisions.

## 1. createdAt indexes (the feed families)

`@@index([createdAt])` added to the 16 feed-family models — Order,
PurchaseOrder, GRN, SalesInvoice, Payment, Journal, CutOrder, ProductionEntry,
PcsDespatch, JobworkOrder, GateEntry, Sample, LabTest, Expense, Approval,
AgentTurn — plus StockLedger, which also gets `@@index([docDate])` (every
day-book sorts/filters by docDate; the closing-stock cumulative scan rides the
same index). 65→76 models unchanged; `prisma db push` + `generate` only.

## 2. Server-side pagination

VERIFIED ALREADY PRESENT: every RegisterScreen service takes `page`/`limit`
and does `take/skip` server-side (SPEC-M4 §6); the aggregate registers
(party-balance / supplier-pending / supplier-history / itemwise / closing)
fetch with take-guards (2000–5000) and slice in memory — the SQLite-scale
pragmatic choice, now measured. No archetype change needed; the M14
acceptance is pinned by a real perf test instead (§4).

## 3. Tracker SSE upgrade (the parked accelerator, ported)

The m9-wave-a-alt branch (parked on origin since the M9 revision to the
parity-style format) carried the drop-in SSE implementation. Ported as a NEW
surface — the user-clarified parity-style /tracker (M9, polling) stays
untouched; the SSE twin lives at **/live**:

- `src/lib/erp/live-snapshot.ts` — ONE collector: health (db latency, uptime,
  RSS), parity stats, 12-family today/7d counts, workload counters, merged
  12-event feed; reads only.
- `/api/live-tracker` GET (snapshot) + `/api/live-tracker/stream` GET
  (SSE — 3s tick, abort-clean, session-guarded; a mid-stream error keeps the
  stream alive, next tick retries).
- `/live` page (SSR first snapshot) + `live-stream-tracker.tsx` client
  (renamed from the branch's live-tracker to keep main's /tracker component):
  SSE-first with 5s-polling degradation, 60s SSE re-probe, hidden-tab pause.
- LIVE_ROUTES + '/live' (meta page, no menu group — the /parity precedent).

## 4. Perf acceptance (the gate)

`tests/perf/registers-perf.test.ts` — seeds 10,000 StockLedger rows and times
the REAL services: queryStockLedger page 1 + page 2 (server-side pagination
proof), queryClosingStock (take-guarded cumulative scan), getTrackerSnapshot
(17 families + counts) — every one asserted <300ms. Measured on this machine
after the indexes: all single-digit-to-tens of ms (probe:
scripts/perf_probe.ts, persisted).

## 5. N+1 audit (API routes)

- Registers: CLEAN — the id-map batch pattern (PITFALLS #21) is used
  everywhere; per-row loops are in-memory aggregation over pre-fetched arrays
  (verified bills.ts: 2 awaits total).
- /api/erp approvals enrichment: bounded polymorphic N+1 — one query per
  pending approval (≤100 by inbox design) across different models; cannot
  batch across models without a union view. ACCEPTED + documented here.
- Tracker + live snapshot: 17 parallel findManys with `include` (joins) —
  no per-row queries. CLEAN.

## 6. Gates

tsc src/ 0 · vitest 898 (885 + live-snapshot 9 + perf 4) · eval --static PASS ·
context_check pins (LIVEROUTES 162, perf test file, live files) NO DRIFT ·
route_smoke_m14.sh: /live 200 + SSE frames + stream guard + /api/live-tracker
snapshot shape · regressions m9 + m13.

## 7. Implementation record

- Ported 5 files from m9-wave-a-alt verbatim (live-snapshot.ts, both
  /api/live-tracker routes, live page, the client renamed
  LiveTracker→LiveStreamTracker in live-stream-tracker.tsx so main's
  parity-style /tracker component is untouched) + the 9-test live-snapshot
  suite passed AS-IS against the current schema (76 models).
- The dev server was restarted after prisma generate (PITFALLS: stale client).
- The SSE route is the SECOND long-lived stream in the app (/api/agent was
  first); the M12 send()/safeClose() disconnect-guard lesson applies — the
  ported stream already carries the abort-clean pattern.
