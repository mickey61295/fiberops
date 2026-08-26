# Module 6 — Production & Shop Floor

> **Generated**: 2026-03-15  
> **Source**: 22+ forms (production entry, line input/output, hourly tracking, wages, status registers, configuration), ~50 stored procedures (production entry qty variants, stock posting, barcode posting, WBS production, production status/views, shift wages, rejection), 5 triggers (ST_Production_Data, WBS_Production, WBS_LineProduction, WBS_Production_DateWise, ST_ProdRequirement), 6+ report templates (.mrt), 4 dynamic views (Vue_PRodStatus, Vue_Prod_Consolidate_PCS, Vue_Rpt_OverallProduction_Det, Vue_RptShiftWagesReg)  
> **Foundation References**: database-schema.md, stored-procedures-analysis.md, triggers-and-views-analysis.md, formulas-and-calculations.md, 01-masters-configuration.md, 05-cutting-panels-pieces.md

---

## Table of Contents

1. [Module Overview](#1-module-overview)
2. [Forms Inventory](#2-forms-inventory)
3. [Data Model — Core Transaction Tables](#3-data-model--core-transaction-tables)
   - 3.1 Trs_ProdEntry — Production Entry Header
   - 3.2 Trs_ProdEntryQty — Production Entry Size Quantities
   - 3.3 Trs_ProdEntry_SourceStageDtl — Multi-Part Source Stage Detail
   - 3.4 Trs_LineInput — Line Input (Issue to Production)
   - 3.5 Trs_ProdWages — Production Shift Wages
   - 3.6 Trs_PcsRej — Production Rejection Entry
4. [Summary/Analytics Tables](#4-summaryanlytics-tables)
   - 4.1 ST_Production_Data — Denormalized Production Snapshot
   - 4.2 ST_Supp_Production_Data — Supplier Production Snapshot
   - 4.3 WBS_Production — WBS Production Planning
   - 4.4 WBS_Production_DateWise — Day-Wise Production Data
   - 4.5 WBS_LineProduction — Line-Wise Production Planning
   - 4.6 WBS_Supp_Production — Supplier WBS Production
   - 4.7 ST_ProdRequirement — Production Requirement Matrix
5. [Stage & Sequence Model](#5-stage--sequence-model)
   - 5.1 Prod_Sequence — Stage Ordering Per Order/Style
   - 5.2 Mas_JobWrkComp — Work Component/Stage Definition
   - 5.3 Mas_Dept — Department Classification (Semi-Finished/Finished)
   - 5.4 PcsType Flow (Piece / Panel / Bit)
   - 5.5 Special Operations (Spl_Operation)
6. [Production Entry — Regular (frmProduction)](#6-production-entry--regular-frmproduction)
   - 6.1 Entry Flow: Header → Size Quantities → Stock Posting
   - 6.2 Sp_ProductionEntryQty_1 — Standard Entry Logic
   - 6.3 Sp_ProductionEntryQty_2 — Rework Entry Logic
   - 6.4 Source Stage Auto-Resolution
   - 6.5 StockPostingFlg Lifecycle
7. [Production Entry — Panel/Cut Panel (frmProduction_CutPanel)](#7-production-entry--panelcut-panel-frmproduction_cutpanel)
   - 7.1 Sp_ProductionEntryQty_Panel_1 — Panel Stock Posting
   - 7.2 Sp_ProductionEntryQty_Panel_ASM — Assembly Stock Posting
   - 7.3 Component-Level Tracking (Trs_AddPanelEntryQty_Component)
   - 7.4 ProductionExistQty / _1 — Duplicate Check
8. [Line Input / Issue to Production](#8-line-input--issue-to-production)
   - 8.1 FrmLineInput — Line Input Entry
   - 8.2 FrmLineInputManual — Manual Line Input
   - 8.3 FrmIssueToProduction — Issue-to-Production Form
   - 8.4 PROC_Stock_IssueToPrdn_Insert — Stock Posting Logic
   - 8.5 PROC_Stock_IssueToPrdn_Insert_FINISH — Finished Stage Variant
   - 8.6 Employee/Line-Level Stock Tracking (EmpID on Pcs_StockTable)
9. [Line Output — Manual](#9-line-output--manual)
   - 9.1 frmLineOutputManual / frmLineOutputManual_New
   - 9.2 Sp_ProductionEntryQty_LineOut_Manual — Line Output Logic
   - 9.3 PROC_Stock_ProdPieces_LineOut — Line-Level Stock Insert
   - 9.4 PROC_Stock_ProdPieces_LineOut_PrdEntry — PrdEntry Line Variant
   - 9.5 Rework Variants (_LineOut_PrdEntry_ReWrk)
10. [Stock Posting Engine — Production Pieces](#10-stock-posting-engine--production-pieces)
    - 10.1 PROC_Stock_ProdPieces — Core Insert Logic
    - 10.2 Semi-Finished (FinalStage='S') Source Deduction
    - 10.3 Finished (FinalStage='F') Multi-Part Deduction
    - 10.4 Pack-Order (EntryOption=2) PcsPerColor Multiplier
    - 10.5 Rework (0/1/2) Stock Source Selection
    - 10.6 Update / Delete Variants
11. [Stock Posting Engine — Production Panels](#11-stock-posting-engine--production-panels)
    - 11.1 PROC_Stock_ProdPanel — Core Panel Insert
    - 11.2 PROC_Stock_ProdPanel_Asm — Assembly Variant
    - 11.3 Panel_StockTable CompId Dimension
    - 11.4 Source Stage Deduction (Panel/Piece PcsType Both Supported)
    - 11.5 Update / Delete Variants
12. [Production Rejection Stock Handling](#12-production-rejection-stock-handling)
    - 12.1 PROC_Stock_ProdRej_Insert_Line — Line-Stage Rejection
    - 12.2 PROC_Stock_ProdRej_Insert_Finish — Finished-Stage Rejection
    - 12.3 Delete Variants
    - 12.4 RejectionTypeId and GoodPcsFlag='M' Mechanics
13. [Barcode-Based Production Posting](#13-barcode-based-production-posting)
    - 13.1 SP_Barcode_Production_Posting — Batch Posting
    - 13.2 Bundle Cursor (Pay_Bundle_ProdEntry → Trs_ProdEntry)
    - 13.3 Piece Cursor (Pay_Pcs_ProdEntry → Trs_ProdEntry)
    - 13.4 PostingFlg Lifecycle
14. [Production Status & WBS Cloud Integration](#14-production-status--wbs-cloud-integration)
    - 14.1 SP_ST_Production_Data — Per-Transaction Snapshot Updates
    - 14.2 SP_ST_Supp_Production_Data — Supplier Snapshot
    - 14.3 Sp_WBS_Production — WBS Production Master Update
    - 14.4 Sp_WBS_Production_DateWise — Date-Wise WBS Update
    - 14.5 Sp_WBS_Line_Production — Line-Wise WBS Update
    - 14.6 Sp_WBS_Supp_Production — Supplier WBS Update
    - 14.7 Color-Coded Schedule Status (BGColor Logic)
    - 14.8 Finish Percent Calculation
15. [Production Status Views & Registers](#15-production-status-views--registers)
    - 15.1 SP_Vue_PRodStatus — Barcode-Based Production Status View
    - 15.2 SP_Vue_PRodStatus_1 — External DB Variant with LineID
    - 15.3 SP_Vue_Prod_PCSNew — New PCS Production View
    - 15.4 SP_Vue_Prod_Consolidate_PCS / _Line — Consolidated Views
    - 15.5 SP_Vue_Rpt_OverallProduction_Det — Overall Production Detail View
    - 15.6 SP_Vue_RptShiftWagesReg — Shift Wages Register View
    - 15.7 FrmProductionStatusReg — In-House Production Status Register
    - 15.8 FrmInhouseProductionStatusReg — In-House Status
    - 15.9 Frm_ProductionEntryReg — Production Entry Register
16. [Hourly Production & Shift Management](#16-hourly-production--shift-management)
    - 16.1 FrmHourlySetting1 — Hourly Target Configuration
    - 16.2 frmHours — Hour Definition
    - 16.3 HrsID Linkage to Production Entry
17. [Production Wages & Cost](#17-production-wages--cost)
    - 17.1 Frm_ProductionWages / Frm_ProdWagesDept / Frm_ProdWagesStage
    - 17.2 Trs_ProdWages Table Structure
    - 17.3 ShiftWages Calculation
    - 17.4 Cumulative Cost Tracking
18. [Production Configuration & Routing](#18-production-configuration--routing)
    - 18.1 frmProdutionConfig — Production Configuration
    - 18.2 Frm_ProRouteTemplate — Production Route Template
    - 18.3 Frm_SubProcess — Sub-Process Definition
    - 18.4 FrmProcessByPassSetting — Process Bypass
    - 18.5 FrmOperationEntry — Operation Entry
    - 18.6 FrmSuppProdSequence — Supplier Production Sequence
19. [Finished Goods Entry](#19-finished-goods-entry)
    - 19.1 FrmFinishGoodsEntry — Finished Goods Entry
    - 19.2 FrmPcsFinishedGoods — Finished Goods Report
20. [Triggers — Cloud Sync & Audit](#20-triggers--cloud-sync--audit)
    - 20.1 Trg_ST_Production_Data_Update — Production Data Change Flag
    - 20.2 Trg_WBS_Production_Update_Actual — Actual Start/Finish Flag
    - 20.3 Trg_WBS_Production_DateWise — DateWise Change Flag
    - 20.4 Trg_WBS_LineProduction — Line Production Change Flag
    - 20.5 Trg_ST_ProdRequirement_Update — Requirement Change Flag
21. [Reports Catalog](#21-reports-catalog)
22. [Cross-Module Dependencies](#22-cross-module-dependencies)

---

## 1. Module Overview

The Production & Shop Floor module manages **in-house garment production tracking** from cut panels/pieces through production stages to finished goods. It builds on the Cutting, Panels & Piece Goods module (Module 5) and provides the operational backbone for:

- **Production entry** — Recording production quantities at each stage (regular, panel, line-output), by order/style/color/size/part/lot
- **Line input/output** — Tracking bundles and pieces being fed into sewing lines and their output, with employee/line-level granularity
- **Stock flow-through** — Automated stock posting: ADD at target stage, DEDUCT from source stage, across `Pcs_StockTable` and `Panel_StockTable`
- **Barcode integration** — Batch-posting individual barcode scans (bundles and pieces) from the `Fiber_production` database into the main ERP transaction tables
- **Production status tracking** — Real-time WBS (Work Breakdown Structure) style dashboards, date-wise tracking, color-coded schedule adherence, finish percentage calculations
- **Hourly & shift management** — Hourly production targets, shift wage calculations, operator productivity tracking
- **Production configuration** — Route templates defining the sequence of stages for each order/style, sub-process definitions, process bypass settings

**Key characteristics:**
- **Dual entry model**: Production can be entered manually via `frmProduction` (production entry form) OR automatically via barcode scanning (`SP_Barcode_Production_Posting` batch)
- **Line-level stock tracking**: Stock can optionally be tracked at the production line level using `EmpID` (repurposed as LineID) on `Pcs_StockTable`
- **Six SP variants for production entry**: `Sp_ProductionEntryQty_1` (standard), `_2` (rework-linewise), `_LineOut_Manual` (manual line output), `_Panel_1` (panel), `_Panel_ASM` (panel assembly) — each routes to different stock posting procedures
- **WBS cloud sync**: All production data is replicated to `WBS_Production`, `WBS_Production_DateWise`, `WBS_LineProduction`, and `ST_Production_Data` tables with `UpdateFlg` triggers for syncing to the Commando Cloud external system
- **Multi-transaction-type snapshot**: `ST_Production_Data` tracks PRDN, DC, GRN, REJ, and REWRK quantities in a single denormalized row per order/style/stage/color/size combination
- **Multi-company scope**: All transactions keyed by `Coycode`/`CoyId` for multi-unit operation

---

## 2. Forms Inventory

| # | Form Class Name | Purpose |
|---|----------------|---------|
| 1 | `frmProduction` | Production entry — records piece production by order/style/color/size at a target stage |
| 2 | `frmProduction_CutPanel` | Panel/cutting production entry — records panel production with component detail |
| 3 | `FrmProductionStatusReg` | Production status register — views production status across stages |
| 4 | `FrmInhouseProductionStatusReg` | In-house production status register |
| 5 | `Frm_ProductionEntryReg` | Production entry register — report/register of all production entries |
| 6 | `FrmBundle_ProductionEntry` | Bundle-based production entry (via barcode bundles) |
| 7 | `FrmLineInput` | Line input entry — issues bundles/pieces to a sewing line |
| 8 | `FrmLineInputManual` | Manual line input entry (without barcode) |
| 9 | `frmLineOutputManual` | Manual line output entry |
| 10 | `frmLineOutputManual_New` | New version of manual line output |
| 11 | `FrmIssueToProduction` | Issue-to-production — transfers pieces from stock to a specific production line/employee |
| 12 | `FrmHourlySetting1` | Hourly production target configuration |
| 13 | `frmHours` | Hour/shift definition (time slots) |
| 14 | `FrmOperationEntry` | Operation entry — records individual operations at a production stage |
| 15 | `frmProdutionConfig` | Production configuration settings |
| 16 | `Frm_ProRouteTemplate` | Production route template — defines the sequence of stages for a product type |
| 17 | `Frm_SubProcess` | Sub-process definition within a main production stage |
| 18 | `FrmProcessByPassSetting` | Process bypass settings — allows skipping certain stages under configurable conditions |
| 19 | `FrmFinishGoodsEntry` | Finished goods entry — records QC-passed goods entering finished goods stock |
| 20 | `FrmPcsFinishedGoods` | Finished goods report/register |
| 21 | `Frm_ProductionCost` | Production cost entry/calculation |
| 22 | `Frm_ProductionWages` | Production wages entry |
| 23 | `Frm_ProdWagesDept` | Production wages by department |
| 24 | `Frm_ProdWagesStage` | Production wages by stage |
| 25 | `FrmSuppProdSequence` | Supplier production sequence — defines stage sequence for supplier/outsourced production |

---

## 3. Data Model — Core Transaction Tables

### 3.1 Trs_ProdEntry — Production Entry Header

The primary production entry table. Each row represents one production entry at a specific stage for an order/style/color/part.

| Column | Type | Purpose |
|--------|------|---------|
| Id | Int (PK) | Auto-incrementing production entry ID |
| CoyId | Int | Company/unit → `Mas_Exporter.ExpID` |
| Dt | DateTime | Production date |
| SNo | Int | Serial number within the day |
| OrdId | Int | Order → `OrderMas.OrdId` |
| StyleId | Int | Style → `Mas_StyleDesc.StyleID` |
| StyleNo | Varchar(20) | Style number |
| ClrId | Int | Color → `Mas_Color.ColID` (or combo color CmbClrID) |
| StageId | Int | Target production stage → `Mas_JobWrkComp.Id` |
| SourceStageId | Int | Source stage from which pieces were consumed |
| PartId | Int | Part → `Mas_Part.PartID` |
| GodId | Int | Godown → `Mas_Godown.GodId` |
| EmpId | Int | Employee/operator → `Mas_Emp.ID` |
| Rework | Int | 0=Normal, 1=Rework from rejection, 2=Rework from alteration |
| RejectionTypeId | Int | Rejection type for rework (→ `Mas_RejectionType`) |
| Pay | Char(1) | 'Y'/'N' — whether wages apply |
| HrsID | Int | Hour slot → hourly tracking |
| LotNo | Varchar(15) | Lot number |
| LotId | Int | Lot → `Mas_Lot.LotSno` |
| StockPostingFlg | Char(1) | 'Y' when stock has been posted to Pcs_StockTable |
| LineID | Int | Production line ID (for line-level tracking) |
| SrcLineID | Int | Source line ID |
| PreparedBy | Int | User who prepared the entry |
| Spl_Operation | Char(1) | 'Y' if this is a special operation (skips stock posting) |

**Note**: `StageId=1` by convention is always the Cutting stage.

### 3.2 Trs_ProdEntryQty — Production Entry Size Quantities

Size-wise breakdown of production quantities for each entry.

| Column | Type | Purpose |
|--------|------|---------|
| Id | Int (FK) | → `Trs_ProdEntry.Id` |
| SizId | Int | Size → `Mas_Size.SizeID` |
| ProdPcs | Int | Produced pieces count |

**Composite Key**: (Id, SizId) — one row per size per production entry.

### 3.3 Trs_ProdEntry_SourceStageDtl — Multi-Part Source Stage Detail

Used when a finished-stage production entry consumes pieces from multiple parts (e.g., assembly of front + back + sleeve).

| Column | Type | Purpose |
|--------|------|---------|
| ID | Int (FK) | → `Trs_ProdEntry.Id` |
| PartId | Int | Source part being consumed |
| SourceStageId | Int | Source stage for this specific part |

This table is joined during finished-stage stock deduction to correctly identify which parts to deduct from.

### 3.4 Trs_LineInput — Line Input (Issue to Production)

Records the issue of pieces to a specific production line/employee.

| Column | Type | Purpose |
|--------|------|---------|
| Id | Int (PK) | Auto-incrementing line input ID |
| Coycode | Int | Company/unit |
| OrdJobNo | Int | Order ID |
| StyleNo | Varchar(20) | Style number |
| TargetStageID | Int | Production stage pieces are being issued to |
| GodId | Int | Godown |
| EmpID | Int | Employee/line receiving the pieces |
| LotNo | Varchar(15) | Lot number |

Used by `PROC_Stock_IssueToPrdn_*` procedures for stock posting.

### 3.5 Trs_ProdWages — Production Shift Wages

Records production wages per shift/entry/operator.

| Column | Type | Purpose |
|--------|------|---------|
| Coycode | Int | Company |
| Ordid | Int | Order |
| StyleNo | Varchar(20) | Style |
| StageId | Int | Production stage |
| PartId | Int | Part |
| EmpId | Int | Employee/operator |
| EntryDate | DateTime | Date of production |
| ProdPcs | Int | Pieces produced |
| ShiftWages | Numeric | Wages for this shift/entry |
| Addl_Amount | Numeric | Additional amount (incentives, etc.) |
| no_of_persons | Int | Number of persons on this entry |

### 3.6 Trs_PcsRej — Production Rejection Entry

Records piece rejections at any stage. Used by `PROC_Stock_ProdRej_Insert_Line` and `_Finish`.

| Column | Type | Purpose |
|--------|------|---------|
| Id | Int (PK) | Rejection entry ID |
| CoyId | Int | Company |
| OrdId | Int | Order |
| StyleNo | Varchar(20) | Style |
| StageId | Int | Stage where rejection was recorded |
| Stk_StageId | Int | Stage for stock adjustment (may differ from StageId) |
| PartId | Int | Part |
| ClrId | Int | Color |
| GodId | Int | Godown |
| RejectionTypeId | Int | Rejection type → `Mas_RejectionType` |
| LineID | Int | Production line where rejection occurred |

---

## 4. Summary/Analytics Tables

### 4.1 ST_Production_Data — Denormalized Production Snapshot

A real-time summary table updated by `SP_ST_Production_Data` on every production transaction. Stores per-order/style/stage/part/color/size aggregated quantities.

| Column | Type | Purpose |
|--------|------|---------|
| Coycode | Int | Company |
| Ordid | Int | Order |
| StyleNo | Varchar(20) | Style |
| PartID | Int | Part |
| ColID | Int | Color |
| SizeID | Int | Size |
| StageId | Int | Stage |
| PartyID | Int | Party (for DC/GRN tracking) |
| ProdQty | Int | Total production quantity |
| DCQty | Int | Total delivery challan quantity |
| GRNQty | Int | Total GRN (receipt) quantity |
| RejQty | Int | Total rejection quantity |
| ReworkQty | Int | Total rework quantity |
| OrderQty | Int | Order quantity (populated by WBS SP) |
| OrderWithExsQty | Int | Order quantity with excess (CutPlanQty) |
| OverAllOrdQty | Int | Overall order quantity across parts |
| Finish_Percent | Numeric(18,2) | (ProdQty + GRNQty) / OrderQty × 100 |
| Finish_Percent_4Exs | Numeric(18,2) | (ProdQty + GRNQty) / OrderWithExsQty × 100 |
| UpdateFlg | Int | Set to 1 by trigger when data changes (for cloud sync) |
| server_id | — | Cloud server ID (excluded from trigger detection) |

**TransType values** used by SP_ST_Production_Data:
- `'PRDN'` — Production (updates ProdQty)
- `'DC'` — Delivery Challan (updates DCQty)
- `'GRN'` — Goods Receipt Note (updates GRNQty)
- `'REJ'` — Rejection (updates RejQty)
- `'REWRK'` — Rework (updates ReworkQty)

Each transaction type supports `+` (add) and `-` (subtract) via `@transFlg`.

### 4.2 ST_Supp_Production_Data — Supplier Production Snapshot

Same structure as ST_Production_Data but for supplier/outsourced production tracked via `SuppOrdMas`/`SuppOrdDet`. Updated by `SP_ST_Supp_Production_Data`.

### 4.3 WBS_Production — WBS Production Planning

Main planning/tracking table per order/style/stage, linked to Commando Cloud.

| Column | Type | Purpose |
|--------|------|---------|
| OrdId | Int | Order |
| StyleNo | Varchar(20) | Style |
| SeqNo | Int | Stage sequence number |
| StageId | Int | Stage |
| DeptId | Int | Department |
| Dept | Varchar(25) | Department name |
| PartId | Int | Part |
| DcQty | Numeric(18,2) | Delivery quantity |
| ProdQty | Numeric(18,2) | Production quantity |
| OrderQty | Int | Order quantity |
| OrderWithExsQty | Int | Order + excess quantity |
| PlanStart | DateTime | Planned start date |
| PlanFinish | DateTime | Planned finish date |
| ActualStart | DateTime | Actual start date |
| ActualFinish | DateTime | Actual finish date |
| BGColor | Varchar(50) | Schedule status color code |
| ActualPosting_UpdateFlg | Int | Flag for cloud sync of actual dates |

### 4.4 WBS_Production_DateWise — Day-Wise Production Data

Daily production quantities per order/style/stage/department, including line-level granularity.

| Column | Type | Purpose |
|--------|------|---------|
| Coycode | Int | Company |
| ProdDate | DateTime | Production date |
| OrdId / StyleNo / StageId / DeptId / PartId | — | Dimensional keys |
| LineID | Int | Production line |
| DcQty | Numeric(18,2) | Daily delivery qty |
| ProdQty | Numeric(18,2) | Daily production qty |
| UpdateFlg | Int | Cloud sync flag |

### 4.5 WBS_LineProduction — Line-Wise Production

Per-line, per-day, per-color/size production quantities for line planning.

| Column | Type | Purpose |
|--------|------|---------|
| OrdId / StyleNo / PartId / ColId / SizeID | — | Dimensional keys |
| Coycode | Int | Company |
| LineId | Int | Production line |
| ProdPcs | Int | Pieces produced |
| Dt | DateTime | Production date |
| UpdateFlg / serverid | — | Cloud sync |

### 4.6 WBS_Supp_Production — Supplier WBS Production

Same structure as WBS_Production but for supplier orders. Keyed by supplier order ID rather than main order ID.

### 4.7 ST_ProdRequirement — Production Requirement Matrix

Stores production requirements (material/capacity) by order/style/stage/department/part. Updated with `UpdateFlg` for cloud sync.

---

## 5. Stage & Sequence Model

### 5.1 Prod_Sequence — Stage Ordering Per Order/Style

Defines the sequence of production stages for each order+style combination.

| Column | Type | Purpose |
|--------|------|---------|
| OrdId | Int | Order |
| StyleNo | Varchar(20) | Style |
| StageId | Int | Stage → `Mas_JobWrkComp.Id` |
| SeqNo | Int | Sequence number (determines processing order) |

The sequence number controls:
- Source stage resolution (production at SeqNo=N deducts from SeqNo=N-1)
- WBS planning row ordering
- Stage completion tracking

### 5.2 Mas_JobWrkComp — Work Component/Stage Definition

Master table defining production stages/work components.

| Key Column | Purpose |
|-----------|---------|
| Id | Stage ID (PK) |
| WorkComplDet | Stage description (e.g., "Cutting", "Stitching", "Finishing") |
| DeptId | Department → `Mas_Dept.DeptId` |
| PcsType | `'Piece'` / `'Panel'` / `'Bit'` — determines which stock table is affected |
| Spl_Operation | `'Y'`/`'N'` — special operations skip stock posting |
| Inspection_Operation | `'Y'`/`'N'` — marks inspection stages (used in consolidated view for GoodPcs count) |
| OperationSeqNo | Operation sequence within the stage |

### 5.3 Mas_Dept — Department Classification

| Key Column | Purpose |
|-----------|---------|
| DeptId | Department ID |
| SemiFinish | `'S'` = Semi-Finished, `'F'` = Finished — controls stock deduction logic |
| OrderSno | Display ordering for reports |
| Stitching_DeptCode | Sewing/stitching department code (from `Options` table) |

**SemiFinish logic impact:**
- `'S'` (Semi-Finished): Source deduction is simple — deduct from `SourceStageId` for same Part
- `'F'` (Finished): Source deduction uses `Trs_ProdEntry_SourceStageDtl` for multi-part assembly, and respects `EntryOption` for combo-color orders

### 5.4 PcsType Flow

```
PcsType='Panel' → Panel_StockTable / Panel_StockTableQty
                   (includes CompId dimension for component tracking)

PcsType='Piece' → Pcs_StockTable / Pcs_StockTableQty
                   (standard piece stock)

PcsType='Bit'   → Pcs_StockTable / Pcs_StockTableQty
                   (treated same as Piece for stock, distinct for reporting)
```

### 5.5 Special Operations (Spl_Operation)

When `Mas_JobWrkComp.Spl_Operation = 'Y'` for a stage, the production entry:
- Records the entry in `Trs_ProdEntry` / `Trs_ProdEntryQty` normally
- **Skips all stock posting** — no Pcs_StockTable or Panel_StockTable updates
- Used for quality checkpoints, inspection stations, and other non-stock-impacting operations

---

## 6. Production Entry — Regular (frmProduction)

### 6.1 Entry Flow

```
User enters production in frmProduction:
  ┌────────────────────────────────────────────┐
  │ Select: CoyId, Date, Order, Style, Color,  │
  │         Stage, Part, Godown, Lot, Employee  │
  │ Enter:  Size-wise quantities (grid)         │
  └──────────────────┬─────────────────────────┘
                     │
          INSERT INTO Trs_ProdEntry (header)
                     │
    ┌────────────────┴────────────────────┐
    │ For each size with Qty > 0:         │
    │   EXEC Sp_ProductionEntryQty_1      │
    │        (@Id, @SizId, @Qty)          │
    └────────────────┬────────────────────┘
                     │
    ┌────────────────┴────────────────────┐
    │ SP logic:                           │
    │  1. INSERT Trs_ProdEntryQty         │
    │  2. Check Spl_Operation flag        │
    │  3. If Normal + LineOut='Y' +       │
    │     StageId≠1 + Rework≠1:           │
    │     → PROC_Stock_ProdPieces_        │
    │       LineOut_PrdEntry              │
    │  4. Else:                           │
    │     → PROC_Stock_ProdPieces         │
    │  5. SET StockPostingFlg = 'Y'       │
    └─────────────────────────────────────┘
```

### 6.2 Sp_ProductionEntryQty_1 — Standard Entry Logic

**Parameters**: `@Id` (ProdEntry ID), `@SizId` (Size ID), `@Qty` (Quantity)

**Three-way branching**:
1. **New entry** (no existing row for this Id+SizeId, Qty > 0):
   - INSERT into `Trs_ProdEntryQty`
   - Route to appropriate stock posting SP
2. **Update** (existing row, Qty > 0):
   - Call stock UPDATE variant
   - UPDATE `Trs_ProdEntryQty.ProdPcs`
3. **Delete** (existing row, Qty = 0):
   - Call stock DELETE variant
   - DELETE from `Trs_ProdEntryQty`

**Stock posting routing**:
```
IF LineOut_Last_StichOpr_as_a_SourceStage = 'Y'
   AND StageId ≠ 1      (not cutting stage)
   AND Rework ≠ 1        (not rework)
   AND Spl_Operation = 'N' (not special op)
THEN → PROC_Stock_ProdPieces_LineOut_PrdEntry
ELSE → PROC_Stock_ProdPieces
```

The `LineOut_Last_StichOpr_as_a_SourceStage` flag is hardcoded to `'Y'` in this SP, meaning line-output-based source deduction is the default behavior for non-cutting, non-rework stages.

### 6.3 Sp_ProductionEntryQty_2 — Rework Entry Logic

Identical structure to `_1` but with inverted rework check:
- Routes to `PROC_Stock_ProdPieces_LineOut_PrdEntry_ReWrk` when `Rework = 1`
- Rework stock posting consumes from `GoodPcsFlag='M'` (mend) stock instead of `'G'` (good)

### 6.4 Source Stage Auto-Resolution

The source stage is stored in `Trs_ProdEntry.SourceStageId` at header creation time. For semi-finished stages, the system looks up `Prod_Sequence` to find the preceding stage. For finished stages, `Trs_ProdEntry_SourceStageDtl` maps multiple source parts.

### 6.5 StockPostingFlg Lifecycle

| Value | Meaning |
|-------|---------|
| NULL / 'N' | Stock not yet posted |
| 'Y' | Stock successfully posted to Pcs_StockTable / Panel_StockTable |

Set by the `Sp_ProductionEntryQty_*` family after successful `PROC_Stock_*` execution.

---

## 7. Production Entry — Panel/Cut Panel (frmProduction_CutPanel)

### 7.1 Sp_ProductionEntryQty_Panel_1 — Panel Stock Posting

**Parameters**: `@Id`, `@SizId`, `@Qty`, `@compId` (component ID), `@oldPcs` (previous qty for update)

**Key differences from piece production**:
- Reads from `Trs_AddPanelEntry` (header) and `Trs_AddPanelEntryQty` (sizes)
- Includes `@compId` parameter for component-level tracking
- Checks `Panel_StockTable` for existing records before deciding INSERT vs UPDATE
- Uses a three-way existence check:
  1. No entry + Qty > 0 → INSERT + `PROC_Stock_ProdPanel`
  2. Entry exists + Qty > 0 + no stock record → INSERT stock only (via `PROC_Stock_ProdPanel`)
  3. Entry exists + Qty > 0 + stock exists → UPDATE (via `PROC_Stock_ProdPanel_Update`)
  4. Qty = 0 → DELETE (via `PROC_Stock_ProdPanel_Delete`)

### 7.2 Sp_ProductionEntryQty_Panel_ASM — Assembly Stock Posting

Handles panel assembly — when panels are assembled into pieces:
- Uses `PROC_Stock_ProdPanel_Asm` for insert
- Uses `PROC_Stock_ProdPanel_Update_ASM` for updates
- On delete (Qty=0), still calls update variant rather than delete to handle component reconciliation

### 7.3 Component-Level Tracking

Panel production includes an additional dimension:
- `Trs_AddPanelEntryQty_Component` stores component details per panel entry
- `Trs_AddPanelEntryQty_Det` stores job order linkage
- `Panel_StockTableQty.CompId` tracks stock per component

### 7.4 ProductionExistQty / _1 — Duplicate Check

Validation SPs called before saving:
- `ProductionExistQty`: Checks if production already exists for the same Order/Color/Part/Style/Stage/Size/Lot/JobOrder combination
- `ProductionExistQty_1`: Extended check including component name matching

---

## 8. Line Input / Issue to Production

### 8.1 FrmLineInput — Line Input Entry

Issues bundles/pieces from general stock to a specific production line or employee. Creates `Trs_LineInput` records.

### 8.2 FrmLineInputManual — Manual Line Input

Same concept without barcode integration — manual entry of order/style/color/size/qty.

### 8.3 FrmIssueToProduction — Issue to Production Form

A dedicated form for transferring pieces from warehouse stock to the production floor, creating inventory movement records.

### 8.4 PROC_Stock_IssueToPrdn_Insert — Stock Posting Logic

**Parameters**: `@Id`, `@StyleNo`, `@PartId`, `@ColId`, `@SizeId`, `@SourceStageID`, `@Pcs`, `@LotNo`

**Key behavior**:
1. Reads transaction context from `Trs_LineInput` (aliased as `trs_pcs1`)
2. Resolves `TargetStageID`, `GodId`, `EmpID` from the line input header
3. Resolves lot → `LotId` via `Mas_Lot`
4. Checks configurable options:
   - `Options1.Prod_Without_Lot_Despatch_WithLot` — whether to ignore lot for production
   - `ORDERMAS2.LotwiseStock` — lot-wise stock tracking per order
   - `Options.GRNAcceptance_Pcs` — GRN acceptance mode for woven orders
5. Adds stock at target stage + party/employee level in `Pcs_StockTable`
6. For despatch/sales, deducts from finished stage

**EmpID-based stock partitioning**: When `@PartyId > 0 OR @EmpID > 0`, stock is partitioned at the employee/line level in `Pcs_StockTable` using the `EmpID` column. This allows tracking which production line holds how many pieces.

### 8.5 PROC_Stock_IssueToPrdn_Insert_FINISH — Finished Stage Variant

Extended version that handles:
- Finished stage (`SEMIFINISH = 'F'`) logic
- `EntryOption` (1=standard, 2=pack order) determines deduction strategy
- `ComboID` for combo-color deduction
- Multi-part source stage deduction via `Trs_ProdEntry_SourceStageDtl`

### 8.6 Employee/Line-Level Stock Tracking

The `Pcs_StockTable.EmpID` column serves dual purpose:
- When `FrmLineInput` issues pieces: `EmpID` = employee receiving pieces
- When `PROC_Stock_ProdPieces_LineOut` posts: `EmpID` = `LineID` from `Trs_ProdEntry`

This enables line-level WIP tracking — querying `Pcs_StockTable WHERE EmpID = @LineId` shows all pieces currently on that line.

---

## 9. Line Output — Manual

### 9.1 frmLineOutputManual / frmLineOutputManual_New

Forms for recording the output of a production line manually (without barcode scanning). The operator enters:
- Order, Style, Color, Part, Lot
- Stage (target), Source Stage
- Size-wise output quantities

Line output creates `Trs_ProdEntry` records with `LineID` populated.

### 9.2 Sp_ProductionEntryQty_LineOut_Manual — Line Output Logic

**Parameters**: `@Id`, `@SizId`, `@Qty`

**Key differences from standard production entry**:
- Sets `@LineOutManual = 'Y'` (hardcoded)
- For non-cutting, non-rework stages:
  - Insert: calls `PROC_Stock_ProdPieces_LineOut` (adds to line-level stock)
  - Update: calls `PROC_Stock_ProdPieces_Update` (updates stock)
  - Delete: calls `PROC_Stock_ProdPieces_Delete_IssueToPrdn` (reverses issue-to-production stock)
- For cutting stage (StageId=1) or rework: only updates `StockPostingFlg`, no stock posting (cutting is handled by Module 5)

### 9.3 PROC_Stock_ProdPieces_LineOut — Line-Level Stock Insert

Same logic as `PROC_Stock_ProdPieces` but with `EmpID = @LineID`:
- Stock is added to `Pcs_StockTable` WHERE `EmpID = @LineID`
- Source stage deduction also WHERE `EmpID = @LineID`
- Creates line-partitioned stock allowing WIP visibility per line

### 9.4 PROC_Stock_ProdPieces_LineOut_PrdEntry — PrdEntry Line Variant

Called by `Sp_ProductionEntryQty_1` for standard production:
- Similar to `PROC_Stock_ProdPieces_LineOut` but reads `SrcLineID` from `Trs_ProdEntry`
- Output stock added with `EmpID = 0` (non-line-specific)
- Source deduction from `EmpID = @SrcLineID` (deducts from the line that held the WIP)

### 9.5 Rework Variants

`PROC_Stock_ProdPieces_LineOut_PrdEntry_ReWrk` and `PROC_Stock_ProdPieces_Update_LineOut_Rewrk`:
- Same as non-rework but consume from `GoodPcsFlag='M'` source stock
- Called by `Sp_ProductionEntryQty_2` when `Rework = 1`

---

## 10. Stock Posting Engine — Production Pieces

### 10.1 PROC_Stock_ProdPieces — Core Insert Logic

The central stock posting procedure for piece production. Called by all `Sp_ProductionEntryQty_*` variants.

**Input resolution** (from `Trs_ProdEntry`):
```
@Coycode, @Ordid, @StyleNo, @StageId, @SourceStageId, @PartId,
@GodId, @ColId, @Rework, @RejectionTypeId, @LotID, @ComboID,
@FinalStage (from Mas_Dept.SemiFinish), @EntryOption (from OrderStyleDtl)
```

**Core stock posting logic:**

1. **ADD stock at target stage**:
   ```sql
   -- If record exists: UPDATE += @StockQty
   UPDATE Pcs_StockTableQty SET StockQty = StockQty + @StockQty,
                                ProductionQty = ProductionQty + @StockQty
   WHERE ... Stageid = @Stageid AND GoodPcsFlag = 'G' AND RejectionTypeId = 0

   -- If no record: INSERT new row
   INSERT INTO Pcs_StockTableQty (..., StockQty, ProductionQty, GoodPcsFlag)
   VALUES (..., @StockQty, @StockQty, 'G', 0)
   ```

2. **DEDUCT from source stage** (conditional on stage type):

### 10.2 Semi-Finished (FinalStage='S') Source Deduction

When the target stage is semi-finished and PcsType='Piece':
```sql
-- StageId ≠ 1, Rework = 0 or 2:
UPDATE Pcs_StockTableQty SET StockQty = StockQty - @StockQty
WHERE Stageid = @SourceStageId AND GoodPcsFlag = 'G' AND RejectionTypeId = 0

-- StageId ≠ 1, Rework = 1:
UPDATE Pcs_StockTableQty SET StockQty = StockQty - @StockQty
WHERE Stageid = @SourceStageId AND GoodPcsFlag = 'M' AND RejectionTypeId = @RejectionTypeId

-- StageId = 1 AND Rework = 1 (rework at cutting):
-- Same deduction from source stage 'M' stock
```

### 10.3 Finished (FinalStage='F') Multi-Part Deduction

When the target stage is finished and PcsType='Piece':

**EntryOption=1** (Standard order):
```sql
UPDATE Pcs_StockTableQty SET StockQty = StockQty - @StockQty
FROM Pcs_StockTableQty
INNER JOIN Pcs_StockTable ON ...
INNER JOIN Trs_ProdEntry_SourceStageDtl ON
    Pcs_StockTable.PartId = Trs_ProdEntry_SourceStageDtl.PartId
    AND Pcs_StockTable.StageId = Trs_ProdEntry_SourceStageDtl.SourceStageId
WHERE Trs_ProdEntry_SourceStageDtl.ID = @Id
```

**EntryOption=2** (Pack order):
```sql
UPDATE Pcs_StockTableQty SET StockQty = StockQty - (@StockQty * IsNull(OrderQtyDtl.PcsPerColor, 1))
FROM Pcs_StockTableQty
INNER JOIN Pcs_StockTable ON ...
INNER JOIN OrderQtyDtl ON ... AND OrderQtyDtl.CmbClrID = @ComboID
INNER JOIN Trs_ProdEntry_SourceStageDtl ON ...
```

The pack-order variant multiplies the deduction by `PcsPerColor` from `OrderQtyDtl`, deducting proportionally across combo colors.

### 10.4 Pack-Order (EntryOption=2) PcsPerColor Multiplier

For pack orders:
- Each production "piece" at the finished stage represents a packed unit
- The packed unit contains multiple pieces from different colors
- `OrderQtyDtl.PcsPerColor` stores how many pieces of each color are in one pack
- Stock deduction multiplies: `@StockQty × PcsPerColor`

### 10.5 Rework (0/1/2) Stock Source Selection

| Rework Value | Source GoodPcsFlag | Source RejectionTypeId | Meaning |
|------|-------------------|----------------------|---------|
| 0 | `'G'` | 0 | Normal production — consumes good pieces |
| 1 | `'M'` | `@RejectionTypeId` | Rework from rejection — consumes mend/rejected pieces |
| 2 | `'G'` | 0 | Rework from alteration — consumes good pieces |

### 10.6 Update / Delete Variants

| Procedure | Behavior |
|-----------|----------|
| `PROC_Stock_ProdPieces_Update` | Adjusts existing stock record (+/- delta) |
| `PROC_Stock_ProdPieces_Update_LineOut` | Updates line-level stock |
| `PROC_Stock_ProdPieces_Update_LineOut_Rewrk` | Updates rework line-level stock |
| `PROC_Stock_ProdPieces_Delete` | Reverses stock: deducts from target, adds back to source |
| `PROC_Stock_ProdPieces_Delete1` | Alternative delete variant |
| `PROC_Stock_ProdPieces_Delete_LineOut_PrdEntry` | Reverses line-output-based stock |
| `PROC_Stock_ProdPieces_Delete_LineOut_PrdEntry_Rewrk` | Reverses rework line output |
| `PROC_Stock_ProdPieces_Delete1_LineOut_Prdentry` | Alt delete for line output |
| `PROC_Stock_ProdPieces_Delete1_LineOut_Prdentry_Rewrk` | Alt delete for rework line output |
| `PROC_Stock_ProdPieces_Delete_IssueToPrdn` | Reverses issue-to-production stock |
| `PROC_Stock_ProdPieces_Delete1_IssueToPrdn` | Alt delete for issue-to-production |

---

## 11. Stock Posting Engine — Production Panels

### 11.1 PROC_Stock_ProdPanel — Core Panel Insert

**Parameters**: `@Id`, `@SizeId`, `@ProdPcs`, `@compID`

**Input resolution** (from `Trs_AddPanelEntry`):
```
@Coycode, @Ordid, @StyleNo, @StageId, @SourceStageId,
@PartId, @GodId, @ColId, @Rework, @RejectionTypeId,
@LotID, @ComboID, @FinalStage, @SeqNo, @EntryOption
```

**Core logic** — same ADD+DEDUCT pattern as pieces, but:
- Writes to `Panel_StockTable` / `Panel_StockTableQty` (not Pcs_)
- Includes `CompId` dimension: `Panel_StockTableQty.CompId = @compID`
- Source deduction supports both `PcsType='Piece'` and `PcsType='Panel'` at the source stage

### 11.2 PROC_Stock_ProdPanel_Asm — Assembly Variant

For panel assembly operations:
- Same insert logic for target stage
- Source deduction from previous stage in `Panel_StockTable`
- Used when `CutPanel_Assemble = 'A'` (assembly mode)

### 11.3 Panel_StockTable CompId Dimension

Unlike `Pcs_StockTable`, `Panel_StockTable` tracks stock per component:
```
Panel_StockTable: Coycode + Ordid + StyleNo + StageId + PartId + GodId + LotId
Panel_StockTableQty: PcsStockId + ColId + SizeId + CompId + GoodPcsFlag + RejectionTypeId → StockQty
```

### 11.4 Source Stage Deduction

Panel source deduction fires when:
- `StageId ≠ 1` AND `FinalStage = 'S'` AND `PcsType IN ('Piece', 'Panel')`
- OR `StageId = 1` AND `Rework = 1` (rework at cutting stage)

### 11.5 Update / Delete Variants

| Procedure | Purpose |
|-----------|---------|
| `PROC_Stock_ProdPanel_Update` | Updates existing panel stock |
| `PROC_Stock_ProdPanel_Update_ASM` | Updates assembly panel stock |
| `PROC_Stock_ProdPanel_Delete` | Reverses panel stock |
| `PROC_Stock_ProdPanel_Delete1` | Alt delete variant |
| `PROC_Stock_ProdPanel_Delete_Prdn` | Delete specific to production entry |
| `PROC_Stock_ProdPanel_Delete1_Prdn` | Alt delete for production |
| `PROC_Stock_ProdPanel_Delete1_ASM` | Delete for assembly |

---

## 12. Production Rejection Stock Handling

### 12.1 PROC_Stock_ProdRej_Insert_Line — Line-Stage Rejection

Handles rejection at semi-finished (line) stages:

1. **Reads context** from `Trs_PcsRej`:
   - `Stk_StageId` (may differ from `StageId`) — the stock-affecting stage
   - `StageId` — the stage where rejection was recorded
   - `LineID` — the production line

2. **Stock operations**:
   - **ADD** rejection stock at `StageId` with `GoodPcsFlag='M'` and `RejectionTypeId=@RejectionTypeId`
   - **DEDUCT** good stock from the line's stock at `StageId`: `WHERE EmpID = @LineID AND GoodPcsFlag='G'`

### 12.2 PROC_Stock_ProdRej_Insert_Finish — Finished-Stage Rejection

More complex — handles multi-part finished goods rejection:
- Uses cursor over `OrderQtyDtl` filtered by order/style/color
- For `EntryOption=1`: iterates over parts with `PcsPerColor`
- For `EntryOption=2` (pack order): iterates with lot filtering
- Similar ADD 'M' / DEDUCT 'G' logic but across multiple parts

### 12.3 Delete Variants

- `PROC_Stock_ProdRej_Delete_Line` — Reverses line-stage rejection
- `PROC_Stock_ProdRej_Delete_Finish` — Reverses finished-stage rejection

### 12.4 RejectionTypeId and GoodPcsFlag='M' Mechanics

When rejection is recorded:
```
Target stage stock: +@Qty WHERE GoodPcsFlag='M', RejectionTypeId=@RejTypeId
Source stock:       -@Qty WHERE GoodPcsFlag='G', RejectionTypeId=0, EmpID=@LineId
```

The rejected pieces remain in the stock system but are flagged as 'M' (mend). They can be:
- Reworked via production entry with `Rework=1` (consuming 'M' stock, producing 'G' stock)
- Written off via stock adjustment
- Tracked in rejection reports

---

## 13. Barcode-Based Production Posting

### 13.1 SP_Barcode_Production_Posting — Batch Posting

Converts barcode-scanned bundle and piece production data from the `Fiber_production` database into regular ERP transaction records.

**Two-phase cursor processing** within a transaction:

### 13.2 Bundle Cursor (Phase 1)

```sql
CURSOR FOR
  SELECT A.Coycode, A.prodDate, A.StageID, B.OrdID, B.StyleId,
         C.ColId, A.EmpId, 0 as Rework, 'N' as Pay, B.StyleNo,
         C.PartID, 1 as GodID, 1 as PreparedBy, A.HrsID,
         SizeId, SUM(A.Pcs) as ProdPcs, A.SourceStageId, B.LotNo
  FROM Pay_Bundle_ProdEntry A
  INNER JOIN Pay_BarcodeGeneration B ON A.barcode = B.barcode ...
  INNER JOIN Pay_CuttProdMas C ON A.BundleMasID = C.ID
  INNER JOIN Pay_CuttProd_Bundle D ON D.Id = C.Id ...
  WHERE ISNULL(PostingFlg,'N') = 'N'
  GROUP BY [all dimensional columns]
```

For each cursor row:
1. Generate new `ProdID` = MAX(ID) + 1 from `Trs_ProdEntry`
2. Resolve `LotId` from `Mas_Lot`
3. INSERT into `Trs_ProdEntry`
4. EXEC `Sp_ProductionEntryQty @ProdID, @SizeID, @ProdPcs` (triggers normal stock posting)
5. UPDATE `Pay_Bundle_ProdEntry SET PostingFlg = 'Y'`

### 13.3 Piece Cursor (Phase 2)

Same pattern but from `Pay_Pcs_ProdEntry` (individual piece barcode scans):
- Groups by the same dimensions
- Additionally updates `Pay_BundlePcs_Barcode.ProdID` and `PostingFlg` for piece-level traceability
- Links back to the created `Trs_ProdEntry.Id`

### 13.4 PostingFlg Lifecycle

| Table | PostingFlg | Meaning |
|-------|-----------|---------|
| `Pay_Bundle_ProdEntry` | NULL / 'N' | Not yet posted to ERP |
| `Pay_Bundle_ProdEntry` | 'Y' | Posted to Trs_ProdEntry |
| `Pay_Pcs_ProdEntry` | NULL / 'N' | Not yet posted |
| `Pay_Pcs_ProdEntry` | 'Y' | Posted |
| `Pay_BundlePcs_Barcode` | 'Y' + ProdID set | Posted with production entry link |

The entire batch posting runs within a transaction with rollback on error.

---

## 14. Production Status & WBS Cloud Integration

### 14.1 SP_ST_Production_Data — Per-Transaction Snapshot Updates

Called after every production-affecting transaction to maintain the `ST_Production_Data` denormalized table.

**Parameters**: `@Coycode, @Ordid, @StyleNo, @PartID, @ColID, @SizeId, @StageId, @Qty, @TransType, @transFlg, @PartyId`

**Logic per TransType**:
- `'PRDN'`: Upserts `ProdQty += @Qty` (or `-= @Qty` if `@transFlg = '-'`)
- `'DC'`: Upserts `DCQty += @Qty` with PartyId dimension
- `'GRN'`: Upserts `GRNQty += @Qty` with PartyId dimension
- `'REJ'`: Upserts `RejQty += @Qty` with PartyId dimension
- `'REWRK'`: Upserts `ReworkQty += @Qty`

On DC deletion (`@transFlg = '-'`), also zeroes out `OrderQty` and `OrderWithExsQty` if all quantities are zero (cleanup).

### 14.2 SP_ST_Supp_Production_Data — Supplier Snapshot

Same structure and logic as `SP_ST_Production_Data` but for `ST_Supp_Production_Data` table, tracking supplier/outsourced production.

### 14.3 Sp_WBS_Production — WBS Production Master Update

Maintains the `WBS_Production` planning table.

**EntryFlg values**:
| Flag | Operation |
|------|-----------|
| — (`@NewFlg='Y'`) | INSERT new WBS row |
| `'PD'` | Update DcQty (delivery) |
| `'PR'` | Update ProdQty (production) |
| `'SC'` | Update PlanStart / PlanFinish (schedule) |

**After update, calculates**:
1. **BGColor** — schedule status color based on plan vs actual dates
2. **OrderQty / OrderWithExsQty** — from `OrderQtyDtl` / `OrdQtyClrDtl`
3. **ST_Production_Data OrderQty** — syncs order quantities to detail table
4. **Finish_Percent** = `(ProdQty + GRNQty) / OrderQty × 100`
5. **Finish_Percent_4Exs** = `(ProdQty + GRNQty) / OrderWithExsQty × 100`

### 14.4 Sp_WBS_Production_DateWise — Date-Wise WBS Update

Maintains daily production quantities in `WBS_Production_DateWise`.

**Key features**:
- Distinguishes sewing vs non-sewing departments (via `Options.Stitching_DeptCode`)
- For sewing departments (`@SewingFlg='Y'`): supports line-level tracking with `LineID`
- For non-sewing: standard department-level tracking
- Supports `@DelFlg` for delete operations (subtracts quantities)
- Checks `Options.Allow_Excess_InBudget` for budget excess control

### 14.5 Sp_WBS_Line_Production — Line-Wise WBS Update

Upserts into `WBS_LineProduction` — per-line, per-day, per-color/size quantities.

### 14.6 Sp_WBS_Supp_Production — Supplier WBS Update

Same as `Sp_WBS_Production` but for `WBS_Supp_Production` table:
- Order quantities sourced from `SuppOrdMas` / `SuppOrdDet` instead of `OrderQtyDtl`
- BGColor schedule logic identical
- Updates `ST_Supp_Production_Data` with order quantities and finish percentages

### 14.7 Color-Coded Schedule Status (BGColor Logic)

```
IF PlanStart AND PlanFinish are set:
  IF ActualFinish is set:
    IF ActualFinish ≤ PlanFinish → 'Green'       (completed on time)
    ELSE                        → 'LightGreen'  (completed late)
  ELSE IF ActualStart is set (no finish):
    IF ActualStart ≤ PlanStart → 'Blue'          (started on time)
    ELSE IF PlanFinish ≥ Today → 'LightBlue'     (in progress, on track)
    ELSE IF PlanFinish < Today → 'Red'            (in progress, delayed)
  ELSE (not started):
    IF PlanFinish ≥ Today      → 'Silver'         (not yet due)
    ELSE IF PlanFinish < Today → 'Orange'          (overdue, not started)
```

### 14.8 Finish Percent Calculation

Two formulas applied in `Sp_WBS_Production`:

**Standard finish %**:
$$\text{Finish\\_Percent} = \frac{\sum(\text{ProdQty}) + \sum(\text{GRNQty})}{\sum(\text{OrderQty})} \times 100$$

**Excess-adjusted finish %**:
$$\text{Finish\\_Percent\\_4Exs} = \frac{\sum(\text{ProdQty}) + \sum(\text{GRNQty})}{\sum(\text{OrderWithExsQty})} \times 100$$

Where `OrderWithExsQty = CutPlanQty` (order qty + excess percentage).

---

## 15. Production Status Views & Registers

### 15.1 SP_Vue_PRodStatus — Barcode-Based Production Status View

Dynamically creates/alters `Vue_PRodStatus` view using UNION of 6 subqueries:

| Subquery | Source | Metric |
|----------|--------|--------|
| 1 | `Trs_ProdEntry` + `Trs_ProdEntryQty` WHERE StageId=1 | `CutPcs` — cutting output |
| 2 | `Pay_BarcodeGeneration` + `Pay_Bundle_IsstoLine` | `LineFeedPcs` — pieces fed to line |
| 3 | `Pay_Pcs_ProdEntry` WHERE WorkType='N' | `LineOutputPcs` — line output |
| 4 | `Pay_Pcs_ProdEntry` WHERE WorkType='N', ReworkFlg='N' | `GoodPcs` — good output |
| 5 | `Pay_Pcs_ProdEntry` WHERE WorkType='R', ReworkFlg='N' | `RejectPcs` — rejected |
| 6 | `Pay_Pcs_ProdEntry` WHERE WorkType='R', ReworkFlg='N' | `ReworkWIP` — rework WIP |

Aggregated by: Coycode, Ordid, StyleNo, PartId, ColId, SizeId.

### 15.2 SP_Vue_PRodStatus_1 — External DB Variant

Same metrics but sourced from an external `Fiber_production` database:
- Uses dynamic SQL with `@DBName` parameter for cross-database joins
- Joins external tables: `Cutting`, `Orders`, `Bundle`, `BundlePiece`, `LineIssueEntry`, `LineIssue`, `LineOutput`, `ProductionEntry`
- Adds `LineID` dimension for line-level visibility
- `EntryType` classification: `'GD'` = Good, `'RJ'` = Reject, `'RW'` = Rework

### 15.3 SP_Vue_Prod_PCSNew — New PCS Production View

Creates `Vue_PRodStatus` view from external DB with enhanced structure:
- Uses `Final_StageId` from `Cutting` table for stage grouping
- Includes `ColorID` and `SizeId` for detailed breakdown
- No `CutPcs` column (only LineFeed, LineOutput, Good, Reject, Rework)

### 15.4 SP_Vue_Prod_Consolidate_PCS / _Line — Consolidated Views

**`SP_Vue_Prod_Consolidate_PCS`**: Creates `Vue_Prod_Consolidate_PCS` — consolidated production by Stage, Order, Style, Part:
- Aggregates LinePcs, LineOutPcs, GoodPcs, RejPcs, ReworkPcs
- GoodPcs counted only at the max `OperationSeqNo` where `Inspection_Operation='Y'` (final inspection)
- Rework identified by `EntryType='RK'`

**`SP_Vue_Prod_Consolidate_PCS_Line`**: Same but with `LineID` dimension retained for line-level drill-down.

### 15.5 SP_Vue_Rpt_OverallProduction_Det — Overall Production Detail View

Creates `Vue_Rpt_OverallProduction_Det` — comprehensive production detail view combining:
- `Trs_ProdEntry` + `Trs_ProdEntryQty` (direct production entries, PcsType='Piece'/'Bit')
- `Trs_PcsGrn1` + `Trs_PcsGrn2` + `Trs_PcsGrn3` (piece receipts from job work)
- Includes: Coycode, ExporterName, OrdId, StyleNo, StyleDesc, WorkComplDet, OrderSno, Dt, ColorDesc, PartName, StageID, EntryOption
- Calculates correlated subqueries for OrderQty and OrderQtyExs per row

Supports two EntryOption modes:
- `EntryOption=1`: Part-wise order quantities from `OrderQtyDtl`
- `EntryOption=2`: Combo-color order quantities from `OrdQtyClrDtl` (with excess calculation)

### 15.6 SP_Vue_RptShiftWagesReg — Shift Wages Register View

Creates `Vue_RptShiftWagesReg` view combining:
- `Trs_ProdWages` — shift wages data
- `OrderMas` — order details (BuyOrdNo, JobNo, FinYear)
- `Mas_Emp` — employee name
- `Mas_Part` — part name
- `Mas_JobWrkComp` — stage/work description
- `OrderQtyDtl` — order quantities
- Cutting Qty from `Trs_ProdEntry` WHERE StageId=1 (OR from `Trs_PcsGrn1` for receipts)
- Cumulative Output from `Trs_ProdEntryQty` (OR `Trs_PcsGrn2`)
- Cumulative Cost = SUM(ShiftWages + Addl_Amount) accumulated per stage/employee

### 15.7 FrmProductionStatusReg — Production Status Register

Form displaying production status across stages for selected orders/styles.

### 15.8 FrmInhouseProductionStatusReg — In-House Status

Focuses on in-house (non-outsourced) production status tracking.

### 15.9 Frm_ProductionEntryReg — Production Entry Register

Register/report view of all production entries with filtering by date range, order, stage, etc.

---

## 16. Hourly Production & Shift Management

### 16.1 FrmHourlySetting1 — Hourly Target Configuration

Configures hourly production targets per department/stage. Defines expected output per hour for capacity planning and efficiency monitoring.

### 16.2 frmHours — Hour Definition

Defines time slots (shift hours) for production tracking:
- Hour ID (HrsID) linked to production entries
- Start time / End time per slot
- Used for hourly production reporting and shift handover

### 16.3 HrsID Linkage to Production Entry

`Trs_ProdEntry.HrsID` and `Pay_Bundle_ProdEntry.HrsID` link each production entry to a specific hour slot, enabling:
- Hourly production reports
- Shift efficiency analysis
- Peak hour identification

---

## 17. Production Wages & Cost

### 17.1 Frm_ProductionWages / Frm_ProdWagesDept / Frm_ProdWagesStage

Three views for managing production wages:
- `Frm_ProductionWages` — Main wages entry form
- `Frm_ProdWagesDept` — Department-wise wages view
- `Frm_ProdWagesStage` — Stage-wise wages view

### 17.2 Trs_ProdWages Table Structure

Records shift wages per operator per production entry (see Section 3.5).

### 17.3 ShiftWages Calculation

From the `Vue_RptShiftWagesReg` view:
- Wages tracked per entry (order + style + stage + employee + date)
- Includes `no_of_persons` for group operations
- `Addl_Amount` for incentives/overtime

### 17.4 Cumulative Cost Tracking

```sql
CumCost = SUM(ISNULL(ShiftWages, 0) + IsNull(Addl_Amount, 0))
-- Grouped by: Coycode, Ordid, StyleNo, StageId, PartId, EmpId
```

This gives the total cost accumulated per operator per stage per order.

---

## 18. Production Configuration & Routing

### 18.1 frmProdutionConfig — Production Configuration

Global production settings and options:
- Default godown for production
- Stock posting behavior flags
- Line-level tracking enable/disable
- Barcode integration settings

### 18.2 Frm_ProRouteTemplate — Production Route Template

Defines reusable production route templates:
- Template name + description
- Ordered list of stages (from `Mas_JobWrkComp`)
- Applied to orders during order setup → creates `Prod_Sequence` records

### 18.3 Frm_SubProcess — Sub-Process Definition

Defines sub-processes within a main production stage:
- Sub-process name and description
- Linked to parent stage
- Used for detailed operation tracking

### 18.4 FrmProcessByPassSetting — Process Bypass

Configures which stages can be bypassed:
- Order/style specific bypass rules
- Conditions under which a stage can be skipped
- Applied during production entry validation

### 18.5 FrmOperationEntry — Operation Entry

Records individual operations within a production stage (finer granularity than stage-level production entry). Used when detailed operation tracking is needed.

### 18.6 FrmSuppProdSequence — Supplier Production Sequence

Defines production stage sequences for supplier/outsourced production:
- Similar to `Prod_Sequence` but for supplier orders
- Creates `WBS_Supp_Production` planning records

---

## 19. Finished Goods Entry

### 19.1 FrmFinishGoodsEntry — Finished Goods Entry

Records the final step of production — pieces that have passed final QC and are ready for dispatch.

**Stock Effect**:
- Adds to `Pcs_StockTable` at the finished stage (FinalStage='F')
- May trigger source deduction from the last semi-finished stage
- Sets final good piece flag: `GoodPcsFlag='G'`, `RejectionTypeId=0`

### 19.2 FrmPcsFinishedGoods — Finished Goods Report

Report/register displaying finished goods inventory by order/style/color/size, sourced from `Pcs_StockTable` WHERE StageId is at a finished stage (`Mas_Dept.SemiFinish='F'`).

**Report template**: `PcsFinishedGoods.mrt`

---

## 20. Triggers — Cloud Sync & Audit

All production-related triggers follow the same pattern: detect non-sync changes and set an `UpdateFlg` for cloud replication.

### 20.1 Trg_ST_Production_Data_Update

**Table**: `ST_Production_Data`  
**Fires**: AFTER UPDATE  
**Logic**:
```sql
IF NOT (UPDATE(server_id) OR UPDATE(UpdateFlg))
  SET UpdateFlg = 1 WHERE [matching row]
```
Ensures that real data changes (not sync-originated changes) are flagged for replication.

### 20.2 Trg_WBS_Production_Update_Actual

**Table**: `WBS_Production`  
**Fires**: AFTER UPDATE  
**Logic**: Only fires when `ActualStart` or `ActualFinish` is updated → sets `ActualPosting_UpdateFlg = 1`  
**Purpose**: Signals that actual schedule dates have changed and need cloud sync.

### 20.3 Trg_WBS_Production_DateWise

**Table**: `WBS_Production_DateWise`  
**Fires**: AFTER UPDATE  
**Logic**: Same `UpdateFlg = 1` pattern on non-sync changes.

### 20.4 Trg_WBS_LineProduction

**Table**: `WBS_LineProduction`  
**Fires**: AFTER UPDATE  
**Logic**: Same pattern — sets `UpdateFlg = 1` for line-level production changes.

### 20.5 Trg_ST_ProdRequirement_Update

**Table**: `ST_ProdRequirement`  
**Fires**: AFTER UPDATE  
**Logic**: Same pattern — sets `UpdateFlg = 1` when production requirements change.

---

## 21. Reports Catalog

| Report File | Purpose |
|------------|---------|
| `PcsFinishedGoods.mrt` | Finished goods inventory report |
| `Pcs_IssueToProd.mrt` | Issue-to-production report |
| `RollPrint.mrt` | Roll printing for production tracking |
| `PcsDc1_SGST_Cost.mrt` (+ variants) | Piece DC with GST — production-originated deliveries |

**Dynamic Views used as report data sources**:
- `Vue_PRodStatus` — Production status dashboard
- `Vue_Prod_Consolidate_PCS` / `_Line` — Consolidated production view
- `Vue_Rpt_OverallProduction_Det` — Overall production detail report
- `Vue_RptShiftWagesReg` — Shift wages register report

---

## 22. Cross-Module Dependencies

### Dependencies on This Module (consumed by):

| Consumer Module | Dependency |
|----------------|-----------|
| **Dispatch & Delivery (07)** | Production creates stock in `Pcs_StockTable` that delivery consumes via `PROC_Stock_PiecesDelivery_Insert` |
| **Accounting & Billing (08)** | Production quantities feed invoice/debit note calculations |
| **Costing & Budgeting (09)** | `Trs_ProdWages` feeds production cost analysis; `ST_Production_Data` provides budget vs actual |
| **Job Work & Outsourcing (10)** | `WBS_Supp_Production` and `ST_Supp_Production_Data` track outsourced production |
| **Quality (10)** | Rejection entries (`Trs_PcsRej` → `PROC_Stock_ProdRej_*`) interface between QC and production |
| **Reporting (14)** | All dynamic views (`Vue_*`) feed dashboards and reports |

### Dependencies from Other Modules (this module consumes):

| Source Module | Dependency |
|--------------|-----------|
| **Masters (01)** | `Mas_JobWrkComp`, `Mas_Dept`, `Mas_Part`, `Mas_Size`, `Mas_Color`, `Mas_Lot`, `Mas_Emp`, `Mas_Godown`, `Mas_RejectionType`, `Mas_Component`, `Mas_Exporter` |
| **Orders (02)** | `OrderMas`, `OrderStyleDtl`, `OrderQtyDtl`, `OrdQtyClrDtl` — order/style/size/color/part specifications |
| **Cutting & Panels (05)** | `Trs_AddPanelEntry` (panel production headers), `Panel_StockTable` (panel stock), cutting production at StageId=1 |
| **Inventory (04)** | `Pcs_StockTable` / `Pcs_StockTableQty` — shared stock tables |
| **Barcode System** | `Pay_Bundle_ProdEntry`, `Pay_Pcs_ProdEntry`, `Pay_BarcodeGeneration`, `Pay_CuttProdMas`, `Pay_CuttProd_Bundle`, `Pay_Bundle_IsstoLine`, `Pay_BundlePcs_Barcode` (from `Fiber_production` DB) |

### Key Shared Tables

| Table | Modules | Notes |
|-------|---------|-------|
| `Pcs_StockTable` / `Pcs_StockTableQty` | 04, 05, 06, 07 | Primary stock — production writes, delivery/issue/receipt deducts |
| `Panel_StockTable` / `Panel_StockTableQty` | 05, 06, 07 | Panel stock with CompId dimension |
| `Prod_Sequence` | 05, 06 | Stage ordering — shared between cutting and production |
| `Trs_ProdEntry` / `Trs_ProdEntryQty` | 05, 06 | Both cutting (StageId=1) and production stages |
| `ST_Production_Data` | 06, 07, 09 | Denormalized snapshot updated by multiple transaction types |
| `WBS_Production` | 06 | Primary owner; consumed by cloud sync and reporting |
| `Options` / `Options1` | All | System-wide configuration flags |
