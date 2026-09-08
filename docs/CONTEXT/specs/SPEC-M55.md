# SPEC-M55 — Module L Batch 6: shift wages (L-06, the LAST Module L item)

Status: committed spec (implementation target). Precedes the M55 feat commit.
Module: L (HR-payroll) · Phase-6B remediation §13 L-06 row — the LAST
Module L item (L-01..L-05 shipped: M45/M46/M48).
Depends on: M19 Wave C (ADR-019 + the Shift master), M3/M5 (production
entry + the wages register + budget-vs-actual), M20 (the Attendance⇄Shift
FK precedent), M46 (payroll piece mode = Σ `ProductionEntry.amount`),
HFX-12 (the interim `amount` reads this spec retires).
One additive nullable field (`shiftId`); ZERO new models (92 stays 92).

## 0. Problem

Three gaps, all named by the remediation spec §13 L-06 row and its
deep-dive backing:

1. **`shiftWages` is a dead column** (deep-dive §3.2, P1): written by
   nobody (grep-verified read-side only), carried by
   `ProductionEntry` since M3. HFX-12 (Batch 0) switched every reader to
   `amount` as the interim — honest numbers, dishonest column. L-06's
   criterion: "The production-entry shift door writes `shiftWages`
   (ADR-019) — or the column is dropped; **no dead-column state
   remains**."
2. **No shift door.** The legacy app had one: `ProdShiftWages` +
   `post_shift_wages` (REQUIREMENTS §row 6) — the shift-end wage bill
   posting for wage cost that is NOT piece-rate (fixed/incentive shift
   staff). Our architecture has no way to record it: piece entries
   carry `amount` (per-operator piece earnings), daily wages ride the
   M46 payroll run. The between-space — shift-level wage cost booked
   against an order — has no door.
3. **The shift lens never shipped** (deep-dive §3.7, P2): legacy had
   four wage lenses (`Frm_ProductionWages`, `_Dept`, `_Stage`,
   `FrmProdShiftWagesReg`); GAP-ANALYSIS maps the last as
   "**MAP** — wages register by shift". We ship only the operator lens.

## 1. THE ONE SEMANTIC DECISION — ADR-019-A: the ProductionEntry⇄Shift link

ADR-019 froze the linkage: "needs a ProductionEntry⇄Shift decision — no
shiftId field; **do not invent one without a spec**." This spec is that
spec; the owner's standing "continue" directive (2026-09-08, after the
decision was surfaced) delegates the recommended default. **ADR-019-A**
(the amendment recorded in 02-DECISIONS.md alongside this commit):

- **The link is `ProductionEntry.shiftId String?`** — a nullable FK to
  `Shift` (+ the `Shift.productionEntries` back-relation). Rationale:
  the **Attendance⇄Shift precedent** (M20, same FK shape) and the
  same-model `deptId`/`operatorId` precedent; nullable = additive,
  reversible (drop the field drops the link, nothing else moves), and
  honest (existing rows land in an explicit `unassigned` bucket, never
  a fabricated shift).
- **The column's meaning is pinned, finally**: `shiftWages` =
  shift-level wage cost booked against the order, **beyond piece rate**
  (fixed shift staff, shift incentives). The piece-rate wage stays
  `amount` (it already rides inside `prodCost` — the HFX-12
  double-count warning is why the two must never be conflated).
  The budget comment said it verbatim: "L-06 reintroduces a real
  shift-wage addend when it resolves the column."
- **No silent fallbacks**: an unknown `shiftCode` is a LOUD refusal
  (the unknown-deptCode discipline — no row, no wage burned); a wage
  row without a shift linkage is impossible (the door requires it).

## 2. FRs

- **SW-01 the linkage** — `ProductionEntry.shiftId String?` +
  `shift Shift? @relation(...)` + `Shift.productionEntries
  ProductionEntry[]` (models 92→92, db push + WAL checkpoint + dev
  server restart — PITFALLS #50). No backfill, no default shift.

- **SW-02 attribution side of the door** —
  `PRODUCTION_ENTRY_SCHEMA` + `shiftCode` optional;
  `planProductionEntry` resolves the Shift by code (unknown → refusal
  naming the shift master) and stamps `shiftId` on creates + commit.
  The M5 variant schemas stay untouched (their rows land `unassigned`
  — honest; they gain the param when a variant needs it).

- **SW-03 the wage door (the legacy `post_shift_wages` port)** —
  `SHIFT_WAGES_SCHEMA { orderNo, deptCode, shiftCode, prodDate, amount
  (≥ 0.01), notes? }`; `planShiftWages` posts a **wage-only
  ProductionEntry**: qty 0, rate 0, amount 0, `shiftWages = amount`,
  `operatorId` null, `bundleNo` null — qty 0 ⇒ NO G2 stock move (the
  ledger call skips), so no pcs ledger pollution. Plan text carries
  the shift, dept, order, amount + the "no GL leg at this door" note
  (the wage journal rides the M46 payroll / wage-bill flow — same as
  piece entries; the door is production-cost data). Tool:
  `docTool('post_shift_wages', …, 'production', SHIFT_WAGES_SCHEMA,
  planShiftWages)` — plus the `get_shift_wages` read tool: tools 269→271.

- **SW-04 the budget addend reintroduced** — `registers/budget.ts`:
  `shiftWages = Σ e.shiftWages` (the REAL column — the HFX-12
  `Σ amount` stand-in retires), `actual = poValue + prodCost +
  expenseSpend + shiftWages`. Identical numbers on pre-M55 data (the
  column was 0); wage rows carry amount 0 so `prodCost` cannot
  double-count them (the HFX-12 warning honored by construction).
  `get_budget_vs_actual` json unchanged in shape (additive value).

- **SW-05 honest wage totals on the read surfaces** —
  production-status register: `Wages = Σ amount + Σ shiftWages`
  (identical pre-M55; the frozen json field name stays, the value
  becomes the true bill); daily-unit-pnl: `wages = Σ amount +
  Σ shiftWages`, `margin = produced − wages` (shape unchanged).
  The **operator wages register is UNCHANGED** (piece earnings only —
  shift wages are not operator-attributed; that lens's truth stays
  M5-pure, every pin holds).

- **SW-06 the shift-wages register (the `FrmProdShiftWagesReg` port)**
  — new register trio: config `shift-wages` + service `queryShiftWages`
  + page `/hr/shift-wages` + csv route + menu item (hr group; menu
  147→148, routes 183→184). Grain: **shift × prodDate** (dept rides the
  `q` text filter, the operator-register precedent); rows: shift
  code/name, date, entries, piece qty, piece earnings (Σ amount),
  **shift wages (Σ shiftWages)**, total bill, distinct operators,
  distinct orders. `shiftId = null` rows land in an explicit
  `unassigned` bucket (never fabricated). `askPrompt` +
  `agentTools: ['get_shift_wages']` — the new read tool (delegates to
  the service, the `get_production_wages` precedent).

- **SW-07 pins + tests + gates** — same-commit pin sweeps: allTools
  269→271 (the door + the read tool; ×~24 files, the M54 sweep pattern),
  menu 147→148, routes 183→184, `PROMPT_VERSION m55-2026-09-08`; prompt §HR gains the
  shift-wages lines (the door + the register); STATE #60;
  MANUAL-TESTING v1.9 (AC-25..26 — the door walkthrough + the register
  + the honesty doors). Tests: `tests/pipeline/hr-l06.test.ts` NEW
  (~16: the door plan/commit, unknown-shift refusal, qty-0 ⇒ no stock
  move, the budget addend + no-double-count, the register rows incl.
  unassigned + csv, piece-payroll non-pollution, attribution via
  shiftCode on a piece entry, wiring pins). Gates: vitest green · tsc
  src 0 · context_check NO DRIFT (pins recomputed) · eval --static
  PASS (registry 262) · `route_smoke_m55` NEW LIVE · browser E2E
  through both doors with full revert.

## 3. Design notes

- **No journal at the door** — piece entries don't journal either
  (their GL leg rides the M46 payroll run or the wages-register
  "Generate wage bill" button). The shift door is cost data, booked
  into actuals the moment it posts; the cash/GL story stays where it
  already lives.
- **No seed, no backfill** — shifts are user data (the Shift master is
  user-maintained); existing entries keep `null` (the `unassigned`
  bucket is the honest representation of "the door didn't exist yet").
- **The wage row is a ProductionEntry, not a new model** — it reuses
  the grain (order × dept × date), the shift linkage, every register
  filter, and the audit/commit pipeline for free; a separate
  ProdShiftWages table would duplicate all of it for one number.
  qty 0 keeps it inert everywhere qty matters (stock, piece payroll,
  production-status qty, daily-pnl produced).
- **Reversibility** — the delegated decision is cheap to unwind: drop
  `shiftId`, the door, and the lens; the column returns to dead (or
  drops) with zero data migration beyond the field itself.

## 4. Non-goals (owner decisions, not invented here)

- The §3.7 **dept/stage lenses** of the operator register (separate
  batch if wanted; the shift lens here closes the L-06 mapping).
- Shift master enrichment (breaks/OT-rate/weekly-off — deep-dive
  §3.6).
- Cross-midnight attendance times, OT, leave model (§3.6).
- §17 owner decisions (backup target, G3 yard, PDC lifecycle, Tally
  XML) — still the owner's.
