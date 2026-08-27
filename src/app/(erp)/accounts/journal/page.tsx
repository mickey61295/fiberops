/**
 * /accounts/journal — Journal (SPEC-M3 §8 row 17, item 'journal'). DocScreen
 * New mode + recent vouchers. Form door → planJournal — the same service as
 * create_journal (ADR-001). GL is out of M3 scope — the voucher row is the
 * record.
 */
import { db } from '@/lib/db'
import { journalConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function JournalPage() {
  const recent = await db.journal.findMany({
    orderBy: { date: 'desc' },
    take: journalConfig.recentCount ?? 20,
    include: { party: true },
  })
  const rows = recent.map((j) => ({
    id: j.id,
    cells: {
      voucherNo: j.voucherNo,
      voucherType: j.voucherType,
      debitAccount: j.debitAccount,
      creditAccount: j.creditAccount,
      amount: (j.amount || 0).toLocaleString('en-IN'),
      date: j.date ? j.date.toISOString().slice(0, 10) : '—',
    },
  }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/accounts" label="Accounts" title="Journal Voucher (new)" />
      <DocScreen
        config={toScreenConfig(journalConfig)}
        mode="new"
        viewRoutePattern="/accounts/journal/[id]"
      />
      <RecentDocsTable
        title="Recent journal vouchers"
        columns={journalConfig.listColumns}
        rows={rows}
        hrefBase="/accounts/journal"
        empty="No vouchers yet — post the first one above."
      />
    </div>
  )
}
