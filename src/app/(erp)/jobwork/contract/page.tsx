/**
 * /jobwork/contract — Contract Allotment (SPEC-M5 §7-D-35). The pre-DC
 * record: JobworkOrder rows with status='allotted' (AL-#### placeholder
 * dcNo). Recent list narrows to AL- allotments; rows drill to the jobwork
 * view (/jobwork/order/[id] — W2).
 */
import { db } from '@/lib/db'
import { contractAllotmentConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function ContractAllotmentPage() {
  const recent = await db.jobworkOrder.findMany({
    where: { dcNo: { startsWith: 'AL-' } },
    orderBy: { createdAt: 'desc' },
    take: contractAllotmentConfig.recentCount ?? 20,
    include: { jobworker: true },
  })
  const rows = recent.map((j) => ({
    id: j.id,
    cells: {
      dcNo: j.dcNo,
      jobworkerName: j.jobworker?.name ?? '—',
      processType: j.processType,
      totalQty: String(j.totalQty ?? 0),
      totalValue: (j.totalValue || 0).toLocaleString('en-IN'),
      status: j.status,
      outDate: j.outDate ? j.outDate.toISOString().slice(0, 10) : '—',
    },
  }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/jobwork" label="Jobwork" title="Contract Allotment (new)" />
      <DocScreen
        config={toScreenConfig(contractAllotmentConfig)}
        mode="new"
        viewRoutePattern="/jobwork/order/[id]"
      />
      <RecentDocsTable
        title="Allotted contracts (no DC yet — material still in house)"
        columns={contractAllotmentConfig.listColumns}
        rows={rows}
        hrefBase="/jobwork/order"
        empty="No allotments yet — allot a contract above; issue the JW-#### DC when material leaves."
      />
    </div>
  )
}
