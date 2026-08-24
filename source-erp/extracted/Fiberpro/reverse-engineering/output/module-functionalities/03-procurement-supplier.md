# Module 3 — Procurement & Supplier Management

> **Generated**: 2026-03-15  
> **Source**: 22 procurement-related forms, ~12 stored procedures, ~15 transaction/summary tables, 13 Stimulsoft reports (.mrt), 1 Crystal Report (.rpt), 4 report code-behind files (.cs), GRN-related triggers  
> **Foundation References**: database-schema.md, stored-procedures-analysis.md, triggers-and-views-analysis.md, formulas-and-calculations.md, 01-masters-configuration.md, 02-order-management-sales.md

---

## Table of Contents

1. [Module Overview](#1-module-overview)
2. [Forms Inventory](#2-forms-inventory)
3. [Data Model — Procurement Tables](#3-data-model--procurement-tables)
   - 3.1 Trs_Po1 — Purchase Order Header
   - 3.2 Trs_Po2 — PO Lines (Yarn/Fabric)
   - 3.3 Trs_Po5 — PO Lines (Accessories)
   - 3.4 Trs_Grn1 — GRN Header
   - 3.5 Trs_GRN2 — GRN Lines
   - 3.6 Trs_MultiPrs_Grn1/2/3 — Multi-Process GRN
   - 3.7 SuppOrdMas / SuppOrdDet / SuppOrdStyleDtl — Supplier Orders
   - 3.8 Summary & Balance Tables
4. [Purchase Order Entry](#4-purchase-order-entry)
   - 4.1 frmPurchaseOrd_MultiOrder — Multi-Order PO (Yarn/Fabric)
   - 4.2 frmPurchaseOrd_MultiOrder_HO — Head Office PO
   - 4.3 frmPurchaseOrdAcc — Accessories PO
   - 4.4 FrmPOEntryWithMultipleStyleNo — PO Entry with Multiple Style Numbers
5. [PO Lifecycle Management](#5-po-lifecycle-management)
   - 5.1 FrmPOCancel — PO Cancellation
   - 5.2 frmPoCompl — PO Completion/Close
6. [GRN Entry — Yarn & Fabric](#6-grn-entry--yarn--fabric)
   - 6.1 frmGRNEntry — Standard GRN
   - 6.2 frmGRNEntry_MultiOrder — Multi-Order GRN
   - 6.3 frmGRN_MultiProcess — Multi-Process GRN
   - 6.4 frmPrsGRNMulti — Process GRN (Multi)
   - 6.5 frmPrsGRNMulti_Compwise — Process GRN (Component-wise)
7. [GRN Entry — Accessories](#7-grn-entry--accessories)
   - 7.1 frmGRNEntryAcc — Accessories GRN
   - 7.2 frmGRNEntryAcc_Ret_Multi — Accessories GRN Return (Multi)
8. [GRN Acceptance](#8-grn-acceptance)
   - 8.1 FrmPurGrnAccept — Purchase GRN Acceptance
   - 8.2 FrmProGrnAccept — Production GRN Acceptance
9. [GRN Types & Stock Posting](#9-grn-types--stock-posting)
10. [Supplier Order Management](#10-supplier-order-management)
    - 10.1 FrmSuppOrdSheet_Semi — Supplier Order Sheet
    - 10.2 FrmSuppProdSequence — Supplier Production Sequence
    - 10.3 FrmSuppTechDataSheet — Supplier Technical Data Sheet
11. [Supplier Registers & Reports](#11-supplier-registers--reports)
    - 11.1 FrmSupplierOrderRegister — Supplier Order Register
    - 11.2 FrmSuppOrderHistoryReg — Supplier Order History
    - 11.3 FrmSupplierBillReg — Supplier Bill Register
    - 11.4 frmSupordPendReg — Supplier Pending Order Register
12. [Rate Confirmation Workflow](#12-rate-confirmation-workflow)
13. [Party Balance Tracking](#13-party-balance-tracking)
    - 13.1 Fabric/Yarn Party Balance (ST_PartyBalance_Abs)
    - 13.2 Accessories Party Balance (ST_Acc_PartyBal_Abs)
14. [Program Balance Integration](#14-program-balance-integration)
15. [GRN → Costing Integration](#15-grn--costing-integration)
16. [Procurement Stored Procedures Summary](#16-procurement-stored-procedures-summary)
17. [Procurement Reports Catalog](#17-procurement-reports-catalog)
18. [Cross-Module Dependencies](#18-cross-module-dependencies)

---

## 1. Module Overview

The Procurement & Supplier Management module handles the **complete inbound material lifecycle** in FiberPro — from issuing purchase orders for raw materials (yarn, fabric, accessories) through receipt of goods (GRN), to tracking supplier orders for outsourced garment production. This module is the primary **supply-side counterpart** to the Order Management module.

**Key characteristics:**
- **Three material streams**: Yarn/Fabric procurement (Trs_Po2, Trs_Grn2), Accessories procurement (Trs_Po5, separate GRN flow), and Piece Goods supplier orders (SuppOrdMas)
- **Multi-order POs**: A single purchase order can cover multiple production orders, with line items linked to specific OrderMas.OrdId references
- **Process vs Purchase GRN**: GRNs are classified as 'Purchase' (new material from vendor), 'Process' (material returning from outsourced processing), 'Process Return' (rejected from process), 'Sales Return', 'DirectReceipt' (no PO), or 'FabricRetToUnit'
- **Multi-process GRN**: A separate three-tier table structure (Trs_MultiPrs_Grn1/2/3) handles goods that pass through multiple processing stages in a single receipt
- **Automatic balance maintenance**: Every PO and GRN transaction updates summary tables (ST_PartyBalance_Abs, ST_Acc_Prog_Balance, ST_ProgBalance_Yarn, ST_ProgBalance_Fabric) via stored procedures and triggers
- **Rate cascading**: GRN receipt triggers cumulative bill rate recalculation through the entire process department chain via the Tgr_StockRatePost trigger
- **PO identification**: Each PO has a system `ID` (auto-increment PK), a user-facing `DocNo/Finyear` combination, and links to the department, supplier party, and currency

---

## 2. Forms Inventory

| # | Form Class | Purpose |
|---|-----------|---------|
| 1 | `frmPurchaseOrd_MultiOrder` | Multi-order purchase order for yarn/fabric |
| 2 | `frmPurchaseOrd_MultiOrder_HO` | Head office level multi-order PO |
| 3 | `frmPurchaseOrdAcc` | Accessories purchase order |
| 4 | `FrmPOEntryWithMultipleStyleNo` | PO entry supporting multiple style numbers per line |
| 5 | `FrmPOCancel` | PO cancellation (cancel quantity on existing PO lines) |
| 6 | `frmPoCompl` | PO completion/close (mark PO as fulfilled) |
| 7 | `frmGRNEntry` | Standard GRN entry for yarn/fabric |
| 8 | `frmGRNEntry_MultiOrder` | GRN entry spanning multiple orders |
| 9 | `frmGRN_MultiProcess` | Multi-process GRN (goods through multiple process departments) |
| 10 | `frmGRNEntryAcc` | Accessories GRN entry |
| 11 | `frmGRNEntryAcc_Ret_Multi` | Accessories GRN return (multi-order) |
| 12 | `FrmPurGrnAccept` | Purchase GRN acceptance/acknowledgement |
| 13 | `FrmProGrnAccept` | Production GRN acceptance |
| 14 | `frmPrsGRNMulti` | Process GRN multi-entry |
| 15 | `frmPrsGRNMulti_Compwise` | Process GRN multi-entry (component-wise) |
| 16 | `FrmSupplierOrderRegister` | Supplier order register report viewer |
| 17 | `FrmSuppOrderHistoryReg` | Supplier order history register |
| 18 | `FrmSupplierBillReg` | Supplier bill register |
| 19 | `FrmSuppOrdSheet_Semi` | Supplier order sheet (semi-finished goods) |
| 20 | `FrmSuppProdSequence` | Supplier production sequence management |
| 21 | `FrmSuppTechDataSheet` | Supplier technical data sheet |
| 22 | `frmSupordPendReg` | Supplier pending order register |

---

## 3. Data Model — Procurement Tables

### 3.1 Trs_Po1 — Purchase Order Header

| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| ID | INT (PK, IDENTITY) | PO identifier |
| DocNo | INT | User-facing document number (per financial year) |
| Finyear | VARCHAR | Financial year (e.g., "24-25") |
| Dept | INT (FK → Mas_Dept) | Department/process the PO is placed for |
| Fcy | INT (FK → Mas_Fcy) | Foreign currency (0 = INR) |
| ExchangeRate | NUMERIC | Exchange rate at PO creation |

**Key behavior:**
- `DocNo/Finyear` provides the user-visible PO number (e.g., "PO 1234/24-25")
- `Dept` determines whether this is a yarn dept PO, fabric dept PO, or other
- Currency support enables international sourcing

### 3.2 Trs_Po2 — PO Lines (Yarn/Fabric)

| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| ID | INT (FK → Trs_Po1) | Header reference |
| OrdId | INT (FK → OrderMas) | Linked production order |
| CntId | INT (FK → Mas_Count) | Yarn count |
| ClrId | INT (FK → Mas_Color) | Color |
| PoQty | NUMERIC(18,3) | Ordered quantity (KGs) |
| cancelkgs | NUMERIC(18,3) | Cancelled quantity |
| Rate | NUMERIC | Unit rate |

**Key behavior:**
- Each PO line is tied to a specific order (`OrdId`), enabling order-wise PO tracking
- `cancelkgs` allows partial cancellation without deleting the PO line
- Effective PO quantity = `PoQty - ISNULL(cancelkgs, 0)`
- For multi-order POs, multiple lines with different `OrdId` values exist under the same header

### 3.3 Trs_Po5 — PO Lines (Accessories)

| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| ID | INT (FK → Trs_Po1) | Header reference |
| Ordid | INT (FK → OrderMas) | Linked order |
| StyleNo | VARCHAR | Style number |
| Atype | INT (FK → Mas_Acc) | Accessories type |
| Ades | INT (FK → Mas_AccDes) | Accessories description |
| Clr | INT (FK → Mas_Color) | Color |
| Siz | INT (FK → Mas_Size) | Size |
| Rate | NUMERIC | Unit rate |

**Key behavior:**
- Accessories POs use a different detail table (Trs_Po5) from yarn/fabric (Trs_Po2)
- PO lines reference the accessories master hierarchy: Type → Description → Color → Size
- Linked to both order and style for precise tracking

### 3.4 Trs_Grn1 — GRN Header (Goods Receipt Note)

| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| ID | INT (PK, IDENTITY) | GRN identifier |
| DocNo | INT | Document number |
| Finyear | VARCHAR | Financial year |
| dt | DATETIME | GRN date |
| Dept | INT (FK → Mas_Dept) | Receiving department |
| SuppID | INT (FK → Mas_Party) | Supplier party |
| Buyer | INT (FK → Mas_Buyer) | Buyer reference |
| PartyDCref | VARCHAR | Supplier's DC reference number |
| PartyDCDate | DATETIME | Supplier's DC date |
| GRNType | VARCHAR | Type classification (see Section 9) |
| Coycode | INT (FK → Mas_Exporter) | Receiving company/unit |
| ProcessType | CHAR(1) | 'P' = Process, 'R' = Reprocess |
| PoID | INT (FK → Trs_Po1) | Linked purchase order |
| DCID | INT (FK → Trs_Del1) | Linked delivery challan (for process receipts) |
| External_GRNID | INT | External GRN reference (multi-process chain) |
| GodID | INT (FK → Mas_Godown) | Target receiving godown |
| VehicleCode | INT (FK → Mas_Vehicle) | Vehicle used for transport |
| remark | VARCHAR | Free-text remarks |

**Key behavior:**
- The GRN header captures the "who, when, where, why" of goods receipt
- `GRNType` classifies the receipt transaction and drives downstream processing logic
- `PoID` links back to the purchase order for PO-fulfillment tracking
- `DCID` links to the original delivery challan (for tracking DC → GRN pairs in process receipts)
- `ProcessType` distinguishes first-time processing ('P') from reprocessing ('R')
- `External_GRNID` enables chaining multi-process GRNs

### 3.5 Trs_GRN2 — GRN Lines

| Column | Type (Inferred) | Description |
|--------|-----------------|-------------|
| ID | INT (FK → Trs_Grn1) | Header reference |
| StockID | INT (FK → StockTable) | Stock item being received |
| OrdID | INT (FK → OrderMas) | Linked production order |
| StyleNo | VARCHAR | Style |
| RBag | NUMERIC | Received bags/rolls count |
| RecKgs | NUMERIC(18,3) | Received kilograms |
| Recmtr | NUMERIC | Received meters |
| InvId | INT | Invoice/bill reference |
| PoID | INT (FK → Trs_Po1) | PO reference (line-level) |
| Rate | NUMERIC | Unit rate at receipt |

**Key behavior:**
- Each line records what was received: stock item, quantity in KGs and meters, and roll/bag count
- The `StockID` FK links to the `StockTable` which carries the full material specification (fabric, count, color, GSM, gauge, length, diameter, etc.)
- `RecKgs` is the primary quantity field used in all downstream calculations (stock posting, balance updates, costing)
- When a GRN line is deleted, the `TRG_YARN_BALANCE_GRN_DEL` trigger fires to update `ST_ProgBalance_Yarn`

### 3.6 Trs_MultiPrs_Grn1/2/3 — Multi-Process GRN

For goods that pass through multiple processing departments in a single receipt transaction, a separate three-tier structure is used:

**Trs_MultiPrs_Grn1 — Header**

| Column | Type | Description |
|--------|------|-------------|
| ID | INT (PK) | Multi-process GRN identifier |
| DocNo | INT | Document number |
| Finyear | VARCHAR | Financial year |
| GRNDate | DATETIME | GRN date |
| Coycode | INT | Receiving company |
| ProcessType | CHAR(1) | Process type |
| GRNType | VARCHAR | GRN type classification |
| remark | VARCHAR | Remarks |

**Trs_MultiPrs_Grn2 — Party-Department Detail**

| Column | Type | Description |
|--------|------|-------------|
| ID | INT (FK) | Header reference |
| DeptID | INT (FK → Mas_Dept) | Processing department |
| PartyID | INT (FK → Mas_Party) | Supplier/processor |
| PartyDCref | VARCHAR | Party's DC reference |
| PartyDCDate | DATETIME | Party's DC date |
| OurDCID | INT (FK → Trs_Del1) | Our DC reference |
| FinalProcess | CHAR(1) | 'Y'/'N' — is this the final processing step |

**Trs_MultiPrs_Grn3 — Item Lines**

| Column | Type | Description |
|--------|------|-------------|
| ID | INT (FK) | Header reference |
| DeptID | INT | Department |
| StockID | INT (FK → StockTable) | Stock item |
| OrdId | INT (FK → OrderMas) | Order |
| StyleNo | VARCHAR | Style |
| RBag | NUMERIC | Bags/rolls |
| RecKgs | NUMERIC(18,3) | Received KGs |
| Recmtr | NUMERIC | Received meters |
| PoID | INT | PO reference |

**Key behavior:**
- Level 1 is the receipt event; Level 2 records which party processed which department stage; Level 3 records the actual item quantities per department
- `FinalProcess = 'Y'` marks the last department in the chain — only the final process triggers stock-in to `CurrentStock`
- The `Vue_GrnRegFab_PO` view unions both regular GRN (Trs_Grn1/2) and multi-process GRN (Trs_MultiPrs_Grn1/2/3) for consolidated reporting

### 3.7 SuppOrdMas / SuppOrdDet / SuppOrdStyleDtl — Supplier Orders

These tables manage **piece goods supplier orders** — where garment production (cut-make-trim) is outsourced to suppliers.

**SuppOrdMas — Supplier Order Master**

| Column | Type (Inferred) | Description |
|--------|------------------|-------------|
| SuppOrdId | INT (PK) | Supplier order identifier |
| SuppNo | VARCHAR | User-facing supplier order number |
| SuppFyr | VARCHAR | Financial year |
| ExpID | INT (FK → Mas_Exporter) | Issuing company |
| PID | INT (FK → Mas_Party) | Supplier party |
| OrdId | INT (FK → OrderMas) | Linked production order |
| OrdDate | DATETIME | Order date |

**SuppOrdStyleDtl — Style-level Detail**

| Column | Type (Inferred) | Description |
|--------|------------------|-------------|
| SuppOrdId | INT (FK) | Supplier order |
| Styleno | VARCHAR | Style number |
| DelDate | DATETIME | Expected delivery date |

**SuppOrdDet — Quantity Detail**

| Column | Type (Inferred) | Description |
|--------|------------------|-------------|
| SuppOrdId | INT (FK) | Supplier order |
| StyleNo | VARCHAR | Style |
| ClrId | INT (FK → Mas_Color) | Color |
| SizeId | INT (FK → Mas_Size) | Size |
| Qty | NUMERIC | Ordered quantity (pieces) |
| CancelQty | NUMERIC | Cancelled quantity |
| Rate | NUMERIC | Rate per piece |

**Supporting tables:**
- **SuppOrdImage** — Attached images for the supplier order
- **SuppAccDet** — Accessories details for the supplier
- **SuppAssortDet** — Assortment breakdown
- **SuppCommDet** — Commercial details/terms

**Key behavior:**
- Supplier orders are separate from purchase orders — POs are for raw materials (yarn/fabric/accessories), while supplier orders are for outsourced garment production
- Supplier order receipts come through piece GRN tables (Trs_PcsGrn1/2) with `GrnType = 'Supplier Order Receipt'`
- Effective order quantity = `Qty - ISNULL(CancelQty, 0)`

### 3.8 Summary & Balance Tables

| Table | Key Dimensions | Purpose |
|-------|---------------|---------|
| **ST_PartyBalance_Abs** | OrdId, DeptID, PartyID, DcNo | Tracks PO qty, GRN qty, DC qty per party per order/dept |
| **ST_Acc_PartyBal_Abs** | OrdId, StyleNo, DeptID, PartyID, Acc_ID, PO_DC_No | Accessories party balance with PO/GRN/return tracking |
| **ST_Acc_Prog_Balance** | OrdId, StyleNo, AType, ADes, ACol, ASize | Accessories program balance (Req vs PO vs GRN vs DC vs Return) |
| **ST_ProgBalance_Yarn** | OrdID, DeptID, CountID, ColID | Yarn balance: ReqKgs, POKgs, GrnKgs, DcKgs, TransIn/Out |
| **ST_ProgBalance_Fabric** | OrdID, DeptID, FabID, CntID, ColID, etc. | Fabric balance: ReqKgs, DcKgs, GRNKgs, ReturnKgs |
| **ST_Supp_Production_Data** | Coycode, OrdID, StyleNo, PartID, ColID, SizeID, StageID | Supplier production tracking: ProdQty, DCQty, RecQty |

---

## 4. Purchase Order Entry

### 4.1 frmPurchaseOrd_MultiOrder — Multi-Order PO (Yarn/Fabric)

**Purpose**: Create purchase orders for yarn or fabric covering one or more production orders.

**Workflow:**
1. **Select department** — Determines material type (yarn dept → yarn PO, fabric dept → fabric PO). The `Mas_Dept.OutputType` ('Y' = yarn, 'F' = fabric) controls which material properties are shown
2. **Select supplier** — From `Mas_Party` (supplier master). Supplier's state determines GST type (SGST/CGST for intra-state, IGST for inter-state)
3. **Select orders** — Browse available production orders that have material requirements (`Pro_ReqYarn` for yarn, `Pro_ReqKnitt` for fabric) against the selected department
4. **Enter PO lines** — For each order, specify material specifications and quantity:
   - Yarn: Count (`Mas_Count`), Color (`Mas_Color`), quantity in KGs
   - Fabric: Fabric type (`Mas_Fabric`), Count, Color, GSM, Gauge, Length, Diameter, FinDiameter, FinGSM
5. **Set rates and currency** — Rate per unit, optional foreign currency with exchange rate (`Mas_Fcy.ExchangeRate`)
6. **Save** — Inserts header into `Trs_Po1`, lines into `Trs_Po2`, and calls `Sp_POBalnce` with TransType='PO' to update `ST_PartyBalance_Abs`

**On save — side effects:**
- `Sp_POBalnce(@OrdId, @StyleNo, 'PO', '+', @Qty, ...)` → Adds PO qty to `ST_PartyBalance_Abs`
- `Sp_AccTransaction(@OrdId, @StyleNo, ..., 'PO', '+', @Qty)` → Updates `ST_Acc_Prog_Balance.POQty` (for accessories POs)
- Program balance updates: PO quantities feed into `Vue_YarnProgBalDetailYarnOnly_N` view for yarn balance reporting

### 4.2 frmPurchaseOrd_MultiOrder_HO — Head Office PO

**Purpose**: Head-office-level purchase order creation, typically for centralized procurement across multiple factory units.

**Key differences from standard multi-order PO:**
- May specify target company/unit (`Coycode`) for delivery
- Intended for scenarios where procurement is centralized but goods are received at different factory locations
- Same underlying tables (Trs_Po1/Po2) but with HO-level authorization context

### 4.3 frmPurchaseOrdAcc — Accessories PO

**Purpose**: Create purchase orders specifically for accessories (buttons, zippers, labels, tags, thread, etc.).

**Workflow:**
1. **Select order and style** — Since accessories are style-specific
2. **Select accessories** — Browse from the accessories master hierarchy:
   - Type (`Mas_Acc.Acc_Descr`) → Description (`Mas_AccDes.AccDescription`) → Color → Size
3. **Enter quantities and rates** — Qty per accessory item, unit rate, UOM from `Mas_Acc.UomId`
4. **Select supplier** — Party for the PO
5. **Save** — Inserts into `Trs_Po1` (header) and `Trs_Po5` (accessories detail lines)
   - Calls `Sp_Acc_PartyBalance(@OrdId, @StyleNo, 'PO', '+', @Qty, ..., @Acc_ID)` to update `ST_Acc_PartyBal_Abs`
   - Calls `Sp_AccTransaction(@OrdId, @StyleNo, @AType, @ADes, @AClr, @ASize, 'PO', '+', @Qty)` to update `ST_Acc_Prog_Balance.POQty`

### 4.4 FrmPOEntryWithMultipleStyleNo — PO Entry with Multiple Style Numbers

**Purpose**: Specialized PO entry form where a single PO line can cover multiple style numbers within an order.

**Key difference:** Standard POs are per-order; this form allows entering PO quantities at the order + style level, useful for larger orders with many styles sharing the same material specification.

---

## 5. PO Lifecycle Management

### 5.1 FrmPOCancel — PO Cancellation

**Purpose**: Cancel quantities on existing PO lines without deleting the PO.

**Workflow:**
1. **Browse/select PO** — Filter by department, supplier, date range
2. **Select lines to cancel** — View current PO quantity and already-received (GRN) quantity
3. **Enter cancel quantity** — The `cancelkgs` column on `Trs_Po2` is updated
4. **Save** — Updates `Trs_Po2.cancelkgs`. Effective PO qty becomes `PoQty - cancelkgs`
5. **Balance update** — Calls `Sp_POBalnce` with TransType='PO' and TransFlg='-' to decrement the party balance

**Validation rules:**
- Cannot cancel more than `PoQty - already_received_qty`
- Cannot cancel quantities that already have matching GRN entries
- Partial cancellation is supported (cancel some, keep some)

### 5.2 frmPoCompl — PO Completion/Close

**Purpose**: Mark a PO as completed (fully received or intentionally closed).

**Workflow:**
1. **Select PO** — Browse open POs
2. **Review receipt status** — Shows ordered qty vs received qty per line
3. **Mark complete** — Sets a completion flag on the PO header
4. **Effect** — Completed POs no longer appear in GRN entry PO selection dropdowns; remaining balance is effectively written off

---

## 6. GRN Entry — Yarn & Fabric

### 6.1 frmGRNEntry — Standard GRN

**Purpose**: Record receipt of yarn or fabric from suppliers (purchase GRN) or from process parties (process GRN).

**Workflow:**
1. **Select GRN type** — `GRNType` dropdown:
   - `'Purchase'` — Incoming material from vendor against a PO
   - `'Process'` — Material returning from outsourced processing (linked to a DC)
   - `'Process Return'` — Rejected material returned from processor
   - `'Sales Return'` — Material returned by customer
   - `'DirectReceipt'` — Receipt without a PO
   - `'FabricRetToUnit'` — Fabric returned from another unit
2. **Select department** — Receiving department (determines material type expectations)
3. **Select supplier** — From `Mas_Party`; for process GRN, this is the processor party
4. **Enter party DC reference** — `PartyDCref` and `PartyDCDate` (supplier's delivery challan details)
5. **Select godown** — Target receiving warehouse (`Mas_Godown`)
6. **Link to PO or DC** — For purchase GRN: select PO (`Trs_Po1`); for process GRN: select our DC (`Trs_Del1`)
7. **Enter receipt lines** — For each material:
   - Stock item identification (via `StockTable.StockID` — fabric, count, color, GSM, etc.)
   - Bags/rolls (`RBag`), kilograms (`RecKgs`), meters (`Recmtr`)
   - Optional rate and invoice reference
8. **Save** — Multi-step commit:
   - Insert header into `Trs_Grn1`
   - Insert lines into `Trs_GRN2`
   - **Stock posting**: Update `CurrentStock` (increase stock balance for the godown)
   - **Party balance**: `Sp_POBalnce(@OrdId, ..., 'GRN', '+', @RecKgs, ...)` → Updates `ST_PartyBalance_Abs.GrnQty`
   - **GRN → DC status**: `SP_ORD_GRNSTATUS(@OrdId, @DeptID, @StockID, @DCID, @WOID)` → Updates `Trs_Del2.TOTRECKgs` and `TOTBudAmt`
   - **Costing**: `SP_GrnUpdate(@OrdId, @Formula, @GrpID)` → Updates `OrderStylewiseCost_Grp.GRNKGS` and `GRNBASEDVALUE`
   - **Trigger cascade**: Insert into `Trs_GRN2` does NOT have an AFTER INSERT trigger on it for yarn balance, but deletion triggers exist (`TRG_YARN_BALANCE_GRN_DEL`)

**GRN delete behavior:**
- On deleting GRN lines, `TRG_YARN_BALANCE_GRN_DEL` fires and decrements `ST_ProgBalance_Yarn.GrnKgs`
- Recalculates `ReqBalanceKgs = ReqKgs - (GrnKgs + TransInKgs - DelRetKgs - TransOutKgs)`

### 6.2 frmGRNEntry_MultiOrder — Multi-Order GRN

**Purpose**: Record a single GRN receipt that covers multiple production orders.

**Key differences from standard GRN:**
- The receipt line grid allows selecting different `OrdId` values per line
- A single truck/delivery from a supplier may contain material for multiple orders
- Each line's balance updates are applied to the respective order's program balance
- Same underlying tables (Trs_Grn1/2) and same stored procedure calls per line

### 6.3 frmGRN_MultiProcess — Multi-Process GRN

**Purpose**: Record receipt of goods that have been processed through multiple departments by one or more parties in a single transaction.

**Example scenario**: Fabric sent for dyeing (Dept 8) → then compacting (Dept 9) → received in one GRN covering both process stages.

**Workflow:**
1. **Create multi-process GRN header** → `Trs_MultiPrs_Grn1`
2. **For each process stage**, add department/party detail → `Trs_MultiPrs_Grn2`:
   - Select department (process stage)
   - Select party (who performed the process)
   - Enter party DC references
   - Link to our DC (`OurDCID → Trs_Del1`)
   - Mark `FinalProcess = 'Y'` for the last stage
3. **Enter item lines per department** → `Trs_MultiPrs_Grn3`:
   - Stock item, order, style, quantities
4. **Save** — Only the `FinalProcess = 'Y'` stage triggers stock-in to `CurrentStock`

**Key behavior:**
- The `Vue_GrnRegFab_PO` view unions regular GRN and multi-process GRN data for consolidated reporting
- `SP_OrderStatus` reads both `Trs_Grn1/Grn2` and `Trs_MultiPrs_Grn1/2/3` to show complete GRN status per department stage

### 6.4 frmPrsGRNMulti — Process GRN (Multi)

**Purpose**: Batch entry form for recording multiple process receipts in one session.

**Key behavior:**
- Optimized for high-volume process GRN entry
- Pre-populates expected quantities based on outstanding DCs
- Supports receiving from multiple parties/departments in one entry session
- Uses the same `Trs_Grn1/GRN2` tables with `GRNType = 'Process'`

### 6.5 frmPrsGRNMulti_Compwise — Process GRN (Component-wise)

**Purpose**: Process GRN entry broken down by garment component (front panel, back panel, sleeve, etc.).

**Key difference:** Receipt quantities are tracked per component (`Mas_Part.PartID`), enabling component-level tracking of outsourced processing. This is used when different components may be processed by different parties or at different times.

---

## 7. GRN Entry — Accessories

### 7.1 frmGRNEntryAcc — Accessories GRN

**Purpose**: Record receipt of accessories (buttons, zippers, labels, tags, etc.) from suppliers.

**Workflow:**
1. **Select order and style** — Accessories are style-specific
2. **Select supplier** — Party who supplied the accessories
3. **Link to PO** — Select the accessories PO (`Trs_Po1/Po5`)
4. **Enter receipt lines**:
   - Accessories type → description → color → size
   - Received quantity, rate
5. **Save**:
   - Updates `CurrentStock` for accessories stock items
   - Calls `Sp_Acc_PartyBalance(@OrdId, @StyleNo, 'GRN', '+', @Qty, ..., @Acc_ID)` → Updates `ST_Acc_PartyBal_Abs.GrnQty`
   - Calls `Sp_AccTransaction(@OrdId, @StyleNo, @AType, @ADes, @AClr, @ASize, 'GRN', '+', @Qty)` → Updates `ST_Acc_Prog_Balance.RECQty`

### 7.2 frmGRNEntryAcc_Ret_Multi — Accessories GRN Return (Multi)

**Purpose**: Record return of accessories back to suppliers (multi-order supported).

**Workflow:**
- Similar to standard accessories GRN but with reversed stock effect
- Calls balance procedures with TransFlg = '-' to decrement received quantities
- Updates `ST_Acc_Prog_Balance.RETQty` via `Sp_AccTransaction(..., 'RET', '+', @ReturnQty)`

---

## 8. GRN Acceptance

### 8.1 FrmPurGrnAccept — Purchase GRN Acceptance

**Purpose**: Review and accept/approve incoming purchase GRNs. This is a quality gate for purchase receipts.

**Workflow:**
1. **Browse pending GRNs** — List unaccepted GRNs filtered by date, department, supplier
2. **Review receipt details** — Quantities, material specs, supplier DC reference
3. **Accept or reject** — Mark GRN as accepted
4. **Effect** — Accepted GRNs proceed to billing/invoicing; rejected GRNs may trigger process returns

### 8.2 FrmProGrnAccept — Production GRN Acceptance

**Purpose**: Review and accept/approve process GRNs (material returning from outsourced processing).

**Key difference:** Production GRN acceptance may involve quality inspection results (fabric quality, color matching, GSM verification) before acceptance. Links to the quality/lab test module for formal quality checks.

---

## 9. GRN Types & Stock Posting

### GRN Type Classification

| GRNType | Description | Source | Stock Effect | PO Link |
|---------|-------------|--------|--------------|---------|
| `'Purchase'` | New material from vendor | External supplier | Stock IN | Yes (Trs_Po1) |
| `'Process'` | Material back from processing | Process party | Stock IN (new form) | No (DC link) |
| `'Process Return'` | Rejected from process | Process party | Stock IN (original form) | No (DC link) |
| `'Sales Return'` | Customer return | Customer | Stock IN | No |
| `'DirectReceipt'` | Direct receipt (no PO) | Any supplier | Stock IN | No |
| `'FabricRetToUnit'` | Fabric return from unit | Sister unit | Stock IN | No |

### Stock Posting on GRN

When a GRN is saved, the stock posting engine performs:

1. **CurrentStock update**: Increment `StkBg`, `StkKgs`, `StkMtr` for the receiving godown
2. **StockTable creation**: If the material specification doesn't exist in `StockTable`, a new row is created with the full specification (FabID, CntID, ColID, GSM, GG, LL, DiaID, FinDiaID, FinGSM, LotNo, etc.)
3. **Roll-level tracking**: For fabric, `Sp_currentstock_RollDtl` maintains per-roll detail in `CurrentStock_RollDtl`

### GRN → Budget Amount Calculation

The `SP_ORD_GRNSTATUS` procedure calculates GRN-based budget amounts:

**For yarn output departments** (`Mas_Dept.OutputType = 'Y'`):
```
TOTBudAmt = SUM(RecKgs) × AVG(Pro_ReqYarn2.Rate)
```
Where `Pro_ReqYarn2.Rate` is the yarn budget rate matching on order, count, and color.

**For fabric output departments** (`OutputType ≠ 'Y'`):
```
TOTBudAmt = SUM(RecKgs) × AVG(Pro_ReqKnitt2.Rate)
```
Where `Pro_ReqKnitt2.Rate` is the knitting budget rate matching on order, fabric, count, color, GSM, gauge, length, diameter, finish-diameter, finish-GSM, sub-process, and design.

**Special handling for dye departments** (`Mas_Dept.DeptGrpCode = 8`):
- Uses `DyeColID` from the delivery header (`Trs_Del1`) instead of the stock color for matching, since dyeing changes the fabric color.

---

## 10. Supplier Order Management

### 10.1 FrmSuppOrdSheet_Semi — Supplier Order Sheet

**Purpose**: Create and manage supplier orders for outsourced garment production (semi-finished or finished goods).

**Workflow:**
1. **Select order** — Link to production order (`OrderMas.OrdId`)
2. **Select supplier** — Party who will produce the garments
3. **Enter style details** — Per-style delivery dates via `SuppOrdStyleDtl`
4. **Enter quantity breakdown** — Color × Size × Quantity via `SuppOrdDet`, with rates per piece
5. **Attach images/specs** — Via `SuppOrdImage`
6. **Save** — Creates `SuppOrdMas` header and detail records

**Supplier order receipt tracking:**
- Receipts are tracked via piece GRNs (`Trs_PcsGrn1/Trs_PcsGrn2`) with `GrnType = 'Supplier Order Receipt'`
- `SP_Rpt_SupplierOrderReg` computes: `RecQty = SUM(Trs_PcsGrn2.RecPcs)` grouped by supplier order, style, color, size

### 10.2 FrmSuppProdSequence — Supplier Production Sequence

**Purpose**: Define the production sequence/stages that a supplier must follow when manufacturing garments.

**Key behavior:**
- Maps to `Prod_Sequence` table (OrdId, StyleNo, StageId, SeqNo)
- Defines which work stages apply and in what order
- Used by `SP_ST_Supp_Production_Data` to track supplier progress per stage

### 10.3 FrmSuppTechDataSheet — Supplier Technical Data Sheet

**Purpose**: Maintain technical specifications and manufacturing guidelines for suppliers — fabric details, print/embroidery specs, sizing charts, wash care instructions, etc.

---

## 11. Supplier Registers & Reports

### 11.1 FrmSupplierOrderRegister — Supplier Order Register

**Purpose**: Comprehensive register of all supplier orders with order vs receipt comparison.

**Backed by**: `SP_Rpt_SupplierOrderReg`

**Parameters:**
- Company code (`@Coycode`)
- Date range (`@FromDate`, `@ToDate`)
- Buyer, merchandiser, order, supplier filters
- Order type, completed flag, financial year

**Report columns:**
| Column | Source |
|--------|--------|
| Supplier Order No/Year | `SuppOrdMas.SuppNo/SuppFyr` |
| Style No | `SuppOrdStyleDtl.Styleno` |
| Order Qty | `SUM(SuppOrdDet.Qty - ISNULL(CancelQty, 0))` |
| Received Qty | `SUM(Trs_PcsGrn2.RecPcs)` WHERE `GrnType = 'Supplier Order Receipt'` |
| Pending Qty | Order Qty - Received Qty |
| Rate | `SuppOrdDet.Rate` |
| Sale Rate | `OrderStyleDtl.SaleRate` or `OrderQtyDtl.SaleRate` |
| Order Value | Pending Qty × Sale Rate |
| Delivery Date | `SuppOrdStyleDtl.DelDate` |
| Party Name | `Mas_Party.Pname` |
| Buyer Name | `Mas_Buyer.ShortBuyer` |
| Exchange Rate | `Mas_Fcy.ExchangeRate` |

### 11.2 FrmSuppOrderHistoryReg — Supplier Order History

**Purpose**: Historical view of all supplier orders and their fulfillment status over time.

### 11.3 FrmSupplierBillReg — Supplier Bill Register

**Purpose**: Register of supplier bills linked to supplier orders and GRNs for accounts reconciliation.

### 11.4 frmSupordPendReg — Supplier Pending Order Register

**Purpose**: Shows all supplier orders with unfulfilled quantities — pending delivery analysis.

---

## 12. Rate Confirmation Workflow

Rate confirmation is the process by which quotation rates from suppliers/job workers are compared against budget rates and approved.

### Pending Rate Confirmations — `SP_PendingRateCnf`

**Purpose**: Lists all unapproved rate confirmations.

**Data flow:**
```
Pro_RateCnfPcs1 (quotation header: QuotNo, Finyear, PartyID)
  └── Pro_RateCnfPcs2 (quotation detail: OrdId, StyleNo, PartId, StageId, Rate)
       └── Pro_Prod_PartwiseRate (budget rate for comparison)
```

**Output columns:**
| Column | Description |
|--------|-------------|
| JobNo | Job number / Finyear → Buyer Order |
| StyleNo | Style |
| PartName | Garment part (from `Mas_Part`) |
| Stage | Work stage (from `Mas_JobWrkComp.WorkComplDet`) |
| BudgetRate | Budget rate from `Pro_Prod_PartwiseRate.Rate` (outsource) or `.JobWrkRate` (in-house) |
| QuotRate | Quoted rate from `Pro_RateCnfPcs2.Rate` |
| QuotNo | Quotation reference |
| Party | Supplier name (`Mas_Party.Pname`) or Employee (`Mas_Emp.EmpName`) |
| ProdnType | 'O' = Outsource (links to Mas_Party), 'I' = In-house (links to Mas_Emp) |

**Filter**: `WHERE IsNull(Approved, 0) = 0 AND IsNull(Rate, 0) > 0`

### Approved Rate Confirmations — `SP_ApprovedRateCnf1`

**Purpose**: Lists approved rate confirmations for an order/style.

**Parameters**: `@OrdId`, `@StyleNo` (both support multi-value via `fnSplitter`)

**Filter**: `WHERE IsNull(Approved, 0) = 1`

Same output format as pending, but showing only approved quotations.

---

## 13. Party Balance Tracking

Party balance tracking maintains the **outstanding material balance** with each supplier/processor per order and department.

### 13.1 Fabric/Yarn Party Balance (ST_PartyBalance_Abs)

**Maintained by**: `Sp_POBalnce`

**Table structure:**

| Column | Description |
|--------|-------------|
| OrdId | Order reference |
| StyleNo | Style (empty string for yarn/fabric) |
| JobNo | Job number (denormalized from OrderMas) |
| IoFinyear | Financial year |
| BuyOrdNo | Buyer order number |
| DeptId | Department/process |
| PartyId | Supplier/processor |
| DcNo | DC/PO reference number |
| DcDate | DC/PO date |
| DcItemDesc | Line item description |
| DCQty | DC/PO quantity |
| DCUOM | Unit of measure |
| DcBgRl | Bags/rolls count |
| DcMtr | Meters |
| GrnQty | GRN received quantity |
| GrnItemDesc | GRN line description |
| GRNUOM | GRN unit of measure |
| GrnBgRl | GRN bags/rolls |
| GrnMtr | GRN meters |

**Transaction types and their effects:**

| TransType | TransFlg='+' | TransFlg='-' |
|-----------|--------------|--------------|
| `'PO'` | Adds to DCQty, DcBgRl, DcMtr | Subtracts from DCQty, DcBgRl, DcMtr |
| `'GRN'` | Adds to GrnQty, subtracts from GrnBgRl, GrnMtr | Subtracts from GrnQty, subtracts from GrnBgRl, GrnMtr |

**Balance formula:**
$$\text{Outstanding} = \text{DCQty} - \text{GrnQty}$$

**Upsert pattern**: The procedure checks `EXISTS(...)` first — if the combination exists, it updates; otherwise it inserts a new record.

**Dirty-flag trigger**: `Trg_ST_PartyBalance_Abs_Update` sets `UpdateFlg = 1` on any non-system update (i.e., not updates to `server_id` or `UpdateFlg` itself), enabling multi-server replication sync.

### 13.2 Accessories Party Balance (ST_Acc_PartyBal_Abs)

**Maintained by**: `Sp_Acc_PartyBalance`

**Key differences from yarn/fabric:**
- Includes `Acc_ID` dimension (accessories type/description)
- Columns: `PO_DC_No`, `PO_DC_Date`, `PO_DC_ItemDesc`, `PO_DC_Qty` (PO side), `GrnQty`, `GRN_ItemDesc` (GRN side)
- `poflg = 1` flag distinguishes PO-originated rows from DC-originated rows

**Transaction types:**

| TransType | Effect Column |
|-----------|---------------|
| `'PO'` | PO_DC_Qty |
| `'GRN'` | GrnQty |
| `'DC'` | PO_DC_Qty (delivery context) |

---

## 14. Program Balance Integration

Procurement transactions directly feed the **program balance** tracking system, which answers the question: "For this order's requirement, how much has been ordered (PO), received (GRN), delivered (DC), returned, etc.?"

### Yarn Program Balance (ST_ProgBalance_Yarn)

**Columns maintained by procurement:**

| Column | Fed By |
|--------|--------|
| ReqKgs | `Pro_ReqYarn` (requirement planning — pre-procurement) |
| POKgs | PO entry (via program balance maintenance) |
| GrnKgs | GRN entry — decremented via `TRG_YARN_BALANCE_GRN_DEL` on delete |
| DcKgs | DC entry (via `TRG_YARN_BALANCE_DEL` trigger) |
| DelRetKgs | Delivery returns |
| TransInKgs / TransOutKgs | Inter-order/godown transfers |
| ReqBalanceKgs | `= ReqKgs - (GrnKgs + TransInKgs - DelRetKgs - TransOutKgs)` |

### Fabric Program Balance (ST_ProgBalance_Fabric)

**Columns maintained by procurement:**

| Column | Fed By |
|--------|--------|
| ReqKgs | `Pro_ReqKnitt` (fabric requirement planning) |
| DcKgs / DCMtr | Via `TRG_FAB_BALANCE_DEL` trigger on Trs_Del2 |
| GRNKgs / GRNMtr | Via `TRG_FAB_BALANCE_RCUT` trigger (ready-to-cut receipts) |
| ReturnKgs / ReturnMtrs | Returns via `TRG_FAB_BALANCE_RCUT_RET` |
| ReProcessDCKgs | Reprocess DCs (when ProcessType='R') |

### Accessories Program Balance (ST_Acc_Prog_Balance)

**Maintained by**: `Sp_AccTransaction`

| TransType | Effect Column |
|-----------|---------------|
| `'NEW'` (requirement) | ReqQty |
| `'PO'` | POQty |
| `'GRN'` / `'DC'` | RECQty |
| `'RET'` | RETQty |
| `'PRSDC'` (process DC) | DELQty |

**Balance formula:**
$$\text{Acc Balance} = \text{ReqQty} - \text{POQty}$$
$$\text{Receipt Balance} = \text{POQty} - \text{RECQty} + \text{RETQty}$$

---

## 15. GRN → Costing Integration

GRN receipt triggers cost calculations that update the order-level costing model.

### SP_ORD_GRNSTATUS — DC GRN Status Update

**Parameters**: `@OrdId, @DeptID, @StockID, @DCID, @WOID`

**Logic:**
1. Reads stock specifications from `StockTable` (FabID, CntID, ColID, GSM, GG, LL, DiaID, etc.)
2. Computes total received qty: `SUM(Trs_GRN2.RecKgs)` for the given order/dept/DC/stock
3. Computes budget amount:
   - **Yarn**: `SUM(RecKgs) × AVG(Pro_ReqYarn2.Rate)` matching on OrdId + CountID + ColID + DeptID
   - **Fabric**: `SUM(RecKgs) × AVG(Pro_ReqKnitt2.Rate)` matching on full specification
4. **Updates**: `Trs_Del2.TOTRECKgs = @KGS` and `Trs_Del2.TOTBudAmt = @BUDAMT`
5. **Dye department special handling**: For `DeptGrpCode = 8`, matches on `Trs_Del1.DyeColID` instead of `StockTable.ColID`

### SP_GrnUpdate — Order Costing Group Update

**Parameters**: `@OrdId, @Formula1, @GrpID, @DeptID, @RecMethod`

**Logic:**
1. Calculates total received KGs from `Trs_Del2.TOTRECKgs` for all DCs matching the formula departments
2. Handles closed vs open DCs separately:
   - Closed DCs: Uses `MIN(TOTRECKGS, KG)` — capped at original DC quantity
   - Open DCs: Uses `TOTRECKGS` as-is
3. **Updates**: `OrderStylewiseCost_Grp.GRNKGS = @TOTRECKGS` and `.GRNBASEDVALUE = @TOTBUDAMT`

### Rate Cascading

When GRN-related rate changes occur (via `StockRatePost` table updates), the `Tgr_StockRatePost` trigger cascades cumulative bill rates:

$$\text{CumBillRate}_{dept} = \text{CumBillRate}_{prev\_dept} + \text{CurrentRate}_{dept}$$

This ensures that the cost of material received via GRN is properly reflected through the entire processing chain for accurate order costing.

---

## 16. Procurement Stored Procedures Summary

| Procedure | Purpose | Tables Written |
|-----------|---------|----------------|
| `Sp_POBalnce` | Maintains fabric/yarn party balance | `ST_PartyBalance_Abs` |
| `Sp_Acc_PartyBalance` | Maintains accessories party balance | `ST_Acc_PartyBal_Abs` |
| `Sp_AccTransaction` | Maintains accessories program balance | `ST_Acc_Prog_Balance` |
| `SP_ORD_GRNSTATUS` | Updates DC with total GRN receipt qty/amount | `Trs_Del2` |
| `SP_GrnUpdate` | Updates order costing groups from GRN data | `OrderStylewiseCost_Grp` |
| `SP_PendingRateCnf` | Lists pending rate confirmations | (read-only) |
| `SP_ApprovedRateCnf1` | Lists approved rate confirmations | (read-only) |
| `SP_Rpt_SupplierOrderReg` | Supplier order register report | (read-only) |
| `SP_ST_Supp_Production_Data` | Maintains supplier production summary | `ST_Supp_Production_Data` |
| `PartyOutQry` | Party outstanding query (pieces) | (read-only) |
| `Party_Outstanding_OrdwiseStk_Arrival` | Party outstanding with stock arrival tracking | `TempPartyBalAbs_all` |
| `FabDeliverySP` | Returns current stock for delivery form (pre-GRN context) | (read-only) |

---

## 17. Procurement Reports Catalog

### Stimulsoft Reports (.mrt)

| Report File | Purpose | Data Source |
|------------|---------|-------------|
| `AccGRN.mrt` | Accessories GRN print | `Trs_Grn1/GRN2`, `Mas_AccDes`, `Mas_Acc`, `OrderMas` |
| `AccGRNPO.mrt` | Accessories GRN with PO reference | Same + `Trs_Po1/Po5` |
| `AccDirectGRN.mrt` | Accessories direct receipt GRN print | `Trs_Grn1/GRN2`, stock details |
| `FabGRN.mrt` | Fabric GRN print | `Trs_Grn1/GRN2`, `StockTable`, `Mas_Fabric`, `Mas_Count` |
| `FabGRN_MultiPrs.mrt` | Multi-process fabric GRN print | `Trs_MultiPrs_Grn1/2/3` |
| `FabGRN_PackList.mrt` | Fabric GRN packing list | GRN lines + roll details |
| `FabNewGRN.mrt` | New fabric GRN format | Updated layout version |
| `GenGRN.mrt` | General GRN print | For general/non-fabric materials |
| `YarnGRN.mrt` | Yarn GRN print | Yarn-specific columns (count, color) |
| `YarnNewGRN.mrt` | New yarn GRN format | Updated layout version |
| `Woven_FabGRN.mrt` | Woven fabric GRN print | Woven-specific fabric specs |
| `OrderSheetRegFab.mrt` | Fabric order sheet register | Order + PO requirement summary |
| `OrderSheetRegYarn.mrt` | Yarn order sheet register | Yarn requirement + PO summary |

### Crystal Reports (.rpt)

| Report File | Purpose |
|------------|---------|
| `Rpt_WasteGRN.rpt` | Waste GRN report |

### Report Code-Behind (.cs)

| File | Report | Key Fields |
|------|--------|-----------|
| `AccGRN.cs` | Accessories GRN | GRNNo, GRNDate, Party, ItemDesc, RecKgs, Rate, Amount, GST |
| `FabGRN.cs` | Fabric GRN | GRNNo, Fabric, Count, Color, GSM, Dia, RecKgs, Recmtr, RollNo |
| `GenGRN.cs` | General GRN | Generic material receipt columns |
| `YarnGRN.cs` | Yarn GRN | Count, Color, RecKgs, Rate, LotNo |

---

## 18. Cross-Module Dependencies

### Upstream Dependencies (Procurement consumes from)

| Module | Dependency | Details |
|--------|-----------|---------|
| **Order Management** | `OrderMas.OrdId` | Every PO and GRN line is linked to an order |
| **Masters** | `Mas_Party` (suppliers), `Mas_Dept` (depts), `Mas_Fabric/Count/Color/Size/Acc` | Material specifications |
| **Planning** | `Pro_ReqYarn`, `Pro_ReqKnitt`, `Pro_AccReq` | Material requirements → PO quantities |
| **Planning** | `Pro_Prod_PartwiseRate` | Budget rates for rate confirmation comparison |

### Downstream Dependencies (Procurement feeds into)

| Module | Dependency | Details |
|--------|-----------|---------|
| **Inventory** | `CurrentStock`, `StockTable` | GRN posts stock-in; PO creates stock expectations |
| **Costing** | `OrderStylewiseCost_Grp`, `StockRatePost` | GRN triggers cost recalculation |
| **Billing** | `Trs_Bills`, `Trs_BillRate` | GRN links to supplier bills via `Trs_GRN2.InvId` |
| **Dispatch** | `Trs_Del2.TOTRECKgs` | GRN updates total received on DCs |
| **Production** | `ST_Supp_Production_Data` | Supplier production tracking |

### Key Data Flows

```
                    ┌──────────────────┐
                    │  Order Management │
                    │   (OrderMas)     │
                    └────────┬─────────┘
                             │ OrdId
          ┌──────────────────┼──────────────────┐
          │                  │                  │
   ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
   │  PO Entry   │   │ Supplier    │   │  Planning   │
   │ (Trs_Po1/2) │   │ Order       │   │ (Pro_Req*)  │
   │             │   │ (SuppOrd*)  │   │             │
   └──────┬──────┘   └──────┬──────┘   └─────────────┘
          │                  │
   ┌──────▼──────┐   ┌──────▼──────────┐
   │  GRN Entry  │   │ Piece GRN       │
   │(Trs_Grn1/2) │   │(Trs_PcsGrn1/2) │
   └──┬───┬───┬──┘   └────────┬────────┘
      │   │   │                │
      │   │   │    ┌───────────┼──────────────┐
      │   │   │    │           │              │
  ┌───▼┐ ┌▼──┐ ┌──▼──┐  ┌────▼────┐  ┌──────▼──────┐
  │Stk │ │Bal│ │Cost │  │Supp Prod│  │  Billing    │
  │Post│ │Upd│ │ Upd │  │Data     │  │  (Trs_Bills)│
  └────┘ └───┘ └─────┘  └─────────┘  └─────────────┘
```

### Integration Points with Triggers

| Trigger | Table | Procurement Impact |
|---------|-------|--------------------|
| `TRG_YARN_BALANCE_GRN_DEL` | `Trs_GRN2` (DELETE) | Decrements `ST_ProgBalance_Yarn.GrnKgs` |
| `Tgr_StockRatePost` | `StockRatePost` (INSERT/UPDATE/DELETE) | Cascades cumulative bill rates when GRN-based rates change |
| `Trg_ST_PartyBalance_Abs_Update` | `ST_PartyBalance_Abs` (UPDATE) | Sets `UpdateFlg=1` for multi-server replication sync |
| `Trg_ST_Acc_Prog_Balance_Update` | `ST_Acc_Prog_Balance` (UPDATE) | Sets `UpdateFlg=1` for sync |
| `Trg_ST_ProgBalance_Yarn_Update` | `ST_ProgBalance_Yarn` (UPDATE) | Sets update flags for sync |
| `Trg_ST_ProgBalance_Fabric_Update` | `ST_ProgBalance_Fabric` (UPDATE) | Sets update flags for sync |

---

*End of Module 3 — Procurement & Supplier Management*
