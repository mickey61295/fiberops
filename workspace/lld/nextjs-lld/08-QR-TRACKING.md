# 08 — QR END-TO-END ORDER TRACKING (Traceability Fabric)

**Requirement (addition, 2026-08-15):** QR-based tracking of an order end-to-end, at variable granularity — bundle-to-bundle, piece-to-piece, roll-level where needed. This doc defines the tracking fabric; revisions ripple through 00/02/03/04/05/06/07.

## 1. Design summary & recommendation

The legacy app already tracks three of these nodes (fabric rolls in `CurrentStock_RollDtl`, bundles in `Pay_CuttProd_Bundle`, per-piece barcodes in `Pay_BundlePcs_Barcode` with `Pcs_Status U/G/R`) but keeps them in **separate silos with no genealogy between them**. The recommendation:

1. **Unify all trackable physical entities into one `TrackUnit` register** with a signed QR code each (bag → roll → lay → bundle → piece → carton → despatch), linked by a **genealogy DAG** (`TrackEdge`) that records split and merge relationships with quantity shares.
2. **Emit a `TrackEvent` from every posting** the PostingEngine already performs (DC, GRN, production entry, transfer, rejection, packing, gate) — so tracking is a *by-product of the existing wiring* (03), never a parallel data-entry path.
3. **Granularity is policy, per order and per part/stage** — piece QR where piece-rate payroll exists (upgrade of the existing per-piece barcode), bundle QR everywhere, roll QR where the roll module is on (`all_transaction_basedon_rollno` parity), optional yarn-bag and carton levels. A single order can mix granularities (e.g., piece-level for the body, bundle-level for collars/cuffs) — exactly the "varies bundle to bundle, piece to piece" requirement.
4. **QR format follows the GS1 Digital Link pattern** (URI with identifiers + serial, `01…/10…/21…` style keys) — industry standard for apparel traceability and forward-compatible with buyer/EU Digital Product Passport requests — with an **internal compact mode** for offline scan stations.
5. **Reconciliation loop**: a `TraceProjector` aggregates trace quantities per stage and ties them to `CurrentStock`, `Pcs_/Panel_StockTable`, `ST_Production_Data` and `Vue_Reqd_Vs_Finish`; mismatches surface as exceptions. This turns tracking into a permanent audit of the ledgers (and catches the legacy insert/delete drift class of bug).

## 2. TrackUnit model

```ts
type TrackUnitType = 'YARN_BAG'|'FAB_ROLL'|'DYE_LOT'|'CUT_LAY'|'BUNDLE'|'PIECE'|'CARTON'|'DESPATCH_DOC'
// DYE_LOT is a group node (virtual unit) for the dyeing merge point

type TrackUnit = {
  trackId: string            // public code (§3)
  type: TrackUnitType
  ordId, styleNo
  lotId?; partId?; stageId?; colorId?; sizeId?; compId?   // legacy keys, optional by type
  serial: string             // per-type sequence
  qty: { kgs?; mtr?; rls?; pcs? }
  status: 'ACTIVE'|'CONSUMED'|'REJECTED'|'REWORK'|'SHIPPED'|'RETIRED'
  owner: { kind:'GODOWN'|'PARTY'|'LINE'|'UNIT'|'BUYER'; refId }   // "where is it now"
  legacyRef?: { table: 'CurrentStock_RollDtl'|'Pay_CuttProd_Bundle'|'Pay_BundlePcs_Barcode'|'Trs_Grn2'; id }
  createdAt, createdBy, retiredAt?
}
type TrackEdge = { parentId, childId, kind:'SPLIT'|'MERGE'|'TRANSFORM', shareQty, uom, docRef }  // docRef = Trs_* header id
type TrackEvent = { trackId, eventType, docRef?, partyId?, godId?, stageId?, ts, userId, stationId, mode:'QR'|'1D'|'MANUAL' }
```

**New tables (additive only — no legacy table is altered):** `TrackUnit`, `TrackEdge`, `TrackEvent`, `TrackLabelLog`, `TrackPolicy`. Sync uses the same `UpdateFlg`/`server_id` pattern as `ST_*` (05) so the mobile app gets tracking too.

### Node ↔ legacy anchor map

| Node | Created at | Legacy anchor |
|---|---|---|
| YARN_BAG | purchase GRN (flag-gated) | `Trs_Grn2.RBag` split |
| FAB_ROLL | fabric GRN / mill receipt | `CurrentStock_RollDtl` (1:1) |
| DYE_LOT | GRN of dyed fabric | `Mas_Lot`/`lotno` |
| CUT_LAY | cutting production | lay header of `Pay_CuttProdMas` |
| BUNDLE | bundle generation | `Pay_CuttProd_Bundle` (1:1) |
| PIECE | per-piece label print | `Pay_BundlePcs_Barcode` (1:1; keeps `Pcs_Status` payroll logic) |
| CARTON | packing list | `no_of_box/pcs_per_box` line |
| DESPATCH_DOC | sales DC / gate pass | `Trs_Pcs1` (QR already used at gate) |

## 3. QR code format

Two encodings, both rendered by `QrLabelSvg` (ECC level **M**, version auto ≤ 10 for piece labels; human-readable serial always printed under the code — Tamil floor practice):

```
External (GS1 Digital Link style, buyer/3rd-party scannable):
  https://<host>/t/01/<itemRef>/10/<lot>/21/<serial>?s=<sig8>
    01 item identification (style+part+color+size composite)
    10 lot number (legacy lotno)
    21 serial (bundle/piece/roll serial)
    s  = HMAC-SHA256 truncated to 8 chars (anti-forgery, reprint detection)

Internal compact (scan stations, offline-first, ~35 chars):
  J1<B2(type)><B32(ordId|lotId|stageId|partId|serial)><CRC4><sig4>
```

Rules:
- **Signed & revocable**: labels carry an HMAC; `TrackLabelLog` records every print/reprint with user+reason; a superseded print can be voided (prevents two "live" labels for one unit).
- **Offline validation**: stations cache the order's `(ordId, lotId, stageId)` whitelist + HMAC key version; scans validate and queue locally (05 offline replay), full doc resolution when online.
- **Scanner parity**: QR readers also decode the existing 1D barcodes (`Pay_BarcodeGeneration`) — both funnel into the same `POST /api/scan/*` endpoints, so legacy printed stock keeps working during migration.
- Label sizes: roll 50×25mm, bundle 40×25mm, piece 18×18mm, carton 100×50mm (with order/buyer/box-no text block).

## 4. Genealogy — splits, merges, and quantity law

```
YARN_BAGs ──MERGE──▶ knitting program ──SPLIT──▶ FAB_ROLLs (grey)
FAB_ROLLs ──MERGE──▶ DYE_LOT (lotno)  ──SPLIT──▶ FAB_ROLLs (dyed, new identity)
FAB_ROLL ──TRANSFORM──▶ compactor/heat-set roll
FAB_ROLLs(+lot) ──MERGE──▶ CUT_LAY ──SPLIT──▶ BUNDLEs (per part/size)
BUNDLE ──SPLIT──▶ PIECEs
PANEL BUNDLEs ──MERGE──▶ PIECE (assembly: Trs_AddPanelAsm_SourceDtl semantics)
PIECEs ──MERGE──▶ CARTON ──MERGE──▶ DESPATCH_DOC
side events: DC out/in (owner change), rework loop, rejection (status), QC hold
```

**Quantity law (enforced by PostingEngine in the same transaction):** for every parent, `Σ child shareQty ≤ parent qty` (within the tolerance catalog, 03 §6); for merges, `Σ incoming shares = output qty ± process loss`. Violations block the posting with a legacy-style message — this is the structural fix for over-issue/over-cut, expressed through the same tolerances the trade already uses (`dyeinggamtper`, `knittinggamtper`, `cutting_dcjoborder_deviation`).

## 5. Where tracking hooks into the existing wiring

| Existing flow (03 matrix) | Added behavior |
|---|---|
| GRN 'Process' with roll detail | creates FAB_ROLL units + edges from the DC'd grey rolls (via `Trs_Del2` lineage / `FrmStockID`) |
| DC TrType 1 to dyer | `TrackEvent owner→PARTY` per roll/bag scanned or implied by lines |
| Ready-to-cut / cutting ack | roll status → cuttable; ack variance per roll |
| Cutting production (bundles) | creates CUT_LAY + BUNDLE units; edges lay→bundles; piece units per policy |
| Scan stations (`/api/scan/*`) | same validations; events carry trackId; PIECE status flips U/G/R (payroll parity) |
| Production entry / line ops | stage events; piece→piece edges at final stitch; panel MERGE edges at assembly |
| Piece GRN from job-worker | owner→company events; rework/reject status |
| Packing list / despatch | CARTON units; carton→despatch edges; gate QR scan closes loop |
| Reversal (compensating delete) | edges/events inverted — genealogy stays consistent by construction |

## 6. Screens & views (routes in 02 §23)

- `/tracking/[io]` — **Order river**: funnel Req→Knit→Dye→Cut→Stitch→Pack→Despatch with quantities tied to `Vue_Reqd_Vs_Finish`/`ST_Production_Data`, RAG per stage. **Value columns per stage (finance view): qty × cumulative rate (`StockRatePost.cumbillrate` / `PcsStockRatePost`) — money invested at each node, matching party-outstanding valuation.** [addition 2026-08-15 per finance-tracking requirement]
- `/tracking/[io]/genealogy` — interactive DAG (roll→lay→bundle→piece→carton), click any node → timeline, current owner, document refs.
- `/tracking/unit/[trackId]` — item passport: identity, full event timeline, ancestors/descendants, QC results, wage postings (bundle).
- `/tracking/scan` + `/m/track` — universal "scan anything" console: identifies any code and shows/advances it.
- `/tracking/exceptions` — reconciliation mismatches, missing scans, aging at parties (joins non-return-DC aging), voided-label attempts.
- `/tracking/policy` — granularity policy per order/part/stage (defaults from flags).
- Buyer/audit pack export (PDF): order genealogy summary + carton manifest (uses external QR format).

## 7. Granularity policy (the "varies" requirement)

```ts
TrackPolicy = {
  yarnBag: boolean            // default off
  fabRoll: 'auto'             // on when roll module on
  bundle: true                // always
  piece: 'BY_PART_STAGE'      // matrix: e.g. body=piece, collar=bundle
  carton: true
}
```
Set at order/program creation; editable per cutting job; each bundle generation can override (supervisor right `tracking.policy.override`) — so one order can carry piece-level body bundles and bundle-only trim bundles simultaneously.

## 8. Migration & rollout

1. **Phase 1 (parallel):** QR labels at cutting + piece/roll mapping tables; 1D barcodes keep working; `/tracking/[io]` reads legacy tables directly (no labels needed for read-only river).
2. **Phase 2 (backfill):** `TrackUnit` backfill job for in-flight orders from `CurrentStock_RollDtl`, `Pay_CuttProd_Bundle`, `Pay_BundlePcs_Barcode`; label reprint campaign per godown.
3. **Phase 3 (native):** PostingEngine emits TrackEvent everywhere; reconciliation exceptions become part of the daily meeting pack.

## 9. Performance & scale notes

- Event volume ≈ 20–60 scans/piece on piece-level orders; partition `TrackEvent` by finyear+month; genealogy queries are `(ordId)` scoped DAG walks (max depth ~9).
- `TrackEdge` enforced `(parentId)` and `(childId)` indexed; quantity-law check is per-parent aggregate — cache parent remaining qty on `TrackUnit` (updated in the posting transaction).
- QR decode is client-side (camera/`zxing` wasm or wedge); server never receives images for scans (only codes) — bandwidth-friendly for mill floors.
