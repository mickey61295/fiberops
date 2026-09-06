# FiberOps ERP — Manual Testing Guide

> Start-to-end application walkthrough and order-flow end-to-end test plan.
> Version 1.6 · 2026-09-06 · Build under test: `main @ f68aa92` (M52 final-accounts reports; v1.6 adds the accounts cases AC-13..16 — the trial balance with the asserted Dr == Cr, the day-book with the cancel pair, the cash-book family with opening/closing + running balance, the P&L + balance sheet with the retained-earnings line, and THE GL DOCTRINE pair walkthrough) · Environment: development (`http://localhost:3000`)
> Companion .docx: `download/FiberOps-Manual-Testing-Guide.docx` (same content).

## Test Overview

This guide is the single source of truth for manually verifying the FiberOps ERP application from a cold start to a fully settled order. It serves three purposes. First, it explains how the system works end to end, so a tester understands what should happen before touching any screen. Second, it defines a start-to-end walkthrough of every module in the application, with concrete steps and acceptance criteria for each area. Third, it defines the golden order flow — the fifteen-stage Tirupur knitwear job-work pipeline from sales order to payment collection — as one continuous, repeatable end-to-end test with verifiable stock, ledger, and accounting assertions at every stage.

The guide is written for a QA engineer or a developer performing acceptance testing on the development build. Every test case carries a unique identifier, a short list of steps to perform, and the expected result that must be observed before the case can be marked as passed. Cases are intentionally ordered: the module walkthrough (Section 4) verifies the read surfaces and navigation first, the order flow (Section 5) then exercises the full write chain, and the negative suite (Section 6) confirms that the system fails safely. A tester with no prior exposure to the legacy Fiberpro ERP can execute the full suite in approximately three to four hours.

### Baseline Verification Status (Automated Gates)

Before manual testing begins, the automated gates below must be green. They were last verified on 2026-09-06 against the merged main branch (commit 60a87bc, which contains the complete side_quest merge: the FY single-source hotfix, wage reconciliation, and the payroll module). If any gate fails, stop and report the failure before executing the manual suite.

**Automated gates and their expected results**

| Gate | Command | Expected Result |
|---|---|---|
| Unit / pipeline tests | npx vitest run (in fiberops/) | 70 files, 1420 tests, all passed |
| Type safety (source) | npx tsc --noEmit (in fiberops/) | Zero errors under src/ |
| Context integrity | bash scripts/context_check.sh | 606 checks passed, NO DRIFT |
| Agent routing (static) | node scripts/eval_routing.mjs --static | PASS |
| Live route smoke | curl each module route (Section 4) | HTTP 200 on all live routes |
| Login smoke | POST /api/auth/login with admin fixture | ok:true with admin user payload |

Note that tsc reports a small number of pre-existing errors in legacy cleanup scripts under scripts/ (for example cleanup_e2e_bills.ts, which references retired Prisma models). These are known, outside the src/ gate, and do not affect the running application. They should not be counted as failures for this test round.

## How the System Works

This section defines the mental model a tester needs. Read it once before executing the suite; refer back to it whenever an expected result in a later section seems surprising. Everything stated here is derived from the repository documentation (README, PLAN, docs/CONTEXT) and the shipped database.

### Product Background and Architecture

FiberOps is a modern web rebuild of Fiberpro, a VB.NET garment ERP used by Tirupur knitwear job-work exporters. The business it models is the full export chain: yarn is purchased, knitted into fabric, dyed (often at external jobworkers), cut into panels, sewn on production lines, finished, packed, despatched against export orders, invoiced, and finally collected. The application is a single-tenant Next.js 16 App Router application written in TypeScript with Tailwind CSS and shadcn/ui components on the front end, Prisma ORM over a SQLite database (db/custom.db, currently 90 models) on the back end, and a GLM-4.6-powered AI agent harness streamed over SSE.

All business logic lives in one place: service functions under src/lib/erp/posting/ (44 services). The database is the source of truth; every stock-moving document writes a StockLedger row and updates CurrentStock buckets inside a single transaction. Documents are numbered gap-free by a fiscal-year-scoped numbering service. The active financial year is 26-27 (April 1 to March 31, Indian convention) and is derived from the active FinYear row at /admin/company, never from a frozen literal.

### The Two-Doors Principle

Every operation in the application is reachable through two doors, and both doors run the same service function. Door one is the working form: keyboard-first document screens built from a shared doc-config registry, with master pickers, line grids, and register lists. Door two is the AI agent: a chat panel (right side of the shell) through which the same operations can be requested in natural language. The agent never writes directly — it produces a plan card describing exactly what it intends to do, a human approves it, and only then does the commit function persist the change inside a transaction. This plan-approve-commit loop applies to every agent write, from creating an order to committing a payroll run.

For a tester this has two consequences. First, any write performed through the chat must be verifiable in the corresponding form and register, and vice versa — the results must be identical because the service is shared. Second, a document ingestion path exists: attaching a buyer PO PDF in chat makes the agent extract text, propose missing masters, and then draft one order per document entity, with approvals at each phase. Coverage parity between the two doors is itself a test target (case AG-04).

### Core Domain Concepts

Three record families exist. Masters are reference entities (buyer, style, colour, size, party, yarn, fabric, godown, department, employee — 42 master configurations behind /masters). Documents are business transactions that reference masters and move stock or money. Registers are read-only projections over documents (order register, stock ledger, party ledger, production status, and so on), each with a CSV export and filter parameters. A tester mostly creates masters, walks documents through their lifecycle, and confirms registers reflect the truth.

Documents are numbered automatically by a gap-free, fiscal-year-scoped numbering service. Leaving the number field blank lets the service assign the next value; entering an explicit value is honored for historical entries, with collision protection. The prefixes a tester will see are listed in Appendix B. The most common are SO- for sales orders, PO- for purchase orders, GRN- for goods receipts, CUT- for cut orders, JW- for jobwork despatch challans, DC- for piece despatch, INV- for invoices, V- for journal vouchers, and RCP- for payment receipts.

Approval workflows gate a subset of writes. Purchase orders auto-submit a pending approval at commit; certain agent plans, godown transfers, and reprocess requests route through the approval inbox at /approvals, and every approval decision is written to the audit trail at /approvals/audit. User access is role-based: the admin sees everything, while users in groups see only the menu items their rights allow (matrix editable at /admin/menu-rights).

### The Stock Ledger and the Posting Engine

The stock ledger is the heart of the acceptance criteria in Section 5. Three godowns exist in the seeded database: G1 Main Store (holds yarn, fabric, and ready-to-cut pieces), G2 Finished Goods (holds good finished pieces), and G3 Jobworker Yard (material at external jobworkers). Every quantity move posts signed rows into StockLedger with a transaction type; the most important ones for the order flow are ready_to_cut_in (cut pieces enter G1), ready_to_cut_out (pieces leave G1 to a sewing line), production_in (good pieces enter G2), rejection_out (rejected pieces leave G2), and sales_delivery (despatched pieces leave G2).

A single posting engine owns all stock writes; no other code path may write the stock tables. This means the manual tester can trust a simple invariant: whenever a document commits, every affected godown bucket changes exactly as described in the acceptance criteria, or the document fails atomically — a half-applied document cannot exist. If a stage ever appears to have committed without its stock effect, that is a critical defect, not a display quirk.

### Module Map

The navigation sidebar groups the application into 17 modules. The landing route of each group is listed below; every group was verified to render HTTP 200 on the build under test. Menu items beyond the landing route are covered by the walkthrough cases in Section 4.

**The 17 module groups and their landing routes**

| Group | Landing Route | What It Covers |
|---|---|---|
| Home | / | Dashboard KPIs, order status board, daily in/out |
| Orders & Sales | /orders | Order sheets, Order Hub, registers, amendments, samples, enquiry |
| Programs | /programs/new | Knitting/dyeing programs, propose-from-BOM, allotment, balances |
| Procurement | /procurement | Purchase orders, GRNs, rate confirmations, supplier registers |
| Inventory & Warehouse | /inventory | Stock by material, ledger, lots, rolls, transfers, stock-take |
| Cutting & Panels | /cutting | Cut job orders, ready-to-cut, panel ops, fabric rejection |
| Pieces (Finished Goods) | /pieces/despatch | Pcs despatch, receipt, transfer, stock, packing lists, shortage |
| Production & Shopfloor | /production | Line issues, production entries, bundles, rework, line status |
| Job Work | /jobwork/order | Jobwork DC out, receipt in, contracts, registers, statements |
| Despatch & Logistics | /dispatch/dc | DCs, gate entry/pass, courier, loading, unit transfer ack |
| Accounts & GST | /accounts | Invoices, debit notes, payments, journals, bills, HSN, Tally |
| Costing & Budgets | /costing | Cost sheets, budgets, expenses, daily P&L, piece rates |
| HR & Payroll | /hr | Employees, attendance, wages, wage payments, payroll, statements |
| Quality & Lab | /quality/lab-tests | Lab tests, parameters, lot/reprocess approvals, non-return DCs |
| Approvals & Workflow | /approvals | Cross-module approval inbox and audit trail |
| Reports & Analytics | /reports | Report hub, packs, MIS dashboard, 30+ register reports |
| Masters & Admin | /masters | 42 masters, users, menu rights, options, flags, audit |

### Users, Roles, and Rights

Authentication is email and password based, with session cookies set on login. The first-run bootstrap door (/api/auth/bootstrap) is only available while no user has a password; it is permanently closed on this database, so all user administration happens at /admin/users. The seeded administrator is Aslam Admin (admin@fiberpro.local). Restricted users belong to groups whose rights array lists the menu keys they may access; a restricted user with only the orders right can open /orders but is denied the accounts module. The seeded database also contains inactive guard users; an inactive account must be refused at login even with a correct password.

Two logins are used throughout this guide: the admin fixture for the full walkthrough, and (for negative case N-05) any restricted user you create at /admin/users during the admin tests. Password changes are made at /admin/users or through the change-password flow in the topbar; the login page offers no self-service reset.

### The Fifteen-Stage Order Flow Pipeline

The golden flow models one export order through the whole factory. The stages, their documents, and their stock effects are summarized below. Section 5 walks every stage with concrete quantities and amounts; the table here is the reference card for the acceptance criteria. Quantities in the golden case: 1,000 pcs ordered, 950 produced good, 20 rejected, 930 despatched and invoiced, taxable value ₹195,300 plus 5% GST, collected in full.

**The order flow pipeline and its stock effects**

| # | Stage | Document / Number | Stock and Money Effect |
|---|---|---|---|
| 1 | Sales order | Order SO-#### | No stock move; order register row; order total 1,000 pcs |
| 2 | Bill of materials | BOM | Planning only; per-style consumption (yarn 250 kg @ ₹320) |
| 3 | Program | Program PGM-#### | Program balance rows (required vs actual kg) created |
| 4 | Purchase order | PO-#### | No stock move; pending approval auto-submitted |
| 5 | GRN (yarn in) | GRN-#### | Yarn enters G1 at the ordered rate; stock register row |
| 6 | Jobwork out (fabric DC) | JW-#### | Fabric moves out to the jobworker (G3 exposure) |
| 7 | Jobwork receipt in | GRN (process) | Processed fabric returns; jobwork balance reduces |
| 8 | Cut order | CUT-#### | ready_to_cut_in: 1,000 pcs enter G1 |
| 9 | Issue to line | LI-#### | ready_to_cut_out: 1,000 pcs leave G1 to sewing line L1 |
| 10 | Production entry | PE row | production_in: 950 good pcs enter G2; wages accrue |
| 11 | Rejection / rework | REJ-#### / rework row | rejection_out: 20 pcs leave G2; rework is document-only |
| 12 | Despatch (pcs DC) | DC-#### | sales_delivery: 930 pcs leave G2; vehicle recorded |
| 13 | Sales invoice | INV-#### | Books the despatch: ₹195,300 + 5% GST = ₹205,065 |
| 14 | Cost sheet | CS-#### | Budget vs actual for the order; margin computed |
| 15 | Collection | Receipt RCP-#### | Invoice settled to paid; party ledger closes to zero |

At any point in the chain the agent can be asked what comes next (the suggest_next_step tool): it inspects the order and returns the next stage with a pre-filled argument skeleton, so the pipeline never dead-ends. After the final collection the same query reports the pipeline complete with a produced percentage (95% in the golden case — 950 good pcs of 1,000 ordered).

## Test Scope and Environment

### Scope

The manual suite covers every live module surface (all 178 routes), the complete order flow write chain through both doors (forms and agent), print rendering for the 23 print families, CSV exports, approval routing, rights enforcement, and the failure modes listed in Section 6. Multi-company ledgers, government e-invoice filing, offline mobile sync, QR genealogy tracking, and production deployment hardening are out of scope for this round; they are either not built or explicitly parked in the project plan.

### Environment Setup

The application under test is the fiberops repository on the main branch, run in development mode. The database file db/custom.db ships pre-seeded with realistic data: 209 orders, 190 invoices, 187 payments, 184 programs, 190 cut orders, 6 jobwork orders, 8 purchase orders, 26 parties, and 1,183 stock ledger rows, with financial year 26-27 active. Two setup paths exist depending on whether the working copy already contains the database.

1. Confirm Node.js 24+ and a package manager are available (node -v).
2. cd into the fiberops repository checkout on the main branch.
3. Install dependencies: npm install (or bun install).
4. If db/custom.db is missing, apply the schema: npx prisma db push, then seed via the repository seed fixtures.
5. Start the development server: npm run dev. The server listens on http://localhost:3000 and logs to dev.log.
6. Verify the boot: curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ must return 200, and dev.log must contain no startup errors.
7. Open http://localhost:3000 in the browser; the login page must render with the FiberOps ERP heading.

> The vitest suite never touches the development database: it copies custom.db to db/test.db per run. Manual testing, however, writes to the development database directly — see the data conventions below.

### Login Credentials

**Accounts used in this guide**

| Account | Email | Password | Role |
|---|---|---|---|
| Administrator | admin@fiberpro.local | admin123 | admin — full rights |
| Restricted (create in AD-03) | any new email | any 8+ chars | group with orders right only |

If the admin password has been changed on your copy, reset it at /admin/users before starting the suite. Do not test on a database where the bootstrap door is open (a fresh, passwordless database); that state is only for first-run setup and is not covered here.

### Test Data Conventions

- Prefix every manually created artifact with MT- followed by the date (for example MT-0906-ORDER). This keeps manual residue identifiable and greppable in registers.
- Never delete or edit the seeded masters (B001 Acme Corp USA, S-1001 Mens Round Neck T-Shirt, colours, sizes, parties, godowns G1-G3, departments D1-D6, line L1). The golden flow depends on them.
- The golden order flow may be repeated any number of times; each run must use a fresh unique order number and leaves a settled, closed chain behind (all stock nets to zero at the end).
- Record every failure with the case ID, the route, the browser console output (F12), and a screenshot. The project quality bar is zero browser console errors per page; any console error is a defect by definition.
- Destructive experiments beyond the documented suite should be performed on a copy of the database, not on custom.db.

## Start-to-End Application Walkthrough

This section walks the application module by module. Execute the cases in order; each module assumes only the login from case AU-01 and the seeded data. The acceptance bar throughout: the page renders, data is present, navigation works, exports download, and the browser console shows no errors. Open the developer tools console (F12) before starting and keep it open for the whole suite.

### Authentication (AU)

| ID | How to Perform | Expected Result / Acceptance Criteria |
|---|---|---|
| **AU-01** | Go to /login. Enter admin@fiberpro.local / admin123 and submit. | Login succeeds; the browser lands on the dashboard at / with the heading Welcome to Fiberpro ERP. The session API /api/auth/session returns the admin user. |
| **AU-02** | Log out (topbar), then attempt login with the same email and a deliberately wrong password. | A red error card is shown, the URL stays on /login, and no session cookie is set. The 401 network log is expected and is not a defect. |
| **AU-03** | Attempt login with a non-existent email and with an empty password field. | The form rejects the input with inline errors; no request side effects; the login page remains usable. |

### Dashboard and Navigation (NA)

| ID | How to Perform | Expected Result / Acceptance Criteria |
|---|---|---|
| **NA-01** | On the dashboard, inspect KPI cards, the order status board, and the recent documents feed. | Numbers are non-zero and consistent with the seeded data (209 orders, 190 invoices). Recent documents link to their document views and open correctly. |
| **NA-02** | Click each of the 17 sidebar groups; expand a few groups and open one menu item from each. | Every landing route loads with HTTP 200 and its expected heading; the active group highlights; no layout breakage or console errors. |
| **NA-03** | Open the command palette (topbar search) and type an order number or a menu label. | Matching menu items and documents appear; selecting one navigates to the correct route. |
| **NA-04** | Open the live tracker at /live and let it sit for 30 seconds. | The SSE stream connects without errors and renders live snapshot cards; the console shows no connection errors. |

### Orders & Sales (OR)

| ID | How to Perform | Expected Result / Acceptance Criteria |
|---|---|---|
| **OR-01** | Open /orders. Inspect the list: order no, buyer, style, pcs, value, delivery, status. | Seeded orders (SO-1001 onwards, 209 rows / paged) render with correct columns and en-IN number formatting. |
| **OR-02** | Open any order view /orders/[id] (the Order Hub). | The hub shows header fields, lines, the delivery schedule editor, family sections (BOM, programs, costing est-vs-actual), the chain bar, and lifecycle actions. All sections render without console errors. |
| **OR-03** | Open /orders/register; apply the q filter with a known buyer and the orderType filter. | The register narrows correctly; clearing filters restores the full list; the CSV button downloads a file whose header row matches the on-screen columns. |
| **OR-04** | Open /orders/in-hand, /orders/status, and /orders/enquiry. | All three boards render with rows; the status board shows per-order produced percentages; enquiry is the order-register alias with the same behavior. |

### Programs (PR)

| ID | How to Perform | Expected Result / Acceptance Criteria |
|---|---|---|
| **PR-01** | Open /programs/new. Inspect the knitting spec fields (yarn, required kg, target date). | The form renders with master pickers; the doc cites the same service as the agent (ADR chip present). |
| **PR-02** | Open /programs/propose and look up order SO-1001. | The BOM proposal screen proposes program requirements from the style BOM with quantity and wastage flags; the same tool chip is shown. |
| **PR-03** | Open /programs/status and any program view /programs/[id]. | The status register shows the waterfall columns (PO'd, DC'd, GRN'd, Finished); the program view renders its spec and balance rows. |

### Procurement (PC)

| ID | How to Perform | Expected Result / Acceptance Criteria |
|---|---|---|
| **PC-01** | Open /procurement/po and any PO view /procurement/po/[id]. | PO list with status badges; the view shows lines, rates, budget verdicts, and amendment history. |
| **PC-02** | Open /procurement/grn and any GRN view. | GRN entry renders with PO linkage; the view shows received lines and stock effects. |
| **PC-03** | Open /procurement/po/register, /procurement/supplier-pending, and /procurement/party-balance. | All registers render; supplier-pending lists open PO balances; party-balance shows per-party exposure with filters; each CSV downloads. |
| **PC-04** | Open /procurement/rate-confirmation and /procurement/supplier-orders. | Both screens render with rows and filters without console errors. |

### Inventory (IV)

| ID | How to Perform | Expected Result / Acceptance Criteria |
|---|---|---|
| **IV-01** | Open /inventory/stock and the material-specific tabs (yarn, fabric, accessory, general, itemwise). | Each tab renders bucket rows per godown with quantities and values; totals are consistent across tabs. |
| **IV-02** | Open /inventory/ledger. Filter by transaction type (for example ready_to_cut_in) and by godown. | Ledger rows appear with in/out quantities and running context; filters narrow correctly; CSV downloads. |
| **IV-03** | Open /inventory/lots, /inventory/rolls, and /inventory/io-history. | Lot tracking, roll tracking, and IO history screens render with seeded rows. |
| **IV-04** | Open /inventory/register, /inventory/closing-stock, and /inventory/waste-percent. | All three registers render; closing-stock computes per-godown totals; waste-percent shows rejection analytics. |

### Cutting & Panels (CU)

| ID | How to Perform | Expected Result / Acceptance Criteria |
|---|---|---|
| **CU-01** | Open /cutting/job-order and any cut order view /cutting/job-order/[id]. | The list shows cut orders (190 seeded) with order linkage; the view shows fabric issued, marker, plies, efficiency, and output pcs. |
| **CU-02** | Open /cutting/ready-to-cut and /cutting/register. | Ready-to-cut shows G1 piece availability per order; the register lists cut history with CSV export. |
| **CU-03** | Open /cutting/panel, /cutting/panel-production, /cutting/panel-excess, and /cutting/panel-rework. | All four panel screens render (variants of the job-order and production archetypes) with their specific fields, without console errors. |

### Production & Shopfloor (PD)

| ID | How to Perform | Expected Result / Acceptance Criteria |
|---|---|---|
| **PD-01** | Open /production/issue and any line issue view. | Issue-to-line form renders with line and godown pickers; the view shows status (issued) and pcs. |
| **PD-02** | Open /production/entry and any production entry view. | The entry form renders (dept, bundle, operator, qty, rate); the view shows wage amount and stock effect. |
| **PD-03** | Open /production/register and /production/line-status, /production/line-output. | Registers render with filters; line-status shows per-line WIP; line-output shows daily output. |
| **PD-04** | Open /production/bundles, /production/operations, /production/rework, /production/line-transfer. | All variant screens render without console errors. |

### Job Work (JW)

| ID | How to Perform | Expected Result / Acceptance Criteria |
|---|---|---|
| **JW-01** | Open /jobwork/order and any jobwork DC view /jobwork/order/[id]. | The DC out form renders with jobworker picker and balance context; the view shows material lines and return status. |
| **JW-02** | Open /jobwork/register and /jobwork/statement. | The register shows per-order/jobworker balances; the statement shows material out vs in per jobworker; CSV downloads. |
| **JW-03** | Open /jobwork/contract, /jobwork/receipt, and /jobwork/pcs-return. | All three screens render with their pickers and forms without console errors. |

### Pieces & Despatch (DP)

| ID | How to Perform | Expected Result / Acceptance Criteria |
|---|---|---|
| **DP-01** | Open /pieces/despatch and any DC view /pieces/despatch/[id]. | The despatch form renders with order linkage, vehicle, and lines; the view shows the DC with print link. |
| **DP-02** | Open /pieces/stock and /pieces/orderwise. | Pcs stock shows per-order finished-goods buckets; orderwise shows per-order produced/despatched balances. |
| **DP-03** | Open /pieces/packing-list and any packing list view. | The list and view render with carton lines and despatch reconciliation fields. |
| **DP-04** | Open /pieces/rejection, /pieces/shortage, /pieces/finished-goods, /pieces/transfer, /pieces/receipt, and /pieces/gan. | All six screens render without console errors; rejection shows REJ- documents with action types. |

### Despatch & Logistics (DL)

| ID | How to Perform | Expected Result / Acceptance Criteria |
|---|---|---|
| **DL-01** | Open /dispatch/dc and /dispatch/dc/process. | Both DC screens render; the process variant shows multi-stage despatch handling. |
| **DL-02** | Open /dispatch/gate-entry and /dispatch/gate-pass; open any gate document view. | Gate in and gate out forms render; views show party, vehicle, and DC references. |
| **DL-03** | Open /dispatch/courier, /dispatch/loading, /dispatch/dc-return, and /dispatch/unit-transfer-ack. | All four screens render without console errors. |
| **DL-04** | Open /dispatch/register. | The despatch register renders with filters and CSV export. |

### Accounts & GST (AC)

| ID | How to Perform | Expected Result / Acceptance Criteria |
|---|---|---|
| **AC-01** | Open /accounts/invoice and any invoice view; also /accounts/invoice/local and /accounts/invoice/piece. | The invoice list shows 190 seeded rows with status; the view shows lines, GST split, and settlement status; the local and piece variants render. |
| **AC-02** | Open /accounts/payments and any payment view. | Payments list with direction badges (in/out); the view shows allocations to invoices and the companion journal voucher. |
| **AC-03** | Open /accounts/party-ledger with party filter CUS001. | The ledger shows bills, receipts, and journals with a closing balance; the journals term counts journal and contra vouchers only (companion cash vouchers are not double-counted). |
| **AC-04** | Open /accounts/journal, /accounts/debit-note, /accounts/bill (supplier bill), /accounts/bill-pass, /accounts/bills-register, /accounts/supplier-bills, /accounts/production-bills, /accounts/hsn-gst, /accounts/tally-export. | Every screen renders with rows or a working form; bill-pass shows TDS preview fields; tally-export shows the export action. |
| **AC-05** | Chart of accounts (M50): open /masters/account. | The CoA master renders the 20-row seeded standard tree with Code, Name, Type, Parent, and Active columns (1010 Cash/Bank, 1110 Sundry Debtors, 2100 Sundry Creditors, 2200 Wage Payable, 2210-2240 PF/ESI/PT/LWF Payable, 4010 Sales, 5010 Production Wages, 5020 Freight, 5110 Staff Salaries, 5120 Other Expenses, 9000 Suspense Account — the M51 batch added the 20th row). The New Account form creates an account with an auto-assigned ACC-#### code (leave Code blank), Name, a Type select, an optional Parent (a code or name), and the Active checkbox. |
| **AC-06** | Journal code chips (M50): open /accounts/journal and any voucher view (click a V-#### or a JV-RCP-#### row). | The register shows each leg account code chip after the name — the seeded receipts read Cash/Bank · 1010 and Acme Corp USA · 1110 (the party string stays as the detail text; the code names the GL account it classifies to). The voucher view carries the GL legs line under the breadcrumb: GL legs: Dr Cash/Bank [1010] / Cr Acme Corp USA [1110] — the chart of accounts (SPEC-M50). |
| **AC-07** | The unknown-account refusal (M50): at /accounts/journal fill the form with Voucher Type Journal, Debit Account Not A Real Account, Credit Account Cash/Bank, any amount; click Save & review plan. | The plan is REFUSED with Unknown account name: Not A Real Account — a journal cannot save an unlinked account. Create it first (create_account …) or pass an existing account name/code (list_accounts …). No voucher number is burned and no row is written. Re-submitting with the CODE form (Debit Account 5010) resolves to Production Wages and plans normally. |
| **AC-08** | CoA + journal walkthrough (M50, form doors): create an account at /masters/account (e.g. Name Test Freight M50, Type expense); then at /accounts/journal post a journal voucher naming it as the debit account with Cash/Bank as credit; approve the plan; open the new row in the register. | The journal plan text names the resolved codes — Dr Test Freight M50 [ACC-####] / Cr Cash/Bank [1010]. The register row shows Test Freight M50 · ACC-#### and Cash/Bank · 1010; the voucher view GL legs line names both codes. The journal is linked in the database (both account ids set). Revert by cancelling the journal (the contra carries the swapped links) or deleting the test rows. |
| **AC-09** | The bank-linked receipt (M51): at /masters/bank-account put a GL Account code on a bank account row (first create the target account at /masters/account, e.g. code 1011 under parent 1010); then at /accounts/payments fill a receipt — a customer party, Direction in, an amount, Mode NEFT, and the Bank Account (GL leg) picker set to that bank row — with an open invoice number; Save & review plan, approve, and open the journal register filtered to the new JV-RCP. | The plan's side effects name the resolved legs with codes — GL legs classify to <bank account name> [1011] / Sundry Debtors [1110] (SPEC-M51 M-02 — the bank account's own GL ledger). The field carries its one-line hint under the control. After commit the payment row stores the bank account (Payment.bankAccountId — audit) and the companion journal debits the bank's OWN account, not the generic control: the register chip reads '<bank account name> · 1011'. The payment view's Reverse action writes a contra whose legs are the companion's swapped — the credit side is the bank account again. |
| **AC-10** | The cash/bank honesty doors (M51): post the same receipt WITHOUT picking a bank account; post another with Mode Cash while a bank row IS picked; ask the agent to record a payment with mode rtgs and a bankAccountNo whose bank row has NO GL Account code; ask for one with a bankAccountNo that does not exist. | Without a bank: the journal debits Cash/Bank [1010] exactly as in every prior version (bankAccountId null — the legacy behavior is pinned). Cash + a picked bank: still [1010] and the plan text SAYS the bank account is not used for the GL leg (no silent ignore). Unlinked bank (no GL code): the journal still posts to [1010] with the nag naming the bank and the fix (link one on the bank master or create_account) — payments never block. An unknown bankAccountNo is refused loudly BEFORE any row is written, naming create_bank_account. |
| **AC-11** | The debit-note companion + the deduction truth (M51): at /accounts/debit-note raise a note against a customer (leave GL Debit Account empty for the Sales default); approve; open the party ledger, the bills register, and the journal register filtered q=JV-DN; then cancel the note from the debit-note register/view. | The commit writes the note AND the companion journal JV-DN-#### in one transaction: Dr Sales [4010] / Cr Sundry Debtors [1110] — the register chip reads 'Sales · 4010' and the voucherType is 'debit-note' (deliberately outside the party ledger's journal filter — the note row IS the sub-ledger truth). The plan's side effects say the party outstanding REDUCES (a deduction — the bills register deduction column + the party ledger net it), never 'AR increases'. The party ledger drops by exactly the note amount ONCE (no double-subtract). Cancelling the note flips BOTH rows cancelled and writes the CN-JV- contra with the legs swapped; the outstanding returns; nothing is deleted. |
| **AC-12** | The expense companion + the settle path + the double-reverse probe (M51): at /costing/expenses record a transport expense with a paid-to party (leave GL Expense Account empty); approve; pay the party the same amount (out) at /accounts/payments; also record an expense without a party (category general). Separately: bill a customer an invoice, receipt it in full, then Reverse the receipt; open the party ledger and the bills register. | The party expense writes its companion JV-EXP-####: Dr Freight [5020] / Cr Sundry Creditors [2100] — the party ledger shows the payable (balance minus the amount) BEFORE settlement, and the out-payment nets it to exactly 0 (the record_payment loop-closure extended to expense parties). The cash expense posts Dr Other Expenses [5120] / Cr Cash/Bank [1010] with no party. After reversing the full receipt, the party ledger balance RE-OPENS to the billed amount (positive AR — NOT a negative double-reverse: cancelled receipts stop counting, contras never count) and the bills register day-book no longer lists the cancelled receipt in the collected column. |
| **AC-13** | The trial balance + THE BALANCED ASSERTION (M52): open /accounts/trial-balance (default all time); then narrow with the From/To filters to any window; ask the agent 'is the trial balance balanced?'. | One row per account with activity: Code, Account, Type, Debit, Credit, Net, Side (Dr/Cr) — sorted by code, zero-activity accounts stay off. The totals row shows Rows / Debit / Credit / Unlinked, and the summary line ASSERTS: 'BALANCED (Dr == Cr asserted)' — the screen claims balance only when it is true (a Δ or any unlinked row flips it to an INVESTIGATE line naming the backfill script). Every journal row counts regardless of status (the GL doctrine); the agent's get_trial_balance returns the same asserted text. |
| **AC-14** | The day-book (M52): open /accounts/day-book; filter Type = Contras, then Type = Receipts; search q with a voucher fragment (e.g. JV-RCP); click a row. | The chronological GL voucher register lists EVERY voucher (all types, all statuses): date, voucher, type, Dr account [code], Cr account [code], party, amount, narration, status badge. A cancelled voucher keeps its row with a cancelled badge and its CN- contra sits right under it — the audit visible, the net honest. The type filter and the search both narrow live; a row click opens the voucher view by voucherNo. |
| **AC-15** | The cash-book (M52): open /accounts/cash-book; set From to a date with known movement; type a bank account code (a row under 1010) into the Account filter; also try a code that is not in the family (e.g. 9999). | The cash & bank family (the 1010 control + its per-bank GL children): Opening, per-voucher In/Out with the OTHER account as particulars, the running Balance, and Closing in the totals; counter-book mode groups by day with a running balance. A bank code narrows to just that account's movement; a non-family code stays 200 with the honest message 'not in the cash family' naming the family codes. Cancels net via their CN- contras (every row counts). |
| **AC-16** | The final accounts + THE GL DOCTRINE PAIR (M52): open /accounts/final-accounts with statement P&L, then Balance sheet; post a small cash receipt through /accounts/payments, view the day-book filtered to its voucher, then Reverse the receipt from the payment view and re-open the day-book and the trial balance. | The P&L lists income and expense accounts with NET PROFIT/LOSS; the balance sheet lists assets vs liabilities + equity + 'Retained earnings (P&L window)' — and asserts BALANCED (structural: Dr == Cr forces the sheet to close, Δ = 0). After the receipt: the day-book shows the companion JV- row (Dr Cash/Bank [1010] / Cr Sundry Debtors [1110], status active). After the reverse: TWO rows — the JV- companion still active (payment-cancel keeps it; the CONTRA is the reversal) and the CN- row with swapped legs — and the trial balance still says BALANCED with both rows counted: the cancel nets to zero in the GL. |

### Costing & Budgets (CS)

| ID | How to Perform | Expected Result / Acceptance Criteria |
|---|---|---|
| **CS-01** | Open /costing/cost-sheet and any cost sheet view. | The view shows cost heads, lines, computed per-pc cost, and the computed margin percentage (M44: margin is stored, not a claim). |
| **CS-02** | Open /costing/budget, /costing/budget-vs-actual, /costing/input, /costing/piece-rate, and /costing/expenses. | All five screens render; budget-vs-actual shows order-level deltas; expenses shows expense documents. |
| **CS-03** | Open /costing/daily-pnl. | The daily P&L renders produced value, wages, expenses, and the material leg with net margin. |

### HR & Payroll (HR)

| ID | How to Perform | Expected Result / Acceptance Criteria |
|---|---|---|
| **HR-01** | Open /hr/employees. | The employee master table renders with the L05 fields (designation, joining date, masked bank identifiers). |
| **HR-02** | Open /hr/attendance and /hr/shifts. | Attendance register renders with day filters and the OT Hrs column (M49: hours beyond the per-day standard on present rows — informational, paid only on ot: true runs); shifts master renders. |
| **HR-03** | Open /hr/wages and /hr/wage-payments. | Wages register shows production-derived earnings; wage payments shows out-payments with party linkage. |
| **HR-04** | Open /hr/operator-statement, /hr/payroll, and any payroll run view /hr/payroll/[id]. | The operator statement shows earned minus paid minus statutory deductions equals owed per operator (the Deducted column appears when statutory runs exist); the payroll register lists runs (PR-####) with a Deductions column; a run view shows lines, commit banner, journals, payslip links, and the statutory frozen-rates card when the run was created with statutory on. |
| **HR-05** | Open /admin/options and scroll to the Payroll Statutory section; also open /hr/statutory. | The options page lists the payroll:statutory configuration row (the PF/ESI/PT/LWF rate JSON, editable). The statutory register at /hr/statutory renders one row per committed statutory run and head with the employee share, employer share, authority party, and the PENDING remittance per authority in the summary line; its csv export is the challan data. |
| **HR-06** | Statutory walkthrough (form door): ensure operator E005 has two present attendance days in a fresh window; at /hr/payroll create a daily run over that window WITH the Statutory checkbox checked; open the run view and commit it. | The plan and run show deductions PF 192 + ESI 12 = 204 on earned 1,600, net 1,396 (seeded default rates: PF 12/12, ESI 0.75/3.25). The run view shows the statutory card (frozen rates) and the Deducted column. After commit the journals audit table lists the employee journal of 1,396 (not the full 1,600) PLUS the head journals to PF Payable and ESI Payable against the EPFO and ESIC authority parties (384 and 64). |
| **HR-07** | Open E005's payslip from the run view; then pay the net 1,396 at /hr/wage-payments (or the agent pay_wages); reopen /hr/operator-statement. | The payslip shows the Less: PF (employee) and Less: ESI (employee) rows, NET PAYABLE 1,396, and the employer-share note (PF 192 + ESI 52 — a cost, not deducted). After paying the net, the statement's owed for E005 is 0 — the deducted 204 is remitted to the authorities, NOT owed to the operator. |
| **HR-08** | Open /hr/statutory; record a payment of 384 to party EPFO (direction out, /accounts/payments or the agent record_payment); reopen /hr/statutory and EPFO's party ledger; then revert the created run, its journals, the payment, and the attendance rows. | Before remittance the register's pending column and summary show PF EPFO 384. After the payment, EPFO's party ledger balance returns to exactly 0 and the register shows PF pending 0 — the ledger IS the remittance tracker. After reverting, no statutory rows remain for the test run. |
| **HR-09** | Cross-midnight (M49): ask the agent to post attendance for E005 with inTime 22:00 and outTime 06:00 (status present); open /hr/attendance and widen From/To to cover the day; re-post the same day with outTime 08:00 to correct it. | The night shift is ACCEPTED (out earlier than in = the shift ends the next day — the row stays on the START day, no second row). The register shows In 22:00 · Out 06:00 · Hrs 8 · OT Hrs 0. Re-posting CORRECTS the same row (upsert) to Hrs 10 · OT Hrs 2. An entry with outTime EQUAL to inTime is rejected with the 0-hour error. |
| **HR-10** | Overtime walkthrough (M49, form door): give E005 two present attendance days with hours — 22:00→08:00 (10 h) and 06:00→17:00 (11 h); at /hr/payroll create a daily run over that window with the Overtime checkbox checked (leave Statutory unchecked); open the run view and commit it. | The run shows earned 2,600 = 1,600 base (2 days × ₹800) + 1,000 OT (5 h beyond the 8 h standard at the 2× multiplier — the plan text says 'incl. OT ₹1,000 (5 h beyond the per-day standard at 2×)'). The run view carries the Overtime frozen-config card (multiplier 2×, standard 8 h, 5 h, ₹1,000) and the OT ₹ column. After commit, the journals table lists the wage journal of the full 2,600 with E005's party — OT flows inside earned, so pay_wages the net still closes the employee ledger to exactly 0. Creating the same run with mode piece and the OT checkbox on is refused with the daily-only error. |
| **HR-11** | Open E005's payslip from the HR-10 run view; also create the same daily run WITHOUT the Overtime checkbox (fresh window or after reverting); then revert the run, its journal, and the attendance rows. | The payslip shows the Earnings row at the BASE 1,600 (earned minus OT), the Overtime row '5 h beyond the 8h standard × 2× the hourly rate' at 1,000, and NET PAYABLE 2,600 plus the OT note. The OT-off run pays M46 arithmetic exactly (earned = days × dailyWage, no OT fields) and its plan text NAGS that the window carries OT-able hours — legacy nets never silently change. After reverting, no rows remain for the test run. |

### Quality & Lab (QA)

| ID | How to Perform | Expected Result / Acceptance Criteria |
|---|---|---|
| **QA-01** | Open /quality/lab-tests and any lab test view; also /quality/parameters. | Lab test entry and view render with lot linkage; parameters master renders. |
| **QA-02** | Open /quality/lot-approval, /quality/reprocess-approval, and /quality/non-return-dc. | All three approval screens render (kind-filtered inboxes) with pending/decided rows. |

### Approvals, Reports, Masters & Admin (AD)

| ID | How to Perform | Expected Result / Acceptance Criteria |
|---|---|---|
| **AP-01** | Open /approvals and /approvals/audit. | The approval inbox shows pending items by kind; the audit trail lists decisions with actor, tool, and timestamp; the audit CSV downloads. |
| **RP-01** | Open /reports, /reports/packs, and /reports/mis; open one report runner page /reports/[slug] and /costing/daily-pnl. | The hub lists 30+ reports; packs group by domain; MIS dashboard renders charts; the runner renders rows with filters and CSV. |
| **MS-01** | Open /masters; open the buyer, style, and party master screens; create one master of your choice (code MT-...). | The hub lists 42 configurations; each screen is a searchable table with create/edit; your master appears after save. |
| **AD-01** | Open /admin/company. | Company profile and financial years render; FY 26-27 shows as active; the active-FY control is present. |
| **AD-02** | Open /admin/users; create a user, set a password, deactivate it. | User CRUD works; the deactivated user is refused at login (ties into N-06). |
| **AD-03** | Open /admin/menu-rights; grant the new users group only the orders right. | The rights matrix saves; a user in that group sees only the Orders group (ties into N-05). |
| **AD-04** | Open /admin/options and /admin/settings. | Options (AppOption) and feature flags boards render; toggling a flag persists. |

### The AI Agent Chat (AG)

The agent panel opens from the topbar. It streams responses over SSE and shows plan cards for every write request. Plan cards list exactly what will be created or changed, confidence chips on ingested fields, and tolerance verdicts where budgets are involved. Nothing is committed until you press Approve on the card.

| ID | How to Perform | Expected Result / Acceptance Criteria |
|---|---|---|
| **AG-01** | Ask: list the last 5 orders with buyer and total pcs. | The agent answers with a table of real orders (SO-1001 upwards); no plan card is needed for a read. |
| **AG-02** | Ask: what is the current stock of pieces for order SO-1001 by godown. | The agent calls the stock tools and reports G1/G2 buckets consistent with the pcs stock screen. |
| **AG-03** | Ask: create an order for buyer B001, style S-1001, 100 Black M and 100 Black L at ₹210 each, delivery 2026-12-31, order number MT-0906-AGENT. | A plan card appears summarizing buyer, style, lines, totals, and numbering; approve it; the commit returns SO-style numbering (your explicit number honored). The order appears in /orders and /orders/register. |
| **AG-04** | Open the order created by AG-03 in the Order Hub, then create one more order of the same shape through the /orders/new form. | Both doors produce identical structure and effects (same service); both orders appear in the register; the parity footer/chip cites the shared tool. |
| **AG-05** | Attach a small buyer-PO PDF in chat and ask the agent to ingest it. | Extraction runs; the agent proposes missing masters with confidence chips; one order per document entity is drafted as a plan; approving persists them. |
| **AG-06** | Ask: what should I do next for order MT-0906-AGENT. | The agent returns the next pipeline stage with a pre-filled argument skeleton (suggest_next_step); follow-up suggestions are consistent with the stage table in 2.7. |

## End-to-End Order Flow Test (The Golden Chain)

This is the centerpiece of the manual suite: one export order walked through the entire factory and settled in full. The chain mirrors the automated industry-chain E2E test (tests/pipeline/industry-chain.test.ts), which asserts stock-ledger effects at every hop; the manual run performs the same stages through the forms (with the agent as an alternative door) and verifies the same effects through the registers. Execute the stages in order — each stage's precondition is the previous stage's acceptance criteria.

The golden quantities are fixed so the expected results are computable. Order 1,000 pcs (500 Black M + 500 Black L) at ₹210 per piece. Cut 1,000. Produce 950 good. Reject 20 (scrap). Rework 10 (document only). Despatch 930. Invoice ₹195,300 taxable plus 5% GST = ₹205,065. Collect ₹205,065 in full. If you vary the quantities, recompute the expectations with the same arithmetic — the invariants (net stock to zero, ledger closure to zero, invoice status paid) do not change.

### Stage 0 — Test Data Preflight

| ID | How to Perform | Expected Result / Acceptance Criteria |
|---|---|---|
| **GF-00** | Confirm the seeded masters exist: buyer B001 (Acme Corp USA), style S-1001 (Mens Round Neck T-Shirt), colours Black, sizes M and L, party CUS001, yarn Y-30COT, godowns G1/G2, department D4 (Sewing), line L1, operator E001. Pick a unique order number MT-<date>-SO for the run. | All masters are present (they are seed data and must never be edited). The chosen order number does not exist in /orders/register. |

If yarn Y-30COT is absent in your database (the yarn list may vary between copies), create it first at the yarn master screen with code Y-30COT and a 30s combed cotton description — the BOM stage references it by code.

### Stage 1 — Sales Order (SO-####)

Purpose: book the export order. Path: /orders/new (form) or the agent (AG-03 pattern). Fill the header: order number MT-<date>-SO (or blank for auto SO numbering), buyer B001, style S-1001, delivery date, order type Export. Lines: Black / M / 500 / 210 and Black / L / 500 / 210. Submit and confirm the commit.

| ID | How to Perform | Expected Result / Acceptance Criteria |
|---|---|---|
| **GF-01** | Create the order with the two lines above; then open the Order Hub and the order register. | The order view shows totalPcs 1,000 and total value ₹2,10,000 (en-IN formatting). The register gains one row with status open. No stock effect exists yet — the stock ledger gains no row for the order. |

### Stage 2 — Bill of Materials (BOM)

Purpose: define the fabric recipe so programs and procurement can be proposed. Path: the BOM section of the Order Hub, or the agent with create_bom for style S-1001. Line: yarn Y-30COT, qty 250, rate 320.

| ID | How to Perform | Expected Result / Acceptance Criteria |
|---|---|---|
| **GF-02** | Create the BOM line; reopen the Order Hub BOM section (or ask the agent for the style BOM). | The BOM shows one line of 250 kg at ₹320 (value ₹80,000). No stock effect. The propose-programs screen (PR-02) now proposes requirements from this BOM. |

### Stage 3 — Knitting Program (PGM-####)

Purpose: convert BOM requirement into a production program. Path: /programs/new or /programs/propose (propose pre-fills from the BOM). Fields: order MT-<date>-SO, stage knitting, yarn Y-30COT, required 250 kg, target date.

| ID | How to Perform | Expected Result / Acceptance Criteria |
|---|---|---|
| **GF-03** | Create the program; open /programs/status with the order filter and the program view. | The program number matches PGM-####. The status register shows required 250 kg, actual 0, balance 250 kg. The ProgBalance row is created (agent query what is next confirms program state true). |

### Stage 4 — Purchase Order (PO-####)

Purpose: order the yarn from a supplier. Path: /procurement/po or the agent. Fields: supplier party (any seeded yarn supplier), lines yarn Y-30COT qty 250 rate 320, delivery date, godown G1.

| ID | How to Perform | Expected Result / Acceptance Criteria |
|---|---|---|
| **GF-04** | Create the PO; open /procurement/po and the PO view; open the approval inbox. | The PO registers with number PO-#### and value ₹80,000. A pending approval for the PO appears in the inbox (auto-submitted at commit). No stock effect. If the PO exceeds budget tolerance a warn verdict is shown on the plan card (expected only when you deviate from the golden numbers). |

### Stage 5 — GRN: Yarn Receipt (GRN-####)

Purpose: receive the yarn into the main store. Path: /procurement/grn or the agent with receive_grn. Fields: against the PO, yarn Y-30COT qty 250 kg, rate 320, godown G1.

| ID | How to Perform | Expected Result / Acceptance Criteria |
|---|---|---|
| **GF-05** | Receive the GRN; open /inventory/stock (yarn tab) and /inventory/register. | The stock register gains an IN row for 250 kg at G1. Current stock for Y-30COT at G1 increases by 250 kg valued at WAC. The PO balance reduces to zero (or shows received in full). |

### Stage 6 — Jobwork Out: Fabric to Jobworker (JW-####)

Purpose: send knitted fabric out for dyeing at an external jobworker. Path: /jobwork/order (DC out) or the agent with create_jobwork_order. Fields: jobworker party, process dyeing, material fabric with qty (kg), out godown G1, godown G3 as destination.

| ID | How to Perform | Expected Result / Acceptance Criteria |
|---|---|---|
| **GF-06** | Create the jobwork DC; open /jobwork/register. | The DC registers as JW-####. The register shows material out (kg) with balance pending return for that jobworker. The jobworker exposure view (party balance) reflects the value at process. |

### Stage 7 — Jobwork Receipt In

Purpose: receive the dyed fabric back. Path: /jobwork/receipt (update-only form against the DC) or the agent with receive_jobwork. Fields: the DC number, received qty (kg), process rate.

| ID | How to Perform | Expected Result / Acceptance Criteria |
|---|---|---|
| **GF-07** | Receive the fabric in; reopen /jobwork/register. | The jobwork balance reduces to zero (or to the unreceived remainder if you receive partially). Stock returns to G1 as processed fabric identity (process GRN IN row in the stock register). |

### Stage 8 — Cut Order (CUT-####): Pieces Enter G1

Purpose: cut fabric into ready-to-cut pieces. This is the first piece-bucket hop. Path: /cutting/job-order or the agent with create_cut_order. Fields: order MT-<date>-SO, fabric issued 250 kg, totalPcs 1,000, marker length 1.8, plies 80, efficiency 92, output godown G1.

| ID | How to Perform | Expected Result / Acceptance Criteria |
|---|---|---|
| **GF-08** | Create the cut order; open /pieces/stock (or /inventory/stock pcs view) filtered to the order, and /inventory/ledger filtered to ready_to_cut_in. | The cut order registers as CUT-####. G1 pieces for the order equal exactly 1,000. The stock ledger gains a ready_to_cut_in row with inPcs 1,000. /cutting/ready-to-cut shows the order as available to issue. |

### Stage 9 — Issue to Line (LI-####): Pieces Leave G1

Purpose: move ready-to-cut pieces to the sewing line. Path: /production/issue or the agent with issue_to_line. Fields: order, line L1, qty 1,000, from G1.

| ID | How to Perform | Expected Result / Acceptance Criteria |
|---|---|---|
| **GF-09** | Create the line issue; open the issue view and /pieces/stock for the order. | The issue registers as LI-#### with status issued. G1 pieces for the order drop to exactly 0. The stock ledger gains a ready_to_cut_out row with outPcs 1,000. The line WIP (production line status) shows 1,000 pcs on L1. |

### Stage 10 — Production Entry: Good Pieces Enter G2

Purpose: record sewing output with an operator (wages accrue per piece rate). Path: /production/entry or the agent with post_production_entry. Fields: order, dept D4, prod date today, bundle B1, operator E001, qty 950, rate 12.

| ID | How to Perform | Expected Result / Acceptance Criteria |
|---|---|---|
| **GF-10** | Create the production entry; open /pieces/stock and /production/register for the order; open the operator statement for E001. | G2 pieces for the order equal exactly 950. The stock ledger gains a production_in row with inPcs 950. The production register shows the entry with wage amount ₹11,400 (950 × 12). The operator statement earned column for the window includes ₹11,400. |

### Stage 11 — Rejection and Rework

Purpose: account for damaged pieces and rework labor. Path: /pieces/rejection (agent post_rejection) for 20 pcs, type stitch_fault, action scrap, dept D4. Then /production/rework (agent post_rework) for 10 pcs, bundle RW1, operator E001, rate 8.

| ID | How to Perform | Expected Result / Acceptance Criteria |
|---|---|---|
| **GF-11** | Create the rejection, then the rework entry; re-check /pieces/stock for the order. | The rejection registers as REJ-####; G2 pieces drop to exactly 930; the stock ledger gains a rejection_out row with outPcs 20. The rework entry is document-only: G2 remains 930 after it (no stock row), and the rework wage (10 × 8 = ₹80) appears in the operator statement window. |

### Stage 12 — Packing List (optional but recommended)

Purpose: pack the finished goods for despatch. Path: /pieces/packing-list or the agent. Fields: order, total 930 pcs with size-wise lines mirroring production (rounded realistically), pack type carton.

| ID | How to Perform | Expected Result / Acceptance Criteria |
|---|---|---|
| **GF-12** | Create the packing list; open its view. | The packing list registers (PL-####) with carton lines; the despatch stage can reference it. No stock effect (despatch is the moving stage). |

### Stage 13 — Pcs Despatch (DC-####): Pieces Leave G2

Purpose: despatch the finished goods. Path: /pieces/despatch or the agent with create_pcs_despatch. Fields: order MT-<date>-SO, totalPcs 930, vehicle TN33BX1234, lines style S-1001 qty 930 rate 210, from G2.

| ID | How to Perform | Expected Result / Acceptance Criteria |
|---|---|---|
| **GF-13** | Create the despatch DC; open /pieces/stock for the order and /dispatch/register. | The DC registers as DC-####. G2 pieces for the order drop to exactly 0 (net stock for the order is now zero across all godowns). The stock ledger gains a sales_delivery row with outPcs 930. The despatch register lists the DC with vehicle and destination. |

### Stage 14 — Sales Invoice (INV-####)

Purpose: book the despatch as a receivable. Path: /accounts/invoice or the agent with create_sales_invoice. Fields: order, party CUS001, bill type sales, totalQty 930, taxableValue 195,300 (930 × 210), gstRate 5, gstType cgst_sgst (local) or igst for an out-of-state party.

| ID | How to Perform | Expected Result / Acceptance Criteria |
|---|---|---|
| **GF-14** | Create the invoice; open the invoice view and /accounts/bills-register. | The invoice registers as INV-#### with bill amount ₹205,065 (195,300 × 1.05) — GST auto-split sourced from the HSN master (CGST 2.5% + SGST 2.5% for a local party; IGST 5% for interstate). The bills register shows the open bill. Party balance for CUS001 increases by the bill amount. |

### Stage 15 — Cost Sheet (CS-####)

Purpose: record the order P&L. Path: /costing/cost-sheet or the agent with create_cost_sheet. Fields: order, fabric 80,000, trim 12,000, CM 11,400, washing 5,000, packing 4,000, overheads 6,000, selling price 195,300. Optionally add component lines from the cost-component library.

| ID | How to Perform | Expected Result / Acceptance Criteria |
|---|---|---|
| **GF-15** | Create the cost sheet; open its view. | The cost sheet registers with total cost ₹1,18,400, per-pc cost ₹127.31 (on 930 despatched), and computed margin 39.35% ((195,300 − 118,400) / 195,300). The Order Hub est-vs-actual section shows the deltas against production and jobwork actuals (CM from production entries: 950 × 12 = ₹11,400 — note rework wages are excluded from the CM comparator). |

### Stage 16 — Collection and Settlement (RCP-####)

Purpose: collect the invoice in full and close the money loop. Path: /accounts/payments (direction in) or the agent with record_payment. Fields: party CUS001, amount 205,065, direction in, invoice INV-####, order, mode bank, reference UTR-MT-####.

| ID | How to Perform | Expected Result / Acceptance Criteria |
|---|---|---|
| **GF-16** | Record the payment; open the payment view, the invoice view, and /accounts/party-ledger for CUS001. | The receipt registers as RCP-####. The payment view shows the allocation: ₹205,065 fully allocated, on-account 0. The invoice status flips to paid. The party ledger for CUS001 closes the receivable to zero for this chain (bills minus receipts). A companion receipt journal voucher (V-####) is written with the party linkage. |

### Final Verification — Pipeline Complete

| ID | How to Perform | Expected Result / Acceptance Criteria |
|---|---|---|
| **GF-17** | Ask the agent: what is next for order MT-<date>-SO. Verify the summary and the registers one last time. | The agent reports the pipeline complete with producedPct 95 (950 of 1,000). Net stock for the order across G1/G2 is zero. The order register row can be closed via /orders/close. The daily in/out register (/registers/daily-in-out) shows today's quantities for the stages executed. |

If any stage failed its acceptance criteria, record the case ID (GF-##), the stage, the observed values, and a screenshot. Do not proceed past a failed stage for that order — later stages depend on the earlier stock states, and continuing produces misleading failures.

## Negative and Edge-Case Tests

The negative suite confirms the system fails safely: invalid input is rejected with clear messages, guarded operations are blocked or flagged, and no partial state is ever left behind. Each case below must end with zero residue — check the register where the document would have appeared and confirm nothing was created.

| ID | How to Perform | Expected Result / Acceptance Criteria |
|---|---|---|
| **N-01** | On /orders/new, submit with buyer and style empty; then with qty 0 and a negative rate. | Zod validation errors render inline per field; no POST reaches the service; no order appears in the register. |
| **N-02** | Ask the agent to create an order with an unknown buyer code (for example B-NOPE). | The agent responds honestly that the master does not exist and offers to create it; no plan card is committable; no order is created. |
| **N-03** | Attempt to create two orders with the same explicit number (repeat the MT- order number). | The second create is refused with a duplicate-number error; numbering remains gap-free. Auto-numbering (blank field) never collides. |
| **N-04** | Create a PO with a rate far over the budget (for example 10× the golden rate) through the agent. | The plan card shows the tolerance verdict (warn or block per flag configuration); a blocking verdict prevents commit; a warn verdict commits but is flagged and auditable. |
| **N-05** | Log in as the restricted user created in AD-03; attempt to open /accounts and /hr directly by URL. | The restricted sidebar shows only Orders; direct URL access is denied (403 or redirect per the rights guard); the login session remains valid for permitted routes. |
| **N-06** | Attempt login with a deactivated user (from AD-02). | Login is refused regardless of correct credentials; the error message does not leak whether the account exists. |
| **N-07** | Record a payment larger than the open invoice amount (for example ₹210,000 against the ₹205,065 bill). | The allocation fills the invoice; the remainder is recorded explicitly as on-account (never silently dropped); the ledger balances remain consistent. |
| **N-08** | Create a supplier bill 5% over the matched PO/GRN figures. | The three-way match verdict on the plan card flags the over-bill with a warning chip; commit proceeds only with acknowledgment; the bill-pass stage shows the verdict. |
| **N-09** | Cancel a document that supports reversal (for example an invoice with no payment, or a purchase order before approval). | The cancel action writes compensating ledger entries restoring the exact prior state (G3 reversal); stock and party balance return to pre-document values; the register marks the document cancelled, not deleted. |
| **N-10** | In the payroll flow, commit a payroll run twice, and attempt to print a payslip for a draft run. | The second commit is refused (double-commit guard); the draft payslip returns not-found (a payslip is a payment instrument — committed runs only); masked identifiers never expose full bank data. |

Additionally, while executing any negative case, watch the browser console: error cards and validation messages are expected, but unhandled page errors or console exceptions are defects even on failure paths. The E2E precedent in this project treats zero console errors as the bar for negative flows too, with the intended 401/4xx responses explicitly allowed.

## Test Results Summary (Current Round)

The verification round performed on 2026-09-06 on main (commit f68aa92 — the M52 final-accounts batch, Module M Batch 3: the four GL reports on the M50/M51 substrate — /accounts/trial-balance (per-account Dr/Cr/net+side with the Dr == Cr ASSERTED summary and the unlinked honesty door), /accounts/day-book (the chronological voucher register, every type + every status — a cancelled voucher and its CN- contra sit together and net), /accounts/cash-book (the 1010 family = the control + its per-bank GL children, opening/inflow/outflow/closing + running balance), /accounts/final-accounts (P&L net + balance sheet with the retained-earnings line, Δ asserted 0 — structural from Dr == Cr) — each with its csv twin + agent tool (get_trial_balance / get_day_book / get_cash_book / get_final_accounts, one service both doors). THE GL DOCTRINE is the batch's semantic core: every journal row counts in the GL regardless of status — the status flag is sub-ledger truth-ownership, the CONTRA row is the GL's reversal, so every cancel nets to zero and the trial balance is structurally balanced (probe-pinned at all three layers: unit test, route smoke, browser E2E). The batch is pure read side — zero schema, zero posting changes (91 models stand)) covered the automated gates in full and the live route surface by direct request. The M50/M51/M52 batches are all local on main, ahead of the remote (the PAT push is pending re-supply); every gate below ran on the M52 tree. Results are summarized below; manual execution of Sections 4-6 by a human tester remains the open work this guide enables.

**Verification results, 2026-09-06 round**

| Check | Result | Detail |
|---|---|---|
| Vitest suite | PASS | 75 files, 1561 tests passed in 49s (includes industry-chain, payroll L01/L02/L03/L04, accounts M-01 + M-02 + M-03, FY hotfix, parity suites) |
| TypeScript (src) | PASS | Zero errors under src/; known legacy errors confined to scripts/ cleanup files |
| Context integrity | PASS | context_check.sh: 606/606 checks, NO DRIFT (the m52 PROMPT_VERSION pin; tools 265, menu 147, routes 183, register configs 35, register services 47) |
| Agent routing (static) | PASS | eval_routing.mjs --static PASS (m52-2026-09-06, registry 257) |
| Route smoke (live) | PASS | route_smoke_m52.sh: 45/45 — the four report screens render (trial-balance, day-book, cash-book, final-accounts, both FA variants) · the live TB asserts BALANCED (187/187 rows counted, 0 unlinked) · the crafted today-window walkthrough (Dr 1010/Cr Sales 600 + Dr Freight/Cr 1010 250 → TB rows + NET PROFIT ₹350 + the BS balanced) · the contra-filter honesty · the csv twins ×4 · the not-in-family refusal · full revert; route_smoke_m48/m49/m50/m51 re-basis covered by the shared services |
| Browser E2E (live) | PASS | The four report screens (screenshots m52-trial-balance / m52-day-book / m52-cash-book / m52-final-accounts-pl / m52-final-accounts-bs; the nav shows '147 of 147 screens live' with the quartet) → a cash receipt through the /accounts/payments form (CUS001, ₹500, ref M52-BE) → the plan card 'GL legs classify to Cash/Bank [1010] / Sundry Debtors [1110]' → Approve → RCP-0188 live on the day-book → Reverse payment through the view → DB-verified (payment cancelled, JV-RCP-0188 ACTIVE + CN-RCP-0188 contra with swapped legs, the invoice re-derived) → the day-book shows THE PAIR → the trial balance still BALANCED at 189 rows counted → zero console/page errors on the M52 screens → fully reverted (187 rows again, zero residue) |
| Login (live) | PASS | admin@fiberpro.local authenticated via /api/auth/login; session payload correct |
| Git state | PASS | Working tree clean; local main ahead of origin/main by the M50 (feat + docs), M51 (spec + feat + docs) and M52 (spec + feat) commits — the PAT push is pending re-supply; side_quest fully merged (0 unmerged commits) |

The seeded database state at verification time: 209 orders, 190 sales invoices, 187 payments, 184 programs, 190 cut orders, 8 purchase orders, 6 jobwork orders, 26 parties, 10 employees, 1,183 stock ledger rows, financial year 26-27 active, zero payroll runs. The data is a residue of prior test rounds and seed fixtures; it is realistic for read-surface verification and does not interfere with the golden flow, which creates its own fresh chain.

## Defect Analysis and Known Issues

No new defects were found during this verification round. The single observation is a known, documented condition rather than a defect: legacy cleanup scripts under scripts/ reference retired Prisma models (bill, billPass) and therefore fail strict type checking. They are outside the src/ gate, are not part of the build, and are scheduled for archival in a future housekeeping change. No action is required for the manual suite.

Historical defects relevant to a tester's expectations, all fixed and pinned by regression tests: the fiscal-year 2027 time bomb (all numbering now derives from the active FinYear row — creating and activating 27-28 at /admin/company is the entire rollover procedure); the party-ledger double count (companion journals no longer double-subtract receipts); the payroll double-commit and draft-payslip guards; and the upload-route gremlin restored after the M44 sandbox incident. If any of these behaviors regress, the corresponding pipeline test (fy-hotfix, payroll-l01/l02/l03/l04, party-ledger cases) will fail before a manual tester reaches them.

## Risk Assessment and Outstanding Items

**Risks affecting manual test reliability**

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Development database drift from repeated manual runs | High | Low | MT- prefixes keep residue greppable; re-copy a pristine custom.db or run scripts/e2e_cleanup_devdb.ts when registers get noisy |
| Agent tests depend on the GLM API being reachable | Medium | Medium | Form-door cases run independently; retry agent cases if the provider is rate-limited (the harness degrades gracefully) |
| SQLite write contention under concurrent manual users | Low | Medium | Run the suite single-user; the engine serializes transactions, so this is a latency risk, not a correctness risk |
| Numbering collisions with re-used explicit order numbers | Medium | Low | Always use a fresh MT-<date>- prefix; leave number fields blank to use auto numbering |
| Console noise mistaken for defects in dev mode | Medium | Low | Only unhandled page errors and real console.error entries count; Fast Refresh preamble and DevTools notices are excluded by convention |

Outstanding items for the next round, in priority order: execute the full manual suite (Sections 4-6) and record results against the case IDs; extend the browser E2E specs to cover the payroll UI paths that are currently service-tested only; archive the legacy cleanup scripts to retire the last tsc noise; and schedule the financial-year rollover drill (create and activate 27-28 on a database copy) as a rehearsal before 2027-04-01.

## Test Conclusions and Sign-Off

Verdict for the 2026-09-06 verification round: PASS. The merged main branch (including all side_quest work) is green on every automated gate, boots cleanly, serves every live route, and authenticates correctly. The application is ready for full manual acceptance testing using this guide. Sign-off requires a human tester to complete the walkthrough (Section 4), the golden chain (Section 5), and the negative suite (Section 6) with all cases passed or explicitly waived with reasons.

**Sign-off checklist**

| Item | Evidence Required | Status |
|---|---|---|
| Automated gates green | Table 1 commands re-run on the build under test | PASS (2026-09-06) |
| Start-to-end walkthrough (Section 4) | All case IDs AU/NA/OR/PR/PC/IV/CU/PD/JW/DP/DL/AC/CS/HR/QA/AP/RP/MS/AD/AG marked (HR now includes the statutory cases HR-05 through HR-08 and the M49 attendance-depth cases HR-09 through HR-11; AC now includes the M50 chart-of-accounts cases AC-05 through AC-08, the M51 double-entry cases AC-09 through AC-12, and the M52 final-accounts cases AC-13 through AC-16) | Pending |
| Golden order flow (Section 5) | GF-00 through GF-17 marked; net stock zero; invoice paid; ledger closed | Pending |
| Negative suite (Section 6) | N-01 through N-10 marked; zero residue after each | Pending |
| side_quest merge regression (Appendix E) | R-FY, R-WG, R-PR, R-CS case IDs marked; created documents reverted | Pending |
| Defect log | Any failures filed with case ID, route, console output, screenshot | No open defects |
| Data hygiene | MT- residue identified; no seed masters altered | Pending |

## Appendix A — Route Reference for the Walkthrough

The route reference lists the canonical entry points per module group. All routes below were live-verified (HTTP 200) on the build under test. Document views follow the pattern [list]/[id]; registers offer a sibling /csv route for export.

**Key routes by module**

| Module | List / Entry | Register | View |
|---|---|---|---|
| Orders | /orders, /orders/new | /orders/register, /orders/in-hand, /orders/status | /orders/[id] |
| Programs | /programs/new, /programs/propose | /programs/status | /programs/[id] |
| Procurement | /procurement/po, /procurement/grn | /procurement/po/register, supplier-pending, party-balance | /procurement/po/[id], grn/[id] |
| Inventory | /inventory/stock (yarn, fabric, accessory, general, itemwise) | /inventory/ledger, register, lots, rolls, io-history, closing-stock | stock-take/[id] |
| Cutting | /cutting/job-order, /cutting/panel | /cutting/register, ready-to-cut | /cutting/job-order/[id] |
| Production | /production/issue, /production/entry, /production/rework | /production/register, line-status, line-output | issue/[id], entry/[id] |
| Job Work | /jobwork/order, /jobwork/receipt, /jobwork/contract | /jobwork/register, statement | /jobwork/order/[id] |
| Pieces | /pieces/despatch, receipt, transfer, packing-list, rejection, shortage | /pieces/stock, orderwise | despatch/[id], packing-list/[id] |
| Despatch | /dispatch/dc, gate-entry, gate-pass, courier, loading | /dispatch/register | gate-entry/[id], gate-pass/[id] |
| Accounts | /accounts/invoice (local, piece), payments, journal, bill, debit-note | bills-register, supplier-bills, party-ledger, hsn-gst, tally-export | invoice/[id], payments/[id] |
| Costing | /costing/cost-sheet, budget, input, expenses, piece-rate | /costing/budget-vs-actual, daily-pnl | cost-sheet/[id], budget/[id], expenses/[id] |
| HR | /hr/employees, attendance, wages, wage-payments, payroll, shifts | /hr/operator-statement, payroll | /hr/payroll/[id] |
| Quality | /quality/lab-tests, parameters, lot-approval, reprocess-approval, non-return-dc | — | lab-tests/[id] |
| Approvals | /approvals | /approvals/audit | — |
| Reports | /reports, /reports/packs, /reports/mis | /reports/[slug], /registers/daily-in-out | — |
| Masters & Admin | /masters, /admin/company, users, menu-rights, options, settings | /admin/audit | masters/[entity] |

## Appendix B — Document Number Prefixes

Numbers are fiscal-year scoped and gap-free. Leaving the number field blank on any form lets the numbering service assign the next value; explicit values are honored with collision protection. The prefixes a tester will encounter:

**Document number prefixes**

| Prefix | Document | Created At |
|---|---|---|
| SO- | Sales order | /orders/new |
| PGM- | Production program | /programs/new |
| PO- | Purchase order | /procurement/po |
| GRN- | Goods receipt (purchase and process) | /procurement/grn, /jobwork/receipt |
| JW- | Jobwork despatch challan (out) | /jobwork/order |
| CUT- | Cut order | /cutting/job-order |
| LI- | Line issue | /production/issue |
| REJ- | Rejection entry | /pieces/rejection |
| DC- | Piece despatch challan | /pieces/despatch |
| PL- | Packing list | /pieces/packing-list |
| INV- | Sales invoice | /accounts/invoice |
| DN- | Debit note | /accounts/debit-note |
| SB- | Supplier bill | /accounts/bill |
| V- | Journal voucher (including wage and receipt companions) | /accounts/journal, services |
| RCP- / PYT- | Payment receipt / payment voucher | /accounts/payments |
| PR- | Payroll run | /hr/payroll |
| CC- | Cost component (master) | /masters |

## Appendix C — Print Documents

Every document view exposes a print link that renders a dedicated print sheet at /print/[docType]/[id]. The mapped families on this build are: order, invoice, debit-note, payment, journal, purchase-order (po), grn, cost-sheet, budget, expense, cut-order, production-entry, line-issue, pcs-despatch, packing-list, rejection, gate-entry, gate-pass, jobwork dc, lab-test, sample, and payslip (payroll). Print acceptance during the walkthrough: the sheet renders with company header, document number, amount-in-words on money documents, and a barcode/QR where applicable; the browser print dialog produces a clean single document.

## Appendix D — Post-Change Regression Checklist

Run this checklist after any code change before re-running the full manual suite. It is the minimum bar the project itself uses between milestones, and takes roughly ten minutes.

1. npx vitest run — 1420+ tests green (the count only grows).
2. npx tsc --noEmit — zero errors under src/.
3. bash scripts/context_check.sh — NO DRIFT.
4. node scripts/eval_routing.mjs --static — PASS.
5. Boot npm run dev; log in; hit the module landing routes (Table 2) — all 200.
6. Spot-check one register CSV and one print sheet.
7. Ask the agent one read question and one what's-next question — both answer correctly.

## Appendix E — side_quest Merge Regression Suite

The M47 merge unified two independently developed lines: the side_quest branch (fiscal-year single-source hotfix, wage reconciliation, payroll run with payslips) and main's own costing-depth milestone. This appendix is the merge-regression suite for that integration. Each case reproduces the original defect scenario, confirms the fix behaves as shipped, and confirms the surrounding happy path still works after the merge. Run it after Sections 4-6 — it reuses their conventions (the MT- number prefix, the zero-residue rule, the seeded fixture) — and treat any failure here as a merge regression first: these same behaviors were green on both parent lines before the merge commit.

Sequencing and residue: the four groups are independent and can run in any order, except R-PR-02 which needs the run created in R-PR-01, and R-WG-03 which is cleanest before the payroll group so wage bills and payroll journals stay distinguishable. The read-only probes (R-WG-02, R-WG-04, R-CS-03, R-CS-04) are safe on seeded data. Cases that create documents leave the same greppable MT- residue as the rest of the suite; revert created documents through their own view before sign-off.

### Fiscal-Year Single Source (M44-FY — the 2027 time bomb)

The original defect: roughly 24 posting services hardcoded the literal 26-27, so on 2027-04-01 every new document would silently stamp the wrong financial year. The fix moved the decision to exactly one place — the ACTIVE FinYear row at /admin/company, with an IST-date-derived fallback when no row is active. Three behaviors must hold: the default follows the active row, the rollover is a data-only operation, and an explicit finYear argument still wins for historical documents. Note that document number series do not reset per fiscal year (deliberately out of scope); the year under test is the document's Fin Year field.

| ID | How to Perform | Expected Result / Acceptance Criteria |
|---|---|---|
| **R-FY-01** | At /costing/expenses create an expense with the number field left blank; commit it and open the created view. | The document commits gap-free with the auto-assigned number, and the Fin Year field on the view reads 26-27 — matching the ACTIVE row at /admin/company, never a frozen literal. (Original bug: the year was baked into about 24 posting services and would have frozen every new document at 26-27 past 2027-04-01.) |
| **R-FY-02** | Rollover drill, ideally on a copy of the database: at /admin/company create FinYear 27-28 and mark it ACTIVE; create one more MT- expense; then re-activate 26-27, cancel or delete the drill expense, and remove the 27-28 row if the UI allows (an inactive leftover row is harmless). | While 27-28 is active, the new expense's Fin Year reads 27-28 with zero code changes anywhere; after re-activation the next document reads 26-27 again. This data-only procedure is the entire rollover the owner performs in 2027 — it is also the drill Section 9 recommends rehearsing before the real date. |
| **R-FY-03** | Agent door: ask the agent to create an expense with an explicit fin year of 27-28; approve the plan card; then create a second expense without stating a year. Compare the two documents' Fin Year fields. | The explicit-args document reads 27-28 (historical documents stay pinned to their stated year); the default document reads the active 26-27. Explicit arguments win; the default follows the row. |

### Wage Reconciliation (M45 — loop closure and the ledger double-count)

Two original defects shape this group. First, operators had no statement: production earnings, advances, and wage payments could not be reconciled per operator because employees were not linked to parties. The fix is the 1:1 employee-party link — a party of the same code is auto-created and linked on first save — plus the operator statement at /hr/operator-statement. Second, the party ledger double-counted every receipt: companion cash-voucher journals were subtracted in the journals term while the payment legs subtracted the same cash again, overstating outflows twofold. The fix restricts the journals term to journal and contra voucher types.

| ID | How to Perform | Expected Result / Acceptance Criteria |
|---|---|---|
| **R-WG-01** | At /hr/employees create a new employee (leave the code blank for auto-assign, set a daily wage); save; check the party master for the same code; then re-save the employee once more. | A party of the same code is auto-created and linked 1:1 on first save; the second save does not duplicate it (idempotent). The new operator's statement row shows zero activity honestly rather than an error or a missing row. |
| **R-WG-02** | Open /hr/operator-statement and pick an operator with production history (E001 on the seed); note earned, paid, and owed for the default all-time window. | owed equals earned minus paid exactly (each leg windowed on its own dates); the figures agree with the wages register for the same operator, and the CSV export matches the on-screen row. |
| **R-WG-03** | Create a production bill restricted to one operator at /accounts/production-bills; commit it; open the party ledger for that operator's linked party. | The wage journal carries the party linkage (per-operator bills hit the ledger); the bill amount appears once in the ledger's journal term, and the operator statement reflects the new earned total. |
| **R-WG-04** | Open /accounts/party-ledger filtered to CUS001 (a customer with many receipts on the seed). | The closing receivable is a plausible positive figure (about ₹43 lakh at verification time). A regression of the double-count shows immediately as a nonsensical negative of crore scale (the original defect computed about −₹3.4 crore for this party); receipts carrying companion JV cash vouchers count once, in the payment term only. |

### Payroll Run and Payslip (M46)

The payroll module is new surface, so regression here means verifying the invariants it shipped with rather than an older bug: the draft-then-commit lifecycle, per-line wage journals that close the employee-party ledger to exactly zero once the net is paid, the payslip-as-payment-instrument rule (committed runs only, sensitive identifiers masked), and the piece-mode double-credit guard. These invariants are pinned by the payroll pipeline tests; this group walks them through the UI doors.

| ID | How to Perform | Expected Result / Acceptance Criteria |
|---|---|---|
| **R-PR-01** | At /hr/payroll create a DAILY run over a short window covered by seeded attendance; open the run view before committing. | Lines list days as present counting 1 and half counting 0.5, earned as days × dailyWage, advances as windowed out-payments to the linked party, and net as earned minus advances; employees with zero wages are named in the response rather than silently dropped; the run is DRAFT and no journal exists yet. |
| **R-PR-02** | Commit the R-PR-01 run; inspect the journals audit table on the run view; pay one line's net at /hr/wage-payments; reopen the operator statement and that operator's party ledger. | Exactly one journal per line, carrying the party link, debiting Production Wages or Staff Salaries and crediting Wage Payable at the FULL earned amount; after the net is paid, that operator's owed and the party ledger both close to exactly zero — the wage loop closes. |
| **R-PR-03** | Open the payslip print link on a committed line; then attempt a payslip for a DRAFT run (or a bogus PR number) by URL. | The committed payslip prints NET PAYABLE, the amount in words, the pay-to block, and masked UAN and aadhaar (XXXX-XXXX with the last four digits); the draft or unknown payslip returns not-found — a payslip is a payment instrument, committed runs only. |
| **R-PR-04** | Attempt a PIECE-mode run whose window overlaps an already-COMMITTED piece run. | Planning is refused with a double-credit error naming the overlapping committed run; no new run is created. (Production-bill overlap is undetectable by design and the plan card says so honestly — that softer refusal is expected, not a defect.) |
| **R-PR-05** | Edit an employee at /hr/employees: set designation, joining date, bank name, IFSC, and UPI; save and reopen; print any committed payslip for that employee. | The payout fields round-trip through the form and appear in the payslip's pay-to block; UAN and aadhaar remain masked on print — the full values never leave the master surfaces. |

### Costing Depth (M44 main-line — the other half of the merge)

Main's own M44 milestone shipped inside the same merge and carries the same regression risk. Its known original defect: the cost-component master's edit path failed live — the code field was missing from the edit sheet, so updates died with a required-code banner and the category snapped back — caught by the browser gate and fixed with the code-field rule. Beyond that, the milestone's invariants need re-confirmation after the merge: the cost sheet calculator (computed line totals, per-piece cost, stored margin), the order est-vs-actual read model, and the daily P&L material leg.

| ID | How to Perform | Expected Result / Acceptance Criteria |
|---|---|---|
| **R-CS-01** | From the /masters hub open the cost-component master; create a component (category packing, any rate); then EDIT it through the sheet — change the category and save. | Create auto-assigns the CC-#### code; the edit sheet shows the code as an input and the category persists across saves. (Original defect: the code field was missing from the edit form — saves failed with a code-required banner and the category reset to other.) |
| **R-CS-02** | At /costing/cost-sheet create a sheet for a style with a BOM; let it seed lines, or add a component line of 5,000 units at ₹2.5; set a selling price of ₹4 per piece; open the view. | Head totals derive from the lines, and the per-piece cost and margin percent are computed and stored (the worked example: a ₹12,500 packing head, ₹2.5 per piece, 37.5% margin at ₹4 selling). A legacy sheet without lines still renders unchanged. |
| **R-CS-03** | Open an order with production and jobwork history on the Order Hub; then ask the agent for the cost of that same order. | The est-vs-actual section shows CM from production entries (rework excluded), process from jobwork values, and fabric and trim at WAC — a dash on heads that are not derivable, and the whole section stays silent when nothing is derivable; the agent answers from the same service with the same numbers. |
| **R-CS-04** | Open /costing/daily-pnl for a date with activity. | The Material (period, WAC) row values consumption at bucket WAC — never the leg rate — and the net margin is the four-term formula: produced minus wages minus expenses minus material. |

Failure triage: a red case in group 15.1 or 15.2 means a side_quest fix regressed in the merge; a red case in group 15.4 means main's costing milestone regressed; all of them were green on their respective parent lines, so the merge commit (0da083e) is the first place to look. Every case in this appendix has an automated twin in the pipeline suite (fy-hotfix-m44, payroll-l01, payroll-l02, payroll-l03, payroll-l04, accounts-m01, accounts-m02, accounts-m03, cst-batch8, and the party-ledger cases): if a manual case fails while its pipeline twin passes, suspect the UI wiring rather than the service, and file the defect with the case ID, the route, and the console output.
