/**
 * /cutting/panel-rework — Panel Rejection / Rework (SPEC-M5 §7-B-15, item
 * 'panel-rej-rework', legacy frmPanelRej / frmPanelDelRework). VARIANT config
 * over planRejection injecting action='rework' (document-only — panels are
 * re-sewn). Views reuse /pieces/rejection/[id]; recent list narrows to the
 * rework action.
 */
import { db } from '@/lib/db'
import { panelRejReworkConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function PanelReworkPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const order = typeof sp.order === 'string' ? sp.order : undefined
  const recent = await db.rejectionEntry.findMany({
    where: { action: 'rework' },
    orderBy: { rejDate: 'desc' },
    take: panelRejReworkConfig.recentCount ?? 20,
    include: { order: true, department: true },
  })
  const rows = recent.map((r) => ({
    id: r.id,
    cells: {
      rejNo: r.rejNo,
      orderNo: r.order?.orderNo ?? '—',
      deptName: r.department?.name ?? r.department?.code ?? '—',
      qty: (r.qty || 0).toLocaleString('en-IN'),
      rejType: r.rejType,
      action: r.action,
      rejDate: r.rejDate ? r.rejDate.toISOString().slice(0, 10) : '—',
    },
  }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/cutting" label="Cutting" title="Panel Rejection / Rework (new)" />
      <DocScreen
        config={toScreenConfig(panelRejReworkConfig)}
        mode="new"
        viewRoutePattern="/pieces/rejection/[id]"
        prefill={order ? { orderNo: order } : undefined}
      />
      <RecentDocsTable
        title="Recent rework rejections"
        columns={panelRejReworkConfig.listColumns}
        rows={rows}
        hrefBase="/pieces/rejection"
        empty="No rework rejections yet — record the first faulty panel batch above."
      />
    </div>
  )
}
