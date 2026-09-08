# SPEC-M47 — Module L Batch 3: Statutory Payroll (L-03)

Phase-6B remediation spec §12 (docs/PRD/PHASE-6B-REMEDIATION-SPEC.md), third
Module L batch. L-01 (M45) closed the wage loop; L-02/L-05 (M46) built the run
+ payslip. This batch computes the statutory deductions (PF/ESI/PT/LWF) ON the
run, posts the employee-side deduction legs so the ledger still closes to
exactly 0, and adds the statutory register + per-head challan CSV export.
Frozen before code (the spec-first contract).

## 1. Scope

| ID | Requirement | In this batch? |
|---|---|---|
| L-03 | PF/ESI/PT/LWF configurable rates; deductions computed; statutory registers + challan export | **YES** — full |
| L-04 | Attendance depth (cross-midnight, OT, leave model) | NO — next batch |
| L-06 | shiftWages resolution (ADR-019) | NO — final L batch (owner decision open) |
| M-01..M-05 | CoA / true double-entry / final accounts | NO — Module M; statutory payable accounts stay free strings until then |

Everything here is **additive**: with rates at their shipped defaults (all
four heads DISABLED) every run, payslip, ledger and register behaves
byte-identically to M46 — the zero-config regression is pinned.

## 2. L-03 — the statutory config (rates live in AppOption, one namespace)

`src/lib/erp/statutory.ts` — the flags.ts pattern (LLD-07 registry over
AppOption, keys `stat:<name>`), NOT a new model: rates are cross-cutting
owner config, the schema-free home per PITFALLS #9.

| name | type | default | meaning |
|---|---|---|---|
| pf.enabled | bool | false | head on/off |
| pf.eeRate | % | 12 | employee share |
| pf.erRate | % | 12 | employer share (split below) |
| pf.epsRate | % | 8.33 | EPS carve-out of the employer share |
| pf.edliRate | % | 0.5 | EDLI (employer) |
| pf.adminRate | % | 0.5 | PF admin charge (employer) |
| pf.wageCeiling | ₹ | 15000 | PF wage base cap; 0 = no ceiling |
| esi.enabled | bool | false | head on/off |
| esi.eeRate | % | 0.75 | employee share |
| esi.erRate | % | 3.25 | employer share |
| esi.wageThreshold | ₹ | 21000 | gross ≤ threshold → covered |
| pt.enabled | bool | false | head on/off |
| pt.monthlyAmount | ₹ | 208 | per month (TN-shaped default) |
| pt.threshold | ₹ | 10000 | line earned > threshold → PT applies |
| lwf.enabled | bool | false | head on/off |
| lwf.eeAmount | ₹ | 20 | employee, per month |
| lwf.erAmount | ₹ | 20 | employer, per month |

- `getStatutory()` — typed record read; seeds missing rows idempotently
  (admin surface + register calls it; NEVER inside a transaction — INV-04
  WAL single-writer deadlock lesson).
- `getStatutoryPure()` — pure read, registry defaults fill missing rows, zero
  writes (the planPayrollRun reader).
- `setStatutory(name, value)` — validate + persist, unknown names rejected
  (registry drift-safe, the setFlag contract).

Rates are SINGLE-COMPANY: PT/LWF state shape is the owner's to configure; a
per-state slab engine is out of scope (one slab, one threshold — honest).

## 3. Computation (planPayrollRun — frozen on the line at plan time)

Applicability + math per line (`earned` = the line's gross for the window):

- **PF** — applies when `pf.enabled` AND the employee has a UAN (the
  enrolled proxy — honest: no UAN, no PF leg, named not silent).
  `pfWages = ceiling > 0 ? min(earned, ceiling) : earned`;
  `pfEe = round(pfWages × eeRate/100)`;
  `pfEr = round(pfWages × erRate/100)`;
  `pfEps = min(round(pfWages × epsRate/100), pfEr)`; `pfEpf = pfEr − pfEps`;
  `pfEdli = round(pfWages × edliRate/100)`; `pfAdmin = round(pfWages × adminRate/100)`.
- **ESI** — applies when `esi.enabled` AND `0 < earned ≤ wageThreshold`
  (the statutory gross rule). `esiEe = round(earned × eeRate/100)`,
  `esiEr = round(earned × erRate/100)`. Over-threshold lines: no ESI, named.
- **PT** — applies when `pt.enabled` AND `earned > pt.threshold`:
  `ptAmt = monthlyAmount × monthsInWindow` where monthsInWindow = the count
  of DISTINCT calendar months touched by `[from, to]` inclusive. (PT is a
  monthly slab; a multi-month run window charges per month — the single-slab
  approximation is documented, not hidden.)
- **LWF** — applies when `lwf.enabled` AND `earned > 0`:
  `lwfEe = eeAmount × monthsInWindow`, `lwfEr = erAmount × monthsInWindow`.
- `statDeduction = pfEe + esiEe + ptAmt + lwfEe` (the employee's legs only).
- **`net = earned − advances − statDeduction`** — zero-config ⇒ statDeduction 0
  ⇒ the M46 net exactly. Negative net stays recoverable-honest.

New PayrollLine columns (all `Float @default(0)` — old lines read as 0):
`pfWages, pfEe, pfEr, pfEps, pfEpf, pfEdli, pfAdmin, esiEe, esiEr, ptAmt,
lwfEe, lwfEr, statDeduction`. Employer legs (pfEr breakdown, esiEr, lwfEr) are
REGISTER data — computed and frozen, NOT posted (see §4).

`Employee.esiNo String?` — additive-optional (the ESI register / challan IP
number; master-config field, create/update tools auto-extend; NOT masked —
like UAN at the master surface, unlike aadhaar).

## 4. The deduction legs (commit) + the side-aware ledger

### 4-1 Why a sign fix is needed

The party-ledger term is `− Σ journal.amount` over `voucherType
in ('journal','contra')` rows carrying partyId (M45) — UNSIGNED. The M46 wage
journal (Dr Wages / **Cr Wage Payable**, partyId) correctly reads "we owe
more". A deduction journal (Dr **Wage Payable** / Cr PF Payable, partyId)
would subtract AGAIN — wrong sign, the ledger would claim we owe the
employee MORE after deducting. So the journals term becomes side-aware.

### 4-2 Journal.partySide

`Journal.partySide String?` — `'debit' | 'credit'`, which leg the party
account sits on. NULL = the legacy credit-assumption (every existing row —
manual journals, contra legs — keeps byte-identical M45 behavior).
`planPayrollRunCommit` stamps wage journals `'credit'`, deduction journals
`'debit'`. The ledger term:

```
totalJournal = Σ (partySide = 'debit' ? −amount : amount)
```

(json SHAPE unchanged — `totalJournal` name stays; value nets sides.)
Both the single-party and aggregate party-ledger queries get the fix.

### 4-3 What commit posts

- Wage journals per line — UNCHANGED (Dr Production Wages|Staff Salaries /
  Cr Wage Payable, FULL earned, partyId, V-####, now `partySide 'credit'`).
- **NEW: per line per head with an employee leg > 0** — one journal:
  `Dr 'Wage Payable' / Cr 'PF Payable' | 'ESI Payable' | 'PT Payable' |
  'LWF Payable'`, amount = pfEe | esiEe | ptAmt | lwfEe, partyId = line
  party, `partySide 'debit'`, voucherType 'journal', narration
  `Payroll run <runNo> · statutory <head> · <emp code> <emp name> · <period>`.
  V-#### minted inside the same tx (nextAdjNo scan, OPS-05).
- Employer contributions are NOT posted — honest sideEffect: they are
  register/challan data; posting them is a manual journal (Module M CoA
  formalizes the accounts). Nothing is silently double-counted.
- Loop closure with statutory: `−earned + statDeduction + advances + net = 0`
  — paying the net via pay_wages still closes the employee-party ledger to
  EXACTLY 0 (the §12 walkthrough extended, pinned in tests).

## 5. Surfaces

- **/admin/statutory** (masters-admin group menu item `statutory-rates`,
  role-guarded like /admin/settings): grouped rate inputs + enabled toggles
  per head + effect notes + read-only drift rows; writes via a server action
  → `setStatutory` (registry drift-safe); LIVE_ROUTES + this page.
- **/hr/statutory** (hr group menu item `statutory`, slug `statutory`, arch
  RG): rows = PayrollLine × **committed** runs only (a statutory view over
  posted numbers — the payslip precedent). Columns: run, period, employee,
  UAN, ESI no, gross, PF EE/ER, ESI EE/ER, PT, LWF EE, deduction, net.
  `variant` = head filter (pf|esi|pt|lwf — rows with that head nonzero),
  `q` = employee/run contains, `from`/`to` window on the run period. The
  service owns the sums (lines joined run+employee, totals per head).
  `get_statutory_register` read tool (tools 253→254, hr domain) delegates
  here — json rows + per-head totals text.
- **CSV twin = the challan data export**: /hr/statutory/csv (variant-aware).
  PF rows carry UAN + pfWages + EE + ER (EPS/EPF/EDLI/admin); ESI rows carry
  the IP number + gross + EE/ER — the columns a challan/ECR upload needs.
- **Run view** /hr/payroll/[id]: lines table gains PF/ESI/PT/LWF/deduction
  columns (rendered only when the run has any statutory); the journals audit
  table already lists the deduction journals by narration.
- **Payslip**: conditional deductions block (only nonzero legs — zero-config
  renders M46-identical): rows `Less: PF (employee)`, `Less: ESI (employee)`,
  `Less: PT`, `Less: LWF (employee)`; a note naming the employer
  contributions (not deducted, remitted separately); NET PAYABLE = line.net
  (now net of statutory).
- Menu 142→144 (statutory + statutory-rates) · LIVE_ROUTES 178→180 ·
  PROMPT_VERSION m47-2026-09-08 (§1 HR line: statutory on the run, register,
  rates at /admin/statutory).

## 6. Acceptance (tests + gates)

1. **Zero-config regression** — rates disabled: plan → statDeduction 0, net =
   M46 value; commit → wage journals only; party ledger identical; payslip
   renders with NO deductions block; the M46 walkthrough test file passes
   unchanged (inherited).
2. **The statutory walkthrough** — config on (all four heads), employee with
   UAN + esiNo + dailyWage: attendance 2.5 days × ₹500 = ₹1,250 → line
   pfEe/esiEe/pt/lwfEe per the rate math, statDeduction, net = earned −
   advances − statDeduction → commit: wage journal FULL 1,250 (partySide
   'credit') + 4 deduction journals (partySide 'debit', Cr the head
   payables) → party ledger totalJournal = 1,250 − statDeduction →
   pay_wages net → **ledger balance 0** → payslip shows the deduction rows
   + NET PAYABLE = net.
3. Applicability matrix — PF skipped without UAN (named), ESI skipped above
   threshold (named), PT 0 at/below threshold, ceiling cap (earned > ceiling
   → PF on the capped base), multi-month window ⇒ PT and LWF × months.
4. Config round-trip — setStatutory persists, getStatutory reads, unknown
   name rejected; getStatutoryPure never writes.
5. Register + csv — variant filters, per-head totals, committed-only, challan
   columns (UAN/esiNo present on the PF/ESI rows).
6. Ledger shape — get_party_ledger json SHAPE unchanged (totalJournal name);
   a debit-side journal nets POSITIVE; legacy rows (partySide null) behave
   exactly as M45 (pinned on seeded data).
7. Wiring/source pins — statutory.ts defs (17 rows), Journal.partySide,
   PayrollLine columns, Employee.esiNo + master-config field, register slug +
   service + config, menu ids, tools 254, LIVE_ROUTES 180, PROMPT_VERSION
   m47-2026-09-08. Inherited pins bumped same-commit (tools 253→254 ×15,
   menu 142→144 ×4, routes 178→180, regcfg/regsvc +1, versions ×4, …).
8. Gates: full vitest · tsc src 0 · eval --static PASS (m47) ·
   context_check NO DRIFT (pins bumped same-commit) · route_smoke_m47 NEW ·
   browser E2E zero console errors.

## 7. Out of scope (recorded, not lost)

L-04 attendance depth, L-06 shiftWages (ADR-019 owner decision), employer-
contribution POSTING (Module M CoA), a pay_statutory remittance door (pay via
manual journal / pay_wages today), ECR XML formats, state-slab PT engine,
ESI contribution-period eligibility windows, PF/ESI number masking (UAN/esiNo
are operational ids), per-employee rate overrides, statutory on DRAFT runs
(committed-only register), a statutory payable account balance report
(party-less credit strings until Module M).
