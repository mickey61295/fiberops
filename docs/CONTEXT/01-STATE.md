# 01 — STATE (Living Project State)

> Updated every commit. Numbers below are **claims**; `scripts/context_check.sh`
> is the **verifier**. On conflict: trust the script, fix this file, log drift in 03-PITFALLS.

Last verified: 2026-08-27 (session: m5-wave-d — M5 COMPLETE: ADR-015 seven new models 54→61 (Sample, GateEntry, PackingList+Line, LabTest, Expense, Shift) + 11 items live (samples-enquiry, gate-entry/pass, packing-list, lab-test-entry, expenses, shifts-hours MT, roll-tracking lot-split, contract-allotment, fabric-acc-allotment, production-bills) + 13 tools → 159; 77/113 live, 16/17 groups; 393 vitest green; tags `spec-m5-frozen`, `m5-wave-a`…`m5-wave-d`; remote PUSHED)

## Milestone status

| Milestone | Scope | Status |
|---|---|---|
| M0 — Planning & context framework | deep dive + PLAN-2.0 + CONTEXT system | **DONE** |
| M1 — App shell & menu registry | real routes, sidebar from registry, parity tracker, coming-soo pages, approval inbox shell | **DONE** (original tag lost in rollback #4; milestone recorded in worklog + patch 0003) |
| M2 — MasterTable engine + masters | 24 master configs, shared master-service, form×agent parity, /admin/company | **DONE** (tag `m2-done`) |
| M3 — DocScreen engine + 15-stage chain forms + wiring W1/W3/W4 + PostingEngine extraction | 23 posting services + shared zod + DocScreen engine + 27 doc screens + Order Hub + pickers + /api/upload + 122 tools | **DONE** (tag `m3-done`; waves A→D in `specs/SPEC-M3.md` §14 — Wave D added invoice, debit-note, payment, journal, cost-sheet, stock-adjustment, godown-transfer + 2 new tools + /api/upload + AI-prefill button + ERRATUM 6 header typed picker) |
| M4 — RegisterScreen engine + registers + wiring W2/W6 | 17 register/board screens + shared read services + W2 drill-down/KPI links + W6 recon cards + Order Status Board | **DONE** (tag `m4-done`; Wave A engine+3 flagships → Wave B fleet 16 registers + 7 tools →130 → Wave C recon cards ×4 + Order Status Board `/orders/status` + KPI deep-links + route_smoke_waveE 19/19; 41/113 items live) |
| M5 — Extended doc families | 36 items: Wave A money/rates (7) → Wave B production/pcs variants (14) → Wave C approval kinds (4) → Wave D ADR-015 new models (11 items, 7 models 54→61 — ERRATA #3) → **159 tools**, 77/113 | **DONE** (tag `m5-done`; Wave A `m5-wave-a`: budget + invoice variants ×3 + supplier orders + rate/piece-rate registers → Wave B `m5-wave-b`: ProductionEntry family ×7 + panel variants + line-transfer + jobwork-pcs-return + costing-input + wages + wage-payments → Wave C `m5-wave-c`: approval-kinds registry + inbox ?kind= tabs + 3 posting hooks + 4 wrapper tools (146) + supplier-bills Bill-pass column → **Wave D `m5-wave-d`**: 7 ADR-015 models + sample/gate×2/packing/lab/expense DS + shift MT + roll-split (RSP pair) + contract-allotment (AL-) + program-allotment (ProgBalance write door) + production-bills (Journal wage bill) +13 tools → 159; 77/113 live, 16/17 groups, 393 vitest green, route_smoke_m5d 70/70) |
| M6 — Reports, MIS, admin, print | | NOT STARTED |

## Ground truth (verified by context_check.sh)

| Metric | Value | How to verify |
|---|---|---|
| Git HEAD | M5 Wave D commit (M5 COMPLETE) — tags `m5-wave-d`, `m5-done`, prior `m5-wave-c/b/a`, `spec-m5-frozen`, `schema-54-baseline`; **remote = local (PAT configured; push after EVERY commit)** | `git rev-parse --short HEAD` |
| Agent tools | **159** (67 inline + 25 factory create + 25 factory update + 42 docTool delegates — M5 Wave D +13: create_sample, create_gate_entry, create_gate_pass, create_packing_list, create_lab_test, create_expense, split_roll, allot_contract, create_allotment, create_production_bill + shift factory ×2 + list_shifts) | `scripts/context_check.sh` |
| Prisma models | **61** (54 + ADR-015 ×7: Sample, GateEntry, PackingList, PackingListLine, LabTest, Expense, Shift — SPEC said "six…54→60", ERRATUM #3) | `grep -c "^model " prisma/schema.prisma` |
| Shared zod schemas (M3-A/D + M5-A/B/D) | **36 files** in `src/lib/erp/schemas/` (verbatim tool contracts + M5-D sample/gate/packing-list/lab-test/expense/roll-split/contract-allotment/program-allotment/production-bill) | context_check |
| Posting services (M3-A/D + M5-A/B/D) | **34 files** in `src/lib/erp/posting/` (19 op services + ledger.ts + types.ts + master-service.ts + M5-A budget.ts + supplier-order.ts + M5-B line-transfer.ts + M5-D sample.ts, gate.ts, packing-list.ts, lab-test.ts, expense.ts, roll-split.ts, contract-allotment.ts, program-allotment.ts, production-bill.ts) | context_check |
| Chain definition (M3-A) | `src/lib/erp/chain.ts` — 15 stages, nextStage/computeChainState/stageFormUrl + resolveStageUrl (Wave B, id-aware) (ADR-007 single source; PIPELINE deleted from tools.ts) | context_check |
| tools.ts size | 2805 → 1693 lines (all 21 SPEC-M3 §5 write ops thin delegates; suggest_next_step gained nextFormUrl) | `wc -l` |
| Doc configs (M5-D) | **47 configs in 37 files** (M3 19 + M5-A 5 + M5-B 13 + M5-D 10: sample, gate ×2, packing-list, lab-test, expense, roll-split, contract-allotment, program-allotment, production-bill) in `src/lib/erp/doc-configs/` | context_check |
| DocScreen engine (M3-B) | `src/components/archetypes/doc-screen.tsx` — New (header grid + line editor + totals + review + commit) / View modes, config-driven | context_check |
| Wiring (M3-B/C/D) | W1 chain bar (`chain-bar.tsx`, every DocScreen + Hub) · W3 Order Hub (`/orders/[id]`, 12 family sections + rollups; **Wave C: every family row links its doc view + context-aware section CTAs + sent-DC "Receive" quick-link**) · W4 pickers (`doc-picker.tsx` incl. TYPED line picker `pickerFrom` — PO itemCode ← itemType cell) · nextFormUrl + agent "Open form" · ?order/?po/?dcNo/?invoice prefill on all 19 New screens · **Wave D: accounts/inventory rows link their views in the Hub + Fill-with-AI button on every DocScreen** | context_check + route smoke |
| Master configs | **25** (pure-data files in `src/lib/erp/master-configs/`; 24 M2 + shift M5-D) | context_check + `tests/unit/master-configs.test.ts` |
| ERP view/shell components | **22** (21 + M4 Wave C recon-card.tsx) | `ls src/components/erp/*.tsx \| wc -l` |
| Archetype engines | **3** (`master-table.tsx` + `doc-screen.tsx` + `register-screen.tsx`) | context_check |
| Menu registry | 113 items · 17 groups | `tests/unit/menu-registry.test.ts` |
| Live routes (M5-D) | **108**: M5-C 91 + M5-D ×17 (11 screens + 6 view routes) | LIVE_ROUTES in `src/lib/erp/menu-registry.ts` |
| RegisterScreen engine (M4-A) | `src/components/archetypes/register-screen.tsx` (server: breadcrumb, filter bar, summary, totals band, W2 hrefs, pagination, CSV link) + `register-filter-bar.tsx` (client: pushes shareable searchParams; party/godown datalist via master_search) | context_check |
| Order Status Board (M4-C) | `/orders/status` — server component over queryOrderStatus (registers/order-status.ts): header KPIs (open orders/pcs/avg stages), per-row 15-dot ChainBar (flags shipped on the row), n/15 chip + next-stage chip, row → Order Hub; NOT a RegisterScreen (§10) | route_smoke_waveE.sh |
| Wiring (M4-C) | W2: register rows drill into doc views (TXN_DOC_FAMILY + resolveDocRef; every family href test-pinned) · W6: ReconCard on PO view (PO↔GRNs), invoice view (Invoice↔Payments), jobwork view (out↔in), Order Hub despatch section (Despatch↔Invoice) — math in registers/recon.ts, test-asserted · §8.3 KPI deep-links on the dashboard tiles (Open Orders→/orders/register?status=open, Pending POs→/procurement/party-balance, Stock Value→/inventory (ERRATUM: /inventory/stock was never a route), Today Pcs→/production/register?from&to, Pending Approvals→/approvals, Open Invoices→/accounts/bills-register?status=issued) | route_smoke_waveE.sh 19/19 |
| Register configs/services (M5-B) | **19 configs** in `src/lib/erp/register-configs/` + **21 service files** in `src/lib/erp/registers/` (19 REGISTER_SERVICES entries — slug bijection test-enforced — + order-status.ts + recon.ts; M5-B adds production-wages/wages.ts) + resolve.ts (parseRegisterQuery + TXN_DOC_FAMILY + resolveDocRef + buildItemCodeMaps (pcs→style.styleNo)) + csv.ts (makeCsvRouteHandler) | context_check |
| Parity (M5-D — M5 COMPLETE) | **77/113 items live (68.1%)** · **16/17 groups** (Wave D: +samples-enquiry, gate-entry, gate-pass, packing-list, lab-test-entry, expenses, shifts-hours, production-bills, roll-tracking, contract-allotment, fabric-acc-allotment — reports group is M6) · legacy coverage via /parity | `/parity` page or `parityStats()` |
| E2E pipeline tests | 15, all passing | `npx vitest run` |
| Doc form↔agent parity tests (M3-A/D) | **21 tests** (20 ops × both doors + full-chain ledger signature equality + Wave D 2 new tools) | `npx vitest run` |
| Doc-config contract + form-door tests (M3-B/C/D) | **40 tests** (§7 contracts incl. EVERY-config schema-mirror loop + coercion + Wave B/C action-composition integration) | `npx vitest run` |
| Registry unit tests | 22 (M5 Wave D: +1 Wave-D live block) | `npx vitest run` |
| Register-config contract tests (M4-B) | **runtime via 19-config loop** (27 source its; per-config loop: columns/filters/agentTools/route+page+csv/askPrompt + bijection + parse + tool-shape pins incl. M5-B tools + service smokes incl. wages) | `npx vitest run` |
| Register services math suite (M4-B/C) | **26 tests** (`tests/pipeline/register-services.test.ts`): seeded fixture chain asserts §5 math (inhand pending, daily totals == ledger sums, party-balance, bills outstanding, party-ledger balance, io-history running balance, production-status, budget-vs-actual, approval-audit, order-status done-count, lots, pcs-stock) + W6 recon math (poRecon/invoiceRecon/jobworkRecon/despatchRecon) + delegated-tool regression pins; surgical TS-tagged cleanup (doc-parity pattern) | `npx vitest run` |
| **Total vitest** | **393 passing** (378 M5-C + doc-parity-m5d 10 (all 10 new write ops × both doors + roll-split net-zero + packing Σpcs = despatch + bill = Σ period amounts + gate variant injection via commitDocAction) + doc-configs Wave D block + menu-registry Wave D block + master-parity shift ×3 (25-config loop)) | `npx vitest run` |
| Master config contract tests | 8 | `npx vitest run` |
| Master form×agent parity tests | 7 blocks → 78 tests at runtime (loop over all 25 configs — shift joined in M5-D) | `npx vitest run` |
| MAX_STEPS (agent loop) | 12 | grep in `src/app/api/agent/route.ts` |
| API routes | `/api/agent`, `/api/agent/approve`, `/api/erp`, `/api/seed`, `/api/upload` (Wave D §12 rebuild), `/api/route.ts` | ls `src/app/api/` |

## Known drift / gaps

1. **`PROMPT_VERSION` constant does NOT exist** in `route.ts` (older session summary
   claimed `v5-2026-08-26`). Do not "restore" a constant that was never in this baseline.
2. **`/api/upload` REBUILT in Wave D** (SPEC-M3 §12): POST multipart (20MB cap,
   txt/csv/md/json/tsv/log/pdf, de-collided names) + GET listing. The agent
   panel's paperclip works again; DocScreen gained the "Fill with AI" button
   (§10 minimal slice — seeds the panel; full two-way binding is M4's W5-full).
3. Tool counting changed in M2: factory-built master tools (`masterCreateTool`/
   `masterUpdateTool`) do not carry inline `name:` lines — the verifier counts
   inline + factory calls. Never trust a naive `name:` grep again.
4. Single-field masters (dia, part, component) have update tools that can only
   report "No fields to update" — documented behavior (SPEC-M2 §11.2), not a bug.
5. **Rollback #4 (2026-08-26, recovered same day)**: sandbox restored `.git` to
   `3f09291` (Phase-1.8 era) while KEEPING M2-final working files; it also
   resurrected files M1/M2 had deleted (`app/page.tsx`, `erp/sidebar.tsx`,
   `erp/masters-view.tsx`) and restored a STALE Phase-4-era prisma client in
   `node_modules` (58-model). The 54-model `prisma/schema.prisma` was lost from
   the working tree during recovery and RECONSTRUCTED via
   `scripts/rebuild_schema_54.py` (shapes derived from tools.ts + test usage —
   see PITFALLS #16). Original m1/m2 commits and tags are gone; patch exports
   0003/0004 in `download/` are the surviving evidence.
6. **tsc noise is now ~30 errors** (fluctuates 29-31 with the .next cache) — the
   54-world orphans: `src/lib/erp/{flags,exposure,cumrate}.ts`
   (reference removed Phase-3/4 models Flag/Bill/prs — only `/api/config` imports
   flags), Phase-3/4 seed/cleanup scripts (`seed_commercial`, `seed_stages`,
   `cleanup_e2e_bills`, `cleanup_stale_t3`, `verify_money_loop`), plus the old
   known noise (vitest.config poolOptions, skills/).
   Do NOT chase these; they document the eaten Phase-3/4 lineage. Full list in
   PITFALLS #16.
7. **Two LATENT pre-existing bugs found & fixed by the M3-A doc-parity test**
   (both sat in the inline tool code since rollback #4's schema reconstruction,
   uncovered because no test exercised those paths):
   - `create_purchase_order` passed `itemCode` into the nested pOLine create →
     PrismaClientValidationError (POLine has no such column). Fixed in
     `posting/purchase-order.ts` (itemCode stays in the plan display only).
   - `receive_grn` without deptCode keyed/created the CurrentStock bucket with
     `deptId: ''` → FK violation on create, and the ''-keyed unique lookup never
     matched the null-keyed buckets that exist. Fixed in `posting/grn.ts`
     (null dims when no dept — ADR-004 pattern; dept-keyed buckets preserved).
   See PITFALLS #18.
8. **BOM line REMOVAL is a single-door exception** (`removeBomLineAction` in
   `orders/actions.ts` is a direct db delete — no `delete_bom_line` tool exists in
   the SPEC-M3 §11 inventory). BOM line CREATION is dual-door (planBom). Revisit
   in M5 if agents need to remove BOM lines (would need a new tool + ADR).
9. **SPEC-M3 ERRATUM (Wave B)** documented in `doc-configs/types.ts`: (1) optional
   `pickerValueField` on DocField/DocLineField — colour/size pickers emit NAME
   (planOrder resolves by name) while buyer/style emit code; (2) DocConfig carries
   `schema` (the shared zod) for form-door safeParse; (3) `DocScreenConfig` =
   serializable subset (service/schema cannot cross the RSC boundary — the client
   calls server actions by slug).
10. **SPEC-M3 ERRATUM (Wave C)** also in `doc-configs/types.ts`: (4)
   `numberPrefix`/`numberField` OPTIONAL — production/rework entries carry no
   doc number (bundleNo is the reference) and jobwork-in references an EXISTING
   dcNo; (5) `DocLineField.pickerFrom` — TYPED line picker (PO itemCode's master
   slug ← the row's itemType cell) + `options` on line selects. The engine also
   learned `select` rendering (header + line cells + option labels in View).
11. **Relation-less FK columns on the reconstructed schema (Wave C, tsc caught
   it)**: `JobworkOrder.orderId`, `PcsDespatch.orderId`/`buyerId`, `GRN.deptId`
   are BARE columns — no Prisma relation. Includes on them fail tsc; the pages
   resolve via separate lookups + id maps (same pattern the Hub already used
   for the reverse direction). Re-verify relations before writing `include:`.
12. **rework shares chain stage 11 with rejection** (CHAIN[10] tool is
   post_rejection — the stage's primary form). Rework has no own view route:
   rework rows (ProductionEntry.rework=true) view via `/production/entry/[id]`
   with a rework badge. jobwork-in likewise has no own view (it UPDATES the DC —
   its post-commit "View document" targets `/jobwork/order/[id]`). Wave D added
   two more no-view ops by design: stock-adjustment + godown-transfer — the
   StockLedger rows ARE the record (recent tables list ledger rows; transfer
   shows the out→in pair sharing one GT-#### docNo).
13. **THIRD latent pre-existing bug found & fixed by Wave D** (PITFALLS #23, the
   #18 lineage): `posting/grn.ts` used `findUnique` with a compound-unique key
   containing nulls — Prisma REJECTS nulls in findUnique unique-input, the
   `.catch(()=>null)` swallowed the throw, and EVERY GRN created a DUPLICATE
   50-kg CurrentStock bucket instead of incrementing (46 junk rows had silently
   accumulated across ~23 test runs). Fixed with findFirst + update-by-id (the
   bumpStock pattern); junk swept by `scripts/cleanup_junk_buckets.py`; parity
   test 5 now asserts bucket-count === 1 after both doors (regression guard).
14. **SPEC-M3 ERRATUM (Wave D)** in `doc-configs/types.ts`: (6) `DocField.pickerFrom`
   — the HEADER typed picker (itemCode's master slug ← the itemType select cell:
   yarn|fabric|accessory; same mechanism as ERRATUM 5's line pickers). Used by
   stock-adjustment + godown-transfer. The stock-adjustment item's agentTools
   switched adjust_stock → post_stock_adjustment (the ADR-004-compliant twin;
   legacy adjust_stock stays inline by design).

## What exists today (file inventory — the parts that matter)

| Path | What it is |
|---|---|
| `src/lib/erp/master-configs/` | **M2 single source of master truth**: types.ts + 24 per-entity configs + index.ts registry |
| `src/lib/erp/posting/master-service.ts` | **M2 shared service**: planMasterCreate/Update + listMasters/countMasters + buildMasterSchema — the ONLY master business logic (ADR-001) |
| `src/components/archetypes/master-table.tsx` | MasterTable engine (client): grid, search, CSV export, create/edit slide-over |
| `src/app/(erp)/masters/page.tsx` | hub: 24 entity cards by category with live counts |
| `src/app/(erp)/masters/[entity]/page.tsx` | config-driven MasterTable screen (unknown slug → 404) |
| `src/app/(erp)/masters/actions.ts` | `saveMasterAction` server action → same service as agent tools |
| `src/app/(erp)/admin/company/page.tsx` | company profile + FinYear MasterTable (`company-finyear` item live) |
| `src/lib/erp/menu-registry.ts` | M1 single navigation truth (LIVE_ROUTES grew: `/admin/company` + M3-B `/orders/new`, `/orders/[id]`) |
| `src/lib/erp/chain.ts` | **M3-A: the ONE 15-stage chain def** (ADR-007) — CHAIN + computeChainState + nextStage + stageFormUrl + resolveStageUrl (M3-B id-aware); suggest_next_step + chain bar + DocScreen CTAs share it |
| `src/lib/erp/schemas/` (17 files) | **M3-A: shared zod** — the agent tool schemas extracted VERBATIM (prompt contract); form actions will safeParse the same objects |
| `src/lib/erp/posting/` (17 op services + ledger.ts + types.ts) | **M3-A: PostingEngine** — plan/commit per op; postLedger+bumpStock (ADR-004 comments); DocPlanResult types |
| `src/lib/erp/legacy-enums.ts` | **M3-A: ADR-012 residence** — STAGE_DEPT + documented legacy DeptID/rework magic numbers |
| `src/lib/erp/doc-configs/` (types + order + 11 Wave C configs + index + coerce) | **M3-B/C: DocConfig frozen types (§7 + ERRATUMs 1-5) + 12 configs + registry + form coercion** |
| `src/lib/erp/doc-actions.ts` | **M3-B/C: the form door's generic server actions** — planDocAction / commitDocAction + SLUG_REVALIDATE map (all 12 slugs) |
| `src/components/archetypes/doc-screen.tsx` | **M3-B: DocScreen engine** — New (header grid + W4 pickers + line editor + totals + review step + post-commit CTAs) / View modes; draft state survives create-on-the-fly |
| `src/components/erp/chain-bar.tsx` | **M3-B: W1 chain mini-pipeline bar** — 15 dots, done-fills, current-stage ring, "Next →" Link via resolveStageUrl |
| `src/components/erp/doc-picker.tsx` | **M3-B: W4 picker** — searchable dropdown over `/api/erp?resource=master_search` + create-on-the-fly Sheet reusing MasterFieldInput + saveMasterAction |
| `src/components/erp/bom-card.tsx` | **M3-B: BOM card** (Order Hub #bom) — inline add editor (planBom-backed) + remove (single-door exception, drift #8) |
| `src/components/erp/recent-docs.tsx` | **M3-C: DocBreadcrumb + RecentDocsTable** — the shared New-page chrome (server component; action column for jobwork Receive) |
| `src/app/(erp)/programs/{new,[id]}` · `procurement/{po,grn}/{,[id]}` · `jobwork/{order,order/[id],receipt}` · `cutting/job-order/{,[id]}` · `production/{issue,entry}/{,[id]}` · `production/rework` · `pieces/{rejection,despatch}/{,[id]}` | **M3-C: 11 New screens + 9 view screens** (§8 rows 3-13) — config-driven DocScreen + recent docs + prefill CTAs |
| `src/app/(erp)/accounts/{invoice,debit-note,payments,journal}/{,[id]}` · `costing/cost-sheet/{,[id]}` · `inventory/{adjustment,transfer}` | **M3-D: 7 New screens + 5 view screens** (§8 rows 14-20) — GST math card on invoice views, invoice-settling payment views, versioned cost-sheet views, ledger-row recent tables on the 2 inventory screens |
| `src/lib/erp/posting/stock-adj.ts` + `schemas/stock-adj.ts` | **M3-D: post_stock_adjustment service** (ADJ-#### docNo; postLedger ADR-004 buckets; add/less) |
| `src/lib/erp/posting/transfer.ts` + `schemas/transfer.ts` | **M3-D: transfer_stock service** (GT-#### docNo; out+in ledger PAIR in one transaction; net-zero) |
| `src/app/api/upload/route.ts` | **M3-D §12: upload rebuild** — POST (sanitize → de-collide → write → extract) + GET (listUploadDir) |
| `src/app/(erp)/orders/new/page.tsx` | **M3-B: Order Sheet New mode** + recent-docs table (item order-sheet-new LIVE) |
| `src/app/(erp)/orders/[id]/page.tsx` | **M3-B: Order Hub (W3)** — resolves id OR orderNo; header + chain bar + order lines + BOM card + 11 family sections with rollups; unknown → 404 (item order-hub LIVE) |
| `src/app/(erp)/orders/actions.ts` | **M3-B: BOM card actions** — addBomLineAction (planBom dual-door) + removeBomLineAction (exception) |
| `src/app/api/erp/route.ts` | + `resource=master_search` (W4 picker feed — same listMasters read path) |
| `src/lib/agent/tools.ts` | 122 tools, ALL SPEC §5/§11 write ops are thin delegates: masterCreateTool/masterUpdateTool (M2) + docTool ×23 (M3-A/D); inline leftovers: approve_pending, adjust_stock, update_order, create_sizes (deliberate — outside SPEC inventory; adjust_stock keeps its legacy ''-bucket semantics) |
| `tests/pipeline/doc-parity.test.ts` | **M3-A: the P2 guarantee at transaction scale** — 18 ops × agent-door vs form-door + full-chain StockLedger signature equality + net-zero bucket assertions |
| `tests/pipeline/master-parity.test.ts` | **the P2 guarantee**: per-entity tool-path vs service-path equivalence |
| `tests/unit/master-configs.test.ts` | config contract (delegates, tools, fields, columns) |
| `src/app/(erp)/layout.tsx` + 11 module routes | routed shell (M1) |
| `src/app/(erp)/coming/[id]/page.tsx`, `/parity` | registry-driven coming-soon + parity tracker (M1) |
| `src/lib/erp/menu-registry.ts` + `src/components/erp/{app-shell,nav-sidebar,topbar,parity-footer}.tsx` | shell components (M1) |
| `src/lib/agent/docExtract.ts` | upload listing + pdftotext (survivor) |
| `prisma/schema.prisma` | 54 models — **UNCHANGED in M2** (ADR-013: zero schema churn) |
| `docs/CONTEXT/specs/SPEC-M2.md` | frozen M2 spec (+ ERRATUM block: 'list' type, refCreateOnFly, title-dup check, select z.string) |

DELETED in M2: `src/components/erp/masters-view.tsx` (read-only 11-tab view).
DELETED in M1: `src/app/page.tsx` (view-switcher), `src/components/erp/sidebar.tsx`.

## Open decisions awaiting user

1. Multi-company: keep single-company UI, preserve `coyCode`? (recommended: yes until M6)
2. Barcode bundle flow: port in M5 or defer M7?
3. Tally export: JSON adapter in M6 or skip?

## Next actions (in order)

1. **M5 COMPLETE** (this session, tag `m5-done`): Wave D shipped all 11 §7-D
   items — ADR-015 seven models 54→61, 13 tools → 159, 77/113 live (68.1%),
   16/17 groups, 393 vitest green, route_smoke_m5d 70/70, context_check
   230/230. **Push after EVERY commit** (standing user instruction, PAT
   configured in the remote).
2. **M6 — Reports, MIS, admin, print** (last milestone): freeze SPEC-M6 first
   per wave discipline (reports group is the last closed group — 16/17; the
   remaining 36 coming-soon items are mostly M6 report/prints + admin).
3. Update this file every wave (same commit); push after the commit.

## M5 Wave D notes for future sessions

- **ADR-015 landed SEVEN models, not six** (Sample, GateEntry, PackingList,
  PackingListLine, LabTest, Expense, Shift → 54→61; SPEC §5 said "six…54→60"
  — ERRATUM #3, the §5 block is binding). `schema-54-baseline` tag marks the
  pre-migration schema; `prisma db push` + `generate` were run before any
  Wave D code. **The dev server MUST be restarted after prisma generate**
  (the stale in-memory client 500s every route — `db.sample` undefined).
- **shiftConfig is NOT re-exported from master-configs/index.ts** (the M2
  index only exports the array + helpers): import it directly from
  `@/lib/erp/master-configs/shift`. The master-configs contract test REQUIRES
  every config's listTool to exist as a read tool — that's why Wave D is +13
  tools (12 named in §8 + list_shifts), not +8 as the spec's arithmetic said.
- **Gate entry/pass are §4 rule-2 variants over ONE service**: planGateEntry
  takes gateType; the two configs + the two docTools inject 'in'/'out'
  (GE-#### / GP-#### prefixes derive from gateType). The [id] views share the
  GateEntryView component (dispatch/gate-view.tsx).
- **split_roll (rolls ≡ lots)**: RSP-#### transfer_out+transfer_in StockLedger
  pair sharing one docNo in ONE transaction; buckets decrement lot-keyed
  first, then the null-lot fallback (ADR-004); the IN leg creates the new
  lot-keyed bucket. Prisma cannot sort nulls-last portably — sort in JS
  (the orderBy-lotId-'sort' attempt threw at runtime; doc-parity caught it).
- **create_production_bill needs an EXPLICIT period** in tests: ~100 seeded
  ProductionEntry rows sit inside the default last-30-days window — the
  parity test uses a 2027-06 window for determinism (STATE ground truth).
- **program-allotment is the ProgBalance WRITE door** (the program status
  register is the read side): find-first-or-create + increment, the same
  pattern planProgram uses; accessory allotments are rejected (no table) with
  the create_program-notes pointer.
- **lab-test itemType accepts BOTH 'pcs' and 'style'**: the form's typed
  picker (ERRATUM 6 pickerFrom) uses master SLUGS, and 'pcs' isn't one — the
  select's pcs option carries value 'style'; the service maps both to the
  Style model.
- **contract-allotment dcNo is an AL-#### placeholder** on JobworkOrder
  (status='allotted', no stock moves); the real JW-#### DC is issued later via
  create_jobwork_order — the AL- prefix never collides with JW- (verified in
  doc-parity test 7).
- **promise.all + ternary + [] breaks tsc** (never[] unions poison the
  derived Maps → `{}` cells): the id-map lookups in new pages use sequential
  `cond ? await db.x.findMany() : []` instead.

## M5 Wave C notes for future sessions

- **The kind === Approval.entity** (approval-kinds.ts): the inbox filter is a
  plain entity equality — no new inbox code paths (§6 rule 3); the approve
  door stays approve_pending + /api/agent/approve.
- **Posting hooks are opt-in flags on the BASE schemas** (transfer requiresAck /
  grn reprocess / despatch returnable, all optional booleans, default = legacy
  behaviour): the Approval row is created INSIDE the service transaction.
  The doc-configs mirror-rule test skips these keys (AGENT_ONLY_HOOK_KEYS) —
  they are agent-door-only inputs, NOT form fields (zero engine churn).
- **The 4 wrapper tools share proposeApprovalGate()** (tools.ts): find-latest →
  already-approved informational / pending → approve update / missing →
  create-then-approve (§8). Idempotent by design (tested).
- **supplier_bill approvals ARE the bill-pass document**: the supplier-bills
  register + list_supplier_bills json surface a billPass column
  (Passed/Pending/—) — GRN has no status column, so this is the "GRN billed
  status" (§6 rule 2). godown_transfer entityId is the GT-#### docNo (the
  ledger pair is the record; drill → /inventory/io-history).
- **WorkflowView is kind-aware** (kind prop + tabs + per-kind detail rows via
  detailRows() — every rendered value is a PRIMITIVE, the M1
  objects-as-React-child bug must never return); the API route enriches
  entityData per kind + returns refHref for the W2 drill.

## M5 Wave B notes for future sessions

- **Variant wrappers live in the POSTING family files** (§4 rule 1): production.ts
  gained planFinishedGoods/planOperationEntry/planScanBundle, grn.ts gained
  planJobworkPcsReturn, payment.ts gained planWagePayment — the base fns and
  their M3 tools stay byte-identical. Only line-transfer.ts is a NEW posting
  file (the LT- pair op has no base service).
- **LT-#### numbering must strip the -O/-I suffixes** when scanning for the
  next free ref: the stored issueNo values are `LT-0001-O`/`LT-0001-I`, so a
  naive `used.has('LT-0001')` never matches → unique-constraint crash on the
  second transfer (caught by doc-parity test 4).
- **CutBundle FKs are relation-less columns** (cutOrderId/colourId/sizeId —
  PITFALLS #21): scan_bundle and the /production/bundles prefill resolve
  cutOrder → order → colour/size via separate findUnique lookups. `include:`
  on them fails tsc.
- **ERRATUM 7 (pickerFilter)**: DocField.pickerFilter + DocPicker.filter +
  master_search filterField/filterValue — an additive server-side equality
  filter for the W4 picker feed. Wage-payments pins partyType=employee. The
  API filter is verified live (employee→[], supplier→suppliers only).
- **Dept-default variants inject D3/D4/D5** (cutting/sewing/finishing — the
  seed's dept codes): FINISHED_GOODS/OPERATION_ENTRY schemas relax ONLY
  deptCode; the panel variants reuse OPERATION_ENTRY_SCHEMA and inject D3 in
  the config's service.plan. The base PRODUCTION_ENTRY_SCHEMA stays VERBATIM.
- **The EVERY-config schema-mirror loop is strict**: every schema key needs a
  header field — injected keys render as `type: 'readonly'` (coerce skips
  them; the wrapper injects at plan time). Wave B configs carry lineId/
  colourName/sizeName pickers + readonly action/rejType cells for exactly
  this reason.
- **production-wages is an RG screen** (arch upgraded DS→RG in the registry —
  SPEC-M5 §2): groups by OPERATOR across orders (piece-rate-confirmation is
  the per-order sheet; this is the payroll rollup). The "Generate wage bill"
  form action re-runs the SAME queryWages service and posts planJournal
  (Dr Production Wages / Cr Wage Payable) — engine unchanged, page-level
  action. W2: rows drill to /masters/employee; W6: budget-vs-actual link when
  ?order= is active.
- **register agentTools must stay read-only** (register-configs contract test):
  the wages config carries only get_production_wages; create_journal rides the
  MENU item's agentTools + the bill button.
- **jobwork-pcs-return shares the GRN-#### space** (§4 rule 2) and posts
  process_delivery OUT of the pcs godown (default G2) via postLedger — the
  GRN row carries grnType='process_return' + a pcs GRNLine.
- **panel-cutting / costing-input are PURE variants** (no injection needed):
  the same planCutOrder/planCostSheet door with panel/daily labels; recent
  lists show the shared family rows (no type column exists to narrow on).

## M5 Wave A notes for future sessions

- **The variant-doc pattern held** (SPEC-M5 §4): variant configs WRAP the base
  service (`service.plan: (input) => planInvoice({...input, billType:'sales'})`)
  and their schemas relax ONLY the injected key (INVOICE_SCHEMA.extend({billType:
  optional}) — LOCAL also relaxes gstType for the cgst_sgst default). Zero
  DocScreen engine changes. The wrapper lives in a sibling posting fn
  (planSupplierOrder) or inline in the config's service.plan (invoice variants).
- **coerceDocInput SKIPS readonly fields**: a variant's fixed type field must
  be `type: 'readonly'` in the config AND optional in the variant schema —
  otherwise safeParse fails on the missing required key. The local + piece +
  supplier variants all follow this.
- **planExportInvoice is a SIBLING of planInvoice** (not a modification):
  planInvoice and create_sales_invoice stay byte-identical (VERBATIM); the
  sibling shares the INV-#### number space via the extracted `nextInvoiceNo`
  helper. Commercial invoices write invoiceType='export' + ern.
- **Budget has NO doc number** (ERRATUM 4 pattern): planBudget identifies by
  orderNo/deptCode; the view page (/costing/budget/[id]) resolves orderId +
  deptId via separate lookups — Budget.orderId/deptId are PLAIN FK columns
  (PITFALLS #21; no `include: { order: true }` — tsc catches it).
- **budget-vs-actual now prefers explicit Budget rows** (both the single-order
  getOrderBudgetActual path AND the all-orders path): explicit > 0 wins,
  else Σ CostSheet.totalCost (the M4 convention). M4 fixtures carry no Budget
  rows → their assertions stay green.
- **rate-confirmation filters ride the PO relation**: POLine has no partyId —
  party + date filters merge into one `where.po = {...}` object (two separate
  assignments to where.po silently overwrite each other — caught by the math
  suite's party-filter test).
- **register `itemType` filters need `options`** (frozen-filter contract): the
  rate-confirmation itemType select carries yarn|fabric|accessory options
  (pcs is not a PO line type).
- **piece-rate rows have no drill href** (operator × order aggregate — an
  operator master link would be an M6 polish; href stays null, never dead).
- **tsc noise**: unchanged (~30-32 known orphans incl. verify_approvals_fix.ts
  from the b344ae8 session); all Wave A files typecheck clean.

## M4 Wave C notes for future sessions

- **ReconCard recipe** (§9): pure query fn in `registers/recon.ts` returning
  ReconResult {title, mathLine, balance, balanceLabel, rows, rowsTitle} + the
  server `components/erp/recon-card.tsx`; view page fetches it AFTER resolving
  the doc and renders `{recon && <ReconCard recon={recon} />}`. Math is
  test-pinned in the register-services suite (4 tests).
- **§8.3 ERRATUM**: `/inventory/stock` is NOT a route (spec assumed M2 liveness
  it never had — the stock table lives on the /inventory group view). The
  Stock Value KPI tile deep-links to /inventory. Documented, not a bug.
- **Board ≠ RegisterScreen** (§10): the Order Status Board is a plain server
  table over queryOrderStatus; ChainBar receives the row's `flags` (added to
  OrderStatusRow in Wave C — the tool json does NOT expose flags, only the
  board uses them).
- **bills-register status filter**: added in Wave C so the §8.3 Open-Invoices
  deep-link (?status=issued) actually filters — narrows the invoice rows of
  the day-book; debit notes/payments stay unfiltered.
- **JW-SMOKE-1**: `scripts/seed_wave_smoke.ts` reseeds one jobwork DC
  idempotently for the route smoke (the waveD smoke's fixed doc numbers died
  with test-cleanup residue — this one self-heals every run).

## M4 Wave B notes for future sessions

- **The fleet recipe held**: 13 registers shipped exactly as the Wave A notes
  described (config + service + registry entry + page + csv/route.ts +
  LIVE_ROUTES + menu agentTools + test loop). No engine changes were needed —
  configs stayed pure data.
- **`db.gRN`, not `db.grn`** (PITFALLS #26): resolve.ts's FAMILY_SPEC carried
  `grn` from Wave A — every GRN-family drill-down silently rendered unlinked.
  The math suite's href assertion caught it; every family now has a pinned
  href in tests.
- **pcs items live in the STYLE master** (PITFALLS #27): itemId for
  itemType='pcs' points at Style, whose code column is `styleNo`. Use the
  shared `buildItemCodeMaps()` (registers/resolve.ts) for any new register —
  never inline per-type code lookups.
- **party-ledger balance sign**: bills-register convention (§5 row 12) —
  `opening + billed − debit − journals − received + paid`. A receipt REDUCES
  what the party owes. Keep both services' math aligned (test-enforced).
- **`grnType` is NOT in the frozen filter-key set** (§4): the supplier-bills
  GRN-type select rides the `status` searchParam key; the service maps
  q.status → grnType. Extend REGISTER_FILTER_KEYS only via a plan edit.
- **order-status is NOT in REGISTER_SERVICES** (§10): the board is a DB
  archetype — queryOrderStatus lives in registers/order-status.ts and is
  imported directly by the get_order_status tool (and the Wave C board page);
  the config↔service bijection test stays 16.
- **get_stock delegates to fetchCurrentStock** (stock-register.ts) — the
  VERBATIM old query; the register variants group on top. Grouping changes row
  counts, not json shape (contract-safe).
- **groupBy pagination**: Prisma groupBy REQUIRES orderBy when take/skip are
  set; group-count comes from a second groupBy over keys (take 10000 guard).
- **tsc noise**: unchanged (~30 known orphans, PITFALLS #10/#16); all new
  Wave B files typecheck clean.

## M4 Wave A notes for future sessions

- **RegisterScreen recipe**: config (pure data) in `register-configs/` + service
  in `registers/` + REGISTER_SERVICES entry + page (searchParams →
  parseRegisterQuery → service → RegisterScreen) + optional `csv/route.ts`
  (makeCsvRouteHandler(slug)) + LIVE_ROUTES + config test loop. Wave A shipped
  3 flagships; Wave B is 13 more of the same shape.
- **Pages CANNOT return `Response` objects** (Next.js rule — the csv export
  first tried `?format=csv` on the page and 500'd with "Only plain objects…
  can be passed to Client Components"). CSV = sibling `csv/route.ts`.
- **Read-tool delegation recipe**: move the tool's inline query into the
  service VERBATIM; tool execute maps its own json subset (frozen shape);
  zod schema untouched. Register screens may use richer filters (additive).
- **W2 drill-down**: `TXN_DOC_FAMILY` maps txnType → family; `resolveDocRef`
  resolves id OR doc-number (findFirst OR-query); ledger rows resolve by
  docNo (refId is '<pending>' on legacy rows — unreliable). Unresolvable →
  unlinked row, never a dead href. Cut family (ready_to_cut_*) joins in Wave B.
- **Filter UX**: dateRange renders two inputs (from/to keys both typed
  'dateRange'); selects push immediately; text inputs push on Enter/blur;
  party/godown get an async datalist from master_search (progressive).
- **tsc noise now 32** (was 29-31): +3 transient .next/dev validator entries
  appear while the dev server hasn't compiled new routes — they vanish after
  the routes are first hit. Don't chase them.

## M3 Wave D notes for future sessions

- **M3 is COMPLETE**: every §8 row (1-20) has a live screen; every §5/§11 write
  op is a docTool delegate over a posting service; both doors test-enforced.
- **New-tool recipe (Wave D)**: schema file + posting service (plan/commit with
  DocPlanResult) + docTool entry in tools.ts + doc-config + page(s) + LIVE_ROUTES
  + SLUG_REVALIDATE + parity test. Two tools + two screens in one sitting.
- **Ledger-only docs** (no Prisma doc model): the StockLedger rows ARE the doc
  (ADJ-#### single row / GT-#### out+in pair). Recent tables read StockLedger
  filtered by txnType; item codes resolve via id maps (relation-less itemId);
  NO [id] view — documented deviation, same family as rework.
- **docNo is NOT unique on StockLedger** — never use resolveDocNo/nextNumber
  (findUnique throws on non-unique fields); count rows with startsWith prefix
  and increment (see nextAdjNo/nextTransferNo).
- **findUnique + nulls in a compound-unique key THROWS** in Prisma — and a
  `.catch(()=>null)` turns it into "always create" (the grn.ts FIX #3 bug,
  46 duplicate buckets; PITFALLS #23). Use findFirst with explicit nulls +
  update-by-row-id (the bumpStock pattern).
- **/api/upload de-collision**: same-name re-uploads get `-2`, `-3`… suffixes
  (append-only evidence, never overwrite). sanitizeFileName strips directories
  (traversal names land INSIDE upload/ under the bare basename — by design).
- **Fill with AI** (§10 minimal slice): every DocScreen New mode has a paperclip
  button that opens the agent panel seeded with a doc-creation prompt + order
  context; the panel's own paperclip uploads via /api/upload. The agent's
  approve flow is the commit door; proposal-INTO-form binding is M4 W5-full.
- **Invoice view reverse-computes gstRate/gstType** from the stored split
  (cgst+sgst vs igst) — the schema stores the split, not the input pair.
- **Payment views resolve the relation-less invoiceId separately** (PITFALLS #21
  pattern) and deep-link the invoice + order.

## M3 Wave C notes for future sessions

- **A new doc screen = config + 2 page files + LIVE_ROUTES entry** — nothing
  else. The generic actions (doc-actions.ts), DocScreen engine, pickers,
  recent-docs table and chain bar do the rest. Wave C added 11 screens with
  ZERO service/schema changes (ADR-001 held: pure config + pages).
- **View pages resolve id OR doc number** (programNo/poNo/grnNo/dcNo/cutNo/
  issueNo/rejNo). ProductionEntry has NO unique doc number — id-only lookup.
- **Prefill params**: `?order=` → orderNo, `?po=` → poNo, `?dcNo=` → dcNo
  (chain bar + Hub CTAs + jobwork Receive quick-links emit them). Pages read
  `searchParams` (a PROMISE in Next 16 — always `await`).
- **PO line item pickers are typed**: itemType cell → pickerFrom → the row's
  DocPicker slug (yarn/fabric/accessory). A blank itemType renders a plain
  text input with "type first" placeholder; zod then reports itemType missing.
- **production.lineId picker emits the db ID** (`pickerValueField: 'id'`) —
  the service stores the FK directly, unlike every other picker which emits
  a code the service resolves.
- **recent-docs.tsx** (DocBreadcrumb + RecentDocsTable) is a SERVER component
  (function props OK — never add 'use client' to it).
- **tsc known noise stays 30** — zero new-file errors after Wave C; the three
  relation-less FK traps are drift #11.
- **zod v4 quirk**: `z.array()` itself has `.unwrap()` (→ element) — when
  unwrapping optionals discriminate with `instanceof z.ZodOptional`, never
  duck-typing on `.unwrap` (cost 2 test iterations; see doc-configs.test.ts).
- **Jobwork receipt UX loop**: recent table on /jobwork/receipt carries a
  per-row "Receive" action (?dcNo= prefill); the DC view shows a "Receive
  this DC" CTA when status=sent; the Order Hub jobwork section adds the same
  quick-link. All three point at the same prefilled form door.

## M3 Wave B notes for future sessions

- **DocConfig is the ONLY thing a new doc screen needs**: config (fields mirror
  the shared schema) + page file + LIVE_ROUTES entry. The generic actions
  (`doc-actions.ts`) and DocScreen engine do the rest. Wave C = 13 configs +
  13 page files + registry entries.
- **The DocScreen flow**: edit → planDocAction (serializable plan review) →
  commitDocAction (re-plans + commits — same re-derivation as agent approve).
  NEVER cache the plan client-side; determinism is the contract.
- **`toScreenConfig()` strips service+schema** — client components receive the
  serializable subset only; server actions resolve the config by slug.
- **Picker value fields**: default = master codeField ?? titleField; use
  `pickerValueField` when the service resolves by a different field (colour/
  size by NAME). The API takes `valueField` as a query param.
- **Dynamic [id] routes in nav/parity/coming links** fall back to the module
  root (`getHref(item).split('/[id]')[0]`) — a literal `/orders/[id]` href
  crashes Next `<Link>` ("Dynamic href ... not supported" — caught by the
  /parity 500 during route smoke).
- **Order Hub supplementary queries**: JobworkOrder.orderId / PcsDespatch.orderId
  have NO reverse relation on Order (reconstructed schema) — queried separately
  by orderId; GRNs come via poLines.po.grns (only PO-linked GRNs are visible).
- **revalidatePath is wrapped in try/catch** in the doc actions — it throws
  outside a Next request scope (vitest), and revalidation must never fail a
  commit that already succeeded.
- **`resolveStageUrl`** (chain.ts, Wave B additive export) substitutes ids into
  `[id]` routes and keeps query params BEFORE the `#` anchor; falls back to the
  frozen stageFormUrl when the id is unknown. suggest_next_step's json now
  carries `nextFormUrl` (additive) and the agent panel renders an "Open form"
  button when a tool result json contains it.

## M3 Wave A notes for future sessions

- **Zero-logic-in-tools is now test-enforced**: doc-parity runs every op through
  BOTH doors; re-inlining logic into a tool breaks the ledger-signature equality.
- **Two latent bugs were fixed during extraction** (PO itemCode, GRN deptId:'' —
  see drift #7 / PITFALLS #18). The `receive_grn` service still does NOT use
  postLedger (inline StockLedger + dept-keyed CurrentStock buckets when deptCode
  given) — preserved legacy behaviour, not an oversight.
- `nextNumber`/`resolveDocNo` (pad-4 generic) now live in `numbering.ts`; tools
  with bespoke formats (SO-1001 unpadded, PO-Y-001 3-pad) keep their inline
  resolution in the service — do NOT "unify" them without an ADR (doc numbers
  are user-visible contract).
- `suggest_next_step` json gained additive fields (`state.order`, stage
  `formUrl`/`formParam` on pipeline/nextStep) — existing consumers unaffected.
  Wave B added `nextFormUrl` (§9.5) — json is additive-only, do not remove fields.

## M2 notes for future sessions

- Master CRUD flows: NEVER inline master logic again — configs + service only.
  New master entity = 1 config file + 1 index.ts entry (+ tools auto-generate via
  `masterCreateTool/masterUpdateTool` factories in tools.ts).
- The parity test loop (`master-parity.test.ts`) auto-covers new configs — extend
  `inputFor` when adding an entity.
- `buildMasterSchema(config, mode)` is the ONE schema source: agent tool schema +
  service validation + (form renders from the same config fields).
- FK inputs resolve by code-then-name; `fabric.diaValue` auto-creates Dia (ERRATUM 2);
  date-keyed entities (govt-holiday) need day-range lookups, never findUnique-on-string.
- Prisma DateTime filters REJECT bare date strings on SQLite ("premature end of
  input") — always `new Date(...)` first (see PITFALLS #13).

## Remote / git state

- Local `main` is the working branch; `agent/order-program-flow` was pushed to
  GitHub (github.com/mickey61295/fiberops) at an older tip — remote is STALE.
- History was cleaned with git-filter-repo (blobs >50MB stripped). Never re-add
  binaries from source-erp/.
- Push requires a FRESH PAT from the user each time (protocol in PITFALLS #8).
- Patches in `download/` (REGENERATED 2026-08-27 — the sandbox wiped download/
  a SECOND time; regeneration commands live in 0000-PATCH-INDEX.md):
  0005 (rollback4-recovery, 3f09291..cea63c8), 0006 (spec-m3-frozen),
  0007 (m3-wave-a-posting-engine), 0008 (m3-wave-b-order-family),
  0009 (m3-wave-c-chain-screens, 85d464e..335bbaa),
  0010 (m3-wave-d-accounts-inventory-ai, 335bbaa..44a6520 = m3-done).
  Patches 0001-0004 (order-program-flow,
  plan-2.0, m1-app-shell, m2-master-table) are LOST as patch files — their
  commits were eaten by rollback #4; the CONTENT survives in the tree and in
  0005's re-commit diff. download/ is gitignored — expect wipes; the INDEX is
  the recovery map.
- `.gitignore` now blocks the heavy untracked dirs (`/source-erp/`, `/workspace/`,
  `/download/`, `/upload/`, `/tool-results/`, `/.zscripts/`, `/mini-services/`,
  `/examples/`) so `git add -A` can never re-add legacy binaries (PITFALLS #6).
- Tags: `m2-done`, `spec-m3-frozen`, `m3-wave-a`, `m3-wave-b`, `m3-wave-c`,
  `m3-done` (Wave D: 7 accounts/inventory screens + 2 new tools + /api/upload).
  Before rollback #4: `m2-done` (re-created on the recovery commit — tree is
  M2-final), `rollback4-recovered`.
