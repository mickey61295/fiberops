# R03 - Procurement, GRN & DC (the material loop front office)

## 1. Purpose & business context

R03 owns the yarn/fabric material loop documents: purchase orders to suppliers, delivery
challenges (DC) that send material out to job-work parties, and goods receipt notes (GRN)
that bring it back with a new identity (grey in, dyed/finished out). Every document posts
through the single PostingEngine against the FABRIC ledger and the ST_ProgBalance /
party-balance projectors (03 sec. 3-5). The module is the parity core of the rewrite:
tolerances, approvals, lots, rolls, and gate control decide daily whether material and
money reconcile. Scope covers the PO family, the GRN family (all GrnType codes), the DC
family (all TrType codes), gate entry/pass, and the cutting acknowledgement that closes
the fabric-to-cutting handover.

## 2. Scope (legacy forms in)

- PO family: frmGeneralPurchaseOrd, frmPurchaseOrd_MultiOrder(_HO), frmPurchaseOrdAcc,
  FrmPOEntryWithMultipleStyleNo, FrmPOCancel, frmPoCompl, FrmPurGrnAccept,
  FrmProGrnAccept, FrmSupplierOrderRegister, frmSupordPendReg, FrmSuppOrdHistoryReg,
  FrmSuppOrdSheet_Semi, FrmSuppTechDataSheet, FrmSuppProdSequence, rate-confirm screens
  (SP_PendingRateCnf / SP_ApprovedRateCnf1, Pro_RateCnfPcs1/2), FrmRateMaster,
  FrmPrdnRateMaster, FrmCommRateMaster, frmDefaultRate (06 sec. F, sec. O).
- GRN family: frmGRNEntry(_MultiOrder), frmGRN_MultiProcess, frmGRNEntryAcc,
  frmGRNEntryAcc_Ret_Multi, frmPrsGRNMulti(_Acc/_Compwise), FrmLotApproval,
  FrmLotRegister, FrmLotSeparate, frmLotWiseDtl, FrmWasteReceiptEntry, FrmDiaChange,
  FrmFinalDiaUpdation (06 sec. F).
- DC family: FrmGenDC, FrmFabDel(_Return), frmPcsDel(_Ship/Rework), frmPrsDel
  (Multi/_Acc/_Compwise), frmPcsDelRecClose, frmPanelDelRework, FrmAccDel(_Return),
  frmAccSalesDel, frmDomestic_Acc_Issue, frmGeneralDCCompletion, FrmNonReturnDCApproval,
  FrmReprocess_Approval, FrmDcIdUpdation, FrmDcWiseDtl, frmReadytoCut (TrType 20), and
  the cutting acknowledgement UI (Trs_CutApr) (06 sec. G, sec. H, sec. I).
- Gate: FrmGateEntry, frmDailyinout, FrmGatePass, FrmDirectBill_GateEntry (06 sec. G).
- Mobile parity surfaces: /m/entry/grn, /m/entry/process-dc, /m/entry/gate-pass (06 sec. K).
- Out of scope: stores transfer screens and stock registers (R04), piece/panel DC posting
  detail beyond the save path (03 sec. 4.3 owned by the production R-doc), commercial
  settlement of rate confirmations and bills (R05).

## 3. Functional requirements

| FR ID | Requirement (testable "shall") | Source | Priority | Stage |
|---|---|---|---|---|
| PRC-001 | The system shall create a yarn purchase order via PoWizard saving Trs_Po1/2 lines through POST /api/purchase/po (body kind yarn) in one transaction with a NumberingService-issued PO number. | 02 sec. 5; 04 sec. 4; 06 sec. F | P0 | S3 |
| PRC-002 | The system shall create a fabric purchase order variant of the same PO save path with commodity-specific vendor filtering. | 02 sec. 5; 04 sec. 4 | P0 | S3 |
| PRC-003 | The system shall create an accessory purchase order (frmPurchaseOrdAcc) saving Trs_Po5 lines through the same endpoint with kind acc. | 02 sec. 5; 04 sec. 4 | P0 | S3 |
| PRC-004 | The system shall create a multi-order purchase order (frmPurchaseOrd_MultiOrder and the _HO variant) spanning several IOs in one PO document. | 02 sec. 5; 06 sec. F | P0 | S3 |
| PRC-005 | The system shall create a multi-style purchase order (FrmPOEntryWithMultipleStyleNo) with several style lines under one PO header via PoWizard. | 06 sec. O | P1 | S3 |
| PRC-006 | The system shall restrict the VendorPanel party picker to Mas_Party vendors of the PO commodity (yarn/mill, fabric, accessory). | 02 sec. 5 | P0 | S3 |
| PRC-007 | The system shall validate PO qty vs budget against po_bud / po_buddev (10.00 default) / po_allowadd, warning or blocking at the deviation percent per po_bud, mirrored in BudgetDeviationBanner and enforced server-side in PoService. | 03 sec. 6; 07 sec. 2.1 | P0 | S3 |
| PRC-008 | The system shall validate PO rate vs budget rate against po_budrt / po_budrtdev / budrt_inhccw, warning or blocking per po_budrt. | 03 sec. 6; 07 sec. 2.1 | P0 | S3 |
| PRC-009 | The system shall autofill PO rate and required qty per flags reqdqty_auto_fill_reqd_in_po and budrate_auto_fill(_in_po) in LinesGrid. | 07 sec. 2.3 | P1 | S3 |
| PRC-010 | The system shall, when po_approval_reqd is on, route a submitted PO into the approval workflow as a pending task (ApprovalSubmit) before it becomes effective. | 02 sec. 5; 07 sec. 2.3 | P0 | S3 |
| PRC-011 | The system shall support PO accept, cancel (FrmPOCancel, PoCanQty), and complete (frmPoCompl) actions via POST /api/purchase/po/:id/cancel|complete|accept, each in one transaction. | 04 sec. 4; 06 sec. F | P0 | S3 |
| PRC-012 | The system shall list POs by status through GET /api/purchase/po?status= covering FrmSupplierOrderRegister, frmSupordPendReg, and FrmSuppOrdHistoryReg views. | 04 sec. 4; 06 sec. F | P0 | S3 |
| PRC-013 | The system shall provide the supplier sheet, tech-data sheet, and production sequence screens (FrmSuppOrdSheet_Semi, FrmSuppTechDataSheet, FrmSuppProdSequence). | 02 sec. 5; 06 sec. F | P1 | S3 |
| PRC-014 | The system shall list pending rate confirmations (SP_PendingRateCnf) and approved ones (SP_ApprovedRateCnf1) through GET /api/purchase/rate-confirm?state=pending|approved. | 04 sec. 4; 02 sec. 5 | P0 | S3 |
| PRC-015 | The system shall approve a rate confirmation (Pro_RateCnfPcs1/2 editor) via POST /api/purchase/rate-confirm/:id/approve, marking Approved and releasing any DC blocked on it. | 04 sec. 4; 02 sec. 5 | P0 | S3 |
| PRC-016 | The system shall maintain rate masters (FrmRateMaster, FrmPrdnRateMaster, FrmCommRateMaster, frmDefaultRate) via POST /api/masters/rate|prdn-rate|comm-rate|default-rate. | 04 sec. 4; 02 sec. 5 | P1 | S3 |
| PRC-017 | The system shall print POs from templates Rpt_PoYarn/PoFab/PoAcc (Cancel, Det, withimg, GEN, benso variants), Rpt_GENPo, and PoLedger from Trs_Po* data. | 07 sec. 1.1 | P1 | S3 |
| PRC-018 | The system shall return the assigned PO number and a posting preview payload from every PO save and emit the corresponding outbox event inside the same transaction. | 04 sec. 14; 03 sec. 3 | P0 | S3 |
| GRN-001 | The system shall expose a GRN TypePanel accepting every GrnType code: Purchase, Process, Process Return, DirectReceipt, Sales Return, Return, Acc.Purch, Acc.Proc.Receipt, Acc.Proc.Return, Acc.Iss.Ret, AccRetToUnit, Acc.Direct. | 03 sec. 1; 02 sec. 6 | P0 | S2 |
| GRN-002 | The system shall post a Purchase GRN as CurrentStock + with PO-received balance effect and the OrderStylewiseCost_Grp.GRNKGS/GRNBASEDVALUE accrual. | 03 sec. 4.1 | P0 | S3 |
| GRN-003 | The system shall post a Process GRN as CurrentStock + under a NEW StockTable identity (DyeColId shade / FinGsm / FinDiaID) distinct from the grey identity sent out. | 03 sec. 4.1; 02 sec. 6 | P0 | S2 |
| GRN-004 | The system shall update ST_ProgBalance GrnKgs + on Process GRN, monitor loss = DC minus GRN, and trigger the Vue_Reqd_Vs_Finish recompute. | 03 sec. 4.1 | P0 | S2 |
| GRN-005 | The system shall save a multi-process GRN (Trs_MultiPrs_Grn1/2/3) posting + per process leg, where OurDCID=0 makes the previous GRN leg act as the DC, gated by ismultipleprocessgrn_required. | 03 sec. 4.1; 04 sec. 5; 02 sec. 6 | P0 | S3 |
| GRN-006 | The system shall post a Process Return GRN as CurrentStock - (send back out) with GrnKgs - and the party bucket -. | 03 sec. 4.1 | P0 | S3 |
| GRN-007 | The system shall post a DirectReceipt GRN as CurrentStock + flagged direct per the direcrec flag. | 03 sec. 4.1; 07 sec. 2.3 | P1 | S3 |
| GRN-008 | The system shall post accessory GRN mirrors (GrnType Acc.*) as YF='A' rows with qty carried in the Kg column and maintain ST_Acc_PartyBal_Abs plus ST_Acc_Prog_Balance per the 4.4 stack. | 03 sec. 4.1, 4.4 | P0 | S3 |
| GRN-009 | The system shall provide the accessory GRN screens frmGRNEntryAcc, frmGRNEntryAcc_Ret_Multi, and frmPrsGRNMulti(_Acc/_Compwise) on /grn/acc. | 02 sec. 6; 06 sec. F | P1 | S3 |
| GRN-010 | The system shall capture party plus our DC reference (OurDCID) in PartyDcRefPanel and offer the stock picker via GET /api/grn/picker?ordId&godId (FabDeliverySP inverse). | 02 sec. 6; 04 sec. 5 | P0 | S2 |
| GRN-011 | The system shall capture per-line receipt quantities RecKgs, Recmtr, RBag, and Rls in the GRN LinesGrid. | 02 sec. 6 | P0 | S2 |
| GRN-012 | The system shall capture roll detail child rows (CurrentStock_RollDtl) on GRN lines when all_transaction_basedon_rollno / rollno_module_reqd are on. | 02 sec. 6; 07 sec. 2.3 | P0 | S2 |
| GRN-013 | The system shall validate GRN qty vs PO/DC balance against grn_bal / grn_dev / grn_alladd, warning or blocking per grn_bal, mirrored in ToleranceBanner. | 03 sec. 6; 07 sec. 2.1 | P0 | S2 |
| GRN-014 | The system shall support a multi-order GRN (frmGRNEntry_MultiOrder) receiving against several POs/orders in one GRN document. | 02 sec. 6; 06 sec. F | P1 | S3 |
| GRN-015 | The system shall reverse any GRN via DELETE /api/grn/:id as a compensating posting in one transaction that restores the exact prior ledger and balance state. | 04 sec. 5; 03 sec. 3 | P0 | S2 |
| GRN-016 | The system shall render a GRN card at /grn/[id] showing lines, roll detail, posting state, and the reversal action. | 02 sec. 6 | P1 | S2 |
| GRN-017 | The system shall allocate lot numbers per nlot / lot_seq / lotrunno / dyeing_lotno_auto_generation with getLotNo() alphanumeric-sort parity. | 03 sec. 7; 07 sec. 2.2 | P1 | S3 |
| GRN-018 | The system shall require lot approval (FrmLotApproval) before a lot becomes usable when lot_approval is on, via POST /api/grn/lot/approve. | 02 sec. 6; 07 sec. 2.2 | P1 | S3 |
| GRN-019 | The system shall provide the lot register (FrmLotRegister) listing lots with status and approval state. | 02 sec. 6 | P1 | S3 |
| GRN-020 | The system shall provide lot separation (FrmLotSeparate) via POST /api/grn/lot/separate honoring lot_seq/lotrunno/nlot flags. | 02 sec. 6; 04 sec. 5 | P1 | S3 |
| GRN-021 | The system shall provide lot-wise detail (frmLotWiseDtl) via GET /api/grn/lot/:lot. | 02 sec. 6; 04 sec. 5 | P1 | S3 |
| GRN-022 | The system shall record waste receipts (FrmWasteReceiptEntry) via POST /api/grn/waste with the Rpt_WasteGRN print. | 02 sec. 6; 04 sec. 5; 07 sec. 1.1 | P1 | S3 |
| GRN-023 | The system shall apply dia changes (FrmDiaChange) via POST /api/grn/dia-change updating fabric dia identity. | 02 sec. 6; 04 sec. 5 | P1 | S3 |
| GRN-024 | The system shall apply final dia updation (FrmFinalDiaUpdation) via POST /api/grn/final-dia, with the knit dia edit gated by grnknitdiaedit. | 02 sec. 6; 04 sec. 5; 07 sec. 2.3 | P1 | S3 |
| GRN-025 | The system shall print GRNs from templates YarnGRN, FabGRN(MultiPrs, PackList), AccGRN(PO), GenGRN, Woven_FabGRN, and Rpt_GrnYarn/Fab/Acc from Trs_Grn1/2 data. | 07 sec. 1.1 | P1 | S2 |
| GRN-026 | The system shall save every GRN in exactly one transaction (header, lines, roll detail, movements, projectors, outbox event grn.created) and return the posting preview payload. | 03 sec. 3; 04 sec. 14 | P0 | S2 |
| GRN-027 | The system shall present the FabricIdentityPanel showing grey item vs finished item (DyeColId shade, FinGsm, FinDiaID) before a Process GRN saves the new identity. | 02 sec. 6 | P0 | S2 |
| GRN-028 | The system shall warn (not block) when a GRN would drive a 'G' bucket negative, surfacing the condition in PostingPreview per engine policy. | 03 sec. 3 | P0 | S2 |
| GRN-029 | The system shall provide mobile GRN entry parity (/m/entry/grn) including the AiDock challan-photo draft flow into the same GRN DTO. | 06 sec. K, sec. N | P1 | S2+ |
| GRN-030 | The system shall apply entry-date deviation limits (entrydatedev) to GRN document dates. | 03 sec. 6; 07 sec. 2.1 | P1 | S3 |
| DC-001 | The system shall expose a DC TypePanel accepting every TrType code: 1 process, 2 sales, 3/8 order transfer, 4 purchase return, 6/13 party rejection return, 7 acc issue, 10/11/12 DC variants, 14 godown transfer, 17 unit DC, 20 ready-to-cut, 21 job-order, with -2/-7 handled as engine markers per 03 sec. 1. | 03 sec. 1; 02 sec. 7 | P0 | S3 |
| DC-002 | The system shall post a process DC out (TrType 1, ProcessType P) as CurrentStock[ord,stock,god] -kgs/mtr/rls with ST_ProgBalance_{Yarn|Fabric}.DcKgs/DCMtr + at the party and party-outstanding +. | 03 sec. 4.1 | P0 | S3 |
| DC-003 | The system shall capture knitting pre-program issue lines (Trs_Del3, Prog kgs) that post no stock yet but add ST_ProgBalance_Yarn.DcKgs + (Trs_Del3.Prog), gated by knitprgdc. | 03 sec. 4.1; 02 sec. 7; 07 sec. 2.3 | P0 | S3 |
| DC-004 | The system shall post a reprocess DC (TrType 1, ProcessType R) as CurrentStock - with ReProcessDCKgs/Mtr + in the separate reprocess bucket, leaving the fresh bucket untouched. | 03 sec. 4.1 | P0 | S3 |
| DC-005 | The system shall gate reprocess DCs behind the reprocess approval queue (FrmReprocess_Approval) per the ProcessType R gate. | 02 sec. 7, sec. 16; 06 sec. G | P1 | S3 |
| DC-006 | The system shall post a sales DC (TrType 2, ProcessType S) as CurrentStock - (buyer) feeding sales registers and ST_Ord_inHand on piece despatch, with over-despatch blocked when saledcagainstpgmbalchk is on. | 03 sec. 4.1, sec. 6 | P0 | S3 |
| DC-007 | The system shall post a purchase return (TrType 4) as CurrentStock - with the PO balance restored. | 03 sec. 4.1 | P0 | S3 |
| DC-008 | The system shall post a party rejection return (TrType 6/13) as CurrentStock - with the party balance -. | 03 sec. 4.1 | P0 | S3 |
| DC-009 | The system shall post an order-to-order transfer (TrType 3/8 via TranOrdID/TranID) as - on the source order and + on the target order, stamping TransOutKgs / TransInKgs on each program. | 03 sec. 4.1 | P0 | S3 |
| DC-010 | The system shall post a godown transfer DC (TrType 14, Party=GodID) from DcWizard as - source godown and + destination godown with no balance effect. | 03 sec. 4.1; 02 sec. 7 | P0 | S3 |
| DC-011 | The system shall post a unit DC (TrType 17) as - unit godown and + receiving unit, leaving the unit acknowledgement pending (Trs_UnitAck). | 03 sec. 4.1 | P0 | S3 |
| DC-012 | The system shall post ready-to-cut (TrType 20) as a stage pass-through with the equalize rule GRN side := DC side (both equal) maintained by the fabric balance projector. | 03 sec. 4.1, sec. 5 | P0 | S3 |
| DC-013 | The system shall post ready-to-cut returns as ReturnKgs on the program balance and print the READYTOCUT RETURN template. | 03 sec. 4.1; 04 sec. 6; 07 sec. 1.1 | P0 | S3 |
| DC-014 | The system shall post a job-order DC (TrType 21, DelType P) as fabric - maintaining the job-order balance (Sp_PartyWiseJobOrderBal). | 03 sec. 4.1 | P0 | S3 |
| DC-015 | The system shall post an accessory issue DC (TrType 7, dept 16 job-order context, frmDomestic_Acc_Issue) as YF='A' rows - updating ST_Acc_PartyBal_Abs and ST_Acc_Prog_Balance, gated by acc_item_approval_reqd_for_accissue. | 03 sec. 4.1, 4.4; 07 sec. 2.3 | P0 | S3 |
| DC-016 | The system shall provide accessory DC screens FrmAccDel(_Return) and frmAccSalesDel on /dc/acc using the same acc mirror postings. | 02 sec. 7; 06 sec. G, sec. O | P1 | S3 |
| DC-017 | The system shall support DC variant types 10/11/12 as Gen/Courier DC documents printable from the GenDC and CourierDC templates. | 03 sec. 1; 07 sec. 1.1 | P1 | S3 |
| DC-018 | The system shall offer the DC StockPicker as the union of CurrentStock>0 rows and existing DC lines so partially issued stock remains visible (FabDeliverySP parity). | 02 sec. 7; 04 sec. 6 | P0 | S3 |
| DC-019 | The system shall filter the DC party panel by process dept (Mas_Dept) and capture dyeing shade (DyeColId) or printing design (DesignId) per party/dept. | 02 sec. 7 | P0 | S3 |
| DC-020 | The system shall block a DC save when an approved rate confirmation is missing, per need_rate_conf_for_dc / rateconfirmcheck(+dev) / lotwise_rate_deldate_reqd_in_ordersheet, shown as RateConfirmGuard and enforced in DcService. | 03 sec. 6; 02 sec. 7; 07 sec. 2.3 | P0 | S3 |
| DC-021 | The system shall capture GST and e-way data on DCs (HSN %, CGST/SGST vs IGST by state, e-way no/date) in Trs_Del4 override fields via GstEwayPanel. | 02 sec. 7 | P0 | S3 |
| DC-022 | The system shall validate DC issue vs stock and transfer kg deviation against i_scheck / i_sdev and trankgs_dev, warning or blocking per the flags, mirrored in ToleranceBanner. | 03 sec. 6; 07 sec. 2.1 | P0 | S3 |
| DC-023 | The system shall allocate DC numbers through NumberingService with Mas_SalesGrp prefixes, honoring manual_dc_no_option_reqd for manual DC numbers. | 03 sec. 7; 07 sec. 2.2 | P0 | S3 |
| DC-024 | The system shall save every DC in exactly one transaction (header/lines/Del3/Del4, movements, projectors, outbox event) and return the posting preview payload. | 03 sec. 3; 04 sec. 14 | P0 | S3 |
| DC-025 | The system shall reverse any DC via DELETE /api/dc/:id as a compensating posting in one transaction that restores the exact prior ledger and balance state. | 04 sec. 6; 03 sec. 3 | P0 | S3 |
| DC-026 | The system shall render a DC card at /dc/[id] with lines, acknowledgement status (Arl/AKg/AMtr), and attached prints (DC plus packlist variants). | 02 sec. 7 | P0 | S3 |
| DC-027 | The system shall run general DC completion (frmGeneralDCCompletion) aging non-return DCs at gendcdays (5 default) into the notification flow. | 02 sec. 7; 07 sec. 2.2 | P1 | S3 |
| DC-028 | The system shall route aged non-return DCs into the FrmNonReturnDCApproval queue for explicit approval. | 02 sec. 7, sec. 16; 06 sec. G | P1 | S3 |
| DC-029 | The system shall save piece DCs (frmPcsDel(_Ship/Rework), frmPrsDel(Multi/_Acc/_Compwise)) via POST /api/dc/pieces (+ship/rework) with posting semantics per 03 sec. 4.3 (detailed FRs owned by the production R-doc). | 02 sec. 7; 04 sec. 6 | P0 | S3 |
| DC-030 | The system shall close despatch via frmPcsDelRecClose honoring newdespatchno numbering and the saledcagainstpgmbalchk block. | 02 sec. 7; 07 sec. 2.2, 2.3 | P1 | S3 |
| DC-031 | The system shall save panel DCs (frmPanelDelRework) via POST /api/dc/panels. | 02 sec. 7; 04 sec. 6 | P1 | S3 |
| DC-032 | The system shall provide the consolidated returns screen /dc/returns covering FrmFabDel_Return and FrmAccDel_Return (TrType 4/6/13) via POST /api/dc/returns. | 02 sec. 7; 04 sec. 6; 06 sec. G | P0 | S3 |
| DC-033 | The system shall provide the DC-wise detail inquiry (FrmDcWiseDtl) at /dc/wise-detail. | 02 sec. 7; 06 sec. G | P2 | S3 |
| DC-034 | The system shall provide the rights-gated DC ID update utility (FrmDcIdUpdation) at /dc/dc-id-update. | 02 sec. 7; 06 sec. G | P2 | S3 |
| DC-035 | The system shall print yarn DCs (w/wo program, SGST, Cost, GoDown) and fabric DCs (SGST, Cost, PrsRt, OrdWise, PackList, HalfPage, GoDown, Cost_Cut, Cost_Full) from Vue_TrsDc with the dc_fullpage layout option. | 07 sec. 1.1; 02 sec. 7 | P1 | S3 |
| DC-036 | The system shall print sales DCs and DC-cum-invoices (SalesDCCumInv, DC_GST(_1), gated by saledccuminvreq), DC returns (RPtAccDcRet, RPtFabDcRet), and Acc/Gen/Courier DC prints (AccDC(_GoDown,_SGST,_Cost), GenDC, CourierDC). | 07 sec. 1.1 | P1 | S3 |
| DC-037 | The system shall provide mobile process-DC entry parity (/m/entry/process-dc) against the same DcService validations. | 06 sec. K; 02 sec. 20 | P1 | S3 |
| DC-038 | The system shall post the cutting acknowledgement (Trs_CutApr, Arl/AKg/AMtr) via POST /api/dc/:id/ack as + into the cutting pool dept -7 with FrmStockID lineage (CutACKStockPost parity), maintaining the cut-vs-issued variance, gated by cutackreqd. | 03 sec. 4.1; 04 sec. 6; 02 sec. 9 | P0 | S3 |
| GAT-001 | The system shall record gate entries (FrmGateEntry, frmDailyinout) via POST /api/dc/gate-entry capturing vehicle/party/document context for inward and outward traffic. | 02 sec. 7; 04 sec. 6 | P1 | S3 |
| GAT-002 | The system shall issue gate passes (FrmGatePass) via POST /api/dc/gate-pass when gatepassflg is on, honoring the gatepassopt mode. | 02 sec. 7; 04 sec. 6; 07 sec. 2.3 | P1 | S3 |
| GAT-003 | The system shall support the direct-bill gate entry flow (FrmDirectBill_GateEntry) linking a gate entry directly to a bill context. | 02 sec. 7; 06 sec. G | P2 | S3 |
| GAT-004 | The system shall print gate passes from the GatePass templates (Trs gate data) with preprint overlay support. | 07 sec. 1.1 | P1 | S3 |
| GAT-005 | The system shall close the gate-pass loop to DESPATCH_DOC via carton/piece QR scan-out per the 08 addition, gated by qr_carton_labels (default OFF). | 06 sec. K, sec. N; 07 sec. 3.1 | P2 | S7 |
| GAT-006 | The system shall provide mobile gate-pass parity (/m/entry/gate-pass) including the QR scan-out mode. | 02 sec. 20; 06 sec. K | P1 | S2+ |

## 4. Business rules & validations

| BR | Rule (flags verbatim) | Source |
|---|---|---|
| BR-01 | PO qty vs budget: po_bud / po_buddev (10.00) / po_allowadd - warn/block at +/- dev% (server authoritative; banner mirrors). | 03 sec. 6; 07 sec. 2.1 |
| BR-02 | PO rate vs budget rate: po_budrt / po_budrtdev / budrt_inhccw - warn/block. | 03 sec. 6; 07 sec. 2.1 |
| BR-03 | PO approval: po_approval_reqd creates an approval task before the PO is effective; inbox per approvalsflg / commando_approval_link. | 02 sec. 5; 07 sec. 2.3 |
| BR-04 | Rate confirmation before DC: need_rate_conf_for_dc / rateconfirmcheck(+dev) block DC without an approved rate; lotwise_rate_deldate_reqd_in_ordersheet / lotwise_rate refine per-lot rates. | 03 sec. 6; 07 sec. 2.1, 2.3 |
| BR-05 | GRN balance deviation: grn_bal / grn_dev / grn_alladd - warn/block on GRN vs PO/DC balance. | 03 sec. 6; 07 sec. 2.1 |
| BR-06 | Issue shortage: i_scheck / i_sdev - warn/block on DC issue vs stock. | 03 sec. 6; 07 sec. 2.1 |
| BR-07 | DC transfer tolerance: trankgs_dev - kg deviation on DC transfers. | 03 sec. 6; 07 sec. 2.1 |
| BR-08 | Process loss: dyeinggamtper / knittinggamtper - acceptable process loss % applied in GRN/process validation. | 03 sec. 6; 07 sec. 2.1 |
| BR-09 | Lot life: nlot / lot_seq / lotrunno / dyelotflg / dyeing_lotno_auto_generation / lot_dev_dc / lotexp / lotwise_rate / lotwisestockreqd / lot_approval govern lot numbering, deviation, expiry, and approval. | 07 sec. 2.2; 03 sec. 7 |
| BR-10 | Roll detail on GRN: all_transaction_basedon_rollno / rollno_module_reqd force roll-level lines; roll_grn_excess / exces_for_finalrollwtentry cap roll excess (full roll-module rules in R04). | 02 sec. 6; 07 sec. 2.1, 2.3 |
| BR-11 | Back-dating: entrydatedev limits document-date deviation (bill-side billdtchk_serverdt(+dev) handled in R05). | 03 sec. 6; 07 sec. 2.1 |
| BR-12 | Multi-process GRN: ismultipleprocessgrn_required gates the flow; OurDCID=0 makes the previous GRN leg act as the DC. | 03 sec. 4.1; 07 sec. 2.3 |
| BR-13 | Direct receipt: direcrec flags DirectReceipt GRNs as direct. | 07 sec. 2.3 |
| BR-14 | Sales DC vs program balance: saledcagainstpgmbalchk blocks over-despatch. | 03 sec. 6; 02 sec. 7 |
| BR-15 | Non-return DC aging: gendcdays (5) ages DCs without return into completion tracking and the FrmNonReturnDCApproval queue. | 07 sec. 2.2; 02 sec. 7 |
| BR-16 | Acc issue approval: acc_item_approval_reqd_for_accissue routes TrType 7 issues through FrmAccItemApproval; accreqwithexordqty ties acc requirement to order qty. | 07 sec. 2.3 |
| BR-17 | Grey-to-dyed identity: Process GRN must resolve a NEW identity (DyeColId shade / FinGsm / FinDiaID) before save; grnknitdiaedit gates knit dia edits. | 03 sec. 4.1; 02 sec. 6; 07 sec. 2.3 |
| BR-18 | Numbering: DC/GRN/Lot/OC/IO numbers finyear-scoped via NumberingService with Mas_SalesGrp prefixes; manual DC numbers only when manual_dc_no_option_reqd; despatch numbering per newdespatchno; lot auto-numbering per dyeing_lotno_auto_generation. | 03 sec. 7; 07 sec. 2.2 |
| BR-19 | Negative stock: the engine never allows negative on 'G' buckets but preserves legacy behavior as warn-not-block, surfaced in PostingPreview. | 03 sec. 3 |
| BR-20 | RTC equalize: ready-to-cut keeps GRN side := DC side (both equal); returns post ReturnKgs; the projector recomputes from SUM so the RCUT trigger defects (DCMtr overwrite; DeptId=-7 hardcode) are not ported, while the dyeing-only ProgFrm_Issue gate is preserved. | 03 sec. 4.1, sec. 5; 11 sec. 3 (#2,#3), sec. 5 |
| BR-21 | Reprocess gate: ProcessType R DCs require reprocess approval and post to the separate ReProcess bucket, never the fresh bucket. | 03 sec. 4.1; 02 sec. 7 |
| BR-22 | GST/e-way on DC: HSN %, CGST/SGST vs IGST by party state, e-way no/date override in Trs_Del4; fields shown when gstenable. | 02 sec. 7; 07 sec. 2.3 |
| BR-23 | Knitting pre-program: Del3 Prog lines post only the yarn program balance (DcKgs +), never stock; gated by knitprgdc. | 03 sec. 4.1; 07 sec. 2.3 |
| BR-24 | PO helpers: reqdqty_auto_fill_reqd_in_po / budrate_auto_fill(_in_po) autofill; po_reqordersheet / suppordsheetexs / suppord_salesflg shape the PO entry gates. | 07 sec. 2.3 |
| BR-25 | Dead code not ported: verified-unreachable legacy branches (11 sec. 4) are excluded; live behavior is the parity target - notably the IssueToPrdn despatch leg is dead and the live piece-despatch deduction is the PiecesDelivery proc at FinishedStageID -3. | 11 sec. 2.2, sec. 4, sec. 5 |

## 5. Data & postings (03 sec. 4.1 rows that apply; signs transcribed to ASCII)

| Document | Type code | FABRIC ledger effect | Balance effect (projector) |
|---|---|---|---|
| Process DC out | Del, TrType 1, ProcessType P | CurrentStock[ord,stock,god] -kgs/mtr/rls | ST_ProgBalance_{Yarn|Fabric}.DcKgs/DCMtr + at party; party-outstanding + |
| Knitting pre-program issue | Del3 lines (Prog kgs) | no stock yet | ST_ProgBalance_Yarn.DcKgs + (Trs_Del3.Prog) |
| Reprocess DC | Del, TrType 1, ProcessType R | CurrentStock - | ReProcessDCKgs/Mtr + (fresh bucket untouched) |
| Sales DC | Del, TrType 2, ProcessType S | CurrentStock - (buyer) | sales registers; ST_Ord_inHand on piece despatch |
| Purchase return | Del, TrType 4 | CurrentStock - | PO balance back |
| Party rejection return | Del, TrType 6/13 | CurrentStock - | party balance - |
| Order-to-order transfer out/in | Del, TrType 3/8 (TranOrdID/TranID) | - source order + target order | TransOutKgs / TransInKgs on each program |
| Godown transfer | Del, TrType 14 (Party=GodID) | - src godown + dst godown | none |
| Unit DC | Del, TrType 17 | - unit godown + receiving unit | unit ack pending (Trs_UnitAck) |
| Ready-to-cut | Del/RTC, TrType 20 | stage pass-through | GRN side := DC side (both equal); returns -> ReturnKgs |
| Job-order DC | Del, TrType 21, DelType P | - fabric | job-order balance (Sp_PartyWiseJobOrderBal) |
| Purchase GRN | Grn, 'Purchase' | CurrentStock + | PO received; OrderStylewiseCost_Grp.GRNKGS/GRNBASEDVALUE accrual |
| Process GRN | Grn, 'Process' | CurrentStock + as NEW identity (DyeColId shade / FinGsm / FinDiaID) | GrnKgs +; loss = DC-GRN monitored; Vue_Reqd_Vs_Finish recompute |
| Multi-process GRN | Trs_MultiPrs_Grn1/2/3 | + per process leg; OurDCID=0 -> previous GRN leg acts as DC | each leg's program balance |
| Process Return GRN | Grn, 'Process Return' | CurrentStock - (send back out) | GrnKgs -; party bucket - |
| Direct receipt | Grn, 'DirectReceipt' | + | flagged direct (direcrec) |
| Cutting acknowledgement | Trs_CutApr (Arl/AKg/AMtr) | + cutting pool dept -7 (FrmStockID lineage) | cut vs issued variance |
| Accessory mirrors | Grn 'Acc.*', Del TrType 7 | +/- YF='A' rows (qty in Kg column) | ST_Acc_PartyBal_Abs + ST_Acc_Prog_Balance (03 sec. 4.4) |

Posting flow for every row above: validate (zod + flags + tolerances + approvals) ->
NumberingService doc no -> insert Trs_Xxx1/2(/3) -> MovementMatrix[docType].build(doc) ->
PostingEngine.apply (one transaction) -> Projectors.schedule -> EventOutbox.emit -> commit;
delete/reversal rebuilds the inverted MovementSet (compensating posting) per 03 sec. 3.
Piece/panel DC save paths post per 03 sec. 4.3 (owned by the production R-doc); the
despatch deduction leg documented there is the live PiecesDelivery behavior (11 sec. 2.2).

## 6. UI & routes

| Route | Components | Legacy forms |
|---|---|---|
| /purchase/po/new | PoWizard (VendorPanel, LinesGrid, BudgetDeviationBanner, ApprovalSubmit) | frmGeneralPurchaseOrd, frmPurchaseOrd_MultiOrder(_HO), frmPurchaseOrdAcc, FrmPOEntryWithMultipleStyleNo |
| /purchase/po/[id] | PO card + AcceptPanel | FrmPurGrnAccept, FrmProGrnAccept |
| /purchase/po/cancel | cancel form | FrmPOCancel |
| /purchase/po/complete | complete form | frmPoCompl |
| /purchase/po/register | DataTable | FrmSupplierOrderRegister, frmSupordPendReg, FrmSuppOrdHistoryReg |
| /purchase/supplier/* | sheet/tech/sequence forms | FrmSuppOrdSheet_Semi, FrmSuppTechDataSheet, FrmSuppProdSequence |
| /purchase/rate-confirm (+[id]) | ApprovalCard + quotation editor | rate confirm screens (Pro_RateCnfPcs1/2) |
| /purchase/rates/* | MasterCrud | FrmRateMaster, FrmPrdnRateMaster, FrmCommRateMaster, frmDefaultRate |
| /grn/new | GrnWizard (TypePanel, PartyDcRefPanel, FabricIdentityPanel, LinesGrid + roll child, ToleranceBanner, AcceptPanel) | frmGRNEntry(_MultiOrder) |
| /grn/new?multi=1 | MultiProcessLegs | frmGRN_MultiProcess |
| /grn/acc | acc GRN forms | frmGRNEntryAcc, frmGRNEntryAcc_Ret_Multi, frmPrsGRNMulti(_Acc/_Compwise) |
| /grn/[id] | GRN card + ReversalButton | (new, compensating per 03) |
| /grn/lots/approval | ApprovalCard | FrmLotApproval |
| /grn/lots/register | DataTable | FrmLotRegister |
| /grn/lots/separate | separate form | FrmLotSeparate |
| /grn/lots/[lot] | lot detail | frmLotWiseDtl |
| /grn/waste | waste receipt form | FrmWasteReceiptEntry |
| /grn/dia/change | dia forms (both variants) | FrmDiaChange, FrmFinalDiaUpdation |
| /dc/fabric | DcWizard (TypePanel, PartyPanel, StockPicker, KnitProgramLines, RateConfirmGuard, ReprocessToggle, GstEwayPanel, ToleranceBanner) | FrmGenDC, FrmFabDel |
| /dc/pieces | PieceDcLines, DespatchClose | frmPcsDel(_Ship/Rework), frmPrsDel(Multi/_Acc/_Compwise), frmPcsDelRecClose |
| /dc/panels | panel DC form | frmPanelDelRework |
| /dc/acc | AccDcWizard | FrmAccDel(_Return), frmAccSalesDel, frmDomestic_Acc_Issue |
| /dc/returns | returns form | FrmFabDel_Return, FrmAccDel_Return |
| /dc/general-completion | completion form | frmGeneralDCCompletion |
| /dc/gate/entry | gate entry form | FrmGateEntry, frmDailyinout |
| /dc/gate/pass | GateQr + pass form | FrmGatePass, FrmDirectBill_GateEntry |
| /dc/[id] | DC card (lines, ack status Arl/AKg/AMtr, prints) | (new) |
| /dc/non-return-approval | ApprovalCard | FrmNonReturnDCApproval (also /approvals/non-return-dc) |
| /dc/reprocess-approval | ApprovalCard | FrmReprocess_Approval (also /approvals/reprocess) |
| /dc/dc-id-update | rights-gated utility | FrmDcIdUpdation |
| /dc/wise-detail | DataTable | FrmDcWiseDtl |
| /cutting/ready-to-cut | RTC form (+ return) | frmReadytoCut |
| /cutting/ack | cut ack form (Trs_CutApr) | cut ack UI (06 sec. I) |
| /m/entry/grn, /m/entry/process-dc, /m/entry/gate-pass | mobile parity | Commando entry screens |

## 7. API endpoints (04 sec. 4-6)

| Endpoint | Service | Purpose |
|---|---|---|
| POST /api/purchase/po (yarn|fab|acc|multi) | PoService.create() | PO save with tolerance+approval checks |
| POST /api/purchase/po/:id/cancel|complete|accept | PoService.* | FrmPOCancel / frmPoCompl / FrmPurGrnAccept parity |
| GET /api/purchase/po?status= | PoService.list() | supplier order registers |
| GET /api/purchase/rate-confirm?state=pending|approved | RateConfirmService.list() | SP_PendingRateCnf / SP_ApprovedRateCnf1 |
| POST /api/purchase/rate-confirm/:id/approve | RateConfirmService.approve() | Pro_RateCnfPcs*.Approved |
| POST /api/masters/rate|prdn-rate|comm-rate|default-rate | RateMasterService.* | rate masters |
| GET /api/grn/picker?ordId&godId | GrnService.picker() | stock picker (FabDeliverySP inverse) |
| POST /api/grn (grnType + lines + rollDtl?) | GrnService.create() | all GrnType saves (MovementMatrix 4.1) |
| DELETE /api/grn/:id | GrnService.reverse() | compensating reversal |
| POST /api/grn/multi-process | GrnService.multiProcess() | frmGRN_MultiProcess |
| POST /api/grn/lot/approve|separate | LotService.* | FrmLotApproval / FrmLotSeparate |
| GET /api/grn/lot/:lot | LotService.detail() | frmLotWiseDtl |
| POST /api/grn/waste | GrnService.waste() | FrmWasteReceiptEntry |
| POST /api/grn/dia-change / final-dia | FabricService.diaChange() | FrmDiaChange / FrmFinalDiaUpdation |
| GET /api/dc/stock-picker?ordId&party&dept | DcService.stockPicker() | FabDeliverySP union picker |
| POST /api/dc/fabric (TrType, ProcessType, Del3 prog lines) | DcService.fabric() | FrmGenDC/FrmFabDel |
| POST /api/dc/pieces (+ship/rework) | DcService.pieces() | frmPcsDel family |
| POST /api/dc/panels | DcService.panels() | frmPanelDelRework |
| POST /api/dc/acc (+domestic issue) | DcService.acc() | FrmAccDel / frmDomestic_Acc_Issue |
| POST /api/dc/returns | DcService.returns() | TrType 4/6/13 |
| POST /api/dc/ready-to-cut (+return) | DcService.readyToCut() | TrType 20 |
| POST /api/dc/gate-entry|gate-pass | GateService.* | FrmGateEntry / FrmGatePass |
| POST /api/dc/:id/ack | CuttingService.ack() | Trs_CutApr cutting ack |
| DELETE /api/dc/:id | DcService.reverse() | compensating reversal |

## 8. Reports & prints (07 sec. 1.1)

| Family | Templates | Data source |
|---|---|---|
| Yarn DC | YarnDC (w/wo program, SGST, Cost, GoDown) | Vue_TrsDc + StockRatePost |
| Fabric DC | FabDC (SGST, Cost, PrsRt, OrdWise, PackList, HalfPage, GoDown, Cost_Cut, Cost_Full) | Vue_TrsDc |
| Piece/Panel DC | PcsDc/PcsDc1 (SGST, Cost, Panel, Bit, Rework, Acc) | Trs_Pcs1/2 |
| Acc/Gen/Courier DC | AccDC(_GoDown,_SGST,_Cost), GenDC, CourierDC | Vue_TrsDc |
| Sales/DC-cum-Inv | Yarn/Fab SalesDC, SalesDCCumInv, DC_GST(_1) | Vue_SalesInvoice_DC (saledccuminvreq) |
| DC returns | RPtAccDcRet, RPtFabDcRet | Trs_Del (4/6/13) |
| GRN | YarnGRN, FabGRN(MultiPrs, PackList), AccGRN(PO), GenGRN, Woven_FabGRN, Rpt_GrnYarn/Fab/Acc, Rpt_WasteGRN | Trs_Grn1/2 |
| POs | Rpt_PoYarn/PoFab/PoAcc (Cancel, Det, withimg, GEN, benso), Rpt_GENPo, PoLedger | Trs_Po* |
| Packing/Despatch (module-relevant) | READYTOCUT(+RETURN), RollPrint, RptTag_Print | Trs_Pcs/RTC |
| Gate pass | GatePass templates | Trs gate |

All prints run through /reports/viewer/* with preprint overlay support (dc_fullpage layout
option for DCs).

## 9. Flags affecting this module

| Flag | Effect | Enforcement point |
|---|---|---|
| po_bud / po_buddev (10.00) / po_allowadd | PO qty vs budget +/- %, allow-add | PoService |
| po_budrt / po_budrtdev / budrt_inhccw | PO rate vs budget rate; in-house C&C wait | PoService |
| po_approval_reqd (+ approvalsflg / commando_approval_link) | PO approval workflow | ApprovalService |
| reqdqty_auto_fill_reqd_in_po / budrate_auto_fill(_in_po) / po_reqordersheet / suppordsheetexs / suppord_salesflg | PO entry helpers/gates | PoWizard |
| grn_bal / grn_dev / grn_alladd | GRN qty vs PO/DC balance | GrnService |
| direcrec / ismultipleprocessgrn_required / grnknitdiaedit | direct receipt flag, multi-process GRN, knit dia edit | GrnService |
| nlot / lot_seq / lotrunno / dyelotflg / dyeing_lotno_auto_generation / lot_dev_dc / lotexp / lotwise_rate / lotwisestockreqd / lot_approval | lot life-cycle policy | LotService |
| rollno_module_reqd / all_transaction_basedon_rollno / rollnofrommc / roll_grn_excess | roll detail on GRN lines | GrnService/RollService |
| i_scheck / i_sdev / trankgs_dev | DC issue shortage and transfer kg deviation | DcService |
| dyeinggamtper / knittinggamtper | acceptable process loss % | Grn/validation |
| need_rate_conf_for_dc / rateconfirmcheck(+dev) / lotwise_rate_deldate_reqd_in_ordersheet / lotwise_rate | rate gates before DC | DcService |
| saledcagainstpgmbalchk / newdespatchno | sales DC vs program balance; despatch numbering | DcService/NumberingService |
| knitprgdc | knitting program DC (Trs_Del3) | DcService |
| gendcdays (5) | non-return DC aging | notifications |
| gatepassflg / gatepassopt | gate pass module and mode | GateService |
| manual_dc_no_option_reqd / sameordno / samepdcno | DC numbering policies | NumberingService |
| cutackreqd | cutting acknowledgement required | CuttingService.ack |
| cuttingdc_joborder / cutting_dcjoborder_deviation / jobordertype | cutting DC vs job order gates | CuttingService |
| acc_item_approval_reqd_for_accissue / accreqwithexordqty | accessory issue approval and qty tie | AccService |
| gstenable | GST fields on DC | GstEwayPanel/DcService |
| dc_fullpage / preprintfolder (72/298) | DC print layout and overlay set | PrintLayout |
| entrydatedev | back-dating limits | all R03 documents |

## 10. Traceability (legacy form -> FR IDs)

| Legacy form | FR IDs |
|---|---|
| frmGeneralPurchaseOrd | PRC-001, PRC-006, PRC-007, PRC-008, PRC-010, PRC-018 |
| frmPurchaseOrd_MultiOrder(_HO) | PRC-004 |
| frmPurchaseOrdAcc | PRC-003 |
| FrmPOEntryWithMultipleStyleNo | PRC-005 |
| FrmPOCancel | PRC-011 |
| frmPoCompl | PRC-011 |
| FrmPurGrnAccept / FrmProGrnAccept | PRC-011 |
| FrmSupplierOrderRegister / frmSupordPendReg / FrmSuppOrdHistoryReg | PRC-012 |
| FrmSuppOrdSheet_Semi / FrmSuppTechDataSheet / FrmSuppProdSequence | PRC-013 |
| rate confirm screens | PRC-014, PRC-015 |
| FrmRateMaster / FrmPrdnRateMaster / FrmCommRateMaster / frmDefaultRate | PRC-016 |
| frmGRNEntry | GRN-001, GRN-010, GRN-011, GRN-012, GRN-013, GRN-026, GRN-027, GRN-028 |
| frmGRNEntry_MultiOrder | GRN-014 |
| frmGRN_MultiProcess | GRN-005 |
| frmGRNEntryAcc / frmGRNEntryAcc_Ret_Multi / frmPrsGRNMulti(_Acc/_Compwise) | GRN-008, GRN-009 |
| FrmLotApproval | GRN-018 |
| FrmLotRegister | GRN-019 |
| FrmLotSeparate | GRN-020 |
| frmLotWiseDtl | GRN-021 |
| FrmWasteReceiptEntry | GRN-022 |
| FrmDiaChange | GRN-023 |
| FrmFinalDiaUpdation | GRN-024 |
| FrmGenDC | DC-001, DC-002, DC-004, DC-010, DC-011, DC-018, DC-019, DC-020, DC-021, DC-022, DC-023, DC-024 |
| FrmFabDel | DC-002, DC-018 |
| FrmFabDel_Return | DC-007, DC-008, DC-032 |
| frmPcsDel(_Ship/Rework) / frmPrsDel(Multi/_Acc/_Compwise) | DC-029 |
| frmPcsDelRecClose | DC-030 |
| frmPanelDelRework | DC-031 |
| FrmAccDel(_Return) / frmAccSalesDel | DC-016, DC-032 |
| frmDomestic_Acc_Issue | DC-015 |
| frmGeneralDCCompletion | DC-027 |
| FrmNonReturnDCApproval | DC-028 |
| FrmReprocess_Approval | DC-005 |
| FrmDcIdUpdation | DC-034 |
| FrmDcWiseDtl | DC-033 |
| frmReadytoCut | DC-012, DC-013 |
| cut ack UI (Trs_CutApr) | DC-038 |
| FrmGateEntry / frmDailyinout | GAT-001 |
| FrmGatePass | GAT-002, GAT-004, GAT-005 |
| FrmDirectBill_GateEntry | GAT-003 |
| /m/entry/grn, /m/entry/process-dc, /m/entry/gate-pass | GRN-029, DC-037, GAT-006 |

## 11. Open items / blockers

| ID | Item | Impact |
|---|---|---|
| B1 | Sp_currentstock definition is not on disk - only call sites (CutACKStockPost) and the Sp_currentstock_RollDtl variant exist; extract the live body at S0.2 before implementing the FABRIC-ledger writer (03 sec. 3; 11 sec. 2.9, sec. 6.1). | Blocks every R03 posting path and G2 live parity. |
| B2 | Live-DB drift: on-disk proc bodies may lag the DB; re-extract each referenced proc (Trs_Del/Grn/MultiPrs_Grn/CutACKStockPost/RollDtl) at implementation time and diff (11 sec. 6.3). | Repository code must not assume shipped SQL equals live. |
| X3-1 | TRG_YARN_BALANCE_GRN_DEL decrements raw per-row RecKgs with no GrnType filter (11 sec. 3 #7); the projector recomputes with correct filters, which can change visible numbers vs legacy on GRN delete - needs an approved X3 sign-off row. | GRN reversal balance parity. |
| X3-2 | RCUT trigger defects (DCMtr overwrite; DeptId=-7 hardcode, 11 sec. 3 #2/#3) are fixed by SUM-recompute projectors; deviation recorded; preserve the dyeing-only ProgFrm_Issue gate (11 sec. 5). | RTC equalize parity. |
| OI-1 | GrnType codes 'Sales Return' and 'Return' appear only in the 03 sec. 1 enum with no dedicated form or endpoint documented - confirm legacy handling before wiring. | GRN-001 completeness. |
| OI-2 | frmPurchaseOrd_MultiOrder_HO vs base _MultiOrder behavioral differences are not documented; verify against the live form (B2 pattern). | PRC-004. |
| OI-3 | gendcdays aging feeds the notification flow (05); confirm event wiring when the events service lands. | DC-027, DC-028. |
| OI-4 | Dead-code register (11 sec. 4) applies: no unreachable branch is ported; the dead IssueToPrdn despatch leg is replaced by live PiecesDelivery semantics (BR-25). | Parity policy sign-off. |
| OI-5 | Piece/panel DC posting detail (03 sec. 4.3) is owned by the production R-doc; R03 owns only the save path (DC-029/031). Keep the two docs consistent when 4.3 FRs are drafted. | Cross-doc consistency. |
