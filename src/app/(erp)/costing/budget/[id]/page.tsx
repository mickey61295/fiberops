/**
 * /costing/budget/[id] — Budget view (SPEC-M5 §7-A-1). Header card + lines
 * table + a budget-vs-actual hint (the M4 register reads the same rows).
 */
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { DocBreadcrumb } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function BudgetViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const budget = await db.budget
    .findUnique({ where: { id }, include: { BudgetLine: true } })
    .catch(() => null)
  if (!budget) notFound()

  // orderId is a plain FK column (no relation — PITFALLS #21) — resolve via lookups
  const order = budget.orderId
    ? await db.order.findUnique({ where: { id: budget.orderId } }).catch(() => null)
    : null
  const dept = budget.deptId
    ? await db.department.findUnique({ where: { id: budget.deptId } }).catch(() => null)
    : null
  const actual = budget.BudgetLine.reduce((s, l) => s + (l.actualAmount ?? 0), 0)

  return (
    <div className="space-y-5">
      <DocBreadcrumb
        href="/costing/budget"
        label="Budgets"
        title={order?.orderNo ? `Budget · ${order.orderNo}` : 'Budget'}
      />
      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Order</div>
            <div className="font-medium">{order?.orderNo ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Department</div>
            <div className="font-medium">{dept?.name ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Fin Year</div>
            <div className="font-medium">{budget.finYear}</div>
          </div>
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">Budgeted</div>
            <div className="font-medium">₹{(budget.amount || 0).toLocaleString('en-IN')}</div>
          </div>
        </div>
        {order && (
          <div className="mt-4 text-sm">
            <Link
              href={`/costing/budget-vs-actual?order=${encodeURIComponent(order.orderNo)}`}
              className="text-emerald-700 hover:underline"
            >
              Budget vs Actual for {order.orderNo} →
            </Link>
          </div>
        )}
      </div>

      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-2.5">Work / Component</th>
              <th className="px-4 py-2.5 text-right">Budgeted (₹)</th>
              <th className="px-4 py-2.5 text-right">Actual (₹)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {budget.BudgetLine.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-2.5">{l.workId ?? '—'}</td>
                <td className="px-4 py-2.5 text-right">{(l.amount || 0).toLocaleString('en-IN')}</td>
                <td className="px-4 py-2.5 text-right">{(l.actualAmount || 0).toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-slate-50 font-medium">
            <tr>
              <td className="px-4 py-2.5">Total</td>
              <td className="px-4 py-2.5 text-right">₹{(budget.amount || 0).toLocaleString('en-IN')}</td>
              <td className="px-4 py-2.5 text-right">₹{actual.toLocaleString('en-IN')}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
