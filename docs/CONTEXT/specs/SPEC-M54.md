# SPEC-M54 — Module M Batch 5: Expense heads (M-05)

Status: committed spec (implementation target). Precedes the M54 feat commit.
Module: M (final accounts) · Phase-6B remediation §13 M-05 — the LAST Module M item.
Depends on: M50 (CoA + the resolve-or-refuse guard), M51 (DE-03 expense GL
legs + `defaultExpenseAccount` + the companion `JV-EXP-`), M4/M5 (the
budget-vs-actual register + `get_budget_vs_actual`), M2 (the master engine).
One new model (91→92); one additive column on Expense.

## 0. Problem

Three gaps, all named by the remediation spec §13 M-05 row:

1. **No head master.** `Expense.category` is a 5-value free string validated
   in code (`posting/expense.ts` `CATEGORIES`) — the legacy `FrmMasExpenses`
   master was never ported (deep-dive §2: "expense category is a 5-value
   free string with no head master"). There is nowhere to say "Knitting
   Transport is a transport head posting to Freight".
2. **The default GL leg is category-blunt.** M51 DE-03: `transport →
   Freight [5020], every other category → Other Expenses [5120]` — the
   catch-all M-05's expense heads were always meant to refine (the M51
   comment says so verbatim).
3. **Expenses are excluded from budget-vs-actual.** `registers/budget.ts`:
   `actual = poValue + prodCost` — the money actually spent on an order via
   the expense book is invisible (deep-dive §2: "expenses are excluded from
   budget-vs-actual math").

## 1. THE ONE SEMANTIC DECISION — THE HEAD REFINES, NEVER BLOCKS

**The head is a preference carrier, not a gate** (the M51
`BankAccount.glAccountCode` pattern, applied to the expense door):

- The head sets the **category** (stored on Expense — every register keeps
  reading it) and the **default GL debit leg**.
- Leg precedence, in order: explicit `glAccount` arg > the head's
  `glAccount` (when resolvable) > the M51 category default
  (`defaultExpenseAccount`, byte-identical — the seeded tree always
  resolves, so the door never blocks on CoA richness).
- The head's `glAccount` is a **plain name-or-code string on the master**
  (deliberately NOT an FK — the BankAccount.glAccountCode discipline): a
  stale or unlinked value falls back to the category default + the honest
  note in the plan text, never a refusal.
- The head **itself**: unknown head = LOUD refusal (an explicit reference,
  the unknown-partyCode discipline — no row, no voucher number burned);
  inactive head = refusal with the reactivation hint (the account master
  pattern). A head given together with a differing `category` → the head
  wins and the plan text says so.
- The **category-only path stays byte-identical** (M51 back-compat: every
  existing pin holds; no head field, no behavior change).

## 2. FRs

- **EH-01 the ExpenseHead master (legacy FrmMasExpenses port)** — Prisma
  `ExpenseHead { id, code @unique (EXH-#### auto), name @unique, category
  (fixed|stylewise|general|transport|other), glAccount String?, active
  Boolean @default(true), createdAt }` (models 91→92, db push + WAL
  checkpoint + dev-server restart — PITFALLS #50). `master-configs/
  expense-head.ts` rides the M2 engine: slug `expense-head`, delegate
  `expenseHead`, codePrefix `EXH-`, titleField `name` (unique — the natural
  key the expense door resolves), category `org`, legacyForms
  `FrmMasExpenses` (FrmExpenseGroup's grouping = the head's category —
  taxonomy family 'expenses'). `/masters/expense-head` auto CRUD; factory
  `create_expense_head` / `update_expense_head` + the `list_expense_heads`
  read door (tools 266→269, masters 43→44). Menu/routes/register configs
  UNCHANGED (the masters hub + the `/masters/[slug]` route already exist —
  the M50 precedent).

- **EH-02 the head drives the door** — `EXPENSE_SCHEMA` + `head` (exact
  ExpenseHead name OR code). `planExpense`: head → `category :=
  head.category` (a differing passed category is overridden + noted in the
  plan text); default debit leg per §1 precedence; `Expense +headId`
  (relation-less free FK, PITFALLS #21 — the page resolves via id-map, the
  orderId/partyId pattern); the stylewise-requires-order rule follows the
  RESOLVED category. Surfaces: the expense form gains the head picker
  (picker 'expense-head', emits the code) + category becomes
  not-required-when-a-head-is-picked (the hint says the head overrides it);
  the expense book + the [id] view gain the Head column/field (headId →
  name via id-map).

- **EH-03 budget-vs-actual finally includes expenses** —
  `expenseSpend = Σ Expense.amount where orderId AND status ≠ 'cancelled'`
  (the M51 cancel flips the doc to 'cancelled' — the companion + contra
  already net the GL; the budget addend must not count the cancelled money
  either). `actual = poValue + prodCost + expenseSpend` in BOTH
  `getOrderBudgetActual` (the agent tool's path) and the register rows;
  `OrderBudgetActual + expenseSpend`; the register config + column
  `expense` (inr, between Production and Actual) + description updated;
  the `get_budget_vs_actual` json gains `actual.expenseSpend` (additive —
  the M3 shape stays, the M53 additive-field precedent) + the description
  names expenses; `planBudget` sideEffects line updated; orders with ONLY
  expenses now appear in the register (the id set gains expense orderIds).
  The HFX-12 shiftWages column stays informational (no writer — L-06 owns
  it). Expenses post no PO/prod lines, so the addend cannot double-count;
  non-order expenses stay overhead (no order link → not in per-order
  actual). Additive: the M4/M5 fixtures carry no Expense rows — every
  existing pin holds.

- **EH-04 surfaces + docs** — prompt §Masters gains the expense-head trio;
  §Accounting's create_expense line gains the head rule; §Costing's
  get_budget_vs_actual line gains expenses; `PROMPT_VERSION
  m54-2026-09-07`; the create_expense docTool description + EXPENSE_SCHEMA
  descriptions updated; STATE #59; MANUAL-TESTING v1.8 (the M53 pattern:
  docs commit after the feat).

- **EH-05 tests + gates** — `accounts-m05.test.ts` NEW (~20: the head
  master door, the walkthrough ×4 (head-account / head-no-account /
  head+explicit / stale-head-fallback+note), the conflict override, unknown
  + inactive refusals, category-only byte-compat, the budget addend +
  cancelled-exclusion + the only-expense order, wiring pins) + same-commit
  pin sweeps (allTools 266→269, masters 43→44, models 91→92, m53→m54
  PROMPT_VERSION) · full gates (vitest / tsc src 0 / context_check NO
  DRIFT / eval --static PASS, registry 259) · `route_smoke_m54` NEW LIVE ·
  browser E2E through the form door with full revert + screenshots.

## 3. Design notes

- **No backfill, no seed.** Expense.category strings stay the truth for
  legacy rows; heads are USER data (the legacy form was user-maintained —
  nothing to seed). The GL legs already exist via the M51 companions; new
  expenses simply get a better default.
- The expense book + the daily P&L keep reading Expense rows directly (the
  cash-side story unchanged — M54 only refines the classification + the
  budget read).
- `name @unique` makes the door's name-resolution deterministic (code is
  also unique; the master engine's update keys on code).

## 4. Non-goals (owner decisions, not invented here)

- Tally XML (decision §17-4, pending the owner — JSON stands).
- L-06 shiftWages (ADR-019 owner decision).
- Per-head budget LINES (BudgetLine.workId is jobwork-scoped; a per-head
  budget structure is not asked for by §13 — order-level budgets + the
  expense addend answer the criterion).
