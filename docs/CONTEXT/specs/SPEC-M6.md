# SPEC-M6 — Reports, MIS, Admin & the Last Mile (36 items → 113/113)

> **FROZEN IMPLEMENTATION SPEC.** Written BEFORE any M6 code (rule: spec-before-code,
> `docs/CONTEXT/00-START-HERE.md` #3). A session with ZERO chat context implements
> M6 correctly from this file alone. Sources verified against:
> `prisma/schema.prisma` (61 models; GRN has NO status column; LineIssue.status
> defaults 'issued'; JobworkOrder.status; PcsDespatch carries vehicleNo +
> courierName; Approval.entity is a free string), `src/lib/erp/menu-registry.ts`
> (36 non-live items: 9 phase-'M6' + 22 phase-'M3' + 5 phase-'M2'),
> `src/lib/agent/tools.ts` (159 tools; update_order, cancel_purchase_order,
> receive_grn, receive_jobwork, create_line_issue, post_production_entry,
> transfer_stock, post_stock_adjustment, get_program_status, get_line_status,
> get_dashboard_kpis all exist), `src/lib/erp/registers/` (19 services +
> fetchCurrentStock + order-status), `src/lib/erp/approval-kinds.ts` (4 kinds),
> PLAN-2.0 §6-M6 / §7. Status: APPROVED FOR IMPLEMENTATION.

## 1. Goal

Take parity from **77/113 → 113/113 items live (100%)** — the final milestone.
Every one of the 36 remaining menu items goes live by one of four mechanisms,
chosen per item and FROZEN in §2:

1. **ReportScreen engine (RH)** — a NEW archetype (#4): parameterized report
   runner over the EXISTING service layer (registers reuse their services;
   ~13 new report services for MIS-type aggregates). Report Hub + 6 packs +
   MIS dashboard + Daily Unit P&L. ONE new agent tool: `render_report`.
2. **ADR-016 schema growth** — 5 additive models (User, UserGroup, AppOption,
   Hsn, TestParameter) 61 → 66; UserGroup.rights is a Json column (menu
   rights matrix needs NO own model). Admin screens are MasterTable-backed.
3. **Variant doc configs (the M5 §4 pattern)** — courier DC / loading /
   opening stock / pcs transfer / multi-process GRN / DC family / cutting
   variants reuse EXISTING posting services with injected defaults.
4. **Approval-kind IN screens (the M5 §6 pattern)** — the four remaining IN
   items (grn-acceptance, cutting-ack, pcs-grn-acceptance, lot-approval) are
   new `Approval.entity` kinds with accept doors via proposeApprovalGate;
   ZERO changes to existing models (GRN gets no status column — the Approval
   row IS the acceptance state).
   Plus **aliases** — 5 items whose functionality already ships under another
   route get thin re-export pages (no duplicate logic, route renders 200).

Plus the **print slice**: print CSS (sidebar/topbar/agent panel hidden),
a PrintButton client component with copy selector (Original | Duplicate |
Triplicate — the legacy 3-template convention) on ReportScreen + doc views,
`?copy=` banner. CSV export rides the existing `?format=csv` / `/csv` pattern.

**Acceptance (all must pass):**
1. `npx vitest run` — all 393 existing tests stay green UNMODIFIED (additive
   only) + new suites (§12): ≥ 430 total.
2. `npx tsc --noEmit` — no NEW errors beyond the known orphans (STATE #6).
3. `parityStats()`: **113/113 items live, 17/17 groups** — every §2 row.
4. Every new WRITE item: form save and agent commit produce IDENTICAL db rows
   (parity test per family — the M3 P2 pattern, §12).
5. Route smoke: every new route → 200 (+ representative param query + CSV
   `?format=csv` where RH); all 108 existing live routes stay 200.
6. New tools: **159 → 183** (§8) — each with zod schema, json output, and the
   SAME service the screen calls.
7. `scripts/context_check.sh` updated for M6 reality — all green.

## 2. The 36 items (frozen inventory — wave + mechanism)

| # | item (route) | arch | mechanism / backing | wave |
|---|---|---|---|---|
| 1 | report-hub `/reports` | RH | ReportScreen engine + report registry (~28 reports, §4) | **A** |
| 2 | report-packs `/reports/packs` | RH | 6 pack cards → filtered catalog (order/production/inventory/accounts/costing-hr/quality) | **A** |
| 3 | mis-dashboard `/reports/mis` | DB | KPI tiles (get_dashboard_kpis + order-status + AR/AP) + CSS trend bars + deep-links | **A** |
| 4 | daily-unit-pnl `/costing/daily-pnl` | RH | NEW service `daily-pnl`: per-dept/day Σ ProductionEntry.amount + Expense + Journal wages vs produced qty | **A** |
| 5 | users-groups `/admin/users` | ST | ADR-016 User+UserGroup; two MasterTables (tabs); masters #28/#29 | **B** |
| 6 | menu-rights `/admin/menu-rights` | ST | rights matrix over UserGroup.rights Json × MENU_ITEMS groups; save via update_user_group door | **B** |
| 7 | options-settings `/admin/options` | ST | ADR-016 AppOption (key unique, value, group, label); MasterTable #30; print-header + default-godown options are READ by the app (§7-B) | **B** |
| 8 | courier-dc `/dispatch/courier` | DS | despatch VARIANT (planPcsDespatch, mode=courier: courierName required, vehicleNo hidden); docTool `create_courier_dc` | **B** |
| 9 | loading `/dispatch/loading` | DS | despatch VARIANT (status='loading' commit; LAD-#### docNo space); docTool `create_loading_challan` | **B** |
| 10 | order-enquiry `/orders/enquiry` | RG | ALIAS page re-exporting the order-register screen (search by buyer/style/date/status/doc-no — the register already does this) | **C** |
| 11 | program-status `/programs/status` | RG | NEW register service `program-status` (Program + ledger aggregates — get_program_status logic as a table); register-config #20 | **C** |
| 12 | stock-view `/inventory/stock` | RG | NEW register service `current-stock` over fetchCurrentStock (live buckets by item/godown); register-config #21 | **C** |
| 13 | line-status `/production/line-status` | DB | WIP board page (order-status-board pattern): per-line issued vs produced vs pending from LineIssue × ProductionEntry | **C** |
| 14 | order-amendments `/orders/amendments` | DS | thin DocScreen over a NEW planOrderAmend (update_order service exposed to the form; history = Order notes + updatedAt); tool EXISTS | **C** |
| 15 | order-close `/orders/close` | DS | thin screen + NEW tool `close_order` (status='closed' when shipped+billed; blocks new entries — posting services already reject closed orders) | **C** |
| 16 | po-cancel-complete `/procurement/po/close` | DS | thin screen: cancel (tool EXISTS cancel_purchase_order) + complete (NEW tool `complete_purchase_order`) | **C** |
| 17 | program-cancel `/programs/cancel` | DS | thin screen + NEW tool `cancel_program` (status='cancelled' + ledger net-zero assertion) | **C** |
| 18 | program-complete `/programs/complete` | DS | thin screen + NEW tool `complete_program` (status='complete' when balance ≤ 0 or forced) | **C** |
| 19 | multi-process-grn `/procurement/grn/multi-process` | DS | GRN VARIANT (grnType='process_return', multi-line across components; MP-#### docNo); agent door = receive_grn (EXISTING schema already multi-line) | **D** |
| 20 | grn-acceptance `/procurement/grn/acceptance` | IN | APPROVAL KIND `grn_acceptance` (queue over recent GRNs; accept door `accept_grn` via proposeApprovalGate) | **D** |
| 21 | opening-stock `/inventory/opening-stock` | DS | stock-adj VARIANT (OPN-#### docNo, action='add' fixed, reason='Opening stock'); docTool `post_opening` | **D** |
| 22 | cutting-issue `/cutting/issue` | DS | line-issue VARIANT (dept fixed to Cutting; rolls qty); agent door = create_line_issue (EXISTING, deptCode param) | **D** |
| 23 | ready-to-cut `/cutting/ready-to-cut` | DS | transfer VARIANT to the virtual Cutting dept (PITFALLS #12 legacy DeptID −7 → our Department code 'CUT' or explicit); docTool `ready_to_cut` | **D** |
| 24 | cutting-production `/cutting/production` | DS | production VARIANT (cutting dept output, chainStage 4); agent door = post_production_entry (EXISTING) | **D** |
| 25 | cutting-ack `/cutting/ack` | IN | APPROVAL KIND `cutting_ack` (queue over LineIssue to cutting; accept door `acknowledge_cutting_issue`) | **D** |
| 26 | pcs-receipt `/pieces/receipt` | DS | ALIAS page re-exporting /jobwork/receipt (receive_jobwork IS pcs receipt) | **D** |
| 27 | pcs-grn-acceptance `/pieces/gan` | IN | APPROVAL KIND `pcs_acceptance` (GAN queue over JobworkOrder status='received'; accept door `accept_jobwork_pcs`; PITFALLS #12 semantics documented on the page) | **D** |
| 28 | pcs-transfer `/pieces/transfer` | DS | transfer VARIANT (itemType='pcs' fixed, PT-#### docNo); agent door = transfer_stock (EXISTING schema takes itemType) | **D** |
| 29 | line-output `/production/line-output` | DS | production VARIANT (lineId required, manual tally entry); agent door = post_production_entry (EXISTING) | **D** |
| 30 | dc-entry `/dispatch/dc` | DS | jobwork-DC VARIANT generalized: material DC to ANY party w/ process + itemType (yarn|fabric|accessory); docTool `create_dc` (DC- space shared with despatch is FORBIDDEN — uses MDC-####) | **D** |
| 31 | process-dc `/dispatch/dc/process` | DS | jobwork-DC VARIANT (multi-component process DC; PDC-####); agent door = create_dc (process flag) | **D** |
| 32 | dc-return `/dispatch/dc-return` | DS | GRN VARIANT (grnType='process_return' against a DC; RTN-####); agent door = receive_grn (EXISTING) | **D** |
| 33 | lot-approval `/quality/lot-approval` | IN | APPROVAL KIND `lot` (queue over dyeing/knitting GRN lots; accept door `approve_lot`) | **D** |
| 34 | hsn-gst-setup `/accounts/hsn-gst` | ST | ADR-016 Hsn (code unique, description, gstRate, hsnType); MasterTable #26; factory tools ×2 | **D** |
| 35 | employees `/hr/employees` | MT | ALIAS page re-exporting the /masters/employee MasterTable | **D** |
| 36 | test-parameters `/quality/parameters` | MT | ADR-016 TestParameter (code, name, stage, method, unit); MasterTable #27; factory tools ×2 | **D** |

Wave parity ladder: A 77→81 · B 81→86 · C 86→95 · D 95→**113**.

## 3. Non-goals (explicitly OUT)

1. **No authentication/login flow** — User/UserGroup manage the DATA (and
   menu-rights read it); the app stays single-user dev mode. Login is M7+.
2. **No role-based route guarding** — the rights matrix persists + renders;
   middleware enforcement is M7+ (documented on the screen).
3. **No bespoke PDF engine** — print = browser print-CSS (`window.print()`);
   PDF export = CSV where RH. Tally export = JSON adapter is SKIPPED (open
   decision #3 resolved: skip; the party-ledger CSV covers the data).
4. **No multi-company UI** — open decision #1 resolved: single-company stays,
   coyCode field preserved (no change).
5. **No GRN status column** — acceptance state lives in Approval rows only.
6. **No chart library** — MIS bars are CSS (the dashboard.tsx pattern).
7. **No new ledger semantics** — every Wave D variant rides EXISTING posting
   services (ADR-001); if a variant seems to need new ledger math, that is a
   spec ERRATUM, not a code decision.

## 4. Architecture — the ReportScreen engine (Wave A core)

**Files** (mirrors the register layer 1:1):

```
src/lib/erp/report-configs/         PURE DATA (no db imports — like register-configs)
  types.ts                          ReportConfig { slug, title, pack, description,
                                    params: RegisterFilter[], columns: RegisterColumn[],
                                    agentTool, askPrompt, emptyMessage?, defaultParams? }
  <per-report>.ts or packs.ts       ~28 configs
  index.ts                          REPORTS registry + REPORT_PACKS (6) + getReportConfig
src/lib/erp/reports/
  index.ts                          REPORT_SERVICES: slug → (q) => Promise<RegisterResult>
                                    (RegisterQuery/RegisterResult REUSED verbatim — zero new
                                    result types; order-status/recon stay out, M4 §10 rule)
  <13 new service files>            current-stock, outstanding-summary, gst-summary,
                                    daily-pnl, order-status-summary, sample-status,
                                    despatch-packing-summary, line-wip, rejection-summary,
                                    operation-summary, expenses-summary, cost-sheet-summary,
                                    lab-tests
src/components/archetypes/report-screen.tsx   server component (param form + summary band +
                                    totals + table + CSV link + print button + pack breadcrumb)
src/components/erp/print-button.tsx           client (window.print + copy selector ?copy=)
src/app/(erp)/reports/page.tsx                hub: search + 6 pack cards + full catalog
src/app/(erp)/reports/packs/page.tsx          pack cards w/ report lists
src/app/(erp)/reports/[slug]/page.tsx         the runner (unknown slug → 404)
src/app/(erp)/reports/[slug]/csv/route.ts     CSV (makeCsvRouteHandler pattern)
src/app/(erp)/reports/mis/page.tsx            MIS dashboard (DB)
```

**The 28 reports** (pack ← slug ← binding; * = NEW service):

| pack | reports |
|---|---|
| order | Order Register (bind order-register) · In-hand Orders (bind inhand-orders) · Order Status Summary * · Sample Status * · Despatch & Packing Summary * |
| production | Production Status (bind production-status) · Daily In-Out (bind daily-in-out) · Line WIP Summary * · Rejection Summary * · Operation Summary * |
| inventory | Stock Register (bind stock-register) · Current Stock * · Stock Ledger (bind stock-ledger) · Lot Tracking (bind lot-tracking) · IO History (bind io-history) |
| accounts | Bills Register (bind bills-register) · Supplier Bills (bind supplier-bills) · Party Ledger (bind party-ledger) · Party Balance (bind party-balance) · Outstanding Summary * (AR/AP aging buckets) · GST Summary * (invoice tax lines by rate) |
| costing-hr | Budget vs Actual (bind budget-vs-actual) · Daily Unit P&L * · Expenses Summary * · Wages Summary (bind production-wages) · Cost Sheet Summary * |
| quality | Lab Test Report * · Approval Audit Trail (bind approval-audit) |

Rules: (a) a bound register keeps BOTH screens — the register is the working
filter table, the report adds print/copy chrome + preset defaults; ONE service.
(b) `daily-unit-pnl` menu item routes to `/costing/daily-pnl`, a page that
renders ReportScreen for slug `daily-unit-pnl` (same mechanism, own route).
(c) `render_report` tool schema: `{ slug, from?, to?, party?, order?, godown?,
itemType?, status?, limit? }` → runs the SAME service, returns
`{ text, json: { rows, totals } }`; unknown slug → error text listing packs.
(d) report slug set is FROZEN in the contract test (§12) — adding a report is
a spec ERRATA append, never silent.

**MIS dashboard** tiles (each deep-links a report/register — the M4-C KPI
pattern): Open Orders + pcs (order-status) · Production today/MTD
(production-status) · Stock Value by itemType (current-stock) · AR + AP
outstanding (outstanding-summary) · Pending Approvals (approval-audit) ·
Top 5 buyers by despatch value (despatch-packing-summary) + a 14-day
production bar (CSS divs) from daily-in-out. ALL tiles reuse report services —
the dashboard imports REPORT_SERVICES, zero new queries.

**Print slice**: `src/app/globals.css` gains `@media print` rules (hide
sidebar/topbar/agent-panel/filter-bar; white bg; table borders).
PrintButton appears on: every ReportScreen, every doc View (DocScreen view
mode header), Order Hub, MIS dashboard. `?copy=original|duplicate|triplicate`
renders a print-only banner (client reads searchParams; default original).

## 5. ADR-016 — schema growth (Wave B freeze; Wave D uses it too)

61 → 66 models, additive only, ZERO changes to existing models:

```prisma
model User {
  id        String     @id @default(cuid())
  login     String     @unique
  name      String
  userGroupId String?
  userGroup UserGroup? @relation(fields: [userGroupId], references: [id])
  active    Boolean    @default(true)
  createdAt DateTime   @default(now())
}
model UserGroup {
  id        String   @id @default(cuid())
  name      String   @unique
  rights    Json     @default("[]")   // MENU group/item ids the group may see; [] = all
  createdAt DateTime @default(now())
  users     User[]
}
model AppOption {
  id    String @id @default(cuid())
  key   String @unique          // print.companyName | print.address | print.gstin |
                                // print.tin | default.godownCode | app.currency
  value String
  group String @default("general")  // print | defaults | general
  label String
}
model Hsn {
  id       String  @id @default(cuid())
  code     String  @unique
  description String
  gstRate  Float   @default(0)
  hsnType  String  @default("goods") // goods | service
}
model TestParameter {
  id     String  @id @default(cuid())
  code   String  @unique
  name   String
  stage  String? // knit | dye | print | sew | final
  method String?
  unit   String? // gsm | % | mm
}
```

`db push` + `generate` per Wave B start; restart the dev server after generate
(PITFALLS #31). Tag `schema-61-baseline` BEFORE the push.

**Options the app READS** (honest wiring, §7-B): DocScreen/ReportScreen print
header + Order Hub print pull `print.companyName|address|gstin` via a cached
`getOptions()` helper (`reports/options.ts`, `unstable_cache` 60s); pickers'
default godown seed = `default.godownCode` when present. Nothing else branches
on options (documented on the screen).

## 6. Approval kinds — the four IN items (Wave D; M5 §6 pattern verbatim)

`APPROVAL_KINDS` 4 → 8. New kinds (queue source + accept door):

| entity | route | queue over | tool | refResolver |
|---|---|---|---|---|
| grn_acceptance | /procurement/grn/acceptance | recent GRNs (all types) | accept_grn | /procurement/grn/[id] |
| cutting_ack | /cutting/ack | LineIssue to cutting dept | acknowledge_cutting_issue | /cutting/issue (list anchor) |
| pcs_acceptance | /pieces/gan | JobworkOrder status='received' | accept_jobwork_pcs | /jobwork/order/[id] |
| lot | /quality/lot-approval | GRN lines of dyeing/knitting lots (itemType fabric/yarn, dept dye|knit) | approve_lot | /procurement/grn/[id] |

Rules (M5 §6 verbatim): kind === Approval.entity; the accept door is
proposeApprovalGate (find-or-create + approve, idempotent); the IN screen is a
filtered inbox view + W2 drill links; creation is MANUAL (a Queue card button
"Send to acceptance" writes the Approval row — no posting-service hooks; the
legacy queues were explicitly human-stepped, unlike Wave C's automatic hooks).

## 7. Per-wave detail (binding decisions)

### 7-A Reports & MIS
1. Engine + registry + 13 services + hub/packs/runner/mis routes + csv routes.
2. `render_report` tool. Menu: 3 reports items live; group landing
   `/coming/reports` → `/reports` (menu-registry edit + test pin).
3. `/costing/daily-pnl` renders slug `daily-unit-pnl` ReportScreen.
4. daily-pnl math: per (dept, day): produced value = Σ ProductionEntry.amount;
   wages = Σ ProductionEntry.shiftWages OR Journal wage lines; expenses = Σ
   Expense.amount (deptId); margin = produced − wages − expenses. Asserted in
   tests vs seeded fixtures (§12).
5. outstanding-summary: AR = SalesInvoice.balanceBy party aging (0-15/16-30/
   31-60/60+ by invoiceDate); AP mirrored from supplier bills (GRN bill data).
6. gst-summary: Σ invoices by gstRate × month: taxable, cgst, sgst, igst.

### 7-B Admin & dispatch tail (+ ADR-016 push)
1. Masters #26-30: hsn, test-parameter, user, user-group, app-option
   (master-configs; /masters hub gains an "Admin & Compliance" category).
2. `/admin/users` — two MasterTables (Users | Groups tabs via ?tab=).
   `/admin/options` — MasterTable over AppOption grouped by `group`.
   `/admin/menu-rights` — matrix: rows = 17 groups × items, cols = user
   groups; checkbox grid writing `rights` via update_user_group door
   (saveMenuRightsAction → master-service update; [] = all documented).
3. courier-dc config: wraps planPcsDespatch injecting `{ mode: 'courier' }` —
   plan validates courierName required, vehicleNo optional (M5 §4 variant
   recipe; despatch schema unchanged — variant schema relaxes only the
   injected keys).
4. loading config: wraps planPcsDespatch with `{ status: 'loading' }` +
   LAD-#### docNo space (despatch service gains an optional `mode` param:
   'despatch' (default) | 'loading' — status starts 'loading' instead of
   'despatched'; ledger posts identically at commit; ERRATUM risk logged).
   create_loading_challan docTool wraps the same plan.
5. Factory tools ×6 (user, user-group, app-option create+update) +
   create_courier_dc + create_loading_challan docTools.

### 7-C Registers & lifecycle
1. order-enquiry + employees + (D) pcs-receipt ALIAS pages: `export {
   default } from '../register/page'` style re-exports (own metadata title);
   LIVE_ROUTES gains the alias route. Aliases are NOT new logic — smoke 200.
2. program-status register: rows = Program per order (orderNo, item,
   required, produced/consumed, balance, status); service extracted from the
   get_program_status tool body into `registers/program-status.ts`; the tool
   DELEGATES to it (tool json shape frozen — assert in tests).
3. current-stock register: rows = CurrentStock buckets (item, type, godown,
   dept, kgs/mtrs/pcs/bags, rate, value); reuses fetchCurrentStock +
    value = kgs*rate|mtrs*rate|pcs*rate per itemType; totals band = Σ value.
4. line-status board: per Line × open order: issued (Σ LineIssue.qty),
   produced (Σ ProductionEntry.qty), WIP = issued−produced, efficiency;
   `get_line_status` logic extracted to `registers/line-wip.ts` (tool
   delegates; board page renders it — the M4 order-status pattern, NOT a
   RegisterScreen).
5. order-amendments: DocScreen over `planOrderAmend` — NEW thin service
   wrapping the update_order tool's inline logic (extracted to
   posting/order-amend.ts; tool delegates — count unchanged). Form = pick
   orderNo → editable qty/date/notes grid → commit (status preserved).
6. close_order / cancel_program / complete_program / complete_purchase_order
   posting services (thin status transitions + guards) + docTools + screens
   (DocScreen with a single picker field + reason; review step shows guards).
   Guards: close_order requires despatch Σ ≥ order.qty×0.95 AND invoice
   exists; cancel_program requires ledger net-zero or force flag;
   complete_program settles ProgBalance (balance ≤ 0 or force).

### 7-D Process tail & info panels
1. Variants (M5 §4 recipe — wrap service, inject defaults, relax only
   injected keys in a variant schema): multi-process-grn (grnType
   process_return, MP- prefix, multi-line), dc-entry (create_dc docTool;
   planJobworkDC generalized with optional party+process+itemType — MDC-
   prefix), process-dc (PDC-, multi-component lines), dc-return (RTN-,
   grnType process_return vs dcNo), opening-stock (OPN-, action add, reason
   fixed), pcs-transfer (PT-, itemType pcs), cutting-issue (dept CUT),
   ready-to-cut (ready_to_cut docTool → planTransfer to cutting dept +
   program stock flag), cutting-production + line-output (production
   variants; agent doors EXIST).
2. ADR-016 Hsn + TestParameter masters (#26/#27) + factory tools ×4 +
   /accounts/hsn-gst + /quality/parameters MasterTable pages.
3. Approval kinds ×4 (§6) + queue cards + wrapper tools ×4.
4. Registry edits: agentTools arrays filled (pendingTools cleared) for ALL
   36 items; SLUG_REVALIDATE + new slugs.

## 8. New agent tools (159 → 183)

Wave A (+1): render_report.
Wave B (+8): create_user, update_user, create_user_group, update_user_group,
create_app_option, update_app_option (factory ×6) + create_courier_dc,
create_loading_challan.
Wave C (+4): close_order, cancel_program, complete_program,
complete_purchase_order. (order-amendments reuses update_order.)
Wave D (+11): post_opening, ready_to_cut, create_dc (dc-entry + process-dc
doors), accept_grn, acknowledge_cutting_issue, accept_jobwork_pcs,
approve_lot (proposeApprovalGate wrappers ×4) + create_hsn, update_hsn,
create_test_parameter, update_test_parameter (factory ×4).

Every write tool = thin delegate to the SAME service the form door calls
(ADR-001; the M5 rule: no inline business logic, zod from schemas/ shared
files where a new schema is needed — opening-stock/ready-to-cut/dc share
variant schema files).

## 9. Page/route recipe (all waves)

New DS/MT/RG/DB pages follow the M3/M4/M5 recipes exactly: DocScreen /
MasterTable / RegisterScreen / board page + `export const dynamic =
'force-dynamic'` + breadcrumb + LIVE_ROUTES entry + registry agentTools flip.
Alias pages: 3-line re-export + metadata. Report runner: dynamic slug page,
`getReportConfig(slug)` → 404 when unknown; `parseRegisterQuery` REUSED for
params (reports accept the same searchParams keys as registers —
shareable URLs, the filter bar component reused with `formAction` swapped).

## 10. Wiring slice

W1 chain bar untouched. W2: report rows deep-link registers/doc views where a
row has a doc ref (order register row → Order Hub — ALREADY the register
behavior; reports inherit via row hrefs from services' existing
resolveDocRef). W5: "Ask about this data" button on ReportScreen (seed =
report title + active params, the register askPrompt pattern). W6: no new
recon. NEW W7 (print): PrintButton + copy banner + print CSS (§4). MIS tiles
deep-link reports (§4). Menu search already covers reports group.

## 11. Order of work per wave (the M3/M4/M5 loop)

1. Read this spec §wave + STATE ground-truth counters.
2. Schema (B only): tag baseline → push → generate → RESTART dev server.
3. Services/schemas (pure logic) → configs/registries → tools.ts delegates.
4. Pages + registry flips + LIVE_ROUTES + SLUG_REVALIDATE.
5. Tests (§12 block) → vitest GREEN → tsc no-new-errors.
6. Seed + route smoke script (all new routes + regression set).
7. context_check.sh update → STATE.md → worklog → commit → tag → PUSH.

## 12. Test plan (additive; existing 393 stay green unmodified)

1. **report-configs contract** (NEW ~40 tests): every report has a service
   binding (bijection slug↔service), pack ∈ 6, columns non-empty, agentTool
   exists (render_report or register tool), params ⊂ REGISTER_FILTER_KEYS,
   daily-unit-pnl ∈ registry, CSV route exists for every slug, hub/packs
   pages list every slug exactly once.
2. **report math** (NEW ~10): seeded fixtures assert daily-pnl (dept/day
   produced−wages−expenses), outstanding-summary aging buckets, gst-summary
   rate×month totals, current-stock value math, line-wip issued−produced−wip,
   program-status required-vs-actual vs ledger aggregates, order-status-
   summary stage counts == computeChainState.
3. **doc-parity-m6** (NEW ~14): courier-dc, loading, opening-stock,
   pcs-transfer, multi-process-grn, dc-entry, dc-return, ready-to-cut × both
   doors (form commitDocAction vs tool execute) — identical db rows +
   ledger signatures; close/cancel/complete ×4 guards accept+reject; accept
   wrappers ×4 idempotent (proposeApprovalGate find-or-create).
4. **master-parity** additions: 5 new masters join the 25-config loop (30
   configs at runtime); user-group rights Json round-trip.
5. **menu-registry**: Wave blocks pin live counts 81/86/95/113, group
   landing /reports, agentTools flips for all 36 rows, alias routes live.
6. **approval-kinds**: 4 new kinds (queue sources + refResolvers + tools).
7. Route smoke per wave (m6a…m6d): every new route 200 + param query + CSV +
   print param + regression set (all prior live routes).

## 13. ERRATA (living — append as discovered, never rewrite history)

**ERRATUM #1 (Wave B, schema)** — §5 said "5 new models 61→66 incl. User".
The schema ALREADY had a `User` model (Phase-1 org model: email/name/role —
AgentTurn.userId is a plain string, not even an FK). ADR-016 therefore
AMENDS the existing User (adds `userGroupId` + `active` columns additively —
login ≡ email, the unique field) and adds FOUR new models: UserGroup,
AppOption, Hsn, TestParameter → **61 → 65 models**. Masters #26-30 unchanged
(user, user-group, app-option, hsn, test-parameter). Tool count unchanged.

**ERRATUM #2 (Wave D, tool count)** — §8 said tools 159→183 (Wave D +11,
of which 4 were hsn/test-parameter factories). Wave B already landed those
4 factories (+ the 5 list tools the master-configs contract requires), so
Wave D adds only +7: post_opening, ready_to_cut, create_dc (docTools ×3) +
accept_grn, acknowledge_cutting_issue, accept_jobwork_pcs, approve_lot
(proposeApprovalGate wrappers ×4). Final count: **181 + 7 = 188** (inline 72
+ factory 60 + docTool 51 — the docTool grep counts only `^  docTool(`
calls; the 4 gates are inline tools).

**ERRATUM #3 (Wave D, frozen agentTools chips that cannot emit the rows)** —
§2 rows 19/28/32 name existing tools as the agent doors for the GRN/transfer
variants: multi-process-grn + dc-return → receive_grn ("EXISTING schema
already multi-line" — it is NOT: receive_grn is PO-based single-qty), and
pcs-transfer → transfer_stock ("schema takes itemType" — the service
REJECTS itemType 'pcs'; pcs buckets key itemId = the ORDER id). The chips
are kept as frozen, but the FORM door (commitDocAction → the variant
service) is the real path; doc-parity-m6d asserts form door ≡ service for
these families. Same lineage for cutting-issue ("create_line_issue,
deptCode param" — no such param exists; the dept rides line.deptId and the
planCuttingIssue wrapper validates it === D3).

**ERRATUM #4 (Wave D, ready-to-cut mechanism)** — §2 row 23 said
"planTransfer to cutting dept": there is NO cutting godown (G1 Main, G2 FG,
G3 Jobworker Yard), and planTransfer forces godown-transfer semantics.
The landed implementation is the legacy-faithful pair (PITFALLS #12,
TrType 20): planReadyToCut posts ready_to_cut_out (null-dept store bucket −,
via postLedger) + ready_to_cut_in (ledger row carries deptId D3; the bucket
is D3-KEYED via bumpStock directly — postLedger forces null-dept buckets by
the ADR-004 rule, and the dept-keyed bucket is the sanctioned planGrm
precedent). RTC-#### docNo; total godown stock unchanged — the D3 bucket IS
the virtual cutting dept.
