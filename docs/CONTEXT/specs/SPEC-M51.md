# SPEC-M51 — Module M Batch 2: True Double-Entry Posts (M-02)

**Status**: implementation spec · **Milestone**: M51 · **Date**: 2026-09-06
**Source**: PHASE-6B-REMEDIATION-SPEC §13 (Module M), FR M-02
**Builds on**: M50 (CoA + the no-unlinked guard), M45 (party-ledger sub-ledger), M40 (PAY-06 contra cancels), M3 (debit-note/expense/payment doors)

> M-02: "True double-entry posts — payment/debit-note/expense/budget commits
> post legs against CoA accounts (replacing hardcoded names); cash/bank
> resolved from mode + BankAccount; every money doc's sideEffects claims
> become true."

## 1. Problem

M50 shipped the substrate: every journal leg classifies to an Account row and
no journal saves unlinked. Three doors are still not "true double-entry":

1. **Every payment posts to the generic `Cash/Bank` [1010] control** — the
   mode (cash | bank | cheque | rtgs | neft | upi) is stored but never
   influences the GL leg, and the `BankAccount` master (legacy
   FrmMasBankAccount) is "read by one list tool and nothing else" (deep-dive
   §2.9). A ₹5L NEFT and a ₹500 cash payment are indistinguishable in the
   books — the cash-book M-03 needs cannot be built on one ledger row.
2. **Debit notes post NO journal** — the AR effect lives only in the
   sub-ledger (the party-ledger/bills-register `− debit` terms). Worse, the
   doc's sideEffects claim *"Party AR increases by ₹X"* is **backwards**: all
   three money screens (party ledger, bills register, outstanding math) treat
   a debit note as a **deduction** — the buyer's outstanding REDUCES. A liar
   claim, exactly the T2 class M-02 exists to retire.
3. **Expenses post NO journal** — the expense book + daily P&L read the
   Expense rows directly, so the GL never sees an expense; the party leg of a
   paid-to expense (a real payable!) is invisible to the sub-ledger until it
   is paid, at which point the payment ALONE counts and the balance swings
   the WRONG way (party "owes us").

And a fourth, discovered by a live probe while scoping this batch:

4. **The party ledger double-reverses cancelled money vouchers.** Probe
   (invoice ₹1,000 → receipt ₹1,000 → cancel the receipt): the ledger shows
   **−1,000** (we "owe" the customer) instead of the correct re-opened
   **+1,000**. Root cause: the payments read has NO status filter (the
   cancelled receipt still counts as received) AND the contra journal
   (`voucherType 'contra'`, partyId) counts again in the `− journals` term.
   The `planCancelPayment` sideEffects claim *"Party ledger AR/AP re-opens"*
   is therefore false today. The operator statement and chain-money reports
   already filter `status: 'active'` — the party ledger and bills register are
   the outliers.

Budgets are planning documents (no money moves, no legs — the register claim
is already true); they stay out of this batch by design.

## 2. Requirements

| ID | Requirement | Acceptance criteria |
|---|---|---|
| DE-01 | Mode-aware cash/bank legs | `BankAccount` + `glAccountCode String?` (plain text: the GL account CODE this bank posts to — a preference resolved at post time, not an FK). `Payment` + `bankAccountId String?` (the real FK — audit + the cancel mirror). `PAYMENT_SCHEMA` + `bankAccountNo` (optional). `lib/erp/coa.ts` + `resolveCashLeg({ mode, bankAccountNo }, tx?)`: mode `cash` → the `Cash/Bank` [1010] control (a given bankAccountNo is NOT used — the plan text says so); any other mode + `bankAccountNo` → the BankAccount (active, by accountNo — a miss is a LOUD error: it is an explicit reference) whose `glAccountCode` resolves to an active Account → **that** leg (via `bank`); unlinked/unresolvable → the [1010] control + THE NAG (via `control-fallback`, the plan text names the bank and the fix: link a GL account on the bank master or create_account); bank mode without bankAccountNo → [1010] exactly as today (via `control` — **byte-compat, pinned**). The plan + commit re-resolve identically (the M50 in-tx discipline); the journal's cash-leg STRING names the resolved account; `Payment.bankAccountId` stored whenever a bank was resolved. |
| DE-02 | Debit-note GL legs + the honest claim | `DEBIT_NOTE_SCHEMA` + `debitAccount` (optional: exact Account name OR code; default **`Sales` [4010]** — a material deduction is a sales-side adjustment). The commit writes the DebitNote row + a companion journal in ONE transaction: voucherNo `JV-{noteNo}`, **voucherType `'debit-note'`** (a NEW type — deliberately OUTSIDE the party-ledger `['journal']` filter so the sub-ledger never double-counts: the DebitNote row IS the sub-ledger truth), partyId set, legs **Dr {debitAccount} / Cr {party-type control}** (customer → Sundry Debtors [1110], supplier → Sundry Creditors [2100], employee → Wage Payable [2200], both → Suspense [9000]), FKs resolved via CA-04 (a miss is a LOUD refusal naming create_account). The sideEffects claim is FIXED: "Party outstanding reduces by ₹X (deduction — the bills register + party ledger net it)" + the GL-legs line with codes. |
| DE-03 | Expense GL legs | `EXPENSE_SCHEMA` + `glAccount` (optional: exact name OR code). Default debit leg by category: `transport` → **`Freight` [5020]**; every other category → **`Other Expenses` [5120]** — a NEW seeded CoA row under 5100 Indirect Expenses (the catch-all M-05's expense heads will later refine). Credit leg from the paid-to party: `partyCode` given → **`Sundry Creditors` [2100]** + partyId on the journal; no party → **`Cash/Bank` [1010]** (paid at record), partyId null. voucherNo `JV-{expNo}`, **voucherType `'journal'`** (the wage-bill class: a party payable counts in the sub-ledger `− journals` term, so record_payment out to the party settles it to 0 — the M45 loop-closure pattern extended to expense parties). Commit = expense row + companion journal in ONE transaction; CA-04 resolution with loud refusals; claims carry the legs + the settle path. |
| DE-04 | The double-reverse fix (honest money screens) | `party-ledger.ts` (BOTH the summary and the query path): payments read gains `status: 'active'`; journals read becomes `voucherType: 'journal', status: 'active'` (drops `'contra'` — every contra in the system is the reversal of a row that stops counting: payment-cancel excludes the payment by status, journal-cancel flips the original's status, the new DN/expense cancels flip their companions). `bills.ts`: payments + `status: 'active'` (a cancelled receipt leaves the collected column), debitNotes + `status: { not: 'cancelled' }` (the HFX-03 doctrine extended: a cancelled deduction leaves the day-book). After the fix the probe scenario reads +1,000 (re-opened AR) — pinned in tests. |
| DE-05 | Cancels mirror the new legs | `planCancelDebitNote` / `planCancelExpense`: when a companion `JV-{noteNo}` / `JV-{expNo}` exists, the cancel marks the doc AND the companion journal `cancelled` and writes the contra `CN-JV-{...}` (mirror: the companion's legs SWAPPED — strings and FKs, the M50 swap doctrine); no companion (legacy row) → the status flip only, claim says so. `planCancelJournal`'s `JV-` companion guard gains the two new cases (JV-DN- → "cancel the NOTE (cancel_debit_note DN-####)"; JV-EXP- → "cancel the EXPENSE (cancel_expense EXP-####)"; JV-RCP/PMT stays "cancel the PAYMENT"). The settled-expense refusal is unchanged. |
| DE-06 | Surfaces, prompt, tests | Payment form + `bankAccountNo` (picker on the bank-account master); debit-note form + `debitAccount`; expense form + `glAccount`; the bank-account master + `glAccountCode` field + GL column. Docstrings: `record_payment` (bankAccountNo + the mode→leg rule), `create_debit_note` (debitAccount + the corrected deduction semantics), `create_expense` (glAccount + the legs + the settle path). Prompt §Accounting carries the mode→leg rule + the DN/expense legs + the 20-row tree; `PROMPT_VERSION m51-2026-09-06`. Tests: `tests/pipeline/accounts-m02.test.ts` (~22) + same-commit pin updates (tree 19→20 rows, m50→m51 version pins ×~10, schema/config source pins). Tools count UNCHANGED (261 — depth, not width); models UNCHANGED (91 — columns only). |

## 3. Design decisions

- **`glAccountCode` is a string preference, not an FK.** The master engine's
  `FK_COLUMN_OVERRIDES` is keyed by refEntity (`account → parentId`), so a
  second account-referencing field on the bank master cannot ride the generic
  mapping without engine surgery. A plain code string keeps the master simple
  and — because resolution happens at POST time through the CA-04 resolver
  with a control fallback + nag — a stale code can never block a payment
  (payments must flow; the CoA's richness is optional). The M50 doctrine
  ("resolve-or-refuse") applies to the TRANSACTION legs; a master preference
  resolves-or-falls-back-honestly.
- **The DN's credit side is the party control, debit default `Sales`.** The
  noteType vocabulary (acc/fabric/yarn/pcs/comm) is material deduction from
  buyers — a sales-side adjustment classically credits Sales. An explicit
  `debitAccount` covers the odd cases (a penalty recovered, a freight claim).
  The sub-ledger semantics are NOT invented here: the party ledger `− debit`,
  the bills-register deduction column and the outstanding math already agree;
  this batch only makes the plan text agree with them.
- **Companion voucherTypes by sub-ledger role.** `debit-note` (new): NOT in
  the `['journal']` party-ledger filter — the DebitNote row already carries
  the sub-ledger effect; the companion is pure GL. `journal` (expenses with a
  party): IN the filter — the wage-bill precedent; the payable must be
  visible before settlement, and `record_payment` out nets it to 0 (the
  M45 loop-closure proof extended). `journal` + partyId null (cash expenses):
  invisible to the sub-ledger by construction.
- **Contras never count.** A contra is always the mirror of something that
  stopped counting (status flip). Counting both sides double-reverses — the
  probe is the proof. The operator statement and chain-money reports already
  filter `status: 'active'`; the party ledger + bills register join them
  (three screens, one balance — the HFX-03 discipline).
- **No backfill.** Debit notes and expenses never had journals — there is
  nothing to link. The GL starts where the legs started; the TB (M-03) reads
  what is there. The Tally export reads journals verbatim (companions ride
  the existing behavior — payment companions already export); **M-04** owns
  the export's both-sides redesign.
- **Budgets post nothing.** A budget moves no money; its register claim is
  already true. Listing it in the M-02 row was about the claims sweep —
  verified, nothing to change.

## 4. The walkthrough (hand-computed — the test's golden path)

Setup: the 20-row seeded tree (+ 5120 Other Expenses). Party CUST (customer),
party SUP (supplier). BankAccount `1234567890` (bank BK-0001) with
`glAccountCode '1011'`; Account `1011 · HDFC 1234` (asset, parent 1010)
created via create_account.

1. **Invoice** INV ₹1,000 → sub-ledger billed 1,000 (no GL — invoices never
   posted legs; the documented M50 divergence stands).
2. **Debit note** DN ₹200 (fabric, CUST, default debitAccount) → journal
   `JV-DN`: **Dr Sales [4010] 200 / Cr Sundry Debtors [1110] 200**,
   voucherType `debit-note`, partyId CUST. Sub-ledger: 1,000 − 200 =
   **800 outstanding**; bills register deduction column 200.
3. **Receipt** RCP ₹800 (mode `neft`, bankAccountNo `1234567890`) →
   Payment.bankAccountId set; journal `JV-RCP`: **Dr HDFC 1234 [1011] 800 /
   Cr Sundry Debtors [1110] 800**; the plan text carries the codes + the via.
   Sub-ledger: **0** (collected 800, allocation settles the invoice).
4. **Byte-compat**: the same receipt WITHOUT bankAccountNo → Dr Cash/Bank
   [1010] — byte-identical to the M50 behavior (pinned).
5. **Cash + bank given**: mode `cash` with a bankAccountNo → still [1010],
   the plan text says the bank account was not used (no silent ignore).
6. **The nag**: bank mode + a BankAccount with no resolvable `glAccountCode`
   → [1010] + the plan text names the bank and the fix.
7. **Party expense** EXP ₹500 (transport, partyCode SUP) → journal `JV-EXP`:
   **Dr Freight [5020] 500 / Cr Sundry Creditors [2100] 500**, voucherType
   `journal`, partyId SUP → SUP's balance **−500** (we owe). Settle:
   record_payment OUT ₹500 to SUP (mode cash) → **0** — the loop-closure.
8. **Cash expense** EXP ₹300 (general, no party) → **Dr Other Expenses
   [5120] 300 / Cr Cash/Bank [1010] 300**, partyId null.
9. **Cancels**: cancel the DN → note + companion flip `cancelled`, contra
   `CN-JV-DN` (Dr Sundry Debtors [1110] / Cr Sales [4010]); the deduction
   leaves every screen → outstanding back to 1,000 − 800 = 200. Cancel the
   expense → companion flips + contra; SUP's payable re-opens.
10. **The double-reverse probe as a test**: invoice 1,000 → receipt 1,000
    (balance 0) → cancel the receipt → balance **+1,000** (was −1,000).
11. **TB assert**: every active journal carries both FKs; ΣDr == ΣCr grouped
    by account across the whole db.

## 5. Schema

`Payment` + `bankAccountId String?` + relation `bankAccount BankAccount?`
(additive-optional — legacy rows null). `BankAccount` + `glAccountCode
String?`. `COA_TREE` + `{ code: '5120', name: 'Other Expenses', type:
'expense', parentCode: '5100' }` (19→20 rows; every CoA seed path inherits —
seed.ts, seed_coa.ts, the test dbs). No new models (91 stands). db push +
WAL checkpoint + dev-server restart (PITFALLS #50).

## 6. Tests

`tests/pipeline/accounts-m02.test.ts` (~22):
resolveCashLeg paths (cash/control/bank/fallback-nag/unknown-loud/compat) ·
the payment walkthrough (FKs + bankAccountId + strings + plan codes + the
via) · byte-compat pin · the DN walkthrough (legs + claim + ledger + the
companion's voucherType) · DN explicit debitAccount + unknown refusal · the
expense walkthrough (transport→Freight party credit −500 + settle → 0;
general→5120 cash) · expense explicit glAccount · the cancels (DN + expense
companion flips + contras; the settled refusal) · planCancelJournal's new
companion messages · **the double-reverse fix** (the probe scenario) · the
bills-register honesty (cancelled payment leaves collected; cancelled DN
leaves deductions) · the TB assert · wiring pins (schema columns, configs,
prompt m51, docstrings, tree 20). Same-commit: accounts-m01's 19-row pins →
20; m50→m51 version pins; the doc-parity pair if touched.

## 7. Gates

vitest (1491 + ~22 ≈ 1513) · tsc src 0 · context_check NO DRIFT (pins
recomputed; models 91, tools 261, masters 43, m51) · eval --static PASS
(m51) · route_smoke_m51.sh LIVE (payment form bank picker · the 5120 row on
the CoA master · a DN companion on the journal register · the bills-register
honesty doors · the crafted walkthrough with FULL revert) · browser E2E
through the FORM doors (bank-linked receipt → GL legs → cancel re-opens).
