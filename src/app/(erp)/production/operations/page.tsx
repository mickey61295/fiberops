/**
 * /production/operations — Operation Entry (SPEC-M5 §7-B-9, item
 * 'operation-entry', legacy FrmOperationEntry / Frm_SubProcess). VARIANT
 * config over planOperationEntry (deptCode D4 Sewing default injected).
 * Views reuse /production/entry/[id]; recent list narrows to D4 entries.
 */
import { db } from '@/lib/db'
import { operationEntryConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function OperationEntryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const order = typeof sp.order === 'string' ? sp.order : undefined
  // narrow to the Sewing dept (the variant discriminator; §7-B-9)
  const sewDept = await db.department.findUnique({ where: { code: 'D4' } })
  const recent = sewDept
    ? await db.productionEntry.findMany({
        where: { rework: false, deptId: sewDept.id },
        orderBy: { prodDate: 'desc' },
        take: operationEntryConfig.recentCount ?? 20,
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
      <DocBreadcrumb href="/production" label="Production" title="Operation Entry (new)" />
      <DocScreen
        config={toScreenConfig(operationEntryConfig)}
        mode="new"
        viewRoutePattern="/production/entry/[id]"
        prefill={order ? { orderNo: order } : undefined}
        chainCtx={order ? { orderNo: order } : undefined}
      />
      <RecentDocsTable
        title="Recent operation entries (Sewing dept)"
        columns={operationEntryConfig.listColumns}
        rows={rows}
        hrefBase="/production/entry"
        empty="No operation entries yet — post the first sub-process above."
      />
    </div>
  )
}
