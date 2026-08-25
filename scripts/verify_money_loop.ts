/* eslint-disable no-console */
// Quick DB state check for the E2E money loop.
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

async function main() {
  const b = await db.bill.findUnique({ where: { billNo: 'BILL-0001' }, include: { passes: true, payments: true, party: true } })
  if (!b) { console.log('BILL-0001 not found'); return }
  console.log('BILL-0001:', {
    party: b.party.name,
    status: b.status,
    billAmount: b.billAmount,
    tdsPercent: b.tdsPercent,
    tdsAmount: b.tdsAmount,
    netPayable: b.netPayable,
    passes: b.passes.length,
    payments: b.payments.map((p) => ({ voucher: p.voucherNo, amount: p.amount, mode: p.mode, ref: p.reference })),
  })
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
