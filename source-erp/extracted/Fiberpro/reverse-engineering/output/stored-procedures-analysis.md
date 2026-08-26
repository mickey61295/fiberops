# FiberPro ERP — Stored Procedures Analysis by Module

> **Generated:** 2025-07-16  
> **Source:** `SPQuery/` directory (~240 SQL files)  
> **ERP Version:** FiberPro v2.5.9.4  
> **Database:** SQL Server

---

## Table of Contents

1. [Overview & Statistics](#1-overview--statistics)
2. [Module 1 — Masters & Configuration](#2-module-1--masters--configuration)
3. [Module 2 — Auth & Admin](#3-module-2--auth--admin)
4. [Module 3 — Order Management & Sales](#4-module-3--order-management--sales)
5. [Module 4 — Procurement & Supplier Management](#5-module-4--procurement--supplier-management)
6. [Module 5 — Inventory & Warehouse](#6-module-5--inventory--warehouse)
7. [Module 6 — Cutting, Panels & Piece Goods](#7-module-6--cutting-panels--piece-goods)
8. [Module 7 — Production & Shop Floor](#8-module-7--production--shop-floor)
9. [Module 8 — Dispatch, Delivery & Logistics](#9-module-8--dispatch-delivery--logistics)
10. [Module 9 — Accounting, Billing & GST](#10-module-9--accounting-billing--gst)
11. [Module 10 — Costing, Budgeting & Finance](#11-module-10--costing-budgeting--finance)
12. [Module 11 — Job Work & Outsourcing](#12-module-11--job-work--outsourcing)
13. [Module 12 — Quality, Lab & Approvals](#13-module-12--quality-lab--approvals)
14. [Module 13 — HR, Labor & Payroll](#14-module-13--hr-labor--payroll)
15. [Module 14 — Reporting, Analytics & Integrations](#15-module-14--reporting-analytics--integrations)
16. [Cross-Module Patterns](#16-cross-module-patterns)
17. [Key Tables Reference](#17-key-tables-reference)

---

## 1. Overview & Statistics

### Total Stored Procedures: ~240

| Module | Count | Category |
|--------|-------|----------|
| Masters & Configuration | 5 | Setup |
| Auth & Admin | 0 | (App-level) |
| Order Management & Sales | ~20 | Core |
| Procurement & Supplier | ~10 | Core |
| Inventory & Warehouse | ~15 | Core |
| Cutting, Panels & Pieces | ~15 | Core |
| Production & Shop Floor | ~40 | Core |
| Dispatch, Delivery & Logistics | ~50 | Core |
| Accounting, Billing & GST | ~25 | Finance |
| Costing, Budgeting & Finance | ~20 | Finance |
| Job Work & Outsourcing | ~12 | Operations |
| Quality, Lab & Approvals | ~8 | Operations |
| HR, Labor & Payroll | ~3 | HR |
| Reporting, Analytics & Integrations | ~30 | Analytics |

### Common Patterns

- **Stock Posting PROC_Stock_***: Insert / Update / Delete triplets for each transaction type
- **View Builders SP_Vue_***: SPs that dynamically ALTER VIEW with parameterized SQL
- **Query Procedures SP_Qry***: Numbered helper queries used by forms
- **Register Queries SP_RegQry***: Register report data providers
- **Report Queries SP_Rpt_***: Report-specific data queries
- **Helper Function**: `fnSplitter()` used universally for comma-separated ID lists
- **GST Logic**: State-based CGST/SGST vs IGST comparison (Exporter.StateId vs Party.StateId)
- **UOM Handling**: KGS vs MTR conditional calculations throughout

---

## 2. Module 1 — Masters & Configuration

These procedures handle setup data, index optimization, and system-level operations.

### SP_Index
- **Purpose:** Creates performance indexes on `Pro_ReqKnitt` and `Pro_ReqKnitt2` tables
- **Parameters:** None
- **Tables:** Pro_ReqKnitt, Pro_ReqKnitt2
- **Business Rules:** Optimizes budget view query performance by creating non-clustered indexes

### SP_SizeList
- **Purpose:** Returns ordered size list for a given order/style/bit-size combination
- **Parameters:** @Ordid, @StyleNo, @BitSizeId
- **Tables Read:** OrderMas, OrderQtyDtl, OrdSizeMas, Mas_Size, Pro_ProdBitCutDet, Mas_Bitsize
- **Business Rules:** Always includes a dummy "ALL" size (SizeID=-2) with SNo=999

### SP_StyleChange
- **Purpose:** Renames a style number across the ENTIRE database (~40+ tables)
- **Parameters:** @OrdId, @OldStyleNo, @NewStyleNo
- **Tables Written:** OrderStyleDtl, OrderQtyDtl, Order_PartDtl, OrdQtyClrDtl, Prog_ClrComb, Prog_Cns, Prog_Component, Trs_ProdEntry, Trs_Pcs1, Trs_PcsGrn1, Trs_Del2, Pcs_StockTable, Panel_StockTable, Pro_ReqKnitt, Pro_ReqYarn, Pro_AccReq, Pro_Prod_PartwiseRate, OrderStylewiseCost, and ~20 more
- **Tables Written (Log):** Trs_StyleChangeLog
- **Business Rules:** Uses explicit transaction. Logs old→new style change. Touches every table referencing StyleNo.

### SP_CpyPrgmDet
- **Purpose:** Copies programmatic details (cutting/consumption data) from one order to another
- **Parameters:** @SourceOrdId, @TargetOrdId, @StyleNo
- **Tables:** Prog_ClrComb, Prog_Cns, Prog_Component

### Sp_dbupdate1
- **Purpose:** Database schema update/migration script
- **Tables:** Various ALTER TABLE statements for adding new columns

---

## 3. Module 2 — Auth & Admin

**No stored procedures found.** Authentication and authorization are handled entirely at the application (.NET WinForms) level via `Mas_UserRights`, `Mas_Login`, and related master tables. The database has no SP-level access control.

---

## 4. Module 3 — Order Management & Sales

### SP_Vue_OrderinHand (+ _1, _ALL, _ALL_1, _ALL_12, _SaleRate, _SaleRate_1)
- **Purpose:** Creates/alters the `Vue_Rpt_OrderReg` view — comprehensive order register
- **Parameters:** @Id (comma-separated company IDs)
- **Tables Read:** OrderMas, OrderMas2, OrderStyleDtl, OrderQtyDtl, OrdQtyClrDtl, Mas_Buyer, Mas_Merchandiser, Mas_Exporter, Mas_Season, Mas_Fcy, Mas_StyleDesc, OrdSizeMas, Mas_Size, VueDespatchStock
- **Business Rules:**
  - Handles two EntryOption modes: 1 (OrderQtyDtl) and 2 (OrdQtyClrDtl - combo color)
  - Calculates order value, despatch quantity, and balance
  - Forward exchange rate (Fcy) handling for export orders
  - Completed flag tracking
- **Variants:** _ALL includes all companies; _SaleRate includes sale rate calculations; _1 variants add additional filters

### SP_Vue_OrdVsDespatch_Summary (+ _Withoutlot)
- **Purpose:** Creates order-vs-despatch summary view comparing ordered vs shipped quantities
- **Parameters:** None
- **Tables Read:** OrderMas, OrderMas2, OrderStyleDtl, OrderQtyDtl, OrdQtyClrDtl, VueDespatchStock1, Mas_Buyer, Mas_Merchandiser, Mas_Season, Mas_Fcy, Mas_Exporter
- **Business Rules:**
  - Calculates: OrderQty, ExcessQty (CutPlanQty), DesPcs, DesAmt, BalAmt, BalQty
  - Amount = Qty × SaleRate; DesAmt = DesPcs × SaleRate
  - Handles EntryOption 1 and 2

### SP_OrderStatus (+ _1, _2, _3)
- **Purpose:** Fabric processing stage status for an order
- **Parameters:** @OrdId, @DeptIds (varies by variant)
- **Tables Read:** Trs_Del1, Trs_Del2, Trs_Grn1, Trs_Grn2, Trs_MultiPrs_Grn1/2/3, StockTable
- **Business Rules:**
  - Tracks DC/GRN quantities per processing stage: Knitting (DeptID 4,43), Heat Setting (5), Washing (7,19,41,42), Compacting (9,18,28,40,44,45,46)
  - Separate tracking for multi-process GRN vs regular GRN

### SP_OrderHistoryLedger (+ _Others)
- **Purpose:** Complete I/O history ledger for an order showing all DC and GRN transactions
- **Parameters:** @OrdId, @IpAddress
- **Tables Read:** TempIoHisLedger, OrderMas, Mas_Dept, OrdSeq
- **Business Rules:** Reads from pre-populated temp table; shows DC details, GRN details, department sequence, close flags, sub-process, external GRN references

### SP_Vue_Order_in_Hand (+ _SaleRateWise, _SaleRateWise_1)
- **Purpose:** Alternative order-in-hand view with different grouping
- **Parameters:** @Id
- **Tables:** Similar to SP_Vue_OrderinHand

### SP_Qry10
- **Purpose:** Calculates total invoice amount for an order
- **Parameters:** @Ordid, @Coycode, @InvId
- **Tables Read:** OrderStylewiseCost, OrderMas, OrderStyleDtl, Ship_InvDet, Ship_InvMas, Mas_Buyer, Mas_StyleDesc, Mas_Fcy, OrderMas2
- **Business Rules:** Sum(Qty × Rate × ExRate) — handles foreign currency exchange rates

### SP_Qry7
- **Purpose:** Returns distinct style numbers from accessory deliveries for a company
- **Parameters:** @Coycode
- **Tables Read:** Trs_Del1, Trs_Del2, StockTable, Mas_AccDes, Mas_Acc, Mas_Uom, OrderMas, Mas_Exporter, Mas_Color
- **Business Rules:** Filters on TrType = -1 (accessories delivery)

---

## 5. Module 4 — Procurement & Supplier Management

### Sp_POBalnce
- **Purpose:** Maintains `ST_PartyBalance_Abs` table with PO and GRN quantities for party balance reports
- **Parameters:** @Ordid, @StyleNo, @TransType, @TransFlg (+/-), @Qty, @DeptID, @PartyID, @TransNo, @TransDate, @ItemDesc, @UOM
- **Tables Written:** ST_PartyBalance_Abs
- **Business Rules:**
  - TransType = 'PO': Adds/subtracts PO quantities
  - TransType = 'GRN': Adds/subtracts GRN quantities
  - TransType = 'DC': Adds/subtracts DC quantities
  - Upsert pattern: check exists → update/insert

### Sp_Acc_PartyBalance
- **Purpose:** Maintains `ST_Acc_PartyBal_Abs` for accessories party balance tracking
- **Parameters:** @Ordid, @StyleNo, @TransType, @TransFlg, @Qty, @DeptID, @PartyID, @TransNo, @TransDate, @ItemDesc, @UOM, @Acc_ID
- **Tables Written:** ST_Acc_PartyBal_Abs
- **Business Rules:** Same upsert pattern as Sp_POBalnce but specific to accessories with Acc_ID

### SP_ORD_GRNSTATUS
- **Purpose:** Updates delivery record with total received KGs and budget amount after GRN processing
- **Parameters:** @OrdId, @DeptID, @StockID, @DCID, @WOID
- **Tables Read:** Trs_Del1, Trs_GRN1, Trs_GRN2, StockTable, Pro_ReqYarn2, Pro_ReqKnitt2, Mas_Dept
- **Tables Written:** Trs_Del2 (TOTRECKgs, TOTBudAmt columns)
- **Business Rules:**
  - For Yarn output (Y): GRN × Yarn budget rate
  - For Fabric output: GRN × Knitting budget rate
  - Dye department (DeptGrpCode=8) has special matching logic

### SP_GrnUpdate
- **Purpose:** Updates `OrderStylewiseCost_Grp` with GRN-based quantities and budget amounts
- **Parameters:** @OrdId, @Formula, @GrpID
- **Tables Read:** Trs_Del1, Trs_Del2, StockTable
- **Tables Written:** OrderStylewiseCost_Grp

### SP_ApprovedRateCnf1
- **Purpose:** Returns approved rate confirmations (quotations) for an order/style
- **Parameters:** @OrdId, @StyleNo
- **Tables Read:** Pro_RateCnfPcs1, Pro_RateCnfPcs2, OrderMas, Mas_Part, Mas_Party, Mas_Emp, Mas_JobWrkComp, Pro_Prod_PartwiseRate
- **Business Rules:**
  - Shows both outsource (ProdnType='O' → Party) and inhouse (ProdnType='I' → Employee) quotations
  - Compares budget rate vs quoted rate

### SP_PendingRateCnf
- **Purpose:** Shows pending rate confirmations that haven't been approved yet
- **Parameters:** @OrdId, @StyleNo
- **Tables:** Similar to ApprovedRateCnf1, filtered on Approved=0

### PartyOutQry / Party_Outstanding_OrdwiseStk_Arrival
- **Purpose:** Party outstanding report and order-wise stock arrival tracking
- **Tables Read:** Trs_Del1, Trs_Del2, Trs_Grn1, Trs_Grn2, StockTable, Mas_Party

### SP_Rpt_SupplierOrderReg
- **Purpose:** Supplier order register report
- **Tables Read:** SuppOrdMas, SuppOrdDet, OrderMas, Mas_Party

---

## 6. Module 5 — Inventory & Warehouse

### PROC_Stock_* (Core Stock Posting Engine — ~50 procedures)

The stock posting engine is the centerpiece of inventory management. Each transaction type has Insert/Update/Delete variants:

#### Fabric/Yarn Stock (CurrentStock + StockTable)

| Procedure | Operation | Tables Written |
|-----------|-----------|---------------|
| FabDeliverySP | Read current stock for delivery | CurrentStock, StockTable (read) |
| Sp_currentstock_RollDtl | Roll-wise stock maintenance | CurrentStock_RollDtl |
| Sp_StockRpt | Dynamic stock report | CurrentStock, StockTable (read) |
| SP_Rpt_StockRegQry1 | Stock register report | CurrentStock, StockTable (read) |
| Accessories_Stock | Accessories stock query by order | CurrentStock, StockTable, Mas_Acc, Mas_AccDes, Mas_Godown (read) |

#### Sp_currentstock_RollDtl
- **Purpose:** Maintains roll-level detail for fabric stock (CurrentStock_RollDtl)
- **Parameters:** @Ordid, @StockID, @StyleNo, @RollID, @Type (+/-), @Rls, @Kgs, @Mtrs, @DeptId, @Flg, @DelFlg, @FromStockId, @RejRls, @RejKgs, @RejMtrs, @RewrkRls, @RewrkKgs, @RewrkMtrs
- **Tables Written:** CurrentStock_RollDtl
- **Business Rules:**
  - '+' operations: Upsert (check exists → update/insert)
  - '-' operations: Subtract quantities or DELETE if @delflg='Y'
  - DeptId=-7: Transfer operations with FromStockId tracking
  - DeptId=11: Cutting department deductions

#### FabDeliverySP
- **Purpose:** Returns current stock for fabric delivery form population
- **Parameters:** @OrdId, @DeptId, @Coycode
- **Tables Read:** CurrentStock, StockTable, Mas_Fabric, Mas_Count, Mas_Dia, Mas_Color, Mas_Design, Mas_Godown
- **Business Rules:** Shows items with stock > 0 PLUS previously delivered items (with zero stock)

#### Sp_StockRpt
- **Purpose:** Comprehensive stock report supporting Yarn (Y), Fabric (F), Accessories (A), and Piece goods
- **Parameters:** @OrdId, @Type, @FilterParams (dynamic)
- **Tables Read:** CurrentStock, StockTable, various master tables
- **Business Rules:**
  - Dynamic SQL with configurable filters
  - For accessories: cascading rate lookup: Opening → PO5 → PO5(no color) → Transfer

#### Accessories_Stock
- **Purpose:** Returns accessories stock grouped by godown
- **Parameters:** @Ordid, @ItemType
- **Tables Read:** CurrentStock, StockTable, Mas_Acc, Mas_AccDes, Mas_Color, Mas_Uom, Mas_Godown, Mas_Size, Mas_Exporter

---

## 7. Module 6 — Cutting, Panels & Piece Goods

### SP_RtoCut
- **Purpose:** Ready-to-cut calculation — updates fabric balance required for cutting
- **Parameters:** @OrdId, @StyleNo
- **Tables Read:** Pro_ReqKnitt (fabric requirements)
- **Tables Written:** ST_ProgBalance_Fabric
- **Business Rules:** Calculates fabric requirement for cutting dept (DeptID=11, -7)

### SP_ConsQuery1
- **Purpose:** Consumption query for cutting — returns fabric consumption data per production entry
- **Parameters:** @OrdId, @StyleNo, @Coycode
- **Tables Read:** Prog_ClrComb, Prog_Cns, OrderQtyDtl, Trs_ProdEntry, Trs_ProdEntryQty, Trs_Del2, StockTable
- **Business Rules:**
  - Handles yarn-dyed (yd=1) vs non-yarn-dyed fabrics
  - Joins production quantities with programmatic fabric requirements
  - Shows piece weight, fabric width, GSM, dia details

### SP_ConsQuery2 (+ _PcsGrn, _PcsGrnOneSize, +_1_Lot variants, +_Ret variants)
- **Purpose:** Extended consumption query with production entry data and bit/cut details
- **Parameters:** @Ordid, @Styleno, @Coycode, @StageID
- **Tables Read:** Prog_ClrComb, Prog_Cns, OrderQtyDtl, Pro_ProdBitCutDet, Pro_Prod_BitCutRate, Trs_ProdEntry, Trs_ProdEntryQty, Trs_Del2, StockTable, Mas_Bitsize
- **Business Rules:**
  - PcsPerBit: pieces per bit/cut size calculation
  - DesignDescription matching between bit-size and production entry
  - Yarn-dyed uses FinCol (finished color) vs regular uses FabClr

### SP_Cuttingpanelrpt
- **Purpose:** Cutting panel report
- **Tables Read:** Trs_ProdEntry, Panel_StockTable, Panel_StockTableQty

### CutACKStockPost
- **Purpose:** Cutting acknowledgment stock posting
- **Tables Written:** Pcs_StockTable, Pcs_StockTableQty

### SP_PanelAssemblyStock
- **Purpose:** Panel assembly stock query
- **Tables Read:** Panel_StockTable, Panel_StockTableQty

### SP_Qry8
- **Purpose:** Total production pieces for a specific order/style/color/size at cutting stage (StageId=1)
- **Parameters:** @Ordid, @Styleno, @ColID, @SizeID
- **Tables Read:** Trs_ProdEntry, Trs_ProdEntryQty, Trs_PcsGrn1, Trs_PcsGrn2, Mas_Dept
- **Business Rules:** Sums production + process receipt + supplier order receipt for cutting entry

### PROC_PanelReceipt_Insert (+ Delete, Delete_1, Update)
- **Purpose:** Panel receipt (GRN for panels) stock posting
- **Parameters:** @Id, @SizeId, @RecPcs, @RejPcs, @RewrkPcs
- **Tables Written:** Panel_StockTable, Panel_StockTableQty
- **Tables Read:** Trs_PcsGrn1, Trs_PcsGrn2, Prod_Sequence, Mas_JobWrkComp, Mas_Dept
- **Business Rules:**
  - Handles process return (ProcessType='R') vs receipt
  - Semi-finished dept logic determines source stage
  - Rejection types tracked with RejectionTypeId
  - GoodPcsFlag: 'G' for good, 'M' for rework

### PROC_PiecesReceipt_Insert (+ Delete, Delete_1, Update)
- **Purpose:** Piece receipt (GRN for pieces) stock posting
- **Parameters:** @Id, @SizeId, @RecPcs, @RejPcs, @RewrkPcs
- **Tables Written:** Pcs_StockTable, Pcs_StockTableQty
- **Business Rules:** Same as PanelReceipt but for piece goods (Pcs_StockTable instead of Panel_StockTable). Includes rework pieces (RewrkPcs) and rejection pieces tracking.

---

## 8. Module 7 — Production & Shop Floor

### PROC_Stock_ProdPieces (Core Procedure)
- **Purpose:** Production stock posting — adds finished/semi-finished pieces to Pcs_StockTable
- **Parameters:** @Id (production entry ID), @SizeId, @Qty
- **Tables Read:** Trs_ProdEntry, Trs_ProdEntryQty, Prod_Sequence, OrderStyleDtl, Mas_Dept, Mas_JobWrkComp
- **Tables Written:** Pcs_StockTable, Pcs_StockTableQty
- **Business Rules:**
  - Rework handling (flag 0/1/2): Normal production / rework from rejection / rework from alteration
  - Semi-finished (FinalStage='S') vs Finished (FinalStage='F') stage logic
  - Source stage stock deduction for non-cutting stages (StageId≠1)
  - Pack-order entry option handling with PcsPerColor multiplier
  - ComboID for combo color tracking
  - StockQty goes UP at target stage, DOWN at source stage

### PROC_Stock_ProdPieces Variants (~15 files)
| Variant | Purpose |
|---------|---------|
| _Update | Updates existing stock when production qty changes |
| _Delete / _Delete1 | Reverses stock on production entry deletion |
| _LineOut | Line output tracking (employee-level) |
| _LineOut_PrdEntry | Line output production entry |
| _LineOut_PrdEntry_ReWrk | Line output rework production |
| _Update_LineOut | Update line output quantities |
| _Update_LineOut_Rewrk | Update rework line output |
| _Delete_LineOut_PrdEntry | Delete line output |
| _Delete_LineOut_PrdEntry_Rewrk | Delete rework line output |
| _IssueToPrdn | Issue-to-production stock adjustment |
| _Update_IssueToPrdn | Update issue-to-production |
| _Delete_IssueToPrdn | Delete issue-to-production |
| _Delete1_IssueToPrdn | Delete variant for issue-to-production |
| _Delete1_LineOut_Prdentry | Delete variant for line output |
| _Delete1_LineOut_Prdentry_Rewrk | Delete variant for rework line output |

### PROC_Stock_ProdPanel (+ _Asm, _Delete, _Delete1, _Delete1_ASM, _Delete_Prdn, _Delete1_Prdn, _Update, _Update_ASM)
- **Purpose:** Panel production stock posting — adds panels to Panel_StockTable
- **Parameters:** @Id, @SizeId, @Qty
- **Tables Written:** Panel_StockTable, Panel_StockTableQty
- **Tables Read:** Trs_ProdEntry (or Trs_AddPanelEntry for Asm variant), Prod_Sequence
- **Business Rules:** Similar to ProdPieces but for panel stock. ASM variants handle assembly operations.

### Sp_ProductionEntryQty_1 (+ _2, _LineOut_Manual, _Panel_1, _Panel_ASM)
- **Purpose:** Master production entry quantity processor — orchestrates stock posting calls
- **Parameters:** @Id, @SizId, @Qty
- **Tables Read:** Trs_ProdEntry (StageId, Rework, SplOperation)
- **Tables Written:** Trs_ProdEntryQty
- **Business Rules:**
  - Checks LineOut_Last_StichOpr_as_a_SourceStage flag ('Y' by default)
  - For non-cutting stages (StageId≠1) with LineOut='Y': calls PROC_Stock_ProdPieces_LineOut_PrdEntry
  - For cutting stage or LineOut='N': calls PROC_Stock_ProdPieces
  - Skips stock posting for special operations (SplOperation='Y')
  - Sets StockPostingFlg='Y' on Trs_ProdEntry after posting

### SP_Barcode_Production_Posting
- **Purpose:** Batch posts barcode production data to regular Trs_ProdEntry from barcode system
- **Parameters:** @ProdDt, @LotNo, @BarcodeGenID
- **Tables Read:** Pay_Bundle_ProdEntry
- **Tables Written:** Trs_ProdEntry, Trs_ProdEntryQty (via Sp_ProductionEntryQty)
- **Business Rules:** Uses cursor to loop records; calls Sp_ProductionEntryQty for each; transaction-based with rollback

### SP_Vue_PRodStatus (+ _1)
- **Purpose:** Creates production status view from barcode-based production data
- **Parameters:** @DBName
- **Tables Read:** Pay_BarcodeGeneration, Pay_CuttProdMas, Pay_CuttProd_Bundle, Pay_Bundle_IsstoLine, Pay_Pcs_ProdEntry
- **Business Rules:** Aggregates CutPcs, LineFeedPcs, LineOutputPcs, GoodPcs, RejectPcs, ReworkWIP

### SP_Vue_Prod_Consolidate_PCS (+ _Line)
- **Purpose:** Creates production consolidation view from external barcode database
- **Parameters:** @DBName (external database name for cross-DB query)
- **Tables Read:** (external DB) Cutting, Orders, Bundle, BundlePiece, LineIssueEntry, LineIssue, LineOutput, ProductionEntry
- **Business Rules:**
  - Cross-database join using dynamic SQL
  - Counts: LinePcs (feed), LineOutPcs, GoodPcs (last inspection op), RejPcs (EntryType='RJ'), ReworkPcs (EntryType='RK')

### SP_Qry5 (+ _Panel)
- **Purpose:** Production summary by part/stage for an order
- **Parameters:** @Ordid, @StyleNo
- **Tables Read:** Trs_ProdEntry, Trs_ProdEntryQty, Trs_Pcs1, Trs_Pcs2, Trs_PcsGrn1, Trs_PcsGrn2
- **Business Rules:** UNIONs production entry + piece delivery + piece GRN quantities

### SP_ST_Production_Data
- **Purpose:** Production data snapshot for analysis
- **Tables Read:** Trs_ProdEntry, Trs_ProdEntryQty, OrderMas, Mas_JobWrkComp

### ProductionExistQty (+ _1) / PanelProductionExistQty
- **Purpose:** Checks if production entry already exists for a given set of parameters
- **Tables Read:** Trs_ProdEntry, Trs_ProdEntryQty

### SP_BundleBarcode_Check / SP_PcsBarcode_Check
- **Purpose:** Validates barcode data for bundle/piece tracking
- **Tables Read:** Pay_BarcodeGeneration, Pay_CuttProd_Bundle

---

## 9. Module 8 — Dispatch, Delivery & Logistics

### PROC_Stock_PiecesDelivery_Insert (+ _LineStk, _Update, _Update_LineStk)
- **Purpose:** Piece delivery (DC) stock posting — deducts pieces from stock on delivery
- **Parameters:** @Id (delivery ID), @SizeId, @Qty
- **Tables Read:** Trs_Pcs1, Trs_Pcs2, Prod_Sequence, OrderMas2, OrderMas
- **Tables Written:** Pcs_StockTable, Pcs_StockTableQty
- **Business Rules:**
  - ProcessType: 'P' (process DC) / 'R' (return)
  - Lot-wise stock tracking
  - Delivery types: Despatch / Sales / Jobwork Return
  - GRN acceptance for woven orders
  - Buyer-based stock tracking
  - Employee-level stock tracking (LineStk variants)
  - Pack-order (EntryOption=2): multiplies by PcsPerColor

### PROC_Stock_PanelDelivery_Insert (+ _Update)
- **Purpose:** Panel delivery stock posting
- **Parameters:** Similar to PiecesDelivery
- **Tables Written:** Panel_StockTable, Panel_StockTableQty
- **Business Rules:** Same logic as piece delivery but for panel stock

### PROC_Stock_IssueToPrdn_Insert (+ _FINISH, _Delete, _Delete_1, _Delete_1_FINISH, _Delete_FINISH, _Update, _Update_FINISH)
- **Purpose:** Issue-to-production stock posting — transfers pieces from stock to production line
- **Parameters:** @Id, @SizeId, @Qty
- **Tables Read:** Trs_LineInput
- **Tables Written:** Pcs_StockTable, Pcs_StockTableQty
- **Business Rules:** Employee tracking via EMPID; FINISH variants handle finished goods differently

### PROC_Stock_LineTfr_Insert (+ _Delete, _Delete_1, _Update)
- **Purpose:** Line transfer stock — moves pieces between employees on production line
- **Parameters:** @Id, @SizeId, @Qty
- **Tables Read:** Trs_LineTfr
- **Tables Written:** Pcs_StockTable, Pcs_StockTableQty
- **Business Rules:** TOEMPID/EMPID: destination/source employee stock adjustment

### PROC_GodownAck_Insert (+ _Delete)
- **Purpose:** Godown acknowledgment stock posting — confirms receipt at godown
- **Parameters:** @Id, @SizeId, @Qty
- **Tables Read:** Trs_PcsGodAck1, Trs_PcsGodAck2, Trs_Pcs1, Trs_Pcs2
- **Tables Written:** Pcs_StockTable, Pcs_StockTableQty
- **Business Rules:** Links back to original DC; adjusts stock at receiving godown

### PROC_UnitAck_Insert (+ _Delete_2, _Panel_Insert, _Panel_Delete, _Panel_Delete_2)
- **Purpose:** Unit transfer acknowledgment stock — confirms cross-unit transfer receipt
- **Parameters:** @Id, @SizeId, @Qty
- **Tables Read:** Trs_UnitAck1, Trs_UnitAck2, Trs_Pcs1
- **Tables Written:** Pcs_StockTable, Pcs_StockTableQty (or Panel variants)
- **Business Rules:** Panel variants handle panel stock acknowledgments

### PROC_UnitAckLineStk_Insert (+ _Delete)
- **Purpose:** Unit acknowledgment with line-level (employee) stock tracking
- **Tables Written:** Pcs_StockTable, Pcs_StockTableQty

### PROC_Stock_DeliveryPieces_Delete (+ _1, _LineStk, _1_LineStk)
- **Purpose:** Reverses piece delivery stock on DC deletion
- **Business Rules:** Delete variants restore stock; _1 variants are alternate delete logic

### PROC_Stock_DeliveryPanel_Delete (+ _1)
- **Purpose:** Reverses panel delivery stock on DC deletion

### SP_PcsDcPrintQry
- **Purpose:** Piece DC (Delivery Challan) print data — comprehensive join for printing
- **Parameters:** @Id (DC ID)
- **Tables Read:** Trs_Pcs1, Trs_Pcs2, OrderMas, Mas_Party, Mas_Exporter, Mas_Dept, Mas_JobWrkComp, Mas_Size, Mas_Color, Mas_HSN, Mas_Vehicle, Pro_Prod_PartwiseRate
- **Business Rules:** Includes GST details, HSN codes, budget rates, vehicle info, parent concern details

### SP_DEL_PRSRT
- **Purpose:** Creates delivery/process-rate view for DC printing (process deliveries)
- **Parameters:** @Id
- **Tables Read:** Trs_Del1, Trs_Del2, Trs_Grn1, StockTable, OrderMas, Mas_Dept, Mas_Party, Mas_Exporter, Mas_Fabric, Mas_Color, Mas_Count, Mas_Dia, Mas_Vehicle, Mas_Design
- **Business Rules:** Handles TrType: 1=Delivery Challan, 4=Purchase Return, 13=Party Rejection Return

### SP_VUE_DCYARN (+ _REJPCS)
- **Purpose:** Creates yarn DC view / rejected pieces DC view
- **Tables:** Trs_Del1, Trs_Del2, StockTable, Mas_Count, Mas_Color

### sp_iohistoryright (+ panelright, _others)
- **Purpose:** IO history - right side (GRN details) using cursor-based processing
- **Parameters:** @Ipaddr (for session filtering via TempIohisRight)
- **Tables Read:** TempIohisRight (pre-populated temp table)
- **Business Rules:** Cursor-based processing for ordered display of GRN history

### Sp_Pcs2 (+ _LineStk)
- **Purpose:** Piece delivery detail processing (DC creation helper)
- **Tables Written:** Pcs_StockTable, Pcs_StockTableQty

### Sp_PcsGrn2 (+ _GAN)
- **Purpose:** Piece GRN detail processing
- **Tables Written:** Pcs_StockTable, Pcs_StockTableQty

### Sp_PanelGrn2
- **Purpose:** Panel GRN detail processing
- **Tables Written:** Panel_StockTable, Panel_StockTableQty

### Sp_ShipmentSample
- **Purpose:** Shipment sample tracking
- **Tables Read:** Trs_Pcs1, Trs_Pcs2, OrderMas

---

## 10. Module 9 — Accounting, Billing & GST

### SP_SalesInv
- **Purpose:** Sales invoice GST calculation query
- **Parameters:** @Id (delivery ID)
- **Tables Read:** Trs_Del1, Trs_Del2, Trs_Del4, StockTable, Mas_Fabric, Mas_HSN, Mas_Exporter, Mas_Party
- **Business Rules:**
  - State comparison: Exporter.StateId vs Party.StateId
  - Same state → CGST + SGST (rate/2 each)
  - Different state → IGST (full rate)
  - Amount = Kg × Rate (KGS) or Mtr × Rate (MTR) based on UOM
  - HSN-based GST rates with Branded (B) vs Non-Branded (NB) and High/Low unit rate thresholds

### SP_InvQry1
- **Purpose:** Similar to SP_SalesInv with buyer-based state comparison
- **Parameters:** @Id
- **Business Rules:** Same GST logic but compares against buyer's state

### SP_Vue_SalesInvoice (+ _1, _DC, _Domestic, _Pcs)
- **Purpose:** Creates comprehensive sales invoice view
- **Parameters:** @Id
- **Tables Read:** Trs_Salinv, Trs_Del1, Trs_Del2, Trs_Del4, StockTable, OrderMas, SuppOrdMas, Mas_Exporter, Mas_Party, Mas_Buyer, Mas_Fabric, Mas_Count, Mas_Color, Mas_Design, Mas_HSN (multiple aliases), Mas_State, Acc_PO_HSN_Detail, Mas_UOM
- **Business Rules:**
  - Invoice prefix by type: Yarn (Sales_Inv_Yarn_Prefix), Fabric (Sales_Inv_Fabric_Prefix), Accessories (Sales_Inv_Acc_Prefix)
  - Full GST calculation: Rate1 (CGST%), Rate2 (SGST%), Rate3 (IGST%)
  - GSTAmount1 (CGST amt), GSTAmount2 (SGST amt), Amount3 (IGST amt)
  - HSN code resolution: Priority is Trs_Del4.HSNID > StockTable type-specific HSN > Default HSN
  - Supports per-line GST override via Trs_Del4.CGSTper, SGSTper, IGSTper
  - E-Way Bill tracking (EwayBillNo, EwayBillDt)

### SP_BillRegQry
- **Purpose:** Bill register query — returns distinct parties with bills for a given order/dept
- **Parameters:** @OrdId, @DeptId, @Coycode, filters
- **Tables Read:** Trs_Bills, Trs_BillRate, Mas_Party, Mas_Dept, ShippingBill, Trs_ProdBillMasNew, Trs_ProdBillDetNew, Mas_Emp
- **Business Rules:** Uses fnSplitter for multi-value parameters

### SP_BillsRegView_fab1 (+ fab2-5, prd, prd1, prd2, Yarn, acc, cm)
- **Purpose:** Bill register views for different material types
- **Parameters:** @Coycode, @DeptId, @FromDt, @ToDate
- **Tables Read:** Trs_Bills, Trs_BillRate, Mas_Party, Mas_Exporter, Mas_Color, Mas_Dept
- **Business Rules:**
  - fab variants: Fabric bills, Yarn bills
  - prd variants: Production bills (piece-rate) — includes Trs_ProdBillMasNew/DetNew
  - acc: Accessories bills
  - cm: Commercial bills
  - All calculate GST: CG ST/SGST if same state, IGST if different
  - Includes TCS (Tax Collected at Source) amounts

### SP_DEBITQRY (+ _1, _2)
- **Purpose:** Debit note query — sums debit amounts by department with currency conversion
- **Parameters:** @OrdId, @Coycode, @DeptId
- **Tables Read:** Trs_Deb1, Trs_Deb2, Trs_Bills, Trs_BillRate, Trs_Po1, StockTable, Mas_Dept
- **Business Rules:** Currency conversion support for debit values

### SP_Rpt_DebitNote (+ Acc, Fab)
- **Purpose:** Debit note report with date/order/dept/party filtering
- **Parameters:** @Coycode, @FromDate, @ToDate, @OrdId, @DeptId, @PId, @Finyear
- **Tables Read:** Vue_Rpt_DebitNoteYarn (view), fnSplitter
- **Business Rules:** Dynamic SQL with parameterized sp_executesql (prevents SQL injection)

### Sp_AccTransaction
- **Purpose:** Accessories transaction register
- **Tables Read:** Trs_Del1, Trs_Del2, Trs_Grn1, Trs_Grn2, StockTable, Mas_Acc, Mas_AccDes

### Spl_Bills_InvPcs (+ _Supplier)
- **Purpose:** Special billing for invoice pieces
- **Tables Read:** Trs_Bills, Ship_InvDet, OrderMas

### SP_Rpt_accdelaccret
- **Purpose:** Accessories delivery and return report
- **Tables Read:** Trs_Del1, Trs_Del2, StockTable

### SP_Vue_OtherCharge (+ _1)
- **Purpose:** Other charges view for billing
- **Tables Read:** Trs_BillAddded, Mas_AddDed

---

## 11. Module 10 — Costing, Budgeting & Finance

### SP_Bud_and_Actual (+ _1, _2, _StyleWise)
- **Purpose:** Master budget-vs-actual analysis — THE core costing procedure
- **Parameters:** @gblcode, @Guid, @ORDID, @Reqd_TaxInPL, @GPAY
- **Tables Written:** Temp_BudgetAndActual, Temp_BudgetAndActualAbs
- **Tables Read:** Pro_ReqYarn/2, Pro_ReqKnitt/2, Pro_AccReq, Pro_AccBudRate, Trs_Del1/2, Trs_Grn1/2, StockTable, Mas_Dept, Mas_UOM, OrderMas, Pro_Prod_PartwiseRate, Trs_ProdBillMasNew/DetNew
- **Business Rules:**
  - **Yarn Budget:** ReqKgs × Rate (or Manual_BudgetKGs × Rate)
  - **Fabric Budget:** ReqKgs or ReqMtr (based on UOM) × Rate
  - **Accessories Budget:** ReqdQty × BudRate (split Purchase vs Process)
  - **Production Budget:** Stage-wise from Pro_Prod_PartwiseRate
  - **Actual Yarn:** GRN RecKgs × Rate
  - **Actual Fabric:** GRN RecKgs/Mtr × Rate
  - **Actual Accessories:** GRN actual amounts
  - **Actual Production:** Bill amounts per stage
  - Handles partial orders, job orders, commercial expenses
  - GUID-based session isolation for concurrent users
  - _StyleWise: Breaks down by style within order

### SP_BudAndActual_Det (+ _1)
- **Purpose:** Detailed budget vs actual breakdown
- **Parameters:** @OrdId, @Guid
- **Tables:** Same as SP_Bud_and_Actual but with line-item detail

### SP_BudgetQry1 (+ _2)
- **Purpose:** Budget rate queries
- **Parameters:** @OrdId, @StyleNo
- **Tables Read:** Pro_Prod_BitCutRate, Mas_Part
- **Business Rules:** Returns bit/cut rates with part names

### SP_BilltoBeValue (+ _Approx, _Detail)
- **Purpose:** Calculates bill-to-be (outstanding) value for an order
- **Parameters:** @OrdId
- **Tables Read:** Trs_Grn1/2, StockTable, Pro_ReqYarn2, Pro_ReqKnitt2, Trs_Po2, Trs_Del1/2, Trs_MultiPrs_Grn1/2/3, Mas_UOM
- **Business Rules:**
  - Formula: (RecKgs - DeliveredKgs) × Rate for each material type
  - UNION ALL of: Yarn (Y), Fabric (F), Accessories, Multi-process GRN values
  - KGS vs MTR UOM handling

### SP_PcsValue (+ _NEW, _Out)
- **Purpose:** Calculates per-piece value combining fabric, accessories, and production costs
- **Parameters:** @Ordid, @IpAddress
- **Tables Written:** TmpOrderDet
- **Tables Read:** Pro_ReqKnitt, CurrentStock, Trs_Del2, Pro_AccReq, Pro_AccBudRate, Pro_Prod_PartwiseRate, Trs_ProdEntry
- **Business Rules:**
  - Aggregates: Fabric value (cutting grammage × fabric cost), accessories value per piece, production stage costs
  - Complex cursor-based calculation

### SP_Vue_OrderStyleWiseCost
- **Purpose:** Creates order-style-wise cost view aggregating ORDERSTYLEWISECOST table
- **Parameters:** None
- **Tables Read:** ORDERSTYLEWISECOST
- **Business Rules:** Aggregates fabric cost, accessory cost, production cost, commercial cost, profit, shipped values per style

### SP_1 / SP_2_ACC
- **Purpose:** Updates OrderStylewiseCost_Grp budget values from budget abstract or actual views
- **Parameters:** @Ordid, @Formula1 (dept IDs), @GrpID
- **Tables Written:** OrderStylewiseCost_Grp
- **Business Rules:** Dynamic SQL update from VUE_RPT_Budget_Abstract_StyleWise / VUE_RPT_BUDABS_StyleWise

### SP_AccDelivery_stkValue / SP_AccProcessDelivery_stkValue / SP_FabDelivery_stkValue
- **Purpose:** Updates delivery records with stock rate (budget rate) for costing
- **Parameters:** @ID (delivery ID)
- **Tables Written:** Trs_Del2 (StkRate_DC column)
- **Tables Read:** Trs_Del1, Trs_Del2, StockTable, Pro_AccBudRate, Mas_Dept
- **Business Rules:** Looks up budget rate and stamps it on delivery for cost tracking

### Sp_DailyUnitPANDL
- **Purpose:** Daily unit profit & loss calculation
- **Parameters:** @OrdId, @Coycode, @Date, etc.
- **Tables Written:** DailyUnit_P_and_L, DailyUnit_P_And_L_Abs
- **Tables Read:** Trs_ProdEntry, Trs_ProdEntryQty, Bud_InhRateclw / Pro_Prod_PartwiseRate, Trs_ProdWages
- **Business Rules:**
  - Production value = ProdPcs × budget rate (shift-wise)
  - Tracks: shift wages, contractor wages, jobwork amounts, overhead allocation
  - Supports size-wise budget option

### SP_PLFabDet (+ _1) / Sp_DomesticPL
- **Purpose:** P&L fabric detail / Domestic P&L calculation
- **Tables Read:** Pro_ReqKnitt, Trs_Del1/2, Trs_Grn1/2, CurrentStock

### SP_OnePageRpt
- **Purpose:** One-page order summary report combining budget, actual, and variance
- **Tables Read:** Temp_BudgetAndActual, OrderMas, OrderStyleDtl

### SP_Fab_Wise_Program
- **Purpose:** Fabric-wise programming report
- **Tables Read:** Prog_ClrComb, Pro_ReqKnitt, OrderMas

---

## 12. Module 11 — Job Work & Outsourcing

### Supp_PROC_Stock_ProdPieces (+ _Delete, _Update)
- **Purpose:** Supplier order production stock posting — identical structure to PROC_Stock_ProdPieces but for supplier orders
- **Parameters:** @Id, @SizeId, @ProdPcs
- **Tables Read:** Trs_SuppProdentry, Prod_Sequence, OrderStyleDtl, SuppOrdMas, Mas_JobWrkComp, Mas_Dept
- **Tables Written:** SuppPcs_StockTable, SuppPcs_StockTableQty
- **Business Rules:**
  - Mirrors main production stock logic but uses SuppPcs_* tables
  - Links back to main order via SuppOrdMas
  - Handles all the same rework, semi-finished/finished stage, pack-order logic

### SP_ST_Supp_Production_Data
- **Purpose:** Supplier production data snapshot
- **Tables Read:** Trs_SuppProdentry, SuppOrdMas, OrderMas

### Sp_WBS_Supp_Production
- **Purpose:** WBS tracking for supplier production
- **Tables Written:** WBS_Production (supplier section)

### Sp_PartyWiseJobOrderBal
- **Purpose:** Party-wise job order balance report
- **Tables Read:** Trs_Del1, Trs_Del2, Trs_Grn1, Trs_Grn2, Mas_Party, OrderMas

### Sp_UnitWiseJobOrderBal_Reg_Custom (+ _OCR)
- **Purpose:** Unit-wise job order balance register
- **Tables Read:** Trs_Del1, Trs_Del2, Trs_Grn1, Trs_Grn2, Mas_Exporter, OrderMas

### SP_FabReqCalc_Domestic_joborder
- **Purpose:** Fabric requirement calculation for domestic job orders
- **Tables Read:** Pro_ReqKnitt, OrderMas, Mas_Fabric

### Sp_SuppStock
- **Purpose:** Supplier stock query
- **Tables Read:** SuppPcs_StockTable, SuppPcs_StockTableQty

### SP_Update_Job
- **Purpose:** Job order update/maintenance
- **Tables Written:** OrderMas, related tables

### Spl_Bills_InvPcs_Supplier
- **Purpose:** Supplier billing for invoice pieces

---

## 13. Module 12 — Quality, Lab & Approvals

### PROC_Stock_ProdRej_Insert_Finish / _Insert_Line / _Delete_Finish / _Delete_Line
- **Purpose:** Production rejection stock posting
- **Parameters:** @Id, @SizeId, @RejPcs
- **Tables Written:** Pcs_StockTable, Pcs_StockTableQty
- **Business Rules:**
  - GoodPcsFlag='M' (mend/rework) with RejectionTypeId
  - Finish variants: final inspection rejection
  - Line variants: in-line rejection during production

### SP_RegQry1
- **Purpose:** Panel rejection register query
- **Parameters:** @OrdId, @Coycode
- **Tables Read:** Trs_ProdEntry, Panel_StockTableQty, Mas_Color, OrderStyleDtl

### SP_PcsBarcode_Check_Rejection
- **Purpose:** Validates barcode for rejection entry
- **Tables Read:** Pay_BarcodeGeneration, Pay_CuttProd_Bundle, BundlePiece

### SP_Meet_ApprovalDetails
- **Purpose:** Meeting approval status details
- **Tables Read:** WF_WorkFlow_Planning, WF_OperationMaster

---

## 14. Module 13 — HR, Labor & Payroll

### SP_Vue_RptShiftWagesReg
- **Purpose:** Creates shift-wise wages register view
- **Parameters:** @Id
- **Tables Read:** Trs_ProdWages, Trs_ProdEntry, Mas_Emp, Mas_JobWrkComp, OrderMas
- **Business Rules:** Tracks daily wages by shift, employee, department

### Sp_DailyUnitPANDL (Wages Component)
- **Purpose:** Already documented in Costing module — includes labor cost tracking
- **Business Rules:** Shift wages + contractor wages as part of daily P&L calculation

### SP_BillsRegView_prd (Production Bills)
- **Purpose:** Production bill register including piece-rate wages
- **Parameters:** @Coycode, @DeptId, @FromDt, @ToDate
- **Tables Read:** Trs_ProdBillMasNew, Trs_ProdBillDetNew, Trs_prodBillAddded1, Mas_Color, Mas_JobWrkComp, Mas_Dept
- **Business Rules:**
  - ThisBillQty × Rate = GrossAmount
  - Tax percentage from Trs_prodBillAddded1 (codes 40,41,42)
  - PassFlg for bill approval status

---

## 15. Module 14 — Reporting, Analytics & Integrations

### Meeting/MIS Dashboard

#### MeetingChartAllDept
- **Purpose:** Meeting dashboard chart — yesterday's department-wise order status
- **Parameters:** @OrdId, @Type ('S'=Start, 'E'=End)
- **Tables Read:** Trs_Schedule, Mas_Dept
- **Business Rules:** Counts OnTime/Delayed/NotStarted per department

#### MeetingReportChart
- **Purpose:** Meeting report chart with trend data
- **Tables Read:** Trs_Schedule, WF_WorkFlow_Planning

#### MeetAccDetails
- **Purpose:** Meeting accessories detail report — comprehensive accessories status
- **Parameters:** @Ordid, @Style, @Type
- **Tables Read:** PRO_AccReq, Trs_Po1/2, Trs_Grn1/2, Trs_Del1/2, CurrentStock, Trs_Opening, Mas_Acc, Mas_AccDes, Mas_Color, Mas_Size
- **Business Rules:** Shows: Req_Qty, ShortQty, PO_Qty, GRN_Qty, DC_Qty, DC_Ret, GRN_Ret, Stock, Trs_Out, Trs_In, PO_Cancel

#### Meet_Accessories
- **Purpose:** Simplified meeting accessories summary
- **Tables Read:** PRO_AccReq, Trs_Po1, Trs_Grn2, CurrentStock

#### selectMeetingDept
- **Purpose:** Returns departments for meeting selection
- **Tables Read:** Mas_Dept, WF_OperationMaster

#### UpdateMeeting_Posting
- **Purpose:** Updates meeting posting status flags
- **Tables Written:** Trs_Schedule

### WBS (Work Breakdown Structure)

#### SP_WBS_MeetingView
- **Purpose:** Meeting review dashboard from workflow planning
- **Parameters:** @OrdId
- **Tables Read:** WF_WorkFlow_Planning, WF_OperationMaster, WF_UserMas, OrderMas
- **Business Rules:**
  - Status tracking: NOT YET STARTED, STARTED, FINISHED
  - Start/Finish analysis: ON BEFORE, ON TIME, ON DELAY, ON DUE, UPCOMING
  - Color coding for visual dashboard
  - Finish percentage calculation

#### Sp_WBS_Production (+ _DateWise)
- **Purpose:** WBS production tracking — inserts/updates production quantities
- **Parameters:** @OrdId, @StyleNo
- **Tables Written:** WBS_Production
- **Tables Read:** Trs_ProdEntry, Trs_Pcs1, Trs_PcsGrn1
- **Business Rules:** Updates plan/actual dates, finish percentages, DC/production quantities

#### Sp_WBS_Line_Production
- **Purpose:** WBS line-level production tracking
- **Tables Written:** WBS_Production (line detail section)

### Material Tracking Reports

#### sp_yarndet
- **Purpose:** Comprehensive yarn detail report for an order/department
- **Parameters:** @Ordid, @Dept
- **Tables Read:** Pro_ReqYarn, Trs_Grn1/2, Trs_Del1/2, Trs_Opening, CurrentStock, StockTable, Mas_Count, Mas_Color
- **Business Rules:** UNION ALL of: ReqKgs, PurchaseGRN, ProcessGRN, TransferIn, TransferOut, Opening, Stock, Issue, IssueReturn

#### sp_fabricdet
- **Purpose:** Comprehensive fabric detail report for an order/department
- **Parameters:** @Ordid, @Dept
- **Tables Read:** Pro_ReqKnitt, Trs_Grn1/2, Trs_Del1/2, Trs_Opening, CurrentStock, StockTable, Mas_Fabric, Mas_Color
- **Business Rules:** Same UNION ALL pattern as sp_yarndet but adds: PrsDC, PrsReturn, Re-process DC/GRN/Balance, CutReturn, IssueReturn

#### sp_knitdetail
- **Purpose:** Knitting detail report — similar to fabricdet but with design description grouping
- **Parameters:** @Ordid, @Dept
- **Tables Read:** Same as sp_fabricdet plus Mas_Design

#### sp_ydye
- **Purpose:** Yarn dye detail report

### Order/Stock Reports

#### Proc_Rpt_OCR_Summary (+ _CLR, _Woven, _CLR_Woven)
- **Purpose:** Order Completion Report (OCR) summary
- **Tables Read:** OrderMas, OrderQtyDtl, Trs_ProdEntry, Trs_Pcs1, Trs_PcsGrn1
- **Business Rules:** CLR variants include color-wise breakdown; Woven variants for woven (non-knit) orders

#### SP_RegQry2/3/4 (+ _Prod)
- **Purpose:** Various register queries
  - RegQry2: Delivery register
  - RegQry3: GRN register
  - RegQry4: Stock movement register
  - RegQry4Prod: Production register

#### SP_Rpt_AccStockItemLedger
- **Purpose:** Accessories stock item ledger
- **Tables Read:** CurrentStock, StockTable, Trs_Del1/2, Trs_Grn1/2, Mas_Acc, Mas_AccDes

#### SP_Rpt_AccToDoIssProdUnit
- **Purpose:** Accessories to-do/issue/production/unit report

#### Sp_Rpt_StkFab
- **Purpose:** Fabric stock report
- **Tables Read:** CurrentStock, StockTable, Mas_Fabric

#### SP_Vue_Rpt_OverallProduction_Det
- **Purpose:** Overall production detail view
- **Tables Read:** Trs_ProdEntry, Trs_ProdEntryQty, OrderMas, Mas_JobWrkComp

### Shipment & Export

#### SP_Rpt_OrderRegColor
- **Purpose:** Order register with color-wise breakdown for shipping
- **Tables Read:** OrderMas, OrderQtyDtl, Mas_Color, Mas_Size

#### Sp_MR_OrdInHand / Sp_MR_Style
- **Purpose:** MIS report — order-in-hand and style-wise summary

### Miscellaneous Query Procedures

#### SP_Qry6
- **Purpose:** Total received quantities (GRN + Multi-process GRN + Process Return) for a DC
- **Parameters:** @DCID, @Coycode, @DeptId
- **Tables Read:** Trs_GRN1/2, Trs_MultiPrs_Grn1/2/3, StockTable

#### SP_Qry9-SP_Qry38
- **Purpose:** Various helper queries used by forms
  - **SP_Qry10:** Total invoice amount (Qty × Rate × ExRate)
  - **SP_Qry11/11_1:** Style/order lookup queries
  - **SP_Qry12:** GRN detail lookup
  - **SP_Qry13:** PO detail lookup
  - **SP_Qry14:** Stock transfer lookup
  - **SP_Qry15:** Accessories requirement with shade/lab dip details
  - **SP_Qry16-38:** Various form-level data queries

#### SP_FindReqData (+ _1, _2)
- **Purpose:** Finds requirement data for fabric/yarn/accessories
- **Tables Read:** Pro_ReqKnitt, Pro_ReqYarn, Pro_AccReq

#### SP_PartwiseRequirement
- **Purpose:** Part-wise material requirement calculation
- **Tables Read:** Pro_ReqKnitt, Pro_ReqYarn, Order_PartDtl

#### Sp_maillist1
- **Purpose:** Generates mailing list data
- **Tables Read:** Mas_Party, Mas_Buyer

#### SP_Rpt_SupplierOrderReg
- **Purpose:** Supplier order register report
- **Tables Read:** SuppOrdMas, SuppOrdDet, OrderMas

#### Sp_BIStockRpt
- **Purpose:** Stock report with branch/inter-unit detail

#### sp_Collar
- **Purpose:** Collar specification query for production planning

---

## 16. Cross-Module Patterns

### Stock Posting Architecture

All stock modifications follow a consistent Insert/Update/Delete pattern:

```
Transaction Entry (Form)
  → Sp_ProductionEntryQty_* (Orchestrator)
    → PROC_Stock_* (Stock Poster)
      → Pcs_StockTable / Panel_StockTable / CurrentStock (Stock Tables)
```

**Insert**: Creates stock record (or updates if exists) — upsert pattern
**Update**: Adjusts quantities when transaction is modified (new - old)
**Delete**: Reverses the stock impact (subtracts what was added)
**Delete_1**: Alternative delete logic for certain edge cases

### GST Calculation Pattern

Used consistently across all invoice/billing procedures:

```sql
IF Exporter.StateId = Party.StateId
  → CGST = Amount × (HSN.Rate / 2) / 100
  → SGST = Amount × (HSN.Rate / 2) / 100
  → IGST = 0
ELSE
  → CGST = 0
  → SGST = 0
  → IGST = Amount × HSN.Rate / 100
```

Additional HSN logic:
- Branded vs Non-Branded (BrandedFlag) → different rate slabs
- Unit rate threshold → High vs Low rate slab
- Per-line GST override via Trs_Del4.CGSTper/SGSTper/IGSTper

### GUID-Based Session Isolation

Budget and report procedures use @Guid parameter for concurrent multi-user access:
```sql
DELETE FROM Temp_Table WHERE Guid = @Guid
INSERT INTO Temp_Table ... Guid = @Guid
-- User reads from: WHERE Guid = @Guid
```

### Dynamic View Creation

Many SP_Vue_* procedures dynamically ALTER VIEW:
```sql
SET @sql = 'ALTER VIEW ViewName AS SELECT ...'
EXEC sp_executesql @sql
```
This allows runtime parameterization of views that standard SQL views don't support.

### fnSplitter Pattern

Universal comma-separated ID handling:
```sql
WHERE OrdId IN (SELECT ID FROM fnSplitter(@OrdId))
```
Used in virtually every report/query procedure for multi-select filters.

---

## 17. Key Tables Reference

### Transaction Tables (Trs_*)

| Table | Purpose | Module |
|-------|---------|--------|
| Trs_ProdEntry / Trs_ProdEntryQty | Production entries | Production |
| Trs_Pcs1 / Trs_Pcs2 | Piece DC (Delivery Challan) | Dispatch |
| Trs_PcsGrn1 / Trs_PcsGrn2 | Piece GRN (Goods Receipt) | Dispatch |
| Trs_Del1 / Trs_Del2 / Trs_Del3 / Trs_Del4 | Material Delivery | Dispatch |
| Trs_Grn1 / Trs_Grn2 | Material GRN | Procurement |
| Trs_MultiPrs_Grn1/2/3 | Multi-process GRN | Procurement |
| Trs_Bills / Trs_BillRate / Trs_BillAddded | Bills & Billing | Accounting |
| Trs_Deb1 / Trs_Deb2 | Debit Notes | Accounting |
| Trs_Salinv | Sales Invoices | Accounting |
| Trs_Po1 / Trs_Po2 | Purchase Orders | Procurement |
| Trs_Opening | Opening Stock | Inventory |
| Trs_LineInput | Line Input (Issue to Production) | Production |
| Trs_LineTfr | Line Transfer | Production |
| Trs_PcsGodAck1/2 | Godown Acknowledgment | Dispatch |
| Trs_UnitAck1/2 | Unit Transfer Acknowledgment | Dispatch |
| Trs_Schedule | Production Schedule | Planning |
| Trs_ProdWages | Production Wages | HR/Payroll |
| Trs_ProdBillMasNew / Trs_ProdBillDetNew | Production Bills | Accounting |
| Trs_StyleChangeLog | Style Change Audit Log | Config |
| Trs_SuppProdentry | Supplier Production Entry | Job Work |

### Stock Tables

| Table | Purpose |
|-------|---------|
| CurrentStock | Current material stock (Yarn/Fabric/Accessories) |
| CurrentStock_RollDtl | Roll-level fabric stock detail |
| StockTable | Stock item master (material properties) |
| Pcs_StockTable / Pcs_StockTableQty | Piece goods stock (by stage/part/godown) |
| Panel_StockTable / Panel_StockTableQty | Panel stock |
| SuppPcs_StockTable / SuppPcs_StockTableQty | Supplier piece stock |

### Planning/Budget Tables (Pro_*)

| Table | Purpose |
|-------|---------|
| Pro_ReqYarn / Pro_ReqYarn2 | Yarn requirements & rates |
| Pro_ReqKnitt / Pro_ReqKnitt2 | Fabric/Knitting requirements & rates |
| Pro_AccReq | Accessories requirements |
| Pro_AccBudRate | Accessories budget rates |
| Pro_Prod_PartwiseRate | Part-wise production rates |
| Pro_Prod_BitCutRate | Bit/cut rate for production costing |
| Pro_RateCnfPcs1/2 | Rate confirmation (quotations) |
| Prod_Sequence | Production stage sequence |
| Prog_ClrComb / Prog_Cns / Prog_Component | Program (cutting plan) details |

### Order Tables

| Table | Purpose |
|-------|---------|
| OrderMas / OrderMas2 | Order master |
| OrderStyleDtl | Order style details |
| OrderQtyDtl | Order quantity details (EntryOption=1) |
| OrdQtyClrDtl | Order qty color details (EntryOption=2) |
| OrdSizeMas | Order size master |
| Order_PartDtl | Order part details |
| OrderStylewiseCost | Style-wise cost accumulator |
| OrderStylewiseCost_Grp | Grouped cost summary |
| SuppOrdMas / SuppOrdDet | Supplier order master/detail |

### Summary/Snapshot Tables (ST_*)

| Table | Purpose |
|-------|---------|
| ST_PartyBalance_Abs | Party balance (PO vs GRN tracking) |
| ST_Acc_PartyBal_Abs | Accessories party balance |
| ST_ProgBalance_Fabric | Program fabric balance (ready-to-cut) |
| DailyUnit_P_and_L / DailyUnit_P_And_L_Abs | Daily P&L snapshots |
| Temp_BudgetAndActual / Temp_BudgetAndActualAbs | Budget vs Actual temp tables |
| WBS_Production | WBS production tracking |
| TmpOrderDet | Temporary order detail for PcsValue calculation |

### Workflow/Meeting Tables (WF_*)

| Table | Purpose |
|-------|---------|
| WF_WorkFlow_Planning | Workflow planning entries |
| WF_OperationMaster | Operation definitions |
| WF_UserMas | Workflow user assignments |

### Barcode/Shop Floor Tables (Pay_*)

| Table | Purpose |
|-------|---------|
| Pay_BarcodeGeneration | Barcode generation master |
| Pay_CuttProdMas / Pay_CuttProd_Bundle | Cutting production & bundles |
| Pay_Bundle_IsstoLine | Bundle issue to line |
| Pay_Pcs_ProdEntry | Piece production entry (barcode) |
| Pay_Bundle_ProdEntry | Bundle production entry (barcode) |

---

*End of Stored Procedures Analysis*
