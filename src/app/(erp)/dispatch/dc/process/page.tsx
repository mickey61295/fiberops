/**
 * /dispatch/dc/process — Process DC multi-component (SPEC-M6 §2 row 31,
 * legacy frmPrsDelMulti / frmPrsDelMulti_Acc / frmPrsDelMulti_Compwise).
 * jobwork-DC VARIANT: PDC-#### space, multi-component lines[] (each line a
 * process_delivery OUT ledger row). Agent door: create_dc (the process flag —
 * lines[] present routes to PDC numbering). Views reuse /jobwork/order/[id].
 */
import { db } from '@/lib/db'
import { processDcConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function ProcessDcPage() {
  const recent = await db.jobworkOrder.findMany({
    where: { dcNo: { startsWith: 'PDC-' } },
    orderBy: { outDate: 'desc' },
    take: processDcConfig.recentCount ?? 20,
    include: { jobworker: true },
  })
  const rows = recent.map((j) => ({
    id: j.id,
    cells: {
      dcNo: j.dcNo,
      partyName: j.jobworker?.name ?? '—',
      processType: j.processType,
      totalQty: String(j.totalQty),
      outDate: j.outDate.toISOString().slice(0, 10),
      status: j.status,
    },
  }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/dispatch" label="Dispatch" title="Process DC (new)" />
      <DocScreen
        config={toScreenConfig(processDcConfig)}
        mode="new"
        viewRoutePattern="/jobwork/order/[id]"
      />
      <RecentDocsTable
        title="Recent process DCs"
        columns={processDcConfig.listColumns}
        rows={rows}
        hrefBase="/jobwork/order"
        empty="No process DCs yet — despatch the first multi-component consignment above."
      />
    </div>
  )
}
