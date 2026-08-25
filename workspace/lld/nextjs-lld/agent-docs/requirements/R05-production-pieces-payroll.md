# R05 - Production, Pieces & Payroll Capture

## 1. Purpose & business context

R05 owns the garment conversion chain: fabric becomes cut bundles (cutting), bundles become
pieces and panels (production entries, barcode scans), pieces move through stitching lines
and outside job-workers (piece DC/GRN, line movements), and every good piece carries a wage
cost (piece-rate and shift wages). All writes go through the PostingEngine against the PCS
and PANEL ledgers (03 sec. 3), summarized by the ST_Production_Data projector (5 trans
types). The requirements encode the verified live behavior from 11 (dispatcher parity,
deduction-only assembly, dead legs excluded, corrected barcode posting); dead code is NOT
ported and the corrected counters deviate from defective legacy under X3 sign-off.

## 2. Scope (legacy forms in)

- Cutting: frmReadytoCut (screen; TrType 20 posting row owned by R03), FrmCuttingProduction_Auto_New,
  frmCuttingJobOrder, frmProcessOrd, FrmJobOrderList, frmCuttingIssue, FrmCutingReg,
  FrmCuttingfabretreg, FrmCutting_FabRej, frmAddPanelCutting, frmProdCutComponents,
  FrmPartDefineEntry (06 sec. I, sec. O; 02 sec. 9).
- Production entries: frmProduction, FrmProduction_CutPanel, FrmBundle_ProductionEntry,
  FrmOperationEntry, frmProdutionConfig, FrmHourlySetting1, frmHours, frmBarcodeReadingNew,
  line input/output/transfer UIs, FrmIssueToProduction, FrmProductionEntryReg,
  FrmProductionStatusReg, FrmInhouseProductionStatusReg, FrmOrdProdTrack, FrmOrdBundIssToLineReg
  (06 sec. I, sec. O; 02 sec. 10).
- Panels & pieces: frmPcsRec, frmPrsGRNMulti family, frmPcsRej, frmPanelRej, frmPcsShort,
  FrmPanelExcessEntry(_Stage), FrmFinishGoodsEntry, frmJobWorkPcsReturn, piece/panel stock
  registers (FrmOrderwisePcsReg), reprocess screens (Prod_PcsRworkIssue + ReworkApproval
  gate) (06 sec. I, sec. O; 02 sec. 11).
- Payroll capture: Frm_ProductionWages, shift wages UI, FrmProdShiftWagesReg,
  CachedRpt_ProductionWagesReg, payroll settings + compliance screens, FrmProdWagesDept,
  FrmProdWagesStage, FrmProdBillNew (subcontract wages bill) (02 sec. 15; 06 sec. J).
- Mobile parity: /m/scan, /m/scan-history, /m/entry/production, /m/entry/stage,
  /m/entry/rejection (06 sec. K).
- Out of scope: cutting acknowledgement (Trs_CutApr, R03), piece/panel DC save shells
  (R03 owns the frmPcsDel family save path; R05 owns the posting semantics), despatch
  close (R03), wages-bill settlement and payments (R06 PAY-), production/style expenses
  (costing R-doc), report engine internals (S2.5).

## 3. Functional requirements

| FR ID | Requirement (testable "shall") | Source | Priority | Stage |
|---|---|---|---|---|
| CUT-001 | The system shall provide the ready-to-cut screen (/cutting/ready-to-cut) replacing frmReadytoCut as a TrType 20 stage pass-through whose GRN side := DC side equalize rule and ReturnKgs are owned by the R03 DC save path (DC-012/013). | 02 sec. 9; 03 sec. 4.1; 06 sec. I | P1 | S3 |
| CUT-002 | The system shall print the READYTOCUT and READYTOCUT RETURN templates from Trs_Pcs/RTC data. | 02 sec. 9; 07 sec. 1.1 | P1 | S3 |
| CUT-003 | The system shall save cutting production (FrmCuttingProduction_Auto_New) via POST /api/cutting/production generating bundles and barcodes in one transaction. | 02 sec. 9; 04 sec. 8; 06 sec. I | P0 | S4 |
| CUT-004 | The system shall present the CutPlanPanel comparing CutPlanQty vs OrderQty plus the excess % (jobexcess cap) before bundle generation. | 02 sec. 9; 03 sec. 8 | P0 | S4 |
| CUT-005 | The system shall capture lay/marker info in the LayPanel and print the BarcodeLayReport. | 02 sec. 9; 07 sec. 1.1 | P1 | S4 |
| CUT-006 | The system shall generate bundles via BundleGenerator writing Pay_CuttProdMas -> Pay_CuttProd_Bundle with bundle pcs. | 02 sec. 9 | P0 | S4 |
| CUT-007 | The system shall generate bundle/piece barcode labels from Pay_BarcodeGeneration + Pay_BundlePcs_Barcode as zxing SVG (BarcodePrintPanel) and print RptBarcodePrint_Pcs, RptBarcodePrint_AllBundle(_Panel), and RptBundle_BarcodePrint. | 02 sec. 9, sec. 21; 07 sec. 1.1 | P0 | S4 |
| CUT-008 | The system shall provide the BitCutPanel capturing PcsPerBit against Mas_Bitsize with bit-cut rates from Pro_Prod_BitCutRate and bit consumption per SP_ConsQuery2 parity. | 02 sec. 9; 04 sec. 3 | P1 | S4 |
| CUT-009 | The system shall save cutting job orders (frmCuttingJobOrder, Cutting_Job) via POST /api/cutting/job-order and surface the job-order balance from Sp_PartyWiseJobOrderBal. | 02 sec. 9; 03 sec. 4.1; 04 sec. 8; 06 sec. I | P0 | S4 |
| CUT-010 | The system shall provide process-order entry (frmProcessOrd) as the process tab of the job-order screen through the same CuttingService.jobOrder() path. | 06 sec. O | P1 | S4 |
| CUT-011 | The system shall provide the job-order list (FrmJobOrderList) via CuttingService.list(). | 06 sec. O | P1 | S4 |
| CUT-012 | The system shall honor job-order mode flags jobordertype, cuttingdc_joborder, jobexcess, and joborderstagewise in the job-order and cutting-production flows. | 07 sec. 2.3 | P0 | S4 |
| CUT-013 | The system shall validate cutting DC vs job order against cuttingdc_joborder / cutting_dcjoborder_deviation, warning or blocking per the flag pair. | 03 sec. 6; 07 sec. 2.1 | P0 | S4 |
| CUT-014 | The system shall print the CuttingJobOrder (GST) template from Trs_ProdEntry/Pay_* data. | 07 sec. 1.1, 1.2 | P1 | S4 |
| CUT-015 | The system shall save cutting issues (frmCuttingIssue, fabric to cutting floor) via POST /api/cutting/issue in one transaction. | 02 sec. 9; 04 sec. 8; 06 sec. I | P0 | S4 |
| CUT-016 | The system shall provide the cutting registers replacing FrmCutingReg and FrmCuttingfabretreg. | 02 sec. 9; 06 sec. I | P1 | S4 |
| CUT-017 | The system shall provide the cutting fabric rejection screen (FrmCutting_FabRej). | 02 sec. 9; 06 sec. I | P1 | S4 |
| CUT-018 | The system shall provide add-panel cutting (frmAddPanelCutting) producing panel components into the PANEL ledger via the panel-production path. | 02 sec. 9; 03 sec. 4.2; 06 sec. I | P1 | S4 |
| CUT-019 | The system shall provide the cut-components screens (frmProdCutComponents, FrmPartDefineEntry) maintaining Order_PartDtl with PcsPerPart. | 02 sec. 9; 06 sec. I | P1 | S4 |
| CUT-020 | The system shall save every cutting document in exactly one transaction with projector scheduling, sync flags, and an outbox event, returning the posting preview. | 03 sec. 3; 04 sec. 14 | P0 | S4 |
| CUT-021 | The system shall keep Pay_BundlePcs_Barcode.Pcs_Status as the authoritative payroll anchor, with TrackUnit rows referencing it via legacyRef rather than replacing it. | 03 sec. 10 | P1 | S4 |
| CUT-022 | The system shall emit CUT_LAY/BUNDLE/PIECE tracking units and QR bundle labels at cutting when qr_track_enabled/qr_bundle_labels are on (default OFF), per TrackPolicy. | 03 sec. 10; 07 sec. 3.1; 06 sec. N | P2 | S7 |
| PRD-001 | The system shall save production entries (frmProduction family) via POST /api/production/entry routed through the dispatcher implementing 03 sec. 4.2 verbatim. | 02 sec. 10; 04 sec. 8; 03 sec. 4.2 | P0 | S4 |
| PRD-002 | The system shall capture the Trs_ProdEntry header fields Stage, SourceStage, Part, Color, Lot, Line (EmpId), and Hrs in ProdEntryForm. | 02 sec. 10 | P0 | S4 |
| PRD-003 | The system shall capture per-size quantities in SizeQtyGrid as Trs_ProdEntryQty (SizId x ProdPcs). | 02 sec. 10 | P0 | S4 |
| PRD-004 | The system shall post piece production for any Piece stage as target bucket + on 'G', source stage bucket -, and ProductionQty +. | 03 sec. 4.2 | P0 | S4 |
| PRD-005 | The system shall post stage-to-stage entries (Stage != 1 and FinalStage = 'S') with source = SourceStageId bucket where FinalStage = Mas_Dept.SemiFinish, requiring PcsType = 'Piece' on the additional deduction branches, and shall keep the separate Stage=1 + Rework=1 source-deduction block. | 03 sec. 4.2 | P0 | S4 |
| PRD-006 | The system shall post final-stage entries (FinalStage = 'F') with source via Trs_ProdEntry_SourceStageDtl, spreading per PcsPerColor combo colors when EntryOption != 1. | 03 sec. 4.2 | P0 | S4 |
| PRD-007 | The system shall implement dispatcher _1 parity: LineOut flag hardcoded 'Y', Rework != 1, Spl_Operation = 'N', with source = line bucket (Pcs_StockTable.EmpID = SrcLineID). | 03 sec. 4.2; 11 sec. 2.4 | P0 | S4 |
| PRD-008 | The system shall post rework entries (Rework = 1, i.e. any value not in {0,2}) as consuming the 'M' bucket with RejectionTypeId and outputting 'G'. | 03 sec. 4.2; 11 sec. 2.4 | P0 | S4 |
| PRD-009 | The system shall treat Rework = 2 as a normal ('G') entry per the verified dispatcher semantics. | 03 sec. 4.2; 11 sec. 2.4 | P0 | S4 |
| PRD-010 | The system shall route rework rows via dispatcher _2 -> Sp_ProductionEntryQty_2 -> ..._LineOut_PrdEntry_ReWrk which keys the line bucket by LineID (not SrcLineID), and shall NOT port its disabled 'F' branches (kept as documented, unreachable). | 03 sec. 4.2; 11 sec. 2.4, sec. 4 | P0 | S4 |
| PRD-011 | The system shall route entry updates and deletes through the variant procs PROC_Stock_ProdPieces_Update_LineOut and PROC_Stock_ProdPieces_Delete_LineOut_PrdEntry(_Rewrk), where both arms of _1 use the LineOut variants and _2 mirrors with _Rewrk. | 03 sec. 4.2; 11 sec. 2.4 | P0 | S4 |
| PRD-012 | The system shall skip stock posting and skip StockPostingFlg for entries at stages with Mas_JobWrkComp.Spl_Operation = 'Y' (flag parity). | 03 sec. 4.2 | P0 | S4 |
| PRD-013 | The system shall validate the stage route in RouteGuard per Prod_Sequence (source = prior stage) with SP_PcsBarcode_Check parity before an entry saves. | 02 sec. 10 | P0 | S4 |
| PRD-014 | The system shall show target + / source - bucket effects in PostingPreview before every production-entry save. | 02 sec. 10; 03 sec. 3 | P0 | S4 |
| PRD-015 | The system shall provide the entry-screen variants FrmProduction_CutPanel, FrmBundle_ProductionEntry, and FrmOperationEntry on /production/entry through the same save path. | 02 sec. 10; 06 sec. I | P1 | S4 |
| PRD-016 | The system shall provide the production config dialog (frmProdutionConfig) as a config panel over the production entry screen. | 06 sec. O | P2 | S4 |
| PRD-017 | The system shall provide the hourly production settings (FrmHourlySetting1, frmHours) capturing day1/2/3 efficiency, speed, and sdelay. | 02 sec. 10; 06 sec. E | P1 | S4 |
| PRD-018 | The system shall provide the production registers FrmProductionEntryReg, FrmProductionStatusReg, FrmInhouseProductionStatusReg, and FrmOrdBundIssToLineReg. | 02 sec. 10; 06 sec. I, sec. O | P1 | S4 |
| PRD-019 | The system shall provide the order production track screen (FrmOrdProdTrack) at /production/registers/track. | 02 sec. 10; 06 sec. I | P1 | S4 |
| PRD-020 | The system shall provide mobile production-entry and stage-entry parity (/m/entry/production, /m/entry/stage) against the same POST /api/production/entry endpoint. | 02 sec. 20; 06 sec. K | P1 | S4 |
| PRD-021 | The system shall save every production entry (and its update/delete variants) in exactly one transaction with projectors scheduled and an outbox event emitted. | 03 sec. 3; 04 sec. 14 | P0 | S4 |
| PRD-022 | The system shall maintain the ST_Production_Data summary through ProductionDataProjector parity for all five trans types ('PRDN','DC','GRN','REJ','REWRK' +/-), where PartyId is part of the key only for DC/GRN/REJ and OrderQty/OrderWithExsQty are zeroed only on DC '-'. | 03 sec. 5; 11 sec. 2.6 | P0 | S4 |
| PRD-023 | The system shall honor prodentry as the production-entry mode switch and prodnrejpostingflag / prdnrej flags as the production rejection posting switches on the dispatcher paths. | 07 sec. 2.3 | P0 | S4 |
| PRD-024 | The system shall provide the ReworkToggle (Rework=1 consumes 'M', returns 'G') on the ProdEntryForm per PRD-008 semantics. | 02 sec. 10 | P0 | S4 |
| PAN-001 | The system shall post panel production for PcsType in {'Piece','Panel'} as Panel_StockTableQty + carrying the CompId dimension. | 03 sec. 4.2; 11 sec. 2.4 | P0 | S4 |
| PAN-002 | The system shall maintain the PANEL ledger WITHOUT any EmpID dimension on every panel posting. | 03 sec. 4.2; 11 sec. 2.4 | P0 | S4 |
| PAN-003 | The system shall implement panel assembly (Sp_ProductionEntryQty_Panel_ASM -> PROC_Stock_ProdPanel_Asm) as DEDUCTION-ONLY: each component is deducted (Panel_StockTableQty -) joining Trs_AddPanelAsm_SourceDtl on compID + SourceStageId. | 03 sec. 4.2; 11 sec. 2.1, sec. 2.4 | P0 | S4 |
| PAN-004 | The system shall post the assembled part's + separately through the panel-production path (Sp_ProductionEntryQty_Panel_1 -> PROC_Stock_ProdPanel), never inside the ASM proc. | 03 sec. 4.2; 11 sec. 2.1 | P0 | S4 |
| PAN-005 | The system shall apply the panel rework rule where the Rework=2 exemption is absent (panel rework with Rework=2 is treated as rework, unlike pieces). | 03 sec. 4.2; 11 sec. 2.4 | P0 | S4 |
| PAN-006 | The system shall gate panel postings on PcsType = 'Piece' OR 'Panel' (the panel gate is the union, not Piece-only). | 03 sec. 4.2; 11 sec. 2.4 | P0 | S4 |
| PAN-007 | The system shall provide panel excess entry (FrmPanelExcessEntry and the _Stage variant) gated by panelembelishexsper and the panel emb/excess completion caps. | 02 sec. 9, sec. 11; 03 sec. 6; 06 sec. I | P1 | S4 |
| PCS-001 | The system shall post rejection entries (Trs_PcsRej) as line 'G' bucket - (StockQty and ProductionQty) at Stk_StageId under the line, then 'M' bucket + (RejectionTypeId) at stage under EmpID=0, gated by prodnrejpostingflag. | 03 sec. 4.2; 04 sec. 8 | P0 | S4 |
| PCS-002 | The system shall provide the rejection screens frmPcsRej and frmPanelRej on /pieces/rejection via POST /api/production/rejection. | 02 sec. 11; 04 sec. 8; 06 sec. I | P0 | S4 |
| PCS-003 | The system shall provide the piece short screen (frmPcsShort) on /pieces/short. | 02 sec. 11; 06 sec. I | P2 | S4 |
| PCS-004 | The system shall post issue-to-line (Trs_LineInput) as line bucket + at TargetStageID (EmpID = line) AND source-stage bucket - (EmpID = 0) when PcsType in {Piece,Bit} or the stage is the same. | 03 sec. 4.2; 11 sec. 2.2 | P0 | S4 |
| PCS-005 | The system shall NOT port the dead Despatch/Sales finished-bucket leg of PROC_Stock_IssueToPrdn_Insert (@DelType hardcoded ''); the live despatch deduction is owned by the PiecesDelivery path (PCS-012). | 03 sec. 4.2; 11 sec. 2.2, sec. 4 | P0 | S4 |
| PCS-006 | The system shall provide the line-input screen (FrmLineInput, FrmLineInput(Manual)) via POST /api/production/line-input. | 02 sec. 10; 04 sec. 8; 06 sec. I | P0 | S4 |
| PCS-007 | The system shall provide the line-output screens (frmLineOutputManual and _New) via POST /api/production/line-out with source = last stitch operation. | 02 sec. 10; 04 sec. 8; 06 sec. I | P0 | S4 |
| PCS-008 | The system shall post line transfers (Trs_LineTfr) as + at TargetStage under TOEMPID and - at SourceStage under the from-EMPID, gated by PcsType in {Piece,Bit} or same-stage, and shall NOT port the dead RewrkStk legs (GAN flag unreachable). | 03 sec. 4.2; 11 sec. 2.3, sec. 4 | P0 | S4 |
| PCS-009 | The system shall provide the line-transfer screen (/production/lines/transfer, EMPID -> TOEMPID) via POST /api/production/line-tfr. | 02 sec. 10; 04 sec. 8; 06 sec. I | P0 | S4 |
| PCS-010 | The system shall provide the issue-to-production screen (FrmIssueToProduction) via POST /api/production/issue-to-prdn implementing the live PCS-004 behavior only. | 02 sec. 10; 04 sec. 8; 06 sec. I | P1 | S4 |
| PCS-011 | The system shall post a piece process DC (Trs_Pcs1/2) as party bucket + at TargetStageID AND company bucket - at SourceStageID, with BOTH legs keyed by ProcessType: 'P' -> 'G'/0, else 'M'/RejectionTypeId. | 03 sec. 4.3; 11 sec. 2.5 | P0 | S4 |
| PCS-012 | The system shall post a despatch/sales piece DC by deducting the finished-stage bucket at FinishedStageID (-3 for Despatch, SourceStageID for Sales), 'G', PartyId=0, as the live despatch deduction (the IssueToPrdn leg is dead code). | 03 sec. 4.3; 11 sec. 2.2 | P0 | S4 |
| PCS-013 | The system shall skip the party-add leg of a piece DC when the document type is 'JobWork Return'. | 03 sec. 4.3 | P1 | S4 |
| PCS-014 | The system shall apply the GAN rework path (Options.GRNAcceptance_Pcs='Y' AND order type 'W' AND ProcessType='R') by deducting the RewrkStk column instead of the normal company leg. | 03 sec. 4.3 | P1 | S4 |
| PCS-015 | The system shall implement the piece DC _LineStk variant identically to PCS-011 except that the DEDUCT legs switch to the line bucket (EmpID = SrcLineID) while the party-add leg stays on EmpID=0. | 03 sec. 4.3; 11 sec. 2.5 | P0 | S4 |
| PCS-016 | The system shall drive the ST_Ord_inHand 'DES' posting (OrdInHandProjector) from despatch piece DC entries. | 03 sec. 4.3, sec. 5 | P0 | S4 |
| PCS-017 | The system shall provide the piece DC screens frmPcsDel (incl. _Ship and Rework) and frmPrsDel (Multi/_Acc/_Compwise) via POST /api/dc/pieces with R05 posting semantics (save shells owned by R03 DC-029). | 02 sec. 7, sec. 10; 04 sec. 6, sec. 8; 06 sec. I | P0 | S4 |
| PCS-018 | The system shall post a piece GRN (Trs_PcsGrn1/2) as company bucket at TargetStage + RecPcs on StockQty and ProductionQty, with RewrkPcs -> RewrkStk column and RejPcs -> RejStk column ON THE COMPANY 'G' ROW (not separate 'M' buckets). | 03 sec. 4.3; 11 sec. 2.5 | P0 | S4 |
| PCS-019 | The system shall post a piece 'Process Return' GRN by reversing the party bucket (P -> 'G', R -> 'M'/RejectionTypeId). | 03 sec. 4.3 | P0 | S4 |
| PCS-020 | The system shall post a multi-stage GRN (DCTargetStage != stage) by deducting the combined RecPcs+Rewrk+Rej from the party bucket. | 03 sec. 4.3 | P0 | S4 |
| PCS-021 | The system shall handle the cutting-GRN case (JobWrkCuttingGrn='Y', stage 1, Piece) by additionally restoring the party bucket. | 03 sec. 4.3 | P1 | S4 |
| PCS-022 | The system shall provide the piece receipt screens (frmPcsRec, frmPrsGRNMulti family, FrmFinishGoodsEntry) via POST /api/production/pcs-grn (+multi/compwise) with PROC_PiecesReceipt insert parity. | 02 sec. 11; 04 sec. 8; 06 sec. I | P0 | S4 |
| PCS-023 | The system shall reverse a piece GRN with PROC_PiecesReceipt_Delete parity, restoring only the 'F' branch (the commented-out 'S'-branch Process-Return restore is dead code and not ported). | 03 sec. 3; 11 sec. 4 | P0 | S4 |
| PCS-024 | The system shall provide job-work piece return (frmJobWorkPcsReturn) via POST /api/production/pcs-return. | 02 sec. 10; 04 sec. 8; 06 sec. I | P1 | S4 |
| PCS-025 | The system shall provide the piece/panel stock browser at /pieces/stock over Pcs_StockTable(Qty) and Panel_StockTable(Qty) by stage x line x G/'M' including FrmOrderwisePcsReg. | 02 sec. 11; 06 sec. I, sec. O | P0 | S4 |
| PCS-026 | The system shall provide the rework issue/return screens (Prod_PcsRworkIssue) with the ReworkApproval gate before rework consumption posts. | 02 sec. 11, sec. 16 | P1 | S4 |
| PCS-027 | The system shall print piece/panel DC templates PcsDc/PcsDc1 (SGST, Cost, Panel, Bit, Rework, Acc variants) from Trs_Pcs1/2 data. | 07 sec. 1.1 | P1 | S4 |
| PCS-028 | The system shall print PcsReceipt, PcsDespatch, PcsTransfer, and PcsShipSample from Trs_Pcs data. | 07 sec. 1.1 | P1 | S4 |
| PCS-029 | The system shall provide mobile rejection-entry parity (/m/entry/rejection) against POST /api/production/rejection. | 02 sec. 20; 06 sec. K | P1 | S4 |
| PCS-030 | The system shall reverse every R05 piece document (DC, GRN, rejection, line movement) as a compensating posting in one transaction restoring the exact prior PCS/PANEL state - no hard deletes. | 03 sec. 3 | P0 | S4 |
| BAR-001 | The system shall provide the scan station (/production/barcode and /m/scan) replacing frmBarcodeReadingNew with keyboard-wedge-first ScanConsole and camera fallback (zxing wasm). | 02 sec. 10, sec. 20; 06 sec. I, sec. K | P0 | S4 |
| BAR-002 | The system shall validate bundle scans via POST /api/scan/bundle with SP_BundleBarcode_Check parity, returning the legacy message strings verbatim: INVALID TAG, ALREADY ISSUED TO LINE, BUNDLE COMPLETED. | 02 sec. 10; 04 sec. 8; 11 sec. 1 | P0 | S4 |
| BAR-003 | The system shall validate piece scans via POST /api/scan/piece with SP_PcsBarcode_Check parity covering route, contractor allotment, FINAL PROCESS PRODUCTION MADE (verbatim), and rework-approval checks. | 02 sec. 10; 04 sec. 8; 11 sec. 1 | P0 | S4 |
| BAR-004 | The system shall validate rejection scans via POST /api/scan/rejection with SP_PcsBarcode_Check_Rejection parity capturing RejectionTypeId. | 02 sec. 10; 04 sec. 8; 11 sec. 1 | P0 | S4 |
| BAR-005 | The system shall post the barcode batch via POST /api/scan/posting (rights-gated) converting grouped unposted Pay_* rows (PostingFlg='N') into Trs_ProdEntry(+Qty) in ONE transaction. | 02 sec. 10; 04 sec. 8; 05 sec. 6 | P0 | S4 |
| BAR-006 | The system shall group scans by (date, ord, stage, part, size, line, lot, srcStage); the legacy one-header-per-size layout (SizeId in GROUP BY, Max(ID)+1 per row) is replaced by one batch transaction keeping the same group key. | 05 sec. 6; 11 sec. 2.7 | P0 | S4 |
| BAR-007 | The system shall stamp PostingFlg='Y' scoped to the posted group only - NOT by ProdDate alone as legacy did (which marked other orders' unposted rows). | 11 sec. 2.7, sec. 3 #5 | P0 | S4 |
| BAR-008 | The system shall implement corrected payroll counters: the rejection check path shall NOT increment Pay_BarcodeGeneration.goodpcs, and duplicate-row handling shall NOT double-count RejectionPcs/goodpcs (intended semantics; deviation from legacy defect #6 recorded for X3 sign-off). | 11 sec. 3 #6, sec. 5 | P0 | S4 |
| BAR-009 | The system shall scope bundle Completed='Y' updates by bundle barcode, so only the scanned bundle's equation-satisfying row closes (legacy update was unscoped). | 11 sec. 3 #8 | P0 | S4 |
| BAR-010 | The system shall execute the posting batch under a single transaction with proper ROLLBACK on error, correct cursor cleanup, and structured errors - not porting the legacy CATCH defects (@@ERROR usage, wrong-cursor close, leaked doomed tran). | 11 sec. 3 #4 | P0 | S4 |
| BAR-011 | The system shall NOT port the duplicate-row ELSE branch of SP_PcsBarcode_Check that stamps GoodPcs without inserting (dead code). | 11 sec. 4 | P0 | S4 |
| BAR-012 | The system shall read/write the production barcode tables over the configured production DB connection, ignoring the legacy unused @ProdDB parameter and hardcoded cross-db name Fiber_production. | 05 sec. 6; 11 sec. 4 | P0 | S4 |
| BAR-013 | The system shall buffer scans offline in ScanQueueOffline (IndexedDB) with idempotency keys and replay them on reconnect, on desktop and mobile. | 02 sec. 10, sec. 22; 05 sec. 6 | P0 | S4 |
| BAR-014 | The system shall serve scan history via GET /api/scan/history and render the scan-history screen (desktop + /m/scan-history). | 02 sec. 10, sec. 20; 04 sec. 8 | P1 | S4 |
| BAR-015 | The system shall emit scan.* events (05) and TrackEvent rows for scanned units so the TraceProjector reconciles scan sums against Pcs_/Panel_StockTable and ST_Production_Data. | 03 sec. 10, sec. 5; 04 sec. 11 | P1 | S4 |
| WAG-001 | The system shall accrue piece-rate wage cost when the Pay flag is set on a production entry (PayToggle), writing through to the Pay_ProdWorkDetails feed. | 02 sec. 10, sec. 15 | P0 | S4 |
| WAG-002 | The system shall capture shift wages (Trs_ProdWages: ShiftWages, Addl_Amount, no_of_persons) via POST /api/payroll/shift-wages. | 02 sec. 15; 04 sec. 10 | P0 | S4 |
| WAG-003 | The system shall provide the production-wages screen (Frm_ProductionWages) computing piece-rate wages from Pay_ProdWorkDetails. | 02 sec. 15; 06 sec. J | P0 | S4 |
| WAG-004 | The system shall provide the wages-link view (/pieces/wages-link) showing piece-rate wage arrival gated by reqd_actual_production_wage_arrived_with_payrolllink. | 02 sec. 11; 07 sec. 2.3 | P1 | S4 |
| WAG-005 | The system shall provide the shift wages register (FrmProdShiftWagesReg) with SP_Vue_RptShiftWagesReg parity via GET /api/payroll/wage-register?variant=shift. | 02 sec. 15; 04 sec. 10; 06 sec. O | P1 | S4 |
| WAG-006 | The system shall provide the production wages register with CachedRpt_ProductionWagesReg parity via GET /api/payroll/wage-register?variant=production. | 02 sec. 15; 04 sec. 10 | P1 | S4 |
| WAG-007 | The system shall provide the payroll settings screen (/payroll/settings) capturing day1effy, day2effy, day3onwards, speed, sdelay, actpwgdivper, prodcutwgtallowedper, initial_style_setupmins, and stitching_deptcode. | 02 sec. 15; 07 sec. 2.1, 2.3 | P0 | S4 |
| WAG-008 | The system shall apply the piece-rate caps pcsrateamt_excess_percent, prodbillamtdivper, and prodcutwgtallowedper/actpwgdivper on wage and production-bill amounts. | 03 sec. 6; 07 sec. 2.1 | P0 | S4 |
| WAG-009 | The system shall provide the wage cost views FrmProdWagesDept and FrmProdWagesStage under /payroll per 06 sec. J mapping. | 02 sec. 14; 06 sec. J | P1 | S4 |
| WAG-010 | The system shall save the subcontract wages bill (FrmProdBillNew, Trs_ProdBillMasNew/DetNew) with GST codes 40/41/42 feeding the R06 bills register (prd variant). | 02 sec. 10; 06 sec. I | P1 | S4 |
| WAG-011 | The system shall provide the payroll compliance page printing the Form JJ list (formjjreq), the TDS report (Rpt_TDS, off when notds), and the allgpayempreqd view. | 02 sec. 15; 07 sec. 1.2, 2.3 | P2 | S4 |

## 4. Business rules & validations

| BR | Rule (flags verbatim; verified bucket rules) | Source |
|---|---|---|
| BR-01 | Dispatcher parity: piece entries route via _1 (LineOut hardcoded 'Y', Rework != 1, Spl_Operation='N', source = line bucket EmpID = SrcLineID); rework rows route via _2 -> LineOut_PrdEntry_ReWrk keyed by LineID (not SrcLineID) with its 'F' branches disabled - kept as-is, not ported. | 03 sec. 4.2; 11 sec. 2.4 |
| BR-02 | Rework semantics: Rework=1 (any value not in {0,2}) consumes the 'M' bucket with RejectionTypeId and outputs 'G'; Rework=2 is treated as normal ('G'). Panel rework lacks the =2 exemption. | 03 sec. 4.2; 11 sec. 2.4 |
| BR-03 | Spl_Operation stages (Mas_JobWrkComp.Spl_Operation='Y') skip stock posting and skip StockPostingFlg - flag parity preserved. | 03 sec. 4.2 |
| BR-04 | Panel assembly is deduction-only; the assembled part's add comes from the separate panel-production path. Panel ledger has NO EmpID dimension; the PcsType gate is 'Piece' OR 'Panel'. | 03 sec. 4.2; 11 sec. 2.1, 2.4 |
| BR-05 | Issue-to-line live rule: line bucket + at TargetStageID (EmpID=line) AND source-stage bucket - (EmpID=0) when PcsType in {Piece,Bit} or same-stage; the Despatch/Sales finished leg, all RewrkStk branches, @GAN_PCS/Woven/ProcessType='R' branches, and the @PartyId add-gate are dead code - NOT ported. | 03 sec. 4.2; 11 sec. 2.2, sec. 4 |
| BR-06 | Line transfer live rule: + TargetStage under TOEMPID, - SourceStage under from-EMPID, gated PcsType in {Piece,Bit} or same-stage; GAN_RewrkFlg RewrkStk legs and the Despatch/Sales block are dead code - NOT ported. | 03 sec. 4.2; 11 sec. 2.3, sec. 4 |
| BR-07 | Piece DC bucket map: both legs honor ProcessType ('P'->'G'/0, else 'M'/RejectionTypeId); company deduct is at SourceStageID; 'JobWork Return' skips the party add; GAN path (GRNAcceptance_Pcs='Y' + order type 'W' + ProcessType='R') deducts RewrkStk. | 03 sec. 4.3; 11 sec. 2.5 |
| BR-08 | Piece DC _LineStk: only the DEDUCT legs switch to the line bucket (EmpID = SrcLineID); the party-add leg stays EmpID=0. | 03 sec. 4.3; 11 sec. 2.5 |
| BR-09 | Despatch/sales deduction: finished-stage bucket at FinishedStageID (-3 Despatch, SourceStageID Sales), 'G', PartyId=0 - the live rule; IssueToPrdn's finished leg is dead. | 03 sec. 4.3; 11 sec. 2.2 |
| BR-10 | Piece GRN: company 'G' row + RecPcs (StockQty and ProductionQty); RewrkPcs -> RewrkStk and RejPcs -> RejStk as COLUMNS on that row (not 'M' buckets); Process Return reverses the party bucket; multi-stage GRN deducts combined RecPcs+Rewrk+Rej from the party bucket; cutting-GRN (JobWrkCuttingGrn='Y', stage 1, Piece) restores the party bucket. | 03 sec. 4.3; 11 sec. 2.5 |
| BR-11 | Cutting DC vs job order: cuttingdc_joborder / cutting_dcjoborder_deviation warn/block on deviation; job-order mode from jobordertype; excess caps from jobexcess / joborderstagewise. | 03 sec. 6; 07 sec. 2.1, 2.3 |
| BR-12 | Panel excess: panelembelishexsper with the scheme caps schcomppercen / schpcscomppercen / autocompperc bound completion percentages. | 03 sec. 6; 07 sec. 2.1 |
| BR-13 | Production entry mode and rejection posting: prodentry / prodnrejpostingflag / prdnrej switches; currentstockpostingflag toggles stock side-effects on writing paths. | 07 sec. 2.3 |
| BR-14 | Barcode posting corrections (X3): one transaction per batch; PostingFlg='Y' scoped to the group (not ProdDate); rejection path must not touch goodpcs; no double-counted RejectionPcs/goodpcs; bundle Completed='Y' scoped by barcode. | 11 sec. 2.7, sec. 3 #4-#6, #8; PROGRESS D8 | 
| BR-15 | Scan validations return legacy message strings verbatim (INVALID TAG, ALREADY ISSUED TO LINE, BUNDLE COMPLETED, FINAL PROCESS PRODUCTION MADE) plus route/contractor/rework-approval checks. | 02 sec. 10; 11 sec. 1 | 
| BR-16 | Efficiency ramp: day1effy / day2effy / day3onwards with speed, sdelay, initial_style_setupmins, stitching_deptcode govern wage-rate arrival; actpwgdivper / prodcutwgtallowedper cap actual-weight division; pcsrateamt_excess_percent / prodbillamtdivper cap piece-rate bill amounts. | 07 sec. 2.1, 2.3; 02 sec. 15 | 
| BR-17 | Negative 'G' buckets: warn-not-block (PostingPreview), preserving legacy-allowed behavior; engine policy per 03 sec. 3. | 03 sec. 3 |
| BR-18 | Reversal: every R05 document reverses via inverted-sign compensating posting in one transaction (replaces PROC_*_Delete* cursor procs with identical net effect); piece-GRN delete restores only the 'F' branch. | 03 sec. 3; 11 sec. 4 |
| BR-19 | Sync flags: every ST_Production_Data / Pay_* affecting row is stamped UpdateFlg=1 so Commando pull/ack stays consistent. | 03 sec. 5; 04 sec. 11 |
| BR-20 | Payroll anchor: Pay_BundlePcs_Barcode.Pcs_Status remains authoritative for payroll; tracking units reference it (legacyRef) and never replace it. | 03 sec. 10 |

## 5. Data & postings

Movement matrix rows owned by R05 (verbatim from 03 sec. 4.2; ledger effects transcribed to ASCII):

| Entry | Conditions | PCS/PANEL ledger effect |
|---|---|---|
| Piece production | any Piece stage | target + ('G'); source stage -; ProductionQty + |
| Stage-to-stage | Stage!=1 && FinalStage='S' | source = SourceStageId bucket (FinalStage = Mas_Dept.SemiFinish; deduction branches additionally require PcsType='Piece'; Stage=1 + Rework=1 has its own source-deduction block) |
| Final stage | FinalStage='F' | source via Trs_ProdEntry_SourceStageDtl; EntryOption!=1 spreads per PcsPerColor combo colors |
| LineOut variant | dispatcher _1 (LineOut flag hardcoded 'Y'), Rework!=1, Spl_Operation='N' | source = line bucket (Pcs_StockTable.EmpID = SrcLineID); _LineStk analogues apply to the DC legs (4.3) |
| Rework | Rework=1 (any value not in {0,2}) | consumes 'M' bucket with RejectionTypeId, outputs 'G'; Rework=2 is treated as normal ('G'); rework rows route via dispatcher _2 -> ..._LineOut_PrdEntry_ReWrk (uses LineID not SrcLineID; its 'F' branches are disabled in legacy - kept as-is) |
| Panel production | PcsType in {'Piece','Panel'} | Panel_StockTableQty + (CompId dimension; no EmpID dimension; rework exemption lacks the =2 case) |
| Panel assembly | Sp_ProductionEntryQty_Panel_ASM -> PROC_Stock_ProdPanel_Asm | deduction-only: EACH component Panel_StockTableQty - (join Trs_AddPanelAsm_SourceDtl on compID + SourceStageId); the assembled part's + is posted separately by the panel-production path (_Panel_1 -> PROC_Stock_ProdPanel) |
| Rejection entry | Trs_PcsRej | line 'G' bucket - (StockQty & ProductionQty) at Stk_StageId under the line -> 'M' bucket + (RejectionTypeId) at stage under EmpID=0 |
| Issue to line | Trs_LineInput | line bucket + at TargetStageID (EmpID=line) AND source-stage bucket - (EmpID=0) when PcsType in {Piece,Bit} or same-stage. The Despatch/Sales finished-bucket leg in the legacy proc is dead code (@DelType hardcoded '') - NOT ported; live piece-despatch deduction lives in the PiecesDelivery proc (below) |
| Line transfer | Trs_LineTfr | + at TargetStage under TOEMPID; - at SourceStage under from-EMPID; gate PcsType in {Piece,Bit} or same-stage. Legacy RewrkStk legs are dead code (GAN flag unreachable) - not ported |
| Spl_Operation stages | Mas_JobWrkComp.Spl_Operation='Y' | skip stock posting and skip StockPostingFlg (flag parity) |
| Qty update / delete | dispatcher paths | PROC_Stock_ProdPieces_Update_LineOut / ..._Delete_LineOut_PrdEntry[_Rewrk] (both arms of _1 use the LineOut variants; _2 mirrors with _Rewrk) |

Piece DC/GRN rows (verbatim from 03 sec. 4.3):

| Document | Effect |
|---|---|
| Piece process DC (Trs_Pcs1/2) | party bucket + at TargetStageID AND company bucket - at SourceStageID - both legs keyed by ProcessType: 'P'->'G'/0, else 'M'/RejectionTypeId; 'JobWork Return' skips the party add; GAN rework path (Options.GRNAcceptance_Pcs='Y' + order type 'W' + ProcessType='R') deducts the RewrkStk column instead |
| Piece DC _LineStk variant | identical except the deduct legs switch to the line bucket (EmpID = SrcLineID); the party-add leg stays on EmpID=0 |
| Despatch/Sales piece DC | deducts the finished-stage bucket at FinishedStageID (-3 for Despatch, SourceStageID for Sales), 'G', PartyId=0 - this is the live despatch deduction (the IssueToPrdn leg is dead code); despatch entries also drive the ST_Ord_inHand 'DES' posting |
| Piece GRN (Trs_PcsGrn1/2) | company bucket at TargetStage + RecPcs (StockQty & ProductionQty); RewrkPcs->RewrkStk column, RejPcs->RejStk column - on the company 'G' row (not separate 'M' buckets); 'Process Return' reverses the party bucket (P->'G', R->'M'/RejectionTypeId); multi-stage GRN (DCTargetStage != stage) deducts combined RecPcs+Rewrk+Rej from the party bucket; cutting-GRN case (JobWrkCuttingGrn='Y', stage 1, Piece) additionally restores the party bucket |
| Unit/Godown ack (Trs_UnitAck, GoDownAck procs) | same mechanics vs own units/godowns (owned by R04 TRF) |

ST_Production_Data projector (03 sec. 5; 11 sec. 2.6) - five trans types, +/- signed:
'PRDN' (production) | 'DC' | 'GRN' | 'REJ' | 'REWRK' (ReworkQty). PartyId is part of the
key ONLY for DC/GRN/REJ; OrderQty and OrderWithExsQty are zeroed ONLY on DC '-'.

## 6. UI & routes

| Route | Components | Legacy forms |
|---|---|---|
| /cutting/ready-to-cut | ready-to-cut form + return print | frmReadytoCut |
| /cutting/production | CutPlanPanel, LayPanel, BundleGenerator, BarcodePrintPanel, BitCutPanel | FrmCuttingProduction_Auto_New |
| /cutting/job-order | JobOrderForm (process tab) + DataTable list | frmCuttingJobOrder, frmProcessOrd, FrmJobOrderList |
| /cutting/issue | cutting issue form | frmCuttingIssue |
| /cutting/register | DataTable registers | FrmCutingReg, FrmCuttingfabretreg |
| /cutting/fab-rejection | fab rejection form | FrmCutting_FabRej |
| /cutting/add-panel | add-panel cutting + excess forms | frmAddPanelCutting, FrmPanelExcessEntry(_Stage) |
| /cutting/components | components + part define forms | frmProdCutComponents, FrmPartDefineEntry |
| /production/entry | ProdEntryForm (RouteGuard, SizeQtyGrid, ReworkToggle, PayToggle) + PostingPreview | frmProduction, FrmProduction_CutPanel, FrmBundle_ProductionEntry, FrmOperationEntry, frmProdutionConfig (dialog) |
| /production/barcode | ScanConsole (BundleScan, PieceScan, RejectionScan), ScanQueueOffline, ScanHistory | frmBarcodeReadingNew |
| /production/posting | posting batch runner (rights-gated) | SP_Barcode_Production_Posting UI parity |
| /production/lines/input | line input form | FrmLineInput, FrmLineInput(Manual) |
| /production/lines/output | line output form | frmLineOutputManual(_New) |
| /production/lines/transfer | line transfer form (EMPID -> TOEMPID) | line transfer UI |
| /production/lines/issue-to-production | issue form (live behavior only) | FrmIssueToProduction |
| /production/registers/* | DataTable registers + track | FrmProductionEntryReg, FrmProductionStatusReg, FrmInhouseProductionStatusReg, FrmOrdBundIssToLineReg, FrmOrdProdTrack |
| /production/hourly | EffyEditor | FrmHourlySetting1, frmHours |
| /production/subcontract/pcs-return | pcs return form | frmJobWorkPcsReturn |
| /production/subcontract/wages-bill | wages bill form | FrmProdBillNew |
| /pieces/receipt | receipt wizard (RecPcs/RewrkPcs/RejPcs) | frmPcsRec, frmPrsGRNMulti family, FrmFinishGoodsEntry |
| /pieces/rejection | rejection forms | frmPcsRej, frmPanelRej |
| /pieces/short | short form | frmPcsShort |
| /pieces/excess | panel excess form | FrmPanelExcessEntry(_Stage) |
| /pieces/stock | Pcs_/Panel_StockTable browser + register tab | piece stock registers, FrmOrderwisePcsReg |
| /pieces/reprocess | rework issue/return + approval gate | Prod_PcsRworkIssue, ReworkApproval |
| /pieces/wages-link | wage view | wages-link view (Pay_ProdWorkDetails) |
| /payroll/production-wages | production wages form | Frm_ProductionWages |
| /payroll/shift-wages | shift wages form | shift wages UI (Trs_ProdWages) |
| /payroll/registers/* | DataTable registers | FrmProdShiftWagesReg, CachedRpt_ProductionWagesReg, FrmProdWagesDept, FrmProdWagesStage |
| /payroll/settings | effy/settings panel | payroll settings screens |
| /payroll/compliance | compliance prints | Form JJ list, Rpt_TDS view |
| /m/scan, /m/scan-history | ScanConsole + offline queue | Commando scan screens |
| /m/entry/production, /m/entry/stage, /m/entry/rejection | mobile entry parity | Commando entry screens |

## 7. API endpoints (04 sec. 8, plus scan/payroll from sec. 10)

| Endpoint | Service | Purpose |
|---|---|---|
| POST /api/cutting/production | CuttingService.production() | bundles + barcodes generated |
| POST /api/cutting/job-order | CuttingService.jobOrder() | Cutting_Job (+process orders) |
| POST /api/cutting/issue | CuttingService.issue() | fabric to cutting floor |
| POST /api/production/entry | ProductionService.entry() | dispatcher (03 sec. 4.2) |
| POST /api/production/line-input / line-out / line-tfr / issue-to-prdn | LineService.* | Trs_LineInput/LineTfr family |
| POST /api/scan/bundle | ScanService.bundleCheck() | messages verbatim |
| POST /api/scan/piece / rejection | ScanService.pieceCheck() | SP_PcsBarcode_Check(_Rejection) parity |
| POST /api/scan/posting (rights-gated) | ScanService.posting() | one transaction |
| GET /api/scan/history | ScanService.history() | scan history |
| POST /api/production/pcs-grn (+multi/compwise) | PieceService.receipt() | PROC_PiecesReceipt parity |
| POST /api/production/rejection | PieceService.reject() | Trs_PcsRej |
| POST /api/production/pcs-return | PieceService.jobReturn() | frmJobWorkPcsReturn |
| POST /api/dc/pieces (+ship/rework) | DcService.pieces() | save shell (R03), R05 posting semantics |
| POST /api/payroll/shift-wages | PayrollService.shift() | Trs_ProdWages |
| GET /api/payroll/wage-register?variant=shift or production | PayrollService.register() | wage registers |

## 8. Reports & prints (07 sec. 1.1, 1.2)

| Family | Templates | Data source |
|---|---|---|
| Cutting | CuttingJobOrder(GST), Cutting_Production, CutBundleIss, PanelCuttingProduction, CuttingBarcodeReg, BarcodeLayReport, READYTOCUT(+RETURN) | Trs_ProdEntry/Pay_* |
| Barcode labels | RptBarcodePrint_Pcs, RptBarcodePrint_AllBundle(_Panel), RptBundle_BarcodePrint (zxing SVG) | Pay_* |
| Piece/panel DC and despatch | PcsDc/PcsDc1 (SGST, Cost, Panel, Bit, Rework, Acc), PcsDespatch, PcsReceipt, PcsTransfer, PcsShipSample | Trs_Pcs1/2 |
| Production registers | RptProduction, LinePerformance, LineProdStmt, PanelRejection | Trs_ProdEntry/Pay_* |
| Wages | ShiftWagesReg (SP_Vue_RptShiftWagesReg parity), CachedRpt_ProductionWagesReg | Trs_ProdWages/Pay_ProdWorkDetails |
| Compliance | Form JJ list, Rpt_TDS | Pay_*/Trs_Bills |

## 9. Flags affecting this module

| Flag | Effect | Enforcement point |
|---|---|---|
| allgpayempreqd | all-employee wage payout view gate | PayrollService |
| cuttingdc_joborder / cutting_dcjoborder_deviation | cutting DC vs job order deviation | CuttingService |
| jobordertype / joborderstagewise / jobexcess | job-order mode, stage-wise, excess cap | CuttingService |
| prodentry / prodnrejpostingflag / prdnrej... | production entry mode and rejection posting | ProductionService |
| currentstockpostingflag | stock posting side-effect switch | PostingEngine |
| stagewisepcsstock_and_transactionreqd | stage-wise pcs stock mode (affects line/stage legs) | PostingEngine |
| panelembelishexsper / schcomppercen / schpcscomppercen / autocompperc | panel emb/excess and completion caps | PieceService/Planning |
| day1effy / day2effy / day3onwards / speed / sdelay / initial_style_setupmins / stitching_deptcode | efficiency ramp and wage settings | PayrollService/LineService |
| actpwgdivper / prodcutwgtallowedper / pcsrateamt_excess_percent / prodbillamtdivper | piece-rate and weight-division caps | PayrollService/BillingService |
| reqd_actual_production_wage_arrived_with_payrolllink | wages-link view gate | PayrollService |
| formjjreq / notds | Form JJ register and TDS-off on compliance prints | PayrollService |
| weekoff / sundayentryto / wwstdt / perid | production calendar affecting entry dates | LineService |
| GRNAcceptance_Pcs (Options) / JobWrkCuttingGrn | GAN rework-path and cutting-GRN case gates | PieceService/DcService |
| qr_track_enabled / qr_bundle_labels / qr_piece_labels (new, default OFF) | tracking units and QR labels at cutting | LabelService (08) |

## 10. Traceability (legacy form -> FR IDs)

| Legacy form | FR IDs |
|---|---|
| frmReadytoCut | CUT-001, CUT-002 |
| FrmCuttingProduction_Auto_New | CUT-003, CUT-004, CUT-005, CUT-006, CUT-007, CUT-008 |
| frmCuttingJobOrder | CUT-009, CUT-012, CUT-013, CUT-014 |
| frmProcessOrd | CUT-010 |
| FrmJobOrderList | CUT-011 |
| frmCuttingIssue | CUT-015 |
| FrmCutingReg / FrmCuttingfabretreg | CUT-016 |
| FrmCutting_FabRej | CUT-017 |
| frmAddPanelCutting | CUT-018, PAN-001 |
| frmProdCutComponents / FrmPartDefineEntry | CUT-019 |
| frmProduction | PRD-001 to PRD-008, PRD-013, PRD-014, PRD-021, PRD-024 |
| FrmProduction_CutPanel / FrmBundle_ProductionEntry / FrmOperationEntry | PRD-015 |
| frmProdutionConfig | PRD-016 |
| FrmHourlySetting1 / frmHours | PRD-017, WAG-007 |
| frmBarcodeReadingNew | BAR-001 to BAR-005, BAR-013 |
| FrmLineInput(Manual) | PCS-004, PCS-006 |
| frmLineOutputManual(_New) | PCS-007 |
| line transfer UI | PCS-008, PCS-009 |
| FrmIssueToProduction | PCS-005, PCS-010 |
| FrmProductionEntryReg / FrmProductionStatusReg / FrmInhouseProductionStatusReg | PRD-018 |
| FrmOrdBundIssToLineReg | PRD-018 |
| FrmOrdProdTrack | PRD-019 |
| FrmProdBillNew | WAG-010 |
| frmPcsRec / frmPrsGRNMulti family | PCS-018, PCS-020, PCS-022 |
| FrmFinishGoodsEntry | PCS-022 |
| frmPcsRej / frmPanelRej | PCS-001, PCS-002 |
| frmPcsShort | PCS-003 |
| FrmPanelExcessEntry(_Stage) | PAN-007 |
| frmJobWorkPcsReturn | PCS-024 |
| piece stock registers / FrmOrderwisePcsReg | PCS-025 |
| reprocess screens (Prod_PcsRworkIssue, ReworkApproval) | PCS-026 |
| Frm_pcsDel family save shells | PCS-011 to PCS-017 (R03 DC-029) |
| Frm_productionWages (Frm_ProductionWages) | WAG-003 |
| shift wages UI | WAG-002 |
| FrmProdShiftWagesReg | WAG-005 |
| CachedRpt_ProductionWagesReg view | WAG-006 |
| payroll settings screens | WAG-007 |
| FrmProdWagesDept / FrmProdWagesStage | WAG-009 |
| payroll compliance screens | WAG-011 |
| wages-link view | WAG-004 |
| /m/scan, /m/scan-history | BAR-001, BAR-013, BAR-014 |
| /m/entry/production, /m/entry/stage | PRD-020 |
| /m/entry/rejection | PCS-029 |

## 11. Open items / blockers

| ID | Item | Impact |
|---|---|---|
| B6 | Sp_ProductionEntryQty (plain, called by the barcode posting path) vs _1 divergence is un-diffed (11 sec. 6.2; PROGRESS B6) - complete the S0.4 quick read and append to 11 sec. 6 before wiring BAR-005/006; do not assume _1 parity for the plain variant. | Blocks barcode posting (BAR-005 to BAR-007) closure at S4.6. |
| X3 | Corrected payroll counters (BAR-008: rejection path goodpcs, no RejectionPcs/goodpcs double-count; 11 sec. 3 #6) and group-scoped PostingFlg (BAR-007; 11 sec. 3 #5) deviate from defective legacy in visible numbers - requires user X3 sign-off before S4.6 closes (PROGRESS D8, watch-list). | Pay_BundlePcs_Barcode / Pay_BarcodeGeneration parity vs correction. |
| X3-2 | Bundle Completed='Y' scoping (BAR-009; 11 sec. 3 #8) can close fewer bundles than legacy's unscoped update where multiple rows satisfy the equation - record as an X3 sign-off row alongside the counter corrections. | Bundle closure parity. |
| OI-1 | PROC_Stock_ProdPanel_Update/_Delete and the godown/unit ack families were not in the 11 verification round (11 sec. 6.2) - re-extract and verify before coding PAN update/delete reversal paths. | Panel reversal parity. |
| OI-2 | No endpoint is documented for the subcontract wages bill (FrmProdBillNew, Trs_ProdBillMasNew/DetNew) in 04 sec. 8/10 - confirm whether it rides POST /api/commercial/bills or a production endpoint before building WAG-010. | WAG-010 API contract. |
| OI-3 | Dead-code register applies (11 sec. 4): IssueToPrdn despatch/RewrkStk/GAN/Woven legs, LineTfr RewrkStk legs, ReWrk 'F' branches, PcsBarcode duplicate-row ELSE, and the PcsReceipt 'S'-branch restore are NOT ported; parity target is live behavior (11 sec. 5). | Parity policy sign-off. |
| OI-4 | Verbatim message strings: only INVALID TAG, ALREADY ISSUED TO LINE, BUNDLE COMPLETED, and FINAL PROCESS PRODUCTION MADE are attested in the source docs; extract the remaining SP_BundleBarcode_Check / SP_PcsBarcode_Check(_Rejection) message strings from the live DB before building BAR-002 to BAR-004 error contracts. | Scan error contract completeness. |
| OI-5 | Cutting acknowledgement (cutackreqd, Trs_CutApr) and ready-to-cut posting are owned by R03; R05 screens reference them - keep both docs consistent if 03 sec. 4.1 rows change. | Cross-doc consistency. |
| OI-6 | Pay flag -> Pay_ProdWorkDetails write path (wage accrual hook, S4.9) is specified only at summary level in the source docs; extract the legacy wage-accrual write from the entry save before implementing WAG-001. | Wages accrual parity. |
| OI-7 | .mrt report parameters for cutting/wages prints (B4 pattern - never invent parameter lists) must be extracted before S4 print PRs. | Reports in sec. 8. |
