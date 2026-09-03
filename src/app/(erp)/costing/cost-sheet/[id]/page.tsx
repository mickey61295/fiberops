/**
 * /costing/cost-sheet/[id] — Cost Sheet view (SPEC-M3 §8 row 18 view mode).
 * Resolves by db id. Chain step 14 of 15 (state from the order include).
 * SPEC-M44 CST-02 — renders the CALCULATOR's line grid (component/bom/manual
 * lines; ids resolved to codes — the PITFALLS #44 id-map reflex, no code
 * columns on the reference tables) + the computed per-pc / margin summary.
 */
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { costSheetConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb } from '@/components/erp/recent-docs'
import { DocPrintLink } from '@/components/erp/doc-print-button' // SPEC-M8 §5 (Wave B)
import { computeChainState, CHAIN_ORDER_INCLUDE } from '@/lib/erp/chain'

export const dynamic = 'force-dynamic'

const ITEM_MODELS: Record<string, string> = { yarn: 'yarn', fabric: 'fabric', accessory: 'accessory' }

export default async function CostSheetViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const include = { order: { include: CHAIN_ORDER_INCLUDE }, lines: { orderBy: { createdAt: 'asc' as const } } }
  const cs = await db.costSheet.findUnique({ where: { id }, include }).catch(() => null)
  if (!cs) notFound()

  // line ids → codes (PITFALLS #44: itemId/componentId resolve via the models)
  const itemIds = [...new Set(cs.lines.filter((l) => l.itemId).map((l) => `${l.itemType}:${l.itemId}`))]
  const codeById = new Map<string, string>()
  for (const key of itemIds) {
    const [itemType, itemId] = key.split(':')
    const model = ITEM_MODELS[itemType]
    const item = model ? await (db as any)[model].findUnique({ where: { id: itemId } }).catch(() => null) : null
    codeById.set(`${itemType}:${itemId}`, item?.code ?? itemId)
  }
  const comps = await db.costComponent.findMany()
  const compCodeById = new Map(comps.map((c) => [c.id, c.code]))

  const initial: Record<string, unknown> = {
    orderNo: cs.order?.orderNo ?? '',
    fabricCost: cs.fabricCost,
    trimCost: cs.trimCost,
    cmCost: cs.cmCost,
    washingCost: cs.washingCost,
    packingCost: cs.packingCost,
    overheads: cs.overheads,
    commissionPct: cs.commissionPct,
    marginPct: cs.marginPct,
    sellingPrice: cs.sellingPrice,
    // CST-02 — the calculator's line grid (DocScreen view mode renders it
    // from the config's lineFields)
    lines: cs.lines.map((l) => ({
      head: l.head,
      source: l.source,
      itemType: l.itemType ?? '',
      itemCode: l.itemId ? codeById.get(`${l.itemType}:${l.itemId}`) ?? '' : '',
      componentCode: l.componentId ? compCodeById.get(l.componentId) ?? '' : '',
      qty: l.qty,
      rate: l.rate,
      amount: l.amount,
    })),
  }
  const chainState = cs.order ? computeChainState(cs.order) : undefined

  const perPc = cs.order && cs.order.totalPcs > 0 ? cs.totalCost / cs.order.totalPcs : 0

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <DocBreadcrumb href="/costing/cost-sheet" label="Cost Sheets" title={`v${cs.version}`} />
        <DocPrintLink docType="cost-sheet" id={cs.id} />
      </div>
      <DocScreen
        config={toScreenConfig(costSheetConfig)}
        mode="view"
        docNo={`v${cs.version}`}
        initial={initial}
        chainState={chainState}
        chainCtx={cs.order ? { orderNo: cs.order.orderNo, id: cs.order.id } : undefined}
      />
      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Calculator totals (service-derived)</div>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-slate-700">
          <span>Total cost: <b>₹{(cs.totalCost || 0).toLocaleString('en-IN')}</b></span>
          <span>Selling price: <b>₹{(cs.sellingPrice || 0).toLocaleString('en-IN')}</b></span>
          {cs.order && cs.order.totalPcs > 0 && (
            <span>Per pc: <b>₹{perPc.toLocaleString('en-IN', { maximumFractionDigits: 2 })}</b> ({cs.order.totalPcs.toLocaleString('en-IN')} pcs)</span>
          )}
          {cs.sellingPrice > 0 && (
            <span className="text-xs text-slate-500">
              margin ₹{((cs.sellingPrice - cs.totalCost) || 0).toLocaleString('en-IN')} — <b>{cs.marginPct}%</b> computed (selling − cost)/selling
            </span>
          )}
          {cs.lines.length > 0 && (
            <span className="text-xs text-slate-500">
              {cs.lines.length} lines — {cs.lines.filter((l) => l.source === 'bom').length} BOM · {cs.lines.filter((l) => l.source === 'component').length} component · {cs.lines.filter((l) => l.source === 'manual').length} manual
            </span>
          )}
        </div>
        {cs.order && (
          <div className="mt-2 text-xs text-slate-500">
            Order{' '}
            <Link href={`/orders/${cs.order.id}`} className="font-mono text-emerald-700 hover:underline">{cs.order.orderNo}</Link>
          </div>
        )}
      </div>
    </div>
  )
}
