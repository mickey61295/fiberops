# Work Orders — Stage 4 (Production, Pieces, Payroll Capture) + Stage 5 (Commercial & Finance Core)

Scope: TASKS.md items S4.1-S4.10 and S5.1-S5.8 (18 work orders, one per TASKS.md ID).

Shell: Git Bash (Windows). Doc numbers: 00-OVERVIEW 01-ARCHITECTURE 02-COMPONENT-TREE 03-DOMAIN-POSTING-ENGINE 04-API-SERVICES 05-EVENTS-SYNC-NOTIFICATIONS 06-SCREEN-MAP 07-REPORTS-FLAGS 08-QR-TRACKING 09-AI-HARNESS 10-REVIEW-REPORT 11-PROC-VERIFICATION (all in nextjs-lld/).

Conventions (apply to every WO in this file):
- All file paths are relative to the app repo root (`joms-web/`, created beside this docs folder).
- Gates G1-G5 (inlined definitions; workers never read a plan doc): G1 mid-failure atomicity, G2 legacy parity, G3 exact reversal restore, G4 docs sync, G5 rights/flags. Corrected behaviors from 11 sec. 2-sec. 3 are CONTRACTUAL: the AC wording wins over legacy quirks. Dead legs from 11 sec. 4 are NOT ported.
- Re-extract each referenced legacy proc from the live DB at implementation time and diff vs 11 before coding (11 sec. 6.3).
- Test runner is vitest: `npm test -- tests/<file>`.

## WO-S4.1 — Production entry dispatcher parity (L, S4)
- **Objective:** Implement ProductionService entry/update/delete with the legacy `Sp_ProductionEntryQty*` dispatcher's routing parity, encoding the verified rework, LineOut, and Spl_Operation semantics.
- **Refs:** 03 sec. 4.2 (production matrix); 11 sec. 2.4 (dispatcher audit; sec. 3 defect table); 04 sec. 8; 02 sec. 10 (production/entry); 03 sec. 3 (save flow); 04 sec. 14 (service template).
- **Owning docs:** 03, 11, 04
- **Preconditions:** S2.1 (PostingEngine), S2.2 (outbox + projector infra), S2.4 (reversal pattern), Stage 3 exit (all 03 sec. 4.1 matrix legs + reversal demonstrated); live-DB re-extract of `Sp_ProductionEntryQty_1/_2` diffed vs 11.
- **Implementation steps:**
  1. Define `src/domain/production.ts`: PcsType ('Piece'|'Panel'|'Bit'), EntryOption (1|2), FinalStage ('S'|'F'), Rework (0|1|2), PieceKey.
  2. Write `src/services/production/dispatcher.ts` with `route(entry)` returning exactly one of: `pcs_plain`, `pcs_lineout`, `pcs_lineout_rewrk`, `panel_1`, `panel_asm` - mirroring `Sp_ProductionEntryQty` / `_1` (LineOut flag hardcoded 'Y'; Rework!=1; Spl_Operation='N') / `_2` (rework rows) / `_Panel_1` / `_Panel_ASM` selection.
  3. Implement movement builders in `src/posting/movements/production.ts` per 03 sec. 4.2: piece production (target 'G' +, source stage -, ProductionQty +), stage-to-stage (Stage!=1 and FinalStage='S'; deduction additionally requires PcsType='Piece'; Stage=1+Rework=1 has its own source-deduction block), final stage (source via `Trs_ProdEntry_SourceStageDtl`; EntryOption!=1 spreads per PcsPerColor combo colors), LineOut (source = line bucket row where `Pcs_StockTable.EmpID = SrcLineID`), rework (Rework=1 consumes 'M' bucket with RejectionTypeId and outputs 'G'; Rework=2 treated as normal 'G').
  4. Implement update/delete as compensating rebuilds matching `PROC_Stock_ProdPieces_Update_LineOut` and `PROC_Stock_ProdPieces_Delete_LineOut_PrdEntry[_Rewrk]` parity (both `_1` arms use the LineOut variants; `_2` mirrors with `_Rewrk`).
  5. Skip stock posting AND skip StockPostingFlg when `Mas_JobWrkComp.Spl_Operation='Y'` (flag parity).
  6. Add `app/api/production/entry/route.ts` (POST) and `app/api/production/entry/[id]/route.ts` (DELETE); zod DTO in `src/schemas/production.ts`; rights check `production.entry`.
  7. Emit `prodentry.posted` / `prodentry.reversed` via outbox; schedule ProductionDataProjector keys (03 sec. 5).
  8. Build `app/production/entry/page.tsx` per 02 sec. 10, composing `src/components/production/ProdEntryForm.tsx`, `src/components/production/SizeQtyGrid.tsx`, `src/components/production/ReworkToggle.tsx`, `src/components/production/PayToggle.tsx`, RouteGuard (Prod_Sequence validation), and PostingPreview.
  9. Golden tests in `tests/production.dispatcher.test.ts`: one case per 03 sec. 4.2 matrix row plus a routing-table case per dispatcher arm.
- **Acceptance criteria:**
  - AC1: Given an entry at a Spl_Operation='Y' stage, When saved, Then zero `Pcs_StockTableQty` rows change and the StockPostingFlg skip matches legacy default (assert no flag row written).
  - AC2: Given Rework=1 and RejectionTypeId=5, When posted, Then the source 'M' bucket (good='M', rejTypeId=5) decreases by N pcs and the target 'G' bucket increases by N pcs (exact row deltas asserted in DB).
  - AC3: Given Rework=2, When posted, Then ledgers are byte-identical to the same entry saved with Rework=0 (no 'M' bucket touched).
  - AC4: Given a `_1`-routed entry (Rework not 1, Spl_Operation='N'), When posted, Then the deduction lands on the line bucket row (`EmpID = SrcLineID`), not the EmpID=0 row; and for `_2`-routed rework the line key used is LineID, not SrcLineID.
  - AC5: Given an injected failure after the first movement write, When the transaction aborts, Then zero Trs_ProdEntry / Trs_ProdEntryQty / Pcs_StockTableQty rows persist and no `prodentry.posted` event exists in the outbox (G1 rollback proof).
  - AC6: Given a saved entry, When deleted via the reversal endpoint, Then every touched Pcs_StockTableQty bucket (StockQty and ProductionQty columns) returns to pre-save values exactly (G3).
- **Test commands:** `npm test -- tests/production.dispatcher.test.ts`; `npm run lint`; `npm run build`
- **Out of scope:** panel assembly add-path (WO-S4.2), rejection entries (WO-S4.3), line in/out/tfr (WO-S4.4), barcode batch posting (WO-S4.6), ST_Production_Data projector internals (WO-S4.8), wages accrual (WO-S4.9).
- **DoD checklist:**
  - [ ] AC1-AC6 verified by `tests/production.dispatcher.test.ts`
  - [ ] G1 mid-failure rollback test present; G2 golden parity vs 03 sec. 4.2 expectations; G3 delete-restore test present
  - [ ] G4: 03 sec. 4.2 or 04 sec. 8 updated in same PR if routing table changed
  - [ ] G5: `/production/entry` rights-gated
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S4.1 ticked

## WO-S4.2 — Panel ledger + assembly (deduction-only ASM) (M, S4)
- **Objective:** Implement panel production and the deduction-only panel-assembly posting per the corrected split verified in 11 sec. 2.1.
- **Refs:** 03 sec. 2, sec. 4.2 (panel rows); 11 sec. 2.1, sec. 2.4 (panel notes: no EmpID dimension; PcsType gate 'Piece' OR 'Panel'; rework exemption lacks the =2 case); 04 sec. 8; 02 sec. 11.
- **Owning docs:** 03, 11, 04
- **Preconditions:** WO-S4.1 (dispatcher + movement builders); Stage 3 exit.
- **Implementation steps:**
  1. Extend `src/posting/movements/panel.ts`: panel production adds to `Panel_StockTableQty` with the CompId dimension and NO EmpID dimension (key: ordId, styleNo, lotId, stageId, partId, godId, partyId|0, colorId, sizeId, compId, good).
  2. Gate panel paths on PcsType in {'Piece','Panel'} (OR semantics, verbatim from legacy gate).
  3. Implement assembly as deduction-only in `src/services/production/PanelAssemblyService.ts`: each component row from `Trs_AddPanelAsm_SourceDtl` (joined on compId + SourceStageId) deducts `Panel_StockTableQty`; the assembled part's ADD is NOT posted here.
  4. Wire the assembled part's add through the panel-production path (`Sp_ProductionEntryQty_Panel_1` -> `PROC_Stock_ProdPanel` parity) in the dispatcher (`panel_1` arm from WO-S4.1).
  5. Encode panel rework: any Rework != 0 consumes the 'M' panel bucket (NO Rework=2 exemption, unlike pieces).
  6. Add `app/api/production/panel-assembly/route.ts` (POST + DELETE) calling PanelAssemblyService; add the endpoint row to 04 sec. 8 in the same PR (G4).
  7. Tests in `tests/panel.assembly.test.ts`: production add, assembly deduct, rework-without-2-exemption, delete/restore.
- **Acceptance criteria:**
  - AC1: Given an assembly of 3 components, When saved, Then exactly 3 `Panel_StockTableQty` rows decrease (one per component, CompId+SourceStageId keyed) and NO row increases from the ASM path.
  - AC2: Given the matching panel-production entry for the assembled part, When saved through the `panel_1` path, Then the assembled part's `Panel_StockTableQty` row increases by the assembled qty - proving the add comes only from the production path.
  - AC3: Given any panel movement, When posted, Then the `EmpID` column remains NULL on every written `Panel_StockTableQty` row — panel ledger has no EmpID dimension.
  - AC4: Given a panel entry with Rework=2, When posted, Then the 'M' bucket IS consumed (no =2 exemption) - differs from piece behavior intentionally.
  - AC5: Given a mid-assembly failure (bad component id injected), When the tx aborts, Then zero component deductions persist (G1) and the assembly doc is not inserted.
- **Test commands:** `npm test -- tests/panel.assembly.test.ts`; `npm run lint`; `npm run build`
- **Out of scope:** piece (PCS) ledger semantics, piece DC/GRN (WO-S4.5), rejection entries (WO-S4.3), panel registers UI (WO-S4.10).
- **DoD checklist:**
  - [ ] AC1-AC5 verified by `tests/panel.assembly.test.ts`
  - [ ] G1 rollback test; G3 assembly delete restores component buckets
  - [ ] G4: 03 sec. 4.2 and 04 sec. 8 updated with the panel-assembly endpoint
  - [ ] G5: assembly route rights-gated (`production.panel.assembly`)
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S4.2 ticked

## WO-S4.3 — Piece/panel rejection entries (Trs_PcsRej) (M, S4)
- **Objective:** Implement rejection entries moving qty from the line 'G' bucket to the stage 'M' bucket with RejectionTypeId.
- **Refs:** 03 sec. 4.2 (rejection row); 11 sec. 2 (audit trail); 04 sec. 8 (`POST /api/production/rejection`); 02 sec. 11 (pieces/rejection); 05 sec. 1 (`pcsrej.recorded`).
- **Owning docs:** 03, 11, 04
- **Preconditions:** WO-S4.1; rejection-type master readable (`Mas_RejectionType` or legacy equivalent).
- **Implementation steps:**
  1. Write zod DTO `src/schemas/rejection.ts`: ordId, styleNo, lotId, stageId (Stk_StageId), partId, lineId, colorId, sizeId, RejectionTypeId, qty.
  2. Implement `src/services/production/RejectionService.ts`: in one tx - insert Trs_PcsRej rows, then movements.
  3. Movement builder `src/posting/movements/rejection.ts`: 'G' line bucket - qty (BOTH StockQty and ProductionQty columns) at Stk_StageId under the line (EmpID=lineId); 'M' bucket + qty (RejectionTypeId) at the stage under EmpID=0.
  4. Add `app/api/production/rejection/route.ts` (POST) and DELETE for reversal (compensating).
  5. Emit `pcsrej.recorded` outbox event; schedule ProductionDataProjector ('REJ' leg).
  6. Build `app/pieces/rejection/page.tsx` composing `src/components/production/RejectionForm.tsx` (frmPcsRej / frmPanelRej parity per 02 sec. 11).
  7. Tests in `tests/pieces.rejection.test.ts` incl. rollback and reversal.
- **Acceptance criteria:**
  - AC1: Given a line 'G' bucket of 100 pcs, When a 7-pc rejection (RejectionTypeId=3) is saved, Then the line 'G' row StockQty=93 AND ProductionQty=93, and the stage 'M' row (good='M', rejTypeId=3, EmpID=0) increases by 7.
  - AC2: Given a rejection save fails mid-transaction (injected), When aborted, Then both buckets and Trs_PcsRej are unchanged (G1).
  - AC3: Given a saved rejection, When reversed, Then StockQty, ProductionQty, and the 'M' bucket all return to pre-save values exactly (G3) and a `pcsrej.recorded` compensating event is emitted.
  - AC4: Given ProductionDataProjector runs after the rejection, Then the 'REJ' leg with the correct PartyId keying appears in ST_Production_Data deltas.
- **Test commands:** `npm test -- tests/pieces.rejection.test.ts`; `npm run lint`; `npm run build`
- **Out of scope:** barcode rejection scan chain (WO-S4.6), piece GRN RejPcs column (WO-S4.5), rejection registers (WO-S4.10).
- **DoD checklist:**
  - [ ] AC1-AC4 verified by `tests/pieces.rejection.test.ts`
  - [ ] G1/G3 tests present; G2 parity vs 03 sec. 4.2 rejection row
  - [ ] G4: 04 sec. 8 rejection row confirmed accurate
  - [ ] G5: route rights-gated (`pieces.rejection`)
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S4.3 ticked

## WO-S4.4 — Line input/output/transfer (corrected live behavior, dead legs NOT ported) (M, S4)
- **Objective:** Implement Trs_LineInput and Trs_LineTfr postings per the corrected live behavior, explicitly excluding the verified dead legs.
- **Refs:** 03 sec. 4.2 (Issue to line / Line transfer rows); 11 sec. 2.2, sec. 2.3, sec. 4 (dead-code register), sec. 5; 04 sec. 8 (`/api/production/line-input|line-tfr|issue-to-prdn`); 02 sec. 10 (lines pages).
- **Owning docs:** 03, 11, 04
- **Preconditions:** WO-S4.1; live-DB re-extract of `PROC_Stock_IssueToPrdn_Insert` and `PROC_Stock_LineTfr_Insert` diffed vs 11.
- **Implementation steps:**
  1. Implement `src/services/production/LineService.ts` with `lineInput(ctx, dto)` and `lineTransfer(ctx, dto)` in one tx each.
  2. LineInput movement (`src/posting/movements/line.ts`): + line bucket at TargetStageID (EmpID=line); AND - source-stage bucket (EmpID=0) when PcsType in {'Piece','Bit'} or source-stage = target-stage.
  3. LineTfr movement: + at TargetStage under TOEMPID; - at SourceStage under from-EMPID; same gate (PcsType in {'Piece','Bit'} or same-stage).
  4. Do NOT implement: the Despatch/Sales finished-bucket leg of IssueToPrdn (`@DelType` hardcoded '' - dead per 11 sec. 4), any RewrkStk legs of LineTfr (GAN flag unreachable), the `@PartyId` add-gate. Add a code comment in `src/posting/movements/line.ts` citing 11 sec. 4 line items.
  5. Routes: `app/api/production/line-input/route.ts`, `app/api/production/line-tfr/route.ts`, `app/api/production/line-out/route.ts` (LineOut wrapper routing to WO-S4.1 dispatcher), each with DELETE reversal.
  6. UI: `app/production/lines/input/page.tsx`, `app/production/lines/output/page.tsx`, `app/production/lines/transfer/page.tsx` per 02 sec. 10 (note in-page docs that dead legs are intentionally absent).
  7. Tests in `tests/line.deadlegs.test.ts`: live legs asserted, dead legs asserted absent.
- **Acceptance criteria:**
  - AC1: Given a Piece PcsType line-input of 50 pcs from stage 4 to line 9, When saved, Then line bucket (TargetStageID, EmpID=9) +50 and source-stage bucket (EmpID=0) -50 in the same tx.
  - AC2: Given a line transfer of 20 pcs from line 3 to line 7, When saved, Then TargetStage/TOEMPID=7 bucket +20 and SourceStage/EMPID=3 bucket -20; and given a PcsType outside {'Piece','Bit'} with different stages, When saved, Then the transfer is rejected by validation.
  - AC3: Given `grep -rn "RewrkStk" src/posting/movements/line.ts` and `grep -rn "DelType" src/posting/movements/line.ts`, When run, Then both return zero matches (dead legs not ported - structural proof).
  - AC4: Given a mid-tx failure, When aborted, Then no bucket changes and no Trs_LineInput/Trs_LineTfr rows persist (G1).
- **Test commands:** `npm test -- tests/line.deadlegs.test.ts`; `grep -rn "RewrkStk" src/posting/movements/line.ts || echo CLEAN`; `npm run lint`; `npm run build`
- **Out of scope:** despatch/Sales finished-bucket deduction (lives in WO-S4.5 PiecesDelivery), barcode scan chain (WO-S4.6), hourly settings pages.
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] G1 rollback test; G3 reversal test for both docs
  - [ ] G4: 02 sec. 10 lines pages annotated with dead-leg notes
  - [ ] G5: routes rights-gated (`production.lines`)
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S4.4 ticked

## WO-S4.5 — Piece DC/GRN with outside stitching (all corrected bucket rules) (L, S4)
- **Objective:** Implement piece process DC (incl. _LineStk variant, GAN rework path, despatch legs) and piece GRN (RewrkStk/RejStk columns, multi-stage, cutting-GRN) per the corrected 03 sec. 4.3.
- **Refs:** 03 sec. 4.3 (full table); 11 sec. 2.5, sec. 4 (PROC_PiecesReceipt_Delete dead restore), sec. 3; 04 sec. 6 (`POST /api/dc/pieces`), sec. 8 (`POST /api/production/pcs-grn`); 02 sec. 11 (pieces/receipt); 05 sec. 1 (`dc.created`, ST_Ord_inHand 'DES').
- **Owning docs:** 03, 11, 04
- **Preconditions:** WO-S4.1; Stage 3 exit; flags `GRNAcceptance_Pcs`, `JobWrkCuttingGrn` readable from FlagsProvider.
- **Implementation steps:**
  1. Write `src/services/dc/PiecesDcService.ts`: process DC = party bucket + at TargetStageID AND company bucket - at SourceStageID; both legs keyed by ProcessType ('P'->'G'/0, else 'M'/RejectionTypeId); 'JobWork Return' skips the party add.
  2. Implement `_LineStk` variant: a doc-level switch that changes ONLY the deduct legs to the line bucket (EmpID = SrcLineID); the party-add leg stays on EmpID=0.
  3. Implement despatch/Sales piece DC (`PROC_Stock_PiecesDelivery_Insert` parity): deduct the finished-stage bucket at FinishedStageID (-3 for Despatch, SourceStageID for Sales), 'G', PartyId=0; emit ST_Ord_inHand 'DES' scheduling (05).
  4. Implement the GAN rework path: Options.GRNAcceptance_Pcs='Y' AND order type 'W' AND ProcessType='R' -> deduct the `RewrkStk` column instead of the normal bucket.
  5. Write `src/services/production/PiecesGrnService.ts` (`PROC_PiecesReceipt_Insert` parity): company bucket at TargetStage + RecPcs (StockQty AND ProductionQty); RewrkPcs -> `RewrkStk` column and RejPcs -> `RejStk` column, both on the company 'G' row (NOT separate 'M' buckets); 'Process Return' reverses the party bucket (P->'G', R->'M'/RejectionTypeId); multi-stage GRN (DCTargetStage != stage) deducts combined RecPcs+RewrkPcs+RejPcs from the party bucket; cutting-GRN (JobWrkCuttingGrn='Y', stage 1, PcsType='Piece') additionally restores the party bucket.
  6. In the GRN delete path, implement BOTH 'F' and 'S' branch restores (the legacy commented-out 'S' Process-Return restore is fixed, per 11 sec. 4 note).
  7. Routes: `app/api/dc/pieces/route.ts` (+[id] DELETE), `app/api/production/pcs-grn/route.ts` (+[id] DELETE), `app/api/production/pcs-return/route.ts`; zod DTOs in `src/schemas/pieces.ts`.
  8. UI `app/pieces/receipt/page.tsx` per 02 sec. 11.
  9. Tests in `tests/pieces.dcgrn.test.ts`: every 03 sec. 4.3 row as a case.
- **Acceptance criteria:**
  - AC1: Given a Piece process DC (ProcessType='P') of 40 pcs from stage 5 to party 88, When saved, Then company bucket (stage 5, 'G', EmpID=0, PartyId per rule) -40 and party bucket (TargetStageID, party 88, 'G') +40.
  - AC2: Given the same DC saved with the _LineStk switch on, When saved, Then ONLY the deduct leg moves to the line row (EmpID=SrcLineID); the party add still lands on EmpID=0 (row-level assertion of both keys).
  - AC3: Given a GRN with RecPcs=100, RewrkPcs=5, RejPcs=3, When saved, Then the company 'G' row has StockQty+100 (ProductionQty+100), RewrkStk column +5, RejStk column +3 - and zero new 'M'-bucket rows are created by the GRN.
  - AC4: Given GRNAcceptance_Pcs='Y', order type 'W', ProcessType='R', When the rework DC posts, Then the deduction hits the RewrkStk column (not StockQty) - verified by column-level delta.
  - AC5: Given a mid-tx failure in either service, When aborted, Then all Pcs_StockTableQty columns and Trs_Pcs1/2 / Trs_PcsGrn1/2 rows are unchanged (G1) and no `dc.created` event emitted.
  - AC6: Given a saved GRN, When deleted, Then all buckets/columns return exactly to pre-save state, including the multi-stage party-deduct and cutting-GRN restore cases (G3).
- **Test commands:** `npm test -- tests/pieces.dcgrn.test.ts`; `npm run lint`; `npm run build`
- **Out of scope:** unit/godown ack parity procs (Stage 3 scope), barcode chain (WO-S4.6), registers (WO-S4.10), ST_Ord_inHand projector internals (exists since Stage 3).
- **DoD checklist:**
  - [ ] AC1-AC6 verified by `tests/pieces.dcgrn.test.ts`
  - [ ] G1 mid-failure test for DC and GRN; G3 delete-restore for all six bucket rules
  - [ ] G2 parity vs 03 sec. 4.3 expectations on golden set
  - [ ] G4: 03 sec. 4.3 / 04 sec. 6 / 04 sec. 8 updated on any refinement
  - [ ] G5: routes rights-gated (`dc.pieces`, `production.pcsgrn`)
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S4.5 ticked

## WO-S4.6 — Barcode chain: check APIs + one-transaction posting batch (L, S4)
- **Objective:** Implement the bundle/piece/rejection check APIs with verbatim legacy messages and the batch posting as ONE transaction with group-scoped flags and corrected defect behavior.
- **Refs:** 05 sec. 6 (full wiring block); 11 sec. 2.7, sec. 3 #4-#6, #8, sec. 4, sec. 6.2; 03 sec. 4.2; 04 sec. 8 (`/api/scan/*`); 02 sec. 10 (barcode scan station).
- **Owning docs:** 05, 11, 04
- **Preconditions:** WO-S4.1 and WO-S4.5 complete; 11 sec. 6.2 blocker closed first (re-verify `Sp_ProductionEntryQty` plain vs `_1` divergence and record the diff in 11 sec. 6); X3 sign-off (WO-X3) recorded before this WO closes (deviation #6 rejection counter); configured production-DB connection available (`src/db/prodDb.ts`).
- **Implementation steps:**
  1. Write `src/services/scan/checks/bundleCheck.ts` (`SP_BundleBarcode_Check` parity) with VERBATIM messages: `INVALID TAG`, `ALREADY ISSUED TO LINE`, `BUNDLE COMPLETED`; scope every bundle-row update (incl. Completed='Y') by the scanned barcode - fixing 11 sec. 3 #8.
  2. Write `src/services/scan/checks/pieceCheck.ts` (`SP_PcsBarcode_Check` parity): route validation (Prod_Sequence), contractor allotment, final-stage gate with verbatim `FINAL PROCESS PRODUCTION MADE`, rework approval gate; do NOT stamp GoodPcs on duplicate-row ELSE without insert (dead branch per 11 sec. 4).
  3. Write `src/services/scan/checks/rejectionCheck.ts` (`SP_PcsBarcode_Check_Rejection` parity) with CORRECTED counters per 11 sec. 3 #6: the rejection path increments RejectionPcs (never `Pay_BarcodeGeneration.goodpcs`); the duplicate-row ELSE branch does not double-count.
  4. Access `Pay_BundlePcs_Barcode` / `Pay_BarcodeGeneration` via the CONFIGURED production DB connection from `src/db/prodDb.ts` - no hardcoded `Fiber_production` string, no unused @ProdDB param ported (11 sec. 4).
  5. Write `src/services/scan/PostingBatchService.ts` (`SP_Barcode_Production_Posting` parity, corrected): group unposted Pay rows by (ProdDate, ordId, stageId, partId, sizeId, lineId, lotId, sourceStageId) - keep the legacy GROUP BY key (header-per-size granularity) - but post the WHOLE batch in ONE transaction; on any error ROLLBACK everything (fixes 11 sec. 3 #4: no doomed-tran leak, no mis-closed cursors, no @@ERROR-in-CATCH).
  6. Stamp PostingFlg='Y' GROUP-SCOPED (the group key + ProdDate + ordId), never by ProdDate alone (fixes 11 sec. 3 #5: other orders' unposted rows on the same date stay 'N').
  7. Routes: `app/api/scan/bundle/route.ts`, `app/api/scan/piece/route.ts`, `app/api/scan/rejection/route.ts`, `app/api/scan/posting/route.ts` (rights `scan.posting` for posting), `app/api/scan/history/route.ts`.
  8. Tests in `tests/barcode.check.test.ts` (message strings verbatim) and `tests/barcode.posting.test.ts` (grouping, flags, rollback).
- **Acceptance criteria:**
  - AC1: Given an unknown bundle code, When POST `/api/scan/bundle`, Then the response body contains the exact string `INVALID TAG`; given an already-issued bundle, the exact string `ALREADY ISSUED TO LINE`; given a completed bundle, the exact string `BUNDLE COMPLETED` (byte-equal assertions).
  - AC2: Given a piece scan at the final stage after final production exists, When POST `/api/scan/piece`, Then the response contains the exact string `FINAL PROCESS PRODUCTION MADE` and no Pay row is written.
  - AC3: Given a rejection scan of a valid piece, When POST `/api/scan/rejection`, Then `Pay_BarcodeGeneration.RejectionPcs` increases by 1 and `goodpcs` is UNCHANGED (corrected #6 counter proof).
  - AC4: Given two orders A and B with unposted rows on the same ProdDate and a posting batch run for order A only, When it completes, Then all order-A group rows have PostingFlg='Y' and ALL order-B rows still have PostingFlg='N' (group-scoped flag proof).
  - AC5: Given an injected failure midway (e.g., invalid stageId on row 3 of 5), When POST `/api/scan/posting`, Then the transaction rolls back completely: zero Trs_ProdEntry/Trs_ProdEntryQty rows, zero Pay flag changes, zero Pcs_StockTableQty changes (G1 + defect #4 proof).
  - AC6: Given grep for the hardcoded cross-db name, When `grep -rn "Fiber_production" src/` runs, Then zero matches (connection is config-driven).
- **Test commands:** `npm test -- tests/barcode.check.test.ts tests/barcode.posting.test.ts`; `grep -rn "Fiber_production" src/ || echo CLEAN`; `npm run lint`; `npm run build`
- **Out of scope:** ScanConsole UI and offline queue (WO-S4.7), ST_Production_Data projector (WO-S4.8), TrackEvent emission (WO-S7.3).
- **DoD checklist:**
  - [ ] AC1-AC6 verified
  - [ ] X3 sign-off sheet references this WO's #6 deviation explicitly
  - [ ] G1 rollback proof (AC5); G2 parity vs golden barcode set; G3 batch delete restores flags and buckets
  - [ ] G4: 05 sec. 6 updated (group-scoped flags + corrected counters already described - confirm wording matches code)
  - [ ] G5: `/api/scan/posting` rights-gated
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S4.6 ticked

## WO-S4.7 — ScanConsole + offline queue (desktop + /m/scan) (M, S4)
- **Objective:** Build the scan-station console with keyboard-wedge input, offline IndexedDB queue with idempotency-key replay, and mobile scan surface.
- **Refs:** 02 sec. 10 (barcode page: ScanConsole, ScanQueueOffline, ScanHistory); 05 sec. 3 (offline replay + idempotency keys); 04 sec. 8 (`GET /api/scan/history`); inlined S4 exit rule: the scan station works offline.
- **Owning docs:** 02, 05, 04
- **Preconditions:** WO-S4.6 (check + posting endpoints live); S1.8 (MobileShell).
- **Implementation steps:**
  1. Build `src/components/production/ScanConsole.tsx`: keyboard-wedge capture first, camera fallback (zxing wasm), posting to `/api/scan/piece|rejection` with the verbatim message banner area.
  2. Build `src/lib/offline/idbQueue.ts` (IndexedDB store) with fields: id (uuid = idempotency key), endpoint, payload, createdAt, retries.
  3. Build `src/components/production/ScanQueueOffline.tsx`: queue view + replay worker that replays with the SAME idempotency key and skips server-acknowledged duplicates (double-posting prevention per 05 sec. 3).
  4. Server side: accept `X-Idempotency-Key` header in `app/api/scan/piece/route.ts`, `app/api/scan/rejection/route.ts`, `app/api/scan/posting/route.ts`; short-circuit replayed keys with the original result.
  5. Build `app/production/barcode/page.tsx` and `app/m/scan/page.tsx` shells wiring the components; scan history at `app/production/barcode/history/page.tsx` reading `GET /api/scan/history`.
  6. Tests: `tests/scan.offline.test.ts` (queue serialization, idempotent replay) and a component test `tests/scanconsole.component.test.tsx`.
- **Acceptance criteria:**
  - AC1: Given the network is down, When 10 scans are entered, Then 10 queue entries exist in IndexedDB and the UI shows queued-count 10 with no error banner.
  - AC2: Given connectivity returns, When replay runs, Then each queued scan posts exactly once: server records 10 new Pay rows for the batch and the second replay attempt of the same keys creates 0 additional rows (idempotency proof).
  - AC3: Given a scan previously acknowledged, When its idempotency key is replayed, Then the API returns the original response (HTTP 200 with duplicate:true) and does not re-run validations that mutate state.
  - AC4: Given the offline flag flips 3 times during a session, When the session ends, Then total server-visible scans equals total entered scans (no loss, no duplication).
- **Test commands:** `npm test -- tests/scan.offline.test.ts tests/scanconsole.component.test.tsx`; `npm run lint`; `npm run build`
- **Out of scope:** check-API semantics (WO-S4.6), QR TrackUnit codes (WO-S7.2/S7.6), hourly production boards.
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] G5: scan station rights-gated (`scan.station`), mobile parity via session
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] G4: 02 sec. 10 barcode page tree updated if components changed
  - [ ] PROGRESS.md change-log line added; TASKS.md S4.7 ticked

## WO-S4.8 — ST_Production_Data projector (5 trans types) (M, S4)
- **Objective:** Implement ProductionDataProjector maintaining ST_Production_Data with the five verified transaction types and PartyId/zeroing rules.
- **Refs:** 03 sec. 5 (ProductionDataProjector row); 11 sec. 2.6 (5th type 'REWRK'; PartyId keys only DC/GRN/REJ; zeroing only on DC '-'); 05 sec. 2 (projector pipeline, SUM-recompute strategy).
- **Owning docs:** 03, 11, 05
- **Preconditions:** WO-S4.1, WO-S4.3, WO-S4.5 (event sources exist); S2.2 (ProjectorRunner).
- **Implementation steps:**
  1. Write `src/projectors/ProductionDataProjector.ts` implementing `SP_ST_Production_Data` parity with types 'PRDN', 'DC', 'GRN', 'REJ', 'REWRK' (ReworkQty).
  2. Key rules: PartyId is part of the ST_Production_Data key ONLY for DC/GRN/REJ legs; PRDN and REWRK legs key without PartyId.
  3. Zeroing rule: OrderQty and OrderWithExsQty are zeroed ONLY on a DC '-' leg - no other type touches them.
  4. Recompute from SUM(documents) per affected key (05 sec. 2 strategy), not incremental arithmetic; set UpdateFlg=1 on every write (sync queue).
  5. Subscribe to `prodentry.posted/reversed`, `dc.created/reversed` (piece), `pcsrej.recorded` via the outbox consumer in `src/projectors/worker.ts`.
  6. Tests `tests/projection.productionData.test.ts`: one case per type, the keying matrix, zeroing rule, and back-dated self-heal.
- **Acceptance criteria:**
  - AC1: Given a rework production entry, When the projector runs, Then a 'REWRK' delta with ReworkQty appears in ST_Production_Data keyed WITHOUT PartyId.
  - AC2: Given a DC '-' leg for order X, When the projector rebuilds, Then OrderQty and OrderWithExsQty both become 0 for that key; given a GRN or REJ leg on the same order, When it rebuilds, Then those two columns are unchanged (zeroing rule proof).
  - AC3: Given a back-dated production entry inserted after later entries, When the projector rebuilds the affected key, Then the bucket equals the SUM over all documents for that key (self-heal parity).
  - AC4: Given any projector write, When inspected, Then UpdateFlg=1 is set on the row (Commando sync parity).
- **Test commands:** `npm test -- tests/projection.productionData.test.ts`; `npm run lint`; `npm run build`
- **Out of scope:** WBS projector (Stage 6), wages accrual (WO-S4.9), TraceProjector (WO-S7.4).
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] G2 parity vs SP_ST_Production_Data expectations on golden set
  - [ ] G4: 03 sec. 5 row confirmed accurate; update if guards found
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S4.8 ticked

## WO-S4.9 — Wages accrual hooks (Pay flag + Trs_ProdWages entry UI) (S, S4)
- **Objective:** Wire wage accrual to production events via the Trs_ProdEntry Pay flag and provide shift-wages entry.
- **Refs:** 02 sec. 10 (PayToggle), sec. 15 (payroll tree); 04 sec. 10 (`POST /api/payroll/shift-wages`, wage registers); 05 sec. 1 (`prodentry.posted` -> wages accrual, `wages.booked`).
- **Owning docs:** 02, 04, 05
- **Preconditions:** WO-S4.1 (Pay flag on entry), WO-S4.8 (ST_Production_Data as piece-rate source).
- **Implementation steps:**
  1. Persist the Pay flag on Trs_ProdEntry in the WO-S4.1 save path (column parity).
  2. Write `src/services/payroll/WagesAccrualService.ts`: on `prodentry.posted` with Pay='Y', append piece-rate accrual rows to `Pay_ProdWorkDetails` (piece-rate parity from 02 sec. 15).
  3. Add `app/api/payroll/shift-wages/route.ts` (POST) with zod DTO `src/schemas/payroll.ts` (ShiftWages, Addl_Amount, no_of_persons).
  4. UI: `app/payroll/shift-wages/page.tsx` and the wages-link view `app/pieces/wages-link/page.tsx` (flag `reqd_actual_production_wage_arrived_with_payrolllink`).
  5. Emit `wages.booked` outbox event; schedule DailyUnitP&L projector keys (consumed in Stage 6).
  6. Tests `tests/wages.accrual.test.ts`.
- **Acceptance criteria:**
  - AC1: Given a production entry saved with Pay='Y', When the outbox processes `prodentry.posted`, Then Pay_ProdWorkDetails gains accrual rows matching qty x part-rate; given Pay='N', zero rows are added.
  - AC2: Given a shift-wages save of 20 persons at 500 with Addl_Amount 1000, When posted, Then Trs_ProdWages row totals 11000 and a `wages.booked` event is emitted.
  - AC3: Given an entry reversal, When processed, Then the accrual rows are compensated (net zero) in the same flow (G3).
- **Test commands:** `npm test -- tests/wages.accrual.test.ts`; `npm run lint`; `npm run build`
- **Out of scope:** daily P&L math (WO-S6.2), wages registers (already Stage 6 scope), piece-rate wage register pages.
- **DoD checklist:**
  - [ ] AC1-AC3 verified
  - [ ] G1 transaction on shift-wages save; G5 rights-gated (`payroll.shift`)
  - [ ] G4: 02 sec. 15 / 04 sec. 10 rows confirmed
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S4.9 ticked

## WO-S4.10 — Production/panels/pieces registers + status/track pages (M, S4)
- **Objective:** Deliver the production entry/status/track registers and piece/panel stock browsers as report-job-backed screens.
- **Refs:** 02 sec. 10 (registers: entry, status, track), sec. 11 (pieces/stock); 05 sec. 7 (report job lifecycle, jobId staging); 04 sec. 10 (`POST /api/reports/:id/run`, `GET /api/reports/jobs/:jobId`); X2 registry for parameters.
- **Owning docs:** 02, 05, 04
- **Preconditions:** WO-S4.1-S4.5, WO-S4.8 (data sources complete); S2.5 (report job runner); X2 registry entries for these reports.
- **Implementation steps:**
  1. Implement register services in `src/services/reports/ProductionRegistersService.ts`: `entryRegister`, `statusRegister` (FrmProductionStatusReg + FrmInhouseProductionStatusReg variants), `ordProdTrack` (FrmOrdProdTrack), reading Trs_ProdEntry(+Qty) joined ST_Production_Data.
  2. Stage results into ReportJobRows(jobId) - no Temp_* tables (05 sec. 7).
  3. Wire report catalog ids in `src/reports/registry.ts` (from X2 extraction) with param schemas.
  4. Pages: `app/production/registers/entry/page.tsx`, `app/production/registers/status/page.tsx`, `app/production/registers/track/page.tsx`, `app/pieces/stock/page.tsx` (Pcs_/Panel_StockTable(Qty) browser with stage x line x G/M filters per 02 sec. 11).
  5. Reuse DataTable with client sort/group (FlexGrid parity per 02 sec. 21).
  6. Tests `tests/production.registers.test.ts` with seeded golden data comparing register rows vs expected legacy view output.
- **Acceptance criteria:**
  - AC1: Given seeded golden production data, When the entry register runs, Then the staged rows match the expected row count and totals from the legacy FrmProductionEntryReg comparison fixture (G2).
  - AC2: Given the piece stock browser with filters stage=7, line=3, good='M', When loaded, Then only matching Pcs_StockTableQty rows render with StockQty/ProductionQty/RewrkStk/RejStk columns visible.
  - AC3: Given a register run, When it completes, Then results are retrievable via `GET /api/reports/jobs/:jobId` with paging and totals, and rows expire per job policy (no Temp_ cleanup screens needed).
  - AC4: Given a user without the register right, When opening any register page, Then access is denied (G5).
- **Test commands:** `npm test -- tests/production.registers.test.ts`; `npm run lint`; `npm run build`
- **Out of scope:** MIS dashboards (WO-S6.5), order river (WO-S7.5), print layouts beyond the shared PrintLayout.
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] G2 parity fixture committed under `tests/fixtures/`
  - [ ] G5: all four pages rights-gated
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S4.10 ticked

## WO-S5.1 — Rate-confirm flow + DC guards (M, S5)
- **Objective:** Implement pending/approved rate confirmation and the DC-blocking guards that consume it.
- **Refs:** 04 sec. 4 (`GET /api/purchase/rate-confirm`, `POST .../approve`, rate masters); 03 sec. 6 (`need_rate_conf_for_dc`, `rateconfirmcheck(+dev)`); 05 sec. 4 (approval type rate-confirm); 02 sec. 5 (procurement tree).
- **Owning docs:** 04, 03, 05
- **Preconditions:** S3.3 (PO family), S1.2 (rights), approval engine from Stage 2 approval infra; Stage 4 exit.
- **Implementation steps:**
  1. Write `src/services/purchase/RateConfirmService.ts`: `list(state)` parity with SP_PendingRateCnf / SP_ApprovedRateCnf1; `approve(id)` sets `Pro_RateCnfPcs2.Approved=1` in one tx with audit.
  2. Write `src/services/guards/RateConfirmGuard.ts`: blocks process DC creation when `need_rate_conf_for_dc` is on and no approved rate exists for the (party, order, stage, part); `rateconfirmcheck` + dev percent drives warn vs block.
  3. Hook the guard into DcService.fabric and DcService.pieces pre-validation chains.
  4. Routes: `app/api/purchase/rate-confirm/route.ts`, `app/api/purchase/rate-confirm/[id]/approve/route.ts`; rate masters `app/api/masters/rate/route.ts` plus the three sibling UI routes `app/purchase/rates/prdn/page.tsx`, `app/purchase/rates/comm/page.tsx`, `app/purchase/rates/default/page.tsx`.
  5. UI `app/purchase/rate-confirm/page.tsx` (pending/approved tabs) + approval inbox card type `rate-confirm` (05 sec. 4).
  6. Tests `tests/rateconfirm.test.ts`.
- **Acceptance criteria:**
  - AC1: Given `need_rate_conf_for_dc`='Y' and no approved rate for party 12 / order 77 / stage 4, When POST `/api/dc/fabric` for that pair, Then the request fails with the legacy guard message and no Trs_Del rows are written.
  - AC2: Given the rate is then approved via POST `/api/purchase/rate-confirm/:id/approve`, Then `Pro_RateCnfPcs2.Approved=1` is committed and the same DC POST succeeds.
  - AC3: Given `rateconfirmcheck` deviation percent exceeded, When the DC rate deviates beyond it, Then warn mode returns HTTP 200 with a `warning[]` entry containing the flag name `rateconfirmcheck`, and block mode returns HTTP 400 with `error.code='RATE_CONFIRM_REQUIRED'` (both branches tested).
  - AC4: Given an approve action, When it commits, Then an approval-decision event refreshes desktop and mobile inboxes via SSE (05 sec. 4).
- **Test commands:** `npm test -- tests/rateconfirm.test.ts`; `npm run lint`; `npm run build`
- **Out of scope:** cumulative rate engine (WO-S5.6 - different concept), bills register (WO-S5.2), piece-rate masters UI beyond the API.
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] G1 tx on approve; G5 rights (`purchase.rateconfirm.approve` distinct from view)
  - [ ] G4: 04 sec. 4 rows confirmed
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S5.1 ticked

## WO-S5.2 — Bills register variants + bill-pass + add/ded heads (L, S5)
- **Objective:** Implement the five bills-register variants, bill-pass with TDS and double-pass control, and add/deduction heads.
- **Refs:** 04 sec. 9 (bills endpoints); 02 sec. 13 (bills tree: register, pass, supplier, add-ded, non-billable); 03 sec. 6 (`bill_bcheck(+dev)`, `doublebillpassreqd`, `billdtchk_serverdt(+dev)`); 05 sec. 1 (`bill.passed` -> cumulative-rate update, payment queue, TDS report).
- **Owning docs:** 04, 02, 03
- **Preconditions:** Stage 4 exit; S3.3/S3.4 (PO + purchase GRN data for 3-way checks); approval engine.
- **Implementation steps:**
  1. Write `src/services/commercial/BillingService.ts`: `register(variant)` for yarn/fab/acc/cm/prd with SP_BillsRegView_* parity (jobId staging per 05 sec. 7); `pass(id, dto)` setting PassFlg, TDS_Percent/TDSAmount in one tx.
  2. Encode guards: `bill_bcheck` + dev (bill vs GRN/DC qty), `doublebillpassreqd` (second-pass requirement), `billdtchk_serverdt` + dev (back-dating).
  3. Add/ded heads: master CRUD on `Mas_AddDed` + per-bill line application; register page `app/commercial/bills/add-ded/page.tsx`.
  4. Emit `bill.passed` (drives WO-S5.6 rate update + payment queue + TDS report rows).
  5. Routes: `app/api/commercial/bills/route.ts`, `app/api/commercial/bills/[id]/pass/route.ts`; UI pages `app/commercial/bills/register/page.tsx`, `app/commercial/bills/pass/page.tsx`, `app/commercial/bills/supplier/page.tsx`, `app/commercial/bills/non-billable/page.tsx`.
  6. Tests `tests/bills.test.ts` incl. TDS math, double-pass, rollback.
- **Acceptance criteria:**
  - AC1: Given a bill of net 100000 with TDS_Percent 2, When passed, Then TDSAmount=2000 is stored, PassFlg=1 commits, and a `bill.passed` event is emitted with the bill id in the payload.
  - AC2: Given `doublebillpassreqd`='Y' and only one pass recorded, When the register renders, Then the bill shows as pending second pass and is excluded from the payment queue.
  - AC3: Given `bill_bcheck` deviation exceeded (bill qty 110 vs GRN 100 with dev 5), When passing, Then warn mode returns HTTP 200 with a `warning[]` entry containing the flag name `bill_bcheck`, and block mode returns HTTP 400 with `error.code='BILL_BAL_DEV'` and zero columns changed (G1).
  - AC4: Given variant='prd', When the register runs, Then rows match the SP_BillsRegView_prd golden fixture (G2) and are served from ReportJobRows by jobId.
- **Test commands:** `npm test -- tests/bills.test.ts`; `npm run lint`; `npm run build`
- **Out of scope:** debit notes (WO-S5.4), payments (WO-S5.5), to-be-value (WO-S5.7), Tally export (WO-S5.8).
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] G1 mid-pass rollback test; G2 fixture for at least prd + fab variants
  - [ ] G5: pass action rights-gated (`commercial.billpass`)
  - [ ] G4: 04 sec. 9 / 02 sec. 13 confirmed
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S5.2 ticked

## WO-S5.3 — Sales invoice family + packing lists (L, S5)
- **Objective:** Implement sales/commercial/local/piece invoice variants with DC attach, state-wise GST split, HSN fallback, prefixes, plus packing lists.
- **Refs:** 04 sec. 9 (invoice + packing endpoints); 02 sec. 13 (invoices + packing-list trees); 05 sec. 1 (`invoice.created` -> ST_Ord_inHand 'DES', GST registers, Tally queue); 03 sec. 6 (saledccuminvreq adjacent checks live in 02 sec. 13); 03 sec. 7 (prefixes from Mas_SalesGrp).
- **Owning docs:** 04, 02, 05
- **Preconditions:** WO-S4.5 (piece despatch legs), S3.x sales DC (Stage 3), WO-S5.2 (bill context for commercial invoice); HSN master placeholder until WO-S5.8 (read-only fallback to Trs_Del4 works standalone).
- **Implementation steps:**
  1. Write `src/services/commercial/InvoiceService.ts` with four variants (sales, commercial, local, piece) sharing one tx template (04 sec. 14).
  2. Implement DcAttachPanel backing: pick DCs -> invoice lines (rate x RateUom); flag `saledccuminvreq` routes to DelCumInv set.
  3. Write `src/services/commercial/gstSplit.ts`: same-state -> CGST+SGST halves, other-state -> IGST; HSN from HSN master else Trs_Del4 override.
  4. Numbering via NumberingService with Mas_SalesGrp prefixes; commercial variant encodes `convinvreq` and `commercialinvexcamtper` exchange amount rules.
  5. Piece invoice (no_of_box, pcs_per_box) and packing lists via `src/services/commercial/PackingService.ts` (Domestic/Solid variants).
  6. Emit `invoice.created`; schedule OrdInHandProjector 'DES' leg and GST register rows; enqueue Tally export.
  7. Routes under `app/api/commercial/invoice/{sales,commercial,local,piece}/route.ts`, `app/api/commercial/packing-list/route.ts`; UI pages `app/commercial/invoices/sales/page.tsx`, `app/commercial/invoices/commercial/page.tsx`, `app/commercial/invoices/local/page.tsx`, `app/commercial/invoices/piece/page.tsx`, and `app/commercial/packing-list/page.tsx`.
  8. Tests `tests/invoice.gst.test.ts` (state split matrix) and `tests/invoice.family.test.ts` (variants + rollback).
- **Acceptance criteria:**
  - AC1: Given an invoice to a same-state party with taxable 50000 and GST 18, When saved, Then CGST=4500 and SGST=4500 store (no IGST row); given an other-state party, Then a single IGST=9000 row stores (both branches asserted).
  - AC2: Given an item with no HSN master row but a Trs_Del4 override '6110', When saved, Then the invoice line uses '6110' for GST and e-way fields.
  - AC3: Given a mid-save failure after the first invoice line, When aborted, Then zero Trs_Salinv rows, zero ST_Ord_inHand changes, and no `invoice.created` event (G1).
  - AC4: Given a piece invoice with no_of_box=10 and pcs_per_box=24, When saved, Then 240 pcs are invoiced and the packing list lines mirror the box split.
  - AC5: Given an invoice is reversed, When compensated, Then GST register rows and the 'DES' leg revert exactly (G3).
- **Test commands:** `npm test -- tests/invoice.gst.test.ts tests/invoice.family.test.ts`; `npm run lint`; `npm run build`
- **Out of scope:** HSN master CRUD (WO-S5.8), Tally export file format (WO-S5.8), debit notes (WO-S5.4), buyer P&L (WO-S6.5).
- **DoD checklist:**
  - [ ] AC1-AC5 verified
  - [ ] G1 rollback proof; G3 reversal proof; G2 parity vs SP_Vue_SalesInvoice fixtures
  - [ ] G5: invoice screens rights-gated (`commercial.invoice`)
  - [ ] G4: 04 sec. 9 / 02 sec. 13 confirmed
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S5.3 ticked

## WO-S5.4 — Debit notes (yarn/fab/acc, FCY at PO rate) + registers (M, S5)
- **Objective:** Implement debit notes including FCY conversion at PO rate and their registers.
- **Refs:** 04 sec. 9 (`POST /api/commercial/debit` + register); 02 sec. 13 (debits tree: new, direct, register); 05 sec. 1 (`debit.created` -> party balance adjust); 03 sec. 6 (loss/shrinkage tolerances dyeinggamtper, knittinggamtper feed suggested debits).
- **Owning docs:** 04, 02, 03
- **Preconditions:** WO-S5.2 (bill context), Stage 3 PO data (PO rates available).
- **Implementation steps:**
  1. Write `src/services/commercial/DebitService.ts`: create (Trs_Deb1/2 with Brnid link), direct-debit variant, reverse; one tx each.
  2. FCY rule: foreign-currency debit amounts convert at the ORIGINAL PO rate of the referenced PO line, not current rate.
  3. Register variants yarn/fab/acc with SP_Rpt_DebitNote* parity staged by jobId.
  4. Emit `debit.created`; schedule PartyBalanceAbsProjector adjustment.
  5. Route `app/api/commercial/debit/route.ts` (+ register GET); UI `app/commercial/debits/new/page.tsx`, `app/commercial/debits/register/page.tsx`.
  6. Tests `tests/debitnote.test.ts`.
- **Acceptance criteria:**
  - AC1: Given an FCY PO line at rate 82.50 and a debit of USD 100, When saved, Then the INR amount posts as 8250 exactly (PO-rate conversion proof).
  - AC2: Given a debit referencing loss evidence with dyeing loss 8% vs `dyeinggamtper` 6, When saved, Then the tolerance context is attached to the debit row for the register's exception column.
  - AC3: Given a mid-tx failure, When aborted, Then zero Trs_Deb1/2 rows and no party-balance change (G1).
  - AC4: Given a saved debit, When reversed, Then party balance returns to the pre-debit value exactly (G3) and a `debit.created` compensating event flows.
- **Test commands:** `npm test -- tests/debitnote.test.ts`; `npm run lint`; `npm run build`
- **Out of scope:** payments (WO-S5.5), to-be-value (WO-S5.7), AI debit assist (WO-S8.x scope in file 2).
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] G1/G3 proofs; G2 register fixture for one variant
  - [ ] G5: rights-gated (`commercial.debit`)
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S5.4 ticked

## WO-S5.5 — Payments (+wages) + registers + wage-cost order transfer (M, S5)
- **Objective:** Implement payment entry (incl. wages variant), registers, and transfer of wage cost onto orders.
- **Refs:** 04 sec. 9 (payment endpoints); 02 sec. 13 (payments tree: page, wages, register); 05 sec. 1 (`wages.booked`, payment queue from `bill.passed`); 03 sec. 9 (wage-cost legs feeding costing).
- **Owning docs:** 04, 02, 05
- **Preconditions:** WO-S5.2 (payment queue), WO-S4.9 (wage accrual), WO-S5.6 not required (payments do not consume cumulative rate).
- **Implementation steps:**
  1. Write `src/services/commercial/PaymentService.ts`: create (FrmPaymentReg parity) with party, mode, amount, allocation to passed bills; wages variant (FrmPaymentReg_Wages).
  2. Order-transfer of wage cost: wage payment lines allocate to (ordId, stage) cost legs consumed by WO-S6.1/S6.2 pipelines.
  3. Register + ledger views with CachedRptPayment* parity staged by jobId.
  4. One tx per payment; emit a payment event; update bill allocation state.
  5. Routes `app/api/commercial/payment/route.ts` (+ wages); UI `app/commercial/payments/page.tsx`, `app/commercial/payments/wages/page.tsx`, `app/commercial/payments/register/page.tsx`.
  6. Tests `tests/payments.test.ts`.
- **Acceptance criteria:**
  - AC1: Given a payment of 50000 allocated across two passed bills (30000 + 20000), When saved, Then both bills' paid amounts update and the payment register reflects the split (row assertions).
  - AC2: Given a wages payment of 80000 across 3 orders, When saved, Then wage-cost legs of 3 orders increase by their allocations summing to 80000 (order-transfer proof).
  - AC3: Given a mid-tx failure, When aborted, Then payment row, allocations, and wage legs are all unchanged (G1).
  - AC4: Given a wages payment, When posted, Then a `wages.booked`-linked cost event schedules the DailyUnitP&L projector keys (Stage 6 consumer).
- **Test commands:** `npm test -- tests/payments.test.ts`; `npm run lint`; `npm run build`
- **Out of scope:** TDS computation (lives in bill-pass WO-S5.2), Tally export (WO-S5.8), daily P&L math (WO-S6.2).
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] G1 rollback proof; G3 payment reversal (delete allocates back)
  - [ ] G5: rights-gated (`commercial.payment`)
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S5.5 ticked

## WO-S5.6 — Cumulative-rate engine (root-trigger parity, no ordid=2028 filter) (L, S5)
- **Objective:** Implement the cumulative process-rate engine with root `Tgr_StockRatePost` parity, excluding the hardcoded test-data filter defect.
- **Refs:** 03 sec. 4.5 (full block incl. consumers list); 11 sec. 2.8 (root 2025 vs Updated 2021 divergence), sec. 3 #1 (ordid=2028 defect: DO NOT PORT); 05 sec. 1 (`bill.passed` -> cumulative-rate update); 04 sec. 9 (rate consumers).
- **Owning docs:** 03, 11, 04
- **Preconditions:** WO-S5.2 (bill lines: Trs_BillRate.NetAmount feeds rates); live-DB re-extract of the ACTUAL `Tgr_StockRatePost` trigger diffed vs root file before coding (11 sec. 6.3); Stage 4 exit.
- **Implementation steps:**
  1. Write `src/services/rates/CumulativeRateService.ts` implementing: on StockRatePost insert/update/delete, walk depts in Sno order (cursor parity, exclude ordermas.jobno=0).
  2. Branches: Prs=1 -> cumbillrate = Billrate else Procrate (yarn base); Prs=2 -> yarn + dyeing with sample branch (@Y_Rate+@Rate) vs order branch (consPer-weighted Prog_Ycns yarn sum + rate); Prs=4 or DeptGrpCode=4 -> knitting; Prs=-4 -> YTwist (Prog_YTwist_MAs wgtper); else -> own rate + previous-Sno cumbillrate scanning backwards with YF='Y' vs 'F' legs.
  3. Special cases: blended counts (Pro_YrnCns / Prog_Ycns percent), dept 15 FABRIC TO YARN via Prog_ClrComb.LooseFab gated by Options1.FabToYarnRate_ReqInKnit, parallel sample-order copy (ordertype='Sample' or no OrdSeq rows).
  4. Rewrite the FTY previous-rate query WITHOUT the hardcoded `ordid=2028 and sno=4 and cntid=229 and colid=151` filter - previous rate resolves for ALL orders from the prior-Sno row (11 sec. 3 #1).
  5. Expose consumers: `computeForOrder(ordId)` used by PartyOutQry valuation (WO-S5.7), SP_BilltoBeValue, budget-vs-actual (WO-S6.1), piece cost (PcsStockRatePost parity hook).
  6. Build `src/components/commercial/CumulativeRateCard.tsx` showing per-stage rate build-up for an order.
  7. Tests `tests/cumulative.rate.test.ts`: golden multi-dept chains (yarn->knit->dye->stitch), sample vs order branch, YTwist, blended counts, FTY-without-filter case.
- **Acceptance criteria:**
  - AC1: Given a golden 4-dept chain (yarn, knitting, dyeing, stitching) with known bills, When the engine runs, Then each stage's cumbillrate matches the expected fixture values derived from the root trigger for EVERY test order (not just one).
  - AC2: Given two orders sharing a dept chain, When the FTY previous-rate branch executes, Then BOTH orders receive a non-zero previous rate (defect #1 excluded - the branch that returned 0 for other orders does not exist here).
  - AC3: Given `grep -rn "2028" src/services/rates/`, When run, Then zero matches (structural no-port proof).
  - AC4: Given Options1.FabToYarnRate_ReqInKnit='N', When a knitting+LooseFab order computes, Then the fabric-to-yarn contribution is absent; given 'Y', Then it is included at the Prog_ClrComb.LooseFab weight (flag gate both ways).
  - AC5: Given a bill is passed (WO-S5.2 event), When the rate row updates, Then downstream valuation reads (party value outstanding) reflect the new rate within the same ProjectorWorker batch (single outbox drain) — verified via projector test.
- **Test commands:** `npm test -- tests/cumulative.rate.test.ts`; `grep -rn "2028" src/services/rates/ || echo CLEAN`; `npm run lint`; `npm run build`
- **Out of scope:** PartyOutQry UI (WO-S5.7), budget-vs-actual aggregation (WO-S6.1), order river value columns (WO-S7.5).
- **DoD checklist:**
  - [ ] AC1-AC5 verified
  - [ ] G2 parity: run engine side-by-side with extracted trigger semantics on golden orders; record diff note in 11 sec. 6 if drift found
  - [ ] G4: 03 sec. 4.5 updated if the live trigger diff reveals new branches
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S5.6 ticked

## WO-S5.7 — Party balances (abs/prog) + value outstanding + to-be-value accrual (M, S5)
- **Objective:** Deliver party balance views (absolute, program, value-at-cumulative-rate) and unbilled to-be-value accrual.
- **Refs:** 04 sec. 9 (party-balance + to-be-value endpoints); 03 sec. 5 (PartyBalanceAbsProjector), sec. 4.5 (consumers); 02 sec. 13 (party-balance tree: page, outstanding, lookup); 05 sec. 1-sec. 2.
- **Owning docs:** 04, 03, 02
- **Preconditions:** WO-S5.6 (value view consumes cumulative rate), WO-S5.2 (bills), Stage 3 DC data.
- **Implementation steps:**
  1. Implement `src/projectors/PartyBalanceAbsProjector.ts` (Trg_ST_PartyBalance_Abs_Update parity, SUM-recompute per 05 sec. 2).
  2. Write `src/services/commercial/PartyBalanceService.ts`: `abs()`, `prog()` (ST_ProgBalance-backed), `value()` - PartyOutQry parity valuing outstanding qty x cumulative rate; `toBeValue(ordId)` - SP_BilltoBeValue(_Approx/_Detail) parity.
  3. Routes: `app/api/commercial/party-balance/route.ts` (view query param), `app/api/commercial/bills/to-be-value/route.ts`.
  4. UI: `app/commercial/party-balance/page.tsx` (jobId staging for TempPartyBal parity), `app/commercial/party-balance/outstanding/page.tsx`, `app/commercial/party-balance/lookup/page.tsx` (mobile parity).
  5. To-be-value page `app/commercial/bills/to-be-value/page.tsx`.
  6. Tests `tests/partybalance.value.test.ts`.
- **Acceptance criteria:**
  - AC1: Given a party with DC-out 1000 kg and GRN-in 600 kg, When the value view runs, Then outstanding 400 kg is valued at the cumulative rate of the latest stage and the amount equals the CumulativeRateService output for that stage x 400 (cross-service consistency assertion).
  - AC2: Given an order with despatched-but-unbilled qty, When to-be-value runs, Then the accrual equals qty x stage cumulative rate and appears in the register with order split.
  - AC3: Given a projector rebuild after a back-dated DC, Then the abs balance equals SUM over all documents (self-heal, single-row trigger bugs not reproduced).
  - AC4: Given the three views, When rendered, Then each is served via jobId staging (no Temp_* tables) and paged.
- **Test commands:** `npm test -- tests/partybalance.value.test.ts`; `npm run lint`; `npm run build`
- **Out of scope:** daily P&L (WO-S6.2), Tally export (WO-S5.8), aging notifications (05 sec. 5 wiring exists - only confirm event emission).
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] G2 parity vs PartyOutQry / SP_BilltoBeValue fixtures
  - [ ] G5: value view rights-gated (`commercial.partybalance.value`)
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S5.7 ticked

## WO-S5.8 — Tally export + GST/TDS registers + HSN masters (S, S5)
- **Objective:** Implement the Tally export hand-off, GST/TDS registers, and HSN master screens.
- **Refs:** 07 sec. 1.2 (Tally/GST/TDS report definitions); 04 sec. 9 (`POST /api/commercial/tally-export`); 02 sec. 13 (tally-gst + hsn pages: FrmHSN, FrmHSNPce NBPercL/H, BPercL/H slabs); 05 sec. 1 (Tally export queue on `invoice.created`).
- **Owning docs:** 07, 04, 02
- **Preconditions:** WO-S5.2-S5.4 (source data), WO-S5.3 (GST rows), X2 registry entries for these reports.
- **Implementation steps:**
  1. Write `src/services/commercial/TallyService.ts` (RptTallyPurAndExp parity): pending export queue, export file generation, flag `tdstallyname` mapping.
  2. GST register (CGST/SGST/IGST split) and TDS register (flag `notds`) as report jobs from `src/reports/registry.ts`.
  3. HSN masters CRUD: `app/api/masters/hsn/route.ts` with slab fields NBPercL/H and BPercL/H (FrmHSN + FrmHSNPce parity).
  4. UI: `app/commercial/tally-gst/page.tsx` (setup + pending export), `app/commercial/hsn/page.tsx`.
  5. Route `app/api/commercial/tally-export/route.ts`.
  6. Tests `tests/tally.export.test.ts`.
- **Acceptance criteria:**
  - AC1: Given two invoices (one same-state, one other-state) in the queue, When Tally export runs, Then the export file contains both with correct tax split lines and the pending-export flags clear only for exported rows.
  - AC2: Given an HSN row with NBPercL=0.25, NBPercH=5, When saved, Then slab lookup returns the right percent band in the GST register (fixture assertion).
  - AC3: Given `notds`='Y', When the TDS register runs, Then TDS rows are excluded per flag semantics.
  - AC4: Given export failure mid-file, When retried, Then previously exported rows are skipped (idempotent queue) and no row is exported twice.
- **Test commands:** `npm test -- tests/tally.export.test.ts`; `npm run lint`; `npm run build`
- **Out of scope:** e-invoicing/e-way API submission (panel fields only), Tally posting configuration UI beyond setup screen.
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] G2 parity vs RptTallyPurAndExp fixture
  - [ ] G5: export + HSN CRUD rights-gated
  - [ ] `npm run lint` and `npm run build` clean
  - [ ] PROGRESS.md change-log line added; TASKS.md S5.8 ticked

---
Stage exit reminders (rules inlined): S4 closes when manual + barcode paths produce identical ledgers as legacy on a golden set and the scan station works offline (WO-S4.6/S4.7 ACs are the evidence). S5 closes when bill -> pass -> TDS -> payment chain, sales invoice GST split, debit notes, party balances (abs/prog/value), and the cumulative rate engine (verified vs root trigger, defect #1 excluded) all hold (WO-S5.1-S5.8 ACs are the evidence).
