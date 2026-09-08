#!/usr/bin/env python3
"""MANUAL-TESTING v1.9 — the M55 (L-06) docs-round twin patch.

Adds the HR-12..14 shift-wages cases, rewrites the §7 verification table for
the 2026-09-08 round (commit 68c5034), bumps the version/build lines
(markdown twin + docx cover), updates the sign-off checklist + the Appendix-E
pipeline-twin list (+ hr-l06), and refreshes Table 1's stale gate numbers.
After this: node scripts/mt-to-markdown.js && node scripts/gen_manual_testing_docx.js
"""
def patch(path, old, new, label):
    text = open(path).read()
    if new in text:
        print(f'  SKIP {path}: {label} (already applied)')
        return
    assert old in text, f'{path}: NOT FOUND: {label}'
    assert text.count(old) == 1, f'{path}: NON-UNIQUE: {label}'
    open(path, 'w').write(text.replace(old, new))
    print(f'  patched {path}: {label}')

A = 'scripts/mt-content-a.js'
C = 'scripts/mt-content-c.js'

# ── 1. the HR-12..14 cases (after HR-11) ─────────────────────────────
patch(A,
  '''and its plan text NAGS that the window carries OT-able hours — legacy nets never silently change. After reverting, no rows remain for the test run."],''',
  '''and its plan text NAGS that the window carries OT-able hours — legacy nets never silently change. After reverting, no rows remain for the test run."],
    ["HR-12", "The shift-wages register (M55, the legacy FrmProdShiftWagesReg port): open /hr/shift-wages; set From/To over a day with production; filter Order with a real order (e.g. SO-1001); type a dept code into the Dept filter; download the CSV; ask the agent 'show me the shift wages register'.", "The register groups by SHIFT × DATE: rows carry Date, Shift code+name, Orders/Operators/Entries counts, Qty (piece only), Piece wages (Σ amount), Shift wages (Σ the posted shift-level wage), and Total bill (their sum); the totals band adds Piece wages + Shift wages + Total bill; entries without a shift land in an explicit 'unassigned' row (code '—') — never a fabricated shift. The CSV mirrors the columns (same service, same filters). The agent's get_shift_wages returns the same rows as json. The 'How to read this register' card states the no-double-count doctrine: piece wages ride production cost, shift wages are the separate budget addend."],
    ["HR-13", "THE WAGE DOOR + THE BUDGET ADDEND (M55): ask the agent to 'post shift wages for {order}, dept D4, shift {code}, date today, amount 400'; read the plan card; approve; open /hr/shift-wages?order={order} and /costing/budget-vs-actual?order={order}; then ask the agent 'budget vs actual for {order}' and revert the row (delete it via the agent or DB).", "The plan card reads 'Proposed shift wage booking: ₹400 for shift {name} [{code}] on {date}, order {order}, dept D4. No GL leg at this door — the wage journal rides the payroll / wage-bill flow' with side effects 'Order actual gains the shift-wage addend', 'Shift × date row appears in the shift-wages register', 'No stock move (qty 0) · no operator earnings'. After commit the register shows the ₹400 Shift wages cell; the budget screen's actual = PO + production + expenses + 400 (the summary line and the plan text both name the four-way split); the get_budget_vs_actual json carries actual.shiftWages. DB truth: the row is qty 0 / amount 0 / shiftWages 400 / operator null — piece payroll and every qty aggregate are untouched. After reverting, the register and budget lose the addend exactly."],
    ["HR-14", "THE ATTRIBUTION DOOR + the honesty doors (M55): open /production/entry and note the new Shift picker; post a production entry picking a shift (a real order, D4, an operator, bundle MT-M55-1, qty 10 rate 10, the Shift picked); review the plan; try the same with shift code 'NOPE' via the agent; then revert the entry and its ledger row.", "The plan summary ends '| shift {code}' and the side effects include 'Entry attributed to shift {code} (the shift-wages register)'; after commit the entry row carries shiftId (the register's shift-day row gains the qty + piece wages); the DB row keeps amount = qty × rate (piece semantics unchanged). The unknown-shift agent call is REFUSED loudly ('Shift NOPE not found (create it in the Shift master first)') — no row, no silent drop; a piece entry without the picker lands 'unassigned' (never a fabricated shift). After revert, zero residue."],''',
  'HR-12..14 cases')

# ── 2. Table 1 freshness (the generic gates table) ───────────────────
patch(A,
  'They were last verified on 2026-09-06 against the merged main branch (commit 60a87bc, which contains the complete side_quest merge: the FY single-source hotfix, wage reconciliation, and the payroll module).',
  'They were last verified on 2026-09-08 on main (commit 68c5034, the M55 shift-wages batch — the last item of the Phase-6B remediation queues; every Module M and Module L batch is on main).',
  'Table 1 date')
patch(A,
  '"70 files, 1420 tests, all passed"',
  '"78 files, 1618 tests, all passed"',
  'Table 1 vitest row')

# ── 3. the §7 verification round paragraph + Table 5 rows ────────────
patch(C,
  '{ p: "The verification round performed on 2026-09-07 on main (commit 84ddfdf — the M54 expense-heads batch, Module M Batch 5 and the LAST Module M item: the legacy FrmMasExpenses master ported as ExpenseHead {code EXH-####, name the natural key, category, glAccount preference, active} riding the M2 engine (masters 43→44, models 91→92) with create/update factory tools + the list_expense_heads door (tools 266→269); THE HEAD REFINES, NEVER BLOCKS on the expense door — the head sets category (overriding a passed one) + the default GL debit leg with precedence explicit glAccount > head.glAccount > the M51 category default, a stale head account falling back with an honest note, unknown/inactive heads refusing loudly; and budget-vs-actual FINALLY includes expenses — expenseSpend = Σ non-cancelled Expense.amount per order joins PO + production in the actual, on the register, the config column, and the get_budget_vs_actual json) covered the automated gates in full and the live route surface by direct request. Every gate below ran on the M54 tree (the M50/M51/M52/M53/M54 batches are on main — the Module M queue is now EMPTY). Results are summarized below; manual execution of Sections 4-6 by a human tester remains the open work this guide enables." },',
  '{ p: "The verification round performed on 2026-09-08 on main (commit 68c5034 — the M55 shift-wages batch, Module L Batch 6 and the LAST Module L item: the dead shiftWages column FINALLY has a writer — the legacy ProdShiftWages/post_shift_wages port as planShiftWages + the post_shift_wages docTool, wage-only rows qty 0 / amount 0 / shiftWages = the posted wage, operator-neutral, no stock move, no GL leg at the door; ADR-019-A resolves the frozen ProductionEntry⇄Shift decision — shiftId nullable FK + the shiftCode attribution on post_production_entry with unknown-shift refusals, landing on every production-family form via the mirror rule; the budget-vs-actual shift-wage addend REINTRODUCED with the HFX-12 Σ amount stand-in retired; production-status Wages + daily-unit-pnl + operation-summary read the honest total bill; and the FrmProdShiftWagesReg port — /hr/shift-wages, the shift × day register with the unassigned bucket, csv, and the get_shift_wages tool (tools 269→271, menu 147→148, routes 183→184, registry 263)) covered the automated gates in full and the live route surface by direct request. Every gate below ran on the M55 tree (the M50-M54 Module M batches AND the L-01..L-06 Module L batches are on main — the Phase-6B remediation §13 queues are now ALL EMPTY; what remains is owner-decision territory §17-1..§17-4 only). Results are summarized below; manual execution of Sections 4-6 by a human tester remains the open work this guide enables." },',
  'S7 round paragraph')
patch(C, 'title: "Table 5: Verification results, 2026-09-07 round"', 'title: "Table 5: Verification results, 2026-09-08 round"', 'Table 5 title')
patch(C,
  '"77 files, 1599 tests passed (includes industry-chain, payroll L01/L02/L03/L04, accounts M-01 + M-02 + M-03 + M-04 + M-05, FY hotfix, parity suites)"',
  '"78 files, 1618 tests passed (includes industry-chain, payroll L01/L02/L03/L04, accounts M-01 + M-02 + M-03 + M-04 + M-05, HR L-06 hr-l06, FY hotfix, parity suites)"',
  'S7 vitest row')
patch(C,
  '"context_check.sh: 606/606 checks, NO DRIFT (the m54 PROMPT_VERSION pin; tools 269, masters 44, models 92, menu 147, routes 183, register configs 35, register services 47)"',
  '"context_check.sh: 606/606 checks, NO DRIFT (the m55 PROMPT_VERSION pin; tools 271, masters 44, models 92, menu 148, routes 184, register configs 36, register services 48)"',
  'S7 context row')
patch(C,
  '"eval_routing.mjs --static PASS (m54-2026-09-07, registry 261)"',
  '"eval_routing.mjs --static PASS (m55-2026-09-08, registry 263)"',
  'S7 eval row')
patch(C,
  '"route_smoke_m54.sh: 24/24 — /masters/expense-head renders (form labels + the EXH-#### auto-code hint + the never-blocks GL hint) · the expense book (the Head picker + the category hint + the not-required hint) · /costing/budget-vs-actual (the Expenses column) · the crafted walkthrough (head transport+5020 + a stylewise expense 750 + the companion): the master row renders, the book resolves headName, the view shows the Head field, the budget row carries the addend 750 · the 404 + unknown-q doors · FULL REVERT (zero residue); route_smoke_m48..m53 re-basis covered by the shared services"',
  '"route_smoke_m55.sh: 26/26 — /hr/shift-wages renders (the column labels Piece wages / Shift wages / Total bill + the doctrine note + the unassigned honesty + the post_shift_wages door name) · the CSV export (content-type + header) · /production/entry (the Shift picker) · the crafted walkthrough (shift + order + piece 1000 + unattributed 500 + wage 500): the register shows the shift-day row (piece 1,000 · shift 500 · bill 1,500) AND the unassigned row, the budget row carries the addend, the csv mirrors · the unknown-order/unknown-dept honesty doors · FULL REVERT (zero residue); route_smoke_m48..m54 re-basis covered by the shared services"',
  'S7 smoke row')
patch(C,
  '"The masters form door: head created at /masters/expense-head (\'Browser E2E Head M54\', EXH-0001, transport + 5020 — the category select needed a native change-event dispatch, fixed via the edit door) → the expense form: the Head picker EXH-0001 + amount 500 + category LEFT EMPTY (the head drives it) → the plan card \'Proposed expense EXP-0001 — ₹500 (transport · head Browser E2E Head M54)\' + \'GL legs classify to Dr Freight [5020] / Cr Cash/Bank [1010] (SPEC-M51 M-02; the head\'s account)\' → Approve & commit → DB-verified (category transport + headId EXH-0001; JV-EXP-0001 Dr Freight [5020] / Cr Cash/Bank; the narration carries the head) → the book row + the view HEAD field → console clean on isolated reloads (the one hydration warning traced to the login redirect, pre-existing) → fully reverted (residue 0,0,0; screenshots m54-expense-head-master / m54-expense-plan-head / m54-expense-view-head)"',
  '"BOTH doors: (1) the shift master form door: shift \'M55E2E / M55 E2E Shift\' created at /masters/shift (renders in the table) → the production form door: order SO-1001 + D4 + bundle M55E2E-B1 + operator E001 + qty 10 rate 10 + the NEW Shift picker → the plan card \'Post production | … | ₹100 | shift M55E2E\' + side effect \'Entry attributed to shift M55E2E (the shift-wages register)\' → Approve & commit → DB-verified (qty 10 / amount 100 / shiftId → M55E2E) ; (2) the agent chat door: \'post shift wages\' → routed to post_shift_wages → the plan card with the full doctrine (\'No GL leg at this door — the wage journal rides the payroll / wage-bill flow\') → Approve & Commit → DB-verified (qty 0 / amount 0 / shiftWages 400 / operator null) → /hr/shift-wages?order=SO-1001 shows \'₹43,200 piece + ₹400 shift = ₹43,600 bill\' + the M55E2E row → /costing/budget-vs-actual?order=SO-1001 actual ₹17,23,600 = PO 16,80,000 + production 43,200 + shift 400 → fully reverted (entry + ledger + wage row + shift deleted, residue 0; screenshot m55-shift-wages-register)"',
  'S7 E2E row')
patch(C,
  '"Working tree clean; main carries M50/M51/M52/M53 (the batch pushes ride the PAT protocol — inline URL, token audit before/after, ls-remote verify); side_quest fully merged (0 unmerged commits); the M54 batch (SPEC + feat) commits pending the next PAT push"',
  '"Working tree clean; remote main == 49b6eda (the M54 batch + the m54-push worklog entry ARE on the remote — the m54-push session caught the phantom-deleted upload route inside the docs commit BEFORE push and amended it to docs-only; token audited before/after); the M55 batch (SPEC 21ac205 + feat 68c5034) commits pending the next PAT push"',
  'S7 git row')

# ── 4. the sign-off section ──────────────────────────────────────────
patch(C,
  '{ p: "Verdict for the 2026-09-06 verification round: PASS.',
  '{ p: "Verdict for the 2026-09-08 verification round: PASS.',
  'verdict date')
patch(C, '"PASS (2026-09-06)"', '"PASS (2026-09-08)"', 'sign-off gate row')
patch(C,
  'the M49 attendance-depth cases HR-09 through HR-11; AC now includes',
  'the M49 attendance-depth cases HR-09 through HR-11 and the M55 shift-wages cases HR-12 through HR-14; AC now includes',
  'sign-off case list')

# ── 5. the Appendix-E pipeline-twin list ─────────────────────────────
patch(C,
  '(fy-hotfix-m44, payroll-l01, payroll-l02, payroll-l03, payroll-l04, accounts-m01, accounts-m02, accounts-m03, accounts-m04, accounts-m05, cst-batch8, and the party-ledger cases)',
  '(fy-hotfix-m44, payroll-l01, payroll-l02, payroll-l03, payroll-l04, accounts-m01, accounts-m02, accounts-m03, accounts-m04, accounts-m05, hr-l06, cst-batch8, and the party-ledger cases)',
  'twin list')

print('ALL PATCHES APPLIED')
