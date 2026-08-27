/**
 * /pieces/despatch/[id] — Pcs Despatch DC view (SPEC-M3 §8 row 13 view mode).
 * Resolves by db id OR dcNo. Lines flatten with colour/size names resolved
 * from maps (PcsDespatchLine carries ids, no relations); the parent order
 * (orderNo + chain state) fetched separately — no relation on PcsDespatch.
 */
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { despatchConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { CHAIN_ORDER_INCLUDE, computeChainState } from '@/lib/erp/chain'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb } from '@/components/erp/recent-docs'
import { DocPrintLink } from '@/components/erp/doc-print-button' // SPEC-M8 §5 (Wave B)

export const dynamic = 'force-dynamic'

export default async function PcsDespatchViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let dc = await db.pcsDespatch.findUnique({ where: { id }, include: { lines: true } }).catch(() => null)
  if (!dc) dc = await db.pcsDespatch.findUnique({ where: { dcNo: id }, include: { lines: true } })
  if (!dc) notFound()

  const [colours, sizes, parent] = await Promise.all([
    db.colour.findMany({ select: { id: true, name: true } }),
    db.size.findMany({ select: { id: true, name: true } }),
    dc.orderId
      ? db.order.findUnique({ where: { id: dc.orderId }, include: CHAIN_ORDER_INCLUDE })
      : Promise.resolve(null),
  ])
  const colourMap = new Map(colours.map((c) => [c.id, c.name]))
  const sizeMap = new Map(sizes.map((s) => [s.id, s.name]))

  const d = (dt: Date | null | undefined) => (dt ? new Date(dt).toISOString().slice(0, 10) : '')
  const initial = {
    dcNo: dc.dcNo,
    orderNo: parent?.orderNo ?? '',
    totalPcs: dc.totalPcs,
    despatchDate: d(dc.despatchDate),
    vehicleNo: dc.vehicleNo ?? '',
    courierName: dc.courierName ?? '',
    lines: dc.lines.map((l) => ({
      styleNo: l.styleNo,
      colourName: l.colourId ? colourMap.get(l.colourId) ?? '' : '',
      sizeName: l.sizeId ? sizeMap.get(l.sizeId) ?? '' : '',
      qty: l.qty,
      rate: l.rate,
    })),
  }
  const state = parent ? computeChainState(parent) : undefined
  const chainCtx = parent ? { orderNo: parent.orderNo, id: parent.id } : undefined

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <DocBreadcrumb href="/pieces/despatch" label="Despatch DCs" title={dc.dcNo} />
        <DocPrintLink docType="pcs-despatch" id={dc.dcNo} />
      </div>
      <DocScreen
        config={toScreenConfig(despatchConfig)}
        mode="view"
        docNo={dc.dcNo}
        initial={initial}
        chainState={state}
        chainCtx={chainCtx}
      />
    </div>
  )
}
