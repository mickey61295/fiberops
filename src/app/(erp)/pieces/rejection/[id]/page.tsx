/**
 * /pieces/rejection/[id] — Rejection view (SPEC-M3 §8 row 12 view mode).
 * Resolves by db id OR rejNo.
 */
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { rejectionConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { CHAIN_ORDER_INCLUDE, computeChainState } from '@/lib/erp/chain'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb } from '@/components/erp/recent-docs'
import { DocPrintLink } from '@/components/erp/doc-print-button' // SPEC-M8 §5 (Wave B)

export const dynamic = 'force-dynamic'

export default async function RejectionViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const include = { order: { include: CHAIN_ORDER_INCLUDE }, department: true }
  let rej = await db.rejectionEntry.findUnique({ where: { id }, include }).catch(() => null)
  if (!rej) rej = await db.rejectionEntry.findUnique({ where: { rejNo: id }, include })
  if (!rej) notFound()

  const d = (dt: Date | null | undefined) => (dt ? new Date(dt).toISOString().slice(0, 10) : '')
  const initial = {
    rejNo: rej.rejNo,
    orderNo: rej.order?.orderNo ?? '',
    qty: rej.qty,
    rejType: rej.rejType,
    action: rej.action,
    deptCode: rej.department?.code ?? '',
    rejDate: d(rej.rejDate),
    notes: rej.notes ?? '',
  }
  const state = rej.order ? computeChainState(rej.order) : undefined
  const chainCtx = rej.order ? { orderNo: rej.order.orderNo, id: rej.order.id } : undefined

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <DocBreadcrumb href="/pieces/rejection" label="Rejections" title={rej.rejNo} />
        <DocPrintLink docType="rejection" id={rej.rejNo} />
      </div>
      <DocScreen
        config={toScreenConfig(rejectionConfig)}
        mode="view"
        docNo={rej.rejNo}
        initial={initial}
        chainState={state}
        chainCtx={chainCtx}
      />
    </div>
  )
}
