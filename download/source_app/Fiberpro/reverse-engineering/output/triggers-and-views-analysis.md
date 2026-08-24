# FiberPro — Triggers, Views & Functions Analysis

> **Generated**: 2025-07-17
> **Source Files**: SPTriggers/*.sql, SPTriggers/SPViews/*.sql, SPTriggers/SPViews/Updated/*.sql, SPFunction/*.sql
> **Total Objects**: 57 Triggers · 20 Views · 4 Scalar Functions

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Functions (4)](#2-functions)
3. [Triggers — Master Data Sync (25)](#3-triggers--master-data-sync)
4. [Triggers — Summary Table Sync (15)](#4-triggers--summary-table-sync)
5. [Triggers — Fabric Balance Maintenance (5)](#5-triggers--fabric-balance-maintenance)
6. [Triggers — Yarn Balance Maintenance (5)](#6-triggers--yarn-balance-maintenance)
7. [Triggers — WBS Production (3)](#7-triggers--wbs-production)
8. [Triggers — Stock Rate Posting (1)](#8-triggers--stock-rate-posting)
9. [Triggers — Audit & Special (3)](#9-triggers--audit--special)
10. [Views — Transaction Registers (8)](#10-views--transaction-registers)
11. [Views — Stock & Balance (5)](#11-views--stock--balance)
12. [Views — Financial & GST (3)](#12-views--financial--gst)
13. [Views — Quality & Multi-Process (2)](#13-views--quality--multi-process)
14. [Views — Program Balance Detail (2)](#14-views--program-balance-detail)
15. [Cross-Reference: Trigger → View Dependencies](#15-cross-reference-trigger--view-dependencies)
16. [Module Mapping](#16-module-mapping)

---

## 1. Executive Summary

FiberPro's SQL Server database uses **57 triggers**, **20 views**, and **4 scalar functions** to enforce business rules, maintain denormalized summary tables, and expose derived reporting data.

### Key Architectural Patterns

| Pattern | Count | Purpose |
|---------|-------|---------|
| **UpdateFlg Sync** | 40 | Multi-server replication flag — sets `UpdateFlg=1` on any data change (excluding `server_id` and `UpdateFlg` column changes) to signal external sync processes |
| **Balance Maintenance** | 10 | Automatically maintains `ST_ProgBalance_Fabric` and `ST_ProgBalance_Yarn` summary tables when delivery/GRN/ready-to-cut transactions change |
| **Cumulative Rate Cascading** | 1 | The `Tgr_StockRatePost` trigger cascades bill rates through the entire department processing chain when any rate changes |
| **UNION ALL Reporting Views** | 15 | Views that aggregate data from multiple transaction tables via UNION ALL to provide unified reporting surfaces |
| **Audit Capture** | 2 | Hostname/IP tracking on sensitive party balance tables |

### Integrity Rules Enforced by Triggers

- **No infinite sync loops**: All sync triggers check `IF NOT (UPDATE(server_id) OR UPDATE(UpdateFlg))` before setting the flag
- **Cumulative cost integrity**: Rate changes propagate through the entire department chain automatically
- **Balance consistency**: Fabric/yarn balances in summary tables stay in sync with underlying transactions (INSERT, UPDATE, DELETE all handled)
- **Replication readiness**: Every master and summary table has an UpdateFlg trigger for cross-server data synchronization

---

## 2. Functions

### 2.1 DSP_NumericToRupees

| Attribute | Value |
|-----------|-------|
| **File** | `SPFunction/DSP_NumericToRupees.sql` |
| **Type** | Scalar Function |
| **Returns** | `VARCHAR(2000)` |
| **Module** | Accounting / Billing |

**Parameters**:
- `@RUPEES DECIMAL(30,2)` — Amount to convert
- `@fcyID INT` — Foreign currency ID (looks up `Mas_Fcy.Denominator` for currency name)

**Algorithm**: Converts a decimal amount to Indian rupee words using the Crore/Lakh/Thousand system.
1. Separates integer part from paise (2 decimal places)
2. Decomposes integer into: Crore → Lakh → Thousand → Hundred → Tens → Units
3. For Crore amounts, delegates to `NumberToWordsNew()` (Western number system)
4. Handles Lakh/Thousand/Hundred groups with Indian names
5. Appends paise if non-zero
6. Looks up currency denomination from `Mas_Fcy` table
7. Returns `UPPER(@WORD + ' ONLY')`

**Tables Referenced**: `Mas_Fcy` (foreign currency master)

---

### 2.2 NumberToWordsNew

| Attribute | Value |
|-----------|-------|
| **File** | `SPFunction/NumberToWordsNew.sql` |
| **Type** | Scalar Function |
| **Returns** | `VARCHAR(2000)` |
| **Module** | Accounting / Billing |

**Parameters**:
- `@intNumberValue INTEGER` — Integer to convert

**Algorithm**: Converts an integer to English words using the Western number system (Thousand / Million / Billion). Processes number in groups of three digits (hundreds/tens/units) from right to left, building the word string in reverse order then prepending each group.

**Tables Referenced**: None (pure computation)

---

### 2.3 getLotNo

| Attribute | Value |
|-----------|-------|
| **File** | `SPFunction/getLotNo.sql` |
| **Type** | Scalar Function |
| **Returns** | `INT` |
| **Module** | Inventory / Warehouse |

**Parameters**:
- `@s VARCHAR(50)` — Alphanumeric lot number string

**Algorithm**: Extracts the first contiguous numeric portion from a mixed alphanumeric lot number string using `PATINDEX` to locate digit positions. Used for sorting lot numbers numerically.

**Tables Referenced**: None (pure computation)

---

### 2.4 WF_PlanFinishDateArrival

| Attribute | Value |
|-----------|-------|
| **File** | `SPFunction/WF_PlanFinishDateArrival.sql` |
| **Type** | Scalar Function |
| **Returns** | `DATETIME` |
| **Module** | Production / Planning |

**Parameters**:
- `@Date DATETIME` — Start date
- `@Days INT` — Number of working days to add
- `@flg CHAR(1)` — Direction: `'F'` = forward, else backward

**Algorithm**: Calculates a plan finish date by adding N working days to a start date, skipping:
- Weekly offs (day 1 = Sunday, using `DATEPART(dw, @Date) = 1`)
- Government holidays (from `GovtHolidays` table)

Iterates day-by-day, decrementing the counter only on valid working days until the count reaches zero.

**Tables Referenced**: `GovtHolidays`

---

## 3. Triggers — Master Data Sync

All 25 triggers in this category follow an **identical pattern**:

```
AFTER UPDATE → IF NOT (UPDATE(server_id) OR UPDATE(UpdateFlg))
  → UPDATE [table] SET UpdateFlg = 1 WHERE [PK] IN (SELECT [PK] FROM INSERTED)
```

**Purpose**: Flag records as modified so an external synchronization process can replicate changes to other database servers. The guard clause prevents infinite loops when the sync process itself updates the record.

| # | Trigger Name | Table | Primary Key | File |
|---|-------------|-------|-------------|------|
| 1 | Trg_Mas_Acc_Update | Mas_Acc | ID | Trg_Mas_Acc_Update.sql |
| 2 | Trg_Mas_AccCategory_Update | Mas_AccCategory | ID | Trg_Mas_AccCategory_Update.sql |
| 3 | Trg_Mas_AccDes_Update | Mas_AccDes | ID | Trg_Mas_AccDes_Update.sql |
| 4 | Trg_Mas_Buyer_Update | Mas_Buyer | BuyerID | Trg_Mas_Buyer_Update.sql |
| 5 | Trg_Mas_BuyerDept_Update | Mas_BuyerDept | ID | Trg_Mas_BuyerDept_Update.sql |
| 6 | Trg_Mas_Color_Update | Mas_Color | ColID | Trg_Mas_Color_Update.sql |
| 7 | Trg_Mas_Component_Update | Mas_Component | CompID | Trg_Mas_Component_Update.sql |
| 8 | Trg_Mas_Count_Update | Mas_Count | CountID | Trg_Mas_Count_Update.sql |
| 9 | Trg_Mas_Dept_Update | Mas_Dept | DeptID | Trg_Mas_Dept_Update.sql |
| 10 | Trg_Mas_Design_Update | Mas_Design | DesignId | Trg_Mas_Design_Update.sql |
| 11 | Trg_Mas_Dia_Update | Mas_Dia | DiaID | Trg_Mas_Dia_Update.sql |
| 12 | Trg_Mas_Emp_Update | Mas_Emp | EmpId | Trg_Mas_Emp_Update.sql |
| 13 | Trg_Mas_Fabric_Update | Mas_Fabric | FabID | Trg_Mas_Fabric_Update.sql |
| 14 | Trg_Mas_Fcy_Update | Mas_Fcy | FCY_Id | Trg_Mas_Fcy_Update.sql |
| 15 | Trg_Mas_JobWrkComp_Update | Mas_JobWrkComp | Id | Trg_Mas_JobWrkComp_Update.sql |
| 16 | Trg_Mas_Lot_Update | Mas_Lot | ID | Trg_Mas_Lot_Update.sql |
| 17 | Trg_Mas_Merchandiser_Update | Mas_Merchandiser | ID | Trg_Mas_Merchandiser_Update.sql |
| 18 | Trg_Mas_Part_Update | Mas_Part | PartID | Trg_Mas_Part_Update.sql |
| 19 | Trg_Mas_Party_Update | Mas_Party | PID | Trg_Mas_Party_Update.sql |
| 20 | Trg_Mas_Season_Update | Mas_Season | SeasID | Trg_Mas_Season_Update.sql |
| 21 | Trg_Mas_Size_Update | Mas_Size | SizeID | Trg_Mas_Size_Update.sql |
| 22 | Trg_Mas_SizeGroup_Update | Mas_SizeGroup | ID | Trg_Mas_SizeGroup_Update.sql |
| 23 | Trg_Mas_StyleDesc_Update | Mas_StyleDesc | ID | Trg_Mas_StyleDesc_Update.sql |
| 24 | Trg_Mas_Stylegroup_Update | Mas_StyleGroup | ID | Trg_Mas_Stylegroup_Update.sql |
| 25 | Trg_Mas_UOM_Update | Mas_UOM | UomID | Trg_Mas_UOM_Update.sql |

**Special Notes**:
- `Trg_Mas_Emp_Update` additionally excludes `UPDATE(EMP_SERVER_ID)` from triggering the flag
- `Trg_OrderStyleImgDtl_Update` is a duplicate of `Trg_Mas_Part_Update` (same content, targets `Mas_Part`) — naming anomaly

---

## 4. Triggers — Summary Table Sync

These triggers also use the **UpdateFlg pattern** but operate on summary/aggregate tables with **composite primary keys**.

### 4.1 Non-Transactional Summary Tables

| # | Trigger Name | Table | Composite Key | Event | File |
|---|-------------|-------|---------------|-------|------|
| 1 | Trg_CurrentStock_Update | CurrentStock | StockID | AFTER UPDATE | Trg_CurrentStock_Update.sql |
| 2 | Trg_Finyear_Update | FinanceYear | ID | AFTER UPDATE | Trg_Finyear_Update.sql |
| 3 | Trg_MR_ProcessDetails_Update | MR_ProcessDetails | OrdID+StyleNo+DeptID+ColID+DesignID | AFTER UPDATE | Trg_MR_ProcessDetails_Update.sql |

### 4.2 Summary Balance Tables (UpdateFlg)

| # | Trigger Name | Table | Composite Key | Special Behavior |
|---|-------------|-------|---------------|-----------------|
| 4 | Trg_ST_Acc_PartyBal_Abs_Update | ST_Acc_PartyBal_Abs | OrdID+StyleNo+DeptID+PartyID+ID | Standard UpdateFlg |
| 5 | Trg_ST_Acc_Prog_Balance_Update | ST_Acc_Prog_Balance | OrdID+StyleNo+AType+ACol+ASize | Standard UpdateFlg |
| 6 | Trg_ST_Acc_Prog_Balance_Update_Actual | ST_Acc_Prog_Balance | OrdID+StyleNo+AType+ACol+ASize | Sets `ActualPosting_UpdateFlg=1` when `actstartdate` or `actfinishdate` changes |
| 7 | Trg_ST_Cost_Dept | ST_Cost_Dept | Dt+unit_id+dept_id+line_id | Fires on `budget_value` or `actual_value` changes |
| 8 | Trg_ST_Cost_Factory | ST_Cost_Factory | Dt+unit_id | Standard UpdateFlg |
| 9 | Trg_ST_Cost_OrderDtl | ST_Cost_OrderDtl | Dt+unit_id+dept_id+line_id+Order_ID+Styleno | Standard UpdateFlg |
| 10 | Trg_ST_DailyCostingInputData | ST_DailyCostingInputData | (full row key) | Standard UpdateFlg |
| 11 | Trg_ST_Ord_inHand_Update | ST_Ord_inHand | OrdID+StyleNo | Standard UpdateFlg |
| 12 | Trg_ST_PartyBalance_Abs_Update | ST_PartyBalance_Abs | (composite key) | Standard UpdateFlg |
| 13 | Trg_ST_ProdRequirement_Update | ST_ProdRequirement | OrdId+StyleNo+WrkId+DeptId+PartId | Standard UpdateFlg |
| 14 | Trg_ST_Production_Data_Update | ST_Production_Data | Coycode+OrdID+StyleNo+StageId+PartID+ColID+SizeID | Standard UpdateFlg |

### 4.3 Program Balance Tables (UpdateFlg + ActualPosting)

| # | Trigger Name | Table | Composite Key | Special Behavior |
|---|-------------|-------|---------------|-----------------|
| 15 | Trg_ST_ProgBalance_Fabric_Update | ST_ProgBalance_Fabric | OrdID+StyleNo+DeptID+FabID+ColID+DiaID+CntID+SubPrsID+Coycode | Standard UpdateFlg |
| 16 | Trg_ST_ProgBalance_Fabric_Update_Actual | ST_ProgBalance_Fabric | (same 9-field key) | Sets `ActualPosting_UpdateFlg=1`; Dept 4 (Knitting) also sets via `inserted.DeptID=4` special handling |
| 17 | Trg_ST_ProgBalance_Yarn_Update | ST_ProgBalance_Yarn | OrdID+DeptID+CountID+ColID | Standard UpdateFlg |
| 18 | Trg_ST_ProgBalance_Yarn_Update_Actual | ST_ProgBalance_Yarn | (same key) | Sets `ActualPosting_UpdateFlg=1` on actual date changes |

---

## 5. Triggers — Fabric Balance Maintenance

These triggers **directly modify** `ST_ProgBalance_Fabric` aggregates when delivery/receipt transactions are inserted, updated, or deleted. They are the most business-critical triggers for fabric inventory accuracy.

### 5.1 TRG_FAB_BALANCE_DEL

| Attribute | Value |
|-----------|-------|
| **Table** | `Trs_Del2` (Delivery detail) |
| **Event** | AFTER INSERT, UPDATE |
| **File** | TRG_FAB_BALANCE_DEL.sql |
| **Module** | Inventory / Dispatch |

**Logic**:
1. Joins `INSERTED` with `Trs_Del1` (header), `StockTable`, and `Trs_Del2` (for aggregation)
2. Filters: `YF='F'` (Fabric), `TrType IN (1,17)` (Process DC or Transfer DC), `Dept IN fabric depts`
3. **Department 8 (Dyeing)**: Uses `DyeColId` from `Trs_Del1` instead of StockTable color; groups by dye color
4. **Department 10 (Printing)**: Uses `DesignId` from `Trs_Del1`; groups by design
5. **Reprocess tracking**: If `ReProcess='Y'`, updates `ReProcessDCKgs`/`ReProcessDCMtrs` instead of `DcKgs`/`DCMtr`
6. **SubProcess support**: Groups by `SubPrsID` for multi-subprocess handling
7. Updates `ST_ProgBalance_Fabric` with aggregated `DcKgs`, `DCMtr`

### 5.2 TRG_FAB_BALANCE_RCUT

| Attribute | Value |
|-----------|-------|
| **Table** | `Trs_ReadyToCut2` |
| **Event** | AFTER INSERT, UPDATE |
| **File** | TRG_FAB_BALANCE_RCUT.sql |

**Logic**: Updates `ST_ProgBalance_Fabric` with `DcKgs`/`DCMtr` (for TrType=20 ready-to-cut) AND `GRNKgs`/`GRNMtr` (receipt side of ready-to-cut). Uses cursor for row-by-row processing.

### 5.3 TRG_FAB_BALANCE_RCUT_DEL

| Attribute | Value |
|-----------|-------|
| **Table** | `Trs_ReadyToCut2` |
| **Event** | AFTER DELETE |
| **File** | TRG_FAB_BALANCE_RCUT_DEL.sql |

**Logic**: Decrements `DcKgs`/`DCMtr` and `GRNKgs`/`GRNMtr` in `ST_ProgBalance_Fabric` using values from `DELETED` rows via cursor.

### 5.4 TRG_FAB_BALANCE_RCUT_RET

| Attribute | Value |
|-----------|-------|
| **Table** | `Trs_ReadyToCut_Ret2` |
| **Event** | AFTER INSERT, UPDATE |
| **File** | TRG_FAB_BALANCE_RCUT_RET.sql |

**Logic**: Updates `ReturnKgs`/`ReturnMtrs` in `ST_ProgBalance_Fabric` when ready-to-cut returns are recorded.

### 5.5 TRG_FAB_BALANCE_RCUT_RET_DEL

| Attribute | Value |
|-----------|-------|
| **Table** | `Trs_ReadyToCut_Ret2` |
| **Event** | AFTER DELETE |
| **File** | TRG_FAB_BALANCE_RCUT_RET_DEL.sql |

**Logic**: Decrements `ReturnKgs`/`ReturnMtrs` in `ST_ProgBalance_Fabric` from `DELETED` rows.

### Fabric Balance Trigger Summary

```
Trs_Del2 (Fabric Process DC)
  ├── INSERT/UPDATE → TRG_FAB_BALANCE_DEL → ST_ProgBalance_Fabric.DcKgs/DCMtr
  └── (no DELETE trigger for Trs_Del2 fabric)

Trs_ReadyToCut2
  ├── INSERT/UPDATE → TRG_FAB_BALANCE_RCUT → ST_ProgBalance_Fabric.DcKgs/DCMtr + GRNKgs/GRNMtr
  └── DELETE → TRG_FAB_BALANCE_RCUT_DEL → decrements same fields

Trs_ReadyToCut_Ret2
  ├── INSERT/UPDATE → TRG_FAB_BALANCE_RCUT_RET → ST_ProgBalance_Fabric.ReturnKgs/ReturnMtrs
  └── DELETE → TRG_FAB_BALANCE_RCUT_RET_DEL → decrements same fields
```

---

## 6. Triggers — Yarn Balance Maintenance

These triggers maintain `ST_ProgBalance_Yarn` aggregates for yarn inventory tracking.

### 6.1 TRG_YARN_BALANCE_DEL

| Attribute | Value |
|-----------|-------|
| **Table** | `Trs_Del2` (Delivery detail) |
| **Event** | AFTER INSERT, UPDATE |
| **File** | TRG_YARN_BALANCE_DEL.sql |

**Logic**:
1. Aggregates yarn deliveries where `YF='Y'`: process issues (`TrType=1`) and sales DCs (`TrType=2`)
2. Joins with `StockTable` to get `Dept`, `CntID`, `ColID`
3. Updates `ST_ProgBalance_Yarn.DcKgs` with aggregated quantities

### 6.2 TRG_YARN_BALANCE_DELKNIT

| Attribute | Value |
|-----------|-------|
| **Table** | `Trs_Del3` (Knit delivery detail) |
| **Event** | AFTER INSERT, UPDATE |
| **File** | TRG_YARN_BALANCE_DELKNIT.sql |

**Logic**: Updates `ST_ProgBalance_Yarn` for knit deliveries using the `Prog` field from `Trs_Del3`. Tracks knitting consumption separately.

### 6.3 TRG_YARN_BALANCE_DELYARN_DEL

| Attribute | Value |
|-----------|-------|
| **Table** | `Trs_Del3` |
| **Event** | AFTER DELETE |
| **File** | TRG_YARN_BALANCE_DELYARN_DEL.sql |

**Logic**: Decrements `DcKgs` in `ST_ProgBalance_Yarn` when knit delivery records are deleted.

### 6.4 TRG_YARN_BALANCE_DEL_DEL

| Attribute | Value |
|-----------|-------|
| **Table** | `Trs_Del2` |
| **Event** | AFTER DELETE |
| **File** | TRG_YARN_BALANCE_DEL_DEL.sql |

**Logic**: Decrements `DcKgs` in `ST_ProgBalance_Yarn` when yarn delivery records are deleted. Handles both PO-based deletions (`pokgs>0`) and non-PO deletions separately.

### 6.5 TRG_YARN_BALANCE_GRN_DEL

| Attribute | Value |
|-----------|-------|
| **Table** | `Trs_GRN2` |
| **Event** | AFTER DELETE |
| **File** | TRG_YARN_BALANCE_GRN_DEL.sql |

**Logic**:
1. Decrements `GrnKgs` in `ST_ProgBalance_Yarn` when GRN records are deleted
2. Recalculates `ReqBalanceKgs = ReqKgs - (GrnKgs + TransInKgs - DelRetKgs - TransOutKgs)`
3. Only for yarn departments (`OutputType='Y'`)

### Yarn Balance Trigger Summary

```
Trs_Del2 (Yarn DC)
  ├── INSERT/UPDATE → TRG_YARN_BALANCE_DEL → ST_ProgBalance_Yarn.DcKgs
  └── DELETE → TRG_YARN_BALANCE_DEL_DEL → decrements DcKgs

Trs_Del3 (Knit DC)
  ├── INSERT/UPDATE → TRG_YARN_BALANCE_DELKNIT → ST_ProgBalance_Yarn (Prog)
  └── DELETE → TRG_YARN_BALANCE_DELYARN_DEL → decrements DcKgs

Trs_GRN2 (Yarn GRN)
  └── DELETE → TRG_YARN_BALANCE_GRN_DEL → decrements GrnKgs, recalculates ReqBalanceKgs
```

---

## 7. Triggers — WBS Production

| # | Trigger Name | Table | Event | What It Does |
|---|-------------|-------|-------|--------------|
| 1 | Trg_WBS_LineProduction | WBS_LineProduction | AFTER UPDATE | Sets `UpdateFlg=1` for line production planning sync |
| 2 | Trg_WBS_Production_DateWise | WBS_Production_DateWise | AFTER UPDATE | Sets `UpdateFlg=1` for date-wise production sync |
| 3 | Trg_WBS_Production_Update_Actual | WBS_PRODUCTION | AFTER UPDATE | Sets `ActualPosting_UpdateFlg=1` when `ActualStart` or `ActualFinish` dates change |

**Module**: Production / Planning (WBS = Work Breakdown Structure)

---

## 8. Triggers — Stock Rate Posting

### 8.1 Tgr_StockRatePost

| Attribute | Value |
|-----------|-------|
| **Table** | `StockRatePost` |
| **Event** | FOR INSERT, DELETE, UPDATE |
| **File** | Tgr_StockRatePost.sql (original) + SPTriggers/Updated/Tgr_StockRatePost.sql (v2, dated 01/03/2025) |
| **Module** | Costing / Budgeting |
| **Complexity** | **HIGHEST** — ~500+ lines, the most complex trigger in the system |

**Purpose**: Implements **cumulative bill rate cascading** through the department processing chain. When a bill rate is entered or modified for any department, this trigger recalculates the cumulative cost for all downstream departments.

**Two Processing Paths**:

#### Path A: Sample Orders (no `ordseq`)
- Direct rate assignment without order-level percentage weighting
- Simpler cascade through department sequence

#### Path B: Regular Orders (with `ordseq`)
- Uses `Pro_YrnCns` (yarn consumption) percentage-weighted rates for mixed count handling
- Walks department chain using `sno` sequence numbers

**Department-Specific Rate Logic**:

| Department | InputType | Rate Calculation |
|-----------|-----------|-----------------|
| Dept 1 (Yarn) | Y | `cumBillRate = BillRate` (or `ProcRate` if BillRate=0) |
| Dept 2 (Yarn Dyeing) | Y | `cumBillRate = Dept1.cumBillRate + currentRate`; Order path uses `Pro_YrnCns` weighted % |
| Dept -4 (Yarn Twist) | Y | Weighted rate from `Prog_YTwist_Mas/Dtl` using `wgtper` percentages |
| Dept 4 (Knitting group) | Y | Walks back through `sno` sequence; mixed count via `Pro_YrnCns` % weighting |
| Other Y depts | Y | Walk back for prev `cumBillRate` where `YF='Y'` |
| Dept 15 (FabToYarn) | F | Separate handling for fabric-to-yarn conversion rate |
| Other F depts | F | Dynamic SQL with flexible matching on fabric attributes |

**Updated Version (v2) Additions**:
- `FabToYarnRate_ReqInKnit` option from `Options1` table
- `LooseFab` handling for non-order-specific fabric
- `YCns_Id` support for yarn consumption tracking
- Additional error handling for edge cases

**Key Tables Modified**: `StockRatePost.cumBillRate`, `StockRatePost.cumProcRate`

**Key Tables Read**: `StockRatePost`, `StockTable`, `Pro_YrnCns`, `Prog_YTwist_Mas`, `Prog_YTwist_Dtl`, `Options1`, `OrderMas`

---

## 9. Triggers — Audit & Special

### 9.1 Trg_TempPartyBalAbs

| Attribute | Value |
|-----------|-------|
| **Table** | `TempPartyBalAbs` |
| **Event** | AFTER INSERT |
| **File** | Trg_TempPartyBalAbs.sql |

**Logic**: Captures the hostname/IP address of the client making the insert by joining `sys.sysprocesses` with `sys.dm_exec_connections` using `@@SPID`. Updates the `HostName` column on the newly inserted row.

**Purpose**: Audit trail — tracks which machine modified party balance data.

### 9.2 Trg_TempPartyBalLedger

| Attribute | Value |
|-----------|-------|
| **Table** | `TempPartyBalLedger` |
| **Event** | AFTER INSERT |
| **File** | Trg_TempPartyBalLedger.sql |

**Logic**: Same hostname/IP capture pattern as above for the party balance ledger table.

### 9.3 Trg_OrderStyleImgDtl_Update

| Attribute | Value |
|-----------|-------|
| **Table** | `Mas_Part` |
| **Event** | AFTER UPDATE |
| **File** | Trg_OrderStyleImgDtl_Update.sql |

**Note**: This is a **duplicate** of `Trg_Mas_Part_Update` — exact same content targeting the same `Mas_Part` table. Likely a naming error; the file name suggests it should target `OrderStyleImgDtl` but the SQL targets `Mas_Part`.

---

## 10. Views — Transaction Registers

### 10.1 Vue_TrsDc (Delivery Challan Register)

| Attribute | Value |
|-----------|-------|
| **File** | Updated/Vue_TrsDc.sql |
| **Module** | Dispatch / Delivery |
| **Last Updated** | 26/May/2021 |

**Purpose**: Unified view of all outgoing delivery challans across all transaction types.

**UNION ALL Blocks**:
1. **Process DC** (`TrType IN (1, 7, 10, 11, 12)`) — regular delivery challans with party/unit handling
2. **Multi-Process DC** — auto-generated DCs from `Trs_MultiPrs_Grn1/2/3` where `OurDCID=0`
3. **Return DC** (`TrType IN (4, 6)`) — process returns and purchase returns
4. **Transfer DC** (`TrType IN (3, 8)`) — stock transfers between orders
5. **Sales DC** (`TrType = 2`) — sales delivery with buyer name handling
6. **Godown Transfer** (`TrType = 14`) — inter-godown movements
7. **Fabric Transfer to Unit** (`TrType = 17`) — unit-level fabric delivery

**Key Columns**: TrType, Clos (close status), Coycode, OrdId, DcNo, DcDate, Pname, DeptID, StockID, BgRl, Kg, mtr, ProcessType, PartyUnit, MultiGRN, SubPrsID

### 10.2 Vue_TrsDcAbs (Delivery Challan Abstract)

| Attribute | Value |
|-----------|-------|
| **File** | Updated/Vue_TrsDcAbs.sql |
| **Module** | Dispatch / Delivery |

**Purpose**: Abstracted/aggregated version of `Vue_TrsDc` that joins with `StockTable` and master tables to resolve descriptions. Aggregates by grouping key with `SUM(BgRl, Kg, mtr)`.

**Special Logic**: For Dept 8 (Dyeing) and Dept 10 (Printing), uses dye color / design description instead of stock color.

**Depends On**: `Vue_TrsDc`

### 10.3 Vue_TrsRec (Receipt Register)

| Attribute | Value |
|-----------|-------|
| **File** | Updated/Vue_TrsRec.sql |
| **Module** | Procurement / Inventory |

**Purpose**: Unified view of all incoming receipts (GRNs, process receipts, returns, openings, transfers).

**UNION ALL Blocks**:
1. **Purchase GRN** — direct purchase receipts
2. **Acc Purchase GRN** — accessory purchase receipts
3. **Process Receipt** — from `Trs_Grn1` with DC reference (`DCID`)
4. **Multi-Process Receipt** (2 variants) — from `Trs_MultiPrs_Grn` tables, with/without DC reference
5. **Process Return** — returns from processing parties
6. **Opening Items** — from `Trs_Opening`
7. **Transfer In** — stock transfers (`TrType IN (3, 8)`)
8. **Sales Return** — with buyer name handling
9. **Cutting Acknowledgement** — fabric return from cutting (`Trs_CutApr`)

### 10.4 VUE_TRSRECABS (Receipt Abstract)

| Attribute | Value |
|-----------|-------|
| **File** | VUE_TRSRECABS.Sql (SPViews) + Updated/Vue_TrsRecAbs.sql |
| **Module** | Procurement / Inventory |

**Purpose**: Aggregated version of `Vue_TrsRec` with resolved descriptions from master tables. Groups and sums `RBag`, `RecKgs`, `Recmtr`.

**Depends On**: `Vue_TrsRec`

### 10.5 Vue_StkLedger (Stock Ledger)

| Attribute | Value |
|-----------|-------|
| **File** | Vue_StkLedger.Sql |
| **Module** | Inventory / Warehouse |
| **Last Updated** | 13/Dec/2021 |

**Purpose**: Complete stock movement ledger combining all transaction types into In/Out columns by StockID.

**Transaction Types (20 UNION ALL blocks)**:
| TrsTypeNo | Transaction | Direction |
|-----------|------------|-----------|
| 1 | Opening | IN |
| 2 | Purchase GRN | IN |
| 3 | Purchase Return | OUT |
| 4 | Process Delivery | OUT |
| 5 | Process Receipt | IN |
| 6 | Process Return | IN |
| 7 | Transfer Out | OUT |
| 8 | Transfer In | IN |
| 9 | Sales Delivery | OUT |
| 10 | Sales Return | IN |
| 11 | Stock Adjustment Plus | IN |
| 12 | Stock Adjustment Minus | OUT |
| 13 | Godown Transfer In | IN |
| 14 | Godown Transfer Out | OUT |
| 15 | Cutting Acknowledgement | IN (to cut order) |
| 16 | Unit DC | OUT |
| 17 | Unit Return Ack | OUT |
| 18 | Unit Fabric Delivery Return | IN |
| 19 | Return to Lot | IN |
| 20 | Ready-To-Cut IN / OUT_FinalPrs | IN+OUT |

**Key Columns**: TrsTypeno, TrsType, Coycode, TrsDate, DocNo, Finyear, Pname, StockID, InBg/InKg/InMtr, OutBg/OutKg/OutMtr, GodID, Dept

### 10.6 VUE_DEL_PRSRT (Delivery Process Report)

| Attribute | Value |
|-----------|-------|
| **File** | VUE_DEL_PRSRT.sql |
| **Module** | Dispatch / Reporting |

**Purpose**: Comprehensive delivery report view for DC (Delivery Challan) printing with full detail including GST, E-way bill, rates, vehicle info, and design descriptions.

**Key Joins**: `Trs_Del1/2` + `StockTable` + `OrderMas` + `Mas_Party` + `BudPodet` (budget rates) + `Pro_ReqKnitt2` + `PrePrint` + `Options` + multiple master tables

### 10.7 Vue_Dailyinout (Daily In/Out Register)

| Attribute | Value |
|-----------|-------|
| **File** | Vue_Dailyinout.Sql |
| **Module** | Inventory / MIS Reporting |

**Purpose**: Comprehensive daily transaction register combining ALL material movement types with descriptive labels and balance tracking.

**UNION ALL Sources**: Deliveries (Trs_Del), GRNs (Trs_Grn), Piece DCs (Trs_Pcs), Piece GRNs (Trs_PcsGrn), General DCs (Trs_Gen), General GRNs (Trs_GenGrn), Multi-process GRN receipts/issues

**Balance References**: `Vue_DailyInOutBalance`, `Vue_DailyInOutOrdBalance`

### 10.8 VUE_STOCKDTDATE (Stock Detail by Date)

| Attribute | Value |
|-----------|-------|
| **File** | VUE_STOCKDTDATE.Sql |
| **Module** | Inventory / Warehouse |

**Purpose**: Date-wise stock movement aggregation for point-in-time stock position calculations.

**Transaction Types (16+ UNION ALL blocks)**:
- GRN receipts (minus rejections), deliveries, stock transfers (in/out), openings, stock adjustments, cutting acknowledgements, unit DC/ACK, godown transfers, ready-to-cut movements
- Includes `RUpdtkg`/`Rupdtmtr` (rate update adjustments) as separate transaction type 7
- Groups by StockID, OrdID, StyleNo, GodID, Date

---

## 11. Views — Stock & Balance

### 11.1 Vue_PcsStockDtl_PART (Piece Stock Detail by Part)

| Attribute | Value |
|-----------|-------|
| **File** | Vue_PcsStockDtl_PART.Sql |
| **Module** | Cutting / Piece Goods |
| **Last Updated** | 28/Dec/2022 |

**Purpose**: Tracks piece goods stock by Part (garment component) across all piece movement types.

**UNION ALL Sources (10 blocks)**:
1. **Issue (Despatch)** — `Trs_Pcs1/2` where `DelType='Despatch'`, SemiFinish='F'
2. **Issue (Other)** — non-despatch, non-transfer issues with `SEMIFINISH` from `Mas_Dept`
3. **Receipt (GRN)** — `Trs_PcsGrn1/2` where `PanelID=0`
4. **Production** — `Trs_Prodentry` at `StageID=1` (cutting), Rework=0
5. **Production (Other Stages)** — `StageID<>1`, Rework=0
6. **Unit Transfer Receipt** — via `Trs_UnitAck` tables
7. **Godown Transfer Receipt** — via `Trs_PcsGodAck` tables
8. **Stock Transfer** — `Trs_PcsStockTfr1/2` (order-to-order transfer)
9. **Stock Opening** — `Trs_PcsAdj1/2` where `Adj_Missing_Flg='O'`
10. **Add Panel Entry** — `Trs_AddPanelEntry` production at StageID=1
11. **Unit Transfer Panel** — `DelType='Unit Transfer-Panel'`

**Key Columns**: Trn (type), Coycode, Ordjobno, ColID, StyleID, SizeID, Rec, Iss, StyleNo, SemiFinish, PartID, GodID

### 11.2 Vue_Reqd_Vs_Finish (Required vs Finished)

| Attribute | Value |
|-----------|-------|
| **File** | Vue_Reqd_Vs_Finish.Sql |
| **Module** | Production / Planning |
| **Last Updated** | 25/Dec/2024 |

**Purpose**: Department-wise completion status comparing required quantities against finished quantities for active orders.

**UNION of two blocks**:
1. **Fabric** — from `Vue_ST_ProgBalance_FabricDet`: calculates `req_balance_kgs/mtr` and `finished_kgs/mtr`
2. **Yarn** — from `Vue_ST_ProgBalance_YarnDet`: same calculation for yarn departments

**Balance Formula**:
```
req_balance = (ReqKgs + ShortKgs) - (GRNKgs + Prog_CompKgs + TransInKgs + ReturnKgs - TransOutKgs)
finished = GRNKgs + Prog_CompKgs + TransInKgs + ReturnKgs - TransOutKgs
```

**Filter**: Only active orders (`OrderMas.Completed=0`)

### 11.3 Vue_GrnRegFab_PO (Fabric GRN Register with PO)

| Attribute | Value |
|-----------|-------|
| **File** | Vue_GrnRegFab_PO.sql |
| **Module** | Procurement / Inventory |
| **Last Updated** | 07/Jan/2025 |

**Purpose**: Fabric GRN register view that nets out already-delivered quantities from received quantities for PO tracking.

**UNION of two blocks**:
1. **Regular GRN** — `Trs_Grn1/2` with DC quantity subtraction: `RecKgs - ISNULL(X.Kg,0)`, filtering for positive net receipts only
2. **Multi-Process GRN** — `Trs_MultiPrs_Grn1/2/3` for indirect process receipts

**Key Feature**: Shows net pending GRN quantities by subtracting already dispatched quantities against the same PO/GRN reference.

### 11.4 Vue_Budget_Det (Budget Detail)

| Attribute | Value |
|-----------|-------|
| **File** | Vue_Budget_Det.Sql |
| **Module** | Costing / Budgeting |

**Purpose**: Aggregates actual budget amounts per order from multiple transaction sources for budget vs actual comparison.

**UNION ALL of 8+ sources**:
- Delivery amounts (Trs_Del, TrType=3), transferred order amounts, direct debit amounts (by dept split), production entry amounts (with BudPodet rates), shift wages, despatch pieces (Trs_Pcs), non-accessories debit amounts (Trs_Deb), jobwork bill amounts (Trs_BillRate)

**Key Columns**: ordid, Amount, Amount1, DebitAmount, DebitAmount1, ProdAmount, Jobwork, DespPcs

### 11.5 Vue_DailyCostingInputData (Daily Costing Input)

| Attribute | Value |
|-----------|-------|
| **File** | Vue_DailyCostingInputData.Sql |
| **Module** | Costing / Finance |

**Purpose**: Unified daily production costing input data at 4 hierarchical levels.

**UNION of 4 levels**:
1. **Factory level** — `Trs_DailyPrdn_Costing2` (unit-wide expenses)
2. **Department level** — `Trs_DailyPrdn_Costing3`
3. **Line level** — `Trs_DailyPrdn_Costing4` (uses `Options.Stitching_DeptCode`)
4. **Order level** — `Trs_DailyPrdn_Costing5`

**Key Feature**: Includes `ShiftWageExp` flag and `Exp_Level` from `Mas_Expenses` for expense classification.

---

## 12. Views — Financial & GST

### 12.1 Vue_InputGST (Input GST Summary)

| Attribute | Value |
|-----------|-------|
| **File** | Vue_InputGST.Sql |
| **Module** | Accounting / GST |
| **Last Updated** | 03/Feb/2026 |

**Purpose**: Aggregates input GST (SGST, CGST, IGST) from bills for GST filing and reporting.

**UNION ALL of 4 blocks**:
1. **SGST amounts** — from `Trs_BillAddded` where `AddDedName='SGST'`
2. **CGST amounts** — where `AddDedName='CGST'`
3. **IGST amounts** — where `AddDedName='IGST'`
4. **Other additions/deductions** — codes not in (1,2,40,41,42)

**Filter**: Only GST bills (`GSTBill='Y'`)

**Key Columns**: ID, PId, PartyName, coycode, BillType, SGSTValue/Amt, CGSTValue/Amt, IGSTValue/Amt, ERN (E-invoice Reference Number), Others

### 12.2 vue_ContractLedger_New_Balcheck (Contractor Wages Ledger)

| Attribute | Value |
|-----------|-------|
| **File** | vue_ContractLedger_New_Balcheck.Sql |
| **Module** | Production / Finance |

**Purpose**: Contractor payment ledger showing credits (production bills) and debits (payments) per employee/stage.

**UNION of**:
- **Credits**: Production bill entries from `Trs_ProdBillEntry/DetNew/MasNew`
- **Debits**: Payments from `PaymentMas/Dtl` (types: P=Payment, V=Voucher, C=Cash, R=Return, T=Transfer)
- **Credit (Debit Notes)**: `ReserveFlg='D'` entries treated as credits

**Grouped By**: StageID, EmpName, BrNo, Order

### 12.3 Vue_Budget_Det

(See Section 11.4 above — also serves financial reporting)

---

## 13. Views — Quality & Multi-Process

### 13.1 Vue_LabTestGarments (Lab Test Results)

| Attribute | Value |
|-----------|-------|
| **File** | Vue_LabTestGarments.Sql |
| **Module** | Quality Control |
| **Last Updated** | 14/Sep/2022 |

**Purpose**: Comprehensive lab test results view for garments, bit (fabric swatches), accessories, and yarn dyeing quality testing.

**UNION of 2 blocks**:
1. **Parameter values** — actual test parameter measurements with values
2. **Status summary** — pass/fail status per test stage (IndexNo=900)

**Key Tables**: `LabTestMas`, `LabTestGrpMas`, `LabTestGrpDet`, `Mas_LabTestParameters`, `Mas_LabTestStages`

**Test Groups**: Garments (G), Bit (B), Accessories (A), Yarn Dyeing (Y)

**Key Data**: BW/AW GSM (before/after wash), diameter measurements, shrinkage, wash type (Flat/Tumble/Line dry), sample type (Sample/Random), pass/fail status

### 13.2 Vue_MultiPrcs (Multi-Process GRN Register)

| Attribute | Value |
|-----------|-------|
| **File** | Vue_MultiPrcs.Sql |
| **Module** | Procurement / Multi-Process |
| **Last Updated** | 14/Sep/2022 |

**Purpose**: Register of multi-process GRN entries showing intermediate and final process receipts.

**UNION of 2 blocks**:
1. **Intermediate process** — where `FinalProcess='N'` (material still in process chain)
2. **Final process** — where `FinalProcess='Y'` (joins with regular `Trs_Grn1/2` via `External_GRNID`)

**Key Tables**: `Trs_MultiPrs_Grn1/2/3`, `StockTable`, `Mas_SubProcess`, `Trs_Del1` (for DC reference)

---

## 14. Views — Program Balance Detail

### 14.1 Vue_YarnProgBalDetail_N (Yarn Program Balance — All Types)

| Attribute | Value |
|-----------|-------|
| **File** | Vue_YarnProgBalDetail_N.sql |
| **Module** | Inventory / Yarn |
| **Last Updated** | 14/Nov/2025 |

**Purpose**: Detailed yarn program balance breakdown by transaction type for departments with `OutputType='Y'`.

**UNION ALL of 10 blocks**:

| Type | Source | Measures |
|------|--------|----------|
| Req | Pro_ReqYarn | ReqKgs |
| PO | Trs_Po1/2 | PoKgs (minus CancelKgs) |
| Grn | Trs_Grn1/2 | RecKgs (all GRN types) |
| Trans (In) | Trs_Del1/2 (TrType=3) | TransInKgs (via TranID→StockTable) |
| Trans (Out) | Trs_Del1/2 (TrType=3) | TransOutKgs |
| Open | Trs_Opening | OpeningKgs |
| Short | Trs_Shortage | ShortKgs (+= ReqKgs column) |
| PROG | Trs_Del1/3 | ProgKgs (knit yarn programming) |

**Grouped By**: OrdId, DeptID, CountName, ColorDesc, CountID, ColId

### 14.2 Vue_YarnProgBalDetailYarnOnly_N (Yarn Program Balance — Yarn Only)

| Attribute | Value |
|-----------|-------|
| **File** | Vue_YarnProgBalDetailYarnOnly_N.sql |
| **Module** | Inventory / Yarn |
| **Last Updated** | 14/Nov/2025 |

**Purpose**: Similar to `Vue_YarnProgBalDetail_N` but includes additional transaction types: process delivery (ProDel), process return (ProRet), purchase return (PurRet), and sales. Includes `processtype` column for P (process) categorization.

**Additional Types vs Vue_YarnProgBalDetail_N**:

| Type | Source | Measures |
|------|--------|----------|
| ProDel | Trs_Del1/2 (`InputType='Y'`, TrType=1) | ProDelKgs (yarn issued to process) |
| Sales | Trs_Del1/2 (TrType=2, Prs_Dept=-1) | Sales DcKgs |
| ProRet | Trs_Grn1/2 ('Process Return'/'Sales Return') | ProRetKgs |
| PurRet | Trs_Del1/2 (TrType=4) | PurRetKgs |

---

## 15. Cross-Reference: Trigger → View Dependencies

```
Triggers maintain → Summary Tables ← Views read from

TRG_FAB_BALANCE_* → ST_ProgBalance_Fabric
   ↑ read by: Vue_Reqd_Vs_Finish (via Vue_ST_ProgBalance_FabricDet)

TRG_YARN_BALANCE_* → ST_ProgBalance_Yarn
   ↑ read by: Vue_Reqd_Vs_Finish (via Vue_ST_ProgBalance_YarnDet)
              Vue_YarnProgBalDetail_N (indirectly via same base data)
              Vue_YarnProgBalDetailYarnOnly_N

Tgr_StockRatePost → StockRatePost.cumBillRate
   ↑ read by: VUE_DEL_PRSRT (rate display on delivery reports)

Vue_TrsDc → Vue_TrsDcAbs (direct dependency)
Vue_TrsRec → VUE_TRSRECABS / Vue_TrsRecAbs (direct dependency)
```

---

## 16. Module Mapping

| Module | Triggers | Views | Functions |
|--------|----------|-------|-----------|
| **Masters & Configuration** | Trg_Mas_* (25), Trg_Finyear_Update, Trg_CurrentStock_Update | — | — |
| **Inventory / Warehouse** | TRG_FAB_BALANCE_* (5), TRG_YARN_BALANCE_* (5) | Vue_StkLedger, VUE_STOCKDTDATE, Vue_Dailyinout | getLotNo |
| **Dispatch / Delivery** | TRG_FAB_BALANCE_DEL, TRG_YARN_BALANCE_DEL* | Vue_TrsDc, Vue_TrsDcAbs, VUE_DEL_PRSRT | — |
| **Procurement / GRN** | TRG_YARN_BALANCE_GRN_DEL | Vue_TrsRec, VUE_TRSRECABS, Vue_GrnRegFab_PO, Vue_MultiPrcs | — |
| **Costing / Budgeting** | Tgr_StockRatePost, Trg_ST_Cost_* (3) | Vue_Budget_Det, Vue_DailyCostingInputData | DSP_NumericToRupees, NumberToWordsNew |
| **Production / Planning** | Trg_WBS_* (3), Trg_ST_Production_Data, Trg_ST_ProdRequirement | Vue_Reqd_Vs_Finish | WF_PlanFinishDateArrival |
| **Cutting / Piece Goods** | — | Vue_PcsStockDtl_PART | — |
| **Accounting / GST** | Trg_ST_Acc_*, Trg_ST_PartyBalance_*, Trg_TempPartyBal* (2) | Vue_InputGST, vue_ContractLedger_New_Balcheck | DSP_NumericToRupees |
| **Quality Control** | — | Vue_LabTestGarments | — |
| **Yarn Program Balance** | Trg_ST_ProgBalance_Yarn_* (2) | Vue_YarnProgBalDetail_N, Vue_YarnProgBalDetailYarnOnly_N | — |
| **Fabric Program Balance** | Trg_ST_ProgBalance_Fabric_* (2) | Vue_Reqd_Vs_Finish | — |
| **Order Management** | Trg_ST_Ord_inHand_Update, Trg_MR_ProcessDetails | — | — |
| **Multi-Server Sync** | ALL UpdateFlg triggers (40+) | — | — |

---

## Appendix: File Index

### Trigger Files (57)

| File | Trigger | Table |
|------|---------|-------|
| TRG_FAB_BALANCE_DEL.sql | TRG_FAB_BALANCE_DEL | Trs_Del2 |
| TRG_FAB_BALANCE_RCUT.sql | TRG_FAB_BALANCE_RCUT | Trs_ReadyToCut2 |
| TRG_FAB_BALANCE_RCUT_DEL.sql | TRG_FAB_BALANCE_RCUT_DEL | Trs_ReadyToCut2 |
| TRG_FAB_BALANCE_RCUT_RET.sql | TRG_FAB_BALANCE_RCUT_RET | Trs_ReadyToCut_Ret2 |
| TRG_FAB_BALANCE_RCUT_RET_DEL.sql | TRG_FAB_BALANCE_RCUT_RET_DEL | Trs_ReadyToCut_Ret2 |
| TRG_YARN_BALANCE_DEL.sql | TRG_YARN_BALANCE_DEL | Trs_Del2 |
| TRG_YARN_BALANCE_DEL_DEL.sql | TRG_YARN_BALANCE_DEL_DEL | Trs_Del2 |
| TRG_YARN_BALANCE_DELKNIT.sql | TRG_YARN_BALANCE_DELKNIT | Trs_Del3 |
| TRG_YARN_BALANCE_DELYARN_DEL.sql | TRG_YARN_BALANCE_DELYARN_DEL | Trs_Del3 |
| TRG_YARN_BALANCE_GRN_DEL.sql | TRG_YARN_BALANCE_GRN_DEL | Trs_GRN2 |
| Tgr_StockRatePost.sql | Tgr_StockRatePost | StockRatePost |
| Trg_CurrentStock_Update.sql | Trg_CurrentStock_Update | CurrentStock |
| Trg_Finyear_Update.sql | Trg_Finyear_Update | FinanceYear |
| Trg_MR_ProcessDetails_Update.sql | Trg_MR_ProcessDetails_Update | MR_ProcessDetails |
| Trg_Mas_Acc_Update.sql | Trg_Mas_Acc_Update | Mas_Acc |
| Trg_Mas_AccCategory_Update.sql | Trg_Mas_AccCategory_Update | Mas_AccCategory |
| Trg_Mas_AccDes_Update.sql | Trg_Mas_AccDes_Update | Mas_AccDes |
| Trg_Mas_Buyer_Update.sql | Trg_Mas_Buyer_Update | Mas_Buyer |
| Trg_Mas_BuyerDept_Update.sql | Trg_Mas_BuyerDept_Update | Mas_BuyerDept |
| Trg_Mas_Color_Update.sql | Trg_Mas_Color_Update | Mas_Color |
| Trg_Mas_Component_Update.sql | Trg_Mas_Component_Update | Mas_Component |
| Trg_Mas_Count_Update.sql | Trg_Mas_Count_Update | Mas_Count |
| Trg_Mas_Dept_Update.sql | Trg_Mas_Dept_Update | Mas_Dept |
| Trg_Mas_Design_Update.sql | Trg_Mas_Design_Update | Mas_Design |
| Trg_Mas_Dia_Update.sql | Trg_Mas_Dia_Update | Mas_Dia |
| Trg_Mas_Emp_Update.sql | Trg_Mas_Emp_Update | Mas_Emp |
| Trg_Mas_Fabric_Update.sql | Trg_Mas_Fabric_Update | Mas_Fabric |
| Trg_Mas_Fcy_Update.sql | Trg_Mas_Fcy_Update | Mas_Fcy |
| Trg_Mas_JobWrkComp_Update.sql | Trg_Mas_JobWrkComp_Update | Mas_JobWrkComp |
| Trg_Mas_Lot_Update.sql | Trg_Mas_Lot_Update | Mas_Lot |
| Trg_Mas_Merchandiser_Update.sql | Trg_Mas_Merchandiser_Update | Mas_Merchandiser |
| Trg_Mas_Part_Update.sql | Trg_Mas_Part_Update | Mas_Part |
| Trg_Mas_Party_Update.sql | Trg_Mas_Party_Update | Mas_Party |
| Trg_Mas_Season_Update.sql | Trg_Mas_Season_Update | Mas_Season |
| Trg_Mas_Size_Update.sql | Trg_Mas_Size_Update | Mas_Size |
| Trg_Mas_SizeGroup_Update.sql | Trg_Mas_SizeGroup_Update | Mas_SizeGroup |
| Trg_Mas_StyleDesc_Update.sql | Trg_Mas_StyleDesc_Update | Mas_StyleDesc |
| Trg_Mas_Stylegroup_Update.sql | Trg_Mas_Stylegroup_Update | Mas_StyleGroup |
| Trg_Mas_UOM_Update.sql | Trg_Mas_UOM_Update | Mas_UOM |
| Trg_OrderStyleImgDtl_Update.sql | (duplicate of Trg_Mas_Part_Update) | Mas_Part |
| Trg_ST_Acc_PartyBal_Abs_Update.sql | Trg_ST_Acc_PartyBal_Abs_Update | ST_Acc_PartyBal_Abs |
| Trg_ST_Acc_Prog_Balance_Update.sql | Trg_ST_Acc_Prog_Balance_Update | ST_Acc_Prog_Balance |
| Trg_ST_Acc_Prog_Balance_Update_Actual.sql | Trg_ST_Acc_Prog_Balance_Update_Actual | ST_Acc_Prog_Balance |
| Trg_ST_Cost_Dept.sql | Trg_ST_Cost_Dept | ST_Cost_Dept |
| Trg_ST_Cost_Factory.sql | Trg_ST_Cost_Factory | ST_Cost_Factory |
| Trg_ST_Cost_OrderDtl.sql | Trg_ST_Cost_OrderDtl | ST_Cost_OrderDtl |
| Trg_ST_DailyCostingInputData.sql | Trg_ST_DailyCostingInputData | ST_DailyCostingInputData |
| Trg_ST_Ord_inHand_Update.sql | Trg_ST_Ord_inHand_Update | ST_Ord_inHand |
| Trg_ST_PartyBalance_Abs_Update.sql | Trg_ST_PartyBalance_Abs_Update | ST_PartyBalance_Abs |
| Trg_ST_ProdRequirement_Update.sql | Trg_ST_ProdRequirement_Update | ST_ProdRequirement |
| Trg_ST_Production_Data_Update.sql | Trg_ST_Production_Data_Update | ST_Production_Data |
| Trg_ST_ProgBalance_Fabric_Update.sql | Trg_ST_ProgBalance_Fabric_Update | ST_ProgBalance_Fabric |
| Trg_ST_ProgBalance_Fabric_Update_Actual.sql | Trg_ST_ProgBalance_Fabric_Update_Actual | ST_ProgBalance_Fabric |
| Trg_ST_ProgBalance_Yarn_Update.sql | Trg_ST_ProgBalance_Yarn_Update | ST_ProgBalance_Yarn |
| Trg_ST_ProgBalance_Yarn_Update_Actual.sql | Trg_ST_ProgBalance_Yarn_Update_Actual | ST_ProgBalance_Yarn |
| Trg_TempPartyBalAbs.sql | Trg_TempPartyBalAbs | TempPartyBalAbs |
| Trg_TempPartyBalLedger.sql | Trg_TempPartyBalLedger | TempPartyBalLedger |
| Trg_WBS_LineProduction.sql | Trg_WBS_LineProduction | WBS_LineProduction |
| Trg_WBS_Production_DateWise.sql | Trg_WBS_Production_DateWise | WBS_Production_DateWise |
| Trg_WBS_Production_Update_Actual.sql | Trg_WBS_Production_Update_Actual | WBS_PRODUCTION |

### View Files (20)

| File | View Name | Location |
|------|-----------|----------|
| Vue_Budget_Det.Sql | Vue_Budget_Det | SPViews/ |
| vue_ContractLedger_New_Balcheck.Sql | vue_ContractLedger_New_Balcheck | SPViews/ |
| Vue_DailyCostingInputData.Sql | Vue_DailyCostingInputData | SPViews/ |
| Vue_Dailyinout.Sql | Vue_Dailyinout | SPViews/ |
| VUE_DEL_PRSRT.sql | VUE_DEL_PRSRT | SPViews/ |
| Vue_GrnRegFab_PO.sql | Vue_GrnRegFab_PO | SPViews/ |
| Vue_InputGST.Sql | Vue_InputGST | SPViews/ |
| Vue_LabTestGarments.Sql | Vue_LabTestGarments | SPViews/ |
| Vue_MultiPrcs.Sql | Vue_MultiPrcs | SPViews/ |
| Vue_PcsStockDtl_PART.Sql | Vue_PcsStockDtl_PART | SPViews/ |
| Vue_Reqd_Vs_Finish.Sql | Vue_Reqd_Vs_Finish | SPViews/ |
| Vue_StkLedger.Sql | Vue_StkLedger | SPViews/ |
| VUE_STOCKDTDATE.Sql | VUE_STOCKDTDATE | SPViews/ |
| VUE_TRSRECABS.Sql | VUE_TRSRECABS | SPViews/ |
| Vue_YarnProgBalDetail_N.sql | Vue_YarnProgBalDetail_N | SPViews/ |
| Vue_YarnProgBalDetailYarnOnly_N.sql | Vue_YarnProgBalDetailYarnOnly_N | SPViews/ |
| Vue_TrsDc.sql | Vue_TrsDc | SPViews/Updated/ |
| Vue_TrsDcAbs.sql | Vue_TrsDcAbs | SPViews/Updated/ |
| Vue_TrsRec.sql | Vue_TrsRec | SPViews/Updated/ |
| Vue_TrsRecAbs.sql | Vue_TrsRecAbs | SPViews/Updated/ |

### Function Files (4)

| File | Function Name |
|------|--------------|
| DSP_NumericToRupees.sql | DSP_NumericToRupees |
| getLotNo.sql | getLotNo |
| NumberToWordsNew.sql | NumberToWordsNew |
| WF_PlanFinishDateArrival.sql | WF_PlanFinishDateArrival |
