# SPEC-M36 — Batch 0 Hotfix: Trust One-Liners + Agent Render Stack

> Phase-6B Remediation Spec (docs/PRD/PHASE-6B-REMEDIATION-SPEC.md §3)
> Batch 0 — the 19 HFX hotfixes: 13 correctness one-liners + the 6-layer
> agent render stack that closes owner issue 1. Frozen before code
> (2026-08-31).

## 1. Scope

**In (HFX-01…13 — correctness, no migrations):**
- **HFX-01** `planGrn` guard: refuses a GRN against a >1-line PO (names
  PRC-01 as the limitation) and against cancelled/completed POs (quotes
  the status). Fail loudly instead of silently ignoring lines 2..n.
- **HFX-02** `planPcsDespatch` persists `colourId`/`sizeId` on
  PcsDespatchLine (colourName/sizeName resolved by name — the packing-list
  id-map precedent; unknown names fail loudly). The view + courier/LAD
  print already render colour/size — the write side was the gap.
- **HFX-03** cancelled invoices leave the money screens: party-ledger
  (both fns) + bills-register exclude `status:'cancelled'` — three
  screens, one balance (outstanding-summary already did).
- **HFX-04** only `direction:'in'` payments settle a sales invoice:
  `invoiceRecon` collected + outstanding-summary `settledByInvoice`.
  A tagged OUT-payment (refund/adjustment) never reduces AR.
- **HFX-05** the `partyReceipts` map is CONSUMED: on-account receipts
  (in, no invoiceId) reduce party AR outstanding, oldest aging bucket
  first (FIFO); receipts beyond the outstanding clamp at 0 (the advance
  lives on the party ledger, not in aging).
- **HFX-06** payment modes rtgs + neft join both mode selects (schema
  comment contract cash|bank|cheque|rtgs|neft|upi); tool doc updated;
  new modes commit through unchanged (verified live: rtgs payment
  commits).
- **HFX-07** Party master gains `partyType=employee` (config option +
  schema comment + create/list tool docs) — the wage-payment picker
  filtered to employee parties that could never be created (the picker
  was permanently empty).
- **HFX-08** journal sideEffects honest: "Cash/bank balance updated"
  removed (nothing updates it — no GL); party-linked vouchers claim the
  party-ledger effect only.
- **HFX-09** the `'billed'` ghost dies: jobwork register filter option
  removed, JOBWORK_STATUS retired to [sent, received] until JWL-06
  writes it. No filter selects a state nothing reaches.
- **HFX-10** PO lifecycle writes `'received'` (a PO_STATUS value) —
  never `'completed'` (enum drift since M6); the already-complete guard
  + summary updated to match.
- **HFX-11** NEW `src/lib/erp/valuation.ts` — the shared `valueBucket()`
  per-uom valuation (Σ per-uom qty×rate, dimension-explicit form);
  dashboard stock_value + stock-register rows call it. One source of
  truth for the WAC work to extend.
- **HFX-12** shiftWages readers → `amount` (the piece-rate wage actually
  posted — the column has NO writer, grep-verified): daily-pnl wages =
  Σ amount, produced = qty × order contract rate (totalValue×fxRate /
  totalPcs, cost-basis fallback) so Wages AND Margin are non-zero for
  any day with production; budget-vs-actual shiftWages field reads
  amount with the double-count addend DROPPED (actual = poValue +
  prodCost — identical on live data); production-status + operation-
  summary wage columns read amount ('Shift wages' label → 'Wages').
  L-06 later resolves the column itself.
- **HFX-13** vitest pinned off the production DB: globalSetup copies
  custom.db → db/test.db once per run (the e2e copy-then-boot
  precedent), setupFiles pin DATABASE_URL before any module import;
  PRAGMA database_list asserted in-test. `npm test` NEVER opens
  custom.db (it did — 1112 tests mutating the live database).

**In (HFX-14…19 — agent render stack, owner issue 1):**
- **HFX-14** `/api/agent` streams for real: `stream:true`, content
  deltas pass through VERBATIM (the fake 4-char regex chunker whose
  dot-class never matched `\n` — every newline in every assistant
  message was deleted in transport — is gone); tool_call fragments
  stitched by index across chunks.
- **HFX-15** assistant text renders via react-markdown + **remark-gfm
  (NEW dependency)**: headings, bold, pipe tables, links, code blocks
  styled to the panel theme (tailwind arbitrary-variant selectors —
  no typography plugin).
- **HFX-16** narration persists across tool calls: NEW
  `src/lib/agent/narration.ts` (pure appendDelta/mergeNarration,
  unit-tested) — segments keyed by the transport's text id; the old
  replace-buffer wiped "Let me check stock…" the moment a tool call
  fired, in the UI AND the history sent next turn.
- **HFX-17** auto-scroll actually scrolls: the effect targets the Radix
  Viewport (`[data-slot=scroll-area-viewport]`), not the inner content
  div (a no-op since M10).
- **HFX-18** every non-OK response surfaces INLINE: `res.ok` checked;
  5xx/429/network/mid-stream errors render an error chip with Retry
  (re-sends the exact last prompt) — toasts are invisible (Toaster
  unmounted until PRD P0-1).
- **HFX-19** exactly one close affordance: the panel's duplicate header
  X removed; the universal SheetPrimitive.Close X remains.

**Out (documented):** the Toaster mount itself (PRD P0-1) · a general
formatting contract in the system prompt (Batch 2 CHAT) · real
multi-line GRNs (PRC-01) · the WAC valuation (Batch 1+; valueBucket is
the seam) · shiftWages writer-or-drop (L-06) · remark-breaks for
soft-newline text (model output is markdown; revisit if the owner
reports joined lines).

## 2. Design notes

- All 19 are behavior-preserving-or-honest: HFX-12's budget `actual` is
  numerically identical on live data (shiftWages was always 0); only
  hand-seeded test fixtures see changed numbers (updated).
- HFX-12 daily-pnl produced-value: the order's contract rate is the only
  revenue-side rate in the schema (205/208 live orders carry totalValue);
  margin = contract-vs-piece-rate spread — the number the owner actually
  wants from a daily P&L. FX orders convert at fxRate first.
- HFX-13 keeps current test semantics EXACTLY (same data + schema, on a
  disposable copy) — the isolation contract, not a fixture rewrite.
- HFX-14 keeps the manual agent loop (step model, MAX_STEPS, audit
  writes) — only the completion consumption changed shape.

## 3. Tests

`tests/pipeline/hfx-batch0.test.ts` — one pin per HFX (19): behavioral
through the real posting/register services (01–03, 04+05 combined,
06–08, 10, 12, 13) + source-contract pins for the transport/UI layers
that cannot run headless (14–19, plus 11's call-site pins); narration
helpers tested pure. Updated existing pins: register-services
(production-status wages, budget actual), report-services (daily-pnl
produced/wages/margin), doc-parity-m6c (PO complete → received).

## 4. Acceptance gates

tsc src/ 0 · **1131 vitest** (1112+19) · eval --static PASS ·
context_check 574→581/581 NO DRIFT (+SPEC-M36 +valuation.ts +narration.ts
+hfx-batch0.test.ts +route_smoke_batch0.sh +tests/setup/pin-test-db.ts
+tests/setup/global-setup.ts) ·
NEW route_smoke_batch0 **15/15** (live SSE reconstruction: 67 deltas, 8
newlines survived; money/jobwork/payments screens; RTGS/NEFT options) ·
LIVE browser-verified (panel: real HTML table w/ Code|Name headers + 0
literal pipes; pre-tool narration + post-tool summary both present with
tool cards; Viewport pinned to bottom (0px from bottom); ONE Close;
screenshots m36-agent-panel-table.png + m36-agent-panel-markdown.png,
VLM-confirmed).
