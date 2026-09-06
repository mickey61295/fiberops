# SPEC-M46 — Module L Batch 2: PayrollRun + Payslip (L-02, L-05)

Phase-6B remediation spec §12 (docs/PRD/PHASE-6B-REMEDIATION-SPEC.md), second
Module L batch. L-01 (M45) closed the structural loop; this batch builds the
payroll DOCUMENT flow on top of it: the run, the payslip, and the employee
payout fields the payslip consumes. Frozen before code (the spec-first
contract). Everything here is additive — no L-01 surface changes.

## 1. Scope

| ID | Requirement | In this batch? |
|---|---|---|
| L-02 | PayrollRun + Payslip | **YES** — full |
| L-05 | Employee master payout fields | **YES** — full (the payslip consumes them) |
| L-03 | Statutory (PF/ESI/PT/LWF) | NO — next batch |
| L-04 | Attendance depth (cross-midnight, OT) | NO — next batch |
| L-06 | shiftWages resolution | NO — final L batch (owner ADR-019 still open) |

L-05 ships here rather than with L-03 because the payslip print is the FIRST
consumer of joining date / designation / bank / UPI / UAN / aadhaar — a payslip
without them would print half-empty and get reprinted after L-05 anyway.

## 2. L-02 — the PayrollRun

### 2-1 Model

```
PayrollRun  { id, runNo (unique, PR-####), mode (piece|daily), from, to,
              status (draft|committed — terminal), finYear, notes?,
              committedAt?, createdAt }  @@index([createdAt])
PayrollLine { id, runId → PayrollRun, employeeId → Employee,
              partyId?  — the employee-party the journal hit (frozen at run time),
              days?      — daily mode: weighted attendance days (half = 0.5),
              qty?       — piece mode: pcs produced in window,
              earned, advances, net }  @@unique([runId, employeeId])
```

- `runNo` rides the numbering registry (`payroll_run`, `PR-####`, start 1).
- `status` is a two-state graph, not stock-take's four: `draft → committed`.
  Nothing posts at draft; a wrong draft is simply ignored (no residue) — a
  delete door is OUT of scope (no doc in this repo has one; cancel-action
  machinery is for POSTED docs).

### 2-2 Earning basis (mode decides)

- **piece**: per employee, `earned = Σ ProductionEntry.amount` where
  `operatorId = employee` and `prodDate ∈ [from, to]` — the SAME ground truth
  as the operator statement and the production-bill door. `qty` = Σ pcs.
  Employees with ≥ 1 entry in window get lines.
- **daily**: per employee, `days = Σ attendance weight` (present = 1,
  half = 0.5, absent/leave = 0) over `[from, to]`, `earned = days × dailyWage`.
  Employees with ≥ 1 attendance row AND `dailyWage > 0` get lines.
  Employees with attendance but `dailyWage = 0` are skipped and NAMED in the
  plan text (master-data gap, not silent).
- Mixed mode is one run one mode, per spec ("Run per period (piece|daily)").

### 2-3 Advances + net

- `advances = Σ active out-Payments to the 1:1 employee-party` with
  `payDate ∈ [from, to]` — the L-01 paid-leg definition, windowed.
- `net = earned − advances` (negative net is honest: over-paid, recoverable;
  the journal still posts `earned`, the ledger stays truthful).
- Every line's employee is auto-linked via `ensureEmployeeParty` (L-01) BEFORE
  lines freeze — so `partyId` is never null on a created line.

### 2-4 Commit — the wage journal, per line

`planPayrollRunCommit` (draft → committed, terminal, re-refuses):
- one Journal per line with `earned > 0`: shared `V-####` space (minted INSIDE
  the commit transaction, the nextAdjNo scan pattern), `voucherType 'journal'`,
  `partyId = line.partyId`,
  piece → `Dr 'Production Wages'` / daily → `Dr 'Staff Salaries'`,
  both → `Cr 'Wage Payable'`, `amount = earned`,
  narration `Payroll run PR-#### · <mode> · <empCode> <empName> · <period>`.
- Post-commit the ledger closes exactly: pay the net through the existing
  `pay_wages` door → balance = −earned + advances + net = 0 (loop-closure #3
  in the party ledger — the Module L §12 walkthrough).
- **Overlap guard**: a piece run whose `[from, to]` overlaps a COMMITTED piece
  run REFUSES (ledger double-credit). Production-bill overlap is NOT
  detectable (bills carry no window column) — the plan's sideEffects say so
  honestly; the run is the formal HR door, the per-operator bill the quick
  chat door — do not run both over the same window.

### 2-5 The payslip print

- docType `'payslip'` in `PRINT_DOCS` (fetcher resolves a `PayrollLine` by id
  — the run view page links each row). Committed runs only: a draft refuses
  (the payslip is a payment instrument; numbers not yet posted).
- Content: run meta (runNo, mode, period, committed date) · employee block
  (L-05 fields, UAN/aadhaar MASKED) · earning line (piece: qty × implicit
  rate; daily: days × dailyWage) · advances · NET PAY in figures.
- Rides `NON_CONFIG_DOORS` (the stock-take count-sheet precedent — view +
  DocPrintLink + agent tool, not a doc-config family).

### 2-6 Register + surfaces

- `/hr/payroll` — runs list (RG): runNo, mode, period, lines, earned, net,
  status, committed; q + mode + status filters; csv twin.
- `/hr/payroll/[id]` — the run view: lines table (employee, days/qty, earned,
  advances, net, party), payslip DocPrintLink per line, commit door
  (useActionState + the stock-take advance-form pattern), revalidatePath.
- Agent tools: `create_payroll_run` + `commit_payroll_run` (docTools — the
  SAME plan services, ADR-001) + `get_payroll_runs` (read tool: runs with
  lines + totals). Register config `agentTools: ['get_payroll_runs']`.
- Menu `payroll` (groupId hr) + LIVE_ROUTES + live-coverage row.

## 3. L-05 — employee payout fields

- Schema (additive-optional): `joiningDate?`, `designation?`, `bankName?`,
  `ifsc?`, `accountNo?`, `upi?`, `phone?`, `uan?`, `aadhaar?`.
- Stored as given; **displayed masked** — `maskSecret()` (UAN `XXXXXX7890`,
  aadhaar `XXXX-XXXX-4839`) on the payslip and any echo surface. Full values
  never leave the master/plan surfaces.
- Employee master-config: 8 new fields (text/date/number), listColumns gain
  designation + joining date only (bank detail columns would crowd the list).
- Payslip consumes: designation + joining date (header), bank/upi (payment
  mode block — only rows that exist), uan/aadhaar masked.

## 4. Frozen / untouched

- `get_operator_statement` + the operator statement register: **FROZEN**
  (L-01 semantics = piece-rate reconciliation; shape AND formula). A
  daily-wage employee's owed lives in the party ledger (`get_party_ledger`)
  and the payroll run — documented, not hacked into the statement.
- `pay_wages` door unchanged (the payout leg after commit).
- `wages` register unchanged.
- PROMPT bumps to `m46-2026-09-03` (§1 HR line gains the payroll run +
  payslip; §3/§6 wording only if the cap allows).

## 5. Acceptance (tests + gates)

1. **The §12 payroll walkthrough** — attendance (2 present, 1 half, 1 absent,
   dailyWage 500) → run daily → days 2.5 / earned 1250 / net 1250 → commit →
   journal carries partyId (Dr Staff Salaries / Cr Wage Payable) → pay_wages
   1250 → **party-ledger balance 0** → payslip fetch ok.
2. Advances leg — pre-pay 300 → net 950 → commit (journal still 1250) → pay
   950 → ledger 0.
3. Piece mode + statement agreement — entries 100 @ 10 → run earned 1000 →
   commit → ledger closes on payment 1000; operator statement earned = 1000
   (entry-based — the run journal never double-counts the statement).
4. Guards: overlap refusal (committed piece run over same window), unknown
   run, double-commit, draft-payslip print refusal, zero-activity refusal,
   dailyWage-0 employees named not silent.
5. L-05: fields round-trip through create_employee; payslip masks
   UAN/aadhaar; master-config contract.
6. Source contracts: schema models, SEQUENCES.payroll_run, PRINT_DOCS.payslip
   + NON_CONFIG_DOORS, register slug + service, menu id, tools present,
   PROMPT_VERSION, ledger journals-term invariant still 'journal'|'contra'.
7. Gates: full vitest (new file + inherited pin bumps: tools 250→253, menu
   141→142, models 85→87, registers 41, print families 24→25, versions),
   tsc src 0, eval --static PASS (m46), context_check NO DRIFT (pins bumped
   same-commit), route_smoke_m46 NEW, browser E2E on /hr/payroll (zero
   console errors).

## 6. Out of scope (recorded, not lost)

L-03 statutory (next), L-04 attendance depth, L-06 shiftWages + ADR-019,
payslip per-line edit/override door (lines freeze at plan time), run delete
door, PF/ESI registers. Owner decisions PAY-08 / PRC-09 / PRG-02 unchanged.
