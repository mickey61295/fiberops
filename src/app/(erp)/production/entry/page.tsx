/**
 * /production/entry — Production Entry (SPEC-M3 §8 row 10, item
 * 'production-entry'). DocScreen New mode + recent GOOD output entries
 * (rework=false; rework lives at /production/rework). Form door →
 * planProductionEntry — the same service as post_production_entry (ADR-001).
 */
import { db } from '@/lib/db'
import { productionConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'
import { KeypadMode } from '@/components/erp/keypad-mode'
import { keypadFieldsFor } from '@/lib/erp/keypad'

export const dynamic = 'force-dynamic'

export default async function ProductionEntryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const order = typeof sp.order === 'string' ? sp.order : undefined
  // SPEC-M22 — keypad-operator surface (stripped full-screen, big targets)
  if (sp.mode === 'keypad') {
    return <KeypadMode slug="production" title="Production Tally" fields={keypadFieldsFor(productionConfig)} exitHref="/production/entry" />
  }
  const recent = await db.productionEntry.findMany({
    where: { rework: false },
    orderBy: { prodDate: 'desc' },
    take: productionConfig.recentCount ?? 20,
    include: { order: true, department: true, operator: true },
  })
  const rows = recent.map((e) => ({
    id: e.id,
    cells: {
      orderNo: e.order?.orderNo ?? '—',
      deptName: e.department?.name ?? e.department?.code ?? '—',
      prodDate: e.prodDate ? e.prodDate.toISOString().slice(0, 10) : '—',
      bundleNo: e.bundleNo ?? '—',
      operatorName: e.operator?.name ?? '—',
      qty: (e.qty || 0).toLocaleString('en-IN'),
      rate: (e.rate || 0).toLocaleString('en-IN'),
      amount: `₹${(e.amount || 0).toLocaleString('en-IN')}`,
    },
  }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/production" label="Production" title="Production Entry (new)" />
      {/* SPEC-M22 — the operator door into the keypad surface (URL is QR-able) */}
      <div className="flex justify-end">
        <a href="/production/entry?mode=keypad" className="text-xs text-emerald-700 underline" data-testid="keypad-toggle">⌨ Keypad mode
        </a>
      </div>
      <DocScreen
        config={toScreenConfig(productionConfig)}
        mode="new"
        viewRoutePattern="/production/entry/[id]"
        prefill={order ? { orderNo: order } : undefined}
        chainCtx={order ? { orderNo: order } : undefined}
      />
      <RecentDocsTable
        title="Recent production entries"
        columns={productionConfig.listColumns}
        rows={rows}
        hrefBase="/production/entry"
        empty="No production entries yet — post the first bundle above."
      />
    </div>
  )
}
