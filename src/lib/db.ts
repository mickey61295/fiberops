import { PrismaClient } from '@prisma/client'

// IMPORTANT: In dev mode, we MUST always create a fresh PrismaClient instance
// to pick up schema changes. Otherwise the cached client from the previous
// schema version keeps using the old field definitions and throws
// "Unknown field" errors after a schema update.
const globalForPrisma = globalThis as unknown as {
  __prismaInstance?: PrismaClient
}

function createPrismaClient() {
  return new PrismaClient({
    log: ['error', 'warn'],
  })
}

// OPS-02 (Phase-6B Batch 1) — WAL journal mode, enforced once per process at
// first client creation. journal_mode is a PERSISTENT database-level setting
// (stored in the file header), so after the first boot every later connection
// — including the VACUUM INTO backup snapshots — runs under WAL: readers never
// block the writer and the post-disk-full rollback-journal corruption class
// (journal_mode was 'delete' on live custom.db, verified 2026-08-31) is
// eliminated. Pinned by tests/pipeline/ops-batch1.test.ts. Best-effort: a
// missing/locked DB file must not crash boot (first `prisma db push` creates it).
const globalForWal = globalThis as unknown as { __sqliteWalReady?: boolean }
function ensureWal(client: PrismaClient) {
  if (globalForWal.__sqliteWalReady) return
  globalForWal.__sqliteWalReady = true
  client
    .$queryRawUnsafe('PRAGMA journal_mode=WAL')
    .then((mode) => {
      const m = Array.isArray(mode) ? mode[0] : mode
      if (!m || (m as { journal_mode?: string }).journal_mode !== 'wal') {
        console.warn('[db] journal_mode WAL not confirmed:', m)
      }
    })
    .catch((e) => console.warn('[db] WAL pragma failed (first boot? file missing?):', e instanceof Error ? e.message : e))
}

// In production, cache the instance to avoid connection exhaustion.
// In dev, always create a fresh client — Turbopack HMR will dispose the old one.
function makeClient() {
  const client = createPrismaClient()
  ensureWal(client)
  return client
}

export const db =
  process.env.NODE_ENV === 'production'
    ? (globalForPrisma.__prismaInstance ??= makeClient())
    : makeClient()
