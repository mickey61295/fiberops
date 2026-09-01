/**
 * /accounts/bill/[id] — Supplier Bill view (SPEC-M40 PAY-03). Resolves by db
 * id OR billNo (SB-####). Shows the bill lines vs the GRN receipt, the stored
 * 3-way-match verdicts (PAY-04), TDS + net payable, and the lifecycle status
 * (draft → passed → partial → paid; cancelled). Not a chain stage.
 */
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { DocBreadcrumb } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

const STATUS_TONE: Record<string, string> = {
  draft: 'bg-amber-100 text-amber-800 ring-amber-200',
  passed: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  partial: 'bg-sky-100 text-sky-800 ring-sky-200',
  paid: 'bg-emerald-100 text-emerald-800 ring-emerald-200',
  cancelled: 'bg-rose-100 text-rose-700 ring-rose-200',
}
const SEV_TONE: Record<string, string> = {
  ok: 'text-emerald-700',
  warn: 'text-amber-700',
  block: 'text-rose-700',
}

export default async function SupplierBillViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let bill = await db.supplierBill.findUnique({ where: { id }, include: { lines: true } }).catch(() => null)
  if (!bill) bill = await db.supplierBill.findUnique({ where: { billNo: id }, include: { lines: true } })
  if (!bill) notFound()

  const party = await db.party.findUnique({ where: { id: bill.partyId } })
  const grn = bill.grnId ? await db.gRN.findUnique({ where: { id: bill.grnId }, include: { lines: true } }) : null
  const grnLines = grn?.lines ?? []
  // GRN qty per item (the receipt evidence the match compares against)
  const grnQtyByItem = new Map<string, number>()
  for (const l of grnLines) grnQtyByItem.set(`${l.itemType}:${l.itemId}`, (grnQtyByItem.get(`${l.itemType}:${l.itemId}`) ?? 0) + l.qty)

  // allocations on this bill (PAY-01/PAY-06 — settlement + reversal truth).
  // paymentId is a relation-less FK (PITFALLS #21) — payments batch-resolved.
  const allocations = await db.paymentAllocation.findMany({
    where: { billId: bill.id, reversedAt: null },
  })
  const payIds = allocations.map((a) => a.paymentId)
  const payments = payIds.length ? await db.payment.findMany({ where: { id: { in: payIds } }, select: { id: true, voucherNo: true, payDate: true } }) : []
  const payById = new Map(payments.map((p) => [p.id, p]))
  const settled = Math.round(allocations.reduce((s, a) => s + a.amount, 0) * 100) / 100
  const outstanding = Math.round(Math.max(0, bill.billAmount - settled) * 100) / 100
  const netPayable = Math.round(bill.billAmount * (1 - (bill.tdsPercent ?? 0) / 100) * 100) / 100

  let verdicts: { check: string; severity: string; message: string }[] = []
  try {
    verdicts = bill.matchVerdicts ? JSON.parse(bill.matchVerdicts) : []
  } catch {
    verdicts = []
  }

  const d = (dt: Date | null | undefined) => (dt ? new Date(dt).toISOString().slice(0, 10) : '—')

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <DocBreadcrumb href="/accounts/bill" label="Supplier Bills" title={bill.billNo} />
        <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${STATUS_TONE[bill.status] ?? 'bg-slate-100 text-slate-700 ring-slate-200'}`}>
          {bill.status}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">Supplier</div>
          <div className="mt-1 text-sm font-medium">{party?.name ?? '—'}</div>
          <div className="text-xs text-slate-500 font-mono">{party?.code}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">Receipt evidence</div>
          <div className="mt-1 text-sm font-medium">{grn ? <Link href={`/procurement/grn/${grn.id}`} className="font-mono text-emerald-700 hover:underline">{grn.grnNo}</Link> : '—'}</div>
          <div className="text-xs text-slate-500">{d(grn?.grnDate)}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">Bill</div>
          <div className="mt-1 text-sm font-medium">{d(bill.billDate)} · due {d(bill.dueDate)}</div>
          <div className="text-xs text-slate-500">{bill.lines.length} line(s) · TDS {bill.tdsPercent ?? 0}% · net ₹{netPayable.toLocaleString('en-IN')}</div>
        </div>
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-slate-500">Settlement (PAY-01)</div>
          <div className="mt-1 text-sm font-medium">₹{settled.toLocaleString('en-IN')} allocated</div>
          <div className="text-xs text-slate-500">outstanding ₹{outstanding.toLocaleString('en-IN')} of ₹{bill.billAmount.toLocaleString('en-IN')}</div>
        </div>
      </div>

      {/* Lines — billed vs GRN received (the 3-way match's local evidence) */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <th className="px-4 py-2">Item</th>
              <th className="px-4 py-2">Type</th>
              <th className="px-4 py-2 text-right">Billed qty</th>
              <th className="px-4 py-2 text-right">GRN qty</th>
              <th className="px-4 py-2 text-right">Rate</th>
              <th className="px-4 py-2 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {bill.lines.map((l) => {
              const grnQty = grnQtyByItem.get(`${l.itemType}:${l.itemId}`) ?? 0
              return (
                <tr key={l.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-2 font-mono">{l.itemCode}</td>
                  <td className="px-4 py-2">{l.itemType}</td>
                  <td className="px-4 py-2 text-right">{l.qty.toLocaleString('en-IN')}</td>
                  <td className={`px-4 py-2 text-right ${Math.abs(l.qty - grnQty) > 0.005 ? 'font-semibold text-amber-700' : ''}`}>{grnQty.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-2 text-right">₹{l.rate.toLocaleString('en-IN')}</td>
                  <td className="px-4 py-2 text-right">₹{l.amount.toLocaleString('en-IN')}</td>
                </tr>
              )
            })}
            {bill.lines.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-slate-500">No lines (header-only bill).</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50 font-medium">
              <td className="px-4 py-2" colSpan={3}>Taxable ₹{bill.taxableValue.toLocaleString('en-IN')}</td>
              <td className="px-4 py-2 text-right" colSpan={3}>
                + GST ₹{(bill.cgstAmt + bill.sgstAmt + bill.igstAmt).toLocaleString('en-IN')} = ₹{bill.billAmount.toLocaleString('en-IN')}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* PAY-04 — the stored tolerance verdicts */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-2">
          <div className="text-xs uppercase tracking-wide text-slate-500">3-way match (PO vs GRN vs bill)</div>
          {bill.matchStatus && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ${bill.matchStatus === 'matched' ? 'bg-emerald-100 text-emerald-800 ring-emerald-200' : 'bg-amber-100 text-amber-800 ring-amber-200'}`}>
              {bill.matchStatus}{bill.matchVariance != null ? ` · ${bill.matchVariance}%` : ''}
            </span>
          )}
        </div>
        {verdicts.length === 0 ? (
          <div className="mt-2 text-xs text-slate-500">{bill.status === 'draft' ? 'Verdicts compute at creation and refresh at the pass gate.' : 'No verdicts stored.'}</div>
        ) : (
          <ul className="mt-2 space-y-1 text-xs">
            {verdicts.map((v, i) => (
              <li key={i} className={SEV_TONE[v.severity] ?? 'text-slate-600'}>
                {v.severity === 'ok' ? '·' : v.severity === 'warn' ? '⚠' : '✕'} {v.check}: {v.message}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* PAY-01 — the allocation trail */}
      <div className="rounded-lg border border-slate-200 bg-white p-4">
        <div className="text-xs uppercase tracking-wide text-slate-500">Payments allocated</div>
        {allocations.length === 0 ? (
          <div className="mt-2 text-xs text-slate-500">
            {bill.status === 'draft' ? 'Not payable until passed (create_bill_pass).' : 'No payments yet — pay via record_payment with billNo.'}
          </div>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {allocations.map((a) => (
              <li key={a.id} className="flex items-center gap-2">
                <span className="font-mono text-emerald-700">{payById.get(a.paymentId)?.voucherNo ?? '—'}</span>
                <span>₹{a.amount.toLocaleString('en-IN')}</span>
                <span className="text-xs text-slate-400">{d(payById.get(a.paymentId)?.payDate)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {bill.notes && <div className="text-xs text-slate-500">Notes: {bill.notes}</div>}
    </div>
  )
}
