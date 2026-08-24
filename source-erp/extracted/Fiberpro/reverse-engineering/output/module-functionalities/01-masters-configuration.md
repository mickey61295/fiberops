# Module 1 — Masters & Configuration

> **Generated**: 2026-03-15  
> **Source**: 321 candidate forms, ~50 master tables (Mas_*), 25 master sync triggers, 5 stored procedures, 4 scalar functions, system config tables  
> **Foundation References**: database-schema.md, stored-procedures-analysis.md, triggers-and-views-analysis.md, formulas-and-calculations.md

---

## Table of Contents

1. [Module Overview](#1-module-overview)
2. [Forms Inventory](#2-forms-inventory)
3. [Core Entity Masters](#3-core-entity-masters)
   - 3.1 Buyer Master
   - 3.2 Party/Supplier Master
   - 3.3 Company/Unit Master (Exporter)
4. [Product & Material Masters](#4-product--material-masters)
   - 4.1 Fabric Master
   - 4.2 Color Master
   - 4.3 Yarn Count Master
   - 4.4 Diameter Master
   - 4.5 Size & Size Group Masters
   - 4.6 Design Master
   - 4.7 Component Master
5. [Accessories Masters](#5-accessories-masters)
   - 5.1 Accessories Type (Mas_Acc)
   - 5.2 Accessories Description (Mas_AccDes)
   - 5.3 Accessories Category (Mas_AccCategory)
6. [Organizational Masters](#6-organizational-masters)
   - 6.1 Department/Process Master
   - 6.2 Godown/Warehouse Master
   - 6.3 Employee Master
   - 6.4 Machine & Machine Category Masters
   - 6.5 Mill/Supplier Factory Master
7. [Style & Order Setup Masters](#7-style--order-setup-masters)
   - 7.1 Style Description Master
   - 7.2 Style Group Master
   - 7.3 Part Master (Garment Parts)
   - 7.4 Season Master
   - 7.5 Lot Master
8. [Financial & Tax Masters](#8-financial--tax-masters)
   - 8.1 HSN Code Master (Mas_HSN / Mas_HSNPce)
   - 8.2 Bank & Bank Account Masters
   - 8.3 Foreign Currency Master (Mas_Fcy)
   - 8.4 Additions/Deductions Master (Mas_AddDed)
   - 8.5 Terms & Conditions Master
   - 8.6 State Master
   - 8.7 Payment Type Master
9. [Production & Process Masters](#9-production--process-masters)
   - 9.1 Work Nature / Job Work Component (Mas_JobWrkComp)
   - 9.2 Sub-Process Master
   - 9.3 Department Group Master
   - 9.4 Panel Master
   - 9.5 Bit Size Master
   - 9.6 Rejection Type Master
   - 9.7 Production Rate Master
   - 9.8 Stage-wise Tag Master
   - 9.9 Thread Type Master
10. [Expense & Costing Masters](#10-expense--costing-masters)
    - 10.1 Expense Category Master (Mas_Expenses)
    - 10.2 Expense Group
    - 10.3 Commercial Rate Master
    - 10.4 Pre-Costing Component Master
11. [Classification & Grouping Masters](#11-classification--grouping-masters)
    - 11.1 Buyer Department
    - 11.2 Merchandiser Master
    - 11.3 Sales Group
    - 11.4 Stock Report Group
    - 11.5 Fabric Group
    - 11.6 Brand Master
    - 11.7 Yarn Count Groups
    - 11.8 Range & Range Group
12. [System Configuration](#12-system-configuration)
    - 12.1 Options Table (System Settings)
    - 12.2 Options_FM (Form-Level Options)
    - 12.3 Finance Year
    - 12.4 Government Holidays
    - 12.5 Preprint Settings
13. [User & Access Management](#13-user--access-management)
    - 13.1 User Master
    - 13.2 User Group Master
    - 13.3 Menu Rights & Account Rights
    - 13.4 Company Rights
    - 13.5 Password & Login Management
14. [UOM Master](#14-uom-master)
15. [Data Synchronization (Triggers)](#15-data-synchronization-triggers)
16. [Stored Procedures](#16-stored-procedures)
17. [Scalar Functions](#17-scalar-functions)
18. [Workflows & Business Processes](#18-workflows--business-processes)
19. [Integration Points with Other Modules](#19-integration-points-with-other-modules)
20. [Business Rules Summary](#20-business-rules-summary)

---

## 1. Module Overview

The Masters & Configuration module is the **foundational layer** of FiberPro ERP. Every other module depends on master data defined here. This module encompasses:

- **~50 master tables** (prefix `Mas_*`) storing reference data for buyers, suppliers, materials, departments, etc.
- **25 AFTER UPDATE triggers** that flag records for multi-server synchronization
- **5 stored procedures** for index optimization, size list generation, style renaming, data copying, and schema migration
- **4 scalar functions** for currency conversion, lot number extraction, and working day calculation
- **~40 WinForms** for CRUD operations on master data, system settings, and user management
- **System configuration tables** (`Options`, `Options1`, `Options_FM`, `FinanceYear`, `GovtHolidays`, `Preprint`)

### Architecture Principles

1. **Multi-Company Isolation**: `Mas_Exporter` defines companies/units. Transaction tables carry `Coycode` (= `ExpID`) for filtering.
2. **Multi-Server Replication**: Every master table has `UpdateFlg` (BIT) and `server_id` (INT). Triggers set `UpdateFlg=1` on any update (unless the update was to `server_id` or `UpdateFlg` itself, preventing loops).
3. **Auto-Increment IDs**: All master tables use `INT IDENTITY` primary keys.
4. **Application-Level CRUD**: No stored procedures exist for master CRUD — all INSERT/UPDATE/DELETE operations are performed via direct SQL from the .NET WinForms application layer.

---

## 2. Forms Inventory

All forms in this module, extracted from `candidate-forms.txt`:

### Core Master Entry Forms

| # | Form Class | Purpose |
|---|-----------|---------|
| 1 | `Frm_Master` | **Generic master entry** — likely a configurable form for simple masters (Color, Size, etc.) |
| 2 | `FRMBUYER` | Buyer/customer master entry |
| 3 | `FrmPartyMaster` | Party/supplier master entry |
| 4 | `FrmFabricmaster` (+ `FrmMasFabric`) | Fabric type master entry |
| 5 | `FrmAccmaster` | Accessories type master entry |
| 6 | `FrmAccDescMaster` | Accessories description master entry |
| 7 | `FrmAccCat` | Accessories category master entry |
| 8 | `FrmDeptMasterNew` | Department/process master entry |
| 9 | `FrmGodownMaster` | Godown/warehouse master entry |
| 10 | `FrmEmpmaster` | Employee master entry |
| 11 | `FrmMachineMaster` | Machine master entry |
| 12 | `FrmMachineCategory` | Machine category master entry |
| 13 | `FrmMill` | Mill/supplier factory master entry |
| 14 | `FrmStyleMaster` | Style master entry |
| 15 | `FrmStyleDesc` | Style description master entry |
| 16 | `FrmDesignEntry` | Print/fabric design entry |
| 17 | `FrmPartDefineEntry` | Garment part definition entry |
| 18 | `FrmHSN` | HSN code master entry |
| 19 | `FrmHSNPce` | HSN code for piece goods entry |
| 20 | `FrmMasBank` (+ `FrmBankMaster`) | Bank master entry |
| 21 | `FrmMasBankAccount` | Bank account master entry |
| 22 | `frmFcymaster` | Foreign currency master entry |
| 23 | `FrmStateMaster` | State master entry |
| 24 | `FrmDeliveryAtMas` | Delivery-at address master |
| 25 | `FrmThreadTypeMaster` | Thread type master entry |
| 26 | `FrmStageWiseTagMaster` | Stage-wise tag master entry |

### Grouping & Classification Forms

| # | Form Class | Purpose |
|---|-----------|---------|
| 27 | `frmSizeGroup` | Size group management |
| 28 | `FrmCountGroup` | Yarn count group management |
| 29 | `frmDiaSize` | Diameter-size mapping |
| 30 | `FrmDiaChange` | Diameter change for programs |
| 31 | `frmFomGrp` (+ `frmOrderGroup`) | Form/order group management |
| 32 | `FrmRangeGrp` | Range group management |
| 33 | `FrmRange` (+ `FrmRange_Orderwise`) | Range definition (order-wise) |
| 34 | `FrmMasBuyerDept` | Buyer department mapping |
| 35 | `FrmExpenseGroup` | Expense group management |
| 36 | `frmDeptGroup` | Department group management |
| 37 | `FrmConcern` | Concern/company group definition |

### Configuration & Settings Forms

| # | Form Class | Purpose |
|---|-----------|---------|
| 38 | `frmOptions` | System-wide options/settings |
| 39 | `FrmOptionsPrint` | Print options configuration |
| 40 | `FrmOptionUpdate` | Option update utility |
| 41 | `frmDeptSettings` | Department-specific settings |
| 42 | `FrmProcessByPassSetting` | Process bypass configuration |
| 43 | `FrmOrderDisplayDaysSetting` | Order display duration setting |
| 44 | `FrmMISSetting` | MIS settings configuration |
| 45 | `FrmFormDef` | Form definition/customization |
| 46 | `FrmSMSMailSetup` | SMS/email setup |
| 47 | `FrmTally_GSTSetup` | Tally GST integration setup |

### User & Access Management Forms

| # | Form Class | Purpose |
|---|-----------|---------|
| 48 | `FrmMasuser` | User master entry |
| 49 | `FrmUserGroupMas` | User group management |
| 50 | `FrmMenuRights` | Menu/feature access rights |
| 51 | `FrmMenuAccRights` | Account-level menu rights |
| 52 | `FrmCompanyRights` | Company access rights per user |
| 53 | `FrmChangePassword` | Password change |
| 54 | `Frm_Password_List` | Password listing/management |
| 55 | `FrmCompanyLogin` | Company selector at login |
| 56 | `FrmFinyearLogin` | Financial year selector at login |
| 57 | `FrmLogin_New` | Login form |
| 58 | `FrmLoginReg` | Login register/audit log |

### Utility & Maintenance Forms

| # | Form Class | Purpose |
|---|-----------|---------|
| 59 | `Frm_Lock` | Record locking management |
| 60 | `FrmDataDelete` | Data deletion utility |
| 61 | `FrmDelete` | Generic delete form |
| 62 | `frmTblErase` | Table erase utility |
| 63 | `FrmFormas` | Format/form template management |
| 64 | `frmSearch` | Global search interface |
| 65 | `frmclose` | Close/exit handler |
| 66 | `frmPopUp` | Popup notifications |
| 67 | `FrmWeightScale_Integration` | Weight scale hardware integration |

### Template & Special Masters

| # | Form Class | Purpose |
|---|-----------|---------|
| 68 | `FrmMasTemplate` | Allocation template master |
| 69 | `FrmMasExpenses` | Expense master (alternate form) |
| 70 | `FrmMasWorkNature` | Work nature master |
| 71 | `FrmCommRateMaster` | Commercial rate master |
| 72 | `FrmPrdnRateMaster` | Production rate master |
| 73 | `FrmRateMaster` | Generic rate master |
| 74 | `frmDefaultRate` | Default rate configuration |
| 75 | `Frm_AppMas` | Approval master configuration |
| 76 | `frmTerms` | Terms & conditions master |
| 77 | `frmPaytem` | Payment terms master |
| 78 | `FrmPreCostingCompMas` | Pre-costing component master |
| 79 | `Frm_CommercialTemplate` | Commercial template master |
| 80 | `Frm_Mas_Holiday` | Holiday master entry |
| 81 | `FrmShadeEntry` | Shade/color-shade entry |
| 82 | `FrmVehicle` (inferred) | Vehicle master |

---

## 3. Core Entity Masters

### 3.1 Buyer Master

**Table**: `Mas_Buyer`  
**Form**: `FRMBUYER`  
**Trigger**: `Trg_Mas_Buyer_Update` (PK: `BuyerID`)

| Column | Type | Description |
|--------|------|-------------|
| BuyerID | INT (PK, Identity) | Auto-generated buyer identifier |
| BuyerName | VARCHAR | Buyer/customer name |
| Stateid | INT (FK → Mas_State) | State — determines CGST/SGST vs IGST for GST |
| UpdateFlg | BIT | Multi-server sync flag |
| server_id | INT | Server identifier for replication |

**Business Rules**:
- BuyerID is referenced in `OrderMas.BuyerID` — every order must have a valid buyer
- State comparison (`Buyer.Stateid` vs `Exporter.Stateid`) drives GST type determination (intra-state = CGST+SGST, inter-state = IGST)
- When a buyer is specified on a DC (`Trs_Del1.Buyer > 0`), the buyer's state overrides the party's state for GST calculation
- Buyer is central to: Order Management, Billing, Dispatch, and Costing modules

**Dependencies** (tables referencing BuyerID):
- `OrderMas` — orders belong to a buyer
- `Trs_Del1` — delivery challans may specify buyer
- `Trs_Bills` — invoices reference buyer
- `ST_Ord_inHand` — order-in-hand summary
- `Trs_SalesInvoice` — sales invoices

**Related Sub-Master**: `Mas_BuyerDept` (buyer department mapping, form `FrmMasBuyerDept`, trigger `Trg_Mas_BuyerDept_Update`)

---

### 3.2 Party/Supplier Master

**Table**: `Mas_Party`  
**Form**: `FrmPartyMaster`  
**Trigger**: `Trg_Mas_Party_Update` (PK: `PID`)

| Column | Type | Description |
|--------|------|-------------|
| PID | INT (PK, Identity) | Party identifier |
| Pname | VARCHAR | Party/supplier name |
| Paddress | VARCHAR | Address |
| Phone | VARCHAR | Phone number |
| TIN | VARCHAR | Tax Identification Number (legacy) |
| CST | VARCHAR | Central Sales Tax number (legacy) |
| GSTNo | VARCHAR | GST registration number |
| PAN | VARCHAR | PAN number |
| Stateid | INT (FK → Mas_State) | State — for GST interstate logic |
| UpdateFlg | BIT | Multi-server sync flag |
| server_id | INT | Server identifier |

**Business Rules**:
- Parties serve as suppliers/processors in the supply chain
- `Party.Stateid` vs `Exporter.Stateid` determines GST type for all DCs and GRNs
- Party is referenced in virtually every transaction — DCs, GRNs, POs, Debit Notes, Bills, Production Bills
- Party balance tracking via `ST_PartyBalance_Abs` and `TempPartyBalAbs` tables
- GSTNo is mandatory for GST compliance in India

**Dependencies** (tables referencing PID/PartyID):
- `Trs_Del1`, `Trs_Grn1`, `Trs_Po1` — deliveries, GRNs, purchase orders
- `Trs_Pcs1`, `Trs_PcsGrn1` — piece DCs/GRNs
- `SuppOrdMas` — supplier orders
- `Trs_Bills`, `Trs_Deb1` — bills/invoices, debit notes
- `Trs_ProdBillMasNew`, `PaymentMas` — production bills, payments
- `ST_PartyBalance_Abs` — party balance summary
- `Trs_ContractorAllotment_Mas` — contractor allotment

---

### 3.3 Company/Unit Master (Exporter)

**Table**: `Mas_Exporter`  
**Form**: `FrmCompanyLogin` (selection), `FrmConcern` (group), system admin  
**Trigger**: None (system-level table)

| Column | Type | Description |
|--------|------|-------------|
| ExpID | INT (PK) | Company/unit identifier (= `Coycode` in all transactions) |
| ExporterName | VARCHAR | Company/unit name |
| ExporterAddress | VARCHAR | Address |
| Phone | VARCHAR | Phone |
| TIN | VARCHAR | TIN (legacy) |
| CST | VARCHAR | CST (legacy) |
| PAN | VARCHAR | PAN |
| GSTNo | VARCHAR | GST number |
| Stateid | INT (FK → Mas_State) | State — base reference for all GST comparisons |
| IoNoCaption | VARCHAR | I/O number caption customization |

**Business Rules**:
- `ExpID` = `Coycode` — this is the **multi-company isolation key** present in nearly every transaction table
- User login flow: Login → Select Company (`FrmCompanyLogin`) → Select Financial Year (`FrmFinyearLogin`) → Main Menu
- Exporter's state is the "home state" — compared against Party/Buyer state for GST type determination
- Multiple units can belong to a concern group (`FrmConcern`)
- `IoNoCaption` allows per-company customization of I/O document number labels

**Multi-Company Architecture**:
- Every transaction table has `Coycode INT` column
- Queries always filter by `WHERE Coycode = @ActiveCompany`
- This allows multiple business units to share one database while keeping data isolated

---

## 4. Product & Material Masters

### 4.1 Fabric Master

**Table**: `Mas_Fabric`  
**Forms**: `FrmFabricmaster`, `FrmMasFabric`  
**Trigger**: `Trg_Mas_Fabric_Update` (PK: `FabID`)

| Column | Type | Description |
|--------|------|-------------|
| FabID | INT (PK) | Fabric type identifier |
| Fabdesc | VARCHAR | Fabric description (e.g., "Single Jersey", "Rib") |
| PriUomID | INT (FK → Mas_Uom) | Primary unit of measure (KGS, MTR) |
| BrandedFlag | CHAR(1) | 'Y'/'N' — determines GST rate tier (branded vs non-branded) |
| HSNID | INT (FK → Mas_HSN) | HSN code for GST rate lookup |
| UpdateFlg | BIT | Sync flag |
| server_id | INT | Server ID |

**Business Rules**:
- `BrandedFlag` drives GST rate selection from `Mas_HSN` — branded fabrics may attract higher GST rates
- `PriUomID` determines whether calculations use KGS-based or MTR-based formulas throughout the system:
  - Stock valuation: `Qty × Rate` where Qty is in the primary UOM
  - Bill-to-be value: different formula paths for KGS vs MTR
- Fabric is central to: Programming/Requirements, Stock Management, Delivery, GRN, and Budget calculations
- Referenced in `StockTable.FabID`, `Pro_ReqKnitt.FabId`, `Trs_Del2`, `Trs_Grn2`, `Prog_ClrComb`

**Related Sub-Master**: `Mas_FabricGroup` — fabric grouping for reports

---

### 4.2 Color Master

**Table**: `Mas_Color`  
**Form**: `Frm_Master` (generic) or dedicated color form  
**Trigger**: `Trg_Mas_Color_Update` (PK: `ColID`)

| Column | Type | Description |
|--------|------|-------------|
| ColID | INT (PK) | Color identifier |
| ColorDesc | VARCHAR | Color description |
| UpdateFlg | BIT | Sync flag |
| server_id | INT | Server ID |

**Business Rules**:
- Colors are used at multiple levels: order quantity breakdown, stock tracking, programming, delivery, and production
- Special color handling in Department 8 (Dyeing): uses `DyeColId` from `Trs_Del1` instead of stock color — supports color transformation during dyeing process
- Referenced in: `OrderQtyDtl.ColId`, `StockTable.ColId`, `Trs_Del2.ColID`, `Pro_ReqKnitt.ColId`, `ST_ProgBalance_Fabric.ColID`

---

### 4.3 Yarn Count Master

**Table**: `Mas_Count`  
**Form**: `Frm_Master` (generic)  
**Trigger**: `Trg_Mas_Count_Update` (PK: `CountID`)

| Column | Type | Description |
|--------|------|-------------|
| CountID | INT (PK) | Count identifier |
| CountName | VARCHAR | Count description (e.g., "30s", "40s", "2/30s") |
| CountGrpid | INT (FK → Mas_YarncountGroups) | Optional group |
| UpdateFlg | BIT | Sync flag |

**Business Rules**:
- Yarn count is a key attribute in yarn stock tracking and programming
- Referenced in: `StockTable.CntId`, `Pro_ReqYarn.CountID`, `ST_ProgBalance_Yarn.CountID`
- Count groups (`Mas_YarncountGroups`) allow grouping for reporting (e.g., "Cotton Counts", "Blended Counts")

---

### 4.4 Diameter Master

**Table**: `Mas_Dia`  
**Form**: `frmDiaSize`, `FrmDiaChange`  
**Trigger**: `Trg_Mas_Dia_Update` (PK: `DiaID`)

| Column | Type | Description |
|--------|------|-------------|
| DiaID | INT (PK) | Diameter identifier |
| Dia | VARCHAR | Diameter value (e.g., "24", "30", "36" inches) |

**Business Rules**:
- Diameter is a knitting-specific attribute — describes the circular knitting machine diameter
- `FrmDiaChange` allows changing diameter in programs (post-order entry)
- Referenced in: `StockTable.DiaId`, `Pro_ReqKnitt.DiaID`, `ST_ProgBalance_Fabric.DiaID`
- Diameter affects fabric width and is part of the composite key in program balance tables

---

### 4.5 Size & Size Group Masters

**Table**: `Mas_Size`  
**Form**: `Frm_Master`, `frmSizeGroup`  
**Trigger**: `Trg_Mas_Size_Update` (PK: `SizeID`), `Trg_Mas_SizeGroup_Update`

| Column | Type | Description |
|--------|------|-------------|
| SizeID | INT (PK) | Size identifier |
| SizeDesc | VARCHAR | Size description (e.g., "S", "M", "L", "XL", "2XL") |

**Special Value**: `SizeID = -2` → dummy "ALL" size, used by `SP_SizeList` with `SNo=999` to represent aggregated totals.

**Business Rules**:
- Sizes are order-specific — `OrdSizeMas` stores the size sequence (display order) per order/style
- `SP_SizeList` returns ordered sizes for a given order/style/bit-size combination
- Size groups (`Mas_SizeGroup`) allow families like "Youth Sizes", "Adult Sizes"
- Bit sizes (`Mas_Bitsize`) further subdivide for panel cutting operations

**Referenced in**: `OrderQtyDtl.SizeId`, `OrdSizeMas.SizeID`, `ST_Production_Data.SizeID`, `Trs_Pcs2.SizeID`

---

### 4.6 Design Master

**Table**: `Mas_Design`  
**Form**: `FrmDesignEntry`  
**Trigger**: `Trg_Mas_Design_Update` (PK: `DesignId`)

| Column | Type | Description |
|--------|------|-------------|
| DesignId | INT (PK) | Design identifier |
| DesignDesc | VARCHAR | Design description |

**Business Rules**:
- Design is used primarily in Department 10 (Printing) — DCs for printing use `DesignId` from `Trs_Del1`
- Part of composite key in `ST_ProgBalance_Fabric` for print departments
- Referenced in: `StockTable.DesignId`, `Pro_ReqKnitt.DesignId`, `Trs_Del1.DesignId`

---

### 4.7 Component Master

**Table**: `Mas_Component`  
**Form**: `Frm_Master` or dedicated component form  
**Trigger**: `Trg_Mas_Component_Update` (PK: `CompID`)

| Column | Type | Description |
|--------|------|-------------|
| CompID | INT (PK) | Component identifier |
| CompDescr | VARCHAR | Component description |

**Business Rules**:
- Components are used in programming/consumption calculations (`Prog_Component`)
- Referenced in requirement calculations and budget formulas
- Style change (`SP_StyleChange`) updates `Prog_Component.StyleNo` — demonstrates deep linkage

---

## 5. Accessories Masters

### 5.1 Accessories Type (Mas_Acc)

**Table**: `Mas_Acc`  
**Form**: `FrmAccmaster`  
**Trigger**: `Trg_Mas_Acc_Update` (PK: `ID`)

| Column | Type | Description |
|--------|------|-------------|
| ID | INT (PK) | Accessories type identifier |
| Acc_Descr | VARCHAR | Type description (e.g., "Thread", "Button", "Label") |
| catID | INT (FK → Mas_AccCategory) | Category grouping |
| UomId | INT (FK → Mas_Uom) | Unit of measure (PCS, MTR, KGS, etc.) |

### 5.2 Accessories Description (Mas_AccDes)

**Table**: `Mas_AccDes`  
**Form**: `FrmAccDescMaster`  
**Trigger**: `Trg_Mas_AccDes_Update` (PK: `ID`)

| Column | Type | Description |
|--------|------|-------------|
| ID | INT (PK) | Description identifier |
| AccTypeID | INT (FK → Mas_Acc) | Parent accessories type |
| AccDescription | VARCHAR | Specific description (e.g., "White Polyester Thread 40/2") |

### 5.3 Accessories Category (Mas_AccCategory)

**Table**: `Mas_AccCategory`  
**Form**: `FrmAccCat`  
**Trigger**: `Trg_Mas_AccCategory_Update` (PK: `CatID`)

**Hierarchy**: `Mas_AccCategory` → `Mas_Acc` → `Mas_AccDes` (3-level classification)

**Business Rules**:
- Accessories have a three-level hierarchy: Category > Type > Description
- Each type has its own UOM — accessories can be measured in PCS, MTR, KGS, ROLLS, etc.
- Accessories are tracked separately from yarn/fabric in stock and requirement systems
- Referenced in: `Trs_AccDel*`, `Trs_AccGrn*`, `Pro_AccReq`, `Prog_AccMas`

---

## 6. Organizational Masters

### 6.1 Department/Process Master

**Table**: `Mas_Dept`  
**Form**: `FrmDeptMasterNew`, `frmDeptSettings`  
**Trigger**: `Trg_Mas_Dept_Update` (PK: `DeptID`)

| Column | Type | Description |
|--------|------|-------------|
| DeptID | INT (PK) | Department identifier |
| Deptname | VARCHAR | Department name (e.g., "Knitting", "Dyeing", "Printing", "Cutting") |
| OutputType | CHAR(1) | 'Y' = Yarn output, 'F' = Fabric output |
| InputType | CHAR(1) | 'Y' = Yarn input, 'F' = Fabric input |
| DCFormat | VARCHAR | DC print format/template |
| ProgReqPrn | CHAR(1) | 'Y'/'N' — program requirement printing enabled |
| RecMethod | CHAR(1) | 'D' = DC-based receipt, 'O' = Order-based receipt |
| Grp | INT (FK → Mas_Grp) | Department group |
| SemiFinish | CHAR(1) | 'S' = Semi-finished, 'F' = Finished |
| DeptType | CHAR(1) | 'G' = General |
| ProgFrm_Issue | CHAR(1) | 'Y'/'N' — program from issue |
| DC_TermCode | INT (FK → Mas_Terms) | Default terms on DCs for this department |
| DeptGrpCode | INT | Department group code (e.g., 4 = Knitting group) |
| AccProsDept | CHAR(1) | 'Y'/'N' — is this an accessories process department? |
| OrderSno | INT | Display sort order in reports |

**Business Rules**:
- Department is the **most complex master** — it defines the process flow of the textile/garment manufacturing chain
- `InputType`/`OutputType` determine what material types (Yarn vs Fabric) the department consumes and produces
- **Special department codes** hardcoded in business logic:
  - DeptID 4 = Knitting (special handling in `Trg_ST_ProgBalance_Fabric_Update_Actual`)
  - DeptID 8 = Dyeing (uses `DyeColId` instead of stock color in fabric balance triggers)
  - DeptID 10 = Printing (uses `DesignId` in fabric balance triggers)
  - `Options.Stitching_DeptCode` = Stitching department
- `RecMethod` controls GRN workflow — DC-based means GRN is created against a specific DC; Order-based means GRN is against an order
- `DCFormat` links to report templates for printing DCs
- `Grp` links to `Mas_Grp` which provides `DcPre` (DC number prefix per group)
- Referenced in virtually every transaction, stock, and production table

**Sub-Master**: `Mas_SubProcess` (sub-processes within a department, form `Frm_SubProcess`)

---

### 6.2 Godown/Warehouse Master

**Table**: `Mas_Godown`  
**Form**: `FrmGodownMaster`, `Frm_GoDownSel`, `FrmChangeGodown`

| Column | Type | Description |
|--------|------|-------------|
| GodID | INT (PK) | Godown identifier |
| GodName | VARCHAR | Godown name |

**Business Rules**:
- Godowns are storage locations for all material types (yarn, fabric, accessories, piece goods)
- Stock is tracked per godown: `CurrentStock.GodID`, `StockTable.GodID`
- Godown transfers and acknowledgements are separate transactions
- `Frm_GoDownSel` provides godown selection dialog
- `FrmChangeGodown` allows reassigning stock to a different godown

---

### 6.3 Employee Master

**Table**: `Mas_Emp`  
**Form**: `FrmEmpmaster`  
**Trigger**: `Trg_Mas_Emp_Update` (PK: `EmpId`)

| Column | Type | Description |
|--------|------|-------------|
| ID | INT (PK) | Employee identifier |
| EmpName | VARCHAR | Employee name |

**Special Trigger Behavior**: `Trg_Mas_Emp_Update` additionally excludes `UPDATE(EMP_SERVER_ID)` — suggesting the employee table has a separate server-specific field.

**Referenced in**: Production wages, shift wages, daily in/out attendance, payment records.

---

### 6.4 Machine & Machine Category Masters

**Tables**: Machine master (inferred), `MachineCategory` (inferred)  
**Forms**: `FrmMachineMaster`, `FrmMachineCategory`

**Business Rules**:
- Machines are linked to production lines and departments
- Machine category classifies machines (e.g., "Circular Knitting", "Flat Knitting", "Sewing")
- Used in production entry, hourly production tracking, and MIS settings

---

### 6.5 Mill/Supplier Factory Master

**Table**: `Mas_Mill`

| Column | Type | Description |
|--------|------|-------------|
| MillID | INT (PK) | Mill identifier |
| ShortMill | VARCHAR | Short name/code |
| Mill | VARCHAR | Full mill name |

**Business Rules**:
- Mills represent supplier manufacturing locations
- Referenced in stock tables for tracking material origin

---

## 7. Style & Order Setup Masters

### 7.1 Style Description Master

**Table**: `Mas_StyleDesc`  
**Form**: `FrmStyleDesc`, `FrmStyleMaster`  
**Trigger**: `Trg_Mas_StyleDesc_Update` (PK: `StyleID`)

| Column | Type | Description |
|--------|------|-------------|
| StyleID | INT (PK) | Style identifier |
| StyleDesc | VARCHAR | Style description (e.g., "Crew Neck T-Shirt", "Polo Shirt") |

**Business Rules**:
- Style is a garment type/description that can be reused across orders
- Each order has style numbers (`OrderStyleDtl.StyleNo`) that link to style descriptions
- `SP_StyleChange` procedure renames a style number across **~80+ tables** in a single transaction — demonstrating how deeply StyleNo is embedded throughout the system

---

### 7.2 Style Group Master

**Table**: `Mas_StyleGroup`  
**Form**: Part of style management  
**Trigger**: `Trg_Mas_Stylegroup_Update` (PK: `ID`)

**Purpose**: Groups styles for reporting and classification (e.g., "T-Shirts", "Polo Shirts", "Trousers").

---

### 7.3 Part Master (Garment Parts)

**Table**: `Mas_Part`  
**Form**: `FrmPartDefineEntry`  
**Trigger**: `Trg_Mas_Part_Update` (PK: `PartID`)

| Column | Type | Description |
|--------|------|-------------|
| PartID | INT (PK) | Part identifier |
| PartName | VARCHAR | Part name (e.g., "Front", "Back", "Sleeve", "Collar") |

**Business Rules**:
- Parts define the components of a garment for cutting and panel production
- Order quantities can be broken down by part (in `OrderQtyDtl.PartId`)
- Parts drive cutting requirements, panel stock, and assembly tracking
- Referenced in: `OrderQtyDtl`, `PartDefine`, `Panel_StockTable`, `Pcs_StockTable`, `Pro_Prod_PartwiseRate`

**Anomaly**: `Trg_OrderStyleImgDtl_Update` appears to be a duplicate of `Trg_Mas_Part_Update` (same content, targets `Mas_Part`) — naming inconsistency.

---

### 7.4 Season Master

**Table**: `Mas_Season`  
**Form**: Part of `Frm_Master` or dedicated  
**Trigger**: `Trg_Mas_Season_Update` (PK: `SeasID`)

| Column | Type | Description |
|--------|------|-------------|
| SeasID | INT (PK) | Season identifier |
| SeasDesc | VARCHAR | Season description (e.g., "Spring 2025", "AW2025") |

**Business Rules**:
- Seasons classify orders for seasonal reporting and planning
- Referenced in: `OrderMas.Season`

---

### 7.5 Lot Master

**Table**: `Mas_Lot`  
**Form**: `FrmLotRegister`, `FrmLotSeparate`, `frmLotWiseDtl`  
**Trigger**: `Trg_Mas_Lot_Update` (PK: `ID`)

| Column | Type | Description |
|--------|------|-------------|
| LotId | INT (PK) | Lot identifier |
| LotName | VARCHAR | Lot name/number |

**Business Rules**:
- Lots are used extensively in yarn and fabric tracking
- The `getLotNo()` scalar function extracts numeric lot identifiers from alphanumeric strings (see Section 17)
- Lot-based tracking enables traceability from yarn receipt through knitting, dyeing, and delivery
- Referenced in: `OrderQtyDtl.LotNo`, `StockTable.LotNo`, delivery and GRN detail records

---

## 8. Financial & Tax Masters

### 8.1 HSN Code Master

**Tables**: `Mas_HSN` (fabric/yarn), `Mas_HSNPce` (piece/garment goods)  
**Forms**: `FrmHSN`, `FrmHSNPce`

| Column | Type | Description |
|--------|------|-------------|
| ID | INT (PK) | HSN record ID |
| HSNCode | VARCHAR | HSN code (e.g., "6109", "6105") |
| UnitRate | NUMERIC | Value threshold — below = "Low" tier, above = "High" tier |
| BPercL | NUMERIC | Branded, Low value GST rate % |
| NBPercL | NUMERIC | Non-Branded, Low value GST rate % |
| BPercH | NUMERIC | Branded, High value GST rate % |
| NBPercH | NUMERIC | Non-Branded, High value GST rate % |

**Business Rules**:
- HSN (Harmonized System of Nomenclature) codes are mandatory for Indian GST compliance
- Four-tier rate structure based on two dimensions:
  1. **Branded vs Non-Branded** — determined by `Mas_Fabric.BrandedFlag`
  2. **Low vs High value** — determined by `UnitRate` threshold
- `Mas_HSN` is linked from `Mas_Fabric.HSNID` for yarn/fabric goods
- `Mas_HSNPce` provides separate HSN codes for finished piece goods (garments)
- GST rates flow into `Trs_Del4` (CGSTper, SGSTper, IGSTper) at DC time

**Formula Reference** (from formulas-and-calculations.md §12c):
```
If UnitValue ≤ Mas_HSN.UnitRate → use Low tier (BPercL or NBPercL)
If UnitValue > Mas_HSN.UnitRate → use High tier (BPercH or NBPercH)
Selection between B/NB based on Mas_Fabric.BrandedFlag
```

---

### 8.2 Bank & Bank Account Masters

**Tables**: `Mas_Bank`, bank account table  
**Forms**: `FrmMasBank`, `FrmBankMaster`, `FrmMasBankAccount`

**Business Rules**:
- Banks are used in payment processing, bill pass, and party balance
- Bank account details support payment register and financial transactions
- Referenced in: `PaymentMas`, payment-related forms

---

### 8.3 Foreign Currency Master

**Table**: `Mas_Fcy`  
**Form**: `frmFcymaster`  
**Trigger**: `Trg_Mas_Fcy_Update` (PK: `FCY_Id`)

**Business Rules**:
- Foreign currencies are used in commercial invoices, export orders, and currency conversion
- The `DSP_NumericToRupees` function accepts `@fcyID` parameter to determine currency label:
  - If `@fcyID > 0`: Looks up currency name from `Mas_Fcy` table and uses US-style word conversion (Thousand → Million → Billion)
  - If `@fcyID = 0`: Uses Indian-style word conversion (Thousand → Lakh → Crore) with "Rupees" and "Paise"
- Referenced in: Invoice generation, commercial templates

---

### 8.4 Additions/Deductions Master

**Table**: `Mas_AddDed`

| Column | Type | Description |
|--------|------|-------------|
| AddDedCode | INT (PK) | Addition/deduction code |
| AddDedName | VARCHAR | Name (e.g., "SGST", "CGST", "IGST", "Discount", "Transport") |

**Business Rules**:
- Defines all types of additions and deductions applicable to bills/invoices
- Referenced in `Trs_BillAddded` for invoice line items
- Used by `Vue_InputGST` view to generate GST reports
- Includes both GST tax types and commercial adjustments (discounts, freight, etc.)

---

### 8.5 Terms & Conditions Master

**Table**: `Mas_Terms`  
**Form**: `frmTerms`

| Column | Type | Description |
|--------|------|-------------|
| ID | INT (PK) | Terms code |
| Terms | VARCHAR | Terms text |

**Business Rules**:
- Terms are printed on DCs and invoices
- `Mas_Dept.DC_TermCode` links departments to default DC terms
- Multiple terms can be assigned to different document types

---

### 8.6 State Master

**Table**: `Mas_State`  
**Form**: `FrmStateMaster`

**Business Rules**:
- State is the key determinant for GST type:
  - `Exporter.Stateid = Party.Stateid` → Intra-state (CGST + SGST)
  - `Exporter.Stateid ≠ Party.Stateid` → Inter-state (IGST)
- Referenced by: `Mas_Buyer.Stateid`, `Mas_Party.Stateid`, `Mas_Exporter.Stateid`
- Each state has a unique GST state code

---

### 8.7 Payment Type Master

**Table**: `Mas_Voucher_PaymentType`

| Column | Type | Description |
|--------|------|-------------|
| ID | INT (PK) | Payment type ID |
| TypeDesc | VARCHAR | Payment type description (e.g., "Cash", "Cheque", "NEFT", "RTGS") |

---

## 9. Production & Process Masters

### 9.1 Work Nature / Job Work Component

**Table**: `Mas_JobWrkComp`  
**Form**: `FrmMasWorkNature`  
**Trigger**: `Trg_Mas_JobWrkComp_Update` (PK: `Id`)

| Column | Type | Description |
|--------|------|-------------|
| Id | INT (PK) | Work nature/stage identifier |
| DeptId | INT (FK → Mas_Dept) | Linked department |
| WorkComplDet | VARCHAR | Work completion detail (e.g., "Cutting", "Stitching", "Washing") |
| PcsType | VARCHAR | 'Piece' or 'Panel' — type of output |

**Business Rules**:
- Defines the work stages/nature for production tracking and job work
- Links to departments — each work nature belongs to a department
- `PcsType` determines whether production is tracked in pieces or panels
- Referenced in: `ST_ProdRequirement`, production entry, contractor allotment

---

### 9.2 Sub-Process Master

**Table**: `Mas_SubProcess`  
**Form**: `Frm_SubProcess`

| Column | Type | Description |
|--------|------|-------------|
| ID | INT (PK) | Sub-process identifier |
| SubProcess | VARCHAR | Sub-process name |

**Business Rules**:
- Sub-processes allow granular tracking within a department
- Part of composite key in `ST_ProgBalance_Fabric` — fabric balance is tracked per sub-process
- Fabric balance triggers group by `SubPrsID` for multi-subprocess handling

---

### 9.3 Department Group Master

**Table**: `Mas_Grp`

| Column | Type | Description |
|--------|------|-------------|
| GrpNo | INT (PK) | Group number |
| DcPre | VARCHAR | DC number prefix for this group |

**Business Rules**:
- Department groups share a DC numbering prefix (e.g., "KN" for Knitting group, "DY" for Dyeing group)
- `Mas_Dept.Grp` links each department to its group

---

### 9.4 Panel Master

**Table**: `Mas_Panel`

| Column | Type | Description |
|--------|------|-------------|
| PanelID | INT (PK) | Panel identifier |
| PanelName | VARCHAR | Panel name |

**Business Rules**:
- Panels are sub-components of garments (similar to parts but for cut panels)
- Used in panel production, panel stock, and panel delivery/receipt tracking

---

### 9.5 Bit Size Master

**Table**: `Mas_Bitsize`

**Business Rules**:
- Bit sizes define panel/cutting size groups
- Used in `SP_SizeList` to filter sizes by bit-size combination
- Referenced in `Pro_ProdBitCutDet`, `Pro_Prod_BitCutRate`

---

### 9.6 Rejection Type Master

**Table**: `Mas_RejectionType`

**Purpose**: Defines types of rejections (e.g., "Fabric Defect", "Stitching Defect", "Size Mismatch") for quality tracking in the Cutting, Production, and Piece Goods modules.

---

### 9.7 Production Rate Master

**Form**: `FrmPrdnRateMaster`

**Business Rules**:
- Defines production rates per department/process
- Used in production costing and wages calculation
- Links to budget and actual comparison calculations

---

### 9.8 Stage-wise Tag Master

**Form**: `FrmStageWiseTagMaster`

**Purpose**: Defines tags/labels for tracking at each production stage, likely used with barcode/bundle tracking system.

---

### 9.9 Thread Type Master

**Form**: `FrmThreadTypeMaster`

**Purpose**: Defines thread types used in stitching operations (e.g., polyester, cotton, spun poly).

---

## 10. Expense & Costing Masters

### 10.1 Expense Category Master

**Table**: `Mas_Expenses`

| Column | Type | Description |
|--------|------|-------------|
| ExpId | INT (PK) | Expense identifier |
| Exp_Level | VARCHAR/INT | Expense level for hierarchy |
| ShiftWageExp | CHAR(1)/BIT | Whether this is a shift wage expense |

**Business Rules**:
- Expenses are classified by level for Daily Unit P&L calculation
- The `Vue_DailyCostingInputData` view unions 5 costing levels: Factory, Department, Line, Order, and Style-wise
- Expense levels drive the detail granularity in P&L reports
- `ShiftWageExp` flag identifies expenses that come from shift wages module

---

### 10.2 Expense Group

**Form**: `FrmExpenseGroup`

**Purpose**: Groups expenses for aggregation in P&L and budget reports.

---

### 10.3 Commercial Rate Master

**Form**: `FrmCommRateMaster`

**Purpose**: Defines commercial rates for invoicing — separate from production/process rates. Used in commercial invoice generation.

---

### 10.4 Pre-Costing Component Master

**Form**: `FrmPreCostingCompMas`

**Purpose**: Defines components for pre-costing calculations (e.g., fabric cost, trims cost, CMT, overhead). Used in one-page cost reports and budget creation.

---

## 11. Classification & Grouping Masters

### 11.1 Buyer Department

**Table**: `Mas_BuyerDept`  
**Form**: `FrmMasBuyerDept`  
**Trigger**: `Trg_Mas_BuyerDept_Update` (PK: `ID`)

**Purpose**: Maps departments/divisions within a buyer organization (e.g., "Men's Wear", "Women's Wear").

### 11.2 Merchandiser Master

**Table**: `Mas_Merchandiser`  
**Trigger**: `Trg_Mas_Merchandiser_Update` (PK: `ID`)

**Purpose**: Tracks merchandiser contacts for buyer communication and order management.

### 11.3 Sales Group

**Table**: `Mas_SalesGrp`

**Purpose**: Groups for sales reporting and classification.

### 11.4 Stock Report Group

**Table**: `Mas_StockReportGroup`

**Purpose**: Defines grouping categories for stock report generation (`Temp_StkReports.StkGrpID`).

### 11.5 Fabric Group

**Table**: `Mas_FabricGroup`

**Purpose**: Groups fabric types for consolidated reporting.

### 11.6 Brand Master

**Table**: `Mas_Brand`

**Purpose**: Defines brands — may be used alongside `Mas_Fabric.BrandedFlag` for brand-specific GST rates.

### 11.7 Yarn Count Groups

**Table**: `Mas_YarncountGroups`

| Column | Type | Description |
|--------|------|-------------|
| ID | INT (PK) | Group ID |
| Groupname | VARCHAR | Group name (e.g., "Cotton", "Blended", "Synthetic") |

**Purpose**: Groups yarn counts for reporting, linked from `Mas_Count.CountGrpid`.

### 11.8 Range & Range Group

**Forms**: `FrmRange`, `FrmRange_Orderwise`, `FrmRangeGrp`

**Purpose**: Defines size/color ranges (e.g., "S-XL", "XS-3XL") for order entry and pack assortment.

---

## 12. System Configuration

### 12.1 Options Table (System Settings)

**Table**: `Options`  
**Form**: `frmOptions`, `FrmOptionUpdate`

| Column | Type | Description |
|--------|------|-------------|
| GatePassFlg | CHAR(1) | 'Y'/'N' — require gate pass for dispatch |
| BudRT_CMT_SizeWise | CHAR(1) | 'Y'/'N' — enable size-wise budget rate/CMT |
| Stitching_DeptCode | INT | Department ID for stitching (referenced in business logic) |
| Stitching_StageID | INT | Stage ID for stitching operations |

**Business Rules**:
- `Options` is a single-row configuration table storing system-wide settings
- Flags control feature toggles across all modules (gate pass, budget modes, etc.)
- Referenced by stored procedures and views for conditional logic
- Changes here affect system-wide behavior without code changes

### 12.2 Options_FM (Form-Level Options)

**Table**: `Options_FM`

**Purpose**: Stores form-specific configuration (e.g., visible columns, default values, behavior flags per form).

### 12.3 Finance Year

**Table**: `FinanceYear`  
**Form**: `FrmFinyearLogin`  
**Trigger**: `Trg_Finyear_Update`

**Business Rules**:
- Stores fiscal year periods (e.g., "24-25" = April 2024 – March 2025)
- Users select financial year at login — all transactions are filtered by active financial year
- `OrderMas.Finyear` stores which financial year an order was created in
- Trigger sets `UpdateFlg` for multi-server sync

### 12.4 Government Holidays

**Table**: `GovtHolidays`  
**Form**: `Frm_Mas_Holiday`

| Column | Type | Description |
|--------|------|-------------|
| GHDate | DATETIME | Holiday date |

**Business Rules**:
- Used by `WF_PlanFinishDateArrival` function to calculate working days
- Holidays are skipped when calculating plan finish dates
- Sundays (day-of-week = 1 in SQL Server) are treated as weekly off

### 12.5 Preprint Settings

**Table**: `Preprint`

| Column | Type | Description |
|--------|------|-------------|
| DcRateReqd | BIT/CHAR(1) | Whether DC should show rate per department |

**Business Rules**:
- Controls print behavior per department — whether rates appear on DCs
- Referenced in `VUE_DEL_PRSRT` view for DC printing

---

## 13. User & Access Management

### 13.1 User Master

**Table**: `Mas_User`  
**Form**: `FrmMasuser`

| Column | Type | Description |
|--------|------|-------------|
| ID | INT (PK) | User identifier |
| Username | VARCHAR | Login username |

**Business Rules**:
- No stored procedures for authentication — handled entirely at application (.NET WinForms) level
- Users are associated with companies via `FrmCompanyRights`
- Login flow: `FrmLogin_New` → verify credentials → `FrmCompanyLogin` → `FrmFinyearLogin` → Main Menu

### 13.2 User Group Master

**Form**: `FrmUserGroupMas`

**Purpose**: Groups users for bulk rights assignment (e.g., "Admin", "Data Entry", "Manager", "Viewer").

### 13.3 Menu Rights & Account Rights

**Forms**: `FrmMenuRights`, `FrmMenuAccRights`

**Business Rules**:
- `Mas_UserRights` table (inferred) stores per-user or per-group form/menu access flags
- `FrmMenuRights` manages which menu items each user/group can access
- `FrmMenuAccRights` provides account-level access restrictions (e.g., restrict certain GL accounts)
- Rights are checked at the application layer when loading forms

### 13.4 Company Rights

**Form**: `FrmCompanyRights`

**Purpose**: Restricts which companies/units a user can access in the multi-company setup.

### 13.5 Password & Login Management

**Forms**: `FrmChangePassword`, `Frm_Password_List`, `FrmLoginReg`

**Business Rules**:
- `FrmChangePassword` — standard password change form
- `Frm_Password_List` — admin tool to view/manage user passwords (security concern for modern systems)
- `FrmLoginReg` — audit trail of login events (who logged in, when, from which machine)

---

## 14. UOM Master

**Table**: `Mas_UOM`  
**Trigger**: `Trg_Mas_UOM_Update` (PK: `UomID`)

| Column | Type | Description |
|--------|------|-------------|
| UomID | INT (PK) | UOM identifier |
| Uom | VARCHAR | Unit name (e.g., "KGS", "MTR", "PCS", "ROLLS", "NOS", "SETS") |

**Business Rules**:
- UOM is critical for formula selection throughout the system:
  - **KGS-based**: `Qty × Rate` where Qty is in kilograms
  - **MTR-based**: `Qty × Rate` where Qty is in meters
  - **PCS-based**: `Qty × Rate` where Qty is count of pieces
- `Mas_Fabric.PriUomID` and `Mas_Acc.UomId` link to UOM
- UOM handling appears repeatedly in stock valuation, bill-to-be-value, and delivery rate calculations:
  ```
  IF UOM = 'KGS' → use RecKgs, DelKgs for calculations
  IF UOM = 'MTR' → use RecMtr, DelMtr for calculations
  ```
- Referenced in: every SP that deals with stock/delivery values

---

## 15. Data Synchronization (Triggers)

All 25 master data triggers follow an **identical pattern** for multi-server replication:

```sql
CREATE TRIGGER Trg_Mas_XXX_Update ON Mas_XXX AFTER UPDATE AS
BEGIN
    SET NOCOUNT ON;
    DECLARE @ID int
    IF NOT (UPDATE(server_id) OR UPDATE(UpdateFlg))
    BEGIN
        SELECT @ID = [PK] FROM INSERTED
        UPDATE Mas_XXX SET UpdateFlg = 1 WHERE [PK] = @Id
    END
END
```

**Mechanism**:
1. Any field update (except `server_id` or `UpdateFlg` themselves) sets `UpdateFlg = 1`
2. External sync process reads records where `UpdateFlg = 1`
3. Sync process replicates changes to other servers
4. Sync process resets `UpdateFlg = 0` and updates `server_id` — this does NOT re-trigger the flag (guard clause)

### Complete Trigger List

| # | Trigger | Table | PK Column |
|---|---------|-------|-----------|
| 1 | Trg_Mas_Acc_Update | Mas_Acc | ID |
| 2 | Trg_Mas_AccCategory_Update | Mas_AccCategory | ID |
| 3 | Trg_Mas_AccDes_Update | Mas_AccDes | ID |
| 4 | Trg_Mas_Buyer_Update | Mas_Buyer | BuyerID |
| 5 | Trg_Mas_BuyerDept_Update | Mas_BuyerDept | ID |
| 6 | Trg_Mas_Color_Update | Mas_Color | ColID |
| 7 | Trg_Mas_Component_Update | Mas_Component | CompID |
| 8 | Trg_Mas_Count_Update | Mas_Count | CountID |
| 9 | Trg_Mas_Dept_Update | Mas_Dept | DeptID |
| 10 | Trg_Mas_Design_Update | Mas_Design | DesignId |
| 11 | Trg_Mas_Dia_Update | Mas_Dia | DiaID |
| 12 | Trg_Mas_Emp_Update | Mas_Emp | EmpId |
| 13 | Trg_Mas_Fabric_Update | Mas_Fabric | FabID |
| 14 | Trg_Mas_Fcy_Update | Mas_Fcy | FCY_Id |
| 15 | Trg_Mas_JobWrkComp_Update | Mas_JobWrkComp | Id |
| 16 | Trg_Mas_Lot_Update | Mas_Lot | ID |
| 17 | Trg_Mas_Merchandiser_Update | Mas_Merchandiser | ID |
| 18 | Trg_Mas_Part_Update | Mas_Part | PartID |
| 19 | Trg_Mas_Party_Update | Mas_Party | PID |
| 20 | Trg_Mas_Season_Update | Mas_Season | SeasID |
| 21 | Trg_Mas_Size_Update | Mas_Size | SizeID |
| 22 | Trg_Mas_SizeGroup_Update | Mas_SizeGroup | ID |
| 23 | Trg_Mas_StyleDesc_Update | Mas_StyleDesc | ID |
| 24 | Trg_Mas_Stylegroup_Update | Mas_StyleGroup | ID |
| 25 | Trg_Mas_UOM_Update | Mas_UOM | UomID |

---

## 16. Stored Procedures

Five stored procedures are classified under this module:

### SP_Index
- **Purpose**: Creates performance indexes on `Pro_ReqKnitt` and `Pro_ReqKnitt2` tables
- **Parameters**: None
- **Effect**: Optimizes budget view query performance by creating non-clustered indexes
- **When Used**: Run once during setup or after database migration

### SP_SizeList
- **Purpose**: Returns ordered size list for a given order/style/bit-size combination
- **Parameters**: `@Ordid INT`, `@StyleNo VARCHAR(30)`, `@BitSizeId INT`
- **Tables Read**: `OrderMas`, `OrderQtyDtl`, `OrdSizeMas`, `Mas_Size`, `Pro_ProdBitCutDet`, `Mas_Bitsize`
- **Business Rules**: Always includes a dummy "ALL" size (`SizeID = -2`) with `SNo = 999`
- **Consumers**: Cutting forms, production forms, any form needing size dropdowns

### SP_StyleChange
- **Purpose**: Renames a style number across the **entire database** (~80+ tables)
- **Parameters**: `@OrdId INT`, `@Styleno VARCHAR(20)`, `@NewStyleno VARCHAR(20)`, `@UserId INT`
- **Transaction**: Explicit `BEGIN TRANSACTION` / `COMMIT TRANSACTION`
- **Audit**: Logs old→new mapping in `Trs_StyleChangeLog`
- **Tables Updated**: OrderStyleDtl, OrderQtyDtl, Order_PartDtl, OrdQtyClrDtl, OrdSizeMas, Prog_ClrComb, Prog_Component, Pro_ReqYarn, Pro_ReqKnitt, Trs_Del2, Trs_Grn2, Pcs_StockTable, Panel_StockTable, Pay_BarcodeGeneration, PaymentDtl, ST_Production_Data, ST_Ord_inHand, Trs_Bills, Trs_Deb3, Trs_Expenses, ... and ~60 more
- **Post-Update**: Concatenates all style numbers for the order and updates `OrderMas2.StyleNo`

### SP_CpyPrgmDet
- **Purpose**: Copies programmatic details (cutting/consumption data) from one order to another
- **Parameters**: `@SourceOrdId`, `@TargetOrdId`, `@StyleNo`
- **Tables**: `Prog_ClrComb`, `Prog_Cns`, `Prog_Component`
- **Use Case**: When creating a new order similar to an existing one, copies the programming setup

### Sp_dbupdate1
- **Purpose**: Database schema migration script
- **Parameters**: `@id INT`
- **Effect**: Adds new columns to existing tables (e.g., `SubProcess` column to temp tables)
- **Note**: Run during version upgrades to alter schema

---

## 17. Scalar Functions

Four scalar functions provide utility operations used across the system:

### DSP_NumericToRupees
- **Signature**: `DSP_NumericToRupees(@RUPEES DECIMAL(30,2), @fcyID INT) → VARCHAR(2000)`
- **Purpose**: Converts numeric amount to words (Indian numbering system by default, US system for foreign currencies)
- **Logic**:
  - `@fcyID = 0`: Indian format — Crore, Lakh, Thousand with "Rupees" and "Paise"
  - `@fcyID > 0`: Looks up currency from `Mas_Fcy` → uses Billion, Million, Thousand format
- **Used In**: All invoice and DC printing for amount-in-words

### NumberToWordsNew
- **Signature**: `NumberToWordsNew(@Number DECIMAL(30,2)) → VARCHAR(2000)`
- **Purpose**: Helper function — converts the crore portion to words
- **Used By**: `DSP_NumericToRupees` for large amounts

### getLotNo
- **Signature**: `getLotNo(@s VARCHAR(50)) → INT`
- **Purpose**: Extracts numeric lot identifier from alphanumeric lot strings
- **Algorithm**: Strip leading non-numerics → take first numeric sequence → return as INT
- **Example**: `'LOT-A123B'` → `123`
- **Used In**: Stock queries, lot-based grouping and sorting

### WF_PlanFinishDateArrival
- **Signature**: `WF_PlanFinishDateArrival(@Date DATETIME, @Days INT, @flg CHAR(1)) → DATETIME`
- **Purpose**: Calculates finish date by adding working days (skipping Sundays and `GovtHolidays`)
- **Parameters**: `@flg = 'F'` (forward) or other (backward)
- **Used In**: Workflow planning, order scheduling, production planning

---

## 18. Workflows & Business Processes

### 18.1 Master Data Creation Workflow

```
1. Admin/Data Entry → Open master form (e.g., FrmPartyMaster)
2. Enter details → Validate mandatory fields (application-level)
3. Save → INSERT INTO Mas_XXX → Auto-increment PK assigned
4. IF UPDATE: Trigger (Trg_Mas_XXX_Update) fires → sets UpdateFlg = 1
5. Sync service (external) → reads UpdateFlg = 1 records → replicates to other servers → resets flag
```

### 18.2 System Login & Setup Workflow

```
1. Launch Fiberpro.exe
2. FrmLogin_New → Enter username/password
3. Application verifies credentials against Mas_User/Mas_Login
4. FrmCompanyLogin → User selects company (filtered by FrmCompanyRights)
5. FrmFinyearLogin → User selects financial year (from FinanceYear)
6. Main menu loads → menu items filtered by FrmMenuRights for this user
7. All subsequent transactions tagged with Coycode + Finyear
```

### 18.3 Style Rename Workflow

```
1. User opens style change utility
2. Selects Order → Old Style No → Enters New Style No
3. System calls SP_StyleChange(@OrdId, @OldStyle, @NewStyle, @UserId)
4. Procedure wraps ALL updates in a transaction
5. Logs the change in Trs_StyleChangeLog
6. Updates ~80+ tables where StyleNo = @OldStyle
7. Recalculates OrderMas2.StyleNo (concatenated list of all styles in order)
8. COMMIT TRANSACTION
```

### 18.4 Department Configuration Workflow

```
1. Admin opens FrmDeptMasterNew
2. Configures department with:
   - InputType/OutputType (what the dept consumes/produces: Yarn or Fabric)
   - RecMethod ('D' for DC-based receipt, 'O' for order-based)
   - DCFormat (which report template to use for printing DCs)
   - SemiFinish flag ('S' or 'F')
   - AccProsDept flag (if it processes accessories)
   - DC_TermCode (default terms printed on DCs)
   - DeptGrpCode (which group — affects DC number prefix)
   - OrderSno (sort order in reports)
3. Admin opens frmDeptSettings for advanced settings:
   - Process bypass settings (FrmProcessByPassSetting)
   - Sub-process configuration (Frm_SubProcess)
4. Department is now available in: Order Programming, DC creation, GRN entry, Production entry, Budget
```

---

## 19. Integration Points with Other Modules

### Outbound Dependencies (Masters → Other Modules)

| Master Entity | Consuming Modules | Key Usage |
|--------------|-------------------|-----------|
| **Mas_Buyer** | Order Management, Billing, Dispatch | Order creation, invoice generation, GST state comparison |
| **Mas_Party** | Procurement, Dispatch, Billing, Production | PO/DC/GRN creation, party balance, production bills, payments |
| **Mas_Exporter** | All modules | Multi-company isolation (`Coycode`), GST "home state" reference |
| **Mas_Fabric** | Inventory, Programming, Dispatch, Billing | Stock tracking, requirement calculations, GST rate via HSN |
| **Mas_Color** | All stock & production modules | Order breakdown, stock tracking, production tracking |
| **Mas_Size** | Order Mgmt, Cutting, Production, Dispatch | Quantity breakdown, cutting plans, production entry, packing lists |
| **Mas_Dept** | Procurement, Dispatch, Production, Costing | Process flow, DC/GRN creation, formula selection (InputType/OutputType) |
| **Mas_HSN** | Billing, GST | GST rate determination (branded/non-branded, low/high value) |
| **Mas_Godown** | Inventory, Dispatch | Stock location tracking, godown transfers |
| **Mas_Count** | Inventory (Yarn), Programming | Yarn stock tracking, requirement calculations |
| **Mas_Dia** | Programming, Inventory | Knitting requirement calculations, stock tracking |
| **Mas_Part** | Cutting, Production | Garment part definitions, cutting patterns, assembly tracking |
| **Mas_AddDed** | Billing | Invoice additions/deductions (GST, discounts, freight) |
| **Mas_UOM** | All stock modules | Formula selection (KGS vs MTR vs PCS calculations) |
| **Mas_JobWrkComp** | Job Work, Production | Work nature definitions, job work stages |
| **Mas_Season** | Order Management | Order classification |
| **Mas_Lot** | Inventory, Programming | Traceability (yarn receipt → delivery) |
| **Mas_Fcy** | Billing (Commercial) | Currency conversion in invoices |
| **Mas_State** | All GST-affected modules | Inter-state vs intra-state GST determination |

### Inbound Dependencies (Other Modules → Masters)

| Source Module | Impact on Masters |
|--------------|-------------------|
| **Order Management** | Creates style entries (OrderStyleDtl) referencing Mas_StyleDesc; SP_StyleChange updates masters-adjacent tables |
| **Inventory** | Stock tables reference all material masters; CurrentStock trigger syncs with master sync system |
| **Billing** | Tally GST setup (FrmTally_GSTSetup) configures HSN mapping |

---

## 20. Business Rules Summary

### Data Integrity Rules

1. **Referential Integrity**: Enforced at application level (no SQL foreign key constraints observed). Masters are referenced by ID in transaction tables.
2. **Deletion Protection**: Master records likely cannot be deleted if referenced by transactions (enforced in application code, not database constraints).
3. **Audit Trail**: Style changes logged in `Trs_StyleChangeLog`. Login events logged via `FrmLoginReg`.
4. **Primary Keys**: All master tables use `INT IDENTITY` auto-increment primary keys.

### Synchronization Rules

5. **UpdateFlg Pattern**: Every master table update (except to `server_id`/`UpdateFlg` fields) sets `UpdateFlg = 1` via AFTER UPDATE trigger.
6. **Server ID Guard**: Sync process updates `server_id` — trigger's guard clause prevents infinite sync loops.
7. **Single-Row Processing**: Triggers use `SELECT @ID = [PK] FROM INSERTED` — implies single-record updates only (bulk updates would lose rows).

### GST Determination Rules

8. **State Comparison**: `Exporter.Stateid` vs `Party.Stateid` (or `Buyer.Stateid` if buyer specified) determines CGST+SGST (intra-state) vs IGST (inter-state).
9. **HSN Rate Tiers**: Four-tier rates based on Branded/Non-Branded × Low/High value. `Mas_Fabric.BrandedFlag` and `Mas_HSN.UnitRate` threshold drive selection.

### Department-Specific Rules

10. **Input/Output Types**: `Mas_Dept.InputType` ('Y'/'F') and `OutputType` ('Y'/'F') determine material flow types per department.
11. **Hardcoded Departments**: DeptID 4 (Knitting), 8 (Dyeing), 10 (Printing) have special handling in triggers and stored procedures.
12. **Receipt Method**: `RecMethod = 'D'` (DC-based) vs `'O'` (Order-based) determines GRN workflow per department.

### UOM-Driven Formula Selection

13. **KGS Path**: When UOM = 'KGS', system uses weight-based quantities (RecKgs, DelKgs) and weight-based rates.
14. **MTR Path**: When UOM = 'MTR', system uses length-based quantities (RecMtr, DelMtr) and length-based rates.
15. **PCS Path**: When UOM = 'PCS', system uses count-based quantities.

### Multi-Company Rules

16. **Coycode Isolation**: Every query/report filters by active `Coycode` (= `Mas_Exporter.ExpID`).
17. **Company Selection**: Users select company at login; subsequent operations are scoped to that company.
18. **Company Rights**: `FrmCompanyRights` restricts which companies a user can access.

---

*This document covers the complete Masters & Configuration module of FiberPro ERP. It serves as the foundational reference for all other module documentation, as every transaction, stock movement, and business calculation ultimately references the master data defined here.*
