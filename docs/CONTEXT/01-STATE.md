# 01 — STATE (Living Project State)

> Updated every commit. Numbers below are **claims**; `scripts/context_check.sh`
> is the **verifier**. On conflict: trust the script, fix this file, log drift in 03-PITFALLS.

Last verified: 2026-08-28 (session: m11 — the Feature-flags admin screen, SPEC-M9 §9-P1 item 2: `/admin/settings` NEW (server page + `FlagsAdmin` client board) — the LLD-07 operations surface over the 28-flag registry: 4 category cards (Tolerances & Deviations 21 / Commercial Switches 5 / Module Behaviour 1 / Company Config 1), per-flag effect notes + type chips + modified-vs-default badges, boolean Switches (immediate POST) + number/string inputs with explicit Save + per-flag reset-to-default, and a read-only "outside the registry" card for drift `flag:*` AppOption rows (setFlag rejects unknown names — drift-safe); two-layer guard same as /admin/users (layout GROUP rights → page ROLE: non-admins get the notice card, zero flag rows) · `POST /api/config` NEW (the set-password pattern: requireApiSession 401 → admin-role 403 → zod {name, value} → setFlag; unknown flag 400 `not in the registry`, non-finite number 400 — never 500; 200 {ok, flag:{value typed, stored, valueType, category, defaultValue}}); GET /api/config gains requireApiSession (zero in-repo consumers; guarded API family 5→7 = +M9 tracker +M11 config) · flags.ts setFlag message now carries "not in the registry" (drift-safe wording, registry count untouched 28-in/28-out) · menu item `feature-flags` (masters-admin, arch ST, phase M11, list_app_options read door; writes ride POST /api/config) + LIVE_ROUTES /admin/settings → menu 114→115, LIVEROUTES 146→147, all-live invariant holds · tests: flags-config.test.ts 14 NEW (registry shape: 28 defs/unique/enums/counts + route contract at handler level: 401 GET+POST/403 non-admin/400 empty+missing/400 unknown-flag drift-safe/400 NaN/200 boolean flip persisted typed/200 number persisted/GET reflects + 28 registry; afterAll restores touched flags) + menu-registry.test pins 114→115 (+M11 block: item/group/live/page files/findGroupForPath) → 724 vitest · scripts/route_smoke_m11.sh 32/32 (unauth 307 + 401×2, GET shape 28 flags + 28 registry + typed po_bud, page greps title/categories/data-flag/sidebar door, 400 unknown+bad-number+missing, flip-persist-restore po_bud + grn_dev 6.5 incl. the RELOADED screen carrying value="6.5", non-admin fixture with masters-admin group rights: 200 + "Admin role required" + zero flag-row leak + POST 403, fixture cleanup) + scripts/m11_smoke_fixture.ts (setup/cleanup) · context_check 398→410/410 NO DRIFT (menu 115, LIVEROUTES 147, menu tests 29, guarded 7/7, +6 m11 checks +6 files) · route_smoke_m9 38/38 regression · eval_routing --static PASS · tsc src/ 0 errors · next build EXIT 0 (dev server cycled: build needed the RAM; server+smoke run in one shell — the platform reaps spawned servers between tool calls) · browser-verified via agent-browser: 4 cards / 28 rows / 12 switches / 16 inputs, toggle round-trip (unchecked→checked→DB true→unchecked→DB false), Save 6.5→DB 6.5 + modified badge + Reset→DB 5, ZERO console errors, screenshot download/m11-flags-admin.png (VLM visual pass skipped: platform 429 throttle ×2 — DOM-level + functional verification stands) · docs: SPEC-M11 frozen, this STATE line, milestone row M11, next-actions #12) — (prior: m10 — the Agent quality pass)

## Milestone status

| Milestone | Scope | Status |
|---|---|---|
| M0 — Planning & context framework | deep dive + PLAN-2.0 + CONTEXT system | **DONE** |
| M1 — App shell & menu registry | real routes, sidebar from registry, parity tracker, coming-soo pages, approval inbox shell | **DONE** (original tag lost in rollback #4; milestone recorded in worklog + patch 0003) |
| M2 — MasterTable engine + masters | 24 master configs, shared master-service, form×agent parity, /admin/company | **DONE** (tag `m2-done`) |
| M3 — DocScreen engine + 15-stage chain forms + wiring W1/W3/W4 + PostingEngine extraction | 23 posting services + shared zod + DocScreen engine + 27 doc screens + Order Hub + pickers + /api/upload + 122 tools | **DONE** (tag `m3-done`; waves A→D in `specs/SPEC-M3.md` §14 — Wave D added invoice, debit-note, payment, journal, cost-sheet, stock-adjustment, godown-transfer + 2 new tools + /api/upload + AI-prefill button + ERRATUM 6 header typed picker) |
| M4 — RegisterScreen engine + registers + wiring W2/W6 | 17 register/board screens + shared read services + W2 drill-down/KPI links + W6 recon cards + Order Status Board | **DONE** (tag `m4-done`; Wave A engine+3 flagships → Wave B fleet 16 registers + 7 tools →130 → Wave C recon cards ×4 + Order Status Board `/orders/status` + KPI deep-links + route_smoke_waveE 19/19; 41/113 items live) |
| M5 — Extended doc families | 36 items: Wave A money/rates (7) → Wave B production/pcs variants (14) → Wave C approval kinds (4) → Wave D ADR-015 new models (11 items, 7 models 54→61 — ERRATA #3) → **159 tools**, 77/113 | **DONE** (tag `m5-done`; Wave A `m5-wave-a`: budget + invoice variants ×3 + supplier orders + rate/piece-rate registers → Wave B `m5-wave-b`: ProductionEntry family ×7 + panel variants + line-transfer + jobwork-pcs-return + costing-input + wages + wage-payments → Wave C `m5-wave-c`: approval-kinds registry + inbox ?kind= tabs + 3 posting hooks + 4 wrapper tools (146) + supplier-bills Bill-pass column → **Wave D `m5-wave-d`**: 7 ADR-015 models + sample/gate×2/packing/lab/expense DS + shift MT + roll-split (RSP pair) + contract-allotment (AL-) + program-allotment (ProgBalance write door) + production-bills (Journal wage bill) +13 tools → 159; 77/113 live, 16/17 groups, 393 vitest green, route_smoke_m5d 70/70) |
| M6 — Reports, MIS, admin, print | 36 items: Wave A report engine (4) → Wave B admin & dispatch tail + ADR-016 (5) → Wave C registers & lifecycle (9) → Wave D process tail & info panels (18) → **188 tools**, 113/113 | **COMPLETE** (`m6-wave-d`): Wave D — 10 DS variants (MP/MDC/PDC/RTN/OPN/PT/RTC/cutting-issue/cutting-production/line-output) + 4 manual-queue approval kinds + 2 MasterTables + 2 aliases; 113/113 live (100%), 598 vitest, route_smoke_m6d 60/60, context_check 310/310 |
| M7 — Auth & rights enforcement | Wave A login core (done) → Wave B API guarding + agent user context (done) → Wave C rights enforcement (UserGroup.rights menu filtering + per-route checks + admin password door) | **COMPLETE** (`m7-wave-c`): Wave A — ADR-017 + scrypt/HMAC zero-dep session + /login with first-admin bootstrap + edge middleware page guard + topbar user chip/logout + seed_admin; Wave B — 401-JSON guard on all 5 ERP API route files + AgentTurn.userId session stamping + approval actor (approvedBy = human email through the approve door) + cookie fixtures for HTTP scripts; Wave C — fo_rights signed cookie + middleware per-route pre-check + layout fresh layer-2 (sidebar filter + route re-check) + /admin/users PasswordAdmin + /api/auth/admin/set-password + /api/seed admin-only → 653 vitest, route_smoke_m7c 36/36; spec `spec-m7-frozen` |
| M8 — Hardening: doc-family print templates | Wave A: ONE PrintSheet engine + ONE `/print/[docType]/[id]` registry route + 5 fetchers (invoice/po/grn/payment/dc) + amount-in-words + print doors on the 5 view pages · Wave B: the remaining 15 doc detail families (fetchers-b.ts) + doors on all 14 remaining view pages — **EVERY doc detail page prints** | **COMPLETE** (`m8-wave-b`): Wave B — 15 fetchers (debit-note/journal/budget/cost-sheet/expense/cut-order/gate-entry+gate-pass/sample/pcs-despatch/packing-list/rejection/production-entry/line-issue/lab-test) with id-OR-doc-no resolution (id-only for budget/cost-sheet/production-entry — no unique doc-no field), gate type filter (IN entry ≠ gate pass), lab-test values-JSON → parameter rows, journal voucherType-driven titles; registry 5→20, doors on 19 files (gate-view shared); 691 vitest (673+18), route_smoke_m8b 38/38, context_check 369/369; tools 188, models 65, LIVEROUTES 145 |
| M9 — Live Operations Tracker (user-requested; REVISED parity-style) | ONE screen `/tracker` + ONE aggregation service (`tracker.ts`, two doors: screen + `get_live_activity` tool) + `/api/tracker` (requireApiSession, ?feedLimit 1..40) + menu item live-tracker (home group, always allowed) · **REVISED pre-commit per user clarification**: the parity scoreboard format as PRIMARY — summary stat tiles + 11 per-group cards × 17 family rows with total/today/latest/Active-Idle live status; activity feed + approvals/agent/system panels secondary | **COMPLETE** (`m9-wave-a`): board = TrackerFamilyRow/TrackerModuleGroup + MODULE_GROUPS ×11/17 families (stock board-only, docNo??txnType + ±qty meta; approvals today = created-today ≠ KPI decisions-today); UI = parity Stat tiles + Screen/Records/Today/Latest/Updated/Status tables + NEW row flash (15s, latestAt-advance) + ticking relative times; tool text + json carry modules; 699 vitest (tracker 7 incl. modules board), route_smoke_m9 38/38 (board greps + modules 11/17 + live-marker round-trip + restricted 200), context_check 385/385, build EXIT 0, browser-verified 0 console errors; tools 189, models 65, LIVEROUTES 146 |
| M10 — Agent quality pass | `src/lib/agent/prompt.ts` (PROMPT_VERSION `m10-2026-08-28` + SYSTEM_PROMPT restructured: 16-domain map, 7 heuristics, 8 few-shots over the 4 confusion pairs; ALL normative rules preserved) + route.ts stamps promptVersion on SSE start event + every AgentTurn row (schema gains `promptVersion String?`, additive) + agent-panel version chip + 37 weakest tool descriptions rewritten (registry floor ≥40 chars, tools stay 189) + `scripts/eval_routing.mjs` 50-prompt golden routing set (16 domains, both sides of each confusion pair; --static structural gate + full LLM mode ≥90%, never commits) | **COMPLETE** (`m10`): prompt.test 10 pins (version scheme, 16 domains, few-shot cap 8, confusion pairs, ingestion/chain/auto-number preservation, description floor); eval_routing static 50/50 + full mode ≥90% (report download/eval-routing-report.json); vitest 699+10, context_check 394/394 (PROMPT_VERSION check flipped to required), route_smoke_m7b/m9 regression green, build EXIT 0 |
| M11 — Feature-flags admin screen | `/admin/settings` (SPEC-M11: the LLD-07 operations surface — 28 registry flags, grouped toggles + effect notes + reset-to-default + modified badges + read-only drift rows) + `POST /api/config` (set-password pattern: 401/403/zod/setFlag → 400 unknown names, registry drift-safe; GET gains requireApiSession — guarded API family 5→7) + `FlagsAdmin` client board + menu item feature-flags (masters-admin) | **COMPLETE** (`m11`): flags-config.test 14 (registry shape 28/unique/enums + route contract at handler level) + menu-registry pins 114→115 (all-live invariant holds); route_smoke_m11 32/32 (unauth 307/401×2, GET shape 28+28, page greps, 400 drift-safe/bad-number/missing, flip-persist-restore ×2 incl. reloaded-screen value, non-admin-with-group-rights notice + 403 + zero flag-row leak); vitest 724, context_check 410/410 (menu 115, LIVEROUTES 147, guarded 7/7), build EXIT 0; browser-verified (4 cards/28 rows/12 switches/16 inputs, toggle + Save + Reset round-trips live-persisted, ZERO console errors, screenshot download/m11-flags-admin.png) |

## Ground truth (verified by context_check.sh)

| Metric | Value | How to verify |
|---|---|---|
| Git HEAD | M11 commit (feature-flags admin screen — M11 COMPLETE) — tags `m11`, `m10`, prior `m9-wave-a`, `m8-wave-b`, `m6-wave-d`, `m7-wave-c`, `spec-m7-frozen`, `schema-65-baseline`; **remote = local (PAT configured; push after EVERY commit)** | `git rev-parse --short HEAD` |
| Agent tools | **189** (78 inline incl. M9 get_live_activity + 30 factory create + 30 factory update + 51 docTool delegates; M10 description audit changed text only — count unchanged) | `scripts/context_check.sh` |
| Prisma models | **65** (61 + ADR-016 ×4: UserGroup, AppOption, Hsn, TestParameter; User AMENDED with userGroupId + active — ERRATUM #1; **M7-A ADR-017: User +passwordHash String? +lastLoginAt DateTime? — FIELD-additive, still 65 models**) | `grep -c "^model " prisma/schema.prisma` |
| Shared zod schemas (M3-A/D + M5-A/B/D + M6-D variants) | **39 files** in `src/lib/erp/schemas/` (verbatim tool contracts + M5-D families + M6-D dispatch/transfer/inventory/payment variants) | context_check |
| Posting services (M3-A/D + M5-A/B/D + M6) | **35 files** in `src/lib/erp/posting/` (op services + ledger.ts + types.ts + master-service.ts + M5-D families + M6-B/M6-D additions) | context_check |
| Chain definition (M3-A) | `src/lib/erp/chain.ts` — 15 stages, nextStage/computeChainState/stageFormUrl + resolveStageUrl (Wave B, id-aware) (ADR-007 single source; PIPELINE deleted from tools.ts) | context_check |
| tools.ts size | 2805 → 1693 lines (all 21 SPEC-M3 §5 write ops thin delegates; suggest_next_step gained nextFormUrl) | `wc -l` |
| Doc configs (M6-D) | **57 configs in 40 files** (M3 19 + M5-A 5 + M5-B 13 + M5-D 10 + M6-B 2 + M6-D 10: multi-process-grn, dc-return, dc-entry, process-dc, pcs-transfer, ready-to-cut, opening-stock, cutting-issue, cutting-production, line-output) in `src/lib/erp/doc-configs/` | context_check |
| DocScreen engine (M3-B) | `src/components/archetypes/doc-screen.tsx` — New (header grid + line editor + totals + review + commit) / View modes, config-driven | context_check |
| Wiring (M3-B/C/D) | W1 chain bar (`chain-bar.tsx`, every DocScreen + Hub) · W3 Order Hub (`/orders/[id]`, 12 family sections + rollups; **Wave C: every family row links its doc view + context-aware section CTAs + sent-DC "Receive" quick-link**) · W4 pickers (`doc-picker.tsx` incl. TYPED line picker `pickerFrom` — PO itemCode ← itemType cell) · nextFormUrl + agent "Open form" · ?order/?po/?dcNo/?invoice prefill on all 19 New screens · **Wave D: accounts/inventory rows link their views in the Hub + Fill-with-AI button on every DocScreen** | context_check + route smoke |
| Master configs | **30** (24 M2 + shift M5-D + 5 ADR-016 M6-B: user, user-group, app-option, hsn, test-parameter) | context_check + `tests/unit/master-configs.test.ts` |
| ERP view/shell components | **25** (23 + M6-C lifecycle-form.tsx + M6-D approval-queue.tsx) | `ls src/components/erp/*.tsx \| wc -l` |
| Archetype engines | **4** (`master-table.tsx` + `doc-screen.tsx` + `register-screen.tsx` + M6-A `report-screen.tsx`) | context_check |
| Menu registry | **115** items (113 parity + live-tracker M9 + feature-flags M11) · 17 groups | `tests/unit/menu-registry.test.ts` |
| Live routes | **147**: M6-D 145 + M9 /tracker + M11 /admin/settings (all-live invariant holds) | LIVE_ROUTES in `src/lib/erp/menu-registry.ts` |
| RegisterScreen engine (M4-A) | `src/components/archetypes/register-screen.tsx` (server: breadcrumb, filter bar, summary, totals band, W2 hrefs, pagination, CSV link) + `register-filter-bar.tsx` (client: pushes shareable searchParams; party/godown datalist via master_search) | context_check |
| `src/lib/erp/report-configs/` + `src/lib/erp/reports/` + `src/components/archetypes/report-screen.tsx` + `src/components/erp/print-button.tsx` | **M6-A: the RH archetype** — 28 pure-data report configs (6 packs; filters/columns reuse register types) + REPORT_SERVICES (15 register bindings via bind() + 13 new aggregates in core-reports.ts/chain-money-reports.ts) + report-csv.ts (makeReportCsvRouteHandler + getPrintHeader — degrades to null until ADR-016 Wave B) + ReportScreen engine (param form + print header/copy banner + CSV + pagination) + PrintButton (Original/Duplicate/Triplicate → ?copy=) |
| Order Status Board (M4-C) | `/orders/status` — server component over queryOrderStatus (registers/order-status.ts): header KPIs (open orders/pcs/avg stages), per-row 15-dot ChainBar (flags shipped on the row), n/15 chip + next-stage chip, row → Order Hub; NOT a RegisterScreen (§10) | route_smoke_waveE.sh |
| Wiring (M4-C) | W2: register rows drill into doc views (TXN_DOC_FAMILY + resolveDocRef; every family href test-pinned) · W6: ReconCard on PO view (PO↔GRNs), invoice view (Invoice↔Payments), jobwork view (out↔in), Order Hub despatch section (Despatch↔Invoice) — math in registers/recon.ts, test-asserted · §8.3 KPI deep-links on the dashboard tiles (Open Orders→/orders/register?status=open, Pending POs→/procurement/party-balance, Stock Value→/inventory (ERRATUM: /inventory/stock was never a route), Today Pcs→/production/register?from&to, Pending Approvals→/approvals, Open Invoices→/accounts/bills-register?status=issued) | route_smoke_waveE.sh 19/19 |
| Register configs/services (M6-C) | **21 configs** in `src/lib/erp/register-configs/` + **21 service files** in `src/lib/erp/registers/` (21 REGISTER_SERVICES entries — slug bijection test-enforced — + order-status.ts + recon.ts; M5-B adds production-wages/wages.ts) + resolve.ts (parseRegisterQuery + TXN_DOC_FAMILY + resolveDocRef + buildItemCodeMaps (pcs→style.styleNo)) + csv.ts (makeCsvRouteHandler) | context_check |
| Parity (M6-D — MISSION COMPLETE) | **113/113 items live (100%)** · **17/17 groups** (+multi-process-grn, grn-acceptance, opening-stock, cutting-issue, ready-to-cut, cutting-production, cutting-ack, pcs-receipt, pcs-grn-acceptance, pcs-transfer, line-output, dc-entry, process-dc, dc-return, lot-approval, hsn-gst-setup, employees, test-parameters) · legacy coverage via /parity | `/parity` page or `parityStats()` |
| E2E pipeline tests | 15, all passing | `npx vitest run` |
| Doc form↔agent parity tests (M3-A/D) | **21 tests** (20 ops × both doors + full-chain ledger signature equality + Wave D 2 new tools) | `npx vitest run` |
| Doc-config contract + form-door tests (M3-B/C/D) | **40 tests** (§7 contracts incl. EVERY-config schema-mirror loop + coercion + Wave B/C action-composition integration) | `npx vitest run` |
| Registry unit tests | 22 (M5 Wave D: +1 Wave-D live block) | `npx vitest run` |
| Register-config contract tests (M4-B) | **runtime via 19-config loop** (27 source its; per-config loop: columns/filters/agentTools/route+page+csv/askPrompt + bijection + parse + tool-shape pins incl. M5-B tools + service smokes incl. wages) | `npx vitest run` |
| Register services math suite (M4-B/C) | **26 tests** (`tests/pipeline/register-services.test.ts`): seeded fixture chain asserts §5 math (inhand pending, daily totals == ledger sums, party-balance, bills outstanding, party-ledger balance, io-history running balance, production-status, budget-vs-actual, approval-audit, order-status done-count, lots, pcs-stock) + W6 recon math (poRecon/invoiceRecon/jobworkRecon/despatchRecon) + delegated-tool regression pins; surgical TS-tagged cleanup (doc-parity pattern) | `npx vitest run` |
| **Total vitest** | **653 passing** (620 M6/M7-A/B + 33 M7-C: rights 20 — token round-trip/tamper/garbage/expired/malformed + computeAllowedGroupIds matrix (admin bypass, null/[] = all, subset ∪ home, unknown dropped) + firstAllowedLandingRoute + edge purity; set-password-route 11 — 401/403/400-zod ×4/404/set-verifies/clear-null/set-own-ok/clear-self-400; api-guard +1 — group-rights snapshot; menu-registry +1 — findGroupForPath resolver) | `npx vitest run` |
| Master config contract tests | 8 | `npx vitest run` |
| Master form×agent parity tests | 7 blocks → 78 tests at runtime (loop over all 25 configs — shift joined in M5-D) | `npx vitest run` |
| MAX_STEPS (agent loop) | 12 | grep in `src/app/api/agent/route.ts` |
| API routes | `/api/agent`, `/api/agent/approve`, `/api/erp`, `/api/seed`, `/api/upload` (Wave D §12 rebuild), `/api/route.ts` + `/api/auth/login`, `/api/auth/logout`, `/api/auth/session`, `/api/auth/bootstrap`, `/api/auth/admin/set-password` — **M7-B: the 5 ERP route files are SESSION-GUARDED (requireApiSession → 401 JSON; /api/auth/* deliberately open; /api/config left open — server-side FlagsProvider, no client fetchers); M7-C: /api/seed additionally ADMIN-ONLY (403) + /api/auth/admin/set-password admin-role door (403 non-admin)** | ls `src/app/api/` |
| Auth (M7-A) | Login core live: session cookie `fo_session` (HMAC-SHA256, Web Crypto, edge-safe `src/lib/auth/session.ts`; secret = `AUTH_SECRET` env w/ dev fallback — ADR-017) · scrypt passwords `src/lib/auth/password.ts` · edge page guard `src/middleware.ts` (307 → /login?next=; matcher excludes /api, /login, _next, dotted) · second guard in `(erp)/layout.tsx` (deleted/deactivated mid-session → /login) · topbar user chip + logout · first-admin bootstrap locks 403 forever once any password exists · dev credentials `admin@fiberpro.local` / `admin123` (scripts/seed_admin.ts) | route_smoke_m7a.sh |
| Auth (M7-B) | API guard `src/lib/auth/api-guard.ts` (requireApiSession → 401 `{"error":"Authentication required"}`; Node-only reuses getSessionUser) applied to erp/agent/agent-approve/upload/seed · AgentTurn.userId = session user id · approval actor: `AgentTool.execute(args, actor?)` optional 2nd param — approve_pending + 8 gate wrappers stamp `approvedBy = actor.email ?? 'agent'`; approve route scopes its updateMany to the actor · cookie fixture `scripts/lib/api-auth.mjs` (login → Cookie header) for test_ingest/eval_ingest/test_money_loop · agent-panel redirects to /login on 401 | route_smoke_m7b.sh |
| Auth (M7-C) | **Rights enforcement live (ADR-018)**: edge-safe `src/lib/auth/rights.ts` — signed `fo_rights` cookie ({role,rights} snapshot, HMAC AUTH_SECRET, 7d) + `computeAllowedGroupIds` (admin OR no-group OR [] → all; else listed ∩ valid ∪ {'home'}) + `firstAllowedLandingRoute` (deny target '/'; home always allowed → no redirect loops) · login/bootstrap set both cookies (`login-cookies.ts`) · middleware per-route pre-check via `findGroupForPath` (307 first-allowed when denied; missing/stale cookie → skip pre-check) + stamps `x-pathname` · layout FRESH layer-2: DB rights per full load → NavSidebar filtered + route re-checked (mid-session revocation works; newly granted menus need re-login) · `/admin/users` PasswordAdmin card + `POST /api/auth/admin/set-password` (set/clear; clear-self 400) · meta pages (/parity, /coming) open to any authed user | route_smoke_m7c.sh |

## Known drift / gaps

1. **RESOLVED in M10**: `PROMPT_VERSION` now EXISTS — as `m10-2026-08-28` in
   `src/lib/agent/prompt.ts` (NOT route.ts — App-Router route files may not
   export arbitrary constants; the module split is the C1 contract). The old
   phantom `v5-2026-08-26` claim stays historical: this is a NEW version
   lineage (`m<milestone>.<rev>-YYYY-MM-DD`), not a restoration. Any semantic
   prompt change bumps the constant and REQUIRES a full
   `node scripts/eval_routing.mjs` run (≥90% gate).
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
6. **tsc noise is now scripts/tests-only** (2026-08-28 session — see PITFALLS #33):
   `src/` is 100% CLEAN (0 errors). The 54-world orphans were resolved —
   `flags.ts` REWIRED to AppOption storage (key `flag:<name>`, group 'flags' —
   fixes the live `/api/config` 500; the LLD 07 FlagsProvider contract is
   preserved, signatures unchanged, tolerance.ts unaffected);
   `exposure.ts` + `cumrate.ts` DELETED (dead code — zero importers, referenced
   the removed Bill/BillPass/prs models; lineage stays documented in PITFALLS
   #16 + git history). REMAINING noise (do not chase): Phase-3/4 seed/cleanup
   scripts (`seed_commercial`, `seed_stages`, `cleanup_e2e_bills`,
   `cleanup_stale_t3`, `verify_money_loop`), plus the old known noise
   (vitest.config poolOptions, skills/, tests/ narrowing). Full list in
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

1. **M6 Wave A DONE** (tag `m6-wave-a`): SPEC-M6 frozen (`spec-m6-frozen`);
   ReportScreen archetype + 28-report registry + render_report → 160 tools,
   81/113 live, 17/17 groups, 549 vitest, route_smoke_m6a 67/67,
   context_check 250/250. **Push after EVERY commit** (standing user
   instruction, PAT configured in the remote).
2. **M6 Wave B DONE** (tag `m6-wave-b`): ADR-016 landed (UserGroup,
   AppOption, Hsn, TestParameter; User amended — ERRATUM #1) + masters
   25→30 + the 3 admin screens + courier-dc/loading variants. 177 tools,
   86/113 live, 565 vitest, route_smoke_m6b 28/28, context_check 265/265.
3. **M6 Wave C — registers & lifecycle (9 items, SPEC-M6 §7-C)**:
   order-enquiry + employees (aliases — wait, employees alias is Wave D) —
   Wave C list: order-enquiry (ALIAS of order-register), program-status (RG,
   extract get_program_status body into registers/program-status.ts),
   stock-view (RG over fetchCurrentStock), line-status (WIP board page),
   order-amendments (DocScreen over planOrderAmend — extract update_order
   inline logic to posting/order-amend.ts), order-close / program-cancel /
   program-complete / po-cancel-complete (+4 tools: close_order,
   cancel_program, complete_program, complete_purchase_order) → 181 tools;
   parity 86→95.
4. **M6 Wave D DONE — 113/113 M6 COMPLETE** (tag `m6-wave-d`): the 18-item
   process tail (10 DS variants + 4 manual-queue approval kinds + 2
   MasterTables + 2 aliases). 188 tools, 598 vitest, route_smoke_m6d 60/60,
   context_check 310/310. THE PARITY MISSION IS COMPLETE — every one of the
   113 legacy menu items renders. M7+ candidates: auth/login (SPEC-M6 §3-1),
   rights-based route guarding (§3-2), Tally export (§3-3).
5. **M7 Wave A DONE** (tag `m7-wave-a`, spec `spec-m7-frozen`): the login
   core — ADR-017 (User +passwordHash/+lastLoginAt, field-additive;
   `schema-65-baseline` tagged first), zero-dep auth (scrypt + HMAC-SHA256
   Web-Crypto session cookie, edge-safe session.ts), /login with first-admin
   bootstrap (self-locking 403), 4 /api/auth/* routes, edge middleware page
   guard, topbar user chip + logout, seed_admin.ts. 609 vitest, smoke 27/27,
   context_check 327/327.
6. **M7 Wave B DONE** (tag `m7-wave-b`): API guarding + agent user context.
   requireApiSession 401-JSON guard on /api/erp, /api/agent, /api/agent/approve,
   /api/upload, /api/seed; AgentTurn.userId = session user; approval actor
   stamped through the human approve door (approve_pending + 8 gate wrappers);
   cookie fixture scripts/lib/api-auth.mjs for the 3 HTTP .mjs scripts;
   agent-panel 401 → /login. 620 vitest, route_smoke_m7b 25/25, context_check
   335/335.
7. **M7 Wave C DONE — M7 COMPLETE** (tag `m7-wave-c`): rights enforcement
   (ADR-018). Edge-safe rights.ts (signed fo_rights cookie + the ONE
   computeAllowedGroupIds rule: admin/no-group/[] = all, else listed ∩ valid
   ∪ home); login+bootstrap set both cookies (login-cookies.ts); middleware
   per-route pre-check (findGroupForPath) + x-pathname stamp; layout FRESH
   layer-2 (sidebar filter + route re-check — mid-session revocation works);
   /admin/users PasswordAdmin + /api/auth/admin/set-password;
   /api/seed admin-only; deactivated → 307 /login verified. 653 vitest,
   route_smoke_m7c 36/36, context_check 347/347.
8. **M8 Wave A DONE** (tag `m8-wave-a`, spec `SPEC-M8`): doc-family print
   templates — PrintSheet engine + `/print/[docType]/[id]` registry route +
   5 fetchers (invoice/po/grn/payment/dc) + Indian amount-in-words + print
   doors on the 5 view pages. 673 vitest, route_smoke_m8a 16/16,
   context_check 363/363.
9. **M8 Wave B DONE — M8 COMPLETE** (tag `m8-wave-b`): the remaining 15 doc
   detail families print — `fetchers-b.ts` ×15 + PRINT_DOCS registry 5→20 +
   doors on all 14 remaining view pages (gate-view shared by the two gate
   routes → 19 files). id-only resolution for budget/cost-sheet/
   production-entry (no unique doc-no field); gate-entry/gate-pass filter by
   gateType (§4 rule-2 — an IN entry 404s under the gate-pass docType);
   lab-test values-JSON → parameter rows; journal voucherType-driven titles.
   691 vitest (673+18), route_smoke_m8b 38/38 (seeds+cleans debit-note/
   budget fixtures when those tables are empty), context_check 369/369.
   **Next candidates**: E2E hardening over the route surface, agent prompt
   polish over the 188-tool registry, /admin/settings flags UI over the
   repaired /api/config; multi-company/finyear chain stays deferred
   (SPEC-M7 §2); Tally export stays SKIP unless demanded.
10. **M9 DONE** (tag `m9-wave-a`): the Live Operations Tracker — REVISED
   mid-flight to the user-clarified **parity-style format** ("something like
   the legacy parity tracker"): SPEC-M9 §4-B module board (11 groups / 17
   families, stock board-only) + §5 v2 (summary Stat tiles + per-group
   Screen/Records/Today/Latest/Updated/Status tables, NEW row flash) with the
   Wave-A feed/approvals/agent/system panels secondary; get_live_activity
   (tools 189) gains screens-active + busiest-families; menu 114 items,
   LIVEROUTES 146. 699 vitest, route_smoke_m9 38/38, context_check 385/385,
   build EXIT 0, browser-verified.
11. **M10 DONE** (SPEC-M10): the Agent quality pass — PROMPT_VERSION
   `m10-2026-08-28` in `src/lib/agent/prompt.ts` (16-domain map + 7
   heuristics + 8 few-shots over the 4 confusion pairs; all normative rules
   preserved), stamped on SSE start + every AgentTurn (schema column,
   additive), agent-panel version chip; 37 weakest tool descriptions
   rewritten (floor ≥40 chars, tools stay 189); `scripts/eval_routing.mjs`
   50-prompt golden routing set (16 domains; --static every session + full
   ≥90% gate on every PROMPT_VERSION change — session-end protocol step 1b);
   prompt.test 10 pins → 709 vitest; context_check 398/398. **Next
   candidates (SPEC-M9 §9 frozen roadmap — pick top-down)**: M11
   /admin/settings flags UI (28 flags over /api/config, the set-password
   admin pattern) → M12 Playwright E2E golden paths (8 specs); then P2 (M13
   notifications digest, M14 perf indexes+pagination+SSE, M15 engine-level
   audit trail, M16 role dashboards). The tracker SSE upgrade + createdAt
   indexes live in M14.
12. **M11 DONE** (tag `m11`): the Feature-flags admin screen —
   `/admin/settings` + `FlagsAdmin` (4 category cards × 28 registry flags:
   toggles/effect notes/modified badges/reset-to-default/read-only drift
   rows) over a new admin-only `POST /api/config` → setFlag (401/403/400
   drift-safe; GET guarded too — API family 7/7); menu item feature-flags
   (menu 115, LIVEROUTES 147, all-live holds). 724 vitest (flags-config 14 +
   menu pins), route_smoke_m11 32/32 (incl. non-admin-with-group-rights
   notice + 403), context_check 410/410, build EXIT 0, browser-verified 0
   console errors (toggle/Save/Reset round-trips live-persisted).
   **Next candidates (SPEC-M9 §9 frozen roadmap — pick top-down)**: M12
   Playwright E2E golden paths (8 specs: login, order create form, order
   create agent, PO→GRN, invoice→payment, approval approve, print door,
   rights denial; curl smokes stay as cheap gates); then P2 (M13
   notifications digest, M14 perf indexes+pagination+SSE, M15 engine-level
   audit trail, M16 role dashboards).

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

## M6 Wave A notes for future sessions

- **The report layer is the registers' twin, not a fork**: REPORT_SERVICES
  binds 15 reports to the SAME register service functions (`bind()` throws at
  import if a binding is missing) — the contract test asserts
  `REPORT_SERVICES[slug] === REGISTER_SERVICES[slug]` for every bound slug.
  New aggregates live in `reports/core-reports.ts` (8) and
  `reports/chain-money-reports.ts` (5). Adding a report = config + (service)
  + ERRATA append to SPEC-M6 §4 (never silent — the 28-slug set is pinned).
- **Report runner is ONE dynamic route** `/reports/[slug]` + ONE csv route
  `/reports/[slug]/csv` (no 28 route copies). Unknown slug → 404. LIVE_ROUTES
  carries the literal `/reports/[slug]`.
- **PcsDespatch/Sample/Expense relation-less FK columns** (drift #11 lineage)
  bit AGAIN in the report services: buyer/order names resolve via batched
  id-maps (chain-money-reports.ts despatch-packing, core-reports.ts expenses
  + samples). Never `include:` on those.
- **Fixture isolation for aggregate tests** (report-services.test.ts): period
  totals (daily-pnl expenses band, gst month rows) see ALL rows — seed
  fixtures in a unique window (2024-02) and/or unique rates (gst 1.25+1.25)
  so other data can never merge into the asserted row. The outstanding
  summary needed the party filter applied to the GRN query too (AR and AP
  both narrow, totals included).
- **getPrintHeader()** reads AppOption print.* keys but catches everything —
  the table does not exist until ADR-016 (Wave B). It returns null → the
  print header falls back to 'FiberOps'. Wave B wires it for real.
- **The dev server died mid-session again** (port 3000 stopped listening
  after ~40 min idle — not a code crash): restart with
  `nohup npx next dev -p 3000 > dev.log 2>&1 &`.

## M6 Wave B notes for future sessions

- **ADR-016 ERRATUM #1 (SPEC-M6 §13)**: the schema ALREADY had a Phase-1
  `User` model (email/name/role; AgentTurn.userId is a plain string, not an
  FK). ADR-016 amended it (userGroupId + active added additively; login ≡
  email) and added FOUR new models (UserGroup, AppOption, Hsn,
  TestParameter) → 61→65, not 66. `schema-61-baseline` tag marks the
  pre-migration schema.
- **Rights are a LIST FIELD on user-group** (not a form-less Json blob): the
  /admin/menu-rights matrix and the update_user_group agent tool share the
  SAME master-service door (saveMenuRightsAction → planMasterUpdate). [] =
  all menus; the matrix collapses every-checked to [] automatically.
- **user-group FK mapping**: master-service gained FK_COLUMN_OVERRIDES /
  DISPLAY_KEYS / RELATION_OVERRIDES entries for the hyphenated slug
  ('user-group' → userGroupId / userGroupName / userGroup) — the default
  `${refEntity}Id` would produce 'user-groupId'.
- **Despatch variants inject `mode`**: DESPATCH_SCHEMA gained
  mode: despatch|courier|loading; planPcsDespatch validates courierName for
  courier, and loading gets the LAD-#### space + initial status 'loading'
  (ledger posts identically). The base despatch config renders mode as a
  readonly field (the schema-mirror contract test requires every schema key
  in headerFields — same rule that gave gate its readonly gateType).
- **Tool count 177, not 172**: the master-configs contract test requires a
  LIST tool per config, so Wave B landed +5 list tools (list_users,
  list_user_groups, list_app_options, list_hsns, list_test_parameters) and
  pulled the hsn/test-parameter factories forward from Wave D (+4). Final
  M6 target: 188 (was 183 — ERRATA #2 when Wave D lands).
- **DocFormPayload shape**: commitDocAction takes
  `{ header: {string values}, lines: [{string cells}] }` — a flat object
  with arrays breaks coerceCell (raw.trim is not a function). The m6b
  parity test uses the correct shape.

## M6 Wave C notes for future sessions

- **Lifecycle guards live in the SERVICE** (posting/lifecycle.ts): close_order
  (≥95% despatched + invoiced), cancel_program (ledger net-zero), complete
  program (balance ≤ 0), planPoLifecycle (receipt-aware; cancel DELEGATES to
  planCancelPo — one cancel service). Both doors enforce identically.
- **update_order was extracted to planOrderAmend** (posting/order-amend.ts):
  the /orders/amendments DocScreen and the update_order tool share it; the
  tool's json contract is frozen by test.
- **Aliases are 3-line re-exports** only when the target page is
  searchParams-driven (/orders/enquiry ← order-register). Param-driven pages
  (/masters/[entity]) need a thin pinned-entity page instead (/hr/employees).
- **The report current-stock aggregate was DELETED and rebound via bind()**
  when the stock-view register landed — never fork a read path.

## M6 Wave D notes for future sessions

- **THE PARITY MISSION IS COMPLETE: 113/113, 17/17 groups.** Every legacy
  menu item renders; `parityStats().comingItems === 0`.
- **Wave D ERRATA (SPEC-M6 §13 #2-#4)**: (a) tool count 188, not 183 (Wave B
  pulled the hsn/test-param factories + 5 list tools forward); (b) the frozen
  agentTools chips for multi-process-grn/dc-return name receive_grn and for
  pcs-transfer name transfer_stock — those tools CANNOT emit the variant rows
  (receive_grn is PO-based single-line; transfer_stock rejects itemType
  'pcs'); the FORM door (commitDocAction) is the variant path and doc-parity
  asserts form ≡ service; (c) create_line_issue has no deptCode param — the
  cutting-issue wrapper validates line.deptId === D3 instead.
- **The virtual cutting dept is a DEPT-KEYED CurrentStock bucket** (the
  planGrn precedent), NOT a new godown: planReadyToCut posts
  ready_to_cut_out via postLedger (null-dept bucket −) + ready_to_cut_in
  with a DIRECT stockLedger.create + bumpStock(deptId=D3) (postLedger forces
  null-dept buckets by the ADR-004 rule — the sanctioned exception). Total
  godown stock unchanged; the D3 row IS the cutting pool.
- **The 4 Wave D approval kinds are MANUAL-QUEUE** (`manual: true` on
  ApprovalKind): no posting hook raises them. The IN screens pair the
  kind-filtered WorkflowView with ApprovalQueue cards calling
  sendToAcceptanceAction (src/lib/erp/approval-queue.ts, 'use server',
  idempotent, revalidatePath guarded for vitest). The accept doors are the 4
  proposeApprovalGate wrappers (find-or-create + approve, idempotent) — the
  queue button and the tool interleave safely.
- **ONE create_dc tool serves BOTH DC doors**: MATERIAL_DC_SCHEMA (the tool)
  accepts single-material keys OR lines[]; the per-SCREEN schemas are
  DC_ENTRY_SCHEMA (omit lines) / PROCESS_DC_SCHEMA (lines required) because
  the doc-configs schema-mirror test requires config fields ≡ schema keys.
  MDC-#### when single, PDC-#### when lines present — never the despatch
  DC- space.
- **MP/RTN GRNs and MDC/PDC DCs post REAL ledger rows**: process_delivery
  OUT per line (material to a processor — the jobwork-pcs-return direction)
  for MP + DCs; process_receipt IN per line for RTN (material back). GRN.docNo
  carries the returned-against DC ref; partyDcRef carries the note.
- **pcs-transfer keys itemId = the ORDER id** (pcs buckets have no item
  master) — planPcsTransfer is a transfer.ts sibling, not a planTransfer
  call.
- **Tool-count pins live in**: register-configs.test.ts + approval-kinds.test
  (both 188 now). The docTool grep counts only `^  docTool(` calls — the 4
  approval gates are inline tools (51 docTools + they bring inline 72).

## M7 Wave A notes for future sessions

- **session.ts is EDGE-PURE by test** (`tests/unit/auth.test.ts` edge-purity
  block): it must never import node:crypto, @prisma/client, or @/lib/db —
  middleware runs on the edge runtime and imports it. The Node-only half
  (cookies() + db lookup) lives in `src/lib/auth/current-user.ts`.
- **Two guard layers**: middleware verifies the cookie cryptographically
  (307 → /login?next=); `(erp)/layout.tsx` re-checks the user ROW (deleted /
  deactivated mid-session → redirect). Do not remove either.
- **APIs are still OPEN in Wave A** (deliberate — SPEC-M7 §2): /api/erp,
  /api/agent, /api/upload accept cookie-less requests so the 609 vitest +
  ingest scripts stay green. Wave B adds 401 JSON + cookie fixtures.
- **Bootstrap self-locks**: /api/auth/bootstrap works ONLY while zero users
  have a passwordHash; the moment one exists it 403s forever. Dev credentials
  come from `scripts/seed_admin.ts` (admin@fiberpro.local / admin123 —
  override via arg or ADMIN_PASSWORD). Running the seed CLOSES bootstrap.
- **AUTH_SECRET**: env var with dev fallback constant (single-tenant dev —
  ADR-017). Setting it in production rotates all sessions (tokens are
  HMAC'd with it); no migration needed — users just log in again.
- **middleware matcher** excludes /api, /login, _next/* and any dotted path
  (`.*\..*`). Adding API guarding in Wave B means either changing the matcher
  or guarding inside each route (prefer the latter: 401 JSON ≠ redirect).

## M7 Wave B notes for future sessions

- **API guarding is INSIDE the route handlers, not middleware** (per the Wave A
  note): `src/lib/auth/api-guard.ts` `requireApiSession()` → 401 JSON
  `{"error":"Authentication required"}` — browsers send fo_session same-origin
  automatically, so no client fetch needed changing (only the 401 UX:
  agent-panel now redirects to /login). Guarded: erp, agent, agent/approve,
  upload (GET+POST), seed. Deliberately OPEN: /api/auth/* (the login door),
  /api/config (server-side FlagsProvider — zero client fetchers).
- **/api/seed was guarded beyond the frozen spec list** (erp|agent|upload):
  an unauthenticated route that shells out to child_process is unacceptable.
  Zero in-app callers (the dev workflow runs seed.ts directly; no test or
  smoke POSTs there) — documented deviation, defense-in-depth.
- **The actor contract**: `AgentTool.execute(args, actor?)` — optional second
  parameter, invisible to the ~175 tools that ignore it. Only the
  approval-committing tools consume it: approve_pending + the 8
  proposeApprovalGate wrappers stamp `approvedBy = actor.email ?? 'agent'`
  (plan AND commit agree). requestedBy stays 'agent' — the AGENT proposes,
  the HUMAN approves; that split is the audit semantics.
- **AgentTurn.userId** is now the session user's id (was hardcoded 'admin');
  old rows keep 'admin'. The approve route's updateMany is SCOPED to the
  actor's userId (pre-M7B it marked every pending turn globally approved).
- **Cookie fixtures**: scripts hitting guarded APIs must login first —
  `scripts/lib/api-auth.mjs` `login(base)` → `{ cookie, user }`; attach
  `Cookie: fo_session=…` to every fetch (Node fetch does NOT jar cookies).
  Wired: test_ingest.mjs, eval_ingest.mjs, test_money_loop.mjs. Historical
  route_smoke_m5*/waveD/waveE scripts that hit APIs cookie-less are ERA
  artifacts — superseded by route_smoke_m7b.sh, do not "fix" them.
- **Latent bug fixed in passing**: agent-panel's upload handler checked
  `data.success` but the SPEC-M3 §12 route returns `{ ok: true, … }` — the
  paperclip attach toast/flow never fired. Now checks `data.ok`.
- **vitest db-fixture pattern** (api-guard/agent-actor/upload-route): mock
  `next/headers` cookies with `vi.hoisted` cookieStore + create a real user
  row + `createSessionToken(userId)` — the guard's second layer (db lookup)
  is exercised for real. One early flaky parallel run was observed before the
  final green x4 streak; if a one-off failure appears, re-run before
  debugging (SQLite + parallel workers occasionally contend).
- **route_smoke_m7b fixture**: `scripts/m7b_smoke_fixture.ts setup|verify`
  (GRN-001 grn_acceptance cleanup + actor assertion) — setup deletes stale
  rows so re-runs hit the find-or-create path; verify asserts
  approvedBy=admin@fiberpro.local AND requestedBy=agent.

## M7 Wave C notes for future sessions

- **The two-layer rights pattern mirrors the two-layer auth pattern**: the
  EDGE middleware pre-filters routes using the signed `fo_rights` cookie
  (cheap, no db, covers soft navigations because middleware runs on every
  RSC fetch); the `(erp)/layout.tsx` re-derives allowed groups FRESH from the
  DB on every full load and BOTH filters the NavSidebar and re-checks the
  route (via the `x-pathname` request header the middleware stamps — layouts
  do not receive the pathname any other way). The cookie can never GRANT
  anything: missing/tampered/expired → the edge pre-check is simply skipped
  and the layout still denies.
- **The staleness contract (ADR-018)**: an admin REVOKING a group's menu takes
  effect on the user's next page load (layout fresh layer); GRANTING a new
  menu takes effect on the user's next LOGIN (the stale fo_rights cookie
  denies at the edge until then). Both directions are asserted in
  route_smoke_m7c.sh. Do not "fix" the grant lag by reading the db in
  middleware — SQLite + Prisma cannot run on the edge runtime.
- **computeAllowedGroupIds is the ONE rule** (src/lib/auth/rights.ts): role
  admin → all; rights null (no group) → all (back-compat: group assignment is
  optional, pre-Wave-C users keep full access); rights [] → all (the matrix
  convention); else listed ∩ valid group ids ∪ {'home'}. 'home' is ALWAYS
  allowed — the dashboard is universal AND it makes the deny-redirect target
  ('/' — firstAllowedLandingRoute) loop-free by construction.
- **Password administration is a ROLE door, not a rights door**:
  /api/auth/admin/set-password requires role==='admin' (403 otherwise) so an
  admin can always reach it to fix a broken rights setup. Clearing your own
  password is rejected (400) — instant self-lockout; setting your own is the
  intended "change my password" path. /api/seed is admin-only for the same
  reason (destructive reseed) and the NavSidebar Seed button is hidden for
  non-admins.
- **route→group resolution** lives in menu-registry `findGroupForPath`
  (prefix-first, then exact landing; /coming/<id> resolves through the
  registry). Meta pages that belong to NO group (/parity, unknown paths) stay
  open to any authenticated user. Topbar breadcrumbs now use the same helper.
- **The Next 16 "middleware file convention is deprecated, use proxy"
  warning** appeared at dev startup. middleware.ts still works in 16.1.3;
  renaming to proxy.ts is a mechanical future migration — do it in its own
  commit with the full smoke trio re-run.
- **route_smoke_m7c.sh fixture** (`scripts/m7c_smoke_fixture.ts
  setup|tighten|reactivate|deactivate|cleanup`): creates the 'Smoke
  Restricted' group (rights orders+production) + user, tightens to
  ['accounts'] for the stale-cookie window, deactivates for the mid-session
  lockout, and cleans up. 36 checks total.
