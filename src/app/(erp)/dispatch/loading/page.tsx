/**
 * /dispatch/loading — Loading challans (SPEC-M6 §2 row 9, legacy FrmLoading).
 * VARIANT config over planPcsDespatch (mode='loading' → LAD-#### space,
 * status starts 'loading'). Recent list narrows to the LAD- prefix.
 */
import { db } from '@/lib/db'
import { loadingConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function LoadingPage() {
  const recent = await db.pcsDespatch.findMany({
    where: { dcNo: { startsWith: 'LAD-' } },
    orderBy: { createdAt: 'desc' },
    take: loadingConfig.recentCount ?? 20,
  })
  const orderIds = [...new Set(recent.map((d) => d.orderId).filter((o): o is string => !!o))]
  const orders = orderIds.length ? await db.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, orderNo: true } }) : []
  const orderById = new Map(orders.map((o) => [o.id, o.orderNo]))
  const rows = recent.map((d) => ({
    id: d.id,
    cells: {
      dcNo: d.dcNo,
      orderNo: d.orderId ? orderById.get(d.orderId) ?? '—' : '—',
      vehicleNo: d.vehicleNo ?? '—',
      totalPcs: String(d.totalPcs),
      despatchDate: d.despatchDate.toISOString().slice(0, 10),
      status: d.status,
    },
  }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/dispatch" label="Despatch" title="Loading Challan (new)" />
      <DocScreen
        config={toScreenConfig(loadingConfig)}
        mode="new"
        viewRoutePattern="/pieces/despatch/[id]"
      />
      <RecentDocsTable
        title="Recent loading challans (LAD-####)"
        columns={loadingConfig.listColumns}
        rows={rows}
        hrefBase="/pieces/despatch"
        empty="No loading challans yet — raise the first one above."
      />
    </div>
  )
}
