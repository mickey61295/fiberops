/**
 * /procurement/supplier-orders — Supplier Orders (SPEC-M5 §7-A-5, item
 * 'supplier-orders', legacy FrmSuppOrdSheet_Semi family). VARIANT config over
 * planPurchaseOrder (poType='general' injected). Views reuse /procurement/po/[id]
 * (same PO family). ?order=SO-… links from the Order Hub.
 */
import { db } from '@/lib/db'
import { supplierOrderConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function SupplierOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const recent = await db.purchaseOrder.findMany({
    orderBy: { orderDate: 'desc' },
    take: supplierOrderConfig.recentCount ?? 20,
    include: { party: true },
  })
  const rows = recent.map((p) => ({
    id: p.id,
    cells: {
      poNo: p.poNo,
      poType: p.poType,
      partyName: p.party?.name ?? '—',
      totalQty: (p.totalQty || 0).toLocaleString('en-IN'),
      totalValue: (p.totalValue || 0).toLocaleString('en-IN'),
      deliveryDate: p.deliveryDate ? new Date(p.deliveryDate).toISOString().slice(0, 10) : '—',
      status: p.status,
    },
  }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/procurement" label="Procurement" title="Supplier Orders (new)" />
      <DocScreen
        config={toScreenConfig(supplierOrderConfig)}
        mode="new"
        viewRoutePattern="/procurement/po/[id]"
      />
      <RecentDocsTable
        title="Recent supplier orders"
        columns={supplierOrderConfig.listColumns}
        rows={rows}
        hrefBase="/procurement/po"
        empty="No supplier orders yet — place the first one above."
      />
    </div>
  )
}
