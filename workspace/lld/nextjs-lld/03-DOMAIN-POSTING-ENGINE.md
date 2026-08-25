# 03 — DOMAIN MODEL & POSTING ENGINE

The single source of truth for **how every transaction moves stock and money**. This replaces the legacy scatter (VB form code + ~50 procs + triggers) with one engine whose output is byte-for-byte the same stock/balance state as the legacy system.

## 1. Enum ports (identical values)

```ts
type TrType = 1|2|3|4|6|7|8|10|11|12|13|14|17|20|21|-2|-7
// 1 process DC · 2 SALES DC · 3/8 order transfer · 4 purchase return · 6/13 party rejection return
// 7 acc issue (dept 16, job-order) · 10/11/12 DC variants · 14 godown transfer · 17 unit DC
// 20 ready-to-cut · 21 job-order DC · -2 compacted-for-cutting marker · -7 cutting pool dept

type GrnType = 'Purchase'|'Process'|'Process Return'|'DirectReceipt'|'Sales Return'|'Return'
             |'Acc.Purch'|'Acc.Proc.Receipt'|'Acc.Proc.Return'|'Acc.Iss.Ret'|'AccRetToUnit'|'Acc.Direct'

type PcsType   = 'Piece'|'Panel'|'Bit'          // Mas_JobWrkComp.PcsType — ledger selector
type GoodFlag  = 'G'|'M'                        // good | rejected (RejectionTypeId on 'M')
type YF        = 'Y'|'F'|'A'                    // StockTable commodity axis
type ProcessType = 'P'|'R'|'S'                  // normal | reprocess | sales
type RateFor   = 'S'|'C'|'Z'|'R'                // style | color | color+size | style-plain
type EntryOption = 1|2                          // plain grid | color-combo
type FinalStage = 'S'|'F'                       // semi-finish | final dept
```

## 2. Aggregate types (engine inputs/outputs)

```ts
type StockKey    = { ordId, styleNo, stockId, godId }                       // yarn/fab ledger key
type ItemIdent   = { fabId?, cntId?, colId, diaId?, finDiaId?, gsm?, finGsm?, gg?, ll?, designId?, subPrsId? }
type PieceKey    = { ordId, styleNo, lotId, stageId, partId, godId, partyId|0, lineId? , colorId, sizeId, compId? , good:'G'|'M', rejTypeId? }
type Movement    = { ledger:'FABRIC'|'PANEL'|'PCS', key, qty:{kgs?,mtr?,rls?,bgRl?,pcs?}, sign:1|-1, lineage?:{frmStockId?, frmRollId?} }
```

## 3. The Posting Engine

> ⚠ **`Sp_currentstock` definition is not shipped on disk** — only call sites (`CutACKStockPost`: `EXEC Sp_currentstock @Ordid,@StockId,@StyleNo,@GodID,@Type,@ARL,@AKG,@AMtr,-7,1[,@FRMStockID]`) and the `Sp_currentstock_RollDtl` variant (forces `@Rls=1`; '−' on a missing roll row *inserts a negative row*; `@delflg='N'` subtracts, else DELETEs the roll row; dept-11 special cases). Extract the live definition from the DB before implementing the FABRIC-ledger writer.

```ts
class PostingEngine {
  // ONE db transaction per document action. Applies a MovementSet:
  apply(tx, docRef, movements: Movement[]): PostingResult
  // - upserts CurrentStock / Pcs_StockTableQty / Panel_StockTableQty rows
  // - FABRIC ledger: Bg/Kg/Mt(+RollDtl) per (OrdId,StockId,GodID)
  // - PANEL ledger: adds CompId dimension; PCS ledger: adds StageId/PartyId/Line/Good/'M'
  // - never allows negative on 'G' buckets (legacy allowed; we warn-not-block to preserve behavior,
  //   surfaced in PostingPreview)
}
```

**Document save flow (every document, identical shape):**
```
validate(zod + flags + tolerances + approvals)
  → assign doc no (NumberingService)
  → insert Trs_Xxx1/2(/3) header+lines
  → movements = MovementMatrix[docType].build(doc)     // §4
  → PostingEngine.apply(tx, movements)
  → Projectors.schedule(tx, affectedKeys)              // §6 + 05
  → EventOutbox.emit(tx, `${docType}.${verb}`, payload)
  → commit
```
**Delete/reversal:** rebuild the same MovementSet with inverted signs + re-run (compensating posting) — replaces legacy cursor-based delete procs (`PROC_*_Delete*`) with identical net effect.

## 4. MOVEMENT MATRIX — every wiring rule (the core of the design)

### 4.1 Yarn/Fabric documents (`Trs_Del1/2/3`, `Trs_Grn1/2`)

| Document | Type code | FABRIC ledger effect | Balance effect (projector) |
|---|---|---|---|
| Process DC out | Del, TrType 1, ProcessType P | `CurrentStock[ord,stock,god] −kgs/mtr/rls` | `ST_ProgBalance_{Yarn|Fabric}.DcKgs/DCMtr +` at party; party-outstanding + |
| Knitting pre-program issue | Del3 lines (Prog kgs) | no stock yet | `ST_ProgBalance_Yarn.DcKgs +` (Trs_Del3.Prog) |
| Reprocess DC | Del, TrType 1, ProcessType R | `CurrentStock −` | `ReProcessDCKgs/Mtr +` (fresh bucket untouched) |
| Sales DC | Del, TrType 2, ProcessType S | `CurrentStock −` (buyer) | sales registers; ST_Ord_inHand on piece despatch |
| Purchase return | Del, TrType 4 | `CurrentStock −` | PO balance back |
| Party rejection return | Del, TrType 6/13 | `CurrentStock −` | party balance − |
| Order→order transfer out/in | Del, TrType 3/8 (TranOrdID/TranID) | `−` source order `+` target order | `TransOutKgs` / `TransInKgs` on each program |
| Godown transfer | Del, TrType 14 (Party=GodID) | `−` src godown `+` dst godown | none |
| Unit DC | Del, TrType 17 | `−` unit godown `+` receiving unit | unit ack pending (`Trs_UnitAck`) |
| Ready-to-cut | Del/RTC, TrType 20 | stage pass-through | `GRN side := DC side` (both equal); returns → `ReturnKgs` |
| Job-order DC | Del, TrType 21, DelType P | `−` fabric | job-order balance (Sp_PartyWiseJobOrderBal) |
| Purchase GRN | Grn, 'Purchase' | `CurrentStock +` | PO received; `OrderStylewiseCost_Grp.GRNKGS/GRNBASEDVALUE` accrual |
| Process GRN | Grn, 'Process' | `CurrentStock +` **as NEW identity** (DyeColId shade / FinGsm / FinDiaID) | `GrnKgs +`; loss = DC−GRN monitored; `Vue_Reqd_Vs_Finish` recompute |
| Multi-process GRN | Trs_MultiPrs_Grn1/2/3 | `+` per process leg; OurDCID=0 → previous GRN leg acts as DC | each leg's program balance |
| Process Return GRN | Grn, 'Process Return' | `CurrentStock −` (send back out) | `GrnKgs −`; party bucket − |
| Direct receipt | Grn, 'DirectReceipt' | `+` | flagged direct (direcrec) |
| Cutting acknowledgement | Trs_CutApr (Arl/AKg/AMtr) | `+` cutting pool dept −7 (FrmStockID lineage) | cut vs issued variance |
| Accessory mirrors | Grn 'Acc.*', Del TrType 7 | `+`/`−` YF='A' rows (qty in Kg column) | `ST_Acc_PartyBal_Abs` + `ST_Acc_Prog_Balance` (see 4.4) |

### 4.2 Production documents (`Trs_ProdEntry(+Qty)` dispatcher parity)

| Entry | Conditions | PCS/PANEL ledger effect |
|---|---|---|
| Piece production | any Piece stage | target `+` ('G'); source stage `−`; `ProductionQty +` |
| Stage-to-stage | Stage≠1 && FinalStage='S' | source = `SourceStageId` bucket (FinalStage = `Mas_Dept.SemiFinish`; deduction branches additionally require `PcsType='Piece'`; Stage=1 + Rework=1 has its own source-deduction block) |
| Final stage | FinalStage='F' | source via `Trs_ProdEntry_SourceStageDtl`; EntryOption≠1 spreads per `PcsPerColor` combo colors |
| LineOut variant | dispatcher `_1` (LineOut flag hardcoded 'Y'), Rework≠1, Spl_Operation='N' | source = **line bucket** (`Pcs_StockTable.EmpID = SrcLineID`); `_LineStk` analogues apply to the DC legs (§4.3) |
| Rework | Rework=1 (any value ∉ {0,2}) | consumes **'M' bucket with RejectionTypeId**, outputs 'G'; **Rework=2 is treated as normal ('G')**; rework rows route via dispatcher `Sp_ProductionEntryQty_2` → `..._LineOut_PrdEntry_ReWrk` (uses `LineID` not `SrcLineID`; its 'F' branches are disabled in legacy — kept as-is) |
| Panel production | PcsType ∈ {'Piece','Panel'} | `Panel_StockTableQty +` (CompId dimension; **no EmpID dimension**; rework exemption lacks the =2 case) |
| Panel assembly | `Sp_ProductionEntryQty_Panel_ASM` → `PROC_Stock_ProdPanel_Asm` | **deduction-only**: EACH component `Panel_StockTableQty −` (join `Trs_AddPanelAsm_SourceDtl` on compID + SourceStageId); the assembled part's `+` is posted separately by the panel-production path (`Sp_ProductionEntryQty_Panel_1` → `PROC_Stock_ProdPanel`) |
| Rejection entry | Trs_PcsRej | line 'G' bucket `−` (StockQty & ProductionQty) at `Stk_StageId` under the line → 'M' bucket `+` (RejectionTypeId) at stage under EmpID=0 |
| Issue to line | Trs_LineInput | line bucket `+` at TargetStageID (EmpID=line) **and** source-stage bucket `−` (EmpID=0) when PcsType ∈ {Piece,Bit} or same-stage. *The Despatch/Sales finished-bucket leg in the legacy proc is dead code (`@DelType` hardcoded '') — NOT ported; live piece-despatch deduction lives in the PiecesDelivery proc (§4.3)* |
| Line transfer | Trs_LineTfr | `+` at TargetStage under TOEMPID; `−` at SourceStage under from-EMPID; gate PcsType ∈ {Piece,Bit} or same-stage. *Legacy `RewrkStk` legs are dead code (GAN flag unreachable) — not ported* |
| Spl_Operation stages | Mas_JobWrkComp.Spl_Operation='Y' | skip stock posting and skip StockPostingFlg (flag parity) |
| Qty update / delete of an entry | dispatcher paths | `PROC_Stock_ProdPieces_Update_LineOut` / `..._Delete_LineOut_PrdEntry[_Rewrk]` (both arms of `_1` use the LineOut variants; `_2` mirrors with `_Rewrk`) |

### 4.3 Piece DC/GRN with outside stitching

| Document | Effect |
|---|---|
| Piece process DC (`Trs_Pcs1/2`) | **party bucket `+`** at TargetStageID AND **company bucket `−` at SourceStageID** — both legs keyed by ProcessType: 'P'→'G'/0, else 'M'/RejectionTypeId; 'JobWork Return' skips the party add; GAN rework path (Options.GRNAcceptance_Pcs='Y' + order type 'W' + ProcessType='R') deducts the `RewrkStk` column instead |
| Piece DC `_LineStk` variant | identical except the **deduct legs** switch to the line bucket (`EmpID = SrcLineID`); the party-add leg stays on EmpID=0 |
| Despatch/Sales piece DC | deducts the finished-stage bucket at FinishedStageID (−3 for Despatch, SourceStageID for Sales), 'G', PartyId=0 — this is the *live* despatch deduction (the IssueToPrdn leg is dead code); despatch entries also drive the `ST_Ord_inHand 'DES'` posting (05) |
| Piece GRN (`Trs_PcsGrn1/2`) | company bucket at TargetStage `+` RecPcs (StockQty & ProductionQty); **RewrkPcs→`RewrkStk` column, RejPcs→`RejStk` column — on the company 'G' row** (not separate 'M' buckets); 'Process Return' reverses the **party** bucket (P→'G', R→'M'/RejectionTypeId); multi-stage GRN (DCTargetStage≠stage) deducts combined RecPcs+Rewrk+Rej from the party bucket; cutting-GRN case (JobWrkCuttingGrn='Y', stage 1, Piece) additionally restores the party bucket |
| Unit/Godown ack (`Trs_UnitAck`, GoDownAck procs) | same mechanics vs own units/godowns |

### 4.4 Accessory balance stack (two views, exactly as legacy)

```
Sp_Acc_PartyBalance  (absolute, per document)   PO → PO_DC_Qty; GRN → GrnQty; DC → PO_DC_Qty(−)
Sp_AccTransaction    (program-wise, per item)   NEW|OPN|PO|GRN|DC|RET|ISSRET|PRSDC|PROREC|PRORET|SHORT|TRANIN|TRANOUT
```

### 4.5 Cumulative rate engine (`Tgr_StockRatePost` parity)

> Verified against the **root** `SPTriggers\Tgr_StockRatePost.sql` (SUGANYA 01/03/2025, 950 ln). `SPTriggers\Updated\Tgr_StockRatePost.sql` is the older 2021 baseline **without** the fabric-to-yarn-in-knitting logic — treat root as canonical; diff against the live DB trigger before implementing.

```
on StockRatePost insert/update/delete:
  walk depts in Sno order (cursor, excludes ordermas.jobno=0):
    Prs=1  → cumbillrate = Billrate ?? Procrate (yarn base)
    Prs=2  → yarn + dyeing (sample branch: @Y_Rate+@Rate;
             order branch: Σ Prog_Ycns.consPer-weighted yarn + rate)
    Prs=4 / DeptGrpCode=4 → knitting; Prs=-4 → YTwist (Prog_YTwist_MAs wgtper)
    else   → own rate + previous-Sno cumbillrate (scan backwards; YF='Y' vs 'F' legs)
  special: blended counts (Pro_YrnCns / Prog_Ycns %), dept 15 FABRIC TO YARN
           (Prog_ClrComb.LooseFab; gated by Options1.FabToYarnRate_ReqInKnit),
           parallel Sample-order copy (ordertype='Sample' or no OrdSeq rows)
consumers: PartyOutQry valuation, SP_BilltoBeValue, budget-vs-actual, piece cost (PcsStockRatePost)
known legacy defect: root's FTY prev-rate query hardcodes ordid=2028/sno=4/cnt=229/col=151
(test data left in production) — rewrite must NOT port this filter
```

## 5. Balance projectors (trigger parity → typed functions)

| Projector | Legacy trigger/proc | Maintains |
|---|---|---|
| `ProgBalanceYarnProjector` | TRG_YARN_BALANCE_DEL/_DELKNIT/_DEL_DEL/_DELYARN_DEL/_GRN_DEL | `ST_ProgBalance_Yarn`: DcKgs (incl. Trs_Del3.Prog), GrnKgs, ReqBalanceKgs = Req−(Grn+TransIn−delRet−TransOut) |
| `ProgBalanceFabricProjector` | TRG_FAB_BALANCE_DEL/_DEL/_RCUT/_RCUT_RET/_RCUT_DEL | `ST_ProgBalance_Fabric` by fab fingerprint (+DyeCol/Design by dept, SubPrsId), ReProcess bucket, RTC equalize |
| `PartyBalanceAbsProjector` | app calls + Trg_ST_PartyBalance_Abs_Update | `ST_PartyBalance_Abs` document-stack |
| `AccBalanceProjectors` | Sp_Acc_PartyBalance / Sp_AccTransaction | `ST_Acc_PartyBal_Abs`, `ST_Acc_Prog_Balance` |
| `ProductionDataProjector` | SP_ST_Production_Data ('PRDN','DC','GRN','REJ','**REWRK**' ±) | `ST_Production_Data` summary; PartyId is part of the key only for DC/GRN/REJ; OrderQty/OrderWithExsQty zeroed only on DC '−' |
| `OrdInHandProjector` | Sp_MR_OrdInHand ('OR','DES','DEL') | `ST_Ord_inHand` + FCY/INR value |
| `WbsProjector` | Sp_WBS_Production(_DateWise/_Supp) + RAG update | `WBS_*` rows, Finish_Percent(_4Exs) |
| `CurrentStockRollProjector` | Sp_currentstock_RollDtl | roll-level lineage |
| `SyncFlagProjector` | Trg_ST_* / Trg_WBS_* (UpdateFlg=1) | dirty flags for Commando sync (05) |

## 6. Validation & tolerance catalog (service-level, flag-driven)

| Check | Flag(s) | Behavior (unchanged) |
|---|---|---|
| PO qty vs budget | `po_bud`, `po_buddev` (10.00), `po_allowadd` | warn/block at ± dev% |
| PO rate vs budget rate | `po_budrt`, `po_budrtdev`, `budrt_inhccw` | warn/block |
| GRN balance deviation | `grn_bal`, `grn_dev`, `grn_alladd` | warn/block |
| Issue shortage | `i_scheck`, `i_sdev` | warn/block on DC issue vs stock |
| Bill balance check | `bill_bcheck(+dev)` | bill vs GRN/DC qty |
| DC transfer tolerance | `trankgs_dev` | kg deviation on DC |
| Cutting DC/job-order deviation | `cuttingdc_joborder`, `cutting_dcjoborder_deviation` | |
| Dyeing/knitting gam (loss) % | `dyeinggamtper`, `knittinggamtper` | acceptable process loss % |
| Entry date deviation | `entrydatedev`, `billdtchk_serverdt(+dev)` | back-dating rules |
| Pcs rate excess | `pcsrateamt_excess_percent`, `prodbillamtdivper`, `jobexcess` | bill/entry caps |
| Rate confirmation before DC | `need_rate_conf_for_dc`, `rateconfirmcheck(+dev)` | block DC w/o approved rate |
| Sales DC vs program balance | `saledcagainstpgmbalchk` | block over-despatch |
| Sample qty limit | `sampleqtylimitcheck` | |
| Scheme/actual % | `schcomppercen`, `schpcscomppercen`, `autocompperc`, `panel emb/excess` | completion % caps |
| Boost-up on requirement | `boostupper`, `reserveper` | FN_Add_BoostupPer parity |

## 7. Numbering & identity

- DC/GRN/Bill/Inv/Lot/OC/IO numbers: finyear-scoped via `NumberingService`; prefixes from `Mas_SalesGrp`; auto/manual per flags (`manual_dc_no_option_reqd`, `newdespatchno`, `sameordno`, `samepdcno`, `dyeing_lotno_auto_generation`, `ocngen`, `ionogen`, `autocomp*`, `nlot`, `lot_seq`, `lotrunno`).
- IDs: keep legacy `Max(ID)+1` procs initially (compat), add `SEQUENCE` shim behind NumberingService (behavioral no-op).
- `getLotNo()` parity for alphanumeric lot sorting (PATINDEX numeric extraction).

## 8. Requirement explosion (Planning service, `SP_FabReqCalc_*` parity)

```
ReqPcs = CutPlanQty (+PExc%)
ReqKgs = ReqPcs × Actpcswgt/1000 × Parts
walk OrdSeq backwards: ReqKgs = ReqKgs/(100−Loss_Per)×100   (Prog_Prsloss; shade-wise Prog_Clrloss; FABTOYARN/DYEING/YARNDYEING knobs)
→ Pro_ReqYarn (type Y) · Pro_ReqKnitt (fab fingerprint) · Pro_ReqJob (job orders)
staging: Prog_ReqCalTWrk parity → jobId rows (no IP key)
```

## 9. Costing pipelines (unchanged math)

- `SP_Bud_and_Actual` parity: budget legs (Pro_ReqYarn×rate, Pro_ReqKnitt×rate, PRO_AccReq×BudRate) vs actual legs (PO, GRN, DC-valued, debits, Trs_BillRate.NetAmount, piece-rate prod × Pro_Prod_PartwiseRate|Bud_InhRateclw size-wise, ShippingBill); `@Reqd_TaxInPL`, `GrpRef` consolidation.
- `Sp_DailyUnitPANDL` parity: shift/contractor/jobwork qty at budget rates; actual wages/bills; overhead = budget×ProdOverheads% + daily/fixed expenses; pro-rata allocation by wages; style expenses pro-rata by pcs.
- Quick-costing cube: `Vue_DailyCostingInputData` (4 expense levels) → `ST_Cost_*` with sync flags.

## 10. Tracking integration (08) — how QR tracking rides the same engine

```ts
type Movement = { ..., trackIds?: string[] }          // optional track units per movement
// PostingEngine.apply(): for each movement with trackIds (or implied by doc lines):
//   1. upsert TrackUnit owner/status (owner = movement counterparty: godown/party/line/buyer)
//   2. insert TrackEvent {eventType: docKind, docRef, mode}
//   3. quantity law check: Σ child edges ≤ parent remaining (tolerances §6); block on violation
//   4. unit creation points: GRN rolls → FAB_ROLL; cutting → CUT_LAY/BUNDLE/PIECE (per TrackPolicy);
//      packing → CARTON; despatch → edges to DESPATCH_DOC
// Reversals invert events and edges in the same compensating transaction — genealogy stays exact.
type TrackUnitType = 'YARN_BAG'|'FAB_ROLL'|'DYE_LOT'|'CUT_LAY'|'BUNDLE'|'PIECE'|'CARTON'|'DESPATCH_DOC'
```

`TraceProjector` (05) aggregates per order/stage and reconciles trace sums vs `CurrentStock`, `Pcs_/Panel_StockTable`, `ST_Production_Data` — mismatches land in `/tracking/exceptions`. Legacy anchors stay authoritative for payroll (`Pay_BundlePcs_Barcode.Pcs_Status` unchanged); TrackUnit rows reference them (`legacyRef`) rather than replacing them.
