/**
 * /accounts/journal/[id] — Journal voucher view (SPEC-M3 §8 row 17 view mode).
 * Resolves by db id OR voucherNo. Not a chain stage — no chain bar state.
 */
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { journalConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function JournalViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const include = { party: true }
  let j = await db.journal.findUnique({ where: { id }, include }).catch(() => null)
  if (!j) j = await db.journal.findUnique({ where: { voucherNo: id }, include })
  if (!j) notFound()

  const d = (dt: Date | null | undefined) => (dt ? new Date(dt).toISOString().slice(0, 10) : '')
  const initial = {
    voucherNo: j.voucherNo,
    voucherType: j.voucherType,
    debitAccount: j.debitAccount,
    creditAccount: j.creditAccount,
    amount: j.amount,
    partyCode: j.party?.code ?? '',
    date: d(j.date),
    narration: j.narration ?? '',
  }

  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/accounts/journal" label="Journal" title={j.voucherNo} />
      <DocScreen
        config={toScreenConfig(journalConfig)}
        mode="view"
        docNo={j.voucherNo}
        initial={initial}
      />
    </div>
  )
}
