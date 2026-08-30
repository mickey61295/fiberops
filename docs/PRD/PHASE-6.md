# FiberPro ERP — Phase 6 PRD: Platform Hardening & Manufacturing Depth

**Document**: PRD-PHASE-6 · **Status**: Draft for owner review · **Date**: 2026-08-30
**Scope owner**: Maheshbabu Jeyaraj · **Engineering**: Super Z (agent-driven, six-task batch rhythm)
**Baseline**: 1112 vitest green · tsc 0 · context_check 574/574 · 230 agent tools · 78 models · 168 routes · M1–M35 shipped

---

## 1. Executive Summary

FiberPro ERP has reached functional parity with the legacy FiberPro desktop system across the commercial chain: 132 live menu items, 60 document families on one entry engine, 36 registers, 28 reports, 23 print documents, and an agent with 230 tools behind a plan-approve-commit safety model. What the app lacks — confirmed by a code-level audit and a competitive study — is depth in five areas: account and access management, an admin platform, user personalization, planning/industrial engineering, and compliance-grade GST. A sibling rewrite (loomERP) demonstrated that these areas carry real operational value even where its own implementations remained incomplete; this PRD specifies them completely for our architecture, borrowing concepts only.

This document turns that gap list into a buildable program of ten modules (A–J) with functional requirements, technical designs grounded in a verified architecture spike of our own codebase, acceptance criteria, and effort expressed in our milestone-batch rhythm. The recommended sequence is platform-first: fix the P0 defect queue and ship the account/admin foundation (Modules A–B), then personalization (C), then manufacturing depth (D–F), then compliance and traceability (G–H), and finally reach surfaces (I–J). The full program is approximately 19 batches (≈114 milestones, M36–M149). A value-first minimal path covering the four owner complaints plus auth, roles, audit, and saved filters is 5 batches (≈30 milestones) and is explicitly called out in §14.

Three principles govern every module. First, one engine per pattern: new capabilities ride the existing doc-config, register-config, master-config, and print engines rather than spawning per-feature models and routes. Second, agent-first: every module ships chat-reachable read tools on day one, and write tools wherever a human workflow exists, preserving our core differentiator. Third, single-process simplicity: we do not adopt MongoDB, Redis, JWT rotation, or a separate worker process; everything runs inside the one Next.js + Prisma + SQLite deployment we already operate.

---

## 2. Current State Baseline

### 2.1 Where the app stands today (code-verified)

The audit of 2026-08-30 established the following facts that this PRD builds on. Auth is functional but thin: scrypt passwords, an HMAC-signed `fo_session` cookie with a 7-day TTL, a mirrored `fo_rights` cookie for the edge middleware, three guard layers (middleware, layout re-check, API guard), first-admin bootstrap, and self-service change password. There is no login attempt tracking, no lockout, no rate limiting, and no login audit beyond a `lastLoginAt` stamp. Permissions are a fixed 7-value role string on `User` plus `UserGroup.rights` — a JSON array of 17 menu-group ids, where `[]` means all and admin bypasses everything.

The audit log records after-images only: `runCommit` writes `AuditLog` rows with `{creates, updates}` payloads, deliberately without before-images (ADR-002). The admin viewer renders a register over the log but never shows the payload JSON, so there is no field-level change visibility. Document numbering has no counter table: roughly 30 posting services each scan for the first free number with hardcoded prefixes and padding; a central `numbering.ts` registry exists but is vestigial. `finYear` is hardcoded to `'26-27'` at about 15 write sites even though a `FinYear` master with an active flag exists. The 15-stage order chain tracks only 9 artifacts, and `CutBundle.status` is written once at creation and never advanced. Quality consists of generic lab tests and lot approval; there is no AQL, DHU, 4-point, or defect catalog data anywhere. Notifications are a single digest service with an unsigned webhook POST and default-off flags. There is no email or SMS capability, no saved filters or column preferences, no custom fields, no global search page, no dashboard builder, and no mobile surface.

### 2.2 The P0 defect queue (committed, ships before Module A)

Five defects found during the audit are already agreed fixes and form Batch 1 (M36–M41); they are listed here because they gate the perceived quality of everything after. (1) The app mounts the Radix `<Toaster/>` while 20 components call sonner `toast()`, so every success and error notification in the entire application is invisible. (2) The agent SSE route chunks model output with `/.{1,4}/g`, a regex whose `.` never matches newlines, silently deleting every line break from assistant messages. (3) The chat panel renders assistant text as raw plain text with literal `##` and `**` markers even though `react-markdown` is already installed. (4) `/admin` is a 404 that four admin screens' breadcrumbs link to. (5) Approval Inbox Approve/Reject buttons merely open the agent panel instead of acting. The user profile screen and agent chat history are added to this batch since both are small, high-visibility surfaces that close owner complaints directly.

### 2.3 Architecture conventions every module must follow

All modules extend the established two-doors-one-service pattern (ADR-001): form server actions and agent tools call the same posting services, so every new write surface ships both UI and tool against one implementation. Writes flow through `runCommit`, which is the single audit choke point and the natural place to add before-image capture, transaction controls, and post-commit notifications. Read surfaces ride the config-registry pattern: pure-data configs (doc-configs, register-configs, master-configs, print registry) with bijection tests, URL-as-state filter bars, and CSV twins. Configuration values live in `AppOption` rows — the flags system (`flag:*` keys, 33 today) is the sanctioned mechanism, and the `numbering` flag category already exists but is unused, reserved for exactly Module B's number-series work. New Prisma models must stay lean: prefer JSON columns over join tables for sparse data (precedent: `LabTest.values`, `UserGroup.rights`), and prefer one model per concept regardless of how many legacy form variants read it. Every milestone ships with unit tests, a route smoke, live browser verification, spec freeze, and context_check parity — the gates that have kept 35 milestones honest.

---
## 3. Scope and Phasing

Ten modules, ordered by dependency and value. Modules A and B are the platform foundation everything else consumes (permissions gate new surfaces; audit trails them). Module C makes the growing surface usable. Modules D–F are the manufacturing depth block and are independent of each other once A/B exist. Modules G–H are the compliance block. Modules I–J extend reach. The table below is the contract; §14 gives the milestone mapping.

| Module | Name | Batches | Milestones | Phase |
|---|---|---|---|---|
| P0 | Defect queue + profile + chat history | 1 | M36–M41 | 6A |
| A | Account & Auth suite | 2 | M42–M53 | 6A |
| B | Admin platform (roles, audit v2, number series, FY close, controls, locks) | 2 | M54–M65 | 6A |
| C | Personalization (saved filters, columns, custom fields, search, drafts, bulk) | 2 | M66–M77 | 6B |
| D | Planning & Industrial Engineering | 4 | M78–M101 | 6C |
| E | Maintenance & OEE | 1 | M102–M107 | 6C |
| F | Quality depth (AQL, DHU, 4-point, defects) | 1 | M108–M113 | 6C |
| G | GST compliance (GSTR payloads, e-way-bill JSON, TDS) | 2 | M114–M125 | 6D |
| H | Traceability & print platform | 1 | M126–M131 | 6D |
| I | Notifications & signed webhooks | 1 | M132–M137 | 6E |
| J | Mobile reach (PWA-first) | 1–2 | M138–M149 | 6E |

**Out of scope**: multi-tenancy and public self-serve signup (we are single-company by design — A.4 explains the owner-invite alternative), live GSTN/GSP portal submission (G builds to downloadable payloads with the integration seam ready), real-time multi-process infrastructure (no Redis/BullMQ/Socket.IO server), native mobile offline sync, and any change derived from loomERP's AI layer.

---

## 4. Module A — Account & Auth Suite

### A.1 Problem

The app has exactly three account affordances: login, logout, and change password. The profile screen does not exist (the topbar user chip is inert text), passwords have no policy beyond length at bootstrap, there is no forgot-password flow, no way to invite a teammate without an admin hand-creating the row, no email verification, no idle timeout, no lockout, and no login audit. Every security-relevant behavior of the current system is either absent or invisible.

### A.2 Design stance

We adapt the feature set to a single-company ERP rather than copying a multi-tenant SaaS. There is no public signup: accounts are created by an admin (direct create with a set-password link, or by email invite once SMTP exists), which removes the need for open registration abuse controls. Session mechanics stay on the existing HMAC cookie — no JWT, no Redis — hardened with a per-user token version for revocation and an in-database attempt ledger for lockout. Email-dependent features (verification links, reset links, invite links) degrade gracefully: when SMTP is unconfigured, tokens are surfaced to the admin to deliver by any channel (WhatsApp, phone), which is how small Tirupur units actually operate.

### A.3 Functional requirements

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-A1 | User profile screen at `/profile` | Shows initials avatar, name, email, role, group, permission count, last login, active sessions list; edit name; change password; voice/TTS preference toggles; language preference. Topbar chip links here. |
| FR-A2 | Password policy | Configurable minimum length, complexity classes, expiry, and reuse count via admin security settings; enforced at bootstrap, change-password, admin set-password, and invite acceptance. |
| FR-A3 | Forgot/reset password | `/forgot-password` accepts email; if SMTP configured, emails a 60-minute single-use token; otherwise records the request and shows the admin a reset-token panel. `/reset-password?token=` sets a new password, revokes existing sessions (token version bump), and writes an audit row. Anti-enumeration: identical response for unknown email. |
| FR-A4 | Team invites | Admin invites by email + role + group; `UserInvite` row with 7-day single-use token; accept page sets name + password; invited user lands on first-login flow; resend/revoke/cancel from the users screen; works with or without SMTP (token link surfaced to admin). |
| FR-A5 | Idle logout | Configurable timeout (default 30 min) with a 2-minute warning modal and stay-signed-in action; tracked client-side per tab; logout clears cookies and writes audit row; exempt while a doc form has unsaved changes or the agent panel has a pending approval. |
| FR-A6 | Lockout & rate limiting | After 5 failed logins on one account within 15 minutes, lock 30 minutes; failures tracked in a `LoginAttempt` ledger with IP and user agent; lockout honored at login; admin can clear; all outcomes audited. |
| FR-A7 | Login & session audit | Every login (success/fail), logout, lockout, password set/reset, and invite acceptance writes a `LoginAudit` row; `/admin/login-audit` register with filters and CSV; `lastLoginAt` retained. |
| FR-A8 | Session revocation | Password change, deactivation, or role/group change bumps `User.tokenVersion`; the session verify reads it (a layout-level check is sufficient — no middleware change) so stolen cookies die at next request; "sign out all devices" on profile. |
| FR-A9 | First-login wizard | After bootstrap or invite acceptance, a 4-step wizard: confirm profile name → company card (pre-filled from AppOption) → default godown/fin-year acknowledgement → menu-rights summary for the assigned group; skippable, remembered via AppOption flag. |
| FR-A10 | Email channel prerequisite | SMTP settings (host, port, user, pass, from) in admin settings with a send-test button; stored in AppOption with the password value obfuscated; a single `sendMail()` helper used by invite/reset/verification/notification modules (Module I reuses it). |

### A.4 Technical design

New models (4): `UserInvite {id, email, token, roleId, userGroupId, status, invitedBy, expiresAt, acceptedAt}`, `LoginAttempt {id, email, userId?, ip, userAgent, outcome, at}`, `LoginAudit {id, userId?, email, event, ip, userAgent, at, detail?}` and `User +tokenVersion Int @default(0)`. Routes extend the existing `/api/auth/*` family: `forgot-password`, `reset-password`, `invite` (create/resend/revoke, admin-role), `accept-invite` (public with token), plus the existing login/logout/session/change-password/admin-set-password. Idle logout is a client hook in the `(erp)` layout mirroring the voice-toggle localStorage pattern. Session revocation adds a tokenVersion read in `getSessionUser()` (already a DB hit — zero extra cost) and in `requireApiSession()`. Agent tools: `create_user_invite`, `revoke_invite`, `list_login_audit`, `reset_user_password` (wrapping the existing admin door), `get_login_attempts` — all admin-role gated and plan-then-commit where they write. Security flags land in the flags registry under a new `security` category (`security.idle_minutes`, `security.lockout_attempts`, `security.lockout_window_minutes`, `security.lockout_minutes`, `security.password_min_length`, `security.password_expiry_days`).

### A.5 Tests, effort, risks

Unit tests: token generation/expiry/single-use semantics, lockout window arithmetic (pure function), password policy validator, anti-enumeration response identity, tokenVersion invalidation. Route smokes: forgot→reset round-trip, invite→accept round-trip, lockout trigger and admin clear, idle-logout exempt states. Live checks: full browser walkthroughs of both flows. Effort: 2 batches (M42–M53), split hardened-auth (A2/A3/A6/A7/A8) then invite/onboarding/email (A1 remainder, A4, A5, A9, A10). Risks: token delivery without SMTP is manual — mitigated by the admin token panel; idle logout vs long production-entry sessions — mitigated by the unsaved-changes exemption and a per-screen activity signal. Security note: all new public routes are token-gated with constant-time compares, rate-limited per IP via the same LoginAttempt ledger, and never reveal whether an email exists.

---

## 5. Module B — Admin Platform

### B.1 Problem

`/admin` is a 404. Six admin screens exist but there is no hub, roles are a fixed 7-string enum with no CRUD, the audit trail shows no field-level diffs, document numbers are hardcoded per service, the financial year is hardcoded to `'26-27'` in ~15 places, and there are no transaction controls, inventory locks, or number-series configuration. The admin area feels missing because it has no front door and no depth.

### B.2 Functional requirements

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-B1 | Admin hub at `/admin` | Landing page with cards for every admin surface (users, roles, menu rights, options, flags, company, audit, login audit, number series, transaction controls, inventory locks, FY close), each showing a one-line health summary (user count, pending invites, unreviewed audit rows today, open locks); breadcrumbs everywhere point here. |
| FR-B2 | Role CRUD + permission matrix | Roles replace the fixed 7 strings (seeded migration creates the seven as rows; `User.role` becomes `roleId` FK). `/admin/roles` with CRUD and a 17-module × 7-action matrix (view/create/edit/approve/post/cancel/export) with row/column select-all; role level ≥90 = admin bypass; menu-group visibility stays on UserGroup (unchanged). |
| FR-B3 | Action-level enforcement | `requirePermission(module, action)` helper enforced at three choke points: agent tool dispatch (tools registry already carries domain + read/write tags), doc-actions commit, and master-actions for non-view operations; failures return a consistent 403 shape and an audit row; admin bypass preserved. |
| FR-B4 | Audit log v2 — before/after + diff viewer | `runCommit` captures before-images during plan (services already read current rows); payload becomes `{creates, updates:[{table, id, before, after}]}`; `/admin/audit/[id]` drill-down renders a field-level diff table (old → new, changed fields highlighted); register gets an entity filter; historical rows render after-image only with an honest "before-images begin at rollout" notice. |
| FR-B5 | Document number series admin | Consolidate ~30 hardcoded prefix/pad/start sites into the existing (currently vestigial) `numbering.ts` SEQUENCES registry; per-sequence overrides stored as AppOption `numseq.<key>` (prefix, pad, start, next) edited at `/admin/number-series`; a "preview next" chip per series; user-supplied numbers still honored-if-free; behavior contract unchanged (scan-for-gap remains the allocator). |
| FR-B6 | Fiscal year awareness + FY close | Replace every hardcoded `'26-27'` with `activeFinYear()` (helper already exists, unused); new postings stamp the active year; `/admin/financial-year` adds close with pre-checks (open sales invoices, unapproved approvals, unposted draft entries, open bills) and a close gate in `runCommit` that blocks backdated postings into closed years with a clear 412-style error; reopen requires admin + reason + audit. |
| FR-B7 | Transaction controls | Per module + transaction type: enable/disable, allowed roles, date window (no backdating before N days), custom denial message; enforced inside `runCommit` (single choke point); admin console at `/admin/transaction-controls`; violations audited. |
| FR-B8 | Inventory locks | Lock a godown (all item types or specific) for a period with a reason; `postLedger` and master stock writes check the lock and refuse with the reason; lock console with countdown and one-click unlock; lock/unlock audited. |
| FR-B9 | Print template admin + history | `PrintTemplate` model (docType, name, body, active) with a `{{field}}` micro-interpolation rendered at the print route seam (fetchers unchanged, PrintSheet remains the default when no template is active); `PrintLog` records user, docType, docNo, template, timestamp; `/admin/print-templates` editor with live preview against a real document; per-user last-used template memory; admin can clone a built-in layout as a starting point. |
| FR-B10 | Login audit viewer | Register over `LoginAudit` (from Module A) with date/IP/user filters and CSV; linked from the admin hub. |

### B.3 Technical design

One new model (`Role {id, name, level Int, permissions Json, active}`) plus `User.roleId` migration, `PrintTemplate`, `PrintLog`, and an `AppOption`-backed control store for transaction controls and number-series overrides (`controls.<module>.<type>` and `numseq.<key>` rows) — no new control tables. `FinYear` gains `status` (open/closed). Enforcement additions concentrate in three files: `runCommit` (before-image, FY gate, transaction controls), `postLedger` (inventory locks), and `tools.ts` dispatch (permission check via a `requirePerm` wrapper applied at registration time so every tool is covered without touching 230 bodies). The print-template renderer is a ~60-line handlebars-subset (variable substitution, loop over lines, conditional blocks) — no new dependency. Agent tools: `list_roles`, `create_role`, `update_role`, `get_number_series`, `set_number_series`, `close_financial_year` (plan-then-commit), `list_inventory_locks`, `lock_godown`, `unlock_godown`, `get_transaction_controls`, `set_transaction_control`, `list_print_templates`, `render_print_preview` — the admin plane becomes fully chat-operable, consistent with the two-doors principle.

### B.4 Tests, effort, risks

Unit tests: permission matrix evaluation (pure), before-image capture, diff computation, number-series render/override resolution, FY gate date logic, lock-window arithmetic, template interpolation (including the loop and conditional paths). Route smokes: role CRUD round-trip, matrix save, audit drill-down with diff, series override then next-doc preview, close-FY happy and blocked paths, lock enforcement on a real posting. Effort: 2 batches (M54–M65). Risks: the `User.role` string→FK migration touches seed, tests, and rights code — mitigated by a seed-backfill migration plus a compatibility read (`roleName` derived) and a single cutover milestone; tool-dispatch permission wrapping must not break the 230-tool bijection tests — mitigated by applying the wrapper at registry assembly and extending context_check to count tools before/after.

---
## 6. Module C — Personalization & Productivity

### C.1 Problem

Every register and report starts from the same default view for every user; filters live only in the URL and vanish; columns are fixed; there is no way to add a field the schema did not anticipate; no global search (the command palette navigates but does not find data); long entry forms lose everything on an accidental refresh; and register rows cannot be bulk-exported or bulk-actioned. The spike confirmed: zero persistence of filter state, static column configs at four render sites plus CSV, no extension columns anywhere, and `q` search implemented in only ~20 of 36 register services.

### C.2 Functional requirements

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-C1 | Saved filters | On every register and report: save the current URL filter set under a name (personal; optional share-with-group), list/apply/delete from a dropdown in the filter bar; applied filters round-trip to the URL so links remain shareable; the default view is saveable as "My default". |
| FR-C2 | Column customizer | Per-user show/hide and column order on registers and reports (the four render sites plus CSV export respect the preference); reset-to-default; persisted server-side so it follows the user across devices. |
| FR-C3 | Global search | `/search` page and a header box (⌘K opens palette which gains a data tab): one query fans out to registers, masters, documents (by docNo), parties, styles, orders; grouped results with counts, each row deep-links to its view; respects the caller's menu rights; debounced, 350 ms, results capped per group. |
| FR-C4 | Custom fields | Admin defines typed custom fields per entity (text, number, date, select, checkbox; required flag; select options); fields render inside the target master/doc forms after the built-in fields; values stored in a side table; searchable in that entity's register (where the service supports `q`); exportable to CSV; agent tools can read and write them. Initial entity set: Party, Order, Style, SalesInvoice, PurchaseOrder. |
| FR-C5 | Auto-save drafts | All doc-entry forms auto-save to localStorage (debounced) with a restore banner on return; duplicate stash (already exists) and draft stash share one UX; drafts expire after 14 days; explicit discard. |
| FR-C6 | Bulk actions on registers | Row selection with count; actions: export selected to CSV, print selected (for printable families), and per-register actions declared in config (e.g., approve on approvals register); bulk actions enforce the same permissions as the single action. |
| FR-C7 | Screen layout personalization (deferred, stretch) | Per-user field ordering/hiding on the five highest-traffic doc screens, admin-managed defaults per group. Explicitly last in the module and cut-first if pressure mounts — custom fields plus column customizer cover most of the value. |

### C.3 Technical design

New models (2): `SavedFilter {id, userId, slug, name, params Json, sharedWithGroupId?, isDefault}` and `UserPref {id, userId, key, value Json}` (column preferences and future per-user state; key namespaced `cols:<slug>`). Custom fields: `CustomField {id, entity, name, label, type, options Json, required, active, sortOrder}` and `CustomValue {id, fieldId, entityId, value}` — EAV with a typed read helper, precedent `LabTest.values`. Injection point is exactly where the spike located the config/runtime wall: pages clone config and concat extra fields before passing props, while write paths loosen with `.passthrough()` and the service maps extras to CustomValue upserts inside the same transaction. Global search is one route (`/api/search?q=`) that fans out to a curated list of finders (register services with `q`, master search that already powers datalists, docNo resolvers) with per-group caps and right-filtering; the command palette gains a results tab calling the same route. Drafts are client-side localStorage under `fo.draft.<slug>`, never server-persisted (no PHI of half-written docs in the audit trail). Agent tools: `save_filter`, `list_filters`, `define_custom_field`, `list_custom_fields`, `set_custom_value`, `global_search` (the agent itself gains the unified finder — high-value read tool).

### C.4 Tests, effort, risks

Unit tests: filter save/apply/default semantics, column-pref merge with config (hidden columns never break CSV header bijection), custom-field coercion per type, custom-value upsert idempotency, global-search right filtering. Route smokes: saved-filter round-trip, custom-field create→render→search→export, draft save/restore/expiry, bulk export. Effort: 2 batches (M66–M77): batch one is saved filters + columns + global search; batch two is custom fields + drafts + bulk actions (+ C7 if it survives). Risks: EAV queries are un-indexable — mitigated by scoping `q` search to like-prefixed lookups on the narrow entity set and accepting document-level latency; column customization must not desync CSV from screen — mitigated by deriving both from one resolved-column list computed server-side per request.

---

## 7. Module D — Planning & Industrial Engineering

### D.1 Problem

The app has no planning layer: no time-and-action calendar, no order step tracking, no projections, no line loading, no schedule computation, no capacity visibility, and no industrial engineering data (SAMs exist unused on Style; no operation breakdowns, time studies, or skill matrix). `Line.capacityPcsPerHour` and `Machine.capacityPcsPerHour` are stored but never consumed. The closest artifacts are the line-status WIP board and the working-day arithmetic shipped in M31 — which this module becomes the primary consumer of.

### D.2 Functional requirements

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-D1 | TNA templates and entries | Admin defines TNA templates (milestone name, day-offset from order date, owner role, critical flag); applying a template to an order (or auto-apply on order create, per flag) creates dated entries; `/planning/tna` board groups by order with due/overdue coloring; status updates (pending/on-track/delayed/completed/skipped) with reason; delayed-milestone register; order hub gains a TNA card. |
| FR-D2 | Order WBS | Order-level step ledger (step no., name, status, planned vs actual date and qty); auto-seeded steps from the TNA template; delay report; meeting-board view (all open orders, red/amber/green by lateness); feed from existing chain-state artifacts where observable. |
| FR-D3 | Projections | Pre-order pipeline rows (buyer, style, season, qty, probability %, expected date, status: tentative/material-planned/confirmed/cancelled); convert-to-order creates the order and marks the projection confirmed; projections register with probability-weighted totals. |
| FR-D4 | Line loading | Daily load per line (order, operators, helpers, hours, target pcs); `/planning/line-loading` week grid; conflicts (two orders same line/day) flagged; capacity utilization per line computed from `capacityPcsPerHour × hours × working days` using M31 working-day arithmetic. |
| FR-D5 | Schedule calculator | Given an order (qty, style SAM), a start date, lines, operators, hours/day, and target efficiency: computes per-stage (cutting/sewing/finishing/packing) day spans, finish date, and required daily output, skipping Sundays and GovtHoliday shutdowns (M31 helpers); what-if mode edits inputs live; saves as a plan snapshot attached to the order. |
| FR-D6 | Capacity alerts | Nightly (cron on the existing digest path) and on-demand: compare scheduled qty vs line capacity per line/day; over-booked (>100%, critical >120%) and idle (<30%) alerts land in the alert center (Module I) and a capacity register; acknowledge workflow. |
| FR-D7 | IE operation breakdown | Per style: ordered operations (seq, name, machine type, SAM, skill level) with total SAM; draft→approved status; SAM change history with reason; feeds FR-D5 calculator. |
| FR-D8 | Time studies | Per operation+operator: multiple observed cycles (observed minutes, rating 0–150); standard time = avg observed × rating/100 × (1 + allowance%); history register. |
| FR-D9 | Operator skill matrix | Worker × operation upserts with skill level and proficiency 0–100; matrix view per department; used to suggest operators for a loaded line. |

### D.3 Technical design

New models (7): `TnaTemplate {id, name, milestones Json}` (milestone rows live in JSON — template-level data, no join fan-out), `TnaEntry {id, orderId, name, dueDate, status, ownerRole, critical, reason?, completedAt}`, `OrderStep {id, orderId, step, name, status, plannedDate, actualDate?, plannedQty, actualQty}`, `Projection {id, buyerId, styleId?, seasonId?, qty, probability, expectedDate, status, notes, orderId?}`, `LineLoad {id, lineId, date, orderId, operators, helpers, hours, targetPcs}` (unique line+date+order), `OperationBreakdown {id, styleId, status, operations Json, totalSam}` plus `SamChange {id, breakdownId, operationName, oldSam, newSam, reason, by, at}`, `TimeStudy {id, breakdownId, operationName, employeeId, cycles Json, allowancePct, standardTime}`. All pure computations (TNA date math, schedule spans, capacity utilization, standard time) live in `src/lib/erp/planning/` as pure functions with exhaustive unit tests — the M31 discipline. Capacity checks and TNA delay scans ride the existing digest cron as new sections (opt-in by flag), avoiding any new scheduler infrastructure. Surfaces: `/planning` hub menu group (TNA, WBS/meeting board, projections, line loading, capacity) — five new menu items, one new group, menu-registry and rights integration. Agent tools: `apply_tna_template`, `update_tna_status`, `get_order_wbs`, `update_order_step`, `create_projection`, `convert_projection_to_order`, `load_line`, `compute_schedule` (the calculator as a chat tool — "when will SO-1042 finish if we add 5 operators?" is a killer query), `get_capacity_alerts`, `get_operation_breakdown`, `set_operation_sam`, `record_time_study`, `get_skill_matrix`.

### D.4 Tests, effort, risks

Unit tests dominate this module because the math is the product: TNA offset date arithmetic across month/year boundaries and holidays; schedule calculator golden cases (Sunday-only weekend, shutdown week, efficiency derating); capacity threshold edges (exactly 100%, 120%); standard-time formula with rating and allowance; skill-matrix upsert uniqueness. Route smokes per surface; live browser check of the TNA board and calculator what-if. Effort: 4 batches (M78–M101): TNA+WBS, projections+loading, calculator+capacity, IE block. Risks: SAM data does not exist yet (garbage-in schedules) — mitigated by seeding from cost-sheet piece-rates and labeling SAM-less styles clearly in the calculator; holiday data quality was already swept in M31; the meeting board must degrade gracefully with zero WBS rows (empty-state discipline from M28/M35).

---

## 8. Module E — Maintenance & OEE

### E.1 Problem

Machine and MachineCategory masters exist, machines are agent-reachable, and nothing else: no breakdown tracking, no preventive schedules, no spares, and no OEE. In a knitting-dyeing unit machine downtime is money, and the app cannot see any of it.

### E.2 Functional requirements

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-E1 | Breakdown lifecycle | Report (machine, line, symptom, severity), auto or manual assign, resolve (root cause, action, downtime minutes auto-computed from report→resolve), reopen; `/maintenance` board with active breakdowns and today's stats. |
| FR-E2 | MTTR / MTBF analytics | Per machine and per category over a window: MTTR (avg repair time), MTBF (uptime ÷ failures), failure counts, downtime Pareto by root cause; register + chart on the maintenance hub. |
| FR-E3 | Preventive maintenance | PM templates (task checklist, interval days) per machine category; generated PM events (due/scheduled/completed) with per-task completion ticks and parts used; compliance % (completed on time ÷ due); auto-generation on the digest cron. |
| FR-E4 | Spares inventory | Spare-item masters (reuse Item vocabulary), machine-wise spares stock with low-stock flags and reorder points; consumption recorded on breakdown/PM completion. |
| FR-E5 | OEE | Daily machine log (planned minutes, run minutes, actual pcs, reject pcs) via form or agent; OEE = availability × performance × quality with each factor visible; `/maintenance/oee` dashboard per machine/line/window with trend; optional target line. |

### E.3 Technical design

New models (4): `MachineBreakdown {id, machineId, lineId?, symptom, severity, status, reportedBy, reportedAt, assignedTo?, resolvedAt?, rootCause?, action?, downtimeMins?, reopenedFrom?}`, `PmTemplate {id, machineCategoryId, name, intervalDays, tasks Json}`, `PmEvent {id, templateId, machineId, dueDate, status, completedAt?, ticks Json, partsUsed Json}`, `MachineLog {id, machineId, date, plannedMins, runMins, targetPcs, actualPcs, rejectPcs}` (unique machine+date). Spares ride the existing Item/StockLedger engines with an `isSpare` flag on the machine category binding — no parallel inventory. OEE and MTTR/MTBF are pure functions in `src/lib/erp/maintenance/`. Agent tools: `report_breakdown`, `resolve_breakdown`, `list_breakdowns`, `get_machine_stats` (MTTR/MTBF/OEE in one answer), `complete_pm_event`, `log_machine_output` — the shop-floor "machine 12 is down" reflex becomes one chat message. Menu: one new group "Maintenance" or (recommended) items under Production to avoid group sprawl; rights integration as usual.

### E.4 Tests, effort, risks

Unit tests: downtime computation across midnight, MTTR/MTBF with zero-failure windows (honest N/A), OEE factor math including the reject-pcs edge, PM due-date generation with interval skipping while machine inactive. Route smokes: breakdown round-trip, PM completion with ticks and parts, OEE dashboard render. Effort: 1 batch (M102–M107). Risks: machine logs are daily-discipline data — mitigated by agent-first entry and a morning-digest section listing machines with missing logs for yesterday.

---

## 9. Module F — Quality Depth

### F.1 Problem

Quality today is generic lab tests (JSON values, no parameter linkage) plus lot approval and reprocess approval. There is no inspection sampling standard, no DHU (defects per hundred units) target tracking, no 4-point fabric grading, and no defect catalog — so quality data cannot answer "is this lot shippable?" or "which defect is eating us alive?".

### F.2 Functional requirements

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-F1 | Defect catalog | DefectType master (code, name, stage, severity class) seeded with a standard knitwear set; used by inspections, rejections, and DHU; agent-reachable CRUD. |
| FR-F2 | AQL sampling engine | Standard AQL table (general inspection levels I/II/III, 11 AQL levels 0.065–6.5, normal/tightened/reduced switches); given lot size + level + AQL → sample size, accept, reject numbers; AQL inspection doc (order/lot/buyer, size, defects with counts) evaluates accept/reject/rework automatically; buyer default AQL on Buyer master. |
| FR-F3 | Final/inline inspections | Inspection docs (inline per line/hour or final per order/lot) recording defects by type × count × size; DHU computed per inspection and rolled up per order/buyer/style/window. |
| FR-F4 | DHU targets & alerts | DHU targets per buyer and per style with validity windows; breach flags on the inspection result, order hub quality card, and digest alert section; DHU trend register with period filter. |
| FR-F5 | 4-point fabric inspection | Roll-wise inspection doc: points per defect (1/2/4 penalty by severity), width and length per roll, total points per 100 sq. yd., grade (A/B/C per threshold flags); lot-level summary; feeds lot-approval as a signal (flag-configurable: 4-point grade shown beside lot approval). |
| FR-F6 | Quality dashboard | `/quality` hub upgrade: DHU trend, defect Pareto, AQL pass rate, lab-test outcomes, rejection reasons — one screen for the QC head. |

### F.3 Technical design

New models (4): `DefectType {id, code, name, stage, severity}`, `Inspection {id, docNo, kind (aql|inline|final|fabric4), orderId?, lotId?, buyerId?, lineId?, sampleSize, acceptNo, rejectNo, result, dhu?, pointsPer100?, grade?, status, at, by}` with `InspectionDefect {id, inspectionId, defectTypeId, size?, count, points?}` lines (one doc family with kind variants — the doc-configs variant pattern), `DhuTarget {id, buyerId?, styleId?, limit, validFrom, validTo}`, and `Buyer +aqlLevel` / `Style +dhuLimit?` light field additions. The AQL table itself is a frozen constant module with golden-case unit tests (the Code128 discipline: encode the standard once, test byte-exact lookup cases). 4-point grading thresholds are flags. Agent tools: `evaluate_aql` (lot size + level + AQL → plan numbers, no writes — the pre-flight query), `create_inspection`, `get_dhu`, `get_quality_summary`, `create_fabric_inspection`. The lab-test ↔ TestParameter linkage gap (spike finding) is fixed here: TestParameter gains usage by testType, and the lab-test form renders matching parameters.

### F.4 Tests, effort, risks

Unit tests: AQL lookup golden table (~30 pinned cases across switches and levels), DHU arithmetic, 4-point points/100 and grade boundaries, target validity windows. Route smokes: AQL inspection round-trip with auto-evaluation, fabric inspection with grade, dashboard render. Effort: 1 batch (M108–M113). Risks: AQL tables are easy to get subtly wrong — mitigated by pinning lookups to the published ANSI/ASQ Z1.4 values and testing the exact edge rows (lot-size boundaries 51–90, 91–150, ...); defect data starts empty — mitigated by seeded catalog and digest nudge.

---
## 10. Module G — GST Compliance

### G.1 Problem

The app computes GST on invoices, exports a Tally JSON, and generates a clearly-labeled mock IRN. It cannot produce a GSTR-1 return, an e-way-bill payload, or TDS entries — the three compliance artifacts a Tirupur exporter's accountant actually asks for. This module delivers compliance-grade payload generation without betting on portal credentials: everything produces official-shape JSON that the accountant can upload manually today and that a GSP client can submit unchanged tomorrow.

### G.2 Functional requirements

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-G1 | GST register v2 | Every rated transaction (sales invoices, debit notes, GRNs, supplier bills, journal tax lines where applicable) lands in a unified `GstRegisterEntry` view with period/place-of-supply/HSN dimensions; ties exactly to ledger totals (tie-out test is an acceptance criterion). |
| FR-G2 | GSTR-1 payload builder | For a period: official-shape JSON with b2b (invoice-wise, per-rate items), b2cs aggregation, hsn summary, cdnr for debit notes; totals reconcile to the register to the paisa; download as `.json` per the GSTN offline utility schema; a summary screen (tables before JSON) with export; invalid/incomplete invoices (missing HSN/GSTIN/place-of-supply) block with an actionable exception list. |
| FR-G3 | GSTR-2 purchase view | Same discipline on the input side from GRNs and supplier bills: b2b inward, hsn summary; JSON export; exception list for missing supplier GSTIN. |
| FR-G4 | E-way-bill JSON | From a despatch or invoice above the threshold flag (default ₹50,000): Part A (doc details, transaction type, HSN-wise lines) and Part B (vehicle) payload in NIC JSON shape; printable e-way summary; status field on the document (pending/generated-with-JSON/manual-number); no portal call — the transporter uploads; the app never blocks a despatch on e-way state (outage-safety lesson from the study). |
| FR-G5 | TDS | TDS sections (194C 1%, 194J 10%, 194Q 0.1%) with rate table in flags; auto-compute at payment creation against a party's nature flag; `TdsEntry` rows with period totals; TDS payable register + CSV; GST-TDS handled as a separate rate line where applicable. |
| FR-G6 | GST readiness checks | A `/accounts/gst` readiness panel: invoices missing HSN or buyer GSTIN, parties without GSTIN, rate anomalies vs HSN master — each row deep-links to the fix. |

### G.3 Technical design

New models (2): `GstRegisterEntry {id, txnType, docId, docNo, date, partyGstin, placeOfSupply, hsn, rate, taxableValue, cgst, sgst, igst, cess, finYear, period}` (written at invoice/debit-note/bill commit inside the same transaction — a `runCommit`-adjacent hook in the posting services) and `TdsEntry {id, paymentId, section, rate, baseAmount, tdsAmount, partyId, finYear, at}`; plus `Party +tdsNature` and `Party +ewayExempt` light fields. The payload builders are pure functions over the register rows in `src/lib/erp/gst/` (gstr1.ts, gstr2.ts, eway.ts) with schema-shape unit tests pinning the JSON structure (field names, nesting, version header) — shape bugs are the real risk, so tests assert exact key paths on golden fixtures. No gateway client in this module; the seam is one interface (`GspSubmitter`) with a manual-file implementation, so a future credential drop-in is a new file, not a refactor. Agent tools: `get_gst_register`, `build_gstr1` (returns the summary + exception list; JSON generation is a follow-up tool call), `build_eway_bill_json`, `compute_tds`, `get_gst_readiness` — "prepare my GSTR-1 for August" becomes one prompt with an actionable exception answer.

### G.4 Tests, effort, risks

Unit tests: b2b/b2cs/hsn aggregation golden fixtures; intra vs inter state rate split; cdnr sign handling; round-off reconciliation to paisa; e-way threshold and Part A/B shape; TDS rate selection and 194Q threshold. Route smokes: register tie-out for a seeded month, GSTR-1 download with a deliberate exception invoice. Effort: 2 batches (M114–M125): register + GSTR-1; GSTR-2 + e-way + TDS + readiness. Risks: GSTN schema drift — mitigated by pinning to the offline-utility format (stable for years) and versioning the fixture; historical data quality (missing GSTINs) — mitigated by FR-G6 surfacing debt before first filing; perpaisa reconciliation failures are hard failures in tests, never warnings.

---

## 11. Module H — Traceability & Print Platform

### H.1 Problem

Bundles get Code128 labels and a scan reflex (M33), then go dark: `CutBundle.status` is never advanced, no scan events are recorded, garment-level genealogy does not exist, and the 23 print layouts are code-frozen — admins cannot touch so much as a footer without an engineering milestone. Buyers increasingly ask "show me the chain for this carton" and the app cannot answer.

### H.2 Functional requirements

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-H1 | Bundle status lifecycle | Transitions `in_cutting → issued_to_sewing → sewn → packed` advanced automatically by the flows that already exist (line issue, production entry, packing list) plus manual override with reason; status visible on bundles register, order hub, and the scan answer. |
| FR-H2 | Scan events | Every bundle/barcode scan (agent tool, bundle form, new scan page) writes a `ScanEvent` (bundleNo, stage, at, by, source); scan history per bundle; "last seen" on the trace view. |
| FR-H3 | Scan staging | A `/production/scan` keyboard-wedge page: type/scan barcodes rapid-fire into a staging table (device = browser tab), review, then batch-post stage transitions — the two-pass pattern shop floors actually need; staged rows survive refresh (server-side staging). |
| FR-H4 | Garment traceability view | Given a bundle or pcs despatch: chronological chain (cut order → bundles → line issues → production entries incl. rework → packing list → despatch → invoice) assembled from existing ledgers plus ScanEvents; presented as a timeline card; agent tool `trace` answers "where did carton X come from?" |
| FR-H5 | Print template admin + history | As specified in FR-B9: DB-stored `{{field}}` templates per docType with live preview, per-user last-used memory, and a print log. Template rendering happens at the print-route seam; built-in PrintSheet remains the default and the fallback on template error. |
| FR-H6 | Chain-bar completion | Extend `computeChainState` to observe the six dark stages (po, grn, jobwork out/in, rework, despatch) so the 15-dot chain finally lights up honestly; contract test updated. |

### H.3 Technical design

New models (3): `ScanEvent {id, bundleNo, barcode?, stage, status, at, by, source}`, `StagedScan {id, deviceId, bundleNo, stage, at, by}` (posted rows become ScanEvents + status transitions in one `runCommit` transaction), and the PrintTemplate/PrintLog pair from Module B (shared milestone). Traceability assembly is one pure function over existing tables (CutOrder/CutBundle/LineIssue/ProductionEntry/PackingList/PcsDespatch/SalesInvoice + ScanEvent) — no new fact tables, no event sourcing; the registers are already the truth (ADR-002). Agent tools: `scan_bundle` extended to write ScanEvents and accept stage intent, `stage_scan`, `post_staged_scans`, `trace` (bundle/barcode/despatch → chain), plus `get_print_log`. The scan page is one client component with a focused input; keyboard-wedge scanners type + Enter natively, so no hardware integration is needed (the study's serial-scale integration is explicitly out of scope).

### H.4 Tests, effort, risks

Unit tests: lifecycle transition legality matrix, staging post idempotency, trace assembly golden case across the full chain, template render error fallback. Route smokes: scan page flow, staging round-trip, trace view for a seeded order, template preview. Effort: 1 batch (M126–M131) sharing the print-template milestone with Module B if sequenced together. Risks: template rendering user-authored HTML — mitigated by strict interpolation-only syntax (no raw HTML execution), length caps, and the PrintSheet fallback; auto-status advancement could mislead when production entries are backfilled — mitigated by "as-of" honesty on the trace view (events carry timestamps).

---

## 12. Module I — Notifications & Signed Webhooks

### I.1 Problem

The digest is the only notification surface: a morning webhook POST, unsigned, no retry, no delivery log, default-off. Approvals sit unseen; nothing emails or SMSes; the owner learns about a negative-stock crisis only if they open the app.

### I.2 Functional requirements

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-I1 | In-app notification center | Bell + unread badge in the topbar; drawer with all/read/unread tabs, mark-read, deep links; events: approval requested/approved/rejected, capacity alert (D6), DHU breach (F4), PM due (E3), machine breakdown (E1), digest summary; generated inside `runCommit` post-commit hooks — never blocking the write. |
| FR-I2 | Email channel | `sendMail()` on top of Module A's SMTP settings; notification templates (subject/body with variable substitution) admin-editable for the event set; delivered via the API route + a retry ledger (attempt, next-attempt, exponential backoff, cap 3). |
| FR-I3 | SMS channel (HTTP-generic) | A generic HTTP POST channel (URL template + headers + body template configured by the admin) covers Indian providers (MSG91-style) without a vendor SDK; same retry ledger; per-event channel routing matrix (event × channel × recipient role). |
| FR-I4 | Signed webhooks v2 | The digest webhook (and any subscribed event) POSTs with `X-Fo-Signature: sha256=HMAC(secret, body)`; per-endpoint secret with rotation; delivery ledger with request/response snapshot, retry (backoff, cap 5) driven by the digest cron tick; replay-safe timestamp header. |
| FR-I5 | Delivery log & console | `/admin/notifications` console: channel health, template editor, routing matrix, delivery log (pending/sent/failed/bounced) with payload inspector; resend action. |

### I.3 Technical design

New models (3): `Notification {id, userId, type, title, body, href?, readAt?, at}`, `NotificationTemplate {id, event, channel, subject?, body, active}`, `DeliveryLog {id, channel, event, target, payload, status, attempts, lastError?, nextAttemptAt?, at}` — no queue infrastructure: retries piggyback the existing digest cron tick (it already runs and already has a secret-gated POST path), with the ledger making the cron idempotent. The routing matrix and channel configs are AppOption rows. Agent tools: `list_notifications`, `mark_notification_read`, `send_test_notification`, `get_delivery_log`, `rotate_webhook_secret`. SSE could push live badge updates later (the live-tracker already has SSE plumbing) — v1 polls on navigation, which is honest and cheap.

### I.4 Tests, effort, risks

Unit tests: template variable substitution, HMAC signing determinism, retry backoff schedule, routing matrix resolution, post-commit hook never throwing (write safety). Route smokes: notification round-trip on a real approval, webhook signed POST against a local receiver. Effort: 1 batch (M132–M137). Risks: SMTP misconfiguration silent-fails — mitigated by the Module A connection test and failed-state surfacing in the console; SMS HTTP template is user-authored — mitigated by dry-run preview with sample payload before activation.

---

## 13. Module J — Mobile Reach (PWA-first)

### J.1 Problem

Shop-floor realities (scanning, approvals, stock lookup, the morning digest) happen on phones; the app is desktop-only. The study's Expo app proved the workflows but also the cost: a second codebase, a second auth stack, a second release train, and a stub offline layer.

### J.2 Design stance

PWA-first: responsive audit of the five target surfaces, an installable manifest, and one new page that uses the browser `BarcodeDetector`/camera for scanning. Zero new codebases. If shop-floor scanning volume later demands native (offline queue, dedicated devices), the Expo decision can be made with real usage data — the API surface (cookie session + `/api/*`) works for both.

### J.3 Functional requirements

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-J1 | Responsive pass | Login, dashboard, digest, approvals inbox (list + approve/reject), stock view, and order hub render and operate at 390 px width; touch targets ≥44 px; no horizontal scroll. |
| FR-J2 | Installable PWA | Manifest + icons + service worker (cache-first shell, network-first data); install prompt on Android/desktop; app name/icons branded. |
| FR-J3 | Scan page | `/scan`: camera view with BarcodeDetector (graceful fallback to manual entry) scanning bundle barcodes; answer shows bundle + order + last stage and offers stage advance (writing ScanEvents per H2); works on the mid-range Androids the floor uses (Chrome ≥ 120). |
| FR-J4 | Approvals on mobile | The approval inbox becomes fully operational on mobile including the approve/reject actions wired in P0. |
| FR-J5 | Digest on mobile | The digest page (M35) is the PWA landing surface for owners; text block copyable for WhatsApp forwarding. |

### J.4 Technical design

No new models. The service worker is a single hand-written file (shell cache + navigation fallback; no framework). BarcodeDetector is feature-detected with a manual-input fallback so iOS Safari users are never blocked. Auth works as-is (cookie session; the SW never caches authenticated API responses). Agent tools: none new (scan rides H2's tools). Effort: 1 batch (M138–M143), with a second optional batch (M144–M149) only if the responsive audit uncovers deep table redesigns (registers get a card-view toggle on narrow viewports).

### J.5 Tests, effort, risks

Route smokes at 390 px for the five surfaces; Lighthouse PWA pass (installable criteria); scan page with a fixture barcode image. Risks: BarcodeDetector availability — mitigated by the manual fallback; service-worker cache staleness — mitigated by a version-stamped shell and skipWaiting messaging.

---

## 14. Roadmap, Effort, and the Minimal Path

### 14.1 The full program

Nineteen batches, ≈114 milestones (M36–M149), in dependency order. Each milestone is one SPEC'd, unit-tested, route-smoked, browser-verified increment — the unit of work that has held for 35 milestones. At the historical cadence of one batch per working session, this is a multi-quarter program; the ordering below front-loads owner-visible value.

| Phase | Batches | Milestones | Ships |
|---|---|---|---|
| 6A Platform | 5 | M36–M65 | P0 fixes, profile, chat history, auth suite, roles/permissions, audit v2, number series, FY close, controls, locks |
| 6B Personalization | 2 | M66–M77 | Saved filters, columns, global search, custom fields, drafts, bulk actions |
| 6C Manufacturing | 6 | M78–M113 | TNA, WBS, projections, loading, calculator, capacity, IE, maintenance/OEE, AQL/DHU/4-point |
| 6D Compliance & trace | 3 | M114–M131 | GST register, GSTR-1/2, e-way JSON, TDS, bundle lifecycle, scan/staging, traceability, print admin |
| 6E Reach | 2–3 | M132–M149 | Notifications, signed webhooks, PWA |

### 14.2 The minimal path (if scope must compress)

Five batches, ≈30 milestones: Batch 1 (P0, M36–M41) → Batch 2 (auth hardening: lockout, login audit, forgot/reset, idle logout, M42–M47) → Batch 3 (admin hub + roles CRUD + matrix + audit diff, M48–M53) → Batch 4 (saved filters + columns + global search, M66–M71) → Batch 5 (AQL + DHU as the single highest-value manufacturing slice, M108–M113 partial). This path closes every owner complaint, gives the app a real admin plane, and proves the manufacturing pattern — everything else extends it.

### 14.3 Sequencing notes

Modules D/E/F are parallelizable after 6B; G depends on B's FY work for period logic; H shares its print milestone with B (FR-B9 = FR-H5, specced once, built once); I depends on A's SMTP and consumes events from D/E/F — it should be sequenced after at least two event producers exist; J is last but its responsive audit (FR-J1) can run early as a standing constraint on every new surface from Batch 3 onward.

---

## 15. Cross-Cutting Concerns

**Migrations.** Every module's schema changes ship as additive Prisma migrations with seed-backfills (roles seeded from the 7 strings; AQL/defect catalogs seeded; custom fields empty). No destructive migration is ever required by this PRD; the one column-type change (User.role string → roleId) is executed as add-column, backfill, dual-read, cutover, drop-nullable across two milestones.

**Security.** All new public endpoints are token-gated with constant-time compares and per-IP rate limits riding the LoginAttempt ledger. Permission enforcement failure modes fail closed. No secret (SMTP pass, webhook secret, reset token) is ever returned by a read API; AppOption storage for secrets gains an obfuscation-at-rest convention and admin-only reads. The agent inherits the acting user's permissions at the tool-dispatch wrapper — the agent can never exceed its user.

**Performance.** The EAV custom-value lookups and ScanEvent history are the only potentially hot paths; both are capped (custom fields: 25 per entity; scan history: last 200 per bundle with pagination). Registers keep their existing limit/pagination contracts; the global-search fan-out is capped per group and right-filtered.

**Testing strategy.** Pure-function golden tests for every standard table and formula (AQL, OEE, standard time, schedule spans, GSTR shapes) — the M27/M33 discipline of pinning external truth as fixtures. Route smokes per new surface. context_check parity extended at every milestone: menu items, tools count, print registry, and a new check for permission-matrix coverage of tools. Live browser verification per milestone, unchanged.

**Rollout & flags.** Every new surface ships behind a module flag (default off) where behavior changes existing flows (chain-bar completion, auto bundle-status, GST register writes); owners enable per module after review. The digest gains a short "what changed" note the morning after each enable.

---

## 16. Open Decisions for the Owner

1. **Admin matrix depth in v1**: enforce action-level permissions on agent tools + doc actions immediately (recommended), or ship the matrix as informational for one phase and enforce at the choke points in the next?
2. **SMTP provider**: any preference (existing mailbox vs a transactional service)? Determines invite/reset email deliverability work in Module A.
3. **TDS scope**: payments-only (recommended v1) or also at bill-pass stage?
4. **Mobile confirmation**: PWA-first as specced, or jump straight to Expo given dedicated scanning devices on the floor?
5. **Numbering reset policy**: should sequences reset each financial year (common in the trade) or run continuously? Flag-controlled either way; default recommendation is FY-reset on rollover, continuous within the year.
6. **Dashboard builder**: deliberately deferred beyond this PRD (the role-profiled dashboard already persists layouts per role); confirm deferral or promote it into Phase 6B.

---

## 17. Appendix — Evidence Base

**Own-codebase architecture spike (2026-08-30)**: verified numbering mechanics (~30 hardcoded sites + vestigial central registry), audit after-image-only payloads with no diff viewer, absent lockout/attempt tracking, static register/doc/master config walls and their injection points, `finYear` hardcode inventory (15 sites), chain-state observation gaps (6 of 15), dormant bundle-status vocabulary, quality data model (LabTest/TestParameter unlinked; no AQL/DHU/4-point), print registry seam (fetcher → PrintDoc boundary identified as the template insertion point), digest/webhook shape (unsigned, no retry/log), and the flags/AppOption conventions all modules build on.

**Comparative study (loomERP @AI_updates, code-only, AI/docs excluded)**: confirmed the feature areas are real operational value and catalogued 25+ admin surfaces, personalization platform, planning/IE/maintenance/quality depth, GST payload patterns, scan staging, print-template administration, and notification channels — as concepts. Nothing from that codebase is adopted: its multi-tenant SaaS machinery, JWT+Redis rotation, BullMQ worker, per-variant model sprawl, and unwired real-time layer are explicitly rejected for our single-process architecture, per the owner's direction.

**Owner complaints audit (live-browser verified)**: chat text rendering (root-caused, P0), upload flow (works end-to-end), missing profile screen (Module A), missing admin screen (Module B hub).
