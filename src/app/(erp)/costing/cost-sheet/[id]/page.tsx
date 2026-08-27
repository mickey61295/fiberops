/**
 * /costing/cost-sheet/[id] — Cost Sheet view (SPEC-M3 §8 row 18 view mode).
 * Resolves by db id. Chain step 14 of 15 (state from the order include).
 */
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { costSheetConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb } from '@/components/erp/recent-docs'
import { computeChainState, CHAIN_ORDER_INCLUDE } from '@/lib/erp/chain'

export const dynamic = 'force-dynamic'

export default async function CostSheetViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const include = { order: { include: CHAIN_ORDER_INCLUDE } }
  const cs = await db.costSheet.findUnique({ where: { id }, include }).catch(() => null)
  if (!cs) notFound()

  const initial = {
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
  }
  const chainState = cs.order ? computeChainState(cs.order) : undefined

  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/costing/cost-sheet" label="Cost Sheets" title={`v${cs.version}`} />
      <DocScreen
        config={toScreenConfig(costSheetConfig)}
        mode="view"
        docNo={`v${cs.version}`}
        initial={initial}
        chainState={chainState}
        chainCtx={cs.order ? { orderNo: cs.order.orderNo, id: cs.order.id } : undefined}
      />
      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Totals (service-derived)</div>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-slate-700">
          <span>Total cost: <b>₹{(cs.totalCost || 0).toLocaleString('en-IN')}</b></span>
          <span>Selling price: <b>₹{(cs.sellingPrice || 0).toLocaleString('en-IN')}</b></span>
          {cs.sellingPrice > 0 && (
            <span className="text-xs text-slate-500">
              margin ₹{((cs.sellingPrice - cs.totalCost) || 0).toLocaleString('en-IN')} ({(((cs.sellingPrice - cs.totalCost) / cs.sellingPrice) * 100).toFixed(1)}%)
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
