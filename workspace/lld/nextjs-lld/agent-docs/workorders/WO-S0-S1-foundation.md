# WO-S0-S1 — Foundation Work Orders (Stages 0 + 1)

Executable task cards for the worker model. One card per TASKS.md item, same IDs.
Read the Refs sections in `nextjs-lld/` BEFORE writing code. Do not guess: if a legacy
column/proc name is unclear, read the S0.2 DDL/catalog extracts under
`nextjs-lld/design/db-extract/` and record any mismatch in `nextjs-lld/PROGRESS.md` sec. 5.

Shell: Git Bash (Windows). Doc numbers: 00-OVERVIEW 01-ARCHITECTURE 02-COMPONENT-TREE 03-DOMAIN-POSTING-ENGINE 04-API-SERVICES 05-EVENTS-SYNC-NOTIFICATIONS 06-SCREEN-MAP 07-REPORTS-FLAGS 08-QR-TRACKING 09-AI-HARNESS 10-REVIEW-REPORT 11-PROC-VERIFICATION (all in nextjs-lld/).

Conventions:
- App root: `C:\Users\mahes\Documents\Projects\Fiber\Fiberpro\joms-web` (created in WO-S0.1). All
  `joms-web/...` paths below are relative to that root. Docs live in `nextjs-lld/`.
- Test runner: vitest (`npm test -- <file>`); integration tests read DB config from `.env.local`.
- Gates: G1 mid-failure transaction test, G2 parity test, G3 reversal test, G4 docs sync,
  G5 rights/flags on new screens (inlined gate definitions; workers never read a plan doc).
- Sizes: S <= half day, M <= 2 days, L <= 1 week.

Work order list: WO-S0.1, WO-S0.2, WO-S0.3, WO-S0.4, WO-S1.1 .. WO-S1.8 (12 cards).

---

## WO-S0.1 — Next.js scaffold, lint/format/CI, env schema (M, S0)
- **Objective:** Create the `joms-web` Next.js App Router + TypeScript app with ESLint/Prettier, a lint+build CI workflow, and a zod-validated env schema for DB connection and secrets.
- **Refs:** 01 sec. 1 (stack table), sec. 2 (layering golden rules); TASKS S0.1; nextjs-lld README. Inlined rules (retired plan sec. 2 rules 1+6): the legacy schema is never altered (new tables are additive-only) and docs move with code in the same PR.
- **Owning docs:** 01
- **Preconditions:** none (first task).
- **Implementation steps:**
  0. Verify Node 20 LTS (`node -v`) and Git Bash; `git init` at repo root `C:\Users\mahes\Documents\Projects\Fiber\Fiberpro` if absent; create a root `.gitignore` excluding legacy binaries (`*.exe`, `*.dll`, `*.ocx`, `Report*/`, `SP*/`) — WO id S0.1 scope.
  1. From `C:\Users\mahes\Documents\Projects\Fiber\Fiberpro` run: `npx create-next-app@latest joms-web --ts --eslint --app --src-dir --import-alias "@/*" --tailwind --use-npm --yes`.
  2. In `joms-web/` run: `npm i mssql zod zustand @tanstack/react-query react-hook-form jose` and `npm i -D prettier eslint-config-prettier vitest dotenv @types/mssql tsx`.
  3. Create `joms-web/src/lib/env.ts`: zod schema with `DB_HOST, DB_PORT (default 1433), DB_USER, DB_PASSWORD, DB_NAME, DB_PROD_NAME (optional, cross-db per 05 sec. 6), SESSION_SECRET`; export `getEnv()` that parses once and throws `Error('ENV_MISSING:<name>')` naming the first missing key.
  4. Create `joms-web/src/db/pool.ts`: singleton `mssql` ConnectionPool from `getEnv()`, plus `withTx(fn)` that opens a transaction, commits on success, rolls back on any throw.
  5. Create `joms-web/src/lib/types.ts` with `SessionCtx { userId, groupId, coyCode, finyear, godown?, lineId? }` (01 sec. 3.1) and `joms-web/src/lib/enums.ts` with the union types from 03 sec. 1 (`TrType, GrnType, PcsType, GoodFlag, YF, ProcessType, RateFor, EntryOption, FinalStage`) — verbatim values.
  6. Create `joms-web/vitest.config.ts` (node environment, `dotenv` preloading `.env.local`, include `tests/**/*.test.ts*`), `joms-web/.prettierrc` (printWidth 100, singleQuote), and add `eslint-config-prettier` to the generated ESLint flat config `joms-web/eslint.config.mjs` (create-next-app now ships the flat config instead of `.eslintrc.json` — import eslint-config-prettier last so it turns off conflicting stylistic rules), create empty `joms-web/tests/` and `joms-web/migrations/`.
  7. Edit `joms-web/package.json` scripts: `lint` (next lint), `format` (prettier --write .), `test` (`vitest run`), `migrate` (added in WO-S0.3).
  8. Create `joms-web/.github/workflows/ci.yml`: on push/PR run `npm ci`, `npm run lint`, `npm run build` (no DB secrets needed).
  9. Create `joms-web/.env.example` listing every env var with a comment — it must include the DB keys WO-S0.2 consumes (`DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, DB_PROD_NAME`, plus `LEGACY_SQL_DIR` for the extract scripts); verify `.gitignore` covers `.env*` except `.env.example`; commit no credentials anywhere (01 sec. 5).
  10. Replace `joms-web/src/app/page.tsx` with a server component that redirects to `/login`; leave `src/app/layout.tsx` as the minimal html shell.
- **Acceptance criteria:**
  - AC1: Given the scaffold, When `npm run build` runs in `joms-web/`, Then it exits 0.
  - AC2: Given `.env.local` is missing `DB_HOST`, When any code path calls `getEnv()`, Then it throws an error whose message contains `ENV_MISSING:DB_HOST` (unit test on `src/lib/env.ts` with a cleared env).
  - AC3: Given the repo, When `npm run lint` runs, Then it exits 0 with zero errors.
  - AC4: Given `src/lib/enums.ts`, When a test imports `TrType` and `GrnType`, Then the allowed values equal the 03 sec. 1 lists (compile-time union + a runtime sample test for 1, 2, 20, -7 and 'Purchase', 'Process').
- **Test commands:**
  - `cd /c/Users/mahes/Documents/Projects/Fiber/Fiberpro/joms-web && npm run lint && npm run build`
  - `npm test`
- **Out of scope:** any login/auth logic (S1.1), DB reads/writes beyond the pool module, component library (S1.4), legacy schema changes.
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] `npm run lint` and `npm run build` pass
  - [ ] No credential or `sa` string in committed files (grep `DB_PASSWORD` only matches `.env.example` placeholder)
  - [ ] TASKS.md S0.1 box ticked + PROGRESS.md change-log line added

---

## WO-S0.2 — Legacy reference pack import (a.k.a. WO-S0.2A, no-legacy mode) (L, S0)
- **Objective (NO-LEGACY MODE ACTIVE):** bootstrap the dev database and reference pack from the pre-extracted design docs instead of a live DB — import `design/SCHEMA-CATALOG.md` + `design/REPORT-PARAMS.md` + `design/ASSUMPTIONS-NOLEGACY.md`, create the dev schema, and record ASSUMPTION-1 (`Sp_currentstock` inferred spec) as the fabric-ledger contract pending human validation.
- **Original objective (only if user later provides read-only legacy DB access):** Produce the read-only extract pack `nextjs-lld/design/db-extract/` containing the `Sp_currentstock` body (closes blocker B1), a live proc/trigger/view catalog diff vs the shipped legacy folders (closes B2 input), a DDL snapshot of legacy tables, and masked master samples.
- **Refs:** 11 sec. 6 (sec. 6.1 Sp_currentstock blocker, sec. 6.3 drift rule); 03 sec. 3 (Sp_currentstock warning box and RollDtl variant rules); 10 sec. 4.1 (live-DB drift caveat). Stage-0 exit rule (inlined): the stage closes when the extract pack is committed and blockers B1/B2 are marked closed.
- **Owning docs:** 11, 03, 10
- **Preconditions:** WO-S0.1 done; supervisor created `joms-web/.env.local` from `.env.example` pointing at the EMPTY dev SQL Server (no legacy credentials exist or may be requested in no-legacy mode).
- **No-legacy steps (EXECUTE THESE):**
  1. Read `nextjs-lld/design/SCHEMA-CATALOG.md` fully; create `joms-web/scripts/schema/01-bootstrap.sql` that CREATEs the ~90 core tables (sec. 2) with the catalog's columns (`?` types resolved by name heuristic, listed in `joms-web/schema_todo.md`) plus the compact-list remainder (sec. 3) as shell tables.
  2. Create `joms-web/scripts/schema/02-seed-min.sql`: seed `Options` defaults from 07 Part 2 (this-customer values, marked tenant-data), `Mas_User` admin row, finyear row.
  3. Copy `design/ASSUMPTIONS-NOLEGACY.md` into `joms-web/docs/` and add `ASSUMPTION-1` tags where the schema TODO list touches CurrentStock semantics.
  4. Record in `nextjs-lld/PROGRESS.md` sec. 3: B1 re-scoped to "ASSUMPTION-1 pending human validation"; B2 closed for build (catalog is the reference; one-shot validation deferred); B3 now means "dev SQL Server provisioned by user (empty), no legacy creds".
- **No-legacy acceptance criteria (authoritative):**
  - AC0a: Given the empty dev DB, When 01-bootstrap.sql + 02-seed-min.sql run, Then the 90 core tables exist (sys.tables count >= 90 for the catalog set) and login works against the seeded admin row.
  - AC0b: `joms-web/schema_todo.md` exists and lists every `?`-typed column decision; zero `?` markers remain unlisted.
  - AC0c: PROGRESS sec. 3 shows the three re-scoped blocker rows with today's date.
- **Legacy-mode steps below apply ONLY if the user later supplies read-only legacy access (P4 prompt).**
- **Implementation steps:**
  1. Create folders `nextjs-lld/design/db-extract/{procs,catalog,ddl,samples}` and `nextjs-lld/design/db-extract/README.md` stating extraction date, DB name, and how to re-run every script.
  2. Create `joms-web/scripts/extract/01-currentstock.sql` containing `EXEC sp_helptext 'Sp_currentstock';` and `EXEC sp_helptext 'Sp_currentstock_RollDtl';`; run it with `sqlcmd` (auth from `.env.local`) and save each body verbatim to `design/db-extract/procs/Sp_currentstock.md` and `design/db-extract/procs/Sp_currentstock_RollDtl.md` (SQL inside fenced code blocks, extraction date in the header). This closes B1.
  3. Create `joms-web/scripts/extract/02-catalog.sql`: one result set over `sys.objects` + `sys.sql_modules` listing object name, type (P/TR/V), `modify_date`, and `CONVERT(NVARCHAR(MAX), HASHBYTES('SHA2_256', definition), 2)` as def_hash; save output to `design/db-extract/catalog/live-catalog.csv`.
  4. Create `joms-web/scripts/extract/03-diff-catalog.mjs` (Node, plain fs): walk the legacy SQL folders (path taken from env `LEGACY_SQL_DIR`), parse object names from file bodies, and write `design/db-extract/catalog/drift-report.md` with four sections and counts: only-in-db, only-on-disk, db-newer-modify_date, both-present (hash not comparable — listed with dates).
  5. Create `joms-web/scripts/extract/04-ddl.sql`: generate column/index DDL for tables named `Mas_%, Trs_%, ST_%, WBS_%, Pay_%, Pro_%, Prog_%, Options, CurrentStock, Pcs_StockTable%, Panel_StockTable%` from `sys.tables`/`sys.columns`/`sys.indexes`; save to `design/db-extract/ddl/schema-snapshot.sql` and a per-table column-count index `design/db-extract/ddl/tables-index.md`.
  6. Create `joms-web/scripts/extract/05-samples.sql`: `SELECT TOP (50) * ` from `Mas_Party, Mas_User, Mas_Exporter, Mas_SalesGrp, Options, Mas_Dept, Mas_JobWrkComp, StockTable`; pipe through `joms-web/scripts/extract/06-mask.mjs` which replaces any column named like password/phone/email/gstin/tin with the literal `MASKED`; save one markdown table per master to `design/db-extract/samples/<table>.md`.
  7. Update `nextjs-lld/PROGRESS.md`: mark B1 and B2 closed in sec. 3, add a sec. 6 change-log line. Do not touch any other doc (analysis-only output).
- **Acceptance criteria:**
  - AC1: Given the live DB is reachable, When steps 2-6 run, Then `design/db-extract/procs/Sp_currentstock.md` exists and contains more than 50 lines of extracted SQL (B1 evidence).
  - AC2: Given `catalog/live-catalog.csv` and `LEGACY_SQL_DIR`, When `node scripts/extract/03-diff-catalog.mjs` runs, Then `design/db-extract/catalog/drift-report.md` exists and states a numeric count for only-in-db and only-on-disk sections.
  - AC3: Given `samples/Mas_User.md`, When opened, Then every password column cell reads exactly `MASKED` and no other column is altered.
  - AC4: Given `ddl/schema-snapshot.sql`, When searched for `CREATE` stubs of `Trs_Grn1` and `CurrentStock`, Then both tables appear with full column lists (input for S2/S3 WOs).
- **Test commands:**
  - `# export DB_HOST=... DB_USER=... DB_PASS=... (values from joms-web/.env.local)` then: `cd /c/Users/mahes/Documents/Projects/Fiber/Fiberpro/joms-web && sqlcmd -S "$DB_HOST" -d "$DB_NAME" -U "$DB_USER" -P "$DB_PASS" -i scripts/extract/01-currentstock.sql`
  - `node scripts/extract/03-diff-catalog.mjs && node scripts/extract/06-mask.mjs`
- **Out of scope:** any write to the live DB (connection is read-only), data migration, code changes beyond `scripts/extract/`.
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] B1 + B2 marked closed in PROGRESS.md sec. 3
  - [ ] Extract pack re-runnable from README instructions only
  - [ ] TASKS.md S0.2 box ticked + PROGRESS.md change-log line added

---

## WO-S0.3 — Migration tooling for new tables + repo layout doc (M, S0)
- **Objective:** Stand up an idempotent, transaction-per-file migration runner for NEW additive tables only, apply the first migrations (ReportJob/ReportJobRows, Track*, TrackLabelLog, AiActionLog, MasterAlias, EventOutbox staging comes in S2.2), and document the repo layout.
- **Refs:** 01 sec. 2 (layering), sec. 3.5 (ReportJob staging), sec. 5; 05 sec. 7; 08 sec. 2 (Track* tables); 09 sec. 6 (AiActionLog). Inlined rules (retired plan sec. 2 rule 1 / sec. 4 S0.3): migrations create NEW additive tables only and never touch legacy schema.
- **Owning docs:** 01, 08, 09
- **Preconditions:** WO-S0.1 done.
- **Implementation steps:**
  1. Create `joms-web/src/db/migrate.ts`: connect via `src/db/pool.ts`; `CREATE TABLE _joms_migrations (Id INT IDENTITY PRIMARY KEY, Name NVARCHAR(200) UNIQUE NOT NULL, AppliedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME())` if absent; apply each pending `migrations/*.sql` in filename order, one transaction per file, recording the name on success.
  2. Add guard in `src/db/migrate.ts`: before applying, scan each file's text; if it matches regex `/\b(DROP\s+TABLE|ALTER\s+TABLE|DROP\s+PROC|TRUNCATE)\b/i` against a legacy prefix (`Mas_|Trs_|ST_|WBS_|Pay_|Pro_|Prog_|CurrentStock|Options|Pcs_|Panel_`), exit code 1 with message `LEGACY_SCHEMA_TOUCHED:<file>` and apply nothing.
  3. Create `joms-web/migrations/0001_report_job.sql`: `ReportJob (JobId UNIQUEIDENTIFIER PRIMARY KEY, ReportId NVARCHAR(100) NOT NULL, ParamsJson NVARCHAR(MAX), Status NVARCHAR(20) NOT NULL, CreatedAt DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME(), ExpiresAt DATETIME2 NOT NULL)` and `ReportJobRows (JobId UNIQUEIDENTIFIER NOT NULL, Slno INT NOT NULL, ColsJson NVARCHAR(MAX) NOT NULL, PRIMARY KEY (JobId, Slno))`.
  4. Create `joms-web/migrations/0002_track_tables.sql`: minimal additive `TrackUnit (TrackId NVARCHAR(64) PRIMARY KEY, UnitType NVARCHAR(20), OrderRef NVARCHAR(50), OwnerRef NVARCHAR(100), Status NVARCHAR(30), LegacyRef NVARCHAR(100), UpdateFlg TINYINT NOT NULL DEFAULT 0)`, `TrackEdge`, `TrackEvent` (same spirit: surrogate Id INT IDENTITY PK, NVARCHAR ref columns, EventJson NVARCHAR(MAX), CreatedAt, UpdateFlg) — extended later by S7.1 without breaking these columns.
  5. Create `joms-web/migrations/0003_track_label_log.sql`, `0004_ai_action_log.sql`, `0005_master_alias.sql` in the same minimal additive spirit (NVARCHAR keys + payload JSON + CreatedAt; TrackLabelLog also gets VoidedBy/VoidedAt NULL).
  6. Add npm script `"migrate": "tsx src/db/migrate.ts"` (tsx installed in WO-S0.1).
  7. Create `joms-web/docs/REPO-LAYOUT.md`: one line per folder — `src/app` (routes only), `src/components/{ui,data,pickers,document,domain,reports,shell,guards}`, `src/services`, `src/db/{pool.ts,migrate.ts,repo/}`, `src/posting`, `src/projectors`, `src/events`, `src/lib`, `src/reports`, `migrations`, `tests` — plus the rule: writes only via services (01 sec. 2 golden rules).
- **Acceptance criteria:**
  - AC1: Given migration 0001-0005 unapplied, When `npm run migrate` runs, Then it exits 0 and `SELECT name FROM _joms_migrations` returns 5 rows.
  - AC2: Given all migrations applied, When `npm run migrate` runs again, Then it applies 0 files (output states `0 pending`) and exits 0.
  - AC3: Given a temp file `migrations/9999_bad.sql` containing `ALTER TABLE Mas_Party ADD x INT;`, When `npm run migrate` runs, Then it exits 1 with `LEGACY_SCHEMA_TOUCHED:9999_bad.sql` and no migration is applied (delete the temp file after the test).
  - AC4: Given migrations applied, When `npm run lint && npm run build` run, Then both exit 0.
- **Test commands:**
  - `cd /c/Users/mahes/Documents/Projects/Fiber/Fiberpro/joms-web && npm run migrate && npm run migrate`
  - `# export DB_HOST=... DB_USER=... DB_PASS=... (values from joms-web/.env.local)` then: `sqlcmd -S "$DB_HOST" -d "$DB_NAME" -U "$DB_USER" -P "$DB_PASS" -Q "SELECT name FROM _joms_migrations ORDER BY name"`
- **Out of scope:** column-perfect Track* schemas (S7.1 refines), any legacy table alteration, seeding data.
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] Legacy-guard test performed once and documented in the PR body
  - [ ] `docs/REPO-LAYOUT.md` committed
  - [ ] TASKS.md S0.3 box ticked + PROGRESS.md change-log line added

---

## WO-S0.4 — Sp_ProductionEntryQty vs _1 divergence note (S, S0)
- **Objective:** Extract and diff the plain `Sp_ProductionEntryQty` against `Sp_ProductionEntryQty_1` from the live DB and append the dated divergence note to 11 sec. 6 (closes blocker B6 ahead of S4.6).
- **Refs:** 11 sec. 6.2 (the exact open item); 03 sec. 4.2 (dispatcher parity rows); PROGRESS.md sec. 3 B6.
- **Owning docs:** 11, 03
- **Preconditions:** WO-S0.2 done (extract scripts + live DB access available).
- **Implementation steps:**
  1. Create `joms-web/scripts/extract/07-prodentry-diff.sql` with `EXEC sp_helptext 'Sp_ProductionEntryQty';` and `EXEC sp_helptext 'Sp_ProductionEntryQty_1';`; run via `sqlcmd` and save bodies to `nextjs-lld/design/db-extract/procs/Sp_ProductionEntryQty.md` and `.../Sp_ProductionEntryQty_1.md`.
  2. Read both bodies fully; list every behavioral difference: dispatcher branches, hardcoded flags (e.g. LineOut 'Y' in `_1`), Rework routing, Spl_Operation handling, update/delete proc variants selected.
  3. Append a subsection `### 6.2.1 Sp_ProductionEntryQty vs _1 (extracted YYYY-MM-DD)` under 11 sec. 6.2 with: the diff bullets, verbatim line quotes for each difference, and one verdict line stating which proc the S4.6 barcode path must mirror.
  4. Update `nextjs-lld/PROGRESS.md`: B6 closed in sec. 3; change-log line in sec. 6. No code changes.
- **Acceptance criteria:**
  - AC1: Given the live DB, When step 1 runs, Then both proc body files exist and are non-empty (each > 100 lines).
  - AC2: Given 11-PROC-VERIFICATION.md, When searched for `6.2.1`, Then the new subsection exists and names at least the LineOut-flag and rework-routing differences.
  - AC3: Given PROGRESS.md, When read, Then the B6 row is marked closed with a date.
  - AC4: Given the change, When `git diff --stat` is inspected, Then only `.md` files under `nextjs-lld/` and `joms-web/scripts/extract/` changed (doc-only task).
- **Test commands:**
  - `# export DB_HOST=... DB_USER=... DB_PASS=... (values from joms-web/.env.local)` then: `cd /c/Users/mahes/Documents/Projects/Fiber/Fiberpro/joms-web && sqlcmd -S "$DB_HOST" -d "$DB_NAME" -U "$DB_USER" -P "$DB_PASS" -i scripts/extract/07-prodentry-diff.sql`
  - `grep -n "6.2.1" /c/Users/mahes/Documents/Projects/Fiber/Fiberpro/nextjs-lld/11-PROC-VERIFICATION.md`
- **Out of scope:** implementing any production-entry logic (Stage 4), changing 03 sec. 4.2 (already correct at design level).
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] 11 sec. 6 updated in the same change (G4)
  - [ ] TASKS.md S0.4 box ticked + PROGRESS.md change-log line added

---

## WO-S1.1 — Auth flow (company -> finyear -> user) + session cookie ctx (M, S1)
- **Objective:** Implement the legacy three-step login against `Mas_User` with an HMAC-signed session cookie carrying the full SessionCtx, plus logout and change-password endpoints.
- **Refs:** 02 sec. 1 (`(auth)/login` tree with CompanyStep/FinYearStep/CredentialsStep); 04 sec. 1 (auth endpoints); 01 sec. 3.1 (SessionCtx), sec. 1 auth row (legacy flow preserved); 03 sec. 1 (none).
- **Owning docs:** 01, 02, 04
- **Preconditions:** WO-S0.1; WO-S0.2 (DDL snapshot available for `Mas_User`, company, finyear tables).
- **Implementation steps:**
  1. Create `joms-web/src/db/repo/auth.ts`: `listCompanies()` (from `Mas_Exporter`/Concern tables — confirm exact names in `design/db-extract/ddl/schema-snapshot.sql`), `listFinyears(coyCode)` (finyear rows per 02 sec. 1 FinYearStep), `findUser(coyCode, username)` on `Mas_User`; all parameterized.
  2. Create `joms-web/src/services/auth.service.ts`: `login(ctx-less {coyCode, finyear, username, password})` -> SessionCtx or throws `AppError('AUTH_INVALID')`; compare the password to the stored `Mas_User` password column directly; if the DDL/samples show an obfuscated format, implement the Base64 decode observed in samples and record the decision in PROGRESS.md sec. 5.
  3. Create `joms-web/src/lib/session.ts`: `signSession(ctx)` / `verifySession(token)` using `jose` HS256 with `SESSION_SECRET`; cookie name `joms_session`, httpOnly, sameSite=lax, 8h TTL; `getSession()` server helper reading `cookies()`.
  4. Create `joms-web/src/app/api/auth/login/route.ts`: POST with zod body `{coyCode, finyear, username, password}`; 200 `{ctx}` + Set-Cookie; 401 `{code:'AUTH_INVALID'}` on any failure; rate-limit not in scope.
  5. Create `joms-web/src/app/api/auth/logout/route.ts` (POST clears cookie) and `joms-web/src/app/api/auth/change-password/route.ts` (POST zod `{oldPassword, newPassword}`; verifies old, writes new to `Mas_User`; 400 `AUTH_WRONG_PASSWORD` on mismatch).
  6. Create `joms-web/src/app/(auth)/login/page.tsx` (client) and `joms-web/src/components/auth/{CompanyStep,FinYearStep,CredentialsStep,LoginForm}.tsx`: sequential steps fed by two GET endpoints added to `src/app/api/auth/[step]/route.ts`? No — add `src/app/api/auth/companies/route.ts` and `src/app/api/auth/finyears/route.ts` (GET only); on login success `router.push('/dashboard')`.
  7. Create `joms-web/src/middleware.ts`: redirect any `/((erp) paths)` request without a `joms_session` cookie to `/login` (presence check only; full verify happens in `(erp)/layout.tsx`).
  8. Create `joms-web/tests/auth.test.ts`: unit (session sign/verify round-trip, tampered token rejected) + integration (login with a seeded `Mas_User` test row returns 200 + cookie; wrong password 401; change-password flips the row then new password logs in).
- **Acceptance criteria:**
  - AC1: Given a seeded valid user, When `POST /api/auth/login` with correct credentials, Then HTTP 200, `Set-Cookie` includes `joms_session`, and decoding the cookie yields `{userId, coyCode, finyear}`.
  - AC2: Given a wrong password, When POST login, Then HTTP 401 with body `{code:'AUTH_INVALID'}` and no cookie set.
  - AC3: Given no session cookie, When GET `/dashboard`, Then HTTP 307 redirect to `/login`.
  - AC4: Given `POST /api/auth/change-password` with correct old password, Then the `Mas_User` row's password column changed (SELECT confirms) and the next login with the new password returns 200.
- **Test commands:**
  - `cd /c/Users/mahes/Documents/Projects/Fiber/Fiberpro/joms-web && npm test -- tests/auth.test.ts`
  - `curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/api/auth/login -H "Content-Type: application/json" -c cookies.txt -d '{"coyCode":1,"finyear":2026,"username":"test","password":"x"}'` (expects 401 without seed / 200 with seed)
  - First use: run login first; reuse cookies.txt for all -b curls.
- **Out of scope:** rights/menu (WO-S1.2), flags (WO-S1.3), password complexity policy not present in legacy, mobile login.
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] `npm run lint` and `npm run build` pass
  - [ ] Any deviation from docs (e.g. password obfuscation) recorded in PROGRESS.md sec. 5 and owning doc updated (G4)
  - [ ] TASKS.md S1.1 box ticked + PROGRESS.md change-log line added

---

## WO-S1.2 — Rights service, menu tree, `<Can>` guard (M, S1)
- **Objective:** Port the menu-rights model into a RightsService that builds the per-user menu tree and answers `module.screen.action` checks, with a client `<Can>` guard and server-side `requireCan`.
- **Refs:** 01 sec. 3.2 (rights, button-level rights); 04 sec. 1 (`GET /api/me/menu`); 02 sec. 1 (SidebarNav from rights); 06 (rights matrix per screen).
- **Owning docs:** 01, 04, 06
- **Preconditions:** WO-S1.1 done.
- **Implementation steps:**
  1. Create `joms-web/src/db/repo/rights.ts`: read the rights tables behind `FrmMenuRights`, `FrmMenuAccRights`, `FrmCompanyRights` plus `Mas_User`/`UserGroupMas` — resolve exact table/column names from `design/db-extract/ddl/schema-snapshot.sql` before writing SQL; expose `getMenuRights(groupId, coyCode)` and `getActionRights(groupId)`.
  2. Create `joms-web/src/services/rights.service.ts`: `menuTree(ctx)` -> `{id, label, route, children[]}[]` filtered by the user's group rights; `can(ctx, action)` -> boolean against the `rights.action` map keyed `module.screen.action` (01 sec. 3.2).
  3. Create `joms-web/src/app/api/me/menu/route.ts`: GET returns 200 with the tree; 401 without session.
  4. Create `joms-web/src/lib/rights-context.tsx` (client `RightsProvider` loading action rights once per session) and `joms-web/src/components/guards/Can.tsx`: `<Can do="x.y.z" fallback?>children</Can>`.
  5. Create `joms-web/src/lib/guard.ts`: server `requireCan(ctx, action)` throwing `AppError('FORBIDDEN', 403)` — the authoritative check used by every controller (01 sec. 3.2).
  6. Create `joms-web/src/components/shell/SidebarNav.tsx` rendering the menu tree (collapsible groups) — used by WO-S1.8's ERPShell.
  7. Create `joms-web/tests/rights.test.ts`: seeded group with partial rights -> tree excludes unauthorized branches and includes authorized ones; `can()` true/false per action; a temporary test route `src/app/api/__guardprobe/route.ts` calling `requireCan` returns 403 for a read-only user, 200 for an admin user (delete this probe route before merging, or gate it behind `NODE_ENV==='test'`).
- **Acceptance criteria:**
  - AC1: Given a session, When `GET /api/me/menu`, Then 200 JSON whose route set exactly matches the seeded group's allowed routes (fixture compare).
  - AC2: Given a user without `test.probe.run`, When calling the guard-probe endpoint, Then 403 `{code:'FORBIDDEN'}`; with the right, 200.
  - AC3: Given `<Can do="a.b.c">`, When rendered by a user with vs without the action, Then children render vs fallback renders (component test).
  - AC4: Given no session, When `GET /api/me/menu`, Then 401.
- **Test commands:**
  - `cd /c/Users/mahes/Documents/Projects/Fiber/Fiberpro/joms-web && npm test -- tests/rights.test.ts`
  - `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/api/me/menu` (expects 401 pre-login)
- **Out of scope:** rights editor UI (admin screen, later stage), approval routing (05 sec. 4), mobile menus.
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] G5 pattern established: probe route proves server-side rights gate
  - [ ] `npm run lint` and `npm run build` pass
  - [ ] TASKS.md S1.2 box ticked + PROGRESS.md change-log line added

---

## WO-S1.3 — `/api/config` + FlagsProvider + typed flags registry + `/admin/flags` (S, S1)
- **Objective:** Serve all 189 legacy flags plus Part-3 additions from the `Options` table through `GET /api/config`, expose them app-wide via FlagsProvider/FlagGate, and provide the rights-gated `/admin/flags` editor.
- **Refs:** 07 Part 2 (all 189 names) and Part 3 (additions, default OFF); 01 sec. 3.3 (gating patterns); 04 sec. 1 (`GET /api/config`, `PATCH /api/admin/flags`); 02 sec. 19 (`admin/flags` page).
- **Owning docs:** 07, 04, 02
- **Preconditions:** WO-S0.1; WO-S1.1 (auth); WO-S1.2 (rights gate for the editor).
- **Implementation steps:**
  1. Create `joms-web/src/lib/flags.ts`: `export const FLAG_NAMES = [...]` transcribing every flag name from 07 Part 2 tables plus Part 3 (`qr_*`, `ai_*`); assert length >= 189 + 21 additions; `export type FlagName = typeof FLAG_NAMES[number]`; `export type Flags = Partial<Record<FlagName, string>>` (values as stored strings; numbers parsed by consumers); `parseOptions(rows)` -> Flags.
  2. Create `joms-web/src/services/config.service.ts`: `getFlags(ctx)` reads the `Options` table rows for the session company; `setFlag(ctx, name, value)` validates `FLAG_NAMES.includes(name)`, else throws `AppError('FLAG_UNKNOWN', 400)`; writes/updates the row.
  3. Create `joms-web/src/app/api/config/route.ts`: GET -> 200 Flags JSON (cache-control no-store; no secrets).
  4. Create `joms-web/src/app/api/admin/flags/route.ts`: PATCH zod `{name, value}`; `requireCan(ctx, 'admin.flags.edit')`; 200 returns the updated Flags; 403/400 paths per contract.
  5. Create `joms-web/src/components/providers/FlagsProvider.tsx` (client context + `useFlags()`) and `joms-web/src/components/guards/FlagGate.tsx` (02 sec. 21 guards row); mount FlagsProvider in `src/app/layout.tsx` (02 sec. 1).
  6. Create `joms-web/src/app/(erp)/admin/flags/page.tsx`: server page (session-guarded via `(erp)/layout.tsx`) listing every flag with name, current value, and the effect text copied from 07 Part 2/3; inline edit -> PATCH; rights-gated with `<Can do="admin.flags.edit">` around the edit control.
  7. Create `joms-web/tests/flags.test.ts`: FLAG_NAMES length check; GET returns >= 189 keys including `po_buddev` and `need_rate_conf_for_dc`; PATCH unknown -> 400; PATCH with rights flips the Options row (SELECT verify); PATCH without rights -> 403.
- **Acceptance criteria:**
  - AC1: Given a session, When `GET /api/config`, Then 200 and the JSON contains at least 189 flag keys including exactly `po_buddev` and `need_rate_conf_for_dc`.
  - AC2: Given an admin session, When `PATCH /api/admin/flags` with `{"name":"po_buddev","value":"15.00"}`, Then 200 and the `Options` row for `po_buddev` now holds `15.00` (SELECT confirms).
  - AC3: Given PATCH with `{"name":"not_a_flag","value":"1"}`, Then 400 `{code:'FLAG_UNKNOWN'}`.
  - AC4: Given PATCH without `admin.flags.edit`, Then 403 `{code:'FORBIDDEN'}`.
- **Test commands:**
  - `cd /c/Users/mahes/Documents/Projects/Fiber/Fiberpro/joms-web && npm test -- tests/flags.test.ts`
  - `curl -s http://localhost:3000/api/config | grep -c '"' ` and `curl -s http://localhost:3000/api/config | grep -o 'po_buddev'`
- **Out of scope:** per-flag UI behavior wiring (each module WO does its own), effect-preview automation, flag history/audit table.
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] G5: editor rights-gated, Part-3 flags default OFF honored in registry defaults
  - [ ] `npm run lint` and `npm run build` pass
  - [ ] TASKS.md S1.3 box ticked + PROGRESS.md change-log line added

---

## WO-S1.4 — UI kit: ui primitives, DataTable, LineGrid, TreeGrid (M, S1)
- **Objective:** Build the shared FlexGrid-parity component stack — ui primitives plus DataTable, LineGrid, TreeGrid — with a demo page proving the S1 exit criterion.
- **Refs:** 02 sec. 21 (`components/ui/`, `components/data/` rows); 02 sec. 22 (state wiring per screen class); 02 header legend (file preamble) for the composition pattern.
- **Owning docs:** 02
- **Preconditions:** WO-S0.1 done.
- **Implementation steps:**
  1. Create `joms-web/src/components/ui/Button.tsx`, `Input.tsx`, `Select.tsx`, `DatePicker.tsx` (props `min`/`max` for finyear-aware bounds), `Modal.tsx`, `Tabs.tsx`, `Toast.tsx` (ToastProvider + `useToast()`), `Skeleton.tsx`.
  2. Create `joms-web/src/components/data/DataTable.tsx`: props `{columns: {key,label,align?,format?}[], rows, groupBy?, frozenCols?, footer?: Record<string,number>}`; header-click sort (asc/desc toggle), group headers with collapse, footer totals row, arrow-key active-cell navigation; pure client component over supplied rows.
  3. Create `joms-web/src/components/data/LineGrid.tsx`: editable document lines; `Insert` key appends an empty row, `Delete` removes the focused row, `Ctrl+D` duplicates it, clipboard TSV paste inserts rows; computed columns via `computed: {key: (row) => number}` recalculating on edit; `onChange(lines)` callback; column metadata reuses DataTable's column type.
  4. Create `joms-web/src/components/data/TreeGrid.tsx`: rows `{id, label, cells: Record<string,string|number>, rag?: 'G'|'A'|'R', children?}`; expand/collapse per node; RAG cells tinted green/amber/red.
  5. Create `joms-web/src/app/(erp)/dev/kit/page.tsx`: server page under the `(erp)` session guard rendering every primitive and grid with fixture data (10-row table, 3-line grid with computed amount = qty x rate, 2-level tree with RAG) — this is the S1 exit demo artifact.
  6. Create `joms-web/tests/ui-datatable.test.ts` and `joms-web/tests/ui-linegrid.test.ts` with `@testing-library/react` (`npm i -D @testing-library/react @testing-library/user-event jsdom` and set environment jsdom for these files in `vitest.config.ts`).
- **Acceptance criteria:**
  - AC1: Given unsorted DataTable rows, When the `qty` header is clicked, Then the rendered order is ascending by qty and the footer total is unchanged (DOM assert).
  - AC2: Given a LineGrid with computed `amount = qty * rate`, When `qty` is edited and `Insert` pressed, Then the amount cell recalculates for the edited row and a new empty row appears (rows length +1).
  - AC3: Given a TreeGrid with a parent + 3 children, When the parent toggles collapse, Then visible row count drops by 3.
  - AC4: Given `/dev/kit` with a valid session, When fetched, Then HTTP 200 and the HTML contains all three grid components' testids (`data-testid="datatable"`, `"linegrid"`, `"treegrid"`).
- **Test commands:**
  - `cd /c/Users/mahes/Documents/Projects/Fiber/Fiberpro/joms-web && npm test -- tests/ui-datatable.test.ts tests/ui-linegrid.test.ts`
  - `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/dev/kit` (307 pre-login, 200 post-login)
- **Out of scope:** server pagination, Excel export (reports module), pickers (WO-S1.5), document primitives (WO-S1.6).
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] Demo page `/dev/kit` renders without React warnings/errors
  - [ ] `npm run lint` and `npm run build` pass
  - [ ] TASKS.md S1.4 box ticked + PROGRESS.md change-log line added

---

## WO-S1.5 — Pickers pack (13 kinds) + picker API (M, S1)
- **Objective:** Implement the 13 shared pickers from 02 sec. 21 over one parameterized, session-scoped picker API.
- **Refs:** 02 sec. 21 (`components/pickers/` row — the 13 names); 04 sec. 5-sec. 7 (picker endpoints pattern); 02 sec. 7 (StockPicker union rule); 02 sec. 22 (picker ctx in draft state).
- **Owning docs:** 02, 04
- **Preconditions:** WO-S1.4 (primitives); WO-S1.1 (auth on API).
- **Implementation steps:**
  1. Create `joms-web/src/services/picker.service.ts`: a registry `{ [kind]: { labelCols, sqlBuilder(ctx, q, extra) } }` for kinds: `order, style, party, stock, lot, roll, stage, line, godown, acc, shade, mill, count`; each query is parameterized (`@Q LIKE`, `@Coy`, `@Finyear`), `SELECT TOP (20)`, returns `{id, label, extra?}` rows; `stock` kind implements the union `CurrentStock > 0 UNION existing DC lines` (02 sec. 7 StockPicker rule); unknown kind throws `AppError('PICKER_UNKNOWN', 400)`.
  2. Create `joms-web/src/app/api/pickers/[kind]/route.ts`: GET with `?q=&deptId=&ordId=`; session required (401); 200 rows or 400 unknown kind. (The dedicated `/api/dc/stock-picker` in 04 sec. 6 will alias this in WO-S3.1.)
  3. Create `joms-web/src/components/pickers/PickerField.tsx`: shared combobox — debounce 200 ms, keyboard up/down + enter select, clear button, emits `{id,label}`; wraps ui `Input`.
  4. Create the 13 wrappers in `joms-web/src/components/pickers/`: `OrderPicker.tsx, StylePicker.tsx, PartyPicker.tsx` (extra `deptId` prop), `StockPicker.tsx` (extra `ordId` prop), `LotPicker.tsx, RollPicker.tsx, StagePicker.tsx, LinePicker.tsx, GodownPicker.tsx, AccPicker.tsx, ShadePicker.tsx, MillPicker.tsx, CountPicker.tsx` — each a thin config over PickerField.
  5. Create `joms-web/tests/pickers.test.ts`: integration — seeded `Mas_Party` rows, `GET /api/pickers/party?q=<seed>` returns matching rows only; `GET /api/pickers/nope` -> 400; no session -> 401; `stock` kind union test — seed one CurrentStock>0 row and one DC line for the same order, expect both ids in the result.
- **Acceptance criteria:**
  - AC1: Given a session and seeded parties, When `GET /api/pickers/party?q=<seed-prefix>`, Then 200 with <= 20 rows each having `id` and `label`.
  - AC2: Given `GET /api/pickers/nope`, Then 400 `{code:'PICKER_UNKNOWN'}`.
  - AC3: Given no cookie, When any picker GET, Then 401.
  - AC4: Given seeded CurrentStock and DC-line rows for order X, When `GET /api/pickers/stock?ordId=X`, Then the response contains both the stock row id and the DC line row id (union proven).
- **Test commands:**
  - `cd /c/Users/mahes/Documents/Projects/Fiber/Fiberpro/joms-web && npm test -- tests/pickers.test.ts`
  - `curl -s "http://localhost:3000/api/pickers/godown?q=" -b cookies.txt`
- **Out of scope:** barcode scan resolution (S4/S7), report filter panels, cross-ledger pickers not in the 13 list.
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] All 13 picker files exist and are exported from `src/components/pickers/index.ts`
  - [ ] `npm run lint` and `npm run build` pass
  - [ ] TASKS.md S1.5 box ticked + PROGRESS.md change-log line added

---

## WO-S1.6 — Document primitives + NumberingService (M, S1)
- **Objective:** Deliver the document-entry primitives (DocumentShell, DocumentNumberBox, PostingPreview, ReversalButton, ToleranceBanner) and the finyear-scoped NumberingService with peek/take and manual-override flag support.
- **Refs:** 02 sec. 21 (`components/document/` row); 03 sec. 7 (numbering and identity, getLotNo note); 01 sec. 3.4 (NumberingService contract); 04 sec. 14 (service template that consumes numbering).
- **Owning docs:** 03, 04, 02
- **Preconditions:** WO-S1.4 (primitives); WO-S1.1 (DB); WO-S1.3 (flags for manual-mode flags).
- **Implementation steps:**
  1. Create `joms-web/src/posting/types.ts`: `StockKey, ItemIdent, Movement, MovementSet, PostingResult` copied verbatim from 03 sec. 2 (the engine arrives in WO-S2.1 and must consume these).
  2. Create `joms-web/src/services/numbering.ts`: `peek(prefixKey, ctx)` returns the next number without consuming; `take(prefixKey, ctx)` consumes and returns it; prefixes read from `Mas_SalesGrp` columns (confirm names in `design/db-extract/ddl/schema-snapshot.sql`; record mismatch in PROGRESS sec. 5); sequences are finyear-scoped; legacy `Max(ID)+1` compat is used inside the caller's transaction (03 sec. 7); when flag `manual_dc_no_option_reqd` (or the doc-specific flags `sameordno|samepdcno|newdespatchno|ocngen|ionogen`) allows manual numbers, `take` accepts and records the supplied value instead.
  3. Create `joms-web/src/app/api/numbering/route.ts`: GET `?prefixKey=&manual=` (peek), POST `{prefixKey, manual?}` (take); session required.
  4. Create `joms-web/src/components/document/DocumentShell.tsx`: `{title, docNo, status, children, actions?}` header bar with status chip and a print placeholder slot.
  5. Create `joms-web/src/components/document/DocumentNumberBox.tsx`: input wired to the numbering API; manual entry enabled only when the passed `manualAllowed` (flag-derived) is true; shows peeked next number when auto.
  6. Create `joms-web/src/components/document/PostingPreview.tsx`: table of a `MovementSet` (ledger, key summary, qty, sign rendered as +/-) plus a warnings list (negative 'G' bucket warning per 03 sec. 3); create `src/components/document/ReversalButton.tsx` (props `{onReverse}`, confirm modal, wired by document pages) and `src/components/document/ToleranceBanner.tsx` (props `{flagName, value, limit, policy: 'warn'|'block'}` — styles and message per 02 sec. 21 domain row).
  7. Create `joms-web/tests/numbering.test.ts`: two `take('DC', ctx)` calls return consecutive numbers and write both rows; `peek` returns the next value without consuming (subsequent take equals it); manual flag path accepts a supplied number verbatim.
- **Acceptance criteria:**
  - AC1: Given an empty sequence, When `POST /api/numbering {prefixKey:"DC"}` twice, Then two distinct sequential numbers are returned and both are persisted for the finyear.
  - AC2: Given `peek` returned N, When `take` is then called, Then it returns exactly N (peek did not consume).
  - AC3: Given `manual_dc_no_option_reqd` enabled, When a manual number is supplied to `take`, Then the returned number equals the supplied one.
  - AC4: Given a fixture MovementSet with one + and one - movement, When PostingPreview renders, Then two rows appear and the negative one displays `-` (component test).
- **Test commands:**
  - `cd /c/Users/mahes/Documents/Projects/Fiber/Fiberpro/joms-web && npm test -- tests/numbering.test.ts`
  - `curl -s -X POST http://localhost:3000/api/numbering -H "Content-Type: application/json" -b cookies.txt -d '{"prefixKey":"DC"}'`
- **Out of scope:** the PostingEngine itself (WO-S2.1), lot numbering `getLotNo` (WO-S3.8), any document service.
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] `src/posting/types.ts` matches 03 sec. 2 field-for-field (reviewer check)
  - [ ] `npm run lint` and `npm run build` pass
  - [ ] TASKS.md S1.6 box ticked + PROGRESS.md change-log line added

---

## WO-S1.7 — Error contract + legacy message constants (S, S1)
- **Objective:** Establish the single error contract `{code, message, fields?}` with verbatim legacy message strings and a route-handler wrapper that maps every thrown error to it.
- **Refs:** 01 sec. 3.6 (error contract + verbatim examples); 04 header line ("Errors carry legacy message strings"); 05 sec. 8 (failure rules); 03 sec. 6 (tolerance messages used by services).
- **Owning docs:** 01, 04, 03
- **Preconditions:** WO-S0.1 done.
- **Implementation steps:**
  1. Create `joms-web/src/lib/errors.ts`: `class AppError extends Error { constructor(code, status, message, fields?) }` with a `STATUS` map: `AUTH_INVALID 401, FORBIDDEN 403, NOT_FOUND 404, CONFLICT/ALREADY_REVERSED/RateConfirm 409, *_DEV/VALIDATION/FLAG_UNKNOWN/PICKER_UNKNOWN 400, INTERNAL 500`; export `toResponse(err)` -> `{status, body:{code, message, fields?}}`; unknown errors -> 500 `{code:'INTERNAL'}` with structured server log, no stack in the body.
  2. Create `joms-web/src/lib/messages.ts`: `export const MESSAGES = { INVALID_TAG: 'INVALID TAG', ALREADY_ISSUED_TO_LINE: 'ALREADY ISSUED TO LINE', BUNDLE_COMPLETED: 'BUNDLE COMPLETED', FINAL_PROCESS_PRODUCTION_MADE: 'FINAL PROCESS PRODUCTION MADE', PO_BUDGET_DEV: 'PO qty deviates from budget by {pct}%', PO_RATE_DEV: 'PO rate deviates from budget rate by {pct}%', GRN_BAL_DEV: 'GRN qty deviates by {pct}%', RATE_CONFIRM_REQUIRED: 'Rate confirmation required' } as const;` — legacy-visible strings must stay byte-identical; `{pct}` placeholders are interpolated at throw time.
  3. Create `joms-web/src/lib/http.ts`: `jsonOk(data, status=200)`, and `withErrors(handler)` higher-order wrapper for route handlers that catches, calls `toResponse`, and returns the JSON response.
  4. Create `joms-web/tests/errors.test.ts`: `toResponse(new AppError('INVALID_TAG', 400, MESSAGES.INVALID_TAG))` -> status 400, body message exactly `INVALID TAG`; `toResponse(new Error('boom'))` -> 500, body `{code:'INTERNAL'}` with no `boom` string; zod validation error mapped to 400 with `fields` present.
- **Acceptance criteria:**
  - AC1: Given an AppError with code `INVALID_TAG`, When `toResponse` runs, Then status 400 and `body.message === 'INVALID TAG'` (exact byte compare in the test).
  - AC2: Given an arbitrary thrown Error, When routed through `withErrors`, Then the client gets 500 `{code:'INTERNAL'}` and the message text is absent from the body.
  - AC3: Given a zod failure, When mapped, Then 400 with `fields` array naming the offending keys.
  - AC4: Given `npm run lint && npm run build`, Then both pass and `MESSAGES` exports exactly the 9 constants above.
- **Test commands:**
  - `cd /c/Users/mahes/Documents/Projects/Fiber/Fiberpro/joms-web && npm test -- tests/errors.test.ts`
- **Out of scope:** localization, error-code registry UI, notification dispatch (05 sec. 5).
- **DoD checklist:**
  - [ ] AC1-AC4 verified
  - [ ] Verbatim strings asserted byte-equal in tests
  - [ ] `npm run lint` and `npm run build` pass
  - [ ] TASKS.md S1.7 box ticked + PROGRESS.md change-log line added

---

## WO-S1.8 — ERPShell + MobileShell + SSE events skeleton (M, S1)
- **Objective:** Assemble the ERP shell (session guard, rights-driven sidebar, context topbar) and mobile shell with bottom tabs, plus the `/api/events/stream` SSE endpoint skeleton on an in-process EventBus.
- **Refs:** 02 sec. 1 (root tree: `(erp)/layout.tsx`, ERPShell, SidebarNav, TopbarContext, NotificationBell, ApprovalBadge; `(mobile)/layout.tsx`); 02 sec. 20 (mobile tab structure); 04 sec. 11 (`GET /api/events/stream`); 05 sec. 1 (event envelope).
- **Owning docs:** 02, 04, 05
- **Preconditions:** WO-S1.1, WO-S1.2, WO-S1.4 done.
- **Implementation steps:**
  1. Create `joms-web/src/app/(erp)/layout.tsx` (server): `getSession()` -> redirect `/login` when absent; fetch menu via RightsService; render `ERPShell` with ctx + menu.
  2. Create `joms-web/src/components/shell/ERPShell.tsx` (client): layout grid with `SidebarNav` (from WO-S1.2), `TopbarContext.tsx` (company, finyear, user label, godown/line Selects, search input), `NotificationBell.tsx` (EventSource subscriber + count badge), `ApprovalBadge.tsx` (static 0 count placeholder until approvals land).
  3. Create `joms-web/src/app/(mobile)/layout.tsx` + `src/components/shell/MobileShell.tsx` + `src/components/shell/TabBar.tsx` with tabs Dashboard | Scan | Orders | Approvals | More (02 sec. 20); stub pages `src/app/(mobile)/m/{dashboard,scan,orders,approvals,more}/page.tsx` each rendering a heading placeholder.
  4. Create `joms-web/src/events/bus.ts`: in-process `EventBus` with `publish(evt)` and `subscribe(typeFilter?, cb) -> unsubscribe`; event envelope `{id, type, tenant, payload, occurredAt}` (05 sec. 1).
  5. Create `joms-web/src/app/api/events/stream/route.ts`: GET returns a `text/event-stream` Response; writes `retry: 3000` once, a heartbeat comment line every 25 s, forwards EventBus events as `data: <json>` frames; on `request.signal` abort it unsubscribes (no listener leak).
  6. Wire `NotificationBell` to `new EventSource('/api/events/stream')`; increment badge on any event; ignore heartbeat.
  7. Create `joms-web/tests/events.test.ts`: unit — publish/subscribe delivery + unsubscribe removes the listener (subscriber count 0); integration — invoking the stream route handler directly and publishing one event yields one `data:` frame; with fake timers the heartbeat fires within 25 s.
- **Acceptance criteria:**
  - AC1: Given a session, When GET `/api/events/stream`, Then 200 with `content-type: text/event-stream` and a heartbeat line arrives within 30 s (test with fake or short real timer).
  - AC2: Given one `publish({type:'grn.created',...})`, Then a subscribed callback receives the payload exactly once, and after unsubscribe a second publish delivers zero calls.
  - AC3: Given a session, When GET `/dashboard` (or any `(erp)` route), Then the HTML contains the ERPShell testid `data-testid="erpshell"` and sidebar links from the seeded menu.
  - AC4: Given `/m/dashboard`, Then 200 and the HTML contains the 5 tab labels of TabBar.
  - AC5: Given an aborted stream request, When the abort fires, Then the Bus listener count returns to its pre-connect value (leak-free).
- **Test commands:**
  - `cd /c/Users/mahes/Documents/Projects/Fiber/Fiberpro/joms-web && npm test -- tests/events.test.ts`
  - `curl -s -N --max-time 30 http://localhost:3000/api/events/stream -b cookies.txt`
- **Out of scope:** real event producers (S2.2 outbox), approval counts, mobile offline queue (S4.7), notification dispatch.
- **DoD checklist:**
  - [ ] AC1-AC5 verified
  - [ ] S1 stage exit demonstrable: login -> rights menu renders -> flags API -> `/dev/kit` demo
  - [ ] `npm run lint` and `npm run build` pass
  - [ ] TASKS.md S1.8 box ticked + PROGRESS.md change-log line added

---

End of file — 12 work orders (WO-S0.1..S0.4, WO-S1.1..S1.8).
