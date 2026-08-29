/**
 * /dispatch/dc — Fabric/Yarn/Acc/Gen DC (SPEC-M6 §2 row 30, legacy FrmFabDel /
 * FrmAccDel / FrmGenDC / FrmYarnDel). jobwork-DC VARIANT generalized: material
 * DC to ANY party w/ process + itemType; MDC-#### space (the DC- space shared
 * with despatch is FORBIDDEN — SPEC-M6 §2). One JobworkOrder row (the DC
 * document) + process_delivery OUT per line. Agent door: create_dc.
 * Views reuse /jobwork/order/[id].
 */
import { db } from '@/lib/db'
import { dcEntryConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function DcEntryPage() {
  const recent = await db.jobworkOrder.findMany({
    where: { dcNo: { startsWith: 'MDC-' } },
    orderBy: { outDate: 'desc' },
    take: dcEntryConfig.recentCount ?? 20,
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
      <DocBreadcrumb href="/dispatch" label="Despatch" title="Material DC (new)" />
      <DocScreen
        config={toScreenConfig(dcEntryConfig)}
        mode="new"
        viewRoutePattern="/jobwork/order/[id]"
      />
      <RecentDocsTable
        title="Recent material DCs"
        columns={dcEntryConfig.listColumns}
        rows={rows}
        hrefBase="/jobwork/order"
        empty="No material DCs yet — despatch the first consignment above."
      />
    </div>
  )
}
