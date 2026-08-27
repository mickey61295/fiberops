/**
 * /production/entry/[id] — Production Entry view (SPEC-M3 §8 row 10 view mode;
 * ALSO serves rework entries — row 11 — a rework IS a ProductionEntry with
 * rework=true and has no separate view route). Resolves by db id only (no
 * doc number on this model — bundleNo is not unique).
 */
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { productionConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { CHAIN_ORDER_INCLUDE, computeChainState } from '@/lib/erp/chain'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb } from '@/components/erp/recent-docs'
import { DocPrintLink } from '@/components/erp/doc-print-button' // SPEC-M8 §5 (Wave B)

export const dynamic = 'force-dynamic'

export default async function ProductionEntryViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const include = { order: { include: CHAIN_ORDER_INCLUDE }, department: true, operator: true }
  const entry = await db.productionEntry.findUnique({ where: { id }, include }).catch(() => null)
  if (!entry) notFound()

  const d = (dt: Date | null | undefined) => (dt ? new Date(dt).toISOString().slice(0, 10) : '')
  const initial = {
    orderNo: entry.order?.orderNo ?? '',
    deptCode: entry.department?.code ?? '',
    prodDate: d(entry.prodDate),
    bundleNo: entry.bundleNo ?? '',
    operatorCode: entry.operator?.code ?? '',
    qty: entry.qty,
    rate: entry.rate,
    styleNo: entry.styleNo ?? '',
    colourName: '', // service does not store colourName/sizeName (schema-optional)
    sizeName: '',
    lineId: entry.lineId ?? '',
  }
  const state = entry.order ? computeChainState(entry.order) : undefined
  const chainCtx = entry.order ? { orderNo: entry.order.orderNo, id: entry.order.id } : undefined

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <DocBreadcrumb href="/production/entry" label="Production Entries" title={entry.bundleNo ?? 'entry'} />
        <DocPrintLink docType="production-entry" id={entry.id} />
      </div>
      {entry.rework && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">Rework entry</span>
          <span className="text-xs text-slate-500">
            document-only — no stock move ·{' '}
            <Link href="/production/rework" className="text-emerald-700 hover:underline">
              all rework entries
            </Link>
          </span>
        </div>
      )}
      <DocScreen
        config={toScreenConfig(productionConfig)}
        mode="view"
        docNo={entry.bundleNo ?? undefined}
        initial={initial}
        chainState={state}
        chainCtx={chainCtx}
      />
    </div>
  )
}
