# Module 5 — Cutting, Panels & Piece Goods

> **Generated**: 2026-03-15  
> **Source**: 30+ forms (cutting, panel, piece, bundle, barcode), ~60 stored procedures (stock posting, barcode validation, cutting reports, piece DC/GRN, panel production, assembly), 3 ready-to-cut triggers (TRG_FAB_BALANCE_RCUT, _DEL, _RET), 1 key view (Vue_PcsStockDtl_PART), 30+ report templates (.mrt/.rpt), 4 report code-behind files (.cs)  
> **Foundation References**: database-schema.md, stored-procedures-analysis.md, triggers-and-views-analysis.md, formulas-and-calculations.md, 01-masters-configuration.md, 04-inventory-warehouse.md

---

## Table of Contents

1. [Module Overview](#1-module-overview)
2. [Forms Inventory](#2-forms-inventory)
3. [Data Model — Core Transaction Tables](#3-data-model--core-transaction-tables)
   - 3.1 Trs_AddPanelEntry — Panel/Cutting Production Header
   - 3.2 Trs_AddPanelEntryQty / _Det / _Component — Panel Production Details
   - 3.3 Trs_ProdEntry / Trs_ProdEntryQty — Production Entry (General)
   - 3.4 Trs_Pcs1 / Trs_Pcs2 — Piece Delivery (DC)
   - 3.5 Trs_PcsGrn1 / Trs_PcsGrn2 — Piece/Panel Receipt (GRN)
   - 3.6 Trs_ReadyToCut1 / Trs_ReadyToCut2 — Ready-to-Cut Issue
   - 3.7 Trs_ReadyToCut_Ret1 / _Ret2 — Ready-to-Cut Return
   - 3.8 Trs_CutApr — Cutting Acknowledgement
   - 3.9 Trs_PcsAdj1 / Trs_PcsAdj2 — Piece Stock Adjustment
   - 3.10 Trs_PcsStockTfr1 / _Tfr2 — Piece Stock Transfer
   - 3.11 Trs_PcsGodAck — Piece Godown Acknowledgement
4. [Stock Tables — Panel & Piece Goods](#4-stock-tables--panel--piece-goods)
   - 4.1 Panel_StockTable / Panel_StockTableQty
   - 4.2 Pcs_StockTable / Pcs_StockTableQty
   - 4.3 Stock Table Composite Keys
5. [Barcode & Bundle Tables](#5-barcode--bundle-tables)
   - 5.1 Pay_CuttProdMas — Cutting Production Master
   - 5.2 Pay_CuttProd_Bundle — Bundle Master
   - 5.3 Pay_BarcodeGeneration — Barcode Generation
   - 5.4 Pay_BundlePcs_Barcode — Piece-Level Barcode (Fiber_production DB)
   - 5.5 Pay_Bundle_IsstoLine — Bundle Issue to Line
   - 5.6 Pay_Pcs_ProdEntry — Piece Barcode Production Entry
   - 5.7 Prod_PcsRworkIssue — Piece Rework Issue
6. [Production Sequence & Stage Model](#6-production-sequence--stage-model)
   - 6.1 Prod_Sequence — Stage Ordering
   - 6.2 Mas_JobWrkComp — Stage/Work Component Definition
   - 6.3 Mas_Dept — Department Flags (SemiFinish/FinalStage)
   - 6.4 PcsType Classification (Piece / Panel / Bit)
7. [Cutting Production](#7-cutting-production)
   - 7.1 FrmCuttingProduction_Auto_New — Automated Cutting Entry
   - 7.2 frmAddPanelCutting — Panel Cutting Entry
   - 7.3 frmCuttingIssue — Fabric Issue for Cutting
   - 7.4 frmcuttingack — Cutting Acknowledgement
   - 7.5 FrmCutting_FabRej — Cutting Fabric Rejection
   - 7.6 FrmCuttingfabretreg — Cutting Fabric Return Register
   - 7.7 frmCuttingJobOrder — Cutting Job Order
   - 7.8 FrmCutingReg — Cutting Register
8. [Panel Production & Management](#8-panel-production--management)
   - 8.1 Panel Production Flow (Cut → Panel → Assembly → Piece)
   - 8.2 frmAddPanelCutting — Panel Entry (CutPanel_Assemble Flag)
   - 8.3 frmPanelRej — Panel Rejection
   - 8.4 frmPanelDelRework — Panel Delivery for Rework
   - 8.5 FrmPanelExcessEntry / FrmPanelExcessEntryStage — Panel Excess
   - 8.6 SP_PanelAssemblyStock — Assembly Stock Query
   - 8.7 SP_Cuttingpanelrpt — Cutting Panel Report
9. [Piece Delivery (DC)](#9-piece-delivery-dc)
   - 9.1 frmPcsDel — Piece Delivery Challan (Standard)
   - 9.2 frmPcsDel_Ship — Piece Delivery for Shipment
   - 9.3 frmPcsDelRework — Piece Delivery for Rework/Reprocess
   - 9.4 frmPcsDelRecClose — Piece Delivery Receipt Close
   - 9.5 Delivery Types (Process / Despatch / Sales / Unit Transfer-Panel / JobWork Return)
   - 9.6 Stock Posting on Delivery (PROC_Stock_PiecesDelivery_Insert)
10. [Piece Receipt (GRN)](#10-piece-receipt-grn)
    - 10.1 frmPcsRec — Piece Receipt (Standard)
    - 10.2 GRN Types (Process Return / Receipt)
    - 10.3 GAN (GRN Acceptance Note) Workflow
    - 10.4 Stock Posting on Receipt (PROC_PiecesReceipt_Insert)
    - 10.5 Panel Receipt (PROC_PanelReceipt_Insert)
11. [Ready-to-Cut Flow](#11-ready-to-cut-flow)
    - 11.1 frmReadytoCut — Ready-to-Cut Issue Form
    - 11.2 SP_RtoCut — Ready-to-Cut Fabric Balance Calculation
    - 11.3 TRG_FAB_BALANCE_RCUT Trigger — Auto Program Balance Update
    - 11.4 Ready-to-Cut Return
    - 11.5 Reports: READYTOCUT.mrt, READYTOCUTRETURN.mrt
12. [Barcode & Bundle System](#12-barcode--bundle-system)
    - 12.1 frmBarcodeReadingNew — Barcode Scanning Entry
    - 12.2 FrmBundle_ProductionEntry — Bundle Production Entry
    - 12.3 SP_BundleBarcode_Check — Bundle Barcode Validation
    - 12.4 SP_PcsBarcode_Check — Piece Barcode Validation & Production Entry
    - 12.5 SP_PcsBarcode_Check_Rejection — Rejection via Barcode
    - 12.6 SP_Barcode_Production_Posting — Batch Posting to Trs_ProdEntry
    - 12.7 Barcode Lifecycle (Generate → Issue to Line → Production Scan → Complete)
13. [Piece Goods Godown Transfer](#13-piece-goods-godown-transfer)
    - 13.1 FrmPcsGodTransfer — Piece Godown Transfer
14. [Piece Rejection & Shortage](#14-piece-rejection--shortage)
    - 14.1 frmPcsRej — Piece Rejection Entry
    - 14.2 frmPcsShort — Piece Shortage Tracking
    - 14.3 Rejection Type Classification (RejectionTypeId)
    - 14.4 GoodPcsFlag Logic ('G' = Good, 'M' = Rework/Mend)
15. [Piece Stock Adjustment & Opening](#15-piece-stock-adjustment--opening)
    - 15.1 frmPcsStockAdjustmentEntry — Stock Adjustment
    - 15.2 frmPcsStagewiseOpeningStock — Stage-wise Opening Stock
16. [Finished Goods Entry](#16-finished-goods-entry)
    - 16.1 FrmFinishGoodsEntry — Finished Goods Entry
    - 16.2 FrmPcsFinishedGoods — Finished Goods Report
17. [Stock Posting Engine — Panel](#17-stock-posting-engine--panel)
    - 17.1 PROC_Stock_ProdPanel — Panel Production Stock Insert
    - 17.2 PROC_Stock_ProdPanel_Asm — Assembly Variant
    - 17.3 PROC_Stock_PanelDelivery_Insert / _Update
    - 17.4 PROC_Stock_DeliveryPanel_Delete / _Delete_1
    - 17.5 PROC_PanelReceipt_Insert / _Update / _Delete
18. [Stock Posting Engine — Pieces](#18-stock-posting-engine--pieces)
    - 18.1 PROC_Stock_ProdPieces — Piece Production Stock Insert
    - 18.2 PROC_Stock_PiecesDelivery_Insert / _Update
    - 18.3 PROC_Stock_DeliveryPieces_Delete / _Delete_1
    - 18.4 PROC_PiecesReceipt_Insert / _Update / _Delete
    - 18.5 Line-Stock Variants (_LineStk)
    - 18.6 Rework & Rejection Stock Handling
19. [Consumption Queries](#19-consumption-queries)
    - 19.1 SP_ConsQuery1 — Base Consumption
    - 19.2 SP_ConsQuery2 (+ _PcsGrn, _PcsGrnOneSize, _1_Lot, _Ret variants)
20. [Reports Catalog](#20-reports-catalog)
21. [Key Views](#21-key-views)
22. [Cross-Module Dependencies](#22-cross-module-dependencies)

---

## 1. Module Overview

The Cutting, Panels & Piece Goods module manages the **garment manufacturing pipeline** from raw fabric through to finished pieces. It is the core production-tracking engine of FiberPro, covering:

- **Cutting** — Issuing fabric rolls to the cutting floor, recording how fabric is cut into panels/components by order, style, color, and size
- **Panel production** — Tracking cut panels (garment components like front, back, sleeve) through sub-processes before assembly
- **Piece goods tracking** — Following assembled garments through semi-finished and finished production stages, delivery to job-work parties, receipt back, and final despatch
- **Barcode-based tracking** — Individual piece and bundle barcode generation, scanning, line-feeding, and automated production posting
- **Ready-to-cut** — A specialized inventory transfer that moves fabric from the warehouse to the cutting floor, updating program balance tables

**Key characteristics:**
- **Three stock streams in parallel**: Panel stock (`Panel_StockTable`), Piece goods stock (`Pcs_StockTable`), and Fabric/yarn stock (`StockTable/CurrentStock`) — all updated transactionally
- **Stage-based lifecycle**: Every garment moves through a configurable sequence of stages (defined in `Prod_Sequence`), each classified as Cutting, Semi-Finished, or Finished via `Mas_Dept.SemiFinish` ('S'/'F')
- **PcsType classification**: Each stage is classified as `Piece`, `Panel`, or `Bit` via `Mas_JobWrkComp.PcsType`, determining which stock tables are affected
- **Dual stock deduction model**: When production occurs at stage N, stock is ADDED at stage N and DEDUCTED from source stage (N-1) — this is the core "flow-through" stock mechanism
- **Rework/rejection tracking**: Every stock operation distinguishes Good ('G'), Rework/Mend ('M'), and Rejection (by `RejectionTypeId`) pieces
- **Barcode layer**: Optional barcode system (separate `Fiber_production` database) tracks individual pieces through bundles, line input/output, and production scanning
- **Multi-company scope**: All transactions keyed by `Coycode`/`CoyId` for multi-unit operation

---

## 2. Forms Inventory

| # | Form Class Name | Purpose |
|---|----------------|---------|
| 1 | `FrmCuttingProduction_Auto_New` | Automated cutting production entry — records sizes cut per order/style/color/part |
| 2 | `frmAddPanelCutting` | Panel cutting entry — records panel (component) production with component details |
| 3 | `frmCuttingIssue` | Fabric issue to cutting floor from stock |
| 4 | `frmcuttingack` | Cutting acknowledgement — confirms fabric receipt at cutting |
| 5 | `FrmCutting_FabRej` | Cutting fabric rejection — records fabric rejected during cutting |
| 6 | `FrmCuttingfabretreg` | Cutting fabric return register — returns unused fabric |
| 7 | `frmCuttingJobOrder` | Cutting job order — creates job orders for external cutting |
| 8 | `FrmCutingReg` | Cutting register — report/register view of all cutting entries |
| 9 | `frmPanelRej` | Panel rejection entry |
| 10 | `frmPanelDelRework` | Panel delivery for rework/re-processing |
| 11 | `FrmPanelExcessEntry` | Panel excess entry — records surplus panels |
| 12 | `FrmPanelExcessEntryStage` | Panel excess entry at specific stage |
| 13 | `frmPcsDel` | Piece delivery challan (DC) — standard process delivery |
| 14 | `frmPcsDel_Ship` | Piece delivery for shipment/despatch |
| 15 | `frmPcsDelRework` | Piece delivery for rework/reprocess |
| 16 | `frmPcsDelRecClose` | Piece delivery receipt close — marks DC as fully received |
| 17 | `frmPcsRec` | Piece receipt (GRN) — records pieces received back from job work |
| 18 | `frmPcsRej` | Piece rejection entry |
| 19 | `frmPcsShort` | Piece shortage tracking |
| 20 | `FrmPcsGodTransfer` | Piece goods godown (warehouse) transfer |
| 21 | `frmPcsStagewiseOpeningStock` | Piece opening stock entry by stage |
| 22 | `frmPcsStockAdjustmentEntry` | Piece stock adjustment/correction |
| 23 | `frmReadytoCut` | Ready-to-cut issue — transfers fabric to cutting floor |
| 24 | `FrmBundle_ProductionEntry` | Bundle-based production entry (bundle = group of pieces) |
| 25 | `frmBarcodeReadingNew` | Barcode scanning/reading for piece tracking |
| 26 | `FrmFinishGoodsEntry` | Finished goods entry — records final QC-passed goods |
| 27 | `FrmPcsFinishedGoods` | Finished goods report/register |
| 28 | `frmShortage` | Order-level shortage tracking |
| 29 | `frmShortage_Compwise` | Component-wise shortage tracking |
| 30 | `FrmShortageBitEntry` | Bit-level shortage entry |

---

## 3. Data Model — Core Transaction Tables

### 3.1 Trs_AddPanelEntry — Panel/Cutting Production Header

The primary panel production table. Each row represents a cutting/panel production entry.

| Column | Type | Purpose |
|--------|------|---------|
| Id | Int (PK) | Auto-incrementing production entry ID |
| CoyId | Int | Company/unit code → `Mas_Exporter.ExpID` |
| OrdId | Int | Order → `OrderMas.OrdId` |
| StyleNo | Varchar(20) | Style number |
| StyleID | Int | Style ID → `Mas_StyleDesc.StyleID` |
| StageId | Int | Target production stage → `Mas_JobWrkComp.Id` |
| SourceStageId | Int | Source stage from which input was consumed |
| ClrId / ClrID | Int | Color → `Mas_Color.ColID` |
| PartId | Int | Part → `Mas_Part.PartID` (Front, Back, Sleeve, etc.) |
| GodId | Int | Godown → `Mas_Godown.GodId` |
| Rework | Int | 0=Normal, 1=Rework from rejection, 2=Rework from alteration |
| RejectionTypeId | Int | Rejection type → `Mas_RejectionType` |
| LotNo | Varchar(15) | Lot number |
| LotID | Int | Lot → `Mas_Lot.LotSno` |
| CutPanel_Assemble | Char(1) | **'C'=Cutting, 'P'=Panel production, 'A'=Assembly** |
| Dt | DateTime | Entry date |
| PreparedBy | Int | User → `Mas_User.UserCode` |
| JobOrdID | Int | Job order reference |

### 3.2 Trs_AddPanelEntryQty / _Det / _Component — Panel Production Details

**Trs_AddPanelEntryQty**: Size-wise quantities for each panel entry.

| Column | Type | Purpose |
|--------|------|---------|
| ID | Int | → Trs_AddPanelEntry.Id |
| SizId | Int | Size → `Mas_Size.SizeID` |
| ProdPcs | Int | Produced pieces for this size |

**Trs_AddPanelEntryQty_Det**: Job order detail link.

| Column | Type | Purpose |
|--------|------|---------|
| ID | Int | → Trs_AddPanelEntry.Id |
| JobOrdId | Int | Job order → `Prod_cutComponents.JobId` |

**Trs_AddPanelEntryQty_Component**: Component (panel type) detail.

| Column | Type | Purpose |
|--------|------|---------|
| ID | Int | → Trs_AddPanelEntry.Id |
| CompId | Int | Component → `Mas_Panel.PanelID` or component master |

### 3.3 Trs_ProdEntry / Trs_ProdEntryQty — Production Entry (General)

Used for general cutting/piece production entries (non-panel). See Module 6 (Production) for full detail; this module uses it for cutting stage (StageId=1).

| Key Column | Purpose |
|------------|---------|
| Id | Production entry ID |
| CoyId | Company |
| OrdId | Order |
| StyleNo | Style |
| StageId | Stage (1 = cutting) |
| SourceStageId | Source stage |
| ClrId | Color |
| PartId | Part |
| GodId | Godown |
| Rework | Rework flag |
| StockPostingFlg | 'Y' when stock has been posted |

### 3.4 Trs_Pcs1 / Trs_Pcs2 — Piece Delivery (DC)

**Trs_Pcs1** — DC header:

| Column | Type | Purpose |
|--------|------|---------|
| ID | Int (PK) | DC ID |
| DocNo | Int | DC document number |
| Finyear | Char(2) | Financial year |
| Coycode | Int | Company |
| OrdJobNo | Int | Order |
| dtDCDate | DateTime | DC date |
| DelType | Varchar(30) | **'Process' / 'Despatch' / 'Sales' / 'Unit Transfer-Panel' / 'JobWork Return'** |
| Party | Int | → Mas_Party.PID (job work party) |
| Buyer | Int | → Mas_Buyer.BuyerID |
| TargetStageID | Int | Target stage for the job work |
| Dept | Int | → Mas_Dept.DeptID |
| GodId | Int | Godown |
| ProcessType | Char(1) | **'P'=Process, 'R'=Reprocess** |
| RejectionTypeId | Int | Rejection type (for reprocess DCs) |
| ToCoyCode | Int | Target company (for unit transfers) |
| NoBdl | Int | Number of bundles |
| Wgt | Numeric | Total weight |
| GpNo | Varchar | Gate pass number |
| EwayBillNo | Varchar | E-way bill number |
| EwayBillDt | DateTime | E-way bill date |
| VehicleCode | Int | Vehicle |
| TarDt | DateTime | Target/expected date |
| PreparedBy | Int | User |

**Trs_Pcs2** — DC line items:

| Column | Type | Purpose |
|--------|------|---------|
| ID | Int | → Trs_Pcs1.ID |
| ColID | Int | Color |
| StyleID | Int | Style ID |
| StyleNo | Varchar(20) | Style number |
| PartID | Int | Part |
| SizeID | Int | Size |
| PanelID | Int | Panel (0 for pieces, >0 for panels) |
| Pcs | Int | Quantity |
| Rate | Numeric(18,2) | Rate per piece |
| LotNo | Varchar(15) | Lot number |
| PoNo | Varchar(15) | Purchase order reference |
| SourceStageId | Int | Source stage |
| CompID | Int | Component ID (for panel DCs) |
| BitFormDesignDesc | Varchar | Bit form design description |

### 3.5 Trs_PcsGrn1 / Trs_PcsGrn2 — Piece/Panel Receipt (GRN)

**Trs_PcsGrn1** — GRN header:

| Column | Type | Purpose |
|--------|------|---------|
| ID | Int (PK) | GRN ID |
| Coycode | Int | Company |
| OrdJob | Int | Order |
| Party | Int | Supplier/party |
| GrnType | Varchar(50) | **'Process Return' / 'Receipt'** |
| TargetStageId | Int | Stage at which stock is received |
| GodId | Int | Godown |
| Dept | Int | Department |
| ProcessType | Char(1) | 'P'=Process, 'R'=Reprocess |
| OurDcref | Int | DC reference → Trs_Pcs1.ID |

**Trs_PcsGrn2** — GRN line items:

| Column | Type | Purpose |
|--------|------|---------|
| ID | Int | → Trs_PcsGrn1.ID |
| StyleNo | Varchar(20) | Style |
| ColID | Int | Color |
| PartID | Int | Part |
| SizID | Int | Size |
| RecPcs | Int | Received pieces (good) |
| RecPcs1 | Int | Received pieces (for GAN pending approval) |
| RewrkPcs | Int | Rework pieces received |
| RejPcs | Int | Rejected pieces received |
| PanelID | Int | Panel ID (0=pieces, >0=panels) |
| LotNo | Varchar(15) | Lot number |
| CompID | Int | Component ID |
| PanelGrp | Varchar(500) | Panel group concatenation |

### 3.6 Trs_ReadyToCut1 / Trs_ReadyToCut2 — Ready-to-Cut Issue

**Trs_ReadyToCut1** — Ready-to-cut header (fabric issue to cutting):

| Column | Type | Purpose |
|--------|------|---------|
| Id | Int (PK) | Ready-to-cut entry ID |
| Prs_Dept | Int | Process department (DeptID=11 for cutting) |
| DyeColId | Int | Dyed color |
| DesignId | Int | Print/design ID |
| TrType | Int | Transaction type (20 = ready-to-cut) |

**Trs_ReadyToCut2** — Ready-to-cut line items:

| Column | Type | Purpose |
|--------|------|---------|
| Id | Int | → Trs_ReadyToCut1.Id |
| OrdId | Int | Order |
| StockId | Int | → StockTable.StockId |
| Kg | Numeric(18,3) | Weight in kgs |
| Mtr | Numeric(18,2) | Length in meters |

### 3.7 Trs_ReadyToCut_Ret1 / _Ret2 — Ready-to-Cut Return

Same structure as Trs_ReadyToCut but for returning unused fabric from cutting back to warehouse. Uses columns `RecKgs`/`RecMtr` instead of `Kg`/`Mtr`. GrnType = 'Return'.

### 3.8 Trs_CutApr — Cutting Acknowledgement

Records acknowledgement that fabric was received at the cutting floor. Used by `CutACKStockPost` SP to post stock adjustments.

| Column | Type | Purpose |
|--------|------|---------|
| Id | Int (PK) | Acknowledgement ID |
| GodId | Int | Godown receiving the fabric |

### 3.9 Trs_PcsAdj1 / Trs_PcsAdj2 — Piece Stock Adjustment

| Column | Type | Purpose |
|--------|------|---------|
| Adj_Missing_Flg | Char(1) | **'O'=Opening, 'A'=Adjustment, 'M'=Missing** |

Used by `frmPcsStockAdjustmentEntry` and `frmPcsStagewiseOpeningStock`. Opening stock entries use flag 'O'.

### 3.10 Trs_PcsStockTfr1 / _Tfr2 — Piece Stock Transfer

Records order-to-order piece stock transfers. Updates both source and target order stock positions.

### 3.11 Trs_PcsGodAck — Piece Godown Acknowledgement

Records acknowledgement of piece goods transferred between godowns.

---

## 4. Stock Tables — Panel & Piece Goods

### 4.1 Panel_StockTable / Panel_StockTableQty

**Panel_StockTable** — Panel stock identity (unique position):

| Column | Type | Purpose |
|--------|------|---------|
| PcsStockId | Int (PK) | Stock position ID (max+1 generated) |
| Coycode | Int | Company |
| OrdId | Int | Order |
| StyleNo | Varchar(20) | Style |
| StageId | Int | Current production stage |
| PartId | Int | Part (front, back, sleeve) |
| GodId | Int | Godown |
| SeqNo | Int | Stage sequence from Prod_Sequence |
| PartyId | Int | Party (0 = in-house, >0 = at party) |
| LotId | Int | Lot |

**Panel_StockTableQty** — Panel quantities per color/size/component:

| Column | Type | Purpose |
|--------|------|---------|
| PcsStockId | Int | → Panel_StockTable.PcsStockId |
| ColId | Int | Color |
| SizeId | Int | Size |
| CompId | Int | Component/panel type |
| StockQty | Int | Current stock quantity |
| ProductionQty | Int | Cumulative production quantity |
| GoodPcsFlag | Char(1) | **'G'=Good, 'M'=Rework/Mend** |
| RejectionTypeId | Int | 0=none, >0=rejection type |

**Composite Key**: `(Coycode, OrdId, StyleNo, LotId, StageId, PartId, GodId, PartyId)` on Panel_StockTable; `(PcsStockId, ColId, SizeId, CompId, GoodPcsFlag, RejectionTypeId)` on Panel_StockTableQty.

### 4.2 Pcs_StockTable / Pcs_StockTableQty

**Pcs_StockTable** — Piece stock identity:

| Column | Type | Purpose |
|--------|------|---------|
| PcsStockId | Int (PK) | Stock position ID |
| Coycode | Int | Company |
| OrdId | Int | Order |
| StyleNo | Varchar(20) | Style |
| StageId | Int | Current production stage |
| PartId | Int | Part |
| GodId | Int | Godown |
| SeqNo | Int | Stage sequence |
| PartyId | Int | 0=in-house, >0=at job-work party |
| LotId | Int | Lot |
| EmpID | Int | Employee (0 for general stock, >0 for line-level) |

**Pcs_StockTableQty** — Piece quantities per color/size:

| Column | Type | Purpose |
|--------|------|---------|
| PcsStockId | Int | → Pcs_StockTable.PcsStockId |
| ColId | Int | Color |
| SizeId | Int | Size |
| StockQty | Int | Current stock (can go negative during transit) |
| ProductionQty | Int | Cumulative production |
| GoodPcsFlag | Char(1) | 'G'=Good, 'M'=Rework/Mend |
| RejectionTypeId | Int | 0=none, >0=rejection type |
| RewrkStk | Int | Rework stock count |
| RejStk | Int | Rejection stock count |

**Key difference from Panel**: Pcs_StockTable has an `EmpID` column for line-level stock tracking (employee-specific output). Line-stock procedures (suffixed `_LineStk`) filter on `ISNULL(EmpID,0) = 0` for general stock or `EmpID > 0` for employee-specific.

### 4.3 Stock Table Composite Keys

Both stock tables use a composite key pattern for uniqueness:

```
Panel:  (Coycode, OrdId, StyleNo, LotId, StageId, PartId, GodId, PartyId)
Piece:  (Coycode, OrdId, StyleNo, LotId, StageId, PartId, GodId, PartyId, EmpID=0)
```

Qty tables add `(ColId, SizeId, GoodPcsFlag, RejectionTypeId)` — plus `CompId` for panels.

---

## 5. Barcode & Bundle Tables

### 5.1 Pay_CuttProdMas — Cutting Production Master

| Column | Type | Purpose |
|--------|------|---------|
| ID | Int (PK) | Bundle master ID |
| ColId | Int | Color |
| PartID | Int | Part |

### 5.2 Pay_CuttProd_Bundle — Bundle Master

| Column | Type | Purpose |
|--------|------|---------|
| ID | Int | → Pay_CuttProdMas.ID |
| BundleID | Int | Bundle sequence number |
| Pcs | Int | Pieces in bundle |
| GoodPcs | Int | Good pieces counted |
| RejectionPcs | Int | Rejected pieces counted |
| LineID | Int | Line assigned |
| LineIssDt | DateTime | Line issue date |
| Completed | Char(1) | 'Y' when all pieces accounted |

### 5.3 Pay_BarcodeGeneration — Barcode Generation

| Column | Type | Purpose |
|--------|------|---------|
| BundleMasId | Int | → Pay_CuttProdMas.ID |
| BundleID | Int | Bundle sequence |
| Barcode | Varchar(30) | Bundle-level barcode string |
| Coycode | Int | Company |
| OrdId | Int | Order |
| StyleNo | Varchar(20) | Style |
| StyleId | Int | Style ID |
| SizeId | Int | Size |
| LotNo | Varchar(15) | Lot |
| LineID | Int | Assigned line (null until issued) |
| LineIssDt | DateTime | Line issue date |
| Pcs | Int | Pieces in bundle |
| GoodPcs | Int | Good pieces counted |
| Completed | Char(1) | 'Y' when Pcs = GoodPcs + RejectionPcs |

### 5.4 Pay_BundlePcs_Barcode — Piece-Level Barcode (Fiber_production DB)

Stored in separate `Fiber_production` database. Each row is one physical piece.

| Column | Type | Purpose |
|--------|------|---------|
| BundleMasId | Int | Bundle master |
| BundleId | Int | Bundle |
| PcsBarcode | Varchar(30) | Individual piece barcode |
| Pcs_Status | Char(1) | **'U'=Unfinished (issued to line), 'G'=Good, 'R'=Rejected** |
| PostingFlg | Char(1) | 'Y' when posted to production |
| ProdId | Int | Production entry link |
| BundlePcsId | Int | Piece sequence ID |

### 5.5 Pay_Bundle_IsstoLine — Bundle Issue to Line

| Column | Type | Purpose |
|--------|------|---------|
| ID | Int | Issue ID |
| IssDt | DateTime | Issue date |
| BundleMasID | Int | Bundle master |
| BundleID | Int | Bundle |
| LineID | Int | Production line |
| Barcode | Varchar(30) | Bundle barcode |

### 5.6 Pay_Pcs_ProdEntry — Piece Barcode Production Entry

| Column | Type | Purpose |
|--------|------|---------|
| ID | Int | Entry ID |
| ProdDate | Date | Production date |
| Coycode | Int | Company |
| Barcode | Varchar(30) | Piece barcode |
| StageID | Int | Stage |
| EmpId | Int | Contractor/employee |
| WorkType | Char(1) | 'N'=Normal |
| Pcs | Int | Pieces (always 1 for barcode tracking) |
| BundleMasID | Int | Bundle master |
| BundleID | Int | Bundle |
| HrsID | Int | Hour range |
| SourceStageId | Int | Source stage |
| RejectionTypeID | Varchar | Rejection type |
| TimeRangeID | Int | Time range |
| ReWorkFlg | Char(1) | Rework flag |
| LineId | Int | Production line |
| ProdOutput_FinalOutput | Char(1) | 'P'=Production output |

### 5.7 Prod_PcsRworkIssue — Piece Rework Issue

Tracks pieces sent for rework at a specific stage:

| Column | Type | Purpose |
|--------|------|---------|
| Barcode | Varchar(30) | Piece barcode |
| StageID | Int | Stage where rework is needed |
| ReworkFlg | Char(1) | 'Y'=Rework required |
| ReworkApproval | Char(1) | 'N'=Pending, 'Y'=Completed |
| BundleMasId, BundleId | Int | Bundle references |
| WorkType | Char(1) | 'R'=Rework |

---

## 6. Production Sequence & Stage Model

### 6.1 Prod_Sequence — Stage Ordering

Defines the order of production stages per order/style:

| Column | Type | Purpose |
|--------|------|---------|
| OrdId | Int | Order |
| StyleNo | Varchar(20) | Style |
| StageId | Int | → Mas_JobWrkComp.Id |
| SeqNo | Int | Sequence number (order of processing) |

### 6.2 Mas_JobWrkComp — Stage/Work Component Definition

| Key Column | Purpose |
|------------|---------|
| Id | Stage ID (PK) |
| DeptId | → Mas_Dept.DeptID |
| WorkComplDet | Work description (e.g., "Cutting", "Stitching", "Embroidery") |
| PcsType | **'Piece' / 'Panel' / 'Bit'** — determines which stock table is affected |

### 6.3 Mas_Dept — Department Flags

| Key Column | Purpose |
|------------|---------|
| DeptID | Department PK |
| SemiFinish | **'S'=Semi-finished, 'F'=Finished** — determines stock deduction behavior |
| OutputType | 'F'=Fabric output, 'P'=Piece output |
| DCFormat | DC print format selector |
| Fab_Pcs_Dept | 'F'=Fabric department, 'P'=Piece department |

### 6.4 PcsType Classification

The `PcsType` field on `Mas_JobWrkComp` drives which stock operations are invoked:

| PcsType | Stock Table Affected | Example Stages |
|---------|---------------------|----------------|
| `Piece` | `Pcs_StockTable` / `Pcs_StockTableQty` | Stitching, Finishing, Packing |
| `Panel` | `Panel_StockTable` / `Panel_StockTableQty` | Cutting, Bit-form, Panel sub-assembly |
| `Bit` | `Pcs_StockTable` (treated as Piece in stock) | Bit cutting |

**Key logic in PROC_Stock_ProdPanel**: When StageId ≠ 1 AND FinalStage = 'S' AND PcsType = 'Piece' OR 'Panel', source stage stock is deducted. This enables flow-through from cutting to semi-finished stages.

---

## 7. Cutting Production

### 7.1 FrmCuttingProduction_Auto_New — Automated Cutting Entry

**Purpose**: Records cutting production — how many pieces of each size were cut for an order/style/color/part combination.

**Workflow**:
1. Select order, style, color, part (front/back/sleeve), lot
2. System loads order quantity breakdown by size from `OrderQtyDtl`
3. Operator enters cut quantities per size
4. On save: creates `Trs_ProdEntry` with StageId=1 (cutting stage)
5. Calls `Sp_ProductionEntryQty` for each size → triggers `PROC_Stock_ProdPieces` to add stock

**Duplicate Check**: `ProductionExistQty` SP checks if cutting production already exists for the same order/style/color/part/size/lot/stage to prevent double-entry.

**Stock Effect**: Adds to `Pcs_StockTable`/`Pcs_StockTableQty` at StageId=1 with GoodPcsFlag='G'.

### 7.2 frmAddPanelCutting — Panel Cutting Entry

**Purpose**: Records panel/component-level cutting production with component detail (e.g., front panel, back panel, collar).

**Key Field**: `CutPanel_Assemble` flag:
- **'C'** — Cutting: Initial cut from fabric
- **'P'** — Panel production: Sub-process on panels (e.g., embroidery on panels)  
- **'A'** — Assembly: Assembling multiple panel components into one piece

**Data Tables**:
- Header: `Trs_AddPanelEntry`
- Size quantities: `Trs_AddPanelEntryQty`
- Job order detail: `Trs_AddPanelEntryQty_Det`
- Component detail: `Trs_AddPanelEntryQty_Component`

**Duplicate Check**: `PanelProductionExistQty` checks existing panel production by order/style/color/part/stage/size/lot/joborder/component.

**Stock Effect**: Triggers `PROC_Stock_ProdPanel` (or `_Asm` for assembly) to update `Panel_StockTable`/`Panel_StockTableQty`.

### 7.3 frmCuttingIssue — Fabric Issue for Cutting

**Purpose**: Issues fabric from warehouse stock to the cutting department. Creates delivery-like transaction moving fabric from `CurrentStock` to the cutting floor.

**Stock Effect**: Decrements `CurrentStock` for the issued fabric (via `Sp_currentstock` call).

### 7.4 frmcuttingack — Cutting Acknowledgement

**Purpose**: Confirms receipt of fabric at the cutting floor. The receiving unit acknowledges the fabric issue.

**SP**: `CutACKStockPost` — Uses a cursor to loop through delivery items (`Trs_Del2` joined with `Trs_CutApr`) and calls `Sp_currentstock` to adjust godown-level stock:
- For DeptId=-7 (ready-to-cut department): Uses `FrmStockID` link for stock tracking
- Supports both add ('+') and subtract ('-') operations
- Updates `CurrentStock` at the target godown

### 7.5 FrmCutting_FabRej — Cutting Fabric Rejection

**Purpose**: Records fabric rejected during the cutting process (defective fabric found during cutting). Adjusts fabric stock downward and may trigger supplier debit notes.

### 7.6 FrmCuttingfabretreg — Cutting Fabric Return Register

**Purpose**: Register/report showing all fabric returned from cutting back to warehouse.

### 7.7 frmCuttingJobOrder — Cutting Job Order

**Purpose**: Creates job orders for external/outsourced cutting work. Links to `Prod_cutComponents` table for cutting component details.

### 7.8 FrmCutingReg — Cutting Register

**Purpose**: Register/report view of all cutting entries. Calls `SP_Qry8` which sums production pieces for a given order/style/color/size at cutting stage (StageId=1), aggregating from:
- `Trs_ProdEntry` (direct production)
- `Trs_PcsGrn1/2` (process receipts)
- Supplier order receipts

---

## 8. Panel Production & Management

### 8.1 Panel Production Flow

```
Fabric Roll → Ready-to-Cut → Cutting (Stage 1) → Panel Stock
                                                      ↓
                                              Sub-process (embroidery,
                                              printing on panels)
                                                      ↓
                                              Assembly → Piece Stock
```

**Stage 1 (Cutting)**: Creates initial panel stock entries. Each panel component (front, back, sleeve, collar) tracked separately via `CompId`.

**Sub-processes**: Panel DCs send components to external parties for work (embroidery, printing). On receipt back, panels re-enter stock at the next stage.

**Assembly**: Combines multiple panel components into a single piece. `CutPanel_Assemble='A'` triggers `PROC_Stock_ProdPanel_Asm` which:
- Reads source stage components from `Trs_AddPanelAsm_SourceDtl`
- Consumes (deducts) panel stock from each source component
- Creates piece stock at the assembly stage

### 8.2 frmAddPanelCutting — Panel Entry (CutPanel_Assemble Flag)

This form handles all three types via the `CutPanel_Assemble` flag. The flag determines:

| Flag | Stock Operation | Source Deduction |
|------|----------------|-----------------|
| 'C' | Adds to Panel_StockTable at cutting stage (1) | None (raw fabric consumed separately) |
| 'P' | Adds to Panel_StockTable at target stage | Deducts from source stage Panel_StockTable |
| 'A' | Adds to Panel_StockTable at assembly stage | Deducts from each source component's stage |

### 8.3 frmPanelRej — Panel Rejection

**Purpose**: Records panel rejections. Updates `Panel_StockTableQty` with `GoodPcsFlag='M'` and `RejectionTypeId` set.

### 8.4 frmPanelDelRework — Panel Delivery for Rework

**Purpose**: Creates a DC for sending rejected panels for rework/mending. Uses `Trs_Pcs1`/`Trs_Pcs2` with `DelType='Process'` and `ProcessType='R'`.

### 8.5 FrmPanelExcessEntry / FrmPanelExcessEntryStage — Panel Excess

**Purpose**: Records excess/surplus panels produced beyond order requirements. Adjusts panel stock upward.

### 8.6 SP_PanelAssemblyStock — Assembly Stock Query

**Purpose**: Before assembly, queries available panel stock for each component required. Uses dynamic SQL to build a UNION query across all source stage/component combinations, returning the minimum available quantity per size (assembly is limited by the least-available component).

**Key Logic**:
```sql
-- For each source component:
SELECT SizeDesc, SUM(StockQty) as Pcs
FROM Panel_StockTableQty
WHERE StageId = @SourceStageID AND CompId = @CompId
  AND GoodPcsFlag = 'G' AND RejectionTypeId = 0 AND PartyId = 0

-- Final: MIN across all components
SELECT SizeDesc, MIN(Pcs) as Expr1 FROM (...UNION...) GROUP BY SizeDesc
```

### 8.7 SP_Cuttingpanelrpt — Cutting Panel Report

**Purpose**: Generates a comprehensive cutting panel report for an order/style showing:
- **Cut quantity** per part/color/component (from `Trs_AddPanelEntry` at StageId=1)
- **Cut plan** (from `OrderQtyDtl.CutPlanQty1`)
- **Used weight & actual/program weight** (from `Prog_ClrComb`/`Prog_Cns`)
- **Current stock** (from `Panel_StockTable`/`Panel_StockTableQty` at StageId=1)
- **Issue details** per destination (unit transfers, panel production, assembly, process delivery)

Uses temp table `temp_cutpanel_rpt` for computation.

---

## 9. Piece Delivery (DC)

### 9.1 frmPcsDel — Piece Delivery Challan (Standard)

**Purpose**: Creates a delivery challan (DC) for sending pieces to a job-work party for processing.

**Data Flow**:
1. Creates `Trs_Pcs1` header with `DelType='Process'`
2. For each style/color/size/part: calls `Sp_Pcs2` to insert `Trs_Pcs2` line items
3. `Sp_Pcs2` calls `PROC_Stock_PiecesDelivery_Insert` for stock posting
4. Stock deducted from in-house stock (PartyId=0) and added to party stock (PartyId>0)

### 9.2 frmPcsDel_Ship — Piece Delivery for Shipment

**Purpose**: Creates despatch DC for shipping pieces to buyer. `DelType='Despatch'`.

**Stock Effect**: Same as process delivery but updates the final stage stock. Reduces in-house finished goods stock.

### 9.3 frmPcsDelRework — Piece Delivery for Rework

**Purpose**: Creates a DC for sending pieces for reprocess/rework. `ProcessType='R'`.

**Stock Effect**: Deducts from `GoodPcsFlag='M'` (mend/rework) stock instead of 'G' (good).

### 9.4 frmPcsDelRecClose — Piece Delivery Receipt Close

**Purpose**: Marks a DC as fully received (all pieces accounted for via GRN). Used for reconciliation.

### 9.5 Delivery Types

| DelType | Meaning | Party | Stock Movement |
|---------|---------|-------|---------------|
| `Process` | Send to job-work party | Job-work party | In-house → Party stock |
| `Despatch` | Ship to buyer | Buyer | In-house → Deducted |
| `Sales` | Direct sale | Customer | No stock posting (manual) |
| `Unit Transfer-Panel` | Transfer panels between units | Target company | Source unit → Target unit |
| `JobWork Return` | Return pieces to job-worker | Job-work party | Special handling |

### 9.6 Stock Posting on Delivery (PROC_Stock_PiecesDelivery_Insert)

**Core logic** of piece delivery stock posting:

```
1. Read Trs_Pcs1 header: Coycode, OrdId, Stage, GodId, Party, DelType
2. Convert LotNo → LotId via Mas_Lot
3. Handle lot-wise stock option (Options1.Prod_Without_Lot_Despatch_WithLot)
4. For Despatch → set FinishedStageID = SourceStageID
5. For Sales → set PartyId = 0

6. If PartyId > 0 (process delivery):
   a. Deduct from Pcs_StockTableQty WHERE PartyId=0 (in-house)
   b. Add to Pcs_StockTableQty WHERE PartyId=@PartyId (at party)
   c. Handle GAN (GRN Acceptance) flag for woven orders

7. If PartyId = 0 (despatch/sales):
   a. Deduct from finished stage stock
   b. Apply BuyerId logic for despatch
```

**GAN (GRN Acceptance Note) variant**: For woven orders with `GRNAcceptance_Pcs='Y'`, reprocess deliveries use `GAN_RewrkFlg` to handle stock-at-party tracking separately.

---

## 10. Piece Receipt (GRN)

### 10.1 frmPcsRec — Piece Receipt (Standard)

**Purpose**: Records pieces received back from job-work parties after processing.

**Data Flow**:
1. Creates `Trs_PcsGrn1` header (GRN type based on delivery type)
2. For each line item: calls `Sp_PcsGrn2` to insert `Trs_PcsGrn2`
3. `Sp_PcsGrn2` calls `PROC_PiecesReceipt_Insert` for stock posting
4. Stock added at the target stage, deducted from party stock

### 10.2 GRN Types

| GrnType | Meaning | Stock Effect |
|---------|---------|-------------|
| `Process Return` | Job-work party returning processed pieces | Add at target stage, deduct party stock |
| `Receipt` | General receipt | Add at target stage |

### 10.3 GAN (GRN Acceptance Note) Workflow

When `Options.GRNAcceptance_Pcs = 'Y'`:
1. Receipt initially stores in `RecPcs1` (pending acceptance) instead of `RecPcs`
2. `Sp_PcsGrn2_GAN` handles the GAN-specific insert/update
3. Separate acceptance step (separate form) copies `RecPcs1` → `RecPcs`
4. Stock posting happens only after acceptance
5. Supports `RewrkPcs` (rework pieces) and `RejPcs` (rejected pieces) separately

### 10.4 Stock Posting on Receipt (PROC_PiecesReceipt_Insert)

**Core logic**:

```
1. Read Trs_PcsGrn1 header: Coycode, OrdJob, TargetStageId, GodId, ProcessType
2. Lookup DC reference (OurDcref → Trs_Pcs1) to get:
   - RejectionTypeId from original DC
   - SourceStageId from DC line items
   - DcPartID for part matching
3. Determine SemiFinish flag from department
4. For 'Process Return' with SemiFinishDept='F' (finished dept):
   - Use DC's TargetStageId as the stock stage
5. For 'Process Return' with SemiFinishDept='S' (semi-finished):
   - Use GRN's TargetStageId

6. Check PcsType of the stage:
   - 'Panel': Update Pcs_StockTableQty for panel-to-piece receipt
   - 'Piece' or 'Bit': Standard piece stock update

7. If stock record exists → UPDATE StockQty += @Pcs, ProductionQty += @Pcs
8. If not → INSERT new Panel_StockTable/Qty or Pcs_StockTable/Qty row

9. For Reprocess (ProcessType='R'):
   - Deduct from GoodPcsFlag='M', RejectionTypeId=@RejectionTypeId stock
```

### 10.5 Panel Receipt (PROC_PanelReceipt_Insert)

Same pattern as piece receipt but operates on `Panel_StockTable`/`Panel_StockTableQty`. Uses cursor `LINE_CURSOR_DELETE` to iterate GRN line items on delete operations.

---

## 11. Ready-to-Cut Flow

### 11.1 frmReadytoCut — Ready-to-Cut Issue Form

**Purpose**: Transfers fabric from warehouse stock to the cutting floor. This is a specialized inventory movement (TrType=20) that:
- Deducts fabric from the main `CurrentStock` table
- Records in `Trs_ReadyToCut1/2` tables
- Updates the program balance table `ST_ProgBalance_Fabric`

### 11.2 SP_RtoCut — Ready-to-Cut Fabric Balance Calculation

**Purpose**: Calculates fabric requirements for cutting and updates the program balance table.

**Logic**:
1. Reads fabric requirements from `Pro_ReqKnitt` (WHERE DeptID=11, the cutting department)
2. Groups by FabId, ColId, CntId, DesignId, FinDiaId, FinGSM, LL
3. For each combination, either updates existing `ST_ProgBalance_Fabric` row (DeptId=-7, the virtual ready-to-cut department) or inserts new
4. Sets `Reqkgs` and `ReqMtr` from the cutting requirements

**Department Mapping**:
- DeptID=11: Physical cutting department
- DeptID=-7: Virtual "ready-to-cut" department in program balance tracking

### 11.3 TRG_FAB_BALANCE_RCUT Trigger

**Fires on**: INSERT, UPDATE on `Trs_ReadyToCut2`

**Purpose**: Automatically updates `ST_ProgBalance_Fabric` when fabric is issued for cutting.

**Logic**:
1. Reads the inserted row's `StockId` → resolves to `FabId, ColId, CntId, DesignId, FinDiaId, FinGSM, LL` via `StockTable`
2. Recalculates total DcKgs/DcMtr from all ready-to-cut transactions for this fabric combination
3. Updates `ST_ProgBalance_Fabric.DcKgs` and `DcMtr` where DeptId matches
4. Handles both dye-color (`DyeColId`) and fabric-color (`ColId`) matching depending on `DeptGrpCode`

**Related triggers**:
- `TRG_FAB_BALANCE_RCUT_DEL`: Fires on DELETE of `Trs_ReadyToCut2`, reverses the balance
- `TRG_FAB_BALANCE_RCUT_RET`: Fires on INSERT/UPDATE of `Trs_ReadyToCut_Ret2` (returns), deducts from program balance

### 11.4 Ready-to-Cut Return

When fabric is returned from cutting back to warehouse:
- Creates entries in `Trs_ReadyToCut_Ret1`/`_Ret2`
- `TRG_FAB_BALANCE_RCUT_RET` trigger fires, updating `ST_ProgBalance_Fabric.RecKgs`/`RecMtr`
- Credits `CurrentStock` back to the source godown

### 11.5 Reports

- **READYTOCUT.mrt** — Ready-to-cut issue report
- **READYTOCUTRETURN.mrt** — Ready-to-cut return report

---

## 12. Barcode & Bundle System

### 12.1 frmBarcodeReadingNew — Barcode Scanning Entry

**Purpose**: Scans individual piece barcodes at production stations. Each scan:
1. Validates the barcode via `SP_PcsBarcode_Check` or `SP_BundleBarcode_Check`
2. If valid, records production entry for that piece/bundle
3. Updates piece status and completion tracking

### 12.2 FrmBundle_ProductionEntry — Bundle Production Entry

**Purpose**: Records production for an entire bundle (group of pieces). Faster than individual piece scanning for bulk operations.

### 12.3 SP_BundleBarcode_Check — Bundle Barcode Validation

**Validates**:
1. Barcode exists in `Pay_BarcodeGeneration` → Valid tag
2. Barcode belongs to correct company (`Coycode`)
3. Bundle not already issued to line (`Pay_Bundle_IsstoLine`)
4. Bundle not already completed

**On valid scan (NewFlg='Y')**:
1. Creates `Pay_Bundle_IsstoLine` entry
2. Updates `Pay_BarcodeGeneration.LineID` and `LineIssDt`
3. Updates `Pay_CuttProd_Bundle.LineID` and `LineIssDt`
4. Sets all pieces in bundle to `Pcs_Status='U'` (unfinished/in-progress) in `Fiber_production..Pay_BundlePcs_Barcode`

### 12.4 SP_PcsBarcode_Check — Piece Barcode Validation & Production Entry

**Validates**:
1. Piece barcode exists in `Fiber_production..Pay_BundlePcs_Barcode`
2. Belongs to correct company
3. Bundle not completed
4. Final process not already done (unless rework)
5. Bundle has been issued to a line (LineID > 0)
6. Valid source stage exists in `Prod_Sequence`
7. Contractor is assigned for this line/stage (`Trs_ContractorAllotment_Det`)

**Validation errors**:
- `INVALID TAG` — Barcode not found
- `INVALID!!! BUNDLE COMPLETED` — All pieces accounted
- `INVALID!!! FINAL PROCESS PRODUCTION MADE` — Already finished
- `INVALID!!! ALREADY PRODUCTION MADE ON THIS STAGE` — Duplicate scan
- `INVALID!!! BUNDLE NOT ISSUED TO LINE` — Not yet line-fed
- `INVALID SOURCE STAGE` — Sequence not configured
- `INVALID CONTRACTOR` — No contractor assigned

**On valid scan**:
1. Inserts `Pay_Pcs_ProdEntry` (one row per piece per stage)
2. If at final process stage (`Final_StageId_2` from `Mas_Exporter`):
   - Updates `Pay_BundlePcs_Barcode.Pcs_Status = 'G'` (good)
   - Increments `Pay_CuttProd_Bundle.GoodPcs`
   - Increments `Pay_BarcodeGeneration.GoodPcs`
3. Handles rework: sets `ReworkApproval='Y'` on `Prod_PcsRworkIssue`
4. Checks completion: `Pcs = GoodPcs + RejectionPcs` → sets `Completed='Y'`

### 12.5 SP_PcsBarcode_Check_Rejection — Rejection via Barcode

**Purpose**: Records rejection of a piece during barcode scanning.

**Actions**:
1. Inserts `Pay_Pcs_ProdEntry` with `RejectionTypeID` set
2. Sets `Pay_BundlePcs_Barcode.Pcs_Status = 'R'` (rejected)
3. Increments `Pay_CuttProd_Bundle.RejectionPcs`
4. Increments `Pay_BarcodeGeneration.GoodPcs` (confusingly named — represents "processed" pieces)

### 12.6 SP_Barcode_Production_Posting — Batch Posting to Trs_ProdEntry

**Purpose**: Batch process that transfers barcode production data to the standard production tables. Runs periodically to synchronize the barcode system with the main ERP.

**Logic**:
1. Opens cursor on `Pay_Bundle_ProdEntry` where `PostingFlg IS NULL`
2. Groups by company, date, stage, order, style, color, part, size, hour, lot
3. For each group: inserts `Trs_ProdEntry` (standard production entry)
4. Calls `Sp_ProductionEntryQty` for size-wise stock posting
5. Sets `PostingFlg='Y'` on processed records
6. Transaction-wrapped with rollback on error

### 12.7 Barcode Lifecycle

```
1. GENERATE: Create barcodes (Pay_BarcodeGeneration + Pay_BundlePcs_Barcode)
   - Pcs_Status = NULL
   - Completed = NULL

2. ISSUE TO LINE: Scan bundle barcode (SP_BundleBarcode_Check)
   - Pay_Bundle_IsstoLine created
   - Pcs_Status = 'U' (unfinished)
   - LineID set on bundle/barcode

3. PRODUCTION SCAN: Scan piece barcode at each stage (SP_PcsBarcode_Check)
   - Pay_Pcs_ProdEntry created for each stage
   - At final stage: Pcs_Status = 'G' (good)

4. REJECTION: Scan with rejection flag (SP_PcsBarcode_Check_Rejection)
   - Pcs_Status = 'R' (rejected)
   - RejectionPcs incremented

5. COMPLETION: When Pcs = GoodPcs + RejectionPcs
   - Completed = 'Y' on both Pay_BarcodeGeneration and Pay_CuttProd_Bundle

6. BATCH POST: SP_Barcode_Production_Posting
   - Creates Trs_ProdEntry rows from barcode data
   - Posts to standard Pcs_StockTable
```

---

## 13. Piece Goods Godown Transfer

### 13.1 FrmPcsGodTransfer — Piece Godown Transfer

**Purpose**: Transfers piece goods between godowns (warehouses) within the same company.

**Stock Effect**:
- Deducts from source godown in `Pcs_StockTable` (WHERE GodId=@SourceGodId)
- Adds to target godown in `Pcs_StockTable` (WHERE GodId=@TargetGodId)
- Acknowledgement recorded in `Trs_PcsGodAck`

---

## 14. Piece Rejection & Shortage

### 14.1 frmPcsRej — Piece Rejection Entry

**Purpose**: Records piece rejection at any production stage.

**Stock Effect**:
- Deducts from `GoodPcsFlag='G'` stock
- Adds to `GoodPcsFlag='M'` (mend/rework) stock with `RejectionTypeId` set

### 14.2 frmPcsShort — Piece Shortage Tracking

**Purpose**: Records and tracks piece shortages per order/style. Related forms:
- `frmShortage` — Order-level shortage
- `frmShortage_Compwise` — Component-wise shortage
- `FrmShortageBitEntry` — Bit-level shortage

### 14.3 Rejection Type Classification

`Mas_RejectionType` master defines rejection types (e.g., fabric defect, stitching error, color mismatch). The `RejectionTypeId` flows through all stock tables and is used for:
- Filtering rejection-specific stock queries
- Determining reprocess routing
- Reporting by rejection category

### 14.4 GoodPcsFlag Logic

| Flag | Meaning | Used When |
|------|---------|-----------|
| `'G'` | Good pieces | Normal production, standard delivery |
| `'M'` | Mend/Rework | Rejected pieces pending rework |

**Rework flag on Trs_ProdEntry**:
- `Rework=0` → Normal production (consumes 'G' from source stage)
- `Rework=1` → Rework from rejection (consumes 'M' from source stage)
- `Rework=2` → Rework from alteration (consumes 'G' from source stage)

Stock queries use:
```sql
GoodPcsFlag = CASE
  WHEN IsNull(@Rework,0) = 0 OR IsNull(@Rework,0) = 2 THEN 'G'
  ELSE 'M'
END
RejectionTypeId = CASE
  WHEN IsNull(@Rework,0) = 0 OR IsNull(@Rework,0) = 2 THEN 0
  ELSE @RejectionTypeId
END
```

---

## 15. Piece Stock Adjustment & Opening

### 15.1 frmPcsStockAdjustmentEntry — Stock Adjustment

**Purpose**: Manually adjusts piece stock quantities. Used for:
- Physical count corrections
- Missing pieces (`Adj_Missing_Flg='M'`)
- General adjustments (`Adj_Missing_Flg='A'`)

### 15.2 frmPcsStagewiseOpeningStock — Stage-wise Opening Stock

**Purpose**: Enters opening piece stock for new system setup or fiscal year start. Sets `Adj_Missing_Flg='O'` to distinguish from regular adjustments. Records stock position per order/style/stage/color/size/lot.

---

## 16. Finished Goods Entry

### 16.1 FrmFinishGoodsEntry — Finished Goods Entry

**Purpose**: Records garments that have completed all production stages and passed final QC. Creates stock entries at the finished stage (where `Mas_Dept.SemiFinish='F'`).

### 16.2 FrmPcsFinishedGoods — Finished Goods Report

**Purpose**: Report showing finished goods inventory. Report template: `PcsFinishedGoods.mrt`.

---

## 17. Stock Posting Engine — Panel

### 17.1 PROC_Stock_ProdPanel — Panel Production Stock Insert

**Parameters**: `@Id` (Trs_AddPanelEntry.Id), `@SizeId`, `@ProdPcs`, `@compID`

**Flow**:
1. Reads header from `Trs_AddPanelEntry`: Coycode, OrdId, StyleNo, StageId, SourceStageId, PartId, GodId, Rework, RejectionTypeId, LotId, ColId, CompId
2. Gets SeqNo from `Prod_Sequence`
3. Gets FinalStage flag from `Mas_Dept.SemiFinish` via `Mas_JobWrkComp`
4. **UPSERT at target stage**:
   - If Panel_StockTable row exists → get PcsStockId
     - If Panel_StockTableQty row exists → `UPDATE StockQty += @ProdPcs, ProductionQty += @ProdPcs`
     - Else → `INSERT Panel_StockTableQty` with StockQty = @ProdPcs
   - If no Panel_StockTable row → `INSERT Panel_StockTable` + `INSERT Panel_StockTableQty`
5. **Deduct from source stage** (if StageId ≠ 1 AND FinalStage='S' AND PcsType='Piece' or 'Panel'):
   - `UPDATE Panel_StockTableQty SET StockQty -= @ProdPcs WHERE StageId=@SourceStageId`
   - For rework (Rework=1): deducts from GoodPcsFlag='M' stock
   - For normal: deducts from GoodPcsFlag='G' stock

### 17.2 PROC_Stock_ProdPanel_Asm — Assembly Variant

**Purpose**: Panel assembly stock posting. Reads source component details from `Trs_AddPanelAsm_SourceDtl` to deduct from multiple source stages/parts.

### 17.3 PROC_Stock_PanelDelivery_Insert / _Update

Called by `Sp_Panel2`. Handles panel DC stock posting:
- For PartyId > 0: Deduct in-house stock, add party stock
- For Despatch: Deduct from finished stage
- For Sales: `PartyId = 0`, special handling

### 17.4 PROC_Stock_DeliveryPanel_Delete / _Delete_1

Reverses panel delivery stock on DC deletion. `_Delete_1` handles individual line item removal (when quantity becomes 0).

### 17.5 PROC_PanelReceipt_Insert / _Update / _Delete

Panel GRN stock posting. Handles Process Return vs Receipt. Uses cursor for delete operations to iterate all GRN line items.

---

## 18. Stock Posting Engine — Pieces

### 18.1 PROC_Stock_ProdPieces — Piece Production Stock Insert

**Parameters**: `@Id` (Trs_ProdEntry.Id), `@SizeId`, `@ProdPcs`

**Flow** (same pattern as ProdPanel but for Pcs_StockTable):
1. Read header from `Trs_ProdEntry`
2. Get sequence, final stage flag
3. **UPSERT at target stage**: Add to `Pcs_StockTable`/`Pcs_StockTableQty` with GoodPcsFlag='G'
4. **Deduct from source stage** (if StageId ≠ 1 AND PcsType='Piece'):
   - Semi-finished (`FinalStage='S'`): Deduct `StockQty -= @ProdPcs` at SourceStageId
   - Finished (`FinalStage='F'`): Deduct using `Trs_ProdEntry_SourceStageDtl` for multi-source support
5. **EntryOption handling** (OrderStyleDtl.EntryOption):
   - EntryOption=1: Direct piece entry, deducts by exact color/size
   - EntryOption≠1: Pack order entry, uses `PcsPerColor` multiplier from `OrderQtyDtl`, deducts proportionally across combo colors

### 18.2 PROC_Stock_PiecesDelivery_Insert / _Update

Called by `Sp_Pcs2`. Same upsert pattern. Handles despatch, sales, process, and unit transfer delivery types with appropriate party and stock logic.

### 18.3 PROC_Stock_DeliveryPieces_Delete / _Delete_1

Reverses piece delivery stock. `_LineStk` variants handle employee-level stock tracking.

### 18.4 PROC_PiecesReceipt_Insert / _Update / _Delete

Piece GRN stock posting. Handles PcsType-dependent logic:
- Panel type at target stage → deduct from `Pcs_StockTableQty` (panel subtracted, piece added)
- Piece type → standard `Pcs_StockTableQty` update
- Reprocess receipt: deduct from `GoodPcsFlag='M'` stock

Supports `RewrkPcs` and `RejPcs` parameters for tracking rework and rejection quantities separately.

### 18.5 Line-Stock Variants (_LineStk)

`PROC_Stock_PiecesDelivery_Insert_LineStk` and `_Delete_LineStk` variants handle employee-level stock where `EmpID > 0` on `Pcs_StockTable`. Used when line-level production tracking is enabled.

### 18.6 Rework & Rejection Stock Handling

Rework/rejection flows through the entire stock engine:

```
Normal Production:
  Source: GoodPcsFlag='G', RejectionTypeId=0 (-qty)
  Target: GoodPcsFlag='G', RejectionTypeId=0 (+qty)

Rejection:
  Move from 'G' to 'M' with RejectionTypeId set

Rework Production (Rework=1):
  Source: GoodPcsFlag='M', RejectionTypeId=@RejType (-qty)
  Target: GoodPcsFlag='G', RejectionTypeId=0 (+qty)

Rework from Alteration (Rework=2):
  Source: GoodPcsFlag='G', RejectionTypeId=0 (-qty)
  Target: GoodPcsFlag='G', RejectionTypeId=0 (+qty)
```

---

## 19. Consumption Queries

### 19.1 SP_ConsQuery1 — Base Consumption

**Purpose**: Returns fabric consumption data for cutting production.

**Parameters**: `@OrdId`, `@StyleNo`, `@Coycode`

**Logic**:
- Joins `Prog_ClrComb` + `Prog_Cns` (programmatic consumption) with `OrderQtyDtl` and `Trs_ProdEntry`/`Trs_ProdEntryQty` (actual production)
- Shows RequiredWeight vs ActualWeight per fabric/color/size
- Handles yarn-dyed (yd=1) special color matching (FinCol vs FabClr)

### 19.2 SP_ConsQuery2 and Variants

| Variant | Purpose |
|---------|---------|
| `SP_ConsQuery2` | Extended consumption with bit/cut details (`Pro_ProdBitCutDet`, `Pro_Prod_BitCutRate`) |
| `SP_ConsQuery2_PcsGrn` | Consumption from piece GRN data |
| `SP_ConsQuery2_PcsGrnOneSize` | Single-size variant |
| `SP_ConsQuery2_PcsGrn_1_Lot` | Lot-wise variant |
| `SP_ConsQuery2_PcsGrnOneSize_Ret` | Single-size return variant |
| `SP_ConsQuery2_PcsGrn_1_Lot_OneSize` | Lot + single-size variant |
| `SP_ConsQuery2_PcsGrn_1_Lot_OneSize_Ret` | Lot + single-size + return variant |

**Key additional fields**: `PcsPerBit` (pieces per bit/cut), `DesignDescription` from `Mas_Bitsize`, piece weight calculations.

---

## 20. Reports Catalog

### Piece DC Reports
| Report File | Purpose |
|------------|---------|
| PcsDc.mrt | Basic piece DC |
| PcsDc1_SGST.mrt | Piece DC with SGST |
| PcsDc1_SGST_Cost.mrt | Piece DC with SGST and cost value |
| PcsDc1_SGST_Cost_1.mrt | Piece DC cost variant 1 |
| PcsDc1_SGST_Cost_Large.mrt | Large format with cost |
| PcsDc1_SGST_Cost_old.mrt | Legacy format |
| PcsDc1_SGST_Panel.mrt | Panel DC with SGST |
| PcsDc1_SGST_Bit.mrt | Bit-form DC with SGST |
| PcsDc1.mrt | Piece DC type 1 |
| PcsDc_SGST_Large.mrt | Large format with SGST |
| PcsDc_WithRate.mrt | DC showing rates |
| PcsDc_Acc_Pre.mrt | Accessories/pre-production DC |
| PcsDc_ACC.mrt | Accessories piece DC |
| PcsDc -Acc.mrt | Accessories piece DC (alt name) |
| PcsDcNew.mrt | New format DC |
| PcsDc1Rework_SGST.mrt | Rework DC with SGST |
| PanelDc1Rework_SGST.mrt | Panel rework DC with SGST |

### Piece Receipt Reports
| Report File | Purpose |
|------------|---------|
| PcsReceipt.mrt | Basic piece receipt |
| PcsReceipt1.mrt | Piece receipt type 1 |
| PcsReceipt_Large.mrt | Large format receipt |
| PcsReceipt1_Large.mrt | Large type 1 receipt |
| PcsReceipt2.mrt | Piece receipt type 2 |
| PcsReceipt4.mrt | Piece receipt type 4 |

### Other Piece/Panel Reports
| Report File | Purpose |
|------------|---------|
| PcsTransfer.mrt | Piece transfer between orders |
| PcsDespatch.mrt | Piece despatch challan |
| PcsDespatch_Large.mrt | Large format despatch |
| PcsDespatch1.mrt | Despatch type 1 |
| PcsFinishedGoods.mrt | Finished goods report |
| Pcs_IssueToProd.mrt | Issue to production |
| PcsRetDc.mrt | Piece return DC |
| PcsShipSample.mrt | Ship sample report |
| PcsPanelRejDcNew.mrt | Panel rejection DC |
| READYTOCUT.mrt | Ready-to-cut issue |
| READYTOCUTRETURN.mrt | Ready-to-cut return |
| RollPrint.mrt | Roll printing/labeling |

### Related Crystal Reports
| Report File | Purpose |
|------------|---------|
| BarcodeLayReport.rpt | Barcode layout report |
| BarcodeLayReport1.rpt | Barcode layout variant |

### Report Code-Behind
| File | Purpose |
|------|---------|
| FabDC.cs | Fabric DC code-behind (data query for FabDC*.mrt) |
| FabGRN.cs | Fabric GRN code-behind |
| GenDC.cs | General DC code-behind |
| GenGRN.cs | General GRN code-behind |
| AccDC.cs | Accessories DC code-behind |
| AccGRN.cs | Accessories GRN code-behind |

### SP Supporting Reports
| SP | Report(s) |
|----|-----------|
| SP_PcsDcPrintQry | Generates data for all PcsDc*.mrt variants |
| SP_Cuttingpanelrpt | Cutting panel summary report |
| SP_ConsQuery1/2 | Fabric consumption reports |
| SP_PcsValue / _NEW / _Out | Piece goods valuation reports |

---

## 21. Key Views

### Vue_PcsStockDtl_PART — Piece Stock Detail by Part

**Purpose**: Comprehensive UNION view tracking all piece goods stock movements by part.

**Sources** (11 movement types):
1. **Despatch** — `Trs_Pcs1/2` where `DelType='Despatch'`, SemiFinish='F'
2. **Process Delivery** — `Trs_Pcs1/2` where `DelType` not in ('Despatch','Sales')
3. **Receipt (GRN)** — `Trs_PcsGrn1/2` where `PanelID=0`
4. **Production** — `Trs_ProdEntry` at StageID=1 (cutting), Rework=0
5. **Godown Transfer Issue** — Piece goods godown transfers (out)
6. **Godown Transfer Receipt** — Piece goods godown acknowledgements (in)
7. **Stock Transfer** — `Trs_PcsStockTfr1/2` (order-to-order)
8. **Stock Opening** — `Trs_PcsAdj1/2` where `Adj_Missing_Flg='O'`
9. **Stock Adjustment** — `Trs_PcsAdj1/2` where `Adj_Missing_Flg<>'O'`
10. **Add Panel Entry** — `Trs_AddPanelEntry` production at StageID=1
11. **Unit Transfer Panel** — `DelType='Unit Transfer-Panel'`

**Used By**: IO History (`sp_iohistorypanelright`, `sp_iohistoryright`), stock registers, and various reports.

---

## 22. Cross-Module Dependencies

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     Module Dependency Map                                │
│                                                                          │
│  01-Masters ────────────────────────────────────────────────────────────┐ │
│    Mas_Dept, Mas_JobWrkComp, Mas_Part, Mas_Panel, Mas_Size,           │ │
│    Mas_Color, Mas_Lot, Mas_RejectionType, Mas_Exporter, Mas_Party     │ │
│                                                                          │
│  02-Orders ─────────────────────────────────────────────────────────────┤ │
│    OrderMas, OrderQtyDtl, OrderStyleDtl, OrdSizeMas, Prod_Sequence,   │ │
│    Prod_cutComponents, Prog_ClrComb, Prog_Cns                          │ │
│                                                                          │
│  04-Inventory ──────────────────────────────────────────────────────────┤ │
│    StockTable, CurrentStock (fabric stock consumed by cutting)          │ │
│    Pcs_StockTable / Panel_StockTable (written by this module)           │ │
│    ST_ProgBalance_Fabric (fabric program balance updated by R-T-C)      │ │
│                                                                          │
│  05-THIS MODULE ────────────────────────────────────────────────────────┤ │
│    Trs_AddPanelEntry, Trs_ProdEntry, Trs_Pcs1/2, Trs_PcsGrn1/2,      │ │
│    Trs_ReadyToCut1/2, Trs_CutApr, Pay_* barcode tables                │ │
│                                                                          │
│  06-Production ─────────────────────────────────────────────────────────┤ │
│    Sp_ProductionEntryQty (called from cutting to post piece stock)      │ │
│    Line input/output uses Pcs_StockTable.EmpID for line-level stock     │ │
│                                                                          │
│  07-Dispatch ───────────────────────────────────────────────────────────┤ │
│    frmPcsDel_Ship creates despatch DCs against piece stock              │ │
│    DC print queries (SP_PcsDcPrintQry) for all DC formats               │ │
│                                                                          │
│  08-Billing ────────────────────────────────────────────────────────────┤ │
│    Piece GRN receipts feed bill-to-be value (SP_BilltoBeValue)          │ │
│    BudPoMas/BudPoDet rates appear on piece DCs                          │ │
│                                                                          │
│  09-Costing ────────────────────────────────────────────────────────────┤ │
│    SP_PcsValue calculates garment cost per piece                        │ │
│    Pro_Prod_PartwiseRate for part-wise production cost                   │ │
│                                                                          │
│  10-Job Work ───────────────────────────────────────────────────────────┘ │
│    Job work delivery (process DC) and receipt (process return GRN)       │
│    Trs_ContractorAllotment_Det assigns contractors to lines/stages       │
│                                                                          │
│  External DB: Fiber_production ──────────────────────────────────────────│
│    Pay_BundlePcs_Barcode (piece-level barcode tracking)                 │
│    Cross-DB queries via dynamic SQL in barcode SPs                       │
└──────────────────────────────────────────────────────────────────────────┘
```

**Key Integration Points**:
- **Inventory → Cutting**: `SP_RtoCut` transfers fabric requirement; Ready-to-Cut forms move physical stock
- **Cutting → Production**: `Sp_ProductionEntryQty` calls `PROC_Stock_ProdPieces` or `PROC_Stock_ProdPanel`
- **Panel → Piece**: Assembly operations (CutPanel_Assemble='A') consume panels and create pieces
- **Piece DC ↔ GRN**: DC reference (`OurDcRef`) links delivery to receipt for reconciliation
- **Barcode → Production**: `SP_Barcode_Production_Posting` batch-posts barcode data to Trs_ProdEntry
- **Options table**: `Options.GRNAcceptance_Pcs`, `Options1.Prod_Without_Lot_Despatch_WithLot`, `Mas_Exporter.Final_StageId_2` control behavior variations
