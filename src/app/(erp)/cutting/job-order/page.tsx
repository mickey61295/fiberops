/**
 * /cutting/job-order — Cutting Job Order (SPEC-M3 §8 row 8, item
 * 'cutting-job-order'). DocScreen New mode + recent cuts (bundle counts).
 * Form door → planCutOrder — the same service as create_cut_order (ADR-001).
 * ?order=SO-… prefills orderNo.
 */
import { db } from '@/lib/db'
import { cutConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'
import { KeypadMode } from '@/components/erp/keypad-mode'
import { keypadFieldsFor } from '@/lib/erp/keypad'

export const dynamic = 'force-dynamic'

export default async function CuttingJobOrderPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  // SPEC-M22 — keypad-operator surface (stripped full-screen, big targets)
  if (sp.mode === 'keypad') {
    return <KeypadMode slug="cut" title="Cut Order" fields={keypadFieldsFor(cutConfig)} exitHref="/cutting/job-order" />
  }
  const order = typeof sp.order === 'string' ? sp.order : undefined
  const recent = await db.cutOrder.findMany({
    orderBy: { createdAt: 'desc' },
    take: cutConfig.recentCount ?? 20,
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
      bundles: String(c._count.bundles),
      efficiency: c.efficiency != null ? String(c.efficiency) : '—',
      status: c.status,
    },
  }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/cutting" label="Cutting" title="Cutting Job Order (new)" />
      {/* SPEC-M22 — the operator door into the keypad surface (URL is QR-able) */}
      <div className="flex justify-end">
        <a href="/cutting/job-order?mode=keypad" className="text-xs text-emerald-700 underline" data-testid="keypad-toggle">⌨ Keypad mode
        </a>
      </div>
      <DocScreen
        config={toScreenConfig(cutConfig)}
        mode="new"
        viewRoutePattern="/cutting/job-order/[id]"
        prefill={order ? { orderNo: order } : undefined}
        chainCtx={order ? { orderNo: order } : undefined}
      />
      <RecentDocsTable
        title="Recent cut orders"
        columns={cutConfig.listColumns}
        rows={rows}
        hrefBase="/cutting/job-order"
        empty="No cut orders yet — create the first one above."
      />
    </div>
  )
}
