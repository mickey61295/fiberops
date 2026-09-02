/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M45 L-01 — the 1:1 employee-party link. Wage payouts (planWagePayment)
// post to an employee-TYPE party (HFX-07), and the operator statement's PAID
// leg reads payments on that party — but nothing ever linked Employee rows to
// their Party rows. This helper is the ONE find-or-create seam, called from
// the Employee-create commit (master-service), the per-operator production
// bill (production-bill.ts), and the backfill script. Idempotent: a second
// call resolves the existing party and returns it untouched.

import { db } from '@/lib/db'

/** Find-or-create the 1:1 employee party for an Employee row and link it.
 *  Party code = the employee's code (deterministic '-W' suffix on the rare
 *  collision with a non-employee party — employee creation NEVER fails here);
 *  partyType 'employee'; name = the employee's name. Returns the linked party. */
export async function ensureEmployeeParty(rec: {
  id: string
  code: string
  name: string
  partyId?: string | null
}): Promise<{ id: string; code: string; name: string }> {
  // already linked — trust the link (idempotent; the caller may have re-run)
  if (rec.partyId) {
    const linked = await db.party.findUnique({ where: { id: rec.partyId } })
    if (linked) return { id: linked.id, code: linked.code, name: linked.name }
  }

  // find-or-create: prefer the employee's own code, then deterministic -W
  // suffixes when a non-employee party owns it
  let party = await db.party.findUnique({ where: { code: rec.code } })
  if (party && party.partyType !== 'employee') {
    let suffix = 1
    while (party && party.partyType !== 'employee') {
      const candidate = `${rec.code}-W${suffix > 1 ? suffix : ''}`
      party = await db.party.findUnique({ where: { code: candidate } })
      if (party && party.partyType === 'employee') break
      if (!party) {
        party = await db.party.create({
          data: { code: candidate, name: rec.name, partyType: 'employee' },
        })
        break
      }
      suffix++
    }
  }
  if (!party) {
    party = await db.party.create({
      data: { code: rec.code, name: rec.name, partyType: 'employee' },
    })
  }

  // link (never clobber an existing different link — @unique enforces 1:1;
  // a party already pointed-at by ANOTHER employee is a data bug we surface,
  // not silently rewrite)
  const clash = await db.employee.findFirst({ where: { partyId: party.id, id: { not: rec.id } } })
  if (clash) {
    throw new Error(
      `Employee-party link clash: party ${party.code} is already linked to employee ${clash.code} — fix the data before linking ${rec.code}`,
    )
  }
  await db.employee.update({ where: { id: rec.id }, data: { partyId: party.id } })
  return { id: party.id, code: party.code, name: party.name }
}
