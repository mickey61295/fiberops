/**
 * /inventory/waste-receipt — Waste Receipt (SPEC-M21, legacy
 * FrmWasteReceiptEntry). stock-adj VARIANT: WST-#### docNo space,
 * action='add' fixed, reason composed `Waste — <class>` (the wrapper
 * injects; planStockAdjustment stays VERBATIM). NO [id] view — the
 * StockLedger rows ARE the record (the stock-adjustment deviation pattern).
 * Waste class is carried in the ledger row's notes.
 */
import { db } from '@/lib/db'
import { wasteReceiptConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'
import { KeypadMode } from '@/components/erp/keypad-mode'
import { keypadFieldsFor } from '@/lib/erp/keypad'

export const dynamic = 'force-dynamic'

export default async function WasteReceiptPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  // SPEC-M22 — keypad-operator surface (stripped full-screen, big targets)
  if (sp.mode === 'keypad') {
    return <KeypadMode slug="waste-receipt" title="Waste Receipt" fields={keypadFieldsFor(wasteReceiptConfig)} exitHref="/inventory/waste-receipt" />
  }
  const recent = await db.stockLedger.findMany({
    where: { docNo: { startsWith: 'WST-' } },
    orderBy: { docDate: 'desc' },
    take: wasteReceiptConfig.recentCount ?? 20,
    include: { godown: true },
  })
  // id maps for item codes (relation-less itemId — PITFALLS #21)
  const byType: Record<string, Set<string>> = {}
  for (const r of recent) (byType[r.itemType] ??= new Set()).add(r.itemId)
  const codeMaps: Record<string, Map<string, string>> = {}
  for (const [t, ids] of Object.entries(byType)) {
    const model = (db as any)[t]
    if (model && ids.size) {
      const items = await model.findMany({ where: { id: { in: [...ids] } }, select: { id: true, code: true } })
      codeMaps[t] = new Map(items.map((i: { id: string; code: string }) => [i.id, i.code]))
    }
  }

  const rows = recent.map((r) => ({
    id: r.id,
    cells: {
      docNo: r.docNo ?? '—',
      itemType: r.itemType,
      itemCode: codeMaps[r.itemType]?.get(r.itemId) ?? r.itemId,
      godownName: r.godown?.code ?? '—',
      qty: (r.inKgs || r.inPcs || 0).toLocaleString('en-IN') + (r.inPcs ? ' pcs' : ' kgs'),
      wasteClass: r.notes?.startsWith('Waste — ') ? r.notes.slice('Waste — '.length).split(':')[0] : (r.notes ?? '—'),
      docDate: r.docDate ? r.docDate.toISOString().slice(0, 10) : '—',
    },
  }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/inventory" label="Inventory" title="Waste Receipt (new)" />
      <div className="flex justify-end">
        <a href="/inventory/waste-receipt?mode=keypad" className="text-xs text-emerald-700 underline" data-testid="keypad-toggle">⌨ Keypad mode
        </a>
      </div>
      <DocScreen config={toScreenConfig(wasteReceiptConfig)} mode="new" />
      <RecentDocsTable
        title="Recent waste receipts"
        columns={wasteReceiptConfig.listColumns}
        rows={rows}
        empty="No waste receipts yet — knitting/dyeing/cutting scrap lands here."
      />
    </div>
  )
}
