# 01 -- HLR: High-Level Requirements (Level 1) for the Next.js ERP Rewrite

**Status:** draft for review | **Date:** 2026-08-15 | **Level:** 1 (requirements; detail lives in LLD docs 01-11)
**Sources:** 00-OVERVIEW.md, PLAN.md, 08-QR-TRACKING.md sec 1, 09-AI-HARNESS.md sec 1,
FIBERPRO_BUSINESS_ANALYSIS.md sec 1-3.
**Format rule:** every HLR and NFR below is one line, numbered, and written in testable
"The system shall ..." wording. Traceability: each HLR maps to the owning LLD doc (01-11).

## 1. Product vision & background

The product is a ground-up rewrite of **Joms/Fiberpro (v2.5.9.4)**, the ERP that runs a Tirupur-style
knitwear export "mother firm": the exporter owns the order, the yarn, and the fabric, and moves work
through a web of outside job-work units (knitters, yarn dyers, fabric dyers, printers, compactors,
embroiderers, stitching contractors) plus its own cutting and stitching floors. The system's center of
gravity is exactly where Tirupur's business risk sits: **material lying outside your gate, with parties,
at process cost** -- knowing, to the kilo and the piece, what is owed by whom, to whom, at what cumulative
cost, against which order.

The legacy app runs this as three interlocking loops, and the rewrite preserves all three:

1. **The material loop (yarn -> fabric):** kgs/mtrs, rolls/bags, DC out to a party, GRN back with a new
   fabric identity (dyed shade, finished GSM/dia); shrinkage = DC minus GRN becomes shortage.
2. **The garment loop (cut -> stitch -> pack):** bundles and barcodes, panels/pieces/bits moving
   stage-to-stage, line WIP, rework and rejects, packing and gated despatch.
3. **The money loop:** job-work bills, bill-pass with TDS, rate confirmations, debit notes for losses,
   payments, party balances (absolute and program-wise), budget vs actual costing per order, daily
   factory P&L, and export realization protected by forward-contract rates.

The rewrite targets **1:1 feature parity** with the legacy artifacts -- 322 WinForms, ~440 SQL objects,
~330 report templates, the 189-flag store, and the existing Commando mobile screens -- with business
rules moved to exactly one home each (posting math in the PostingEngine, balances in Projectors,
validation in zod + services, numbering in a NumberingService).

On top of the unchanged parity core there are exactly **two requirement additions** (2026-08-15):

1. **QR end-to-end order tracking** (LLD 08): one TrackUnit register with signed QR codes and a
   genealogy DAG across bag/roll/lay/bundle/piece/carton/despatch, events emitted by the PostingEngine.
2. **The AI harness "Joms Sahayak"** (LLD 09): Tamil-first PO/GRN/bill parsing with a review-confirm
   loop, voice operation, eval gates, and governance; AI drafts, humans confirm, the engine posts.

**Finance and analysis are first-class**: costing/P&L, commercial settlement, MIS, and value-aware
tracking (money invested at every node of the order river, valued at cumulative rate) are core
workstreams, not afterthoughts. The rewrite's measure of success is that the owner can run the factory
on it from day one of cutover with zero behavioral surprises versus legacy, and then gain tracking and
AI capability legacy never had.

## 2. Users & personas

One line each: persona -> top jobs-to-be-done in this system.

| Persona | Top jobs-to-be-done |
|---|---|
| Owner | Read daily Tamil digests, order river with money-at-stage, daily P&L, party exposure; approve exceptions from mobile |
| Merchandiser | Track IO styles/colors/sizes vs plan (WBS RAG), chase non-return DCs, answer buyer status queries |
| Stores in-charge | Post GRN/DC with roll detail, plan trim issuance per cut job, run godown transfers and acknowledgements |
| Cutting supervisor | Turn cut plans into job orders and barcoded bundles, split rolls, pass ready-to-cut, acknowledge after lay inspection |
| Line operator / scanner | Scan bundle/piece barcodes at each stage, hear Tamil numeric read-back, keep working through offline outages |
| QC inspector | Record lab tests and stage parameters, hold or reject units, inspect at piece GRN and at the gate |
| Accountant | Run bills -> bill-pass with TDS -> payments, GST/TDS registers, debit notes, Tally hand-off, party balances |
| Approver | Review PO/lot/rate/shortage/reprocess/non-return-DC approvals with deviation context, on mobile or desk |
| Mobile user (Commando) | Use dashboard, approvals, entries (GRN, DC, rejection, transfer, gate pass), scan and scan history while roaming |
| AI reviewer | Confirm or correct AI-parsed drafts side-by-side with the source image; corrections feed the learning store |

## 3. Scope: module inventory

All 22 modules from 00-OVERVIEW are in scope; none is dropped or re-scoped. Priority is a requirement
statement, not a build order -- the build order is the Stage column (PLAN.md stages S0-S9).

Priority key: **P0** = required for cutover parity (system cannot go live without it).
**P1** = committed requirement, staged after the P0 core or as an early slice of it.
**P2** = committed requirement, delivered latest and/or gated behind eval/enable switches.

| # | Module | One-line purpose | Priority | Stage | R-doc |
|---|---|---|---|---|---|
| 1 | Dashboard & MIS | MIS dashboards, order-status WIP pipeline, meeting charts and daily packs | P1 | S6 | R07 |
| 2 | Orders (IO) | Buyer PO -> internal orders with styles, color/size grids, cut plan, amendments | P0 | S2-S3 | R02 |
| 3 | Planning & Program | Loss-grossed yarn/fabric/trim requirement explosion, program balances, WBS/T&A | P0 | S3, S6 | R02 |
| 4 | Procurement | POs with tolerances and approvals, supplier orders, rate confirmation | P0 | S3 | R03 |
| 5 | Inward (GRN) | All GrnType receipts incl. multi-process, lot approval, waste receipt | P0 | S2 | R03 |
| 6 | Outward (DC) | All TrType DCs (yarn/fab/pcs/panel/acc/gen), gate pass, ready-to-cut | P0 | S3 | R03 |
| 7 | Stock & Stores | Registers, ledger, transfers, godown/unit ack, adjustments, openings | P0 | S2-S3 | R04 |
| 8 | Cutting | Cutting production, job orders, roll split, ready-to-cut, cutting ack | P0 | S3-S4 | R05 |
| 9 | Production | Prod-entry dispatcher, bundles/barcodes, line in/out/tfr, issue-to-production | P0 | S4 | R05 |
| 10 | Panels & Pieces | Panel excess/rej/rework, piece stock, rejections, shortages, assembly | P0 | S4 | R05 |
| 11 | QC & Lab | Lab tests, parameters, stages, inspection gates | P1 | S4 | R06 |
| 12 | Commercial | Bills register, bill-pass/TDS, invoices, debits, payments, party balances, Tally/GST | P0 | S5 | R06 |
| 13 | Costing & P&L | Budget vs actual, daily unit P&L, quick-costing cube, unbilled accrual | P0 | S5-S6 | R07 |
| 14 | Payroll & Wages | Piece-rate wages from barcode production, shift wages, wage registers | P1 | S4 | R05 |
| 15 | Approvals (Workflow) | Approval masters and inbox for PO/lot/rate/shortage/reprocess/acc/non-return-DC | P1 | S3+ | R08 |
| 16 | Reports | ~330 legacy report templates with identical output | P1 | S2+ (all stages) | R08 |
| 17 | Masters | ~40 master CRUD screens with legacy validations | P0 | S1 | R09 |
| 18 | Administration | Users, groups, menu/company rights, finyear, flags, data utilities | P0 | S1 | R01 |
| 19 | Mobile (Commando) | Synced mobile app: dashboard, approvals, entries, scan + tracking/AI additions | P1 | S2+ (all stages) | R08 (shell R01) |
| 20 | Integrations | Mail/SMS, weigh scale, Tally export, e-way fields, barcode/label printers | P2 | S4-S5 | R01 |
| 21 | QR Tracking (addition) | Order river, genealogy DAG, item passport, scan-anything, exceptions, policy | P1 | S7 | R08 |
| 22 | AI Harness (addition) | Parse inbox, assistant (chat/voice), AiDock on every form, admin console | P2 | S8 | R08 |

Stage 9 (migration, parallel run, hardening) applies across all modules and is not listed per module.

## 4. High-level functional requirements

Traceability: the Module(s) column maps each HLR to the owning module number(s)/name(s) from sec 3 (and thereby to its R-doc via the sec 3 R-doc column); rows marked "cross-cutting platform (R01)" apply to all modules and are owned by the platform foundation.

| ID | Requirement | Module(s) |
|---|---|---|
| HLR-01 | The system shall maintain three stock ledgers -- CurrentStock (kg/mtr/rls), Panel_StockTable (per component), Pcs_StockTable (per stage x line x Good/'M' bucket) -- keyed by order, item identity, godown, party, and stage. | 7 Stock & Stores; 10 Panels & Pieces |
| HLR-02 | The system shall post every document action through one transactional PostingEngine reproducing the extracted Sp_currentstock semantics with signed +/- calls against the correct ledger. | All -- cross-cutting platform (R01) |
| HLR-03 | The system shall reverse any document via a compensating posting inside one transaction that restores the exact prior ledger, balance, and genealogy state (no hard deletes). | All -- cross-cutting platform (R01) |
| HLR-04 | The system shall support every legacy DC TrType code (1, 2, 3, 4, 6, 7, 8, 10-12, 13, 14, 17, 20, 21, -2, -7) with identical process/sales/transfer/return/reprocess/ready-to-cut semantics. | 6 Outward (DC) |
| HLR-05 | The system shall support every legacy GrnType (Purchase, Process, Process Return, DirectReceipt, Sales Return, Acc mirrors, Return) including multi-process GRN where OurDCID=0 chains the prior GRN as the DC. | 5 Inward (GRN) |
| HLR-06 | The system shall capture buyer POs as IOs with EntryOption 1/2 grids, CutPlanQty = order + sanctioned excess, FCY sale rate valued at forward-else-spot, and amendments kept as auditable copies. | 2 Orders (IO) |
| HLR-07 | The system shall explode cut-plan pcs through grams/pc, parts, and the process route into loss-grossed yarn/knitting/accessory requirements (SP_FabReqCalc and SP_PartwiseRequirement parity, shade-wise and per-order excess). | 3 Planning & Program; 2 Orders (IO) |
| HLR-08 | The system shall maintain program balances via projectors reproducing the TRG_YARN/FAB_BALANCE triggers and Vue_Reqd_Vs_Finish (req_balance = (Req + Short) - (GRN + Prog_Comp + TransIn + Return - TransOut)), reprocess in separate buckets, plus both accessory balance stacks. | 3 Planning & Program; 7 Stock & Stores |
| HLR-09 | The system shall route every manual or scanned production entry through one dispatcher (Trs_ProdEntry + Qty) to Piece/Panel/Assembly/LineOut posting paths by stage PcsType (Piece/Panel/Bit). | 9 Production; 10 Panels & Pieces |
| HLR-10 | The system shall validate bundle and piece barcode scans (INVALID TAG / ALREADY ISSUED / BUNDLE COMPLETED, route via Prod_Sequence, contractor allotment, rework approval) and close bundles when Pcs = Good + Rejection. | 9 Production; 10 Panels & Pieces |
| HLR-11 | The system shall convert barcode scans into Trs_ProdEntry rows and piece-rate wage accruals in the same posting (SP_Barcode_Production_Posting parity with corrected legacy defects). | 9 Production; 14 Payroll & Wages |
| HLR-12 | The system shall record line input, line-to-line transfer, rejections moving Good -> 'M' bucket with RejectionTypeId, and rework consuming the rejected bucket. | 9 Production; 10 Panels & Pieces |
| HLR-13 | The system shall register job-work and contractor bills with lines, additions/deductions, GST codes, and bill-pass (PassFlg) withholding TDS at bill level, honoring doublebillpassreqd. | 12 Commercial |
| HLR-14 | The system shall raise sales invoices by attaching existing DCs with commodity-group number prefixes (Mas_SalesGrp) and carton packing on the _Pcs variant. | 12 Commercial |
| HLR-15 | The system shall compute GST from the HSN master (or line override) as CGST+SGST intra-state vs IGST inter-state from party vs exporter state, on bills and invoices. | 12 Commercial; 17 Masters (HSN) |
| HLR-16 | The system shall issue debit notes by commodity family linked to passed bills (Brnid), converting FCY debits at the PO exchange rate. | 12 Commercial |
| HLR-17 | The system shall maintain the payments register (including _Wages) and order payment transfers that move wage cost when pieces are diverted between orders. | 12 Commercial |
| HLR-18 | The system shall present party balances in all three views -- absolute document-wise, program-wise per order/process/item, and value at cumulative rate (PartyOutQry parity) -- plus unbilled accrual valuing uninvoiced GRN lines at PO-else-budget rate per order. | 12 Commercial |
| HLR-19 | The system shall compute cumulative rate per kg/pc through the process chain in Sno order (yarn + all conversion costs + accessories loaded per pc) via an engine verified against the root trigger. | 13 Costing & P&L; 3 Planning & Program |
| HLR-20 | The system shall produce budget-vs-actual per order across yarn/fabric/accessory/process legs with the tax-in-P&L toggle and grpref buyer-PO consolidation (SP_Bud_and_Actual parity). | 13 Costing & P&L |
| HLR-21 | The system shall produce daily unit P&L per factory/day/order/stage at budget rates with actual wages/bills and overheads allocated pro-rata by wages (Sp_DailyUnitPANDL parity). | 13 Costing & P&L |
| HLR-22 | The system shall provide the quick-costing cube at four expense levels (company/dept/line/order-style) persisted to ST_Cost_* tables. | 13 Costing & P&L |
| HLR-23 | The system shall maintain WBS/T&A plan-vs-actual dates with RAG colors and finish % vs order and cut-plan qty, skipping weekly-offs and government holidays in date math. | 3 Planning & Program; 1 Dashboard & MIS |
| HLR-24 | The system shall produce MIS dashboards, the order-status WIP pipeline (Knit/Heat/Wash/Comp kgs per order), and daily meeting packs (Meet* family parity). | 1 Dashboard & MIS |
| HLR-25 | The system shall provide ~40 master CRUD screens with legacy duplicate and referential validations (party, mill, count, fabric, accessory, style, buyer, HSN, dept, rate UOM, and the rest). | 17 Masters |
| HLR-26 | The system shall enforce user/group menu and company rights server-side on every API route and render navigation and actions from the same rights matrix. | 18 Administration |
| HLR-27 | The system shall serve all 189 legacy feature flags verbatim as per-company runtime config honored at the same code points (tolerances, approvals, document policy, module switches) plus Part-3 additions default-OFF. | 18 Administration |
| HLR-28 | The system shall allocate all document numbers through one NumberingService with legacy prefixes and finyear semantics, gap-free and duplicate-safe under concurrent saves. | All -- cross-cutting platform (R01) |
| HLR-29 | The system shall render the ~330 legacy report templates with identical columns, parameters, filters, and totals via an async report job runner with jobId staging (no Temp_*/GUID collisions). | 16 Reports |
| HLR-30 | The system shall print every document and label with preprint-overlay support (stationery-aware layouts) matching legacy print and preprint output, including Form JJ when formjjreq is on. | 16 Reports |
| HLR-31 | The system shall sync ST_*/WBS_* aggregates to the Commando mobile layer via UpdateFlg/server_id outbox, exposing dashboard, approvals, entries, scan (+ history), and settings screens. | 19 Mobile (Commando) |
| HLR-32 | The system shall gate flagged documents on the approval workflow -- PO, lot, rate confirmation, shortage, reprocess, acc item, non-return DC, budget -- with mobile approval per commando_approval_link. | 15 Approvals (Workflow); 19 Mobile (Commando) |
| HLR-33 | The system shall model every trackable entity as a TrackUnit with a signed QR code (GS1-Digital-Link external, compact internal), TrackEdge genealogy (SPLIT/MERGE/TRANSFORM with quantity shares), and TrackEvents emitted by the PostingEngine itself. | 21 QR Tracking (addition) |
| HLR-34 | The system shall enforce the genealogy quantity law in the same posting transaction -- sum of child shareQty <= parent qty within tolerance-catalog limits, merges = output +/- process loss -- blocking violations with legacy-style messages. | 21 QR Tracking (addition) |
| HLR-35 | The system shall expose the order river (Req -> Knit -> Dye -> Cut -> Stitch -> Pack -> Despatch) with RAG per stage and value columns (qty x cumulative rate per stage), the genealogy DAG, item passports, a scan-anything console, and reconciliation exceptions. | 21 QR Tracking (addition) |
| HLR-36 | The system shall let tracking granularity vary per order/part/stage via TrackPolicy (yarn bag / roll / bundle / piece, mixable within one order) and log every label print, reprint, and void in TrackLabelLog, with backfill of in-flight orders. | 21 QR Tracking (addition) |
| HLR-37 | The system shall provide AI skills 1-15 (buyer-PO, supplier-bill, challan-to-GRN, mill-invoice, DC draft, rate-cnf, acc parse, invoice/e-way assist, debit assist, status Q&A, exception briefing, report narrator, meeting brief, scan-help, approval triage) as drafts of the same zod DTOs confirmed on ParseReviewScreen. | 22 AI Harness (addition) |
| HLR-38 | The system shall provide Tamil-first voice operation with Indic-tuned STT, context biasing from masters, Tanglish handling, a digit-by-digit numeric confirmation loop before any number posts, and Tamil TTS read-back. | 22 AI Harness (addition) |
| HLR-39 | The system shall run AI under eval gates (golden sets, field-level scoring, shadow mode before enable, CI no-regression on prompt/model changes) with per-skill kill switches, full AiActionLog audit, and per-tenant cost governance. | 22 AI Harness (addition) |
| HLR-40 | The system shall integrate outbound mail and SMS notifications, weigh-scale capture, Tally export hand-off, e-way bill fields on DCs, and barcode/label printers. | 20 Integrations |
| HLR-41 | The system shall manage QC & lab test masters (parameters, input parameters, stages) and capture lab test results per lot and stage with the QC register and mobile inspection parity (R06 QC-001..005). | 11 QC & Lab |
| HLR-42 | The system shall create and manage the procurement PO family (yarn, fabric, accessory, multi-order, multi-style) with tolerance checks and approval gating before a PO becomes effective (R03 PRC-001..). | 4 Procurement |
| HLR-43 | The system shall record cutting production with CutPlan-vs-order excess checks, bundle and barcode generation in one transaction, and bit-cut consumption at bit-cut rates (R05 CUT-001..008). | 8 Cutting |

## 5. Non-functional requirements

| ID | Requirement |
|---|---|
| NFR-01 | The system shall execute every document action as one database transaction; a mid-action failure shall leave zero partial stock, balance, sync, or genealogy rows. |
| NFR-02 | The system shall match legacy proc/report outputs on golden datasets for every ported pipeline (compared row-by-row where legacy is runnable, else vs the LLD movement matrix). |
| NFR-03 | The system shall keep scan stations functional offline by validating against a cached order/stage whitelist plus HMAC key version, and replaying queued scans in order with full validation on reconnect. |
| NFR-04 | The system shall render registers and report results with p95 latency under 2 seconds on the reference dataset. |
| NFR-05 | The system shall acknowledge barcode/QR scans at the station in under 300 ms p95. |
| NFR-06 | The system shall render the tracking order river (including value columns) in under 3 seconds for a single order. |
| NFR-07 | The system shall present all UI, AI, and voice surfaces in Tamil by default with English/Tanglish toggle, all copy in a versioned i18n bundle. |
| NFR-08 | The system shall hold no credentials in code (no sa accounts); all secrets come from environment or secret storage. |
| NFR-09 | The system shall enforce rights and flags server-side on every endpoint; client-side hiding is cosmetic only. |
| NFR-10 | The system shall sign every QR label with HMAC (key-versioned), reject forged or superseded labels, and make labels revocable. |
| NFR-11 | The system shall default every AI skill OFF with per-skill and global kill switches; a provider outage degrades to capture-only and never blocks manual entry. |
| NFR-12 | The system shall audit AI actions (AiActionLog: model, prompt version, extraction, corrections, result) and the label lifecycle (TrackLabelLog) sufficiently to resolve disputes. |
| NFR-13 | The system shall retain SQL Server as the datastore with the legacy schema unaltered; new tables (Track*, ReportJob, AiActionLog, MasterAlias) are additive only. |
| NFR-14 | The system shall support concurrent multi-user operation: gap-free numbering under contention, idempotent sync replay, and per-job report staging. |
| NFR-15 | The system shall keep user-visible legacy message strings verbatim and provide keyboard-first grids and mobile parity so existing users need no retraining for core flows. |

## 6. Constraints & environment

1. **Legacy schema retained:** no legacy table is altered or dropped; migrations create additive tables
   only (TrackUnit/TrackEdge/TrackEvent/TrackLabelLog/TrackPolicy, ReportJob, AiActionLog, MasterAlias).
2. **Procs as compatibility contract:** the extracted live proc bodies (Sp_currentstock, the trigger
   recompute logic, report procs) are the parity reference; rules move to exactly one home
   (PostingEngine / Projectors / zod + services / NumberingService) while outputs must not change.
3. **Legacy folders read-only:** the analysis and legacy SQL/report folders are reference-only; all new
   code lives in the fresh app repo created beside the docs.
4. **Flags are runtime config:** all 189 names verbatim per company; this customer's stored defaults are
   never hard-coded into the application.
5. **Dead code is not ported; live defects are fixed by design** unless the defect register (LLD 11)
   marks a row as needing business sign-off.
6. **Additions stay additive:** tracking events are emitted by the same PostingEngine and AI drafts post
   through the same services with the same rights; both carry their own flag sets, default OFF.
7. **Environment:** Next.js + TypeScript application over the existing SQL Server; Commando mobile
   surfaces consume the same API; scan stations may run offline-first with replay.
8. **Docs move with code:** any behavior change updates the owning LLD doc in the same change.

## 7. Success criteria

1. **Parallel-run month parity:** one full finyear month run in parallel with legacy; registers, stock
   ledgers, balances, and report totals reconcile with zero unexplained differences.
2. **Gates green:** standing gates G1 (mid-failure transaction atomicity test), G2 (golden-set parity),
   G3 (reversal restores exact prior state), G4 (docs synced in same PR), G5 (rights- and flag-gated
   screens) pass for every delivered stage.
3. **AI eval thresholds before enable:** each AI skill is enabled only after shadow-mode golden-set
   scores meet its field-level threshold with no CI regression; kill switches are exercised in tests.
4. **Tracking reconciliation:** after TraceProjector cutover, reconciliation exceptions (trace vs ledger
   mismatches, missing scans) stay under 1% of daily events within the tolerance catalog.
5. **Performance budgets met:** NFR-04 through NFR-06 hold on the reference dataset at production
   concurrency during the hardening stage.
6. **Cutover readiness:** migration, parallel-run comparison pack, security pass (secrets, rights
   matrix, AI kill switches), and the cutover runbook are complete and signed off.

## 8. Out of scope (parity non-goals, per 00-OVERVIEW)

1. No PF/ESI/ESIC statutory payroll processing -- legacy wages are production-cost wages only.
2. No buyer portal or buyer EDI; no freight-forwarder EDI.
3. No fabric CAD or marker planning.
4. No new business features beyond the two additions (QR tracking, AI harness).
5. No change to document type semantics, numbering, or tolerance defaults.
6. No redefinition of Piece/Panel/Bit, Good/'M' buckets, absolute vs program balances, or cumulative
   rate mechanics.
