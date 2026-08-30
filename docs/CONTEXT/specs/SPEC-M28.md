# SPEC-M28 — Holiday Calendar Surfacing (gap-audit §7-H)

> Third six-task run, task 5. §7-H: "Tirupur plans around Pongal/Deepavali
> shutdowns. GovtHoliday master exists: surface it in delivery promises,
> program dates, and the MIS (upcoming shutdown warnings)." The master has
> existed since M2 with ZERO surfaces reading it for planning. Frozen
> before code (2026-08-30).

## 1. Scope

**In:**
- `src/lib/erp/holidays.ts` — the read service: `getUpcomingHolidays({from?,
  days=30})` → `{date, name, daysUntil}[]` (asc, future-only) and
  `holidaysBeforeDelivery(deliveryDate, {from?})` → the holidays inside
  [from, deliveryDate] (the promise-risk window). Zero new schema; zero
  new tools (the master already has its list tool; this is the PLANNING
  read, an ERP-internal service like rate-memory).
- **Order Hub** (/orders/[id]): when an order carries a deliveryDate and a
  holiday falls inside [today, deliveryDate], an amber warning strip above
  the header grid — "Shutdown before delivery: <name> (<date>) — plan
  despatch & production around it." (data-testid="holiday-warning").
  No deliveryDate / no holiday in window → no strip (silent, not a
  permanent empty box).
- **MIS Dashboard** (/reports/mis): an "Upcoming shutdowns" card — the
  next 4 holidays with days-until chips, linking the GovtHoliday master
  (data-testid="holiday-strip"). Hidden when empty.
- Tests: `tests/unit/holidays.test.ts` — window math both directions,
  the delivery-window filter, the empty case, both page source pins.

**Out (deferred, documented):** working-day arithmetic in program/delivery
planning (WF_PlanFinishDateArrival's Sunday+holiday skipping — a planning
ENGINE change, its own spec when the planner exists) · program-date
surfaces (programs carry no hard dates in our schema yet) · the digest
adoption (M13's digest can cite getUpcomingHolidays when its flags next
change) · Sunday handling (Tirupur units vary — some run Sundays).

## 2. Design

- The service reads `db.govtHoliday` with a window where-clause, maps to
  the display shape, sorts asc. `daysUntil` = ceil((date − from)/day).
- Order Hub: one query (`holidaysBeforeDelivery(order.deliveryDate)`)
  fetched ONLY when deliveryDate exists and status is open/in_progress.
- MIS: `getUpcomingHolidays({ days: 45 })` take 4.

## 3. Tests

1. getUpcomingHolidays: future-only, sorted, daysUntil math, days-window
   honored (a holiday 60d out is NOT in a 45d window).
2. holidaysBeforeDelivery: only holidays in [from, delivery]; a holiday
   AFTER delivery is excluded; null-safe empty when no rows.
3. Both page source pins (the M22 readFileSync precedent).

## 4. Acceptance gates

tsc src/ 0 · vitest (1000+N) · eval --static PASS · context_check NO DRIFT
(+holidays.ts +holidays.test.ts +SPEC-M28.md) · NEW route_smoke_m28.sh
(seed a holiday 6d out + an order delivering 10d out → Order Hub warning
+ MIS strip; a holiday AFTER delivery does not warn; cleanup) · LIVE
browser-verified.

## 5. Implementation record (filled at ship time)

- holidays.ts as specced (date-only comparisons — GovtHoliday.date rows
  seed at midnight; both helpers normalize with setHours(0,0,0,0) so a
  same-day holiday IS in-window).
- Order Hub strip renders under the breadcrumb; MIS card renders after
  the KPI tile grid.
- Tests +7 → 1007 vitest.
- Gates: tsc src/ 0 · 1007 vitest · eval --static PASS · context_check
  554→557/557 NO DRIFT · route_smoke_m28 NEW 10/10 · LIVE browser-verified
  (amber strip on the Order Hub + shutdown card on MIS), screenshot
  download/m28-holiday-surfacing.png.
