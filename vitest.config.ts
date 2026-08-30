import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    testTimeout: 60000,
    hookTimeout: 60000,
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
    // HFX-13 (Phase-6B Batch 0) — the test run NEVER touches the production
    // custom.db: globalSetup copies it to db/test.db once per run (the e2e
    // copy-then-boot precedent), setupFiles pin DATABASE_URL to the copy in
    // every worker BEFORE any module imports @/lib/db. Pinned by
    // tests/unit/hfx-db-pin.test.ts (PRAGMA database_list).
    globalSetup: ['./tests/setup/global-setup.ts'],
    setupFiles: ['./tests/setup/pin-test-db.ts'],
  },
})
