# SPEC-M60 — Batch 2 (Phase-6A, part 1): login lockout + login/session audit + session revocation

Date: 2026-09-13 · ADR-026 minimal path, Batch 2 · PRD: docs/PRD/PHASE-6.md
Module A (FR-A6 + FR-A7 + FR-A8, scoped to today) · Milestone M60

## §1 Scope

The hardened-auth split per the PRD's own A.5 batch plan. M60 ships the
security core; the password-policy (FR-A2) and forgot/reset (FR-A3) doors
follow in the next batch, then invites/idle-logout (FR-A4/A5) per the same plan.

- **FR-A6 lockout** — after 5 failed logins on one email within 15 minutes,
  lock 30 minutes. Failures live in a `LoginAttempt` ledger (email, ip,
  userAgent, outcome, at). Lockout is honored at login BEFORE credential
  verification (a locked account refuses even the correct password — the
  PRD's "lockout honored at login"). Attempts while locked record outcome
  `locked` (audited, but they do NOT extend the lock — the fixed window).
  Admin can clear (delete the email's fail/locked rows; `LoginAudit` keeps
  the story). Unknown emails lock too — the ledger is keyed on the email
  STRING, so probing behaves identically for existing and non-existing
  accounts (the anti-enumeration rule).
- **FR-A7 login & session audit** — every login (success/fail), locked
  attempt, logout, password set/clear, lockout clear, and sessions-cleared
  event writes a `LoginAudit` row; `/admin/login-audit` register with event
  filter + search + CSV (the audit-log register pattern); `lastLoginAt`
  retained (existing M7 column, now also displayed on /profile).
- **FR-A8 session revocation** — `User.tokenVersion` (int, default 0). The
  session token payload grows a `tv` field (`uid.expMs.tv.sig`); the node-side
  verify (getSessionUser — already a DB re-check) compares cookie tv < DB
  tokenVersion → the session is dead. Bump points: self password change,
  admin set/clear password (target), "sign out all devices" (profile). The
  changer keeps their session via cookie re-issue (setLoginCookies with the
  new tv). Deactivation and role changes were already enforced live by the
  Wave-C DB re-check (active flag + fresh rights snapshot per request) —
  noted here so the ADR trail is honest.

**Deferred (named, not silent)**: the `security.*` flag-registry surface
(lockout thresholds as admin-editable flags) rides Batch 3's controls
console; the agent doors (list_login_audit / get_login_attempts /
reset_user_password) ride Batch 3's admin-depth tool set — this milestone
is admin-UI-first.

## §2 Design

- **Pure lockout arithmetic** (`assessLockout` in `src/lib/auth/security.ts`):
  input = recent `fail` rows for the email (horizon = lock + window = 45 min),
  output = `{ locked, until, remainingMs }`. Lock rule: if ≥5 fails fall
  within `windowMinutes` of the NEWEST fail → locked until
  newest + lockMinutes. This holds the lock past the window slide (the
  regression case: 5 fails at T are still locked at T+20 even though the
  window [T+5, T+20] no longer contains them) and self-heals at expiry (a
  new fail after expiry starts a fresh burst — the old fails are outside
  the newest fail's window).
- **Token format** — new `uid.expMs.tv.sig` (HMAC over the first three
  segments); legacy 3-part `uid.expMs.sig` tokens verify as tv=0 (zero
  deploy disruption; a bump immediately outranks them). `verifySessionToken`
  returns `{ userId, tv }`; the edge middleware only checks validity (no DB
  on the edge), the node re-check does the version compare.
- **Two ledgers, two consumers** — `LoginAttempt` is lockout math input
  (queried by email+at, indexed); `LoginAudit` is the human trail (the
  register). Both stamp `ip` (x-forwarded-for → x-real-ip → `local`) and
  `userAgent`.
- **Register** — `/admin/login-audit` mirrors `/admin/audit` (admin role
  door, RegisterScreen, csv twin). Extra: a server-computed
  "currently locked" strip (recent fails grouped by email, assessed) + a
  client Clear button per locked email (`/api/auth/admin/clear-lockout`).

## §3 Tests

`tests/unit/auth-m60.test.ts` (handler level, the profile.test.ts pattern —
mocked cookies + real test DB): assessLockout arithmetic ×6 (threshold,
window slide, expiry, spread, post-expiry fresh start, non-fail rows
ignored); the login flow ×5 (5 bad → 429 on the 6th + ledger rows; locked
refuses the CORRECT password; success writes attempt+audit+lastLoginAt;
unknown-email locks identically; clear-lockout unblocks); tokenVersion ×3
(stale token 401s; change-password re-issues + old-device token dies; admin
set-password bumps target); the admin doors ×2 (clear-lockout 403
non-admin; sessions/clear bumps + re-issues + audits); logout audit ×1;
register service ×1. Menu-registry +login-audit block. Residue-free:
afterAll deletes every fixture row.

## §4 Gates

context_check (models 96, auth API 7 + admin 2, menu 151, routes 188,
registers 38) · vitest full · tsc src 0 · eval --static unchanged
(m56/266 — no new agent doors by design) · route_smoke_m60 NEW (the
lockout walkthrough LIVE: 5 bad logins → 429 → register rows → admin clear
→ login OK; the profile sessions button; the csv) · browser E2E (the smoke
script covers the LIVE door; the agent-browser walkthrough rides the
session's budget if time allows).
