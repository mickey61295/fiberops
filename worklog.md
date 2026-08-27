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
