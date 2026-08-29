/* One-shot residue cleaner (M18 Wave C post-run): the first runs of
 * doc-view-actions.test / rate-memory.test / route_smoke_m18c leaked POs +
 * parties — the afterAll deleted POs without deleting their POLine children
 * first (Prisma Restrict + .catch swallow = silent leak). The test cleanups
 * are fixed; this script removes what already leaked. Marker-prefixed only.
 */
import { db } from '../src/lib/db'

async function main() {
  const poPrefixes = ['BVPO-', 'SMCPO-', 'RMPO1-', 'RMPO2-', 'RMPOC-', 'PO-WC-', 'POR-WC-']
  const partyPrefixes = ['BVPY-', 'SMCPY-', 'RMPY-', 'RMPZ-', 'WCPY-']
  const yarnPrefixes = ['BVYN-', 'SMCYN-', 'RMYN-', 'WCYN-']
  const uomPrefixes = ['RMUOM-', 'WCUOM-', 'SMC-UOM', 'BV-UOM']

  const leakedPOs = await db.purchaseOrder.findMany({
    where: { OR: poPrefixes.map((p) => ({ poNo: { startsWith: p } })) },
    select: { poNo: true },
  })
  const poNos = leakedPOs.map((p) => p.poNo)
  const lines = await db.pOLine.deleteMany({ where: { po: { poNo: { in: poNos } } } })
  const pos = await db.purchaseOrder.deleteMany({ where: { poNo: { in: poNos } } })

  // orphaned fixtures by marker (yarn/uom/godown/style/buyer/party)
  const yarns = await db.yarn.deleteMany({ where: { OR: yarnPrefixes.map((p) => ({ code: { startsWith: p } })) } })
  const uoms = await db.uOM.deleteMany({ where: { OR: uomPrefixes.map((p) => ({ code: { startsWith: p } })) } })
  const godowns = await db.godown.deleteMany({ where: { OR: ['BVGD-', 'SMCGD-', 'RMGD-', 'WCGD-'].map((p) => ({ code: { startsWith: p } })) } })
  const styles = await db.style.deleteMany({ where: { styleNo: { startsWith: 'WCST-' } } })
  const buyers = await db.buyer.deleteMany({ where: { code: { startsWith: 'WCBY-' } } })
  const parties = await db.party.deleteMany({ where: { OR: partyPrefixes.map((p) => ({ code: { startsWith: p } })) } })

  console.log(
    `cleaned: ${pos.count} POs (+${lines.count} lines), ${yarns.count} yarns, ${uoms.count} uoms, ${godowns.count} godowns, ${styles.count} styles, ${buyers.count} buyers, ${parties.count} parties`,
  )
  // residue re-check
  const left = await db.purchaseOrder.count({
    where: { OR: poPrefixes.map((p) => ({ poNo: { startsWith: p } })) },
  })
  console.log(`residue re-check: ${left} marker POs remain`)
  await db.$disconnect()
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
