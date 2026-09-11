# 01 — STATE (Living Project State)

> Updated every commit. Numbers below are **claims**; `scripts/context_check.sh`
> is the **verifier**. On conflict: trust the script, fix this file, log drift in 03-PITFALLS.

Last verified: 2026-09-11 (session: deep-research — the terminal audit: gates re-verified LIVE (vitest 1636/1636 with a flake caveat — 4-5 M54-era tests fail in ~2 of 5 full-suite runs, 16/16 in isolation; cross-file interference suspected, stabilization queued; tsc src 0; context_check 606/606 NO DRIFT; eval m56/266 PASS; route_smoke_m56 26/26 LIVE; OPS-01 restore-verify ok) · the §17 ledger CORRECTED (§17-5/6/7 restored to the open list — no ADRs existed, dropped silently by the M55/M56-era rewrites; §17-8 marked resolved-by-construction; §17-2/3/4 confirmed via ADR-022/020/021) · Phase-6 Modules A-J confirmed as the unbuilt future program (PHASE-6.md: full ~19 batches / minimal path 5 batches, §14)).



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
| M12 — Playwright E2E golden paths | ONE command `bash scripts/e2e.sh` → dedicated :3100 dev server on an isolated db/e2e.db copy (md5-guarded: the dev DB provably untouched) → 8 golden-path spec files / 14 test cases: login, order create (form), order create (agent — live GLM + pending-approval + human commit), PO→GRN, invoice→payment (settles the seeded invoice → status paid), approval approve (agent approve_pending + human commit + approvedBy = the human), print door (TAX INVOICE A4 sheet), rights denial (deny + allow control). Curl smokes stay as the cheap gates — nothing migrated | **COMPLETE** (`m12`): 14/14 in ~52s, exit 0, isolation check OK; fixtures seed through the REAL posting services (ADR-001); two real bugs fixed en route (the DATABASE_URL env leak that polluted the dev DB — cleaned + guarded, PITFALLS #35; the SSE "Controller is already closed" disconnect throw in /api/agent — send()/safeClose() guard, PITFALLS #36); @playwright/test 1.62.1 (cached chromium v1234); vitest 724/724, route_smoke_m9 38/38, eval --static PASS, build EXIT 0, context_check 418/418 |
| M17 — Operator Reflex Pack (P0) | SPEC-M17: 8 frontend reflex fixes from the FiberPro gap audit — Enter-commits-row contract + F2/F9/Esc + date-defaults-today + Print on the done card (doc-type-map.ts, 20 families) + full-row click & ↑↓/Enter register rows (register-rows.tsx client component) + real global '/' on masters + 'Despatch & Logistics' label fix + tool-chip removal + picker focus-return | **COMPLETE** (`m17-reflex`): print-doc-map.test 4 pins (20↔20 bijection); vitest 728/728; tsc src/ 0; eval --static PASS; context_check 422/422 (views 30, print lib 6); authenticated curl smokes 5/5 pages 200 with SSR contract markers |
| M18 — Print & Command Fidelity (P1, Waves A+B+C) | SPEC-M18: order print family (fetchers-order.ts, 21st in PRINT_DOCS) + invoice HSN body + bank/remit strip + masthead phone/email/CIN + ?template=large + dc cost-bearing auto-template + ?copies=3 burst + print-on-save pref + CommandPalette on ⌘K (rights-parity jump bar) + agent rebind ⌘J + paste-into-grid; Wave C: doc-view Cancel/Void (cancel-action.ts over the existing services) + Duplicate (new-routes.ts ×57 + sessionStorage stash) + rate memory (rate-memory.ts + /api/erp last_rate) + self-service change password (/api/auth/change-password + topbar dialog) | **COMPLETE** (`m18-print-cmd` A+B; Wave C shipped 2026-08-29): A+B — print-fidelity.test 7; route_smoke_m18 15/15. C — doc-view-actions 8 + rate-memory 5 + change-password 6 → 758 vitest; tsc src/ 0; eval --static PASS; context_check 435/435 (views 33, auth api routes 5); route_smoke_m18c 22/22; route_smoke_m9 38/38; live browser-verified Duplicate + rate-memory flows; upload-route cb5626a deletion REPAIRED (PITFALLS #39); fixture-leak pattern fixed (PITFALLS #40) |
| M19 — Register & Masters Long Tail (P2; Wave A) | SPEC-M19: preset-filter mechanism (RegisterFilter.preset — params ?? preset, "All" hidden on preset selects) + the 5 material-wise stock day-books (yarn/fabric/accessory/general/itemwise — the first four bind queryStockLedger VERBATIM, itemwise is a NEW per-item aggregation service) + orderwise pcs register (CurrentStock pcs grouped by order) · zero schema changes, zero new tools (two-door via get_stock_ledger/get_stock chips) | **COMPLETE** (Wave A shipped 2026-08-29): material-stock.test 12 + register-configs 21→27 slug pin → 800 vitest; tsc src/ 0; eval --static PASS; context_check 448/448 (menu 121, LIVEROUTES 153, regcfgs 21, regsvcs 25); route_smoke_m19 NEW 31/31; m18c 22/22 + m9 38/38 regressions; live browser-verified preset day-book + '/' + itemwise cells, zero console errors; Waves B/C/D spec'd-only in SPEC-M19 §2–§4 (cutting/supplier registers → masters completion 65→~73 → closing-stock as-of/counter-book/Tally) |
| M19 Wave B — cutting/issue/supplier registers + trading fold | SPEC-M19 §2: 5 new registers (cutting, line-issue, supplier-pending, po-register, supplier-history) + /orders/in-hand variant filter (derived manufacturing/trading discriminator, zero schema) · zero new tools | **COMPLETE** (2026-08-30): wave-b-registers.test 7 + register-configs 27→32 + menu 121→126 → 832 vitest; tsc src/ 0; eval --static PASS; context_check 462/462; route_smoke_m19b NEW 29/29; Wave C (masters completion 65→~73) + Wave D (closing-stock as-of/counter-book/Tally) remain |
| M19 Wave C — masters completion (ADR-019) | SPEC-M19 §3: 11 models (Bank/BankAccount/Mill/MachineCategory/Machine/State/Shade/ThreadType/CountGroup/RangeGroup/SizeRange) + 11 configs + 33 tools (create/update/list ×11); ~14 minor masters → AppOption/fold/obsolete | **COMPLETE** (2026-08-30): 865 vitest (126 runtime parity over 41 masters); tsc src/ 0; eval --static PASS; context_check 475/475; route_smoke_m19c NEW 22/22; Wave D remains (closing-stock as-of/counter-book/Tally) |
| M19 Wave D — closing-stock + counter-book + Tally | SPEC-M19 §4: queryClosingStock (cumulative as-of, latest-rate valuation) + counterBook render mode (pure groupCounterBook helper, stock-ledger + daily-in-out) + buildTallyExport adapter w/ guarded /api/tally + preview screen | **COMPLETE** (2026-08-30) — M19 ALL FOUR WAVES DONE: 879 vitest; tsc src/ 0; eval --static PASS; context_check 484/484; route_smoke_m19d NEW 24/24 |
| M13 — Notifications & alerts | SPEC-M9 §9 P2-1: digest service (approvals + low stock + gate) + 4 notification.* flags (32 total) + /api/cron/digest (session-OR-secret) + /notifications/digest screen | **COMPLETE** (2026-08-30): 885 vitest; tsc src/ 0; eval --static PASS; context_check 492/492; route_smoke_m13 NEW 22/22 |
| M14 — Performance & scale | SPEC-M14: createdAt indexes (16 families + StockLedger createdAt+docDate) + server-side pagination verified + /live SSE surface ported from m9-wave-a-alt + 10k-row perf gate + N+1 audit | **COMPLETE** (2026-08-30): 898 vitest (perf 4 + live-snapshot 9); tsc src/ 0; eval --static PASS; context_check 506/506; route_smoke_m14 NEW 9/9 (SSE 3 frames/8s) |
| M15 — Audit log & undo trail | SPEC-M9 §9 P2-3: AuditLog model + runCommit shared executor at 13 commit doors (agent approve + all form actions) + /admin/audit admin viewer | **COMPLETE** (2026-08-30): 909 vitest; tsc src/ 0; eval --static PASS; context_check 516/516; route_smoke_m15 NEW 13/13 |
| M32 — Voice TTS confirm loop (M24 OUT) | SPEC-M32: planSpeechText + speak/stopSpeaking (browser TTS, default-OFF toggle) + pending-plan read-back + Approve/Reject spoken acks | **COMPLETE** (2026-08-30): 1072 vitest; tsc src/ 0; eval --static PASS; context_check 565/565; LIVE browser-verified |
| M33 — Barcode bundle flow (P3 #2) | SPEC-M33: vendored Code128-B/C encoder (barcode.ts — BYTE-IDENTICAL to python-barcode ×14 fixture samples; table GENERATED not hand-typed after 46-drift catch; TO_C collapse ported) + bundle-labels/bundle-label print docTypes + PrintSheet label-card grid + PrintDoc.labels/PrintLabelCard + cut-order view "Print bundle labels" door + get_bundle tool (229) + LPP fixture repair (parallel-session db drift) | **COMPLETE** (2026-08-30): 1091 vitest; tsc src/ 0; eval --static PASS 15/15; context_check 570/570; route_smoke_m33 17/17; LIVE browser-verified (3 cards + 3 Code128 SVGs; VLM-confirmed) |
| M34 — Terms master feeding invoice print (A3 frmTerms) | SPEC-M34: printTerms(family) reads AppOption print.terms.<family> (no cache) + invoice fetcher swaps owned-lines-vs-fallback + /admin/options mention; zero new tools (app-option doors exist) | **COMPLETE** (2026-08-30): 1102 vitest; tsc src/ 0; eval --static PASS 15/15; context_check 572/572; route_smoke_m34 12/12; LIVE browser-verified (VLM-confirmed) |
| M35 — Holidays digest adoption (M28 OUT) | SPEC-M35: digest shutdowns section (the M28 read, 14d window, silent when empty) + the amber page card + get_daily_digest tool (230 — the Phase-4.5 promise restored) | **COMPLETE** (2026-08-30): 1112 vitest; tsc src/ 0; eval --static PASS 15/15; context_check 574/574; route_smoke_m35 12/12; LIVE browser-verified (VLM-confirmed) |
| M36 — Phase-6B Batch 0 hotfix (19 HFX) | SPEC-M36: 13 correctness one-liners (GRN guard, DC colour/size, cancelled-filter, payment direction, on-account receipts, rtgs/neft, employee partyType, honest sideEffects, billed ghost, PO enum, shared valueBucket, shiftWages→amount, vitest DB pin) + the 6-layer agent render stack (real streaming, markdown+GFM, persistent narration, viewport autoscroll, inline errors+Retry, one close) | **COMPLETE** (2026-08-31): 1131 vitest; tsc src/ 0; eval --static PASS; context_check 581/581; route_smoke_batch0 15/15; LIVE browser-verified (VLM-confirmed) |
| M37 — Phase-6B Batch 1 ops foundation (5 OPS) | SPEC-M37: backup_db.py (VACUUM INTO + integrity + 7d/30w rotation + restore-verify + off-box rsync via AppOption) + cron installer + recovery-drill rewrite (no --accept-data-loss in the recovery path) + digest ops section · WAL at boot · src/lib/erp/dates.ts IST module + 46 posting-fallback sweeps + register/digest/tools IST windows (no process-TZ flip — documented deviation) · IdempotencyKey model + runCommit insert-first idempotency on BOTH commit doors (double-click posts once) · StockLedger.docKey @unique doc-level anchor (out-leg of pairs) + 142-row backfill + loud collision errors | **COMPLETE** (2026-08-31): 1153 vitest (+22); tsc src/ 0; eval --static PASS; context_check 587/587; route_smoke_batch1 15/15; LIVE browser-verified + LIVE double-click approve replayed:true |
| M39 — Phase-6B Batch 3 jobwork loop repair (9 JWL) | SPEC-M39: JobworkLine model + cumulative partial-aware receipts (the totalQty-overwrite bug dies) + JW out posts stock w/ REAL ITC-04 line + G3 Jobworker-Yard WIP wired + GAN acceptance posts into G2 (docKey-idempotent) + validated cumulative DC-returns + bill_jobwork (billed + billedInvoiceNo — HFX-09 retired) + jobworker material statement register (/jobwork/statement) + AL- contract linkage + checkProcessLoss wired | **COMPLETE** (2026-08-31): 1213 vitest (+20); tsc src/ 0; eval --static PASS; context_check 595/595; LIVE browser-verified (loop-closure #2 green; statement + lines table + ITC-04 + G3 WIP verified live) |
| M31 — Working-day planner arithmetic (M28 OUT) | SPEC-M31: holidays.ts pure breakdown/addWorkingDays + wrappers + Order Hub runway + get_working_days tool (228) + seed idempotency fix | **COMPLETE** (2026-08-30): 1057 vitest; tsc src/ 0; eval --static PASS; context_check 564/564; LIVE browser-verified |
| M30 — Legacy-forms alias hygiene (§8-1..4) | SPEC-M30: legacy-aliases.ts (18 aliases + 17 non-forms) + countableLegacyForms in parityStats + parity page honest counts + palette canonical expansion + header drifts (ITEMS 132, 16/12 split) | **COMPLETE** (2026-08-30): 1036 vitest; tsc src/ 0; eval --static PASS; context_check 563/563; LIVE browser-verified (0 (+3) honest counts; FrmOrderRegister finds Order Register) |
| M29 — Jump bar G residual (§7-G) | SPEC-M29: jump.ts 12-family doc-number resolver + /api/erp jump resource + palette Documents/Parties groups + legacyForms aliases + masters ?q= | **COMPLETE** (2026-08-30): 1016 vitest; tsc src/ 0; eval --static PASS; context_check 560/560; route_smoke_m29 NEW 13/13; LIVE browser-verified ⌘K→SO-…→Order Hub |
| M28 — Holiday calendar surfacing (§7-H) | SPEC-M28: holidays.ts planning read (getUpcomingHolidays + holidaysBeforeDelivery) + the Order Hub shutdown-warning strip + the MIS upcoming-shutdowns card; zero schema/tools | **COMPLETE** (2026-08-30): 1007 vitest; tsc src/ 0; eval --static PASS; context_check 557/557; route_smoke_m28 NEW 12/12; LIVE browser-verified |
| M27 — Print QR (QR lib decision closed) | SPEC-M27: vendored MIT encoder (byte mode, EC M, v1–10, 8-mask auto) + inline SVG on the invoice print beside the IRN (live IRN only); jsqr devDep cross-verification — caught a real BCH off-by-one | **COMPLETE** (2026-08-30): 1000 vitest; tsc src/ 0; eval --static PASS; context_check 554/554; route_smoke_m27 NEW 14/14; LIVE browser-verified |
| M26 — IRN cancellation (M23 OUT closed) | SPEC-M26: planCancelIrn (24h window + govt reason enum, ONE-update commit, history slot) + cancel_einvoice_irn tool (227) + the view Cancel form door + regen-after-cancel | **COMPLETE** (2026-08-30): 992 vitest; tsc src/ 0; eval --static PASS; context_check 551/551; route_smoke_m26 NEW 17/17; LIVE browser-verified |
| M25 — Line-grid keypad: pcs despatch (M22 follow-up) | SPEC-M25: keypadLinesFor required-only projection + the big line editor (ADD/✕, ≥1-line guard, line pickers on the shared feed) + /pieces/despatch?mode=keypad + toggle; both doors carry { header, lines } | **COMPLETE** (2026-08-30): 987 vitest; tsc src/ 0; eval --static PASS; context_check 550/550; route_smoke_m25 NEW 16/16; LIVE browser-verified |
| M24 — Voice entry (§7-V) | SPEC-M24: browser-SpeechRecognition dictation into the agent panel (en-IN/ta-IN chip, localStorage pref), voice module + mic button + lang chip, never auto-sends, graceful unsupported/mic-less degradation | **COMPLETE** (2026-08-30): 982 vitest; tsc src/ 0; eval --static PASS; context_check 548/548; m22 regression 19/19; LIVE browser-verified |
| M23 — Mock e-invoice / e-Way Bill (Gap D #11) | SPEC-M23: deterministic mock handshake (64-hex IRN + 10-digit ack + 12-digit EWB >₹50k) + generate_einvoice_irn tool + view button (14th runCommit door) + print rows | **COMPLETE** (2026-08-30): 968 vitest; tsc src/ 0; eval --static PASS; context_check 545/545; route_smoke_m23 NEW 15/15 |
| M22 — Keypad-operator mode (§7-K) | SPEC-M22: full-screen big-target keypad surface over the doc-actions form door (3 header-only surfaces), two-step save preserved, zero menu/route churn | **COMPLETE** (2026-08-30): 958 vitest; tsc src/ 0; eval --static PASS; context_check 540/540; route_smoke_m22 NEW 19/19 |
| M21 — Waste Receipt (FrmWasteReceiptEntry) | SPEC-M21: stock-adj variant (WST-####, action=add fixed, reason `Waste — <class>`) + receive_waste tool + /inventory/waste-receipt DocScreen + menu | **COMPLETE** (2026-08-30): 949 vitest; tsc src/ 0; eval --static PASS; context_check 535/535; route_smoke_m21 NEW 15/15 |
| M20 — Attendance (Gap D closure) | SPEC-M20: Attendance model (upsert per employee/day) + post_attendance write + list_attendance read + /hr/attendance day-book register + menu; HR button now backed | **COMPLETE** (2026-08-30): 942 vitest; tsc src/ 0; eval --static PASS; context_check 531/531; route_smoke_m20 NEW 18/18 |
| M16 — Dashboard 2.0 (role dashboards) | SPEC-M16: 16-tile registry + 7 role profiles + AppOption dashboard:<role>:tiles persistence + own-role save action + SSR page + recharts chain-funnel/production/cash charts + customize mode; old client dashboard deleted | **COMPLETE** (2026-08-30) — SPEC-M9 §9 P2 QUEUE DONE: 928 vitest; tsc src/ 0; eval --static PASS; context_check 522/522; route_smoke_m16 NEW 29/29 |

## Ground truth (verified by context_check.sh)

| Metric | Value | How to verify |
|---|---|---|
| Git HEAD | M12 commit (Playwright E2E golden paths — M12 COMPLETE) — tags `m12`, `m11`, `m10`, prior `m9-wave-a`, `m8-wave-b`, `m6-wave-d`, `m7-wave-c`, `spec-m7-frozen`, `schema-65-baseline`; **remote = local (PAT configured; push after EVERY commit)** | `git rev-parse --short HEAD` |
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
| ERP view/shell components | **33** (23 + M6-C lifecycle-form + M6-D approval-queue + M8-A print trio + M9 live-tracker + M17 register-rows + M18 command-palette + M18-C doc-view-actions/change-password) | `ls src/components/erp/*.tsx \| wc -l` |
| Archetype engines | **4** (`master-table.tsx` + `doc-screen.tsx` + `register-screen.tsx` + M6-A `report-screen.tsx`) | context_check |
| Menu registry | **121** items (113 parity + live-tracker M9 + feature-flags M11 + M19 ×6 registers) · 17 groups | `tests/unit/menu-registry.test.ts` |
| Live routes | **153**: M6-D 145 + M9 /tracker + M11 /admin/settings + M19 ×6 (all-live invariant holds) | LIVE_ROUTES in `src/lib/erp/menu-registry.ts` |
| RegisterScreen engine (M4-A) | `src/components/archetypes/register-screen.tsx` (server: breadcrumb, filter bar, summary, totals band, W2 hrefs, pagination, CSV link) + `register-filter-bar.tsx` (client: pushes shareable searchParams; party/godown datalist via master_search) | context_check |
| `src/lib/erp/report-configs/` + `src/lib/erp/reports/` + `src/components/archetypes/report-screen.tsx` + `src/components/erp/print-button.tsx` | **M6-A: the RH archetype** — 28 pure-data report configs (6 packs; filters/columns reuse register types) + REPORT_SERVICES (15 register bindings via bind() + 13 new aggregates in core-reports.ts/chain-money-reports.ts) + report-csv.ts (makeReportCsvRouteHandler + getPrintHeader — degrades to null until ADR-016 Wave B) + ReportScreen engine (param form + print header/copy banner + CSV + pagination) + PrintButton (Original/Duplicate/Triplicate → ?copy=) |
| Order Status Board (M4-C) | `/orders/status` — server component over queryOrderStatus (registers/order-status.ts): header KPIs (open orders/pcs/avg stages), per-row 15-dot ChainBar (flags shipped on the row), n/15 chip + next-stage chip, row → Order Hub; NOT a RegisterScreen (§10) | route_smoke_waveE.sh |
| Wiring (M4-C) | W2: register rows drill into doc views (TXN_DOC_FAMILY + resolveDocRef; every family href test-pinned) · W6: ReconCard on PO view (PO↔GRNs), invoice view (Invoice↔Payments), jobwork view (out↔in), Order Hub despatch section (Despatch↔Invoice) — math in registers/recon.ts, test-asserted · §8.3 KPI deep-links on the dashboard tiles (Open Orders→/orders/register?status=open, Pending POs→/procurement/party-balance, Stock Value→/inventory (ERRATUM: /inventory/stock was never a route), Today Pcs→/production/register?from&to, Pending Approvals→/approvals, Open Invoices→/accounts/bills-register?status=issued) | route_smoke_waveE.sh 19/19 |
| Register configs/services (M6-C + M19-A) | **27 configs** in `src/lib/erp/register-configs/` (21 files; m6-wave-c + material-stock hold 2/6) + **25 service files** in `src/lib/erp/registers/` (27 REGISTER_SERVICES entries — slug bijection test-enforced, M19's 4 day-books bind queryStockLedger verbatim — + order-status.ts + recon.ts) + resolve.ts (parseRegisterQuery + M19 preset fallback + TXN_DOC_FAMILY + resolveDocRef + buildItemCodeMaps (pcs→style.styleNo)) + csv.ts (makeCsvRouteHandler — preset-aware) | context_check |
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

> Corrected 2026-09-11 (the deep-research audit): the M55/M56-era rewrite of
> this section had dropped §17-5/6/7/8 without ADRs — the spec's §17 list
> (PHASE-6B-REMEDIATION-SPEC.md §17) is the truth; every item is now accounted
> for below.

1. **Backup off-box target** (§17-1, OPS-01): the M37 mechanism (nightly
   VACUUM INTO + rotation + restore-verify + the off-box rsync/rclone hook +
   cron installer) awaits a DESTINATION only the owner can provide — it
   cannot be delegated or invented.
2. **Multi-style orders** (§17-5, PRG-02): the mechanism shipped flag-gated in
   M43 (`multi_style_orders`, default OFF — single-style behavior
   byte-identical, differing line style refuses LOUDLY naming the flag); the
   owner decides enable-vs-keep. No ADR exists.
3. **Cumulative DC→invoice** (§17-6, PRC-09, legacy frmDelCumInv): DEFERRED
   at M41 (no dead columns — the despatchId/allocation linkage was never
   added); build or park. No ADR exists.
4. **SalesInvoiceLine prerequisite** (§17-7, AM-1): the lines model gates
   Phase-6 Module G's FR-G2 (GSTR-1 payload builder); only matters when
   Module G starts. No ADR exists.
5. **Final-accounts scope** (§17-8, Module M): delivered in substance by
   M50–M54 (CoA + double-entry + TB/day-book reports + Tally JSON + expense
   heads — the minimal set the spec named); resolved-by-construction, pending
   the owner's explicit confirm.
6. **Branch retirement** (owner call): side_quest (+1 docs-only commit ahead,
   zero code), m18c-alt (+1), m9-wave-a-alt (+2), p0-reflex-pack-alt (+1),
   real-main (+0, fully merged) — and remote-only qol1-m30-alt +
   agent/order-program-flow.

RESOLVED (recorded for traceability): §17-2 G3 wired in M39 (ADR-022, the
erratum that corrected the stale queue lists) · §17-3 cheque/PDC lifecycle
shipped in M56 (ADR-020) · §17-4 Tally stays JSON (ADR-021).

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
   **Next candidates (SPEC-M9 §9 frozen roadmap — pick top-down)**: M12 DONE
   (see milestone row); P2 begins — M13 notifications digest (approval-pending
   digest + low-stock alerts via AppOption notification.* keys + /api/cron/
   digest route; acceptance: digest renders pending approvals + low stock,
   flags gate sending, no external dependency beyond fetch), then M14 perf
   (createdAt indexes on the 16 feed families + StockLedger, server-side
   pagination on the 5 busiest registers, tracker SSE upgrade — the
   m9-wave-a-alt branch already carries a drop-in SSE implementation, N+1
   audit; acceptance: registers <300ms at 10k rows, tracker poll <100ms),
   M15 engine-level audit trail, M16 role dashboards.
14. **M17 DONE** (tag `m17-reflex`): the Operator Reflex Pack — the 8 P0 reflex fixes from docs/GAP-ANALYSIS-FIBERPRO.md §6.2 (Enter-commits-row, F2/F9/Esc, dates-default-today, Print on the done card via doc-type-map.ts, full-row + keyboard register rows via register-rows.tsx, real global '/', 'Despatch & Logistics' label, tool-chip removal, picker focus-return). 728 vitest, tsc src/ 0, context_check 422/422. **Next candidates**: the M18 muscle-memory backlog (GAP-ANALYSIS §7/§9: order-sheet print + invoice HSN/bank block, command palette over the vendored cmdk, paste-into-grid, rate memory, doc-view Cancel/Duplicate, counter-book register grouping) OR return to the SPEC-M9 §9 P2 queue (M13 digest → M14 perf/SSE → M15 audit → M16 dashboards).
15. **M18 Waves A+B DONE** (tag `m18-print-cmd`): Print & Command Fidelity — order print family (21st), invoice HSN body + bank/remit strip + masthead phone/email/CIN, ?template=large, dc cost-bearing auto-template, ?copies=3 burst, print-on-save pref, CommandPalette on ⌘K (agent → ⌘J), paste-into-grid. 735 vitest, tsc src/ 0, context_check 426/426, route_smoke_m18 15/15. **Next candidates**: SPEC-M18 §4 Wave C (doc-view Cancel/Void/Duplicate + rate memory last_rate + self-service change password), then the P2 register/masters long tail (GAP-ANALYSIS §9: 5 material-wise stock registers, cutting/supplier-pending/shift-wages, masters Bank/Mill/Machine/State/Shade...) OR the reserved SPEC-M9 §9 queue (M13 digest → M14 perf/SSE → M15 audit → M16 dashboards).
16. **M18 Wave C DONE** (2026-08-29): doc-view Cancel/Void (4 families, existing services, two-step plan→confirm→commit) + Duplicate (all 57 families, sessionStorage stash → New screen seeding, fresh number) + rate memory (last_rate read door, blank-cell auto-fill citing source doc+date) + self-service change password (topbar key door). 758 vitest, tsc src/ 0, context_check 435/435, route_smoke_m18c 22/22, live browser-verified; upload-route cb5626a committed-deletion REPAIRED (PITFALLS #39). **Next candidates**: the P2 register/masters long tail (GAP-ANALYSIS §9 → M19+: 5 material-wise stock registers, cutting/supplier-pending/shift-wages registers, masters Bank/Mill/Machine/State/Shade/ThreadType/CountGroup/Range, closing-stock as-of, counter-book grouping C, Tally JSON) OR the reserved SPEC-M9 §9 queue (M13 digest D → M14 perf/SSE (m9-wave-a-alt accelerator parked on origin) → M15 audit → M16 dashboards) OR M15-channels (keypad K, voice V, attendance, waste receipt, e-invoice mock).
17. **M19 Wave A DONE** (2026-08-29): the material-wise stock day-books — preset-filter mechanism + yarn/fabric/accessory/general/itemwise registers (4 bind queryStockLedger verbatim; itemwise = NEW per-item aggregation) + orderwise pcs register; menu 121 / routes 153; zero schema changes, zero new tools. 800 vitest, tsc src/ 0, context_check 448/448, route_smoke_m19 31/31, m18c+m9 regressions green, live browser-verified. **Next candidates**: M19 Wave B (SPEC-M19 §2 — cutting register FrmCutingReg, order/bundle issue-to-line register, supplier pending/history registers, trading in-hand fold) OR M19 Wave C masters completion (§3 — Bank/Mill/Machine/State/Shade/ThreadType/CountGroup/Range, schema 65→~73 + create tools + the shift-wages linkage decision) OR the reserved SPEC-M9 §9 queue (M13 digest → M14 perf/SSE w/ parked m9-wave-a-alt).

18. **M19 Wave B DONE** (2026-08-30): cutting register (FrmCutingReg), issue-to-line register (FrmOrdBundIssToLineReg), supplier-pending (frmSupordPendReg per-PO chase), po-register (FrmSupplierOrderRegister), supplier-history (FrmSuppOrderHistoryReg) + the trading fold on /orders/in-hand (derived discriminator, zero schema). Menu 126 / routes 158, zero new tools. 832 vitest, tsc src/ 0, context_check 462/462, route_smoke_m19b 29/29. **Next candidates**: M19 Wave C masters completion (SPEC-M19 §3 — Bank/Mill/Machine/State/Shade/ThreadType/CountGroup/Range, schema 65→~73 + create/update tools + the shift-wages linkage decision) OR Wave D (closing-stock as-of, counter-book, Tally JSON) OR the reserved SPEC-M9 §9 queue (M13 digest → M14 perf/SSE w/ parked m9-wave-a-alt → M15 audit → M16 dashboards).

19. **M19 Wave C DONE** (2026-08-30, ADR-019): 11 completion masters — Bank(+account), Mill, Machine(+category), State, Shade, ThreadType, CountGroup, Range(+group) — models 65→76, configs 30→41, tools 189→222 (create/update/list ×11), masters hub auto-cards, hyphenated-refEntity service OVERRIDES. 865 vitest, tsc src/ 0, context_check 475/475, route_smoke_m19c 22/22. **Next candidates**: M19 Wave D (SPEC-M19 §4 — closing-stock as-of date, counter-book grouped register mode, Tally JSON export) OR the reserved SPEC-M9 §9 queue (M13 digest → M14 perf/SSE w/ parked m9-wave-a-alt → M15 audit → M16 dashboards).

20. **M19 Wave D DONE — M19 COMPLETE** (2026-08-30): closing-stock as-of register (cumulative, latest-rate valuation), counter-book grouped mode on the two day-books (date sections + day subtotals, ascending), Tally JSON export (Sales/Receipt/Payment/Journal adapter + guarded /api/tally + preview screen). Menu 128 / routes 160, zero schema, zero new tools. 879 vitest, tsc src/ 0, context_check 484/484, route_smoke_m19d 24/24. **Next candidates**: the reserved SPEC-M9 §9 queue — M13 notifications digest (approval-pending + low-stock via AppOption notification.* + /api/cron/digest) → M14 perf (createdAt indexes, register pagination at 10k rows, tracker SSE w/ the parked m9-wave-a-alt accelerator) → M15 engine-level audit trail → M16 role dashboards.

21. **M13 DONE** (2026-08-30): notifications digest — buildDigest/sendDigest + 4 notification.* flags (registry 32) + /api/cron/digest (GET session-OR-secret, POST send-now) + /notifications/digest screen. Menu 129 / routes 161. 885 vitest, tsc src/ 0, context_check 492/492, route_smoke_m13 22/22. **Next candidates (SPEC-M9 §9 P2 in order)**: M14 perf (createdAt indexes on the 16 feed families + StockLedger; server-side pagination on the 5 busiest registers <300ms at 10k rows; tracker SSE upgrade — the m9-wave-a-alt branch is the parked drop-in; N+1 audit) → M15 engine-level audit trail → M16 role dashboards.

22. **M14 DONE** (2026-08-30, SPEC-M14): createdAt indexes on the 16 feed families + StockLedger (createdAt + docDate), pagination verified + measured, /live SSE surface ported from the parked accelerator (the parity-style /tracker untouched), 10k-row perf gate (all <300ms, measured single-digit ms), N+1 audit documented. 898 vitest, tsc src/ 0, context_check 506/506, route_smoke_m14 9/9. **Next candidates (SPEC-M9 §9 P2 in order)**: M15 engine-level audit trail → M16 role dashboards; the m9-wave-a-alt branch is now FULLY absorbed (can be deleted or kept as history).

23. **M15 DONE — THE SIX-TASK RUN COMPLETE** (2026-08-30): engine-level audit trail — AuditLog (77 models) + runCommit executor at all 13 commit doors + /admin/audit admin viewer. Menu 130 / routes 163. 909 vitest, tsc src/ 0, context_check 516/516, route_smoke_m15 13/13. **Next candidates**: M16 role dashboards (the last SPEC-M9 §9 P2 item) OR the gap-audit P3 lane (keypad mode, Tamil voice, attendance, waste receipt, e-invoice mock) OR hygiene (delete/absorb the m9-wave-a-alt branch — fully ported now).

24. **M16 DONE — SPEC-M9 §9 P2 QUEUE COMPLETE** (2026-08-30, SPEC-M16): Dashboard 2.0 — 16-tile registry + 7 role profiles + AppOption dashboard:<role>:tiles persistence (own-role save action, session-guarded) + SSR page + recharts chain-funnel/production/cash charts + customize mode (reorder/hide/add-back/Reset); old client dashboard deleted; zero schema/tools/menu/routes change. 928 vitest, tsc src/ 0, eval --static PASS, context_check 522/522, route_smoke_m16 29/29. **Next candidates (the gap-audit §9 P3 lane, second six-task run)**: attendance model+tool+register (Gap D — the HR button has no backing) → waste receipt → keypad-operator mode (K) → e-invoice/e-way mock IRN (Gap D #11) → voice entry (V, needs STT decision) · plus hygiene: delete the fully-absorbed m9-wave-a-alt branch (local + origin).

25. **M20 DONE** (2026-08-30, SPEC-M20): attendance — model (upsert per employee/day) + post_attendance/list_attendance tools (222→224) + /hr/attendance day-book + menu (131/164). 942 vitest, tsc src/ 0, eval --static PASS, context_check 531/531, route_smoke_m20 18/18. Branch hygiene DONE (m9-wave-a-alt + p0-reflex-pack-alt deleted local+origin, SHAs logged in worklog Task 29).

26. **M21 DONE** (2026-08-30, SPEC-M21): waste receipt — stock-adj variant (WST-####, waste classes) + receive_waste tool (225) + /inventory/waste-receipt + menu (132/165). 949 vitest, tsc src/ 0, eval --static PASS, context_check 535/535, route_smoke_m21 15/15.

27. **M22 DONE** (2026-08-30, SPEC-M22): keypad-operator mode — full-screen big-target surface over the form door (production tally + cut order + waste receipt), two-step save preserved, ?mode=keypad + QR-able URLs, zero menu/route churn. 958 vitest, tsc src/ 0, eval --static PASS, context_check 540/540, route_smoke_m22 19/19.

28. **M23 DONE — SECOND SIX-TASK RUN COMPLETE** (2026-08-30, SPEC-M23): mock e-invoice/e-way (Gap D #11 closed) — deterministic 64-hex IRN + ack + ₹50k-threshold EWB, agent tool + view form-door (14th runCommit door) + print rows. 968 vitest, tsc src/ 0, eval --static PASS, context_check 545/545, route_smoke_m23 15/15. **Next candidates**: voice entry (V — needs an STT decision: Tamil/Tanglish via the browser SpeechRecognition API vs a server STT service) · the pcs-despatch line-grid keypad follow-up · IRN cancellation workflow · QR image on the invoice print (needs a QR lib decision) · SPEC-M9 §9 P3 residual (multi-company decision #1, barcode decision #2, holiday surfacing H) · the muscle-memory long tail (GAP-ANALYSIS §7 G/H residual).
29. **M24 DONE** (2026-08-30, SPEC-M24): voice entry — the STT decision RESOLVED (browser SpeechRecognition API, zero server/npm dependency): voice.ts pure module (probe + continuous/interim session, end-once detach, guarded start/stop) + agent-panel mic button + en-IN⇄ta-IN lang chip (localStorage fo.voiceLang) + never-auto-send. 982 vitest, tsc src/ 0, eval --static PASS, context_check 548/548, m22 regression 19/19, LIVE browser-verified. **Next (third six-task run, tasks 2–6)**: M25 pcs-despatch line-grid keypad (M22 follow-up) → M26 IRN cancellation workflow (24h rule) → M27 print QR image (QR lib decision: vendored MIT encoder) → M28 holiday calendar surfacing (§7-H) → M29 jump-bar G residual (doc-number jumps + legacy form-name aliases).
30. **M25 DONE** (2026-08-30, SPEC-M25): line-grid keypad — pcs despatch gains the big line editor (ADD/✕, guards, line pickers on master_search) over the SAME form door; ?mode=keypad + toggle. 987 vitest, tsc src/ 0, eval --static PASS, context_check 550/550, route_smoke_m25 16/16, LIVE browser-verified. **Next (third six-task run, tasks 3–6)**: M26 IRN cancellation workflow (24h rule) → M27 print QR image (vendored MIT encoder) → M28 holiday calendar surfacing (§7-H) → M29 jump-bar G residual.
31. **M26 DONE** (2026-08-30, SPEC-M26): IRN cancellation — the 24h window + govt reason enum + history slot + regen-after-cancel; cancel_einvoice_irn tool (227); the view Cancel form door. 992 vitest, tsc src/ 0, eval --static PASS, context_check 551/551, route_smoke_m26 17/17, LIVE browser-verified. **Next (third six-task run, tasks 4–6)**: M27 print QR image (vendored MIT encoder) → M28 holiday calendar surfacing (§7-H) → M29 jump-bar G residual.
32. **M27 DONE** (2026-08-30, SPEC-M27): print QR — the vendored encoder (zero prod deps) + live-IRN-only SVG on the invoice print + jsQR devDep cross-verification (caught a real BCH off-by-one in format/version info). 1000 vitest, tsc src/ 0, eval --static PASS, context_check 554/554, route_smoke_m27 14/14, LIVE browser-verified. **Next (third six-task run, tasks 5–6)**: M28 holiday calendar surfacing (§7-H) → M29 jump-bar G residual (doc-number jumps + legacy form-name aliases).
33. **M28 DONE** (2026-08-30, SPEC-M28): holiday surfacing — the GovtHoliday master finally feeds planning: Order Hub delivery-risk warning + MIS shutdown card (holidays.ts, zero schema/tools). 1007 vitest, tsc src/ 0, eval --static PASS, context_check 557/557, route_smoke_m28 12/12, LIVE browser-verified. **Next (third six-task run, task 6)**: M29 jump-bar G residual (doc-number jumps + legacy form-name aliases in the CommandPalette).
34. **M29 DONE — THIRD SIX-TASK RUN COMPLETE** (2026-08-30, SPEC-M29): the jump bar's G residual — doc-number jumps (12 families, bare-digits + prefixed), party records in the palette, legacy form-name aliases, masters ?q=. 1016 vitest, tsc src/ 0, eval --static PASS, context_check 560/560, route_smoke_m29 13/13, LIVE browser-verified end-to-end. **Run totals**: 968→1016 vitest (+48), tools 226→227, models 78 (stays), context_check 545→560, six specs frozen (M24–M29), every milestone committed+tagged+pushed. **Next candidates**: the gap-audit §8 hygiene debts (29 legacyForms aliases, stale header comments) · SPEC-M9 §9 P3 residuals (multi-company #1, barcode #2) · working-day planner arithmetic (the M28 OUT) · voice TTS confirm loop · register long-tail polish · or a fresh user-directed lane.

41. **M36 DONE — PHASE-6B BATCH 0 (HOTFIX) SHIPPED** (2026-08-31, SPEC-M36): all 19 HFX from the remediation spec §3 — 13 correctness one-liners + the agent render stack (owner issue 1 closed: newlines survive transport, markdown renders, narration persists, autoscroll works, errors surface inline, one close). Bonus structural wins: vitest now runs on a disposable DB copy (never custom.db), valuation.ts is the single valuation seam (WAC lands there), narration.ts is the pure merge helper. 1131 vitest (+19), tsc src/ 0, eval --static PASS, context_check 580/580, route_smoke_batch0 15/15 (live SSE: 67 deltas / 8 newlines), LIVE browser-verified (VLM-confirmed). **Next (Phase-6B sequencing, spec §16)**: Batch 1 OPS-01..05 (backup, WAL, IST day boundary, commit idempotency, ledger docNo unique) → Batch 2 CHAT-01..12 (agent QoL — outcome events, dynamic context, approve-route TOCTOU) — those two batches close the remaining two owner issues.
42. **M37 DONE — PHASE-6B BATCH 1 (OPS FOUNDATION) SHIPPED** (2026-08-31, SPEC-M37): all 5 OPS from the remediation spec §4 — nightly VACUUM INTO backup w/ rotation + restore-verify + off-box target + cron installer, WAL journal mode, the IST day-boundary module (46 posting fallbacks + register/digest/tools windows; process-TZ deliberately NOT flipped — the arithmetic module achieves the boundary without breaking the UTC-midnight storage convention), commit idempotency on both doors (double-click Approve posts once — live-verified), StockLedger docKey doc-level uniqueness (142-row backfill, racing numbers fail loudly). The trust tier (Batches 0+1) is COMPLETE: numbers correct (M36), recoverable (backup+WAL), once-only (idempotency), day-accurate (IST), doc-unique (docKey). 1153 vitest (+22), tsc src/ 0, eval --static PASS, context_check 587/587, route_smoke_batch1 15/15, LIVE browser + LIVE double-click verified. **Next per spec §16**: Batch 2 CHAT-01..12 (agent QoL — outcome events ~20 lines highest leverage, dynamic context line, screen-aware suggestions from the 76 authored agentPrompts, plan-card contents, approve-by-id TOCTOU kill, truthful error badges) — closes owner issues 2+3.
43. **M38 DONE — PHASE-6B BATCH 2 (AGENT QOL) SHIPPED — ALL THREE OWNER CHATBOT ISSUES CLOSED** (2026-08-31, SPEC-M38): all 12 CHAT FRs from the remediation spec §5 — outcome events (the ~20-line highest-leverage fix: the model learns approve/reject/commit results), dynamic context line (today/user/FY/screen/godowns), screen-aware suggestions (the 76 authored agentPrompts consumable), follow-up chips, plan contents tables, approve-by-id (TOCTOU kill: stored-plan equality or 409 re-review; typed 'approve it' resolves the pending plan), post-commit View/Print CTA, truthful error badges, fuzzy lookup rescue with did-you-mean candidates, bounded master lists (q/take + total/truncated + parseable truncation), the prompt formatting contract (PROMPT_VERSION m38), and the polish sweep (autofocus, copy, stopped, MAX_STEPS visible, buyerId honored, humanized labels, composite keys). 1188 vitest (+35), tsc src/ 0, eval --static PASS, context_check 595/595, route_smoke_batch2 18/18, LIVE browser-verified. **Next per spec §16**: Batch 3 JWL-01..09 (jobwork loop repair — seam 2: JW- doc-only sideEffects, totalQty overwrite, rejected receipts, GAN acceptance gate) then Batch 4 PRC (procurement) — the loop-closure tier begins.
44. **M39 DONE — PHASE-6B BATCH 3 (JOBWORK LOOP REPAIR) SHIPPED — SEAM 2 CLOSED** (2026-08-31, SPEC-M39): all 9 JWL FRs from the remediation spec §6. JWL-01 JobworkLine model (item/qty/uom/rate + per-line received/rejected/returned mirrors; the doc view shows the sent-vs-received table; the register gains Received + At-Party columns). JWL-02 the JW- out WITH lines posts process_delivery OUT of the issuing godown + writes a REAL itc04Line ("ITC04 26-27 | JW-0001 | party | 25 kgs out | date" — verified LIVE); header-only outs stay document-only with honest sideEffects (the M3 phantom claims are dead). JWL-03 receipts are CUMULATIVE (receivedQty += qty — the M3 bug that overwrote sent truth on first receipt), partial-aware (sent→partial→received), over-receipt rejected with the open balance, rejectedQty books as process loss. JWL-04 DC-returns RESOLVE the DC (free-text dcRef is an error), guard qty ≤ sent − returned per line + header, flip the DC status in-commit, clear G3 WIP. JWL-05 GAN is a real gate: accept_jobwork_pcs approval-commit posts the received qty INTO G2 + clears G3, docKey GAN-<dcNo> makes double-accept impossible; before acceptance no stock moves. JWL-06 bill_jobwork aggregates received-not-billed per jobworker → ONE SalesInvoice (billType jobwork, INV-####), flips DCs 'billed' + billedInvoiceNo — the HFX-09 'billed' ghost RETIRED (the filter option + enum state return, now with a writer). JWL-07 jobworker material statement register (/jobwork/statement + list_jobworker_statement): per party × item out/in/loss%/WIP+aging from the ledger's process rows (G3 mirror legs excluded — they'd double-count). JWL-08 DECISION (spec §17-2): G3 'Jobworker Yard' WIRED as the WIP-at-jobworker godown (JW out parks G3 IN; GAN/RTN clear it — WIP is queryable stock; the seed stays). JWL-09 allotmentNo links the JW- DC to its AL- contract (allotmentId, AL- flips 'issued', the doc view navigates contract→DC) + checkProcessLoss wired on dyeing/knitting receipts (over-tolerance flags + prompts a rejection entry). Loop-closure test #2 (spec §15) GREEN: 100 out → 60+40 received → GAN → billed; sent 100/received 100/balance 0; stock round-trips G1−100, G3 parked+cleared, G2+100. 1213 vitest (+20; tool pins 230→232, menu 132→133, register 35→36, models 79→80 — all pin updates ride the M39 evidence), tsc src/ 0, eval --static PASS, context_check 595/595 NO DRIFT, LIVE browser-verified (JW-0001 form-door round-trip: plan card with G1-OUT/G3-WIP/ITC-04 sideEffects → doc-view lines table + ITC-04 + recon cumulative math → statement row out 25/WIP 25/loss 100%; live data reverted). **Next per spec §16**: Batch 4 PAY-01..08 (money integrity — PaymentAllocation FIFO settlement, direction-correct links, SupplierBill, tolerance engine wired, aging) then Batch 5 PRC (procurement & dispatch closure).
35. **M30 DONE** (2026-08-30, SPEC-M30): legacy-forms alias hygiene — the §8-1 re-audit found 35 broken refs (18 renames/SQL-object aliases + 17 non-forms, all classified + test-enforced); parityStats denominator honest (272→249 countable); palette finds screens by REAL form names now; §8-2/3 header drifts fixed (ITEMS 132, 16/12 report split). 1036 vitest, tsc src/ 0, eval --static PASS, context_check 563/563, LIVE browser-verified. **Next (fourth six-task run, tasks 2–6)**: M31 working-day planner arithmetic (M28 OUT) → M32 voice TTS confirm loop (M24 OUT) → M33 barcode bundle flow (P3 #2) → M34 terms master feeding invoice print (A3 frmTerms) → M35 holidays digest adoption (M28 OUT).
36. **M31 DONE** (2026-08-30, SPEC-M31): working-day planner arithmetic — pure workingDayBreakdown/addWorkingDays (Sunday+holiday skipping, holiday-on-Sunday once, maxScan guard), db wrappers, Order Hub delivery-tile runway + amber-strip honest line, get_working_days tool (228). Bonus hygiene: the seed's holiday block is now idempotent (triple rows swept). 1057 vitest, tsc src/ 0, eval --static PASS, context_check 564/564, LIVE browser-verified. **Next (fourth six-task run, tasks 3–6)**: M32 voice TTS confirm loop (M24 OUT) → M33 barcode bundle flow (P3 #2) → M34 terms master feeding invoice print (A3 frmTerms) → M35 holidays digest adoption (M28 OUT).
37. **M32 DONE** (2026-08-30, SPEC-M32): voice TTS confirm loop — pending plans read aloud through browser speechSynthesis when the operator opts in (default OFF); approve/reject spoken acks; cancel-first so reads never stack. 1072 vitest, tsc src/ 0, eval --static PASS, context_check 565/565, LIVE browser-verified (toggle persists). **Next (fourth six-task run, tasks 4–6)**: M33 barcode bundle flow (P3 #2) → M34 terms master feeding invoice print (A3 frmTerms) → M35 holidays digest adoption (M28 OUT).
38. **M33 DONE** (2026-08-30, SPEC-M33): barcode bundle flow — the vendored Code128 encoder (byte-identical to python-barcode ×14 fixture samples; the hand-typed-table 46-drift lesson: GENERATE, never hand-type; the TO_C collapse ported), bundle-labels/bundle-label print docTypes + the PrintSheet label-card grid, the cut-order view 'Print bundle labels' door, get_bundle tool (229). LPP fixture repair (parallel-session db drift — eval --static 15/15 again). 1091 vitest, tsc src/ 0, eval --static PASS, context_check 570/570, route_smoke_m33 17/17, LIVE browser-verified (VLM-confirmed). **Next (fourth six-task run, tasks 5–6)**: M34 terms master feeding invoice print (A3 frmTerms) → M35 holidays digest adoption (M28 OUT).
39. **M34 DONE** (2026-08-30, SPEC-M34): terms master feeding invoice print — AppOption print.terms.invoice (newline-split lines) replaces the hardcoded fallback on the invoice print; /admin/options mentions the key; zero new tools (app-option doors already exist). 1102 vitest, tsc src/ 0, eval --static PASS 15/15, context_check 572/572, route_smoke_m34 12/12, LIVE browser-verified (VLM-confirmed). **Next (fourth six-task run, task 6)**: M35 holidays digest adoption (M28 OUT — the digest gains the shutdowns section).
40. **M35 DONE — FOURTH SIX-TASK RUN COMPLETE** (2026-08-30, SPEC-M35): holidays digest adoption — the digest's shutdowns section (14d window, silent when empty) + the amber page card + get_daily_digest (230, the restored Phase-4.5 promise). 1112 vitest, tsc src/ 0, eval --static PASS 15/15, context_check 574/574, route_smoke_m35 12/12, LIVE browser-verified (VLM-confirmed). **Run totals (M30–M35)**: 1036→1112 vitest (+76) · tools 228→230 · context_check 565→574 · 6 specs frozen · 6 route smokes NEW · every surface LIVE browser-verified. **Next candidates**: register long-tail polish · SPEC-M9 §9 P3 residuals (multi-company #1) · the M33/M34 OUT items (label sticker stock, terms on po/dc families) · or a fresh user-directed lane.









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

41. **QOL1-RECONCILE DONE — the sixth-race adoption + SPEC-QoL1 landed on the M39 line** (2026-09-01).
    The qol1/M30 parallel line (cbd7c91→8dc15ad) is preserved on origin `qol1-m30-alt`;
    remote main (M39, c8a9015) adopted locally as canonical. Audit verdict: M38/M39 had already
    closed D-3 (TOCTOU — CHAT-06 turnId + stored-args + drift-compare, better than our approvalId),
    D-4 (HFX-16 narration segments), D-5 (HFX-14 real streaming), markdown (HFX-15), Stop, and the
    step-budget visibility (CHAT-12). Landed here: D-2 (malformed tool-call JSON now becomes an
    error TOOL RESULT the model can retry from — the turn survives), D-1b (the approve door runs
    the SAME normalizeArgs+parseWithCoercion stack BEFORE execute; the legacy raw-args path is
    closed), parse-with-coercion.ts is the canonical shared module again (inline duplicate
    deleted), the ghost tool `accept_supplier_bill` removed from the prompt (probe: 224-name sync,
    registry 232 unchanged), PROMPT_VERSION → m39.1-2026-09-01 (eval report artifact now tracks
    version on --static refresh), SPEC-QoL1 doc + qol_prompt_sync.mjs probe restored, and two
    inherited suite reds fixed (the date-rolling holidays Monday pin; db/backups snapshot via
    OPS-01 backup_db.py). Gates: 1213+15=1228 vitest · tsc src 0 · eval --static PASS ·
    context_check 595→604 NO DRIFT. PITFALLS #8 amended for the persistent .pat-token.
    **Next**: the Phase-6B roadmap continues (Batch 4 money, SPEC-M40+) or user-directed lane.

42. **M40 DONE — PHASE-6B BATCH 4 (MONEY INTEGRITY) SHIPPED — SEAMS 3+4 CLOSED** (2026-09-01, SPEC-M40): the 7 PAY FRs from the remediation spec §7 (+ PAY-08 explicitly deferred per §17-3 — cheque/PDC stays the owner's open decision, no dead columns). PAY-01 PaymentAllocation {paymentId, invoiceId?, billId?, amount, reversedAt} — allocation rows are the ONE settlement truth: planPayment allocates FIFO (explicit target capped at outstanding; no target → walks the party's open invoices/bills oldest-first; remainder = labeled on-account credit), and invoice/bill status DERIVES from Σ active allocations inside the commit (the M3 single-shot `amount >= billAmount - 0.01` flip retired; 'partial' joins the invoice fleet — 'paid' kept as the settled state, legacy vocabulary, every state has a writer). PAY-02 direction-correct links: in-payments attach SalesInvoice (invoiceNo), out-payments attach SupplierBill (billNo); cross-direction tags rejected with guidance (wage payments: WAGE_PAYMENT_SCHEMA now omits invoiceNo/billNo — payouts are always on-account). PAY-03 the SupplierBill document: SB-#### via the doc-config engine (billNo/billDate/tax-split/dueDate/status; lines linked to GRN lines; one OPEN bill per GRN guarded); create_supplier_bill docTool + form door share planSupplierBill (ADR-001); create_bill_pass is the REAL gate (draft→passed; find-or-create supplier_bill Approval rides the BILL — the M5 GRN-keyed ghost retired; register + list_supplier_bills json rewritten SB-based). PAY-04 the tolerance engine is LIVE: creation + the gate run threeWayMatch (PO vs GRN vs bill) + checkGrnVsPo (retrospective over-receipt) + checkEntryDate (back-dating) and STORE matchStatus/variance/verdicts; BLOCK verdicts refuse the pass; tds_default_percent finally consumed (bill TDS default + net payable); flags still unwired recorded honestly (po_bud* → Batch 5, i_s* → their doors). PAY-05 honest AP: chain-money AP = open bills (passed/partial/paid) − Σ active bill allocations — the iteration-order GRN-minus-paidOut guesswork RETIRED; received-not-billed is a labeled MEMO column (register + report), never owed until a bill passes; supplier-pending gains the memo per PO + total. PAY-06 money-voucher cancel/reversal: CANCEL_PLAN + client keyset extend to payment/journal/debit-note/expense/budget with CONTRA legs (CN-#### mirror vouchers, accounts swapped — audit preserved, nothing deleted; allocations flip reversedAt + statuses re-derive; JV-* companions + CN-* system rows refuse with guidance); planCancelInvoice guards (live IRN blocks; active allocations block with the voucher names; legacy-paid refuses with guidance); +5 agent cancel tools. PAY-07 SalesInvoice + dueDate/creditDays (planInvoice computes due = invoice + credit days); AR aging anchors on dueDate (fallback invoiceDate), buckets widened to the spec's 0-30/31-60/61-90/90+; HFX-05 on-account FIFO application stays; the advance beyond outstanding is now the visible onAccount column. Tests: tests/pipeline/pay-batch4.test.ts NEW 17/17 (loop-closure #3 + #4 + per-FR behavioral pins + source contracts + the PAY-08 deferral pin); inherited suites updated for the new truth (doc-parity #18, industry-chain #14, doc-configs payment form-door, register/report-services supplier-bills + outstanding, approval-kinds bill-pass gate, wage-payments schema mirror, tool/menu/registry pins 232→238, 133→134). PROMPT_VERSION m40-2026-09-01 (§money rewritten: SB flow, FIFO semantics, reversal verbs, few-shots folded to the 8 cap). PITFALLS #43 (Prisma SQLite DateTime = INTEGER epoch-millis — raw fixture INSERTs with ISO strings P2023). Gates: 1245 vitest · tsc src 0 · eval --static PASS · context_check 604/604 NO DRIFT · route_smoke_m40 15/15 LIVE (zero residue). **Next per spec §16**: Batch 5 PRC-01..09 (procurement & dispatch closure — multi-line GRN, PO amendment, purchase return) — PAY-08 (cheque/PDC) awaits the owner's §17-3 decision.

45. **M41 DONE — PHASE-6B BATCH 5 (PROCUREMENT & DISPATCH CLOSURE) SHIPPED — SEAMS 1+5 CLOSED** (2026-09-01, SPEC-M41): the 8 PRC FRs from the remediation spec §8 (+ PRC-09 explicitly deferred per §17-6 — cumulative DC→invoice stays the owner's open decision, no dead columns). PRC-01 multi-line GRN: GRN_SCHEMA gains lines[] {itemType, itemCode, qty, rate?} (itemCode addressing resolved to itemId via the item models — POLine/GRNLine carry NO itemCode column, the PITFALLS #21 id-map reflex in its third guise); per-line receivedQty increments, PO status derives from ALL-lines coverage (received/partial/open — the header-qty comparison retired); per-line ledger IN rows + stock bumps; the HFX-01 >1-line refusal RETIRED (test amended to pin the header-qty ambiguity guidance); the legacy single-line header path byte-identical. PRC-02 planPoAmend (the planOrderAmend twin, in posting/lifecycle.ts): deliveryDate/status/notes + line revisions; totals recompute ONLY when lines moved (header-only amendments leave them); the [amended YYYY-MM-DD] notes trail; qty-below-already-received refuses (receive-then-return via PRN); cancelled/completed POs refuse; update_purchase_order agent tool + /procurement/po/amendments form door (amendPoAction via runCommit). PRC-03 planPurchaseReturn (posting/purchase-return.ts NEW): PRN-#### on the GRN table (grnType='purchase_return' — the RTN-/MP- family precedent); per-GRN-line guard qty ≤ received − rejectedQty (cumulative); StockLedger purchase_return OUT + bucket bumps via postLedger; GrnLine.rejectedQty increments (schema +); the PO untouched (goods WERE received — supplier-pending reads bills per PAY-05); optional linked DebitNote (DN-####, amount = return value, reason carries the PRN — ties PAY-03); create_purchase_return docTool + list_purchase_returns read tool + /procurement/purchase-return DocScreen + purchase-return doc-config. PRC-04 the PO approval gate is REAL: new flag po_appr (commercial, default false — legacy behavior preserved); planGrn reads the Approval row (entity 'po') when armed and REFUSES pending/absent with the approve-first guidance (the create-PO sideEffects claim becomes conditionally true). PRC-05 the DC lifecycle: planDcTransition({dcNo, to: despatched|delivered}) — the LAD CONVERSION (loading→despatched, the LAD- number stays as permanent identity — StockLedger docNo/docKey integrity) and DELIVERY (terminal, deliveredAt stamped, aging stops); guards (already-at-target, terminal, draft); deliver_dc docTool + the DcLifecycleActions view row (Convert/Mark delivered, hidden at terminal states) + dcTransitionAction form door (both via runCommit); the despatch day-book register (/dispatch/register + csv twin): DC+LAD rows, age anchored at deliveredAt ?? despatchDate, the PRC-07 gate-pass join column, totals (DCs / pcs / not-delivered / without-gate-pass); PITFALLS #21 hit AGAIN in the register (PcsDespatch.orderId/buyerId plain FK cols — id-maps + id-scoped search). PRC-06 gendcdays WIRED: digest gains the nonReturn section (JW-family DCs status sent/partial with outstanding, outDate older than the flag's days, capped 25 oldest-first; fully-returned rows skip; flag 0 = section silent; text block appears only when non-empty — the M28 discipline). PRC-07 gate link: planGateEntry refDocNo validated against REAL doc numbers (PO/GRN/SO/DC/LAD/MDC/PDC/JW/SB/INV/GE/GP families — the M5D parity test caught the missing SO family) with startsWith suggestions (≤8, the jump.ts reflex); blank stays allowed; planClearGateEntry (logged→cleared, append-only); the register gatePass column + the MIS 'DCs without a gate pass' recon card (silent when clean). PRC-08 logistics fields: PcsDespatch + lrNo/transporter/freight/cartons/grossWeightKg (all nullable, no backfill); DESPATCH_SCHEMA + the despatch/courier-dc/loading doc-config headerFields + the pcs-despatch print meta rows (blank-safe '—'). Tests: tests/pipeline/prc-batch5.test.ts NEW 13/13 (loop-closure #1 + #5 + per-FR behavioral + guards + source contracts + the PRC-09 deferral pin); inherited suites updated (chat-batch2 + qol1 version pins m40→m41 + counts 238→243; menu 134→137; flags 32→33 ×5 spots + commercial 5→6; doc-configs purchase-return + grn lineFields mirror + variant logistics fields + select options {value,label}; register-configs 36→37 + ROUTE_BY_SLUG + csv; doc-view-actions new-route; hfx-batch0 HFX-01 amended; legacy-aliases honest legacyForms; prompt few-shots folded to the M10 cap of 8 with the PRC scenarios merged in; ~11 count pins). PROMPT_VERSION m41-2026-09-01 (§procurement/§despatch/§goods-movement rewritten + 4 PRC few-shot scenarios folded into the 8). PITFALLS #44 (POLine/GRNLine carry itemType+itemId only — itemCode addressing resolves via the item models; doc-config select options are {value,label} objects never bare strings). Gates: 1263 vitest · tsc src 0 · eval --static PASS (promptVersion m41-2026-09-01) · context_check 604/604 NO DRIFT (14 pins) · route_smoke_m41 NEW 17/17 LIVE · LIVE browser E2E (Mark delivered click → status delivered + deliveredAt in DB → reverted; register + DC view + MIS zero console errors; screenshots download/m41-despatch-register.png + m41-dc-view-deliver.png) · zero residue. **Next per spec §16**: Batch 6 INV-01..08 (stock take & valuation unification — StockTake cycle, one WAC valuation, no silent truncation, negative-stock guard) — PAY-08 (cheque/PDC §17-3) + PRC-09 (cumulative DC→invoice §17-6) + PRG-02 (multi-style orders §17-5) all await the owner's decisions.

46. **M42 DONE — PHASE-6B BATCH 6 (STOCK TAKE & VALUATION UNIFICATION) SHIPPED — SEAM 6 CLOSED** (2026-09-02, SPEC-M42): the 8 INV FRs from the remediation spec §9, zero deferrals (§17's eight decision items are all outside INV scope). INV-01 stock take cycle: StockTake/StockTakeLine models (relation-less FK, the SupplierBill precedent), ST-#### via the numbering registry; lines snapshot every live CurrentStock bucket of the godown across ALL FOUR uoms (kgs/mtrs/pcs/bags — buckets are multi-uom); planStockTake / planStockTakeCount / planStockTakeAdvance services + create_stock_take / record_stock_counts / advance_stock_take docTools + the /inventory/stock-take list+[id] pages + form actions (one service, both doors — ADR-001); state graph open→counting→draft→committed with one-legal-step guards, draft requires every system-non-zero uom counted, committed is terminal; COMMIT mints one ADJ-#### per (line, uom) non-zero variance INSIDE the transaction (docKey-anchored, rate = the bucket's current WAC — a correction reprices nothing, notes 'Stock take ST-#### — count variance'), stamps committedAt; count-sheet print docType 'stock-take' (PRINT_DOCS + fetchStockTakePrint). INV-02 one WAC: valuation.ts gains primaryUomOf/primaryQtyOf/wacStep (the shared recurrence); bumpStock's update branch blends rate = (max(0,oldQty)·rate + inQty·inRate)/(max(0,oldQty)+inQty) on priced in-branches weighted by the PRIMARY uom, outs and unpriced ins never reprice; postLedger passes m.rate through; closing-stock REWRITTEN as groupBy qty + batched (5000/batch, unbounded loop) ordered (docDate,createdAt) replay of the IDENTICAL recurrence; current-stock register switched from inline qty×rate to valueBucket; dashboard already there — golden test: bucket rate == replay rate == hand-computed WAC, register Value total == closing-stock total == 1300 on the fixture, dashboard tile == inrL(same buckets). INV-03: the take:5000 caps RETIRED (closing-stock groupBy + batched replay; itemwise groupBy _count) — a 5201-row single-item statement is COMPLETE (old code silently kept the NEWEST 5000 and dropped the opening balance of a cumulative statement); perf <300ms at 5201 + the M14 10k gate still green. INV-04: block_negative_stock flag (tolerance, default false = legacy warn-only) + assertNoOverdraft at postLedger (BEFORE the ledger write, inside the caller's tx, flag read out-of-tx on WAL) — over-issue refuses naming item/godown/on-hand/movement with the flag-off guidance; exact-zero boundary posts; rejection/shortage/transfer/despatch legs inherit it by construction (they all ride postLedger). INV-05: planWasteReceipt REWRITTEN from the stock-adjustment wrapper into the waste identity — waste_godown_code (default WASTE, auto-vivified find-then-create) + waste_scrap_rate (default 0) flags; ledger posts into the waste store at the scrap rate, never the good godown at the good item's rate; godownCode input re-semantics = the validated SOURCE godown (the M21 reason composition stays byte-identical); waste-% register (registers/waste-percent.ts + config + /inventory/waste-percent + csv twin): WST- kgs ÷ process_receipt kgs per item, zero-receipt rows show '—', the KPI legacy computed nowhere. INV-06: compareStockDrift (registers/recon.ts) — groupBy ledger sums vs CurrentStock buckets on the bumpStock bucket rule, both sides of every key, non-bucket rows skipped; consumed by the MIS 'stock drift' card (silent when clean) and the digest stockDrift section (|delta| DESC, capped 25, silent when clean — the daily cron ride = the scheduled compare). INV-07: opn_fy_gate + opn_fy_window_days (default off/30 — legacy preserved); planOpeningStock refuses outside [active FY start, start+window] naming the FY + dates + the ADJ- alternative; no active FinYear + gate on = actionable refusal. INV-08: StockLedger +@@index([itemType,itemId]) +@@index([godownId]) +@@index([txnType]) (db push; verified live via sqlite_master). Tests: tests/pipeline/inv-batch6.test.ts NEW 40/40 — loop-closure #6 (seed → ST- → short counts → committed → ADJ- legs reference the ST- → CurrentStock == counts → closing-stock agrees) + the golden WAC + 5201-row completeness + the guard matrix (both doors) + waste-% KPI + drift vectors (compare + digest) + the OPN window + index/numbering/route/print/tool pins + source contracts (incl. the getFlag pure-read deadlock regression pin). Inherited suites updated: tool counts 243→246 ×13 spots, version pins m41→m42 ×2, flags 33→38 ×3 + category counts, menu 137→139 ×2, register-configs 37→38 + waste-percent ROUTE_BY_SLUG + agentTools declared (get_stock_ledger, the closing-stock precedent), print families 23→24 + stock-take in NON_CONFIG_DOORS, legacy-aliases honest legacyForms (stock-take: legacy had NO verification form — grep-verified). PROMPT_VERSION m42-2026-09-02 (§1 inventory domain map + §2-4 goods-movement heuristic + §3-8 few-shot folded + §8 ST-#### numbering). REAL BUGS caught by the batch's own tests: (1) getFlag→ensureFlags wrote on the GLOBAL connection inside the open transfer transaction — SQLite WAL single-writer deadlock, both sides waited, the 5s interactive-transaction timeout killed the commit; getFlag is now a PURE READ (coerce(undefined,def) already falls back to the registry default — seeding stays in setFlag/getFlags where no transaction holds the write lock); (2) the shared 'select {id, code, styleNo}' id-map asked yarn/fabric/accessory for styleNo (a STYLE-only column) — Prisma validation error swallowed by .catch into EMPTY code maps, so drift vectors / the count-sheet print / the stock-take view fell back to raw cuids as item codes; per-model select now (PITFALLS #45). Gates: 1309 vitest · tsc src 0 · eval --static PASS (m42-2026-09-02) · context_check 604/604 NO DRIFT (15 pins updated to the M42 truth). **Next per spec §16**: Batch 7 PRG-01.. (program-flow revival — nine-column balance waterfall, BOM×qty requirement computation, buyerPoRef/orderType/delivery splits) — PAY-08 (§17-3), PRC-09 (§17-6), PRG-02 (§17-5) owner decisions still open.

47. **M43 DONE — PHASE-6B BATCH 7 (PROGRAM-FLOW REVIVAL) SHIPPED — DIVE-1 CLOSED** (2026-09-02, SPEC-M43): the 5 PRG FRs from the remediation spec §10, zero deferrals (PRG-02 ships flag-gated default-OFF exactly as the spec prescribes — §17-5 stays the owner's decision). PRG-01: Order +buyerPoRef/orderType(export) + the OrderDelivery model {seq,qty,date,notes} (+@@index orderId); ORDER_SCHEMA gains buyerPoRef/orderType/deliveries[] (all optional — every existing caller byte-identical, pinned); planOrder creates delivery rows in-commit; planOrderDeliveries (posting/order-deliveries.ts) is the REPLACE-set service (over-total + cancelled guards) behind BOTH the set_order_deliveries docTool AND the Order Hub Delivery-schedule FamilySection (delivery-forms.tsx + delivery-actions.ts, the stock-take custom-form precedent); order-register gains the orderType select filter (REGISTER_FILTER_KEYS + RegisterQuery.orderType + parseRegisterQuery) + buyerPoRef column + buyerPoRef in q-search; fetchOrderPrint carries Buyer PO meta + the multi-shipment schedule note (blank-safe). PRG-02: multi_style_orders flag (module, default false); ORDER_SCHEMA.lines[] gains optional styleNo; planOrder resolves per-line styles flag-gated — OFF + differing style REFUSES naming the flag (the agent self-corrects), ON stores per-line styleIds; order line grid gains a Style picker. PRG-03: PROGRAM_SCHEMA gains colourCode/designCode/finDiaCode/finGsm/ll; planProgram resolves the masters (Dia by VALUE — no code column) and MERGES non-blank spec fields onto the ProgBalanceFabric find-or-create (an existing spec is never clobbered by blank inputs — pinned); planProgramSpecCorrection (posting/program-spec.ts) updates spec fields through runCommit (AuditLog after-image pinned) + correct_program_spec docTool + the program view Knitting-spec section (spec-forms.tsx + spec-actions.ts, relation-less FK id-map resolution — never include). PRG-04: queryProgramStatus gains poKgs/dcKgs/grnKgs/finishedKgs (ONE ledger pass it already made + ONE order-scoped POLine pass; the register row object EXTENDS, the frozen get_program_status json untouched — pinned); the register config declares PO'd/DC'd/GRN'd/Finished; the DEAD TRIO DELETED (posting-engine.ts + movement-matrix.ts + projectors.ts = 811 unreachable lines; posting-engine's tx.pcsStock referenced a model that never existed — a landmine, not a plan; the projector CONCEPT becomes this read service). PRG-05: proposeProgramRequirements (registers/program-proposal.ts) — per-STYLE order qty denominators (Σ OrderLine.qty by styleId, multi-style honest), × BomLine qty × (1+boostupper%+reserveper%) (the FN_Add_BoostupPer parity flags consumed at last), per-model display names (yarn count/blend, fabric construction/gsm); BOM-missing refuses with create-the-BOM-first guidance; propose_program_requirements read tool (production domain, delegates — the get_program_status precedent); /programs/propose page (propose-forms.tsx useActionState rows + createProgramFromProposalAction → planProgram + runCommit — one service, both doors) + menu item program-propose (arch IN, 139→140) + LIVE_ROUTES. PROMPT_VERSION m43-2026-09-02 (§1 orders/production domain lines + §3 routing few-shot folded + §5 PHASE-2 ingestion: buyerPoRef + deliveries[] + deliveryDate = FIRST shipment + §6 chain step 3 the propose-first reflex). Tests: tests/pipeline/prg-batch7.test.ts NEW 25/25 — the spec §10 walkthrough (order → program → POLine → DC out → receipt back → waterfall columns close: po 120/dc 100/grn 90/finished 60 hand-computed) + per-FR behavioral + guards + source contracts + the frozen-json pin. Inherited pins updated (~19 spots: tools 246→249 ×13, flags 38→39 ×5 + module 5→6, menu 139→140 ×3, PROMPT_VERSION ×2, doc-configs deliveries mirror-skip (the AGENT_ONLY_HOOK_KEYS precedent — the schedule's form door is the Order Hub editor), register-configs 142-total tool pin, REGISTER_FILTER_KEYS +orderType). Gates: 1334 vitest · tsc src 0 · eval --static PASS (m43-2026-09-02) · context_check 604/604 NO DRIFT (11 pins bumped in the SAME commit — PITFALLS #37) · route_smoke_m43 NEW 31/31 LIVE · browser E2E: propose page → 191-row S-1001 proposal → per-row Create → PGM-0183 committed (form door through planProgram + runCommit) → fully reverted; ZERO console errors. Schema: +OrderDelivery +Order.buyerPoRef/orderType (db push, zero residue). **Next per spec §16**: Module K CST-01..04 (costing depth — component library, computed cost sheet, est-vs-actual, daily-P&L material leg; INV-02 WAC dependency SHIPPED) or Module L payroll (L-01 wage reconciliation — the last structural P0) — PAY-08/PRC-09/PRG-02 owner decisions still open.

48. **M44 DONE — MODULE K COSTING DEPTH SHIPPED (SPEC-M44, CST-01..04, zero deferrals)** (2026-09-03, Module K = "Batch 8" in the §16 sequencing; INV-02 WAC dependency shipped in M42): CST-01 the component library — `CostComponent` {code CC-#### auto, name, category fabric|trim|cm|washing|packing|overhead|other, unit display-text, rate, active} riding the M2 MasterTable engine (42nd master config; /masters hub — no menu item, the HSN precedent); `create_cost_component`/`update_cost_component` factory tools + `list_cost_components`. CST-02 the calculator — `CostSheetLine` model {head, source bom|component|manual, componentId/itemType/itemId resolved ids (PITFALLS #44), qty, rate, amount, notes} + CostSheet.lines relation; `COST_SHEET_SCHEMA` gains `lines[]` {head?, source, itemType?, itemCode?, componentCode?, qty?, rate?, amount?, notes?} + the agent-only hook `computeFromBom` (the GRN reprocess precedent — AGENT_ONLY_HOOK_KEYS); planCostSheet REWRITTEN: three sources resolve server-side (bom → BomLine.rate fallback bucket WAC; component → the library rate, inactive refuses; manual → amount or qty×rate), head inference when blank (bom itemType / component category / default overheads), head totals DERIVE from lines when a head has them (header floats stay the no-lines legacy path — pinned byte-identical), totalCost = Σ heads, perPc = totalCost/totalPcs, **marginPct COMPUTED = (selling − cost)/selling × 100 stored** (input overridden — the honest-claims liar retired); computeFromBom pre-seeds BOM×qty (BomLine.qty per-garment, the PRG-05 semantics; explicit lines win for the same item); both cost-sheet doc-configs gain lineFields+linesKey (the form door line editor); the [id] view renders the line grid (id→code maps) + the calculator totals band. CST-03 est vs actual — `registers/cost-compare.ts` pure read (ADR-002): orderCostActuals = cm Σ ProductionEntry.amount (order-scoped, rework EXCLUDED — the rework entry's cost sits in the good bundle it made), process Σ JobworkOrder.totalValue (order-scoped, cancelled excluded), fabric = CutOrder.fabricIssued × the style BOM fabric's WAC + the order's JW-out kgs-family legs × WAC, trim = JW-out accessory legs × WAC; `itemWacRate`/`itemWacRates` in NEW src/lib/erp/item-wac.ts (G1-bucket-first, deterministic — deliberately NOT valuation.ts which stays db-free); costComparison joins the LATEST sheet heads with deltas; the Order Hub cost-sheet FamilySection gains the est-vs-actual table (silent when no sheet AND nothing derivable — the M28 discipline); `get_order_cost` read tool (costing domain, one service both doors). CST-04 the P&L material leg — queryDailyPnl: materialPeriodTotal = Σ material OUT legs (txnType ∈ {process_delivery, stock_adjustment_less} — consumption: issued-to-processing or lost; internal transfers/returns excluded) of primary-uom qty × bucket WAC (NEVER the leg rate — JW legs carry the process charge), waste-godown legs excluded (the M42 scrap identity); totals band gains 'Material (period, WAC)'; **Net Margin = produced − wages − expenses − material** (the §11 formula — the P&L stops being wage-margin-only); material stays period-level like expenses (ERRATUM §13-1 — material legs carry no dept). PROMPT_VERSION m44-2026-09-03 (§Costing rewritten: library + calculator + est-vs-actual; 4 costing few-shots folded into the 8 cap; the masters line gains cost component). Tests: tests/pipeline/cst-batch8.test.ts NEW 18/18 — the golden costing case (BOM 0.2kg fabric @100 + 1 accessory @5 + component ₹3/pc × 100 pcs → fabric 2000/trim 500/packing 300/total 2800/perPc 28/margin 20.00 hand-computed), the back-compat no-lines pin, the mixed-heads pin, the guards matrix (unknown/inactive component, bom-without-itemType, no-BOM seed refusal, explicit-line-wins), versioning + cascade, the est-vs-actual walkthrough (wages 900 rework-excluded + cut 25kg×110 + JW 1000 + trim 500×4 with deltas 0/0/+200/−2000), the get_order_cost delegation + Order Hub source contract, the P&L material pin (15kg × WAC 12 = 180; leg rates 8/0 ignored; waste-godown + transfer + return legs excluded; net-margin formula), itemWacRate G1-preference. Inherited pins updated: tool counts 249→253 ×14 spots + version pins m43→m44 ×4 + master-configs 41→42 ×3 + master-parity inputFor + AGENT_ONLY_HOOK_KEYS +computeFromBom + the doc-configs lineFields mirror (notes lineField added). REAL BUG the browser gate caught (the service-level parity test CANNOT): the cost-component config initially omitted the `code` field from fields[] — create worked (auto-assign) and the agent tool worked (key rides the args) but the MasterTable EDIT SHEET had no code input to submit, so form updates failed 'code: required' — fixed with the mill/thread-type code-field pattern; PITFALLS #47 (also records the WAL-checkpoint-after-db-push ritual). Gates: 1355 vitest (1334 + 18 + 3 parity loop) · tsc src 0 · eval --static PASS (m44-2026-09-03, registry 245) · context_check 604/604 NO DRIFT (7 pins bumped same-commit) · LIVE route smoke (all M44 surfaces 200 after the Prisma-client restart) · browser E2E: masters create+UPDATE through the form (category → packing persisted), cost-sheet line editor (CC-0001 × 5000 → pack ₹12,500 · per-pc ₹2.5 · margin 37.5% computed · committed to DB · line row stored), Order Hub est-vs-actual section live (CM ₹32,400 from real production data), daily-pnl Material row + summary formula; zero console errors on clean loads (one first-compile dev hydration blip, clean on reload — the M43 precedent); zero residue (E2E data reverted). Schema: +CostComponent +CostSheetLine +CostSheet.lines (db push, zero residue). **Next per spec §16**: Module L payroll (L-01 wage reconciliation — the last structural P0; L-02 PayrollRun/Payslip; L-03 statutory; L-04 attendance depth; L-05 employee payout fields; L-06 shiftWages resolved) or Module M final accounts — PAY-08/PRC-09/PRG-02/AM-1 owner decisions remain open.
49. **M44-FY DONE — FY SINGLE-SOURCE HOTFIX SHIPPED** (branch-numbered M44 / STATE #48; renumbered in the 2026-09-06 merge — main's #48 is Module K costing; the spec file is SPEC-M44-FY-HOTFIX.md) (2026-09-02, SPEC-M44 FY-01): the 2027-04-01 time bomb defused — the default financial year is decided in EXACTLY ONE place. `numbering.ts` gains `fyCodeFor(dateStr)` (pure, Indian Apr 1–Mar 31 derivation) + `fyCodeToday()` (IST); `activeFinYear()` = the FinYear row the owner marked ACTIVE at /admin/company, falling back to the derived code only when no row is active — never a frozen literal. All ~24 posting-service hardcodes (`const finYear = '26-27'` + inline `finYear: '26-27'` data literals across 16 services incl. grn ×7 / payment ×3 / roll-split ×2 / invoice ×2) + `adjust_stock` in tools.ts + context.ts's `.catch` fallback now call `activeFinYear()`; explicit `args.finYear` still wins for historical documents (unchanged, pinned); purchase-return still inherits the source GRN's FY first. Honest claims (T2): the 2 tool docstrings + 3 zod describes that said "defaults to current 26-27" now say "the active financial year". `scripts/seed.ts` FIN_YEAR/start/end/name derive from one ANCHOR_YEAR=2026 constant (the demo dates are fixed 2026 — wall-clock derivation would desync the seed after 2027). NO prompt/tool/route/menu/flag/schema changes → PROMPT_VERSION stays m43-2026-09-02, eval --static registry unchanged. Tests: tests/pipeline/fy-hotfix-m44.test.ts NEW 11/11 — the fyCodeFor boundary matrix (Apr 1 / Mar 31 both sides + century wrap 99-00/00-01) + active-row equivalence (future-proof: stays true the day 27-28 is activated — no literal pinned anywhere, the test itself is not a 2027 bomb) + the no-active-row fallback (DB restored in finally) + behavioral planExpense→runCommit commits with the ACTIVE row's code + explicit-args-win (plan-only) + source contracts (zero `'26-27'` literals across the WHOLE posting dir — enumerated, never hand-listed — plus tools/numbering/context/seed; the 3 schema describes landed). Gates: **1345 vitest** (1334+11) · tsc src 0 · eval --static PASS (m43-2026-09-02) · context_check 604→**606/606** NO DRIFT (2 new pins, zero bumped — a pure hotfix) · no new routes → no route-smoke addition; backend default only, both doors flow through the same services (pinned). Rollover recipe for 2027: create FinYear 27-28 at /admin/company → activate it — every posting service follows with ZERO code changes (the acceptance criterion). Environment notes this session: sandbox reset wiped .pat-token (push pending re-supplied PAT), the OPS-01 backup snapshot regenerated (backup_db.py), and a filemode-100755 sweep + a gremlin-deleted src/app/api/upload/route.ts were both restored (PITFALLS #39 checks; tree clean before commit). **Next**: Module L payroll (L-01 wage reconciliation — the LAST structural P0) or Module K costing (CST-01..04) per remediation spec §16; PAY-08/PRC-09/PRG-02 owner decisions still open.
50. **M45 DONE — MODULE L BATCH 1: WAGE RECONCILIATION SHIPPED — THE LAST STRUCTURAL P0 CLOSED (loop-closure #3 GREEN)** (2026-09-02, SPEC-M45 L-01): "How much do I still owe operator X" is finally answerable. (a) `Employee.partyId` (@unique, nullable — 1:1) + `Party.employee` back-relation (db push); `ensureEmployeeParty` (posting/employee-party.ts) find-or-create + link, called from the master-service CREATE commit (the finYear-invariant hook seam — BOTH doors: agent create_employee + the masters form) with the linkage declared in sideEffects BEFORE approval; party code = employee code, `-W` suffix on non-employee collisions, clash-with-another-employee throws honestly; idempotent (pinned). scripts/backfill_employee_parties.ts ran once: 10/10 employees linked, zero unlinked remain. (b) planProductionBill with operatorCode resolves+ensures the operator's party and stamps the journal `partyId` (per-operator bills hit the party ledger; aggregate bills stay party-less with an honest sideEffect naming the limitation) — commit result carries partyCode. (c) THE OPERATOR STATEMENT — registers/operator-statement.ts + register-config + /hr/operator-statement page + csv twin + menu 140→141 (hr group, arch RG, phase M45) + LIVE_ROUTES 175→176 + `get_operator_statement` read tool (tools 249→250, hr domain, the list_jobworker_statement precedent): per operator earned (Σ ProductionEntry.amount, prodDate window) − paid (Σ ALL out-payments to the linked party, payDate window) = owed; ALL-TIME default (the owed question is cumulative); from/to window BOTH legs on their own date columns; zero-activity operators stay silent; unlinked legacy rows show party '—' + paid 0 (honest, no code-guessing — the M40 wages-register code-matching interim RETIRED, it resolves through Employee.partyId now). (d) PROMPT_VERSION m45-2026-09-02 (§1 HR line: the statement + the auto-linked employee-party). **REAL BUG the batch's gates caught (§2-0)**: the party-ledger formula `billed − debit − journals − received + paid` counted the planPayment COMPANION journals (JV-*, voucherType receipt/payment, partyId) in −journals while the same cash was already in the Payment legs — EVERY receipt ever posted subtracted twice; live probe CUS001: formula balance −₹34.0M vs true AR ≈ ₹4.3M. Fix: the journals term counts `voucherType in ('journal','contra')` only (manual journals + PAY-06 contra legs; companions' cash lives in the Payment rows) — the wage loop now closes in the ledger too (bill −1000 + payment +1000 + companion excluded = 0; the frozen get_party_ledger json SHAPE untouched; the pinned register-services fixture unaffected). Tests: tests/pipeline/payroll-l01.test.ts NEW 15/15 — employee auto-link (master door + idempotence) + LOOP-CLOSURE #3 GREEN (entry ₹1,000 → per-operator bill (journal CARRIES partyId) → pay_wages ₹1,000 → statement owed 0) + party-ledger agreement (totalJournal/totalPaid/balance) + wages-register agreement through the link + unlinked-legacy honesty + from/to independent windows + wiring/pins. Inherited pins ~23 spots same-commit (tools 250 ×15, menu 141 ×3, register configs 39 + slug list + ROUTE_BY_SLUG, PROMPT_VERSION ×3, pay-batch4 fixture now links the employee — the M45 truth). PITFALLS #47 (WAL sidecar vs raw copy — globalSetup copies -wal now; checkpoint after db push; + the JV-companion cleanup rule — deleting a Payment without its companion orphans the number and kills a PARALLEL worker's commit). Gates: **1365 vitest** (1345+15+5 per-config) · tsc src 0 · eval --static PASS (m45-2026-09-02, registry 242) · context_check 606/606 NO DRIFT (7 pins: tools 250, menu 141, routes 176, regcfg 29, regsvc 40, posting 43, m45 version) · route_smoke_m45 NEW 20/20 LIVE (incl. the LIVE arithmetic invariant: E001 owed ₹21,85,920 = earned − paid, en-IN formatted both ways; csv; q/party filters; 10/10 backfill) · browser E2E: /hr/operator-statement renders the full reconciliation table (E001 381 entries, ₹21,85,920) with ZERO console errors (download/m45-operator-statement.png) · schema: +Employee.partyId @unique +Party.employee (db push, checkpointed, zero residue). **Next per remediation spec §12**: L-02 PayrollRun+Payslip, L-03 statutory, L-04 attendance depth, L-05 payout fields, L-06 shiftWages — or Module K CST-01..04 / Module M final accounts; PAY-08/PRC-09/PRG-02 owner decisions still open.
51. **M46 DONE — MODULE L BATCH 2: PAYROLLRUN + PAYSLIP SHIPPED (L-02 + L-05)** (2026-09-03, SPEC-M46): the formal HR door the L-01 reconciliation always needed. (a) THE RUN — `PayrollRun` {runNo PR-#### (numbering registry payroll_run), mode piece|daily, from/to, status draft→committed (terminal), finYear} + `PayrollLine` {runId, employeeId, partyId (frozen — ensureEmployeeParty runs BEFORE lines freeze), days? (daily: present 1 / half 0.5 / absent 0), qty? (piece), earned, advances (Σ active out-payments to the employee-party, payDate window — the L-01 paid-leg definition), net} @@unique([runId, employeeId]); `planPayrollRun` (posting/payroll.ts): piece earned = Σ ProductionEntry.amount (operatorId, prodDate window — the statement ground truth), daily earned = days × dailyWage (wage-0 employees with attendance NAMED in the refusal, not silent); piece-window OVERLAP guard (a committed piece run over an overlapping window refuses 'double-credit' — production-bill overlap undetectable, said honestly in sideEffects); `planPayrollRunCommit`: one Journal PER LINE with partyId (V-#### minted INSIDE the tx, nextAdjNo scan pattern — a racing mint dies on the unique), Dr Production Wages (piece) / Staff Salaries (daily) / Cr Wage Payable, amount = FULL earned (advances already live as payments — paying the net afterwards closes the ledger to exactly 0: −earned + advances + net = 0, the §12 walkthrough, pinned). (b) THE PAYSLIP — PRINT_DOCS['payslip'] (fetchers-b fetchPayslipPrint, NON_CONFIG_DOORS the count-sheet precedent): resolves PayrollLine.id OR 'PR-####/EMP-####' (safeDecode — %2F arrives undecoded); committed runs ONLY (draft → null → 404: the payslip is a payment instrument); L-05 meta (designation/department/joining/period/basis/UAN/Aadhaar MASKED via maskTail — 12-char → XXXX-XXXX-tail4), earnings table (piece: qty basis; daily: days × rate basis), NET PAYABLE totals + amountInWords, pay-to block (bank/IFSC/UPI rows only when present), daily-vs-piece honesty notes; the run view links per line (DocPrintLink). (c) L-05 — Employee +joiningDate/designation/bankName/ifsc/accountNo/upi/phone/uan/aadhaar (additive-optional); master-config 9 new fields + Designation/Joined list columns (create_employee/update_employee extend automatically — the master-tool factory); stored as given, UAN/aadhaar printed MASKED (full values never leave the master surfaces). (d) SURFACES — /hr/payroll register (+csv twin + variant=mode/status/q filters, registers/payroll.ts groupBy sums — the service owns the math) + /hr/payroll/[id] (lines table, commit banner (PayrollForm useActionState — the StockTakeForm pattern), journals audit table by narration, payslips after commit) + actions (runCommit + revalidatePath layout, entity payroll_run) + create_payroll_run/commit_payroll_run docTools + get_payroll_runs read tool (tools 250→253, hr domain) + menu 141→142 + LIVE_ROUTES 176→178 + PROMPT_VERSION m46-2026-09-03 (§1 HR line: the run cycle + payslip fields). (e) FROZEN — the operator statement (L-01 shape AND formula: earned = entries, piece-rate only); daily-wage owed lives in the party ledger (get_party_ledger) + the run — documented in spec §4, not hacked into the statement. Tests: payroll-l02.test.ts NEW 29/29 — THE §12 walkthrough (attendance 2 present + 1 half + 1 absent → 2.5 days × ₹500 = ₹1,250 → run → journal partyId Dr Staff Salaries → payslip (masked UAN XXXX-XXXX-7890, composite form) → pay_wages 1,250 → LEDGER 0) + advances leg (pre-pay ₹300 in-window (explicit payDate) → net 1,200, journal still 1,500 → pay 1,200 → ledger −1500+300+1200 = 0) + piece mode (statement earned stays 1,000 — the run journal never double-counts the L-01-frozen statement) + guards (overlap/disjoint-never-overlap/zero-activity/wage-0-NAMED/unknown/double-commit/draft-payslip-404) + register filters + wiring/source pins (PRINT_DOCS 25 families, SEQUENCES.payroll_run, maskTail, config fields, update_employee schema carries aadhaar/ifsc). Inherited pins ~24 spots same-commit (tools 250→253 ×15 files, menu 141→142 ×4, print families 24→25 ×3 + NON_CONFIG_DOORS + payslip, regcfg 39→40 + slug list + ROUTE_BY_SLUG + json-shape count, versions m45→m46 ×4, register-configs per-config ×5). Gates: **1399 vitest** (69 files) · tsc src 0 · eval --static PASS (m46-2026-09-03, registry 245) · context_check 606/606 NO DRIFT (14 pins bumped same-commit: tools 253, docTools 72, models 88, menu 142, routes 178, regcfg 30, regsvc 41, schemas 45, posting 44, print 25, print doors 22, createdAt indexes 21, runCommit doors 22, m46 version) · route_smoke_m46 NEW 42/42 LIVE (register + columns + csv + filters + the seeded committed run walkthrough state (E005 2 days × ₹800 → view + journals table + payslip 200 + composite id + draft 404 + unknown 404) + FULL revert + menu/LIVE_ROUTES wiring + L-05 master columns) · browser E2E: PR-0001 created through the FORM door (daily, window Sep 1→3) → run view draft banner → Commit → DB verified (status committed + committedAt + V-0001 journal partyId Dr Staff Salaries/Cr Wage Payable ₹1,600 + finYear 26-27) → payslip print page renders (PAYSLIP/NET PAYABLE/L-05 meta/masked rows/daily note) → ZERO console errors → fully reverted (journal+run+attendance) · screenshots download/m46-payroll-register.png + m46-payroll-run-view.png + m46-payslip-print.png · schema: +PayrollRun +PayrollLine + Employee L-05 columns (db push, WAL checkpointed, zero residue). ENVIRONMENT repairs this session (PITFALLS #48): the M45 commit had SHIPPED the upload-route gremlin deletion — restored verbatim from the M44 blob (first full-suite run flagged it file-level red); sandbox-reset casualties regenerated (db/backups OPS-01 snapshot via backup_db.py; download/eval-routing-report.json via eval_routing.mjs --static). **Next per remediation spec §12**: L-03 statutory (PF/ESI/PT/LWF configurable rates + registers), L-04 attendance depth (cross-midnight, OT, leave model), L-06 shiftWages (ADR-019 owner decision) — or Module K costing (CST-01..04) / Module M final accounts; PAY-08/PRC-09/PRG-02 owner decisions still open. 6 LOCAL COMMITS pending push (m44 + m45 + m46) — PAT re-supply needed.
52. **M47-MERGE DONE — THE SIDE_QUEST MERGE SHIPPED (branch unified onto main)** (2026-09-06): the side_quest agent's 5 commits (8410188 spec-M44-FY, a7d8dd1 M44-FY hotfix, 439bcad spec-M45, 87a4a3b M45 wage reconciliation, 6c1be98 M46 payroll run + payslip — built on the m43 tip while main advanced its own M44 costing) merged into main's 4 (8ffc7c1, e06c4e7, 2500864, 6946379). WHAT THE BRANCH SHIPPED: (1) M44-FY — the 2027-04-01 fiscal-year time bomb defused (activeFinYear() single source, ~24 posting literals retired, seed ANCHOR_YEAR, fy-hotfix-m44.test.ts 11/11); (2) M45 — Employee 1:1 employee-party + ensureEmployeeParty + per-operator wage bills carry partyId + THE OPERATOR STATEMENT register (+csv, get_operator_statement) + THE REAL party-ledger receipt double-count bug fixed (journals term = journal|contra only — live CUS001 probe was −₹34M absurd vs true ≈ ₹4.3M), payroll-l01.test.ts 15/15; (3) M46 — PayrollRun PR-#### + PayrollLine + planPayrollRun/planPayrollRunCommit (one wage journal PER LINE with partyId, V-#### minted in-tx; piece = Σ production entries, daily = weighted attendance × dailyWage, 'half' = 0.5) + THE PAYSLIP print door (committed-only, UAN/aadhaar masked, composite 'PR-####/EMP-####' ids) + Employee L-05 payout fields (bank/IFSC/UPI/UAN/aadhaar) + /hr/payroll register+view+actions + create/commit_payroll_run + get_payroll_runs tools + menu 142 + LIVE_ROUTES 178, payroll-l02.test.ts 29/29. MERGE MECHANICS: 22 conflicts resolved (db/custom.db = main's blob + db push for the 2 new models; SPEC-M44.md add/add = main's costing spec + branch's FY spec preserved as SPEC-M44-FY-HOTFIX.md; test pins 253→257 ×15 files + PROMPT_VERSION→m47-2026-09-06 ×4; context_check pins recomputed from the merged tree; STATE/PITFALLS/worklog renumbered as above). Gates on the merged tree: context_check 606/606 NO DRIFT · vitest (numbers in the merge commit) · tsc src 0 · eval --static PASS. Next per the remediation spec §12/§16: L-03 statutory (PF/ESI/PT/LWF), L-04 attendance depth, L-06 shiftWages (ADR-019), or Module M final accounts; PAY-08/PRC-09/PRG-02 owner decisions open.53. **M48 DONE — MODULE L BATCH 3: STATUTORY PAYROLL SHIPPED (L-03)** (2026-09-06, SPEC-M48): PF/ESI/PT/LWF with configurable rates on the run, computed deductions, the statutory register + challan-data csv. (a) CONFIG — ONE AppOption row `payroll:statutory` (group 'payroll', JSON: pf{enabled,employeePct,employerPct,epsPct,wageCeiling}, esi{…,grossLimit}, pt{…,amount,grossThreshold,state}, lwf{…,employee,employer,state}); resolveStatutoryConfig (lib/erp/statutory.ts) never throws — absent/unparseable → SAFE defaults (the stable federal numbers ON: PF 12/12 ceiling ₹15,000 + ESI 0.75/3.25 limit ₹21,000; the state-churning PT/LWF OFF with the fields ready); editable at /admin/options (payroll group section — the options page + app-option master-config gained the group); seeded (scripts/seed.ts). (b) THE RUN — `statutory: true` OPT-IN on create_payroll_run + the form checkbox (default OFF = M46 nets byte-identical, pinned); when ON the resolved config is FROZEN onto PayrollRun.statutory (Json — a later rate edit never moves a drafted run) and PayrollLine gains pf/pfEmployer/esi/esiEmployer/pt/lwf/deductions (frozen): ESI skipped above grossLimit, PF wage = min(earned, ceiling), employee-side total CAPPED at earned (deduct order pf→esi→pt→lwf, capping NAMED in the plan text), pct heads Math.round; net = earned − advances − deductions; non-statutory plans whose config has heads NAG ('pass statutory: true'). (c) THE COMMIT SPLIT — J1 per line = earned − employee deductions (Dr Wages / Cr Wage Payable, partyId; SKIPPED when 0 — the deduction never flows through the employee-party ledger) + J2 per head (Σ>0): Dr the run's wage account / Cr 'PF|ESI|PT|LWF Payable', amount = employee + employer share, partyId = the find-or-create authority party (EPFO/ESIC/PT-BOARD/LWF-BOARD, partyType supplier — ensureStatutoryParties, idempotent); wage expense = Σ earned + Σ employer shares (honest); LOOP-CLOSURE #3 preserved (pay_wages the net → employee-party 0) and LOOP-CLOSURE #4 NEW (the authority party's LEDGER is the remittance tracker: −ΣJ2 + payments-to-it = pending; the register mirrors it, never a shadow sum). (d) SURFACES — payslip deduction rows only when > 0 (statutory-off payslips byte-identical) + the employer-share note; THE STATUTORY REGISTER /hr/statutory (+csv = the challan data export; committed runs × heads; variant=head filter; per-authority pending in the summary) + registers/statutory.ts + register-config + get_statutory_register read tool (tools 257→258, hr domain); the payroll register + run view gained Deducted column / statutory frozen-rates card + statutory journals in the audit table; operator statement owed = earned − paid − Σ committed piece-run line deductions (window-overlap aware) + the Deducted column — the "how much do I still owe X" answer stays 0 after statutory settlement (the 148 is remitted to EPFO/ESIC, not owed to the operator); PROMPT_VERSION m48-2026-09-06 (§1 HR line: statutory door + remittance guidance). Tests: payroll-l03.test.ts NEW 22/22 — pure computeStatutory (ceiling/limit/threshold/cap/exact-consumption), config fallbacks, THE WALKTHROUGH (S1 1,250 → PF 150 + ESI 9 + LWF 20 = 179 → net 1,071; S2 22,500 → ESI skipped over limit + PF on ceiling 1,800 → net 20,480; S3 23 → pf 3 + lwf 20 = exactly the wage → net 0, J1 SKIPPED) → commit (2×J1 + 4×J2 hand-computed 3,906/51/200/240) → payslip rows + employer note → pay_wages net → employee ledger 0 → EPFO pending 3,906 → record_payment the remittance → ledger 0 (loop-closure #4) + piece+statutory statement owed 0 (deducted 148) + statutory-off byte-compat + the nag + register/filters/wiring/source pins. Inherited pins same-commit: tools 257→258 ×17 files, menu 142→143 ×4, LIVE_ROUTES 178→179, regcfg 30→31 + regsvc 42→43 + config slug list (41 configs), PROMPT_VERSION m47→m48 ×7 files. Gates: **1447 vitest** (71 files) · tsc src 0 · context_check 606/606 NO DRIFT · eval --static PASS (m48, registry 250) · route_smoke_m48 NEW 45/45 LIVE (register + columns + csv + filters + the seeded statutory walkthrough PR-9481 (E005 2×₹800: pf 192/192 + esi 12/52 → net 1,396 + J1 V-9481 1,396 + J2 V-9482/V-9483 384/64) + run view statutory card + payslip deduction rows + /admin/options config door + FULL revert) · browser E2E: PR-0001 created through the FORM door with the statutory checkbox (daily, E005 2 days × ₹800) → run view (statutory card + Deducted 204 + employer cost 244) → Commit → DB-verified (V-0001 J1 1,396 partyId + V-0002 PF Payable 384 EPFO + V-0003 ESI Payable 64 ESIC) → payslip (Less: PF/ESI rows + NET 1,396 + employer note) → /hr/statutory live pending (PF EPFO: ₹384 · ESI ESIC: ₹64) → ZERO console errors → fully reverted · screenshots download/m48-run-view.png + m48-payslip.png + m48-statutory-register.png · schema: PayrollRun +statutory Json? + PayrollLine +7 deduction columns (db push, WAL checkpointed, seeded, zero residue). **Next per remediation spec §12/§16**: L-04 attendance depth (cross-midnight, OT, leave model), L-06 shiftWages (ADR-019 owner decision), Module M final accounts (M-01 CoA); PAY-08/PRC-09/PRG-02 owner decisions open.
54. **M49 DONE — MODULE L BATCH 4: ATTENDANCE DEPTH SHIPPED (L-04, zero deferrals)** (2026-09-06, SPEC-M49): cross-midnight attendance + overtime, both opt-in-frozen the M48 doctrine. (a) AT-01 CROSS-MIDNIGHT — post_attendance: outTime EARLIER than inTime = the shift ends the NEXT calendar day (VALID — the 22:00→06:00 factory night shift finally postable with real times); hours = (out − in + 24h) via the ONE spanHours derivation shared by plan + commit; the ROW stays on attDate (the start day — one-row-per-day and the payroll window semantics unchanged, no second row ever minted); outTime == inTime still REJECTED (0h is not a shift, error says the night-shift rule); the plan text/summary/sideEffects name the cross-midnight count; zod descriptions + docstrings honest. The M20 unit pin 'out must be after in' updated same-commit to the new contract (equal rejected; 14:00→06:00 = 16h). (b) AT-02 OT CONFIG — ONE AppOption row `attendance:ot` (group 'payroll', JSON {otMultiplier: 2, standardHours: 8} — the Factories Act §59 'twice the ordinary rate' convention, an ordinary 8h day); lib/erp/overtime.ts: normalizeOt (never throws, wrong-typed fields fall back, standardHours ≤ 0 → 8 — div-by-zero impossible) + resolveOtConfig (source: option|default) + computeOtDay (PURE, 2dp hours, per-day standard) + defaultOtJson; seeded (seed.ts + scripts/seed_ot_option.ts for the existing dev db); editable at /admin/options (payroll group — the hint text names the freeze + the shift-standard rule). (c) AT-03 OT ON THE RUN — `ot: true` OPT-IN on create_payroll_run + the form checkbox (daily runs ONLY — piece+ot is a LOUD error; default OFF = M46/M48 nets byte-identical, pinned); when ON the config is FROZEN onto PayrollRun.ot (Json) and per line per PRESENT day with hours: standard = the linked shift's hours (a 12h shift means 12h is the normal day — hourly = dailyWage ÷ 12) else the frozen standardHours; otHours = Σ max(0, hours − standard) (2dp); otPay = round(Σ otHours_day × dailyWage ÷ standard_day × otMultiplier); earned = round(days × dailyWage) + otPay (single new term, frozen on the line); OT accrues ONLY on present days (half = the weight is the wage basis; absent/leave times recorded but earn nothing); statutory (if also on) computes on the OT-INCLUSIVE earned — J1/J2 and loop-closures #3/#4 need ZERO changes (OT flows inside earned, pay_wages the net → employee ledger 0, PROVEN); no legal OT cap encoded (the plan text carries 'incl. OT ₹Y (N h beyond the per-day standard at 2×)' for human review); the nag when OT-able hours exist but the flag wasn't passed. (d) AT-04 SURFACES — payslip OT EARNINGS row only when otPay > 0 (base row = earned − otPay; OT-off payslips byte-identical) + the OT note; the run view OT frozen-config card (multiplier + standard + Σ hours + pay) + OT ₹ line column + the freeze note; the payroll register OT ₹ run column (groupBy _sum.otPay) + the incl-OT summary; the attendance day-book OT Hrs column + OT total in the summary (informational — the description says paid-only-with-ot: true); list_attendance returns OT hours; post_attendance/create_payroll_run docstrings; PROMPT_VERSION m48→m49-2026-09-06 (§1 HR line: the OT door + cross-midnight rule). Schema: PayrollRun +ot Json? + PayrollLine +otHours/otPay (db push, WAL checkpointed, seeded — 90 models stand). Tests: payroll-l04.test.ts NEW 19/19 — pure computeOtDay (hand-computed: shift-as-standard, zero guards, the standard ≤ 0 fallback, 2dp) + config resolution/fallbacks + THE WALKTHROUGH (E1 wage 800: night 22:00→06:00 shift-linked = 8h OT 0 · night 22:00→08:00 = 10h → OT 2h ₹400 · day 06:00→17:00 no-shift = 11h vs 8 → OT 3h ₹600; E2 half-with-11h-times no-OT proof) → plan freezes (days 3, otHours 5, otPay 1,000, earned 3,400 = 2,400 + 1,000; +statutory → PF 408/408 + ESI 26/111 → net 2,966) → commit (J1 2,966 partyId + J2 EPFO 912 + ESIC 153) → payslip OT row (base 2,400 + Overtime 1,000 → NET 2,966) → pay_wages the net → employee ledger 0 + piece+ot loud error + OT-off byte-compat (earned 2,400 exactly, no OT fields in creates, the nag names 2 OT-able days) + THE FREEZE (multiplier edit 2→3: committed lines stay 1,000, the NEXT plan earns 1,500) + registers (day-book otHrs 0/2/3 + OT hrs 5 total; payroll register ot 1,000) + wiring/source pins (schema, tool docstrings, form door, configs, prompt m49, options hint, seed). Inherited pins same-commit: PROMPT_VERSION m48→m49 ×8 files (7 old + prg-batch7's startsWith pin); M20 attendance unit pins → the cross-midnight contract; tools/menu/routes/regcfg/regsvc/models/schemas/posting counts ALL UNCHANGED (depth, not width — 258/143/179/31/43/90/45/44 stand). Gates: **1466 vitest** (72 files; 1447+19) · tsc src 0 · context_check 606/606 NO DRIFT (m49 pin swap; the sandbox-reset artifacts regenerated: backup snapshot + eval report) · eval --static PASS (m49, registry 250) · route_smoke_m49 NEW 32/32 LIVE (day-book OT Hrs + cross-midnight row + summary · payroll register OT ₹ + the OT checkbox · the seeded walkthrough PR-9491 (E005 cross-midnight 8h + 11h day → OT 3h ₹600 → earned ₹2,200 + J1 V-9491) → run view OT card/column/freeze-note → payslip OT row/basis/base/net/note → FULL revert + 404) · browser E2E through the FORM door: attendance seeded (10h cross-midnight + 11h day) → the OT checkbox → PR-0001 'Done — earned ₹2,600' (1,600 base + 1,000 OT) → run view (OT card + OT ₹ 1,000 + incl-OT header + freeze note) → Commit → DB-verified (status committed, ot cfg frozen {2, 8}, line otHours 5/otPay 1,000/earned 2,600, V-0001 Staff Salaries→Wage Payable 2,600 partyId) → payslip (Earnings 1,600 + Overtime '5 h beyond the 8h standard × 2×' 1,000 → NET 2,600 + the OT note) → day-book 'OT 3 h beyond standard' → ZERO console errors → fully reverted (screenshots download/m49-ot-run-view.png + m49-attendance-daybook.png). PITFALLS #50: a RUNNING dev server holds a STALE Prisma client after prisma db push + generate — new columns read as undefined on live surfaces with NO error (restart the server after any schema change; caught by route_smoke_m49's 9 silent fails, all green after restart). **Next per remediation spec §12/§16**: L-06 shiftWages (ADR-019 owner decision — the LAST Module L item), Module M final accounts (M-01 chart of accounts); PAY-08/PRC-09/PRG-02 owner decisions open.
55. **M50 DONE — MODULE M BATCH 1: CHART OF ACCOUNTS SHIPPED (M-01, zero deferrals)** (2026-09-06, SPEC-M50): the CoA substrate Module M's reports will group by — every journal leg now classifies to an Account row, the free strings stay as voucher detail, and the invariant 'a journal cannot save an unlinked account' is enforced at every door. (a) CA-01 THE MASTER — Prisma `Account {code @unique, name, type asset|liability|income|expense|equity, parentId self-tree, active}` (models 90→91, db push + WAL checkpoint + server restart) riding the M2 engine: master-configs/account.ts (slug account, codePrefix ACC-#### for user rows — the seeded tree uses classic numeric codes, parentCode as a SELF-FK via the master-service OVERRIDES account→parentId/parentName/parent — the waveC pattern), /masters/account auto CRUD, create_account/update_account factory tools + list_accounts door (tools 258→261, masters 42→43). (b) CA-02 THE SEEDED TREE — lib/erp/coa.ts COA_TREE: 19 rows, 2 levels, 5 types, EVERY posting-layer name VERBATIM (1010 Cash/Bank, 5010 Production Wages, 5110 Staff Salaries, 2200 Wage Payable, 2210-2240 PF/ESI/PT/LWF Payable) + 1110 Sundry Debtors, 2100 Sundry Creditors, 4010 Sales, 5020 Freight, 9000 Suspense Account; seedCoa idempotent upsert-by-code; seeded three ways (scripts/seed.ts inline for fresh dbs + scripts/seed_coa.ts for the live db — standalone node can't import @/ aliases, the M45/M49 script precedent, pinned by tests + the lib twin). (c) CA-03 JOURNAL FKs + THE BACKFILL — Journal +debitAccountId/creditAccountId (two named relations, additive-optional); THE STRINGS STAY (voucher detail/audit — the partyId sub-ledger carries the real balance per M45; the FK is the GL classification M-03's trial balance groups by); scripts/backfill_coa.ts links every legacy leg: exact Account name → the leg EQUALS the row's party name → the party-type control (customer→Sundry Debtors, supplier→Sundry Creditors, employee→Wage Payable, both→Suspense) → else Suspense REPORTED; idempotent, zero string rewrites; RAN ON THE LIVE DB: 187 rows / 374 legs (187 exact-name + 187 party-control, 0 suspense), re-run zero; the seed's own backfill pass covers fresh dbs. (d) CA-04 THE GUARD — planJournal resolves BOTH legs by exact name OR code (case-sensitive — a near-miss is a miss) and REFUSES loudly naming create_account/list_accounts (never an auto-created ghost — the HFX-09 lesson), re-resolved INSIDE the commit tx; the payment door resolves Cash/Bank + the party-type control (direction-aware, plan + in-tx); payroll J1/J2 resolve the wage account + Wage Payable + each head's payableAccount with a coaMissing pre-plan refusal and the codes IN THE PLAN TEXT (Dr Production Wages [5010]); production-bill likewise; cancel mirrors SWAP the FKs (journal-cancel) or resolve like the payment door (legacy payment-cancel, loud on a CoA miss). (e) CA-05 SURFACES — the journal register + [id] view show the account code chip ('Cash/Bank · 1010'; the [id] GL-legs line under the breadcrumb); schemas/journal.ts + create_journal docstring carry the resolution rule; prompt §Accounting carries the CoA + seeded codes + §Masters gains the account trio; PROMPT_VERSION m50-2026-09-06. Tests: accounts-m01.test.ts NEW 22/22 — seedCoa idempotence + tree shape (19 rows, parents, the 8 posting names verbatim, unique codes/names) + the resolver (name/code/case-miss) + partyControlName + planJournal linked-create (FKs on creates+commit, codes in the plan text, sideEffects GL line) + code-form ('5010' resolves) + THE REFUSAL (no row, no voucher number burned) + payment legs per party type (customer receipt Dr Cash/Bank [1010] / Cr Sundry Debtors [1110]; supplier out Dr Sundry Creditors; employee-party payout → Wage Payable control) + production-bill + payroll J1/J2 (PF 192 hand-computed, codes in text) + cancel-mirror swap + backfill on fixtures (party-leg → control, unknown → Suspense REPORTED, idempotent, strings never rewritten) + THE TB SUBSTRATE ASSERT (every journal row carries BOTH FK ids; ΣDr == ΣCr grouped by account — the M-03 grouping key) + wiring pins (schema/tools 261/masters 43/prompt m50/source pins) + master parity auto +2 (the 43rd config). Same-commit pin updates: 258→261 ×18 files, 42→43 ×3 (master-configs ×2 + DISPLAY_KEYS + cst-batch8), m49→m50 ×10 (incl. prg-batch7 startsWith + context_check + mt-content-c), doc-parity 'Cash'→'Cash/Bank', doc-configs 'Freight Expense'/'Cash'→CoA names (the M20 same-commit doctrine). Gates: **1491 vitest** (73 files; 1466+22+3 parity) · tsc src 0 · context_check 606/606 NO DRIFT (pins recomputed: tools 261, factory 43/43, models 91, masters 43) · eval --static PASS (m50, registry 253) · route_smoke_m50 NEW 24/24 LIVE (the CoA master page + seeded rows + form labels · the journal register code chips · the [id] GL-legs line · the seeded JV-RCP-0001 migrated view · the crafted ACC-9501 + V-9501 walkthrough with FULL revert + 404s · honesty doors: unknown q 200-empty, unknown voucher 404, no trial-balance surface yet — M-03 is queued) · browser E2E through BOTH FORM doors: account created at /masters/account (ACC-0001 auto-code, Type select, Active checkbox) → journal V-0001 posted naming it at /accounts/journal (plan text 'Dr Browser E2E CoA M50 [ACC-0001] / Cr Cash/Bank [1010]') → register chips 'Browser E2E CoA M50 · ACC-0001' + 'Cash/Bank · 1010' → the view's GL-legs line → DB-verified FKs (Dr → ACC-0001, Cr → 1010) → ZERO console errors → fully reverted (screenshots download/m50-coa-master.png + m50-journal-register.png + m50-journal-view-glegs.png). MANUAL-TESTING v1.4 (121 cases): AC-05 the CoA master page · AC-06 the code chips + GL-legs line · AC-07 the unknown-account refusal (no voucher burned; the code form '5010' resolves) · AC-08 the create-through-form walkthrough (both doors, swapped contra links on revert); §7 verification table → 3df09b2 (1491 vitest / route smoke 24/24 / the M50 browser E2E row); twins regenerated from the shared modules (postcheck 9/9, PDF 55 pages text-verified, all case IDs present). **Next per remediation spec §13**: M-02 true double-entry posts (per-door CoA accounts, cash/bank per mode + BankAccount, sideEffects claims true), M-03 final-accounts reports (trial balance / day-book / cash-book / minimal P&L+BS — the FK substrate + TB assert are in place), M-04 Tally both sides, M-05 expense heads; L-06 shiftWages (ADR-019 owner decision) + PAY-08/PRC-09/PRG-02 owner decisions still open. 2 LOCAL COMMITS pending push (3df09b2 feat + this docs commit) — PAT re-supply needed.
56. **M51 DONE — MODULE M BATCH 2: TRUE DOUBLE-ENTRY POSTS SHIPPED (M-02, zero deferrals)** (2026-09-06, SPEC-M51): the three money doors post real GL legs and the money screens count honestly — built on M50's CoA + guard, M45's sub-ledger, M40's contra cancels. (a) DE-01 MODE-AWARE CASH/BANK LEGS — BankAccount +glAccountCode (a plain CODE string, deliberately NOT an FK: the master engine's OVERRIDES are keyed by refEntity so a second account-referencing field can't ride the generic mapping; a preference resolved at post time so a stale code can never block a payment) + Payment +bankAccountId (the real FK — audit + the cancel mirror) + PAYMENT_SCHEMA bankAccountNo; lib/erp/coa.ts resolveCashLeg: mode 'cash' → the Cash/Bank [1010] control (a bankAccountNo alongside is NOT silently ignored — the note says so); any bank mode WITHOUT a bank → the control, byte-identical to M50 (PINNED); bank mode + a linked bank (active, by accountNo; unknown = LOUD error — an explicit reference; inactive = loud reactivation hint) whose glAccountCode resolves → THAT account (via 'bank'); unlinked/stale → the control + THE NAG (via 'control-fallback', the plan text names the bank + the fix: link one on the bank master or create_account); the plan + commit re-resolve identically (the M50 in-tx discipline); the journal's cash-leg STRING names the resolved account; Payment.bankAccountId stored whenever a bank was resolved — the payment-cancel contra swaps the companion's legs so the bank leg auto-mirrors. (b) DE-02 DEBIT-NOTE GL LEGS — DEBIT_NOTE_SCHEMA +debitAccount (exact name OR code; default Sales [4010] — a material deduction is a sales-side adjustment); the commit writes DebitNote + companion journal JV-{noteNo} in ONE transaction: voucherType 'debit-note' (a NEW type, deliberately OUTSIDE the party-ledger ['journal'] filter — the DebitNote row IS the sub-ledger truth, counting both would double-subtract), partyId set, Dr debitAccount / Cr the party-type control, FKs resolve-or-refuse (a miss aborts the note too — no half-posted documents); the LIAR claim retired: sideEffects now says 'Party outstanding reduces by ₹X (a DEDUCTION — the bills register + party ledger net it)' + the GL-legs line with codes. (c) DE-03 EXPENSE GL LEGS — EXPENSE_SCHEMA +glAccount; default debit by category (transport → Freight [5020], every other category → Other Expenses [5120] — the NEW 20th seeded CoA row under 5100 Indirect Expenses, the catch-all M-05's expense heads will refine); credit leg: partyCode given → Sundry Creditors [2100] + partyId (voucherType 'journal', the wage-bill class — the payable shows in the party ledger BEFORE settlement and record_payment OUT nets it to 0, the M45 loop-closure extended to expense parties) else Cash/Bank [1010] (partyId null — invisible to the sub-ledger by construction); companion JV-{expNo} same-transaction + resolve-or-refuse; claims carry the legs + the settle path. (d) DE-04 THE DOUBLE-REVERSE FIX (probe-proven: invoice ₹1,000 → receipt ₹1,000 → cancel → the ledger read −1,000 — the cancelled payment still counted as received AND its contra counted again) — party-ledger.ts (BOTH the summary and the aggregate path): payments +status:'active', journals voucherType:'journal' + status:'active' (CONTRAS NEVER COUNT: every contra mirrors a row that stops counting); bills.ts: payments status:'active' (a cancelled receipt leaves the collected column) + debitNotes status:{not:'cancelled'} (the HFX-03 doctrine extended); after the fix the probe reads +1,000 (re-opened AR) — pinned in tests; the operator statement + chain-money reports already filtered (three screens, one balance). (e) DE-05 CANCELS MIRROR THE NEW LEGS — planCancelDebitNote/planCancelExpense: companion JV- exists → the doc AND companion flip 'cancelled' + a CN-JV- contra with the legs SWAPPED (strings + FKs, the M50 swap doctrine); legacy rows (no companion) → the status flip only, claim says so; planCancelJournal's JV- guard gains the two new families (JV-DN- → 'cancel the NOTE (cancel_debit_note DN-####)'; JV-EXP- → 'cancel the EXPENSE (cancel_expense EXP-####)'; JV-RCP/PMT unchanged); the settled-expense refusal unchanged. (f) DE-06 SURFACES — payment form +bankAccountNo (picker on the bank-account master) + debit-note +debitAccount + expense +glAccount, each with the DE-06 hint (DocField +description — NEW optional field rendered as a one-line slate hint under the control); the bank-account master +glAccountCode field + 'GL Acct' column (searchable); docstrings ×3 (record_payment the mode→leg rule, create_debit_note the DEDUCTION semantics, create_expense the legs + settle path); prompt §Accounting carries the mode→leg rule + the DN/expense legs + the 20-row tree; PROMPT_VERSION m50→m51-2026-09-06. DESIGN NOTES: NO backfill (DNs/expenses never had journals — nothing to link; the GL starts where the legs started, the TB reads what is there); budgets post nothing (verified — planning docs); no new models (91 stand — columns only); tools/menu/routes counts ALL UNCHANGED (261/143/179 — depth, not width); WAGE_PAYMENT_SCHEMA omits bankAccountNo (the wage door writes no bankAccountId — the doc-configs parity test would demand a form field the service ignores, a liar field). Schema: Payment +bankAccountId + relation, BankAccount +glAccountCode (db push, WAL checkpointed, dev-server RESTART — PITFALLS #50); COA_TREE 19→20 rows + 5120 seeded into the live db (scripts/seed_coa.ts re-run) + scripts/seed.ts tree (fresh dbs). Tests: accounts-m02.test.ts NEW 32/32 — resolveCashLeg ×6 (cash+note, bank-no-bank byte-compat, linked → 1011, unlinked nag, unknown loud, inactive loud) · THE PAYMENT WALKTHROUGH (neft + linked bank → Dr HDFC 1234 [1011] / Cr Sundry Debtors [1110], bankAccountId set, the string names the resolved account, plan codes + 'the bank account's own GL ledger') + byte-compat (no bank → Dr Cash/Bank, bankAccountId null) + cash+bank-given (control + honest note) + the fallback nag (bankAccountId still stored — audit) + unknown refusal (no row) + THE CANCEL CONTRA SWAPS THE BANK LEGS · THE DN WALKTHROUGH (companion voucherType 'debit-note', Dr Sales/Cr Sundry Debtors, the DEDUCTION claim, creates: 2) + COUNTED ONCE (totalDebit rides the DN row; the companion never rides the journals term) + explicit debitAccount (code form 5010) + unknown refusal (no note) + the planCancelJournal guard names cancel_debit_note + the cancel (BOTH rows flip + CN- contra swapped + the deduction leaves the ledger) · defaultExpenseAccount mapping + THE PARTY EXPENSE (Dr Freight [5020] / Cr Sundry Creditors [2100], partyId, the ledger −500) + THE LOOP-CLOSURE (record_payment OUT 500 → balance 0) + THE CASH EXPENSE (Dr Other Expenses [5120] / Cr Cash/Bank, partyId null) + explicit glAccount + unknown refusal + the settled refusal + the cash-expense cancel (companion flip + contra) + the party-expense cancel re-opens the payable (620 → 500) · THE PROBE (isolated party: invoice 1,000 → receipt 1,000 → balance 0 → cancel → +1,000 re-opened, received 0, journals 0) + the bills day-book (cancelled receipt absent, invoice stays) · source pins (party-ledger active-only reads, bills filters, the JV-DN-/JV-EXP- guards, schema columns, config fields, docstrings, prompt m51, COA_TREE 20, seed 5120) + THE TB ASSERT (every journal both FKs, ΣDr==ΣCr — companions balance). Same-commit pin updates: accounts-m01 19→20 ×6 + the 5120 parent + m51 version + the 9th posting name; PROMPT_VERSION m50→m51 ×8 (chat-batch2/cst-batch8/payroll-l01..l04/prg-batch7 startsWith/qol1-reconcile); context_check m51; prg-batch7's startsWith('m50')→('m51'). Gates: **1523 vitest** (74 files; 1491+32) · tsc src 0 (the doc-configs description type error fixed by DocField +description + the doc-screen hint render; the wage-payment parity failure fixed by the schema omit) · context_check 606/606 NO DRIFT (m51 pin) · eval --static PASS (m51, registry 253) · route_smoke_m51 NEW 26/26 LIVE (the 20-row CoA master · the payment form bankAccountNo picker + hint · the DN/expense GL fields · the bank master GL Acct column · the crafted walkthrough: bank-linked RCP-9501 (bankAccountId + companion Dr 1012) + JV-DN-9501 ('Sales · 4010' chip) + THE BILLS HONESTY DOOR (active RCP-9501 stays, cancelled RCP-9502 leaves, DN-9501 rides deductions) → FULL revert + 404s + unknown-q 200-empty) · browser E2E through the FORM door: /accounts/payments with the bank picker (party + direction + amount 500 + invoice + mode neft + bankAccountNo 8888777700) → the plan card 'GL legs classify to Browser E2E Bank M51 [1013] / Sundry Debtors [1110] (SPEC-M51 M-02 — the bank account's own GL ledger)' → Approve & commit → DB-verified (RCP-0188 bankAccountId set, JV-RCP-0188 Dr 'Browser E2E Bank M51'→1013 / Cr party→1110, invoice 'paid') → the journal register chips ('Browser E2E Bank M51 · 1013') → Reverse payment through the view (the dialog's honest claims) → DB-verified (payment cancelled, contra CN-RCP-0188 Dr 1110 / Cr 1013 — the BANK leg swapped, invoice re-derived 'issued') → the party ledger 'net balance ₹500' — RE-OPENED, the double-reverse fix PROVEN through the browser door → console: the pre-existing party-ledger ?party hydration warning (present on Acme too — NOT M51; the M51-touched payments/journal pages clean) → fully reverted, zero residue (screenshots download/m51-payment-plan-bank-leg.png + m51-journal-register-bank-chip.png + m51-party-ledger-reopened.png). The platform's mid-session UUID auto-commit (8c3cc07) verified pure (19 files, all M51 work) and squashed into this commit. **Next per remediation spec §13**: M-03 final-accounts reports (trial balance / day-book / cash-book / minimal P&L+BS — the FK substrate + the TB assert + the per-bank legs are all in place), M-04 Tally both sides, M-05 expense heads; L-06 shiftWages (ADR-019 owner decision) + PAY-08/PRC-09/PRG-02 owner decisions still open. 5 LOCAL COMMITS pending push (M50 feat + M50 docs v1.4 + SPEC-M51 + M51 feat + M51 docs v1.5) — PAT re-supply needed.
57. **M52 DONE — MODULE M BATCH 3: FINAL-ACCOUNTS REPORTS SHIPPED (M-03, zero deferrals)** (2026-09-06, SPEC-M52; entry appended retroactively at m53 — the m52 session updated the header but this numbered record was missed): the four GL reports on the M50/M51 substrate, each with csv twin + agent tool (one service both doors — ADR-001): /accounts/trial-balance (FA-01: per-account Dr/Cr/net+side, the summary ASSERTS 'BALANCED (Dr == Cr asserted)' only when Δ=0, the unlinked honesty door — null-FK rows counted + reported, never dropped), /accounts/day-book (FA-02: the chronological GL voucher register, EVERY voucherType + EVERY status, variant + q filters, Dr/Cr columns with resolved 'Name [code]' legs + UNLINKED marker), /accounts/cash-book (FA-03: the 1010 family via CoA TOPOLOGY (parentId, never code-prefix guessing) with opening/inflow/outflow/running/closing, particulars = the OTHER leg, counter-book grouped by day, the not-in-family honest refusal), /accounts/final-accounts (FA-04: variant pl|bs — P&L income − expense; BS assets vs liabilities+equity+the window's P&L as RETAINED EARNINGS, Δ asserted 0, structural from Dr==Cr; accountActivity is the shared math with the TB, one derivation). THE GL DOCTRINE (the batch's semantic core, FA-05's wiring prompt line): every journal row counts in the GL regardless of status — the status flag is SUB-LEDGER truth-ownership (DE-04: which screen nets what), the CONTRA row IS the GL's reversal ⇒ ΣDr==ΣCr structural and every cancel nets to zero (probe-pinned: journal-cancel flips the original AND writes the CN- mirror that compensates; payment-cancel keeps the companion + CN-; the closed-period window does NOT see later contras). FA-05 wiring: 4 register services + 4 configs + 4 pages + 4 csv routes; menu 143→147, LIVE_ROUTES 179→183, tools 261→265; PROMPT_VERSION m52-2026-09-06. PURE READ SIDE: zero schema changes (91 stand), zero posting changes. Tests: accounts-m03.test.ts NEW 18/18 (TB window math + the unlinked door + THE DOCTRINE pin + the closed-period window + day-book + THE PAYMENT-CANCEL PAIR + cash-book family/contra-netting + P&L/BS closure + wiring) + the same-commit pin sweep (allTools 261→265 ×17, menu 143→147 ×4, register-configs 41→45, m51→m52 ×11). Gates: 1561 vitest · tsc src 0 · context_check 606/606 NO DRIFT · eval --static PASS (m52, registry 257) · route_smoke_m52 45/45 LIVE · browser E2E through the payments FORM door (RCP-0188 → reverse → THE PAIR on the day-book → TB still BALANCED at 189 rows → zero console errors → fully reverted; 7 screenshots). MANUAL-TESTING v1.6 (129 cases: AC-13..16 + twins).

58. **M53 DONE — MODULE M BATCH 4: TALLY BOTH SIDES SHIPPED (M-04, zero deferrals; the Tally XML option deferred as decision §17-4, owner call — NOT invented here)** (2026-09-07, SPEC-M53): the Tally JSON export rewritten on THE EXPORT DOCTRINE — the M52 GL doctrine applied to the export. (a) TL-01 BOTH SIDES + COUNTED ONCE: SalesInvoice (issued/paid) → Sales (Dr party / Cr Sales + Output CGST/SGST/IGST splits + Other Charges + Round Off, >0-only; billType moved to the narration); SupplierBill (passed/partial/paid) → Purchase (Dr Purchases + Input CGST/SGST/IGST / Cr party — the purchase side finally exports); Payment (ANY status — the companion is the GL row and it counts) → Receipt/Payment with the FROZEN JV- companion strings (direction-aware: per-party legs + the resolved cash/bank leg, the per-bank GL account name when linked); DebitNote (any status) → Credit Note from the JV-DN- companion legs; Expense (any status) → Journal (source 'expense') from the JV-EXP- legs; standalone journals (any non-JV- voucherNo, any status — cancelled rows append [CANCELLED]) → Journal; CN-* contras ALWAYS → Journal with reversalOf + 'Reversal: …' narration. JV-* companions NEVER re-export (the LIVE DOUBLE-COUNT fixed: the M19 adapter emitted 178 receipts + 187 companion journals for the same money; now journals 0, counts sum == vouchers.length); an orphan JV-* (document gone) falls back to journal rendering + a warning — nothing silently drops. (b) TL-02 PAYLOAD: voucherType ∈ Sales|Purchase|Receipt|Payment|Credit Note|Journal + NEW source (invoice|bill|payment|debit-note|expense|journal) + reversalOf?; counts 7-way {sales, purchases, receipts, payments, creditNotes, journals, reversals}; warnings[] (unlinked-bank payments → the Cash/Bank control + the M51 nag surfaced; bank-mode-no-companion legs defaulted + warned; legacy DN/expense derivation + warned; orphan companions; stored-math mismatches (billAmount ≠ taxable + GST + charges at 2dp) imported as-is + warned; cancelled/draft invoice+bill EXCLUSIONS counted + reported — no GL reversal exists for them, the boundary note is honest) + notes[] (the doctrine lines incl. 'Format: JSON only — the Tally XML option is decision §17-4, pending the owner'). (c) TL-03 every voucher asserts ΣDr == ΣCr (2dp). (d) TL-04 SURFACES: the page (counts grid ×8 with Purchases/Credit notes/Reversals, the warnings panel, the doctrine notes details block, the Source column, reversal badges 'rev RCP-0188', the refreshed header copy naming the §17-4 deferral); /api/tally unchanged. (e) TL-05 get_tally_export (accounts domain, read, from/to, counts + warnings + first 20 vouchers with ledger lines + the download pointer; tools 265→266); prompt §Accounting + the SPEC-M53 Tally line; PROMPT_VERSION m53-2026-09-06. (f) DESIGN: legs come from the FROZEN companion strings wherever companions exist (re-deriving would drift — the M51 in-tx resolution is the truth); payments resolve mode + bankAccountId (agreeing with the companion by construction); party legs render per-party (Tally's book) while the GL nets under the type control — two books, one truth; GST split ledgers are Tally-side names (the CoA stays 20 rows — invoices/bills post no GL rows, nothing to classify); SupplierBill/Expense partyIds are relation-less (PITFALLS #21) — one batched party lookup. ZERO schema changes (91 stand), zero posting changes, menu/routes/register configs UNCHANGED. Tests: accounts-m04.test.ts NEW 18/18 — the walkthrough (invoice split 25/25 no single GST · bill Dr Purchases 800 + Input IGST 80 / Cr party 880 · cash receipt from the companion (Dr Cash/Bank / Cr party) · bank-linked receipt = the bank GL name leg · neft-no-link → control + warning · DN Credit Note Dr Sales / Cr party · expense Dr Freight / Cr party · manual journal own legs) + COUNTED ONCE (no JV- re-export; every journal row appears once via its document) + THE DOCTRINE PAIRS (payment-cancel: the receipt STILL exports + CN- reversalOf with swapped legs, net zero; journal-cancel: [CANCELLED] + mirror) + the honesty doors (mismatch 50 warned, legacy derivations ×2, orphan JV-*, draft bill + cancelled invoice excluded + reported) + balance sweep (all but the deliberate mismatch row) + window + counts shape + notes + wiring (tools 266, the tool twin, prompt m53, docstring, page pins, context_check pins). Same-commit: wave-d-registers.test.ts M19 pins updated (counts 7-key shape, 'Bank'/'Cash' → 'Cash/Bank' + the no-companion warning, the Output GST split, source fields, the balance sweep, the notes test 9→10); the pin sweeps (allTools 265→266 ×20 files + m53-2026-09-06 ×11 + prg-batch7 startsWith m53). Gates: 1580 vitest (76 files) · tsc src 0 · context_check 606/606 NO DRIFT (tools 266 + m53 pins) · eval --static PASS (m53, registry 258) · route_smoke_m53 NEW 23/23 LIVE (the screen ×13 checks + /api/tally attachment + THE LIVE DOUBLE-COUNT pin (receipts 178 + payments 9 + sales 190 + journals 0) + the crafted today-window: Purchase/Input IGST, the split, COUNTED ONCE, the doctrine pair, the exclusion doors + full revert + the 400 refusal doors) · browser E2E through the FORM door: the payments form (CUS001 ₹400 cash, plan 'GL legs classify to Cash/Bank [1010] / Sundry Debtors [1110]') → Approve → RCP-0188 + companion JV-RCP-0188 DB-verified (Dr Cash/Bank / Cr 'Acme Corp USA' — the party name, the Tally legs) → the tally screen shows exactly ONE RCP-0188 row (the Receipt with the companion's legs — counted once) → Reverse payment through the view → DB-verified (payment cancelled, companion ACTIVE, CN-RCP-0188 contra Dr 'Acme Corp USA'/Cr 'Cash/Bank' swapped, INV-0010 re-derived 'issued') → THE DOCTRINE PAIR live on the export screen (the Receipt + the CN- reversal, Reversals 1) → zero console errors → fully reverted (zero residue; the one remaining today-row is the pre-existing INV-001) — 3 screenshots download/m53-tally-receipt-row.png + m53-tally-doctrine-pair.png + m53-tally-page.png. Dev server restarted mid-session (it had died; login 200 restored). MANUAL-TESTING v1.7 (133 cases: the M53 export cases AC-17..20 — the both-sides screen + COUNTED ONCE + the purchase side + the exclusion doors + THE EXPORT DOCTRINE PAIR + the GST split + the agent door; §7 → 43fc765 (1580 vitest / route smoke m53 23/23 / the M53 browser E2E row); twins regenerated from the shared modules: postcheck 9/9 (0 errors 0 warnings), LibreOffice PDF 65 pages text-verified (all case IDs + Version 1.7 + 43fc765 + 1580 + route_smoke_m53 + COUNTED ONCE + THE EXPORT DOCTRINE PAIR present); §8/§15 pipeline-twin list gained accounts-m04; sign-off names AC-17..20). **Next per remediation spec §13**: M-05 expense heads (ExpenseHead master — legacy FrmMasExpenses port; expense category from the master; budget-vs-actual finally includes expenses) is the LAST Module M item; L-06 shiftWages (ADR-019 owner decision) + PAY-08/PRC-09/PRG-02 + §17-4 Tally XML owner decisions still open. Commits pending push at wrap time — PAT push per protocol.
59. **M54 DONE — MODULE M BATCH 5: EXPENSE HEADS SHIPPED (M-05, zero deferrals — THE LAST MODULE M ITEM: the remediation §13 Module M queue is now EMPTY)** (2026-09-07, SPEC-M54): the legacy FrmMasExpenses port + the budget read that finally counts the expense book — built on M50's CoA + guard, M51's DE-03 expense legs + the glAccountCode preference pattern, M45's sub-ledger. (a) EH-01 THE MASTER — Prisma `ExpenseHead {code @unique EXH-####, name @unique (the natural key the door resolves by name OR code), category, glAccount String? (a PLAIN name-or-code preference — deliberately NOT an FK: resolved at post time so a stale value can never block the door), active}` (models 91→92, db push + WAL checkpoint + dev-server restart — PITFALLS #50) + Expense +headId (relation-less, PITFALLS #21 — the pages resolve via id-map, the orderId/partyId pattern; category STAYS the stored truth every register reads); master-configs/expense-head.ts riding the M2 engine (UNIQUE_TITLE_ENTITIES + expense-head → the duplicate-name refusal) → /masters/expense-head auto CRUD (masters 43→44; menu/routes UNCHANGED — the M50 precedent); factory create/update_expense_head + the list_expense_heads read door (tools 266→269). (b) EH-02 THE HEAD DRIVES THE DOOR — EXPENSE_SCHEMA +head (category now optional; the service requires category OR head); planExpense: head resolved code-first-then-name (unknown = LOUD refusal naming the door, no row no voucher burned; inactive = the reactivation hint); category := head.category (a differing passed category OVERRIDDEN + noted; stylewise-requires-order follows the RESOLVED category); THE LEG PRECEDENCE — explicit glAccount > head.glAccount (when resolvable) > the M51 category default (byte-identical); a STALE head.glAccount falls back to the category default + the honest note in the plan text (never a refusal — THE HEAD REFINES, NEVER BLOCKS); Expense.headId stored; the companion narration gains the head name; the summary names the head + the leg source ('(from the head)'/'(explicit)'); the form: the Head picker (DocPicker expense-head, emits the code) + category not-required-when-a-head + the DE-06 hints; the expense book + [id] view gain the Head column/field. (c) EH-03 BUDGET-VS-ACTUAL FINALLY INCLUDES EXPENSES — expenseSpend = Σ non-cancelled Expense.amount per order (cancelled excluded: the M51 cancel already nets doc + companion + CN- contra; the addend must not count the cancelled money) → actual = PO + prod + expenses in BOTH getOrderBudgetActual (the agent path) + the register rows (one batched fetch); the register config + the expense column (inr) + the Expenses total in both branches (the single-order row carries BOTH keys: expenseSpend for the tool contract + expense for the column); orders with ONLY expenses now appear in the register; get_budget_vs_actual json gains actual.expenseSpend (additive — the M53 additive-field precedent) + the text names the split; planBudget sideEffects updated; the HFX-12 shiftWages column stays the no-writer informational (L-06 owns it); expenses post no PO/prod lines so the addend cannot double-count; non-order expenses stay overhead; ADDITIVE — the M4/M5/HFX fixtures carry no Expense rows, every existing pin held. (d) DESIGN: no seed no backfill — heads are USER data (the legacy form was user-maintained); the category-only path stays byte-identical (M51 back-compat, pinned by regex). PROMPT_VERSION m53→m54-2026-09-07 (§Masters trio + §Accounting THE HEAD REFINES NEVER BLOCKS line + §Costing the expense-addend line). Tests: accounts-m05.test.ts NEW 16/16 — the master door (EXH- auto-code + duplicate-name refusal) · THE WALKTHROUGH (category transport FROM THE HEAD + Dr Freight [5020] the head's account + headId + the party leg + narration + summary '(from the head)') · head-no-account → category default · explicit beats the head ('(explicit)') · STALE fallback + note (ok:true) · the conflict override + note · unknown/inactive/neither refusals · the M51 byte-compat regex + headId null · stylewise-via-head order-required + stored · THE BUDGET ADDEND (active 750 + cancelled 250 → expenseSpend 750, actual 750, variance −750 honest) · the register single+aggregate rows + the tool json + text · wiring ×3 (tools 269 + the trio + the list door live json; masters 44 + config pins; schema/form/budget-config/source/prompt/context pins) + master-parity auto +3 (the input map gains the EXH- case) + accounts-m02 pin updated same-commit (the create_expense docstring). Pin sweeps: allTools 266→269 ×21 files + m53→m54 ×12 + prg-batch7 startsWith m54 + masters 43→44 ×3 + context_check.sh (tools 269, factory 44 ×2, models 92, master configs 44, the m54 PROMPT line). Gates: **1599 vitest** (77 files) · tsc src 0 · context_check 606/606 NO DRIFT · eval --static PASS (m54, registry 261) · route_smoke_m54 NEW 24/24 LIVE (the master page labels + EXH- hint + the never-blocks hint · the expense book Head picker + hints · the budget Expenses column · the crafted raw-prisma walkthrough head+order+stylewise expense 750+companion → the master row · the book headName · the view Head field · the budget row addend 750 · 404 + unknown-q doors · FULL REVERT) · browser E2E through the FORM doors: head created at /masters/expense-head ('Browser E2E Head M54', EXH-0001, transport + 5020 — the category select needed the native change-event dispatch, agent-browser's select didn't register; fixed via the edit door) → the expense form: the Head picker EXH-0001 + amount 500 + category LEFT EMPTY (the head drives it) → the plan card 'Proposed expense EXP-0001 — ₹500 (transport · head Browser E2E Head M54)' + 'GL legs classify to Dr Freight [5020] / Cr Cash/Bank [1010] (SPEC-M51 M-02; the head's account)' + 'Booked under head … [EXH-0001] — category transport, default leg 5020' → Approve & commit → DB-verified (category transport + headId EXH-0001; JV-EXP-0001 Dr Freight [5020] / Cr Cash/Bank; the narration carries the head) → the book row 'EXP-0001 | transport | Browser E2E Head M54' → the view HEAD field → console: the M54 pages clean on isolated reloads (the one hydration warning traced to the login redirect — pre-existing, not M54) → FULLY REVERTED (residue 0,0,0) — 3 screenshots download/m54-expense-head-master.png + m54-expense-plan-head.png + m54-expense-view-head.png. ENVIRONMENT NOTES: the dev server now survives across tool calls via the double-fork `(cmd &)` pattern (setsid alone was reaped); db/backups/ had vanished with the platform reset → a REAL snapshot restored via scripts/backup_db.py (custom-20260907-153909.db, integrity ok — the ops posture restored, not a test gamed). Gremlin #5 (the uncommitted phantom deletion of src/app/api/upload/route.ts) caught at session start by the PITFALLS #39 git-status ' D ' check and restored from HEAD — never committed, zero impact. **Module M queue: EMPTY — all five batches (M50 CoA, M51 double-entry, M52 reports, M53 Tally, M54 expense heads) are shipped.** Remaining queue: L-06 shiftWages (ADR-019 owner decision); owner decisions open: §17-1 backup target, §17-2 G3 yard, §17-3 PDC lifecycle, §17-4 Tally XML, §17-5 multi-style, §17-6 cumulative DC, §17-7 SalesInvoiceLine, §17-8 final-accounts scope confirm; side_quest retirement (6c1be98, 0 unmerged) — owner call. 2 LOCAL COMMITS pending push (4a1e7d4 SPEC-M54 + 84ddfdf feat) + the docs commits to follow — PAT re-supply needed.

60. **M55 DONE — MODULE L BATCH 6: SHIFT WAGES SHIPPED (L-06, zero deferrals — THE LAST MODULE L ITEM: the Phase-6B remediation §13 queues are now ALL EMPTY)** (2026-09-08, SPEC-M55; ADR-019-A resolves the frozen ProductionEntry⇄Shift decision): the dead `shiftWages` column FINALLY has a writer — `planShiftWages` + the `post_shift_wages` docTool (the legacy ProdShiftWages/post_shift_wages port: wage-only rows qty 0 / amount 0 / shiftWages = the posted wage, operator-neutral, NO stock move, no GL leg — the wage journal rides the payroll/wage-bill flow). The ADR-019-A link: `ProductionEntry.shiftId` nullable FK (+ Shift back-relation, the Attendance precedent; models stay 92) with the `shiftCode` attribution on post_production_entry (unknown shift = LOUD refusal) — the field lands on every production-family form (entry + 5 variants + cutting-production ride the mirror rule). The budget-vs-actual shift-wage addend REINTRODUCED (actual = PO + prodCost + expenses + Σ shiftWages — no double count by construction; the HFX-12 Σ amount stand-in RETIRED); production-status Wages + daily-unit-pnl wages + operation-summary now read the honest total bill (piece + shift). THE FrmProdShiftWagesReg PORT: the /hr/shift-wages register (shift × day grain: piece / shift / bill columns, the unassigned bucket, csv) + get_shift_wages tool (tools 269→271; menu 147→148; routes 183→184; PROMPT_VERSION m55-2026-09-08, registry 263). Pin sweeps same-commit (×~30 files + context_check pins 271/148/184/36/48/73/m55 + the m55_pin_sweep.py audit trail). Tests: hr-l06.test.ts NEW 14/14 (the door + inertness + refusal doors ×4, attribution ×3, the addend + no-double-count, the register + unassigned, piece-payroll non-pollution, wiring pins) + HFX-12-era pins upgraded to M55 semantics (register-services/report-services/hfx-batch0 — the fixtures' own shiftWages values now count, honestly). Gates: 1618/1618 vitest (78 files) · tsc src 0 · context_check 606/606 NO DRIFT · eval --static PASS (m55, registry 263) · route_smoke_m55 26/26 LIVE · browser E2E BOTH doors (the shift master form → the production form's Shift picker → attributed piece entry DB-verified; the agent chat post_shift_wages → plan card with the doctrine → Approve → wage row DB-verified → register ₹400 addend → budget ₹17,23,600 = 16,80,000 + 43,200 + 400 → FULLY REVERTED, zero residue). The db/backups snapshot regenerated (environment wipe, the OPS-01 path). **The queue is empty**: Module M (M50-M54) + Module L (L-01..L-06) + every numbered remediation row — ALL SHIPPED; what remains is owner-decision territory only (§17-1 backup target, §17-2 G3 yard, §17-3 PDC lifecycle, §17-4 Tally XML).
61. **M56 DONE — MONEY BATCH 7: THE CHEQUE/PDC LIFECYCLE SHIPPED (PAY-08, decision §17-3 RESOLVED by the delegated default — ADR-020; zero deferrals — the last specified-but-unshipped FR in the entire remediation spec)** (2026-09-08, SPEC-M56): chequeStatus is a PHYSICAL layer on Payment (null|issued|cleared|bounced, mode=cheque only — 3 additive nullable columns chequeDate/chequeStatus/clearedAt, models stay 92): the payment door stamps 'issued' (the plan card 'cheque {ref} issued' + the POST-DATED due line + the register side effect; a chequeDate on a non-cheque mode is NAMED as ignored — the honest-nag, never a refusal) · post_cheque_clear = the bank's physical confirmation (a stamp — NO journal, allocations untouched; the M51 bank-leg doctrine said in the plan card) · post_cheque_bounce = the money never arrived: the M40 cancel core REFACTORED into buildPaymentCancelPlan (plain path byte-identical, the M40 pins hold) + the 'bounced' stamp in ONE tx (CN- contra legs/FKs swapped, allocations reversedAt, invoice/bill statuses re-derive, the party outstanding re-opens) · THE PDC REGISTER: /accounts/pdc (RG, accounts group) — issued+active cheques with the PDC badge (post-dated at issue), aging off the cheque date (due in N d / DUE TODAY / OVERDUE N d), direction+party+cheque-date filters, csv; pre-M56 rows honestly absent (never a fabricated journey) · getPrintHeader prefers the ACTIVE BankAccount master for the print remit-to (alone — never mixed with print.* AppOptions; no master rows = the pre-M56 behavior byte-compatible) · get_pdc_register read tool + the chequeDate form field (payment + wage-payments via the mirror rule) + the payment view cheque line · tools 271→274, docTools 73→75, menu 148→149, routes 184→185, register configs 36→37, register services 48→49, posting 44→45, PROMPT_VERSION m56-2026-09-08 (prompt §Accounting lifecycle sentence + the §17-4 resolved line) · pin sweeps same-commit (m56_pin_sweep.py audit trail: 39 files + 3 over-sweep corrections — the money-148s; the pay-batch4 PAY-08 deferral guard flipped to the RESOLVED state) · tests: pay-pdc.test.ts NEW 13/13 (the issued stamp ×3 · clear door + refusals · bounce door + refusals + the contra/allocation/status assertions · the register rows/aging/filters · remit-to master-preference · wiring) + the register-configs contract auto-block (pdc) · gates: 1636/1636 vitest (79 files) · tsc src 0 · context_check 606/606 NO DRIFT · eval --static PASS (m56, registry 266) · route_smoke_m56 NEW 26/26 LIVE · browser E2E BOTH doors (the payment form: the post-dated cheque plan card → DB issued+dated → /accounts/pdc '1 cheque in the field (1 post-dated) · ₹600 outstanding' with the PDC badge; the agent chat: 'clear cheque RCP-0188' → routed to post_cheque_clear → the doctrine plan card → DB cleared + clearedAt, payment ACTIVE, NO contra journal → the register '0 cheques in the field'; fully reverted, zero residue) · MANUAL-TESTING v1.10 (AC-25..28, the twins regenerated + postcheck docx 17/17 + LibreOffice PDF 73 pages 15/15) · ADR-020 (§17-3: full lifecycle now) + ADR-021 (§17-4: Tally STAYS JSON — the honest-claims rule; the XML door re-opens with a verification plan) + ADR-022 (§17-2 ERRATUM: G3 was wired in M39, the queue lists were stale prose) recorded in 02-DECISIONS.md · §17-1 backup target REMAINS OPEN (owner infra — a destination cannot be delegated or invented). The m56-push entry: the M56 batch (SPEC 1e8b4d2 + feat 359ae5e + docs) pending the PAT push.
