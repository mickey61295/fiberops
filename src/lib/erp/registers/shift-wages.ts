/**
 * Shift Wages register service — SPEC-M55 §2 SW-06 (the legacy
 * `FrmProdShiftWagesReg` port; GAP-ANALYSIS: "MAP — wages register by
 * shift"). Grain: shift × prodDate. Piece earnings (Σ amount, qty>0 rows)
 * and shift wages (Σ shiftWages — the M55 wage-only rows) land in the SAME
 * row so the shift-day's total wage bill reads at a glance:
 *   bill = piece earnings + shift wages
 * `shiftId = null` entries (every pre-M55 row, and the M5 variants that
 * don't take a shift) land in the explicit `unassigned` bucket — never a
 * fabricated shift. The `get_shift_wages` tool delegates here; the page is
 * the read surface. The wage-only rows are qty 0, so qty stays piece-true.
 */
import { db } from '@/lib/db'
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'

export async function queryShiftWages(q: RegisterQuery): Promise<RegisterResult> {
  const where: any = {}
  if (q.order) {
    const o = await db.order.findUnique({ where: { orderNo: q.order } })
    if (!o) return { rows: [], summary: `Order ${q.order} not found`, count: 0 }
    where.orderId = o.id
  }
  if (q.q) {
    // dept filter rides the text key (the operator-wages register precedent)
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
    include: { shift: true, operator: { select: { id: true } }, order: { select: { id: true } } },
    orderBy: { prodDate: 'desc' },
    take: 5000, // aggregate source — page cap applies to grouped rows below
  })

  // group by shift × day (the shift-day is the register's grain)
  const groups = new Map<string, {
    shiftId: string; code: string; shift: string; date: string
    qty: number; piece: number; shiftWages: number
    entries: number; operators: Set<string>; orders: Set<string>
  }>()
  for (const e of entries) {
    const day = new Date(e.prodDate).toISOString().slice(0, 10)
    const key = `${e.shiftId ?? 'unassigned'}|${day}`
    const g = groups.get(key) ?? {
      shiftId: e.shiftId ?? 'unassigned',
      code: e.shift?.code ?? '—',
      shift: e.shift?.name ?? 'unassigned',
      date: day,
      qty: 0, piece: 0, shiftWages: 0, entries: 0,
      operators: new Set<string>(), orders: new Set<string>(),
    }
    g.qty += e.qty
    g.piece += e.amount
    g.shiftWages += e.shiftWages
    g.entries += 1
    if (e.operatorId) g.operators.add(e.operatorId)
    if (e.orderId) g.orders.add(e.orderId)
    groups.set(key, g)
  }

  const all = [...groups.values()]
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : a.code.localeCompare(b.code)))
    .map((g) => ({
      id: `${g.shiftId}-${g.date}`,
      href: g.shiftId !== 'unassigned' ? '/masters/shift' : null,
      code: g.code,
      shift: g.shift,
      date: g.date,
      entries: g.entries,
      qty: g.qty,
      piece: Math.round(g.piece * 100) / 100,
      shiftWages: Math.round(g.shiftWages * 100) / 100,
      bill: Math.round((g.piece + g.shiftWages) * 100) / 100,
      operators: g.operators.size,
      orders: g.orders.size,
    }))

  const count = all.length
  const start = (q.page - 1) * q.limit
  const rows: RegisterRow[] = all.slice(start, start + q.limit).map((r) => ({ ...r }))

  const qty = all.reduce((s, r) => s + r.qty, 0)
  const piece = all.reduce((s, r) => s + r.piece, 0)
  const shiftWages = all.reduce((s, r) => s + r.shiftWages, 0)
  return {
    rows,
    totals: [
      { label: 'Shift-days', value: count },
      { label: 'Qty', value: qty },
      { label: 'Piece wages (₹)', value: Math.round(piece) },
      { label: 'Shift wages (₹)', value: Math.round(shiftWages) },
      { label: 'Total bill (₹)', value: Math.round(piece + shiftWages) },
    ],
    summary: `${count} shift-days · ${qty.toLocaleString('en-IN')} pcs · ₹${Math.round(piece).toLocaleString('en-IN')} piece + ₹${Math.round(shiftWages).toLocaleString('en-IN')} shift = ₹${Math.round(piece + shiftWages).toLocaleString('en-IN')} bill`,
    count,
  }
}
