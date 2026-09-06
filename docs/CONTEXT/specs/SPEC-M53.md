# SPEC-M53 — Module M Batch 4: Tally both sides (M-04)

Status: committed spec (implementation target). Precedes the M53 feat commit.
Module: M (final accounts) · Phase-6B remediation §13 M-04.
Depends on: M50 (CoA + companions), M51 (mode-aware legs + DN/expense
companions + contras), M52 (the GL doctrine reports). Zero new models (91
stands) — read side only, one existing service rewritten.

## 0. Problem

The Tally JSON export (M19 Wave D) is **sales-side only and double-counts**.
It emits SalesInvoice / Payment / every Journal row — but since M50/M51 every
payment, debit note and expense posts a **companion journal** (`JV-*`), so a
payment now appears TWICE: once as its Receipt voucher, once as its companion
Journal voucher. Live db today: 178 receipts + 187 journals for the same
money. SupplierBill and DebitNote/Expense documents are absent from the
export entirely (purchase side invisible), GST rides a single `Output GST`
ledger (remediation §13: "CGST/SGST/IGST split ledgers"), and cancelled
vouchers are excluded with no reversal — an imported Tally book drifts from
the GL.

## 1. THE EXPORT DOCTRINE (the batch's one semantic decision)

**The export mirrors the GL: every journal row renders exactly once — as its
document's voucher or as itself — and the contra row IS the reversal.**

- `JV-RCP-*` / `JV-PMT-*` / `JV-DN-*` / `JV-EXP-*` companions NEVER render as
  journal vouchers; the document voucher (Receipt / Payment / Credit Note /
  Expense Journal) carries their legs. Counted once.
- `CN-*` contras ALWAYS render (type Journal, `reversalOf` = the original) —
  a cancelled transaction appears together with its reversal and nets zero.
  A full-window import into Tally converges to the GL truth (M52 §1 applied
  to the export).
- Document status does NOT filter journal-backed classes (the companion is
  the GL row and it counts); the ONLY status doors are on the journal-less
  classes — SalesInvoice draft/cancelled and SupplierBill draft/cancelled
  excluded, because no GL reversal exists for them (sub-ledger-only events,
  boundary note in the payload).
- Orphan honesty: a `JV-*` row whose document no longer exists (or a manual
  journal whose voucherNo collides with the reserved prefix) falls back to
  journal rendering + a warning — nothing silently drops.
- **Two books, one truth**: party legs render per-party (Tally's book — each
  party is its own ledger); the internal GL nets them under the type control
  (the M52 day-book). Amounts and sides are identical by construction.

## 2. FRs

- **TL-01 voucher coverage (both sides)** —
  - SalesInvoice (status issued/paid) → **Sales**: Dr party · Cr `Sales`
    (taxableValue) + `Output CGST` / `Output SGST` / `Output IGST` (each >0
    only — the split replaces the single `Output GST`) + `Other Charges` +
    `Round Off` (>0 only). billType in the narration, not the ledger name.
  - SupplierBill (status passed/partial/paid) → **Purchase**: Dr `Purchases`
    + `Input CGST` / `Input SGST` / `Input IGST` (>0) + charges · Cr party.
  - Payment (any status — §1) → **Receipt** (in) / **Payment** (out): party
    leg vs the cash leg; the cash leg = mode cash → `Cash/Bank`, bank mode +
    `bankAccountId` → that BankAccount's name, bank mode unlinked →
    `Cash/Bank` + warning (the M51 nag surfaced in the export).
  - DebitNote (any status) → **Credit Note**: legs from its `JV-DN-`
    companion (Dr debitAccount / Cr party); legacy notes without a companion
    derive Dr `Sales` / Cr party.
  - Expense (any status) → **Journal** (source `expense`): legs from its
    `JV-EXP-` companion; legacy rows derive Dr `Freight` (transport) else
    `Other Expenses` / Cr party or `Cash/Bank`.
  - Journal standalone (`V-*` or any non-`JV-`/`CN-` voucherNo, any status —
    §1) → **Journal**, its own two legs; cancelled rows append
    `[CANCELLED]` to the narration.
  - `CN-*` contras → **Journal** with `reversalOf`, narration
    `Reversal: {original} — {reason-ish}`, legs swapped as stored.
- **TL-02 payload shape** — `voucherType` ∈ Sales | Purchase | Receipt |
  Payment | Credit Note | Journal; NEW fields `source` (invoice | bill |
  payment | debit-note | expense | journal) and `reversalOf?`; `counts` =
  { sales, purchases, receipts, payments, creditNotes, journals, reversals };
  NEW `warnings: string[]` (unlinked-bank payments, orphan companions,
  stored-math mismatches: billAmount ≠ taxable + GST + other + roundOff at
  2dp) and `notes: string[]` (the doctrine lines, incl. the honest deferral:
  JSON only — Tally XML is decision §17-4, pending the owner).
- **TL-03 balance assert** — every voucher's ΣDr == ΣCr (2dp); a deviation
  on invoice/bill stored math is a warning, never a silent unbalance.
- **TL-04 surfaces** — `/accounts/tally-export` page: counts grid ×8 (both
  sides), voucher table with the new types, warnings panel, notes block,
  refreshed header copy; `/api/tally` unchanged (same payload, attachment);
  service docstring rewritten (the doctrine).
- **TL-05 agent tool** — `get_tally_export` (accounts domain, read,
  from/to): counts + warnings + first 20 vouchers with ledger lines + notes.
  Tools 265 → 266. Prompt §Accounting gains the Tally line; PROMPT_VERSION
  m53-2026-09-06. Menu/routes/register configs UNCHANGED (bespoke M19 page).
- **TL-06 tests** — `tests/pipeline/accounts-m04.test.ts` (~20) + the
  M19-era `wave-d-registers.test.ts` tally pins updated in the SAME commit
  (counts shape, `Bank`/`Cash` → `Cash/Bank`, warnings).

## 3. Design decisions

- **No schema change, no posting change.** One read service rewritten over
  the six document tables; the legs it emits agree with the posting layer's
  frozen companion strings by construction.
- **Companion legs, not re-derivation, wherever a companion exists** (DN,
  expense): the frozen resolution is the truth; re-deriving would drift.
  Payments resolve from their own row (mode + bankAccountId) because the
  mode lives there.
- **GST split lives in the export only** — invoices/bills post no GL rows,
  so the CoA is untouched (20 rows stand); `Output/Input CGST|SGST|IGST` are
  Tally-side ledger names, like `Purchases` and the party names.
- **`Sales (billType)` retires** → plain `Sales` + billType narration (the
  Tally ledger namespace stays clean; CoA-name parity for the legs that have
  CoA rows: Sales, Freight, Other Expenses, Cash/Bank, bank names).
- **Ordering**: by date, then createdAt — chronological like the day-book.

## 4. Walkthrough (the test scenario)

Unique party + a bank with a linked GL account; craft through the REAL doors
(plan → commit), then export the window:

1. supplier bill passed ₹800 + IGST 80 → Purchase voucher: Dr Purchases 800
   + Input IGST 80 / Cr party 880.
2. bank-linked receipt ₹500 → Receipt: Dr `{bank name}` / Cr `{party}`;
   its `JV-RCP-` companion NOT in the export (counted-once pin).
3. debit note ₹100 (default Sales) → Credit Note: Dr Sales 100 / Cr party;
   companion excluded.
4. expense ₹200 transport + party → Journal (EXP-): Dr Freight / Cr party;
   companion excluded.
5. manual V-* journal ₹12 → Journal (own legs).
6. cancel the receipt → the Receipt voucher STILL exports + `CN-RCP-`
   Reversal Journal (legs swapped) — the pair nets zero (the doctrine pin).
7. cancel the manual journal → the V-* row exports with `[CANCELLED]` + its
   `CN-` mirror — pair nets zero.
8. bank-mode payment with no linked bank → legs `Cash/Bank` + warning line.
9. ΣDr == ΣCr on every voucher; counts = {1,1,1,0,1,2,2 + …} per the set.

## 5. Tests — `tests/pipeline/accounts-m04.test.ts` (~20)

Walkthrough legs ×9 above · counted-once (companions never appear as
journal vouchers — the LIVE double-count regression pin) · contra pairing +
net-zero after cancels · draft/cancelled bill + cancelled invoice exclusion
+ the boundary note · legacy DN/expense derivation · orphan JV-* fallback +
warning · stored-math mismatch warning · window filter · counts shape ·
voucher-type mapping table · `reversalOf` wiring · the tool's presence +
shape (get_tally_export) · prompt m53 pin · tools 266 pin · the wave-d pin
updates ride the same commit.

## 6. Non-goals / deferrals

- **Tally XML import/export** — decision §17-4, owner call; NOT invented
  here (the payload's notes + STATE record the deferral). JSON stands.
- No e-invoice/GSTR payload changes, no new CoA rows, no register-pattern
  migration of the page, no csv twin (the JSON download IS the artifact).
