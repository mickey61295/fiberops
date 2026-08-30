# SPEC-M31 — Working-Day Planner Arithmetic (the M28 OUT promise)

> Fourth six-task run, task 2. M28 §OUT: "working-day arithmetic in
> program/delivery planning (WF_PlanFinishDateArrival's Sunday+holiday
> skipping — a planning ENGINE change, its own spec)". The planner "engine"
> in our world is the delivery-promise surface: the Order Hub runway + a
> chat-reachable planning read. Frozen before code (2026-08-30).

## 1. Scope

**In:**
- `src/lib/erp/holidays.ts` extended (it owns the GovtHoliday read — the
  rate-memory precedent, one planning-read module):
  - `getHolidaysBetween(from, to)` — the shared raw read (the two existing
    helpers dedup onto it).
  - PURE `workingDayBreakdown(from, to, holidayDates, {sundayWorking?})` →
    `{ workingDays, sundays, holidays }` — the inclusive [from, to] window
    classified day-by-day. Classification rule: a date in the holiday set
    is a HOLIDAY (a holiday falling on a Sunday counts ONCE, as a holiday);
    else a Sunday counts as sunday (unless `sundayWorking`); else working.
  - PURE `addWorkingDays(from, n, holidayDates, {sundayWorking?})` → Date —
    the Nth working day AT OR AFTER `from` (inclusive: n=1 on a working
    `from` returns `from` itself — "you need N working days, when do you
    finish?"). Pure: takes the holiday DATES, zero db.
  - DB wrappers `workingDaysUntil(deliveryDate, {from?, sundayWorking?})`
    and `planFinishDate({from?, leadDays, sundayWorking?})` — fetch the
    window's holidays once, delegate to the pure cores.
- **Order Hub runway**: under the Delivery tile, when delivery is future —
  "N working days · S Sundays · H shutdowns" (data-testid="working-days").
  The amber shutdown strip (M28) gains the honest line "only N of M days
  before delivery are working days" when a shutdown threatens.
- **Agent tool `get_working_days`** (tools 227→228): from/to window (or
  leadDays from today) → the breakdown + non-working dates listed. The
  "everything reachable via chat" principle — "how many working days until
  the 15th?" is a planning question the chat must answer.
- Tests: pure math with injected holiday dates (Sunday skipping, holiday-
  on-Sunday counts once, inclusive edges, n=1 identity, past windows), the
  db wrappers with fixtures, the tool, source pins.

**Out (deferred, documented):** program-date surfaces (programs carry no
hard dates in our schema — the M28 OUT stays), the AppOption
`planning.sundayWorking` flag promotion (defaults Sunday-off; promote when
a unit that runs Sundays onboards), working-day arithmetic INSIDE posting
engines (numbering/lead-time automation), the digest adoption (M35).

## 2. Design

- Sunday handling: Tirupur units vary — some run Sundays (M28 OUT note).
  Option everywhere (`sundayWorking` default false); the tool exposes it as
  a param; the Order Hub uses the default.
- `addWorkingDays` safety: a `maxScan` guard (default 400 days) — with
  pathological calendars (every day a holiday) the loop terminates; returns
  null when the guard trips (honest, not an infinite loop).
- Midnight normalization at every boundary (the M28 setHours(0,0,0,0)
  discipline — a same-day holiday IS in-window).

## 3. Tests

1. Pure breakdown: a 7-day window with 1 holiday (on a weekday) + 1 Sunday
   = 5 working; sundayWorking flips the Sunday to working; holiday ON a
   Sunday counts once (as holiday); inclusive both ends.
2. Pure addWorkingDays: n=1 identity on a working day; skip Sunday+holiday;
   holiday-on-Sunday skipped once; guard trips → null.
3. DB wrappers: fixtures (holiday 6d out) — workingDaysUntil counts it;
   planFinishDate crosses a fixture holiday.
4. Tool: registered (name/domain/read), schema accepts window OR leadDays,
   execute returns the breakdown against fixtures.
5. Source pins: Order Hub renders working-days; the amber strip line;
   holidays.ts exports; tool source.

## 4. Acceptance gates

tsc src/ 0 · vitest (1036+N) · eval --static PASS · context_check NO DRIFT
(+SPEC-M31.md pin; holidays.ts + tools.ts + orders/[id] already pinned) ·
tools 227→228 (the pins move ×8 test files) · LIVE browser-verified (Order
Hub runway renders on a future-delivery order).

## 5. Implementation record (filled at ship time)

- holidays.ts as specced: getHolidaysBetween shared read (the two M28
  helpers deduped onto it); PURE workingDayBreakdown + addWorkingDays
  (holiday-on-Sunday counts ONCE — the Set classification guarantees it);
  db wrappers workingDaysUntil + planFinishDate (scan window leadDays*3+60).
- get_working_days tool (228): window mode (breakdown + shutdown names) or
  leadDays mode (finish date); sundayWorking param; honest missing-args.
- Order Hub: the Delivery-tile runway (data-testid="working-days") + the
  amber-strip "Only N of M days" line. LIVE: SO-1001 → "39 working days
  (7 Suns, 1 shutdown)" / "Only 39 of 47 days before delivery are working
  days"; screenshot m31-working-days.png; zero console errors.
- HYGIENE FOUND & FIXED: the runway surfaced TRIPLE duplicate GovtHoliday
  rows (Independence Day / Gandhi Jayanti / Christmas ×3) — the seed's
  holiday block wasn't idempotent (naive create ran 3×). Seed now
  findFirst-guards; scripts/dedupe_holidays.ts swept 6 dupes (5 rows
  remain). The pure breakdown was ALWAYS correct (Set dedup); only the
  M28 warning display tripled.
- Test-math lesson (honest): 5 first-draft expectations forgot Saturday
  is a WORKING day (the 6-day Tirupur week) and assumed today wasn't
  Sunday — the implementation was right, the expectations were fixed.
- Tests: +21 in holidays.test (pure breakdown ×6, addWorkingDays ×6,
  wrappers ×4, tool ×4, source pin) → 1057 vitest; tool pins 227→228
  across ×8 files; context_check tool claim updated.
- Gates: tsc src/ 0 · 1057 vitest · eval --static PASS (registry-tools 220
  — the source-count lineage) · context_check 563→564/564 NO DRIFT
  (+SPEC-M31.md pin).
