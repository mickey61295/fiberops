/**
 * /jobwork/pcs-return — Jobwork Pcs Return (SPEC-M5 §7-B-18, item
 * 'jobwork-pcs-return', legacy frmJobWorkPcsReturn). planJobworkPcsReturn
 * creates a process_return GRN + StockLedger OUT of the pcs godown. Views
 * reuse /procurement/grn/[id] (a return IS a GRN row, shared GRN-#### space).
 */
import { db } from '@/lib/db'
import { jobworkPcsReturnConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function JobworkPcsReturnPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const order = typeof sp.order === 'string' ? sp.order : undefined
  const recent = await db.gRN.findMany({
    where: { grnType: 'process_return' },
    orderBy: { grnDate: 'desc' },
    take: jobworkPcsReturnConfig.recentCount ?? 20,
    include: { party: true },
  })
  const rows = recent.map((g) => ({
    id: g.id,
    cells: {
      grnNo: g.grnNo,
      partyName: g.party?.name ?? '—',
      totalQty: (g.totalQty || 0).toLocaleString('en-IN'),
      grnType: g.grnType,
      grnDate: g.grnDate ? g.grnDate.toISOString().slice(0, 10) : '—',
    },
  }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/" label="Home" title="Jobwork Pcs Return (new)" />
      <DocScreen
        config={toScreenConfig(jobworkPcsReturnConfig)}
        mode="new"
        viewRoutePattern="/procurement/grn/[id]"
        prefill={order ? { orderNo: order } : undefined}
      />
      <RecentDocsTable
        title="Recent jobwork pcs returns (process_return GRNs)"
        columns={jobworkPcsReturnConfig.listColumns}
        rows={rows}
        hrefBase="/procurement/grn"
        empty="No pcs returns yet — send the first batch back above."
      />
    </div>
  )
}
