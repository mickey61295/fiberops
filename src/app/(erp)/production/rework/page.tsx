/**
 * /production/rework — Rework Entry (SPEC-M3 §8 row 11, item 'rework').
 * DocScreen New mode + recent rework entries (ProductionEntry.rework=true —
 * the same model, viewed through /production/entry/[id]). Form door →
 * planReworkEntry — the same service as post_rework (ADR-001).
 */
import { db } from '@/lib/db'
import { reworkConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function ReworkPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const order = typeof sp.order === 'string' ? sp.order : undefined
  const recent = await db.productionEntry.findMany({
    where: { rework: true },
    orderBy: { prodDate: 'desc' },
    take: reworkConfig.recentCount ?? 20,
    include: { order: true, department: true, operator: true },
  })
  const rows = recent.map((e) => ({
    id: e.id,
    cells: {
      orderNo: e.order?.orderNo ?? '—',
      deptName: e.department?.name ?? e.department?.code ?? '—',
      prodDate: e.prodDate ? e.prodDate.toISOString().slice(0, 10) : '—',
      bundleNo: e.bundleNo ?? '—',
      operatorName: e.operator?.name ?? '—',
      qty: (e.qty || 0).toLocaleString('en-IN'),
      amount: `₹${(e.amount || 0).toLocaleString('en-IN')}`,
    },
  }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/production" label="Production" title="Rework Entry (new)" />
      <DocScreen
        config={toScreenConfig(reworkConfig)}
        mode="new"
        viewRoutePattern="/production/entry/[id]"
        prefill={order ? { orderNo: order } : undefined}
        chainCtx={order ? { orderNo: order } : undefined}
      />
      <RecentDocsTable
        title="Recent rework entries"
        columns={reworkConfig.listColumns}
        rows={rows}
        hrefBase="/production/entry"
        empty="No rework entries yet — post the first one above."
      />
    </div>
  )
}
