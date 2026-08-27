/**
 * /cutting/panel — Panel Cutting / Add (SPEC-M5 §7-B-12, item 'panel-cutting',
 * legacy frmAddPanelCutting). VARIANT config over planCutOrder (the panel
 * "type" rides the labels — the CutOrder family + CUT-#### numbers stay
 * shared, §4 rules). Views reuse /cutting/job-order/[id].
 */
import { db } from '@/lib/db'
import { panelCuttingConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function PanelCuttingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const order = typeof sp.order === 'string' ? sp.order : undefined
  const recent = await db.cutOrder.findMany({
    orderBy: { cutDate: 'desc' },
    take: panelCuttingConfig.recentCount ?? 20,
    include: { order: true, _count: { select: { bundles: true } } },
  })
  const rows = recent.map((c) => ({
    id: c.id,
    cells: {
      cutNo: c.cutNo,
      orderNo: c.order?.orderNo ?? '—',
      cutDate: c.cutDate ? c.cutDate.toISOString().slice(0, 10) : '—',
      fabricIssued: (c.fabricIssued || 0).toLocaleString('en-IN'),
      totalPcs: (c.totalPcs || 0).toLocaleString('en-IN'),
      bundles: String(c._count?.bundles ?? 0),
      status: c.status,
    },
  }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/cutting" label="Cutting" title="Panel Cutting / Add (new)" />
      <DocScreen
        config={toScreenConfig(panelCuttingConfig)}
        mode="new"
        viewRoutePattern="/cutting/job-order/[id]"
        prefill={order ? { orderNo: order } : undefined}
      />
      <RecentDocsTable
        title="Recent cut orders (panel family)"
        columns={panelCuttingConfig.listColumns}
        rows={rows}
        hrefBase="/cutting/job-order"
        empty="No cut orders yet — create the first panel cut above."
      />
    </div>
  )
}
