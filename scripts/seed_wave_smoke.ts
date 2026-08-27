/**
 * Wave C route-smoke seed — creates ONE jobwork DC (JW-SMOKE-1) + its
 * jobworker party so /jobwork/order/[id] has a doc to render the W6 recon
 * card on. Idempotent: wipes prior JW-SMOKE rows first (the waveD smoke's
 * DN-SMOKE-1/V-SMOKE-1 got wiped by test-cleanup residue — this one reseeds
 * itself every run). Never touches non-SMOKE data.
 */
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()
const DC = 'JW-SMOKE-1'
const PARTY = 'JWSMOKE-PARTY'

async function main() {
  // wipe prior smoke rows (children-safe: jobwork has no children)
  await db.jobworkOrder.deleteMany({ where: { dcNo: DC } }).catch(() => {})
  await db.party.deleteMany({ where: { code: PARTY } }).catch(() => {})

  const party = await db.party.create({
    data: { code: PARTY, name: 'Smoke Jobworker', partyType: 'both' },
  })
  const jw = await db.jobworkOrder.create({
    data: {
      dcNo: DC,
      jobworkerId: party.id,
      processType: 'washing',
      totalQty: 100,
      totalValue: 1000,
      status: 'sent',
      outDate: new Date(),
      expectedInDate: new Date(Date.now() + 7 * 86400000),
    },
  })
  console.log(`seeded ${jw.dcNo} (party ${party.code})`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
