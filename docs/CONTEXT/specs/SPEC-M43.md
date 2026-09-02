# SPEC-M43 — Phase-6B Batch 7: Program-Flow Revival (PRG-01..05)

Source: docs/PRD/PHASE-6B-REMEDIATION-SPEC.md §10 (Batch 7). Evidence layer: dive 1
(docs/ANALYSIS/2026-08-30-order-program-forms-vs-legacy.md). Dependencies: none hard —
PRG-04 reads the existing ledger; PRG-05 reads BomLine (M3-era) + the boostupper/reserveper
tolerance flags (registry rows since the LLD 07 port). Every cited fact re-verified on the
M42 line (2026-09-02): `ProgBalanceFabric` carries `colourId/designId/finDiaId/finGsm/ll`
with ZERO writers (only `reqKgs`/`reqMtrs` are written — `posting/program.ts:42-51` +
`posting/program-allotment.ts`); `projectors.ts`/`posting-engine.ts`/`movement-matrix.ts`
have ZERO importers (grep-verified, unpinned by tests/context_check — safe to delete);
`Order` has no `buyerPoRef`/`orderType`/delivery lines (grep-verified; the LPP ingestion
put buyer PO "696GJ" into notes free-text and split one buyer PO into five orders over the
single delivery date); `programStatusForOrder`/`queryProgramStatus` expose required/actual/
balance ONLY (`registers/program-status.ts:42-60`) — no PO'd/DC'd/GRN'd/finished columns;
`POLine.orderId` EXISTS (schema:344) so order-linked PO qty is derivable; program
requirements are hand-typed (`PROGRAM_SCHEMA` has no BOM linkage).

Owner decisions at batch start: PRG-02 is implemented **flag-gated default OFF** exactly
as the remediation spec prescribes ("flag off = current single-style behavior") — §17-5
stays open, no behavior change ships by default. No other §17 item is in scope.

## §1 Scope — 5 FRs, zero deferrals

| FR | Ship |
|---|---|
| PRG-01 | Order schema additions: `Order.buyerPoRef` (string, nullable) + `Order.orderType` (default `export` — export\|domestic\|trading) + new `OrderDelivery` model {id, orderId (relation), seq, qty, date, notes?}; `ORDER_SCHEMA` gains optional `buyerPoRef`/`orderType`/`deliveries[] {qty, date, notes?}` (all optional — every existing caller byte-identical); planOrder passes them through and creates delivery rows in the SAME commit (multi-shipment orders do not split); `planOrderDeliveries(orderNo, deliveries[])` REPLACE-semantics service (one service, both doors — ADR-001) + `set_order_deliveries` docTool + a Delivery-schedule FamilySection on the Order Hub (add/edit lines through the service); order-register gains an orderType select filter + Buyer PO column; the order print meta carries buyerPoRef + the schedule rows |
| PRG-02 | Multi-style orders (flag-gated): new flag `multi_style_orders` (module, boolean, default false); `ORDER_SCHEMA.lines[]` gains optional `styleNo`; planOrder with the flag ON resolves per-line styles (header styleNo = fallback for blank lines); flag OFF + a line style DIFFERING from the header → actionable refusal naming the flag (legacy single-style behavior preserved byte-identical when absent/equal); order line grid gains a Style picker (resolved per line; the Order Hub + print already render per-line style) |
| PRG-03 | GSM/LL physics: `PROGRAM_SCHEMA` gains optional `colourCode`/`designCode`/`finDiaCode`/`finGsm`/`ll`; planProgram resolves the masters (Colour/Design/Dia) and writes the full knitting spec onto the ProgBalanceFabric row (the existing writer path — no new tables); `planProgramSpecCorrection(programNo, spec fields)` updates the spec columns through runCommit (audit row stamped) + `correct_program_spec` docTool + a spec-correction form section on the program view page; the spec feeds 4-point grading later (Phase-6 F — noted, not built) |
| PRG-04 | Waterfall read model: the program-status register service + config gain **PO'd / DC'd / GRN'd / Finished** columns — poKgs from `POLine` (orderId+itemId sums), dcKgs from StockLedger `process_delivery` OUT, grnKgs from `process_receipt` + `purchase_grn` IN, finishedKgs from `process_receipt` IN only (came back produced — bought material is GRN'd, not finished); read model only, ZERO trigger writes (ADR-002); the get_program_status json stays frozen, the register row EXTENDS; DEAD CODE DELETED: `projectors.ts` + `posting-engine.ts` + `movement-matrix.ts` (811 lines, zero importers — the projector concept becomes this read service) |
| PRG-05 | BOM→program pre-fill: `proposeProgramRequirements(orderNo)` read service — order style(s) → BomLine × per-style order qty × (1 + boostupper% + reserveper%) (the two tolerance flags, consumed at last); rows {itemType, itemCode, uom, perPc, totalKgs, rate} + BOM-missing actionable error; `propose_program_requirements` read tool (agent door); `/programs/propose` form door (the stock-take custom-form precedent): orderNo input (?order= prefill), proposal table, per-row "Create program" button calling planProgram through runCommit (one service, both doors), + "Open program form" link to /programs/new?order=…; +1 menu item (Programs group) |

## §2 Design decisions

1. **Deliveries enter BOTH at creation and after (PRG-01).** The agent door
   (`create_order` + ingestion) passes `deliveries[]` and planOrder's commit creates
   them nested in the same transaction (an order and its schedule are one document).
   The form door gets the post-creation editor — `planOrderDeliveries` with REPLACE
   semantics (delete-all + re-create inside one tx): the Order Hub section submits the
   full set, so the editor is idempotent and auditable (one AuditLog after-image per
   save via runCommit). REPLACE (not incremental add) matches how the amendment door
   (M41 planPoAmend) thinks about line sets and keeps the UI stateless.
2. **orderType defaults `export` (PRG-01)** — the Tirupur job-work default in legacy;
   the register filter and the doc-config select expose export/domestic/trading. The
   header `deliveryDate` stays REQUIRED and means the first/overall delivery (back-compat:
   every existing caller + register sort keeps working); `OrderDelivery` rows are the
   multi-shipment detail. `seq` is 1-based, auto-assigned in arrival order.
3. **The multi-style flag refuses LOUDLY, not silently (PRG-02).** With the flag off, a
   line style differing from the header returns an actionable error naming the flag and
   both styles — the owner's §17-5 decision stays a real decision, and the agent
   self-corrects (split the order or ask for the flag). Blank line style = header
   fallback regardless of the flag (zero-friction single-style path byte-identical).
   The order line grid gains the Style picker unconditionally — with the flag off it is
   a same-style-only field; the refusal is the teacher.
4. **The knitting spec lives on ProgBalanceFabric (PRG-03)** — exactly where legacy put
   it (the columns exist for this). planProgram gains the five optional inputs; when a
   fabric program carries them, the existing find-or-create ProgBalanceFabric write
   fills the spec columns (create) or updates them (the correction variant explicitly;
   program create does NOT overwrite an existing spec silently — it merges non-blank
   inputs only). The correction service is a first-class plan/commit (runCommit →
   AuditLog) so spec edits are traceable; the program view shows the live spec + an edit
   form. `ll` stays String (schema column) — loop length is entered as text ("2.80").
5. **The waterfall is a READ service, and the projector tables keep only their writers
   (PRG-04).** queryProgramStatus aggregates per order×item in ONE ledger pass it already
   makes, plus ONE POLine pass (order-scoped) — po/dc/grn/finished columns ride the same
   rows; no new write path, no trigger, ADR-002 honored. finishedKgs = process_receipt
   only: purchase_grn is material BOUGHT (GRN'd), process_receipt is material PRODUCED
   (in-house process or jobwork return — the "finished" of the knitting loop). The frozen
   `get_program_status` json (M3 contract) is untouched — the register row object extends
   (the config declares the new columns; the tool keeps its shape). The dead trio
   (posting-engine/movement-matrix/projectors) is DELETED in this batch: PRG-04 is the
   honest successor of the projector concept, and `tx.pcsStock` (a model that never
   existed) made posting-engine a landmine, not a plan.
6. **The proposal multiplies per-STYLE order qty (PRG-05).** BOM is per style; the
   honest denominator for a multi-style order is the qty of THAT style's order lines
   (Σ OrderLine.qty where styleId = bom.styleId), not totalPcs. Wastage = boostupper +
   reserveper (the two LLD-07 requirement flags, finally consumed — the legacy
   FN_Add_BoostupPer parity). Rounding: 2 decimals, ceiling on the last digit is NOT
   applied — the operator trims. A missing/empty BOM refuses with "create the BOM first"
   (the chain already teaches that step). The proposal is READ-ONLY until the operator
   clicks Create program — which runs the SAME planProgram (stage=knitting for yarn
   lines, dyeing for fabric; sewing/finishing/packing BOM rows are shown read-only with
   guidance to create pcs programs manually).
7. **Numbering, registers, prints, menu** — no new doc numbers (deliveries ride the
   order, corrections ride PGM-); the program-status REGISTER config extends (not a new
   register); the order print family extends (meta + a schedule table when rows exist —
   blank-safe); ONE new menu item (/programs/propose, Programs group, arch 'IN' custom).

## §3 Files

**New**
- `src/lib/erp/posting/order-deliveries.ts` — planOrderDeliveries (replace-set, runCommit)
- `src/lib/erp/posting/program-spec.ts` — planProgramSpecCorrection (audit stamped)
- `src/lib/erp/registers/program-proposal.ts` — proposeProgramRequirements (pure read)
- `src/app/(erp)/programs/propose/page.tsx` + `propose-forms.tsx` + `actions.ts` — the PRG-05 form door
- `src/app/(erp)/orders/[id]/delivery-forms.tsx` + `delivery-actions.ts` — the Order Hub schedule section
- `src/app/(erp)/programs/[id]/spec-forms.tsx` + `spec-actions.ts` — the correction form door
- `tests/pipeline/prg-batch7.test.ts` — this batch's suite

**Modified**
- `prisma/schema.prisma` — Order.buyerPoRef/orderType + OrderDelivery (+ index on orderId); db push, zero residue
- `src/lib/erp/schemas/order.ts` — buyerPoRef/orderType/deliveries[]/lines[].styleNo (all optional)
- `src/lib/erp/schemas/program.ts` — the five spec inputs
- `src/lib/erp/posting/order.ts` — pass-through + per-line style resolution (flag-gated) + delivery create
- `src/lib/erp/posting/program.ts` — spec resolution + ProgBalanceFabric spec write
- `src/lib/erp/doc-configs/order.ts` — buyerPoRef/orderType header fields + Style line picker
- `src/lib/erp/doc-configs/program.ts` — five spec header fields
- `src/lib/erp/register-configs/order-register.ts` — orderType filter + Buyer PO column
- `src/lib/erp/register-configs/m6-wave-c.ts` — program-status columns (PO'd/DC'd/GRN'd/Finished)
- `src/lib/erp/registers/program-status.ts` — the waterfall computation
- `src/lib/erp/registers/order-register.ts` — orderType filter + buyerPoRef column
- `src/lib/erp/print/fetchers-order.ts` — buyerPoRef meta + schedule table
- `src/lib/erp/flags.ts` — multi_style_orders (module, false)
- `src/lib/erp/menu-registry.ts` — /programs/propose (+1 item, 139→140)
- `src/lib/agent/tools.ts` — +3 tools (set_order_deliveries, correct_program_spec docTools + propose_program_requirements read; 246→249)
- `src/lib/agent/prompt.ts` — PROMPT_VERSION m43-2026-09-02; §1 domain map + §6 workflow (BOM proposal, buyer-PO first-class) + one folded few-shot (cap 8 kept)
- `src/app/(erp)/orders/[id]/page.tsx` — Delivery-schedule FamilySection + buyerPoRef/orderType in the header card
- `src/app/(erp)/programs/[id]/page.tsx` — spec display + correction form

**Deleted**
- `src/lib/erp/posting-engine.ts` (235), `src/lib/erp/movement-matrix.ts` (491), `src/lib/erp/projectors.ts` (85) — zero importers, unpinned, concept superseded by PRG-04

## §4 Tests (tests/pipeline/prg-batch7.test.ts)

1. **Walkthrough (spec §10)**: order (2 lines, buyerPoRef, 2 delivery splits) → program
   (yarn, with spec) → POLine (order-linked) → jobwork DC out → process receipt back →
   the program-status register row shows PO'd/DC'd/GRN'd/Finished + balance columns
   closing the loop; delivery rows visible on the register + Order Hub data path.
2. **PRG-01**: planOrder with deliveries creates rows in-commit (seq 1..n); REPLACE
   service rewrites the set (count + content asserted); orderType filter on the
   register; print meta carries buyerPoRef + schedule; absent fields = byte-identical
   legacy create (existing industry-chain pins stay green untouched).
3. **PRG-02**: flag off + differing style → refusal naming the flag; flag on → per-line
   styleIds stored; blank line style = header fallback both states.
4. **PRG-03**: fabric program with the spec → ProgBalanceFabric row carries
   colour/design/dia/gsm/ll; correction service updates them (audit row exists);
   program create does not clobber an existing spec with blank inputs.
5. **PRG-04**: po/dc/grn/finished computed from seeded ledger + POLine (hand-computed
   fixture numbers); frozen get_program_status json shape asserted unchanged.
6. **PRG-05**: golden proposal — BOM qty × per-style order qty × (1+boost%+reserve%)
   hand-computed; missing BOM → actionable error; multi-style denominators per style.
7. **Source contracts + pins**: dead trio files absent; tools 249 / flags 39 / menu 140 /
   models 86 pins updated wherever inherited suites pin them; honest-claims — no
   sideEffects text added that isn't implemented.

## §5 Gates

tsc src 0 · full vitest green (1309 + this batch) · `eval --static` PASS (m43-2026-09-02)
· context_check NO DRIFT (pins bumped in the same commit — PITFALLS #37) ·
route_smoke_m43 NEW: /programs/propose + program-status waterfall columns + order
register orderType filter + Order Hub delivery section + print meta, LIVE on the dev
server, zero residue · STATE #47 + worklog + PITFALLS #46 (if a new trap bites) in the
same commit · PROMPT_VERSION bump per the M10 rule (full eval only if --static fails).
