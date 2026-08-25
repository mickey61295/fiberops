/* eslint-disable no-console */
// One-off cleanup: remove stale T3-* / GT-* fixture rows left behind by
// early commercial-test runs whose afterAll failed on FK ordering (fixed since).
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

async function main() {
  const parties = await db.party.findMany({ where: { code: { startsWith: 'T3-' } } })
  console.log(`stale T3 parties: ${parties.length}`)
  for (const p of parties) {
    const bills = await db.bill.findMany({ where: { partyId: p.id }, select: { id: true } })
    for (const b of bills) {
      await db.billPass.deleteMany({ where: { billId: b.id } })
      await db.payment.deleteMany({ where: { billId: b.id } })
    }
    await db.payment.deleteMany({ where: { partyId: p.id } })
    await db.bill.deleteMany({ where: { partyId: p.id } })
    const grns = await db.gRN.findMany({ where: { partyId: p.id }, select: { id: true } })
    for (const g of grns) await db.gRNLine.deleteMany({ where: { grnId: g.id } })
    await db.gRN.deleteMany({ where: { partyId: p.id } })
    const pos = await db.purchaseOrder.findMany({ where: { partyId: p.id }, select: { id: true } })
    for (const po of pos) await db.pOLine.deleteMany({ where: { poId: po.id } })
    await db.purchaseOrder.deleteMany({ where: { partyId: p.id } })
    await db.party.deleteMany({ where: { id: p.id } })
  }
  // orphan orders/styles/yarns/ledgers from those runs
  const orders = await db.order.findMany({ where: { orderNo: { startsWith: 'T3-' } }, select: { id: true } })
  for (const o of orders) {
    await db.stockLedger.deleteMany({ where: { orderId: o.id } })
    await db.orderLine.deleteMany({ where: { orderId: o.id } })
    await db.order.deleteMany({ where: { id: o.id } })
  }
  await db.style.deleteMany({ where: { styleNo: { startsWith: 'T3-' } } })
  await db.yarn.deleteMany({ where: { code: { startsWith: 'T3-' } } })
  console.log('cleanup done')
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
