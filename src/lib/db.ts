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

// In production, cache the instance to avoid connection exhaustion.
// In dev, always create a fresh client — Turbopack HMR will dispose the old one.
export const db =
  process.env.NODE_ENV === 'production'
    ? (globalForPrisma.__prismaInstance ??= createPrismaClient())
    : createPrismaClient()
