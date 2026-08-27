# SPEC-M7 — Auth & Rights Enforcement

> **FROZEN IMPLEMENTATION SPEC.** Written BEFORE any M7 code (rule: spec-before-code,
> `docs/CONTEXT/00-START-HERE.md` #3). A session with ZERO chat context implements
> M7 correctly from this file alone. Status: APPROVED FOR IMPLEMENTATION.
> Lineage: SPEC-M6 §3 pinned auth/login (§3-1) and rights-based route guarding
> (§3-2) as the M7+ candidates (Tally export §3-3 was resolved SKIP at M6 freeze).

## 1. Goal

Give the ERP a real login: a user authenticates with email + password against the
`User` model (ADR-016), gets a signed session cookie, every ERP PAGE requires it,
and the shell shows who is logged in with a logout door. Rights enforcement
(UserGroup.rights → menu filtering + per-route checks) follows in later waves.

**Acceptance (all must pass):**
1. `npx tsc --noEmit` — no NEW src errors (pre-existing noise list exempt).
2. `npx vitest run` — 598 existing tests green + new `tests/unit/auth.test.ts` green.
3. Unauthenticated GET of any ERP page (e.g. `/`, `/programs/new`) → 307 redirect
   to `/login?next=<path>`; `/login` itself renders 200 for everyone.
4. Authenticated GET of a representative route set → 200 (route_smoke_m7a).
5. First-run bootstrap: while NO user has a password, `/login` shows the
   first-admin form; `POST /api/auth/bootstrap` sets/creates the admin and logs
   in. Once ANY user has a password, bootstrap returns 403 — permanently.
6. Wrong password → 401 `{"error": "Invalid email or password"}`; inactive user → 401.
7. Logout clears the cookie (next page GET redirects to /login).
8. `route_smoke_m7a.sh` all green; `context_check.sh` NO DRIFT after counter updates.

## 2. Non-goals (explicitly OUT of M7-A)

- **No API guarding yet** — `/api/erp`, `/api/agent`, `/api/upload` stay open in
  Wave A (Wave B adds 401 JSON + cookie fixtures for the ingest/smoke suites;
  guarding them now would break 598 tests that hit APIs cookie-less).
- **No rights enforcement yet** — sidebar and routes render for any logged-in
  user (Wave C: UserGroup.rights → menu filtering + middleware checks).
- **No OAuth/MFA/password-reset-email/rate-limiting** — single-tenant dev app;
  password reset = admin edits user in `/admin/users` (Wave C adds the field).
- **No new agent tools, no schema models** — ADR-017 is FIELD-additive on User.
- **No multi-company / finyear auth chain** (plan §3 stays deferred).

## 3. Architecture — zero-dependency auth (no next-auth/bcrypt/jose)

```
prisma/schema.prisma                    User +passwordHash String? +lastLoginAt DateTime? (ADR-017)
src/lib/auth/password.ts                scrypt (node:crypto) hash/verify — Node runtime ONLY
src/lib/auth/session.ts                 HMAC-SHA256 token (Web Crypto) — EDGE-SAFE (no node:crypto,
                                        no Prisma): createSessionToken/verifySessionToken +
                                        getSessionUser() (Node: cookies() + db lookup)
src/middleware.ts                       Edge: verify cookie → redirect /login?next=… ; auth'd
                                        on /login → /  (matcher excludes /login, /api, _next,
                                        dotted static)
src/app/login/page.tsx                  server: picks LoginForm vs FirstAdminForm
src/app/login/login-form.tsx            client: POST /api/auth/login → router.replace(next|/)
src/app/login/first-admin-form.tsx      client: POST /api/auth/bootstrap → same
src/app/api/auth/login/route.ts         POST {email,password} → set cookie → {ok,user}
src/app/api/auth/logout/route.ts        POST → clear cookie → {ok}
src/app/api/auth/session/route.ts       GET → {user|null} (smoke + client use)
src/app/api/auth/bootstrap/route.ts     POST {email?,name?,password} → only while no
                                        user has a passwordHash → set/create admin → cookie
src/components/erp/topbar.tsx           + user chip (name · role) + Log out button
src/app/(erp)/layout.tsx                async: getSessionUser() → null → redirect('/login');
                                        pass user into AppShell → Topbar
scripts/seed_admin.ts                   idempotent: ensure admin@fiberpro.local password set
scripts/route_smoke_m7a.sh              guard + login + regression smoke (cookie jar)
tests/unit/auth.test.ts                 password + session unit tests (no HTTP)
```

**Session token format**: `base64url(userId).base64url(expMs).base64url(hmacSha256(
userId + '.' + expMs, AUTH_SECRET))` — stateless, Edge-verifiable, 7-day TTL.
Cookie `fo_session`, httpOnly, sameSite=lax, path=/ (secure in production).
`AUTH_SECRET` from env with a dev fallback constant (documented in the ADR).

**Password format**: `scrypt$<salt-hex>$<hash-hex>` (N=16384, r=8, p=1, 64-byte).
`passwordHash == null` means "cannot log in yet" (pre-ADR-017 rows).

## 4. Waves

- **Wave A (this file's build)**: login core — ADR-017 schema, auth lib, 4 API
  routes, /login (both forms), middleware page guard, topbar user chip + logout,
  seed script, unit tests, route_smoke_m7a, context_check counters, docs.
- **Wave B**: API guarding (401 JSON on /api/erp|agent|upload without session;
  cookie fixtures in scripts/test_ingest) + agent user context (AgentTurn.userId
  stamping, approval actor on commits) + session route tests.
- **Wave C**: rights enforcement — NavSidebar filtered by UserGroup.rights
  ([] = all), middleware per-route rights check vs MENU_GROUPS, /admin/users
  password set/reset field, deactivated-user redirect.

## 5. ADR-017 (summary; full text appended to 02-DECISIONS.md)

Context: ADR-016 landed User/UserGroup with rights but explicitly deferred login.
Decision: add `passwordHash String?` + `lastLoginAt DateTime?` to User (65→65
models, additive; `schema-65-baseline` tag first); auth = zero-dep scrypt +
HMAC-cookie session; middleware guards pages only in Wave A.
Consequence: existing rows can't log in until bootstrap/seed sets a password;
APIs remain open until Wave B (documented, tested non-goal).

## 6. API contracts (all JSON; cookie set/cleared via Set-Cookie)

- `POST /api/auth/login` `{email,password}` → 200 `{ok:true,user:{id,name,email,role}}`
  + cookie | 401 `{error}` | 400 zod.
- `POST /api/auth/bootstrap` `{email?,name?,password}` → 200 + cookie (ONLY while
  zero users have a password; email matching an existing user sets its password,
  else creates role=admin user) | 403 `{error:"Bootstrap is closed"}`.
- `POST /api/auth/logout` → 200 `{ok:true}` (cookie expired).
- `GET /api/auth/session` → 200 `{user:{...}|null}`.

## 7. Test plan

- `tests/unit/auth.test.ts` (vitest, no HTTP): hash/verify round-trip; wrong
  password rejects; unknown-format hash rejects; token create→verify round-trip;
  tampered payload rejects; expired token rejects; garbage rejects; cookie name
  + TTL constants frozen.
- `scripts/route_smoke_m7a.sh`: (1) unauth page GETs → 307 + Location /login;
  (2) login (seeded admin) → cookie jar; (3) page GETs with jar → 200 (core set
  incl. /programs/new + /approvals + /reports/mis + /parity); (4) session route
  returns the user; (5) logout → cookie cleared → page GET redirects again;
  (6) bootstrap rejected (403) after a password exists; (7) wrong password 401.
- Full `npx vitest run` — 598 existing unmodified (auth never touches their
  cookie-less API/runtime paths).

## 8. Acceptance counters (frozen)

Models 65 (field-additive only) · tools 188 (unchanged) · routes 145 (+/login +
4 auth API routes are NOT in LIVE_ROUTES — page-file test rule: only (erp) pages
count) · vitest 598 + 8 (new auth block) · context_check existence list +9 files.
