# Module 9 — Costing, Budgeting & Finance

> **Generated**: 2026-03-15  
> **Source**: ~25 forms (costing input, production cost, production wages, budget, budget vs actual, expense entries, P&L registers, rate masters, rate confirmation, pre-costing, pre-budget, commercial template), ~30 stored procedures (SP_Bud_and_Actual*, SP_BudAndActual_Det*, SP_BudgetQry*, Sp_DailyUnitPANDL, SP_Vue_OrderStyleWiseCost, SP_OnePageRpt, SP_ConsQuery*, Sp_DomesticPL, SP_PLFabDet*, SP_ApprovedRateCnf1, SP_PendingRateCnf, SP_FabReqCalc_Domestic_joborder, SP_PcsValue*, SP_BilltoBeValue*, SP_1/SP_2_ACC), 4 triggers (Trg_ST_Cost_Dept, Trg_ST_Cost_Factory, Trg_ST_Cost_OrderDtl, Trg_ST_DailyCostingInputData), 2 views (Vue_Budget_Det, Vue_DailyCostingInputData), multiple report templates  
> **Foundation References**: database-schema.md, stored-procedures-analysis.md, triggers-and-views-analysis.md, formulas-and-calculations.md, 02-order-management-sales.md, 03-procurement-supplier.md, 06-production-shopfloor.md, 08-accounting-billing-gst.md

---

## Table of Contents

1. [Module Overview](#1-module-overview)
2. [Forms Inventory](#2-forms-inventory)
3. [Data Model — Core Costing & Budget Tables](#3-data-model--core-costing--budget-tables)
   - 3.1 Temp_BudgetAndActual — Budget vs Actual Working Table
   - 3.2 Temp_BudgetAndActualAbs — Budget vs Actual Abstract
   - 3.3 Temp_BudgetAndActualStyle — Style-Wise Budget Working Table
   - 3.4 Temp_BudgetAndActual_Det — Budget vs Actual Detail
   - 3.5 DailyUnit_P_and_L — Daily Production P&L Line Items
   - 3.6 DailyUnit_P_And_L_Abs — Daily P&L Abstract
   - 3.7 ORDERSTYLEWISECOST — Order-Style Cost Summary
   - 3.8 OrderStylewiseCost_Grp — Grouped Cost Summary
   - 3.9 ST_Cost_Factory — Factory-Level Daily Costing
   - 3.10 ST_Cost_Dept — Department-Level Daily Costing
   - 3.11 ST_Cost_OrderDtl — Order-Level Daily Costing Detail
   - 3.12 ST_DailyCostingInputData — Daily Costing Input Master
   - 3.13 Pro_Prod_PartwiseRate — Part-Wise Budget Rates
   - 3.14 Pro_Prod_BitCutRate — Bit/Cut Budget Rates
   - 3.15 Pro_Prod_Budget_Det — Production Budget KGs Detail
   - 3.16 Bud_InhRateclw — In-House Rate (Color/Size-Wise)
   - 3.17 Pro_RateCnfPcs1 / Pro_RateCnfPcs2 — Rate Confirmation
   - 3.18 Trs_ProdWages — Production Wages Transaction
   - 3.19 Trs_ProdShiftWages — Production Shift Wages
   - 3.20 Trs_DailyExpenseEntry — Daily Expense Entry
   - 3.21 FixedExpenses_Entry / Trs_FixedExpensesDateWise — Fixed Expenses
   - 3.22 Trs_DailyPrdn_Costing1–5 — Daily Production Costing Levels
   - 3.23 Mas_Expenses — Expense Master
   - 3.24 temp_DomesticPL — Domestic P&L Working Table
   - 3.25 StockRatePost — Cumulative Bill Rate / Budget Rate
   - 3.26 PcsStockRatePost — Piece Stock Rate Posting
   - 3.27 Vue_Budget_Det (View)
   - 3.28 Vue_DailyCostingInputData (View)
4. [Pre-Costing & Component Master — FrmPreCostingCompMas](#4-pre-costing--component-master--frmprecompmas)
   - 4.1 Pre-Costing Component Setup
   - 4.2 Component Rate Definition
   - 4.3 Pre-Costing Calculation Logic
5. [Pre-Budget Production Plan — frmPreBudgetProdPlan / _New](#5-pre-budget-production-plan--frmprebudgetprodplan--_new)
   - 5.1 Pre-Budget Entry
   - 5.2 Production Plan Projection
6. [Budget Creation — frmBudget / frmBudgetNew_JobWork / frmBudcom](#6-budget-creation--frmbudget--frmbudgetnew_jobwork--frmbudcom)
   - 6.1 Budget Rate Setup Workflow
   - 6.2 Part-Wise Rate Entry (Pro_Prod_PartwiseRate)
   - 6.3 Bit/Cut Rate Entry (Pro_Prod_BitCutRate)
   - 6.4 Job Work Budget (frmBudgetNew_JobWork)
   - 6.5 Budget Commercial Component (frmBudcom)
   - 6.6 In-House Rate Entry (Bud_InhRateclw — Color/Size-Wise)
   - 6.7 Size-Wise Budget Option (BudRT_CMT_SizeWise)
   - 6.8 Excess Handling in Budget (Allow_Excess_InBudget)
7. [Production Cost Entry — Frm_CostingInput / Frm_ProductionCost](#7-production-cost-entry--frm_costinginput--frm_productioncost)
   - 7.1 Daily Costing Input (ST_DailyCostingInputData)
   - 7.2 Factory-Level Cost Posting (ST_Cost_Factory)
   - 7.3 Department-Level Cost Posting (ST_Cost_Dept)
   - 7.4 Order-Level Cost Detail (ST_Cost_OrderDtl)
   - 7.5 Costing Triggers (UpdateFlg Mechanism)
8. [Production Wages — Frm_ProductionWages / Frm_ProdWagesDept / Frm_ProdWagesStage](#8-production-wages--frm_productionwages--frm_prodwagesdept--frm_prodwagesstage)
   - 8.1 Shift Wages Entry (Trs_ProdWages)
   - 8.2 Department-Wise Wage Aggregation
   - 8.3 Stage-Wise Wage Breakdown
   - 8.4 Shift Wages in Daily P&L
9. [Budget vs Actual Comparison — FrmBudgetAndActualComp](#9-budget-vs-actual-comparison--frmbudgetandactualcomp)
   - 9.1 Budget Calculation Logic (SP_Bud_and_Actual)
   - 9.2 Budget Components: Yarn, Fabric, Accessories, Production
   - 9.3 Actual Cost Calculation (GRN-Based, Bill-Based, Production-Based)
   - 9.4 Style-Wise Budget vs Actual (SP_Bud_and_ActualStyleWise)
   - 9.5 Budget vs Actual Detail (SP_BudAndActual_Det)
   - 9.6 Variance Analysis
   - 9.7 GUID-Based Session Isolation
   - 9.8 Temporary Table & View Architecture
10. [Expense Management — FrmExpenses / FrmExpenseGroup / FrmExpenseEntryRegister](#10-expense-management--frmexpenses--frmexpensegroup--frmexpenseentryregister)
    - 10.1 Expense Master (Mas_Expenses)
    - 10.2 Expense Group Hierarchy
    - 10.3 Daily Expense Entry (Trs_DailyExpenseEntry)
    - 10.4 Fixed Expenses (FrmFixedExpensesEntry / FixedExpenses_Entry)
    - 10.5 Style-Wise Expenses (FrmStylewiseExpensesEntry)
    - 10.6 Expense Entry Register
11. [Daily Production Costing — Vue_DailyCostingInputData / Trs_DailyPrdn_Costing](#11-daily-production-costing--vue_dailycostinginputdata--trs_dailyprdn_costing)
    - 11.1 Multi-Level Costing Input Structure
    - 11.2 Factory-Level Expenses (Trs_DailyPrdn_Costing2)
    - 11.3 Department-Level Expenses (Trs_DailyPrdn_Costing3)
    - 11.4 Line-Level Expenses (Trs_DailyPrdn_Costing4)
    - 11.5 Order/Style-Level Expenses (Trs_DailyPrdn_Costing5)
    - 11.6 Shift Wage Expense Flag (ShiftWageExp)
12. [Daily Unit P&L — Sp_DailyUnitPANDL](#12-daily-unit-pl--sp_dailyunitpandl)
    - 12.1 P&L Posting Workflow
    - 12.2 Production Value: ProdPcs × Budget Rate
    - 12.3 Size-Wise vs Flat Budget Mode
    - 12.4 Contractor Wage Tracking
    - 12.5 Job Work Receipt Tracking
    - 12.6 Overhead Allocation Algorithm
    - 12.7 Daily P&L Abstract (DailyUnit_P_And_L_Abs)
    - 12.8 Holiday / Weekly-Off Handling
13. [Rate Masters — FrmRateMaster / FrmPrdnRateMaster / FrmCommRateMaster / frmDefaultRate](#13-rate-masters--frmratemaster--frmprdnratemaster--frmcommratemaster--frmdefaultrate)
    - 13.1 Material Rate Master
    - 13.2 Production Rate Master
    - 13.3 Commercial Rate Master
    - 13.4 Default Rate Templates
14. [Rate Confirmation — SP_ApprovedRateCnf1 / SP_PendingRateCnf](#14-rate-confirmation--sp_approvedratecnf1--sp_pendingratecnf)
    - 14.1 Rate Quotation Workflow
    - 14.2 Pending Rate Confirmation Register
    - 14.3 Approved Rate Confirmation Register
    - 14.4 Budget Rate vs Quoted Rate Comparison
15. [P&L Registers & Profitability Reports — FrmPLReg / frmBuyerPLReport](#15-pl-registers--profitability-reports--frmplreg--frmbuyerplreport)
    - 15.1 Order P&L Register (FrmPLReg)
    - 15.2 Buyer P&L Report (frmBuyerPLReport)
    - 15.3 Domestic P&L (Sp_DomesticPL)
    - 15.4 P&L Fabric Detail (SP_PLFabDet / SP_PLFabDet1)
    - 15.5 Net Profit Calculation
16. [One-Page Cost Report — SP_OnePageRpt](#16-one-page-cost-report--sp_onepagerpt)
    - 16.1 Stock Group Configuration (Mas_StockReportGroup)
    - 16.2 Yarn/Fabric/Accessory Stock Summarization
    - 16.3 Stock Valuation (CumBillRate / BudRate Priority)
    - 16.4 BI_STKREPORTS / BI_GrpStockinfo Staging Tables
17. [Order-Style-Wise Cost View — SP_Vue_OrderStyleWiseCost](#17-order-style-wise-cost-view--sp_vue_orderstylewisecost)
    - 17.1 Vue_OrderStyleWiseCost Aggregation
    - 17.2 Cost Components Tracked
    - 17.3 Profit Calculation
18. [Vue_Budget_Det (View) — Consolidated Budget Detail](#18-vue_budget_det-view--consolidated-budget-detail)
    - 18.1 Material Cost (Deliveries × Rate)
    - 18.2 Debit Note Aggregation
    - 18.3 Production Cost Aggregation
    - 18.4 Job Work Cost Aggregation
    - 18.5 Despatch Pieces
19. [Consumption Queries — SP_ConsQuery*](#19-consumption-queries--sp_consquery)
    - 19.1 Fabric Requirement Calculation
    - 19.2 Domestic/Job Order Fabric Requirement
    - 19.3 Consumption per Production Stage
20. [Commercial Template — Frm_CommercialTemplate / FrmOtherPORelatedIps](#20-commercial-template--frm_commercialtemplate--frmother-porelatedips)
    - 20.1 Commercial Cost Template
    - 20.2 Other PO-Related Inputs
21. [Key Business Rules & Formulas Summary](#21-key-business-rules--formulas-summary)
22. [Cross-Module Dependencies](#22-cross-module-dependencies)
23. [Report Templates](#23-report-templates)

---

## 1. Module Overview

The **Costing, Budgeting & Finance** module is the financial nerve centre of FiberPro. It:

- **Pre-costs** orders before production begins (component-level costing, production plan projections)
- **Creates budgets** at the order level: yarn, fabric, accessories, and production stage (CMT) rates — optionally size-wise or color-wise
- **Tracks actual costs** as they accumulate through GRNs, bill-pass, production bills, and debit notes
- **Compares budget vs actual** at summary, style-level, and line-item detail granularity
- **Manages expenses**: daily variable, fixed per-month, style-wise, and production overhead
- **Posts daily production P&L** combining production output × budget rate against actual wages and overhead
- **Manages rate masters** (material, production, commercial, default) and enforces a **rate confirmation** workflow for outsourced stages
- **Generates profitability reports**: order P&L, buyer P&L, domestic P&L, one-page cost summary
- **Maintains cost views** (Vue_OrderStyleWiseCost, Vue_Budget_Det) consumed by dashboards and MIS

The module uses a **GUID-based session isolation** pattern — concurrent users each write budget-vs-actual intermediate results to shared temp tables using a unique GUID, then query view projections filtered by that GUID.

---

## 2. Forms Inventory

| # | Form Class | Purpose |
|---|-----------|---------|
| 1 | `Frm_CostingInput` | Daily production costing input — factory/dept/line/order level expenses |
| 2 | `Frm_ProductionCost` | Production cost dashboard — aggregated view of order-wise production costs |
| 3 | `Frm_ProductionWages` | Production wages entry — shift-wise wage entry per order/style/stage |
| 4 | `Frm_ProdWagesDept` | Production wages by department — aggregated department view |
| 5 | `Frm_ProdWagesStage` | Production wages by stage — stage-wise wage breakdown |
| 6 | `frmBudget` | Budget creation — part-wise/bit-wise CMT rates for an order |
| 7 | `frmBudgetNew_JobWork` | Job work budget — budget entry for outsourced/job-work orders |
| 8 | `FrmBudgetAndActualComp` | Budget vs actual comparison — the core variance analysis form |
| 9 | `frmBudcom` | Budget commercial component — commercial costs (shipping, inspection, etc.) |
| 10 | `FrmPreCostingCompMas` | Pre-costing component master — defines cost components for pre-costing |
| 11 | `frmPreBudgetProdPlan` | Pre-budget production plan — projection before formal budget |
| 12 | `frmPreBudgetProdPlan_New` | Pre-budget production plan (new variant) — updated projection form |
| 13 | `FrmExpenses` | Expense master — defines expense codes and hierarchy |
| 14 | `FrmExpenseGroup` | Expense group — groups expenses for reporting |
| 15 | `FrmExpenseEntryRegister` | Expense entry register — view/query expense entries |
| 16 | `FrmFixedExpensesEntry` | Fixed expenses entry — monthly recurring expenses (rent, salary, etc.) |
| 17 | `FrmStylewiseExpensesEntry` | Style-wise expense allocation — allocate expenses to specific styles |
| 18 | `FrmPLReg` | P&L register — order-level profit and loss report |
| 19 | `frmBuyerPLReport` | Buyer P&L report — buyer-wise profitability analysis |
| 20 | `FrmRateMaster` | Rate master — material purchase rate definitions |
| 21 | `FrmPrdnRateMaster` | Production rate master — standard production stage rates |
| 22 | `FrmCommRateMaster` | Commercial rate master — standard commercial cost rates |
| 23 | `frmDefaultRate` | Default rate template — pre-fill rate masters from templates |
| 24 | `Frm_CommercialTemplate` | Commercial cost template — standard commercial cost structure |
| 25 | `FrmOtherPORelatedIps` | Other PO-related inputs — additional cost inputs linked to POs |
| 26 | `FrmProdExpenses` | Production expenses form — production overhead entry |
| 27 | `FrmMasExpenses` | Expense master maintenance — CRUD for expense definitions |

---

## 3. Data Model — Core Costing & Budget Tables

### 3.1 Temp_BudgetAndActual — Budget vs Actual Working Table

Session-scoped working table used by `SP_Bud_and_Actual*` procedures. Each row represents one budget/actual line item for one order/department combination.

| Column | Type | Purpose |
|--------|------|---------|
| Guid | nvarchar(256) | Session identifier — prevents cross-user interference |
| Slno | int | Section: 1=Material, 2=PcsProcess, 3=CMT Stages |
| OrdId | int | FK → OrderMas.OrdId |
| DeptId | int | FK → Mas_Dept.DeptID (yarn/fabric/acc/production dept) |
| StageID | int | FK → Mas_JobWrkComp.Id (production work stage) |
| BudgetQty | numeric(18,3) | Budget quantity (KGs, Mtrs, or Pcs) |
| BudgetAmt | numeric(18,2) | Budget amount = BudgetQty × Rate |
| ActualQty | numeric(18,3) | Actual quantity from GRNs/bills |
| ActualAmt | numeric(18,2) | Actual amount from bills |
| IndexNo | int | Display sequence number |
| Description | varchar | Display name for the cost element |
| Type | varchar | 'Y' (Yarn), 'F' (Fabric), 'A' (Accessories), 'P' (Production), etc. |
| ProcessSno | int | Process sequence: 1=yarn/fabric, 2=accessories, 3=other arrival, 4=CMT |
| AccCatID | int | Accessory category ID (variant _2 only — category-wise accessories) |

**Associated Views:**
- `Vue_BudVsAct` — Aggregates by Guid/OrdId/StageID/DeptID for detailed display
- `Vue_BudVsAct_Consolid` — Aggregates by Guid/OrdId/IndexNo for consolidated summary

### 3.2 Temp_BudgetAndActualAbs — Budget vs Actual Abstract

Abstract/summary table populated alongside Temp_BudgetAndActual. Stores aggregated budget vs actual for accessories and other components.

### 3.3 Temp_BudgetAndActualStyle — Style-Wise Budget Working Table

Used by `SP_Bud_and_ActualStyleWise`. Same structure as 3.1 but with an additional `StyleNo` column for style-level breakdown.

### 3.4 Temp_BudgetAndActual_Det — Budget vs Actual Detail

Detailed line-item table used by `SP_BudAndActual_Det*`. Provides dept/fabric/count/color level granularity.

| Column | Type | Purpose |
|--------|------|---------|
| Guid | varchar(256) | Session identifier |
| Slno | int | Section: 1=Yarn, 2=Fabric, 3=Accessories, 4=Production |
| Type | varchar(50) | 'YARN DETAILS', 'FABRIC DETAILS', 'ACCESSORIES', 'PCS PROCESS' |
| OrdId | int | Order ID |
| DeptId | int | Department ID |
| DeptName | varchar(50) | Department name |
| FabId | int | Fabric ID (for fabric detail lines) |
| CntId | int | Count ID (for yarn detail lines) |
| AccTypeId | int | Accessory type (for accessory lines) |
| AccDesc | int | Accessory description code |
| SizeDesc | int | Size for accessories |
| ColorId | int | Color ID |
| StyleNo | varchar(20) | Style number |
| ComId | int | Commercial component ID |
| BudgetQty | numeric(18,3) | Budget quantity |
| BudgetAmt | numeric(18,2) | Budget amount |
| ActualQty | numeric(18,3) | Actual quantity |
| ActualAmt | numeric(18,2) | Actual amount |
| PrsType | varchar | Source type: '', 'OPENINGSTOCK', 'TFRIN', 'TFROUT' |

### 3.5 DailyUnit_P_and_L — Daily Production P&L Line Items

Each row = one date/unit/order/style/part/stage production P&L entry.

| Column | Type | Purpose |
|--------|------|---------|
| Coycode | int | Unit/company code |
| PLDate | date | P&L date |
| OrdId | int | Order ID |
| StyleNo | varchar | Style number |
| PartId | int | Garment part ID |
| StageId | int | Production stage/work nature |
| Shift_ProdQty | int | Shift production pieces |
| Contractor_Prod_Pcs | int | Contractor-produced pieces |
| BudgetRate | numeric | Budget rate per piece |
| BudgetValue | numeric | ProdQty × BudgetRate |
| Shift_ActualWages | numeric | Actual shift wages paid |
| Actual_AddlAmount | numeric | Additional actual amounts |
| Contractor_Actual_Wages | numeric | Contractor actual wages |
| JobWrk_Pcs | int | Job-work received pieces |
| JobWrk_ActualAmt | numeric | Job-work actual billing amount |
| OverHeads | numeric | Allocated overhead amount |
| BudgetOverheadAmt | numeric | Budget overhead (BudgetValue × ProdOverheads%) |
| Admin_BudgetValue | numeric | Administrative budget value |

### 3.6 DailyUnit_P_And_L_Abs — Daily P&L Abstract

One row per date/unit. Summary of all production P&L for the day.

| Column | Type | Purpose |
|--------|------|---------|
| Coycode | int | Unit code |
| PLDate | date | P&L date |
| OverHead_Percent | numeric | Configured overhead % (from Options.Budget_OverHead_Percent) |
| Total_BudgetValue | numeric | Sum of all BudgetValue for the day |
| Budget_Overhead_Value | numeric | Total_BudgetValue × OverHead_Percent / 100 |
| Shift_Total_ActualValue | numeric | Sum of all actual shift wages + additional amounts |
| Contractor_Total_Actual_Wages | numeric | Sum of contractor wages |
| ActualOverhead_Value | numeric | Daily expense entry total + fixed expenses pro-rata |
| Actual_OverHead_Percent | numeric | (ActualOverhead / (ShiftTotal + ContractorTotal)) × 100 |
| Shift_TotProdnQty | int | Total production pieces |
| Contractor_Total_Prod_Pcs | int | Total contractor pieces |
| JobWrk_Total_Pcs | int | Total job-work pieces |
| JobWrk_Total_ActualAmt | numeric | Total job-work amounts |

### 3.7 ORDERSTYLEWISECOST — Order-Style Cost Summary

Persistent summary table storing per-order/style cost breakdowns. Updated by various costing processes.

| Column | Type | Purpose |
|--------|------|---------|
| OrdId | int | Order ID |
| StyleNo | varchar | Style number |
| StyleQty | int | Style quantity |
| FabricReqKGs | numeric | Required fabric KGs |
| Fabric_Cost_Per_UOM | numeric | Fabric cost per unit of measure |
| TotalBudgetAccValue | numeric | Total budget accessories value |
| TotalBudgetProdValue | numeric | Total budget production (CMT) value |
| TotalBudgetCommValue | numeric | Total budget commercial value |
| BudgetFabricValue | numeric | Total budget fabric value |
| BuyComm | numeric | Buyer commission |
| DDBValue | numeric | Duty drawback value |
| ProfitPercent | numeric | Profit percentage |
| ProfitValue | numeric | Profit value |
| Actual_FabricValue | numeric | Actual fabric costs |
| Actual_AccValue | numeric | Actual accessories costs |
| Actual_ProdnValue | numeric | Actual production costs |
| Actual_CommValue | numeric | Actual commercial costs |
| Actual_BuyComm | numeric | Actual buyer commission |
| Actual_DDBValue | numeric | Actual duty drawback |
| ShippedQty | int | Quantity shipped |
| ShippedValue | numeric | Shipped value |
| BudgetShippedValue | numeric | Budget shipped value |
| Budget_ProdOverHeadValue | numeric | Budget production overhead |
| Actual_ProdOverHeadValue | numeric | Actual production overhead |
| Total_ActualCreditValue | numeric | Total credits |
| Total_ActualDebitValue | numeric | Total debits |
| NetProfitValue | numeric | Net profit |
| NetActualValue | numeric | Net actual total cost |
| NetBudgetValue | numeric | Net budget total cost |
| SalesAmt | numeric | Sales invoice amount |
| Supplier_Bill_Amt | numeric | Supplier billing amount |
| Emb_Printing_Actual_Amt | numeric | Embroidery/printing actual amount |
| FabSalesAmt | numeric | Fabric sales amount |
| AccSalesAmt | numeric | Accessory sales amount |
| PcsSalesAmt | numeric | Piece sales amount |

### 3.8 OrderStylewiseCost_Grp — Grouped Cost Summary

Aggregated order-cost by stock report groups. Updated by SP_1 and SP_2_ACC using dynamic SQL against budget abstract views.

### 3.9–3.12 ST_Cost_Factory / ST_Cost_Dept / ST_Cost_OrderDtl / ST_DailyCostingInputData

Production costing hierarchy tables — **factory → department → order** granularity.

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| ST_Cost_Factory | Dt, unit_id, budget_value, actual_value, UpdateFlg | Factory-level daily cost aggregation |
| ST_Cost_Dept | Dt, unit_id, Dept_id, Line_id, budget_value, actual_value, UpdateFlg | Dept + line level cost |
| ST_Cost_OrderDtl | Dt, unit_id, Dept_id, Line_id, Order_id, Styleno, budget_value, actual_value, UpdateFlg | Order-level cost detail |
| ST_DailyCostingInputData | ID, serverid, UpdateFlg | Daily costing input master with sync flag |

All four tables have **triggers** that set `UpdateFlg = 1` when `budget_value` or `actual_value` is modified — supporting a change-tracking / sync mechanism for multi-unit deployments.

### 3.13 Pro_Prod_PartwiseRate — Part-Wise Budget Rates

Core budget rate table — one row per order/style/part/work-nature combination.

| Column | Type | Purpose |
|--------|------|---------|
| OrdID | int | Order ID |
| StyleNo | varchar | Style number |
| PartID | int | Garment part (front, back, sleeve, etc.) |
| WrkID | int | Work nature / stage (FK → Mas_JobWrkComp.Id) |
| Rate | numeric | In-house production rate per piece |
| JobWrkRate | numeric | Outsourced (job work) rate per piece |
| AddRate | numeric | Additional rate component |
| JobWrkAddRate | numeric | Additional job-work rate |
| ActualRate | numeric | Actual achieved rate |
| OrderQty | int | Order quantity for this part |
| OrderQtyExcess | int | Order quantity including excess |
| GrdSlno | int | Grid display sequence |
| DesignDescription | varchar | Design/variant description |
| BitSizeId | int | Bit-size ID for bit-based operations |

### 3.14 Pro_Prod_BitCutRate — Bit/Cut Budget Rates

For garments where production is measured in "bits" (sub-pieces), rates are defined per bit:

| Column | Type | Purpose |
|--------|------|---------|
| OrdID | int | Order ID |
| StyleNo | varchar | Style number |
| PartID | int | Part ID |
| Wrk_ID | int | Work nature / stage |
| Rate | numeric | Rate per piece |
| JobWrkRate | numeric | Job-work rate |
| NoofPcsPer_Bit | int | Number of pieces per bit |
| PcsWt | numeric | Piece weight |
| BitSizeId | int | Bit-size ID |
| DesignDescription | varchar | Design variant |

### 3.15 Pro_Prod_Budget_Det — Production Budget KGs Detail

Stores budget KGs for production departments where billing is by weight (KGs) rather than piece count. Used for departments where `Mas_Dept.ProcBill = 'K'`.

### 3.16 Bud_InhRateclw — In-House Rate (Color/Size-Wise)

Extended budget rate table allowing rates to vary by color and size:

| Column | Type | Purpose |
|--------|------|---------|
| OrdID | int | Order ID |
| StyleNo | varchar | Style number |
| PartID | int | Part ID |
| NWork | int | Work nature / stage |
| ClrID | int | Color ID |
| SizeID | int | Size ID |
| Rate_Pcs | numeric | Rate per piece |
| JobWrkRate | numeric | Job-work rate per piece |

Used when the system option `BudRt_Inhccw = 'Y'` (in-house rate color/size-wise) is enabled.

### 3.17 Pro_RateCnfPcs1 / Pro_RateCnfPcs2 — Rate Confirmation

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| Pro_RateCnfPcs1 (Header) | ID, QuotNo, Finyear, PartyID, ProdnType ('O'=outside, 'I'=inhouse) | Rate quotation header |
| Pro_RateCnfPcs2 (Detail) | ID, OrdID, StyleNo, PartID, StageId, Rate, Approved (0/1) | Rate quotation line items |

### 3.18 Trs_ProdWages — Production Wages Transaction

| Column | Type | Purpose |
|--------|------|---------|
| Coycode | int | Unit code |
| OrdId | int | Order ID |
| StyleNo | varchar | Style number |
| PartID | int | Part ID |
| StageId | int | Production stage |
| EntryDate | date | Wages date |
| ShiftWages | numeric | Shift wages amount |
| Addl_Amount | numeric | Additional wage amount |

### 3.19 Trs_ProdShiftWages — Production Shift Wages

Shift-level wage entries linked to production stages. Referenced by `Vue_Budget_Det` for production cost aggregation.

### 3.20 Trs_DailyExpenseEntry — Daily Expense Entry

| Column | Type | Purpose |
|--------|------|---------|
| Coycode | int | Unit code |
| EntryDate | date | Entry date |
| Amount | numeric | Expense amount |

Aggregated by company and date for overhead calculation in Daily P&L.

### 3.21 FixedExpenses_Entry / Trs_FixedExpensesDateWise — Fixed Expenses

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| FixedExpenses_Entry | Coycode, ExpensesCode, PerMonthAmt, PerDayAmount | Monthly fixed expense definitions |
| Trs_FixedExpensesDateWise | DT, Coycode, ExpensesCode, PerMonthAmt, PerDayAmt | Date-wise materialization (computed by Daily P&L) |

During Daily P&L posting, `FixedExpenses_Entry` rows are materialized into `Trs_FixedExpensesDateWise` for the P&L date, converting monthly amounts to daily pro-rata.

### 3.22 Trs_DailyPrdn_Costing1–5 — Daily Production Costing Levels

Multi-level daily costing expense structure:

| Table | Level | Key Columns |
|-------|-------|-------------|
| Trs_DailyPrdn_Costing1 | Header | ID, EntryDt, Coycode |
| Trs_DailyPrdn_Costing2 | Factory-level | ID, ExpId, Amount |
| Trs_DailyPrdn_Costing3 | Department-level | ID, ExpId, Amount, DeptId |
| Trs_DailyPrdn_Costing4 | Line-level | ID, ExpId, Amount, LineId |
| Trs_DailyPrdn_Costing5 | Order/Style-level | ID, ExpId, Amount, OrdId, StyleNo |

Each level links to `Mas_Expenses` for the expense definition and classification.

### 3.23 Mas_Expenses — Expense Master

| Column | Type | Purpose |
|--------|------|---------|
| ExpId | int | Expense ID (PK) |
| ExpName | varchar | Expense name |
| Exp_Level | varchar | Level: 'FACTORY', 'DEPT', 'LINE', 'ORDER' |
| ShiftWageExp | bit/flag | Whether this expense represents shift-wage type |

### 3.24 temp_DomesticPL — Domestic P&L Working Table

Session-scoped working table for domestic order P&L calculation.

| Column | Type | Purpose |
|--------|------|---------|
| OrdId | int | Order ID |
| Buyer | varchar | Buyer name |
| IoNo | varchar | Job/IO number |
| Finyear | varchar | Financial year |
| Style | varchar | Style |
| OrderQty | int | Order quantity |
| OrdDate | date | Order date |
| Season | varchar | Season |
| Category | varchar | Buyer department/category |
| MerchID | int | Merchandiser ID |
| BrandId | int | Brand ID |
| FabricCost | numeric | Fabric cost (yarn + fabric process) |
| TrimsCost | numeric | Trims/accessories cost |
| ProductionCost | numeric | Production cost (in-house + outsourced) |
| Emblish | numeric | Embellishment cost |
| CommercialCost | numeric | Commercial cost |
| ShippedQty | int | Shipped quantity |
| ShippedValue | numeric | Shipped value |
| OtherSale | numeric | Other sale amounts |
| Overheads | numeric | Overhead allocation |
| OtherExp | numeric | Other expenses |

### 3.25 StockRatePost — Cumulative Bill Rate / Budget Rate

Central rate-posting table linking stock items to their cumulative cost rates. Referenced by budget-vs-actual, one-page report, and P&L calculations.

| Column | Type | Purpose |
|--------|------|---------|
| OrdId | int | Order ID |
| DeptId | int | Department ID |
| CntId | int | Count ID |
| FabId | int | Fabric ID |
| ColId | int | Color ID |
| DesignId | int | Design ID |
| CumBillRate | numeric | Cumulative bill rate (actual) |
| BudRate | numeric | Budget rate |

### 3.26 PcsStockRatePost — Piece Stock Rate Posting

Per-piece cumulative rate for garment stock valuation. Stores in-house rate, outside rate, cumulative budget rate, cumulative bill rate, fabric value, and accessories value per piece at each production stage.

### 3.27 Vue_Budget_Det (View) — Consolidated Budget Detail

```sql
Vue_Budget_Det = 
  Material Transfer Amount (TrType=3)
  + Material Transfer-In Amount (TranOrdID)
  + Direct Debit Amounts (non-accessories)
  + In-House Production Cost (via Trs_ProdEntry × Rate, joining ProdBill)
  + Shift Wages (Trs_ProdShiftWages for StageId=1)
  + Despatch Pieces (Trs_Pcs2 where DelType='Despatch')
  + Accessories Direct Debit (DeptID=16 or AccProsDept='Y')
  + Standalone Debit Notes (Trs_Deb1/2)
  + Job Work Bills (Trs_BillRate via Trs_PcsGrn1 receipt linkage)
```

Per order, this view aggregates: `Amount` (transfer out), `Amount1` (transfer in), `DebitAmount`, `DebitAmount1` (acc debits), `ProdAmount`, `Jobwork`, `DespPcs`.

### 3.28 Vue_DailyCostingInputData (View)

Flattened UNION of the four daily costing expense levels:

```sql
SELECT EntryDt, Coycode, ExpId, Amount, Exp_Level, 0 DeptId, 0 LineId, 0 OrdId, '' Styleno, ShiftWageExp
FROM Trs_DailyPrdn_Costing1 × Trs_DailyPrdn_Costing2 × Mas_Expenses
UNION
-- Department-level (adds DeptId)
UNION
-- Line-level (adds LineId, DeptId from Options.Stitching_DeptCode)
UNION
-- Order/Style-level (adds OrdId, StyleNo)
```

---

## 4. Pre-Costing & Component Master — FrmPreCostingCompMas

### 4.1 Pre-Costing Component Setup

`FrmPreCostingCompMas` defines the cost components used in pre-costing analysis before an order goes into full budget mode. Components typically include: yarn cost, fabric cost, CMT (cut-make-trim), accessories, commercial, overhead, and profit margin.

### 4.2 Component Rate Definition

Each component has a predefined rate or formula. The form allows users to define component codes, descriptions, and default rates that feed into the pre-budget production plan.

### 4.3 Pre-Costing Calculation Logic

Pre-costing is a **preliminary estimate** before the detailed order budget is created. It uses:

- Standard rates from rate masters
- Historical averages from previous similar orders
- Component-wise breakdown to provide a cost-per-piece estimate for buyer quotations

---

## 5. Pre-Budget Production Plan — frmPreBudgetProdPlan / _New

### 5.1 Pre-Budget Entry

`frmPreBudgetProdPlan` and `frmPreBudgetProdPlan_New` allow creation of production plan projections before the formal budget is established. These plans estimate:

- Production quantities per style/part
- Expected production rates
- Material requirements (estimated from consumption programs)
- Timeline projections

### 5.2 Production Plan Projection

The pre-budget plan provides an early view of expected costs, typically used during the order negotiation phase to determine whether the order is profitable at the proposed sale rate.

---

## 6. Budget Creation — frmBudget / frmBudgetNew_JobWork / frmBudcom

### 6.1 Budget Rate Setup Workflow

Budget creation is the formal costing step where rates are defined for each production stage:

1. **Select Order** → Load order details (styles, parts, quantities)
2. **Define material requirements** → Yarn (Pro_ReqYarn/2), Fabric (Pro_ReqKnitt/2), Accessories (Pro_AccReq / Pro_AccBudRate) — these feed into budget calculations
3. **Define production rates** → Per part/stage using `frmBudget`
4. **Define commercial costs** → Via `frmBudcom`
5. **Confirm rates** → Via rate confirmation workflow

### 6.2 Part-Wise Rate Entry (Pro_Prod_PartwiseRate)

`frmBudget` populates `Pro_Prod_PartwiseRate` — one rate per order/style/part/work-stage:

- **Rate**: In-house production rate (per piece or per part)
- **JobWrkRate**: Outsourced job-work rate
- **AddRate**: Additional rate component (e.g., thread, utilities)
- **JobWrkAddRate**: Additional job-work charges
- **OrderQty**: Planned quantity
- **OrderQtyExcess**: Quantity including planned excess percentage

**SP_BudgetQry2** queries this table to display rates in the budget form, with special handling:
```
NoofPcsPerBit = AVG(OrderQtyDtl.NoOfPcsPerBit)
  when WrkId = -2 (cutting-related) or Related_Stage = -2
```

### 6.3 Bit/Cut Rate Entry (Pro_Prod_BitCutRate)

For garments with bit-based production, `Pro_Prod_BitCutRate` stores rates at the bit level. **SP_BudgetQry1** queries this table, joining with `Mas_Part` for part names.

### 6.4 Job Work Budget (frmBudgetNew_JobWork)

Specialized budget form for job-work type orders (`OrderMas.JobType = 'Job'`). Key differences:

- Uses `OrderQtyDtl` directly for quantities (not `Pro_Prod_PartwiseRate.OrderQty`)
- Evaluates both Rate and JobWrkRate and chooses whichever is non-zero
- Handles `CutPlanQty` for excess budgeting

### 6.5 Budget Commercial Component (frmBudcom)

Captures non-material, non-production costs:

- Shipping/freight charges
- Inspection costs
- Commercial documentation costs
- Buyer commission (BuyComm)
- Duty drawback (DDB)
- Other commercial overheads

These are stored in commercial-related tables and feed into the `TotalBudgetCommValue` in ORDERSTYLEWISECOST.

### 6.6 In-House Rate Entry (Bud_InhRateclw — Color/Size-Wise)

When system option `BudRt_Inhccw = 'Y'`, rates can be defined at color × size × part × stage granularity. The `SP_Bud_and_Actual_1` procedure uses `Bud_InhRateclw` instead of `Pro_Prod_PartwiseRate` for budget calculations:

```
Rate = AVG(Bud_InhRateclw.Rate_Pcs)   -- if > 0
  else AVG(Bud_InhRateclw.JobWrkRate)
```

### 6.7 Size-Wise Budget Option (BudRT_CMT_SizeWise)

System option `Options.BudRT_CMT_SizeWise`:

- **'N'** (default): Flat rate per part/stage — uses `Pro_Prod_PartwiseRate`
- **'Y'**: Size-wise rates — uses `Bud_InhRateclw` with size-level granularity

This affects both budget calculation (SP_Bud_and_Actual_1) and Daily P&L posting (Sp_DailyUnitPANDL).

### 6.8 Excess Handling in Budget (Allow_Excess_InBudget)

System option `Options.Allow_Excess_InBudget`:

- **'N'**: Budget uses exact `OrderQty`
- **'Y'**: Budget uses `CutPlanQty` (which includes planned excess %) or `OrderQtyExcess`

For finished stages, excess is calculated:
$$\text{ExcessQty} = \lceil \text{SizeQty} + \text{SizeQty} \times \frac{\text{Exs\_Per}}{100} \rceil$$

---

## 7. Production Cost Entry — Frm_CostingInput / Frm_ProductionCost

### 7.1 Daily Costing Input (ST_DailyCostingInputData)

`Frm_CostingInput` captures daily production costing data at multiple levels:

1. **Factory-level** — Overall factory expenses (Trs_DailyPrdn_Costing2)
2. **Department-level** — Per-department expenses (Trs_DailyPrdn_Costing3)
3. **Line-level** — Per-production-line expenses (Trs_DailyPrdn_Costing4)
4. **Order/Style-level** — Per-order/style expenses (Trs_DailyPrdn_Costing5)

The `ST_DailyCostingInputData` master table tracks the costing input record with a sync mechanism (`UpdateFlg`).

### 7.2 Factory-Level Cost Posting (ST_Cost_Factory)

Stores aggregated factory-wide costs by date and unit, with both budget and actual values. Trigger `Trg_ST_Cost_Factory` sets `UpdateFlg = 1` when budget or actual values change.

### 7.3 Department-Level Cost Posting (ST_Cost_Dept)

Stores cost by date/unit/department/line. Trigger `Trg_ST_Cost_Dept` sets `UpdateFlg = 1` on budget/actual changes, tracking which specific department/line combinations have been modified.

### 7.4 Order-Level Cost Detail (ST_Cost_OrderDtl)

Stores cost at the granular order/style/department/line level. Trigger `Trg_ST_Cost_OrderDtl` sets `UpdateFlg = 1` on changes, specifically keyed by `Order_ID + Styleno + Dept_id + Line_id + Dt`.

### 7.5 Costing Triggers (UpdateFlg Mechanism)

All four costing tables share an identical trigger pattern:

```sql
AFTER UPDATE: IF update(budget_value) OR update(actual_value)
  → SET UpdateFlg = 1
```

This `UpdateFlg` mechanism enables:
- **Change detection** for syncing between multi-unit deployments
- **Incremental processing** — only re-process rows where UpdateFlg=1
- External systems can poll for changed records and reset the flag after processing

---

## 8. Production Wages — Frm_ProductionWages / Frm_ProdWagesDept / Frm_ProdWagesStage

### 8.1 Shift Wages Entry (Trs_ProdWages)

`Frm_ProductionWages` captures daily shift wages per order/style/part/stage:

- **ShiftWages**: The wage amount for the shift
- **Addl_Amount**: Any additional wage component (overtime, incentives)
- **EntryDate**: Date of the shift
- **CoyCode**: Unit/company

Wages are entered either per shift session or at stage granularity, depending on the form variant used.

### 8.2 Department-Wise Wage Aggregation (Frm_ProdWagesDept)

Aggregates production wages at the department level, providing a summary view of labor costs per department. Used for department-level cost analysis.

### 8.3 Stage-Wise Wage Breakdown (Frm_ProdWagesStage)

Breaks down wages by production stage (cutting, stitching, finishing, etc.), allowing stage-level labor cost tracking.

### 8.4 Shift Wages in Daily P&L

Production wages flow into the Daily P&L through:

```sql
UPDATE DailyUnit_P_and_L
SET Shift_ActualWages = SUM(Trs_ProdWages.ShiftWages),
    Actual_AddlAmount = SUM(Trs_ProdWages.Addl_Amount)
WHERE EntryDate = @PostDate
GROUP BY Coycode, OrdId, StyleNo, PartID, StageId
```

Additionally, `Trs_ProdShiftWages` (shift-level wages for stitching stage, StageId=1) contributes to `Vue_Budget_Det.ProdAmount`.

---

## 9. Budget vs Actual Comparison — FrmBudgetAndActualComp

This is the **central costing analysis** functionality. The form calls `SP_Bud_and_Actual` (or variant _1, _2 depending on customer configuration) to populate comparison data.

### 9.1 Budget Calculation Logic (SP_Bud_and_Actual)

Budget amounts are calculated from **requirement tables** (quantities planned at order time) multiplied by **budget rates**:

**Yarn Budget:**
$$\text{BudgetAmt}_{yarn} = \begin{cases}
\sum \text{Pro\_ReqYarn2.Qty} \times \text{Rate} & \text{if Manual\_BudgetKGs\_Entry = 'Y'} \\
\sum \text{Pro\_ReqYarn.ReqKgs} \times \text{Rate} & \text{otherwise}
\end{cases}$$

**Fabric Budget:**
$$\text{BudgetAmt}_{fabric} = \sum \begin{cases}
\text{ReqKgs} \times \text{Rate} & \text{if RateUOM = 'KGS'} \\
\text{ReqMtr} \times \text{Rate} & \text{otherwise}
\end{cases}$$

**Accessories Budget:**
$$\text{BudgetAmt}_{acc} = \sum \text{Pro\_AccReq.ReqdQty} \times \text{Pro\_AccBudRate.BudRate}$$

Split into:
- **Purchase accessories** → DeptID=16
- **Process accessories** → DeptID from `PRO_AccReq.PrsID` where `Mas_Dept.AccProsDept='Y'`

**Piece Process (PcsProcess) Budget:**
$$\text{BudgetAmt}_{pcs} = \sum \text{Pro\_ProdPros.Qty} \times \text{Pro\_ProdPros.Rate}$$

### 9.2 Budget Components: Yarn, Fabric, Accessories, Production

**Semi-Finished CMT Budget** (stages where `Mas_Dept.SEMIFINISH = 'S'`):

For standard orders:
$$\text{BudgetAmt}_{semi} = \sum \text{OrderQty} \times \begin{cases}
\text{Rate} & \text{if Rate > 0} \\
\text{JobWrkRate} & \text{otherwise}
\end{cases}$$

For bit-based production (variant _1):
$$\text{BudgetAmt}_{bit} = \sum \frac{\text{OrderQty}}{\text{NoofPcsPerBit}} \times \text{Rate\_Pcs}$$

For KGs-based billing (`ProcBill = 'K'`):
$$\text{BudgetAmt}_{kgs} = \text{Pro\_Prod\_Budget\_Det.Kgs} \times \text{Rate\_Pcs}$$

**Finished CMT Budget** (stages where `Mas_Dept.SEMIFINISH = 'F'`):
$$\text{BudgetAmt}_{fin} = \sum \text{SizeQty} \times (\text{Rate} + \text{AddRate})$$

With excess: $\text{SizeQty} = \lceil \text{OrdQtyClrDtl.SizeQty} + \text{SizeQty} \times \frac{\text{Exs\_Per}}{100} \rceil$

### 9.3 Actual Cost Calculation (GRN-Based, Bill-Based, Production-Based)

Actual costs are sourced from:

1. **Yarn Actuals** — From `Trs_BillRate` joined with `Trs_BillAddded` where `AddDedName='Gross Amount'` and `Grp=4` (fabric/yarn bills), with support for:
   - Tax-inclusive (`@Reqd_TaxInPL='Y'` → uses `NetAmount`) or tax-exclusive (`→ Amount`)
   - Multi-currency (FCY × ExchangeRate)
   - Hot process rates (unplanned yarn processes)
   - Opening stock quantities and values
   - Transfer in/out adjustments

2. **Fabric Actuals** — Same bill-based approach, handling:
   - Purchase bills vs process bills
   - Opening stock
   - Transfer in/out
   - Color-based vs standard rate methods (`RateMethod <> 'Colour'`)

3. **Accessories Actuals** — From GRN receipts and bill amounts for accessory departments

4. **Production Actuals** — From `Trs_ProdBillMasNew/DetNew` (in-house production bills) and `Trs_Bills/Trs_BillRate` (outsourced job-work bills linked via `Trs_PcsGrn1`)

5. **Production Entry Actuals** — Direct production entry amounts from `Trs_ProdEntry` × Rate

### 9.4 Style-Wise Budget vs Actual (SP_Bud_and_ActualStyleWise)

`SP_Bud_and_ActualStyleWise` produces the same budget-vs-actual analysis but broken down by `StyleNo` within the order. It writes to `Temp_BudgetAndActualStyle` (which adds a StyleNo column).

This procedure respects:
- `BudRT_CMT_SizeWise` option for rate source selection
- `BudRt_Inhccw` option for in-house rate color-wise
- Shipping bill type detection (Type via `ShippingBill/ShippingBill_Det`)

### 9.5 Budget vs Actual Detail (SP_BudAndActual_Det)

`SP_BudAndActual_Det` (and variant `_1`) provides line-item granularity in `Temp_BudgetAndActual_Det`:

- **Yarn Details** (Slno=1): Per dept/count/color breakdown
  - Budget: `Pro_ReqYarn.ReqKgs × Pro_ReqYarn2.Rate`
  - Actual: Bill amounts (Gross Amount group-4) per dept/count/color
  - Adjustments: Opening stock, transfer in (+), transfer out (-)
  - Hot process yarn handling

- **Fabric Details** (Slno=2): Per dept/fabric/count/color breakdown
  - Budget: `Pro_ReqKnitt.ReqKgs/ReqMtr × Pro_ReqKnitt2.Rate`
  - Actual: Bill amounts per GRN linkage
  - Color-based rate method exception (`RateMethod='Colour'`)
  - Hot process fabric handling
  - Opening stock, transfer in/out adjustments

- **Accessories Details** (Slno=3): Per accessory type/description/size/color

- **CMT/Production Details** (Slno=4): Per stage, with shift wages + production bills

Variant `_1` differs from base version by:
- Treating opening stock, transfer-in, and transfer-out as **separate line items** (with `PrsType` column) rather than adjustments to existing lines
- Using `StockRatePost.CumBillRate` for budget valuation of opening stock / transfers instead of requirement rates

### 9.6 Variance Analysis

Variance is calculated at the display level:
$$\text{Variance} = \text{BudgetAmt} - \text{ActualAmt}$$
$$\text{Variance\%} = \frac{\text{BudgetAmt} - \text{ActualAmt}}{\text{BudgetAmt}} \times 100$$

Positive variance = under-budget (saving), negative = over-budget (overrun).

### 9.7 GUID-Based Session Isolation

All budget-vs-actual procedures use a `@Guid` parameter:

1. **On entry**: `DELETE FROM Temp_BudgetAndActual WHERE Guid = @Guid`
2. **All inserts**: Include `@Guid` in the Guid column
3. **Views filter by Guid**: `Vue_BudVsAct` and `Vue_BudVsAct_Consolid` include Guid in GROUP BY
4. **Client reads**: Query views filtered by their Guid

This allows concurrent users to run budget-vs-actual analysis without data interference.

### 9.8 Temporary Table & View Architecture

```
SP_Bud_and_Actual → Temp_BudgetAndActual
                   → Temp_BudgetAndActualAbs
                   ↓
       Vue_BudVsAct (detailed, grouped by Stage/Dept)
       Vue_BudVsAct_Consolid (summary, grouped by IndexNo/DispName)
                   ↓
       FrmBudgetAndActualComp (UI display)
```

---

## 10. Expense Management — FrmExpenses / FrmExpenseGroup / FrmExpenseEntryRegister

### 10.1 Expense Master (Mas_Expenses)

`FrmExpenses` / `FrmMasExpenses` manage the expense master table:

- **ExpId**: Unique expense code
- **ExpName**: Description (e.g., "Electricity", "Thread", "Needles", "Rent")
- **Exp_Level**: Determines at which costing level the expense operates:
  - `'FACTORY'` — Applies factory-wide
  - `'DEPT'` — Department-specific
  - `'LINE'` — Production-line-specific
  - `'ORDER'` — Order/style-specific
- **ShiftWageExp**: Flag indicating this expense represents shift production wages (special handling in P&L)

### 10.2 Expense Group Hierarchy

`FrmExpenseGroup` allows grouping expenses for reporting purposes, enabling drill-down from category to individual expense in management reports.

### 10.3 Daily Expense Entry (Trs_DailyExpenseEntry)

Day-to-day variable expenses entered per unit. Aggregated by date and unit for overhead calculation:

```sql
-- Used in Sp_DailyUnitPANDL:
UPDATE DailyUnit_P_And_L_Abs
SET ActualOverhead_Value = SUM(Trs_DailyExpenseEntry.Amount)
WHERE EntryDate = @PostDate
GROUP BY Coycode
```

### 10.4 Fixed Expenses (FrmFixedExpensesEntry / FixedExpenses_Entry)

`FrmFixedExpensesEntry` defines monthly fixed expenses (rent, salaries, insurance, etc.):

- `PerMonthAmt` — Monthly amount
- `PerDayAmount` — Pre-calculated daily pro-rata

During Daily P&L posting, these are materialized to `Trs_FixedExpensesDateWise`:
```sql
INSERT INTO Trs_FixedExpensesDateWise
SELECT @PostDate, Coycode, ExpensesCode, PerMonthAmt, PerDayAmount
FROM FixedExpenses_Entry
```

Then added to overhead:
```sql
UPDATE DailyUnit_P_And_L_Abs
SET ActualOverhead_Value += SUM(PerDayAmt)
FROM Trs_FixedExpensesDateWise WHERE DT = @PostDate
```

### 10.5 Style-Wise Expenses (FrmStylewiseExpensesEntry)

Allows allocating specific expenses to individual styles within an order. Useful for:
- Embroidery/printing costs specific to certain styles
- Special processing charges per style
- Testing/inspection costs

### 10.6 Expense Entry Register (FrmExpenseEntryRegister)

Query form to view and filter expense entries by date range, unit, expense type, and level. Used for auditing and reconciliation.

---

## 11. Daily Production Costing — Vue_DailyCostingInputData / Trs_DailyPrdn_Costing

### 11.1 Multi-Level Costing Input Structure

Daily production costing captures expenses at four granularity levels, all linked through a common header (Trs_DailyPrdn_Costing1):

```
Trs_DailyPrdn_Costing1 (Header: EntryDt, Coycode)
├── Trs_DailyPrdn_Costing2 (Factory-level: ExpId, Amount)
├── Trs_DailyPrdn_Costing3 (Department-level: ExpId, Amount, DeptId)
├── Trs_DailyPrdn_Costing4 (Line-level: ExpId, Amount, LineId)
└── Trs_DailyPrdn_Costing5 (Order/Style-level: ExpId, Amount, OrdId, StyleNo)
```

### 11.2 Factory-Level Expenses (Trs_DailyPrdn_Costing2)

Expenses that apply to the entire factory: power/electricity, water, general maintenance, security. No department or order allocation.

### 11.3 Department-Level Expenses (Trs_DailyPrdn_Costing3)

Expenses allocated to a specific department: department-specific consumables, department machinery maintenance. DeptId links to `Mas_Dept`.

### 11.4 Line-Level Expenses (Trs_DailyPrdn_Costing4)

Expenses for a specific production line. The view assigns `Options.Stitching_DeptCode` as the DeptId for line-level expenses, indicating these are typically stitching-line costs.

### 11.5 Order/Style-Level Expenses (Trs_DailyPrdn_Costing5)

Expenses directly attributable to a specific order and style: special materials, rework costs, order-specific testing. Validated against `OrderMas` and `OrderStyleDtl`.

### 11.6 Shift Wage Expense Flag (ShiftWageExp)

`Mas_Expenses.ShiftWageExp` flag identifies expenses that represent shift-based production wages. These receive special treatment in the Vue_DailyCostingInputData view and the costing reports — wage-type expenses are separated from overhead-type expenses for P&L categorization.

---

## 12. Daily Unit P&L — Sp_DailyUnitPANDL

### 12.1 P&L Posting Workflow

`Sp_DailyUnitPANDL` is a scheduled procedure that runs daily (typically for the previous day's date). Workflow:

1. **Delete** existing P&L data for the date
2. **Insert** production line items (DailyUnit_P_and_L) — production pcs × budget rate
3. **Update** actual wages from Trs_ProdWages
4. **Update** contractor actual wages from Trs_ProdBillMasNew/DetNew
5. **Update** job-work actual amounts from Trs_Bills/Trs_BillRate
6. **Calculate** budget overhead per order (BudgetValue × ProdOverheads%)
7. **Build** daily abstract (DailyUnit_P_And_L_Abs)
8. **Update** actual overhead from daily expenses + fixed expenses
9. **Allocate** overhead proportionally to each production line

### 12.2 Production Value: ProdPcs × Budget Rate

For each production entry on the date:

**Flat budget mode** (`BudRT_CMT_SizeWise = 'N'`):
$$\text{BudgetValue} = \text{ProdPcs} \times \text{Pro\_Prod\_PartwiseRate.Rate}$$

**Size-wise budget mode** (`BudRT_CMT_SizeWise = 'Y'`):
$$\text{BudgetValue} = \text{ProdPcs} \times \text{Bud\_InhRateclw.Rate\_Pcs}$$
(joined on OrdId + StyleNo + PartId + StageId + SizeId)

Production sources:
- **Shift production** (`Shift_Pcs = 'S'`): On-roll worker output
- **Contractor production** (`Shift_Pcs = 'P'`): Contracted worker output
- **Job-work receipts**: Pieces received from Trs_PcsGrn1/2 (ReceiptType='Piece')

### 12.3 Size-Wise vs Flat Budget Mode

| Aspect | Flat (N) | Size-Wise (Y) |
|--------|----------|----------------|
| Rate source | Pro_Prod_PartwiseRate.Rate | Bud_InhRateclw.Rate_Pcs |
| Rate granularity | OrdId + StyleNo + PartId + WrkID | OrdId + StyleNo + PartId + WrkID + SizeId |
| Color-level | No | Yes (ClrID) |
| JW Rate source | Pro_Prod_PartwiseRate.JobWrkRate | Bud_InhRateclw.JobWrkRate |

### 12.4 Contractor Wage Tracking

Contractor (outsourced) production is tracked separately:

```sql
UPDATE DailyUnit_P_and_L
SET Contractor_Actual_Wages = SUM(Trs_ProdBillDetNew.Amount)
FROM Trs_ProdBillMasNew → Trs_ProdBillDetNew
WHERE BrDt = @PostDate
```

### 12.5 Job Work Receipt Tracking

Job-work pieces received from external parties:

```sql
-- Pieces received
JobWrk_Pcs = SUM(Trs_PcsGrn2.RecPcs) WHERE ReceiptType='Piece'
-- Actual amount from billing
JobWrk_ActualAmt = SUM(Trs_Bills.Amount) via Trs_BillRate linkage
```

### 12.6 Overhead Allocation Algorithm

Overhead is allocated to each production line item **proportionally** based on actual wages:

```
Total_Overhead = Daily_Expense_Total + Fixed_Expense_Pro_Rata

For each production line item:
  OverHeads = Total_Overhead × (Item_Wages / Total_Wages)
  
Where:
  Item_Wages = Shift_ActualWages + Contractor_Actual_Wages + Actual_AddlAmount
  Total_Wages = Shift_Total_ActualValue + Contractor_Total_Actual_Wages
```

Budget overhead per order uses a configured percentage:
$$\text{BudgetOverheadAmt} = \text{BudgetValue} \times \frac{\text{OrderMas2.ProdOverheads}}{100}$$

### 12.7 Daily P&L Abstract (DailyUnit_P_And_L_Abs)

Aggregated daily summary per unit:

```sql
INSERT INTO DailyUnit_P_And_L_Abs
SELECT Coycode, PLDate,
  @OH_Percent,                                    -- Configured %
  SUM(BudgetValue),                               -- Total budget value
  SUM(BudgetValue) × @OH_Percent / 100,           -- Budget overhead
  SUM(Shift_ActualWages + Actual_AddlAmount),      -- Total shift actual
  SUM(Contractor_Actual_Wages),                    -- Total contractor
  SUM(Shift_ProdQty),                             -- Total shift pieces
  SUM(Contractor_Prod_Pcs),                       -- Total contractor pieces
  SUM(JobWrk_Pcs),                                -- Total JW pieces
  SUM(JobWrk_ActualAmt)                           -- Total JW amount
FROM DailyUnit_P_and_L WHERE PLDate = @PostDate
GROUP BY Coycode, PLDate
```

Actual overhead percent:
$$\text{Actual\_OverHead\_\%} = \frac{\text{ActualOverhead\_Value}}{\text{Shift\_Total + Contractor\_Total}} \times 100$$

### 12.8 Holiday / Weekly-Off Handling

The procedure checks for government holidays and weekly off days:
```sql
SELECT @HolidayCount = COUNT(*) FROM GovtHolidays WHERE GHDate = @PostDate
SELECT @WeekoffCount = COUNT(DISTINCT Weekoff) FROM Options
  WHERE Weekoff = DATEPART(w, @PostDate)
```

(These counts are available for pro-rata adjustments in reporting, though the core posting still occurs.)

---

## 13. Rate Masters — FrmRateMaster / FrmPrdnRateMaster / FrmCommRateMaster / frmDefaultRate

### 13.1 Material Rate Master (FrmRateMaster)

Defines standard purchase rates for raw materials (yarn, fabric, accessories). These serve as:
- **Default rates** when creating new purchase orders
- **Budget rates** for requirement planning
- **Benchmark rates** for rate approval workflows

### 13.2 Production Rate Master (FrmPrdnRateMaster)

Defines standard production rates per work nature / stage. Used to pre-populate `Pro_Prod_PartwiseRate` when creating a new order budget. Rates are typically:
- Per piece (for garment operations)
- Per KG (for fabric processing)
- Per metre (for some fabric operations)

### 13.3 Commercial Rate Master (FrmCommRateMaster)

Defines standard rates for commercial activities:
- Shipping per CBM/piece
- Inspection per lot/piece
- Documentation charges
- Courier/communication charges

### 13.4 Default Rate Templates (frmDefaultRate)

`frmDefaultRate` allows saving and loading rate templates. Users can:
- **Save** current order rates as a template
- **Load** a template to pre-fill rates for a new order
- Templates cover material, production, and commercial rates

---

## 14. Rate Confirmation — SP_ApprovedRateCnf1 / SP_PendingRateCnf

### 14.1 Rate Quotation Workflow

1. **Quotation entry** → `Pro_RateCnfPcs1` (header: quotation number, party, type) + `Pro_RateCnfPcs2` (detail: per order/style/part/stage with quoted rate)
2. **Pending review** → `Approved = 0` in Pro_RateCnfPcs2
3. **Approval** → Set `Approved = 1` after management review
4. **Budget update** → Approved rate may update `Pro_Prod_PartwiseRate`

### 14.2 Pending Rate Confirmation Register (SP_PendingRateCnf)

Lists all unapproved rate quotations where a rate has been quoted (`Rate > 0`) but not yet approved. Displays:

- Job number + financial year + buyer order number
- Style, part name, production stage
- **Budget rate** (from `Pro_Prod_PartwiseRate.Rate` for outsourced, `.JobWrkRate` for in-house)
- **Quoted rate** (from `Pro_RateCnfPcs2.Rate`)
- Party/supplier name
- Production type ('O' = outsourced, 'I' = in-house)

### 14.3 Approved Rate Confirmation Register (SP_ApprovedRateCnf1)

Same structure as pending, filtered to `Approved = 1`. Supports filtering by:
- Order IDs (comma-separated, split via `fnSplitter`)
- Style numbers (comma-separated, split via `fnSplitter_Str`)

Outsourced rates join `Mas_Party` for supplier names; in-house rates join `Mas_Emp` for employee names.

### 14.4 Budget Rate vs Quoted Rate Comparison

The register displays both budget and quoted rates side-by-side:

| Column | Source |
|--------|--------|
| BudgetRate | `Pro_Prod_PartwiseRate.Rate` (outsourced) or `.JobWrkRate` (in-house) |
| QuotRate | `Pro_RateCnfPcs2.Rate` |

This enables management to see the variance between planned budget rate and actual quoted rate before approval.

---

## 15. P&L Registers & Profitability Reports — FrmPLReg / frmBuyerPLReport

### 15.1 Order P&L Register (FrmPLReg)

The P&L Register provides a comprehensive order-level profit and loss statement. It aggregates:

- **Revenue**: Sales invoice amounts (shipped value, FabSalesAmt, AccSalesAmt, PcsSalesAmt)
- **Material costs**: Yarn + Fabric + Accessories (budget and actual)
- **Production costs**: In-house + outsourced (budget and actual)
- **Commercial costs**: Shipping, inspection, documentation
- **Overheads**: Production overhead allocation
- **Debit/credit adjustments**: Returns, debit notes
- **Buyer commission/DDB**: Commission and duty drawback

Net profit:
$$\text{NetProfit} = \text{Revenue} - \text{MaterialCost} - \text{ProductionCost} - \text{CommercialCost} - \text{Overheads} - \text{BuyerComm} + \text{DDB}$$

### 15.2 Buyer P&L Report (frmBuyerPLReport)

Aggregates P&L across all orders for a specific buyer, providing:
- Buyer-level profitability
- Order-wise breakdown within the buyer
- Season-wise analysis
- Merchandiser-wise analysis

### 15.3 Domestic P&L (Sp_DomesticPL)

`Sp_DomesticPL` calculates P&L for domestic orders:

1. **Initializes** temp_DomesticPL with order details (buyer, style, season, category, brand)
2. **Fabric cost**: Calculated from fabric allotment (Trs_FabAllot) × delivery rate + yarn contribution
3. **Trims cost**: From delivery quantities × budget rate (Pro_AccBudRate.BudRate)
4. **Production cost**: Sum of:
   - In-house production bills (Trs_ProdBillDetNew.Rate × ThisBillQty)
   - Outsourced piece-receipt bills (Trs_BillRate via Trs_PcsGrn1)
   - Supplier order amounts
5. **Shipped values and sales**: From despatch and invoice data

### 15.4 P&L Fabric Detail (SP_PLFabDet / SP_PLFabDet1)

Provides fabric cost breakdown for P&L purposes:

**SP_PLFabDet**: Summarizes by department with tax-inclusive/exclusive option:
- `@WithTax = 'N'`: Uses `Trs_BillRate.Amount`
- `@WithTax = 'Y'`: Uses `Trs_BillRate.NetAmount`
- Handles multi-currency: `@WithTax='N' AND Fcy>0 → Amount × ExchangeRate`

**SP_PLFabDet1**: Includes `RateMethod` column for departments using color-based rating, enabling the P&L report to distinguish between standard and color-rate method departments.

### 15.5 Net Profit Calculation

From `ORDERSTYLEWISECOST`:
$$\text{NetProfitValue} = \text{ShippedValue} - \text{NetActualValue}$$

Where:
$$\text{NetActualValue} = \text{Actual\_FabricValue} + \text{Actual\_AccValue} + \text{Actual\_ProdnValue} + \text{Actual\_CommValue} + \text{Actual\_ProdOverHeadValue} + \text{Actual\_BuyComm} - \text{Actual\_DDBValue}$$

---

## 16. One-Page Cost Report — SP_OnePageRpt

### 16.1 Stock Group Configuration (Mas_StockReportGroup)

The one-page report uses configurable stock groups (`Mas_StockReportGroup`) to organize stock by category:
- Each group has a `Y_F_A_P` type (Yarn/Fabric/Accessories/Piece)
- `Formula1` stores a comma-separated list of department IDs belonging to the group

### 16.2 Yarn/Fabric/Accessory Stock Summarization

For each configured group, the procedure:
1. Parses `Formula1` to extract department IDs
2. Calls `Sp_BIStockRpt` per department to populate `BI_STKREPORTS`
3. Aggregates stock KGs and values into `BI_GrpStockinfo`

### 16.3 Stock Valuation (CumBillRate / BudRate Priority)

Stock valuation follows a three-tier priority:

| Priority | Condition | Rate Used |
|----------|-----------|-----------|
| 1 | CumBillRate ≠ 0 | `StockRatePost.CumBillRate` |
| 2 | CumBillRate = 0 | `StockRatePost.BudRate` |
| 3 | Departments 3, 15, 4, 8 | Always `StockRatePost.BudRate` |

Additional handling for transferred stock (`FrmStockID` chain):
```sql
-- For transferred stock (DeptID = -7), trace back to source stock
Rate = StockRatePost.CumBillRate
  WHERE source stock matches on FabID, CntID, ColID, DesignID
```

### 16.4 BI_STKREPORTS / BI_GrpStockinfo Staging Tables

- `BI_STKREPORTS`: Per-item stock with KGs, rate, and group assignment (StkGrpID)
- `BI_GrpStockinfo`: Aggregated per group (GroupId, DeptID) with StockKgs and StockValue
- Supports both insert (new group/dept) and update (existing) patterns

---

## 17. Order-Style-Wise Cost View — SP_Vue_OrderStyleWiseCost

### 17.1 Vue_OrderStyleWiseCost Aggregation

`SP_Vue_OrderStyleWiseCost` dynamically alters the `Vue_OrderStyleWiseCost` view to aggregate `ORDERSTYLEWISECOST` by order:

```sql
ALTER VIEW Vue_OrderStyleWiseCost AS
SELECT OrdId,
  SUM(StyleQty), SUM(FabricReqKGs), SUM(Fabric_Cost_Per_UOM),
  SUM(TotalBudgetAccValue), SUM(TotalBudgetProdValue),
  SUM(TotalBudgetCommValue), AVG(ProfitPercent), SUM(ProfitValue),
  SUM(BudgetFabricValue), SUM(BuyComm), SUM(DDBValue),
  SUM(Actual_FabricValue), SUM(Actual_AccValue),
  SUM(Actual_ProdnValue), SUM(Actual_CommValue),
  SUM(Actual_BuyComm), SUM(Actual_DDBValue),
  SUM(ShippedQty), SUM(ShippedValue),
  SUM(Actual_ProdOverHeadValue), SUM(Budget_ProdOverHeadValue),
  SUM(BudgetShippedValue),
  SUM(Total_ActualCreditValue), SUM(Total_ActualDebitValue),
  SUM(NetProfitValue), SUM(NetActualValue), SUM(NetBudgetValue),
  SUM(SalesAmt), SUM(Supplier_Bill_Amt),
  SUM(Emb_Printing_Actual_Amt), SUM(FabSalesAmt),
  SUM(AccSalesAmt), SUM(PcsSalesAmt)
FROM ORDERSTYLEWISECOST GROUP BY OrdId
```

### 17.2 Cost Components Tracked

| Component | Budget | Actual |
|-----------|--------|--------|
| Fabric | BudgetFabricValue | Actual_FabricValue |
| Accessories | TotalBudgetAccValue | Actual_AccValue |
| Production (CMT) | TotalBudgetProdValue | Actual_ProdnValue |
| Commercial | TotalBudgetCommValue | Actual_CommValue |
| Overhead | Budget_ProdOverHeadValue | Actual_ProdOverHeadValue |
| Buyer Commission | BuyComm | Actual_BuyComm |
| Duty Drawback | DDBValue | Actual_DDBValue |
| Shipped Value | BudgetShippedValue | ShippedValue |

### 17.3 Profit Calculation

$$\text{ProfitPercent} = \text{AVG over styles}$$
$$\text{ProfitValue} = \text{SUM over styles}$$
$$\text{NetProfitValue} = \text{Revenue} - \text{All Costs}$$

---

## 18. Vue_Budget_Det (View) — Consolidated Budget Detail

### 18.1 Material Cost (Deliveries × Rate)

```sql
-- Transfer Out: Material delivered out of the order
SUM(Trs_Del2.Kg × Trs_Del2.Rate) WHERE TrType = 3

-- Transfer In: Material received into the order
SUM(Trs_Del2.Kg × Trs_Del2.Rate) WHERE TrType = 3 (by TranOrdID)
```

### 18.2 Debit Note Aggregation

Two types of debit aggregation:
- **Non-accessories** (`DeptID ≠ 16, AccProsDept='N'`): Direct debit notes (Trs_DirectDeb1/2) + standard debits (Trs_Deb1/2)
- **Accessories** (`DeptID = 16 or AccProsDept='Y'`): Separate accessories direct debit aggregation

### 18.3 Production Cost Aggregation

In-house production cost from:
```sql
SUM(Trs_ProdEntry.Rate × Trs_ProdEntryQty.ProdPcs)
-- For Stage=1 (stitching), joined with ProdBill for billing confirmation
-- Plus shift wages (Trs_ProdShiftWages for Stage=1)
```

### 18.4 Job Work Cost Aggregation

```sql
SUM(Trs_BillRate.NetAmount)
-- Linked via Trs_PcsGrn1 receipt → Trs_Bills invoice
```

### 18.5 Despatch Pieces

```sql
SUM(Trs_Pcs2.Pcs) WHERE Trs_Pcs1.DelType = 'Despatch'
```

---

## 19. Consumption Queries — SP_ConsQuery*

### 19.1 Fabric Requirement Calculation

`SP_ConsQuery1` and `SP_ConsQuery2` calculate fabric consumption for a given order/style/stage:

- Join production entries (`Trs_ProdEntry`) with consumption programs (`Prog_ClrComb`, `Prog_Cns`)
- Calculate actual production pieces per color/size combination
- Return fabric requirements: KGs (based on piece weight × production quantity)
- Handle yarn-dyed (`Yd = 1`) vs non-yarn-dyed fabrics separately (FabClr vs FinCol)

SP_ConsQuery2 adds bit-based production support:
- Joins `Pro_ProdBitCutDet` for pieces-per-bit conversion
- Joins `Pro_Prod_BitCutRate` for bit-specific piece weights and design descriptions

### 19.2 Domestic/Job Order Fabric Requirement (SP_FabReqCalc_Domestic_joborder)

Complex cursor-based procedure that calculates fabric requirements for domestic and job orders:

- Iterates through the **process chain** (Prog_ClrComb → department sequence) with loss percentages at each stage
- Handles multiple fabric components (main body, collar, cuff, etc.)
- Accounts for:
  - Process losses per department
  - Yarn-to-fabric conversion factors (`FabToYarn` flag)
  - Dyeing loss percentages
  - Color composition (solid vs yarn-dyed)
  - UOM conversions (KGS vs meters vs pieces)
- Outputs to temporary requirement tables per IP address

### 19.3 Consumption per Production Stage

The consumption queries support the costing module by providing:
- Actual fabric consumed per production stage
- Comparison data for budget-vs-actual fabric cost analysis
- Input for one-page cost reports

---

## 20. Commercial Template — Frm_CommercialTemplate / FrmOtherPORelatedIps

### 20.1 Commercial Cost Template (Frm_CommercialTemplate)

Defines standard commercial cost structures that can be applied to orders:
- Shipping/freight rates (per CBM, per piece, per container)
- Insurance rates
- Inspection charges
- Documentation and clearance costs
- Banking charges

Templates allow consistent commercial costing across orders and can be modified per order when specific requirements differ.

### 20.2 Other PO-Related Inputs (FrmOtherPORelatedIps)

Captures additional cost inputs related to purchase orders that feed into overall order costing:
- Additional processing charges not covered by standard rate masters
- Special handling charges
- Quality premium/penalty adjustments
- Freight and logistics add-ons

---

## 21. Key Business Rules & Formulas Summary

### Budget Formulas

| Component | Formula | Source |
|-----------|---------|--------|
| Yarn Budget | ReqKgs × Rate (or Manual Qty × Rate) | Pro_ReqYarn/2 |
| Fabric Budget | ReqKgs/ReqMtr × Rate (UOM-dependent) | Pro_ReqKnitt/2 |
| Accessories Budget | ReqdQty × BudRate | Pro_AccReq + Pro_AccBudRate |
| CMT Budget (Semi-Fin) | OrderQty × Rate (or JobWrkRate) | Pro_Prod_PartwiseRate |
| CMT Budget (Finished) | SizeQty × (Rate + AddRate) | Trs_ProdExp + OrdQtyClrDtl |
| CMT Budget (Bit-based) | OrderQty/NoofPcsPerBit × Rate_Pcs | Bud_InhRateclw |
| Budget Overhead | BudgetValue × ProdOverheads% | OrderMas2.ProdOverheads |

### Actual Cost Formulas

| Component | Formula | Source |
|-----------|---------|--------|
| Yarn Actual | GRN Qty × Bill Amount (Gross Amount Grp=4) | Trs_BillRate + Trs_BillAddded |
| Fabric Actual | GRN Qty × Bill Amount | Trs_BillRate + Trs_Grn1/2 |
| Accessories Actual | Receipt Amount from bill pass | Trs_BillRate |
| Production Actual (In-House) | Bill Amount from production bill | Trs_ProdBillMasNew/DetNew |
| Production Actual (Outsourced) | Bill Amount via piece receipt | Trs_BillRate via Trs_PcsGrn1 |
| Overhead Actual | Daily expenses + fixed pro-rata | Trs_DailyExpenseEntry + FixedExpenses_Entry |

### Daily P&L Formulas

| Metric | Formula |
|--------|---------|
| Budget Value | ProdPcs × Budget Rate |
| Budget Overhead | BudgetValue × ProdOverheads% |
| Actual Overhead % | ActualOverhead / (ShiftTotal + ContractorTotal) × 100 |
| Overhead Allocation | Total_Overhead × (Item_Wages / Total_Wages) |
| Variance | Budget − Actual |

### Stock Valuation Priority

| Priority | Condition | Rate |
|----------|-----------|------|
| 1 | CumBillRate ≠ 0 | CumBillRate |
| 2 | CumBillRate = 0 | BudRate |
| 3 | Special depts (3,15,4,8) | Always BudRate |

---

## 22. Cross-Module Dependencies

| Dependency | Source Module | Data Flow |
|------------|-------------|-----------|
| Order details | 02-Order Management | OrderMas, OrderStyleDtl, OrderQtyDtl, OrdQtyClrDtl |
| Material requirements | 02-Order Management | Pro_ReqYarn/2, Pro_ReqKnitt/2, Pro_AccReq |
| GRN receipts | 03-Procurement | Trs_Grn1/2, Trs_MultiPrs_Grn1/2/3 |
| Purchase orders | 03-Procurement | Trs_Po1/2/3/5 |
| Stock data | 04-Inventory | StockTable, StockRatePost, CurrentStock |
| Production entries | 06-Production | Trs_ProdEntry, Trs_ProdEntryQty, Prod_Sequence |
| Delivery transactions | 07-Dispatch | Trs_Del1/2 (material transfers, deliveries) |
| Bill pass | 08-Accounting | Trs_Bills, Trs_BillRate, Trs_BillAddded |
| Production bills | 08-Accounting | Trs_ProdBillMasNew/DetNew, Trs_ProdBillEntry |
| Piece receipts | 05-Cutting/Pieces | Trs_PcsGrn1/2, Trs_Pcs1/2 |
| Debit notes | 08-Accounting | Trs_Deb1/2, Trs_DirectDeb1/2 |
| Sales invoices | 08-Accounting | Trs_SalInv, Trs_JobWrkInv |
| Shipping bills | 08-Accounting | ShippingBill, ShippingBill_Det |
| Fabric allotment | 06-Production | Trs_FabAllot1/2 |
| Department master | 01-Masters | Mas_Dept (OutputType, SEMIFINISH, AccProsDept, ProcBill, RateMethod) |
| Work nature master | 01-Masters | Mas_JobWrkComp (DeptId, WorkComplDet, PcsType, Related_Stage) |
| Part master | 01-Masters | Mas_Part |
| UOM master | 01-Masters | Mas_UOM |
| Employee master | 01-Masters | Mas_Emp |
| Party master | 01-Masters | Mas_Party |
| System options | 01-Masters | Options (Allow_Excess_InBudget, BudRT_CMT_SizeWise, BudRt_Inhccw, Budget_OverHead_Percent, ProdbillEntryPartial, Weekoff, Stitching_DeptCode) |

---

## 23. Report Templates

| Report File | Purpose |
|-------------|---------|
| Various .mrt files for budget reports | Stimulsoft budget vs actual reports |
| OrderSheetRegFab.mrt | Order sheet register — fabric allocation |
| OrderSheetRegYarn.mrt | Order sheet register — yarn allocation |
| Form_JJ.mrt | Cost calculation form |
| Various Rpt_* .rpt files | Crystal Reports for costing registers |

The module's reports are primarily generated from the temporary tables and views populated by the stored procedures documented above, rendered via Stimulsoft (.mrt) or Crystal Reports (.rpt) engines.
