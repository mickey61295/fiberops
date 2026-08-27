/**
 * /orders/samples/[id] — Sample view (SPEC-M5 §7-D-26). Header card with
 * buyer/style + status; enquiryRef links the order when it matches one.
 */
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { DocBreadcrumb } from '@/components/erp/recent-docs'
import { DocPrintLink } from '@/components/erp/doc-print-button' // SPEC-M8 §5 (Wave B)

export const dynamic = 'force-dynamic'

export default async function SampleViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const sample = await db.sample.findUnique({ where: { id } }).catch(() => null)
  if (!sample) notFound()

  const [buyer, style, order] = await Promise.all([
    sample.buyerId ? db.buyer.findUnique({ where: { id: sample.buyerId } }).catch(() => null) : null,
    sample.styleId ? db.style.findUnique({ where: { id: sample.styleId } }).catch(() => null) : null,
    sample.enquiryRef
      ? db.order.findUnique({ where: { orderNo: sample.enquiryRef } }).catch(() => null)
      : null,
  ])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <DocBreadcrumb href="/orders/samples" label="Samples & Enquiry" title={`Sample · ${sample.sampleNo}`} />
        <DocPrintLink docType="sample" id={sample.sampleNo} />
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Sample No</div>
            <div className="font-mono font-medium">{sample.sampleNo}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Buyer</div>
            <div className="font-medium">{buyer?.name ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Style</div>
            <div className="font-medium">{style?.styleNo ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Type</div>
            <div className="font-medium uppercase">{sample.sampleType}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Qty</div>
            <div className="font-medium">{sample.qty} pcs</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Status</div>
            <div className="font-medium capitalize">{sample.status}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Sampled On</div>
            <div className="font-medium">{sample.sampledOn ? sample.sampledOn.toISOString().slice(0, 10) : '—'}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Enquiry Ref</div>
            <div className="font-medium">
              {order ? <Link href={`/orders/${order.id}`} className="text-emerald-700 hover:underline">{order.orderNo}</Link> : sample.enquiryRef ?? '—'}
            </div>
          </div>
        </div>
        {sample.remarks && (
          <div className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-600">{sample.remarks}</div>
        )}
      </div>
    </div>
  )
}
