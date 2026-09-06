# SPEC-M52 — Module M Batch 3: final-accounts reports (M-03)

Status: committed spec (implementation target). Precedes the M52 feat commit.
Module: M (final accounts) · Phase-6B remediation §13 M-03.
Depends on: M50 (CoA + journal FKs + backfill), M51 (true double-entry legs +
per-bank GL rows). Zero new models (91 stands) — this batch is PURE read side.

## 0. Problem

Every journal leg now classifies to an Account (M50) and the money doors post
true double-entry legs (M51) — but the GL is unreadable: there is no trial
balance, no day-book, no cash-book, no P&L, no balance sheet among the 41
register slugs. The operator can drill one voucher or one party, never the
books. Remediation §13 M-03: "Trial balance (debits == credits asserted),
day-book, cash-book, minimal P&L + balance sheet — registry pattern + CSV +
agent tools."

## 1. THE GL DOCTRINE (the batch's one semantic decision)

**Every journal row counts in the GL regardless of `status`.** The status
flag is SUB-LEDGER truth-ownership (DE-04: which screen nets what — the party
ledger counts active payments + manual active journals only), NOT GL
semantics. The GL's reversal mechanism is the CONTRA ROW ITSELF:

- payment-cancel: the companion journal stays active + `CN-` contra (net 0)
- journal/DN/expense-cancel: the original flips to 'cancelled' AND a `CN-`
  mirror is written — counting all rows the mirror compensates exactly (net 0)

Consequence: ΣDr == ΣCr is STRUCTURAL (every row contributes its amount once
to each side), and every cancel nets to zero in the GL while the audit trail
stays complete. Counting only 'active' rows would UN-cancel the
journal-cancel path (the mirror alone would double-reverse) — the exact bug
class DE-04 fixed on the sub-ledger side, here by refusing the filter.

Honesty door: rows with a null FK (pre-backfill residue — should be zero on
seeded dbs) are counted and REPORTED (a loud warning line, never a silent
drop, never a 500).

## 2. FRs

- **FA-01 trial-balance** — `/accounts/trial-balance` (slug
  `trial-balance`, tool `get_trial_balance`, csv twin). One row per Account
  with ≥1 journal leg in the window: code, name, type, Dr Σ, Cr Σ, net +
  side (Dr/Cr). Sorted by code. from/to window (default: all time). Totals:
  Rows · Debit ₹ · Credit ₹ · Unlinked rows (0 expected). The summary line
  ASSERTS the balance (Δ = |ΣDr − ΣCr|, 2dp) — "balanced" is a claim the
  screen makes only when it is true.
- **FA-02 day-book** — `/accounts/day-book` (slug `day-book`, tool
  `get_day_book`, csv). The chronological GL voucher register: every journal
  row (all voucherTypes, all statuses — §1), columns date · voucher · type ·
  Dr account [code] · Cr account [code] · party · amount · narration ·
  status. Filters from/to + variant (voucherType: all | receipt | payment |
  journal | contra | debit-note) + q (voucher/narration/party contains).
  Cancellation honesty: a cancelled row renders its status badge, and its
  CN- mirror sits right under it — the audit visible, the net honest.
- **FA-03 cash-book** — `/accounts/cash-book` (slug `cash-book`, tool
  `get_cash_book`, csv). The cash family = account 1010 + its direct children
  (the per-bank GL rows). Rows = journal legs touching the family in the
  window: date · voucher · particulars (the OTHER leg + code) · inflow (Dr
  family) · outflow (Cr family) · running balance. Opening balance = family
  net before `from`; closing = opening + window net. Variant filter: `all`
  or one family account code. Chronological order (date, then createdAt).
- **FA-04 final-accounts** — `/accounts/final-accounts` (slug
  `final-accounts`, tool `get_final_accounts`, csv; variant `pl` | `bs`),
  from/to window:
  - P&L: income accounts (net Cr) + expense accounts (net Dr); Net P&L =
    income − expense.
  - BS: assets (net Dr) · liabilities + equity (net Cr) · **Retained
    earnings for the window** = the P&L net → Assets vs Liabilities + Equity
    + P&L, Δ asserted = 0. (Proof: ΣDr == ΣCr ⇒ ΣA.netDr = ΣL.netCr +
    ΣE.netCr + ΣI.netCr − ΣX.netDr = Liab + Equity + NetP&L — structural.)
- **FA-05 wiring** — 4 register services + 4 configs + 4 pages + 4 csv
  routes (RegisterScreen archetype, one service both doors — ADR-001);
  REGISTER_SERVICES/config registries; menu items ×4 (accounts group) →
  143→147; LIVE_ROUTES → 179→183; tools 261→265 (four read tools); prompt
  §Accounting gains the final-accounts line + PROMPT_VERSION
  m52-2026-09-06; docstrings; context_check pins recomputed (tools 265,
  menu 147, routes 183, regcfg files 31→35, regsvc files 43→47, m52).

## 3. Design decisions

- **No new models, no new posting code.** Pure read services over Journal +
  Account (+ Party for labels). The reports are the first consumers of the
  M50/M51 substrate — that is the point.
- **Window semantics**: Journal.date DateTime; `from` = midnight, `to` =
  endOfUtcDay (resolve.ts's existing discipline). Default no window = all
  time (a TB is as-of; the operator narrows with from/to).
- **The cash family is CoA topology, not code-prefix guessing**: 1010 +
  children-by-parentId. A bank GL row created elsewhere in the tree is the
  operator's CoA choice (CA-01 freedom) and stays where they put it.
- **No finYear filter v1**: from/to covers FY scoping; a finYear preset is
  additive later (the register filter key set is frozen — `variant` +
  from/to suffice).
- **Day-book vs /accounts/journal**: the DS create door stays; the day-book
  is the read-side register. Both linked from the accounts group.
- **Register contract compliance**: every config needs ≥1 filter, ≥1 column
  (formats in the frozen set), ≥1 read agentTool, askPrompt, emptyMessage;
  ROUTE_BY_SLUG + page.tsx + csv/route.ts on disk + LIVE_ROUTES membership
  pinned by tests (the register-configs suite loop).

## 4. Walkthrough (the test scenario)

Seed-clean CoA + a party; craft through the REAL doors (plan→commit):
1. bank-linked receipt ₹1,000 (Dr bank 1011-family / Cr Sundry Debtors) →
   TB: 1011-family +1,000 Dr, 1110 +1,000 Cr, balanced; cash-book inflow
   1,000, closing 1,000.
2. cash expense ₹400 transport+party (Dr Freight / Cr Sundry Creditors) →
   P&L expense 400; BS assets 1,000 vs liab 1,000 + equity 0 + P&L −400
   … wait — with the receipt party leg being a liability-side Cr, the BS
   identity: assets 1,000 (bank) vs liabilities 1,000 (debtors Cr side
   nets negative asset? see test math — the ASSERT is the identity, the
   crafted rows pin each account's net sign).
3. cancel the receipt → day-book shows the original + CN- contra under it;
   TB net UNCHANGED at every account (the doctrine pin); cash-book shows
   the contra outflow −1,000 → closing back to 0.
4. P&L after: expense 400, income 0 → net −400. BS asserts Δ=0 with the
   retained-earnings line = −400.

## 5. Tests — `tests/pipeline/accounts-m03.test.ts` (~20)

Math pins: TB rows/side/balance-assert + unlinked honesty · day-book
chronology + filters + the cancel pair visible · cash-book family detection
(parent-link, not prefix) + opening/closing + running + contra netting ·
P&L nets · BS identity incl. retained earnings · **the doctrine pin** (a
journal-cancel leaves the TB nets unchanged — the §1 proof) · services
delegate the same shapes as the tools (bijection via register-configs
suite). Wiring pins: 4 slugs in the sorted list + ROUTE_BY_SLUG ×4 + pages
+ csv files on disk + LIVE_ROUTES · tools 265 + the four names read-only ·
menu 147 · PROMPT_VERSION m52 · context_check.sh pins. Same-commit pin
updates: register-configs.test (slug list + tools 261→265), menu-registry
(143→147 ×3), accounts-m01 (261→265 + comment), m51→m52 version pins across
the suite, prg-batch7 startsWith m51→m52.

## 6. Gates

vitest (1523 + ~20 ≈ 1543) · tsc src 0 · context_check NO DRIFT (pins
recomputed: tools 265, menu 147, routes 183, regcfg 35, regsvc 47, m52) ·
eval --static PASS (m52) · route_smoke_m52.sh LIVE (the 4 screens + csv
doors + the crafted walkthrough with full revert) · browser E2E through the
screens (TB balanced line → day-book cancel pair → cash-book closing → P&L
net) · MANUAL-TESTING v1.6 + STATE #57 + worklog. PAT push when the token
is re-supplied (6 local commits ride along).
