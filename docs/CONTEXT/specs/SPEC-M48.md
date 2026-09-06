# SPEC-M48 — Module L Batch 3: Statutory Payroll (L-03)

**Status**: implementation spec · **Milestone**: M48 · **Date**: 2026-09-06
**Source**: PHASE-6B-REMEDIATION-SPEC §12 (Module L), FR L-03
**Builds on**: M45 (L-01 employee-party link), M46 (L-02 PayrollRun + payslip), M47 (the merge)

> L-03: "PF/ESI/PT/LWF configurable rates on the run; deductions computed;
> statutory registers + challan data export."

## 1. Problem

The payroll run (M46) pays `earned − advances` — no statutory wage withholding exists
anywhere in the system (Phase-6B audit: "no statutory PF/ESI/PT/LWF (zero hits)").
For any establishment with ≥20 workers, PF/ESI are law; PT and LWF are state law.
The payslip shows no deduction rows, the owner has no remittance view, and there is
no export a CA could use to fill an ECR/ESIC return.

Rate law is *state-specific and churns yearly* — so the system must NOT hardcode
legal truth. It ships **machinery + safe defaults** (PF 12/12, ESI 0.75/3.25 limit
₹21,000) and leaves PT/LWF off-by-default with the fields ready for the owner's
state numbers. Every applied rate is FROZEN on the run (the M46 freeze doctrine:
a later rate edit never moves a drafted run).

## 2. Requirements

| ID | Requirement | Acceptance criteria |
|---|---|---|
| ST-01 | Statutory config | ONE AppOption row `payroll:statutory` (group `payroll`, JSON): pf{enabled,employeePct,employerPct,epsPct,wageCeiling}, esi{enabled,employeePct,employerPct,grossLimit}, pt{enabled,amount,grossThreshold,state}, lwf{enabled,employee,employer,state}. Resolves with defaults when absent/unparseable (never throws). Editable at /admin/options (payroll group section). Seeded with the safe defaults. |
| ST-02 | Deductions on the run | `create_payroll_run` + the form door gain `statutory` (boolean, default OFF — legacy nets byte-identical). When ON: rates FROZEN into `PayrollRun.statutory` (Json) at plan; per line computed `pf, pfEmployer, esi, esiEmployer, pt, lwf, deductions` (PayrollLine columns); ESI skipped when `earned > grossLimit` (0 = no limit); PF wage = min(earned, wageCeiling); employee-side total CAPPED at earned (order pf→esi→pt→lwf, heads skipped once remaining is 0, capping NAMED in the plan text); `net = earned − advances − deductions`; pct heads Math.round to the rupee. |
| ST-03 | Commit journal split + authorities | Statutory-on commit: J1 per payable line = `earned − employeeDeductions` (Dr Wages / Cr Wage Payable, partyId — skipped when 0); J2 per head with Σ>0: Dr the run's debit account / Cr `PF\|ESI\|PT\|LWF Payable`, amount = Σ employee + Σ employer share, partyId = the authority party (find-or-create `EPFO`/`ESIC`/`PT-BOARD`/`LWF-BOARD`, partyType supplier, idempotent `ensureStatutoryParties`). Wage expense = Σ(J1) + Σ(J2) = Σ earned + Σ employer shares — honest. Ledger closure: employee-party −(earned−ded) + advances + net = 0 (pay_wages) — loop-closure #3 preserved; authority party = −accrued + remitted = PENDING (loop-closure #4, the challan tracker). |
| ST-04 | Payslip + register + tool | Payslip gains per-head deduction rows (only when > 0 — statutory-off payslips byte-identical to M46) + an employer-contribution note line. THE STATUTORY REGISTER /hr/statutory (+csv twin = the challan data export): committed runs only, rows per run × head (employee/employer/total ₹, authority, pending), head filter + q; summary lists per-authority pending (party ledger ground truth). `get_statutory_register` read tool delegates to the same service (ADR-001). Operator statement: `owed = earned − paid − Σ committed piece-run line deductions` (window-overlap aware) + a `Deducted ₹` column — after remittance-free settlement the answer to "how much do I still owe X" stays 0, not a phantom deduction. |

## 3. Design decisions

- **Opt-in per run, not per config.** `statutory: true` is explicit on the create
  door. A configured-rate change can never silently move a legacy caller's nets
  (back-compat is a pinned behavior, not luck). The plan text NAGS when rates are
  configured but the flag wasn't passed ("statutory not applied — pass statutory: true").
- **J1 = earned − deductions, not full earned.** The deduction never flows through
  the employee's cash, so it must never flow through the employee-party ledger.
  J2 completes the wage expense (employee share) and adds the employer share.
- **One authority party per head, ledger as the remittance tracker.** The
  authority party's ledger (−J2 journals + payments to it) IS the pending-remittance
  figure the register shows — no parallel shadow state to drift.
- **PT/LWF seeded OFF.** State numbers churn; machinery ships, legal truth doesn't.
  PF/ESI defaults are stable and well-known — seeded ON. `pt.state`/`lwf.state`
  are display labels (payslip/register), not logic (one factory, one state — the
  per-employee state question is L-04's to revisit).
- **Statement adjustment is piece-run-scoped.** Daily-run deductions never touch
  the operator statement (it counts piece earnings only — the L-01 freeze holds:
  earned stays entry-based; the formula gains exactly the piece-deduction term).
- **pf epsPct** is register/display split metadata for the employer share (ECR
  detail) — it does not change any amount.

## 4. Scope

- **Schema**: PayrollRun +`statutory Json?`; PayrollLine +`pf, pfEmployer, esi,
  esiEmployer, pt, lwf, deductions Float @default(0)`. db push + WAL checkpoint
  (PITFALLS #47). No new models (90 stands).
- **Files**: statutory.ts (NEW: config + computeStatutory + ensureStatutoryParties
  + head meta), posting/payroll.ts (split), schemas/payroll.ts (+flag),
  registers/statutory.ts + register-configs/statutory.ts + /hr/statutory page +
  csv twin (NEW), registers/operator-statement.ts (the owed term + column),
  registers/payroll.ts + config (+Deductions column), print/fetchers-b.ts
  (payslip rows), payroll [id] view (statutory card + conditional columns),
  payroll page form + actions (checkbox), admin/options (+payroll group),
  app-option config (+payroll group option), tools.ts (get_statutory_register +
  docstrings), menu-registry (+item, +LIVE_ROUTES), prompt.ts (§1 HR line,
  m48-2026-09-06), seed.ts (the AppOption row), context_check.sh (pins).
- **Pins bumped same-commit**: tools 257→258 (×17 files), menu 142→143 (×4),
  LIVE_ROUTES 178→179, regcfg 30→31, regsvc 42→43, PROMPT_VERSION m47→m48 (×5),
  runCommit doors/print/schemas/posting/models unchanged.
- **Tests**: tests/pipeline/payroll-l03.test.ts NEW — the walkthrough (config
  frozen + hand-computed 2.5×500=1250: PF 150/150, ESI 9/41, J1 1091, J2 300+50
  → pay net → employee ledger 0; EPFO pending 300 → remit → 0), the above-limit
  employee (22,500 → no ESI, PF on ceiling 15,000 → 1800), the cap case (earned
  100 vs PT 200 → capped, J1 skipped, net 0), statement adjustment (piece+statutory
  → owed 0 after net payment, Deducted column), register rows/filters/summary,
  payslip rows + employer note, statutory-off byte-compat, invalid-config fallback,
  guards (double-commit, unknown run), wiring/source pins.
- **Gates**: full vitest · tsc src 0 · context_check NO DRIFT · eval --static
  PASS (m48) · route_smoke_m48.sh LIVE (register + columns + csv + filters +
  seeded statutory walkthrough + payslip rows + revert) · browser E2E (form
  statutory checkbox → commit → J1+J2 in the journals table → payslip deduction
  rows → zero console errors → full revert).

## 5. Explicitly out of scope

L-04 attendance depth, L-06 shiftWages, per-employee state overrides, PT multi-slab
tables, ECR/ESIC file-format generation (the csv is the data, not the government
file), and the Module M chart-of-accounts migration of `Wage Payable`/`PF Payable`
free-string accounts (M-01 will FK them).
