/**
 * /cutting/job-order/[id] — Cut Order view (SPEC-M3 §8 row 8 view mode).
 * Resolves by db id OR cutNo. Bundle count + auto-barcode note shown in an
 * info strip (bundles are auto-generated at commit — 100 pcs per bundle).
 */
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { cutConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { CHAIN_ORDER_INCLUDE, computeChainState } from '@/lib/erp/chain'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function CutOrderViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const include = { order: { include: CHAIN_ORDER_INCLUDE }, _count: { select: { bundles: true } } }
  let cut = await db.cutOrder.findUnique({ where: { id }, include }).catch(() => null)
  if (!cut) cut = await db.cutOrder.findUnique({ where: { cutNo: id }, include })
  if (!cut) notFound()

  const d = (dt: Date | null | undefined) => (dt ? new Date(dt).toISOString().slice(0, 10) : '')
  const initial = {
    cutNo: cut.cutNo,
    orderNo: cut.order?.orderNo ?? '',
    fabricIssued: cut.fabricIssued,
    totalPcs: cut.totalPcs,
    markerLength: cut.markerLength ?? '',
    noOfPlies: cut.noOfPlies ?? '',
    efficiency: cut.efficiency ?? '',
    cutDate: d(cut.cutDate),
  }
  const state = cut.order ? computeChainState(cut.order) : undefined
  const chainCtx = cut.order ? { orderNo: cut.order.orderNo, id: cut.order.id } : undefined

  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/cutting/job-order" label="Cut Orders" title={cut.cutNo} />
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-600">
          {cut.status}
        </span>
        <span className="text-xs text-slate-500">
          {cut._count.bundles} bundle(s) auto-generated · {cut.totalPcs.toLocaleString('en-IN')} pcs into G1
        </span>
      </div>
      <DocScreen
        config={toScreenConfig(cutConfig)}
        mode="view"
        docNo={cut.cutNo}
        initial={initial}
        chainState={state}
        chainCtx={chainCtx}
      />
    </div>
  )
}
