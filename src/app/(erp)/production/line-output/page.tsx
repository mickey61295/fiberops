/**
 * /production/line-output — Line Output (SPEC-M6 §2 row 29, legacy
 * frmLineOutputManual / frmLineOutputManual_New). Production VARIANT: manual
 * tally entry per line (lineId REQUIRED in the variant schema; D4 default).
 * Agent door post_production_entry EXISTS. Views reuse /production/entry/[id].
 */
import { db } from '@/lib/db'
import { lineOutputConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function LineOutputPage() {
  const recent = await db.productionEntry.findMany({
    where: { lineId: { not: null } },
    orderBy: { prodDate: 'desc' },
    take: lineOutputConfig.recentCount ?? 20,
    include: { order: true, department: true, operator: true },
  })
  // lineId is relation-less (PITFALLS #21) — batched id-map for line codes
  const lineIds = [...new Set(recent.map((e) => e.lineId).filter((l): l is string => !!l))]
  const lines = lineIds.length ? await db.line.findMany({ where: { id: { in: lineIds } }, select: { id: true, code: true } }) : []
  const lineById = new Map(lines.map((l) => [l.id, l.code]))
  const rows = recent.map((e) => ({
    id: e.id,
    cells: {
      orderNo: e.order?.orderNo ?? '—',
      lineName: e.lineId ? lineById.get(e.lineId) ?? '—' : '—',
      deptName: e.department?.code ?? '—',
      prodDate: e.prodDate.toISOString().slice(0, 10),
      bundleNo: e.bundleNo ?? '—',
      operatorName: e.operator?.name ?? '—',
      qty: String(e.qty),
      amount: Math.round(e.amount).toLocaleString('en-IN'),
    },
  }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/production" label="Production" title="Line Output (new)" />
      <DocScreen
        config={toScreenConfig(lineOutputConfig)}
        mode="new"
        viewRoutePattern="/production/entry/[id]"
      />
      <RecentDocsTable
        title="Recent line outputs (tally)"
        columns={lineOutputConfig.listColumns}
        rows={rows}
        hrefBase="/production/entry"
        empty="No tally entries yet — post the first line output above."
      />
    </div>
  )
}
