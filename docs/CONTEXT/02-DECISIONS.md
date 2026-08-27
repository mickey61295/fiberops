# 02 — DECISIONS (Architecture Decision Records)

> Append-only. Format: ADR-<n> — title · date · status · context → decision → consequence.
> New sessions: read these BEFORE deviating from any of them. To change a decision,
> add a new ADR that supersedes it — never edit an old one.

---

ADR-001 — Agent-first ERP with form duality · 2026-08 · ACTIVE
Context: Fiberpro's value was industry flow + guided chains, despite ugly UI. User
validated agent-only data entry but requires working forms alongside.
Decision: Every operation has TWO doors — a DocScreen form (keyboard-first) and the
agent (chat/PDF). Both call the SAME service function in `src/lib/erp/posting/`.
Consequence: no business logic in tools or components; shared zod schemas
(`src/lib/erp/schemas/`); form-vs-agent parity is testable.

ADR-002 — Menu parity, not form parity · 2026-08-26 · ACTIVE
Context: legacy has 321 WinForms + 491 reports; rebuilding 1:1 is impossible and
undesirable (variant forks `_New/_old/Large/Copy` are legacy debt).
Decision: replicate the MENU TAXONOMY (17 groups, ~90 items) with 5 screen
archetype engines driven by configs (MasterTable / DocScreen / RegisterScreen /
ApprovalInbox / ReportHub). Evidence: `docs/form-taxonomy.json` (321 forms →
307 unique units → 21 doc families, 52 masters, 43 registers).
Consequence: adding the 40th master = a config object, not a component; parity
tracker lives in the menu registry.

ADR-003 — StockLedger is the source of truth · 2026-08 (phase-2.0) · ACTIVE
Context: legacy maintained denormalized projector tables (ST_ProgBalance_*,
ST_Ord_inHand, ST_PartyBalance_Abs) via triggers — drift-prone.
Decision: `StockLedger` rows are canonical; balances (program status, stock
positions) are COMPUTED from the ledger; projector-style columns may exist for
legacy compat but are derived, never authoritative.
Consequence: `get_program_status` reads the ledger; E2E tests assert ledger rows.

ADR-004 — NULL-consistent stock buckets · 2026-08 (phase-2.0) · ACTIVE
Context: CurrentStock buckets fragmented by deptId (cut-in leg wrote {dept:null}
bucket, line-out leg wrote {dept:D4}) — stock never netted (SQLite composite-unique trap).
Decision: `postLedger` always bumps the (itemType, itemId, godownId) bucket with
deptId/orderId NULL; dept stays on the LEDGER row for reporting only.
Consequence: any new stock-writing code must reuse postLedger; never invent a
bucket key variant.

ADR-005 — Approval gate on all agent writes · 2026-08 · ACTIVE
Context: mutations by LLM need user control (ERP data integrity).
Decision: write tools produce a Plan (dry-run diff); user approves via
`/api/agent/approve`; commits are transactional + audited (AgentTurn).
Consequence: form door skips the chat approval card (user is directly editing)
but writes the same audit rows.

ADR-006 — Menu registry drives everything · planned M1 · ACTIVE
Context: sidebar, breadcrumbs, parity tracker, agent deep-links and coming-soo
pages must never disagree.
Decision: single `src/lib/erp/menu-registry.ts` — each entry {id, label, group,
route, archetype, legacyForms[], phase, tool, wiring{chainPosition, refs,
counterpartDocs, drillDown}}. All navigation surfaces derive from it.
Consequence: sidebar/parity tracker are generated; adding a screen = adding a row.

ADR-007 — One chain definition, two consumers · planned M1/M3 · ACTIVE
Context: the 15-stage Tirupur chain powers both the agent's suggest_next_step and
the form-side "Next →" CTA; duplicating invites drift.
Decision: `src/lib/erp/chain.ts` exports PIPELINE once; suggest_next_step tool and
DocScreen pipeline bar + nextFormUrl prefill both consume it.
Consequence: chain changes happen in exactly one file.

ADR-008 — Real App Router routes from M1 · planned M1 · ACTIVE
Context: current app is a single-page ViewKey switcher (79-line page.tsx) —
deep-linking, breadcrumbs, per-screen agent prefill impossible.
Decision: migrate to `/orders`, `/procurement/grn`, `/orders/[id]` etc. The old
view-switcher is deleted, views are re-homed as route components where reused.
Consequence: M1 is a structural migration; do it before growing new screens.

ADR-009 — SQLite + Prisma, single tenant, coyCode preserved · 2026-08 · ACTIVE
Context: portable dev DB; legacy is multi-company (Coycode) but user runs one company.
Decision: keep SQLite/Prisma now; retain coyCode field in schema; multi-company UI
deferred to M6+ (open decision #1).
Consequence: no company-switch UI; queries don't filter by company yet — document
this if it changes.

ADR-010 — History hygiene & push protocol · 2026-08-26 · ACTIVE
Context: GitHub 100MB limit blocked push; git-filter-repo stripped >50MB blobs;
PAT secrets leak via chat and .git/config.
Decision: never commit binaries from source-erp/; push protocol = user mints FRESH
PAT → inject into origin URL → push → immediately `git remote set-url origin
https://github.com/mickey61295/fiberops.git` → user revokes PAT.
Consequence: every push is explicit, credentialed, and scrubbed.

ADR-011 — Context continuity framework · 2026-08-26 · ACTIVE
Context: sessions lose context; sandbox rolled back 3 times; summaries carried
inaccurate facts (tool count, PROMPT_VERSION, missing /api/upload).
Decision: this `docs/CONTEXT/` system (00-START-HERE protocol, STATE verified by
`scripts/context_check.sh`, ADRs, PITFALLS, CONVENTIONS, per-milestone specs).
Files are the only memory; spec-before-code; tag-per-milestone.
Consequence: every session bootstraps identically; drift is detectable, not silent.

ADR-012 — Legacy semantics preserved via enum registry · planned M2/M3 · ACTIVE
Context: legacy logic is full of magic numbers (DeptID 4/8/10/11/−7, TrType 1..20,
EntryOption 1/2, RateFor S/C/R/Z, Rework 0/1/2, GoodPcsFlag G/M, AddDedCode 40/41/42).
Decision: one `src/lib/erp/legacy-enums.ts` maps every legacy code to a named
constant with a doc comment citing the legacy SP/trigger it came from.
Consequence: new code never hardcodes magic numbers; grep-able provenance.

ADR-013 — M2 boundary: pure single-table master CRUD · 2026-08-26 · ACTIVE
Context: plan §6-M2 listed "HSN/GST setup" and "opening stock" inside M2, but HSN
has no Prisma model and opening stock is a StockLedger posting operation — both
would force schema changes / ledger writes into a milestone whose value is the
config-driven CRUD engine + form×agent parity.
Decision: M2 = MasterTable engine + 24 schema master entities with create/update/
search/export via BOTH doors (form + agent, one service). HSN master → M6
admin/settings era (Style.hsn string suffices for invoices). post_opening → M3
PostingEngine era (plan §7 already stages it there). BOM grid editor → M3 style
DocScreen. No deletes in M2 (reference-data safety; revisit with rights in M6).
Consequence: zero schema churn in M2; plan §6 M2/M3 lines annotated; the 20+
legacy master forms with no schema model (banks, machines, rates, ranges,
templates, threads, stages, expenses, HSN×2…) are documented in SPEC-M2 §3 with
explicit M6 disposition instead of being silently dropped.

ADR-014 — M3 boundary: chain-executable forms over full doc-family coverage · 2026-08-26 · ACTIVE
Context: plan §6-M3 lists the full doc-family set (DC family, Pcs Receipt/Transfer,
cutting-issue/ready-to-cut/production, multi-process GRN) alongside the core chain.
Half of those families have NO posting tools yet (§7 gaps: create_dc, transfer_stock
general-form, issue_fabric_to_cut, ready_to_cut standalone) — building their screens
now would mean forms without the agent door or one-off logic outside the
PostingEngine, violating P2/ADR-001. The acceptance that matters for the business
is "full Tirupur chain executable through forms".
Decision: M3 = PostingEngine extraction (22 ops → services + shared schemas) +
DocScreen engine + the 20 screens in SPEC-M3 §8 (chain-complete set + accounts +
inventory ops incl. 2 NEW tools post_stock_adjustment/transfer_stock) + W1/W3/W4
wiring + /api/upload. DC family, pcs-receipt/transfer, ready-to-cut/cutting-issue/
cutting-production, multi-process GRN, GAN/cut/lot approval INs, and the
amend/cancel/close menu screens are re-sequenced to M4/M5 (cancels become doc-view
actions now; their menu items go live-by-absorption only when M5 confirms).
Consequence: live items 24/113 after M3 (not 42); plan §6 M3 line annotated;
SPEC-M2's deferrals (post_opening → M3, BOM editor → Order Hub card) are honored —
post_opening lands as a Wave-D stock-adjustment companion if budget allows, else
M5 with ADR note.

ADR-017 — Zero-dependency auth: scrypt passwords + HMAC session cookie (M7-A) · 2026-08-27 · ACTIVE
Context: SPEC-M6 §3 deferred login and rights guarding to M7; ADR-016 landed
User/UserGroup (rights Json) but the app ran single-user dev mode with every
page and API open. The 598-test suite and the ingestion/smoke scripts hit APIs
cookie-less, so a big-bang auth would break everything at once.
Decision: M7 lands in waves. Wave A = login core only: ADR-017 schema is
FIELD-additive on User (passwordHash String? — null means "cannot log in yet";
lastLoginAt DateTime?; still 65 models; schema-65-baseline tagged). Auth is
zero-dependency: scrypt (node:crypto) passwords stored `scrypt$salt$hash`;
stateless HMAC-SHA256 session token (`userId.exp.sig`, Web Crypto only) in the
httpOnly cookie `fo_session` (7-day TTL); `src/lib/auth/session.ts` stays
EDGE-PURE (no node:crypto/Prisma imports — enforced by a unit test) because
edge middleware verifies the cookie without db access; the Node half
(cookies() + db lookup) lives in current-user.ts. Middleware guards PAGES only
(307 → /login?next=); the (erp) layout re-checks the user row. First-admin
bootstrap (/api/auth/bootstrap) is allowed only while NO user has a password,
then self-locks 403 forever. AUTH_SECRET env with dev fallback constant.
Consequence: APIs (/api/erp, /api/agent, /api/upload) remain open until Wave B
(401 JSON + cookie fixtures for the HTTP test suites); rights enforcement
(sidebar filtering, per-route checks, admin password reset UI) is Wave C;
rotating AUTH_SECRET invalidates all sessions (users just re-login). Dev
credentials: admin@fiberpro.local / admin123 via scripts/seed_admin.ts.

### ADR-018 — Rights enforcement semantics (M7 Wave C, 2026-08-28)

Context: ADR-016 landed `UserGroup.rights` (Json array of menu group ids, []
= all) but enforcement was deferred; SPEC-M7 §4 Wave C required NavSidebar
filtering + per-route checks + /admin/users password set/reset. Constraint:
SQLite + Prisma cannot run inside edge middleware, so the middleware cannot
read fresh rights from the db.

Decision: a two-layer design that mirrors the Wave A auth pattern (crypto at
the edge, db row in the layout):
1. **Edge pre-filter** — login/bootstrap stamp a second signed cookie
   `fo_rights` (HMAC AUTH_SECRET over a {role, rights, exp} snapshot; same
   7-day TTL as fo_session; `src/lib/auth/rights.ts`, edge-pure by test).
   The middleware maps pathname → menu group via menu-registry
   `findGroupForPath` and 307-redirects denied routes to the first allowed
   group landing. A missing/tampered/expired cookie SKIPS the pre-check
   (fail-open at the edge only — the cookie can never grant).
2. **Fresh layer 2** — the (erp)/layout re-derives allowed groups from the
   DB on every full load, filters the NavSidebar, and re-checks the route via
   the `x-pathname` request header the middleware stamps (layouts receive no
   pathname). Revocations apply on the next page load; NEW grants take effect
   at the next login (stale edge cookie denies until then) — documented,
   smoke-asserted staleness contract.

The ONE rule (`computeAllowedGroupIds`): role 'admin' → all groups (recovery
hatch — an admin can always reach /admin/users to fix a broken matrix);
rights null (no group assigned) → all (back-compat: group assignment is
optional and pre-Wave-C users must keep full access); rights [] → all (the
RightsMatrix convention); otherwise listed ∩ valid ids ∪ {'home'}. Home is
ALWAYS allowed — the dashboard is universal and it makes the deny-redirect
target '/' loop-free by construction.

Password administration is a ROLE door, not a rights door:
`POST /api/auth/admin/set-password` (session + role admin) sets/replaces or
clears any passwordHash from the /admin/users PasswordAdmin card; clearing
your own password is rejected (400 self-lockout guard). /api/seed became
admin-only (403) in the same wave — a destructive reseed must not be one
click away for a restricted merchandiser.

Consequence: no schema changes (65 models hold); the two auth layers can
never disagree because they share computeAllowedGroupIds + findGroupForPath;
admin-override semantics are explicit (role beats group rights); the grant
lag is the accepted cost of zero-dependency edge verification (single-tenant
dev app, per SPEC-M7 §2 non-goals). Test surface: 653 vitest (rights 20 +
set-password 11 + 2 amended), route_smoke_m7c.sh 36/36.
