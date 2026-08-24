# Module 10 — Job Work & Outsourcing · Quality, Lab & Approvals · HR, Labor & Payroll · Reporting, Analytics & Integrations

> **Generated**: 2026-03-15  
> **Source**: ~55 forms, ~30 stored procedures, ~10 views, ~5 triggers, 150+ .mrt templates, 180+ .rpt reports, 67 .vb code-behind files, 10 .cs code-behind files  
> **Foundation References**: database-schema.md, stored-procedures-analysis.md, triggers-and-views-analysis.md, formulas-and-calculations.md, earlier module docs (01–09)

---

## Table of Contents

1. [Overview](#1-overview)
2. [SUB-MODULE A — Job Work & Outsourcing](#2-sub-module-a--job-work--outsourcing)
   - 2.1 Forms Inventory
   - 2.2 Data Model — Core Tables
   - 2.3 Budget for Job Work (frmBudgetNew_JobWork)
   - 2.4 Contract Allotment (frmContractAllotment / _New)
   - 2.5 Job Order List & Cutting Job Order (FrmJobOrderList / frmCuttingJobOrder)
   - 2.6 Supplier Order Sheet — Semi-Finished (FrmSuppOrdSheet_Semi)
   - 2.7 Supplier Production Sequence & Tech Data Sheet (FrmSuppProdSequence / FrmSuppTechDataSheet)
   - 2.8 Job Work Piece Return (frmJobWorkPcsReturn)
   - 2.9 Stored Procedures
   - 2.10 Views & Triggers
   - 2.11 Reports
3. [SUB-MODULE B — Quality, Lab & Approvals](#3-sub-module-b--quality-lab--approvals)
   - 3.1 Forms Inventory
   - 3.2 Data Model — Core Tables
   - 3.3 Lab Test Entry (FrmLabTest / FrmNewLabTest)
   - 3.4 Lab Test Configuration (FrmLabTestParameters / FrmLabTestStages / FrmLabTestInputParameters)
   - 3.5 Lot Management (frmLotApproval / FrmLotRegister / FrmLotSeparate / frmLotWiseDtl)
   - 3.6 Item & DC Approvals (FrmAccItemApproval / FrmNonReturnDCApproval / FrmReprocess_Approval)
   - 3.7 Grammage (frmGrammage)
   - 3.8 Views & Key Queries
   - 3.9 Reports
4. [SUB-MODULE C — HR, Labor & Payroll Support](#4-sub-module-c--hr-labor--payroll-support)
   - 4.1 Forms Inventory
   - 4.2 Data Model — Core Tables
   - 4.3 Employee Master (FrmEmpmaster)
   - 4.4 Production Wages (Frm_ProductionWages / Frm_ProdWagesDept / Frm_ProdWagesStage)
   - 4.5 Shift Wages Register (FrmProdShiftWagesReg)
   - 4.6 Hourly Settings & Hours (FrmHourlySetting1 / frmHours)
   - 4.7 Daily In/Out (frmDailyinout)
   - 4.8 Department & Machine Setup (FrmDeptMasterNew / frmDeptGroup / frmDeptSettings / FrmMachineCategory / FrmMachineMaster)
   - 4.9 Work Nature & Concern (FrmMasWorkNature / FrmConcern)
   - 4.10 Views, SPs & Triggers
   - 4.11 Reports
5. [SUB-MODULE D — Reporting, Analytics & Integrations](#5-sub-module-d--reporting-analytics--integrations)
   - 5.1 Forms Inventory
   - 5.2 Crystal Reports Viewer (FrmCrysReport)
   - 5.3 Stimulsoft Reports Viewer (FrmReport / frmRpt)
   - 5.4 Register & Status Views (FrmRegister / FrmStatusReg)
   - 5.5 MIS Dashboard (frmMIS / FrmMISSetting)
   - 5.6 Print Design (frmPrintDesign)
   - 5.7 Barcode Reading (frmBarcodeReadingNew)
   - 5.8 SMS & Email Integration (FrmSMSMailSetup)
   - 5.9 Search (frmSearch)
   - 5.10 Buyer Status & Misc Reports (FrmBuyerStatus / frmComboWiseReqRpt / FrmDcWiseDtl / FrmSewingReq)
   - 5.11 Meeting Review & Workflow (SP_WBS_MeetingView / Meeting*.sql / SP_Meet_ApprovalDetails)
   - 5.12 Mail List Integration (Sp_Maillist1)
6. [Report File Catalog](#6-report-file-catalog)
   - 6.1 Stimulsoft Reports (.mrt) by Category
   - 6.2 Crystal Reports (.rpt) by Category
   - 6.3 Code-Behind Files (.vb) by Category
   - 6.4 Code-Behind Files (.cs) by Category
7. [Cross-Module Dependencies](#7-cross-module-dependencies)

---

## 1. Overview

This document covers the final four smaller functional modules of FiberPro ERP. While individually narrower in scope than modules 1–9, together they complete the full picture of the application:

| Sub-Module | Scope | Forms | Key SPs/Views |
|---|---|---|---|
| **A — Job Work & Outsourcing** | External contractor management, supplier production tracking, contract allotment, cutting job orders | 9 | SP_ST_Supp_Production_Data, Sp_WBS_Supp_Production, Sp_PartyWiseJobOrderBal, Sp_UnitWiseJobOrderBal_*, vue_ContractLedger_New_Balcheck |
| **B — Quality, Lab & Approvals** | Lab testing (garments, bit, accessories, yarn dyeing), lot management, approval workflows | 10 | Vue_LabTestGarments, lab test masters |
| **C — HR, Labor & Payroll** | Employee master, production wages, shift wages, hourly settings, daily in/out tracking, department/machine setup | 15 | SP_Vue_RptShiftWagesReg, Vue_Dailyinout, Trg_Mas_Emp_Update |
| **D — Reporting, Analytics & Integrations** | Report viewers (Crystal/Stimulsoft), MIS dashboards, barcode reading, SMS/email, meeting review, search | ~15 | SP_WBS_MeetingView, SP_Meet_ApprovalDetails, MeetingChartAllDept, Sp_Maillist1 |

---

## 2. SUB-MODULE A — Job Work & Outsourcing

### 2.1 Forms Inventory

| Form Class | Purpose |
|---|---|
| `frmBudgetNew_JobWork` | Create/edit production budgets specifically for job work orders (outsourced production) |
| `frmContractAllotment` | Allot production contracts to external contractors/suppliers |
| `frmContractAllotment_New` | Updated contract allotment form with enhanced features |
| `FrmJobOrderList` | View/filter list of all job orders issued to suppliers |
| `frmJobWorkPcsReturn` | Process piece goods returns from job work parties |
| `FrmSuppOrdSheet_Semi` | Create supplier order sheets for semi-finished goods |
| `FrmSuppProdSequence` | Define/manage production process sequence for supplier operations |
| `FrmSuppTechDataSheet` | Create technical data sheets sent to suppliers with production specs |
| `frmCuttingJobOrder` | Issue cutting job orders to external cutting contractors |

### 2.2 Data Model — Core Tables

#### 2.2.1 SuppOrdMas / SuppOrdDet — Supplier Order Master/Detail

| Column | Type | Purpose |
|---|---|---|
| SuppOrdId | INT (PK) | Supplier order identifier |
| OrdId | INT (FK → OrderMas) | Link to parent garment order |
| StyleNo | VARCHAR | Style reference |
| PartID | INT (FK → Mas_Part) | Garment part |
| ClrID | INT (FK → Mas_Color) | Color |
| SizeId | INT (FK → Mas_Size) | Size |
| Qty | NUMERIC | Order quantity for supplier |
| CutPlanQty | NUMERIC | Cutting plan quantity |

#### 2.2.2 ST_Supp_Production_Data — Supplier Production Summary

Maintains running totals per order/style/part/color/size/stage for supplier operations:

| Column | Type | Purpose |
|---|---|---|
| Coycode | INT | Company/unit code |
| OrdId | INT | Order reference |
| StyleNo | VARCHAR | Style number |
| PartID | INT | Garment part |
| ColId | INT | Color |
| SizeID | INT | Size |
| StageId | INT (FK → Mas_JobWrkComp) | Production stage |
| ProdQty | NUMERIC | Supplier production quantity |
| DCQty | NUMERIC | Delivery challan quantity sent |
| GRNQty | NUMERIC | Goods received quantity |
| RejQty | NUMERIC | Rejected quantity |
| ReworkQty | NUMERIC | Rework quantity |
| OrderQty | NUMERIC | Original order quantity |
| OrderWithExsQty | NUMERIC | Order qty including excess |
| Finish_Percent | NUMERIC | Completion % = (ProdQty + GRNQty) / OrderQty × 100 |
| Finish_Percent_4Exs | NUMERIC | Completion % against order with excess |

#### 2.2.3 WBS_Supp_Production — Supplier Production WBS (Work Breakdown Structure)

Cloud-synced supplier production tracking (Commando integration):

| Column | Type | Purpose |
|---|---|---|
| OrdId | INT | Order reference |
| StyleNo | VARCHAR | Style number |
| SeqNo | INT | Process sequence number |
| StageId | INT | Production stage |
| DeptId | INT | Department |
| Dept | VARCHAR | Department name |
| DcQty | NUMERIC(9,3) | DC quantity |
| ProdQty | NUMERIC(9,3) | Production quantity |
| PartId | INT | Garment part |
| PlanStart | DATETIME | Planned start date |
| PlanFinish | DATETIME | Planned finish date |
| ActualStart | DATETIME | Actual start date |
| ActualFinish | DATETIME | Actual finish date |
| BGColor | VARCHAR(50) | Visual status indicator (color-coded) |
| OrderQty | NUMERIC | Order quantity |
| OrderWithExsQty | NUMERIC | Order with excess |

**BGColor status logic** (derived from plan vs actual dates):
- **Green**: Finished on or before planned finish
- **LightGreen**: Finished after planned finish (delayed completion)
- **Blue**: Started on time, finish expected (within plan period)
- **LightBlue**: Started on time, still within plan window
- **Red**: Started but plan finish date exceeded
- **Silver**: Not yet started, plan finish in future
- **Orange**: Not yet started, plan finish date exceeded

#### 2.2.4 SuppPcs_StockTable / SuppPcs_StockTableQty — Supplier Piece Stock

Separate stock tracking for pieces at the supplier location:

| Column | Type | Purpose |
|---|---|---|
| PcsStockId | INT (PK) | Stock record identity |
| Coycode | INT | Company |
| OrdId | INT | Order |
| StyleNo | VARCHAR | Style |
| StageId | INT | Current production stage |
| PartId | INT | Part |
| GodId | INT | Godown |
| PartyId | INT | Supplier party |
| LotId | INT | Lot reference |
| ColId | INT | Color (in Qty table) |
| SizeId | INT | Size (in Qty table) |
| StockQty | INT | Current stock |
| ProductionQty | INT | Cumulative production |
| GoodPcsFlag | CHAR(1) | 'G' = Good pieces |
| RejectionTypeId | INT | Rejection type (0 = none) |

#### 2.2.5 Trs_SuppProdentry — Supplier Production Entry Transaction

| Column | Type | Purpose |
|---|---|---|
| Id | INT (PK) | Transaction identity |
| CoyId | INT | Company |
| OrdId | INT | Order |
| StyleNo | VARCHAR | Style |
| StageId | INT | Production stage |
| SourceStageId | INT | Source stage (input stage) |
| PartId | INT | Garment part |
| GodId | INT | Godown |
| Rework | INT | Rework flag |
| RejectionTypeId | INT | Rejection type |
| LotID | INT | Lot reference |
| ClrID | INT | Color (combo) |
| EntryOption | INT | Entry option from order style detail |

#### 2.2.6 Trs_ProdBillEntry / Trs_ProdBillMasNew / Trs_ProdBillDetNew — Contractor Bill Entry

Used in the contractor ledger for production bill tracking:

| Column | Type | Purpose |
|---|---|---|
| Trs_ProdBillEntry.OrdId | INT | Order reference |
| Trs_ProdBillEntry.StyleNo | VARCHAR | Style |
| Trs_ProdBillEntry.StageID | INT | Stage |
| Trs_ProdBillEntry.EmpId | INT | Contractor employee ID |
| Trs_ProdBillMasNew.Brno | VARCHAR | Bill reference number |
| Trs_ProdBillMasNew.Finyear | VARCHAR | Financial year |
| Trs_ProdBillMasNew.BrDt | DATE | Bill date |
| Trs_ProdBillDetNew.ThisBillQty | NUMERIC | Quantity in this bill |
| Trs_ProdBillDetNew.Rate | NUMERIC | Bill rate per piece |
| Trs_ProdBillDetNew.NetAmount | NUMERIC | Net bill amount |

#### 2.2.7 PaymentMas / PaymentDtl — Contractor Payment

| Column | Type | Purpose |
|---|---|---|
| PaymentMas.MasSlno | INT (PK) | Payment master identity |
| PaymentMas.EmpId | INT | Contractor employee |
| PaymentMas.Vno | VARCHAR | Voucher number |
| PaymentMas.Finyear | VARCHAR | Financial year |
| PaymentMas.EntryDate | DATE | Payment date |
| PaymentMas.ReserveFlg | CHAR(1) | P=Payment, V=Advance, C=Credit Note, R=Reserve, T=Others, D=Debit Note |
| PaymentMas.PaymentTypeID | INT (FK → Mas_Voucher_PaymentType) | Payment sub-type |
| PaymentDtl.Amount | NUMERIC | Payment amount |
| PaymentDtl.OrdId | INT | Order reference |
| PaymentDtl.StyleNo | VARCHAR | Style |

#### 2.2.8 Pro_ReqJob_1 / Pro_ReqJob_1_PcsGrn — Job Order Fabric Requirement

Tracks fabric requirements and consumption for job orders:

| Column | Type | Purpose |
|---|---|---|
| OrdId | INT | Order |
| StyleNo | VARCHAR | Style |
| CoyId | INT | Unit/company |
| FabId | INT | Fabric type |
| ColId | INT | Color |
| CntId | INT | Yarn count |
| GSM, GG, LL | Various | Fabric specifications |
| DiaId / FinDiaId | INT | Knit/Finish diameter |
| ReqKgs / ReqMtr | NUMERIC | Required kgs/meters |
| PcsGrnId | INT | Linked piece GRN ID (in _PcsGrn variant) |

### 2.3 Budget for Job Work (frmBudgetNew_JobWork)

This form creates production budgets specifically for outsourced/job work orders. It extends the regular budget form (documented in Module 9) with:

- **Rate entry per stage**: Defines CMT (Cut-Make-Trim) rates per production stage for the selected supplier
- **Stage-wise costing**: Each outsourced process stage has a separate rate entry
- **Comparison with in-house rates**: Side-by-side view of in-house vs job work rates
- **Order/style selection**: Budget is created per order/style/supplier combination
- **Links to**: `Mas_JobWrkComp` (stage definitions), `Pro_Prod_PartwiseRate` (part-wise rates)

### 2.4 Contract Allotment (frmContractAllotment / _New)

Contract allotment manages the assignment of production work to external contractors:

**Workflow**:
1. Select an order (from `OrderMas`) and style
2. View available production stages from `Prod_Sequence`
3. Select a contractor (from `Mas_Emp` where the employee acts as a contractor)
4. Allot quantity per color/size/stage to the contractor
5. System updates the supplier order (`SuppOrdMas`/`SuppOrdDet`)

**Key features**:
- Color-wise, size-wise, stage-wise allotment
- Multiple contractors per order/stage
- Balance tracking (allotted vs produced vs received)

**`vue_ContractLedger_New_Balcheck`** — A view that produces a full contractor ledger by UNION-ing:
- **Credits**: Production bills from `Trs_ProdBillEntry`/`Trs_ProdBillDetNew`/`Trs_ProdBillMasNew` — summing `NetAmount` grouped by stage, contractor, order
- **Debits**: Payments from `PaymentMas`/`PaymentDtl` where `ReserveFlg IN ('P','V','C','R','T')`
- **Credit (Debit Notes)**: Reversals from `PaymentMas` where `ReserveFlg = 'D'`

Payment types: Payment (P), Advance (V), Credit Note (C), Reserve (R), Others (T), Debit Note (D)

### 2.5 Job Order List & Cutting Job Order (FrmJobOrderList / frmCuttingJobOrder)

**FrmJobOrderList**: A search/filter form displaying all job orders with status. Filters by order, supplier, stage, status (pending/completed).

**frmCuttingJobOrder**: Issues cutting job orders to external cutting contractors.
- Selects fabric lots allocated for cutting
- Specifies cut quantities per size
- Prints cutting job order reports (`Rpt_CuttingJobOrder.rpt`, `Rpt_CuttingJobOrder_GST*.rpt`)
- Links to `Pro_ReqJob_1` for fabric consumption tracking

### 2.6 Supplier Order Sheet — Semi-Finished (FrmSuppOrdSheet_Semi)

Creates order sheets sent to suppliers for semi-finished goods production:
- Generates from parent order (`OrderMas`)
- Specifies quantities per color/size/part for the supplier
- Writes to `SuppOrdMas`/`SuppOrdDet`
- Links to supplier production sequence
- Printed via `RptSupplierOrderSheet.rpt` / `RptSupplierOrderSheet_Large.rpt`

### 2.7 Supplier Production Sequence & Tech Data Sheet

**FrmSuppProdSequence**: Defines the production process route at the supplier's facility:
- Maps stages from `Mas_JobWrkComp` (work components) in sequence
- Each stage has a department (`Mas_Dept`) and sequence number
- Writes to `Prod_Sequence` linked to the supplier order

**FrmSuppTechDataSheet**: Creates technical specification documents sent to suppliers:
- Includes fabric specs (GSM, dia, count, design)
- Size-wise measurements
- Quality parameters and tolerances
- Print/export for supplier communication

### 2.8 Job Work Piece Return (frmJobWorkPcsReturn)

Processes piece returns from job work suppliers:
- Records pieces returned per color/size/stage
- Updates `SuppPcs_StockTable`/`SuppPcs_StockTableQty` (decrements supplier stock)
- Updates `ST_Supp_Production_Data` rejection/rework quantities
- Creates a return DC (delivery challan)

### 2.9 Stored Procedures

| Procedure | Purpose |
|---|---|
| **SP_ST_Supp_Production_Data** | Upserts running totals in `ST_Supp_Production_Data` for five transaction types: PRDN (production), DC (delivery), GRN (receipt), REJ (rejection), REWRK (rework). Uses `+`/`-` flag for increment/decrement. |
| **Sp_WBS_Supp_Production** | Posts supplier production data to `WBS_Supp_Production` for Commando Cloud sync. Handles insert (Y), DC update (PD), production update (PR), schedule update (SC). Computes BGColor status. Updates `OrderQty`/`OrderWithExsQty` from `SuppOrdDet`. Computes `Finish_Percent`. |
| **Sp_PartyWiseJobOrderBal** | Calculates party-wise job order fabric balance. Unions: fabric delivered via job order DC (`TRS_del1`/`TRS_del2` where `trtype=21`), fabric returned (`trs_grn1` where `GrnType='FabricRetToUnit'`), and fabric consumed (`Pro_ReqJob_1_PcsGrn`). Reports balance = Delivered − Returned − Consumed. |
| **Sp_UnitWiseJobOrderBal_Reg_Custom** | Unit-wise job order balance register (custom layout). Similar logic to party-wise but also includes lot return tracking, piece weight average, and cut quantity from `Temp_Dtl`. |
| **Sp_UnitWiseJobOrderBal_Reg_OCR** | Simplified OCR version of job order balance with fabric-wise kgs/mtr balance. |
| **SP_Update_Job** | Updates workflow planning from Commando Cloud. Handles start/finish dates with role-based logic (C=Commando, other roles). For Commando role: sets `VFlag_Start`/`VFlag_Finish` to 'C'. Integrated with `App_ApprovalSent`/`App_ApprovalPlan` for approval tracking. |
| **Supp_PROC_Stock_ProdPieces** | Manages supplier piece stock. Inserts/updates `SuppPcs_StockTable` and `SuppPcs_StockTableQty` for production entries. Tracks good pieces vs rejections. |
| **Supp_PROC_Stock_ProdPieces_Delete** / **_Update** | Delete/update counterparts for supplier piece stock |
| **SP_FabReqCalc_Domestic_joborder** | Calculates fabric requirement for domestic and job order types including yarn dyeing, loss percentages per process stage, dept sequence traversal |

### 2.10 Views & Triggers

**Views**:
- **vue_ContractLedger_New_Balcheck**: Full contractor financial ledger (credits from production bills, debits from payments, credit notes from debit notes)

**Triggers**:
- **Trg_Mas_JobWrkComp_Update**: Sets `UpdateFlg = 1` on `Mas_JobWrkComp` whenever any column (except `server_id`/`UpdateFlg`) is modified — enables cloud sync detection

### 2.11 Reports

| Report File | Purpose |
|---|---|
| `Rpt_CuttingJobOrder.rpt` | Cutting job order printout |
| `Rpt_CuttingJobOrder_GST*.rpt` | GST variants of cutting job order (4 variants) |
| `Rpt_CuttingJobOrderCancel.rpt` | Cutting job order cancellation |
| `Rpt_JobwrkInvoice.rpt` / `.vb` | Job work invoice |
| `RptSupplierOrderSheet.rpt` / `.vb` | Supplier order sheet printout |
| `RptSupplierOrderSheet_Large.rpt` | Large-format supplier order sheet |
| `RptSupplierOrderSheet1.rpt` | Alternate supplier order sheet layout |
| `RptSupp_Process_Bill.mrt` | Supplier process bill (Stimulsoft) |
| `RptSupp_Process_Cost.mrt` | Supplier process cost report |
| `RptSupp_Process_Plan.mrt` | Supplier process plan report |
| `RptShiftWagesReg.rpt` | Shift wages register (contractor) |

---

## 3. SUB-MODULE B — Quality, Lab & Approvals

### 3.1 Forms Inventory

| Form Class | Purpose |
|---|---|
| `FrmLabTest` | Enter/view lab test results for garments, bit, accessories, yarn dyeing |
| `FrmNewLabTest` | Enhanced lab test entry form |
| `FrmLabTestInputParameters` | Define input parameters for lab tests |
| `FrmLabTestParameters` | Manage lab test parameter master (shrinkage, spirality, pilling, etc.) |
| `FrmLabTestStages` | Define lab test stages (wash stages, drying methods) |
| `frmLotApproval` | Approve/reject fabric lots based on test results |
| `FrmLotRegister` | View lot register — all lots with status |
| `FrmLotSeparate` | Separate/split lots for re-testing or partial approval |
| `frmLotWiseDtl` | View lot-wise detail (quantities, test results, approvals) |
| `FrmAccItemApproval` | Approve accessory items before production use |
| `FrmNonReturnDCApproval` | Approve non-returnable delivery challans |
| `FrmReprocess_Approval` | Approve reprocessing of rejected goods |
| `frmGrammage` | Record/check fabric grammage (GSM) measurements |

### 3.2 Data Model — Core Tables

#### 3.2.1 LabTestMas — Lab Test Master

| Column | Type | Purpose |
|---|---|---|
| Id | INT (PK) | Test identity |
| TestNo | VARCHAR | Test number |
| Finyear | VARCHAR | Financial year |
| EntryDate | DATE | Test date |
| OrdId | INT (FK → OrderMas) | Order reference |
| StyleNo | VARCHAR | Style reference |
| Coycode | INT (FK → Mas_Exporter) | Unit/company |
| Grp | CHAR(1) | Test group: G=Garments, B=Bit, A=Accessories, Y=Yarn Dyeing |
| Remarks | VARCHAR | Overall test remarks |

#### 3.2.2 LabTestGrpMas — Lab Test Group Master (Per Sample)

| Column | Type | Purpose |
|---|---|---|
| Id | INT (FK → LabTestMas) | Parent test |
| Slno | INT | Sample serial number |
| G_SampleType | INT | 0=Sample, 1=Random |
| Status | CHAR(1) | P=Pass, F=Fail |
| DryType | CHAR(1) | F=Flat Dry, T=Tumble Dry, L=Line Dry |
| **Garment fields**: | | |
| G_SizeId | INT | Garment size tested |
| G_Clr | INT | Garment color tested |
| G_BWGSM | NUMERIC | Before-wash GSM |
| G_AWGSM | NUMERIC | After-wash GSM |
| G_ReqdGSM | NUMERIC | Required GSM |
| G_FabId | INT | Garment fabric |
| **Bit fields**: | | |
| B_Clr, B_FabId, B_DesignId | INT | Bit sample identifiers |
| B_LotNo | VARCHAR | Bit lot number |
| B_BWGSM, B_AWGSM, B_ReqdGSM | NUMERIC | GSM before/after wash, required |
| B_Dia1, B_Dia2, B_Dia3 | NUMERIC | Diameter measurements (3 samples) |
| B_BW1, B_BW2, B_BW3 | NUMERIC | Before-wash measurements |
| B_AW1, B_AW2, B_AW3 | NUMERIC | After-wash measurements |
| **Accessories fields**: | | |
| A_AccTypeId | INT | Accessory type |
| A_Clr | INT | Accessory color |
| **Yarn Dyeing fields**: | | |
| Y_Clr | INT | Yarn color |
| Y_Count | INT | Yarn count |

#### 3.2.3 LabTestGrpDet — Lab Test Group Detail (Per Parameter/Stage)

| Column | Type | Purpose |
|---|---|---|
| Id | INT (FK → LabTestMas) | Parent test |
| Slno | INT (FK → LabTestGrpMas) | Sample serial |
| ParameterCode | INT (FK → Mas_LabTestParameters) | Test parameter |
| StageCode | INT (FK → Mas_LabTestStages) | Wash/test stage |
| Value | NUMERIC | Measured value |
| Remarks | VARCHAR | Per-parameter remarks (also used for Pass/Fail status) |

#### 3.2.4 Mas_LabTestParameters — Lab Test Parameter Master

| Column | Type | Purpose |
|---|---|---|
| Id | INT (PK) | Parameter identity |
| Parameter | VARCHAR | Parameter name (e.g., "Shrinkage Length", "Spirality", "Pilling") |
| IndexNo | INT | Display order (lower = first). Special value 900 = computed Status row |

#### 3.2.5 Mas_LabTestStages — Lab Test Stage Master

| Column | Type | Purpose |
|---|---|---|
| TestCode | INT (PK) | Stage code |
| TestName | VARCHAR | Stage name (e.g., "After 1st Wash", "After 3rd Wash", "After 5th Wash") |
| IndexValue | INT | Column display order |

#### 3.2.6 Lot Tables (Trs_LotMas / Mas_Lot)

| Table | Key Columns | Purpose |
|---|---|---|
| `Mas_Lot` | LotId, LotNo, LotDesc | Lot master definition |
| `Trs_LotMas` | LotId, OrdId, FabId, ColId, Status | Lot status per order/fabric/color |

Lot status values: Pending, Approved, Rejected, Separated

### 3.3 Lab Test Entry (FrmLabTest / FrmNewLabTest)

**Workflow**:
1. Create a new lab test by selecting order, style, unit, and test group (Garments/Bit/Accessories/Yarn Dyeing)
2. For each sample, record specimen details (fabric, color, size, drying method)
3. Enter measured values in a matrix: rows = parameters (shrinkage, spirality, etc.), columns = wash stages (1st, 3rd, 5th wash)
4. System computes overall Pass/Fail per sample based on parameter thresholds
5. Results are stored in `LabTestMas` → `LabTestGrpMas` → `LabTestGrpDet`

**Lab test types**:
- **Garments (G)**: GSM before/after wash, size-specific measurements
- **Bit (B)**: Fabric bit testing with 3 diameter readings, before/after wash GSM, lot-tracked
- **Accessories (A)**: Accessory item quality checks
- **Yarn Dyeing (Y)**: Yarn color fastness, count-based tests

### 3.4 Lab Test Configuration

**FrmLabTestParameters**: CRUD for test parameters (shrinkage length/width, spirality, pilling, color fastness, etc.). `IndexNo` controls display order.

**FrmLabTestStages**: CRUD for wash/test stages (1st wash, 3rd wash, 5th wash, etc.). `IndexValue` controls column order.

**FrmLabTestInputParameters**: Defines which parameters are applicable per test type and input method.

### 3.5 Lot Management

**frmLotApproval**: Approve or reject fabric lots based on lab test results and inspection:
- Displays lab test results for the lot
- Records approval/rejection with remarks
- Updates `Trs_LotMas` status

**FrmLotRegister**: Register view of all lots with filters (order, fabric, color, status).

**FrmLotSeparate**: Splits a lot into sub-lots when partial approval is needed (e.g., part of a lot passes testing).

**frmLotWiseDtl**: Detailed view per lot showing all transactions — receipts, deliveries, production consumption, balances.

### 3.6 Item & DC Approvals

**FrmAccItemApproval**: Approval workflow for accessory items:
- Reviews accessory items received against PO specifications
- Approve/reject with remarks
- Links to `App_ApprovalSent`/`App_ApprovalPlan` tables

**FrmNonReturnDCApproval**: Approval for non-returnable delivery challans:
- Reviews DCs marked as non-returnable
- Requires approval before the goods are considered consumed
- Tracks approval date and approver

**FrmReprocess_Approval**: Approval for reprocessing rejected materials:
- Displays rejected quantities and proposed reprocessing plan
- Approves/rejects the reprocess request
- On approval, triggers process issue transactions

### 3.7 Grammage (frmGrammage)

Records fabric grammage (GSM — grams per square meter) measurements:
- Selects fabric roll/lot
- Records multiple GSM readings per roll
- Computes average GSM
- Compares against required GSM from the order specification
- Flags out-of-tolerance readings

### 3.8 Views & Key Queries

**Vue_LabTestGarments**: Comprehensive lab test view that UNION-s two queries:

1. **Parameter values**: Joins `LabTestMas` → `LabTestGrpMas` → `LabTestGrpDet` → `Mas_LabTestParameters` → `Mas_LabTestStages` with full master lookups (order, exporter, season, buyer, sizes, colors, fabrics, designs, accessories, yarn count). Returns measured values per parameter/stage.

2. **Status summary**: Same join structure but outputs a synthetic "Status" parameter row (`IndexNo = 900`) with Pass=1/Fail=0 derived from `LabTestGrpDet.Remarks`.

Result ordered by `IndexNo` (parameters first) then `IndexValue` (stages left to right).

### 3.9 Reports

Lab test and quality reports are primarily rendered through the Stimulsoft/Crystal report viewers using queries from `Vue_LabTestGarments` and related views. No dedicated `.mrt`/`.rpt` files specific to lab testing were found in the Report folder — these are likely generated dynamically through `FrmReport` / `FrmCrysReport` with ad-hoc queries.

---

## 4. SUB-MODULE C — HR, Labor & Payroll Support

### 4.1 Forms Inventory

| Form Class | Purpose |
|---|---|
| `FrmEmpmaster` | Employee master data — add/edit/delete employees and contractors |
| `Frm_ProductionWages` | Enter production wages per contractor per order/stage |
| `Frm_ProdWagesDept` | Department-wise production wages view |
| `Frm_ProdWagesStage` | Stage-wise production wages entry/view |
| `FrmProdShiftWagesReg` | Shift wages register — wages paid per shift |
| `FrmHourlySetting1` | Configure hourly production targets and rates |
| `frmHours` | Manage hour/shift definitions |
| `frmDailyinout` | Daily inward/outward material movement register |
| `FrmDeptMasterNew` | Department master — add/edit departments with process configuration |
| `frmDeptGroup` | Define department groups for reporting/aggregation |
| `frmDeptSettings` | Configure department-level processing settings |
| `FrmMachineCategory` | Define machine categories (knitting, dyeing, cutting, etc.) |
| `FrmMachineMaster` | Machine master — individual machines with category, capacity, unit |
| `FrmMasWorkNature` | Define work nature types (regular, overtime, holiday, etc.) |
| `FrmConcern` | Manage company concerns/entities |

### 4.2 Data Model — Core Tables

#### 4.2.1 Mas_Emp — Employee Master

| Column | Type | Purpose |
|---|---|---|
| ID | INT (PK) | Employee identity |
| EmpName | VARCHAR | Employee/contractor name |
| UpdateFlg | BIT | Cloud sync flag (set by trigger) |
| server_id | INT | Cloud server reference |
| EMP_SERVER_ID | INT | Employee cloud ID |

*Used both for internal employees and external contractors/suppliers in job work context.*

**Trigger**: `Trg_Mas_Emp_Update` — sets `UpdateFlg = 1` on any update (except `server_id`, `UpdateFlg`, `EMP_SERVER_ID`) for cloud sync.

#### 4.2.2 Trs_ProdWages — Production Wages Transaction

| Column | Type | Purpose |
|---|---|---|
| Coycode | INT | Company/unit |
| Ordid | INT (FK → OrderMas) | Order |
| StyleNo | VARCHAR | Style |
| StageId | INT (FK → Mas_JobWrkComp) | Production stage |
| PartId | INT (FK → Mas_Part) | Garment part |
| EmpId | INT (FK → Mas_Emp) | Worker/contractor |
| ProdPcs | INT | Pieces produced in this entry |
| ShiftWages | NUMERIC | Wages for this entry |
| Addl_Amount | NUMERIC | Additional amount |
| EntryDate | DATE | Wage entry date |
| no_of_persons | INT | Number of persons working |

#### 4.2.3 Trs_ProdShiftWages — Production Shift Wages

Per-shift wage recording for finer granularity than daily wages.

#### 4.2.4 Mas_Dept — Department Master

| Column | Type | Purpose |
|---|---|---|
| DeptId | INT (PK) | Department identity |
| DeptName | VARCHAR | Full department name |
| ShortDept | VARCHAR | Abbreviated name |
| OrderSno | INT | Display order |
| InputType | CHAR(1) | Input material type: Y=Yarn, F=Fabric |
| OutputType | CHAR(1) | Output material type: Y=Yarn, F=Fabric |
| SemiFinish | CHAR(1) | Semi-finished output flag |
| RecMethod | CHAR(1) | Receipt method: D=DC-wise, O=Order-wise |

#### 4.2.5 Mas_JobWrkComp — Job Work Component/Stage Master

| Column | Type | Purpose |
|---|---|---|
| Id | INT (PK) | Stage identity |
| WorkComplDet | VARCHAR | Work completion description |
| DeptId | INT (FK → Mas_Dept) | Linked department |
| UpdateFlg | BIT | Cloud sync flag |

#### 4.2.6 Mas_Machine / Mas_MachineCategory

| Table | Key Columns | Purpose |
|---|---|---|
| `Mas_MachineCategory` | ID, CategoryName | Machine type categories |
| `Mas_Machine` | ID, MachineName, CategoryID, UnitID, Capacity | Individual machines |

#### 4.2.7 Mas_WorkNature

| Column | Type | Purpose |
|---|---|---|
| ID | INT (PK) | Work nature identity |
| NatureName | VARCHAR | e.g., "Regular", "Overtime", "Holiday" |

### 4.3 Employee Master (FrmEmpmaster)

Full CRUD for employee and contractor records:
- Name, contact details, designation
- Used by production wages, contract allotment, lab test assignment
- Cloud sync via `Trg_Mas_Emp_Update` trigger
- Referenced by: `Trs_ProdWages.EmpId`, `Trs_ProdBillMasNew.EmpId`, `PaymentMas.EmpId`, `Trs_SuppProdentry`

### 4.4 Production Wages (Frm_ProductionWages / Frm_ProdWagesDept / Frm_ProdWagesStage)

**Frm_ProductionWages**: Main wages entry form:
- Select order, style, part, contractor/worker, production date
- Enter pieces produced and wage amount per production stage
- System may auto-compute wages from rates in budget (`Pro_Prod_PartwiseRate`)
- Writes to `Trs_ProdWages`

**Frm_ProdWagesDept**: Department-wise aggregation view of production wages.

**Frm_ProdWagesStage**: Stage-wise view — groups wages by production stage for cost analysis.

### 4.5 Shift Wages Register (FrmProdShiftWagesReg)

Displays shift-level wages for analysis. Powered by **SP_Vue_RptShiftWagesReg** which dynamically creates/alters `Vue_RptShiftWagesReg`:

The view computes per record:
- **OrderQty**: From `OrderQtyDtl` (sum of CutPlanQty per order/style/part)
- **CuttingQty**: From `Trs_Prodentry`/`Trs_ProdentryQty` where `StageId = 1` (cutting) OR from `Trs_PcsGrn1`/`Trs_PcsGrn2` where `TargetStageID = 1`
- **CumulativeOutput**: Total production up to current stage from `Trs_ProdentryQty` or `Trs_PcsGrn2` grouped by stage
- **CumCost**: Cumulative wages from `Trs_ProdWages` (ShiftWages + Addl_Amount)
- Joins to: `OrderMas`, `Mas_Emp`, `Mas_Part`, `Mas_JobWrkComp`

### 4.6 Hourly Settings & Hours

**FrmHourlySetting1**: Configures hourly production targets:
- Sets target output per hour per production stage
- Used for real-time production monitoring
- Links to hourly production entry forms (Module 6)

**frmHours**: Manages shift/hour definitions:
- Defines shift timings (start, end, break)
- Used by hourly production and shift wages calculations

### 4.7 Daily In/Out (frmDailyinout)

Displays a comprehensive daily material movement register. Powered by **Vue_Dailyinout** — a massive UNION view combining 8+ separate queries:

| Source | Trn | Content |
|---|---|---|
| `Trs_Del1`/`Trs_Del2`/`StockTable` | '2' (Out) | Fabric/yarn/acc deliveries: Process Issue, Re-Process Issue, Purchase Return, Acc.Issue, Godown Transfer |
| `Trs_Grn1`/`Trs_GRN2`/`StockTable` | '1' (In) | Fabric/yarn/acc receipts: Process Receipt, Re-Process Receipt, Purchase |
| `Trs_Pcs1`/`Trs_Pcs2` | '2' (Out) | Piece goods deliveries: Process, Unit Transfer, Despatch |
| `Trs_PcsGrn1`/`Trs_PcsGrn2` | '1' (In) | Piece goods receipts |
| `Trs_Gen1`/`Trs_Gen2` | '2' (Out) | General goods deliveries (returnable/non-returnable) |
| `Trs_GenGrn1`/`Trs_GenGrn2` | '1' (In) | General goods receipts |
| `Trs_MultiPrs_Grn1`/`_Grn2`/`_Grn3` | '1'/'2' | Multi-process GRN receipts and corresponding issues |

Each record includes: department, date, doc number, party, order, style, quantity (kgs/mtr/pcs), transaction type description, stock details (fabric, color, count, GSM, dia, lot, design), balance kgs, balance percentage, and remarks.

Balance tracking uses two auxiliary views:
- **Vue_DailyInOutBalance**: DC-wise balance (used when `Mas_Dept.RecMethod = 'D'`)
- **Vue_DailyInOutOrdBalance**: Order-wise balance (used when `RecMethod = 'O'`)

### 4.8 Department & Machine Setup

**FrmDeptMasterNew**: Full department master management:
- Department name, short name, display order
- Input/output material types (Yarn/Fabric)
- Receipt method (DC-wise/Order-wise)
- Semi-finished flag
- Department group assignment

**frmDeptGroup**: Groups departments for consolidated reporting (e.g., all dyeing departments, all finishing departments).

**frmDeptSettings**: Per-department processing settings (loss percentages, capacity, default party, etc.).

**FrmMachineCategory / FrmMachineMaster**: Machine setup for production capacity planning:
- Categories: Knitting, Dyeing, Cutting, Sewing, Finishing, etc.
- Each machine: name, category, unit, capacity, status

### 4.9 Work Nature & Concern

**FrmMasWorkNature**: Define types of work (Regular, Overtime, Holiday, Night Shift) — used in wage calculations.

**FrmConcern**: Manage company concern/entity definitions for multi-company operations.

### 4.10 Views, SPs & Triggers

| Object | Type | Purpose |
|---|---|---|
| **Vue_Dailyinout** | View | Comprehensive daily material in/out register (8+ UNION queries) |
| **SP_Vue_RptShiftWagesReg** | SP | Dynamically creates/alters `Vue_RptShiftWagesReg` view for shift wages reporting with order qty, cutting qty, cumulative output, and cumulative cost |
| **Trg_Mas_Emp_Update** | Trigger | Sets `UpdateFlg = 1` on `Mas_Emp` for cloud sync |
| **Trg_Mas_Dept_Update** | Trigger | Sets `UpdateFlg` on `Mas_Dept` changes |

### 4.11 Reports

| Report File | Purpose |
|---|---|
| `RptShiftWagesReg.rpt` | Shift wages register printout |
| `RptProduction.rpt` / `.vb` | Production output report |
| `Rpt_LinePerformance.rpt` / `1.rpt` | Sewing line performance |
| `Rpt_LineProdStmt.rpt` | Line production statement |

---

## 5. SUB-MODULE D — Reporting, Analytics & Integrations

### 5.1 Forms Inventory

| Form Class | Purpose |
|---|---|
| `FrmCrysReport` | Crystal Reports (.rpt) viewer — loads and displays any Crystal Report |
| `FrmReport` | Stimulsoft Reports (.mrt) viewer — loads and renders Stimulsoft reports |
| `frmRpt` | Alternate/simplified report viewer |
| `FrmRegister` | Generic register viewer with configurable data source |
| `FrmStatusReg` | Order/production status register |
| `frmMIS` | MIS (Management Information System) dashboard |
| `FrmMISSetting` | Configure MIS dashboard settings and data sources |
| `frmPrintDesign` | Design/configure print layouts |
| `frmBarcodeReadingNew` | Read barcodes for production/stock operations |
| `FrmSMSMailSetup` | Configure SMS and email integration settings |
| `frmSearch` | Global search across orders, parties, stocks, transactions |
| `FrmBuyerStatus` | Buyer-wise order status overview |
| `frmComboWiseReqRpt` | Combo-wise (color combination) requirement report |
| `FrmDcWiseDtl` | DC-wise detail report for any delivery challan |
| `FrmSewingReq` | Sewing requirement report |

### 5.2 Crystal Reports Viewer (FrmCrysReport)

Generic Crystal Reports engine form:
- Accepts a report file path (`.rpt`) and parameters
- Renders via the Crystal Reports runtime (`CrystalDecisions.CrystalReports.Engine`)
- Supports export to PDF, Excel, Word
- Used by all modules to display Crystal Report formatted output
- 180+ .rpt templates available (see catalog below)

### 5.3 Stimulsoft Reports Viewer (FrmReport / frmRpt)

Stimulsoft MRT report rendering:
- Accepts `.mrt` template path and data connection
- Renders via Stimulsoft reporting engine
- Supports interactive preview, export, print
- 150+ .mrt templates available (see catalog below)
- Some reports have code-behind `.cs` files for custom data logic

### 5.4 Register & Status Views (FrmRegister / FrmStatusReg)

**FrmRegister**: Configurable data grid viewer:
- Loads data from a stored procedure or view
- Provides filtering, sorting, grouping
- Can export to Excel
- Used as a base form for various register views

**FrmStatusReg**: Order/process status register:
- Shows production status across all departments
- Color-coded status indicators
- Filters by buyer, order, date range, department

### 5.5 MIS Dashboard (frmMIS / FrmMISSetting)

**frmMIS**: Management Information System dashboard:
- Displays key metrics: pending orders, production throughput, delivery pending, billing status
- Likely pulls from summary tables and pre-computed views
- May include charts (using Chart control or Crystal Reports chart)

**FrmMISSetting**: Configuration for MIS:
- Select which metrics/KPIs to display
- Configure data sources and refresh intervals
- Set user-specific dashboard layouts

### 5.6 Print Design (frmPrintDesign)

Allows customization of print layouts for DCs, invoices, and reports:
- Configure header/footer content
- Set company logo and address block
- Define column visibility and order
- Likely saves settings to a configuration table

### 5.7 Barcode Reading (frmBarcodeReadingNew)

Barcode scanner integration for production and stock operations:
- Reads barcode data (from `RptBarcodePrint_*.rpt` printed labels)
- Supports bundle barcodes, fabric roll barcodes, piece barcodes
- Posts stock/production transactions from scanned data
- Uses **SP_Barcode_Production_Posting**: Automated production entry from barcode bundle/piece scans — creates `Trs_Prodentry`/`Trs_ProdentryQty` records from barcode data
- Also uses **SP_BundleBarcode_Check** and **SP_PcsBarcode_Check** / **SP_PcsBarcode_Check_Rejection** for validation

### 5.8 SMS & Email Integration (FrmSMSMailSetup)

Configures outbound notifications:
- Email server settings (SMTP configuration)
- SMS gateway integration
- Template management for automated notifications
- Links to `WF_MailTemplate` table for mail template definitions
- Used by **Sp_Maillist1** for automated workflow notifications

**Sp_Maillist1** — Complex mail list generation procedure:
- Generates notification emails based on workflow status
- Parameters: assignee list, template ID, date range, filter arguments
- Reads `WF_MailTemplate` for template configuration (display fields, date criteria, upcoming days, pending type)
- Pending types: C=Critical (5-day due), M=Medium (2-day due), C,M=Both
- Date filters: `tilldate`, `today`, `upcoming`
- Builds dynamic SQL from `WF_MailDisplayList` fields
- Filters by template-defined criteria and assignee lists

### 5.9 Search (frmSearch)

Global search form:
- Search across orders, parties, fabrics, colors, styles
- Likely queries multiple master tables with LIKE filters
- Returns results in a grid with drill-down to source forms

### 5.10 Buyer Status & Misc Reports

**FrmBuyerStatus**: Buyer-wise order status dashboard showing order progress per buyer.

**frmComboWiseReqRpt**: Color-combination-wise requirement report — shows fabric/accessory requirements grouped by color combo for an order.

**FrmDcWiseDtl**: Drill-down into any DC showing line items, quantities, rates.

**FrmSewingReq**: Sewing department requirement — quantities needed per size/color for sewing line planning.

### 5.11 Meeting Review & Workflow

The meeting/workflow system integrates with the Commando Cloud platform for production planning review:

#### SP_WBS_MeetingView

Main meeting review procedure:
- **Parameters**: Coycode, BuyerID, BuyerDeptId, FromDate, ToDate, OrderType, OperationList
- Queries `WF_WorkFlow_Planning` joined with `Wf_OperationMaster`, `WF_UserMas`, `OrderMas`, `OrderMas2`, `OrderStyleDtl`
- Groups by order/style/operation to show consolidated status
- Computes 5 status levels per start and finish:

| Status | Condition | Color |
|---|---|---|
| ON BEFORE | Actual date < Plan date | Green |
| ON TIME | Actual date = Plan date | Green |
| ON DELAY | Actual date > Plan date | LightGreen |
| ON DUE | Not started/finished, plan date ≤ today | Dynamic (wbs_getColor function) |
| UPCOMING | Not started/finished, plan date in future | Blue |

- Also tracks: finish percentage (via `Fun_Meet_Finish_Perc`), style quantity, delivery date

#### SP_Meet_ApprovalDetails

Retrieves approval details for a specific workflow planning item:
- Joins `App_ApprovalPlan` → `OrderMas` → `Wf_OperationMaster` → buyer/exporter/merchandiser masters
- Returns: plan date, feedback date, status, remarks, sent date, AWB (airway bill) number, courier name
- Links to `App_ApprovalSent`, `App_ApprovalDc`, `App_CourierMas`

#### Supporting Meeting Procedures

| Procedure | Purpose |
|---|---|
| **selectMeetingDept** | Lists departments with active schedule items (on-time started, delayed started, not started, finished) for yesterday's date |
| **MeetingReportChart** | Generates chart data for a single department — percentages of on-time vs delayed vs not-done for start and finish, using `FN_MeetingReportAverage` for % calculation |
| **MeetingChartAllDept** | All-department chart data — summarizes start/end status (on-time, delayed, not-done) across all departments |
| **MeetAccDetails** | Accessory status for meeting — requirement, PO, GRN, DC, return, stock, transfer quantities per accessory item |
| **Meet_Accessories** | Simplified accessory overview — item, UOM, required qty, PO qty, GRN qty, status percentage, amount |
| **UpdateMeeting_Posting** | Refreshes `MR_Fabric` table for meeting review — aggregates prog qty, in qty, out qty, PO qty from yarn/knitting/fabric transactions per order/department. Computes actual start/finish dates based on 95% receipt threshold. |

#### Key Workflow Tables

| Table | Purpose |
|---|---|
| `WF_WorkFlow_Planning` | Workflow planning items: order, style, operation, plan dates, actual dates, VFlag status, finish flag |
| `Wf_OperationMaster` | Operation definitions: OpCode, OpName, Type (O=One-time, other=Start+Finish), DeptCode, SeqNo |
| `WF_UserMas` | Workflow users: UserID, UserRole (C=Commando) |
| `WF_MailTemplate` | Email notification templates |
| `WF_MailDisplayList` | Configurable display fields for email content |
| `App_ApprovalPlan` | Approval plan items per order/style/operation |
| `App_ApprovalSent` | Approval sent tracking (sent date, sent flag) |
| `App_ApprovalDc` | Approval DC (airway bill tracking for physical samples) |
| `App_CourierMas` | Courier master for sample shipment tracking |
| `MR_Fabric` | Meeting review fabric status (computed aggregation table) |
| `trs_schedule` / `vw_Trs_ScheduleNew` | Production schedule per order/department |

### 5.12 Mail List Integration (Sp_Maillist1)

See § 5.8 above for details. This procedure is the backbone of automated email notifications, integrated with the workflow planning system and configurable via `FrmSMSMailSetup`.

---

## 6. Report File Catalog

### 6.1 Stimulsoft Reports (.mrt) by Category

**Total: ~150 .mrt files in Report folder**

#### Delivery Challans (DC)

| File | Purpose |
|---|---|
| AccDC.mrt | Accessories delivery challan |
| AccDC_GoDown.mrt | Accessories DC — godown transfer |
| AccDC_SGST.mrt | Accessories DC with SGST |
| AccDC_SGST_Cost.mrt | Accessories DC with SGST + cost |
| CourierDC.mrt | Courier delivery challan |
| DC_GST.mrt / DC_GST_1.mrt | Generic DC with GST |
| FabDC.mrt | Fabric delivery challan |
| FabDC_GoDown.mrt | Fabric DC — godown transfer |
| FabDC_PackList.mrt / _HalfPage.mrt | Fabric DC packing list |
| FabDC_SGST.mrt | Fabric DC with SGST |
| FabDC_SGST_Cost.mrt | Fabric DC with SGST + cost |
| FabDC_SGST_Cost_Full.mrt | Full-page fabric DC |
| FabDC_SGST_Cost_PrsRt.mrt / _OrdWise.mrt | Fabric DC with process rate |
| FabDC_SGST_Cost _Cut.mrt | Fabric DC for cutting |
| FabNewDC.mrt | New-format fabric DC |
| FabSalesDC.mrt / _SGST.mrt / CumInv.mrt | Fabric sales DC variants |
| GenDC.mrt | General goods DC |
| GenDC_SGST.mrt / _Cost.mrt / _Cost_a4.mrt | General DC variants |
| PcsDc.mrt / PcsDc1.mrt | Piece goods DC variants |
| PcsDc -Acc.mrt / PcsDc_ACC.mrt / PcsDC_Acc_Pre.mrt | Piece DC for accessories |
| PcsDc_WithRate.mrt | Piece DC with rate |
| PcsDc_SGST_Large.mrt | Large-format piece DC |
| PcsDc1_SGST.mrt / _Bit.mrt / _Cost.mrt / _Cost_1.mrt / _Cost_Large.mrt / _Cost_old.mrt / _Panel.mrt | Piece DC SGST variants |
| PcsDc1Rework_SGST.mrt | Rework piece DC |
| PcsDcNew.mrt | New-format piece DC |
| PcsPanelRejDcNew.mrt | Panel rejection DC |
| PcsRetDc.mrt | Piece return DC |
| PanelDc1Rework_SGST.mrt | Panel rework DC |
| RPtAccDcRet.mrt / RPtAccDcRetNew.mrt | Accessories DC return |
| RPtFabDcRet.mrt / RPtFabDcRetnew.mrt | Fabric DC return |
| RptOrdWiseFabDC.mrt | Order-wise fabric DC |
| RptOrdWiseYarnDC.mrt | Order-wise yarn DC |
| RptFabNewDc.mrt | New-format fabric DC report |
| Woven_FabDC_SGST_Cost.mrt | Woven fabric DC |
| YarnDC.mrt | Yarn delivery challan |
| YarnDc_GoDown.mrt | Yarn DC godown transfer |
| YarnDC_SGST.mrt / _Cost.mrt / _Cost_Full.mrt | Yarn DC variants |
| YarnDCWithoutPrg.mrt / _SGST.mrt / _SGST_Cost.mrt | Yarn DC without program |
| YarnDCWithSelPrg.mrt / _SGST.mrt / _SGST_Cost.mrt | Yarn DC with selected program |
| YarnNewDC.mrt / RptYarnNewDc.mrt | New-format yarn DC |
| YarnSalesDC.mrt / _SGST.mrt / CumInv.mrt | Yarn sales DC |

#### GRN (Goods Received Notes)

| File | Purpose |
|---|---|
| AccGRN.mrt | Accessories GRN |
| AccGRNPO.mrt | Accessories GRN from PO |
| AccDirectGRN.mrt | Direct accessories GRN |
| FabGRN.mrt | Fabric GRN |
| FabGRN_MultiPrs.mrt | Multi-process fabric GRN |
| FabGRN_PackList.mrt | Fabric GRN packing list |
| FabNewGRN.mrt | New-format fabric GRN |
| GenGRN.mrt | General goods GRN |
| Woven_FabGRN.mrt | Woven fabric GRN |
| YarnGRN.mrt / YarnNewGRN.mrt | Yarn GRN |
| RptInward.mrt | Inward receipt report |

#### Opening Stock & Stock Adjustment

| File | Purpose |
|---|---|
| AccOpening.mrt | Accessories opening stock |
| FabOpening.mrt | Fabric opening stock |
| YarnOpening.mrt | Yarn opening stock |
| AccStockAdj.mrt | Accessories stock adjustment |
| FabStockAdj.mrt | Fabric stock adjustment |
| YarnStockAdj.mrt | Yarn stock adjustment |

#### Piece Goods — Despatch, Receipt, Transfer

| File | Purpose |
|---|---|
| PcsDespatch.mrt / _Large.mrt / 1.mrt | Piece despatch reports |
| PcsReceipt.mrt / _Large.mrt / 1.mrt / 1_Large.mrt / 2.mrt / 4.mrt | Piece receipt variants |
| PcsTransfer.mrt | Piece transfer |
| PcsFinishedGoods.mrt | Finished goods entry report |
| PcsShipSample.mrt | Shipment sample report |
| Pcs_IssueToProd.mrt | Issue to production report |

#### Invoices & Billing

| File | Purpose |
|---|---|
| Rpt_SalesInvoice.mrt | Sales invoice |
| Rpt_SalesInvoice_GST.mrt | GST sales invoice |
| Rpt_SalesInvoice_GST_Pcs.mrt | Piece GST sales invoice |
| Rpt_SalesInvoice_GST_WithoutTax.mrt | Invoice without tax |
| Rpt_SalesInvoiceOrdWise_GST.mrt / _WithoutTax.mrt | Order-wise invoice |
| Rpt_DomesticInvoice_GST.mrt | Domestic invoice |
| Rpt_Commercialbilldt.mrt | Commercial bill |
| Rpt_TradeCommission.mrt | Trade commission |
| RptDebitNotePcs.mrt / GST.mrt / GSTpcs.mrt | Piece debit notes |

#### Production & Cutting

| File | Purpose |
|---|---|
| READYTOCUT.mrt / READYTOCUTRETURN.mrt | Ready-to-cut reports |
| RptCutBundleIss.mrt | Cut bundle issue |
| RptCuttingStyle.mrt | Cutting style report |
| RptOrderConfirmation.mrt | Order confirmation |
| Rpt_IssueToLine.mrt | Issue to sewing line |
| Rpt_Program.mrt | Program/routing report |

#### Orders & Registers

| File | Purpose |
|---|---|
| OrderSheetRegFab.mrt | Order-wise fabric register |
| OrderSheetRegYarn.mrt | Order-wise yarn register |
| Form_JJ.mrt | JJ form (custom) |
| RollPrint.mrt | Roll label print |

#### Gandhian (GAN) Accounts & Misc

| File | Purpose |
|---|---|
| FabGanAcc.mrt / FabGanAcc1.mrt | Fabric GAN account |
| YarnGanAcc.mrt / YarnGanAcc1.mrt | Yarn GAN account |
| Rpt_PackingList.mrt | Packing list |
| RptExpenses.mrt | Expenses report |
| RptUnitAck.mrt | Unit acknowledgement |

#### Supplier Process Reports

| File | Purpose |
|---|---|
| RptSupp_Process_Bill.mrt | Supplier process bill |
| RptSupp_Process_Cost.mrt | Supplier process cost |
| RptSupp_Process_Plan.mrt | Supplier process plan |

### 6.2 Crystal Reports (.rpt) by Category

**Total: ~180 .rpt files in Report folder**

#### Order Sheets

| File | Purpose | Code-Behind |
|---|---|---|
| Rpt_OrderSheet.rpt | Basic order sheet | Rpt_OrderSheet.vb |
| Rpt_OrderSheet_det.rpt | Detailed order sheet | Rpt_OrderSheet_det.vb |
| Rpt_OrderSheet_Set.rpt / _1.rpt | Set-wise order sheet | Rpt_OrderSheet_Set.vb |
| Rpt_OrderSheet_Set_Spare.rpt / _1.rpt / 1.rpt | Spare order sheet | Rpt_OrderSheet_Set_Spare.vb |
| Rpt_OrderSheet_Amd.rpt | Order amendment |  |
| Rpt_OrderSheet_Amendment_Set.rpt | Amendment set |  |
| Rpt_OrderSheet_Set_ExsLot.rpt | Excess lot order |  |
| Rpt_Ordersheet_Set_WithRate.rpt | Order with rate |  |
| Rpt_OrderSheet_ColorExs.rpt | Color excess order |  |
| Rpt_OrderSheet_Spare.rpt | Spare order | Rpt_OrderSheet_Spare.vb |
| Rpt_OrderSheetClrwise.rpt / _Spare.rpt | Color-wise order | .vb files |
| Rpt_OrderSheetCmbClrwise.rpt | Combo color-wise |  |
| Rpt_OrderSheetImage.rpt / _Set/_Spare/_SetNew variants | Image order sheets | .vb files |
| Rpt_OrderSheetProformo.rpt / _New.rpt | Proforma order |  |
| Rpt_OrderReg.rpt | Order register | Rpt_OrderReg.vb |

#### Purchase Orders

| File | Purpose | Code-Behind |
|---|---|---|
| Rpt_Po1.rpt / Rpt_Po2.rpt | Generic PO |  |
| Rpt_PoAcc.rpt / _Det.rpt / _GEN.rpt / _old.rpt / 1.rpt | Accessories PO | Rpt_PoAcc.vb, _Det.vb |
| Rpt_PoAcc_Detwithimg.rpt | PO with images | Rpt_PoAcc_Detwithimg.vb |
| Rpt_PoAccwithimg.rpt | PO with images | Rpt_PoAccwithimg.vb |
| Rpt_PoAccCancel.rpt | PO cancellation | Rpt_PoAccCancel.vb |
| Rpt_Pofab.rpt / 1.rpt / New.rpt / _benso.rpt | Fabric PO | Rpt_Pofab.vb, 1.vb |
| Rpt_PofabCancel.rpt | Fabric PO cancel | Rpt_PofabCancel.vb |
| Rpt_PoYarn.rpt / 1.rpt / _benso.rpt | Yarn PO | Rpt_PoYarn.vb, 1.vb |
| Rpt_PoYarnCancel.rpt | Yarn PO cancel | Rpt_PoYarnCancel.vb |
| Rpt_poLedger.rpt / Rpt_PoLedgerAcc.rpt | PO ledger |  |
| Rpt_GENPo.rpt | General PO | Rpt_GENPo.vb |

#### Delivery & Returns

| File | Purpose | Code-Behind |
|---|---|---|
| Rpt_DelFab.rpt / FullPage.rpt | Fabric delivery | Rpt_DelFab.vb, FullPage.vb |
| Rpt_DelYarn.rpt / FullPage.rpt | Yarn delivery | Rpt_DelYarn.vb, FullPage.vb |
| Rpt_DelAcc.rpt / 1.rpt | Accessories delivery | Rpt_DelAcc.vb |
| Rpt_AccAck.rpt / Rpt_AccRetAck.rpt | Accessories ack/return |  |
| Rpt_TransAcc.rpt / New.rpt | Transfer accessories | Rpt_TransAcc.vb |
| Rpt_TransDelFab.rpt / New.rpt/.mrt | Transfer fabric | Rpt_TransDelFab.vb |
| Rpt_TransDelYarn.rpt / New.rpt | Transfer yarn | Rpt_TransDelYarn.vb |
| Rpt_SalesReturnFab.rpt | Fabric sales return | Rpt_SalesReturnFab.vb |
| Rpt_SalesReturnYarn.rpt | Yarn sales return | Rpt_SalesReturnYarn.vb |

#### GRN Reports

| File | Purpose | Code-Behind |
|---|---|---|
| Rpt_GrnFab.rpt | Fabric GRN | Rpt_GrnFab.vb |
| Rpt_GrnYarn.rpt | Yarn GRN | Rpt_GrnYarn.vb |
| Rpt_GrnAcc.rpt | Accessories GRN | Rpt_GrnAcc.vb |
| Rpt_WasteGRN.rpt | Waste GRN | Rpt_WasteGRN.vb |
| Rpt_CutAckFab.rpt / 1.rpt | Cutting ack fabric | Rpt_CutAckFab.vb |
| Rpt_CutRetFab.rpt | Cutting return fabric | Rpt_CutRetFab.vb |

#### Requirement Registers

| File | Purpose | Code-Behind |
|---|---|---|
| Rpt_OrderwiseYarnReqRegister.rpt / 1.rpt | Yarn requirement register | .vb files |
| Rpt_OrderwiseYarnReqAbsRegister.rpt / 1.rpt | Yarn abstract register | .vb files |
| Rpt_OrderwiseFabricReqRegister.rpt | Fabric requirement register | .vb |
| Rpt_AccOrderwiseReqRegister.rpt | Accessories requirement register | .vb |
| Rpt_FabWiseOrdReqReg.rpt / 1.rpt + sub-variants | Fabric-wise order register | .vb files |

#### Budgets & Costing

| File | Purpose | Code-Behind |
|---|---|---|
| Rpt_Budget.rpt | Budget report | Rpt_Budget.vb |
| Rpt_BudgetAbs.rpt | Budget abstract | Rpt_BudgetAbs.vb |
| Rpt_BudgetAndActual_Det.rpt / _1.rpt / _WithSeprTax.rpt | Budget vs actual | Rpt_BudgetAndActual_Det.vb |
| Rpt_BudgetAndActualComp.rpt | Budget vs actual comparison | Rpt_BudgetAndActualComp.vb |
| RptCosting.rpt | Costing report |  |
| RptCostSheetInput.rpt | Cost sheet input form |  |
| Rpt_ProdCost.rpt | Production cost |  |
| Rpt_PLStyle.rpt | Style P&L |  |

#### Sales & Invoices

| File | Purpose | Code-Behind |
|---|---|---|
| Rpt_SalesInvoice.rpt | Sales invoice | Rpt_SalesInvoice.vb |
| Rpt_PcsSalesInvoice.rpt | Piece sales invoice | Rpt_PcsSalesInvoice.vb |
| RptDomesticInvNew.rpt / _Style.rpt | Domestic invoice |  |
| Rpt_OrdWiseBillsRecd.rpt | Order-wise bills received |  |
| RptCommericalBilltoBeRec.rpt | Commercial bill to be received |  |

#### Debit Notes

| File | Purpose | Code-Behind |
|---|---|---|
| Rpt_DebitAcc.rpt | Accessories debit note | Rpt_DebitAcc.vb |
| Rpt_Rpt_DebitNote*.sql | Debit note queries |  |

#### Cutting & Production

| File | Purpose | Code-Behind |
|---|---|---|
| Rpt_Cutting_Production.rpt | Cutting production |  |
| Rpt_CuttingJobOrder.rpt + GST variants | Cutting job order | Rpt_CuttingJobOrder.vb |
| Rpt_CuttingJobOrderCancel.rpt | Job order cancellation |  |
| Rpt_LinePerformance.rpt / 1.rpt | Line performance |  |
| Rpt_LineProdStmt.rpt | Line production statement |  |
| RptProduction.rpt | Production report | RptProduction.vb |
| Rpt_ProdUnit.rpt | Production unit |  |
| RptPanelCuttingProduction.rpt | Panel cutting production |  |
| RptPanelWise.rpt | Panel-wise report |  |
| RptPanelRejection.rpt | Panel rejection |  |
| RptPCSRejection.rpt | PCS rejection | RptPCSRejection.vb |

#### Barcode Printing

| File | Purpose |
|---|---|
| BarcodeLayReport.rpt / 1.rpt | Barcode label layout |
| RptBarcodePrint_AllBundle.rpt / _Panel.rpt / _SmalSize.rpt | Bundle barcode labels |
| RptBarcodePrint_FabRoll.rpt / _old.rpt / _RollSplit.rpt | Fabric roll barcodes |
| RptBarcodePrint_Pcs.rpt / _old.rpt / 2.5X4.rpt | Piece barcode labels |
| RptBundle_BarcodePrint.rpt + copies | Bundle barcode printing |
| RptCuttingBarcodeReg.rpt / 1.rpt / 1_Large.rpt / 3.rpt | Cutting barcode registers |
| RptCuttingBundleDespatchReg.rpt | Bundle despatch register |
| RptTag_Print.rpt | Tag printing |

#### Stock & Closing

| File | Purpose |
|---|---|
| RptClosingStock.rpt / _Deptwise.rpt / _DeptwiseMtr.rpt | Closing stock reports |
| RptClosingStockDet.rpt / DetMtr.rpt | Closing stock detail |
| RptPartyBalanceAbs.rpt | Party balance abstract |

#### Rate Confirmation

| File | Purpose | Code-Behind |
|---|---|---|
| RptAccRateConfirm.rpt | Accessories rate confirm | RptAccRateConfirm.vb |
| RptFabRateConfirm.rpt | Fabric rate confirm | RptFabRateConfirm.vb |
| RptYarnRateConfirm.rpt | Yarn rate confirm | RptYarnRateConfirm.vb |
| RptPieceRateConfirm.rpt / InHouse.rpt | Piece rate confirm | .vb |
| RptAccStatus.rpt | Accessories status | RptAccStatus.vb |

#### Misc Reports

| File | Purpose | Code-Behind |
|---|---|---|
| Rpt_CourierInv.rpt | Courier invoice |  |
| RptPackList.rpt / _Large.rpt | Packing list |  |
| RptProgramOdbc1_NewDtl.rpt | Program detail (ODBC) |  |
| RptWorkFlow.rpt | Workflow report | RptWorkFlow.vb |
| RptWtList.rpt / _1.rpt | Weight list |  |
| Rpt_Rpt_SupplierOrderReg | Supplier order register |  |
| Rpt_test.rpt | Test report |  |
| Rpt_JobwrkInvoice.rpt | Job work invoice | Rpt_JobwrkInvoice.vb |

### 6.3 Code-Behind Files (.vb) — 67 files

All `.vb` files serve as Crystal Reports code-behind for data binding and parameter passing. They follow a consistent pattern:
- Inherit from a report base class
- Set database connection at runtime
- Pass parameters from the calling form
- Map dataset fields to report fields

| Category | Files | Count |
|---|---|---|
| Order Sheets | Rpt_OrderSheet.vb, _det.vb, _Set.vb, _Set_Spare.vb, _Spare.vb, _Clrwise.vb, _Clrwise_Spare.vb, _Image.vb, _Image_Set.vb, _Image_Spare.vb, _Image_Set_Spare.vb, _OrderReg.vb | 12 |
| Purchase Orders | Rpt_PoAcc.vb, _Det.vb, _Detwithimg.vb, _Accwithimg.vb, _PoAccCancel.vb, _Pofab.vb, _Pofab1.vb, _PofabCancel.vb, _PoYarn.vb, _PoYarn1.vb, _PoYarnCancel.vb, _GENPo.vb | 12 |
| Delivery/GRN | Rpt_DelFab.vb, _FullPage.vb, _DelYarn.vb, _FullPage.vb, _DelAcc.vb, _GrnFab.vb, _GrnYarn.vb, _GrnAcc.vb, _WasteGRN.vb, _CutAckFab.vb, _CutRetFab.vb | 11 |
| Requirements | _OrderwiseYarnReq.vb, _1.vb, _Abs.vb, _Abs1.vb, _FabricReq.vb, _AccReq.vb, _FabWiseOrd.vb, _1.vb | 8 |
| Sales/Invoice | Rpt_SalesInvoice.vb, _PcsSalesInvoice.vb, _SalesReturnFab.vb, _SalesReturnYarn.vb | 4 |
| Transfers | _TransAcc.vb, _TransDelFab.vb, _TransDelYarn.vb | 3 |
| Budgets | Rpt_Budget.vb, _BudgetAbs.vb, _BudgetAndActual_Det.vb, _BudgetAndActualComp.vb | 4 |
| Job Work/Cutting | Rpt_CuttingJobOrder.vb, _JobwrkInvoice.vb | 2 |
| Supplier | RptSupplierOrderSheet.vb | 1 |
| Rate Confirm | RptAccRateConfirm.vb, FabRateConfirm.vb, YarnRateConfirm.vb, PieceRateConfirm.vb, _InHouse.vb | 5 |
| Production/Status | RptProduction.vb, PCSRejection.vb, AccStatus.vb, WorkFlow.vb | 4 |
| Misc | Rpt_DebitAcc.vb | 1 |

### 6.4 Code-Behind Files (.cs) — 10 files

C# code-behind files for Stimulsoft (.mrt) reports requiring custom data logic:

| File | Purpose |
|---|---|
| AccDC.cs | Accessories DC — data binding and custom SQL query for DC report |
| AccGRN.cs | Accessories GRN — data binding for GRN report |
| FabDC.cs | Fabric DC — complex data query with multi-process/rate support |
| FabGRN.cs | Fabric GRN — data binding with stock value calculation |
| GenDC.cs | General goods DC — data binding |
| GenGRN.cs | General goods GRN — data binding |
| YarnDC.cs | Yarn DC — standard yarn DC data query |
| YarnDCWithoutPrg.cs | Yarn DC without program — simplified data query |
| YarnDCWithSelPrg.cs | Yarn DC with selected program — filtered by program |
| YarnGRN.cs | Yarn GRN — data binding for yarn receipt |

---

## 7. Cross-Module Dependencies

```
┌─────────────────────────────────────────────────────────────────┐
│                    MODULE DEPENDENCY MAP                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Masters (M01)  ◄──── All Modules                              │
│    Mas_Emp, Mas_Dept, Mas_JobWrkComp, Mas_Machine,             │
│    Mas_Part, Mas_Size, Mas_Color, Mas_Fabric                   │
│                                                                 │
│  Orders (M02) ──► Job Work (A) : SuppOrdMas links to OrderMas  │
│              ──► Quality (B) : LabTestMas.OrdId                 │
│              ──► HR/Wages (C) : Trs_ProdWages.Ordid             │
│              ──► Reporting (D) : All reports filter by order     │
│                                                                 │
│  Production (M06) ──► Job Work (A) : Supp production mirrors    │
│                       in-house production entry                  │
│                  ──► Quality (B) : Lab tests on produced goods  │
│                  ──► HR/Wages (C) : Wages per production entry  │
│                                                                 │
│  Dispatch (M07) ──► Job Work (A) : Supplier DC/GRN flows       │
│                ──► Daily In/Out (C) : Vue_Dailyinout unions all │
│                                                                 │
│  Billing (M08) ──► Job Work (A) : Contractor billing            │
│               ──► Reporting (D) : Invoice/bill reports           │
│                                                                 │
│  Costing (M09) ──► Job Work (A) : Job work budget rates         │
│               ──► HR/Wages (C) : Shift wages in costing         │
│               ──► Reporting (D) : Budget vs actual reports       │
│                                                                 │
│  Workflow/Cloud ──► Job Work (A) : WBS_Supp_Production sync     │
│                ──► Meeting (D) : WF_WorkFlow_Planning            │
│                ──► Email (D) : Sp_Maillist1 notifications        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key shared tables across all four sub-modules**:
- `OrderMas` / `OrderMas2` / `OrderStyleDtl` / `OrderQtyDtl` — order backbone
- `Mas_Emp` — employees (workers, contractors, operators)
- `Mas_Dept` / `Mas_JobWrkComp` — department and stage definitions
- `Mas_Part` / `Mas_Size` / `Mas_Color` / `Mas_Fabric` — product dimensions
- `StockTable` — central stock reference
- `WF_WorkFlow_Planning` — workflow engine
- `Options` — system-wide settings (including `Commando_Approval_Link`)

---

*End of Module 10 — Job Work & Outsourcing · Quality, Lab & Approvals · HR, Labor & Payroll · Reporting, Analytics & Integrations*
