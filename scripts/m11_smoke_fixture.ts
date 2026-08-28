/**
 * SPEC-M11 — route_smoke_m11 fixture helper.
 *   setup  : create the 'Smoke Flag Ops' user group (rights = ['masters-admin']
 *            — CAN reach the admin screens) and its non-admin user
 *            (role merchandiser, password 'flagops123'). Proves the ROLE
 *            layer sits under the GROUP layer: this user passes the (erp)
 *            layout rights check but must hit the page's admin-only notice
 *            and the API's 403.
 *   cleanup : delete the smoke group + user.
 * Prints KEY= lines the smoke greps.
 */
import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/auth/password'

const db = new PrismaClient()
const GROUP_NAME = 'Smoke Flag Ops'
const EMAIL = 'smoke.flagops@fiberpro.local'

async function main() {
  const mode = process.argv[2]

  if (mode === 'setup') {
    await db.user.deleteMany({ where: { email: EMAIL } }).catch(() => {})
    await db.userGroup.deleteMany({ where: { name: GROUP_NAME } }).catch(() => {})

    const group = await db.userGroup.create({
      data: { name: GROUP_NAME, rights: ['masters-admin'] },
    })
    await db.user.create({
      data: {
        email: EMAIL,
        name: 'Smoke Flag Ops',
        role: 'merchandiser',
        active: true,
        userGroupId: group.id,
        passwordHash: await hashPassword('flagops123'),
      },
    })
    console.log(`KEY=setup-ok  ${EMAIL} in group ${GROUP_NAME} rights=['masters-admin'] (role: merchandiser)`)
    return
  }

  if (mode === 'cleanup') {
    const u = await db.user.deleteMany({ where: { email: EMAIL } })
    const g = await db.userGroup.deleteMany({ where: { name: GROUP_NAME } })
    console.log(`KEY=cleanup-ok  deleted ${u.count} user(s), ${g.count} group(s)`)
    return
  }

  console.log('usage: tsx scripts/m11_smoke_fixture.ts setup|cleanup')
  process.exit(1)
}

main().finally(() => db.$disconnect())
