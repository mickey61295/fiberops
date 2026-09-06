# SPEC-M45 — Module L Batch 1: Wage Reconciliation (L-01)

Source: docs/PRD/PHASE-6B-REMEDIATION-SPEC.md §12 (Module L, L-01). Evidence
re-verified on the M44 line (2026-09-02): `planProductionBill` posts its
journal with NO partyId (production-bill.ts creates[] — the journal model HAS
the column); `planWagePayment` → planPayment(direction out) writes Payment +
companion journal BOTH with the employee-party id; the party-ledger formula is
`opening + billed − debit − journals − received + paid` (party-ledger.ts:44) —
so a partyId-carrying wage bill makes the balance go negative (we OWE) and a
payment pulls it back; `Employee` has NO partyId (schema:205-217) while Party
has carried `partyType 'employee'` since HFX-07; `queryWages` groups
ProductionEntry by operator (earned leg exists); NO operator-statement surface
exists anywhere (grep). The 1:1 link + statement are the P0 — the last
structural P0 of the consolidated register (dive 2 §1, seam #3).

Scope discipline: **L-01 only.** L-02 PayrollRun/Payslip, L-03 statutory,
L-04 attendance depth, L-05 payout fields, L-06 shiftWages are OUT (Module L
was sized 1–1.5 batches; this is batch 1). PAY-08 cheque/PDC owner decision
untouched.

## §1 Scope — 1 FR, zero deferrals

| FR | Ship |
|---|---|
| L-01 | Wage reconciliation: (a) `Employee.partyId` (1:1, unique, nullable for legacy rows) + `ensureEmployeeParty()` find-or-create helper — Employee CREATE auto-creates/links the 1:1 employee-party (both doors — the hook lives in master-service's commit, the finYear-invariant precedent); (b) `planProductionBill` with `operatorCode` stamps the journal `partyId` = the operator's party (per-operator bills hit the party ledger; dept/all-employee aggregate bills stay party-less — one journal, one party); (c) NEW operator-statement register `/hr/operator-statement` (+csv): per operator — earned (Σ ProductionEntry.amount, prodDate window), paid (Σ Payment direction-out to the linked party, payDate window), owed = earned − paid, entries count; all-time by default (the "how much do I still owe operator X" question has no natural window); (d) `get_operator_statement` read tool; (e) backfill script for existing employees; (f) loop-closure #3 GREEN end-to-end |

## §2 Design decisions

0. **REAL BUG the batch's gates caught — party-ledger double-counted every
   receipt.** The formula `opening + billed − debit − journals − received +
   paid` counted the planPayment COMPANION journals (JV-* rows, voucherType
   receipt/payment, partyId) in `−journals` while the same cash was already
   counted in `−received`/`+paid` — every receipt ever posted subtracted
   twice. Live probe: CUS001 billed ₹38.99M, received ₹36.50M → formula
   balance −₹34.0M against a true AR ≈ ₹4.3M. Fix: the journals term counts
   `voucherType in ('journal','contra')` only (manual journals + the PAY-06
   contra legs that restore cancelled payments; companions' cash lives in
   the Payment rows). The wage bill (voucherType 'journal') is the leg the
   term exists for — and the wage loop now closes in the ledger too:
   bill −1000 + payment +1000 + companion excluded = 0. The frozen
   get_party_ledger json SHAPE is untouched; the pinned register-services
   fixture (payment row created directly, no companion) is unaffected.

1. **Earned reads ProductionEntry, not journals** — the spec's acceptance
   formula is `queryWages period − wage payments`; the journal bill leg
   (partyId) exists so the GL/party-ledger view ALSO closes, not as the
   statement's source of truth. Piece-rate entries are the ground truth.
2. **Paid = ALL out-payments to the linked party** (not just mode/notes
   heuristics) — the party ledger counts the same rows, so the statement and
   the ledger can never disagree. Wage-adjacent exceptions are an L-02 concern.
3. **1:1 enforced by `@unique` on `Employee.partyId`** — two employees
   pointing at one party is a modeling bug, not a feature. Nulls allowed
   (legacy rows; the backfill retires them). Employee UPDATE name-sync to the
   party row is OUT (L-05 will revisit the employee master).
4. **Party code = the employee's code**, find-or-create, `-W` suffix on the
   rare non-employee collision (deterministic, never fails employee creation);
   partyType `employee`, name = employee name.
5. **The hook lives in master-service's commit** (`config.delegate ===
   'employee'`), the finYear-invariant precedent — one seam, both doors, the
   plan's sideEffects text declares the linkage so the agent door can narrate
   it before approval.
6. **All-time default window** — the owed question is cumulative; from/to
   filters make it a period statement (both legs windowed on their own date
   columns: prodDate for earned, payDate for paid).

## §3 Files

| File | Change |
|---|---|
| `prisma/schema.prisma` | `Employee.partyId String? @unique` + `party Party?` relation; `Party.employee Employee?` back-relation (db push, no data loss) |
| `tests/setup/global-setup.ts` | PITFALLS #47: copy the `custom.db-wal` sidecar too when present — a schema push under WAL leaves pages in the sidecar with a stale main file; a main-only copy shipped test.db a column short ("partyId does not exist") |
| `src/lib/erp/posting/employee-party.ts` | NEW — `ensureEmployeeParty(rec)`: find-or-create the 1:1 party + link (idempotent; returns the party) |
| `src/lib/erp/posting/master-service.ts` | create-commit hook for `delegate === 'employee'` + sideEffects line |
| `src/lib/erp/posting/production-bill.ts` | operatorCode → resolve/ensure party → journal `partyId`; summary/sideEffects carry it |
| `src/lib/erp/registers/operator-statement.ts` | NEW — `queryOperatorStatement(q)` (q/party/from/to filters; earned/paid/owed; totals; ordered owed desc) |
| `src/lib/erp/register-configs/operator-statement.ts` | NEW config (filters q/party/from/to; columns code/operator/dept/party/earned/paid/owed/entries) |
| `src/lib/erp/registers/index.ts` + `register-configs/index.ts` | +slug wiring |
| `src/app/(erp)/hr/operator-statement/page.tsx` + `csv/route.ts` | NEW (the JWL-07 page/csv pattern verbatim) |
| `src/lib/erp/menu-registry.ts` | +menu item (hr group) + LIVE_ROUTES ×2 |
| `src/lib/agent/tools.ts` | +`get_operator_statement` (read, hr domain — the list_jobworker_statement precedent) |
| `src/lib/agent/prompt.ts` | §1 hr line gains the statement; PROMPT_VERSION → m45-2026-09-02 |
| `scripts/backfill_employee_parties.ts` | NEW idempotent backfill; run once on the dev DB |
| `tests/pipeline/payroll-l01.test.ts` | NEW — see §4 |
| `scripts/route_smoke_m45.sh` | NEW — the statement page + csv LIVE |

## §4 Tests (tests/pipeline/payroll-l01.test.ts)

1. **Employee create auto-links** (master door): planMasterCreate(employee) →
   commit → Employee.partyId set, Party exists (code, employee type, name),
   idempotent re-run (ensureEmployeeParty twice = one party).
2. **Loop-closure #3 GREEN** (the spec walkthrough): create employee →
   production entry (₹ qty×rate) → per-operator production bill (journal
   CARRIES partyId) → statement owed = earned → wage payment (planWagePayment)
   → statement owed 0 → fully reverted.
3. **Statement math**: partial payment → owed = earned − paid (hand-computed);
   period filters (from/to) window earned by prodDate and paid by payDate
   independently; unlinked legacy employee shows paid 0 + party '—' (honest).
4. **Party-ledger agreement**: the bill journal + payment land in the ledger
   formula (totalJournal/totalPaid), balance = −owed while owed > 0.
5. **Source/pins**: production-bill carries the partyId stamp; tools 249→250;
   menu 140→141; register slug wired (services + configs + LIVE_ROUTES);
   PROMPT_VERSION m45.

## §5 Gates

Full vitest (1345 + new) · tsc src 0 · eval --static PASS (m45-2026-09-02,
registry +1) · context_check NO DRIFT (pins bumped same-commit — the M43
lesson) · route_smoke_m45 LIVE (page renders rows + csv + zero residue) ·
browser E2E: statement page shows the loop-closure walkthrough row, zero
console errors · schema db push zero residue · backfill run (zero unlinked
employees remain in dev).
