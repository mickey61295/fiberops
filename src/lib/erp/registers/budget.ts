/**
 * Budget vs Actual register service — SPEC-M4 §5 row 15 (FrmBudgetAndActualComp).
 * Per order — budgeted = Σ CostSheet.totalCost; actual = Σ POLine.qty×rate +
 * Σ ProductionEntry.amount (the piece-rate wage = production cost); variance =
 * budgeted − actual. Same math the get_budget_vs_actual tool froze (M3
 * contract) — the tool now delegates here. Rows drill into the Order Hub (W2).
 *
 * HFX-12 (Phase-6B Batch 0) — the shiftWages FIELD now reads `amount` (the
 * piece-rate wage actually posted; the column itself has NO writer). The
 * wage already rides inside prodCost (amount IS the production cost), so the
 * `+ shiftWages` addend is DROPPED from `actual` — re-adding it would
 * double-count the wage once it stopped being a dead column. Identical
 * numbers on live data (shiftWages was always 0); L-06 reintroduces a real
 * shift-wage addend when it resolves the column.
 */
import { db } from '@/lib/db'
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'

export interface OrderBudgetActual {
  orderId: string
  orderNo: string
  buyer: string | null
  budgeted: number
  poValue: number
  prodCost: number
  /** SPEC-M54 M-05 (EH-03) — Σ non-cancelled Expense.amount for the order. */
  expenseSpend: number
  shiftWages: number
  actual: number
  variance: number
}

/** Per-order budget/actual for one order (shared by register + agent tool).
 *  M5 Wave A: `budgeted` prefers EXPLICIT Budget rows (the /costing/budget
 *  write door — Σ Budget.amount for the order); falls back to the M4
 *  convention (Σ CostSheet.totalCost) when no budget exists. Additive: the M4
 *  fixtures carry no Budget rows, so their assertions stay green.
 *  SPEC-M54 M-05 (EH-03): `expenseSpend` = Σ non-cancelled Expense.amount
 *  for the order — the budget-vs-actual actual FINALLY includes expenses
 *  (cancelled expenses are excluded: the M51 cancel flips the doc + the
 *  companion + the CN- contra already nets the GL; the addend must not
 *  count the cancelled money either). Expenses post no PO/prod lines, so
 *  the addend cannot double-count. */
export async function getOrderBudgetActual(orderId: string): Promise<OrderBudgetActual | null> {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { buyer: true } })
  if (!order) return null
  const [poLines, prodEntries, costs, budgets, expenses] = await Promise.all([
    db.pOLine.findMany({ where: { orderId } }),
    db.productionEntry.findMany({ where: { orderId } }),
    db.costSheet.findMany({ where: { orderId } }),
    db.budget.findMany({ where: { orderId } }),
    db.expense.findMany({ where: { orderId, status: { not: 'cancelled' } } }),
  ])
  const poValue = poLines.reduce((s, p) => s + p.qty * p.rate, 0)
  const prodCost = prodEntries.reduce((s, e) => s + e.amount, 0)
  // SPEC-M54 M-05 (EH-03) — the expense addend (non-cancelled only).
  const expenseSpend = expenses.reduce((s, e) => s + e.amount, 0)
  // HFX-12 — the piece-rate wage actually posted (shiftWages column is dead:
  // no writer). Informational field: the wage rides inside prodCost above.
  const shiftWages = prodEntries.reduce((s, e) => s + e.amount, 0)
  const explicitBudget = budgets.reduce((s, b) => s + b.amount, 0)
  const costBudget = costs.reduce((s, c) => s + c.totalCost, 0)
  const budgeted = explicitBudget > 0 ? explicitBudget : costBudget
  const actual = poValue + prodCost + expenseSpend
  return {
    orderId: order.id,
    orderNo: order.orderNo,
    buyer: order.buyer?.name ?? null,
    budgeted,
    poValue,
    prodCost,
    expenseSpend,
    shiftWages,
    actual,
    variance: budgeted - actual,
  }
}

export async function queryBudgetVsActual(q: RegisterQuery): Promise<RegisterResult> {
  if (q.order) {
    const o = await db.order.findUnique({ where: { orderNo: q.order } })
    if (!o) return { rows: [], summary: `Order ${q.order} not found`, count: 0 }
    const r = await getOrderBudgetActual(o.id)
    if (!r) return { rows: [], summary: `Order ${q.order} not found`, count: 0 }
    return {
      // SPEC-M54 M-05 (EH-03) — the row carries BOTH keys: expenseSpend (the
      // OrderBudgetActual contract the agent tool reads) + expense (the
      // register column name, same as the multi-order rows).
      rows: [{ id: r.orderId, href: `/orders/${r.orderId}`, ...r, expense: r.expenseSpend, orderId: undefined }],
      totals: [
        { label: 'Budgeted', value: Math.round(r.budgeted) },
        { label: 'Actual', value: Math.round(r.actual) },
        { label: 'Expenses', value: Math.round(r.expenseSpend) },
        { label: 'Variance', value: Math.round(r.variance) },
      ],
      summary: `${r.orderNo}: budgeted ₹${Math.round(r.budgeted).toLocaleString('en-IN')} vs actual ₹${Math.round(r.actual).toLocaleString('en-IN')} (incl. expenses ₹${Math.round(r.expenseSpend).toLocaleString('en-IN')})`,
      count: 1,
    }
  }

  // orders with ANY budget/actual activity (costSheet | poLines | production |
  // expenses — SPEC-M54 M-05: an order with ONLY expenses booked shows too)
  const [orderIdsWithCost, orderIdsWithPo, orderIdsWithProd, orderIdsWithExp] = await Promise.all([
    db.costSheet.findMany({ select: { orderId: true }, distinct: ['orderId'] }),
    db.pOLine.findMany({ where: { orderId: { not: null } }, select: { orderId: true }, distinct: ['orderId'] }),
    db.productionEntry.findMany({ select: { orderId: true }, distinct: ['orderId'] }),
    db.expense.findMany({ where: { orderId: { not: null }, status: { not: 'cancelled' } }, select: { orderId: true }, distinct: ['orderId'] }),
  ])
  const ids = new Set<string>([
    ...orderIdsWithCost.map((c) => c.orderId),
    ...orderIdsWithPo.map((p) => p.orderId!).filter(Boolean),
    ...orderIdsWithProd.map((p) => p.orderId),
    ...orderIdsWithExp.map((e) => e.orderId!).filter(Boolean),
  ])
  if (ids.size === 0) return { rows: [], summary: 'No budget/actual data yet.', count: 0 }

  // M5 Wave A: explicit Budget rows (the /costing/budget write door) — Σ per
  // order; WIN over the CostSheet fallback in the row math below.
  const budgetRows = await db.budget.findMany({ where: { orderId: { not: null } } })
  const explicitBudgetByOrder = new Map<string, number>()
  for (const b of budgetRows) {
    explicitBudgetByOrder.set(b.orderId!, (explicitBudgetByOrder.get(b.orderId!) ?? 0) + b.amount)
  }

  const orders = await db.order.findMany({
    where: { id: { in: [...ids] } },
    include: { buyer: true, costSheet: true, poLines: true, productionEntries: true },
    orderBy: { orderDate: 'desc' },
  })

  // SPEC-M54 M-05 (EH-03) — one batched expense fetch (orderId+status are
  // plain columns; non-cancelled only).
  const expRows = await db.expense.findMany({
    where: { orderId: { not: null }, status: { not: 'cancelled' } },
    select: { orderId: true, amount: true },
  })
  const expenseByOrder = new Map<string, number>()
  for (const e of expRows) {
    expenseByOrder.set(e.orderId!, (expenseByOrder.get(e.orderId!) ?? 0) + e.amount)
  }

  const all: RegisterRow[] = orders.map((o) => {
    const explicit = explicitBudgetByOrder.get(o.id) ?? 0
    const costBudget = o.costSheet.reduce((s, c) => s + c.totalCost, 0)
    const budgeted = explicit > 0 ? explicit : costBudget
    const poValue = o.poLines.reduce((s, p) => s + p.qty * p.rate, 0)
    const prodCost = o.productionEntries.reduce((s, e) => s + e.amount, 0)
    const expense = expenseByOrder.get(o.id) ?? 0
    // HFX-12 — same as getOrderBudgetActual: wage field reads amount, the
    // addend is gone (no double-count). SPEC-M54 M-05: the expense addend
    // (non-cancelled only) joins the actual.
    const actual = poValue + prodCost + expense
    return {
      id: o.id,
      href: `/orders/${o.id}`,
      orderNo: o.orderNo,
      buyer: o.buyer?.name ?? '—',
      budgeted,
      poValue,
      prodCost,
      expense,
      actual,
      variance: budgeted - actual,
    }
  })

  const count = all.length
  const rows = all.slice((q.page - 1) * q.limit, (q.page - 1) * q.limit + q.limit)
  const sum = (k: 'budgeted' | 'actual' | 'variance' | 'expense') => all.reduce((s, r) => s + (r[k] as number), 0)

  return {
    rows,
    totals: [
      { label: 'Orders', value: count },
      { label: 'Budgeted', value: Math.round(sum('budgeted')) },
      { label: 'Actual', value: Math.round(sum('actual')) },
      { label: 'Expenses', value: Math.round(sum('expense')) },
      { label: 'Variance', value: Math.round(sum('variance')) },
    ],
    summary: `${count} orders · budget ₹${Math.round(sum('budgeted')).toLocaleString('en-IN')} vs actual ₹${Math.round(sum('actual')).toLocaleString('en-IN')} (incl. expenses ₹${Math.round(sum('expense')).toLocaleString('en-IN')})`,
    count,
  }
}
