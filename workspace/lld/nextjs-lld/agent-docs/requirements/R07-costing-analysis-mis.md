# R07 - Costing, P&L Analysis & MIS

## 1. Purpose & business context

R07 owns the money-out visibility layer: budget-vs-actual per order (all costing legs,
tax handling, group consolidation, stylewise variants), the daily unit P&L at budget
rates with actual wages/bills and pro-rata overheads, the quick-costing cube with its
4 expense levels, the wages-cost and P&L registers, buyer P&L, the expenses family,
the MIS dashboards and their per-user settings, the meeting packs, and the order
status pipeline KPIs. All math is unchanged legacy parity (03 sec. 9); R07 reads the
documents and projectors other modules post and turns them into owner-facing
analysis. Nothing in R07 writes stock; its only writes are costing inputs, expenses,
and projector-maintained ST_Cost_* / DailyUnitP&L / MeetingCaches tables.

## 2. Scope (legacy forms/screens in)

- Budget-vs-actual: FrmBudgetAndActualComp at /costing/budget-vs-actual
  (SP_Bud_and_Actual + _1/_2 + stylewise; jobId staging) (02 sec. 14; 06 sec. E, J).
  Budget capture screens (frmPreBudgetProdPlan(_New), frmBudgetNew_JobWork,
  frmBudget, frmBudcom, FrmPreCostingCompMas) are owned by the planning module;
  R07 consumes their outputs (Pro_ReqYarn/Pro_ReqKnitt/PRO_AccReq/BudRate) and owns
  the comparison math and the bud_app draft-hold behavior.
- Costing input: FrmCostingInput (Trs_DailyPrdn_Costing1..5; 4 expense levels;
  Trg_ST_DailyCostingInputData parity) (02 sec. 14; 06 sec. C, J).
- Quick costing: /costing/quick (ST_Cost_Factory/Dept/OrderDtl cube) with mobile
  parity at /m/costing/quick (02 sec. 14, sec. 20; 06 sec. K).
- Daily unit P&L: /costing/daily-pl (Sp_DailyUnitPANDL per unit/day/order/stage;
  overhead pro-rata) (02 sec. 14; 06 sec. J).
- Registers: FrmProductionCost (/costing/production-cost), FrmPLReg
  (/costing/pl-register), frmBuyerPLReport (/costing/buyer-pl), FrmProdWagesDept
  (/costing/wages-cost/dept), FrmProdWagesStage (/costing/wages-cost/stage)
  (02 sec. 14; 06 sec. J).
- Expenses family: FrmExpenses, FrmMasExpenses, FrmExpenseGroup (Exp_Level 4
  levels), FrmFixedExpensesEntry (Trs_FixedExpensesDateWise),
  FrmExpenseEntryRegister, FrmProdExpenses, FrmStylewiseExpensesEntry
  (02 sec. 10, sec. 14; 06 sec. C, I, J, O).
- MIS: frmMIS (/mis + dashboard KpiRow/OrderPipelineTable/WbsRagBoard/
  MeetingCharts), FrmMISSetting (/mis/settings), FrmStatusReg (/mis status
  register) (02 sec. 2; 06 sec. O).
- Meeting packs: Meet* datasets (Meet_Accessories/MeetAccDetails/Charts),
  MeetingChartAllDept, MeetingReportChart, SP_WBS_MeetingView sets (02 sec. 2,
  sec. 21; 04 sec. 3; 07 sec. 1.2).
- Order status pipeline: SP_OrderStatus shape (Knit/Heat/Wash/Comp kgs per IO) on
  the dashboard and via GET /api/orders/:io/status; frmOrdStat / FrmBuyerStatus
  StatusCard itself is owned by the orders module (02 sec. 2, sec. 3; 04 sec. 2).
- Out of scope: wage calculation and payroll registers (payroll module), the
  generic report engine internals (R08 RPT-), approvals inbox routing (R08 APR-),
  AI narration of registers/meeting packs (R08 AI-, cross-referenced).

## 3. Functional requirements

| FR ID | Requirement (testable "shall") | Source | Priority | Stage |
|---|---|---|---|---|
| CST-001 | The system shall run budget-vs-actual per order through POST /api/costing/bud-vs-act, staging result rows to a jobId with output identical to SP_Bud_and_Actual. | 04 sec. 10; 03 sec. 9 | P0 | S5 |
| CST-002 | The system shall compute budget legs as Pro_ReqYarn x rate, Pro_ReqKnitt x rate, and PRO_AccReq x BudRate. | 03 sec. 9 | P0 | S5 |
| CST-003 | The system shall compute actual legs from PO, GRN, DC-valued, debits, Trs_BillRate.NetAmount, piece-rate production x Pro_Prod_Partwise or Bud_InhRateclw size-wise, and ShippingBill. | 03 sec. 9 | P0 | S5 |
| CST-004 | The system shall expose the @Reqd_TaxInPL report parameter, defaulting from the budandactseprtaxreqd flag, and include or exclude tax amounts in the P&L legs per its value. | 03 sec. 9; 02 sec. 14; 07 sec. 2.3 | P0 | S5 |
| CST-005 | The system shall consolidate budget-vs-actual legs across orders sharing a GrpRef into group-level totals (GrpRef consolidation). | 03 sec. 9 | P1 | S5 |
| CST-006 | The system shall provide the SP_Bud_and_Actual_1/_2 and stylewise variants with the same leg structure as the base comparison. | 02 sec. 14 | P1 | S5 |
| CST-007 | The system shall render /costing/budget-vs-actual (FrmBudgetAndActualComp) from staged jobId rows in a DataTable with sort/group. | 02 sec. 14; 06 sec. E | P0 | S5 |
| CST-008 | The system shall apply budactfieldsflag to control the visible field set of the budget-vs-actual output. | 02 sec. 14; 07 sec. 2.3 | P1 | S5 |
| CST-009 | The system shall keep budget documents at Draft until approved when bud_app is on (prodbudappreqd_sample for sample budgets) and create budget approval tasks in the typed budget queue (queue owned by R08 APR-). | 02 sec. 16; 07 sec. 2.3 | P1 | S5 |
| CST-010 | The system shall apply size-wise CMT budget rates in piece-rate legs per budrt_cmt_sizewise. | 07 sec. 2.3; 03 sec. 9 | P1 | S5 |
| CST-011 | The system shall value budget-vs-actual consumption at cumulative rates from StockRatePost cumbillrate (listed consumer parity). | 03 sec. 4.5 | P1 | S5 |
| CST-012 | The system shall provide costing input (FrmCostingInput) writing Trs_DailyPrdn_Costing1..5 across the 4 expense levels via POST /api/costing/input in one transaction. | 02 sec. 14; 04 sec. 10; 06 sec. C | P0 | S5 |
| CST-013 | The system shall maintain ST_Cost_* rows on costing input with Trg_ST_DailyCostingInputData trigger parity (recompute from inputs, UpdateFlg stamped). | 02 sec. 14; 05 sec. 2 | P0 | S5 |
| CST-014 | The system shall serve the quick-costing cube via GET /api/costing/quick?ordId reading ST_Cost_Factory/Dept/OrderDtl. | 04 sec. 10; 02 sec. 14 | P0 | S5 |
| CST-015 | The system shall expose Vue_DailyCostingInputData reads carrying the 4 expense levels (Exp_Level) into the cube views. | 03 sec. 9; 06 sec. C | P1 | S5 |
| CST-016 | The system shall render /costing/quick on desktop with mobile quick-costing parity at /m/costing/quick reading the same endpoint. | 02 sec. 14, sec. 20; 06 sec. K | P1 | S5 |
| CST-017 | The system shall provide the production cost register (FrmProductionCost) at /costing/production-cost. | 02 sec. 14; 06 sec. J | P1 | S6 |
| CST-018 | The system shall provide expenses entry and masters (FrmExpenses, FrmMasExpenses, FrmExpenseGroup) with the Exp_Level 4-level LevelPicker. | 02 sec. 14; 06 sec. C, J | P0 | S5 |
| CST-019 | The system shall snapshot fixed expenses (FrmFixedExpensesEntry) into Trs_FixedExpensesDateWise date-wise rows. | 02 sec. 14; 06 sec. C | P1 | S5 |
| CST-020 | The system shall provide the expense entry register (FrmExpenseEntryRegister) at /costing/expenses/register. | 06 sec. O; 07 sec. 1.2 | P1 | S6 |
| CST-021 | The system shall provide production and stylewise expenses entry (FrmProdExpenses, FrmStylewiseExpensesEntry) whose rows feed the daily P&L style-expense legs. | 02 sec. 10; 06 sec. I; 03 sec. 9 | P1 | S5 |
| CST-022 | The system shall enforce costcalc / precostingflg / precost_acc_joms as the costing-calculation toggles on every R07 computation. | 07 sec. 2.3 | P1 | S5 |
| CST-023 | The system shall apply allow_excess_inbudget when excess quantities are brought into budget legs. | 07 sec. 2.1 | P2 | S6 |
| CST-024 | The system shall register the Budget/cost/rates report family (Rpt_Budget (Abs, AndActual), ProdCost, CostSheet, RptCosting, RptCostSheetInput) in the catalog with legacy parameter sets. | 07 sec. 1.2 | P1 | S6 |
| PL-001 | The system shall compute daily unit P&L per unit/day/order/stage via POST /api/costing/daily-pl?date with Sp_DailyUnitPANDL parity. | 04 sec. 10; 02 sec. 14 | P0 | S5 |
| PL-002 | The system shall value shift, contractor, and jobwork quantities in the daily P&L at budget rates. | 03 sec. 9 | P0 | S5 |
| PL-003 | The system shall bring actual wages and actual bills into the same day's P&L as separate actual legs. | 03 sec. 9 | P0 | S5 |
| PL-004 | The system shall compute overhead as budget x budget_overhead_percent (ProdOverheads%) plus daily and fixed expenses. | 03 sec. 9; 07 sec. 2.3 | P0 | S5 |
| PL-005 | The system shall allocate overhead pro-rata by wages within the day/unit. | 03 sec. 9 | P0 | S5 |
| PL-006 | The system shall allocate style expenses pro-rata by pcs. | 03 sec. 9 | P1 | S5 |
| PL-007 | The system shall maintain the DailyUnitP&L projector re-SUMmed from documents on wages.booked, bill.passed, and prodentry.posted events (rebuild bucket from SUM(documents), not incremental arithmetic). | 05 sec. 1, sec. 2 | P0 | S5 |
| PL-008 | The system shall render /costing/daily-pl showing per unit/day/order/stage results with the overhead pro-rata visible. | 02 sec. 14 | P0 | S5 |
| PL-009 | The system shall provide the P&L register (FrmPLReg) at /costing/pl-register. | 02 sec. 14; 06 sec. J | P1 | S6 |
| PL-010 | The system shall provide the buyer P&L (frmBuyerPLReport) at /costing/buyer-pl and register the BuyerPL report. | 02 sec. 14; 06 sec. J; 07 sec. 1.2 | P1 | S6 |
| PL-011 | The system shall provide the dept wages-cost register (FrmProdWagesDept) at /costing/wages-cost/dept. | 02 sec. 14; 06 sec. J | P1 | S6 |
| PL-012 | The system shall provide the stage wages-cost register (FrmProdWagesStage) at /costing/wages-cost/stage. | 02 sec. 14; 06 sec. J | P1 | S6 |
| PL-013 | The system shall gate the production-wage arrival view on reqd_actual_production_wage_arrived_with_payrolllink (costing/MIS options group). | 07 sec. 2.3; 02 sec. 11 | P2 | S6 |
| MIS-001 | The system shall render the ERP dashboard (frmMIS parity) with KpiRow showing order-in-hand (ST_Ord_inHand), despatch today, party-out value (PartyOutQry), and WIP kgs. | 02 sec. 2 | P1 | S6 |
| MIS-002 | The system shall render OrderPipelineTable in the SP_OrderStatus shape (Knit/Heat/Wash/Comp kgs per IO). | 02 sec. 2 | P1 | S6 |
| MIS-003 | The system shall render WbsRagBoard from WBS_Production RAG stages (Sp_WBS_Production). | 02 sec. 2 | P1 | S6 |
| MIS-004 | The system shall render /mis (frmMIS) with MisGrid at FlexGrid parity (sort, group, export). | 02 sec. 2; 06 sec. O | P1 | S6 |
| MIS-005 | The system shall provide per-user MIS settings (FrmMISSetting: column/measure config) at /mis/settings via MisSettingPanel. | 02 sec. 2 | P1 | S6 |
| MIS-006 | The system shall apply FrmMISSetting per-user defaults as default parameters in the report catalog (runner parity). | 07 sec. 1.2; 02 sec. 17 | P1 | S6 |
| MIS-007 | The system shall serve the order status pipeline via GET /api/orders/:io/status (SP_OrderStatus pipeline kgs). | 04 sec. 2 | P1 | S6 |
| MIS-008 | The system shall provide the generic status register (FrmStatusReg) under /mis. | 06 sec. O | P2 | S6 |
| MIS-009 | The system shall serve order-in-hand KPI variants via GET /api/orders/in-hand?variant=all|salerate|stylewise with ST_Ord_inHand FCY/INR value. | 04 sec. 2; 02 sec. 3 | P1 | S6 |
| MIS-010 | The system shall gate piece-form details in the MIS dashboard on pcsformdetails_required_in_mis_dashboard. | 07 sec. 2.3 | P2 | S6 |
| MIS-011 | The system shall gate special report variants on splreports_reqd. | 07 sec. 2.3 | P2 | S6 |
| MIS-012 | The system shall refresh dashboards over SSE and show a stale chip with manual refresh when projector lag is detected, documents remaining authoritative. | 05 sec. 8; 02 sec. 22 | P1 | S6 |
| MET-001 | The system shall assemble the meeting pack via GET /api/planning/meeting?ordId from Meet_Accessories/MeetAccDetails/Charts datasets (MeetingService.pack). | 04 sec. 3 | P1 | S6 |
| MET-002 | The system shall render MeetingCharts (MeetingChartAllDept, MeetingReportChart) on the dashboard gated by wbsrequired. | 02 sec. 2 | P1 | S6 |
| MET-003 | The system shall refresh meeting caches on program.created/completed/cancelled and wbs.actualChanged events via the MeetingCaches projector. | 05 sec. 1, sec. 2 | P1 | S6 |
| MET-004 | The system shall register the SP_WBS_MeetingView report set in the catalog. | 07 sec. 1.2 | P1 | S6 |
| MET-005 | The system shall register the MeetingChart* template family in the catalog. | 07 sec. 1.2 | P1 | S6 |
| MET-006 | The system shall provide the shared MeetingPackPanel component rendering Meet* datasets for reuse on dashboard and meeting screens. | 02 sec. 21 | P1 | S6 |
| MET-007 | The system shall include trace reconciliation exceptions in the daily meeting pack once tracking phase 3 is live (cross-ref R08 TRK-025). | 08 sec. 8 | P2 | S7 |
| MET-008 | The system shall print and export the meeting pack through the report runner (jobId staging plus Excel export). | 05 sec. 7; 07 sec. 1.2 | P1 | S6 |

Priority key: P0 = parity-critical costing math, P1 = committed parity, P2 = late/gated.
R07 contains no Part-3 addition flags; AI narration hooks on these surfaces are R08.

## 4. Business rules & validations

| BR | Rule (flags verbatim) | Source |
|---|---|---|
| BR-01 | Tax in P&L: the @Reqd_TaxInPL parameter defaults from budandactseprtaxreqd; tax amounts are included in or separated from the actual P&L legs per its value. | 03 sec. 9; 07 sec. 2.3 |
| BR-02 | GrpRef consolidation: orders sharing a GrpRef consolidate to group totals without losing per-order drilldown. | 03 sec. 9 |
| BR-03 | Field visibility: budactfieldsflag selects the visible field set of budget-vs-actual. | 07 sec. 2.3 |
| BR-04 | Budget approval: bud_app keeps budget documents Draft until approved; prodbudappreqd_sample extends the rule to sample budgets; approval routing is the approvals module (R08 APR-). | 07 sec. 2.3; 02 sec. 16 |
| BR-05 | Overhead: overhead = budget x budget_overhead_percent (ProdOverheads%) + daily expenses + fixed expenses; never a plugged number. | 03 sec. 9; 07 sec. 2.3 |
| BR-06 | Pro-rata: overhead allocates pro-rata by wages; style expenses allocate pro-rata by pcs (Sp_DailyUnitPANDL semantics). | 03 sec. 9 |
| BR-07 | Expense levels: Mas_Expenses rows carry Exp_Level (4 levels); costing input writes Trs_DailyPrdn_Costing1..5 by level. | 06 sec. C; 02 sec. 14 |
| BR-08 | Size-wise CMT rates: budrt_cmt_sizewise switches piece-rate legs to size-wise budget rates (Bud_InhRateclw). | 07 sec. 2.3; 03 sec. 9 |
| BR-09 | Costing toggles: costcalc / precostingflg / precost_acc_joms gate whether and how R07 computations run. | 07 sec. 2.3 |
| BR-10 | Excess in budget: allow_excess_inbudget governs whether excess quantities enter budget legs. | 07 sec. 2.1 |
| BR-11 | Meeting gating: wbsrequired gates MeetingCharts and the WBS-driven meeting pack sections. | 02 sec. 2; 07 sec. 2.3 |
| BR-12 | MIS gating: pcsformdetails_required_in_mis_dashboard gates piece-form details; splreports_reqd gates special report variants. | 07 sec. 2.3 |
| BR-13 | Wage arrival basis: reqd_actual_production_wage_arrived_with_payrolllink decides whether required-vs-actual production wages arrive via the payroll link. | 07 sec. 2.3 |
| BR-14 | Recompute semantics: ST_Cost_* and DailyUnitP&L buckets rebuild from SUM(documents) on affected keys (legacy self-healing after back-dated entries), never incremental arithmetic. | 05 sec. 2 |
| BR-15 | Value basis: budget-vs-actual and river-style valuations consume StockRatePost cumbillrate outputs; R07 never recomputes cumulative rates itself. | 03 sec. 4.5 |

## 5. Data & postings

R07 performs no stock movements. Writes and reads:

- Writes: Trs_DailyPrdn_Costing1..5 (costing input), Mas_Expenses/Mas_ExpenseGroup
  (Exp_Level), Trs_FixedExpensesDateWise (fixed expense snapshots), Trs_Expenses
  (expense entries incl. stylewise), ReportJob/ReportJobRows (jobId staging for
  bud-vs-act and registers).
- Projector-maintained reads (05 sec. 2): ST_Cost_Factory/Dept/OrderDtl
  (CostFactory/Dept/OrderDtl projectors, Trg_ST_DailyCostingInputData parity),
  DailyUnitP&L, MeetingCaches, ST_Ord_inHand, WBS_* (RAG), ST_Production_Data
  (pipeline quantities).
- Events consumed (05 sec. 1): wages.booked (daily P&L), bill.passed (actual bill
  legs + cumulative-rate update), prodentry.posted (production quantities),
  program.created/completed/cancelled and wbs.actualChanged (meeting caches),
  po.created / grn.created / dc.created (actual legs are document reads).
- Legacy math contracts (03 sec. 9, unchanged): SP_Bud_and_Actual legs and
  @Reqd_TaxInPL/GrpRef handling; Sp_DailyUnitPANDL budget-rate valuation, actual
  wages/bills, overhead formula and pro-rata; Vue_DailyCostingInputData ->
  ST_Cost_* with sync flags.

## 6. UI & routes

| Route | Components | Screens (legacy -> new) |
|---|---|---|
| /costing/budget-vs-actual | ReportFilterPanel, DataTable (jobId) | FrmBudgetAndActualComp |
| /costing/input | EntryForm, LineGrid, LevelPicker | FrmCostingInput |
| /costing/quick | CostCubeTable | quick-costing (mobile parity) |
| /costing/daily-pl | DataTable (unit/day/order/stage) | daily unit P&L (Sp_DailyUnitPANDL) |
| /costing/production-cost | DataTable | FrmProductionCost |
| /costing/pl-register | ReportFilterPanel, DataTable | FrmPLReg |
| /costing/buyer-pl | ReportFilterPanel, DataTable | frmBuyerPLReport |
| /costing/expenses | EntryForm, MasterCrud, LevelPicker | FrmExpenses, FrmMasExpenses, FrmExpenseGroup |
| /costing/expenses/fixed | EntryForm (date-wise snapshot grid) | FrmFixedExpensesEntry |
| /costing/expenses/register | DataTable | FrmExpenseEntryRegister |
| /costing/wages-cost/dept | DataTable | FrmProdWagesDept |
| /costing/wages-cost/stage | DataTable | FrmProdWagesStage |
| /dashboard | KpiRow, OrderPipelineTable, WbsRagBoard, MeetingCharts | frmMIS + mobile dashboard |
| /mis | MisGrid (FlexGrid parity) | frmMIS |
| /mis/settings | MisSettingPanel | FrmMISSetting |
| /m/costing/quick | mobile quick-costing parity | Commando quick costing (R08 MOB-) |
| /reports/[reportId] | ReportFilterPanel, ReportJobRunner, ReportViewer, ExportBar | R07 families in the catalog (R08 RPT-) |

## 7. API endpoints (04 sec. 10; supporting rows from sec. 2, sec. 3)

| Endpoint | Service | Purpose |
|---|---|---|
| POST /api/costing/bud-vs-act | CostingService.budVsAct() | SP_Bud_and_Actual parity, returns jobId |
| POST /api/costing/daily-pl?date | CostingService.dailyPL() | Sp_DailyUnitPANDL parity |
| POST /api/costing/input | CostingService.input() | Trs_DailyPrdn_Costing writes |
| GET /api/costing/quick?ordId | CostingService.quick() | ST_Cost_* cube |
| GET /api/orders/:io/status | OrderService.status() | SP_OrderStatus pipeline kgs |
| GET /api/orders/in-hand?variant= | OrderService.inHand() | KPI variants (ST_Ord_inHand) |
| GET /api/planning/meeting?ordId | MeetingService.pack() | Meet_* datasets |
| POST /api/reports/:id/run -> jobId | ReportService.run() | register/report staging |
| GET /api/reports/jobs/:jobId | ReportService.result() | paged rows + totals |
| GET /api/reports/print/:printId?docId | ReportService.print() | prints from the 07 catalog |
| GET /api/payroll/wage-register?variant=shift|production | PayrollService.register() | wages-cost register feeds (payroll-owned) |

## 8. Reports & prints (07 sec. 1.2 families owned by R07)

| Family | Templates | Data source |
|---|---|---|
| Budget/cost/rates | Rpt_Budget (Abs, AndActual), ProdCost, CostSheet, RptCosting, RptCostSheetInput | SP_Bud_and_Actual etc. |
| MIS/meeting | MeetingChart*, SP_WBS_MeetingView sets | WBS/Meet_* |
| Buyer/order | BuyerPL, OrderStatus, OrderHistory, InHand sets | ST_Ord_inHand |
| Expenses (commercial family row) | Expenses register | Trs_Expenses/Mas_Expenses |

Runner parity: multi-user jobId staging, Excel export (Interop.Excel parity), and
per-user default params from FrmMISSetting (MIS-006).

## 9. Flags affecting this module

| Flag | Effect | Enforcement point |
|---|---|---|
| budandactseprtaxreqd | tax included in / separated from P&L legs (@Reqd_TaxInPL default) | CostingService |
| budactfieldsflag | visible field set of budget-vs-actual | CostingService/reports |
| bud_app / prodbudappreqd_sample | budget approval draft-hold (sample variant) | CostingService + R08 APR- |
| budget_overhead_percent | overhead % over budget in daily P&L | CostingService |
| budrt_cmt_sizewise | size-wise CMT budget rates | CostingService |
| costcalc / precostingflg / precost_acc_joms | costing calculation toggles | CostingService |
| allow_excess_inbudget | excess quantities in budget legs | CostingService |
| pcsformdetails_required_in_mis_dashboard | piece-form details in MIS dashboard | MIS screens |
| splreports_reqd | special report variants | reports registry |
| reqd_actual_production_wage_arrived_with_payrolllink | wage arrival via payroll link | Costing/MIS views |
| wbsrequired | meeting charts / WBS meeting sections | dashboard/MET screens |

## 10. Traceability (legacy forms -> FR IDs)

| Legacy form | FR IDs |
|---|---|
| FrmBudgetAndActualComp | CST-001, CST-007 |
| SP_Bud_and_Actual (+_1/_2, stylewise) | CST-001..CST-006, CST-011 |
| FrmCostingInput | CST-012 |
| Trg_ST_DailyCostingInputData | CST-013 |
| quick costing (ST_Cost_* cube) | CST-014, CST-015, CST-016 |
| FrmProductionCost | CST-017 |
| Sp_DailyUnitPANDL | PL-001..PL-008 |
| FrmPLReg | PL-009 |
| frmBuyerPLReport | PL-010 |
| FrmProdWagesDept | PL-011 |
| FrmProdWagesStage | PL-012 |
| FrmExpenses / FrmMasExpenses / FrmExpenseGroup | CST-018 |
| FrmFixedExpensesEntry | CST-019 |
| FrmExpenseEntryRegister | CST-020 |
| FrmProdExpenses / FrmStylewiseExpensesEntry | CST-021 |
| frmMIS (dashboard + /mis) | MIS-001..MIS-004 |
| FrmMISSetting | MIS-005, MIS-006 |
| FrmStatusReg | MIS-008 |
| SP_OrderStatus pipeline | MIS-002, MIS-007 |
| MeetingChartAllDept / MeetingReportChart | MET-002, MET-005 |
| Meet_* datasets / SP_WBS_MeetingView | MET-001, MET-003, MET-004 |

## 11. Open items / blockers

| ID | Item | Impact |
|---|---|---|
| B4 | .rpt/.mrt parameters for the Budget/cost (Rpt_Budget*, CostSheet, RptCosting, RptCostSheetInput, ProdCost), MIS/meeting (MeetingChart*, SP_WBS_MeetingView), and Buyer/order (BuyerPL, OrderStatus) families are not extracted - never invent parameter lists; escalate for the X2 extraction before wiring CST-024, MET-004/005, PL-010. | Report family wiring blocked until extraction. |
| OI-1 | SP_Bud_and_Actual, Sp_DailyUnitPANDL, and Trg_ST_DailyCostingInputData live definitions are parity sources named in 03 sec. 9 but are not in the on-disk verified set - extract and proc-verify in S0 before coding CST-001..CST-013, PL-001..PL-007. | Core costing math parity unproven until extracted. |
| OI-2 | 03 sec. 9 names the overhead knob "ProdOverheads%" while 07 Part 2 lists the flag budget_overhead_percent - confirm they are the same store entry and the default value. | PL-004 correctness. |
| OI-3 | Meet_* dataset definitions (Meet_Accessories/MeetAccDetails/Charts) behind MeetingService.pack are not on disk - extract before MET-001/MET-003. | Meeting pack parity blocked. |
| OI-4 | FrmMISSetting per-user column/measure config storage has no defined schema in the sources - define the config store (per user x screen x measure) before MIS-005/MIS-006. | MIS settings + report defaults. |
| OI-5 | "SP_OrderStatus shape" (Knit/Heat/Wash/Comp kgs per IO) - the proc body is not on disk; extract before MIS-002/MIS-007. | Pipeline KPI parity. |
| OI-6 | AI narration of registers and the meeting-pack brief on R07 surfaces (07 sec. 1.2 runner, 09 skill 12/13) is delivered by R08 AI- and gated by ai_narrator (default OFF); it also depends on B5 golden sets. Do not build narration into R07 screens; expose only the narrator hook point. | Cross-module dependency on R08 + B5. |
