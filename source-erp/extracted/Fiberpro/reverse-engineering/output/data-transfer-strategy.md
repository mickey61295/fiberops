# FiberPro ERP — Data Storage Architecture & Data Transfer Strategy

> **Task**: 15 of 16 — Data Storage Architecture & Data Transfer Strategy  
> **Generated**: 2026-03-15  
> **Source**: Fiberpro.exe.config, database-schema.md, formulas-and-calculations.md, stored-procedures-analysis.md, triggers-and-views-analysis.md, module-functionalities/* (10 module docs)  
> **Target Stack**: MERN (MongoDB, Express, React, Node.js)

---

## Table of Contents

1. [Multi-Database Architecture](#1-multi-database-architecture)
2. [Complete Table Inventory](#2-complete-table-inventory)
3. [SQL Server → MongoDB Collection Mapping](#3-sql-server--mongodb-collection-mapping)
4. [Data Transformation Rules](#4-data-transformation-rules)
5. [Multi-Company & Multi-Fiscal-Year Partitioning](#5-multi-company--multi-fiscal-year-partitioning)
6. [ETL Pipeline Specification](#6-etl-pipeline-specification)
7. [Data Validation Checklist](#7-data-validation-checklist)
8. [Foreign Key Constraints — Application-Level Enforcement](#8-foreign-key-constraints--application-level-enforcement)
9. [Estimated Data Volumes & Migration Approach](#9-estimated-data-volumes--migration-approach)
10. [Appendix A — Transaction Type Code Mapping](#appendix-a--transaction-type-code-mapping)
11. [Appendix B — Trigger-Maintained Fields to Precompute](#appendix-b--trigger-maintained-fields-to-precompute)

---

## 1. Multi-Database Architecture

### 1.1 Database Inventory

FiberPro uses **three SQL Server databases** per deployment, configured in `Fiberpro.exe.config`:

| # | Config Key | Example Catalog | Server | Purpose |
|---|------------|-----------------|--------|---------|
| 1 | `connectstring` | `Fiberpro_baalaji` | ACCOUNTS | **Main ERP database** — all master data, all transactions, stock, orders, billing, costing, reporting |
| 2 | `connectstring1` | `GsMail` | Machine-14 | **Email/Notification database** — workflow emails, mail templates, notification queues, mail display lists |
| 3 | `ProductionDB` | `testAslam` | (same or separate) | **Production database** — production-specific data; may share schema with main DB or hold production-only tables |

Additional connection strings in `<connectionStrings>` section:

| Name | Catalog | Usage |
|------|---------|-------|
| `JOMSConnectionString1` | `prachi` | Development/alternate DB (named after JOMS product name) |
| `JOMSConnectionString2` | `prachi` (Integrated Security) | Windows-auth variant |
| `JOMSConnectionString3` | `JOMS` (Integrated Security) | Original product DB name |
| `JomsConnectionString` | `prachi` | Default connection |

**`RepDB`** setting (`Fiberpro_baalaji`) — used by report engine to execute report queries against a specific database, allowing report generation against a read replica or same main DB.

**`Cust_Code`** (`298`) — customer license code that also maps to pre-print template folder (`PrePrint/298/`).

### 1.2 Database Switching Logic

The application uses **runtime connection string manipulation**:

1. **Company selection at login** — user selects a company/unit from `Mas_Exporter`. The `Coycode` (= `ExpID`) filters all subsequent queries.
2. **Fiscal year selection** — user picks from `FinanceYear` table. The `Finyear` column (e.g., `"24-25"`) filters transactions.
3. **Cross-database queries** — production data and email data are accessed via separate `SqlConnection` objects using `connectstring1` and `ProductionDB`.
4. **Report database** — `RepDB` setting allows reports to target a specific database (typically same as main DB, but can be a read replica).
5. **Multi-server sync** — `UpdateFlg` / `server_id` columns on most tables + 40 triggers support cross-server replication. When data changes on one server, `UpdateFlg` is set to `1`, and an external sync process replicates changes to the other server.

### 1.3 Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    FiberPro Desktop Client                       │
│                    (Fiberpro.exe / .NET WinForms)                │
├─────────────────────────────────────────────────────────────────┤
│  connectstring                connectstring1     ProductionDB   │
│  ┌─────────────┐              ┌──────────┐      ┌────────────┐ │
│  │ Main ERP DB │              │ GsMail   │      │ Production │ │
│  │ (Fiberpro_  │              │ Database │      │ Database   │ │
│  │  baalaji)   │              │          │      │ (testAslam)│ │
│  │             │              │ • WF_*   │      │            │ │
│  │ • Mas_*     │              │ • wf_*   │      │ • Prod-    │ │
│  │ • Trs_*     │              │ • App_*  │      │   specific │ │
│  │ • Order*    │              │ • mail   │      │   tables   │ │
│  │ • Stock*    │              │   tables │      │            │ │
│  │ • Pro_*     │              └──────────┘      └────────────┘ │
│  │ • ST_*      │                                                │
│  │ • Bud_*     │              RepDB = "Fiberpro_baalaji"       │
│  │ • Options   │              (report read path)                │
│  └─────────────┘                                                │
└─────────────────────────────────────────────────────────────────┘
```

### 1.4 MongoDB Target Architecture

In the MERN application, all three databases collapse into a **single MongoDB instance** with logical separation:

| SQL Server Source | MongoDB Target | Notes |
|-------------------|---------------|-------|
| Main ERP DB | `fiberpro` database | All collections live here |
| GsMail DB | `fiberpro.notifications` collection + workflow collections | Embedded in main DB |
| Production DB | Part of `fiberpro` database | Production collections alongside others |

Multi-company isolation will use **`companyId` field** on every document rather than separate databases.
Multi-fiscal-year isolation will use **`fiscalYear` field** on transaction documents.

---

## 2. Complete Table Inventory

### 2.1 Master Tables (Mas_*) — ~53 Tables

These are reference/lookup tables. Low volume, rarely change, read-heavy.

| # | Table | PK | Key Columns | Est. Rows | MongoDB Strategy |
|---|-------|----|-------------|-----------|-----------------|
| 1 | Mas_Buyer | BuyerID | BuyerName, Stateid, UpdateFlg, server_id | 50–500 | `buyers` collection |
| 2 | Mas_Party | PID | Pname, Paddress, Phone, TIN, CST, GSTNo, PAN, Stateid | 200–2,000 | `parties` collection |
| 3 | Mas_Exporter | ExpID | ExporterName, Address, Phone, TIN, CST, PAN, GSTNo, Stateid | 2–20 | `companies` collection |
| 4 | Mas_Fabric | FabID | Fabdesc, PriUomID, BrandedFlag, HSNID | 20–200 | Embed in `masterData.fabrics` |
| 5 | Mas_Color | ColID | ColorDesc | 50–500 | Embed in `masterData.colors` |
| 6 | Mas_Count | CountID | CountName, CountGrpid | 20–100 | Embed in `masterData.counts` |
| 7 | Mas_Dept | DeptID | Deptname, OutputType, InputType, DCFormat, RecMethod, Grp, SemiFinish, DeptType, DeptGrpCode, AccProsDept, OrderSno | 10–50 | `departments` collection |
| 8 | Mas_Dia | DiaID | Dia | 10–50 | Embed in `masterData.diameters` |
| 9 | Mas_Size | SizeID | SizeDesc | 10–30 | Embed in `masterData.sizes` |
| 10 | Mas_Acc | ID | Acc_Descr, catID, UomId | 50–300 | `accessoryTypes` collection |
| 11 | Mas_AccDes | ID | AccTypeID, AccDescription | 100–1,000 | Embed in parent `accessoryTypes` |
| 12 | Mas_AccCategory | CatID | — | 5–20 | Embed in `masterData.accCategories` |
| 13 | Mas_Emp | ID | EmpName | 50–500 | `employees` collection |
| 14 | Mas_Godown | GodID | GodName | 5–30 | Embed in `masterData.godowns` |
| 15 | Mas_JobWrkComp | Id | DeptId, WorkComplDet, PcsType | 20–100 | `productionStages` collection |
| 16 | Mas_Part | PartID | PartName | 5–20 | Embed in `masterData.parts` |
| 17 | Mas_Mill | MillID | ShortMill, Mill | 10–100 | Embed in `masterData.mills` |
| 18 | Mas_HSN | ID | HSNCode, UnitRate, BPercL, NBPercL, BPercH, NBPercH | 20–200 | `hsnCodes` collection |
| 19 | Mas_HSNPce | ID | (Same as Mas_HSN for piece goods) | 10–100 | Merge into `hsnCodes` with `type: 'piece'` |
| 20 | Mas_AddDed | AddDedCode | AddDedName | 10–30 | Embed in `masterData.addDedCodes` |
| 21 | Mas_Bank | ID | — | 5–20 | Embed in `masterData.banks` |
| 22 | Mas_Bitsize | ID | — | 5–20 | Embed in `masterData.bitSizes` |
| 23 | Mas_Brand | ID | — | 5–20 | Embed in `masterData.brands` |
| 24 | Mas_BuyerDept | ID | — | 10–50 | Embed in parent `buyers` |
| 25 | Mas_Commercial | ID | — | 5–20 | Embed in `masterData.commercial` |
| 26 | Mas_Component | CompID | CompDescr | 10–50 | Embed in `masterData.components` |
| 27 | Mas_Design | DesignId | DesignDesc | 20–200 | Embed in `masterData.designs` |
| 28 | Mas_Expenses | ExpId | Exp_Level, ShiftWageExp | 10–50 | `expenseCategories` collection |
| 29 | Mas_FabricGroup | ID | — | 5–20 | Embed in `masterData.fabricGroups` |
| 30 | Mas_Fcy | ID | Denominator | 3–10 | Embed in `masterData.currencies` |
| 31 | Mas_Grp | GrpNo | DcPre | 5–20 | Embed in `masterData.deptGroups` |
| 32 | Mas_LabTestParameters | ID | — | 10–50 | Embed in `masterData.labTestParams` |
| 33 | Mas_LabTestStages | ID | — | 5–20 | Embed in `masterData.labTestStages` |
| 34 | Mas_Lot | LotId | LotName | 50–500 | `lots` collection |
| 35 | Mas_Merchandiser | ID | — | 5–50 | Embed in `masterData.merchandisers` |
| 36 | Mas_Panel | PanelID | PanelName | 5–30 | Embed in `masterData.panels` |
| 37 | Mas_RejectionType | ID | — | 5–20 | Embed in `masterData.rejectionTypes` |
| 38 | Mas_SalesGrp | ID | — | 5–10 | Embed in `masterData.salesGroups` |
| 39 | Mas_Season | SeasID | SeasDesc | 5–20 | Embed in `masterData.seasons` |
| 40 | Mas_SizeGroup | ID | — | 5–10 | Embed in `masterData.sizeGroups` |
| 41 | Mas_State | ID | — | 30–40 | Embed in `masterData.states` |
| 42 | Mas_StockReportGroup | ID | — | 5–10 | Embed in `masterData.stockReportGroups` |
| 43 | Mas_StyleDesc | StyleID | StyleDesc | 50–500 | Embed in `masterData.styles` |
| 44 | Mas_StyleGroup | ID | — | 5–20 | Embed in `masterData.styleGroups` |
| 45 | Mas_StyleNo | ID | — | 50–500 | Embed in `masterData.styleNumbers` |
| 46 | Mas_SubProcess | ID | SubProcess | 10–50 | Embed in parent `departments` |
| 47 | Mas_TemplateAllocate | ID | — | 5–20 | Embed in `masterData.templateAllocations` |
| 48 | Mas_Terms | ID | Terms | 5–20 | Embed in `masterData.terms` |
| 49 | Mas_UOM | UomID | Uom | 5–10 | Embed in `masterData.uoms` |
| 50 | Mas_User | ID | Username | 10–100 | `users` collection (auth) |
| 51 | Mas_Vehicle | Code | VName | 5–50 | Embed in `masterData.vehicles` |
| 52 | Mas_Voucher_PaymentType | ID | TypeDesc | 5–10 | Embed in `masterData.paymentTypes` |
| 53 | Mas_YarncountGroups | ID | Groupname | 3–10 | Embed in `masterData.yarnCountGroups` |

### 2.2 Order Tables (Order*) — ~20 Tables

Central business entity. Medium volume, frequently joined.

| # | Table | Est. Rows | MongoDB Strategy |
|---|-------|-----------|-----------------|
| 1 | OrderMas | 500–10,000 | `orders` collection (central doc) |
| 2 | OrderMas2 | Same | Embed in `orders` |
| 3 | OrderStyleDtl | 1,000–30,000 | Embed as `orders.styles[]` |
| 4 | OrderQtyDtl | 5,000–200,000 | Embed as `orders.styles[].quantities[]` |
| 5 | OrdSizeMas | 2,000–50,000 | Embed as `orders.styles[].sizeSequence[]` |
| 6 | OrderQtyDtl_Amend | 1,000–50,000 | Embed as `orders.styles[].amendments[]` |
| 7 | OrdQtyClrDtl | 2,000–50,000 | Embed in order style color detail |
| 8 | OrdQtyClrDtl_Amend | 500–10,000 | Embed in amendments |
| 9 | OrderStyleImage | 500–5,000 | `orderImages` collection (GridFS for large images) |
| 10 | OrderStyleImageAcc | 500–5,000 | Same as above |
| 11 | OrderStyleImgDtl | 500–5,000 | Embed in `orderImages` |
| 12 | OrderStylewiseCost | 1,000–30,000 | Embed as `orders.styles[].cost` |
| 13 | OrderStylewiseCost_Grp | 1,000–30,000 | Embed as `orders.styles[].costGroups[]` |
| 14 | OrderProgQty | 500–10,000 | Embed as `orders.programmedQty` |
| 15 | Order_PartDtl | 2,000–50,000 | Embed as `orders.styles[].parts[]` |
| 16 | Order_Addl_color / _CompDet / _Lot / _RatioDtl / _Size | var | Embed in parent order doc |
| 17 | OrderAccImgDtl | var | Embed in `orderImages` |
| 18 | OrderLotRateDtl | var | Embed in order |
| 19 | OrdProgPcsWgt | var | Embed in order |
| 20 | EnquiryDet | 100–2,000 | Embed in order or separate `enquiries` collection |
| 21 | Ord_GramDtl | var | Embed in order |
| 22 | OrdSeq | var | Embed as `orders.processSequence[]` |

### 2.3 Stock Tables — ~15 Tables

High-frequency read/write. Running balances are critical.

| # | Table | Est. Rows | MongoDB Strategy |
|---|-------|-----------|-----------------|
| 1 | StockTable | 5,000–100,000 | `stockItems` collection |
| 2 | CurrentStock | 5,000–100,000 | Embed as `stockItems.currentStock[]` (per godown) |
| 3 | CurrentStock_RollDtl | 10,000–500,000 | `stockRollDetails` collection (reference StockID) |
| 4 | Pcs_StockTable | 2,000–50,000 | `pieceStockItems` collection |
| 5 | Pcs_StockTableQty | 10,000–300,000 | Embed as `pieceStockItems.quantities[]` |
| 6 | Panel_StockTable | 1,000–20,000 | `panelStockItems` collection |
| 7 | Panel_StockTableQty | 5,000–100,000 | Embed as `panelStockItems.quantities[]` |
| 8 | Pcs_RejStockTable | 500–10,000 | `rejectedPieceStock` collection |
| 9 | SuppPcs_StockTable | 500–10,000 | `supplierPieceStock` collection |
| 10 | SuppPcs_StockTableQty | 2,000–50,000 | Embed in parent |
| 11 | SupplierStock | 1,000–20,000 | `supplierStock` collection |
| 12 | StockRatePost | 5,000–100,000 | `stockRates` collection |
| 13 | StockRate | 5,000–100,000 | Merge into `stockRates` |
| 14 | PcsStockRatePost / _All | 2,000–50,000 | `pieceStockRates` collection |
| 15 | PcsStockValue | 2,000–50,000 | Embed in `pieceStockItems` |

### 2.4 Transaction Tables — Delivery (Trs_Del*) — ~4 Tables

| # | Table | Est. Rows | MongoDB Strategy |
|---|-------|-----------|-----------------|
| 1 | Trs_Del1 | 5,000–100,000 | `deliveryChallans` collection (header) |
| 2 | Trs_Del2 | 10,000–500,000 | Embed as `deliveryChallans.lines[]` |
| 3 | Trs_Del3 | 10,000–500,000 | Embed as `deliveryChallans.programDetail[]` |
| 4 | Trs_Del4 | 10,000–500,000 | Embed as `deliveryChallans.gstDetail[]` |

### 2.5 Transaction Tables — GRN (Trs_Grn*) — ~3 Tables

| # | Table | Est. Rows | MongoDB Strategy |
|---|-------|-----------|-----------------|
| 1 | Trs_Grn1 | 5,000–100,000 | `goodsReceiptNotes` collection |
| 2 | Trs_GRN2 | 10,000–500,000 | Embed as `goodsReceiptNotes.lines[]` |
| 3 | Trs_MultiPrs_Grn1/2/3 | 2,000–30,000 | `multiProcessGRNs` collection with embedded party-dept detail and lines |

### 2.6 Transaction Tables — Purchase Orders (Trs_Po*) — ~3 Tables

| # | Table | Est. Rows | MongoDB Strategy |
|---|-------|-----------|-----------------|
| 1 | Trs_Po1 | 2,000–50,000 | `purchaseOrders` collection |
| 2 | Trs_Po2 | 5,000–200,000 | Embed as `purchaseOrders.yarnFabricLines[]` |
| 3 | Trs_Po5 | 5,000–200,000 | Embed as `purchaseOrders.accessoryLines[]` |

### 2.7 Transaction Tables — Pieces (Trs_Pcs*) — ~15 Tables

| # | Table | Est. Rows | MongoDB Strategy |
|---|-------|-----------|-----------------|
| 1 | Trs_Pcs1 | 5,000–100,000 | `pieceDeliveryChallans` collection |
| 2 | Trs_Pcs2 | 20,000–500,000 | Embed as `pieceDeliveryChallans.lines[]` |
| 3 | Trs_Pcs2_Acc | 5,000–100,000 | Embed as `pieceDeliveryChallans.accessoryLines[]` |
| 4 | Trs_Pcs1_Panel / Trs_Pcs2_Panel | var | `panelDeliveryChallans` collection with embedded lines |
| 5 | Trs_PcsGrn1 | 5,000–100,000 | `pieceGRNs` collection |
| 6 | Trs_PcsGrn2 | 20,000–500,000 | Embed as `pieceGRNs.lines[]` |
| 7 | Trs_PcsGrn3 / _MistakePcs / _PackingDCDet | var | Embed in `pieceGRNs` |
| 8 | Trs_PcsAdj1 / Trs_PcsAdj2 | var | `pieceAdjustments` collection |
| 9 | Trs_PcsOpening | var | Migrate values into `pieceStockItems` opening balances |
| 10 | Trs_PcsRej / Trs_PcsRejQty | var | `pieceRejections` collection |
| 11 | Trs_PcsStkAdjustment / _Dtl | var | Merge into `pieceAdjustments` |
| 12 | Trs_PcsStockTfr1 / Trs_PcsStockTfr2 | var | `pieceTransfers` collection |
| 13 | Trs_PcsGodAck1 / Trs_PcsGodAck2 | var | `pieceGodownAcks` collection |

### 2.8 Transaction Tables — Production (Trs_Prod*) — ~20 Tables

| # | Table | Est. Rows | MongoDB Strategy |
|---|-------|-----------|-----------------|
| 1 | Trs_ProdEntry | 10,000–500,000 | `productionEntries` collection |
| 2 | Trs_ProdEntryQty | 30,000–2,000,000 | Embed as `productionEntries.quantities[]` |
| 3 | Trs_ProdEntry_SourceStageDtl | var | Embed as `productionEntries.sourceStages[]` |
| 4 | Trs_ProdBillMasNew | 1,000–20,000 | `productionBills` collection |
| 5 | Trs_ProdBillDetNew | 5,000–100,000 | Embed as `productionBills.details[]` |
| 6 | Trs_ProdBill | var | Merge into `productionBills` |
| 7 | Trs_ProdBillEntry | var | Embed in `productionBills` |
| 8 | Trs_prodBillAddded1 | var | Embed as `productionBills.additions[]` |
| 9 | Trs_ProdExp | var | `productionExpenses` collection |
| 10 | Trs_ProdShiftWages | var | Embed in `productionEntries` or `shiftWages` collection |
| 11 | Trs_ProdShiftStyle_Contribute | var | Embed in shift wages |
| 12 | Trs_ProdWages | var | `productionWages` collection |
| 13 | Trs_Production_Consolidate | var | Computed on-demand (not migrated) |
| 14 | Trs_SuppProdentry / Qty / SourceStageDtl | var | `supplierProductionEntries` collection |
| 15 | Trs_HourlyProduction | var | `hourlyProduction` collection |
| 16 | Trs_LineInput / _Det | var | `lineInputs` collection |
| 17 | Trs_LineTargetProdn | var | `lineTargets` collection |
| 18 | Trs_LineTfr / _Det | var | `lineTransfers` collection |

### 2.9 Transaction Tables — Bills & Invoices — ~15 Tables

| # | Table | Est. Rows | MongoDB Strategy |
|---|-------|-----------|-----------------|
| 1 | Trs_Bills | 2,000–50,000 | `supplierBills` collection |
| 2 | Trs_BillAddded | 5,000–200,000 | Embed as `supplierBills.additions[]` |
| 3 | Trs_BillRate | 5,000–200,000 | Embed as `supplierBills.rateDetails[]` |
| 4 | Trs_BillDeb1 / Trs_BillDeb2 | var | Embed in `supplierBills` |
| 5 | Trs_Deb1 | 1,000–20,000 | `debitNotes` collection |
| 6 | Trs_Deb2 / Trs_Deb3 / Trs_Deb4 | var | Embed as `debitNotes.lines[]`, `.details[]` |
| 7 | Trs_DebAddDed | var | Embed as `debitNotes.additions[]` |
| 8 | Trs_DirectDeb1 / Trs_DirectDeb2 | var | `directDebitNotes` collection |
| 9 | Trs_SalInv | 1,000–30,000 | `salesInvoices` collection |
| 10 | Trs_SalInvAddded | var | Embed as `salesInvoices.additions[]` |
| 11 | Trs_NewInvDtl / _ConDtl / _CtnDtls / _CtnConDtls | var | `commercialInvoices` collection with embedded details |
| 12 | Trs_Inv_DomesticDet | var | Embed in `salesInvoices` where type = 'domestic' |
| 13 | Ship_InvMas / Ship_InvDet | var | `shippingInvoices` collection |
| 14 | ShippingBill / _det / _taxdet | var | `shippingBills` collection |

### 2.10 Transaction Tables — General DC & GRN — ~4 Tables

| # | Table | Est. Rows | MongoDB Strategy |
|---|-------|-----------|-----------------|
| 1 | Trs_Gen1 | 500–10,000 | `generalDCs` collection |
| 2 | Trs_Gen2 | 1,000–30,000 | Embed as `generalDCs.lines[]` |
| 3 | Trs_GenGrn1 | 500–10,000 | `generalGRNs` collection |
| 4 | Trs_GenGrn2 | 1,000–30,000 | Embed as `generalGRNs.lines[]` |

### 2.11 Costing, Budget & P&L Tables — ~15 Tables

| # | Table | Est. Rows | MongoDB Strategy |
|---|-------|-----------|-----------------|
| 1 | BudPoMas | 500–10,000 | `budgetPOs` collection |
| 2 | BudPodet | 2,000–50,000 | Embed as `budgetPOs.details[]` |
| 3 | DailyUnit_P_And_L | 5,000–200,000 | `dailyPnL` collection |
| 4 | DailyUnit_P_And_L_Abs | var | Computed view (not migrated) |
| 5 | Budget | var | `budgets` collection |
| 6 | Budget_CostFix / _Det | var | Embed in `budgets` |
| 7 | Bud_InhRateclw | 2,000–100,000 | `budgetRates` collection |
| 8 | Pro_Prod_PartwiseRate | var | Embed in `orders.productionRates` |
| 9 | Pro_Prod_BitCutRate | var | Embed in `orders.cuttingRates` |
| 10 | Pro_Prod_Budget_Det | var | Embed in `orders` |
| 11 | Pro_Prod_Panelwiserate | var | Embed in `orders` |
| 12 | Temp_BudgetAndAct* | var | Not migrated (temp report tables) |

### 2.12 Programming & Requirement Tables (Pro_*) — ~20 Tables

| # | Table | Est. Rows | MongoDB Strategy |
|---|-------|-----------|-----------------|
| 1 | Pro_ReqYarn / Pro_ReqYarn2 | 2,000–100,000 | `yarnRequirements` collection (one doc per order+dept combo) |
| 2 | Pro_ReqKnitt / Pro_ReqKnitt2 | 2,000–100,000 | `fabricRequirements` collection |
| 3 | PRO_AccReq | var | `accessoryRequirements` collection |
| 4 | PRO_AccJobReq | var | Embed in `accessoryRequirements` |
| 5 | Pro_AccBudRate | var | Embed in `accessoryRequirements` |
| 6 | Pro_ReqActual | var | Embed in `yarnRequirements`/`fabricRequirements` |
| 7 | Pro_ReqJob / Pro_ReqJob_1 | var | `jobRequirements` collection |
| 8 | Pro_RateCnfPcs1/2 | var | `rateConfirmations` collection |
| 9 | Pro_YrnCns | var | Embed in yarn requirements |
| 10 | PRo_BudCommercial | var | Embed in order budget |
| 11 | Pro_ProdPros | var | Embed in `orders.productionProcess` |
| 12 | Pro_ProdBitCutDet | var | Embed in order cutting detail |

### 2.13 Program Planning Tables (Prog_*) — ~15 Tables

| # | Table | Est. Rows | MongoDB Strategy |
|---|-------|-----------|-----------------|
| 1 | Prog_ClrComb | var | Embed as `orders.colorCombinations[]` |
| 2 | Prog_ClrDtl | var | Embed in color combinations |
| 3 | Prog_Clrloss | var | Embed in color combinations |
| 4 | Prog_Component | var | Embed as `orders.components[]` |
| 5 | Prog_Design | var | Embed in order |
| 6 | Prog_DiaChange | var | Embed in order |
| 7 | Prog_InputPanels | var | Embed in order |
| 8 | Prog_PanelEntry | var | Embed in order |
| 9 | Prog_Prsloss | var | Embed as `orders.processLoss[]` |
| 10 | Prog_AccMas | var | Embed in order accessories |
| 11 | Prog_Comments | var | Embed as `orders.comments[]` |
| 12 | Prog_ReqCalTWrk | var | Embed in order |
| 13 | prog_cns / prog_ycns | var | Embed in order consumption data |
| 14 | Prog_YTwist_Dtl / Mas | var | `yarnTwistPrograms` collection |

### 2.14 Summary/Posting Tables (ST_*) — ~13 Tables

| # | Table | Est. Rows | MongoDB Strategy |
|---|-------|-----------|-----------------|
| 1 | ST_Production_Data | 10,000–500,000 | **Not migrated** — recomputed from `productionEntries` via aggregation pipeline |
| 2 | ST_Supp_Production_Data | var | **Not migrated** — recomputed |
| 3 | ST_Acc_PartyBal_Abs | var | **Not migrated** — recomputed |
| 4 | ST_Acc_Prog_Balance | var | **Not migrated** — recomputed |
| 5 | ST_Cost_Dept / _Factory / _OrderDtl | var | **Not migrated** — recomputed |
| 6 | ST_DailyCostingInputData | var | **Not migrated** — recomputed |
| 7 | ST_Ord_inHand | var | **Not migrated** — recomputed |
| 8 | ST_PartyBalance_Abs | var | **Not migrated** — recomputed |
| 9 | ST_ProdRequirement | var | **Not migrated** — recomputed |
| 10 | ST_ProgBalance_Fabric | var | **Not migrated** — recomputed |
| 11 | ST_ProgBalance_Yarn | var | **Not migrated** — recomputed |

> **Rationale**: ST_* tables are trigger-maintained denormalized summaries. In MongoDB, these are replaced by aggregation pipelines or materialized views computed from authoritative transaction collections.

### 2.15 Supplier Order Tables — ~7 Tables

| # | Table | Est. Rows | MongoDB Strategy |
|---|-------|-----------|-----------------|
| 1 | SuppOrdMas | 500–5,000 | `supplierOrders` collection |
| 2 | SuppOrdDet | 2,000–30,000 | Embed as `supplierOrders.details[]` |
| 3 | SuppOrdImage | var | GridFS or embed in `supplierOrders` |
| 4 | SuppOrdStyleDtl | var | Embed in `supplierOrders` |
| 5 | SuppAccDet | var | Embed in `supplierOrders` |
| 6 | SuppAssortDet | var | Embed in `supplierOrders` |
| 7 | SuppCommDet | var | Embed in `supplierOrders` |

### 2.16 Cutting & Panel Tables — ~15 Tables

| # | Table | Est. Rows | MongoDB Strategy |
|---|-------|-----------|-----------------|
| 1 | Cutting_Job / _Dtl | 1,000–20,000 | `cuttingJobs` collection with embedded details |
| 2 | Trs_CutApr | var | `cuttingApprovals` collection |
| 3 | Trs_CuttingShortage | var | Embed in cutting jobs |
| 4 | Trs_ReadyToCut1/2 | var | `readyToCut` collection with embedded lines |
| 5 | Trs_ReadyToCut_Ret1/2 | var | `readyToCutReturns` collection |
| 6 | Trs_PanelExcess / _Stage | var | `panelExcess` collection |
| 7 | Trs_PanelRej | var | `panelRejections` collection |
| 8 | Trs_PanelReWork1/2 | var | `panelRework` collection |
| 9 | Trs_AddPanelEntry / Qty / _Component / _Det | var | `additionalPanelEntries` collection |
| 10 | Prod_CutComponents | var | Embed in `cuttingJobs` |
| 11 | Prod_Sequence / Prod_Slno | var | Embed as `orders.productionSequence[]` |
| 12 | Prod_Source_Operation | var | Embed in production |

### 2.17 Payment & Wages Tables — ~8 Tables

| # | Table | Est. Rows | MongoDB Strategy |
|---|-------|-----------|-----------------|
| 1 | PaymentMas | 1,000–30,000 | `payments` collection |
| 2 | PaymentDtl | 3,000–100,000 | Embed as `payments.details[]` |
| 3 | Wages_ProductionMas / _Det | var | `wageRecords` collection |
| 4 | Trs_DailyWagePosting | var | `dailyWagePostings` collection |

### 2.18 Daily Costing & Expense Tables — ~10 Tables

| # | Table | Est. Rows | MongoDB Strategy |
|---|-------|-----------|-----------------|
| 1 | Trs_DailyPrdn_Costing1 | 500–10,000 | `dailyCostingEntries` collection |
| 2 | Trs_DailyPrdn_Costing2-5 | 2,000–100,000 | Embed as `dailyCostingEntries.factoryExpenses[]`, `.deptExpenses[]`, `.lineExpenses[]`, `.orderExpenses[]` |
| 3 | Trs_DailyExpenseEntry | var | `dailyExpenses` collection |
| 4 | Trs_FixedExpensesDateWise | var | Embed in `dailyExpenses` |
| 5 | Trs_StylewiseSingleExpense | var | Embed in `dailyExpenses` |
| 6 | Trs_CashExpenses1/2 | var | `cashExpenses` collection |
| 7 | FixedExpenses_Entry | var | `fixedExpenses` collection |
| 8 | Trs_Expenses | var | Merge into `dailyExpenses` |

### 2.19 Shipping & Sales Invoice Tables — ~10 Tables

(Covered in §2.9 above — `salesInvoices`, `shippingInvoices`, `shippingBills`, `commercialInvoices`.)

### 2.20 Job Work Tables — ~7 Tables

| # | Table | Est. Rows | MongoDB Strategy |
|---|-------|-----------|-----------------|
| 1 | Trs_JobWrkMas | 500–10,000 | `jobWorkOrders` collection |
| 2 | Trs_JobWrkDet | 2,000–50,000 | Embed as `jobWorkOrders.details[]` |
| 3 | Trs_JobWrkInv | var | `jobWorkInvoices` collection |
| 4 | Trs_JWrkInvAddded | var | Embed as `jobWorkInvoices.additions[]` |
| 5 | Trs_ContractorAllotment_Mas / _Det | var | `contractorAllotments` collection |
| 6 | Trs_ContractorBal | var | `contractorBalances` collection |
| 7 | Trs_JobOrder_PanelStock | var | Embed in job work details |

### 2.21 Barcode & Bundle Tables — ~10 Tables

| # | Table | Est. Rows | MongoDB Strategy |
|---|-------|-----------|-----------------|
| 1 | Barcode | var | `barcodes` collection |
| 2 | Pay_BarcodeGeneration | var | Embed in `barcodes` |
| 3 | Pay_CuttProdMas | var | `cuttingProductionBundles` collection |
| 4 | Pay_CuttProd_Bundle | var | Embed in above |
| 5 | Pay_Bundle_IsstoLine | var | `bundleLineIssues` collection |
| 6 | Pay_Bundle_ProdEntry | var | `bundleProductionEntries` collection |
| 7 | Pay_BundlePcs_Barcode | var | Embed in bundles |
| 8 | Pay_Pcs_ProdEntry | var | `pieceBarcodeProduction` collection |
| 9 | Pay_ProdWorkDetails | var | Embed in production |
| 10 | Trs_DC_ScanDetail | var | Embed in delivery challans |

### 2.22 Quality & Lab Tables — ~6 Tables

| # | Table | Est. Rows | MongoDB Strategy |
|---|-------|-----------|-----------------|
| 1 | LabTestGrpMas / _Det | var | `labTestGroups` collection with embedded details |
| 2 | LabTestMas | var | `labTests` collection |
| 3 | TestMas | var | Embed in `labTests` |

### 2.23 Workflow & Approval Tables — ~12 Tables

| # | Table | Est. Rows | MongoDB Strategy |
|---|-------|-----------|-----------------|
| 1 | WF_UserMas | 10–100 | Merge into `users` collection |
| 2 | Wf_AssigneeMas | var | Embed as `users.workflowAssignments[]` |
| 3 | Wf_OperationMaster | 10–50 | `workflowOperations` collection |
| 4 | Wf_UserBuyerDeptMas / Wf_UserBuyerMas | var | Embed in `users` |
| 5 | Wf_UserOperationList | var | Embed in `users` |
| 6 | wf_UserUnitMas | var | Embed in `users` |
| 7 | WF_WorkFlow_Document | var | `workflowDocuments` collection |
| 8 | WF_WorkFlow_Planning | var | `workflowPlans` collection |
| 9 | wf_maildisplaylist / wf_mailtemplate | var | `mailTemplates` collection |
| 10 | App_ApprovalDc / _Plan / _Sent | var | `approvals` collection |
| 11 | App_CourierMas | var | `couriers` collection |

### 2.24 WBS & Meeting Tables — ~5 Tables

| # | Table | Est. Rows | MongoDB Strategy |
|---|-------|-----------|-----------------|
| 1 | WBS_LineProduction / Wbs_Production / _DateWise | var | **Not migrated** — recomputed from production entries |
| 2 | WBS_Supp_Production | var | **Not migrated** |
| 3 | Meeting / MR_Style / MR_Production / MR_ProcessDetails / mr_fabric | var | `meetings` collection with embedded sub-documents |

### 2.25 Configuration & System Tables — ~7 Tables

| # | Table | Est. Rows | MongoDB Strategy |
|---|-------|-----------|-----------------|
| 1 | Options | 1 row | `systemConfig` collection (single doc) |
| 2 | Options_FM | 10–50 | Embed as `systemConfig.formOptions` |
| 3 | Options1 | 1 row | Merge into `systemConfig` |
| 4 | FinanceYear | 5–20 | `fiscalYears` collection |
| 5 | GovtHolidays | 20–100 | `holidays` collection |
| 6 | Preprint | 10–50 | Embed in `systemConfig.preprint` |
| 7 | Fcr_config | 1–5 | Embed in `systemConfig` |
| 8 | spupdate | var | Not migrated (schema migration tracking) |

### 2.26 BI & Temporary Reporting Tables — ~15 Tables

| # | Table | MongoDB Strategy |
|---|-------|-----------------|
| 1 | BI_ACCSTOCK | **Not migrated** — computed on demand |
| 2 | BI_GrpStockInfo | **Not migrated** |
| 3 | BI_PCEREG | **Not migrated** |
| 4 | BI_STKREPORTS | **Not migrated** |
| 5 | DailyStockReg | **Not migrated** |
| 6 | Temp_StkReports | **Not migrated** — rebuilt per request |
| 7 | TempAccStock | **Not migrated** |
| 8 | Temp_PceReg | **Not migrated** |
| 9 | TempPartyBalAbs / _Ledger | **Not migrated** |
| 10 | TempIoHisLedger / _Right | **Not migrated** |
| 11 | TempPcsDCDetInv | **Not migrated** |
| 12 | Tmp_OCRSummary / _Pcs | **Not migrated** |
| 13 | Tmp_HourlyProduction | **Not migrated** |

> **Rationale**: All Temp/BI tables are session-scoped working tables populated by stored procedures for reports. In MongoDB, these are replaced by aggregation pipelines returning results directly.

### 2.27 Summary: Table Count by Category

| Category | SQL Tables | MongoDB Collections | Embedded | Not Migrated |
|----------|-----------|-------------------|----------|-------------|
| Master (Mas_*) | 53 | 12 standalone + `masterData` doc | ~35 | 0 |
| Order (Order*) | 22 | 1 (`orders`) + 1 (`orderImages`) | ~20 | 0 |
| Stock | 15 | 7 | 5 | 0 |
| Delivery Challans (Trs_Del*) | 4 | 1 | 3 | 0 |
| GRN (Trs_Grn*) | 6 | 2 | 4 | 0 |
| Purchase Orders (Trs_Po*) | 3 | 1 | 2 | 0 |
| Piece Transactions (Trs_Pcs*) | 15 | 6 | 9 | 0 |
| Production (Trs_Prod*) | 20 | 8 | 10 | 2 |
| Bills & Invoices | 15 | 6 | 8 | 0 |
| General DC/GRN | 4 | 2 | 2 | 0 |
| Costing/Budget | 15 | 5 | 5 | 3 |
| Programming (Pro_*) | 20 | 4 | 14 | 0 |
| Planning (Prog_*) | 15 | 1 | 14 | 0 |
| Summary (ST_*) | 13 | 0 | 0 | **13** |
| Supplier Orders | 7 | 1 | 6 | 0 |
| Cutting/Panel | 15 | 7 | 6 | 0 |
| Payment/Wages | 8 | 4 | 3 | 0 |
| Daily Costing/Expense | 10 | 4 | 5 | 0 |
| Job Work | 7 | 3 | 3 | 0 |
| Barcode/Bundle | 10 | 4 | 5 | 0 |
| Quality/Lab | 6 | 2 | 2 | 0 |
| Workflow/Approval | 12 | 5 | 6 | 0 |
| WBS/Meeting | 5 | 1 | 1 | **4** |
| Config/System | 8 | 3 | 4 | 1 |
| BI/Temp | 15 | 0 | 0 | **15** |
| **TOTAL** | **~323** | **~82** | **~171** | **~38** |

---

## 3. SQL Server → MongoDB Collection Mapping

### 3.1 Design Principles

1. **Embed when**: Data is always read together (header + lines), 1:few relationship, update patterns are atomic on the parent document
2. **Reference when**: Data participates in many-to-many relationships, entity is independently queryable, document would exceed 16 MB, or data update patterns are independent
3. **Denormalize selectively**: Store frequently-needed master data names (e.g., `buyerName`, `partyName`) alongside IDs to avoid $lookup joins
4. **No trigger-maintained tables**: Replace SQL triggers with change streams or application-level hooks in Node.js
5. **No temp/BI tables**: Replace with MongoDB aggregation pipelines

### 3.2 Core Collection Schema Designs

#### `orders` Collection (Central Business Entity)

```javascript
{
  _id: ObjectId,
  legacyOrdId: Number,       // from OrderMas.OrdId
  companyId: ObjectId,        // ref → companies
  jobNo: Number,
  fiscalYear: String,         // "24-25"
  buyerOrderNo: String,
  buyer: {
    _id: ObjectId,            // ref → buyers
    name: String              // denormalized
  },
  season: { _id: ObjectId, name: String },
  completed: Boolean,
  orderType: String,          // "Order"|"Sample"|"Trading"
  // --- Embedded from OrderMas2 ---
  extension: { /* all OrderMas2 fields */ },
  // --- Embedded from OrderStyleDtl ---
  styles: [{
    styleNo: String,
    entryOption: Number,
    quantities: [{             // from OrderQtyDtl
      partId: Number,
      colorId: Number,
      sizeId: Number,
      comboColorId: Number,
      orderQty: Number,
      pcsPerColor: Number,
      lotNo: String
    }],
    amendments: [{             // from OrderQtyDtl_Amend
      partId: Number, colorId: Number, sizeId: Number,
      orderQty: Number, amendDate: Date
    }],
    sizeSequence: [{ sizeId: Number, seqNo: Number }],
    parts: [{ partId: Number, /* fields */ }],
    cost: { /* from OrderStylewiseCost */ },
    costGroups: [{ grpId: Number, grnKgs: Number, grnBasedValue: Number }],
    // --- Embedded from Prog_* tables ---
    colorCombinations: [{ /* from Prog_ClrComb */ }],
    components: [{ /* from Prog_Component */ }],
    processLoss: [{ /* from Prog_Prsloss */ }]
  }],
  processSequence: [{ stageId: Number, seqNo: Number }],
  programmedQty: { /* from OrderProgQty */ },
  comments: [{ /* from Prog_Comments */ }],
  // --- Metadata ---
  createdAt: Date,
  updatedAt: Date
}
```

#### `stockItems` Collection

```javascript
{
  _id: ObjectId,
  legacyStockId: Number,      // from StockTable.StockID
  companyId: ObjectId,
  orderId: ObjectId,           // ref → orders
  legacyOrdId: Number,
  department: { _id: ObjectId, name: String },
  materialType: String,        // "Y"|"F"|"A"|"G" (yarn/fabric/accessory/general)
  // --- Material-specific fields ---
  yarnCount: { _id: Number, name: String },
  color: { _id: Number, name: String },
  fabric: { _id: Number, name: String },
  diameter: { greige: Number, finished: Number },
  gsm: { greige: Number, finished: Number },
  gauge: Number,
  loopLength: String,
  mill: { _id: Number, name: String },
  lotNo: String,
  // Accessories-specific
  accessoryType: { _id: Number, name: String },
  accessoryDesc: { _id: Number, name: String },
  size: Number,
  part: Number,
  component: Number,
  rate: Number,
  design: Number,
  subProcess: Number,
  // --- Running balances (embedded from CurrentStock) ---
  currentStock: [{
    godownId: Number,
    godownName: String,
    bags: Number,
    kgs: Number,
    meters: Number,
    styleNo: String
  }],
  createdAt: Date,
  updatedAt: Date
}
```

#### `deliveryChallans` Collection

```javascript
{
  _id: ObjectId,
  legacyId: Number,           // from Trs_Del1.ID
  companyId: ObjectId,
  docNo: Number,
  dcPrefix: String,
  fiscalYear: String,
  date: Date,
  transactionType: Number,    // TrType code
  transactionTypeDesc: String, // denormalized description
  processDept: { _id: Number, name: String },
  party: { _id: Number, name: String },
  buyer: { _id: Number, name: String },
  partyUnit: String,
  processType: String,
  reprocessType: String,
  linkedGrnId: Number,
  vehicle: { code: Number, name: String },
  gatePassNo: Number,
  sourceGodown: { _id: Number, name: String },
  totalDeliveryWeight: Number,
  closed: Boolean,
  totalReceivedKgs: Number,
  totalBudgetAmount: Number,
  remark: String,
  targetDate: Date,
  lotNo: String,
  designId: Number,
  ewayBill: { number: String, date: Date },
  destinationCompanyId: Number,
  deliveryTo: String,
  productionId: Number,
  dyeColorId: Number,
  // --- Embedded lines ---
  lines: [{                    // from Trs_Del2
    stockId: Number,
    orderId: Number,
    styleNo: String,
    bags: Number, kgs: Number, meters: Number,
    rate: Number, rateUomId: Number,
    transferOrderId: Number, transferStyleNo: String,
    acknowledged: { rolls: Number, kgs: Number, meters: Number },
    deliveryType: String,
    budgetAmount: Number
  }],
  programDetail: [{            // from Trs_Del3
    orderId: Number, fabricType: Number, count: Number, color: Number,
    programmedQty: Number, gsm: Number, diaId: Number,
    rate: Number, lotNo: String
  }],
  gstDetail: [{                // from Trs_Del4
    stockId: Number, cgstPer: Number, sgstPer: Number, igstPer: Number,
    hsnId: Number
  }],
  createdAt: Date, updatedAt: Date
}
```

#### `supplierBills` Collection

```javascript
{
  _id: ObjectId,
  legacyId: Number,
  companyId: ObjectId,
  billRefNo: String,
  fiscalYear: String,
  billNo: String,
  billRefDate: Date,
  billDate: Date,
  party: { _id: Number, name: String, gstNo: String },
  billType: String,
  billAmount: Number,
  gstBill: Boolean,
  eInvoiceRef: String,
  // --- Embedded additions/deductions ---
  additions: [{                 // from Trs_BillAddded
    addDedCode: Number,
    addDedName: String,         // denormalized: "SGST","CGST","IGST"
    percentage: Number,
    amount: Number
  }],
  rateDetails: [{               // from Trs_BillRate
    deptId: Number,
    orderId: Number,
    netAmount: Number
  }],
  createdAt: Date, updatedAt: Date
}
```

### 3.3 Embedding vs. Referencing Decision Matrix

| SQL Relationship | Cardinality | Access Pattern | Decision | Notes |
|------------------|-------------|----------------|----------|-------|
| OrderMas → OrderStyleDtl | 1:3–10 | Always loaded together | **Embed** | Styles always fetched with order |
| OrderStyleDtl → OrderQtyDtl | 1:10–200 | Grid display in form | **Embed** | Fits in 16MB limit for typical orders |
| Trs_Del1 → Trs_Del2 | 1:1–50 | DC always shows lines | **Embed** | Max ~50 lines per DC |
| Trs_Del1 → Trs_Del4 | 1:1–50 | GST shown with DC | **Embed** | Same cardinality as lines |
| StockTable → CurrentStock | 1:1–10 | Stock view shows balances | **Embed** | Small per-godown subdocs |
| StockTable → CurrentStock_RollDtl | 1:10–500 | Roll detail is drill-down | **Reference** | Can be hundreds of rolls |
| Pcs_StockTable → Pcs_StockTableQty | 1:10–100 | Piece stock by size/color | **Embed** | Typically <100 combos |
| Trs_ProdEntry → Trs_ProdEntryQty | 1:5–15 | Sizes in one entry | **Embed** | Max ~15 sizes per entry |
| OrderMas → Prog_* | 1:many | Programming loaded separately | **Embed** | Part of order document |
| Trs_Bills → Trs_BillAddded | 1:3–10 | Always shown together | **Embed** | Few additions per bill |
| Trs_Bills → Trs_BillRate | 1:1–20 | Rate detail with bill | **Embed** | Few rate lines |
| Mas_Acc → Mas_AccDes | 1:5–20 | Always browsed together | **Embed** | Descriptions with type |
| PaymentMas → PaymentDtl | 1:1–10 | Payment always with lines | **Embed** | Few details per payment |
| Orders → Deliveries | 1:many | Independent queries | **Reference** | Separate lifecycle |
| Orders → GRNs | 1:many | Independent queries | **Reference** | Separate lifecycle |
| Orders → Production | 1:many | Independent queries | **Reference** | Separate lifecycle |
| Orders → Bills | 1:many | Independent queries | **Reference** | Separate lifecycle |

---

## 4. Data Transformation Rules

### 4.1 Field Type Conversions

| SQL Server Type | MongoDB Type | Conversion Rule |
|----------------|-------------|-----------------|
| `INT` (PK, auto-increment) | `ObjectId` (new PK) + `legacyId: Number` | Generate new ObjectId; preserve original as `legacyId` for backward reference |
| `INT` (FK) | `ObjectId` (ref) or `Number` (legacy ref) | Use ObjectId refs for frequently joined entities; keep numeric for lightweight refs |
| `VARCHAR(n)` | `String` | Direct copy; trim trailing whitespace |
| `NUMERIC(p,s)` / `DECIMAL(p,s)` | `Decimal128` or `Number` | Use `Decimal128` for financial amounts (rates, bill amounts, GST). Use `Number` for quantities |
| `DATETIME` | `Date` (ISODate) | Convert SQL datetime to UTC ISODate |
| `BIT` | `Boolean` | `0` → `false`, `1` → `true` |
| `CHAR(1)` flag (e.g., 'Y'/'N') | `Boolean` | `'Y'` → `true`, `'N'`/null → `false` |
| `CHAR(1)` type (e.g., 'Y'/'F'/'A') | `String` enum | Map to descriptive enum: `'Y'` → `"yarn"`, `'F'` → `"fabric"`, `'A'` → `"accessory"`, `'G'` → `"general"` |
| `VARCHAR` (empty string `''`) | `null` | SQL empty strings → MongoDB null (avoid empty-string queries) |
| `INT` value `0` (meaning "none") | `null` | SQL zero-as-null FK refs → MongoDB null |

### 4.2 Calculated Fields Strategy

Fields that were computed by triggers in SQL Server need explicit handling:

| SQL Trigger / View | Computed Field | MongoDB Strategy |
|-------------------|----------------|-----------------|
| `Tgr_StockRatePost` | `CumBillrate` (cumulative bill rate through dept chain) | Compute on write in Node.js middleware when bill rate changes |
| `TRG_FAB_BALANCE_DEL` / `_GRN` / `_RTC` | `ST_ProgBalance_Fabric.*` | Aggregation pipeline on `deliveryChallans` + `goodsReceiptNotes` + `readyToCut` |
| `TRG_YARN_BALANCE_DEL` / `_GRN` | `ST_ProgBalance_Yarn.*` | Aggregation pipeline on same transaction collections |
| `Trg_ST_PartyBalance_Abs_Update` | Party balance abstract | Aggregation pipeline on `supplierBills` + `debitNotes` + `deliveryChallans` |
| `Trg_ST_Acc_PartyBal_Abs_Update` | Accessories party balance | Aggregation pipeline on relevant transactions |
| `Trg_ST_Acc_Prog_Balance_Update` | Accessories program balance | Aggregation on requirements + transactions |
| 40× `UpdateFlg` triggers | `UpdateFlg=1` on change | **Not needed** — MongoDB change streams replace replication flag |
| Vue_StkLedger | Stock transaction log | Aggregation pipeline across all transaction collections by `stockId` |
| Vue_Budget_Det | Budget summary per order | Aggregation on deliveries + debit notes + production + bills |
| Vue_DailyCostingInputData | Daily costing | Aggregation on `dailyCostingEntries` |

### 4.3 Denormalization Rules

For read performance, denormalize these frequently-needed names into transaction documents:

| Document | Denormalized Fields | Source |
|----------|-------------------|--------|
| All transaction docs | `companyName` | `companies` collection |
| All transaction docs | `buyer.name` | `buyers` collection |
| All transaction docs | `party.name`, `party.gstNo` | `parties` collection |
| `deliveryChallans` | `processDept.name` | `departments` |
| `stockItems` | `yarnCount.name`, `color.name`, `fabric.name`, `mill.name`, `godownName` | various masters |
| `orders` | `buyer.name`, `season.name` | masters |
| `supplierBills` | `party.name`, additions code names | masters |

**Update strategy**: When a master record name changes, use MongoDB `updateMany` to propagate changes to denormalized fields. This is rare (master name changes are infrequent) and can be done async.

### 4.4 Date & Fiscal Year Transformation

```javascript
// SQL: Finyear = "24-25" (VARCHAR), separate Dt = DATETIME
// MongoDB: fiscalYear as string, date as ISODate
{
  fiscalYear: "24-25",          // preserve as-is
  date: ISODate("2024-08-15"),  // convert SQL datetime to ISODate
  fiscalYearStart: ISODate("2024-04-01"),  // computed: derived from fiscalYear string
  fiscalYearEnd: ISODate("2025-03-31")     // computed: derived from fiscalYear string
}
```

### 4.5 Multi-Value Field Splitting

Some SQL fields contain comma-separated values processed by `fnSplitter()`:

| SQL Usage | Example | MongoDB Strategy |
|-----------|---------|-----------------|
| `fnSplitter(@DeptIds)` | `"1,2,3,5"` | Store as array: `[1, 2, 3, 5]` |
| `fnSplitter(@BuyerIds)` | `"10,20,30"` | Store as array: `[10, 20, 30]` |

### 4.6 Image Data Transformation

| SQL Source | Storage | MongoDB Strategy |
|-----------|---------|-----------------|
| `OrderStyleImage` | VARBINARY / image column | GridFS for images > 256KB; inline `Buffer` for thumbnails |
| `SuppOrdImage` | Same | GridFS |
| Image file paths | Local file references | Upload to GridFS or cloud storage (S3/GCS), store URL |

---

## 5. Multi-Company & Multi-Fiscal-Year Partitioning

### 5.1 SQL Server Approach (Current)

- **Multi-company**: `Coycode` (= `Mas_Exporter.ExpID`) column on every transaction table
- **Multi-fiscal-year**: `Finyear` (e.g., `"24-25"`) column on every transaction header
- **Database-level**: Each customer deployment gets a separate database (e.g., `Fiberpro_baalaji`, `Fiberpro_company2`)
- **At login**: User selects company + fiscal year; all queries filter by both

### 5.2 MongoDB Strategy

#### Option A: Single Database, Compound Indexes (Recommended)

```
Database: fiberpro
├── All collections have { companyId, fiscalYear } fields
├── Compound index: { companyId: 1, fiscalYear: 1, ... } on every transaction collection
└── Application middleware injects companyId + fiscalYear into every query
```

**Pros**: Simple migration, single connection pool, easy cross-company reporting  
**Cons**: Requires discipline to always filter by companyId

#### Implementation:

```javascript
// Mongoose middleware — auto-inject company/fiscal year filter
schema.pre(/^find/, function() {
  if (!this.getOptions().skipCompanyFilter) {
    this.where({ companyId: req.user.companyId });
  }
});

// Index template for all transaction collections
{
  companyId: 1,
  fiscalYear: 1,
  date: -1
}
```

#### Option B: Database-per-Company (For large deployments)

```
fiberpro_company1/    ← collections for company 1
fiberpro_company2/    ← collections for company 2
```

**Pros**: Natural data isolation, no risk of cross-company data leaks  
**Cons**: More complex connection management, harder cross-company queries

#### Recommendation

**Use Option A** for most deployments. Reserve Option B only for very large multi-tenant SaaS scenarios.

### 5.3 Fiscal Year Data Lifecycle

| Phase | Strategy |
|-------|----------|
| **Active year** | All queries default to current fiscal year |
| **Year-end closing** | Archive completed fiscal year data to a `_archive` suffix collection or keep in place with index |
| **Opening balances** | Carry forward stock balances (`CurrentStock`, `Pcs_StockTableQty`) to new fiscal year by creating opening balance documents |
| **Historical queries** | Allow user to select any fiscal year; query filters by `fiscalYear` field |

### 5.4 Index Strategy for Multi-Tenancy

Every transaction collection gets these minimum indexes:

```javascript
// Primary query pattern
{ companyId: 1, fiscalYear: 1, date: -1 }

// Document number lookup
{ companyId: 1, fiscalYear: 1, docNo: 1 }

// Party-based queries
{ companyId: 1, "party._id": 1, date: -1 }

// Order-based queries
{ companyId: 1, legacyOrdId: 1 }
// Or with ObjectId:
{ companyId: 1, orderId: 1 }
```

---

## 6. ETL Pipeline Specification

### 6.1 Architecture Overview

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────┐
│ SQL Server   │────→│ Extraction   │────→│ Transform    │────→│ MongoDB  │
│ (Source)     │     │ (Node.js +   │     │ (Node.js     │     │ (Target) │
│              │     │  mssql pkg)  │     │  streams)    │     │          │
└─────────────┘     └──────────────┘     └──────────────┘     └──────────┘
                           │                    │
                     Read batches           Map fields,
                     of 1000 rows          embed children,
                                          compute derived,
                                          generate ObjectIds
```

### 6.2 Technology Stack

| Component | Technology | Version |
|-----------|-----------|---------|
| Extraction | Node.js + `mssql` package | ≥ 18 LTS |
| Transformation | Node.js streams + custom mappers | — |
| Loading | `mongodb` native driver (bulk writes) | ≥ 6.x |
| Orchestration | Script-based (can be wrapped in PM2 or Docker) | — |
| Logging | Winston or Pino | — |
| Progress | CLI progress bar + JSON log file | — |

### 6.3 Migration Phases

#### Phase 1: Master Data (First)

**Order**: Independent masters first, then dependent masters.

```
Step 1.1: Mas_State → states (or masterData.states)
Step 1.2: Mas_UOM → masterData.uoms
Step 1.3: Mas_Exporter → companies              (needed by everything)
Step 1.4: Mas_Buyer → buyers                     (needs StateId)
Step 1.5: Mas_Party → parties                    (needs StateId)
Step 1.6: Mas_Fabric, Mas_Color, Mas_Count, Mas_Dia, Mas_Size → masterData.*
Step 1.7: Mas_Dept → departments                 (needs Mas_Grp)
Step 1.8: Mas_Godown, Mas_Mill, Mas_Emp, Mas_Lot → their collections
Step 1.9: Mas_HSN, Mas_AddDed, Mas_Fcy → their collections
Step 1.10: Mas_Acc → accessoryTypes (with embedded Mas_AccDes, Mas_AccCategory)
Step 1.11: Mas_JobWrkComp → productionStages
Step 1.12: All remaining Mas_* → masterData sub-documents
Step 1.13: Mas_User → users
Step 1.14: Options, Options_FM, Options1 → systemConfig
Step 1.15: FinanceYear → fiscalYears
Step 1.16: GovtHolidays → holidays
```

**Estimated time**: Minutes (< 10,000 total rows)

#### Phase 2: Order Data

```
Step 2.1: Read OrderMas + OrderMas2 → base order document
Step 2.2: For each order, read and embed:
          - OrderStyleDtl → styles[]
          - OrderQtyDtl → styles[].quantities[]
          - OrdSizeMas → styles[].sizeSequence[]
          - OrderQtyDtl_Amend → styles[].amendments[]
          - OrderStylewiseCost → styles[].cost
          - OrderStylewiseCost_Grp → styles[].costGroups[]
          - Order_PartDtl → styles[].parts[]
          - Prog_ClrComb, Prog_Component, Prog_Prsloss → styles[].colorCombinations[], components[], processLoss[]
          - OrdSeq → processSequence[]
          - Prog_Comments → comments[]
          - All other Order_Addl_*, Prog_* tables → embedded
Step 2.3: Bulk insert into orders collection
Step 2.4: Build ID mapping table: { legacyOrdId → new ObjectId }
```

**Estimated time**: Minutes to low hours (depends on order count)

#### Phase 3: Stock Data

```
Step 3.1: Read StockTable rows
Step 3.2: For each stock item, read CurrentStock rows → embed as currentStock[]
Step 3.3: Denormalize master names (count, color, fabric, mill, godown)
Step 3.4: Map OrdID → order ObjectId using mapping table
Step 3.5: Bulk insert into stockItems
Step 3.6: Build stock ID mapping: { legacyStockId → new ObjectId }
Step 3.7: Migrate CurrentStock_RollDtl → stockRollDetails (reference stockItemId)
Step 3.8: Migrate Pcs_StockTable + Pcs_StockTableQty → pieceStockItems
Step 3.9: Migrate Panel_StockTable + Panel_StockTableQty → panelStockItems
Step 3.10: Migrate StockRatePost → stockRates
```

**Estimated time**: Low hours (stock tables can be large)

#### Phase 4: Transaction Data (Largest phase)

```
Step 4.1: Delivery Challans
  - Read Trs_Del1 in batches of 1000
  - For each header, read Trs_Del2, Trs_Del3, Trs_Del4 → embed
  - Map IDs (party, dept, order, stock) using mapping tables
  - Bulk insert into deliveryChallans

Step 4.2: GRNs
  - Read Trs_Grn1 → embed Trs_GRN2
  - Read Trs_MultiPrs_Grn1 → embed Grn2, Grn3

Step 4.3: Purchase Orders
  - Trs_Po1 → embed Trs_Po2, Trs_Po5

Step 4.4: Piece DCs
  - Trs_Pcs1 → embed Trs_Pcs2, Trs_Pcs2_Acc

Step 4.5: Piece GRNs
  - Trs_PcsGrn1 → embed Trs_PcsGrn2, Trs_PcsGrn3

Step 4.6: Production Entries
  - Trs_ProdEntry → embed Trs_ProdEntryQty, Trs_ProdEntry_SourceStageDtl

Step 4.7: Supplier Bills
  - Trs_Bills → embed Trs_BillAddded, Trs_BillRate

Step 4.8: Debit Notes
  - Trs_Deb1 → embed Trs_Deb2/3/4, Trs_DebAddDed

Step 4.9: Sales Invoices
  - Trs_SalInv → embed Trs_SalInvAddded

Step 4.10: Payments
  - PaymentMas → embed PaymentDtl

Step 4.11: All remaining transaction tables
  (General DCs, cutting, panel entries, job work, barcode, lab tests, etc.)
```

**Estimated time**: Hours (depends on transaction volume)

#### Phase 5: Requirements, Programming & Costing

```
Step 5.1: Pro_ReqYarn + Pro_ReqYarn2 → yarnRequirements
Step 5.2: Pro_ReqKnitt + Pro_ReqKnitt2 → fabricRequirements
Step 5.3: PRO_AccReq + AccJobReq + AccBudRate → accessoryRequirements
Step 5.4: BudPoMas + BudPodet → budgetPOs
Step 5.5: Budget + Budget_CostFix → budgets
Step 5.6: Bud_InhRateclw → budgetRates
Step 5.7: DailyUnit_P_And_L → dailyPnL
Step 5.8: Daily costing tables → dailyCostingEntries
Step 5.9: Expense tables → dailyExpenses, cashExpenses, fixedExpenses
```

#### Phase 6: Workflow, Meetings & Remaining

```
Step 6.1: WF_* tables → merge into users, workflowOperations, workflowDocuments
Step 6.2: App_* tables → approvals
Step 6.3: Meeting tables → meetings
Step 6.4: Supplier order tables → supplierOrders
```

#### Phase 7: Verification (see §7)

### 6.4 ETL Script Structure

```
migration/
├── config.js                    # SQL + MongoDB connection config
├── id-map.js                    # { legacyId → ObjectId } mapping store
├── utils/
│   ├── sql-reader.js            # Batched SQL SELECT with streaming
│   ├── mongo-writer.js          # Bulk write with error handling
│   ├── field-mapper.js          # Type conversion utilities
│   └── denormalizer.js          # Master data denormalization
├── phases/
│   ├── 01-masters.js
│   ├── 02-orders.js
│   ├── 03-stock.js
│   ├── 04-transactions.js
│   ├── 05-requirements.js
│   └── 06-workflow.js
├── verify/
│   ├── count-check.js           # Row count comparison
│   ├── balance-check.js         # Stock balance verification
│   ├── total-check.js           # Financial total verification
│   └── sample-check.js          # Random sample comparison
├── run-migration.js             # Orchestrator
└── rollback.js                  # Drop all MongoDB collections
```

### 6.5 Batch Processing Settings

| Parameter | Recommended Value |
|-----------|------------------|
| SQL read batch size | 1,000 rows |
| MongoDB bulk write batch | 500 documents |
| Header→detail join strategy | IN-clause with header ID batch (not individual lookups) |
| Parallel phase execution | Phases 1→2→3→4 sequential; within Phase 4, steps can run in parallel |
| Error handling | Log failed rows, continue migration, retry failed batch at end |
| ID mapping persistence | JSON files or temporary MongoDB collection |

### 6.6 Extraction SQL Templates

```sql
-- Master extraction (simple)
SELECT * FROM Mas_Buyer ORDER BY BuyerID

-- Header-detail extraction (batched)
-- Step 1: Get header batch
SELECT TOP 1000 * FROM Trs_Del1
WHERE ID > @lastProcessedId ORDER BY ID

-- Step 2: Get details for batch
SELECT * FROM Trs_Del2 WHERE ID IN (@headerIds)
SELECT * FROM Trs_Del3 WHERE ID IN (@headerIds)
SELECT * FROM Trs_Del4 WHERE DcID IN (@headerIds)

-- Stock with current balances (joined read)
SELECT s.*, cs.GodID, cs.Bg, cs.Kg, cs.Mt, cs.StyleNo
FROM StockTable s
LEFT JOIN CurrentStock cs ON s.StockID = cs.StockID
WHERE s.StockID > @lastProcessedId
ORDER BY s.StockID
```

---

## 7. Data Validation Checklist

### 7.1 Row Count Verification

| SQL Server Table | MongoDB Collection | Validation Query |
|-----------------|-------------------|------------------|
| `SELECT COUNT(*) FROM OrderMas` | `db.orders.countDocuments()` | Counts must match |
| `SELECT COUNT(*) FROM StockTable` | `db.stockItems.countDocuments()` | Counts must match |
| `SELECT COUNT(*) FROM Trs_Del1` | `db.deliveryChallans.countDocuments()` | Counts must match |
| `SELECT COUNT(*) FROM Trs_Grn1` | `db.goodsReceiptNotes.countDocuments()` | Counts must match |
| `SELECT COUNT(*) FROM Trs_ProdEntry` | `db.productionEntries.countDocuments()` | Counts must match |
| `SELECT COUNT(*) FROM Trs_Bills` | `db.supplierBills.countDocuments()` | Counts must match |
| `SELECT COUNT(*) FROM Trs_Pcs1` | `db.pieceDeliveryChallans.countDocuments()` | Counts must match |
| `SELECT COUNT(DISTINCT OrdId) FROM OrderStyleDtl` | `db.orders.countDocuments({"styles.0": {$exists: true}})` | Orders with styles |
| All Mas_* tables | Respective collections/sub-docs | Counts must match |

### 7.2 Embedded Document Count Verification

```javascript
// Verify child row counts match embedded array lengths
// SQL: SELECT ID, COUNT(*) as cnt FROM Trs_Del2 GROUP BY ID
// MongoDB:
db.deliveryChallans.aggregate([
  { $project: { legacyId: 1, lineCount: { $size: "$lines" } } }
])
// Compare SQL grouped counts with MongoDB lineCount
```

### 7.3 Financial Total Verification

| Check | SQL Query | MongoDB Aggregation | Tolerance |
|-------|-----------|-------------------|-----------|
| Total bill amounts | `SELECT SUM(billamt) FROM Trs_Bills WHERE Coycode=@c AND finyear=@fy` | `db.supplierBills.aggregate([{$match:{companyId,fiscalYear}},{$group:{_id:null,total:{$sum:"$billAmount"}}}])` | ±0.01 |
| Total delivery kgs | `SELECT SUM(delwgt) FROM Trs_Del1 WHERE Coycode=@c AND Finyear=@fy` | `db.deliveryChallans.aggregate(...)` | ±0.01 |
| Total GRN kgs | `SELECT SUM(RecKgs) FROM Trs_GRN2 t2 JOIN Trs_Grn1 t1 ON t2.ID=t1.ID WHERE t1.Coycode=@c` | Aggregation with unwind | ±0.01 |
| Current stock totals | `SELECT SUM(Kg) FROM CurrentStock` | `db.stockItems.aggregate([{$unwind:"$currentStock"},{$group:{_id:null,total:{$sum:"$currentStock.kgs"}}}])` | ±0.01 |
| Piece stock totals | `SELECT SUM(StockQty) FROM Pcs_StockTableQty` | Similar aggregation | Exact |
| Production piece totals | `SELECT SUM(ProdPcs) FROM Trs_ProdEntryQty` | Aggregation with unwind | Exact |

### 7.4 Referential Integrity Verification

```javascript
// Check all orderId references resolve
db.deliveryChallans.aggregate([
  { $lookup: { from: "orders", localField: "legacyOrdId", foreignField: "legacyOrdId", as: "order" } },
  { $match: { order: { $size: 0 }, legacyOrdId: { $ne: null } } },
  { $count: "orphaned" }
])
// Result should be 0 orphaned references

// Check all partyId references resolve
db.deliveryChallans.aggregate([
  { $lookup: { from: "parties", localField: "party._id", foreignField: "legacyPid", as: "partyDoc" } },
  { $match: { partyDoc: { $size: 0 }, "party._id": { $ne: null } } },
  { $count: "orphaned" }
])
```

### 7.5 Random Sample Verification

1. Pick 10 random orders from SQL; verify every field matches in MongoDB
2. Pick 10 random DCs; verify header fields + line count + line amounts
3. Pick 10 random stock items; verify current stock kgs/meters match
4. Pick 5 random bills; verify bill amount, GST breakdown, and rate details
5. Pick 5 random production entries; verify quantities per size

### 7.6 Business Logic Spot Checks

| Check | Method |
|-------|--------|
| Cumulative bill rate matches | Pick 5 orders; compute cumulative rate manually from bill rates; compare |
| Stock ledger balance | Pick 5 stock items; replay all transactions (deliveries, GRNs, adjustments); verify current stock matches |
| Party balance | Pick 3 parties; compute balance from bills, payments, debit notes; compare |
| Order completion status | Verify orders marked as completed have production quantities ≥ order quantities |

### 7.7 Post-Migration Smoke Tests

| Test | Description |
|------|-------------|
| Order listing | List all orders for a company/fiscal year; compare count and first 10 records |
| Stock register | Generate stock register output; compare totals and item counts |
| Delivery register | Query DCs for a date range; compare |
| Bill register | Query bills for a fiscal year; compare amounts |
| Piece stock | Query piece stock for an order; compare color/size quantities |

---

## 8. Foreign Key Constraints — Application-Level Enforcement

MongoDB does not enforce foreign keys at the database level. The following constraints must be enforced in the Node.js/Express application layer:

### 8.1 Critical References (Must Validate on Every Write)

| Source Collection | Field | Target Collection | Enforcement |
|-------------------|-------|-------------------|-------------|
| All transactions | `companyId` | `companies` | Middleware validates company exists and user has access |
| `orders` | `buyer._id` | `buyers` | Validate on order creation/update |
| `orders` | `season._id` | `masterData` (seasons) | Validate on order creation |
| `deliveryChallans` | `party._id` | `parties` | Validate on DC creation |
| `deliveryChallans` | `lines[].stockId` | `stockItems` | Validate stock item exists |
| `deliveryChallans` | `lines[].orderId` | `orders` | Validate order exists and is open |
| `goodsReceiptNotes` | `party._id` | `parties` | Validate on GRN creation |
| `purchaseOrders` | `lines[].orderId` | `orders` | Validate order exists |
| `supplierBills` | `party._id` | `parties` | Validate party exists |
| `productionEntries` | `orderId` | `orders` | Validate order exists |
| `stockItems` | `orderId` | `orders` | Validate on stock item creation |

### 8.2 Delete Protection Rules

| Collection | Delete Rule | Reason |
|------------|------------|--------|
| `companies` | Block if any transactions reference it | Data integrity |
| `buyers` | Block if open orders reference it | Active business relationships |
| `parties` | Block if open DCs/GRNs/bills reference it | Active business relationships |
| `departments` | Block if stock items or transactions reference it | Structural dependency |
| `orders` | Block if any transactions (DCs, GRNs, bills, production) exist | Cascade too complex |
| `stockItems` | Block if `currentStock` has non-zero balances | Would create inventory discrepancy |

### 8.3 Cascade Update Rules

| Master Change | Affected Collections | Update Strategy |
|--------------|---------------------|-----------------|
| Buyer name change | `orders`, `deliveryChallans`, etc. (denormalized `buyer.name`) | Async bulk update via job queue |
| Party name change | All transaction collections with `party.name` | Async bulk update |
| Department name change | `stockItems`, `deliveryChallans`, etc. | Async bulk update |
| Style number rename | `orders.*`, all related transactions | Use `SP_StyleChange` equivalent — bulk update all collections in a transaction |

### 8.4 Application Middleware Pattern

```javascript
// Pre-save hook for delivery challans
deliveryChallanSchema.pre('save', async function(next) {
  // Validate company
  const company = await Company.findById(this.companyId);
  if (!company) throw new Error('Invalid company');

  // Validate party
  if (this.party?._id) {
    const party = await Party.findById(this.party._id);
    if (!party) throw new Error('Invalid party');
    this.party.name = party.name;  // denormalize
  }

  // Validate order references in lines
  const orderIds = [...new Set(this.lines.map(l => l.orderId).filter(Boolean))];
  const orderCount = await Order.countDocuments({ _id: { $in: orderIds } });
  if (orderCount !== orderIds.length) throw new Error('Invalid order reference in lines');

  next();
});
```

---

## 9. Estimated Data Volumes & Migration Approach

### 9.1 Volume Estimates by Customer Size

| Customer Size | Orders | Stock Items | DCs | GRNs | Production Entries | Bills | Total Rows | Est. MongoDB Size |
|--------------|--------|-------------|-----|------|-------------------|-------|------------|------------------|
| **Small** (1 unit, 2 yrs) | 500 | 5,000 | 3,000 | 2,000 | 20,000 | 1,000 | ~100K | 200 MB |
| **Medium** (3 units, 5 yrs) | 5,000 | 50,000 | 30,000 | 20,000 | 200,000 | 10,000 | ~1M | 2 GB |
| **Large** (10 units, 10 yrs) | 20,000 | 200,000 | 150,000 | 100,000 | 1,000,000 | 50,000 | ~5M | 10 GB |

### 9.2 Migration Approach: Phased (Recommended)

Given the typical customer size and the need for validation, a **phased migration** is recommended over big-bang:

| Phase | What | When | Rollback Possible? |
|-------|------|------|-------------------|
| **Phase A: Parallel Run Setup** | Migrate all data to MongoDB. Run MERN app in read-only mode alongside legacy FiberPro | Week 1–2 | Yes: just discard MongoDB |
| **Phase B: Validation** | Users verify data in MERN app (reports, registers, stock balances). Fix any discrepancies | Week 3–4 | Yes: re-run migration |
| **Phase C: Cut-over** | Stop legacy FiberPro writes. Run final delta migration (transactions created during Phase A-B). Switch to MERN app | Day 1 of cutover weekend | Partial: legacy DB still intact |
| **Phase D: Decommission** | Keep legacy SQL Server DB as read-only archive for 6 months. Then decommission | Month 6 | N/A |

### 9.3 Delta Migration Strategy

During the parallel run period (Phases A-B), new transactions are created in the legacy system. These must be migrated before cutover:

```
1. Record max(ID) for each header table at Phase A start → @maxIdAtStart
2. At cutover, read all rows WHERE ID > @maxIdAtStart
3. Run incremental migration (same ETL scripts, filtered by ID range)
4. Verify delta counts
```

### 9.4 Downtime Estimate

| Customer Size | Full Migration | Delta Migration | Total Cutover Downtime |
|--------------|---------------|-----------------|----------------------|
| Small | 15–30 min | 5 min | < 1 hour |
| Medium | 1–3 hours | 15–30 min | < 4 hours |
| Large | 4–8 hours | 30–60 min | < 12 hours (weekend) |

### 9.5 Rollback Plan

1. **Before cutover**: Simply drop all MongoDB collections and re-run full migration
2. **After cutover (within 24 hours)**: If critical issues found, revert to legacy FiberPro. Delta transactions in MERN must be manually reconciled into SQL Server
3. **After 24 hours**: Rolling back becomes expensive. Fix forward in MERN app

### 9.6 Performance Considerations

| Concern | Mitigation |
|---------|-----------|
| Large orders with many styles/colors | Monitor document size; max 16MB. An order with 100 styles × 50 colors × 20 sizes = 100,000 qty subdocs (~3MB) — fits comfortably |
| Stock register queries (aggregation over 200K items) | Create materialized views or cache in Redis for frequently accessed registers |
| Party balance calculation (sum across many transaction types) | Pre-compute nightly; or use MongoDB change streams to maintain running totals |
| Report generation speed | Use read replicas; pre-compute heavy reports as scheduled jobs |

---

## Appendix A — Transaction Type Code Mapping

### A.1 Trs_Del1.TrType → MongoDB Enum

| TrType | Legacy Description | MongoDB `transactionType` Value |
|--------|-------------------|-------------------------------|
| 1 | Process Issue | `"processIssue"` |
| 2 | Sales Delivery | `"salesDelivery"` |
| 3 | Transfer (inter-order) | `"interOrderTransfer"` |
| 4 | Purchase Return | `"purchaseReturn"` |
| 5 | Stock Adjustment | `"stockAdjustment"` |
| 6 | Accessories Purchase Return | `"accPurchaseReturn"` |
| 7 | Accessories Issue | `"accIssue"` |
| 8 | Unit Transfer (Accessories) | `"accUnitTransfer"` |
| 10 | Accessories Process Issue | `"accProcessIssue"` |
| 11 | DirectReceipt Return | `"directReceiptReturn"` |
| 12 | Acc DirectReceipt Return | `"accDirectReceiptReturn"` |
| 13 | Party Rejection Return | `"partyRejectionReturn"` |
| 14 | Godown Transfer | `"godownTransfer"` |
| 15 | Godown Transfer (Accessories) | `"accGodownTransfer"` |
| 17 | Cutting Issue | `"cuttingIssue"` |
| 20 | Ready-to-Cut | `"readyToCut"` |
| -2 | Unit DC (internal) | `"unitDcInternal"` |

### A.2 Trs_Grn1.GRNType → MongoDB Enum

| GRNType | MongoDB `grnType` Value |
|---------|------------------------|
| `'Purchase'` | `"purchase"` |
| `'Process'` | `"processReceipt"` |
| `'Process Return'` | `"processReturn"` |
| `'Sales Return'` | `"salesReturn"` |
| `'DirectReceipt'` | `"directReceipt"` |
| `'FabricRetToUnit'` | `"fabricReturnToUnit"` |

### A.3 Trs_Pcs1.DelType → MongoDB Enum

| DelType | MongoDB `deliveryType` Value |
|---------|------------------------------|
| `'Process'` | `"process"` |
| `'Despatch'` | `"despatch"` |
| `'Unit Transfer'` | `"unitTransfer"` |
| `'Ship Sample'` | `"shipSample"` |
| `'ReProcess'` | `"reprocess"` |

### A.4 PaymentMas.ReserveFlg → MongoDB Enum

| Flag | MongoDB `paymentType` Value |
|------|----------------------------|
| `'P'` | `"payment"` |
| `'V'` | `"advance"` |
| `'C'` | `"creditNote"` |
| `'R'` | `"reserve"` |
| `'T'` | `"others"` |
| `'D'` | `"debitNote"` |

### A.5 StockTable.YF → MongoDB Enum

| YF | MongoDB `materialType` Value |
|----|------------------------------|
| `'Y'` | `"yarn"` |
| `'F'` | `"fabric"` |
| `'A'` | `"accessory"` |
| `'G'` | `"general"` |

---

## Appendix B — Trigger-Maintained Fields to Precompute

These fields were automatically maintained by SQL Server triggers. In MongoDB, the MERN application must compute them explicitly:

| Trigger | What It Maintained | MERN Implementation |
|---------|-------------------|-------------------|
| `Tgr_StockRatePost` | Cumulative bill rates cascading through department chain | On bill save: recalculate `cumBillRate` for all subsequent departments in `stockRates` collection |
| `TRG_FAB_BALANCE_DEL` | Fabric program balance on delivery | After DC save: update fabric balance via aggregation or increment operation |
| `TRG_FAB_BALANCE_GRN` | Fabric program balance on receipt | After GRN save: update fabric balance |
| `TRG_FAB_BALANCE_RTC` | Fabric balance on ready-to-cut | After RTC save: update fabric balance |
| `TRG_YARN_BALANCE_DEL` | Yarn program balance on delivery | After DC save: update yarn balance |
| `TRG_YARN_BALANCE_GRN` | Yarn program balance on receipt | After GRN save: update yarn balance |
| `Trg_ST_PartyBalance_Abs_Update` | Party balance abstract on bill changes | After bill/payment save: recompute party running balance |
| `Trg_ST_Acc_PartyBal_Abs_Update` | Accessories party balance | Same pattern |
| `Trg_ST_Acc_Prog_Balance_Update` | Accessories program balance | Same pattern |
| `Trg_ST_Production_Data_*` | Cumulative production data | After production entry save: increment `ST_Production_Data` equivalent or use `$inc` |
| `Trg_CurrentStock_Update` | CurrentStock replication flag | Not needed — handled by MongoDB change streams if needed |
| 40× `UpdateFlg` triggers | Server replication flag | Not needed — MongoDB replica sets handle replication natively |

### Implementation Pattern for Balance Maintenance

```javascript
// After saving a delivery challan, update fabric program balance
async function updateFabricBalance(dc) {
  for (const line of dc.lines) {
    await FabricBalance.findOneAndUpdate(
      {
        companyId: dc.companyId,
        orderId: line.orderId,
        deptId: dc.processDept._id,
        stockId: line.stockId
      },
      {
        $inc: { deliveredKgs: line.kgs, deliveredBags: line.bags }
      },
      { upsert: true }
    );
  }
}
```

---

*End of Data Transfer Strategy Document*
