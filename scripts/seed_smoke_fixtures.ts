/* Seed one debit note + one plain journal voucher (via the posting services —
 * the form door path) so the Wave D view routes have data to render. */
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const party = await db.party.findFirst({ where: { code: 'CUS001' } })
  if (!party) throw new Error('CUS001 missing')
  const { planDebitNote } = await import('../src/lib/erp/posting/debit-note')
  const { planJournal } = await import('../src/lib/erp/posting/journal')

  const dn = await planDebitNote({ noteNo: 'DN-SMOKE-1', noteType: 'pcs', partyCode: 'CUS001', amount: 250, reason: 'route-smoke fixture', date: '2026-08-01' })
  if (dn.ok) await dn.commit()
  console.log('debit note:', dn.ok ? 'committed' : dn.error)

  const jv = await planJournal({ voucherNo: 'V-SMOKE-1', voucherType: 'journal', debitAccount: 'Round Off', creditAccount: 'Suspense', amount: 100, narration: 'route-smoke fixture', date: '2026-08-01' })
  if (jv.ok) await jv.commit()
  console.log('journal:', jv.ok ? 'committed' : jv.error)
}

main().finally(() => db.$disconnect())
