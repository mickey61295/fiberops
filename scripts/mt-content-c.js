/**
 * Manual Testing Guide — content module C (Sections 7-11 + appendices).
 */
module.exports = [

  // ================= SECTION 7 =================
  { h1: "7. Test Results Summary (Current Round)" },
  { p: "The verification round performed on 2026-09-06 on the merged main branch (commit 60a87bc) covered the automated gates in full and the live route surface by direct request. The side_quest branch work — the fiscal-year single-source hotfix, the wage reconciliation loop closure, and the payroll run with payslips — is fully merged into main and pushed to the remote; the branch contributes no unmerged commits. Results are summarized below; manual execution of Sections 4-6 by a human tester remains the open work this guide enables." },
  { table: {
    title: "Table 5: Verification results, 2026-09-06 round",
    headers: ["Check", "Result", "Detail"],
    widths: [30, 16, 54],
    rows: [
      ["Vitest suite", "PASS", "70 files, 1420 tests passed in 40.7s (includes industry-chain, payroll, FY hotfix, parity suites)"],
      ["TypeScript (src)", "PASS", "Zero errors under src/; known legacy errors confined to scripts/ cleanup files"],
      ["Context integrity", "PASS", "context_check.sh: 606/606 checks, NO DRIFT"],
      ["Agent routing (static)", "PASS", "eval_routing.mjs --static PASS"],
      ["Login (live)", "PASS", "admin@fiberpro.local authenticated via /api/auth/login; session payload correct"],
      ["Module routes (live)", "PASS", "All 17 module landing routes plus 40+ sub-routes returned HTTP 200"],
      ["CSV export (live)", "PASS", "/orders/register/csv returned a valid CSV stream"],
      ["Session API (live)", "PASS", "/api/auth/session returned the admin user with role and rights"],
      ["Git state", "PASS", "Working tree clean; local main identical to origin/main; side_quest fully merged (0 unmerged commits)"],
    ],
  }},
  { p: "The seeded database state at verification time: 209 orders, 190 sales invoices, 187 payments, 184 programs, 190 cut orders, 8 purchase orders, 6 jobwork orders, 26 parties, 10 employees, 1,183 stock ledger rows, financial year 26-27 active, zero payroll runs. The data is a residue of prior test rounds and seed fixtures; it is realistic for read-surface verification and does not interfere with the golden flow, which creates its own fresh chain." },

  // ================= SECTION 8 =================
  { h1: "8. Defect Analysis and Known Issues" },
  { p: "No new defects were found during this verification round. The single observation is a known, documented condition rather than a defect: legacy cleanup scripts under scripts/ reference retired Prisma models (bill, billPass) and therefore fail strict type checking. They are outside the src/ gate, are not part of the build, and are scheduled for archival in a future housekeeping change. No action is required for the manual suite." },
  { p: "Historical defects relevant to a tester's expectations, all fixed and pinned by regression tests: the fiscal-year 2027 time bomb (all numbering now derives from the active FinYear row — creating and activating 27-28 at /admin/company is the entire rollover procedure); the party-ledger double count (companion journals no longer double-subtract receipts); the payroll double-commit and draft-payslip guards; and the upload-route gremlin restored after the M44 sandbox incident. If any of these behaviors regress, the corresponding pipeline test (fy-hotfix, payroll-l01/l02, party-ledger cases) will fail before a manual tester reaches them." },

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
      ["Start-to-end walkthrough (Section 4)", "All case IDs AU/NA/OR/PR/PC/IV/CU/PD/JW/DP/DL/AC/CS/HR/QA/AP/RP/MS/AD/AG marked", "Pending"],
      ["Golden order flow (Section 5)", "GF-00 through GF-17 marked; net stock zero; invoice paid; ledger closed", "Pending"],
      ["Negative suite (Section 6)", "N-01 through N-10 marked; zero residue after each", "Pending"],
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
];
