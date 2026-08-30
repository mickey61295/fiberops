# SPEC-M21 — Waste Receipt (gap-audit §9 P3 lane, legacy FrmWasteReceiptEntry)

> Second six-task run, task 4. Taxonomy: archetype transaction, family grn.
> Gap-audit disposition: "**MAP** — stock-adj variant (waste is tracked
> religiously in knitting units)." Frozen before code (2026-08-30).

## 1. Scope

**In:** Waste Receipt as a stock-adjustment VARIANT doc family (the opening-
stock recipe verbatim): WST-#### docNo space, action='add' fixed, reason
auto-composed `Waste — <class>`; wasteClass ∈ knitting | dyeing | cutting |
packing | general (the waste SOURCE — Tirupur shops track each). DocScreen
form door (/inventory/waste-receipt) + agent tool `receive_waste` (docTool)
over the SAME planWasteReceipt wrapper (ADR-001) — both doors land a
`stock_adjustment_add` StockLedger row via postLedger (ADR-004 bucket rule,
one transaction) whose notes carry the waste class. Menu item in the
inventory group (the base family's group).

**Out:** a dedicated waste REGISTER (the stock-ledger day-book already
renders WST- rows; the DocScreen recent table shows the last 20) · waste
SALES (selling the scrap is a separate future family) · a new txnType
(nothing new — waste rides `stock_adjustment_add`; WST- docNo + notes
distinguish it; a distinct txnType would need a chain.ts note + ADR and buys
nothing today) · print template (not promised).

## 2. Recipe (verbatim from opening-stock, SPEC-M6 §7-D-1)

1. `WASTE_RECEIPT_SCHEMA` in schemas/stock-adj.ts — STOCK_ADJ_SCHEMA.extend
   with action/reason optional-fixed + `wasteClass` required select.
2. `planWasteReceipt` in posting/stock-adj.ts — resolve WST-#### (next free
   from StockLedger docNos), delegate to planStockAdjustment with
   action='add', reason=`Waste — ${wasteClass}` (+ `: ${notes}` when given).
   The base service stays byte-identical.
3. `wasteReceiptConfig` in doc-configs/inventory-variants.ts (docType
   'waste-receipt', numberPrefix 'WST-') — header fields: docNo, godownCode,
   itemType, itemCode, qty, wasteClass (select), receiptDate, notes; list
   columns mirror opening-stock + wasteClass column.
4. Page /inventory/waste-receipt — DocScreen New mode + RecentDocsTable over
   StockLedger docNo startsWith 'WST-' (no [id] view — the ledger rows ARE
   the record, the stock-adjustment deviation pattern).
5. Tool `receive_waste` (docTool, domain 'inventory') → tools 225.
6. Menu item 'waste-receipt' (inventory, DS, phase M21) → menu 132 / routes
   165.

## 3. Tests

`tests/unit/waste-receipt.test.ts` — planWasteReceipt: wasteClass validated
(reject unknown), WST-#### monotonic numbering, reason composition, qty>0 +
unknown item/godown passthrough errors from the base; commit lands a
`stock_adjustment_add` ledger row (docNo WST-, notes carry the class) AND
the CurrentStock bucket increments (postLedger proof, G2-style); doc-config
registry contract (slug present, service.plan function, mirror rule auto via
the doc-configs loop); tool presence + isWrite. Pins: tools 225 ×6,
docTool 53, DOCCFGS 41, menu 132 ×4, routes 165, doc-configs slug list.

`scripts/route_smoke_m21.sh` — page renders (form fields + title), recent
table shows the seeded WST row, menu + sidebar links, tool in registry,
ledger row + bucket visible via the stock register.

## 4. Gates

tsc src/ 0 · vitest green · eval --static PASS · context_check NO DRIFT ·
route_smoke_m21 all-pass · STATE + worklog + commit + push.

## 5. Implementation record

Shipped 2026-08-30. Files: WASTE_RECEIPT_SCHEMA (schemas/stock-adj.ts, +
notes field) · planWasteReceipt + nextWasteNo (posting/stock-adj.ts — the
opening-stock recipe; base service byte-identical) · wasteReceiptConfig
(doc-configs/inventory-variants.ts — rides the variants file, DOCCFGS stays
40) · /inventory/waste-receipt page (DocScreen + RecentDocsTable over
StockLedger WST- prefix, wasteClass recovered from notes) · receive_waste
docTool (tools 225) · menu item waste-receipt (inventory, DS, M21) → menu
132 / routes 165 · NEW_ROUTE_BY_SLUG entry (the M18-C duplicate-door
contract test caught it). Tests: waste-receipt.test NEW 7 (class validation,
base passthrough ×3, reason composition, G2 ledger+bucket proof, registry
contract, base-untouched pin); pins 225 ×6, docTool 53, menu 132 ×4, routes
165, doc-configs slug list. Gates: tsc src/ 0 · 949 vitest · eval --static
PASS · context_check 531→535/535 NO DRIFT · route_smoke_m21 15/15. Traps
this milestone: (a) the mirror rule requires readonly header fields for
schema keys the wrapper injects (action/reason — the opening-stock
precedent); (b) every new doc family needs a NEW_ROUTE_BY_SLUG entry;
(c) DOCCFGS counts FILES not configs — a variant riding an existing file
doesn't move it.
