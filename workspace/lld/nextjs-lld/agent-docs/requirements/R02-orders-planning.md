# R02 - Orders & Planning (order intake, in-hand, registers/history/status/track, program, requirement explosion, shortage, WBS/T&A, allotments, templates)

Level-2 module requirements. Source docs: 02-COMPONENT-TREE.md (sec 3, 4), 04-API-SERVICES.md (sec 2, 3), 03-DOMAIN-POSTING-ENGINE.md (sec 5, 8, plus sec 4 rows touching program balances), 06-SCREEN-MAP.md (sec D, E, O), 07-REPORTS-FLAGS.md (Part 2), 01-ARCHITECTURE.md.

## 1. Purpose & business context

In this Tirupur knitwear export house the internal order (IO) is the anchor every loop hangs from: the exporter owns the order, the yarn, and the fabric, and moves work through outside job-work units plus its own floors. Capturing the buyer PO exactly (styles, color/size grids, sanctioned excess, forward-booked FCY rates), exploding it into loss-grossed yarn/knitting/accessory requirements, and tracking it on a T&A calendar (WBS with RAG) is what lets the firm promise shipment dates and chase hundreds of job-work parties. This module ports the legacy order-sheet family and the planning/program family with byte-for-byte requirement math (SP_FabReqCalc parity), because every kilo bought, issued, and billed downstream keys off these numbers.

## 2. Scope

- Order intake: export order sheet, domestic variant, trading order sheet, with-amend and amendment flows, enquiry, sample orders (06 sec D: FrmOrderSheetNew, FrmOrderSheetNew_Domestic, FrmOrderSheetNew_WithAmend, FrmOrderSheetAmendment, FrmTradingOrderSheet, FrmOrderEnquiry, frmOrderSample, FrmSampleEntry_WithEnquiry).
- Order-sheet print preview (Frm_Ordersheet_Preview), order inputs incl. Excel import (FrmOrderInputMas, FrmOrderRelatedInput_Excel, FrmOtherPORelatedIps, FrmOptionUpdate), order references/grouping (FrmOrderRef, frmOrderGroup).
- Order close (FrmOrderClose) incl. per-style despatch completion (FrmOrderDespatchCompletion), style-change utility (SP_StyleChange UI), display-days setting (FrmOrderDisplayDaysSetting).
- Order in-hand, registers, history, status, track (FrmOrderRegister(_Spl), frmordwiseregregister, SP_Vue_OrderinHand* views, FrmIoHistoryReg(_New), frmOrdStat, FrmBuyerStatus, FrmOrdProdTrack, FrmTradingOrdersInHandReg).
- Planning & program: program wizard family (frmProgNew/_Actual, frmProgEntry, frmProgEntry_YarnCons, FrmPrg_GSM_LL_EditEntry, FrmPrg_KnittingPartyInclusion, FrmProg_Acc), program complete/cancel (FrmProgramComplete, frmProgCancel(_Compwise), FrmAcc_ProgCancel), program balance card.
- Requirement explosion (SP_FabReqCalc_* parity) with yarn/knit/partwise/combo tables, reqd-vs-finish (Vue_Reqd_Vs_Finish), shortage (frmShortage(_Compwise), frmAccShort, FrmShortageBitEntry), sewing req (FrmSewingReq), combo-wise req report (frmComboWiseReqRpt).
- Budgets: pre-budget production plan (frmPreBudgetProdPlan(_New), FrmPreCostingCompMas), jobwork budget (frmBudgetNew_JobWork, frmBudget, frmBudcom), budget-vs-actual compare (FrmBudgetAndActualComp).
- Allotments: contract (frmContractAllotment(_New)) and fabric (frmFabricAllotment).
- WBS/T&A: plan/actual dates with RAG, date-wise and supplier boards, plan-date calculation (WF_PlanFinishDateArrival).
- Templates & workflow: route template (FrmProRouteTemplate), commercial template (Frm_CommercialTemplate), process bypass (FrmProcessByPassSetting + Frm_SubProcess), workflow document store (Frm_WF_DocumentStore).
- Out of scope (owned by other modules): FrmDiaChange/FrmFinalDiaUpdation (routes to /grn/dia/*), FrmHourlySetting1/frmHours (routes to /production/hourly), PO/budget approvals inbox (approvals module), costing input/daily P&L (costing module).

## 3. Functional requirements

| FR ID | Requirement | Source (form/proc/flag) | Priority | Stage |
|---|---|---|---|---|
| ORD-001 | The order register at /orders shall list orders with filters buyer/merch/exp/season/style/IO using SP_Rpt_OrderRegColor semantics. | 06 sec D (FrmOrderRegister(_Spl), frmordwiseregregister); 02 sec 3; 04 sec 2 | P0 | S2 |
| ORD-002 | The order in-hand page shall render the SP_Vue_OrderinHand* family with a variant toggle all / salerate / stylewise. | 02 sec 3; 04 sec 2 (OrderService.inHand) | P0 | S2 |
| ORD-003 | The new-order wizard at /orders/new shall capture the export order sheet (FrmOrderSheetNew parity) writing OrderMas/2 + StyleDtl + QtyDtl via POST /api/orders. | 06 sec D; 04 sec 2 | P0 | S2 |
| ORD-004 | The HeaderPanel shall capture buyer PO, IO no, dates, FCY, and forward rate (Crate/FwdCtRate). | 02 sec 3 | P0 | S2 |
| ORD-005 | The StyleLines step shall support the EntryOption 1|2 switch: plain color/size grid (OrderQtyDtl) vs color-combo grid (OrdQtyClrDtl keyed CmbClrID). | 02 sec 3; 03 sec 1 (EntryOption) | P0 | S2 |
| ORD-006 | The RatePanel shall capture rates at RateFor granularity S/C/Z/R (style | color | color+size | style-plain). | 02 sec 3; 03 sec 1 | P0 | S2 |
| ORD-007 | The ExcessPanel shall compute CutPlanQty = OrderQty + Exs_Per% (sanctioned excess). | 02 sec 3; 03 sec 8 | P0 | S2 |
| ORD-008 | The order sheet shall enforce the field-policy flags orderalloweddays, samplerefno_reqd_in_ordersheet, image_compulsory_in_ordersheet, and produnit_reqd_in_ordersheet. | 02 sec 3; 07 sec 2.3 | P0 | S2 |
| ORD-009 | The order sheet shall render the Frm_Ordersheet_Preview print (preprint overlays) before saving/printing. | 06 sec D (Frm_Ordersheet_Preview) | P1 | S2 |
| ORD-010 | The wizard shall support the domestic mode (FrmOrderSheetNew_Domestic parity) with domestic taxes. | 06 sec D; 02 sec 3 | P0 | S2 |
| ORD-011 | The trading order sheet (FrmTradingOrderSheet parity) shall be supported as a distinct order flow via POST /api/orders with type trading. | 06 sec D; 04 sec 2 | P1 | S3 |
| ORD-012 | The trading orders in-hand register (FrmTradingOrdersInHandReg parity) shall be provided at /orders/trading-register. | 02 sec 3; 06 sec D | P1 | S3 |
| ORD-013 | The amendment flow at /orders/[io]/amend shall save amendments as _Amend audit copies (OrderQtyDtl_Amend) preserving originals, rendered on AmendmentTimeline. | 02 sec 3; 06 sec D (FrmOrderSheetAmendment, OrderQtyDtl_Amend) | P0 | S3 |
| ORD-014 | The with-amend new-order mode (FrmOrderSheetNew_WithAmend parity) shall create orders against an existing amendment context. | 02 sec 3; 06 sec D | P1 | S3 |
| ORD-015 | The order close screen (FrmOrderClose parity) shall record order completion via POST /api/orders/:io/close. | 06 sec D; 04 sec 2 | P0 | S3 |
| ORD-016 | The close screen shall include the despatch-completion tab (FrmOrderDespatchCompletion parity) recording per-style despatch completion (Completed/Despatch_Completed). | 06 sec D + sec O; 02 sec 3 (StyleWise_Despatch_Completion) | P0 | S3 |
| ORD-017 | The style-change utility at /orders/utilities/style-change (rights-gated) shall execute the SP_StyleChange ~140-table rename inside one transaction and write Trs_StyleChangeLog. | 02 sec 3; 06 sec D; 04 sec 2 | P1 | S3 |
| ORD-018 | The enquiry screen (FrmOrderEnquiry parity) shall capture pre-IO buyer enquiries via POST /api/orders/enquiry. | 06 sec D; 04 sec 2 | P1 | S2 |
| ORD-019 | The sample-order screens (frmOrderSample + FrmSampleEntry_WithEnquiry parity) shall create sample orders via POST /api/orders/sample with the sampleqtylimitcheck guard. | 06 sec D; 04 sec 2; 07 sec 2.3 | P1 | S2 |
| ORD-020 | The order-input screens (FrmOrderInputMas, FrmOtherPORelatedIps, FrmOptionUpdate parity) shall capture order-related inputs at /orders/input. | 02 sec 3; 06 sec D | P1 | S3 |
| ORD-021 | The Excel import (FrmOrderRelatedInput_Excel parity) shall bulk-load order inputs via POST /api/orders/:io/excel-input. | 02 sec 3; 06 sec D; 04 sec 2 | P1 | S3 |
| ORD-022 | The order-reference screens (FrmOrderRef, frmOrderGroup parity) shall maintain order references and grouping under flag ordergroupingreqd. | 02 sec 3; 06 sec C/ D | P1 | S2 |
| ORD-023 | The order detail page /orders/[io] shall show OrderHeaderCard, StyleTabs, and QtyMatrixTable for the IO. | 02 sec 3 | P0 | S2 |
| ORD-024 | The order ledger shall return SP_OrderHistoryLedger parity via GET /api/orders/:io/ledger, staged by jobId (TempIoHisLedger parity). | 02 sec 3; 04 sec 2 | P1 | S3 |
| ORD-025 | The IO history register (FrmIoHistoryReg(_New) parity) shall be provided at /orders/utilities/io-history. | 02 sec 3; 06 sec D | P1 | S3 |
| ORD-026 | The order StatusCard shall render frmOrdStat / FrmBuyerStatus parity data via GET /api/orders/:io/status (SP_OrderStatus pipeline kgs per IO). | 02 sec 3; 04 sec 2 | P0 | S3 |
| ORD-027 | The OrdProdTrack panel shall render production tracking (FrmOrdProdTrack parity) via GET /api/orders/:io/track. | 02 sec 3; 06 sec D; 04 sec 2 | P1 | S3 |
| ORD-028 | The display-days setting (FrmOrderDisplayDaysSetting parity) shall configure order display aging. | 02 sec 3; 06 sec D | P2 | S3 |
| ORD-029 | IO and OC numbers shall be allocated by NumberingService honoring ionogen, ioautogen, and ocngen. | 03 sec 7; 07 sec 2.3 | P0 | S2 |
| ORD-030 | Order-level policies shall be honored verbatim: stylewisebillrate, ordergroupingreqd, trsallowstylewise, orderalloweddays, orderqty, ordtransfer_concernwise, ordersheetpostingflg. | 07 sec 2.3 | P0 | S2 |
| ORD-031 | The mobile orders screens (/m/orders) shall list orders and show detail with status, WBS RAG, and a track link. | 02 sec 20; 06 sec K | P1 | S3 |
| PLN-001 | The program wizard at /planning/program/new shall capture a new program (frmProgNew + frmProgNew_Actual + frmProgEntry parity) via POST /api/planning/program, seeding Pro_ReqYarn/Pro_ReqKnitt. | 06 sec E; 04 sec 3 | P0 | S3 |
| PLN-002 | The RoutePanel shall capture the OrdSeq dept route and the Prod_Sequence stage route via their pickers. | 02 sec 4 | P0 | S3 |
| PLN-003 | The YarnConsPanel shall capture yarn consumption per count/color into Prog_Cns (pcswgt/Actpcswgt; frmProgEntry_YarnCons parity). | 02 sec 4; 06 sec E | P0 | S3 |
| PLN-004 | The FabricSpecPanel shall capture GSM/GG/LL/Dia/FinDia fabric spec into Prog_ClrComb, honoring the Yd flag and LooseFab. | 02 sec 4 | P0 | S3 |
| PLN-005 | The AccReqPanel (FrmProg_Acc parity) shall capture accessory requirement into PRO_AccReq with SewFlg. | 02 sec 4; 06 sec E | P0 | S3 |
| PLN-006 | The GsmLlEdit step (FrmPrg_GSM_LL_EditEntry parity) shall edit GSM/LL under flags ll_edit_reqd and desentry. | 02 sec 4; 06 sec E; 07 sec 2.3 | P1 | S3 |
| PLN-007 | The knitting party inclusion step (FrmPrg_KnittingPartyInclusion parity) shall be available under flag knitprgdc. | 02 sec 4; 06 sec E; 07 sec 2.3 | P1 | S3 |
| PLN-008 | The LossPanel shall capture process loss per process (Prog_Prsloss) and shade-wise color loss (Prog_Clrloss). | 02 sec 4 | P0 | S3 |
| PLN-009 | The program card at /planning/program/[id] shall show requirement lines and balances from ST_ProgBalance_* (Req/PO/DC/GRN/Short/Ret/Reproc/Trans). | 02 sec 4; 03 sec 5 | P0 | S3 |
| PLN-010 | The program complete screen (FrmProgramComplete parity) shall record Prog_CompKgs via the program complete endpoint. | 06 sec E; 04 sec 3 | P0 | S3 |
| PLN-011 | The program cancel screens (frmProgCancel/_Compwise, FrmAcc_ProgCancel parity) shall cancel programs and acc programs via the program cancel endpoint. | 06 sec E; 04 sec 3 | P0 | S3 |
| PLN-012 | The requirement explosion endpoint POST /api/planning/requirement/calc shall compute SP_FabReqCalc_* parity: ReqPcs = CutPlanQty (+PExc%); ReqKgs = ReqPcs x Actpcswgt/1000 x Parts. | 03 sec 8; 04 sec 3 | P0 | S3 |
| PLN-013 | The explosion shall walk OrdSeq backwards grossing up loss: ReqKgs = ReqKgs/(100 - Loss_Per) x 100, using Prog_Prsloss per process and Prog_Clrloss shade-wise, with FABTOYARN/DYEING/YARNDYEING knobs. | 03 sec 8 | P0 | S3 |
| PLN-014 | The explosion shall output Pro_ReqYarn (type Y), Pro_ReqKnitt (by fab fingerprint), and Pro_ReqJob (job orders). | 03 sec 8 | P0 | S3 |
| PLN-015 | The explosion shall stage results as jobId rows with Prog_ReqCalTWrk parity (no IP key), retrievable via GET /api/planning/requirement/:jobId. | 03 sec 8; 04 sec 3; 01 sec 3.5 | P0 | S3 |
| PLN-016 | The requirement page shall render ReqYarnTable (Pro_ReqYarn by count/color) and ReqKnitTable (Pro_ReqKnitt by fab fingerprint). | 02 sec 4 | P0 | S3 |
| PLN-017 | The PartwiseAccTable shall render SP_PartwiseRequirement parity (PRO_AccReq) applying boost-up per FN_Add_BoostupPer under flag boostupper. | 02 sec 4; 03 sec 6 | P0 | S3 |
| PLN-018 | The requirement engine shall apply reserveper alongside boostupper for requirement boost-up and reserve. | 03 sec 6; 07 sec 2.1 | P0 | S3 |
| PLN-019 | The combo-wise requirement variants (SP_FabReqCalc_*_ComboWise parity) shall be supported under flag cp_colorentry_reqd_from_program. | 02 sec 4; 03 sec 8 note; 07 sec 2.3 | P1 | S3 |
| PLN-020 | The reqd-vs-finish page shall render Vue_Reqd_Vs_Finish parity (dept-wise requirement vs achieved) via GET /api/planning/reqd-vs-finish?ordId. | 02 sec 4; 04 sec 3 | P0 | S3 |
| PLN-021 | The shortage screen (frmShortage/_Compwise parity) shall book shortages into Trs_shortage via POST /api/planning/shortage, with ToleranceBanner and approval routing under flag shortage_approval. | 02 sec 4; 06 sec E; 07 sec 2.3 | P0 | S3 |
| PLN-022 | The shortage bit entry (FrmShortageBitEntry parity) shall record bit-level shortage via the shortage bit endpoint. | 02 sec 4; 04 sec 3 | P1 | S3 |
| PLN-023 | The acc shortage entry (frmAccShort parity) shall book accessory shortage at /planning/shortage/new?type=acc through the same ShortageService. | 06 sec O; 04 sec 3 | P1 | S3 |
| PLN-024 | The sewing requirement screen (FrmSewingReq parity) shall render sewing requirements at /planning/sewing-req. | 02 sec 4; 06 sec E | P1 | S3 |
| PLN-025 | The combo-wise requirement report (frmComboWiseReqRpt parity) shall render at /planning/combo-req. | 02 sec 4; 06 sec E | P1 | S3 |
| PLN-026 | The pre-budget production plan (frmPreBudgetProdPlan(_New) parity) shall capture pre-budget plans at /planning/budget/pre. | 02 sec 4; 06 sec E | P1 | S3 |
| PLN-027 | The pre-costing component master step (FrmPreCostingCompMas parity) shall maintain pre-costing components under flag precostingflg. | 06 sec O; 07 sec 2.3 | P1 | S3 |
| PLN-028 | The jobwork budget screens (frmBudgetNew_JobWork, frmBudget, frmBudcom parity) shall capture jobwork budgets at /planning/budget/jobwork. | 02 sec 4; 06 sec E | P1 | S3 |
| PLN-029 | The budget-vs-actual compare (FrmBudgetAndActualComp parity) shall render at /costing/budget-vs-actual from the SP_Bud_and_Actual jobId pipeline. | 06 sec E; 04 sec 10 | P1 | S5 |
| PLN-030 | The contract allotment screen (frmContractAllotment(_New) parity) shall write Trs_ContractorAllotment via POST /api/planning/allotment/contract. | 02 sec 4; 06 sec E; 04 sec 3 | P0 | S3 |
| PLN-031 | The fabric allotment screen (frmFabricAllotment parity) shall be provided at /planning/allotment/fabric via POST /api/planning/allotment/fabric. | 02 sec 4; 06 sec E; 04 sec 3 | P1 | S3 |
| PLN-032 | The route template editor (FrmProRouteTemplate parity) shall maintain per-order process route templates at /planning/templates/route. | 02 sec 4; 06 sec E | P1 | S3 |
| PLN-033 | The commercial template editor (Frm_CommercialTemplate parity) shall maintain commercial templates at /planning/templates/commercial. | 02 sec 4; 06 sec E | P2 | S3 |
| PLN-034 | The process bypass setting (FrmProcessByPassSetting + Frm_SubProcess parity) shall let a stage skip via SubPrsId bypass at /planning/templates/process-bypass. | 02 sec 4; 06 sec E | P1 | S3 |
| PLN-035 | The workflow document store (Frm_WF_DocumentStore parity) shall manage stored workflow documents at /planning/workflow-store. | 02 sec 4; 06 sec E | P2 | S3 |
| PLN-036 | The program/acc entry gates compprogentry, compprogentry_sample, accreqentry, and prgentrycompulsory shall be enforced in ProgramService. | 07 sec 2.3 | P0 | S3 |
| PLN-037 | The actual consumption endpoint GET /api/planning/cons/actual shall return SP_ConsQuery1/2 family parity per variant. | 04 sec 3; 01 sec 4 | P1 | S4 |
| PLN-038 | The meeting pack endpoint GET /api/planning/meeting?ordId shall return Meet_Accessories/MeetAccDetails/MeetingChartAllDept/SP_WBS_MeetingView data. | 04 sec 3; 01 sec 4 | P1 | S6 |
| PLN-039 | Requirement display toggles shall be honored verbatim: prog_reqmt_compt_wise (component-wise requirement) and fabtoyarn_count_hide_in_requirement. | 07 sec 2.3 | P1 | S3 |
| PLN-040 | The dyeing program color entry shall honor flag dyeprgcolor and the program wizard decimal handling shall honor allowdec. | 07 sec 2.3 | P1 | S3 |
| WBS-001 | The WBS page at /planning/wbs shall render the T&A calendar with WbsGanttTable showing plan/actual per stage and RAG from Sp_WBS_Production. | 02 sec 4; 04 sec 3 | P0 | S6 |
| WBS-002 | The WbsDateWise view shall render Sp_WBS_Production_DateWise parity including lines. | 02 sec 4; 03 sec 5 | P0 | S6 |
| WBS-003 | The WbsSuppBoard shall render Sp_WBS_Supp_Production parity (supplier production board). | 02 sec 4; 03 sec 5 | P1 | S6 |
| WBS-004 | The plan-date calculator shall reproduce WF_PlanFinishDateArrival parity (skipping weekoff and holidays) via GET /api/planning/plan-date?date&days&dir. | 02 sec 4; 04 sec 3; 06 sec C (Frm_Mas_Holiday) | P0 | S6 |
| WBS-005 | WBS editing shall honor the schedule flags scheduleflg, scheacteditallow, scheplaneditflg, and schetargetdays. | 02 sec 4; 07 sec 2.3 | P0 | S6 |
| WBS-006 | The WBS module shall be gated by wbsrequired, and planning shall be mandatory when wbsplanningmust is set. | 06 sec E; 07 sec 2.3 | P0 | S6 |
| WBS-007 | WBS rows shall be maintained via POST /api/planning/wbs and read via GET /api/planning/wbs?ordId (WbsService.upsert/get parity). | 04 sec 3 | P0 | S6 |
| WBS-008 | The WbsProjector shall maintain WBS_* rows and Finish_Percent(_4Exs) with RAG update, reproducing Sp_WBS_Production(_DateWise/_Supp) semantics. | 03 sec 5 | P0 | S6 |
| WBS-009 | WBS RAG shall surface on the dashboard WbsRagBoard, the mobile order detail, and the meeting charts (MeetingChartAllDept/MeetingReportChart under wbsrequired). | 02 sec 2, sec 4, sec 20 | P1 | S6 |
| WBS-010 | Completion caps schcomppercen, schpcscomppercen, and autocompperc shall be enforced as scheme completion % limits in planning. | 07 sec 2.1; 03 sec 6 | P0 | S3 |

FR counts: ORD 31, PLN 39, WBS 10 (80 total).

## 4. Business rules & validations

- BR-01: CutPlanQty = OrderQty + Exs_Per% (sanctioned excess); downstream requirement starts from CutPlanQty, not raw OrderQty (03 sec 8).
- BR-02: EntryOption 1 captures the plain color/size grid (OrderQtyDtl); EntryOption 2 captures the color-combo grid (OrdQtyClrDtl keyed CmbClrID); the switch is per order sheet (03 sec 1; 02 sec 3).
- BR-03: RateFor granularity S|C|Z|R (style | color | color+size | style-plain) governs where rates attach (03 sec 1).
- BR-04: sample orders are capped by sampleqtylimitcheck; the sample entry with enquiry (FrmSampleEntry_WithEnquiry) links the sample to its enquiry (06 sec D).
- BR-05: amendments never overwrite originals - OrderQtyDtl_Amend audit copies are inserted and rendered on AmendmentTimeline (02 sec 3).
- BR-06: order-sheet field policy is enforced verbatim: orderalloweddays (aging), samplerefno_reqd_in_ordersheet, image_compulsory_in_ordersheet, produnit_reqd_in_ordersheet (07 sec 2.3).
- BR-07: style change executes the ~140-table rename in ONE transaction and logs to Trs_StyleChangeLog; the screen is rights-gated (02 sec 3; 01 sec 3.7).
- BR-08: IO/OC numbering honors ionogen, ioautogen, ocngen via NumberingService (03 sec 7; 07 sec 2.3).
- BR-09: requirement math is fixed: ReqPcs = CutPlanQty (+PExc%); ReqKgs = ReqPcs x Actpcswgt/1000 x Parts; OrdSeq walked backwards with ReqKgs = ReqKgs/(100 - Loss_Per) x 100 using Prog_Prsloss (process) and Prog_Clrloss (shade), with FABTOYARN/DYEING/YARNDYEING knobs (03 sec 8).
- BR-10: explosion outputs are Pro_ReqYarn (type Y), Pro_ReqKnitt (fab fingerprint), Pro_ReqJob (job orders); staging is Prog_ReqCalTWrk parity via jobId rows, no IP key (03 sec 8).
- BR-11: boostupper and reserveper apply boost-up/reserve through FN_Add_BoostupPer parity on requirement and partwise accessory requirement (03 sec 6; 07 sec 2.1).
- BR-12: shortage bookings route to approval when shortage_approval is set before they take effect (07 sec 2.3; 02 sec 4).
- BR-13: program entry gates: compprogentry, compprogentry_sample, accreqentry, prgentrycompulsory - program and acc entry blocked/allowed per flag in ProgramService (07 sec 2.3).
- BR-14: GSM/LL edit requires ll_edit_reqd; design entry follows desentry; dyeing program color follows dyeprgcolor; decimals follow allowdec (07 sec 2.3).
- BR-15: knitprgdc enables the knitting program DC (Trs_Del3 pre-issue legs) and the knitting party inclusion step (07 sec 2.3).
- BR-16: program yarn balance is ReqBalanceKgs = Req - (Grn + TransIn - delRet - TransOut) maintained by ProgBalanceYarnProjector (TRG_YARN_BALANCE trigger parity), with Trs_Del3.Prog kgs included in DcKgs and reprocess held in separate buckets (03 sec 5).
- BR-17: plan-date math (WF_PlanFinishDateArrival) skips weekoff and Frm_Mas_Holiday holidays; direction and day count come from the request (02 sec 4; 06 sec C).
- BR-18: schedule editing is governed by scheduleflg (module), scheplaneditflg (plan dates), scheacteditallow (actual dates), schetargetdays (target days) (07 sec 2.3).
- BR-19: WBS is enabled by wbsrequired and planning is mandatory when wbsplanningmust is set (06 sec E; 07 sec 2.3).
- BR-20: completion % caps schcomppercen, schpcscomppercen, autocompperc limit scheme/auto completion (03 sec 6; 07 sec 2.1).
- BR-21: acceptable process loss % for planning/GRN validation uses dyeinggamtper and knittinggamtper (03 sec 6).
- BR-22: order grouping applies only under ordergroupingreqd (frmOrderGroup) (06 sec C/ D; 07 sec 2.3).
- BR-23: combo color entry from program is required under cp_colorentry_reqd_from_program (07 sec 2.3).
- BR-24: order-level policies stylewisebillrate, trsallowstylewise, orderqty, ordtransfer_concernwise (concern-wise order transfer), and ordersheetpostingflg (posting side-effect) are honored verbatim (07 sec 2.3; 03 sec 5 note).
- BR-25: requirement display hides fab-to-yarn counts under fabtoyarn_count_hide_in_requirement and shows component-wise requirement under prog_reqmt_compt_wise (07 sec 2.3).
- BR-26: order close records both order completion and per-style despatch completion (FrmOrderClose + FrmOrderDespatchCompletion; Completed/Despatch_Completed) (06 sec D/ O).
- BR-27: budget approvals for production/sample budgets follow bud_app and prodbudappreqd_sample (approval routing owned by the approvals module) (07 sec 2.3).

## 5. Data & postings

Tables written/read:
- Orders: OrderMas/OrderMas2, OrderStyleDtl, OrderQtyDtl, OrdQtyClrDtl, _Amend audit copies, Order_PartDtl (parts per order), Trs_StyleChangeLog, order-group tables.
- Planning: Pro_ReqYarn, Pro_ReqKnitt, Pro_ReqJob, Prog_Cns, Prog_ClrComb, Prog_Prsloss, Prog_Clrloss, PRO_AccReq, Prog_CompKgs, Trs_shortage, Trs_ContractorAllotment, Prog_ReqCalTWrk (staging parity -> jobId), route/commercial templates, SubPrsId bypass config.
- Projector tables: ST_Ord_inHand, ST_ProgBalance_Yarn, ST_ProgBalance_Fabric, WBS_* (Finish_Percent_4Exs), ST_Production_Data (OrderQty/OrderWithExsQty).
- Staging: TempIoHisLedger / Temp_BudgetAndActual -> ReportJob jobId rows.

Posting matrix rows from 03 sec 4 that apply:
- Order->order transfer out/in: Del, TrType 3/8 (TranOrdID/TranID) - source order '-', target order '+', projector TransOutKgs / TransInKgs on each program (gated by ordtransfer_concernwise).
- Knitting pre-program issue: Trs_Del3 lines (Prog kgs) - no stock movement; ST_ProgBalance_Yarn.DcKgs '+' (Trs_Del3.Prog) (gated by knitprgdc).
- Sales DC piece despatch: drives the ST_Ord_inHand 'DES' posting (OrdInHandProjector 'OR','DES','DEL').
- ST_Production_Data: OrderQty/OrderWithExsQty zeroed only on DC '-' (order qty feeds the production projector).
- Reprocess DC: ReProcessDCKgs/Mtr '+' in a fresh bucket on program balance (separate from normal balance).

Projector events: ProgBalanceYarnProjector (TRG_YARN_BALANCE_* parity), ProgBalanceFabricProjector (TRG_FAB_BALANCE_* parity incl. RTC equalize), OrdInHandProjector (Sp_MR_OrdInHand), WbsProjector (Sp_WBS_Production(_DateWise/_Supp) + RAG update), ProductionDataProjector.

## 6. UI & routes

| Route | Components | Legacy forms |
|---|---|---|
| /orders | OrderRegisterTable (DataTable) | FrmOrderRegister(_Spl), frmordwiseregregister |
| /orders/in-hand | DataTable + variant toggle | SP_Vue_OrderinHand* views |
| /orders/new | OrderSheetWizard (HeaderPanel/StyleLines/StyleGrid/ComboGrid/RatePanel/ExcessPanel/PreviewPanel) | FrmOrderSheetNew, FrmOrderSheetNew_Domestic |
| /orders/trading | wizard (trading) | FrmTradingOrderSheet |
| /orders/trading-register | DataTable | FrmTradingOrdersInHandReg |
| /orders/[io] | OrderHeaderCard, StyleTabs, QtyMatrixTable, AmendmentTimeline, OrderLedger, OrdProdTrack, StatusCard | frmOrdStat, FrmBuyerStatus, FrmOrdProdTrack |
| /orders/[io]/amend | AmendmentTimeline + wizard | FrmOrderSheetAmendment, FrmOrderSheetNew_WithAmend |
| /orders/[io]/close | CloseChecklist, DespatchClose tab | FrmOrderClose, FrmOrderDespatchCompletion |
| /orders/enquiry | EntryForm | FrmOrderEnquiry |
| /orders/sample | EntryForm + SampleQtyGuard | frmOrderSample, FrmSampleEntry_WithEnquiry |
| /orders/input | ExcelDrop + input forms | FrmOrderInputMas, FrmOrderRelatedInput_Excel, FrmOtherPORelatedIps, FrmOptionUpdate |
| /orders/ref | reference/group forms | FrmOrderRef, frmOrderGroup |
| /orders/utilities/style-change | ConfirmList (rights-gated) | SP_StyleChange screen |
| /orders/utilities/display-days | settings form | FrmOrderDisplayDaysSetting |
| /orders/utilities/io-history | DataTable | FrmIoHistoryReg(_New) |
| /planning/program/new | ProgramWizard (RoutePanel/YarnConsPanel/FabricSpecPanel/AccReqPanel/GsmLlEdit), KnittingPartyInclusion, LossPanel | frmProgNew(_Actual), frmProgEntry, frmProgEntry_YarnCons, FrmPrg_GSM_LL_EditEntry, FrmPrg_KnittingPartyInclusion, FrmProg_Acc |
| /planning/program/[id] | ProgramBalanceCard | ST_ProgBalance_* views |
| /planning/program/complete | complete form | FrmProgramComplete |
| /planning/program/cancel | cancel forms | frmProgCancel(_Compwise), FrmAcc_ProgCancel |
| /planning/requirement | ReqYarnTable, ReqKnitTable, PartwiseAccTable, ComboWiseTable | SP_FabReqCalc_* screens |
| /planning/reqd-vs-finish | DataTable | Vue_Reqd_Vs_Finish |
| /planning/shortage/new | ToleranceBanner | frmShortage(_Compwise), frmAccShort |
| /planning/shortage/bit | bit entry | FrmShortageBitEntry |
| /planning/sewing-req | requirement table | FrmSewingReq |
| /planning/combo-req | DataTable | frmComboWiseReqRpt |
| /planning/budget/pre | pre-budget wizard + component master | frmPreBudgetProdPlan(_New), FrmPreCostingCompMas |
| /planning/budget/jobwork | budget forms | frmBudgetNew_JobWork, frmBudget, frmBudcom |
| /costing/budget-vs-actual | DataTable (jobId) | FrmBudgetAndActualComp |
| /planning/allotment/contract | allotment form | frmContractAllotment(_New) |
| /planning/allotment/fabric | allotment form | frmFabricAllotment |
| /planning/wbs | WbsGanttTable, WbsDateWise, WbsSuppBoard, PlanDateCalc | WBS screens |
| /planning/templates/route | template editor | FrmProRouteTemplate |
| /planning/templates/commercial | template editor | Frm_CommercialTemplate |
| /planning/templates/process-bypass | bypass editor | FrmProcessByPassSetting, Frm_SubProcess |
| /planning/workflow-store | DocStore | Frm_WF_DocumentStore |
| /m/orders, /m/orders/[io] | mobile list/detail + WBS RAG + track link | Commando orders screens |

## 7. API endpoints (from 04)

| Method + path | Service | Notes |
|---|---|---|
| GET /api/orders (filters: buyer, merch, season, style, status) | OrderService.list() | OrderRegister family |
| GET /api/orders/in-hand?variant=all\|salerate\|stylewise | OrderService.inHand() | SP_Vue_OrderinHand* |
| POST /api/orders (export\|domestic\|trading) | OrderService.create() | OrderSheetNew family |
| POST /api/orders/:io/amend | OrderService.amend() | _Amend audit copies |
| POST /api/orders/:io/close | OrderService.close() | FrmOrderClose |
| POST /api/orders/:io/style-change (rights-gated) | OrderService.styleChange() | SP_StyleChange ~140 tables + log |
| GET /api/orders/:io/ledger | OrderService.ledger() | SP_OrderHistoryLedger |
| GET /api/orders/:io/status | OrderService.status() | SP_OrderStatus pipeline kgs |
| GET /api/orders/:io/track | OrderService.track() | FrmOrdProdTrack |
| POST /api/orders/enquiry / sample | OrderService.enquiry/sample() | FrmOrderEnquiry / samples |
| POST /api/orders/:io/excel-input | OrderService.excelInput() | FrmOrderRelatedInput_Excel |
| POST /api/planning/program (+cancel/complete) | ProgramService.* | frmProgNew family |
| POST /api/planning/requirement/calc -> {jobId} | PlanningService.explode() | SP_FabReqCalc_*(+_ComboWise) |
| GET /api/planning/requirement/:jobId | PlanningService.result() | staged result |
| GET /api/planning/reqd-vs-finish?ordId | PlanningService.reqdVsFinish() | Vue_Reqd_Vs_Finish |
| POST /api/planning/shortage (+bit) | ShortageService.book() | frmShortage(_Compwise), ShortageBit |
| GET /api/planning/cons/actual | PlanningService.consumption(variant) | SP_ConsQuery1/2 family |
| POST /api/planning/wbs / GET ?ordId | WbsService.upsert()/get() | Sp_WBS_Production(_DateWise/_Supp) |
| GET /api/planning/plan-date?date&days&dir | PlanningService.workingDayAdd() | WF_PlanFinishDateArrival |
| POST /api/planning/allotment/contract\|fabric | AllotmentService.* | frmContractAllotment/fabric |
| GET /api/planning/meeting?ordId | MeetingService.pack() | Meet_* datasets |
| POST /api/reports/:id/run -> jobId | ReportService.run() | register/report families (07) |

## 8. Reports & prints (from 07 sec 1)

- Order sheets family (document prints): Rpt_OrderSheet (Clrwise, Set, Spare, Image, Amendment, Proformo variants), OrderSheetRegFab/Yarn.
- Buyer/order family (registers): BuyerPL, OrderStatus, OrderHistory, InHand sets (ST_Ord_inHand).
- Budget/cost family (budget legs owned here): Rpt_Budget(Abs, AndActual), CostSheet input side (pre-budget capture).
- MIS/meeting family: MeetingChart*, SP_WBS_MeetingView sets (flag-gated by wbsrequired).
- Register runner: jobId staging, per-user default params (FrmMISSetting), Excel/CSV export.

## 9. Flags affecting this module (verbatim legacy names)

| Flag | Effect |
|---|---|
| orderalloweddays / samplerefno_reqd_in_ordersheet / image_compulsory_in_ordersheet / produnit_reqd_in_ordersheet / cp_planstdate / cp_prodn_plan_partwise | order-sheet field policies in OrderSheetWizard |
| cp_colorentry_reqd_from_program | color entry pulled from program into order sheet combo | OrderSheetWizard |
| stylewisebillrate / ordergroupingreqd / trsallowstylewise / orderqty / ordtransfer_concernwise / ordersheetpostingflg | order-level policies in OrderService/posting |
| sampleqtylimitcheck / ionogen / ioautogen / ocngen | sample qty caps and IO/OC auto-numbering |
| lotwise_rate_deldate_reqd_in_ordersheet | order-sheet lot-wise rate / delivery-date requirement |
| compprogentry / compprogentry_sample / accreqentry / prgentrycompulsory | program and acc entry gates in ProgramService |
| knitprgdc | knitting program DC (Trs_Del3) and party inclusion |
| ll_edit_reqd / desentry / dyeprgcolor / allowdec | program wizard entry helpers |
| boostupper / reserveper | requirement boost-up and reserve (FN_Add_BoostupPer) |
| prog_reqmt_compt_wise / fabtoyarn_count_hide_in_requirement / partsinuom | requirement display toggles |
| shortage_approval | shortage approval routing |
| schcomppercen / schpcscomppercen / autocompperc | scheme/auto completion % caps |
| dyeinggamtper / knittinggamtper | acceptable process loss % |
| wbsrequired / wbsplanningmust / scheduleflg / scheacteditallow / scheplaneditflg / schetargetdays | WBS module, mandatory planning, schedule editing |
| weekoff / sundayentryto / wwstdt | calendar inputs to WF_PlanFinishDateArrival and effy settings |
| precostingflg / bud_app / prodbudappreqd_sample | pre-costing toggle and budget approvals |
| budactfieldsflag / budandactseprtaxreqd / budrt_cmt_sizewise / budget_overhead_percent | budget-vs-actual field/tax options (compare view) |

## 10. Traceability (legacy form -> FR IDs)

| Legacy form (06 sec D/ E/ O) | FR IDs |
|---|---|
| FrmOrderEnquiry | ORD-018 |
| frmOrderSample | ORD-019 |
| FrmSampleEntry_WithEnquiry | ORD-019 |
| FrmOrderSheetNew | ORD-003, ORD-004, ORD-005, ORD-006, ORD-007 |
| FrmOrderSheetNew_Domestic | ORD-010 |
| FrmOrderSheetNew_WithAmend | ORD-013, ORD-014 |
| FrmOrderSheetAmendment | ORD-013 |
| FrmTradingOrderSheet | ORD-011 |
| FrmTradingOrdersInHandReg | ORD-012 |
| FrmOrderInputMas | ORD-020 |
| FrmOrderRelatedInput_Excel | ORD-021 |
| FrmOtherPORelatedIps | ORD-020 |
| FrmOptionUpdate | ORD-020 |
| Frm_Ordersheet_Preview | ORD-009 |
| FrmOrderRef | ORD-022 |
| frmOrderGroup | ORD-022 |
| FrmOrderClose | ORD-015 |
| FrmOrderDespatchCompletion | ORD-016 |
| FrmOrderRegister(_Spl) / frmordwiseregregister | ORD-001 |
| in-hand views (SP_Vue_OrderinHand*) | ORD-002 |
| frmOrdStat / FrmBuyerStatus | ORD-026 |
| FrmOrdProdTrack | ORD-027 |
| FrmOrderDisplayDaysSetting | ORD-028 |
| FrmIoHistoryReg(_New) | ORD-025 |
| style change (SP_StyleChange UI) | ORD-017 |
| FrmDiaChange / FrmFinalDiaUpdation | not R02 - routed to /grn/dia/* (GRN module) |
| frmProgNew / frmProgNew_Actual | PLN-001 |
| frmProgEntry / frmProgEntry_YarnCons | PLN-001, PLN-003 |
| FrmPrg_GSM_LL_EditEntry | PLN-006 |
| FrmPrg_KnittingPartyInclusion | PLN-007 |
| FrmProg_Acc | PLN-005 |
| frmProgCancel(_Compwise) / FrmAcc_ProgCancel | PLN-011 |
| FrmProgramComplete | PLN-010 |
| requirement screens (SP_FabReqCalc_*) | PLN-012 to PLN-019 |
| frmComboWiseReqRpt | PLN-025 |
| FrmSewingReq | PLN-024 |
| frmShortage(_Compwise) | PLN-021 |
| frmAccShort | PLN-023 |
| FrmShortageBitEntry | PLN-022 |
| reqd-vs-finish (Vue_Reqd_Vs_Finish) | PLN-020 |
| frmPreBudgetProdPlan(_New) | PLN-026 |
| FrmPreCostingCompMas | PLN-027 |
| frmBudgetNew_JobWork / frmBudget / frmBudcom | PLN-028 |
| FrmBudgetAndActualComp | PLN-029 |
| frmContractAllotment(_New) | PLN-030 |
| frmFabricAllotment | PLN-031 |
| WBS screens (WbsGantt/DateWise/Supp) | WBS-001 to WBS-003, WBS-007 |
| FrmProRouteTemplate | PLN-032 |
| Frm_CommercialTemplate | PLN-033 |
| FrmProcessByPassSetting (+ Frm_SubProcess) | PLN-034 |
| FrmHourlySetting1 / frmHours | not R02 - routed to /production/hourly (production module) |
| Frm_WF_DocumentStore | PLN-035 |

## 11. Open items / blockers

- OB-01: SP_StyleChange's ~140-table rename list is not enumerated in the docs; the live proc must be extracted before ORD-017 can be specified table-by-table.
- OB-02: TempIoHisLedger staging semantics (keying, purge) need live-DB confirmation for the order-ledger jobId port (ORD-024).
- OB-03: The exact SP_FabReqCalc_* variant list (which suffixes exist: _ComboWise and others) and the FABTOYARN/DYEING/YARNDYEING knob values must be confirmed from live procs for the parity fixtures (PLN-012 to PLN-019).
- OB-04: Trading order flow details (distinct tables vs OrderMas reuse, tax handling) are sparse in the source docs; needs legacy-form walk-through before build (ORD-011, ORD-012).
- OB-05: Budget approval routing (bud_app, prodbudappreqd_sample) is owned by the approvals module; the hand-off contract between ProgramService/budget screens and ApprovalService must be agreed.
- OB-06: Data sources for FrmSewingReq and frmComboWiseReqRpt are not listed in 04; repository targets must be identified from live DB.
- OB-07: schetargetdays default value and wwstdt semantics (weekly start day) are not stated in the docs; needed for WBS-004/WBS-005 parity fixtures.
- OB-08: ordtransfer_concernwise concern-scoping rules (which transfers are concern-restricted) need confirmation against Trg_/trigger behavior.
- OB-09: Sample order costing linkage (prodbudappreqd_sample) and its interaction with pre-budget (PLN-026/027) needs a joint session with costing module owners.
