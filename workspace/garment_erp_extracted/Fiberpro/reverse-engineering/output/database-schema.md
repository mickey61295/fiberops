# FiberPro ERP — Complete Database Schema Documentation

> **Generated**: 2026-03-15
> **Source**: ~240 stored procedures (SPQuery/), 4 functions (SPFunction/), ~60 triggers (SPTriggers/), ~16 views (SPTriggers/SPViews/), 10 report code-behind files (Report/*.cs)
> **Database Engine**: Microsoft SQL Server
> **Databases**: Main ERP (e.g. `Fiberpro_baalaji`), `GsMail` (mail system), `ProductionDB` (production data)

---

## Table of Contents

1. [Database Architecture Overview](#1-database-architecture-overview)
2. [Master Tables (Mas\_\*)](#2-master-tables)
3. [Order Tables (Order\*)](#3-order-tables)
4. [Stock Tables](#4-stock-tables)
5. [Transaction Tables — Delivery (Trs\_Del\*)](#5-transaction-tables--delivery)
6. [Transaction Tables — GRN (Trs\_Grn\*)](#6-transaction-tables--grn)
7. [Transaction Tables — Multi-Process GRN](#7-transaction-tables--multi-process-grn)
8. [Transaction Tables — Purchase Order (Trs\_Po\*)](#8-transaction-tables--purchase-order)
9. [Transaction Tables — Pieces (Trs\_Pcs\*)](#9-transaction-tables--pieces)
10. [Transaction Tables — Production (Trs\_Prod\*)](#10-transaction-tables--production)
11. [Transaction Tables — Bills & Invoices](#11-transaction-tables--bills--invoices)
12. [Transaction Tables — Debit Notes](#12-transaction-tables--debit-notes)
13. [Transaction Tables — General DC & GRN](#13-transaction-tables--general-dc--grn)
14. [Costing, Budget & P&L Tables](#14-costing-budget--pl-tables)
15. [Programming & Requirement Tables (Pro\_\*)](#15-programming--requirement-tables)
16. [Program Planning Tables (Prog\_\*)](#16-program-planning-tables)
17. [Summary/Posting Tables (ST\_\*)](#17-summaryposting-tables)
18. [Supplier Order Tables](#18-supplier-order-tables)
19. [Cutting & Panel Tables](#19-cutting--panel-tables)
20. [Payment & Wages Tables](#20-payment--wages-tables)
21. [Daily Costing & Expense Tables](#21-daily-costing--expense-tables)
22. [Shipping & Sales Invoice Tables](#22-shipping--sales-invoice-tables)
23. [Job Work Tables](#23-job-work-tables)
24. [Barcode & Bundle Tables](#24-barcode--bundle-tables)
25. [Lab Test & Quality Tables](#25-lab-test--quality-tables)
26. [Workflow & Approval Tables](#26-workflow--approval-tables)
27. [WBS & Meeting Tables](#27-wbs--meeting-tables)
28. [Configuration & System Tables](#28-configuration--system-tables)
29. [BI & Temporary Reporting Tables](#29-bi--temporary-reporting-tables)
30. [Views](#30-views)
31. [Key Relationships & ER Diagram Notes](#31-key-relationships--er-diagram-notes)
32. [Transaction Type Codes Reference](#32-transaction-type-codes-reference)

---

## 1. Database Architecture Overview

### Multi-Database Design

From `Fiberpro.exe.config`:

| Database | Purpose | Config Key |
|----------|---------|------------|
| Main ERP DB (e.g. `Fiberpro_baalaji`) | All master data, transactions, stock | `connectstring` |
| `GsMail` | Email/notification system | `connectstring1` |
| Production DB (e.g. `testAslam`) | Production-specific data (may share tables) | `ProductionDB` |

### Multi-Company Architecture

- **Mas_Exporter** serves as the company/unit table (`ExpID` = company code, aka `Coycode`)
- Nearly every transaction table has a `Coycode` column for multi-company isolation
- `Options` table stores system-wide settings per installation
- `FinanceYear` manages fiscal year periods

### Naming Conventions

| Prefix | Meaning | Example |
|--------|---------|---------|
| `Mas_` | Master/reference data | `Mas_Buyer`, `Mas_Party` |
| `Trs_` | Transaction records | `Trs_Del1`, `Trs_Grn1` |
| `Pro_` | Programming/requirement planning | `Pro_ReqKnitt2` |
| `Prog_` | Program/order planning | `Prog_ClrComb` |
| `ST_` | Summary/posting tables (denormalized) | `ST_Production_Data` |
| `Vue_` | Views (used like tables in JOINs) | `Vue_StkLedger` |
| `Temp_` / `Tmp_` | Temporary working tables | `Temp_StkReports` |
| `BI_` | Business Intelligence reporting | `BI_ACCSTOCK` |
| `WBS_` | Work Breakdown Structure (production) | `Wbs_Production` |
| `Pay_` | Barcode/bundle production system | `Pay_BarcodeGeneration` |
| `Bud_` | Budget data | `Bud_InhRateclw` |
| `App_` | Approval system | `App_ApprovalDc` |
| `Wf_` / `WF_` | Workflow system | `WF_UserMas` |

### Header-Detail Pattern

Most transactions follow a header-detail (1:N) pattern using auto-increment `ID`:
- Header table: `Trs_XXX1` (ID PK, date, party, doc number, etc.)
- Detail table: `Trs_XXX2` (ID FK → header, line items)
- Additional detail: `Trs_XXX3`, `Trs_XXX4` (further breakdowns)

---

## 2. Master Tables

### Mas_Buyer — Buyer/Customer Master
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| BuyerID | INT (PK) | Buyer identifier |
| BuyerName | VARCHAR | Buyer/customer name |
| Stateid | INT (FK → Mas_State) | State for GST determination |
| UpdateFlg | BIT | Sync flag for multi-server replication |
| server_id | INT | Server identifier for replication |

### Mas_Party — Party/Supplier Master
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| PID | INT (PK) | Party identifier |
| Pname | VARCHAR | Party/supplier name |
| Paddress | VARCHAR | Address |
| Phone | VARCHAR | Phone number |
| TIN | VARCHAR | Tax Identification Number |
| CST | VARCHAR | Central Sales Tax number |
| GSTNo | VARCHAR | GST registration number |
| PAN | VARCHAR | PAN number |
| Stateid | INT (FK → Mas_State) | State for GST interstate logic |
| UpdateFlg | BIT | Sync flag |
| server_id | INT | Server ID |

### Mas_Exporter — Company/Unit Master
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| ExpID | INT (PK) | Company/unit identifier (= Coycode in transactions) |
| ExporterName | VARCHAR | Company/unit name |
| ExporterAddress | VARCHAR | Address |
| Phone | VARCHAR | Phone |
| TIN | VARCHAR | TIN |
| CST | VARCHAR | CST |
| PAN | VARCHAR | PAN |
| GSTNo | VARCHAR | GST number |
| Stateid | INT (FK → Mas_State) | State |
| IoNoCaption | VARCHAR | I/O number caption |

### Mas_Fabric — Fabric Type Master
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| FabID | INT (PK) | Fabric type identifier |
| Fabdesc | VARCHAR | Fabric description |
| PriUomID | INT (FK → Mas_Uom) | Primary unit of measure |
| BrandedFlag | CHAR(1) | 'Y'/'N' — branded fabric for GST rate determination |
| HSNID | INT (FK → Mas_HSN) | HSN code for GST |
| UpdateFlg | BIT | Sync flag |
| server_id | INT | Server ID |

### Mas_Color — Color Master
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| ColID | INT (PK) | Color identifier |
| ColorDesc | VARCHAR | Color description |
| UpdateFlg | BIT | Sync flag |
| server_id | INT | Server ID |

### Mas_Count — Yarn Count Master
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| CountID | INT (PK) | Count identifier |
| CountName | VARCHAR | Count description (e.g. "30s", "40s") |
| CountGrpid | INT (FK → Mas_YarncountGroups) | Yarn count group |
| UpdateFlg | BIT | Sync flag |

### Mas_Dept — Department/Process Master
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| DeptID | INT (PK) | Department identifier |
| Deptname | VARCHAR | Department name |
| OutputType | CHAR(1) | 'Y'=Yarn output, 'F'=Fabric output |
| InputType | CHAR(1) | 'Y'=Yarn input, 'F'=Fabric input |
| DCFormat | VARCHAR | DC print format |
| ProgReqPrn | CHAR(1) | 'Y'/'N' — program requirement printing |
| RecMethod | CHAR(1) | 'D'=DC-based receipt, 'O'=Order-based |
| Grp | INT (FK → Mas_Grp) | Department group |
| SemiFinish | CHAR(1) | 'S'=Semi-finished, 'F'=Finished |
| DeptType | CHAR(1) | 'G'=General |
| ProgFrm_Issue | CHAR(1) | 'Y'/'N' — program from issue |
| DC_TermCode | INT (FK → Mas_Terms) | DC terms reference |
| DeptGrpCode | INT | Department group code (e.g., 4=Knitting group) |
| AccProsDept | CHAR(1) | 'Y'/'N' — accessories process department |
| OrderSno | INT | Display sort order in reports |

### Mas_Dia — Diameter Master
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| DiaID | INT (PK) | Diameter identifier |
| Dia | VARCHAR | Diameter value |

### Mas_Size — Size Master
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| SizeID | INT (PK) | Size identifier |
| SizeDesc | VARCHAR | Size description (e.g. "S", "M", "L", "XL") |

### Mas_Acc — Accessories Type Master
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| ID | INT (PK) | Accessories type identifier |
| Acc_Descr | VARCHAR | Type description |
| catID | INT (FK → Mas_AccCategory) | Category |
| UomId | INT (FK → Mas_Uom) | Unit of measure |

### Mas_AccDes — Accessories Description Master
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| ID | INT (PK) | Description identifier |
| AccTypeID | INT (FK → Mas_Acc) | Parent accessories type |
| AccDescription | VARCHAR | Specific description |

### Mas_AccCategory — Accessories Category
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| CatID | INT (PK) | Category identifier |

### Mas_Emp — Employee Master
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| ID | INT (PK) | Employee identifier |
| EmpName | VARCHAR | Employee name |

### Mas_Godown — Godown/Warehouse Master
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| GodID | INT (PK) | Godown identifier |
| GodName | VARCHAR | Godown name |

### Mas_JobWrkComp — Work Nature/Job Work Component
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| Id | INT (PK) | Work nature/stage identifier |
| DeptId | INT (FK → Mas_Dept) | Linked department |
| WorkComplDet | VARCHAR | Work completion detail (e.g. "Cutting", "Stitching") |
| PcsType | VARCHAR | 'Piece' or 'Panel' |

### Mas_Part — Part Master
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| PartID | INT (PK) | Part identifier (e.g. front, back, sleeve) |
| PartName | VARCHAR | Part name |

### Mas_Mill — Mill/Supplier Factory
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| MillID | INT (PK) | Mill identifier |
| ShortMill | VARCHAR | Short name |
| Mill | VARCHAR | Full mill name |

### Mas_HSN — HSN Code Master (for GST)
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| ID | INT (PK) | HSN record ID |
| HSNCode | VARCHAR | HSN code |
| UnitRate | NUMERIC | Unit rate |
| BPercL | NUMERIC | Branded % (low slab) |
| NBPercL | NUMERIC | Non-branded % (low slab) |
| BPercH | NUMERIC | Branded % (high slab) |
| NBPercH | NUMERIC | Non-branded % (high slab) |

### Mas_HSNPce — HSN Code for Piece Goods
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| (Similar structure to Mas_HSN but for piece/garment goods) | | |

### Other Master Tables

| Table | PK | Key Columns | Purpose |
|-------|----|-------------|---------|
| **Mas_AddDed** | AddDedCode | AddDedName | Bill additions/deductions (SGST, CGST, IGST, etc.) |
| **Mas_Bank** | (ID) | — | Bank master |
| **Mas_Bitsize** | (ID) | — | Bit/panel size definitions |
| **Mas_Brand** | (ID) | — | Brand master |
| **Mas_BuyerDept** | (ID) | — | Buyer department mapping |
| **Mas_Commercial** | (ID) | — | Commercial terms |
| **Mas_Component** | CompID | CompDescr | Component master |
| **Mas_Design** | DesignId | DesignDesc | Print/fabric design |
| **Mas_Expenses** | ExpId | Exp_Level, ShiftWageExp | Expense categories |
| **Mas_FabricGroup** | (ID) | — | Fabric grouping |
| **Mas_Fcy** | (ID) | — | Foreign currency |
| **Mas_Grp** | GrpNo | DcPre | Department group with DC prefix |
| **Mas_LabTestParameters** | (ID) | — | Lab test parameter definitions |
| **Mas_LabTestStages** | (ID) | — | Lab test stage definitions |
| **Mas_Lot** | LotId | LotName | Lot master |
| **Mas_Merchandiser** | (ID) | — | Merchandiser master |
| **Mas_Panel** | PanelID | PanelName | Panel/garment part |
| **Mas_RejectionType** | (ID) | — | Rejection type definitions |
| **Mas_SalesGrp** | (ID) | — | Sales grouping |
| **Mas_Season** | SeasID | SeasDesc | Season master |
| **Mas_SizeGroup** | (ID) | — | Size grouping |
| **Mas_State** | (ID) | — | State master (for GST) |
| **Mas_StockReportGroup** | (ID) | — | Stock report grouping |
| **Mas_StyleDesc** | StyleID | StyleDesc | Style description |
| **Mas_StyleGroup** | (ID) | — | Style grouping |
| **Mas_StyleNo** | (ID) | — | Style number catalog |
| **Mas_SubProcess** | ID | SubProcess | Sub-process within a department |
| **Mas_TemplateAllocate** | (ID) | — | Template allocation for budgets |
| **Mas_Terms** | ID | Terms | Terms & conditions text |
| **Mas_UOM** | UomID | Uom | Unit of measure ('KGS', 'MTR', 'PCS', etc.) |
| **Mas_User** | (ID) | Username | Application users |
| **Mas_Vehicle** | Code | VName | Vehicle master |
| **Mas_Voucher_PaymentType** | ID | TypeDesc | Payment types |
| **Mas_YarncountGroups** | ID | Groupname | Yarn count grouping |

---

## 3. Order Tables

### OrderMas — Order Master (Central Entity)
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| OrdId | INT (PK) | Order identifier (auto-increment) |
| Jobno | INT | Job order number (0 = general/no order) |
| Finyear | VARCHAR | Financial year (e.g. "24-25") |
| BuyOrdNo | VARCHAR | Buyer's order number |
| BuyerID | INT (FK → Mas_Buyer) | Buyer |
| Season | INT (FK → Mas_Season) | Season |
| Completed | INT | 0=Open, 1=Completed |
| OrderType | VARCHAR | 'Order', 'Sample', 'Trading', etc. |

### OrderMas2 — Order Master Extension
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| (Additional order fields extending OrderMas) | | |

### OrderStyleDtl — Order Style Detail
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| OrdID | INT (FK → OrderMas) | Order |
| StyleNo | VARCHAR | Style number within order |
| EntryOption | INT | 1=individual entry, 2=pack/ratio entry |

### OrderQtyDtl — Order Quantity Detail (Size/Color/Part breakdown)
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| Ordid | INT (FK → OrderMas) | Order |
| StyleNo | VARCHAR | Style |
| PartId | INT (FK → Mas_Part) | Part |
| ColId | INT (FK → Mas_Color) | Color |
| SizeId | INT (FK → Mas_Size) | Size |
| CmbClrID | INT | Combo color ID |
| OrderQty | INT | Ordered quantity |
| PcsPerColor | INT | Pieces per color (for pack orders) |
| LotNo | VARCHAR | Lot number reference |

### OrdSizeMas — Order Size Sequence
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| OrdID | INT (FK → OrderMas) | Order |
| SizeID | INT (FK → Mas_Size) | Size |
| SNo | INT | Display sequence number |
| StyleNo | VARCHAR | Style |

### Other Order Tables

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| **OrderQtyDtl_Amend** | Same as OrderQtyDtl | Amended quantities (order amendments) |
| **OrdQtyClrDtl** | Ordid, StyleNo, ColId | Color-wise quantity detail |
| **OrdQtyClrDtl_Amend** | Same | Amended color quantities |
| **OrderStyleImage** | OrdID, StyleNo | Style images |
| **OrderStyleImageAcc** | OrdID, StyleNo | Accessories images per style |
| **OrderStyleImgDtl** | OrdID, StyleNo | Image detail records |
| **OrderStylewiseCost** | OrdId, StyleNo | Style-wise costing summary |
| **OrderStylewiseCost_Grp** | OrdId, GrpID | Group-wise costing (GRNKGS, GRNBASEDVALUE) |
| **OrderProgQty** | OrdID | Programmed quantities |
| **Order_PartDtl** | OrdID, PartID | Part detail per order |
| **Order_Addl_color** | OrdID | Additional colors beyond base |
| **Order_Addl_color_CompDet** | OrdID | Additional color component detail |
| **Order_Addl_Lot** | OrdID | Additional lots |
| **Order_Addl_RatioDtl** | OrdID | Pack-order ratio detail |
| **Order_Addl_Size** | OrdID | Additional sizes |
| **OrderAccImgDtl** | OrdID | Accessories image detail |
| **OrderLotRateDtl** | OrdID | Lot rate detail |
| **OrdProgPcsWgt** | OrdID | Progress pieces weight |
| **EnquiryDet** | (ID) | Order enquiry detail |
| **Ord_GramDtl** | OrdID | Grammage detail per order |
| **OrdSeq** | OrdId | Order process sequence |

---

## 4. Stock Tables

### StockTable — Master Stock Item Definition (Central Table)
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| StockID | INT (PK) | Unique stock item identifier |
| OrdID | INT (FK → OrderMas) | Order reference |
| Dept | INT (FK → Mas_Dept) | Department where stock resides |
| YF | CHAR(1) | **'Y'**=Yarn, **'F'**=Fabric, **'A'**=Accessories, **'G'**=General |
| CntID | INT (FK → Mas_Count) | Yarn count |
| ColID | INT (FK → Mas_Color) | Color |
| FabID | INT (FK → Mas_Fabric) | Fabric type |
| DiaID | INT (FK → Mas_Dia) | Diameter (greige) |
| FinDiaID | INT (FK → Mas_Dia) | Finished diameter |
| Gsm | NUMERIC | GSM (grams per square meter — greige) |
| FinGsm | NUMERIC | Finished GSM |
| GG | NUMERIC | Gauge |
| ll | VARCHAR | LL (loop length) |
| MillID | INT (FK → Mas_Mill) | Mill/origin |
| LotNo | VARCHAR | Lot number |
| Atype | INT (FK → Mas_Acc) | Accessories type (when YF='A') |
| Ades | INT (FK → Mas_AccDes) | Accessories description |
| Siz | INT (FK → Mas_Size) | Size (for accessories) |
| PartID | INT (FK → Mas_Part) | Part |
| CompID | INT (FK → Mas_Component) | Component |
| Rate | NUMERIC | Stock rate/valuation |
| PRINT_DESIGNID | INT (FK → Mas_Design) | Print/design |
| PrgKnitGsm | NUMERIC | Programmed knitting GSM |
| PrgKnitDiaId | INT (FK → Mas_Dia) | Programmed knitting diameter |
| CmbClrId | INT (FK → Mas_Color) | Combo color |
| SubPrsID | INT (FK → Mas_SubProcess) | Sub-process |
| Coycode | INT (FK → Mas_Exporter) | Company code |

### CurrentStock — Current Stock Position (Running Balances)
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| StockID | INT (FK → StockTable) | Stock item |
| OrdID | INT (FK → OrderMas) | Order |
| GodID | INT (FK → Mas_Godown) | Godown/warehouse |
| Bg | NUMERIC | Bags/rolls balance |
| Kg | NUMERIC | Kilogram balance |
| Mt | NUMERIC | Meter balance |
| StyleNo | VARCHAR | Style number |
| UpdateFlg | BIT | Sync flag |

### Pcs_StockTable — Piece/Garment Stock Definition
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| PcsStockId | INT (PK) | Piece stock identifier |
| Coycode | INT (FK → Mas_Exporter) | Company |
| Ordid | INT (FK → OrderMas) | Order |
| StyleNo | VARCHAR | Style |
| StageId | INT (FK → Mas_JobWrkComp) | Current production stage |
| PartId | INT (FK → Mas_Part) | Part |
| SeqNo | INT | Sequence number |
| GodId | INT (FK → Mas_Godown) | Godown |
| PartyId | INT | Party (0=in-house) |
| LotId | INT (FK → Mas_Lot) | Lot |
| EmpID | INT (FK → Mas_Emp) | Employee (0=not employee-specific) |
| PcsType | VARCHAR | 'Piece' or 'Panel' |

### Pcs_StockTableQty — Piece Stock Quantities
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| PcsStockId | INT (FK → Pcs_StockTable) | Parent stock record |
| ColID | INT (FK → Mas_Color) | Color |
| SizeId | INT (FK → Mas_Size) | Size |
| StockQty | INT | Current stock quantity |
| ProductionQty | INT | Cumulative production quantity |
| GoodPcsFlag | CHAR(1) | 'G'=Good, 'M'=Mending/rework |
| RejectionTypeId | INT | 0=none, else → Mas_RejectionType |

### Other Stock Tables

| Table | Purpose |
|-------|---------|
| **CurrentStock_RollDtl** | Roll-level detail for current stock |
| **Panel_StockTable** | Panel stock definitions |
| **Panel_StockTableQty** | Panel stock quantities |
| **Pcs_RejStockTable** | Rejected pieces stock |
| **SuppPcs_StockTable** | Supplier-held piece stock |
| **SuppPcs_StockTableQty** | Supplier piece stock quantities |
| **SupplierStock** | Supplier stock register |
| **StockRatePost** | Cumulative bill rate posting per dept (OrdId, DeptId, Sno, CntId, ColId, FabId, Billrate, Procrate, CumBillrate) |
| **StockRate** | Stock valuation rate |
| **PcsStockRatePost** | Piece stock rate posting |
| **PcsStockRatePost_All** | All piece stock rate data |
| **PcsStockValue** | Piece stock valuation |

---

## 5. Transaction Tables — Delivery (Trs_Del\*)

### Trs_Del1 — Delivery Challan Header
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| ID | INT (PK) | DC identifier |
| DocNo | INT | Document number |
| DcPre | VARCHAR | DC prefix |
| Finyear | VARCHAR | Financial year |
| Dt | DATETIME | DC date |
| TrType | INT | Transaction type (see §32) |
| Prs_Dept | INT (FK → Mas_Dept) | Process department |
| Party | INT (FK → Mas_Party) | Party/supplier |
| Buyer | INT (FK → Mas_Buyer) | Buyer (for sales DCs) |
| PartyUnit | CHAR(1) | 'P'=Party, 'U'=Unit |
| Coycode | INT (FK → Mas_Exporter) | Company |
| ProcessType | CHAR(1) | 'P'=Process, 'R'=Re-process |
| ReprocessType | CHAR(1) | Reprocess indicator |
| OurGRNID | INT (FK → Trs_Grn1) | Linked GRN |
| VehicleCode | INT (FK → Mas_Vehicle) | Vehicle |
| GPNo | INT | Gate pass number |
| GodID | INT (FK → Mas_Godown) | Source godown |
| delwgt | NUMERIC | Total delivery weight |
| Clos | VARCHAR | 'Yes'/'No' — closed status |
| TOTRECKGS | NUMERIC | Total received kgs (for closed DCs) |
| TOTBudAmt | NUMERIC | Total budget amount |
| remark | VARCHAR | Remarks |
| TarDt | DATETIME | Target date |
| LotNo | VARCHAR | Lot number |
| DESIGNID | INT (FK → Mas_Design) | Design |
| EwayBillNo | VARCHAR | E-Way Bill number |
| EwayBillDt | DATETIME | E-Way Bill date |
| ToCoyCode | INT | Destination company (unit transfer) |
| Delivery_To_Flg | VARCHAR | 'Party'/'Buyer' |
| PrdID | INT | Production reference |
| DyeColID | INT (FK → Mas_Color) | Dye color |

### Trs_Del2 — Delivery Challan Lines
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| ID | INT (FK → Trs_Del1) | Header reference |
| StockID | INT (FK → StockTable) | Stock item |
| OrdId | INT (FK → OrderMas) | Order |
| StyleNo | VARCHAR | Style |
| BgRl | NUMERIC | Bags/rolls delivered |
| Kg | NUMERIC | Kilograms delivered |
| mtr | NUMERIC | Meters delivered |
| Rate | NUMERIC | Rate |
| RateUomId | INT (FK → Mas_Uom) | Rate UOM |
| TranOrdID | INT | Transfer target order |
| TranStyleNo | VARCHAR | Transfer target style |
| Tranid | INT | Transfer target stock ID |
| StockAddLess | VARCHAR | 'Add'/'Less' (for stock adjustment) |
| Arl | NUMERIC | Acknowledged rolls |
| AKg | NUMERIC | Acknowledged kgs |
| AMtr | NUMERIC | Acknowledged meters |
| AID | INT | Acknowledgement ID |
| DELTYPE | CHAR(1) | Delivery type |
| TOTBudAmt | NUMERIC | Budget amount for this line |
| TOTRECKGS | NUMERIC | Total received kgs |

### Trs_Del3 — Delivery Program Detail
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| ID | INT (FK → Trs_Del1) | Header |
| OrdId | INT | Order |
| FabType | INT | Fabric type (= FabID) |
| Cnt | INT | Count (= CntID) |
| Clr | INT | Color (= ColID) |
| Prog | NUMERIC | Programmed quantity |
| Gsm | NUMERIC | GSM |
| DiaID | INT | Diameter |
| FinDiaID | INT | Finished diameter |
| GeneralRate | NUMERIC | General/finished GSM rate |
| LotNo | VARCHAR | Lot |
| GG | NUMERIC | Gauge |
| LL | VARCHAR | Loop length |
| PrgKnitGSM | NUMERIC | Knitting GSM |
| PrgKnitDiaId | INT | Knitting diameter |
| Print_DesignId | INT | Design |
| FinGsm | NUMERIC | Finished GSM |

### Trs_Del4 — Delivery GST Detail
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| DcID | INT (FK → Trs_Del1) | DC reference |
| StockID | INT (FK → StockTable) | Stock item |
| CGSTper | NUMERIC | CGST percentage |
| SGSTper | NUMERIC | SGST percentage |
| IGSTper | NUMERIC | IGST percentage |
| HSNID | INT (FK → Mas_HSN) | HSN code |

---

## 6. Transaction Tables — GRN (Trs_Grn\*)

### Trs_Grn1 — GRN Header (Goods Receipt Note)
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| ID | INT (PK) | GRN identifier |
| DocNo | INT | Document number |
| Finyear | VARCHAR | Financial year |
| dt | DATETIME | GRN date |
| Dept | INT (FK → Mas_Dept) | Receiving department |
| SuppID | INT (FK → Mas_Party) | Supplier |
| Buyer | INT | Buyer reference |
| PartyDCref | VARCHAR | Party's DC reference number |
| PartyDCDate | DATETIME | Party's DC date |
| GRNType | VARCHAR | 'Purchase', 'Process', 'Process Return', 'Sales Return', 'DirectReceipt', 'FabricRetToUnit' |
| Coycode | INT (FK → Mas_Exporter) | Company |
| ProcessType | CHAR(1) | 'P'=Process, 'R'=Reprocess |
| PoID | INT (FK → Trs_Po1) | Purchase order reference |
| DCID | INT | DC reference |
| External_GRNID | INT | External GRN reference (multi-process) |
| GodID | INT (FK → Mas_Godown) | Target godown |
| VehicleCode | INT (FK → Mas_Vehicle) | Vehicle |
| remark | VARCHAR | Remarks |

### Trs_GRN2 — GRN Lines
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| ID | INT (FK → Trs_Grn1) | Header |
| StockID | INT (FK → StockTable) | Stock item |
| OrdID | INT (FK → OrderMas) | Order |
| StyleNo | VARCHAR | Style |
| RBag | NUMERIC | Received bags/rolls |
| RecKgs | NUMERIC | Received kilograms |
| Recmtr | NUMERIC | Received meters |
| InvId | INT | Invoice reference |
| PoID | INT | PO reference |
| Rate | NUMERIC | Rate |

---

## 7. Transaction Tables — Multi-Process GRN

### Trs_MultiPrs_Grn1 — Multi-Process GRN Header
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| ID | INT (PK) | Identifier |
| DocNo | INT | Document number |
| Finyear | VARCHAR | Financial year |
| GRNDate | DATETIME | GRN date |
| Coycode | INT (FK → Mas_Exporter) | Company |
| ProcessType | CHAR(1) | Process type |
| GRNType | VARCHAR | GRN type |
| remark | VARCHAR | Remarks |

### Trs_MultiPrs_Grn2 — Multi-Process Party-Department Detail
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| ID | INT (FK → Trs_MultiPrs_Grn1) | Header |
| DeptID | INT (FK → Mas_Dept) | Department |
| PartyID | INT (FK → Mas_Party) | Party |
| PartyDCref | VARCHAR | Party DC reference |
| PartyDCDate | DATETIME | Party DC date |
| OurDCID | INT (FK → Trs_Del1) | Our DC reference |
| FinalProcess | CHAR(1) | 'Y'/'N' — is this the final process |

### Trs_MultiPrs_Grn3 — Multi-Process GRN Lines
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| ID | INT (FK) | Header |
| DeptID | INT | Department |
| StockID | INT (FK → StockTable) | Stock item |
| OrdId | INT (FK → OrderMas) | Order |
| StyleNo | VARCHAR | Style |
| RBag | NUMERIC | Bags |
| RecKgs | NUMERIC | Kgs |
| Recmtr | NUMERIC | Meters |
| PoID | INT | PO reference |

---

## 8. Transaction Tables — Purchase Order (Trs_Po\*)

### Trs_Po1 — Purchase Order Header
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| ID | INT (PK) | PO identifier |
| DocNo | INT | Document number |
| Finyear | VARCHAR | Financial year |
| Dept | INT (FK → Mas_Dept) | Department |
| Fcy | INT (FK → Mas_Fcy) | Foreign currency (0=INR) |
| ExchangeRate | NUMERIC | Exchange rate |

### Trs_Po2 — PO Lines (Yarn/Fabric)
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| ID | INT (FK → Trs_Po1) | Header |
| OrdId | INT (FK → OrderMas) | Order |
| CntId | INT (FK → Mas_Count) | Count |
| ClrId | INT (FK → Mas_Color) | Color |
| PoQty | NUMERIC | PO quantity |
| cancelkgs | NUMERIC | Cancelled quantity |
| Rate | NUMERIC | Rate |

### Trs_Po5 — PO Lines (Accessories)
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| ID | INT (FK → Trs_Po1) | Header |
| Ordid | INT | Order |
| StyleNo | VARCHAR | Style |
| Atype | INT (FK → Mas_Acc) | Accessories type |
| Ades | INT (FK → Mas_AccDes) | Accessories description |
| Clr | INT (FK → Mas_Color) | Color |
| Siz | INT (FK → Mas_Size) | Size |
| Rate | NUMERIC | Rate |

---

## 9. Transaction Tables — Pieces (Trs_Pcs\*)

### Trs_Pcs1 — Piece DC Header
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| ID | INT (PK) | DC identifier |
| DocNo | INT | Document number |
| Finyear | VARCHAR | Financial year |
| dtDCDate | DATETIME | DC date |
| Dept | INT (FK → Mas_Dept) | Department |
| Party | INT (FK → Mas_Party) | Party |
| Buyer | INT (FK → Mas_Buyer) | Buyer |
| Ordjobno | INT (FK → OrderMas) | Order/job number |
| DelType | VARCHAR | 'Process', 'Despatch', 'Unit Transfer', 'Ship Sample', etc. |
| Coycode | INT (FK → Mas_Exporter) | Company |
| ProcessType | CHAR(1) | 'P'/'R' |
| ToCoyCode | INT | Target company (unit transfer) |
| GpNo | INT | Gate pass number |
| Delivery_To_Flg | VARCHAR | 'Party'/'Buyer' |
| remark | VARCHAR | Remarks |
| targetstageid | INT | Target production stage |

### Trs_Pcs2 — Piece DC Lines
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| ID | INT (FK → Trs_Pcs1) | Header |
| StyleNo | VARCHAR | Style |
| ColID | INT (FK → Mas_Color) | Color |
| SizeID | INT (FK → Mas_Size) | Size |
| Pcs | INT | Pieces quantity |
| StyleID | INT (FK → Mas_StyleDesc) | Style description |
| PanelID | INT (FK → Mas_Panel) | Panel |
| PartID | INT (FK → Mas_Part) | Part |

### Trs_PcsGrn1 — Piece GRN Header
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| ID | INT (PK) | GRN identifier |
| Docno | INT | Document number |
| Finyear | VARCHAR | Financial year |
| Dt | DATETIME | GRN date |
| Party | INT (FK → Mas_Party) | Party |
| OrdJob | INT (FK → OrderMas) | Order |
| Dept | INT (FK → Mas_Dept) | Department |
| Coycode | INT (FK → Mas_Exporter) | Company |
| Partydcref | VARCHAR | Party DC reference |
| GrnType | VARCHAR | GRN type |
| InvId | INT | Invoice reference |
| StageID | INT | Production stage |
| ReceiptType | VARCHAR | 'Piece', 'Panel' |
| TargetStageID | INT | Target stage |
| remark | VARCHAR | Remarks |

### Trs_PcsGrn2 — Piece GRN Lines
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| ID | INT (FK → Trs_PcsGrn1) | Header |
| StyleNo | VARCHAR | Style |
| ColID | INT (FK → Mas_Color) | Color |
| SizID | INT (FK → Mas_Size) | Size |
| RecPcs | INT | Received pieces |
| StyleID | INT | Style description |
| PanelID | INT | Panel |
| PartID | INT (FK → Mas_Part) | Part |

### Other Piece Transaction Tables

| Table | Purpose |
|-------|---------|
| **Trs_Pcs2_Acc** | Accessories detail for piece DCs |
| **Trs_Pcs1_Panel** | Panel DC header |
| **Trs_Pcs2_Panel** | Panel DC lines |
| **Trs_PcsGrn3** | Additional piece GRN detail |
| **Trs_PcsGrn3_MistakePcs** | Mistake pieces in GRN |
| **Trs_PcsGrn4_PackingDCDet** | Packing DC detail for piece GRNs |
| **Trs_PcsAdj1, Trs_PcsAdj2** | Piece stock adjustments |
| **Trs_PcsOpening** | Piece opening stock entry |
| **Trs_PcsRej, Trs_PcsRejQty** | Piece rejection records |
| **Trs_PcsStkAdjustment, Trs_PcsStkAdjustmentDtl** | Piece stock adjustment |
| **Trs_PcsStockTfr1, Trs_PcsStockTfr2** | Piece stock transfer |
| **Trs_PcsGodAck1, Trs_PcsGodAck2** | Piece godown acknowledgement |

---

## 10. Transaction Tables — Production (Trs_Prod\*)

### Trs_ProdEntry — Production Entry Header
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| Id | INT (PK) | Production entry ID |
| CoyId | INT (FK → Mas_Exporter) | Company |
| OrdId | INT (FK → OrderMas) | Order |
| StyleNo | VARCHAR | Style |
| StageId | INT (FK → Mas_JobWrkComp) | Current production stage |
| SourceStageId | INT | Source stage (input from) |
| PartId | INT (FK → Mas_Part) | Part |
| GodId | INT (FK → Mas_Godown) | Godown |
| ClrId | INT (FK → Mas_Color) | Color/combo color |
| EmpId | INT (FK → Mas_Emp) | Employee/contractor |
| Rework | INT | 0=normal, 1=rework, 2=other |
| RejectionTypeId | INT (FK → Mas_RejectionType) | Rejection type |
| LotID | INT (FK → Mas_Lot) | Lot |
| Dt | DATETIME | Production date |
| Shift_Pcs | CHAR(1) | 'S'=shift, 'P'=contractor production |
| Pcs_Rate | NUMERIC | Piece rate (for contractor) |
| BrId | INT (FK → Trs_ProdBill) | Bill reference |
| Rate | NUMERIC | Rate per piece |
| StyleId | INT | Style ID |

### Trs_ProdEntryQty — Production Entry Quantity
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| ID | INT (FK → Trs_ProdEntry) | Header |
| SizId | INT (FK → Mas_Size) | Size |
| ProdPcs | INT | Produced pieces |

### Trs_ProdBillMasNew — Production Bill Master
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| ID | INT (PK) | Bill ID |
| EmpId | INT (FK → Mas_Emp) | Contractor |
| Brno | VARCHAR | Bill number |
| Finyear | VARCHAR | Financial year |
| BrDt | DATETIME | Bill date |

### Trs_ProdBillDetNew — Production Bill Detail
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| ID | INT (FK → Trs_ProdBillMasNew) | Bill master |
| OrdId | INT | Order |
| StyleNo | VARCHAR | Style |
| ColorId | INT | Color |
| StageID | INT | Stage |
| PartId | INT | Part |
| ThisBillQty | NUMERIC | Quantity in this bill |
| NetAmount | NUMERIC | Net amount |
| Rate | NUMERIC | Rate |

### Other Production Tables

| Table | Purpose |
|-------|---------|
| **Trs_ProdEntry_SourceStageDtl** | Source stage detail per production entry (ID, PartId, SourceStageId) |
| **Trs_ProdBill** | Production bill header |
| **Trs_ProdBillEntry** | Production bill entry (OrdId, StyleNo, StageID, ColorId, PartId, EmpId, Rate) |
| **Trs_prodBillAddded1** | Production bill additions |
| **Trs_ProdExp** | Production expense per order/style/stage |
| **Trs_ProdShiftWages** | Shift wages per order/stage (OrdId, StageID, ShiftWages) |
| **Trs_ProdShiftStyle_Contribute** | Style contribution to shift wages |
| **Trs_ProdWages** | Production wages |
| **Trs_Production_Consolidate** | Consolidated production data |
| **Trs_ProdReserve** | Reserved production |
| **Trs_ProdOpr_Breakup** | Operation breakup |
| **Trs_SuppProdentry** | Supplier production entry |
| **Trs_SuppProdentryQty** | Supplier production quantities |
| **Trs_Supp_ProdEntry_SourceStageDtl** | Supplier production source stage |
| **Trs_HourlyProduction** | Hourly production data |
| **Trs_LineInput, Trs_LineInput_Det** | Line input (daily line-wise input data) |
| **Trs_LineTargetProdn** | Line target production |
| **Trs_LineTfr, Trs_LineTfr_Det** | Line transfer |

---

## 11. Transaction Tables — Bills & Invoices

### Trs_Bills — Bill/Invoice Master
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| ID | INT (PK) | Bill ID |
| brno | VARCHAR | Bill reference number |
| finyear | VARCHAR | Financial year |
| billno | VARCHAR | Bill number |
| brdt | DATETIME | Bill reference date |
| billdt | DATETIME | Bill date |
| party | INT (FK → Mas_Party) | Party |
| coycode | INT (FK → Mas_Exporter) | Company |
| BillType | VARCHAR | Bill type |
| billamt | NUMERIC | Bill amount |
| GSTBill | CHAR(1) | 'Y'/'N' — GST bill flag |
| ERN | VARCHAR | E-invoice reference |

### Trs_BillAddded — Bill Additions/Deductions
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| ID | INT (FK → Trs_Bills) | Bill |
| Adddedcode | INT (FK → Mas_AddDed) | Addition/deduction code |
| Valu | NUMERIC | Percentage/value |
| amt | NUMERIC | Amount |

### Trs_BillRate — Bill Rate Detail
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| ID | INT (FK → Trs_Bills) | Bill |
| dept | INT (FK → Mas_JobWrkComp) | Work nature/dept |
| OrdId | INT | Order |
| NetAmount | NUMERIC | Net amount |

---

## 12. Transaction Tables — Debit Notes

| Table | Purpose |
|-------|---------|
| **Trs_Deb1** | Debit note header (ID PK, Dept → Mas_Dept) |
| **Trs_Deb2** | Debit note lines (ID FK, ordid, DebKg, Rate) |
| **Trs_Deb3** | Debit note additional |
| **Trs_Deb4** | Debit note further detail |
| **Trs_DebAddDed** | Debit note additions/deductions |
| **Trs_DirectDeb1** | Direct debit header (ID PK, Dept, OrdId, Type='D') |
| **Trs_DirectDeb2** | Direct debit lines (ID FK, OrdId, DebQty, Rate) |

---

## 13. Transaction Tables — General DC & GRN

### Trs_Gen1 — General DC Header
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| ID | INT (PK) | DC ID |
| Dcno | INT | DC number |
| Finyear | VARCHAR | Financial year |
| Dt | DATETIME | Date |
| PartyID | INT (FK → Mas_Party) | Party |
| Coycode | INT (FK → Mas_Exporter) | Company |
| DCType | CHAR(1) | 'R'=Returnable, 'N'=Non-returnable |
| remark | VARCHAR | Remarks |
| OrdRef | VARCHAR | Order reference |
| GpNo | INT | Gate pass number |

### Trs_Gen2 — General DC Lines
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| Id | INT (FK → Trs_Gen1) | Header |
| ItemDesc | VARCHAR | Item description |
| DelQty | NUMERIC | Delivery quantity |
| UomID | INT (FK → Mas_Uom) | UOM |

### Trs_GenGrn1 / Trs_GenGrn2 — General GRN (Header/Lines)
Similar structure for general GRN with `GrnNo`, `GRNdt`, `PartyID`, `cat` (1=Delivered, 2=Direct, 3=Returnable).

---

## 14. Costing, Budget & P&L Tables

### BudPoMas — Budget PO Master
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| Id | INT (PK) | Budget PO ID |
| OrdId | INT (FK → OrderMas) | Order |
| DeptId | INT (FK → Mas_Dept) | Department |
| PartyId | INT (FK → Mas_Party) | Party |

### BudPodet — Budget PO Detail
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| Id | INT (FK → BudPoMas) | Master |
| Size | INT | Size |
| PartID | INT | Part |
| ColId | INT | Color |
| StyleNo | VARCHAR | Style |
| FabId | INT | Fabric |
| CntId | INT | Count |
| DesignID | INT | Design |
| DiaId | INT | Diameter |
| GSM | NUMERIC | GSM |
| GG | NUMERIC | Gauge |
| LL | VARCHAR | Loop length |
| FinDiaId | INT | Finished diameter |
| FinGSM | NUMERIC | Finished GSM |
| Rate | NUMERIC | Budget rate |

### DailyUnit_P_And_L — Daily Unit Profit & Loss
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| Coycode | INT | Company |
| PLDate | DATE | P&L date |
| Ordid | INT | Order |
| StyleNo | VARCHAR | Style |
| PartId | INT | Part |
| StageId | INT | Production stage |
| Shift_ProdQty | INT | Shift production qty |
| Contractor_Prod_Pcs | INT | Contractor production pcs |
| BudgetRate | NUMERIC | Budget rate per piece |
| BudgetValue | NUMERIC | Budget value |
| Contractor_Actual_Wages | NUMERIC | Contractor actual wages |
| JobWrk_Pcs | INT | Job work pieces |
| JobWrk_ActualAmt | NUMERIC | Job work actual amount |

### Other Budget/Cost Tables

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| **Bud_InhRateclw** | ordid, styleno, clrid, partid, NWork, SizeID | In-house rate by color/size/work stage (Rate_Pcs, JobWrkRate) |
| **Budget** | (ID) | Budget master |
| **Budget_CostFix** | (ID) | Fixed cost allocation |
| **Budget_CostFix_Det** | (ID) | Fixed cost detail |
| **Pro_Prod_PartwiseRate** | OrdID, StyleNo, WrkID, PartID | Part-wise production rate (Rate, JobWrkRate) |
| **Pro_Prod_BitCutRate** | OrdID, GrdSlno, StyleNo, PartID | Bit/cutting rate (Rate, JobWrkRate, AddRate, NoofPcsPer_Bit, PcsWt) |
| **Pro_Prod_Budget_Det** | OrdID | Production budget detail |
| **Pro_Prod_Panelwiserate** | OrdID | Panel-wise rate |
| **OrderStylewiseCost** | OrdId, StyleNo | Style-wise cost tracking |
| **OrderStylewiseCost_Grp** | OrdId, GrpID | Cost group tracking (GRNKGS, GRNBASEDVALUE) |
| **DailyUnit_P_And_L_Abs** | | Abstract of daily P&L |
| **Temp_BudgetAndAct** | | Budget vs actual comparison |
| **Temp_BudgetAndActual** | | Budget vs actual (another variant) |
| **Temp_BudgetAndActual_Det** | | Detailed budget vs actual |

---

## 15. Programming & Requirement Tables (Pro_\*)

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| **Pro_ReqYarn** | OrdId, DeptId, CountId, ColId | Yarn requirement (ReqKgs) |
| **Pro_ReqYarn2** | OrdID, DeptId, CountID, ColID | Yarn requirement v2 (Rate) |
| **Pro_ReqKnitt** | OrdId, DeptId | Knitting requirement |
| **Pro_ReqKnitt2** | OrdId, DeptId, FabID, ColID, CntID, GSM, GG, LL, DiaID, FinDiaId, FinGSM, DesignID | Fabric knitting requirement (Rate, Cost, RateUOM) |
| **PRO_AccReq** | OrdId | Accessories requirement |
| **PRO_AccJobReq** | OrdId | Accessories job requirement |
| **Pro_AccBudRate** | OrdId | Accessories budget rate |
| **Pro_ReqActual** | OrdId | Actual vs required |
| **Pro_ReqJob** / **Pro_ReqJob_1** | OrdId | Job requirement |
| **Pro_RateCnfPcs1/2** | OrdId | Rate confirmation |
| **Pro_YrnCns** | OrdId | Yarn consumption |
| **PRo_BudCommercial** | OrdId | Commercial budget |
| **Pro_ProdPros** | OrdId | Production process |
| **Pro_ProdBitCutDet** | OrdId | Bit/cut detail |

---

## 16. Program Planning Tables (Prog_\*)

| Table | Purpose |
|-------|---------|
| **Prog_AccMas** | Accessories programming master |
| **Prog_ClrComb** | Color combination programming |
| **Prog_ClrDtl** | Color detail in program |
| **Prog_Clrloss** | Color loss percentages |
| **Prog_Comments** | Program comments |
| **Prog_Component** | Component programming |
| **Prog_Design** | Design programming |
| **Prog_DiaChange** | Diameter change programming |
| **Prog_InputPanels** | Input panels for cutting |
| **Prog_PanelEntry** | Panel entry in program |
| **Prog_Prsloss** | Process loss programming |
| **Prog_ReqCalTWrk** | Requirement calculation total work |
| **prog_cns** | Programmed consumption |
| **prog_ycns** | Programmed yarn consumption |
| **Prog_YTwist_Dtl/MAs** | Yarn twist detail/master |

---

## 17. Summary/Posting Tables (ST_\*)

These are denormalized summary tables maintained by triggers for fast reporting.

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| **ST_Production_Data** | Coycode, OrdID, StyleNo, StageId, PartID, ColID, SizeID | Cumulative production data per order/stage |
| **ST_Supp_Production_Data** | Similar | Supplier production data |
| **ST_Acc_PartyBal_Abs** | | Accessories party balance abstract |
| **ST_Acc_Prog_Balance** | | Accessories program balance |
| **ST_Cost_Dept** | | Cost per department |
| **ST_Cost_Factory** | | Factory-level cost |
| **ST_Cost_OrderDtl** | | Cost per order detail |
| **ST_DailyCostingInputData** | | Daily costing input |
| **ST_Ord_inHand** | | Orders in hand |
| **ST_PartyBalance_Abs** | | Party balance abstract |
| **ST_ProdRequirement** | | Production requirement |
| **ST_ProgBalance_Fabric** | | Fabric program balance |
| **ST_ProgBalance_Yarn** | | Yarn program balance |

---

## 18. Supplier Order Tables

| Table | Purpose |
|-------|---------|
| **SuppOrdMas** | Supplier order master |
| **SuppOrdDet** | Supplier order detail |
| **SuppOrdImage** | Supplier order images |
| **SuppOrdStyleDtl** | Supplier order style detail |
| **SuppAccDet** | Supplier accessories detail |
| **SuppAssortDet** | Supplier assortment detail |
| **SuppCommDet** | Supplier commercial detail |

---

## 19. Cutting & Panel Tables

| Table | Purpose |
|-------|---------|
| **Cutting_Job** | Cutting job master |
| **Cutting_Job_Dtl** | Cutting job detail |
| **Trs_CutApr** | Cutting approval/acknowledgement (ID, AprNo, Finyear, AprDt, CoyCode, GodID) |
| **Trs_CuttingShortage** | Cutting shortage |
| **Trs_ReadyToCut1/2** | Ready-to-cut delivery (ID, DocNo, Finyear, Dt, TrType=20) |
| **Trs_ReadyToCut_Ret1/2** | Ready-to-cut return |
| **Trs_PanelExcess** | Panel excess |
| **Trs_PanelExcessStage** | Panel excess by stage |
| **Trs_PanelRej** | Panel rejection |
| **Trs_PanelReWork1/2** | Panel rework |
| **Trs_AddPanelEntry** | Additional panel entry |
| **Trs_AddPanelEntryQty** | Additional panel entry qty |
| **Trs_AddPanelEntryQty_Component** | Panel entry component |
| **Trs_AddPanelEntryQty_Det** | Panel entry detail |
| **Trs_AddPanelAsm_SourceDtl** | Panel assembly source detail |
| **Prod_CutComponents** | Cutting components |
| **Prod_Sequence** | Production sequence (OrdId, StyleNo, StageId, SeqNo) |
| **Prod_Slno** | Sequence serial number |
| **Prod_Source_Operation** | Source operation |
| **Prod_PcsRworkIssue** | Piece rework issue |

---

## 20. Payment & Wages Tables

### PaymentMas — Payment Master
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| MasSlno | INT (PK) | Payment serial number |
| EmpId | INT (FK → Mas_Emp) | Employee/contractor |
| Vno | VARCHAR | Voucher number |
| Finyear | VARCHAR | Financial year |
| EntryDate | DATETIME | Entry date |
| ReserveFlg | CHAR(1) | **'P'**=Payment, **'V'**=Advance, **'C'**=Credit Note, **'R'**=Reserve, **'T'**=Others, **'D'**=Debit Note |
| paymentTypeID | INT (FK → Mas_Voucher_PaymentType) | Payment type |

### PaymentDtl — Payment Detail
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| DetSlno | INT (FK → PaymentMas) | Master reference |
| Ordid | INT | Order |
| StyleNo | VARCHAR | Style |
| Amount | NUMERIC | Amount |

### Other Wages Tables

| Table | Purpose |
|-------|---------|
| **Wages_ProductionMas / Wages_ProductionDet** | Production wages master/detail |
| **Trs_DailyWagePosting** | Daily wage posting |
| **Trs_ProdWages** | Production wages |
| **Trs_ProdShiftWages** | Shift wages per order/stage |

---

## 21. Daily Costing & Expense Tables

### Trs_DailyPrdn_Costing1 — Daily Costing Header
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| ID | INT (PK) | Costing ID |
| EntryDt | DATE | Entry date |
| Coycode | INT | Company |

### Trs_DailyPrdn_Costing2-5 — Expense Levels
| Table | Level | Key Extra Columns |
|-------|-------|-------------------|
| **Trs_DailyPrdn_Costing2** | Factory-level | ExpId, Amount |
| **Trs_DailyPrdn_Costing3** | Department-level | ExpId, Amount, DeptId |
| **Trs_DailyPrdn_Costing4** | Line-level | ExpId, Amount, LineId |
| **Trs_DailyPrdn_Costing5** | Order/Style-level | ExpId, Amount, Ordid, Styleno |

### Other Expense Tables

| Table | Purpose |
|-------|---------|
| **Trs_DailyExpenseEntry** | Daily expense entry |
| **Trs_FixedExpensesDateWise** | Fixed expenses by date |
| **Trs_StylewiseSingleExpense** | Style-wise single expense |
| **Trs_CashExpenses1/2** | Cash expenses (header/detail) |
| **FixedExpenses_Entry** | Fixed expenses entry |
| **Trs_Expenses** | General expenses |

---

## 22. Shipping & Sales Invoice Tables

| Table | Purpose |
|-------|---------|
| **Trs_SalInv** | Sales invoice |
| **Trs_SalInvAddded** | Sales invoice additions/deductions |
| **Trs_NewInvDtl** | New invoice detail |
| **Trs_NewInvConDtl** | New invoice container detail |
| **Trs_NewInvCtnDtls** | New invoice carton details |
| **Trs_NewInvCtnConDtls** | Carton container details |
| **Trs_Inv_DomesticDet** | Domestic invoice detail |
| **Ship_InvMas** | Shipping invoice master |
| **Ship_InvDet** | Shipping invoice detail |
| **ShippingBill** | Shipping bill |
| **ShippingBill_det** | Shipping bill detail |
| **ShippingBill_taxdet** | Shipping bill tax detail |

---

## 23. Job Work Tables

| Table | Purpose |
|-------|---------|
| **Trs_JobWrkMas** | Job work master |
| **Trs_JobWrkDet** | Job work detail |
| **Trs_JobWrkInv** | Job work invoice |
| **Trs_JWrkInvAddded** | Job work invoice additions |
| **Trs_ContractorAllotment_Mas** | Contractor allotment master |
| **Trs_ContractorAllotment_Det** | Contractor allotment detail |
| **Trs_ContractorBal** | Contractor balance |
| **Trs_JobOrder_PanelStock** | Job order panel stock |

---

## 24. Barcode & Bundle Tables

| Table | Purpose |
|-------|---------|
| **Barcode** | Barcode generation/scanning |
| **Pay_BarcodeGeneration** | Barcode generation |
| **Pay_Bundle_IsstoLine** | Bundle issue to line |
| **Pay_Bundle_ProdEntry** | Bundle production entry |
| **Pay_BundlePcs_Barcode** | Bundle pieces barcode |
| **Pay_CuttProd_Bundle** | Cutting production bundles |
| **Pay_CuttProdMas** | Cutting production master |
| **Pay_Pcs_ProdEntry** | Pieces production entry (barcode) |
| **Pay_ProdWorkDetails** | Production work details |
| **Trs_DC_ScanDetail** | DC scan detail |

---

## 25. Lab Test & Quality Tables

| Table | Purpose |
|-------|---------|
| **LabTestGrpMas** | Lab test group master |
| **LabTestGrpDet** | Lab test group detail |
| **LabTestMas** | Lab test master |
| **TestMas** | Test master |
| **Mas_LabTestParameters** | Lab test parameters |
| **Mas_LabTestStages** | Lab test stages |

---

## 26. Workflow & Approval Tables

| Table | Purpose |
|-------|---------|
| **WF_UserMas** | Workflow user master |
| **Wf_AssigneeMas** | Workflow assignees |
| **Wf_OperationMaster** | Workflow operations |
| **Wf_UserBuyerDeptMas** | User-buyer-department mapping |
| **Wf_UserBuyerMas** | User-buyer mapping |
| **Wf_UserOperationList** | User-operation list |
| **wf_UserUnitMas** | User-unit mapping |
| **WF_WorkFlow_Document** | Workflow documents |
| **WF_WorkFlow_Planning** | Workflow planning |
| **wf_maildisplaylist** | Mail display list |
| **wf_mailtemplate** | Mail templates |
| **App_ApprovalDc** | Approval for DCs |
| **App_ApprovalPlan** | Approval for plans |
| **App_ApprovalSent** | Sent approvals |
| **App_CourierMas** | Courier master |

---

## 27. WBS & Meeting Tables

| Table | Purpose |
|-------|---------|
| **WBS_LineProduction** | Line production metrics |
| **Wbs_Production** | WBS production |
| **WBS_Production_DateWise** | Date-wise WBS production |
| **WBS_Supp_Production** | Supplier WBS production |
| **Meeting** | Meeting/review data |
| **MR_Style** | Meeting review — style |
| **MR_Production** | Meeting review — production |
| **MR_ProcessDetails** | Meeting review — process details |
| **mr_fabric** | Meeting review — fabric |

---

## 28. Configuration & System Tables

### Options — System Configuration
| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| GatePassFlg | CHAR(1) | 'Y'/'N' — require gate pass |
| BudRT_CMT_SizeWise | CHAR(1) | 'Y'/'N' — size-wise budget/CMT |
| Stitching_DeptCode | INT | Stitching department code |
| Stitching_StageID | INT | Stitching stage ID |

### Other System Tables

| Table | Purpose |
|-------|---------|
| **Options_FM** | Form-level options |
| **Options1** | Additional options |
| **FinanceYear** | Fiscal year periods |
| **GovtHolidays** | Government holidays (GHDate) — used by `WF_PlanFinishDateArrival` |
| **Preprint** | Pre-print settings (DcRateReqd) per department |
| **Fcr_config** | FCR configuration |
| **spupdate** | Schema update tracking |

---

## 29. BI & Temporary Reporting Tables

| Table | Purpose |
|-------|---------|
| **BI_ACCSTOCK** | BI — accessories stock |
| **BI_GrpStockInfo** | BI — grouped stock info |
| **BI_PCEREG** | BI — piece register |
| **BI_STKREPORTS** | BI — stock reports |
| **DailyStockReg** | Daily stock register |
| **Temp_StkReports** | Temp stock reports (StockId, ExporterName, OrdId, BuyerOrdNo, DeptName, CountName, Color, StkBg, StkKgs, StkMtr, Fabric, Dia, GSM, GG, LL, UOM, Lotno, rate, GodownName, DesignDesc, IPAddress, StkGrpID, etc.) |
| **TempAccStock** | Temp accessories stock (Coyname, OrdId, AccDescr, AccDescription, AccColor, AccSize, Qty, UOM, Rate, StyleNo, GodName, StockId, StkGrpID) |
| **Temp_PceReg** | Temp piece register (Coycode, Coyname, OrdId, BuyOrdNo, DeptName, StyleDesc, StyleNo, GodName, StockPcs, DeptID, StkGrpID) |
| **TempPartyBalAbs/TempPartyBalLedger** | Party balance abstract/ledger |
| **TempIoHisLedger/TempIohisRight** | IO history ledger |
| **TempPcsDCDetInv** | Piece DC+Invoice detail |
| **Tmp_OCRSummary** | OCR summary report |
| **Tmp_OCRSummary_Pcs** | OCR pieces summary |
| **Tmp_HourlyProduction** | Hourly production temp |

---

## 30. Views

| View | Purpose | Key Tables |
|------|---------|------------|
| **Vue_Budget_Det** | Budget detail — aggregates delivery amounts, debit amounts, production amounts, jobwork, and despatch per order | Trs_Del1/2, Trs_DirectDeb1/2, Trs_Prodentry/Qty, Trs_ProdShiftWages, Trs_Pcs1/2, Trs_Deb1/2, Trs_BillRate, Trs_Bills |
| **vue_ContractLedger_New_Balcheck** | Contractor wages ledger balance — credits from production bills, debits from payments | Trs_ProdBillEntry, Trs_ProdBillDetNew, Trs_ProdBillMasNew, PaymentMas, PaymentDtl |
| **Vue_DailyCostingInputData** | Daily costing input — union of factory/dept/line/order level expenses | Trs_DailyPrdn_Costing1-5, Mas_Expenses, Options |
| **Vue_Dailyinout** | Daily in/out register — all deliveries, GRNs, piece DCs/GRNs, general DCs/GRNs, multi-process GRNs | Trs_Del1/2, Trs_Grn1/2, Trs_Pcs1/2, Trs_PcsGrn1/2, Trs_Gen1/2, Trs_GenGrn1/2, Trs_MultiPrs_Grn1/2/3 |
| **VUE_DEL_PRSRT** | Delivery printable report — complete DC with party, items, rates, GST | Trs_Del1/2/3/4, StockTable, OrderMas, Mas_Party, Mas_Exporter, BudPoMas/det, Pro_ReqKnitt2, Preprint |
| **Vue_GrnRegFab_PO** | GRN register for fabric with PO — includes multi-process GRN union | Trs_Grn1/2, Trs_MultiPrs_Grn1/2/3, StockTable, Trs_Po1, OrderMas |
| **Vue_InputGST** | Input GST report — SGST, CGST, IGST breakdown per bill | Trs_Bills, Trs_BillAddded, Mas_AddDed, Mas_Party, Mas_Exporter |
| **Vue_StkLedger** | Stock ledger — all 20 transaction types affecting stock balance | Trs_Opening, Trs_Grn1/2, Trs_Del1/2, Trs_ReadyToCut1/2, Trs_CutApr, OrderMas |
| **Vue_Reqd_Vs_Finish** | Required vs Finished — department-wise completion for fabric and yarn | Vue_ST_ProgBalance_FabricDet, Vue_ST_ProgBalance_YarnDet, OrderMas |
| **VUE_STOCKDTDATE** | Stock data by date | |
| **VUE_TRSRECABS** | Transaction receipt abstract | |
| **Vue_LabTestGarments** | Lab test garments | |
| **Vue_MultiPrcs** | Multi-process view | |
| **Vue_PcsStockDtl_PART** | Piece stock detail by part | |
| **Vue_YarnProgBalDetailYarnOnly_N** | Yarn program balance — requirement, PO, GRN, delivery, return, transfer, opening, shortage per order/dept/count/color | Pro_ReqYarn, Trs_Po1/2, Trs_Grn1/2, Trs_Del1/2, Trs_Opening, Trs_Shortage |
| **Vue_YarnProgBalDetail_N** | Yarn program balance (full) | Similar to above |

---

## 31. Key Relationships & ER Diagram Notes

### Central Hub: OrderMas

`OrderMas.OrdId` is the most frequently referenced foreign key in the system. Almost every transaction table references it.

```
OrderMas ─┬── OrderStyleDtl (styles within order)
           ├── OrderQtyDtl (quantities by size/color/part)
           ├── OrdSizeMas (size sequence)
           ├── StockTable.OrdID (stock items tied to order)
           ├── Trs_Del2.OrdId (deliveries)
           ├── Trs_GRN2.OrdID (GRNs)
           ├── Trs_Pcs1.Ordjobno (piece DCs)
           ├── Trs_PcsGrn1.OrdJob (piece GRNs)
           ├── Trs_ProdEntry.OrdId (production)
           ├── Pro_ReqYarn/Knitt/Acc (requirements)
           ├── BudPoMas.OrdId (budget POs)
           ├── DailyUnit_P_And_L.Ordid (P&L)
           └── (many more...)
```

### Stock Flow Chain

```
StockTable (definition) ←── CurrentStock (running balance by godown)
       │
       ├── Trs_Del2.StockID (outgoing)
       ├── Trs_GRN2.StockID (incoming)
       ├── Trs_Opening.StockID (opening)
       └── StockRatePost.OrdId (rate cascading)
```

### Piece Stock Flow

```
Pcs_StockTable (definition) ←── Pcs_StockTableQty (qty by color/size)
       │
       ├── Trs_Pcs2 (outgoing)
       ├── Trs_PcsGrn2 (incoming)
       ├── Trs_ProdEntry → PROC_Stock_ProdPieces (production adds/removes)
       └── Trs_PcsOpening (opening)
```

### Department Process Chain

```
Mas_Dept (departments/processes)
    │
    ├── Mas_JobWrkComp.DeptId (work nature stages)
    │       │
    │       └── Prod_Sequence (order of stages per order/style)
    │
    ├── StockTable.Dept (stock department)
    ├── Trs_Del1.Prs_Dept (delivery department)
    ├── Trs_Grn1.Dept (receipt department)
    └── StockRatePost.DeptId (cumulative rate by dept)
```

### Billing Chain

```
Trs_Bills ─── Trs_BillAddded (SGST/CGST/IGST/additions/deductions)
     │
     ├── Trs_BillRate (per order/dept rate)
     ├── Trs_Bills_GrnDtl (linked GRN detail)
     └── Trs_Del1/Trs_PcsGrn1.InvId → Trs_Bills.ID (invoice linkage)
```

---

## 32. Transaction Type Codes Reference

### Trs_Del1.TrType Values

| TrType | Description | Stock Effect |
|--------|-------------|--------------|
| 1 | Process Issue (delivery to party for processing) | Stock OUT |
| 2 | Sales Delivery | Stock OUT |
| 3 | Transfer (inter-order, with TranOrdID) | OUT from source, IN to target |
| 4 | Purchase Return | Stock OUT |
| 5 | Stock Adjustment (StockAddLess='Add'/'Less') | IN or OUT |
| 6 | Accessories Purchase Return | Stock OUT |
| 7 | Accessories Issue | Stock OUT |
| 8 | Unit Transfer (Accessories) | Stock OUT from source unit |
| 9 | (reserved) | — |
| 10 | Accessories Process Issue | Stock OUT |
| 11 | DirectReceipt Return | Stock OUT |
| 12 | Accessories Direct Receipt Return | Stock OUT |
| 13 | Party Rejection Return | Stock OUT |
| 14 | Godown Transfer | Move between godowns |
| 15 | Godown Transfer (Accessories) | Move between godowns |
| 17 | Cutting Issue (with acknowledgement via Trs_CutApr) | Stock OUT |
| 20 | Ready-to-Cut | Stock redistribution |
| -2 | Unit DC (internal) | Stock OUT |

### Trs_Grn1.GRNType Values

| GRNType | Description |
|---------|-------------|
| 'Purchase' | Purchase GRN |
| 'Process' | Process receipt (material back from processing) |
| 'Process Return' | Process return (rejected from process) |
| 'Sales Return' | Sales return from customer |
| 'DirectReceipt' | Direct receipt (no PO) |
| 'FabricRetToUnit' | Fabric return to unit |

### Trs_Pcs1.DelType Values

| DelType | Description |
|---------|-------------|
| 'Process' | Piece process delivery |
| 'Despatch' | Despatch to buyer |
| 'Unit Transfer' | Inter-unit transfer |
| 'Ship Sample' | Shipment sample |
| 'ReProcess' | Reprocess |

### PaymentMas.ReserveFlg Values

| Flag | Description |
|------|-------------|
| 'P' | Payment |
| 'V' | Advance |
| 'C' | Credit Note |
| 'R' | Reserve |
| 'T' | Others |
| 'D' | Debit Note |

### Mas_AddDed.AddDedName Key Values

| Name | Code | Description |
|------|------|-------------|
| 'SGST' | (varies) | State GST |
| 'CGST' | (varies) | Central GST |
| 'IGST' | (varies) | Interstate GST |

---

## Summary Statistics

| Category | Count |
|----------|-------|
| **Master tables (Mas_\*)** | ~53 |
| **Order tables (Order\*)** | ~20 |
| **Stock tables** | ~15 |
| **Transaction tables (Trs_\*)** | ~100+ |
| **Costing/Budget tables** | ~15 |
| **Programming tables (Pro_\*)** | ~20 |
| **Program planning tables (Prog_\*)** | ~15 |
| **Summary tables (ST_\*)** | ~13 |
| **Supplier tables** | ~7 |
| **Cutting/Panel tables** | ~15 |
| **Payment/Wages tables** | ~8 |
| **Daily Costing/Expense tables** | ~10 |
| **Shipping/Invoice tables** | ~10 |
| **Job Work tables** | ~7 |
| **Barcode/Bundle tables** | ~10 |
| **Quality/Lab tables** | ~6 |
| **Workflow/Approval tables** | ~12 |
| **WBS/Meeting tables** | ~5 |
| **Configuration/System tables** | ~7 |
| **BI/Temp reporting tables** | ~15 |
| **Views** | ~40+ |
| **Total unique tables** | **~300+** |
| **Total SQL files analyzed** | **~320** |
