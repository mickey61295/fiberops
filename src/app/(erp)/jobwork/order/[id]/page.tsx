/**
 * /jobwork/order/[id] — Jobwork DC view (SPEC-M3 §8 row 6 view mode; also the
 * view target for jobwork-IN receipts — row 7 has no own document). Resolves
 * by db id OR dcNo. M39 (JWL-01): the LINES table shows sent vs received vs
 * rejected vs returned per line; JWL-09: the allotment link (contract → DC)
 * navigates; the Receive CTA fires for sent AND partial DCs (cumulative
 * receipts). JobworkOrder.orderId/allotmentId carry NO relations — parents are
 * fetched separately (reconstructed-schema reality, PITFALLS #21).
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
  const include = { jobworker: true, lines: true }
  let jw = await db.jobworkOrder.findUnique({ where: { id }, include }).catch(() => null)
  if (!jw) jw = await db.jobworkOrder.findUnique({ where: { dcNo: id }, include })
  if (!jw) notFound()

  const parent = jw.orderId
    ? await db.order.findUnique({ where: { id: jw.orderId }, include: CHAIN_ORDER_INCLUDE })
    : null
  const allotment = jw.allotmentId
    ? await db.jobworkOrder.findUnique({ where: { id: jw.allotmentId } })
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

  const hdr = (jw.receivedQty ?? 0) + (jw.rejectedQty ?? 0)
  const openBalance = Math.round((jw.totalQty - hdr) * 100) / 100

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
        {jw.receivedDate && (
          <span className="text-xs text-slate-500">received {d(jw.receivedDate)}</span>
        )}
        {jw.billedInvoiceNo && (
          <span className="text-xs text-slate-500">
            billed on{' '}
            <Link href={`/accounts/invoice/${encodeURIComponent(jw.billedInvoiceNo)}`} className="font-mono underline underline-offset-2">
              {jw.billedInvoiceNo}
            </Link>
          </span>
        )}
        {allotment && (
          <span className="text-xs text-slate-500">
            fulfills contract{' '}
            <Link href={`/jobwork/order/${encodeURIComponent(allotment.dcNo)}`} className="font-mono underline underline-offset-2">
              {allotment.dcNo}
            </Link>
            <span className="ml-1 capitalize text-slate-400">({allotment.status})</span>
          </span>
        )}
        {(jw.status === 'sent' || jw.status === 'partial') && (
          <Link
            href={`/jobwork/receipt?dcNo=${encodeURIComponent(jw.dcNo)}`}
            className="inline-flex items-center gap-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-2.5 py-1.5"
          >
            {jw.status === 'partial' ? `Receive balance (${openBalance})` : 'Receive this DC'} <ArrowRight className="h-3 w-3" />
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

      {/* JWL-01 — sent vs received per line (the register truth, on the doc) */}
      {jw.lines.length > 0 && (
        <div className="rounded-lg border bg-white p-4">
          <div className="mb-2 flex items-baseline justify-between">
            <h3 className="text-sm font-semibold text-slate-800">Material lines — sent vs received</h3>
            <span className="text-xs text-slate-500">
              header: {jw.totalQty} sent · {jw.receivedQty} received{jw.rejectedQty > 0 ? ` · ${jw.rejectedQty} rejected` : ''}
              {jw.returnedQty > 0 ? ` · ${jw.returnedQty} returned` : ''} · balance {openBalance}
            </span>
          </div>
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b text-left text-slate-500">
                <th className="py-1.5 pr-3 font-medium">Item</th>
                <th className="py-1.5 pr-3 font-medium">Type</th>
                <th className="py-1.5 pr-3 text-right font-medium">Sent</th>
                <th className="py-1.5 pr-3 text-right font-medium">Received</th>
                <th className="py-1.5 pr-3 text-right font-medium">Rejected</th>
                <th className="py-1.5 pr-3 text-right font-medium">Returned</th>
                <th className="py-1.5 text-right font-medium">Balance</th>
              </tr>
            </thead>
            <tbody>
              {jw.lines.map((l) => {
                const bal = Math.round((l.qty - l.receivedQty - l.rejectedQty - l.returnedQty) * 100) / 100
                return (
                  <tr key={l.id} className="border-b last:border-0">
                    <td className="py-1.5 pr-3 font-mono text-slate-800">{l.itemCode}</td>
                    <td className="py-1.5 pr-3 capitalize text-slate-600">{l.itemType}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{l.qty} {l.uom}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{l.receivedQty}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{l.rejectedQty}</td>
                    <td className="py-1.5 pr-3 text-right tabular-nums">{l.returnedQty}</td>
                    <td className={`py-1.5 text-right font-medium tabular-nums ${bal > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{bal}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {jw.itc04Line && (
            <p className="mt-3 font-mono text-[11px] text-slate-400">{jw.itc04Line}</p>
          )}
        </div>
      )}
      {recon && <ReconCard recon={recon} />}
    </div>
  )
}
