# SPEC-M8 — Hardening: Doc-Family Print Templates

> **FROZEN IMPLEMENTATION SPEC.** Written BEFORE any M8 code (rule:
> spec-before-code, `docs/CONTEXT/00-START-HERE.md` #3). A session with ZERO
> chat context implements M8 Wave A correctly from this file alone.
> Lineage: STATE next-actions #7 lists M8 candidates — hardening (E2E, print
> templates per doc family, agent prompt polish), multi-company/finyear chain
> (deferred SPEC-M7 §2), Tally export (SKIP, revisit on demand only).
> Wave A takes the print templates: the highest-value, most-concrete gap —
> reports print since M6-A but the 20 doc detail pages don't.

## 1. Goal

Every print-critical document family gets a proper A4 PORTRAIT print sheet —
the legacy ERP's paper artifacts: tax invoice, purchase order, goods receipt,
payment/receipt voucher, jobwork DC. ONE engine (PrintSheet) + ONE route
(`/print/[docType]/[id]`) + per-family fetchers (the DocScreen/config-registry
pattern, print edition). Browser print only — the SPEC-M6 §3-3 decision
("no bespoke PDF engine") carries forward: `window.print()` + print CSS.

**Acceptance (all must pass):**
1. `npx tsc --noEmit` — src/ stays 100% clean (0 errors).
2. `npx vitest run` — 653 existing tests green + new print tests green.
3. GET `/print/invoice/{id|invoiceNo}` (and po/grn/payment/dc) → 200 with the
   sheet; unknown docType → 404; unknown id → 404.
4. Unauthenticated GET `/print/invoice/x` → 307 `/login` (middleware layer 1;
   `/print/*` maps to no menu group so no rights pre-check — printing is a
   read; the doc VIEW routes stay rights-gated by their groups).
5. The 5 doc view pages show a Print button → opens the print route.
6. `bash scripts/context_check.sh` → NO DRIFT (counters updated: +1 route not
   in menu-registry so LIVEROUTES stays 145; print-lib files counted).
7. `npx next build` → EXIT 0.

## 2. Non-goals (explicitly OUT of M8-A)

- **No PDF generation, no print preview library** — browser print CSS only.
- **No new agent tools** — tools stay 188 (printing is a human act).
- **No schema change** — 65-model pin holds; print reads existing tables.
- **No per-customer print template customization** — AppOption print.* keys
  (company masthead) + copy convention (Original/Duplicate/Triplicate) only.
- **No rights matrix entry for /print** — the route is session-gated; doc
  families' own VIEW pages stay rights-enforced by their menu groups.
- Remaining 15 doc detail families (debit-note, journal, budget, cost-sheet,
  expenses, cutting job-order, gate-entry/pass, samples, despatch, packing
  list, rejection, production entry/issue, lab-tests) — Wave B+ candidates;
  the engine + registry make each a ~40-line fetcher.

## 3. Architecture — one engine, one route, per-family fetchers

```
src/lib/erp/print/types.ts        PrintDoc — the normalized print shape
                                   (title/copy/docNo/date/party/meta/lines/
                                   totals/amountWords/signatures/notes)
src/lib/erp/print/amount-words.ts Indian-numbering amount-in-words
                                   (crore/lakh/thousand/hundred + paise)
src/lib/erp/print/fetchers.ts     5 fetchers — resolve by db id OR doc no
                                   (the established pattern), build PrintDoc:
                                   invoice, po, grn, payment, dc
src/lib/erp/print/index.ts        PRINT_DOCS registry { docType → fetcher } +
                                   getPrintDocTypes()
src/components/erp/print-sheet.tsx  server: A4 portrait sheet — masthead
                                   (getPrintHeader → AppOption print.*),
                                   copy banner, party+meta grid, line table,
                                   totals, amount-in-words, signatures, terms
src/components/erp/print-auto.tsx   client: auto window.print() on mount
                                   (once; ?autoprint=0 skips) — the shim
src/app/(erp)/print/[docType]/[id]/page.tsx  ONE registry-driven route
```

**Print CSS:** the M6-A globals.css block is A4 LANDSCAPE (reports). The print
route inlines `@media print { @page { size: A4 portrait } }` in a page-level
`<style>` — cascade order puts it after globals.css, so the doc sheet prints
portrait while report pages stay landscape. The on-screen preview shows the
sheet at 210mm width (white page, subtle shadow) inside the app shell; print
CSS hides nav/aside/header as since M6-A.

**Amount in words** — Indian convention (the legacy convention):
`₹20,50,065` → "Rupees Twenty Lakhs Fifty Thousand and Sixty Five Only".
Handles 0, paise (`and Paise Forty Five Only`), crore (max 99 crore — beyond
prints the digits verbatim; the ERP's realistic range).

## 4. Wave A — the 5 print-critical families

| docType | Model | Doc no | Sheet title | Notes |
|---|---|---|---|---|
| `invoice` | SalesInvoice | invoiceNo | TAX INVOICE | GST split rows (CGST/SGST vs IGST by igstRate>0), qty, billType export note, EOU/export prints "SUPPLY FOR EXPORT" line |
| `po` | PurchaseOrder | poNo | PURCHASE ORDER | lines: S.No/item/qty/rate/amount (item codes resolved via yarn/fabric/accessory maps — the view-page pattern), delivery date, supplier block |
| `grn` | GRN | grnNo | GOODS RECEIPT NOTE | party + godown + partyDcRef, lines same resolution |
| `payment` | Payment | voucherNo | PAYMENT VOUCHER / RECEIPT VOUCHER (direction) | mode/reference/against invoice+order; no lines — single amount + words |
| `dc` | JobworkOrder | dcNo | DELIVERY CHALLAN (JOBWORK) | jobworker block, processType, qty, out/expected dates; the goods-accompanying print |

All fetchers: `findUnique({ id })` catch-null → `findUnique({ <noField> })` →
null → 404 (the view-page resolution pattern, reused verbatim).

## 5. The view-page door

The 5 detail pages (`/accounts/invoice/[id]`, `/procurement/po/[id]`,
`/procurement/grn/[id]`, `/accounts/payments/[id]`, `/jobwork/order/[id]`)
get a `DocPrintButton` (client) next to the breadcrumb: `Link` to
`/print/{docType}/{id}?copy=original` — the print route's own PrintButton
(clone of the report PrintButton, route-aware) handles copies + window.print.

## 6. Test plan

- `tests/unit/amount-words.test.ts` — 0/₹0, single digits, 100/1000/100000
  (lakh boundary), 10000000 (crore), 205065 → "Twenty Lakhs Fifty Thousand
  and Sixty Five", paise, 99-crore cap, >99 crore digit fallback.
- `tests/unit/print-docs.test.ts` — registry completeness (5 docTypes), each
  fetcher against a seeded fixture: shape assertions (title/docNo/party/
  totals present; invoice GST rows; po lines resolved to codes; payment
  direction title), unknown id → null.
- Route smoke (script `scripts/route_smoke_m8a.sh`): login → 5 print routes
  200 + title grep, unknown docType 404, unknown id 404, unauth 307.

## 7. Acceptance counters (frozen after Wave A)

- vitest: 653 + amount-words + print-docs (+ smoke adjustments) — pin updated
  in context_check.sh + STATE.
- tools 188 (unchanged) · models 65 (unchanged) · LIVEROUTES 145 (unchanged —
  /print is not a menu item) · actual page routes 145→146 (STATE text note).
- context_check: +print-lib counter (src/lib/erp/print/*.ts = 4), +print route
  EXISTS probe, +print-sheet/print-auto/DocPrintButton existence, menu-registry
  test count unchanged.

## 8. Wave B — the remaining 15 doc detail families (DONE, tag `m8-wave-b`)

§2's Wave-B candidates list, closed. One file (`src/lib/erp/print/fetchers-b.ts`,
~560 lines) + registry entries + view-page doors; the Wave-A engine/route/
sheet needed ZERO changes — the registry pattern held exactly as §2 predicted
(~40 lines per family).

| docType | Model | Resolution | Sheet title | Notes |
|---|---|---|---|---|
| `debit-note` | DebitNote | id OR noteNo | DEBIT NOTE | party ledger adjustment; cancelled banner |
| `journal` | Journal | id OR voucherNo | `${voucherType} VOUCHER` | Dr/Cr two-line table; narration footer |
| `budget` | Budget | **id only** | BUDGET | docNo `BGT-<orderNo>` (no unique doc-no field); BudgetLine rows + Budgeted/Actual/Variance totals |
| `cost-sheet` | CostSheet | **id only** | COST SHEET | docNo `v<version>`; component lines; Total Cost → Selling Price totals |
| `expense` | Expense | id OR expNo | EXPENSE VOUCHER | party via free-FK lookup (PITFALLS #21) |
| `cut-order` | CutOrder | id OR cutNo | CUTTING ORDER | marker/plies/efficiency meta; bundle count |
| `gate-entry` | GateEntry | id OR entryNo, **gateType='in' filter** | GATE ENTRY | §4 rule-2: an OUT entry 404s here |
| `gate-pass` | GateEntry | id OR entryNo, **gateType='out' filter** | GATE PASS | same model, opposite filter |
| `sample` | Sample | id OR sampleNo | SAMPLE CARD | buyer party block; approved/rejected notes |
| `pcs-despatch` | PcsDespatch | id OR dcNo | DESPATCH CHALLAN (PIECES) | colour/size name maps (view-page pattern); line value + words |
| `packing-list` | PackingList | id OR packNo | PACKING LIST | carton lines + net/gross kgs totals; despatch DC meta |
| `rejection` | RejectionEntry | id OR rejNo | REJECTION NOTE | rejType/action meta; qty totals |
| `production-entry` | ProductionEntry | **id only** | PRODUCTION ENTRY / REWORK ENTRY (rework flip) | docNo = bundleNo (not unique — id resolution only) |
| `line-issue` | LineIssue | id OR issueNo | LINE ISSUE SLIP | line code via relation |
| `lab-test` | LabTest | id OR testNo | LAB TEST REPORT | values JSON → parameter/result rows; Result total |

**Doors**: `DocPrintLink` on the 14 remaining view pages — gate-view.tsx is
shared by /dispatch/gate-entry/[id] and /dispatch/gate-pass/[id] and picks the
docType by gateType, so 19 files carry doors for 20 families' worth of routes.

**Wave-B helpers**: Wave-A's `d/inr/qty/partyBlock/getCompanyName` are now
exported from fetchers.ts — ONE formatting convention across all 20 families.

**Tests**: `tests/unit/print-docs-b.test.ts` (18) — full fixture graph
(party/buyer/order/department/line/employee + 15 docs), per-family shape
assertions, gate type-mismatch null, id-vs-docNo resolution, unknown→null
matrix over all 15. Route smoke `scripts/route_smoke_m8b.sh` (38 checks):
unauth 307, 15×200+title-grep, copy banner, gate mismatch 404, unknown 404s,
15 view-page doors, seeds+cleans debit-note/budget fixtures when those
tables are empty (they were empty in the dev DB at freeze time).

**Acceptance**: tsc src/ 0 errors · vitest 691/691 (673+18) ·
route_smoke_m8b 38/38 · context_check 369/369 (+6 checks: families-20,
doors-19, 4 file-existence; print-lib pin 4→5 for fetchers-b.ts) ·
next build EXIT 0 · tools 188 / models 65 / LIVEROUTES 145 — all pins held.
