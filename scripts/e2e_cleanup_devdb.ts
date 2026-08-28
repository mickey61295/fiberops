/**
 * SPEC-M12 hotfix companion — ONE-SHOT cleanup of the dev DB (custom.db)
 * pollution caused by the globalSetup env bug (setup's PrismaClient resolved
 * DATABASE_URL from .env → seeded into the DEV db instead of e2e.db).
 *
 *   npx tsx scripts/e2e_cleanup_devdb.ts
 *
 * Deletes, by 'E2E' markers ONLY (nothing else is touched):
 *   seed orders (+lines), seed invoices, seed POs (+lines +auto-approvals),
 *   the e2e@fiberpro.local user + 'E2E Rights' group, and the E2E masters
 *   (buyer/style/colour/size/party/yarn/godown) once unreferenced.
 *   Restores admin@fiberpro.local's password to the documented dev value.
 */
import { PrismaClient } from '@prisma/client'
import { hashPassword } from '../src/lib/auth/password'

const db = new PrismaClient()

async function main() {
  // 1. seed orders (+ lines)
  const orders = await db.order.findMany({ where: { notes: 'E2E golden-path seed order' }, select: { id: true } })
  const orderIds = orders.map((o) => o.id)
  if (orderIds.length) {
    await db.orderLine.deleteMany({ where: { orderId: { in: orderIds } } })
    await db.order.deleteMany({ where: { id: { in: orderIds } } })
  }

  // 2. seed invoices (party E2E-P, no payments ever committed against them —
  // delete payments defensively first anyway)
  const invoices = await db.salesInvoice.findMany({ where: { party: { code: 'E2E-P' } }, select: { id: true } })
  const invoiceIds = invoices.map((i) => i.id)
  if (invoiceIds.length) {
    await db.payment.deleteMany({ where: { invoiceId: { in: invoiceIds } } }).catch(() => {})
    await db.salesInvoice.deleteMany({ where: { id: { in: invoiceIds } } })
  }

  // 3. seed POs (+ lines + auto-approvals + any stray GRNs/ledger/stock)
  const pos = await db.purchaseOrder.findMany({ where: { notes: 'E2E golden-path seed PO' }, select: { id: true } })
  const poIds = pos.map((p) => p.id)
  if (poIds.length) {
    await db.approval.deleteMany({ where: { entity: 'po', entityId: { in: poIds } } })
    await db.gRN.deleteMany({ where: { poId: { in: poIds } } }).catch(() => {})
    await db.pOLine.deleteMany({ where: { poId: { in: poIds } } })
    await db.purchaseOrder.deleteMany({ where: { id: { in: poIds } } })
  }

  // 4. E2E users + group
  await db.user.deleteMany({ where: { email: 'e2e@fiberpro.local' } })
  await db.userGroup.deleteMany({ where: { name: 'E2E Rights' } })

  // 5. E2E masters (now unreferenced)
  const yarn = await db.yarn.findUnique({ where: { code: 'E2E-Y' } })
  if (yarn) {
    await db.stockLedger.deleteMany({ where: { itemId: yarn.id, itemType: 'yarn' } }).catch(() => {})
    await db.currentStock.deleteMany({ where: { itemId: yarn.id, itemType: 'yarn' } }).catch(() => {})
  }
  await db.yarn.deleteMany({ where: { code: 'E2E-Y' } })
  await db.party.deleteMany({ where: { code: 'E2E-P' } })
  await db.godown.deleteMany({ where: { code: 'E2E-G' } })
  const style = await db.style.findUnique({ where: { styleNo: 'E2E-S1' } })
  if (style) {
    await db.orderLine.deleteMany({ where: { styleId: style.id } }).catch(() => {})
    await db.style.deleteMany({ where: { id: style.id } })
  }
  await db.colour.deleteMany({ where: { code: 'E2E-CR' } })
  await db.size.deleteMany({ where: { name: 'E2E M' } })
  await db.buyer.deleteMany({ where: { code: 'E2E-B' } })

  // 6. restore the documented dev admin password (the setup force-set it)
  await db.user.update({
    where: { email: 'admin@fiberpro.local' },
    data: { passwordHash: await hashPassword('admin123') },
  })

  // verification pass
  const left = {
    orders: await db.order.count({ where: { notes: 'E2E golden-path seed order' } }),
    invoices: await db.salesInvoice.count({ where: { party: { code: 'E2E-P' } } }),
    pos: await db.purchaseOrder.count({ where: { notes: 'E2E golden-path seed PO' } }),
    e2eUser: await db.user.count({ where: { email: 'e2e@fiberpro.local' } }),
    buyer: await db.buyer.count({ where: { code: 'E2E-B' } }),
    party: await db.party.count({ where: { code: 'E2E-P' } }),
    yarn: await db.yarn.count({ where: { code: 'E2E-Y' } }),
    godown: await db.godown.count({ where: { code: 'E2E-G' } }),
  }
  const clean = Object.values(left).every((n) => n === 0)
  console.log(`[e2e-cleanup] removed: ${orderIds.length} orders, ${invoiceIds.length} invoices, ${poIds.length} POs; admin password restored`)
  console.log(`[e2e-cleanup] residue check: ${JSON.stringify(left)} → ${clean ? 'CLEAN' : 'RESIDUE REMAINS'}`)
  if (!clean) process.exit(1)
}

main().finally(() => db.$disconnect())
