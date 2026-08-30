# loomERP vs FiberOps — Feature Gap Analysis (2026-08-30)

**Method**: Code-only analysis of `loomERP-placeholder@AI_updates` (cloned to `.analysis/loomERP`, 250 MB). Per owner instruction: all AI/agent/LLM code there was skipped entirely (`ai/`, `mcp/`, `po-engine/`, `ai-*` models/routes/services, extraction services), all repo docs (`.md`) ignored. Nothing copied — concepts only. Numbers verified first-hand; deep-dives by three parallel code-analysis passes.

---

## 1. What loomERP is

- **Stack**: Express + Mongoose (MongoDB) + BullMQ/Redis + Socket.IO backend; React 19 + Vite SPA client ("WeaveOps" brand); Expo/React Native mobile app; MCP plugin-web widget bundle. Deployed via docker-compose/Render (API + worker processes).
- **Scale (verified)**: 261 client pages (350 route entries), 50 mobile screens, 258 non-AI server models, 198 route files (~1,415 endpoints), ~150 services, ~55–72 print docTypes, 86 config-driven census registers, 80 masters pages (34 via one CRUD factory).
- **Provenance**: it is *also* a FiberPro-parity rewrite (same legacy menu tree, PAR template libraries, FiberPro-parity flags) — a sibling attempt at the same business problem, on a different stack.
- Context that matters for us: it is roughly **3.3× our model count** and **~8× our endpoint count**. Much of that multiplier is real feature breadth we do not have; some of it is a looser architecture (every doc type = own model + route + service vs our 60 doc-configs on one engine).

## 2. Head-to-head

| Dimension | FiberOps (ours) | loomERP (theirs) |
|---|---|---|
| Pages/routes | 168 routes | 261 pages / 350 route entries |
| Data models | 78 (Prisma/SQLite) | 258 non-AI (Mongoose/Mongo) |
| API endpoints | ~54 (18 route files) | ~1,415 (198 route files) |
| Masters | 41 entities | ~80 pages |
| Print docTypes | 23 (fixed registry) | ~55–72, admin-managed mustache templates + print history + per-user prefs |
| Registers/reports | 36 registers + 28 reports | 86 census registers + ~30 report cards + analytics suite |
| Auth | login/logout/bootstrap/change-pw, cookie session, 3 guard layers | full suite: signup, email verify, forgot/reset, invites, onboarding wizard, idle logout, lockout, rate limit, JWT rotation w/ reuse detection, must-change-password gate |
| Permissions | 7 fixed roles, menu-group rights matrix | Role CRUD + 14-module × 7-action matrix + menu-item visibility per role + account-group rights |
| AI agent | 230 tools, plan→approve→commit, voice STT/TTS, doc upload+ingest | (skipped — broken per owner) |
| Mobile | none | Expo app, ~40 API-backed screens incl. camera scanning |
| Realtime | SSE live-tracker | Socket.IO infra complete; only alerts actually wired |
| Background jobs | none | BullMQ worker: webhooks, email, reports, notifications + 2 crons (stock reconcile 02:00 UTC) |
| Deployment | one Next.js app + SQLite | API + Redis + Mongo + worker + client + mobile (5 moving parts) |

## 3. Features loomERP has that we LACK (the gap list)

### A. Auth & account — directly answers "user profile screen is not there"
- Self-serve signup w/ password-strength meter + 14-day-trial flow; email verification (token + resend banner); forgot/reset password (anti-enumeration); invite-by-email acceptance (auto-login); **5-step onboarding wizard** (company → plants → warehouses → invite team, server-persisted/resumable).
- **Profile page**: read-only card (initials avatar, user/tenant/permission count/last login) + change-password + notification-prefs link. (Modest — but it exists; ours is nothing.)
- Session hardening: JWT access (15 min, JTI denylist) + refresh rotation via Redis Lua with reuse-detection & family revocation; login rate-limit (10/10min); account lockout (5 tries/30 min); **idle logout w/ 5-min warning**; `mustChangePassword` forced gate; login/logout audit.

### B. Admin platform — directly answers "admin management screen is not there"
25+ admin screens vs our 6: Users (+Invitations tab: resend/cancel, admin reset-password), **Roles CRUD w/ 14×7 permission matrix** (view/create/edit/approve/post/cancel/export per module, row/col select-all), MenuRights matrix (menu-item × role, bulk grant/revoke, admin locked), AccountRights (GL account-group × role view/post), Settings (7 tabs: **document number series**, approval rules, posting policies, security policy, reference data re-seed, SMTP config w/ live connection test), System options, Tally GST setup, **LoginAudit w/ CSV export**, MIS widget settings, production config, bulk soft-Delete w/ typed "DELETE" confirmation + preview counts, approval-workflow builder (dynamic multi-level: level+role+required), **PrintTemplates admin + PrintHistory**, **AuditLogs w/ field-level diff viewer** (before/after) + searchable user filter, NotificationSettings (channels/templates/delivery log), **TransactionControls** (per module+type: enable, role list, date window), **InventoryLockPolicies** (warehouse+module+lock type+period), **FinancialYearClose** (w/ pre-close checks: open bills, pending approvals, unposted entries), StockAdjustments + reconciliation view, StyleChange bulk tool, Organization CRUD (companies/plants/warehouses), Completions utility.

### C. Personalization & UX platform (we have almost none of this)
- **Saved filters server-persisted per page** (save/apply/delete); **column customizer** per list; **screen-layout editor** (per-screen, per-user or tenant-default: sections, fields, widths, visibility, order); **custom fields** admin (typed, rendered inside doc forms); **dashboard builder** (17-widget catalog, drag/resize grid, share, scheduled email delivery).
- Global search page (12 categories, URL-synced, debounce) + **command palette Ctrl+K** (quick-nav empty state, grouped results, full keyboard nav); keyboard-shortcut help modal (`?`); **recent-items slide-over** (typed badges, timeAgo); **auto-save drafts + restore banner**; **bulk actions bar + row selection** (incl. export selected); 15 inline **quick-add master modals** mid-form; notification center (bell, unread badge, tabs, mark-read, deep links); light/dark theme.

### D. Planning & Industrial Engineering (whole domain missing for us)
- **TNA** (time & action): milestone templates w/ day offsets, apply-to-order, status tracking, delayed-milestone computation.
- **WBS** per order (steps, planned/actual, delay report, meeting-board coloring); **projection** pipeline (tentative→confirmed w/ probability); **line loading**; **production schedule calculator** (forward/backward, SAM-based stage durations, Sunday skip); **capacity alerts** (over/under-booked per line/day w/ acknowledge); scenario-planning what-if simulator; meeting dashboard (live WBS board + fabric arrival + accessories status).
- **IE**: operation breakdown per style w/ SAM + change history; **time studies** (observed×rating×allowance math); operator skill matrix; efficiency leaderboard/benchmarks.

### E. Maintenance / OEE (missing)
- Machine breakdown lifecycle (report→assign→resolve) w/ **MTTR/MTBF** analytics; preventive-maintenance templates + compliance %; **OEE** (availability×performance×quality from machine logs); spares inventory w/ low-stock alerts. One of their most complete domains.

### F. Quality depth (we have lab tests + lot approval only)
- **AQL sampling plans** (real ANSI-style tables, normal/tightened/reduced, 11 levels, evaluate endpoint); **DHU** targets/trends/alerts; **4-point fabric inspection** (points/100sqyd roll grading); inline inspections + final audits; defect Pareto/FPY analytics; 8 lab-test templates vs our generic parameters.

### G. Traceability & shop-floor scanning
- Garment-level **piece genealogy** (scan → order/style → materials → bundles → stage entries w/ defects → QC → dispatch as a timeline); **scan staging** (two-pass: validate at scan, batch-post per device); **stage entry** (cutting/sewing/finishing/qc/packing); 7 QR types (bundle/piece/roll/carton/order/machine/location) + barcode definitions (bundle/piece/roll/carton, 500/batch, lifecycle + dept hand-offs); **TV display** for the floor (WebSocket).

### H. Notifications (we have: one webhook, default-off)
- Channels: SMTP email + **SMS via Twilio/MSG91/custom HTTP** (secrets AES-encrypted at rest); 11 event templates w/ variables + test-send; BullMQ delivery queue w/ retry/backoff; per-user delivery log; device tokens registered for push (sender unwired). In-app notification model w/ read/unread/expiry.

### I. GST / finance depth (we have: invoice GST calc + mock IRN + Tally JSON export)
- **GSTR-1/GSTR-2 filing payloads** (official shape, b2b/b2cs/hsn, sums exactly to register) + gateway submission (sandbox/live) + filing log w/ ARN; **e-way bill NIC v1.0 client** auto-wired into dispatch posting (₹50k threshold, GSTN outage never blocks dispatch); TDS (194C/194J/194Q); forex: currency master, exchange rates (manual), FCR master (RBI-notified); debit-note settlement (18 endpoints); party outstanding w/ ageing drill; daily P&L (by line/trend/order); cumulative-cost ledger cascaded on bill posting; quick costing; **Tally XML import** (10MB/50k-element guard) as well as export.

### J. Procurement extras (missing)
- Supplier **quotations + side-by-side quote comparison**; **indents** (internal requisition w/ approval flow); **shortage requests** (5 categories, full workflow); budget amendments; special/urgent requisitions; general (indirect) purchases.

### K. Accessories sub-domain (we have accessory master + stock only)
- Full accessory ERP: acc categories/types/descriptions/shorts masters, acc GRN, issues, returns+ack, process issue/receipt, shortages, party balance + 19 accessory census registers.

### L. Document control (missing)
- Versioned document repository (local/gridfs/s3, tags, entity links, revisions); **attachment rules** (mandatory doc types per transaction — blocks posting); related-documents graph; digital-signature ledger (metadata only, not crypto).

### M. Print platform (we have a solid fixed 23 — theirs is bigger and admin-editable)
- ~55–72 docTypes incl. per-material-class PO/GRN/DC/debit-note variants, order sheets (plain/set/colorwise/amendment/confirmation), GST invoice family, trade commission statement, Form JJ export annexure, bundle issue slip; **mustache HTML templates managed in admin UI**; HTML preview + PDF; **print history + per-user last-used-template memory**; label family (bundle/piece/roll/garment-tag) printing the exact scannable payloads.

### N. Reports & analytics breadth
- 86 census registers (46 stock/procurement-family + 40 production-family) from 2 config templates; one-page order profitability report; order-history + **order-pairing ledger**; roll-stock report; analytics suite: CEO dashboard, YoY analytics (win funnel, product-mix treemap), quality analytics (AQL heatmap, defect Pareto, DHU trend, FPY), procurement analytics (supplier radar, lead-time box plot, price trends), per-role dashboards (merchandiser/warehouse/finance/quality).

### O. Mobile app (we have none)
- ~40 API-backed screens: camera scan (structured QR), staged scans, order tracking, approvals, stock browse + ledger, production/stage/rejection entry, GRN scan-verify, QC inspection w/ photos, gate entry/exit, stock take, worker self-service, operator/supervisor dashboards, machine status, quick costing, bill lookup, notifications.

### P. Platform / integrations / tenancy
- **Multi-tenant SaaS**: tenant→company→plant→warehouse org tree, per-tenant settings (number series w/ FY-reset, approval auto-thresholds, posting policies incl. backdate limits, security policy, ~20 parity flags), AsyncLocalStorage tenant scoping on every model.
- **Outbound webhooks**: 9 events, HMAC-SHA256 signatures, SSRF guard w/ DNS pinning, BullMQ retries, delivery logs. Nightly **stock-reconcile cron** that auto-creates repair adjustments. Typed API-path catalog (~1,267 endpoints) statically verified client↔server (contract tests, must-reject fixtures).

---

## 4. loomERP's own weak spots (why "beyond repair" is fair — and what NOT to adopt)

1. **Real-time is mostly unwired**: Socket.IO infra + event catalog exist, but only alert events are actually emitted; TV display listens to production/efficiency events nobody sends; notification center polls instead of subscribing.
2. **Mobile offline sync is a stub**: `saveToQueue` has no callers, "sync all" is a setTimeout simulation.
3. **ERP connector** (SAP/Oracle/Tally bidirectional) is a model + admin CRUD with **no sync engine**.
4. No bank reconciliation, no live forex feed, no 2FA, no field-level permissions.
5. Planning math is heuristic with hardcoded defaults (20 operators, 65% efficiency); capacity/TNA/DHU checks are endpoint-triggered, not scheduled.
6. Architecture sprawl: 258 models/198 route files/~150 services for a business our 78-model engine covers — every variant is a new model. High surface = high maintenance = the "beyond repair" feeling.
7. Digital signature is a metadata ledger, not cryptography.
8. **Their AI layer**: skipped per instruction — nothing there informs our agent design.

**Verdict**: their *breadth* is real and worth mining for concepts; their *architecture* and unfinished platform wiring are exactly what we should not replicate.

## 5. What WE have that THEY don't

- A working, safe AI agent (230 tools, plan→approve→commit, voice STT/TTS, doc upload→extract→ingest) — theirs is broken (owner's words, skipped).
- One-engine doc system (60 families) + register/report/master archetypes — same coverage class at a fraction of the model count.
- Daily digest w/ shutdown awareness + working-day planner; barcode Code128 vendored byte-identical to python-barcode; menu parity discipline (249/249 legacy forms).
- Single-process Next.js + SQLite deployment (they need 5 services).
- 1,112 vitest + route smokes + context_check + eval gates; every milestone browser-verified.

## 6. Recommended adoption priorities for OUR app (concepts, not code)

**P0 — the four owner complaints + audit fixes (already queued, unchanged by this analysis)**: sonner Toaster mount, `[\s\S]` chunking fix, react-markdown rendering, `/admin` hub page, real Approve/Reject wiring, user profile screen, chat history.

**P1 — highest-value loomERP-inspired gaps (each is a milestone-sized feature)**:
1. **Auth suite completion**: forgot/reset password, email verification (needs SMTP), invites, idle logout, login audit, lockout/rate-limit. (Our cookie-session can stay — concepts port without adopting JWT.)
2. **Roles & permissions v2**: Role CRUD + module×action matrix (we already have the menu-rights matrix pattern to build on).
3. **Saved filters + column customizer + global search** on registers (our register engine is config-driven — natural fit).
4. **Custom fields** (typed, admin-defined, rendered in doc forms).
5. **Notification center in-app** (we already have SSE plumbing + digest).
6. **Quality depth: AQL + DHU + 4-point** on top of our existing lot-approval/lab-test base.
7. **TNA + WBS planning** on top of our working-day/order-status foundations.

**P2 — larger bets**: planning calculator + capacity alerts; maintenance/OEE; IE (SAM/time studies); traceability v2 (stage entry + piece genealogy); admin-managed print templates + print history; GSTR/e-way-bill real integrations (compliance-grade); quotations + indents + shortages; accessories sub-domain; mobile app (Expo + our SSE/API); webhooks w/ HMAC; multi-company.

**Not recommended for adoption**: multi-tenant SaaS machinery (we're single-company by design), their per-variant model sprawl, JWT+Redis+BullMQ stack churn, ERP-connector model, digital-signature ledger.

---

## 7. The owner's four complaints — closed out

| Complaint | Status |
|---|---|
| AI chat outputs text weirdly | Root-caused in OUR app (newline-stripping regex + no markdown render) — fixed queue P0. loomERP irrelevant (AI skipped). |
| Upload file | Works in OUR app (live-verified end-to-end). |
| User profile screen | Missing in ours. loomERP has a read-only profile + change-password + notif-prefs link — a modest pattern worth exceeding: editable name, avatar initials, voice/TTS prefs, session info, digest channel prefs. |
| Admin management screen | `/admin` is a 404 hub in ours; loomERP has 25 admin screens. Concept list in §3.B is the roadmap seed for our admin hub. |
