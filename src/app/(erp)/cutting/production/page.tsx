/**
 * /cutting/production — Cutting Production (SPEC-M6 §2 row 24, legacy
 * FrmCuttingProduction_Auto_New). Production VARIANT (D3 Cutting default,
 * chainStage 4) over planOperationEntry — the agent door post_production_entry
 * EXISTS. Views reuse /production/entry/[id] (a variant IS a ProductionEntry).
 */
import { db } from '@/lib/db'
import { cuttingProductionConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'
import { STAGE_DEPT } from '@/lib/erp/legacy-enums'

export const dynamic = 'force-dynamic'

export default async function CuttingProductionPage() {
  const cutDept = await db.department.findUnique({ where: { code: STAGE_DEPT.cutting } })
  const recent = await db.productionEntry.findMany({
    ...(cutDept ? { where: { deptId: cutDept.id } } : {}),
    orderBy: { prodDate: 'desc' },
    take: cuttingProductionConfig.recentCount ?? 20,
    include: { order: true, department: true, operator: true },
  })
  const rows = recent.map((e) => ({
    id: e.id,
    cells: {
      orderNo: e.order?.orderNo ?? '—',
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
      <DocBreadcrumb href="/cutting" label="Cutting" title="Cutting Production (new)" />
      <DocScreen
        config={toScreenConfig(cuttingProductionConfig)}
        mode="new"
        viewRoutePattern="/production/entry/[id]"
      />
      <RecentDocsTable
        title="Recent cutting production"
        columns={cuttingProductionConfig.listColumns}
        rows={rows}
        hrefBase="/production/entry"
        empty="No cutting production yet — post the first cut panel output above."
      />
    </div>
  )
}
