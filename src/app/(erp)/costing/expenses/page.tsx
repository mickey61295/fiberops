/**
 * /costing/expenses — Expense book (SPEC-M5 §7-D-31, legacy FrmExpenses
 * family). DocScreen New mode + recent expenses; form door → planExpense —
 * the same service as the create_expense tool (ADR-001).
 */
import { db } from '@/lib/db'
import { expenseConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function ExpensesPage() {
  const recent = await db.expense.findMany({
    orderBy: { createdAt: 'desc' },
    take: expenseConfig.recentCount ?? 20,
  })
  // orderId/partyId are free FK cols (PITFALLS #21) — id maps
  const orderIds = [...new Set(recent.map((e) => e.orderId).filter((o): o is string => !!o))]
  const partyIds = [...new Set(recent.map((e) => e.partyId).filter((p): p is string => !!p))]
  const orders = orderIds.length ? await db.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, orderNo: true } }) : []
  const parties = partyIds.length ? await db.party.findMany({ where: { id: { in: partyIds } }, select: { id: true, name: true } }) : []
  const orderBy = new Map(orders.map((o) => [o.id, o.orderNo]))
  const partyById = new Map(parties.map((p) => [p.id, p.name]))
  const rows = recent.map((e) => ({
    id: e.id,
    cells: {
      expNo: e.expNo,
      category: e.category,
      orderNo: e.orderId ? orderBy.get(e.orderId) ?? '—' : '—',
      partyName: e.partyId ? partyById.get(e.partyId) ?? '—' : '—',
      amount: (e.amount || 0).toLocaleString('en-IN'),
      status: e.status,
      expDate: e.expDate ? e.expDate.toISOString().slice(0, 10) : '—',
    },
  }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/costing" label="Costing" title="Expenses (new)" />
      <DocScreen
        config={toScreenConfig(expenseConfig)}
        mode="new"
        viewRoutePattern="/costing/expenses/[id]"
      />
      <RecentDocsTable
        title="Recent expenses"
        columns={expenseConfig.listColumns}
        rows={rows}
        hrefBase="/costing/expenses"
        empty="No expenses recorded yet — book the first one above."
      />
    </div>
  )
}
