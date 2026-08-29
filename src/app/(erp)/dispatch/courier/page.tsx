/**
 * /dispatch/courier — Courier DC (SPEC-M6 §2 row 8, legacy FrmCourierDC).
 * VARIANT config over planPcsDespatch (mode='courier' → courierName required,
 * DC-#### space). Recent list narrows to courier despatches.
 */
import { db } from '@/lib/db'
import { courierDcConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function CourierDcPage() {
  const recent = await db.pcsDespatch.findMany({
    where: { courierName: { not: null }, status: { not: 'loading' } },
    orderBy: { createdAt: 'desc' },
    take: courierDcConfig.recentCount ?? 20,
  })
  const orderIds = [...new Set(recent.map((d) => d.orderId).filter((o): o is string => !!o))]
  const orders = orderIds.length ? await db.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, orderNo: true } }) : []
  const orderById = new Map(orders.map((o) => [o.id, o.orderNo]))
  const rows = recent.map((d) => ({
    id: d.id,
    cells: {
      dcNo: d.dcNo,
      orderNo: d.orderId ? orderById.get(d.orderId) ?? '—' : '—',
      courierName: d.courierName ?? '—',
      totalPcs: String(d.totalPcs),
      despatchDate: d.despatchDate.toISOString().slice(0, 10),
      status: d.status,
    },
  }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/dispatch" label="Despatch" title="Courier DC (new)" />
      <DocScreen
        config={toScreenConfig(courierDcConfig)}
        mode="new"
        viewRoutePattern="/pieces/despatch/[id]"
      />
      <RecentDocsTable
        title="Recent courier despatches"
        columns={courierDcConfig.listColumns}
        rows={rows}
        hrefBase="/pieces/despatch"
        empty="No courier DCs yet — despatch the first consignment above."
      />
    </div>
  )
}
