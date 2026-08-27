/**
 * /accounts/payments/[id] — Payment/Receipt view (SPEC-M3 §8 row 16 view
 * mode). Resolves by db id OR voucherNo. Payment.invoiceId carries NO
 * relation (reconstructed schema, PITFALLS #21) — invoice resolved
 * separately. Chain step 15 of 15 when the voucher ties to an order.
 */
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { paymentConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb } from '@/components/erp/recent-docs'
import { computeChainState, CHAIN_ORDER_INCLUDE } from '@/lib/erp/chain'

export const dynamic = 'force-dynamic'

export default async function PaymentViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const include = { party: true, order: { include: CHAIN_ORDER_INCLUDE } }
  let pay = await db.payment.findUnique({ where: { id }, include }).catch(() => null)
  if (!pay) pay = await db.payment.findUnique({ where: { voucherNo: id }, include })
  if (!pay) notFound()

  // PITFALLS #21: invoiceId is a relation-less FK column — separate lookup
  const invoice = pay.invoiceId ? await db.salesInvoice.findUnique({ where: { id: pay.invoiceId } }) : null

  const d = (dt: Date | null | undefined) => (dt ? new Date(dt).toISOString().slice(0, 10) : '')
  const initial = {
    voucherNo: pay.voucherNo,
    partyCode: pay.party?.code ?? '',
    amount: pay.amount,
    direction: pay.direction,
    invoiceNo: invoice?.invoiceNo ?? '',
    orderNo: pay.order?.orderNo ?? '',
    mode: pay.mode,
    reference: pay.reference ?? '',
    payDate: d(pay.payDate),
    notes: pay.notes ?? '',
  }
  const chainState = pay.order ? computeChainState(pay.order) : undefined

  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/accounts/payments" label="Payments" title={pay.voucherNo} />
      <DocScreen
        config={toScreenConfig(paymentConfig)}
        mode="view"
        docNo={pay.voucherNo}
        initial={initial}
        chainState={chainState}
        chainCtx={pay.order ? { orderNo: pay.order.orderNo, id: pay.order.id } : undefined}
      />
      <div className="text-xs text-slate-500">
        {pay.direction === 'in' ? 'Receipt from' : 'Payment to'}{' '}
        <Link href="/masters/party" className="font-mono text-emerald-700 hover:underline">{pay.party?.code}</Link>
        {pay.party ? ` · ${pay.party.name}` : ''}
        {invoice && (
          <> · against invoice{' '}
            <Link href={`/accounts/invoice/${invoice.id}`} className="font-mono text-emerald-700 hover:underline">{invoice.invoiceNo}</Link>
            {' '}(status: {invoice.status})
          </>
        )}
        {pay.order && (
          <> · order{' '}
            <Link href={`/orders/${pay.order.id}`} className="font-mono text-emerald-700 hover:underline">{pay.order.orderNo}</Link>
          </>
        )}
      </div>
    </div>
  )
}
