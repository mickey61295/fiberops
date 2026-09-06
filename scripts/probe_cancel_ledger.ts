/* M-02 scoping probe — does the party ledger double-reverse a cancelled receipt?
 * Party → invoice 1000 → receipt 1000 (ledger 0) → cancel receipt → ledger ??
 * Correct end state: 1000 (AR re-opened). */
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const ts = Date.now()
  const party = await db.party.create({
    data: { code: `PROBE-${ts}`, name: `Probe ${ts}`, partyType: 'customer' },
  })
  const fy = (await db.finYear.findFirst({ orderBy: { id: 'desc' } } as never)) ?? null
  const finYear = (fy as any)?.label ?? (fy as any)?.code ?? 'FY-TEST'
  const inv = await db.salesInvoice.create({
    data: { invoiceNo: `PINV-${ts}`, partyId: party.id, invoiceDate: new Date(), finYear, billType: 'tax', billAmount: 1000, taxableValue: 1000, status: 'issued' },
  })
  const pay = await db.payment.create({
    data: { voucherNo: `PRCP-${ts}`, partyId: party.id, direction: 'in', payDate: new Date(), finYear, amount: 1000, mode: 'bank', status: 'active' },
  })
  await db.journal.create({
    data: { voucherNo: `JV-PRCP-${ts}`, voucherType: 'receipt', partyId: party.id, date: new Date(), finYear, debitAccount: 'Cash/Bank', creditAccount: party.name, amount: 1000, narration: 'probe' },
  })

  const before = await ledger(party.id)
  console.log('after receipt (expect 0):', before)

  // cancel: payment flips + contra journal (exactly what planCancelPayment writes)
  await db.payment.update({ where: { id: pay.id }, data: { status: 'cancelled', cancelledAt: new Date() } })
  await db.journal.create({
    data: { voucherNo: `CN-PRCP-${ts}`, voucherType: 'contra', partyId: party.id, date: new Date(), finYear, debitAccount: party.name, creditAccount: 'Cash/Bank', amount: 1000, narration: 'Contra: cancel' },
  })

  const after = await ledger(party.id)
  console.log('after cancel (correct = 1000):', after)

  // cleanup
  await db.journal.deleteMany({ where: { partyId: party.id } })
  await db.payment.deleteMany({ where: { partyId: party.id } })
  await db.salesInvoice.deleteMany({ where: { partyId: party.id } })
  await db.party.delete({ where: { id: party.id } })
  console.log('probe cleaned')
}

async function ledger(partyId: string): Promise<string> {
  const [invoices, journals, payments] = await Promise.all([
    db.salesInvoice.findMany({ where: { partyId, status: { not: 'cancelled' } } }),
    db.journal.findMany({ where: { partyId, voucherType: { in: ['journal', 'contra'] } } }),
    db.payment.findMany({ where: { partyId } }),
  ])
  const billed = invoices.reduce((s, i) => s + (i as any).billAmount, 0)
  const journalsSum = journals.reduce((s, j) => s + j.amount, 0)
  const received = payments.filter((p) => p.direction === 'in').reduce((s, p) => s + p.amount, 0)
  const balance = billed - journalsSum - received
  return `billed=${billed} journals=${journalsSum} received=${received} → balance=${balance} (${invoices.length} inv, ${journals.length} jrnl, ${payments.length} pay)`
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
