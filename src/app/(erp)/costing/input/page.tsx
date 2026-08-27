/**
 * /costing/input — Costing Input (SPEC-M5 §7-B-19, item 'costing-input',
 * legacy Frm_CostingInput + multi-level daily variants). Pure VARIANT config
 * over planCostSheet — daily input = version-bump semantics the service
 * already owns. Views reuse /costing/cost-sheet/[id].
 */
import { db } from '@/lib/db'
import { costingInputConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function CostingInputPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const order = typeof sp.order === 'string' ? sp.order : undefined
  const recent = await db.costSheet.findMany({
    orderBy: { createdAt: 'desc' },
    take: costingInputConfig.recentCount ?? 20,
    include: { order: true },
  })
  const rows = recent.map((c) => ({
    id: c.id,
    cells: {
      orderNo: c.order?.orderNo ?? '—',
      version: String(c.version),
      totalCost: (c.totalCost || 0).toLocaleString('en-IN'),
      sellingPrice: (c.sellingPrice || 0).toLocaleString('en-IN'),
      marginPct: String(c.marginPct ?? 0),
      createdAt: c.createdAt ? c.createdAt.toISOString().slice(0, 10) : '—',
    },
  }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/costing" label="Costing" title="Costing Input (daily, new)" />
      <DocScreen
        config={toScreenConfig(costingInputConfig)}
        mode="new"
        viewRoutePattern="/costing/cost-sheet/[id]"
        prefill={order ? { orderNo: order } : undefined}
      />
      <RecentDocsTable
        title="Recent costing inputs (cost-sheet versions)"
        columns={costingInputConfig.listColumns}
        rows={rows}
        hrefBase="/costing/cost-sheet"
        empty="No costing inputs yet — record the first daily cost above."
      />
    </div>
  )
}
