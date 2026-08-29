# SPEC-M19 — Register & Masters Long Tail (the gap-audit P2 lane)

Status: **FROZEN (Wave A)** — 2026-08-29. Wave B/C/D spec'd for later sessions.
Source: docs/GAP-ANALYSIS-FIBERPRO.md §9 P2 lane + §1-A1 (registers) + §2 (masters) + §3-C1;
prioritized by STATE next-actions #16 ("the P2 register/masters long tail → M19+").
ADR-001 stance: registers are DIRECT reads (no agent-tool dependency); the two-door
principle is satisfied by citing the EXISTING read tools (get_stock_ledger / get_stock)
on the new configs — zero new tools, zero schema changes, zero service changes to
existing families.

## 0. Why this lane now

P0 (operator reflex, M17) and P1 (print & command fidelity, M18) are complete. The gap
audit's remaining measurable parity gap is the register long tail: legacy operators
lived in material-wise day-books (FrmYarnStockRegister & co. — "the biggest real gap",
§1-A1), and our generic /inventory/ledger forces a filter dance every visit. The audit's
own disposition: "one register-config each over the existing stock-ledger service with
itemType filter preset. Cheap: the service already exists."

## 1. Wave A scope (this session) — material-wise stock registers

### 1-A. Preset-filter mechanism (the enabler)

- `RegisterFilter` gains `preset?: string` (register-configs/types.ts): "applied when
  the searchParam is absent — the day-book's home value".
- `parseRegisterQuery` (registers/resolve.ts): per declared filter,
  `q[key] = params[key] ?? filter.preset` (explicit URL always wins; shareable
  deep-links unaffected).
- `RegisterFilterBar` (register-filter-bar.tsx): draft init
  `params[f.key] ?? f.preset ?? ''`; selects with a preset HIDE the "All" option —
  a material day-book is always type-scoped (legacy parity: FrmYarnStockRegister had
  no type selector), and "All" IS the general register's job (1-D). Clear re-lands on
  the preset (the day-book home state).
- Active-filter chips / filtersAsText stay params-driven; the screen title carries the
  day-book identity (Yarn Stock Register).
- Non-goals: no `preset` on dateRange filters in Wave A (no use case), no per-user
  presets.

### 1-B. Five material-wise stock registers (config file: register-configs/material-stock.ts)

All five bind the EXISTING `queryStockLedger` service (read-side reuse; REGISTER_SERVICES
gains a slug → same-function binding; the config↔service bijection test extends).

| slug | route | preset itemType | legacy form |
|---|---|---|---|
| `yarn-stock` | /inventory/stock/yarn | yarn | FrmYarnStockRegister |
| `fabric-stock` | /inventory/stock/fabric | fabric | FrmFabricStockRegister |
| `acc-stock` | /inventory/stock/accessory | accessory | FrmAccStockRegister |
| `general-stock` | /inventory/stock/general | — (all materials) | FrmGeneralStockRegister |
| `itemwise-stock` | /inventory/stock/itemwise | — (select, no preset) | FrmItemwiseStockRegister |

- Filters (yarn/fabric/acc/general): from/to (dateRange), godown, itemType (preset on
  the three material ones; plain on general). Columns = stock-ledger's, minus the
  constant itemType column on the three preset registers (general keeps it).
- `itemwise-stock` is NOT a txn list: NEW aggregation service `queryItemwiseStock`
  (registers/itemwise-stock.ts) grouping StockLedger by (itemType, itemId) for the
  period — Σ in/out per uom (bags/kgs/mtrs/pcs — never across uom columns, gotcha
  §14) + txn count, item codes via the existing id-map helper (PITFALLS #21), sorted
  by total movement desc. Filters: from/to, godown, itemType, q (item-code search
  post-group, pcs-stock precedent).
- agentTools chips: `get_stock_ledger` on all five (the same read path — the two-door
  proof); NO new tools.

### 1-C. Order-wise pcs register (the sixth config, same file)

`orderwise-pcs` → /pieces/orderwise (legacy FrmOrderwisePcsReg — "pcs-stock grouped
by order"). NEW aggregation service `queryOrderwisePcs` (registers/orderwise-pcs.ts):
CurrentStock itemType='pcs' grouped by orderId → orderNo + buyer (Order → Buyer
relation), distinct styles, distinct godowns, Σ pcs, Σ value; unlinked rows group
under '—' (no dead hrefs). Filters: godown, q (order-no search post-group). Columns:
order, buyer, styles, godowns, pcs, value. agentTools chip: `get_stock`.

### 1-D. Pages, CSV, menu

- 6 page.tsx (RegisterScreen archetype, stock-ledger page pattern — parse → service →
  hand over; groupLabel 'Inventory & Warehouse' / 'Pieces (Finished Goods)').
- 6 csv/route.ts via `makeCsvRouteHandler(slug)` (same service, same filters).
- Menu registry: +6 items — five in the inventory group directly after `stock-register`
  (day-book cluster), one (`orderwise-pcs`) after `pcs-stock` in pieces. ITEMS 115→121,
  LIVE_ROUTES 147→153. legacyForms cited per the audit table; phase M19; arch RG.

## 2. Wave B — cutting & issue day-books + supplier pending (FROZEN 2026-08-30)

ERRATUM (verified against the real schema before code — rule #4): there is no
`CutLine` model; CutOrder's children are `CutBundle` (relation `bundles`). The
cutting register aggregates CutOrder + CutBundle counts.

| slug | route | group | legacy form | service (all NEW unless noted) |
|---|---|---|---|---|
| `cutting-register` | /cutting/register | cutting | FrmCutingReg | queryCuttingRegister (CutOrder ← order.style, bundle counts) |
| `line-issue-register` | /production/issue/register | production | FrmOrdBundIssToLineReg | queryLineIssues (LineIssue ← order, line) |
| `supplier-pending` | /procurement/supplier-pending | procurement | frmSupordPendReg | querySupplierPending (per-PO ordered vs received — party-balance stays the per-PARTY rollup; this is the per-PO chase list) |
| `po-register` | /procurement/po/register | procurement | FrmSupplierOrderRegister | queryPoRegister (the PO day-book — poNo/type/party/dates/qty/value/status; `variant` select = poType, NO preset: all POs is home) |
| `supplier-history` | /procurement/supplier-history | procurement | FrmSuppOrderHistoryReg | querySupplierHistory (per-party period rollup: POs, ordered, received, pending value, last receipt date — party-balance is the pending-chase; this is the full-period supplier view incl. closed POs) |

Decisions (the §2 open questions, resolved):
- frmSupordPendReg = per-PO rows (NOT a preset on party-balance — different grain:
  party-balance rolls up per party; the pending register is one row per PO with
  pending > 0 by default, status filter widens).
- FrmSupplierOrderRegister maps to a full PO day-book (`po-register`) — the app's
  "supplier order" family (poType=general) is one poType option in the variant
  select, NOT a preset (an all-PO register is the honest home; the supplier-order
  family keeps its own doc screens).
- Trading in-hand FOLD: /orders/in-hand gains a `variant` select
  (all | manufacturing | trading). DISCRIMINATOR IS DERIVED (zero schema):
  manufacturing = order has ≥1 CutOrder OR ≥1 Program OR ≥1 ProductionEntry
  (the factory touched it); trading = none of those (nothing manufactured —
  pure buy/sell or not yet started; the option label says "Trading (no
  production)" to stay honest). queryInhandOrders changes ADDITIVELY (a filter
  branch, not a fork — Wave A's "zero service changes" stance is waived for
  this one additive filter by this spec line).

- agentTools chips: ZERO new tools — cutting-register cites `list_cut_orders`;
  line-issue-register cites `get_line_status` + `issue_to_line`; supplier-pending
  cites `list_purchase_orders` + `get_party_ledger`; po-register cites
  `list_purchase_orders`; supplier-history cites `get_party_ledger`.
- Pages: 5 page.tsx + 5 csv/route.ts (gen_m19b_pages.mjs, same template as Wave A).
- Menu: +5 items → 126 items / 158 LIVE_ROUTES (cutting 10→11 after
  cutting-production; production after issue-to-line; procurement after
  party-balance ×3). Phase 'M19'.
- Tests: tests/unit/wave-b-registers.test.ts (cutting math incl. bundle counts +
  status filter; line-issue rows + order filter; supplier-pending ordered-vs-
  received math + pending-only default; po-register variant=poType + date filter;
  supplier-history rollup + last-receipt; inhand trading/manufacturing
  discriminator) + register-configs slug pin 27→32 + menu pins 121→126.

## 3. Wave C — masters completion (FROZEN 2026-08-30; ADR-019)

The gap-audit §2 "8 painful ones" become 11 Prisma models (65→76, additive —
spec said "~73"; the "+account/+category/+group" children in the spec's own
line account for the delta) + 11 master configs + create/update/list tools.

| model | config slug | category | code prefix | key fields |
|---|---|---|---|---|
| Bank | bank | commercial | BK- | name |
| BankAccount | bank-account | commercial | ACC- | accountNo, bankCode→bankId, branch, ifsc, accountType, upi, active |
| Mill | mill | commercial | MIL- | name, city, gstin, notes |
| MachineCategory | machine-category | org | MC- | name |
| Machine | machine | org | MCH- | name, machineCategoryCode→machineCategoryId, capacityPcsPerHour, notes |
| State | state | admin | ST- | name, gstCode (first-2 GSTIN digits) |
| Shade | shade | product | SHD- | name, notes (shade ≠ colour: family × depth) |
| ThreadType | thread-type | product | THR- | name, notes |
| CountGroup | count-group | product | CG- | name, notes |
| RangeGroup | range-group | product | RG- | name |
| SizeRange | size-range | product | RNG- | name, rangeGroupCode→rangeGroupId, sizes (CSV text — SizeGroup 'list' type is sizeGroup-only in the service; a plain CSV keeps the service generic) |

- Prisma delegate names: db.bank / bankAccount / mill / machineCategory / machine /
  state / shade / threadType / countGroup / rangeGroup / sizeRange.
- FK resolution rides the generic refEntity defaults (bankName /
  machineCategoryName / rangeGroupName display keys; no OVERRIDES needed).
- Tools: 11 create + 11 update (masterCreateTool/masterUpdateTool factories)
  + 11 list doors (inline, the list_shifts pattern) → 189→222 tools.
- Menu: ZERO new items — the /masters hub auto-lists configs by category
  (configsByCategory); MASTER_FORMS already claims these legacy forms.
- Tests: master-configs contract count 30→41; master-parity inputFor cases
  +11 (the runtime loop auto-generates the both-doors parity suite); FK
  resolution test for bank-account (by bank code); context_check pins.
- The ~14 minor masters (Concern, DeliveryAt, WorkNature, Template, BuyerDept,
  Fcy/FCR, FomGrp, DeptGroup, CommRate/PrdnRate/RateMaster, StageWiseTag,
  PreCostingCompMas) → ADR-019: AppOption-style config / folded into existing
  masters / rejected-as-obsolete. NO models.
- shift-wages linkage stays DEFERRED (needs a ProductionEntry⇄Shift decision —
  no shiftId field; do not invent one without a spec).

## 4. Wave D — closing-stock as-of, counter-book mode, Tally JSON (FROZEN 2026-08-30)

**D1 — Closing stock as-of-date** (audit §3-C1-2 "period-end statement, godown/party-wise"):
NEW service `queryClosingStock` (registers/closing-stock.ts) — StockLedger rows with
docDate ≤ the `to` filter (CUMULATIVE — `from` is ignored by design, the config declares
only `to`), grouped by (itemType, itemId, godown): closing = Σin − Σout per uom column
SEPARATELY (never across uoms — gotcha §14), item codes via the id-map helper, valuation =
closing qty × the LATEST ledger rate for that (item, godown, uom). Columns: type, item,
godown, bags/kgs/mtrs/pcs closing, value. Config `closing-stock` → /inventory/closing-stock
(menu inventory, after stock-register; FrmClosingStockRegister family). agentTools:
get_stock_ledger (the same read path). Filters: to (as-of), godown, itemType, q.

**D2 — Counter-book grouped register mode** (audit §7-C): registers get a
`counterBook?` config — present → the screen offers a Counter-book toggle
(`?mode=counter`): rows grouped into sections by a row field (docDate), sections
rendered ASCENDING (the handwritten day-book is chronological), each with a per-day
subtotal row over the numeric columns, and optional cumulative running-balance columns
from `balancePairs` (in−out running). v1 ships on the two day-book surfaces —
stock-ledger (/inventory/ledger) + daily-in-out (/registers/daily-in-out) — with NO
balancePairs (multi-uom running balances are ill-defined; subtotals only — honest).
Render is a server-side group helper + section table in RegisterScreen; rows keep W2
drill-downs; CSV/page params unchanged; RegisterRows stays for the flat mode.

**D3 — Tally JSON export** (audit §3-C1-10, open decision #3 RESOLVED as "JSON adapter"):
NEW service `buildTallyExport(from, to)` (registers/tally.ts) — reads SalesInvoice
(Sales voucher: party Dr / Sales Cr + GST split), Payment (Receipt when direction=in /
Payment when out: party Cr|Dr / Bank-Cash Dr|Cr), Journal (Journal: debitAccount Dr /
creditAccount Cr) for the window → Tally-import-shaped JSON
{ companyName (AppOption print.companyName), fromDate, toDate, vouchers: [{
voucherType, date, voucherNo, party, amount, narration, ledgerEntries: [{ ledger,
amount, isDebit }] }] }. Exported via guarded GET /api/tally?from=&to= (requireApiSession;
attachment disposition) + a small /accounts/tally-export screen (date pickers + preview
counts + download) → menu item 'tally-export' (accounts group, RG). agentTools chip:
list_invoices (the chat door for the same data).

Menu: +2 items (closing-stock, tally-export) → 128 items / 160 LIVE_ROUTES.
Tests: tests/unit/wave-d-registers.test.ts (closing math incl. as-of cutoff + per-uom
separation + latest-rate valuation; counter-book grouping/subtotal/ascending math as a
pure function; tally adapter voucher shapes + GST split + direction mapping) +
register-configs 32→33 + menu pins 126→128 + api-guard family +tally.

## 5. Acceptance gates (Wave A)

1. vitest: existing suites green; NEW material-stock tests (preset parse contract ×4
   incl. explicit-beats-preset + itemwise math + orderwise math with TS-tagged
   fixtures, children-first cleanup per PITFALLS #40); register-configs 21→27 slug
   pin + ROUTE_BY_SLUG +6; menu pins 115→121.
2. tsc src/ 0 errors; eval_routing --static PASS.
3. context_check: pins bumped (REGCFGS 20→21, REGSVCFILES 23→25, MENUITEMS 115→121,
   LIVEROUTES 147→153, REGCFGTESTS +new its, +file pins incl. SPEC-M19) → NO DRIFT.
4. NEW scripts/route_smoke_m19.sh (authenticated curl): each of the 6 routes 200 with
   SSR markers; yarn/fabric/acc routes return ONLY their itemType rows (preset proof);
   general unfiltered; itemwise grouped summary; orderwise summary; CSV exports 200
   text/csv; menu sidebar carries the new labels; regression route_smoke_m18c 22/22.
5. LIVE browser verify: /inventory/stock/yarn lands preset (select shows Yarn, rows
   yarn-only), '/' focuses the first text/date filter, zero console errors; screenshot
   download/m19-material-registers.png.

## 6. Risks

- Preset vs "All" UX trap: solved by hiding "All" on preset selects (1-A).
- RegisterROWS drill-down: stock-ledger hrefs ride docNo→family resolution — reused
  verbatim (yarn/fabric/acc/general are the same service, so drill-downs work as-is).
- CSV helper: makeCsvRouteHandler(slug) reads REGISTER_SERVICES — new slugs flow
  through with zero csv.ts changes (verify in smoke).
- Menu growth beyond 113-parity is net-new capability (M5/M6 precedent) — the parity
  tracker stays honest by keeping legacyForms citations.

## 7. Implementation record (shipped 2026-08-29, Wave A)

- Convergence prelude: the session opened on a FOURTH parallel-session race — local
  f1db359 vs remote a5565b5 were the SAME M18-C commit (same parent cb5626a, same
  author/date) except the local tree was MISSING upload/route.ts (the gremlin's 4th
  visit — this time the local commit captured the deletion despite PITFALLS #39;
  the remote sibling carried the correct restoration). Remote adopted losslessly
  (local had nothing unique); baseline gates re-verified on a5565b5 (758 vitest ·
  tsc src 0 · context_check 435/435 · eval static PASS).
- §1-A preset mechanism: types.ts `preset?: string`; parseRegisterQuery per-filter
  `params[key] ?? preset`; filter-bar draft init `params ?? preset ?? ''` + "All"
  option hidden on preset selects. Slash reflex unaffected (godown text input is
  the yarn day-book's '/' target — first text-flavoured filter).
- §1-B/§1-C: register-configs/material-stock.ts (6 configs; shared ledgerColumns
  helper, constant itemType column dropped on the 3 preset day-books); registers/
  itemwise-stock.ts + orderwise-pcs.ts (aggregation services, take-5000 source cap,
  id-map code resolution incl. pcs→styleNo, unlinked '—' with null hrefs);
  REGISTER_SERVICES +6 (4 day-books bind queryStockLedger verbatim — bijection
  holds); 6 pages + 6 CSV routes via scripts/gen_m19_pages.mjs (one-shot generator,
  persisted); menu +6 items (inventory 9→14, pieces 9→10) → 121 items / 153 routes;
  Phase union extended with 'M19'.
- Gates: vitest **800/800** (758 + material-stock 11: preset contract 5 + itemwise
  math 4 + orderwise math 3... 11 total incl. service-identity pin) · tsc src/ 0 ·
  eval --static PASS · context_check 435→**448/448** NO DRIFT (menu 121, LIVEROUTES
  153, regcfgs 21, regsvcs 25, +13 file pins incl. SPEC-M19 + the generator) ·
  NEW scripts/route_smoke_m19.sh **31/31** · regressions m18c 22/22 + m9 38/38.
- Smoke-hardening lesson (candidate PITFALLS #41): fixtures must be FUTURE-dated
  AND HUGE — the dev seed carries ≈800 ledger rows dated 2026-09-20 (future vs
  today) and the day-books page by docDate DESC (limit 100), while itemwise ranks
  by total movement; date-now/small-qty fixtures silently fell off page 1. Also:
  the sidebar renders only the ACTIVE group's items — assert group-local pages.
- LIVE browser-verified: /inventory/stock/yarn lands preset (select value "yarn",
  4 options, NO "All", 100 yarn-only rows, Type column absent as designed); '/'
  focuses rf-godown; itemwise renders per-uom-separated cells (pcs row: txns 5,
  in/out pcs 1,950/1,950, all other uom cells empty); parity footer "121 of 121
  screens live · 100%"; ZERO console errors; screenshots
  download/m19-material-registers.png + download/m19-itemwise.png.
- Dev-db hygiene: smoke + debug fixtures verified zero-residue post-run (all six
  entity counts 0); db/custom.db committed per convention.
- Wave B (cutting + issue-to-line + supplier pending registers), Wave C (masters
  completion — Bank/Mill/Machine/State/Shade/ThreadType/CountGroup/Range, schema
  65→~73 + the shift-wages linkage decision), Wave D (closing-stock as-of,
  counter-book mode, Tally JSON) remain spec'd-only in §2–§4.
