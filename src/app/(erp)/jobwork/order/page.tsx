/**
 * /jobwork/order — Jobwork DC out (SPEC-M3 §8 row 6, item 'jobwork-order').
 * DocScreen New mode + recent DCs. Form door → planJobworkOut — the same
 * service as create_jobwork_order (ADR-001). ?order=SO-… prefills orderNo.
 * NOTE: JobworkOrder.orderId has NO relation on the reconstructed schema —
 * orderNos resolve through a separate order lookup (same pattern as the Hub).
 */
import { db } from '@/lib/db'
import { jobworkOutConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function JobworkOrderPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const order = typeof sp.order === 'string' ? sp.order : undefined
  const recent = await db.jobworkOrder.findMany({
    orderBy: { outDate: 'desc' },
    take: jobworkOutConfig.recentCount ?? 20,
    include: { jobworker: true },
  })
  const orderIds = [...new Set(recent.map((j) => j.orderId).filter((x): x is string => !!x))]
  const orders = orderIds.length
    ? await db.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, orderNo: true } })
    : []
  const orderMap = new Map(orders.map((o) => [o.id, o.orderNo]))
  const rows = recent.map((j) => ({
    id: j.id,
    cells: {
      dcNo: j.dcNo,
      processType: j.processType,
      jobworkerName: j.jobworker?.name ?? '—',
      orderNo: j.orderId ? orderMap.get(j.orderId) ?? '—' : '—',
      totalQty: (j.totalQty || 0).toLocaleString('en-IN'),
      totalValue: `₹${(j.totalValue || 0).toLocaleString('en-IN')}`,
      status: j.status,
    },
  }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/" label="Home" title="Jobwork Order (new)" />
      <DocScreen
        config={toScreenConfig(jobworkOutConfig)}
        mode="new"
        viewRoutePattern="/jobwork/order/[id]"
        prefill={order ? { orderNo: order } : undefined}
        chainCtx={order ? { orderNo: order } : undefined}
      />
      <RecentDocsTable
        title="Recent jobwork DCs"
        columns={jobworkOutConfig.listColumns}
        rows={rows}
        hrefBase="/jobwork/order"
        empty="No jobwork DCs yet — send work out above."
      />
    </div>
  )
}
