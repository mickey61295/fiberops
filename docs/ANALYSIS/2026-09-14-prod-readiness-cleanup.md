# FiberOps — Production Readiness & Dev-Surface Cleanup

Date: 2026-09-14 · Status: PROPOSED (owner review) · Scope: application cleanup,
dev-surface removal, prod-readiness gaps. **Deployment/infra CONFIGS are
explicitly deferred** (env, hosting, gateway headers, cron install, backup
destination) — everything here is code, docs, tests, and in-app surfaces.

Method: direct codebase audit (2026-09-14) + production-readiness research
(2026 checklists: pows.cloud, llmbestpractices, HelloCrossman, Mittal-Tech,
Addy Osmani shipping-launch, code-splitting.com, Knip docs, Mixpanel/Unleash
flag hygiene). Numbers below are verified against the working tree unless
marked "generate".

---

## §1 Executive summary

The app is functionally deep (191 pages, 72 API routes, 151 menu items,
1,687 tests, 274 agent tools) but still carries the scaffolding of the
milestone-driven build: a parity scoreboard, two overlapping live-tracker
surfaces, dead coming-soon machinery (every menu item is live, so the
`/coming/[id]` page and its nav branches are unreachable), a dev seed button
that shells into a sandbox path, dev-only scripts with hardcoded `/home/z/...`
paths, and missing production failure states (no error/loading/not-found
boundaries, no health endpoint, `typescript.ignoreBuildErrors: true`).

Three categories of work, in risk order:

1. **Blockers** — things that must be true before a real user touches the app:
   build integrity (no ignored type errors), graceful error surfaces, health
   check, seed/dev-door removal, honest navigation.
2. **Cleanup** — dev scoreboards out of the product, dead code/deps/components
   removed, script/doc hygiene, counters frozen to one honest inventory.
3. **Hardening** — observability, rate limits, security headers, UX states,
   accessibility. Some of these are config-adjacent; marked as such.

Already scheduled elsewhere (do not duplicate): M61 covers the sonner toaster,
the model badge, the upload dir, plan warnings, tool authorization; the test
setup sandbox-path fix landed 2026-09-14.

---

## §2 The inventory (verified 2026-09-14)

| Thing | Count | Source |
|---|---|---|
| Pages (`page.tsx`) | 191 | filesystem |
| API routes (`route.ts`) | 72 | filesystem |
| Menu items | 151 | `menu-registry.ts` (`MENU_ITEMS`) |
| Menu groups | 17 | `menu-registry.ts` (`MENU_GROUPS`) |
| `LIVE_ROUTES` entries | 188 | `menu-registry.ts` |
| Live menu items | **151/151 (0 coming)** | `parityStats()` — verified 2026-09-14 |
| Live groups | **17/17** | `parityStats()` |
| Legacy form coverage | **250/250 (100%)** | `parityStats()` |
| E2E specs | 8 | `tests/e2e/*.spec.ts` |
| Unit/pipeline test files | 83 (1,687 tests) | README / STATE |
| shadcn UI components | 48 files | `src/components/ui` |
| Agent tools | 274 (+1 in M61: `list_tools`) | `tools.ts` |
| Prisma models | 96 | `schema.prisma` |
| Dev/legacy scripts | ~40 files | `scripts/` |
| Docs | `CONTEXT/` (living) + dated `ANALYSIS/` + `PLAN-2.0-MENU-PARITY.md` | `docs/` |

#### Per-menu inventory (verified 2026-09-14, `parityStats()` + `itemsByGroup`)

Every menu item is live — there are **no items linked to nothing** and none
routed to a placeholder. Frozen numbers to carry into `PARITY-SNAPSHOT.md`:

| Menu group | Items | Live | Coming |
|---|---:|---:|---:|
| home | 5 | 5 | 0 |
| orders | 9 | 9 | 0 |
| programs | 6 | 6 | 0 |
| procurement | 13 | 13 | 0 |
| inventory | 18 | 18 | 0 |
| cutting | 11 | 11 | 0 |
| pieces | 10 | 10 | 0 |
| production | 10 | 10 | 0 |
| jobwork | 6 | 6 | 0 |
| dispatch | 9 | 9 | 0 |
| accounts | 19 | 19 | 0 |
| costing | 7 | 7 | 0 |
| hr | 9 | 9 | 0 |
| quality | 5 | 5 | 0 |
| approvals | 2 | 2 | 0 |
| reports | 3 | 3 | 0 |
| masters-admin | 9 | 9 | 0 |
| **Total** | **151** | **151** | **0** |

Legacy forms: 250 mapped / 250 live (100% coverage). Groups: 17/17 live.

### 2.1 Dev-facing surfaces found in the product

| Surface | Where | Problem for prod |
|---|---|---|
| Parity tracker page | `src/app/(erp)/parity/page.tsx` | Internal milestone scoreboard ("M1–M6", legacy form counts) visible to any authenticated user |
| Live ops tracker | `src/app/(erp)/tracker/page.tsx` + `LiveTracker` + `/api/tracker` | Overlaps the newer live page; two systems, unclear which is canonical |
| Live stream tracker | `src/app/(erp)/live/page.tsx` + `LiveStreamTracker` + `/api/live-tracker[/stream]` | Duplicate of the above (M9 companion surface) |
| Coming-soon machinery (DEAD) | `src/app/(erp)/coming/[id]/page.tsx`, `coming-soon.tsx`, `getHref`/`groupLandingHref` fallbacks, nav coming dots (`nav-sidebar.tsx:93,141,151`) | Unreachable: all 151 items are live, `isLive()` is true for every item — delete the page, components, fallbacks, and badges in C1 |
| Seed button + route | `NavSidebar` + `src/app/api/seed/route.ts` | Shells out to `cd /home/z/my-project && bunx tsx scripts/seed.ts` — sandbox path, destructive, dev-only |
| `/api/config` | `src/app/api/config/route.ts` | Verify it serves flags (keep) vs dev config (remove) — audit in C1 |
| Sandbox paths | ~40 files in `scripts/`, `tests/e2e/helpers.ts`, `scripts/e2e.sh`, `api/seed` | Won't run on the owner's machine/deploy; same class as the test-setup fix |
| One-off milestone scripts | `scripts/m32..m35_live_check.sh`, `patch_*.py`, `gen_*docx.js`, `state_header_*.py`, `pdf-plan/` | Dead after their milestone; cognitive + repo noise |
| Dev artifacts | `dev.log` (ignored), `.playwright-mcp/` (NOT ignored), `server.log` (ignored), `upload/` probe leftovers | Remove + gitignore `.playwright-mcp` |
| Parity tests | `tests/unit/menu-registry.test.ts`, parity parts of pipeline tests | Keep (they pin the registry) but decouple from user-facing surfaces |

### 2.2 Production-readiness gaps found (code level)

| Gap | Evidence | Severity |
|---|---|---|
| Type errors ignored at build | `next.config.ts` → `typescript.ignoreBuildErrors: true` | **Blocker** — a prod build must fail on type errors |
| No error boundary | No `error.tsx` / `global-error.tsx` anywhere | **Blocker** — one thrown exception white-screens a page |
| No loading/not-found states | No `loading.tsx` / `not-found.tsx` | High — raw Next states; bad on slow Tirupur links |
| No health endpoint | no `/api/health`; `scripts/watchdog.sh` probes by hand | High — uptime monitoring & post-deploy checks need one |
| `reactStrictMode: false` | `next.config.ts` | Medium — masks double-render bugs; re-enable with a test pass |
| No CI script surface | `package.json` has no `lint`/`typecheck`/`test` scripts; start pipes through `bun` + `tee server.log` | Medium — gates exist (vitest/tsc/context_check) but are manual |
| Package identity stale | `"name": "nextjs_tailwind_shadcn_ts"`, version `0.2.1` | Medium — rename `fiberops`, version + git tag |
| README drift | Says "GLM agent", "94-model schema", counts that move every milestone | Medium — refresh from STATE at freeze |
| Dead code/deps | 48 UI components (~20+ unused per earlier audit); `next-intl` installed but unused; duplicate live components | Medium — Knip pass |
| Security headers ownership unclear | Not set in `next.config.ts`; likely at the gateway (CSP seen in proxied responses) | Medium — document and verify; app-level fallback |
| General API rate limiting | Login has lockout (M60); other API routes rely on session only | Low–Medium (config-adjacent) |
| Observability | M61 adds structured logs; no error tracker/uptime monitor yet | Medium (config-adjacent) |
| Stale strategy docs | `PLAN-2.0-MENU-PARITY.md` still describes "12 views + 89 tools" | Low — archive/annotate |
| `B-0003` duplicate buyer | Data leftover from the incident; delete door deliberately out of scope | Accepted (owner directive) |

### 2.3 Second sweep — git, dependencies, shell wiring, root artifacts

Found after the first pass; all verified 2026-09-14.

| Finding | Evidence | Action |
|---|---|---|
| **Live DB tracked in git** | `git ls-files db/` → `db/custom.db` (business data + password hashes) | `git rm --cached db/custom.db`, add `db/custom.db` to `.gitignore`, document that prod starts from a restore/seed. History purge (filter-repo) only if the repo ever leaves the owner's control. |
| Parity is wired into the shell, not just a page | `app-shell.tsx:96` mounts `ParityFooter`; `nav-sidebar.tsx:166` links it; `topbar.tsx:36,41` special-cases `/parity` | Parity removal touches page + footer component + nav link + topbar breadcrumb case + `coming-soon.tsx:106` link |
| `/live` is an orphan route | No link to `/live` anywhere in `src`; it is the M14 SSE page ported from a parked accelerator. The user-facing live surface is `/tracker` (menu item `live-tracker`, home group) | Delete the `/live` set (`(erp)/live`, `live-stream-tracker.tsx`, `live-snapshot.ts`, `/api/live-tracker/*`) **or** promote it over `/tracker` — one surface, not two. Audit first: which has the better UX, then delete the other completely |
| Dead npm dependencies (0 imports in `src`) | `next-auth`, `@ai-sdk/openai`, `@ai-sdk/react`, `ai`, `z-ai-web-dev-sdk`, `uuid`, `docx` | Remove from `package.json` after Knip confirms; `next-auth` in particular is a security-surface dep for auth you built yourself |
| Two lockfiles committed | `bun.lock` (357 KB) + `package-lock.json` (386 KB); scripts/README use npm | Pick one package manager (npm is the documented path), delete the other lockfile, add an engines/packageManager pin |
| Root strategy doc stale | `PLAN.md` (18 KB, "CONVERGENCE PLAN", still points at `/home/z/my-project/PLAN.md` + `download/` + `workspace/` dirs that do not exist) | Move to `docs/CONTEXT/` as history or archive; it is not current truth |
| Worklog split + size | root `worklog.md` 481 KB (active) vs `docs/CONTEXT/worklog.md` 7 KB (stale stub) | Keep one canonical worklog under `docs/`; retire the stub |
| Probe/one-off scripts tracked | `scripts/perf_probe.ts`, `scripts/probe_cancel_ledger.ts`, `scripts/ops5_dup_probe.py` alongside the milestone scripts already listed | Same `scripts/legacy/` or delete treatment as §3.5 |
| Root build artifacts present | `tsconfig.tsbuildinfo` (612 KB, ignored but on disk), `dev.log` (14 KB, ignored) | Delete from the working tree (already ignored) |

---

## §3 Cleanup design

### 3.1 Parity tracker: internal scoreboard → frozen snapshot

The registry (`menu-registry.ts`) is the **single source of truth** and stays.
The *page* is dev bookkeeping and leaves the product surface.

Decision: move parity off the runtime app.

- `/parity` becomes admin-only (same gate as `/admin/audit`) **or** is removed
  from the route tree and its numbers are frozen into
  `docs/CONTEXT/01-STATE.md` + a generated `docs/PARITY-SNAPSHOT.md`.
- Recommended: **remove the page from the app**, add
  `scripts/prod_inventory.mjs` that prints the same tables (menu item, group,
  live/coming, legacy forms, agent tools, coverage %) and writes
  `docs/PARITY-SNAPSHOT.md`. Run it in the session gate (`context_check`) so
  the snapshot cannot silently drift.
- The sidebar stops linking to `/parity`; nothing user-facing references it.
- `parityStats()` and `menu-registry.test.ts` stay (they guard the registry).

### 3.2 "Screens live per menu" — make it honest and frozen

Today three numbers exist and none is frozen together: 151 items, 17 groups,
188 `LIVE_ROUTES` entries. `parityStats()` computes the real answer.

Plan:

1. `scripts/prod_inventory.mjs` (new, ~60 lines) imports the registry and
   prints, per group: `group | items | live | coming | coverage%`, plus the
   totals from `parityStats()`. Output goes into `docs/PARITY-SNAPSHOT.md`
   (seed values already verified — see §2).
2. Freeze those numbers into `01-STATE.md` (the counters section already
   carries "menu 151", "routes 188" — add "live items 151/151", "live groups
   17/17", "legacy coverage 100%").
3. **Delete the dead coming-soon machinery**, because there is nothing to
   gate: `isLive()` is `LIVE_ROUTES.has(item.route)` and all 151 items are
   live. Remove `src/app/(erp)/coming/[id]/page.tsx`, the `ComingSoon*`
   components, the `/coming` entries in `LIVE_ROUTES`/route prefix handling,
   the `getHref`/`groupLandingHref` `/coming/...` fallbacks (return the real
   route; a missing route becomes a bug the tests catch, not a silent
   placeholder), and the nav coming-dot/`aria-label` branches. Keep
   `menu-registry.test.ts` asserting 100% live coverage so a future
   non-live item fails CI instead of shipping a hidden "coming soon".

### 3.3 Live trackers: two become one

`/tracker` (M9 `LiveTracker` + `/api/tracker`) and `/live`
(`LiveStreamTracker` + `/api/live-tracker[/stream]`) serve the same idea.
Audit in C1 (which one has live consumers, which tools reference which), then:

- Keep the newer SSE-based `/live` (verify M9 vs M61 UX), delete the other
  page, component, API routes, and lib (`tracker.ts`, `live-snapshot.ts` as
  applicable) in one batch; tests for the deleted one go with it.
- If both have distinct value (daily ops vs live pulse), keep both but merge
  the endpoints and name them clearly (`/ops-tracker`, `/live`). Default:
  **one surface**.

### 3.4 Seed & dev doors

- Remove the seed button from the nav (it is admin-only but dev-only by
  intent).
- Delete `src/app/api/seed/route.ts` or reduce it to a 404 in production:
  simplest is **delete the route** — the dev workflow runs
  `scripts/seed.ts` directly (the route comment says zero in-app callers).
- Audit `/api/config`: if it only serves UI flags, keep (rename mentally to
  `/api/flags`); if it is M1 dev scaffolding, remove with its callers.

### 3.5 Sandbox-path and script hygiene

- Batch-fix `/home/z/my-project` in `scripts/` to `process.cwd()`-relative
  (same pattern as the tests/setup fix), starting with the **gates that must
  run**: `eval_routing.mjs`, `eval_ingest.mjs`, `e2e.sh`, `e2e_global_setup.ts`,
  `context_check.sh`, `watchdog.sh`, `recovery_drill.sh`.
- Move one-off milestone scripts (`m32..m35_live_check.sh`, `patch_*.py`,
  `gen_*docx.js`, `state_header_*.py`, `audit_legacy_forms.py`,
  `analyze_forms.py`, `pdf-plan/`) to `scripts/legacy/` (or delete). They are
  history, not tooling.
- Keep and harden the real tools: `seed.ts`, `eval_routing.mjs`,
  `eval_ingest.mjs`, `e2e.sh`, `context_check.sh`, `recovery_drill.sh`,
  `watchdog.sh` (or its replacement by uptime monitoring).
- `.gitignore`: add `.playwright-mcp/`; confirm `dev.log`, `server.log`,
  `upload/`, `db/backups/` stay ignored (they are).
- Delete `dev.log`, `.playwright-mcp/`, probe files in `upload/` from the
  working tree.

### 3.6 Dead code, deps, components

- Run **Knip** (`npx knip`) once, review, and remove: unused files, unused
  exports, unused deps. Known: `next-intl` (unused; kept only if i18n is
  planned — M62/M63 decision), plus any shadcn components never imported.
- The earlier audit flagged ~20 unused shadcn scaffold components; remove the
  ones Knip confirms are unreferenced (keep the design-system baseline the UI
  actually uses).
- Delete duplicate live-tracker files per §3.3.
- Add a CI/baseline assertion: `knip --reporter compact` in the session gate
  with a checked-in ignore list (prevents new rot without a big-bang).

### 3.7 Docs cleanup

| Doc | Action |
|---|---|
| `docs/PLAN-2.0-MENU-PARITY.md` | Annotate at top: "historical strategy (2026-08); current numbers → PARITY-SNAPSHOT.md" or move to `docs/archive/` |
| `docs/ANALYSIS/2026-08-*` | Keep as history; add a README line in `docs/ANALYSIS/` explaining these are dated audits, not current truth |
| `worklog.md` | Keep (session log); no rewrite |
| `docs/CONTEXT/01-STATE.md` | Add the frozen inventory counters + a "prod readiness" line pointing here |
| `README.md` | Refresh: name, model (env-driven), tool count, test count, remove GLM-specific prose; add "Run in production" section (deferred configs noted) |

### 3.8 Production failure surfaces (blockers)

- **Type gate**: flip `typescript.ignoreBuildErrors` to `false`; fix the
  resulting errors (expected: the known `scripts/` Prisma drift noise — which
  is exactly why the scripts dir gets cleaned first; `tsc src` is already 0).
- **Error boundaries**: add `src/app/(erp)/error.tsx` (client, reports via the
  M61 structured log path, friendly copy + "try again"), `src/app/global-error.tsx`
  (root), plus `not-found.tsx` (friendly 404 with a link home) and
  `loading.tsx` per heavy segment (dashboard, orders, accounts, agent panel).
- **Health endpoint**: `GET /api/health` returning
  `{ ok, version, db: 'up'|'down', lastBackupAt? }` — session-free (no secrets),
  used by the watchdog/uptime monitor. DB check = a trivial `SELECT 1`.
- **Build/run scripts**: add `typecheck`, `lint`, `test` to `package.json`;
  replace the `tee server.log` start with a plain `node server.js` for prod
  (keep the tee variant as `start:dev` if useful).
- **Package identity**: rename to `fiberops`, bump to `0.3.0` (or `1.0.0-rc.1`),
  tag the first prod candidate.

### 3.9 UX states & polish (first-week items)

From the launch checklists: verify forms retain values after validation errors,
empty states exist for every register/list, error states are human (no stack
traces/raw JSON), pages work at Fast-3G throttle, and every critical flow works
on a phone (the panel is mobile-width already, but tables need a pass). Keep
scope tight: the flows a storekeeper/merchandiser uses daily (order hub, stock,
registers, approvals, agent panel, print).

---

## §4 Waves, sequencing, exit criteria

| Wave | Ships | Exit criteria |
|---|---|---|
| **C0 — Blockers** | type gate on; error/not-found/loading boundaries; `/api/health`; seed route+button removed; `.playwright-mcp` ignored; dev artifacts deleted | prod build fails on a type error; killing the DB shows a friendly error; health returns 200 with DB down→`db:'down'`; no `/api/seed` route; clean `git status` |
| **C1 — Dev surfaces** | `prod_inventory.mjs` + `PARITY-SNAPSHOT.md`; `/parity` removed **including** `ParityFooter`, nav link, topbar case, coming-page link; `/live`+`/tracker` consolidated (delete the loser completely); **dead coming-soon machinery deleted** (page, components, `getHref` fallbacks, nav branches); scripts sandbox-path sweep + legacy move; `/api/config` audit | snapshot matches `parityStats()` (151/151 live); no parity wiring anywhere in the shell; one live surface; scripts run from project root |
| **C2 — Dead code & deps** | Knip report → removals (deps, exports, components, duplicate tracker files); **dead deps removed** (`next-auth`, `@ai-sdk/*`, `ai`, `z-ai-web-dev-sdk`, `uuid`, `docx` pending Knip); one lockfile kept; `db/custom.db` untracked; root artifacts deleted; Knip baseline in the gate | `knip` clean against the baseline; `git ls-files` has no DB/artifacts; one lockfile; all tests green |
| **C3 — Ops & observability** | error tracker decision + wiring (or explicit "logs only" decision); uptime monitor on `/api/health`; backup restore drill re-run; general API rate-limit decision | an intentional thrown test error is visible where the team looks; uptime alert fires when the port closes; drill documented |
| **C4 — Hardening & docs** | security headers verified/documented (app-level fallback); CSP report-only → enforce plan; README/package/docs refresh; frozen counters in STATE | headers A-grade on the deployed URL; README accurate at HEAD; STATE counters match the snapshot |

C0 is the only wave that blocks any production exposure. C1–C2 are the
"clean up the app" the owner asked for. C3–C4 include config-adjacent items that
can run with the deferred config pass.

---

## §5 Owner decisions

1. **Dead coming-soon machinery**: confirm deletion of the `/coming/[id]` page,
   `ComingSoon*` components, `getHref`/`groupLandingHref` fallbacks, and the nav
   coming branches (recommended — all 151 items are live and the registry test
   will enforce that going forward).
2. **Parity tracker**: delete the page entirely (recommended) or keep it
   admin-only for internal milestone work?
3. **Live surfaces**: consolidate to one (recommended: keep `/live`) — confirm
   the tracker page has no daily user.
4. **`/api/config`**: confirm whether it serves UI flags (keep) or dev config
   (delete).
5. **Version scheme**: `1.0.0-rc.1` now vs `0.3.0` until the config pass?
6. **Error tracking**: self-hosted (GlitchTip/Sentry), or logs-only for the
   first release? (config-adjacent)
7. **Knip baseline**: strict (no unused anything) vs baseline-with-ignore
   (recommended, then ratchet)?
8. **Package manager**: npm only (recommended — README/scripts already use it;
   delete `bun.lock`) or keep bun?
9. **Live surface survivor**: `/tracker` (menu item, M9 polling) or `/live`
   (orphan, M14 SSE) — audit UX and delete the other completely.
10. **Worklog home**: keep root `worklog.md` (481 KB) or move canonical under
    `docs/`? (one only)

---

## §6 THE CHECKLIST (everything, at the end)

### A. Blockers (must be true before any real user)

- [ ] `typescript.ignoreBuildErrors` removed; `next build` fails on type errors
- [ ] `npx tsc --noEmit` clean for `src/` (already 0)
- [ ] `src/app/(erp)/error.tsx` + `global-error.tsx` (friendly, logged, retry)
- [ ] `not-found.tsx` + segment `loading.tsx` (dashboard, orders, accounts, agent)
- [ ] `GET /api/health` → `{ok, version, db}`; no session required; no secrets
- [ ] `/api/seed` route deleted; seed button removed from nav
- [ ] Dev artifacts removed: `dev.log`, `.playwright-mcp/`, `upload/` probes
- [ ] `.playwright-mcp/` added to `.gitignore`
- [ ] `package.json` renamed `fiberops`; `typecheck`/`lint`/`test` scripts added
- [ ] Prod start does not `tee server.log`
- [ ] Session cookie flags verified (`httpOnly`, `sameSite`, `secure` in prod)
- [ ] Login lockout verified live (M60) and documented

### B. Dev surfaces out of the product

- [ ] `scripts/prod_inventory.mjs` written; `docs/PARITY-SNAPSHOT.md` generated
- [ ] Snapshot numbers frozen into `01-STATE.md` (items/live/groups/coverage)
- [ ] `/parity` removed from the app (or admin-gated) + no nav link
- [ ] Dead coming-soon machinery deleted: `/coming/[id]` page, `ComingSoon*` components, `/coming` route entries, `getHref`/`groupLandingHref` fallbacks, nav coming branches
- [ ] `menu-registry.test.ts` asserts 151/151 live (a non-live item fails CI, never ships silently)
- [ ] `/live` + `/tracker` consolidated to one page/endpoint; dead twin deleted
- [ ] `/api/config` audited (flags=keep, dev=delete)
- [ ] Leftover `tracker`/`live-tracker` tools in `tools.ts` re-checked for dead entries
- [ ] No user-visible milestone/phase/legacy-form language anywhere (grep `Coming`, `M1–M6`, `parity` in `src/app`)

### C. Scripts & repo hygiene

- [ ] Sandbox `/home/z/my-project` removed from `scripts/` (process.cwd()-relative)
- [ ] Gate scripts run on the owner's machine: `context_check`, `eval_routing --static`, `e2e.sh`
- [ ] One-off milestone/patch/docx/probe scripts moved to `scripts/legacy/` or deleted (`m32..m35_live_check.sh`, `patch_*.py`, `gen_*docx.js`, `state_header_*.py`, `perf_probe.ts`, `probe_cancel_ledger.ts`, `ops5_dup_probe.py`, `pdf-plan/`)
- [ ] `scripts/` has a README index (one line per kept script)
- [ ] `upload/` contains only real user uploads (probe leftovers removed)
- [ ] `db/backups/` ignored and non-empty in dev (backup cadence documented)

### D. Dead code, deps, components

- [ ] Knip run; unused dependencies removed — confirmed 0-import deps: `next-auth`, `@ai-sdk/openai`, `@ai-sdk/react`, `ai`, `z-ai-web-dev-sdk`, `uuid`, `docx` (+ `next-intl` decision)
- [ ] Unused shadcn components removed (Knip-confirmed only)
- [ ] Duplicate live-tracker components/lib deleted with their tests (`/live` set or `/tracker` set — one survives)
- [ ] Unused exports removed at file level (Knip)
- [ ] `knip --reporter compact` baseline added to the session gate
- [ ] Unused `scripts/` deleted (already in C)
- [ ] One lockfile: `package-lock.json` kept (npm is documented), `bun.lock` deleted, `packageManager` pinned in `package.json`
- [ ] `git rm --cached db/custom.db`; `db/custom.db` added to `.gitignore`; prod bootstrap documented (restore or seed)
- [ ] Root artifacts deleted: `dev.log`, `tsconfig.tsbuildinfo`

### E. Docs

- [ ] `README.md` refreshed (name, env-driven model, real tool/test counts, prod section)
- [ ] `PLAN-2.0-MENU-PARITY.md` annotated or archived; `PLAN.md` moved to `docs/CONTEXT/` or archived (it still points at sandbox paths)
- [ ] One canonical worklog under `docs/` (root `worklog.md` 481 KB vs the 7 KB stub — pick and retire the other)
- [ ] `docs/ANALYSIS/README` note (dated history, not current truth)
- [ ] `01-STATE.md` counters match the snapshot; prod-readiness pointer added
- [ ] `docs/MANUAL-TESTING.md` updated for the new nav/health/error behavior
- [ ] Version + tag for the prod candidate

### F. Security baseline (verify; config items flagged)

- [ ] No secrets in repo (`.env` ignored, `.env.example` committed; scan `git grep` for patterns)
- [ ] `npm audit` — no high/critical (record output; config pass may defer fixes)
- [ ] Security headers present on the deployed URL (CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy) — **owner: edge vs app** (config-adjacent)
- [ ] CSP report-only plan documented before enforcement
- [ ] Auth on every protected API (unit test asserts 401 without session; spot-check the 72 routes)
- [ ] Input validation at boundaries (server actions + API) — sample audit
- [ ] Upload route limits verified (extension list, 20 MB cap, sanitized names) — M61 provenance lands separately
- [ ] No `child_process` routes in prod (seed removal covers the only one; grep to confirm)

### G. Observability & ops (config-adjacent noted)

- [ ] Structured JSON logs for tool calls/errors (M61 E-9.2) wired
- [ ] Error tracker decision made and wired (or documented logs-only)
- [ ] Uptime monitor configured against `/api/health` (interval ≤5 min, alert to a channel someone reads)
- [ ] Backup: nightly job verified, restore drill re-run, off-box copy documented
- [ ] `watchdog.sh` retired in favor of uptime monitoring (or fixed to the project-relative DB path)
- [ ] General API rate-limit decision recorded (login already has lockout)
- [ ] Incident/rollback runbook (one page): how to revert, where logs live, who to call

### H. UX states & polish

- [ ] Forms retain values after validation errors (critical forms)
- [ ] Empty states for every register/list a daily user touches
- [ ] Error states human (no stack traces/raw JSON anywhere)
- [ ] Fast-3G check on dashboard → order hub → agent panel
- [ ] Mobile pass on the critical flows (storekeeper + merchandiser)
- [ ] Print/PDF route verified on the deployed URL
- [ ] Accessibility spot check (labels, focus, contrast) on login, nav, agent panel

### I. Tests & gates (run the full suite once after every wave)

- [ ] `npx vitest run` green (83 files / 1,687 tests)
- [ ] `npx tsc --noEmit` src clean; build clean
- [ ] `bash scripts/context_check.sh` NO DRIFT (counters refreshed for every removal)
- [ ] `node scripts/eval_routing.mjs --static` green
- [ ] `bash scripts/e2e.sh` green on the owner's machine
- [ ] `npx eslint .` no errors (warnings triaged)
- [ ] `npx knip` clean against the baseline

### J. Explicitly deferred to the config pass (NOT in this cleanup)

- [ ] Production env vars (`DATABASE_URL`, `AGENT_LLM_*`, `AUTH_SECRET`, `UPLOAD_DIR`, `PDFTOTEXT_PATH`)
- [ ] Hosting/platform choice, reverse proxy, TLS certificates, DNS
- [ ] Gateway/edge security headers (decide app vs edge in C4)
- [ ] Cron installation (digest, backups) on the prod host
- [ ] SMTP / email provider (invites, digest delivery)
- [ ] Sentry/GlitchTip DSN and alert routing
- [ ] Off-box backup destination (owner infra) + retention policy
- [ ] Passkeys/TOTP (M62/M63 wave)
- [ ] `/approvals` integration of agent decisions (M62)

---

## §7 References

- Launch/production checklists: pows.cloud deploy checklist; llmbestpractices
  pre-launch; HelloCrossman 30-item production readiness; Pasquale Pillitteri
  go-live 2026; Addy Osmani shipping-and-launch (rollout thresholds, health
  checks, error boundaries); Mittal-Tech 8-stage security audit.
- Dead-code/dep hygiene: code-splitting.com dev-code removal; Knip docs
  (unused files/exports/deps, CI baseline); Pragmatic Coders dead code;
  Mixpanel/Unleash/Tggl feature-flag hygiene (audit, expire, remove).
- In-repo sources of truth: `src/lib/erp/menu-registry.ts` (`parityStats`),
  `scripts/context_check.sh`, `docs/CONTEXT/01-STATE.md`,
  `docs/PLAN-2.0-MENU-PARITY.md`, `README.md`, `next.config.ts`,
  `package.json`.
