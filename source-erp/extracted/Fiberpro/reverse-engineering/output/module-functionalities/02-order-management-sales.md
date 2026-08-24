# Module 2 — Order Management & Sales

> **Generated**: 2026-03-15  
> **Source**: 22 order-related forms, ~25 stored procedures, ~20 order tables, 16 Stimulsoft reports (.mrt), 8 Crystal Reports (.rpt), 2 views, order-related triggers  
> **Foundation References**: database-schema.md, stored-procedures-analysis.md, triggers-and-views-analysis.md, formulas-and-calculations.md, 01-masters-configuration.md

---

## Table of Contents

1. [Module Overview](#1-module-overview)
2. [Forms Inventory](#2-forms-inventory)
3. [Data Model — Order Tables](#3-data-model--order-tables)
   - 3.1 OrderMas — Order Master (Central Entity)
   - 3.2 OrderMas2 — Order Master Extension
   - 3.3 OrderStyleDtl — Style Detail per Order
   - 3.4 OrderQtyDtl — Quantity Breakdown (Size/Color/Part)
   - 3.5 OrdQtyClrDtl — Combo Color Quantity Detail (EntryOption 2)
   - 3.6 OrdSizeMas — Size Sequence per Order
   - 3.7 Supporting Order Tables
4. [Order Sheet Entry (New Order)](#4-order-sheet-entry-new-order)
   - 4.1 FrmOrderSheetNew — Standard Export Order
   - 4.2 FrmOrderSheetNew_Domestic — Domestic Order
   - 4.3 FrmOrderSheetNew_WithAmend — Order with Amendment Tracking
   - 4.4 Frm_OrderInputMas — Order Related Input (Bulk)
   - 4.5 FrmOrderRelatedInput_Excel — Excel Import
5. [Order Types & Classification](#5-order-types--classification)
6. [Order Entry Options (EntryOption)](#6-order-entry-options-entryoption)
7. [Order Amendment](#7-order-amendment)
8. [Order Enquiry & Sample Entry](#8-order-enquiry--sample-entry)
9. [Trading Orders](#9-trading-orders)
10. [Order Status Tracking](#10-order-status-tracking)
    - 10.1 frmOrdStat — Order Status Dashboard
    - 10.2 FrmOrdProdTrack — Production Tracking
    - 10.3 FrmOrderDisplayDaysSetting — Display Days Configuration
11. [Order Registers & Reports](#11-order-registers--reports)
    - 11.1 FrmOrderRegister — Standard Order Register
    - 11.2 FrmOrderRegister_Spl — Special Order Register
    - 11.3 frmordwiseregregister — Order-wise Register
    - 11.4 FrmOrderwisePcsReg — Order-wise Pieces Register
12. [Order Close & Completion](#12-order-close--completion)
13. [Order Grouping & References](#13-order-grouping--references)
14. [Order Value & Currency Calculations](#14-order-value--currency-calculations)
15. [Order vs Despatch Summary](#15-order-vs-despatch-summary)
16. [Order History Ledger](#16-order-history-ledger)
17. [Order-in-Hand Views](#17-order-in-hand-views)
18. [Style Change Workflow](#18-style-change-workflow)
19. [Program Copy (Order Data Duplication)](#19-program-copy-order-data-duplication)
20. [Sales Invoicing (Order-linked)](#20-sales-invoicing-order-linked)
21. [Order-related Stored Procedures Summary](#21-order-related-stored-procedures-summary)
22. [Order-related Reports Catalog](#22-order-related-reports-catalog)
23. [Cross-Module Dependencies](#23-cross-module-dependencies)

---

## 1. Module Overview

The Order Management & Sales module is the **central nervous system** of FiberPro. Every downstream workflow — procurement, production planning, cutting, dispatch, billing, costing — is driven by the Order (internally called "IO" = Internal Order, or "Job Order"). An order represents a buyer's purchase order for garments, with detailed breakdowns by style, color, size, part (garment component), and lot.

**Key characteristics:**
- **Multi-style orders**: A single order can contain multiple styles (garment designs), each with its own fabric, color combinations, size ratios, and delivery dates
- **Two entry modes**: EntryOption 1 (individual size/color entry) and EntryOption 2 (combo/pack-order color entry with `OrdQtyClrDtl`)
- **Three order types**: Regular export orders ("Order"), domestic orders, trading orders, and sample orders
- **Amendment tracking**: Full amendment history with `OrderQtyDtl_Amend` / `OrdQtyClrDtl_Amend` tables
- **Multi-currency**: Foreign currency exchange rates (`Mas_Fcy`), contract rates (`CRate`), and forward exchange rates (`FwdCtRate`)
- **Order identification**: Each order has a system `OrdId` (auto-increment PK), a user-facing `Jobno/Finyear` combination (e.g., "1234/24-25"), and a buyer's order number `BuyOrdNo`

---

## 2. Forms Inventory

| # | Form Class | Purpose |
|---|-----------|---------|
| 1 | `FrmOrderSheetNew` | New order sheet entry — standard export order |
| 2 | `FrmOrderSheetNew_Domestic` | New domestic order sheet (local sales) |
| 3 | `FrmOrderSheetNew_WithAmend` | Order sheet entry with amendment tracking |
| 4 | `FrmOrderSheetAmendment` | Standalone order amendment form |
| 5 | `FrmOrderEnquiry` | Order enquiry / search / lookup |
| 6 | `frmOrdStat` | Order status tracking dashboard |
| 7 | `FrmOrderRegister` | Standard order register report viewer |
| 8 | `FrmOrderRegister_Spl` | Special order register (variant criteria) |
| 9 | `FrmOrderClose` | Mark orders as completed |
| 10 | `FrmOrderDespatchCompletion` | Mark order despatch as complete |
| 11 | `FrmOrderDisplayDaysSetting` | Configure display-day offsets for order status |
| 12 | `FrmOrderRef` | Order cross-reference management |
| 13 | `frmOrderGroup` | Order grouping (group reference) |
| 14 | `frmOrderSample` | Sample order entry |
| 15 | `FrmOrderRelatedInput_Excel` | Import order data from Excel |
| 16 | `FrmOrderwisePcsReg` | Order-wise pieces register |
| 17 | `FrmOrdProdTrack` | Order production tracking |
| 18 | `frmordwiseregregister` | Order-wise register (general) |
| 19 | `FrmTradingOrderSheet` | Trading order sheet entry |
| 20 | `FrmTradingOrdersInHandReg` | Trading orders in-hand register |
| 21 | `FrmSampleEntry_WithEnquiry` | Sample entry linked to enquiry |
| 22 | `Frm_Ordersheet_Preview` | Order sheet print preview |
| 23 | `Frm_OrderInputMas` | Order-related input master (bulk) |
| 24 | `FrmCommericalInv_New` | Commercial invoice (linked to order) |
| 25 | `frmDelCumInv` | Delivery cumulative invoice |
| 26 | `frmSalINV` | Sales invoice |
| 27 | `frmPieceInv` / `frmPieceInv_1` | Piece-goods invoice |

---

## 3. Data Model — Order Tables

### 3.1 OrderMas — Order Master (Central Entity)

The top-level order record. Every other order-related table references `OrdId`.

| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| `OrdId` | INT (PK, IDENTITY) | System-generated order identifier |
| `Jobno` | INT | Job order number — the user-visible IO number (0 = no-order/general) |
| `Finyear` | VARCHAR | Financial year code (e.g., "24-25") |
| `BuyOrdNo` | VARCHAR | Buyer's purchase order number |
| `BuyerID` | INT (FK → Mas_Buyer) | Buyer reference |
| `MerchID` | INT (FK → Mas_Merchandiser) | Merchandiser handling the order |
| `ExpID` | INT (FK → Mas_Exporter) | Company/unit (exporter) executing the order |
| `Season` | INT (FK → Mas_Season) | Season reference |
| `Fcy` | INT (FK → Mas_Fcy) | Foreign currency reference |
| `CRate` | NUMERIC(18,2) | Contract exchange rate (if > 0, overrides Fcy.ExchangeRate) |
| `Completed` | INT | 0 = Running/Open, 1 = Completed, 2 = Amended |
| `OrderType` | VARCHAR | 'Order', 'Sample', 'Trading', 'Domestic' |
| `OrderQty` | INT | Total order quantity (header-level summary) |
| `OrdDate` | DATETIME | Order date |
| `BuyordDt` | DATETIME | Buyer order date |
| `grpref` | VARCHAR | Group reference code (for grouping related orders) |
| `uom` | VARCHAR | Unit of measure (e.g., 'PCS', 'KGS') |
| `BuyerDeptID` | INT (FK → Mas_BuyerDept) | Buyer department |

### 3.2 OrderMas2 — Order Master Extension

Additional fields that don't fit in OrderMas (likely added over time).

| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| `Ordid` | INT (PK, FK → OrderMas) | Order reference |
| `Season1` | INT (FK → Mas_Season) | Alternate/secondary season |
| `Gsm` | NUMERIC | Target GSM (grams per square meter) |
| `DelDt` | DATETIME | Planned delivery date (header level) |
| `ActDelDt` | DATETIME | Actual delivery date |
| `FwdCtRate` | NUMERIC(18,2) | Forward contract exchange rate |
| `StyleNo` | VARCHAR(100) | Concatenated list of all style numbers (auto-generated) |
| `FabricName` | VARCHAR | Fabric name description |
| `ProdOverheads` | NUMERIC | Production overhead percentage for costing |

### 3.3 OrderStyleDtl — Style Detail per Order

Each row represents one style within an order. An order can have multiple styles.

| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| `OrdID` | INT (FK → OrderMas) | Order reference |
| `StyleNo` | VARCHAR(20) | Style number (user-defined, e.g., "ST001") |
| `StyleId` | INT (FK → Mas_StyleDesc) | Style description master reference |
| `EntryOption` | INT | **1** = Individual entry (size×color grid), **2** = Pack/combo entry |
| `Fabric1` | VARCHAR | Fabric description for this style |
| `uom` | VARCHAR | Style-level UOM |
| `DelDt` | DATETIME | Style-level delivery date |
| `RateFor` | CHAR(1) | Rate determination: 'S' = Style-level rate, 'C' = Color-level rate, 'R' = Row-level (size×color), 'Z' = default/size |
| `SaleRate` | NUMERIC(18,2) | Sale rate at style level (when RateFor='S') |
| `StyleWise_Completion_OrdHandRpt` | INT | 0 = Running, 1 = Completed, 3 = Amended (for order-in-hand report) |
| `StyleWise_Despatch_Completion` | INT | 0 = Pending, 1 = Complete |
| `BrandID` | INT (FK → Mas_Brand) | Brand reference |
| `UpdateFlg` | BIT | Dirty flag for sync/replication |

### 3.4 OrderQtyDtl — Quantity Breakdown (EntryOption 1)

The core quantity detail table used when `EntryOption = 1`. Each row represents a single (Style × Color × Size × Part × Lot) combination.

| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| `Ordid` | INT (FK → OrderMas) | Order |
| `StyleNo` | VARCHAR(20) | Style number |
| `StyleId` | INT | Style master ID |
| `PartId` | INT (FK → Mas_Part) | Garment part (e.g., body, sleeve, collar) |
| `ColId` | INT (FK → Mas_Color) | Color |
| `SizeId` | INT (FK → Mas_Size) | Size |
| `CmbClrID` | INT | Combo color ID (when applicable) |
| `OrderQty` | INT | Ordered quantity for this combination |
| `CutPlanQty` | INT | Cutting plan quantity (order qty + excess %) |
| `SaleRate` | NUMERIC(18,2) | Sale rate for this combination |
| `Deldt` | DATETIME | Delivery date for this line |
| `LotNo` | VARCHAR(15) | Lot number |
| `PcsPerColor` | INT | Pieces per color (for pack orders) |
| `ProdUnit` | INT | Production unit (FK → Mas_Exporter for factory) |
| `UpdateFlg` | BIT | Dirty flag for sync |
| `Size_Updateflg` | BIT | Size-specific update flag |

### 3.5 OrdQtyClrDtl — Combo Color Quantity Detail (EntryOption 2)

Used when `EntryOption = 2` — pack/ratio-based entry where quantities are specified per combo-color.

| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| `Ordid` | INT (FK → OrderMas) | Order |
| `StyleNo` | VARCHAR(20) | Style number |
| `StyleId` | INT | Style master ID |
| `CmbClrID` | INT | Combo color identifier |
| `SizeId` | INT (FK → Mas_Size) | Size |
| `SizeQty` | INT | Quantity per size within the combo |
| `SaleRate` | NUMERIC(18,2) | Sale rate |
| `Deldt` | DATETIME | Delivery date |
| `LotNo` | VARCHAR(15) | Lot number |
| `Exs_Per` | NUMERIC | Excess percentage (for cut-plan calculation) |
| `Prod_Unit` | INT | Production unit |
| `UpdateFlg` | BIT | Dirty flag |

### 3.6 OrdSizeMas — Size Sequence per Order

Controls the display order of sizes in grids and reports for each order/style.

| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| `OrdID` | INT (FK → OrderMas) | Order |
| `SizeID` | INT (FK → Mas_Size) | Size |
| `SNo` | INT | Display sequence number |
| `StyleNo` | VARCHAR(20) | Style |

### 3.7 Supporting Order Tables

| Table | Key Columns | Purpose |
|-------|-------------|---------|
| `OrderQtyDtl_Amend` | Same as OrderQtyDtl | Stores amended quantities (pre-amendment snapshot) |
| `OrdQtyClrDtl_Amend` | Same as OrdQtyClrDtl | Amended combo-color quantities |
| `OrderStyleImage` | OrdID, StyleNo | Stores style images per order |
| `OrderStyleImageAcc` | OrdID, StyleNo | Accessories images per order/style |
| `OrderStyleImgDtl` | OrdID, StyleNo | Image detail records (multi-image) |
| `OrderStylewiseCost` | OrdId, StyleNo | Aggregate style-wise cost tracking (updated by triggers and SPs) |
| `OrderStylewiseCost_Grp` | OrdId, GrpID | Group-wise costing (GRNKGS, GRNBASEDVALUE) |
| `OrderProgQty` | OrdID, StyleNo | Programmed quantities |
| `Order_PartDtl` | OrdID, PartID, StyleNo | Part definition detail per order (PcsPerPart) |
| `Order_Addl_color` | OrdID, StyleNo | Additional colors beyond initial entry |
| `Order_Addl_color_CompDet` | OrdID | Color component detail (for color combinations) |
| `Order_Addl_Lot` | OrdID, StyleNo | Additional lots added post-creation |
| `Order_Addl_RatioDtl` | OrdID | Pack-ratio detail for ratio-based orders |
| `Order_Addl_Size` | OrdID, StyleNo | Additional sizes added post-creation |
| `OrderAccImgDtl` | OrdID | Accessories image detail |
| `OrderLotRateDtl` | OrdID, StyleNo | Lot-wise rate detail |
| `OrdProgPcsWgt` | OrdID, StyleNo | Programmed pieces weight per order |
| `EnquiryDet` | ID | Order enquiry detail (pre-order enquiry records) |
| `Ord_GramDtl` | OrdID, StyleNo | Grammage detail per order |
| `OrdSeq` | OrdId, Prs | Order process sequence (department sequence for this order) |
| `OrdStyle` | OrdID, StyleNo | Additional style metadata |
| `ST_Ord_inHand` | OrdId, StyleNo, LotNo | Denormalized summary table for order-in-hand register |

---

## 4. Order Sheet Entry (New Order)

### 4.1 FrmOrderSheetNew — Standard Export Order

The primary form for creating new garment orders. This is a complex multi-grid form that captures:

**Header section:**
- IO Number (Jobno) / Financial Year — auto-generated or manual
- Buyer (from `Mas_Buyer`), Buyer Order Number, Buyer Order Date
- Merchandiser (from `Mas_Merchandiser`)
- Company/Unit (Exporter from `Mas_Exporter`)
- Season, Currency (FCY), Exchange Rate, Contract Rate
- Order Date, Delivery Date, Actual Delivery Date
- Order Type flag, Group Reference
- Total Order Quantity, UOM

**Style grid (per-style detail):**
- Style Number (free-text identifier)
- Style Description (from `Mas_StyleDesc`)
- Fabric, Entry Option (1 or 2), Rate determination mode (RateFor)
- Sale Rate (if style-level), Brand
- Style-level delivery date
- Images (OrderStyleImage, OrderStyleImageAcc)

**Quantity grid (EntryOption 1):**
- Matrix of Size × Color × Part with OrderQty per cell
- CutPlanQty = OrderQty × (1 + excess%)
- SaleRate per cell (if RateFor = 'R')
- Lot number, Production Unit assignment

**Quantity grid (EntryOption 2 — pack/combo):**
- Matrix of SizeQty per CmbClrID
- PcsPerColor multiplier
- Excess percentage per row

**On Save — writes to:**
- `OrderMas` + `OrderMas2` (header)
- `OrderStyleDtl` (one row per style)
- `OrderQtyDtl` or `OrdQtyClrDtl` (based on EntryOption)
- `OrdSizeMas` (size sequence)
- `Order_PartDtl` (part definitions)
- Calls `Sp_MR_OrdInHand` to update the denormalized `ST_Ord_inHand` table
- Auto-generates concatenated StyleNo in OrderMas2

**Validation rules:**
- BuyerID, MerchID, ExpID are required
- At least one style must be defined
- OrderQty > 0 for each size/color combination
- Finyear must be valid

### 4.2 FrmOrderSheetNew_Domestic — Domestic Order

Variant of the standard order form optimized for domestic (local market) orders:
- No foreign currency fields (CRate, Fcy not applicable)
- Simplified UOM handling (typically PCS or KGS)
- May have different tax structure (GST instead of export duty-free)
- Same data model — writes to identical Order* tables with `OrderType = 'Domestic'`

### 4.3 FrmOrderSheetNew_WithAmend — Order with Amendment Tracking

Enhanced version that tracks amendments inline:
- Shows original quantities alongside current quantities
- Writes change snapshots to `OrderQtyDtl_Amend` / `OrdQtyClrDtl_Amend`
- Sets `Completed = 2` (Amended) status on OrderMas
- Logs amendment history

### 4.4 Frm_OrderInputMas — Order Related Input (Bulk)

Bulk input form for order-related master data — allows rapid entry of multiple order parameters simultaneously rather than editing each order individually.

### 4.5 FrmOrderRelatedInput_Excel — Excel Import

Allows importing order quantity breakdown from Excel spreadsheets:
- Maps Excel columns to OrderQtyDtl fields
- Validates against existing masters (Colors, Sizes, Styles)
- Batch-inserts into order tables

---

## 5. Order Types & Classification

The system supports multiple order types, stored in `OrderMas.OrderType`:

| OrderType | Description | Forms Used |
|-----------|------------|-----------|
| `'Order'` | Standard export/production order | FrmOrderSheetNew, FrmOrderSheetNew_WithAmend |
| `'Domestic'` | Domestic/local market order | FrmOrderSheetNew_Domestic |
| `'Sample'` | Sample order (pre-production samples for buyer approval) | frmOrderSample, FrmSampleEntry_WithEnquiry |
| `'Trading'` | Trading order (buy-sell without production) | FrmTradingOrderSheet |

**Completion flag (`OrderMas.Completed`):**

| Value | Meaning | Report Label |
|-------|---------|-------------|
| 0 | Running / Open | 'R' |
| 1 | Completed | 'C' |
| 2 | Amended | 'A' |

**Style-level completion** (`OrderStyleDtl.StyleWise_Completion_OrdHandRpt`):
- 0 = Running ('R'), 1 = Completed ('C'), 3 = Amended ('A')

**Style-level despatch completion** (`OrderStyleDtl.StyleWise_Despatch_Completion`):
- 0 = Pending, 1 = Complete — used by `FrmOrderDespatchCompletion`

---

## 6. Order Entry Options (EntryOption)

`OrderStyleDtl.EntryOption` controls how quantities are entered for a style:

### EntryOption 1 — Individual Entry

Each (Style × Color × Size × Part) combination gets a separate `OrderQtyDtl` row. This is the standard mode for most garment orders.

- User fills a matrix of Size (columns) × Color (rows)
- Each cell = OrderQty for that specific size/color
- SaleRate can vary per row if `RateFor = 'R'`
- CutPlanQty = OrderQty + excess allowance

### EntryOption 2 — Pack/Combo Color Entry

Quantities are entered via `OrdQtyClrDtl` using combo-color groups:

- `CmbClrID` groups multiple base colors into a combo (e.g., "assorted")
- `SizeQty` per combo-color per size
- `PcsPerColor` multiplier — final quantity = SizeQty × PcsPerColor
- `Exs_Per` = excess percentage per row
- Used for pack-orders where garments are packed in assorted color packs

**Impact on downstream:**
- SP_Vue_OrderinHand uses UNION of EntryOption=1 (from OrderQtyDtl) and EntryOption=2 (from OrdQtyClrDtl)
- SP_Vue_OrdVsDespatch_Summary similarly handles both
- Dispatch stock views (VueDespatchStock*) must match on CmbClrID for EntryOption=2

---

## 7. Order Amendment

### FrmOrderSheetAmendment

Dedicated form for amending existing orders after initial entry. Amendments are common in garment industry due to buyer revisions.

**Workflow:**
1. User selects an existing order
2. System loads current quantities from `OrderQtyDtl` / `OrdQtyClrDtl`
3. Copies current quantities to `OrderQtyDtl_Amend` / `OrdQtyClrDtl_Amend` (snapshot of pre-amendment state)
4. User modifies quantities, adds/removes sizes/colors
5. On save:
   - Updates `OrderQtyDtl` / `OrdQtyClrDtl` with new quantities
   - Keeps amendment snapshot in `_Amend` tables for audit
   - Updates `OrderMas.Completed = 2` if flagged as amendment

**Tables involved:**
- `OrderQtyDtl_Amend` — mirrors `OrderQtyDtl` structure, stores pre-amendment values
- `OrdQtyClrDtl_Amend` — mirrors `OrdQtyClrDtl`, stores pre-amendment combo quantities

**Cascade impacts:**
- Program details (Prog_ClrComb, Pro_ReqYarn, Pro_ReqKnitt) may need recalculation
- Cut plan quantities need update
- Budget calculations may be affected

---

## 8. Order Enquiry & Sample Entry

### FrmOrderEnquiry

General-purpose order lookup and enquiry form:
- Search by Jobno/Finyear, BuyOrdNo, BuyerID, Season, Style
- Displays order header + style details
- Links to view order status, history, and related transactions
- Read-only display; no modifications

**Data source:** `EnquiryDet` table stores pre-order enquiry records, and the form may also browse existing `OrderMas` records.

### frmOrderSample — Sample Order Entry

Simplified order entry for sample/development orders:
- Typically smaller quantities
- Used during pre-production phase (buyer approval samples)
- `OrderType = 'Sample'`
- Costing logic differs — simpler cascading without program-based yarn consumption lookups (see formulas-and-calculations.md §5)

### FrmSampleEntry_WithEnquiry

Enhanced sample entry form that links the sample order to a prior enquiry record:
- References `EnquiryDet` for enquiry details
- Converts enquiry → sample order → production order (workflow progression)

---

## 9. Trading Orders

### FrmTradingOrderSheet

Entry form for trading orders — buy-sell transactions without in-house production:
- `OrderType = 'Trading'`
- No production sequence required
- May reference supplier orders for procurement
- Simpler cost structure (purchase price + margin)

### FrmTradingOrdersInHandReg

Register/report for tracking trading orders in hand:
- Shows order qty, despatch qty, balance
- Similar structure to standard order-in-hand but filtered to `OrderType = 'Trading'`

---

## 10. Order Status Tracking

### 10.1 frmOrdStat — Order Status Dashboard

Comprehensive status view for an order showing fabric processing progress across all departments.

**Backed by stored procedures:**

#### SP_OrderStatus (@OrdID, @FabID, @CntID, @ColID, @Dt, @Dt1)

Tracks fabric movement per processing stage for a specific order/fabric/count/color:

| Stage | Dept IDs | Columns Returned |
|-------|----------|-----------------|
| **Knitting** | 4, 43 | KnitDC, KnitGrn, KnitMultiGrn, KnitRet |
| **Heat Setting** | 5 | HeatDC, HeatGrn, HeatMultiGrn, HeatRet |
| **Washing** | 7, 19, 41, 42 | WashDC, WashGrn, WashMultiGrn, WashRet |
| **Compacting** | 9, 18, 28, 40, 44, 45, 46 | CompDC, CompGrn, CompMultiGrn, CompRet |

**Data sources per column:**
- **DC** (Delivery Challan): `Trs_Del1` + `Trs_Del2` + `Trs_Del3` — outgoing fabric
- **GRN** (Goods Receipt): `Trs_Grn1` + `Trs_GRN2` where `GRNType='Process'` — incoming processed fabric
- **MultiGrn**: `Trs_MultiPrs_Grn1/2/3` — multi-process GRN receipts
- **Ret** (Return): `Trs_Grn1` + `Trs_GRN2` where `GRNType='Process Return'` — process returns

#### SP_OrderStatus_1 (@Ordid, @Dt, @Dt1) — Knitting Department Detail

Detailed status for the **knitting stage only** (DeptId = 4), returning:
- `orderqty` — Required kgs from `Pro_ReqKnitt`
- `yarnrec` — Yarn received (Purchase GRN, Dept 1/2)
- `dckgs` — DC kgs sent to knitting
- `reckgs` — Process GRN kgs received back
- `retkgs` — Process return kgs
- `salesqty` — Fabric sales delivery kgs

Groups by Jobno, Finyear, Buyer, Color, Fabric, Count, Mill, OrdDate.

#### SP_OrderStatus_2 — Washing/Dyeing Stage Detail

Same structure as `_1` but for departments 7, 19, 30, 41, 42 (washing/dyeing group).

#### SP_OrderStatus_3 — Compacting Stage Detail

Same structure for departments 9, 18, 28, 40, 44, 45, 46 (compacting/finishing group). Also tracks fabric sales delivery (`TrType=2, YF='F', Prs_Dept=-1`).

### 10.2 FrmOrdProdTrack — Production Tracking

Tracks piece-level production progress for an order — showing how many pieces have been produced at each stage (cutting, sewing, finishing, packing, despatch).

### 10.3 FrmOrderDisplayDaysSetting — Display Days Configuration

Configuration form that sets the number of days to display in order status views — controls time-based filtering for status dashboards.

---

## 11. Order Registers & Reports

### 11.1 FrmOrderRegister — Standard Order Register

The primary order listing/report form. Drives the `Vue_Rpt_OrderReg` view (created by `SP_Vue_OrderinHand`).

**Filter criteria:**
- Order type (Order/Sample/Trading/Domestic)
- Completion status (Running/Completed/Amended)
- Date range (by delivery date or order date)
- Buyer, Merchandiser, Exporter/Unit
- Season, Style Number
- IO Number (Order ID)
- Sort order: Ascending/Descending by IO Number

**Backed by SP_Rpt_OrderRegColor** — order register with color-level detail:
- Reads from `Vue_Rpt_OrderColor` view
- Joins with `VueDespatchColorStock` for color-wise despatch data
- Supports all filter combinations via dynamic SQL

### 11.2 FrmOrderRegister_Spl — Special Order Register

Variant register with additional special filtering criteria or different report layout. Uses similar underlying views.

### 11.3 frmordwiseregregister — Order-wise Register

Generic register grouped by order, showing aggregate quantities and values per order.

### 11.4 FrmOrderwisePcsReg — Order-wise Pieces Register

Focused on piece-goods tracking per order — despatch pieces, balance pieces, production status at piece-level granularity.

---

## 12. Order Close & Completion

### FrmOrderClose

Form for closing/completing orders:

**Workflow:**
1. Select order(s) to close
2. System validates — checks for open DCs, pending GRNs, unbilled deliveries
3. Sets `OrderMas.Completed = 1`
4. Updates `ST_Ord_inHand.completed` via `Sp_MR_OrdInHand`

**Business rules:**
- Completed orders are excluded from production planning workflows
- Order-in-hand reports show completed orders as 'C'
- Once completed, further transactions (DC, GRN, production entry) are blocked

### FrmOrderDespatchCompletion

Marks order despatch as complete at the style level:

**Sets:**
- `OrderStyleDtl.StyleWise_Despatch_Completion = 1`

This allows the order to remain "Running" for other processes (billing, costing) while marking despatch as finished. Used by order-in-hand views to filter/label completed dispatches.

---

## 13. Order Grouping & References

### frmOrderGroup

Groups multiple orders under a common `grpref` (group reference) code. This is used for:
- Consolidating related orders from the same buyer
- Group-level reporting (all orders for a buyer PO)
- Cross-order fabric/material sharing

### FrmOrderRef

Manages order cross-references — linking orders to external reference numbers, buyer PO revisions, or related internal orders.

---

## 14. Order Value & Currency Calculations

Order value is calculated differently based on exchange rate source:

### Base Order Value Calculation

```
IF OrderMas.CRate > 0 THEN
    OrdValue = ExsQty × CRate          -- Contract rate takes priority
ELSE
    OrdValue = ExsQty × ExchangeRate    -- From Mas_Fcy.ExchangeRate
```

Where:
- `ExsQty` = Total excess quantity (OrderQty + excess %) from `Vue_Rpt_OrdExcessQtywithSaleRate`
- `CRate` = Contract exchange rate (set per order, overrides currency default)
- `ExchangeRate` = Currency master exchange rate

### Sale Rate Determination (RateFor field)

The `OrderStyleDtl.RateFor` field controls how sale rates are resolved:

| RateFor | Meaning | Rate Source |
|---------|---------|------------|
| `'S'` | Style-level rate | `OrderStyleDtl.SaleRate` — single rate for entire style |
| `'C'` | Color-level rate | `OrderQtyDtl.SaleRate` grouped by CmbClrID |
| `'R'` | Row-level rate | `OrderQtyDtl.SaleRate` per each size/color row |
| `'Z'` | Size-level (default) | `OrderQtyDtl.SaleRate` per size |

### Forward Exchange Rate

`OrderMas2.FwdCtRate` — Forward contract exchange rate. Used for orders where the exchange rate is locked via a forward contract with a bank. Reported as `ForwardExRate` in order registers.

### Total Invoice Value (SP_Qry10)

```sql
TotalInvAmt = SUM(Qty × Rate × ExRate)
```

Where:
- `Qty` = Sum of `Ship_InvDet.Qty` per style
- `Rate` = Average rate from `OrderStylewiseCost` joined with invoice
- `ExRate` = Exchange rate (from invoice or order)
- Source tables: `OrderStylewiseCost`, `Ship_InvDet`, `Ship_InvMas`

### Despatch Value Calculation (Sp_MR_OrdInHand)

Despatch value depends on `RateFor`:

**For RateFor = 'S' (style-level):**
```
DespValueINR = SaleRate × ΣPcs × CRate
DespValue_INFCY = SaleRate × ΣPcs
```

**For RateFor = 'C' (color-level):**
```
DespValueINR = ΣColor(ColorRate × ColorPcs × CRate)
DespValue_INFCY = ΣColor(ColorRate × ColorPcs)
```

Where rates come from `OrderStyleDtl.SaleRate` (style-level) or `OrderQtyDtl.SaleRate` grouped by `CmbClrID` (color-level).

---

## 15. Order vs Despatch Summary

### SP_Vue_OrdVsDespatch_Summary (+ _Withoutlot)

Creates/alters the `Vue_OrdVsDespatch_Summary` view comparing ordered vs. shipped quantities.

**Calculated fields:**

| Field | Formula |
|-------|---------|
| `OrderQty` | SUM(OrderQtyDtl.OrderQty) per style |
| `OrdAmt` | SUM(OrderQty × SaleRate) |
| `ExcQty` | SUM(CutPlanQty) — includes excess % |
| `OrdExcAmt` | SUM(CutPlanQty × SaleRate) |
| `DesPcs` | SUM(VueDespatchStock.Pcs) — actual dispatched pieces |
| `AvgRate` | SUM(DesPcs × SaleRate) / SUM(DesPcs) |
| `DesAmt` | SUM(DesPcs × SaleRate) |
| `BalAmt` | OrdAmt − DesAmt |
| `BalQty` | OrderQty − DesPcs |

**EntryOption handling:**
- EntryOption 1: Joins `OrderQtyDtl` with `VueDespatchStock1` on ordid/styleno/styleid/colid/sizeid/lotno
- EntryOption 2: Joins `OrdQtyClrDtl` with `VueDespatchStock1` on ordid/styleno/styleid/CmbClrID/sizeid/lotno
- Two SQL blocks UNIONed together

**_Withoutlot variant:** Omits lot-level matching — aggregates across all lots.

---

## 16. Order History Ledger

### SP_OrderHistoryLedger (@OrdID, @IPAddress)

Complete I/O history ledger for an order showing all DC and GRN transactions across all process departments.

**Returns:**
- Exporter name, order details (Jobno/Finyear/BuyOrdNo)
- Transaction type (DC / GRN / Cutting ACK)
- Department name and sequence
- DC details: DCNo, DCFinyear, DcDate, DcKgs, DcBags, DcMtr, DItemDesc, Dia
- GRN details: GrnNo, GrnFinyear, GrnDate, RecKgs, RecBags, RecMtr, GItemDesc, RecDia
- UOM, close flag, sub-process, external GRN reference
- Job work number/finyear, merchandiser, buyer, delivery date
- Department semi-finish flag, PcsPart count

**Key tables:**
- `TempIoHisLedger` — pre-populated temporary table (populated by the calling form)
- `OrderMas` + `OrderMas2`, `Mas_Dept`, `OrdSeq` (for department sequence)
- `Mas_Exporter`, `Mas_Buyer`, `Mas_Merchandiser`
- `Order_PartDtl` (for PcsPart count)
- `TmpUom` (for multi-UOM display)

**Sorting:** By department sequence (`Mas_Dept.OrderSno`), then by transaction serial number, DC number, GRN number.

### SP_OrderHistoryLedger_Others

Variant for "other" order types — similar structure with different filtering.

---

## 17. Order-in-Hand Views

The order-in-hand views are the most complex SQL constructs in FiberPro. They create/alter the `Vue_Rpt_OrderReg` view used by order registers.

### SP_Vue_OrderinHand Family

| Variant | Description |
|---------|------------|
| `SP_Vue_OrderinHand` | Base — single company, joins VueDespatchStock2 |
| `SP_Vue_OrderinHand_1` | Variant with additional filters |
| `SP_Vue_OrderinHand_ALL` | All companies, all RateFor modes (Z, C, R, S), joins VueDespatchStock3 by size/color |
| `SP_Vue_OrderinHand_ALL_1` | All companies, variant 1 |
| `SP_Vue_OrderinHand_ALL_12` | All companies, variant with different grouping |
| `SP_Vue_OrderinHand_SaleRate` | Includes sale rate in calculations |
| `SP_Vue_OrderinHand_SaleRate_1` | Sale rate variant 1 |

### View Structure (Vue_Rpt_OrderReg)

The generated view contains these key fields:

| Field | Source | Description |
|-------|--------|-------------|
| `OrdId` | OrderMas | System order ID |
| `Jobno` / `Finyear` | OrderMas | IO number display |
| `BuyOrdNo` / `BuyordDt` | OrderMas | Buyer PO reference |
| `OrdDate` / `DelDt1` / `ActDelDt` | OrderMas/2 | Dates |
| `ShortBuyer` / `BuyerName` | Mas_Buyer | Buyer display |
| `MerchName` | Mas_Merchandiser | Merchandiser |
| `ShortExp` / `ExporterName` / `ExpID` | Mas_Exporter | Company/unit |
| `SeasonName` / `SeasonId` | Mas_Season | Season |
| `FcyName` | Mas_Fcy | Currency |
| `StyleNo` / `StyleDesc` | OrderStyleDtl / Mas_StyleDesc | Style info |
| `Orderqty` | OrderMas | Header-level total qty |
| `StyleQty` | SUM(OrderQtyDtl.OrderQty) | Style-level total qty |
| `SaleRate` | AVG(SaleRate) | Average sale rate |
| `OrdValue` | ExsQty × (CRate or ExchangeRate) | Order value |
| `Fabric` | OrderStyleDtl.Fabric1 | Fabric description |
| `CompFlg` | Completed → 'C'/'R'/'A' | Completion label |
| `StyleCompFlg` | StyleWise_Completion → 'C'/'R'/'A' | Style completion label |
| `EntryOption` | OrderStyleDtl | 1 or 2 |
| `ForwardExRate` | OrderMas2.FwdCtRate | Forward exchange rate |
| `FctryID` / `FctryName` | MasFactory (alias of Mas_Exporter) | Production factory |
| `DespatchPcs` | VueDespatchStock2/3 | Despatched pieces count |
| `DespatchDt` | VueDespatchStock | Last despatch date |
| `BrandName` | Mas_Brand | Brand (in _ALL variants) |
| `Amount` | (StyleQty − DespatchPcs) × SaleRate | Balance amount (in _ALL) |
| `DespAmount` | DespatchPcs × SaleRate | Despatch amount (in _ALL) |

### RateFor-based UNION Blocks (SP_Vue_OrderinHand_ALL)

The `_ALL` variant generates **eight** UNION blocks — one for each combination of:
- EntryOption: 1 (OrderQtyDtl) or 2 (OrdQtyClrDtl)
- RateFor mode: Z (size), C (color), R (row), S (style)

Each block uses different join keys against `VueDespatchStock3`:
- RateFor='Z': Groups by SizeId
- RateFor='C': Groups by ColID (EntryOption=1) or CmbClrID (EntryOption=2)
- RateFor='R': Groups by SizeId + ColID/CmbClrID
- RateFor='S': No size/color grouping — style-level totals

### Denormalized Order-in-Hand Table (ST_Ord_inHand)

`Sp_MR_OrdInHand` maintains the `ST_Ord_inHand` table as a denormalized cache for fast reporting:

**Parameters:** @OrdId, @StyleNo, @LotNo, @StyleQty, @CutPlanQty, @DespatchPcs, @NewFlg, @EntryFlg

**Operations:**
- `NewFlg='Y'`: INSERT new row with order/buyer/season/merch/rates
- `EntryFlg='OR'`: UPDATE order quantities and master fields
- `EntryFlg='DES'`: UPDATE despatch pieces count
- `EntryFlg='DEL'`: SUBTRACT from despatch pieces (for despatch reversal)

**Despatch value calculation** depends on `RateFor`:
- Style-rate ('S'): `SaleRate × Pcs × CRate`
- Color-rate ('C'): `ColorRate × ColorPcs × CRate` (summed per color)

### SP_Vue_Order_in_Hand (+ _SaleRateWise, _SaleRateWise_1)

Alternative order-in-hand views with different grouping. `_SaleRateWise` variants include sale rate in the grouping key for rate-stratified reports.

---

## 18. Style Change Workflow

### SP_StyleChange (@Ordid, @Styleno, @NewStyleno, @UserId)

Renames a style number across all related tables in a single transaction. This is a **cascading update** that touches over 60 tables.

**Logged to:** `Trs_StyleChangeLog` (Id, Dt, OrdId, StyleNo, NewStyleNo, UserId)

**Tables updated (in order):**

1. **Order tables:** OrderStyleDtl, OrderQtyDtl, Order_PartDtl, OrdQtyClrDtl, OrdSizeMas, OrdStyle, OrderLotRateDtl, OrderStylewiseCost, OrdProgPcsWgt, OrderStyleImage, OrderStyleImageAcc, OrderStyleImgDtl, OrderQtyDtl_Amend, OrdQtyClrDtl_Amend, Ord_GramDtl, OrderAccImgDtl, OrderProgQty, Order_Addl_color, Order_Addl_Lot, Order_Addl_Size, Order_Addl_RatioDtl, Order_Addl_color_CompDet

2. **Program tables:** Prog_ClrComb, Prog_Component, PartDefine, Print_Design, Prog_Design, Prog_ClrDtl, Prog_Comments, Prog_DiaChange, Prog_InputPanels, Prog_PanelEntry, Prog_ReqCalTWrk, Prog_YTwist_MAs, Prog_AccMas

3. **Requirement tables:** Pro_ReqYarn, Pro_ReqKnitt, Pro_ReqKnitt_Combowise, Pro_ReqKnitt_Det, Pro_ReqYarn_ComboWise, Pro_ReqYarn_Det, Pro_ReqActual, Pro_ReqJob, Pro_ReqJob_1

4. **Duplicate/backup tables:** Pro_ReqYarn_Duplicate, Pro_ReqKnitt_Duplicate, PartDefine_Duplicate, Prog_ClrComb_Duplicate, Prog_Component_Duplicate, Prog_Design_Duplicate

5. **Accessories:** PRO_AccJobReq, PRO_AccReq, PRO_AccReq_ComboWise, PRO_AccReq_GreyClrDtl, Prod_CutComponents

6. **Production:** Pro_Prod_BitCutRate, Pro_Prod_Panelwiserate, Pro_Prod_PartwiseRate, Pro_ProdPros, PROD_SEQUENCE, Prod_Slno, Prod_Source_Operation, Production_Started_Old_OrderList

7. **Auto-updates `OrderMas2.StyleNo`** with concatenated list of all styles in the order

**Transaction safety:** Entire operation runs inside `BEGIN TRANSACTION` (but no explicit COMMIT/ROLLBACK seen — likely handled by the application).

---

## 19. Program Copy (Order Data Duplication)

### SP_CpyPrgmDet (@Ordid, @StyleNo)

Copies program details from an order/style into `_Duplicate` backup tables for restoration or reference:

**Tables copied:**
- `Prog_ClrComb` → `Prog_ClrComb_Duplicate` (color combinations)
- `Prog_Component` → `Prog_Component_Duplicate` (components)
- `Prog_Ycns` → `Prog_Ycns_Duplicate` (yarn consumption)
- `Prog_cns` → `Prog_cns_Duplicate` (consumption per size)
- `Prog_PrsLoss` → `Prog_PrsLoss_Duplicate` (process loss)
- `PartDefine` → `PartDefine_Duplicate` (part definitions)
- `Prog_Design` → `Prog_Design_Duplicate` (designs, filtered DeptID=10)
- `Pro_ReqYarn` → `Pro_ReqYarn_Duplicate` (yarn requirements)
- `Pro_ReqKnitt` → `Pro_ReqKnitt_Duplicate` (knitting requirements)

This enables "undo" of program changes by restoring from `_Duplicate` tables, or re-using a proven program for a new order.

---

## 20. Sales Invoicing (Order-linked)

Orders drive the invoicing workflow. Key forms:

### FrmCommericalInv_New — Commercial Invoice

Creates commercial invoices for export orders:
- Links to `Ship_InvMas` (invoice header) and `Ship_InvDet` (invoice detail)
- References `OrderMas` for order details
- Calculates invoice amount: `SUM(Qty × Rate × ExRate)` (from SP_Qry10)
- Supports multiple styles per invoice
- Handles consignee, exchange rates, FCY conversion

### frmDelCumInv — Delivery Cumulative Invoice

Cumulative invoice combining multiple delivery challans:
- Aggregates DCs for an order into a single invoice
- Used for consolidated billing

### frmSalINV — Sales Invoice (Domestic)

Sales invoice for domestic fabric sales:
- Uses `SP_SalesInv` for GST calculation
- Reads `Trs_Del1/2/4` + `StockTable` + `Mas_Fabric` + `Mas_HSN`
- Calculates:
  - Amount = Kg × Rate (if RateUom='KGS') or Mtr × Rate (if meters)
  - GST: CGSTper, SGSTper, IGSTper from `Trs_Del4`
  - Branded vs non-branded handling (`BrandedFlag`)
  - State comparison for SGST vs IGST determination

### frmPieceInv / frmPieceInv_1 — Piece-goods Invoice

Invoices for piece-goods (garments) tied to orders.

---

## 21. Order-related Stored Procedures Summary

| Procedure | Purpose | Key Tables |
|-----------|---------|-----------|
| `SP_Vue_OrderinHand` (7 variants) | Creates Vue_Rpt_OrderReg view for order register | OrderMas/2, OrderStyleDtl, OrderQtyDtl, OrdQtyClrDtl, VueDespatchStock* |
| `SP_Vue_OrdVsDespatch_Summary` (2 variants) | Order-vs-despatch summary view | Same + VueDespatchStock1 |
| `SP_Vue_Order_in_Hand` (3 variants) | Alternative order-in-hand view | Similar to above |
| `SP_OrderStatus` | Fabric processing status per stage | Trs_Del1/2/3, Trs_Grn1/2, Trs_MultiPrs_Grn*, StockTable |
| `SP_OrderStatus_1` | Knitting stage detail | Pro_ReqKnitt, Trs_Del*, Trs_Grn*, Trs_Po* |
| `SP_OrderStatus_2` | Washing/dyeing stage detail | Same with Dept 7,19,30,41,42 |
| `SP_OrderStatus_3` | Compacting stage detail | Same with Dept 9,18,28,40,44,45,46 |
| `SP_OrderHistoryLedger` (2 variants) | Complete I/O history ledger | TempIoHisLedger, OrderMas, Mas_Dept, OrdSeq |
| `SP_StyleChange` | Cascade rename style across 60+ tables | All order/program/requirement tables |
| `SP_CpyPrgmDet` | Copy program details to backup tables | Prog_*, Pro_Req*, PartDefine |
| `Sp_MR_OrdInHand` | Maintain denormalized ST_Ord_inHand | ST_Ord_inHand, OrderMas, OrderQtyDtl, TRS_PCS1/2, OrderStyleDtl |
| `SP_Qry10` | Total invoice amount for an order | OrderStylewiseCost, Ship_InvDet/Mas |
| `SP_Rpt_OrderRegColor` | Order register with color detail | Vue_Rpt_OrderColor, VueDespatchColorStock |
| `SP_SalesInv` | Sales invoice GST calculation | Trs_Del1/2/4, StockTable, Mas_Fabric, Mas_HSN |
| `SP_InvQry1` | Invoice query with GST detail | Same as SP_SalesInv + Mas_Buyer state handling |
| `Sp_ShipmentSample` | Shipment sample pieces entry | Trs_Pcs2 (UPSERT/DELETE) |
| `SP_Vue_OrderStyleWiseCost` | Order-style-wise cost view | OrderStyleWiseCost |
| `SP_Vue_SalesInvoice` (5 variants) | Sales invoice views | Trs_Salinv, Trs_Del*, OrderMas, SuppOrdMas |
| `SP_SizeList` | Size list for an order/style | OrderMas, OrderQtyDtl, OrdSizeMas, Mas_Size |

---

## 22. Order-related Reports Catalog

### Stimulsoft Reports (.mrt)

| Report | Description |
|--------|------------|
| `OrderSheetRegFab.mrt` | Order sheet register — fabric |
| `OrderSheetRegYarn.mrt` | Order sheet register — yarn |
| `FabSalesDC_SGST.mrt` | Fabric sales DC with SGST |
| `FabSalesDC.mrt` | Fabric sales DC |
| `FabSalesDCCumInv.mrt` | Fabric sales cumulative invoice |
| `Form_JJ.mrt` | Order form (JJ format) |
| `PcsDespatch.mrt` / `PcsDespatch_Large.mrt` | Pieces despatch |
| `PcsShipSample.mrt` | Pieces shipment sample |

### Crystal Reports (.rpt)

| Report | Description |
|--------|------------|
| `Rpt_AccOrderwiseReqRegister.rpt` | Accessories order-wise requirement register |
| Various `Rpt_*` files | Module-specific reports consuming order data |

---

## 23. Cross-Module Dependencies

The Order module is the **central reference point** for nearly every other module:

| Dependent Module | How It Uses Orders |
|-----------------|-------------------|
| **Masters** | Orders reference Mas_Buyer, Mas_Party, Mas_Fabric, Mas_Color, Mas_Size, Mas_Merchandiser, Mas_Exporter, Mas_Season, Mas_Fcy, Mas_StyleDesc, Mas_Part, Mas_Brand |
| **Procurement** | Purchase orders (Trs_Po1/2) link to OrderMas.OrdId; PO balance tracking per order |
| **Inventory** | StockTable.OrdId links stock items to orders; stock queries filter by order |
| **Cutting/Panels/Pieces** | All cutting, panel production, and piece goods transactions reference OrdId. CutPlanQty drives cutting quantities |
| **Production** | Trs_ProdEntry, Prod_Sequence, Pro_Prod_PartwiseRate all keyed on OrdId/StyleNo. Production quantities derived from order quantities |
| **Dispatch** | Trs_Del2.OrdId links every DC to an order; Trs_Pcs1.Ordjobno links piece deliveries; VueDespatchStock* views aggregate by order |
| **Billing/GST** | All invoices (Ship_InvDet, Trs_SalInv) reference OrdId. Bill-to-be value calculated per order |
| **Costing** | OrderStylewiseCost tracks costs per order/style. Budget vs actual compared at order level. Daily Unit P&L aggregates by order |
| **Job Work** | Supplier orders (SuppOrdMas) link back to main OrderMas. Job order balance tracked per order |
| **Program Planning** | Prog_ClrComb, Pro_ReqYarn, Pro_ReqKnitt — all keyed on OrdId/StyleNo. Program data drives fabric/yarn requirement calculations |

### Key Views Referenced

| View | Created By | Purpose |
|------|-----------|---------|
| `Vue_Rpt_OrderReg` | SP_Vue_OrderinHand* | Order register (main) |
| `Vue_Rpt_OrderColor` | Related SP | Order register with color detail |
| `Vue_OrdVsDespatch_Summary` | SP_Vue_OrdVsDespatch_Summary | Order vs despatch comparison |
| `Vue_Rpt_OrdExcessQtywithSaleRate` | (view) | Excess quantity with sale rate |
| `Vue_OrderStyleWiseCost` | SP_Vue_OrderStyleWiseCost | Style-wise cost aggregation |
| `VueDespatchStock` / `VueDespatchStock1` / `VueDespatchStock2` / `VueDespatchStock3` | (views) | Despatch stock at various granularity levels |
| `VueDespatchColorStock` | (view) | Despatch stock by color |

### Key Triggers

| Trigger | Table | Relevance |
|---------|-------|-----------|
| `Trg_ST_Ord_inHand_Update` | ST_Ord_inHand | Dirty-flag mechanism for order-in-hand sync |
| `Trg_ST_Cost_OrderDtl` | ST_Cost_OrderDtl | Cost tracking dirty flag per order/style |
| `Trg_MR_ProcessDetails` | (process tables) | Process detail updates linked to orders |
| `Trg_OrderStyleImgDtl_Update` | (naming anomaly — targets Mas_Part) | Documented as duplicate of Trg_Mas_Part_Update |

---

*End of Module 2 — Order Management & Sales*
