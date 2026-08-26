/**
 * /procurement/po — Purchase Order (SPEC-M3 §8 row 4, item 'purchase-order').
 * DocScreen New mode + recent POs. Form door → planPurchaseOrder — the same
 * service as create_purchase_order (ADR-001). Line grid's item picker is
 * TYPED per row (itemType cell → yarn/fabric/accessory master).
 */
import { db } from '@/lib/db'
import { purchaseOrderConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function PurchaseOrderPage() {
  const recent = await db.purchaseOrder.findMany({
    orderBy: { createdAt: 'desc' },
    take: purchaseOrderConfig.recentCount ?? 20,
    include: { party: true },
  })
  const rows = recent.map((p) => ({
    id: p.id,
    cells: {
      poNo: p.poNo,
      poType: p.poType,
      partyName: p.party?.name ?? '—',
      totalQty: (p.totalQty || 0).toLocaleString('en-IN'),
      totalValue: `₹${(p.totalValue || 0).toLocaleString('en-IN')}`,
      deliveryDate: p.deliveryDate ? p.deliveryDate.toISOString().slice(0, 10) : '—',
      status: p.status,
    },
  }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/procurement" label="Procurement" title="Purchase Order (new)" />
      <DocScreen config={toScreenConfig(purchaseOrderConfig)} mode="new" viewRoutePattern="/procurement/po/[id]" />
      <RecentDocsTable
        title="Recent purchase orders"
        columns={purchaseOrderConfig.listColumns}
        rows={rows}
        hrefBase="/procurement/po"
        empty="No purchase orders yet — create the first one above."
      />
    </div>
  )
}
