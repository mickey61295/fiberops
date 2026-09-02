/* SPEC-M45 L-01 — one-time (idempotent) backfill: link every existing
 * Employee to its 1:1 employee-party through ensureEmployeeParty
 * (find-or-create + link). Run once after the schema push; re-runs are
 * no-ops (already-linked rows return untouched). */
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function ensureEmployeeParty(rec: { id: string; code: string; name: string; partyId?: string | null }) {
  if (rec.partyId) {
    const linked = await db.party.findUnique({ where: { id: rec.partyId } })
    if (linked) return { code: linked.code, created: false }
  }
  let party = await db.party.findUnique({ where: { code: rec.code } })
  if (party && party.partyType !== 'employee') {
    let suffix = 1
    while (party && party.partyType !== 'employee') {
      const candidate = `${rec.code}-W${suffix > 1 ? suffix : ''}`
      party = await db.party.findUnique({ where: { code: candidate } })
      if (party && party.partyType === 'employee') break
      if (!party) {
        party = await db.party.create({ data: { code: candidate, name: rec.name, partyType: 'employee' } })
        break
      }
      suffix++
    }
  }
  if (!party) {
    party = await db.party.create({ data: { code: rec.code, name: rec.name, partyType: 'employee' } })
  }
  const clash = await db.employee.findFirst({ where: { partyId: party.id, id: { not: rec.id } } })
  if (clash) throw new Error(`party ${party.code} already linked to ${clash.code}`)
  await db.employee.update({ where: { id: rec.id }, data: { partyId: party.id } })
  return { code: party.code, created: true }
}

async function main() {
  const employees = await db.employee.findMany({ orderBy: { code: 'asc' } })
  let linked = 0, created = 0, already = 0
  for (const e of employees) {
    if (e.partyId) { already++; continue }
    const r = await ensureEmployeeParty(e)
    linked++
    if (r.created) created++
    console.log(`  ${e.code} → party ${r.code}${r.created ? ' (created)' : ''}`)
  }
  const unlinked = await db.employee.count({ where: { partyId: null } })
  console.log(`BACKFILL OK: ${employees.length} employees — ${already} already linked, ${linked} linked now (${created} parties created), ${unlinked} unlinked remain`)
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
