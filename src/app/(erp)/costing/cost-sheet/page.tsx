/**
 * /costing/cost-sheet — Cost Sheet (SPEC-M3 §8 row 18, item 'cost-sheet').
 * DocScreen New mode + recent sheets. Form door → planCostSheet — the same
 * service as create_cost_sheet (ADR-001). ?order=SO-… prefills orderNo.
 * Chain step 14 of 15. Version auto-increments per order (no doc number).
 */
import { db } from '@/lib/db'
import { costSheetConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function CostSheetPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const order = typeof sp.order === 'string' ? sp.order : undefined
  const recent = await db.costSheet.findMany({
    orderBy: { createdAt: 'desc' },
    take: costSheetConfig.recentCount ?? 20,
    include: { order: true },
  })
  const rows = recent.map((c) => ({
    id: c.id,
    cells: {
      orderNo: c.order?.orderNo ?? '—',
      version: `v${c.version}`,
      totalCost: (c.totalCost || 0).toLocaleString('en-IN'),
      sellingPrice: (c.sellingPrice || 0).toLocaleString('en-IN'),
      createdAt: c.createdAt ? c.createdAt.toISOString().slice(0, 10) : '—',
    },
  }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/costing" label="Costing" title="Cost Sheet (new)" />
      <DocScreen
        config={toScreenConfig(costSheetConfig)}
        mode="new"
        viewRoutePattern="/costing/cost-sheet/[id]"
        prefill={order ? { orderNo: order } : undefined}
        chainCtx={order ? { orderNo: order } : undefined}
      />
      <RecentDocsTable
        title="Recent cost sheets"
        columns={costSheetConfig.listColumns}
        rows={rows}
        hrefBase="/costing/cost-sheet"
        empty="No cost sheets yet — create the first one above."
      />
    </div>
  )
}
