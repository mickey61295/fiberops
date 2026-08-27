/**
 * /pieces/packing-list — Packing List (SPEC-M5 §7-D-29, legacy
 * FrmPackingList family). DocScreen New mode (carton line editor) + recent
 * lists. The [id] view shows the W6 despatch recon (§10).
 */
import { db } from '@/lib/db'
import { packingListConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function PackingListPage() {
  const recent = await db.packingList.findMany({
    orderBy: { createdAt: 'desc' },
    take: packingListConfig.recentCount ?? 20,
    include: { lines: true },
  })
  // despatchId/orderId/buyerId are free FK cols (PITFALLS #21) — id maps
  const orderIds = [...new Set(recent.map((p) => p.orderId).filter((o): o is string => !!o))]
  const buyerIds = [...new Set(recent.map((p) => p.buyerId).filter((b): b is string => !!b))]
  const orders = orderIds.length ? await db.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, orderNo: true } }) : []
  const buyers = buyerIds.length ? await db.buyer.findMany({ where: { id: { in: buyerIds } }, select: { id: true, name: true } }) : []
  const orderById = new Map(orders.map((o) => [o.id, o.orderNo]))
  const buyerById = new Map(buyers.map((b) => [b.id, b.name]))
  const rows = recent.map((p) => ({
    id: p.id,
    cells: {
      packNo: p.packNo,
      orderNo: p.orderId ? orderById.get(p.orderId) ?? '—' : '—',
      buyerName: p.buyerId ? buyerById.get(p.buyerId) ?? '—' : '—',
      totalCartons: String(p.totalCartons),
      totalPcs: String(p.totalPcs),
      netKgs: String(p.netKgs ?? 0),
      status: p.status,
      packDate: p.packDate ? p.packDate.toISOString().slice(0, 10) : '—',
    },
  }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/pieces" label="Pieces" title="Packing List (new)" />
      <DocScreen
        config={toScreenConfig(packingListConfig)}
        mode="new"
        viewRoutePattern="/pieces/packing-list/[id]"
      />
      <RecentDocsTable
        title="Recent packing lists"
        columns={packingListConfig.listColumns}
        rows={rows}
        hrefBase="/pieces/packing-list"
        empty="No packing lists yet — pack the first despatch above."
      />
    </div>
  )
}
