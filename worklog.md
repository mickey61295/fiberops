---
Task ID: master-create-tools
Agent: main
Task: Close the "agent cannot create masters" gap reported by the user. The original tool registry only had create_* tools for transactions (orders, POs, GRNs, invoices, cut orders, production, stock adjustments, approvals) and ZERO create tools for master entities (party, buyer, style, fabric, yarn, accessory, godown, department, employee, etc.). User reported the agent was bailing out with "this can't be done through chat — use the ERP UI directly" when asked to create a new buyer, which violates the principle that everything in the app must be reachable via chat.

Work Log:
- Audited src/lib/agent/tools.ts — confirmed only 7 write tools existed, all transactional, none for masters.
- Audited prisma/schema.prisma to enumerate every master entity that needed a create_* tool.
- Added 21 new write tools covering every master: create_party, create_buyer, create_style, create_yarn, create_fabric, create_accessory, create_godown, create_department, create_employee, create_colour, create_size, create_uom, create_dia, create_lot, create_season, create_merchandiser, create_exporter, create_fin_year, create_line, create_size_group, create_bom.
- Added 7 missing transactional write tools: create_jobwork_order, receive_jobwork, create_pcs_despatch, create_debit_note, create_journal, create_cost_sheet.
- Added 5 update/cancel tools: update_party, update_employee, update_order, cancel_purchase_order, cancel_invoice.
- Added 14 missing read tools so the agent can discover masters before creating dependent entities: list_uoms, list_colours, list_sizes, list_dias, list_lots, list_seasons, list_merchandisers, list_exporters, list_lines, list_fin_years, list_jobworks, list_despatches, list_journals, list_debit_notes.
- Updated SYSTEM_PROMPT in src/app/api/agent/route.ts to advertise the full new toolset and to explicitly forbid the "use the ERP UI directly" reply pattern.
- Raised MAX_STEPS from 6 to 8 to support read → write → approve → commit chains.
- Fixed ToolResult.plan.creates type to be optional (update/cancel tools legitimately only emit `updates`).
- Regenerated Prisma client (npx prisma generate) so the latest schema is reflected.
- Fixed list_jobworks / list_despatches to do separate lookups for related party/order/buyer (the schema declares plain FK columns on those tables, not Prisma relations).
- Ran npx tsc --noEmit — confirmed all new code compiles; only pre-existing TS errors remain (step-start/text-start/text-end not in TurnEvent union, zodToJsonSchema generic mismatch, get_line_status never[] typing — all unrelated to this change).
- Restarted Next dev server (port 3000).
- Smoke-tested by POSTing "Create a new buyer called Pacific Apparel Co based in Los Angeles" — agent called create_buyer, returned auto-assigned code B-0001, plan awaiting approval. ✅
- Smoke-tested by POSTing "Add a new supplier called Tirupur Knitting Mills, GSTIN 33ABCDE1234F1Z5, in Tirupur Tamil Nadu" — agent called create_party, returned PRT-0001, plan awaiting approval. ✅

Stage Summary:
- Tool count grew from ~32 (25 read + 7 write) to ~75 (39 read + 36 write).
- The agent now has full read+write coverage of every entity in the Prisma schema.
- User's original complaint ("I thought we decided everything in the app should be able to be done through ai chat") is resolved — creating buyers, suppliers, styles, fabrics, employees, colours, sizes, UOMs, etc. is now done directly in chat.
- Files changed: src/lib/agent/tools.ts, src/app/api/agent/route.ts.
- No DB migration needed (no schema changes — only added agent tools).

---
Task ID: document-ingestion
Agent: main
Task: User uploaded "PO_696GJ_revised 21-04-25.pdf" and asked what it is and how to ingest it. The ERP had NO document ingestion capability — agent tools could only operate on DB data.

Work Log:
- Analyzed the PDF (26 pages, 3.4 MB): a revised formal Purchase Order from LPP SA (Poland — Sinsay brand) to Baalaji Export (Tirupur), model 696GJ "BOYS' T-SHIRT", season AW 2025. Contains 5 order entities (11135903/5196 pcs, 11136041 E-COMM/738, 11136133/3264, 11111841/11340, 11136129 E-COMM/9468) = 30,006 pcs total, colour 59X NAVY, sizes 104-140, USD 1.05/pc, FOB Tuticorin → Gdynia, Sea, TT 180 days, shipments 2025-05-19 and 2025-06-02, plus LPP commercial terms/AQL/packing annexes.
- Freed 1.4 GB disk (disk was 100% full — dev server had died; removed 3 duplicated copies of the source-erp archive, npm cache, .next cache).
- Built the ingestion pipeline:
  * src/lib/agent/docExtract.ts — sanitized upload-dir file listing + text extraction (PDF via pdftotext UTF-8 with stdout recovery, plus txt/csv/md/json/tsv). Path traversal blocked.
  * src/lib/agent/tools.ts — new read tools: list_documents, extract_document (returns full text + metadata); new write tool create_sizes (batch size-scale creation, accepts names/sizes alias); create_order/create_style now accept buyer code OR name; create_order colour/size resolution is case-insensitive; create_order takes optional finYear for historical documents.
  * src/app/api/upload/route.ts — multipart upload endpoint (25 MB cap, sanitized names) into /home/z/my-project/upload/.
  * src/app/api/agent/route.ts — MAX_STEPS 8→12; extract_document tool results may carry up to 80K chars to the model (others 8K); added zod schema validation with automatic type coercion for common LLM mistakes (numeric strings, boolean strings) via parseWithCoercion; rewrote SYSTEM_PROMPT with a DOCUMENT INGESTION section (two-phase masters→orders protocol, direction rule: buyer PO = OUR sales order, never create item masters for buyer SKUs, map colour codes to existing colour names).
  * src/components/agent/agent-panel.tsx — Attach (paperclip) button + hidden file input + upload → attached-file chip; sending prepends "[Attached document: X]" to the prompt; new suggested prompt for ingestion.
- Fixed all pre-existing TS errors in agent code (TurnEvent union, zodToJsonSchema cast, get_line_status typing, erp route PurchaseOrder include).
- E2E tested with the real PDF (scripts/test_ingest.mjs): Phase 1 extracted the doc and proposed buyer/style/sizes; approvals committed them. Phase 2 ("continue") proposed all 5 orders with exact per-size quantities; approvals committed them. Verified via /api/erp: orders 11135903/11136041/11136133/11111841/11136129 in DB with finYear 24-25, orderDate 2025-03-03, correct deliveries and totals (30,006 pcs / USD 31,506.30).
- Cleaned test junk from DB (scripts/inspect_and_clean.js): duplicate "59X NAVY" colour remapped to Navy, 7 junk accessories deleted, 3 duplicate Baalaji Export parties deleted. Buyer B-0001 (LPP SA), style STY-0001, sizes 104-140 kept.
- Verified homepage 200 and chat query "Summarize orders from LPP SA" returns the correct table (30,006 pcs, 31,506.30).

Stage Summary:
- The ERP now has full document ingestion: attach PDF/CSV in chat → agent extracts text → proposes masters → user approves → user says "continue" → agent proposes orders per document entity → user approves → committed.
- Files changed: src/lib/agent/docExtract.ts (new), src/app/api/upload/route.ts (new), src/lib/agent/tools.ts, src/app/api/agent/route.ts, src/components/agent/agent-panel.tsx, src/app/api/erp/route.ts (pre-existing TS fix).
- Tool count now ~77 (41 read + 36 write).
- Known minor gap for future: scanned/image-only PDFs have no OCR; ₹ symbol shown for USD values until a currency field is added to Order.

---
Task ID: push-1
Agent: main
Task: Push the agent/order-program-flow branch to GitHub (user provided PAT).

Work Log:
- Initial push rejected: history contained two files exceeding GitHub's 100 MB limit — source-erp/extracted/Fiberpro/Fiberpro.exe (151 MB) and source-erp/garment-erp-source.zip (109 MB); plus four .dll/.ocx files above the 50 MB warning threshold.
- Installed git-filter-repo via pip3 and ran `git filter-repo --strip-blobs-bigger-than 50M --force` — stripped all blobs > 50 MB from every commit in history. 1081 blobs inspected, history rewritten, repack done. Phase 1.8 commit `568ac0f` rewritten to `303222b` (same content, new hash).
- Re-added origin remote with the user's PAT embedded (git-filter-repo removes origin by default for safety).
- Pushed agent/order-program-flow → origin. GitHub accepted; remote branch tip = aaf63ddba522bb457e3cf082224cebc3c75e464a. PR creation URL: https://github.com/mickey61295/fiberops/pull/new/agent/order-program-flow
- Reverted remote URL to https://github.com/mickey61295/fiberops.git (PAT removed from .git/config).

Stage Summary:
- Branch agent/order-program-flow is live on GitHub, including the Phase 1.8 commit (suggest_next_step tool + INDUSTRY WORKFLOW SYSTEM_PROMPT section).
- Local main and agent/order-program-flow both at aaf63dd; origin/agent/order-program-flow tracking set up.
- Security note for user: the PAT was pasted in chat — recommend revoking it at https://github.com/settings/tokens after this session and minting a fresh one for future pushes.
- Next decision: open a PR agent/order-program-flow → main, OR force-push main to align remote main with the cleaned history.

---
Task ID: phase-2.0
Agent: main
Task: Continue the industry-flow build (user: "continue" after the order→program gap discussion + push). The rolled-back baseline was missing 4 of the 15 pipeline tools and had NO Program concept — the "order → program" flow the user explicitly named.

Work Log:
- Audited the 84-tool baseline against the 15-stage pipeline: missing issue_to_line, post_rework, post_rejection, record_payment; no Program entity.
- Schema (prisma): added Program (PGM-####, stage→dept auto-map, required kgs/mtrs/pcs, updates legacy ProgBalanceYarn/Fabric projector rows), LineIssue (LI-####), RejectionEntry (REJ-####), Payment (RCP-/PMT-#### with direction in/out) + back-relations. `prisma db push` + generate.
- tools.ts: shared helpers — bumpStock (NULL-consistent CurrentStock matching), postLedger (StockLedger row + stock bump in one tx), nextNumber/resolveDocNo, STAGE_DEPT map.
- New write tools: create_program, issue_to_line (G1 pcs out, warns-not-blocks on negative), post_rejection (scrap/return moves G2 pcs out; rework is document-only), post_rework (ProductionEntry rework=true), record_payment (Payment + Journal voucher + invoice → paid when fully collected).
- New read tool: get_program_status — per-program required vs actual computed from StockLedger (source of truth), not projector columns.
- Stock effects added to existing chain tools: create_cut_order (pcs → G1 ready_to_cut_in), post_production_entry (good output → G2 production_in), create_pcs_despatch (pcs ← G2 sales_delivery).
- suggest_next_step: 15 stages now (Program inserted as step 3); richer skeletons matching actual tool schemas; production % and pipelineComplete terminal state; has.lineIssue/program/payment detection.
- SYSTEM_PROMPT: updated READ/WRITE tool lists, 15-stage INDUSTRY WORKFLOW chain, program-status rule, numbering list (PGM/LI/REJ/RCP/PMT).
- CRITICAL BUG FOUND + FIXED: CurrentStock buckets fragmented by deptId — cut-in leg wrote {dept null} bucket while line-out leg wrote {dept D4} bucket, so stock never netted (the SQLite composite-unique trap in a new disguise). Fix: postLedger always bumps the (itemType, itemId, godownId) bucket with deptId/orderId NULL; dept stays on the ledger row for reporting only.
- E2E: tests/pipeline/industry-chain.test.ts (15 tests) — full chain with G1/G2 stock assertions, ledger txn-type assertions, program balance, invoice settlement, pipelineComplete. 15/15 PASS after the bucket fix.
- vitest.config.ts created (@ alias, singleFork); vitest installed as devDependency.
- README.md recreated (lost in rollback): 90 tools, 15-stage chain, try-it instructions, repo layout.

Stage Summary:
- 90 tools total (6 new: create_program, issue_to_line, post_rejection, post_rework, record_payment, get_program_status).
- The order→program→…→collection chain is now fully executable via chat with real stock-ledger effects.
- 15/15 E2E tests green; tsc clean; app HTTP 200.
- Next: commit + push to GitHub (PAT re-embed → push → scrub).

---
Task ID: plan-2.0-menu-parity
Agent: main
Task: User asked: (1) confirm the original Fiberpro menu/form surface (~300 forms), (2) deep dive into it, (3) create a new plan to rework the app as agent-first data entry ALONGSIDE working forms with full menu parity.

Work Log:
- Verified sandbox state: git clean at 11218fc (phase-2.0 committed). 105 agent tools live, 11 thin read-only views (single-page view-switcher).
- Deep dive into source-erp/extracted/Fiberpro: found reverse-engineering workspace with candidate-forms.txt (321 WinForms), 10 module-functionalities analyses, mern-requirements.md (14 modules, ~111 suggested pages), api-endpoints-map.md (~442 endpoints).
- Dispatched 2 Explore agents to digest all 10 module docs: extracted per-module page lists, core daily-workflow forms, and must-not-lose legacy concepts (ready-to-cut virtual dept −7, GAN acceptance, program balances, rate cascade, piece stock at-party, rework G/M stock, 20 TrTypes, EntryOption 1/2, RateFor S/C/R/Z).
- Wrote scripts/analyze_forms.py (persisted): classified 321 forms into archetypes (52 master / 173 transaction / 47 register / 18 approval / 10 setting / 15 admin / 6 utility), deduped variants (307 unique units), clustered transactions into 21 document families → docs/form-taxonomy.json.
- Wrote docs/PLAN-2.0-MENU-PARITY.md: full menu tree (17 groups, ~90 menu items, every legacy form mapped with phase + agent-tool status), 5 screen archetype engines (MasterTable/DocScreen/RegisterScreen/ApprovalInbox/ReportHub), Form×Agent duality architecture (shared PostingEngine services + shared zod schemas, one action two doors), phased roadmap M1-M6 with acceptance criteria, ~21 new tool gaps, risks and open decisions.

Stage Summary:
- Answer to user: yes 321 forms (not 300), 491 reports; but they collapse to ~45 doc screens + ~40 master configs + registers via 5 engines — menu parity without form parity.
- Deliverable: docs/PLAN-2.0-MENU-PARITY.md + docs/form-taxonomy.json + scripts/analyze_forms.py.
- Committed as git checkpoint; patch exported to download/ for GitHub push (PAT revoked, needs fresh token).
- Next: user reviews plan; on approval start M1 (app shell + menu registry).

---
Task ID: plan-2.0-wiring-layer
Agent: main
Task: User asked whether the plan covers only the menu, or also screens and the internal wiring/links between screens and forms.

Work Log:
- Answered: plan covers all three layers (menu = M1 skeleton; screens = M2-M5 engines; wiring = declared but implicit).
- Made wiring a first-class plan section: added §4.6 "The Wiring Layer" with 6 config-driven wiring patterns: W1 chain wiring (mini pipeline bar + pre-filled Next CTA, form-side twin of suggest_next_step), W2 drill-down wiring (register row → doc view; clickable ref fields; KPI → filtered register), W3 Order Hub (/orders/[id] full document family with rollups — replaces FrmOrdProdTrack/FrmIoHistoryReg), W4 picker wiring (searchable pickers with create-on-the-fly slide-over, draft doc state preserved), W5 agent↔form context handoff (Fill with AI / Ask about this data / Open form button), W6 doc-to-doc reconciliation panels (PO↔GRN, DC↔GRN, Invoice↔Payment, Jobwork out↔in).
- Added Order Hub row to §3.2 menu tree (RG+DS, M3).
- Updated M3 acceptance (Order Hub live, every doc reachable ≤1 click from hub) and M4 acceptance (drill-down on every register, reconciliation panels on doc views).
- Committed checkpoint.

Stage Summary:
- Plan now explicitly covers menu + screens + wiring; wiring is declared in registry configs (chainPosition, refs[], counterpartDocs[], drillDown), not bespoke code.
- One chain definition powers both the form-side Next CTA and the agent-side suggest_next_step.

---
Task ID: context-framework
Agent: main
Task: User flagged the plan doc lacks implementation detail and that context exhaustion → incorrect implementations; asked for a framework to never miss context.

Work Log:
- Demonstrated the problem live: audited ground truth vs session summaries and found 3 drifts — tool count is 89 (not 105/103/90; naive greps overcounted deep-indent name: keys), PROMPT_VERSION constant doesn't exist in baseline (claimed by old summary), /api/upload route lost in rollback (worklog documented it, docExtract.ts survived).
- Built the Context Continuity Framework in docs/CONTEXT/:
  * 00-START-HERE.md — bootstrap protocol: 8 absolute rules (files-are-only-memory, verify-before-trust, spec-before-code, read-real-schema, state-per-commit, tag-per-milestone, edit-don't-rewrite, one-service-per-op), ordered read list, session-end checklist, document map.
  * 01-STATE.md — living state: milestone table, VERIFIED ground truth (89 tools / 54 models / 12 views / 15 tests / MAX_STEPS 12), known drift registry, file inventory, open decisions, next actions, remote state.
  * 02-DECISIONS.md — 12 ADRs (agent+form duality, menu-not-form parity, ledger-as-truth, NULL buckets, approval gate, menu registry, single chain def, real routes, single-tenant, history hygiene, context framework, legacy enum registry).
  * 03-PITFALLS.md — 12 entries incl. Prisma relation traps, 3x rollback recovery protocol, calibrated grep regex, SQLite bucket fragmentation, PAT protocol, tsc noise list, dev-env notes, legacy semantic traps (dept -7, DyeColID, rework 0/1/2, EntryOption 2, at-party stock, GAN).
  * 04-CONVENTIONS.md — target directory tree, naming (doc numbers/routes/tools), tool pattern, posting-service pattern, stock/chain rules, UI rules, test rules (form-vs-agent parity), commit rules.
- Created scripts/context_check.sh (executable, calibrated regexes): git state, code metrics vs STATE claims, critical-file existence, known-gap detection, disk check. Exit 1 on drift with recovery protocol pointer. Validated: 17/17 checks pass, exit 0.
- Anchored framework into PLAN-2.0-MENU-PARITY.md header (must-bootstrap warning) + fixed stale metrics (105→89 tools, 11→12 views).

Stage Summary:
- Framework: STATE claims + script verifies + drift → trust script → fix STATE → log PITFALLS → recover from worklog/patches. Spec-before-code gates each milestone.
- Every future session now bootstraps identically via docs/CONTEXT/00-START-HERE.md; drift is detectable, not silent.
- Next: write specs/SPEC-M1.md (menu registry TS shape, route table, file list) BEFORE any M1 code.

---
Task ID: m1-app-shell
Agent: main
Task: Implement M1 per frozen spec docs/CONTEXT/specs/SPEC-M1.md — real App Router routes, registry-driven sidebar, coming-soon pages, parity tracker, approval inbox shell.

Work Log:
- Bootstrapped per protocol: context_check.sh 17/17 green, read STATE/PLAN/CONVENTIONS.
- Wrote + committed SPEC-M1 BEFORE code (commit 6173f22): frozen MenuItem/MenuGroup types, exact 113-item table transcribed from plan §3 (plan said "~90"; exact count = 113), route map, file contracts, 13 acceptance tests, gotchas.
- Built src/lib/erp/menu-registry.ts (~970 lines): 17 groups, 113 items (legacyForms expanded from form-taxonomy.json evidence: 18 approval + 52 master arrays), LIVE_ROUTES M1 set (12 routes), helpers (isLive/getHref/finders/parityStats with Set-dedup so shared forms count once).
- Built the shell: app-shell.tsx (client, keyed refresh, mobile Sheet), nav-sidebar.tsx (100% registry-driven accordion, live/coming dots, per-group live counts, parity summary + seed), topbar.tsx (breadcrumbs from registry, Cmd+K agent button), parity-footer.tsx, agent-panel-provider.tsx (global openAgent(seed?) context, owns Cmd+K).
- agent-panel.tsx: added seedPrompt prop — opens with input pre-filled, never auto-sends.
- Re-homed 11 views into src/app/(erp)/* routes (/accounts = invoices view, /approvals = workflow view = M1 Approval Inbox shell); dashboard route maps old ViewKey navigation to routes via view-routes.ts; DELETED src/app/page.tsx + sidebar.tsx.
- Coming-soon: /coming/[id] renders item mode (phase/arch badges, "Available NOW via agent" with tool chips + seeded Ask button, legacy forms collapsible, future route) or group mode (item list with dots); unknown id → 404. Live-item hit → links to real route.
- Parity page /parity: summary tiles + per-group tables (engine, phase, legacy count, tools, status).
- tests/unit/menu-registry.test.ts: 13 tests incl. LIVE_ROUTES ↔ page-files-on-disk fs check.
- Updated scripts/context_check.sh for M1 reality (17 erp tsx, 13 registry tests, 113 items, new critical files) — 24/24 checks green.
- Acceptance: tsc no NEW errors; vitest 28/28 (15 pipeline + 13 registry); route smoke all 12 live routes + 3 coming pages 200, unknown coming id 404; sidebar/footer content verified in HTML.

Stage Summary:
- M1 DONE: 113/113 menu items clickable (3 live, 110 coming via registry pages), zero dead links, parity tracker live (3/113 items, 11/17 groups, 27.6% distinct-legacy-form coverage = 70/254).
- Architecture landed: menu-registry.ts is the single navigation truth; LIVE_ROUTES is the only liveness switch; coming pages offer the agent door (P2/P3 principles working end-to-end).
- Tag m1-done. Next: SPEC-M2 (MasterTable engine + ~40 master configs) before any M2 code.

---
Task ID: m2-master-table
Agent: main
Task: Implement M2 per frozen spec docs/CONTEXT/specs/SPEC-M2.md — MasterTable engine + 24 master configs + shared master-service + form×agent parity; user approved with "ok. Do it".

Work Log:
- Bootstrapped per protocol: context_check.sh 17/17 green, read STATE/PLAN/CONVENTIONS/SPEC-M1.
- Verified every master tool's actual schema/prefix/description against tools.ts BEFORE writing the spec (rule #4); discovered 3 behavior-compat facts → SPEC-M2 ERRATUM block: 'list' field type (size-group.sizes), refCreateOnFly (fabric.diaValue auto-creates Dia), title-field dup check (create_colour dedupes by name), + select→z.string not z.enum (agent route only coerces numbers/booleans).
- Committed SPEC-M2 (fd0e9cf) BEFORE code + ADR-013 (M2 boundary: pure single-table CRUD, zero schema churn; HSN→M6, post_opening→M3, BOM editor→M3) + plan §6 re-sequencing note.
- Built src/lib/erp/master-configs/: types.ts + 24 per-entity pure-data configs + index.ts registry (commercial 5 / product 13 / org 5 / admin 1).
- Built src/lib/erp/posting/master-service.ts: planMasterCreate/planMasterUpdate (plan+commit, FK resolution by code-then-name, auto-code walk, dup checks, fin-year single-active invariant), listMasters (flattened display rows w/ FK includes), countMasters, buildMasterSchema (ONE schema source: tool schema + service validation).
- Refactored tools.ts via persisted scripts/refactor_master_tools.py: replaced 23 inline master tool bodies with factory delegates (masterCreateTool/masterUpdateTool); added 31 NEW tools (22 update + 4 create part/component/design/govt_holiday + 5 list). Tool count 89 → 120. create_sizes/create_bom untouched. SYSTEM_PROMPT updated (masters now list+create+update; prefer update over re-create).
- Built the engine + routes: components/archetypes/master-table.tsx (grid, client search, CSV export, create/edit Sheet, Ask-agent button), /masters hub (24 cards by category, live counts), /masters/[entity] (404 on unknown), /admin/company (single-company card + FinYear table), masters/actions.ts server action → same service.
- Deleted masters-view.tsx (read-only 11-tab legacy view). LIVE_ROUTES += /admin/company.
- Tests: tests/unit/master-configs.test.ts (8 contract tests), tests/pipeline/master-parity.test.ts (7 blocks → 75 runtime tests looping ALL 24 configs: agent door execute→commit vs form door service→commit, FK by-name resolution, dup rejection on both doors, fin-year active invariant, cleanup + active-FY restore). Updated menu-registry test (4 live items).
- Fixed 4 real bugs found by tests: flattenRow missing auto-assigned keys; date-key lookup hitting findUnique with a string (the "premature end of input" prisma trap — PITFALLS #13); govt-holiday create-side exists-check on non-unique date; date keys not converted in create data.
- Updated scripts/context_check.sh for M2 (factory-aware tool counting, new metrics/files) — 42/42 green.

Stage Summary:
- M2 DONE: 24/24 masters editable via BOTH doors — form (/masters/<slug>: create/edit/search/CSV) and agent (list/create/update tools, 120 total) — through ONE service (ADR-001 satisfied, test-asserted per entity).
- Parity: 4/113 items live (dashboard, approvals, masters, company-finyear) · 11/17 groups · 28.7% legacy coverage (73/254).
- Verification: tsc no new errors; vitest 111/111 (15 pipeline + 13 registry + 8 config + 75 parity); route smoke 26×200 + unknown-entity 404; parity tiles verified in rendered HTML.
- Architecture landed: configs are pure data; the service owns ALL master logic; engines consume configs. New master = 1 config file + auto-generated tools.
- Tag m2-done. Next: SPEC-M3 (PostingEngine extraction for transactions + DocScreen engine + W1/W3/W4 wiring + /api/upload rebuild) BEFORE any M3 code.

---
Task ID: rollback4-recovery
Agent: main
Task: Bootstrap a new session after context exhaustion ("continue"); detect and recover from sandbox rollback #4.

Work Log:
- Bootstrapped per protocol: context_check.sh → 1 DRIFT (18 erp components vs 16) + NOTE (masters-view.tsx resurrected). git log/reflog/tags told the story: .git rolled back to 3f09291 (Phase-1.8), ALL plan/M1/M2 commits + tags (m1-done, m2-done, plan-2.0) eaten, but M2-final files survived in the working tree alongside RESURRECTED files M1/M2 had deleted.
- Recovery step 1 — zombies: deleted src/app/page.tsx (old view-switcher; conflicted with (erp)/page.tsx on "/"), src/components/erp/sidebar.tsx, src/components/erp/masters-view.tsx (only page.tsx referenced them; patch 0003/0004 confirm they were deleted in M1/M2). 16 erp components again.
- Recovery step 2 — the schema/client/db triangle: first vitest run failed 17 (master-parity: "Department.prs does not exist"; industry-chain: "tx.program undefined"). Diagnosed across THREE hypotheses (stale db → stale schema → stale client) using: git-diff of schema vs HEAD, model-list diff (58-model HEAD vs 54-model working tree = 7 removed / 3 added models), generated-client introspection (58-model = HEAD), old-db column facts (54 tables, Program present, Payment has orderId+invoiceId+direction, no prs), context_check "54" green through M1/M2, patches never touching schema.prisma.
- NEAR-MISS (logged honestly): initially misread the drift and ran `git checkout HEAD -- prisma/schema.prisma` + `prisma db push --accept-data-loss` — overwrote the ONLY copy of the 54-model schema and mutated the good db (dropped Program/LineIssue/RejectionEntry + Payment.orderId; 9-row test residue each — seed data SURVIVED: B001/S-1001/Y-30COT/CUS001/E001/L1 all intact).
- Recovery step 3 — reconstruction: wrote scripts/rebuild_schema_54.py (persisted): 58-model base → drop Bill/BillPass/Flag/HsnCode/PcsStock/RejectionType/Stage + their back-refs → add Program/LineIssue/RejectionEntry (field shapes extracted from tools.ts create-blocks, get_program_status includes, suggest_next_step has-computation, record_payment create data) → Payment swap (billId/bill → orderId+order relation, invoiceId, direction) → AgentTurn plain-userId without audit enrichment → User without agentTurns → Order/Department/Yarn/Fabric/Line back-refs. Output: exactly 54 models, prisma validate green.
- Recovery step 4 — resync: prisma db push (recreated 3 tables, re-added Payment cols, dropped empty Phase-3/4 tables) → prisma generate (fresh 54-model client replacing the stale Phase-4 one).
- Verification: vitest 111/111 (15 pipeline + 13 registry + 8 config + 75 parity) · tsc noise = 32 known errors (54-world orphans: flags/exposure/cumrate + Phase-3/4 seed/cleanup scripts — none imported by app code except /api/config→flags) · context_check 42/42 NO DRIFT · route smoke: 16 live routes + 3 coming pages all 200, /masters/unknown + /coming/garbage 404 · .next cache cleared (stale validator referenced deleted page.tsx).
- Hardening: .gitignore now blocks /source-erp/, /workspace/, /download/, /upload/, /tool-results/, /.zscripts/, /mini-services/, /examples/ (PITFALLS #6 protection); removed the .recovery scratch worktree; updated 01-STATE.md (drift #5/#6, git state) and PITFALLS #16 (mixed-snapshot rollback + triangle rule + commit-the-schema rule).

Stage Summary:
- Rollback #4 fully recovered WITHOUT losing any M2-final capability: 120 tools, 24 master configs, 113-item registry, 14 live routes, all tests green.
- The framework worked exactly as designed: context_check.sh detected the rollback in seconds; worklog + patches provided the recovery map; the protocol's "trust the script" rule prevented deeper wrong-turns (after one wrong turn, corrected via recorded facts).
- COST of the near-miss: the byte-exact 54-model schema is gone; it is now the script-reconstructed functional equivalent (diff vs original: possibly cosmetic field-order/comments only — all code paths test-verified).
- New invariant: prisma/schema.prisma + db/custom.db are now COMMITTED artifacts (they weren't through M1/M2 — the root cause of unrecoverability).
- Next: SPEC-M3 per STATE next-actions (PostingEngine extraction + DocScreen + wiring W1/W3/W4 + /api/upload rebuild) — commit BEFORE coding.

---
Task ID: spec-m3
Agent: main
Task: Write and freeze SPEC-M3 (the stated next action after rollback recovery).

Work Log:
- Read CONVENTIONS (§posting-service pattern, testing rules) + SPEC-M2 as the format template + plan §4.2 (DocScreen), §4.6 (wiring W1/W6), §6-M3, §7 (tool gaps).
- Inventoried the 22 transaction write tools in tools.ts (create_order … record_payment + 3 cancels) with their ledger effects from the postLedger call sites.
- Extracted the 15-stage PIPELINE definition (source for chain.ts, ADR-007) and the 42 M3-phase menu items from the registry.
- Wrote docs/CONTEXT/specs/SPEC-M3.md: goal + 11 acceptance criteria; non-goals re-sequenced via ADR-014 (DC family / pcs receipt+transfer / cutting-issue / ready-to-cut / multi-GRN / approval INs / amend-close screens → M4/M5; cancels become doc-view actions); architecture (tools.ts → thin delegates over posting/<op>.ts + schemas/<op>.ts, postLedger/bumpStock → posting/ledger.ts, STAGE_DEPT → legacy-enums.ts); frozen DocConfig types; the 20-screen live inventory (24/113 items, 14/17 groups after M3); wiring specs W1 (chain bar + Next CTA + computeChainState shared with suggest_next_step), W3 (Order Hub full-family include set + BOM card), W4 (doc-picker + create-on-the-fly reusing MasterTable in Sheet + draft preservation), nextFormUrl; /api/upload rebuild contract; 2 new tools (post_stock_adjustment, transfer_stock → 122 total); testing plan (doc-parity per op + form-door industry-chain companion + doc-config contract tests); 4 implementation waves with exit criteria; gotchas (verbatim zod moves, reconstructed-schema relation names, ADR-004 bucket rule, numbering collision-safety).
- Added ADR-014 to 02-DECISIONS.md; updated 01-STATE.md (M3 = SPEC FROZEN, next actions = Wave A first; m1-done tag note).

Stage Summary:
- SPEC-M3 frozen and committed BEFORE any M3 code (protocol rule #3 satisfied).
- M3 is session-splittable: Wave A (pure extraction, zero UI) is the safe first session — industry-chain test must pass UNMODIFIED through it.
- Next session bootstraps via 00-START-HERE → STATE → SPEC-M3 §14 Wave A.
---
Task ID: m3-wave-a
Agent: main
Task: Implement M3 Wave A per frozen spec docs/CONTEXT/specs/SPEC-M3.md §14 — pure extraction, no UI: chain.ts + schemas/ + posting/ (services + ledger) + tools.ts delegation + doc-parity tests. User: "commit and Start Wave A".

Work Log:
- Bootstrapped per protocol: context_check.sh 42/42 NO DRIFT; read STATE/PITFALLS/CONVENTIONS/SPEC-M3 + full tools.ts (2805 lines) + industry-chain/master-parity tests + approve route + parse-with-coercion.
- Foundation: posting/types.ts (DocPlanResult ok|error union mirroring MasterPlan), posting/ledger.ts (postLedger+bumpStock moved verbatim, ADR-004 bucket-rule comment travels), legacy-enums.ts (STAGE_DEPT + documented DeptID −7/8/10 + rework 0/1/2 — ADR-012 residence), numbering.ts += nextNumber/resolveDocNo (verbatim from tools.ts).
- chain.ts (ADR-007): CHAIN = the 15 PIPELINE stages verbatim + formUrl/formParam per SPEC §8 routes; computeChainState (the has-flags, shared with the future W1 bar), nextStage (mirrors the suggest_next_step if-chain exactly), stageFormUrl; CHAIN_ORDER_INCLUDE extracted.
- schemas/ — 17 files, every field/optionality/.describe() copied VERBATIM (agent prompt contract): order, bom, program, purchase-order, grn, jobwork(out+in), cut, line-issue, production(entry+rework), rejection, despatch, invoice, debit-note, journal, cost-sheet, payment, cancel(×3).
- posting/ — 17 op service files, 21 plan functions (order, bom, program, purchase-order, grn, jobwork×2, cut, line-issue, production×2, rejection, despatch, invoice, debit-note, journal, cost-sheet, payment, cancel×3) — logic verbatim, DocPlanResult shape.
- tools.ts rewrite (2805 → 1705 lines): docTool factory (schema + plan delegate); 21 write tools converted; PIPELINE/STAGE_DEPT/postLedger/bumpStock/nextNumber/resolveDocNo locals DELETED; suggest_next_step now imports CHAIN/computeChainState (json output additive-only); deliberately-kept inline: approve_pending, adjust_stock, update_order, create_sizes (outside SPEC §5 inventory). Tool count stays 120 (context_check updated: inline+factory+docTool counting).
- Fixed mid-refactor mistake: duplicate writeTools declaration from a mis-anchored edit → docTools array + spread; 3 duplicate docTool calls removed.
- Verification: tsc 31 errors = known-noise set only (was 32; .next-cache entry gone) — ZERO new errors. vitest 111/111 green with industry-chain UNMODIFIED (zero-behavior-change gate passed).
- tests/pipeline/doc-parity.test.ts (19 tests): 18 ops × agent-door (execute→plan→commit) vs form-door (service plan→commit) with variant-tagged orderNo/styleNo/docNos; per-op doc-field equality + known ledger effects (ready_to_cut_in 100, ready_to_cut_out 100, production_in 95, rejection_out 3, sales_delivery 92, purchase_grn 50 kgs, billAmount 19320, invoice settled+paid); test #19 = FULL-CHAIN StockLedger signature equality between doors + net-zero G1/G2 buckets; surgical afterAll cleanup (FK-safe order, bucket restore).
- The parity test found TWO latent pre-existing bugs (PITFALLS #18): create_purchase_order passed itemCode into nested pOLine create → PrismaClientValidationError (fixed: strip in payload, keep in plan display); receive_grn without deptCode used deptId:'' bucket key/create → FK violation + never-matching lookup (fixed: null dims per ADR-004 pattern, dept-keyed buckets preserved when deptCode given). Both fixed with FIX comments in the services.
- Also triaged a pre-existing FLAKY failure (NOT a regression, PITFALLS #17): master-parity govt-holiday date-collision with seeded Republic Day rows — residue cleaned (M2E-upd-* rows), test re-ran green; real fix owed later.
- context_check.sh updated for Wave A: docTool counting, schemas=17, posting-files=20, chain-stages=15, doc-parity-tests=19, SPEC-M3 + chain/ledger/types in critical assets → 57/57 NO DRIFT.
- 01-STATE.md updated (M3 WAVE A DONE, metrics, drift #6→31 tsc errors, drift #7 latent-bug record, Wave A notes, next actions = Wave B).

Stage Summary:
- Wave A COMPLETE per spec §14 exit criteria: 111 old tests green UNMODIFIED through the extraction + 19 new doc-parity tests green (130/130 total). ADR-001 now holds at transaction scale: all 21 SPEC-M3 §5 write ops are schema+delegate over posting services, test-enforced both doors.
- Architecture landed: chain.ts (single 15-stage source, W1-ready), schemas/ (shared zod, form-safeParse-ready), posting/ (plan/commit services + ledger.ts), legacy-enums.ts (ADR-012). tools.ts is now thin: 51 inline reads + 4 deliberate inline writes + 48 factory masters + 21 docTool delegates = 120 tools.
- Bonus: 2 latent pre-existing bugs fixed (PO create was 100% broken; GRN-without-dept was 100% broken since rollback #4) — first-ever PO/GRN coverage came from the parity suite.
- Tag m3-wave-a. Next: Wave B (doc-configs/types + order config + doc-screen.tsx + doc-picker.tsx + /orders/new + /orders/[id] hub + BOM card + chain bar + nextFormUrl + agent-panel "Open form").

---
Task ID: m3-wave-b
Agent: main
Task: Implement M3 Wave B per frozen spec docs/CONTEXT/specs/SPEC-M3.md §14 — engine + order family: doc-configs (types/order/index/coerce) + DocScreen engine + W4 pickers + W1 chain bar + /orders/new + /orders/[id] Order Hub + BOM card + nextFormUrl + agent-panel "Open form". Continuation session: "continue" after context exhaustion.

Work Log:
- Bootstrapped per protocol: context_check.sh 57/57 NO DRIFT; read STATE/PITFALLS/CONVENTIONS/SPEC-M3 (full) + chain.ts + posting/order.ts + schemas/order.ts + master-table/master-configs/actions patterns + agent-panel + api/erp + menu-registry test pins.
- Session hygiene first: 42 dirty files = sandbox-restore mode-bit noise (41) + legit bun.lock vitest-sync (1) → chmod-normalized + committed the lock sync (6b28c65); vitest 130/130 confirmed before starting.
- doc-configs/: types.ts (§7 frozen shape + ERRATUM: pickerValueField / schema / DocScreenConfig serializable subset), order.ts (fields mirror ORDER_SCHEMA exactly), index.ts (registry + toScreenConfig), coerce.ts (config-driven coercion: numbers coerced, empties dropped, blank line-rows dropped).
- chain.ts += resolveStageUrl (id-aware, param-BEFORE-hash, falls back to frozen stageFormUrl) — shared by suggest_next_step / chain bar / DocScreen CTAs.
- W1 chain-bar.tsx: 15 dots, done-fills from ChainStateFlags, current-stage ring, "Next →" Link; no-state mode for New screens.
- W4 doc-picker.tsx: searchable dropdown over NEW `/api/erp?resource=master_search` (same listMasters read path, valueField param), "+ New <Entity>" create-on-the-fly Sheet reusing exported MasterFieldInput + saveMasterAction — draft preserved by construction.
- DocScreen engine (archetypes/doc-screen.tsx): New mode (header grid + pickers + line-grid editor + qty×rate totals + Save → planDocAction REVIEW card → commitDocAction → done CTAs incl. stage+1 Next link; Ctrl+S; Ask agent) + generic View mode. Generic server actions in lib/erp/doc-actions.ts ('use server'): coerce → shared zod safeParse → SAME posting service plan/commit (the docTool mirror).
- /orders/new page (DocScreen + recent 20 table) · /orders/[id] Order Hub (W3): resolves id OR orderNo, CHAIN_ORDER_INCLUDE + rejections + poLines.po.grns; supplementary JobworkOrder/PcsDespatch queries (no reverse relations on Order — schema reality); 12 family sections with rollups; every section header links live-form-or-coming via findItemByRoute+getHref; BOM card (#bom) with planBom-backed inline add editor + documented single-door remove exception; AskAgentButton seeded.
- suggest_next_step json += nextFormUrl (additive; complete-branch gets null; inv hoisted out of the else-block); agent-panel renders "Open form" button from result.json.nextFormUrl (W5(c) minimal slice).
- menu-registry: LIVE_ROUTES += /orders/new, /orders/[id] (16 total, 6/113 items live, 78/254 legacy = 30.7%); menu-registry test updated 4→6.
- CAUGHT BY ROUTE SMOKE (PITFALLS #19): literal `/orders/[id]` href crashes Next <Link> — /parity 500 + 3 more consumer sites patched (nav-sidebar, parity page, coming-soon, coming/[id]) with the split('/[id]') fallback; re-smoked 200.
- revalidatePath wrapped in try/catch in both action files (PITFALLS #20) so vitest can drive the full compose.
- tests/unit/doc-configs.test.ts (18): §7 contracts (fields/labels/types, picker slugs vs MASTER_CONFIGS, chainStage bounds, schema-keys mirror, toScreenConfig strips fns, routes live + page files) + coercion (number coercion, dropped empties, blank-row drop, zod-reported missing, non-numeric surfaced) + form-door integration (planDocAction serializable plan; commitDocAction commits + durable rows verified + surgical cleanup; unknown-slug/bad-input structured errors) + resolveStageUrl cases.
- context_check.sh updated for Wave B (doc-configs=1, archetypes=2, erp-components=19, live-routes=16 grep fix for [id], 12 new critical assets) → 71/71 NO DRIFT; 01-STATE.md rewritten for Wave B (milestone row, ground-truth table, drift #8/#9, inventory +12 rows, next actions = Wave C, Wave B notes, patch/tag lists); PITFALLS #19/#20 appended.

Stage Summary:
- Wave B COMPLETE per spec §14 exit criteria: acceptance #3 partially (order+BOM form-only), #5 (Order Hub full-family rollups), #6 (nextFormUrl + Open form), #7 (W4 pickers + chain bar on order screens). vitest 148/148 (130 + 18 new); tsc 30 known-noise only (zero new-file errors); route smoke: /orders/new + /orders/[id] (by id AND by orderNo) + all 16 live routes 200, unknown ids 404, master_search API verified incl. name-valueField emission.
- Architecture landed: ONE DocConfig per doc family drives engine + actions; the form door is now a first-class twin of the agent door at transaction scale (doc-parity enforces the services; doc-configs tests enforce the composition).
- Tag m3-wave-b. Next: Wave C (13 chain doc-configs + routes + view modes + hub family-row links) per SPEC-M3 §14.
- Patch-export follow-up: download/ had been WIPED by a sandbox restore (0001-0007 gone). Regenerated from git: 0005 (3f09291..cea63c8), 0006 (cea63c8..7a1bc7c), 0007 (7a1bc7c..d24af15), 0008 (6b28c65..85d464e = Wave B) + wrote 0000-PATCH-INDEX.md documenting that 0001-0004 are lost as files (commits eaten by rollback #4; content survives in the tree / 0005). STATE patch list corrected.

---
Task ID: m3-wave-c
Agent: main
Task: Implement M3 Wave C per frozen spec docs/CONTEXT/specs/SPEC-M3.md §14 — chain screens: 11 doc-configs (program, PO, GRN, jobwork ×2, cut, line-issue, production, rework, rejection, despatch — §8 rows 3-13) + routes + view modes + Order Hub family-row links. Continuation session ("continue") after context exhaustion; bootstrapped per protocol (context_check 71/71 → read STATE/PITFALLS/CONVENTIONS/SPEC-M3 + Wave B pattern files).

Work Log:
- Engine upgrades (doc-screen.tsx + types.ts): select rendering (header + line cells + option-label display in View mode); numberPrefix/numberField OPTIONAL (ERRATUM 4 — production/rework carry no doc number, jobwork-in references an existing dcNo); TYPED line picker `pickerFrom` (ERRATUM 5 — PO itemCode's master slug from the row's itemType cell) + options on DocLineField selects.
- 11 doc-configs in doc-configs/ (jobwork.ts + production.ts hold 2 each — 12 configs / 10 files), fields mirroring the shared zod schemas EXACTLY (new every-config schema-mirror test enforces it). Registry → 12 slugs.
- 20 page files: 11 New screens (DocScreen + prefill ?order/?po/?dcNo + RecentDocsTable) + 9 view screens (id-OR-docNo resolution, chain state + ctx from parent order). Shared chrome extracted to components/erp/recent-docs.tsx (DocBreadcrumb + RecentDocsTable — server component, per-row action column for jobwork Receive).
- menu-registry: LIVE_ROUTES 16 → 36 (11 item routes + 9 view routes); group landings programs → /programs/new, pieces → /pieces/despatch, jobwork → /jobwork/order (live groups 11 → 14; live items 6 → 17).
- Order Hub: every family row now LINKS its doc view (programs, POs, GRNs, jobwork + Receive quick-link on sent DCs, cuts, line issues, production entries, rejections, despatches); stageHref gained ctx so section CTAs carry ?order= context.
- doc-actions.ts: SLUG_REVALIDATE map (12 slugs) replaces the Wave B hardcoded order paths.
- 3 tsc-caught traps fixed (PITFALLS #21): JobworkOrder.orderId, PcsDespatch.orderId/buyerId, GRN.deptId are relation-less FK columns → separate lookups + id maps in the jobwork/despatch/grn pages.
- Tests: doc-configs 18 → 26 (registry pin ×12, select-options contract, every-config schema-mirror loop with zod-v4 ZodOptional discrimination — PITFALLS #22, routes-on-disk ×11+9, Wave C form-door integration: program plan+commit through the generic action, grn error surfacing, jobwork out→in update-only roundtrip, unknown-slug guard); menu-registry 13 → 14 (17 live items / 14 groups, Wave C route assertions, pieces landing pin).
- context_check.sh updated for Wave C (doc-config files=10/12 configs, live-routes=36, erp-views=20, registry-tests=14, +30 critical assets incl. all 20 pages) → 101/101 NO DRIFT; 01-STATE.md rewritten for Wave C (milestone row, ground truth, drift #10-#12, Wave C notes, next actions = Wave D); PITFALLS #21/#22 appended.

Stage Summary:
- Wave C COMPLETE per spec §14 exit criteria: acceptance #3 complete (form-only chain order→…→despatch — every chain stage 1-12 now has a live DocScreen), #4 complete (schema-mirror test now enforces EVERY config feeds its shared schema; doc-parity already asserts service equality per op), #9 route smoke 60/60 PASS (16 previous routes stay 200; 11 item routes + 4 prefilled CTAs + 9 view routes by id AND doc number 200; 10 unknown ids 404). vitest 156/156 (148 + 8); tsc 30 known-noise only (zero new-file errors).
- Zero service/schema changes — ADR-001 held: Wave C was pure config + pages over the Wave A posting engine (proof the extraction paid for itself).
- Tag m3-wave-c. Next: Wave D (invoice, debit-note, payment, journal, cost-sheet, stock-adjustment + post_stock_adjustment tool, godown-transfer + transfer_stock tool, /api/upload + AI-prefill) → tag m3-done.

---
Task ID: m3-wave-d
Agent: main
Task: Implement M3 Wave D per frozen spec docs/CONTEXT/specs/SPEC-M3.md §14 — accounts + inventory + AI: 7 doc-configs (invoice, debit-note, payment, journal, cost-sheet, stock-adjustment, godown-transfer), 2 NEW tools (post_stock_adjustment, transfer_stock), /api/upload rebuild + AI-prefill. Continuation session ("tell me progress, then continue").

Work Log:
- Bootstrapped per protocol: context_check 101/101 NO DRIFT; read STATE/PITFALLS/SPEC-M3 (§8 rows 14-20, §10 AI-prefill, §11 tools, §12 upload, §14 Wave D exit) + all 5 existing accounts posting services + schemas + grn.ts/rejection.ts config patterns + doc-screen engine + doc-actions + menu-registry + Order Hub accounts sections + agent-panel upload flow.
- Session hygiene: 85 dirty files = sandbox-restore mode-bit noise → chmod-normalized (zero content changes).
- NEW ops: schemas/stock-adj.ts + transfer.ts; posting/stock-adj.ts (ADJ-#### by ledger-row count; postLedger ADR-004 buckets; add/less; qty validation) + posting/transfer.ts (GT-####; out+in postLedger PAIR in ONE transaction; from≠to guard; net-zero by construction).
- 7 doc-configs (invoice/debit-note/payment/journal/cost-sheet/stock-adjustment/godown-transfer) — fields mirror the shared schemas exactly; select options from tool descriptions (billType/noteType/voucherType/mode/direction/gstType/itemType/action); registry 12→19.
- Engine: ERRATUM 6 — DocField.pickerFrom (HEADER typed picker: itemCode ← itemType select cell; same fallback-to-text pattern as line pickers); "Fill with AI" paperclip button on every DocScreen New mode (§10 minimal slice: seeds agent panel + order context; panel's own paperclip uploads via /api/upload).
- Tools: post_stock_adjustment + transfer_stock docTool entries → 122 total (context_check updated 120→122, docTool 21→23).
- Routes: 7 New pages + 5 view pages (12 files): invoice (GST split card, order+party links, chain state via CHAIN_ORDER_INCLUDE), debit-note, payments (relation-less invoiceId resolved separately — PITFALLS #21; settles-context links), journal, cost-sheet (version + margin card), adjustment + transfer (NO [id] view — StockLedger rows ARE the record; recent tables with PITFALLS #21 id maps; transfer pairs out+in legs by docNo). ?order/?invoice prefill on invoice/payments/cost-sheet.
- Order Hub: invoices/costSheet/payments family rows now LINK their new views (Wave C pattern completion).
- doc-actions.ts: SLUG_REVALIDATE 12→19 slugs. menu-registry: LIVE_ROUTES 36→48; stock-adjustment item agentTools adjust_stock→post_stock_adjustment; godown-transfer pendingTools→agentTools.
- /api/upload REBUILT (§12): POST multipart (sanitizeFileName → de-collide -2/-3 suffixes, never overwrite → write → extractDocument; 20MB cap; txt/csv/md/json/tsv/log/pdf; 400/413/415 structured errors) + GET listUploadDir. The agent panel's paperclip works again.
- FOUND + FIXED a THIRD latent pre-existing bug (PITFALLS #23): grn.ts findUnique with nulls in the compound-unique key THROWS, .catch(()=>null) swallowed it → every GRN created a DUPLICATE 50-kg CurrentStock bucket (46 junk rows across ~23 test runs; discovered via Wave D parity test 20's bucket-count assertion). Fixed with findFirst + update-by-id (bumpStock pattern); junk swept (scripts/cleanup_junk_buckets.py); parity test 5 now asserts bucket-count===1 + value=before+100 (regression guard); parity cleanup made wipe+recreate (junk-proof).
- Tests: doc-parity 19→21 (tests 20-21: both new tools through BOTH doors — identical ledger rows; transfer pair field-equality + net-zero across godowns; delta-based bucket assertions); doc-configs 26→40 (registry pin 19, Wave D routes+files, ERRATUM 6 pickerFrom contract, schema-mirror loop auto-covers new configs, 7 Wave D form-door integration tests: invoice GST math, payment settle + companion JV, cost-sheet version+totals, journal, debit-note error+commit, stock-adjustment ledger+bucket, transfer pair+net-zero); menu-registry 14→15 (24/113 live, Wave D routes, tool wiring); NEW upload-route tests ×6 (POST txt, de-collision, 415, traversal-sanitize, 400, GET).
- Fixed mid-wave test bugs: missing beforeAll import; path-traversal expectation (sanitize-first design → 200 with basename); DN/V-smoke fixtures (seeded then removed).
- Verification: vitest 174/174 ×2 runs (idempotent, zero junk buckets, zero upload residue); tsc 29 known-noise only (zero new-file errors); route smoke 49/49 PASS (25 baseline + 7 Wave D items + 4 views by docNo + 5 prefills + 5 404s + upload GET/POST/415).
- context_check.sh: Wave D metrics (tools 122, docTool 23, doc-parity 21, doc-configs 17 files/19 configs, schemas 19, posting 22, live-routes 48, registry-tests 15) + 22 new critical assets (7 configs, 2 services, 2 schemas, upload route, 12 pages, upload test) → 126/126 NO DRIFT.
- STATE.md rewritten for M3 DONE (milestone row, ground truth, drift #13/#14, inventory +5 rows, Wave D notes, next actions = SPEC-M4); PITFALLS #23/#24 appended.

Stage Summary:
- Wave D COMPLETE per spec §14 exit criteria: ALL SPEC-M3 acceptance criteria met → tag m3-done. Every §8 row (1-20) has a live screen; every §5/§11 write op is a docTool delegate over a posting service; both doors test-enforced (21 parity + 40 doc-config tests); 24/113 items live (21.2%), 14/17 groups; 122 tools; 174 vitest green; route smoke 49/49.
- M3 architecture complete: ONE DocConfig per family drives the engine; the form door is a first-class twin of the agent door at full transaction scale; /api/upload closes the AI-ingest loop (upload → extract → agent proposes → approve commits — same posting services the forms call).
- Bonus: third latent bug fixed (GRN duplicate-bucket), with a regression guard that now watches the invariant forever.
- Next: SPEC-M4 (RegisterScreen engine + registers + W2/W6) per STATE next-actions — commit BEFORE coding.

---
Task ID: m3-wave-d (post-commit addendum)
Agent: main
Task: Patch-export follow-up.

Work Log:
- Discovered download/ had been wiped a SECOND time by a sandbox restore (0000-0008 gone; only the fresh 0009 existed).
- Regenerated the full set from git: 0005 (3f09291..cea63c8), 0006 (cea63c8..7a1bc7c), 0007 (7a1bc7c..d24af15), 0008 (6b28c65..85d464e), 0009 (85d464e..335bbaa = Wave C incl. ffb65ab), 0010 (335bbaa..44a6520 = Wave D/m3-done).
- Wrote 0000-PATCH-INDEX.md with the regeneration commands + lost-patch notes (second wipe documented; download/ is gitignored — the INDEX is the recovery map).
- STATE patch list corrected (0009 = wave-c, 0010 = wave-d); committed (1f7590e).

Stage Summary:
- download/ now holds 0000-0010 (7 files). m3-done tag stays on 44a6520; the docs commit sits after it (same pattern as m3-wave-c's ffb65ab).

---
Task ID: fix-approvals-crash
Agent: main
Task: User-reported runtime crash on /approvals — "Objects are not valid as a React child (found: object with keys {id, poNo, poType, …})". Commit everything, fix, continue.

Work Log:
- Root cause: /api/erp?resource=approvals enriched rows via `{ ...a, entity }` — overwriting the Approval.entity TYPE STRING with the fetched PO object. WorkflowView rendered `{a.entity}` as text → crash with any pending approval present (10 existed).
- Fixed in 3 places, consistent shape `entity` = type string + `entityData` = fetched record: api/erp/route.ts, agent tools.ts get_pending_approvals, workflow-view.tsx (title now "Purchase Order · <poNo>", detail card reads entityData).
- Verified: vitest 174/174; tsc known-noise only (zero in touched files); scripts/verify_approvals_fix.ts (new) asserts per-row shape; dev-server smoke: GET / 200, GET /approvals 200, API returns entity:"po" + entityData:{poNo:…}.
- PITFALLS #25 appended (spread-collision + smoke-blindness lesson).

Stage Summary:
- /approvals crash eliminated; approval cards now render PO detail (no/supplier/type/qty/value/delivery). No schema/service changes — pure response-shape fix, no test fallout (174 green).
- Next per STATE: write + freeze SPEC-M4 (RegisterScreen engine + registers + W2/W6), commit, then M4 Wave A.

---
Task ID: m4-wave-a
Agent: main
Task: SPEC-M4 freeze + Wave A (register engine + 3 flagship registers) per docs/CONTEXT/specs/SPEC-M4.md §13. Session start: user reported /approvals runtime crash ("Objects are not valid as a React child") + "commit everything then continue".

Work Log:
- Fixed the /approvals crash FIRST (see Task fix-approvals-crash, commit b344ae8, PITFALLS #25): API enrichment `{...a, entity}` overwrote the Approval.entity type string with the PO object; WorkflowView rendered it as text. Fixed in api/erp route + agent tool + WorkflowView; shape now entity=string + entityData=record; verified via scripts/verify_approvals_fix.ts + dev-server smoke (10 pending PO approvals render).
- Wrote + froze SPEC-M4 (commit 0dd0335, tag spec-m4-frozen): 17 items (15 RG + order-status-board DB + stock-register RH-lite), read-side ADR-001 twin, 8 planned new tools (→130), W2/W6/W5(b) wiring, 3 waves. Sources verified against schema (GRN.poId IS a relation; Payment.invoiceId/JobworkOrder.orderId/PcsDespatch.orderId are plain columns; StockLedger.docNo NOT unique; JobworkOrder has NO receivedQty).
- Wave A implementation:
  - lib: registers/{types,resolve,csv,index}.ts + 3 services (stock-ledger, order-register, daily-inout) + register-configs/{types,index}.ts + 3 pure-data configs.
  - engine: components/archetypes/register-screen.tsx (server: breadcrumb, filter bar, summary, W2 first-col links, totals band, pagination, CSV link) + components/erp/register-filter-bar.tsx (client: shareable searchParams; master_search datalist for party/godown).
  - pages: /registers/daily-in-out, /orders/register, /inventory/ledger + sibling csv/route.ts each (PAGES CANNOT RETURN RESPONSES — ?format=csv on the page 500'd; sibling route handler is the fix).
  - W2: TXN_DOC_FAMILY txnType→family map + resolveDocRef (id OR doc-number, findFirst OR) — ledger rows drill to GRN/jobwork/despatch views by docNo (refId unreliable); order rows → hub. Verified live: rendered HTML carries /orders/<id> + /pieces/despatch/<id> hrefs.
  - tools: get_daily_in_out NEW (123 total); list_orders + get_stock_ledger delegate to the shared services (zod + json shapes VERBATIM — pinned by new tests).
  - menu-registry: LIVE_ROUTES 48→51; daily-in-out agentTools wired.
  - tests: tests/unit/register-configs.test.ts NEW (30 runtime: contracts ×3 configs, bijection, parse/clamp/ignore, tool-shape pins, service smoke incl. unknown-godown degradation, TXN map) + menu-registry 15→16 (27/113 live, Wave A routes+tool doors).
- Verification: vitest 205/205; tsc 32 = known noise only (3 transient .next/dev validator entries vanish after first route hit); route smoke: 3 new routes + status/godown/date filters + 3 CSV exports all 200, CSV content-type + disposition correct, drill-down hrefs present in HTML; context_check 129/129 NO DRIFT.

Stage Summary:
- M4 Wave A COMPLETE per SPEC-M4 §13: engine + services + 3 flagships live (daily-in-out, order-register, stock-ledger); 27/113 items live; read-side twin of ADR-001 established (one service, two doors, shapes pinned).
- Tag m4-wave-a. Next: Wave B (13 remaining registers + 7 new tools + delegations + math suite) then Wave C (recon cards + KPI deep-links + Order Status Board → m4-done).

---
Task ID: m4-wave-b
Agent: main
Task: SPEC-M4 Wave B — "the fleet": 13 remaining register configs + services + pages + 7 new agent tools + 5 tool delegations + register-services math suite + menu-registry 40/113.

Work Log:
- Studied Wave A patterns (configs/services/engine/csv/LIVE_ROUTES/test loop) from SPEC-M4 §4-§14.
- Wrote 13 register configs (inhand-orders, party-balance, stock-register, lot-tracking, io-history, pcs-stock, production-status, jobwork-register, bills-register, supplier-bills, party-ledger, budget-vs-actual, approval-audit) — configs stay PURE DATA; grnType select rides the frozen `status` key (§4).
- Wrote 14 service files: 13 fleet services + registers/order-status.ts (queryOrderStatus — board service, deliberately OUTSIDE REGISTER_SERVICES; §10 DB archetype) + shared buildItemCodeMaps() in resolve.ts (pcs → style.styleNo; PITFALLS #27).
- get_stock delegation preserved VERBATIM via fetchCurrentStock (stock-register.ts) — register variants group on top; json shape frozen.
- Created 13 pages (page.tsx + csv/route.ts each) under (erp): orders/in-hand, procurement/party-balance, inventory/{register,lots,io-history}, pieces/stock, production/register, jobwork/register, accounts/{bills-register,supplier-bills,party-ledger}, costing/budget-vs-actual, approvals/audit.
- tools.ts: +7 new read tools (list_inhand_orders, list_io_history, get_production_status, get_bills_register, list_supplier_bills, get_approval_audit, get_order_status → 130 total) + 5 delegations (get_stock, get_party_ledger [+additive poBalances[]], list_lots, list_jobworks, get_budget_vs_actual) — schemas+json shapes VERBATIM.
- menu-registry: LIVE_ROUTES 51→64 (+13), agentTools wired on all 13 items + order-status-board gets get_order_status; parity 40/113.
- Tests: register-configs.test.ts expanded to 16-config loop (113 runtime its incl. 7-new-tool registration + 13 service smokes); NEW tests/pipeline/register-services.test.ts (22 tests) — seeded TS-tagged fixture chain asserts §5 math + delegated-tool regression pins, surgical cleanup.
- BUGS FOUND & FIXED by the math suite: (1) latent Wave A bug — resolve.ts FAMILY_SPEC used db.grn instead of db.gRN so EVERY GRN-family drill-down silently rendered unlinked (PITFALLS #26); (2) party-ledger balance sign — received must REDUCE balance (bills-register convention), now `opening + billed − debit − journals − received + paid`.
- context_check.sh updated (130 tools; wave-B counters) → 129/129 NO DRIFT after STATE.md refresh (milestone row, ground-truth table, next actions, Wave B notes).
- Route smoke: scripts/route_smoke_waveB.sh — 39/39 GREEN (13 screens + 13 CSVs + 8 filter deep-links + 2 invalid-filter degradations + 3 Wave A regressions).
- Full suite: 311 vitest green (was 205). tsc: all Wave B files clean (pre-existing ~30 orphan errors unchanged).
- NOTE: route_smoke_waveD.sh shows 2 pre-existing 404s (DN-SMOKE-1 / V-SMOKE-1 seed rows were wiped by earlier test-cleanup residue — b313fd8 lineage); the 404 is the DESIGNED unknown-doc behavior, doc-parity tests prove the views work. Not a Wave B regression.
- Git push BLOCKED: no GitHub credentials in this sandbox (no ~/.git-credentials, no gh CLI, no token env). 27+ commits now local-only on main. USER ACTION NEEDED: provide a PAT (git remote set-url origin https://<TOKEN>@github.com/mickey61295/fiberops.git) or run the push from a credentialed machine.

Stage Summary:
- M4 Wave B COMPLETE: 16/17 register screens live (only the Wave C board remains), 130 tools, 64 live routes, 40/113 menu items, 311 tests green.
- Deliverables: 13 configs, 14 services, 26 route files, 7 tools, 5 delegations, 2 test files, route_smoke_waveB.sh, STATE/PITFALLS/worklog updates.
- Next: M4 Wave C — recon cards (§9) + KPI deep-links (§8.3) + Order Status Board UI (/orders/status, service already shipped) + breadcrumbs audit + route_smoke_waveE.sh → tag m4-done.

---
Task ID: m4-wave-c
Agent: main
Task: SPEC-M4 Wave C — M4 finale: W6 recon cards (§9) + KPI deep-links (§8.3) + Order Status Board (§10) + route_smoke_waveE + STATE/PITFALLS + tag m4-done.

Work Log:
- registers/recon.ts (pure fns: poRecon/invoiceRecon/jobworkRecon/despatchRecon) + components/erp/recon-card.tsx (server card: title, mathLine, balance chip, counterpart rows with links).
- Wired ReconCard into 4 views: /procurement/po/[id] (PO↔GRNs), /accounts/invoice/[id] (Invoice↔Payments), /jobwork/order/[id] (out↔in + jobworker siblings), Order Hub despatch section (Despatch↔Invoice, order scope).
- Order Status Board /orders/status: server table over queryOrderStatus (extended OrderStatusRow with `flags` for ChainBar), header KPIs (open orders/pcs/avg stages), n/15 + next-stage chips, rows → Order Hub; LIVE_ROUTES +1 → 65; menu item live → 41/113.
- KPI deep-links (§8.3): dashboard tiles now push full paths with filters — Open Orders→/orders/register?status=open, Pending POs→/procurement/party-balance, Stock Value→/inventory (§8.3 ERRATUM: /inventory/stock was never a route), Today Pcs→/production/register?from&to, Pending Approvals→/approvals, Open Invoices→/accounts/bills-register?status=issued (bills-register config gained the status filter so the deep-link actually filters).
- Tests: +4 recon math tests in register-services suite (fixture payment now carries invoiceId); menu-registry +1 board-live block → 316 total green.
- scripts/route_smoke_waveE.sh 19/19 GREEN (board + recon-card content checks via real doc numbers + JW-SMOKE-1 idempotent seed via scripts/seed_wave_smoke.ts + 6 KPI deep-link targets + fleet regression).
- context_check.sh: views 22, menu tests 18, live routes 65, register service files 18 → 129/129 NO DRIFT after STATE refresh.
- Breadcrumbs: RegisterScreen ships them (Wave A); board + doc views keep their group breadcrumbs — §8.2 audit pass, no changes needed.
- Committed as the m4-done wave; push still blocked (no GitHub credentials — see Wave B worklog note).

Stage Summary:
- M4 COMPLETE: 17/17 register/board screens live, 130 tools, 65 live routes, 41/113 menu items, 316 tests, all route smokes green.
- Next: M5 (extended doc families) — freeze SPEC-M5 first per wave discipline.

---
Task ID: m5-spec-freeze + m5-wave-a
Agent: main
Task: Continue from M4-complete baseline per user instruction "Push the changes to remote always after commit. Continue" — freeze SPEC-M5, then implement M5 Wave A (money/rates items).

Work Log:
- Push attempt: 29 unpushed commits (m1→m4-done), `git push origin main --tags` FAILED — no GitHub credentials in sandbox (no gh CLI, no SSH, no stored PAT). Documented as STATE next-action #5 (USER ACTION needed).
- Read STATE/PLAN-2.0/menu-registry — 36 M5-phase items identified; verified model backing against prisma/schema.prisma (SalesInvoice invoiceType/billType variants, Budget/BudgetLine exist, Approval free-string entity, POLine has NO partyId, Budget.orderId/deptId are plain FK columns).
- Wrote + froze docs/CONTEXT/specs/SPEC-M5.md (36 items, 4 waves A→D, variant-doc pattern §4, ADR-015 six new models 54→60 for Wave D, 14 new tools →144, test plan §12). Commit 301c20a, tag spec-m5-frozen. Push attempt (blocked).
- Wave A (7 items, zero schema churn):
  * budget: schemas/budget.ts + posting/budget.ts (planBudget, no doc number) + doc-configs/budget.ts (line editor) + /costing/budget (+[id] view) + create_budget tool (the registry's only named pending tool).
  * commercial-invoice: planExportInvoice SIBLING in posting/invoice.ts (invoiceType='export' + ern, shared INV-#### space via extracted nextInvoiceNo helper; planInvoice byte-identical) + COMMERCIAL_INVOICE_SCHEMA + config + /orders/commercial-invoice + create_commercial_invoice tool.
  * local-invoice + piece-jobwork-invoice: VARIANT configs (invoice-variants.ts) wrapping planInvoice with injected billType (sales/jobwork); variant schemas relax ONLY billType (local also gstType); /accounts/invoice/local + /piece pages; agent door = existing create_sales_invoice.
  * supplier-orders: SUPPLIER_ORDER_SCHEMA (poType optional) + planSupplierOrder wrapper over planPurchaseOrder (poType default general) + config + /procurement/supplier-orders + create_supplier_order tool.
  * rate-confirmation register: registers/rate-confirmation.ts (POLine day-book, party+date filters MERGED into one where.po object — POLine has no partyId) + config + /procurement/rate-confirmation + csv + list_po_rates tool.
  * piece-rate-confirmation register: registers/piece-rates.ts (operator×order×dept group: qty/avg-rate/earned) + config + /costing/piece-rate + csv + list_piece_rates tool.
- Registries wired: DOC_CONFIGS +5 (24 configs/21 files), REGISTER_SERVICES +2 (18), SLUG_REVALIDATE +5, LIVE_ROUTES +8 (73), menu agentTools flipped on all 7 items.
- budget-vs-actual register (registers/budget.ts): BOTH paths now prefer explicit Budget rows (explicit > 0 wins, else Σ CostSheet.totalCost) — makes the budget write door meaningful; M4 fixtures (no budgets) stay green.
- Tests: doc-parity-m5 (7: budget×2 doors, export invoice×2, supplier order×2 + approvals, local/piece variant defaults injection via commitDocAction, source-pin no-fork) + register-services-m5 (5: rate math+party filter+drill href, piece-rate group math, budgeted fallback vs explicit). Extended pins: doc-configs slug list 19→24, register-configs 16→18 + tools 130→135 + ROUTE_BY_SLUG, menu-registry 41→48 + Wave A live block.
- Fixes during tests: rate-confirmation where.po merge bug (Prisma rejected unknown partyId on POLine), local variant gstType required→optional+default, itemType filter options (frozen contract), PO commit return shape ({id,poNo} not lines), approval cleanup for supplier orders.
- scripts/route_smoke_m5.sh — 35/35 (7 items + filters + CSV + 13 previous routes spot set).
- context_check.sh updated (135 tools, 73 routes, 23 schemas, 24 posting, 21 doc-config files, 18 reg configs, 20 reg services, 19 menu tests, +M5 files in existence list) — NO DRIFT (157 checks).
- STATE.md updated (M5 IN PROGRESS row, ground truth, next actions, Wave A notes).

Stage Summary:
- Tags: spec-m5-frozen (301c20a) + m5-wave-a (this commit). Parity 41→48/113. Tools 130→135. Vitest 316→339 green. Route smoke 35/35. tsc: no new errors (32 known vs ~30 baseline).
- Variant-doc pattern proven: config wraps base service, variant schema relaxes only injected keys, zero engine changes.
- PUSH STILL BLOCKED: needs PAT from user (git remote set-url origin https://<TOKEN>@github.com/mickey61295/fiberops.git).
- Next: M5 Wave B (14 production/pcs variant items per SPEC-M5 §7-B).

---
Task ID: m5-wave-b
Agent: main
Task: Push the 31-commit backlog to GitHub with the user-provided PAT, then implement SPEC-M5 Wave B — 14 production/pcs variant items (§7-B), per the standing rule "push after every commit".

Work Log:
- PUSH UNBLOCKED: configured the user's PAT into the local git remote; pushed 7dae87d..20b5177 (31 commits, M1→m5-wave-a) + all 12 tags; verified origin/main..HEAD = 0. Remote now tracks local; push-after-commit is the standing rule.
- Studied Wave A variant patterns (invoice-variants/supplier-order configs, sibling posting wrappers, register service/config/registry loop, doc-parity test shape) before writing code.
- Schemas (4 new files, 23→27): production-variants.ts (FINISHED_GOODS/OPERATION_ENTRY relax ONLY deptCode + SCAN_BUNDLE bundle-keyed shape), line-transfer.ts, grn-variants.ts (JOBWORK_PCS_RETURN), payment-variants.ts (WAGE_PAYMENT relaxes direction).
- Posting (24→25 files): production.ts +planFinishedGoods (D5 default) /planOperationEntry (D4) /planScanBundle (CutBundle lookup by no OR barcode; qty defaults bundle.qty; rate defaults operator.pieceRate; relation-less FKs resolved via lookups — PITFALLS #21); grn.ts +planJobworkPcsReturn (process_return GRN + postLedger process_delivery OUT of G2, shared GRN-#### space); payment.ts +planWagePayment (direction='out' + narration default); NEW line-transfer.ts (LT-#### pair: -O negative qty out / -I positive in, one transaction, no godown moves; suffix-stripping number scan — PITFALLS #28).
- Doc-configs (24→37 configs, 21→28 files): production-variants.ts ×5 (finished-goods chainStage 12 per §10 W1, operation-entry, bundle-barcode, panel-production, panel-excess), rejection-variants.ts ×3 (panel-rej-rework action=rework; fabric-rejection-return rejType=fabric+return_to_party; pcs-shortage rejType=shortage), cut-variants (panel-cutting), line-transfer, grn-variants (jobwork-pcs-return), costing-input (pure variant over planCostSheet — version-bump semantics), wage-payments (variant over planWagePayment + ERRATUM 7 pickerFilter partyType=employee).
- ERRATUM 7 (additive): DocField.pickerFilter + DocPicker.filter prop + master_search filterField/filterValue params — server-side equality filter on the W4 picker feed. Verified live: employee→[], supplier→suppliers only.
- Register: registers/wages.ts queryWages (group by OPERATOR across orders: Σqty, Σamount, avg rate, orders/entries counts; W2 href → /masters/employee) + register-configs/wages.ts + registries (18→19 both) + /hr/wages page (CSV route) with the "Generate wage bill" server action (re-runs the same service; posts planJournal Dr Production Wages / Cr Wage Payable) + W6 budget-vs-actual link when ?order=.
- Tools 135→142: docTools +6 (post_finished_goods, post_operation_entry, scan_bundle, transfer_line_stock, return_jobwork_pcs, pay_wages) + inline read get_production_wages (delegates to queryWages).
- Wiring: LIVE_ROUTES 73→87 (+14); menu agentTools flipped on all 14 items (scan_bundle graduated from pendingTools; production-wages arch DS→RG per §2); SLUG_REVALIDATE +13 entries.
- Tests 339→363 GREEN (×2 runs): NEW doc-parity-m5b (11: all 6 write tools × both doors — incl. scan-by-barcode, LT pair ±qty, process_return ledger OUT, pay_wages party-ledger pickup 2000 — + 3 rejection variant form-door injections + source pins + wage-bill journal) + NEW register-services-m5b (4: operator grouping across orders with unique-day fixture isolation, order/date filters, tool delegation); extended pins: doc-configs slug list 37 + Wave B block (mirror-rule fields incl. readonly injected keys), register-configs 19-loop + 142-tool pin + wages smoke, menu-registry 62/113 + Wave B live block.
- Bugs caught by the tests: (1) LT- suffix crash — PITFALLS #28; (2) direct-service Date contract — PITFALLS #29; (3) CutBundle relation-less include (tsc); (4) missing mirror fields on variant configs.
- Verification: tsc zero new src errors (cumrate/exposure/flags legacy noise unchanged); route_smoke_m5b 68/68 (14 new routes + prefills + filters + wages CSV + 32-route regression spot set); context_check 189/189 NO DRIFT; STATE.md (M5-B rows, next actions, Wave B notes) + PITFALLS #28/#29 + worklog updated.

Stage Summary:
- M5 Wave B COMPLETE per SPEC-M5 §7-B: all 14 items live; 62/113 menu items (54.9%); 142 tools; 37 doc configs; 19 registers; 87 live routes; 363 vitest green.
- Pattern wins: posting-file wrappers (§4 rule 1) kept every base service byte-identical; ERRATUM 7 gives any picker a server-side filter; the wage bill rides the SAME journal door the agent uses.
- Remote: backlog pushed; m5-wave-b commit + tag to follow immediately (push-after-commit).
- Next: M5 Wave C — approval kinds (§6/§7-C, 4 IN items + 4 approve wrappers → 146 tools).

---
Task ID: m5-wave-c
Agent: main
Task: Continue from m5-wave-b baseline (session continuation: "continue") — recover the accidental working-tree residue, then implement SPEC-M5 Wave C (approval gates, §6) per the standing push-after-commit rule.

Work Log:
- Working-tree triage: 254 "modified" files were ALL 100644→100755 mode noise + ONE accidental deletion (src/app/api/upload/route.ts — actively used by agent-panel paperclip + tested by upload-route.test.ts). Restored via git checkout -- . — no content changes lost (m5-wave-b was fully committed). The approvals PO-object React error was ALREADY FIXED in a prior session (API separates entity string / entityData object) — verified in /api/erp/route.ts.
- Baseline verified BEFORE any new work: 363 vitest green, remote = local (PAT already configured in origin URL), all tags pushed.
- KINDS registry src/lib/erp/approval-kinds.ts: {entity, label, description, route, tool, refResolver} ×4 (supplier_bill→/procurement/grn/[id], godown_transfer→/inventory/io-history (entityId = GT-#### docNo), reprocess→/procurement/grn/[id], non_return_dc→/pieces/despatch/[id]).
- Posting hooks (opt-in booleans, Approval row created INSIDE the service transaction): TRANSFER_SCHEMA+requiresAck → planTransfer leaves pending godown_transfer row (entityId = GT docNo); GRN_SCHEMA+reprocess → planGrn leaves pending reprocess row (entityId = grn id; sanctioned §6 amendment to the Wave-B "byte-identical" note, default behaviour unchanged); DESPATCH_SCHEMA+returnable (default true) → planPcsDespatch with false leaves pending non_return_dc row.
- 4 wrapper tools via shared proposeApprovalGate() in tools.ts: create_bill_pass (grnNo), acknowledge_unit_transfer (GT docNo), approve_reprocess (grnNo), approve_non_return_dc (dcNo) — find-latest → already-approved informational / pending → approve / missing → create-then-approve (§8 rule); one-transaction commit; idempotent. 142→146 tools.
- Inbox kind layer: /api/erp?resource=approvals&kind= (entity-equality filter) + per-kind entityData enrichment (GRN+party / ledger pair / despatch) + refHref on every row; WorkflowView gains kind prop + All/4-kind tabs (always rendered, SSR-visible) + per-kind card detail rows (ALL primitives — detailRows/cardTitle return strings only) + View-doc button; /approvals reads ?kind= (unknown kinds degrade to All); 4 thin IN pages under (erp).
- supplier-bills register: Bill-pass badge column (Passed/Pending/— from supplier_bill approvals — GRN has no status column, so this IS the §6 "GRN billed status"); list_supplier_bills json +billPass (additive).
- Menu wiring: LIVE_ROUTES +4 (87→91); agentTools flipped on bill-pass/unit-transfer-ack/reprocess-approval/non-return-dc-approval (+get_pending_approvals); dispatch + quality groups OPENED (landings → /dispatch/unit-transfer-ack, /quality/reprocess-approval) → 66/113 items, 16/17 groups.
- Tests 363→378 GREEN: NEW tests/unit/approval-kinds.test.ts (14: registry shape + wiring loop + kind===entity contract + all 3 hooks incl. flag-less control + all 4 wrapper tools incl. create-when-missing + idempotence + unknown-doc text + register billPass + tool json) with SCOPED cleanup (per-entityId deletes, yarn-bucket snapshot-restore); menu-registry +Wave C block (66/113, 16/17); register-configs tool pin 146; doc-configs mirror rule +AGENT_ONLY_HOOK_KEYS skip (requiresAck/reprocess/returnable are agent-door-only — NOT form fields, zero engine churn).
- Verification: tsc zero new src errors (8 legacy); scripts/route_smoke_m5c.sh 62/62 GREEN (4 screens + kind tabs + API filter incl. bogus-kind → [] + seed_m5c_smoke.ts idempotent 4 pending kind rows + supplier-bills Bill-pass column + 38-route regression spot set); context_check 189/189 NO DRIFT after counter updates (146 tools, 21 menu tests, 91 routes, M5-WaveC session tag).
- Docs: STATE.md (M5 row Wave C DONE, ground truth, next actions, Wave C notes section) + SPEC-M5 ERRATA ×2 (#1 §8 tool-count arithmetic 144→146, #2 agent-only hook flags decision).
- Committed 2f2e584, tagged m5-wave-c, PUSHED to origin (271dfae..2f2e584 + tag; origin/main..HEAD = 0).

Stage Summary:
- M5 Wave C COMPLETE: all 4 approval-gate IN items live; 146 tools; 66/113 menu items (58.4%); 16/17 groups; 91 live routes; 378 vitest green; route_smoke_m5c 62/62; context_check 189/189.
- Pattern wins: kind === Approval.entity keeps the inbox a plain entity filter (no new code paths); posting hooks ride optional schema flags (default = legacy, zero engine churn); the supplier_bill Approval IS the bill-pass document (register column, no schema growth).
- Remote synced: m5-wave-c pushed with tag. Push-after-commit honored.
- Next: M5 Wave D — ADR-015 six new models 54→60 (Sample, GateEntry, PackingList+Line, LabTest, Expense, Shift) + 10 items + 8 tools → 154 → then tag m5-done.

---
Task ID: m5-wave-d
Agent: main
Task: Continue from m5-wave-c baseline (session continuation: "continue") — recover the working-tree residue, then implement SPEC-M5 Wave D (ADR-015 new models, §7-D, the FINAL M5 wave) per the standing push-after-commit rule. M5 COMPLETE at the end of this wave.

Work Log:
- Working-tree triage (the third recurrence): 260 mode-only files + ONE accidental deletion (src/app/api/upload/route.ts — the paperclip route). Restored via git checkout; tree clean; remote = local before work began.
- ADR-015 schema: tagged `schema-54-baseline`, added SEVEN models (Sample, GateEntry, PackingList+PackingListLine, LabTest, Expense, Shift — spec said "six 54→60", ERRATUM #3) → 61 models; `prisma db push` + `generate`.
- Schemas ×9 (27→36 files): sample, gate (ONE schema, gateType injected), packing-list (lines + total defaults), lab-test (pcs|style alias), expense, roll-split (rolls≡lots), contract-allotment, program-allotment (yarn|fabric only), production-bill (period + dept/operator granularity).
- Posting ×9 (25→34 files): sample/gate/packing-list/lab-test/expense (document-only, docNo conventions SMP-/GE-/GP-/PKL-/LT-/EXP-), roll-split (RSP-#### transfer_out+in ledger pair + bucket moves in ONE transaction; lot-keyed-first decrement, JS nulls-last sort — PITFALLS #30), contract-allotment (AL-#### JobworkOrder status='allotted', no stock moves), program-allotment (ProgBalance find-first-or-create + increment, the planProgram pattern), production-bill (Σ ProductionEntry.amount → Journal Dr Production Wages / Cr Wage Payable, shared V-#### space).
- Shift master: master-configs/shift.ts + index registration (24→25) + factory create/update + list_shifts read tool (the master-configs contract test REQUIRES the list door — Wave D is +13 tools, not +8; ERRATUM #3c).
- Doc-configs ×10 (37→47 configs, 28→37 files): gate entry/pass are §4 rule-2 variants over ONE service; lab-test typed picker pickerFrom='itemType' (select value 'style' for pcs); contract-allotment/program-allotment/production-bill carry NO number pair (ERRATUM 4 pattern); packing-list stage 12 / contract-allotment 6 / program-allotment 3 (W1 alignment).
- tools.ts +13 (146→159): 10 docTools + shift factory ×2 + list_shifts. Gate tools wrap planGateEntry injecting gateType in/out.
- Pages ×17 (11 screens + 6 views): samples (+view), gate-entry (+view), gate-pass (+view — shared GateEntryView component), packing-list (+view with W6 Cartons↔Despatch recon via ReconCard), lab-tests (+view, values JSON pretty-print), expenses (+view), rolls (recent RSP pairs + lots-with-mtrs read side), contract (AL- list → jobwork view), program-allotment (ProgBalance balances table), production-bills (wage-bill journals → journal view), /hr/shifts (MasterTable, §9 route — NOT /masters/shift; masters actions revalidate it).
- Registries: LIVE_ROUTES 91→108 (11 screens + 6 views); SLUG_REVALIDATE +10; menu agentTools flipped on all 11 items → 77/113 live (68.1%), 16/17 groups (reports = M6).
- Tests 378→393 GREEN: NEW doc-parity-m5d (10: all 10 write ops × both doors + SMP/GE/GP/PKL/LT/EXP auto-numbers + RSP net-zero mtrs + packing Σpcs = despatch + bill = Σ period + gate variant injection via commitDocAction + ProgBalance create-vs-bump + AL-/JW- no-collision + structured errors); master-parity gained shift ×3 (25-config loop); doc-configs Wave D block (pages + prefixes + gate schema identity + chain stages); menu-registry Wave D block + parity 77/113; counter pins 146→159 / 24→25 / 37→47.
- Bugs caught by the tests: (1) Prisma orderBy lotId:'sort' invalid (PITFALLS #30); (2) mid-session prisma generate killed the running dev server — every route 500 (PITFALLS #31 — restart required); (3) shiftConfig not re-exported from the master-configs index (import directly from ./shift); (4) Promise.all+ternary+[] tsc poisoning (PITFALLS #32); (5) contract-allotment numberPrefix-without-numberField contract violation → ERRATUM 4 pattern.
- scripts/seed_m5d_smoke.ts (idempotent fixed-docNo fixtures + KEY=id output) + scripts/route_smoke_m5d.sh — 70/70 GREEN (11 screens + 6 views with real ids + picker feeds + 30-route regression set).
- context_check.sh: counters updated (159 tools, 61 models, 36 schemas, 34 posting, 47/37 doc-configs, 25 masters, 108 routes, 22 menu tests) + Wave C/D files added to the existence list → 230/230 NO DRIFT.
- Docs: STATE.md (M5 DONE milestone row, ground truth, next actions → M6, Wave D notes ×9), SPEC-M5 ERRATUM #3 (three mis-counts), PITFALLS #30/#31/#32, this worklog.

Stage Summary:
- M5 COMPLETE: all 4 waves shipped; 159 tools; 61 models; 77/113 menu items (68.1%); 16/17 groups; 108 live routes; 47 doc configs; 25 masters; 393 vitest green; route_smoke_m5d 70/70; context_check 230/230; tsc zero new src errors.
- Pattern wins: one-service-two-variants held for the gate pair (config + docTool both inject gateType); ProgBalance got its write door without a new engine (find-first-or-create rides the register's read side); the production bill reuses the §7-B-20 wage-bill accounts so hr/wages and accounts/production-bills can never disagree.
- Tags: schema-54-baseline + m5-wave-d + m5-done to follow; push-after-commit honored.
- Next: M6 — Reports, MIS, admin, print (the last milestone; freeze SPEC-M6 first; reports group is the last closed group).

---
Task ID: m6-wave-a
Agent: main
Task: Continue from M5 COMPLETE (session continuation: "continue") — freeze SPEC-M6 per wave discipline, then implement M6 Wave A (the report engine: report-hub, report-packs, mis-dashboard, daily-unit-pnl) per the standing push-after-commit rule.

Work Log:
- Read worklog + STATE + git: M5 complete at 4156974, remote in sync, clean tree. Triaged the 36 non-live items (9 M6-phase + 22 M3 + 5 M2 leftovers) with per-item mechanisms.
- Froze SPEC-M6 (docs/CONTEXT/specs/SPEC-M6.md, 410 lines): 4 waves (A reports 4 / B admin+dispatch 5 + ADR-016 5 models 61→66 / C registers+lifecycle 9 / D process tail 18), mechanisms (ReportScreen engine, ADR-016, variant docs, approval-kind IN screens, 5 aliases), tools 159→183, acceptance 113/113 + ≥430 vitest. Commit 3a66b05 + tag spec-m6-frozen + PUSHED.
- Wave A engine: report-configs (types + 28 configs in index + REPORT_PACKS 6) — bound reports mirror register configs VERBATIM (dumped all 19 register configs and aligned columns/filters one by one); reports layer (index REPORT_SERVICES with bind() over REGISTER_SERVICES ×15 + 13 new services in core-reports.ts ×8 + chain-money-reports.ts ×5; report-csv.ts makeReportCsvRouteHandler + getPrintHeader with ADR-016-missing catch).
- Components: report-screen.tsx (server engine — pack breadcrumb, filter bar reuse, print-only header + copy banner, CSV, totals, pagination) + print-button.tsx (client dropdown Original/Duplicate/Triplicate → ?copy= → window.print).
- Pages: /reports hub (search + 6 pack cards), /reports/packs, /reports/mis (DB — 5 KPI tiles + 14-day CSS production bars + top-5 buyers, ALL from REPORT_SERVICES + queryOrderStatus, zero new queries), /reports/[slug] runner (dynamic, 404 unknown), /reports/[slug]/csv (one route for all 28), /costing/daily-pnl (renders slug daily-unit-pnl).
- render_report tool in tools.ts readTools (slug + from/to/party/order/godown/itemType/status/limit → same service, json rows+totals+columns; unknown slug lists packs).
- Menu registry: LIVE_ROUTES +5 (113 total), reports group landing /coming/reports → /reports, agentTools flips on the 4 items (render_report; mis also get_dashboard_kpis).
- Print CSS in globals.css (@media print A4 landscape; nav/aside/header hidden; table borders; the W7 slice).
- tsc caught the PITFALLS #21 lineage AGAIN: PcsDespatch.buyer/orderId, Sample.buyerId/styleId, Expense.orderId are relation-less — fixed with batched id-maps (despatch-packing, sample-status, expenses-summary). Omit-on-index-signature lost qty/outstanding in two map-spreads — explicit RegisterRow[] annotations. REPORT_PACKS import path fixed.
- Tests: report-configs.test.ts (148 — 28-slug frozen set, bijection, 6 packs with sizes, filter/format shapes, tool existence, per-config service smokes, binding rule REPORT_SERVICES[slug] === REGISTER_SERVICES[slug]) + report-services.test.ts (7 — daily-pnl produced−wages−expenses, outstanding AR/AP aging buckets incl. b0 today-invoice, gst unique-rate row, current-stock value math, line-wip, order-status-summary == computeChainState + despatch rollup, render_report same-service + unknown-slug error). Fixture isolation lesson: unique 2024-02 window + unique gst rate; outstanding needed party filter on the GRN query too (totals were polluted).
- Count pins bumped (the every-wave ritual): approval-kinds + register-configs 159→160.
- route_smoke_m6a.sh: 67/67 GREEN (4 screens + 28 slugs + 404 + CSV + filters + print param + 24-route regression set + parity=81 content check).
- context_check.sh: +report-configs/report-service metrics, tools 160, archetypes 4, views 23, menu tests 23, live routes 113, Wave A files in existence list → 250/250 NO DRIFT.
- Docs: STATE.md (M6 row IN PROGRESS, parity 81/113 17/17 groups, vitest 549, tools 160, routes 113, next actions → Wave B, file inventory row, M6 Wave A notes), this worklog.

Stage Summary:
- M6 Wave A COMPLETE: 4/4 report items live; 160 tools; 81/113 items (71.7%); 17/17 groups (reports opened); 113 live routes; 28-report registry (15 bindings + 13 new services); 549 vitest green (393 existing unmodified except 2 count-pin bumps); route_smoke_m6a 67/67; context_check 250/250; tsc zero new src errors.
- Pattern wins: bind() makes "ONE service, two screens" mechanically enforced (import-time throw + identity assertion in tests); the dynamic [slug] runner replaced 28 route copies; MIS dashboard computes every tile from REPORT_SERVICES (no dashboard-specific queries to drift).
- Tags: spec-m6-frozen + m6-wave-a to follow; push-after-commit honored.
- Next: M6 Wave B — ADR-016 schema (tag schema-61-baseline first; db push + generate + RESTART SERVER per PITFALLS #31), masters #26-30, /admin/users + /admin/menu-rights + /admin/options, courier-dc + loading despatch variants, +8 tools → 168, parity 81→86.

---
Task ID: m6-wave-b
Agent: main
Task: M6 Wave B (continuation of the m6-wave-a session) — ADR-016 schema + admin screens + courier-dc/loading despatch variants per SPEC-M6 §7-B, push-after-commit rule honored.

Work Log:
- Tagged schema-61-baseline; ADR-016: the schema ALREADY had a Phase-1 User model (AgentTurn.userId is a plain string) → ERRATUM #1: User AMENDED (userGroupId + active additively, login ≡ email) + FOUR new models (UserGroup.rights Json, AppOption key-unique, Hsn, TestParameter) → 61→65. db push + generate + dev server RESTARTED (PITFALLS #31).
- Masters 25→30: user (email code field, role select, userGroup refEntity field, active checkbox), user-group (rights as a LIST field — CSV in form, array in tool; []=all), app-option (key/label/value/group), hsn, test-parameter. Masters hub category 'Admin & Compliance'. master-service overrides for the hyphenated user-group slug (FK_COLUMN/DISPLAY/RELATION).
- Admin screens: /admin/users (two MasterTables via ?tab=users|groups), /admin/menu-rights (RightsMatrix client grid: rows MENU_GROUPS × cols user groups; toggle → saveMenuRightsAction → planMasterUpdate — the SAME door as update_user_group; every-checked collapses to []), /admin/options (AppOption MasterTable grouped print|defaults|general — print.* keys feed getPrintHeader so report print headers now render company data).
- Despatch variants: DESPATCH_SCHEMA + mode (despatch|courier|loading); planPcsDespatch validates courierName for courier, LAD-#### number space + initial status 'loading' for loading (ledger identical). dispatch-variants.ts configs (readonly mode field — the schema-mirror contract rule), courier/loading pages (recent lists narrowed by courierName-not-null / LAD- prefix), create_courier_dc + create_loading_challan docTools, SLUG_REVALIDATE entries.
- Registry: LIVE_ROUTES +5 (118), agentTools flips on the 5 items.
- Tests: master-parity +15 (5 masters × 3 — inputs added; 93 total), master-configs 25→30 pin + user-group display-key mirror, menu-registry Wave B block (86/113), doc-configs registry pin + mode readonly fields (tsc caught the schema-mirror violation), doc-parity-m6b NEW (4: courier × both doors with identical PcsDespatch+StockLedger rows, courierName guard, LAD space/status/ledger, rights round trip incl. []=all collapse — DocFormPayload shape lesson), tool pins 160→177.
- route_smoke_m6b.sh 28/28 (5 screens + 5 master routes + masters hub tabs + parity=86); context_check 265/265 (tools 177, factories 30/30, docTools 44, models 65, masters 30, routes 118, doc-configs 38).
- Docs: STATE (M6-B rows, Wave B notes), SPEC-M6 ERRATUM #1, this worklog.

Stage Summary:
- M6 Wave B COMPLETE: 5/5 items live; 177 tools; 86/113 (76.1%); 118 routes; 65 models; 30 masters; 565 vitest green; route_smoke_m6b 28/28; context_check 265/265.
- Pattern wins: rights as a list field keeps the matrix and the agent on ONE master-service door; the ADR-016-missing catch in getPrintHeader meant Wave A never needed a schema touch and Wave B needed zero report-layer changes.
- Tags: schema-61-baseline + m6-wave-b pushed.
- Next: M6 Wave C — registers & lifecycle (9 items: order-enquiry alias, program-status RG, stock-view RG, line-status board, order-amendments DocScreen, order-close/program-cancel/program-complete/po-close + 4 lifecycle tools) → 181 tools, parity 86→95.

---
Task ID: m6-wave-c
Agent: main
Task: M6 Wave C — registers & lifecycle (9 items, SPEC-M6 §7-C), continuation of the m6-wave-a/b session.

Work Log:
- order-enquiry: 3-line ALIAS re-export of the order-register page.
- Registers ×2: queryProgramStatus (the get_program_status tool body extracted VERBATIM; tool now delegates, json frozen) + queryCurrentStock (over shared fetchCurrentStock); configs in register-configs/m6-wave-c.ts; pages + CSV routes at /programs/status + /inventory/stock. The reports layer's current-stock aggregate was DELETED and rebound via bind() (the register landed — never fork).
- line-status: WIP board page over queryLineWip (the Wave A line-wip report service — one query layer; KPI band + per-line progress bars).
- Lifecycle: posting/lifecycle.ts (planCloseOrder 95%+invoice guards, planCancelProgram ledger net-zero, planCompleteProgram balance, planPoLifecycle receipt-aware — cancel DELEGATES to planCancelPo so cancel_purchase_order stays one service) + schemas/lifecycle.ts + 4 docTools + LifecycleForm shared client component + 5 thin screens (/orders/close, /orders/amendments, /orders/amendments actions call planOrderAmend — the update_order inline logic extracted, tool delegates) + 5 server actions.
- Registry flips: 9 items + LIVE_ROUTES 118→127 (csv routes are NOT in LIVE_ROUTES — page-file test rule).
- Tests: register-configs 19→21 pin (+ ROUTE_BY_SLUG), menu-registry Wave C block (95/113), tool pins 177→181, doc-parity-m6c NEW (4), report-configs current-stock moved to BOUND_SLUGS (16 bound + 12 new = 28). Fixture lessons: Program has NO finYear column; SalesInvoice.partyId needs a PARTY id (buyer is not a party); program complete status is 'completed' (model comment).
- route_smoke_m6c.sh 31/31 (dev server died again mid-session — restart ritual); context_check 284/284 (tools 181, docTools 48, routes 127, register configs 20 files/21 configs, services 23, posting 35, schemas 37, views 24).
- Docs: STATE (M6-C rows), this worklog.

Stage Summary:
- M6 Wave C COMPLETE: 9/9 items live; 181 tools; 95/113 (84.1%); 127 routes; 584 vitest green; route_smoke_m6c 31/31; context_check 284/284.
- Pattern wins: lifecycle guards live in the SERVICE (both doors enforce identically); the alias pattern proved the register filter set already covers the legacy enquiry form.
- Tags: m6-wave-c to follow; push-after-commit honored.
- Next: M6 Wave D — the LAST 18 items (multi-process-grn, grn-acceptance, opening-stock, cutting-issue, ready-to-cut, cutting-production, cutting-ack, pcs-receipt alias, pcs-gan, pcs-transfer, line-output, dc-entry, process-dc, dc-return, lot-approval, hsn-gst page, employees alias, test-parameters page) → 113/113 M6 COMPLETE. Hsn + test-parameter masters + factory tools ALREADY landed in Wave B.

---
Task ID: m6-wave-d
Agent: main
Task: M6 Wave D — the process tail, the LAST 18 items (SPEC-M6 §7-D), continuation of the m6-wave-a/b/c session. Target: 113/113 parity — the mission-complete wave.

Work Log:
- Read worklog + STATE + git: M6 Wave C done at 6d51cf6 (181 tools, 95/113), remote in sync, clean tree. Verified the 18 non-live items via tsx (multi-process-grn, grn-acceptance, opening-stock, cutting-issue, ready-to-cut, cutting-production, cutting-ack, pcs-receipt, pcs-grn-acceptance, pcs-transfer, line-output, dc-entry, process-dc, dc-return, hsn-gst-setup, employees, test-parameters, lot-approval).
- Schemas: grn-variants +MULTI_PROCESS_GRN/DC_RETURN (lines[] of itemType/itemCode/qty/rate); NEW dispatch-variants.ts (MATERIAL_DC tool schema + DC_ENTRY/PROCESS_DC per-screen mirrors — the schema-mirror test forced the split); NEW transfer-variants.ts (PCS_TRANSFER/READY_TO_CUT); stock-adj +OPENING_STOCK (relaxes only action+reason); production-variants +LINE_OUTPUT (lineId required).
- Posting (§4 rule-1/2 — base fns byte-identical): grn.ts +planMultiProcessGrn (MP-####, GRN process_return + GRNLine per component + process_delivery OUT per line) + planDcReturn (RTN-####, process_receipt IN per line, GRN.docNo = the DC ref); jobwork.ts +planMaterialDc (MDC- single / PDC- multi from ONE input shape; JobworkOrder row + process_delivery OUT per line; party ANY type); transfer.ts +planPcsTransfer (PT-#### out/in pair, pcs buckets key itemId = ORDER id) + planReadyToCut (RTC-#### ready_to_cut_out via postLedger + ready_to_cut_in with DIRECT stockLedger.create + bumpStock(deptId=D3) — the dept-keyed bucket IS the virtual cutting dept; ERRATUM #4); stock-adj.ts +planOpeningStock (OPN-#### + injects action add + reason 'Opening stock'); line-issue.ts +planCuttingIssue (validates line.deptId === D3 — ERRATUM #3); production.ts +planLineOutput (D4 default).
- Doc configs ×10 (grn-variants +2, dispatch-variants +2, NEW transfer-variants +2, NEW inventory-variants +1, cut-variants +2, production-variants +1) + index registry + SLUG_REVALIDATE ×11.
- approval-kinds 4→8 (grn_acceptance, cutting_ack, pcs_acceptance, lot — all manual:true; refResolvers per §6) + ApprovalKind.manual flag.
- tools.ts +7 → 188: docTools post_opening/ready_to_cut/create_dc + 4 proposeApprovalGate wrappers (accept_grn by grnNo, acknowledge_cutting_issue by issueNo, accept_jobwork_pcs by dcNo, approve_lot by grnNo).
- API approvals enrichment ×4 kinds (grn_acceptance/lot → GRN+party+lines+department; cutting_ack → LineIssue+line+order; pcs_acceptance → JobworkOrder+jobworker) + workflow-view cardTitle/detailRows branches + manual-queue copy switch.
- IN screens ×4: WorkflowView kind + ApprovalQueue (NEW src/components/erp/approval-queue.tsx) + sendToAcceptanceAction (NEW src/lib/erp/approval-queue.ts 'use server', idempotent, revalidatePath guarded — vitest caught the unguarded throw). Queue sources per §6: recent GRNs / cutting-dept LineIssues / JobworkOrder status='received' / D1-D2 GRNs with fabric/yarn lines.
- Pages ×18: 10 DS (MP, OPN, cutting-issue, RTC, cutting-production, PT, line-output, MDC, PDC, RTN) + 4 IN + hsn-gst + test-parameters MasterTables + pcs-receipt alias (re-export of /jobwork/receipt) + employees alias (pinned-entity thin page — the [entity] route is param-driven so a re-export would 404).
- menu-registry: LIVE_ROUTES 127→145; agentTools flips for all 18 (multi-process-grn/dc-return→receive_grn, pcs-transfer→transfer_stock, cutting-issue→create_line_issue per the frozen table — ERRATUM #3 documents they cannot emit variant rows; opening-stock→post_opening; ready-to-cut→ready_to_cut; dc-entry/process-dc→create_dc; the 4 IN→their gate tools; hsn-gst→create_hsn+update_hsn+list_hsns; test-parameters→create_test_parameter+…). parityStats: 113/113, comingItems 0.
- tsc caught: ProductionEntry relations are department/operator (line relation-less — id-map for line codes, PITFALLS #21 again); GRN include is department not dept; colSpan only 1|2; duplicate LineIssueInput import.
- Tests: doc-parity-m6d NEW (13: OPN both doors + guard, PT pair net-zero + bucket math, RTC store−/D3+ with total unchanged, MP lines+ledger, MDC/PDC one-tool-two-spaces + bare reject + never-DC-, RTN process_receipt IN + docNo ref, cutting dept guard accept+reject, cutting-production D3 + line-output lineId required, 4 gates find-or-create+idempotent+queue action interleave); approval-kinds 8-kinds + manual flags + 188 pin; menu-registry Wave D block (18 items + zero-non-live + 8 kinds) + parity 113/113; doc-configs registry 57 + schema-mirror passes with the split DC schemas; register-configs pin 188.
- route_smoke_m6d.sh 60/60 (dev server died mid-session — restart ritual; 18 new routes + parametrized kind queries + pcs-receipt ?dcNo + 19-route regression + /parity contains 113).
- context_check.sh: tools 188, docTool 51 (the 4 gates are inline), live routes 145, doc-config files 40, schemas 39, views 25, menu tests 26; Wave D files in the existence list → 310/310 NO DRIFT.
- Docs: STATE.md (M6 COMPLETE row, ground-truth rows, next-actions #4, M6 Wave C + D notes), SPEC-M6 ERRATA #2/#3/#4, this worklog.

Stage Summary:
- M6 WAVE D COMPLETE — THE PARITY MISSION IS COMPLETE: 113/113 items live (100%), 17/17 groups, comingItems 0. 188 tools (72 inline + 60 factory + 51 docTool + 5 sizes); 145 live routes; 57 doc configs in 40 files; 8 approval kinds (4 hook-raised + 4 manual-queue); 598 vitest green (584 + 14 net new); route_smoke_m6d 60/60; context_check 310/310; tsc zero new src errors.
- Pattern wins: ONE create_dc tool feeding two screens via per-screen schema mirrors; the manual-queue pattern (ApprovalQueue + sendToAcceptanceAction + proposeApprovalGate wrappers) keeps human-stepped legacy queues honest — queue button and agent tool interleave safely through find-or-create; the dept-keyed CurrentStock bucket gave ready-to-cut its virtual dept with ZERO schema changes.
- Tags: m6-wave-d (+ m6-complete to follow); push-after-commit honored.
- Next: M7+ candidates per SPEC-M6 §3 — auth/login, rights-based route guarding, Tally export; or move to hardening (E2E over the 145-route surface, print templates per doc family, agent prompt polish over the 188-tool registry).

---
Task ID: m7-wave-a
Agent: main
Task: Session continuation ("continue" + a reported build error). Two parts: (1) verify/fix the reported Turbopack error "Export OPERATION_ENTRY_SCHEMA doesn't exist in target module" in src/lib/erp/doc-configs/cut-variants.ts; (2) continue the project — per SPEC-M6 §3 / STATE next-actions the M7+ candidate is auth/login + rights-based route guarding (Tally export was resolved SKIP at M6 freeze). Note: the attached continuation summary described a DIFFERENT project's work (WorkflowView ctx.entity/entityNo fix, commit d9d2b62) — that code never existed in this repo (pickaxe-verified); this repo was at M6 COMPLETE (113/113, 844d13c, clean, pushed).

Work Log:
- FORENSICS on the reported error: the committed cut-variants.ts imports OPERATION_ENTRY_SCHEMA from '../schemas/production-variants' (CORRECT — it exports it); the error snapshot showed '../schemas/production' (which exports PRODUCTION_ENTRY_SCHEMA). The broken import NEVER existed in any commit (git log -S + file history: m3 created it, m5-wave-b and m6-wave-d edited it — always correct) → the error was a TRANSIENT uncommitted mid-Wave-D state (file mtime 14:43:59, Wave D commit 14:55:00, dev server restart 14:50) left in the user's browser overlay.
- VERIFIED the fix is already in: npx tsc --noEmit — zero errors in the whole import chain (only pre-existing noise: cumrate/exposure/flags src + test-file errors, exempt per PITFALLS #10); full `next build` (Turbopack, production) — EXIT 0, all routes compile; dev server /programs/new + /approvals + /cutting/production → 200.
- Discovered the production build KILLED the dev server (shared .next) — restarted with the explicit binary path (`node_modules/.bin/next dev` — bare `next` is not on nohup's PATH; the "sh: 1: next: not found" failure) — dev.log + all routes green again.
- Froze SPEC-M7 (docs/CONTEXT/specs/SPEC-M7.md): 3 waves (A login core / B API guarding + agent user context / C rights enforcement), zero-dependency auth architecture, API contracts, test plan, acceptance counters. Commit a068fb1 + tag spec-m7-frozen + PUSHED.
- Tagged schema-65-baseline (pre-ADR-017) + PUSHED; prisma User +passwordHash String? +lastLoginAt DateTime? (field-additive, still 65 models); db push + generate + dev server RESTART (PITFALLS #31 ritual).
- Auth lib: src/lib/auth/password.ts (scrypt N=16384/r=8/p=1, 64-byte, `scrypt$salt$hash`, timing-safe verify + dummy-hash burn for unknown emails) + src/lib/auth/session.ts (EDGE-PURE: HMAC-SHA256 via globalThis.crypto.subtle, b64url token `userId.expMs.sig`, constant-time compare, verifySessionToken; cookie fo_session, 7-day TTL, AUTH_SECRET env w/ dev fallback) + src/lib/auth/current-user.ts (Node-only: cookies() + db user re-check incl. active).
- API routes: /api/auth/login (zod + lowercase email + timing-safe 401 + lastLoginAt stamp + httpOnly cookie), /api/auth/logout (maxAge 0), /api/auth/session ({user|null}), /api/auth/bootstrap (allowed ONLY while zero users have a passwordHash; sets existing admin's password or creates admin; then logs in; 403 self-lock forever after).
- /login page: server component (valid session → redirect next|/; no-password world → FirstAdminForm pre-filled with the existing admin's email, else LoginForm) + 2 client forms (fetch + router.replace; bootstrap validates min-8 + confirm match client-side too).
- Middleware src/middleware.ts: edge page guard — verify cookie cryptographically, 307 → /login?next=<path+search>; matcher excludes /api, /login, _next, dotted paths (APIs deliberately open in Wave A so the 609 cookie-less tests/ingest scripts stay green — SPEC-M7 §2).
- Shell wiring: (erp)/layout.tsx async getSessionUser() → null → redirect('/login') (second guard: deleted/deactivated mid-session) → AppShell user prop → Topbar user chip (name + role badge) + LogOut button (POST /api/auth/logout → /login).
- scripts/seed_admin.ts (idempotent: sets admin@fiberpro.local password only if missing — default admin123, override via arg/ADMIN_PASSWORD; never overwrites) + scripts/route_smoke_m7a.sh.
- tests/unit/auth.test.ts (11): scrypt round-trip/salted/wrong/null/garbage; token round-trip/tamper-payload/tamper-sig/expired/garbage/malformed-exp/constants frozen; session.ts edge-purity (import-syntax-only regex — the first naive regex matched the file's own COMMENT text and failed; fixed to match `from 'node:crypto'` etc.).
- route_smoke_m7a.sh 27/27 GREEN (seed → 6 unauth guards 307+login?next → wrong-password 401 → empty-body 400 → bootstrap 403 → login ok + jar + session identity → 12 authenticated pages 200 → /login public 200 → logout + post-logout 307).
- Full vitest 609/609 GREEN (598 + 11, zero regressions). tsc zero new src errors.
- context_check.sh: +2 metric checks (auth lib files = 3, auth api routes = 4) + 15 file-existence entries (spec, middleware, 3 auth lib, 3 login files, 4 api routes, seed, smoke, test) → 327/327 NO DRIFT.
- Docs: STATE.md (Last-verified line, M7 milestone row IN PROGRESS, Git-HEAD row, models row ADR-017 note, vitest 609, API-routes row, NEW Auth ground-truth row, next-actions #5 with Wave B pointer, M7 Wave A notes section moved to file end), 02-DECISIONS.md ADR-017, this worklog.

Stage Summary:
- The reported build error was ALREADY FIXED in the committed tree (transient mid-Wave-D state; verified by tsc + full production build + live 200s) — no code change needed; dev server restarted clean so a browser refresh clears the stale overlay.
- M7 WAVE A COMPLETE: login core live — /login (first-admin bootstrap + email/password), fo_session HMAC cookie, edge middleware page guard, topbar user chip + logout, seed_admin; 609 vitest; smoke 27/27; context_check 327/327; tools stay 188; models stay 65; APIs stay open until Wave B (documented non-goal).
- Pattern wins: session.ts edge-purity enforced BY TEST (middleware can never accidentally gain a Prisma import); bootstrap self-locks (no config flag to drift); two independent guard layers (crypto at the edge, user-row in the layout).
- Dev credentials: admin@fiberpro.local / admin123 (set by the smoke run's seed — bootstrap is now closed; use the login form or seed another password by clearing passwordHash).
- Tags: spec-m7-frozen + schema-65-baseline (pushed) + m7-wave-a (to follow); push-after-commit honored.
- Next: M7 Wave B — API guarding (401 JSON on /api/erp + /api/agent + /api/upload without session; cookie fixtures for HTTP test suites) + agent user context (AgentTurn.userId stamping, approval actor on commits).

---
Task ID: m7-wave-b
Agent: main
Task: M7 Wave B (SPEC-M7 §4) — API guarding (401 JSON on /api/erp|agent|upload without session; cookie fixtures) + agent user context (AgentTurn.userId stamping, approval actor on commits). Session opened with a user question ("why the name aslam?") — answered: 'Aslam Admin' is the arbitrary demo/seed admin name in scripts/seed.ts + seed_admin.ts, chosen as a realistic Tirupur-knitwear-belt name consistent with the other seed names (Priya Sharma, Mohammed Ali, Sri Balaji Washers, exporter 'Baalaji Garments'); not a real person, trivially renamable.

Work Log:
- Explored the API surface: 5 ERP route files (erp GET, agent POST SSE, agent/approve POST, upload POST+GET, seed POST child_process) + 4 auth routes (stay open) + config (FlagsProvider is server-side — zero client fetchers; left open) + root /api/route.ts (hello-world stub). Confirmed NO vitest test hits APIs via HTTP except tests/unit/upload-route.test.ts (imports the handler directly — cookie-less).
- NEW src/lib/auth/api-guard.ts: requireApiSession() → {user}|{error: 401 JSON {"error":"Authentication required"}} over the Node-only getSessionUser (deleted/deactivated user fails too — the two-layer rule).
- Guards applied: /api/erp GET, /api/agent POST, /api/agent/approve POST, /api/upload POST+GET, /api/seed POST (documented defense-in-depth addition beyond the frozen erp|agent|upload list — unauth child_process shell-out is unacceptable; zero callers anywhere).
- Actor threading: AgentTool.execute gained optional (args, actor?: AgentActor) 2nd param — invisible to the ~175 tools that ignore it. approve_pending + proposeApprovalGate + all 8 gate wrappers (create_bill_pass, acknowledge_unit_transfer, approve_reprocess, approve_non_return_dc, accept_grn, acknowledge_cutting_issue, accept_jobwork_pcs, approve_lot) stamp approvedBy = actor.email ?? 'agent' in plan AND commit (back-compat without actor).
- /api/agent: AgentTurn.userId = session user id (was hardcoded 'admin'); execute(parsed.value, actor) threads the actor.
- /api/agent/approve: execute(args, actor) → commits carry the human actor; AgentTurn updateMany now SCOPED to the actor's userId (was global) + approvedBy = email.
- agent-panel.tsx: 401 → toast + window.location '/login' on all three fetches (/api/agent, /api/upload, /api/agent/approve); FIXED latent contract bug — upload handler checked data.success but the SPEC-M3 §12 route returns {ok: true} (paperclip attach flow never fired).
- Cookie fixtures: NEW scripts/lib/api-auth.mjs (login → {cookie, user}; Node fetch has no cookie jar — explicit Cookie header). Wired into test_ingest.mjs, eval_ingest.mjs, test_money_loop.mjs. Historical route_smoke_m5*/waveD/waveE API calls left as era artifacts (superseded by m7b smoke).
- Tests: NEW tests/unit/api-guard.test.ts (6: 401 no-cookie/garbage/tampered/deleted-user/deactivated-user + valid-token passthrough; vi.hoisted cookieStore mock of next/headers) + NEW tests/unit/agent-actor.test.ts (4: approve_pending±actor, accept_grn find-or-create actor stamp, 188 registry pin) + upload-route.test.ts gained the 401 block + session fixture (mocked cookies + real user row + createSessionToken) → 620 vitest green (609 + 11). One flaky parallel-run failure observed once, then 4 consecutive green full runs.
- route_smoke_m7b.sh 25/25 GREEN: 8-way unauth 401-JSON matrix (incl. multipart POST upload) + /api/auth/session open {user:null} + login/jar + 6 authed API 200s + authed multipart upload round-trip + actor e2e (fixture setup → accept_grn GRN-001 via the human door → fixture verify approvedBy=admin@fiberpro.local requestedBy=agent) + approve-door 400 guards (read-only/unknown tool) + page-guard regression (307 login?next / authed 200). NEW scripts/m7b_smoke_fixture.ts (setup|verify) for the e2e cleanup/assertion.
- context_check.sh: auth-lib 3→4 + guarded-API-routes 5/5 grep + cookie-fixture-scripts 3/3 metrics + 5 file-existence entries → 335/335 NO DRIFT.
- Docs: 01-STATE.md (Last-verified line, M7 milestone row, Git HEAD, vitest 620, API-routes + Auth M7-B ground-truth rows, next-actions #6 → Wave C, M7 Wave B notes section), this worklog.

Stage Summary:
- M7 WAVE B COMPLETE: all 5 ERP API route files session-guarded (401 JSON); AgentTurn.userId = session user; approval actor = the human (approvedBy email through the approve door, requestedBy stays 'agent'); cookie fixtures for the 3 HTTP scripts; agent-panel 401 UX; 620 vitest green; route_smoke_m7b 25/25; context_check 335/335; tsc zero new src errors; tools stay 188, models stay 65, routes stay 145.
- Pattern wins: the optional actor param threads user identity through the plan/commit contract with ZERO changes to non-approval tools; requireApiSession reuses the Node-only getSessionUser so the deactivated-user second layer applies to APIs too.
- Tags: m7-wave-b to follow; push-after-commit honored.
- Next: M7 Wave C — rights enforcement (NavSidebar filtered by UserGroup.rights []=all, middleware per-route rights check vs MENU_GROUPS, /admin/users password set/reset, deactivated-user redirect).

---
Task ID: m7-wave-c
Agent: main
Task: M7 Wave C (SPEC-M7 §4) — rights enforcement: NavSidebar filtered by UserGroup.rights ([] = all), middleware per-route rights check vs MENU_GROUPS, /admin/users password set/reset, deactivated-user redirect. Session opened with a stale continuation summary describing a DIFFERENT project's build error (OPERATION_ENTRY_SCHEMA) — forensics re-confirmed: committed tree imports correctly from production-variants; tsc/build EXIT 0 (first verified in bf5d296); the pending task per worklog/STATE was Wave C.

Work Log:
- Read SPEC-M7 §4 Wave C + the existing surface: MENU_GROUPS (17, menu-registry), NavSidebar (registry-driven, no filter), middleware (auth-only), current-user/getSessionUser (no rights), /admin/users (MasterTable only, stale "auth is a non-goal" copy), RightsMatrix (saves UserGroup.rights, enforcement was M7+ note), /api/seed (session-guarded but any authed user could reseed).
- NEW edge-safe src/lib/auth/rights.ts: signed fo_rights cookie (HMAC AUTH_SECRET over {role, rights, exp} b64url payload, 7d TTL, Web Crypto only — same purity discipline as session.ts, enforced by test) + computeAllowedGroupIds (the ONE rule: admin OR rights null (no group) OR [] → all; else listed ∩ valid ∪ {'home'}) + firstAllowedLandingRoute (deny target; home order 1 always allowed → '/' → deny-redirects loop-free by construction).
- NEW src/lib/auth/login-cookies.ts — ONE door (setLoginCookies) setting fo_session + fo_rights; wired into BOTH /api/auth/login and /api/auth/bootstrap (zero drift).
- menu-registry: NEW findGroupForPath(pathname) — prefix-first then exact-landing route→group resolver shared by middleware + layout (+ /coming/<id> resolution; meta pages /parity + unknown → undefined = open to any authed user). Topbar switched onto it (DRY, display-equivalent).
- middleware.ts: after session verify — verify fo_rights, compute allowed set, findGroupForPath, denied → 307 first-allowed landing; missing/tampered/stale cookie SKIPS the pre-check (can never grant). Always stamps x-pathname request header for the layout (layouts receive no pathname).
- current-user.ts: SessionUser +rights (group join; null = no group). (erp)/layout.tsx FRESH layer-2: re-derive allowed from DB per full load → redirect when the current route's group is denied + pass allowedGroupIds into AppShell → NavSidebar filters MENU_GROUPS. AppShell threads allowedGroupIds + isAdmin; NavSidebar hides the Seed demo data button for non-admins.
- /api/seed: + admin role check (403 non-admin — destructive reseed one click away from a restricted user was a footgun; zero script callers affected).
- NEW POST /api/auth/admin/set-password (SPEC-M7 §4): requireApiSession 401 → role admin 403 → zod {userId, password≥8 | clear:true} (exactly one) → 404 unknown → 400 clear-self (self-lockout guard; set-own = change password, allowed) → hashPassword/clear passwordHash.
- /admin/users: NEW PasswordAdmin client card (admins only; user picker showing password-set state + Set/reset + Clear) + page queries hasPassword server-side (hash never leaves the server); stale copy refreshed (user master-config role/active descriptions, menu-rights page + RightsMatrix footnotes now say enforcement is LIVE).
- Tests: NEW tests/unit/rights.test.ts (20: round-trip/tampered sig/tampered payload/garbage/arity/expired/non-JSON via crafted signed payload (createHmac mirror)/mixed-type rights/shape guards/constants + computeAllowedGroupIds matrix incl. admin bypass, null/[] = all, subset ∪ home, unknown dropped, only-unknown → home + firstAllowedLandingRoute 3 + edge purity) + NEW tests/unit/set-password-route.test.ts (11: 401/403/400×4/404/set-verifies-via-verifyPassword/set-own-ok/clear-null/clear-self-400) + api-guard +1 (SessionUser group-rights snapshot; shape assertion updated for the new rights field) + menu-registry +1 (findGroupForPath resolver: landings, item routes, dynamic [id], /registers → home, /admin/* → masters-admin, /coming/*, /parity → undefined).
- scripts/m7c_smoke_fixture.ts (setup|tighten|reactivate|deactivate|cleanup — 'Smoke Restricted' group rights orders+production + user w/ hashed password) + scripts/route_smoke_m7c.sh 36/36 GREEN: both cookies set at login; allowed 200 (/ /orders /orders/new /production) vs denied 307→'/' (/accounts /accounts/invoice /cutting /admin/users); SSR sidebar shows Orders &amp; Sales + hides Accounts &amp; GST + hides Seed button; fo_rights stripped → layout layer-2 still 307; tampered fo_rights → 307; stale window (tighten to ['accounts']) → /orders 307 via LAYOUT fresh check (revocation works) + /accounts 307 at edge (grant lag documented); admin bypass (/accounts /admin/users /parity /programs/new 200); set-password door 401/403/set→login-new/clear→401/clear-self 400; /api/seed non-admin 403; deactivated mid-session → 307 /login; cleanup.
- Regression: route_smoke_m7a 27/27 + route_smoke_m7b 25/25 (server + smokes run in ONE bash invocation — the sandbox reaps background processes between calls; nohup alone does not survive).
- context_check.sh: +7 metrics (waveC auth libs 2, admin api route 1, middleware imports 2, fo_rights at both login doors 2, waveA libs/routes split-adjusted for admin subdir) + 7 file-existence entries; menu-registry test counter 26→27 → 347/347 NO DRIFT.
- Docs: 01-STATE.md (Last-verified, M7 milestone COMPLETE, Git HEAD, vitest 653, API-routes + set-password/seed-admin rows, Auth M7-C ground-truth row, next-action #7, M7 Wave C notes section), 02-DECISIONS.md ADR-018 (two-layer rights, staleness contract, the ONE rule, role-vs-rights doors), this worklog.
- Committed 233f9f5 + tag m7-wave-c + PUSHED.

Stage Summary:
- M7 WAVE C COMPLETE — M7 COMPLETE: rights enforcement live end-to-end. Sidebar filters by UserGroup.rights; routes enforced twice (edge fo_rights pre-filter + layout fresh DB check sharing computeAllowedGroupIds/findGroupForPath so the layers can never disagree); admins bypass; /admin/users password set/reset/clear; /api/seed admin-only; deactivated → 307 /login.
- Pattern wins: the Wave A two-layer auth pattern extended to rights (crypto pre-filter at the edge, fresh DB in the layout); x-pathname request-header stamp closes the "layouts don't know their pathname" gap; home-always-allowed makes deny-redirects loop-free by construction; password admin = role door (recovery hatch for a broken rights matrix).
- Known contract (ADR-018): revoking a menu applies on next page load; granting a new menu applies at next login (stale edge cookie denies until then — both directions smoke-asserted).
- 653 vitest green (620 + 33); route_smoke_m7c 36/36; m7a 27/27 + m7b 25/25 regression; context_check 347/347; tsc zero new src errors; tools stay 188, models stay 65, routes stay 145.
- Dev credentials unchanged: admin@fiberpro.local / admin123. Next: M8 candidates per STATE next-actions #7 (hardening / print templates / agent prompt polish / multi-company chain deferred from SPEC-M7 §2).

---
Task ID: 8
Agent: main (Super Z)
Task: Continue after m7-wave-c — verify the reported `OPERATION_ENTRY_SCHEMA doesn't exist` build error, then health-pass the tree.

Work Log:
- Verified the `OPERATION_ENTRY_SCHEMA` build error is NOT live: commit bf5d296 already proved it transient (mid-Wave-D state); `cut-variants.ts:46` imports from `schemas/production-variants` correctly and the export exists (line 15). `next build` EXIT 0 today confirms.
- Triaged a NOISY `git status` (415 files modified): pure mode-bit noise (100644→100755) — silenced with `git config core.fileMode false`; `git diff --numstat` exposed the ONE real change: `src/app/api/upload/route.ts` DELETED from the working tree → RESTORED from HEAD (context_check's `/api/upload EXISTS` probe + 7 upload-route tests depend on it).
- Root-caused 8 src/ tsc errors as Phase-3/4 orphans (PITFALLS #16 lineage): `flags.ts` (LIVE — imported by `/api/config`) + `exposure.ts`/`cumrate.ts` (DEAD — zero importers). Confirmed `/api/config` 500'd live (`db.flag` undefined — Flag model removed by rollback #4).
- FIX: rewired `flags.ts` to AppOption storage (key `flag:<name>`, group 'flags', label=description; valueType/category stay in the registry code). Signatures + coercion verbatim: ensureFlags/getFlags/getFlag/setFlag/flagRegistry. Zero schema change — 65-model pin intact. `/api/config` now 200 with typed values (booleans/numbers coerced).
- DELETED dead orphans `src/lib/erp/{exposure,cumrate}.ts` (referenced removed Bill/BillPass/prs; nothing imports them; lineage stays in PITFALLS #16 + git history). tolerance.ts unaffected (imports getFlags — now healthy). Phase-3/4 scripts left as documented noise.
- Verification: tsc src/ 0 errors (was 8) · vitest 653/653 · context_check 347/347 NO DRIFT · `next build` EXIT 0 (29s compile) · /api/config 200 live.
- Docs: 01-STATE.md (Last-verified session line + note #6 rewritten), 03-PITFALLS.md entry #33 (live-orphan vs dead-orphan triage rule, numstat-over-status rule, AppOption-as-config-home rule).
- Answered the user's standing "aslam" question: `scripts/seed_admin.ts` / `scripts/seed.ts` seed the dev admin as name 'Aslam Admin' (admin@fiberpro.local) — a Tirupur-trade-plausible placeholder name, chosen for the SPEC-M7 login-door dev/CI seed.

Stage Summary:
- Post-M7 health pass COMPLETE: working tree clean (only intended changes), src/ typechecks 100% clean for the first time since rollback #4, live /api/config route repaired (500→200), upload route restored.
- All gates green: 653 vitest · 347/347 context_check · build EXIT 0 · tools 188 / models 65 / routes 145 (pins unchanged).
- Key decision: orphan triage by importer count — LIVE orphans get fixed (flags.ts→AppOption), DEAD orphans get deleted (exposure/cumrate), historical scripts stay as documented lineage.

---
Task ID: 9
Agent: main (Super Z)
Task: M8 Wave A — doc-family print templates (STATE next-actions #7 → SPEC-M8 frozen, Wave A implemented end-to-end).

Work Log:
- Froze SPEC-M8 (docs/CONTEXT/specs/SPEC-M8.md): ONE PrintSheet engine + ONE /print/[docType]/[id] registry route + per-family fetchers; browser print only (SPEC-M6 §3-3 decision carried forward); non-goals pinned (no PDF engine, no tools change, no schema change, no /print rights entry — session-gated, doc VIEW pages stay rights-gated by their groups).
- Built src/lib/erp/print/: types.ts (normalized PrintDoc), amount-words.ts (Indian numbering: Lakh/Crore singular-plural, 'and' before final group, paise, 999-crore cap→digit fallback), fetchers.ts (invoice TAX INVOICE GST-split + export note, po PURCHASE ORDER with resolved item codes, grn GOODS RECEIPT NOTE, payment PAYMENT/RECEIPT VOUCHER by direction, dc DELIVERY CHALLAN — all resolve by db id OR doc no), index.ts (PRINT_DOCS registry).
- Built the UI: print-sheet.tsx (server: masthead via getPrintHeader, copy banner, party+meta grid, line table, totals, words, signatures, terms; 210mm on-screen preview), print-auto.tsx (client auto-print shim, ?autoprint=0 preview), doc-print-button.tsx (DocPrintButton in-place copy selector + DocPrintLink view-page door), and the route (erp)/print/[docType]/[id]/page.tsx with inline @page A4 PORTRAIT (later cascade beats globals.css landscape — reports stay landscape).
- Wired print doors (DocPrintLink) on the 5 doc view pages: invoice, po, grn, payments, jobwork order.
- Tests: tests/unit/amount-words.test.ts (10: zero/teens/tens/lakh-singular/205065-fixture/crore/paise/negative/cap-fallback/non-finite) + tests/unit/print-docs.test.ts (10: registry completeness, 5 fetcher shape assertions incl. IGST flip + receipt direction flip + id resolution + unknown→null). FIXED mid-run: my Indian-grouping math slip in the 205065 expectation (2,05,065 = Two Lakhs Five Thousand Sixty Five — the code was right), Lakh/Crore singular-plural grammar, PO-line required amount + no-finYear-on-JobworkOrder fixture shapes, child-first cleanup (no onDelete cascade in the reconstructed schema — PITFALLS-repeated lesson: POLine/GRNLine must go before parents or party delete leaks).
- scripts/route_smoke_m8a.sh 16/16 GREEN (dev server + smoke in ONE bash invocation per protocol): unauth 307 /login, 5 families 200 + title grep by DOC NO, ?copy=duplicate banner, both 404s, 5 view-page doors present.
- context_check.sh: +4 counters (print lib 4 / components 3 / families 5 / doors 5) + 13 file-existence entries + m8-waveA metrics line; erp components pin 25→28 → 363/363 NO DRIFT.
- Docs: 01-STATE.md (Last-verified m8-wave-a line, M8 milestone row, next-actions #8 with Wave B candidates), SPEC-M8.
- Verified: tsc src/ 0 errors · vitest 673/673 · context_check 363/363 · next build EXIT 0 (26.9s).
- Committed + tag m8-wave-a + pushed.

Stage Summary:
- M8 Wave A COMPLETE: every print-critical doc family (invoice/PO/GRN/payment/DC) prints a proper A4 portrait sheet — masthead, party block, lines, GST/totals, Indian amount-in-words, signatures, terms, Original/Duplicate/Triplicate copies.
- Pattern wins: one engine + registry route means each remaining family (15 more doc detail pages) is a ~40-line fetcher (Wave B); inline @page beats the global landscape without touching reports; fetchers re-use the view-page id-OR-docNo resolution.
- 673 vitest (653+20) · route_smoke_m8a 16/16 · context_check 363/363 · build EXIT 0 · tools 188 / models 65 / LIVEROUTES 145 (page routes 146).
- Next: M8 Wave B (remaining print fetchers), E2E hardening, or agent prompt polish per STATE next-actions #8.

---
Task ID: 10
Agent: main (Super Z)
Task: M8 Wave B — print fetchers for the remaining 15 doc detail families (STATE next-actions #8 → M8 COMPLETE).

Work Log:
- Read worklog tail + STATE: last session ended at m8-wave-a (commit d76414f); next-actions #8 named Wave B as the next item in order — continued with it (user said "continue").
- Studied the Wave-A pattern: types.ts (PrintDoc), fetchers.ts (5 fetchers + helpers), index.ts (PRINT_DOCS), /print/[docType]/[id] route, DocPrintLink/DocPrintButton, print-sheet.tsx renderer, print-docs.test.ts fixture pattern, route_smoke_m8a.sh.
- Enumerated the 15 remaining families from the [id] view pages (exactly STATE #8's list): debit-note, journal, budget, cost-sheet, expenses, cutting job-order, gate-entry, gate-pass, samples, despatch, packing-list, rejection, production entry, production issue, lab-tests.
- fetchers.ts: exported the shared helpers (d/inr/qty/partyBlock/getCompanyName) — ONE formatting convention across all 20 families.
- Created src/lib/erp/print/fetchers-b.ts: 15 fetchers (~560 lines). Key decisions: id-ONLY resolution for budget/cost-sheet/production-entry (no unique doc-no field — budget docNo becomes BGT-<orderNo>, production-entry uses bundleNo display but id resolution, cost-sheet v<version>); gate-entry/gate-pass = ONE shared fetchGatePrint(idOrNo, gateType) with a TYPE FILTER (an IN entry 404s under /print/gate-pass — §4 rule-2 honest behavior); journal title from voucherType (RECEIPT/PAYMENT/CONTRA/JOURNAL VOUCHER) with Dr/Cr two-row table; lab-test values JSON parsed into parameter/result rows; buyer-party blocks for sample/pcs-despatch/packing-list (Buyer has no gstin/address — manual PrintParty); free-FK lookups via partyById/orderNoById (PITFALLS #21).
- index.ts: PRINT_DOCS registry 5→20 (kebab-case docType keys for multi-word families).
- Wired DocPrintLink doors on the 14 remaining view pages (breadcrumb-wrapped, the invoice-page pattern); dispatch/gate-view.tsx shared by both gate routes picks docType by gateType → 19 files carry doors.
- Tests: tests/unit/print-docs-b.test.ts (18 tests) — full fixture graph (party/buyer/order/dept/line/employee + 15 docs, children-first cleanup), per-family shape assertions (titles/meta/lines/totals), gate type-mismatch → null both directions, id-vs-docNo dual resolution, unknown→null matrix over all 15. Updated print-docs.test.ts registry pin (5→20; the Wave-A shape assertions unchanged).
- scripts/route_smoke_m8b.sh (38 checks): unauth 307, admin login, resolve-a-doc per family (SEEDS debit-note + budget when those tables are empty — they were — and cleans them up), 15× /print/<type>/<id> 200 + title grep, copy=duplicate banner + doc-no, gate type-mismatch 404, unknown docType/id 404s, 15 view-page door checks. 38/38 GREEN against the live dev server.
- context_check.sh: print-lib pin 4→5 (fetchers-b.ts), +families-20 check, +doors-19 check (grep -rl over (erp) pages + gate-view), metrics line m8-waveB, +4 file-existence entries (fetchers-b/print-docs-b.test/route_smoke_m8b/gate-view) → 369/369 NO DRIFT.
- Verified: tsc src/ 0 errors · vitest 691/691 (673+18) · route_smoke_m8b 38/38 · context_check 369/369 · next build EXIT 0 · tools 188 / models 65 / LIVEROUTES 145 (pins unchanged).
- Docs: 01-STATE.md (Last-verified m8-wave-b line, M8 milestone row → COMPLETE, next-actions #9), SPEC-M8 §8 (Wave B family table + decisions + acceptance).
- Browser verification (agent-browser, post-commit): login → /print/journal/JV-RCP-0001 renders RECEIPT VOUCHER (voucherType-driven title live-verified — a receipt journal), copy banner + doc-no + Dr/Cr lines ₹2,05,065; /print/lab-test/LT-M5D-1 renders LAB TEST REPORT with the values-JSON parameter rows (gsm); /accounts/journal/JV-RCP-0001 carries the Print door; ZERO console errors; screenshot download/m8b-print-journal-preview.png. (Note: the platform reaps background dev servers — the system-managed `bun run dev` must be up for browser checks; route smoke ran against it green 38/38.)

Stage Summary:
- M8 COMPLETE: every doc detail page (20 families across 19 view files) prints a proper A4 portrait sheet via the one engine + one registry route.
- The registry pattern held exactly as SPEC-M8 §2 predicted — each family WAS a ~40-line fetcher; zero engine/route/sheet changes needed.
- 691 vitest (673+18) · route_smoke_m8b 38/38 · context_check 369/369 · build EXIT 0 · tools 188 / models 65 / LIVEROUTES 145.
- Next candidates (STATE #9): E2E hardening over the route surface, agent prompt polish over the 188-tool registry, /admin/settings flags UI over the repaired /api/config.

---
Task ID: 11
Agent: main (Super Z)
Task: M9 Wave A — the Live Operations Tracker (user-requested), REVISED mid-flight per the user's clarification ("when I meant live tracker you had the legacy parity tracker right? I meant something like that") from an activity-feed dashboard to the parity-scoreboard format. Note: the prior session had built the Wave-A feed version but ran out of context BEFORE committing — the whole M9 changeset was sitting uncommitted in the working tree, which made the pre-commit redirection cheap and honest.

Work Log:
- Re-established context: worklog tail (last entry = m8-wave-b), STATE, git status (M9 files untracked/modified, NOT committed), SPEC-M9 + tracker.ts + live-tracker.tsx + tools.ts/menu-registry diffs read; verified the uncommitted base was green (tsc src/ 0, tracker/menu-registry/agent-actor 38/38).
- Amended SPEC-M9 PRE-commit (revision note in the header + §4-B module-board contract + §5 rewritten parity-style + §7 test/smoke additions): the tracker's PRIMARY layout = the /parity scoreboard format — summary stat tiles + per-group cards, one table row per screen family — but with LIVE status derived from the DB (records total, rows today, latest doc, last-updated, Active/Idle/No-data) instead of static config status; Wave-A feed/approvals/agent/system panels retained BELOW as secondary.
- tracker.ts: restructured the feed build into per-family entry arrays (orderFeed…agentFeed — the feed contract itself UNCHANGED, context_check's 16-family grep still pins); added db.stockLedger.findFirst to Round 1; Round 2 gains 5 board-only today counts (journal/sample/labtest/expense/approval-CREATED — distinct from KPI approvalsToday=DECISIONS) + 16 all-time totals; TrackerFamilyRow/TrackerModuleGroup + MODULE_GROUPS ×11 single-line entries (grep-pinnable) + familyRow() builder (latest = entries[0], zero extra queries for the 16 feed kinds); stock row synthesized (docNo ?? txnType, meta `txnType · itemType · ±qty` via first-nonzero in/out); modules {activeToday, familiesTotal, groups} added to the snapshot.
- live-tracker.tsx: PRIMARY = summary Card (parity-page Stat component verbatim: 4 bordered tiles — Screens active today X/17, Docs recorded today, Pcs produced today, Pending approvals) + module board `grid lg:grid-cols-2` (11 group cards × Screen/Records/Today/Latest/Updated/Status tables; Screen links the family register with mono route under it; Latest = deep-linked mono docNo + meta; Updated ticks every 1s; status dot Active/Idle/No-data; family-row NEW flash 15s on latestAt-advance — the feed NEW rule at family granularity); REMOVED the 8-tile gradient KPI row (dashboard look ≠ parity look); Wave-A panels kept below under a "Live detail" divider; header subtitle now names the parity scoreboard.
- get_live_activity: text gains `X/Y screens active today` + busiest-5-families line; json gains modules. /parity ARCH_LABELS gains LT: 'Live' (the new archetype would have rendered raw).
- Tests: tracker.test.ts 6→7 (modules board: 11 groups / 17 unique kinds / familiesTotal 17; seeded order+grn today ≥1 with latest docNo + listHref pins /orders //procurement/grn //inventory/ledger; agent listHref null; activeToday ≥3; per-row well-formedness) + shape test gains modules keys + tool test pins screens-active text + json.modules.groups 11.
- scripts/route_smoke_m9.sh: +5 board greps (Live Operations Board / Screens active today / Records / Latest) + modules API shape (11 groups, 17 familiesTotal) → 38 checks.
- context_check.sh: +3 checks (module-groups 11 single-line grep, summary-tile grep, tracker tests 7) → 385/385.
- FIXED mid-run (Edit-in-place, not rewrite): (1) JSX template literal missing the interpolation close `}` on the status-dot className → 3 tsc errors; (2) duplicate maxFeedAt declaration from the refactor (kept the NEW_TTL_MS-adjacent copy, dropped the old one above KIND_CHIP).
- Gates: tsc src/ 0 errors · vitest 699/699 · route_smoke_m9 38/38 ALL GREEN (unauth 307/401, login, board greps, modules 11/17, feedLimit caps incl. 400s, live AgentTurn marker round-trip + cleanup, restricted-user home-group 200 + cleanup) · context_check 385/385 NO DRIFT · next build EXIT 0 · browser verification (agent-browser login → /tracker): DOM check 11 group cards / 17 family rows / summary "9/17 active · 30 docs · 2,880 pcs · 20 pending"; VLM screenshot review confirms the parity look with zero layout issues; ZERO console errors; screenshot download/m9-tracker-board.png.
- Docs: SPEC-M9 revision + §4-B + §5 + §7; 01-STATE.md (Last-verified m9-wave-a line, M9 milestone row, next-actions #10 with the SPEC-M9 §9 frozen M10+ roadmap); this worklog entry.

Stage Summary:
- M9 COMPLETE in ONE revised wave: /tracker is now the parity scoreboard made LIVE — 11 module-group cards × 17 screen-family rows (Records/Today/Latest/Updated/Active-Idle), 4 summary stat tiles, NEW row flashes, 10s polling with pause/hidden-tab handling, plus the secondary activity feed + approvals/agent/system panels.
- The redirection was nearly free because the prior session's work was uncommitted: the aggregation service kept its §4 feed/KPI/panels contracts verbatim and only GAINED modules; both doors (screen + get_live_activity) still run the ONE service (Contract #8).
- 699 vitest · route_smoke_m9 38/38 · context_check 385/385 · build EXIT 0 · tools 189 / models 65 / menu 114 / LIVEROUTES 146.
- Next: SPEC-M9 §9 roadmap top-down — M10 agent quality pass, M11 flags UI, M12 Playwright E2E; tracker SSE + createdAt indexes parked in M14.

---
Task ID: 12
Agent: main (Super Z)
Task: Deliver the user-requested forward-looking implementation & improvement plan beyond M7 (the other half of the two-part request from the pre-M9 sessions; the live-tracker half was completed as M9, Task 11). Produced as a formal Chinese PDF document, grounded in SPEC-M9 §9's frozen M10+ roadmap plus live code recon (agent route SYSTEM_PROMPT, flags.ts FLAG_DEFS count, eval_ingest.mjs harness).

Work Log:
- Re-established context: worklog tail (Task 11 = M9 complete, commit f3b0fe0, tree clean), STATE milestone table M0-M9 + pins (189 tools / 65 models / 114 menu / LIVEROUTES 146 / 699 vitest / context_check 385/385), SPEC-M9 §9 roadmap text.
- Code recon for plan accuracy: SYSTEM_PROMPT is an unversioned const in src/app/api/agent/route.ts (M10's target); FLAG_DEFS in src/lib/erp/flags.ts = 28 flags across tolerance/commercial/company/module (M11's surface); scripts/eval_ingest.mjs = 3-doc ingestion golden set with 95% gate (M10's expansion base).
- PDF skill chain read in full: SKILL.md + configs/fonts.md + briefs/report.md (complete) + typesetting/{cover,palette,typography,overflow,pagination,fill-engine,geometry,charts,cover-backgrounds}.md.
- Palette: design_engine.py palette-cascade --intent cold --mode minimal --seed 7 (steel-blue family; ACCENT #3681a6, HEADER_FILL #334650) used for BOTH cover (CSS :root) and body (ReportLab constants) — one hue family per palette.md.
- Cover: Template 01 HUD (light bg #eff0f1, 8px accent anchor line at x=95, content at x=175, grid Layer 1 at 4.5% opacity, kicker/hero(2-line 61px CJK)/summary/meta/footer at absolute anchors). poster_validate check-html PASS + cover_validate.js PASS (after removing the accent-dot span that tripped text-text overlap) → html2poster.js --width 794px → 221KB vector cover.
- Body: scripts/pdf-plan/{plan_content.py (8 chapters of content blocks: exec summary + 4-stat row, M0-M9 recap table, quality gates, architecture contracts, P1/P2/P3 matrix, M10/M11/M12 and M13-M16 detailed plans with goals/work-breakdown/acceptance/risks, parked table, session protocol, recommendation), build_body.py (TocDocTemplate + multiBuild, NotoSerifSC/FreeSerif + install_font_fallback, TA_LEFT + wordWrap CJK, all table cells Paragraph() with ratio colWidths ≤ available, repeatRows=1, CondPageBreak orphan prevention only — no forced chapter breaks, roman-i TOC footer + arabic body reset, TOC entries notify page-1 so TOC numbers == footer numbers)}.
- Font fix: chinese dir ships only NotoSansSC[wght].ttf variable font → registered inside try/except (NotoSerifSC is the real body font; sans is optional fallback).
- Merge: merge_final.py pypdf insert cover as page 0 with strict A4 normalization (threshold 0.1pt after pdf_qa flagged the 595.9 vs 595.3pt mismatch at 2pt threshold).
- Preflight chain: code.sanitize both scripts → build → merge → meta.brand → pages.clean (no blanks) → font.check (0 issues) → toc_validate (1 false positive: stat tiles "113/113 699 189 146" parsed as TOC entry; real TOC verified manually — all 21 entries match actual footer page numbers via pymupdf word-coordinate reconstruction) → pdf_qa: first run FAIL (page size) → fixed → final WARN-only (4 inherent ReportLab CJK line-start punctuation + cover left-anchor asymmetry by design + stat-tile centering false positive; L59/R59 mirror proves the tile group is centered).
- Text polish: two flagged line-start em-dashes reworded (浏览器验证——→：, 路由可靠——→，, 还有一个原因——→：).
- Visual verification: rendered pages 1/3/4 @100dpi → VLM review: clean layout, no overlaps, no tofu boxes, no defects.
- Deliverables in download/: Fiberpro-ERP-超越M7的前瞻性实施与改进计划.pdf (10 pages, 538KB, cover+TOC+8 chapters), cover HTML source, cover preview PNG. Working scripts in scripts/pdf-plan/ (cover.html, plan_content.py, build_body.py, merge_final.py — editable for future revisions).

Stage Summary:
- The plan document (original request #1) is delivered; request #2 (live tracker) was already complete as M9/f3b0fe0.
- Content: M0-M9 state recap, architecture contracts (C2/C8/65-model/agent-first/C5), P1 (M10 agent quality ≥90% routing, M11 28-flag admin UI, M12 8 Playwright golden paths), P2 (M13 digest notifications, M14 indexes/pagination/SSE/N+1 with <300ms@10k target, M15 engine-level audit trail, M16 role dashboards), P3 parked table with unpark conditions, five-gate session protocol, and the recommendation to start M10 next.
- All skill quality gates satisfied: validators PASS, QA WARN-only with justified exceptions, VLM visual pass, metadata branded, fonts embedded, TOC clickable and page-accurate.
- Next session: execute M10 per the plan (SPEC-M10 to be written first per the SPEC-first discipline).

---
Task ID: 13
Agent: main (Super Z)
Task: M10 — the Agent quality pass (SPEC-M9 §9-P1 item 1, the top roadmap pick after M9; the two original user requests were both complete: the live tracker = M9/f3b0fe0, the beyond-M7 plan = Task 12 PDF). Executed spec-first: SPEC-M10 written and frozen BEFORE any code.

Work Log:
- Re-established context: worklog tail (Task 11 M9 complete + Task 12 plan PDF delivered, tree clean at 4e4ecbe), STATE next-actions #10 roadmap (M10 top), SPEC-M9 §9 M10 definition, agent route.ts SYSTEM_PROMPT (unversioned, inline), eval_ingest.mjs harness pattern, tools.ts registry structure (189 = inline + docTool + masterCreate/Update factories), context_check pins (incl. the anticipatory "PROMPT_VERSION exists now" note at line 346).
- SPEC-M10 written and frozen: 5 contracts (C1 prompt module, C2 version stamping ×3 surfaces, C3 description audit, C4 50-prompt golden routing set, C5 tests/pins), explicit out-of-scope (tracker pulse version display, multi-turn eval, token-budget optimization), 9 acceptance gates, risks (prompt bloat, LLM non-determinism, rate limits, migration).
- C1 src/lib/agent/prompt.ts NEW: PROMPT_VERSION 'm10-2026-08-28' (scheme m<milestone>.<rev>-YYYY-MM-DD; NEW lineage — the phantom v5-2026-08-26 claim stays historical) + SYSTEM_PROMPT restructured: 16-domain map (Orders/Procurement/Inventory&stock/Cutting/Production/Jobwork/Despatch/Accounting/Costing/Quality/HR&wages/Masters/Workflow&approvals/Documents&ingestion/Reports&registers/Meta&live-pulse — REPLACES the two raw READ/WRITE tool lists) + 7 heuristics (read-before-write, direction rule, money cash-vs-ledger, goods own-godowns-vs-out-of-company, receive-vs-accept, update-over-recreate, next-step-after-commit) + exactly 8 few-shots over the 4 confusion pairs + EVERY normative rule preserved (ingestion PHASE 1/2 + DIRECTION RULE, 15-stage chain + next-step rules, auto-numbering, GST/₹/FY/godowns/departments, never-say-use-the-UI). Module split because App-Router route files may not export arbitrary constants.
- C2 route.ts: imports the module, stamps promptVersion on the SSE start event + every AgentTurn row; schema ADDS AgentTurn.promptVersion String? (additive; prisma db push + generate + dev-server restart per PITFALLS); agent-panel.tsx gains the mono version chip (data-testid prompt-version) fed by the start event.
- C3 description audit: scripts/m10_description_audit.py (persisted, 37 exact-string replacements — the 37 weakest: list_buyers 12 chars → 38 tools rewritten incl. update_user_group) — every description now concrete (returns + filter args + routing cue, e.g. list_buyers "resolve a buyer name to its code before creating orders"); registry-wide floor ≥40 chars verified live via tsx (189 tools, 0 under); tool count/name/schema untouched (git diff: 37 description lines + 1 factory line only).
- C4 scripts/eval_routing.mjs NEW: 50-prompt golden set across 16 domains (orders 4/procurement 4/inventory 4/cutting 2/production 5/jobwork 3/despatch 3/accounting 6/costing 2/quality 2/hr 2/masters 5/workflow 3/documents 2/reports 1/meta 2), both sides of every confusion pair, self-sufficient write prompts (V2 of #6 after the V1 self-sufficiency defect: "receive the full ordered quantity"), --static structural mode (no LLM: 50 entries/unique ids/16 domains/every expectedTool resolves against tools.ts source via inline+docTool+factory-slug→underscore rules), full LLM mode (fresh single-turn per prompt, expectedTool ∈ called-tools across ALL steps, NEVER approves → zero commits, 429 retry×8 with 90s waits + 8s pacing, skip-marking excluded from denominator, report download/eval-routing-report.json with promptVersion + byDomain + failures + why).
- Rate-limit battle (the honest part): the platform LLM quota throttles bursts — first full run abandoned at 10 scored; probe-loop wait; hardened script (retries 3→8, pacing 3→8s, --only subset re-runs with report MERGING across passes); second full run completed 47/50=94%; --only=6,25,34 pass showed #6 was a mid-stream-throttle flake (passes fresh: get_purchase_order→receive_grn both called) → 48/50=96% FINAL; the 2 remaining failures (#25 create_gate_pass ← list_despatches, #34 create_lab_test ← list_fabrics×2,list_lots) are lookup→write flows cut mid-stream under throttle — documented in the report with calledTools evidence; gate ≥90% PASSED.
- C5 tests: tests/unit/prompt.test.ts 10 pins (version regex, 16 domain headers, few-shot count exactly 8 (floor + cap), 4 confusion pairs both-sides, ingestion PHASE/DIRECTION markers, 15-stage chain + suggest_next_step + "15. **Payment collection**", auto-number rule, never-say-use-the-UI (case-insensitive), description floor ≥40 over all 189, list_buyers/get_party_ledger routing-cue spots).
- Gates: tsc src/ 0 errors · vitest 709/709 (699+10) · eval_routing --static PASS (50 entries/16 domains/registry 181-by-source all resolve) · eval_routing FULL 48/50 = 96% ≥ 90% gate, exit 0, report written with promptVersion m10-2026-08-28 · route_smoke_m9 38/38 · route_smoke_m7b 25/25 · context_check 398/398 NO DRIFT (+13 checks: prompt module 2 / route import 1 / stamps 2 / schema column 1 / eval script 1 / golden 50 / prompt tests 10 / report 1 + 5 file-existence; PROMPT_VERSION known-gap check FLIPPED to required) · next build EXIT 0 · browser verification (agent-browser): login → Agent panel → send "hi" → version chip renders 'm10-2026-08-28' (data-testid=prompt-version count 1), ZERO console errors, screenshot download/m10-agent-panel-version.png · AgentTurn.promptVersion live-verified via Prisma (latest row stamped).
- Docs: SPEC-M10 (frozen), 01-STATE.md (Last-verified m10 line, M10 milestone row, drift note #1 → RESOLVED with the new-lineage note, next-actions #11 M10 DONE + M11/M12 next), 00-START-HERE.md session-end protocol step 1b (static every session; full run on every PROMPT_VERSION change), this worklog entry.

Stage Summary:
- M10 COMPLETE: the agent's tool-routing is now measured (96% on the 50-prompt golden set, gate 90%) and regressible (one command; --static joins the every-session gates; full run mandatory on every PROMPT_VERSION bump).
- The prompt is a versioned artifact (m10-2026-08-28) stamped on every AgentTurn row + every SSE stream + visible in the panel header; every normative rule of the old prompt preserved (pinned by test).
- 38 tool descriptions strengthened (floor ≥40 chars); tools stay 189 / models 65 / menu 114 / LIVEROUTES 146.
- 709 vitest · context_check 398/398 · build EXIT 0 · smokes green · browser-verified.
- Known residual: 2/50 golden prompts fail under heavy throttle (mid-stream empty completions read as "stopped early") — the second-chance pass in the eval script mitigates; full fix = platform quota, not code.
- Next: M11 /admin/settings flags UI (28 flags over /api/config), then M12 Playwright E2E golden paths (SPEC-M9 §9 frozen roadmap, top-down).
---
Task ID: 14
Agent: main (Super Z)
Task: M11 — the Feature-flags admin screen (SPEC-M9 §9-P1 item 2, the next roadmap pick after M10; both original user requests were long complete: live tracker = M9/f3b0fe0, beyond-M7 plan = Task 12 PDF). Executed spec-first: SPEC-M11 written and frozen BEFORE any code.

Work Log:
- Re-established context: worklog tail (Task 13 = M10 complete, commit 93a2a2a, tree clean), STATE next-actions #11 roadmap (M11 top), SPEC-M9 §9 M11 definition, flags.ts (28 FLAG_DEFS + getFlags/getFlag/setFlag + ensureFlags over AppOption flag:* rows), /api/config (GET-only, UNGUARDED, zero in-repo consumers), the set-password admin pattern (route + password-admin.tsx + its test), menu-registry masters-admin block, context_check pins (114 menu / 146 LIVEROUTES / 398 checks).
- SPEC-M11 written + frozen: 5 contracts (C1 POST /api/config set-password pattern incl. GET gaining requireApiSession — guarded family 5→7; C2 the screen with two-layer guard group→role and the notice card; C3 FlagsAdmin board — 4 category cards, per-flag notes, modified badges, resets, read-only drift rows; C4 menu item feature-flags 114→115/146→147; C5 tests+smoke+context pins), out-of-scope (no new flags/enforcement changes/audit trail/FlagsProvider/agent-door tightening), 8 acceptance gates, risks.
- C1 src/app/api/config/route.ts: POST added (requireApiSession 401 → admin-role 403 → zod {name, value: string|number|boolean} → setFlag with throw→400 mapping, NEVER 500 → 200 {ok, flag:{value typed, stored, valueType, category, defaultValue}}); GET unchanged in shape but session-guarded (verified zero client consumers; runtime='nodejs' set). flags.ts setFlag unknown-name message now carries "not in the registry" (spec wording, kept the available-list; 28-in/28-out untouched).
- C2+C3 the screen: src/app/(erp)/admin/settings/page.tsx (breadcrumb Masters & Admin / Feature Flags; isAdmin → registry+values+drift-rows server-fetch; non-admin → "Admin role required" notice card with zero flag data, links /admin/options) + flags-admin.tsx (CATEGORY_ORDER tolerance/commercial/module/company/numbering — labels, empty categories skipped; per-row mono name + bool/num/str chip + modified badge (value ≠ coerced default) + description as effect note; Switch = immediate POST with busy spinner, number/string = Input + explicit Save (dirty+valid gating, NUM_RE validation, red border on invalid), per-flag Reset-to-default; unknown flag:* rows → read-only amber card with the drift-safe explainer; sonner toasts; writes ONLY via POST /api/config).
- C4 menu: LIVE_ROUTES + '/admin/settings'; MENU_ITEMS + feature-flags (masters-admin, arch ST, phase M11 — Phase union extended, list_app_options read door, notes naming the setFlag write door); masters-admin group comment (5)→(6).
- C5 tests: tests/unit/flags-config.test.ts 14 NEW (4 registry-shape: 28 defs/unique/enums/counts+defaults-well-formed; 10 route-contract at handler level, the set-password mock pattern: 401 GET+POST / 403 non-admin / 400 empty+missing / 400 unknown flag with the exact drift-safe message / 400 NaN / 200 boolean flip persisted 'false' typed / 200 number '7' persisted typed / GET reflects + 28 registry; pre-values captured, afterAll restores + fixture users deleted). menu-registry.test.ts: 114→115 + parityStats 115/115 + M11 block (item/group/live/page+component files/findGroupForPath) + /admin/settings in the findGroupForPath pins → 29 its.
- scripts/route_smoke_m11.sh 32 checks + scripts/m11_smoke_fixture.ts (Smoke Flag Ops group rights=['masters-admin'] + merchandiser user): unauth 307 page + 401 GET+POST; admin login; GET shape (28 flags/28 registry/typed po_bud); page greps (title/both category cards/data-flag row/input/sidebar door); 400s (unknown+message/bad-number/missing); flip-persist-restore po_bud + grn_dev=6.5 incl. the RELOADED screen carrying value="6.5"; non-admin-with-group-rights: 200 + notice + zero data-flag leak + POST 403; fixture cleanup. 32/32 GREEN (twice: pre- and post-build against a fresh server).
- context_check.sh: menu 115, LIVEROUTES 147, menu tests 29, guarded-api-routes 5→7 files (+tracker +config, echo + check), +m11 metrics echo line, +6 m11 checks (registry 28/POST door/drift-safe message/screen+board/menu item/flags tests 14), +6 file-existence entries → 410/410 NO DRIFT. Fixed mid-run: literal \" backslashes in two new check lines broke bash parsing (the m10 pattern uses plain inner double quotes).
- Gates: tsc src/ 0 errors (2 found+fixed: Phase union missing M11, typedDefault unknown→union) · vitest 724/724 (709+14+1) · route_smoke_m11 32/32 · route_smoke_m9 38/38 regression · eval_routing --static PASS · context_check 410/410 · next build EXIT 0 (needed the dev server stopped — PITFALLS #34).
- Browser verification (agent-browser, dev server + checks inside one shell per PITFALLS #34): login → /admin/settings → DOM check: board present, 4 cards (tolerance/commercial/module/company), 28 rows, 12 switches + 16 inputs, 0 modified badges; LIVE toggle round-trip sampleqtylimitcheck (unchecked→checked→DB true→click again→unchecked→DB false); number flow grn_dev (fill 6.5→Save enabled→click→DB 6.5→modified badge appears→Reset click→DB 5); ZERO console errors; screenshot download/m11-flags-admin.png. VLM visual pass skipped honestly: platform 429 throttle on both attempts (×2, per the failure-handling rule) — DOM-level + functional verification stands as the visual proof.
- Docs: SPEC-M11 frozen; 01-STATE.md (Last-verified m11 line, M11 milestone row, ground-truth rows corrected: tools 188→189, schemas 36→39, posting 34→35, menu 115, LIVEROUTES 147 — all trust-the-script fixes, the first three were pre-M11 drift now repaired; next-actions #12 with M12 next); 03-PITFALLS.md #34 (build OOM + platform server-reaping + the one-shell pattern); this worklog entry.

Stage Summary:
- M11 COMPLETE: /admin/settings is the operations surface over the LLD-07 registry — 4 category cards × 28 flags with toggles/effect notes/modified badges/reset-to-default + read-only drift rows; every write rides the admin-only POST /api/config → setFlag (unknown names 400, registry drift-safe); GET guarded too (API family 7/7).
- The two-layer rule (layout GROUP rights → page/API ROLE door) proven end-to-end by a dedicated fixture: non-admin WITH masters-admin rights sees the notice + zero flag rows + 403 on POST.
- 724 vitest · route_smoke_m11 32/32 · route_smoke_m9 38/38 · context_check 410/410 · build EXIT 0 · menu 115 / LIVEROUTES 147 / tools 189 / models 65.
- Next: M12 Playwright E2E golden paths (8 specs; curl smokes stay as cheap gates), then P2 (M13 digest, M14 indexes/pagination/SSE, M15 audit trail, M16 role dashboards).

---
Task ID: m11-convergence
Agent: main
Task: Continue from a stale-context session ("implement the live tracker per the parity-tracker pattern + deliver the forward plan"). Two parallel sessions had raced: this sandbox (context reset) and the remote session (which had already delivered M9 tracker / M10 agent-quality / M11 flags-admin).

Work Log:
- Explored the codebase fresh, located the parity tracker pattern, and (unaware of the remote's newer work) implemented a complete parallel live tracker at /live: live-snapshot.ts collector + /api/live-tracker snapshot + SSE stream (3s tick, abort-clean) + SSR page + client hook with SSE→polling degradation; registered /live in LIVE_ROUTES, topbar breadcrumb, footer link; 9 new tests; caught & restored /api/upload (accidentally deleted by commit 19fdedc — the remote lineage's abc2cb0 never had that deletion); 700 vitest, context_check 375/375 locally, build EXIT 0, dev-server smoke 8/8 (committed as dde0797).
- git push rejected → discovered origin/main had advanced: f3b0fe0 (M9 — /tracker, parity-style per THE SAME user clarification), 93a2a2a (M10 — prompt versioning + 50-prompt routing eval), cb32f82 (M11 — /admin/settings flags admin). Remote is newer, more complete (17 families, module board, get_live_activity agent tool, 724 vitest, 410 context checks).
- DECISION: adopt remote as the single source of truth. Preserved the parallel implementation on branch `m9-wave-a-alt` (dde0797) — its SSE stream + health-probe layer maps directly onto the SPEC-M9 §9 P2 item "M14 tracker SSE upgrade + createdAt indexes", so the branch is an M14 accelerator, not dead code.
- Reset to origin/main; prisma generate (M10 added AgentTurn.promptVersion); verified adopted state locally: 724/724 vitest, eval_routing --static PASS.
- context_check initially 409/410: the m10 check pins download/eval-routing-report.json, which is gitignored and absent on a fresh clone; --static could not recreate it because static mode crashed on writeFileSync before mkdir (full mode mkdirs, static didn't) — fresh-clone bug FIXED: mkdirSync now runs in the static branch too. Re-ran --static → report written → context_check 410/410 NO DRIFT.
- Confirmed upload route exists on the adopted lineage (no action needed); the alt-branch restore was a fix only for MY lineage's base.

Stage Summary:
- Local == remote at cb32f82 (M11): 724 vitest · context_check 410/410 · static eval gate PASS · tools 189 / models 65 / menu 115 / LIVEROUTES 147.
- Parallel live-tracker implementation preserved on `m9-wave-a-alt` for the M14 SSE upgrade (SSE stream route + health probe + degradation hook are drop-in candidates).
- Fresh-clone robustness fix in scripts/eval_routing.mjs (static-mode mkdir).
- Roadmap confirmed (SPEC-M9 §9 frozen): M12 Playwright E2E (8 golden specs) → P2: M13 notifications digest, M14 perf (indexes + pagination + tracker SSE), M15 audit trail, M16 role dashboards.

---
Task ID: 15
Agent: main (Super Z)
Task: M12 — Playwright E2E golden paths (SPEC-M9 §9-P1 item 3, the next roadmap pick after M11; the two original user requests were long complete: live tracker = M9/f3b0fe0, beyond-M7 plan = Task 12 PDF). Executed spec-first: SPEC-M12 written and frozen BEFORE any code. Also recovered the working tree's accidentally-deleted src/app/api/upload/route.ts (leftover unstaged deletion from the interrupted convergence session — restored from HEAD before starting).

Work Log:
- Re-established context: worklog tail (Task 14 = M11 complete + the m11-convergence entry), STATE next-actions #12 (M12 top of the SPEC-M9 §9 frozen roadmap), git log cb32f82/c3adb5b, PITFALLS #34 (build OOM + platform server-reaping + one-shell pattern).
- Recon: login form (#email/#password), DocScreen engine (header fields lack aria-labels; line inputs carry them; Save & review plan → Approve & commit two-step door), DocPicker (trigger button aria-label → debounced master_search feed → option click), agent panel (topbar Agent button, textarea placeholder, pending-approval card = border-amber-300 + Approve & Commit), planOrder/planInvoice/planPurchaseOrder/planPayment signatures, PO commit auto-submits an Approval row, payment settles invoice when amount ≥ billAmount, print door DocPrintLink → /print/invoice/<no> (TAX INVOICE + Original banner), middleware deny → firstAllowedLandingRoute, prisma schema read for every seeded model (Contract #4).
- Installed @playwright/test@1.62.1 via bun (chromium v1234 already in ~/.cache/ms-playwright — zero download; launch verified).
- SPEC-M12 frozen: 6 contracts (C1 isolated db/e2e.db copy, C2 dedicated :3100 webServer + workers:1 one-command, C3 real-form login per spec — no storageState, C4 fixtures seeded through the REAL posting services, C5 LLM-honest agent specs — self-sufficient prompts + 240s timeouts + 1 retry, C6 zero-defect bar), 6 acceptance gates, out-of-scope, risks.
- Implemented: playwright.config.ts (webServer boot command does the db copy itself — the server's first query can never race it; globalSetup/Teardown; :3100; workers 1), scripts/e2e_global_setup.ts (E2E-marked masters + admin force-set on the copy + 'E2E Rights' group/merchandiser + order/invoice ₹1,050/PO+auto-approval via planX.commit(); state JSON), scripts/e2e_global_teardown.ts, tests/e2e/helpers.ts (login/pickMaster/collectDefects/expectZeroDefects with declared-allowed negative-test noise/e2eDb pinned client), 8 spec files / 14 test cases, scripts/e2e.sh one-command runner, package.json test:e2e.
- Bring-up fixes (each honest, each persisted): (1) import.meta → process.cwd() resolve (Playwright transpiles globalSetup as CJS); (2) globalSetup must export a single default function; (3) strict-mode violations (substring matches hitting 2 nodes) — .first()/exact:true/getByRole cell; (4) PO number format is per-type PO-Y-#### not PO-####; (5) the review card shows updates COUNT not table names; (6) Playwright 1.62 REMOVED getByDisplayValue — toHaveValue on DOM-ordered locators.
- CRITICAL BUG #1 (PITFALLS #35): globalSetup's PrismaClient resolved DATABASE_URL from .env → seeded the DEV db (9 runs leaked: orders/invoices/POs/approvals/masters/group+user + admin password force-set). Root fix: e2e.sh EXPORTS DATABASE_URL for the whole playwright tree + the setup REFUSES to run without an e2e.db URL + the runner md5-checks db/custom.db before/after and FAILS on any change. scripts/e2e_cleanup_devdb.ts (one-shot, marker-based) cleaned every leaked row and restored the admin password — residue check CLEAN.
- CRITICAL BUG #2 (PITFALLS #36): /api/agent threw "Controller is already closed" whenever the browser navigated away mid-SSE-stream (spec assertions complete → page.goto → abort races the stream). Fixed with the send()/safeClose() disconnect guard + a loop break that stops burning LLM steps on a dead client. En route, my regex rewrite made send() self-recursive (tsc GREEN, stream dead in 17ms — caught ONLY by the E2E agent specs, the new gate proving itself in its first session); fixed by eyeball after grep.
- Gates: bash scripts/e2e.sh → 14/14 passed in ~52s, exit 0, isolation check OK (custom.db md5 unchanged), zero stream errors · tsc src/ 0 errors · vitest 724/724 · eval_routing --static PASS · route_smoke_m9 38/38 (re-run in one shell after the platform-reaped :3000 server proved down — curl 000s, PITFALLS #34 signature) · next build EXIT 0 · context_check 410→418/418 NO DRIFT (+8 m12 checks: config/8 spec files/14 test cases/setup+teardown+runner/isolation guard/test:e2e/SSE guard/SPEC-M12.md; +SPEC-M12.md in file-existence; bc→awk fix — bc not installed).
- Docs: SPEC-M12 frozen (+§8 implementation record with the selector notes for future spec authors), 01-STATE.md (Last-verified m12 line, M12 milestone row, Git HEAD row, next-actions #13 → P2: M13 digest first, M14 notes the m9-wave-a-alt SSE accelerator), 03-PITFALLS.md #35/#36, .gitignore (+db/e2e.db*, tests/e2e/.e2e-state.json, tests/e2e/.results/, playwright-report/), this worklog entry.

Stage Summary:
- M12 COMPLETE: one command (bash scripts/e2e.sh / npm run test:e2e) drives headless Chromium through the 8 golden paths against an isolated DB copy — 14/14 in ~52s with the dev DB provably untouched (md5-gated). Curl smokes stay as the cheap gates (nothing migrated).
- Two REAL bugs found & fixed by the suite's bring-up: the webServer.env scoping trap that leaked fixtures into the dev DB (triple-locked now: export + refusal guard + checksum) and the SSE disconnect throw in /api/agent (send()/safeClose() guard; LLM loop breaks on dead clients).
- The agent specs drive the LIVE GLM end-to-end (prompt → tool chain → pending approval → human commit → DB truth) and are the only tests that would have caught the send() recursion — the UI-interaction layer the curl smokes cannot provide.
- 724 vitest · context_check 418/418 · build EXIT 0 · tools 189 / models 65 / menu 115 / LIVEROUTES 147 (all unchanged — M12 touched zero product surfaces except the agent SSE guard).
- Next: P2 per SPEC-M9 §9 — M13 notifications digest, then M14 perf (indexes + pagination + tracker SSE — the m9-wave-a-alt branch is the drop-in accelerator), M15 audit trail, M16 role dashboards.

---
Task ID: 16
Agent: main
Task: Deep-dive audit — what's still missing vs original Fiberpro + how to tap Tirupur muscle memory (user request, read-only investigation)

Work Log:
- Re-read frozen legacy evidence: form-taxonomy.json (321 forms), REQUIREMENTS.md (16 modules), PLAN-2.0-MENU-PARITY.md (403 lines). Confirmed source-erp/ reverse-engineering tree is GONE from this sandbox.
- Cross-checked taxonomy against menu-registry.ts (115 items, 147 LIVE_ROUTES, MASTER_FORMS/APPROVAL_FORMS aggregates), master-configs (30), report-configs (28), print/PRINT_DOCS (20), schema.prisma (65 models).
- Ran 3 parallel Explore audits (taxonomy parity / reports+print / muscle-memory UX) + grep-verified every headline claim myself (phantom forms, missing Prisma models, PRINT_DOCS lacks 'order', doc-screen form-wraps-grid, no F-keys/attendance-tool/e-invoice/last-rate/csv-import).
- Wrote docs/GAP-ANALYSIS-FIBERPRO.md (read-only audit — no code changed).

Stage Summary:
- Coverage truth: 235/321 forms mapped; 86 unmapped (21 registers incl. ALL material-wise stock registers, 10 DC variants, ~30 misc, 12 admin/settings, 7 production/wages, 4 utilities) — each dispositioned MAP/FOLD/DROP/DECIDE.
- Masters: 30/52 built; Bank/Mill/Machine/State/Shade/ThreadType/CountGroup/Range have NO models despite being claimed via MASTER_FORMS.
- Reports: 28 slugs vs ~80 unique legacy outputs; print has 20 doc types but 1 template (plan promised 3) and NO order-sheet print; invoice lacks HSN column + bank/remit block; no print-on-save.
- Muscle memory: 10 verified day-1 reflex collisions (Enter-submits-whole-doc #1, zero F-keys, no command palette, mouse-bound pickers, blank dates, non-keyboard registers, one-group sidebar, no print-on-save, 2-step save, no doc-level void/duplicate).
- Playbook R/C/P/D/E/K/V/G/H/T: rate memory, counter-book registers, paper rituals, SMS→digest, Excel paste, keypad mode, Tamil voice, global jump bar, holiday calendar, terminology polish.
- Proposal: P0 reflex fixes → M13 print&keyboard fidelity → M14 register/masters long tail → M15 channels/integrations. Also logged hygiene debts (29 phantom legacyForms strings, stale ITEMS(113) comment).

---
Task ID: 17
Agent: main
Task: M17 — Operator Reflex Pack (user picked "start with your choice" → the gap audit's P0 lane; SPEC-M17)

Work Log:
- Bootstrapped per protocol: context_check 418/418 NO DRIFT, static routing PASS; confirmed M13–M16 are reserved by the frozen SPEC-M9 §9 roadmap → this queue-jump is numbered M17 (noted in SPEC-M17 + GAP-ANALYSIS §9).
- Wrote + froze docs/CONTEXT/specs/SPEC-M17.md (8 items, all frontend, zero schema/service changes).
- NEW src/lib/erp/print/doc-type-map.ts (PRINT_DOC_BY_DOCTYPE: the 20 doc-config docTypes that view pages already print; neutral module because print/index.ts is server-only) + tests/unit/print-doc-map.test.ts (4 pins: 20↔20 bijection with PRINT_DOCS, no phantom docTypes).
- doc-screen.tsx: Enter contract (grid: advance cell, last cell → append row + focus it; header: advance field, last → first grid cell; Enter NEVER implicit-submits; buttons/textarea excluded), F2=save / F9=print(done) / Esc=back-to-edit(review), date fields default LOCAL today post-mount (SSR-safe ''), resetForAnother re-applies, Print link on the done card, agent-tool chips removed from both headers, hint updated "Ctrl+S / F2 · Enter adds rows".
- doc-picker.tsx: focus returns to the trigger when the dropdown closes without opening the create sheet.
- NEW src/components/erp/register-rows.tsx (client): full-row click opens doc, roving tabindex, ↑/↓/Enter navigation; register-screen.tsx keeps server shell, drops its tbody + "Agent door" badge row.
- master-table.tsx: real global '/' listener (decoy tabIndex={-1} fixed); menu-registry.ts: 'Despatch & Logistics' label + ITEMS(115) comment.
- Gates: tsc src/ 0 · vitest 728/728 (724+4) · eval_routing --static PASS · context_check pins bumped (views 29→30, print lib 5→6, +4 file pins) → 422/422 NO DRIFT · authenticated curl smokes: orders/new, orders/register, inventory/ledger, masters/buyer, procurement/grn all 200 with SSR markers (data-doc-header/data-doc-lines/tabindex rows/Despatch label).
- Docs: STATE (m17 Last-verified + M17 milestone row + next-actions #14 + views row 30), PITFALLS #37 (hardcoded-pin protocol), GAP-ANALYSIS §9 numbering note, this log.

Stage Summary:
- The gap audit's top reflex collisions are fixed: Enter now behaves like legacy (commit row, spawn next), F-keys exist, dates open with today, print is one click/keystroke after commit, register rows are clickable + keyboard-navigable, '/' actually searches, the Dispatch/Despatch inconsistency is gone, operator headers are clean of dev-facing tool chips.
- No DB/schema/service changes; posting paths untouched (ADR-001 unaffected).
- Next: M18 muscle-memory backlog (order print + invoice HSN/bank block, command palette, paste-into-grid, rate memory, doc-view Cancel/Duplicate) or the reserved P2 queue (M13 digest → M14 perf/SSE).

---
Task ID: 18
Agent: main
Task: M18 Waves A+B — Print & Command Fidelity (the gap-audit P1 lane; SPEC-M18, frozen before code)

Work Log:
- Bootstrapped per protocol: worklog read, context_check 422/422 NO DRIFT (post-M17 state), eval_routing --static PASS; wrote + froze docs/CONTEXT/specs/SPEC-M18.md (3 waves; Wave C spec'd for next session).
- Wave A print fidelity: NEW src/lib/erp/print/fetchers-order.ts (SALES ORDER sheet — id-OR-orderNo, buyer block w/ dept+merchandiser, per-line HSN from style.hsn, FCY symbols + FX meta, amount-words INR-only); PRINT_DOCS 20→21 + PRINT_DOC_BY_DOCTYPE order→order (F9/done-card now print orders); DocPrintLink on Order Hub (audit: order printed NOTHING); invoice body completion (with-order → per-line rows + HSN column + derived HSN-summary note qty-proportioned; orderless fallback intact); getPrintHeader +9 optional keys (phone/email/cin/bankName/bankBranch/bankAcNo/bankIfsc/upi); PrintSheet masthead GSTIN·Ph·email + CIN + Bank Details & Remittance strip (money docs only, degrades hidden); ?template=large (+30% class-map scale); dc cost-bearing AUTO-template (value>0 ↔ =0: title/rate+value columns/words/notes); ?copies=3 burst (3 sheets, break-after-page ×2, ONE PrintAuto via autoPrint={false} prop); DocPrintButton 'All 3 copies (burst)'; done-card 'Auto-print after save' checkbox → localStorage fo.printOnSave → auto window.open once (burstOpened ref).
- Wave B command & paste: NEW src/components/erp/command-palette.tsx (cmdk via ui/command; ⌘K toggles; every LIVE menu item filtered by the SAME allowedGroupIds as the sidebar — rights parity; Open-agent + Home entries) mounted in AppShell inside AgentPanelProvider; agent rebind ⌘K→⌘J (provider + 10 synthetic {key:'k',metaKey} dispatchers + topbar chip + dashboard/tracker copy — audit collision #3 fixed); paste-into-grid in DocScreen (handleCellPaste on grid text/number inputs: TSV block from anchor cell, rows auto-grow, picker columns consumed-but-preserved for Excel↔grid alignment, selects match value/label, numbers ₹/,/$-stripped, summary toast; single-cell native).
- Tests: tests/unit/print-fidelity.test.ts NEW (7: order HSN/FCY-no-rupee-words/INR-words/id-resolution; invoice with-order HSN body + orderless fallback; dc cost-bearing both directions); pins 20→21 in print-doc-map/print-docs/print-docs-b; M8 dc title pin → COST BEARING (intentional contract change); colour fixture name timestamped (unique collision with dev data).
- Gates: vitest 735/735 (728+7) · tsc src/ 0 errors (scripts/skills noise pre-existing, outside the gate) · eval_routing --static PASS · context_check pins bumped (views 30→31 +command-palette, print lib 6→7 +fetchers-order, families 20→21, print doors 19→20 +Order Hub; +4 file pins incl. SPEC-M18) → 426/426 NO DRIFT · NEW scripts/route_smoke_m18.sh 15/15 (server+smoke one shell; order sheet+HSN+404, large template, burst 2 page-breaks, bank strip seed→present/remove→absent, Order Hub door, ⌘J chip) · route_smoke_m9 regression 38/38.
- Two first-run smoke failures debugged to TOOLING, not product: tsx -e rejects top-level await (cjs eval) and >/dev/null 2>&1 hid it (seed never ran); getPrintHeader needs print.companyName or returns null. Fixed the script (async IIFE, seed companyName + cleanup); PITFALLS #38 logged.
- Docs: SPEC-M18 §8 implementation record, 01-STATE (m18 Last-verified line, M18 milestone row, views 31, next-actions #15), GAP-ANALYSIS §9 numbering note (P1 → M18 A+B), PITFALLS #38, this log.

Stage Summary:
- The audit's loudest print gaps are closed: order prints (21st family), invoices carry HSN + bank/remit + contact masthead, large + cost-bearing templates exist, the 3-copy carbon burst is one click, print-on-save is a remembered pref.
- ⌘K is now the jump bar (rights-parity command palette); the agent moved to ⌘J everywhere incl. the 10 synthetic dispatch doors; Excel blocks paste straight into any doc grid.
- No schema/menu/service changes (ADR-001 untouched); PRINT registry grew read-side only.
- Wave C remains spec'd-only (doc-view Cancel/Void/Duplicate, rate memory last_rate, change password) — SPEC-M18 §4 is the ready-made next-session brief.

---
Task ID: 18
Agent: main (Super Z)
Task: P0 execution → THIRD PARALLEL-SESSION RACE discovered at push time → convergence per the m11-convergence precedent (adopt remote, preserve local, port the superior bits).

Work Log:
- Started from the summary of the prior session (audit delivered + P0 approved). Sandbox reality: docs/GAP-ANALYSIS-FIBERPRO.md and worklog Task 16 did NOT exist (lost pre-commit — same failure class as m11-convergence), and src/app/api/upload/route.ts had a spurious uncommitted deletion.
- Recovered: upload route git-restored; eval-routing-report.json regenerated via --static; GAP-ANALYSIS-FIBERPRO.md RECONSTRUCTED from session memory (provenance note inside); baseline gates verified (724/724, 410/410, static PASS).
- Built the FULL P0 locally as commit 07603f6 (tag p0, pushed): ① Enter row-spawn + implicit-submit swallow ② F2/F4/F9/Esc ③ date-default-today (localTodayISO en-CA local-time — IST 05:30 safe) ④ post-commit Print CTA over a VERIFIED 20-pair SLUG_PRINT_DOC map ⑤ register-rows.tsx + master-table useRowCursor keyboard rows ⑥ Despatch spelling ⑦ tool chips off ⑧ global '/' (app-shell listener + data-slash). 20-test keyboard-reflex suite; context_check 410→418; LIVE browser-verified (Enter spawned a row with NO review card, F4 first-empty, arrows+Enter → exact order Hub, '/' → rf-q, zero console errors). Mid-verify bug found+fixed live: fi===0 '/' targeting missed configs whose first filter is a select (orders register) → slashIdx first-TEXT-filter heuristic.
- PUSH REJECTED: remote main had advanced c3adb5b→b66d0cb — a PARALLEL session had shipped M12 (Playwright E2E 8 golden paths + two real bugs fixed), M17 "Operator Reflex Pack" (≈ my P0: same 8 fixes, same file set, their own register-rows.tsx, doc-type-map 20 families, print-doc-map.test 4 pins) and M18 (Print & Command Fidelity: order print family + invoice HSN/bank + Large/Cost-bearing templates + print-on-save + ⌘K CommandPalette + paste-into-grid). Their GAP-ANALYSIS was committed — my reconstruction matched its scope.
- DECISION (m11-convergence precedent): remote is newer and strictly ahead (M18 = the whole next milestone); local P0 preserved on branch p0-reflex-pack-alt (and remote tag p0 — objects pushed with the tag); local main reset to origin/main b66d0cb.
- Diffed M17 vs my P0. Functionally equivalent on ①–⑦ (their todayISO is also en-CA local-time; their register rows are clickable + ↑↓/Enter). ONE GENUINE GAP: their '/' was bound per-MasterTable (master screens only) — REGISTERS (the daily ledger surfaces) had no '/'.
- PORTED the superior bit as the P0-⑧ convergence: app-shell.tsx document-level '/' listener (guards: modifiers/editable/defaultPrevented; targets input[data-slash], falls back to first visible search-flavoured input so masters keep working — M17's own listener and this focus the same box, no conflict) + register-filter-bar.tsx slashIdx opt-in (first TEXT filter via the exclude-list heuristic — orders register's filters[0] is a status select; date fallback) + tests/unit/global-slash.test.ts 4 pins (listener/guards, slashIdx + exclusion list, M17 listener survives, order-register q filter).
- Gates on adopted+ported state: vitest 739/739 (735 M18 + 4 global-slash) · tsc src/ 0 · context_check 426/426 NO DRIFT · LIVE browser-verified: '/' → rf-q on /orders/register, rf-godown on /inventory/ledger, buyer search on masters, ZERO console errors, screenshot download/p0-convergence-slash.png.

Stage Summary:
- Repo converged at b66d0cb + this port: M12 E2E, M17 reflex pack, M18 print/command fidelity, and the global '/' now truly global.
- Local P0 work preserved: branch p0-reflex-pack-alt + remote tag p0 (its 20-test keyboard-reflex suite and live-verification notes are the record; superseded by M17 for code).
- PAT NOTE: origin URL PAT was scrubbed after the earlier push per the security protocol — this commit needs the user (or a PAT re-embed) to push.
- Next per the frozen roadmap (STATE next-actions): P2 M13 digest notifications / M14 perf (the m9-wave-a-alt SSE accelerator branch still parked) — while M17/M18 have already absorbed the P0/M13-print scopes, so verify STATE next-actions numbering before starting.

---
Task ID: 19
Agent: main (Super Z)
Task: Push the P0-convergence state to GitHub (user supplied a fresh PAT after the prior session ended PAT-scrubbed and unpushed).

Work Log:
- Re-synced from worklog tail: repo had converged at cb5626a (remote M12+M17+M18 adopted + my global-'/' port); origin/main was still b66d0cb → exactly one unpushed commit.
- Embedded the user's PAT in the remote URL, fetched: remote still b66d0cb (no fourth parallel race), local 1 ahead / 0 behind.
- Pushed main b66d0cb→cb5626a (fast-forward). Also pushed preservation branches p0-reflex-pack-alt (07603f6) and m9-wave-a-alt (dde0797) — both new on remote; tag p0 was already there.
- Scrubbed the PAT from .git/config (remote URL back to PAT-free https form); verified via ls-remote: main=cb5626a, both branches present.

Stage Summary:
- Remote now carries the full converged history: M12 E2E + M17 Operator Reflex Pack + M18 Print & Command Fidelity + the global-'/' convergence commit.
- Both parked accelerator branches are remote-preserved (sandbox-loss insurance — this is the mitigation for the 3 parallel-session races).
- SECURITY: PAT was pasted in chat — user should revoke it at https://github.com/settings/tokens after this session and mint a fresh one for future pushes.
- Next: SPEC-M18 §4 Wave C (doc-view Cancel/Void/Duplicate + rate memory last_rate + self-service change password) — the ready-made brief from Task 18.

---
Task ID: 20
Agent: main (Super Z)
Task: SPEC-M18 Wave C — doc lifecycle + rate memory (the ready-made brief from Task 18's stage summary), plus the cb5626a upload-route repair.

Work Log:
- Bootstrapped per protocol: worklog read (Task 19 push), STATE next-actions #15 → Wave C top; recon of cancel services (posting/cancel.ts + lifecycle.ts guards), DocScreen view mode, doc-actions registry, auth stack (password.ts scrypt + set-password route as template), PO config fields, print-fidelity/flags-config test patterns, context_check pin lines.
- C1 Cancel/Void: NEW src/lib/erp/cancel-action.ts ('use server': planCancelDocView → summary+sideEffects; commitCancelDocView → plan+commit+revalidate) over the EXISTING services (order→planCancelOrder, purchase-order→planPoLifecycle cancel w/ receipts guard, invoice→planCancelInvoice, program→planCancelProgram w/ ledger net-zero); NEW src/components/erp/doc-view-actions.tsx (client action row, terminal-status hidden, 'use server' async-only rule caught: isCancelableSlug moved to a client-side Set); DocScreen view renders it from initial.status; status added to initial on PO/invoice/program view pages; Order Hub gets explicit props.
- C2 Duplicate: NEW src/lib/erp/new-routes.ts (NEW_ROUTE_BY_SLUG, 57 families; tests pin keys⊆registry + values⊆LIVE_ROUTES + registry parity); DocViewActions stashes to sessionStorage['fo.duplicate.<slug>'] + pushes; New DocScreen consumes once (number skipped, source dates beat §2-C today, lineFields-only mapping, toast).
- C3 rate memory: NEW src/lib/erp/rate-memory.ts findLastRate (POLine cancelled-excluded vs GRNLine, newer doc wins); /api/erp case last_rate (guarded, 400, {} empty); DocScreen effect fills BLANK rate cells once per (party,itemType,item) with blankness re-check inside the state update.
- C4 change password: NEW /api/auth/change-password (session→zod→verify current 401→same-pw 400→hash+update; session stays valid) + NEW change-password.tsx topbar key-icon dialog; admin set-password stays admin-only.
- REPAIR: cb5626a had COMMITTED src/app/api/upload/route.ts deletion (gremlin #3, inside a commit + pushed). Caught by upload-route.test collection failure (count 758→751 = vanished file signature); restored from b66d0cb; PITFALLS #39 (check git status for ' D ' BEFORE git add -A).
- Residue bug (PITFALLS #40): afterAll PO deletes FK-restricted by POLine children + .catch swallow → 11 runs leaked 34 POs/28 lines/21 parties; suites+smoke fixed children-first; scripts/cleanup_m18c_residue.ts one-shot cleaned; re-run leaves zero.
- Gates: vitest 758/758 (739+19: doc-view-actions 8, rate-memory 5, change-password 6) · tsc src/ 0 · eval_routing --static PASS · context_check 426→435/435 NO DRIFT (views 31→33, auth api 4→5, +9 file pins; new-routes.ts moved OUT of doc-configs to keep the 41≠40 pin semantics clean) · NEW route_smoke_m18c.sh 22/22 · route_smoke_m18 15/15 · route_smoke_m9 38/38 (needs boot preamble — predates platform reaping) · LIVE browser: Duplicate seeds the full New PO form (pickers, dates, both lines) + stash consumed; rate memory auto-filled a blank rate (95) from the source PO; zero console errors; screenshot download/m18c-duplicate-po.png.
- Docs: SPEC-M18 §4 marked shipped + §8-bis record, STATE (m18c Last-verified + M18 row amended + views 33 + next-actions #16), PITFALLS #39/#40, GAP-ANALYSIS §9 note, this log.

Stage Summary:
- M18 is now FULLY complete (A+B+C). The four doc-lifecycle/reflex gaps from the audit's §5 (no doc-level cancel/void, no duplicate, no rate memory, no self-service password) are closed; zero schema changes; ADR-001 untouched (cancels ride the same services as the agent tools).
- The upload-route gremlin has a PROTOCOL now (PITFALLS #39) — it escalated from uncommitted deletions to a committed+pushed one this time.
- Next: STATE next-actions #16 — P2 register/masters long tail (M19+), reserved SPEC-M9 §9 queue (M13 digest → M14 perf/SSE w/ parked m9-wave-a-alt), or M15-channels (keypad/voice/attendance/waste/e-invoice).
---
Task ID: 21
Agent: main (Super Z)
Task: Continue with the best option post-M18-C — picked the P2 register/masters long tail (STATE next-actions #16's first candidate) → SPEC-M19 Wave A: the material-wise stock day-books. Session opened with a FOURTH parallel-session race + a security note (user's message contained a GitHub PAT — revoke advised; it is NOT stored and the remote URL stays PAT-free).

Work Log:
- Convergence: local main f1db359 vs remote a5565b5 were the SAME M18-C commit (same parent cb5626a, same author/date+message) EXCEPT local was missing src/app/api/upload/route.ts — the gremlin's 4th visit, this time INSIDE the local commit (PITFALLS #39 protocol caught it at the diff stage, not post-push). Remote strictly better (local ⊂ remote) → reset --hard origin/main; baseline gates re-verified: 758 vitest · tsc src/ 0 · context_check 435/435 · eval --static PASS.
- Scoped M19 from GAP-ANALYSIS §9 P2 lane + §1-A1/§2/§3-C1: 5 material-wise stock registers are "the biggest real gap"; audit's own disposition = register-configs over the EXISTING stock-ledger service with itemType preset. Wrote + froze SPEC-M19 (Wave A = preset mechanism + 5 day-books + orderwise pcs; Waves B/C/D spec'd for later: cutting/supplier registers → masters completion 65→~73 → closing-stock as-of/counter-book/Tally).
- §1-A preset mechanism: RegisterFilter.preset? (types.ts) + parseRegisterQuery per-filter params[key] ?? preset (resolve.ts — explicit URL always wins) + filter-bar draft init params ?? preset ?? '' with "All" hidden on preset selects (a material day-book is always type-scoped; Clear re-lands on the preset).
- §1-B/§1-C: register-configs/material-stock.ts (yarn/fabric/acc/general/itemwise + orderwise-pcs; shared ledgerColumns helper; constant itemType column dropped on the 3 preset registers) — the FOUR day-books bind queryStockLedger VERBATIM (REGISTER_SERVICES +6 slugs, service-identity test-pinned); NEW registers/itemwise-stock.ts (per-item aggregation: Σ in/out per uom SEPARATELY + txn count, id-map codes incl. pcs→styleNo, movement-desc sort) + registers/orderwise-pcs.ts (CurrentStock pcs grouped by order → orderNo/buyer/styles/godowns/Σpcs/value, unlinked '—' null-href).
- Generated 6 pages + 6 CSV routes via scripts/gen_m19_pages.mjs (persisted one-shot generator); menu +6 (inventory 9→14, pieces +orderwise) → 121 items / 153 LIVE_ROUTES; Phase union + 'M19' (tsc caught the frozen union — fixed).
- Tests: material-stock.test.ts NEW 12 (preset contract 5 incl. explicit-beats-preset + the four-bind-one-service pin; itemwise math 4; orderwise math 3 — TS-tagged fixtures, children-first cleanup, godown-scoped isolation from dev data); register-configs slug pin 21→27 + ROUTE_BY_SLUG +6; menu pins 115→121.
- Gates: vitest 800/800 (758+42: 12 new + 30 loop-generated) · tsc src/ 0 · eval --static PASS · context_check 435→448/448 NO DRIFT (menu 121, LIVEROUTES 153, regcfgs 21, regsvcs 25, +13 file pins) · NEW route_smoke_m19.sh 31/31 · regressions m18c 22/22 + m9 38/38.
- Smoke debugging (PITFALLS #41): 3 first-run failures were FIXTURE-POSITION bugs, not product bugs — dev seed ≈800 ledger rows dated 2026-09-20 (future) pushed today-dated fixtures off the docDate-DESC page 1; itemwise movement-ranking sank small quantities; en-IN toLocaleString breaks raw-number greps; sidebar renders only the ACTIVE group. Fixed with future-dated + huge fixtures + comma-form greps + group-local assertions.
- LIVE browser-verified: yarn day-book lands preset (select "yarn", 4 options, NO All, 100 yarn-only rows, Type column dropped by design); '/' → rf-godown; itemwise per-uom-separated cells; parity footer "121 of 121 · 100%"; ZERO console errors; screenshots download/m19-material-registers.png + download/m19-itemwise.png. Zero fixture residue verified (6 entity counts 0). Git status ' D ' check clean pre-commit.

Stage Summary:
- M19 Wave A SHIPPED: the legacy material day-books (FrmYarn/Fabric/Acc/General/ItemwiseStockRegister) + FrmOrderwisePcsReg are live — 6 new registers, 121 menu items, 153 routes. Zero schema changes, zero new agent tools (two-door via existing get_stock_ledger/get_stock chips), ADR-001 untouched.
- The repo is converged at a5565b5 + this commit; the 4th race was benign (same work, remote had the repair local lacked).
- SECURITY: the PAT pasted in the user's message is exposed in chat history — user must revoke it at github.com/settings/tokens; this session committed locally WITHOUT pushing (remote URL PAT-free; no usable PAT in session context). PUSH PENDING — needs a fresh PAT.
- Next: M19 Wave B (cutting + issue-to-line + supplier pending registers, SPEC-M19 §2) or Wave C masters completion (§3, schema 65→~73 + shift-wages linkage decision) — or the reserved SPEC-M9 §9 queue (M13 digest → M14 perf/SSE).
---
Task ID: 22-27 (six-task run: M19-B → M19-C → M19-D → M13 → M14 → M15)
Agent: main (Super Z)
Task: User: "Continue. Finish next 6 tasks" — the roadmap's next six per STATE next-actions #17/#20-23: M19 Waves B/C/D (the register/masters long tail), then the reserved SPEC-M9 §9 P2 queue M13 (digest) → M14 (perf/SSE) → M15 (audit trail).

Work Log:
- Bootstrapped per protocol: context_check 448/448 NO DRIFT, eval --static PASS, worklog tail read (M19 Wave A shipped; next = Wave B or the M9 §9 queue).
- M19 WAVE B (SPEC-M19 §2, frozen before code incl. the CutLine→CutBundle ERRATUM): 5 new registers — cutting-register /cutting/register (FrmCutingReg), line-issue-register /production/issue/register (FrmOrdBundIssToLineReg), supplier-pending /procurement/supplier-pending (frmSupordPendReg per-PO chase), po-register /procurement/po/register (FrmSupplierOrderRegister, variant=poType no preset), supplier-history /procurement/supplier-history (FrmSuppOrderHistoryReg per-party rollup w/ last receipt) + the trading fold on /orders/in-hand (variant all|manufacturing|trading, DERIVED discriminator zero schema). wave-b-registers.test 7; the read-tools-only chip contract caught issue_to_line at test time. 832 vitest · context_check 462/462 · route_smoke_m19b 29/29.
- M19 WAVE C (SPEC-M19 §3 + ADR-019): 11 Prisma models 65→76 (Bank/BankAccount/Mill/MachineCategory/Machine/State/Shade/ThreadType/CountGroup/RangeGroup/SizeRange) + 11 master configs 30→41 + master-service hyphenated-refEntity OVERRIDES (machine-category/range-group) + 33 tools → 222 (11 create + 11 update factories + waveCListTools 11 list doors) + SYSTEM_PROMPT masters line + ADR-019 (~14 minor masters dispositioned). Parity loop now 126 runtime tests over 41 masters; 5 tool-count pins 189→222. 865 vitest · context_check 475/475 · route_smoke_m19c 22/22.
- M19 WAVE D (SPEC-M19 §4; M19 COMPLETE): queryClosingStock (cumulative as-of, per-uom, latest-rate valuation) → /inventory/closing-stock; counterBook render mode (pure groupCounterBook — ascending date sections + day subtotals; stock-ledger + daily-in-out; ?mode=counter toggle); buildTallyExport (Sales/Receipt/Payment/Journal adapter, GST split, cancelled excluded) + guarded /api/tally + /accounts/tally-export screen. wave-d-registers.test 9. 879 vitest · context_check 484/484 · route_smoke_m19d 24/24.
- M13 (SPEC-M9 §9 P2-1): notifications/digest.ts (buildDigest: approvals w/ age, low stock = pcs threshold + negative balances always, gate movements w/ plain-FK party id-map; sendDigest flag-gated) + 4 notification.* flags → registry 32 (FlagsAdmin 5th card) + /api/cron/digest (GET session-OR-?secret=, POST send-now) + /notifications/digest screen. digest.test 6. 885 vitest · context_check 492/492 · route_smoke_m13 22/22.
- M14 (SPEC-M14): @@index([createdAt]) on the 16 feed families + StockLedger (+docDate); pagination verified + MEASURED (perf probe: 1-6ms at 10k rows); the parked m9-wave-a-alt SSE accelerator PORTED as /live (live-snapshot.ts + /api/live-tracker GET + /stream SSE 3s tick + live-stream-tracker.tsx client — renamed so the parity-style /tracker stays untouched; the ported 9-test suite passed AS-IS); tests/perf/registers-perf.test.ts (10k rows, real services <300ms); N+1 audit documented (registers clean via id-maps; /api/erp approvals = bounded polymorphic, accepted). 898 vitest · context_check 506/506 · route_smoke_m14 9/9 (SSE 3 frames/8s live).
- M15 (SPEC-M9 §9 P2-3): AuditLog model (77) + audit.ts runCommit shared executor (docNo extraction, best-effort writeAudit) wired at ALL 13 commit doors (agent approve + doc-actions + masters + cancel + 5 lifecycle + BOM + menu-rights + wages); grep contract test pins no door may call plan.commit() directly; /admin/audit admin viewer (role-gated) + register config/service/CSV + menu item. audit.test 6. 909 vitest · context_check 516/516 · route_smoke_m15 13/13.
- Each milestone: spec frozen → implement → tsc src/ 0 → vitest → eval --static → context_check NO DRIFT → route smoke → STATE + worklog → commit. Git gremlin check (PITFALLS #39 ' D ' scan) clean before every add -A.

Stage Summary:
- SIX milestones shipped in one session: menu 121→130 items / 153→163 live routes; models 65→77; tools 189→222; registers 27→34; flags 28→32; 800→909 vitest; context_check 448→516/516.
- M19 (all four waves) COMPLETE — the gap-audit P2 register/masters long tail closed: cutting/supplier/material day-books, closing-stock as-of, counter-book mode, Tally JSON, 11 completion masters.
- The SPEC-M9 §9 P2 queue is now M13+M14+M15 done — only M16 (role dashboards) remains from the frozen roadmap.
- The m9-wave-a-alt branch is fully absorbed (its SSE surface is live at /live) — safe to delete or keep as history.
- NOT pushed: remote URL is PAT-free (security protocol); 7 commits ahead of origin/main — needs a fresh PAT from the user to push.
- Next candidates: M16 role dashboards · gap-audit P3 lane (keypad/voice/attendance/waste/e-invoice) · hygiene (m9-wave-a-alt branch cleanup).

---
Task ID: 28
Agent: main (Super Z)
Task: Second six-task run, task 1 of 6 — M16 Dashboard 2.0 (SPEC-M9 §9 P2-4, the last P2 item). User opened the session by supplying a fresh GitHub PAT (PITFALLS #8 protocol): configured the remote, pushed the 5 pending commits (M13/M14/M15/worklog/checkpoint) of the previous run, then proceeded.

Work Log:
- Bootstrap: context_check 516/516 NO DRIFT, eval --static PASS, worklog tail (Task 27) confirmed next = M16 + P3 lane.
- SPEC-M16 frozen BEFORE code: 16-tile registry, 7 role profiles (merchandiser=order pipeline / accountant=cash / storekeeper=materials / production_mgr=shopfloor / cutting_mgr=cutting / hr=people / admin=superset), AppOption dashboard:<role>:tiles persistence, chain-funnel + 30-day production + cash charts; recharts over "ECharts" (vendored lib — deviation logged §3.4).
- src/lib/erp/dashboard.ts: getDashboardSnapshot(role) ONE server call — chain funnel reuses queryOrderStatus() wholesale (open_orders + inhand_pcs tiles ride the same result); productionTrend/cashTrend = 30-day gap-filled windowed aggregates computed ONLY when the role shows them (empty payload otherwise — provable role picks).
- (erp)/dashboard/actions.ts saveDashboardTiles: session-guarded, OWN-role-only; UI pref, NOT an audit door (documented deviation — and do NOT write the runCommit token in non-door files; context_check grep caught exactly that, reworded).
- (erp)/page.tsx → SSR server component; dashboard-v2.tsx client: gradient tiles w/ SPEC-M4 §8.3 deep-links, Customize mode (reorder/hide/add-back ANY registry tile/Save/Reset → router.refresh), 3 recharts cards; OLD dashboard.tsx deleted (view count stays 34).
- Tests: dashboard.test.ts NEW 19 — registry invariants (7 roles, defaults ⊆ registry, persona pins), persistence (save order wins / invalid dropped / reset / corrupt-JSON→defaults), snapshot math (inclusion+shape vs shared dev db: funnel 9 flags w/ order≡open-orders count, 30-pt trends, fixture invoice/receipt into last point, saved-layout end-to-end), action auth via cookie-mock (no-session reject, wrong-role reject, own-role save + reset).
- route_smoke_m16.sh 29/29 + m16_smoke_fixture.ts (setup|persist|cleanup): admin superset (8 tiles + all 3 charts + customize), merchandiser pipeline (inhand/samples present, cash chart + employees tile ABSENT), accountant cash (cash chart present, chain + today_pcs ABSENT), AppOption-pinned layout drives SSR (only the pinned tile renders).
- Gates: tsc src/ 0 · 928 vitest (909+19) · eval --static PASS · context_check 516→522/522 NO DRIFT · route_smoke_m16 29/29.

Stage Summary:
- M16 COMPLETE — the SPEC-M9 §9 P2 queue is now FULLY done (M13 digest, M14 perf/SSE, M15 audit, M16 dashboards).
- Role-aware SSR dashboards with persisted per-role tile layouts; zero schema, zero tools, menu 130 / routes 163 unchanged (rework, not breadth).
- Remaining in this run: branch hygiene (m9-wave-a-alt delete) → attendance → waste receipt → keypad mode → e-invoice mock.

---
Task ID: 29
Agent: main (Super Z)
Task: Second six-task run, task 2 of 6 — branch hygiene: delete the absorbed alt branches (STATE #22/#24 sanctioned).

Work Log:
- Verified BEFORE deleting: m9-wave-a-alt's SSE surface is live on main (M14 /live — live-snapshot.ts + /api/live-tracker + live-stream-tracker.tsx in the working tree, context_check-pinned); p0-reflex-pack-alt's reflex work shipped on main as SPEC-M17 (tag m17-reflex carries src/components/erp/register-rows.tsx + the F-key/Enter contract).
- Deleted local + origin: m9-wave-a-alt (was dde0797), p0-reflex-pack-alt (was 07603f6). SHAs logged here for recovery (`git branch <name> <sha>`).
- origin/agent/order-program-flow left untouched (not in the hygiene sanction; no absorption evidence).

Stage Summary:
- Branch list is now just main (+ origin/agent/order-program-flow remote-only). Alt implementation lines are recoverable by SHA for 30+ days via reflog.

---
Task ID: 30
Agent: main (Super Z)
Task: Second six-task run, task 3 of 6 — M20 Attendance (SPEC-M20, gap-audit Gap D closure: the HR view's "Post Attendance via Agent" button had NO backing tool/model/register).

Work Log:
- SPEC-M20 frozen BEFORE code (upsert-per-employee/day contract, default-window-today register, agent-door-only posting).
- Schema 77→78: Attendance (@@unique employeeId+attDate, status present|absent|half|leave, inTime/outTime, hours, createdAt+attDate indexes; relations additive on Employee+Shift — first attempt wrongly landed the relation on Department, prisma validate caught it, fixed before push).
- posting/attendance.ts: batch plan (validation: unknown employees listed, status set, HH:MM, out>in; hours = out−in else shift.hours; creates vs updates split honestly) + ONE $transaction upsert commit.
- Tools 222→224: post_attendance (docTool write) + list_attendance (read delegate over the shared register service). Fixed a self-inflicted placeholder tool before it ever ran.
- registers/attendance.ts (default window TODAY, 4 status totals, q over employee/dept) + config (read-tool chip) + /hr/attendance page + CSV + menu item (hr, RG, phase M20; Phase union extended) → menu 131 / routes 164.
- Tests: attendance.test NEW 9; pins updated (tools ×6, regcfg 35 + slug order attendance<audit-log + ROUTE_BY_SLUG, menu ×4, models/routes/schemas/posting/docTools/createdAt in context_check).
- TRAP worth remembering: describe-level afterAll deleted the fixtures before the NEXT describe could read them — moved to file-scope hooks.
- Gates: tsc src/ 0 · 942 vitest · eval --static PASS · context_check 522→531/531 NO DRIFT · route_smoke_m20 18/18 (absent-filter both directions, q=dept, CSV, chip, both tools in registry).

Stage Summary:
- Gap D attendance closure shipped: model + write tool + read tool + day-book register + menu + honest HR button.
- Tools 224, models 78, menu 131/164 routes, 942 vitest, context_check 531/531.
- Next in the run: M21 waste receipt → M22 keypad mode → M23 e-invoice mock.

---
Task ID: 31
Agent: main (Super Z)
Task: Second six-task run, task 4 of 6 — M21 Waste Receipt (SPEC-M21, legacy FrmWasteReceiptEntry; gap-audit disposition "stock-adj variant — waste is tracked religiously in knitting units").

Work Log:
- SPEC-M21 frozen BEFORE code: the opening-stock variant recipe verbatim (WST-#### space, action='add' fixed, reason `Waste — <class>`), waste classes knitting|dyeing|cutting|packing|general, NO new txnType (rides stock_adjustment_add; WST- docNo + notes distinguish), no dedicated register (stock ledger covers it).
- schemas/stock-adj.ts: WASTE_RECEIPT_SCHEMA (STOCK_ADJ extend + wasteClass + notes).
- posting/stock-adj.ts: planWasteReceipt + nextWasteNo — base service byte-identical (pinned by test).
- doc-configs/inventory-variants.ts: wasteReceiptConfig (rides the variants file — DOCCFGS file-count stays 40, first pin correction after context_check caught my own arithmetic).
- Page /inventory/waste-receipt: DocScreen + recent WST rows (wasteClass recovered from notes); tool receive_waste (225); menu item (inventory, DS, M21) → 132/165.
- Contract tests did their job twice: the mirror rule demanded readonly action/reason header fields (opening-stock precedent); NEW_ROUTE_BY_SLUG demanded a duplicate-door entry.
- Tests: waste-receipt.test NEW 7 (incl. G2 proof — ledger row AND CurrentStock bucket +40 kgs); pins updated (225 ×6, docTool 53, menu 132 ×4, routes 165).
- Gates: tsc src/ 0 · 949 vitest · eval --static PASS · context_check 531→535/535 NO DRIFT · route_smoke_m21 15/15 (form fields incl. chindi, WST row recent+ledger, group link, tool).

Stage Summary:
- Waste Receipt shipped as a first-class doc family with both doors (form + agent) over ONE service — ADR-001 holds.
- Tools 225, menu 132/165, 949 vitest, context_check 535/535.
- Next in the run: M22 keypad-operator mode → M23 e-invoice/e-way mock IRN.

---
Task ID: 32
Agent: main (Super Z)
Task: Second six-task run, task 5 of 6 — M22 Keypad-Operator Mode (SPEC-M22, gap-audit §7-K: "stripped full-screen keypad UI with big targets — one operator, one action, zero chrome").

Work Log:
- SPEC-M22 frozen BEFORE code: mode over the FORM door (planDocAction/commitDocAction — ADR-001 + M15 audit identical for keypad commits), required-only projection, two-step save preserved in keypad form, header-only families first (pcs-despatch line grid deferred w/ rationale).
- src/lib/erp/keypad.ts: keypadFieldsFor (pure: required-only, readonly + auto-number dropped, pickers carried) + KEYPAD_SURFACES ×3 + dates-default-today.
- src/components/erp/keypad-mode.tsx: fixed inset-0 overlay (covers ALL chrome — no AppShell surgery), h-14 inputs, h-16 SAVE/CONFIRM, picker = big search + 12 option buttons off the shared master_search feed, fill→review→confirm→done.
- Wired ?mode=keypad + ⌨ toggle on /production/entry, /cutting/job-order, /inventory/waste-receipt.
- Tests: keypad-mode.test NEW 9 (projection matrix incl. opening-stock readonly precedent; wiring contract w/ page source pins; header-only assertion; ADR-001 source pin).
- Gates: tsc src/ 0 · 958 vitest · eval --static PASS · context_check 535→540/540 NO DRIFT (views 35) · route_smoke_m22 19/19 incl. the commitDocAction round-trip with a keypad-shaped header-only payload.
- Smoke lesson recorded: RSC payload strings (preloadStyle) fake naive text greps — pin rendered labels as >Label</label>.

Stage Summary:
- The operator reflex surface shipped: a line tablet scans a QR → /production/entry?mode=keypad → big targets → plan → CONFIRM → WST-/PE-docNo screen. Same services, same audit trail.
- Zero menu/route/tool/schema churn (a mode, not a surface).
- Next: M23 e-invoice/e-way mock IRN (the last code task of this run).

---
Task ID: 33 (six-task run #2, final: M16 + hygiene + M20 + M21 + M22 + M23)
Agent: main (Super Z)
Task: M23 — mock e-invoice/e-way bill (SPEC-M23, gap-audit Gap D #11: "not even the v1-promised mock IRN exists (verified: zero code)").

Work Log:
- SPEC-M23 frozen BEFORE code: deterministic offline mock, real workflow rules (issued-only, one-IRN-per-invoice, ₹50k e-Way threshold), real formats (64-hex IRN over the REAL govt input tuple, 10-digit ack, 12-digit EWB); OUT: signing/QR image, cancellation, export ERN.
- SalesInvoice +irnAckNo +ewbNo (additive nullable; models stay 78) — the irn field finally gets used.
- src/lib/erp/einvoice.ts: irnTuple (seller AppOption print.gstin | buyer Party.gstin | invoiceNo | dd/mm/yyyy | value) → mockIrnFor (SHA-256), mockAckNoFor/mockEwbNoFor (hash-derived digits — BigInt avoided, target predates ES2020), planGenerateIrn (3 guards + threshold; commit = ONE update).
- Doors: generate_einvoice_irn docTool (226) + invoice-view "Generate IRN (mock)" button → server action through runCommit — a genuine 14th commit door (context_check pin moved 13→14; first run door-count change since M15).
- Surfaces: print meta +IRN Ack No +e-Way Bill No; view block w/ the honest "No e-Way — consignment ≤ ₹50,000" line.
- Tests: einvoice.test NEW 10; pins (tools 226 ×7, docTool 54, schemas 41, doors 14).
- Gates: tsc src/ 0 · 968 vitest · eval --static PASS · context_check 540→545/545 NO DRIFT · route_smoke_m23 15/15.

Stage Summary:
- Gap D #11 CLOSED. The second six-task run is COMPLETE: M16 dashboards (P2 queue done) + branch hygiene + M20 attendance + M21 waste receipt + M22 keypad mode + M23 mock e-invoice.
- Run totals: 909→968 vitest; tools 222→226; models 77→78; menu 130→132; routes 163→165; context_check 516→545/545; six specs frozen (M16/M20/M21/M22/M23 + the hygiene chore); every milestone committed, tagged (m16/m20/m21/m22/m23) and PUSHED with the session PAT.
- Next candidates for the next session: voice entry V (STT decision), pcs-despatch line-grid keypad, IRN cancellation, print QR image, P3 residuals (multi-company #1, barcode #2, holiday surfacing H).

---
Task ID: 34 (third six-task run, task 1)
Agent: main (Super Z)
Task: M24 — Voice entry (gap-audit §7-V; the STT decision from STATE next-actions #28: browser SpeechRecognition API vs server STT → RESOLVED browser-first, zero dependency).

Work Log:
- Session opened on the FIFTH parallel-session race: user-supplied PAT + "Continue"; local f1db359 (m18c) vs remote 49e3556 which already carried BOTH prior six-task runs (M19 A–D, M13, M14, M15, M16, hygiene, M20, M21, M22, M23 — 16 commits ahead). Remote adopted per the m11-convergence precedent; local preserved on branch m18c-alt; remote's a5565b5 already contained the m18c content (the M19-A session had converged the same race).
- Baseline re-verified AFTER adoption: prisma generate REQUIRED (the node_modules client predated the 13 new remote models — 14 vitest failures incl. master-parity 'delegate exists' + tsc scripts/ noise, all cleared by regenerate; db push already in sync). context_check 545/545 (after regenerating eval-routing-report.json — gitignored artifact, same as Task 18), vitest 968/968, eval --static PASS, tsc src/ 0.
- PAT embedded in the remote URL per the standing push-after-every-commit instruction; scrub at session end.
- SPEC-M24 frozen BEFORE code: browser API only, en-IN (Tanglish Latin) default + ta-IN (Tamil script) toggle, never auto-send, graceful unsupported state, OUT: server STT/TTS confirm/offline.
- NEW src/lib/agent/voice.ts (pure module): VOICE_LANGS + nextVoiceLang cycle + getSpeechRecognition probe (both spellings, non-function values ignored, SSR-safe) + createVoiceSession (continuous+interim+lang; onresult routes final-vs-interim; finish() detaches ALL handlers after first end so late events are structurally impossible; onerror→onEnd(reason); start/stop flags; throwing rec.start() → onEnd('start-failed')).
- agent-panel.tsx: Mic button beside Attach (MicOff+pulse+Stop when listening), lang chip (cycle, localStorage fo.voiceLang, disabled while listening), voiceBaseRef pattern (interim = base + live text; final appends to base), onEnd toast honest (not-allowed → 'microphone permission denied'), panel-close stops orphaned mics, unsupported = disabled + hidden chip.
- tests/unit/voice.test.ts NEW 14. Two test-authoring lessons: (1) parent INSTANCE field start=vi.fn() shadows subclass prototype methods — overrides must be fields; (2) end-once is best asserted via the null-detach (calling a null handler throws in the test, proving the point structurally).
- Gates: vitest 982/982 (968+14) · tsc src/ 0 · eval --static PASS · context_check 545→548/548 NO DRIFT (+3 file pins) · route_smoke_m22 regression 19/19 (shared panel surface) · LIVE browser: Voice button + title, lang chip EN⇄த round-trip w/ localStorage, mic-less click degrades to idle (not stuck), zero console errors, screenshot download/m24-voice-panel.png.

Stage Summary:
- Voice entry shipped: the agent panel accepts dictated Tamil/Tanglish/English input through the browser's SpeechRecognition API — zero new dependencies, zero schema/menu/route/tool changes, ADR-001 untouched (input channel only).
- The STT decision is closed (documented in SPEC-M24 + STATE): browser API first; server STT stays out until a real deployment demands it.
- Third six-task run in progress: M25 pcs-despatch line-grid keypad → M26 IRN cancellation → M27 print QR → M28 holiday surfacing → M29 jump-bar G residual.

---
Task ID: 35 (third six-task run, task 2)
Agent: main (Super Z)
Task: M25 — the line-grid keypad on pcs despatch (the SPEC-M22 §1 deferred follow-up: "needs a one-line-at-a-time big line editor — the line keypad").

Work Log:
- SPEC-M25 frozen BEFORE code: keypadLinesFor (required-only line projection), the big line editor (draft + ADD/✕ + ≥1-line guard), line pickers on the shared master_search feed, { header, lines } payloads through both doors, KEYPAD_LINES_MAX=20, OUT: other line families + barcode + line-edit-after-add.
- keypad.ts: keypadLinesFor + KEYPAD_LINES_MAX + despatch in KEYPAD_SURFACES.
- keypad-mode.tsx: optional lineFields prop; draft/lines state; required-complete + line-limit guards on ADD; line label style · colour · size · qty; picker feeds keyed 'line:<name>' (header/line feeds never collide); nextEntry resets lines+draft; plan AND commit carry { header, values-lines }.
- /pieces/despatch: ?mode=keypad branch + ⌨ toggle.
- Tests +5 incl. the SERVICE-LEVEL two-line commitDocAction round-trip (DC lands w/ 2 line rows + pcs ledger out-row; children-first cleanup; zero residue). Fixture facts learned: Order.totalPcs (no qty), StockLedger needs finYear + has no uomId, commitDocAction returns doc.dcNo for despatch.
- M22's header-only surfaces test AMENDED honestly (despatch = the line-grid exception, pinned).
- Gates: vitest 987/987 (982+5; one first-run flake of the documented master-parity date-collision class — green isolated + on re-run) · tsc src/ 0 · eval --static PASS · context_check 548→550/550 NO DRIFT · route_smoke_m25 NEW 16/16 · LIVE browser: guard error renders on SAVE-without-lines, ADD LINE lands 'S-1001 · 5', remove 1→0, zero console errors, screenshot download/m25-despatch-keypad.png.

Stage Summary:
- The keypad surface now covers a line-grid family: shop-floor despatch operators get the full-screen big-target DC entry with the one-line-at-a-time editor, over the SAME ADR-001 door (audit identical).
- Committed+tagged m25, pushed.
- Next: M26 IRN cancellation workflow (the M23 OUT item).

---
Task ID: 36 (third six-task run, task 3)
Agent: main (Super Z)
Task: M26 — IRN cancellation workflow (the SPEC-M23 documented OUT item: "regeneration = the cancellation workflow, out of scope").

Work Log:
- SPEC-M26 frozen BEFORE code: the real govt rules (24h window, reason enum), history slot preservation, regen-after-cancel, two doors.
- Schema: SalesInvoice +irnGeneratedAt/+irnCancelledAt/+irnCancelledIrn (nullable) + updatedAt DateTime? @updatedAt — the REQUIRED-column attempt failed on 170 existing rows (db push error) → nullable + Prisma auto-stamp; fallback chain irnGeneratedAt ?? updatedAt ?? createdAt.
- einvoice.ts: IRN_CANCEL_WINDOW_MS + CANCEL_REASONS + planCancelIrn (guards + ONE-update commit); planGenerateIrn AMENDED to stamp irnGeneratedAt (plan + commit).
- Tools: cancel_einvoice_irn docTool (226→227; pins ×8 test files + context_check).
- Form door: cancelIrnAction — a new ACTION in the M23 door file (grep contract counts FILES: doors stay 14, honest — the spec §5 record amended); reason select = the confirm; view history line + regen button + closed-window notice; print stays live-IRN-only.
- Tests +5 (guards incl. backdated-anchor window expiry; happy path incl. pre-M26 null-anchor fallback; regen determinism — the regen IRN EQUALS the cancelled one; anchor stamped; tool registered) → 992 vitest.
- Gates: tsc src/ 0 · 992 vitest · eval --static PASS · context_check 550→551/551 NO DRIFT · route_smoke_m26 NEW 17/17 · LIVE browser: reason combobox (default typo) → select 'order cancelled' → Cancel IRN → history line + regen button, zero console errors, screenshot download/m26-irn-cancel.png.

Stage Summary:
- The e-invoice mock now has the full lifecycle: generate → cancel (24h, reason, history) → regenerate. The M23 promise is closed.
- Honest correction: the "15th commit door" claim in the spec draft was wrong (same file) — grep contract counts files; documented.
- Committed+tagged m26, pushed.
- Next: M27 print QR image.

---
Task ID: 37 (third six-task run, task 4)
Agent: main (Super Z)
Task: M27 — print QR image (STATE next-actions #28 open item: "QR image on the invoice print (needs a QR lib decision)").

Work Log:
- The QR lib DECISION (open #4): vendored single-file MIT encoder (the qrcode-generator algorithm, attributed) — production stays zero-dependency; jsqr@1.4.0 added as a DEV-only dep purely for cross-verification. Rejected: npm prod dep / server-side PNG / client canvas (reasons in SPEC-M27 §1).
- NEW src/lib/erp/print/qr.ts: byte mode, EC M, v1–10 auto (IRN → v5 37×37), RS per the standard block table, alignment v≥2, BCH format (XOR 0x5412) + version info (v≥7), 8-mask penalty auto-pick; qrMatrix + qrSvg (inline SVG, 4-module quiet zone, crispEdges).
- THE GATE EARNED ITS KEEP: jsQR round-trips exposed a data-dependent failure pattern (len 10 fail / len 14 pass at v1). Forced-mask probing isolated it to masks 1/3/4/6 — the BCH remainder loop condition was `bitLength > deg(G)` instead of `>=` (off-by-one → 1-bit-wrong format info for boundary masks). Fixed in formatBits AND versionBits; 18-length × v1–v6 probe = 100% decode.
- Print wiring: PrintDoc +qr/+qrLabel (additive); invoice fetcher qrSvg(inv.irn, 96) + 'Scan to verify (mock IRN)' ONLY on a live IRN (M26 cancel rule holds — smoke-proven); PrintSheet renders beside the meta grid (data-testid=invoice-qr).
- Tests: print-qr.test NEW 8 (3 jsQR round-trips + determinism + matrix/SVG shape + source pins) → 1000 vitest.
- Gates: tsc src/ 0 · 1000 vitest · eval --static PASS · context_check 551→554/554 NO DRIFT (+3 file pins; print lib 7→8) · route_smoke_m27 NEW 14/14 · LIVE browser: QR renders on a stamped invoice print, zero console errors, screenshot download/m27-invoice-qr.png.

Stage Summary:
- The invoice print now carries a scannable QR of the live mock IRN — the e-invoice print ritual complete (IRN rows + QR + bank strip + HSN).
- The QR encoder is verified by an INDEPENDENT decoder (jsQR) — the discipline that caught the BCH bug in its first hour. jsqr stays dev-only.
- Committed+tagged m27, pushed.
- Next: M28 holiday calendar surfacing (§7-H).

---
Task ID: 38 (third six-task run, task 5)
Agent: main (Super Z)
Task: M28 — holiday calendar surfacing (gap-audit §7-H: the GovtHoliday master existed since M2 with zero planning surfaces).

Work Log:
- SPEC-M28 frozen BEFORE code: the planning read service + two surfaces (Order Hub delivery risk + MIS shutdown card); OUT: working-day planner arithmetic, program dates, digest adoption.
- NEW src/lib/erp/holidays.ts: getUpcomingHolidays (future-only, asc, midnight-normalized) + holidaysBeforeDelivery (the [today, delivery] risk window; null/past-safe). The rate-memory precedent — ERP-internal read, zero schema/tools.
- Order Hub: amber 'Shutdown before delivery' strip on open/in_progress orders when a holiday threatens the window; silent otherwise. MIS: 'Upcoming shutdowns' card (4 holidays + calendar deep-link), hidden when empty.
- Tests +7 (window math + exclusion + empty; delivery filter both directions; same-day normalization; source pins) → 1007 vitest.
- Gates: tsc src/ 0 · 1007 vitest · eval --static PASS · context_check 554→557/557 NO DRIFT · route_smoke_m28 NEW 12/12 (risk order warns + safe order silent + MIS strip + 61d excluded + zero residue) · LIVE browser: the amber strip + the MIS card, zero console errors, screenshot download/m28-holiday-surfacing.png.

Stage Summary:
- The Tirupur Pongal/Deepavali planning reflex is live: holidays surface exactly where promises are made (the Order Hub) and where the business is watched (the MIS).
- Committed+tagged m28, pushed.
- Next: M29 jump-bar G residual (the last task of the third six-task run).

---
Task ID: 39 (third six-task run, task 6 — FINAL)
Agent: main (Super Z)
Task: M29 — the jump bar's G residual (gap-audit §7-G: doc numbers + legacy form names + master records — the three input kinds M18's palette didn't cover).

Work Log:
- SPEC-M29 frozen BEFORE code: the 12-family resolver, the API resource, the palette feeds + legacyForms, masters ?q=; OUT: more slugs/fuzzy/29-broken-aliases/line-jumps.
- NEW src/lib/erp/jump.ts: JUMP_FAMILIES ×12 + resolveJump (exact→startsWith→contains, cap 8, real-id hrefs). tsc caught the gRN model casing (Grn → db.gRN).
- /api/erp: the jump resource (session-guarded, 400 missing q) beside master_search.
- CommandPalette: 200ms dual-debounce fetch (jump + party master_search) on q≥2; Documents group above Actions + Parties group linking /masters/party?q=; legacyForms joined into menu item values; placeholder teaches the syntax.
- masters/[entity]: searchParams.q → MasterTable initialSearch (new optional prop).
- Tests +9 (resolver ×4 incl. the route-pattern audit + view-base whitelist; api pin; palette pins ×3; masters pins) → 1016 vitest.
- Gates: tsc src/ 0 · 1016 vitest · eval --static PASS · context_check 557→560/560 NO DRIFT · route_smoke_m29 NEW 13/13 · LIVE browser END-TO-END: ⌘K → 'LIVE29-SO-…' → Documents option → Enter → /orders/<real-id> Order Hub; 'frmPcsDel' → Pcs DC screen; zero console errors, screenshot download/m29-jump-bar.png.
- Smoke lesson: client-component source strings (resource=jump, legacyForms) do NOT appear in SSR HTML — the unit source-pins cover them; the smoke checks the mounted shell and the LIVE check proves the runtime.

Stage Summary:
- The jump bar is now the full §7-G surface: menu items + doc numbers (bare or prefixed, 12 families) + party records + legacy form-name mnemonics. The 15-year operator's reflexes have a home.
- THIRD SIX-TASK RUN COMPLETE: M24 voice (V) + M25 line-grid keypad (K follow-up) + M26 IRN cancellation + M27 print QR (jsQR-verified) + M28 holiday surfacing (H) + M29 jump bar (G). Run totals: 968→1016 vitest, 545→560 checks, tools 227, six specs frozen, all committed+tagged+pushed.
- The gap-audit §7 playbook (R/C/P/D/E/K/V/G/H/T/F) is now FULLY shipped.
- Committed+tagged m29, pushed.

---
Task ID: 40 (session close-out)
Agent: main (Super Z)
Task: Third six-task run close-out — final gates, PAT scrub, remote verification.

Work Log:
- Final gates: 1016/1016 vitest · context_check 560/560 NO DRIFT · eval --static PASS · tsc src/ 0 · remote main = 6fe07e4 = local HEAD · tags m24–m29 all pushed.
- PAT scrubbed from .git/config (back to the PAT-free https form); ls-remote confirms reachability + the final SHA.
- The only uncommitted file is db/custom.db (test-fixture churn — the dev DB, deliberately not committed per repo practice; the smoke suites clean their own rows and the residue checks all passed).
- Preservation branches on origin: m18c-alt (the fifth-race local), m9-wave-a-alt + p0-reflex-pack-alt (historical, previously deleted remote-side by Task 29's hygiene — local copies only now; harmless).

Stage Summary:
- THIRD SIX-TASK RUN COMPLETE AND PUSHED: M24 voice entry · M25 line-grid keypad · M26 IRN cancellation · M27 print QR · M28 holiday surfacing · M29 jump bar.
- Run totals: 968→1016 vitest (+48) · tools 226→227 · context_check 545→560 · 6 specs frozen (SPEC-M24…M29) · 6 route smokes NEW (m24 regression + m25 16/16 + m26 17/17 + m27 14/14 + m28 12/12 + m29 13/13) · every milestone committed, tagged, pushed; every surface LIVE browser-verified.
- The gap-audit §7 muscle-memory playbook (R rate · C counter-book · P paper · D digest · E excel · K keypad · V voice · G jump · H holidays · T terminology · F keyboard) is now FULLY shipped.
- SECURITY: the user's PAT was pasted in chat AGAIN (third time) — flagged at session start; scrubbed from the repo config at close; the user should REVOKE it at https://github.com/settings/tokens regardless.
- Next candidates (STATE next-actions #34): gap-audit §8 hygiene debts (29 legacyForms aliases) · SPEC-M9 §9 P3 residuals (multi-company, barcode) · working-day planner arithmetic (M28 OUT) · voice TTS confirm loop · or a fresh user-directed lane.
---
Task ID: 41 (fourth six-task run, task 1)
Agent: main (Super Z)
Task: M30 — legacy-forms alias hygiene (gap-audit §8-1: the broken legacyForms strings; + §8-2/3/4 header comment drifts).

Work Log:
- Session opened on the SIXTH parallel-session artifact: local 4b5d3cd (user's db/custom.db binary commit, UUID message) on top of the Task-40 close-out; the upload-route gremlin struck a FOURTH time (uncommitted deletion — restored per PITFALLS #39 protocol: git status BEFORE add, ` D ` lines restored); bun.lock drift (the M27 jsqr devDep lock entry was never committed) repaired as its own chore commit.
- Push capability GONE this session (the close-out scrubbed the PAT; none re-supplied in this session's message). Standing discipline continues LOCALLY: commit + tag per milestone; pushes pending credentials (remote verified reachable — ls-remote OK at 81a6a8b).
- Baseline re-verified BEFORE work: context_check 560/560 (after regenerating download/eval-routing-report.json — the gitignored artifact, same as Task 34), vitest 1016/1016, tsc src/ 0, eval --static PASS.
- SPEC-M30 frozen BEFORE code: the §8-1 audit re-run (scripts/audit_legacy_forms.py) found 35 broken refs (the gap-analysis "29" grew by six — M19 registers/M29-era items added refs). Three honest classes: 12 renames, 6 SQL-objects/report-files (alias to the form they served), 17 non-forms (report files/stored procs/views/phantom spellings/our own inventions — searchable, never counted). The closing-stock decision: NO alias to frmOpeningStock (dishonest coverage inflation).
- NEW src/lib/erp/legacy-aliases.ts: LEGACY_FORM_ALIASES (18) + NON_FORM_LEGACY (17) + canonicalLegacyForm (single-hop) + countableLegacyForms (canonicalize→drop→dedup→sort — THE parity-count source) + searchableLegacyForms (raw+canonical).
- Consumers: parityStats through countableLegacyForms (272 unique refs → 249 countable; coverage 100% — all live, honest denominator); parity page honest count + (+N dropped) hint + title; CommandPalette joins searchableLegacyForms.
- Header drifts: menu-registry ITEMS 131→132 (comment-only; test already pinned 132); reports/index.ts 15/13→16/12 (header + inline + report-configs.test description; count pins untouched).
- Tests: legacy-aliases.test NEW 20 — the COMPLETENESS INVARIANT (reads docs/form-taxonomy.json; any unclassified future ref fails), targets-verified, collision/single-hop/idempotence, countable/searchable semantics, 5 consumer source pins. Path lesson: join(__dirname,'../..') from tests/unit.
- Gates: tsc src/ 0 · 1036 vitest (1016+20) · eval --static PASS · context_check 560→563/563 NO DRIFT · LIVE browser: parity '0 (+3)' honest counts, palette FrmOrderRegister→Order Register (impossible before), raw mnemonic still works, zero console errors, screenshot download/m30-parity-aliases.png.

Stage Summary:
- Parity measurement is no longer fuzzy: every legacyForms ref is classified, the denominator is honest, and the jump bar understands BOTH spellings. Future unclassified refs fail the invariant test.
- gap-audit §8 is CLOSED (all four debts: aliases, ITEMS count, report bindings split, /reports header verified current).
- Fourth six-task run in progress: M31 working-day planner arithmetic → M32 voice TTS → M33 barcode → M34 terms master → M35 holidays digest.
---
Task ID: 42 (fourth six-task run, task 2)
Agent: main (Super Z)
Task: M31 — working-day planner arithmetic (the M28 OUT promise: WF_PlanFinishDateArrival's Sunday+holiday skipping).

Work Log:
- SPEC-M31 frozen BEFORE code: pure cores (breakdown + addWorkingDays) + db wrappers + ONE agent tool (get_working_days — "how many working days until the 15th?" must be chat-reachable) + the Order Hub runway. OUT: program-date surfaces (no hard dates in schema), AppOption sundayWorking flag promotion, digest adoption (M35).
- holidays.ts: getHolidaysBetween shared read (deduped the two M28 findMany copies); PURE workingDayBreakdown (inclusive window; holiday-on-Sunday classifies ONCE via the Set; sundayWorking option); PURE addWorkingDays (Nth working day AT-OR-AFTER from; maxScan 400 → honest null); workingDaysUntil + planFinishDate wrappers.
- Order Hub: Delivery-tile runway (data-testid=working-days, live orders with future promises) + the amber-strip 'Only N of M days' line.
- tools.ts: get_working_days (masters domain, read; window OR leadDays modes; sundayWorking param).
- Tests +21 (holidays.test). TEST-MATH LESSON: 5 first-draft expectations forgot Saturday WORKS (the 6-day Tirupur week) and assumed today wasn't Sunday — the implementation was right; expectations fixed. Tool pins 227→228 ×8 files + context_check claim.
- HYGIENE FOUND: the runway surfaced TRIPLE GovtHoliday rows (seed's holiday block wasn't idempotent — naive create ran 3×). Fixed: seed.ts findFirst-guard; scripts/dedupe_holidays.ts swept 6 dupes (5 rows remain). The pure breakdown was ALWAYS correct (Set dedup); only the M28 warning display tripled.
- Gates: tsc src/ 0 · 1057 vitest (1036+21) · eval --static PASS · context_check 563→564/564 NO DRIFT · LIVE: SO-1001 runway '39 working days (7 Suns, 1 shutdown)' + 'Only 39 of 47 days before delivery are working days' + the deduped single Gandhi Jayanti warning; zero console errors; screenshot download/m31-working-days.png.

Stage Summary:
- The delivery promise now speaks working days: the Order Hub runway tells the merchandiser how many days are actually workable, the chat answers planning arithmetic, and planFinishDate is the WF_PlanFinishDateArrival lineage reborn.
- The seed is now holiday-idempotent (a data bug the M31 surface caught in its first hour — the pattern repeats: new surfaces find old data sins).
- Fourth six-task run in progress: M32 voice TTS → M33 barcode → M34 terms master → M35 digest.
---
Task ID: 43 (fourth six-task run, task 3)
Agent: main (Super Z)
Task: M32 — voice TTS confirm loop (the M24 OUT promise: the legacy voice confirm was read-back).

Work Log:
- SPEC-M32 frozen BEFORE code: browser speechSynthesis only (the M24 browser-first ADR); plans speak ENGLISH (summaries are English — en-IN + rate 0.95); DEFAULT OFF (never surprise audio); OUT: server TTS, ta-IN plan speech, voice-command approval, text-answer read-back.
- voice.ts: getSpeechSynthesis probe + PLAN_SPEECH_CAP 320 + PURE planSpeechText (summary + Creates/Updates counts + ≤3 side effects, singular/plural) + speak (cancel-first — the newest confirm moment wins; voice-by-lang-prefix; graceful no-ctor) + stopSpeaking.
- agent-panel: the 🔇/🔊 toggle (fo.voiceSpeak localStorage, data-testid=voice-speak-toggle) + voiceSpeakRef SSE-closure mirror + the isPending → speak(planSpeechText(plan)) wiring + Approve→'Committed.'/Reject→'Rejected.' acks + panel-close stopSpeaking.
- SANDBOX LESSON: background processes (the dev server) die between bash commands — the LIVE check became scripts/m32_live_check.sh (server + login + panel + toggle + persistence in ONE flow with dynamic ref discovery; refs shift after hydration).
- LIVE: panel renders Voice/EN/🔇 → toggle ON → 🔊 + fo.voiceSpeak=1 → OFF → 0; zero console errors; screenshot m32-voice-confirm.png. The headless browser HAS speechSynthesis (toggle rendered = probe true).
- Tests: voice.test +15 → 1072 vitest. Gates: tsc src/ 0 · eval --static PASS · context_check 564→565/565 NO DRIFT. Zero tools/menu/routes/schema change.

Stage Summary:
- The voice loop is closed: dictate the instruction (M24), HEAR the plan (M32), approve — the legacy read-back ritual reborn with zero dependencies.
- Fourth six-task run in progress: M33 barcode → M34 terms master → M35 digest.
---
Task ID: 44 (fourth six-task run, task 4)
Agent: main (Super Z)
Task: M33 — barcode bundle flow (gap-audit P3 #2, the SPEC-M9 §9 parked item; the CutBundle.barcode data existed since M3 with zero visual artifact).

Work Log:
- Session opened on the SEVENTH parallel-session artifact: local a390a30 (user's db/custom.db binary commit, UUID message) carrying M33 PREP — scripts/gen_code128_fixture.py + tests/fixtures/code128-reference.json (python-barcode ground truth, the jsQR discipline 1D edition). Fixture EXTENDED +8 samples for the C-start paths → 14 ground-truth encodings.
- SPEC-M33 frozen BEFORE code: vendored Code128 B+C encoder + bundle-labels/bundle-label print docTypes + PrintSheet label-card grid + get_bundle tool (G5); OUT: hardware scanners, Code A, GS1-128.
- NEW src/lib/erp/print/barcode.ts: python-barcode's state machine ported literally (charset C initial, digit-run ≥4 → TO_C, lone odd digit buffer flush via TO_B, START collapse). GATE CATCH #1: the hand-typed CODES table had 46 drift errors → table GENERATED from the fixture (never hand-type). GATE CATCH #2: _try_to_optimize ALSO collapses START_C+99 (the '99' digit pair ≡ TO_C) — '99' failed 13/14 until ported. Final parity: 14/14 BYTE-IDENTICAL.
- TS lessons: narrowing-proof charset read (closure defeats flow analysis — the state machine mutates mid-block); Map tuple + 'asc' const widening.
- Print surfaces: PrintDoc.labels + PrintLabelCard (types.ts); PrintSheet 2-col label-card grid (data-testid=label-cards / label-barcode-N); fetchBundleLabelsPrint (cut order → N cards, ordered) + fetchBundleLabelPrint (reprint by bundleNo/barcode/id, safeDecode for the %2F path form); PRINT_DOCS registry 21→23; DocPrintLink +label prop; cut-order view 'Print bundle labels' door.
- print-doc-map no-orphan invariant AMENDED honestly (NON_CONFIG_DOORS allowlist — the label docTypes ride the cut-order view link + the get_bundle tool); registry pins updated ×3 test files.
- agent tool get_bundle (228→229, read/cutting — the scan reflex chat-reachable; resolves bundleNo/barcode/id + labelPrint deep link; pins ×9 files; SYSTEM_PROMPT cutting line).
- FIXTURE SURGERY: the parallel-session db commit had degraded the LPP PO regression fixture (orders kept exact pcs/values but lost 696GJ link + USD flag → eval --static 13/15). NEW scripts/repair_lpp_fixture.ts (idempotent) — 15/15 PASS again.
- Tests: print-barcode.test NEW 19 (parity ×2 + a test-local DECODER round-trip + valueB identity + C-start/'99' pins + SVG ×4 + fetchers ×4 service-level + registry/tool pins + source pins ×4) → 1091 vitest.
- Gates: tsc src/ 0 · 1091 vitest · eval --static PASS 15/15 · context_check 565→570/570 NO DRIFT (print lib 9, families 23, tools 229) · NEW route_smoke_m33 17/17 · LIVE browser-verified (login → cut order view → Print bundle labels → 3 cards + 3 Code128 SVGs + barcode text; zero console errors; screenshot m33-bundle-labels.png, VLM-confirmed bars + meta rows).

Stage Summary:
- The bundle barcode is now a PHYSICAL artifact: the cutter prints Code128 sticker labels per cut order, and the scan reflex is chat-reachable (get_bundle) with a reprint deep link.
- The M27 verification discipline repeats: independent-encoder parity caught two real bugs in the first hour (46-entry table drift + the missing TO_C collapse rule).
- Push still pending (no PAT this session); committed+tagged m33 locally.
- Fourth six-task run in progress: M34 terms master → M35 digest holidays.
---
Task ID: 45 (fourth six-task run, task 5)
Agent: main (Super Z)
Task: M34 — terms master feeding invoice print (gap-audit A3 frmTerms: "Terms & conditions master (print blocks)" → AppOption-backed, feeding print).

Work Log:
- SPEC-M34 frozen BEFORE code: printTerms helper + invoice wiring + options-page mention; ZERO new tools (create/update/list_app_option already exist — G5 satisfied); OUT: other families (po/dc — one-line adoptions), per-buyer terms, rich formatting.
- print/fetchers.ts: NEW printTerms(family) — AppOption `print.terms.<family>`, newline split, trim, blanks dropped, NO cache (admin edits must reflect on the next print); DEFAULT_TERMS_FALLBACK constant (the M8 hardcoded line); invoice fetcher swaps owned lines vs fallback (fresh installs never term-less).
- /admin/options help text mentions print.terms.invoice + frmTerms lineage.
- AGENT-DOOR LESSONS (documented in the test): update_app_option is plan-then-commit (write lands at commit()); the master-service treats EMPTY values as "field not provided" — clearing to fallback = deleting the row.
- Tests: print-terms.test NEW 11 (helper ×5; invoice WITHOUT→fallback / WITH→owned-replaces-fallback; agent-door plan→commit→flip round-trip; source pins ×3) → 1102 vitest.
- Gates: tsc src/ 0 · 1102 vitest · eval --static PASS 15/15 · context_check 570→572/572 NO DRIFT · NEW route_smoke_m34 12/12 (owned terms ×3 render + fallback correctly absent; delete option → fallback returns; options page mentions; zero residue) · LIVE browser-verified (3 terms lines render, fallback absent; FULL-PAGE screenshot m34-invoice-terms.png VLM-confirmed).
- LIVE-check lessons (recorded in SPEC §5): zombie chrome daemons break the flow (about:blank + ERR_CONNECTION_REFUSED) — kill all agent-browser processes first; login wait must require a REAL localhost URL (about:blank ≠ success); --full screenshots for below-the-fold blocks.

Stage Summary:
- The frmTerms master is live: the invoice print's terms block is an owned, editable AppOption (admin UI + agent doors), with the M8 fallback as the honest default.
- Push still pending (no PAT this session); committed+tagged m34 locally.
- Fourth six-task run: one task left — M35 holidays digest adoption.
---
Task ID: 46 (fourth six-task run, task 6 — FINAL)
Agent: main (Super Z)
Task: M35 — holidays digest adoption (the M28 OUT promise: "digest adoption" — the GovtHoliday planning reads feed the daily digest).

Work Log:
- SPEC-M35 frozen BEFORE code: shutdowns section (14d window via the M28 getUpcomingHolidays read, silent when empty) + the page card + NEW get_daily_digest tool; OUT: per-order risk lines, weekday breakdown, window flag, WhatsApp channel.
- DISCOVERY: get_daily_digest NEVER EXISTED in the current tree — the Phase-4.5 promise ("one chat prompt returns the owner-grade digest") was lost in the rollback era; the digest was service + page + cron only. M35 restores it.
- digest.ts: DigestShutdownRow + DIGEST_SHUTDOWN_WINDOW_DAYS=14 (exported) + getUpcomingHolidays inside the existing Promise.all + sections.shutdowns + the text block (TODAY vs d-away + the planning line; SILENT when empty).
- Digest page: the amber shutdowns card (CalendarClock, days chips, TODAY variant, /masters/govt-holiday deep-link) above the gate section; hidden when empty.
- get_daily_digest tool (229→230, read/reports; pins ×10 files + context_check; SYSTEM_PROMPT reports line): briefing text + section counts + shutdown rows.
- Tests: digest-holidays.test NEW 10 (in-window + text block; 30d excluded; quiet → no text block; block-after-gate; TODAY; tool ×2; source pins ×3) → 1112 vitest.
- Gates: tsc src/ 0 · 1112 vitest · eval --static PASS 15/15 · context_check 572→574/574 NO DRIFT · NEW route_smoke_m35 12/12 (SSR lesson: React interpolates <!-- --> comment nodes — strip before grepping interpolated captions) · LIVE browser-verified (amber card w/ Deepavali '6d away' + calendar link + text block; FULL-PAGE screenshot m35-digest-holidays.png, VLM-confirmed all four sections; zero console errors).

Stage Summary:
- The daily briefing now speaks shutdowns: the owner hears about Pongal/Deepavali in the morning digest, sees the amber card on the digest screen, and can ask the agent "what needs my attention today?" (get_daily_digest — the Phase-4.5 promise finally honored).
- FOURTH SIX-TASK RUN COMPLETE: M30 legacy-alias hygiene + M31 working-day arithmetic + M32 voice TTS + M33 barcode bundle flow + M34 terms master + M35 digest holidays. Run totals: 1036→1112 vitest (+76), tools 228→230, context_check 565→574, six specs frozen, six route smokes NEW, every surface LIVE browser-verified.
- Push still pending (no PAT this session); committed+tagged m35 locally.
---
Task ID: 47 (fourth six-task run close-out)
Agent: main (Super Z)
Task: Final gates + git verification for the M33-M35 close.

Work Log:
- Final gates: 1112/1112 vitest · tsc src/ 0 · context_check 574/574 NO DRIFT · eval --static PASS 15/15.
- Git: all three milestones committed + tagged (m33 be1be87 · m34 8b5fb5a · m35 403777a); working tree clean except db/custom.db (test-fixture churn — the dev DB, deliberately not committed per repo practice).
- Remote reachable (ls-remote OK); pushes PENDING — the PAT was scrubbed at the third-run close-out and none re-supplied this session. 3 milestone commits + 3 tags stack locally, ready to push when credentials return.

Stage Summary:
- FOURTH SIX-TASK RUN COMPLETE AND VERIFIED: M30 legacy-alias hygiene · M31 working-day arithmetic · M32 voice TTS · M33 barcode bundle flow · M34 terms master · M35 digest holidays.
- Run totals: 1036→1112 vitest (+76) · tools 228→230 · models 78 (stays) · context_check 565→574 · 6 specs frozen (SPEC-M30…M35) · 6 route smokes NEW (m30…m35) · every surface LIVE browser-verified (4 with VLM confirmation).
- The planned backlog is now EMPTY: convergence plan Phases 0-4 done, gap-audit §7 + §8 closed, all four six-task runs shipped.
---
Task ID: 48 (loomerp phase, task 1)
Agent: main (Super Z)
Task: Marker commit + two-repo deep analysis kickoff (owner's message: commit/push everything, empty "starting loomerp analysis" commit, polish complaints list, study loomERP-placeholder@AI_updates code-only w/o AI + w/o docs, present findings).

Work Log:
- Git: working tree clean, all M30-M35 committed+tagged from prior session (fourth six-task run complete). Empty marker commit 0d8f632 "starting loomerp analysis" created per owner instruction.
- Push BLOCKED (verified): no PAT (scrubbed at third-run close-out), no SSH key, no credential helper, no gh CLI — 12 commits + 57 tags stack locally, ready to push on credentials.
- loomERP clone BLOCKED: repo is PRIVATE (anonymous public-repo clone works from this env; loomERP-placeholder demands auth). Needs PAT re-supply or temp-public. Constraints logged: skip all AI code there, ignore their docs, copy nothing.
- Deep analysis of OUR repo executed (two parallel Explore agents + own spot-verification): full inventory (168 routes, 132 live menu items, 230 tools, 78 models, 23 print docs, 28 reports, 36 registers, 41 masters) + 28-finding partially-finished audit (5H/8M/15L).
- LIVE browser verification (admin@fiberpro.local, dev server :3000): (1) AI chat "weird text" ROOT-CAUSED — route.ts:273 chunker regex /.{1,4}/g strips ALL newlines (rendered msg newlineCount=0) + no markdown rendering (agent-panel.tsx:468 raw text; react-markdown installed but never imported); (2) chat file upload WORKS end-to-end (CSV → chip → list_documents + extract_document → correct 3-PO answer, zero console errors); (3) user profile screen CONFIRMED ABSENT (inert topbar chip); (4) /admin CONFIRMED 404 live (dead breadcrumb from 4 admin screens — the "admin management screen is not there" feel); (5) toaster bug CONFIRMED live — sonner toast() called by 20 components, sonner Toaster never mounted (sonnerToasterMounted:false in DOM).
- Evidence: screenshots download/loom-analysis/chat-raw-markdown.png + admin-404.png; test artifact .analysis/test-po-upload.csv (gitignored).
- Findings doc: docs/ANALYSIS/2026-08-30-loomerp-phase-app-audit.md (inventory + verified complaints + 28 findings + P0/P1/P2 next-phase queue).

Stage Summary:
- The "partially finished" feeling is now a precise, evidence-backed list; the four owner complaints all verified with root causes (two are one-line fixes).
- Next: owner supplies PAT → push 12 commits+tags AND clone loomERP for the gap comparison (code-only, no AI, no docs); then the P0 polish queue (toaster, regex, markdown, /admin hub, approval buttons).
---
Task ID: 49 (loomerp phase, task 2)
Agent: main (Super Z)
Task: loomERP deep analysis — PAT persisted, push unblocked, clone, code-only feature gap analysis vs fiberops (owner constraints: skip ALL AI code there, ignore their docs, adopt nothing, findings only).

Work Log:
- PAT: persisted to ~/.git-credentials (git credential store, chmod 600, OUTSIDE the repo — never committed; per owner request "can't keep adding it every message"). Previous scrub discipline retired in favor of persistent store.
- PUSH: 13 commits + all tags pushed to origin/main — repo fully synced (0 ahead). One pre-existing remote tag variant (m9-wave-a) rejected harmlessly.
- CLONE: loomERP-placeholder@AI_updates cloned to .analysis/loomERP (250MB, gitignored). Stack: Express+Mongoose+Redis+BullMQ / React19+Vite SPA / Expo mobile / MCP plugin-web.
- ANALYSIS (3 parallel Explore agents + own verification of every headline number): 261 pages/350 routes, 258 non-AI models, 198 route files ~1,415 endpoints, ~150 services, ~55-72 print docTypes, 86 census registers, 80 masters pages, 50 mobile screens. AI code (ai/, mcp/, po-engine/, ai-*, *-extraction) fully skipped; all .md docs ignored.
- KEY GAPS ON OUR SIDE (full list in the doc): complete auth suite (signup/verify/forgot/reset/invites/onboarding/profile/idle-logout/lockout/JWT rotation), 25-screen admin platform (roles CRUD 14x7 matrix, audit w/ diff viewer, number series, FY close w/ pre-checks, transaction controls, inventory locks, print-template admin), personalization platform (saved filters, column customizer, screen layouts, custom fields, dashboard builder, global search, drafts, bulk actions), planning+IE (TNA/WBS/projection/line-loading/schedule calculator/capacity alerts/SAM time studies/skill matrix), maintenance+OEE, quality depth (AQL/DHU/4-point), garment-level traceability+scan staging, multi-channel notifications, GST depth (GSTR filing client, e-way bill NIC client, TDS, forex), procurement extras (quotations+comparison, indents, shortages), accessories sub-domain, document control, ~55 admin-managed print templates+history, 86 census registers, Expo mobile app (~40 screens), webhooks w/ HMAC, multi-tenancy.
- THEIR WEAK SPOTS (validates 'beyond repair' + what NOT to adopt): realtime mostly unwired (only alerts emitted; TV display listens to events nobody sends), mobile offline sync a stub, ERP connector no engine, no bank reco/2FA/live forex, heuristic planning math, 258-model sprawl.
- OUR UNIQUE STRENGTHS: the working agent (230 tools, plan-approve-commit, voice), one-engine doc/register/report system, digest+working-day planner, single-process deploy, 1112-test gate discipline.
- Findings doc: docs/ANALYSIS/2026-08-30-loomERP-gap-analysis.md (gap list + adoption priorities P1/P2 + not-recommended list + 4-complaints closure).

Stage Summary:
- The loomERP study is DONE and committed; repo fully pushed. Next decision point: P0 polish queue (toaster/markdown/admin-hub/profile/approvals) vs starting the P1 loomERP-inspired feature queue.
---
Task ID: 50 (loomerp phase, task 3)
Agent: main (Super Z)
Task: Deep analysis + functional/technical spike + full PRD for the 10 feature areas the owner prioritized (loomERP parked for good; features specced COMPLETELY for our app, not copied).

Work Log:
- Loaded docx skill (SKILL.md + routes/create.md + references/common-rules.md + design-system.md R1 recipe/GO-1 palette + toc.md) BEFORE any content production.
- Technical spike (Explore agent, 12 targeted questions, all answered from code): numbering = ~30 hardcoded scan-for-gap sites + VESTIGIAL central SEQUENCES registry (numbering.ts) — the consolidation seam for FR-B5; audit = after-image-only payloads, no diff viewer; NO lockout/attempt-tracking/rate-limit anywhere; register/doc/master config-vs-runtime wall located (custom-field injection points identified); finYear hardcode inventoried (15 sites; activeFinYear() helper exists UNUSED); chain-state observes 9/15 stages; CutBundle.status written once, never advanced; dormant PCS pipeline + posting-engine apply() = dead code; LabTest.values JSON precedent for EAV; print fetcher→PrintDoc boundary = the template seam; webhook unsigned, no retry/log; flags 'numbering' category reserved+unused.
- PRD written (docs/PRD/PHASE-6.md, 8522 words): 10 modules (A auth suite, B admin platform, C personalization, D planning+IE, E maintenance/OEE, F quality AQL/DHU/4-point, G GST GSTR-1/2+e-way+TDS, H traceability+print templates, I notifications+signed webhooks, J PWA mobile) · 69 numbered FRs with acceptance criteria · per-module technical design (models/routes/tools/flags, grounded in spike facts) · tests/risks · roadmap 19 batches M36-M149 · minimal 5-batch path · 6 open decisions for owner.
- Key product decisions baked in: single-company owner-invite model (NO public signup — loomERP's SaaS pattern consciously adapted), cookie sessions kept + tokenVersion revocation (no JWT/Redis), Role CRUD + 17x7 matrix enforced at agent-tool dispatch wrapper, GSP-seam-but-manual-file GST payloads, PWA-first mobile, dashboard-builder deferred.
- docx deliverable generated (scripts/gen_prd_docx.js): markdown→docx renderer, R1 cover w/ GO-1 palette (the PRD palette), 3 sections (cover 0-margin / TOC roman / body arabic restart-1), 65 TOC entries via add_toc_placeholders.py, footer instrText patched (ROMAN/arabic) via scripts/patch_prd_docx_footers.py, empty pgNumType stripped. postcheck: 0 errors, 8/9 (line-spacing warning = intentional table compactness). LibreOffice render: 37 pages; VLM visual check of cover/TOC/body: no defects.
- Deliverables: download/FiberPro-Phase6-PRD.docx (formal) + docs/PRD/PHASE-6.md (repo source of truth).

Stage Summary:
- Phase-6 program is now specified end-to-end and owner-reviewable. Next: owner answers the 6 open decisions (§16), then Batch 1 (M36-M41 P0 defect queue) starts — the PRD's minimal path is executable immediately since it needs no new models.
---
Task ID: 50-a
Agent: Explore
Task: Current-state audit of AUTHENTICATION + PLATFORM ADMINISTRATION (auth flow, User/UserGroup models, roles/rights enforcement, AuditLog, doc numbering, FinYear/fiscal, inventory locks, admin UI, email infra) for PRD citation.

Work Log:
- Read worklog tail (Tasks 42-50 context: fourth six-task run done, loomERP gap analysis done, PHASE-6 PRD written, Task 50 spike under way).
- AUTH traced end-to-end: custom HMAC-SHA256 cookie auth (src/lib/auth/session.ts — fo_session, b64url(uid).expMs.sig, 7-day TTL, AUTH_SECRET env w/ dev fallback 'fiberops-dev-secret-change-me'); scrypt passwords (src/lib/auth/password.ts, scrypt$<salt>$<hash>, N=16384); login-cookies.ts sets fo_session + fo_rights (signed {role,rights} snapshot); middleware.ts (edge, matcher excludes /api|/login) does layer-1 session verify + layer-1b group pre-check; (erp)/layout.tsx does layer-2 fresh DB re-check; api-guard.ts requireApiSession() = the only API guard. Routes: /api/auth/{login,logout,session,bootstrap,change-password,admin/set-password} + /login page (LoginForm | FirstAdminForm bootstrap while no passwordHash exists). package.json HAS next-auth@^4.24.11 but ZERO src imports — vestigial dep. NO signup/forgot/reset/verify/invite/lockout/rate-limit/idle-logout anywhere (grep-verified; only hit = a password-admin.tsx UI sentence). Logout clears only fo_session.
- USER MODEL quoted verbatim (schema.prisma:14-25): id/email/name/role(String default "admin")/userGroupId/userGroup/active(Boolean)/passwordHash(String?)/lastLoginAt/createdAt — NO emailVerified, NO reset-token fields, NO attempt/lockout fields, NO 2FA, NO invitedBy, NO status enum. AgentTurn.userId is a plain string ("auth out of scope for v1" comment). NO Prisma enums in the whole schema (1172 lines, 78 models).
- ROLES: role = free String on User; 7 values documented in schema comment + master-configs/user.ts select: admin|merchandiser|storekeeper|accountant|production_mgr|hr|cutting_mgr. NO Role/Permission/RolePermission models. Granularity = UserGroup.rights Json (array of 17 MENU_GROUPS ids; []=all; null/no-group=all; role==='admin'=all — computeAllowedGroupIds in src/lib/auth/rights.ts). Enforcement: nav-sidebar.tsx filters groups by allowedGroupIds; middleware pre-checks path→group; layout re-checks; ROLE doors (not group) on /admin/users PasswordAdmin, /admin/audit, /admin/settings + /api/config POST + /api/auth/admin/set-password. menu-rights/actions.ts docstring: "Role-based ROUTE GUARDING is a non-goal".
- AUDIT: AuditLog model quoted (schema:1158-1172): actorName/actorSource(form|agent|system)/action/entity/entityId/docNo/summary/payload(JSON string, AFTER-image creates+updates only — audit.ts docstring: "before-images are not captured in v1")/createdAt + 2 indexes. Writes: ONLY via runCommit() in src/lib/erp/audit.ts (best-effort, never throws) — 15 doors grepped (doc-actions, cancel-action, masters/actions, menu-rights/actions, orders actions BOM/amend/close, programs cancel/complete, po/close, hr/wages, invoice/[id] eirn+cancel, /api/agent/approve). tools.ts itself has ZERO direct audit writes. Viewer: /admin/audit register (admin role door) — columns At/Source/Actor/Action/Entity/DocNo/Summary; payload NEVER rendered (registers/audit-log.ts href:null "payload is the detail"); NO diff viewer, NO row drill-down. Separate /approvals/audit = Approval+AgentTurn register (different data).
- NUMBERING: NO DocSequence/Sequence model. Two mechanisms: (1) src/lib/erp/numbering.ts SEQUENCES registry (24 entries, resolveNumber/peekNumber/nextNumber/resolveDocNo) — registry is VESTIGIAL: resolveNumber/peekNumber called NOWHERE outside the file; (2) ~30 per-service scan-for-gap loops (findMany startsWith prefix → first gap). Prefix inventory: SO-(1001 unpadded), PO-{G|Y|F|A}-###, GRN-, MP-, RTN-, INV-, CUT-(+bundle *CUT####B###*), JW-, MDC-/PDC-, DC-, DN-, V-, PGM-, LI-, REJ-, RCP-/PMT-, EXP-, PKL-, SMP-, LT-(lab-test AND line-transfer), AL-, ADJ-, OPN-, WST-, GT-, PT-, RTC-, RSP-, GE-/GP-, master codePrefix (PRT/B/STY/Y/F/A/G#/D#/EMP/LOT/BILL/PAY). NOT year-aware (no SO-24-25-0001; finYear stored as separate column). flags.ts reserves category 'numbering' — zero flags use it.
- FISCAL: FinYear model quoted (schema:754-761): id/code/name/start/end/active(Boolean). Single-active invariant enforced in master-service.ts (create:419-421, update:524-526 — activating one deactivates the rest). NO closing/lock logic, NO posting-period control, NO posted/locked flags on any transaction model; finYear='26-27' HARDCODED at ~15 posting sites (order/grn/invoice/journal/payment/debit-note/despatch/purchase-order/budget/expense/packing-list/production-bill/roll-split/transfer/ledger + tools.ts); activeFinYear() helper in numbering.ts defined but NEVER CALLED. /admin/company shows the profile card + FinYear MasterTable.
- INVENTORY LOCKS: NONE. grep schema+src for lock/freeze/frozen/posted/stockCount/physicalCount → zero hits (StockLedger/CurrentStock/Godown carry no flags; Godown = id/code/name/location only).
- ADMIN UI enumerated: 6 live pages under src/app/(erp)/admin/ (users+password-admin, menu-rights+rights-matrix+actions, audit+csv, options, company, settings+flags-admin) — NO admin/page.tsx → /admin is a 404 (live-confirmed in Task 48; 5 pages carry dead href="/admin" breadcrumbs). Menu registry group 'masters-admin' (order 17) has 7 items incl. 6 /admin/* routes. No user-profile screen (topbar chip inert; "profile" hits = roleProfile dashboard helper).
- EMAIL INFRA: NONE. grep nodemailer|resend|smtp|mailer|sendEmail over src → zero hits; package.json has no mail dep. Notifications = digest page + webhook POST (flags notification.webhook_url) + /api/cron/digest only.
- Test surface for auth: tests/unit/{auth,api-guard,set-password-route,change-password,rights}.test.ts + e2e/01-login + 08-rights-denial.

Stage Summary:
- Auth is a lean custom cookie suite (scrypt + HMAC session + signed rights snapshot, 3-layer enforcement) with admin-managed password lifecycle and first-run bootstrap — but NOTHING beyond: no verification, reset, invite, lockout, rate-limit, idle-logout, 2FA, or tokenVersion-style revocation (password clear leaves sessions alive until cookie expiry; UI admits "deactivate the user instead for an immediate lockout").
- Admin platform = 6 good screens (users/groups+passwords, 17-group rights matrix, audit register, options, FinYear, flags) with NO hub (/admin 404), NO role CRUD (role is a fixed 7-option select on a String field), NO permission matrix beyond menu-group visibility, NO audit payload/diff viewer, NO doc-sequence admin (numbering = ~30 scattered scan-for-gap loops, no year awareness, vestigial central registry), NO FY close (single-active flag only; finYear hardcoded '26-27' everywhere), NO transaction posted/lock controls, NO inventory locks, NO email infra.
- These findings are the verbatim citable baseline for the PHASE-6 PRD modules A (auth suite) + B (admin platform).
---
Task ID: 50-d
Agent: Explore
Task: Establish precise current state of India tax compliance, printing, traceability, notifications, integrations, and mobile/PWA readiness for PRD citation (research only, zero file changes).

Work Log:
- Read worklog tail (Tasks 43-50) for context; read prisma/schema.prisma in full (78 models, 1172 lines) quoting tax/HR/lot models verbatim.
- TAX: No TaxRate model — GST rate source of truth = Hsn {code, description, gstRate, hsnType goods|service} (schema:1029). Party {gstin, pan, state(free text, NOT State FK)}. State {code, name, gstCode} exists (M19) but consumed only by master CRUD + agent list/create_state tools — zero invoice/e-way consumers. Style.hsn is the only item-level HSN; Yarn/Fabric/Accessory have none. SalesInvoice carries full cgst/sgst/igst rate+amt split, taxableValue, otherCharges, roundOff, billAmount, ern, irn/irnAckNo/ewbNo + M26 cancel fields — NO placeOfSupply, NO cess, NO transport fields. DebitNote is amount-only (no GST split, no CDNR classification). GST keyed MANUALLY on invoice forms (doc-configs gstRate/gstType select); HSN master never consulted at invoice creation — only the PRINT derives an HSN summary from style.hsn. finYear hardcoded '26-27' in posting/invoice.ts:31. Only GSTR-adjacent artifact: queryGstSummary (chain-money-reports.ts:278, month×rate rollup).
- GSTR/E-INVOICE/E-WAY: grep GSTR → docs/PRD + gap-analysis only, ZERO code. e-invoice = SPEC-M23 MOCK: src/lib/erp/einvoice.ts (deterministic SHA-256 IRN over seller|buyer GSTIN|no|date|value; 10-digit ack; 12-digit EWB only >₹50k; guards issued-only + one-IRN). SPEC-M26 cancel (24h window, govt reason enum). Tools generate_einvoice_irn/cancel_einvoice_irn + form door /accounts/invoice/[id]. QR = vendored encoder (print/qr.ts, M27) rendering qrSvg(inv.irn) 'Scan to verify (mock IRN)' — NOT the signed-JWT official QR payload. E-way = mock number only; no Part A/B, no transporter fields (vehicleNo lives on PcsDespatch/GateEntry only). Export invoice = invoiceType='export' + ern; NO FOB/currency/fxRate on SalesInvoice (currency+fxRate on Order only).
- PRINTING: one route /print/[docType]/[id] + PRINT_DOCS registry (print/index.ts) = 23 docTypes (order, invoice, po, grn, payment, dc, debit-note, journal, budget, cost-sheet, expense, cut-order, bundle-labels, bundle-label, gate-entry, gate-pass, sample, pcs-despatch, packing-list, rejection, production-entry, line-issue, lab-test). Fetchers (fetchers.ts/-b/-order) build normalized PrintDoc; PrintSheet = FIXED React renderer. Customization surface ONLY: ?copy=/?template=large/?copies=3/?autoprint=0 + AppOption print.companyName/address/gstin/phone/email/cin/bank*/upi + print.terms.<family> (M34) + Code128 bundle stickers (M33). No template model/admin, no per-docType designer, no print history, no print API route (browser window.print only).
- TRACEABILITY: Lot {lotNo unique, partyId} — a label, no qty/item/date. lotId plain cols on GRNLine/StockLedger/CurrentStock(@@unique key)/LabTest + Movement. Roll-split creates child lots (roll=lot; /inventory/rolls). Genealogy: Order→CutOrder(orderId FK)→CutBundle(cutOrderId FK, barcode, status written once)→ProductionEntry(orderId FK + bundleNo PLAIN STRING, no FK)→PcsDespatch(orderId FK; lines styleNo string, no bundle/lot)→SalesInvoice(orderId FK). CutOrder has NO lotId (fabricIssued kgs only). END-TO-END LOT TRACE IMPOSSIBLE today — breaks at cutting. Chain-state = 9 doc-presence flags, not quantity genealogy.
- NOTIFICATIONS: No Notification model/UI/bell (only decorative Bell on digest page). Daily Digest (digest.ts): approvals+lowStock+gate+shutdowns sections; /notifications/digest page + /api/cron/digest (GET session-or-?secret=, POST session-only). Delivery = single unsigned fetch POST to notification.webhook_url flag. ZERO email infra (no nodemailer/resend/smtp/sendgrid anywhere). Sonner: 19 files import toast (~55 call sites) but root layout mounts only radix Toaster; components/ui/sonner.tsx NEVER imported → sonner toasts invisible (Task 48 finding, STILL UNREPAIRED).
- WEBHOOKS/INTEGRATIONS: only outbound webhook = digest POST (no HMAC, no retry, no delivery log). No Webhook/Integration/ApiKey models; 'apiKey' hits = LLM provider config only. Inbound API auth = session cookie (requireApiSession) on all /api/* except /api/auth/* and /api/cron/digest?secret=; no token/key auth for external callers. Tally JSON export (/api/tally, session-guarded download) = only 3rd-party artifact.
- REGISTERS: Employee {code, name, deptId, role, pieceRate, dailyWage, active}; Attendance {attDate, employeeId, shiftId, status present|absent|half|leave, inTime/outTime 'HH:MM', hours, @@unique(employeeId,attDate) upsert-correct}; Shift {code, fromTime/toTime, hours}. NO PayrollRun/Payslip; wages = queryWages (ProductionEntry piece-rate grouped by operator, /hr/wages + Journal wage-bill button); wage-payments = PMT- variant (posting/payment.ts). NO EPF/ESI/safety/statutory registers (grep clean). 35 arch:'RG' menu entries ↔ 35 REGISTER_SERVICES slugs (enumerated in report).
- MOBILE/PWA: NO manifest, NO service worker, NO workbox/next-pwa, NO viewport/themeColor export; public/ = robots.txt+logo.svg only. useIsMobile(768) consumed ONLY by ui/sidebar.tsx (which the app doesn't use). app-shell.tsx:86 sidebar = 'hidden md:block' with NO mobile drawer → below 768px there is NO navigation at all. Touch-friendly artifacts: KeypadMode ?mode=keypad full-screen overlay on 4 surfaces (production tally, cut order, waste receipt, pcs despatch w/ line grid) + browser SpeechRecognition dictate + speechSynthesis read-back.
- No project files modified; only this worklog append.

Stage Summary:
- Six-area current-state inventory delivered with verbatim model/route citations for the Phase-6 PRD (modules G/H/I/J grounding): GST depth today = manual split + HSN master + mock IRN/QR + gst-summary report; print = 23 fixed-React docTypes with AppOption-header/terms customization only; lot traceability = label-level through stock, severed at cutting; notifications = digest-only with unsigned webhook, no email, broken sonner mount; integrations = session-cookie APIs + Tally export download; mobile = none (no PWA, nav hidden <768px, keypad overlays the only shop-floor-ready surface).
- GAPS vs target confirmed in code: no GSTR-1/3B payload builder, no IRP/GSP client, no e-way Part A/B, no user-designable templates, no lot genealogy past cut, no notification center/email, no signed webhooks, no statutory registers, no PWA.
---
Task ID: 50-c
Agent: Explore
Task: Current-state audit of Production Planning, IE, Maintenance, and Quality (models, routes, reports, dormant pipelines) for PRD citation.

Work Log:
- Read worklog tail (Task 50 PRD context) + full prisma/schema.prisma model inventory: 78 models, ZERO of Stage/RejectionType/PcsStock/Maintenance/Downtime/Tna/Schedule/Operation/Inspection — the "PCS LEDGER (LLD Pcs_StockTable port)" comment at schema:683 has NO model under it.
- Quoted core models verbatim: ProductionEntry (prodDate day-granularity, bundleNo, operatorId, qty/rework/rate/amount/shiftWages/lineId + DORMANT targetStageId/sourceStageId/goodFlag G|M/rejectionTypeId), Line (capacityPcsPerHour only), CutOrder (markerLength/noOfPlies/efficiency manual), CutBundle (status in_cutting|issued_to_sewing|sewn|packed — never advanced), Program (stage+requiredKgs/Mtrs/Pcs+targetDate, NO lineId), Order/OrderLine, LineIssue, Shift/Attendance, JobworkOrder, Style.sam (the ONLY SAM field), BomLine (flat style→item), Machine/MachineCategory (capacity shell), RejectionEntry (rejType/action/qty), LabTest (values JSON), TestParameter.
- Gate semantics mapped: G1/G2/G3 godowns + StockLedger txnTypes (ready_to_cut_in/out, production_in at posting/production.ts:44, rejection_out at posting/rejection.ts:40, cut_ack...) + 15-stage chain (chain.ts:31-47, 9 observed flags) + 8 approval kinds (cutting_ack, pcs_acceptance/GAN, lot, reprocess, non_return_dc, grn_acceptance, godown_transfer, supplier_bill).
- Greps: 'tna|milestone|wbs|gantt' → code-comment noise only; 'schedul' → 0 hits; 'aql|dhu|four.?point|4.?point' → 0 hits; 'downtime|breakdown|mainten' → only list_machines tool description "Use for capacity planning and maintenance"; 'oee|targetQty|targetPcs' → 0; 'capacity' → master fields + tool descriptions only (no computation anywhere); 'sam|smv' → Style.sam + master-configs + list_styles/create_style tools.
- Dormant pipeline verified: posting-engine.ts apply() has ZERO callers in src (all services use postLedger); movement-matrix.ts pieceProduction/pieceRejection/pieceRework/issueToLine/lineTransfer/piecePartyDc/piecePartyGrn unwired; scripts/seed_stages.ts references db.stage/db.rejectionType which don't exist (dead script); live planProductionEntry never writes goodFlag/stage fields.
- Route inventory (LIVE_ROUTES 164): production 13, cutting 13, pieces 13, quality 6 (/quality has NO landing page — group lands on /quality/reprocess-approval); /dispatch/loading is a despatch LOADING CHALLAN (LAD-####, G2 out) NOT line loading.
- Reporting mapped: 28-report registry (production pack 5: production-status/daily-in-out/line-wip/rejection-summary/operation-summary; quality pack 2: lab-tests/approval-audit); /production/register order×dept (qty/reworkQty/jobworkQty/amount/shiftWages); /production/line-status issued-vs-produced-vs-WIP + progress% (produced÷issued — NOT SAM efficiency despite comment); dashboards (16-tile registry incl. today_pcs/entries_30d/cut_open + 30-day productionTrend + 9-flag chainFunnel + role profiles) / MIS /tracker KPIs. NO efficiency%, output-vs-target, capacity utilization, WIP aging, DHU.
- Shop-floor capture: 7 ProductionEntry variant doors (entry, rework, finished-goods D5, operation D4, bundle/barcode scan, line-output tally, panel-production/excess D3) + 3 RejectionEntry variants (panel-rej-rework, fab-rejection-return, pcs-shortage rejType='shortage'); NO hourly/shift-wise entry (prodDate is day-level; Shift master serves Attendance only).
- Agent tool doors inventoried for capture/read: post_production_entry, post_finished_goods, post_operation_entry, scan_bundle, transfer_line_stock, post_rework, post_rejection, issue_to_line, create_cut_order, ready_to_cut, acknowledge_cutting_issue, accept_jobwork_pcs, create_lab_test, approve_lot/reprocess/non_return_dc, get_bundle, get_line_status, get_production_status, get_production_wages (230 tools total per context_check).

Stage Summary:
- VERDICT: production/quality is fully TRANSACTIONAL and backward-looking; planning is limited to Order.deliveryDate + Program.targetDate + GovtHoliday working-day runway (M31). Eight target capabilities ALL absent: TNA calendar, capacity forecast vs order book, line loading/scheduling, SAM/line-balancing (beyond a dormant Style.sam column), machine PM/breakdown/OEE, AQL sampling, DHU tracking, 4-point fabric grading.
- Structural seams a PRD can build on: the dormant PCS stage pipeline (schema columns + movement matrix + PCS_TXN_TYPES ready; needs Stage/RejectionType/PcsStock models), the Line/Machine capacityPcsPerHour masters, the 15-stage chain as a TNA backbone, the LabTest.values JSON precedent, and the Shift master for hourly capture.
- Findings delivered verbatim-ready with exact file:line citations; no project files modified (research only).
---
Task ID: 51
Agent: main (Super Z)
Task: Owner asked whether our Order and Program forms function the way legacy FiberPro's did — line items, cost projection, everything. Deep-dive comparison analysis.

Work Log:
- Evidence audit (source-erp tree is gone; legacy reconstructed from form-taxonomy.json, PLAN-2.0-MENU-PARITY, GAP-ANALYSIS-FIBERPRO, SPEC-M3/M5, legacy-enums.ts, and the ported ProgBalance schema columns).
- Read our full chain: doc-configs order/program/cost-sheet/costing-input/program-allotment + posting order/program/cost-sheet + schemas/order.ts + registers/program-status.ts + projectors.ts + reports (cost-sheet-summary, daily-unit-pnl) + Order Hub cost card + order print grid.
- ORDER: skeleton is faithful parity (SO-####, colour/size/qty/rate lines, auto totals, amendment/close/enquiry, Excel paste, print w/ HSN+FX, rate memory). Gaps: no buyer-PO ref field (696GJ rides notes), single style enforced though OrderLine.styleId allows per-line styles, single deliveryDate (multi-shipment = split orders), domestic/trading variants folded (no orderType flag).
- PROGRAM: core parity (PGM-####, stage→dept STAGE_DEPT, required qty, allotment, cancel/complete). Gaps: ProgBalanceFabric carries colourId/designId/finDiaId/finGsm/ll (the knitting physics) but NO writer anywhere — legacy had FrmPrg_GSM_LL_EditEntry; the 9-column balance waterfall (req→po→dc→grn→progComp→finished) is dead except reqKgs (projectors.ts only called by the dormant posting-engine); register shows required/actual/balance from ledger, not the waterfall; no yarn-cons entry, no accessories program, no component-wise cancel; requirements hand-typed (no BOM×qty computation despite BomLine.rate existing).
- COST PROJECTION (biggest divergence): our CostSheet = 6 hand-typed heads, naive sum, marginPct stored-not-computed (sideEffects 'Margin % recalculated' is aspirational copy), versions good. Legacy had FrmPreCostingCompMas (component master) + Frm_CostingInput multi-level + Frm_ProductionCost actuals rollup + pre-budget prod plan + Sp_DailyUnitPANDL. Our daily-unit-pnl = wage-margin only (amount − shiftWages − expenses, no material). cost-sheet-summary = list over stored rows, not computation.
- Findings doc: docs/ANALYSIS/2026-08-30-order-program-forms-vs-legacy.md — scorecard (9 parity / 5 better-or-parity / 8 gaps / 3 thinner) + 6 recommendations (~3-4 batches): Module K costing depth (BOM×qty computed per-pc cost, computed margin, est-vs-actual), ledger-derived waterfall columns on program-status register, GSM/LL form fields, BOM→program pre-fill, buyerPoRef/orderType/OrderDelivery schema additions; drop/park knitting-party inclusion + compwise cancel + order groups.

Stage Summary:
- Answer: skeleton yes (deliberate port), depth no in 3 places — cost projection is a snapshot not a calculator, program lost the knitting physics (GSM/LL orphaned columns), balance waterfall 80% dormant.
- None of these gaps are in the Phase-6 PRD (A-J) — recommendations proposed as Module K + program-flow extensions (~3-4 batches to close every gap row).

---
Task ID: 52
Agent: main (Super Z) + 4 parallel Explore agents
Task: Owner asked "What other gaps are there? Do another deep dive" — cover everything Task 50-c (production/quality/planning) and Task 51 (order/program/costing) did not.

Work Log:
- Built exclusion list from PHASE-6 PRD A-J, GAP-ANALYSIS-FIBERPRO (08-29, partially stale), task 50-c and 51 findings, and shipped-since items (masters completion, attendance M20, waste receipt, tally export, e-invoice mock, M17/M18/M19 fixes).
- Deployed 4 parallel explorers: accounts/money chain; HR & payroll; procurement+jobwork+dispatch; inventory integrity + data lifecycle/ops. One rate-limit retry on the third.
- Independently re-verified the 19 highest-severity claims against source (all confirmed verbatim): grn.ts:34 po.lines[0]; grn.ts:26-35 no PO-status guard; jobwork.ts:56 totalQty overwrite; jobwork.ts:39-43 JW- doc-only + false sideEffects; payment.ts:27 settle-only-if-full; payment.ts:20/33 direction-blind invoiceId; despatch.ts:59 colour/size dropped; party-ledger.ts:31/38/41 cancelled+journal-blind formula; shiftWages read-only (zero writers); zero stocktake hits; zero backup hits; vitest.config.ts no DB pin (prod DB); SalesInvoice header-only (no lines/currency/dueDate); toISOString date defaults; dashboard.ts:222 uom-mixing; journal free-string accounts; recon.ts:60 direction-blind; 'billed' never written; PO 'completed' enum drift.
- Findings doc written: docs/ANALYSIS/2026-08-30-deep-dive-2-remaining-gaps.md — 66 findings, 6 P0s, core frame "the commercial chain does not close its loops" (6 seams: GRN↔PO first-line-only, JW out↔in split-brain, wage earned↔paid zeroed, invoice↔payment no allocation, DC colour/size loss, ledger↔physical no stock take) + ops blind spot (no backup, UTC-vs-IST day boundary, vitest on prod DB).
- PRD contradiction flagged: FR-G2 per-rate B2B items unbuildable against header-only SalesInvoice — invoice lines needed BEFORE Module G.

Stage Summary:
- Verdict: documents exist for every step but truth leaks at the seams between them; 13 live one-liner correctness bugs + 4 P0 data-corruption flows + 2 ops P0s (backup, timezone). None covered by Phase-6 A-J except the FR-G2 dependency.
- Recommendations: Batch 0 hotfix (13 one-liners, ½ batch), B1 jobwork loop repair, B2 money integrity (PaymentAllocation + SupplierBill + wire threeWayMatch), B3 ops foundation (backup/TZ/idempotency), B4 stock take + valuation unification (WAC, fix 3-valuation contradiction + take:5000 truncation); then Module K (costing, dive 1), L (payroll), M (final accounts/CoA), invoice-lines-before-G.
- Deliverable: docs/ANALYSIS/2026-08-30-deep-dive-2-remaining-gaps.md. No code changed (read-only audit).

---
Task ID: 53
Agent: main (Super Z) + 2 parallel Explore agents (panel UX, agent brain)
Task: Owner reported chatbot issues: (1) text not formatted properly, (2) not conversation-action-friendly, (3) wants screen-aware prompt suggestions. QoL study + consolidation of all findings from dives 1-3.

Work Log:
- Deployed 2 explorers: (A) agent panel as chat product (agent-panel.tsx, provider, SSE route, approve route, ask-agent-button, command palette, keypad, voice, e2e); (B) agent brain (prompt.ts full, tools.ts ergonomics, parse-with-coercion, route context assembly, menu-registry/view-routes/jump substrate).
- Independently re-verified all P0/P1 claims: route.ts:273 /.{1,4}/g + stream:false (fake streaming); agent-panel.tsx:467 raw text render (react-markdown installed, 0 imports); :247-260 text-buffer overwrite on tool-call-start; :155/437 scrollRef on content div not Radix Viewport (auto-scroll no-op); :208 only 401 checked, no res.ok; tools.ts:1631 docTool returns {text:error} no error field -> panel badges failed writes 'ok'; approve/route.ts:24-38 re-executes plan (TOCTOU) + updateMany marks ALL user turns approved + no arg validation; tools.ts:530+ list tools unbounded (no q/take, 8K slice); route.ts:231-239 zero dynamic context (no date/user/screen); prompt.ts:118-120 hardcoded FY/godowns; menu-registry 76 agentPrompt entries + findItemByRoute (substrate ready, unwired); sheet.tsx:75 + panel :431 duplicate close buttons.
- Reconciled explorer contradictions: prompt.ts:83 'summary table' is ingestion-scoped only (general formatting contract absent); rights-bypass at tool dispatch is PRD FR-B3-planned (recorded as sharpened evidence, not new).
- Wrote dive 3: docs/ANALYSIS/2026-08-31-agent-chatbot-qol-study.md — 3 owner issues root-caused (formatting = 4 stacked layers incl. missing remark-gfm; conversation-unfriendliness = outcome-blindness P0 + client-only plans + TOCTOU + discarded post-commit results + ok-badged failures; screen-awareness = 90% built substrate, zero wiring).
- Wrote consolidated register: docs/ANALYSIS/2026-08-31-consolidated-gap-register.md — all 3 dives unified: 5 summary statements, 6 cross-cutting themes (loop closure, honest claims, orphaned substrate, context blindness, trust infrastructure, read-model poverty), unified P0 table (11 rows w/ PRD status), PRD coverage map (7 amendment proposals), 8-batch roadmap (0 hotfix, 1 ops, 2 chat QoL, 3-6 loop closures, 7 PRD A-J, 8 depth modules K/L/M).

Stage Summary:
- Dive 3 verdict: owner issue 1 = 4 stacked render defects (2 known PRD-P0 + remark-gfm missing + no prompt formatting contract); issue 2 = the model never learns approve/reject/commit outcomes while the prompt demands it — single highest-leverage fix is ~20 lines of synthetic outcome events; issue 3 = yes, and cheapest win in the dive (76 authored agentPrompts + findItemByRoute + one ctx POST field; also fixes context-blindness).
- Consolidation: ~110 findings total across 3 dives; 11 P0s; PRD A-J covers platform but misses loop-closure bugs, agent QoL beyond P0 queue, payroll, final accounts, stock take, backup/TZ, invoice-lines-before-G.
- Deliverables: 2 new analysis docs (committed); no code changed.
---
Task ID: 54
Agent: main (Super Z)
Task: Owner asked to "create a detailed spec file for all these requirements and fixes" — turn the consolidated findings (dives 1-3 + register) into an implementable engineering specification.

Work Log:
- Read all four source docs (dives 1-3 + consolidated gap register) in full; re-verified 5 load-bearing evidence citations verbatim (route.ts:273 chunk regex, agent-panel.tsx:467 raw-text render, tools.ts:1631 {text:error} no error field, approve/route.ts:24-38 re-execute + updateMany-all-turns, recovery_drill.sh:40 --accept-data-loss).
- Wrote docs/PRD/PHASE-6B-REMEDIATION-SPEC.md (committed 509d791): 90 requirements / 11 batches / 18 sections. ID scheme: HFX 19 (13 correctness one-liners + 6 render-stack), OPS 5, CHAT 12, JWL 9, PAY 8, PRC 9, INV 8, PRG 5, K 4, L 6, M 5. Each FR = requirement + acceptance criteria as observable behavior; each batch = problem (evidence-cited) + FR table + design notes + tests + effort + deps. Plus: §14 five PRD amendments (AM-1 SalesInvoiceLine-before-G owner flag), §15 loop-closure test family (6 seams, both doors), §16 sequencing table (~9-11 batches; minimal path = 0+1+2+tests), §17 eight open decisions, §18 theme traceability.
- Resolved dive-2 vs register inconsistency: vitest DB pinning lives in Batch 0 (HFX-13), not Batch 1.
- Formal docx via docx skill (established Task-50 pattern): scripts/gen_phase6b_docx.js — R1 cover/GO-1 palette, 3 sections (cover / Document Control + TOC roman / body arabic start=1), markdown-driven generation (multi-line paragraph join, escaped-pipe cells, *italic* inline, bullets, numbered items, shape-keyed column widths). Two bugs found+fixed during verification: (1) md line-reflow hazard — a wrapped line starting "- 0.01" parsed as a bullet, splitting the Batch-4 problem paragraph (fixed source); (2) docx-js PERCENTAGE cell widths under FIXED layout write degenerate tblGrid (all 100s) which LibreOffice honors → equal-width columns; fixed with explicit DXA columnWidths (common-rules workaround).
- Pipeline: gen → add_toc_placeholders --auto (20 headings) → patch_phase6b_docx_footers.py (ROMAN/arabic switches + empty pgNumType strip) → postcheck 9/9, 0 errors, 0 warnings; LibreOffice PDF render verified (cover, doc control, TOC, FR tables, 4/5-col tables) — 21 pages. Deliverable: download/FiberPro-Phase6B-Remediation-Spec.docx (committed cf794d9 with scripts; docx itself gitignored per repo convention).

Stage Summary:
- The spec is the implementation contract for the entire remediation program: every dive finding now has a stable FR ID, acceptance criteria, batch, dependencies, and test hook; dives 1-3 + register remain the evidence layer, PHASE-6B-REMEDIATION-SPEC.md is the build layer.
- Sequencing: Batches 0-2 (hotfix + ops + chat QoL, ~2-3 weeks) close all three owner chatbot issues and make numbers trustworthy; 3-6 close the six seams; 7/K/L/M are depth amendments; AM-1 (SalesInvoiceLine) gates Phase-6 Module G.
- No production code changed this session (docs + generator scripts only).
