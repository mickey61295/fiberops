# SPEC-M3 — PostingEngine + DocScreen Engine + the 15-Stage Chain Forms

> **FROZEN IMPLEMENTATION SPEC.** Written BEFORE any M3 code (rule: spec-before-code,
> `docs/CONTEXT/00-START-HERE.md` #3). A session with ZERO chat context implements
> M3 correctly from this file alone. Sources verified against:
> `prisma/schema.prisma` (54 models — the RECONSTRUCTED schema, read post-rollback-#4),
> `src/lib/agent/tools.ts` (120 tools; 22 transaction write tools inventoried below),
> `src/lib/erp/menu-registry.ts` (42 M3-phase items), PLAN-2.0 §4.2 / §4.6 / §6-M3 / §7.
> Status: APPROVED FOR IMPLEMENTATION.

## 1. Goal

Make the **full Tirupur knitwear chain executable entirely through forms**, with the
agent as the twin door — and extract the posting logic so the two doors are
structurally guaranteed to behave identically (ADR-001 at transaction scale).

Three deliverables:

1. **PostingEngine extraction** — all 22 transaction write tools in `tools.ts` become
   thin delegates over per-op service functions in `src/lib/erp/posting/`, validated
   by shared zod schemas in `src/lib/erp/schemas/`. Zero behavior change (the
   industry-chain E2E must stay green, untouched).
2. **DocScreen engine** (`src/components/archetypes/doc-screen.tsx`) + per-doc
   configs (`src/lib/erp/doc-configs/`) — the header card + line grid + totals +
   chain bar transaction screen, in three modes: New / View / AI-prefill.
3. **The M3 wiring slice** — W1 (chain mini-pipeline bar + pre-filled "Next →" CTA,
   powered by ONE chain definition shared with `suggest_next_step`), W3 (Order Hub
   `/orders/[id]` — the whole document family with rollups), W4 (searchable pickers
   with create-on-the-fly), `nextFormUrl` in `suggest_next_step` output, and the
   `/api/upload` rebuild that feeds AI-prefill.

**Live menu items after M3: 24 of 113** (4 current + 20 new, §8). Live groups: 14 of 17
(+programs, +pieces, +jobwork). Agent tools: **122** (120 + 2 new, §11).

**Acceptance (all must pass):**
1. `npx vitest run` — all existing 111 tests stay green THROUGH the extraction
   (Wave A ends with zero test edits except additive), plus new suites:
   `tests/pipeline/doc-parity.test.ts` (§13) and extended industry-chain form-door
   assertions.
2. `npx tsc --noEmit` — no NEW errors beyond the 32-error known noise list
   (STATE drift #6).
3. The 15-stage chain runs form-only: a tester with the agent panel CLOSED can go
   order → BOM → program → PO → GRN → jobwork out/in → cut → issue-to-line →
   production → rework/rejection → despatch → invoice → cost sheet → payment,
   using only DocScreens, Order Hub navigation, and W1 "Next →" CTAs.
4. **Form↔agent parity is test-asserted for every chain op**: form server action
   (service→commit) and agent tool (execute→plan→approve→commit) produce
   IDENTICAL StockLedger rows (txn type + qty + godown) and doc rows.
5. `/orders/[id]` shows the order's full document family grouped with qty/value
   rollups; every family row links to its doc view; every doc view links back.
   ≤1 click from hub to any related document.
6. `suggest_next_step` output includes `nextFormUrl` (the W1 twin of the skeleton).
7. Every DocScreen reference field is a W4 picker with create-on-the-fly (draft
   preserved); the mini pipeline bar renders on every doc screen with the current
   stage highlighted.
8. `/api/upload` accepts a file, extracts text (docExtract), returns
   `{ fileName, text }`; DocScreen "Fill with AI" seeds the agent panel with doc
   context + extracted text; the agent's proposal lands in the form for review.
9. Route smoke: all 20 new item routes + their `/[id]` view routes → 200; unknown
   ids → 404. All 14 previous live routes stay 200.
10. `scripts/context_check.sh` updated for M3 reality — all green.
11. `parityStats()`: 24/113 items live, 14/17 groups.

## 2. Non-goals (explicitly OUT — re-sequenced by ADR-014)

- **No RegisterScreen** — order-enquiry, program-status, and every RG-arch item
  stay "coming" (M4). M3 doc routes embed only a minimal "recent 20" table, not
  the filtered/grouped register engine.
- **No ApprovalInbox flows** — grn-acceptance, cutting-ack, pcs-grn-acceptance
  (GAN), lot-approval stay "coming" (M4/M5). The `/approvals` shell remains.
- **No DC family** (dc-entry, process-dc, dc-return: fabric/yarn/acc/general DCs),
  **no pcs-receipt / pcs-transfer**, **no ready-to-cut / cutting-issue /
  cutting-production**, **no multi-process GRN** — these need NEW posting tools
  (`create_dc`, `transfer_stock` general-form, `issue_fabric_to_cut`,
  `ready_to_cut` standalone) and land in M5 extended families. The CHAIN does not
  need them (jobwork + pcs-dc cover the chain's material flows).
- **No order amendments / order-close / program-cancel / program-complete /
  po-cancel-complete screens** — the cancel tools exist (`cancel_order`,
  `cancel_purchase_order`, `cancel_invoice`); a unified "cancel/close" action
  appears on the doc VIEW (§9.4) rather than separate menu screens. Items stay
  "coming" until M5 decides their fate (likely absorbed as hub actions → then
  marked live-by-absorption with a plan §3 note).
- **No printing** (M6), no W6 reconciliation panels (M4), no multi-company.
- **No line-status DB screen** (M4/M6 — needs WIP rollups).
- **No schema changes** (ADR-013 still holds — the reconstructed 54-model schema
  is the M3 baseline; ADR-014 may only ADD if a blocker is found, never mid-wave).

## 3. Architecture — what moves where

```
BEFORE (M2 world)                          AFTER (M3 world)
─────────────────────────                  ─────────────────────────
tools.ts (120 tools, ~3.2k lines)          tools.ts (thin: schema + delegate)
  create_order { schema, execute(           src/lib/erp/chain.ts          ← ONE 15-stage def
    …200 lines of logic }                    src/lib/erp/schemas/order.ts   ← shared zod
                                             src/lib/erp/posting/order.ts   ← planOrder/commitOrder
                                             tools.ts create_order:
                                               schema: ORDER_SCHEMA
                                               execute: (a) => planOrder(a)
  (same for all 22 transaction writes)
form door: none                            (erp)/<module>/<entity>/actions.ts → same service
suggest_next_step (inline PIPELINE)        reads chain.ts; adds nextFormUrl
docExtract.ts (orphaned survivor)          /api/upload route + DocScreen AI-prefill
```

Rule (ADR-001, CONVENTIONS): the service OWNS all business logic — lookups,
validation, numbering, ledger effects, projector updates. The tool is schema +
delegate; the form action is FormData coercion + delegate. If logic is needed in
two places, it goes DOWN into the service.

## 4. `src/lib/erp/chain.ts` — the ONE chain definition (ADR-007)

Extracted verbatim from `tools.ts` PIPELINE, then extended. Frozen shape:

```ts
export interface ChainStage {
  step: number            // 1..15
  name: string            // 'Order created (sales order from buyer PO)'
  tool: string            // 'create_order'
  produces: keyof ChainState   // 'order' | 'bom' | 'program' | 'po' | 'grn' | ...
  formUrl: string         // W1 target: '/orders/new' | '/procurement/po' | ...
  formParam?: string      // query param carrying context: 'order' (orderNo) | 'po' …
}
export const CHAIN: ChainStage[] = [ /* the 15 rows, verbatim names+tools */ ]
export function nextStage(state: Partial<ChainState>): ChainStage | null
export function stageFormUrl(stage: ChainStage, ctx: { orderNo?: string; poNo?: string }): string
```

- `suggest_next_step` (stays in tools.ts as the read tool) imports `CHAIN` and
  adds `nextFormUrl: stageFormUrl(nextStep, { orderNo })` to its json — W1's
  agent-side twin. The PIPELINE const in tools.ts is DELETED (single source).
- The DocScreen chain bar (§10.1) imports the same `CHAIN`.

## 5. Posting service inventory (frozen — 22 ops)

Pattern per CONVENTIONS §"Posting service pattern", mirroring `master-service.ts`:
two-phase plan/commit so the agent approval flow is unchanged.

```ts
// src/lib/erp/posting/<op>.ts
export async function plan<X>(input: XInput): Promise<XPlan>   // reads db, resolves FKs by code/name, validates, computes docNo
export interface XPlan {
  summary: string
  creates: { table: string; data: Record<string, unknown> }[]
  updates?: { table: string; id: string; data: Record<string, unknown> }[]
  sideEffects: string[]
  commit(): Promise<XCommitted>                                  // db.$transaction — the ONLY write path
}
```

| # | tool (today) | service file | plan/commit fns | schema file | ledger effects (assert in tests) |
|---|---|---|---|---|---|
| 1 | create_order | posting/order.ts | planOrder | schemas/order.ts | none (doc only) |
| 2 | create_bom | posting/bom.ts | planBom | schemas/bom.ts | none |
| 3 | create_program | posting/program.ts | planProgram | schemas/program.ts | ProgBalanceYarn/Fabric req+ |
| 4 | create_purchase_order | posting/purchase-order.ts | planPurchaseOrder | schemas/purchase-order.ts | none |
| 5 | receive_grn | posting/grn.ts | planGrn | schemas/grn.ts | purchase_grn IN + CurrentStock |
| 6 | create_jobwork_order | posting/jobwork.ts | planJobworkOut | schemas/jobwork.ts | process_delivery OUT |
| 7 | receive_jobwork | posting/jobwork.ts | planJobworkIn | schemas/jobwork.ts | process_receipt IN |
| 8 | create_cut_order | posting/cut.ts | planCutOrder | schemas/cut.ts | ready_to_cut_in pcs + fabric OUT |
| 9 | issue_to_line | posting/line-issue.ts | planLineIssue | schemas/line-issue.ts | ready_to_cut_out pcs |
| 10 | post_production_entry | posting/production.ts | planProductionEntry | schemas/production.ts | production_in pcs |
| 11 | post_rework | posting/production.ts | planReworkEntry | schemas/production.ts | document-only |
| 12 | post_rejection | posting/rejection.ts | planRejection | schemas/rejection.ts | rejection_out (scrap/return) |
| 13 | create_pcs_despatch | posting/despatch.ts | planPcsDespatch | schemas/despatch.ts | sales_delivery pcs |
| 14 | create_sales_invoice | posting/invoice.ts | planInvoice | schemas/invoice.ts | none (status flip on despatch) |
| 15 | create_debit_note | posting/debit-note.ts | planDebitNote | schemas/debit-note.ts | none |
| 16 | create_journal | posting/journal.ts | planJournal | schemas/journal.ts | none |
| 17 | create_cost_sheet | posting/cost-sheet.ts | planCostSheet | schemas/cost-sheet.ts | none |
| 18 | record_payment | posting/payment.ts | planPayment | schemas/payment.ts | none + invoice status→paid |
| 19 | cancel_order | posting/cancel.ts | planCancelOrder | schemas/cancel.ts | guard: no downstream docs |
| 20 | cancel_purchase_order | posting/cancel.ts | planCancelPo | schemas/cancel.ts | guard: no GRN |
| 21 | cancel_invoice | posting/cancel.ts | planCancelInvoice | schemas/cancel.ts | guard: no payment |
| 22 | create_sizes | — | UNTOUCHED (batch convenience, M2 note) | — | — |

Read tools (`list_*`, `get_*`, `get_program_status`, `suggest_next_step`) STAY in
tools.ts (no mutation, no parity requirement) — only `get_program_status` moves its
PIPELINE import to `chain.ts`.

`postLedger` + `bumpStock` move from tools.ts → `src/lib/erp/posting/ledger.ts`
(exported; ADR-004 bucket rule comment travels with them). `resolveDocNo` +
`nextNumber` stay in `numbering.ts` (already shared). `STAGE_DEPT` map moves to
`src/lib/erp/legacy-enums.ts` (ADR-012 first resident) alongside the legacy
constants already documented in plan §1.

## 6. Shared zod schemas (`src/lib/erp/schemas/`)

One file per op, exporting the tool's EXACT current zod schema (field names,
optionality, `.describe()` strings copied verbatim — the agent prompt contract
must not drift). The tool's `schema:` field imports it; the form action coerces
FormData → JSON → `schema.safeParse`. Coercion rules reuse
`src/lib/agent/parse-with-coercion.ts` (numbers/booleans already handled there).

## 7. DocConfig frozen types (`src/lib/erp/doc-configs/types.ts`)

```ts
export type DocFieldType = 'text' | 'number' | 'date' | 'select' | 'picker' | 'textarea' | 'readonly'
export interface DocField {
  name: string            // service input key (buyerCode, deliveryDate…)
  label: string
  type: DocFieldType
  required?: boolean
  picker?: string         // master slug for type 'picker' (W4): 'buyer' | 'style' | …
  options?: { value: string; label: string }[]
  readOnlyIn?: ('view')[]
  colSpan?: 1 | 2         // header grid width
}
export interface DocLineField { name: string; label: string; type: DocFieldType; picker?: string; required?: boolean }
export interface DocConfig {
  docType: string                       // 'order' | 'grn' | … (matches service key)
  slug: string                          // route slug segment
  title: string
  numberPrefix: string                  // 'SO-'
  numberField: string                   // 'orderNo'
  chainStage?: number                   // 1..15 (W1 highlight)
  service: {
    plan: (input: unknown) => Promise<import('$/posting/types').DocPlan>
  }
  headerFields: DocField[]
  lineFields?: DocLineField[]           // line grid editor when present
  linesKey?: string                     // input key for lines[] ('lines' | 'items')
  listColumns: { name: string; label: string; align?: 'left'|'right' }[]  // recent-docs table
  recentCount?: number                  // default 20
  agentTools: string[]                  // chips on the screen
}
```

DocScreen consumes ONLY this config + the shared service (ADR-001 for documents).

## 8. The 20 live doc screens (frozen inventory)

Route = menu item route. Every screen: New mode at the item route (with recent-docs
table below), View mode at `<route>/[id]`. All are `phase: 'M3'` items going live.

| # | item id | route | config | tool (existing) | legacy forms covered (examples) |
|---|---|---|---|---|---|
| 1 | order-sheet-new | /orders/new | order | create_order | FrmOrderSheetNew ×4 variants |
| 2 | order-hub | /orders/[id] | — (hub, not DocScreen) | get_order | FrmOrdProdTrack, FrmIoHistoryReg, FrmBuyerStatus |
| 3 | program-entry | /programs/new | program | create_program | FrmProgNew, FrmProgEntry |
| 4 | purchase-order | /procurement/po | purchase-order | create_purchase_order | FrmPO_Yarn/Fab/Acc/Gen family |
| 5 | grn-entry | /procurement/grn | grn | receive_grn | FrmGRN_Yarn/Fab/Acc, Woven_FabGRN |
| 6 | jobwork-order | /jobwork/order | jobwork-out | create_jobwork_order | FrmJobworkOrder family |
| 7 | jobwork-receipt | /jobwork/receipt | jobwork-in | receive_jobwork | FrmJobwrkRecv, RptUnitAck |
| 8 | cutting-job-order | /cutting/job-order | cut | create_cut_order | FrmCuttingJobOrder ×4 |
| 9 | issue-to-line | /production/issue | line-issue | issue_to_line | Rpt_IssueToLine flow |
| 10 | production-entry | /production/entry | production | post_production_entry | FrmProductionEntry |
| 11 | rework | /production/rework | rework | post_rework | RptPCSRejection-rework flow |
| 12 | pcs-rejection | /pieces/rejection | rejection | post_rejection | FrmPcsRejection, PanelRej |
| 13 | pcs-dc | /pieces/despatch | despatch | create_pcs_despatch | PcsDespatch ×4 variants |
| 14 | sales-invoice | /accounts/invoice | invoice | create_sales_invoice | Rpt_SalesInvoice family |
| 15 | debit-note | /accounts/debit-note | debit-note | create_debit_note | DebitNotePcs/Fab/Yarn |
| 16 | payments-receipts | /accounts/payments | payment | record_payment | FrmPayment, FrmReceipt |
| 17 | journal | /accounts/journal | journal | create_journal | FrmJournal |
| 18 | cost-sheet | /costing/cost-sheet | cost-sheet | create_cost_sheet | FrmCostSheet |
| 19 | stock-adjustment | /inventory/adjustment | stock-adjustment | post_stock_adjustment (NEW) | FabStockAdj, YarnStockAdj, AccStockAdj |
| 20 | godown-transfer | /inventory/transfer | godown-transfer | transfer_stock (NEW) | FrmGodownTransfer + Ack |

BOM (chain step 2): NO standalone screen — the Order Hub hosts a BOM card with an
inline line-grid editor (create/edit BomLine via `planBom`-backed actions). The
chain bar's step-2 CTA from an order routes to `/orders/[id]#bom`.

## 9. Wiring slice — W1 / W3 / W4 (+ nextFormUrl)

### 9.1 W1 — chain mini-pipeline bar (every DocScreen + Order Hub)
Horizontal 15-dot bar from `CHAIN`; stages done for THIS order render filled
(reuse the `has`-computation from `suggest_next_step` — extract it into
`chain.ts: computeChainState(orderInclude)` so both callers share it); current
stage highlighted; "Next →" button = `stageFormUrl(next, { orderNo })` — a Link,
not JS state. On New-mode screens without an order context, the bar shows the
stage position only (from `chainStage`).

### 9.2 W3 — Order Hub `/orders/[id]`
Server component. One `db.order.findUnique` with the FULL include set (programs,
poLines.po, grns, jobworks, cutOrders, lineIssues, productionEntries, rejections,
despatches, salesInvoices, payments, costSheet, style.bomLines). Sections grouped
by family; each section: count, qty rollup (and value where the table carries it),
rows link to doc views. Header: buyer/style/delivery/status/total + chain bar +
"Ask agent about this order" (seeds panel). BOM card with inline editor (§8).
Not-found id → 404. This screen REPLACES the legacy FrmOrdProdTrack mental model.

### 9.3 W4 — picker with create-on-the-fly
`src/components/erp/doc-picker.tsx`: command-style searchable dropdown fed by a
light `/api/erp?resource=masters&slug=<slug>&q=` (extend the existing api/erp
route — no new endpoint family). "+ New <Entity>" opens the MasterTable create
Sheet (reuse `master-table.tsx` in a Sheet wrapper); on save the picker selects
the new record; the parent DocScreen's draft state (header + lines) is client
state and is never lost. Applied to ALL `type: 'picker'` fields.

### 9.4 Doc VIEW extras
Reference fields render as links (order → hub, party → /masters/party, …);
a "Cancel document" action (only where the cancel service exists and its guard
passes) with confirm dialog; posting-effects card (the committed plan's
creates/sideEffects, replayed read-only).

### 9.5 nextFormUrl
`suggest_next_step` json gains `nextFormUrl` (§4). The agent panel renders it as
an "Open form" button (W5(c) minimal slice).

## 10. DocScreen engine contract (`components/archetypes/doc-screen.tsx`)

Client component (form interaction demands it; data loads via props from a server
page wrapper). Props: `{ config: DocConfig; mode: 'new' | 'view'; initial?: {...};
docNo?: string }`. Behavior:
- New: header field grid → picker fields → line-grid editor (add/remove rows,
  tab-through, qty/rate×qty totals row) → Save (server action → service.plan →
  REVIEW step showing summary + sideEffects → Commit). Keyboard: Enter submits
  field group; Ctrl+S = Save. After commit: toast + "Next →" CTA + link to doc view.
- View: server page fetches doc + renders read-only fields + effects card +
  chain bar + refs (§9.4).
- AI-prefill: "Fill with AI" button → opens agent panel seeded with
  `Create a <docType> for order <orderNo> from the attached document` + uploaded
  file context (§12); the panel's approve flow stays the agent door; after commit
  the form navigates to the new doc's view mode. (Full proposal-INTO-form
  two-way binding is W5-full = M4; M3 ships the seeded + navigable version.)

## 11. New agent tools (2 → 122 total)

- `post_stock_adjustment` (domain inventory, write): godown + itemType/item +
  add/less qty (+ reason). Ledger: `stock_adjustment_add` / `stock_adjustment_less`.
- `transfer_stock` (domain inventory, write): item + fromGodown + toGodown + qty.
  Ledger: `godown_transfer_out` + `godown_transfer_in` (two rows, one transaction).
Both ship WITH their DocScreens (P2: two doors or none). Service files:
`posting/stock-adj.ts`, `posting/transfer.ts`; schemas in `schemas/`.

## 12. `/api/upload` rebuild

`src/app/api/upload/route.ts` — POST multipart/form-data, field `file`. Flow:
`sanitizeFileName` (docExtract) → write to `upload/` → `extractDocument` →
`{ ok, fileName, chars, text }`. 20 MB cap, txt/pdf only (pdftotext present).
Used by DocScreen AI-prefill ("attach buyer PO / invoice" → extract → seed).
GET lists uploads (replaces the lost listing route's role; docExtract already
exports `listUploadDir`).

## 13. Testing plan

- `tests/pipeline/doc-parity.test.ts` (NEW): for each of the 18 ledger/doc ops
  (skip the 3 cancels + create_sizes): run tool path (execute→plan→commit) and
  form path (service plan→commit with identical coerced input) against two
  orders; assert identical committed rows (doc + StockLedger by txnType/qty/
  godown) — the master-parity pattern at transaction scale. Cleanup after.
- `tests/pipeline/industry-chain.test.ts`: add a form-door companion describe
  block calling the SERVICES directly for steps 1-15 (same assertions, adjusted
  docNos) — proves the chain without the agent loop.
- `tests/unit/doc-configs.test.ts` (NEW): config contracts — every config's
  service.plan exists, headerFields have labels/types, picker slugs exist in
  master-configs registry, chainStage within 1..15, routes match menu-registry
  LIVE_ROUTES additions.
- Route smoke (manual/scripted): §1 acceptance #9.

## 14. Implementation waves (session-sized; each ends green + committed + tagged)

- **Wave A — extraction (no UI):** chain.ts (delete PIPELINE from tools.ts) +
  schemas/ + posting/ (22 services + ledger.ts) + tools.ts delegation + doc-parity
  test + context_check update. Exit: 111 old + new parity tests green.
- **Wave B — engine + order family:** doc-configs/types + order config +
  doc-screen.tsx + doc-picker.tsx + /orders/new + /orders/[id] hub + BOM card +
  chain bar + nextFormUrl + agent-panel "Open form". Exit: acceptance #3 partially
  (order+BOM), #5, #6, #7 for order screens.
- **Wave C — chain screens:** program, PO, GRN, jobwork ×2, cut, line-issue,
  production, rework, rejection, despatch configs+routes+actions. Exit: acceptance
  #3 complete (form-only chain), #4 complete.
- **Wave D — accounts + inventory + AI:** invoice, debit-note, payment, journal,
  cost-sheet, stock-adjustment (+tool), godown-transfer (+tool), /api/upload +
  AI-prefill seeding. Exit: all acceptance criteria; tag `m3-done`.

## 15. Gotchas & ground rules (READ BEFORE EACH WAVE)

- **Never edit the zod field names/descriptions** during extraction — the agent's
  tool-calling contract depends on them; schemas move VERBATIM.
- The industry-chain test must pass UNMODIFIED through Wave A (any test edit =
  extraction bug, not test drift). Exception: the PIPELINE-const deletion is
  internal to tools.ts (no test imports it).
- `postLedger` bucket rule (ADR-004): dept/order NULL on CurrentStock buckets —
  preserved exactly in ledger.ts; doc-parity asserts it.
- Prisma relation names: re-verify against the RECONSTRUCTED schema (PITFALLS
  #1/#16) — `Order.programs`, `Order.lineIssues`, `Order.payments`,
  `Program.department` (NOT dept), `LineIssue.styleNo` is a plain string.
- DateTime strings: always `new Date(...)` before prisma args (PITFALLS #13).
- Server actions live in `actions.ts` files with `'use server'`; they call
  services, never raw prisma (except reads for initial props).
- Numbering via `nextNumber`/`resolveDocNo` only (CONVENTIONS) — number
  assignment happens at commit re-execution, keep the existing collision-safe
  flow (resolveDocNo desired-skip behavior).
- tsc known noise = 32 errors (STATE drift #6) — diff the list, don't chase.
- Every wave: update 01-STATE.md + worklog in the SAME commit; commit schema+db
  if touched (PITFALLS #16 rule); export patch to download/.
