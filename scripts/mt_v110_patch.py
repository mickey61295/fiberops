#!/usr/bin/env python3
"""MANUAL-TESTING v1.10 — the M56 (PAY-08 cheque/PDC lifecycle) docs-round
twin patch.

Adds the AC-25..28 cheque-lifecycle cases, rewrites the §7 verification
table for the 2026-09-08 round (commit 359ae5e), bumps the version/build
lines (markdown twin + docx cover), updates the sign-off checklist + the
Appendix-E pipeline-twin list (+ pay-pdc), and refreshes Table 1's stale
gate numbers. After this: node scripts/mt-to-markdown.js && node
scripts/gen_manual_testing_docx.js
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

# ── 1. the AC-25..28 cases (after AC-24) ─────────────────────────────
patch(A,
  '''and the text names the three-way split."],''',
  '''and the text names the three-way split."],
    ["AC-25", "THE PDC REGISTER (M56): open /accounts/pdc; filter Party with a real party code, Direction with 'Receipts'; set the Cheque date From/To around a known cheque; download the CSV; ask the agent 'show me the cheques still out in the field'.", "The register lists one row per ISSUED cheque: Voucher No (RCP-/PMT-), Dir, Party, Amount, Cheque No, Cheque Date, Type (PDC when the cheque date is after the voucher date, else cheque, '—' when undated), and Due (due in N d / DUE TODAY / OVERDUE N d — aging off the CHEQUE date, not the voucher date). The totals band carries Cheques + Amount + Overdue, and the summary names the post-dated count. The CSV mirrors the columns (same service, same filters). The agent's get_pdc_register returns the same rows as json. The 'How to read this register' card states the doctrine: the GL bank leg posted at voucher time, clears leave, bounces reverse via CN-; pre-M56 cheques never appear (their journey was untracked)."],
    ["AC-26", "THE ISSUE DOOR (M56): at /accounts/payments post a receipt with Mode=Cheque, Reference CHQ-M56-QA, and the Cheque Date set to a FUTURE date; read the plan card; approve; open the payment view and /accounts/pdc; then post a second payment with Mode=Bank but a Cheque Date filled and read that plan card's side effects.", "The plan card reads 'Cheque CHQ-M56-QA issued — POST-DATED, due {date}; it appears in the PDC register until cleared or bounced' with side effects 'Cheque CHQ-M56-QA starts its journey: ISSUED (appears in the /accounts/pdc PDC register until cleared or bounced)' and 'POST-DATED — due {date}'. After commit the DB row carries chequeStatus='issued' + the cheque date; the payment view shows 'cheque CHQ-M56-QA: issued — in the field (see /accounts/pdc)'; the register shows the row with the PDC badge. The bank-mode plan card NAMES the ignored date ('chequeDate {date} IGNORED — mode is 'bank' (no cheque journey; pass mode=cheque to start one)') and the committed row keeps chequeStatus null — never a silent drop."],
    ["AC-27", "THE CLEAR DOOR + the refusal doors (M56): ask the agent 'clear cheque {RCP-####} — the bank confirmed it today'; read the plan card; approve; then try to clear it again; try clearing a bank-mode payment's voucher.", "The plan card reads 'Proposed CLEARING of cheque {ref} ({voucher}, ₹N, dated {date}) — bank confirmation on {date}. Physical confirmation only: the GL bank leg posted at voucher time, so NO journal moves.' with side effects 'NO journal: the bank GL leg posted at voucher time (the M51 doctrine)' and 'the cheque leaves the /accounts/pdc register'. After commit the DB row reads chequeStatus='cleared' + clearedAt, the payment stays ACTIVE, and NO CN- contra exists; the register loses the row. The second clear is REFUSED loudly ('already CLEARED (bank confirmed {date})'); a bank-mode voucher is REFUSED ('the cheque lifecycle applies only to cheque-mode vouchers') — no silent transitions."],
    ["AC-28", "THE BOUNCE DOOR + THE REMIT-TO STRIP (M56): post a cheque receipt against an open invoice (so it allocates); ask the agent 'bounce cheque {RCP-####} — insufficient funds'; read the plan card; approve; check the invoice status and the register. Then put an active row in /masters/bank-account (with its Bank) and print any invoice.", "The bounce plan card reads 'Proposed BOUNCE of cheque {ref} … contra CN-{voucher} mirrors the legs and the cheque is stamped bounced' with side effects 'allocations reverse — invoice/bill statuses re-derive' and 'The party's outstanding RE-OPENS — the money never arrived'. After commit: the payment is cancelled + chequeStatus='bounced', the CN- contra exists with the narration 'Contra: cheque BOUNCED {voucher} — insufficient funds', the allocation rows carry reversedAt, the invoice status re-derives (paid → issued/partial), and the register loses the row. The invoice print's Bank Details & Remittance strip reads the ACTIVE BankAccount MASTER (bank name, A/c, IFSC — alone, never mixed with the print.* options); with no active master row it falls back to the static print options."],''',
  'AC-25..28 cases')

# ── 2. Table 1 freshness (the generic gates table) ───────────────────
patch(A,
  'They were last verified on 2026-09-08 on main (commit 68c5034, the M55 shift-wages batch — the last item of the Phase-6B remediation queues; every Module M and Module L batch is on main).',
  'They were last verified on 2026-09-08 on main (commit 359ae5e, the M56 cheque/PDC lifecycle batch — the §17-3 resolution; the remediation queues are empty and the owner decisions §17-2/§17-4 are recorded, only §17-1 backup target remains open).',
  'Table 1 date')
patch(A,
  '"78 files, 1618 tests, all passed"',
  '"79 files, 1636 tests, all passed"',
  'Table 1 vitest row')

# ── 3. the §7 verification round paragraph + Table 5 rows ────────────
patch(C,
  '{ p: "The verification round performed on 2026-09-08 on main (commit 68c5034 — the M55 shift-wages batch, Module L Batch 6 and the LAST Module L item: the dead shiftWages column FINALLY has a writer — the legacy ProdShiftWages/post_shift_wages port as planShiftWages + the post_shift_wages docTool, wage-only rows qty 0 / amount 0 / shiftWages = the posted wage, operator-neutral, no stock move, no GL leg at the door; ADR-019-A resolves the frozen ProductionEntry⇄Shift decision — shiftId nullable FK + the shiftCode attribution on post_production_entry with unknown-shift refusals, landing on every production-family form via the mirror rule; the budget-vs-actual shift-wage addend REINTRODUCED with the HFX-12 Σ amount stand-in retired; production-status Wages + daily-unit-pnl + operation-summary read the honest total bill; and the FrmProdShiftWagesReg port — /hr/shift-wages, the shift × day register with the unassigned bucket, csv, and the get_shift_wages tool (tools 269→271, menu 147→148, routes 183→184, registry 263)) covered the automated gates in full and the live route surface by direct request. Every gate below ran on the M55 tree (the M50-M54 Module M batches AND the L-01..L-06 Module L batches are on main — the Phase-6B remediation §13 queues are now ALL EMPTY; what remains is owner-decision territory §17-1..§17-4 only). Results are summarized below; manual execution of Sections 4-6 by a human tester remains the open work this guide enables." },',
  '{ p: "The verification round performed on 2026-09-08 on main (commit 359ae5e — the M56 cheque/PDC lifecycle batch, Money Batch 7 and the §17-3 ADR-020 resolution: chequeStatus is a PHYSICAL layer on Payment (null|issued|cleared|bounced, cheque-mode only) — the payment door stamps issued (the POST-DATED plan line for future cheque dates; a date on a non-cheque mode is NAMED as ignored); post_cheque_clear = the bank confirmation stamp, NO journal (the M51 bank-leg doctrine); post_cheque_bounce = the M40 CN- cancel machinery refactored into buildPaymentCancelPlan + the bounced stamp in one transaction (allocations reverse, invoice/bill statuses re-derive); the PDC register /accounts/pdc — issued cheques with the PDC badge, aging off the cheque date, csv, get_pdc_register (tools 271→274, menu 148→149, routes 184→185, registry 266); and getPrintHeader prefers the ACTIVE BankAccount master for the print remit-to, AppOptions the fallback) covered the automated gates in full and the live route surface by direct request. Every gate below ran on the M56 tree (the Phase-6B remediation queues are ALL EMPTY; §17-2 is an ERRATUM — resolved since M39; §17-3 resolved by ADR-020; §17-4 resolved by ADR-021 — Tally stays JSON; only §17-1 backup target remains open, owner infra). Results are summarized below; manual execution of Sections 4-6 by a human tester remains the open work this guide enables." },',
  'S7 round paragraph')
patch(C,
  '"78 files, 1618 tests passed (includes industry-chain, payroll L01/L02/L03/L04, accounts M-01 + M-02 + M-03 + M-04 + M-05, HR L-06 hr-l06, FY hotfix, parity suites)"',
  '"79 files, 1636 tests passed (includes industry-chain, payroll L01/L02/L03/L04, accounts M-01 + M-02 + M-03 + M-04 + M-05, HR L-06 hr-l06, Money M56 pay-pdc, FY hotfix, parity suites)"',
  'S7 vitest row')
patch(C,
  '"context_check.sh: 606/606 checks, NO DRIFT (the m55 PROMPT_VERSION pin; tools 271, masters 44, models 92, menu 148, routes 184, register configs 36, register services 48)"',
  '"context_check.sh: 606/606 checks, NO DRIFT (the m56 PROMPT_VERSION pin; tools 274, masters 44, models 92, menu 149, routes 185, register configs 37, register services 48)"',
  'S7 context row')
patch(C,
  '"eval_routing.mjs --static PASS (m55-2026-09-08, registry 263)"',
  '"eval_routing.mjs --static PASS (m56-2026-09-08, registry 266)"',
  'S7 eval row')
patch(C,
  '"route_smoke_m55.sh: 26/26 — /hr/shift-wages renders (the column labels Piece wages / Shift wages / Total bill + the doctrine note + the unassigned honesty + the post_shift_wages door name) · the CSV export (content-type + header) · /production/entry (the Shift picker) · the crafted walkthrough (shift + order + piece 1000 + unattributed 500 + wage 500): the register shows the shift-day row (piece 1,000 · shift 500 · bill 1,500) AND the unassigned row, the budget row carries the addend, the csv mirrors · the unknown-order/unknown-dept honesty doors · FULL REVERT (zero residue); route_smoke_m48..m54 re-basis covered by the shared services"',
  '"route_smoke_m56.sh: 26/26 — /accounts/pdc renders (the column labels Cheque No / Cheque Date / Type / Due + the doctrine card with both door names + OVERDUE) · the CSV export (content-type + header) · /accounts/payments (the Cheque Date field) · the crafted walkthrough (party + invoice + an ISSUED post-dated cheque receipt ₹2,500): the register shows the row with the PDC badge + the due-in-N-d aging + the cheque no + the amount, the direction filter scopes, the CLEAR transition removes the row · the unknown-party honesty door · FULL REVERT (zero residue); route_smoke_m48..m55 re-basis covered by the shared services"',
  'S7 smoke row')
patch(C,
  '"BOTH doors: (1) the shift master form door: shift \'M55E2E / M55 E2E Shift\' created at /masters/shift (renders in the table) → the production form door: order SO-1001 + D4 + bundle M55E2E-B1 + operator E001 + qty 10 rate 10 + the NEW Shift picker → the plan card \'Post production | … | ₹100 | shift M55E2E\' + side effect \'Entry attributed to shift M55E2E (the shift-wages register)\' → Approve & commit → DB-verified (qty 10 / amount 100 / shiftId → M55E2E) ; (2) the agent chat door: \'post shift wages\' → routed to post_shift_wages → the plan card with the full doctrine (\'No GL leg at this door — the wage journal rides the payroll / wage-bill flow\') → Approve & Commit → DB-verified (qty 0 / amount 0 / shiftWages 400 / operator null) → /hr/shift-wages?order=SO-1001 shows \'₹43,200 piece + ₹400 shift = ₹43,600 bill\' + the M55E2E row → /costing/budget-vs-actual?order=SO-1001 actual ₹17,23,600 = PO 16,80,000 + production 43,200 + shift 400 → fully reverted (entry + ledger + wage row + shift deleted, residue 0; screenshot m55-shift-wages-register)"',
  '"BOTH doors: (1) the payment form door: at /accounts/payments post a receipt — party + ₹600 + Mode=Cheque + Reference CHQ-M56E2E-1 + the Cheque Date 2026-09-15 (native date setter) → the plan card \'Receipt RCP-0188 | … | cheque | on-account | ref CHQ-M56E2E-1 | cheque issued (PDC due 2026-09-15)\' + \'POST-DATED — due 2026-09-15 (the register ages off it)\' → Approve & commit → DB-verified (chequeStatus issued + chequeDate 2026-09-15 + JV- companion) → /accounts/pdc shows \'1 cheque in the field (1 post-dated) · ₹600 outstanding\' with the PDC badge ; (2) the agent chat door: \'clear cheque RCP-0188\' → routed to post_cheque_clear → the doctrine plan card (\'Physical confirmation only: the GL bank leg posted at voucher time, so NO journal moves\') → Approve & Commit → DB-verified (chequeStatus cleared + clearedAt 2026-09-08, payment ACTIVE, the CN- contra ABSENT) → the register reads \'0 cheques in the field\' → fully reverted (residue 0; screenshots m56-pdc-register + m56-e2e-both-doors-chat)"',
  'S7 E2E row')
patch(C,
  '"Working tree clean; remote main == 49b6eda (the M54 batch + the m54-push worklog entry ARE on the remote — the m54-push session caught the phantom-deleted upload route inside the docs commit BEFORE push and amended it to docs-only; token audited before/after); the M55 batch (SPEC 21ac205 + feat 68c5034) commits pending the next PAT push"',
  '"Working tree clean; remote main == 40e78e0 (the M55 batch + the m55 chore commit ARE on the remote — verified LIVE via anonymous ls-remote; the push completed ~07:32 UTC seconds before the prior session\'s context cutoff, only the closure worklog entry was missing — the m55-push session reconstructed the evidence); the M56 batch (SPEC 1e8b4d2 + feat 359ae5e) commits pending the next PAT push"',
  'S7 git row')

# ── 4. the sign-off section ──────────────────────────────────────────
patch(C,
  'and the M55 shift-wages cases HR-12 through HR-14; AC now includes the M50 chart-of-accounts cases AC-05 through AC-08, the M51 double-entry cases AC-09 through AC-12, the M52 final-accounts cases AC-13 through AC-16, the M53 Tally-both-sides cases AC-17 through AC-20, and the M54 expense-head cases AC-21 through AC-24)',
  'and the M55 shift-wages cases HR-12 through HR-14; AC now includes the M50 chart-of-accounts cases AC-05 through AC-08, the M51 double-entry cases AC-09 through AC-12, the M52 final-accounts cases AC-13 through AC-16, the M53 Tally-both-sides cases AC-17 through AC-20, the M54 expense-head cases AC-21 through AC-24, and the M56 cheque-lifecycle cases AC-25 through AC-28',
  'sign-off case list')

# ── 5. the Appendix-E pipeline-twin list ─────────────────────────────
patch(C,
  '(fy-hotfix-m44, payroll-l01, payroll-l02, payroll-l03, payroll-l04, accounts-m01, accounts-m02, accounts-m03, accounts-m04, accounts-m05, hr-l06, cst-batch8, and the party-ledger cases)',
  '(fy-hotfix-m44, payroll-l01, payroll-l02, payroll-l03, payroll-l04, accounts-m01, accounts-m02, accounts-m03, accounts-m04, accounts-m05, hr-l06, pay-pdc, cst-batch8, and the party-ledger cases)',
  'twin list')

# ── 6. the version lines (markdown twin + docx cover) ────────────────
patch('scripts/mt-to-markdown.js',
  'out.push("> Version 1.9 · 2026-09-08 · Build under test: `main @ 68c5034` (M55 shift wages — the LAST Module L item: the remediation §13 queues are now ALL EMPTY; v1.9 adds the shift-wages cases HR-12..14 — the FrmProdShiftWagesReg register port (shift × day bill, the unassigned bucket), THE WAGE DOOR + THE BUDGET ADDEND (post_shift_wages: wage-only rows beyond piece rate, the four-way actual), and THE ATTRIBUTION DOOR (the Shift picker on the production form, unknown-shift refusals)) · Environment: development (`http://localhost:3000`)")',
  'out.push("> Version 1.10 · 2026-09-08 · Build under test: `main @ 359ae5e` (M56 the cheque/PDC lifecycle — decision §17-3 RESOLVED (ADR-020): the remediation queues are empty and §17-2/§17-4 are recorded; v1.10 adds the cheque-lifecycle cases AC-25..28 — THE PDC REGISTER (/accounts/pdc: issued cheques, the PDC badge, aging off the cheque date), THE ISSUE DOOR (cheque-mode payments stamp issued + the POST-DATED plan line + the honest-nag), THE CLEAR DOOR (post_cheque_clear — the physical confirmation stamp, NO journal), and THE BOUNCE DOOR + THE REMIT-TO STRIP (post_cheque_bounce — the CN- reversal + allocations re-derive; the print strip prefers the BankAccount master)) · Environment: development (`http://localhost:3000`)")',
  'markdown version line')
patch('scripts/gen_manual_testing_docx.js',
  '"Version 1.9 — 2026-09-08",',
  '"Version 1.10 — 2026-09-08",',
  'docx cover version')

print('ALL PATCHES APPLIED')
