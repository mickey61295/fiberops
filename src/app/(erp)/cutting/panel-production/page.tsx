/**
 * /cutting/panel-production — Panel Production (SPEC-M5 §7-B-13, item
 * 'panel-production', legacy frmProduction_CutPanel). VARIANT config over
 * planOperationEntry with the D3 Cutting default injected. Views reuse
 * /production/entry/[id]; recent list narrows to D3 entries.
 */
import { db } from '@/lib/db'
import { panelProductionConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function PanelProductionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const order = typeof sp.order === 'string' ? sp.order : undefined
  // narrow to the Cutting dept (the variant discriminator; §7-B-13)
  const cutDept = await db.department.findUnique({ where: { code: 'D3' } })
  const recent = cutDept
    ? await db.productionEntry.findMany({
        where: { rework: false, deptId: cutDept.id },
        orderBy: { prodDate: 'desc' },
        take: panelProductionConfig.recentCount ?? 20,
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
      <DocBreadcrumb href="/cutting" label="Cutting" title="Panel Production (new)" />
      <DocScreen
        config={toScreenConfig(panelProductionConfig)}
        mode="new"
        viewRoutePattern="/production/entry/[id]"
        prefill={order ? { orderNo: order } : undefined}
      />
      <RecentDocsTable
        title="Recent panel production entries (Cutting dept)"
        columns={panelProductionConfig.listColumns}
        rows={rows}
        hrefBase="/production/entry"
        empty="No panel production entries yet — post the first panel batch above."
      />
    </div>
  )
}
