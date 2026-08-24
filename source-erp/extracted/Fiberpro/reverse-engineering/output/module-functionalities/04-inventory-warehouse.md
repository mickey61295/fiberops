# Module 4 — Inventory & Warehouse Management

> **Generated**: 2026-03-15  
> **Source**: 35+ inventory-related forms, ~30 stored procedures (stock reports, godown ops, IO history, roll-level), 8 triggers (CurrentStock, fabric balance, yarn balance, ready-to-cut), 3 key views (VUE_STOCKDTDATE, Vue_StkLedger, Vue_PcsStockDtl_PART), 20+ report templates (.mrt/.rpt), 4 report code-behind files (.cs)  
> **Foundation References**: database-schema.md, stored-procedures-analysis.md, triggers-and-views-analysis.md, formulas-and-calculations.md, 01-masters-configuration.md, 03-procurement-supplier.md

---

## Table of Contents

1. [Module Overview](#1-module-overview)
2. [Forms Inventory](#2-forms-inventory)
3. [Data Model — Core Stock Tables](#3-data-model--core-stock-tables)
   - 3.1 StockTable — Item Master for Stock
   - 3.2 CurrentStock — Live Position per Godown
   - 3.3 CurrentStock_RollDtl — Roll-Level Detail
   - 3.4 Pcs_StockTable / Pcs_StockTableQty — Piece Goods Stock
   - 3.5 Panel_StockTable / Panel_StockTableQty — Panel Stock
   - 3.6 Trs_Opening — Opening Stock Entries
   - 3.7 Summary Tables (ST_ProgBalance_Fabric, ST_ProgBalance_Yarn, ST_Ord_inHand)
   - 3.8 Temporary Report Tables (Temp_StkReports, TempAccStock, Temp_PceReg, BI_*)
4. [Stock Categories & Material Types](#4-stock-categories--material-types)
   - 4.1 Yarn Stock (YF = 'Y')
   - 4.2 Fabric Stock (YF = 'F')
   - 4.3 Accessories Stock (YF = 'A')
   - 4.4 Piece Goods Stock
   - 4.5 Panel Stock
5. [Stock Registers](#5-stock-registers)
   - 5.1 FrmStockRegister — Fabric Stock Register (Primary)
   - 5.2 FrmStockRegister_SplRpt — Special Report Variant
   - 5.3 FrmStockRegister_Style — Style-wise Stock Register
   - 5.4 FrmStockRegister_StylePcs — Style-wise Pieces Register
   - 5.5 FrmYarnStockRegister — Yarn-Specific Register
   - 5.6 FrmFabricStockRegister — Fabric-Specific Register
   - 5.7 FrmAccStockReg — Accessories Stock Register
   - 5.8 FrmGeneralStockRegister — General Stock Register
   - 5.9 FrmItemwiseStockRegister — Item-wise Stock Register
   - 5.10 FrmPieceStock / FrmPieceStockAll — Piece Goods Stock
   - 5.11 FrmRejPieceStock — Rejected Pieces Stock
6. [Stock Viewing & Drill-Down](#6-stock-viewing--drill-down)
   - 6.1 frmStockView — Real-Time Stock Display
   - 6.2 frmAccStockShow — Accessories Stock Detail
   - 6.3 frmfabstockshow — Fabric Stock Detail
   - 6.4 frmYarnStockShow — Yarn Stock Detail
7. [Stock Ledger & IO History](#7-stock-ledger--io-history)
   - 7.1 FrmStockLedger — Movement Ledger by Stock Item
   - 7.2 FrmIoHistoryReg / FrmIoHistoryReg_New — IO History Register
   - 7.3 SP_Rpt_AccStockItemLedger — Accessories Item Ledger
8. [Opening Stock Entry](#8-opening-stock-entry)
   - 8.1 frmOpeningStock — Yarn / Fabric / Accessories Opening
   - 8.2 frmOpeningStock_CompWise — Component-wise Opening
   - 8.3 frmPcsStagewiseOpeningStock — Piece Goods Stage-wise Opening
9. [Stock Adjustments](#9-stock-adjustments)
   - 9.1 frmStockAdjustment — Yarn / Fabric Adjustment
   - 9.2 frmStockAdjustment_Domestic — Domestic Order Variant
   - 9.3 frmPcsStockAdjustmentEntry — Piece Goods Adjustment
10. [Godown (Warehouse) Management](#10-godown-warehouse-management)
    - 10.1 FrmGodownMaster — Godown Setup
    - 10.2 FrmGoDownAck — Godown Acknowledgement (Fabric/Yarn)
    - 10.3 FrmGodownTransferAck — Godown Transfer Acknowledgement
    - 10.4 FrmChangeGodown — Change Godown for Existing Stock
    - 10.5 FrmPcsGodTransfer — Piece Goods Godown Transfer
    - 10.6 Frm_GoDownSel — Godown Selection Dialog
11. [Stock Transfer](#11-stock-transfer)
    - 11.1 FrmStkTransfer — Inter-Order Stock Transfer
12. [Roll Split & Weight Scale](#12-roll-split--weight-scale)
    - 12.1 FrmRollSplit / Frm_RollSplit — Roll Splitting
    - 12.2 FrmWeightScale_Integration — Weight Scale Integration
13. [Piece Stock Lifecycle & Data Flow](#13-piece-stock-lifecycle--data-flow)
14. [Current Stock Update Mechanism](#14-current-stock-update-mechanism)
    - 14.1 StockTable + CurrentStock Insert/Update Logic
    - 14.2 Trg_CurrentStock_Update Trigger
    - 14.3 Roll-Level Stock (Sp_currentstock_RollDtl)
    - 14.4 Piece Stock CRUD Procedures
15. [Program Balance Integration](#15-program-balance-integration)
    - 15.1 Fabric Program Balance (ST_ProgBalance_Fabric)
    - 15.2 Yarn Program Balance (ST_ProgBalance_Yarn)
    - 15.3 Triggers: TRG_FAB_BALANCE_DEL, TRG_YARN_BALANCE_DEL, etc.
16. [Ready-to-Cut Stock Flow](#16-ready-to-cut-stock-flow)
17. [BI / Commando Integration Tables](#17-bi--commando-integration-tables)
18. [Inventory Stored Procedures Summary](#18-inventory-stored-procedures-summary)
19. [Inventory Reports Catalog](#19-inventory-reports-catalog)
20. [Key Views Used by Inventory](#20-key-views-used-by-inventory)
21. [Cross-Module Dependencies](#21-cross-module-dependencies)

---

## 1. Module Overview

The Inventory & Warehouse module is the **central stock engine** of FiberPro. It maintains real-time stock positions for all material categories — yarn, fabric, accessories, piece goods, and panels — across multiple godowns (warehouses) and companies. Every procurement receipt, production output, delivery, transfer, and adjustment transaction ultimately updates the stock tables managed by this module.

**Key characteristics:**
- **Five material streams tracked in parallel**: Yarn (YF='Y'), Fabric (YF='F'), Accessories (YF='A'), Piece Goods (Pcs_StockTable), and Panels (Panel_StockTable)
- **Dual-layer stock architecture**: `StockTable` holds item identity (what the material is), while `CurrentStock` holds the live position (how much is in which godown). These are linked by `StockID`.
- **Roll-level granularity**: Fabric stock can optionally be tracked down to individual rolls via `CurrentStock_RollDtl`, managed by `Sp_currentstock_RollDtl`
- **Size-color quantity tracking for piece goods**: `Pcs_StockTableQty` stores quantities broken down by color × size × good/reject flag
- **Multi-company scope**: All stock tables are keyed by `Coycode` (company ID from `Mas_Exporter.ExpID`), enabling multi-company stock isolation
- **Godown-based partitioning**: Stock is physically partitioned by `GodID` (godown), with godown transfer and acknowledgement workflows to move stock between warehouses
- **Automatic balance maintenance**: Delivery, GRN, and ready-to-cut transactions fire triggers (`TRG_FAB_BALANCE_DEL`, `TRG_YARN_BALANCE_DEL`, `TRG_FAB_BALANCE_RCUT`) that update program balance summary tables in real time
- **IP-address-scoped temp tables**: Stock reporting procedures write results into session-scoped temp tables (Temp_StkReports, TempAccStock) keyed by `IPAddress` and `StkGrpID` to support concurrent report generation by multiple users

---

## 2. Forms Inventory

| # | Form Class Name | Purpose |
|---|----------------|---------|
| 1 | `FrmStockRegister` | Primary fabric stock register — filters by company, dept, order type/status, generates report |
| 2 | `FrmStockRegister_SplRpt` | Special report variant of stock register with custom grouping |
| 3 | `FrmStockRegister_Style` | Style-wise stock register — groups stock by style number |
| 4 | `FrmStockRegister_StylePcs` | Style-wise piece stock register — combines fabric + piece stock view |
| 5 | `FrmYarnStockRegister` | Yarn-specific stock register with count grouping |
| 6 | `FrmFabricStockRegister` | Fabric-specific stock register with fabric/dia/GSM details |
| 7 | `FrmAccStockReg` | Accessories stock register — grouped by category, description, color, size |
| 8 | `FrmGeneralStockRegister` | General/miscellaneous stock register |
| 9 | `FrmItemwiseStockRegister` | Item-wise (cross-order) stock register |
| 10 | `FrmPieceStock` | Piece goods stock by stage, style, lot |
| 11 | `FrmPieceStockAll` | All-stage piece stock consolidated view |
| 12 | `FrmRejPieceStock` | Rejected piece goods stock (quality failures) |
| 13 | `frmStockView` | Real-time stock display with cross-tab/pivot view |
| 14 | `frmAccStockShow` | Accessories stock detail pop-up |
| 15 | `frmfabstockshow` | Fabric stock detail pop-up |
| 16 | `frmYarnStockShow` | Yarn stock detail pop-up |
| 17 | `FrmStockLedger` | Movement-level stock ledger — all in/out for a stock item |
| 18 | `FrmIoHistoryReg` | IO (In/Out) history register by order and department |
| 19 | `FrmIoHistoryReg_New` | Updated version of IO history register |
| 20 | `frmOpeningStock` | Opening stock entry for yarn/fabric/accessories at fiscal year start |
| 21 | `frmOpeningStock_CompWise` | Component-wise opening stock entry |
| 22 | `frmPcsStagewiseOpeningStock` | Piece goods stage-wise opening stock entry |
| 23 | `frmStockAdjustment` | Stock adjustment (plus/minus) for yarn/fabric |
| 24 | `frmStockAdjustment_Domestic` | Stock adjustment for domestic orders |
| 25 | `frmPcsStockAdjustmentEntry` | Piece goods stock adjustment entry |
| 26 | `FrmGodownMaster` | Godown master setup (CRUD for Mas_Godown) |
| 27 | `FrmGoDownAck` | Godown acknowledgement for fabric/yarn transfers |
| 28 | `FrmGodownTransferAck` | Godown transfer acknowledgement (confirmation) |
| 29 | `FrmChangeGodown` | Change godown assignment for existing stock items |
| 30 | `FrmPcsGodTransfer` | Piece goods godown transfer entry |
| 31 | `Frm_GoDownSel` | Godown selection dialog (used by other forms) |
| 32 | `FrmStkTransfer` | Inter-order stock transfer (move stock between orders) |
| 33 | `FrmRollSplit` | Roll splitting — split a parent roll into child rolls |
| 34 | `Frm_RollSplit` | Alternate roll split form |
| 35 | `FrmWeightScale_Integration` | Hardware integration — read weights from external weight scale device |

---

## 3. Data Model — Core Stock Tables

### 3.1 StockTable — Item Master for Stock

The `StockTable` is the **identity table** for every stock item in the system. Each row represents a unique combination of material attributes within an order.

| Column | Type | Description |
|--------|------|-------------|
| `StockID` | int (PK) | Unique stock item identifier |
| `OrdID` | int | Link to OrderMas.OrdId — which order this material belongs to |
| `Coycode` | int | Company ID (Mas_Exporter.ExpID) |
| `YF` | char(1) | Material type: 'Y' = Yarn, 'F' = Fabric, 'A' = Accessories |
| `Dept` | int | Processing department (Mas_Dept.DeptID) |
| `FabID` | int | Fabric type (Mas_Fabric.FabID) — for fabric stock |
| `CntID` | int | Yarn count (Mas_Count.CountID) — for yarn & fabric |
| `ColID` | int | Color (Mas_Color.ColID) |
| `DiaID` | int | Dia (Mas_Dia.DiaID) — for fabric |
| `MillID` | int | Mill (Mas_Mill.MillID) — yarn supplier mill |
| `Print_DesignID` | int | Print/design ID (Mas_Design.DesignId) |
| `Gsm` | numeric | GSM (grams per sq meter) |
| `FinGSM` | numeric | Finished GSM |
| `FinDiaId` | int | Finished dia |
| `GG` | varchar | Gauge |
| `LL` | varchar(12) | Loop length |
| `LotNo` | varchar | Lot number |
| `Rate` | numeric(18,3) | Current rate per unit |
| `SubPrsID` | int | Sub-process ID (Mas_SubProcess.ID) |
| `Atype` | int | Accessories type ID (when YF='A') |
| `Ades` | int | Accessories description ID (when YF='A') |
| `Siz` | int | Size ID (when YF='A') |

**Composite natural key** (informal): `{Coycode, OrdID, YF, Dept, FabID, CntID, ColID, DiaID, DesignID, GSM, LL, LotNo, SubPrsID}` for fabric; `{Coycode, OrdID, YF, Dept, CntID, ColID, MillID}` for yarn; `{Coycode, OrdID, YF, Atype, Ades, ColID, Siz}` for accessories.

### 3.2 CurrentStock — Live Position per Godown

`CurrentStock` tracks **how much** of each stock item is in each godown at this moment. Multiple rows per StockID are possible (one per godown per order per style).

| Column | Type | Description |
|--------|------|-------------|
| `StockID` | int (FK→StockTable) | Which stock item |
| `OrdID` | int | Order reference |
| `GodID` | int (FK→Mas_Godown) | Godown where stock is held |
| `StyleNo` | varchar(20) | Style number |
| `Bg` | int | Bags/rolls count |
| `Kg` | numeric(18,3) | Weight in kilograms |
| `Mt` | numeric(18,2) | Length in meters |
| `UpdateFlg` | bit | Dirty flag for sync (Trg_CurrentStock_Update sets to 1 on any change) |

**Primary key**: `{StockID, OrdID, GodID, StyleNo}` (composite)

Every GRN, delivery, transfer, adjustment, and opening transaction updates this table — it is the **single source of truth** for current inventory levels.

### 3.3 CurrentStock_RollDtl — Roll-Level Detail

For fabric stock where roll-level tracking is needed (e.g., roll split, roll-wise dispatch):

| Column | Type | Description |
|--------|------|-------------|
| `OrdId` | int | Order reference |
| `StockId` | int | Stock item |
| `StyleNo` | varchar | Style |
| `RollID` | int | Individual roll identifier |
| `RollKgs` | numeric(18,3) | Weight of this roll |
| `RollMtrs` | numeric(18,2) | Length of this roll |
| `Frm_StockID` | int | Source stock ID (for DeptID=-7 ready-to-cut transfers) |

Managed exclusively by `Sp_currentstock_RollDtl` which handles `+` (add) and `-` (subtract) operations with special logic for DeptID=11 (cutting) and DeptID=-7 (ready-to-cut virtual department).

### 3.4 Pcs_StockTable / Pcs_StockTableQty — Piece Goods Stock

Piece goods have a separate two-tier stock structure:

**Pcs_StockTable** (header):

| Column | Type | Description |
|--------|------|-------------|
| `PcsStockId` | int (PK) | Unique piece stock entry |
| `Coycode` | int | Company |
| `OrdId` | int | Order |
| `StyleNo` | varchar | Style number |
| `StageId` | int | Production stage (Mas_JobWrkComp.Id) |
| `PartId` | int | Part (Mas_Part.PartID) |
| `SeqNo` | int | Production sequence number |
| `GodId` | int | Godown |
| `PartyId` | int | 0 = in-house; >0 = with outsource party |
| `LotID` | int | Lot reference |
| `EmpID` | int | Line/employee ID (for line-level stock tracking) |
| `PcsType` | varchar | 'Piece' or 'Panel' |

**Pcs_StockTableQty** (detail):

| Column | Type | Description |
|--------|------|-------------|
| `PcsStockId` | int (FK) | Links to header |
| `ColId` | int | Color |
| `SizeId` | int | Size |
| `StockQty` | int | Current quantity in pieces |
| `GoodPcsFlag` | char(1) | 'G' = Good, 'M' = Reject/recheck |
| `RejectionTypeId` | int | Type of rejection (0 = none) |
| `RewrkStk` | int | Rework stock quantity |

**Key composite**: `{PcsStockId, ColId, SizeId, GoodPcsFlag, RejectionTypeId}`

### 3.5 Panel_StockTable / Panel_StockTableQty — Panel Stock

Identical structure to piece stock but for garment panels (cut components before assembly):

- `Panel_StockTable`: Header with `{PcsStockId, Coycode, OrdId, StyleNo, StageId, PartId, GodId, LotId, CompID}`
- `Panel_StockTableQty`: Detail with `{PcsStockId, ColId, SizeId, StockQty, GoodPcsFlag, RejectionTypeId, CompID}`

Queried by `SP_PanelAssemblyStock` which calculates minimum available panels across all source stages for assembly.

### 3.6 Trs_Opening — Opening Stock Entries

| Column | Type | Description |
|--------|------|-------------|
| `StockID` | int | Stock item reference |
| `OrdID` | int | Order |
| `Coycode` | int | Company |
| `StyleNo` | varchar | Style |
| `RlsBg` | int | Rolls/bags |
| `Kgs` | numeric(18,3) | Weight |
| `MtrPc` | numeric(18,2) | Meters/pieces |
| `Rate` | numeric(18,3) | Opening rate |
| `GodID` | int | Godown |
| `OpenDt` | datetime | Opening date |
| `Dept` | int | Department |
| `Finyear` | char(2) | Fiscal year |

Opening stock is entered at fiscal year start and is treated as a receipt (In) transaction in the stock ledger view.

### 3.7 Summary Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `ST_ProgBalance_Fabric` | Program balance for fabric per order/dept/material combo | OrdId, DeptId, FabId, ColId, CntId, DesignId, FinDiaId, FinGSM, LL, SubPrsID → ReqKgs/Mtr, DcKgs/Mtr, GRNKgs/Mtr, ReProcessDCKgs/Mtr |
| `ST_ProgBalance_Yarn` | Program balance for yarn per order/dept/color/count | OrdId, StyleNo, DeptId, ColId, CountId → ReqKgs, DcKgs, POKgs |
| `ST_Ord_inHand` | Order-in-hand summary used for MIS/sales views | OrdID, StyleNo → various production/dispatch totals |
| `ST_Acc_Prog_Balance` | Accessories program balance | OrdId, StyleNo, AccType, AccDesc, ColID, SizeID |

### 3.8 Temporary Report Tables

All stock reports use server-side temporary tables scoped by `IPAddress` (client machine IP) and `StkGrpID` (report group ID) to support concurrent multi-user reporting:

| Temp Table | Used By | Columns |
|-----------|---------|---------|
| `Temp_StkReports` | Sp_StockRpt (Y/F), SP_Rpt_StockRegQry1 | StockId, ExporterName, OrdId, BuyerOrdNo, DeptName, CountName, Color, Fabric, Dia, GSM, GG, LL, UOM, Lotno, StkBg, StkKgs, StkMtr, Rate, GodownName, DesignDesc, FinGSM, SubProcess, IPAddress, StkGrpID |
| `TempAccStock` | Sp_StockRpt (A) | Coyname, OrdId, AccDescr, AccDescription, AccColor, AccSize, Qty, UOM, Rate, StyleNo, GodName, Atype, Ades, Siz, ColId, StockId, Coycode, StkGrpID |
| `Temp_PceReg` | Sp_StockRpt (piece goods section) | Coycode, Coyname, OrdId, BuyOrdNo, DeptName, StyleDesc, StyleNo, GodName, StockPcs, DeptID, StkGrpID |
| `TempIoHisRight` | sp_iohistoryright input | Coycode, DCNo, OrdId, DeptName, Pname, ProcessType, TrsType, GrnNo, etc. |
| `TempIoHisLedger` | sp_iohistoryright output | Matched DC↔GRN pairs for IO history report |
| `BI_STKREPORTS` / `BI_ACCSTOCK` / `BI_PCEREG` | Sp_BIStockRpt | Mirrors of Temp_StkReports with GodID for BI/Commando integration |

---

## 4. Stock Categories & Material Types

FiberPro classifies all raw material stock using the `YF` (Yarn/Fabric/Accessories) column in `StockTable`:

### 4.1 Yarn Stock (YF = 'Y')

- **Key attributes**: Count (Mas_Count.CountName), Color, Mill, LotNo
- **UOM**: Kilograms (Kgs), Bags (Bg)
- **Grouping**: By Mas_YarncountGroups (count group) for reporting
- **Stock report columns**: StockId, ExporterName, OrdId, BuyerOrdNo, DeptName, CountName, Color, Mill, StkBg, StkKgs, Lotno, Rate, GodownName

### 4.2 Fabric Stock (YF = 'F')

- **Key attributes**: Fabric type, Dia, GSM, FinGSM, GG (gauge), LL (loop length), Count, Color, Design, SubProcess
- **UOM**: Kilograms, Meters, Bags/Rolls
- **Additional detail**: Roll-level tracking via CurrentStock_RollDtl
- **Stock report columns**: All of yarn's plus Fabric, Dia, GSM, GG, LL, UOM, DesignDesc, FinGSM, SubProcess

### 4.3 Accessories Stock (YF = 'A')

- **Key attributes**: Acc_Type (Mas_Acc.ID), Acc_Desc (Mas_AccDes.ID), Color, Size, Style
- **UOM**: Per-accessory UOM from Mas_Acc.UomId (meters, pieces, dozens, etc.)
- **Grouped by**: AccCategory (Mas_AccCategory.CatID)
- **Rate resolution cascade** (for valuation in Sp_StockRpt):
  1. Opening rate from `Trs_Opening` (AVG per stockid/ordid/coycode/styleno)
  2. PO rate from `Trs_PO5` (AVG per ordid/styleno/atype/ades/clr/siz)
  3. PO rate ignoring color
  4. Transfer-in rate from `Trs_Del1/Del2` (TrType=8, inter-company transfer)
  5. PO rate with FCY exchange rate conversion

### 4.4 Piece Goods Stock

- **Separate table system**: Pcs_StockTable + Pcs_StockTableQty
- **Key attributes**: Stage (Mas_JobWrkComp.Id), Part, Lot, Style, Color × Size matrix
- **Stocks tracked per**: Company × Order × Style × Stage × Part × Lot × Godown × Party(inhouse/outsource)
- **Good vs Reject**: Tracked at detail level via GoodPcsFlag ('G'/'M') and RejectionTypeId
- **Semi-finished vs Finished**: Determined by `Mas_Dept.SemiFinish` flag ('S' = semi, 'F' = finished)

### 4.5 Panel Stock

- **Parallel system to pieces**: Panel_StockTable + Panel_StockTableQty
- **Additional dimension**: Component ID (CompID) — panels represent individual garment components pre-assembly
- **Assembly stock check**: `SP_PanelAssemblyStock` calculates minimum available panels across all source stages for a given style/color/lot/godown combination — this determines how many complete garments can be assembled

---

## 5. Stock Registers

### 5.1 FrmStockRegister — Fabric Stock Register (Primary)

The main stock register form. Used for yarn, fabric, and accessories based on the selected department.

**Filter parameters** (map to `Sp_StockRpt` parameters):
- `@Y_F_A` (char 1): 'Y' = Yarn, 'F' = Fabric, 'A' = Accessories
- `@OrderType` (char 10): 'Order', 'Sample', blank = all
- `@Status` (char 2): '' = all, '0' = open, '1' = completed
- `@Coycode` (int): Company
- `@deptID` (int): Department filter
- `@Ordid` (int): Specific order (0 = all)
- `@GrpID` (int): Report group ID for temp table keying

**Workflow**:
1. User selects company, department, order type, order status, optionally a specific order
2. Form calls `Sp_StockRpt` which populates `Temp_StkReports` (for Y/F) or `TempAccStock` (for A) or `Temp_PceReg` (for piece goods section)
3. If the department is semi-finished or finished (determined by `Mas_Dept.SemiFinish`), the SP also queries `Pcs_StockTable` for piece stock and populates `Temp_PceReg`
4. Form then calls `Sp_Rpt_StkFab` to retrieve the formatted report data
5. Report renders using Stimulsoft templates

**Business rules in Sp_StockRpt**:
- Only shows stock where `SUM(CurrentStock.Kg) > 0 OR SUM(CurrentStock.Mt) > 0` (zero stock excluded)
- Groups by StockId + all material attributes + Godown
- For accessories, resolves rate using the cascade: Opening → PO → PO (no color) → Transfer-in → PO with FCY
- Piece goods section filters by `PartyId=0` (in-house only) and `PcsType='Piece'`

### 5.2 FrmStockRegister_SplRpt — Special Report Variant

Variant of stock register that uses `SP_Rpt_StockRegQry1` instead of `Sp_StockRpt`. This SP accepts a dynamic `@TmpStr` (NVarchar Max) filter clause, allowing the form to construct arbitrary WHERE conditions. Uses `dbo.FN_Add_BoostupPer()` function to apply boost-up percentage to quantities.

### 5.3 FrmStockRegister_Style — Style-wise Stock Register

Groups current stock by style number within each order. Useful for tracking how much raw material is allocated/available per garment style.

### 5.4 FrmStockRegister_StylePcs — Style-wise Pieces Register

Combines fabric-level and piece-level stock into a single style-wise view.

### 5.5 FrmYarnStockRegister

Yarn-specific register. Calls `Sp_StockRpt` with `@Y_F_A='Y'`. Key groupings: ExporterName, OrdId, DeptName, CountName, Color, Mill, LotNo, GodownName. Grouped by `Mas_YarncountGroups.Groupname`.

### 5.6 FrmFabricStockRegister

Fabric-specific register. Calls `Sp_StockRpt` with `@Y_F_A='F'`. Includes all fabric dimensions: FabDesc, Dia, GSM, GG, LL, UOM, DesignDesc, FinGSM, SubProcess.

### 5.7 FrmAccStockReg — Accessories Stock Register

Uses `TempAccStock` populated by `Sp_StockRpt` with `@Y_F_A='A'`. Displays: ExporterName, OrdId, AccDescr, AccDescription, AccColor, AccSize, Qty, UOM, Rate, StyleNo, GodownName.

### 5.8 FrmGeneralStockRegister

General/miscellaneous items register. Similar flow to accessories but for non-categorized items.

### 5.9 FrmItemwiseStockRegister

Cross-order item-wise view. Groups stock by item identity (StockID) across multiple orders, providing a consolidated view of the same material across different production orders.

### 5.10 FrmPieceStock / FrmPieceStockAll

**FrmPieceStock**: Shows piece goods stock at a specific production stage. Queries `Pcs_StockTable` + `Pcs_StockTableQty` joined with `Mas_JobWrkComp` for stage names.

**FrmPieceStockAll**: Consolidated view across all stages. Uses `Vue_PcsStockDtl_PART` view which unions all piece-affecting transactions (issues, receipts, production, transfers, adjustments).

### 5.11 FrmRejPieceStock

Shows only rejected piece goods stock where `GoodPcsFlag='M'` and `RejectionTypeId > 0`. Used for quality tracking and rework planning.

---

## 6. Stock Viewing & Drill-Down

### 6.1 frmStockView — Real-Time Stock Display

Interactive stock view form that shows current stock in a cross-tab or pivot format. Typically opened from other forms (order enquiry, order status) to show real-time stock for a specific order or department.

### 6.2 frmAccStockShow — Accessories Stock Detail

Detail pop-up form. Uses `Accessories_Stock` SP:
```sql
SELECT AccDescription, ColorDesc, SizeDesc, UOM, SUM(Kg) AS QTY, GodName
FROM CurrentStock A
JOIN StockTable B ON A.StockID = B.StockID
JOIN Mas_Acc C ON C.Id = B.Atype
JOIN Mas_AccDes D ON D.ID = B.ADes ...
WHERE B.YF='A' AND A.OrdId = @Ordid AND B.Atype = @ItemType AND A.Kg > 0
GROUP BY GodName, AccDescription, ColorDesc, SizeDesc, UOM
```

### 6.3 frmfabstockshow — Fabric Stock Detail

Similar pop-up for fabric stock, showing per-godown breakdown with fabric attributes.

### 6.4 frmYarnStockShow — Yarn Stock Detail

Similar pop-up for yarn stock, showing per-godown breakdown with count/color/mill/lot.

---

## 7. Stock Ledger & IO History

### 7.1 FrmStockLedger — Movement Ledger by Stock Item

Uses `Vue_StkLedger` view which unions **20 transaction types** into a single chronological ledger:

| TrsTypeNo | TrsType | Movement | Tables |
|-----------|---------|----------|--------|
| 1 | Opening | In | Trs_Opening |
| 2 | Purchase GRN | In | Trs_Grn1/Grn2 (GRNType='Purchase') |
| 3 | Purchase Return | Out | Trs_Del1/Del2 (TrType=4) |
| 4 | Process Delivery | Out | Trs_Del1/Del2 (TrType=1) |
| 5 | Process Receipt | In | Trs_Grn1/Grn2 (GRNType='Process'/'DirectReceipt') |
| 6 | Process Return | In | Trs_Grn1/Grn2 (GRNType='Process Return') |
| 7 | Transfer Out | Out | Trs_Del1/Del2 (TrType=3, TranID>0) |
| 8 | Transfer In | In | Trs_Del1/Del2 (TrType=3, TranID>0) — reverse side |
| 9 | Sales Delivery | Out | Trs_Del1/Del2 (TrType=2) |
| 10 | Sales Return | In | Trs_Grn1/Grn2 (GRNType='Sales Return') |
| 11 | Stock Adjustment Plus | In | Trs_Del1/Del2 (TrType=5, StockAddLess='Add') |
| 12 | Stock Adjustment Minus | Out | Trs_Del1/Del2 (TrType=5, StockAddLess='Less') |
| 13 | Godown Transfer In | In | Trs_Del1/Del2 (TrType=14, Party=target GodID) |
| 14 | Godown Transfer Out | Out | Trs_Del1/Del2 (TrType=14, GodID=source) |
| 15 | CutAck (Cutting Acknowledgement) | In | Trs_Del2.TranID + Trs_CutApr |
| 16 | Unit DC | Out | Trs_Del1/Del2 (TrType=-2) |
| 17 | Unit Return Ack | Out | Trs_Del2.AID + Trs_CutApr (TrType=-2) |
| 18 | Unit Fabric Delivery Return | In | Trs_Grn1/Grn2 (GRNType='FabricRetToUnit') |
| 19 | Return to Lot | In | Trs_Del2.AID + Trs_CutApr (TrType=-2, DelType='R') |
| 20 | Ready-to-Cut In / Out | In/Out | Trs_ReadyToCut1/2 (TrType=20) |

Each row shows: TrsDate, DocNo, Finyear, PartyName/Reference, InBg/Kg/Mtr, OutBg/Kg/Mtr, GodID, Dept.

### 7.2 FrmIoHistoryReg / FrmIoHistoryReg_New — IO History Register

The IO History register provides a **matched DC↔GRN view** for a material's journey through processing departments. It shows for each order and department: what was sent out (DC) and what was received back (GRN), matched pair-by-pair.

**Mechanism** (`sp_iohistoryright`):
1. Pre-populated temp table `TempIoHisRight` contains all receipt (GRN) records for the selected order/department
2. The SP opens a cursor over these records (ordered by grndate, grnno)
3. For each GRN record, it attempts to find a matching DC record in `TempIoHisLedger` where ordid, deptname, pname, and process type match
4. If a match is found, it updates the GRN columns (RecBags, RecKgs, Recmtr, etc.) on that row
5. If no match is found, it inserts a new row with only GRN data (indicating receipt without a prior DC)
6. Matching considers `InputType` and `OutputType` from `Mas_Dept` to determine whether to match on `DItemDesc` (for F→F departments) or just by order/dept/party

**Panel variant** (`sp_iohistorypanelright`): Same logic but includes `CompID` and `CompDescr` for panel-level IO matching.

**Others variant** (`sp_iohistoryright_others`): Uses separate temp tables (`TempIoHisRight_Others`, `TempIoHisLedger_Others`) — likely for inter-company or non-standard transactions.

### 7.3 SP_Rpt_AccStockItemLedger — Accessories Item Ledger

Comprehensive accessories ledger showing the full lifecycle per item per order:

| Column | Source |
|--------|--------|
| ReqQty | Requirement (from Pro_AccReq + shortage) |
| POQty | Purchase order quantity (minus cancellations) |
| RecQty | Received quantity (GRN) |
| DelQty | Delivered / issued quantity |
| RetQty | Return quantity |
| StockQty | Current stock |
| TranOutQty | Transfer out |
| TranInQty | Transfer in |
| ProRetQty | Production return |
| ProRecQty | Production received |
| ShortQty | Shortage |

Uses `Vue_Rpt_AccStockItemLedgerAbs` view (not in SPViews folder — likely defined in application or a separate DB layer) and joins with `PRO_AccReq` (accessories requirement), `OrderQtyDtl`, `OrdSizeMas` for size sequencing.

Applies `dbo.FN_Add_BoostupPer()` to all quantity fields for boost-up percentage adjustment.

---

## 8. Opening Stock Entry

### 8.1 frmOpeningStock — Yarn / Fabric / Accessories Opening

Used at the start of a fiscal year to carry forward closing stock as opening stock.

**Tables affected**:
- `Trs_Opening`: INSERT with StockID, OrdID, Coycode, StyleNo, RlsBg, Kgs, MtrPc, Rate, GodID, OpenDt, Dept, Finyear
- `CurrentStock`: Increases Bg, Kg, Mt for the corresponding StockID + GodID
- `StockTable`: May create new StockTable entry if the stock item doesn't exist yet

**Data flow**: VUE_STOCKDTDATE view includes opening stock as `TRN='4'` (Source = Trs_Opening), ensuring it appears in date-filtered stock reports.

### 8.2 frmOpeningStock_CompWise — Component-wise Opening

Variant that allows entering opening stock broken down by component (for accessories or composite items).

### 8.3 frmPcsStagewiseOpeningStock — Piece Goods Stage-wise Opening

Enters opening stock for piece goods at specific production stages. Creates records in `Trs_PcsAdj1` (header) and `Trs_PcsAdj2` (detail, with `Adj_Missing_Flg='O'` for opening) which flow into `Pcs_StockTable`/`Pcs_StockTableQty`.

Appears in `Vue_PcsStockDtl_PART` as `Trn='STKOPEN'`.

---

## 9. Stock Adjustments

### 9.1 frmStockAdjustment — Yarn / Fabric Adjustment

Handles both **plus** (add) and **minus** (subtract) adjustments.

**Transaction recording**:
- Uses `Trs_Del1` / `Trs_Del2` with `TrType = 5`
- `Trs_Del2.StockAddLess` = `'Add'` for positive, `'Less'` for negative adjustments

**CurrentStock effect**:
- Plus: CurrentStock.Bg += BgRl, Kg += Kg, Mt += Mtr
- Minus: CurrentStock.Bg -= BgRl, Kg -= Kg, Mt -= Mtr

**Stock Ledger**: Appears as TrsTypeNo 11 ('Stock Adjustment Plus') or 12 ('Stock Adjustment Minus') in `Vue_StkLedger`.

### 9.2 frmStockAdjustment_Domestic — Domestic Order Variant

Same logic as standard stock adjustment but specifically for domestic orders (separate order type filtering).

### 9.3 frmPcsStockAdjustmentEntry — Piece Goods Adjustment

Uses `Trs_PcsAdj1`/`Trs_PcsAdj2` tables. Supports both positive and negative adjustments with `Adj_Missing_Flg` indicating the nature ('O' = opening, 'A' = adjustment, 'M' = missing).

Updates `Pcs_StockTable`/`Pcs_StockTableQty` accordingly.

---

## 10. Godown (Warehouse) Management

### 10.1 FrmGodownMaster — Godown Setup

CRUD operations on `Mas_Godown` table:

| Column | Type | Description |
|--------|------|-------------|
| `GodID` | int (PK) | Godown identifier |
| `GodName` | varchar | Godown display name |
| `GodAddr1..3` | varchar | Address lines |
| `GodCity` | varchar | City |
| `GodState` | varchar | State |
| `Active` | bit | Active flag |

### 10.2 FrmGoDownAck — Godown Acknowledgement (Fabric/Yarn)

When fabric or yarn is physically transferred between godowns, the receiving godown must acknowledge receipt. This form records the acknowledgement.

**Stock effect** (via `PROC_GodownAck_Insert` for piece goods variant):
1. Reads source data from `Trs_PcsGodAck1` (header) and `Trs_PcsGodAck2` (detail)
2. Links back to original delivery (`Trs_Pcs1`/`Trs_Pcs2`) via `TransId`
3. Updates `Pcs_StockTable`/`Pcs_StockTableQty` — adds stock at the target godown

**Delete** (`PROC_GodownAck_Delete`):
- Reverses the acknowledgement by subtracting the quantity from `Pcs_StockTableQty`
- Cursor iterates over `Trs_PcsGodAck2` rows and reduces stock for each color/size

### 10.3 FrmGodownTransferAck — Godown Transfer Acknowledgement

Confirmation form for godown transfers. Ensures the receiver acknowledges the quantity received matches what was sent.

### 10.4 FrmChangeGodown — Change Godown for Existing Stock

Allows reassigning existing stock items from one godown to another without creating a delivery/receipt transaction. Directly updates `CurrentStock.GodID`.

### 10.5 FrmPcsGodTransfer — Piece Goods Godown Transfer

Initiates a godown transfer specifically for piece goods. Creates entries in `Trs_Pcs1`/`Trs_Pcs2` with `DelType='Godown Transfer'`. The stock effect occurs only upon acknowledgement (see `PROC_GodownAck_Insert`).

Appears in `Vue_PcsStockDtl_PART` as `Trn='Rec'` linked via `Trs_PcsGodAck2.TransID`.

### 10.6 Frm_GoDownSel — Godown Selection Dialog

Modal dialog used by other forms to let the user pick a target godown. Reads from `Mas_Godown` with `Active=1` filter.

---

## 11. Stock Transfer

### 11.1 FrmStkTransfer — Inter-Order Stock Transfer

Allows transferring stock from one production order to another (e.g., surplus material from Order A can be allocated to Order B).

**Transaction recording**:
- Uses `Trs_Del1`/`Trs_Del2` with `TrType = 3`
- `Trs_Del2.TranID` = target StockID, `Trs_Del2.TranOrdID` = target OrdID
- Source side: Reduces CurrentStock for original StockID/OrdID
- Target side: Increases CurrentStock for TranID/TranOrdID

**Stock Ledger**: Appears as TrsTypeNo 7 ('Transfer Out') on source side and TrsTypeNo 8 ('Transfer In') on target side.

**VUE_STOCKDTDATE**: Transfer appears as `TRN='3'` with the target order seeing it as a receipt.

**Piece goods variant** (`Trs_PcsStockTfr1`/`Trs_PcsStockTfr2`): Transfer between orders for pieces. Tracked as `Trn='STKTFR'` in `Vue_PcsStockDtl_PART`.

---

## 12. Roll Split & Weight Scale

### 12.1 FrmRollSplit / Frm_RollSplit — Roll Splitting

Splits a parent fabric roll into two or more child rolls. Used when a roll needs to be partially consumed or dispatched.

**Data flow**:
1. Parent roll selected from `CurrentStock_RollDtl` (identified by OrdId + StockId + StyleNo + RollID)
2. User specifies split quantities (Kgs, Mtrs) for each child roll
3. Parent roll's `RollKgs` and `RollMtrs` are reduced
4. New `CurrentStock_RollDtl` rows created for child rolls with new RollIDs
5. `CurrentStock` aggregate remains unchanged (total is same, just split across more rolls)

### 12.2 FrmWeightScale_Integration — Weight Scale Integration

Hardware integration form that reads weight from a connected physical weight scale (via serial port or USB).

**Workflow**:
1. Material placed on scale
2. Form reads weight value from scale device
3. Weight auto-populates into the current GRN or stock entry form
4. Replaces manual weight entry to reduce human error

---

## 13. Piece Stock Lifecycle & Data Flow

The complete lifecycle of piece goods stock is captured in `Vue_PcsStockDtl_PART`:

| Trn | Source | Movement |
|-----|--------|----------|
| `Is` (Despatch) | Trs_Pcs1/Pcs2 (DelType='Despatch') | Issue/Dispatch — reduces stock at stage |
| `Is` (Other) | Trs_Pcs1/Pcs2 (DelType NOT IN 'Despatch','Transfer') | Process stage issue |
| `Rec` (GRN) | Trs_PcsGrn1/PcsGrn2 | Process receipt — adds stock at stage |
| `Prod` (Stage 1) | Trs_Prodentry/ProdentryQty (StageID=1, Rework=0) | First-stage production output |
| `Prod` (Other stages) | Trs_Prodentry/ProdentryQty (StageID<>1, Rework=0) | Subsequent-stage production output |
| `Rec` (Unit Transfer) | Trs_Pcs1/Pcs2 (DelType='Unit Transfer') + Trs_UnitAck1/2 | Inter-unit transfer receipt |
| `Rec` (Godown Transfer) | Trs_Pcs1/Pcs2 (DelType='Godown Transfer') + Trs_PcsGodAck1/2 | Godown transfer receipt |
| `STKTFR` | Trs_PcsStockTfr1/2 | Inter-order stock transfer |
| `STKOPEN` | Trs_PcsAdj1/2 (Adj_Missing_Flg='O') | Opening stock |
| `Prod` (AddPanel) | Trs_AddPanelEntry/Qty | Additional panel production output |
| `Rec` (Unit Transfer-Panel) | Trs_Pcs1/2 (DelType='Unit Transfer-Panel') + Trs_UnitAck1/2 | Panel unit transfer receipt |

---

## 14. Current Stock Update Mechanism

### 14.1 StockTable + CurrentStock Insert/Update Logic

Every transaction that affects stock follows the same pattern:

1. **Check if StockTable entry exists** for the material's attribute combination
   - If not, CREATE a new StockTable row with a new StockID
2. **Check if CurrentStock entry exists** for StockID + OrdID + GodID + StyleNo
   - If exists: UPDATE CurrentStock SET Bg += delta_bg, Kg += delta_kg, Mt += delta_mt
   - If not: INSERT new CurrentStock row with the initial quantities

This logic is typically built into each transaction form's save handler (in VB.NET code within Fiberpro.exe).

### 14.2 Trg_CurrentStock_Update Trigger

```sql
CREATE TRIGGER [Trg_CurrentStock_Update] ON CURRENTSTOCK AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @ID int
    IF NOT (UPDATE(UpdateFlg))
    BEGIN
        SELECT @ID = stockid FROM INSERTED
        UPDATE Currentstock SET UpdateFlg = 1 WHERE Stockid = @Id
    END
END
```

**Purpose**: Whenever any column of CurrentStock is updated (except UpdateFlg itself), this trigger sets `UpdateFlg = 1`. This serves as a **dirty flag** for external sync systems (e.g., Commando cloud, BI reporting) to detect changed stock records without polling entire tables.

### 14.3 Roll-Level Stock (Sp_currentstock_RollDtl)

Manages `CurrentStock_RollDtl` with `@Type` parameter ('+' or '-'):

**Add (`+`) logic**:
- Normal dept: UPSERT by {OrdId, StockId, StyleNo, RollID}
- DeptID = -7 (ready-to-cut) with `FromStockId > 0`: UPSERT by {OrdId, StockId, StyleNo, RollID, Frm_StockID}
- DeptID = -7 with `FromStockId = 0`: UPSERT by {OrdId, StockId, StyleNo, RollID}

**Subtract (`-`) logic**:
- DeptID = 11 (cutting), Flg=0: Reduce or delete (if `@delflg='N'` reduce, else DELETE)
- DeptID = 11, Flg≠0: Reduce
- Other depts (non-11, non-(-7)): Reduce or delete
- DeptID = -7: Reduce or delete with FromStockId matching

`@Rls` is always set to 1 internally (roll count is always 1 per operation).

### 14.4 Piece Stock CRUD Procedures

Stock posting for piece goods follows a family of stored procedures:

| Procedure | Trigger Event | Stock Effect |
|-----------|--------------|--------------|
| `PROC_Stock_ProdPieces` | Production entry | +StockQty at production stage |
| `PROC_Stock_ProdPieces_Delete` | Production delete | -StockQty |
| `PROC_Stock_ProdPieces_Update` | Production update | Adjust StockQty |
| `PROC_Stock_ProdPieces_IssueToPrdn` | Issue to production | +StockQty at target stage |
| `PROC_Stock_ProdPieces_LineOut` | Line output | +StockQty at output stage |
| `PROC_Stock_ProdPieces_LineOut_PrdEntry` | Line out production entry | +StockQty |
| `PROC_Stock_ProdPieces_LineOut_PrdEntry_ReWrk` | Line out rework | +StockQty (rework) |
| `PROC_Stock_PiecesDelivery_Insert` | Piece delivery | -StockQty at source |
| `PROC_Stock_PiecesDelivery_Update` | Piece delivery update | Adjust StockQty |
| `PROC_Stock_PiecesReceipt_Insert` | Piece receipt | +StockQty at target stage |
| `PROC_Stock_PiecesReceipt_Delete` | Piece receipt delete | -StockQty |
| `PROC_Stock_DeliveryPanel_Delete` | Panel delivery delete | +StockQty (revert) |
| `PROC_Stock_PanelDelivery_Insert` | Panel delivery | -StockQty |
| `PROC_Stock_PanelDelivery_Update` | Panel delivery update | Adjust StockQty |
| `PROC_Stock_ProdPanel` | Panel production | +StockQty |
| `PROC_Stock_ProdPanel_Asm` | Panel assembly | +StockQty |
| `PROC_Stock_ProdPanel_Delete` | Panel production delete | -StockQty |
| `PROC_Stock_LineTfr_Insert` | Line transfer | +StockQty at target line |
| `PROC_Stock_LineTfr_Delete` | Line transfer delete | -StockQty |
| `PROC_Stock_IssueToPrdn_Insert` | Issue to production | +StockQty |
| `PROC_Stock_IssueToPrdn_Insert_FINISH` | Issue to prod (finished) | +StockQty |
| `PROC_Stock_ProdRej_Insert_Finish` | Finished rejection | +RejStockQty |
| `PROC_Stock_ProdRej_Insert_Line` | Line rejection | +RejStockQty |
| `PROC_UnitAck_Insert` | Unit acknowledgement | +StockQty at receiving unit |
| `PROC_UnitAck_Delete_2` | Unit ack delete | -StockQty |
| `PROC_UnitAck_Panel_Insert` | Panel unit ack | +StockQty |
| `PROC_UnitAckLineStk_Insert` | Unit ack line stock | +StockQty |
| `PROC_GodownAck_Insert` | Godown ack | +StockQty at target godown |
| `PROC_GodownAck_Delete` | Godown ack delete | -StockQty |

All procedures follow the same pattern:
1. Resolve header data (Coycode, OrdId, StageId, GodId, etc.) from the transaction header table
2. Resolve LotId from `Mas_Lot.LotSno WHERE LotName = @LotNo`
3. Check if `Pcs_StockTable` row exists for the composite key
4. If exists: check if `Pcs_StockTableQty` row exists for ColId + SizeId
   - If exists: UPDATE StockQty
   - If not: INSERT new qty row
5. If Pcs_StockTable not exists: INSERT header + INSERT qty
6. PcsStockId is generated as `MAX(PcsStockId) + 1` (application-managed sequence)

---

## 15. Program Balance Integration

### 15.1 Fabric Program Balance (ST_ProgBalance_Fabric)

Tracks required vs delivered vs received for each fabric combination per order per department:

| Column | Description |
|--------|-------------|
| OrdId, StyleNo, DeptId | Identification |
| FabId, ColId, CntId, DesignId, FinDiaId, FinGSM, LL, SubPrsID | Material attributes |
| ReqKgs, ReqMtr | Required (from Pro_ReqKnitt / requirement calculation) |
| DcKgs, DCMtr | Delivered (DC = Delivery Challan) |
| GRNKgs, GRNMtr | Received (GRN) |
| ReProcessDCKgs, ReProcessDCMtr | Reprocessing DC quantities |

### 15.2 Yarn Program Balance (ST_ProgBalance_Yarn)

| Column | Description |
|--------|-------------|
| OrdId, StyleNo, DeptId | Identification |
| ColId, CountId | Material attributes |
| ReqKgs | Required |
| DcKgs | Delivered |
| POKgs | Purchase order quantity |

### 15.3 Triggers Maintaining Program Balance

**TRG_FAB_BALANCE_DEL** (on `Trs_Del2` AFTER INSERT, UPDATE):
- Fires when a fabric delivery line is inserted/updated
- Recalculates total DC Kgs/Mtr for the order + dept + material combination
- Handles special logic for DeptID=8 (dyeing — uses `DyeColId` instead of `ColId`), DeptID=10 (printing — uses `Trs_Del1.DesignId`)
- Includes reprocess DC calculation (`ProcessType='R'`)
- Only updates if `ProgFrm_Issue='Y'` or `DeptId=11` (cutting)

**TRG_YARN_BALANCE_DEL** (on `Trs_Del2` AFTER INSERT, UPDATE):
- Fires for yarn deliveries
- Recalculates DcKgs including both process deliveries (TrType=1) and sales deliveries (TrType=2)
- Updates `ST_ProgBalance_Yarn.DcKgs` only where `POKgs = 0`

**TRG_FAB_BALANCE_RCUT** (on `Trs_ReadyToCut2` AFTER INSERT, UPDATE):
- Fires for ready-to-cut transactions (TrType=20)
- Updates `ST_ProgBalance_Fabric` DcKgs/Mtr AND GRNKgs/Mtr simultaneously (ready-to-cut is treated as both delivery and receipt)

**TRG_FAB_BALANCE_RCUT_DEL** / **TRG_FAB_BALANCE_RCUT_RET** / **TRG_FAB_BALANCE_RCUT_RET_DEL**: Handle deletion and return scenarios for ready-to-cut transactions.

**TRG_YARN_BALANCE_DEL_DEL**, **TRG_YARN_BALANCE_DELKNIT**, **TRG_YARN_BALANCE_DELYARN_DEL**, **TRG_YARN_BALANCE_GRN_DEL**: Handle various deletion scenarios for yarn balance adjustments.

---

## 16. Ready-to-Cut Stock Flow

The ready-to-cut workflow is a **virtual internal transfer** that moves fabric from the final process department to the cutting department without involving an external party:

1. **Initiation**: Form creates `Trs_ReadyToCut1` (header: Coycode, GodID, Dt, DocNo, Finyear, Prs_Dept, TrType=20) and `Trs_ReadyToCut2` (detail: OrdID, StyleNo, StockID, TranID, BgRl, Kg, Mtr)
2. **Source stock**: `StockID` = fabric stock being consumed from the process department
3. **Target stock**: `TranID` = fabric stock in the ready-to-cut pool (DeptID = -7)
4. **CurrentStock update**: Source StockID decreases, TranID increases
5. **Roll-level**: `Sp_currentstock_RollDtl` handles DeptID=-7 case with `Frm_StockID` tracking
6. **Program balance**: `TRG_FAB_BALANCE_RCUT` sets both DcKgs and GRNKgs simultaneously
7. **Requirement calculation**: `SP_RtoCut` calculates and inserts/updates `ST_ProgBalance_Fabric` for DeptID=-7 based on `Pro_ReqKnitt` requirements for cutting (DeptID=11)

**VUE_STOCKDTDATE** entries for ready-to-cut: `TRN='16'` — both IN (TranID side) and OUT (StockID side) are recorded.

---

## 17. BI / Commando Integration Tables

FiberPro maintains parallel stock tables for BI/Commando cloud synchronization:

| Standard Table | BI Table | Purpose |
|---------------|----------|---------|
| Temp_StkReports | BI_STKREPORTS | Stock register data with GodID for BI dashboards |
| TempAccStock | BI_ACCSTOCK | Accessories stock with GodID |
| Temp_PceReg | BI_PCEREG | Piece register with GodID |

`Sp_BIStockRpt` is structurally identical to `Sp_StockRpt` but writes to BI tables instead. These BI tables include additional columns like `Coycode` and `GodID` (integer FK instead of display name) for programmatic consumption.

The `Trg_CurrentStock_Update` trigger sets `UpdateFlg=1` on any CurrentStock change, and `Trg_ST_Ord_inHand_Update` does the same for `ST_Ord_inHand`, allowing sync processes to detect and push only changed records.

---

## 18. Inventory Stored Procedures Summary

| Stored Procedure | Purpose | Key Parameters |
|-----------------|---------|----------------|
| `Sp_StockRpt` | Overall stock report (yarn/fabric/acc/piece) | @Y_F_A, @OrderType, @Status, @Coycode, @deptID, @ipAddress, @Ordid, @GrpID |
| `Sp_BIStockRpt` | BI variant of stock report | Same as Sp_StockRpt |
| `SP_Rpt_StockRegQry1` | Flexible stock register with dynamic WHERE | @TmpStr (dynamic filter) |
| `Sp_Rpt_StkFab` | Formatted fabric stock report from Temp_StkReports | (none — reads Temp_StkReports) |
| `SP_Rpt_AccStockItemLedger` | Accessories item ledger register | @Coycode, @BuyerID, @MerchId, @OrdId, @AccTypeId, @StyleNo, @OrderType, @ordstatus |
| `SP_Rpt_AccToDoIssProdUnit` | Accessories to-do: issue to production unit | @Coycode, @BuyerID, @Styleno, @OrdId, @AccTypeId, @OrderType, @ordstatus |
| `Accessories_Stock` | Simple accessories stock query per order/item | @Ordid, @ItemType |
| `SP_AccDelivery_stkValue` | Update stock rate on delivery from budget | @ID (delivery ID) |
| `SP_FabDelivery_stkValue` | Update stock rate on fabric delivery | @ID |
| `SP_AccProcessDelivery_stkValue` | Update stock rate on process delivery | @ID |
| `sp_iohistoryright` | IO history — match DCs with GRNs | @Ipaddr |
| `sp_iohistoryright_others` | IO history for other/inter-company | @Ipaddr |
| `sp_iohistorypanelright` | IO history for panels | @Ipaddr |
| `Sp_currentstock_RollDtl` | Roll-level stock add/subtract | @Ordid, @stockid, @styleno, @RollID, @Type(+/-), @Rls, @Kgs, @Mtrs, @deptId, @Flg, @delflg, @FromStockId, ... |
| `SP_PanelAssemblyStock` | Calculate minimum panel stock across stages for assembly | @Ordid, @StyleNo, @coycode, @godId, @colId, @Lot, @PartId, @IpAddress |
| `SP_RtoCut` | Ready-to-cut requirement calculation | @Ordid |
| `PROC_GodownAck_Insert` | Godown acknowledgement stock posting | @Id, @StyleNo, @PartID, @colId, @SizeId, @Pcs, @LotNo |
| `PROC_GodownAck_Delete` | Reverse godown acknowledgement | @ID |
| `PROC_Stock_ProdPieces` | Production → piece stock posting | @Id, @StyleNo, @PartId, @ColId, @SizeId, @SourceStageID, @Pcs, @LotNo |
| `PROC_Stock_IssueToPrdn_Insert` | Issue to production stock posting | @Id, @StyleNo, @PartId, @ColId, @SizeId, @SourceStageID, @Pcs, @LotNo |
| `PROC_Stock_LineTfr_Insert` | Line transfer stock posting | @Id, @StyleNo, @PartId, @ColId, @SizeId, @SourceStageID, @Pcs, @LotNo |
| `PROC_Stock_PiecesDelivery_Insert` | Piece delivery stock reduction | (per row in Trs_Pcs2) |
| `PROC_Stock_PiecesReceipt_Insert` | Piece receipt stock addition | (per row in Trs_PcsGrn2) |
| `PROC_Stock_PanelDelivery_Insert` | Panel delivery stock reduction | (per row) |
| `PROC_Stock_ProdPanel` | Panel production stock posting | (per row) |
| `PROC_Stock_ProdPanel_Asm` | Panel assembly stock posting | (per row) |
| `PROC_UnitAck_Insert` | Unit transfer acknowledgement | (per row) |
| All `*_Delete`, `*_Update` variants | Reversal/adjustment for each of above | Same parameters |

---

## 19. Inventory Reports Catalog

### Stimulsoft Reports (.mrt)

| Report File | Description |
|-------------|-------------|
| `AccOpening.mrt` | Accessories opening stock report |
| `AccStockAdj.mrt` | Accessories stock adjustment report |
| `FabOpening.mrt` | Fabric opening stock report |
| `FabStockAdj.mrt` | Fabric stock adjustment report |
| `FabDC_GoDown.mrt` | Fabric DC by godown |
| `AccDC_GoDown.mrt` | Accessories DC by godown |
| `PcsTransfer.mrt` | Piece goods transfer report |
| `PcsFinishedGoods.mrt` | Finished goods stock report |
| `READYTOCUT.mrt` | Ready-to-cut report |
| `READYTOCUTRETURN.mrt` | Ready-to-cut return report |
| `Pcs_IssueToProd.mrt` | Issue to production report |
| `RollPrint.mrt` | Roll printing/barcode report |

### Crystal Reports (.rpt)

| Report File | Description |
|-------------|-------------|
| `Rpt_AccAck.rpt` | Accessories acknowledgement report |

### Report Code-Behind (.cs)

| File | Description |
|------|-------------|
| `AccDC.cs` | Accessories DC report data logic |
| `FabDC.cs` | Fabric DC report data logic |
| `FabGRN.cs` | Fabric GRN report data logic |
| `GenDC.cs` | General DC report data logic |
| `GenGRN.cs` | General GRN report data logic |
| `AccGRN.cs` | Accessories GRN report data logic |

---

## 20. Key Views Used by Inventory

### VUE_STOCKDTDATE — Date-wise Stock Transactions

Unions **16 transaction types** into a date-filtered view showing receipts (RB, RK, RM) and issues (IB, IK, IM) per StockID per date per GodID:

| TRN | Source | Receipts | Issues |
|-----|--------|----------|--------|
| 1 | GRN (Trs_Grn1/2) | RecKgs - RejKgs | — |
| 2 | Delivery (Trs_Del1/2, TrType≠-1, StockAddLess≠'Add') | — | Kg, Mtr |
| 3 | Transfer Out (TrType=3, TranID target) | RB, RK, RM | — |
| 4 | Opening (Trs_Opening) | Kgs, MtrPc | — |
| 5 | Stock Adj Plus (StockAddLess='Add') | Kg | — |
| 6 | Inter-company transfer (TrType=8) | Kg, Mtr | — |
| 7 | Return qty update (RUpdtkg, Rupdtmtr) | — | Adj |
| 8 | Cutting return fabric ack (TranID + TrType=-2) | Akg, Amtr | — |
| 9 | Godown transfer (TrType=14/15 + AID) | RB, RK, RM | — |
| 10 | Unit DC (TrType=-1, Grp=-4) | — | Kg, Mtr |
| 11 | Unit Ack (TrType=7 + AID) | Akg, Amtr | — |
| 12 | Fabric transfer ack (TrType=1/17 + PrdID + AID) | Akg, Amtr | — |
| 15 | Transfer ack (TrType=16 + AID) | Akg, Amtr | — |
| 16 | Ready-to-cut (Trs_ReadyToCut1/2, TrType=20) | In/Out both | — |

### Vue_StkLedger — Stock Movement Ledger

Documented in Section 7.1 above. Provides 20 transaction type rows for building a complete stock ledger report.

### Vue_PcsStockDtl_PART — Piece Stock Detail by Part

Documented in Section 13 above. Unions all piece-affecting transactions into a single view for consolidated piece stock reporting.

---

## 21. Cross-Module Dependencies

| Dependency Direction | Related Module | Integration Point |
|---------------------|---------------|-------------------|
| **Procurement → Inventory** | 03 Procurement | GRN posting creates/updates StockTable + CurrentStock. Rate flows from PO → Trs_Opening → TempAccStock rate cascade |
| **Inventory → Cutting** | 05 Cutting & Panels | Ready-to-cut flow (DeptID=-7). `SP_RtoCut` calculates fabric requirement for cutting. `Sp_currentstock_RollDtl` handles DeptID=11 roll deductions |
| **Inventory → Production** | 06 Production | `PROC_Stock_ProdPieces*` post pieces to Pcs_StockTable. `PROC_Stock_IssueToPrdn_Insert` posts issue-to-production stock |
| **Inventory → Dispatch** | 07 Dispatch & Delivery | Deliveries (TrType=1,2,4) reduce CurrentStock. DC triggers update fabric/yarn program balance |
| **Inventory → Billing** | 08 Billing & GST | `SP_AccDelivery_stkValue`, `SP_FabDelivery_stkValue` populate stock value on DCs for billing |
| **Inventory → Costing** | 09 Costing | `Tgr_StockRatePost` trigger cascades bill rates through dept chain. Rate stored in StockTable.Rate |
| **Inventory → Orders** | 02 Orders | `ST_Ord_inHand` updated by `Trg_ST_Ord_inHand_Update`. Stock reports filter by OrderMas.OrdId, BuyOrdNo, OrderType, Completed |
| **Masters → Inventory** | 01 Masters | All material dimensions (Mas_Fabric, Mas_Count, Mas_Color, Mas_Dia, Mas_Design, Mas_Godown, Mas_Lot, Mas_Acc, Mas_AccDes, Mas_Size, Mas_SubProcess, Mas_Mill, Mas_Part, Mas_JobWrkComp, Mas_Dept) are FK references from stock tables |
| **Inventory ↔ BI/Cloud** | Commando/BI | BI tables (BI_STKREPORTS, BI_ACCSTOCK, BI_PCEREG) mirror stock data. UpdateFlg triggers mark changed records for sync |
