/**
 * /jobwork/receipt — Jobwork Receipt in (SPEC-M3 §8 row 7, item
 * 'jobwork-receipt'). UPDATE-only op: dcNo references an EXISTING DC (no new
 * document, no number prefix — ERRATUM 4). Form door → planJobworkIn — the
 * same service as receive_jobwork (ADR-001). The recent table lists DCs with
 * a per-row "Receive" action that prefills the form (?dcNo=…).
 */
import { db } from '@/lib/db'
import { jobworkInConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function JobworkReceiptPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const dcNo = typeof sp.dcNo === 'string' ? sp.dcNo : undefined
  const recent = await db.jobworkOrder.findMany({
    orderBy: { outDate: 'desc' },
    take: jobworkInConfig.recentCount ?? 20,
    include: { jobworker: true },
  })
  const rows = recent.map((j) => ({
    id: j.id,
    cells: {
      dcNo: j.dcNo,
      processType: j.processType,
      jobworkerName: j.jobworker?.name ?? '—',
      totalQty: (j.totalQty || 0).toLocaleString('en-IN'),
      outDate: j.outDate ? j.outDate.toISOString().slice(0, 10) : '—',
      status: j.status,
    },
    actionHref: j.status === 'sent' ? `/jobwork/receipt?dcNo=${encodeURIComponent(j.dcNo)}` : undefined,
  }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/jobwork/order" label="Jobwork" title="Jobwork Receipt (in)" />
      <DocScreen
        config={toScreenConfig(jobworkInConfig)}
        mode="new"
        viewRoutePattern="/jobwork/order/[id]"
        prefill={dcNo ? { dcNo } : undefined}
        chainCtx={dcNo ? { dcNo } : undefined}
      />
      <RecentDocsTable
        title="Jobwork DCs — open first"
        columns={jobworkInConfig.listColumns}
        rows={rows}
        hrefBase="/jobwork/order"
        empty="No jobwork DCs yet — send work out from Jobwork Order first."
        actionLabel="Receive"
      />
    </div>
  )
}
