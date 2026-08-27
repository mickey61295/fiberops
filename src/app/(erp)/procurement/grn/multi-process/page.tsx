/**
 * /procurement/grn/multi-process — Multi-Process GRN (SPEC-M6 §2 row 19,
 * legacy frmPrsGRNMulti / frmPrsGRNMulti_Compwise). GRN VARIANT: grnType
 * 'process_return' across MULTIPLE component lines in ONE MP-#### GRN; the
 * ledger posts process_delivery OUT per line (the jobwork-pcs-return
 * direction). Views reuse /procurement/grn/[id] (a return IS a GRN row).
 */
import { db } from '@/lib/db'
import { multiProcessGrnConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function MultiProcessGrnPage() {
  const recent = await db.gRN.findMany({
    where: { grnNo: { startsWith: 'MP-' } },
    orderBy: { grnDate: 'desc' },
    take: multiProcessGrnConfig.recentCount ?? 20,
    include: { party: true },
  })
  const rows = recent.map((g) => ({
    id: g.id,
    cells: {
      grnNo: g.grnNo,
      partyName: g.party?.name ?? '—',
      totalQty: String(g.totalQty),
      totalValue: Math.round(g.totalValue).toLocaleString('en-IN'),
      grnType: g.grnType,
      grnDate: g.grnDate.toISOString().slice(0, 10),
    },
  }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/procurement" label="Procurement" title="Multi-Process GRN (new)" />
      <DocScreen
        config={toScreenConfig(multiProcessGrnConfig)}
        mode="new"
        viewRoutePattern="/procurement/grn/[id]"
      />
      <RecentDocsTable
        title="Recent multi-process returns"
        columns={multiProcessGrnConfig.listColumns}
        rows={rows}
        hrefBase="/procurement/grn"
        empty="No multi-process GRNs yet — return the first components above."
      />
    </div>
  )
}
