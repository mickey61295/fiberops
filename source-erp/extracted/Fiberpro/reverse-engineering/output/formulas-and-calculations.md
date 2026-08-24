# FiberPro ERP — Formulas & Calculations Reference

> Extracted from: `SPFunction/`, `SPQuery/`, `SPTriggers/`, `Report/` SQL & code-behind files  
> Generated: 2026-03-15

---

## Table of Contents

1. [Currency Conversion (Number to Words)](#1-currency-conversion-number-to-words)
2. [Lot Number Extraction](#2-lot-number-extraction)
3. [Working Day / Plan Finish Date Calculation](#3-working-day--plan-finish-date-calculation)
4. [Cumulative Bill Rate Cascading (StockRatePost Trigger)](#4-cumulative-bill-rate-cascading-stockratepost-trigger)
5. [Bill-to-Be Value Calculation](#5-bill-to-be-value-calculation)
6. [Piece Goods Valuation (PcsValue)](#6-piece-goods-valuation-pcsvalue)
7. [Fabric Delivery Stock Valuation](#7-fabric-delivery-stock-valuation)
8. [Accessories Delivery Stock Valuation](#8-accessories-delivery-stock-valuation)
9. [Budget vs Actual Calculation](#9-budget-vs-actual-calculation)
10. [Daily Unit P&L Calculation](#10-daily-unit-pl-calculation)
11. [Order/Style-Wise Cost Aggregation](#11-orderstyle-wise-cost-aggregation)
12. [GST / Tax Calculations (Sales Invoice)](#12-gst--tax-calculations-sales-invoice)
13. [Budget Queries (CMT Rates)](#13-budget-queries-cmt-rates)
14. [Consumption Calculation](#14-consumption-calculation)
15. [Garment Grammage (Cut Weight) Calculation](#15-garment-grammage-cut-weight-calculation)
16. [Costing Triggers (Update Flags)](#16-costing-triggers-update-flags)
17. [Program Balance Tracking (Yarn / Fabric / Accessories)](#17-program-balance-tracking-yarn--fabric--accessories)
18. [Party Balance Tracking](#18-party-balance-tracking)

---

## 1. Currency Conversion (Number to Words)

**Source**: `SPFunction/DSP_NumericToRupees.sql`, `SPFunction/NumberToWordsNew.sql`

### 1a. DSP_NumericToRupees — Indian Numbering with Multi-Currency

**Signature**: `DSP_NumericToRupees(@RUPEES DECIMAL(30,2), @fcyID INT) → VARCHAR(2000)`

**Algorithm** (Indian place-value system):

1. Separate the integer part and paise:
   ```
   @AMOUNT = FLOOR(@RUPEES)
   @PAISE  = CAST((@RUPEES % 1) * 100 AS INT)
   ```

2. Decompose the integer using Indian place values:

   | Range | Division | Label |
   |---|---|---|
   | ≥ 1,00,00,000 (10⁷) | `@AMOUNT / 10000000` | **Crore** — delegates to `NumberToWordsNew()` for the crore count |
   | ≥ 1,00,000 (10⁵) | `(@AMOUNT % 10000000) / 100000` | **Lakh** |
   | ≥ 1,000 (10³) | `(@AMOUNT % 100000) / 1000` | **Thousand** |
   | ≥ 100 | `(@AMOUNT % 1000) / 100` | **Hundred** |
   | < 100 | Tens + Units | Direct lookup |

3. For each group, if the value is ≤ 20, look up a ones table (One..Twenty); if > 20, split into tens-digit (lookup from Twenty..Ninety) and units-digit.

4. Paise are converted the same way as the sub-100 portion.

5. The currency denomination is looked up from `Mas_Fcy` table by `@fcyID`:
   ```sql
   SELECT @DEN = IsNull(Denominator, 'Paise') FROM Mas_Fcy WHERE Id = @fcyID
   ```
   This supports multi-currency (USD → "Cents", EUR → "Cents", INR → "Paise", etc.)

6. Final output: `UPPER(@WORD + ' ONLY')`

7. Overflow guard: if `@AMOUNT >= 1,000,000,000` → returns empty (billion limit).

### 1b. NumberToWordsNew — Western Numbering (International)

**Signature**: `NumberToWordsNew(@intNumberValue INTEGER) → VARCHAR(2000)`

**Algorithm** (Western Thousand/Million/Billion groups):

1. Handles NULL, non-numeric, zero, and negative values.
2. Decomposes the integer into groups of 3 digits (Hundreds, Tens column):
   ```
   WHILE (@intNumberValue % 1000) > 0 OR (@intNumberValue / 1000) > 0
     INSERT group (Units-position, Hundreds-digit, Tens-portion)
     @intNumberValue = @intNumberValue / 1000
   ```
3. Each group is rendered (Hundreds → "AND" → Tens) with the suffix:
   - Units=1 → "THOUSAND"
   - Units=2 → "MILLION"
   - Units=3 → "BILLION"
   - Units=4 → "TRILLION"

**Usage**: Called by `DSP_NumericToRupees` for the Crore part when the crore amount itself is large enough to need word conversion.

---

## 2. Lot Number Extraction

**Source**: `SPFunction/getLotNo.sql`

**Signature**: `getLotNo(@s VARCHAR(50)) → INT`

**Algorithm**:
```
1. Strip leading non-numeric characters:
     @s = SUBSTRING(@s, PATINDEX('%[0-9]%', @s), LEN(@s) - PATINDEX('%[0-9]%', @s) + 1)
2. If the remaining string is entirely numeric → return it as INT.
3. Otherwise, truncate at the first non-numeric character:
     @s = SUBSTRING(@s, 1, PATINDEX('%[^0-9]%', @s) - 1)
4. Return CAST(@s AS INT)
```

**Example**: `'LOT-A123B'` → finds first digit at position 6 → `'123B'` → truncate at 'B' → returns `123`.

**Purpose**: Extracts the numeric lot identifier from alphanumeric lot strings (e.g., on GRN receipts, stock table records).

---

## 3. Working Day / Plan Finish Date Calculation

**Source**: `SPFunction/WF_PlanFinishDateArrival.sql`

**Signature**: `WF_PlanFinishDateArrival(@Date DATETIME, @Days INT, @flg CHAR(1)) → DATETIME`

**Parameters**:
- `@Date` — starting date
- `@Days` — number of working days to add (or subtract)
- `@flg` — `'F'` = forward (add days), anything else = backward (subtract days)

**Algorithm**:
```
1. @DaysAdd = +1 if @flg='F' else -1
2. Advance @Date by 1 day (to start counting from next day).
3. Initialize @Count = 1
4. @WeeklyOff = 1   (Sunday = day-of-week 1 in SQL Server)
5. WHILE @Count < @Days:
     a. Get @WeeklyDay = DATEPART("w", @Date)
     b. Count holidays: @CountHolidays = COUNT(*) FROM GovtHolidays WHERE GHDate = @Date
     c. IF @WeeklyDay ≠ @WeeklyOff AND @CountHolidays = 0:
          — It's a working day → advance date, increment count
        ELSE:
          — Skip day (holiday or weekly off) → advance date only
6. After main loop, skip any remaining weekly-off days at the landing position.
7. Return @Date
```

**Key tables**: `GovtHolidays` (government holidays calendar)

**Business context**: Used for tentative plan finish date on order sheets, scheduling delivery dates, and production planning.

---

## 4. Cumulative Bill Rate Cascading (StockRatePost Trigger)

**Source**: `SPTriggers/Tgr_StockRatePost.sql`

This is the **most critical costing formula** in the system. It fires on INSERT/UPDATE/DELETE on the `StockRatePost` table and cascades cumulative rates through the production process chain.

### Core Concept

Each order goes through a sequence of process departments (e.g., Yarn Purchase → Yarn Dyeing → Knitting → Finishing → Printing). Each department adds its own cost. The cumulative bill rate at each stage is:

$$\text{CumBillRate}_{dept} = \text{CumBillRate}_{prev\_dept} + \text{CurrentRate}_{dept}$$

Where:
$$\text{CurrentRate} = \begin{cases} \text{BillRate} & \text{if BillRate} > 0 \\ \text{ProcRate} & \text{otherwise} \end{cases}$$

### Department-Specific Cascading Rules

**Department 1 — Yarn Purchase** (input type `Y`, Prs=1):
```
CumBillRate = BillRate   (if BillRate > 0)
CumBillRate = ProcRate   (if BillRate = 0)
```
This is the base cost — no previous department to accumulate from.

**Department 2 — Yarn Dyeing** (input type `Y`, Prs=2):
```
For each (CntID, ColID) combination:
  — For Orders: Look up yarn consumption composition from Prog_Ycns
  — Calculate weighted prev rate from yarn purchase:
    PrevRate = Σ (YarnPurchase_CumBillRate × ConsPercent / 100)
  — CumBillRate = PrevRate + CurrentRate
```
Dyeing uses yarn consumption percentages (for blended yarns) to calculate a weighted average input cost.

**Department -4 — Yarn Twisting**:
```
For each (CntID, ColID):
  — Look up twist composition from Prog_YTwist_Dtl
  — PrevRate = Σ (PreviousDept_CumBillRate × WgtPer / 100)
```
Similar to dyeing but uses twist weight percentages.

**Department 4 — Knitting** (and any dept with `DeptGrpCode=4`):
```
For each (FabID, CntID, ColID):
  — For Samples: Walk backward through departments by Sno to find PrevRate
  — For Orders:
    a. Look up yarn composition from Prog_Ycns via Prog_ClrComb
    b. PrevRate = Σ (PreviousDept_CumBillRate × ConsPercent / 100)
  — CumBillRate = PrevRate + CurrentRate
```
If mixed-count yarn is used, the weighted average of component yarn rates is calculated.

**Department 15 — Fabric to Yarn** (input type `F`, special):
```
For each (CntID, ColID):
  — Walk backward to find the latest fabric-type department's CumBillRate
  — CumBillRate = FabricDeptRate + CurrentRate
```

**Other Fabric Departments** (input type `F`):
```
For each (FabID, ColID, DesignID, CntID):
  — Walk backward to find previous fabric department rate
  — Matches on FabID, CntID, optionally ColID and DesignID
  — CumBillRate = PrevFabricRate + CurrentRate
```

**Other Yarn Departments** (input type `Y`, catch-all):
```
For each (CntID, ColID):
  — Walk backward to find previous yarn department rate
  — CumBillRate = PrevYarnRate + CurrentRate
```

### Two Processing Paths

The trigger runs two separate code paths:
1. **Sample orders** (`@Cnt = 0` or `@ordertype = 'Sample'`): Simpler cascading without program-based yarn consumption lookups.
2. **Production orders**: Full cascading with yarn consumption composition (Prog_Ycns, Prog_ClrComb) for accurate blended-material costing.

### Fabric-to-Yarn Rate in Knitting (Optional)

If the option `FabToYarnRate_ReqInKnit = 'Y'` is set, the knitting department also considers the Fabric-to-Yarn department's rate in its cascading, using the loose fabric and yarn consumption relationships.

### Key Tables

| Table | Purpose |
|---|---|
| `StockRatePost` | Stores per-dept rates: BillRate, ProcRate, CumBillRate, BudRate |
| `OrdSeq` | Department sequence for an order |
| `Prog_Ycns` | Yarn consumption composition (yarn count, color, percentage) |
| `Prog_ClrComb` | Programming color combinations |
| `Prog_YTwist_Dtl` | Yarn twist composition |
| `Mas_Dept` | Department master (InputType: Y=Yarn, F=Fabric) |
| `Options1` | System options (FabToYarnRate_ReqInKnit flag) |

---

## 5. Bill-to-Be Value Calculation

**Source**: `SPQuery/SP_BilltoBeValue.sql`, `SP_BilltoBeValue_Detail.sql`, `SP_BilltoBeValue_Approx.sql`

Calculates the total unbilled value for an order, broken down by material category.

### 5a. Yarn Bill-to-Be Value (Flag='Y')

$$\text{BillValue}_{yarn} = \sum \left( (\text{RecKgs} - \text{DeliveredKgs}) \times \text{Rate} \right)$$

Where:
- `RecKgs` = received kilograms on GRN (Trs_Grn2)
- `DeliveredKgs` = kilograms already delivered (from Trs_Del2 via PO linkage)
- `Rate` = PO rate (`Trs_Po2.Rate`) if available, else budget rate (`Pro_ReqYarn2.Rate`)

**Filters**: Only uninvoiced GRNs (`B.InvID IS NULL OR B.InvID = 0`), excludes Process Returns and Sales Returns.

### 5b. Fabric Bill-to-Be Value (Flag='F')

$$\text{BillValue}_{fabric} = \begin{cases}
\sum (\text{RecKgs} - \text{DelKgs}) \times \text{Rate} & \text{if UOM = 'KGS'} \\
\sum (\text{RecMtr} - \text{DelMtr}) \times \text{Rate} & \text{otherwise (meters)}
\end{cases}$$

Where Rate comes from `Pro_ReqKnitt2.Rate` (fabric requirement budget rate).

Fabric bill-to-be is calculated across multiple sub-queries:
1. **Standard fabric GRNs** (Dept ≠ 10, no external GRN)
2. **Reprocess fabric GRNs** (via `Trs_MultiPrs_Grn` where external GRN links to reprocessed deliveries)
3. **Printing department GRNs** (Dept = 10, matched by DesignID)
4. **Multi-process fabric GRNs** (via `Trs_MultiPrs_Grn` tables, non-final processes)

### 5c. Accessories Bill-to-Be Value (Flag='A')

$$\text{BillValue}_{acc} = \sum (\text{RecKgs} - \text{DelKgs}) \times \text{Rate}$$

Where Rate = PO rate (`Trs_Po5.Rate`) if > 0, else budget rate (`Pro_AccBudRate.BudRate`).

**Match keys**: OrdID + Acc_Type + Acc_Desc + Size + Color + Process Department.

### 5d. Piece Goods Bill-to-Be Value (Flag='P')

Combines three sources:

1. **Piece GRN receipts** (job work returns):
$$\text{BillValue}_{pcs\_grn} = \sum \text{RecPcs} \times \text{JobWrkRate}$$
   From `Pro_Prod_PartwiseRate.JobWrkRate` or `Bud_InhRateclw.JobWrkRate`.

2. **In-house production bill entries** (unbilled production):
$$\text{BillValue}_{prod} = \sum (\text{ProdPcs} - \text{BilledPcs}) \times \text{Rate}$$
   Where Rate = `Pro_Prod_PartwiseRate.Rate` if non-zero, else `Bud_InhRateclw.Rate_Pcs`.

3. **Panel receipts**:
$$\text{BillValue}_{panel} = \sum \text{RecPcs} \times \text{JobWrkRate}$$

### 5e. Unplanned Process (Hot Process) Value

$$\text{BillValue}_{hot} = \sum \text{RecKgs} \times \text{Trs\_HotProcessRate.ProcessRate}$$

Calculated separately for Fabric departments (`Fab_Pcs_Dept='F'`) and Piece departments (`Fab_Pcs_Dept='P'`).

### 5f. Total Bill-to-Be Value

$$\text{TotalBillToBe} = \text{BillValue}_{yarn} + \text{BillValue}_{fabric} + \text{BillValue}_{acc} + \text{BillValue}_{pcs} + \text{BillValue}_{hot}$$

---

## 6. Piece Goods Valuation (PcsValue)

**Source**: `SPQuery/SP_PcsValue.sql`, `SP_PcsValue_NEW.sql`, `SP_PcsValue_Out.sql`

This complex procedure calculates the **cumulative garment value** at each production stage.

### 6a. Processing Structure

For each order/style, the system iterates through the production sequence (from `PcsStockRatePost` / `Prod_Sequence`):

```
For each (Order, Style, Department in sequence):
  1. Calculate fabric base value per piece
  2. Calculate in-house production rate at this dept
  3. Calculate outsourced (job work) rate at this dept
  4. Accumulate cumulative budget rate
  5. Accumulate cumulative bill rate
  6. Calculate accessories value per piece
  7. Store all in PcsStockRatePost
```

### 6b. Fabric Value Per Piece

$$\text{FabricValue} = \frac{\text{TotalBudgetFabricAmount}}{\text{ExcessQty}}$$

Where:
- `TotalBudgetFabricAmount` = Sum of budget amounts from `Vue_Rpt_BudAbs` where dept is input-type or fabric-output
- `ExcessQty` = Order quantity including excess percentage (from `Vue_Rpt_OrdExcessQty`)

### 6c. Garment Grammage (Cut Weight)

$$\text{CutGrmmageKgs} = \sum \text{ProgKgs}$$

Where for each size/color:
$$\text{ProgKgs} = \begin{cases}
\frac{\text{CutPlanQty} \times \text{PcsWgt}}{1000} & \text{if WtUOM = 0 (grams)} \\
\text{CutPlanQty} \times \text{PcsWgt} \times \text{WtUOM} & \text{if WtUOM ≠ 0 (conversion factor)}
\end{cases}$$

And `PcsWgt` = `ActPcsWgt` if available, else planned `PcsWgt`.

### 6d. In-House Production Rate

$$\text{InhouseRate} = \text{AVG}(\text{Trs\_ProdExp.Rate} + \text{Trs\_ProdExp.AddRate})$$

From `Trs_ProdEntry` joined with `Trs_ProdExp` for the given order/style/stage.

### 6e. Outside (Job Work) Rate

$$\text{OutsideRate} = \text{AVG}(\text{Trs\_ProdExp.JobWrkRate} + \text{Trs\_ProdExp.JobWrkAddRate})$$

From `Trs_PcsGrn1` (piece goods receipt) joined with `Trs_ProdExp` for the target stage.

### 6f. Cumulative Budget Rate

For each department in sequence:
$$\text{CumBudRate} = \text{CumBudRate}_{prev} + \text{InhouseRate} + \text{OutsideRate}$$

Resets to 0 when Order or Style changes.

### 6g. Cumulative Bill Rate

$$\text{CumBillRate} = \text{CumBillRate}_{prev} + \sum \text{Trs\_BillRate.Rate}$$

Where bill rates come from `Trs_Bills` / `Trs_BillRate` for the order/style/department.

### 6h. Accessories Value Per Piece

For accessories issued to production (Dept 16, `PartyUnit='U'` for unit, `'P'` for party):

$$\text{AccRate} = \text{IssuedKgs} \times \text{PORate}$$

If PO rate not available:
$$\text{AccRate} = \text{IssuedKgs} \times \text{BudRate}$$

Then:
$$\text{PerPcsAccValue} = \frac{\text{TotalAccValue}}{\text{CutPcs}_{inhouse} + \text{CutPcs}_{outside}}$$

### 6i. Final Garment Stock Value

The effective rate stored in `PcsStockRatePost`:
$$\text{CumulateRate} = \begin{cases}
\text{BillRate} & \text{if BillRate} \neq 0 \\
\text{BudRate} & \text{otherwise}
\end{cases}$$

Final garment value per piece register entry:
$$\text{GarmentStockValue} = (\text{CumulateRate} + \text{FabricValue} + \text{AccValuePerPcs}) \times \text{StockPcs}$$

For **Finished Goods** (DeptID = -3), cumulative rates from all departments flagged as `SEMIFINISH='F'` (finished) are aggregated.

For **Opening Stock** items (DeptID = -3 with opening entries):
$$\text{GarmentStockValue} = \text{StockPcs} \times \text{AvgOpeningRate}$$

---

## 7. Fabric Delivery Stock Valuation

**Source**: `SPQuery/SP_FabDelivery_stkValue.sql`

Updates `Trs_Del2.StkRate_DC` (the stock rate at time of delivery) using a priority system:

### Priority 1 — Cumulative Bill Rate (if non-zero)
```sql
StkRate_DC = StockRatePost.CumBillRate
```
Matched on: OrdID + DeptID + CntID + FabID + ColID + DesignID

### Priority 2 — Budget Rate (if CumBillRate = 0)
```sql
StkRate_DC = StockRatePost.BudRate
```
Same match keys.

### Priority 3 — Special Departments Override
For departments 3, 15, 4, 8 (specific process departments), the budget rate is always used regardless of cumulative bill rate availability.

---

## 8. Accessories Delivery Stock Valuation

**Source**: `SPQuery/SP_AccDelivery_stkValue.sql`

$$\text{StkRate\_DC} = \text{Pro\_AccBudRate.BudRate}$$

Matched on: OrdID + Acc_Type + Acc_Desc + ColID + Size

Only applies when the process department is an accessories process department (`AccProsDept='Y'`) or department 16.

---

## 9. Budget vs Actual Calculation

**Source**: `SPQuery/SP_Bud_and_Actual.sql`, `SP_Bud_and_Actual_1.sql`, `SP_Bud_and_Actual_2.sql`

This is the **core profitability analysis** procedure. It builds a comprehensive comparison in `Temp_BudgetAndActual`.

### 9a. Budget Yarn

$$\text{BudgetAmt}_{yarn} = \begin{cases}
\sum \text{Qty} \times \text{Rate} & \text{if Manual\_BudgetKGs\_Entry = 'Y'} \\
\sum \text{ReqKgs} \times \text{Rate} & \text{otherwise}
\end{cases}$$

From `Pro_ReqYarn` / `Pro_ReqYarn2`. Rate = `Pro_ReqYarn2.Rate`.

### 9b. Budget Fabric

$$\text{BudgetAmt}_{fabric} = \sum \begin{cases}
\text{ReqKgs} \times \text{Rate} & \text{if UOM = 'KGS'} \\
\text{ReqMtr} \times \text{Rate} & \text{otherwise}
\end{cases}$$

From `Pro_ReqKnitt` / `Pro_ReqKnitt2`.

### 9c. Budget Accessories

$$\text{BudgetAmt}_{acc} = \sum \text{ReqdQty} \times \text{BudRate}$$

From `Pro_AccReq` / `Pro_AccBudRate`. Separate entries for:
- Purchase accessories (DeptID=16)
- Process accessories (where `AccProsDept='Y'`)

### 9d. Budget Piece Processes (CMT)

For semi-finished production stages:
$$\text{BudgetAmt}_{semifin} = \sum \text{OrderQty} \times \text{Rate}$$

Where:
```
Rate = Pro_Prod_PartwiseRate.Rate (if > 0)
        else Pro_Prod_PartwiseRate.JobWrkRate
```

And OrderQty depends on the `Allow_Excess_InBudget` option:
- If `'N'`: Uses `OrderQty` from `OrderQtyDtl` or `Pro_Prod_PartwiseRate`
- If `'Y'`: Uses `CutPlanQty` or `OrderQtyExcess` (includes excess percentage)

For job-type orders, the original `OrderQtyDtl` is used; for regular orders, `Pro_Prod_PartwiseRate` quantities are used.

For finished production stages:
$$\text{BudgetAmt}_{finish} = \sum \begin{cases}
\text{SizeQty} \times \text{Rate} & \text{if no excess} \\
\lceil \text{SizeQty} + \text{SizeQty} \times \text{Exs\_Per}/100 \rceil \times \text{Rate} & \text{with excess}
\end{cases}$$

### 9e. Actual Production Costs

**In-house actual** (partial bill entry mode):
$$\text{ActualAmt}_{inhouse} = \sum \text{ThisBillQty} \times \text{Rate}$$

Or if tax is required in P&L (`Reqd_TaxInPL = 'Y'`):
$$\text{ActualAmt}_{inhouse} = \sum \text{NetAmount}$$

From `Trs_ProdBillDetNew`.

**In-house actual** (full bill entry mode):
$$\text{ActualAmt}_{inhouse} = \sum \text{ProdPcs} \times \text{Rate}$$

Rate is resolved with fallback chain:
1. `Trs_Prodentry.Rate`
2. `BudPodet.Rate`
3. `Trs_ProdExp.Rate + ActualRate`

**Job work actual** (from piece receipt bills):
$$\text{ActualAmt}_{jobwrk} = \sum \text{Mtr} \times \text{Rate}$$

Or `NetAmount` if tax is included.

### 9f. Budget Commercial Costs

$$\text{BudgetAmt}_{commercial} = \text{PRo\_BudCommercial.Total}$$

Actual commercial costs from shipping bills:
$$\text{ActualAmt}_{commercial} = \begin{cases}
\sum (\text{BillAmount} + \text{TaxAmt}) & \text{if Reqd\_TaxInPL = 'Y'} \\
\sum \text{BillAmount} & \text{otherwise}
\end{cases}$$

### 9g. Option: Allow Excess in Budget

The `Allow_Excess_InBudget` option (`Options` table) determines whether budget quantities include the excess/wastage percentage or only the net order quantity.

### 9h. Overall Budget vs Actual Variance

The final comparison is exposed via views:
- `Vue_BudVsAct_Consolid`: Summarized by order → Total Budget vs Total Actual
- `Vue_BudVsAct`: Detailed by department/stage

---

## 10. Daily Unit P&L Calculation

**Source**: `SPQuery/Sp_DailyUnitPANDL.sql`

A daily posting procedure that calculates per-unit profitability.

### 10a. Budget Value Calculation (Per Production Entry)

Two modes based on `BudRT_CMT_SizeWise` option:

**Size-wise budget** (option = `'Y'`):
$$\text{BudgetValue} = \sum \text{ProdPcs} \times \text{Bud\_InhRateclw.Rate\_Pcs}$$

**Standard budget**:
$$\text{BudgetValue} = \sum \text{ProdPcs} \times \text{Pro\_Prod\_PartwiseRate.Rate}$$

Three production sources are combined:
1. **Shift production** (`Shift_Pcs='S'`): In-house workers
2. **Contractor production** (`Shift_Pcs='P'`): Contract workers
3. **Job work receipts** (from `Trs_PcsGrn1`): External job work

### 10b. Actual Wage Costs

**Shift wages**:
$$\text{ShiftActualWages} = \sum \text{Trs\_ProdWages.ShiftWages}$$

**Contractor actual** (from production bill):
$$\text{ContractorActualWages} = \sum \text{Trs\_ProdBillDetNew.Amount}$$

**Job work actual** (from piece delivery receipt bills):
$$\text{JobwrkActualAmt} = \sum \text{Trs\_BillRate.Amount}$$

### 10c. Budget Overhead Amount

$$\text{BudgetOverheadAmt} = \text{BudgetValue} \times \frac{\text{OrderMas2.ProdOverheads}}{100}$$

### 10d. Daily Unit P&L Abstract (Aggregation)

Aggregated per company/date in `DailyUnit_P_And_L_Abs`:

$$\text{TotalBudgetValue} = \sum \text{BudgetValue}$$

$$\text{BudgetOverheadValue} = \text{TotalBudgetValue} \times \frac{\text{OverHeadPercent}}{100}$$

Where `OverHeadPercent` comes from `Options.Budget_OverHead_Percent` (default: 10%).

$$\text{TotalActualValue} = \sum \text{ShiftActualWages} + \sum \text{AddlAmount}$$

### 10e. Actual Overhead

Comes from two sources:
1. **Daily expense entries**: `Trs_DailyExpenseEntry.Amount`
2. **Fixed expenses**: `FixedExpenses_Entry.PerDayAmount`

$$\text{ActualOverhead} = \sum \text{DailyExpenses} + \sum \text{FixedDailyExpenses}$$

### 10f. Overhead Distribution to Stages

$$\text{OverHeads}_{stage} = \frac{\text{TotalActualOverhead}}{\text{TotalShiftWages} + \text{TotalContractorWages}} \times (\text{ShiftWages}_{stage} + \text{ContractorWages}_{stage} + \text{AddlAmount}_{stage})$$

This distributes overhead proportionally based on each stage's share of total labor costs.

### 10g. Actual Overhead Percentage

$$\text{ActualOverHeadPercent} = \frac{\text{ActualOverheadValue}}{\text{ShiftTotalActualValue} + \text{ContractorTotalActualWages}} \times 100$$

---

## 11. Order/Style-Wise Cost Aggregation

**Source**: `SPQuery/SP_Vue_OrderStyleWiseCost.sql`

Creates/alters the view `Vue_OrderStyleWiseCost` aggregating from the `OrderStyleWiseCost` table:

| Field | Formula |
|---|---|
| `StyleQty` | SUM per order |
| `FabricReqKgs` | SUM of required fabric KGs |
| `FabCostPerUOM` | SUM of fabric cost per unit |
| `TotalBudgetAccValue` | SUM of budgeted accessories value |
| `TotalBudgetProdValue` | SUM of budgeted production value |
| `TotalBudgetCommValue` | SUM of budgeted commercial value |
| `ProfitPercent` | AVG across styles |
| `ProfitValue` | SUM of profit values |
| `BudgetFabricValue` | SUM |
| `BuyComm` | SUM of buyer commission |
| `DDBValue` | SUM of duty drawback value |
| **Actual columns** | Same pattern for Actual_FabricValue, Actual_AccValue, Actual_ProdnValue, Actual_CommValue, etc. |
| `ShippedQty` | SUM of shipped quantity |
| `ShippedValue` | SUM of shipped value |
| `NetProfitValue` | SUM |
| `NetActualValue` | SUM |
| `NetBudgetValue` | SUM |
| `SalesAmt` | SUM of total sales amounts |
| `Supplier_Bill_Amt` | SUM of supplier bill amounts |
| `Emb_Printing_Actual_Amt` | SUM of embroidery/printing actual |
| `FabSalesAmt`, `AccSalesAmt`, `PcsSalesAmt` | SUM of category-wise sales |

---

## 12. GST / Tax Calculations (Sales Invoice)

**Source**: `SPQuery/SP_SalesInv.sql`, `SPQuery/SP_InvQry1.sql`

### 12a. Taxable Amount

$$\text{Amount} = \begin{cases}
\text{Kg} \times \text{Rate} & \text{if RateUOM = 'KGS'} \\
\text{Mtr} \times \text{Rate} & \text{otherwise}
\end{cases}$$

### 12b. GST Rate Determination

GST rates are stored per DC line item in `Trs_Del4`:
- `CGSTper` — Central GST percentage
- `SGSTper` — State GST percentage
- `IGSTper` — Integrated GST percentage

The applicable GST type is determined by comparing states:

$$\text{GSTType} = \begin{cases}
\text{CGST + SGST} & \text{if Exporter.StateID = Party.StateID (intra-state)} \\
\text{IGST} & \text{if Exporter.StateID ≠ Party.StateID (inter-state)}
\end{cases}$$

For invoices with a buyer (`Trs_Del1.Buyer > 0`), the buyer's state is used instead of the party's state.

### 12c. Branded vs Non-Branded Rates

HSN master (`Mas_HSN`) stores four rate tiers:

| Field | Meaning |
|---|---|
| `BPercL` | Branded, Low value rate % |
| `NBPercL` | Non-Branded, Low value rate % |
| `BPercH` | Branded, High value rate % |
| `NBPercH` | Non-Branded, High value rate % |

The `BrandedFlag` from `Mas_Fabric` determines which tier to use. The `UnitRate` threshold determines "Low" vs "High" classification.

### 12d. Tax Amount Calculation (inferred)

$$\text{CGSTAmt} = \text{Amount} \times \frac{\text{CGSTper}}{100}$$

$$\text{SGSTAmt} = \text{Amount} \times \frac{\text{SGSTper}}{100}$$

$$\text{IGSTAmt} = \text{Amount} \times \frac{\text{IGSTper}}{100}$$

$$\text{TotalInvoice} = \text{Amount} + \text{CGSTAmt} + \text{SGSTAmt} + \text{IGSTAmt}$$

---

## 13. Budget Queries (CMT Rates)

**Source**: `SPQuery/SP_BudgetQry1.sql`, `SP_BudgetQry2.sql`

### Bit-Cut Budget Rate Structure

From `Pro_Prod_BitCutRate`:

| Field | Description |
|---|---|
| `Rate` | In-house piece rate per piece |
| `JobWrkRate` | Job work rate per piece |
| `AddRate` | Additional rate (in-house) |
| `JobWrkAddRate` | Additional rate (job work) |
| `NoofPcsPerBit` | Number of pieces per bit cut |
| `PcsWt` | Weight per piece |

**Effective in-house rate**: `Rate + AddRate`
**Effective job work rate**: `JobWrkRate + JobWrkAddRate`

These rates are defined per Order → Style → Part → Work Stage (GrdSlno for component grouping).

---

## 14. Consumption Calculation

**Source**: `SPQuery/SP_ConsQuery1.sql`, `SP_ConsQuery2.sql` (and variants)

### Fabric Consumption Basis

The consumption query retrieves the programmed fabric requirements cross-referenced with actual production:

$$\text{ConsumptionQty} = \sum \text{ProdPcs}$$

Matched against programmed specifications from `Prog_ClrComb` (color combinations), `Prog_Cns` (consumption specs), and `Prog_Component` (component definitions).

Two fabric-matching paths:
1. **Non-yarn-dyed fabric** (`Yd ≠ 1`): Matched by `FabClr` (fabric color)
2. **Yarn-dyed fabric** (`Yd = 1`): Matched by `FinCol` (finished color)

Both require actual deliveries to cutting (`TrType = -2`, `Prs_Dept = 11`) to exist before consumption is calculated.

The consumption data includes: Grey GSM, Final GSM, GG (gauge), LL, fabric width, knitting dia, finishing dia, layer dia, actual piece weight, cut plan quantity, and number of pieces per component.

---

## 15. Garment Grammage (Cut Weight) Calculation

**Source**: Embedded in `SP_PcsValue.sql` and `SP_ConsQuery1.sql`

$$\text{GrammageKgs} = \sum \text{ProgKgs}$$

Per size/color combination:

$$\text{ProgKgs} = \begin{cases}
\frac{\text{CutPlanQty} \times \text{EffectiveWgt}}{1000} & \text{if WtUOM = 0 (grams → kg)} \\
\text{CutPlanQty} \times \text{EffectiveWgt} \times \text{WtUOM} & \text{if WtUOM > 0 (conversion factor)}
\end{cases}$$

Where:
$$\text{EffectiveWgt} = \begin{cases}
\text{ActPcsWgt} & \text{if ActPcsWgt is not null and} \neq 0 \\
\text{PcsWgt} & \text{otherwise (planned weight)}
\end{cases}$$

---

## 16. Costing Triggers (Update Flags)

**Source**: `SPTriggers/Trg_ST_Cost_Dept.sql`, `Trg_ST_Cost_Factory.sql`, `Trg_ST_Cost_OrderDtl.sql`

These triggers implement a **dirty-flag** pattern for incremental cost re-calculation:

| Trigger | Table | Fires When | Sets |
|---|---|---|---|
| `Trg_ST_Cost_Dept` | `ST_Cost_Dept` | `budget_value` or `actual_value` updated | `UpdateFlg = 1` for that date/unit/dept/line |
| `Trg_ST_Cost_Factory` | `ST_Cost_Factory` | `budget_value` or `actual_value` updated | `UpdateFlg = 1` for that date/unit |
| `Trg_ST_Cost_OrderDtl` | `ST_Cost_OrderDtl` | `budget_value` or `actual_value` updated | `UpdateFlg = 1` for that date/unit/dept/line/order/style |

The update flags signal that the costing data has changed and downstream aggregations (reports, dashboards) need to re-query. This avoids expensive real-time recalculation on every transaction.

---

## 17. Program Balance Tracking (Yarn / Fabric / Accessories)

**Source**: `SPTriggers/Trg_ST_ProgBalance_Yarn_Update.sql`, `Trg_ST_ProgBalance_Fabric_Update.sql`, `Trg_ST_Acc_Prog_Balance_Update.sql` (and `_Actual` variants)

### Dirty-Flag Pattern

Similar to costing triggers, these mark changes for incremental sync:

| Table | Tracked Dimensions | Update Flag Purpose |
|---|---|---|
| `ST_ProgBalance_Yarn` | OrdID, DeptID, CountID, ColID | Material balance changed |
| `ST_ProgBalance_Fabric` | OrdID, DeptID, FabID, CntID, ColID, DesignID, FinDiaID, FinGSM, LL | Fabric balance changed |
| `ST_PartyBalance_Abs` | OrdID, DeptID, PartyID, ID | Party balance changed |

### Actual Posting Flag

The `_Actual` variants additionally set `ActualPosting_UpdateFlg = 1` when actual start/finish dates are updated, triggering recalculation of actual completion timelines.

### Program Balance Formula (Conceptual)

For each order/department/material combination:

$$\text{Balance} = \text{Required} - \text{Received} + \text{Returned}$$

Where:
- **Required** = from requirement tables (`Pro_ReqYarn`, `Pro_ReqKnitt`, `Pro_AccReq`)
- **Received** = from GRN tables (`Trs_Grn1/Grn2`)
- **Returned** = from delivery return entries

---

## 18. Party Balance Tracking

**Source**: `SPTriggers/Trg_ST_PartyBalance_Abs_Update.sql`

Tracks outstanding balances per party (supplier/job worker) per order and department. Uses the same dirty-flag mechanism as program balance tracking.

The party balance dimensions are:
- `OrdID` — which order
- `DeptID` — which process department
- `PartyID` — which supplier/job worker
- `ID` — transaction reference

---

## Appendix A: Key Rate Fallback Chains

Throughout the system, rates follow consistent fallback patterns:

### Material Rates (Yarn, Fabric)
```
1. Bill Rate (actual negotiated/invoiced rate)
2. PO Rate (purchase order rate)
3. Budget/Process Rate (planned rate)
```

### Production Rates (CMT)
```
1. Pro_Prod_PartwiseRate.Rate (in-house)
2. Bud_InhRateclw.Rate_Pcs (budget color-wise rate)
3. Trs_ProdExp.Rate + ActualRate
4. BudPodet.Rate (budget PO detail rate)
```

### Job Work Rates
```
1. Pro_Prod_PartwiseRate.JobWrkRate
2. Bud_InhRateclw.JobWrkRate
3. Trs_ProdExp.JobWrkRate + JobWrkAddRate
```

## Appendix B: Key Tables Referenced in Calculations

| Table | Role |
|---|---|
| `StockRatePost` | Cumulative rate tracking per dept per order (yarn & fabric) |
| `PcsStockRatePost` | Cumulative rate tracking per dept per order (piece goods) |
| `Pro_ReqYarn` / `Pro_ReqYarn2` | Yarn requirement and budget rates |
| `Pro_ReqKnitt` / `Pro_ReqKnitt2` | Fabric requirement and budget rates |
| `Pro_AccBudRate` | Accessories budget rates |
| `Pro_Prod_PartwiseRate` | CMT rates per part/style/stage |
| `Bud_InhRateclw` | Size/color-wise budget in-house rates |
| `Trs_ProdExp` | Production expense (actual rates per stage) |
| `Trs_BillRate` | Bill rates from supplier invoices |
| `Trs_HotProcessRate` | Unplanned process rates |
| `Prog_Ycns` | Yarn consumption composition (blended yarns) |
| `Prog_ClrComb` | Color combination programming |
| `OrderMas` / `OrderMas2` | Order master (overhead %, order type) |
| `OrderQtyDtl` | Order quantity details |
| `Mas_Fcy` | Foreign currency master (denominator for number-to-words) |
| `GovtHolidays` | Holiday calendar for working day calculation |
| `Options` / `Options1` | System configuration flags |
| `Mas_HSN` | HSN codes with tax rate tiers |
| `DailyUnit_P_and_L` | Daily P&L detail per order/stage |
| `DailyUnit_P_And_L_Abs` | Daily P&L abstract (aggregated per unit/date) |
| `Temp_BudgetAndActual` | Working table for budget vs actual report |
| `Trs_DailyExpenseEntry` | Daily variable overhead expenses |
| `FixedExpenses_Entry` | Fixed monthly/daily overhead expenses |
| `Trs_ProdWages` | Shift-wise production wages |
