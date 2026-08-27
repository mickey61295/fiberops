/**
 * /pieces/finished-goods — Finished Goods Entry (SPEC-M5 §7-B-8, item
 * 'finished-goods-entry', legacy FrmFinishGoodsEntry). VARIANT config over
 * planFinishedGoods (deptCode D5 Finishing default injected). Views reuse
 * /production/entry/[id] (a finished-goods entry IS a ProductionEntry).
 * ?order=SO-… prefill from the Order Hub; recent list narrows to D5 entries.
 */
import { db } from '@/lib/db'
import { finishedGoodsConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function FinishedGoodsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const order = typeof sp.order === 'string' ? sp.order : undefined
  // narrow to the Finishing dept (the variant discriminator; §7-B-8)
  const finDept = await db.department.findUnique({ where: { code: 'D5' } })
  const recent = finDept
    ? await db.productionEntry.findMany({
        where: { rework: false, deptId: finDept.id },
        orderBy: { prodDate: 'desc' },
        take: finishedGoodsConfig.recentCount ?? 20,
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
      <DocBreadcrumb href="/pieces/despatch" label="Pieces" title="Finished Goods Entry (new)" />
      <DocScreen
        config={toScreenConfig(finishedGoodsConfig)}
        mode="new"
        viewRoutePattern="/production/entry/[id]"
        prefill={order ? { orderNo: order } : undefined}
        chainCtx={order ? { orderNo: order } : undefined}
      />
      <RecentDocsTable
        title="Recent finished-goods entries (Finishing dept)"
        columns={finishedGoodsConfig.listColumns}
        rows={rows}
        hrefBase="/production/entry"
        empty="No finished-goods entries yet — post the first bundle above."
      />
    </div>
  )
}
