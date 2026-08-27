/**
 * /jobwork/order/[id] — Jobwork DC view (SPEC-M3 §8 row 6 view mode; also the
 * view target for jobwork-IN receipts — row 7 has no own document). Resolves
 * by db id OR dcNo. Sent DCs expose a "Receive" CTA that prefills
 * /jobwork/receipt (W1 loop). JobworkOrder.orderId carries NO relation —
 * the parent order is fetched separately (reconstructed-schema reality).
 */
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { db } from '@/lib/db'
import { jobworkOutConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { CHAIN_ORDER_INCLUDE, computeChainState } from '@/lib/erp/chain'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb } from '@/components/erp/recent-docs'
import { DocPrintLink } from '@/components/erp/doc-print-button' // SPEC-M8 §5
import { ReconCard } from '@/components/erp/recon-card'
import { jobworkRecon } from '@/lib/erp/registers/recon'

export const dynamic = 'force-dynamic'

export default async function JobworkOrderViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const include = { jobworker: true }
  let jw = await db.jobworkOrder.findUnique({ where: { id }, include }).catch(() => null)
  if (!jw) jw = await db.jobworkOrder.findUnique({ where: { dcNo: id }, include })
  if (!jw) notFound()

  const parent = jw.orderId
    ? await db.order.findUnique({ where: { id: jw.orderId }, include: CHAIN_ORDER_INCLUDE })
    : null

  const d = (dt: Date | null | undefined) => (dt ? new Date(dt).toISOString().slice(0, 10) : '')
  const initial = {
    dcNo: jw.dcNo,
    jobworkerCode: jw.jobworker?.code ?? '',
    processType: jw.processType,
    totalQty: jw.totalQty,
    totalValue: jw.totalValue,
    orderNo: parent?.orderNo ?? '',
    expectedInDate: d(jw.expectedInDate),
    outDate: d(jw.outDate),
  }
  const state = parent ? computeChainState(parent) : undefined
  const chainCtx = parent ? { orderNo: parent.orderNo, id: parent.id } : undefined
  const recon = await jobworkRecon(jw.id)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <DocBreadcrumb href="/jobwork/order" label="Jobwork" title={jw.dcNo} />
        <DocPrintLink docType="dc" id={jw.dcNo} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium capitalize text-slate-600">
          {jw.status}
        </span>
        {jw.status === 'received' && jw.receivedDate && (
          <span className="text-xs text-slate-500">received {d(jw.receivedDate)}</span>
        )}
        {jw.status === 'sent' && (
          <Link
            href={`/jobwork/receipt?dcNo=${encodeURIComponent(jw.dcNo)}`}
            className="inline-flex items-center gap-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-2.5 py-1.5"
          >
            Receive this DC <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>
      <DocScreen
        config={toScreenConfig(jobworkOutConfig)}
        mode="view"
        docNo={jw.dcNo}
        initial={initial}
        chainState={state}
        chainCtx={chainCtx}
      />
      {recon && <ReconCard recon={recon} />}
    </div>
  )
}
