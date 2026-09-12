# SPEC-M59 — The admin hub at /admin (Phase-6 PRD FR-B1 scoped, ADR-026 Batch 1)

## 0. Problem

`/admin` is a 404 — yet FOUR existing admin pages' breadcrumbs link to it
(users, options, settings, menu-rights), and the PRD's owner-complaints
evidence listed "missing admin screen (Module B hub)". Six admin surfaces
exist (users, options, settings, company, audit, menu-rights — all under
the masters-admin menu group) but there is no front door: an operator must
know the URLs or hunt through the sidebar.

## 1. Scope (FR-B1 scoped to today; roles/number-series/controls/locks are Batch 3+, ADR-026)

| ID | Requirement | Acceptance criteria |
|---|---|---|
| FR-1 | `/admin` hub page | Server component; six live cards (Users & Groups, Menu Rights, Options & Settings, Feature Flags, Company / FinYear, Audit Log), each: title, one-line description, a live health line (real DB counts), link to the surface. |
| FR-2 | Health lines | Users card: `N users (M active · K groups)`; Menu rights: `K groups · role doors enforced`; Options: `N options rows`; Flags: `N registry flags (X set on)`; Company: configured/not (first Company row); Audit: `N rows today`. |
| FR-3 | Planned surfaces (honest visibility) | A muted "Phase-6 roadmap" strip listing the PRD's planned admin surfaces (login audit, roles + permission matrix, number series, FY close, transaction controls, inventory locks, print templates) — each marked planned, no fake links. |
| FR-4 | Rights + breadcrumbs | Registers as a masters-admin menu item (`admin-hub`) so the layout's group check gates it exactly like the other admin pages; the four dead breadcrumbs now resolve (200). |
| FR-5 | Menu registry | +1 item (id `admin-hub`, route `/admin`, group masters-admin, live); pin test 149→150; LIVEROUTES +2 (`/admin`, `/profile`). |

## 2. Technical design

- `src/app/(erp)/admin/page.tsx` — server component; `getSessionUser()`
  (the layout already guards) + six cheap `db.*.count()` calls (single
  company row read for the company card; audit "today" = createdAt >=
  IST midnight). Cards reuse the house pattern (Link + slate + emerald
  accents; lucide icons).
- Menu registry: the `admin-hub` item sits first in the masters-admin
  group (order via the item list position; the group landing stays
  /masters — the hub is an additional door, not a landing change).
- No schema change. No new tools. No API routes.

## 3. Tests

- menu-registry.test.ts: the items pin 149→150 (+1 with the M57 note);
  the LIVE_ROUTES-on-disk invariant picks the two new pages up.
- route_smoke_m57.sh: /admin 307 unauth → 200 auth + card markers
  (Users & Groups, Audit Log, Phase-6 roadmap) + every card link target
  200s; the four previously-dead breadcrumb pages still 200.

## 4. Counters

- menu items 149→150, LIVEROUTES +2, models/API/tools unchanged.

## 5. Docs round

STATE milestone row (M59) + counts + worklog. Gates: vitest, tsc src 0,
context_check NO DRIFT (claims updated), route_smoke_m57.
