/**
 * M16 smoke fixture (SPEC-M16 §4): creates merchandiser + accountant users
 * (hashPassword via the auth lib — same as seed_admin) for the role-aware
 * dashboard HTTP checks, and can write/remove a persisted tile layout to
 * prove the SSR reads AppOption dashboard:<role>:tiles end-to-end.
 * Usage: npx tsx scripts/m16_smoke_fixture.ts setup|persist|cleanup
 */
import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/auth/password'

const db = new PrismaClient()
const TS = Date.now()
const MERCH = `m16-merch-${TS}@fiberpro.local`
const ACCT = `m16-acct-${TS}@fiberpro.local`

async function setup() {
  await db.user.create({
    data: { email: MERCH, name: 'M16 Merchandiser', role: 'merchandiser', passwordHash: await hashPassword('m16pass123'), active: true },
  })
  await db.user.create({
    data: { email: ACCT, name: 'M16 Accountant', role: 'accountant', passwordHash: await hashPassword('m16pass123'), active: true },
  })
  console.log(`MERCH_EMAIL=${MERCH}`)
  console.log(`ACCT_EMAIL=${ACCT}`)
}

async function persist() {
  // Pin the admin layout to a single tile: the SSR must render ONLY it.
  await db.appOption.upsert({
    where: { key: 'dashboard:admin:tiles' },
    update: { value: JSON.stringify(['employees']) },
    create: { key: 'dashboard:admin:tiles', value: JSON.stringify(['employees']), group: 'dashboard', label: 'smoke pin' },
  })
  console.log('PERSISTED dashboard:admin:tiles=["employees"]')
}

async function cleanup() {
  await db.user.deleteMany({ where: { email: { in: [MERCH, ACCT] } } })
  await db.appOption.deleteMany({ where: { key: { startsWith: 'dashboard:' } } })
  console.log('CLEANED m16 fixture users + dashboard:* options')
}

const cmd = process.argv[2]
if (cmd === 'setup') setup().then(() => db.$disconnect())
else if (cmd === 'persist') persist().then(() => db.$disconnect())
else if (cmd === 'cleanup') cleanup().then(() => db.$disconnect())
else {
  console.error('usage: m16_smoke_fixture.ts setup|persist|cleanup')
  process.exit(1)
}
