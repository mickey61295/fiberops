# SPEC-M4 — RegisterScreen Engine + Core Registers + Wiring W2/W6

> **FROZEN IMPLEMENTATION SPEC.** Written BEFORE any M4 code (rule: spec-before-code,
> `docs/CONTEXT/00-START-HERE.md` #3). A session with ZERO chat context implements
> M4 correctly from this file alone. Sources verified against:
> `prisma/schema.prisma` (54 models — GRN.poId IS a relation, Payment.invoiceId /
> JobworkOrder.orderId / PcsDespatch.orderId / GRN.deptId are PLAIN FK columns,
> StockLedger.docNo NOT unique, JobworkOrder has NO receivedQty column),
> `src/lib/agent/tools.ts` (122 tools; register-backing reads inventoried in §5),
> `src/lib/erp/menu-registry.ts` (17 M4-phase items: 15 RG + 1 DB + 1 RH),
> PLAN-2.0 §4.3 / §4.6-W2/W6 / §6-M4 / §7. Status: APPROVED FOR IMPLEMENTATION.

## 1. Goal

Make the **read side of the ERP navigable without the agent** — every day-book,
ledger and balance register the legacy app exposed as a form becomes a live,
filterable, drill-down screen — and complete the wiring slice that turns
documents into a graph: register row → doc view, KPI tile → filtered register,
doc view → its counterpart documents with live balances.

Three deliverables:

1. **RegisterScreen engine** (`src/components/archetypes/register-screen.tsx`)
   + per-register configs (`src/lib/erp/register-configs/`) + shared read
   services (`src/lib/erp/registers/`) — the parameterized day-book: filters
   (date/party/order/godown/itemType/status) as shareable URL searchParams,
   columns, group totals, row drill-down, CSV export, "Ask about this data".
2. **The 17 M4 register/board screens** (§7) — every `phase: 'M4'` menu item
   goes live, backed by the SAME service its agent tool calls (P2: two doors
   or none — the read-side twin of ADR-001).
3. **The M4 wiring slice** — W2 (register→doc drill-down on every register row,
   dashboard KPI tiles deep-link to pre-filtered registers, breadcrumbs), W6
   (reconciliation cards on doc views: PO↔GRN, Invoice↔Payment, Jobwork
   out↔in, Despatch↔Invoice) and W5(b) ("Ask about this data" seeds the agent
   panel with active filters).

**Live menu items after M4: 41 of 113** (24 current + 17 new, §7). All 17
groups live (14 current — M4 adds nothing new: home, orders, procurement,
inventory, pieces, production, jobwork, accounts, costing, approvals are all
already live groups). Agent tools: **130** (122 + 8 new, §11). Legacy register
forms covered: **33** (sum of `legacyForms` on the 17 items).

**Acceptance (all must pass):**
1. `npx vitest run` — all existing 174 tests stay green UNMODIFIED (additive
   only), plus new suites `tests/unit/register-configs.test.ts` and
   `tests/pipeline/register-services.test.ts` (§12).
2. `npx tsc --noEmit` — no NEW errors beyond the ~30-error known noise list
   (STATE drift #6; currently 29 after the post-M3 cleanup).
3. All 17 M4 menu items render live screens (no more `/coming/*` landing for
   them); `parityStats()`: **41/113 items, 17/17 groups**.
4. **Every register row that represents a document drills into its doc view**
   (W2): order rows → `/orders/[id]`, GRN rows → GRN view, ledger rows with a
   resolvable `refId`/`orderId` → their doc, approval rows → their entity view.
   Rows with no target render without a link (never a dead href).
5. **Register math is test-asserted** (§12): in-hand pending = ordered −
   despatched; daily in/out totals = StockLedger sums for the day; bills
   register totals = invoice + debit-note − payments math; poRecon balance =
   ordered − received; jobwork at-party = sent-status rows only.
6. **Dashboard KPI tiles deep-link** to pre-filtered registers (§8.3 mapping
   table) — each tile is a Link, target route 200.
7. **W6 reconciliation cards** render on the 4 doc views (§9) with live
   balance math; each counterpart row links to its document.
8. Every register carries an **"Ask about this data"** button that opens the
   agent panel seeded with the active filter context (W5(b)); every register
   supports **CSV export** via `?format=csv` on the same route.
9. Route smoke: all 17 new item routes → 200; each with a representative
   filter query (`?from=…&to=…`, `?status=…`, `?godown=…`) → 200; CSV format →
   200 `text/csv`; all 48 previous live routes stay 200.
10. Existing agent read tools keep their zod schemas VERBATIM (§5 rule); the 8
    new tools land in the same file/factory pattern as the existing reads.
11. `scripts/context_check.sh` updated for M4 reality — all green.
12. The Order Status Board (`/orders/status`) shows every open/in-progress
    order with its 15-stage progress (computeChainState), next-step chip, and
    a hub link per row.

## 2. Non-goals (explicitly OUT)

- **No ReportHub engine** — RH proper (renderer registry, PDF export, saved
  presets, ~80 reports) is M6. The stock-register item (`arch: 'RH'`) ships as
  a register-family screen (variant filter: general | style | pcs) + print
  CSS — its archetype in the registry stays `RH`, it counts live because the
  screen answers the legacy `FrmStockRegister*` questions.
- **No schema changes** (ADR-013/014 hold). In particular: NO SupplierBill /
  BillPass model — `supplier-bill-register` is a GRN/PO-based supplier
  document day-book (§7 row 13), explicitly NOT 3-way bill matching; true
  bill-pass posting is M5.
- **No partial-receipt modeling for jobwork** — JobworkOrder has no
  receivedQty column; at-party balance = Σ totalQty of `status='sent'` rows.
  Do not invent a column.
- **No W5-full** (agent proposal INTO the form, two-way binding) — M3's
  seeded+navigable version stands; M4 adds only W5(b) ask-about-this-data.
- **No MIS charts / dashboards beyond the Order Status Board** — pipeline
  charts, daily P&L, trend graphs are M6.
- **No approval FLOWS** — grn-acceptance, GAN, bill-pass approvals stay
  "coming" (M5). The audit trail register is read-only.
- **No pagination virtualization / server-side sort** — registers cap at
  `limit` rows (default 100) with page/next links; column sorting is M6 polish.

## 3. Architecture — what moves where

```
BEFORE (M3 world)                                AFTER (M4 world)
─────────────────────────                        ─────────────────────────
registers: /coming/<group> placeholders          src/lib/erp/registers/<slug>.ts    ← query services (shared read path)
read tools inline in tools.ts                      (queryX(filters) → { rows, totals, summary })
  list_orders { …db.order.findMany… }           src/lib/erp/register-configs/<slug>.ts  ← pure data
                                                  (filters/columns/agentTools/drillDown spec)
                                                  src/lib/erp/registers/index.ts     ← SERVICES map slug→query
                                                components/archetypes/register-screen.tsx  ← engine (server)
                                                  + register-filter-bar.tsx (client, pushes searchParams)
                                                tools.ts reads: schema VERBATIM, execute delegates to service
dashboard KPI tiles: plain numbers               tiles → <Link> to pre-filtered registers (§8.3)
doc views: refs linked (M3 §9.4)                 + components/erp/recon-card.tsx (W6, §9)
```

Rule (read-side twin of ADR-001, per CONVENTIONS): the register service OWNS
the query, the join math, the id-maps for relation-less FKs (PITFALLS #21) and
the totals. The register screen calls the service with parsed searchParams;
the agent tool calls the SAME service with its args. If a screen needs a
shape the tool cannot express, extend the SERVICE (additive) — never fork the
query. Existing tools keep zod schemas verbatim; only their `execute` bodies
swap to service calls (their `json` shapes stay field-compatible — additive
keys only, PITFALLS #25: enrichment keys never collide with row columns).

## 4. RegisterConfig frozen types + service registry

Configs are PURE DATA (like master-configs — no functions, no imports of db),
so they are trivially testable and need no serializable-subset dance:

```ts
// src/lib/erp/register-configs/types.ts
export type RegisterFilterType = 'dateRange' | 'party' | 'order' | 'godown'
                               | 'itemType' | 'status' | 'select' | 'text'
export interface RegisterFilter {
  key: string            // searchParams key: 'from' | 'to' | 'party' | 'order' | 'godown' | 'itemType' | 'status' | 'q' | 'variant'
  label: string
  type: RegisterFilterType
  options?: { value: string; label: string }[]   // select/itemType/status
  placeholder?: string
}
export interface RegisterColumn {
  name: string           // row key ('orderNo', 'inKgs', 'billAmount'…)
  label: string
  align?: 'left' | 'right'
  mono?: boolean         // doc numbers render font-mono
  format?: 'date' | 'inr' | 'qty' | 'int' | 'badge'
  width?: string         // tailwind w- class, optional
}
export interface RegisterConfig {
  slug: string                          // 'stock-ledger' | 'order-register' | …
  title: string
  description?: string                  // subtitle under the title
  filters: RegisterFilter[]
  columns: RegisterColumn[]
  agentTools: string[]                  // chips + ask-context hint
  askPrompt: string                     // W5(b) seed: 'Show me the stock ledger' (filters appended at runtime)
  emptyMessage?: string
  defaultLimit?: number                 // default 100
}
```

Service registry — the only place slug → query is bound:

```ts
// src/lib/erp/registers/index.ts
export interface RegisterQuery {
  from?: Date; to?: Date                // parsed, Date objects (PITFALLS #13)
  party?: string; order?: string        // codes/orderNo (services resolve → ids)
  godown?: string; itemType?: string; status?: string
  variant?: string; q?: string
  limit: number; page: number
}
export interface RegisterResult {
  rows: Record<string, unknown>[]       // each row: id + optional href (W2 drill-down)
  totals?: { label: string; value: number | string }[]   // footer band
  summary: string                       // "312 rows · in 1,240 kgs · out 980 kgs"
}
export const REGISTER_SERVICES: Record<string, (q: RegisterQuery) => Promise<RegisterResult>>
```

`href` is computed INSIDE the service (it knows doc numbers and ids) — the
engine just renders it. Test rule: every config slug must exist in
REGISTER_SERVICES and vice versa (§12).

## 5. Register service inventory (frozen — 17 services)

Migration rule per row: `existing → delegate` means the tool's inline query
moves into the service VERBATIM (same where/include), the tool keeps schema +
json shape; the register screen may pass richer filters (service supports
them even where the tool schema does not expose them — additive).

| # | item (slug) | service file | source tables | tool (door) |
|---|---|---|---|---|
| 1 | daily-in-out | registers/daily-inout.ts | StockLedger (by docDate) + Godown | get_daily_in_out (NEW) |
| 2 | order-register | registers/order-register.ts | Order + Buyer + Style (+_count lines) | list_orders (existing → delegate) |
| 3 | inhand-orders | registers/inhand.ts | Order + PcsDespatch (orderId id-map) + SalesInvoice | list_inhand_orders (NEW) |
| 4 | party-balance | registers/party-balance.ts | PurchaseOrder + Party + GRN | get_party_ledger (existing → delegate + json gains poBalances[]) |
| 5 | stock-ledger | registers/stock-ledger.ts | StockLedger + Godown + Party | get_stock_ledger (existing → delegate) |
| 6 | stock-register | registers/stock-register.ts | CurrentStock + Godown (group by variant: general/style/pcs) | get_stock_ledger (existing; register reads are CurrentStock-side) |
| 7 | lot-tracking | registers/lots.ts | Lot + Party + CurrentStock(rollup) | list_lots (existing → delegate) |
| 8 | io-history | registers/io-history.ts | StockLedger (by item or party, running balance) | list_io_history (NEW) |
| 9 | pcs-stock | registers/pcs-stock.ts | CurrentStock (itemType='pcs') + Godown | get_stock (existing → delegate) |
| 10 | production-status-register | registers/production-status.ts | ProductionEntry + Order + Department (+JobworkOrder for outsource col) | get_production_status (NEW) |
| 11 | job-order-list | registers/jobwork.ts | JobworkOrder + Party + Order (id-maps) | list_jobworks (existing → delegate) |
| 12 | bills-register | registers/bills.ts | SalesInvoice + DebitNote + Payment | get_bills_register (NEW) |
| 13 | supplier-bill-register | registers/supplier-bills.ts | GRN + Party + PurchaseOrder (id-map) | list_supplier_bills (NEW) |
| 14 | party-ledger | registers/party-ledger.ts | SalesInvoice + Journal + DebitNote + Payment + Party | get_party_ledger (existing → delegate) |
| 15 | budget-vs-actual | registers/budget.ts | Budget + BudgetLine + CostSheet + ProductionEntry | get_budget_vs_actual (existing → delegate) |
| 16 | approval-audit-trail | registers/approval-audit.ts | Approval + AgentTurn | get_approval_audit (NEW) |
| 17 | order-status-board | registers/order-status.ts | Order (open/in_progress) + family counts → computeChainState | get_order_status (NEW) |

Register math (test-asserted, acceptance #5):

- **daily-in-out**: group StockLedger by docDate × godown; in/out = Σ inKgs+inMtrs+inPcs / outKgs+outMtrs+outPcs per row; footer totals per godown and grand total.
- **inhand**: per order — totalPcs (ordered) − Σ PcsDespatch.totalPcs (despatched, orderId id-map) = pending; also invoiced Σ SalesInvoice.totalQty; open/in_progress orders only.
- **party-balance**: per party — Σ POLine.qty (ordered) − Σ GRN.totalQty (received, via GRN.poId) = pending, value variants likewise.
- **bills**: day-book rows = invoices (+) debit notes (−, `additions/deductions` columns) + payments (settle col); totals: billed, deductions, collected, outstanding.
- **io-history**: chronological StockLedger rows for item/party + running balance column (in−out cumulative, per uom column).
- **production-status**: per order × department — Σ qty, rework flag split; jobwork column = Σ JobworkOrder.totalQty for orderId.
- **jobwork**: per DC — totalQty (sent), status, receivedDate; per party footer — at-party = Σ sent-status rows.
- **order-status**: per open order — chainState flags (CHAIN_ORDER_INCLUDE pattern from the Hub), done-stages count / 15, next stage name.

## 6. RegisterScreen engine contract (`components/archetypes/register-screen.tsx`)

Server component (no client state needs to live in the table). Data flow:

```
page.tsx (route file)
  → searchParams → parseRegisterQuery(config, searchParams)   // strings→Dates/codes, clamp page/limit
  → REGISTER_SERVICES[slug](query)
  → <RegisterScreen config={config} result={result} query={query} searchParams={…} />
```

- **FilterBar** (`register-filter-bar.tsx`, client): renders config.filters —
  date-range (two date inputs), party/order/godown text inputs with the same
  master_search picker feed DocScreen uses (W4 reuse, `resource=master_search&slug=party|godown`),
  itemType/status selects from options. On change → `router.push` with new
  searchParams (shareable URLs — KPI deep-links land here for free). "Clear"
  resets. Never a full reload; `useSearchParams` + replace.
- **Table**: config.columns in order; `format` renders date/inr/qty/int/badge;
  `mono` renders font-mono; row `href` → row is a `<Link>` (W2); no href →
  plain `<tr>`. Zebra rows, sticky header, `text-right` for numeric columns.
- **Summary + totals**: result.summary line above the table; result.totals as
  a footer band (label: value, inr-formatted where numeric).
- **AskAgentButton** (W5(b)): reuse the Order Hub's button component; seed
  prompt = `config.askPrompt` + active filters rendered as text
  ("godown G1, from 2026-08-01 to 2026-08-31").
- **CSV export**: same route, `?format=csv` → page branch returns
  `text/csv` (headers = column labels, rows in column order, dates ISO,
  numbers raw). A small "Export CSV" link on every register.
- **Pagination**: `page` searchParam; prev/next Links; "rows X–Y of Z" line;
  limit clamp 10..500.
- **Empty state**: config.emptyMessage centered.
- **Breadcrumbs** (W2): group label → register title, linking back to the
  group landing (menu-registry `getHref`).

## 7. The 17 live screens (frozen inventory)

Route = menu item route (already in the registry — no route changes). All are
`phase: 'M4'` items going live. Legacy forms column = the `legacyForms` the
screen answers (parity tracker counts them).

| # | item id | route | config slug | drill-down (row →) | legacy forms |
|---|---|---|---|---|---|
| 1 | daily-in-out | /registers/daily-in-out | daily-in-out | doc view via refId/docNo (ledger row) | frmDailyinout |
| 2 | order-register | /orders/register | order-register | /orders/[id] (hub) | FrmOrderReg, frmordwiseregregister, FrmOrderRegister_Spl |
| 3 | inhand-orders | /orders/in-hand | inhand-orders | /orders/[id] (hub) | ST_Ord_inHand |
| 4 | party-balance | /procurement/party-balance | party-balance | /masters/party + PO rows → /procurement/po/[id] | FrmPartyBlnc, Sp_POBalnce |
| 5 | stock-ledger | /inventory/ledger | stock-ledger | doc view via docNo/refId when resolvable | FrmStockLedger, Vue_StkLedger |
| 6 | stock-register | /inventory/register | stock-register | (grouped rows; item drill → /inventory/stock) | FrmStockRegister ×4 |
| 7 | lot-tracking | /inventory/lots | lot-tracking | — (Lot master rows) | FrmLotRegister, frmLotWiseDtl, FrmLotSeparate, frmLotApproval |
| 8 | io-history | /inventory/io-history | io-history | doc view via docNo/refId | FrmIoHistoryReg, _New |
| 9 | pcs-stock | /pieces/stock | pcs-stock | /orders/[id] via orderId when present | FrmPieceStock, _All, FrmRejPieceStock |
| 10 | production-status-register | /production/register | production-status | /orders/[id] (hub) | FrmProductionStatusReg, FrmInhouseProductionStatusReg |
| 11 | job-order-list | /jobwork/register | jobwork-register | /jobwork/order/[id] (jobwork view) | FrmJobOrderList |
| 12 | bills-register | /accounts/bills-register | bills-register | /accounts/invoice/[id] (invoice view) | FrmBillsReg, FrmBillsAddDedReport |
| 13 | supplier-bill-register | /accounts/supplier-bills | supplier-bills | /procurement/grn/[id] (GRN view) | FrmSupplierBillReg |
| 14 | party-ledger | /accounts/party-ledger | party-ledger | invoice rows → /accounts/invoice/[id] | FrmPartyBalanceRegister |
| 15 | budget-vs-actual | /costing/budget-vs-actual | budget-vs-actual | — (Budget master rows) | FrmBudgetAndActualComp |
| 16 | approval-audit-trail | /approvals/audit | approval-audit | Approval rows → entity view when live | (none — AgentTurn/Approval log) |
| 17 | order-status-board | /orders/status | — (board, NOT RegisterScreen) | /orders/[id] (hub) per row | frmOrdStat, FrmBuyerStatus, FrmOrderDespatchCompletion |

Doc-number → doc-view resolution (drill-downs marked "via docNo/refId"):
resolve id OR doc number exactly like the Wave C view pages (findFirst on the
family's unique number field, null → no link). One shared helper
`registers/resolve.ts: resolveDocRef(family, docNo|id)` — do NOT fork per page.

## 8. Wiring slice — W2 + W5(b)

### 8.1 Register → doc drill-down
Per §7 column. Rule: the href comes from the service (it owns resolution);
rows that cannot resolve render unlinked; NEVER a link that 404s on valid
data. Ledger-family rows (daily-in-out, stock-ledger, io-history) resolve
`refId` → family by txnType (purchase_grn→GRN, sales_delivery→PcsDespatch,
godown_transfer_*→transfer legs, …) with a small txnType→family map; unknown
txnType → no link (forward-compatible).

### 8.2 Breadcrumbs
RegisterScreen renders `group label / register title`; group label links to
the group landing route (menu-registry). Doc views already link back up
(M3 §9.4) — no change there.

### 8.3 KPI deep-links (dashboard `/`)
| KPI tile | target |
|---|---|
| Open Orders | /orders/register?status=open |
| Pending POs | /procurement/party-balance |
| Stock Value | /inventory/stock (already live, M2) |
| Production Today (pcs) | /production/register?from=<today>&to=<today> |
| Pending Approvals | /approvals (already live, M1) |
| Open Invoices | /accounts/bills-register?status=issued |

Each tile becomes a Link (title + number clickable); the dashboard's recent
tables already link (M1) — unchanged.

### 8.4 W5(b) — "Ask about this data"
Per §6 (AskAgentButton + askPrompt + filter text). The agent panel seeding
mechanism is the one "Fill with AI" already uses — reuse, no panel changes.

## 9. W6 — reconciliation cards on doc views

`src/lib/erp/registers/recon.ts` (pure query fns) +
`src/components/erp/recon-card.tsx` (server component: title, math line,
counterpart rows with links, balance highlight). Rendered on:

| Card | View screen | math (test-asserted) |
|---|---|---|
| PO ↔ GRNs | /procurement/po/[id] | ordered = Σ POLine.qty · received = Σ GRN(line) qty where GRN.poId · **balance = ordered − received**; rows: the GRNs |
| Invoice ↔ Payments | /accounts/invoice/[id] | billed = billAmount · collected = Σ Payment.amount where invoiceId (PLAIN FK — id lookup) · **balance**; rows: the payments |
| Jobwork out ↔ in | /jobwork/order/[id] | sent = totalQty · status (sent → at party, received/billed → returned) · **at-party = Σ sent-status rows for the jobworker**; rows: that jobworker's other DCs |
| Despatch ↔ Invoice (order scope) | /orders/[id] (despatch section) | despatched = Σ PcsDespatch.totalPcs (orderId id-map) · invoiced = Σ SalesInvoice.totalQty · **balance**; rows: the despatches |

The DC↔GRN legacy pair maps to Jobwork out↔in in this schema (process DCs
return via jobwork receive); documented here so nobody re-invents it.

## 10. Order Status Board (`/orders/status`, DB archetype)

Server component, NOT RegisterScreen (it is a board, not a day-book):
every `status in (open, in_progress)` order with buyer + delivery + the 15-dot
chain bar (same `chain-bar.tsx` component the doc screens use, fed by
computeChainState with the CHAIN_ORDER_INCLUDE pattern from the Order Hub) +
done-count "n/15" + next-step chip (nextStage name) + row link to
`/orders/[id]`. Sort: deliveryDate asc (soonest first), nulls last. Header
KPI: total open orders, total open pcs, avg stages done. The `get_order_status`
tool returns the same shape (rows: orderNo, buyer, stagesDone, nextStage).

## 11. New agent tools (8 → 130 total)

All domain-appropriate, `isWrite: false`, factory-free inline reads (same file
pattern as existing reads), each delegating to its §5 service:

- `get_daily_in_out` (inventory) — args: date?, godownCode?
- `list_inhand_orders` (orders) — no args (all open/in_progress; the pendingTools entry in the registry finally ships)
- `list_io_history` (inventory) — args: itemType?, itemId?, partyCode?, limit?
- `get_production_status` (production) — args: orderNo?, deptCode?
- `get_bills_register` (accounting) — args: from?, to?, partyCode?
- `list_supplier_bills` (accounting) — args: partyCode?, from?, to?
- `get_approval_audit` (workflow) — args: status?, limit?
- `get_order_status` (orders) — args: orderNo? (omit → board summary)

Existing tools in §5 marked `→ delegate` swap their execute bodies to the
service; zod schemas and json shapes stay field-compatible (additive keys
only). Menu-registry `agentTools` arrays for the 17 items get their tools
wired (several currently `[]`).

## 12. Testing plan

- `tests/unit/register-configs.test.ts` (NEW): every config — slug/route/file
  exists, columns have labels + valid formats, filter keys are a subset of
  the parsed query keys, agentTools all exist in the tools registry (name
  scan incl. factory pattern — never a naive grep, STATE drift #3),
  REGISTER_SERVICES ↔ config slugs bijection, drill-down families resolve
  (resolveDocRef smoke), routes match menu-registry LIVE_ROUTES additions.
- `tests/pipeline/register-services.test.ts` (NEW): seeded fixture order
  chain (reuse doc-parity's fixture builder) → assert the §5 math rows
  (inhand pending, daily totals vs StockLedger sums, bills outstanding,
  poRecon/invoiceRecon/jobworkRecon balances, io-history running balance,
  order-status done-count), then surgical cleanup (doc-parity pattern).
- `tests/unit/menu-registry.test.ts`: +17 live items (41/113), 17/17 groups,
  LIVE_ROUTES 48→65, Wave D→M4 wiring assertions.
- Route smoke (`scripts/route_smoke_waveE.sh` after Wave C, mirrors Wave D
  script): §1 acceptance #9.
- Regression guard: existing read-tool json shapes — the register-services
  suite asserts 2–3 pinned rows per migrated tool (list_orders,
  get_stock_ledger, list_jobworks) to catch delegation drift.

## 13. Implementation waves (session-sized; each ends green + committed + tagged)

- **Wave A — engine + services + 3 flagships:** registers/types+index,
  register-configs/types + 3 configs (stock-ledger, order-register,
  daily-in-out) + their services + register-screen.tsx + filter-bar +
  parseRegisterQuery + resolveDocRef + AskAgentButton reuse + CSV + 3 pages +
  menu-registry LIVE_ROUTES +3 + register-configs test (subset) + tool
  delegation (get_stock_ledger, list_orders) + get_daily_in_out NEW +
  context_check update. Exit: acceptance #1/#2/#8 (partial)/#9 (partial).
- **Wave B — the fleet:** remaining 13 configs + services + pages + 7 new
  tools (§11) + delegations + txnType→family drill map + config contracts
  test complete + menu-registry 41/113 + register-services math suite.
  Exit: acceptance #3/#4/#5/#10.
- **Wave C — wiring + board:** recon.ts + recon-card.tsx on the 4 views +
  KPI deep-links + Order Status Board + get_order_status + breadcrumbs +
  route_smoke_waveE.sh + STATE/worklog/PITFALLS + tag `m4-done`.
  Exit: all acceptance criteria; tag `m4-done`.

## 14. Gotchas & ground rules (READ BEFORE EACH WAVE)

- **Zod schemas of existing read tools are FROZEN** — delegation changes
  execute bodies ONLY; json shapes additive-only. The agent's tool-calling
  contract must not drift (same rule that held through M3's extraction).
- **Relation-less FKs (PITFALLS #21)**: Payment.invoiceId,
  JobworkOrder.orderId, PcsDespatch.orderId/buyerId, GRN.deptId — services
  resolve via findMany + Map id-lookups (the list_jobworks pattern), never
  include{} on a non-relation.
- **StockLedger.docNo is NOT unique (PITFALLS #24)** — daily-in-out rows
  group by id (never by docNo); transfer legs share a docNo on purpose.
- **Enrichment key collisions (PITFALLS #25)** — service rows and tool json
  never spread a fetched object over a column name; extra keys get a suffix
  no column uses (`partyName`, `orderNoRef`, …).
- **DateTime (PITFALLS #13)**: searchParams are STRINGS — `new Date(...)`
  before every prisma date arg; reject invalid dates to undefined (filter
  off, not a 500).
- **StockLedger totals**: in/out columns are per-uom (bags/kgs/mtrs/pcs) —
  sum per column, never across uom columns; summary renders only non-zero
  columns (a yarn row has kgs, a pcs row has pcs).
- **resolveDocNo/nextNumber (CONVENTIONS)**: view resolution uses
  findFirst on unique number fields (the Wave C pattern); StockLedger has no
  unique docNo — resolve by refId only.
- Registers are READ-ONLY screens: no server actions beyond navigation; the
  only writes in M4 are none (recon cards and boards are pure reads).
- Server components call services; client components (filter-bar,
  AskAgentButton) only push searchParams / open the panel — no fetching of
  their own (the master_search picker feed is the ONE exception, as in M3).
- tsc known noise = ~29-31 errors (STATE drift #6) — diff the list, don't chase.
- Every wave: update 01-STATE.md + worklog in the SAME commit; tag; export
  patch to download/ (0000-PATCH-INDEX.md is the recovery map — sandbox
  wipes happen; regenerate from git if download/ is empty).
- The /approvals fix (PITFALLS #25, commit b344ae8) is the cautionary tale
  for every service introduced here: response SHAPES are contracts — the
  register-services test pins them.
