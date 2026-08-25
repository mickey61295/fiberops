# R08 - QR Tracking, AI Harness, Mobile Commando, Approvals & Reporting

## 1. Purpose & business context

R08 bundles the traceability fabric, the AI harness, and the three shared delivery
surfaces that carry them. Tracking unifies every trackable physical entity (bag ->
roll -> lot -> lay -> bundle -> piece -> carton -> despatch) into one TrackUnit
register with a signed QR code each, linked by a genealogy DAG, fed by TrackEvents
emitted from the existing PostingEngine - tracking is a by-product of postings,
never a parallel data-entry path. The AI harness ("Joms Sahayak") drafts, humans
confirm, the existing engine posts: every AI output is a draft of the same zod DTO
the manual screen uses, reviewed on ParseReviewScreen with Tamil-first, numeric
confirm UX. Mobile Commando, the typed approvals module, and the report engine are
the surfaces that carry tracking and AI to the floor, the manager, and the owner.

## 2. Scope (legacy forms/screens in)

- QR tracking (08 ALL): new tables TrackUnit/TrackEdge/TrackEvent/TrackLabelLog/
  TrackPolicy; node types YARN_BAG/FAB_ROLL/DYE_LOT/CUT_LAY/BUNDLE/PIECE/CARTON/
  DESPATCH_DOC; genealogy splits/merges and the quantity law; signed codes
  (internal compact + GS1 Digital Link external); label service and sizes;
  granularity policy per order/part/stage; TraceProjector reconciliation; order
  river with value columns (qty x cumulative rate); scan-anything; exceptions;
  migration phases 1-3. Screens: 06 sec. L; routes 02 sec. 23.
- AI harness (09 ALL): capture/perception/extraction/resolution/review/action/
  assist/learning layers; the 15-skill catalog; ParseReviewScreen; MasterMatch +
  MasterAlias; Tamil voice stack (Indic STT + numeric confirm); eval harness with
  golden sets, CI gates, shadow mode; kill switches; on-prem option; rollout order.
  Screens: 06 sec. M; routes 02 sec. 24; admin under /admin/ai.
- Mobile Commando (05 sec. 3; 02 sec. 20; 06 sec. K): all /m screens incl. the new
  /m/track and /m/ai; sync pull/ack; offline scan queue with idempotency.
- Approvals (02 sec. 16; 05 sec. 4; 06 sec. J): typed queues incl.
  commando_approval_link; Frm_AppMas routing config.
- Reporting engine (02 sec. 17; 05 sec. 7; 07 Part 1): catalog families, jobId
  staging, print/preprint overlays, Excel export, narrator hooks; new families from
  07 sec. 1.3 (Tracking, QR labels, AI ops).
- Augmented legacy screens (06 sec. N): AiDock on every document wizard; QR label
  print at cutting; QR decode at scan stations; FAB_ROLL creation at GRN; CARTON at
  packing; gate-pass scan-out; track link on order detail.
- Out of scope: the posting matrix itself and scan validations (03/production
  module), budget/costing math (R07), mail/SMS plumbing details (integrations).

## 3. Functional requirements

Priority key: P1/P2 = committed module fabric (tracking is module 21 P1 S7; AI is
module 22 P2 S8; mobile/approvals/reports P1). P3 = addition behind a Part-3 flag
that defaults OFF (07 Part 3) - behavior unchanged until a tenant opts in.

| FR ID | Requirement (testable "shall") | Source | Priority | Stage |
|---|---|---|---|---|
| TRK-001 | The system shall maintain one TrackUnit register for all trackable entities with types YARN_BAG, FAB_ROLL, DYE_LOT (group node), CUT_LAY, BUNDLE, PIECE, CARTON, DESPATCH_DOC, in new additive-only tables, gated by qr_track_enabled. | 08 sec. 2; 07 sec. 3.1 | P1 | S7 |
| TRK-002 | The system shall create units at the documented points: purchase GRN -> YARN_BAG (flag-gated), fabric GRN/mill receipt -> FAB_ROLL, dyed GRN -> DYE_LOT, cutting production -> CUT_LAY + BUNDLE (+PIECE per policy), packing list -> CARTON, sales DC/gate pass -> DESPATCH_DOC edges. | 08 sec. 2, sec. 5; 03 sec. 10 | P1 | S7 |
| TRK-003 | The system shall reference legacy anchors via legacyRef (CurrentStock_RollDtl, Pay_CuttProd_Bundle, Pay_BundlePcs_Barcode, Trs_Grn2) and shall not alter them; Pay_BundlePcs_Barcode.Pcs_Status stays authoritative for payroll. | 08 sec. 2; 03 sec. 10 | P0 | S7 |
| TRK-004 | The system shall emit a TrackEvent from every posting the PostingEngine performs (DC, GRN, production entry, transfer, rejection, packing, gate) as a by-product of the existing wiring, with no parallel data-entry path. | 08 sec. 1, sec. 5; 03 sec. 10 | P1 | S7 |
| TRK-005 | The system shall maintain unit owner (GODOWN, PARTY, LINE, UNIT, BUYER - "where is it now") and change it on DC out/in, transfers, line issue, and gate pass, in the same transaction as the posting. | 08 sec. 2, sec. 5; 03 sec. 10 | P1 | S7 |
| TRK-006 | The system shall maintain unit status ACTIVE, CONSUMED, REJECTED, REWORK, SHIPPED, RETIRED driven by events, with PIECE status flips U/G/R at scan stations preserving payroll parity. | 08 sec. 2, sec. 5 | P1 | S7 |
| TRK-007 | The system shall stamp every TrackEvent with trackId, eventType, docRef, partyId/godId/stageId where bound, ts, userId, stationId, and mode QR, 1D, or MANUAL. | 08 sec. 2 | P1 | S7 |
| TRK-008 | The system shall invert events and edges in the same compensating transaction on document reversal so genealogy stays exact by construction. | 08 sec. 5; 03 sec. 3, sec. 10 | P1 | S7 |
| TRK-009 | The system shall accept optional trackIds on every Movement and, for movements carrying them, upsert TrackUnit owner/status, insert TrackEvent, and run the quantity-law check inside PostingEngine.apply. | 03 sec. 10 | P1 | S7 |
| TRK-010 | The system shall resolve any 1D/QR code via POST /api/tracking/resolve {code, offlineSig} to its unit plus context (scan-anything), validating the offline HMAC signature when presented. | 04 sec. 12; 08 sec. 6 | P1 | S7 |
| TRK-011 | The system shall accept generic scans via POST /api/tracking/scan {code, stationCtx} routing into scan.* endpoints when stage-bound, and shall receive codes only - never images - for scans. | 04 sec. 12; 08 sec. 9 | P1 | S7 |
| TRK-012 | The system shall serve the order river via GET /api/tracking/:io/river as the funnel Req -> Knit -> Dye -> Cut -> Stitch -> Pack -> Despatch with quantities tied to Vue_Reqd_Vs_Finish/ST_Production_Data and RAG per stage. | 04 sec. 12; 08 sec. 6 | P1 | S7 |
| TRK-013 | The system shall show value columns per river stage computed as qty x cumulative rate (StockRatePost.cumbillrate / PcsStockRatePost) so money invested is visible at each node, matching party-outstanding valuation. | 08 sec. 6; 03 sec. 4.5 | P1 | S7 |
| TRK-014 | The system shall run the TraceProjector to rebuild per-order/stage trace aggregates from TrackEvent/TrackEdge and reconcile them against CurrentStock, Pcs_/Panel_StockTable, ST_Production_Data, and Vue_Reqd_Vs_Finish, emitting trace.mismatch on deltas. | 05 sec. 2; 08 sec. 1 | P1 | S7 |
| TRK-015 | The system shall surface reconciliation mismatches, missing scans, aging at parties (joined to non-return-DC aging), and voided-label attempts at /tracking/exceptions via GET /api/tracking/exceptions, and shall notify on trace mismatch, unit stuck at party beyond aging, and voided-label scan attempt. | 08 sec. 6; 05 sec. 5 | P1 | S7 |
| TRK-016 | The system shall serve the item passport via GET /api/tracking/unit/:trackId and /timeline showing identity, full event timeline, ancestors/descendants, QC results, and wage postings (bundle). | 04 sec. 12; 08 sec. 6 | P1 | S7 |
| TRK-017 | The system shall provide GET/POST /api/tracking/policy and the /tracking/policy editor for TrackPolicy per order/part/stage, with per-cutting-job edits and supervisor right tracking.policy.override. | 04 sec. 12; 08 sec. 7 | P1 | S7 |
| TRK-018 | The system shall default TrackPolicy from flags (yarnBag off, fabRoll auto, bundle always, piece BY_PART_STAGE matrix, carton on) and shall allow one order to mix granularities (piece-level body, bundle-level trims), set at order/program creation and overridable per bundle generation. | 08 sec. 7; 07 sec. 3.1 | P1 | S7 |
| TRK-019 | The system shall let offline stations validate scans against a cached (ordId, lotId, stageId) whitelist plus HMAC key version, queue locally, and resolve documents when online, within qr_offline_window_hrs (default 12). | 08 sec. 3; 07 sec. 3.1; 05 sec. 3 | P1 | S7 |
| TRK-020 | The system shall decode existing 1D barcodes (Pay_BarcodeGeneration) and new QR codes in the same ScanConsole, funneling both into the same POST /api/scan/* endpoints so legacy printed stock keeps working during migration. | 08 sec. 3; 05 sec. 6 | P1 | S7 |
| TRK-021 | The system shall carry UpdateFlg/server_id on TrackUnit/TrackEdge/TrackEvent and sync them to mobile exactly like ST_* rows via pull/ack. | 08 sec. 2; 05 sec. 2, sec. 3 | P1 | S7 |
| TRK-022 | The system shall partition TrackEvent by finyear+month, index TrackEdge on (parentId) and (childId), scope genealogy queries to (ordId) DAG walks of max depth ~9, and cache parent remaining qty on TrackUnit updated in the posting transaction. | 08 sec. 9 | P1 | S7 |
| TRK-023 | The system shall deliver migration phase 1 (parallel): QR labels at cutting plus piece/roll mapping tables, 1D barcodes still working, and /tracking/[io] reading legacy tables directly (read-only river, no labels needed). | 08 sec. 8 | P1 | S7 |
| TRK-024 | The system shall provide the phase-2 backfill job via POST /api/tracking/backfill (rights-gated) creating TrackUnits for in-flight orders from CurrentStock_RollDtl, Pay_CuttProd_Bundle, Pay_BundlePcs_Barcode, plus a per-godown label reprint campaign. | 04 sec. 12; 08 sec. 8 | P2 | S9 |
| TRK-025 | The system shall reach phase 3 (native): PostingEngine emits TrackEvent everywhere and reconciliation exceptions become part of the daily meeting pack (cross-ref R07 MET-007). | 08 sec. 8 | P2 | S9 |
| GEN-001 | The system shall record genealogy in TrackEdge with kind SPLIT, MERGE, or TRANSFORM, shareQty, uom, and docRef (the Trs_* header id) for every parent-child relationship. | 08 sec. 2, sec. 4 | P1 | S7 |
| GEN-002 | The system shall enforce the split quantity law in the same posting transaction: for every parent, sum(child shareQty) <= parent qty within the tolerance catalog, blocking with a legacy-style message when qr_genealogy_strict is on and warning otherwise. | 08 sec. 4; 07 sec. 3.1; 03 sec. 6 | P1 | S7 |
| GEN-003 | The system shall enforce the merge law: sum of incoming shares = output qty +/- process loss per the tolerances. | 08 sec. 4 | P1 | S7 |
| GEN-004 | The system shall apply the existing tolerances dyeinggamtper, knittinggamtper, and cutting_dcjoborder_deviation to quantity-law checks (the structural fix for over-issue/over-cut through the tolerances the trade already uses). | 08 sec. 4; 03 sec. 6 | P1 | S7 |
| GEN-005 | The system shall build the full chain: YARN_BAGs MERGE -> knitting program SPLIT -> grey FAB_ROLLs; FAB_ROLLs MERGE -> DYE_LOT SPLIT -> dyed FAB_ROLLs (new identity); FAB_ROLL TRANSFORM -> compactor/heat-set roll; FAB_ROLLs(+lot) MERGE -> CUT_LAY SPLIT -> BUNDLEs (per part/size); BUNDLE SPLIT -> PIECEs; PANEL BUNDLEs MERGE -> PIECE (assembly, Trs_AddPanelAsm_SourceDtl semantics); PIECEs MERGE -> CARTON MERGE -> DESPATCH_DOC; plus side events (DC owner change, rework loop, rejection status, QC hold). | 08 sec. 4 | P1 | S7 |
| GEN-006 | The system shall create FAB_ROLL units and edges from the DC'd grey rolls on Process GRN via Trs_Del2 lineage / FrmStockID. | 08 sec. 5 | P1 | S7 |
| GEN-007 | The system shall serve GET /api/tracking/:io/genealogy?focus= as a depth-limited, paged DAG and render the explorer with zoom/pan/filter by lot, part, and size, where clicking any node opens its passport. | 04 sec. 12; 08 sec. 6; 02 sec. 23 | P1 | S7 |
| GEN-008 | The system shall cache parent remaining qty on TrackUnit and update it inside the posting transaction so the per-parent aggregate check never requires a full edge scan. | 08 sec. 9 | P1 | S7 |
| LBL-001 | The system shall render external codes in GS1 Digital Link style, https://<host>/t/01/<itemRef>/10/<lot>/21/<serial>?s=<sig8>, where 01 is the style+part+color+size composite, 10 the legacy lotno, 21 the serial, and s an HMAC-SHA256 signature truncated to 8 chars. | 08 sec. 3 | P1 | S7 |
| LBL-002 | The system shall render internal compact codes J1<B2(type)><B32(ordId|lotId|stageId|partId|serial)><CRC4><sig4> of about 35 chars for offline-first scan stations. | 08 sec. 3 | P1 | S7 |
| LBL-003 | The system shall render all QR labels via QrLabelSvg at ECC level M with version auto <= 10 for piece labels, and shall always print the human-readable serial under the code (Tamil floor practice). | 08 sec. 3 | P1 | S7 |
| LBL-004 | The system shall produce labels at the documented sizes: roll 50x25mm, bundle 40x25mm, piece 18x18mm, carton 100x50mm with an order/buyer/box-no text block. | 08 sec. 3 | P1 | S7 |
| LBL-005 | The system shall print and void labels via POST /api/tracking/labels/print and /void, recording every print/reprint with user and reason in TrackLabelLog. | 04 sec. 12; 08 sec. 3 | P1 | S7 |
| LBL-006 | The system shall keep at most one live label per unit: a superseded print is voided so two live labels for one unit cannot exist (reprint detection via the HMAC signature). | 08 sec. 3 | P1 | S7 |
| LBL-007 | The system shall provide the label designer and print queue at /tracking/labels rendering QrLabelSvg sizes. | 02 sec. 23; 06 sec. L | P1 | S7 |
| LBL-008 | The system shall honor the per-type label flags: qr_bundle_labels (Y when module on; replaces the 1D print format with the same data), qr_roll_labels (N; auto-on when all_transaction_basedon_rollno='Y'), qr_piece_labels (BY_PART_STAGE matrix), and default-off qr_carton_labels, qr_yarn_bag, qr_external_format. | 07 sec. 3.1; 08 sec. 7 | P1 | S7 |
| AI-001 | The system shall give AI no separate write path: every AI output becomes a draft of the same zod DTO the manual screen uses, confirmed via review, posting through the same 04 endpoints with the user's rights and all flags/tolerances/approvals intact. | 09 sec. 1, sec. 2; 04 sec. 13 | P0 | S8 |
| AI-002 | The system shall ingest captures via POST /api/ai/capture (multipart photo/file/voice/email-eml) into doc classify + OCR -> draft task queue, supporting capture-now/parse-later when offline. | 04 sec. 13; 09 sec. 1, sec. 2 | P2 | S8 |
| AI-003 | The system shall run the perception layer: DocClassifier for doc type, OCR for Tamil+English printed text with handwriting assistance, table/region detection, and rotation/cleanup. | 09 sec. 2 | P2 | S8 |
| AI-004 | The system shall extract via the LLM Gateway as JSON-schema-constrained output mapped 1:1 to the app's zod DTOs (PoCreateDto, GrnCreateDto, BillCreateDto, RateCnfDto, InvoiceDto, DebitDto, PackingLineDto) with per-field confidence and source bounding boxes. | 09 sec. 2 | P2 | S8 |
| AI-005 | The system shall show per-field confidence as green (>= 0.9 auto-filled), amber (needs check), and red (must enter), and shall never block on low confidence - defaulting to manual entry with the image side-by-side. | 09 sec. 1 | P2 | S8 |
| AI-006 | The system shall provide ParseReviewScreen with SourcePane (image, zoom, highlighted boxes, tap field <-> box), FieldsPane (Tamil labels, value chips), GridPreview (size/color matrix like the manual order-sheet grid), VoiceHelp, and ActionBar [Confirm & Post] [Save Draft] [Correct] [Reject] feeding learning. | 09 sec. 4; 02 sec. 21 | P2 | S8 |
| AI-007 | The system shall provide NumericConfirm with big digits, Tamil voice readback, and re-speak/enter for every quantity and rate. | 09 sec. 2, sec. 4 | P2 | S8 |
| AI-008 | The system shall resolve masters via MasterMatch: embeddings over Mas_Party/Mill/Count/Fabric/Acc/Style/Buyer plus the MasterAlias table and an abbreviation dictionary (Tirupur trade shorthand: "30s combed", "2x2 rib", party pet names), surfacing fuzzy matches as MasterChip with a warning that opens the legacy picker. | 09 sec. 2, sec. 6 | P2 | S8 |
| AI-009 | The system shall provide MatchPanel for bills: 3-way PO vs GRN vs invoice line diff with tolerance flags (po_buddev et al). | 09 sec. 4 | P2 | S8 |
| AI-010 | The system shall serve the review queue via GET /api/ai/inbox?state=&type= and GET /api/ai/drafts/:id (confidence + boxes), confirm via POST /api/ai/drafts/:id/confirm (maps draft -> form DTO then calls the same 04 endpoints), and correct via /correct into the learning store. | 04 sec. 13; 09 sec. 2 | P2 | S8 |
| AI-011 | The system shall provide AiDock (floating fill-from photo/email/voice action) on every form, opening ParseReviewScreen bound to that form's DTO via POST /api/ai/prefill/:form. | 09 sec. 2, sec. 8; 04 sec. 13; 06 sec. N | P2 | S8 |
| AI-012 | The system shall provide the assistant via POST /api/ai/assistant {text|voice}: intent -> skill routing, read answers grounded on APIs, write intents opening prefilled wizards, with answers cached 60s per question class. | 04 sec. 13; 09 sec. 2, sec. 9 | P2 | S8 |
| AI-013 | The system shall use Indic-tuned STT models (AI4Bharat IndicWhisper lineage) with constrained grammars/context biasing from masters for entity-heavy utterances (party names, counts, kgs) and code-switch (Tanglish) handling, instead of stock Whisper. | 09 sec. 5 | P2 | S8 |
| AI-014 | The system shall provide Tamil TTS readback and UI language ta (default) / en / tanglish labels from a versioned i18n bundle tunable per customer. | 09 sec. 5 | P2 | S8 |
| AI-015 | The system shall provide a provider-agnostic LLM Gateway (cloud + on-prem vLLM) with per-skill model routing (small/cheap for classify and extract-simple; large for grids and reasoning), retries, timeout, and cost meter per tenant/user. | 09 sec. 6 | P2 | S8 |
| AI-016 | The system shall keep a versioned prompt registry per skill with per-doc-type few-shot examples from the customer's own corrected history, deployable only through the eval gate. | 09 sec. 6 | P2 | S8 |
| AI-017 | The system shall perform JSON-schema/tool-constrained generation with retry-with-repair on schema violations and deterministic post-processing (dates -> finyear, qty normalization, UOM mapping). | 09 sec. 6 | P2 | S8 |
| AI-018 | The system shall record who/what/model/promptVersion/extracted/corrected/result-link in AiActionLog, viewable in admin for trust and dispute resolution. | 09 sec. 6 | P2 | S8 |
| AI-019 | The system shall operate the learning store: AiCorrection rows -> golden set builder -> weekly eval report, with alias auto-suggestion after N consistent corrections. | 09 sec. 6 | P2 | S8 |
| AI-020 | The system shall govern cost: per-tenant budgets, cache on identical document hash -> cached extraction, and offline queue compression. | 09 sec. 6 | P2 | S8 |
| AI-021 | The system shall maintain golden datasets per skill seeded from the customer's real documents plus synthetic Tamil variants, scored field-level (exact / value-tolerance for numerics, F1 for entities). | 09 sec. 7 | P2 | S8 |
| AI-022 | The system shall gate releases in CI: a prompt/model change ships only if golden scores do not regress. | 09 sec. 7 | P2 | S8 |
| AI-023 | The system shall support shadow mode: parse live documents, compare to human entries, and report would-be accuracy before enabling suggestions. | 09 sec. 7 | P2 | S8 |
| AI-024 | The system shall provide kill switches: per-skill enable flags plus global ai_enabled; provider outage degrades to capture-only mode; manual entry is never blocked (AI never on the critical path). | 09 sec. 7; 07 sec. 3.2 | P2 | S8 |
| AI-025 | The system shall protect data: tenant data stays in-region or on-prem per config, buyer price data is masked from lower-right users, images retained per ai_retention_days (default 90), and no training on tenant data without explicit opt-in. | 09 sec. 7; 07 sec. 3.2 | P2 | S8 |
| AI-026 | The system shall produce the daily Tamil exception briefing via GET /api/ai/digest: non-return DCs, loss > dyeinggamtper, WBS red stages, approvals pending, reconciliation mismatches. | 04 sec. 13; 09 sec. 3 (skill 11) | P3 | S8 |
| AI-027 | The system shall emit ai.doc.classified, ai.draft.created, ai.draft.confirmed, ai.draft.corrected, and ai.digest.sent, and sync review-queue items to mobile like approvals through the same outbox. | 05 sec. 1, 09 sec. 9 | P2 | S8 |
| AI-028 | The system shall follow the risk-ascending rollout: (1) read-only status Q&A + digests + narrator; (2) bounded writes bill & GRN parsing with review; (3) order sheet parsing (grids) after golden set >= threshold; (4) voice DC/entry drafting, scan-help, approval triage; (5) optional per-tenant autoconfirm. | 09 sec. 10 | P2 | S8 |
| AI-029 | The system shall support ai_autoconfirm only for non-financial, single-line documents with confidence >= 0.98, default OFF, requiring explicit tenant opt-in. | 09 sec. 10; 07 sec. 3.2 | P3 | S8 |
| AI-030 | The system shall provide the /admin/ai console: models/keys/providers, prompt versions, golden-set manager, cost & correction dashboards, and kill switches. | 09 sec. 8; 02 sec. 24 | P2 | S8 |
| AI-031 | The system shall implement skill 1 (buyer PO parse, flag ai_po_parse): PO email/PDF/Excel/photo -> complete OrderSheet draft (buyer, styles, EntryOption 1/2 color/size grid, qty, rates, FCY, delivery dates, excess suggestion vs CutPlanQty norms) -> POST /api/orders after confirm. | 09 sec. 3 | P3 | S8 |
| AI-032 | The system shall implement skill 2 (supplier bill parse, flag ai_bill_parse): job-worker/supplier invoice photo -> bill draft with lines (kgs/mtr/rls, rate, GST%), 3-way match vs PO & GRN, TDS preview -> POST /api/commercial/bills. | 09 sec. 3 | P3 | S8 |
| AI-033 | The system shall implement skills 3-4 (challan -> GRN and mill invoice -> yarn GRN, flag ai_grn_parse): handwritten/printed party DC photo -> 'Process' GRN draft with roll detail matched to our DC (OurDCID) and loss % vs DC; mill invoice -> 'Purchase' GRN draft by count/color/bags -> POST /api/grn. | 09 sec. 3 | P3 | S8 |
| AI-034 | The system shall implement skill 5 (DC draft by voice, flag ai_voice_entry): utterances like "Anand dyeing ku 300 kg podu" -> fabric DC wizard prefilled (party resolved, stock picker open) -> POST /api/dc/fabric. | 09 sec. 3 | P3 | S8 |
| AI-035 | The system shall implement skills 6-7 (rate confirmation parse ai_ratecnf_parse, accessories parse ai_acc_parse): quotation mail/WhatsApp image -> Pro_RateCnfPcs draft per stage/part via the rate-confirm API; trim PO/invoice -> acc lines with Multiple_Factor checks via acc PO/GRN APIs. | 09 sec. 3 | P3 | S8 |
| AI-036 | The system shall implement skills 8-9 (invoice/e-way assist ai_invoice_draft, debit-note assist ai_debit_assist): sales invoice draft from despatch set with HSN lookup and GST split preview via invoice APIs; loss/shrinkage evidence -> suggested debit lines with rate sources (PO/budget) via the debit API. | 09 sec. 3 | P3 | S8 |
| AI-037 | The system shall implement skill 10 (status Q&A, read-only): questions like "Anand dyeing edathula evlo kg irukku?" -> party outstanding + aging answer in Tamil sourced from PartyOutQry/balances via read APIs only. | 09 sec. 3 | P3 | S8 |
| AI-038 | The system shall implement skills 12-13 (report narrator and meeting pack brief, flag ai_narrator): any register -> 5-line Tamil summary + top exceptions (narrator hook on /reports/*); Meet* datasets narrated for the morning meeting. | 09 sec. 3; 06 sec. N | P3 | S8 |
| AI-039 | The system shall implement skills 14-15 (scan-help and approval triage, flag ai_triage_approvals): photo of a torn/partial label -> fuzzy TrackUnit resolve with confirmation via tracking APIs; approval inbox summarizer showing why pending, deviation vs tolerance, and a recommendation that never auto-decides. | 09 sec. 3; 06 sec. N | P3 | S8 |
| MOB-001 | The system shall provide the Commando app under (mobile)/m with MobileShell bottom tabs Dashboard, Scan, Orders, Approvals, More, and /m/login carrying the Cust_Code context. | 02 sec. 20; 06 sec. K | P1 | S2+ |
| MOB-002 | The system shall sync via GET /api/sync/pull?since= returning UpdateFlg=1 rows per table + cursor, and POST /api/sync/ack clearing flags and stamping server_id (legacy protocol parity). | 05 sec. 3; 04 sec. 11 | P1 | S2+ |
| MOB-003 | The system shall push mobile-created entries (production/stage/GRN/rejection/scan) through the same services as desktop - one code path. | 05 sec. 3 | P1 | S2+ |
| MOB-004 | The system shall queue scans locally while offline and replay them on reconnect in order with idempotency keys (scan token) to prevent double posting, and shall provide the scan-history screen. | 05 sec. 3, sec. 8; 02 sec. 20 | P1 | S2+ |
| MOB-005 | The system shall provide /m/dashboard KPIs from ST_* reads and /m/notifications as the notification center (incl. the AI digest when ai_digest is on). | 02 sec. 20; 05 sec. 5 | P1 | S2+ |
| MOB-006 | The system shall provide /m/approvals inbox, [type] queues, and detail with PO filter parity, tied to desktop decisions via commando_approval_link with SSE refresh of both. | 02 sec. 16, sec. 20; 05 sec. 4; 06 sec. K | P1 | S3+ |
| MOB-007 | The system shall provide /m/orders list and detail (status, WBS RAG) with the track link to the order river. | 02 sec. 20; 06 sec. K | P1 | S2+ |
| MOB-008 | The system shall provide mobile entry parity for production-entry, stage-entry, grn-entry (with AiDock challan photo -> draft), and rejection-entry. | 02 sec. 20; 06 sec. K, sec. N | P1 | S2+ |
| MOB-009 | The system shall provide mobile stock-transfer and unit-transfer parity. | 02 sec. 20; 06 sec. K | P1 | S2+ |
| MOB-010 | The system shall provide mobile gate-pass with carton/piece QR scan-out (closing the loop to DESPATCH_DOC) and process-dc parity. | 02 sec. 20; 08 sec. 5; 06 sec. K | P1 | S2+ |
| MOB-011 | The system shall provide mobile qc-inspection (with breakdown report link) and machine breakdown entry raising the maintenance notification. | 02 sec. 20; 05 sec. 1; 06 sec. K | P1 | S2+ |
| MOB-012 | The system shall provide mobile lookups: stock-ledger, quick-costing, bill-lookup, and party-balance parity. | 02 sec. 20; 06 sec. K | P1 | S2+ |
| MOB-013 | The system shall provide the new mobile surfaces /m/track (scan-anything + item passport) and /m/ai (snap -> draft, voice Q&A, approvals brief), plus /m/settings with language ta/en. | 08 sec. 6; 09 sec. 8; 06 sec. K | P1 | S7/S8 |
| APR-001 | The system shall provide the approvals inbox (my-pending by type, approvalsflg-gated) via GET /api/approvals?state=pending&type=, at /approvals and /m/approvals with mobile parity. | 02 sec. 16; 04 sec. 10 | P1 | S3+ |
| APR-002 | The system shall provide typed queues at /approvals/[type]: po, budget, lot, rate, shortage, reprocess, non-return-dc, acc-item, and aw-bill. | 02 sec. 16 | P1 | S3+ |
| APR-003 | The system shall provide approval routing config from the Frm_AppMas port (approver matrix per type x dept x amount band) at /approvals/masters, rights-gated. | 02 sec. 16; 05 sec. 4 | P1 | S3+ |
| APR-004 | The system shall hold documents at Draft until approved for blocking flags (po_approval_reqd, bud_app, lot_approval, shortage_approval, acc_item_approval_reqd_for_accissue) and shall list non-blocking types as tasks only. | 05 sec. 4; 07 sec. 2.3 | P1 | S3+ |
| APR-005 | The system shall record decisions via POST /api/approvals/:id/approve|reject calling the same service action the desktop form performs (approve rate -> Pro_RateCnfPcs2.Approved=1; approve style change -> OrderService.styleChange()). | 04 sec. 10; 05 sec. 4 | P1 | S3+ |
| APR-006 | The system shall tie desktop decisions to mobile inbox state via commando_approval_link and refresh both over SSE, with the shell ApprovalBadge showing the pending count. | 02 sec. 1, sec. 16; 05 sec. 4 | P1 | S3+ |
| APR-007 | The system shall create approval tasks from events: po.created (po_approval_reqd), lot pending approval, shortage.booked, non-return DC aging, reprocess requests, and acc-item issues per 05 sec. 1/4/5. | 05 sec. 1, sec. 4, sec. 5 | P1 | S3+ |
| RPT-001 | The system shall provide the /reports catalog organized by family (07 Part 1) with favorites and per-user default parameters (FrmMISSetting). | 02 sec. 17; 07 sec. 1.2 | P1 | S2+ |
| RPT-002 | The system shall provide the generic runner at /reports/[reportId] with ReportFilterPanel carrying the legacy parameter sets (dates, party, order, dept, coy). | 02 sec. 17 | P1 | S2+ |
| RPT-003 | The system shall stage report runs into ReportJobRows(jobId, slno, cols...) replacing Temp_*/IP-keyed tables: POST /api/reports/:id/run -> jobId; GET /api/reports/jobs/:jobId -> paged rows + totals. | 05 sec. 7; 04 sec. 10 | P1 | S2+ |
| RPT-004 | The system shall render results in ReportViewer as a paginated grid with client-side sort/group (FlexGrid parity). | 02 sec. 17 | P1 | S2+ |
| RPT-005 | The system shall print via PrintLayout with preprint overlay templates (preprintfolder 72/298) and serve document prints (DC/GRN/Invoice/PackingList/Labels) at /reports/viewer/[printId]. | 02 sec. 17; 07 sec. 1.1, Part 2 | P1 | S2+ |
| RPT-006 | The system shall export any register to Excel/CSV with Interop.Excel parity via the ExportBar. | 02 sec. 17; 07 sec. 1.2 | P1 | S2+ |
| RPT-007 | The system shall expire report jobs after a configurable lifetime, replacing manual temp cleanup (frmTblErase for report temps only). | 05 sec. 7 | P1 | S2+ |
| RPT-008 | The system shall register the Tracking report family (07 sec. 1.3): Order Trace River (stage funnel + loss reconciliation), Genealogy export (CSV/PDF), Item Passport print, Carton Manifest (buyer/audit pack, external QR), Party-Dwell aging, and Trace Exceptions register, sourced from TraceProjector/Track*. | 07 sec. 1.3 | P2 | S7 |
| RPT-009 | The system shall register the QR label templates (roll/bundle/piece/carton, QrLabelSvg sizes, signed codes) and the AI ops dashboards (parse accuracy & correction, cost/latency by skill, golden-set scorecard, assistant query log), and shall keep the 12 OLD Report templates hidden in the catalog. | 07 sec. 1.1, sec. 1.2, sec. 1.3 | P2 | S7/S8 |

## 4. Business rules & validations

| BR | Rule (flags verbatim) | Source |
|---|---|---|
| BR-01 | Split quantity law: for every parent, sum(child shareQty) <= parent qty within the tolerance catalog; enforced by PostingEngine in the same transaction. | 08 sec. 4; 03 sec. 10 |
| BR-02 | Merge quantity law: sum of incoming shares = output qty +/- process loss. | 08 sec. 4 |
| BR-03 | qr_genealogy_strict (N) selects block-on-violation instead of warn; 08 sec. 4 describes the blocking behavior with a legacy-style message - ship warn as default per the flag default, block when strict. | 08 sec. 4; 07 sec. 3.1 |
| BR-04 | Quantity-law tolerances reuse the trade's existing knobs: dyeinggamtper, knittinggamtper, cutting_dcjoborder_deviation - no new tolerance namespace. | 08 sec. 4; 03 sec. 6 |
| BR-05 | Label integrity: labels carry an HMAC; TrackLabelLog records every print/reprint with user+reason; a superseded print is voided - never two live labels per unit. | 08 sec. 3 |
| BR-06 | Offline window: stations cache the order's (ordId, lotId, stageId) whitelist + HMAC key version; scans validate and queue locally for qr_offline_window_hrs (12) hours; full doc resolution when online. | 08 sec. 3; 07 sec. 3.1 |
| BR-07 | Scan idempotency: offline scans replay in order with idempotency keys (scan token); sync conflicts resolve desktop-wins with legacy-style message + retry queue. | 05 sec. 3, sec. 8 |
| BR-08 | qr_roll_labels defaults N but auto-on when all_transaction_basedon_rollno='Y'; qr_bundle_labels defaults Y when the module is on. | 07 sec. 3.1 |
| BR-09 | qr_track_enabled (N) is the master switch for the tracking fabric (labels, events, river); all Part-3 tracking flags default OFF so behavior is unchanged until opted in. | 07 sec. 3.1 |
| BR-10 | AI drafting: AI drafts, humans confirm, the existing engine posts - no separate AI write path; rights, tolerances, approvals, and the posting matrix stay fully in charge. | 09 sec. 1 |
| BR-11 | Numeric safety: numbers are always read back and confirmed digit-by-digit; no number ever posts from raw ASR alone. | 09 sec. 1, sec. 5 |
| BR-12 | Confidence policy: green >= 0.9 auto-filled, amber needs check, red must enter; low confidence never blocks - manual entry with image side-by-side. | 09 sec. 1 |
| BR-13 | Eval gates: a prompt/model change ships only if golden scores do not regress (CI); shadow mode reports would-be accuracy before suggestions are enabled. | 09 sec. 7 |
| BR-14 | Kill switches: global ai_enabled plus per-skill flags; provider outage -> capture-only mode; manual entry is never blocked. | 09 sec. 7; 07 sec. 3.2 |
| BR-15 | ai_autoconfirm stays locked OFF unless a tenant opts in, and then only for non-financial, single-line, >= 0.98-confidence drafts. | 09 sec. 10; 07 sec. 3.2 |
| BR-16 | AI data protection: tenant data in-region or on-prem per config; buyer price data masked from lower-right users; image retention ai_retention_days (90); no training on tenant data without explicit opt-in. | 09 sec. 7 |
| BR-17 | Approvals: approvalsflg enables the inbox; commando_approval_link ties desktop and mobile; blocking flags (po_approval_reqd, bud_app, lot_approval, shortage_approval, acc_item_approval_reqd_for_accissue) hold documents Draft; non-return DC aging defaults to gendcdays (5). | 05 sec. 4, sec. 5; 07 sec. 2.2, sec. 2.3 |
| BR-18 | Report params are never invented: every catalog entry carries the extracted legacy parameter set (B4); jobs expire per configurable lifetime. | 05 sec. 7; 00 B4 |

## 5. Data & postings

New tables (additive only - no legacy table is altered):

| Table | Content | Source |
|---|---|---|
| TrackUnit | public trackId, type (8 values), ordId/styleNo + optional legacy keys, per-type serial, qty {kgs/mtr/rls/pcs}, status, owner {kind, refId}, legacyRef, audit + cached parent-remaining | 08 sec. 2, sec. 9 |
| TrackEdge | parentId, childId, kind SPLIT/MERGE/TRANSFORM, shareQty, uom, docRef | 08 sec. 2 |
| TrackEvent | trackId, eventType, docRef, partyId/godId/stageId, ts, userId, stationId, mode QR/1D/MANUAL; partitioned finyear+month | 08 sec. 2, sec. 9 |
| TrackLabelLog | every label print/reprint/void with user + reason | 08 sec. 3 |
| TrackPolicy | per order/part/stage granularity (yarnBag, fabRoll, bundle, piece BY_PART_STAGE, carton) | 08 sec. 7 |
| AiActionLog | who/what/model/promptVersion/extracted/corrected/result-link | 09 sec. 6 |
| MasterAlias | master aliases + abbreviation dictionary backing MasterMatch | 09 sec. 6 |
| AiCorrection | correction rows -> golden set builder -> weekly eval | 09 sec. 6 |
| ReportJob / ReportJobRows | jobId staging replacing Temp_*/IP-keyed tables | 05 sec. 7 |

Posting integration (03 sec. 10): Movement gains optional trackIds; apply() upserts
TrackUnit owner/status, inserts TrackEvent, checks the quantity law, and creates
units at the policy-driven points; reversals invert events and edges in the same
compensating transaction. Legacy payroll anchors are referenced, never replaced.

Events (05 sec. 1, verbatim):

- trace.unit.created/voided; trace.owner_changed (dc/grn/transfer); trace.consumed
  (cut/assembly); trace.rejected/rework; trace.shipped (carton -> despatch);
  trace.mismatch (reconciliation).
- ai.doc.classified; ai.draft.created; ai.draft.confirmed; ai.draft.corrected;
  ai.digest.sent.

Projectors: TraceProjector rebuilds per-order/stage trace aggregates from
TrackEvent/TrackEdge, reconciles against CurrentStock, Pcs_/Panel_StockTable,
ST_Production_Data, and Vue_Reqd_Vs_Finish, and emits trace.mismatch deltas to
/tracking/exceptions and the daily meeting pack; Track* rows carry UpdateFlg and
sync like ST_* (05 sec. 2).

## 6. UI & routes

| Route | Components | Screens |
|---|---|---|
| /tracking/[io] | OrderFunnelTable (with value columns), LossReconciliationCard, GenealogyGraph | order river (06 sec. L) |
| /tracking/[io]/genealogy | GenealogyGraph (zoom/pan/filter) | genealogy explorer |
| /tracking/unit/[trackId] | ItemPassportTimeline | item passport |
| /tracking/scan + /m/track | ScanConsole (1D + QR) | scan-anything |
| /tracking/exceptions | DataTable | exceptions register |
| /tracking/policy | TrackPolicyForm (rights-gated) | policy editor |
| /tracking/labels | QrLabelSvg designer + print queue | label studio |
| /admin/tracking | JobPanel | backfill job |
| /ai/inbox, /ai/inbox/[draftId] | QueueTable, ParseReviewScreen | parse inbox + review (06 sec. M) |
| /ai/assistant | AssistantBar, VoiceInput, TamilTts | assistant |
| /ai/digest | ExceptionBriefing | Tamil digest |
| /admin/ai | provider/prompt/golden-set/cost dashboards, kill switches | AI admin |
| /m/* (20 routes) | MobileShell + parity screens | Commando (06 sec. K) |
| /approvals, /approvals/[type], /approvals/masters | ApprovalCard, ApprovalActions | approvals (02 sec. 16) |
| /reports, /reports/[reportId], /reports/viewer/[printId] | ReportFilterPanel, ReportJobRunner, ReportViewer, PrintLayout, ExportBar | reports (02 sec. 17) |
| Augmented legacy (06 sec. N) | AiDock on every wizard; QR print at /cutting/production; QR decode at /production/barcode; FAB_ROLL edges at /grn/new; CARTON at /commercial/packing-list; scan-out at /dc/gate/pass; track link at /orders/[io]; narrator + triage cards on /reports/* and /approvals/* | 06 sec. N |

## 7. API endpoints (04 sec. 10, sec. 11, sec. 12, sec. 13)

| Endpoint | Service | Purpose |
|---|---|---|
| GET /api/tracking/:io/river | TraceService.river() | stage funnel + reconciliation vs ledgers |
| GET /api/tracking/:io/genealogy?focus= | TraceService.genealogy() | depth-limited paged DAG |
| GET /api/tracking/unit/:trackId / /timeline | TraceService.passport() | item passport |
| POST /api/tracking/resolve {code, offlineSig?} | TraceService.resolve() | scan-anything with offline HMAC check |
| POST /api/tracking/scan {code, stationCtx} | TraceService.scan() | generic event (routes into scan.*) |
| GET/POST /api/tracking/policy | TraceService.policy() | TrackPolicy per order/part/stage |
| POST /api/tracking/labels/print / void | LabelService.print()/void() | TrackLabelLog audit |
| GET /api/tracking/exceptions | TraceService.exceptions() | mismatches, missing scans, aging, voided |
| POST /api/tracking/backfill | TraceService.backfill() | phase-2 migration job (rights-gated) |
| POST /api/ai/capture | AiCaptureService.ingest() | classify + OCR -> draft queue |
| GET /api/ai/inbox / /api/ai/drafts/:id | AiDraftService.list()/get() | review queue w/ confidence + boxes |
| POST /api/ai/drafts/:id/confirm / correct | AiDraftService.confirm()/correct() | same-endpoint posting / learning |
| POST /api/ai/assistant {text|voice} | AssistantService.ask() | skill router |
| POST /api/ai/prefill/:form | AiDraftService.prefill() | AiDock wizard prefill |
| GET /api/ai/digest | AiDigestService.today() | Tamil exception briefing |
| GET/POST /api/admin/ai/* | admin AI services | providers, prompts, golden set, kill switches |
| GET /api/approvals?state=pending&type= / POST /api/approvals/:id/approve|reject | ApprovalService.inbox()/decide() | typed queues |
| POST /api/reports/:id/run / GET /api/reports/jobs/:jobId / GET /api/reports/print/:printId | ReportService.run()/result()/print() | jobId staging + prints |
| GET /api/sync/pull?since= / POST /api/sync/ack / GET /api/events/stream | SyncService / EventBus | Commando sync + SSE |
| POST /api/scan/bundle / piece / rejection / posting | ScanService.* | station scans carrying trackId (TRK-020) |

## 8. Reports & prints (07 sec. 1.3; engine families from sec. 1.1/1.2)

| Family | Templates | Data source |
|---|---|---|
| Tracking | Order Trace River (stage funnel + loss reconciliation), Genealogy export (CSV/PDF), Item Passport print, Carton Manifest (buyer/audit pack, external QR), Party-Dwell aging (units at job-workers), Trace Exceptions register | TraceProjector/Track* |
| QR labels | Roll/Bundle/Piece/Carton label templates (QrLabelSvg sizes, signed codes) | LabelService |
| AI ops | Parse accuracy & correction dashboard, cost/latency by skill, golden-set scorecard, assistant query log | AiActionLog/eval store |
| Engine (carried) | All 07 sec. 1.1 document prints and sec. 1.2 register families via the generic runner; preprint overlays; Excel export; hidden OLD templates | ReportService |

## 9. Flags affecting this module

Part 3 additions (all default OFF; verbatim from 07 Part 3):

| Flag (default) | Effect |
|---|---|
| qr_track_enabled (N) | master switch for the tracking fabric (labels, events, river) |
| qr_roll_labels (N) | FAB_ROLL QR labels on GRN (auto-on when all_transaction_basedon_rollno='Y') |
| qr_bundle_labels (Y when module on) | bundle QR at cutting (replaces 1D print format, same data) |
| qr_piece_labels (BY_PART_STAGE) | per-piece QR - policy matrix (body piece-level, trims bundle-level) |
| qr_carton_labels (N) | carton QR at packing + gate scan-out |
| qr_yarn_bag (N) | bag-level units on purchase GRN |
| qr_external_format (N) | GS1-Digital-Link external codes (buyer/DPP packs) vs internal compact only |
| qr_offline_window_hrs (12) | offline scan validation cache window |
| qr_genealogy_strict (N) | block postings on quantity-law violation instead of warn |
| ai_enabled (N) | master switch (kill switch; capture-only mode when provider down) |
| ai_lang ('ta') | UI/voice language: ta/en/tanglish |
| ai_po_parse / ai_grn_parse / ai_bill_parse / ai_acc_parse (N) | per-skill parse toggles |
| ai_ratecnf_parse / ai_invoice_draft / ai_debit_assist (N) | commercial skills |
| ai_assistant (N) | chat/voice assistant + AiDock |
| ai_voice_entry (N) | voice drafting (STT: Indic-tuned models, numeric confirm loop) |
| ai_digest (N) | daily Tamil exception briefing |
| ai_narrator (N) | register narration + meeting-pack brief |
| ai_triage_approvals (N) | approval recommendation cards |
| ai_autoconfirm (N - locked OFF unless tenant opts in) | only non-financial, single-line, >= 0.98-confidence drafts |
| ai_onprem_endpoint ('') | route all inference on-prem (vLLM); empty = cloud |
| ai_retention_days (90) | source image/doc retention |

Legacy flags relevant here: approvalsflg, commando_approval_link,
po_approval_reqd, bud_app, prodbudappreqd_sample, lot_approval,
shortage_approval, acc_item_approval_reqd_for_accissue, gatepassflg/gatepassopt,
gendcdays (5, party aging), all_transaction_basedon_rollno (roll-label auto-on),
rollno_module_reqd, dyeinggamtper, knittinggamtper,
cuttingdc_joborder_deviation (quantity-law tolerances), preprintfolder (72/298),
wbsrequired (river RAG / meeting views).

## 10. Traceability

Mobile screens (06 sec. K) -> FR IDs:

| Screen | FR IDs |
|---|---|
| /m/login, /m/dashboard | MOB-001, MOB-005 |
| /m/scan, /m/scan-history | MOB-004, TRK-020, TRK-011 |
| /m/approvals/* (PO filter) | MOB-006, APR-001, APR-006 |
| /m/orders/* (WBS RAG, track link) | MOB-007 |
| /m/entry/production, /m/entry/stage | MOB-003, MOB-008 |
| /m/entry/grn (+ AiDock) | MOB-008, AI-002, AI-011 |
| /m/entry/rejection | MOB-008 |
| /m/entry/stock-transfer, /m/entry/unit-transfer | MOB-009 |
| /m/entry/gate-pass (QR scan-out) | MOB-010, TRK-005 |
| /m/entry/process-dc | MOB-010 |
| /m/qc/inspection, /m/breakdown-report | MOB-011 |
| /m/stock/ledger | MOB-012 |
| /m/costing/quick | MOB-012 (R07 CST-016) |
| /m/bills/lookup, /m/party/balance | MOB-012 |
| /m/track (new) | MOB-013, TRK-010, TRK-016 |
| /m/ai (new) | MOB-013, AI-002, AI-012 |
| /m/notifications, /m/settings (ta/en) | MOB-005, MOB-013, AI-014 |
| sync pull/ack | MOB-002, MOB-003, MOB-004, TRK-021 |
| approvals aw-bill queue (Frm_AppAwBill) | APR-002 (aw-bill type), APR-003 |
| report runner hosts (FrmCrysReport, FrmReport, frmRpt, FrmRegister) | RPT-001, RPT-002 |

New screens (06 sec. L, sec. M) -> FR IDs:

| Screen | FR IDs |
|---|---|
| /tracking/[io] order river | TRK-012, TRK-013, TRK-014 |
| /tracking/[io]/genealogy | GEN-007 |
| /tracking/unit/[trackId] | TRK-016 |
| /tracking/scan | TRK-010, TRK-011 |
| /tracking/exceptions | TRK-015 |
| /tracking/policy | TRK-017, TRK-018 |
| /tracking/labels | LBL-005, LBL-007 |
| /admin/tracking backfill | TRK-024 |
| /ai/inbox + [draftId] | AI-006, AI-010 |
| /ai/assistant | AI-012, AI-013 |
| /ai/digest | AI-026 |
| /admin/ai | AI-030 |

Augmented legacy screens (06 sec. N) -> FR IDs: document wizards + AiDock (AI-011);
cutting QR print (TRK-002, LBL-008); scan stations (TRK-020, TRK-004); GRN rolls
(GEN-006); packing list (TRK-002); gate pass (MOB-010, TRK-005); registers narrator
(AI-038); approvals triage card (AI-039); order detail track link (TRK-012).

## 11. Open items / blockers

| ID | Item | Impact |
|---|---|---|
| B4 | .rpt/.mrt parameters for the new Tracking and AI-ops report families (07 sec. 1.3) and for every legacy family carried by the runner are not extracted - never invent parameter lists; escalate for the X2 extraction before wiring RPT-008/RPT-009. | Catalog entries blocked until extraction. |
| B5 | AI golden-set documents are not collected; eval-gated ACs (AI-021..AI-023, rollout steps 3+) must be marked BLOCKED-B5 and eval data never fabricated. The "golden set >= threshold" value for enabling order-sheet parsing (AI-028 step 3) is undefined - set it per tenant from the seeded golden set. | Blocks AI rollout steps 3-5 and CI gates. |
| OI-1 | Label size validation: the 50x25/40x25/18x18/100x50 mm sizes and QR version limits (ECC M, version <= 10 on 18x18 piece labels) must be validated against physical printer stock and scanner decode rates before the reprint campaign in TRK-024; a failed decode on the small piece label is a production stopper. | LBL-003, LBL-004, TRK-024. |
| OI-2 | 08 sec. 4 states violations "block the posting" while qr_genealogy_strict defaults N ("block instead of warn") - reconcile the intended default during S7 design review; BR-03 ships warn-default. | GEN-002 polarity. |
| OI-3 | HMAC key lifecycle (rotation, key-version distribution to offline stations, reclaiming compromised keys) is referenced ("key version") but unspecified - define before phase 2. | LBL-001/002, TRK-019. |
| OI-4 | AI draft store table name is implied by the /api/ai/drafts endpoints and review-queue sync but never named in the sources (only AiActionLog, AiCorrection, MasterAlias are) - confirm the draft persistence design in S8 before AI-010. | AI review queue schema. |
| OI-5 | TraceEvent volume estimate (20-60 scans/piece on piece-level orders) needs a sizing pass against real order volumes to fix partitioning and the parent-remaining cache before phase 3 cutover. | TRK-022, TRK-025. |
| OI-6 | Phase-2 backfill cut-off rules for in-flight orders (which open bundles/rolls get labels vs RETIRED status) are undefined - decide per godown during the reprint campaign. | TRK-024. |
| OI-7 | On-prem vLLM sizing/provider matrix (models behind the per-skill routing) is tenant-dependent; ai_onprem_endpoint ships empty (cloud) - produce a reference sizing before offering on-prem. | AI-015, AI-025. |
| OI-8 | Commando offline conflict UX beyond "desktop wins + retry queue" (e.g. conflicting mobile approvals) is unspecified - confirm behavior before APR/MOB hardening in S9. | MOB-004, APR-006. |
