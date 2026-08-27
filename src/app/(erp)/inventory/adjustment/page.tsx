/**
 * /inventory/adjustment — Stock Adjustment (SPEC-M3 §8 row 19, item
 * 'stock-adjustment'). DocScreen New mode over the NEW post_stock_adjustment
 * service (Wave D tool). NO [id] view — the StockLedger rows ARE the record
 * (documented deviation, same pattern as rework). StockLedger.itemId carries
 * no relation to the item masters (PITFALLS #21) — codes resolved via id maps.
 */
import { db } from '@/lib/db'
import { stockAdjustmentConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function StockAdjustmentPage() {
  const recent = await db.stockLedger.findMany({
    where: { txnType: { in: ['stock_adjustment_add', 'stock_adjustment_less'] } },
    orderBy: { docDate: 'desc' },
    take: stockAdjustmentConfig.recentCount ?? 20,
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
      qty: `${r.txnType === 'stock_adjustment_add' ? '+' : '−'}${(r.inKgs || r.outKgs || r.inPcs || r.outPcs || 0).toLocaleString('en-IN')}${r.inPcs || r.outPcs ? ' pcs' : ' kgs'}`,
      reason: r.notes ?? '—',
      docDate: r.docDate ? r.docDate.toISOString().slice(0, 10) : '—',
    },
  }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/inventory" label="Inventory" title="Stock Adjustment (new)" />
      <DocScreen
        config={toScreenConfig(stockAdjustmentConfig)}
        mode="new"
      />
      <RecentDocsTable
        title="Recent adjustments"
        columns={stockAdjustmentConfig.listColumns}
        rows={rows}
        empty="No adjustments yet — post the first one above."
      />
    </div>
  )
}
