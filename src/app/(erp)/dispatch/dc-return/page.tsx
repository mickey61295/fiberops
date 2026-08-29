/**
 * /dispatch/dc-return — DC Return (SPEC-M6 §2 row 32, legacy FrmFabDel_Return /
 * FrmAccDel_Return / RPtFabDcRet). GRN VARIANT: grnType='process_return'
 * against a DC (RTN-####; partyDcRef = the DC no) — books material that went
 * out on a DC back INTO stock (process_receipt IN per line). Views reuse
 * /procurement/grn/[id] (a return IS a GRN row).
 */
import { db } from '@/lib/db'
import { dcReturnConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function DcReturnPage() {
  const recent = await db.gRN.findMany({
    where: { grnNo: { startsWith: 'RTN-' } },
    orderBy: { grnDate: 'desc' },
    take: dcReturnConfig.recentCount ?? 20,
    include: { party: true },
  })
  const rows = recent.map((g) => ({
    id: g.id,
    cells: {
      grnNo: g.grnNo,
      docNo: g.docNo ?? '—',
      partyName: g.party?.name ?? '—',
      totalQty: String(g.totalQty),
      grnDate: g.grnDate.toISOString().slice(0, 10),
    },
  }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/dispatch" label="Despatch" title="DC Return (new)" />
      <DocScreen
        config={toScreenConfig(dcReturnConfig)}
        mode="new"
        viewRoutePattern="/procurement/grn/[id]"
      />
      <RecentDocsTable
        title="Recent DC returns"
        columns={dcReturnConfig.listColumns}
        rows={rows}
        hrefBase="/procurement/grn"
        empty="No DC returns yet — book the first return above."
      />
    </div>
  )
}
