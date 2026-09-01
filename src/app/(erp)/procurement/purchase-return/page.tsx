/**
 * /procurement/purchase-return — Purchase Return new-doc screen (SPEC-M41
 * PRC-03, item 'purchase-return', legacy FrmPurchaseReturn, PRN-####).
 * DocScreen New mode + recent returns. Form door → planPurchaseReturn — the
 * same service as the create_purchase_return agent tool (ADR-001). PRN rows
 * live on the GRN table (grnType='purchase_return'); the recent table shows
 * only that family.
 */
import { db } from '@/lib/db'
import { purchaseReturnConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function PurchaseReturnPage() {
  const recent = await db.gRN.findMany({
    where: { grnType: 'purchase_return' },
    orderBy: { grnDate: 'desc' },
    take: purchaseReturnConfig.recentCount ?? 20,
  })
  const partyIds = [...new Set(recent.map((g) => g.partyId))]
  const parties = partyIds.length ? await db.party.findMany({ where: { id: { in: partyIds } }, select: { id: true, name: true } }) : []
  const partyMap = new Map(parties.map((p) => [p.id, p.name]))
  const rows = recent.map((g) => ({
    id: g.id,
    cells: {
      grnNo: g.grnNo,
      docNo: g.docNo ?? '—',
      partyName: partyMap.get(g.partyId) ?? '—',
      totalQty: String(g.totalQty),
      totalValue: (g.totalValue || 0).toLocaleString('en-IN'),
      grnDate: g.grnDate.toISOString().slice(0, 10),
    },
  }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/procurement" label="Procurement" title="Purchase Return (new)" />
      <DocScreen
        config={toScreenConfig(purchaseReturnConfig)}
        mode="new"
        viewRoutePattern="/procurement/grn/[id]"
      />
      <RecentDocsTable
        title="Recent purchase returns"
        columns={purchaseReturnConfig.listColumns}
        rows={rows}
        hrefBase="/procurement/grn"
        empty="No purchase returns yet — return rejected goods against a GRN above."
      />
    </div>
  )
}
