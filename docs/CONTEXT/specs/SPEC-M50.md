# SPEC-M50 — Module M Batch 1: Chart of Accounts (M-01)

**Status**: implementation spec · **Milestone**: M50 · **Date**: 2026-09-06
**Source**: PHASE-6B-REMEDIATION-SPEC §13 (Module M), FR M-01
**Builds on**: M3 (journal voucher + DocScreen), M19 Wave C (master-engine pattern + ADR-019), M46 (payroll J1), M48 (statutory J2)

> M-01: "Account master (CoA) — Account {code, name, type, parent, active};
> seeded standard tree; journal FKs (debitAccountId/creditAccountId) with
> backfill of existing free strings; a journal cannot save an unlinked account."

## 1. Problem

Every journal in the system posts against **free strings**. `Journal.debitAccount`
/ `creditAccount` are unvalidated text (`schemas/journal.ts:7-8`); the strings
are hardcoded across the posting services ('Cash/Bank' in payment/cancel,
'Production Wages'/'Wage Payable' in production-bill, 'Staff Salaries' in
payroll, 'PF/ESI/PT/LWF Payable' in statutory) or are raw party names. There is
no chart of accounts, so there is nothing for a trial balance, day-book,
cash-book or P&L to group by — Module M's reports (M-03) have no substrate.

The remediation spec is explicit about the M-01 shape: a real Account master,
a seeded standard tree, journal FKs with a backfill of existing free strings,
and a hard invariant — **a journal cannot save an unlinked account**.

## 2. Requirements

| ID | Requirement | Acceptance criteria |
|---|---|---|
| CA-01 | Account model + master | Prisma `Account { code String @unique, name, type asset\|liability\|income\|expense\|equity, parentId? (self-relation), active Boolean @default(true) }`. Rides the M2 master engine: one config file (`master-configs/account.ts`, slug `account`, category `org`), auto CRUD pages at /masters/account, `create_account`/`update_account` factory tools + `list_accounts` door. Models 90→91, masters 41→42, tools 258→261. Master-service OVERRIDES gain `account → parentId/parentName/parent` (the self-FK the generic `${refEntity}Id` mapping cannot know). |
| CA-02 | Seeded standard tree | `lib/erp/coa.ts` exports `COA_TREE` (17 rows, 2 levels, all 5 types) + `seedCoa(db)` idempotent (upsert by code — re-runs are no-ops). The tree includes, VERBATIM, every name the posting layer writes: `Cash/Bank`, `Production Wages`, `Staff Salaries`, `Wage Payable`, `PF Payable`, `ESI Payable`, `PT Payable`, `LWF Payable` — plus the party controls `Sundry Debtors`/`Sundry Creditors`, `Sales`, `Freight` and the catch-all `Suspense Account`. Seeded by `scripts/seed.ts` (new dbs) + `scripts/seed_coa.ts` (the live dev db); every test db inherits it via the copy-then-boot contract. |
| CA-03 | Journal FKs + backfill | `Journal` gains `debitAccountId?`/`creditAccountId?` (additive-optional, two named relations). **The free strings STAY** — they are the voucher's detail/audit text; the FK is the GL classification. `scripts/backfill_coa.ts` links every existing row, per leg, in order: (1) exact Account **name** match; (2) the leg equals the row's party's name → the party-type control (`customer → Sundry Debtors`, `supplier → Sundry Creditors`, `employee → Wage Payable`, `both`/other → `Suspense Account`); (3) otherwise `Suspense Account` + a printed report line (a human can re-map). Idempotent (rows already fully linked are skipped); re-runnable; zero string rewrites. |
| CA-04 | The guard — no unlinked journal | Every journal-create site resolves BOTH legs to Account ids and stamps `debitAccountId`/`creditAccountId` inside the same transaction. `planJournal` (the create_journal door) resolves by exact name OR exact code; a miss is a LOUD refusal naming `create_account`/`list_accounts` (never a silent unlinked row, never an auto-created ghost). The payment door resolves `Cash/Bank` + the party-type control. The payroll door resolves the wage account (piece `Production Wages` / daily `Staff Salaries`), `Wage Payable` and each statutory head's payableAccount. The production-bill door resolves `Production Wages`/`Wage Payable`. Cancel mirrors carry the original row's FKs SWAPPED (journal) or resolve like the payment door (payment-cancel). The plan texts name the resolved codes (`Dr Production Wages [5010]`). |
| CA-05 | Surfaces | The journal register + journal [id] view show the account code chip next to each leg when linked (`Production Wages · 5010`; legacy unlinked legs — none, post-backfill — would show the plain string). `schemas/journal.ts` zod descriptions say the name-or-code resolution + the refusal. `create_journal` docstring updated; prompt §1 Accounts line gains the CoA + the account-code resolution; `PROMPT_VERSION m50-2026-09-06`. |
| CA-06 | Tests | `tests/pipeline/accounts-m01.test.ts` (~20): tree shape + idempotence; resolver by name/code/miss; planJournal linked-create + refusal + code-form; payment legs per party type (customer/supplier/employee); payroll J1/J2 + production-bill FKs; cancel-mirror swap; backfill on a crafted fixture (party-leg, unknown-leg → Suspense, report, idempotence); **the TB assert** (Σ debit == Σ credit grouped by FK across ALL journals, and every active journal row carries both FKs — asserted on the inherited migrated test db); master parity (auto, the 42-master loop); wiring pins (schema fields, tools 261, masters 42, prompt m50). Same-commit updates: doc-parity's `'Freight'/'Cash'` pair → `'Freight'/'Cash/Bank'` (both seeded), the 258 tool pins → 261 (×15 files), 41-config pins → 42, m49 version pins → m50. |

## 3. Design decisions

- **Strings stay, FKs classify.** The existing `debitAccount`/`creditAccount`
  strings are the voucher's human detail — 'Acme Corp USA' on a receipt is the
  sub-ledger truth (partyId carries the balance; M45 proved the ledger formula
  never reads the strings). Rewriting them would be an audit violation for
  zero benefit. The FK is the GL group-by key that M-03's trial balance will
  consume; the string remains what the register and Tally export display.
- **The guard is at the chokepoints, not the schema.** SQLite/Prisma cannot
  enforce "non-null after backfill" without a breaking migration; the invariant
  is therefore enforced at the 8 journal-create sites (5 files) + asserted by
  tests (every active row carries both FKs; the TB assert fails otherwise).
  This is the same doctrine as the M46 'wage-0 named' guard: loud at plan,
  consistent at commit.
- **Loud refusal, not auto-create.** When `create_journal` names an unknown
  account, the door refuses with the create_account hint. A silent
  auto-created account would be the 'billed' ghost pattern (HFX-09) again —
  a state nothing reaches, growing without review. Master-first is the
  discipline every other master already follows.
- **Party legs map to type-aware controls.** A receipt from a customer
  credits the party leg — the GL truth is `Sundry Debtors` (their receivable
  shrank); a payment to a supplier debits `Sundry Creditors`; wage payouts to
  employee-parties hit `Wage Payable` (the M46 liability). 'both' parties and
  unmatched legs land on `Suspense Account` **and are reported** — an honest
  temporary state a human can re-map, not a silent miscategorization. Full
  mode-aware resolution (cash vs bank per BankAccount) is M-02 and is NOT
  pulled into this batch.
- **Codes are stable, names are the join key.** The seed uses classic Indian
  CoA codes ('1010' Cash/Bank, '5010' Production Wages). Resolution matches
  exact name OR exact code — tests pin both forms. User-created accounts
  auto-code `ACC-####` (collision-free with the numeric block). Nothing
  matches fuzzily; a near-miss is a miss (loud, not lucky).
- **Flat enough to be honest.** Two levels (group → leaf), no isGroup flag —
  the spec's field list is the contract; groups are ordinary parent rows.
  17 rows cover every posting-layer name plus the trading basics; the
  owner extends the tree through the same master door as everyone else.

## 4. The seeded tree (COA_TREE)

| code | name | type | parent |
|---|---|---|---|
| 1000 | Cash & Bank | asset | — |
| 1010 | Cash/Bank | asset | 1000 |
| 1100 | Current Assets | asset | — |
| 1110 | Sundry Debtors | asset | 1100 |
| 2000 | Current Liabilities | liability | — |
| 2100 | Sundry Creditors | liability | 2000 |
| 2200 | Wage Payable | liability | 2000 |
| 2210 | PF Payable | liability | 2000 |
| 2220 | ESI Payable | liability | 2000 |
| 2230 | PT Payable | liability | 2000 |
| 2240 | LWF Payable | liability | 2000 |
| 4000 | Income | income | — |
| 4010 | Sales | income | 4000 |
| 5000 | Direct Expenses | expense | — |
| 5010 | Production Wages | expense | 5000 |
| 5020 | Freight | expense | 5000 |
| 5100 | Indirect Expenses | expense | — |
| 5110 | Staff Salaries | expense | 5100 |
| 9000 | Suspense Account | equity | — |

(19 rows — the groups earn their keep by keeping the leaf codes honest.)

## 5. Backfill walkthrough (the live dev db)

187 journals, every one `receipt: Dr Cash/Bank / Cr Acme Corp USA`
(party CUS001, type customer):

- Dr leg 'Cash/Bank' → rule 1 → account 1010.
- Cr leg 'Acme Corp USA' → no Account named that → rule 2 (== row's party
  name, customer) → `Sundry Debtors` (1110).

Report: `187 rows: 374 legs linked (187 exact-name, 187 party-control, 0
suspense)`. Re-run: `0 rows` — idempotent. The strings are untouched; the
register still reads 'Acme Corp USA'; the GL now groups it under Sundry
Debtors. TB assert on the migrated db: Σ Dr 187×amount == Σ Cr 187×amount,
every row linked both sides.

## 6. Surfaces honesty

- The journal form/door descriptions say: accounts resolve by exact name or
  code from the chart of accounts; unknown legs are refused with the
  create_account hint.
- The register/[id] code chip is display-only — it names the account code,
  never rewrites the string.
- `list_accounts` returns code, name, type, parent code, active — the agent's
  resolution helper (mirrors list_states).
- Docstring discipline: no surface claims a trial balance yet (M-03); the CoA
  card on the masters hub is the master, not a report.

## 7. Out of scope (the Module M queue)

M-02 (true double-entry per-door accounts + cash/bank per mode +
sideEffects truth), M-03 (trial balance/day-book/cash-book/P&L/BS registers —
this batch ships the FK substrate they group by, and the TB assert in tests),
M-04 (Tally both sides — the export still reads the strings, which stay),
M-05 (ExpenseHead). L-06 shiftWages remains ADR-019-blocked (owner decision).

## 8. Test plan (accounts-m01.test.ts, ~20)

1. seedCoa idempotence + tree shape (19 rows, parents resolve, 5 types,
   unique codes, the 8 posting names verbatim, Sundry Debtors/Sales/Freight).
2. resolveAccountByRef: by name, by code, case-sensitive miss → null.
3. planJournal known names → creates/commit carry both FK ids (row-level
   verify); unknown leg → refused, error names create_account; code-form
   ('5010') works; plan text shows the codes.
4. Payment door: receipt from a customer → Dr Cash/Bank [1010] / Cr Sundry
   Debtors [1110]; payment to a supplier → Dr Sundry Creditors [2100] / Cr
   Cash/Bank; wage payout (employee-party) → party leg Wage Payable [2200].
5. Payroll run commit: J1 Dr Production Wages [5010] (piece) or Staff
   Salaries [5110] (daily) / Cr Wage Payable [2200]; J2 Dr wage account /
   Cr PF Payable [2210] etc. (statutory run).
6. Production-bill commit: FKs on the wage journal.
7. Cancel: journal-cancel mirror carries SWAPPED FKs; payment-cancel resolves
   the control legs.
8. Backfill fixture: a journal with a party-name leg + one with an unknown
   string → Suspense + the report line; second run zero-changes.
9. THE TB ASSERT: across db (inherited migrated data + this file's posts):
   Σ debit == Σ credit grouped by account FK; every active journal has both
   FK ids (the CA-04 invariant).
10. Master parity (auto via the 42-loop) + wiring pins: prisma schema fields,
    tools 261, MASTER_CONFIGS 42, prompt m50 + the accounts line, config slug
    + codePrefix, list_accounts door exists.

Same-commit pin updates: 258→261 tool pins (×15 files), 41→42 config pins,
m49→m50 PROMPT_VERSION pins (×8), doc-parity 'Cash' → 'Cash/Bank'.

## 9. Gates

vitest (1466 + ~20 + parity +2 ≈ 1488) · tsc src 0 · context_check NO DRIFT
(pins recomputed: tools 261, masters 42, models 91, m50 version) · eval
--static PASS (m50) · route_smoke_m50.sh LIVE (masters account page + seeded
rows + journal register code chips + the create-through-form door) · browser
E2E: create an account via /masters/account form → post a journal naming it
(through the form door) → register shows the code chip → revert.
