/**
 * /accounts/invoice/[id] — Sales Invoice view (SPEC-M3 §8 row 14 view mode).
 * Resolves by db id OR invoiceNo. Shows the GST split the service computed
 * (cgst/sgst/igst) + order/party links. Chain step 13 of 15.
 */
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { invoiceConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb } from '@/components/erp/recent-docs'
import { computeChainState, CHAIN_ORDER_INCLUDE } from '@/lib/erp/chain'

export const dynamic = 'force-dynamic'

export default async function InvoiceViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const include = { party: true, order: { include: CHAIN_ORDER_INCLUDE } }
  let inv = await db.salesInvoice.findUnique({ where: { id }, include }).catch(() => null)
  if (!inv) inv = await db.salesInvoice.findUnique({ where: { invoiceNo: id }, include })
  if (!inv) notFound()

  const d = (dt: Date | null | undefined) => (dt ? new Date(dt).toISOString().slice(0, 10) : '')
  const initial = {
    invoiceNo: inv.invoiceNo,
    orderNo: inv.order?.orderNo ?? '',
    partyCode: inv.party?.code ?? '',
    billType: inv.billType,
    totalQty: inv.totalQty,
    taxableValue: inv.taxableValue,
    gstRate: inv.igstRate > 0 ? inv.igstRate : inv.cgstRate + inv.sgstRate,
    gstType: inv.igstRate > 0 ? 'igst' : 'cgst_sgst',
    invoiceDate: d(inv.invoiceDate),
    notes: '',
  }

  // chain state from the order include (W1): the invoice is step 13
  const chainState = inv.order ? computeChainState(inv.order) : undefined

  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/accounts/invoice" label="Invoices" title={inv.invoiceNo} />
      <DocScreen
        config={toScreenConfig(invoiceConfig)}
        mode="view"
        docNo={inv.invoiceNo}
        initial={initial}
        chainState={chainState}
        chainCtx={inv.order ? { orderNo: inv.order.orderNo, id: inv.order.id } : undefined}
      />
      <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">GST computation (service-derived)</div>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4 text-slate-700">
          <div>Taxable: ₹{(inv.taxableValue || 0).toLocaleString('en-IN')}</div>
          <div>CGST {inv.cgstRate}%: ₹{(inv.cgstAmt || 0).toLocaleString('en-IN')}</div>
          <div>SGST {inv.sgstRate}%: ₹{(inv.sgstAmt || 0).toLocaleString('en-IN')}</div>
          <div>IGST {inv.igstRate}%: ₹{(inv.igstAmt || 0).toLocaleString('en-IN')}</div>
        </div>
        <div className="mt-2 border-t border-slate-100 pt-2 text-base font-semibold text-slate-900">
          Bill amount: ₹{(inv.billAmount || 0).toLocaleString('en-IN')} <span className="ml-2 text-xs font-normal capitalize text-slate-500">status: {inv.status}</span>
        </div>
        <div className="mt-2 text-xs text-slate-500">
          Party{' '}
          <Link href={`/masters/party`} className="font-mono text-emerald-700 hover:underline">{inv.party?.code}</Link>
          {inv.party ? ` · ${inv.party.name}` : ''}
          {inv.order && (
            <> · order{' '}
              <Link href={`/orders/${inv.order.id}`} className="font-mono text-emerald-700 hover:underline">{inv.order.orderNo}</Link>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
