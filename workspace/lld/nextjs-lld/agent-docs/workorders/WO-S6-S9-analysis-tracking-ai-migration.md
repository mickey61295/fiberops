# Work Orders — Stage 6 (Analysis) + Stage 7 (QR Tracking) + Stage 8 (AI Harness) + Stage 9 (Migration) + Cross-cutting (X)

Scope: TASKS.md items S6.1-S6.7, S7.1-S7.10, S8.1-S8.12, S9.1-S9.5, X1-X4 (38 work orders, one per TASKS.md ID).

Shell: Git Bash (Windows). Doc numbers: 00-OVERVIEW 01-ARCHITECTURE 02-COMPONENT-TREE 03-DOMAIN-POSTING-ENGINE 04-API-SERVICES 05-EVENTS-SYNC-NOTIFICATIONS 06-SCREEN-MAP 07-REPORTS-FLAGS 08-QR-TRACKING 09-AI-HARNESS 10-REVIEW-REPORT 11-PROC-VERIFICATION (all in nextjs-lld/).

Conventions (apply to every WO in this file):
- All file paths are relative to the app repo root (`joms-web/`, created beside the docs folder). Test runner: `npm test -- tests/<file>`.
- Gates G1-G5 (inlined definitions; workers never read a plan doc): G1 mid-failure atomicity, G2 legacy parity, G3 exact reversal restore, G4 docs sync, G5 rights/flags. Stage additions (07/08/09 modules) are flag-defaulted OFF until their stage gate passes (G5).
- S7 value columns are contractual: qty x cumulative rate from the WO-S5.6 engine (`StockRatePost.cumbillrate` / `PcsStockRatePost` parity).
- S8 rule: AI never bypasses the engine - drafts -> review -> same services, same rights (09 sec. 1); every AI skill ships behind a default-OFF flag and an eval gate (09 sec. 7).

## WO-S6.1 — Budget-vs-actual service + UI (L, S6)
- **Objective:** Implement the SP_Bud_and_Actual parity pipeline (all legs, tax toggle, grpref consolidation) as a service + jobId screen.
- **Refs:** 03 sec. 9 (budget/actual leg list); 04 sec. 10 (`POST /api/costing/bud-vs-act` -> jobId); 02 sec. 14 (budget-vs-actual page + flags budandactseprtaxreqd, bud_app, budactfieldsflag); 11 sec. 6.3 (re-extract before coding).
- **Owning docs:** 03, 04, 02
- **Preconditions:** WO-S5.6 (DC-valued legs consume cumulative rate), Stage 5 exit; live-DB re-extract of `SP_Bud_and_Actual` (+_1/_2) diffed vs 03 sec. 9.
- **Implementation steps:**
  1. Write `src/services/costing/BudVsActService.ts`: budget legs (Pro_ReqYarn x rate, Pro_ReqKnitt x rate, PRO_AccReq x BudRate) vs actual legs (PO, GRN, DC-valued, debits, Trs_BillRate.NetAmount, piece-rate production x Pro_Prod_PartwiseRate or Bud_InhRateclw size-wise, ShippingBill).
  2. Encode `@Reqd_TaxInPL` toggle as flag `budandactseprtaxreqd` (tax in P&L on/off) and `GrpRef` consolidation mode.
  3. Stage output to ReportJobRows by jobId (no Temp_* per 05 sec. 7); wire `app/api/costing/bud-vs-act/route.ts` + `app/api/reports/jobs/[jobId]/route.ts` consumption.
  4. Stylewise variant (SP_Bud_and_Actual_1/_2 parity) as a param of the same service.
  5. UI `app/costing/budget-vs-actual/page.tsx` with deviation columns and budget-approval links (`bud_app`).
  6. Tests `tests/budvsact.test.ts` with a golden order fixture covering every leg at least once.
- **Acceptance criteria:**
  - AC1: Given a golden order with all legs seeded, When the pipeline runs, Then each leg amount matches the fixture within 0.01 and the variance column equals actual minus budget per leg.
  - AC2: Given `budandactseprtaxreqd` toggled on then off, When both runs complete, Then the two totals differ by exactly the tax amounts of the seeded bills (toggle proof).
  - AC3: Given GrpRef consolidation for 3 orders in one group, When run, Then consolidated output equals the sum of the 3 individual runs.
  - AC4: Given the run, When complete, Then results are retrievable by jobId with paging + totals and no Temp_ table was created (grep test on job runner).
- **Test commands:** `npm test -- tests/budvsact.test.ts`; `npm run lint`; `npm run build`
- **Out of scope:** daily P&L (WO-S6.2), quick costing (WO-S6.3), buyer P&L (WO-S6.5), approval workflow mechanics (Stage 2 infra).
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] G2 parity vs SP_Bud_and_Actual on shared golden data; diff notes recorded
  - [ ] G5: page rights-gated (`costing.budvsact`)
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S6.1 ticked

## WO-S6.2 — Daily unit P&L (M, S6)
- **Objective:** Implement Sp_DailyUnitPANDL parity with overhead pro-rata and fixed/daily/style expenses.
- **Refs:** 03 sec. 9 (daily P&L math); 04 sec. 10 (`POST /api/costing/daily-pl?date`); 02 sec. 14 (daily-pl page); 05 sec. 1 (`wages.booked` -> daily P&L projector).
- **Owning docs:** 03, 04, 02
- **Preconditions:** WO-S6.1 (budget-rate legs), WO-S4.9 (wage events), WO-S5.5 (wage cost transfer).
- **Implementation steps:**
  1. Write `src/services/costing/DailyPlService.ts`: shift/contractor/jobwork qty valued at budget rates; actual wages + bills; overhead = budget x ProdOverheads% + daily + fixed expenses; pro-rata allocation by wages; style expenses pro-rata by pcs (03 sec. 9 math verbatim).
  2. Add the DailyUnitP&L projector to `src/projectors/worker.ts` consuming `wages.booked` + `prodentry.posted` (05 sec. 2 list).
  3. Route `app/api/costing/daily-pl/route.ts`; UI `app/costing/daily-pl/page.tsx` (per unit/day/order/stage drill).
  4. Register jobs staged by date-key jobId.
  5. Tests `tests/dailypl.test.ts`: overhead pro-rata, wage-share allocation, style-expense split.
- **Acceptance criteria:**
  - AC1: Given two lines with wages 6000 and 2000 and shared overhead 8000, When the day computes, Then overhead allocates 6000/2000 by wage share (exact row assertions).
  - AC2: Given a fixed expense snapshot of 31000 for a 31-day month and a mid-month day run, Then only that date's pro-rata portion lands on the DailyUnit_P_and_L row — expected row amount = 31000 / 31 = 1000 (formula: monthly fixed expense / days in month; assert the exact row amount).
  - AC3: Given style expenses 5000 across 1000 pcs (600 order A, 400 order B), When computed, Then A carries 3000 and B 2000.
  - AC4: Given the projector receives a back-dated wage event, When it rebuilds, Then the affected day equals the fresh full recompute (SUM-recompute proof).
- **Test commands:** `npm test -- tests/dailypl.test.ts`; `npm run lint`; `npm run build`
- **Out of scope:** quick-costing cube (WO-S6.3), buyer P&L (WO-S6.5), expenses CRUD (WO-S6.6 - consumes its tables).
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] G2 parity vs Sp_DailyUnitPANDL on one shared-DB day
  - [ ] G5: rights-gated (`costing.dailypl`)
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S6.2 ticked

## WO-S6.3 — Quick-costing cube + input screens (M, S6)
- **Objective:** Implement the 4-expense-level costing input and the ST_Cost_* cube with sync flags.
- **Refs:** 03 sec. 9 (Vue_DailyCostingInputData, 4 expense levels, ST_Cost_*); 04 sec. 10 (`POST /api/costing/input`, `GET /api/costing/quick?ordId`); 02 sec. 14 (input + quick pages, Trg_ST_DailyCostingInputData parity).
- **Owning docs:** 03, 04, 02
- **Preconditions:** WO-S6.2 (shared expense plumbing), S0.3 migration tooling (ST_Cost_* tables exist), S2.5 report jobs.
- **Implementation steps:**
  1. Write `src/services/costing/QuickCostingService.ts`: input writer for Trs_DailyPrdn_Costing1..5 (4 expense levels) with Trg_ST_DailyCostingInputData projector parity.
  2. Maintain ST_Cost_Factory / ST_Cost_Dept / ST_Cost_OrderDtl cube rows with UpdateFlg=1 on every write (Commando sync).
  3. Routes `app/api/costing/input/route.ts`, `app/api/costing/quick/route.ts`.
  4. UI `app/costing/input/page.tsx` (FrmCostingInput parity) and `app/costing/quick/page.tsx` (mobile quick-costing parity).
  5. Tests `tests/quickcosting.test.ts`.
- **Acceptance criteria:**
  - AC1: Given input rows at all 4 expense levels, When saved in one tx, Then Trs_DailyPrdn_Costing1..5 rows commit and a mid-failure leaves all five empty (G1).
  - AC2: Given the input above, When the cube rebuilds, Then ST_Cost_Factory/Dept/OrderDtl rows aggregate the same amounts and every touched row has UpdateFlg=1.
  - AC3: Given `GET /api/costing/quick?ordId=X`, Then the response returns the cube slice for X matching the mobile parity fixture.
- **Test commands:** `npm test -- tests/quickcosting.test.ts`; `npm run lint`; `npm run build`
- **Out of scope:** daily P&L presentation (WO-S6.2), expenses masters (WO-S6.6), meeting packs (WO-S6.5).
- **DoD checklist:**
  - [ ] AC1-AC3 verified
  - [ ] G1 rollback proof; G2 cube vs ST_Cost_ fixture
  - [ ] G5: rights-gated (`costing.input`, `costing.quick`)
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S6.3 ticked

## WO-S6.4 — WBS/T&A boards (RAG, finish %, plan-date) (M, S6)
- **Objective:** Implement WBS production actuals, RAG recompute, finish-percent math, plan-date calculation with holidays, and the three boards.
- **Refs:** 02 sec. 4 (planning tree incl. WBS pages); 04 sec. 3 (`POST/GET /api/planning/wbs`, `GET /api/planning/plan-date`); 03 sec. 5 (WbsProjector row: Sp_WBS_Production(_DateWise/_Supp), Finish_Percent(_4Exs)); 05 sec. 1 (`wbs.actualChanged`).
- **Owning docs:** 03, 04, 02
- **Preconditions:** WO-S4.8 (ST_Production_Data feeds actuals), holiday calendar master readable.
- **Implementation steps:**
  1. Extend `src/services/planning/WbsService.ts` (upsert/get) and write `src/projectors/WbsProjector.ts`: WBS_* rows, Finish_Percent and Finish_Percent_4Exs from production actuals vs plan.
  2. RAG recompute on `wbs.actualChanged` + `prodentry.posted`; meeting-pack refresh hook.
  3. Plan-date calc in `src/services/planning/workingDay.ts` (WF_PlanFinishDateArrival parity) honoring holiday master + direction.
  4. Boards: datewise + supplier views (`Sp_WBS_Production_DateWise/_Supp` parity) staged by jobId.
  5. UI pages `app/planning/wbs/board/page.tsx`, `app/planning/wbs/datewise/page.tsx`, `app/planning/wbs/supplier/page.tsx` per 02 sec. 4.
  6. Tests `tests/wbs.test.ts` (RAG transitions, finish %, plan-date with holidays).
- **Acceptance criteria:**
  - AC1: Given a stage, When the projector runs, Then the board row is Green iff `Finish_Percent_4Exs` >= the stage's threshold column AND `ActualFinish <= PlanFinish`; a 95%-of-plan stage with 2 days left turns Green, and a 60% stage with 0 days left (`ActualFinish > PlanFinish`) turns Red (both transitions asserted on the board row).
  - AC2: Given plan-date from 2026-08-14 (Friday) + 3 working days with 2026-08-17 a holiday, When computed forward, Then the result skips the holiday (exact date assertion).
  - AC3: Given back-dated production, When Finish_Percent recomputes, Then the value equals plan-vs-actual over ALL rows (SUM-recompute, not incremental).
  - AC4: Given a WBS change, When committed, Then `wbs.actualChanged` is emitted exactly once and mobile order detail refreshes via SSE.
- **Test commands:** `npm test -- tests/wbs.test.ts`; `npm run lint`; `npm run build`
- **Out of scope:** MIS dashboards (WO-S6.5), meeting datasets (WO-S6.5), shortage booking (Stage 3 scope).
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] G2 parity vs Sp_WBS_Production fixtures
  - [ ] G5: rights-gated (`planning.wbs`)
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S6.4 ticked

## WO-S6.5 — MIS dashboards + meeting packs + buyer P&L + status pipeline (M, S6)
- **Objective:** Deliver MIS dashboards, Meet* meeting packs, buyer P&L report, and order status pipeline views.
- **Refs:** 02 sec. 2 (dashboard & MIS tree), sec. 14 (buyer-pl page); 04 sec. 3 (`GET /api/planning/meeting?ordId`), sec. 2 (`GET /api/orders/:io/status`); 03 sec. 5 (MeetingCaches); 05 sec. 1 (meeting pack refresh triggers).
- **Owning docs:** 02, 04, 03
- **Preconditions:** WO-S6.1-S6.4 (data sources), S2.5 report jobs, X2 registry for Meet*/buyer-PL reports.
- **Implementation steps:**
  1. Write `src/services/mis/MeetingService.ts` (`pack(ordId)`: Meet_Accessories / MeetAccDetails / Charts datasets from MeetingCaches projector).
  2. Write `src/services/mis/MisDashboardService.ts` aggregating: order status pipeline (SP_OrderStatus pipeline kgs parity), WBS reds, loss exceptions, reconciliation feed stub (08 exceptions wired in WO-S7.4).
  3. Buyer P&L report job: add the `buyer-pl` entry to `src/services/reports/registry.ts` (frmBuyerPLReport parity) and stage rows by jobId through the existing report-job runner (WO-S2.5 reuse).
  4. UI: `app/dashboard/page.tsx` widgets per 02 sec. 2, meeting pack page `app/planning/meeting/[io]/page.tsx`, `app/costing/buyer-pl/page.tsx`.
  5. SSE refresh wiring: dashboards subscribe to `wbs.actualChanged`, `trace.mismatch` (once S7 lands), approval events.
  6. Tests `tests/mis.pack.test.ts`.
- **Acceptance criteria:**
  - AC1: Given a golden order, When the meeting pack runs, Then all Meet* datasets match the golden fixture row counts and totals (G2).
  - AC2: Given an order with despatch legs, When the status pipeline runs, Then stage kgs match SP_OrderStatus parity fixture.
  - AC3: Given a WBS stage turns Red, When the event flows, Then the dashboard widget updates without manual refresh (SSE assertion in test).
  - AC4: Given buyer P&L for buyer B across 4 orders, When run, Then per-order and consolidated profit columns reconcile with the WO-S6.1 leg math.
- **Test commands:** `npm test -- tests/mis.pack.test.ts`; `npm run lint`; `npm run build`
- **Out of scope:** AI narrator on these packs (WO-S8.9), tracking river (WO-S7.5), parallel-run pack (WO-S6.7).
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] G2 fixtures for meeting pack + status pipeline
  - [ ] G5: dashboards rights-gated per widget group
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S6.5 ticked

## WO-S6.6 — Expenses family + registers (S, S6)
- **Objective:** Implement expenses entry, masters, fixed-expense snapshots, and registers.
- **Refs:** 02 sec. 14 (expenses tree: page, fixed, register; FrmExpenses/FrmMasExpenses/FrmExpenseGroup, Trs_FixedExpensesDateWise snapshots); 04 sec. 10 (costing endpoints); 03 sec. 9 (expense feeds).
- **Owning docs:** 02, 04, 03
- **Preconditions:** WO-S6.2/S6.3 consumers staged; Stage 5 exit.
- **Implementation steps:**
  1. Write `src/services/expenses/ExpenseService.ts`: masters (expense + group CRUD), daily entry, fixed-expense datewise snapshots (Trs_FixedExpensesDateWise parity).
  2. Register (FrmExpenseEntryRegister parity) as a report job.
  3. Routes `app/api/costing/expenses/route.ts` (+ masters subroutes); UI `app/costing/expenses/page.tsx`, `app/costing/expenses/fixed/page.tsx`, `app/costing/expenses/register/page.tsx`.
  4. Tests `tests/expenses.test.ts`.
- **Acceptance criteria:**
  - AC1: Given a fixed expense entered for a month, When a snapshot row saves, Then a mid-failure leaves no partial snapshot (G1) and the register shows it under the correct month.
  - AC2: Given expense groups A and B with 3 child expenses, When the register runs, Then group totals equal child sums.
  - AC3: Given daily expenses on date D, When daily P&L (WO-S6.2) runs for D, Then the expense total appears as the day's daily-expense component (cross-WO consistency).
- **Test commands:** `npm test -- tests/expenses.test.ts`; `npm run lint`; `npm run build`
- **Out of scope:** overhead percent math (WO-S6.2), style expenses pro-rata (WO-S6.2).
- **DoD checklist:**
  - [ ] AC1-AC3 verified
  - [ ] G1 rollback proof; G5 rights-gated (`costing.expenses`)
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S6.6 ticked

## WO-S6.7 — Parallel-run comparison pack (M, S6)
- **Objective:** Build the tooling that compares legacy vs new outputs on a shared DB month and produces the S6 exit report.
- **Refs:** 03 sec. 9 (all pipelines); 11 sec. 5 (parity policy). Inlined S6 exit rule: reconcile with legacy outputs on the same DB.
- **Owning docs:** 03, 11
- **Preconditions:** WO-S6.1-S6.6 complete; read access to the legacy DB for the chosen month.
- **Implementation steps:**
  1. Write `scripts/parallel-run/compare.ts`: for a (coy, finyear, month) window, run legacy procs (SP_Bud_and_Actual, Sp_DailyUnitPANDL, SP_ST_Production_Data sums) and the new services on the same data.
  2. Diff engine with tolerance bands per metric (qty exact; money within 0.01; percent within 0.05) writing `design/parallel-run/s6-report.md` + JSON artifact `scripts/parallel-run/s6-report.json`.
  3. Add npm script `"parallel-run:s6"` in package.json.
  4. Cover at minimum: budget-vs-actual legs, daily P&L totals, production-data sums per stage, expense registers.
  5. Document any legacy-defect-driven expected diffs (reference 11 sec. 3) in the report header.
- **Acceptance criteria:**
  - AC1: Given the shared month, When the pack runs, Then every covered metric produces a row with legacy value, new value, delta, and pass/fail.
  - AC2: Given a deliberately injected 1.0 difference in one metric, When compared, Then exactly that metric fails and the report exit code is non-zero.
  - AC3: Given metrics affected by corrected defects (11 sec. 3 list), When compared, Then the report annotates them as expected-diff rather than failure.
  - AC4: Given a clean run, Then `npm run parallel-run:s6` exits 0 and the report file is written (S6 exit evidence — inlined rule: reconcile with legacy outputs on the same DB).
- **Test commands:** `npm run parallel-run:s6`; `npm test -- tests/parallelrun.test.ts`; `npm run lint`
- **Out of scope:** Stage-9 month-long parallel run ops (WO-S9.2), cutover planning (WO-S9.5).
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] S6 exit evidence committed under `design/parallel-run/`
  - [ ] `npm run lint` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S6.7 ticked

## WO-S7.1 — Track* tables + migrations + sync flags (M, S7)
- **Objective:** Create the additive TrackUnit/TrackEdge/TrackEvent/TrackLabelLog/TrackPolicy tables with finyear partitioning hooks and Commando sync flags.
- **Refs:** 08 sec. 2 (model + table list + legacy anchor map), sec. 9 (partitioning, indexes); 05 sec. 2-sec. 3 (UpdateFlg/server_id sync); S0.3 migration tooling.
- **Owning docs:** 08, 05
- **Preconditions:** Stage 6 exit (tracking rides finance-complete engine); S0.3 migration tooling for new-tables-only; S7 phase plan (inlined): P1 labels + read-only river, P2 backfill (WO-S7.9), P3 native events + reconciliation + value columns.
- **Implementation steps:**
  1. Write migration `src/db/migrations/0001_track_tables.sql`: TrackUnit, TrackEdge, TrackEvent, TrackLabelLog, TrackPolicy per 08 sec. 2 types (all columns incl. owner kind/refId, legacyRef, qty fields, status).
  2. Indexes per 08 sec. 9: TrackEdge(parentId), TrackEdge(childId), TrackUnit(ordId), TrackEvent partition scheme by finyear+month (partition helper in `src/db/trackPartition.ts`).
  3. Add UpdateFlg + server_id columns to all five tables; register them in the sync pull/ack allowlist in `src/services/sync/SyncService.ts`.
  4. Typed row mappers in `src/domain/tracking.ts` mirroring 08 sec. 2 type definitions.
  5. Cache column parent remaining qty on TrackUnit (08 sec. 9) for quantity-law checks.
  6. Tests `tests/track.tables.test.ts` (migration up/down, sync-flag roundtrip).
- **Acceptance criteria:**
  - AC1: Given a fresh database, When migrations run, Then all five tables exist with the 08 sec. 2 columns and the six required indexes (query information_schema assertions).
  - AC2: Given a TrackEvent insert, When the sync pull runs, Then the row is returned with UpdateFlg=1 and after ack UpdateFlg=0 (Commando parity roundtrip).
  - AC3: Given TrackEvent rows across 2 finyear-months, Then rows land in separate partitions and a pruning helper drops only the targeted partition (08 sec. 9).
  - AC4: Given the migration set, When run twice, Then it is idempotent (no duplicate DDL errors).
- **Test commands:** `npm test -- tests/track.tables.test.ts`; `npm run build`
- **Out of scope:** code service (WO-S7.2), posting hooks (WO-S7.3), projector (WO-S7.4), any legacy-table ALTER (forbidden).
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] G5: table access gated behind tracking services only (no direct UI SQL)
  - [ ] G4: 08 sec. 2 updated if columns changed
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S7.1 ticked

## WO-S7.2 — Code service: signed codes, label log/void, QrLabelSvg (M, S7)
- **Objective:** Implement the dual-format QR code service (internal compact + GS1 Digital Link external) with HMAC signing, label log/void, and the label SVG renderer at the four sizes.
- **Refs:** 08 sec. 3 (both formats, HMAC truncation, sizes, offline whitelist); 04 sec. 12 (`POST /api/tracking/labels/print|void`); 02 sec. 23.
- **Owning docs:** 08, 04, 02
- **Preconditions:** WO-S7.1 (TrackLabelLog exists); HMAC key management from S0.1 env/secrets.
- **Implementation steps:**
  1. Write `src/services/tracking/CodeService.ts`: encodeExternal(itemRef, lot, serial) -> `https://<host>/t/01/<itemRef>/10/<lot>/21/<serial>?s=<sig8>` and encodeInternal(type, ids) -> `J1<B2><B32><CRC4><sig4>` per 08 sec. 3, HMAC-SHA256 truncated to 8/4 chars with key-version id embedded.
  2. Verify + decode both formats with signature check; expose key-version for offline station whitelists.
  3. Write `src/services/tracking/LabelService.ts`: print() writes TrackLabelLog (user, reason, unit) and returns render payload; void() marks a print superseded (only one live label per unit).
  4. Build `src/components/tracking/QrLabelSvg.tsx`: ECC M, version auto <= 10 for piece labels, human-readable serial under code; sizes roll 50x25mm, bundle 40x25mm, piece 18x18mm, carton 100x50mm with order/buyer/box text block.
  5. Routes: `app/api/tracking/labels/print/route.ts`, `app/api/tracking/labels/void/route.ts`; decode helper for tests exported from `src/services/tracking/CodeService.ts`.
  6. Tests `tests/track.codes.test.ts` (format strings, signature reject, void semantics, SVG size matrix).
- **Acceptance criteria:**
  - AC1: Given a bundle unit (ordId 77, lot L5, stage 3, part 2, serial 0042), When encoded internally, Then the string starts `J1`, is <= 40 chars, and decodes back to the same ids with a valid CRC + signature.
  - AC2: Given an external code with a tampered signature char, When verified, Then decode fails with an anti-forgery error and no TrackEvent is created.
  - AC3: Given a reprint of unit U with reason R by user W, When printed, Then TrackLabelLog has both print rows; when the earlier print is voided, Then exactly one row remains live for U.
  - AC4: Given the four label types, When rendered, Then SVG page sizes are exactly 50x25, 40x25, 18x18, 100x50 mm and the piece label QR version <= 10.
- **Test commands:** `npm test -- tests/track.codes.test.ts`; `npm run lint`; `npm run build`
- **Out of scope:** print-station hardware drivers (browser print only), PostingEngine hooks (WO-S7.3), backfill (WO-S7.9).
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] G5: print/void rights-gated (`tracking.labels.print`, `tracking.labels.void`)
  - [ ] G4: 08 sec. 3 confirmed accurate
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S7.2 ticked

## WO-S7.3 — PostingEngine tracking hooks (units, owner, quantity law) (L, S7)
- **Objective:** Wire TrackUnit upserts, TrackEvent emission, TrackEdge writes, and the quantity-law check into PostingEngine.apply() as a by-product of postings.
- **Refs:** 08 sec. 4 (genealogy + quantity law + tolerance link), sec. 5 (hook table per flow); 03 sec. 10 (trackIds extension, unit creation points, reversal inversion); 05 sec. 1 (trace.* events).
- **Owning docs:** 08, 03, 05
- **Preconditions:** WO-S7.1, WO-S7.2; S2.1 PostingEngine; 03 sec. 6 tolerance catalog available; flag gate `qr_track_enabled` default OFF (G5 addition).
- **Implementation steps:**
  1. Extend `Movement` in `src/posting/engine.ts` with optional `trackIds` and implement the 03 sec. 10 apply() steps: upsert TrackUnit owner/status (owner = movement counterparty), insert TrackEvent, quantity-law check, unit creation at GRN rolls (FAB_ROLL), cutting (CUT_LAY/BUNDLE/PIECE per TrackPolicy), packing (CARTON), despatch (DESPATCH_DOC edges).
  2. Implement `src/posting/trackHooks.ts` mapping each 03 sec. 4 matrix doc to its 08 sec. 5 added behavior (GRN 'Process' roll detail -> FAB_ROLL + edges from DC'd grey rolls via Trs_Del2 lineage/FrmStockID; DC TrType 1 -> owner->PARTY; cutting -> CUT_LAY + BUNDLE; piece GRN -> owner->company; packing/despatch -> CARTON + edges).
  3. Quantity law per 08 sec. 4: for every parent sum(child shareQty) <= parent qty within 03 sec. 6 tolerances (dyeinggamtper, knittinggamtper, cutting_dcjoborder_deviation); violation blocks the posting with a legacy-style message.
  4. Reversal: invert events and edges in the same compensating transaction (03 sec. 10).
  5. Emit trace.* events (trace.unit.created/voided, trace.owner_changed, trace.consumed, trace.rejected/rework, trace.shipped) via outbox.
  6. Everything behind flag `qr_track_enabled` (default OFF) so Stage-3/4 flows are unchanged until enabled.
  7. Tests `tests/track.hooks.test.ts`: creation points, owner changes, law pass/block, reversal inversion.
- **Acceptance criteria:**
  - AC1: Given a process GRN with 3 roll detail rows and tracking ON, When saved, Then 3 FAB_ROLL TrackUnits are created with owner=GODOWN of the GRN godown, 3 TrackEvents (trace.unit.created), and edges from the DC'd grey rolls (count assertions).
  - AC2: Given a parent FAB_ROLL of 120 kg with existing child edges of 110 kg and tolerance 5%, When a new split edge of 20 kg is posted, Then the posting is BLOCKED with a legacy-style deviation message and no edge row is written (120 - 110 = 10 < 20).
  - AC3: Given tracking OFF, When the same GRN saves, Then zero TrackUnit/TrackEvent/TrackEdge rows are created and ledger output is byte-identical to pre-S7 (flag-default proof).
  - AC4: Given a tracked GRN is reversed, When the compensating posting commits, Then its TrackEvents/TrackEdges are inverted (net zero live edges) and unit status returns to prior value.
  - AC5: Given a quantity-law violation inside a bigger document tx, When blocked, Then the whole document transaction rolls back (atomic with the posting, G1).
- **Test commands:** `npm test -- tests/track.hooks.test.ts`; `npm run lint`; `npm run build`
- **Out of scope:** TraceProjector rollups (WO-S7.4), river UI (WO-S7.5), backfill (WO-S7.9), gate scan-out (WO-S7.10).
- **DoD checklist:**
  - [ ] AC1-AC5 verified
  - [ ] G1 law-block rollback proof; G3 reversal inversion proof
  - [ ] G5: `qr_track_enabled` default OFF documented in flags registry
  - [ ] G4: 03 sec. 10 / 08 sec. 5 confirmed; update on refinement
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S7.3 ticked

## WO-S7.4 — TraceProjector + reconciliation exceptions + party-dwell aging (M, S7)
- **Objective:** Implement the per-order/stage trace rollup projector with ledger reconciliation and party-dwell aging exceptions.
- **Refs:** 08 sec. 1.5 (reconciliation loop), sec. 6 (exceptions page); 03 sec. 10 (TraceProjector paragraph: anchors stay authoritative); 05 sec. 2 (TraceProjector + trace.mismatch), sec. 5 (new notifications).
- **Owning docs:** 08, 03, 05
- **Preconditions:** WO-S7.3 (events flowing); S2.2 projector infra; non-return-DC aging data (Stage 3).
- **Implementation steps:**
  1. Write `src/projectors/TraceProjector.ts`: rebuild per-order/stage trace aggregates from TrackEvent/TrackEdge; set UpdateFlg=1 (sync).
  2. Reconcile vs CurrentStock, Pcs_/Panel_StockTable, ST_Production_Data, Vue_Reqd_vs_Finish; deltas emit `trace.mismatch` outbox events.
  3. Party-dwell aging: join TrackUnit owner=PATY with non-return-DC aging; notify beyond `gendcdays` default 5 (05 sec. 5).
  4. Exceptions endpoint `app/api/tracking/exceptions/route.ts` + page `app/tracking/exceptions/page.tsx` (mismatches, missing scans, aging, voided-label attempts).
  5. Wire daily meeting pack inclusion (WO-S6.5 consumer).
  6. Tests `tests/trace.projector.test.ts`.
- **Acceptance criteria:**
  - AC1: Given trace sums 5 kg below Pcs_StockTable for a stage, When the projector reconciles, Then one `trace.mismatch` event is emitted with the delta and the exception appears in `/api/tracking/exceptions`.
  - AC2: Given a unit sitting at party P for 6 days with `gendcdays`=5, When aging runs, Then a party-dwell exception + notification fire on day 6 exactly.
  - AC3: Given a voided label scan attempt, When processed, Then the attempt logs as an exception row with user and station context.
  - AC4: Given all ledgers agree, When the projector runs, Then zero mismatch events are emitted (no false positives on golden set).
- **Test commands:** `npm test -- tests/trace.projector.test.ts`; `npm run lint`; `npm run build`
- **Out of scope:** river UI (WO-S7.5), backfill (WO-S7.9), payroll anchors (Pay_* remain authoritative per 03 sec. 10).
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] G2 reconciliation green on golden order set
  - [ ] G5: exceptions page rights-gated (`tracking.exceptions`)
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S7.4 ticked

## WO-S7.5 — Order river with VALUE columns + genealogy + item passport (M, S7)
- **Objective:** Deliver the order river funnel with quantity AND value columns (qty x cumulative rate), the genealogy DAG view, and the item passport.
- **Refs:** 08 sec. 6 (river incl. the 2026-08-15 value-columns addition; genealogy; passport); 04 sec. 12 (river/genealogy/unit endpoints); 03 sec. 4.5 (rate source); WO-S5.6 service.
- **Owning docs:** 08, 04, 03
- **Preconditions:** WO-S7.4 (trace aggregates), WO-S5.6 (CumulativeRateService), Vue_Reqd_Vs_Finish readable.
- **Implementation steps:**
  1. Write `src/services/tracking/TraceService.ts` methods: river(io) - funnel Req->Knit->Dye->Cut->Stitch->Pack->Despatch with qty from Vue_Reqd_Vs_Finish/ST_Production_Data AND value columns = qty x cumulative rate (StockRatePost.cumbillrate for kg stages, PcsStockRatePost parity for piece stages) per stage.
  2. RAG per stage on the funnel; reconciliation chip from WO-S7.4 data.
  3. genealogy(io, focus) - depth-limited (max ~9), paged DAG from TrackEdge; click-through node timeline + owner + doc refs.
  4. passport(trackId) - identity, full event timeline, ancestors/descendants, QC results, wage postings (bundle legacyRef join).
  5. Routes: `app/api/tracking/[io]/river/route.ts`, `app/api/tracking/[io]/genealogy/route.ts`, `app/api/tracking/unit/[trackId]/route.ts` (+ timeline).
  6. UI: `app/tracking/[io]/page.tsx`, `app/tracking/[io]/genealogy/page.tsx`, `app/tracking/unit/[trackId]/page.tsx`.
  7. Tests `tests/track.river.test.ts` incl. value math cross-check vs WO-S5.6.
- **Acceptance criteria:**
  - AC1: Given a golden order with knit 1000 kg at cumbillrate 210 and dye-in 980 kg at 245, When the river renders, Then stage value columns show 210000 and 240100 and the qty columns show 1000/980 (both column families asserted).
  - AC2: Given river value at the last stage, When compared to the party value-outstanding for the same stage from WO-S5.7, Then the two amounts agree within 0.01 (cross-module finance consistency).
  - AC3: Given a piece with depth-6 ancestry (roll->lay->bundle->piece->carton->despatch), When genealogy runs, Then the DAG returns all 6 levels, paged, with a cycle check.
  - AC4: Given a bundle trackId, When the passport opens, Then wage postings from the Pay_ legacyRef anchor appear in its timeline (anchor join proof).
  - AC5: Given an order with no tracking data (pre-backfill), When the river runs, Then qty columns still render from legacy views with value columns populated and a "phase 1 read-only" chip (graceful degradation).
- **Test commands:** `npm test -- tests/track.river.test.ts`; `npm run lint`; `npm run build`
- **Out of scope:** scan console (WO-S7.6), policy editor (WO-S7.7), buyer/audit PDF export (Stage 9 polish).
- **DoD checklist:**
  - [ ] AC1-AC5 verified
  - [ ] G2 value columns reconciled vs cumulative-rate engine
  - [ ] G5: river + passport rights-gated (`tracking.river`, `tracking.passport`)
  - [ ] G4: 08 sec. 6 confirmed
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S7.5 ticked

## WO-S7.6 — Scan-anything console + /m/track (S, S7)
- **Objective:** Implement the universal scan console that identifies any 1D/QR code and shows or advances the unit.
- **Refs:** 08 sec. 6 (scan + /m/track), sec. 3 (scanner parity: 1D Pay_BarcodeGeneration codes funnel into the same endpoints); 04 sec. 12 (`POST /api/tracking/resolve`, `POST /api/tracking/scan`).
- **Owning docs:** 08, 04
- **Preconditions:** WO-S7.2 (decode), WO-S7.5 (passport view), WO-S4.7 (scan console components reusable).
- **Implementation steps:**
  1. Implement resolve in `src/services/tracking/TraceService.ts`: accept internal QR, external GS1-DL, or legacy 1D; offline HMAC check via key version; return unit + context.
  2. Implement scan(): generic TrackEvent write with stationCtx; route into scan.* stage-bound flows when applicable.
  3. Routes `app/api/tracking/resolve/route.ts`, `app/api/tracking/scan/route.ts`.
  4. UI `app/tracking/scan/page.tsx` + `app/m/track/page.tsx` reusing ScanConsole input components; result renders passport summary inline.
  5. Tests `tests/track.scan.test.ts`.
- **Acceptance criteria:**
  - AC1: Given a legacy 1D bundle barcode, When resolved, Then the response identifies the BUNDLE unit via the Pay_ anchor (migration parity) with owner and stage context.
  - AC2: Given an internal QR with a stale key version while offline, When resolved with offlineSig, Then validation uses the cached whitelist and queues full resolution on reconnect.
  - AC3: Given a scan at a station context, When posted, Then exactly one TrackEvent with mode/stationId/userId is written and the river live-refresh receives the event (SSE).
  - AC4: Given an unknown code, When resolved, Then a legacy-style invalid-code message returns and no unit/event is created.
- **Test commands:** `npm test -- tests/track.scan.test.ts`; `npm run lint`; `npm run build`
- **Out of scope:** production scan validations (WO-S4.6 owns those), fuzzy torn-label mode (WO-S8.x scan-help skill in file terms: S8.8/S8.9).
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] G5: rights-gated (`tracking.scan`)
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S7.6 ticked

## WO-S7.7 — Policy editor (per order/part/stage, bundle overrides) (S, S7)
- **Objective:** Implement TrackPolicy defaults (from flags), per-order/part/stage editing, and supervisor bundle-level overrides.
- **Refs:** 08 sec. 7 (TrackPolicy shape + override right); 04 sec. 12 (`GET/POST /api/tracking/policy`); 07 flags for defaults.
- **Owning docs:** 08, 04, 07
- **Preconditions:** WO-S7.1 (TrackPolicy table), WO-S7.3 (policy consumed at creation points).
- **Implementation steps:**
  1. Write `src/services/tracking/PolicyService.ts`: defaults from flags (yarnBag off, fabRoll 'auto' when roll module on, bundle true, piece 'BY_PART_STAGE', carton true); effective-policy resolution order: bundle override > part/stage > order > flag default.
  2. Route `app/api/tracking/policy/route.ts` (GET effective + POST edit).
  3. UI `app/tracking/policy/page.tsx`: matrix editor (order x part x stage) + bundle override dialog gated on right `tracking.policy.override`.
  4. Tests `tests/track.policy.test.ts` (resolution order, override precedence).
- **Acceptance criteria:**
  - AC1: Given flag defaults only, When policy resolves for an order, Then piece='BY_PART_STAGE' and bundle=true with no TrackPolicy rows needed.
  - AC2: Given an order row says body=piece and a bundle override says bundle-only for B123, When B123 is generated, Then the effective policy for B123 is bundle-only (override wins).
  - AC3: Given a user without `tracking.policy.override`, When attempting a bundle override POST, Then the request is denied (G5).
  - AC4: Given policy change mid-order, When new cutting jobs run, Then only new generations follow the new policy (existing units unchanged).
- **Test commands:** `npm test -- tests/track.policy.test.ts`; `npm run lint`; `npm run build`
- **Out of scope:** unit creation mechanics (WO-S7.3), label rendering (WO-S7.2).
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] G5: override right enforced
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S7.7 ticked

## WO-S7.8 — Label printing at cutting/GRN/packing/gate + offline window (M, S7)
- **Objective:** Wire label printing into the four printing points with the offline validation window.
- **Refs:** 08 sec. 3 (offline whitelist + HMAC key version; size matrix), sec. 8 (phase 1 cutting-first); 04 sec. 12 (labels print/void); 02 sec. 23.
- **Owning docs:** 08, 04, 02
- **Preconditions:** WO-S7.2 (LabelService + QrLabelSvg), WO-S7.3 (creation points), WO-S7.7 (policy).
- **Implementation steps:**
  1. Add print hooks at the four points in `src/services/tracking/LabelPoints.ts`: cutting bundle generation, fabric GRN roll detail, packing list (carton), gate pass (despatch doc).
  2. Offline validation window: station bootstrap endpoint `GET /api/tracking/station/bootstrap?ordId` returning the (ordId, lotId, stageId) whitelist + current HMAC key version, cached in IndexedDB via `src/lib/offline/trackCache.ts`.
  3. Print flow writes TrackLabelLog rows (WO-S7.2 service) and renders via QrLabelSvg into the print station queue.
  4. UI buttons on the cutting production page (page created by WO-S4.x — inject the button there in that stage if not yet existing), `app/grn/new/page.tsx` (GRN wizard), `app/commercial/packing-list/page.tsx`, and `app/dc/gate/pass/page.tsx` (gate pass screen).
  5. Tests `tests/track.labels.points.test.ts`.
- **Acceptance criteria:**
  - AC1: Given a cutting job generating 12 bundles, When labels print, Then 12 TrackLabelLog rows exist with reason 'cutting' and 12 bundle-sized (40x25mm) render payloads.
  - AC2: Given a station offline after bootstrap, When labels are validated locally, Then codes whose (ordId, lotId, stageId) are whitelisted pass and others reject without a server call.
  - AC3: Given a key rotation (version bump), When the station re-bootstraps, Then old-version signatures stop validating locally and re-queued scans revalidate.
  - AC4: Given each of the four points, When printing, Then the correct size and text block variant is used (matrix assertion per point).
- **Test commands:** `npm test -- tests/track.labels.points.test.ts`; `npm run lint`; `npm run build`
- **Out of scope:** reprint campaign (WO-S7.9), gate scan-out closing (WO-S7.10).
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] G5: print actions rights-gated
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S7.8 ticked

## WO-S7.9 — Backfill jobs + reprint campaign tooling (L, S7)
- **Objective:** Backfill TrackUnits for in-flight orders from legacy anchors and run per-godown label reprint campaigns.
- **Refs:** 08 sec. 8 (phase 2 backfill), sec. 2 (anchor map); 04 sec. 12 (`POST /api/tracking/backfill`); 03 sec. 10 (legacyRef requirement).
- **Owning docs:** 08, 04, 03
- **Preconditions:** WO-S7.1-S7.3 live; in-flight order list agreed (which orders backfill vs start clean).
- **Implementation steps:**
  1. Write `src/services/tracking/BackfillService.ts` + batch runner `scripts/backfill/trackUnits.ts`: read CurrentStock_RollDtl -> FAB_ROLL, Pay_CuttProd_Bundle -> BUNDLE (+CUT_LAY from lay headers), Pay_BundlePcs_Barcode -> PIECE, each with legacyRef and status mapping from Pcs_Status U/G/R.
  2. Derive edges where lineage data allows (FrmStockID chains, bundle->lay headers); mark unknown-lineage units with a backfill exception for review rather than guessing.
  3. Reprint campaign: per godown query units lacking live labels -> batch print via LabelService with reason 'backfill'; TrackLabelLog audit.
  4. Admin route `POST /api/tracking/backfill` (rights `tracking.backfill`) + progress job rows (ReportJob reuse).
  5. Reconciliation pass after backfill: run TraceProjector and clear exceptions.
  6. Tests `tests/track.backfill.test.ts` on masked sample extracts.
- **Acceptance criteria:**
  - AC1: Given 500 masked anchor rows across the three legacy tables, When backfill runs, Then 500 TrackUnits exist with correct type, legacyRef, and status mapping (U->ACTIVE, G->ACTIVE, R->REJECTED asserted).
  - AC2: Given a roll with no derivable parent edge, When backfill completes, Then a backfill exception row exists (no guessed edge written).
  - AC3: Given the campaign tool, When run for godown G1, Then every unit in G1 without a live label gets exactly one new live label + log row.
  - AC4: Given backfill completion, When TraceProjector reconciles, Then zero NEW mismatch exceptions are attributable to backfill rows (pre-existing ledger diffs excepted).
  - AC5: Given the job is killed midway, When restarted, Then it resumes without duplicating units (idempotency by legacyRef).
- **Test commands:** `npx tsx scripts/backfill/trackUnits.ts --dry-run`; `npm test -- tests/track.backfill.test.ts`; `npm run lint`
- **Out of scope:** historical TrackEvent synthesis (no fake history - backfill marks createdAt as backfill date), despatch edge creation for shipped units (out of scope by design).
- **DoD checklist:**
  - [ ] AC1-AC5 verified
  - [ ] G5: backfill route rights-gated
  - [ ] G4: 08 sec. 8 updated with run stats
  - [ ] `npm run lint` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S7.9 ticked

## WO-S7.10 — Carton/gate scan-out closing to DESPATCH_DOC (S, S7)
- **Objective:** Close the tracking loop: carton scans at gate link to the despatch doc and flip units to SHIPPED.
- **Refs:** 08 sec. 5 (packing list / despatch row: CARTON units, carton->despatch edges, gate QR closes loop), sec. 2 (DESPATCH_DOC anchor Trs_Pcs1); 03 sec. 10; 05 sec. 1 (`trace.shipped`).
- **Owning docs:** 08, 03, 05
- **Preconditions:** WO-S7.3 (despatch edges), WO-S7.6 (scan console), WO-S5.3 (invoices attach despatch docs).
- **Implementation steps:**
  1. On sales/despatch DC save with tracking ON: create DESPATCH_DOC unit + CARTON->DESPATCH_DOC MERGE edges (from packing list lines) in `src/posting/trackHooks.ts`.
  2. Gate scan flow: scanning a carton code at exit resolves the unit, verifies it belongs to an open gate pass / despatch doc, writes TrackEvent(mode QR, station gate), flips status SHIPPED, emits `trace.shipped`.
  3. Voided-label scan attempts log as exceptions (WO-S7.4 feed).
  4. UI: gate screen action on `app/dc/gate-pass/page.tsx`; river despatch stage reflects shipped qty live.
  5. Tests `tests/track.gate.test.ts`.
- **Acceptance criteria:**
  - AC1: Given a despatch of 10 cartons, When the DC saves, Then 10 MERGE edges to one DESPATCH_DOC unit exist and the river despatch stage shows the carton count.
  - AC2: Given a gate scan of carton 7 of that despatch, When scanned, Then unit status becomes SHIPPED, one TrackEvent(station=gate) is written, and `trace.shipped` is emitted.
  - AC3: Given a carton scanned at gate for a different despatch doc, When scanned, Then the scan is rejected with a mismatch message and no status change occurs.
  - AC4: Given the DC is reversed after gate-out, When compensated, Then edges invert and units return from SHIPPED to prior status (G3 in tracking domain).
- **Test commands:** `npm test -- tests/track.gate.test.ts`; `npm run lint`; `npm run build`
- **Out of scope:** e-way bill generation (WO-S5.x scope), buyer portal export.
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] G1/G3 proofs in tracking domain
  - [ ] G5: gate scan rights-gated (`tracking.gate`)
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S7.10 ticked

## WO-S8.1 — AI infra: gateway, prompt registry, constrained decoding, AiActionLog, cost metering (M, S8)
- **Objective:** Build the provider-agnostic AI platform components with full audit logging, cost metering, and default-OFF enablement.
- **Refs:** 09 sec. 6 (component table), sec. 7 (kill switches), sec. 1 (principle 1: no separate write path); 04 sec. 13 (AI endpoints; "no posting logic"); 05 sec. 1 (ai.* events); 07 sec. 3 (flag registry additions).
- **Owning docs:** 09, 04, 07
- **Preconditions:** Stage 7 exit; S1.3 FlagsProvider (add flags `ai_enabled` + the per-skill `ai_*` flags); secrets management from S0.1.
- **Implementation steps:**
  1. Write `src/services/ai/gateway.ts`: provider-agnostic LLM Gateway (cloud + on-prem vLLM), per-skill model routing, retries, timeout.
  2. Write `src/services/ai/PromptRegistry.ts`: versioned prompts per skill + per-doc-type few-shot; deploy of a new version is eval-gated (calls WO-S8.10 gate).
  3. Write `src/services/ai/schemaDecoding.ts`: JSON-schema/tool-constrained generation against the app's zod DTOs, retry-with-repair on violations, deterministic post-processing (dates -> finyear, qty normalization, UOM mapping).
  4. Write `src/services/ai/AiActionLogService.ts` (who/what/model/promptVersion/extracted/corrected/result-link) and `src/services/ai/CostMeter.ts` (per tenant/user budgets, identical-document-hash cache).
  5. Kill switches: global `ai_enabled` + per-skill `ai_<name>` flags - ALL DEFAULT OFF; provider outage degrades to capture-only mode (manual entry never blocked).
  6. Emit ai.* events (05 sec. 1) via outbox.
  7. Tests `tests/ai.infra.test.ts` (routing, retry, schema repair, cost cap, kill-switch behavior).
- **Acceptance criteria:**
  - AC1: Given `ai_enabled`='N' (default), When any AI endpoint is called, Then the response is a capture-only acknowledgement and zero LLM calls are made (flag-default proof).
  - AC2: Given a schema-violating first LLM response, When decoding runs, Then exactly one repair retry occurs and the final output validates against the zod DTO or fails cleanly.
  - AC3: Given a tenant budget of 1000 units already spent, When a new request arrives, Then it is rejected with a budget message and logged by CostMeter.
  - AC4: Given any skill invocation, When it completes, Then an AiActionLog row exists with model, promptVersion, and result link; given the same document hash twice, Then the second call is served from cache (cost metering proof).
  - AC5: Given a provider outage, When a parse is requested, Then the capture is queued (parse-later) and the user can still complete manual entry unimpeded.
- **Test commands:** `npm test -- tests/ai.infra.test.ts`; `npm run lint`; `npm run build`
- **Out of scope:** capture/perception (WO-S8.2), MasterMatch (WO-S8.3), specific skills (WO-S8.5-S8.7), admin UI (WO-S8.11).
- **DoD checklist:**
  - [ ] AC1-AC5 verified
  - [ ] G5: `ai_enabled` and all per-skill `ai_*` flags registered default OFF in flags registry
  - [ ] G4: 09 sec. 6 / 04 sec. 13 confirmed
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S8.1 ticked

## WO-S8.2 — Capture + perception (OCR Tamil/English, classify) (M, S8)
- **Objective:** Implement document capture (photo/upload/email watcher) and the perception layer (classify + OCR + table/region detection).
- **Refs:** 09 sec. 2 (CAPTURE and PERCEPTION rows), sec. 1 principle 5 (works when internet does not); 04 sec. 13 (`POST /api/ai/capture`); 09 sec. 9.
- **Owning docs:** 09, 04
- **Preconditions:** WO-S8.1; email inbox access config for the watcher.
- **Implementation steps:**
  1. Write `src/services/ai/CaptureService.ts`: multipart ingest (photo/file/voice/email-eml), capture-now/parse-later queue (works offline), emits `ai.doc.classified` after perception.
  2. Write `src/services/ai/PerceptionService.ts`: DocClassifier (doc type), OCR Tamil+English printed with handwriting assist, table/region detection, rotation/cleanup; source bounding boxes preserved per field for the review screen.
  3. AiDropZone component `src/components/ai/AiDropZone.tsx` (photo/upload/paste) + email watcher job `scripts/ai-email-watcher.ts`.
  4. Route `app/api/ai/capture/route.ts` (multipart).
  5. Store raw + derived artifacts under the retention policy contract (WO-S8.12 consumes).
  6. Tests `tests/ai.capture.test.ts`.
- **Acceptance criteria:**
  - AC1: Given a Tamil/English mixed supplier-bill photo, When captured, Then the perception output includes doc type, per-field text, and bounding boxes, and `ai.doc.classified` is emitted with the type.
  - AC2: Given the provider is down, When a photo is dropped, Then the capture is stored queued and the UI shows parse-pending - manual entry remains fully usable.
  - AC3: Given a rotated 90-degree upload, When processed, Then cleanup corrects orientation before OCR and field-level F1 on the seeded fixture set is >= 0.85.
  - AC4: Given an email watcher run over a fixture .eml with an attached buyer PO, Then a capture row with source=email exists and is classified the same as the manual upload of the same PDF.
- **Test commands:** `npm test -- tests/ai.capture.test.ts`; `npm run lint`; `npm run build`
- **Out of scope:** extraction to DTOs (WO-S8.1 schema decoding consumes), review UI (WO-S8.4), skills.
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] G5: capture endpoint rights-gated per user
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S8.2 ticked

## WO-S8.3 — MasterMatch (embeddings + aliases + trade shorthand) (L, S8)
- **Objective:** Implement fuzzy master resolution with embeddings, the MasterAlias table, and the Tirupur trade-shorthand dictionary, learning from corrections.
- **Refs:** 09 sec. 6 (MasterMatch + learning store rows); 04 sec. 13; 03 sec. 5 (MasterAlias new table from S0.3).
- **Owning docs:** 09, 04, 03
- **Preconditions:** WO-S8.1; master extracts (Mas_Party/Mill/Count/Fabric/Acc/Style/Buyer) available; embedding model config.
- **Implementation steps:**
  1. Write `src/services/ai/MasterMatchService.ts`: embeddings over the seven master families; candidate ranking by embedding score + alias exact match + shorthand dictionary.
  2. Seed `MasterAlias` table + abbreviation dictionary ("30s combed", "2x2 rib", party pet names) in `src/services/ai/shorthandDict.ts` (data file `src/services/ai/data/shorthand.json`).
  3. Picker-suggestion contract: returns top-5 with fuzzy-warning marker when score below threshold (opens legacy picker per 09 sec. 4).
  4. Learning: every correction from the review screen writes an AiCorrection row; after N consistent corrections an alias auto-suggestion is raised for approval.
  5. Tests `tests/ai.mastermatch.test.ts` with a vernacular fixture set.
- **Acceptance criteria:**
  - AC1: Given "30s combed hosiery yarn" on a bill, When resolved against counts/fabric, Then the top candidate matches the fixture master and carries source "shorthand".
  - AC2: Given a party pet name with an approved alias, When resolved, Then the alias resolves exactly (rank 1, no fuzzy warning).
  - AC3: Given 3 consecutive corrections mapping "Aanannd" -> party Anand, When the third commits, Then an alias auto-suggestion is raised and (once approved) the next "Aanannd" resolves without warning.
  - AC4: Given a score below threshold, When suggestions return, Then the fuzzy warning flag is set and the UI path opens the manual picker (never silently posts).
- **Test commands:** `npm test -- tests/ai.mastermatch.test.ts`; `npm run lint`; `npm run build`
- **Out of scope:** review UI (WO-S8.4), skill pipelines (WO-S8.5-S8.7), on-prem embeddings choice (WO-S8.12).
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] G5: alias approval rights-gated (`ai.alias.approve`)
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S8.3 ticked

## WO-S8.4 — ParseReviewScreen + review inbox (L, S8)
- **Objective:** Build the review screen (source<->fields, confidence chips, numeric confirm, voice readback) and the review inbox.
- **Refs:** 09 sec. 4 (screen layout tree), sec. 1 principles 2-4; 04 sec. 13 (inbox/drafts/confirm/correct endpoints); 02 sec. 24.
- **Owning docs:** 09, 04, 02
- **Preconditions:** WO-S8.1-S8.3; any one extraction skill producing drafts (can land with WO-S8.5 in parallel).
- **Implementation steps:**
  1. Build the review screen as per-component files under `src/components/ai/review/` per 09 sec. 4 tree: `SourcePane.tsx` (zoom + highlighted boxes, tap field <-> box), `FieldsPane.tsx` with confidence chips (green >= 0.9 auto, amber check, red enter), `NumericConfirm.tsx` (big digits + Tamil voice readback + re-speak), `MasterChip.tsx` (fuzzy warning opens picker), `GridPreview.tsx` (size/color matrix like manual order grid), `MatchPanel.tsx` (bills 3-way), `VoiceHelp.tsx`, `ActionBar.tsx` (Confirm & Post / Save Draft / Correct / Reject), composed by `src/components/ai/ParseReviewScreen.tsx`.
  2. Numeric loop: no number ever posts from raw ASR/extraction alone - every qty/rate passes the confirm control (09 sec. 5 rule).
  3. Inbox: `app/ai/inbox/page.tsx` (queue by doc type + confidence) backed by `GET /api/ai/inbox`; drafts detail `GET /api/ai/drafts/:id`.
  4. Confirm posts through the SAME 04 endpoints as manual entry with the user's rights; Correct writes AiCorrection (learning); Reject feeds learning negative sample.
  5. i18n: all AI copy from the versioned Tamil-first bundle `src/i18n/ai/ta.json` (+ en).
  6. Tests `tests/ai.review.test.ts` (confidence gating, numeric confirm requirement, confirm calls the manual endpoint, correct feeds learning).
- **Acceptance criteria:**
  - AC1: Given a draft with per-field confidences 0.95/0.7/0.2, When rendered, Then the three fields show green/amber/red chips and the red field cannot be confirmed empty.
  - AC2: Given Confirm & Post is clicked with an unconfirmed numeric field, When submitted, Then the client blocks posting until the numeric confirm control is satisfied (loop enforcement).
  - AC3: Given confirm succeeds, When the request lands, Then the network call targets the SAME endpoint as manual entry (assert URL equals the manual route) and the posted doc passes the manual-path rights check.
  - AC4: Given Correct is applied to the party field, When saved, Then an AiCorrection row exists and the learning store links it to the draft.
  - AC5: Given a draft awaits review over a day, When the daily nudge runs, Then a notification is emitted (05 sec. 5 AI nudge).
- **Test commands:** `npm test -- tests/ai.review.test.ts`; `npm run lint`; `npm run build`
- **Out of scope:** specific skills' extraction logic (WO-S8.5-S8.7), assistant chat (WO-S8.8), admin console (WO-S8.11).
- **DoD checklist:**
  - [ ] AC1-AC5 verified
  - [ ] G5: inbox + confirm rights-gated as the underlying form rights
  - [ ] G4: 02 sec. 24 confirmed
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S8.4 ticked

## WO-S8.5 — Skill: supplier bill parse + 3-way match (L, S8)
- **Objective:** Implement the supplier-bill skill: invoice photo -> bill draft with 3-way match vs PO and GRN and TDS preview, behind a default-OFF flag.
- **Refs:** 09 sec. 3 skill #2, sec. 4 MatchPanel; 04 sec. 13 + sec. 9 (`POST /api/commercial/bills` is the confirm target); 03 sec. 6 (po_buddev, bill_bcheck tolerances surfaced).
- **Owning docs:** 09, 04, 03
- **Preconditions:** WO-S8.1-S8.4; WO-S5.2 (bills service as confirm target); golden bill samples for eval.
- **Implementation steps:**
  1. Write `src/services/ai/skills/BillParseSkill.ts`: capture -> perceive -> extract to BillCreateDto-shaped draft (lines kgs/mtr/rls, rate, GST%) with per-field confidence + boxes.
  2. MatchPanel data: 3-way line diff (PO vs GRN vs invoice) with tolerance flags (po_buddev, bill_bcheck dev) computed in `src/services/ai/skills/threeWayMatch.ts`.
  3. TDS preview on the draft using party defaults.
  4. Confirm -> `POST /api/commercial/bills` (manual path, full rights + tolerances).
  5. Flag `ai_bill_parse` default OFF; skill only suggests when ON; shadow mode support (compare vs human entry without suggesting).
  6. Tests `tests/ai.skill.bill.test.ts` + eval-set rows in `tests/ai/golden/bills/`.
- **Acceptance criteria:**
  - AC1: Given a fixture invoice photo, When the skill runs, Then the draft lines match the golden expected values (qty within 0.01, rate exact) with confidences attached.
  - AC2: Given PO 100 / GRN 95 / invoice 110 kg, When the match panel computes, Then the invoice-vs-GRN delta 15 is flagged against `bill_bcheck` dev and shown amber/red per threshold.
  - AC3: Given confirm, When posted, Then the bill appears exactly as if entered manually on the WO-S5.2 register (row-level parity) and an AiActionLog row links draft -> bill id.
  - AC4: Given `ai_bill_parse`='N' (default), When a bill photo is captured, Then no draft is produced and the capture is stored only.
  - AC5: Given shadow mode ON, When a user enters a bill manually, Then the skill's would-be output is compared and recorded in the eval store (no user-visible suggestion).
- **Test commands:** `npm test -- tests/ai.skill.bill.test.ts`; `npm run lint`; `npm run build`
- **Out of scope:** challan->GRN (WO-S8.6), buyer PO (WO-S8.7), payments.
- **DoD checklist:**
  - [ ] AC1-AC5 verified
  - [ ] Eval gate rows registered (WO-S8.10 consumes); flag default OFF confirmed
  - [ ] G5: confirm action uses the user's commercial rights
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S8.5 ticked

## WO-S8.6 — Skill: job-worker challan -> GRN draft (L, S8)
- **Objective:** Implement the challan skill: party DC photo -> 'Process' GRN draft with roll detail, OurDCID match, and loss % computed vs DC.
- **Refs:** 09 sec. 3 skill #3; 04 sec. 5 (`POST /api/grn` confirm target), sec. 13; 03 sec. 4.1 (process GRN row: new identity, loss = DC - GRN monitored); 03 sec. 6 (dyeinggamtper).
- **Owning docs:** 09, 04, 03
- **Preconditions:** WO-S8.1-S8.4; WO-S4.5 not required (fabric GRN from Stage 2/3); golden challan samples.
- **Implementation steps:**
  1. Write `src/services/ai/skills/ChallanGrnSkill.ts`: handwritten/printed DC photo -> GrnCreateDto draft (grnType 'Process') with roll detail lines.
  2. OurDCID match: resolve the party challan to our outstanding DC (party + fabric fingerprint + qty window) with explicit match chip; unresolved goes red for manual pick.
  3. Loss % computed vs matched DC qty; compared against `dyeinggamtper` and surfaced in MatchPanel.
  4. Confirm -> `POST /api/grn` (same wizard validations incl. tolerance banner).
  5. Flag `ai_grn_parse` default OFF; shadow mode supported.
  6. Tests `tests/ai.skill.challan.test.ts` + golden set `tests/ai/golden/challans/`.
- **Acceptance criteria:**
  - AC1: Given a handwritten challan fixture, When parsed, Then roll lines (kgs, lot if present) match golden values within tolerance with boxes attached.
  - AC2: Given a matched DC of 500 kg and challan total 482 kg, When the draft computes, Then loss 3.6% shows and against `dyeinggamtper`=5 it is green (under tolerance); at 6% it is red.
  - AC3: Given confirm, When posted, Then the GRN lands through the manual service with the dyed identity creation intact (ledger parity spot-check).
  - AC4: Given `ai_grn_parse`='N' (default), When a challan photo is captured, Then no GRN draft is produced.
- **Test commands:** `npm test -- tests/ai.skill.challan.test.ts`; `npm run lint`; `npm run build`
- **Out of scope:** piece GRN (manual/WO-S4.5), multi-process GRN, reprocess R legs.
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] Eval gate rows registered; flag default OFF confirmed
  - [ ] G5: confirm uses the user's GRN rights
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S8.6 ticked

## WO-S8.7 — Skill: buyer PO -> order-sheet draft (EVAL-GATED) (L, S8)
- **Objective:** Implement the buyer-PO skill producing a full order-sheet draft (style/color/size grids) that ships DARK until the eval gate passes.
- **Refs:** 09 sec. 3 skill #1, sec. 7 (release gate: golden scores must not regress), sec. 10 step 3 ("after golden-set >= threshold"); 04 sec. 2 (`POST /api/orders` confirm target), sec. 13; 02 sec. 3 (order sheet grid parity: EntryOption 1/2).
- **Owning docs:** 09, 04, 02
- **Preconditions:** WO-S8.1-S8.4; WO-S8.10 eval harness green-light recorded for this skill (gate: field-level scores meet thresholds on the golden set; until then the WO closes with the flag OFF and skill in shadow only); the `ai:eval` npm script itself arrives in WO-S8.10 — run the eval test command below only after S8.10 merges.
- **Implementation steps:**
  1. Write `src/services/ai/skills/BuyerPoSkill.ts`: PO email/PDF/Excel/photo -> OrderSheet draft: buyer, styles, color/size grid (both EntryOption modes), qty, rates, FCY, delivery dates, excess suggestion vs CutPlanQty norms.
  2. Grid extraction uses the large-model routing (09 sec. 6) and GridPreview parity with the manual order-sheet grid.
  3. Confirm -> `POST /api/orders` (export/domestic/trading variants).
  4. Flag `ai_po_parse` default OFF; enabling requires a recorded eval-gate pass artifact `tests/ai/golden/buyerpo/GATE.json` (thresholds: grid-cell F1 >= 0.90, numeric exact >= 0.95 - record actual achieved values).
  5. Shadow mode from day one: compare against human-entered sheets; weekly report.
  6. Tests `tests/ai.skill.buyerpo.test.ts` (grid parity both modes, FCY, excess suggestion, gate enforcement).
- **Acceptance criteria:**
  - AC1: Given a golden buyer PO (EntryOption 2, 3 colors x 6 sizes), When parsed, Then the grid matches golden cell-for-cell (F1 computed in-test >= 0.90).
  - AC2: Given no GATE.json pass artifact, When any user attempts to enable `ai_po_parse`, Then the flags editor rejects the change with the gate message (eval-gated enablement proof).
  - AC3: Given the gate has passed and the flag ON, When a draft is confirmed, Then the created order equals a manually-entered equivalent (spot parity: styles, grid totals, rates, delivery dates).
  - AC4: Given the flag OFF (default), When a buyer PO is captured, Then only capture + shadow comparison happen; no draft enters the inbox.
  - AC5: Given a new prompt version B, When the eval runs, Then B ships only if scores >= version A on every golden metric (no-regress rule enforced by the CI job from WO-S8.10).
- **Test commands:** `npm test -- tests/ai.skill.buyerpo.test.ts`; `npm run ai:eval -- --skill buyerpo` (ai:eval script arrives in WO-S8.10 — run this AC after S8.10 merges); `npm run lint`
- **Out of scope:** order amendment flows, style-change, trading-order special legs beyond DTO mapping.
- **DoD checklist:**
  - [ ] AC1-AC5 verified
  - [ ] Eval gate artifact committed; flag default OFF unless gate green
  - [ ] G5: confirm uses the user's order-entry rights
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S8.7 ticked

## WO-S8.8 — Assistant (chat/voice) + AiDock (M, S8)
- **Objective:** Implement the Tamil-first assistant (grounded read answers, draft-open intents, numeric loop) and the AiDock entry point on every form.
- **Refs:** 09 sec. 5 (Indic STT stack, constrained grammars, numeric confirmation loop), sec. 3 skill #10 + #5, sec. 8 (surfaces: AiDock, /ai/assistant, /m/ai); 04 sec. 13 (`POST /api/ai/assistant`, `POST /api/ai/prefill/:form`).
- **Owning docs:** 09, 04
- **Preconditions:** WO-S8.1; read APIs from Stages 3-6 live; Indic-tuned STT config (AI4Bharat IndicWhisper lineage) with context biasing from masters.
- **Implementation steps:**
  1. Write `src/services/ai/AssistantService.ts`: intent router -> skill (read answers grounded on 04 read APIs with 60s cache per question class; write intents open prefilled wizards only - never post).
  2. Voice stack in `src/services/ai/VoiceService.ts`: Indic-tuned STT with context biasing (party names, counts, kgs), Tanglish code-switch, TTS readback; every quantity/rate passes the numeric confirmation loop (no number posts from raw ASR).
  3. Build `src/components/ai/AiDock.tsx` (floating action on every form: "fill from photo/email") -> `POST /api/ai/prefill/:form`.
  4. Pages: `app/ai/assistant/page.tsx` (chat + voice + command palette), `app/m/ai/page.tsx` (snap challan -> draft, voice Q&A, approvals brief).
  5. Status Q&A example parity: "party X: how many kg at dyeing" -> PartyOutQry-grounded Tamil answer with source API named in the payload.
  6. Flags: `ai_assistant` default OFF (read-only answers when ON; write-drafting also gated by the same `ai_assistant` flag plus the user's own write rights — the registry has no separate write flag).
  7. Tests `tests/ai.assistant.test.ts`.
- **Acceptance criteria:**
  - AC1: Given a status question, When asked, Then the answer payload cites the source endpoint (grounding proof) and is cached for 60s (second identical ask does not re-query).
  - AC2: Given a voice draft intent ("300 kg to Anand dyeing"), When processed, Then the assistant opens the DC wizard prefilled and does NOT call any POST write endpoint itself.
  - AC3: Given a spoken quantity, When the draft opens, Then the numeric confirm control requires explicit confirmation before the wizard can save (loop enforcement).
  - AC4: Given `ai_assistant`='N' (default), When the assistant is opened, Then it renders disabled with the enable hint; no STT/LLM calls occur.
- **Test commands:** `npm test -- tests/ai.assistant.test.ts`; `npm run lint`; `npm run build`
- **Out of scope:** digests/narrator (WO-S8.9), triage (WO-S8.9), scan-help fuzzy resolve (tracked in 09 sec. 3 #14 - implement here only if gate green; else backlog).
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] G5: assistant + write flags default OFF; rights = user's own
  - [ ] G4: 02 sec. 24 / 04 sec. 13 confirmed
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S8.8 ticked

## WO-S8.9 — Digest + narrator + approval triage cards (M, S8)
- **Objective:** Implement the daily Tamil exception digest, register narrator, and approval triage summaries.
- **Refs:** 09 sec. 3 skills #11-#13, #15; 05 sec. 1 (`ai.digest.sent`), sec. 5 (digest flag `ai_digest`); 04 sec. 10 (approvals endpoints), sec. 13 (`GET /api/ai/digest`).
- **Owning docs:** 09, 05, 04
- **Preconditions:** WO-S8.1, WO-S8.8 (voice stack reuse); read APIs for exceptions (05 sec. 5 trigger list), registers, approvals.
- **Implementation steps:**
  1. Write `src/services/ai/DigestService.ts`: daily Tamil digest of non-return DCs, loss > dyeinggamtper, WBS red stages, approvals pending, tracking reconciliation mismatches (08 feed from WO-S7.4); emits `ai.digest.sent`.
  2. Write `src/services/ai/NarratorService.ts`: any register -> 5-line Tamil summary + top exceptions via report-job output.
  3. Write `src/services/ai/TriageService.ts`: approval inbox summarizer - why pending, deviation vs tolerance, recommendation; rendered as triage cards in `app/approvals/page.tsx` (create the page here if absent — the WO-S1.8 shell only stubs the nav entry, not the page).
  4. Meeting-pack narration hook into WO-S6.5 pack output.
  5. Flag `ai_digest` default OFF; narrator per-register launch behind `ai_narrator` default OFF.
  6. Tests `tests/ai.digest.test.ts`.
- **Acceptance criteria:**
  - AC1: Given a day with 3 non-return DCs past aging and 1 WBS red, When the digest runs, Then all 4 items appear in Tamil copy with links and `ai.digest.sent` is emitted once.
  - AC2: Given a register job result, When narrated, Then the summary is exactly 5 lines and cites the top exceptions by the fixture's ranking.
  - AC3: Given a PO approval 12% over budget vs `po_buddev` 10, When triaged, Then the card shows deviation 12% vs tolerance 10% with recommendation text from the fixture.
  - AC4: Given `ai_digest`='N' (default), When the day ends, Then no digest is generated or sent.
- **Test commands:** `npm test -- tests/ai.digest.test.ts`; `npm run lint`; `npm run build`
- **Out of scope:** SMS/email channel plumbing (05 sec. 5 exists - only confirm send), assistant chat (WO-S8.8).
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] G5: digest + narrator flags default OFF
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S8.9 ticked

## WO-S8.10 — Eval harness: golden sets, scoring, CI gate, shadow mode (M, S8)
- **Objective:** Implement the evaluation harness (golden-set builder, field-level scoring, CI release gate, shadow mode reporting) that gates every AI skill.
- **Refs:** 09 sec. 7 (golden datasets, field-level scoring, release gate, shadow mode), sec. 10 rollout; 09 sec. 6 (learning store feeds).
- **Owning docs:** 09
- **Preconditions:** WO-S8.2-S8.7 drafts/corrections flowing (at least one skill live in shadow).
- **Implementation steps:**
  1. Write `src/services/ai/eval/GoldenSetBuilder.ts`: build per-skill golden sets from AiCorrection history + seeded real samples + synthetic Tamil variants; store under `tests/ai/golden/<skill>/`.
  2. Write `src/services/ai/eval/scoring.ts`: field-level scoring - exact match for enums, value-tolerance for numerics, F1 for entities/grids; per-skill metric definitions in `tests/ai/golden/metrics.json`.
  3. CI gate: script `npm run ai:eval` compares current scores vs baseline `tests/ai/golden/BASELINE.json`; exit non-zero on any regression; wired into CI alongside lint+build.
  4. Shadow mode report: weekly job comparing skill output vs human entries with would-be accuracy; output to `design/ai/weekly-shadow-report.md`.
  5. Gate artifacts: pass/fail JSON per skill (consumed by WO-S8.7 enablement).
  6. Tests `tests/ai.eval.test.ts` (scoring math, regression detection, gate exit codes).
- **Acceptance criteria:**
  - AC1: Given a baseline F1 0.92 and a candidate run at 0.90 for any metric, When `npm run ai:eval` runs, Then the process exits non-zero naming the regressed metric and skill.
  - AC2: Given numeric fields with tolerance 0.01, When scored, Then a 0.005 off value scores pass and a 0.02 off value scores fail (tolerance boundary proof).
  - AC3: Given 50 shadow comparisons with 45 exact matches, When the weekly report generates, Then would-be accuracy 0.90 is reported per field with breakdown.
  - AC4: Given a golden set grows by 20 new corrected docs, When rebuilt, Then baseline update requires an explicit approve step (no silent baseline drift).
- **Test commands:** `npm run ai:eval`; `npm test -- tests/ai.eval.test.ts`; `npm run lint`
- **Out of scope:** model training/fine-tuning, prompt authoring (PromptRegistry owns), admin UI for golden sets (WO-S8.11 displays).
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] CI job wired (ai:eval beside lint+build)
  - [ ] `npm run lint` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S8.10 ticked

## WO-S8.11 — /admin/ai console (providers, prompts, cost, kill switches) (S, S8)
- **Objective:** Build the admin console for providers/keys, prompt versions, golden sets, cost/correction dashboards, and kill switches.
- **Refs:** 09 sec. 8 (admin surfaces); 04 sec. 13 (`GET/POST /api/admin/ai/*` locked); 02 sec. 24.
- **Owning docs:** 09, 04, 02
- **Preconditions:** WO-S8.1 (infra to administer), WO-S8.10 (eval data to show).
- **Implementation steps:**
  1. Build `app/admin/ai/page.tsx` with tabs: providers/models/keys, prompt versions (+ eval status per version), golden-set manager, cost dashboard (tenant/user), corrections dashboard, kill switches.
  2. Kill-switch controls write the `ai_enabled` / per-skill `ai_*` flags through ConfigService (audit-logged flag writes only).
  3. Prompt version promote action requires the WO-S8.10 gate artifact; blocked otherwise with the gate message.
  4. Routes under `app/api/admin/ai/` per 04 sec. 13, all rights-gated `admin.ai`.
  5. Tests `tests/ai.admin.test.ts`.
- **Acceptance criteria:**
  - AC1: Given an operator toggles the global kill switch OFF, When saved, Then `ai_enabled`='N' persists and within one request cycle all AI endpoints degrade to capture-only (integration assertion).
  - AC2: Given a prompt version without a passing gate artifact, When promote is attempted, Then the action is rejected with the gate message.
  - AC3: Given cost rows from CostMeter, When the dashboard renders, Then totals per tenant and user match the meter log sums.
  - AC4: Given a non-admin user, When opening `/admin/ai`, Then access is denied (G5).
- **Test commands:** `npm test -- tests/ai.admin.test.ts`; `npm run lint`; `npm run build`
- **Out of scope:** provider onboarding automation, billing.
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] G5: admin routes locked to `admin.ai`
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S8.11 ticked

## WO-S8.12 — On-prem inference option + PII masking + retention (S, S8)
- **Objective:** Provide the on-prem vLLM provider option, PII masking rules, and retention enforcement.
- **Refs:** 09 sec. 7 (data protection bullets), sec. 6 (gateway on-prem support), sec. 1 principle 5.
- **Owning docs:** 09
- **Preconditions:** WO-S8.1; tenant config schema extended.
- **Implementation steps:**
  1. Implement `src/services/ai/OnPremProvider.ts` (vLLM endpoint config, health check, fallback to capture-only on outage) registered in the gateway.
  2. Write `src/services/ai/PiiMasker.ts`: mask buyer price data from lower-right users; configurable field classes per tenant; masking applied before any cloud call and logged.
  3. Retention: `src/services/ai/RetentionService.ts` - image/artifact retention windows with purge job `scripts/ai-retention-purge.ts`; no training on tenant data without explicit opt-in (training paths disabled unless `ai_enabled`='Y'; default OFF).
  4. Config surface in `/admin/ai` (WO-S8.11) for region/provider choice.
  5. Tests `tests/ai.privacy.test.ts`.
- **Acceptance criteria:**
  - AC1: Given tenant config on-prem, When a parse runs, Then the request targets the configured vLLM endpoint and zero cloud provider calls occur (network stub assertion).
  - AC2: Given a doc containing buyer prices and a lower-right user context, When masking applies, Then prices are redacted before any external call and the log records the mask event.
  - AC3: Given a 30-day retention window and artifacts at day 31, When the purge job runs, Then those artifacts are deleted while AiActionLog metadata rows remain (audit retained).
  - AC4: Given `ai_enabled`='N' (default), When any training-path code runs, Then tenant data is excluded (structural guard test).
- **Test commands:** `npm test -- tests/ai.privacy.test.ts`; `npm run lint`; `npm run build`
- **Out of scope:** vLLM deployment ops, legal policy wording.
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] G5: config changes admin-only
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S8.12 ticked

## WO-S9.1 — Data-migration runbooks + reconciliation reports (L, S9)
- **Objective:** Write and prove the runbooks for migrating masters, open orders, and balances, with reconciliation reports.
- **Refs:** S0.2 extract pack; 08 sec. 8 (tracking backfill already run at S7); 11 sec. 6 (unverified items closed by now). Inlined S9 exit rule: parallel month green, perf budgets met, security pass, cutover runbook ready.
- **Owning docs:** 11, 08
- **Preconditions:** Stages 4-8 complete; extract pack current (re-diff drift per 11 sec. 6.3).
- **Implementation steps:**
  1. Write runbooks under `runbooks/migration/`: `masters.md` (Mas_* families incl. aliases + rights), `open-orders.md` (ordermas + OrdSeq + programs + balances), `balances.md` (ST_* regenerable via projectors - policy: recompute, do not copy), each with pre-checks, steps, and rollback.
  2. Implement migration scripts in `scripts/migration/`: `migrateMasters.ts`, `migrateOpenOrders.ts`, `migrateBalances.ts` (idempotent, dry-run mode, masked-sample testable).
  3. Reconciliation reports in `scripts/reconcile/`: row counts, checksums per master family, balance recompute vs legacy snapshot deltas -> `design/migration/reconciliation-report.md`.
  4. Numeric sign-off thresholds: masters 100% match; balances delta zero by construction (recompute); orders 100% header match.
  5. Tests `tests/migration.runbook.test.ts` running the scripts in dry-run against masked extracts.
- **Acceptance criteria:**
  - AC1: Given masked master extracts, When `migrateMasters.ts --dry-run` runs, Then the reconciliation report lists every family with expected vs actual counts and 100% match on the sample.
  - AC2: Given an interrupted masters migration, When re-run, Then it completes without duplicates (idempotency proof).
  - AC3: Given balances policy recompute-not-copy, When the balance migration runs, Then ST_* rows equal the projector SUM outputs on the migrated snapshot (delta zero).
  - AC4: [Reviewer sign-off] Given each runbook, When executed by a second person on staging, Then it completes without undocumented steps (runbook walk-through sign-off recorded).
- **Test commands:** `npx tsx scripts/migration/migrateMasters.ts --dry-run`; `npm test -- tests/migration.runbook.test.ts`; `npm run lint`
- **Out of scope:** cutover day ops (WO-S9.5), parallel-run month analysis (WO-S9.2), Track* backfill (WO-S7.9 done).
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] Reconciliation report committed under `design/migration/`
  - [ ] `npm run lint` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S9.1 ticked

## WO-S9.2 — Parallel-run month + fix log (M, S9)
- **Objective:** Operate one full finyear month in parallel and drive the fix log to zero outstanding items.
- **Refs:** 11 sec. 5 parity policy; WO-S6.7 tooling (extend to all doc families). Inlined S9 exit rule: the parallel-run report is green for one finyear month.
- **Owning docs:** 11
- **Preconditions:** WO-S9.1 (migration done on staging), WO-S6.7 comparison pack extended, staff available for dual entry windows.
- **Implementation steps:**
  1. Extend `scripts/parallel-run/compare.ts` with a full family mode (all TrType/GrnType rows, production, barcode, commercial, costing) keyed by month.
  2. Run the month; collect daily diffs into `design/parallel-run/s9-fixlog.md` (date, area, root cause, fix PR, re-run result).
  3. Any doc-parity failure opens a fix against the owning service and re-runs the specific golden tests from X4.
  4. Produce the final report `design/parallel-run/s9-month-report.md` with green/red matrix per family.
  5. npm script `"parallel-run:s9"`.
- **Acceptance criteria:**
  - AC1: Given the parallel month, When compared, Then every doc family has a pass/fail row with counts compared (ledger rows legacy vs new).
  - AC2: Given any red row, When its fix PR merges, Then the family turns green on re-run and the fix log entry links the PR.
  - AC3: Given the month completes, Then the report shows zero outstanding red items (exit criterion) and the artifact is committed.
  - AC4: Given the run, Then all G1-G3 golden tests still pass unchanged (no regressions from parity fixes).
- **Test commands:** `npm run parallel-run:s9`; `npm test`; `npm run lint`
- **Out of scope:** cutover (WO-S9.5), perf work (WO-S9.3).
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] S9 exit evidence committed (parallel-run report green for one finyear month — inlined rule)
  - [ ] `npm run lint` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S9.2 ticked

## WO-S9.3 — Perf budgets + Track* finyear indexes (M, S9)
- **Objective:** Set and enforce performance budgets for the scan station, registers, and river; add finyear-scoped indexes on Track* tables.
- **Refs:** 08 sec. 9 (event volume, partitioning, caching parent remaining qty); 05 sec. 2 (projector lag chip). Inlined S9 exit rule: perf budgets met on the scan station, registers, and river.
- **Owning docs:** 08, 05
- **Preconditions:** WO-S7.x volume data available (or synthetic generator), WO-S9.2 load patterns known.
- **Implementation steps:**
  1. Write `tests/perf/budgets.ts` defining budgets: scan check API p95 <= 150 ms; scan posting batch (500 pieces) <= 5 s; register page p95 <= 2 s; river (depth 9 genealogy, 5k nodes) <= 3 s; TraceProjector rebuild (order) <= 10 s.
  2. Add finyear-scoped indexes on TrackUnit/TrackEvent/TrackEdge (`src/db/migrations/0002_track_perf.sql`) incl. the partition-aligned indexes from 08 sec. 9.
  3. Load generator `scripts/perf/gen-track-load.ts` (20-60 scans/piece on piece-level orders).
  4. CI perf job `npm run perf:check` running budgets against a seeded DB; failing budgets fail CI.
  5. Optimize hot paths (parent remaining-qty cache per 08 sec. 9) until budgets hold.
- **Acceptance criteria:**
  - AC1: Given 1000 scan calls in the generator, When measured, Then p95 latency <= 150 ms (report artifact with percentiles).
  - AC2: Given a 500-piece posting batch, When run, Then wall time <= 5 s and the one-transaction guarantee from WO-S4.6 still holds (atomicity re-test under load).
  - AC3: Given a 5000-node genealogy query at depth 9, When executed, Then response <= 3 s using the new indexes (plan check shows index usage, no scan).
  - AC4: Given `npm run perf:check` in CI, Then a deliberately regressed budget fails the job (gate proof).
- **Test commands:** `npm run perf:check`; `npx tsx scripts/perf/gen-track-load.ts`; `npm run lint`
- **Out of scope:** UI micro-optimizations, hardware sizing docs beyond budget report.
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] Perf report committed under `design/perf/`
  - [ ] `npm run lint` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S9.3 ticked

## WO-S9.4 — Security pass: secrets, rights matrix, AI kill switches, label void audit (M, S9)
- **Objective:** Run the closing security pass across secrets handling, the rights matrix, AI kill switches, and label-void audit.
- **Refs:** 01 sec. 5 (no `sa` in code); 09 sec. 7 (kill switches), 08 sec. 3 (void audit); 05 sec. 3 (sync security). Inlined S9 exit rule: the closing security pass is green.
- **Owning docs:** 01, 09, 08
- **Preconditions:** All feature stages complete.
- **Implementation steps:**
  1. Secrets audit: `grep -rn` sweep for connection strings/keys in code and configs; move any finding to env/secrets store; document in `runbooks/security-secrets.md`.
  2. Rights matrix test: `tests/security/rightsMatrix.test.ts` enumerating every route in `app/api/**` asserting a rights check exists (deny-by-default).
  3. AI kill switches: verify flipping each per-skill `ai_*` flag and `ai_enabled` OFF immediately disables the path (extends WO-S8.1 AC1 to every skill).
  4. Label void audit: verify every void/label action lands in TrackLabelLog with user+reason and that a voided label cannot validate (extends WO-S7.2).
  5. Sync security: ack endpoint only clears flags for keys in the acknowledged set (no over-clearing).
- **Acceptance criteria:**
  - AC1: Given the secrets sweep, When run across the repo, Then zero hardcoded credentials or `sa` logins are found (grep proof in CI).
  - AC2: Given the rights matrix test enumerates all API routes, When run, Then any route without a rights check fails the test; current pass count = total route count.
  - AC3: Given each AI skill flag is turned OFF one at a time, When its endpoint is called, Then each returns capture-only/no-op (per-skill kill-switch matrix asserted).
  - AC4: Given a voided label scan attempt, When validated, Then it is rejected, logged with user+reason, and surfaced as an exception (WO-S7.4 feed assertion).
- **Test commands:** `npm test -- tests/security/rightsMatrix.test.ts`; `npm run lint`; `npm run build`
- **Out of scope:** penetration testing engagement, infra hardening (ops).
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] Security notes committed under `runbooks/`
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S9.4 ticked

## WO-S9.5 — Cutover + rollback runbook; Tamil floor-screen training notes (S, S9)
- **Objective:** Produce the cutover/rollback runbook and Tamil training notes for floor screens.
- **Refs:** 05 sec. 8 (failure and recovery rules); 09 sec. 1 (Tamil-first floors); 02 sec. 20 (mobile surfaces for floor staff). Inlined S9 exit rule: the cutover runbook is ready and dry-run on staging.
- **Owning docs:** 05, 09, 02
- **Preconditions:** WO-S9.1-S9.4 complete (green parallel month, perf budgets, security pass).
- **Implementation steps:**
  1. Write `runbooks/cutover.md`: freeze windows, final delta migration, sequence (masters -> open orders -> recompute balances -> Track backfill verify), smoke checklist (login, GRN, DC, scan, bill, river), go/no-go criteria, and rollback to legacy at each step.
  2. Write `runbooks/rollback.md` as a standalone inverse procedure with data-discard rules for new-only tables.
  3. Write Tamil training notes `runbooks/training-ta.md` for floor screens: scan station, `/m/scan`, `/m/track`, label printing - screen-by-screen, icon-first, zero jargon.
  4. Dry-run the cutover on staging once; record timings and gaps in the runbook appendix.
  5. Training validation: a floor user completes scan -> posting -> river lookup unaided on staging.
- **Acceptance criteria:**
  - AC1: [Reviewer sign-off] Given the staging dry-run, When executed end-to-end, Then every runbook step completes with recorded timing and zero undocumented actions.
  - AC2: Given rollback step R3 (post-balance-recompute), When invoked on staging, Then the system returns to the R2 checkpoint state exactly (checkpoint restore proof).
  - AC3: Given the Tamil notes, When a test floor user follows them, Then scan -> posting batch -> river lookup completes unaided within 10 minutes (recorded session).
  - AC4: Given the runbook, Then go/no-go criteria reference concrete artifacts (S9.2 report green, S9.3 perf report, S9.4 pass).
- **Test commands:** `npm test` (full suite green pre-cutover); `npm run lint`; `npm run build`
- **Out of scope:** actual production cutover execution, post-go support rota.
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] Runbooks + training notes committed under `runbooks/`
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S9.5 ticked

## WO-X1 — Keep 10-REVIEW-REPORT change log updated each pass (S, X)
- **Objective:** Maintain the 10-REVIEW-REPORT change log as the rolling audit of every review pass.
- **Refs:** 10-REVIEW-REPORT.md (change log section). Inlined rule: docs move with code in the same PR.
- **Owning docs:** 10
- **Preconditions:** Active (starts with the first S4 PR; recurs every pass).
- **Implementation steps:**
  1. After each review/verification pass (including any per-stage passes during S4-S9), append a dated entry to the change log in `10-REVIEW-REPORT.md`: scope, files read, findings count, corrections fed into which docs.
  2. Keep entry format identical to existing entries in that file.
  3. Cross-check that every "correction" claim has a matching edit in the owning doc (00-11) before closing the pass.
  4. Never delete prior entries; corrections to an entry get a follow-up line.
- **Acceptance criteria:**
  - AC1: Given a completed pass, When the PR closes, Then 10-REVIEW-REPORT.md contains a dated entry listing scope + findings + doc links.
  - AC2: Given an entry claims a correction to doc N, When checked, Then doc N contains that edit in the same PR (link assertion).
  - AC3: Given the file history, Then no prior entries were removed (append-only check).
- **Test commands:** `git log --oneline -- 10-REVIEW-REPORT.md`; `git diff HEAD~1 -- 10-REVIEW-REPORT.md`
- **Out of scope:** writing new review passes themselves (each owning WO does that), editing 11.
- **DoD checklist:**
  - [ ] AC1-AC3 verified for the pass
  - [ ] PROGRESS.md change-log line added; TASKS.md X1 box maintained
- **DoD checklist note:** X1 never fully "completes" - tick the box when the S9 cutover report entry lands.

## WO-X2 — Extract .mrt report parameters + registry entries (M, X)
- **Objective:** Build the per-report parameter extraction pipeline feeding a generated report registry.
- **Refs:** 07 sec. 1 (report catalog + .mrt parameter extraction policy). Inlined rule: extract per-report parameters from `.mrt` at implementation time; the registry is generated, not hand-typed.
- **Owning docs:** 07
- **Preconditions:** S0.2 legacy report folder inventory; report runner from S2.5.
- **Implementation steps:**
  1. Write `scripts/extract-mrt-params.ts`: parse each `.mrt` in the legacy reports folder, extracting parameter names, types, defaults, and dataset bindings.
  2. Emit `src/reports/mrt-registry.json` (one entry per report: id, legacy form, params, dataset hints) via a generate script `"reports:registry"` in package.json.
  3. Merge hand-curated metadata (screen mapping from 06/02) in `src/reports/registry.ts` consumers.
  4. Per-stage cadence: regenerate whenever a stage's reports are implemented (S4.10, S5.x, S6.x WOs consume entries).
  5. Diff mode: `npm run reports:registry -- --diff` lists new/changed parameters vs committed registry.
- **Acceptance criteria:**
  - AC1: Given the legacy .mrt folder, When the extractor runs, Then every report file yields a registry entry with >= 0 typed parameters (coverage count equals file count).
  - AC2: Given a report with 5 parameters (2 dates, 1 ordId, 2 flags), When extracted, Then types map to the zod param schema the report runner accepts.
  - AC3: Given `--diff` mode after a new .mrt is added, Then the diff lists exactly that report as new.
  - AC4: Given a WO (for example WO-S4.10) needing report ids, Then the ids resolve from the generated registry (no hand-typed ids in page code).
- **Test commands:** `npm run reports:registry`; `npm run reports:registry -- --diff`; `npm test -- tests/reports.registry.test.ts`
- **Out of scope:** porting report layouts (PrintLayout per-screen WOs), .mrt renderer.
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] Registry committed; consuming WOs reference it
  - [ ] `npm run lint` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md X2 ticked

## WO-X3 — Sign-off sheet for 11 sec. 3 defect deviations (S, X)
- **Objective:** Produce the business sign-off sheet recording each 11 sec. 3 legacy-defect deviation the rewrite intentionally makes.
- **Refs:** 11 sec. 3 (defect table, esp. #6 rejection counter), sec. 5 (parity policy: intended semantics + sign-off); TASKS X3.
- **Owning docs:** 11
- **Preconditions:** WOs that implement corrected behavior identified (WO-S4.6 for #4-#6, #8; WO-S5.6 for #1; Stage 3 projector WOs for #2, #3, #7 - link by ID).
- **Implementation steps:**
  1. Create `design/signoff/11-3-defect-signoff.md`: one row per 11 sec. 3 defect - legacy behavior (verbatim from 11), rewrite behavior (with owning WO id), user-visible difference, business impact, approver, date.
  2. For #6 (rejection counter): include the concrete counter semantics from WO-S4.6 AC3 as the to-be-approved behavior.
  3. Add a workflow note: WO-S4.6 (and any other WO citing a deviation) cannot CLOSE until its row is signed.
  4. Track unsigned rows weekly in PROGRESS.md until empty.
  5. On full sign-off, append a completion note to 11 sec. 3 referencing the sheet.
- **Acceptance criteria:**
  - AC1: Given the sheet, When reviewed, Then it contains one row per 11 sec. 3 defect (8 rows, #1-#8) each referencing the owning WO id.
  - AC2: Given WO-S4.6 closure, When checked, Then the #6 row carries approver + date (closure gate proof).
  - AC3: Given all rows signed, When the final entry lands, Then 11 sec. 3 has a completion note and PROGRESS.md records it.
- **Test commands:** `grep -c "^| " design/signoff/11-3-defect-signoff.md`; `git log --oneline -- design/signoff/11-3-defect-signoff.md`
- **Out of scope:** changing any implemented behavior (sheet records, not reopens), dead-code register items (11 sec. 4 - no sign-off needed).
- **DoD checklist:**
  - [ ] AC1-AC3 verified
  - [ ] Sheet committed at `design/signoff/11-3-defect-signoff.md`
  - [ ] PROGRESS.md change-log line added; TASKS.md X3 ticked

## WO-X4 — Golden transaction test suite growth (G1-G3 per doc type) (S, X)
- **Objective:** Maintain the golden transaction suite so every document type has G1 (atomicity), G2 (parity), and G3 (reversal) coverage as stages land.
- **Refs:** 03 sec. 3-sec. 4 (matrix as G2 oracle); TASKS X4. Inlined gate definitions: G1 = mid-failure atomicity (zero partial rows), G2 = legacy parity on golden fixtures, G3 = reversal restores exact prior state.
- **Owning docs:** 03
- **Preconditions:** Active from Stage 2 onward; this card governs its growth through S4-S9.
- **Implementation steps:**
  1. Keep `tests/golden/` organized per doc family: `grn.ts`, `dc.ts`, `po.ts`, `production.ts`, `pieces.ts`, `commercial.ts`, `tracking.ts`.
  2. Rule: every new document action WO adds its doc type to the family file in the SAME PR (enforced by a coverage test `tests/golden/coverage.test.ts` that asserts each MovementMatrix doc type has G1/G2/G3 cases registered).
  3. G1 case shape: mid-failure injection -> zero rows; G2: golden input -> expected ledger/balance rows (matrix-derived fixtures); G3: save then reverse -> exact prior state.
  4. Coverage report command `npm run golden:coverage` printing the per-type matrix.
  5. When WO-S9.2 finds a parity gap, the fix PR updates the affected golden fixture in the same change.
- **Acceptance criteria:**
  - AC1: Given the coverage test, When a new doc type posts without golden cases, Then `tests/golden/coverage.test.ts` fails naming the missing type.
  - AC2: Given every implemented doc type, When `npm run golden:coverage` runs, Then the printed matrix shows G1/G2/G3 = yes for each (S9 exit evidence).
  - AC3: Given a full `npm test` run, Then all golden cases pass without ordering dependencies (run twice, same result).
- **Test commands:** `npm run golden:coverage`; `npm test -- tests/golden/`; `npm test -- tests/golden/coverage.test.ts`
- **Out of scope:** perf tests (WO-S9.3), eval sets (WO-S8.10), parallel-run tooling (WO-S6.7/S9.2).
- **DoD checklist:**
  - [ ] AC1-AC3 verified
  - [ ] Coverage matrix green for all implemented doc types
  - [ ] `npm run lint` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md X4 box maintained
- **DoD checklist note:** X4 closes when the S9.2 parallel month cites a fully green golden matrix.

---
Stage exit reminders (rules inlined): S6 exits on the parallel-run comparison pack green (WO-S6.7). S7 exits per phase: P1 labels + read-only river, P2 backfill (WO-S7.9), P3 native events + reconciliation exceptions + value columns live (WO-S7.3/S7.4/S7.5). S8 exits risk-ascending: read-only -> bill/GRN parse with review -> order-sheet parsing only when the WO-S8.10 gate passes -> voice drafting -> triage; all skill flags default OFF. S9 exits on: parallel month green (WO-S9.2), perf budgets met (WO-S9.3), security pass (WO-S9.4), cutover runbook ready (WO-S9.5).
