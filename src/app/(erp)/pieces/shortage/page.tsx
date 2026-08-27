/**
 * /pieces/shortage — Pcs Shortage (SPEC-M5 §7-B-17, item 'pcs-shortage',
 * legacy frmPcsShort / frmShortage family). VARIANT config over planRejection
 * injecting rejType='shortage' (missing pcs found at despatch/packing —
 * written off). Views reuse /pieces/rejection/[id]; recent list narrows to
 * the shortage type.
 */
import { db } from '@/lib/db'
import { pcsShortageConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function PcsShortagePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const order = typeof sp.order === 'string' ? sp.order : undefined
  const recent = await db.rejectionEntry.findMany({
    where: { rejType: 'shortage' },
    orderBy: { rejDate: 'desc' },
    take: pcsShortageConfig.recentCount ?? 20,
    include: { order: true },
  })
  const rows = recent.map((r) => ({
    id: r.id,
    cells: {
      rejNo: r.rejNo,
      orderNo: r.order?.orderNo ?? '—',
      qty: (r.qty || 0).toLocaleString('en-IN'),
      rejType: r.rejType,
      action: r.action,
      rejDate: r.rejDate ? r.rejDate.toISOString().slice(0, 10) : '—',
    },
  }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/pieces/despatch" label="Pieces" title="Pcs Shortage (new)" />
      <DocScreen
        config={toScreenConfig(pcsShortageConfig)}
        mode="new"
        viewRoutePattern="/pieces/rejection/[id]"
        prefill={order ? { orderNo: order } : undefined}
      />
      <RecentDocsTable
        title="Recent shortages"
        columns={pcsShortageConfig.listColumns}
        rows={rows}
        hrefBase="/pieces/rejection"
        empty="No shortages recorded yet — record the first missing batch above."
      />
    </div>
  )
}
