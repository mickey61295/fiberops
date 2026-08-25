# 11 — PROC-LEVEL VERIFICATION (movement-matrix audit against verbatim SQL)

**Date:** 2026-08-15 · **Method:** four independent verification passes over the load-bearing procedures, each checking the specific claims of `03-DOMAIN-POSTING-ENGINE.md` cell-by-cell against full file bodies, with verbatim SQL quotes as evidence. 24 files read in full (~5,000 lines). Findings fed back into 03/05; this doc is the audit record.

**Files verified:** `Sp_ProductionEntryQty_1/_2/_Panel_1/_Panel_ASM`, `PROC_Stock_ProdPieces`, `..._LineOut_PrdEntry(_ReWrk)`, `PROC_Stock_ProdPanel(_Asm)`, `PROC_Stock_ProdRej_Insert_Line`, `PROC_Stock_IssueToPrdn_Insert` (1,016 ln), `PROC_Stock_LineTfr_Insert`, `PROC_Stock_PiecesDelivery_Insert(_LineStk)`, `PROC_PiecesReceipt_Insert/_Delete`, `CutACKStockPost`, `Sp_currentstock_RollDtl`, `SP_ST_Production_Data`, `TRG_YARN_BALANCE_DEL/_DELKNIT/_DEL_DEL/_DELYARN_DEL/_GRN_DEL`, `TRG_FAB_BALANCE_DEL/_RCUT/_RCUT_DEL/_RCUT_RET/_RCUT_RET_DEL`, `Tgr_StockRatePost` (root + Updated), `SP_Barcode_Production_Posting`, `SP_BundleBarcode_Check`, `SP_PcsBarcode_Check(_Rejection)`.

## 1. Verdict summary

| Area | Claims | Confirmed | Partial/Refuted |
|---|---|---|---|
| Production spine (A–G) | 10 | 6 | 4 (C2, F, G partial; B/D/E confirmed w/ notes) |
| Piece DC/GRN + stock utils (H,I,M,P,Q) | 8 | 4 | 2 partial, 1 nuance, 1 not-found (M1) |
| Balance triggers + rates (J,K,L) | 7 | 7 | 0 (with guard-condition notes) |
| Barcode chain (N,O) | 5 | 4 | 1 partial (N1) |
| **Total** | **30** | **21** | **9 → all reconciled into 03/05** |

## 2. Corrections applied to the design docs (this is what changed)

1. **Panel assembly is deduction-only** (`PROC_Stock_ProdPanel_Asm`): components are deducted via `Trs_AddPanelAsm_SourceDtl`; the assembled part's *add* comes from the separate panel-production path (`Sp_ProductionEntryQty_Panel_1` → `PROC_Stock_ProdPanel`). 03 §4.2 corrected.
2. **Issue-to-line despatch leg is dead code**: `PROC_Stock_IssueToPrdn_Insert` hardcodes `@DelType=''`, so its Despatch/Sales finished-bucket deduction can never run; the *live* behavior adds the line bucket and deducts the source-stage (EmpID=0) bucket for Piece/Bit/same-stage. The live despatch deduction lives in `PROC_Stock_PiecesDelivery_Insert` (FinishedStageID −3/SourceStage, 'G'). 03 §4.2/§4.3 corrected.
3. **LineTfr `RewrkStk` legs are dead code** (GAN flag unreachable: `@ProcessType` hardcoded 'P'). Live behavior: + TOEMPID at TargetStage, − from-EMPID at SourceStage, gated Piece/Bit/same-stage. 03 corrected.
4. **Rework semantics refined**: Rework=2 is treated as normal ('G'); rework rows dispatch via `Sp_ProductionEntryQty_2` → `..._LineOut_PrdEntry_ReWrk` which uses `LineID` (not `SrcLineID`) and has its 'F' branches disabled — documented as-is. Panel rework lacks the =2 exemption; panel ledger has **no EmpID dimension**; panel PcsType gate is 'Piece' **OR** 'Panel'. LineOut flag is hardcoded 'Y' in dispatcher `_1`; both arms route updates/deletes to the `_LineOut` variant procs.
5. **Piece DC/GRN bucket map refined**: both DC legs honor ProcessType P→'G'/R→'M'; company deduct is at **SourceStageID**; `_LineStk` switches only the *deduct* legs to the line bucket; GRN puts RewrkPcs/RejPcs in `RewrkStk`/`RejStk` **columns on the company 'G' row** (not 'M' buckets); multi-stage-GRN combined party deduct; cutting-GRN party restore. 03 §4.3 rewritten.
6. **`SP_ST_Production_Data` has a fifth type 'REWRK'** (ReworkQty); PartyId keys only DC/GRN/REJ; OrderQty+OrderWithExsQty zeroing only on DC '−'. 03 §5 corrected.
7. **Barcode posting granularity**: legacy inserts **one `Trs_ProdEntry` header per size** (SizeId in the GROUP BY; new `Max(ID)+1` per row) and stamps `PostingFlg='Y'` scoped by **ProdDate only** (marks all unposted rows of the date). The rewrite keeps the group key but posts the batch in one transaction with group-scoped flags — deliberate correction of verified defects, documented here and in 05 §6.
8. **`Tgr_StockRatePost` canonical version**: root (2025, 950 ln) vs `Updated\` (2021, 573 ln) differ materially — root adds fabric-to-yarn-in-knitting (`Prog_ClrComb.LooseFab`, `Options1.FabToYarnRate_ReqInKnit`) plus knitting (Prs=4) and YTwist (Prs=−4) branches. 03 §4.5 updated with the warning.
9. **`Sp_currentstock` definition is NOT on disk** (call sites + `Sp_currentstock_RollDtl` only) — flagged in 03 §3 as a must-extract-from-live-DB item.

## 3. Newly discovered legacy defects (live bugs — register for the rewrite)

| # | Where | Defect | Rewrite stance |
|---|---|---|---|
| 1 | `Tgr_StockRatePost` root L612 | FTY prev-rate query hardcodes `ordid=2028 and sno=4 and cntid=229 and colid=151` (test data in production) — other orders get 0 from that branch | **Do not port** the filter |
| 2 | `TRG_FAB_BALANCE_RCUT_DEL` L54 | `DCMtr=@Mtr` assigns (overwrites) instead of subtracting; also re-reads OrdId from StockTable per row | Projector recomputes from SUM — fixed by design |
| 3 | `TRG_FAB_BALANCE_RCUT_RET_DEL` L35 | Hardcodes `DeptId=-7` in the balance update | Fixed by projector design |
| 4 | `SP_Barcode_Production_Posting` CATCH | No ROLLBACK (doomed tran leaked); second CATCH closes the wrong cursor (`Prod_Cursor_Bundle` in the Pcs loop); `@@ERROR` used in CATCH | One-transaction service — fixed by design |
| 5 | same proc L78/L134 | `PostingFlg='Y'` stamped by ProdDate only → can mark other orders' unposted rows | Group-scoped flags in rewrite |
| 6 | `SP_PcsBarcode_Check_Rejection` L43 | Increments `Pay_BarcodeGeneration.goodpcs` on the **rejection** path (not a rejection counter); duplicate-row ELSE branch double-counts RejectionPcs/goodpcs | Corrected counters in rewrite; parity kept for *intended* semantics |
| 7 | `TRG_YARN_BALANCE_GRN_DEL` L24 | Pre-computed GrnType-filtered `@RecKgs` is dead code; actual decrement uses raw per-row RecKgs with **no GrnType filter** | Projector recomputes with correct filters |
| 8 | `SP_PcsBarcode_Check` L176-177 | Bundle `Completed='Y'` updates are unscoped by barcode (any row satisfying the equation closes) | Scope by bundle in rewrite |

## 4. Dead-code register (verified unreachable — NOT ported)

- `PROC_Stock_IssueToPrdn_Insert`: Despatch/Sales finished-stage leg; all `RewrkStk` branches; `@GAN_PCS`/Woven/`ProcessType='R'` branches (ProcessType hardcoded 'P'); `@PartyId` add-gate (hardcoded 0).
- `PROC_Stock_LineTfr_Insert`: `GAN_RewrkFlg` RewrkStk legs (same cause); Despatch/Sales block (`@DelType=''` hardcode); the commented-out RewrkStk ADD.
- `SP_PcsBarcode_Check` L156-172 duplicate-row ELSE branch stamps GoodPcs without inserting.
- `TRG_YARN_BALANCE_DEL_DEL`: drops the process-DC term when `pokgs>0` and omits the dept OutputType filter — inconsistent with its insert twin (documented; projector unifies).
- `PROC_PiecesReceipt_Delete`: 'S'-branch Process-Return restore is commented out (only 'F' branch restores).
- `@ProdDB` parameter in all three barcode check procs is never used (cross-db name hardcoded `Fiber_production`).

## 5. Parity policy (restated after findings)

- **Live behavior is the parity target.** Dead branches are documented (§4) and not ported.
- **Verified live defects** (§3) are *not* replicated where the design already fixes them structurally (transactional posting, SUM-recompute projectors, scoped updates). Where a defect changes *visible numbers* (e.g., #6 rejection counter), the rewrite implements the *intended* semantics and the deviation is recorded here for sign-off.
- Guard conditions discovered on confirmed claims (e.g., `isnull(pokgs,0)=0` gate on yarn DcKgs updates, `@Cnt>0` row-existence gates, RCUT's dyeing-only `ProgFrm_Issue` gate, DELKNIT having no sales leg, dept-8-**or-DeptGrpCode-8** dyeing test) are preserved in the projector specs (03 §5) — they are behavior, not noise.

## 6. What remains unverified (and how to close it)

1. **`Sp_currentstock` body** — extract from live DB (`sp_helptext`); confirm Bg/Kg/Mt upsert semantics. *(blocks: FABRIC-ledger writer)*
2. Procs **not in this round** (lower risk, covered earlier at summary level): `Sp_ProductionEntryQty` (the non-`_1` variant called by barcode posting), `PROC_Stock_ProdPanel_Update/_Delete`, godown/unit ack families, `Trg_ST_*` sync-flag triggers (semantics already simple), `SP_FabReqCalc_*` (verified in the original business analysis pass with quotes). Re-verify `Sp_ProductionEntryQty` vs `_1` divergence before wiring the barcode path.
3. **Live-DB drift** — same caveat as 10 §4.1: on-disk files may lag the DB; re-extract each proc at implementation time and diff against this report.

## 7. Verdict

The movement matrix in 03 was **structurally correct** — every bucket direction and key dimension matched the code — but 9 of 30 claims needed refinement (4 materially: assembly split, dead despatch leg, dead RewrkStk legs, header-per-size posting). All are now reconciled into 03/05, and the audit trail (this file) records the evidence, the legacy-defect register, and the dead-code register so implementation decisions are traceable.
