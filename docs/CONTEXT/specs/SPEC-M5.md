# SPEC-M5 — Extended Doc Families (36 items)

> **FROZEN IMPLEMENTATION SPEC.** Written BEFORE any M5 code (rule: spec-before-code,
> `docs/CONTEXT/00-START-HERE.md` #3). A session with ZERO chat context implements
> M5 correctly from this file alone. Sources verified against:
> `prisma/schema.prisma` (54 models — SalesInvoice carries `invoiceType`
> domestic|export + `billType` sales|jobwork|yarn_sales|fab_sales + `ern`;
> Budget/BudgetLine exist; PurchaseOrder.poType yarn|fabric|accessory|general;
> ProductionEntry has bundleNo/operatorId/rate/amount/shiftWages/lineId/
> goodFlag/targetStageId; RejectionEntry has rejType + action
> scrap|rework|return_to_party; GRN.grnType includes `process_return`;
> Approval.entity is a free string; Party.partyType is a free string),
> `src/lib/erp/menu-registry.ts` (36 M5-phase items: §2), `src/lib/agent/tools.ts`
> (130 tools; `create_budget` is the ONLY pending tool named in the registry),
> PLAN-2.0 §6-M5 / §7. Status: APPROVED FOR IMPLEMENTATION.

## 1. Goal

Take parity from **41/113 → 77/113 items live (68%)** by shipping the 36 M5-phase
menu items: the long tail of legacy document families (budgets, invoice variants,
wages, panel/shortage/rejection variants, gate & packing docs, lab tests,
samples, approvals gates, roll/contract allotments). Every write item lands
**two doors** (form DocScreen/variant + agent tool sharing ONE posting service,
ADR-001); every read item lands as a RegisterScreen over a shared service
(read-side twin). Zero dead routes: every `phase:'M5'` item goes live or
explicitly defers to M6 in STATE (none defer).

Three structural deliverables:

1. **Variant-doc configs** — DocScreen configs whose `service.plan` injects
   type defaults before delegating to the EXISTING posting service
   (invoice/PO/production/rejection/GRN families). No engine changes.
2. **ADR-015 schema growth** — ONE additive migration adding the 8 genuinely
   new models the long tail needs (Sample, GateEntry, PackingList+Line,
   LabTest, Expense, Shift). 54 → 60 models; zero changes to existing models
   (Party.partyType comment widens to name the `employee` value — comment-only).
3. **Approval kinds** — the 4 IN items are new `Approval.entity` kinds with
   inbox tabs, creation hooks in posting services, and approve/reject via the
   existing approve_pending door (no new inbox engine).

**Acceptance (all must pass):**
1. `npx vitest run` — all 316 existing tests stay green UNMODIFIED (additive
   only) + new suites (§12): ≥ 380 total.
2. `npx tsc --noEmit` — no NEW errors beyond the ~30 known orphans (STATE #6).
3. `parityStats()`: **77/113 items live, 17/17 groups** — every §2 row.
4. Every new write item: form save and agent commit produce IDENTICAL db rows
   (parity test per family — the M3 P2 pattern, §12).
5. Route smoke: every new route → 200 (+ representative filter query + CSV
   `?format=csv` where RG); all 65 existing live routes stay 200.
6. New tools: **130 → 144** (§8) — each with zod schema, json output, and the
   SAME service the screen calls.
7. `scripts/context_check.sh` updated for M5 reality — all green.

## 2. The 36 items (frozen inventory — wave assignment)

| # | item (route) | arch | backing (model/variant) | wave |
|---|---|---|---|---|
| 1 | budget `/costing/budget` | DS | Budget+BudgetLine (EXIST) | **A** |
| 2 | commercial-invoice `/orders/commercial-invoice` | DS | SalesInvoice `invoiceType='export'` + ern | **A** |
| 3 | local-invoice `/accounts/invoice/local` | DS | SalesInvoice `billType='sales'` gst cgst_sgst variant | **A** |
| 4 | piece-jobwork-invoice `/accounts/invoice/piece` | DS | SalesInvoice `billType='jobwork'` variant | **A** |
| 5 | supplier-orders `/procurement/supplier-orders` | DS | PurchaseOrder `poType` process variant | **A** |
| 6 | rate-confirmation `/procurement/rate-confirmation` | RG | POLine rates day-book (read) | **A** |
| 7 | piece-rate-confirmation `/costing/piece-rate` | RG | ProductionEntry rates by operator (read) | **A** |
| 8 | finished-goods-entry `/pieces/finished-goods` | DS | ProductionEntry finishing-stage variant | **B** |
| 9 | operation-entry `/production/operations` | DS | ProductionEntry sub-process variant | **B** |
| 10 | bundle-barcode `/production/bundles` | DS | CutBundle scan → ProductionEntry | **B** |
| 11 | line-transfer `/production/line-transfer` | DS | LineIssue out+in PAIR (one service) | **B** |
| 12 | panel-cutting `/cutting/panel` | DS | CutOrder panel variant | **B** |
| 13 | panel-production `/cutting/panel-production` | DS | ProductionEntry panel-dept variant | **B** |
| 14 | panel-excess `/cutting/panel-excess` | DS | ProductionEntry excess-qty variant | **B** |
| 15 | panel-rej-rework `/cutting/panel-rework` | DS | RejectionEntry `action='rework'` | **B** |
| 16 | fabric-rejection-return `/cutting/fab-rejection` | DS | RejectionEntry `action='return_to_party'` rejType fabric | **B** |
| 17 | pcs-shortage `/pieces/shortage` | DS | RejectionEntry `rejType='shortage'` | **B** |
| 18 | jobwork-pcs-return `/jobwork/pcs-return` | DS | GRN `grnType='process_return'` pcs lines | **B** |
| 19 | costing-input `/costing/input` | DS | CostSheet daily-input variant | **B** |
| 20 | production-wages `/hr/wages` | RG | ProductionEntry rate×qty by operator (read+bill) | **B** |
| 21 | wage-payments `/hr/wage-payments` | DS | Payment `direction='out'` to employee-party | **B** |
| 22 | bill-pass `/accounts/bill-pass` | IN | Approval `entity='supplier_bill'` | **C** |
| 23 | unit-transfer-ack `/dispatch/unit-transfer-ack` | IN | Approval `entity='godown_transfer'` | **C** |
| 24 | reprocess-approval `/quality/reprocess-approval` | IN | Approval `entity='reprocess'` | **C** |
| 25 | non-return-dc-approval `/quality/non-return-dc` | IN | Approval `entity='non_return_dc'` | **C** |
| 26 | samples-enquiry `/orders/samples` | DS | **Sample** (NEW) | **D** |
| 27 | gate-entry `/dispatch/gate-entry` | DS | **GateEntry** (NEW, gateType in) | **D** |
| 28 | gate-pass `/dispatch/gate-pass` | DS | **GateEntry** (NEW, gateType out) | **D** |
| 29 | packing-list `/pieces/packing-list` | DS | **PackingList+Line** (NEW) | **D** |
| 30 | lab-test-entry `/quality/lab-tests` | DS | **LabTest** (NEW) | **D** |
| 31 | expenses `/costing/expenses` | DS | **Expense** (NEW) | **D** |
| 32 | shifts-hours `/hr/shifts` | MT | **Shift** (NEW master) | **D** |
| 33 | production-bills `/accounts/production-bills` | DS | Journal voucherType='journal' wage bill | **D** |
| 34 | roll-tracking `/inventory/rolls` | DS | lot-split stock move (Lot-as-roll convention) | **D** |
| 35 | contract-allotment `/jobwork/contract` | DS | JobworkOrder `status='allotted'` pre-DC record | **D** |
| 36 | fabric-acc-allotment `/programs/allotment` | DS | ProgBalanceFabric/Yarn write door | **D** |

Wave order = A → B → C → D (risk-ascending: zero-churn configs first, new
models last). Each wave ends green + committed + tagged
(`m5-wave-a` … `m5-done`).

## 3. Non-goals (explicitly OUT)

- **No ReportHub engine** — piece-rate-confirmation ships as an RG-family
  screen (register over rates, CSV + print CSS); its registry `arch` stays RH.
- **No roll-level stock ledger** — rolls ride the Lot convention (§7-D-34);
  a physical roll dimension in CurrentStock is M6+ if ever needed.
- **No 3-way bill matching** — bill-pass is an approval gate over
  GRN+PO+party context (§7-C); invoice-to-PO-line matching is M6.
- **No barcode hardware integration** — bundle-barcode is bundle-NO keyed
  entry (scan → input field paste); camera/scanner APIs are out.
- **No W5-full, no MIS charts** (M4 non-goals carry over — M6).
- **No changes to existing tool zod schemas** (VERBATIM rule, PITFALLS #25);
  new tools only, existing json shapes stay field-compatible.
- **No multi-currency on commercial invoice** — amounts stay INR; export FX
  conversion is M6 print-template concern.

## 4. Architecture — the variant-doc pattern (Wave A/B core)

```
DocConfig (new slug, e.g. 'local-invoice')          ← pure data, own route/page
  service.plan: (input) => planInvoice({             ← WRAPS the existing service
      ...input, billType: 'sales',                   ← variant defaults injected
      gstType: input.gstType ?? 'cgst_sgst',
  })
```

Rules:
1. **Variant configs live in `doc-configs/<slug>.ts` and import the EXISTING
   posting service** — they never fork a service. If a variant needs a field
   the base service cannot write (commercial invoice `ern`, supplier-orders
   process fields), ADD a sibling service fn in the SAME posting file
   (e.g. `planExportInvoice` next to `planInvoice`) that shares the helpers —
   the base fn and its tool stay byte-identical.
2. **Number prefixes stay per-family** (INV- for all invoice variants — they
   share the SalesInvoice number space; SUP- POs share PO- space? NO: supplier
   orders are PurchaseOrders → they take PO- numbers via the base service;
   the variant only pins `poType`).
3. **`defaults` are injected in `service.plan`**, NOT via a new engine field —
   zero DocScreen engine changes in M5.
4. New DocScreen pages follow the M3 page recipe (§9): searchParams prefill →
   DocScreen(config) + RecentDocsTable + DocBreadcrumb; `?order=` style
   prefill CTAs on family hubs.
5. Every variant config's `agentTools` names the tool a chat user would call
   (existing tool where the base op already has one; new tool per §8).

## 5. ADR-015 — schema growth (Wave D only)

ONE additive migration (`git`-tagged before Wave D code):

```prisma
model Sample {            // §2 row 26 — frmOrderSample / FrmSampleEntry_WithEnquiry
  id String @id @default(cuid())
  sampleNo String @unique           // SMP-####
  buyerId String?                   // Buyer (free FK col — PITFALLS #21 pattern)
  styleId String?                   // Style (free FK col)
  sampleType String // proto | photo | counter | salesman | production
  qty Int @default(0)
  sampledOn DateTime @default(now())
  status String @default("submitted") // submitted | approved | rejected | closed
  enquiryRef String?                // linked enquiry/order no
  remarks String?
  createdAt DateTime @default(now())
}
model GateEntry {         // §2 rows 27-28 — FrmGateEntry / FrmGatePass
  id String @id @default(cuid())
  entryNo String @unique             // GE-#### (in) / GP-#### (out)
  gateType String // in | out
  gateDateTime DateTime @default(now())
  partyId String?                    // Party (free FK col)
  vehicleNo String?
  refDocNo String?                   // DC/GRN/PO no being gate-logged
  purpose String?                    // remarks
  status String @default("logged") // logged | cleared
  createdAt DateTime @default(now())
}
model PackingList {       // §2 row 29 — FrmPackingList family
  id String @id @default(cuid())
  packNo String @unique              // PKL-####
  despatchId String?                 // PcsDespatch (free FK col)
  orderId String?                    // Order (free FK col)
  buyerId String?                    // Buyer (free FK col)
  packDate DateTime @default(now())
  finYear String
  totalCartons Int @default(0)
  totalPcs Int @default(0)
  netKgs Float @default(0)
  grossKgs Float @default(0)
  status String @default("draft") // draft | confirmed
  notes String?
  createdAt DateTime @default(now())
  lines PackingListLine[]
}
model PackingListLine {
  id String @id @default(cuid())
  packingListId String
  packingList PackingList @relation(fields: [packingListId], references: [id])
  cartonNo String
  styleNo String
  colourId String?
  sizeId String?
  qty Int @default(0)
  netKgs Float @default(0)
}
model LabTest {           // §2 row 30 — FrmLabTest family
  id String @id @default(cuid())
  testNo String @unique              // LT-####
  itemType String // yarn | fabric | accessory | pcs
  itemId String                      // the item master id
  lotId String?
  orderId String?
  testType String // gsm | shrinkage | colour_fastness | composition | other
  result String @default("pending") // pending | pass | fail | conditional
  testedOn DateTime @default(now())
  testedBy String?
  values String?                     // JSON string of parameter results
  remarks String?
  createdAt DateTime @default(now())
}
model Expense {           // §2 row 31 — FrmExpenses family
  id String @id @default(cuid())
  expNo String @unique               // EXP-####
  expDate DateTime @default(now())
  finYear String
  category String // fixed | stylewise | general | transport | other
  orderId String?                    // stylewise expenses (free FK col)
  partyId String?                    // paid-to party (free FK col)
  amount Float @default(0)
  narration String?
  status String @default("recorded") // recorded | settled
  createdAt DateTime @default(now())
}
model Shift {             // §2 row 32 — frmHours / FrmHourlySetting1 (MT master)
  id String @id @default(cuid())
  code String @unique
  name String
  fromTime String                     // "06:00"
  toTime String                       // "14:00"
  hours Float @default(8)
  createdAt DateTime @default(now())
}
```

- 54 → **60 models**; `prisma db push` after edit; regenerate client.
- Wave D master (`shifts-hours`) gets master-config + masterCreateTool/
  masterUpdateTool factory entries (M2 pattern — counted by the factory
  convention, STATE drift #3).
- Party.partyType comment widens to `// supplier | customer | both | employee`
  (comment-only; wage-payments convention §7-B-21).

## 6. Approval kinds (Wave C)

The 4 IN items are **not** new engines — the M1 Approval Inbox already renders
any `Approval` row; Wave C adds:

1. **KINDS registry** (`src/lib/erp/approval-kinds.ts`): `{ entity, label,
   description, refResolver }` for `supplier_bill`, `godown_transfer`,
   `reprocess`, `non_return_dc` — the inbox gains a kind filter tab
   (existing `/approvals` + `?kind=` searchParam; default all).
2. **Creation hooks**: `post stock adjustment/transfer` services leave a
   `godown_transfer` Approval when `requiresAck` (ack flag on input, default
   false); GRN acceptance flow already exists — bill-pass hooks the
   `supplier-bill-register` rows (approve → GRN billed status); reprocess
   approval hooks `receive_grn` with `reprocess:true` input; non-return DC
   hooks DC creation with `returnable:false`.
3. **Approve/reject door**: the existing `approve_pending` tool +
   `/api/agent/approve` — no new inbox code paths, only the kind filter +
   refResolver links (W2 drill to the underlying doc view).

## 7. Per-wave detail (binding decisions)

### Wave A — money & rates (7 items, zero schema churn)
1. **budget** — `schemas/budget.ts` (BUDGET_SCHEMA: orderNo?, deptCode?,
   finYear?, amount total, lines[] {workId?, amount, actualAmount?}) +
   `posting/budget.ts` (planBudget: resolve order/dept, BGT-#### … actually
   Budget has NO docNo column → the plan's display id is the created row id;
   commit creates Budget + lines) + `doc-configs/budget.ts` (line editor) +
   **`create_budget` tool** (the registry's only named pending tool).
2. **commercial-invoice** — sibling fn `planExportInvoice` in
   `posting/invoice.ts` (invoiceType='export', ern input, IGST-or-zero GST,
   EINV prefix? NO — shares INV- space); config fields add `ern`; tool
   **`create_commercial_invoice`**.
3. **local-invoice** — pure variant config over planInvoice
   (billType='sales', gstType default cgst_sgst); NO new tool (agent door =
   existing create_sales_invoice — registry lists it).
4. **piece-jobwork-invoice** — variant config (billType='jobwork'); NO new
   tool (same reasoning).
5. **supplier-orders** — variant config over planPurchaseOrder pinning
   `poType` to a process select (yarn|fabric|accessory process types ride
   existing poType); tool **`create_supplier_order`** (wrapper injecting
   poType default) so chat can say "supplier order".
6. **rate-confirmation** — register config + `registers/rate-confirmation.ts`
   (POLine join PO+Party+item-master via buildItemCodeMaps; columns poNo/
   party/item/qty/rate/amount; filters date+party+itemType; drill → PO view)
   + tool **`list_po_rates`**.
7. **piece-rate-confirmation** — register config + service
   (ProductionEntry group by operator+order: qty, rate, amount; filters
   date+order+dept) + tool **`list_piece_rates`**.

### Wave B — production/pcs variants (14 items, zero schema churn)
8-14. **ProductionEntry family** (finished-goods = finishing stage variant;
   operation-entry = sub-process with bundleNo; panel-production = panel
   dept; panel-excess = excess flag via notes + qty) — all variant configs
   over planProduction injecting stage/dept defaults; shared tool
   post_production_entry (already exists) EXCEPT operation-entry gains
   **`post_operation_entry`** (distinct json for ops) and finished-goods
   gains **`post_finished_goods`**.
10. **bundle-barcode** — DS keyed by bundleNo → looks up CutBundle, prefills
   order/style/colour/size, posts ProductionEntry; tool **`scan_bundle`**.
11. **line-transfer** — `posting/line-transfer.ts` creates TWO LineIssue rows
   (out from source line, in to target line, LT-#### shared ref in notes) in
   ONE transaction; tool **`transfer_line_stock`**.
12. **panel-cutting** — variant over cut order service (panel type).
15-17. **RejectionEntry family** (panel-rej-rework action='rework';
   fabric-rejection-return action='return_to_party' + rejType='fabric';
   pcs-shortage rejType='shortage') — variant configs over planRejection
   injecting action/rejType; post_rejection tool exists (its schema already
   carries rejType+action) — NO new tools.
18. **jobwork-pcs-return** — variant over GRN service with
   grnType='process_return', pcs lines (StockLedger OUT of pcs godown);
   tool **`return_jobwork_pcs`**.
19. **costing-input** — variant over cost-sheet service (daily input =
   version bump semantics the service already has).
20. **production-wages** — RG-family screen over ProductionEntry
   (group by operator: qty × rate = amount; filters date+dept+order) +
   "Generate wage bill" posts a Journal (voucherType='journal',
   debitAccount='Production Wages', creditAccount='Wage Payable', amount =
   period total); tool **`get_production_wages`** (read) + the bill rides
   create_journal (exists).
21. **wage-payments** — variant config over planPayment (direction='out',
   party picker filtered to employee parties via master_search
   partyType=employee); tool **`pay_wages`** (wrapper) — Payment/PartyLedger
   math picks it up automatically (party-ledger test extended).

### Wave C — approval gates (4 items, §6)
### Wave D — new models (10 items, §5)

34. **roll-tracking** — DS over Lot: pick a lot with mtrs, split N mtrs into
   a new Lot (posting = stock-adjustment twin: out of source lot + in to new
   lot, RSP-#### docNo, one transaction); register tab lists lots with mtrs
   (lot-tracking exists — this screen is the WRITE door); tool
   **`split_roll`** (lot-based; rolls ≡ lots convention documented).
35. **contract-allotment** — variant over jobwork service: JobworkOrder with
   status='allotted' (no DC yet — dcNo gets AL-#### placeholder prefix), DC
   created later flips status; tool **`allot_contract`**.
36. **fabric-acc-allotment** — write door over ProgBalance tables: DS posts
   allotment rows (program consumption plan); tool
   **`create_allotment`**. (Read side = program status, exists.)
33. **production-bills** — DS computing period piece-rate bill per
   department/operator from ProductionEntry, posting a Journal (same
   accounts as §7-B-20, per-operator granularity); tool
   **`create_production_bill`**.

## 8. New agent tools (130 → 144)

Wave A: `create_budget`, `create_commercial_invoice`, `create_supplier_order`,
`list_po_rates`, `list_piece_rates` (+5)
Wave B: `post_operation_entry`, `post_finished_goods`, `scan_bundle`,
`transfer_line_stock`, `return_jobwork_pcs`, `get_production_wages`,
`pay_wages` (+7)
Wave C: `create_bill_pass`, `acknowledge_unit_transfer`, `approve_reprocess`,
`approve_non_return_dc` (+4 — thin wrappers over the approve door that ALSO
create the pending row when an entity lacks one)
Wave D: `create_sample`, `create_gate_entry`, `create_gate_pass`,
`create_packing_list`, `create_lab_test`, `create_expense`, `shift` master
factory create/update (+2), `split_roll`, `allot_contract`,
`create_allotment`, `create_production_bill` (+8)
Total: 130 + 5 + 7 + 4 + 8 = **144**.

## 9. Page/route recipe (all waves)

Same as M3 §8: `(erp)` route pages = thin server components resolving
searchParams → DocScreen(config) or RegisterScreen(config); New + View modes;
`LIVE_ROUTES` gains every new route; menu-registry `agentTools`/`pendingTools`
flip to live tools; SLUG_REVALIDATE map gains each slug. IN items reuse
`/approvals` inbox + kind tabs (§6). MT item (shifts-hours) reuses the
masters engine via master-configs (route `/hr/shifts` — NOT /masters/shift;
the master hub card links it).

## 10. Wiring slice

- W1 chain bar: chain-stage configs gain `finished_goods` (stage 12) and
  `commercial_invoice` (stage 13 variant) nextFormUrl targets.
- W2: rate-confirmation rows drill → PO view; piece-rate rows → production
  entry view; packing-list → despatch view; gate entries → refDocNo view when
  resolvable; wage rows → operator employee (masters).
- W6: packing-list view shows despatch recon (carton pcs vs despatched pcs);
  production-wages screen shows budget-vs-actual link when order set.
- KPI deep-links: none change (M4 set stands).

## 11. Order of work per wave (the M3/M4 loop)

1. schemas → posting services → doc-configs/register-configs → index
   registries → tools.ts (factory/inline) → pages → LIVE_ROUTES →
   menu-registry agentTools → tests → context_check → STATE/worklog →
   commit + tag (`m5-wave-a`… `m5-done`) → push attempt (PAT still pending).

## 12. Test plan (additive; existing 316 stay green unmodified)

1. `tests/pipeline/doc-parity-m5.test.ts` — per new WRITE tool: agent door vs
   form door produce identical db rows (budget, export invoice, supplier
   order, pcs-return, line-transfer pair, wage payment, sample, gate, packing,
   lab test, expense, production bill, roll split, contract allotment).
2. `tests/unit/doc-configs-m5.test.ts` — §7 contract loop: every M5 config
   schema-mirror, defaults injection, service delegation pins (variant
   configs MUST import the base service — no forks).
3. `tests/unit/register-configs-m5.test.ts` — config↔service bijection for
   the 3 new registers (rate-confirmation, piece-rate-confirmation,
   production-wages) + tool-shape pins + CSV route.
4. `tests/unit/approval-kinds.test.ts` — kinds registry ↔ inbox filter ↔
   posting-hook creation (godown transfer requiresAck leaves a row).
5. `tests/pipeline/register-services-m5.test.ts` — math: rate totals = Σ
   POLine.amount; piece-rate totals = Σ(qty×rate) matching ProductionEntry
   amount; wage bill Journal amount = period total; roll split net-zero
   lot mtrs; packing list Σpcs = despatch recon.
6. Route smoke `scripts/route_smoke_m5.sh` — every §2 route 200 + filter +
   CSV; 65 previous live routes stay 200.

## 13. ERRATA (living — append as discovered, never rewrite history)

(None at freeze. Append-only after wave completions, like SPEC-M3/M4.)
