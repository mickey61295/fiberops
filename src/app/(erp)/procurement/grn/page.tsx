/**
 * /procurement/grn — GRN Entry (SPEC-M3 §8 row 5, item 'grn-entry').
 * Header-only DocScreen (single qty against the PO's first line — the service
 * owns rate/uom derivation). Form door → planGrn — the same service as
 * receive_grn (ADR-001). ?po=PO-Y-001 prefills poNo (W1 chain-bar CTA target).
 */
import { db } from '@/lib/db'
import { grnConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function GrnPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const po = typeof sp.po === 'string' ? sp.po : undefined
  const recent = await db.gRN.findMany({
    orderBy: { grnDate: 'desc' },
    take: grnConfig.recentCount ?? 20,
    include: { po: true, party: true, godown: true },
  })
  const rows = recent.map((g) => ({
    id: g.id,
    cells: {
      grnNo: g.grnNo,
      poNo: g.po?.poNo ?? '—',
      partyName: g.party?.name ?? '—',
      godownName: g.godown?.name ?? g.godown?.code ?? '—',
      totalQty: (g.totalQty || 0).toLocaleString('en-IN'),
      totalValue: `₹${(g.totalValue || 0).toLocaleString('en-IN')}`,
      grnDate: g.grnDate ? g.grnDate.toISOString().slice(0, 10) : '—',
    },
  }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/procurement" label="Procurement" title="GRN Entry (new)" />
      <DocScreen
        config={toScreenConfig(grnConfig)}
        mode="new"
        viewRoutePattern="/procurement/grn/[id]"
        prefill={po ? { poNo: po } : undefined}
        chainCtx={po ? { poNo: po } : undefined}
      />
      <RecentDocsTable
        title="Recent GRNs"
        columns={grnConfig.listColumns}
        rows={rows}
        hrefBase="/procurement/grn"
        empty="No GRNs yet — receive against a PO above."
      />
    </div>
  )
}
