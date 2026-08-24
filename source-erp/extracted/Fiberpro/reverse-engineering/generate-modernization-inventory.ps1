param(
    [string]$RootPath = (Split-Path -Parent $PSScriptRoot),
    [string]$OutputPath = (Join-Path $PSScriptRoot "output")
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function New-ModuleDefinition {
    param(
        [string]$Name,
        [string]$Slug,
        [string]$Summary,
        [string[]]$Keywords,
        [string[]]$Pages,
        [string[]]$Requirements,
        [string[]]$Capabilities
    )

    [PSCustomObject]@{
        Name = $Name
        Slug = $Slug
        Summary = $Summary
        Keywords = $Keywords
        Pages = $Pages
        Requirements = $Requirements
        Capabilities = $Capabilities
    }
}

function Get-Matches {
    param(
        [string[]]$Items,
        [string[]]$Keywords
    )

    if ($null -eq $Items) {
        return @()
    }

    return @($Items | Where-Object {
        $item = $_
        foreach ($keyword in $Keywords) {
            if ($item -match $keyword) {
                return $true
            }
        }
        return $false
    } | Sort-Object -Unique)
}

function Add-Lines {
    param(
        [System.Collections.Generic.List[string]]$Lines,
        [string[]]$Values
    )

    foreach ($value in $Values) {
        $Lines.Add($value)
    }
}

if (-not (Test-Path $OutputPath)) {
    New-Item -ItemType Directory -Path $OutputPath | Out-Null
}

$formsPath = Join-Path $OutputPath "candidate-forms.txt"
$forms = @()
if (Test-Path $formsPath) {
    $forms = @(Get-Content $formsPath | Where-Object { $_.Trim() })
}

$reportFiles = @(
    Get-ChildItem (Join-Path $RootPath "Report") -Recurse -File -ErrorAction SilentlyContinue |
    Select-Object -ExpandProperty Name |
    Sort-Object -Unique
)

$sqlFiles = @()
foreach ($folder in @("SPQuery", "SPFunction", "SPTriggers", "SPTriggers\SPViews")) {
    $path = Join-Path $RootPath $folder
    if (Test-Path $path) {
        $sqlFiles += @(Get-ChildItem $path -Recurse -File -ErrorAction SilentlyContinue |
            Select-Object -ExpandProperty Name)
    }
}
$sqlFiles = @($sqlFiles | Sort-Object -Unique)

$modules = @(
    (New-ModuleDefinition -Name "Authentication and Administration" -Slug "auth-admin" -Summary "Company login, user access, fiscal-year controls, and system administration." -Keywords @(
        "Login", "Password", "Rights", "User", "Menu", "Company", "Finyear", "Admin", "Lock", "FormDef", "Options", "DataDelete", "Delete", "SMSMail", "DocumentStore"
    ) -Pages @(
        "/login",
        "/company-selector",
        "/admin/users",
        "/admin/roles",
        "/admin/menu-rights",
        "/admin/company-rights",
        "/admin/fiscal-years",
        "/admin/system-settings",
        "/admin/document-store",
        "/profile/change-password"
    ) -Requirements @(
        "Support company-aware authentication and fiscal year context selection.",
        "Implement role-based access control down to menu, action, and warehouse scope.",
        "Provide user, role, and permission maintenance with audit visibility.",
        "Preserve utility flows such as password reset, lock/unlock, and controlled data maintenance.",
        "Allow configuration of global settings, notification setup, and document storage metadata."
    ) -Capabilities @(
        "JWT or session-based auth",
        "RBAC with company and godown scoping",
        "Audit logs",
        "System settings service"
    )),
    (New-ModuleDefinition -Name "Masters and Configuration" -Slug "masters" -Summary "Reference data and setup for parties, items, styles, departments, warehouses, and banking." -Keywords @(
        "Master", "Mas", "Buyer", "Supplier", "Party", "Fabric", "Yarn", "Acc", "Item", "Dept", "Design", "Dia", "Color", "Size", "Season", "Bank", "Godown", "Concern", "Range", "HSN", "Mill", "Machine", "Template", "UOM", "Count", "Style", "Category"
    ) -Pages @(
        "/masters/parties",
        "/masters/buyers",
        "/masters/suppliers",
        "/masters/items",
        "/masters/fabrics",
        "/masters/yarns",
        "/masters/accessories",
        "/masters/styles",
        "/masters/departments",
        "/masters/godowns",
        "/masters/banks",
        "/masters/machines",
        "/masters/tax-codes"
    ) -Requirements @(
        "Centralize all reference masters with search, approval-safe edits, and effective dating where needed.",
        "Support bulk import and validation for style, fabric, yarn, and party catalogs.",
        "Maintain department, machine, warehouse, bank, and tax metadata used across modules.",
        "Expose reusable master APIs for React forms, dropdowns, and background validations.",
        "Track change history for sensitive masters such as HSN, party, and style definitions."
    ) -Capabilities @(
        "Master data service",
        "Bulk import/export",
        "Reference-data caching",
        "Change history"
    )),
    (New-ModuleDefinition -Name "Order Management and Sales" -Slug "orders-sales" -Summary "Order entry, amendments, status tracking, customer commitments, and sales-side execution." -Keywords @(
        "Order", "Ordersheet", "Ord", "Enquiry", "BuyerStatus", "Sample", "Shipment", "Sales", "CommercialInv", "CommercialTemplate", "LocalInvoice", "Inv", "OCR", "Prog", "StyleChange"
    ) -Pages @(
        "/orders",
        "/orders/new",
        "/orders/:orderId",
        "/orders/:orderId/amendments",
        "/orders/enquiry",
        "/orders/status",
        "/orders/in-hand",
        "/sales/invoices",
        "/sales/commercial-invoices",
        "/sales/packing-lists"
    ) -Requirements @(
        "Capture order sheets with buyer, style, delivery, costing, and amendment history.",
        "Track order life cycle from enquiry through production, delivery, and closure.",
        "Support domestic and export invoice variations, packing lists, and order-linked dispatch documents.",
        "Provide order status dashboards, commitment dates, and in-hand summaries.",
        "Maintain amendment history and compare current versus prior order state."
    ) -Capabilities @(
        "Order workflow engine",
        "Timeline/history",
        "Invoice document generation",
        "Order status APIs"
    )),
    (New-ModuleDefinition -Name "Procurement and Supplier Management" -Slug "procurement" -Summary "Purchase orders, supplier follow-up, GRN flows, and supplier-facing ledgers." -Keywords @(
        "Purchase", "PO", "Supplier", "GeneralPurchaseOrd", "GRN", "BillPass", "GateEntry", "GatePass", "PartyWiseJobOrderBal", "OrdInHand", "Receipt", "DeliveryFollowup", "Bill"
    ) -Pages @(
        "/procurement/purchase-orders",
        "/procurement/purchase-orders/new",
        "/procurement/grn",
        "/procurement/grn/:id",
        "/procurement/suppliers",
        "/procurement/follow-up",
        "/procurement/bill-pass",
        "/procurement/gate-entry"
    ) -Requirements @(
        "Manage purchase orders across raw materials, accessories, fabric, and outsourced services.",
        "Record GRN and receipt flows with order linkage, quantity tolerance, and return support.",
        "Support supplier follow-up, outstanding balances, and pending-rate confirmation.",
        "Handle bill-pass approvals, gate entry, and supplier document references.",
        "Provide supplier-level history across orders, receipts, invoices, and balances."
    ) -Capabilities @(
        "PO service",
        "GRN workflow",
        "Supplier ledger",
        "Approval tasks"
    )),
    (New-ModuleDefinition -Name "Inventory and Warehouse" -Slug "inventory" -Summary "Godowns, current stock, transfers, ledgers, and stock valuation across materials and piece goods." -Keywords @(
        "Stock", "Godown", "GoDown", "Transfer", "Ledger", "Opening", "Balance", "CurrentStock", "Ack", "Receipt", "Delivery", "Itemwise", "Lot", "Roll", "StockAdj", "Short", "PanelStock", "PcsStock"
    ) -Pages @(
        "/inventory/dashboard",
        "/inventory/stock-ledger",
        "/inventory/current-stock",
        "/inventory/godowns",
        "/inventory/transfers",
        "/inventory/adjustments",
        "/inventory/opening-stock",
        "/inventory/lot-tracking",
        "/inventory/roll-tracking",
        "/inventory/valuation"
    ) -Requirements @(
        "Maintain real-time stock by godown, lot, roll, piece, and material category.",
        "Support transfers, acknowledgments, stock adjustments, and opening balance loads.",
        "Provide stock ledgers, item-wise availability, and valuation reports.",
        "Preserve stock-posting integrity that currently lives in SQL procedures and triggers.",
        "Allow warehouse-scoped permissions and transaction audit history."
    ) -Capabilities @(
        "Inventory ledger service",
        "Warehouse transfers",
        "Stock reservation",
        "Valuation reports"
    )),
    (New-ModuleDefinition -Name "Production and Shop Floor" -Slug "production" -Summary "Production planning, line input/output, bundle and piece tracking, and stage-wise execution." -Keywords @(
        "Production", "Prod", "Line", "Bundle", "IssueToProduction", "Hourly", "Shift", "Route", "Assembly", "WBS", "Panel", "Pcs", "Inhouse", "Operation", "WorkNature", "DeptSettings"
    ) -Pages @(
        "/production/dashboard",
        "/production/planning",
        "/production/entries",
        "/production/line-input",
        "/production/line-output",
        "/production/bundles",
        "/production/pieces",
        "/production/stage-progress",
        "/production/rework",
        "/production/cost"
    ) -Requirements @(
        "Capture production transactions by stage, line, unit, bundle, and piece.",
        "Support issue-to-production, line input/output, rejection, and rework workflows.",
        "Track order-wise production progress and in-house versus supplier execution.",
        "Enable dashboards for production status, bottlenecks, and hourly or shift-level output.",
        "Keep stage-wise stock posting in sync with finished goods and WIP balances."
    ) -Capabilities @(
        "Shop-floor transaction APIs",
        "Realtime progress updates",
        "WIP tracking",
        "Rework management"
    )),
    (New-ModuleDefinition -Name "Cutting, Panels, and Piece Goods" -Slug "cutting-panels" -Summary "Cutting plans, panel and piece movement, ready-to-cut control, and piece dispatch/receipt flows." -Keywords @(
        "Cut", "Cutting", "Panel", "ReadytoCut", "READYTOCUT", "Piece", "Pcs", "BundleBarcode", "Barcode", "Split", "PackingList", "PanelReceipt", "PiecesReceipt", "Despatch"
    ) -Pages @(
        "/cutting/job-orders",
        "/cutting/issues",
        "/cutting/production",
        "/cutting/ready-to-cut",
        "/panels/assembly",
        "/pieces/receipts",
        "/pieces/despatch",
        "/pieces/transfers",
        "/barcodes/scan"
    ) -Requirements @(
        "Manage cutting job orders, issue slips, cutting output, and ready-to-cut balances.",
        "Track panel assembly and piece-level stock movement between production stages and units.",
        "Support piece receipt, despatch, transfer, and packing list generation.",
        "Validate bundle and piece transactions with barcode scanning and duplicate checks.",
        "Preserve rework and rejection handling for panel and piece inventory."
    ) -Capabilities @(
        "Barcode scanning",
        "Panel and piece ledgers",
        "Cutting workflow",
        "Packing list generation"
    )),
    (New-ModuleDefinition -Name "Quality, Lab, and Approvals" -Slug "quality-approvals" -Summary "Lab tests, approvals, non-return handling, and workflow checks across materials and production." -Keywords @(
        "LabTest", "Approval", "Approve", "NonReturn", "Reprocess", "Test", "QC", "Quality", "LotApproval", "ItemApproval", "Meeting", "WF_"
    ) -Pages @(
        "/quality/lab-tests",
        "/quality/parameters",
        "/quality/results",
        "/approvals/pending",
        "/approvals/lots",
        "/approvals/accessories",
        "/approvals/reprocess",
        "/approvals/non-return-dc"
    ) -Requirements @(
        "Configure test parameters and capture stage-wise lab or quality observations.",
        "Provide approval queues for lots, accessories, reprocess, and non-return movements.",
        "Record status changes, approver identity, remarks, and escalation timestamps.",
        "Support document-linked workflows and evidence storage for approval decisions.",
        "Expose quality and approval states to downstream production and dispatch modules."
    ) -Capabilities @(
        "Workflow engine",
        "Approval inbox",
        "Quality data capture",
        "Evidence attachments"
    )),
    (New-ModuleDefinition -Name "Dispatch, Delivery, and Logistics" -Slug "dispatch-logistics" -Summary "Delivery challans, acknowledgments, gate processes, and outbound movement documentation." -Keywords @(
        "DC", "Delivery", "Despatch", "Dispatch", "Ack", "PackingList", "Ship", "Courier", "Gate", "Transfer", "Receipt", "Invoice_DC"
    ) -Pages @(
        "/dispatch/challans",
        "/dispatch/challans/new",
        "/dispatch/packing-lists",
        "/dispatch/acknowledgements",
        "/dispatch/courier",
        "/dispatch/gate-pass",
        "/dispatch/receipts"
    ) -Requirements @(
        "Generate delivery challans for accessories, fabric, general materials, and piece goods.",
        "Maintain dispatch acknowledgments, courier references, and gate-pass activity.",
        "Link dispatch documents back to orders, stock movement, and invoice preparation.",
        "Support multiple print formats and customer-specific document layouts.",
        "Provide receipt and return flows for inter-unit and external movement."
    ) -Capabilities @(
        "Document numbering",
        "PDF/print layouts",
        "Dispatch tracking",
        "Acknowledgment workflow"
    )),
    (New-ModuleDefinition -Name "Accounting, Billing, and GST" -Slug "accounting" -Summary "Invoices, debit notes, party balances, billing registers, and statutory tax handling." -Keywords @(
        "Acc", "Invoice", "Bill", "Debit", "Credit", "GST", "Tally", "PartyBalance", "Balance", "BillsReg", "BillPass", "SalesInvoice", "Payment", "Ledger", "CommercialInv"
    ) -Pages @(
        "/accounts/dashboard",
        "/accounts/invoices",
        "/accounts/debit-notes",
        "/accounts/bill-pass",
        "/accounts/party-ledger",
        "/accounts/bills-register",
        "/accounts/gst-settings",
        "/accounts/tally-integration"
    ) -Requirements @(
        "Generate and maintain local, domestic, and commercial invoices with GST-aware fields.",
        "Support debit note, bill-pass, and party balance workflows.",
        "Expose billing registers, invoice valuation, and outstanding statements.",
        "Preserve Tally and statutory integration points or replace them with export APIs.",
        "Ensure accounting data is traceable back to stock and order transactions."
    ) -Capabilities @(
        "Invoice engine",
        "Ledger service",
        "GST calculations",
        "Accounting integration adapters"
    )),
    (New-ModuleDefinition -Name "Costing, Budgeting, and Finance" -Slug "costing-budgeting" -Summary "Pre-costing, budget vs actual, expense capture, and production or order profitability." -Keywords @(
        "Cost", "Budget", "Expense", "PANDL", "Rate", "Value", "CostingInput", "Bud", "Actual", "Profit", "Wages", "DailyCosting"
    ) -Pages @(
        "/costing/templates",
        "/costing/input",
        "/costing/production-cost",
        "/budgets",
        "/budgets/new",
        "/budgets/vs-actual",
        "/finance/expenses",
        "/finance/profitability"
    ) -Requirements @(
        "Capture cost components for styles, production processes, and supplier activity.",
        "Create budgets and compare them against actual material, labor, and overhead usage.",
        "Track expense groups, fixed expenses, and order-wise or department-wise allocations.",
        "Provide profitability views and order or unit level P&L reporting.",
        "Maintain rate approvals and price-control workflows that impact valuation and costing."
    ) -Capabilities @(
        "Cost engine",
        "Budget snapshots",
        "Variance analysis",
        "Profitability dashboards"
    )),
    (New-ModuleDefinition -Name "HR, Labor, and Payroll Support" -Slug "hr-payroll" -Summary "Employee masters, production wages, department rules, and payment support flows." -Keywords @(
        "Emp", "Employee", "Wages", "Payment", "Shift", "Dept", "Hourly", "ProdWages", "Salary", "Attendance"
    ) -Pages @(
        "/hr/employees",
        "/hr/departments",
        "/hr/shifts",
        "/payroll/production-wages",
        "/payroll/payments",
        "/payroll/stage-rates"
    ) -Requirements @(
        "Maintain employee, department, and shift configuration used by production and wages.",
        "Support production wages by stage, department, and employee or unit context.",
        "Link production outputs to wage calculations and payment registers.",
        "Allow rate maintenance for wage-bearing operations and departments.",
        "Expose wage and payment summaries for finance and production leadership."
    ) -Capabilities @(
        "Employee service",
        "Wage rules",
        "Payroll support reports",
        "Department rate setup"
    )),
    (New-ModuleDefinition -Name "Job Work and Outsourcing" -Slug "jobwork-outsourcing" -Summary "Contract allotment, subcontract production, supplier sequence, and outsourced material flows." -Keywords @(
        "Contract", "Supp", "SupplierProduction", "JobWork", "JobOrder", "Out", "SubProcess", "Sequence", "TechData", "UnitWise", "PartyOut", "DeliveryToSupplier"
    ) -Pages @(
        "/jobwork/contracts",
        "/jobwork/allotments",
        "/jobwork/supplier-production",
        "/jobwork/tech-sheets",
        "/jobwork/material-issues",
        "/jobwork/receipts",
        "/jobwork/balances"
    ) -Requirements @(
        "Manage contract allotment and outsourced production planning by supplier and process.",
        "Track material issues, receipts, balances, and supplier job-order exposure.",
        "Store technical data sheets and process instructions shared with suppliers.",
        "Provide supplier production progress, balances, and billing support.",
        "Distinguish in-house versus subcontract flows in stock and costing calculations."
    ) -Capabilities @(
        "Supplier execution workflow",
        "Contract lifecycle",
        "Material issue tracking",
        "Tech-sheet repository"
    )),
    (New-ModuleDefinition -Name "Reporting, Analytics, and Integrations" -Slug "reporting-integrations" -Summary "Operational reporting, print/export, barcode, Tally, email, Excel, and device integrations." -Keywords @(
        "Rpt", "Report", "Chart", "Barcode", "Mail", "Excel", "PDF", "Tally", "WeightScale", "Stimulsoft", "Crystal", "Meeting", "MIS", "Dashboard"
    ) -Pages @(
        "/reports",
        "/reports/orders",
        "/reports/production",
        "/reports/inventory",
        "/reports/accounts",
        "/analytics/dashboards",
        "/integrations/tally",
        "/integrations/barcode",
        "/integrations/email",
        "/integrations/devices"
    ) -Requirements @(
        "Rebuild the large report surface with parameterized web reports and export options.",
        "Support dashboards for orders, production, inventory, costing, and finance.",
        "Replace legacy Crystal and Stimulsoft dependencies with maintainable PDF and Excel generation.",
        "Preserve barcode, Tally, email, and device integration workflows behind clear service boundaries.",
        "Allow user-driven filtering, saved report presets, and scheduled exports where needed."
    ) -Capabilities @(
        "Reporting service",
        "PDF and Excel export",
        "Barcode integration",
        "External system adapters"
    ))
)

$moduleResults = foreach ($module in $modules) {
    $pages = @($module.Pages)
    $requirements = @($module.Requirements)
    $capabilities = @($module.Capabilities)
    $matchedForms = @(Get-Matches -Items $forms -Keywords $module.Keywords)
    $matchedReports = @(Get-Matches -Items $reportFiles -Keywords $module.Keywords)
    $matchedSql = @(Get-Matches -Items $sqlFiles -Keywords $module.Keywords)

    [PSCustomObject]@{
        Name = $module.Name
        Slug = $module.Slug
        Summary = $module.Summary
        PageCount = @($pages).Count
        RequirementCount = @($requirements).Count
        CapabilityCount = @($capabilities).Count
        MatchedForms = $matchedForms
        MatchedReports = $matchedReports
        MatchedSqlObjects = $matchedSql
        EvidenceCount = (@($matchedForms).Count + @($matchedReports).Count + @($matchedSql).Count)
        Pages = $pages
        Requirements = $requirements
        Capabilities = $capabilities
    }
}

$classifiedForms = @($moduleResults | ForEach-Object { $_.MatchedForms } | Sort-Object -Unique)
$classifiedReports = @($moduleResults | ForEach-Object { $_.MatchedReports } | Sort-Object -Unique)
$classifiedSql = @($moduleResults | ForEach-Object { $_.MatchedSqlObjects } | Sort-Object -Unique)

$inventoryModules = @($moduleResults | Sort-Object EvidenceCount -Descending | ForEach-Object {
    [PSCustomObject]@{
        Name = $_.Name
        Slug = $_.Slug
        Summary = $_.Summary
        PageCount = $_.PageCount
        RequirementCount = $_.RequirementCount
        CapabilityCount = $_.CapabilityCount
        EvidenceCount = $_.EvidenceCount
        Pages = @($_.Pages)
        Requirements = @($_.Requirements)
        Capabilities = @($_.Capabilities)
        MatchedFormsCount = @($_.MatchedForms).Count
        MatchedReportsCount = @($_.MatchedReports).Count
        MatchedSqlObjectsCount = @($_.MatchedSqlObjects).Count
        ExampleForms = @($_.MatchedForms | Select-Object -First 20)
        ExampleReports = @($_.MatchedReports | Select-Object -First 20)
        ExampleSqlObjects = @($_.MatchedSqlObjects | Select-Object -First 20)
    }
})

$inventory = [PSCustomObject]@{
    GeneratedAt = (Get-Date -Format s)
    SourceSummary = [PSCustomObject]@{
        CandidateForms = @($forms).Count
        ReportFiles = @($reportFiles).Count
        SqlObjects = @($sqlFiles).Count
        ClassifiedForms = @($classifiedForms).Count
        ClassifiedReports = @($classifiedReports).Count
        ClassifiedSqlObjects = @($classifiedSql).Count
    }
    Modules = $inventoryModules
    Unclassified = [PSCustomObject]@{
        FormsCount = @($forms | Where-Object { $_ -notin $classifiedForms }).Count
        ReportsCount = @($reportFiles | Where-Object { $_ -notin $classifiedReports }).Count
        SqlObjectsCount = @($sqlFiles | Where-Object { $_ -notin $classifiedSql }).Count
        ExampleForms = @($forms | Where-Object { $_ -notin $classifiedForms } | Sort-Object | Select-Object -First 50)
        ExampleReports = @($reportFiles | Where-Object { $_ -notin $classifiedReports } | Sort-Object | Select-Object -First 50)
        ExampleSqlObjects = @($sqlFiles | Where-Object { $_ -notin $classifiedSql } | Sort-Object | Select-Object -First 50)
    }
}

$markdownPath = Join-Path $OutputPath "mern-requirements.md"
$csvPath = Join-Path $OutputPath "modernization-module-summary.csv"

$lines = New-Object System.Collections.Generic.List[string]
Add-Lines -Lines $lines -Values @(
    "# FiberPro MERN Migration Requirements",
    "",
    "Generated: $($inventory.GeneratedAt)",
    "",
    "## Scope and method",
    "",
    "This document is inferred from the WinForms assembly surface, report templates, and SQL object names. It is a strong first-pass discovery artifact, not a line-by-line functional specification.",
    "",
    "## Source coverage",
    "",
    "- Candidate forms scanned: $($inventory.SourceSummary.CandidateForms)",
    "- Report files scanned: $($inventory.SourceSummary.ReportFiles)",
    "- SQL objects scanned: $($inventory.SourceSummary.SqlObjects)",
    "- Forms classified into modules: $($inventory.SourceSummary.ClassifiedForms)",
    "- Reports classified into modules: $($inventory.SourceSummary.ClassifiedReports)",
    "- SQL objects classified into modules: $($inventory.SourceSummary.ClassifiedSqlObjects)",
    "",
    "## Proposed MERN modules",
    "",
    "| Module | Evidence | Suggested pages | Functional requirements |",
    "| --- | ---: | ---: | ---: |"
)

foreach ($module in ($inventory.Modules | Sort-Object Name)) {
    $lines.Add("| $($module.Name) | $($module.EvidenceCount) | $($module.PageCount) | $($module.RequirementCount) |")
}

foreach ($module in ($inventory.Modules | Sort-Object Name)) {
    $lines.Add("")
    $lines.Add("## $($module.Name)")
    $lines.Add("")
    $lines.Add($module.Summary)
    $lines.Add("")
    $lines.Add("### Suggested pages")
    $lines.Add("")
    foreach ($page in $module.Pages) {
        $lines.Add("- $page")
    }
    $lines.Add("")
    $lines.Add("### Functional requirements")
    $lines.Add("")
    foreach ($requirement in $module.Requirements) {
        $lines.Add("- $requirement")
    }
    $lines.Add("")
    $lines.Add("### Backend and platform capabilities")
    $lines.Add("")
    foreach ($capability in $module.Capabilities) {
        $lines.Add("- $capability")
    }
    $lines.Add("")
    $lines.Add("### Evidence from legacy application")
    $lines.Add("")
    $lines.Add("- Matched forms: $($module.MatchedFormsCount)")
    $lines.Add("- Matched reports: $($module.MatchedReportsCount)")
    $lines.Add("- Matched SQL objects: $($module.MatchedSqlObjectsCount)")

    if (@($module.ExampleForms).Count -gt 0) {
        $lines.Add("- Example forms:")
        foreach ($item in $module.ExampleForms) {
            $lines.Add("  - $item")
        }
    }

    if (@($module.ExampleReports).Count -gt 0) {
        $lines.Add("- Example reports:")
        foreach ($item in $module.ExampleReports) {
            $lines.Add("  - $item")
        }
    }

    if (@($module.ExampleSqlObjects).Count -gt 0) {
        $lines.Add("- Example SQL objects:")
        foreach ($item in $module.ExampleSqlObjects) {
            $lines.Add("  - $item")
        }
    }
}

$lines.Add("")
$lines.Add("## Migration notes")
$lines.Add("")
$lines.Add("- Inventory and production flows currently depend on SQL-side posting procedures and triggers. Preserve transactional integrity before changing the data model.")
$lines.Add("- Reporting is extensive. Treat report migration as a separate workstream with its own prioritization and acceptance criteria.")
$lines.Add("- Barcode, print, PDF, Excel, Tally, and workflow approvals should be isolated behind service interfaces in the MERN architecture.")
$lines.Add("- Unclassified forms: $($inventory.Unclassified.FormsCount), reports: $($inventory.Unclassified.ReportsCount), SQL objects: $($inventory.Unclassified.SqlObjectsCount).")

$inventory.Modules |
    Select-Object Name, Slug, EvidenceCount, PageCount, RequirementCount, CapabilityCount, MatchedFormsCount, MatchedReportsCount, MatchedSqlObjectsCount |
    Export-Csv -Path $csvPath -NoTypeInformation

$lines | Set-Content -Path $markdownPath

Write-Host "Wrote: $markdownPath"
Write-Host "Wrote: $csvPath"