# FiberPro MERN Migration Requirements

Generated: 2026-03-15T10:55:34

## Scope and method

This document is inferred from the WinForms assembly surface, report templates, and SQL object names. It is a strong first-pass discovery artifact, not a line-by-line functional specification.

## Source coverage

- Candidate forms scanned: 321
- Report files scanned: 491
- SQL objects scanned: 380
- Forms classified into modules: 293
- Reports classified into modules: 479
- SQL objects classified into modules: 317

## Proposed MERN modules

| Module | Evidence | Suggested pages | Functional requirements |
| --- | ---: | ---: | ---: |
| Accounting, Billing, and GST | 262 | 8 | 5 |
| Authentication and Administration | 58 | 10 | 5 |
| Costing, Budgeting, and Finance | 118 | 8 | 5 |
| Cutting, Panels, and Piece Goods | 231 | 9 | 5 |
| Dispatch, Delivery, and Logistics | 174 | 7 | 5 |
| HR, Labor, and Payroll Support | 32 | 6 | 5 |
| Inventory and Warehouse | 235 | 10 | 5 |
| Job Work and Outsourcing | 67 | 7 | 5 |
| Masters and Configuration | 357 | 13 | 5 |
| Order Management and Sales | 246 | 10 | 5 |
| Procurement and Supplier Management | 180 | 8 | 5 |
| Production and Shop Floor | 234 | 10 | 5 |
| Quality, Lab, and Approvals | 23 | 8 | 5 |
| Reporting, Analytics, and Integrations | 343 | 10 | 5 |

## Accounting, Billing, and GST

Invoices, debit notes, party balances, billing registers, and statutory tax handling.

### Suggested pages

- /accounts/dashboard
- /accounts/invoices
- /accounts/debit-notes
- /accounts/bill-pass
- /accounts/party-ledger
- /accounts/bills-register
- /accounts/gst-settings
- /accounts/tally-integration

### Functional requirements

- Generate and maintain local, domestic, and commercial invoices with GST-aware fields.
- Support debit note, bill-pass, and party balance workflows.
- Expose billing registers, invoice valuation, and outstanding statements.
- Preserve Tally and statutory integration points or replace them with export APIs.
- Ensure accounting data is traceable back to stock and order transactions.

### Backend and platform capabilities

- Invoice engine
- Ledger service
- GST calculations
- Accounting integration adapters

### Evidence from legacy application

- Matched forms: 42
- Matched reports: 153
- Matched SQL objects: 67
- Example forms:
  - Fiberpro.Frm_AppAwBill
  - Fiberpro.FrmAcc_ProgCancel
  - Fiberpro.frmAccack
  - Fiberpro.FrmAccCat
  - Fiberpro.FrmAccDel
  - Fiberpro.FrmAccDel_Return
  - Fiberpro.FrmAccDescMaster
  - Fiberpro.FrmAccItemApproval
  - Fiberpro.FrmAccmaster
  - Fiberpro.frmAccSalesDel
  - Fiberpro.frmAccShort
  - Fiberpro.FrmAccStockReg
  - Fiberpro.frmAccStockShow
  - Fiberpro.frmBillPass
  - Fiberpro.FrmBillsAddDedReport
  - Fiberpro.FrmBillsReg
  - Fiberpro.frmdebitnote
  - Fiberpro.FrmDirectBill_GateEntry
  - Fiberpro.frmDirectDebitNote
  - Fiberpro.frmDomestic_Acc_Issue
- Example reports:
  - AccDC.cs
  - AccDC.mrt
  - AccDC_GoDown.mrt
  - AccDC_SGST.mrt
  - AccDC_SGST_Cost.mrt
  - AccDirectGRN.mrt
  - AccGRN.cs
  - AccGRN.mrt
  - AccGRNPO.mrt
  - AccOpening.mrt
  - ACCPO_96_17_198.pdf
  - AccStockAdj.mrt
  - DC_GST - Copy.mrt
  - DC_GST - Format1.mrt
  - DC_GST - Format2.mrt
  - DC_GST.mrt
  - DC_GST_1.mrt
  - debit.pdf
  - DebitAcc.mrt
  - DebitAccGST.mrt
- Example SQL objects:
  - Accessories_Stock.sql
  - Meet_Accessories.sql
  - MeetAccDetails.sql
  - SP_2_ACC.sql
  - Sp_Acc_PartyBalance.sql
  - SP_AccDelivery_stkValue.sql
  - SP_AccProcessDelivery_stkValue.sql
  - Sp_AccTransaction.sql
  - SP_BillRegQry.sql
  - SP_BillsRegView_acc.sql
  - SP_BillsRegView_cm.sql
  - SP_BillsRegView_fab1.sql
  - SP_BillsRegView_fab2.sql
  - SP_BillsRegView_fab3.sql
  - SP_BillsRegView_fab4.sql
  - SP_BillsRegView_fab5.sql
  - SP_BillsRegView_prd.sql
  - SP_BillsRegView_prd1.sql
  - SP_BillsRegView_prd2.sql
  - SP_BillsRegView_Yarn.sql

## Authentication and Administration

Company login, user access, fiscal-year controls, and system administration.

### Suggested pages

- /login
- /company-selector
- /admin/users
- /admin/roles
- /admin/menu-rights
- /admin/company-rights
- /admin/fiscal-years
- /admin/system-settings
- /admin/document-store
- /profile/change-password

### Functional requirements

- Support company-aware authentication and fiscal year context selection.
- Implement role-based access control down to menu, action, and warehouse scope.
- Provide user, role, and permission maintenance with audit visibility.
- Preserve utility flows such as password reset, lock/unlock, and controlled data maintenance.
- Allow configuration of global settings, notification setup, and document storage metadata.

### Backend and platform capabilities

- JWT or session-based auth
- RBAC with company and godown scoping
- Audit logs
- System settings service

### Evidence from legacy application

- Matched forms: 19
- Matched reports: 1
- Matched SQL objects: 38
- Example forms:
  - Fiberpro.Frm_Lock
  - Fiberpro.Frm_Password_List
  - Fiberpro.Frm_WF_DocumentStore
  - Fiberpro.FrmChangePassword
  - Fiberpro.FrmCompanyLogin
  - Fiberpro.FrmCompanyRights
  - Fiberpro.FrmDataDelete
  - Fiberpro.FrmDelete
  - Fiberpro.FrmFinyearLogin
  - Fiberpro.FrmFormDef
  - Fiberpro.FrmLogin_New
  - Fiberpro.FrmLoginReg
  - Fiberpro.FrmMasuser
  - Fiberpro.FrmMenuAccRights
  - Fiberpro.FrmMenuRights
  - Fiberpro.frmOptions
  - Fiberpro.FrmOptionsPrint
  - Fiberpro.FrmSMSMailSetup
  - Fiberpro.FrmUserGroupMas
- Example reports:
  - Trg_Finyear_Update.sql
- Example SQL objects:
  - PROC_GodownAck_Delete.sql
  - PROC_PanelReceipt_Delete.sql
  - PROC_PanelReceipt_Delete_1.sql
  - PROC_PiecesReceipt_Delete.sql
  - PROC_PiecesReceipt_Delete_1.sql
  - PROC_Stock_DeliveryPanel_Delete.sql
  - PROC_Stock_DeliveryPanel_Delete_1.sql
  - PROC_Stock_DeliveryPieces_Delete.sql
  - PROC_Stock_DeliveryPieces_Delete_1.sql
  - PROC_Stock_DeliveryPieces_Delete_1_LineStk.sql
  - PROC_Stock_DeliveryPieces_Delete_LineStk.sql
  - PROC_Stock_IssueToPrdn_Delete.sql
  - PROC_Stock_IssueToPrdn_Delete_1.sql
  - PROC_Stock_IssueToPrdn_Delete_1_FINISH.sql
  - PROC_Stock_IssueToPrdn_Delete_FINISH.sql
  - PROC_Stock_LineTfr_Delete.sql
  - PROC_Stock_LineTfr_Delete_1.sql
  - PROC_Stock_ProdPanel_Delete.sql
  - PROC_Stock_ProdPanel_Delete_Prdn.sql
  - PROC_Stock_ProdPanel_Delete1.sql

## Costing, Budgeting, and Finance

Pre-costing, budget vs actual, expense capture, and production or order profitability.

### Suggested pages

- /costing/templates
- /costing/input
- /costing/production-cost
- /budgets
- /budgets/new
- /budgets/vs-actual
- /finance/expenses
- /finance/profitability

### Functional requirements

- Capture cost components for styles, production processes, and supplier activity.
- Create budgets and compare them against actual material, labor, and overhead usage.
- Track expense groups, fixed expenses, and order-wise or department-wise allocations.
- Provide profitability views and order or unit level P&L reporting.
- Maintain rate approvals and price-control workflows that impact valuation and costing.

### Backend and platform capabilities

- Cost engine
- Budget snapshots
- Variance analysis
- Profitability dashboards

### Evidence from legacy application

- Matched forms: 27
- Matched reports: 50
- Matched SQL objects: 41
- Example forms:
  - Fiberpro.Frm_CostingInput
  - Fiberpro.Frm_ProductionCost
  - Fiberpro.Frm_ProductionWages
  - Fiberpro.Frm_ProdWagesDept
  - Fiberpro.Frm_ProdWagesStage
  - Fiberpro.frmBudcom
  - Fiberpro.frmBudget
  - Fiberpro.FrmBudgetAndActualComp
  - Fiberpro.frmBudgetNew_JobWork
  - Fiberpro.FrmCommRateMaster
  - Fiberpro.frmDefaultRate
  - Fiberpro.FrmExpenseEntryRegister
  - Fiberpro.FrmExpenseGroup
  - Fiberpro.FrmExpenses
  - Fiberpro.FrmFixedExpensesEntry
  - Fiberpro.FrmLotSeparate
  - Fiberpro.FrmMasExpenses
  - Fiberpro.FrmPaymentReg_Wages
  - Fiberpro.FrmPrdnRateMaster
  - Fiberpro.frmPreBudgetProdPlan
- Example reports:
  - AccDC_SGST_Cost.mrt
  - FabDC_SGST_Cost _Cut.mrt
  - FabDC_SGST_Cost.mrt
  - FabDC_SGST_Cost_Full.mrt
  - FabDC_SGST_Cost_PrsRt.mrt
  - FabDC_SGST_Cost_PrsRt_OrdWise.mrt
  - GenDC_SGST_Cost.mrt
  - GenDC_SGST_Cost_a4.mrt
  - PcsDc_WithRate.mrt
  - PcsDc1_SGST_Cost.mrt
  - PcsDc1_SGST_Cost_1.mrt
  - PcsDc1_SGST_Cost_Large.mrt
  - PcsDc1_SGST_Cost_old.mrt
  - Rpt_Budget.rpt
  - Rpt_Budget.vb
  - Rpt_BudgetAbs.rpt
  - Rpt_BudgetAbs.vb
  - Rpt_BudgetAndActual_Det.rpt
  - Rpt_BudgetAndActual_Det.vb
  - Rpt_BudgetAndActual_Det_1.rpt
- Example SQL objects:
  - SP_AccDelivery_stkValue.sql
  - SP_AccProcessDelivery_stkValue.sql
  - SP_ApprovedRateCnf1.sql
  - SP_BilltoBeValue.sql
  - SP_BilltoBeValue_Approx.sql
  - SP_BilltoBeValue_Detail.sql
  - SP_Bud_and_Actual.sql
  - SP_Bud_and_Actual_1.sql
  - SP_Bud_and_Actual_2.sql
  - SP_Bud_and_Actual1.Sql
  - SP_Bud_and_ActualStyleWise.sql
  - SP_BudAndActual_Det Old.sql
  - SP_BudAndActual_Det With Style and part.sql
  - SP_BudAndActual_Det.sql
  - SP_BudAndActual_Det_1.sql
  - SP_BudgetQry1.sql
  - SP_BudgetQry2.sql
  - Sp_DailyUnitPANDL.Sql
  - SP_FabDelivery_stkValue.sql
  - SP_Party_Outstanding_Rate_Arrival.sql

## Cutting, Panels, and Piece Goods

Cutting plans, panel and piece movement, ready-to-cut control, and piece dispatch/receipt flows.

### Suggested pages

- /cutting/job-orders
- /cutting/issues
- /cutting/production
- /cutting/ready-to-cut
- /panels/assembly
- /pieces/receipts
- /pieces/despatch
- /pieces/transfers
- /barcodes/scan

### Functional requirements

- Manage cutting job orders, issue slips, cutting output, and ready-to-cut balances.
- Track panel assembly and piece-level stock movement between production stages and units.
- Support piece receipt, despatch, transfer, and packing list generation.
- Validate bundle and piece transactions with barcode scanning and duplicate checks.
- Preserve rework and rejection handling for panel and piece inventory.

### Backend and platform capabilities

- Barcode scanning
- Panel and piece ledgers
- Cutting workflow
- Packing list generation

### Evidence from legacy application

- Matched forms: 41
- Matched reports: 95
- Matched SQL objects: 95
- Example forms:
  - Fiberpro.Frm_RollSplit
  - Fiberpro.frmAddPanelCutting
  - Fiberpro.frmBarcodeReadingNew
  - Fiberpro.FrmCutingReg
  - Fiberpro.FrmCutting_FabRej
  - Fiberpro.frmcuttingack
  - Fiberpro.FrmCuttingfabretreg
  - Fiberpro.frmCuttingIssue
  - Fiberpro.frmCuttingJobOrder
  - Fiberpro.FrmCuttingProduction_Auto_New
  - Fiberpro.frmJobWorkPcsReturn
  - Fiberpro.FrmLocalInvPackingList
  - Fiberpro.FrmLocalInvPackingList_Solid
  - Fiberpro.FrmLocInvPackingListFormat
  - Fiberpro.FrmOrderDespatchCompletion
  - Fiberpro.FrmOrderwisePcsReg
  - Fiberpro.FrmPackingList
  - Fiberpro.FrmPackingList_Domestic
  - Fiberpro.frmPanelDelRework
  - Fiberpro.FrmPanelExcessEntry
- Example reports:
  - BarcodeLayReport.rpt
  - BarcodeLayReport1.rpt
  - FabDC_SGST_Cost _Cut.mrt
  - PanelDc1Rework_SGST.mrt
  - Pcs_IssueToProd.mrt
  - PcsDc -Acc.mrt
  - PcsDc.mrt
  - PcsDc_ACC.mrt
  - PcsDC_Acc_Pre.mrt
  - PcsDc_SGST_Large.mrt
  - PcsDc_WithRate.mrt
  - PcsDc1.mrt
  - PcsDc1_SGST.mrt
  - PcsDc1_SGST_Bit.mrt
  - PcsDc1_SGST_Cost.mrt
  - PcsDc1_SGST_Cost_1.mrt
  - PcsDc1_SGST_Cost_Large.mrt
  - PcsDc1_SGST_Cost_old.mrt
  - PcsDc1_SGST_Panel.mrt
  - PcsDc1Rework_SGST.mrt
- Example SQL objects:
  - CutACKStockPost.sql
  - PanelProductionExistQty.sql
  - PROC_PanelReceipt_Delete.sql
  - PROC_PanelReceipt_Delete_1.sql
  - PROC_PanelReceipt_Insert.sql
  - PROC_PanelReceipt_Update.sql
  - PROC_PiecesReceipt_Delete.sql
  - PROC_PiecesReceipt_Delete_1.sql
  - PROC_PiecesReceipt_Insert.sql
  - PROC_PiecesReceipt_Update.sql
  - PROC_Stock_DeliveryPanel_Delete.sql
  - PROC_Stock_DeliveryPanel_Delete_1.sql
  - PROC_Stock_DeliveryPieces_Delete.sql
  - PROC_Stock_DeliveryPieces_Delete_1.sql
  - PROC_Stock_DeliveryPieces_Delete_1_LineStk.sql
  - PROC_Stock_DeliveryPieces_Delete_LineStk.sql
  - PROC_Stock_PanelDelivery_Insert.sql
  - PROC_Stock_PanelDelivery_Update.sql
  - PROC_Stock_PiecesDelivery_Insert.sql
  - PROC_Stock_PiecesDelivery_Insert_LineStk.sql

## Dispatch, Delivery, and Logistics

Delivery challans, acknowledgments, gate processes, and outbound movement documentation.

### Suggested pages

- /dispatch/challans
- /dispatch/challans/new
- /dispatch/packing-lists
- /dispatch/acknowledgements
- /dispatch/courier
- /dispatch/gate-pass
- /dispatch/receipts

### Functional requirements

- Generate delivery challans for accessories, fabric, general materials, and piece goods.
- Maintain dispatch acknowledgments, courier references, and gate-pass activity.
- Link dispatch documents back to orders, stock movement, and invoice preparation.
- Support multiple print formats and customer-specific document layouts.
- Provide receipt and return flows for inter-unit and external movement.

### Backend and platform capabilities

- Document numbering
- PDF/print layouts
- Dispatch tracking
- Acknowledgment workflow

### Evidence from legacy application

- Matched forms: 27
- Matched reports: 104
- Matched SQL objects: 43
- Example forms:
  - Fiberpro.frmAccack
  - Fiberpro.frmBudcom
  - Fiberpro.frmcuttingack
  - Fiberpro.FrmDcIdUpdation
  - Fiberpro.FrmDcWiseDtl
  - Fiberpro.FrmDeliveryAtMas
  - Fiberpro.FrmDirectBill_GateEntry
  - Fiberpro.FrmGateEntry
  - Fiberpro.FrmGatePass
  - Fiberpro.FrmGenDC
  - Fiberpro.frmGeneralDCCompletion
  - Fiberpro.FrmGoDownAck
  - Fiberpro.FrmGodownTransferAck
  - Fiberpro.FrmLocalInvPackingList
  - Fiberpro.FrmLocalInvPackingList_Solid
  - Fiberpro.FrmLocInvPackingListFormat
  - Fiberpro.FrmNonReturnDCApproval
  - Fiberpro.FrmOrderDespatchCompletion
  - Fiberpro.FrmOrdProdTrack
  - Fiberpro.FrmPackingList
- Example reports:
  - AccDC.cs
  - AccDC.mrt
  - AccDC_GoDown.mrt
  - AccDC_SGST.mrt
  - AccDC_SGST_Cost.mrt
  - CourierDC.mrt
  - DC_GST - Copy.mrt
  - DC_GST - Format1.mrt
  - DC_GST - Format2.mrt
  - DC_GST.mrt
  - DC_GST_1.mrt
  - FabDC.cs
  - FabDC.mrt
  - FabDC_GoDown.mrt
  - FabDC_PackList.mrt
  - FabDC_PackList_HalfPage.mrt
  - FabDC_SGST.mrt
  - FabDC_SGST_Cost _Cut.mrt
  - FabDC_SGST_Cost.mrt
  - FabDC_SGST_Cost_Full.mrt
- Example SQL objects:
  - CutACKStockPost.sql
  - FabDeliverySP.sql
  - PROC_GodownAck_Delete.sql
  - PROC_GodownAck_Insert.sql
  - PROC_PanelReceipt_Delete.sql
  - PROC_PanelReceipt_Delete_1.sql
  - PROC_PanelReceipt_Insert.sql
  - PROC_PanelReceipt_Update.sql
  - PROC_PiecesReceipt_Delete.sql
  - PROC_PiecesReceipt_Delete_1.sql
  - PROC_PiecesReceipt_Insert.sql
  - PROC_PiecesReceipt_Update.sql
  - PROC_Stock_DeliveryPanel_Delete.sql
  - PROC_Stock_DeliveryPanel_Delete_1.sql
  - PROC_Stock_DeliveryPieces_Delete.sql
  - PROC_Stock_DeliveryPieces_Delete_1.sql
  - PROC_Stock_DeliveryPieces_Delete_1_LineStk.sql
  - PROC_Stock_DeliveryPieces_Delete_LineStk.sql
  - PROC_Stock_PanelDelivery_Insert.sql
  - PROC_Stock_PanelDelivery_Update.sql

## HR, Labor, and Payroll Support

Employee masters, production wages, department rules, and payment support flows.

### Suggested pages

- /hr/employees
- /hr/departments
- /hr/shifts
- /payroll/production-wages
- /payroll/payments
- /payroll/stage-rates

### Functional requirements

- Maintain employee, department, and shift configuration used by production and wages.
- Support production wages by stage, department, and employee or unit context.
- Link production outputs to wage calculations and payment registers.
- Allow rate maintenance for wage-bearing operations and departments.
- Expose wage and payment summaries for finance and production leadership.

### Backend and platform capabilities

- Employee service
- Wage rules
- Payroll support reports
- Department rate setup

### Evidence from legacy application

- Matched forms: 15
- Matched reports: 8
- Matched SQL objects: 9
- Example forms:
  - Fiberpro.Frm_CommercialTemplate
  - Fiberpro.Frm_ProductionWages
  - Fiberpro.Frm_ProdWagesDept
  - Fiberpro.Frm_ProdWagesStage
  - Fiberpro.Frm_ProRouteTemplate
  - Fiberpro.frmDeptGroup
  - Fiberpro.FrmDeptMasterNew
  - Fiberpro.frmDeptSettings
  - Fiberpro.FrmEmpmaster
  - Fiberpro.FrmHourlySetting1
  - Fiberpro.FrmMasBuyerDept
  - Fiberpro.FrmMasTemplate
  - Fiberpro.FrmPaymentReg
  - Fiberpro.FrmPaymentReg_Wages
  - Fiberpro.FrmProdShiftWagesReg
- Example reports:
  - RptClosingStock_Deptwise.rpt
  - RptClosingStock_DeptwiseMtr.rpt
  - RptShiftWagesReg.rpt
  - Trg_Mas_BuyerDept_Update.sql
  - Trg_Mas_Dept_Update.sql
  - Trg_Mas_Emp_Update.sql
  - Trg_TempPartyBalAbs.sql
  - Trg_TempPartyBalLedger.sql
- Example SQL objects:
  - MeetingChartAllDept.sql
  - selectMeetingDept.sql
  - SP_Vue_RptShiftWagesReg.sql
  - Trg_Mas_BuyerDept_Update.sql
  - Trg_Mas_Dept_Update.sql
  - Trg_Mas_Emp_Update.sql
  - Trg_ST_Cost_Dept.sql
  - Trg_TempPartyBalAbs.sql
  - Trg_TempPartyBalLedger.sql

## Inventory and Warehouse

Godowns, current stock, transfers, ledgers, and stock valuation across materials and piece goods.

### Suggested pages

- /inventory/dashboard
- /inventory/stock-ledger
- /inventory/current-stock
- /inventory/godowns
- /inventory/transfers
- /inventory/adjustments
- /inventory/opening-stock
- /inventory/lot-tracking
- /inventory/roll-tracking
- /inventory/valuation

### Functional requirements

- Maintain real-time stock by godown, lot, roll, piece, and material category.
- Support transfers, acknowledgments, stock adjustments, and opening balance loads.
- Provide stock ledgers, item-wise availability, and valuation reports.
- Preserve stock-posting integrity that currently lives in SQL procedures and triggers.
- Allow warehouse-scoped permissions and transaction audit history.

### Backend and platform capabilities

- Inventory ledger service
- Warehouse transfers
- Stock reservation
- Valuation reports

### Evidence from legacy application

- Matched forms: 55
- Matched reports: 60
- Matched SQL objects: 120
- Example forms:
  - Fiberpro.Frm_GoDownSel
  - Fiberpro.Frm_RollSplit
  - Fiberpro.frmAccack
  - Fiberpro.frmAccShort
  - Fiberpro.FrmAccStockReg
  - Fiberpro.frmAccStockShow
  - Fiberpro.FrmChangeGodown
  - Fiberpro.frmContractAllotment
  - Fiberpro.frmContractAllotment_New
  - Fiberpro.frmcuttingack
  - Fiberpro.FrmDeliveryAtMas
  - Fiberpro.frmFabricAllotment
  - Fiberpro.FrmFabricStockRegister
  - Fiberpro.frmfabstockshow
  - Fiberpro.FrmGeneralStockRegister
  - Fiberpro.FrmGoDownAck
  - Fiberpro.FrmGodownMaster
  - Fiberpro.FrmGodownTransferAck
  - Fiberpro.FrmItemwiseStockRegister
  - Fiberpro.FrmLocalInvPackingList
- Example reports:
  - AccDC_GoDown.mrt
  - AccOpening.mrt
  - AccStockAdj.mrt
  - FabDC_GoDown.mrt
  - FabDC_PackList.mrt
  - FabDC_PackList_HalfPage.mrt
  - FabGRN_PackList.mrt
  - FabOpening.mrt
  - FabStockAdj.mrt
  - PcsReceipt.mrt
  - PcsReceipt_Large.mrt
  - PcsReceipt1.mrt
  - PcsReceipt1_Large.mrt
  - PcsReceipt2.mrt
  - PcsReceipt4.mrt
  - PcsTransfer.mrt
  - RollPrint.mrt
  - Rpt_AccAck.rpt
  - Rpt_AccRetAck.rpt
  - Rpt_CutAckFab 1.rpt
- Example SQL objects:
  - Accessories_Stock.sql
  - CutACKStockPost.sql
  - FabDeliverySP.sql
  - getLotNo.sql
  - PROC_GodownAck_Delete.sql
  - PROC_GodownAck_Insert.sql
  - PROC_PanelReceipt_Delete.sql
  - PROC_PanelReceipt_Delete_1.sql
  - PROC_PanelReceipt_Insert.sql
  - PROC_PanelReceipt_Update.sql
  - PROC_PiecesReceipt_Delete.sql
  - PROC_PiecesReceipt_Delete_1.sql
  - PROC_PiecesReceipt_Insert.sql
  - PROC_PiecesReceipt_Update.sql
  - PROC_Stock_DeliveryPanel_Delete.sql
  - PROC_Stock_DeliveryPanel_Delete_1.sql
  - PROC_Stock_DeliveryPieces_Delete.sql
  - PROC_Stock_DeliveryPieces_Delete_1.sql
  - PROC_Stock_DeliveryPieces_Delete_1_LineStk.sql
  - PROC_Stock_DeliveryPieces_Delete_LineStk.sql

## Job Work and Outsourcing

Contract allotment, subcontract production, supplier sequence, and outsourced material flows.

### Suggested pages

- /jobwork/contracts
- /jobwork/allotments
- /jobwork/supplier-production
- /jobwork/tech-sheets
- /jobwork/material-issues
- /jobwork/receipts
- /jobwork/balances

### Functional requirements

- Manage contract allotment and outsourced production planning by supplier and process.
- Track material issues, receipts, balances, and supplier job-order exposure.
- Store technical data sheets and process instructions shared with suppliers.
- Provide supplier production progress, balances, and billing support.
- Distinguish in-house versus subcontract flows in stock and costing calculations.

### Backend and platform capabilities

- Supplier execution workflow
- Contract lifecycle
- Material issue tracking
- Tech-sheet repository

### Evidence from legacy application

- Matched forms: 17
- Matched reports: 21
- Matched SQL objects: 29
- Example forms:
  - Fiberpro.Frm_ProRouteTemplate
  - Fiberpro.Frm_SubProcess
  - Fiberpro.frmBudgetNew_JobWork
  - Fiberpro.frmContractAllotment
  - Fiberpro.frmContractAllotment_New
  - Fiberpro.frmCuttingJobOrder
  - Fiberpro.frmDailyinout
  - Fiberpro.FrmJobOrderList
  - Fiberpro.frmJobWorkPcsReturn
  - Fiberpro.frmLineOutputManual
  - Fiberpro.frmLineOutputManual_New
  - Fiberpro.FrmSupplierBillReg
  - Fiberpro.FrmSupplierOrderRegister
  - Fiberpro.FrmSuppOrderHistoryReg
  - Fiberpro.FrmSuppOrdSheet_Semi
  - Fiberpro.FrmSuppProdSequence
  - Fiberpro.FrmSuppTechDataSheet
- Example reports:
  - Rpt_CuttingJobOrder.rpt
  - Rpt_CuttingJobOrder.vb
  - Rpt_CuttingJobOrder_GST.rpt
  - Rpt_CuttingJobOrder_GST_12.rpt
  - Rpt_CuttingJobOrder_GST_Large.rpt
  - Rpt_CuttingJobOrder_GST_Large_11.rpt
  - Rpt_CuttingJobOrder_GST1.rpt
  - Rpt_CuttingJobOrderCancel.rpt
  - Rpt_SalesInvoice_GST_WithoutTax.mrt
  - Rpt_SalesInvoiceOrdWise_GST_WithoutTax.mrt
  - RptSupp_Process_Bill.mrt
  - RptSupp_Process_Cost.mrt
  - RptSupp_Process_Plan.mrt
  - RptSupplierOrderSheet.rpt
  - RptSupplierOrderSheet.vb
  - RptSupplierOrderSheet_Large.rpt
  - RptSupplierOrderSheet1.rpt
  - YarnDCWithoutPrg.cs
  - YarnDCWithoutPrg.mrt
  - YarnDCWithoutPrg_SGST.mrt
- Example SQL objects:
  - Party_Outstanding_OrdwiseStk_Arrival.sql
  - PartyOutQry.sql
  - PROC_Stock_ProdPieces_Delete_LineOut_PrdEntry.sql
  - PROC_Stock_ProdPieces_Delete_LineOut_PrdEntry_Rewrk.sql
  - PROC_Stock_ProdPieces_Delete1_LineOut_Prdentry.sql
  - PROC_Stock_ProdPieces_Delete1_LineOut_Prdentry_Rewrk.sql
  - PROC_Stock_ProdPieces_LineOut.sql
  - PROC_Stock_ProdPieces_LineOut_PrdEntry.sql
  - PROC_Stock_ProdPieces_LineOut_PrdEntry_ReWrk.sql
  - PROC_Stock_ProdPieces_Update_LineOut.sql
  - PROC_Stock_ProdPieces_Update_LineOut_Rewrk.sql
  - SP_FabReqCalc_Domestic_joborder.sql
  - SP_Party_Outstanding_Rate_Arrival.sql
  - Sp_PartyWiseJobOrderBal.sql
  - SP_PcsValue_Out.sql
  - Sp_ProductionEntryQty_LineOut_Manual.sql
  - SP_Rpt_SupplierOrderReg.sql
  - SP_ST_Supp_Production_Data.sql
  - Sp_SuppStock.Sql
  - Sp_UnitWiseJobOrderBal_Reg_Custom.sql

## Masters and Configuration

Reference data and setup for parties, items, styles, departments, warehouses, and banking.

### Suggested pages

- /masters/parties
- /masters/buyers
- /masters/suppliers
- /masters/items
- /masters/fabrics
- /masters/yarns
- /masters/accessories
- /masters/styles
- /masters/departments
- /masters/godowns
- /masters/banks
- /masters/machines
- /masters/tax-codes

### Functional requirements

- Centralize all reference masters with search, approval-safe edits, and effective dating where needed.
- Support bulk import and validation for style, fabric, yarn, and party catalogs.
- Maintain department, machine, warehouse, bank, and tax metadata used across modules.
- Expose reusable master APIs for React forms, dropdowns, and background validations.
- Track change history for sensitive masters such as HSN, party, and style definitions.

### Backend and platform capabilities

- Master data service
- Bulk import/export
- Reference-data caching
- Change history

### Evidence from legacy application

- Matched forms: 97
- Matched reports: 175
- Matched SQL objects: 85
- Example forms:
  - Fiberpro.Frm_AppMas
  - Fiberpro.Frm_CommercialTemplate
  - Fiberpro.Frm_GoDownSel
  - Fiberpro.Frm_Mas_Holiday
  - Fiberpro.Frm_Master
  - Fiberpro.Frm_OrderInputMas
  - Fiberpro.Frm_ProdWagesDept
  - Fiberpro.Frm_ProRouteTemplate
  - Fiberpro.FrmAcc_ProgCancel
  - Fiberpro.frmAccack
  - Fiberpro.FrmAccCat
  - Fiberpro.FrmAccDel
  - Fiberpro.FrmAccDel_Return
  - Fiberpro.FrmAccDescMaster
  - Fiberpro.FrmAccItemApproval
  - Fiberpro.FrmAccmaster
  - Fiberpro.frmAccSalesDel
  - Fiberpro.frmAccShort
  - Fiberpro.FrmAccStockReg
  - Fiberpro.frmAccStockShow
- Example reports:
  - AccDC.cs
  - AccDC.mrt
  - AccDC_GoDown.mrt
  - AccDC_SGST.mrt
  - AccDC_SGST_Cost.mrt
  - AccDirectGRN.mrt
  - AccGRN.cs
  - AccGRN.mrt
  - AccGRNPO.mrt
  - AccOpening.mrt
  - ACCPO_96_17_198.pdf
  - AccStockAdj.mrt
  - DebitAcc.mrt
  - DebitAccGST.mrt
  - DebitYarn.mrt
  - DebitYarnGST.mrt
  - DirectDebitYarn.mrt
  - DirectDebitYarnGST.mrt
  - FabDC_GoDown.mrt
  - FabGanAcc.mrt
- Example SQL objects:
  - Accessories_Stock.sql
  - Meet_Accessories.sql
  - MeetAccDetails.sql
  - MeetingChartAllDept.sql
  - Party_Outstanding_OrdwiseStk_Arrival.sql
  - PartyOutQry.sql
  - PROC_GodownAck_Delete.sql
  - PROC_GodownAck_Insert.sql
  - selectMeetingDept.sql
  - SP_2_ACC.sql
  - Sp_Acc_PartyBalance.sql
  - SP_AccDelivery_stkValue.sql
  - SP_AccProcessDelivery_stkValue.sql
  - Sp_AccTransaction.sql
  - SP_BillsRegView_acc.sql
  - SP_BillsRegView_Yarn.sql
  - SP_Bud_and_ActualStyleWise.sql
  - SP_BudAndActual_Det With Style and part.sql
  - SP_ConsQuery2_PcsGrn_1_Lot_OneSize.sql
  - SP_ConsQuery2_PcsGrn_1_Lot_OneSize_Ret.sql

## Order Management and Sales

Order entry, amendments, status tracking, customer commitments, and sales-side execution.

### Suggested pages

- /orders
- /orders/new
- /orders/:orderId
- /orders/:orderId/amendments
- /orders/enquiry
- /orders/status
- /orders/in-hand
- /sales/invoices
- /sales/commercial-invoices
- /sales/packing-lists

### Functional requirements

- Capture order sheets with buyer, style, delivery, costing, and amendment history.
- Track order life cycle from enquiry through production, delivery, and closure.
- Support domestic and export invoice variations, packing lists, and order-linked dispatch documents.
- Provide order status dashboards, commitment dates, and in-hand summaries.
- Maintain amendment history and compare current versus prior order state.

### Backend and platform capabilities

- Order workflow engine
- Timeline/history
- Invoice document generation
- Order status APIs

### Evidence from legacy application

- Matched forms: 64
- Matched reports: 123
- Matched SQL objects: 59
- Example forms:
  - Fiberpro.Frm_CommercialTemplate
  - Fiberpro.Frm_OrderInputMas
  - Fiberpro.Frm_Ordersheet_Preview
  - Fiberpro.Frm_Password_List
  - Fiberpro.FrmAcc_ProgCancel
  - Fiberpro.frmAccSalesDel
  - Fiberpro.FrmBuyerStatus
  - Fiberpro.FrmChangePassword
  - Fiberpro.FrmCommericalInv_New
  - Fiberpro.frmCuttingJobOrder
  - Fiberpro.frmDelCumInv
  - Fiberpro.frmGeneralPurchaseOrd
  - Fiberpro.frmGRNEntry_MultiOrder
  - Fiberpro.FrmInvComm
  - Fiberpro.FrmJobOrderList
  - Fiberpro.FrmLocalInvConfirm
  - Fiberpro.FrmLocalInvoice
  - Fiberpro.FrmLocalInvPackingList
  - Fiberpro.FrmLocalInvPackingList_Solid
  - Fiberpro.FrmLocInvPackingListFormat
- Example reports:
  - FabDC_SGST_Cost_PrsRt_OrdWise.mrt
  - FabSalesDC.mrt
  - FabSalesDC_SGST.mrt
  - FabSalesDCCumInv.mrt
  - OrderSheetReg.mrt
  - OrderSheetReg_Set.mrt
  - OrderSheetRegFab.mrt
  - OrderSheetRegImage.mrt
  - OrderSheetRegImage_Set.mrt
  - OrderSheetRegYarn.mrt
  - PcsShipSample.mrt
  - Rpt_AccOrderwiseReqRegister.rpt
  - Rpt_AccOrderwiseReqRegister.vb
  - Rpt_CourierInv.rpt
  - Rpt_CuttingJobOrder.rpt
  - Rpt_CuttingJobOrder.vb
  - Rpt_CuttingJobOrder_GST.rpt
  - Rpt_CuttingJobOrder_GST_12.rpt
  - Rpt_CuttingJobOrder_GST_Large.rpt
  - Rpt_CuttingJobOrder_GST_Large_11.rpt
- Example SQL objects:
  - NumberToWordsNew.sql
  - Party_Outstanding_OrdwiseStk_Arrival.sql
  - Proc_Rpt_OCR_Summary.sql
  - Proc_Rpt_OCR_Summary_CLR.sql
  - Proc_Rpt_OCR_Summary_CLR_Woven.sql
  - Proc_Rpt_OCR_Summary_Woven.sql
  - SP_Fab_Wise_Program _Corrected Multiple dia.Sql
  - SP_Fab_Wise_Program.Sql
  - SP_FabReqCalc_Domestic_joborder.sql
  - SP_InvQry1.sql
  - Sp_MR_OrdInHand.sql
  - SP_ORD_GRNSTATUS.sql
  - SP_OrderHistoryLedger.sql
  - SP_OrderHistoryLedger_Others.sql
  - SP_OrderStatus.sql
  - SP_OrderStatus_1.sql
  - SP_OrderStatus_2.sql
  - SP_OrderStatus_3.sql
  - Sp_PartyWiseJobOrderBal.sql
  - SP_Rpt_OrderRegColor.sql

## Procurement and Supplier Management

Purchase orders, supplier follow-up, GRN flows, and supplier-facing ledgers.

### Suggested pages

- /procurement/purchase-orders
- /procurement/purchase-orders/new
- /procurement/grn
- /procurement/grn/:id
- /procurement/suppliers
- /procurement/follow-up
- /procurement/bill-pass
- /procurement/gate-entry

### Functional requirements

- Manage purchase orders across raw materials, accessories, fabric, and outsourced services.
- Record GRN and receipt flows with order linkage, quantity tolerance, and return support.
- Support supplier follow-up, outstanding balances, and pending-rate confirmation.
- Handle bill-pass approvals, gate entry, and supplier document references.
- Provide supplier-level history across orders, receipts, invoices, and balances.

### Backend and platform capabilities

- PO service
- GRN workflow
- Supplier ledger
- Approval tasks

### Evidence from legacy application

- Matched forms: 38
- Matched reports: 94
- Matched SQL objects: 48
- Example forms:
  - Fiberpro.Frm_AppAwBill
  - Fiberpro.frm_composition
  - Fiberpro.frmBillPass
  - Fiberpro.FrmBillsAddDedReport
  - Fiberpro.FrmBillsReg
  - Fiberpro.frmBuyerPLReport
  - Fiberpro.FrmCrysReport
  - Fiberpro.FrmDirectBill_GateEntry
  - Fiberpro.FrmGateEntry
  - Fiberpro.FrmGatePass
  - Fiberpro.frmGeneralPurchaseOrd
  - Fiberpro.frmGRN_MultiProcess
  - Fiberpro.frmGRNEntry
  - Fiberpro.frmGRNEntry_MultiOrder
  - Fiberpro.frmGRNEntryAcc
  - Fiberpro.frmGRNEntryAcc_Ret_Multi
  - Fiberpro.FrmNonBillable
  - Fiberpro.FrmOtherPORelatedIps
  - Fiberpro.FrmPOCancel
  - Fiberpro.frmPoCompl
- Example reports:
  - AccDirectGRN.mrt
  - AccGRN.cs
  - AccGRN.mrt
  - AccGRNPO.mrt
  - ACCPO_96_17_198.pdf
  - BarcodeLayReport.rpt
  - BarcodeLayReport1.rpt
  - CrystalDecisions.CrystalReports.Engine.dll
  - CrystalDecisions.CrystalReports.Engine.xml
  - CrystalDecisions.ReportSource.dll
  - CrystalDecisions.ReportSource.xml
  - FabGRN.cs
  - FabGRN.mrt
  - FabGRN_MultiPrs.mrt
  - FabGRN_PackList.mrt
  - FabNewGRN.mrt
  - Fiberpro_ReportLibrary.dll
  - GenGRN.cs
  - GenGRN.mrt
  - PcsReceipt.mrt
- Example SQL objects:
  - CutACKStockPost.sql
  - MeetingReportChart.sql
  - PROC_PanelReceipt_Delete.sql
  - PROC_PanelReceipt_Delete_1.sql
  - PROC_PanelReceipt_Insert.sql
  - PROC_PanelReceipt_Update.sql
  - PROC_PiecesReceipt_Delete.sql
  - PROC_PiecesReceipt_Delete_1.sql
  - PROC_PiecesReceipt_Insert.sql
  - PROC_PiecesReceipt_Update.sql
  - SP_Barcode_Production_Posting.sql
  - SP_BillRegQry.sql
  - SP_BillsRegView_acc.sql
  - SP_BillsRegView_cm.sql
  - SP_BillsRegView_fab1.sql
  - SP_BillsRegView_fab2.sql
  - SP_BillsRegView_fab3.sql
  - SP_BillsRegView_fab4.sql
  - SP_BillsRegView_fab5.sql
  - SP_BillsRegView_prd.sql

## Production and Shop Floor

Production planning, line input/output, bundle and piece tracking, and stage-wise execution.

### Suggested pages

- /production/dashboard
- /production/planning
- /production/entries
- /production/line-input
- /production/line-output
- /production/bundles
- /production/pieces
- /production/stage-progress
- /production/rework
- /production/cost

### Functional requirements

- Capture production transactions by stage, line, unit, bundle, and piece.
- Support issue-to-production, line input/output, rejection, and rework workflows.
- Track order-wise production progress and in-house versus supplier execution.
- Enable dashboards for production status, bottlenecks, and hourly or shift-level output.
- Keep stage-wise stock posting in sync with finished goods and WIP balances.

### Backend and platform capabilities

- Shop-floor transaction APIs
- Realtime progress updates
- WIP tracking
- Rework management

### Evidence from legacy application

- Matched forms: 49
- Matched reports: 73
- Matched SQL objects: 112
- Example forms:
  - Fiberpro.Frm_ProductionCost
  - Fiberpro.Frm_ProductionEntryReg
  - Fiberpro.Frm_ProductionWages
  - Fiberpro.Frm_ProdWagesDept
  - Fiberpro.Frm_ProdWagesStage
  - Fiberpro.Frm_ProRouteTemplate
  - Fiberpro.frmAddPanelCutting
  - Fiberpro.FrmBundle_ProductionEntry
  - Fiberpro.FrmCuttingProduction_Auto_New
  - Fiberpro.frmDeptSettings
  - Fiberpro.FrmHourlySetting1
  - Fiberpro.FrmInhouseProductionStatusReg
  - Fiberpro.FrmIssueToProduction
  - Fiberpro.frmJobWorkPcsReturn
  - Fiberpro.FrmLineInput
  - Fiberpro.FrmLineInputManual
  - Fiberpro.frmLineOutputManual
  - Fiberpro.frmLineOutputManual_New
  - Fiberpro.FrmMasWorkNature
  - Fiberpro.FrmOperationEntry
- Example reports:
  - PanelDc1Rework_SGST.mrt
  - Pcs_IssueToProd.mrt
  - PcsDc -Acc.mrt
  - PcsDc.mrt
  - PcsDc_ACC.mrt
  - PcsDC_Acc_Pre.mrt
  - PcsDc_SGST_Large.mrt
  - PcsDc_WithRate.mrt
  - PcsDc1.mrt
  - PcsDc1_SGST.mrt
  - PcsDc1_SGST_Bit.mrt
  - PcsDc1_SGST_Cost.mrt
  - PcsDc1_SGST_Cost_1.mrt
  - PcsDc1_SGST_Cost_Large.mrt
  - PcsDc1_SGST_Cost_old.mrt
  - PcsDc1_SGST_Panel.mrt
  - PcsDc1Rework_SGST.mrt
  - PcsDcNew.mrt
  - PcsDespatch.mrt
  - PcsDespatch_Large.mrt
- Example SQL objects:
  - PanelProductionExistQty.sql
  - PROC_PanelReceipt_Delete.sql
  - PROC_PanelReceipt_Delete_1.sql
  - PROC_PanelReceipt_Insert.sql
  - PROC_PanelReceipt_Update.sql
  - PROC_Stock_DeliveryPanel_Delete.sql
  - PROC_Stock_DeliveryPanel_Delete_1.sql
  - PROC_Stock_DeliveryPieces_Delete_1_LineStk.sql
  - PROC_Stock_DeliveryPieces_Delete_LineStk.sql
  - PROC_Stock_LineTfr_Delete.sql
  - PROC_Stock_LineTfr_Delete_1.sql
  - PROC_Stock_LineTfr_Insert.sql
  - PROC_Stock_LineTfr_Update.sql
  - PROC_Stock_PanelDelivery_Insert.sql
  - PROC_Stock_PanelDelivery_Update.sql
  - PROC_Stock_PiecesDelivery_Insert_LineStk.sql
  - PROC_Stock_PiecesDelivery_Update_LineStk.sql
  - PROC_Stock_ProdPanel.sql
  - PROC_Stock_ProdPanel_Asm.sql
  - PROC_Stock_ProdPanel_Delete.sql

## Quality, Lab, and Approvals

Lab tests, approvals, non-return handling, and workflow checks across materials and production.

### Suggested pages

- /quality/lab-tests
- /quality/parameters
- /quality/results
- /approvals/pending
- /approvals/lots
- /approvals/accessories
- /approvals/reprocess
- /approvals/non-return-dc

### Functional requirements

- Configure test parameters and capture stage-wise lab or quality observations.
- Provide approval queues for lots, accessories, reprocess, and non-return movements.
- Record status changes, approver identity, remarks, and escalation timestamps.
- Support document-linked workflows and evidence storage for approval decisions.
- Expose quality and approval states to downstream production and dispatch modules.

### Backend and platform capabilities

- Workflow engine
- Approval inbox
- Quality data capture
- Evidence attachments

### Evidence from legacy application

- Matched forms: 10
- Matched reports: 3
- Matched SQL objects: 10
- Example forms:
  - Fiberpro.Frm_WF_DocumentStore
  - Fiberpro.FrmAccItemApproval
  - Fiberpro.FrmLabTest
  - Fiberpro.FrmLabTestInputParameters
  - Fiberpro.FrmLabTestParameters
  - Fiberpro.FrmLabTestStages
  - Fiberpro.frmLotApproval
  - Fiberpro.FrmNewLabTest
  - Fiberpro.FrmNonReturnDCApproval
  - Fiberpro.FrmReprocess_Approval
- Example reports:
  - Rpt_test.rpt
  - test.bat
  - Vue_LabTestGarments.Sql
- Example SQL objects:
  - MeetingChartAllDept.sql
  - MeetingReportChart.sql
  - selectMeetingDept.sql
  - SP_ApprovedRateCnf1.sql
  - SP_FabReqCalc_Domestic_joborder.sql
  - SP_Meet_ApprovalDetails.sql
  - SP_WBS_MeetingView.sql
  - UpdateMeeting_Posting.sql
  - Vue_LabTestGarments.Sql
  - WF_PlanFinishDateArrival.sql

## Reporting, Analytics, and Integrations

Operational reporting, print/export, barcode, Tally, email, Excel, and device integrations.

### Suggested pages

- /reports
- /reports/orders
- /reports/production
- /reports/inventory
- /reports/accounts
- /analytics/dashboards
- /integrations/tally
- /integrations/barcode
- /integrations/email
- /integrations/devices

### Functional requirements

- Rebuild the large report surface with parameterized web reports and export options.
- Support dashboards for orders, production, inventory, costing, and finance.
- Replace legacy Crystal and Stimulsoft dependencies with maintainable PDF and Excel generation.
- Preserve barcode, Tally, email, and device integration workflows behind clear service boundaries.
- Allow user-driven filtering, saved report presets, and scheduled exports where needed.

### Backend and platform capabilities

- Reporting service
- PDF and Excel export
- Barcode integration
- External system adapters

### Evidence from legacy application

- Matched forms: 15
- Matched reports: 298
- Matched SQL objects: 30
- Example forms:
  - Fiberpro.frmBarcodeReadingNew
  - Fiberpro.FrmBillsAddDedReport
  - Fiberpro.frmBuyerPLReport
  - Fiberpro.frmComboWiseReqRpt
  - Fiberpro.FrmCrysReport
  - Fiberpro.FrmIssueToProduction
  - Fiberpro.frmMIS
  - Fiberpro.FrmMISSetting
  - Fiberpro.FrmOrderRelatedInput_Excel
  - Fiberpro.FrmReport
  - Fiberpro.frmRpt
  - Fiberpro.FrmSMSMailSetup
  - Fiberpro.FrmStockRegister_SplRpt
  - Fiberpro.FrmTally_GSTSetup
  - Fiberpro.FrmWeightScale_Integration
- Example reports:
  - ACCPO_96_17_198.pdf
  - BarcodeLayReport.rpt
  - BarcodeLayReport1.rpt
  - CrystalDecisions.CrystalReports.Engine.dll
  - CrystalDecisions.CrystalReports.Engine.xml
  - CrystalDecisions.ReportSource.dll
  - CrystalDecisions.ReportSource.xml
  - CrystalDecisions.Shared.dll
  - CrystalDecisions.Shared.xml
  - CrystalDecisions.Web.dll
  - CrystalDecisions.Web.xml
  - CrystalDecisions.Windows.Forms.dll
  - CrystalDecisions.Windows.Forms.xml
  - debit.pdf
  - Fiberpro_ReportLibrary.dll
  - GSMail DBUpdation.txt
  - PO_32_17_206.pdf
  - PO_39_18_8376.pdf
  - Rpt_AccAck.rpt
  - Rpt_AccDel1.rpt
- Example SQL objects:
  - MeetingChartAllDept.sql
  - MeetingReportChart.sql
  - Proc_Rpt_OCR_Summary.sql
  - Proc_Rpt_OCR_Summary_CLR.sql
  - Proc_Rpt_OCR_Summary_CLR_Woven.sql
  - Proc_Rpt_OCR_Summary_Woven.sql
  - selectMeetingDept.sql
  - SP_Barcode_Production_Posting.sql
  - Sp_BIStockRpt.sql
  - SP_BundleBarcode_Check.sql
  - SP_Cuttingpanelrpt.sql
  - Sp_maillist1.sql
  - SP_OnePageRpt.sql
  - SP_PcsBarcode_Check.sql
  - SP_PcsBarcode_Check_Rejection.sql
  - SP_Rpt_accdelaccret.Sql
  - SP_Rpt_AccStockItemLedger.sql
  - SP_Rpt_AccToDoIssProdUnit.sql
  - SP_Rpt_DebitNote.sql
  - SP_Rpt_DebitNoteAcc.sql

## Migration notes

- Inventory and production flows currently depend on SQL-side posting procedures and triggers. Preserve transactional integrity before changing the data model.
- Reporting is extensive. Treat report migration as a separate workstream with its own prioritization and acceptance criteria.
- Barcode, print, PDF, Excel, Tally, and workflow approvals should be isolated behind service interfaces in the MERN architecture.
- Unclassified forms: 28, reports: 12, SQL objects: 63.
