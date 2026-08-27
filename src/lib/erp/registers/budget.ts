/**
 * Budget vs Actual register service — SPEC-M4 §5 row 15 (FrmBudgetAndActualComp).
 * Per order — budgeted = Σ CostSheet.totalCost; actual = Σ POLine.qty×rate +
 * Σ ProductionEntry.amount + Σ shiftWages; variance = budgeted − actual.
 * Same math the get_budget_vs_actual tool froze (M3 contract) — the tool now
 * delegates here. Rows drill into the Order Hub (W2).
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
  shiftWages: number
  actual: number
  variance: number
}

/** Per-order budget/actual for one order (shared by register + agent tool). */
export async function getOrderBudgetActual(orderId: string): Promise<OrderBudgetActual | null> {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { buyer: true } })
  if (!order) return null
  const [poLines, prodEntries, costs] = await Promise.all([
    db.pOLine.findMany({ where: { orderId } }),
    db.productionEntry.findMany({ where: { orderId } }),
    db.costSheet.findMany({ where: { orderId } }),
  ])
  const poValue = poLines.reduce((s, p) => s + p.qty * p.rate, 0)
  const prodCost = prodEntries.reduce((s, e) => s + e.amount, 0)
  const shiftWages = prodEntries.reduce((s, e) => s + e.shiftWages, 0)
  const budgeted = costs.reduce((s, c) => s + c.totalCost, 0)
  const actual = poValue + prodCost + shiftWages
  return {
    orderId: order.id,
    orderNo: order.orderNo,
    buyer: order.buyer?.name ?? null,
    budgeted,
    poValue,
    prodCost,
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
      rows: [{ id: r.orderId, href: `/orders/${r.orderId}`, ...r, orderId: undefined }],
      totals: [
        { label: 'Budgeted', value: Math.round(r.budgeted) },
        { label: 'Actual', value: Math.round(r.actual) },
        { label: 'Variance', value: Math.round(r.variance) },
      ],
      summary: `${r.orderNo}: budgeted ₹${Math.round(r.budgeted).toLocaleString('en-IN')} vs actual ₹${Math.round(r.actual).toLocaleString('en-IN')}`,
      count: 1,
    }
  }

  // orders with ANY budget/actual activity (costSheet | poLines | production)
  const [orderIdsWithCost, orderIdsWithPo, orderIdsWithProd] = await Promise.all([
    db.costSheet.findMany({ select: { orderId: true }, distinct: ['orderId'] }),
    db.pOLine.findMany({ where: { orderId: { not: null } }, select: { orderId: true }, distinct: ['orderId'] }),
    db.productionEntry.findMany({ select: { orderId: true }, distinct: ['orderId'] }),
  ])
  const ids = new Set<string>([
    ...orderIdsWithCost.map((c) => c.orderId),
    ...orderIdsWithPo.map((p) => p.orderId!).filter(Boolean),
    ...orderIdsWithProd.map((p) => p.orderId),
  ])
  if (ids.size === 0) return { rows: [], summary: 'No budget/actual data yet.', count: 0 }

  const orders = await db.order.findMany({
    where: { id: { in: [...ids] } },
    include: { buyer: true, costSheet: true, poLines: true, productionEntries: true },
    orderBy: { orderDate: 'desc' },
  })

  const all: RegisterRow[] = orders.map((o) => {
    const budgeted = o.costSheet.reduce((s, c) => s + c.totalCost, 0)
    const poValue = o.poLines.reduce((s, p) => s + p.qty * p.rate, 0)
    const prodCost = o.productionEntries.reduce((s, e) => s + e.amount, 0)
    const shiftWages = o.productionEntries.reduce((s, e) => s + e.shiftWages, 0)
    const actual = poValue + prodCost + shiftWages
    return {
      id: o.id,
      href: `/orders/${o.id}`,
      orderNo: o.orderNo,
      buyer: o.buyer?.name ?? '—',
      budgeted,
      poValue,
      prodCost,
      actual,
      variance: budgeted - actual,
    }
  })

  const count = all.length
  const rows = all.slice((q.page - 1) * q.limit, (q.page - 1) * q.limit + q.limit)
  const sum = (k: 'budgeted' | 'actual' | 'variance') => all.reduce((s, r) => s + (r[k] as number), 0)

  return {
    rows,
    totals: [
      { label: 'Orders', value: count },
      { label: 'Budgeted', value: Math.round(sum('budgeted')) },
      { label: 'Actual', value: Math.round(sum('actual')) },
      { label: 'Variance', value: Math.round(sum('variance')) },
    ],
    summary: `${count} orders · budget ₹${Math.round(sum('budgeted')).toLocaleString('en-IN')} vs actual ₹${Math.round(sum('actual')).toLocaleString('en-IN')}`,
    count,
  }
}
