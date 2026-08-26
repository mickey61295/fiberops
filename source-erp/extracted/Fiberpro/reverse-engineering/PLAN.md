# FiberPro ERP - Complete Reverse Engineering & MERN Migration PRD

## 1. Objective

Perform a comprehensive reverse-engineering of the FiberPro ERP application (a .NET WinForms garment/textile ERP) to extract:

1. **All functionalities** — every form, workflow, and business process in detail
2. **All formulas and calculations** — stock valuation, costing, P&L, billing, GST, currency conversion, production rates, budgets
3. **Complete data storage map** — all SQL Server tables, relationships, stored procedures, triggers, views, and data flows so we can offer **data transfer** for existing customers migrating to the new MERN stack app

## 2. Source Application Profile

| Attribute | Value |
|---|---|
| Name | FiberPro (product name: JOMS) |
| Vendor | Global Softwares |
| Version | 2.5.9.4 |
| Framework | .NET Framework 2.0, VB.NET, WinForms (x86) |
| Database | SQL Server (multiple databases: main ERP, GsMail, Production) |
| Reporting | Stimulsoft (.mrt, 150 files), Crystal Reports (.rpt, 180 files) |
| Forms | 321 WinForms classes in Fiberpro.exe |
| Stored Procedures | ~240 in SPQuery folder |
| Triggers | ~60 in SPTriggers folder |
| Views | ~16 in SPTriggers/SPViews folder |
| Functions | 4 in SPFunction folder |
| Key DLLs | GReportConfig.dll (2432 types), Fiberpro Library.dll, Fiberpro_ReportLibrary.dll, CustomFlexGrid.dll |

## 3. Identified Modules (14)

1. **Masters & Configuration** — Buyer, Party, Fabric, Color, Size, Department, Machine, Godown, Style, etc.
2. **Authentication & Administration** — Login, company selector, user/role/rights, fiscal year, system settings
3. **Order Management & Sales** — Order sheets, amendments, enquiries, order status, order registers, trading orders, domestic orders
4. **Procurement & Supplier Management** — Purchase orders, supplier orders, GRN (goods receipt), PO balance, supplier registers
5. **Inventory & Warehouse** — Stock registers (yarn, fabric, accessories, general, piece goods), stock adjustments, godown transfers, opening stock
6. **Cutting, Panels & Piece Goods** — Cutting production, panel production, piece delivery/receipt, barcode, bundle management, rework
7. **Production & Shop Floor** — Production entry, line input/output, hourly production, shift wages, production status, finished goods
8. **Dispatch, Delivery & Logistics** — Fabric/Yarn/Acc/General/Pcs delivery, gate entry/pass, loading, packing lists, unit transfers
9. **Accounting, Billing & GST** — Invoices (local/domestic/commercial), debit notes, bill-pass, party balance, billing registers, GST/SGST, Tally integration
10. **Costing, Budgeting & Finance** — Pre-costing, production cost, budget vs actual, expense entries, P&L, profitability, rate approvals
11. **Job Work & Outsourcing** — Job work budgets, contract allotments, supplier production, job work piece returns
12. **Quality, Lab & Approvals** — Lab tests, lab test parameters, lot approvals, rate approvals, reprocess approvals
13. **HR, Labor & Payroll Support** — Employee master, production wages, shift wages, hourly settings, daily in/out
14. **Reporting, Analytics & Integrations** — Crystal Reports, Stimulsoft reports, MIS, barcode printing, email/SMS, Excel export

## 4. Deliverables

Each task below produces a detailed markdown document in `reverse-engineering/output/`:

| Deliverable | Description |
|---|---|
| `database-schema.md` | All tables inferred from SQL, their columns, relationships, and purpose |
| `formulas-and-calculations.md` | Every formula: stock valuation, costing, GST, bill value, P&L, currency, etc. |
| `stored-procedures-analysis.md` | Detailed analysis of all ~240 stored procedures grouped by module |
| `triggers-and-views-analysis.md` | All triggers (data integrity rules) and views (derived data) documented |
| `module-functionalities/` | Per-module detailed functionality docs (one file per module) |
| `data-transfer-strategy.md` | SQL Server → MongoDB migration map, ETL approach, data validation strategy |
| `api-endpoints-map.md` | Suggested REST API endpoints for the MERN backend, mapped from legacy forms |

## 5. Approach

- **SQL-first analysis**: Parse all .sql files in SPQuery, SPFunction, SPTriggers, SPTriggers/SPViews to extract table names, column names, relationships, formulas, and business rules
- **Report code-behind analysis**: Parse .cs, .vb, .sql files in Report/ folder for data queries, formatting logic, and formula calculations
- **Assembly metadata analysis**: Use the already-extracted 321 form names and 2432 report config types to map UI workflows
- **Config analysis**: Connection strings, app settings for multi-database architecture
- **Cross-reference**: Link forms → stored procedures → tables → reports to build complete data flow maps

## 6. Data Transfer Strategy Scope

For existing FiberPro customers migrating to the new MERN app:
- Map every SQL Server table to a MongoDB collection design
- Identify primary/foreign key relationships for embedding vs referencing decisions
- Document data transformation rules (types, formats, calculated fields)
- Provide ETL scripts or migration tool specifications
- Address multi-company, multi-fiscal-year data partitioning
