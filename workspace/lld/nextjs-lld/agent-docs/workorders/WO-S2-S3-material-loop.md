# WO-S2-S3 — Material-Loop Work Orders (Stages 2 + 3)

Executable task cards for the worker model. One card per TASKS.md item, same IDs.
Read the Refs sections in `nextjs-lld/` BEFORE writing code. Legacy column/proc names must be
confirmed against `nextjs-lld/design/db-extract/` (DDL snapshot + proc bodies); mismatches go to
`nextjs-lld/PROGRESS.md` sec. 5 (never silently guess).

Shell: Git Bash (Windows). Doc numbers: 00-OVERVIEW 01-ARCHITECTURE 02-COMPONENT-TREE 03-DOMAIN-POSTING-ENGINE 04-API-SERVICES 05-EVENTS-SYNC-NOTIFICATIONS 06-SCREEN-MAP 07-REPORTS-FLAGS 08-QR-TRACKING 09-AI-HARNESS 10-REVIEW-REPORT 11-PROC-VERIFICATION (all in nextjs-lld/).

Conventions (same as WO-S0-S1):
- App root `joms-web/`; every path below is relative to it unless it starts with `nextjs-lld/`.
- Test runner vitest (`npm test -- <file>`); integration tests use the dev DB via `.env.local`.
- Every document save follows the 03 sec. 3 flow and the 04 sec. 14 template: guard -> numbering ->
  insert -> MovementMatrix -> PostingEngine.apply -> projectors.scheduleAll -> outbox -> commit,
  all inside ONE `db.withTx` transaction.
- Gates: G1 mid-failure atomicity, G2 parity vs extracted legacy semantics, G3 compensating
  reversal, G4 docs sync, G5 rights/flags.

Work order list: WO-S2.1..WO-S2.7, WO-S3.1..WO-S3.10 (17 cards).
Stage 2 exit demo (all of S2 done): fabric Process GRN saved in one transaction posts
CurrentStock as dyed identity, projector + sync flags fire, stock register shows it, GRN prints,
reversal restores state (S2 exit rule inlined: the fabric Process GRN cycle must prove
save -> post -> projector -> register -> print -> reversal end to end).

---

## WO-S2.1 — PostingEngine v1, FABRIC ledger, Sp_currentstock parity (L, S2)
- **Objective:** Implement the PostingEngine FABRIC-leg writer reproducing the extracted `Sp_currentstock` semantics exactly, with G2 parity tests against the live body captured in S0.2.
- **Refs:** 03 sec. 2 (types), sec. 3 (engine + save flow + RollDtl rules); `nextjs-lld/design/db-extract/procs/Sp_currentstock.md` and `Sp_currentstock_RollDtl.md` (the parity source); 11 sec. 2.9 + sec. 6.1 (why the body must be extracted); 01 sec. 2 golden rules (engine is the only writer of CurrentStock).
- **Owning docs:** 03, 11, 01
- **Preconditions:** WO-S0.2 done (blocker B1 cleared — extracted bodies exist); WO-S1.6 done (`src/posting/types.ts`).
- **Implementation steps:**
  1. Read both extracted proc bodies line by line; write `joms-web/src/posting/fabric-writer.ts` implementing the upsert 1:1: per `(OrdId, StockId, GodID)` adjust Bg/Kg/Mt; insert the row when missing; roll variant forces `@Rls=1`; a '-' against a missing roll row INSERTS a negative roll row; `@delflg='N'` subtracts, any other value DELETEs the roll row; dept-11 special cases reproduced. Every rule gets a code comment citing the proc line numbers from the extract.
  2. Create `joms-web/src/posting/posting-engine.ts`: `apply(tx, docRef, movements)` — validates each Movement (03 sec. 2), groups by `ledger`, delegates FABRIC movements to fabric-writer, throws `AppError('NOT_IMPLEMENTED', 500)` for PANEL/PCS (Stage 4), and returns `PostingResult { rowsAffected, warnings }`; a movement driving a 'G'-bucket balance negative pushes a warning and does NOT throw (03 sec. 3 warn-not-block).
  3. Create `joms-web/src/db/repo/current-stock.ts`: the only module issuing CurrentStock SQL — `selectForKey(tx, key)`, `upsert(tx, key, deltas)`, `insertRoll/adjustRoll/deleteRoll(tx, ...)`; parameterized statements only.
  4. Create `joms-web/src/lib/log.ts` (`logDocAction(docRef, action, detail)`) and call it from `apply` — structured log replaces legacy `print 'a1'` (01 sec. 3.7). No legacy-table audit columns are added.
  5. Create `joms-web/tests/fixtures/currentstock.cases.json`: >= 6 hand-computed cases transcribed from the extracted logic: (1) fresh-key insert, (2) add to existing, (3) subtract within balance, (4) overdraw on 'G' (negative kept + warning), (5) roll '-' on missing roll (negative insert), (6) roll delete mode (`@delflg<>'N'`).
  6. Create `joms-web/tests/posting.fabric.test.ts` (integration): for each fixture case, snapshot the key before, `apply` the movement inside `withTx`, and assert the CurrentStock row equals the expected fixture values (G2).
- **Acceptance criteria:**
  - AC1: Given no CurrentStock row for the key, When `apply(+kgs,+mtr,+rls)`, Then exactly one row is inserted and its Bg/Kg/Mt equal fixture case 1 values.
  - AC2: Given an existing row, When `apply(-kgs)` within balance, Then the row is updated in place (no second row) with the decremented Kg.
  - AC3: Given a 'G'-bucket movement overdrawing the balance, When `apply` runs, Then the row goes negative, `PostingResult.warnings.length === 1`, and no exception is thrown.
  - AC4: Given a roll movement with '-' on a missing roll, When the roll variant runs, Then a negative roll row is inserted (case 5); with delete mode the existing roll row is removed (case 6).
  - AC5: G2 — `npm test -- tests/posting.fabric.test.ts` passes all fixture cases (>= 6) against the dev DB.
- **Test commands:**
  - `cd /c/Users/mahes/Documents/Projects/Fiber/Fiberpro/joms-web && npm test -- tests/posting.fabric.test.ts`
- **Out of scope:** PANEL/PCS ledgers (Stage 4), projectors (WO-S2.2), quantity-law/tracking hooks (08, S7.3), MovementMatrix builders (WO-S2.3).
- **DoD checklist:**
  - [ ] AC1-AC5 verified (G2 parity green)
  - [ ] fabric-writer comments cite extracted proc line numbers
  - [ ] `npm run lint` and `npm run build` pass
  - [ ] If extracted semantics differed from 03 sec. 3 prose, 03 updated in same PR (G4)
  - [ ] TASKS.md S2.1 box ticked + PROGRESS.md change-log line added

---

## WO-S2.2 — Outbox + ProjectorRunner + ProgBalanceFabricProjector (M, S2)
- **Objective:** Build the transactional outbox and in-order ProjectorRunner, and implement ProgBalanceFabricProjector rebuilding `ST_ProgBalance_Fabric` from SUM of documents with all trigger guards, stamping UpdateFlg.
- **Refs:** 03 sec. 5 (projector table + guards incl. dept-8-or-grp color, dept-10 design, ReProcess bucket, RTC equalize); 05 sec. 1 (outbox envelope + grn/dc events), sec. 2 (rebuild-from-SUM rule, UpdateFlg stamps); 11 sec. 3 #2-#3 (RCUT defects fixed by design), sec. 5 (guard notes).
- **Owning docs:** 03, 05, 11
- **Preconditions:** WO-S2.1 done.
- **Implementation steps:**
  1. Create `joms-web/migrations/0006_event_outbox.sql`: `EventOutbox (Id BIGINT IDENTITY PRIMARY KEY, Type NVARCHAR(100) NOT NULL, Coy NVARCHAR(20) NOT NULL, PayloadJson NVARCHAR(MAX) NOT NULL, OccurredAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(), ProcessedAt DATETIME2 NULL)`; run `npm run migrate`.
  2. Create `joms-web/src/events/outbox.ts`: `emit(tx, type, payload)` inserts one row inside the caller's transaction (never after commit — same-tx guarantee, 05 sec. 1).
  3. Create `joms-web/src/projectors/runner.ts`: `ProjectorWorker.drain()` selects unprocessed EventOutbox rows in Id order, groups by aggregate key, invokes the projector registry (`src/projectors/index.ts`), marks `ProcessedAt`; `scheduleAll(tx, keys)` emits a `projector.dirty` event carrying the affected StockKeys (used by services per 04 sec. 14).
  4. Create `joms-web/src/projectors/sync-flag.ts`: `stampSyncFlag(tx, table, keyWhere)` — single home for `UPDATE <table> SET UpdateFlg=1` (consumed by WO-S2.7).
  5. Create `joms-web/src/projectors/prog-balance-fabric.ts`: rebuild `ST_ProgBalance_Fabric` buckets from SUM of Trs_Grn2/Trs_Del2/Trs_Del3 rows for affected fab-fingerprint keys (05 sec. 2 rebuild rule); guards: color dimension set when dept = 8 OR DeptGrpCode = 8; design dimension when dept = 10; `ProgFrm_Issue` / dept-11 gate on the affected leg; ProcessType 'R' rows accumulate the ReProcess bucket only; RTC equalize (GRN side := DC side); do NOT port 11 sec. 3 #2 (assign-instead-of-subtract) or #3 (hardcoded DeptId=-7) — SUM recompute fixes both; stamp UpdateFlg on written rows.
  6. Create `joms-web/tests/prog-balance-fabric.test.ts`: seed DC/GRN/RTC/return rows directly via repo inserts; run the projector; assert bucket sums vs hand-computed fixtures for: plain process GRN, reprocess R DC (fresh bucket untouched), dept-8 and DeptGrpCode=8 color guard (both cases), RTC pass + GRN equalize, UpdateFlg stamped.
- **Acceptance criteria:**
  - AC1: Given one process DC and one GRN fixture on a key, When the projector runs, Then `ST_ProgBalance_Fabric.DcKgs`/`GrnKgs` equal the SUM of the seeded documents exactly.
  - AC2: Given ProcessType='R' DC rows, When the projector runs, Then `ReProcessDCKgs` increases and the fresh DcKgs bucket is unchanged.
  - AC3: Given rows with dept=8 and rows with DeptGrpCode=8, When the projector runs, Then the DyeCol dimension is populated in BOTH cases (guard is OR).
  - AC4: Given an RTC pass and its GRN, When the projector runs, Then the program balance GRN column equals the DC column (equalize rule).
  - AC5: Given any projector write, Then affected `ST_ProgBalance_Fabric` rows have `UpdateFlg=1` (SELECT confirms) and the outbox event that triggered it is marked ProcessedAt.
- **Test commands:**
  - `cd /c/Users/mahes/Documents/Projects/Fiber/Fiberpro/joms-web && npm run migrate && npm test -- tests/prog-balance-fabric.test.ts`
- **Out of scope:** yarn projector (WO-S3.2), other projectors (03 sec. 5 rows), TraceProjector (S7), worker process scheduling (drain is called inline after commit for now).
- **DoD checklist:**
  - [ ] AC1-AC5 verified (G2 on guard conditions)
  - [ ] 11 sec. 3 #2/#3 regression cases in the test file (cite in comments)
  - [ ] `npm run lint` and `npm run build` pass
  - [ ] TASKS.md S2.2 box ticked + PROGRESS.md change-log line added

---

## WO-S2.3 — GrnService + GrnWizard UI + zod DTO (Process GRN vertical slice) (L, S2)
- **Objective:** Deliver the fabric Process-GRN vertical slice end to end: zod DTO, GrnService transaction per the 04 sec. 14 template, MovementMatrix GRN legs, API routes, and the GrnWizard UI with roll grid and tolerance banner.
- **Refs:** 04 sec. 5 (GRN endpoints) and sec. 14 (exact service template); 02 sec. 6 (`grn/new` GrnWizard panels); 03 sec. 3 (document save flow), sec. 4.1 (Process GRN row: CurrentStock + as NEW identity DyeColId/FinGsm/FinDiaID), sec. 6 (grn tolerance flags); 07 Part 2 (grn_bal/grn_dev/grn_alladd, roll flags).
- **Owning docs:** 03, 04, 02
- **Preconditions:** WO-S2.1, WO-S2.2, WO-S1.5, WO-S1.6 done.
- **Implementation steps:**
  1. Create `joms-web/src/lib/dto/grn.ts`: zod `GrnCreateDto` = `{ grnType: enum('Purchase','Process','Process Return','DirectReceipt'), partyId, ourDcid (0 allowed), lines: [{ordId, stockId, godId, recKgs, recMtr, rBag, rls, dyeColId?, finGsm?, finDiaId?, rollDtl?: [{rollNo, kgs, mtr}]}] }` — only `'Process'` is wired in this WO; the enum reserves the others.
  2. Create `joms-web/src/db/repo/grn.ts`: `insert(tx, docNo, dto)` writing `Trs_Grn1` header + `Trs_Grn2` lines (+ roll detail rows into the roll table found in the DDL snapshot); `getById(id)` typed read; all parameterized.
  3. Create `joms-web/src/posting/movement-matrix.ts`: `MovementMatrix.grn(dto)` — Process leg: one `+` Movement per line keyed by the NEW identity (dyed `dyeColId/finGsm/finDiaId` on the StockTable identity), per 03 sec. 4.1; expose `keys(movements)` for projector scheduling.
  4. Create `joms-web/src/services/grn.service.ts` following 04 sec. 14 exactly: `requireCan(ctx,'grn.create')`; flags read for `grn_bal/grn_dev/grn_alladd` tolerance check -> throw `AppError('GRN_BAL_DEV', 400)` with the MESSAGES string when deviation exceeds and allow-add is off; `numbering.take('GRN', ctx)`; repo insert; matrix; `posting.apply`; `projectors.scheduleAll`; `outbox.emit(tx,'grn.created',{id,...})`; return `{doc, post}`.
  5. Create routes: `joms-web/src/app/api/grn/route.ts` (POST -> 201 `{id, docNo, posting}`; zod failure -> 400 with fields) and `joms-web/src/app/api/grn/picker/route.ts` (GET `?ordId&godId` -> GrnService.picker(), the FabDeliverySP inverse union).
  6. Create UI: `joms-web/src/app/(erp)/grn/new/page.tsx` [C] + `joms-web/src/components/grn/GrnWizard.tsx` composed of `TypePanel.tsx` (GrnType select), `PartyDcRefPanel.tsx` (PartyPicker + OurDCID; =0 shows the prev-GRN-as-DC hint when flag `ismultipleprocessgrn_required`), `FabricIdentityPanel.tsx` (grey vs finished: ShadePicker for DyeColId, FinGsm Input, GodownPicker/fin-dia picker — new-identity preview label), `LinesGrid` config of LineGrid (RecKgs/Recmtr/RBag/Rls + roll child grid rows when `rollno_module_reqd`/`all_transaction_basedon_rollno` on), `ToleranceBanner` (grn flags), `AcceptPanel.tsx` (summary + save via useMutation POST; renders PostingPreview from the 201 body).
  7. Create `joms-web/src/app/(erp)/grn/[id]/page.tsx` [S]: header card, lines table, posting result, ReversalButton (disabled until WO-S2.4), print link placeholder.
  8. Create `joms-web/tests/grn.posting.test.ts` (integration): happy path asserts Trs_Grn1 count 1 + Trs_Grn2 count N, new CurrentStock identity row with Kg = SUM(recKgs), projector-updated `ST_ProgBalance_Fabric.GrnKgs`, outbox row `grn.created`; tolerance block case (deviation beyond `grn_dev` with `grn_alladd=0` -> 400 `GRN_BAL_DEV` and zero rows written); roll-detail case (roll rows count per line); G1 case — a test hook (`src/services/grn.service.ts` option `failAfterPosting`) throws inside the tx after `posting.apply`, and the test asserts zero Trs rows, unchanged CurrentStock, and no outbox row.
- **Acceptance criteria:**
  - AC1: Given a valid Process GRN dto (2 lines), When `POST /api/grn`, Then 201 with docNo, exactly 1 `Trs_Grn1` + 2 `Trs_Grn2` rows, and one new CurrentStock row on the dyed identity with Kg = SUM(recKgs).
  - AC2: Given tolerance deviation beyond `grn_dev` with `grn_alladd=0`, When POST, Then 400 `{code:'GRN_BAL_DEV'}` and `SELECT COUNT(*) FROM Trs_Grn1` is unchanged.
  - AC3: Given a successful save, When `ST_ProgBalance_Fabric` is read for the key, Then `GrnKgs` increased by SUM(recKgs) (projector ran) and `UpdateFlg=1`.
  - AC4: Given `rollno_module_reqd=1` and 3 roll rows on line 1, When saved, Then 3 roll detail rows exist for that line.
  - AC5: G1 — with `failAfterPosting`, the transaction rolls back fully: 0 Trs_Grn rows, CurrentStock unchanged, 0 EventOutbox rows.
- **Test commands:**
  - `cd /c/Users/mahes/Documents/Projects/Fiber/Fiberpro/joms-web && npm test -- tests/grn.posting.test.ts`
  - `curl -s -X POST http://localhost:3000/api/grn -H "Content-Type: application/json" -b cookies.txt -d '{"grnType":"Process","partyId":5,"ourDcid":12,"lines":[{"ordId":1,"stockId":9,"godId":1,"recKgs":100,"recMtr":0,"rBag":0,"rls":0,"dyeColId":7,"finGsm":180}]}'`
- **Out of scope:** reversal (WO-S2.4), 'Purchase'/'Process Return'/'DirectReceipt' legs (S3.4/S3.5), multi-process GRN (Trs_MultiPrs_*), lot lifecycle (WO-S3.8).
- **DoD checklist:**
  - [ ] AC1-AC5 verified (G1 green)
  - [ ] Service matches 04 sec. 14 template line-for-line (reviewer check)
  - [ ] `npm run lint` and `npm run build` pass
  - [ ] TASKS.md S2.3 box ticked + PROGRESS.md change-log line added

---

## WO-S2.4 — GRN reversal (compensating) + G1/G3 tests (M, S2)
- **Objective:** Implement GRN reversal as a compensating posting in one transaction, wire the ReversalButton, and prove G1 (mid-failure atomicity) and G3 (exact state restoration).
- **Refs:** 03 sec. 3 ("Delete/reversal: rebuild the same MovementSet with inverted signs + re-run"); 04 sec. 5 (`DELETE /api/grn/:id`); 02 sec. 6 (`[id]` card with reversal action); 05 sec. 1 (`grn.reversed` event), sec. 8. Inlined gate definitions: G1 = a failure after the first write leaves zero partial rows; G3 = reversal restores the exact pre-document state.
- **Owning docs:** 03, 04, 05
- **Preconditions:** WO-S2.3 done.
- **Implementation steps:**
  1. Check the DDL snapshot for an existing cancel/reversal column on `Trs_Grn1`; if present use it; otherwise create `joms-web/migrations/0007_grn_reversal.sql` with additive `GrnReversal (GrnId INT PRIMARY KEY, ReversedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(), UserId NVARCHAR(50) NOT NULL, Reason NVARCHAR(200))` and run `npm run migrate`.
  2. Extend `joms-web/src/services/grn.service.ts` with `reverse(ctx, id)`: load header+lines, rebuild the MovementSet via `MovementMatrix.grn` with inverted signs, then in ONE tx: mark reversed (column or side-table; double reversal -> `AppError('ALREADY_REVERSED', 409)`), `posting.apply` compensating, `projectors.scheduleAll`, `outbox.emit(tx,'grn.reversed',{id})`, return `{id, posting}`.
  3. Create `joms-web/src/app/api/grn/[id]/route.ts`: DELETE -> `requireCan(ctx,'grn.reverse')` -> 200 `{id, posting}`; 404 unknown id; 409 already reversed.
  4. Wire `joms-web/src/components/document/ReversalButton.tsx` on the GRN card (`src/app/(erp)/grn/[id]/page.tsx`): confirm modal showing the inverted PostingPreview, then `useMutation` DELETE.
  5. Create `joms-web/tests/helpers/db-snap.ts`: `snapCurrentStock(keyWhere)`, `snapTable(table, where)` returning sorted JSON snapshots for exact-compare.
  6. Create `joms-web/tests/grn.reversal.test.ts`: G3 — create GRN, snapshot (Trs_Grn1/2, CurrentStock key, ST_ProgBalance_Fabric row, EventOutbox count), reverse, assert every snapshot equals the pre-GRN state (projector rebuilt the ST row); G1 — inject a throw after `posting.apply` inside `reverse` (test hook `failAfterPosting`), assert zero net changes; rights — user without `grn.reverse` gets 403.
- **Acceptance criteria:**
  - AC1: Given a saved GRN, When `DELETE /api/grn/:id`, Then 200 and the CurrentStock row equals its pre-GRN snapshot exactly (G3).
  - AC2: Given the reversal failing after posting (hook), Then all tables unchanged: Trs rows, CurrentStock, EventOutbox count (G1).
  - AC3: Given a reversed GRN, When DELETE again, Then 409 `{code:'ALREADY_REVERSED'}`.
  - AC4: Given reversal succeeded, When reading `ST_ProgBalance_Fabric`, Then the row equals the pre-GRN snapshot (SUM recompute) and a `grn.reversed` outbox row exists.
  - AC5: Given a user without `grn.reverse`, When DELETE, Then 403 `{code:'FORBIDDEN'}` and no DB change.
- **Test commands:**
  - `cd /c/Users/mahes/Documents/Projects/Fiber/Fiberpro/joms-web && npm test -- tests/grn.reversal.test.ts`
  - `curl -s -X DELETE http://localhost:3000/api/grn/123 -b cookies.txt`
- **Out of scope:** other document types' reversal (each S3 WO does its own), audit UI screens, admin data-delete tool.
- **DoD checklist:**
  - [ ] AC1-AC5 verified (G1 + G3 green)
  - [ ] db-snap helper reusable by later WOs
  - [ ] `npm run lint` and `npm run build` pass
  - [ ] TASKS.md S2.4 box ticked + PROGRESS.md change-log line added

---

## WO-S2.5 — Report job runner (jobId staging) + stock register page (M, S2)
- **Objective:** Build the generic report-job lifecycle (run -> jobId -> staged rows -> paged fetch -> expiry) and the first register on it: the stock register reading Vue_StkLedger semantics.
- **Refs:** 05 sec. 7 (job lifecycle replacing Temp_*/IP staging); 04 sec. 10 (`POST /api/reports/:id/run`, `GET /api/reports/jobs/:jobId`); 02 sec. 8 (`stock/registers` page + StockRegisterTable); 07 sec. 1.2 (StkLedger family); 01 sec. 3.5 (multi-user staging rationale).
- **Owning docs:** 05, 04, 02
- **Preconditions:** WO-S0.3 (migration 0001 ReportJob/ReportJobRows applied); WO-S2.3 (GRN data exists to report on).
- **Implementation steps:**
  1. Create `joms-web/src/db/repo/report-jobs.ts`: `createJob(reportId, params)`, `stageRows(jobId, rows[])` (Slno + ColsJson), `setStatus(jobId, status)`, `fetchPage(jobId, page, pageSize)`, `purgeExpired()` (deletes jobs with `ExpiresAt < SYSUTCDATETIME()` and their rows).
  2. Create `joms-web/src/services/report.service.ts`: `run(reportId, params, ctx)` -> create job (Status RUNNING, ExpiresAt = now + 24h), execute the registered dataset builder, stage rows, set DONE (or FAILED with the error message stored in Status), call `purgeExpired()` opportunistically; `result(jobId, page)` -> `{status, rows, totals}`; missing job -> `AppError('NOT_FOUND', 404)`; expired -> `AppError('GONE', 410)`.
  3. Create `joms-web/src/reports/registry.ts`: entry `stock-register` with param schema `{ordId?, godId?, itemId?, fromDate, toDate}` and a dataset function implementing Vue_StkLedger semantics as typed SQL over `Trs_Grn2` + `Trs_Del2` + `CurrentStock`: opening = SUM of movements before fromDate; period rows labeled by doc type; running balance computed while staging; totals row = closing.
  4. Create routes: `joms-web/src/app/api/reports/[id]/run/route.ts` (POST -> 202 `{jobId}`) and `joms-web/src/app/api/reports/jobs/[jobId]/route.ts` (GET -> `{status, rows, totals}` with `?page=&pageSize=`).
  5. Create `joms-web/src/app/(erp)/stock/registers/page.tsx` [S] + `joms-web/src/components/stock/StockRegisterTable.tsx` [C]: filter form (OrderPicker, GodownPicker, two DatePicker), Run button -> jobId -> poll result -> DataTable with columns Date/Doc/Type/In/Out/Balance and footer totals; drill link on rows to `/grn/[id]` or `/dc/[id]`.
  6. Create `joms-web/tests/report-job.test.ts`: seeded GRN + DC within the window -> run returns jobId, result rows match a hand-computed fixture (opening, one in-row, one out-row, closing balance); two concurrent jobs keep rows isolated (no cross-job leakage); paged fetch honors pageSize; a job with ExpiresAt forced into the past -> 410 and its rows are deleted.
- **Acceptance criteria:**
  - AC1: Given seeded documents, When `POST /api/reports/stock-register/run`, Then 202 `{jobId}` and `GET /api/reports/jobs/<jobId>` returns `status:'DONE'` with the fixture rows and correct running balance column.
  - AC2: Given two jobs started for different filters, When both results are fetched, Then each contains only its own rows (JobId isolation).
  - AC3: Given a job with `ExpiresAt` in the past, When fetched, Then 410 `{code:'GONE'}` and `SELECT COUNT(*) FROM ReportJobRows WHERE JobId=...` is 0.
  - AC4: Given the register page (component test with mocked fetch), When the job completes, Then StockRegisterTable renders the fixture rows and the closing-balance footer.
- **Test commands:**
  - `cd /c/Users/mahes/Documents/Projects/Fiber/Fiberpro/joms-web && npm test -- tests/report-job.test.ts`
  - `curl -s -X POST http://localhost:3000/api/reports/stock-register/run -H "Content-Type: application/json" -b cookies.txt -d '{"fromDate":"2026-04-01","toDate":"2026-04-30"}'`
- **Out of scope:** print/PDF from jobs (WO-S2.6), other register variants (WO-S3.7), Excel export, per-user default params.
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] Temp_* tables untouched (no IP-keyed staging introduced)
  - [ ] `npm run lint` and `npm run build` pass
  - [ ] TASKS.md S2.5 box ticked + PROGRESS.md change-log line added

---

## WO-S2.6 — PrintLayout + preprint overlay port + GRN print (S, S2)
- **Objective:** Port the print engine shell with the PrePrint/298 overlay geometry and produce the GRN document print off the viewer route.
- **Refs:** 07 sec. 1.1 (GRN family + preprint overlay), Part 2 (`preprintfolder` 72/298, `dc_fullpage`, `formatno`); 01 sec. 1 (print row: print-optimized pages + preprint port), sec. 5 (print stations); 05 sec. 7 (print from staged viewer).
- **Owning docs:** 07, 01, 05
- **Preconditions:** WO-S2.3 done (a saved GRN to print); legacy `PrePrint/298` template readable from the legacy report folder (read-only).
- **Implementation steps:**
  1. Create `joms-web/src/components/reports/PrintLayout.tsx`: A4 print shell — company header block, doc header (doc no/date/party), body slot, footer (page x of y); add `@media print` rules to `src/app/globals.css` (hide app chrome, exact page size, margins 0).
  2. Create `joms-web/src/reports/preprint-298.ts`: exported constants `OVERLAY_298` and `OVERLAY_72`: arrays of `{field, x, y, w, h}` (mm) transcribed from the legacy PrePrint/298 GRN layout and its 72 variant; plus `overlayFor(preprintfolderFlag)` selector.
  3. Create `joms-web/src/components/reports/PreprintOverlay.tsx`: absolutely-positioned frames from a constant set; each frame renders its bound field value (mm -> CSS mm units).
  4. Create `joms-web/src/db/repo/prints.ts`: `grnPrintData(docId)` joining `Trs_Grn1`/`Trs_Grn2` + party + item name tables into a flat field map `{docNo, docDate, partyName, lines[], totalKgs, totalMtr}`.
  5. Create `joms-web/src/app/reports/viewer/[printId]/page.tsx` [S]: for `printId === 'grn'` with `?docId=`, render PrintLayout + PreprintOverlay + GRN field map; a Print button (client child `PrintButton.tsx` calling `window.print()`); unknown printId -> 404.
  6. Add the "Print GRN" link to `joms-web/src/app/(erp)/grn/[id]/page.tsx` pointing at `/reports/viewer/grn?docId=<id>`.
  7. Create `joms-web/tests/grn-print.test.ts`: dataset builder returns the expected field map for a seeded GRN (docNo, partyName, line count, totals); `overlayFor('298')` returns `OVERLAY_298` and `overlayFor('72')` returns `OVERLAY_72`; PrintLayout renders every mapped field value inside a frame (component test counts `.print-frame` nodes).
- **Acceptance criteria:**
  - AC1: Given a seeded GRN, When GET `/reports/viewer/grn?docId=<id>` with session, Then 200 HTML containing the docNo and partyName strings.
  - AC2: Given the rendered page, Then the number of `.print-frame` elements equals `OVERLAY_298.length` and each bound field shows its value.
  - AC3: Given flag `preprintfolder='72'`, When the viewer renders, Then the overlay frames come from `OVERLAY_72` (selector unit test).
  - AC4: Given a GRN with 0 lines (edge), When the viewer renders, Then 200 with the lines block omitted and no server error.
- **Test commands:**
  - `cd /c/Users/mahes/Documents/Projects/Fiber/Fiberpro/joms-web && npm test -- tests/grn-print.test.ts`
  - `curl -s "http://localhost:3000/reports/viewer/grn?docId=123" -b cookies.txt | grep -o "\"docNo\":\"[A-Z0-9/-]*\""`
- **Out of scope:** PDF generation, other print families (07 sec. 1.1 rest), barcode labels, Tamil work-nature print flag.
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] Overlay constants reviewed against the legacy PrePrint/298 file (cite source file in comment)
  - [ ] `npm run lint` and `npm run build` pass
  - [ ] TASKS.md S2.6 box ticked + PROGRESS.md change-log line added

---

## WO-S2.7 — Sync-flag stamps + /api/sync/pull|ack skeleton (S, S2)
- **Objective:** Expose the Commando sync protocol skeleton — UpdateFlg pull with cursor and ack clearing — over the flags the projectors already stamp.
- **Refs:** 05 sec. 3 (pull/ack protocol, server_id), sec. 2 (UpdateFlg stamps); 04 sec. 11 (sync endpoints); 03 sec. 5 (SyncFlagProjector row).
- **Owning docs:** 05, 04, 03
- **Preconditions:** WO-S2.2 done (projectors stamp UpdateFlg via `src/projectors/sync-flag.ts`).
- **Implementation steps:**
  1. Create `joms-web/src/services/sync.service.ts`: `pull(cursor)` -> for tables `ST_ProgBalance_Yarn`, `ST_ProgBalance_Fabric`, `ST_Ord_inHand`: return rows with `UpdateFlg=1` AND `server_id > cursor` (or all dirty rows when cursor=0) plus the new max server_id as the cursor; `ack({table, keys, serverId})` -> `UPDATE <table> SET UpdateFlg=0, server_id=<serverId> WHERE <key IN keys>`; unknown table -> `AppError('SYNC_TABLE_UNKNOWN', 400)`.
  2. Create `joms-web/src/app/api/sync/pull/route.ts` (GET `?since=`, session required, response `{version:1, cursor, tables:{<name>:{rows:[]}}}`) and `joms-web/src/app/api/sync/ack/route.ts` (POST `{table, keys, serverId}` -> 200 `{cleared: n}`).
  3. Keep `src/projectors/sync-flag.ts` as the only stamper; extend it to also set `server_id = <new max+1>` per table when stamping so pull ordering is stable (confirm the `server_id` column exists in the DDL snapshot; if the legacy column is named differently, adapt and note in PROGRESS sec. 5).
  4. Create `joms-web/tests/sync.test.ts`: run the fabric projector over seeded docs -> rows have UpdateFlg=1 and server_id set; pull returns them with a cursor; ack clears (UpdateFlg=0, server_id preserved); second pull returns empty arrays; unknown table ack -> 400; no session -> 401.
- **Acceptance criteria:**
  - AC1: Given projector-stamped rows, When `GET /api/sync/pull?since=0`, Then 200 with those rows under their table key and a non-zero `cursor`.
  - AC2: Given `POST /api/sync/ack` for those keys, Then 200 `{cleared:n}` and the rows have `UpdateFlg=0` (SELECT confirms).
  - AC3: Given a completed ack, When pull runs again with the returned cursor, Then every table's `rows` array is empty.
  - AC4: Given no session cookie, When GET pull or POST ack, Then 401.
- **Test commands:**
  - `cd /c/Users/mahes/Documents/Projects/Fiber/Fiberpro/joms-web && npm test -- tests/sync.test.ts`
  - `curl -s "http://localhost:3000/api/sync/pull?since=0" -b cookies.txt`
- **Out of scope:** mobile push/replay queue (S4.7), Track* table sync (S7), conflict resolution beyond "desktop wins" (already the documented rule).
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] Stage 2 exit demo passes end to end (GRN -> stock -> sync) and is recorded in PROGRESS sec. 6
  - [ ] `npm run lint` and `npm run build` pass
  - [ ] TASKS.md S2.7 box ticked + PROGRESS.md change-log line added

---

## WO-S3.1 — DcService fabric/gen (all TrType rows) + DcWizard UI (L, S3)
- **Objective:** Implement the fabric/general DC family — every TrType leg of 03 sec. 4.1, Del3 knitting pre-program, RateConfirmGuard, GST/e-way panel — through DcService, MovementMatrix DC legs, and the DcWizard UI.
- **Refs:** 03 sec. 4.1 (all `Trs_Del1/2/3` rows — process/reprocess/sales/return/transfer/godown/unit/ready-to-cut/job-order), sec. 6 (i_scheck/i_sdev, trankgs_dev, rate-confirm flags); 04 sec. 6 (`POST /api/dc/fabric`, `GET /api/dc/stock-picker`); 02 sec. 7 (DcWizard panel list); 07 Part 2 sec. 2.1 tolerance sub-tables (rateconfirmcheck(+dev), trankgs_dev, i_scheck/i_sdev; knitprgdc and gstenable live in the Part 2 module-switch rows).
- **Owning docs:** 03, 04, 02
- **Preconditions:** WO-S2.1, WO-S2.2, WO-S1.5, WO-S1.6 done; if the drift report (design/db-extract/catalog/drift-report.md) flags FrmGenDC-related procs as db-newer, re-extract them into `design/db-extract/procs/` before coding (11 sec. 6.3).
- **Implementation steps:**
  1. Create `joms-web/src/lib/dto/dc.ts`: zod `DcCreateDto` = `{ trType: 1|2|3|4|6|13|14|17|20|21, processType: 'P'|'R'|'S', partyId, deptId?, dyeColId?, designId?, gst?: {hsnPct?, cgst?, sgst?, igst?, ewayNo?, ewayDate?}, lines: [{ordId, stockId, godId, kgs, mtr, rls, frmStockId?}], del3Lines?: [{progId, kgs}] }`; flag-driven checks: `i_scheck/i_sdev` issue-shortage, `trankgs_dev` transfer deviation.
  2. Create `joms-web/src/db/repo/dc.ts`: `insert(tx, docNo, dto)` writing `Trs_Del1` + `Trs_Del2` lines, `Trs_Del3` rows when `knitprgdc=1` and del3Lines present, and `Trs_Del4` GST/e-way override rows when the gst block is present; `getById(id)` with ack status (Arl/AKg/AMtr sums).
  3. Extend `joms-web/src/posting/movement-matrix.ts` with `MovementMatrix.dc(dto)` per 03 sec. 4.1: TrType 1 P -> `CurrentStock -` (+ reprocess R -> separate bucket flag on the movement); 2 S -> `-` buyer; 3/8 -> `-` source order and `+` target order (TranOrdID/TranID); 4/6/13 -> `-`; 14 -> `-` src godown `+` dst godown; 17 -> `-` unit godown `+` receiving unit AND a pending `Trs_UnitAck` row; 20 -> pass-through keying; 21 -> `-` fabric with job-order balance flag; Del3 lines -> no stock movement (program bucket only).
  4. Create `joms-web/src/services/dc.service.ts`: `fabric(ctx, dto)` on the 04 sec. 14 template (guard `dc.fabric.create`, tolerance checks, numbering.take('DC'), insert, matrix, apply, scheduleAll, `outbox.emit('dc.created')`); `stockPicker(ordId, party, dept)` — union of CurrentStock>0 and existing DC lines (delegate to picker kind `stock`); RateConfirmGuard: when `need_rate_conf_for_dc=1`, require an approved `Pro_RateCnfPcs2` row for the order (or `rateconfirmcheck` deviation window) else `AppError('RATE_CONFIRM_REQUIRED', 409)` with the verbatim message.
  5. Create routes: `joms-web/src/app/api/dc/fabric/route.ts` (POST -> 201 `{id, docNo, posting}`) and `joms-web/src/app/api/dc/stock-picker/route.ts` (GET, alias of the stock union).
  6. Create UI: `joms-web/src/app/(erp)/dc/fabric/page.tsx` [C] + `joms-web/src/components/dc/DcWizard.tsx` with `TypePanel.tsx` (TrType list), `PartyPanel.tsx` (PartyPicker by dept; ShadePicker when dyeing dept, DesignPicker-equivalent via design picker when printing), `StockPickerPanel.tsx` (StockPicker; partially issued rows remain visible), `KnitProgramLines.tsx` (Del3 rows when `knitprgdc=1`), `RateConfirmGuard.tsx` (badge + server 409 surfaced as banner), `ReprocessToggle.tsx` (P|R), `GstEwayPanel.tsx` (HSN %, CGST/SGST vs IGST by party state, e-way no/date; visible when `gstenable`), `ToleranceBanner.tsx` (trankgs_dev); save -> PostingPreview.
  7. Create `joms-web/src/app/(erp)/dc/[id]/page.tsx` [S]: lines, ack status columns, print link placeholder.
  8. Create `joms-web/tests/dc.posting.test.ts`: process DC decrement; reprocess bucket routing; TrType 3 order-transfer split; TrType 14 godown move; rate-confirm 409 (verbatim message string); Del3 insert with no stock movement; G1 mid-failure hook case.
- **Acceptance criteria:**
  - AC1: Given a process DC (TrType 1, P, 1 line 100 kgs), When `POST /api/dc/fabric`, Then 201 and the CurrentStock key decrements by exactly 100 kgs and `ST_ProgBalance_Fabric.DcKgs` increases by 100 via the projector.
  - AC2: Given `need_rate_conf_for_dc=1` and no approved rate row, When POST, Then 409 with the verbatim rate-confirmation message and zero Trs_Del rows.
  - AC3: Given TrType 3 transfer 50 kgs order A -> order B, When POST, Then order A key -50 and order B key +50 (both row effects verified).
  - AC4: Given TrType 1 ProcessType R, When POST, Then the projector's ReProcess bucket increases and the fresh DcKgs bucket does not.
  - AC5: G1 — with the fail-after-posting hook, a DC save leaves zero Trs_Del rows and unchanged CurrentStock.
- **Test commands:**
  - `cd /c/Users/mahes/Documents/Projects/Fiber/Fiberpro/joms-web && npm test -- tests/dc.posting.test.ts`
  - `curl -s -X POST http://localhost:3000/api/dc/fabric -H "Content-Type: application/json" -b cookies.txt -d '{"trType":1,"processType":"P","partyId":5,"lines":[{"ordId":1,"stockId":9,"godId":1,"kgs":100,"mtr":0,"rls":0}]}'`
- **Out of scope:** piece/panel/acc DCs (Stage 4 / S3 returns only for 4/6/13), gate entry/pass, DC completion screens, ready-to-cut UI (WO-S3.5/WO-S3.10).
- **DoD checklist:**
  - [ ] AC1-AC5 verified (G1 green; G2 for bucket routing)
  - [ ] Every TrType leg of 03 sec. 4.1 has a matrix branch (reviewer checklist against the doc row set)
  - [ ] `npm run lint` and `npm run build` pass
  - [ ] TASKS.md S3.1 box ticked + PROGRESS.md change-log line added

---

## WO-S3.2 — ProgBalanceYarnProjector + DELKNIT pre-issue leg (M, S3)
- **Objective:** Implement ProgBalanceYarnProjector rebuilding `ST_ProgBalance_Yarn` with the verified trigger guards, including the Trs_Del3 DELKNIT pre-issue leg and the corrected GrnType filter.
- **Refs:** 03 sec. 5 (projector row: TRG_YARN_BALANCE_* set, DcKgs incl. Trs_Del3.Prog, ReqBalanceKgs formula); 11 sec. 5 (guard list: `isnull(pokgs,0)=0` gate, `@Cnt>0` gates, DELKNIT has no sales leg), sec. 3 #7 (GRN_DEL GrnType-filter defect — fixed by recompute).
- **Owning docs:** 03, 11
- **Preconditions:** WO-S2.2 done (runner + registry).
- **Implementation steps:**
  1. Create `joms-web/src/projectors/prog-balance-yarn.ts`: rebuild `ST_ProgBalance_Yarn` from SUM of documents for affected keys — DcKgs includes process-DC kgs gated by `isnull(pokgs,0)=0` AND `Trs_Del3.Prog` pre-issue kgs (DELKNIT leg; no sales leg added); GrnKgs summed with the correct GrnType filter (recompute, not the legacy pre-computed variable — 11 sec. 3 #7); `ReqBalanceKgs = Req - (Grn + TransIn - delRet - TransOut)` (03 sec. 5); honor `@Cnt>0` row-existence semantics by simply summing over all rows of the key (projector rule 05 sec. 2); stamp UpdateFlg via `sync-flag.ts`.
  2. Register the projector in `joms-web/src/projectors/index.ts` for `dc.created`, `grn.created`, and the dirty-key event.
  3. Create `joms-web/tests/prog-balance-yarn.test.ts` with fixtures: process DC with pokgs=0 (DcKgs +), DC with pokgs>0 (DcKgs term skipped), Trs_Del3.Prog row (DcKgs +, CurrentStock untouched), mixed-GrnType GRN rows (only yarn GRN types counted), purchase-return delRet and transfer in/out legs (ReqBalanceKgs math), UpdateFlg stamped.
- **Acceptance criteria:**
  - AC1: Given a process DC with pokgs=0, When the projector runs, Then DcKgs includes its kgs; given pokgs>0, Then DcKgs is unchanged (both cases asserted).
  - AC2: Given a Trs_Del3.Prog row of 40 kgs, When the projector runs, Then DcKgs +40 and the CurrentStock snapshot is untouched (no premature stock).
  - AC3: Given GRN rows of mixed GrnType, When the projector runs, Then GrnKgs counts only the yarn-eligible types (fixture lists the exact expected set).
  - AC4: Given Req/Grn/TransIn/delRet/TransOut fixture values, Then `ReqBalanceKgs` equals the hand-computed formula result exactly.
  - AC5: After any rebuild, Then the written `ST_ProgBalance_Yarn` rows have `UpdateFlg=1`.
- **Test commands:**
  - `cd /c/Users/mahes/Documents/Projects/Fiber/Fiberpro/joms-web && npm test -- tests/prog-balance-yarn.test.ts`
- **Out of scope:** fabric projector changes (WO-S2.2/WO-S3.5), acc balance projectors (later stage), rate engine.
- **DoD checklist:**
  - [ ] AC1-AC5 verified (G2 on guards; 11 sec. 3 #7 regression case present)
  - [ ] `npm run lint` and `npm run build` pass
  - [ ] TASKS.md S3.2 box ticked + PROGRESS.md change-log line added

---

## WO-S3.3 — PO family + BudgetDeviationBanner + approval submit (L, S3)
- **Objective:** Implement the purchase-order family (yarn/fab/acc/multi-style) with budget tolerance checks, the BudgetDeviationBanner, and submit-for-approval under `po_approval_reqd`.
- **Refs:** 02 sec. 5 (`purchase/po/new` PoWizard panels); 04 sec. 4 (PO endpoints); 03 sec. 6 (po_bud/po_buddev/po_allowadd, po_budrt/po_budrtdev rows); 05 sec. 1 (`po.created` event + approval task), sec. 4 (approval behavior).
- **Owning docs:** 03, 04, 05
- **Preconditions:** WO-S2.2 (outbox), WO-S1.5 (pickers), WO-S1.6 (numbering) done.
- **Implementation steps:**
  1. Create `joms-web/src/lib/dto/po.ts`: zod `PoCreateDto` = `{ variant: 'yarn'|'fab'|'acc'|'multi', vendorId, orderRefs?: number[] (multi), lines: [{ordId?, itemRefId, qty, rate, budQty?, budRate?}] }`.
  2. Create `joms-web/src/db/repo/po.ts`: `insert(tx, docNo, dto)` writing `Trs_Po1` header + `Trs_Po2`/`Trs_Po5` lines per variant (column mapping from DDL snapshot); `getById(id)`; `setStatus(id, status)`; `addCanQty(id, qty)` for cancellations (PoCanQty).
  3. Create `joms-web/src/services/po.service.ts`: `create(ctx, dto)` — deviation math: pct = (qty - budQty)/budQty*100 per line; block with `AppError('PO_BUDGET_DEV',400)` when beyond `po_buddev` (default 10.00) and `po_allowadd` off, else warn (warnings in response); same pattern for rate vs `po_budrtdev` (`PO_RATE_DEV`); numbering.take('PO'); when `po_approval_reqd=1` save with Status='DRAFT' and `outbox.emit('po.created',{id, approvalTask:true})`, else Status='APPROVED'; `list(status)`, `cancel(id)` (PoCanQty + Status + `po.cancelled` event), `complete(id)`, `accept(id)`.
  4. Create routes: `joms-web/src/app/api/purchase/po/route.ts` (POST create -> 201 `{id, docNo, status, warnings}`, GET list) and `joms-web/src/app/api/purchase/po/[id]/route.ts` (POST `{action:'cancel'|'complete'|'accept'}`).
  5. Create UI: `joms-web/src/app/(erp)/purchase/po/new/page.tsx` [C] + `joms-web/src/components/purchase/PoWizard.tsx` with `VendorPanel.tsx` (PartyPicker by commodity), `LinesGrid` config (LineGrid; rate autofill when `budrate_auto_fill(_in_po)=1`; qty autofill when `reqdqty_auto_fill_reqd_in_po=1`), `BudgetDeviationBanner.tsx` (wraps ToleranceBanner with the po_buddev pair + live deviation pct), `ApprovalSubmit.tsx` (submit-for-approval button rendered only when `po_approval_reqd`).
  6. Create `joms-web/src/app/(erp)/purchase/po/[id]/page.tsx` [S]: card with accept/cancel actions behind `<Can>`; register link page `src/app/(erp)/purchase/po/register/page.tsx` (DataTable of `PoService.list`).
  7. Create `joms-web/tests/po.test.ts`: within-budget 201; 15% over with allowadd=0 -> 400 PO_BUDGET_DEV (zero rows); over with allowadd=1 -> 201 + warnings; rate deviation -> 400; approval flag -> 201 status DRAFT + outbox row; cancel -> PoCanQty set + event.
- **Acceptance criteria:**
  - AC1: Given a within-budget PO, When `POST /api/purchase/po`, Then 201 with docNo and exactly 1 `Trs_Po1` + N line rows.
  - AC2: Given a line 15% over budget with `po_allowadd=0`, When POST, Then 400 `{code:'PO_BUDGET_DEV'}` and `SELECT COUNT(*) FROM Trs_Po1` unchanged.
  - AC3: Given `po_approval_reqd=1`, When POST, Then 201 with `status:'DRAFT'` and one `EventOutbox` row of type `po.created`.
  - AC4: Given a rate beyond `po_budrtdev`, When POST, Then 400 `{code:'PO_RATE_DEV'}`.
  - AC5: Given cancel on an approved PO, Then the row's cancel-qty column is set and a `po.cancelled` outbox row exists (DB + event effects).
- **Test commands:**
  - `cd /c/Users/mahes/Documents/Projects/Fiber/Fiberpro/joms-web && npm test -- tests/po.test.ts`
  - `curl -s -X POST http://localhost:3000/api/purchase/po -H "Content-Type: application/json" -b cookies.txt -d '{"variant":"yarn","vendorId":3,"lines":[{"itemRefId":11,"qty":500,"rate":210,"budQty":500,"budRate":210}]}'`
- **Out of scope:** approval inbox UI (approvals module), rate-confirm flow (S5.1), GRN against PO (WO-S3.4).
- **DoD checklist:**
  - [ ] AC1-AC5 verified (G5: ApprovalSubmit flag-gated)
  - [ ] Tolerance messages use MESSAGES constants (byte-stable)
  - [ ] `npm run lint` and `npm run build` pass
  - [ ] TASKS.md S3.3 box ticked + PROGRESS.md change-log line added

---

## WO-S3.4 — Purchase GRN + waste receipt + opening stock (M, S3)
- **Objective:** Extend the GRN family with grnType 'Purchase' (PO-linked), the waste receipt entry, and opening stock entry, each posting through the same engine.
- **Refs:** 02 sec. 6 (`grn/waste`, `grn/opening` pages; GrnWizard TypePanel); 03 sec. 4.1 (Purchase GRN and DirectReceipt rows, PO received + `OrderStylewiseCost_Grp.GRNKGS/GRNBASEDVALUE` accrual note); 04 sec. 5 (`POST /api/grn/waste`), sec. 7 (`POST /api/stock/opening`); 07 Part 2 (`direcrec`).
- **Owning docs:** 03, 04, 02
- **Preconditions:** WO-S2.3 (GrnService + wizard), WO-S3.3 (PO to receive against) done.
- **Implementation steps:**
  1. Extend `joms-web/src/posting/movement-matrix.ts`: grn 'Purchase' leg (`CurrentStock +` per line, YF by commodity; movement carries PORef for the projector); 'DirectReceipt' leg (identical + but flagged direct for `direcrec`).
  2. Extend `joms-web/src/services/grn.service.ts`: `create` accepts `'Purchase'` (requires poRef on the dto; after posting, the PO-received leg updates via the projector dirty-key event — implement the PO-balance read in `src/projectors/index.ts` as part of the fabric/yarn key rebuild or a small `PoBalanceProjector` in `src/projectors/po-balance.ts`); `waste(ctx, dto)` (GRN insert with the waste GrnType from the DDL snapshot + `+` movement; outbox `grn.created` with waste flag); `opening(ctx, dto)` writing `Trs_Opening` rows + `+` movements (flagged opening).
  3. Create routes: `joms-web/src/app/api/grn/waste/route.ts` (POST -> 201) and `joms-web/src/app/api/stock/opening/route.ts` (POST -> 201).
  4. UI: extend `joms-web/src/components/grn/TypePanel.tsx` with 'Purchase' (PO picker + receive-against-PO summary) and 'DirectReceipt'; create `joms-web/src/app/(erp)/grn/waste/page.tsx` (party + LineGrid qty/reason + save) and `joms-web/src/app/(erp)/grn/opening/page.tsx` (order/item/godown pickers + LinesGrid; _CompWise toggle filter).
  5. Create `joms-web/tests/grn-purchase.test.ts`: purchase GRN increments CurrentStock and reduces PO pending qty (balance row before/after); waste receipt row + stock effect; opening stock creates Trs_Opening rows and stock keys; missing poRef on Purchase -> 400; G3 reversal of a purchase GRN restores stock and PO balance.
- **Acceptance criteria:**
  - AC1: Given an approved PO with 500 pending, When a Purchase GRN of 300 is posted, Then CurrentStock +300 on the item key and the PO pending balance reads 200.
  - AC2: Given `POST /api/grn/waste` with 50 kgs, Then 201, one GRN header row of the waste type exists, and CurrentStock +50 at the waste key.
  - AC3: Given `POST /api/stock/opening` with 3 lines, Then 3 `Trs_Opening` rows exist and 3 CurrentStock keys are created with the given quantities.
  - AC4: G3 — reversing the purchase GRN restores both CurrentStock and the PO pending balance to pre-GRN values (snapshot compare).
  - AC5: Given a Purchase dto without poRef, When POST, Then 400 with a fields entry naming poRef.
- **Test commands:**
  - `cd /c/Users/mahes/Documents/Projects/Fiber/Fiberpro/joms-web && npm test -- tests/grn-purchase.test.ts`
  - `curl -s -X POST http://localhost:3000/api/grn/waste -H "Content-Type: application/json" -b cookies.txt -d '{"partyId":5,"lines":[{"ordId":1,"stockId":9,"godId":1,"recKgs":50,"recMtr":0,"rBag":0,"rls":0}]}'`
- **Out of scope:** accessory GRN mirrors (S3 later work / 03 sec. 4.4), dia change screens, lot approval (WO-S3.8).
- **DoD checklist:**
  - [ ] AC1-AC5 verified (G3 green)
  - [ ] GrnWizard TypePanel covers 'Purchase' and 'DirectReceipt'
  - [ ] `npm run lint` and `npm run build` pass
  - [ ] TASKS.md S3.4 box ticked + PROGRESS.md change-log line added

---

## WO-S3.5 — Returns (4/6/13) + 'Process Return' GRN + RTC 20 equalize (M, S3)
- **Objective:** Implement DC returns (TrType 4 purchase return, 6/13 party rejection), the 'Process Return' GRN type, and ready-to-cut (TrType 20) with its return leg and the program-balance equalize rule.
- **Refs:** 03 sec. 4.1 (purchase return, party rejection return, Process Return GRN, Ready-to-cut rows and the `GRN side := DC side` equalize + ReturnKgs); 02 sec. 7 (`dc/returns` page), sec. 9 (ready-to-cut page); 04 sec. 6 (`POST /api/dc/returns`, `POST /api/dc/ready-to-cut`); 11 sec. 3 #2-#3 (RCUT defects — do not port).
- **Owning docs:** 03, 04, 11
- **Preconditions:** WO-S3.1 (DcService + matrix DC legs), WO-S2.3 (GrnService) done.
- **Implementation steps:**
  1. Add `returns(ctx, dto)` to `joms-web/src/services/dc.service.ts` (dto reuses `DcCreateDto` restricted to trType 4/6/13): movements per 03 sec. 4.1 (4: stock `-`, PO balance back via projector; 6/13: stock `-`, party balance down); route `joms-web/src/app/api/dc/returns/route.ts` POST; UI `joms-web/src/app/(erp)/dc/returns/page.tsx` (TypePanel 4/6/13 + PartyPicker + StockPicker + LinesGrid + ToleranceBanner).
  2. Extend `joms-web/src/lib/dto/grn.ts` enum to accept `'Process Return'` and extend `MovementMatrix.grn` with its leg: `CurrentStock -` (send back out), `GrnKgs -`, party bucket `-` (03 sec. 4.1 row); TypePanel option in GrnWizard.
  3. Add `readyToCut(ctx, dto)` to `dc.service.ts`: TrType 20 pass-through posting + return variant (`dto.return=true` -> ReturnKgs leg); route `joms-web/src/app/api/dc/ready-to-cut/route.ts` POST.
  4. Extend `joms-web/src/projectors/prog-balance-fabric.ts` with the RTC legs: equalize `GRN side := DC side` on RTC pass (TRG_FAB_BALANCE_RCUT semantics via SUM recompute), `ReturnKgs` on RTC return; add regression tests proving 11 sec. 3 #2 (overwrite-instead-of-subtract) and #3 (hardcoded DeptId=-7) are NOT reproduced (multi-row negative-key fixture -> SUM-correct value).
  5. Create `joms-web/tests/returns-rtc.test.ts`: TrType 4 (stock -, PO pending restored), TrType 6/13 (party balance down), Process Return GRN (stock -, GrnKgs -), RTC pass + GRN equalize (columns equal), RTC return (ReturnKgs +), G3 reversal of one return.
- **Acceptance criteria:**
  - AC1: Given a purchase return DC for a received PO line, When POST returns, Then CurrentStock decreases by the qty and the PO pending balance returns to its pre-receipt value.
  - AC2: Given a 'Process Return' GRN of 25 kgs, When POST /api/grn, Then CurrentStock -25 and `ST_ProgBalance_Fabric.GrnKgs` decreases by 25.
  - AC3: Given an RTC pass of 100 and an RTC-side GRN of 100, When the projector runs, Then the program balance's GRN column equals its DC column.
  - AC4: Given an RTC return of 20, When posted, Then `ReturnKgs` increases by 20.
  - AC5: Regression — the RTC-delete fixture with mixed-sign rows yields the SUM-correct bucket (neither defect #2 nor #3 behavior).
- **Test commands:**
  - `cd /c/Users/mahes/Documents/Projects/Fiber/Fiberpro/joms-web && npm test -- tests/returns-rtc.test.ts`
  - `curl -s -X POST http://localhost:3000/api/dc/ready-to-cut -H "Content-Type: application/json" -b cookies.txt -d '{"trType":20,"processType":"P","partyId":5,"lines":[{"ordId":1,"stockId":9,"godId":1,"kgs":100,"mtr":0,"rls":0}]}'`
- **Out of scope:** ready-to-cut UI page (WO-S3.10), RTC prints, non-return-DC approval aging.
- **DoD checklist:**
  - [ ] AC1-AC5 verified (G2/G3; defect regression tests present)
  - [ ] `npm run lint` and `npm run build` pass
  - [ ] TASKS.md S3.5 box ticked + PROGRESS.md change-log line added

---

## WO-S3.6 — Transfers 3/8/14/17 + godown/unit ack parity (M, S3)
- **Objective:** Complete the transfer family — order transfers (3/8), godown (14) and unit (17) DCs — plus the godown/unit acknowledgement flows ported from the ack procs.
- **Refs:** 02 sec. 8 (`stock/transfers/*` and `stock/transfers/ack/*` pages); 03 sec. 4.1 (transfer/godown/unit rows, Trs_UnitAck pending); 04 sec. 7 (`POST /api/stock/transfer`, `POST /api/stock/ack/godown|unit`); 07 Part 2 (`inhousetransfer`, `stock_maintain_reqd_for_inhousetransfer`).
- **Owning docs:** 03, 04, 02
- **Preconditions:** WO-S3.1 done (matrix DC legs incl. 14/17 and 3/8).
- **Implementation steps:**
  1. Create `joms-web/src/services/stock.service.ts`: `transfer(kind, ctx, dto)` for `godown` (TrType 14 movement pair), `unit` (TrType 17 movement pair + pending `Trs_UnitAck` row Status 'P'; skips stock maintenance when `stock_maintain_reqd_for_inhousetransfer=0`), `pcs-godown` (fabric-ledger godown move on the pcs grid is out of scope — reject with NOT_IMPLEMENTED until Stage 4); order transfers 3/8 route through `DcService.fabric` (already in WO-S3.1 — expose a thin alias `transferOrder` if the UI needs it).
  2. Create `ack(kind, ctx, dto)` in stock.service.ts: port `PROC_GodownAck_*` / `PROC_UnitAck_*` semantics — confirm the pending row to Status 'A', write `Trs_UnitAck1/2` confirmation rows, complete the receiving-side stock effect; re-read the extracted proc bodies from `design/db-extract/procs/` if the drift report flags them (11 sec. 6.3).
  3. Create routes: `joms-web/src/app/api/stock/transfer/route.ts` (POST `{kind, ...}`) and `joms-web/src/app/api/stock/ack/[kind]/route.ts` (POST).
  4. Create UI pages: `joms-web/src/app/(erp)/stock/transfers/godown/page.tsx`, `.../unit/page.tsx` (GodownPicker pair + StockPicker + LinesGrid), `src/app/(erp)/stock/transfers/ack/godown/page.tsx`, `.../ack/unit/page.tsx` (pending list DataTable + confirm action).
  5. Create `joms-web/tests/transfer-ack.test.ts`: godown transfer row pair; unit transfer pending row + ack completes; flag-off case skips stock maintenance; rights 403; G3 reversal of a godown transfer.
- **Acceptance criteria:**
  - AC1: Given a godown transfer of 60 kgs G1 -> G2, When POST, Then the G1 row decreases 60 and the G2 row increases 60 (two row effects).
  - AC2: Given a unit transfer, When POST, Then a `Trs_UnitAck` row exists with Status 'P'; when acked, Then Status 'A' and the receiving unit's stock row exists.
  - AC3: Given `stock_maintain_reqd_for_inhousetransfer=0`, When a unit transfer is posted, Then no stock rows move (flag behavior) and the ack row still exists.
  - AC4: G3 — reversing the godown transfer restores both godown rows to pre-transfer snapshots.
  - AC5: Given a user without `stock.transfer`, When POST transfer, Then 403 `{code:'FORBIDDEN'}`.
- **Test commands:**
  - `cd /c/Users/mahes/Documents/Projects/Fiber/Fiberpro/joms-web && npm test -- tests/transfer-ack.test.ts`
  - `curl -s -X POST http://localhost:3000/api/stock/transfer -H "Content-Type: application/json" -b cookies.txt -d '{"kind":"godown","fromGodId":1,"toGodId":2,"lines":[{"ordId":1,"stockId":9,"kgs":60,"mtr":0,"rls":0}]}'`
- **Out of scope:** pieces-godown transfer (Stage 4), transfer registers, FrmChangeGodown master utility.
- **DoD checklist:**
  - [ ] AC1-AC5 verified (G3 green; flag case per G5)
  - [ ] `npm run lint` and `npm run build` pass
  - [ ] TASKS.md S3.6 box ticked + PROGRESS.md change-log line added

---

## WO-S3.7 — Stock registers family + stock view + ledger + roll split + adjustments (M, S3)
- **Objective:** Deliver the remaining stock read surfaces (register variants, 3-ledger view, running-balance ledger) plus roll split and stock adjustment entries on the engine.
- **Refs:** 02 sec. 8 (all `stock/*` subtrees); 04 sec. 7 (stock endpoints incl. roll-split and adjustment); 05 sec. 7 (reuse the job runner); 07 sec. 1.2 (Stock family + StockAdj); 03 sec. 3 (engine-only writes).
- **Owning docs:** 02, 04, 03
- **Preconditions:** WO-S2.5 (report runner + registry), WO-S2.1 (engine) done.
- **Implementation steps:**
  1. Extend `joms-web/src/reports/registry.ts` with register variants `general|fabric|yarn|acc|itemwise|stylewise|style-pcs` — each a param schema + dataset query over `CurrentStock`/Trs movements with Vue_* semantics (filters: godown, dept, color, size per 02 sec. 8 StockRegisterTable note).
  2. Extend `joms-web/src/services/stock.service.ts` with `current(ledger)` (3-ledger dashboard read incl. G/M split for pcs), `ledger(ordId, stockId)` (Vue_StkLedger running balance direct endpoint), `adjust(ctx, dto)` (adjustment lines -> +/- movements via engine + reversal-able), and create `joms-web/src/services/roll.service.ts` `split(ctx, dto)` (one parent roll -> N child rows summing to parent qty; lineage column `FrmStockId`/roll lineage per DDL snapshot; parent marked split/closed).
  3. Create routes: `joms-web/src/app/api/stock/current/route.ts`, `src/app/api/stock/ledger/route.ts`, `src/app/api/stock/adjustment/route.ts`, `src/app/api/stock/roll-split/route.ts` (POSTs rights-gated).
  4. Create pages: `joms-web/src/app/(erp)/stock/view/page.tsx` [S] (3-ledger dashboard DataTable), `src/app/(erp)/stock/registers/ledger/page.tsx` [S] (running ledger via jobId), `src/app/(erp)/stock/roll-split/page.tsx` [C] (RollPicker + child rows LineGrid + preview), `src/app/(erp)/stock/adjustment/page.tsx` [C] (StockPicker + +/- LinesGrid + ToleranceBanner none) — each with drill links per 02 sec. 8.
  5. Create `joms-web/tests/stock-family.test.ts`: register variant `fabric` returns seeded rows; ledger running balance equals fixture sequence; roll split parent/child invariant (sum children == parent original) and parent closure; adjustment + and - net effect and G3 reversal; unknown register variant -> 400.
- **Acceptance criteria:**
  - AC1: Given seeded stock, When `POST /api/reports/stock-register/run` with `variant=fabric`, Then the staged job rows match the seeded CurrentStock fixture.
  - AC2: Given `GET /api/stock/ledger?ordId&stockId`, Then the running-balance sequence equals the hand-computed fixture (array compare).
  - AC3: Given a roll split of a 120-kg roll into 70+50, When POST roll-split, Then two child roll rows exist, their sum is 120, and the parent roll is marked closed/split (column per DDL).
  - AC4: Given an adjustment of -10 then reversal, Then CurrentStock returns exactly to the pre-adjustment snapshot (G3).
  - AC5: Given `variant=unknown`, When run, Then 400 with a fields entry naming variant.
- **Test commands:**
  - `cd /c/Users/mahes/Documents/Projects/Fiber/Fiberpro/joms-web && npm test -- tests/stock-family.test.ts`
  - `curl -s "http://localhost:3000/api/stock/ledger?ordId=1&stockId=9" -b cookies.txt`
- **Out of scope:** pcs stock adjustments (Stage 4), stock options screen (frmOptions), Trg_CurrentStock_Update sync utility.
- **DoD checklist:**
  - [ ] AC1-AC5 verified (G3 green)
  - [ ] `npm run lint` and `npm run build` pass
  - [ ] TASKS.md S3.7 box ticked + PROGRESS.md change-log line added

---

## WO-S3.8 — Lot life: approval / register / separate / wise detail (S, S3)
- **Objective:** Implement the lot lifecycle screens and services — approval (flag-gated), register, separation with lot numbering flags, and lot-wise detail — including `getLotNo()` alphanumeric sort parity.
- **Refs:** 02 sec. 6 (`grn/lots/*` pages); 03 sec. 7 (lot numbering flags + getLotNo PATINDEX parity); 04 sec. 5 (lot endpoints); 07 Part 2 (lot flags: `lot_approval`, `nlot`, `lot_seq`, `lotrunno`, `dyelotflg`, `dyeing_lotno_auto_generation`).
- **Owning docs:** 03, 04, 02
- **Preconditions:** WO-S2.3 (GRN creates lots), WO-S1.6 (numbering service) done.
- **Implementation steps:**
  1. Add `getLotNo(next)` alphanumeric ordering to `joms-web/src/services/numbering.ts`: TS port of the legacy PATINDEX numeric extraction — split into text/digit runs, digit runs compare numerically ('A2' < 'A10').
  2. Create `joms-web/src/services/lot.service.ts`: `approve(ctx, id)` (set the approved flag column from the DDL snapshot; emit an approval-resolution event; no-op task emission when `lot_approval=0`), `separate(ctx, dto)` (split a lot into `nlot` new lots with numbers per `nlot/lot_seq/lotrunno` flags; original closed per policy), `detail(lot)` (lot-wise roll/qty breakdown dataset).
  3. Create routes: `joms-web/src/app/api/grn/lot/approve/route.ts`, `src/app/api/grn/lot/separate/route.ts`, `src/app/api/grn/lot/[lot]/route.ts` (GET detail).
  4. Create pages: `joms-web/src/app/(erp)/grn/lots/approval/page.tsx` (pending list + approve action; behind `<FlagGate flag="lot_approval">`), `.../lots/register/page.tsx` [S] (DataTable register), `.../lots/separate/page.tsx` [C] (LotPicker + nlot input + preview), `.../lots/[lot]/page.tsx` [S] (wise detail).
  5. Create `joms-web/tests/lot.test.ts`: approve flips the flag column and clears the task event; separate {lot, nlot:3} creates 3 sequential new lots; getLotNo sorts ['A2','A10','A1'] to ['A1','A2','A10']; detail GET returns the fixture breakdown; `lot_approval=0` -> approve works without task emission.
- **Acceptance criteria:**
  - AC1: Given a pending lot, When `POST /api/grn/lot/approve`, Then the lot row's approved column = 1 (SELECT confirms) and an approval-resolution outbox row exists.
  - AC2: Given separate with nlot=3, When POST, Then 3 new lot rows exist with sequential numbers per the active lot flags and the original lot is closed per policy.
  - AC3: Unit — `getLotNo` ordering proves ['A2','A10','A1'] sorts to ['A1','A2','A10'] (numeric-aware, not lexicographic).
  - AC4: Given `GET /api/grn/lot/<seed>`, Then 200 with roll/qty breakdown matching the fixture.
  - AC5: Given `lot_approval=0`, When approve runs, Then the flag column still flips but no approval task event is emitted (flag behavior).
- **Test commands:**
  - `cd /c/Users/mahes/Documents/Projects/Fiber/Fiberpro/joms-web && npm test -- tests/lot.test.ts`
  - `curl -s "http://localhost:3000/api/grn/lot/A12" -b cookies.txt`
- **Out of scope:** lot-wise rate (S5), lot approval inbox UI (approvals module), dia change screens.
- **DoD checklist:**
  - [ ] AC1-AC5 verified (G5 flag gate on the approval page)
  - [ ] `npm run lint` and `npm run build` pass
  - [ ] TASKS.md S3.8 box ticked + PROGRESS.md change-log line added

---

## WO-S3.9 — Cutting acknowledgement (Trs_CutApr -> dept -7 pool) (M, S3)
- **Objective:** Implement the cutting acknowledgement entry posting accepted Arl/AKg/AMtr into the cutting pool (dept -7) with FrmStockID lineage, matching the verified `CutACKStockPost` call pattern.
- **Refs:** 03 sec. 4.1 (Cutting acknowledgement row: `+` cutting pool dept -7, FrmStockID lineage, cut-vs-issued variance); 02 sec. 9 (`cutting/ack` page, `cutackreqd` flag); 04 sec. 6 (`POST /api/dc/:id/ack`); 11 sec. 5 (verified call pattern `EXEC Sp_currentstock @Ordid,@StockId,@StyleNo,@GodID,@Type,@ARL,@AKG,@AMtr,-7,1,@FRMStockID`).
- **Owning docs:** 03, 04, 11
- **Preconditions:** WO-S3.1 done (DCs exist to acknowledge).
- **Implementation steps:**
  1. Create `joms-web/src/lib/dto/cutack.ts`: zod `{dcId, lines: [{ordId, stockId, styleNo, godId, arl, akg, amtr, frmStockId}]}` (accepted quantities).
  2. Create `joms-web/src/services/cutting.service.ts`: `ack(ctx, dto)` — one tx: insert `Trs_CutApr` rows; build movements with `+` at the cutting-pool key reproducing the verified call pattern (dept -7, type 1, `@FRMStockID` lineage on the movement); `projectors.scheduleAll` (cut-vs-issued variance keys); `outbox.emit('cutack.recorded')` (05 sec. 1); return `{id, posting, variance}` where variance = issued - accepted per line.
  3. Create route `joms-web/src/app/api/dc/[id]/ack/route.ts` (POST; `requireCan(ctx,'cutting.ack')`).
  4. Create `joms-web/src/app/(erp)/cutting/ack/page.tsx` [C] + `joms-web/src/components/cutting/CutAckForm.tsx`: pick a DC (order picker -> DC list), LinesGrid pre-filled from the DC lines with accepted-columns Arl/AKg/AMtr and a computed variance column; save -> PostingPreview; page wrapped in `<FlagGate flag="cutackreqd">` (G5) while the API remains available for parity.
  5. Create `joms-web/tests/cutack.test.ts`: full ack posts the pool row at the -7 key with AKg exactly; FrmStockID lineage recorded on the row/movement; partial ack (issued 100, acked 90) returns variance 10 and the projector key reflects it; G3 reversal removes the pool effect and marks Trs_CutApr reversed; rights 403.
- **Acceptance criteria:**
  - AC1: Given a DC line of 100 kgs issued, When `POST /api/dc/<id>/ack` with AKg=100, Then 201, a CurrentStock row exists at the cutting-pool key (-7) with Kg=100, and `Trs_CutApr` rows = N.
  - AC2: The new pool row carries the source lineage (frmStockId column equals the line's frmStockId — SELECT confirms).
  - AC3: Given AKg=90 against 100 issued, Then the response includes `variance` 10 for that line and the projector's variance key holds 10.
  - AC4: G3 — reversing the ack restores CurrentStock to pre-ack snapshot and marks the Trs_CutApr rows reversed.
  - AC5: Given a user without `cutting.ack`, When POST, Then 403 `{code:'FORBIDDEN'}`; with `cutackreqd=0` the page hides the entry (FlagGate) while the API still permits parity acks.
- **Test commands:**
  - `cd /c/Users/mahes/Documents/Projects/Fiber/Fiberpro/joms-web && npm test -- tests/cutack.test.ts`
  - `curl -s -X POST http://localhost:3000/api/dc/123/ack -H "Content-Type: application/json" -b cookies.txt -d '{"lines":[{"ordId":1,"stockId":9,"styleNo":"S1","godId":1,"arl":0,"akg":100,"amtr":0,"frmStockId":9}]}'`
- **Out of scope:** cutting production/bundles (Stage 4), job orders, bit cut, add-panel.
- **DoD checklist:**
  - [ ] AC1-AC5 verified (G2 against the verified call pattern; G3 green)
  - [ ] `npm run lint` and `npm run build` pass
  - [ ] TASKS.md S3.9 box ticked + PROGRESS.md change-log line added

---

## WO-S3.10 — Ready-to-cut UI + cutting registers + fab rejection (S, S3)
- **Objective:** Finish the cutting module surface: the ready-to-cut page over the S3.5 service with READYTOCUT prints, the cutting/fab-return registers, and the fabric rejection entry.
- **Refs:** 02 sec. 9 (`cutting/ready-to-cut`, `cutting/register`, `cutting/fab-rejection` rows); 03 sec. 4.1 (RTC row); 07 sec. 1.1 (READYTOCUT + RETURN prints); 05 sec. 7 (job staging reuse).
- **Owning docs:** 02, 07, 05
- **Preconditions:** WO-S3.5 (readyToCut service + ReturnKgs leg), WO-S2.5 (report runner) done.
- **Implementation steps:**
  1. Create `joms-web/src/app/(erp)/cutting/ready-to-cut/page.tsx` [C] + `joms-web/src/components/cutting/ReadyToCutForm.tsx`: entry form over `DcService.readyToCut()` (return-leg toggle), StockPicker + LinesGrid + PostingPreview; print buttons linking to `/reports/viewer/readytocut?docId=` and `...?docId=&variant=return`.
  2. Add register entries to `joms-web/src/reports/registry.ts`: `cutting-register` (FrmCutingReg semantics over `Trs_CutApr` + DCs) and `fab-return-register` (FrmCuttingfabretreg semantics over return DCs).
  3. Create `joms-web/src/reports/prints/readytocut.ts`: print dataset + overlay field map reusing `preprint-298.ts` frames; wire printId `readytocut` (variant `return` supported) in `src/app/reports/viewer/[printId]/page.tsx`.
  4. Add `fabRej(ctx, dto)` to `joms-web/src/services/cutting.service.ts`: fabric rejection entry (FrmCutting_FabRej) -> `-` movement with rejection reason; route `joms-web/src/app/api/cutting/fab-rejection/route.ts` POST; UI `joms-web/src/app/(erp)/cutting/fab-rejection/page.tsx` (StockPicker + qty/reason LineGrid).
  5. Create `joms-web/src/app/(erp)/cutting/register/page.tsx` [S]: variant switcher (cutting | fab-return) running the two registry entries through the job runner with DataTable output.
  6. Create `joms-web/tests/cutting-reg.test.ts`: cutting-register rows match seeded Trs_CutApr totals; fab-return rows match seeded return DCs; fab rejection decrements stock and G3 restores; readytocut print dataset fields (doc no, qty, variant label).
- **Acceptance criteria:**
  - AC1: Given seeded Trs_CutApr rows, When the cutting-register job runs, Then the staged rows' totals equal the seeded fixture totals.
  - AC2: Given a fab rejection of 15 kgs, When `POST /api/cutting/fab-rejection`, Then CurrentStock -15 at the key; reversal restores it exactly (G3).
  - AC3: Given a saved RTC doc, When GET `/reports/viewer/readytocut?docId=<id>`, Then 200 HTML containing the doc no and qty inside overlay frames; `variant=return` renders the return label.
  - AC4: Given the ready-to-cut page (component test with mocked service), When saved, Then it calls the ready-to-cut mutation and renders PostingPreview from the response.
  - AC5: `npm run lint` and `npm run build` pass and Stage 3 exit check is recorded (matrix 03 sec. 4.1 legs + reversal all present).
- **Test commands:**
  - `cd /c/Users/mahes/Documents/Projects/Fiber/Fiberpro/joms-web && npm test -- tests/cutting-reg.test.ts`
  - `curl -s -X POST http://localhost:3000/api/cutting/fab-rejection -H "Content-Type: application/json" -b cookies.txt -d '{"lines":[{"ordId":1,"stockId":9,"godId":1,"kgs":15,"mtr":0,"rls":0,"reason":"hole"}]}'`
- **Out of scope:** cutting production auto/bundles/barcodes (Stage 4), job-order GST print, add-panel cutting.
- **DoD checklist:**
  - [ ] AC1-AC5 verified (G3 green)
  - [ ] Stage 3 exit statement added to PROGRESS.md sec. 6 (matrix coverage + reversal proven — the inlined S3 exit rule)
  - [ ] `npm run lint` and `npm run build` pass
  - [ ] TASKS.md S3.10 box ticked + PROGRESS.md change-log line added

---

End of file — 17 work orders (WO-S2.1..S2.7, WO-S3.1..S3.10).
