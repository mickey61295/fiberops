/**
 * HFX-13 (Phase-6B Batch 0) — vitest globalSetup: build the disposable test
 * database ONCE per run, exactly the SPEC-M12 e2e copy-then-boot contract:
 * rm any stale test.db (+ sqlite sidecars) then cp custom.db → test.db.
 *
 * The copy is the isolation contract: the test suite keeps its current
 * semantics (it always ran against this data + schema) but every mutation
 * now lands on the disposable copy. `npm test` never opens custom.db through
 * a Prisma connection (pinned by tests/unit/hfx-db-pin.test.ts).
 *
 * NOTE: this runs in a SEPARATE process before workers spawn — the env pin
 * for the workers is tests/setup/pin-test-db.ts (setupFiles).
 */
import { rmSync, copyFileSync, existsSync } from 'node:fs'

const SRC = '/home/z/my-project/db/custom.db'
const DST = '/home/z/my-project/db/test.db'

export default function globalSetup() {
  for (const f of [DST, `${DST}-journal`, `${DST}-wal`, `${DST}-shm`]) {
    rmSync(f, { force: true })
  }
  copyFileSync(SRC, DST)
  // PITFALLS #47 (SPEC-M45 session): the live db runs journal_mode=WAL
  // (OPS-02) — a schema push or backfill can leave its pages in
  // custom.db-wal with a STALE main file. A main-only copy then ships a test
  // db MISSING columns ("partyId does not exist"). Copy the -wal sidecar too
  // when present (never -shm: SQLite rebuilds it; the pair main+wal is
  // self-consistent because both come from the same instant and no writer
  // runs during vitest startup).
  const wal = `${SRC}-wal`
  if (existsSync(wal)) copyFileSync(wal, `${DST}-wal`)
}
