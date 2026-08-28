# SPEC-M12 — Playwright E2E Golden Paths

> Status: **FROZEN** (2026-08-29). Roadmap source: SPEC-M9 §9-P1 item 3 ("M12 —
> E2E hardening: Playwright golden paths", effort M). The route_smoke family is
> curl+grep — it proves 200s and HTML fragments, not INTERACTIONS. M12
> introduces real-browser E2E over the 8 golden paths. **Migrate nothing**:
> every curl smoke stays as the cheap per-commit gate; Playwright is the deep
> interaction layer that runs on demand (and at session end when warranted).

## 1. Goal

One command — `bash scripts/e2e.sh` (or `npm run test:e2e`) — boots a
dedicated dev server on an ISOLATED database copy, drives a headless Chromium
through the 8 golden paths, and exits 0 only when all specs pass:

1. **login** — wrong password rejected with the error card; correct password
   lands in the app (dashboard).
2. **order create (form)** — `/orders/new` DocScreen: buyer/style pickers,
   delivery date, one line (colour picker, size picker, qty, rate) → Save &
   review plan → Approve & commit → done card → View document shows the order.
3. **order create (agent)** — topbar Agent button → self-sufficient prompt →
   `create_order` tool card reaches "pending approval" → Approve & Commit →
   the order exists (register shows it).
4. **PO→GRN** — `/procurement/po` form (poType select, party picker, typed
   item picker line) → commit → `/procurement/grn?po=<poNo>` prefilled →
   godown + qty → commit → GRN lands in the recent table.
5. **invoice→payment** — a seeded invoice → `/accounts/payments?invoice=…`
   prefilled → party/amount/direction → commit → invoice view flips to
   `status: paid`.
6. **approval approve** — the PO created in setup auto-submitted an Approval →
   `/approvals` shows the pending card → agent prompt → `approve_pending`
   pending-approval card → Approve & Commit → the card is gone after reload
   and the DB row says `approved` with the human's email in `approvedBy`.
7. **print door** — invoice view page → Print link → `/print/invoice/<no>`
   renders the A4 sheet (TAX INVOICE title, Original copy banner).
8. **rights denial** — merchandiser user whose group allows only `orders` →
   `/accounts` 307-redirects to the first allowed landing (`/`) while
   `/orders` stays reachable (deny + allow control).

## 2. Architecture contracts

### C1 — Isolated database (the load-bearing decision)

- `globalSetup` copies `db/custom.db` → **`db/e2e.db`**. The E2E dev server
  runs with `DATABASE_URL=file:/home/z/my-project/db/e2e.db` (absolute path —
  no CWD ambiguity). `globalTeardown` deletes `db/e2e.db`.
- The dev database is NEVER touched: specs may commit freely (orders, GRNs,
  payments, approvals) with zero cleanup debt, and a failed run leaves no
  residue. The copy also gives a known-good starting state (all masters that
  the smokes seeded live on).
- globalSetup FORCE-SETS `admin@fiberpro.local`'s password on the COPY to a
  known value (the fixture creds). This is deliberately NOT the seed_admin
  idempotency rule (never overwrite): the copy is disposable; deterministic
  credentials outrank the no-overwrite rule here. The dev DB's real password
  is untouched.

### C2 — Dedicated server, one command (PITFALLS #34 compliance)

- `playwright.config.ts` `webServer`: `npx next dev -p 3100` with the e2e
  DATABASE_URL env, `port: 3100`, `reuseExistingServer: false`, timeout
  180 s (next dev cold boot + on-demand route compilation).
- Port 3100 never collides with the system-managed :3000 server (which serves
  `custom.db` — reusing it would test the WRONG database).
- Playwright owns the server's lifecycle inside the single `playwright test`
  invocation → the platform's orphan-reaping between tool calls cannot kill
  it mid-suite; the process dies with the run.
- `fullyParallel: false`, `workers: 1` — sequential specs (deterministic
  order, one Chromium, low RAM: the box also carries the system dev server).
- Route compile-on-demand makes first-navigation slow: `navigationTimeout`
  120 s, per-test timeout 120 s default.

### C3 — Auth strategy (no storageState shortcuts)

Every spec logs in through the REAL `/login` form via a shared helper
(`tests/e2e/helpers.ts` → `login(page, email, password)`). The login door is
golden path #1; exercising it 8× is honest repetition, not waste. No
storageState reuse — a broken login must fail every spec, loudly.

### C4 — Fixtures (globalSetup seeds; specs never assume prior data)

`scripts/e2e_global_setup.ts` (runs against e2e.db, `DATABASE_URL` env):

- **E2E masters, all 'E2E'-marked** (greppable, collision-free): Buyer
  `E2E-B` "E2E Buyer"; Style `E2E-S1`; Colour `E2E-CR`/"E2E Red"; Size
  "E2E M"; Party `E2E-P` "E2E Party" (supplier); Yarn `E2E-Y` count "E2E
  30s" (uom = an existing UOM row); Godown `E2E-G` "E2E Godown".
- **Users**: admin password force-set (C1); group "E2E Rights" rights
  `["orders"]` + merchandiser `e2e@fiberpro.local` (password `e2e123`) for
  spec 8.
- **Business seed via the REAL posting services** (the honest door —
  ADR-001: same service as the agent and the forms):
  `planOrder(...).commit()` → `planInvoice(...).commit()` (taxable ₹1,000 +
  5% GST → bill ₹1,050 — the spec-5 payment amount settles it exactly);
  `planPurchaseOrder(...).commit()` whose commit AUTO-SUBMITS the pending
  Approval (spec 6's target).
- The seeded keys (orderNo, invoiceNo, billAmount, poNo, master codes) are
  written to `tests/e2e/.e2e-state.json`; specs read them — no spec
  hard-codes DB identities, nothing depends on run order.

### C5 — The agent specs and the LLM (the honest risk)

Specs 3 and 6 drive the real GLM through `/api/agent` (SSE). Mitigations:

- **Self-sufficient prompts** (the M10 eval lesson): every arg the tool needs
  is in the prompt — buyer code, style, colour, size, qty, rate, delivery
  date; for approvals: the PO number. No "use the data from before".
- Timeouts: agent specs get `test.setTimeout(300_000)`; the pending-approval
  card gets a 240 s expect timeout (multi-step tool chains are slow).
- `test.describe.configure({ retries: 1 })` on the two agent specs only —
  the platform LLM quota throttles bursts (the M10 eval's documented
  residual); one retry is the cheap second chance. A flake that survives the
  retry FAILS the suite honestly.
- Assertions target UI STATE (tool card shows the expected toolName +
  "pending approval" badge → "Approve & Commit" click → committed), then DB
  truth via the helper's PrismaClient (datasources pinned to e2e.db).

### C6 — Zero-defect assertions

Every spec collects `pageerror` events and console `error` entries and
expects ZERO at the end (the M9/M10/M11 browser-verification bar, made
permanent). Dev-mode React warnings (`warn`) are not errors; network 404s for
favicon-class resources are not console errors.

## 3. Files

| Path | Role |
|---|---|
| `playwright.config.ts` | webServer :3100 + e2e.db env, workers 1, globalSetup/Teardown, reporter list |
| `tests/e2e/helpers.ts` | `login()`, `pickMaster()` (DocPicker driver), `fillHeader()`, console/pageerror collector, `e2eDb()` (PrismaClient pinned to e2e.db), state loader |
| `tests/e2e/01-login.spec.ts` … `08-rights-denial.spec.ts` | the 8 golden paths |
| `scripts/e2e_global_setup.ts` | C4 fixture seeding (masters, users, order+invoice+PO, state JSON) |
| `scripts/e2e_global_teardown.ts` | delete e2e.db + state JSON |
| `scripts/e2e.sh` | the ONE command: guard (node_modules present) → `npx playwright test` |
| `package.json` | `"test:e2e": "bash scripts/e2e.sh"` + devDep `@playwright/test` (bun add -d; browsers already cached at ~/.cache/ms-playwright chromium v1234 = 1.62.1 — zero download) |

## 4. Conventions

- Specs live in `tests/e2e/` with `.spec.ts` suffix — vitest's include pattern
  is `tests/**/*.test.ts`, so the suites never collide.
- Selectors: semantic first (`#email`, `#password`, aria-labels the forms
  already carry, `button:has-text('Save & review plan')`); the M10-era
  `data-testid` pins (`prompt-version`) are used where they exist. NO new
  data-testids added to app code in M12 — the real UI surface must stay the
  contract (if a spec cannot target the real DOM, that is a UI bug to note,
  not a testability patch to smuggle in).
- The agent panel is opened via the topbar `Agent` button (the user-visible
  door), never `page.evaluate` dispatch hacks.
- Money values in specs use integers to dodge float display quirks; the
  settle check asserts the invoice STATUS flip, not decimal equality.

## 5. Acceptance gates (all must be green)

1. `bash scripts/e2e.sh` exits 0 — 8 spec files, ≥10 test cases, zero
   skips-hiding-failures.
2. `db/custom.db` byte-identical before/after the run (checksum) — the
   isolation contract proven, not promised.
3. The E2E server log (Playwright-captured) carries no unhandled route
   errors; dev.log (the system server's) untouched by the run.
4. `npx tsc --noEmit` clean; `npx vitest run` unaffected (724/724).
5. `scripts/context_check.sh` gains the M12 pins (config + 8 specs + setup/
   teardown scripts + package script) and reports NO DRIFT (410 → ~416).
6. Route smokes unchanged and still green (route_smoke_m9 38/38 — curl gates
   stay).

## 6. Out of scope

- No migration of curl smokes to Playwright (they stay the cheap gate).
- No CI wiring (single-box sandbox; the one-command contract is the CI-ready
  shape).
- No visual-regression or screenshot diffing (browser verification remains
  the agent's VLM/DOM pass at session level).
- No mobile viewport specs (the app is desktop-first by design).
- No coverage of all 20 print families / 115 menu items — the 8 golden paths
  only, per the frozen roadmap.

## 7. Risks

- **LLM throttle** (M10 residual): mitigated by C5 (self-sufficiency,
  timeouts, 1 retry); worst case the suite honestly fails and re-runs.
- **RAM** (3.9 GB box, PITFALLS #34): the E2E run adds one dev server
  (~1 GB while compiling) + one Chromium to the system server's footprint;
  workers:1 caps it. If the box is starved, kill the system :3000 server for
  the run's duration (documented in scripts/e2e.sh header comment).
- **On-demand route compilation** makes first hits slow — timeouts sized for
  it; a warm second run is faster (next dev cache).
- **copy-db determinism**: custom.db drift (schema pushed, new junk rows) is
  inherited by the copy; the E2E masters/users are upserted by MARKER every
  setup, so drift cannot break lookups. A schema/migration mismatch between
  custom.db and the client would fail loudly at setup — caught, not silent.

## 8. Implementation record (frozen after bring-up — what actually shipped)

Delivered 2026-08-29, tag `m12`. Files exactly as §3 planned, plus three
additions earned during bring-up:

- **scripts/e2e_cleanup_devdb.ts** — one-shot cleanup of the dev-DB pollution
  the env bug caused (PITFALLS #35): removes every 'E2E'-marked row (orders,
  invoices, POs, approvals, masters, group+user) and restores the admin
  password. Kept in the repo as the recovery drill for any future leak.
- **The isolation triple-lock** (stronger than §2-C1 as written): the runner
  EXPORTS `DATABASE_URL` for the whole playwright tree (the webServer.env
  scope alone does NOT cover globalSetup), the setup REFUSES to run unless
  the URL points at e2e.db, and the runner md5-checks db/custom.db
  before/after, failing loudly on any mutation. Gate 2 of §5 is enforced by
  code, not by belief.
- **The SSE disconnect guard in src/app/api/agent/route.ts** (found by the
  suite, fixed under it): `send()`/`safeClose()` wrap every controller write;
  a browser navigating away mid-stream no longer throws
  "Controller is already closed" (which used to log a fake route error after
  every agent spec) and the LLM loop breaks instead of burning steps on a
  dead client. PITFALLS #36 documents the regex mishap en route (a
  self-recursive send() that tsc happily accepted — caught only by the UI
  spec, the gate proving itself in its first session).

Selector notes for future spec authors (§4 in practice): header DocScreen
text/number/date inputs carry NO aria-label — target by DOM order
(`input >> nth=1` = GRN poNo; `input >> nth=2` = payment invoiceNo) or use
`getByDisplayValue`'s successor patterns; line-grid inputs DO carry
aria-labels; PO numbers are per-type (`PO-Y-008`, not `PO-####`); the DocPicker
interaction is trigger-button (aria-label) → dropdown search → option click;
Playwright 1.62 REMOVED `getByDisplayValue` (use toHaveValue on an ordered
locator). The wrong-password spec declares its 401 console error as
`allowed` — the zero-defect bar excludes only DECLARED negative-test noise.

Final gate results: 14/14 specs in ~52 s (exit 0) · isolation check OK ·
tsc src/ 0 · vitest 724/724 · eval_routing --static PASS · route_smoke_m9
38/38 · next build EXIT 0 · context_check 418/418 NO DRIFT.
