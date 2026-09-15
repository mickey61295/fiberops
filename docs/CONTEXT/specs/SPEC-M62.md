# SPEC-M62 — QR & Barcode Traceability: labels, printing, scanning

Date: 2026-09-14 · Status: DRAFT (owner review) · Milestone M62
Numbering note: the accounts/roles draft slides to M64; this spec takes M62.
Depends: SPEC-M27 (vendored QR encoder), SPEC-M33 (vendored Code128),
SPEC-M12 (print system), CutBundle (existing bundle barcodes), the 8 master
codes/doc-number registry.

Owner request (verbatim intent): "print QRs for each order, rolls and other
things; from PC or mobile we should be able to generate and print QR codes"
and "what can and must be tracked through QR scans".

---

## §1 Scope

### 1.1 Why

FiberOps already has the two hard primitives: a vendored QR encoder
(`src/lib/erp/print/qr.ts`, EC level M, v1–10, verified against jsQR) and a
vendored Code128 encoder (`barcode.ts`, byte-verified against python-barcode),
plus `CutBundle.barcode` and the `get_bundle` tool. What is missing is the
**traceability layer**: rolls, WIP, cartons, locations, documents, and a scan
surface that works from a phone on the shop floor. This spec defines the
entities to tag, the payload contract, printing (PC + mobile + thermal), the
scan flows, the data model, and the APIs. It is the foundation the mobile app
(SPEC-M63) builds its Scan page on.

### 1.2 Research basis (what the field does)

- QR-based bundle tracking is the industry norm (progressive bundle system,
  >90% of South Asian CMT): two scans per operation (start/finish), bundle QR
  labels printed at cutting, live WIP aging alerts; measured 74.3% WIP
  reduction in a documented implementation; best-in-class WIP 4–12 days vs
  18–24 poorly managed (scanerp.pro; Methods Apparel; Pro-X 4.0).
- Roll-level tagging beats batch-level: buyer/quality questions resolve to a
  specific roll; roll-level costs little more and avoids treating a whole
  batch as suspect (iFactory/JRS).
- What travels on the label: style/article, lot, colour, size, component,
  bundle number, quantity — under ~80 chars, single-char keys, v3 QR ≈ 2 cm,
  scans on cheap phones (scanerp.pro payload example).
- Label durability: direct thermal fades (3–12 months / heat-sensitive) →
  **thermal transfer on synthetic media** for long life; wash-care fabric tags
  (nylon/satin/polyester, sew-in or heat-seal) for garments; 30% damage
  tolerance is inherent to QR Reed–Solomon (ISO/IEC 18004).
- Printing: TSPL/ZPL/EPL emulation is the industry standard (TSC/Zebra clones
  from ~$200), 203–300 dpi, USB/LAN/Bluetooth options; label sizes per use
  (4×6" shipping, 4×4" carton, 4×2" product, 3×1" item).
- Multi-decoder scanning (native BarcodeDetector + jsQR + ZXing) with
  preprocessing pushes first-scan success <3% failure in factory conditions;
  manual code entry is the fallback (scanerp.pro).
- DPP/EU ESPR: export-bound factories are being asked for lot/bundle/operator/
  dispatch traceability now; QR bundle tracking generates it automatically
  (ScanERP DPP article).
- RFID is the automatic alternative for warehouse/gate movement; QR is the
  low-cost manual default. Combined setups are common but out of scope here
  (named deferral).

### 1.3 In scope

- Tagging: cut bundles, finished-goods cartons, fabric rolls, godown
  locations (rack/bin), despatch pallets, documents (order/PO/GRN/DC/invoice
  copies), jobwork DC material lots, machines/assets, employee badges
  (PIN/badge login is M63 but the badge payload contract lives here).
- Payload contract, label templates, printing paths (A4 sheets on PC,
  thermal transfer TSPL/ZPL for shop floor, mobile share/print).
- Scan flows per role and a universal `/scan` surface (desktop + mobile PWA).
- Data model: FabricRoll, RollMovement, ScanEvent, Carton, CartonItem,
  Location, and WIP operation scan events on CutBundle.
- APIs, agent tools, print sheets, and the trace query ("show me the story of
  this code").

### 1.4 Out of scope (named, not silent)

- RFID/NFC hardware integration (documented as the scale-up path).
- GS1/SSCC external standards compliance and Digital Product Passport export
  (a later milestone; the data model keeps the fields it would need).
- Barcode symbology changes to the document number registry (Code128 stays
  for existing prints; QR is additive).
- Bluetooth mobile printing implementation (M63 wave 2; the payload and
  TSPL templates here are printer-ready).
- Camera-based OCR of handwritten tickets.

---

## §2 What to track (multilayer map)

Priority: P0 = needed for the WIP/roll/trace core; P1 = high value, same model;
P2 = later.

| # | Entity | Code (new) | Payload | Scan points | Why | Pri |
|---|---|---|---|---|---|---|
| 1 | Cut bundle (exists) | `bundleNo` (exists, unique) | style, lot, colour, size, component, qty, bundle seq | cutting print, issue, each operation start/finish, QC, packing | WIP aging, piece-rate truth, assembly marriage, defect blame | P0 |
| 2 | Fabric roll (new) | `ROLL-####` | fabric code, lot, WAC rate (server-only), metres/kg, shade, width, GSM, supplier/GRN link | jobwork DC out, jobwork in, stock transfer, cutting issue, remaining balance | the "which roll" questions; shade/lot traceability; remaining-metres on roll | P0 |
| 3 | Carton / box (new) | `CTN-####` | order, style, colour, size, pcs, buyer, carton seq | packing, despatch, gate pass, buyer claim | despatch accuracy, claim resolution, DPP | P0 |
| 4 | Godown location (new) | `LOC-G#-RR-BB` | godown, rack, bin | stock ops, transfers, putaway | "where is it" for stock-take and pickers | P1 |
| 5 | Document copy (existing docNos) | `SO-####`, `GRN-####`, `DC-####`, `INV-####`, `PO-####` | docNo, type, party, date | gate entry/pass, approvals, delivery, audit binder | gate↔document closure, physical↔digital match | P1 |
| 6 | Pallet / despatch unit (new) | `PLT-####` | child carton list, order, buyer, weight | despatch, gate, buyer receipt | bulk handling without opening cartons | P2 |
| 7 | Machine / asset (new) | `AST-####` | name, category, line | maintenance, breakdown log, production entry attribution | downtime reasons, cost allocation | P2 |
| 8 | Employee badge (exists as employee code) | `EMP-####` | employee code, name (maskable) | kiosk PIN/badge login (M63), wage queries | attribution on shared terminals | P1 |
| 9 | Sample (exists) | sample code | buyer, style, stage | sample room, courier, approval | sample round-trip tracking | P2 |
| 10 | Quality lot / lab test (exists) | lot/test code | item, lot, parameter | lab bench, approval | test↔lot linkage | P2 |

**Must track now** (the owner's "orders, rolls and other things"): cut bundles,
fabric rolls, cartons, godown locations, document copies. Those five cover the
questions that cost money today: where is the WIP, which roll went where, what
is in the carton, where is the stock, and does the paper match the system.

---

## §3 Payload & code design

### 3.1 Code scheme

- Every taggable entity carries a **short human-readable code** printed in
  plain text under the QR (manual-entry fallback):
  - Existing: `bundleNo` (BND-…), docNos (SO/PO/GRN/DC/INV), `EMP-####`.
  - New: `ROLL-####`, `CTN-####`, `PLT-####`, `LOC-G1-R03-B02`, `AST-####`.
- Codes are globally unique in their prefix space, generated by the existing
  numbering registry (same pattern as `nextAutoCode`), never reused.
- The QR **payload is the code**, not the data (see 3.2). This keeps the
  printed label stable even if data changes, and lets the server be the single
  source of truth at scan time.

### 3.2 Payload contract

Two payload forms, chosen by use:

1. **Internal tags (default):** `FO:<type>:<code>` — e.g.
   `FO:ROLL:ROLL-0142`, `FO:BND:BND-00431`, `FO:CTN:CTN-0012`,
   `FO:DOC:GRN-0007`, `FO:LOC:LOC-G1-R03-B02`.
   - Compact (fits v2–v3 QR ≈ 2 cm), stable, no PII, no secrets.
   - Scanner types the code; mobile PWA resolves via offline cache or API.
2. **External/deep-link tags (friendly scans):** a URL
   `https://<host>/scan?c=FO%3AROLL%3AROLL-0142` (versioned query `c`), so a
   plain phone camera opens the app to that entity. Never embeds sensitive
   data.
3. **Signed QR (optional, export labels):** `FO:<type>:<code>.<exp>.<hmac>`
   using `AUTH_SECRET` (M60) for buyer-facing carton labels where a forged
   label must be detectable. Internal labels stay unsigned for scan speed.

The bundle payload example from the field (single-char keys) is deliberately
**not** copied: FiberOps keeps data server-side so code logic, payments, and
permissions stay authoritative.

### 3.3 QR rendering rules

- Use the vendored `qrSvg()` (EC M, byte mode). Keep payloads ≤ 100 bytes so
  versions stay ≤ v6; if a label needs more, do not stuff data — use the code.
- Quiet zone 4 modules (already implemented); module size ≥ 0.5 mm printed
  (label templates fix physical size per media).
- `qrSvg(text, sizePx)` for screen/A4; a new `qrBufferPng()` path for thermal
  printers is **not** needed — thermal templates carry the payload and the
  printer's own QR command (TSPL `QRCODE`), so the encoder stays on-screen/PDF.

## §4 Printing

### 4.1 Print paths

| Path | Where | How | Use |
|---|---|---|---|
| A4 sheet | PC → browser print | existing `print-sheet.tsx` + `qrSvg` + Code128 | 24/48 labels on sticker sheets, office printer, pilot |
| Thermal label | Shop floor | TSPL/ZPL template (new `src/lib/erp/print/tspl.ts`) + Bluetooth/LAN printer | bundle, roll, carton, location labels at volume |
| Mobile share | Phone → printer app / share sheet | render label PDF/SVG server-side, open share target | quick reprints from the floor (M63 wave 2) |
| Direct thermal print agent (deferred) | Windows/LAN | later: a small local service posting raw TSPL | full automation |

### 4.2 Label templates (fixed sizes)

| Label | Media | Size | Content |
|---|---|---|---|
| Bundle ticket | Synthetic thermal-transfer sticker | 50×30 mm | QR + `BND-…` text + style/colour/size/component/qty + cut order |
| Roll tag | Synthetic sticker or sew tag | 70×40 mm | QR + `ROLL-…` + fabric/lot/shade/GSM/width + supplier |
| Carton label | 4×4" thermal transfer | 100×100 mm | QR + `CTN-…` + order/style/colour/size/pcs + buyer |
| Location label | Polyester sticker | 50×25 mm | QR + `LOC-…` text |
| Document cover | A4 (existing print) | A4 | QR + docNo header (gate/binder use) |

Media rules (research): thermal transfer with resin/wax-resin ribbon on
synthetic (PET/PP) stock for anything on the sewing floor — direct thermal
fades and smears; wash-care fabric tags only for garments that must carry the
mark through washing (DPP future).

### 4.3 TSPL/ZPL template contract

`tspl.ts` exports pure string builders: `bundleLabel({payload, code, fields})`,
`rollLabel(...)`, `cartonLabel(...)`, `locationLabel(...)` returning TSPL with
`QRCODE`, `TEXT`, and barcode commands, plus a `~HS` status note. ZPL builders
mirror the same signature (`zpl.ts`) because most cheap printers accept both
(TSPL/EPL/ZPL emulation is standard). Unit tests assert byte-exact templates
(the Code128 fixture precedent, M33).

## §5 Scanning

### 5.1 Scan surfaces

1. **`/scan` universal page** (desktop + mobile PWA): open camera (or use a
   USB/BT HID scanner which types the code), decode, resolve, and route to the
   entity's action panel.
2. **Contextual scan buttons** inside existing screens (bundle page, stock,
   gate, despatch) that open the scanner and return the code to the screen's
   own flow.
3. **Deep link** `?c=FO:...` handled by `/scan`.

### 5.2 Decode stack (mobile browser reality)

- Primary: `BarcodeDetector` when available (Android Chrome).
- Fallback: vendored decoders — `jsQR` (dev-only today; promote to a lazily
  loaded client chunk) and ZXing-wasm as the last resort. All three run
  in parallel with frame preprocessing (contrast/brightness) per the field
  experience; first-scan target ≤3% failure.
- HID scan-gun input: a hidden input captures fast keystrokes ending in Enter
  (no camera needed) — the cheapest upgrade for cutting/packing desks.
- Manual entry: always visible under the camera; typing `BND-00431` or
  `ROLL-0142` works identically.

### 5.3 Resolution & routing

- Resolve by prefix: `BND` → bundle panel, `ROLL` → roll panel (balance,
  movements, which orders consumed it), `CTN` → carton contents, `LOC` →
  stock in location, `DOC` → document view + gate reference, `EMP` → employee
  panel (rights-checked).
- Every scan writes a `ScanEvent` (who, where, what, action, timestamp,
  device, offline flag) — this is the audit + DPP seed. Unknown codes create a
  "not found" event (never a silent no-op) so ghost labels are visible.
- Rights: scans check the same permission as the equivalent read/write action
  (M61 E-10 model; no scan bypasses rights).

### 5.4 The three flows that matter first

1. **Cutting → label** — after a cut order commits, print the bundle manifest
   as thermal labels (or A4 first); attach before the bundle leaves the table.
2. **Operation start/finish** — operator scans the bundle at a station:
   start (records operator/machine/time), finish (records completion, releases
   downstream). Feeds `post_production_entry` where the piece-rate loop
   already exists; the scan becomes the data-entry UI for the floor.
3. **Roll issue/consume** — at fabric issue to cutting or jobwork DC out, scan
   the roll; at jobwork in/cutting completion, record consumed metres/kgs and
   remaining balance. This is what makes "which roll went into this order"
   answerable.

## §6 Data model (additive)

| Model | Fields (beyond id/createdAt) | Notes |
|---|---|---|
| FabricRoll | rollNo unique, fabricId/partyId?, grnId?, lotNo?, shade?, gsm?, width?, initialQty, uomCode, remainingQty, status (in_stock/issued/consumed/returned), locationId? | one row per physical roll |
| RollMovement | rollId, type (in/issue/return/consume/adjust), qty, refType/refNo (DC/GRN/cut order), userId, at | the roll's stock ledger |
| Carton | ctnNo unique, orderId?, buyerId?, status (packed/despatched/delivered), size, grossWeight? | carton header |
| CartonItem | cartonId, styleId, colourId, sizeId, qty | contents |
| Location | code unique (LOC-G1-R03-B02), godownCode, rack, bin, label?, active | putaway/pick |
| ScanEvent | code (string, indexed), entityType, action (start/finish/issue/receive/pack/gate/query), userId, at, device, source (camera/gun/manual), offline (bool), syncedAt?, payloadJson? | append-only scan ledger |
| CutBundle | (existing) + currentStageId?, lastScanAt?, lastOperatorId? | WIP projection from ScanEvents |
| Asset | assetNo unique, name, category, lineCode?, status | P2 |

WIP is a **projection**: `ScanEvent` append-only + a small `BundleStage`
upsert table (bundleId, stageId, operatorId, startedAt, finishedAt) so the
live board does not scan the whole ledger. Do not mutate history.

## §7 APIs & agent tools

- `GET /api/labels/[type]/[code]` → SVG/PDF label (session-guarded; rights-
  checked). `?format=svg|pdf|tspl` (tspl returns text/plain for print agents).
- `POST /api/scan` → `{ code, action, context? }` → resolves, writes
  ScanEvent + domain effect (e.g. finish bundle → production entry draft? No —
  scoped: scan actions that move stock/WIP are **plan-first** like every write,
  except pure `query` scans).
- `GET /api/scan/resolve?code=` → entity panel payload for UI.
- Print sheets: `/labels/bundles?cutOrder=…`, `/labels/rolls?grn=…`,
  `/labels/locations?godown=…`, `/labels/cartons?order=…` (A4 grid).
- Agent tools (new, thin): `get_roll`, `list_rolls`, `print_labels`
  (returns label payloads to print — never clicks a printer),
  `record_scan` (action=start|finish|issue|receive), `trace_code`
  (the "story" query: every scan/movement for a code). All read/plan-first;
  `record_scan` writes go through the existing plan/approve loop.

## §8 UX surfaces

- `/scan` (universal, mobile-first).
- Entity panels: roll (balance + movements + "used in" orders), bundle
  (stage trail + operator/time history), carton (contents + despatch link),
  location (what's here now).
- WIP board (extends the existing live tracker): bundles per stage, aging
  alerts (>2× expected), operator throughput.
- Print hubs: one per entity type with filters + count + preview.
- Trace page: one code → a single chronological story (print/PDF for buyer
  audits).

## §9 Waves

| Wave | Ships | Exit criteria |
|---|---|---|
| Q1 — Bundles end-to-end | label render (A4 + TSPL), `/scan` with manual + camera, bundle panel, ScanEvent, stage projection, WIP board | cut order → labels → scan start/finish → WIP shows correctly; 100% of scans audited |
| Q2 — Rolls | FabricRoll + RollMovement, roll labels, issue/consume scans at cutting + jobwork, balance view | "which rolls are in this order / this roll's story" answered from data |
| Q3 — Cartons, locations, documents | Carton + contents, location labels + putaway/pick scans, document cover QRs, gate↔doc closure | despatch carton list verifies against packing; stock location scan finds stock |
| Q4 — Trace & external | trace page/PDF, signed export labels, DPP-shaped export (deferred standard), scan analytics | buyer/audit trace in one page; ghost-label report |

## §10 Tests & gates

- `tests/unit/qr-payload.test.ts` — payload builders, prefix routing, signed
  payload verify, size guard (≤ v6 for standard labels).
- `tests/unit/tspl-templates.test.ts` — byte-exact TSPL/ZPL (fixture parity,
  the M33 barcode precedent); label geometry (mm ↔ dots at 203/300 dpi).
- `tests/pipeline/scan-flow.test.ts` — start/finish writes ScanEvent +
  projection; duplicate scan idempotency; unknown code → not-found event;
  rights denial.
- `tests/pipeline/roll-flow.test.ts` — receive → issue → consume → remaining
  balance; movement ledger integrity; over-consume refuses.
- `tests/pipeline/carton-flow.test.ts` — pack → contents → despatch link;
  quantity mismatch.
- E2E: `09-scan.spec.ts` — desktop scan via manual code, deep link, label
  print sheet (viewport), rights denial.
- Gates: vitest full, tsc 0, context_check counters (models +7), eval rows for
  the new agent tools, route smoke for the new routes.

## §11 Owner decisions

1. Label format at pilot: A4 sticker sheets first (no hardware) or buy a
   thermal-transfer printer (~₹15–25k) for Q1?
2. Bundle size for WIP: current cut-order bundle sizing — keep, or make it a
   cut-order parameter (10/20/…)?
3. Roll tagging scope: fabric rolls only, or also yarn bags/accessory boxes
   in Q2?
4. Location depth: godown→rack→bin three levels, or godown→bin two?
5. Signed labels: which customer-facing labels need signature (cartons only,
   or rolls too)?
6. Scan-gun budget: are USB HID guns acceptable at cutting/packing desks
   (cheap, very reliable) alongside phone cameras?

## §12 Deferred (named)

- RFID/NFC (automatic warehouse/gate reads) — the scale path once roll/carton
  volumes justify it.
- GS1/SSCC + DPP standard export (EU ESPR 2027-28 pressure on export orders).
- Direct thermal print agent (no-click printing from the ERP host).
- Bluetooth mobile printing (M63 wave 2).
- OCR of handwritten tickets; image capture on scans (defect evidence).

---

## §13 Revision 2 — self-audit gaps closed

Found by auditing the spec against the actual schema/services after the first
draft. These are binding additions, not commentary.

**R2-1. Cartons already exist — do not duplicate them.** `PackingList` /
`PackingListLine` (schema:1318, `cartonNo` at :1340) are the packing truth.
The new `Carton`/`CartonItem` tables from §6 are **withdrawn**. Carton QR
becomes a label layer: `CartonLabel { ctnNo unique, packingListId, despatchId?,
status, printedAt, printedBy }` derived from `PackingListLine.cartonNo`.
Carton contents are always read through the packing list, never copied.

**R2-2. Roll ledger reconciles to the stock ledger — no parallel inventory.**
`StockLedger` + `CurrentStock` (schema:466/530, per godown+item+lot) remain the
single stock truth. `FabricRoll` is a **sub-ledger**: every `RollMovement`
must reference the stock txn it corresponds to (`docNo` + type), and
`Σ roll.remainingQty` per godown must equal the fabric `CurrentStock` for that
godown. Invariant test required. Roll balances never post stock; they explain
it. Location (rack/bin) is advisory metadata, not a ledger dimension.

**R2-3. Migration & backfill.** Prod bootstrap creates no rolls. Tools:
`create_opening_rolls` (bulk-create rolls for in-stock fabric per godown, one
"unassigned" roll until split), a reprint flow for all open cut orders
(bundles exist without QR), and a compatibility rule: the QR payload uses the
**existing `bundleNo`** as its code and the Code128 `barcode` value stays
valid — QR is additive, `get_bundle` keeps working unchanged.

**R2-4. Scan → production entry is a plan, not an auto-post (wages are
money).** Three scan postures, per action configured in the tool:
`record` (ScanEvent only), `draft` (creates the normal plan awaiting approval),
`auto` (posts when the policy allows). Default: operation finish = `draft`
(feeds `post_production_entry` with operator/qty/rate from the scan), stock
moves = `draft`, pure queries = none. Operator-facing copy in M63 shows the
plan card. This is the missing contract that keeps payroll disputes out.

**R2-5. Bundle lifecycle edge cases.** Define and test: split (one bundle →
N, children inherit lot/colour/size, parent void), merge, label loss (reprint
by `bundleNo`, reprint audit row), void/scrap (label status → void, scans
refuse with "cancelled"), cancelled cut order, and **concurrency**: two phones
finishing the same bundle — first wins, second gets the "finished by X at T"
conflict (M63 §2 matrix, enforced server-side here).

**R2-6. Stock-take synergy.** The M42 cycle (create_stock_take →
record_stock_counts → advance) gains a scan mode: scanning a location + roll
(or bundle) code pre-fills the count row; variance flow unchanged. No new
stock logic.

**R2-7. Print queue (one design for PC and mobile).** `PrintJob { id, kind,
payload (tspl text), printerTarget, status (queued/sent/failed/done),
attempts, requestedBy, at }` + a tiny LAN print agent contract
(`GET /api/print/next` long-poll → `POST /api/print/:id/result`) and a
browser-triggered local print path for USB printers. M63 wave 2 consumes this;
no competing "server queue" design elsewhere.

**R2-8. External trace view (buyer/auditor).** Signed label scheme stays; add
a **trace view scope**: buyer-facing shows lot/bundle counts, quality sign-off,
dispatch links; internal cost, WAC, operator names/rates are stripped.
Public-by-token page (`/trace/<signed-token>`) is an owner decision (R2-14).

**R2-9. ScanEvent capacity & retention.** Expected 4–8k scans/day at pilot
scale. Rules: indexed by `(code, at)` and `(userId, at)`; writes batched per
scan via a single Prisma transaction with the domain effect; WAL checkpoint
tolerance tested at 10k scans/day synthetic load; nightly `WipRollup` job
keeps the board query O(1); ScanEvent retention 24 months then archive to
CSV (DPP asks 10 years — archive, don't delete).

**R2-10. IRN QR is regulatory — never reuse.** The e-invoice IRN QR
(`print/qr.ts` consumer in `print/fetchers.ts`) stays on invoices exactly as
defined by GST rules. Internal labels are a separate namespace (`FO:` prefix)
and must never be placed on the statutory invoice print.

**R2-11. Label i18n & validation tests.** Label templates accept an optional
Tamil line (field labels only; codes stay ASCII). Tests: physical size math at
203/300 dpi, quiet-zone presence, decode-back test per template (rasterize →
jsQR) — the M27 verification precedent.

**R2-12. Employee badge scope.** Badge/PIN scans are for **login and
attribution only** in M62/M63; attendance still goes through
`post_attendance` (no silent attendance writes from a badge tap). A later
opt-in can map badge scans to attendance with the same plan-first rule.

**R2-13. Costing is untouched.** Roll-level consumption does not change WAC,
cost sheets, or COGS in Q1–Q3; it enriches trace. A later milestone may use
roll lot data for shade-aware FIFO — explicitly deferred.

**R2-14. New owner decisions** (added to §11): (a) public-token trace page
yes/no; (b) opening-rolls sweep on existing fabric stock at go-live; (c) label
printer target for the pilot (LAN agent vs A4 only); (d) ScanEvent archive
destination (file share vs table export).

