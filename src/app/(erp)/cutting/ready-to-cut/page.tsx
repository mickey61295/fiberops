/**
 * /cutting/ready-to-cut — Ready to Cut (SPEC-M6 §2 row 23, legacy frmReadytoCut).
 * Moves program stock into the virtual Cutting department (PITFALLS #12 legacy
 * DeptID −7 → our dept-keyed CurrentStock bucket in the same godown):
 * ready_to_cut_out (store pool −) + ready_to_cut_in (D3 pool +) sharing one
 * RTC-#### docNo. Total godown stock unchanged — the move is between dept
 * views. NO [id] view — the StockLedger pair IS the record.
 */
import { db } from '@/lib/db'
import { readyToCutConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'
import { STAGE_DEPT } from '@/lib/erp/legacy-enums'

export const dynamic = 'force-dynamic'

export default async function ReadyToCutPage() {
  const cutDept = await db.department.findUnique({ where: { code: STAGE_DEPT.cutting } })
  const recent = await db.stockLedger.findMany({
    where: { txnType: 'ready_to_cut_out', docNo: { startsWith: 'RTC-' } },
    orderBy: { docDate: 'desc' },
    take: readyToCutConfig.recentCount ?? 20,
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
      itemCode: codeMaps[r.itemType]?.get(r.itemId) ?? r.itemId,
      qty: `${(r.outKgs || 0).toLocaleString('en-IN')} kgs`,
      dept: cutDept ? `${cutDept.code} pool` : '—',
      docDate: r.docDate ? r.docDate.toISOString().slice(0, 10) : '—',
    },
  }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/cutting" label="Cutting" title="Ready to Cut (new)" />
      <DocScreen config={toScreenConfig(readyToCutConfig)} mode="new" />
      <RecentDocsTable
        title="Recent ready-to-cut moves"
        columns={readyToCutConfig.listColumns}
        rows={rows}
        empty="No moves yet — push the first program stock into the cutting pool above."
      />
    </div>
  )
}
