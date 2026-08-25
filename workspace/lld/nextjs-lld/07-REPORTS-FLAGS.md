# 07 — REPORTS CATALOG & FEATURE-FLAG PORT MAP

## Part 1 — Report catalog (all ~330 legacy templates → one report engine)

Report families from `Report/` (495 files: 180 `.rpt`, 150 `.mrt`, wrappers) + `GReportConfig.dll` (2,212 classes). Each row = one print/runner definition in `reports/registry.ts` with: params, dataset query (legacy proc/view parity), layout (grid or document print with preprint overlay from `PrePrint/298`).

### 1.1 Document prints (transaction-attached, `/reports/viewer/*`)

| Family | Templates (variants) | Data source | Notes |
|---|---|---|---|
| Yarn DC | YarnDC (w/wo program, SGST, Cost, GoDown) | Vue_TrsDc + StockRatePost | preprint overlay |
| Fabric DC | FabDC (SGST, Cost, PrsRt, OrdWise, PackList, HalfPage, GoDown, Cost_Cut, Cost_Full) | Vue_TrsDc | packlist variants |
| Piece/Panel DC | PcsDc/PcsDc1 (SGST, Cost, Panel, Bit, Rework, Acc) | Trs_Pcs1/2 | |
| Acc/Gen/Courier DC | AccDC(_GoDown,_SGST,_Cost), GenDC, CourierDC | Vue_TrsDc | |
| Sales/DC-cum-Inv | Yarn/Fab SalesDC, SalesDCCumInv, DC_GST(_1) | Vue_SalesInvoice_DC | `saledccuminvreq` |
| DC returns | RPtAccDcRet, RPtFabDcRet | Trs_Del (4/6/13) | |
| GRN | YarnGRN, FabGRN(MultiPrs, PackList), AccGRN(PO), GenGRN, Woven_FabGRN, Rpt_GrnYarn/Fab/Acc, Rpt_WasteGRN | Trs_Grn1/2 | |
| Invoices | Rpt_SalesInvoice (GST, Pcs, OrdWise, WithoutTax), DomesticInvoice_GST/New, JobwrkInvoice, CommercialBill, CourierInv, PcsSalesInvoice | Vue_SalesInvoice* | GST split |
| Debit notes | DebitYarn/Fab/Acc(+GST), DirectDebitYarn(GST), RptDebitNotePcs(GST), DebitComm_GST | Trs_Deb1/2 | |
| POs | Rpt_PoYarn/PoFab/PoAcc (Cancel, Det, withimg, GEN, benso), Rpt_GENPo, PoLedger | Trs_Po* | |
| Order sheets | Rpt_OrderSheet (Clrwise, Set, Spare, Image, Amendment, Proformo), OrderSheetRegFab/Yarn | OrderMas set | |
| Packing/Despatch | RptPackList, Rpt_PackingList, PcsDespatch, PcsReceipt, PcsShipSample, PcsTransfer, READYTOCUT(+RETURN), RollPrint, RptTag_Print | Trs_Pcs/RTC | |
| Barcode labels | RptBarcodePrint_Pcs/FabRoll/AllBundle(_Panel), RptBundle_BarcodePrint, BarcodeLayReport, CuttingBarcodeReg | Pay_* | zxing SVG |
| Gate pass | GatePass templates | Trs gate | `gatepassflg` |

### 1.2 Registers & analytics (`/reports` runner)

| Family | Templates | Data source |
|---|---|---|
| Production/cutting | RptProduction, CuttingJobOrder(GST), CutBundleIss, PanelCuttingProduction, PanelRejection, LinePerformance, LineProdStmt, ShiftWagesReg, Cutting_Production | Trs_ProdEntry/Pay_* |
| Stock | RptClosingStock (Det, Mtr, Deptwise), Opening (Yarn/Fab/Acc), StockAdj, Inward, StkLedger | CurrentStock/3 ledgers |
| Budget/cost/rates | Rpt_Budget(Abs, AndActual), ProdCost, CostSheet, RateConfirm (Yarn/Fab/Piece/Acc), RptCosting, RptCostSheetInput | SP_Bud_and_Actual etc. |
| Commercial | OrderReg, PartyBalanceAbs, PO Ledger, TradeCommission, UnitAck, WorkFlow, Expenses, Bills registers, Payment registers | SP_BillsRegView_*, etc. |
| Compliance | Rpt_TDS, Rpt_InputGST, RptPartywiseBillGST(_Abstract), RptSalesRegYarn/Fab_GST, RptTallyPurAndExp, Form JJ list | Trs_Bills/HSN |
| MIS/meeting | MeetingChart*, SP_WBS_MeetingView sets | WBS/Meet_* |
| Buyer/order | BuyerPL, OrderStatus, OrderHistory, InHand sets | ST_Ord_inHand |
| OLD templates | `Report/OLD Report/*` (12) | retired; kept in catalog as hidden legacy formats |

Runner parity: multi-user staging via `jobId` (05 §7); Excel export (Interop.Excel parity); per-user default params (FrmMISSetting).

### 1.3 New report families — Tracking (08) & AI (09) telemetry

| Family | Templates | Data source |
|---|---|---|
| Tracking | Order Trace River (stage funnel + loss reconciliation), Genealogy export (CSV/PDF), Item Passport print, Carton Manifest (buyer/audit pack, external QR), Party-Dwell aging (units at job-workers), Trace Exceptions register | TraceProjector/Track* |
| QR labels | Roll/Bundle/Piece/Carton label templates (QrLabelSvg sizes, signed codes) | LabelService |
| AI ops | Parse accuracy & correction dashboard, cost/latency by skill, golden-set scorecard, assistant query log | AiActionLog/eval store |

## Part 2 — Feature-flag port map (all 189 flags, names unchanged)

`GET /api/config` → `FlagsProvider`. `s` = suggested enforcement point (parity with legacy behavior).

### 2.1 Tolerances & deviations

| Flag (default) | Effect | s |
|---|---|---|
| po_bud / po_buddev (10.00) / po_allowadd | PO qty vs budget ± %, allow-add | PoService |
| po_budrt / po_budrtdev / budrt_inhccw | PO rate vs budget rate; in-house C&C wait | PoService |
| grn_bal / grn_dev / grn_alladd | GRN qty vs PO/DC balance | GrnService |
| i_scheck / i_sdev | issue shortage check on DC | DcService |
| bill_bcheck / bill_bcheckdev | bill vs GRN/DC qty | BillingService |
| trankgs_dev | transfer kg deviation | DcService |
| cuttingdc_joborder / cutting_dcjoborder_deviation | cutting DC vs job order | CuttingService |
| dyeinggamtper / knittinggamtper | acceptable process loss % | Planning/Grn validation |
| entrydatedev / billdtchk_serverdt(+dev) | back-dating limits | all docs / bills |
| pcsrateamt_excess_percent / prodbillamtdivper / prodcutwgtallowedper / actpwgdivper | piece-rate/bill caps | Payroll/Billing |
| schcomppercen / schpcscomppercen / autocompperc | scheme completion % | Planning |
| shortage/boost: boostupper / reserveper | requirement boost-up & reserve | PlanningService (FN_Add_BoostupPer parity) |
| jobexcess / allow_excess_inbudget / shipmentexcessallow / exces_for_finalrollwtentry | excess caps | Order/Cutting/Despatch/Roll |

### 2.2 Document policy & numbering

| Flag | Effect | s |
|---|---|---|
| dc_fullpage | DC print layout | PrintLayout |
| salesinvhead / billrptformat / formatno | print headings/formats | PrintLayout |
| manual_dc_no_option_reqd | allow manual DC no | NumberingService |
| newdespatchno / sameordno / samepdcno / samebillnoallowedflg | numbering policies | NumberingService |
| ocngen (G) / ionogen / autocomp / autocompperc | OC/IO auto-generation | NumberingService |
| nlot / lot_seq / lotrunno / dyelotflg / dyeing_lotno_auto_generation / lot_dev_dc / lotexp / lotwise_rate / lotwisestockreqd / lot_approval | lot life-cycle policy | LotService |
| gendcdays (5) | non-return DC aging | notifications |
| newdespatchno | despatch numbering | NumberingService |
| preprintfolder (72/298) | preprint overlay set | PrintLayout |

### 2.3 Module switches

| Flag | Effect | s |
|---|---|---|
| prodentry (T) / prodnrejpostingflag / prdnrej… | production entry mode & rejection posting | ProductionService |
| costcalc / precostingflg / precost_acc_joms | costing calc toggles | CostingService |
| gatepassflg / gatepassopt | gate pass module | GateService |
| compprogentry(_sample) / accreqentry / prgentrycompulsory | program/acc entry gates | ProgramService |
| knitprgdc | knitting program DC (Trs_Del3) | DcService |
| direcrec / newdespatchno | direct receipt handling | GrnService |
| inhousetransfer / stock_maintain_reqd_for_inhousetransfer | unit transfer behavior | StockService |
| transfer_bal | transfer balance policy | Projectors |
| ismultipleprocessgrn_required | multi-process GRN | GrnService |
| rollno_module_reqd / all_transaction_basedon_rollno / rollnofrommc / roll_grn_excess | roll module | RollService |
| stagewisepcsstock_and_transactionreqd | stage-wise pcs stock mode | PostingEngine |
| wbsrequired / wbsplanningmust | WBS module & mandatory plan | WbsService |
| scheduleflg / scheacteditallow / scheplaneditflg / schetargetdays | schedule editing | WbsService |
| bud_app / prodbudappreqd_sample / po_approval_reqd / shortage_approval / cutackreqd | approvals (incl. shortage & cutting-ack gates) | ApprovalService/CuttingService |
| approvalsflg / commando_approval_link | approval inbox + mobile link | ApprovalService |
| gstenable | GST fields | GstPanel |
| saledccuminvreq / convinvreq / saledcagainstpgmbalchk | invoice/DC policies | InvoiceService |
| jobordertype / cuttingdc_joborder | job order mode | CuttingService |
| doublebillpassreqd | bill pass rule | BillingService |
| notds | TDS off | BillingService |
| formjjreq | Form JJ register | Payroll compliance |
| tdstallyname | Tally party mapping | TallyService |
| ordtransfer_concernwise / ordersheetpostingflg | order transfer/posting | OrderService |
| produnit_reqd_in_ordersheet / image_compulsory_in_ordersheet / samplerefno_reqd_in_ordersheet / cp_colorentry_reqd_from_program / cp_planstdate / cp_prodn_plan_partwise | order-sheet field policies | OrderSheetWizard |
| stylewisebillrate / ordergroupingreqd / trsallowstylewise / orderalloweddays / orderqty | order-level policies | OrderService |
| accreqwithexordqty / acc_item_approval_reqd_for_accissue / personprocess / firmprocess / allservice | accessory flow | AccService |
| different_processuom_reqd_in_fabmaster / fabtoyarn_count_hide_in_requirement / partsinuom | UOM displays | masters/planning |
| pcsformdetails_required_in_mis_dashboard / splreports_reqd / budactfieldsflag / budandactseprtaxreqd / budrt_cmt_sizewise / budget_overhead_percent / prog_reqmt_compt_wise / reqd_actual_production_wage_arrived_with_payrolllink / prodbillamtdivper | costing/MIS options | Costing/MIS |
| reqdqty_auto_fill_reqd_in_po / budrate_auto_fill(_in_po) / po_reqordersheet / suppordsheetexs / suppord_salesflg | PO helpers | PoWizard |
| lotwise_rate_deldate_reqd_in_ordersheet / need_rate_conf_for_dc / rateconfirmcheck(+dev) / lotwise_rate | rate gates | DcService |
| exces_for_finalrollwtentry / chkpointcomp / desentry / ll_edit_reqd / grnknitdiaedit / ioautogen / ismultipleprocessgrn_required | entry helpers | forms |
| jobexcess / autocompperc / joborderstagewise | job-order options | CuttingService |
| mobileno / mail / poautomailreqd / inoutautomail / smtpserverpassword | mail/SMS | NotificationService |
| sundayentryto / weekoff / wwstdt / perid / sdelay / speed / day1effy / day2effy / day3onwards / initial_style_setupmins / stitching_deptcode / boostupper | production calendar & effy | LineService/Planning |
| autolock / password (obfuscated) / globalcompanyid / dbname | session/company config | AuthService/ConfigService |
| natureofwrk_tamil | Tamil work-nature print | PrintLayout |
| imgpath / attachpath | file storage paths | AttachmentPanel |
| btnmenu / popup_default_selection / allgpayempreqd | UI behavior toggles | shell/masters |
| currentstockpostingflag / ordersheetpostingflg / prdnrejpostingflag / transfer_bal | posting side-effects | PostingEngine/Projectors |
| sampleqtylimitcheck / orderqty / ionogen / ioautogen | sample & order qty caps, IO auto-numbering | OrderService/NumberingService |
| desentry / dyeprgcolor / allowdec | design entry toggle, dyeing program color, decimal places | ProgramWizard/LineGrid |
| shippingexpenses / commercialinvexcamtper / salesinvhead | commercial invoice options | InvoiceService |
| invselreqindespent | invoice selection required in despatch | DespatchService |

*(Every one of the 189 names in `Fiberpro_Lib.dll` appears above or is covered by its grouped row; the registry `flags.ts` enumerates all with types + defaults read from the legacy store.)*

### 2.4 Flag enforcement pattern

```tsx
<FlagGate flag="gatepassflg"><GatePassNav/></FlagGate>
{flags.need_rate_conf_for_dc && <RateConfirmBadge orderId/>}   // + server-side block in DcService
<ToleranceBanner flag="po_buddev" value={deviationPct}/>        // warn/block per po_bud
```
Server-side enforcement is authoritative; UI only mirrors it (03 §6).

## Part 3 — NEW flags for the added requirements (08 QR tracking, 09 AI harness)

These are **additions**, not legacy ports; every master switch defaults OFF so existing behavior is unchanged until a customer opts in (child flags like `qr_bundle_labels (Y when module on)` and `qr_offline_window_hrs (12)` inherit the master's OFF state).

### 3.1 Tracking flags

| Flag (default) | Effect |
|---|---|
| `qr_track_enabled` (N) | master switch for the tracking fabric (labels, events, river) |
| `qr_roll_labels` (N) | FAB_ROLL QR labels on GRN (auto-on when `all_transaction_basedon_rollno`='Y') |
| `qr_bundle_labels` (Y when module on) | bundle QR at cutting (replaces 1D print format, same data) |
| `qr_piece_labels` (BY_PART_STAGE) | per-piece QR — policy matrix (body piece-level, trims bundle-level) |
| `qr_carton_labels` (N) | carton QR at packing + gate scan-out |
| `qr_yarn_bag` (N) | bag-level units on purchase GRN |
| `qr_external_format` (N) | GS1-Digital-Link external codes (buyer/DPP packs) vs internal compact only |
| `qr_offline_window_hrs` (12) | offline scan validation cache window |
| `qr_genealogy_strict` (N) | block postings on quantity-law violation instead of warn |

### 3.2 AI flags

| Flag (default) | Effect |
|---|---|
| `ai_enabled` (N) | master switch (kill switch; capture-only mode when provider down) |
| `ai_lang` ('ta') | UI/voice language: ta/en/tanglish |
| `ai_po_parse` / `ai_grn_parse` / `ai_bill_parse` / `ai_acc_parse` (N) | per-skill parse toggles |
| `ai_ratecnf_parse` / `ai_invoice_draft` / `ai_debit_assist` (N) | commercial skills |
| `ai_assistant` (N) | chat/voice assistant + AiDock |
| `ai_voice_entry` (N) | voice drafting (STT: Indic-tuned models, numeric confirm loop) |
| `ai_digest` (N) | daily Tamil exception briefing |
| `ai_narrator` (N) | register narration + meeting-pack brief |
| `ai_triage_approvals` (N) | approval recommendation cards |
| `ai_autoconfirm` (N — locked OFF unless tenant opts in) | only non-financial, single-line, ≥0.98-confidence drafts |
| `ai_onprem_endpoint` ('') | route all inference on-prem (vLLM); empty = cloud |
| `ai_retention_days` (90) | source image/doc retention |
