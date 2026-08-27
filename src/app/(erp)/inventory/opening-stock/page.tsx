/**
 * /inventory/opening-stock — Opening Stock (SPEC-M6 §2 row 21, legacy
 * frmOpeningStock / frmOpeningStock_CompWise). stock-adj VARIANT: OPN-####
 * docNo space, action='add' + reason='Opening stock' fixed (the wrapper
 * injects; planStockAdjustment stays VERBATIM). NO [id] view — the
 * StockLedger rows ARE the record (the stock-adjustment pattern).
 */
import { db } from '@/lib/db'
import { openingStockConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function OpeningStockPage() {
  const recent = await db.stockLedger.findMany({
    where: { docNo: { startsWith: 'OPN-' } },
    orderBy: { docDate: 'desc' },
    take: openingStockConfig.recentCount ?? 20,
    include: { godown: true },
  })
  // id maps for item codes (relation-less itemId — PITFALLS #21)
  const byType: Record<string, Set<string>> = {}
  for (const r of recent) (byType[r.itemType] ??= new Set()).add(r.itemId)
  const codeMaps: Record<string, Map<string, string>> = {}
  for (const [t, ids] of Object.entries(byType)) {
    const model = (db as any)[t]
    if (model && ids.size) {
      const items = await model.findMany({ where: { id: { in: [...ids] } }, select: { id: true, code: true } })
      codeMaps[t] = new Map(items.map((i: { id: string; code: string }) => [i.id, i.code]))
    }
  }
  const rows = recent.map((r) => ({
    id: r.id,
    cells: {
      docNo: r.docNo ?? '—',
      itemType: r.itemType,
      itemCode: codeMaps[r.itemType]?.get(r.itemId) ?? r.itemId,
      godownName: r.godown?.code ?? '—',
      qty: (r.inKgs || r.inPcs || 0).toLocaleString('en-IN') + (r.inPcs ? ' pcs' : ' kgs'),
      docDate: r.docDate ? r.docDate.toISOString().slice(0, 10) : '—',
    },
  }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/inventory" label="Inventory" title="Opening Stock (new)" />
      <DocScreen config={toScreenConfig(openingStockConfig)} mode="new" />
      <RecentDocsTable
        title="Recent opening balances"
        columns={openingStockConfig.listColumns}
        rows={rows}
        empty="No opening balances yet — onboard the first godown/item above."
      />
    </div>
  )
}
