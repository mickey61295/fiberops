# SPEC-M44 — Module K: Costing Depth (CST-01..04)

Source: docs/PRD/PHASE-6B-REMEDIATION-SPEC.md §11 (Module K, "Batch 8" in the §16 sequencing).
Dependencies: INV-02 (one WAC valuation) — SHIPPED in M42 (wacStep/bucket rates + the INV-02
postLedger rate ride). Evidence re-verified on the M43 line (2026-09-03):
`posting/cost-sheet.ts` computes totalCost as a naive 6-head sum with `marginPct` stored
NEVER computed (the sideEffects string "Margin % recalculated" is aspirational copy — the
honest-claims sweep flagged it as a known liar to retire); CostSheet has no line detail
(no CostSheetLine model); `FrmPreCostingCompMas` (legacy component master) has NO successor
(the M2 `component` master is the style-part Component, unrelated); the daily-unit-pnl
(`queryDailyPnl`) margin is produced − wages − expenses only — material never enters;
ProductionEntry.amount IS order-scoped piece-rate labour; JobworkOrder.totalValue is
order-scoped process billing; CutOrder.fabricIssued is real fabric kgs; BomLine.rate exists;
StockLedger legs carry rate since INV-02 (but JW legs carry the PROCESS rate, not material
cost — valuation must read the bucket WAC, not the leg rate).

Owner decisions at batch start: none of §17's open items (PAY-08/PRC-09/PRG-02/AM-1 etc.)
are in Module K scope. Zero deferrals.

## §1 Scope — 4 FRs

| FR | Ship |
|---|---|
| CST-01 | Component library: new `CostComponent` master model {code CC-#### auto, name, category fabric\|trim\|cm\|washing\|packing\|overhead\|other, unit?, rate, active} + `cost-component` master-config (rides the /masters hub — no menu item, the HSN precedent) + `create_cost_component` / `update_cost_component` (factory tools) + `list_cost_components` (read tool). Cost-sheet lines quote the library by componentCode — the rate resolves server-side |
| CST-02 | Computed cost sheet: new `CostSheetLine` model {costSheetId relation, head, source bom\|component\|manual, componentId?, itemType?, itemId?, qty?, rate, amount, notes?} + CostSheet.lines relation; `COST_SHEET_SCHEMA` gains `lines[] {head?, source, itemType?, itemCode?, componentCode?, qty?, rate?, amount?}` and agent-only hook `computeFromBom` (the GRN `reprocess` precedent — schema key, service honours it, the form door uses the line editor instead); planCostSheet REWRITE as a calculator: source resolution (bom → BomLine rate fallback bucket WAC; component → library rate; manual → amount or qty×rate), head inference when blank (bom itemType → fabric/trim; component category → head; manual default overheads), head totals derive from lines when any exist (the six header inputs remain the no-lines legacy path, byte-identical), totalCost = Σ heads, perPc = totalCost/totalPcs, **marginPct = (selling − cost)/selling × 100 COMPUTED AND STORED** (input ignored when selling > 0 — the sideEffects claim becomes true); version auto-bump unchanged; doc-configs cost-sheet + costing-input gain lineFields + linesKey; the [id] view renders the line grid (id→code resolution, the PITFALLS #44 id-map reflex) |
| CST-03 | Estimated vs actual: `registers/cost-compare.ts` NEW read service — `orderCostActuals(orderId)`: cm = Σ ProductionEntry.amount (order-scoped, rework excluded — the piece-rate labour the wage bills roll up), process = Σ JobworkOrder.totalValue (order-scoped, the washing/dyeing/printing billing), fabric = Σ CutOrder.fabricIssued × fabricWAC + Σ order-scoped JW-out fabric legs × WAC, trim = Σ order-scoped JW-out accessory legs × WAC (WAC = the item's live bucket rate via `itemWacRate` — NEW `src/lib/erp/item-wac.ts`, G1-preferred, deterministic); `costComparison(orderId)` joins those against the LATEST cost sheet heads with deltas; Order Hub gains a read-only "Cost & Margin — est vs actual" FamilySection (silent when no sheet AND no actuals); `get_order_cost` read tool (costing domain, the get_program_status delegation precedent) |
| CST-04 | Daily P&L material leg: `queryDailyPnl` gains the period material total — Σ over StockLedger OUT legs (itemType yarn\|fabric\|accessory, txnType ∈ {process_delivery, stock_adjustment_less}, godown ≠ the waste godown) of primary-uom out qty × `itemWacRate` (bucket WAC — NEVER the leg rate: JW legs carry the process rate); the totals band gains "Material (period)" and Net Margin becomes produced − wages − expenses − material (the §11 formula); per-dept-day rows unchanged (material legs carry no dept — period-level like expenses, the ERRATUM §13-1 precedent); summary text updated |

## §2 Design decisions

1. **The library is a MASTER, not a doc (CST-01).** CostComponent rides the M2 MasterTable
   engine (config + factory tools + /masters hub) — zero new archetype code, the HSN
   precedent. `code CC-0001` auto-assigned (codePrefix 'CC-', pad 4); `category` is a
   select (fabric/trim/cm/washing/packing/overhead/other) that DOUBLE-DUTIES as the
   cost-sheet head inference source; `rate` is the quoted rate; `unit` is display text
   ("per kg", "per pc") — no UOM FK (cost heads are money denominators, not stock uoms).
   No menu item: masters live in the hub (menu count pin stays 140 — the /masters/[entity]
   dynamic route serves the screen).
2. **Heads derive from lines when lines exist (CST-02).** The six legacy header inputs
   (fabricCost…overheads) stay exactly as they are: when the plan carries NO lines the
   calculator is byte-identical to the M3 service (the pinned back-compat test). When
   lines exist, each head total = Σ its lines' amounts, and a head with lines IGNORES its
   header input (the lines are the truth; mixing both on one head would double-count).
   Heads with no lines still read the header input — mixed sheets (lines for fabric+trim,
   hand-typed cm/washing) are the operator's reality. totalCost = Σ heads always.
3. **marginPct is COMPUTED, not echoed (CST-02).** selling > 0 ⇒ marginPct =
   (selling − totalCost)/selling × 100, rounded 2dp, stored. selling ≤ 0 ⇒ 0. The input
   marginPct is accepted (back-compat callers) but silently overridden — the calculator
   is the only writer. commissionPct stays a RECORDED input (a selling-side deduction
   legacy tracked separately); it does NOT enter the margin formula — documented here so
   the next session doesn't "fix" it. The "Margin % recalculated" sideEffects claim
   becomes TRUE (the honest-claims sweep's known liar retires).
4. **computeFromBom is an agent-only hook (CST-02)** — the GRN `reprocess` precedent
   (AGENT_ONLY_HOOK_KEYS in the doc-configs mirror test): a boolean on the schema, honoured
   by the service, never a form field. When true, the plan pre-seeds lines from the order
   style's BOM (BomLine.qty is per-garment — the PRG-05 proposal semantics — × order
   totalPcs), rate = BomLine.rate (fallback bucket WAC), head by itemType (yarn|fabric →
   fabric, accessory → trim). The FORM door's equivalent is typing lines with source=bom +
   itemCode (server resolves the BOM rate) — the operator keeps line-level control.
   computeFromBom + explicit bom lines together = the explicit lines win for their items
   (documented; the seed skips items already addressed).
5. **Actuals are a READ service, per the ADR-002 reflex (CST-03).** No new write path, no
   stored "actual" columns — the comparison recomputes on read. cm = ProductionEntry
   amounts (rework excluded: the rework entry's cost sits in the good bundle it produced —
   counting both double-pays). process = JobworkOrder.totalValue (what the jobworker
   bills — the JW-bill ties it to money). fabric = CutOrder.fabricIssued × WAC + the
   order's JW-out fabric legs at WAC (material sent for processing that left the store);
   trim = the order's JW-out accessory legs at WAC. Heads with nothing derivable (packing,
   overheads) show '—' honestly — never 0-pretending. The Order Hub section is silent when
   the order has no cost sheet AND no actuals (the M28 discipline).
6. **One WAC lookup, three consumers (CST-03/CST-04).** `itemWacRate(itemType, itemId)` —
   NEW `src/lib/erp/item-wac.ts` (NOT valuation.ts — that module stays db-free pure): reads
   CurrentStock buckets for the item, G1-bucket first, else any godown ordered by code,
   returns the bucket's `rate` (the INV-02 single WAC), 0 when no bucket. Deterministic,
   no averaging across godowns (the G1 store is the trading stock; a WIP-bucket rate would
   misprice). The P&L NEVER uses the ledger leg's own rate (JW legs carry the process
   charge — valuing material at the knitting rate would double-count the conversion cost).
7. **The P&L material leg is period-level (CST-04)** — material OUT legs carry no dept
   (they post from godowns), so the per-dept-day rows can't split it honestly; it rides
   the totals band next to Expenses (the ERRATUM §13-1 precedent). Consumption txn types:
   process_delivery (material issued to processing — yarn knitted into fabric at the
   jobworker: consumed in its old form) + stock_adjustment_less (waste/shrinkage/ST-
   variance: material that left). Excluded: godown/ready-to-cut transfers (internal),
   purchase_return (a reversed purchase), sales_delivery/rejection (pcs not material),
   waste-godown legs (the M42 waste identity — scrap value already at waste_scrap_rate).

## §3 Files

**New**
- `src/lib/erp/master-configs/cost-component.ts` — the library config
- `src/lib/erp/item-wac.ts` — itemWacRate (shared bucket-WAC lookup)
- `src/lib/erp/registers/cost-compare.ts` — orderCostActuals + costComparison
- `tests/pipeline/cst-batch8.test.ts` — this batch's suite

**Modified**
- `prisma/schema.prisma` — +CostComponent +CostSheetLine (+CostSheet.lines relation); db push, zero residue
- `src/lib/erp/master-configs/index.ts` — register the config
- `src/lib/erp/schemas/cost-sheet.ts` — lines[] + computeFromBom
- `src/lib/erp/posting/cost-sheet.ts` — the calculator REWRITE
- `src/lib/erp/doc-configs/cost-sheet.ts` + `costing-input.ts` — lineFields + linesKey
- `src/app/(erp)/costing/cost-sheet/[id]/page.tsx` — line grid + computed summary
- `src/app/(erp)/orders/[id]/page.tsx` — the est-vs-actual FamilySection
- `src/lib/erp/reports/chain-money-reports.ts` — queryDailyPnl material leg
- `src/lib/agent/tools.ts` — 2 factory tools + list_cost_components + get_order_cost; create_cost_sheet description
- `src/lib/agent/tool-labels.ts` — 2 labels
- `src/lib/agent/prompt.ts` — §Costing line + §3 fold + PROMPT_VERSION m44-2026-09-03
- `tests/unit/master-configs.test.ts` — 41→42 configs
- `tests/unit/doc-configs.test.ts` — AGENT_ONLY_HOOK_KEYS + computeFromBom
- inherited tool-count pins 249→253 ×13 + version pins m43→m44 ×4
- `scripts/context_check.sh` — pins via the m44 updater

## §4 Acceptance

1. Golden costing: style + BOM (fabric 0.2/garment @ ₹100 + accessory 1/garment @ ₹5) +
   order 100 pcs + component (CC-0001 packing @ ₹3/pc) → cost sheet via computeFromBom +
   a component line: fabric ₹2000, trim ₹500, packing ₹300 → totalCost ₹2800, perPc ₹28,
   selling ₹3500 ⇒ marginPct 20.00 — hand-computed, pinned.
2. No-lines plan byte-identical to the M3 path (header-only math pinned).
3. marginPct input ignored; sideEffects "Margin % recalculated" now true (honest pin).
4. Est-vs-actual walkthrough: production entries ₹900 + cut 25 kg × WAC + JW ₹1000 →
   get_order_cost returns cm/fabric/process actuals + deltas vs the sheet; Order Hub
   section renders.
5. Daily P&L: material OUT legs (JW yarn 10 kg + WST-less 5 kg at MAIN, WASTE-godown leg
   excluded) at bucket WAC ⇒ Material (period) = 15 × WAC; Net margin = produced − wages
   − expenses − material, pinned.
6. Gates: full vitest green · tsc src 0 · eval --static PASS (m44-2026-09-03) ·
   context_check 604+ NO DRIFT (pins bumped same-commit) · route smoke live · browser
   E2E (form door: component line + line editor; Order Hub section) zero console errors.
