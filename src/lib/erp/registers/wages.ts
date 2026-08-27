/**
 * Production Wages register service — SPEC-M5 §7-B-20 (Frm_ProductionWages /
 * _Dept / _Stage family). ProductionEntry piece-rate earnings grouped by
 * OPERATOR (the payroll view — piece-rate-confirmation is the per-order sheet
 * the supervisor signs; this is the aggregated wage bill source): Σ qty,
 * Σ amount (qty × rate), entry + order counts, avg effective rate.
 * The `get_production_wages` tool delegates here; the page's "Generate wage
 * bill" button posts a Journal through planJournal (Dr Production Wages /
 * Cr Wage Payable — §7-B-20) using this service's period total.
 */
import { db } from '@/lib/db'
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'

export async function queryWages(q: RegisterQuery): Promise<RegisterResult> {
  const where: any = {}
  if (q.order) {
    const o = await db.order.findUnique({ where: { orderNo: q.order } })
    if (!o) return { rows: [], summary: `Order ${q.order} not found`, count: 0 }
    where.orderId = o.id
  }
  if (q.q) {
    // dept filter rides the text key (piece-rate register precedent)
    const depts = await db.department.findMany({
      where: { OR: [{ code: { contains: q.q } }, { name: { contains: q.q } }] },
      select: { id: true },
    })
    if (depts.length === 0) return { rows: [], summary: `No department matches "${q.q}"`, count: 0 }
    where.deptId = { in: depts.map((d) => d.id) }
  }
  if (q.from || q.to) {
    where.prodDate = {}
    if (q.from) where.prodDate.gte = q.from
    if (q.to) where.prodDate.lte = q.to
  }

  const entries = await db.productionEntry.findMany({
    where,
    include: { operator: { include: { department: true } }, order: true, department: true },
    orderBy: { prodDate: 'desc' },
    take: 5000, // aggregate source — page cap applies to grouped rows below
  })

  // group by operator (payroll view — across orders and depts)
  const groups = new Map<string, {
    operatorId: string; operator: string; code: string; dept: string
    qty: number; amount: number; entries: number; orders: Set<string>
  }>()
  for (const e of entries) {
    const key = e.operatorId ?? 'unassigned'
    const g = groups.get(key) ?? {
      operatorId: key,
      operator: e.operator?.name ?? 'Unassigned',
      code: e.operator?.code ?? '—',
      dept: e.operator?.department?.code ?? e.department?.code ?? '—',
      qty: 0, amount: 0, entries: 0, orders: new Set<string>(),
    }
    g.qty += e.qty
    g.amount += e.amount
    g.entries += 1
    if (e.orderId) g.orders.add(e.orderId)
    groups.set(key, g)
  }

  const all = [...groups.values()].sort((a, b) => b.amount - a.amount).map((g) => ({
    id: g.operatorId,
    href: g.operatorId && g.operatorId !== 'unassigned' ? '/masters/employee' : null,
    operator: g.operator,
    code: g.code,
    dept: g.dept,
    orders: g.orders.size,
    entries: g.entries,
    qty: g.qty,
    rate: g.qty > 0 ? g.amount / g.qty : 0,
    amount: g.amount,
  }))

  const count = all.length
  const start = (q.page - 1) * q.limit
  const rows: RegisterRow[] = all.slice(start, start + q.limit).map((r) => ({ ...r }))

  const qty = all.reduce((s, r) => s + r.qty, 0)
  const amount = all.reduce((s, r) => s + r.amount, 0)
  return {
    rows,
    totals: [
      { label: 'Operators', value: count },
      { label: 'Qty', value: qty },
      { label: 'Wages (₹)', value: Math.round(amount) },
    ],
    summary: `${count} operators · ${qty.toLocaleString('en-IN')} pcs · ₹${Math.round(amount).toLocaleString('en-IN')} earned`,
    count,
  }
}
