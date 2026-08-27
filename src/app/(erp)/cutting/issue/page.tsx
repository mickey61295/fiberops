/**
 * /cutting/issue — Cutting Issue (SPEC-M6 §2 row 22, legacy frmCuttingIssue).
 * line-issue VARIANT: the line must belong to the Cutting department (D3) —
 * the wrapper VALIDATES line.deptId and rejects sewing lines (use
 * /production/issue for those). Ledger effect rides planLineIssue unchanged
 * (ready_to_cut_out of G1). Views reuse /production/issue/[id].
 */
import { db } from '@/lib/db'
import { cuttingIssueConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'
import { STAGE_DEPT } from '@/lib/erp/legacy-enums'

export const dynamic = 'force-dynamic'

export default async function CuttingIssuePage() {
  const cutDept = await db.department.findUnique({ where: { code: STAGE_DEPT.cutting } })
  const recent = await db.lineIssue.findMany({
    ...(cutDept ? { where: { line: { deptId: cutDept.id } } } : {}),
    orderBy: { issueDate: 'desc' },
    take: cuttingIssueConfig.recentCount ?? 20,
    include: { line: true, order: true },
  })
  const rows = recent.map((li) => ({
    id: li.id,
    cells: {
      issueNo: li.issueNo,
      orderNo: li.order?.orderNo ?? '—',
      lineCode: li.line?.code ?? '—',
      qty: String(li.qty),
      issueDate: li.issueDate.toISOString().slice(0, 10),
      status: li.status,
    },
  }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/cutting" label="Cutting" title="Cutting Issue (new)" />
      <DocScreen
        config={toScreenConfig(cuttingIssueConfig)}
        mode="new"
        viewRoutePattern="/production/issue/[id]"
      />
      <RecentDocsTable
        title="Recent cutting issues"
        columns={cuttingIssueConfig.listColumns}
        rows={rows}
        hrefBase="/production/issue"
        empty="No cutting issues yet — issue the first fabric rolls above (the line must belong to the Cutting department)."
      />
    </div>
  )
}
