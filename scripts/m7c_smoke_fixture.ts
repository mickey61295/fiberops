/**
 * SPEC-M7 Wave C — route_smoke_m7c fixture helper.
 *   setup     : create the 'Smoke Restricted' user group (rights = orders +
 *               production) and its restricted user (merchandiser, password
 *               'restricted123') — idempotent (deletes first).
 *   tighten   : shrink the group rights to ['accounts'] — simulates an admin
 *               REVOKING/CHANGING rights mid-session (the stale fo_rights
 *               cookie window the layout's fresh layer-2 must close).
 *   reactivate: restore the restricted user to active (after the deactivate
 *               round) so later steps can log in again.
 *   deactivate: set active=false — the mid-session lockout case (the layout's
 *               second layer must 307 the still-cookie'd user to /login).
 *   cleanup   : delete the smoke group + user; reactivate admin (paranoia).
 * Prints KEY= lines the smoke greps (KEY=user-id=<id> for the set-password
 * door).
 */
import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/auth/password'

const db = new PrismaClient()
const GROUP_NAME = 'Smoke Restricted'
const EMAIL = 'smoke.restricted@fiberpro.local'

async function main() {
  const mode = process.argv[2]

  if (mode === 'setup') {
    // idempotent: clear previous runs
    await db.user.deleteMany({ where: { email: EMAIL } }).catch(() => {})
    await db.userGroup.deleteMany({ where: { name: GROUP_NAME } }).catch(() => {})

    const group = await db.userGroup.create({
      data: { name: GROUP_NAME, rights: ['orders', 'production'] },
    })
    const user = await db.user.create({
      data: {
        email: EMAIL,
        name: 'Smoke Restricted',
        role: 'merchandiser',
        active: true,
        userGroupId: group.id,
        passwordHash: await hashPassword('restricted123'),
      },
    })
    console.log(`KEY=user-id=${user.id}`)
    console.log(`KEY=setup-ok  ${EMAIL} in group ${GROUP_NAME} rights=['orders','production']`)
    return
  }

  if (mode === 'tighten') {
    await db.userGroup.updateMany({
      where: { name: GROUP_NAME },
      data: { rights: ['accounts'] },
    })
    console.log('KEY=tighten-ok  group rights now [\'accounts\'] — stale-cookie window open')
    return
  }

  if (mode === 'reactivate') {
    await db.user.updateMany({ where: { email: EMAIL }, data: { active: true } })
    console.log('KEY=reactivate-ok  restricted user active again')
    return
  }

  if (mode === 'deactivate') {
    await db.user.updateMany({ where: { email: EMAIL }, data: { active: false } })
    console.log('KEY=deactivate-ok  restricted user deactivated mid-session')
    return
  }

  if (mode === 'cleanup') {
    const u = await db.user.deleteMany({ where: { email: EMAIL } })
    const g = await db.userGroup.deleteMany({ where: { name: GROUP_NAME } })
    await db.user.updateMany({
      where: { email: 'admin@fiberpro.local' },
      data: { active: true },
    })
    console.log(`KEY=cleanup-ok  deleted ${u.count} user(s), ${g.count} group(s)`)
    return
  }

  console.log('usage: tsx scripts/m7c_smoke_fixture.ts setup|tighten|reactivate|deactivate|cleanup')
  process.exit(1)
}

main().finally(() => db.$disconnect())
