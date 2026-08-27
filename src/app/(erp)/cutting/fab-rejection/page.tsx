/**
 * /cutting/fab-rejection — Fabric Rejection Return (SPEC-M5 §7-B-16, item
 * 'fabric-rejection-return', legacy FrmCutting_FabRej). VARIANT config over
 * planRejection injecting rejType='fabric' + action='return_to_party' (stock
 * moves OUT of G2 — rejected fabric goes back to the party). Views reuse
 * /pieces/rejection/[id]; recent list narrows to the fabric/return subset.
 */
import { db } from '@/lib/db'
import { fabricRejectionReturnConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function FabricRejectionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const order = typeof sp.order === 'string' ? sp.order : undefined
  const recent = await db.rejectionEntry.findMany({
    where: { rejType: 'fabric', action: 'return_to_party' },
    orderBy: { rejDate: 'desc' },
    take: fabricRejectionReturnConfig.recentCount ?? 20,
    include: { order: true },
  })
  const rows = recent.map((r) => ({
    id: r.id,
    cells: {
      rejNo: r.rejNo,
      orderNo: r.order?.orderNo ?? '—',
      qty: (r.qty || 0).toLocaleString('en-IN'),
      rejType: r.rejType,
      action: r.action,
      rejDate: r.rejDate ? r.rejDate.toISOString().slice(0, 10) : '—',
    },
  }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/cutting" label="Cutting" title="Fabric Rejection Return (new)" />
      <DocScreen
        config={toScreenConfig(fabricRejectionReturnConfig)}
        mode="new"
        viewRoutePattern="/pieces/rejection/[id]"
        prefill={order ? { orderNo: order } : undefined}
      />
      <RecentDocsTable
        title="Recent fabric rejection returns"
        columns={fabricRejectionReturnConfig.listColumns}
        rows={rows}
        hrefBase="/pieces/rejection"
        empty="No fabric rejection returns yet — record the first return above."
      />
    </div>
  )
}
