/**
 * SPEC-M12 C2 — the E2E harness.
 *
 * - webServer: a DEDICATED dev server on :3100 with DATABASE_URL pinned to
 *   the disposable copy db/e2e.db. The boot command performs the copy itself
 *   (the server's first DB query must never race the copy — Playwright
 *   starts the webServer BEFORE globalSetup). reuseExistingServer:false —
 *   the system server on :3000 serves custom.db and must never be reused.
 * - workers:1 + fullyParallel:false — sequential specs (deterministic order,
 *   one Chromium, RAM headroom on the 3.9 GB box per PITFALLS #34).
 * - The webServer process lives INSIDE this invocation → the platform's
 *   orphan-reaping between tool calls cannot kill it mid-suite.
 */
import { defineConfig } from '@playwright/test'

const PORT = 3100
const E2E_DB = 'file:/home/z/my-project/db/e2e.db'
const DEV_DB = 'file:/home/z/my-project/db/custom.db'
const DB_FILE = '/home/z/my-project/db/e2e.db'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 120_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: 0, // agent specs opt into 1 retry locally (SPEC-M12 C5)
  reporter: [['list']],
  outputDir: './tests/e2e/.results',
  globalSetup: './scripts/e2e_global_setup.ts',
  globalTeardown: './scripts/e2e_global_teardown.ts',
  use: {
    baseURL: `http://localhost:${PORT}`,
    navigationTimeout: 120_000, // next dev compiles routes on demand
    actionTimeout: 30_000,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
  webServer: {
    // copy-then-boot: the fresh copy IS the isolation contract (SPEC-M12 C1)
    command: `rm -f ${DB_FILE} ${DB_FILE}-journal ${DB_FILE}-wal ${DB_FILE}-shm && cp /home/z/my-project/db/custom.db ${DB_FILE} && npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/login`,
    timeout: 240_000,
    reuseExistingServer: false,
    ignoreHTTPSErrors: false,
    env: { ...process.env, DATABASE_URL: E2E_DB, DEV_DB_NOTE: 'e2e-copy' },
    stdout: 'pipe',
    stderr: 'pipe',
  },
})
