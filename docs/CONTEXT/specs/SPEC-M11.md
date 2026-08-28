# SPEC-M11 — Feature-Flags Admin Screen (/admin/settings)

> Status: **FROZEN** (2026-08-28). Roadmap source: SPEC-M9 §9-P1 item 2 ("M11 —
> /admin/settings flags UI", effort S). The flag engine itself (LLD-07 Part 2
> port: `src/lib/erp/flags.ts` — 28 `FLAG_DEFS`, `getFlags/getFlag/setFlag`,
> AppOption rows `flag:<name>`) landed pre-M7 and is LIVE at the enforcement
> points (tolerance.ts + the tools that consult it). What is missing is the
> OPERATIONS surface: a human can flip a flag only via SQL or the agent's
> raw `update_app_option` door. M11 builds that surface.

## 1. Goal

One admin screen, `/admin/settings`, where an administrator sees all 28
registry flags grouped by category with per-flag effect notes, flips boolean
switches, edits number/string values, resets to registry defaults, and sees
any drift rows (`flag:*` keys that are NOT in the registry) read-only. Writes
persist through `setFlag` (AppOption upsert) via a new admin-only
`POST /api/config`. The registry stays the single source of truth: **no flag
can be created that isn't in the registry** (drift-safe, server-enforced).

## 2. Contracts

### C1 — `POST /api/config` (extend `src/app/api/config/route.ts`)

The set-password pattern (SPEC-M7 §4 Wave C), verbatim:

1. `requireApiSession()` → 401 JSON `{"error":"Authentication required"}`
2. `guard.user.role !== 'admin'` → 403 `{"error":"Admin role required"}`
3. zod body: `{ name: string (min 1), value: string | number | boolean }`
   → 400 with the first issue message otherwise
4. `setFlag(name, value)`:
   - unknown name (not in `FLAG_DEFS`) → **400** `Unknown flag: <name> — not
     in the registry` (the drift-safe rule; `setFlag` already throws this —
     the route maps the throw to 400, never 500)
   - non-finite number for a `number` flag → 400
5. 200 `{ ok: true, flag: { name, value (typed), stored, valueType, category,
   defaultValue } }`

`GET /api/config` is UNCHANGED in shape (`{ flags, registry }` — the
FlagsProvider contract) but GAINS `requireApiSession()` → 401 unauthenticated.
Rationale: middleware never matches `/api`; `requireApiSession` is the ONLY
API-side guard layer (SPEC-M7 §4 Wave B), and flag values are internal
operating config. Verified zero in-repo client consumers of the GET (the M11
screen reads server-side); the authenticated app is the only legitimate
consumer. The guarded-route family grows 5 → 7 (+ `/api/tracker` M9, which
already guards, + `/api/config` M11).

`export const runtime = 'nodejs'` (cookies + Prisma, same as set-password).

### C2 — The screen (`/admin/settings`, server component)

- Breadcrumb `Masters & Admin / Feature Flags`, consistent with the sibling
  admin pages; title + one-paragraph explainer (what flags are, where they
  enforce: tolerance.ts + posting tools).
- `getSessionUser()`; role !== 'admin' → the page renders a **notice card**
  ("Admin role required…") with NO flag values and NO mutation controls —
  the page is still 200 (group rights are enforced one layer earlier by the
  (erp) layout: a user without the `masters-admin` group is redirected before
  this branch; a non-admin WITH the group right sees the notice — two-layer
  rule, role under group, same as /admin/users renders PasswordAdmin for
  admins only).
- Admin branch passes THREE props to the client component: `registry`
  (`flagRegistry()`), `values` (`getFlags()` — typed record), `unknown`
  (AppOption `flag:*` rows whose name is NOT in the registry → read-only).
- `findGroupForPath('/admin/settings')` → `masters-admin` (via the menu item,
  no group changes needed).

### C3 — The client component (`admin/settings/flags-admin.tsx`)

- Groups in registry order: `tolerance` (21 — "Tolerances & Deviations"),
  `commercial` (5 — "Commercial Switches"), `module` (1 — "Module Behaviour"),
  `company` (1 — "Company Config"); `numbering` is in the label map for
  future flags but renders nothing while empty (no empty-group cards).
- One Card per category; one row per flag:
  - `name` (mono) + type chip (`bool` / `num` / `str`) + **modified** badge
    when the current value ≠ coerced registry default (drift visibility)
  - description = the per-flag effect note (registry `description` verbatim)
  - control: `Switch` for booleans (immediate POST, busy spinner), `Input` +
    explicit **Save** for number/string (posts only when dirty + valid;
    numbers validated `/^-?\d+(\.\d+)?$/` client-side, server re-validates)
  - **Reset** button per flag (posts the registry default) — enabled when
    modified
- Writes go through `POST /api/config` ONLY (never `update_app_option`);
  toasts (sonner) on success/failure; local state updated from the 200 body.
- **Unknown flags card** (only when drift rows exist): read-only mono table
  (`name` / stored value) + the note that the engine ignores them and
  `setFlag` rejects names outside the registry — visible, honest, immutable
  from this screen.

### C4 — Menu registration (`src/lib/erp/menu-registry.ts`)

- New item after `options-settings`: `id: 'feature-flags'`, label
  `Feature Flags`, `groupId: 'masters-admin'`, `route: '/admin/settings'`,
  `arch: 'ST'`, `phase: 'M11'`, `agentTools: ['list_app_options']` (the read
  door; flag WRITES ride `POST /api/config`/`setFlag`, noted in `notes`),
  `legacyForms: ['frmOptionsFlags']` (LLD-07 Part 2 surface; the legacy flag
  catalog lived inside frmOptions).
- `LIVE_ROUTES` + `'/admin/settings'`. Menu 114 → **115** items,
  LIVEROUTES 146 → **147**. All-live invariant preserved (113 parity +
  live-tracker + feature-flags).

### C5 — Tests & pins

- `tests/unit/flags-config.test.ts` (NEW): registry shape (28 defs, unique
  names, valueType/category enums, every description non-trivial, the 4
  populated categories) + POST route contract at the handler level (the
  set-password mock pattern: `vi.mock('next/headers')` cookieStore, real DB
  fixtures, children-first cleanup): 401 unauth / 403 non-admin / 400 empty
  body / 400 missing value / 400 unknown flag (drift-safe) / 400 NaN number /
  200 boolean flip persists as `'false'` with typed response / 200 number set
  persists typed / GET reflects the typed change / GET 401 unauth. afterAll
  restores the touched flags to their pre-test stored values.
- `tests/unit/menu-registry.test.ts`: item count 114 → 115, parityStats
  115/115 all-live, + one M11 block (item exists, masters-admin group, live
  route, page file on disk, `findGroupForPath('/admin/settings')` →
  masters-admin, agentTools door).
- `scripts/route_smoke_m11.sh` (NEW): unauth 307 (page) + 401 (both API
  verbs); admin login; GET shape (28 flags / 28 registry / po_bud present);
  page greps (title, category label, a flag name, sidebar door); 400s
  (unknown flag, bad number, missing fields); live round-trip flip-persist-
  restore for one boolean + one number flag; non-admin fixture (group rights
  masters-admin, role merchandiser): page 200 + "Admin role required" notice,
  POST → 403; fixture cleanup.
- `scripts/context_check.sh`: menu 115 / LIVEROUTES 147 / registry tests 29 /
  guarded-api-routes 7/7 (+tracker +config) / +m11 metrics line
  (flags-registry=28, flags-ui files) / file-existence additions. STATE pins
  updated in the same commit (trust-the-script protocol).

## 3. Out of scope (explicitly)

- No new flags, no registry edits, no enforcement changes — tolerance.ts and
  its consumers are untouched (28 flags in, 28 flags out).
- No flag-history/audit trail (M15's engine-level audit covers config writes
  holistically; re-visit there).
- No per-flag "who changed this last" column (AppOption has no updatedAt
  exposure need yet; M15 territory).
- No client-side FlagsProvider/context — the screen is server-fed; a shared
  provider is M14+ work if a consumer appears.
- No changes to the agent's `create/update_app_option` doors (they remain
  generic AppOption CRUD; `setFlag` is the sanctioned flag door. Tightening
  app-option keys against `flag:*` writes via the agent is a possible M15
  hardening note, NOT this milestone).

## 4. Acceptance (all must pass)

1. Toggle persists across reload (smoke: flip → GET reflects → page re-fetch
   carries the new value → restore).
2. Non-admin POST → 403; unauth POST → 401 (route test + smoke).
3. Unknown flag name → 400 on BOTH doors (route test asserts the exact
   drift-safe message; smoke greps 400).
4. GET /api/config unauth → 401 (route test + smoke).
5. Menu: 115 items, 147 live routes, all-live invariant holds
   (menu-registry.test).
6. `tsc src/` 0 errors · vitest ALL GREEN (709 + new) · route_smoke_m11
   ALL GREEN · context_check ALL GREEN (updated pins) · `next build` EXIT 0.
7. Browser check: login → /admin/settings renders 4 category cards, 28 rows,
   a toggle flips without console errors; screenshot saved.
8. STATE.md + worklog updated; single commit `feat: M11 …`.

## 5. Risks & mitigations

- **Flag flips change live enforcement** (e.g. disabling `grn_bal` stops the
  balance check) — mitigation: the screen shows the effect note per flag and
  the modified-vs-default badge; the smoke restores every value it touches;
  tests restore in afterAll.
- **GET guard breaks an unknown consumer** — verified zero in-repo consumers;
  the legacy FlagsProvider is not ported. If an external consumer appears,
  document + revisit (not silently re-open).
- **Drift rows from `update_app_option`** (agent writes a `flag:*` key not in
  the registry) — the engine ignores unknown names on read (registry-driven
  coercion), and the screen renders them read-only; `setFlag` rejects them.
  No data loss, full visibility.
- **Menu-count churn across pins** (114→115 ripples through menu test,
  context_check, STATE) — mechanical, all updated in the same commit; the
  all-live invariant makes the direction unambiguous.
