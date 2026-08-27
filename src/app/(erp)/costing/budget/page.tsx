/**
 * /costing/budget — Budget entry (SPEC-M5 §7-A-1, item 'budget', legacy
 * frmBudget family). DocScreen New mode + recent budgets. Form door →
 * planBudget — the same service as create_budget (ADR-001).
 * ?order=SO-… prefills orderNo.
 */
import { db } from '@/lib/db'
import { budgetConfig, toScreenConfig } from '@/lib/erp/doc-configs'
import { DocScreen } from '@/components/archetypes/doc-screen'
import { DocBreadcrumb, RecentDocsTable } from '@/components/erp/recent-docs'

export const dynamic = 'force-dynamic'

export default async function BudgetPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const order = typeof sp.order === 'string' ? sp.order : undefined
  const recent = await db.budget.findMany({
    orderBy: { createdAt: 'desc' },
    take: budgetConfig.recentCount ?? 20,
    include: { BudgetLine: true },
  })
  // orderId is a plain FK column (no relation — PITFALLS #21) — resolve orderNos via id map
  const orderIds = [...new Set(recent.map((b) => b.orderId).filter((o): o is string => !!o))]
  const orders = orderIds.length
    ? await db.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, orderNo: true } })
    : []
  const orderNoById = new Map(orders.map((o) => [o.id, o.orderNo]))
  // deptId is a plain FK column too — resolve names
  const deptIds = [...new Set(recent.map((b) => b.deptId).filter((d): d is string => !!d))]
  const depts = deptIds.length
    ? await db.department.findMany({ where: { id: { in: deptIds } }, select: { id: true, name: true } })
    : []
  const deptName = new Map(depts.map((d) => [d.id, d.name]))
  const rows = recent.map((b) => ({
    id: b.id,
    cells: {
      orderNo: b.orderId ? orderNoById.get(b.orderId) ?? '—' : '—',
      deptName: b.deptId ? deptName.get(b.deptId) ?? '—' : '—',
      finYear: b.finYear,
      amount: (b.amount || 0).toLocaleString('en-IN'),
      lineCount: String(b.BudgetLine.length),
      createdAt: b.createdAt ? new Date(b.createdAt).toISOString().slice(0, 10) : '—',
    },
  }))
  return (
    <div className="space-y-5">
      <DocBreadcrumb href="/costing" label="Costing" title="Budget (new)" />
      <DocScreen
        config={toScreenConfig(budgetConfig)}
        mode="new"
        viewRoutePattern="/costing/budget/[id]"
        prefill={order ? { orderNo: order } : undefined}
        chainCtx={order ? { orderNo: order } : undefined}
      />
      <RecentDocsTable
        title="Recent budgets"
        columns={budgetConfig.listColumns}
        rows={rows}
        hrefBase="/costing/budget"
        empty="No budgets yet — plan the first one above."
      />
    </div>
  )
}
