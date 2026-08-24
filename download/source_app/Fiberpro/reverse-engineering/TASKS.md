# FiberPro Reverse Engineering — Task List

## Task 1: Extract Database Schema from SQL Files
**Status**: not-started
**Priority**: Critical (foundation for all other tasks)
**Description**: Parse every .sql file in SPQuery/, SPFunction/, SPTriggers/, SPTriggers/SPViews/ and Report/ folders to extract all referenced SQL Server table names, column names, data types (inferred), and relationships (JOINs, foreign keys). Produce a comprehensive `database-schema.md` documenting every table with its columns, inferred purpose, and relationships.
**Input**: All .sql files across the workspace (~380 SQL files)
**Output**: `reverse-engineering/output/database-schema.md`

## Task 2: Extract All Formulas and Calculations
**Status**: not-started
**Priority**: Critical
**Description**: Analyze all stored procedures, functions, triggers, and report code-behind files to extract every business formula and calculation. This includes:
- Stock valuation formulas (weighted average, FIFO, bill rate vs process rate)
- GST/SGST/IGST tax calculations
- Bill-to-be value calculations (yarn, fabric, accessories)
- Production costing (budget rate × quantity, CMT rates, size-wise budgets)
- Daily Unit P&L calculation logic
- Currency conversion (NumericToRupees, multi-currency FCY)
- Cumulative bill rate cascading through process departments
- Lot number extraction algorithm
- Plan finish date calculation (working days, holidays, weekly offs)
- Party balance and outstanding calculations
- Profitability and budget vs actual variance formulas
**Input**: SPFunction/*.sql, SPQuery/*.sql (costing/billing/stock procs), SPTriggers/*.sql, Report/*.cs, Report/*.vb
**Output**: `reverse-engineering/output/formulas-and-calculations.md`

## Task 3: Analyze Stored Procedures by Module
**Status**: not-started
**Priority**: High
**Description**: Group and analyze all ~240 stored procedures by functional module. For each procedure, document: purpose, input parameters, tables affected, business rules encoded, and which forms/reports consume it. Organize by the 14 modules defined in the PLAN.
**Input**: SPQuery/*.sql (~240 files)
**Output**: `reverse-engineering/output/stored-procedures-analysis.md`

## Task 4: Analyze Triggers, Views, and Functions
**Status**: completed
**Priority**: High
**Description**: Document all ~60 triggers (what table they fire on, what they do, what integrity rules they enforce), all ~16 views (what derived data they expose), and all 4 functions (utility formulas). Map each to its module.
**Input**: SPTriggers/*.sql, SPTriggers/SPViews/*.sql, SPFunction/*.sql
**Output**: `reverse-engineering/output/triggers-and-views-analysis.md`

## Task 5: Document Masters & Configuration Module
**Status**: not-started
**Priority**: High
**Description**: Detail all master data forms and their functionalities: Buyer, Party, Fabric, Color, Size, Department, Machine, Godown, Style, Employee, Bank, HSN, UOM, Season, Count, Dia, Design, Component, Work Nature, etc. Document CRUD operations, validation rules, dependencies between masters, and data structures.
**Input**: candidate-forms.txt (Frm*Master, FrmMas*, etc.), SPTriggers/Trg_Mas_*.sql, relevant SPQuery files
**Output**: `reverse-engineering/output/module-functionalities/01-masters-configuration.md`

## Task 6: Document Order Management & Sales Module
**Status**: not-started
**Priority**: High
**Description**: Detail order sheet creation (new, domestic, amendment, with-amend), order enquiry, order status tracking, order registers, sample entry, trading orders, order-wise piece registers, order close/completion, order display settings, and all related workflows.
**Input**: Forms (FrmOrderSheet*, FrmOrd*, frmSalINV, etc.), SPQuery/SP_OrderStatus*.sql, SP_Vue_Order*.sql
**Output**: `reverse-engineering/output/module-functionalities/02-order-management-sales.md`

## Task 7: Document Procurement & Supplier Module
**Status**: completed
**Priority**: High
**Description**: Detail purchase order flows (multi-order, HO, accessories), GRN entry (multi-process, multi-order, accessories, returns), supplier order registers, PO balance tracking, PO cancellation, rate confirmation, and supplier history.
**Input**: Forms (frmPurchaseOrd*, frmGRN*, FrmPurGrn*, FrmSupp*), SPQuery/SP_ORD_GRNSTATUS.sql, Sp_POBalnce.sql
**Output**: `reverse-engineering/output/module-functionalities/03-procurement-supplier.md`

## Task 8: Document Inventory & Warehouse Module
**Status**: not-started
**Priority**: High
**Description**: Detail stock registers (yarn, fabric, accessories, general, piece, panel, finished goods), stock adjustments, godown transfers, godown acknowledgements, opening stock entry, stock ledger, IO history, item-wise registers, roll split, weight scale integration.
**Input**: Forms (FrmStock*, frmStockView, FrmGoDown*, frmOpeningStock*, etc.), SPQuery stock procs, triggers
**Output**: `reverse-engineering/output/module-functionalities/04-inventory-warehouse.md`

## Task 9: Document Cutting, Panels & Piece Goods Module
**Status**: not-started
**Priority**: High
**Description**: Detail cutting production (auto, manual), cutting issue, cutting acknowledgement, panel production, panel delivery/receipt, panel excess/rejection, piece delivery/receipt (including ship, rework, close), barcode reading, bundle production entry, ready-to-cut, piece stock adjustments, piece transfer, shortage tracking.
**Input**: Forms (FrmCutting*, frmPcs*, frmPanel*, FrmBundle*), SPQuery/PROC_Stock_Prod*, SP_Cuttingpanelrpt.sql
**Output**: `reverse-engineering/output/module-functionalities/05-cutting-panels-pieces.md`

## Task 10: Document Production & Shop Floor Module
**Status**: not-started
**Priority**: High
**Description**: Detail production entry (regular, panel, line-out), line input/output (manual), hourly production, shift wages, production status registers, finished goods entry, issue to production, production configuration, production route templates, sub-process management, in-house production status.
**Input**: Forms (frmProduction*, FrmLineInput*, FrmProdEntry*, etc.), SPQuery/Sp_ProductionEntryQty*.sql, SP_Vue_PRod*.sql
**Output**: `reverse-engineering/output/module-functionalities/06-production-shopfloor.md`

## Task 11: Document Dispatch, Delivery & Logistics Module
**Status**: not-started
**Priority**: High
**Description**: Detail fabric/yarn/accessory/general/piece delivery, delivery returns, gate entry/pass, loading, packing lists (domestic, solid), DC (delivery challan) types, unit transfer/acknowledgement, godown transfer acknowledgement, dispatch completion, DC-wise details, lot-wise details.
**Input**: Forms (FrmFabDel*, FrmAccDel*, FrmGenDC*, frmPcsDel*, FrmGateEntry*, FrmLoading*, FrmPackingList*), SPQuery/FabDeliverySP.sql
**Output**: `reverse-engineering/output/module-functionalities/07-dispatch-delivery-logistics.md`

## Task 12: Document Accounting, Billing & GST Module
**Status**: not-started
**Priority**: High
**Description**: Detail invoice creation (local, domestic, commercial, piece), debit notes (direct, yarn, fabric, accessories), bill pass, party balance, billing registers, GST/SGST handling, bill additions/deductions, sales invoice, Tally integration, bill-to-be value calculation, non-billable handling, payment registers.
**Input**: Forms (FrmLocalInvoice*, frmNewInv*, frmdebitnote*, frmBillPass*, FrmPartyBalance*, etc.), SPQuery/SP_Bill*.sql, SP_SalesInv.sql, SP_InvQry1.sql
**Output**: `reverse-engineering/output/module-functionalities/08-accounting-billing-gst.md`

## Task 13: Document Costing, Budgeting & Finance Module
**Status**: not-started
**Priority**: High
**Description**: Detail pre-costing (component masters, input), production costing, budget creation (new, job work), budget vs actual comparison, expense entries (fixed, style-wise, group), daily unit P&L, profitability reports (buyer P&L, domestic P&L), rate masters, approved rate confirmation, pending rate confirmation, one-page cost report.
**Input**: Forms (Frm_CostingInput*, frmBudget*, FrmExpense*, etc.), SPQuery/SP_Bud*.sql, Sp_DailyUnitPANDL.sql, SP_Vue_OrderStyleWiseCost.sql
**Output**: `reverse-engineering/output/module-functionalities/09-costing-budgeting-finance.md`

## Task 14: Document Remaining Modules (JobWork, Quality, HR, Reporting)
**Status**: not-started
**Priority**: Medium
**Description**: Document the remaining four smaller modules:
- **Job Work & Outsourcing**: Contract allotment, supplier production, job work piece returns, job order lists, supplier order sheets
- **Quality, Lab & Approvals**: Lab tests, lab test parameters/stages, lot approval, rate approval, reprocess approval, grammage
- **HR, Labor & Payroll**: Employee master, production wages, shift wages, hourly settings, daily in/out, department groups
- **Reporting & Analytics**: Crystal/Stimulsoft report catalog, MIS settings, barcode integration, email/SMS setup, Excel import
**Output**: `reverse-engineering/output/module-functionalities/10-jobwork-quality-hr-reporting.md`

## Task 15: Document Data Storage Architecture & Data Transfer Strategy
**Status**: completed
**Priority**: Critical
**Description**: Create a comprehensive data transfer strategy for existing FiberPro customers:
- Map all SQL Server databases (main ERP, GsMail, ProductionDB) and their purposes
- Document multi-company/multi-fiscal-year data partitioning
- Map SQL Server tables → MongoDB collection designs (embedding vs referencing)
- Define ETL transformation rules for each entity type
- Address data integrity constraints that need application-level enforcement in MongoDB
- Document connection string patterns and database switching logic
- Provide a data validation checklist for post-migration verification
**Input**: Fiberpro.exe.config, database-schema.md, all analysis outputs
**Output**: `reverse-engineering/output/data-transfer-strategy.md`

## Task 16: Generate REST API Endpoints Map for MERN Backend
**Status**: not-started
**Priority**: Medium
**Description**: Based on all module functionalities, stored procedures, and forms analyzed, generate a comprehensive REST API endpoint map for the MERN backend. Group by module, include HTTP methods, request/response shapes, and map to legacy stored procedures.
**Output**: `reverse-engineering/output/api-endpoints-map.md`
