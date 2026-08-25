# R04 - Stock & Stores

## 1. Purpose & business context

R04 owns the stock truth layer: the three ledgers (CurrentStock for yarn/fabric,
Panel_StockTableQty per component, Pcs_StockTableQty per stage x line x Good/'M' bucket),
the registers and views that expose them, the stores movements that do not pass through a
party DC (godown/unit transfers and their acknowledgements), corrections (adjustments,
openings), and roll-level custody (roll split and the roll module flags). All writes go
through the same PostingEngine as every other document (03 sec. 3); R04 additionally owns
the CurrentStock roll projector and the sync-flag projector that keep Commando and the
stock dashboards consistent. Accuracy here is the precondition for every downstream
balance, cost, and tracking number.

## 2. Scope (legacy forms in)

- Registers and views: FrmStockRegister family (General/Fabric/Yarn/Acc/Itemwise/_Style/
  _StylePcs/_SplRpt), FrmStockLedger, frmStockView, frmfabstockshow, frmYarnStockShow,
  frmAccStockShow, frmPieceStock(All), FrmRejPieceStock (06 sec. H).
- Transfers and acknowledgements: FrmStkTransfer, FrmChangeGodown, FrmGoDownSel, unit
  transfer + FrmUnitTransferAck (Trs_UnitAck1/2), FrmPcsGodTransfer, FrmGoDownAck,
  FrmGodownTransferAck (PROC_GodownAck_*/PROC_UnitAck_*) (06 sec. H).
- Corrections: frmStockAdjustment(_Domestic), frmPcsStockAdjustmentEntry,
  frmPcsStagewiseOpeningStock, frmOpeningStock(_CompWise) (Trs_Opening) (06 sec. F, H).
- Roll module: FrmRollSplit (RollSplit; roll lineage FrmStockId) (06 sec. H).
- Options: frmOptions / FrmOptionsPrint / FrmOptionUpdate (per-order stock options) (06 sec. A).
- Accessory acknowledgement: frmAccack (acc mirror of the GoDown/Unit ack) (06 sec. O).
- Mobile parity surfaces: /m/stock/ledger, /m/entry/stock-transfer, /m/entry/unit-transfer
  (06 sec. K).
- Out of scope: the DC documents that carry transfers (R03 TrType 14/17 save paths),
  piece/panel production transactions (production R-doc), report engine internals (S2.5).

## 3. Functional requirements

| FR ID | Requirement (testable "shall") | Source | Priority | Stage |
|---|---|---|---|---|
| STK-001 | The system shall expose current stock for all three ledgers through GET /api/stock/current?ledger=fabric|panel|pcs reading CurrentStock, Panel_StockTableQty, and Pcs_StockTableQty. | 04 sec. 7; 03 sec. 2 | P0 | S2 |
| STK-002 | The system shall render the /stock/current dashboard as the CurrentStock x 3-ledgers view with Trg_CurrentStock_Update sync parity. | 02 sec. 8 | P0 | S3 |
| STK-003 | The system shall render the /stock/view screens replacing frmStockView, frmfabstockshow, frmYarnStockShow, frmAccStockShow, frmPieceStock(All), and FrmRejPieceStock as a single 3-ledger browser. | 02 sec. 8; 06 sec. H | P0 | S3 |
| STK-004 | The system shall provide the stock register family (FrmStockRegister General/Fabric/Yarn/Acc/Itemwise/_Style/_StylePcs/_SplRpt variants) with Vue_StkLedger semantics and godown/dept/color/size drill. | 02 sec. 8; 06 sec. H | P0 | S3 |
| STK-005 | The system shall provide the running-balance stock ledger (FrmStockLedger) via GET /api/stock/ledger?ordId&stockId. | 02 sec. 8; 04 sec. 7 | P0 | S2 |
| STK-006 | The system shall serve register variants through GET /api/stock/register?variant= covering the whole FrmStockRegister family. | 04 sec. 7 | P0 | S3 |
| STK-007 | The system shall post stock adjustments (frmStockAdjustment, _Domestic variant) via POST /api/stock/adjustment as signed ledger movements in one transaction. | 02 sec. 8; 04 sec. 7 | P0 | S3 |
| STK-008 | The system shall post piece-stock adjustments (frmPcsStockAdjustmentEntry) through the same endpoint against the Pcs ledger. | 02 sec. 8 | P0 | S3 |
| STK-009 | The system shall provide stage-wise pcs opening/adjustment (frmPcsStagewiseOpeningStock) gated by stagewisepcsstock_and_transactionreqd. | 02 sec. 8; 07 sec. 2.3 | P1 | S3 |
| STK-010 | The system shall post opening stock (frmOpeningStock, _CompWise variant, Trs_Opening) via POST /api/stock/opening as + movements into the correct ledgers. | 02 sec. 6, sec. 8; 04 sec. 7 | P0 | S3 |
| STK-011 | The system shall split rolls (FrmRollSplit) via POST /api/stock/roll-split preserving roll lineage through FrmStockId parent references. | 02 sec. 8; 04 sec. 7 | P0 | S3 |
| STK-012 | The system shall enforce the roll module flags rollno_module_reqd / all_transaction_basedon_rollno / rollnofrommc / roll_grn_excess at the roll writer and roll-linked documents. | 07 sec. 2.3 | P0 | S3 |
| STK-013 | The system shall reproduce Sp_currentstock_RollDtl semantics verbatim: forced @Rls=1 per roll row, a '-' on a missing roll row inserts a negative row, @delflg='N' subtracts while otherwise the roll row is DELETEd, and dept-11 special cases apply. | 03 sec. 3 | P0 | S2 |
| STK-014 | The system shall upsert FABRIC ledger Bg/Kg/Mt(+RollDtl) quantities per (OrdId,StockId,GodID) using the extracted live Sp_currentstock body. | 03 sec. 3 | P0 | S2 |
| STK-015 | The system shall maintain the PANEL ledger with the CompId dimension and the PCS ledger with StageId/PartyId/Line/Good-'M' dimensions on every stock write. | 03 sec. 3 | P0 | S2 |
| STK-016 | The system shall warn (not block) when any R04 write would drive a 'G' bucket negative and surface the condition in PostingPreview. | 03 sec. 3 | P0 | S2 |
| STK-017 | The system shall reverse every R04 document (transfer, adjustment, opening, roll split) as a compensating posting in one transaction that restores the exact prior state - no hard deletes. | 03 sec. 3 | P0 | S2 |
| STK-018 | The system shall maintain roll-level lineage via the CurrentStockRollProjector (Sp_currentstock_RollDtl parity). | 03 sec. 5 | P0 | S2 |
| STK-019 | The system shall stamp UpdateFlg=1 dirty rows via the SyncFlagProjector (Trg_ST_* / Trg_WBS_* parity) and serve them through GET /api/sync/pull?since= and POST /api/sync/ack. | 03 sec. 5; 04 sec. 11 | P0 | S2 |
| STK-020 | The system shall provide per-order stock options screens (/stock/options) replacing frmOptions, FrmOptionsPrint, and FrmOptionUpdate via StockService.options(). | 02 sec. 8; 06 sec. A | P1 | S3 |
| STK-021 | The system shall print closing stock reports RptClosingStock (Det, Mtr, Deptwise variants) from CurrentStock/3-ledger data. | 07 sec. 1.2 | P1 | S3 |
| STK-022 | The system shall print the Opening (Yarn/Fab/Acc), StockAdj, Inward, and StkLedger report variants. | 07 sec. 1.2 | P1 | S3 |
| STK-023 | The system shall print roll barcode labels RptBarcodePrint_FabRoll as zxing SVG labels. | 07 sec. 1.1 | P1 | S3 |
| STK-024 | The system shall provide the accessory acknowledgement screen (frmAccack) as the acc mirror of the GoDown/Unit ack through StockService.ack(). | 06 sec. O | P1 | S3 |
| STK-025 | The system shall provide mobile stock-ledger parity (/m/stock/ledger) reading the same ledger endpoints. | 06 sec. K | P1 | S2+ |
| STK-026 | The system shall honor currentstockpostingflag as the posting side-effect switch on stock-writing paths. | 07 sec. 2.3 | P0 | S3 |
| STK-027 | The system shall expose FAB_ROLL QR labels on stock/rolls when qr_roll_labels is on (auto-on when all_transaction_basedon_rollno='Y'), default OFF. | 07 sec. 3.1; 03 sec. 10 | P2 | S7 |
| STK-028 | The system shall render the shared StockBalanceTable component with the 3-ledger balances, G/M split, and drill to source documents. | 02 sec. 21 | P0 | S3 |
| STK-029 | The system shall provide the change-godown flow (FrmChangeGodown with FrmGoDownSel) moving stock identity between godowns as a TrType 14 movement. | 02 sec. 8; 06 sec. H | P1 | S3 |
| STK-030 | The system shall provide the rejected-piece stock view (FrmRejPieceStock) browsing the 'M' bucket by RejectionTypeId. | 02 sec. 8; 03 sec. 2 | P1 | S3 |
| TRF-001 | The system shall post a godown transfer (FrmStkTransfer, TrType 14, Party=GodID) as - source godown and + destination godown on the FABRIC ledger with no program-balance effect. | 03 sec. 4.1; 02 sec. 8 | P0 | S3 |
| TRF-002 | The system shall serve all transfer kinds through POST /api/stock/transfer (godown|unit|pcs-godown) in one transaction each. | 04 sec. 7 | P0 | S3 |
| TRF-003 | The system shall post unit transfers (TrType 17) per the inhousetransfer / stock_maintain_reqd_for_inhousetransfer flags, leaving the receiving unit's acknowledgement pending. | 02 sec. 8; 03 sec. 4.1; 07 sec. 2.3 | P0 | S3 |
| TRF-004 | The system shall record unit transfer acknowledgements (FrmUnitTransferAck, Trs_UnitAck1/2) via the PROC_UnitAck_* semantics, matching quantities received against the unit DC. | 02 sec. 8; 06 sec. H | P0 | S3 |
| TRF-005 | The system shall record godown transfer acknowledgements (FrmGoDownAck, FrmGodownTransferAck) via the PROC_GodownAck_* semantics, closing the pending transfer rows. | 02 sec. 8; 06 sec. H | P0 | S3 |
| TRF-006 | The system shall serve acknowledgements through POST /api/stock/ack/godown|unit. | 04 sec. 7 | P0 | S3 |
| TRF-007 | The system shall post piece godown transfers (FrmPcsGodTransfer) moving Pcs ledger rows between godowns. | 02 sec. 8; 06 sec. H | P1 | S3 |
| TRF-008 | The system shall validate transfers against i_scheck / i_sdev (issue shortage) and trankgs_dev (kg deviation), warning or blocking per the flags. | 03 sec. 6; 07 sec. 2.1 | P0 | S3 |
| TRF-009 | The system shall reverse any transfer or acknowledgement as a compensating posting restoring the exact prior ledger state. | 03 sec. 3 | P0 | S3 |
| TRF-010 | The system shall maintain TransOutKgs / TransInKgs on each affected program per the transfer_bal policy when order-to-order legs occur. | 03 sec. 4.1, sec. 5; 07 sec. 2.3 | P0 | S3 |
| TRF-011 | The system shall show pending acknowledgement status (Arl/AKg/AMtr) for unit DCs on the DC card. | 02 sec. 7 | P1 | S3 |
| TRF-012 | The system shall print the UnitAck register from the commercial report family for pending/received unit transfers. | 07 sec. 1.2 | P1 | S3 |
| TRF-013 | The system shall provide mobile stock-transfer and unit-transfer parity (/m/entry/stock-transfer, /m/entry/unit-transfer) against the same endpoints. | 06 sec. K | P1 | S2+ |
| TRF-014 | The system shall save each transfer and acknowledgement in exactly one transaction with projector scheduling and outbox events emitted. | 03 sec. 3; 04 sec. 14 | P0 | S3 |

## 4. Business rules & validations

| BR | Rule (flags verbatim) | Source |
|---|---|---|
| BR-01 | Unit transfer behavior: inhousetransfer / stock_maintain_reqd_for_inhousetransfer decide whether in-house unit transfers maintain stock and how the ack leg posts. | 07 sec. 2.3; 02 sec. 8 |
| BR-02 | Transfer balance policy: transfer_bal governs projector handling of transfer legs; order-to-order legs stamp TransOutKgs/TransInKgs per program. | 07 sec. 2.3; 03 sec. 4.1 |
| BR-03 | Issue shortage on transfers: i_scheck / i_sdev warn/block when issuing beyond stock. | 03 sec. 6; 07 sec. 2.1 |
| BR-04 | Transfer kg deviation: trankgs_dev bounds the kg difference on transfer documents. | 03 sec. 6; 07 sec. 2.1 |
| BR-05 | Roll module: rollno_module_reqd / all_transaction_basedon_rollno / rollnofrommc / roll_grn_excess gate roll-level capture; exces_for_finalrollwtentry caps excess on final roll weight entry. | 07 sec. 2.1, 2.3 |
| BR-06 | Roll writer semantics (Sp_currentstock_RollDtl parity): forced @Rls=1; a '-' on a missing roll row inserts a negative row; @delflg='N' subtracts, else the roll row is DELETEd; dept-11 special cases preserved. | 03 sec. 3 |
| BR-07 | Stage-wise pcs stock: stagewisepcsstock_and_transactionreqd switches the Pcs ledger into stage-wise stock/transaction mode (affects adjustments and stage-wise openings). | 07 sec. 2.3 |
| BR-08 | Posting side-effect: currentstockpostingflag toggles current-stock posting on the writing paths. | 07 sec. 2.3 |
| BR-09 | Negative stock: 'G' buckets never go negative silently - warn-not-block per engine policy, surfaced in PostingPreview (legacy-allowed behavior preserved). | 03 sec. 3 |
| BR-10 | Reversal: every R04 document reverses via inverted-sign compensating posting inside one transaction; raw deletes of ledger rows are forbidden. | 03 sec. 3 |
| BR-11 | Sync flags: every ST_*/WBS_* affecting row is stamped UpdateFlg=1 (SyncFlagProjector) so Commando pull/ack stays consistent. | 03 sec. 5; 04 sec. 11 |
| BR-12 | Acknowledgement parity: godown/unit (and acc, frmAccack) acknowledgements apply the same mechanics as piece DC/GRN ack vs own units/godowns (03 sec. 4.3 ack row). | 03 sec. 4.3; 06 sec. O |
| BR-13 | Opening stock: openings post as Trs_Opening + movements; _CompWise variant posts per component; stage-wise pcs opening is gated by BR-07. | 02 sec. 6, sec. 8; 06 sec. F |
| BR-14 | Godown transfer identity: TrType 14 with Party=GodID moves stock - src / + dst with no balance effect; change-godown uses the same movement. | 03 sec. 4.1; 06 sec. H |
| BR-15 | Registers semantics: register family reads Vue_StkLedger semantics with godown/dept/color/size drill; the ledger view shows a running balance. | 02 sec. 8; 06 sec. H |

## 5. Data & postings (03 sec. 4.1 rows that apply + engine/projector semantics; signs transcribed to ASCII)

Movement matrix rows that apply to this module (verbatim from 03 sec. 4.1):

| Document | Type code | FABRIC ledger effect | Balance effect (projector) |
|---|---|---|---|
| Order-to-order transfer out/in | Del, TrType 3/8 (TranOrdID/TranID) | - source order + target order | TransOutKgs / TransInKgs on each program |
| Godown transfer | Del, TrType 14 (Party=GodID) | - src godown + dst godown | none |
| Unit DC | Del, TrType 17 | - unit godown + receiving unit | unit ack pending (Trs_UnitAck) |

Engine semantics every R04 write must satisfy (03 sec. 2-3):

- Ledger keys: FABRIC = {ordId, styleNo, stockId, godId} with Bg/Kg/Mt(+RollDtl) per
  (OrdId,StockId,GodID); PANEL adds the CompId dimension (no EmpID); PCS adds
  StageId/PartyId/Line/Good-'M' with RejectionTypeId on 'M'.
- One db transaction per document action; MovementSet applied by PostingEngine; projectors
  scheduled on the affected keys; outbox event emitted before commit.
- Delete/reversal = same MovementSet with inverted signs (compensating posting), replacing
  the legacy cursor-based PROC_*_Delete* procs with identical net effect.
- Negative on 'G' buckets: warn-not-block (PostingPreview), preserving legacy behavior.

Projector rows owned or consumed by this module (verbatim from 03 sec. 5):

| Projector | Legacy trigger/proc | Maintains |
|---|---|---|
| CurrentStockRollProjector | Sp_currentstock_RollDtl | roll-level lineage |
| SyncFlagProjector | Trg_ST_* / Trg_WBS_* (UpdateFlg=1) | dirty flags for Commando sync (05) |
| ProgBalanceFabricProjector (transfer legs) | TRG_FAB_BALANCE_DEL family | ST_ProgBalance_Fabric incl. transfer TransIn/TransOut and the RTC equalize rule |

Roll writer (Sp_currentstock_RollDtl, per the 03 sec. 3 warning): forces @Rls=1; a '-' on
a missing roll row inserts a negative row; @delflg='N' subtracts, otherwise the roll row
is DELETEd; dept-11 special cases apply. The Sp_currentstock body itself must be extracted
from the live DB before the FABRIC-ledger writer is implemented (B1).

## 6. UI & routes

| Route | Components | Legacy forms |
|---|---|---|
| /stock/current | CurrentStock x 3 ledgers dashboard | (new; Trg_CurrentStock_Update sync parity) |
| /stock/view | StockBalanceTable browser | frmStockView, frmfabstockshow, frmYarnStockShow, frmAccStockShow, frmPieceStock(All), FrmRejPieceStock |
| /stock/registers | StockRegisterTable (drill) | FrmStockRegister family (General/Fabric/Yarn/Acc/Itemwise/_Style/_StylePcs/_SplRpt) |
| /stock/registers/ledger | running-balance ledger | FrmStockLedger |
| /stock/transfers/godown | transfer form + godown pickers | FrmStkTransfer, FrmChangeGodown, FrmGoDownSel |
| /stock/transfers/unit | unit transfer + ack form | unit transfer UI, FrmUnitTransferAck |
| /stock/transfers/pieces-godown | pcs transfer form | FrmPcsGodTransfer |
| /stock/transfers/ack/godown | ack form | FrmGoDownAck, FrmGodownTransferAck |
| /stock/transfers/ack/unit | ack form | Trs_UnitAck1/2 UI (PROC_UnitAck_*) |
| /stock/adjustment | adjustment forms | frmStockAdjustment(_Domestic), frmPcsStockAdjustmentEntry, frmPcsStagewiseOpeningStock |
| /stock/roll-split | roll split form (lineage view) | FrmRollSplit |
| /grn/opening | opening form | frmOpeningStock(_CompWise) |
| /stock/options | OptionsPanel | frmOptions, FrmOptionsPrint, FrmOptionUpdate |
| /m/stock/ledger, /m/entry/stock-transfer, /m/entry/unit-transfer | mobile parity | Commando stock/transfer screens |

## 7. API endpoints (04 sec. 7, plus sync from sec. 11)

| Endpoint | Service | Purpose |
|---|---|---|
| GET /api/stock/current?ledger=fabric|panel|pcs | StockService.current() | 3-ledger current stock |
| GET /api/stock/register?variant=... | StockService.register() | StockRegister family |
| GET /api/stock/ledger?ordId&stockId | StockService.ledger() | Vue_StkLedger running balance |
| POST /api/stock/transfer (godown|unit|pcs-godown) | StockService.transfer() | TrType 14/17 transfers |
| POST /api/stock/ack/godown|unit | StockService.ack() | PROC_GodownAck_* / UnitAck_* |
| POST /api/stock/adjustment | StockService.adjust() | frmStockAdjustment family |
| POST /api/stock/roll-split | RollService.split() | FrmRollSplit |
| POST /api/stock/opening | StockService.opening() | frmOpeningStock(_CompWise) |
| GET /api/sync/pull?since= / POST /api/sync/ack | SyncService.pull()/ack() | UpdateFlg=1 dirty rows for Commando |

## 8. Reports & prints (07 sec. 1.2 Stock family, plus 1.1 roll labels)

| Family | Templates | Data source |
|---|---|---|
| Stock registers | RptClosingStock (Det, Mtr, Deptwise), Opening (Yarn/Fab/Acc), StockAdj, Inward, StkLedger | CurrentStock/3 ledgers |
| Unit acknowledgement | UnitAck | Trs_UnitAck |
| Barcode labels | RptBarcodePrint_FabRoll (zxing SVG) | roll data |

## 9. Flags affecting this module

| Flag | Effect | Enforcement point |
|---|---|---|
| inhousetransfer / stock_maintain_reqd_for_inhousetransfer | unit transfer behavior | StockService |
| transfer_bal | transfer balance policy | Projectors |
| i_scheck / i_sdev | issue shortage check on transfers | StockService/DcService |
| trankgs_dev | transfer kg deviation | StockService/DcService |
| rollno_module_reqd / all_transaction_basedon_rollno / rollnofrommc / roll_grn_excess | roll module | RollService |
| exces_for_finalrollwtentry | excess cap on final roll weight entry | RollService |
| stagewisepcsstock_and_transactionreqd | stage-wise pcs stock mode | PostingEngine/StockService |
| currentstockpostingflag | current-stock posting side-effect | PostingEngine |
| splreports_reqd | special-report variants incl. the StockRegister _SplRpt variant (grouped under MIS options in 07) | StockService/reports |
| qr_roll_labels (new, default OFF; auto-on when all_transaction_basedon_rollno='Y') | FAB_ROLL QR labels on rolls | LabelService (08) |

## 10. Traceability (legacy form -> FR IDs)

| Legacy form | FR IDs |
|---|---|
| FrmStockRegister family (General/Fabric/Yarn/Acc/Itemwise/_Style/_StylePcs/_SplRpt) | STK-004, STK-006 |
| FrmStockLedger | STK-005 |
| frmStockView / frmfabstockshow / frmYarnStockShow / frmAccStockShow | STK-003 |
| frmPieceStock(All) | STK-003, STK-030 |
| FrmRejPieceStock | STK-003, STK-030 |
| FrmStkTransfer | TRF-001, TRF-002 |
| FrmChangeGodown / FrmGoDownSel | STK-029 |
| unit transfer + FrmUnitTransferAck | TRF-003, TRF-004, TRF-006, TRF-011 |
| FrmPcsGodTransfer | TRF-007 |
| FrmGoDownAck / FrmGodownTransferAck | TRF-005, TRF-006 |
| frmStockAdjustment(_Domestic) | STK-007 |
| frmPcsStockAdjustmentEntry | STK-008 |
| frmPcsStagewiseOpeningStock | STK-009 |
| FrmRollSplit | STK-011 |
| frmOpeningStock(_CompWise) | STK-010 |
| frmOptions / FrmOptionsPrint / FrmOptionUpdate | STK-020 |
| frmAccack | STK-024 |
| /m/stock/ledger | STK-025 |
| /m/entry/stock-transfer, /m/entry/unit-transfer | TRF-013 |

## 11. Open items / blockers

| ID | Item | Impact |
|---|---|---|
| B1 | Sp_currentstock definition is not on disk (03 sec. 3; 11 sec. 2.9, sec. 6.1); the FABRIC-ledger writer (STK-014) and roll writer (STK-013) must wait for the S0.2 live extraction; G2 live parity is blocked meanwhile. | Blocks all R04 posting paths. |
| B2 | Live-DB drift: godown/unit ack proc families (PROC_GodownAck_*, PROC_UnitAck_*) and the Trg_ST_* sync triggers were NOT in the 11 verification round (11 sec. 6.2) - re-extract and proc-verify before coding TRF-004/005/006 and STK-019; per-module drift check required (11 sec. 6.3). | Ack and sync parity unproven until extracted. |
| OI-1 | Roll-detail edge semantics ('-' on a missing roll row inserts a negative row; dept-11 special cases) are preserved as-is; build a golden fixture from a live run so the odd behavior is locked, not silently "fixed". | STK-013 parity. |
| OI-2 | Trg_CurrentStock_Update trigger body is referenced by /stock/current sync (02 sec. 8) but is not in the on-disk verified set - include it in the S0.2 extraction list. | STK-002. |
| OI-3 | splreports_reqd is grouped under costing/MIS options in 07 sec. 2.3 but the StockRegister _SplRpt variant (06 sec. H) depends on it - confirm the enforcement point before wiring STK-004. | STK-004 variant gating. |
| OI-4 | frmOptions per-order stock options: confirm the Options-store reader covers per-order overrides (not just the 189 global flags) before wiring STK-020. | STK-020. |
| OI-5 | UnitAck report template parameters (.mrt) may not yet be extracted - follow the B4 pattern (never invent parameter lists) before building TRF-012. | TRF-012. |
| OI-6 | QR roll labels (STK-027) depend on the 08 tracking fabric and default OFF; keep the rollout sequenced with S7 and the qr_roll_labels auto-on rule tied to all_transaction_basedon_rollno='Y'. | STK-027 staging. |
