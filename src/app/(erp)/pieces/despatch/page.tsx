/**
 * /pieces/despatch — Pcs DC Despatch (SPEC-M3 §8 row 13, item 'pcs-dc').
 * DocScreen New mode (header + style×colour×size line grid) + recent DCs.
 * Form door → planPcsDespatch — the same service as create_pcs_despatch
 * (ADR-001). PcsDespatch carries NO order/buyer relations (reconstructed
 * schema) — orderNo/buyer resolve through a separate order lookup.
 * ?order=SO-… prefills orderNo.
 */
import { db } from '@/lib/db'
import { despatchConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function PcsDespatchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const order = typeof sp.order === 'string' ? sp.order : undefined
  const recent = await db.pcsDespatch.findMany({
    orderBy: { despatchDate: 'desc' },
    take: despatchConfig.recentCount ?? 20,
  })
  const orderIds = [...new Set(recent.map((x) => x.orderId).filter((x): x is string => !!x))]
  const orders = orderIds.length
    ? await db.order.findMany({ where: { id: { in: orderIds } }, include: { buyer: true } })
    : []
  const orderMap = new Map(orders.map((o) => [o.id, o]))
  const rows = recent.map((dc) => ({
    id: dc.id,
    cells: {
      dcNo: dc.dcNo,
      orderNo: dc.orderId ? orderMap.get(dc.orderId)?.orderNo ?? '—' : '—',
      buyerName: dc.orderId ? orderMap.get(dc.orderId)?.buyer?.name ?? '—' : '—',
      totalPcs: (dc.totalPcs || 0).toLocaleString('en-IN'),
      despatchDate: dc.despatchDate ? dc.despatchDate.toISOString().slice(0, 10) : '—',
      vehicleNo: dc.vehicleNo ?? '—',
      status: dc.status,
    },
  }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/" label="Home" title="Pcs DC (new)" />
      <DocScreen
        config={toScreenConfig(despatchConfig)}
        mode="new"
        viewRoutePattern="/pieces/despatch/[id]"
        prefill={order ? { orderNo: order } : undefined}
        chainCtx={order ? { orderNo: order } : undefined}
      />
      <RecentDocsTable
        title="Recent despatch DCs"
        columns={despatchConfig.listColumns}
        rows={rows}
        hrefBase="/pieces/despatch"
        empty="No despatch DCs yet — despatch finished goods above."
      />
    </div>
  )
}
