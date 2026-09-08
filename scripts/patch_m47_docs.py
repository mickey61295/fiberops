#!/usr/bin/env python3
"""SPEC-M47 — STATE.md + PITFALLS.md doc updates (the milestone commit docs)."""
import pathlib

ROOT = pathlib.Path('/home/z/my-project')

STATE = ROOT / 'docs/CONTEXT/01-STATE.md'
text = STATE.read_text()

NEW_HEADER = """Last verified: 2026-09-08 (session: m47 — SPEC-M47 MODULE L BATCH 3: STATUTORY PAYROLL SHIPPED (L-03, zero deferrals): PF/ESI/PT/LWF configurable rates on the run, deductions computed + FROZEN at plan time, statutory registers + per-head challan CSV export. THE CONFIG: src/lib/erp/statutory.ts — the flags.ts pattern over AppOption keys stat:* (17 defs: 4 enabled switches + rates/thresholds; every head ships DISABLED — zero-config = M46-identical, pinned); owner surface /admin/statutory (masters-admin menu 'statutory-rates', role-guarded, server action → setStatutory registry drift-safe; getStatutoryPure = the INV-04 pure read planPayrollRun uses — never seeds inside a tx). THE MATH (planPayrollRun, frozen on the line): PF applies when the employee has a UAN — pfWages = min(earned, ceiling), ee 12% DEDUCTED, er 12% split EPS 8.33/EPF remainder + EDLI + admin (employer legs = register data, NOT posted); ESI when gross ≤ threshold (ee 0.75% deducted, er 3.25% register); PT single slab above threshold × distinct calendar months in window; LWF flat × months; statDeduction = pfEe+esiEe+pt+lwfEe; net = earned − advances − statDeduction (PayrollLine +13 columns all default 0; Employee.esiNo additive-optional). THE LEDGER SIGN FIX: Journal.partySide debit|credit (null = the legacy credit-assumption — every pre-M47 row byte-identical); commit posts wage journals (partySide 'credit', FULL earned) + ONE deduction journal per line per head (Dr Wage Payable / Cr PF|ESI|PT|LWF Payable, partySide 'debit', V-#### minted in-tx); the party-ledger journals term is SIDE-AWARE in BOTH queries (null+'credit' = +amount, 'debit' = −; the get_party_ledger json SHAPE unchanged) → paying the net still closes the employee-party ledger to EXACTLY 0: −earned + statutory + advances + net = 0 (the §12 walkthrough EXTENDED, pinned). SURFACES: /hr/statutory register (committed lines only — the payslip precedent; variant=pf|esi|pt|lwf head filter + q + from/to run-period window; UAN/esiNo/gross/PF-EE/ER breakdown/ESI/PT/LWF/deduction/net — 15 columns) + the csv twin = THE CHALLAN EXPORT (?variant=pf → UAN + pfWages + EE + ER + EPS/EPF/EDLI/admin; esi → IP No + gross + EE/ER; per-head shapes) + get_statutory_register read tool (tools 253→254, hr domain) + menu 142→144 (hr 'statutory' + masters-admin 'statutory-rates') + LIVE_ROUTES 178→180 + the run view gains conditional statutory columns + journals-audit naming the deduction legs + the payslip gains conditional deduction rows + employer-contributions note + net-of-statutory NET PAYABLE (zero-config renders M46-identical) + PROMPT_VERSION m47-2026-09-08 (§1 HR line: the register + rates at /admin/statutory). Operator statement L-01 stays FROZEN. Tests: payroll-l03.test.ts NEW 25/25 (zero-config regression — no statutory text/sideEffects/legs; THE WALKTHROUGH: 2.5 days × ₹500 = 1,250 → PF 150/ESI 9/PT 208/LWF 20 → deduction 387 → net 863 → wage journal credit-side + 4 deduction journals debit-side (Cr the head payables, narrations carry run+head) → ledger totalJournal = 863 → pay_wages 863 → balance EXACTLY 0 → payslip rows + notes; applicability matrix: no-UAN named skip / ESI over-threshold named / PT boundary = threshold ⇒ 0 / ceiling cap at 15,000 / multi-month window ⇒ PT+LWF × 2; the side-aware ledger legacy pin (null counts credit, debit nets positive, json shape keys); register committed-only + variant/q/window filters + challan columns; config round-trip + unknown/negative rejection + pure-read-never-writes; wiring/source pins ~25) + inherited pins bumped same-commit (tools 253→254 ×15 files, menu 142→144 ×4, PROMPT_VERSION m46→m47 ×5 + the prg-batch7 prefix pin, register slug list + 'statutory' + 40→41 configs). Gates: 1429 vitest (1399+25+5 per-config) · tsc src 0 · eval --static PASS (m47, registry 246) · context_check 606→613/613 NO DRIFT (8 new M47 pins, 5 bumped) · route_smoke_m47 NEW 49/49 LIVE (register + columns + csv + the four challan shapes + variant/q/future-window filters + /admin/statutory board + the SEEDED committed run walkthrough: E005 statutory legs 432 → net 1,168 + 5 journals (1 credit + 4 debit) + register row + UAN + run view statutory columns + payslip deduction rows + unknown-payslip 404 + FULL revert) · browser E2E: PF ARMED through the /admin/statutory form (DB-verified) → PR-0001 created through the /hr/payroll FORM (daily, E005 2 days × ₹800 → statutory ₹192 → net ₹1,408) → committed through the run view → DB-verified V-0001 partySide 'credit' + V-0002 Dr Wage Payable/Cr PF Payable partySide 'debit' ₹192 → /hr/statutory row (UAN + esiNo + PF 192) → payslip print (Less: PF row + NET PAYABLE ₹1,408 + employer-contributions note ₹208) → ZERO console errors → fully reverted (run + journals + attendance + UAN/esiNo + stat rows) · screenshots download/m47-statutory-register.png + m47-payroll-run-view.png + m47-payslip-print.png + m47-statutory-rates.png · schema: PayrollLine +13 statutory columns + Journal.partySide + Employee.esiNo (db push, WAL checkpointed, zero residue). ENVIRONMENT: rogue auto-commit d1325e1 (owner-credential UUID-message `git add -A` sweep — it SHIPPED the upload-route gremlin deletion a THIRD time; dropped via reset to 6c1be98, route restored, PITFALLS #49) + sandbox casualties regenerated (OPS-01 backup + eval report). Next per spec §12: L-04 attendance depth (cross-midnight, OT, leave model), L-06 shiftWages (ADR-019 owner decision) — or Module K costing (CST-01..04) / Module M final accounts; PAY-08/PRC-09/PRG-02 owner decisions still open. 7 LOCAL COMMITS pending push (m44+m45+m46+m47) — .pat-token available; side_quest branch carries m44+m45+m46 on the remote.) """

# 1. prepend the new session line, demoting the m46 line to Historical
marker = 'Last verified: 2026-09-03 (session: m46'
idx = text.index(marker)
# walk back to the start of that line
line_start = text.rfind('\n', 0, idx) + 1
line_end = text.index('\n', idx)
old_m46_line = text[line_start:line_end]
new_line = NEW_HEADER + 'Historical: ' + old_m46_line[len('Last verified: '):]
text = text[:line_start] + new_line + text[line_end:]

# 2. append milestone row #51 after #50's row
M50_END = "6 LOCAL COMMITS pending push (m44 + m45 + m46) — PAT re-supply needed.\n"
assert M50_END in text
ROW_51 = "\n51. **M47 DONE — MODULE L BATCH 3: STATUTORY PAYROLL SHIPPED (L-03)** (2026-09-08, SPEC-M47): the run computes what the law takes, the ledger still closes to exactly 0. (a) THE CONFIG — src/lib/erp/statutory.ts (the flags.ts pattern, AppOption keys `stat:*`, 17 defs): PF {enabled, eeRate 12, erRate 12, epsRate 8.33, edliRate 0.5, adminRate 0.5, wageCeiling 15000}, ESI {enabled, eeRate 0.75, erRate 3.25, wageThreshold 21000}, PT {enabled, monthlyAmount 208, threshold 10000}, LWF {enabled, eeAmount 20, erAmount 20} — every head DISABLED by default (zero-config = M46-identical, pinned); /admin/statutory (masters-admin menu 'statutory-rates', role-guarded, server action → setStatutory drift-safe, drift rows read-only; getStatutoryPure = the INV-04 pure read — getStatutory seeds OUTSIDE txs only). (b) THE MATH at planPayrollRun, FROZEN on the line (PayrollLine +13 columns): PF needs a UAN (pfWages = min(earned, ceiling); ee deducted; er split EPS/EPF + EDLI + admin as register data); ESI when gross ≤ threshold; PT single slab above threshold × distinct calendar months; LWF flat × months; statDeduction = the employee legs; net = earned − advances − statDeduction; Employee.esiNo additive-optional (the ESI register/challan IP number). (c) THE LEDGER SIGN FIX — Journal.partySide debit|credit (null = legacy credit-assumption, byte-identical for every pre-M47 row): commit posts wage journals (partySide 'credit', FULL earned) + ONE deduction journal per line per head (Dr Wage Payable / Cr PF|ESI|PT|LWF Payable, partySide 'debit', V-#### in-tx); the party-ledger journals term is SIDE-AWARE in both queries → paying the net still closes the employee-party ledger to EXACTLY 0 (−earned + statutory + advances + net = 0, the §12 walkthrough extended); employer contributions are register data, NOT posted (Module M CoA formalizes the accounts — honest sideEffect). (d) SURFACES — /hr/statutory register (committed-only, variant=head, q, from/to run-period window, 15 columns incl. UAN/esiNo + the PF ER breakdown) + csv twin = the per-head CHALLAN EXPORT (variant=pf → UAN/pfWages/EE/ER/EPS/EPF/EDLI/admin; esi → IP No) + get_statutory_register (tools 253→254) + menu 142→144 + LIVE_ROUTES 178→180 + run-view conditional statutory columns + journals-audit naming the deduction legs + payslip conditional deduction rows + employer note (zero-config renders M46-identical) + PROMPT_VERSION m47-2026-09-08. Tests: payroll-l03.test.ts NEW 25/25 (zero-config regression, the statutory walkthrough with loop-closure, applicability matrix incl. boundary/ceiling/months, the side-aware legacy pin, register/challan, config round-trip, wiring pins) + inherited pins same-commit (tools ×15, menu ×4, versions ×5, slug list +1). Gates: 1429 vitest · tsc src 0 · eval --static PASS (m47, registry 246) · context_check 613/613 NO DRIFT (8 new pins) · route_smoke_m47 NEW 49/49 LIVE · browser E2E PF-armed-through-the-form → PR-0001 → V-0001/V-0002 partySide-verified in DB → register + payslip → ZERO console errors → fully reverted (screenshots m47-*). PITFALLS #49: the upload-route gremlin now arrives via OWNER-CREDENTIAL auto-commit sweeps (UUID messages) — session-start protocol: `git log --oneline origin/main..HEAD` for unexpected commits + `git ls-tree HEAD <path>` is truth; repair = reset to the last milestone + `git checkout -- <path>`. **Next per remediation spec §12**: L-04 attendance depth, L-06 shiftWages (ADR-019), or Module K costing / Module M final accounts; PAY-08/PRC-09/PRG-02 owner decisions open. 7 LOCAL COMMITS pending push (m44+m45+m46+m47) — .pat-token available; side_quest carries the first 6 on the remote.\n"
text = text.replace(M50_END, M50_END + ROW_51, 1)

STATE.write_text(text)
print('STATE.md updated (m47 header + row 51)')

# ── PITFALLS #49 ──
PIT = ROOT / 'docs/CONTEXT/03-PITFALLS.md'
ptext = PIT.read_text()
P49 = """

## #49 — M47 session start: the upload-route gremlin arrived COMMITTED, by an owner-credential auto-commit (the d1325e1 UUID sweep)

`src/app/api/upload/route.ts` has now vanished FOUR times (worklog m44
orientation, M18-C's convergence commit, M45's commit, and now this). What was
new this time: the deletion arrived ALREADY COMMITTED on local main as
`d1325e1` — message a bare UUID (`8bb3d5cf-5f01-41a0-a102-2621cc61c8de`),
author the repo OWNER (Maheshbabu Jeyaraj), i.e. some IDE/sync checkpoint
tool had run `git add -A` on the working tree between sessions and swept the
gremlin's deletion + an uncommitted worklog.md into a commit. It was NOT
pushed (origin untouched — the side_quest push had gone out from the clean
tip 6c1be98 before it).

LESSONS:
1. **Session-start protocol upgraded**: `git status` alone is no longer
   enough — a committed deletion shows NOTHING in status. Run
   `git log --oneline origin/main..HEAD` FIRST and treat any commit whose
   message is not a milestone-shaped message as suspect; `git ls-tree HEAD
   <path>` (not status) is the truth for the gremlin file.
2. Repair: `git reset <last-milestone-sha>` (mixed — the worklog changes
   return to the working tree uncommitted, where they belong), then
   `git checkout -- <path>` to restore the gremlin file. The dropped commit
   stays recoverable via reflog (~90 days).
3. NEVER use `git add -A` / `git add .` in this repo (the #39 lesson — this
   is its third confirmation). Milestone commits list files explicitly.
4. The sandbox reset ALSO wiped download/ (eval report) + db/backups (OPS-01)
   — both regenerate: `node scripts/eval_routing.mjs --static` +
   `python3 scripts/backup_db.py` (the M46 casualty list, now routine).
"""
# append before the trailing content — find the file end; PITFALLS is append-most-recent at the end
ptext = ptext.rstrip('\n') + '\n' + P49
PIT.write_text(ptext)
print('PITFALLS.md updated (#49 appended)')
