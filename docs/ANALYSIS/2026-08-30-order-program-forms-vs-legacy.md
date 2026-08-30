# Order & Program Forms vs Legacy FiberPro — Deep Dive

Date: 2026-08-30 · Status: Evidence audit (read-only) · Trigger: owner question —
*"Does order and program forms function this way in FiberPro (legacy) too? The line items, the cost projection and everything."*

## 0. Method & Evidence Base

The legacy source tree (`source-erp/`) is gone from the sandbox (stripped in the 100MB-blob
history cleanup), so legacy behavior is reconstructed from the frozen surviving evidence:

- `docs/form-taxonomy.json` — all 321 legacy WinForms classified (raw 321 / 307 unique units)
- `docs/PLAN-2.0-MENU-PARITY.md` — the form-by-form parity map + legacy concept list
- `docs/GAP-ANALYSIS-FIBERPRO.md` — the 2026-08-29 parity audit
- `docs/CONTEXT/specs/SPEC-M3.md` / `SPEC-M5.md` — the frozen build specs
- `src/lib/erp/legacy-enums.ts` — ported legacy magic numbers (STAGE_DEPT, dept −7, rework codes)
- The Prisma schema itself — `ProgBalanceYarn/Fabric` are direct ports of legacy
  `ST_ProgBalance_*` trigger tables; their columns document what legacy tracked
- Live code: `doc-configs/{order,program,cost-sheet,costing-input,program-allotment}.ts`,
  `posting/{order,program,cost-sheet}.ts`, `projectors.ts`,
  `registers/program-status.ts`, `reports/core-reports.ts`

Every "ours" claim below was grep/read-verified this session.

## 1. TL;DR Verdict

**The skeleton is a faithful port; the depth is thinner in exactly three places.**
Order and Program in our app work the way legacy FiberPro worked at the *document* level —
numbered header+grid docs, colour/size line items, auto totals, program balances, stage→dept
mapping, cancel/complete lifecycle. Where we genuinely differ:

1. **Cost projection is a snapshot, not a calculator.** Legacy costing was component-master
   driven (`FrmPreCostingCompMas`), multi-level (`Frm_CostingInput`), and fed by an actuals
   rollup (`Frm_ProductionCost`). Ours is six hand-typed numbers with a naive sum.
2. **Program lost the knitting physics.** GSM / loop-length / dia / design / colour exist as
   columns on `ProgBalanceFabric` (ported from legacy) but **no form or tool ever writes them** —
   legacy had a dedicated correction form (`FrmPrg_GSM_LL_EditEntry`).
3. **The program balance waterfall is 80% dormant.** Legacy cascaded required → PO → DC → GRN →
   completed per order×dept×item. We ported all nine cascade columns but only `reqKgs` is ever
   written; the live register reads required-vs-actual from the StockLedger instead (honest, but
   one number instead of the five-step waterfall).

None of these three are in the Phase-6 PRD (§docs/PRD/PHASE-6.md covers A–J; costing depth and
GSM/LL physics are absent). This analysis proposes where they should land.

## 2. ORDER FORM — FrmOrderSheetNew (×4 variants) vs `/orders/new`

### 2.1 The legacy surface (17 order-family forms)

`FrmOrderSheetNew`, `FrmOrderSheetNew_Domestic`, `FrmOrderSheetNew_WithAmend`,
`FrmTradingOrderSheet`, `FrmOrderSheetAmendment`, `FrmOrderClose`, `FrmOrderEnquiry`,
`frmOrderGroup`, `FrmOrderRef`, `FrmOrderRelatedInput_Excel`, `FrmOrdersheet_Preview`,
`FrmOrdProdTrack`, `frmOrdStat`, `FrmOrderwisePcsReg`, `frmordwiseregregister`,
`FrmTradingOrdersInHandReg`, `FrmOrderDisplayDaysSetting`.

### 2.2 Form-by-form disposition

| Legacy form | What it was | Ours | Status |
|---|---|---|---|
| FrmOrderSheetNew | Export order entry | `/orders/new` DocScreen (SO-####) | ✅ core ported |
| _Domestic | Domestic variant | invoice-variants `localInvoice` | ◐ folded — no order-type flag on Order |
| _WithAmend / FrmOrderSheetAmendment | Amendment flows | `/orders/amendments` + `update_order` | ✅ |
| FrmTradingOrderSheet | Trading orders | `/orders/in-hand` (type=trading disposition) | ✗ not built as its own surface |
| FrmOrderClose | Close order | `orders/close/actions` | ✅ |
| FrmOrderEnquiry / frmOrdStat / registers | Search & status | order register + order-status-summary + ⌘K | ✅ modernized |
| FrmOrderRelatedInput_Excel | Excel paste input | paste-into-grid (M18 Wave B) | ✅ |
| FrmOrdersheet_Preview | Print preview | `order` print docType (M18) | ✅ |
| FrmOrdProdTrack | Production tracking board | **Order Hub** `/orders/[id]` | ✅ better — whole doc family, 1-click |
| frmOrderGroup / FrmOrderRef | Order grouping + cross-ref | — | ✗ dropped (A3 disposition: entry helpers) |
| FrmOrderDisplayDaysSetting | Display-days setting | — | ✗ dropped (flags could cover) |

### 2.3 Line items — same shape, three thin spots

Ours (`schemas/order.ts`): `lines[] = {colourName, sizeName, qty, rate}` — flat colour×size
grid, exactly the legacy muscle-memory shape; live totals per keystroke; auto SO-#### with
honored-if-free user numbers; rate memory (`last_rate`, M18) answers legacy `frmDefaultRate`.
The print grid (S.No/Style/Colour/Size/HSN/Qty/Rate/Amount) matches the legacy sheet family.

The three thin spots (all code-verified):

1. **No buyer-PO reference field.** `ORDER_SCHEMA` carries no `buyerPoRef`/`buyerOrderNo`.
   The LPP ingestion proved the pain: buyer PO "696GJ" and order-entity numbers ride `notes`
   free-text. Legacy order sheets carried the buyer's PO reference as first-class data (it's
   what the buyer's merchandiser cross-checks).
2. **Single style per order, enforced by the form.** `OrderLine.styleId` exists per line, but
   both the form and `planOrder` stamp the header style onto every line — a multi-style order
   (legacy `FrmPOEntryWithMultipleStyleNo` existed on the PO side; order side analogous) is
   not enterable. Workaround today: split into multiple orders.
3. **One delivery date per order.** Multi-shipment orders (the LPP PO had two shipment
   windows) decompose into separate orders — the ingestion created five orders from one buyer
   PO. Legacy tolerated delivery schedules inside one order; ours is stricter but blunter.

Domestic vs export survives only implicitly (currency INR vs USD/EUR + `invoiceType` on the
invoice) — there is no order-type flag, so domestic-vs-export reporting is inferred, not queried.

## 3. PROGRAM FORM — frmProgNew family vs `/programs/new`

### 3.1 The legacy surface (11 program-family forms + projector tables)

`frmProgNew`, `frmProgNew_Actual`, `frmProgEntry`, `frmProgEntry_YarnCons`,
`FrmPrg_GSM_LL_EditEntry`, `FrmProg_Acc`, `frmProgCancel`, `FrmAcc_ProgCancel`,
`frmProgCancel_Compwise`, `FrmProgramComplete`, `FrmPrg_KnittingPartyInclusion` (master),
`FrmProGrnAccept` (approval) — plus `ST_ProgBalance_{Yarn|Fabric}` trigger-maintained tables.

### 3.2 Form-by-form disposition

| Legacy form | What it was | Ours | Status |
|---|---|---|---|
| frmProgNew / frmProgEntry | Program create/entry | `/programs/new` (PGM-####) | ✅ merged into one |
| frmProgNew_Actual | Plan vs actual | program-status register | ✅ ledger-derived (honest) |
| frmProgEntry_YarnCons | Yarn consumption entry | — | ✗ absent |
| FrmPrg_GSM_LL_EditEntry | GSM/loop-length correction | — (columns exist, never written) | ✗ **the physics gap** |
| FrmProg_Acc | Accessories program | — | ✗ absent |
| frmProgCancel (+Acc, +Compwise) | Cancel (incl. component-wise) | `programs/cancel/actions` | ◐ single-doc only |
| FrmProgramComplete | Complete | `programs/complete/actions` | ✅ |
| FrmPrg_KnittingPartyInclusion | Which knitters serve programs | — | ✗ absent (parties exist, no inclusion list) |
| FrmProGrnAccept | Program GRN acceptance | approvals `grn_acceptance` | ✅ |
| frmFabricAllotment / frmComboWiseReqRpt | Fabric/acc allotment | `/programs/allotment` + `create_allotment` | ✅ |

What matches well: PGM-#### numbering; order+stage+item+required(kgs/mtrs/pcs) shape;
`STAGE_DEPT` auto-mapping (the legacy DeptID 1–6/8/10 map, ADR-012); allotment as the write
door over ProgBalance; cancel/complete lifecycle with audit; program status as "the operator's
compass" (plan §1.3-4). Program status reads required-vs-actual from `StockLedger` — a
deliberate improvement over legacy trigger-maintained projector tables that could go stale.

### 3.3 The waterfall: what legacy tracked that we ported but don't fill

`ProgBalanceYarn` and `ProgBalanceFabric` (schema lines 710–752) carry the full legacy cascade,
per order × dept × item:

```
reqKgs → poKgs → dcKgs → grnKgs → progCompKgs → transIn/OutKgs → returnKgs
       → cancelKgs → shortKgs → reqBalanceKgs → finishedKgs
```

Live-path reality (grep-verified):

- `planProgram` commit writes/updates **only `reqKgs`**.
- `projectors.ts::projectProgramBalances` — which recomputes dc/grn/trans/return/balance from
  the ledger — is called **only from the dormant posting-engine `apply()`** (zero live callers;
  all live services use `postLedger`).
- `ProgBalanceFabric` additionally carries `colourId`, `designId`, `finDiaId`, `finGsm`, `ll`
  — the knitting specification. **No form, tool, or posting path ever writes them.**
- The program-status register shows required / actual / balance (one actual) — not the
  five-step PO'd-vs-DC'd-vs-GRN'd-vs-completed waterfall the columns encode.

So: the schema remembers legacy's questions, but the app currently can't ask them.

### 3.4 Program does not compute from BOM

`requiredKgs/Mtrs/Pcs` are hand-typed. Legacy's yarn-consumption entry (`frmProgEntry_YarnCons`)
and component-wise programs imply consumption-derived requirements (order qty × per-pc
consumption × wastage). Our `BomLine` (style-level itemType/itemId/qty/rate) already holds the
consumption plan, but nothing multiplies BOM × order qty to propose program requirements —
neither the form nor `create_program` pre-fills from BOM. This is the single highest-leverage
automation gap in the program flow.

## 4. COST PROJECTION — the biggest functional difference

### 4.1 The legacy surface (7 forms across costing/budget)

| Legacy form | What it was | Ours | Status |
|---|---|---|---|
| `FrmPreCostingCompMas` (master) | Reusable pre-costing component library | — | ✗ absent |
| `Frm_CostingInput` (multi-level daily) | Daily cost input, multi-level | `/costing/input` variant | ◐ manual, single-level |
| `FrmCostSheet` semantics | Cost sheet | `/costing/cost-sheet` DocScreen | ◐ snapshot only |
| `Frm_ProductionCost` | Actual production cost rollup | — (production-bill = wage journal only) | ✗ absent |
| `frmPreBudgetProdPlan` (+_New) | Pre-budget production plan | — | ✗ (Phase-6 FR-D3 projections cover part) |
| `frmBudget` / `_JobWork` / `FrmBudgetAndActualComp` | Budget family | budget + budget-vs-actual register | ✅ (order+dept amount-level) |
| `Sp_DailyUnitPANDL` | Daily unit P&L | `daily-unit-pnl` report | ◐ wage-margin only (amount − shiftWages − expenses; no material cost) |

### 4.2 What our cost sheet actually is

`CostSheet` (schema 626–642) + `planCostSheet` (posting/cost-sheet.ts):

- Six hand-typed cost heads (fabric/trim/CM/wash/pack/OH) + commission% + margin% + sellingPrice.
- `totalCost = fabric + trim + CM + wash + pack + OH` — a naive sum, nothing else.
- **`marginPct` is stored input, never computed** (margin = (selling − cost)/selling is never
  derived anywhere; the plan's `sideEffects: ['Margin % recalculated', …]` is aspirational copy).
- Versioning is genuinely good (auto-increment per order; the Order Hub shows the version
  trail; `costing-input` = the daily-input skin with version-bump semantics).
- `cost-sheet-summary` report = a list over stored sheets — not a computation.

### 4.3 What legacy's system did that ours doesn't

1. **Component library** (`FrmPreCostingCompMas`): cost heads as maintained master data —
   quote from the library, not re-typed per order. Ours re-types every figure every time.
2. **Multi-level costing**: cost built through levels (fabric → yarn → trim rollups), matching
   how knitwear costs actually stack. Ours is one flat level.
3. **Actuals rollup** (`Frm_ProductionCost`): production cost computed from real production
   data and fed back into costing. Ours has the raw ingredients (ProductionEntry amounts,
   wage journals, StockLedger consumption at rate) but no rollup query joins them into cost.
4. **Estimated vs actual comparison**: legacy compared cost sheet vs production cost.
   Ours compares only budget vs actual at order+dept amount level — never at cost-head level.
5. **Per-pc derivation**: no per-piece cost/price anywhere in our CostSheet (legacy cost sheets
   were per-pc quoting instruments).

## 5. Where Ours Is Deliberately Better (keep, don't regress)

- **Ledger-is-truth** (ADR-002): program status derives from StockLedger on read, vs legacy
  trigger-maintained projector tables that drifted stale. The waterfall columns should be
  **read-derived the same way** when revived — not trigger-maintained.
- **Two doors, one service** (ADR-001): every order/program/costing op is form + agent tool
  (`create_order`, `create_program`, `create_cost_sheet`, `get_program_status`) — legacy had
  only forms.
- **Review-before-commit**: plan → approve → commit with audit; legacy saved straight to
  trigger-land.
- **Order Hub**: the whole document family with rollups in one screen — legacy needed
  `FrmOrdProdTrack` + `FrmIoHistoryReg` + `FrmBuyerStatus` to approximate it.
- **Versioned cost sheets + FCY** (currency/fxRate on Order, printed with FX line) — legacy
  cost sheets weren't versioned; the LPP ingestion relies on FCY daily.

## 6. Scorecard

| Dimension | Legacy | Ours | Verdict |
|---|---|---|---|
| Order doc skeleton (SO-####, header+grid, colour/size/qty/rate) | ✓ | ✓ | **parity** |
| Order print (incl. HSN, FX) | ✓ | ✓ (M18) | **parity** |
| Excel/paste input | ✓ | ✓ (M18) | **parity** |
| Amendment / close / enquiry | ✓ | ✓ | **parity (better: hub)** |
| Buyer-PO reference field | ✓ | ✗ (notes free-text) | **gap** |
| Multi-style order | partial | ✗ (schema allows; form forbids) | **gap** |
| Delivery schedule in one order | ✓ | ✗ (split orders) | **thinner** |
| Domestic/trading order variants | ✓ | ✗ (inferred; trading folded) | **thinner** |
| Program doc skeleton (PGM-####, stage→dept, required qty) | ✓ | ✓ | **parity** |
| Program cancel/complete/allotment | ✓ | ✓ | **parity** |
| GSM/LL/dia/design program physics | ✓ (edit form) | ✗ (columns orphaned) | **gap** |
| Balance waterfall (req→PO→DC→GRN→comp) | ✓ (triggers) | ◐ (req + ledger actual only) | **gap** |
| Yarn consumption / accessories program | ✓ | ✗ | **gap** |
| BOM→program requirement computation | ✓ (implied) | ✗ (hand-typed) | **gap** |
| Cost sheet versioning | ✗ | ✓ | **ours better** |
| Cost component master + multi-level + per-pc | ✓ | ✗ (manual flat) | **gap** |
| Actual cost rollup + est-vs-actual | ✓ | ✗ (budget-vs-actual amount-level only) | **gap** |
| Daily unit P&L | ✓ | ◐ (wage-margin) | **thinner** |

## 7. Recommendations (proposed landing zone)

None of the gaps in §6 are covered by the Phase-6 PRD (A–J). Proposed dispositions:

1. **Costing depth — extend Phase-6 as a new Module K (or fold into D):** per-pc cost sheet
   computed from BOM × order qty at stored rates (all data exists — `BomLine.rate` is already
   there); margin% computed not typed; cost-head comparison vs actuals (ProductionEntry
   amounts + wage journals + consumption); optional component library as a master (cheap:
   ~30-line master config). Effort: 1 batch. This converts the cost sheet from snapshot to
   calculator while keeping versions.
2. **Program waterfall — derive, don't trigger:** extend the program-status register (already
   ledger-derived) to expose PO'd / DC'd / GRN'd / completed columns computed from StockLedger
   txn types — the columns already exist as the read model; no new writes. Effort: half a batch.
3. **GSM/LL physics:** add the five orphan columns to the program form (fabric programs) +
   one correction variant; feeds 4-point/quality later. Effort: half a batch.
4. **BOM→program pre-fill:** a "propose requirements from BOM" action on the program form and
   a `propose_program_requirements` read tool (BomLine × order qty × wastage flag). Effort:
   half a batch.
5. **Buyer-PO reference + order type + delivery-schedule:** light Order schema additions
   (`buyerPoRef`, `orderType export|domestic|trading`, `OrderDelivery` lines) — closes the
   ingestion free-text debt. Effort: 1 batch with migration.
6. **Drop or park:** knitting-party inclusion, component-wise cancel, order groups/refs —
   real legacy features with thin modern value; revisit only on operator demand.

Items 1–5 total ≈3–4 batches and would close every "gap" row in the scorecard.
