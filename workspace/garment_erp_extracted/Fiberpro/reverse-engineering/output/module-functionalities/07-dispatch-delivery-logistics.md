# Module 7 — Dispatch, Delivery & Logistics

> **Generated**: 2026-03-15  
> **Source**: 33 forms (fabric/yarn/accessory/general/piece delivery, delivery returns, gate entry/pass, loading, packing lists, unit/godown transfer acknowledgements, DC utilities), ~30 stored procedures (delivery stock posting, DC print queries, stock value stamping, despatch views, godown/unit acknowledgement), 6 triggers (TRG_FAB_BALANCE_DEL, TRG_YARN_BALANCE_DEL, TRG_YARN_BALANCE_DEL_KNIT_DEL, TRG_YARN_BALANCE_DEL_KNIT_DEL_DEL, TRG_YARN_BALANCE_DEL_DEL, plus Trs_Del3 triggers), 5+ views (Vue_TrsDc, Vue_TrsDcAbs, VUE_DEL_PRSRT, Vue_OrdVsDespatch_Summary, VueDespatchStock1), 40+ report templates (.mrt)  
> **Foundation References**: database-schema.md, stored-procedures-analysis.md, triggers-and-views-analysis.md, formulas-and-calculations.md, 04-inventory-warehouse.md, 05-cutting-panels-pieces.md, 06-production-shopfloor.md

---

## Table of Contents

1. [Module Overview](#1-module-overview)
2. [Forms Inventory](#2-forms-inventory)
3. [Data Model — Core Transaction Tables](#3-data-model--core-transaction-tables)
   - 3.1 Trs_Del1 — Fabric/Yarn/Accessory/General DC Header
   - 3.2 Trs_Del2 — DC Line Items (StockID-Based)
   - 3.3 Trs_Del3 — Knit/Yarn Delivery Extension Detail
   - 3.4 Trs_Del4 — GST / Tax Addition Detail
   - 3.5 Trs_Pcs1 — Piece/Panel DC Header
   - 3.6 Trs_Pcs2 — Piece/Panel DC Line Items (Size-Wise)
   - 3.7 Trs_UnitAck1 / Trs_UnitAck2 — Unit Transfer Acknowledgement
   - 3.8 Trs_PcsGodAck1 / Trs_PcsGodAck2 — Godown Acknowledgement
   - 3.9 Trs_LineTfr / Trs_LineTfr_Det — Line Transfer
4. [Transaction Type Taxonomy (TrType)](#4-transaction-type-taxonomy-trtype)
5. [Delivery Type Taxonomy (DelType — Piece DCs)](#5-delivery-type-taxonomy-deltype--piece-dcs)
6. [Fabric/Yarn Delivery — FrmFabDel](#6-fabricyarn-delivery--frmfabdel)
   - 6.1 DC Creation Workflow
   - 6.2 Stock Selection (FabDeliverySP)
   - 6.3 Process vs Reprocess Delivery
   - 6.4 Purchase Return Flow
   - 6.5 Party Rejection Return
   - 6.6 Stock Deduction Mechanics (CurrentStock)
   - 6.7 Stock Rate Stamping (SP_FabDelivery_stkValue)
7. [Fabric Delivery Return — FrmFabDel_Return](#7-fabric-delivery-return--frmfabdel_return)
8. [Accessory Delivery — FrmAccDel / FrmAccDel_Return](#8-accessory-delivery--frmaccdel--frmaccdel_return)
   - 8.1 Accessory Stock Model (Atype/Ades)
   - 8.2 SP_AccDelivery_stkValue — Budget Rate Lookup
   - 8.3 SP_AccProcessDelivery_stkValue — Process Rate Addition
9. [Accessory Sales Delivery — frmAccSalesDel](#9-accessory-sales-delivery--frmaccsalesdel)
10. [General DC — FrmGenDC](#10-general-dc--frmgendc)
11. [Piece Delivery — frmPcsDel](#11-piece-delivery--frmpcsdel)
    - 11.1 Piece DC Creation Flow
    - 11.2 Delivery Types (Process, Despatch, Sales, Unit Transfer-Panel, JobWork Return)
    - 11.3 Stock Posting — PROC_Stock_PiecesDelivery_Insert
    - 11.4 Stock Posting — PROC_Stock_PanelDelivery_Insert
    - 11.5 Source Stage Auto-Resolution
    - 11.6 Lot-Wise Stock Tracking
    - 11.7 GRN Acceptance (Woven Orders)
    - 11.8 Rework Stock Handling (GAN_RewrkFlg)
12. [Piece Delivery Variants](#12-piece-delivery-variants)
    - 12.1 frmPcsDel_Ship — Ship Sample Delivery
    - 12.2 frmPcsDelRework — Rework Delivery
    - 12.3 frmPcsDelRecClose — Receipt Close
    - 12.4 frmPanelDelRework — Panel Rework Delivery
13. [Process Delivery — frmPrsDel / frmPrsDelAcc](#13-process-delivery--frmprsdel--frmprsdelacc)
    - 13.1 frmPrsDelMulti / frmPrsDelMulti_Acc / frmPrsDelMulti_Compwise
14. [Gate Entry & Gate Pass](#14-gate-entry--gate-pass)
    - 14.1 FrmGateEntry — Inward/Outward Gate Logging
    - 14.2 FrmGatePass — Gate Pass Generation
    - 14.3 FrmDirectBill_GateEntry — Direct Bill Gate Entry
    - 14.4 GatePassFlg Option
15. [Loading — FrmLoading](#15-loading--frmloading)
16. [Packing Lists](#16-packing-lists)
    - 16.1 FrmPackingList — Export Packing List
    - 16.2 FrmPackingList_Domestic — Domestic Packing List
    - 16.3 FrmLocalInvPackingList / _Solid — Invoice-Linked Packing
    - 16.4 FrmLocInvPackingListFormat — Format Configuration
17. [Unit Transfer & Acknowledgement](#17-unit-transfer--acknowledgement)
    - 17.1 Unit Transfer via frmPcsDel (DelType='Unit Transfer-Panel')
    - 17.2 FrmUnitTransferAck — Receiving Unit Acknowledgement
    - 17.3 PROC_UnitAck_Insert — Stock Posting at Receiving Unit
    - 17.4 PROC_UnitAck_Panel_Insert — Panel Stock Acknowledgement
    - 17.5 PROC_UnitAck_Delete_2 — Acknowledgement Reversal
    - 17.6 PROC_UnitAckLineStk_Insert / _Delete — Employee-Level Ack
18. [Godown Transfer Acknowledgement — FrmGodownTransferAck / FrmGoDownAck](#18-godown-transfer-acknowledgement)
    - 18.1 PROC_GodownAck_Delete — Stock Reversal at Godown
19. [Line Transfer — Trs_LineTfr](#19-line-transfer--trs_linetfr)
    - 19.1 PROC_Stock_LineTfr_Insert — Employee-to-Employee Transfer
    - 19.2 PROC_Stock_LineTfr_Delete — Transfer Reversal
20. [DC Completion & Utilities](#20-dc-completion--utilities)
    - 20.1 frmGeneralDCCompletion — Mark DC Complete
    - 20.2 FrmDcIdUpdation — DC ID Correction
    - 20.3 FrmDcWiseDtl — DC-Wise Detail Enquiry
21. [Delivery Challan Print Engine](#21-delivery-challan-print-engine)
    - 21.1 SP_DEL_PRSRT — Dynamic View for Fabric/Yarn DC Printing
    - 21.2 SP_PcsDcPrintQry — Piece DC Print Data
    - 21.3 Report Templates Catalog
22. [Views & Registers](#22-views--registers)
    - 22.1 Vue_TrsDc — Unified DC Register (All TrTypes)
    - 22.2 Vue_TrsDcAbs — Aggregated DC Register
    - 22.3 VUE_DEL_PRSRT — DC Print View (Fabric/Yarn/Acc)
    - 22.4 Vue_OrdVsDespatch_Summary — Order vs Despatch Summary
    - 22.5 VueDespatchStock1 — Despatch Stock View
23. [Triggers — Balance Maintenance](#23-triggers--balance-maintenance)
    - 23.1 TRG_FAB_BALANCE_DEL — Fabric DC Balance
    - 23.2 TRG_YARN_BALANCE_DEL — Yarn DC Balance
    - 23.3 Knit Delivery Triggers (Trs_Del3)
24. [Stock Value on DC — Costing Integration](#24-stock-value-on-dc--costing-integration)
25. [Cross-Module Integration Points](#25-cross-module-integration-points)

---

## 1. Module Overview

The Dispatch, Delivery & Logistics module handles **all outbound material movement** from the FiberPro ERP, covering:

- **Fabric/Yarn/Accessory delivery challans** (process issue to party, sales, purchase returns, transfers)
- **Piece/Panel delivery challans** (process delivery, despatch to buyer, sales, rework, unit transfers)
- **Gate control** (inward/outward gate entry, gate passes)
- **Loading management** (vehicle loading against DCs)
- **Packing lists** (export and domestic, invoice-linked)
- **Inter-unit transfers** and **godown transfers** with acknowledgement workflows
- **Line-level employee transfers** of pieces within production
- **DC printing** with GST, E-way bill, rate, and design information

The module operates on two parallel material models:
1. **StockID-based** (fabric/yarn/accessories/general) — uses `CurrentStock` / `StockTable`, tracked in Bags/Kg/Meters
2. **PcsStockId-based** (pieces/panels) — uses `Pcs_StockTable` / `Panel_StockTable`, tracked in piece counts by Style/Color/Size/Part/Lot

Both models share a common DC header structure but diverge at the line-item and stock-posting level.

---

## 2. Forms Inventory

| # | Form Name | Purpose |
|---|-----------|---------|
| 1 | **FrmFabDel** | Fabric/Yarn delivery challan (process issue, sales, purchase return, transfer) |
| 2 | **FrmFabDel_Return** | Fabric delivery return entry |
| 3 | **FrmAccDel** | Accessory delivery challan |
| 4 | **FrmAccDel_Return** | Accessory delivery return |
| 5 | **frmAccSalesDel** | Accessory sales delivery |
| 6 | **FrmGenDC** | General (non-order-specific) delivery challan |
| 7 | **frmPcsDel** | Piece delivery challan (primary piece DC form) |
| 8 | **frmPcsDel_Ship** | Ship sample delivery |
| 9 | **frmPcsDelRework** | Piece rework delivery |
| 10 | **frmPcsDelRecClose** | Piece delivery receipt close |
| 11 | **frmPanelDelRework** | Panel rework delivery |
| 12 | **frmPrsDel** | Process delivery (fabric process route) |
| 13 | **frmPrsDelAcc** | Process delivery for accessories |
| 14 | **frmPrsDelMulti** | Multi-process delivery |
| 15 | **frmPrsDelMulti_Acc** | Multi-process delivery for accessories |
| 16 | **frmPrsDelMulti_Compwise** | Multi-process delivery (component-wise) |
| 17 | **FrmGateEntry** | Gate entry (inward/outward logging) |
| 18 | **FrmGatePass** | Gate pass generation |
| 19 | **FrmDirectBill_GateEntry** | Direct bill gate entry |
| 20 | **FrmLoading** | Vehicle loading management |
| 21 | **FrmPackingList** | Export packing list |
| 22 | **FrmPackingList_Domestic** | Domestic packing list |
| 23 | **FrmLocalInvPackingList** | Invoice-linked packing list |
| 24 | **FrmLocalInvPackingList_Solid** | Solid-color invoice packing list |
| 25 | **FrmLocInvPackingListFormat** | Packing list format configuration |
| 26 | **FrmUnitTransferAck** | Unit transfer acknowledgement |
| 27 | **FrmGodownTransferAck** | Godown transfer acknowledgement |
| 28 | **FrmGoDownAck** | Godown acknowledgement (pieces) |
| 29 | **frmGeneralDCCompletion** | Mark general DCs as completed |
| 30 | **FrmDcIdUpdation** | DC ID correction utility |
| 31 | **FrmDcWiseDtl** | DC-wise detail enquiry/report |

---

## 3. Data Model — Core Transaction Tables

### 3.1 Trs_Del1 — Fabric/Yarn/Accessory/General DC Header

Stores the header record for every non-piece delivery challan (fabric, yarn, accessories, general materials).

| Column | Type | Purpose |
|--------|------|---------|
| **ID** | int (PK) | Auto-generated DC identifier |
| **DocNo** | int | Sequential DC number within financial year |
| **Finyear** | varchar | Financial year code (e.g., "25-26") |
| **Dt** | datetime | DC date |
| **TrType** | int | Transaction type code (see §4) |
| **Coycode** | int | Company/unit code → Mas_Exporter.ExpID |
| **Prs_Dept** | int | Processing department → Mas_Dept.DeptID |
| **Party** | int | Destination party → Mas_Party.PID |
| **PartyUnit** | char(1) | 'P' = Party, 'U' = Unit (inter-unit transfer) |
| **ProcessType** | char(1) | 'P' = Process, 'R' = Reprocess |
| **LotNo** | varchar | Lot number assigned to DC |
| **VehicleCode** | int | Vehicle → Mas_Vehicle.Code |
| **GPNo** | varchar | Gate pass number |
| **TarDt** | datetime | Target return date |
| **OurGRNID** | int | Linked GRN ID (for returns) → Trs_Grn1.ID |
| **remark** | varchar | Free-text remark |
| **delwgt** | decimal | Total delivery weight |
| **PreparedBy** | int | User who created → Mas_User.UserCode |
| **EwayBillNo** | varchar | E-way bill number (GST compliance) |
| **EwayBillDt** | datetime | E-way bill date |
| **DESIGNID** | int | Design ID (for printing dept) |

### 3.2 Trs_Del2 — DC Line Items (StockID-Based)

Each row represents one stock item (one StockID) on the delivery challan.

| Column | Type | Purpose |
|--------|------|---------|
| **ID** | int (FK) | → Trs_Del1.ID |
| **StockID** | int (FK) | → StockTable.StockID |
| **OrdId** | int (FK) | → OrderMas.OrdId (can differ per line for transfers) |
| **BgRl** | decimal | Bags/Rolls quantity |
| **Kg** | decimal | Weight in kilograms |
| **mtr** | decimal | Length in meters |
| **StkRate_DC** | decimal | Stock rate at time of DC (stamped by SP_*Delivery_stkValue) |
| **TOTRECKgs** | decimal | Total received Kgs (populated by GRN reconciliation) |
| **TOTBudAmt** | decimal | Total budget amount |
| **styleno** | varchar | Style number (for multi-style orders) |
| **prs_rate** | decimal | Process rate for this item |

### 3.3 Trs_Del3 — Knit/Yarn Delivery Extension Detail

Extended detail for deliveries involving knitting/yarn specifications. Linked to Trs_Del1 by ID.

| Column | Type | Purpose |
|--------|------|---------|
| **ID** | int (FK) | → Trs_Del1.ID |
| **OrdId** | int | Order reference |
| **Gsm** | decimal | GSM value |
| **DiaID** | int | Diameter ID |
| **FinDiaID** | int | Finished diameter ID |
| **GeneralRate** | decimal | General/agreed rate |
| **FabType** | int | Fabric type → StockTable.FabID |
| **LotNo** | varchar | Lot number |
| **LL** / **GG** | decimal | Loop length / gauge |
| **Cnt** / **Clr** | int | Count ID / Color ID |
| **PrgKnitGSM** / **PrgKnitDiaId** | decimal/int | Program knit specs |
| **Print_DesignId** | int | Print design ID |

### 3.4 Trs_Del4 — GST / Tax Addition Detail

Stores GST additions (SGST, CGST, IGST) and other charges applied to delivery challans.

Referenced by invoice/billing SPs (SP_Vue_SalesInvoice_DC, SP_InvQry1).

### 3.5 Trs_Pcs1 — Piece/Panel DC Header

Header for piece-goods and panel delivery challans.

| Column | Type | Purpose |
|--------|------|---------|
| **ID** | int (PK) | Auto-generated DC ID |
| **DocNo** | int | Sequential DC number |
| **Finyear** | varchar | Financial year |
| **dtDCDate** | datetime | DC date |
| **Coycode** | int | Company/unit → Mas_Exporter.ExpID |
| **Dept** | int | Department → Mas_Dept.DeptID |
| **Ordjobno** | int | Order ID → OrderMas.OrdId |
| **Party** | int | Destination party → Mas_Party.PID |
| **ToCoyCode** | int | Destination unit (unit transfers) → Mas_Exporter.ExpID |
| **TargetStageId** | int | Target production stage → Mas_JobWrkComp.ID |
| **DelType** | varchar(30) | Delivery type classification (see §5) |
| **ProcessType** | char(1) | 'P' = Process, 'R' = Reprocess |
| **NoBdl** | int | Number of bundles |
| **Wgt** | decimal | Total weight |
| **Remark** | varchar | Free-text remark |
| **Buyer** | int | Buyer ID (for despatch deliveries) |
| **GodId** | int | Source godown → Mas_Godown |
| **GPNo** | varchar | Gate pass number |
| **VehicleCode** | int | Vehicle → Mas_Vehicle.Code |
| **RejectionTypeId** | int | Rejection type (for rework DCs) |
| **TarDt** | datetime | Target date |
| **PreparedBy** | int | User who created |
| **EwayBillNo** | varchar | E-way bill number |
| **EwayBillDt** | datetime | E-way bill date |
| **LotNo** | varchar | Lot number |

### 3.6 Trs_Pcs2 — Piece/Panel DC Line Items (Size-Wise)

Each row represents one color/size/part/style combination on the piece DC.

| Column | Type | Purpose |
|--------|------|---------|
| **ID** | int (FK) | → Trs_Pcs1.ID |
| **StyleNo** | varchar(20) | Style number |
| **StyleID** | int | → Mas_StyleDesc.StyleID |
| **ColID** | int | → Mas_Color.ColID |
| **SizeID** | int | → Mas_Size.SizeID |
| **PartID** | int | → Mas_Part.PartID |
| **PanelID** | int | → Mas_Panel.PanelID |
| **Pcs** | int | Piece count |
| **LotNo** | varchar(15) | Lot number |
| **SourceStageId** | int | Source production stage from which pieces are taken |
| **CompID** | int | Component ID (for panel deliveries) |

### 3.7 Trs_UnitAck1 / Trs_UnitAck2 — Unit Transfer Acknowledgement

Records the acknowledgement of a unit-to-unit transfer at the **receiving** unit.

**Trs_UnitAck1** (Header):
| Column | Type | Purpose |
|--------|------|---------|
| **ID** | int (PK) | Acknowledgement ID |
| **Coycode** | int | Receiving company/unit |
| **Sender** | int | Sending unit |
| **GodId** | int | Receiving godown |

**Trs_UnitAck2** (Detail):
| Column | Type | Purpose |
|--------|------|---------|
| **ID** | int (FK) | → Trs_UnitAck1.ID |
| **TransId** | int | Original DC ID → Trs_Pcs1.ID |
| **StyleNo** | varchar | Style |
| **ColId** / **SizeId** / **PartID** | int | Dimensions |
| **Pcs** | int | Pieces acknowledged |
| **LotNo** | varchar | Lot number |
| **StyleID** / **PanelID** | int | Style/Panel identifiers |
| **SrcLineID** | int | Source line/employee ID |

### 3.8 Trs_PcsGodAck1 / Trs_PcsGodAck2 — Godown Acknowledgement

Records piece acknowledgement at a different godown (intra-company godown transfer).

**Trs_PcsGodAck1** (Header):
| Column | Type | Purpose |
|--------|------|---------|
| **ID** | int (PK) | Acknowledgement ID |
| **Coycode** | int | Company code |
| **GodId** | int | Receiving godown |

**Trs_PcsGodAck2** (Detail):
| Column | Type | Purpose |
|--------|------|---------|
| **ID** | int (FK) | → Trs_PcsGodAck1.ID |
| **TransId** | int | Original DC ID → Trs_Pcs1.ID |
| **StyleNo** / **ColId** / **SizeId** / **PartID** | various | Piece dimensions |
| **Pcs** | int | Pieces acknowledged |
| **LotNo** | varchar | Lot |
| **SrcLineID** | int | Source employee line |

### 3.9 Trs_LineTfr / Trs_LineTfr_Det — Line Transfer

Records employee-to-employee piece transfers within a production line.

**Trs_LineTfr** (Header):
| Column | Type | Purpose |
|--------|------|---------|
| **ID** | int (PK) | Transfer ID |
| **Coycode** | int | Company |
| **OrdJobNo** | int | Order ID |
| **TargetStageID** | int | Production stage |
| **GodId** | int | Godown |
| **EmpID** | int | Source employee |
| **ToEmpID** | int | Destination employee |

**Trs_LineTfr_Det** (Detail):
| Column | Type | Purpose |
|--------|------|---------|
| **ID** | int (FK) | → Trs_LineTfr.ID |
| **StyleNo** / **ColId** / **SizeId** / **PartID** | various | Piece dimensions |
| **Pcs** | int | Pieces transferred |
| **LotNo** | varchar | Lot |
| **SourceStageId** | int | Source stage |

---

## 4. Transaction Type Taxonomy (TrType)

The `TrType` field on `Trs_Del1` classifies the nature of the delivery:

| TrType | Name | Direction | Description |
|--------|------|-----------|-------------|
| 1 | Process DC | OUT | Regular delivery to processing party |
| 2 | Sales DC | OUT | Sales delivery to buyer |
| 3 | Transfer Out | OUT | Stock transfer between orders |
| 4 | Purchase Return | OUT | Return to supplier |
| 6 | Process Return DC | OUT | Return from process (outbound correction) |
| 7 | Process DC (alt) | OUT | Alternate process DC variant |
| 8 | Transfer In (reverse) | OUT | Inter-order transfer variant |
| 10 | Process DC (knit) | OUT | Knitting process delivery |
| 11 | Process DC (print) | OUT | Printing process delivery |
| 12 | Process DC (dye) | OUT | Dyeing process delivery |
| 13 | Party Rejection Return | OUT | Return of rejected material to party |
| 14 | Godown Transfer | OUT/IN | Inter-godown movement |
| 17 | Fabric Transfer to Unit | OUT | Unit-level fabric delivery |

The `VUE_DEL_PRSRT` view resolves headings:
- TrType 1 → "DELIVERY CHALLAN"
- TrType 4 → "PURCHASE RETURN"
- TrType 13 → "PARTY REJECTION RETURN"

---

## 5. Delivery Type Taxonomy (DelType — Piece DCs)

The `DelType` field on `Trs_Pcs1` classifies piece delivery challans:

| DelType | Description | Stock Behavior |
|---------|-------------|---------------|
| **Process** | Regular process delivery to party | Deduct from source stage, credit to party at target stage |
| **Despatch** | Final despatch to buyer/customer | Deduct from finished stage (StageId = -3) |
| **Sales** | Sales delivery (domestic/direct) | Deduct from source stage directly |
| **Unit Transfer-Panel** | Panel transfer between units | Deduct from source unit, pending ack at receiving unit |
| **JobWork Return** | Return of job-work pieces | Deduct from party stock (no source stage credit) |
| **Supplier Receipt Rejection** | Rejection of supplier-received pieces | Special: credits back to source stage Good stock |

---

## 6. Fabric/Yarn Delivery — FrmFabDel

### 6.1 DC Creation Workflow

1. **Select Order**: User selects an order (OrdId) and processing department (Prs_Dept)
2. **Select Destination**: Party (PartyUnit='P') or Unit (PartyUnit='U')
3. **Load Available Stock**: `FabDeliverySP` fetches available stock for the order/godown
4. **Enter Quantities**: User enters Bags/Kg/Meters per stock item
5. **Save DC**: Header saved to `Trs_Del1`, lines to `Trs_Del2`
6. **Stock Deduction**: `CurrentStock` table updated (Bg, Kg, Mt decremented)
7. **Balance Triggers Fire**: `TRG_FAB_BALANCE_DEL` / `TRG_YARN_BALANCE_DEL` update `ST_ProgBalance_Fabric` / `ST_ProgBalance_Yarn`
8. **Rate Stamping**: `SP_FabDelivery_stkValue` stamps cumulative bill rate onto `Trs_Del2.StkRate_DC`
9. **Print DC**: Report generated via `SP_DEL_PRSRT` → VUE_DEL_PRSRT view → Stimulsoft report

### 6.2 Stock Selection (FabDeliverySP)

```
FabDeliverySP(@OrdId, @Coycode, @GodId, @FabDelID)
```

Returns available stock for DC entry via two UNION ALL blocks:

1. **Block 1 — Current Stock**: Joins `CurrentStock` → `StockTable` → master tables. Filters by `OrdId`, `Coycode`, `GodId`. Groups by fabric/color/count/GSM/dia/lot. Returns only items with Kg > 0 or Mt > 0.

2. **Block 2 — Already-Delivered Items**: From `Trs_Del2` for the same `FabDelID` (editing mode). Shows items already on this DC that may have zero current stock (because they were already deducted). Excludes items already found in Block 1.

**Key Fields Returned**: FabDesc, ColorDesc, CountName, LotNo, GSM, LL, GG, Dia, SB (sum bags), SK (sum kg), SM (sum meters), StockID, UOM, FinGsm, FinDia, DesignId, DesignDesc, StyleNo.

### 6.3 Process vs Reprocess Delivery

- **ProcessType = 'P'** (Process): Regular outbound to processing party. Stock deducted from source godown.
- **ProcessType = 'R'** (Reprocess): Material sent back for rework. Same stock mechanics but tracked separately for costing.

### 6.4 Purchase Return Flow

`TrType = 4` — Material returned to supplier. Links back to original GRN via `OurGRNID` → `Trs_Grn1.ID`. On the DC print, heading shows "PURCHASE RETURN".

### 6.5 Party Rejection Return

`TrType = 13` — Rejected material returned to processing party. DC heading shows "PARTY REJECTION RETURN".

### 6.6 Stock Deduction Mechanics (CurrentStock)

When a fabric/yarn DC is saved:
- `CurrentStock.Bg` -= delivered bags
- `CurrentStock.Kg` -= delivered kg
- `CurrentStock.Mt` -= delivered meters

Stock is matched by `StockID` + `OrdId` + `GodId`.

### 6.7 Stock Rate Stamping (SP_FabDelivery_stkValue)

```
SP_FabDelivery_stkValue(@ID)
```

Stamps the budget/cumulative bill rate onto `Trs_Del2.StkRate_DC` for costing purposes:

1. **Priority 1**: Use `StockRatePost.CumBillRate` (cumulative bill rate) if non-zero. Matches on OrdId + DeptId + CntId + FabId + ColId + DesignId.
2. **Priority 2**: If CumBillRate = 0, use `StockRatePost.BudRate` (budget rate).
3. **Priority 3**: For process departments (3, 15, 4, 8), also try `BudRate` from `StockRatePost`.

---

## 7. Fabric Delivery Return — FrmFabDel_Return

Handles return of fabric delivered via DC back into stock. Creates a return DC (typically TrType = 6 or similar) that reverses the original delivery's stock movements. The original DC's `Trs_Del1.ID` may be referenced.

---

## 8. Accessory Delivery — FrmAccDel / FrmAccDel_Return

### 8.1 Accessory Stock Model (Atype/Ades)

Accessories use a different stock dimension compared to fabric:
- `StockTable.Atype` → `Mas_Acc.ID` (accessory type: buttons, zippers, etc.)
- `StockTable.Ades` → `Mas_AccDes.ID` (accessory description within type)
- `StockTable.Siz` — accessory size
- `StockTable.ColID` — accessory color

The DC line items still use `Trs_Del2` with `StockID` but the view resolution (Vue_TrsDcAbs) joins to `Mas_Acc` / `Mas_AccDes` for description display.

### 8.2 SP_AccDelivery_stkValue — Budget Rate Lookup

```
SP_AccDelivery_stkValue(@ID)
```

Updates `Trs_Del2.StkRate_DC` with the accessory budget rate from `Pro_AccBudRate`:

```sql
UPDATE Trs_Del2
SET StkRate_DC = Pro_AccBudRate.BudRate
FROM Trs_Del1 a
  INNER JOIN Trs_Del2 tmp ON a.ID = tmp.ID
  INNER JOIN StockTable B ON tmp.StockID = B.StockID
  INNER JOIN Pro_AccBudRate C ON C.OrdID = tmp.OrdId
    AND C.Acc_Type = B.Atype
    AND C.Acc_Desc = B.Ades
    AND C.Clr = B.ColID
    AND C.Siz = B.Siz
  INNER JOIN Mas_Dept ON A.Prs_Dept = Mas_Dept.DeptID
WHERE (Mas_Dept.AccProsDept = 'Y' OR A.Prs_Dept = 16)
  AND tmp.ID = @ID
```

Filter: Only applies to departments marked as accessory process departments (`AccProsDept = 'Y'`) or department 16.

### 8.3 SP_AccProcessDelivery_stkValue — Process Rate Addition

```
SP_AccProcessDelivery_stkValue(@ID)
```

For accessory **process** deliveries (non-dept-16), the rate = `BudRate + prs_rate` (accessory budget rate plus the process rate from `Trs_Po5`):

```sql
UPDATE Trs_Del2
SET StkRate_DC = (Pro_AccBudRate.BudRate + tmp.prs_rate)
-- ...joined with Trs_Po5 for process rate lookup
WHERE (Mas_Dept.AccProsDept = 'Y' OR A.Prs_Dept <> 16)
  AND tmp.ID = @ID
```

---

## 9. Accessory Sales Delivery — frmAccSalesDel

Specialized form for creating sales DCs for accessories (TrType = 2 with accessory stock). Distinct from process delivery in that the buyer receives the goods directly rather than a processing party.

---

## 10. General DC — FrmGenDC

Handles delivery challans for **general (non-order-specific)** materials. Uses the same `Trs_Del1`/`Trs_Del2` structure with `OrderMas.JobNo = 0` (general order). The report `GenDC.mrt` uses a `GeneralDcDataSource` and displays the heading as "DELIVERY CHALLAN" or "PURCHASE RETURN" based on TrType.

Report variants:
- `GenDC.mrt` — Standard general DC
- `GenDC_SGST.mrt` — With SGST details
- `GenDC_SGST_Cost.mrt` — With SGST + cost information
- `GenDC_SGST_Cost_a4.mrt` — A4 format

---

## 11. Piece Delivery — frmPcsDel

The primary form for delivering finished/semi-finished pieces and panels.

### 11.1 Piece DC Creation Flow

1. **Select Order** (Ordjobno) and **Department** (Dept)
2. **Set Delivery Type** (DelType): process, despatch, sales, etc.
3. **Select Target Stage** (TargetStageId) → `Mas_JobWrkComp.ID`
4. **Select Party** or **Destination Unit** (ToCoyCode for unit transfers)
5. **Enter Size-Wise Quantities**: Style × Color × Size × Part → Pcs count
6. **Save**: Header to `Trs_Pcs1`, lines to `Trs_Pcs2`
7. **Stock Posting**: Appropriate PROC called based on piece/panel type
8. **Print**: `SP_PcsDcPrintQry` generates print data

### 11.2 Delivery Types

Based on `DelType`:

- **Process delivery** (PartyId > 0): Deducts from source stage at PartyId=0, credits at target stage under PartyId
- **Despatch** (PartyId = 0, Buyer-based): Deducts from finished stage (StageId = -3) for buyer shipment
- **Sales** (PartyId = 0): Deducts from SourceStageId; FinishedStageID = SourceStageId
- **Unit Transfer-Panel**: Deducts from source unit; receiving unit acknowledges via FrmUnitTransferAck
- **JobWork Return**: Only deducts party stock; no source stage credit

### 11.3 Stock Posting — PROC_Stock_PiecesDelivery_Insert

```
PROC_Stock_PiecesDelivery_Insert(
  @Id, @StyleNo, @PartId, @ColId, @SizeId,
  @SourceStageID, @Pcs, @LotNo
)
```

**Core Logic** (simplified):

1. **Read header** from `Trs_Pcs1`: Coycode, Ordid, TargetStageId, GodId, ProcessType, RejectionTypeId
2. **Resolve LotId** from `Mas_Lot.LotSno` where `LotName = @LotNo`
3. **Despatch-with-lot override**: If `LotwiseStockReqd = 'N'` and `Prod_Without_Lot_Despatch_WithLot = 'Y'`, set LotId = 0

**If PartyId > 0** (process delivery to party):
- **Credit party stock**: If `Pcs_StockTable` row exists for (Coycode, OrdId, StyleNo, StageId, PartId, GodId, PartyId, LotId), UPDATE `StockQty += @Pcs`. Otherwise INSERT new row.
- GoodPcsFlag: 'G' for process (P), 'M' for reprocess (R)
- RejectionTypeId: 0 for process, actual value for reprocess

**If PartyId = 0** (despatch/sales):
- **Deduct finished stock**: For Despatch, deducts from StageId = -3 (finished goods). For Sales, deducts from SourceStageId.
- UPDATE `Pcs_StockTableQty.StockQty -= @Pcs`

**Source Stage Deduction** (for piece/bit types):
- If SourceStageId ≠ 0 and PcsType is 'Piece' or 'Bit' (or SourceStage = TargetStage):
- Deduct `@Pcs` from `Pcs_StockTableQty.StockQty` at source stage, PartyId=0

**Delete variants**: `PROC_Stock_DeliveryPieces_Delete` / `_Delete_1` reverse all the above operations.

**Update variants**: `PROC_Stock_PiecesDelivery_Update` / `_Update_LineStk` combine delete + re-insert logic for edits.

### 11.4 Stock Posting — PROC_Stock_PanelDelivery_Insert

```
PROC_Stock_PanelDelivery_Insert(
  @Id, @StyleNo, @PartId, @ColId, @SizeId,
  @SourceStageID, @Pcs, @LotNo, @CompId
)
```

Identical structure to piece delivery but operates on `Panel_StockTable` / `Panel_StockTableQty` and includes the `@CompId` dimension (component ID).

- Panel stock uses `Panel_StockTableQty.CompId` as an additional grouping dimension
- PcsType check also includes 'Panel' alongside 'Piece' and 'Bit'

### 11.5 Source Stage Auto-Resolution

The `SourceStageId` on `Trs_Pcs2` indicates where the pieces came from:
- For **process deliveries**: pieces are taken from PartyId=0 at SourceStageId and placed under PartyId at TargetStageId
- `Prod_Sequence` table provides the stage ordering for the order/style
- The form resolves the correct source based on the production route sequence

### 11.6 Lot-Wise Stock Tracking

Configurable per order via `OrderMas2.LotwiseStock`:
- `'Y'` — Full lot-wise tracking (LotId resolved from `Mas_Lot`)
- `'N'` — No lot tracking (LotId = 0)

System-wide override: `Options.LotwiseStockReqd` and `Options1.Prod_Without_Lot_Despatch_WithLot`:
- When LotWise = 'N' but Despatch_WithLot = 'Y': production ignores lots, but despatch uses LotId = 0

### 11.7 GRN Acceptance (Woven Orders)

For woven orders (`OrderMas.Knit_Woven_Both_OrderType = 'W'`):
- `Options.GRNAcceptance_Pcs = 'Y'` enables GRN acceptance workflow
- Affects rework processing: if GAN_PCS='Y' and order is woven and ProcessType='R', the `GAN_RewrkFlg` is set to 'Y'

### 11.8 Rework Stock Handling (GAN_RewrkFlg)

When `GAN_RewrkFlg = 'Y'` (GRN acceptance + woven + reprocess):
- Instead of moving `StockQty`, the system updates **`RewrkStk`** column on `Pcs_StockTableQty`
- On delete: `RewrkStk += @Pcs` (restore rework stock)
- On insert: `RewrkStk -= @Pcs` (consume rework stock)
- This keeps rework quantities separate from regular good stock

---

## 12. Piece Delivery Variants

### 12.1 frmPcsDel_Ship — Ship Sample Delivery

Specialized form for shipping sample pieces to buyers. Uses the same `Trs_Pcs1`/`Trs_Pcs2` structure. Report: `PcsShipSample.mrt`.

### 12.2 frmPcsDelRework — Rework Delivery

Delivers pieces back for rework processing (ProcessType = 'R'). The `RejectionTypeId` on `Trs_Pcs1` categorizes the type of defect. Stock posting uses `GoodPcsFlag = 'M'` for defective pieces.

### 12.3 frmPcsDelRecClose — Receipt Close

Closes a delivery-receipt cycle, marking the DC as fully received/acknowledged.

### 12.4 frmPanelDelRework — Panel Rework Delivery

Panel-specific rework delivery. Reports: `PanelDc1Rework_SGST.mrt`.

---

## 13. Process Delivery — frmPrsDel / frmPrsDelAcc

### 13.1 Overview

`frmPrsDel` handles fabric/yarn process delivery to parties for specific processing operations (knitting, dyeing, printing, etc.). `frmPrsDelAcc` is the accessory variant.

### 13.2 frmPrsDelMulti / frmPrsDelMulti_Acc / frmPrsDelMulti_Compwise

Multi-process delivery forms that create DCs spanning multiple processing stages or components:
- **frmPrsDelMulti**: Fabric/yarn delivery covering multiple process departments in one DC
- **frmPrsDelMulti_Acc**: Multi-process for accessories
- **frmPrsDelMulti_Compwise**: Component-wise breakdown for multi-component orders

These forms generate corresponding `Trs_MultiPrs_Grn1/2/3` records when the receiving party does multi-process GRN.

---

## 14. Gate Entry & Gate Pass

### 14.1 FrmGateEntry — Inward/Outward Gate Logging

Records vehicle/material movements through the factory gate:
- **Inward**: Material arriving (linked to GRN)
- **Outward**: Material departing (linked to DC)
- Captures: vehicle number, driver, time in/out, material description, party details

### 14.2 FrmGatePass — Gate Pass Generation

Generates a numbered gate pass document for outbound material. The `GPNo` field on `Trs_Del1` / `Trs_Pcs1` stores the gate pass reference.

System option `Options.GatePassFlg` controls whether gate pass is mandatory:
- `'Y'` — Gate pass required before DC can be printed
- `'N'` — Gate pass optional

### 14.3 FrmDirectBill_GateEntry — Direct Bill Gate Entry

Special gate entry form for direct billing scenarios where material arrives and is billed directly without going through the normal GRN → delivery flow.

### 14.4 GatePassFlg Option

The `Options.GatePassFlg` flag is read by:
- `VUE_DEL_PRSRT` view (fabric DC print)
- `SP_PcsDcPrintQry` (piece DC print)
- Both pass the flag to reports which conditionally show/hide the gate pass section

---

## 15. Loading — FrmLoading

Manages the loading of goods onto vehicles for dispatch:
- Links DCs to vehicle loading records
- Tracks loading sequence and vehicle capacity
- Integration point between DC creation and physical dispatch

---

## 16. Packing Lists

### 16.1 FrmPackingList — Export Packing List

Creates packing lists for export shipments:
- Links to piece DCs (Trs_Pcs1/2 for despatch type)
- Captures carton numbers, gross/net weights per carton
- Size-wise piece breakdown per carton
- Report templates: `FabDC_PackList.mrt`, `FabDC_PackList_HalfPage.mrt`, `FabGRN_PackList.mrt`

### 16.2 FrmPackingList_Domestic — Domestic Packing List

Domestic variant with simplified format (no export documentation requirements).

### 16.3 FrmLocalInvPackingList / FrmLocalInvPackingList_Solid

Invoice-linked packing lists:
- `FrmLocalInvPackingList` — Standard invoice-linked packing list
- `FrmLocalInvPackingList_Solid` — Solid-color variant (simplified for single-color orders)

### 16.4 FrmLocInvPackingListFormat — Format Configuration

Allows configuration of packing list layout and field visibility.

---

## 17. Unit Transfer & Acknowledgement

### 17.1 Unit Transfer via frmPcsDel (DelType='Unit Transfer-Panel')

Unit-to-unit panel transfers are initiated through the piece delivery form:
- `Trs_Pcs1.ToCoyCode` stores the receiving unit
- `DelType = 'Unit Transfer-Panel'`
- Stock deducted from source unit immediately
- Receiving unit must acknowledge to credit their stock

### 17.2 FrmUnitTransferAck — Receiving Unit Acknowledgement

The receiving unit uses this form to:
1. View pending incoming transfers (from `Trs_Pcs1` where `ToCoyCode` = current unit)
2. Acknowledge received quantities
3. Save to `Trs_UnitAck1` (header) + `Trs_UnitAck2` (detail)
4. Stock posting adds pieces to receiving unit's `Pcs_StockTable`

### 17.3 PROC_UnitAck_Insert — Stock Posting at Receiving Unit

```
PROC_UnitAck_Insert(
  @Id, @StyleNo, @PartID, @ColId, @SizeId,
  @Pcs, @LotNo, @TransID
)
```

**Logic**:
1. Gets receiving unit (`Coycode`) from `Trs_UnitAck1`
2. Gets order/stage from `Trs_Pcs1` via `Trs_UnitAck2.TransId`
3. Gets receiving godown from `Trs_UnitAck1.GodId`
4. If `Pcs_StockTable` row exists: UPDATE `StockQty += @Pcs`
5. If not: INSERT new `Pcs_StockTable` + `Pcs_StockTableQty` rows
6. `GoodPcsFlag` based on ProcessType ('G' for process, 'M' for reprocess)

### 17.4 PROC_UnitAck_Panel_Insert — Panel Stock Acknowledgement

Same as piece acknowledgement but for `Panel_StockTable` / `Panel_StockTableQty`:
- Includes `@CompId` parameter for component tracking
- Handles `DelType = 'Unit Transfer-Panel'`: resolves `SourceStageID` from `Trs_Pcs2` rather than `TargetStageID` from `Trs_Pcs1`

### 17.5 PROC_UnitAck_Delete_2 — Acknowledgement Reversal

Reverses unit acknowledgement by deducting pieces from the receiving unit's stock:
- Cursor-based: iterates all `Trs_UnitAck2` rows for the ID
- Handles employee-level stock (`EmpID` on `Pcs_StockTable`)
- Decrements `StockQty` at the acknowledged stage/godown

### 17.6 PROC_UnitAckLineStk_Insert / _Delete — Employee-Level Acknowledgement

Variants that track stock at the employee (line) level using `Pcs_StockTable.EmpID`.

---

## 18. Godown Transfer Acknowledgement

### FrmGodownTransferAck / FrmGoDownAck

Handles acknowledgement of piece transfers between godowns within the same company:
- Source: piece DC with intra-company godown transfer
- `Trs_PcsGodAck1` stores header (receiving godown)
- `Trs_PcsGodAck2` stores detail (pieces acknowledged per style/color/size)

### 18.1 PROC_GodownAck_Delete — Stock Reversal at Godown

Reverses godown acknowledgement: decrements `Pcs_StockTableQty.StockQty` at the receiving godown. Uses cursor to iterate all acknowledged items. Supports employee-level tracking via `SrcLineID` matching `Pcs_StockTable.EmpID`.

---

## 19. Line Transfer — Trs_LineTfr

### 19.1 PROC_Stock_LineTfr_Insert — Employee-to-Employee Transfer

```
PROC_Stock_LineTfr_Insert(
  @Id, @StyleNo, @PartId, @ColId, @SizeId,
  @SourceStageID, @Pcs, @LotNo
)
```

Moves pieces between employees on the production line:
1. **Source employee** (`EmpID`): deducts from `Pcs_StockTable` where `EmpID = @FRM_EMPID`
2. **Destination employee** (`ToEmpID`): credits to `Pcs_StockTable` where `EmpID = @TO_EMPID`
3. If destination row doesn't exist, creates new `Pcs_StockTable` + `Pcs_StockTableQty` with the `EmpID` set

This enables tracking of which employee holds which pieces at any production stage.

### 19.2 PROC_Stock_LineTfr_Delete — Transfer Reversal

Reverses line transfer: deducts from destination employee's stock, credits back to source employee's stock. Cursor iterates `Trs_LineTfr_Det` rows.

---

## 20. DC Completion & Utilities

### 20.1 frmGeneralDCCompletion — Mark DC Complete

Marks general DCs as complete/closed. Sets the `Clos` (close) flag on `Trs_Del1`, preventing further editing.

### 20.2 FrmDcIdUpdation — DC ID Correction

Utility form to correct DC IDs/references when errors occur. Administrative function, typically restricted to admin users.

### 20.3 FrmDcWiseDtl — DC-Wise Detail Enquiry

Read-only enquiry form showing all details for a specific DC:
- Header info (party, date, department, vehicle)
- Line items with stock descriptions
- Linked GRN references
- Rate and value information

---

## 21. Delivery Challan Print Engine

### 21.1 SP_DEL_PRSRT — Dynamic View for Fabric/Yarn DC Printing

```
SP_DEL_PRSRT(@Id varchar(max))
```

Dynamically **ALTERs the VUE_DEL_PRSRT view** to filter for a specific DC ID, then the report reads from this view.

**Key columns exposed**:
- DC identification: ID, DcNo (formatted with prefix), Dt, TrType, Prs_Dept
- Order info: OrderNo (formatted as JobNo/FinYear→BuyOrdNo)
- Party/Unit: Pname, Paddress, Phone, TIN, CST, GSTNo (resolves P vs U)
- Company: ExporterName, ExporterAddress, GSTNo, PAN, IoNoCaption
- Stock details: FabDesc, ColorDesc, CountName, Dia, FDia, GSM, DesignDesc
- Quantities: BgRl, Kg, Mtr, UOM
- DC metadata: VName (vehicle), Terms, GPNo, GatePassFlg, EwayBillNo/Dt
- User: Username (prepared by)
- **Rate calculation**: Complex CASE logic:
  - If `PrePrint.DcRateReqd = 1` AND ProcessType = 'P':
    - For general orders (JobNo=0): use `Trs_Del3.GeneralRate`
    - For regular orders with program form (`ProgFrm_Issue='Y'`): use `BudPodet.Rate` (budget PO rate), fallback to `Pro_ReqKnitt2.Rate`
- **Amount**: `Trs_Del2.Kg × Pro_ReqKnitt2.Cost`
- **Heading**: 'DELIVERY CHALLAN' / 'PURCHASE RETURN' / 'PARTY REJECTION RETURN'
- **GrpHeader**: Concatenated grouping string for report banding

### 21.2 SP_PcsDcPrintQry — Piece DC Print Data

```
SP_PcsDcPrintQry(@Id varchar(100), @Sqlcond varchar(1000), @Coycode varchar(10))
```

Comprehensive dynamic SQL query joining:
- `Trs_Pcs1` / `Trs_Pcs2` (DC header/detail)
- `OrderMas` (order info), `Mas_Buyer` (buyer), `Mas_Season` (season)
- `Mas_Exporter` (company), `Mas_Party` (party)
- `Mas_Dept`, `Mas_JobWrkComp` (stage info)
- `Mas_Color`, `Mas_Size`, `Mas_StyleDesc`, `Mas_Part`, `Mas_Panel`
- `Mas_HSN` (HSN code — resolved dynamically based on PcsType: BitForm / SemiFinished / Finished)
- `Pro_Prod_PartwiseRate` (part-wise rate for amount)
- `Mas_Vehicle` (vehicle)
- `BudPoMas` / `BudPoDet` (budget PO rate)
- `Mas_Exporter_Concern` (parent concern for holding company)

**Key computed fields**:
- `ProcessType`: 'PROCESS DELIVERY CHALLAN' / 'REPROCESS DELIVERY CHALLAN' / 'UNIT TRANSFER - PANEL'
- `Amount`: `Trs_Pcs2.Pcs × Pro_Prod_PartwiseRate.Cost`
- `Amount1`: `SUM(Pcs) × BudPoDet.Rate`
- **HSN Code Resolution**: Conditional on PcsType:
  - Panel → `Mas_HSNPce.PceStage = 'BitForm'`
  - Semi-finished → `Mas_HSNPce.PceStage = 'SemiFinished'`
  - Finished → `Mas_HSNPce.PceStage = 'Finished'`

### 21.3 Report Templates Catalog

**Fabric/Yarn DC Reports**:
| Report | Description |
|--------|-------------|
| FabDC.mrt | Standard fabric DC |
| FabDC_SGST.mrt | With SGST details |
| FabDC_SGST_Cost.mrt | With SGST + stock cost |
| FabDC_SGST_Cost_Full.mrt | Full-page cost variant |
| FabDC_SGST_Cost_PrsRt.mrt | With process rate |
| FabDC_SGST_Cost_PrsRt_OrdWise.mrt | Order-wise process rate |
| FabDC_SGST_Cost_Cut.mrt | Cutting DC variant |
| FabDC_GoDown.mrt | Godown transfer DC |
| FabDC_PackList.mrt | Fabric DC packing list |
| FabDC_PackList_HalfPage.mrt | Half-page packing list |
| FabNewDC.mrt | New format fabric DC |
| FabSalesDC.mrt | Fabric sales DC |
| FabSalesDC_SGST.mrt | Sales DC with SGST |
| FabSalesDCCumInv.mrt | Cumulative invoice DC |
| CourierDC.mrt | Courier delivery DC |

**Accessory DC Reports**:
| Report | Description |
|--------|-------------|
| AccDC.mrt | Standard accessory DC |
| AccDC_SGST.mrt | With SGST |
| AccDC_SGST_Cost.mrt | With cost details |
| AccDC_GoDown.mrt | Godown transfer |

**General DC Reports**:
| Report | Description |
|--------|-------------|
| GenDC.mrt | Standard general DC |
| GenDC_SGST.mrt | With SGST |
| GenDC_SGST_Cost.mrt | With cost details |
| GenDC_SGST_Cost_a4.mrt | A4 format |

**Piece DC Reports**:
| Report | Description |
|--------|-------------|
| PcsDc.mrt | Standard piece DC |
| PcsDc1.mrt | Piece DC variant 1 |
| PcsDc1_SGST.mrt | With SGST |
| PcsDc1_SGST_Cost.mrt | With cost |
| PcsDc1_SGST_Cost_1.mrt | Cost variant |
| PcsDc1_SGST_Cost_Large.mrt | Large format |
| PcsDc1_SGST_Cost_old.mrt | Legacy format |
| PcsDc1_SGST_Bit.mrt | Bit-form DC with SGST |
| PcsDc1_SGST_Panel.mrt | Panel DC with SGST |
| PcsDc1Rework_SGST.mrt | Rework DC with SGST |
| PanelDc1Rework_SGST.mrt | Panel rework DC |
| PcsDc_SGST_Large.mrt | Large format SGST |
| PcsDc_WithRate.mrt | DC with rate display |
| PcsDcNew.mrt | New format piece DC |
| PcsDc_ACC.mrt | Accessory pieces DC |
| PcsDc_Acc_Pre.mrt | Accessory pre-print DC |
| PcsDc-Acc.mrt | Alternate accessory DC |
| PcsRetDc.mrt | Piece return DC |
| Pcs_IssueToProd.mrt | Issue to production DC |
| PcsFinishedGoods.mrt | Finished goods DC |
| PcsTransfer.mrt | Piece transfer DC |
| PcsShipSample.mrt | Ship sample DC |

**Despatch Reports**:
| Report | Description |
|--------|-------------|
| PcsDespatch.mrt | Despatch challan |
| PcsDespatch_Large.mrt | Large format |
| PcsDespatch1.mrt | Alternate format |

**Other**:
| Report | Description |
|--------|-------------|
| DebitAcc.mrt / DebitAccGST.mrt | Accessory debit note |
| DebitFab.mrt / DebitFabGST.mrt | Fabric debit note |
| DebitYarn.mrt / DebitYarnGST.mrt | Yarn debit note |
| DebitComm_GST.mrt | Commercial debit GST |
| DirectDebitYarn.mrt / DirectDebitYarnGST.mrt | Direct yarn debit |
| RollPrint.mrt | Roll print label |
| READYTOCUT.mrt / READYTOCUTRETURN.mrt | Ready-to-cut forms |

---

## 22. Views & Registers

### 22.1 Vue_TrsDc — Unified DC Register (All TrTypes)

Combines all outbound delivery challans into a single view via 7 UNION ALL blocks:

1. **Process DC** (TrType IN 1,7,10,11,12) — regular with party/unit handling
2. **Multi-Process DC** — auto-generated from `Trs_MultiPrs_Grn1/2/3` where `OurDCID=0`
3. **Return DC** (TrType IN 4,6) — process/purchase returns
4. **Transfer DC** (TrType IN 3,8) — inter-order stock transfers
5. **Sales DC** (TrType = 2) — with buyer name
6. **Godown Transfer** (TrType = 14) — inter-godown
7. **Fabric Transfer to Unit** (TrType = 17) — unit-level

**Key Columns**: TrType, Clos, Coycode, OrdId, DcNo, DcDate, Pname, DeptID, StockID, BgRl, Kg, Mtr, ProcessType, PartyUnit, MultiGRN, SubPrsID

### 22.2 Vue_TrsDcAbs — Aggregated DC Register

Joins `Vue_TrsDc` with `StockTable` and master tables for human-readable descriptions. Groups and sums `BgRl`, `Kg`, `Mtr`. Special handling for Dept 8 (Dyeing) and Dept 10 (Printing): uses dye color / design description instead of stock color.

### 22.3 VUE_DEL_PRSRT — DC Print View (Fabric/Yarn/Acc)

Static version of the view dynamically altered by `SP_DEL_PRSRT`. Comprehensive DC report data source joining 20+ tables. See §21.1 for full column listing.

### 22.4 Vue_OrdVsDespatch_Summary

```
SP_Vue_OrdVsDespatch_Summary
```

Creates a view comparing **order quantities** vs **despatched quantities**:
- Order data from `OrderQtyDtl` (EntryOption=1) and `OrdQtyClrDtl` (EntryOption=2)
- Despatch data from `VueDespatchStock1`
- Computes: OrderQty, ExcQty (excess), DesPcs, OrdAmt, DesAmt, BalQty, BalAmt
- Sale rate: weighted average (`SUM(Qty × Rate) / SUM(Qty)`)
- Excess quantity: `CutPlanQty` (includes excess percentage)

### 22.5 VUE_TRSRECABS — Receipt Abstract

Aggregated receipt view (counterpart to DC register) combining all inbound transactions. Groups `RBag`, `RecKgs`, `Recmtr` with resolved descriptions from master tables. **Depends on**: `Vue_TrsRec`.

---

## 23. Triggers — Balance Maintenance

### 23.1 TRG_FAB_BALANCE_DEL — Fabric DC Balance

| Attribute | Value |
|-----------|-------|
| **Table** | `Trs_Del2` |
| **Events** | INSERT, UPDATE, DELETE |
| **Target** | `ST_ProgBalance_Fabric` |

Automatically maintains fabric program balance aggregates when delivery records change:
1. Identifies affected Coycode, OrdId, Dept from `Trs_Del1`
2. Filters for fabric deliveries (non-yarn: `YF <> 'Y'`)
3. Aggregates `DcKgs` and `DcMtr` from all `Trs_Del2` records for the same order/department
4. Updates `ST_ProgBalance_Fabric.DcKgs` / `DcMtr`

### 23.2 TRG_YARN_BALANCE_DEL — Yarn DC Balance

| Attribute | Value |
|-----------|-------|
| **Table** | `Trs_Del2` |
| **Events** | INSERT, UPDATE, DELETE |
| **Target** | `ST_ProgBalance_Yarn` |

Same pattern as fabric but filters `YF = 'Y'` and handles both process issues (TrType=1) and sales DCs (TrType=2).

### 23.3 Knit Delivery Triggers (Trs_Del3)

- **TRG_YARN_BALANCE_DEL_KNIT_DEL**: Fires on `Trs_Del3` INSERT/UPDATE — decrements `ST_ProgBalance_Yarn.DcKgs` for knit deliveries
- **TRG_YARN_BALANCE_DEL_KNIT_DEL_DEL**: Fires on `Trs_Del3` DELETE — restores the balance
- **TRG_YARN_BALANCE_DEL_DEL**: Additional yarn balance correction on `Trs_Del2` DELETE

---

## 24. Stock Value on DC — Costing Integration

Three stored procedures stamp the stock cost/rate onto `Trs_Del2.StkRate_DC` at DC save time:

| SP | Material | Rate Source | Formula |
|----|----------|-------------|---------|
| `SP_FabDelivery_stkValue` | Fabric/Yarn | `StockRatePost.CumBillRate` (priority), then `BudRate` | StkRate_DC = CumBillRate or BudRate |
| `SP_AccDelivery_stkValue` | Accessories | `Pro_AccBudRate.BudRate` | StkRate_DC = BudRate |
| `SP_AccProcessDelivery_stkValue` | Acc (process) | `Pro_AccBudRate.BudRate` + `Trs_Po5.prs_rate` | StkRate_DC = BudRate + prs_rate |

These rates flow into:
- **DC reports** (cost columns on printed DCs)
- **Bill-to-be value** calculations
- **Daily Unit P&L** (`Sp_DailyUnitPANDL`)
- **Order-wise costing** (`SP_Vue_OrderStyleWiseCost`)

---

## 25. Cross-Module Integration Points

| Integration | Description |
|-------------|-------------|
| **Orders (Module 2)** | Every DC references an `OrdId`; `Vue_OrdVsDespatch_Summary` tracks order fulfillment |
| **Procurement (Module 3)** | Purchase returns (TrType=4) link back to GRN via `OurGRNID`; party DC reference (`PartyDCref`) from GRN shown on DC |
| **Inventory (Module 4)** | DC saves deduct `CurrentStock` (fabric/yarn/acc) or `Pcs_StockTable` / `Panel_StockTable` (pieces/panels); triggers maintain program balance summaries |
| **Cutting/Panels (Module 5)** | Panel deliveries use `Panel_StockTable`; `CompId` links to cutting components |
| **Production (Module 6)** | Piece DCs reference production stages (`TargetStageId`, `SourceStageId`) from `Mas_JobWrkComp`; line transfers move pieces between employees |
| **Billing/GST (Module 8)** | `Trs_Del4` stores GST additions; `SP_Vue_SalesInvoice_DC` joins DCs to invoices; HSN codes resolved per DC type |
| **Costing (Module 9)** | `StkRate_DC` stamped at DC time feeds budget-vs-actual and P&L calculations |
| **Reporting (Module 14)** | 40+ Stimulsoft reports; `VUE_DEL_PRSRT` and `SP_PcsDcPrintQry` are the primary data sources |
