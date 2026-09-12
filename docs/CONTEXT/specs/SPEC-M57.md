# SPEC-M57 — The profile screen (Phase-6 PRD FR-A1, ADR-026 Batch 1)

## 0. Problem

The topbar user chip is inert text (no link), and `/profile` does not
exist. An operator cannot see who they are in the system beyond the chip's
name + role badge — no group, no permission visibility, no last-login, no
self-service door except the change-password key icon. This was one of
the four owner complaints in the PRD's evidence base (§17: "missing
profile screen").

## 1. Scope (re-baselined against the post-6B codebase, ADR-026)

The PRD's FR-A1 full ask (active-sessions list, session revocation) needs
Module A Batch 2 machinery (`tokenVersion`, session tables) — NOT in this
milestone. This milestone ships the honest core:

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-1 | `/profile` page (server component) | Shows initials avatar, name, email, role badge, group name + rights visibility (menu groups allowed out of 17, or "all"), member-since, last login; guarded by the `(erp)` layout (session required). |
| FR-2 | Edit name | Client form → `PATCH /api/auth/profile` `{name}` → row updated → `router.refresh()` re-renders chip + page. Validation: trimmed, 2–60 chars, zod, 400 otherwise. |
| FR-3 | Change password | The EXISTING `ChangePasswordButton` dialog reused verbatim (M18 §4-C4) — no second door. |
| FR-4 | Voice / TTS preferences | Reads + writes the SAME localStorage keys the agent panel uses (`VOICE_LANG_STORAGE_KEY`, `VOICE_SPEAK_STORAGE_KEY` from `src/lib/agent/voice`) — one source of truth, surfaced here for discoverability. |
| FR-5 | Topbar chip links | The chip becomes a `Link` to `/profile` (title = email) — the dead-text defect fixed. |

## 2. Technical design

- `src/app/(erp)/profile/page.tsx` — server component: `getSessionUser()`
  + one `db.user.findUnique` (lastLoginAt, createdAt, userGroup {name,
  rights}). Utility page (no menu item — the /parity precedent;
  `findGroupForPath('/profile')` returns undefined → renders for every
  authenticated user; own-data only).
- `src/components/erp/profile-name-form.tsx` — client, controlled input +
  save button; toast feedback (sonner), disabled while busy.
- `src/components/erp/profile-voice-prefs.tsx` — client, mounts reading
  localStorage (post-hydration effect), toggles write-through.
- `src/app/api/auth/profile/route.ts` — PATCH only; `requireApiSession()`
  guard (401 JSON — the Wave B family contract); zod body `{name: string()
  .trim().min(2).max(60)}`; updates `User.name`; returns `{ok, name}`.
  The session cookie carries id/email/role — name is NOT in the token, so
  no re-issue needed; the (erp) layout re-reads the DB every render, the
  chip updates on refresh.
- No schema change. No new tools (ADR-026: user-self-service, not an
  agent domain).

## 3. Tests (tests/unit/profile.test.ts NEW)

Handler level (the change-password pattern: mocked `next/headers`
cookies + real test DB):
- PATCH 401 without session
- 400 on bad bodies (missing name / 1-char / 61-char / non-JSON)
- 200 happy path: name persisted in the DB, response `{ok, name}`
- fixture user deleted in afterAll (residue-free contract)

## 4. Counters

- routes: LIVEROUTES +1 (`/profile`), API +1 (`/api/auth/profile` — the
  guarded auth family 5→6… guarded family count per STATE's API-routes
  claim updated)
- menu: unchanged (utility page)
- tools: unchanged (274)

## 5. Docs round

STATE milestone row (M57) + worklog entry; topbar chip noted. Gates:
vitest (new file), tsc src 0, context_check NO DRIFT (claims updated),
route_smoke_m57 (page 200 + markers + PATCH round-trip + 401).
