# 02 — COMPONENT TREE (the wiring, screen by screen)

Legend: `[S]` server component · `[C]` client component · `→ legacy:` replaces WinForms form(s) · `⚑`: feature-flag gated · `🔒`: rights-gated (`module.screen.action`). Every document page follows the same composition: `DocumentShell` + typed `EntryForm` + `LineGrid` + pickers + `PostingPreview`, wired to the services in 04 and the posting matrix in 03.

## 1. Root

```
app/
├── layout.tsx [S]                     html shell, FlagsProvider, QueryProvider, ThemeProvider
├── (auth)/
│   └── login/page.tsx [C]             → legacy: FrmCompanyLogin → FrmFinyearLogin → FrmLogin_New
│       ├── CompanyStep                company pick (Mas_Exporter/Concern)
│       ├── FinYearStep                finyear pick (Trg_Finyear_Update data)
│       ├── CredentialsStep            Mas_User auth, FrmChangePassword link
│       └── LoginForm
├── (erp)/
│   └── layout.tsx [S]                 ERPShell — session guard
│       ├── ERPShell [C]
│       │   ├── SidebarNav             menu tree from rights (FrmMenuRights/FrmMenuAccRights)
│       │   ├── TopbarContext          company · finyear · user · godown/line selector · search (frmSearch)
│       │   ├── NotificationBell       SSE feed (05)
│       │   └── ApprovalBadge          pending approvals count (approvalsflg ⚑)
│       └── (children)
├── (mobile)/                          Commando app — matches existing mobile screens
│   └── layout.tsx [S]                 MobileShell — bottom tab bar
└── api/                               see 04 — route handlers only, no UI
```

## 2. Dashboard & MIS

```
(erp)/dashboard/page.tsx [S]           → frmMIS + mobile dashboard
├── KpiRow                             order-in-hand (ST_Ord_inHand), despatch today, party-out value (PartyOutQry), WIP kgs
├── OrderPipelineTable                 SP_OrderStatus shape: Knit/Heat/Wash/Comp kgs per IO
├── WbsRagBoard                       WBS_Production RAG stages (Sp_WBS_Production)
├── MeetingCharts                      MeetingChartAllDept/MeetingReportChart (⚑ wbsrequired)
└── QuickLinks
mis/
├── page.tsx [C]                       → frmMIS
│   ├── MisGrid (FlexGrid parity: sort/group/export)
│   └── MisSettingPanel                → FrmMISSetting (column/measure config per user)
└── settings/page.tsx [S]              → FrmMISSetting
```

## 3. Orders (`/orders`)

```
orders/
├── page.tsx [S]                       register → FrmOrderRegister(_Spl), frmordwiseregregister
│   └── OrderRegisterTable             filters: buyer/merch/exp/season/style/IO (SP_Rpt_OrderRegColor)
├── in-hand/page.tsx [S]               SP_Vue_OrderinHand* family; toggle SaleRate variants
├── new/page.tsx [C]                   → FrmOrderSheetNew / _Domestic / _WithAmend
│   ├── OrderSheetWizard
│   │   ├── HeaderPanel                buyer PO, IO no, dates, FCY, forward rate (Crate/FwdCtRate)
│   │   ├── StyleLines [C]             OrderStyleDtl; EntryOption 1|2 switch
│   │   │   ├── StyleGrid              plain color/size grid (OrderQtyDtl)
│   │   │   └── ComboGrid              color-combo grid (OrdQtyClrDtl, CmbClrID)
│   │   ├── RatePanel                  RateFor S/C/Z/R granularity
│   │   ├── ExcessPanel                CutPlanQty = OrderQty + Exs_Per% (⚑ orderalloweddays/samplerefno_reqd_in_ordersheet/image_compulsory_in_ordersheet)
│   │   └── PreviewPanel               → Frm_Ordersheet_Preview
├── [io]/page.tsx [S]                  detail
│   ├── OrderHeaderCard
│   ├── StyleTabs / QtyMatrixTable
│   ├── AmendmentTimeline              OrderQtyDtl_Amend audit copies
│   ├── OrderLedger                    SP_OrderHistoryLedger (TempIoHisLedger → jobId)
│   ├── OrdProdTrack                   → FrmOrdProdTrack
│   └── StatusCard                     frmOrdStat / FrmBuyerStatus
├── [io]/amend/page.tsx [C]            → FrmOrderSheetAmendment (+ FrmOrderSheetNew_WithAmend)
├── [io]/close/page.tsx [C]            → FrmOrderClose (order/despatch completion, StyleWise_Despatch_Completion)
├── enquiry/page.tsx [C]               → FrmOrderEnquiry
├── sample/page.tsx [C]                → frmOrderSample + FrmSampleEntry_WithEnquiry (⚑ sampleqtylimitcheck)
├── trading/page.tsx [C]               → FrmTradingOrderSheet + /trading-register → FrmTradingOrdersInHandReg
├── input/page.tsx [C]                 → FrmOrderInputMas (order-related inputs, Excel import → FrmOrderRelatedInput_Excel, FrmOtherPORelatedIps, FrmOptionUpdate)
├── ref/page.tsx [C]                   → FrmOrderRef, frmOrderGroup
└── utilities/
    ├── style-change/page.tsx [C] 🔒   → SP_StyleChange screen (~140-table rename, Trs_StyleChangeLog)
    ├── display-days/page.tsx [C]      → FrmOrderDisplayDaysSetting
    └── io-history/page.tsx [S]        → FrmIoHistoryReg(_New)
```

## 4. Planning & Program (`/planning`)

```
planning/
├── program/
│   ├── new/page.tsx [C]               → frmProgNew (+ _Actual), frmProgEntry, frmProgEntry_YarnCons
│   │   ├── ProgramWizard
│   │   │   ├── RoutePanel             OrdSeq (dept route) + Prod_Sequence (stage route) pickers
│   │   │   ├── YarnConsPanel          yarn consumption per count/color (Prog_Cns: pcswgt/Actpcswgt)
│   │   │   ├── FabricSpecPanel        GSM/GG/LL/Dia/FinDia (Prog_ClrComb; Yd flag; LooseFab)
│   │   │   ├── AccReqPanel            → FrmProg_Acc (PRO_AccReq, SewFlg)
│   │   │   └── GsmLlEdit [C]          → FrmPrg_GSM_LL_EditEntry (⚑ ll_edit_reqd, desentry)
│   │   ├── KnittingPartyInclusion     → FrmPrg_KnittingPartyInclusion (⚑ knitprgdc)
│   │   └── LossPanel                  Prog_Prsloss per process, Prog_Clrloss shade-wise
│   ├── [id]/page.tsx [S]              program card: requirement lines + balances (ST_ProgBalance_*)
│   ├── complete/page.tsx [C]          → FrmProgramComplete (Prog_CompKgs)
│   └── cancel/page.tsx [C]            → frmProgCancel(_Compwise), FrmAcc_ProgCancel
├── requirement/page.tsx [S]           explosion result: SP_FabReqCalc_* (jobId staging)
│   ├── ReqYarnTable                   Pro_ReqYarn by count/color
│   ├── ReqKnitTable                   Pro_ReqKnitt by fab fingerprint
│   ├── PartwiseAccTable               SP_PartwiseRequirement (PRO_AccReq, boost-up FN_Add_BoostupPer ⚑ boostupper)
│   └── ComboWiseTable                 _ComboWise variants (⚑ cp_colorentry_reqd_from_program)
├── reqd-vs-finish/page.tsx [S]        Vue_Reqd_Vs_Finish (dept-wise requirement vs achieved)
├── shortage/
│   ├── new/page.tsx [C]               → frmShortage(_Compwise) (Trs_shortage) (⚑ shortage_approval)
│   └── bit/page.tsx [C]               → FrmShortageBitEntry
├── sewing-req/page.tsx [S]            → FrmSewingReq
├── combo-req/page.tsx [S]             → frmComboWiseReqRpt
├── budget/
│   ├── pre/page.tsx [C]               → frmPreBudgetProdPlan(_New)
│   ├── jobwork/page.tsx [C]           → frmBudgetNew_JobWork, frmBudget, frmBudcom
│   └── compare/page.tsx [S]           → FrmBudgetAndActualComp
├── allotment/
│   ├── contract/page.tsx [C]          → frmContractAllotment(_New) (Trs_ContractorAllotment)
│   └── fabric/page.tsx [C]            → frmFabricAllotment
├── wbs/page.tsx [C]                   T&A calendar
│   ├── WbsGanttTable                  plan/actual per stage, RAG (Sp_WBS_Production)
│   ├── WbsDateWise                    Sp_WBS_Production_DateWise (+ lines)
│   ├── WbsSuppBoard                   Sp_WBS_Supp_Production
│   └── PlanDateCalc                   WF_PlanFinishDateArrival (weekoff+holidays) (⚑ schetargetdays/scheplaneditflg/scheacteditallow/scheduleflg)
├── templates/
│   ├── route/page.tsx [C]             → FrmProRouteTemplate
│   ├── commercial/page.tsx [C]        → Frm_CommercialTemplate
│   └── process-bypass/page.tsx [C]    → FrmProcessByPassSetting + Frm_SubProcess (SubPrsID)
└── workflow-store/page.tsx [C]        → Frm_WF_DocumentStore
```

## 5. Procurement (`/purchase`)

```
purchase/
├── po/
│   ├── new/page.tsx [C]               → frmGeneralPurchaseOrd / frmPurchaseOrd_MultiOrder(_HO) / frmPurchaseOrdAcc
│   │   ├── PoWizard
│   │   │   ├── VendorPanel            Mas_Party by commodity (yarn/mill, fabric, acc)
│   │   │   ├── LinesGrid              Trs_Po2/Trs_Po5 lines; rate autofill (⚑ budrate_auto_fill(_in_po), reqdqty_auto_fill_reqd_in_po)
│   │   │   ├── BudgetDeviationBanner  ⚑ po_buddev (10% default), po_allowadd, po_budrt(+dev)
│   │   │   └── ApprovalSubmit         ⚑ po_approval_reqd → creates approval task (05)
│   │   └── [id]/page.tsx [S]          PO card + accept/cancel
│   ├── register/page.tsx [S]          → FrmSupplierOrderRegister, frmSupordPendReg, FrmSuppOrdHistoryReg
│   ├── cancel/page.tsx [C]            → FrmPOCancel (PoCanQty)
│   └── complete/page.tsx [C]          → frmPoCompl
├── supplier/
│   ├── sheet/page.tsx [C]             → FrmSuppOrdSheet_Semi
│   ├── tech-data/page.tsx [C]         → FrmSuppTechDataSheet
│   └── sequence/page.tsx [C]          → FrmSuppProdSequence
├── rate-confirm/
│   ├── page.tsx [S]                   pending list (SP_PendingRateCnf) / approved (SP_ApprovedRateCnf1)
│   └── [id]/page.tsx [C]              Pro_RateCnfPcs1/2 quotation editor + approve action
└── rates/
    ├── rate/page.tsx [C]              → FrmRateMaster
    ├── prdn/page.tsx [C]              → FrmPrdnRateMaster
    ├── comm/page.tsx [C]              → FrmCommRateMaster
    └── default/page.tsx [C]           → frmDefaultRate
```

## 6. Inward / GRN (`/grn`)

```
grn/
├── new/page.tsx [C]                   → frmGRNEntry / frmGRNEntry_MultiOrder / frmGRN_MultiProcess
│   ├── GrnWizard
│   │   ├── TypePanel                  GrnType: Purchase | Process | DirectReceipt | Process Return | Acc.* (06 matrix)
│   │   ├── PartyDcRefPanel            party + our DC ref (OurDCID; =0 → prev-GRN-as-DC ⚑ ismultipleprocessgrn_required)
│   │   ├── FabricIdentityPanel        grey vs finished item (DyeColId shade, FinGsm, FinDiaID) — new StockTable identity
│   │   ├── LinesGrid                  RecKgs/Recmtr/RBag/Rls per line; roll detail child grid (CurrentStock_RollDtl ⚑ all_transaction_basedon_rollno/rollno_module_reqd)
│   │   ├── ToleranceBanner            ⚑ grn_bal/grn_dev, grn_alladd
│   │   └── AcceptPanel                → FrmPurGrnAccept / FrmProGrnAccept flow
├── [id]/page.tsx [S]                  GRN card + reversal action (compensating posting, 03)
├── acc/page.tsx [C]                   → frmGRNEntryAcc / frmGRNEntryAcc_Ret_Multi / frmPrsGRNMulti(_Acc,_Compwise)
├── lots/
│   ├── approval/page.tsx [C]          → FrmLotApproval (⚑ lot_approval)
│   ├── register/page.tsx [S]          → FrmLotRegister
│   ├── separate/page.tsx [C]          → FrmLotSeparate (lot_seq, lotrunno, nlot ⚑)
│   └── [lot]/page.tsx [S]             → frmLotWiseDtl
├── waste/page.tsx [C]                 → FrmWasteReceiptEntry (Rpt_WasteGRN print)
├── dia/
│   ├── change/page.tsx [C]            → FrmDiaChange / FrmFinalDiaUpdation (knit dia edit ⚑ grnknitdiaedit)
└── opening/page.tsx [C]               → frmOpeningStock(_CompWise) (Trs_Opening)
```

## 7. Outward / DC (`/dc`)

```
dc/
├── fabric/page.tsx [C]                → FrmGenDC (yarn/fab), FabDeliverySP picker
│   ├── DcWizard
│   │   ├── TypePanel                  TrType: 1 process | 2 sales | 3/8 transfer | 4/6/13 returns | 14 godown | 17 unit | 20 ready-to-cut | 21 job-order
│   │   ├── PartyPanel                 job-worker by dept (Mas_Dept; dyeing shade DyeColId, printing DesignId)
│   │   ├── StockPicker                union(CurrentStock>0, existing DC lines) — partially issued still visible
│   │   ├── KnitProgramLines           Trs_Del3 pre-issue program kgs (⚑ knitprgdc)
│   │   ├── RateConfirmGuard           ⚑ need_rate_conf_for_dc / rateconfirmcheck(+dev) / lotwise_rate_deldate_reqd_in_ordersheet
│   │   ├── ReprocessToggle            ProcessType 'P' | 'R' (separate balance bucket)
│   │   ├── GstEwayPanel              HSN %, CGST/SGST/IGST, e-way no/date (Trs_Del4 override)
│   │   └── ToleranceBanner            ⚑ trankgs_dev, dc_fullpage print option
├── pieces/page.tsx [C]                → frmPcsDel / _Ship / Rework, frmPrsDel(Multi/_Acc/_Compwise)
│   ├── PieceDcLines                   Trs_Pcs2: Pcs, Rate, PartID, LotNo, SourceStageId; party bucket +/company bucket −
│   └── DespatchClose                  → frmPcsDelRecClose (⚑ newdespatchno, saledcagainstpgmbalchk)
├── panels/page.tsx [C]                → frmPanelDelRework, frmAddPanelCutting outputs
├── acc/page.tsx [C]                   → FrmAccDel(_Return), frmDomestic_Acc_Issue (TrType 7 dept 16 vs cutting job)
├── returns/page.tsx [C]               → FrmFabDel_Return, FrmAccDel_Return (TrType 4/6/13)
├── general-completion/page.tsx [C]    → frmGeneralDCCompletion (gendcdays ⚑)
├── gate/
│   ├── entry/page.tsx [C]             → FrmGateEntry, frmDailyinout
│   └── pass/page.tsx [C]              → FrmGatePass (⚑ gatepassflg/gatepassopt; direct-bill gate → FrmDirectBill_GateEntry)
├── [id]/page.tsx [S]                  DC card: lines, ack status (Arl/AKg/AMtr), prints (DC + packlist variants 07)
├── non-return-approval/page.tsx [C]   → FrmNonReturnDCApproval
├── reprocess-approval/page.tsx [C]    → FrmReprocess_Approval
├── dc-id-update/page.tsx [C] 🔒       → FrmDcIdUpdation
└── wise-detail/page.tsx [S]           → FrmDcWiseDtl
```

## 8. Stock & Stores (`/stock`)

```
stock/
├── registers/
│   ├── page.tsx [S]                   → FrmStockRegister family (General/Fabric/Yarn/Acc/Itemwise/_Style/_StylePcs/_SplRpt)
│   │   └── StockRegisterTable         Vue_StkLedger semantics; godown/dept/color/size drill
│   └── ledger/page.tsx [S]            → FrmStockLedger (running balance ledger)
├── view/page.tsx [S]                  → frmStockView, frmfabstockshow, frmYarnStockShow, frmAccStockShow, frmPieceStock(All), FrmRejPieceStock
├── transfers/
│   ├── godown/page.tsx [C]            → FrmStkTransfer, TrType 14 (+ FrmChangeGodown, FrmGoDownSel)
│   ├── unit/page.tsx [C]              → TrType 17 + FrmUnitTransferAck (⚑ inhoustransfer/stock_maintain_reqd_for_inhousetransfer)
│   ├── pieces-godown/page.tsx [C]     → FrmPcsGodTransfer
│   └── ack/
│       ├── godown/page.tsx [C]        → FrmGoDownAck, FrmGodownTransferAck (PROC_GodownAck_*)
│       └── unit/page.tsx [C]          → PROC_UnitAck_* (Trs_UnitAck1/2)
├── adjustment/page.tsx [C]            → frmStockAdjustment(_Domestic), frmPcsStockAdjustmentEntry, frmPcsStagewiseOpeningStock (⚑ stagewisepcsstock_and_transactionreqd)
├── roll-split/page.tsx [C]            → FrmRollSplit (RollSplit; roll lineage FrmStockId)
├── current/page.tsx [S]               CurrentStock × 3 ledgers dashboard (+ Trg_CurrentStock_Update sync)
└── options/page.tsx [C]               → frmOptions/FrmOptionsPrint (per-order stock options)
```

## 9. Cutting (`/cutting`)

```
cutting/
├── ready-to-cut/page.tsx [C]          → frmReadytoCut (TrType 20; pass-through balance) + READYTOCUT RETURN print
├── production/page.tsx [C]            → FrmCuttingProduction_Auto_New
│   ├── CutPlanPanel                   CutPlanQty vs OrderQty (+excess%)
│   ├── LayPanel                       lay/marker info, BarcodeLayReport print
│   ├── BundleGenerator                Pay_CuttProdMas → Pay_CuttProd_Bundle (bundle pcs)
│   ├── BarcodePrintPanel              Pay_BarcodeGeneration + Pay_BundlePcs_Barcode labels (zxing SVG; RptBarcodePrint_* 07)
│   └── BitCutPanel                    PcsPerBit, Mas_Bitsize, Pro_Prod_BitCutRate (bit consumption SP_ConsQuery2 parity)
├── job-order/page.tsx [C]             → frmCuttingJobOrder (Cutting_Job; CuttingJobOrder GST print)
├── issue/page.tsx [C]                 → frmCuttingIssue (fabric to cutting floor)
├── ack/page.tsx [C]                   cutting acknowledgement (Trs_CutApr; Arl/AKg/AMtr → dept −7 pool via CutACKStockPost parity) (⚑ cutackreqd)
├── register/page.tsx [S]              → FrmCutingReg, FrmCuttingfabretreg
├── fab-rejection/page.tsx [C]         → FrmCutting_FabRej
├── add-panel/page.tsx [C]             → frmAddPanelCutting (+ FrmPanelExcessEntry(_Stage): panelembelishexsper ⚑)
└── components/page.tsx [S]            → frmProdCutComponents, FrmPartDefineEntry (Order_PartDtl, PcsPerPart)
```

## 10. Production (`/production`)

```
production/
├── entry/page.tsx [C]                 → frmProduction, FrmProduction_CutPanel, FrmBundle_ProductionEntry, FrmOperationEntry
│   ├── ProdEntryForm                  Trs_ProdEntry header: Stage, SourceStage, Part, Color, Lot, Line(EmpId), Hrs
│   │   ├── RouteGuard                 Prod_Sequence validation (source = prior stage; SP_PcsBarcode_Check parity)
│   │   ├── SizeQtyGrid                Trs_ProdEntryQty (SizId × ProdPcs)
│   │   ├── ReworkToggle               Rework=1 → consumes 'M' bucket, returns 'G'
│   │   └── PayToggle                  Pay flag (wage accrual)
│   └── PostingPreview                 shows target+/source− buckets before save (03 matrix)
├── barcode/page.tsx [C]               → frmBarcodeReadingNew — scan station
│   ├── ScanConsole                    keyboard-wedge input; camera fallback (zxing wasm)
│   │   ├── BundleScan                 SP_BundleBarcode_Check parity: INVALID TAG / ALREADY ISSUED TO LINE / BUNDLE COMPLETED
│   │   ├── PieceScan                  SP_PcsBarcode_Check parity: route, contractor allotment, FINAL PROCESS PRODUCTION MADE, rework approval
│   │   └── RejectionScan              SP_PcsBarcode_Check_Rejection parity (RejectionTypeId)
│   ├── ScanQueueOffline               local buffer, replay on reconnect (mobile parity)
│   └── ScanHistory                    → scan-history screen (mobile)
├── posting/page.tsx [C] 🔒            SP_Barcode_Production_Posting parity: group unposted → Trs_ProdEntry (+Qty) in ONE transaction
├── lines/
│   ├── input/page.tsx [C]             → FrmLineInput(Manual) (Trs_LineInput; add target-stage line bucket)
│   ├── output/page.tsx [C]            → frmLineOutputManual(_New) (LineOut: source = last stitch op ⚑)
│   ├── transfer/page.tsx [C]          → line-to-line (Trs_LineTfr; EMPID→TOEMPID; RewrkStk)
│   └── issue-to-production/page.tsx [C] → FrmIssueToProduction (finished bucket −; DelType Despatch/Sales −3)
├── registers/
│   ├── entry/page.tsx [S]             → FrmProductionEntryReg
│   ├── status/page.tsx [S]            → FrmProductionStatusReg, FrmInhouseProductionStatusReg
│   └── track/page.tsx [S]             → FrmOrdProdTrack
├── hourly/page.tsx [C]                → FrmHourlySetting1, frmHours (day1/2/3 effy, speed, sdelay ⚑)
├── subcontract/
│   ├── pcs-return/page.tsx [C]        → frmJobWorkPcsReturn
│   └── wages-bill/page.tsx [C]        → FrmProdBillNew (Trs_ProdBillMasNew/DetNew; GST codes 40/41/42)
└── expenses/page.tsx [C]              → FrmProdExpenses, FrmStylewiseExpensesEntry
```

## 11. Panels & Pieces (`/pieces`)

```
pieces/
├── receipt/page.tsx [C]               → frmPcsRec, frmPrsGRNMulti family (Trs_PcsGrn1/2; RecPcs/RewrkPcs/RejPcs; PROC_PiecesReceipt parity)
├── rejection/page.tsx [C]             → frmPcsRej, frmPanelRej (Trs_PcsRej; good→'M' + RejectionTypeId)
├── short/page.tsx [C]                 → frmPcsShort
├── excess/page.tsx [C]                → FrmPanelExcessEntry(_Stage) (panel excess %)
├── stock/page.tsx [S]                 piece/panel ledgers: Pcs_/Panel_StockTable(Qty) browser (stage × line × G/M)
├── reprocess/page.tsx [C]             rework issue/return (Prod_PcsRworkIssue; ReworkApproval)
└── wages-link/page.tsx [S]            piece-rate wage view from Pay_ProdWorkDetails (⚑ reqd_actual_production_wage_arrived_with_payrolllink)
```

## 12. QC & Lab (`/qc`)

```
qc/
├── tests/page.tsx [C]                 → FrmLabTest, FrmNewLabTest (result entry per lot/stage)
├── parameters/page.tsx [C]            → FrmLabTestParameters, FrmLabTestInputParameters (GSM, shrinkage, pH, etc.)
├── stages/page.tsx [C]                → FrmLabTestStages
├── inspection/page.tsx [C]            mobile QC inspection parity (checkpoints ⚑ chkpointcomp)
└── register/page.tsx [S]              Vue_LabTestGarments parity
```

## 13. Commercial (`/commercial`)

```
commercial/
├── invoices/
│   ├── sales/page.tsx [C]             → frmSalINV, frmNewInv (Trs_Salinv ⋈ DC attach; Mas_SalesGrp prefixes)
│   │   ├── DcAttachPanel              pick DCs → invoice lines; rate × RateUom
│   │   ├── GstPanel                   HSN else Trs_Del4 override; CGST/SGST vs IGST by state
│   │   └── PreviewPrint               SP_Vue_SalesInvoice parity (+_DC/_Domestic/_Pcs variants; ⚑ saledccuminvreq → DelCumInv)
│   ├── commercial/page.tsx [C]        → FrmCommericalInv_New (⚑ convinvreq; exch amt ⚑ commercialinvexcamtper; shippingexpenses)
│   ├── local/page.tsx [C]             → FrmLocalInvoice, FrmLocalInvConfirm
│   ├── piece/page.tsx [C]             → frmPieceInv(_1) (no_of_box, pcs_per_box)
│   └── commission/page.tsx [S]        → FrmInvComm (TradeCommission)
├── packing-list/page.tsx [C]          → FrmPackingList(_Domestic), FrmLocalInvPackingList(_Solid), FrmLocInvPackingListFormat
├── bills/
│   ├── register/page.tsx [S]          → FrmBillsReg (SP_BillsRegView_{yarn,fab*,acc,cm,prd}; TCS/ord-split)
│   ├── pass/page.tsx [C]              → frmBillPass (PassFlg, TDS_Percent/TDSAmount; ⚑ doublebillpassreqd, billdtchk_serverdt(+dev))
│   ├── supplier/page.tsx [S]          → FrmSupplierBillReg
│   ├── add-ded/page.tsx [S]           → FrmBillsAddDedReport (Mas_AddDed heads)
│   ├── non-billable/page.tsx [C]      → FrmNonBillable
│   └── to-be-value/page.tsx [S]       SP_BilltoBeValue(_Approx/_Detail) unbilled accrual
├── debits/
│   ├── new/page.tsx [C]               → frmdebitnote, frmDirectDebitNote (Trs_Deb1/2; Brnid link)
│   └── register/page.tsx [S]          yarn/fab/acc debit registers (SP_Rpt_DebitNote*)
├── payments/
│   ├── page.tsx [C]                   → FrmPaymentReg (payment entry)
│   ├── wages/page.tsx [C]             → FrmPaymentReg_Wages
│   └── register/page.tsx [S]          payment register/ledger (CachedRptPayment* parity)
├── party-balance/
│   ├── page.tsx [S]                   → FrmPartyBalanceRegister, FrmPartyBlnc (abs + program views; TempPartyBal → jobId)
│   ├── outstanding/page.tsx [S]       PartyOutQry (value at cumulative rate), SP_Party_Outstanding_Rate_Arrival
│   └── lookup/page.tsx [S]            mobile bill-lookup/party-balance parity
├── tally-gst/page.tsx [C]             → FrmTally_GSTSetup (export hand-off; ⚑ tdstallyname) + RptTallyPurAndExp pending export
└── hsn/page.tsx [C]                   → FrmHSN, FrmHSNPce (NBPercL/H, BPercL/H slabs)
```

## 14. Costing & P&L (`/costing`)

```
costing/
├── budget-vs-actual/page.tsx [S]      SP_Bud_and_Actual (+_1/_2, stylewise) — jobId staging; ⚑ budandactseprtaxreqd (tax in P&L), bud_app approvals, budactfieldsflag
├── input/page.tsx [C]                 → FrmCostingInput (Trs_DailyPrdn_Costing1..5; 4 expense levels) + Trg_ST_DailyCostingInputData parity
├── quick/page.tsx [S]                 mobile quick-costing parity (ST_Cost_Factory/Dept/OrderDtl cube)
├── daily-pl/page.tsx [S]              Sp_DailyUnitPANDL (per unit/day/order/stage; overhead pro-rata)
├── production-cost/page.tsx [S]       → FrmProductionCost
├── pl-register/page.tsx [S]           → FrmPLReg
├── expenses/
│   ├── page.tsx [C]                   → FrmExpenses, FrmMasExpenses, FrmExpenseGroup
│   ├── fixed/page.tsx [C]             → FrmFixedExpensesEntry (Trs_FixedExpensesDateWise snapshots)
│   └── register/page.tsx [S]          → FrmExpenseEntryRegister
├── wages-cost/
│   ├── dept/page.tsx [S]              → FrmProdWagesDept
│   └── stage/page.tsx [S]             → FrmProdWagesStage
└── buyer-pl/page.tsx [S]              → frmBuyerPLReport
```

## 15. Payroll & Wages (`/payroll`)

```
payroll/
├── production-wages/page.tsx [C]      → Frm_ProductionWages (piece-rate from Pay_ProdWorkDetails)
├── shift-wages/page.tsx [C]           Trs_ProdWages (ShiftWages, Addl_Amount, no_of_persons)
├── registers/
│   ├── shift/page.tsx [S]             → FrmProdShiftWagesReg (SP_Vue_RptShiftWagesReg parity)
│   └── production/page.tsx [S]        → CachedRpt_ProductionWagesReg parity
├── settings/page.tsx [C]              effy ramp (day1effy/day2effy/day3onwards), speed, sdelay, actpwgdivper, prodcutwgtallowedper, initial_style_setupmins, stitching_deptcode
└── compliance/page.tsx [S]            Form JJ list (⚑ formjjreq), TDS report (Rpt_TDS ⚑ notds), allgpayempreqd view
```

## 16. Approvals (`/approvals`)

```
approvals/
├── page.tsx [C]                       inbox: my-pending by type (⚑ approvalsflg, commando_approval_link) — mobile parity
├── [type]/page.tsx [C]                typed queues:
│   ├── po                             PO approvals (po_approval_reqd)
│   ├── budget                         budget approval (bud_app, prodbudappreqd_sample)
│   ├── lot                            FrmLotApproval (lot_approval)
│   ├── rate                           rate confirmations (SP_PendingRateCnf → approve)
│   ├── shortage                       shortage approvals (shortage_approval)
│   ├── reprocess                      FrmReprocess_Approval
│   ├── non-return-dc                  FrmNonReturnDCApproval
│   ├── acc-item                       FrmAccItemApproval (acc_item_approval_reqd_for_accissue)
│   └── aw-bill                        → Frm_AppAwBill
└── masters/page.tsx [C] 🔒            → Frm_AppMas (approval routing config)
```

## 17. Reports (`/reports`)

```
reports/
├── page.tsx [S]                       catalog by family (07) + favorites + per-user defaults (FrmMISSetting)
├── [reportId]/page.tsx [C]            generic runner
│   ├── ReportFilterPanel              legacy parameter sets (dates, party, order, dept, coy)
│   ├── ReportJobRunner                jobId staging (Temp_* parity)
│   ├── ReportViewer                   paginated grid + print/PDF (preprint overlay templates)
│   └── ExportBar                      Excel/CSV (Interop.Excel parity)
└── viewer/[printId]/page.tsx [S]      document prints: DC/GRN/Invoice/PackingList/Labels (07 catalog)
```

## 18. Masters (`/masters`)

```
masters/                               all reuse <MasterCrud> (list + form + history/UpdateFlg)
├── party/page.tsx [C]                 FrmPartyMaster (job-workers/suppliers; state for GST)
├── buyer/page.tsx [C]                 FRMBUYER + FrmMasBuyerDept
├── style/page.tsx [C]                 FrmStyleMaster, FrmStyleDesc, frmComposition
├── fabric/page.tsx [C]                FrmMasFabric, frmFabricmaster, frmFomGrp, FrmMasTemplate
├── color/page.tsx [C]                 + shade (FrmShadeEntry), gram mage (frmGrammage)
├── yarn/page.tsx [C]                  FrmCountGroup, FrmMill, frmThreadTypeMaster (different_processuom_reqd_in_fabmaster ⚑, fabtoyarn_count_hide_in_requirement ⚑)
├── knitting/page.tsx [C]              frmDiaSize (dia/finish dia), frmDesignEntry, machine (FrmMachineMaster/Category)
├── garment/page.tsx [C]               Mas_Part, Mas_Size, frmSizeGroup, FrmRange(Grp)
├── jobwork/page.tsx [C]               stage master (Mas_JobWrkComp: PcsType, Spl_Operation, dept link), Frm_SubProcess, FrmStageWiseTagMaster
├── dept/page.tsx [C]                  FrmDeptMasterNew, frmDeptGroup (InputType/OutputType, SemiFinish, ProgFrm_Issue, RecMethod, OrderSno)
├── accessories/page.tsx [C]           FrmAccmaster, FrmAccCat, FrmAccDescMaster (Multiple_Factor/Divide_Factor, NoDec)
├── org/page.tsx [C]                   FrmConcern (company), godown (FrmGodown), unit, season, merchandiser (FrmMasMerchandiser)
├── finance/page.tsx [C]               bank (FrmMasBank/FrmBankMaster/FrmMasBankAccount), currency (frmFcymaster, frmFCRmaster), expenses (FrmMasExpenses), UOM, HSN
├── people/page.tsx [C]                FrmEmpmaster (operators/contractors = line/party), Mas_WorkNature
├── statutory/page.tsx [C]             FrmStateMaster, FrmHSN/HSNPce, holidays (Frm_Mas_Holiday), frmTerms, frmPaytem
└── misc/page.tsx [C]                  frmGenrec, FrmFormDef, Frm_Master generic
```

## 19. Administration (`/admin`)

```
admin/
├── users/page.tsx [C] 🔒              FrmMasuser, FrmUserGroupMas, FrmPassword_List
├── rights/page.tsx [C] 🔒             FrmMenuRights, FrmMenuAccRights, FrmCompanyRights (menu/button matrix)
├── session/page.tsx [C]               FrmLock (user lock), FrmGeneralClose/frmclose (period close)
├── finyear/page.tsx [C] 🔒            finyear management (Trg_Finyear_Update data)
├── integrations/page.tsx [C]          FrmSMSMailSetup (mail/SMS; inoutautomail, poautomailreqd, smtpserverpassword), FrmWeightScale_Integration (serial scale → GRN weights)
├── data/
│   ├── delete/page.tsx [C] 🔒         FrmDataDelete, FrmDelete, frmTblErase (guarded, audited)
│   └── migration/page.tsx [C] 🔒      legacy import/sync utilities
└── flags/page.tsx [S] 🔒              Options editor = 189 flags (07) with descriptions & effect preview
```

## 20. Mobile / Commando (`/m`)

```
(mobile)/m/                            — bottom tabs: Dashboard | Scan | Orders | Approvals | More (matches existing app)
├── login                              mobile login (Cust_Code context)
├── dashboard                          KPIs + notifications summary
├── scan                               ScanConsole (barcode + QR reading) + offline queue
├── scan-history                       recent scans
├── approvals/                         inbox + [type] queues + detail (PO filter parity)
├── orders/                            list + detail (status, WBS RAG) + track link (08)
├── entry/
│   ├── production                     production-entry parity
│   ├── stage                          stage-entry parity
│   ├── grn                            grn-entry parity (+ AiDock: challan photo → draft, 09)
│   ├── rejection                      rejection-entry parity
│   ├── stock-transfer                 stock-transfer parity
│   ├── unit-transfer                  unit-transfer parity
│   ├── gate-pass                      gate-pass parity (carton/piece QR scan-out, 08)
│   └── process-dc                     process-dc parity
├── qc/inspection                      qc-inspection parity (breakdown report link)
├── breakdown-report                   machine breakdown entry
├── stock/ledger                       stock-ledger parity
├── costing/quick                      quick-costing parity
├── bills/lookup                       bill-lookup parity
├── party/balance                      party-balance parity
├── track/                             [new] scan-anything + item passport (08 §6)
├── ai/                                [new] snap→draft, voice Q&A, approvals brief (09 §8)
├── notifications                      notification center (+ AI digest)
└── settings                           server/user settings (+ language ta/en)
```

## 21. Shared component library (used across all modules)

```
components/
├── ui/                                primitives: Button, Input, Select, DatePicker(finyear-aware), Modal, Tabs, Toast, Skeleton
├── data/                              FlexGrid-parity grid stack:
│   ├── DataTable                      sort/group/freeze/footer/keyboard-nav
│   ├── LineGrid                        editable document lines (insert/copy/paste rows, computed cols)
│   └── TreeGrid                        WBS/RAG, order-style trees
├── pickers/                           OrderPicker, StylePicker, PartyPicker(by dept), StockPicker(CurrentStock∪doc-lines), LotPicker, RollPicker, StagePicker(Prod_Sequence), LinePicker, GodownPicker, AccPicker, ShadePicker, MillPicker, CountPicker
├── document/                          DocumentShell(header/status/print), DocumentNumberBox(NumberingService), EntrySummaryBar, PostingPreview(03 matrix diff), ReversalButton(compensating), AmendmentTimeline, AttachmentPanel(attachpath/imgpath)
├── domain/
│   ├── StockBalanceTable              3-ledger balances w/ G/M split & drill
│   ├── ProgramBalanceCard             ST_ProgBalance_Yarn/Fabric (Req/PO/DC/GRN/Short/Ret/Reproc/Trans)
│   ├── PartyBalanceCard               absolute + program-wise + value-at-cum-rate
│   ├── ToleranceBanner                generic ± % checker (any flag pair)
│   ├── GstSummary                     CGST/SGST/IGST by state; e-way fields
│   ├── RateConfirmBadge               rate-confirmation state
│   ├── WbsRagBadge / WbsGanttTable
│   ├── BarcodeField + BarcodeLabelSvg (zxing) + QrLabelSvg (08: signed GS1-DL-style + internal codes)
│   ├── ScanConsole + ScanQueueOffline (1D + QR; offline HMAC validation)
│   ├── GenealogyGraph + OrderFunnelTable + ItemPassportTimeline (08)
│   ├── ApprovalCard + ApprovalActions
│   ├── CumulativeRateCard             StockRatePost cumbillrate view
│   ├── MeetingPackPanel               Meet* datasets
│   ├── AiDock                         floating "fill from photo/email/voice" on every form (09)
│   ├── ParseReviewScreen + NumericConfirm + MasterChip (09 §4)
│   └── AssistantBar + VoiceInput + TamilTts (09 §5)
├── reports/                           ReportFilterPanel, ReportJobRunner, ReportViewer, PrintLayout(preprint overlays), ExportBar
├── shell/                             ERPShell, SidebarNav, TopbarContext, NotificationBell, ApprovalBadge, MobileShell, TabBar
└── guards/                            <Can do>, <FlagGate flag>, <FinYearGate>
```

## 22. State & data wiring per screen class

| Screen class | State | Server wiring |
|---|---|---|
| Master CRUD | RHF form | `useMutation` → `POST/PATCH /api/masters/:entity` |
| Document entry (DC/GRN/PO/Bill/Inv/ProdEntry) | Zustand draft {header, lines[], picker ctx}; LineGrid edits | save → `POST /api/<doc>` → returns posting preview + doc no; reversal → `DELETE /api/<doc>/[id]` (compensating) |
| Register/report | URL params (filters) | `useQuery` → `/api/reports/:id/run` (jobId) or direct repo endpoints |
| Scan station | local queue (Zustand + IndexedDB) | `POST /api/scan/:kind` per scan (validations 05), `POST /api/scan/posting` batch |
| Approvals | SSE-updated list | `POST /api/approvals/:id/:action` |
| Dashboards/MIS | server-rendered + SSE refresh | `ST_*` projector reads |

## 23. QR Tracking (`/tracking`) — new module (08)

```
tracking/
├── [io]/page.tsx [S]                  Order river: stage funnel w/ quantities tied to ST_*/Vue_Reqd_Vs_Finish
│   ├── OrderFunnelTable               Req→Knit→Dye→Cut→Stitch→Pack→Despatch, RAG per stage
│   ├── LossReconciliationCard         trace vs ledger variance per stage (08 §1.5)
│   └── GenealogyGraph                 interactive DAG roll→lay→bundle→piece→carton (click→passport)
├── [io]/genealogy/page.tsx [C]        full DAG explorer (zoom/pan/filter by lot|part|size)
├── unit/[trackId]/page.tsx [S]        item passport: timeline, owner, ancestors/descendants, QC, wage postings
├── scan/page.tsx [C]                  universal ScanConsole: identifies any 1D/QR code, shows/advances it
├── exceptions/page.tsx [S]            reconciliation mismatches · missing scans · party aging · voided labels
├── policy/page.tsx [C] 🔒             TrackPolicy editor (per order/part/stage granularity, 08 §7)
└── labels/page.tsx [C]                label designer/print queue (QrLabelSvg sizes; TrackLabelLog audit)
    └── admin/…  → mounted under /admin/tracking (backfill JobPanel, 04 sec. 12)
```

## 24. AI Harness (`/ai`) — new module (09)

```
ai/
├── inbox/page.tsx [C]                 parse-review queue (doc type · confidence · age)
│   └── [draftId]/page.tsx [C]         ParseReviewScreen (SourcePane ⇄ FieldsPane ⇄ MatchPanel, 09 §4)
├── assistant/page.tsx [C]             chat + voice (Tamil-first), skill router, grounded answers
├── digest/page.tsx [S]                daily Tamil exception briefing (09 skill 11)
└── admin/…  → mounted under /admin/ai (models, prompts, golden set, cost/correction dashboards, kill switches)
```
