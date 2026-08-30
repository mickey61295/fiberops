# loomERP Phase — App Audit & Analysis Readiness (2026-08-30)

Marker commit: `0d8f632 "starting loomerp analysis"` (empty, marks the start of this phase).
Scope of this document: (1) deep audit of the fiberops repo (our half of the two-repo analysis), (2) live-browser verification of the owner's four complaints, (3) the loomERP comparison plan and its current blocker.

---

## 1. Git state

- Working tree clean. All four six-task runs complete: M1–M35 shipped, 1112 vitest green, tsc src 0 errors, context_check 574/574, eval --static 15/15.
- Local: 12 commits ahead of `origin/main` (includes M33/M34/M35 + close-out + the loomerp marker). 57 tags total, `m30`–`m35` among them.
- **Push BLOCKED**: no PAT, no SSH key, no credential helper in this session environment (the third-run close-out scrubbed the PAT; none re-supplied since). Verified: `git push` → `fatal: could not read Username`. Everything is stacked and ready — one `git push origin main --tags` once credentials exist.

## 2. loomERP analysis — BLOCKED on repo access

- Target: `https://github.com/mickey61295/loomERP-placeholder/tree/AI_updates` (private — anonymous HTTPS clone of public repos works from this environment, this repo demands auth).
- Constraint ack (owner's instruction): analyze loomERP **code only**; **skip all AI/agent/LLM code there** (owner: "broken as hell"); **ignore their docs/**; **copy nothing** into fiberops — findings only.
- Unblock options: (a) paste a fresh PAT in chat (revoke it after, per project security discipline), or (b) temporarily make the repo public.
- On access, deliverable = module-by-module feature comparison vs the fiberops inventory in §3 (dimensions: screens/routes, masters, doc flows, registers/reports, printing, integrations, permissions/users, misc utilities).

## 3. fiberops inventory (code-verified, docs ignored)

- **168 page routes** (+36 CSV export routes, +18 API routes), **132 menu items — all live** (0 coming-soon), 17 menu groups, 100% legacy-form coverage (249/249).
- **230 agent tools** (81 read / 149 write, plan→approve→commit for all writes), **78 Prisma models**, **23 print docTypes** (Code128 barcode + QR), **28 report configs** in 6 packs, **36 register configs** (CSV each), **41 masters**, 18 approval kinds, role-profiled dashboard.
- Auth: scrypt login, HMAC session cookie, 3 guard layers, first-admin bootstrap, self-service change password, user/group CRUD at `/admin/users`, menu-rights matrix at `/admin/menu-rights`.
- What does NOT exist anywhere: user **profile** screen, dedicated **role management** (7 fixed string roles), field-level permissions, chat history UI, email/SMS notifications.

## 4. The owner's four complaints — verified live (browser, admin@fiberpro.local)

### 4.1 "The AI chat outputs text weirdly" — ROOT CAUSE FOUND (3 stacked defects)

1. **Server strips every newline** — `src/app/api/agent/route.ts:273`:
   `const chunks = msg.content.match(/.{1,4}/g) || [msg.content]`
   Regex `.` never matches `\n`/`\r`, so the "nicer UX" 4-char chunker **silently discards all line breaks** from the model's completion before emitting `text-delta`s. Live-verified: rendered assistant message had `newlineCount: 0` while being a multi-section report ("…2026### 🚨 **URGENT…" — headers fused together).
   Fix: `match(/[\s\S]{1,4}/g)` (or emit whole text; chunking adds nothing).
2. **No markdown rendering** — `src/components/agent/agent-panel.tsx:468` renders `{m.text}` as plain `whitespace-pre-wrap`. Literal `##`, `**bold**`, `-` bullets show raw. `react-markdown` is **already in package.json but never imported**.
3. Model style: emoji-heavy markdown headings amplify the mess while raw.

### 4.2 "Try the upload file" — WORKS (live-tested)

- Attached `test-po-upload.csv` (3 yarn PO rows) via the paperclip → `POST /api/upload` → chip appears → prompt auto-prefixed `[Attached document: test-po-upload.csv]` → agent called `list_documents` + `extract_document` → **correct full answer** (3 POs, 1,050 kg, ₹1,87,500, both suppliers, delivery window). Zero console errors.
- Caveat: the success/error feedback goes through `toast.success()` which is currently **invisible** (see 5.1) — the chip is the only feedback.

### 4.3 "The user profile screen is not there" — CONFIRMED ABSENT

- No `/profile`, `/account`, or equivalent route exists. Topbar user chip (`topbar.tsx:74-81`) is inert plain text — not clickable, no avatar. Only account affordances: change-password dialog + logout.

### 4.4 "Admin management screen is not there" — the hub is literally a 404

- `/admin` itself has **no page** — live-verified Next 404 — yet 4 admin screens' breadcrumbs link to it (`admin/users`, `admin/settings`, `admin/options`, `admin/menu-rights`). Clicking "Admin" anywhere = dead end, which makes the whole admin area feel missing.
- The admin screens DO exist and work: `/admin/users` (+groups +password admin), `/admin/menu-rights`, `/admin/options`, `/admin/settings` (32 flags), `/admin/company`, `/admin/audit`. Missing vs a typical ERP: role CRUD, field/action-level permissions, an admin landing hub.

## 5. Why the app "feels partially finished" — 28 audit findings (5H/8M/15L)

### High (user-visible)
| # | Finding | Where |
|---|---------|-------|
| H1 | **Every toast in the app is invisible** — 20 components call sonner `toast()` but `layout.tsx:4,49` mounts the Radix `ui/toaster` instead; sonner's `<Toaster/>` never mounted (live DOM check: `sonnerToasterMounted:false`). All save/approve/upload feedback vanishes. | `src/app/layout.tsx` |
| H2 | Approval Inbox **Approve/Reject buttons don't act** — both merely `openAgent` (open the chat). No id passed, no `/api/agent/approve` call. | `workflow-view.tsx:208-214` |
| H3 | `/admin` 404 dead link from 4 screens' breadcrumbs. | see 4.4 |
| H4 | e-Invoice IRN / e-Way Bill is an honest offline mock (labeled). | `einvoice.ts` |
| H5 | No user profile screen; inert user chip. | see 4.3 |

### Medium
- M1 `finYear: '26-27'` **hardcoded** on every StockLedger insert (`posting-engine.ts:68`) — ignores the FinYear master.
- M2 Multi-company deferred forever; company name hardcoded in 2 places.
- M3 15-stage chain bar: 6 stages (`po, grn, jobworkOut/In, rework, despatch`) can never light — flags not observed.
- M4 Notifications half-armed: digest flag default-off, webhook URL empty, single channel.
- M5 `next.config.ts` `ignoreBuildErrors: true` (tsc discipline is manual-only).
- M6 Chat = `useState` only: no history UI (AgentTurn table already records every turn); Reject leaves no server-side trace; approve marks ALL pending turns approved (coarse `updateMany`).
- M7 `/api/seed` shells out via hardcoded absolute path `/home/z/my-project`.
- M8 CSV exports silently capped at 500 rows (`register-screen.tsx:104`).

### Low (selected)
`/live` orphan route (no link anywhere) · dead coming-soon machinery · `/api` hello-world stub · ~20 unused shadcn scaffold components · stale Masters-hub copy (BOM editor exists) · `?order=` no-op on Bundles · "scan" is paste-only · dead ternary in recon-card · "Fill with AI (future)" never built · package.json still named `nextjs_tailwind_shadcn_ts`, no `test` script for the 1112 vitest suites · model name hardcoded in 2 places.

### Verified NOT broken
Zero TODO/FIXME markers in src/ · all 132 menu items live with zero orphan menu entries · all 78 models exercised · every write tool has plan+commit+audit · upload→extract→ingest pipeline works · voice STT+TTS works · print system (23 docTypes, Code128 byte-identical to python-barcode) real · dashboard/registers/reports/masters archetypes all real.

## 6. Proposed next-phase queue (from OUR audit — nothing here comes from loomERP)

- **P0 (hours each, huge feel-payoff):** ① mount sonner `<Toaster/>` (one line, restores ALL app feedback) ② fix the `[\s\S]` chunking regex ③ render assistant markdown via react-markdown (already installed) ④ create a real `/admin` hub page (or repoint breadcrumbs to `/masters`) ⑤ wire Approval Approve/Reject to `/api/agent/approve` per-card.
- **P1:** user profile screen (name/role/password/voice+TTS prefs) ③ chat history from AgentTurn ④ dynamic finYear.
- **P2:** role management, chain-bar completion, CSV cap handling, package hygiene.
- Then the loomERP gap-comparison report the moment repo access lands.
