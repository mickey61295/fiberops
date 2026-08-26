/**
 * /pieces/rejection — Pcs Rejection (SPEC-M3 §8 row 12, item 'pcs-rejection').
 * DocScreen New mode + recent rejections. Form door → planRejection — the
 * same service as post_rejection (ADR-001). ?order=SO-… prefills orderNo.
 */
import { db } from '@/lib/db'
import { rejectionConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function PcsRejectionPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const order = typeof sp.order === 'string' ? sp.order : undefined
  const recent = await db.rejectionEntry.findMany({
    orderBy: { rejDate: 'desc' },
    take: rejectionConfig.recentCount ?? 20,
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
      <DocBreadcrumb href="/pieces/despatch" label="Pieces" title="Pcs Rejection (new)" />
      <DocScreen
        config={toScreenConfig(rejectionConfig)}
        mode="new"
        viewRoutePattern="/pieces/rejection/[id]"
        prefill={order ? { orderNo: order } : undefined}
        chainCtx={order ? { orderNo: order } : undefined}
      />
      <RecentDocsTable
        title="Recent rejections"
        columns={rejectionConfig.listColumns}
        rows={rows}
        hrefBase="/pieces/rejection"
        empty="No rejections yet — post the first one above."
      />
    </div>
  )
}
