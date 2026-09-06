/**
 * Manual Testing Guide — content module C (Sections 7-11 + appendices).
 */
module.exports = [

  // ================= SECTION 7 =================
  { h1: "7. Test Results Summary (Current Round)" },
  { p: "The verification round performed on 2026-09-06 on main (commit fd96790 — the M51 true-double-entry batch, Module M Batch 2: the payment door posts mode-aware cash/bank GL legs (the BankAccount glAccountCode preference + the Payment.bankAccountId audit FK + resolveCashLeg: cash the control, a bank mode with a linked bank that bank's own account, unlinked the control plus a nag, no bank byte-identical to M50), debit notes and expenses post companion journals classifying to the CoA (the note's voucherType deliberately outside the party-ledger filter so the sub-ledger never double-counts; an expense with a paid-to party credits Sundry Creditors and settles to 0 through the ordinary payment door), the cancels mirror every leg with swapped contras, and the double-reverse fix landed — the party ledger and bills register count active rows only and contras never, so cancelling a receipt re-opens the AR instead of flipping it negative) covered the automated gates in full and the live route surface by direct request. The M50 chart-of-accounts batch (commit 3df09b2) and the M51 batch are both local on main, ahead of the remote (the PAT push is pending re-supply); every gate below ran on the M51 tree. Results are summarized below; manual execution of Sections 4-6 by a human tester remains the open work this guide enables." },
  { table: {
    title: "Table 5: Verification results, 2026-09-06 round",
    headers: ["Check", "Result", "Detail"],
    widths: [30, 16, 54],
    rows: [
      ["Vitest suite", "PASS", "74 files, 1523 tests passed in 46.5s (includes industry-chain, payroll L01/L02/L03/L04, accounts M-01 + M-02, FY hotfix, parity suites)"],
      ["TypeScript (src)", "PASS", "Zero errors under src/; known legacy errors confined to scripts/ cleanup files"],
      ["Context integrity", "PASS", "context_check.sh: 606/606 checks, NO DRIFT (the m51 PROMPT_VERSION pin; tools 261, masters 43, models 91)"],
      ["Agent routing (static)", "PASS", "eval_routing.mjs --static PASS (m52-2026-09-06)"],
      ["Route smoke (live)", "PASS", "route_smoke_m51.sh: 26/26 — the 20-row CoA master (5120 Other Expenses) · the payment form bankAccountNo picker + hint · the DN/expense GL fields · the bank master GL Acct column · the crafted walkthrough (bank-linked RCP-9501 with its companion Dr 1012, the JV-DN-9501 'Sales · 4010' chip) · the bills-register honesty door (a cancelled receipt leaves the day-book) with full revert; route_smoke_m48/m49/m50 re-basis covered by the shared services"],
      ["Browser E2E (live)", "PASS", "Bank-linked receipt through the /accounts/payments form (party + NEFT + the bank picker) — the plan card reads 'GL legs classify to Browser E2E Bank M51 [1013] / Sundry Debtors [1110] (SPEC-M51 M-02 — the bank account's own GL ledger)' → commit → database verified (Payment.bankAccountId set, the journal debits account 1013, the invoice derives paid) → the journal register chips 'Browser E2E Bank M51 · 1013' → Reverse payment through the view → the contra swaps the BANK legs and the party ledger net balance re-opens to the billed amount (the double-reverse fix proven live) → zero console errors on the touched pages → fully reverted"],
      ["Login (live)", "PASS", "admin@fiberpro.local authenticated via /api/auth/login; session payload correct"],
      ["Git state", "PASS", "Working tree clean; local main ahead of origin/main by the M50 (feat + docs) and M51 commits — the PAT push is pending re-supply; side_quest fully merged (0 unmerged commits)"],
    ],
  }},
  { p: "The seeded database state at verification time: 209 orders, 190 sales invoices, 187 payments, 184 programs, 190 cut orders, 8 purchase orders, 6 jobwork orders, 26 parties, 10 employees, 1,183 stock ledger rows, financial year 26-27 active, zero payroll runs. The data is a residue of prior test rounds and seed fixtures; it is realistic for read-surface verification and does not interfere with the golden flow, which creates its own fresh chain." },

  // ================= SECTION 8 =================
  { h1: "8. Defect Analysis and Known Issues" },
  { p: "No new defects were found during this verification round. The single observation is a known, documented condition rather than a defect: legacy cleanup scripts under scripts/ reference retired Prisma models (bill, billPass) and therefore fail strict type checking. They are outside the src/ gate, are not part of the build, and are scheduled for archival in a future housekeeping change. No action is required for the manual suite." },
  { p: "Historical defects relevant to a tester's expectations, all fixed and pinned by regression tests: the fiscal-year 2027 time bomb (all numbering now derives from the active FinYear row — creating and activating 27-28 at /admin/company is the entire rollover procedure); the party-ledger double count (companion journals no longer double-subtract receipts); the payroll double-commit and draft-payslip guards; and the upload-route gremlin restored after the M44 sandbox incident. If any of these behaviors regress, the corresponding pipeline test (fy-hotfix, payroll-l01/l02/l03/l04, party-ledger cases) will fail before a manual tester reaches them." },

  // ================= SECTION 9 =================
  { h1: "9. Risk Assessment and Outstanding Items" },
  { table: {
    title: "Table 6: Risks affecting manual test reliability",
    headers: ["Risk", "Likelihood", "Impact", "Mitigation"],
    widths: [30, 14, 14, 42],
    rows: [
      ["Development database drift from repeated manual runs", "High", "Low", "MT- prefixes keep residue greppable; re-copy a pristine custom.db or run scripts/e2e_cleanup_devdb.ts when registers get noisy"],
      ["Agent tests depend on the GLM API being reachable", "Medium", "Medium", "Form-door cases run independently; retry agent cases if the provider is rate-limited (the harness degrades gracefully)"],
      ["SQLite write contention under concurrent manual users", "Low", "Medium", "Run the suite single-user; the engine serializes transactions, so this is a latency risk, not a correctness risk"],
      ["Numbering collisions with re-used explicit order numbers", "Medium", "Low", "Always use a fresh MT-<date>- prefix; leave number fields blank to use auto numbering"],
      ["Console noise mistaken for defects in dev mode", "Medium", "Low", "Only unhandled page errors and real console.error entries count; Fast Refresh preamble and DevTools notices are excluded by convention"],
    ],
  }},
  { p: "Outstanding items for the next round, in priority order: execute the full manual suite (Sections 4-6) and record results against the case IDs; extend the browser E2E specs to cover the payroll UI paths that are currently service-tested only; archive the legacy cleanup scripts to retire the last tsc noise; and schedule the financial-year rollover drill (create and activate 27-28 on a database copy) as a rehearsal before 2027-04-01." },

  // ================= SECTION 10 =================
  { h1: "10. Test Conclusions and Sign-Off" },
  { p: "Verdict for the 2026-09-06 verification round: PASS. The merged main branch (including all side_quest work) is green on every automated gate, boots cleanly, serves every live route, and authenticates correctly. The application is ready for full manual acceptance testing using this guide. Sign-off requires a human tester to complete the walkthrough (Section 4), the golden chain (Section 5), and the negative suite (Section 6) with all cases passed or explicitly waived with reasons." },
  { table: {
    title: "Table 7: Sign-off checklist",
    headers: ["Item", "Evidence Required", "Status"],
    widths: [40, 44, 16],
    rows: [
      ["Automated gates green", "Table 1 commands re-run on the build under test", "PASS (2026-09-06)"],
      ["Start-to-end walkthrough (Section 4)", "All case IDs AU/NA/OR/PR/PC/IV/CU/PD/JW/DP/DL/AC/CS/HR/QA/AP/RP/MS/AD/AG marked (HR now includes the statutory cases HR-05 through HR-08 and the M49 attendance-depth cases HR-09 through HR-11; AC now includes the M50 chart-of-accounts cases AC-05 through AC-08 and the M51 double-entry cases AC-09 through AC-12)", "Pending"],
      ["Golden order flow (Section 5)", "GF-00 through GF-17 marked; net stock zero; invoice paid; ledger closed", "Pending"],
      ["Negative suite (Section 6)", "N-01 through N-10 marked; zero residue after each", "Pending"],
      ["side_quest merge regression (Appendix E)", "R-FY, R-WG, R-PR, R-CS case IDs marked; created documents reverted", "Pending"],
      ["Defect log", "Any failures filed with case ID, route, console output, screenshot", "No open defects"],
      ["Data hygiene", "MT- residue identified; no seed masters altered", "Pending"],
    ],
  }},

  // ================= SECTION 11 — APPENDICES =================
  { h1: "11. Appendix A — Route Reference for the Walkthrough" },
  { p: "The route reference lists the canonical entry points per module group. All routes below were live-verified (HTTP 200) on the build under test. Document views follow the pattern [list]/[id]; registers offer a sibling /csv route for export." },
  { table: {
    title: "Table 8: Key routes by module",
    headers: ["Module", "List / Entry", "Register", "View"],
    widths: [22, 34, 24, 20],
    rows: [
      ["Orders", "/orders, /orders/new", "/orders/register, /orders/in-hand, /orders/status", "/orders/[id]"],
      ["Programs", "/programs/new, /programs/propose", "/programs/status", "/programs/[id]"],
      ["Procurement", "/procurement/po, /procurement/grn", "/procurement/po/register, supplier-pending, party-balance", "/procurement/po/[id], grn/[id]"],
      ["Inventory", "/inventory/stock (yarn, fabric, accessory, general, itemwise)", "/inventory/ledger, register, lots, rolls, io-history, closing-stock", "stock-take/[id]"],
      ["Cutting", "/cutting/job-order, /cutting/panel", "/cutting/register, ready-to-cut", "/cutting/job-order/[id]"],
      ["Production", "/production/issue, /production/entry, /production/rework", "/production/register, line-status, line-output", "issue/[id], entry/[id]"],
      ["Job Work", "/jobwork/order, /jobwork/receipt, /jobwork/contract", "/jobwork/register, statement", "/jobwork/order/[id]"],
      ["Pieces", "/pieces/despatch, receipt, transfer, packing-list, rejection, shortage", "/pieces/stock, orderwise", "despatch/[id], packing-list/[id]"],
      ["Despatch", "/dispatch/dc, gate-entry, gate-pass, courier, loading", "/dispatch/register", "gate-entry/[id], gate-pass/[id]"],
      ["Accounts", "/accounts/invoice (local, piece), payments, journal, bill, debit-note", "bills-register, supplier-bills, party-ledger, hsn-gst, tally-export", "invoice/[id], payments/[id]"],
      ["Costing", "/costing/cost-sheet, budget, input, expenses, piece-rate", "/costing/budget-vs-actual, daily-pnl", "cost-sheet/[id], budget/[id], expenses/[id]"],
      ["HR", "/hr/employees, attendance, wages, wage-payments, payroll, shifts", "/hr/operator-statement, payroll", "/hr/payroll/[id]"],
      ["Quality", "/quality/lab-tests, parameters, lot-approval, reprocess-approval, non-return-dc", "—", "lab-tests/[id]"],
      ["Approvals", "/approvals", "/approvals/audit", "—"],
      ["Reports", "/reports, /reports/packs, /reports/mis", "/reports/[slug], /registers/daily-in-out", "—"],
      ["Masters & Admin", "/masters, /admin/company, users, menu-rights, options, settings", "/admin/audit", "masters/[entity]"],
    ],
  }},

  { h1: "12. Appendix B — Document Number Prefixes" },
  { p: "Numbers are fiscal-year scoped and gap-free. Leaving the number field blank on any form lets the numbering service assign the next value; explicit values are honored with collision protection. The prefixes a tester will encounter:" },
  { table: {
    title: "Table 9: Document number prefixes",
    headers: ["Prefix", "Document", "Created At"],
    widths: [18, 46, 36],
    rows: [
      ["SO-", "Sales order", "/orders/new"],
      ["PGM-", "Production program", "/programs/new"],
      ["PO-", "Purchase order", "/procurement/po"],
      ["GRN-", "Goods receipt (purchase and process)", "/procurement/grn, /jobwork/receipt"],
      ["JW-", "Jobwork despatch challan (out)", "/jobwork/order"],
      ["CUT-", "Cut order", "/cutting/job-order"],
      ["LI-", "Line issue", "/production/issue"],
      ["REJ-", "Rejection entry", "/pieces/rejection"],
      ["DC-", "Piece despatch challan", "/pieces/despatch"],
      ["PL-", "Packing list", "/pieces/packing-list"],
      ["INV-", "Sales invoice", "/accounts/invoice"],
      ["DN-", "Debit note", "/accounts/debit-note"],
      ["SB-", "Supplier bill", "/accounts/bill"],
      ["V-", "Journal voucher (including wage and receipt companions)", "/accounts/journal, services"],
      ["RCP- / PYT-", "Payment receipt / payment voucher", "/accounts/payments"],
      ["PR-", "Payroll run", "/hr/payroll"],
      ["CC-", "Cost component (master)", "/masters"],
    ],
  }},

  { h1: "13. Appendix C — Print Documents" },
  { p: "Every document view exposes a print link that renders a dedicated print sheet at /print/[docType]/[id]. The mapped families on this build are: order, invoice, debit-note, payment, journal, purchase-order (po), grn, cost-sheet, budget, expense, cut-order, production-entry, line-issue, pcs-despatch, packing-list, rejection, gate-entry, gate-pass, jobwork dc, lab-test, sample, and payslip (payroll). Print acceptance during the walkthrough: the sheet renders with company header, document number, amount-in-words on money documents, and a barcode/QR where applicable; the browser print dialog produces a clean single document." },

  { h1: "14. Appendix D — Post-Change Regression Checklist" },
  { p: "Run this checklist after any code change before re-running the full manual suite. It is the minimum bar the project itself uses between milestones, and takes roughly ten minutes." },
  { steps: [
    "npx vitest run — 1420+ tests green (the count only grows).",
    "npx tsc --noEmit — zero errors under src/.",
    "bash scripts/context_check.sh — NO DRIFT.",
    "node scripts/eval_routing.mjs --static — PASS.",
    "Boot npm run dev; log in; hit the module landing routes (Table 2) — all 200.",
    "Spot-check one register CSV and one print sheet.",
    "Ask the agent one read question and one what's-next question — both answer correctly.",
  ]},

  // ================= SECTION 15 — APPENDIX E (side_quest merge regression) =================
  { h1: "15. Appendix E — side_quest Merge Regression Suite" },
  { p: "The M47 merge unified two independently developed lines: the side_quest branch (fiscal-year single-source hotfix, wage reconciliation, payroll run with payslips) and main's own costing-depth milestone. This appendix is the merge-regression suite for that integration. Each case reproduces the original defect scenario, confirms the fix behaves as shipped, and confirms the surrounding happy path still works after the merge. Run it after Sections 4-6 — it reuses their conventions (the MT- number prefix, the zero-residue rule, the seeded fixture) — and treat any failure here as a merge regression first: these same behaviors were green on both parent lines before the merge commit." },
  { p: "Sequencing and residue: the four groups are independent and can run in any order, except R-PR-02 which needs the run created in R-PR-01, and R-WG-03 which is cleanest before the payroll group so wage bills and payroll journals stay distinguishable. The read-only probes (R-WG-02, R-WG-04, R-CS-03, R-CS-04) are safe on seeded data. Cases that create documents leave the same greppable MT- residue as the rest of the suite; revert created documents through their own view before sign-off." },
  { h2: "15.1 Fiscal-Year Single Source (M44-FY — the 2027 time bomb)" },
  { p: "The original defect: roughly 24 posting services hardcoded the literal 26-27, so on 2027-04-01 every new document would silently stamp the wrong financial year. The fix moved the decision to exactly one place — the ACTIVE FinYear row at /admin/company, with an IST-date-derived fallback when no row is active. Three behaviors must hold: the default follows the active row, the rollover is a data-only operation, and an explicit finYear argument still wins for historical documents. Note that document number series do not reset per fiscal year (deliberately out of scope); the year under test is the document's Fin Year field." },
  { tcTable: [
    ["R-FY-01", "At /costing/expenses create an expense with the number field left blank; commit it and open the created view.", "The document commits gap-free with the auto-assigned number, and the Fin Year field on the view reads 26-27 — matching the ACTIVE row at /admin/company, never a frozen literal. (Original bug: the year was baked into about 24 posting services and would have frozen every new document at 26-27 past 2027-04-01.)"],
    ["R-FY-02", "Rollover drill, ideally on a copy of the database: at /admin/company create FinYear 27-28 and mark it ACTIVE; create one more MT- expense; then re-activate 26-27, cancel or delete the drill expense, and remove the 27-28 row if the UI allows (an inactive leftover row is harmless).", "While 27-28 is active, the new expense's Fin Year reads 27-28 with zero code changes anywhere; after re-activation the next document reads 26-27 again. This data-only procedure is the entire rollover the owner performs in 2027 — it is also the drill Section 9 recommends rehearsing before the real date."],
    ["R-FY-03", "Agent door: ask the agent to create an expense with an explicit fin year of 27-28; approve the plan card; then create a second expense without stating a year. Compare the two documents' Fin Year fields.", "The explicit-args document reads 27-28 (historical documents stay pinned to their stated year); the default document reads the active 26-27. Explicit arguments win; the default follows the row."],
  ]},
  { h2: "15.2 Wage Reconciliation (M45 — loop closure and the ledger double-count)" },
  { p: "Two original defects shape this group. First, operators had no statement: production earnings, advances, and wage payments could not be reconciled per operator because employees were not linked to parties. The fix is the 1:1 employee-party link — a party of the same code is auto-created and linked on first save — plus the operator statement at /hr/operator-statement. Second, the party ledger double-counted every receipt: companion cash-voucher journals were subtracted in the journals term while the payment legs subtracted the same cash again, overstating outflows twofold. The fix restricts the journals term to journal and contra voucher types." },
  { tcTable: [
    ["R-WG-01", "At /hr/employees create a new employee (leave the code blank for auto-assign, set a daily wage); save; check the party master for the same code; then re-save the employee once more.", "A party of the same code is auto-created and linked 1:1 on first save; the second save does not duplicate it (idempotent). The new operator's statement row shows zero activity honestly rather than an error or a missing row."],
    ["R-WG-02", "Open /hr/operator-statement and pick an operator with production history (E001 on the seed); note earned, paid, and owed for the default all-time window.", "owed equals earned minus paid exactly (each leg windowed on its own dates); the figures agree with the wages register for the same operator, and the CSV export matches the on-screen row."],
    ["R-WG-03", "Create a production bill restricted to one operator at /accounts/production-bills; commit it; open the party ledger for that operator's linked party.", "The wage journal carries the party linkage (per-operator bills hit the ledger); the bill amount appears once in the ledger's journal term, and the operator statement reflects the new earned total."],
    ["R-WG-04", "Open /accounts/party-ledger filtered to CUS001 (a customer with many receipts on the seed).", "The closing receivable is a plausible positive figure (about ₹43 lakh at verification time). A regression of the double-count shows immediately as a nonsensical negative of crore scale (the original defect computed about −₹3.4 crore for this party); receipts carrying companion JV cash vouchers count once, in the payment term only."],
  ]},
  { h2: "15.3 Payroll Run and Payslip (M46)" },
  { p: "The payroll module is new surface, so regression here means verifying the invariants it shipped with rather than an older bug: the draft-then-commit lifecycle, per-line wage journals that close the employee-party ledger to exactly zero once the net is paid, the payslip-as-payment-instrument rule (committed runs only, sensitive identifiers masked), and the piece-mode double-credit guard. These invariants are pinned by the payroll pipeline tests; this group walks them through the UI doors." },
  { tcTable: [
    ["R-PR-01", "At /hr/payroll create a DAILY run over a short window covered by seeded attendance; open the run view before committing.", "Lines list days as present counting 1 and half counting 0.5, earned as days × dailyWage, advances as windowed out-payments to the linked party, and net as earned minus advances; employees with zero wages are named in the response rather than silently dropped; the run is DRAFT and no journal exists yet."],
    ["R-PR-02", "Commit the R-PR-01 run; inspect the journals audit table on the run view; pay one line's net at /hr/wage-payments; reopen the operator statement and that operator's party ledger.", "Exactly one journal per line, carrying the party link, debiting Production Wages or Staff Salaries and crediting Wage Payable at the FULL earned amount; after the net is paid, that operator's owed and the party ledger both close to exactly zero — the wage loop closes."],
    ["R-PR-03", "Open the payslip print link on a committed line; then attempt a payslip for a DRAFT run (or a bogus PR number) by URL.", "The committed payslip prints NET PAYABLE, the amount in words, the pay-to block, and masked UAN and aadhaar (XXXX-XXXX with the last four digits); the draft or unknown payslip returns not-found — a payslip is a payment instrument, committed runs only."],
    ["R-PR-04", "Attempt a PIECE-mode run whose window overlaps an already-COMMITTED piece run.", "Planning is refused with a double-credit error naming the overlapping committed run; no new run is created. (Production-bill overlap is undetectable by design and the plan card says so honestly — that softer refusal is expected, not a defect.)"],
    ["R-PR-05", "Edit an employee at /hr/employees: set designation, joining date, bank name, IFSC, and UPI; save and reopen; print any committed payslip for that employee.", "The payout fields round-trip through the form and appear in the payslip's pay-to block; UAN and aadhaar remain masked on print — the full values never leave the master surfaces."],
  ]},
  { h2: "15.4 Costing Depth (M44 main-line — the other half of the merge)" },
  { p: "Main's own M44 milestone shipped inside the same merge and carries the same regression risk. Its known original defect: the cost-component master's edit path failed live — the code field was missing from the edit sheet, so updates died with a required-code banner and the category snapped back — caught by the browser gate and fixed with the code-field rule. Beyond that, the milestone's invariants need re-confirmation after the merge: the cost sheet calculator (computed line totals, per-piece cost, stored margin), the order est-vs-actual read model, and the daily P&L material leg." },
  { tcTable: [
    ["R-CS-01", "From the /masters hub open the cost-component master; create a component (category packing, any rate); then EDIT it through the sheet — change the category and save.", "Create auto-assigns the CC-#### code; the edit sheet shows the code as an input and the category persists across saves. (Original defect: the code field was missing from the edit form — saves failed with a code-required banner and the category reset to other.)"],
    ["R-CS-02", "At /costing/cost-sheet create a sheet for a style with a BOM; let it seed lines, or add a component line of 5,000 units at ₹2.5; set a selling price of ₹4 per piece; open the view.", "Head totals derive from the lines, and the per-piece cost and margin percent are computed and stored (the worked example: a ₹12,500 packing head, ₹2.5 per piece, 37.5% margin at ₹4 selling). A legacy sheet without lines still renders unchanged."],
    ["R-CS-03", "Open an order with production and jobwork history on the Order Hub; then ask the agent for the cost of that same order.", "The est-vs-actual section shows CM from production entries (rework excluded), process from jobwork values, and fabric and trim at WAC — a dash on heads that are not derivable, and the whole section stays silent when nothing is derivable; the agent answers from the same service with the same numbers."],
    ["R-CS-04", "Open /costing/daily-pnl for a date with activity.", "The Material (period, WAC) row values consumption at bucket WAC — never the leg rate — and the net margin is the four-term formula: produced minus wages minus expenses minus material."],
  ]},
  { p: "Failure triage: a red case in group 15.1 or 15.2 means a side_quest fix regressed in the merge; a red case in group 15.4 means main's costing milestone regressed; all of them were green on their respective parent lines, so the merge commit (0da083e) is the first place to look. Every case in this appendix has an automated twin in the pipeline suite (fy-hotfix-m44, payroll-l01, payroll-l02, payroll-l03, payroll-l04, accounts-m01, accounts-m02, cst-batch8, and the party-ledger cases): if a manual case fails while its pipeline twin passes, suspect the UI wiring rather than the service, and file the defect with the case ID, the route, and the console output." },
];
