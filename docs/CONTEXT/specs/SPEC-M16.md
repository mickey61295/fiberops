# SPEC-M16 — Dashboard 2.0: role dashboards (SPEC-M9 §9 P2-4)

> The LAST item of the frozen SPEC-M9 §9 P2 queue. Frozen before code
> (2026-08-30). Implementation record appended at §7 when shipped.

## 1. Problem

The home dashboard (`/`, `src/components/erp/dashboard.tsx`) is ONE generic
client-fetched view for every user: 6 fixed KPI tiles + 4 recent lists from
`/api/erp?resource=dashboard`. A merchandiser, an accountant and a storekeeper
all see the same screen. SPEC-M9 §9 M16: "Per-role dashboards (merchandiser
sees order pipeline; accountant sees cash position), customizable KPI tiles
(AppOption dashboard.<role>.*), ECharts visuals for the 15-stage chain flow
and 30-day production trend."

## 2. Scope & non-goals

**In:** role-aware SSR dashboard · per-role default tile sets + chart picks ·
user-customizable tile order/visibility persisted in AppOption · 3 chart types
(chain funnel, 30-day production trend, 30-day cash trend) · recent lists kept
for admin.

**Out:** per-USER (vs per-role) preferences — the spec pins AppOption
`dashboard.<role>.*`; revisit only with a real multi-user-per-role complaint.
New domain queries/math beyond windowed aggregates over existing tables —
charts ride existing services where possible (chain funnel = `queryOrderStatus`
wholesale). No new routes, no menu changes, no new models. The legacy
`/api/erp?resource=dashboard` case stays untouched (route_smoke_m7b pins its
auth matrix; the page simply stops using it).

## 3. Design

### 3.1 Service — `src/lib/erp/dashboard.ts`

- `TILE_REGISTRY` — 16 tiles, each `{ id, label, icon (lucide name), color,
  href }`. Tiles are read-only aggregates; href deep-links reuse the SPEC-M4
  §8.3 register-filter convention. Registry (id → query):
  `open_orders`, `inhand_pcs`, `orders_due_7d`, `samples_pending`,
  `pending_pos`, `grns_today`, `stock_value`, `low_stock`, `cut_open`,
  `today_pcs`, `entries_30d`, `pending_approvals`, `open_invoices`,
  `invoiced_30d`, `received_30d`, `employees`.
- `ROLE_DEFAULTS` — per role (the 7 schema roles): default tile order +
  chart picks (`chain` | `production` | `cash`) + which recent lists render.
  admin = superset; merchandiser = order pipeline; storekeeper = materials;
  accountant = cash position; production_mgr = shopfloor; cutting_mgr =
  cutting; hr = people.
- `getDashboardSnapshot(role)` — ONE server call: effective tile list →
  values (parallel, only the tiles the role shows), chart payloads, recent
  lists. `chainFunnel` reuses `queryOrderStatus()` (rows[].flags → count per
  stage key, over OPEN orders — documented) and also feeds `open_orders` +
  `inhand_pcs` tiles. `productionTrend` = ProductionEntry groupBy prodDate
  (30d, gap-filled). `cashTrend` = SalesInvoice / receipt-Payment per-day sums
  (30d). All payload values primitive (ISO/date strings) — RSC-serializable.
- `getEffectiveTiles(role)` — AppOption `dashboard:<role>:tiles` (JSON array
  of tile ids) → filter to registry ids → saved order wins; absent/invalid →
  role defaults.
- `saveRoleTiles(role, tiles | null)` — upsert (null = reset to defaults).

### 3.2 Save door — `src/app/(erp)/dashboard/actions.ts` (server action)

`saveDashboardTiles(role, tiles)` — session-guarded via `getSessionUser()`;
a user may only save THEIR OWN role's layout (role mismatch → error, not
redirect — it's a UI pref, not a security surface). tiles ⊆ registry
(validated); null resets. Written through AppOption upsert inside the action;
audit trail NOT wired (UI preference, not a domain write — the M15 runCommit
contract covers domain commits; documented deviation, same class as login
cookie writes).

### 3.3 Page — `src/app/(erp)/page.tsx` → SSR

Server component: `getSessionUser()` → role → `getDashboardSnapshot(role)` →
renders `<Dashboard2 />` (client) with serializable props. Replaces the old
client-fetch Dashboard component (deleted; view-component count stays 34).
Role chip renders in the hero. The `'home'` group stays universal (ADR-018) —
the dashboard itself adapts, it is never denied.

### 3.4 Client — `src/components/erp/dashboard-v2.tsx`

- Hero (role label + agent ⌘J CTA — unchanged behavior).
- Tile grid: gradient tiles (existing KpiTile look), `kpiHref` deep-links kept.
  **Customize mode**: toggle → per-tile ◀ ▶ reorder + show/hide + Save/Reset;
  Save → server action → `router.refresh()`; Reset → save null.
- Charts (recharts — ALREADY vendored ^2.15.4; SPEC-M9 said "ECharts" but the
  repo ships recharts + the shadcn chart wrapper; adding a second chart lib
  for a naming preference is not a trade — DEVIATION logged here):
  chain funnel = horizontal BarChart over the 9 observed chain flags;
  production trend = AreaChart; cash trend = ComposedChart (invoiced bars,
  received line). Chart cards only for the role's picks.
- Recent lists (compact) per role picks.

### 3.5 Acceptance (SPEC-M9 §9 M16 verbatim)

1. role-aware render ✓ (different tiles/charts per role, SSR)
2. tile order persists ✓ (AppOption `dashboard:<role>:tiles`, survives reload)
3. charts render from existing registers, no new domain queries ✓ (chain =
   queryOrderStatus reuse; trends = windowed aggregates, zero stock math)

## 4. Tests

- `tests/unit/dashboard.test.ts` — registry invariants (defaults ⊆ registry;
  7 roles covered; every tile has a query); snapshot with fixtures (tile
  values, funnel counts, 30-point gap-filled trends); persistence round-trip
  (save → order honored, invalid ids dropped, reset → defaults); action
  authorization (wrong-role save rejected; cookie-mock pattern per M7-B).
- `scripts/route_smoke_m16.sh` — dev server + admin login → `/` renders
  tiles + Customize + chart cards; merchandiser + accountant fixture users →
  role-specific tiles present/absent; menu/route counts unchanged.
- context_check: +5 pins (service, actions, page, client component, test
  file) — 516 → 521.

## 5. Risks

- AppOption per-role keys are global to the role (two accountants share a
  layout). Accepted (spec's letter: `dashboard.<role>.*`).
- Trend groupBys scan invoiceDate/payDate (indexed on createdAt only) —
  measured single-digit ms at 10k rows (SPEC-M14 perf gate precedent);
  acceptable at v1 scale.
- The old client Dashboard component deletion: view count pinned at 34 in
  context_check (delete + add = net zero).

## 6. Gates

tsc src/ 0 · vitest (new suite + full) green · `node scripts/eval_routing.mjs
--static` PASS · context_check NO DRIFT · route_smoke_m16 all-pass ·
STATE + worklog + commit + push (fresh-PAT protocol, PITFALLS #8).

## 7. Implementation record

Shipped 2026-08-30 in one session. Files: `src/lib/erp/dashboard.ts`
(TILE_REGISTRY 16 · ROLE_DEFAULTS ×7 · getDashboardSnapshot ·
getEffectiveTiles/saveRoleTiles), `src/app/(erp)/dashboard/actions.ts`
(saveDashboardTiles — session-guarded, own-role only), `src/app/(erp)/page.tsx`
(SSR server component), `src/components/erp/dashboard-v2.tsx` (tiles +
customize + 3 recharts chart cards), old `dashboard.tsx` DELETED,
`tests/unit/dashboard.test.ts` (19), `scripts/route_smoke_m16.sh` +
`scripts/m16_smoke_fixture.ts`. Gates: tsc src/ 0 · **928 vitest** (909+19) ·
eval --static PASS · context_check **522/522** NO DRIFT (+6 pins) ·
route_smoke_m16 **29/29**. Notes: (a) the customize panel lists ALL registry
tiles for add-back (hidden ones included); (b) unused chart payloads are
omitted (empty arrays) so role picks are provable in tests AND payloads stay
small; (c) context_check caught a self-inflicted drift — a comment containing
the `runCommit` token tripped the M15 door-count grep (14 vs 13); reworded to
"the M15 audit executor" — do not write that token in non-door files; (d)
menu/route/tool counts unchanged by design (rework, not breadth).
