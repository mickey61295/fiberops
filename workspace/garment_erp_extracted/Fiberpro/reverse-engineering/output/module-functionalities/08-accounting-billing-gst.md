# Module 8 — Accounting, Billing & GST

> **Generated**: 2026-03-15  
> **Source**: ~35 forms (invoicing, debit notes, bill pass, party balance, billing registers, payment registers, expenses, GST/HSN, Tally integration, supplier billing), ~25 stored procedures (SP_BillRegQry, SP_BillsRegView_*, SP_BilltoBeValue*, SP_SalesInv, SP_InvQry1, SP_DEBITQRY*, Sp_AccTransaction, Sp_Acc_PartyBalance, Spl_Bills_InvPcs*, SP_Vue_SalesInvoice*, SP_Vue_OtherCharge*, SP_Rpt_DebitNote*), 4 triggers (Trg_ST_Acc_PartyBal_Abs_Update, Trg_ST_Acc_Prog_Balance_Update, Trg_ST_Acc_Prog_Balance_Update_Actual, Trg_ST_PartyBalance_Abs_Update), 1 view (Vue_InputGST), 30+ report templates (.mrt/.rpt)  
> **Foundation References**: database-schema.md, stored-procedures-analysis.md, triggers-and-views-analysis.md, formulas-and-calculations.md, 03-procurement-supplier.md, 07-dispatch-delivery-logistics.md

---

## Table of Contents

1. [Module Overview](#1-module-overview)
2. [Forms Inventory](#2-forms-inventory)
3. [Data Model — Core Transaction Tables](#3-data-model--core-transaction-tables)
   - 3.1 Trs_Bills — Supplier Bill Pass Header
   - 3.2 Trs_BillRate — Bill Line Items (Rate/Qty)
   - 3.3 Trs_BillAddded — Bill Additions/Deductions (GST, TCS, etc.)
   - 3.4 Trs_BillDeb1 / Trs_BillDeb2 — Bill-Linked Debit Notes
   - 3.5 Trs_Deb1 / Trs_Deb2 — Standalone Debit Note Transactions
   - 3.6 Trs_DebAddDed — Debit Note Additions/Deductions
   - 3.7 Trs_SalInv — Sales Invoice Header
   - 3.8 Trs_SalInvAddded — Sales Invoice Additions/Deductions
   - 3.9 Trs_JobWrkInv / TempPcsDCDetInv — Piece/Job Work Invoice
   - 3.10 Trs_JWrkInvAddded — Piece Invoice Additions/Deductions
   - 3.11 Trs_ProdBillMasNew / Trs_ProdBillDetNew — Production Bill (In-House)
   - 3.12 Trs_ProdBillEntry — Production Bill Entry (Piece-Rate Workers)
   - 3.13 Trs_prodBillAddded1 — Production Bill Additions/Deductions
   - 3.14 ShippingBill / ShippingBill_Det — Shipping Bill (Export)
   - 3.15 ST_Acc_Prog_Balance — Accessories Program Balance (Summary)
   - 3.16 ST_Acc_PartyBal_Abs — Accessories Party Balance Abstract
   - 3.17 ST_PartyBalance_Abs — Fabric/Yarn Party Balance Abstract
   - 3.18 Mas_AddDed — Additions/Deductions Master
   - 3.19 Mas_HSN — HSN Code Master
   - 3.20 Mas_SalesGrp — Sales Invoice Prefix Configuration
4. [Bill Type Taxonomy](#4-bill-type-taxonomy)
5. [Supplier Bill Pass — frmBillPass](#5-supplier-bill-pass--frmbillpass)
   - 5.1 Bill Registration Workflow
   - 5.2 Bill Types (Purchase, Job Work, Production)
   - 5.3 GRN-to-Bill Linking (Trs_BillRate ← BrnID)
   - 5.4 Additions & Deductions (GST Split Logic)
   - 5.5 Bill Pass/Approval Flag (PassFlg)
   - 5.6 TDS Handling (TDS_Percent, TDSAmount)
   - 5.7 Multi-Currency Bills (Fcy, ExchangeRate)
6. [Billing Registers — FrmBillsReg / FrmBillsAddDedReport](#6-billing-registers--frmbillsreg--frmbillsadddedreport)
   - 6.1 Department-Specific Register Views
   - 6.2 GST Breakup in Registers (CGST/SGST/IGST)
   - 6.3 TCS & Other Charges Apportionment
7. [Debit Notes — frmdebitnote / frmDirectDebitNote](#7-debit-notes--frmdebitnote--frmdirectdebitnote)
   - 7.1 GRN-Linked Debit Notes
   - 7.2 Direct Debit Notes
   - 7.3 Debit Query Logic (SP_DEBITQRY variants)
   - 7.4 Debit Note Reports
8. [Sales Invoice — frmSalINV](#8-sales-invoice--frmsalinv)
   - 8.1 Invoice Creation Workflow (DC → Invoice)
   - 8.2 Invoice Type Prefixes (Yarn/Fabric/Accessory)
   - 8.3 GST Calculation — HSN-Based Rate Determination
   - 8.4 Vue_SalesInvoice — Composite View Construction
   - 8.5 Sales Invoice Additions/Deductions
9. [Local Invoice — FrmLocalInvoice / FrmLocalInvConfirm](#9-local-invoice--frmlocalinvoice--frmlocalinvconfirm)
   - 9.1 Local Invoice Workflow
   - 9.2 Invoice Confirmation
   - 9.3 Packing Lists (FrmLocalInvPackingList, FrmLocalInvPackingList_Solid)
10. [Commercial Invoice — FrmCommericalInv_New / frmNewInv](#10-commercial-invoice--frmcommericalinv_new--frmnewinv)
    - 10.1 Export Invoice Structure
    - 10.2 Delivery-Cumulative Invoice (frmDelCumInv)
11. [Piece Invoice — frmPieceInv / frmPieceInv_1](#11-piece-invoice--frmpieceinv--frmpieceinv_1)
    - 11.1 Piece-Wise Invoice Creation
    - 11.2 Job Work Invoice (Trs_JobWrkInv)
    - 11.3 TempPcsDCDetInv Staging Table
    - 11.4 HSN-Based GST for Piece Invoices
12. [Production Bill — FrmProdBillNew](#12-production-bill--frmprodbillnew)
    - 12.1 In-House Production Worker Billing
    - 12.2 ProdPcs vs BilledPcs Tracking
    - 12.3 Production Bill Additions (Tax Handling)
13. [Bill-to-Be Value Calculation — SP_BilltoBeValue*](#13-bill-to-be-value-calculation--sp_billtobevalue)
    - 13.1 Yarn Bill-to-Be (YF='Y')
    - 13.2 Fabric Bill-to-Be (YF='F')
    - 13.3 Accessories Bill-to-Be (YF='A')
    - 13.4 Piece/Panel Bill-to-Be (Job Work)
    - 13.5 Hot Process / Unplanned Process
    - 13.6 Detail Breakup (SP_BilltoBeValue_Detail)
    - 13.7 Approximate Calculation (SP_BilltoBeValue_Approx)
14. [Party Balance & Outstanding — FrmPartyBalanceRegister / FrmPartyBlnc](#14-party-balance--outstanding--frmpartybalanceregister--frmpartyblnc)
    - 14.1 Accessories Party Balance (Sp_Acc_PartyBalance)
    - 14.2 Accessories Program Balance (Sp_AccTransaction)
    - 14.3 Fabric/Yarn Party Balance (ST_PartyBalance_Abs)
    - 14.4 Replication Triggers (UpdateFlg Pattern)
15. [Payment Registers — FrmPaymentReg / FrmPaymentReg_Wages](#15-payment-registers--frmpaymentralareg--frmpaymentralareg_wages)
16. [Expenses — FrmExpenses / FrmFixedExpensesEntry / FrmStylewiseExpensesEntry](#16-expenses--frmexpenses--frmfixedexpensesentry--frmstylewise​expensesentry)
    - 16.1 Expense Group Master (FrmExpenseGroup / FrmMasExpenses)
    - 16.2 Fixed Expense Entry
    - 16.3 Style-Wise Expense Entry
    - 16.4 Expense Register (FrmExpenseEntryRegister)
17. [GST Configuration & HSN — FrmHSN / FrmHSNPce / FrmTally_GSTSetup](#17-gst-configuration--hsn--frmhsn--frmhsnpce--frmtally_gstsetup)
    - 17.1 HSN Master (Mas_HSN)
    - 17.2 HSN Piece Master (FrmHSNPce)
    - 17.3 GST Rate Determination Algorithm
    - 17.4 Input GST View (Vue_InputGST)
    - 17.5 Tally GST Setup (FrmTally_GSTSetup)
18. [Non-Billable / Awaiting Bill — FrmNonBillable / Frm_AppAwBill](#18-non-billable--awaiting-bill--frmnon​billable--frm_appawbill)
19. [Supplier Bill Register — FrmSupplierBillReg](#19-supplier-bill-register--frmsupplierbillreg)
20. [Accessory Item Approval — FrmAccItemApproval](#20-accessory-item-approval--frmaccitemapproval)
21. [P&L Register — FrmPLReg](#21-pl-register--frmplreg)
22. [Accessory Stock Register — FrmAccStockReg](#22-accessory-stock-register--frmaccstockreg)
23. [Report Templates Catalog](#23-report-templates-catalog)
24. [Stored Procedures Summary Table](#24-stored-procedures-summary-table)
25. [Key Business Rules & Constraints](#25-key-business-rules--constraints)
26. [Cross-Module Integration Points](#26-cross-module-integration-points)
27. [MERN Migration Notes](#27-mern-migration-notes)

---

## 1. Module Overview

The Accounting, Billing & GST module is the financial backbone of FiberPro. It manages the entire lifecycle of financial transactions from supplier bill registration through payment tracking, and from sales invoicing through GST compliance. The module bridges material transactions (GRNs, DCs, piece receipts) with their monetary counterparts (bills, invoices, debit notes).

**Core capabilities:**
- **Supplier Billing**: Register bills against GRNs, link to purchase orders, apply additions/deductions (GST, TCS, discounts, freight), pass/approve bills
- **Sales Invoicing**: Generate invoices from delivery challans (fabric/yarn/accessories/pieces), compute GST based on HSN codes and interstate/intrastate rules
- **Debit Notes**: Issue GRN-linked or direct debit notes for rate adjustments, quality deductions, quantity discrepancies
- **GST Compliance**: HSN-based tax rate determination, CGST/SGST split for intrastate, IGST for interstate, input GST tracking, branded vs non-branded rate logic, Tally export integration
- **Party Balance Tracking**: Real-time PO-vs-DC-vs-GRN balance tracking for accessories and fabric/yarn, per order/style/department/party
- **Bill-to-Be Value**: Calculate pending billing amounts per order across yarn, fabric, accessories, and piece job work categories
- **Expense Management**: Fixed and style-wise expense entry for cost accounting, feeding into P&L reports
- **Payment Tracking**: Payment registers for supplier payments and wage payments

---

## 2. Forms Inventory

| # | Form Name | Purpose |
|---|-----------|---------|
| 1 | `frmBillPass` | Supplier bill registration & pass/approval |
| 2 | `FrmBillsReg` | Bills register — department-wise summary |
| 3 | `FrmBillsAddDedReport` | Bills additions/deductions report |
| 4 | `frmdebitnote` | GRN-linked debit note entry |
| 5 | `frmDirectDebitNote` | Direct debit note (no GRN link) |
| 6 | `frmSalINV` | Sales invoice for fabric/yarn/accessories (DC-based) |
| 7 | `FrmLocalInvoice` | Local (domestic) invoice creation |
| 8 | `FrmLocalInvConfirm` | Local invoice confirmation/finalization |
| 9 | `FrmLocalInvPackingList` | Packing list for local invoice |
| 10 | `FrmLocalInvPackingList_Solid` | Solid-color packing list variant |
| 11 | `frmNewInv` | New invoice entry (general) |
| 12 | `FrmCommericalInv_New` | Commercial (export) invoice |
| 13 | `frmPieceInv` | Piece job work invoice |
| 14 | `frmPieceInv_1` | Piece invoice variant |
| 15 | `frmDelCumInv` | Delivery-cumulative invoice |
| 16 | `FrmProdBillNew` | Production bill (in-house worker payment) |
| 17 | `FrmPartyBalanceRegister` | Party balance register report |
| 18 | `FrmPartyBlnc` | Party balance inquiry/view |
| 19 | `FrmPaymentReg` | Payment register (suppliers) |
| 20 | `FrmPaymentReg_Wages` | Payment register (wages) |
| 21 | `FrmNonBillable` | Non-billable items tracking |
| 22 | `Frm_AppAwBill` | Awaiting bill approval |
| 23 | `FrmAccItemApproval` | Accessory item rate/bill approval |
| 24 | `FrmExpenses` | Expense entry |
| 25 | `FrmFixedExpensesEntry` | Fixed expense entry |
| 26 | `FrmStylewiseExpensesEntry` | Style-wise expense entry |
| 27 | `FrmExpenseGroup` | Expense group master |
| 28 | `FrmMasExpenses` | Expense master |
| 29 | `FrmExpenseEntryRegister` | Expense entry register report |
| 30 | `FrmPLReg` | Profit & Loss register |
| 31 | `FrmHSN` | HSN code master (fabric/yarn/accessories) |
| 32 | `FrmHSNPce` | HSN code master (pieces) |
| 33 | `FrmTally_GSTSetup` | Tally integration GST setup |
| 34 | `FrmSupplierBillReg` | Supplier bill register |
| 35 | `FrmAccStockReg` | Accessory stock register (billing context) |

---

## 3. Data Model — Core Transaction Tables

### 3.1 Trs_Bills — Supplier Bill Pass Header

Primary table for supplier bill registration. Each row is one bill entry.

| Column | Type | Purpose |
|--------|------|---------|
| ID | int (PK) | Auto-generated bill ID |
| BrNo | varchar | Bill receipt number (internal) |
| Finyear | char(2) | Financial year code |
| Brdt | datetime | Bill receipt date |
| BillNo | varchar | Supplier's bill/invoice number |
| Billdt | datetime | Supplier's bill date |
| Party | int (FK→Mas_Party.PID) | Supplier party |
| Coycode | int (FK→Mas_Exporter.ExpID) | Company/unit |
| BillAmt | numeric | Total bill amount |
| BillType | varchar | 'Purchase', 'Process', 'pp' (production) |
| Type | varchar | Bill classification type |
| PassFlg | char(1) | 'Y'=Passed/Approved, 'N'=Pending |
| GrpCode | int | Grouping code for additions/deductions |
| Fcy | int (FK) | Foreign currency ID (0 = INR) |
| Remarks | varchar | User notes |
| ERN | varchar | E-Receipt Number (for GST reconciliation) |
| GSTBill | char(1) | 'Y' if GST-applicable bill |
| PreparedBy | int (FK→Mas_User.UserCode) | User who created the bill |
| TDS_Percent | numeric | TDS deduction percentage |
| TDSAmount | numeric | TDS deduction amount |

### 3.2 Trs_BillRate — Bill Line Items

Line items linking bills to orders, departments, and material details.

| Column | Type | Purpose |
|--------|------|---------|
| ID | int (FK→Trs_Bills.ID) | Bill header link |
| OrdID | int (FK→OrderMas.OrdId) | Order reference |
| Dept | int (FK→Mas_JobWrkComp.Id) | Department/work-component reference |
| PoId | int (FK→Trs_Po1.Id) | Purchase order reference |
| Rate | numeric | Unit rate |
| Kgs | numeric | Quantity in KG |
| Mtr | numeric | Quantity in meters |
| Rls | numeric | Quantity in rolls |
| Amount | numeric | Gross amount (Qty × Rate) |
| NetAmount | numeric | Net amount after adjustments |
| Amount1 | numeric | Taxable amount |
| TaxPer | numeric | Tax percentage |
| TaxAmt | numeric | Tax amount |
| Dis_Percent | numeric | Discount percentage |
| DisAmt | numeric | Discount amount |
| FabId | int | Fabric ID |
| CntId | int | Count ID (yarn) |
| ColId | int | Color ID |
| MillID | int | Mill ID |
| DiaID | int | Dia ID |
| StyleID | int | Style ID |
| Atype | int | Accessory type |
| Ades | int | Accessory description |
| Asiz | int | Accessory size |
| PanelID | int | Panel/Part ID |
| CompId | int | Component ID |
| SizeID | int | Size ID (piece production) |
| StyleNo | varchar | Style number |

### 3.3 Trs_BillAddded — Bill Additions/Deductions

| Column | Type | Purpose |
|--------|------|---------|
| ID | int (FK→Trs_Bills.ID) | Bill header link |
| Grp | int | Group code (matches Trs_Bills.GrpCode) |
| Adddedcode | int (FK→Mas_AddDed.AddDedCode) | Addition/deduction type code |
| Valu | numeric | Percentage value |
| Amt | numeric | Computed amount |
| PartyAmt | numeric | Amount apportioned to party |

**Key AddDedCode values** (from Mas_AddDed):
- 1, 2: Reserved system codes
- 9, 14: Other charges/adjustments
- 21, 22: Transport/freight related
- 40: CGST
- 41: SGST
- 42: IGST
- TCS: identified by `AddDedName LIKE '%TCS%'`
- Others: any code not in (1,2,40,41,42) and name not like '%GST%'/'%TCS%'

### 3.4 Trs_BillDeb1 / Trs_BillDeb2 — Bill-Linked Debit Notes

Debit notes linked to a specific bill (Trs_Bills).

| Table.Column | Purpose |
|--------------|---------|
| Trs_BillDeb1.Id | Debit note PK |
| Trs_BillDeb1.BrnId | FK→Trs_Bills.ID (the bill being debited) |
| Trs_BillDeb1.DNo | Debit note number |
| Trs_BillDeb1.FinYear | Financial year |
| Trs_BillDeb2.Id | FK→Trs_BillDeb1.Id |
| Trs_BillDeb2.PoId | PO reference |
| Trs_BillDeb2.Rate | Debit rate |
| Trs_BillDeb2.Amount | Debit amount |
| Trs_BillDeb2.Reason | Debit reason text |
| Trs_BillDeb2.Atype/Ades | Accessory type/desc (for matching to bill lines) |

### 3.5 Trs_Deb1 / Trs_Deb2 — Standalone Debit Note Transactions

Standalone debit notes linked to bills via `Trs_Deb1.BrnId → Trs_Bills.ID`.

| Table.Column | Purpose |
|--------------|---------|
| Trs_Deb1.ID | Debit note header PK |
| Trs_Deb1.OrdID | Order reference |
| Trs_Deb1.Dept | Department (FK→Mas_Dept.DeptID) |
| Trs_Deb1.BrnId | FK→Trs_Bills.ID (linked bill) |
| Trs_Deb1.DebitValue | Total debit value |
| Trs_Deb1.Fcy | Foreign currency ID |
| Trs_Deb2.ID | FK→Trs_Deb1.ID |
| Trs_Deb2.OrdId | Order reference |
| Trs_Deb2.StockID | FK→StockTable.StockID |
| Trs_Deb2.DebKg | Debit quantity (KGs) |
| Trs_Deb2.Rate | Unit rate |
| Trs_Deb2.NetAmt | Net debit amount |

### 3.6 Trs_DebAddDed — Debit Note Additions/Deductions

| Column | Purpose |
|--------|---------|
| ID | FK→Trs_Deb1.ID |
| AdddedCode | Type code (2 = standard net amount add/ded) |
| Amt | Amount |

### 3.7 Trs_SalInv — Sales Invoice Header

Sales invoices for fabric/yarn/accessory deliveries.

| Column | Type | Purpose |
|--------|------|---------|
| ID | int (PK) | Invoice ID |
| InvNo | varchar | Invoice number |
| Inv_Prefix | varchar | Invoice prefix |
| Finyear | char(2) | Financial year |
| Invdt | datetime | Invoice date |
| Coycode | int (FK→Mas_Exporter.ExpID) | Company |
| Party | int (FK→Mas_Party.PID) | Buyer party |
| PartyType | varchar | Party type indicator |
| InvType | char(1) | 'Y'=Yarn, 'F'=Fabric, 'A'=Accessory |
| VehicleId | int | Vehicle reference |
| ReverseCharge | bit | Reverse charge mechanism flag |
| TransPortationMode | varchar | Mode of transport |
| DelAt | int | Delivery-at party (for alternate delivery address) |
| Remarks | varchar | Invoice remarks |

**Linked tables:**
- `Trs_Del1.InvId = Trs_SalInv.ID` — links DCs to this invoice
- `Trs_SalInvAddded` — invoice additions/deductions

### 3.8 Trs_SalInvAddded — Sales Invoice Additions/Deductions

| Column | Purpose |
|--------|---------|
| ID | FK→Trs_SalInv.ID |
| AddDedCode | Type code (same Mas_AddDed references) |
| Amount | Computed amount |

### 3.9 Trs_JobWrkInv / TempPcsDCDetInv — Piece/Job Work Invoice

| Table.Column | Purpose |
|--------------|---------|
| Trs_JobWrkInv.ID | Invoice PK |
| Trs_JobWrkInv.InvNo | Invoice number |
| Trs_JobWrkInv.Dt | Invoice date |
| Trs_JobWrkInv.PartyName | FK→Mas_Party.PID |
| Trs_JobWrkInv.InvFlg | Invoice flag |
| Trs_JobWrkInv.VehicleId | Vehicle reference |
| Trs_JobWrkInv.ReverseCharge | Reverse charge flag |
| Trs_JobWrkInv.TransPortationMode | Transport mode |
| Trs_JobWrkInv.Delivery | Delivery details |
| TempPcsDCDetInv.InvId | FK→Trs_JobWrkInv.ID |
| TempPcsDCDetInv.WorkDet | Work description |
| TempPcsDCDetInv.TotPcs | Total pieces |
| TempPcsDCDetInv.JRate | Job rate per piece |
| TempPcsDCDetInv.Amount | Line amount |
| TempPcsDCDetInv.OrdId | Order reference |
| TempPcsDCDetInv.StyleNo | Style number |
| TempPcsDCDetInv.HsnId | HSN code reference |
| TempPcsDCDetInv.HSN_Percent | GST percentage from HSN |

### 3.10 Trs_JWrkInvAddded — Piece Invoice Additions/Deductions

Same structure as Trs_SalInvAddded; linked to `Trs_JobWrkInv.ID`.

### 3.11 Trs_ProdBillMasNew / Trs_ProdBillDetNew — Production Bill (In-House)

For billing in-house production workers (employees, not external suppliers).

| Table.Column | Purpose |
|--------------|---------|
| Trs_ProdBillMasNew.ID | Bill PK |
| Trs_ProdBillMasNew.Coycode | Company |
| Trs_ProdBillMasNew.EmpId | FK→Mas_Emp.ID (employee) |
| Trs_ProdBillMasNew.BillNo | Bill number |
| Trs_ProdBillMasNew.Brdt | Bill date |
| Trs_ProdBillMasNew.BrNo | Bill receipt number |
| Trs_ProdBillMasNew.Finyear | Financial year |
| Trs_ProdBillMasNew.PassFlg | Pass/approval flag |
| Trs_ProdBillDetNew.ID | FK→master |
| Trs_ProdBillDetNew.OrdId | Order reference |
| Trs_ProdBillDetNew.StageID | FK→Mas_JobWrkComp.Id (stage) |
| Trs_ProdBillDetNew.ColorId | Color ID |
| Trs_ProdBillDetNew.Rate | Rate per piece |
| Trs_ProdBillDetNew.ThisBillQty | Pieces billed in this entry |

### 3.12 Trs_ProdBillEntry — Production Bill Entry (Piece-Rate Workers)

Tracks cumulative production quantities vs billed quantities.

| Column | Purpose |
|--------|---------|
| OrdId | Order reference |
| EmpId | Employee reference |
| StageID | Work stage reference |
| StyleNo | Style number |
| PartId | Part/panel ID |
| ColorId | Color ID |
| ProdPcs | Total produced pieces |
| BilledPcs | Total billed pieces |
| Shift_Pcs | 'P' = piece-rate billing |

**Business Rule**: Pending billable = `ProdPcs - BilledPcs`. Only entries where `(ProdPcs - BilledPcs) > 0` are included in bill-to-be calculations.

### 3.13 Trs_prodBillAddded1 — Production Bill Additions

| Column | Purpose |
|--------|---------|
| ID | FK→Trs_ProdBillMasNew.ID |
| Adddedcode | AddDed type (40=CGST, 41=SGST, 42=IGST) |
| Value | Tax percentage value |

### 3.14 ShippingBill / ShippingBill_Det — Shipping Bill (Export)

Export shipping bills linking to billing.

| Table.Column | Purpose |
|--------------|---------|
| ShippingBill.ID | PK |
| ShippingBill.Party | FK→Mas_Party.PID |
| ShippingBill.Dept | Department FK |
| ShippingBill.Coycode | Company |
| ShippingBill_Det.CID | FK→ShippingBill.ID |
| ShippingBill_Det.OrdId | Order reference |

### 3.15 ST_Acc_Prog_Balance — Accessories Program Balance

Running summary table tracking accessories program balance per order/style/accessory item.

| Column | Purpose |
|--------|---------|
| OrdId | Order reference |
| StyleNo | Style number |
| AType | Accessory type |
| ADes | Accessory description |
| ACol | Accessory color |
| ASize | Accessory size |
| ReqQty | Required quantity (from program) |
| POQty | Purchase order quantity |
| RECQty | Received quantity (GRN/DC) |
| RETQty | Return quantity |
| DELQty | Delivered quantity (process DC) |
| ProRetQty | Production return quantity |
| TranOutQty | Transfer-out quantity |

**Updated by**: `Sp_AccTransaction` stored procedure, called with `@TransType` = NEW/PO/GRN/RET/DC/PRSDC/ISSRET/TRANOUT and `@transFlg` = '+'/'-'.

**Trigger**: `Trg_ST_Acc_Prog_Balance_Update` sets `UpdateFlg=1` on any non-replication update (for multi-server sync).

### 3.16 ST_Acc_PartyBal_Abs — Accessories Party Balance Abstract

Tracks PO/DC vs GRN balance per order/party/department for accessories.

| Column | Purpose |
|--------|---------|
| OrdId | Order reference |
| StyleNo | Style |
| DeptId | Department |
| PartyID | Supplier party |
| PO_DC_No | PO or DC number |
| PO_DC_Date | PO/DC date |
| PO_DC_ItemDesc | Item description |
| PO_DC_Qty | PO/DC quantity |
| DCUOM | DC unit of measure |
| GrnQty | Received (GRN) quantity |
| GRN_ItemDesc | GRN item description |
| GRNUOM | GRN unit of measure |
| Acc_Id | Accessory ID |
| POFlg | 1=PO entry |

**Updated by**: `Sp_Acc_PartyBalance` with `@TransType` = PO/GRN/DC.

**Trigger**: `Trg_ST_Acc_PartyBal_Abs_Update` sets `UpdateFlg=1`.

### 3.17 ST_PartyBalance_Abs — Fabric/Yarn Party Balance Abstract

Similar to accessories party balance, for fabric/yarn materials. Updated via application logic and maintained with `Trg_ST_PartyBalance_Abs_Update` trigger.

### 3.18 Mas_AddDed — Additions/Deductions Master

| Column | Purpose |
|--------|---------|
| AddDedCode | PK — unique code |
| AddDedName | Name (e.g., 'CGST', 'SGST', 'IGST', 'TCS', 'Freight', 'Discount') |
| IndexCode | Display ordering |
| Grp | Group code (1=Sales, 5=Piece) |

### 3.19 Mas_HSN — HSN Code Master

| Column | Purpose |
|--------|---------|
| ID | PK |
| HSNCode | HSN/SAC code string |
| UnitRate | Threshold rate for branded/non-branded split |
| BPercL | Branded % — Low (rate < UnitRate) |
| BPercH | Branded % — High (rate ≥ UnitRate) |
| NBPercL | Non-Branded % — Low |
| NBPercH | Non-Branded % — High |

**Linked to**: `Mas_Count.HSNID` (yarn), `Mas_Fabric.HSNID` (fabric), `Mas_Acc.HSNID` (accessories), `Acc_PO_HSN_Detail` (order-specific HSN override).

### 3.20 Mas_SalesGrp — Sales Invoice Prefix Configuration

| Column | Purpose |
|--------|---------|
| Coycode | Company FK |
| Sales_Inv_Yarn_Prefix | Prefix for yarn invoices (e.g., 'YI') |
| Sales_Inv_Fabric_Prefix | Prefix for fabric invoices |
| Sales_Inv_Acc_Prefix | Prefix for accessory invoices |
| Sales_Inv_Pcs_Prefix | Prefix for piece invoices |

---

## 4. Bill Type Taxonomy

| BillType Value | Description | Source |
|---------------|-------------|--------|
| `Purchase` | Direct material purchase bill | frmBillPass |
| `Process` | Process bill (knitting, dyeing, etc.) | frmBillPass |
| `pp` | Production piece-rate bill (job work) | frmBillPass / FrmProdBillNew |
| `Production` | In-house employee production bill | SP_BillsRegView_prd |

In SP_BillRegQry, bills with `type='pp'` route through `Mas_JobWrkComp` for department resolution, while other types use `Mas_Dept` directly.

---

## 5. Supplier Bill Pass — frmBillPass

### 5.1 Bill Registration Workflow

1. User selects company (Coycode), order, department, and supplier
2. System loads unlinked GRN entries (matching order/dept/party)
3. User enters supplier's bill number and date
4. System populates line items from GRN data (quantities, rates)
5. User applies additions/deductions (GST, TCS, discount, freight)
6. Bill is saved to `Trs_Bills` (header) + `Trs_BillRate` (lines) + `Trs_BillAddded` (add/ded)
7. Bill starts with `PassFlg='N'`; authorized user sets `PassFlg='Y'`

### 5.2 Bill Types

- **Purchase bills**: Linked to GRNs via `Trs_BillRate.PoId` → `Trs_Po1.Id`. When `Fcy > 0`, amounts are multiplied by `Trs_Po1.ExchangeRate` for INR conversion.
- **Job work (pp)**: Links through `Mas_JobWrkComp` for department resolution. Bill lines reference piece GRN data.
- **Production bills**: Employee-based (via `Trs_ProdBillMasNew.EmpId`).

### 5.3 GRN-to-Bill Linking

- `Trs_BillRate.ID` → `Trs_Bills.ID` (bill header)
- `Trs_BillRate.OrdID` → order reference
- `Trs_BillRate.Dept` → department (via Mas_JobWrkComp)
- `Trs_BillRate.PoId` → purchase order
- GRN entries marked with `InvId` once billed (used in bill-to-be to exclude billed items)

### 5.4 Additions & Deductions — GST Split Logic

GST split is determined by comparing `Mas_Party.StateId` vs `Mas_Exporter.StateId`:

```
IF Party.StateId = Exporter.StateId THEN
    CGST = TaxAmt / 2
    SGST = TaxAmt / 2
    IGST = 0
ELSE
    CGST = 0
    SGST = 0
    IGST = TaxAmt
```

When `TaxAmt = 0` but `NetAmount > Amount` (i.e., GST included in net), the system derives GST from the difference: `(NetAmount - Amount)`.

### 5.5 Bill Pass/Approval Flag

`PassFlg` on `Trs_Bills` controls bill approval status. Bill register views expose this flag for filtering approved vs pending bills.

### 5.6 TDS Handling

`Trs_Bills.TDS_Percent` and `TDSAmount` store TDS deduction details. TDS is deducted from the payable amount to the supplier. Visible in `Spl_Bills_InvPcs` query output.

### 5.7 Multi-Currency Bills

When `Trs_Bills.Fcy > 0`:
- `Trs_Po1.ExchangeRate` provides the conversion rate
- Amounts in SP_DEBITQRY calculations are multiplied: `Amount * ExchangeRate`
- Net amounts similarly converted: `NetAmt * ExchangeRate`

---

## 6. Billing Registers — FrmBillsReg / FrmBillsAddDedReport

### 6.1 Department-Specific Register Views

Multiple stored procedures generate billing register data by department type:

| SP | Department/Material Type | Key Columns |
|----|------------------------|-------------|
| `SP_BillsRegView_Yarn` | Yarn departments | CountName, ColorDesc, ShortMill, Kgs, Rate |
| `SP_BillsRegView_fab1`–`fab5` | Fabric departments (5 variants) | Fabdesc, ColorDesc, Kgs, Rate |
| `SP_BillsRegView_acc` | Accessories | Acc_Descr, AccDescription, ColorDesc, SizeDesc |
| `SP_BillsRegView_prd`–`prd2` | Production/piece-rate | ColorDesc, Rate, Kgs (or pieces) |
| `SP_BillsRegView_cm` | CM (Cut & Make) | (variation for CMT billing) |

**Common parameters**: `@coycode int, @DeptId int, @FromDt Date, @ToDate Date`

### 6.2 GST Breakup in Registers

All register views compute GST columns:
- `CGSTAmt` / `SGSTAmt`: `Sum(TaxAmt)/2` when `Party.StateId = Exporter.StateId`
- `IGSTAmt`: `Sum(TaxAmt)` when `Party.StateId <> Exporter.StateId`
- Fallback `CGSTAmt1/SGSTAmt1/IGSTAmt1`: derived from `(NetAmount - GrossAmount)` when explicit TaxAmt is zero

### 6.3 TCS & Other Charges Apportionment

When a bill has multiple orders (`OrdCnt > 1`), TCS and "Others" amounts are divided:
```sql
TcsAmt = CASE WHEN OrdCnt > 1 THEN TcsAmt / OrdCnt ELSE TcsAmt END
OthersAmt = CASE WHEN OrdCnt > 1 THEN OthersAmt / OrdCnt ELSE OthersAmt END
```

TCS is identified via `AddDedName LIKE '%TCS%'`. "Others" excludes codes in `(1,2,40,41,42,21,22,9,14)` and names containing 'GST' or 'TCS'.

---

## 7. Debit Notes — frmdebitnote / frmDirectDebitNote

### 7.1 GRN-Linked Debit Notes

Standard debit notes (`frmdebitnote`) are linked to an existing bill:
- `Trs_Deb1.BrnId` → `Trs_Bills.ID`
- `Trs_Deb2.StockID` → `StockTable.StockID`
- GRN lines are pulled for the selected order, and rates/quantities adjusted

### 7.2 Direct Debit Notes

`frmDirectDebitNote` creates debit notes without a prior bill linkage. Used for standalone rate corrections or quality deductions.

### 7.3 Debit Query Logic (SP_DEBITQRY variants)

Three variants provide different aggregation levels:

| SP | Purpose | Grouping |
|----|---------|----------|
| `SP_DEBITQRY` | Department-level summary | DeptName, OrderSno |
| `SP_DEBITQRY_1` | Department + OutputType | DeptID, DeptName, OutputType, OrderSno |
| `SP_DEBITQRY_2` | Item-level detail | Per debit note, per stock item (Count, Color, Mill, Fabric, Acc) |

**Foreign currency handling**: Same as bills — `Amount * ExchangeRate` when `Fcy > 0`.

**Net amount from add/ded**: `Trs_DebAddDed` with `AdddedCode=2` provides net amount adjustments per debit note.

**Exclusion**: Department 16 and departments with `AccProsDept='N'` are excluded from standard debit queries.

### 7.4 Debit Note Reports

- `SP_Rpt_DebitNote`: Parameterized report using `Vue_Rpt_DebitNoteYarn` view
- `SP_Rpt_DebitNoteAcc`: Accessory-specific debit note report
- `SP_Rpt_DebitNoteFab`: Fabric-specific debit note report
- Report templates: `DebitAcc.mrt`, `DebitAccGST.mrt`, `DebitFab.mrt`, `DebitFabGST.mrt`, `DebitYarn.mrt`, `DebitYarnGST.mrt`, `DebitComm_GST.mrt`, `DirectDebitYarn.mrt`, `DirectDebitYarnGST.mrt`

---

## 8. Sales Invoice — frmSalINV

### 8.1 Invoice Creation Workflow (DC → Invoice)

1. User selects DCs (Delivery Challans via `Trs_Del1`) for a party
2. System creates `Trs_SalInv` header and links DCs via `Trs_Del1.InvId = Trs_SalInv.ID`
3. Invoice line items derived from `Trs_Del2` (DC line items)
4. GST rates determined from HSN codes based on material type (Y/F/A)
5. Additions/deductions stored in `Trs_SalInvAddded`

### 8.2 Invoice Type Prefixes

Invoice numbers are prefixed based on `Trs_SalInv.InvType`:

| InvType | Prefix Source |
|---------|--------------|
| 'Y' (Yarn) | `Mas_SalesGrp.Sales_Inv_Yarn_Prefix` |
| 'F' (Fabric) | `Mas_SalesGrp.Sales_Inv_Fabric_Prefix` |
| 'A' (Accessory) | `Mas_SalesGrp.Sales_Inv_Acc_Prefix` |

Format: `<Prefix>/<InvNo>` or just `<InvNo>` if no prefix configured.

### 8.3 GST Calculation — HSN-Based Rate Determination

The GST rate determination algorithm in `SP_Vue_SalesInvoice` and `SP_InvQry1`:

```
For each DC line item:
  1. Determine material type from StockTable.YF ('Y'=Yarn, 'F'=Fabric, 'A'=Accessory)
  2. Look up HSN record:
     - Yarn: Mas_HSN via Mas_Count.HSNID
     - Fabric: Mas_HSN via Mas_Fabric.HSNID
     - Accessory: First check Acc_PO_HSN_Detail (order-specific), then Mas_Acc.HSNID
  3. Check if DC-level GST override exists (Trs_Del4.CGSTper/SGSTper/IGSTper > 0)
     - If yes, use DC-level percentages
     - If no, use HSN master rates
  4. Determine inter/intra-state:
     - IF Exporter.StateId = Party.StateId → CGST + SGST (each = rate/2)
     - IF Exporter.StateId ≠ Party.StateId → IGST (= full rate)
  5. Compute amounts:
     - Base Amount = (Kg or Mtr, depending on RateUOM) × Rate
     - GSTAmount1 (CGST) = Amount × rate1 / 100
     - GSTAmount2 (SGST) = Amount × rate2 / 100
     - Amount3 (IGST) = Amount × rate3 / 100
     - Tot = Amount + GSTAmount1 + GSTAmount2 + Amount3
```

### 8.4 Vue_SalesInvoice — Composite View Construction

`SP_Vue_SalesInvoice` dynamically rebuilds the `Vue_SalesInvoice` view using `ALTER VIEW` within dynamic SQL. This pattern is used because the view is parameterized by invoice ID (passed as `@Id`).

The view joins:
- `Trs_SalInv` → `Trs_Del1` (via InvId) → `Trs_Del2` → `StockTable`
- HSN lookups (4 aliases for yarn/fabric/acc-order/acc-default)
- Exporter & Party state comparison for GST
- `Trs_Del4` for DC-level GST overrides
- `Pro_ReqKnitt2` for knitting program details
- Bank details for invoice footer
- Vehicle info for transport details

**Variants**: `SP_Vue_SalesInvoice_DC` (same logic, focused on DC-based data), `SP_Vue_SalesInvoice_Domestic` (domestic style), `SP_Vue_SalesInvoice1` (alternate layout), `SP_Vue_SalesInvoice_Pcs` (piece invoices via `Trs_JobWrkInv`).

### 8.5 Sales Invoice Additions/Deductions

`SP_Vue_OtherCharge` creates a view combining additions from:
- Piece invoices: `Trs_JWrkInvAddded` (grp=5)
- Sales invoices: `Trs_SalInvAddded` (grp=1)

---

## 9. Local Invoice — FrmLocalInvoice / FrmLocalInvConfirm

### 9.1 Local Invoice Workflow

Local invoices are for domestic (within-India) sales:
1. User creates invoice from DCs destined for local buyers
2. Invoice includes GST computation (intrastate CGST+SGST or interstate IGST)
3. E-way bill number (`EwayBillNo`) and date tracked on DC header

### 9.2 Invoice Confirmation

`FrmLocalInvConfirm` provides a review/confirmation step before final invoice submission. Ensures all GST details, amounts, and party information are correct.

### 9.3 Packing Lists

- `FrmLocalInvPackingList`: Standard packing list with roll/bag details
- `FrmLocalInvPackingList_Solid`: Variant for solid-color orders (simplified grouping)

---

## 10. Commercial Invoice — FrmCommericalInv_New / frmNewInv

### 10.1 Export Invoice Structure

Commercial invoices for export orders:
- No GST (exports are zero-rated under IGST Act)
- Includes commercial terms, FOB/CIF values
- Links to shipping bills (`ShippingBill` / `ShippingBill_Det`)
- Currency conversion for foreign-currency orders

### 10.2 Delivery-Cumulative Invoice (frmDelCumInv)

`frmDelCumInv` generates cumulative invoices spanning multiple DCs/deliveries for a single buyer order. Report template: `FabSalesDCCumInv.mrt`.

---

## 11. Piece Invoice — frmPieceInv / frmPieceInv_1

### 11.1 Piece-Wise Invoice Creation

Piece invoices bill for job work completed (piece delivery challan → invoice):
1. Select piece receipt entries (from `Trs_PcsGrn1/2`) for an order
2. Rates from `Pro_Prod_PartwiseRate.JobWrkRate` or `Bud_InhRateclw.JobWrkRate`
3. Invoice created in `Trs_JobWrkInv` + `TempPcsDCDetInv`

### 11.2 Job Work Invoice (Trs_JobWrkInv)

The piece invoice uses a staging model:
- `TempPcsDCDetInv` aggregates piece data (grouped by InvId, WorkDet, JRate, StyleNo, OrdId)
- `SP_Vue_SalesInvoice_Pcs` builds the view joining staging to master data
- HSN for pieces from `TempPcsDCDetInv.HsnId → Mas_HSN`

### 11.3 TempPcsDCDetInv Staging Table

| Column | Purpose |
|--------|---------|
| InvId | FK→Trs_JobWrkInv.ID |
| WorkDet | Work completion details |
| TotPcs | Total pieces |
| JRate | Job rate |
| Amount | TotPcs × JRate |
| OrdId | Order reference |
| StyleNo | Style number |
| ColId / ColorDesc | Color details |
| SizeDesc | Size description |
| VName | Vehicle name |
| HsnId | HSN code reference |
| HSN_Percent | GST percentage |
| NetRate | Net rate after adjustments |
| no_of_box / pcs_per_box | Packing details |

### 11.4 HSN-Based GST for Piece Invoices

Piece invoices use a simplified GST model:
```
IF Exporter.StateId = Party.StateId:
    CGST = Amount × (HSN_Percent / 2) / 100
    SGST = Amount × (HSN_Percent / 2) / 100
ELSE:
    IGST = Amount × HSN_Percent / 100
```

---

## 12. Production Bill — FrmProdBillNew

### 12.1 In-House Production Worker Billing

For billing in-house employees (not external suppliers) for piece-rate work:
- Header in `Trs_ProdBillMasNew` (employee, dates, bill number)
- Details in `Trs_ProdBillDetNew` (order, stage, color, rate, qty)
- Appears in `SP_BillsRegView_prd` as `Type='Production'`

### 12.2 ProdPcs vs BilledPcs Tracking

`Trs_ProdBillEntry` tracks cumulative production vs billing:
- `ProdPcs`: total pieces produced by employee at stage
- `BilledPcs`: total pieces already billed
- Pending = `ProdPcs - BilledPcs`

### 12.3 Production Bill Additions (Tax Handling)

Tax on production bills stored in `Trs_prodBillAddded1`:
- Codes 40, 41, 42 = CGST, SGST, IGST
- Net amount in register: `(qty × rate) × (taxper/100) + (qty × rate)`

---

## 13. Bill-to-Be Value Calculation — SP_BilltoBeValue*

The bill-to-be value represents the **total pending billing amount** for an order — material received (GRN) but not yet invoiced (`InvId IS NULL OR InvId = 0`).

### 13.1 Yarn Bill-to-Be (YF='Y')

```
BillValue = SUM( (RecKgs - ReturnKg) × CASE WHEN PO_Rate > 0 THEN PO_Rate ELSE Program_Rate END )
```

- Source: `Trs_Grn2` (GRN line items) WHERE `StockTable.YF='Y'`
- Rate priority: PO rate (`Trs_Po2.Rate`) > Program rate (`Pro_ReqYarn2.Rate`)
- Excludes: `GrnType IN ('Process Return', 'Sales Return')`
- Returns (from `Trs_Del2` via matching `OurPoId/OurGrnId`) deducted from `RecKgs`

### 13.2 Fabric Bill-to-Be (YF='F')

```
BillValue = CASE WHEN UOM = 'KGS' THEN
    SUM( (RecKgs - ReturnKg) × ProgramRate )
  ELSE
    SUM( (RecMtr - ReturnMtr) × ProgramRate )
  END
```

- Source: `Trs_Grn2` + `Pro_ReqKnitt2` (knitting program) matched on all fabric parameters (FabID, ColID, CntID, GSM, GG, LL, DiaId, FinDiaId, FinGSM)
- UOM-sensitive: KGS vs MTR from `Mas_Uom` via `Pro_ReqKnitt2.RateUOM`
- Multi-process GRN: `Trs_MultiPrs_Grn1/2/3` for intermediate process GRNs
- Print department (Dept=10): additionally matches `PRINT_DESIGNID`
- Reprocess handling: External GRN IDs checked against `Trs_Del1.ReprocessType`

### 13.3 Accessories Bill-to-Be (YF='A')

```
BillValue = SUM( (RecKgs - ReturnKg) × CASE WHEN PO_Rate > 0 THEN PO_Rate ELSE BudgetRate END )
```

- Source: `Trs_Grn2` WHERE `StockTable.YF='A'`
- Rate priority: PO rate (`Trs_Po5.Rate`) > Budget rate (`Pro_AccBudRate.BudRate`)
- Matched on: AType, ADes, Siz, ColId, PrsID
- Excludes: `GrnType IN ('Acc.Proc.Return', 'Acc.Iss.Ret', 'AccRetToUnit', 'Acc.Direct')`

### 13.4 Piece/Panel Bill-to-Be (Job Work)

Two sources:

**a) External job work (piece receipts)**:
```
BillValue = SUM(RecPcs × JobWrkRate)
```
- From `Trs_PcsGrn1/2/3` + `Pro_Prod_PartwiseRate` or `Bud_InhRateclw`
- Receipt types: 'Piece', 'Panel', 'Bit'

**b) In-house production (employee piece-rate)**:
```
BillValue = SUM( (ProdPcs - BilledPcs) × Rate )
```
- From `Trs_ProdBillEntry` WHERE `Shift_Pcs='P'`
- Rate priority: `Pro_Prod_PartwiseRate.Rate` > `Bud_InhRateclw.Rate_Pcs`

### 13.5 Hot Process / Unplanned Process

Departments with `Mas_Dept.Un_Planned_Process='Y'` are billed separately:
```
BillValue = SUM(RecKgs × Trs_HotProcessRate.ProcessRate)
```
Split by `Fab_Pcs_Dept` flag: 'F' → fabric bill-to-be, 'P' → piece bill-to-be.

### 13.6 Detail Breakup (SP_BilltoBeValue_Detail)

`SP_BilltoBeValue_Detail` returns the same calculations as `SP_BilltoBeValue` but grouped by `DeptName` for department-wise pending billing visibility. Uses `Mas_Dept.DeptName` and `Mas_JobWrkComp.WorkComplDet` for department labels.

### 13.7 Approximate Calculation (SP_BilltoBeValue_Approx)

`SP_BilltoBeValue_Approx` provides a quick estimate without some of the complex multi-process join logic. Used for dashboards and quick reporting where exact precision is not required.

---

## 14. Party Balance & Outstanding — FrmPartyBalanceRegister / FrmPartyBlnc

### 14.1 Accessories Party Balance (Sp_Acc_PartyBalance)

Maintains `ST_Acc_PartyBal_Abs` table with transaction-driven updates:

| TransType | Action |
|-----------|--------|
| `PO` | Updates `PO_DC_Qty` (purchase order) |
| `GRN` | Updates `GrnQty` (goods received) |
| `DC` | Updates `PO_DC_Qty` (delivery challan — inward) |

Each transaction uses `@transFlg` (+/-) for increment/decrement. Upsert pattern: IF EXISTS → UPDATE, ELSE → INSERT.

### 14.2 Accessories Program Balance (Sp_AccTransaction)

Maintains `ST_Acc_Prog_Balance` with a comprehensive set of transaction types:

| TransType | Column Updated | Description |
|-----------|---------------|-------------|
| `NEW` | ReqQty | New program requirement |
| `PO` | POQty | Purchase order placed |
| `GRN` | RECQty | Material received |
| `RET` | RETQty | Material returned |
| `DC` | RECQty | DC receipt (inward) |
| `PRSDC` | DELQty | Process DC (outward) |
| `ISSRET` | ProRetQty | Issue return from production |
| `TRANOUT` | TranOutQty | Inter-unit transfer out |

### 14.3 Fabric/Yarn Party Balance (ST_PartyBalance_Abs)

Similar to accessories but for fabric/yarn. Tracks DC-vs-GRN balance per order/department/party. Updated through application-level logic during PO, DC, and GRN transactions.

### 14.4 Replication Triggers (UpdateFlg Pattern)

All three balance tables use the same trigger pattern for multi-server synchronization:
- `Trg_ST_Acc_Prog_Balance_Update` / `Trg_ST_Acc_Prog_Balance_Update_Actual`
- `Trg_ST_Acc_PartyBal_Abs_Update`
- `Trg_ST_PartyBalance_Abs_Update`

Pattern:
```sql
IF NOT (UPDATE(server_id) OR UPDATE(UpdateFlg))
BEGIN
    UPDATE <table> SET UpdateFlg = 1 WHERE <PK conditions>
END
```

This ensures that any non-replication update marks the row for sync to other servers. Replication updates (which set `server_id` or `UpdateFlg` directly) do not re-trigger the flag.

---

## 15. Payment Registers — FrmPaymentReg / FrmPaymentReg_Wages

- **FrmPaymentReg**: Supplier payment register — tracks payments made against registered bills. Filters by company, date range, supplier, department.
- **FrmPaymentReg_Wages**: Wage payment register — tracks payments for production/piece-rate workers. Links to `Trs_ProdBillMasNew` and employee master.

Both registers provide summary and detail views for financial period reconciliation.

---

## 16. Expenses — FrmExpenses / FrmFixedExpensesEntry / FrmStylewiseExpensesEntry

### 16.1 Expense Group Master (FrmExpenseGroup / FrmMasExpenses)

- `FrmExpenseGroup`: Define expense categories (e.g., Power, Rent, Depreciation, Overhead)
- `FrmMasExpenses`: Individual expense items within groups

### 16.2 Fixed Expense Entry (FrmFixedExpensesEntry)

Monthly fixed expenses allocated across units/departments:
- Rent, electricity, depreciation, insurance, etc.
- Feeds into daily unit P&L calculation (`Sp_DailyUnitPANDL`)

### 16.3 Style-Wise Expense Entry (FrmStylewiseExpensesEntry)

Expenses allocated to specific styles/orders:
- Commercial charges, embellishment costs
- Used in costing module for budget-vs-actual comparison

### 16.4 Expense Register (FrmExpenseEntryRegister)

Report view of all expense entries with filtering by date range, company, expense group.

---

## 17. GST Configuration & HSN — FrmHSN / FrmHSNPce / FrmTally_GSTSetup

### 17.1 HSN Master (Mas_HSN)

Each HSN entry defines:
- **HSNCode**: The actual HSN/SAC code (e.g., '5205', '6109')
- **UnitRate**: Threshold price for branded/non-branded rate differentiation
- **Rate bands**: BPercL, BPercH, NBPercL, NBPercH — four possible GST rates

### 17.2 HSN Piece Master (FrmHSNPce)

Separate HSN management for piece goods. Links to `TempPcsDCDetInv.HsnId` and `Mas_HSN`.

### 17.3 GST Rate Determination Algorithm

The full GST rate determination (from `SP_SalesInv`, `SP_InvQry1`, `SP_Vue_SalesInvoice`):

```
Input: StockItem (YF, Rate), Exporter, Party, HSN record

Step 1 — Check DC-level override (Trs_Del4):
  IF Trs_Del4.CGSTper > 0 → use Trs_Del4 rates directly

Step 2 — Determine HSN record:
  IF YF='Y' → HSN from Mas_Count.HSNID
  IF YF='F' → HSN from Mas_Fabric.HSNID
  IF YF='A' → First Acc_PO_HSN_Detail.HSNID (order-specific), else Mas_Acc.HSNID

Step 3 — Determine GST percentage:
  IF BrandedFlag = 'N' (non-branded):
    IF Rate < HSN.UnitRate → GST% = NBPercL
    ELSE → GST% = NBPercH
  ELSE (branded):
    IF Rate >= HSN.UnitRate → GST% = BPercH
    ELSE → GST% = BPercL

Step 4 — Apply inter/intra state split:
  IF Exporter.StateId = Party.StateId:
    CGST% = GST% / 2
    SGST% = GST% / 2
    IGST% = 0
  ELSE:
    CGST% = 0
    SGST% = 0
    IGST% = GST%

Step 5 — Compute amounts:
  BaseAmount = Qty × Rate (KGS or MTR based on RateUOM)
  CGSTAmt = BaseAmount × CGST% / 100
  SGSTAmt = BaseAmount × SGST% / 100
  IGSTAmt = BaseAmount × IGST% / 100
  Total = BaseAmount + CGSTAmt + SGSTAmt + IGSTAmt
```

### 17.4 Input GST View (Vue_InputGST)

`Vue_InputGST` consolidates all input GST from supplier bills for ITC (Input Tax Credit) reconciliation:

- Combines SGST, CGST, IGST from `Trs_BillAddded` (by `Mas_AddDed.AddDedName`)
- Only GST-applicable bills (`GSTBill='Y'`)
- Includes "Others" (non-GST add/ded codes not in 1,2,40,41,42)
- Output columns: `SGSTValue/Amt`, `CGSTValue/Amt`, `IGSTValue/Amt`, `Others`
- Used for GST return filing reconciliation

### 17.5 Tally GST Setup (FrmTally_GSTSetup)

Configures mappings for exporting GST data to Tally accounting software:
- Maps FiberPro GST categories to Tally ledger names
- Supports SGST/CGST/IGST/TCS ledger configuration
- Enables automated data export for accounting compliance

---

## 18. Non-Billable / Awaiting Bill — FrmNonBillable / Frm_AppAwBill

- **FrmNonBillable**: Tracks GRN items that are not billable (samples, rejections, free-of-cost supplies). Prevents these from appearing in bill-to-be calculations.
- **Frm_AppAwBill**: Approval workflow for awaiting bills. Lists bills pending approval with filtering by company, date range, party.

---

## 19. Supplier Bill Register — FrmSupplierBillReg

`FrmSupplierBillReg` provides a comprehensive register of all supplier bills with:
- Bill number/date, supplier details, order references
- Gross amount, GST breakup, net amount
- Pass/approval status
- Date range and department filtering

---

## 20. Accessory Item Approval — FrmAccItemApproval

`FrmAccItemApproval` provides an approval workflow for accessory item rates before billing:
- Lists pending rate confirmations
- Links to PO rates and budget rates
- Approval updates `Pro_AccBudRate` confirming the rate to use in billing

---

## 21. P&L Register — FrmPLReg

`FrmPLReg` generates profit & loss reports:
- Revenue side: Sales invoices (fabric, yarn, accessories, pieces)
- Cost side: Supplier bills, debit notes, production bills
- Expense data from fixed/style-wise expense entries
- Links to `Sp_DomesticPL` stored procedure for domestic P&L calculation

---

## 22. Accessory Stock Register — FrmAccStockReg

`FrmAccStockReg` provides a register view of accessory stock movements with billing value context:
- Links to `SP_Rpt_AccStockItemLedger` for detailed ledger
- Shows stock value at budget rate vs actual bill rate
- Filters by order, department, accessory type

---

## 23. Report Templates Catalog

### Debit Notes
| Template | Type | Description |
|----------|------|-------------|
| `DebitAcc.mrt` | Stimulsoft | Accessory debit note |
| `DebitAccGST.mrt` | Stimulsoft | Accessory debit note with GST |
| `DebitFab.mrt` | Stimulsoft | Fabric debit note |
| `DebitFabGST.mrt` | Stimulsoft | Fabric debit note with GST |
| `DebitYarn.mrt` | Stimulsoft | Yarn debit note |
| `DebitYarnGST.mrt` | Stimulsoft | Yarn debit note with GST |
| `DebitComm_GST.mrt` | Stimulsoft | Commercial debit note with GST |
| `DirectDebitYarn.mrt` | Stimulsoft | Direct debit note (yarn) |
| `DirectDebitYarnGST.mrt` | Stimulsoft | Direct debit note (yarn) with GST |

### Accessory DC/GRN (Billing Context)
| Template | Type | Description |
|----------|------|-------------|
| `AccDC.mrt` | Stimulsoft | Accessory delivery challan |
| `AccDC_GoDown.mrt` | Stimulsoft | Accessory DC godown variant |
| `AccDC_SGST.mrt` | Stimulsoft | Accessory DC with SGST |
| `AccDC_SGST_Cost.mrt` | Stimulsoft | Accessory DC with SGST + cost |
| `AccGRN.mrt` | Stimulsoft | Accessory GRN |
| `AccGRNPO.mrt` | Stimulsoft | Accessory GRN against PO |
| `AccOpening.mrt` | Stimulsoft | Accessory opening stock |
| `AccStockAdj.mrt` | Stimulsoft | Accessory stock adjustment |
| `AccDirectGRN.mrt` | Stimulsoft | Accessory direct GRN |

### Fabric Sales DC
| Template | Type | Description |
|----------|------|-------------|
| `FabSalesDC_SGST.mrt` | Stimulsoft | Fabric sales DC with SGST |
| `FabSalesDC.mrt` | Stimulsoft | Fabric sales DC |
| `FabSalesDCCumInv.mrt` | Stimulsoft | Fabric sales DC cumulative invoice |

### Crystal Reports (Legacy)
| Template | Type | Description |
|----------|------|-------------|
| `Rpt_AccAck.rpt` | Crystal | Accessory acknowledgement |
| `Rpt_AccDel1.rpt` | Crystal | Accessory delivery |
| `Rpt_AccOrderwiseReqRegister.rpt` | Crystal | Accessory order-wise requirement register |

### Report Code-Behind
| File | Purpose |
|------|---------|
| `AccDC.cs` | Accessory DC report code-behind (Stimulsoft) |
| `AccGRN.cs` | Accessory GRN report code-behind |
| `FabDC.cs` | Fabric DC report code-behind |
| `GenDC.cs` | General DC report code-behind |
| `GenGRN.cs` | General GRN report code-behind |
| `FabGRN.cs` | Fabric GRN report code-behind |

---

## 24. Stored Procedures Summary Table

| SP Name | Parameters | Purpose |
|---------|-----------|---------|
| `SP_BillRegQry` | @Ordid, @DeptId, @Coycode, @DeptName, @tmpdeptID | Fetch parties with bills for an order/dept |
| `SP_BillsRegView_Yarn` | @coycode, @Deptid, @FromDt, @ToDate | Yarn bill register |
| `SP_BillsRegView_fab1`–`fab5` | @coycode, @Deptid, @FromDt, @ToDate | Fabric bill register (5 variants) |
| `SP_BillsRegView_acc` | @coycode, @Deptid, @FromDt, @ToDate | Accessories bill register |
| `SP_BillsRegView_prd`–`prd2` | @coycode, @Deptid, @FromDt, @ToDate | Production bill register |
| `SP_BillsRegView_cm` | @coycode, @Deptid, @FromDt, @ToDate | CM bill register |
| `SP_SalesInv` | @Id | Fetch DC data for sales invoice creation |
| `SP_InvQry1` | @Id | Fetch DC data for invoice with buyer state check |
| `SP_Vue_SalesInvoice` | @Id | Build sales invoice view (yarn/fabric/acc) |
| `SP_Vue_SalesInvoice_DC` | @Id | Sales invoice view (DC-based variant) |
| `SP_Vue_SalesInvoice_Pcs` | @Id | Piece/job work invoice view |
| `SP_Vue_SalesInvoice_Domestic` | @Id | Domestic sales invoice view |
| `SP_Vue_SalesInvoice1` | @Id | Alternate sales invoice view |
| `SP_Vue_OtherCharge` | (none) | Build other-charges view |
| `SP_Vue_OtherCharge_1` | (none) | Alternate other-charges view |
| `SP_BilltoBeValue` | @Ordid | Total bill-to-be value for an order |
| `SP_BilltoBeValue_Detail` | @Ordid | Department-wise bill-to-be breakup |
| `SP_BilltoBeValue_Approx` | @Ordid | Approximate bill-to-be (quick estimate) |
| `SP_DEBITQRY` | @Ordid | Debit note summary by department |
| `SP_DEBITQRY_1` | @Ordid | Debit note by dept + output type |
| `SP_DEBITQRY_2` | @Ordid, @DeptId | Debit note item-level detail |
| `Sp_AccTransaction` | @Ordid, @styleno, @Atype, @Ades, @AClr, @Asize, @TransType, @transFlg, @Qty | Update accessories program balance |
| `Sp_Acc_PartyBalance` | @Ordid, @styleno, @TransType, @transFlg, @Qty, @deptid, @PartyID, @TransNo, @TransDate, @ItemDesc, @UOM, @Acc_ID | Update accessories party balance |
| `Spl_Bills_InvPcs` | @ordid | Bill/invoice detail query (with debit notes) |
| `Spl_Bills_InvPcs_Supplier` | @ordid | Bill/invoice detail for supplier variant |
| `SP_Rpt_DebitNote` | @Coycode, @FromDate, @ToDate, @OrdId, @DeptId, @PId, @Finyear | Debit note report |
| `SP_Rpt_DebitNoteAcc` | (similar) | Accessory debit note report |
| `SP_Rpt_DebitNoteFab` | (similar) | Fabric debit note report |
| `SP_Rpt_accdelaccret` | (various) | Accessory delivery/return report |
| `Sp_DomesticPL` | @ORDID | Domestic P&L calculation |

---

## 25. Key Business Rules & Constraints

1. **Bill-to-be exclusion**: GRN items with `InvId > 0` are excluded from bill-to-be calculations (already invoiced)
2. **GST state-based split**: CGST+SGST for intrastate, IGST for interstate — determined by `Mas_Exporter.StateId` vs `Mas_Party.StateId`
3. **Rate priority cascade**: PO rate > Budget/Program rate for bill-to-be calculations
4. **BrandedFlag logic**: Items marked `BrandedFlag='Y'` use BPercL/BPercH thresholds; 'N' uses NBPercL/NBPercH
5. **Multi-currency conversion**: Foreign bills multiply amounts by `Trs_Po1.ExchangeRate`
6. **Bill pass workflow**: Bills require `PassFlg='Y'` (approval) before payment processing
7. **TCS apportionment**: When a bill covers multiple orders, TCS is divided by order count
8. **Dept 16 exclusion**: Department 16 and departments with `AccProsDept='N'` are excluded from standard debit queries
9. **Replication safety**: Balance table triggers use `UpdateFlg` pattern to prevent infinite trigger loops during multi-server replication
10. **Process Return exclusion**: GRN types 'Process Return' and 'Sales Return' are excluded from bill-to-be calculations

---

## 26. Cross-Module Integration Points

| Integration | Source Module | This Module | Mechanism |
|------------|--------------|-------------|-----------|
| GRN → Bill | Procurement (03) | Billing | `Trs_BillRate.PoId` → `Trs_Po1.Id`; GRN marked with `InvId` |
| DC → Invoice | Dispatch (07) | Invoicing | `Trs_Del1.InvId` → `Trs_SalInv.ID` |
| DC → GST | Dispatch (07) | GST | `Trs_Del4` stores per-DC GST rates |
| Piece Receipt → Bill | Cutting/Pieces (05) | Billing | `Trs_PcsGrn1.InvId` → piece invoice |
| Program → Bill-to-Be | Order Mgmt (02) | Billing | `Pro_ReqYarn2`, `Pro_ReqKnitt2`, `Pro_AccBudRate` provide rates |
| Production → Bill | Production (06) | Billing | `Trs_ProdBillEntry` tracks produced vs billed pieces |
| Budget → Rates | Costing (09) | Billing | `Bud_InhRateclw`, `Pro_Prod_PartwiseRate` provide fallback rates |
| Expense → P&L | This Module | Costing (09) | Fixed/style-wise expenses feed `Sp_DailyUnitPANDL` |
| Stock → Balance | Inventory (04) | Party Balance | `StockTable` links to program balance tables |
| HSN → Tax | Masters (01) | GST | `Mas_HSN`, `Mas_Fabric.HSNID`, `Mas_Count.HSNID` |
| Tally Export | This Module | External | `FrmTally_GSTSetup` maps GST to Tally ledgers |

---

## 27. MERN Migration Notes

### API Endpoints Required

| Endpoint Group | Key Routes |
|---------------|------------|
| `/api/bills` | POST (create), PATCH (pass/approve), GET (register, detail) |
| `/api/bills/:id/additions` | CRUD for additions/deductions |
| `/api/debit-notes` | POST (create), GET (by order, by dept) |
| `/api/invoices/sales` | POST (from DCs), GET (detail, register) |
| `/api/invoices/piece` | POST (from piece receipts), GET (detail) |
| `/api/invoices/local` | POST, PATCH (confirm), GET |
| `/api/invoices/commercial` | POST (export), GET |
| `/api/production-bills` | POST, PATCH (pass), GET |
| `/api/party-balance` | GET (by order/dept/party), GET /accessories, GET /fabric-yarn |
| `/api/bill-to-be` | GET /:orderId (summary), GET /:orderId/detail |
| `/api/expenses` | CRUD for entries, groups, masters |
| `/api/payments/register` | GET (supplier payments), GET /wages |
| `/api/gst/hsn` | CRUD for HSN masters |
| `/api/gst/input-gst` | GET (ITC reconciliation) |
| `/api/gst/tally-setup` | CRUD for Tally mapping |

### MongoDB Collection Design Recommendations

1. **bills**: Embed `billRate[]` and `additions[]` in single document (typically < 50 line items)
2. **debitNotes**: Embed line items; reference `billId` for linkage
3. **salesInvoices**: Embed line items; reference `dcIds[]` for DC linkage
4. **pieceInvoices**: Embed staging detail (from TempPcsDCDetInv)
5. **partyBalance**: Separate collections for `accProgBalance`, `accPartyBalance`, `partyBalance` — these are hot-update tables needing atomic operations
6. **expenses**: One collection with `type` discriminator (fixed/style-wise)
7. **hsnMaster**: Simple reference collection

### Key Migration Challenges

1. **Dynamic view pattern**: `SP_Vue_SalesInvoice` uses `ALTER VIEW` with dynamic SQL — replace with parameterized MongoDB aggregation pipelines
2. **GST calculation complexity**: The multi-level HSN→BrandedFlag→Rate threshold→State comparison must be replicated as middleware or computed fields
3. **Bill-to-be is query-heavy**: Multiple UNION ALL across 5+ material types — consider pre-computing as materialized view / background job in MongoDB
4. **UpdateFlg replication**: Replace SQL Server trigger-based replication with application-level event sourcing or Change Streams
5. **Trs_BillAddded code-based logic**: Heavy reliance on `AddDedCode` magic numbers (40,41,42 = GST) — normalize to enum in new schema
