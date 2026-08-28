/**
 * SPEC-M12 C1 — E2E teardown: delete the disposable database copy + the
 * state file. The dev DB (db/custom.db) was never opened by the suite —
 * nothing else to clean.
 */
import { rmSync } from 'node:fs'
import { resolve } from 'node:path'

const DB_PATH = '/home/z/my-project/db/e2e.db'
const STATE_PATH = resolve(process.cwd(), 'tests/e2e/.e2e-state.json')

export default async function globalTeardown() {
  rmSync(DB_PATH, { force: true })
  rmSync(`${DB_PATH}-journal`, { force: true })
  rmSync(`${DB_PATH}-wal`, { force: true })
  rmSync(`${DB_PATH}-shm`, { force: true })
  rmSync(STATE_PATH, { force: true })
  console.log('[e2e-teardown] OK — e2e.db + state file removed')
}
