/**
 * HFX-13 (Phase-6B Batch 0) — vitest setupFiles: pin the test run to
 * db/test.db, NEVER the production custom.db.
 *
 * Vitest loads .env into process.env BEFORE setupFiles run (verified: the old
 * run inherited DATABASE_URL=file:/home/z/my-project/db/custom.db — 1112
 * tests mutating the LIVE database). This file runs before each test module
 * imports anything, so the override lands before the first PrismaClient in
 * @/lib/db captures the env. The fresh copy itself happens ONCE per run in
 * tests/setup/global-setup.ts (the SPEC-M12 e2e copy-then-boot precedent).
 *
 * Acceptance (pinned by tests/unit/hfx-db-pin.test.ts): a PRAGMA
 * database_list assertion proves the connection's main file is test.db and
 * never custom.db.
 */

const TEST_DB_FILE = '/home/z/my-project/db/test.db'

process.env.DATABASE_URL = `file:${TEST_DB_FILE}`
