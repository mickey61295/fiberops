/**
 * /production/line-transfer — Line Transfer (SPEC-M5 §7-B-11, item
 * 'line-transfer', legacy Trs_LineTfr). planLineTransfer writes TWO LineIssue
 * rows (-O out / -I in) in one transaction; the recent table lists the
 * TRANSFERS (paired by ref), each linking to the in-row view
 * /production/issue/[id].
 */
import { db } from '@/lib/db'
import { lineTransferConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function LineTransferPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const order = typeof sp.order === 'string' ? sp.order : undefined

  const recent = await db.lineIssue.findMany({
    where: { status: 'transferred' },
    orderBy: { issueDate: 'desc' },
    take: (lineTransferConfig.recentCount ?? 20) * 2,
    include: { order: true, line: true },
  })
  // pair -O / -I rows by ref; one table row per transfer
  const pairs = new Map<string, { id: string; ref: string; orderNo: string; from: string; to: string; qty: number; date: string }>()
  for (const li of recent) {
    const ref = li.issueNo.replace(/-(O|I)$/, '')
    const existing = pairs.get(ref)
    const lineName = li.line?.code ?? li.line?.name ?? '—'
    if (li.issueNo.endsWith('-O')) {
      if (existing) existing.from = lineName
      else pairs.set(ref, { id: '', ref, orderNo: li.order?.orderNo ?? '—', from: lineName, to: '—', qty: 0, date: li.issueDate ? li.issueDate.toISOString().slice(0, 10) : '—' })
    } else {
      if (existing) {
        existing.id = li.id
        existing.to = lineName
        existing.qty = li.qty
      } else {
        pairs.set(ref, { id: li.id, ref, orderNo: li.order?.orderNo ?? '—', from: '—', to: lineName, qty: li.qty, date: li.issueDate ? li.issueDate.toISOString().slice(0, 10) : '—' })
      }
    }
  }
  const rows = [...pairs.values()]
    .filter((p) => p.id) // only rows whose in-leg is on this page
    .slice(0, lineTransferConfig.recentCount ?? 20)
    .map((p) => ({
      id: p.id,
      cells: {
        issueNo: p.ref,
        orderNo: p.orderNo,
        fromLine: p.from,
        toLine: p.to,
        qty: p.qty.toLocaleString('en-IN'),
        issueDate: p.date,
      },
    }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/production" label="Production" title="Line Transfer (new)" />
      <DocScreen
        config={toScreenConfig(lineTransferConfig)}
        mode="new"
        viewRoutePattern="/production/issue/[id]"
        prefill={order ? { orderNo: order } : undefined}
      />
      <RecentDocsTable
        title="Recent line transfers (out + in pairs)"
        columns={lineTransferConfig.listColumns}
        rows={rows}
        hrefBase="/production/issue"
        empty="No line transfers yet — move the first WIP batch above."
      />
    </div>
  )
}
