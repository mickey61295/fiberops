/**
 * seed_admin.ts (SPEC-M7 §3) — idempotent dev/CI seed for the login door.
 * Ensures admin@fiberpro.local exists with a password (default 'admin123',
 * override: `npx tsx scripts/seed_admin.ts <password>` or ADMIN_PASSWORD env).
 * NEVER overwrites an existing password (that door belongs to /admin/users in
 * Wave C or an operator with db access). NOTE: running this CLOSES the
 * first-run /login bootstrap (any password existing locks /api/auth/bootstrap).
 */
import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/auth/password'

const db = new PrismaClient()
const EMAIL = 'admin@fiberpro.local'
const PASSWORD = process.argv[2] ?? process.env.ADMIN_PASSWORD ?? 'admin123'

async function main() {
  const existing = await db.user.findUnique({ where: { email: EMAIL } })
  if (existing?.passwordHash) {
    console.log(`KEY=admin-ok  ${EMAIL} already has a password (bootstrap stays closed)`)
    return
  }
  const passwordHash = await hashPassword(PASSWORD)
  if (existing) {
    await db.user.update({ where: { id: existing.id }, data: { passwordHash, active: true } })
    console.log(`KEY=admin-set  password set on existing user ${EMAIL} (${existing.name})`)
  } else {
    await db.user.create({
      data: { email: EMAIL, name: 'Aslam Admin', role: 'admin', passwordHash },
    })
    console.log(`KEY=admin-created  ${EMAIL} created (role admin)`)
  }
  console.log(`  dev credentials: ${EMAIL} / ${PASSWORD}`)
}

main().finally(() => db.$disconnect())
