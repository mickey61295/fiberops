/**
 * Piece-Rate Confirmation register service — SPEC-M5 §7-A-7
 * (RptPieceRateConfirm / RptPieceRateConfirm_InHouse). ProductionEntry rates
 * grouped by operator × order × dept (qty, effective rate, earned amount) —
 * the sheet a supervisor signs before wage billing (Wave B's production-wages
 * screen + create_journal bill). The `list_piece_rates` tool delegates here.
 */
import { db } from '@/lib/db'
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'

export async function queryPieceRates(q: RegisterQuery): Promise<RegisterResult> {
  const where: any = {}
  if (q.order) {
    const o = await db.order.findUnique({ where: { orderNo: q.order } })
    if (!o) return { rows: [], summary: `Order ${q.order} not found`, count: 0 }
    where.orderId = o.id
  }
  if (q.q) {
    // dept filter rides the text key (production-status register precedent)
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
    include: { order: true, department: true, operator: true },
    orderBy: { prodDate: 'desc' },
    take: 5000, // aggregate source — page cap applies to grouped rows below
  })

  // group by operator × order × dept
  const groups = new Map<string, {
    operatorId: string; operator: string; orderNo: string; dept: string
    qty: number; amount: number; rateSum: number; rateN: number; firstDate: string
  }>()
  for (const e of entries) {
    const key = `${e.operatorId}|${e.orderId}|${e.deptId}`
    const g = groups.get(key) ?? {
      operatorId: e.operatorId ?? '—',
      operator: e.operator?.name ?? '—',
      orderNo: e.order?.orderNo ?? '—',
      dept: e.department?.code ?? '—',
      qty: 0, amount: 0, rateSum: 0, rateN: 0,
      firstDate: e.prodDate ? new Date(e.prodDate).toISOString().slice(0, 10) : '',
    }
    g.qty += e.qty
    g.amount += e.amount
    if (e.rate > 0) { g.rateSum += e.rate; g.rateN += 1 }
    groups.set(key, g)
  }

  const all = [...groups.values()].map((g, i) => ({
    id: `${g.operatorId}-${i}`,
    href: null,
    operator: g.operator,
    orderNo: g.orderNo,
    dept: g.dept,
    qty: g.qty,
    rate: g.rateN ? g.rateSum / g.rateN : 0,
    amount: g.amount,
    period: g.firstDate,
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
      { label: 'Earned (₹)', value: amount },
    ],
    summary: `${count} operator×order groups · ${qty.toLocaleString('en-IN')} pcs · ₹${amount.toLocaleString('en-IN')} earned`,
    count,
  }
}
