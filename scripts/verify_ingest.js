/* eslint-disable no-console */
// Phase 0.4 verification: check LPP orders in DB + clean unreferenced duplicate masters.
const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()

async function main() {
  const orders = await db.order.findMany({ where: { orderNo: { startsWith: '11' } }, orderBy: { orderNo: 'asc' } })
  console.log('LPP orders:', orders.length)
  let totalPcs = 0, totalValue = 0
  for (const o of orders) {
    totalPcs += o.totalPcs; totalValue += o.totalValue
    console.log(`  ${o.orderNo}: ${o.totalPcs} pcs, ${o.totalValue}, fy=${o.finYear}, delivery=${o.deliveryDate?.toISOString().slice(0, 10)}`)
  }
  console.log(`TOTAL: ${totalPcs} pcs, ${totalValue}`)
  if (totalPcs !== 30006) { console.log('!!! EXPECTED 30006 pcs'); process.exitCode = 1 }

  // Clean unreferenced duplicate masters (B-0002, STY-0001)
  const buyers = await db.buyer.findMany()
  for (const b of buyers) {
    const refs = await db.order.count({ where: { buyerId: b.id } }) + await db.style.count({ where: { buyerId: b.id } })
    if (refs === 0 && b.code.startsWith('B-')) {
      await db.buyer.delete({ where: { id: b.id } })
      console.log(`deleted duplicate buyer ${b.code} (${b.name})`)
    }
  }
  const styles = await db.style.findMany()
  for (const s of styles) {
    const refs = await db.order.count({ where: { styleId: s.id } }) + await db.orderLine.count({ where: { styleId: s.id } }) + await db.bomLine.count({ where: { styleId: s.id } })
    if (refs === 0 && s.styleNo.startsWith('STY-')) {
      await db.style.delete({ where: { id: s.id } })
      console.log(`deleted duplicate style ${s.styleNo}`)
    }
  }

  const buyers2 = await db.buyer.findMany()
  const styles2 = await db.style.findMany()
  console.log('final buyers:', buyers2.map((b) => b.code).join(', '))
  console.log('final styles:', styles2.map((s) => s.styleNo).join(', '))
  await db.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
