/**
 * Manual Testing Guide — content module A (Sections 1-4).
 * Block DSL consumed by gen_manual_testing_docx.js
 * h1/h2/h3: headings; p: paragraph; bullets/steps: lists;
 * table: {title, headers, rows, widths, small?}; note: italic note.
 */
module.exports = [

  // ================= SECTION 1 =================
  { h1: "1. Test Overview" },
  { p: "This guide is the single source of truth for manually verifying the FiberOps ERP application from a cold start to a fully settled order. It serves three purposes. First, it explains how the system works end to end, so a tester understands what should happen before touching any screen. Second, it defines a start-to-end walkthrough of every module in the application, with concrete steps and acceptance criteria for each area. Third, it defines the golden order flow — the fifteen-stage Tirupur knitwear job-work pipeline from sales order to payment collection — as one continuous, repeatable end-to-end test with verifiable stock, ledger, and accounting assertions at every stage." },
  { p: "The guide is written for a QA engineer or a developer performing acceptance testing on the development build. Every test case carries a unique identifier, a short list of steps to perform, and the expected result that must be observed before the case can be marked as passed. Cases are intentionally ordered: the module walkthrough (Section 4) verifies the read surfaces and navigation first, the order flow (Section 5) then exercises the full write chain, and the negative suite (Section 6) confirms that the system fails safely. A tester with no prior exposure to the legacy Fiberpro ERP can execute the full suite in approximately three to four hours." },
  { h2: "1.1 Baseline Verification Status (Automated Gates)" },
  { p: "Before manual testing begins, the automated gates below must be green. They were last verified on 2026-09-06 against the merged main branch (commit 60a87bc, which contains the complete side_quest merge: the FY single-source hotfix, wage reconciliation, and the payroll module). If any gate fails, stop and report the failure before executing the manual suite." },
  { table: {
    title: "Table 1: Automated gates and their expected results",
    headers: ["Gate", "Command", "Expected Result"],
    widths: [26, 34, 40],
    rows: [
      ["Unit / pipeline tests", "npx vitest run (in fiberops/)", "70 files, 1420 tests, all passed"],
      ["Type safety (source)", "npx tsc --noEmit (in fiberops/)", "Zero errors under src/"],
      ["Context integrity", "bash scripts/context_check.sh", "606 checks passed, NO DRIFT"],
      ["Agent routing (static)", "node scripts/eval_routing.mjs --static", "PASS"],
      ["Live route smoke", "curl each module route (Section 4)", "HTTP 200 on all live routes"],
      ["Login smoke", "POST /api/auth/login with admin fixture", "ok:true with admin user payload"],
    ],
  }},
  { p: "Note that tsc reports a small number of pre-existing errors in legacy cleanup scripts under scripts/ (for example cleanup_e2e_bills.ts, which references retired Prisma models). These are known, outside the src/ gate, and do not affect the running application. They should not be counted as failures for this test round." },

  // ================= SECTION 2 =================
  { h1: "2. How the System Works" },
  { p: "This section defines the mental model a tester needs. Read it once before executing the suite; refer back to it whenever an expected result in a later section seems surprising. Everything stated here is derived from the repository documentation (README, PLAN, docs/CONTEXT) and the shipped database." },

  { h2: "2.1 Product Background and Architecture" },
  { p: "FiberOps is a modern web rebuild of Fiberpro, a VB.NET garment ERP used by Tirupur knitwear job-work exporters. The business it models is the full export chain: yarn is purchased, knitted into fabric, dyed (often at external jobworkers), cut into panels, sewn on production lines, finished, packed, despatched against export orders, invoiced, and finally collected. The application is a single-tenant Next.js 16 App Router application written in TypeScript with Tailwind CSS and shadcn/ui components on the front end, Prisma ORM over a SQLite database (db/custom.db, currently 90 models) on the back end, and a GLM-4.6-powered AI agent harness streamed over SSE." },
  { p: "All business logic lives in one place: service functions under src/lib/erp/posting/ (44 services). The database is the source of truth; every stock-moving document writes a StockLedger row and updates CurrentStock buckets inside a single transaction. Documents are numbered gap-free by a fiscal-year-scoped numbering service. The active financial year is 26-27 (April 1 to March 31, Indian convention) and is derived from the active FinYear row at /admin/company, never from a frozen literal." },

  { h2: "2.2 The Two-Doors Principle" },
  { p: "Every operation in the application is reachable through two doors, and both doors run the same service function. Door one is the working form: keyboard-first document screens built from a shared doc-config registry, with master pickers, line grids, and register lists. Door two is the AI agent: a chat panel (right side of the shell) through which the same operations can be requested in natural language. The agent never writes directly — it produces a plan card describing exactly what it intends to do, a human approves it, and only then does the commit function persist the change inside a transaction. This plan-approve-commit loop applies to every agent write, from creating an order to committing a payroll run." },
  { p: "For a tester this has two consequences. First, any write performed through the chat must be verifiable in the corresponding form and register, and vice versa — the results must be identical because the service is shared. Second, a document ingestion path exists: attaching a buyer PO PDF in chat makes the agent extract text, propose missing masters, and then draft one order per document entity, with approvals at each phase. Coverage parity between the two doors is itself a test target (case AG-04)." },

  { h2: "2.3 Core Domain Concepts" },
  { p: "Three record families exist. Masters are reference entities (buyer, style, colour, size, party, yarn, fabric, godown, department, employee — 42 master configurations behind /masters). Documents are business transactions that reference masters and move stock or money. Registers are read-only projections over documents (order register, stock ledger, party ledger, production status, and so on), each with a CSV export and filter parameters. A tester mostly creates masters, walks documents through their lifecycle, and confirms registers reflect the truth." },
  { p: "Documents are numbered automatically by a gap-free, fiscal-year-scoped numbering service. Leaving the number field blank lets the service assign the next value; entering an explicit value is honored for historical entries, with collision protection. The prefixes a tester will see are listed in Appendix B. The most common are SO- for sales orders, PO- for purchase orders, GRN- for goods receipts, CUT- for cut orders, JW- for jobwork despatch challans, DC- for piece despatch, INV- for invoices, V- for journal vouchers, and RCP- for payment receipts." },
  { p: "Approval workflows gate a subset of writes. Purchase orders auto-submit a pending approval at commit; certain agent plans, godown transfers, and reprocess requests route through the approval inbox at /approvals, and every approval decision is written to the audit trail at /approvals/audit. User access is role-based: the admin sees everything, while users in groups see only the menu items their rights allow (matrix editable at /admin/menu-rights)." },

  { h2: "2.4 The Stock Ledger and the Posting Engine" },
  { p: "The stock ledger is the heart of the acceptance criteria in Section 5. Three godowns exist in the seeded database: G1 Main Store (holds yarn, fabric, and ready-to-cut pieces), G2 Finished Goods (holds good finished pieces), and G3 Jobworker Yard (material at external jobworkers). Every quantity move posts signed rows into StockLedger with a transaction type; the most important ones for the order flow are ready_to_cut_in (cut pieces enter G1), ready_to_cut_out (pieces leave G1 to a sewing line), production_in (good pieces enter G2), rejection_out (rejected pieces leave G2), and sales_delivery (despatched pieces leave G2)." },
  { p: "A single posting engine owns all stock writes; no other code path may write the stock tables. This means the manual tester can trust a simple invariant: whenever a document commits, every affected godown bucket changes exactly as described in the acceptance criteria, or the document fails atomically — a half-applied document cannot exist. If a stage ever appears to have committed without its stock effect, that is a critical defect, not a display quirk." },

  { h2: "2.5 Module Map" },
  { p: "The navigation sidebar groups the application into 17 modules. The landing route of each group is listed below; every group was verified to render HTTP 200 on the build under test. Menu items beyond the landing route are covered by the walkthrough cases in Section 4." },
  { table: {
    title: "Table 2: The 17 module groups and their landing routes",
    headers: ["Group", "Landing Route", "What It Covers"],
    widths: [24, 26, 50],
    rows: [
      ["Home", "/", "Dashboard KPIs, order status board, daily in/out"],
      ["Orders & Sales", "/orders", "Order sheets, Order Hub, registers, amendments, samples, enquiry"],
      ["Programs", "/programs/new", "Knitting/dyeing programs, propose-from-BOM, allotment, balances"],
      ["Procurement", "/procurement", "Purchase orders, GRNs, rate confirmations, supplier registers"],
      ["Inventory & Warehouse", "/inventory", "Stock by material, ledger, lots, rolls, transfers, stock-take"],
      ["Cutting & Panels", "/cutting", "Cut job orders, ready-to-cut, panel ops, fabric rejection"],
      ["Pieces (Finished Goods)", "/pieces/despatch", "Pcs despatch, receipt, transfer, stock, packing lists, shortage"],
      ["Production & Shopfloor", "/production", "Line issues, production entries, bundles, rework, line status"],
      ["Job Work", "/jobwork/order", "Jobwork DC out, receipt in, contracts, registers, statements"],
      ["Despatch & Logistics", "/dispatch/dc", "DCs, gate entry/pass, courier, loading, unit transfer ack"],
      ["Accounts & GST", "/accounts", "Invoices, debit notes, payments, journals, bills, HSN, Tally"],
      ["Costing & Budgets", "/costing", "Cost sheets, budgets, expenses, daily P&L, piece rates"],
      ["HR & Payroll", "/hr", "Employees, attendance, wages, wage payments, payroll, statements"],
      ["Quality & Lab", "/quality/lab-tests", "Lab tests, parameters, lot/reprocess approvals, non-return DCs"],
      ["Approvals & Workflow", "/approvals", "Cross-module approval inbox and audit trail"],
      ["Reports & Analytics", "/reports", "Report hub, packs, MIS dashboard, 30+ register reports"],
      ["Masters & Admin", "/masters", "42 masters, users, menu rights, options, flags, audit"],
    ],
  }},

  { h2: "2.6 Users, Roles, and Rights" },
  { p: "Authentication is email and password based, with session cookies set on login. The first-run bootstrap door (/api/auth/bootstrap) is only available while no user has a password; it is permanently closed on this database, so all user administration happens at /admin/users. The seeded administrator is Aslam Admin (admin@fiberpro.local). Restricted users belong to groups whose rights array lists the menu keys they may access; a restricted user with only the orders right can open /orders but is denied the accounts module. The seeded database also contains inactive guard users; an inactive account must be refused at login even with a correct password." },
  { p: "Two logins are used throughout this guide: the admin fixture for the full walkthrough, and (for negative case N-05) any restricted user you create at /admin/users during the admin tests. Password changes are made at /admin/users or through the change-password flow in the topbar; the login page offers no self-service reset." },

  { h2: "2.7 The Fifteen-Stage Order Flow Pipeline" },
  { p: "The golden flow models one export order through the whole factory. The stages, their documents, and their stock effects are summarized below. Section 5 walks every stage with concrete quantities and amounts; the table here is the reference card for the acceptance criteria. Quantities in the golden case: 1,000 pcs ordered, 950 produced good, 20 rejected, 930 despatched and invoiced, taxable value ₹195,300 plus 5% GST, collected in full." },
  { table: {
    title: "Table 3: The order flow pipeline and its stock effects",
    headers: ["#", "Stage", "Document / Number", "Stock and Money Effect"],
    widths: [6, 24, 24, 46],
    rows: [
      ["1", "Sales order", "Order SO-####", "No stock move; order register row; order total 1,000 pcs"],
      ["2", "Bill of materials", "BOM", "Planning only; per-style consumption (yarn 250 kg @ ₹320)"],
      ["3", "Program", "Program PGM-####", "Program balance rows (required vs actual kg) created"],
      ["4", "Purchase order", "PO-####", "No stock move; pending approval auto-submitted"],
      ["5", "GRN (yarn in)", "GRN-####", "Yarn enters G1 at the ordered rate; stock register row"],
      ["6", "Jobwork out (fabric DC)", "JW-####", "Fabric moves out to the jobworker (G3 exposure)"],
      ["7", "Jobwork receipt in", "GRN (process)", "Processed fabric returns; jobwork balance reduces"],
      ["8", "Cut order", "CUT-####", "ready_to_cut_in: 1,000 pcs enter G1"],
      ["9", "Issue to line", "LI-####", "ready_to_cut_out: 1,000 pcs leave G1 to sewing line L1"],
      ["10", "Production entry", "PE row", "production_in: 950 good pcs enter G2; wages accrue"],
      ["11", "Rejection / rework", "REJ-#### / rework row", "rejection_out: 20 pcs leave G2; rework is document-only"],
      ["12", "Despatch (pcs DC)", "DC-####", "sales_delivery: 930 pcs leave G2; vehicle recorded"],
      ["13", "Sales invoice", "INV-####", "Books the despatch: ₹195,300 + 5% GST = ₹205,065"],
      ["14", "Cost sheet", "CS-####", "Budget vs actual for the order; margin computed"],
      ["15", "Collection", "Receipt RCP-####", "Invoice settled to paid; party ledger closes to zero"],
    ],
  }},
  { p: "At any point in the chain the agent can be asked what comes next (the suggest_next_step tool): it inspects the order and returns the next stage with a pre-filled argument skeleton, so the pipeline never dead-ends. After the final collection the same query reports the pipeline complete with a produced percentage (95% in the golden case — 950 good pcs of 1,000 ordered)." },

  // ================= SECTION 3 =================
  { h1: "3. Test Scope and Environment" },
  { h2: "3.1 Scope" },
  { p: "The manual suite covers every live module surface (all 178 routes), the complete order flow write chain through both doors (forms and agent), print rendering for the 23 print families, CSV exports, approval routing, rights enforcement, and the failure modes listed in Section 6. Multi-company ledgers, government e-invoice filing, offline mobile sync, QR genealogy tracking, and production deployment hardening are out of scope for this round; they are either not built or explicitly parked in the project plan." },

  { h2: "3.2 Environment Setup" },
  { p: "The application under test is the fiberops repository on the main branch, run in development mode. The database file db/custom.db ships pre-seeded with realistic data: 209 orders, 190 invoices, 187 payments, 184 programs, 190 cut orders, 6 jobwork orders, 8 purchase orders, 26 parties, and 1,183 stock ledger rows, with financial year 26-27 active. Two setup paths exist depending on whether the working copy already contains the database." },
  { steps: [
    "Confirm Node.js 24+ and a package manager are available (node -v).",
    "cd into the fiberops repository checkout on the main branch.",
    "Install dependencies: npm install (or bun install).",
    "If db/custom.db is missing, apply the schema: npx prisma db push, then seed via the repository seed fixtures.",
    "Start the development server: npm run dev. The server listens on http://localhost:3000 and logs to dev.log.",
    "Verify the boot: curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ must return 200, and dev.log must contain no startup errors.",
    "Open http://localhost:3000 in the browser; the login page must render with the FiberOps ERP heading.",
  ]},
  { note: "The vitest suite never touches the development database: it copies custom.db to db/test.db per run. Manual testing, however, writes to the development database directly — see the data conventions below." },

  { h2: "3.3 Login Credentials" },
  { table: {
    title: "Table 4: Accounts used in this guide",
    headers: ["Account", "Email", "Password", "Role"],
    widths: [22, 32, 20, 26],
    rows: [
      ["Administrator", "admin@fiberpro.local", "admin123", "admin — full rights"],
      ["Restricted (create in AD-03)", "any new email", "any 8+ chars", "group with orders right only"],
    ],
  }},
  { p: "If the admin password has been changed on your copy, reset it at /admin/users before starting the suite. Do not test on a database where the bootstrap door is open (a fresh, passwordless database); that state is only for first-run setup and is not covered here." },

  { h2: "3.4 Test Data Conventions" },
  { bullets: [
    "Prefix every manually created artifact with MT- followed by the date (for example MT-0906-ORDER). This keeps manual residue identifiable and greppable in registers.",
    "Never delete or edit the seeded masters (B001 Acme Corp USA, S-1001 Mens Round Neck T-Shirt, colours, sizes, parties, godowns G1-G3, departments D1-D6, line L1). The golden flow depends on them.",
    "The golden order flow may be repeated any number of times; each run must use a fresh unique order number and leaves a settled, closed chain behind (all stock nets to zero at the end).",
    "Record every failure with the case ID, the route, the browser console output (F12), and a screenshot. The project quality bar is zero browser console errors per page; any console error is a defect by definition.",
    "Destructive experiments beyond the documented suite should be performed on a copy of the database, not on custom.db.",
  ]},

  // ================= SECTION 4 =================
  { h1: "4. Start-to-End Application Walkthrough" },
  { p: "This section walks the application module by module. Execute the cases in order; each module assumes only the login from case AU-01 and the seeded data. The acceptance bar throughout: the page renders, data is present, navigation works, exports download, and the browser console shows no errors. Open the developer tools console (F12) before starting and keep it open for the whole suite." },

  { h2: "4.1 Authentication (AU)" },
  { tcTable: [
    ["AU-01", "Go to /login. Enter admin@fiberpro.local / admin123 and submit.", "Login succeeds; the browser lands on the dashboard at / with the heading Welcome to Fiberpro ERP. The session API /api/auth/session returns the admin user."],
    ["AU-02", "Log out (topbar), then attempt login with the same email and a deliberately wrong password.", "A red error card is shown, the URL stays on /login, and no session cookie is set. The 401 network log is expected and is not a defect."],
    ["AU-03", "Attempt login with a non-existent email and with an empty password field.", "The form rejects the input with inline errors; no request side effects; the login page remains usable."],
  ]},

  { h2: "4.2 Dashboard and Navigation (NA)" },
  { tcTable: [
    ["NA-01", "On the dashboard, inspect KPI cards, the order status board, and the recent documents feed.", "Numbers are non-zero and consistent with the seeded data (209 orders, 190 invoices). Recent documents link to their document views and open correctly."],
    ["NA-02", "Click each of the 17 sidebar groups; expand a few groups and open one menu item from each.", "Every landing route loads with HTTP 200 and its expected heading; the active group highlights; no layout breakage or console errors."],
    ["NA-03", "Open the command palette (topbar search) and type an order number or a menu label.", "Matching menu items and documents appear; selecting one navigates to the correct route."],
    ["NA-04", "Open the live tracker at /live and let it sit for 30 seconds.", "The SSE stream connects without errors and renders live snapshot cards; the console shows no connection errors."],
  ]},

  { h2: "4.3 Orders & Sales (OR)" },
  { tcTable: [
    ["OR-01", "Open /orders. Inspect the list: order no, buyer, style, pcs, value, delivery, status.", "Seeded orders (SO-1001 onwards, 209 rows / paged) render with correct columns and en-IN number formatting."],
    ["OR-02", "Open any order view /orders/[id] (the Order Hub).", "The hub shows header fields, lines, the delivery schedule editor, family sections (BOM, programs, costing est-vs-actual), the chain bar, and lifecycle actions. All sections render without console errors."],
    ["OR-03", "Open /orders/register; apply the q filter with a known buyer and the orderType filter.", "The register narrows correctly; clearing filters restores the full list; the CSV button downloads a file whose header row matches the on-screen columns."],
    ["OR-04", "Open /orders/in-hand, /orders/status, and /orders/enquiry.", "All three boards render with rows; the status board shows per-order produced percentages; enquiry is the order-register alias with the same behavior."],
  ]},

  { h2: "4.4 Programs (PR)" },
  { tcTable: [
    ["PR-01", "Open /programs/new. Inspect the knitting spec fields (yarn, required kg, target date).", "The form renders with master pickers; the doc cites the same service as the agent (ADR chip present)."],
    ["PR-02", "Open /programs/propose and look up order SO-1001.", "The BOM proposal screen proposes program requirements from the style BOM with quantity and wastage flags; the same tool chip is shown."],
    ["PR-03", "Open /programs/status and any program view /programs/[id].", "The status register shows the waterfall columns (PO'd, DC'd, GRN'd, Finished); the program view renders its spec and balance rows."],
  ]},

  { h2: "4.5 Procurement (PC)" },
  { tcTable: [
    ["PC-01", "Open /procurement/po and any PO view /procurement/po/[id].", "PO list with status badges; the view shows lines, rates, budget verdicts, and amendment history."],
    ["PC-02", "Open /procurement/grn and any GRN view.", "GRN entry renders with PO linkage; the view shows received lines and stock effects."],
    ["PC-03", "Open /procurement/po/register, /procurement/supplier-pending, and /procurement/party-balance.", "All registers render; supplier-pending lists open PO balances; party-balance shows per-party exposure with filters; each CSV downloads."],
    ["PC-04", "Open /procurement/rate-confirmation and /procurement/supplier-orders.", "Both screens render with rows and filters without console errors."],
  ]},

  { h2: "4.6 Inventory (IV)" },
  { tcTable: [
    ["IV-01", "Open /inventory/stock and the material-specific tabs (yarn, fabric, accessory, general, itemwise).", "Each tab renders bucket rows per godown with quantities and values; totals are consistent across tabs."],
    ["IV-02", "Open /inventory/ledger. Filter by transaction type (for example ready_to_cut_in) and by godown.", "Ledger rows appear with in/out quantities and running context; filters narrow correctly; CSV downloads."],
    ["IV-03", "Open /inventory/lots, /inventory/rolls, and /inventory/io-history.", "Lot tracking, roll tracking, and IO history screens render with seeded rows."],
    ["IV-04", "Open /inventory/register, /inventory/closing-stock, and /inventory/waste-percent.", "All three registers render; closing-stock computes per-godown totals; waste-percent shows rejection analytics."],
  ]},

  { h2: "4.7 Cutting & Panels (CU)" },
  { tcTable: [
    ["CU-01", "Open /cutting/job-order and any cut order view /cutting/job-order/[id].", "The list shows cut orders (190 seeded) with order linkage; the view shows fabric issued, marker, plies, efficiency, and output pcs."],
    ["CU-02", "Open /cutting/ready-to-cut and /cutting/register.", "Ready-to-cut shows G1 piece availability per order; the register lists cut history with CSV export."],
    ["CU-03", "Open /cutting/panel, /cutting/panel-production, /cutting/panel-excess, and /cutting/panel-rework.", "All four panel screens render (variants of the job-order and production archetypes) with their specific fields, without console errors."],
  ]},

  { h2: "4.8 Production & Shopfloor (PD)" },
  { tcTable: [
    ["PD-01", "Open /production/issue and any line issue view.", "Issue-to-line form renders with line and godown pickers; the view shows status (issued) and pcs."],
    ["PD-02", "Open /production/entry and any production entry view.", "The entry form renders (dept, bundle, operator, qty, rate); the view shows wage amount and stock effect."],
    ["PD-03", "Open /production/register and /production/line-status, /production/line-output.", "Registers render with filters; line-status shows per-line WIP; line-output shows daily output."],
    ["PD-04", "Open /production/bundles, /production/operations, /production/rework, /production/line-transfer.", "All variant screens render without console errors."],
  ]},

  { h2: "4.9 Job Work (JW)" },
  { tcTable: [
    ["JW-01", "Open /jobwork/order and any jobwork DC view /jobwork/order/[id].", "The DC out form renders with jobworker picker and balance context; the view shows material lines and return status."],
    ["JW-02", "Open /jobwork/register and /jobwork/statement.", "The register shows per-order/jobworker balances; the statement shows material out vs in per jobworker; CSV downloads."],
    ["JW-03", "Open /jobwork/contract, /jobwork/receipt, and /jobwork/pcs-return.", "All three screens render with their pickers and forms without console errors."],
  ]},

  { h2: "4.10 Pieces & Despatch (DP)" },
  { tcTable: [
    ["DP-01", "Open /pieces/despatch and any DC view /pieces/despatch/[id].", "The despatch form renders with order linkage, vehicle, and lines; the view shows the DC with print link."],
    ["DP-02", "Open /pieces/stock and /pieces/orderwise.", "Pcs stock shows per-order finished-goods buckets; orderwise shows per-order produced/despatched balances."],
    ["DP-03", "Open /pieces/packing-list and any packing list view.", "The list and view render with carton lines and despatch reconciliation fields."],
    ["DP-04", "Open /pieces/rejection, /pieces/shortage, /pieces/finished-goods, /pieces/transfer, /pieces/receipt, and /pieces/gan.", "All six screens render without console errors; rejection shows REJ- documents with action types."],
  ]},

  { h2: "4.11 Despatch & Logistics (DL)" },
  { tcTable: [
    ["DL-01", "Open /dispatch/dc and /dispatch/dc/process.", "Both DC screens render; the process variant shows multi-stage despatch handling."],
    ["DL-02", "Open /dispatch/gate-entry and /dispatch/gate-pass; open any gate document view.", "Gate in and gate out forms render; views show party, vehicle, and DC references."],
    ["DL-03", "Open /dispatch/courier, /dispatch/loading, /dispatch/dc-return, and /dispatch/unit-transfer-ack.", "All four screens render without console errors."],
    ["DL-04", "Open /dispatch/register.", "The despatch register renders with filters and CSV export."],
  ]},

  { h2: "4.12 Accounts & GST (AC)" },
  { tcTable: [
    ["AC-01", "Open /accounts/invoice and any invoice view; also /accounts/invoice/local and /accounts/invoice/piece.", "The invoice list shows 190 seeded rows with status; the view shows lines, GST split, and settlement status; the local and piece variants render."],
    ["AC-02", "Open /accounts/payments and any payment view.", "Payments list with direction badges (in/out); the view shows allocations to invoices and the companion journal voucher."],
    ["AC-03", "Open /accounts/party-ledger with party filter CUS001.", "The ledger shows bills, receipts, and journals with a closing balance; the journals term counts journal and contra vouchers only (companion cash vouchers are not double-counted)."],
    ["AC-04", "Open /accounts/journal, /accounts/debit-note, /accounts/bill (supplier bill), /accounts/bill-pass, /accounts/bills-register, /accounts/supplier-bills, /accounts/production-bills, /accounts/hsn-gst, /accounts/tally-export.", "Every screen renders with rows or a working form; bill-pass shows TDS preview fields; tally-export shows the export action."],
    ["AC-05", "Chart of accounts (M50): open /masters/account.", "The CoA master renders the 20-row seeded standard tree with Code, Name, Type, Parent, and Active columns (1010 Cash/Bank, 1110 Sundry Debtors, 2100 Sundry Creditors, 2200 Wage Payable, 2210-2240 PF/ESI/PT/LWF Payable, 4010 Sales, 5010 Production Wages, 5020 Freight, 5110 Staff Salaries, 5120 Other Expenses, 9000 Suspense Account — the M51 batch added the 20th row). The New Account form creates an account with an auto-assigned ACC-#### code (leave Code blank), Name, a Type select, an optional Parent (a code or name), and the Active checkbox."],
    ["AC-06", "Journal code chips (M50): open /accounts/journal and any voucher view (click a V-#### or a JV-RCP-#### row).", "The register shows each leg account code chip after the name — the seeded receipts read Cash/Bank · 1010 and Acme Corp USA · 1110 (the party string stays as the detail text; the code names the GL account it classifies to). The voucher view carries the GL legs line under the breadcrumb: GL legs: Dr Cash/Bank [1010] / Cr Acme Corp USA [1110] — the chart of accounts (SPEC-M50)."],
    ["AC-07", "The unknown-account refusal (M50): at /accounts/journal fill the form with Voucher Type Journal, Debit Account Not A Real Account, Credit Account Cash/Bank, any amount; click Save & review plan.", "The plan is REFUSED with Unknown account name: Not A Real Account — a journal cannot save an unlinked account. Create it first (create_account …) or pass an existing account name/code (list_accounts …). No voucher number is burned and no row is written. Re-submitting with the CODE form (Debit Account 5010) resolves to Production Wages and plans normally."],
    ["AC-08", "CoA + journal walkthrough (M50, form doors): create an account at /masters/account (e.g. Name Test Freight M50, Type expense); then at /accounts/journal post a journal voucher naming it as the debit account with Cash/Bank as credit; approve the plan; open the new row in the register.", "The journal plan text names the resolved codes — Dr Test Freight M50 [ACC-####] / Cr Cash/Bank [1010]. The register row shows Test Freight M50 · ACC-#### and Cash/Bank · 1010; the voucher view GL legs line names both codes. The journal is linked in the database (both account ids set). Revert by cancelling the journal (the contra carries the swapped links) or deleting the test rows."],
    ["AC-09", "The bank-linked receipt (M51): at /masters/bank-account put a GL Account code on a bank account row (first create the target account at /masters/account, e.g. code 1011 under parent 1010); then at /accounts/payments fill a receipt — a customer party, Direction in, an amount, Mode NEFT, and the Bank Account (GL leg) picker set to that bank row — with an open invoice number; Save & review plan, approve, and open the journal register filtered to the new JV-RCP.", "The plan's side effects name the resolved legs with codes — GL legs classify to <bank account name> [1011] / Sundry Debtors [1110] (SPEC-M51 M-02 — the bank account's own GL ledger). The field carries its one-line hint under the control. After commit the payment row stores the bank account (Payment.bankAccountId — audit) and the companion journal debits the bank's OWN account, not the generic control: the register chip reads '<bank account name> · 1011'. The payment view's Reverse action writes a contra whose legs are the companion's swapped — the credit side is the bank account again."],
    ["AC-10", "The cash/bank honesty doors (M51): post the same receipt WITHOUT picking a bank account; post another with Mode Cash while a bank row IS picked; ask the agent to record a payment with mode rtgs and a bankAccountNo whose bank row has NO GL Account code; ask for one with a bankAccountNo that does not exist.", "Without a bank: the journal debits Cash/Bank [1010] exactly as in every prior version (bankAccountId null — the legacy behavior is pinned). Cash + a picked bank: still [1010] and the plan text SAYS the bank account is not used for the GL leg (no silent ignore). Unlinked bank (no GL code): the journal still posts to [1010] with the nag naming the bank and the fix (link one on the bank master or create_account) — payments never block. An unknown bankAccountNo is refused loudly BEFORE any row is written, naming create_bank_account."],
    ["AC-11", "The debit-note companion + the deduction truth (M51): at /accounts/debit-note raise a note against a customer (leave GL Debit Account empty for the Sales default); approve; open the party ledger, the bills register, and the journal register filtered q=JV-DN; then cancel the note from the debit-note register/view.", "The commit writes the note AND the companion journal JV-DN-#### in one transaction: Dr Sales [4010] / Cr Sundry Debtors [1110] — the register chip reads 'Sales · 4010' and the voucherType is 'debit-note' (deliberately outside the party ledger's journal filter — the note row IS the sub-ledger truth). The plan's side effects say the party outstanding REDUCES (a deduction — the bills register deduction column + the party ledger net it), never 'AR increases'. The party ledger drops by exactly the note amount ONCE (no double-subtract). Cancelling the note flips BOTH rows cancelled and writes the CN-JV- contra with the legs swapped; the outstanding returns; nothing is deleted."],
    ["AC-12", "The expense companion + the settle path + the double-reverse probe (M51): at /costing/expenses record a transport expense with a paid-to party (leave GL Expense Account empty); approve; pay the party the same amount (out) at /accounts/payments; also record an expense without a party (category general). Separately: bill a customer an invoice, receipt it in full, then Reverse the receipt; open the party ledger and the bills register.", "The party expense writes its companion JV-EXP-####: Dr Freight [5020] / Cr Sundry Creditors [2100] — the party ledger shows the payable (balance minus the amount) BEFORE settlement, and the out-payment nets it to exactly 0 (the record_payment loop-closure extended to expense parties). The cash expense posts Dr Other Expenses [5120] / Cr Cash/Bank [1010] with no party. After reversing the full receipt, the party ledger balance RE-OPENS to the billed amount (positive AR — NOT a negative double-reverse: cancelled receipts stop counting, contras never count) and the bills register day-book no longer lists the cancelled receipt in the collected column."],
    ["AC-13", "The trial balance + THE BALANCED ASSERTION (M52): open /accounts/trial-balance (default all time); then narrow with the From/To filters to any window; ask the agent 'is the trial balance balanced?'.", "One row per account with activity: Code, Account, Type, Debit, Credit, Net, Side (Dr/Cr) — sorted by code, zero-activity accounts stay off. The totals row shows Rows / Debit / Credit / Unlinked, and the summary line ASSERTS: 'BALANCED (Dr == Cr asserted)' — the screen claims balance only when it is true (a Δ or any unlinked row flips it to an INVESTIGATE line naming the backfill script). Every journal row counts regardless of status (the GL doctrine); the agent's get_trial_balance returns the same asserted text."],
    ["AC-14", "The day-book (M52): open /accounts/day-book; filter Type = Contras, then Type = Receipts; search q with a voucher fragment (e.g. JV-RCP); click a row.", "The chronological GL voucher register lists EVERY voucher (all types, all statuses): date, voucher, type, Dr account [code], Cr account [code], party, amount, narration, status badge. A cancelled voucher keeps its row with a cancelled badge and its CN- contra sits right under it — the audit visible, the net honest. The type filter and the search both narrow live; a row click opens the voucher view by voucherNo."],
    ["AC-15", "The cash-book (M52): open /accounts/cash-book; set From to a date with known movement; type a bank account code (a row under 1010) into the Account filter; also try a code that is not in the family (e.g. 9999).", "The cash & bank family (the 1010 control + its per-bank GL children): Opening, per-voucher In/Out with the OTHER account as particulars, the running Balance, and Closing in the totals; counter-book mode groups by day with a running balance. A bank code narrows to just that account's movement; a non-family code stays 200 with the honest message 'not in the cash family' naming the family codes. Cancels net via their CN- contras (every row counts)."],
    ["AC-16", "The final accounts + THE GL DOCTRINE PAIR (M52): open /accounts/final-accounts with statement P&L, then Balance sheet; post a small cash receipt through /accounts/payments, view the day-book filtered to its voucher, then Reverse the receipt from the payment view and re-open the day-book and the trial balance.", "The P&L lists income and expense accounts with NET PROFIT/LOSS; the balance sheet lists assets vs liabilities + equity + 'Retained earnings (P&L window)' — and asserts BALANCED (structural: Dr == Cr forces the sheet to close, Δ = 0). After the receipt: the day-book shows the companion JV- row (Dr Cash/Bank [1010] / Cr Sundry Debtors [1110], status active). After the reverse: TWO rows — the JV- companion still active (payment-cancel keeps it; the CONTRA is the reversal) and the CN- row with swapped legs — and the trial balance still says BALANCED with both rows counted: the cancel nets to zero in the GL."],
    ["AC-17", "The Tally export screen — BOTH sides (M53): open /accounts/tally-export; set From to a date with movement (or accept the 30-day default); open the 'Export doctrine' details block; click Download JSON.", "The counts grid shows EIGHT tiles — Sales, Purchases, Receipts, Payments, Credit notes, Journals, Reversals, Total (both sides of the book). The voucher table lists Date, Type (Sales/Purchase/Receipt/Payment/Credit Note/Journal), Source (invoice/bill/payment/debit-note/expense/journal), Voucher No, Party, Amount, and the ledger entries ('Dr … ₹N · Cr … ₹N'); reversal rows carry a 'rev {voucher}' badge. The doctrine notes block lists the counted-once rule, the contra-is-the-reversal rule, the GST splits, the per-party leg rule, the invoice/bill cancel boundary, and the honest 'JSON only — Tally XML is decision §17-4, pending the owner' line. The download is a .json attachment (companyName, fromDate, toDate, vouchers, counts, warnings, notes)."],
    ["AC-18", "COUNTED ONCE + the purchase side (M53): post a cash receipt through /accounts/payments; if a passed supplier bill exists (or craft one via /accounts/bill + /accounts/bill-pass), open /accounts/tally-export with a window covering both; also check a draft bill and a cancelled invoice if present.", "Exactly ONE voucher renders for the receipt (type Receipt, source payment, legs 'Dr Cash/Bank ₹N · Cr {party} ₹N') — the JV- companion does NOT appear as a second Journal voucher: the M19 adapter's double-count (every payment twice) is fixed. The passed bill renders as a Purchase voucher: 'Dr Purchases ₹N · Dr Input CGST/IGST … · Cr {supplier} ₹N'. A draft bill and a cancelled invoice are ABSENT, and the amber warnings panel counts exactly what was excluded and why — never a silent drop."],
    ["AC-19", "THE EXPORT DOCTRINE PAIR (M53): post a small cash receipt through /accounts/payments; Reverse it from the payment view; re-open /accounts/tally-export with a window covering both the post date and today.", "TWO vouchers for the one transaction: the Receipt (it still exports — the companion journal is the GL row and it counts) AND a Journal row 'CN-{RCP no}' with the 'rev {RCP no}' badge, the narration 'Reversal: {RCP no} — …', and the legs SWAPPED versus the receipt (Reversals tile = 1). The pair nets zero — importing the window into Tally converges to the GL truth (the M52 doctrine applied to the export)."],
    ["AC-20", "The GST split + the agent door (M53): view an invoice with CGST+SGST in the export window (or post one); ask the agent 'show me the tally export for this window'; also ask for a payment whose mode is a bank mode without a linked bank account.", "The invoice's Sales voucher credits 'Sales' + 'Output CGST' + 'Output SGST' as SEPARATE ledger entries (each >0) — the single 'Output GST' ledger is gone; purchases carry 'Input CGST/SGST/IGST'. The agent's get_tally_export returns the same counts + warnings + the first 20 vouchers with ledger lines + the /api/tally download pointer. The unlinked-bank payment shows its cash leg as 'Cash/Bank' with a WARNING naming the payment and the fix (link glAccount on the bank master) — the M51 nag surfaced in the export, never a guessed 'Bank' ledger."],
    ["AC-21", "The expense-head master (M54, the legacy FrmMasExpenses port): open /masters/expense-head; create a head (Head 'Test Transport Head M54', Category Transport, GL Account 5020, Active on — leave Code blank); try creating another with the SAME name.", "The head is created with an auto-assigned EXH-#### code and renders in the table with Code, Head, Category, GL Account, Active columns; the form's hints state the GL account is a preference that 'never blocks' and inactive heads refuse new expenses. The duplicate-name attempt is REFUSED ('Expense Head … already exists') — the name is the natural key create_expense resolves. Update the head (edit row → change category or GL account → Save changes) and the row persists."],
    ["AC-22", "THE HEAD DRIVES THE EXPENSE FORM (M54): at /costing/expenses pick the head in the Head picker, enter an amount, leave Category EMPTY (the head drives it — the whole point), and pick a paid-to party; Save & review plan; approve; open the new row and its view.", "The plan card reads 'Proposed expense EXP-#### — ₹N (transport · head Test Transport Head M54)' with GL legs 'Dr Freight [5020] / Cr Sundry Creditors [2100] (… the head's account)' and the side effect 'Booked under head Test Transport Head M54 [EXH-####] — category transport, default leg 5020'. After commit the book row shows Category 'transport' + the Head name column; the view shows the HEAD field; the companion journal's narration carries the head name; the expense row stores headId."],
    ["AC-23", "THE HONESTY DOORS of the head (M54): (a) edit the head's GL Account to a nonexistent account name and book an expense under it; (b) book an expense with head 'No Such Head'; (c) deactivate the head (Active off) and book under it; (d) book under the head passing an explicit GL Expense Account.", "(a) The plan SUCCEEDS (never a refusal — THE HEAD REFINES, NEVER BLOCKS): the leg falls back to the category default (transport → Freight) and the plan text carries the honest note 'head … glAccount … is not in the chart — falling back to the category default'. (b) REFUSED loudly naming create_expense_head / /masters/expense-head, no row written, no voucher number burned. (c) REFUSED with the reactivation hint (update_expense_head with active: true). (d) The explicit account wins — the plan text says '(explicit)' and the leg is the passed account, not the head's."],
    ["AC-24", "THE BUDGET ADDEND (M54): book a stylewise expense against a real order (Head with Category 'Stylewise' + the Order No, or category stylewise directly); open /costing/budget-vs-actual?order={order}; cancel the expense through the agent (cancel_expense) and re-open; ask the agent 'budget vs actual for {order}'.", "The budget row shows the Expenses column with the expense amount and Actual = PO value + Production + Expenses (the totals row gains an Expenses sum; the summary line says 'incl. expenses ₹N'). A CANCELLED expense LEAVES the addend (its CN- contra already nets the GL — the budget must not count the cancelled money either); an order with ONLY expenses still appears in the register. The agent's get_budget_vs_actual json returns actual.expenseSpend alongside poValue and prodCost, and the text names the three-way split."],
  ]},

  { h2: "4.13 Costing & Budgets (CS)" },
  { tcTable: [
    ["CS-01", "Open /costing/cost-sheet and any cost sheet view.", "The view shows cost heads, lines, computed per-pc cost, and the computed margin percentage (M44: margin is stored, not a claim)."],
    ["CS-02", "Open /costing/budget, /costing/budget-vs-actual, /costing/input, /costing/piece-rate, and /costing/expenses.", "All five screens render; budget-vs-actual shows order-level deltas; expenses shows expense documents."],
    ["CS-03", "Open /costing/daily-pnl.", "The daily P&L renders produced value, wages, expenses, and the material leg with net margin."],
  ]},

  { h2: "4.14 HR & Payroll (HR)" },
  { tcTable: [
    ["HR-01", "Open /hr/employees.", "The employee master table renders with the L05 fields (designation, joining date, masked bank identifiers)."],
    ["HR-02", "Open /hr/attendance and /hr/shifts.", "Attendance register renders with day filters and the OT Hrs column (M49: hours beyond the per-day standard on present rows — informational, paid only on ot: true runs); shifts master renders."],
    ["HR-03", "Open /hr/wages and /hr/wage-payments.", "Wages register shows production-derived earnings; wage payments shows out-payments with party linkage."],
    ["HR-04", "Open /hr/operator-statement, /hr/payroll, and any payroll run view /hr/payroll/[id].", "The operator statement shows earned minus paid minus statutory deductions equals owed per operator (the Deducted column appears when statutory runs exist); the payroll register lists runs (PR-####) with a Deductions column; a run view shows lines, commit banner, journals, payslip links, and the statutory frozen-rates card when the run was created with statutory on."],
    ["HR-05", "Open /admin/options and scroll to the Payroll Statutory section; also open /hr/statutory.", "The options page lists the payroll:statutory configuration row (the PF/ESI/PT/LWF rate JSON, editable). The statutory register at /hr/statutory renders one row per committed statutory run and head with the employee share, employer share, authority party, and the PENDING remittance per authority in the summary line; its csv export is the challan data."],
    ["HR-06", "Statutory walkthrough (form door): ensure operator E005 has two present attendance days in a fresh window; at /hr/payroll create a daily run over that window WITH the Statutory checkbox checked; open the run view and commit it.", "The plan and run show deductions PF 192 + ESI 12 = 204 on earned 1,600, net 1,396 (seeded default rates: PF 12/12, ESI 0.75/3.25). The run view shows the statutory card (frozen rates) and the Deducted column. After commit the journals audit table lists the employee journal of 1,396 (not the full 1,600) PLUS the head journals to PF Payable and ESI Payable against the EPFO and ESIC authority parties (384 and 64)."],
    ["HR-07", "Open E005's payslip from the run view; then pay the net 1,396 at /hr/wage-payments (or the agent pay_wages); reopen /hr/operator-statement.", "The payslip shows the Less: PF (employee) and Less: ESI (employee) rows, NET PAYABLE 1,396, and the employer-share note (PF 192 + ESI 52 — a cost, not deducted). After paying the net, the statement's owed for E005 is 0 — the deducted 204 is remitted to the authorities, NOT owed to the operator."],
    ["HR-08", "Open /hr/statutory; record a payment of 384 to party EPFO (direction out, /accounts/payments or the agent record_payment); reopen /hr/statutory and EPFO's party ledger; then revert the created run, its journals, the payment, and the attendance rows.", "Before remittance the register's pending column and summary show PF EPFO 384. After the payment, EPFO's party ledger balance returns to exactly 0 and the register shows PF pending 0 — the ledger IS the remittance tracker. After reverting, no statutory rows remain for the test run."],
    ["HR-09", "Cross-midnight (M49): ask the agent to post attendance for E005 with inTime 22:00 and outTime 06:00 (status present); open /hr/attendance and widen From/To to cover the day; re-post the same day with outTime 08:00 to correct it.", "The night shift is ACCEPTED (out earlier than in = the shift ends the next day — the row stays on the START day, no second row). The register shows In 22:00 · Out 06:00 · Hrs 8 · OT Hrs 0. Re-posting CORRECTS the same row (upsert) to Hrs 10 · OT Hrs 2. An entry with outTime EQUAL to inTime is rejected with the 0-hour error."],
    ["HR-10", "Overtime walkthrough (M49, form door): give E005 two present attendance days with hours — 22:00→08:00 (10 h) and 06:00→17:00 (11 h); at /hr/payroll create a daily run over that window with the Overtime checkbox checked (leave Statutory unchecked); open the run view and commit it.", "The run shows earned 2,600 = 1,600 base (2 days × ₹800) + 1,000 OT (5 h beyond the 8 h standard at the 2× multiplier — the plan text says 'incl. OT ₹1,000 (5 h beyond the per-day standard at 2×)'). The run view carries the Overtime frozen-config card (multiplier 2×, standard 8 h, 5 h, ₹1,000) and the OT ₹ column. After commit, the journals table lists the wage journal of the full 2,600 with E005's party — OT flows inside earned, so pay_wages the net still closes the employee ledger to exactly 0. Creating the same run with mode piece and the OT checkbox on is refused with the daily-only error."],
    ["HR-11", "Open E005's payslip from the HR-10 run view; also create the same daily run WITHOUT the Overtime checkbox (fresh window or after reverting); then revert the run, its journal, and the attendance rows.", "The payslip shows the Earnings row at the BASE 1,600 (earned minus OT), the Overtime row '5 h beyond the 8h standard × 2× the hourly rate' at 1,000, and NET PAYABLE 2,600 plus the OT note. The OT-off run pays M46 arithmetic exactly (earned = days × dailyWage, no OT fields) and its plan text NAGS that the window carries OT-able hours — legacy nets never silently change. After reverting, no rows remain for the test run."],
  ]},

  { h2: "4.15 Quality & Lab (QA)" },
  { tcTable: [
    ["QA-01", "Open /quality/lab-tests and any lab test view; also /quality/parameters.", "Lab test entry and view render with lot linkage; parameters master renders."],
    ["QA-02", "Open /quality/lot-approval, /quality/reprocess-approval, and /quality/non-return-dc.", "All three approval screens render (kind-filtered inboxes) with pending/decided rows."],
  ]},

  { h2: "4.16 Approvals, Reports, Masters & Admin (AD)" },
  { tcTable: [
    ["AP-01", "Open /approvals and /approvals/audit.", "The approval inbox shows pending items by kind; the audit trail lists decisions with actor, tool, and timestamp; the audit CSV downloads."],
    ["RP-01", "Open /reports, /reports/packs, and /reports/mis; open one report runner page /reports/[slug] and /costing/daily-pnl.", "The hub lists 30+ reports; packs group by domain; MIS dashboard renders charts; the runner renders rows with filters and CSV."],
    ["MS-01", "Open /masters; open the buyer, style, and party master screens; create one master of your choice (code MT-...).", "The hub lists 42 configurations; each screen is a searchable table with create/edit; your master appears after save."],
    ["AD-01", "Open /admin/company.", "Company profile and financial years render; FY 26-27 shows as active; the active-FY control is present."],
    ["AD-02", "Open /admin/users; create a user, set a password, deactivate it.", "User CRUD works; the deactivated user is refused at login (ties into N-06)."],
    ["AD-03", "Open /admin/menu-rights; grant the new users group only the orders right.", "The rights matrix saves; a user in that group sees only the Orders group (ties into N-05)."],
    ["AD-04", "Open /admin/options and /admin/settings.", "Options (AppOption) and feature flags boards render; toggling a flag persists."],
  ]},

  { h2: "4.17 The AI Agent Chat (AG)" },
  { p: "The agent panel opens from the topbar. It streams responses over SSE and shows plan cards for every write request. Plan cards list exactly what will be created or changed, confidence chips on ingested fields, and tolerance verdicts where budgets are involved. Nothing is committed until you press Approve on the card." },
  { tcTable: [
    ["AG-01", "Ask: list the last 5 orders with buyer and total pcs.", "The agent answers with a table of real orders (SO-1001 upwards); no plan card is needed for a read."],
    ["AG-02", "Ask: what is the current stock of pieces for order SO-1001 by godown.", "The agent calls the stock tools and reports G1/G2 buckets consistent with the pcs stock screen."],
    ["AG-03", "Ask: create an order for buyer B001, style S-1001, 100 Black M and 100 Black L at ₹210 each, delivery 2026-12-31, order number MT-0906-AGENT.", "A plan card appears summarizing buyer, style, lines, totals, and numbering; approve it; the commit returns SO-style numbering (your explicit number honored). The order appears in /orders and /orders/register."],
    ["AG-04", "Open the order created by AG-03 in the Order Hub, then create one more order of the same shape through the /orders/new form.", "Both doors produce identical structure and effects (same service); both orders appear in the register; the parity footer/chip cites the shared tool."],
    ["AG-05", "Attach a small buyer-PO PDF in chat and ask the agent to ingest it.", "Extraction runs; the agent proposes missing masters with confidence chips; one order per document entity is drafted as a plan; approving persists them."],
    ["AG-06", "Ask: what should I do next for order MT-0906-AGENT.", "The agent returns the next pipeline stage with a pre-filled argument skeleton (suggest_next_step); follow-up suggestions are consistent with the stage table in 2.7."],
  ]},
];
