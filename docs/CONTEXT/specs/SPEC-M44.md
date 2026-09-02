# SPEC-M44 — Hotfix: Fiscal-Year Single Source (FY-01)

Source: STATE #47 "suggested hotfix" (2026-09-02) — 37 literal `'26-27'`
occurrences across 23 src files. Evidence re-verified on the M43 line
(2026-09-02): `rg '26-27' src` → 37 hits — ~24 posting-service hardcodes
(`const finYear = '26-27'` + inline `finYear: '26-27'` data literals), 3 zod
`describe()` texts, 2 tool docstrings, 1 comment (route.ts, historical), 2
context.ts mentions (comment + `.catch` fallback), 1 numbering.ts fallback,
plus `scripts/seed.ts:6 FIN_YEAR = '26-27'`. The active FinYear row exists
(`code '26-27', active: true`) and `activeFinYear()` (numbering.ts:12) already
resolves it — 21 call sites just never call it. The `FinYear` master is
admin-managed at `/admin/company` (rows + active flag already editable).

The time bomb: every one of those literals is wrong the day the owner
activates `27-28` (2027-04-01 or earlier). Documents would silently post into a
dead fiscal year while registers and the OPN FY gate (M42 INV-07) move on.

## §1 Scope — 1 FR, zero deferrals

| FR | Ship |
|---|---|
| FY-01 | Single source of truth for the default financial year: `activeFinYear()` in `numbering.ts` becomes the ONLY decider — the active `FinYear` row's code, falling back (no active row / DB error) to an IST-date-derived code (Apr 1–Mar 31) via the new pure `fyCodeFor(dateStr)` + `fyCodeToday()`. Every posting service, `adjust_stock`, and the seeder call it instead of a literal. Explicit `args.finYear` still wins (historical documents) — unchanged. `purchase-return` still inherits the source GRN's finYear first. Agent-visible texts (2 tool docstrings + 3 schema describes) stop claiming "current 26-27" and say "the active financial year" (honest claims, T2) |

## §2 Design decisions

1. **Default = the ACTIVE row, not the wall clock.** The owner decides the FY
   boundary by activating the row (the admin page already does this); rollover
   day is a business decision, not a date function. The clock-derived code is
   only the last-resort fallback for a degenerate DB (no active row) — where a
   derived '26-27'/'27-28' is strictly better than a frozen '26-27'.
2. **`fyCodeFor` is pure and testable** — takes `'YYYY-MM-DD'`, returns
   `'yy-yy'`; month ≥ 4 (April) starts a new code. No clock inside; tests pin
   the boundary matrix (Apr 1 / Mar 31 both sides) forever. `fyCodeToday()`
   wraps `istDateStr(new Date())` — IST, matching every other date default
   (dates.ts).
3. **Reads inside transactions are safe.** `activeFinYear()` only reads; the
   M42 WAL pitfall (#45) was a WRITE inside an open transaction. Plan and
   commit each resolve it independently — same value milliseconds apart, and
   the plan/commit agreement is unaffected (both doors re-resolve at commit).
4. **Numbering per-FY reset is OUT OF SCOPE** — `nextFree` scans the whole
   table today (SO-1002 follows SO-1001 across FY boundaries). Legacy reset
   per FY; that is a numbering-semantics change, not a default-value fix, and
   ships only with an owner decision (noted for Module M/final-accounts).
5. **No prompt, tool, route, menu, or flag changes** → PROMPT_VERSION stays
   `m43-2026-09-02`, context_check pins stay 604, eval --static registry
   unchanged. The 5 text edits are descriptions only (zero pins on them,
   grep-verified).

## §3 Files

| File | Change |
|---|---|
| `src/lib/erp/numbering.ts` | +`fyCodeFor` +`fyCodeToday` (exported, pure); `activeFinYear` fallback `'26-27'` → `fyCodeToday()`; comment updated |
| `src/lib/erp/posting/*.ts` (18 files, ~24 sites) | every literal → `await activeFinYear()` (hoisted `const finYear = …` where the literal sat inside data objects) |
| `src/lib/agent/tools.ts` | `adjust_stock` finYear literal → `activeFinYear()`; 2 docstrings say "active financial year" |
| `src/lib/agent/context.ts` | `.catch(() => '26-27')` → `.catch(() => fyCodeToday())` |
| `src/lib/erp/schemas/{budget,expense,packing-list}.ts` | 3 describes → "Defaults to the active financial year" |
| `scripts/seed.ts` | `FIN_YEAR` literal → derived from one `ANCHOR_YEAR = 2026` constant (the demo dataset's dates are fixed 2026 — wall-clock derivation would desync it after 2027; the anchor collapses three magic values into one) |
| `tests/pipeline/fy-hotfix-m44.test.ts` | NEW — see §4 |

## §4 Tests (tests/pipeline/fy-hotfix-m44.test.ts)

1. `fyCodeFor` matrix: 2026-03-31→'25-26', 2026-04-01→'26-27',
   2027-03-31→'26-27', 2027-04-01→'27-28', 2099-03-31→'98-99' (century wrap),
   2100-04-01→'00-01' (wrap to 00).
2. `fyCodeToday()` === `fyCodeFor(istDateStr(new Date()))` — self-consistent,
   no literal pinned (the test must not itself become a 2027 time bomb).
3. `activeFinYear()` === the code of the row where `active: true` (row queried
   in-test, compared — future-proof against the owner activating 27-28).
4. Fallback: deactivate all rows → `activeFinYear()` === `fyCodeToday()`;
   active row restored in `finally` (DB left byte-identical).
5. Source contracts: zero `'26-27'` literals in `src/lib/erp/posting/**`,
   `tools.ts` has no `= '26-27'`, `numbering.ts` has no `?? '26-27'`,
   `scripts/seed.ts` has no `= '26-27'`.
6. Behavioral: one plan service without `finYear` commits with the ACTIVE row's
   code (uses the cheapest write path + full revert).

## §5 Gates

Full vitest (1334 + new) · `tsc` src 0 errors · `eval --static` PASS
(m43-2026-09-02 unchanged) · `context_check` 604/604 NO DRIFT (no pin touched)
· no new routes → no route-smoke addition · no browser E2E needed (backend
default only; both doors flow through the same services — pinned by the
behavioral test).
