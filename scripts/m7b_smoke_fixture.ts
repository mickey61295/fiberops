/**
 * SPEC-M7 Wave B — route_smoke_m7b fixture helper.
 *   setup  : delete any existing grn_acceptance Approval rows for GRN-001 so
 *            the smoke's accept_grn run hits the find-or-create path cleanly
 *            (idempotent re-runs).
 *   verify : assert the approval committed through the HUMAN door carries the
 *            session user as the actor (approvedBy = admin email, requestedBy
 *            = 'agent'), exit 1 otherwise.
 * Prints KEY= lines the smoke greps.
 */
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
const GRN_NO = 'GRN-001'

async function main() {
  const mode = process.argv[2]
  const grn = await db.gRN.findUnique({ where: { grnNo: GRN_NO } })
  if (!grn) {
    console.log('KEY=fixture-fail  GRN-001 missing — run scripts/seed.ts first')
    process.exit(1)
  }
  if (mode === 'setup') {
    const del = await db.approval.deleteMany({
      where: { entity: 'grn_acceptance', entityId: grn.id },
    })
    console.log(`KEY=setup-ok  deleted ${del.count} stale grn_acceptance row(s) for ${GRN_NO}`)
    return
  }
  if (mode === 'verify') {
    const row = await db.approval.findFirst({
      where: { entity: 'grn_acceptance', entityId: grn.id },
      orderBy: { createdAt: 'desc' },
    })
    if (!row) {
      console.log('KEY=verify-fail  no grn_acceptance approval found for GRN-001')
      process.exit(1)
    }
    if (row.status !== 'approved') {
      console.log(`KEY=verify-fail  status=${row.status} (expected approved)`)
      process.exit(1)
    }
    if (row.approvedBy !== 'admin@fiberpro.local') {
      console.log(`KEY=verify-fail  approvedBy=${row.approvedBy} (expected admin@fiberpro.local — actor not stamped)`)
      process.exit(1)
    }
    if (row.requestedBy !== 'agent') {
      console.log(`KEY=verify-fail  requestedBy=${row.requestedBy} (expected agent)`)
      process.exit(1)
    }
    console.log(`KEY=verify-ok  ${GRN_NO} grn_acceptance approved by ${row.approvedBy} (requested by ${row.requestedBy})`)
    return
  }
  console.log('usage: tsx scripts/m7b_smoke_fixture.ts setup|verify')
  process.exit(1)
}

main().finally(() => db.$disconnect())
