# SPEC-M49 — Module L Batch 4: Attendance Depth (L-04)

**Status**: implementation spec · **Milestone**: M49 · **Date**: 2026-09-06
**Source**: PHASE-6B-REMEDIATION-SPEC §12 (Module L), FR L-04
**Builds on**: M20 (attendance day-book), M45 (L-01 employee-party link), M46 (L-02 PayrollRun + payslip), M48 (L-03 statutory)

> L-04: "Attendance depth (cross-midnight, OT)."

## 1. Problem

Two depth gaps in the attendance → payroll chain:

1. **Night shifts are unpostable.** `post_attendance` rejects any entry where
   `outTime ≤ inTime`. A 22:00→06:00 factory night shift — the single most
   common cross-midnight case — cannot be recorded with real times; the row
   must either fake times or drop them (hours falls back to the shift, the
   in/out columns read '—'). The register shows a lie.
2. **Overtime does not exist.** `hours` is stored (M20) but nothing consumes
   it: a 10-hour day and an 8-hour day pay identically on a daily run
   (`earned = weighted days × dailyWage`). The payroll run has no OT door, no
   multiplier, no standard-hours notion — and the payslip has no OT row.

Legal-truth discipline stays the M48 doctrine: rate law churns, so the system
ships **machinery + safe defaults** (multiplier 2× per the Factories Act §59
"twice the ordinary rate" convention, standard 8h) and lets the owner edit the
numbers at /admin/options. Every applied number freezes on the run.

## 2. Requirements

| ID | Requirement | Acceptance criteria |
|---|---|---|
| AT-01 | Cross-midnight attendance | `post_attendance`: `outTime` EARLIER than `inTime` = the shift ends the NEXT calendar day — valid; `outTime == inTime` still rejected (0h is not a shift). `hours = (out − in + 24h)`, rounded 2dp. The row stays on `attDate` (the START day) — one-row-per-day and the payroll window semantics unchanged. The plan text names the cross-midnight count. Schema docstrings + zod descriptions updated. The M20 unit pin `inTime 14:00 / outTime 06:00 → error` is updated same-commit to the new contract (equal-times rejected; 14:00→06:00 = 16h). |
| AT-02 | OT config | ONE AppOption row `attendance:ot` (group `payroll`, JSON): `{ otMultiplier: 2, standardHours: 8 }`. Resolves with defaults when absent/unparseable (never throws; wrong-typed fields fall back; `standardHours ≤ 0` falls back to 8 — div-by-zero impossible). Seeded with the defaults. Editable at /admin/options (payroll group section). |
| AT-03 | OT on the run | `create_payroll_run` + the form door gain `ot` (boolean, default OFF — legacy nets byte-identical). `piece + ot` → clear error (no attendance basis). When ON: config FROZEN into `PayrollRun.ot` (Json) at plan; per line, per PRESENT day with hours: standard = `shift.hours` (when the row's shift is linked, > 0) else the frozen `standardHours`; OT hours = `max(0, hours − standard)`; OT pay = `otHours × (dailyWage ÷ standard) × otMultiplier`. Line gains `otHours` (Σ, 2dp) + `otPay` (rupee-rounded); `earned = round(days × dailyWage) + otPay` (payslip rows sum to earned exactly). OT accrues ONLY on present days — a half day's part-wage is the weight, not the hours; absent/leave with times is recorded but earns nothing. No legal OT cap is encoded — the plan text carries the OT totals for human review. Statutory (if also on) computes on the OT-inclusive earned. |
| AT-04 | Surfaces | Payslip gains an OT EARNINGS row (only when `otPay > 0` — OT-off payslips byte-identical; base row = `earned − otPay`). The payroll run view gains an OT card (frozen multiplier + standard + the Σ hours) + OT columns on the lines table + the freeze note lists OT. The payroll register gains the `OT ₹` run-total column. The attendance day-book gains the `OT Hrs` column (present rows with hours: `max(0, hours − per-day standard)`; the description says paid-only-with-ot-true) + the OT total in the summary. `list_attendance` returns the OT field; `post_attendance`/`create_payroll_run` docstrings updated; the plan text NAGS when the day-book has OT-able hours but the flag wasn't passed. |

## 3. Design decisions

- **Opt-in per run, not automatic.** `ot: true` is explicit on the create door
  (the M48 statutory pattern). Existing daily runs — with hours in the
  day-book — must never silently change their nets; back-compat is a pinned
  behavior, not luck.
- **The row belongs to the START day.** A 22:00→06:00 row sits on `attDate`
  (the day the shift began). One row per employee per day survives; the
  payroll window reads `attDate` unchanged; a night-shift row posted on day D
  pays in a window containing D. No second row is ever minted for the
  spill-over — the +24h arithmetic lives only in `hours`.
- **Per-day standard, per-day rate.** OT beyond a 12h shift at dailyWage ₹600
  means hourly ₹50 (600÷12), not ₹75 (600÷8): the shift's own hours are the
  standard when linked, the config's 8h otherwise. Mixed shifts across a
  window therefore rate correctly per day; the run freezes the result
  (`otHours`/`otPay` on the line) so a later shift edit never moves a drafted
  run — the M46 freeze doctrine extended to OT.
- **`earned` gains exactly one term.** `earned = round(days × dailyWage) +
  otPay` — single new term, both addends frozen on the line. Statutory
  (PF/ESI) and the journals need zero changes: they already consume `earned`,
  so OT flows through J1, the wage expense and the PF/ESI gross honestly
  (loop-closures #3/#4 untouched — pay_wages the net, employee ledger 0).
- **No OT legality machinery.** Factories-Act caps (50h/quarter etc.) are
  compliance monitoring, not payroll arithmetic; the plan text carries
  `incl. OT ₹Y (N hrs)` so a human sees the number before committing. The
  `ot` flag on a PIECE run is a loud error, not a silent ignore.
- **Config group is `payroll`** (not a new `attendance` group): the
  /admin/options page renders a fixed group list, and OT is consumed by the
  payroll door anyway — one payroll section, both rate rows, one edit surface.

## 4. Scope

- **Schema**: PayrollRun +`ot Json?` (the frozen config snapshot; null = OT not
  applied); PayrollLine +`otHours, otPay Float @default(0)`. db push + WAL
  checkpoint (PITFALLS #47). No new models (90 stands).
- **Files**: overtime.ts (NEW: config + normalize + resolve + the pure
  per-day compute), posting/attendance.ts (cross-midnight validation + hours
  + the plan-text count + the deduped span helper), posting/payroll.ts (the
  ot flag, frozen snapshot, per-line OT, the nag, plan text), schemas/payroll.ts
  (+ot), schemas/attendance.ts (docstring), registers/attendance.ts (OT
  column + total), register-configs/attendance.ts (+OT Hrs column),
  registers/payroll.ts + register-configs/payroll.ts (+OT ₹ column),
  print/fetchers-b.ts (payslip OT row), payroll [id] view (OT card + columns),
  payroll page form (+checkbox) + actions (fd flag), admin/options (+hint
  text), tools.ts (docstrings), prompt.ts (§1 HR line, m49-2026-09-06),
  seed.ts (the AppOption row), context_check.sh (the m49 pin), tests.
- **Pins bumped same-commit**: PROMPT_VERSION m48→m49 (context_check pin line
  + eval registry self-reads); the M20 attendance unit pins updated to the
  cross-midnight contract; tools/menu/routes/regcfg/regsvc/models/schemas/
  posting counts ALL UNCHANGED (no new tools/pages/files — depth, not width).
- **Tests**: tests/pipeline/payroll-l04.test.ts NEW (~20): the walkthrough
  (E dailyWage 800: night 22:00→06:00 = 8h OT 0 · night 22:00→08:00 = 10h →
  OT 2h = ₹400 · day 06:00→17:00 no-shift = 11h vs standard 8 → OT 3h = ₹600
  → days 3, base 2,400, otHours 5, otPay 1,000, earned 3,400) + OT×statutory
  (PF 408/408, ESI 26/111, net 2,966, J1 2,966, J2 heads — the hand-computed
  interplay) + cross-midnight unit contracts (equal rejected, 14:00→06:00 =
  16h, re-post corrects) + guards (piece+ot error, half/absent no-OT) +
  byte-compat off + the nag + the freeze (config edit after plan moves
  nothing) + payslip row + registers + wiring pins.
- **Gates**: full vitest · tsc src 0 · context_check NO DRIFT (606) · eval
  --static PASS (m49, registry 258) · route_smoke_m49.sh NEW LIVE (attendance
  OT column + cross-midnight row · payroll register OT ₹ · the seeded OT run
  walkthrough through the form door · payslip OT row · revert) · browser E2E
  (post the night attendance → create the daily run with the OT checkbox →
  commit → DB-verified J1 + payslip OT row → zero console errors → revert).

## 5. Explicitly out of scope

L-06 shiftWages (ADR-019 — the owner decision is still OPEN), per-employee
state overrides for PT (the M48 §3 note — needs the owner's slab tables),
weekly/48h OT aggregation windows, shift-pattern rotation/rostering, a
night-shift ALLOWANCE distinct from OT (owner decision), and attendance
self-service/ biometric import doors (the agent + form doors stand).
