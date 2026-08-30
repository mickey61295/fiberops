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
import { ReconCard } from '@/components/erp/recon-card'
import { invoiceRecon } from '@/lib/erp/registers/recon'
import { DocPrintLink } from '@/components/erp/doc-print-button' // SPEC-M8 §5
import { planGenerateIrn } from '@/lib/erp/einvoice' // SPEC-M23 — mock e-invoice
import { runCommit } from '@/lib/erp/audit'
import { getSessionUser } from '@/lib/auth/current-user'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

/** SPEC-M23 — the FORM door of the mock e-invoice handshake: the same
 *  planGenerateIrn the generate_einvoice_irn tool calls, through runCommit
 *  (the M15 form-door audit pattern, the wage-bill precedent). */
async function generateIrnAction(formData: FormData) {
  'use server'
  const invoiceNo = String(formData.get('invoiceNo') || '')
  const plan = await planGenerateIrn({ invoiceNo })
  if (!plan.ok) return // the button only renders on the eligible path; the
  // agent door gives the full error UX — the form door fails soft here
  const user = await getSessionUser().catch(() => null)
  await runCommit(plan, {
    actorName: user?.email ?? 'system',
    actorSource: user ? 'form' : 'system',
    slug: 'einvoice-irn',
  })
  revalidatePath(`/accounts/invoice/${invoiceNo}`)
  revalidatePath('/accounts/invoice')
}

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
    status: inv.status, // SPEC-M18 §4-C1 — drives the Void/Duplicate action row
  }

  // chain state from the order include (W1): the invoice is step 13
  const chainState = inv.order ? computeChainState(inv.order) : undefined
  const recon = await invoiceRecon(inv.id)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <DocBreadcrumb href="/accounts/invoice" label="Invoices" title={inv.invoiceNo} />
        <DocPrintLink docType="invoice" id={inv.invoiceNo} />
      </div>
      <DocScreen
        config={toScreenConfig(invoiceConfig)}
        mode="view"
        docNo={inv.invoiceNo}
        initial={initial}
        chainState={chainState}
        chainCtx={inv.order ? { orderNo: inv.order.orderNo, id: inv.order.id } : undefined}
      />
      {recon && <ReconCard recon={recon} />}
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
        {/* SPEC-M23 — the mock e-invoice handshake: stamped values, or the
            Generate door on eligible (issued, not-yet-stamped) invoices */}
        <div className="mt-3 border-t border-slate-100 pt-2 text-xs text-slate-600" data-testid="einvoice-block">
          {inv.irn ? (
            <div className="space-y-1">
              <div><span className="font-semibold">IRN (mock):</span> <span className="font-mono break-all">{inv.irn}</span></div>
              {inv.irnAckNo && <div><span className="font-semibold">IRN Ack No:</span> <span className="font-mono">{inv.irnAckNo}</span></div>}
              {inv.ewbNo && <div><span className="font-semibold">e-Way Bill No (mock):</span> <span className="font-mono">{inv.ewbNo}</span></div>}
              {!inv.ewbNo && <div className="text-slate-400">No e-Way Bill — consignment ≤ ₹50,000</div>}
            </div>
          ) : inv.status === 'issued' ? (
            <form action={generateIrnAction} className="flex items-center gap-2">
              <input type="hidden" name="invoiceNo" value={inv.invoiceNo} />
              <button
                type="submit"
                className="rounded-md bg-violet-600 hover:bg-violet-500 px-3 py-1.5 text-white font-semibold"
                data-testid="generate-irn-button"
              >
                Generate IRN (mock e-invoice)
              </button>
              <span className="text-slate-400">offline deterministic mock — SPEC-M23</span>
            </form>
          ) : (
            <div className="text-slate-400">e-invoice (mock) needs an issued invoice</div>
          )}
        </div>
      </div>
    </div>
  )
}
