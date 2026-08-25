# 06 — SCREEN MAP: every legacy form → Next.js wiring

All 322 operational forms + MDI shell mapped. Columns: **Form** (legacy) · **Route** (02 tree) · **Composition** (shared components used) · **Service call** (04) · **Wiring/posting notes** (03 matrix ref). Masters use `<MasterCrud>`; documents use `DocumentShell + *Wizard + LineGrid + PostingPreview`; registers use `ReportFilterPanel + DataTable`.

## A. Shell & navigation

| Form | Route | Composition | Service | Notes |
|---|---|---|---|---|
| MDIJOMS | `(erp)/layout` | ERPShell, SidebarNav, TopbarContext | `/api/me/menu` | menu tree = rights matrix |
| FrmLoading / FrnSplash | — (loading.tsx) | Skeleton | — | route-level loading states |
| frmSearch | TopbarContext ⌘K | Command palette over pickers | pickers API | global search |
| frmPopUp | Modal usage | ui/Modal | — | generic confirm dialogs |
| frmOptions / FrmOptionsPrint / FrmOptionUpdate | `/stock/options` | OptionsPanel | `StockService.options()` | per-order stock/print options |

## B. Auth & session

| Form | Route | Composition | Service | Notes |
|---|---|---|---|---|
| FrmCompanyLogin | `(auth)/login` | CompanyStep | `POST /api/auth/login` | coy context |
| FrmFinyearLogin | `(auth)/login` | FinYearStep | same | finyear context |
| FrmLogin_New | `(auth)/login` | CredentialsStep | same | Mas_User |
| FrmChangePassword | `/admin/users` → dialog | PasswordForm | `POST /api/auth/change-password` | |
| FrmLoginReg | `/admin/users` | MasterCrud | UsersService | login audit |

## C. Masters (all `/masters/*`, `<MasterCrud>` + entity forms)

| Form | Route | Extra components | Wiring notes |
|---|---|---|---|
| FrmPartyMaster | `/masters/party` | StatePicker (GST) | Mas_Party; UpdateFlg sync |
| FRMBUYER / FrmMasBuyerDept | `/masters/buyer` | | buyer + dept |
| FrmStyleMaster / FrmStyleDesc / frmComposition | `/masters/style` | ImagePanel (attachpath) | style master set |
| frmOrderGroup | `/orders/ref` | | order grouping flag `ordergroupingreqd` |
| FrmMasFabric / frmFabricmaster / frmFomGrp / FrmMasTemplate | `/masters/fabric` | UomPicker | `different_processuom_reqd_in_fabmaster` ⚑ |
| frmGrammage / FrmShadeEntry | `/masters/color` | | GSM/shade |
| FrmCountGroup / FrmMill / frmThreadTypeMaster | `/masters/yarn` | | `fabtoyarn_count_hide_in_requirement` ⚑ |
| frmDiaSize / frmDesignEntry | `/masters/knitting` | | dia & design |
| FrmMachineMaster / FrmMachineCategory | `/masters/knitting` | | breakdown-report link |
| Mas_Part / Mas_Size / frmSizeGroup / FrmRange / FrmRangeGrp / FrmRange_Orderwise | `/masters/garment` | | part/size/range |
| stage master (Mas_JobWrkComp screens incl. Frm_Formas) | `/masters/jobwork` | PcsTypePicker, SplOperationToggle | PcsType Piece/Panel/Bit drives ledger (4.2) |
| Frm_SubProcess / FrmStageWiseTagMaster | `/masters/jobwork` | | SubPrsId split; stage tags |
| FrmDeptMasterNew / frmDeptGroup / frmDeptSettings | `/masters/dept` | InputOutputTypePicker | OrderSno fixes route order; ProgFrm_Issue, RecMethod |
| FrmAccmaster / FrmAccCat / FrmAccDescMaster | `/masters/accessories` | FactorInputs | Multiple/Divide_Factor, NoDec |
| FrmConcern | `/masters/org` | | company/coy |
| FrmGodownMaster / FrmGoDownSel | `/masters/org`, used in ctx | | godowns |
| season / merchandiser (FrmMasMerchandiser) | `/masters/org` | | |
| FrmMasBank / FrmBankMaster / FrmMasBankAccount | `/masters/finance` | | invoice bank print |
| frmFcymaster / frmFCRmaster | `/masters/finance` | RateTable | currency + forward rates |
| FrmMasExpenses / FrmExpenseGroup / FrmExpenses / FrmFixedExpensesEntry | `/costing/expenses` (+master links) | LevelPicker | Exp_Level 4 levels |
| FrmEmpmaster | `/masters/people` | LineLink | Emp = operator/line/contractor |
| FrmMasWorkNature | `/masters/people` | | natureofwrk_tamil ⚑ |
| FrmStateMaster / FrmHSN / FrmHSNPce | `/masters/statutory` | SlabEditor | NBPercL/H, BPercL/H |
| Frm_Mas_Holiday | `/masters/statutory` | CalendarInput | feeds WF_PlanFinishDateArrival |
| frmTerms / frmPaytem | `/masters/statutory` | | invoice terms |
| frmGenrec / FrmFormDef / Frm_Master | `/masters/misc` | | generic master/defines |
| Mas_UOM / UOM picker | `/masters/finance` | | Mas_RateUom link |
| frmLot masters (via FrmLotRegister) | `/grn/lots` | | lot_seq/nlot flags |

## D. Orders

| Form | Route | Composition | Service | Wiring |
|---|---|---|---|---|
| FrmOrderEnquiry | `/orders/enquiry` | EntryForm | `POST /api/orders/enquiry` | pre-IO |
| frmOrderSample / FrmSampleEntry_WithEnquiry | `/orders/sample` | SampleQtyGuard | `POST /api/orders/sample` | `sampleqtylimitcheck` ⚑ |
| FrmOrderSheetNew | `/orders/new` | OrderSheetWizard (StyleLines/ComboGrid/RatePanel/ExcessPanel) | `POST /api/orders` | OrderMas/2 + StyleDtl + QtyDtl |
| FrmOrderSheetNew_Domestic | `/orders/new?mode=domestic` | same | same | domestic taxes |
| FrmOrderSheetNew_WithAmend / FrmOrderSheetAmendment | `/orders/[io]/amend` | AmendmentTimeline | `POST /api/orders/:io/amend` | _Amend audit copies |
| FrmTradingOrderSheet | `/orders/trading` | | | trading flow |
| FrmOrderInputMas / FrmOrderRelatedInput_Excel / FrmOtherPORelatedIps / FrmOptionUpdate | `/orders/input` | ExcelDrop | excelInput | bulk inputs |
| Frm_Ordersheet_Preview | `/reports/viewer/order-sheet` | PrintLayout | print | preprint overlays |
| FrmOrderRef | `/orders/ref` | | | references |
| FrmOrderClose | `/orders/[io]/close` | CloseChecklist | close | Completed/Despatch_Completed |
| FrmOrderRegister(_Spl) / frmordwiseregregister | `/orders` | DataTable | list | SP_Rpt_OrderRegColor |
| in-hand views | `/orders/in-hand` | DataTable | inHand | SP_Vue_OrderinHand* |
| frmOrdStat / FrmBuyerStatus | `/orders/[io]` StatusCard | | status | |
| FrmOrdProdTrack | `/orders/[io]` OrdProdTrack | | track | |
| FrmOrderDisplayDaysSetting | `/orders/utilities/display-days` | | | display aging |
| FrmIoHistoryReg(_New) | `/orders/utilities/io-history` | DataTable | ledger | SP_OrderHistoryLedger |
| style change (SP_StyleChange UI) | `/orders/utilities/style-change` 🔒 | ConfirmList | styleChange | ~140 tables + log |
| FrmFinalDiaUpdation / FrmDiaChange | `/grn/dia/*` | | diaChange | |
| FrmTradingOrdersInHandReg | `/orders/trading-register` | DataTable | | |

## E. Planning & program

| Form | Route | Composition | Service | Wiring |
|---|---|---|---|---|
| frmProgNew / frmProgNew_Actual | `/planning/program/new` | ProgramWizard | `POST /api/planning/program` | Pro_ReqYarn/ReqKnitt seed |
| frmProgEntry / frmProgEntry_YarnCons | same (steps) | YarnConsPanel | | Prog_Cns pcswgt |
| FrmPrg_GSM_LL_EditEntry | same | GsmLlEdit | | `ll_edit_reqd` ⚑ |
| FrmPrg_KnittingPartyInclusion | same | | | `knitprgdc` ⚑ |
| FrmProg_Acc | same | AccReqPanel | | PRO_AccReq |
| frmProgCancel(_Compwise) / FrmAcc_ProgCancel | `/planning/program/cancel` | | cancel | |
| FrmProgramComplete | `/planning/program/complete` | | complete | Prog_CompKgs |
| requirement screens | `/planning/requirement` | Req*Tables | explode | SP_FabReqCalc_* |
| frmComboWiseReqRpt | `/planning/combo-req` | DataTable | | |
| FrmSewingReq | `/planning/sewing-req` | | | |
| frmShortage(_Compwise) | `/planning/shortage/new` | ToleranceBanner | shortage | Trs_shortage; approval ⚑ |
| FrmShortageBitEntry | `/planning/shortage/bit` | | | |
| reqd-vs-finish | `/planning/reqd-vs-finish` | DataTable | reqdVsFinish | Vue_Reqd_Vs_Finish |
| frmPreBudgetProdPlan(_New) | `/planning/budget/pre` | | | |
| frmBudgetNew_JobWork / frmBudget / frmBudcom | `/planning/budget/jobwork` | | | budget capture |
| FrmBudgetAndActualComp | `/costing/budget-vs-actual` | DataTable | budVsAct | |
| frmContractAllotment(_New) | `/planning/allotment/contract` | | | Trs_ContractorAllotment |
| frmFabricAllotment | `/planning/allotment/fabric` | | | |
| WBS screens (WbsGantt/DateWise/Supp) | `/planning/wbs` | WbsGanttTable | wbs | RAG; `wbsrequired`/`wbsplanningmust` ⚑ |
| FrmProRouteTemplate / Frm_CommercialTemplate | `/planning/templates/*` | | | |
| FrmProcessByPassSetting | `/planning/templates/process-bypass` | | | SubPrsID bypass |
| FrmHourlySetting1 / frmHours | `/production/hourly` | EffyEditor | | day1/2/3 effy ⚑ |
| Frm_WF_DocumentStore | `/planning/workflow-store` | DocStore | | |

## F. Procurement & GRN

| Form | Route | Composition | Service | Wiring |
|---|---|---|---|---|
| frmGeneralPurchaseOrd / frmPurchaseOrd_MultiOrder(_HO) / frmPurchaseOrdAcc | `/purchase/po/new` | PoWizard + BudgetDeviationBanner | `POST /api/purchase/po` | Trs_Po1/2/5; tolerances ⚑ |
| FrmPOCancel | `/purchase/po/cancel` | | | PoCanQty |
| frmPoCompl | `/purchase/po/complete` | | | |
| FrmPurGrnAccept / FrmProGrnAccept | `/purchase/po/[id]` AcceptPanel | | | acceptance |
| FrmSupplierOrderRegister / frmSupordPendReg / FrmSuppOrdHistoryReg | `/purchase/po/register` | DataTable | list | |
| FrmSuppOrdSheet_Semi / FrmSuppTechDataSheet / FrmSuppProdSequence | `/purchase/supplier/*` | | | |
| rate confirm screens | `/purchase/rate-confirm` | ApprovalCard | rateConfirm | Pro_RateCnfPcs* |
| FrmRateMaster / FrmPrdnRateMaster / FrmCommRateMaster / frmDefaultRate | `/purchase/rates/*` | MasterCrud | | |
| frmGRNEntry(_MultiOrder) | `/grn/new` | GrnWizard (TypePanel/IdentityPanel/LinesGrid/RollGrid) | `POST /api/grn` | matrix 4.1 |
| frmGRN_MultiProcess | `/grn/new?multi=1` | MultiProcessLegs | multiProcess | prev-GRN-as-DC |
| frmGRNEntryAcc / _Ret_Multi / frmPrsGRNMulti(_Acc/_Compwise) | `/grn/acc` | | | acc mirrors |
| FrmLotApproval | `/grn/lots/approval` | ApprovalCard | lot | `lot_approval` ⚑ |
| FrmLotRegister / FrmLotSeparate / frmLotWiseDtl | `/grn/lots/*` | | | lot life |
| FrmWasteReceiptEntry | `/grn/waste` | | waste | |
| frmOpeningStock(_CompWise) | `/stock/opening` | | opening | Trs_Opening |

## G. DC & gate

| Form | Route | Composition | Service | Wiring |
|---|---|---|---|---|
| FrmGenDC | `/dc/fabric` | DcWizard (TypePanel/PartyPanel/StockPicker/KnitProgramLines/RateConfirmGuard/GstEwayPanel) | `POST /api/dc/fabric` | matrix 4.1; Trs_Del1/2/3 |
| FrmFabDel(_Return) | `/dc/fabric`, `/dc/returns` | | | |
| frmPcsDel(_Ship/Rework) | `/dc/pieces` | PieceDcLines | pieces | matrix 4.3 |
| frmPrsDel(Multi/_Acc/_Compwise) | `/dc/pieces` variants | | | |
| FrmAccDel(_Return) / frmDomestic_Acc_Issue | `/dc/acc` | | acc | TrType 7 |
| frmGeneralDCCompletion | `/dc/general-completion` | | | gendcdays aging |
| FrmNonReturnDCApproval | `/approvals/non-return-dc` | ApprovalCard | | |
| FrmReprocess_Approval | `/approvals/reprocess` | ApprovalCard | | ProcessType R gate |
| FrmGateEntry / frmDailyinout | `/dc/gate/entry` | | gate | |
| FrmGatePass / FrmDirectBill_GateEntry | `/dc/gate/pass` | GateQr | gate | `gatepassflg` ⚑ |
| FrmDcIdUpdation 🔒 / FrmDcWiseDtl | `/dc/dc-id-update`, `/dc/wise-detail` | | | utilities |

## H. Stock & stores

| Form | Route | Service | Wiring |
|---|---|---|---|
| FrmStockRegister(+/General/Fabric/Yarn/Acc/Itemwise/_Style/_StylePcs/_SplRpt) | `/stock/registers` | register | Vue_StkLedger family |
| FrmStockLedger | `/stock/registers/ledger` | ledger | running balance |
| frmStockView / frmfabstockshow / frmYarnStockShow / frmAccStockShow / frmPieceStock(All) / FrmRejPieceStock | `/stock/view` | current | 3-ledger browse |
| FrmStkTransfer / FrmChangeGodown | `/stock/transfers/godown` | transfer | TrType 14 |
| unit transfer + FrmUnitTransferAck | `/stock/transfers/unit` | transfer/ack | TrType 17; in-house flags ⚑ |
| FrmPcsGodTransfer | `/stock/transfers/pieces-godown` | transfer | |
| FrmGoDownAck / FrmGodownTransferAck | `/stock/transfers/ack/godown` | ack | PROC_GodownAck_* |
| frmStockAdjustment(_Domestic) / frmPcsStockAdjustmentEntry / frmPcsStagewiseOpeningStock | `/stock/adjustment` | adjust | `stagewisepcsstock…` ⚑ |
| FrmRollSplit | `/stock/roll-split` | split | roll lineage |
| frmReadytoCut | `/cutting/ready-to-cut` | readyToCut | TrType 20 |

## I. Cutting / production / pieces

| Form | Route | Service | Wiring |
|---|---|---|---|
| FrmCuttingProduction_Auto_New | `/cutting/production` | cutting.production | bundles + barcodes |
| frmCuttingJobOrder | `/cutting/job-order` | jobOrder | Cutting_Job |
| frmCuttingIssue | `/cutting/issue` | issue | |
| cut ack (Trs_CutApr UI) | `/cutting/ack` | ack | `cutackreqd` ⚑ |
| FrmCutingReg / FrmCuttingfabretreg | `/cutting/register` | | registers |
| FrmCutting_FabRej | `/cutting/fab-rejection` | | |
| frmAddPanelCutting / FrmPanelExcessEntry(_Stage) | `/cutting/add-panel` | | `panelembelishexsper` ⚑ |
| frmProdCutComponents / FrmPartDefineEntry | `/cutting/components` | | Order_PartDtl |
| frmProduction / FrmProduction_CutPanel / FrmBundle_ProductionEntry / FrmOperationEntry | `/production/entry` | production.entry | dispatcher 4.2 |
| frmBarcodeReadingNew | `/production/barcode`, `/m/scan` | scan.* | bundle/piece/rejection scans |
| FrmLineInput(Manual) / frmLineOutputManual(_New) | `/production/lines/input\|output` | line.* | line buckets |
| line transfer UI | `/production/lines/transfer` | line.tfr | EMPID→TOEMPID |
| FrmIssueToProduction | `/production/lines/issue-to-production` | issueToPrdn | finished − |
| FrmProductionEntryReg / FrmProductionStatusReg / FrmInhouseProductionStatusReg | `/production/registers/*` | | |
| FrmProdBillNew | `/production/subcontract/wages-bill` | | Trs_ProdBill* |
| FrmProdExpenses / FrmStylewiseExpensesEntry | `/production/expenses` | | |
| frmPcsRec / frmPrsGRNMulti family | `/pieces/receipt` | pcs-grn | 4.3 |
| frmPcsRej / frmPanelRej | `/pieces/rejection` | rejection | G→M |
| frmPcsShort | `/pieces/short` | | |
| frmJobWorkPcsReturn | `/production/subcontract/pcs-return` | | |
| FrmFinishGoodsEntry | `/pieces` receipt flow | | finish goods |
| piece stock registers | `/pieces/stock` | | |

## J. QC, commercial, costing, payroll, approvals, admin, reports

| Form | Route | Service | Wiring |
|---|---|---|---|
| FrmLabTest / FrmNewLabTest / FrmLabTestParameters / FrmLabTestStages / FrmLabTestInputParameters | `/qc/*` | qc.* | |
| frmSalINV / frmNewInv | `/commercial/invoices/sales` | invoice.sales | DC attach + GST |
| FrmCommericalInv_New | `/commercial/invoices/commercial` | invoice.commercial | `convinvreq` ⚑ |
| FrmLocalInvoice / FrmLocalInvConfirm | `/commercial/invoices/local` | invoice.local | |
| frmPieceInv(_1) | `/commercial/invoices/piece` | invoice.piece | boxes |
| frmDelCumInv | sales page (toggle) | | `saledccuminvreq` ⚑ |
| FrmInvComm | `/commercial/invoices/commission` | | |
| FrmPackingList(_Domestic) / FrmLocalInvPackingList(_Solid) / FrmLocInvPackingListFormat | `/commercial/packing-list` | packing | |
| FrmBillsReg / bill register variants | `/commercial/bills/register` | bills.register | SP_BillsRegView_* |
| frmBillPass | `/commercial/bills/pass` | bills.pass | TDS; `doublebillpassreqd` ⚑ |
| FrmSupplierBillReg | `/commercial/bills/supplier` | | |
| FrmBillsAddDedReport | `/commercial/bills/add-ded` | | Mas_AddDed |
| FrmNonBillable | `/commercial/bills/non-billable` | | |
| to-be-value | `/commercial/bills/to-be-value` | bills.toBeValue | accrual |
| frmdebitnote / frmDirectDebitNote | `/commercial/debits/new` | debit | Trs_Deb1/2 |
| debit registers | `/commercial/debits/register` | | yarn/fab/acc |
| FrmPaymentReg(_Wages) | `/commercial/payments` | payment | |
| FrmPartyBalanceRegister / FrmPartyBlnc | `/commercial/party-balance` | party-balance | abs+prog+value |
| outstanding | `/commercial/party-balance/outstanding` | | PartyOutQry |
| FrmTally_GSTSetup | `/commercial/tally-gst` | tally | |
| FrmCostingInput | `/costing/input` | costing.input | 4 levels |
| quick costing | `/costing/quick` | costing.quick | cube |
| daily P&L | `/costing/daily-pl` | costing.dailyPL | |
| FrmProductionCost | `/costing/production-cost` | | |
| FrmPLReg / frmBuyerPLReport | `/costing/pl-register`, `/costing/buyer-pl` | | |
| FrmProdWagesDept / FrmProdWagesStage / Frm_ProductionWages / shift wages UI | `/payroll/*` | payroll.* | |
| wage registers | `/payroll/registers` | | |
| approvals (Frm_AppMas, Frm_AppAwBill, FrmAccItemApproval) | `/approvals/*` | approvals.* | 05 §4 |
| FrmCrysReport / FrmReport / frmRpt / FrmRegister | `/reports/*` | reports.* | generic runners |
| FrmMasuser / FrmUserGroupMas / FrmPassword_List / FrmMenuRights / FrmMenuAccRights / FrmCompanyRights | `/admin/*` 🔒 | | rights matrix |
| FrmLock / frmclose / FrmGeneralClose | `/admin/session` | | |
| FrmDataDelete / FrmDelete / frmTblErase | `/admin/data` 🔒 | | audited utilities |
| FrmSMSMailSetup / FrmWeightScale_Integration | `/admin/integrations` | | mail/SMS/scale |

## K. Mobile (Commando) screens

| Screen | Route | Service |
|---|---|---|
| login | `/m/login` | auth |
| dashboard | `/m/dashboard` | ST_* reads |
| scan / scan-history | `/m/scan`, `/m/scan-history` | scan.* (+ QR codes, 08) |
| approvals + detail (PO filter) | `/m/approvals/*` | approvals.* |
| orders + detail | `/m/orders/*` | orders.* + WBS RAG + track link |
| production-entry / stage-entry | `/m/entry/production\|stage` | production.entry |
| grn-entry | `/m/entry/grn` | grn (+ AiDock challan-photo draft) |
| rejection-entry | `/m/entry/rejection` | rejection |
| stock-transfer / unit-transfer | `/m/entry/*transfer` | transfer |
| gate-pass | `/m/entry/gate-pass` | gate (carton/piece QR scan-out) |
| process-dc | `/m/entry/process-dc` | dc (limited) |
| qc-inspection / breakdown-report | `/m/qc/*`, `/m/breakdown-report` | qc, breakdown event |
| stock-ledger | `/m/stock/ledger` | stock.ledger |
| quick-costing | `/m/costing/quick` | costing.quick |
| bill-lookup / party-balance | `/m/bills/lookup`, `/m/party/balance` | bills, party-balance |
| track (new) | `/m/track` | trace.resolve / passport (08) |
| ai (new) | `/m/ai` | ai.* (09) |
| notifications / settings / more | `/m/notifications`, `/m/settings` | events stream, config (+ta/en) |

## L. New screens — QR tracking (08)

| Screen | Route | Composition | Service |
|---|---|---|---|
| Order river | `/tracking/[io]` | OrderFunnelTable, LossReconciliationCard, GenealogyGraph | trace.river |
| Genealogy explorer | `/tracking/[io]/genealogy` | GenealogyGraph (zoom/filter) | trace.genealogy |
| Item passport | `/tracking/unit/[trackId]` | ItemPassportTimeline | trace.passport |
| Scan-anything | `/tracking/scan`, `/m/track` | ScanConsole (1D+QR) | trace.resolve/scan |
| Exceptions | `/tracking/exceptions` | DataTable | trace.exceptions |
| Policy editor | `/tracking/policy` 🔒 | TrackPolicyForm | trace.policy |
| Labels | `/tracking/labels` | QrLabelSvg designer + print queue | labels.print/void |
| Backfill job | `/admin/tracking` 🔒 | JobPanel | trace.backfill |

## M. New screens — AI harness (09)

| Screen | Route | Composition | Service |
|---|---|---|---|
| Parse inbox | `/ai/inbox` | QueueTable (type/confidence/age) | ai.inbox |
| Review | `/ai/inbox/[draftId]` | ParseReviewScreen (SourcePane/FieldsPane/NumericConfirm/MatchPanel) | ai.drafts.* |
| Assistant | `/ai/assistant` | AssistantBar, VoiceInput, TamilTts | ai.assistant |
| Digest | `/ai/digest` | ExceptionBriefing | ai.digest |
| Admin | `/admin/ai` 🔒 | provider/prompt/golden-set/cost dashboards, kill switches | admin/ai |

## N. Augmented legacy screens (same features + new capabilities bolted on)

| Legacy screen (route) | Augmentation |
|---|---|
| All document wizards (`/orders/new`, `/grn/new`, `/dc/*`, `/purchase/po/new`, bills, invoices, packing) | **AiDock** — fill-from photo/email/voice (09 §2); ParseReviewScreen opens bound to that form's DTO |
| Cutting production (`/cutting/production`) | QR label print (bundle/piece per TrackPolicy) + CUT_LAY/BUNDLE/PIECE unit creation (08 §5) |
| Scan stations (`/production/barcode`, `/m/scan`) | decode QR alongside 1D; offline HMAC validation; TrackEvent emission |
| GRN with rolls (`/grn/new`) | FAB_ROLL unit creation + genealogy edges from DC'd rolls |
| Packing list (`/commercial/packing-list`) | CARTON units + carton QR labels + despatch edge |
| Gate pass (`/dc/gate/pass`) | carton/piece QR scan-out closes loop to DESPATCH_DOC |
| Registers (`/reports/*`) | AI narrator (Tamil summary + top exceptions) on any register |
| Approvals (`/approvals/*`, `/m/approvals`) | AI triage card: deviation vs tolerance + recommendation (never auto-decides) |
| Order detail (`/orders/[io]`) | "Track order" link → river view |

## O. Coverage addendum (forms verified against the full 323-type inventory)

**Dashboard/MIS section** (module tree in 02 §2 — previously referenced only there):

| Form | Route | Composition | Service |
|---|---|---|---|
| frmMIS | `/dashboard` MisGrid | KpiRow, OrderPipelineTable, WbsRagBoard, MeetingCharts | ST_*/WBS reads |
| FrmMISSetting | `/mis/settings` | MisSettingPanel | per-user config |

**Remaining single-purpose forms** (each now explicitly mapped; previously only implied by family rows):

| Form | Route | Composition | Service | Notes |
|---|---|---|---|---|
| frmAccack | `/grn/acc` (ack tab) | AccAckPanel | `StockService.ack()` | accessories acknowledgement (acc mirror of GoDown/Unit ack) |
| frmAccSalesDel | `/dc/acc` (sales tab) | AccDcWizard | `DcService.acc()` | acc sales delivery |
| frmAccShort | `/planning/shortage/new?type=acc` | ToleranceBanner | `ShortageService.book()` | acc shortage entry |
| FrmDeliveryAtMas | `/masters/statutory` | MasterCrud | MastersService | deliver-to master (`DelAt` on invoices) |
| FrmExpenseEntryRegister | `/costing/expenses/register` | DataTable | register | expense entry register |
| FrmJobOrderList | `/cutting/job-order` (list view) | DataTable | `CuttingService.list()` | job-order list |
| FrmOrdBundIssToLineReg | `/production/registers` | DataTable | register | order-bundle issue-to-line register |
| FrmOrderDespatchCompletion | `/orders/[io]/close` (despatch tab) | DespatchClose | `OrderService.close()` | per-style despatch completion |
| FrmOrderwisePcsReg | `/pieces/stock` (register tab) | DataTable | register | order-wise pieces register |
| FrmPOEntryWithMultipleStyleNo | `/purchase/po/new?styles=multi` | PoWizard | `PoService.create()` | multi-style PO entry |
| FrmPreCostingCompMas | `/planning/budget/pre` (component master step) | PreCostPanel | masters | pre-costing component master (`precostingflg`) |
| frmPrintDesign | `/masters/knitting` (design print) | MasterCrud | masters | print-design master |
| frmProcessOrd | `/cutting/job-order` (process tab) | JobOrderForm | `CuttingService.jobOrder()` | process order entry |
| frmProdutionConfig | `/production/entry` (config dialog) | ConfigPanel | config | production config flags |
| FrmProdShiftWagesReg | `/payroll/registers/shift` | DataTable | register | SP_Vue_RptShiftWagesReg parity |
| FrmStatusReg | `/mis` (status register) | DataTable | register | generic status register |

**Coverage check (verified by diffing the assembly's 323 type names against this doc):** every operational form is now explicitly mapped — either as its own row above/in sections A–N, or as a named member of a family row (e.g. `FrmFabDel(_Return)`, `frmPurchaseOrd_MultiOrder(_HO)`, StockRegister variants). Non-screen types (`MDIJOMS`→layout, `FrmLoading/FrnSplash`→loading states, `My.MyApplication`→bootstrap) are structural. New requirement surfaces (tracking 08, AI 09) are additive sections L–N — no legacy mapping changed.
