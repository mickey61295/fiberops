/* eslint-disable no-console */
// Remove stale Eval-* / EVL-* / STY-000* / SYN-* artifacts from interrupted
// eval runs, so the golden-set eval starts clean.
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

async function main() {
  await db.order.deleteMany({ where: { orderNo: { startsWith: 'SYN-' } } })
  await db.orderLine.deleteMany({ where: { order: { orderNo: { startsWith: 'SYN-' } } } }).catch(() => {})
  const buyers = await db.buyer.findMany({ where: { name: { contains: 'Eval Buyer' } } })
  for (const b of buyers) {
    await db.orderLine.deleteMany({ where: { order: { buyerId: b.id } } }).catch(() => {})
    await db.order.deleteMany({ where: { buyerId: b.id } })
    await db.style.deleteMany({ where: { buyerId: b.id } })
    await db.buyer.deleteMany({ where: { id: b.id } })
  }
  await db.style.deleteMany({ where: { OR: [{ styleNo: { startsWith: 'EVL-' } }, { styleNo: { in: ['STY-0001', 'STY-0002', 'STY-0003', 'STY-0004'] } }] } })
  console.log(`cleaned ${buyers.length} stale eval buyer(s) + styles + orders`)
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
