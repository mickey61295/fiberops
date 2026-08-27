/**
 * /accounts/debit-note — Debit Note (SPEC-M3 §8 row 15, item 'debit-note').
 * DocScreen New mode + recent notes. Form door → planDebitNote — the same
 * service as create_debit_note (ADR-001).
 */
import { db } from '@/lib/db'
import { debitNoteConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function DebitNotePage() {
  const recent = await db.debitNote.findMany({
    orderBy: { date: 'desc' },
    take: debitNoteConfig.recentCount ?? 20,
    include: { party: true },
  })
  const rows = recent.map((n) => ({
    id: n.id,
    cells: {
      noteNo: n.noteNo,
      noteType: n.noteType,
      partyName: n.party?.name ?? '—',
      amount: (n.amount || 0).toLocaleString('en-IN'),
      status: n.status,
      date: n.date ? n.date.toISOString().slice(0, 10) : '—',
    },
  }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/accounts" label="Accounts" title="Debit Note (new)" />
      <DocScreen
        config={toScreenConfig(debitNoteConfig)}
        mode="new"
        viewRoutePattern="/accounts/debit-note/[id]"
      />
      <RecentDocsTable
        title="Recent debit notes"
        columns={debitNoteConfig.listColumns}
        rows={rows}
        hrefBase="/accounts/debit-note"
        empty="No debit notes yet — raise the first one above."
      />
    </div>
  )
}
