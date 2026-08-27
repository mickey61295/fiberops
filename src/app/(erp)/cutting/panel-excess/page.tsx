/**
 * /cutting/panel-excess — Panel Excess (SPEC-M5 §7-B-14, item 'panel-excess',
 * legacy FrmPanelExcessEntry family). VARIANT config over planOperationEntry
 * with the D3 Cutting default injected — the EXCESS dimension is the dedicated
 * screen + qty label (excess pcs vs plan). Views reuse /production/entry/[id].
 */
import { db } from '@/lib/db'
import { panelExcessConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function PanelExcessPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const order = typeof sp.order === 'string' ? sp.order : undefined
  // narrow to the Cutting dept (the variant discriminator; §7-B-14)
  const cutDept = await db.department.findUnique({ where: { code: 'D3' } })
  const recent = cutDept
    ? await db.productionEntry.findMany({
        where: { rework: false, deptId: cutDept.id },
        orderBy: { prodDate: 'desc' },
        take: panelExcessConfig.recentCount ?? 20,
        include: { order: true, department: true, operator: true },
      })
    : []
  const rows = recent.map((e) => ({
    id: e.id,
    cells: {
      orderNo: e.order?.orderNo ?? '—',
      deptName: e.department?.name ?? e.department?.code ?? '—',
      prodDate: e.prodDate ? e.prodDate.toISOString().slice(0, 10) : '—',
      bundleNo: e.bundleNo ?? '—',
      operatorName: e.operator?.name ?? '—',
      qty: (e.qty || 0).toLocaleString('en-IN'),
      amount: `₹${(e.amount || 0).toLocaleString('en-IN')}`,
    },
  }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/cutting" label="Cutting" title="Panel Excess Entry (new)" />
      <DocScreen
        config={toScreenConfig(panelExcessConfig)}
        mode="new"
        viewRoutePattern="/production/entry/[id]"
        prefill={order ? { orderNo: order } : undefined}
      />
      <RecentDocsTable
        title="Recent excess entries (Cutting dept)"
        columns={panelExcessConfig.listColumns}
        rows={rows}
        hrefBase="/production/entry"
        empty="No excess entries yet — record the first over-production above."
      />
    </div>
  )
}
