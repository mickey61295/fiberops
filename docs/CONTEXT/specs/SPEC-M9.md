# SPEC-M9 — Live Operations Tracker + Post-Parity Improvement Roadmap

> **FROZEN IMPLEMENTATION SPEC.** Written BEFORE any M9 code (rule:
> spec-before-code, `docs/CONTEXT/00-START-HERE.md` #3). A session with ZERO
> chat context implements M9 correctly from this file alone.
> Lineage: STATE next-actions #9 lists post-M8 candidates — E2E hardening,
> agent prompt polish, /admin/settings flags UI. This spec adds the
> **user-requested** item: a LIVE tracker screen ("see what's going on live")
> and freezes the M10+ roadmap (§9) so future sessions pick from a written
> plan instead of chat memory.
>
> **REVISION (pre-commit, 2026-08-28 — user clarification):** "when I meant
> live tracker… you had the legacy parity tracker right? I meant something
> like that." The screen therefore adopts the **/parity scoreboard format**
> as its PRIMARY layout: summary stat tiles + per-group cards with one table
> row per screen — but each row carries LIVE operational status (records,
> today, latest doc, last-updated, Active/Idle/No-data) derived from the DB
> instead of the parity page's static config status. Snapshot gains the
> `modules` contract (§4-B); feed/KPI/approvals/agent/system contracts are
> UNCHANGED, and the Wave-A panels (activity feed, approvals, agent pulse,
> system) are retained BELOW the board as secondary detail (§5 layout 4).

## 1. Goal

ONE new screen — **/tracker, the Live Operations Tracker** — that answers
"what's going on in this factory RIGHT NOW" without clicking through 17 menu
groups. It aggregates every business family + approvals + the AI agent into a
single auto-refreshing view:

- **Live operations board (parity-style, PRIMARY)** — per-group cards with
  one row per screen family: records total, rows today, latest doc + meta,
  last-updated (ticking), Active/Idle/No-data status dot (§4-B).
- **Unified activity feed** — newest documents/events across 16 families,
  deep-linked to their view pages (secondary, below the board).
- **Today KPIs** — docs recorded today, pcs produced/despatched, stock moves,
  agent turns, pending approvals.
- **Approvals panel** — pending by kind, oldest pending age, recent decisions.
- **Agent pulse** — recent agent turns (prompt, tool calls, approvals).
- **System panel** — server time, users/parties/ledger counts, flags state.

Product thesis honored: the tracker is reachable TWO ways — the screen AND a
new read tool `get_live_activity` (chat door). ONE aggregation service
(`src/lib/erp/tracker.ts`) backs both (Contract rule #8).

**Acceptance (all must pass):**
1. `npx tsc --noEmit` — src/ stays 100% clean (0 errors).
2. `npx vitest run` — 691 existing tests green + new tracker tests green.
3. GET `/tracker` (authed) → 200, renders the live view inside the app shell.
4. GET `/api/tracker` unauthenticated → 401 JSON (requireApiSession guard);
   authed → 200 with the §4 TrackerSnapshot shape.
5. `/tracker` is rights-gated by the `home` menu group (middleware pre-check +
   layout layer-2 — ADR-018 pattern; home is always allowed, so every
   logged-in user sees the tracker).
6. `get_live_activity` tool registered (tools 188→189); agent-actor pin updated.
7. Menu registry gains item `live-tracker` (113→114 items, LIVE_ROUTES
   145→146); menu-registry test pins updated.
8. `bash scripts/context_check.sh` → NO DRIFT (pins updated, M9 checks added).
9. `bash scripts/route_smoke_m9.sh` → all green (401 matrix, page 200 + title
   grep, API shape, feedLimit cap, menu door on the sidebar).
10. `npx next build` → EXIT 0.

## 2. Non-goals (explicitly OUT of M9)

- **No schema change** — 65-model pin holds; the tracker READS existing
  tables (createdAt columns already exist on every family).
- **No WebSocket/SSE mini-service** — polling only (see §3 rationale; the SSE
  upgrade is an M14 roadmap item, §9-P2). No new ports, no gateway changes.
- **No write paths** — the tracker is read-only; approvals drill to the
  existing inbox, never approve from the tracker.
- **No new print family** — PRINT_DOCS stays 20.
- **No historical analytics** — "today" + recent feed only; trends/charts are
  Dashboard 2.0 (§9-P2 M16).
- **No per-user feed filtering** — v1 shows the whole company feed; activity
  streams per user are a future candidate.

## 3. Architecture — one service, one API, one page, one tool

```
src/lib/erp/tracker.ts             getTrackerSnapshot({feedLimit?}) — the ONE
                                   aggregation: Promise.all over ~30 cheap
                                   count/take queries; merges families into a
                                   unified feed; returns TrackerSnapshot (§4).
                                   Zero app deps (db + approval-kinds only) so
                                   vitest can drive it directly.
src/app/api/tracker/route.ts       GET — requireApiSession guard (M7-B door),
                                   optional ?feedLimit=1..40 (default 30),
                                   400 on out-of-range, 200 JSON snapshot.
src/app/(erp)/tracker/page.tsx     server page (force-dynamic) → <LiveTracker/>
src/components/erp/live-tracker.tsx  client: polling loop (5/10/30s, default
                                   10s), LIVE pulse badge, pause/resume,
                                   tab-hidden auto-pause, NEW-entry highlight,
                                   relative timestamps ticking every 1s.
src/lib/agent/tools.ts             +1 inline read tool get_live_activity
                                   (domain 'meta') wrapping the SAME service.
src/lib/erp/menu-registry.ts       +1 item live-tracker (home group) +
                                   '/tracker' in LIVE_ROUTES.
```

**Why polling, not SSE/WebSocket:** the tracker's data lives in SQLite behind
Next.js route handlers; every "live" datum already lands in the DB at commit
time. A 10s poll of ONE aggregation endpoint (one HTTP round-trip, ~30 light
queries, JSON ~15KB) is simpler than a persistent socket service (new port,
gateway rule, reconnect logic) and survives dev-server restarts. When users
need sub-second liveness (§9 M14), the service interface stays — only the
transport changes.

**THE ONE RULE — createdAt is the live signal.** Every family feed entry and
every "today" count uses `createdAt >= startOfLocalDay`, NOT the business
date (orderDate/prodDate/grnDate stay business-facing elsewhere). Rationale:
the tracker shows *recording activity* (who entered what, when), which is
exactly "what's going on live"; business-date windows already exist on the
registers. One rule across all 16 families — no per-family date special cases.

## 4. Data contract — TrackerSnapshot

```ts
export interface TrackerFeedEntry {
  kind: string          // family key (§ table below)
  label: string         // human family label, e.g. 'Sales Invoice'
  docNo: string         // mono identifier (doc no, or synthesized)
  meta: string          // one-line context: 'party · qty pcs · ₹value'
  status?: string       // family status when it has one
  at: string            // ISO createdAt — the feed sort key
  href: string | null   // deep link to the view page (null = none)
}

export interface TrackerSnapshot {
  generatedAt: string                     // ISO server time
  kpis: {
    docsToday: number                     // Σ all family rows created today
    prodPcsToday: number                  // Σ ProductionEntry.qty today
    despatchPcsToday: number              // Σ PcsDespatch.totalPcs today
    stockMovesToday: number               // StockLedger rows today
    gateToday: number                     // GateEntry rows today (in+out)
    agentTurnsToday: number               // AgentTurn rows today
    approvalsToday: number                // Approval decisions today
    pendingApprovals: number              // Approval status='pending'
    ordersToday: number; posToday: number; grnsToday: number
    invoicesToday: number; paymentsToday: number; cutsToday: number
    jobworkToday: number
  }
  feed: TrackerFeedEntry[]                // merged, createdAt desc, ≤ feedLimit
  approvals: {
    pendingByKind: { kind: string; label: string; count: number }[]
    oldestPendingMin: number | null       // minutes since oldest pending row
    recent: { kind: string; status: string; actor: string; at: string }[]
  }
  agent: {
    turns: { prompt: string; toolCalls: number; approved: boolean
             user: string; at: string }[] // last 6, newest first
    approvedToday: number
  }
  system: {
    serverTime: string
    usersTotal: number; usersActive: number   // active flag
    parties: number; stockLedgerRows: number
    flagsTotal: number; flagsOn: number       // AppOption key flag:*
  }
}
```

### §4-B — Module board contract (the parity-style live scoreboard)

```ts
export interface TrackerFamilyRow {
  kind: string            // family key; the 16 feed kinds + board-only 'stock'
  label: string           // 'Orders', 'GRNs', 'Agent Turns'…
  listHref: string | null // the family's register/list page (null = agent panel)
  total: number           // all-time record count
  today: number           // rows with createdAt >= start of local day
  latestDocNo: string | null
  latestAt: string | null // ISO createdAt of the newest row
  latestHref: string | null
  latestMeta: string | null
}
export interface TrackerModuleGroup {
  id: string              // board group id (menu-group-aligned where natural)
  label: string
  families: TrackerFamilyRow[]
}
// TrackerSnapshot gains:
modules: {
  activeToday: number     // families with today > 0
  familiesTotal: number   // 17 (16 feed families + board-only stock ledger)
  groups: TrackerModuleGroup[] // 11 groups, fixed order
}
```

**Board groups (11, fixed order)** — single-line entries in tracker.ts so
context_check can pin the count:

| group id | label | families (kinds) |
|---|---|---|
| orders | Orders | order, sample |
| procurement | Procurement | po, grn |
| cutting | Cutting | cut |
| production | Production | production, jobwork |
| pieces | Despatch & Gate | despatch, gate |
| accounts | Accounts | invoice, payment, journal |
| inventory | Inventory | stock (board-only) |
| quality | Quality | labtest |
| costing | Costing | expense |
| workflow | Workflow | approval |
| agent | AI Agent | agent |

Rules: `total`/`today`/`latest` all follow THE ONE RULE (§3 — createdAt is
the live signal, never business dates). Latest = first row of the existing
take-5 feed fetch per family (no extra queries for the 16 feed kinds); stock
is the ONE extra fetch (findFirst newest StockLedger row) + the already-fetched
total/today. Approvals row counts ALL statuses (decisions are activity);
its `today` = approvals CREATED today (the KPI approvalsToday counts DECISIONS
— different signals, both honest). The stock latest row synthesizes docNo
from docNo ?? txnType and meta from `txnType · itemType · ±qty`.

**Feed families (16)** — model → feed entry mapping (docNo field, meta, href):

| kind | model | docNo | meta | href |
|---|---|---|---|---|
| order | Order | orderNo | buyer · N pcs · ₹value | /orders/[id] |
| po | PurchaseOrder | poNo | party · type · ₹value | /procurement/po/[id] |
| grn | GRN | grnNo | party · type · qty | /procurement/grn/[id] |
| invoice | SalesInvoice | invoiceNo | party · ₹bill | /accounts/invoice/[id] |
| payment | Payment | voucherNo | party · in/out · ₹amt · mode | /accounts/payments/[id] |
| journal | Journal | voucherNo | type · Dr→Cr · ₹amt | /accounts/journal/[id] |
| cut | CutOrder | cutNo | order · N pcs | /cutting/job-order/[id] |
| production | ProductionEntry | — (synth `bundleNo ┃ order`) | order · qty pcs · dept | /production/entry/[id] |
| despatch | PcsDespatch | dcNo | N pcs · vehicle | /pieces/despatch/[id] |
| jobwork | JobworkOrder | dcNo | jobworker · process · qty | /jobwork/order/[id] |
| gate | GateEntry | entryNo | IN/OUT · vehicle · purpose | /dispatch/gate-entry/[id] or /dispatch/gate-pass/[id] |
| sample | Sample | sampleNo | type · N pcs | /orders/samples/[id] |
| labtest | LabTest | testNo | testType · result | /quality/lab-tests/[id] |
| expense | Expense | expNo | category · ₹amt | /costing/expenses/[id] |
| approval | Approval | — (synth `entity#id`) | kind · status · actor | /approvals (inbox) |
| agent | AgentTurn | — (synth `#tools`) | prompt snippet · N tools | null (agent panel owns detail) |

Per family: `take: 5, orderBy: { createdAt: 'desc' }` → merge → sort desc →
slice(feedLimit). Approvals feed = the 5 newest rows of ANY status (decisions
are activity too). Agent feed = the 5 newest turns, toolCalls parsed from the
JSON array (0 on parse failure — a corrupt row must never 500 the tracker).

## 5. UX spec — the live view (REVISED: parity-style board first)

Layout (inside the app shell, max-w-7xl, consistent with the dashboard):

1. **Header row** — "Live Tracker" + subtitle, right side: LIVE badge
   (pulsing emerald dot + "LIVE" when polling; grey "PAUSED" when paused),
   "updated Ns ago" ticking every second, interval Select (5s/10s/30s),
   Pause/Resume button, Refresh-now button. Polling auto-pauses when
   `document.hidden` and resumes on visibility — no wasted queries.
2. **Summary card (parity page look — `Card > CardHeader + CardContent`, 4
   bordered stat tiles `rounded-lg border bg-slate-50/50`)** — Screens active
   today `X/17` (emerald accent), Docs recorded today (accent), Pcs produced
   today, Pending approvals. Title "Live Operations Board" + one-line
   description tying it to the parity scoreboard.
3. **The module board (PRIMARY — one Card per §4-B group, `grid
   lg:grid-cols-2 items-start`)** — table per group, columns: **Screen**
   (label links the family list route; tiny mono route under it — the parity
   page pattern), **Records** (total, tabular-nums), **Today** (emerald bold
   when > 0), **Latest** (mono docNo deep-linked to the doc + meta line
   under), **Updated** (relative time, ticks every 1s), **Status** (dot +
   Active / Idle / No data — the parity Live/Coming pattern, live-driven).
   Group header carries a Badge `X/Y active`. When a family's `latestAt`
   advances between snapshots the row flashes (emerald bg + NEW chip, 15s
   TTL — the feed NEW rule at family granularity).
4. **Secondary detail grid (lg: 3 cols — the Wave-A panels, kept)** — LEFT
   2/3: Activity Feed card (max-h-[32rem] overflow-y-auto custom scrollbar,
   per entry: family chip, mono docNo, meta line, relative time, status
   badge, NEW chip on entries newer than the previous snapshot's newest `at`
   — chip lives 15s). RIGHT column: Approvals card (pending by kind with
   counts + oldest age + View inbox button), Agent Pulse card (last 6 turns:
   prompt truncated to 90 chars, tool-call count, approved badge, user,
   relative time), System card (server time, users active/total, parties,
   stock ledger rows, flags on/total).
5. **States** — initial skeleton ("Connecting…"); error banner "Live
   connection lost — retrying" (keeps polling; never crashes the page);
   empty board rows show "No data" status with an em-dash latest (never
   blank cells).

## 6. Rights & security wiring

- `/tracker` joins the `home` group (landingRoute group of `/`). Middleware
  layer-1 pre-check + layout layer-2 re-check apply automatically via
  findGroupForPath; `home` is always in allowedGroupIds (ADR-018), so every
  logged-in user sees the tracker — correct: it is a read-only company pulse.
- `/api/tracker` uses requireApiSession (the M7-B 401-JSON door) — same
  guard family as /api/erp, /api/agent, /api/upload.
- No secrets in the snapshot: user emails are NOT shipped in the feed;
  agent panel shows the User.name only via… (correction: AgentTurn.userId is
  a plain string user id — the panel shows it verbatim as recorded; no join,
  no email enumeration beyond what the id already is).

## 7. Tests & pin changes

| Pin | Before | After | Where |
|---|---|---|---|
| agent tools | 188 | 189 | context_check.sh, agent-actor.test.ts |
| menu items | 113 | 114 | context_check.sh, menu-registry.test.ts (×3 asserts) |
| live routes | 145 | 146 | context_check.sh |
| vitest | 691 | 691 + tracker tests | STATE |
| context_check | 369 | 369 + M9 checks | context_check.sh |

New tests — `tests/unit/tracker.test.ts` (Wave-A pattern: seed fixtures with
TS-suffixed keys, assert, clean up children-first):
1. snapshot shape: kpis/feed/approvals/agent/system/modules keys present; feed
   sorted desc; generatedAt ISO.
2. seeded Order + GRN + AgentTurn + Approval appear in the feed with correct
   kind/docNo/href; gate href splits by gateType (in→gate-entry, out→gate-pass).
3. today counts include the seeded rows (createdAt = now).
4. feedLimit cap respected; toolCalls parse failure → 0 tools (corrupt JSON row).
5. `get_live_activity` tool: exists in registry, isRead, returns compact
   summary (kpis + screens-active + top feed + pending) — registry pin moves to 189.
6. **modules board (§4-B)**: 11 groups / 17 unique family kinds; seeded rows
   drive order/grn `today` ≥ 1 with latest docNo + listHref pins (/orders,
   /procurement/grn, /inventory/ledger); agent family listHref null;
   activeToday ≥ 3 (order+grn+agent seeded).

New smoke — `scripts/route_smoke_m9.sh` (m8b pattern): unauth /tracker → 307
/login; unauth /api/tracker → 401 JSON; login; /tracker 200 + title grep
"Live Tracker" + LIVE badge + **board greps ("Screens active today",
"Records", "Latest")**; /api/tracker 200 JSON shape greps (feed, kpis,
pendingApprovals, **modules.activeToday, modules.groups.length === 11**);
?feedLimit=1 → ≤1 entry; ?feedLimit=99 → 400; sidebar
contains the Live Tracker door; agent tool surface: POST /api/agent with a
tracker prompt is NOT required (LLM flakiness) — the tool registry test
covers registration.

## 8. Delivery — ONE wave

Wave A (single session): service + API + page + component + tool + menu +
tests + smoke + STATE/worklog + tag `m9-wave-a`. The feature is one cohesive
read-path; splitting it would ship a half-live screen.

## 9. The post-parity improvement roadmap (M10+)

The parity mission (113/113) and hardening M7-M8 are done. What remains, in
priority order — each item is a candidate SPEC, NOT a commitment; sessions
pick from this list top-down unless the user redirects.

### P1 — next 2-3 sessions (highest value)

**M10 — Agent quality pass** (effort M). The 188-tool registry works, but
routing accuracy is unmeasured and the system prompt is unversioned. Work:
(1) PROMPT_VERSION constant + restructured system prompt: a domain map (16
domains), tool-selection heuristics, 5-8 few-shot routing examples covering
known confusions (order vs PO, GRN accept vs create, payment vs journal);
(2) description audit for the 30 weakest tool descriptions (vague → concrete
with arg examples); (3) expand eval_ingest.mjs into a 50-prompt golden set
across all domains with expected-tool assertions; (4) wire the eval into the
session-end protocol as a regression gate. Acceptance: ≥90% tool-routing
accuracy on the golden set; prompt changes versioned; eval one-command.

**M11 — /admin/settings flags UI** (effort S). /api/config is repaired
(AppOption flag:<name>, LLD-07 registry ~30 flags). Build the admin screen:
grouped toggle list over flagRegistry with per-flag effect notes + setFlag
persistence (POST /api/config), admin-only guard (403 non-admin, the
set-password pattern), read-only rendering for unknown/legacy flags.
Acceptance: toggle persists across reload; non-admin 403; no flag can be
created that isn't in the registry (drift-safe).

**M12 — E2E hardening: Playwright golden paths** (effort M). The route_smoke
family is curl+grep — it proves 200s, not interactions. Introduce Playwright
(headless chromium, agent-browser compatible) with specs for the 8 golden
paths: login, order create (form), order create (agent), PO→GRN, invoice→
payment, approval approve, print door, rights denial (merchandiser hitting
/accounts → redirect). Migrate nothing (curl smokes stay as cheap gates).
Acceptance: 8 specs green locally in one command; dev.log stays clean.

### P2 — value adds (pick when P1 is exhausted)

**M13 — Notifications & alerts** (effort M). Approval-pending digest (email
or webhook via AppOption notification.* keys), low-stock threshold alerts on
CurrentStock, daily gate-movement log. New /api/cron/digest route + flags to
arm channels. Acceptance: digest renders pending approvals + low stock; flags
gate sending; no external dependency beyond fetch.

**M14 — Performance & scale** (effort M). (1) createdAt indexes on the 16
feed families + StockLedger (SQLite full scans are fine at hundreds of rows,
not at tens of thousands); (2) server-side pagination on the 5 busiest
registers (orders, stock ledger, party ledger, production, bills) — the
archetype gains `page/pageSize` with total counts; (3) tracker SSE upgrade —
swap polling for a stream when a true liveness need appears; (4) N+1 audit
over the API routes. Acceptance: registers stay <300ms at 10k rows; tracker
poll <100ms at 10k rows/family.

**M15 — Audit log & undo trail** (effort L). Generic audit table written
INSIDE every posting-engine transaction (who, entity, docNo, before/after
diff, at) + an admin viewer with per-user/per-entity filters. High compliance
value for exporters (buyer audits ask for it). Acceptance: every write tool +
form action leaves a row; viewer filters; no posting service may bypass
(engine-level hook, not per-service discipline).

**M16 — Dashboard 2.0** (effort M). Per-role dashboards (merchandiser sees
order pipeline; accountant sees cash position), customizable KPI tiles
(AppOption dashboard.<role>.*), ECharts visuals for the 15-stage chain flow
and 30-day production trend. Acceptance: role-aware render; tile order
persists; charts render from existing registers (no new queries).

### P3 — deferred / conditional (explicitly parked)

- **M17 — Multi-company & fin-year chain** — stays deferred (SPEC-M7 §2);
  unpark only when a second company is actually onboarded.
- **Tally export** — stays SKIP unless a customer demands it (SPEC-M7 §2).
- **PWA / offline entry, Tamil i18n, barcode scanning in cutting** — field
  usability items; each is a candidate spec when tablet rollout is real.

### Standing quality items (not milestones, do opportunistically)

- Kill the remaining `any` types in older view components (dashboard,
  orders-view) — tsc strict is clean, but explicitness helps the next agent.
- The deprecated `middleware` file convention warning (Next 16 wants
  `proxy`) — rename when Next forces it; harmless now.
- dev.log hygiene: the watchdog script exists; keep using it.
