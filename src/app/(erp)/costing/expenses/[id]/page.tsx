/**
 * /costing/expenses/[id] — Expense view (SPEC-M5 §7-D-31). Header card
 * (order/party resolved via lookups — free FK cols, PITFALLS #21).
 */
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { DocBreadcrumb } from '@/components/erp/recent-docs'
import { DocPrintLink } from '@/components/erp/doc-print-button' // SPEC-M8 §5 (Wave B)

export const dynamic = 'force-dynamic'

export default async function ExpenseViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const expense = await db.expense.findUnique({ where: { id } }).catch(() => null)
  if (!expense) notFound()

  const [order, party] = await Promise.all([
    expense.orderId ? db.order.findUnique({ where: { id: expense.orderId } }).catch(() => null) : null,
    expense.partyId ? db.party.findUnique({ where: { id: expense.partyId } }).catch(() => null) : null,
  ])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <DocBreadcrumb href="/costing/expenses" label="Expenses" title={`Expense · ${expense.expNo}`} />
        <DocPrintLink docType="expense" id={expense.expNo} />
      </div>
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Expense No</div>
            <div className="font-mono font-medium">{expense.expNo}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Category</div>
            <div className="font-medium capitalize">{expense.category}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Order</div>
            <div className="font-medium">{order?.orderNo ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Paid To</div>
            <div className="font-medium">{party?.name ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Amount</div>
            <div className="font-medium">₹{(expense.amount || 0).toLocaleString('en-IN')}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Status</div>
            <div className="font-medium capitalize">{expense.status}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Date</div>
            <div className="font-medium">{expense.expDate ? expense.expDate.toISOString().slice(0, 10) : '—'}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Fin Year</div>
            <div className="font-medium">{expense.finYear}</div>
          </div>
        </div>
        {expense.narration && (
          <div className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-600">{expense.narration}</div>
        )}
      </div>
    </div>
  )
}
