/* eslint-disable no-console */
// Remove E2E money-loop artifacts (BILL-0001 / PAY-0001) so the regression re-runs cleanly.
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

async function main() {
  const bills = await db.bill.findMany({ where: { billNo: { startsWith: 'BILL-' } } })
  for (const b of bills) {
    await db.billPass.deleteMany({ where: { billId: b.id } })
    await db.payment.deleteMany({ where: { billId: b.id } })
    await db.bill.deleteMany({ where: { id: b.id } })
  }
  await db.payment.deleteMany({ where: { voucherNo: { startsWith: 'PAY-' } } })
  console.log(`removed ${bills.length} E2E bill(s) + stray payments`)
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
