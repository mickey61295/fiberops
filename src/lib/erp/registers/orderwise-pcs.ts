/**
 * Orderwise Pcs register service — SPEC-M19 §1-C (legacy FrmOrderwisePcsReg:
 * "pcs-stock grouped by order"). CurrentStock itemType='pcs' grouped by orderId:
 * distinct styles + godowns, Σ pcs, Σ value; orderNo + buyer resolved through
 * the Order → Buyer relation; rows without an order group under '—' with no
 * dead href (SPEC-M4 acceptance #4). Direct read (ADR-001); the get_stock tool
 * stays the row-level twin.
 */
import { db } from '@/lib/db'
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'

export async function queryOrderwisePcs(q: RegisterQuery): Promise<RegisterResult> {
  const where: any = { itemType: 'pcs' }
  if (q.godown) {
    const g = await db.godown.findUnique({ where: { code: q.godown } })
    if (!g) return { rows: [], summary: `Godown ${q.godown} not found`, count: 0 }
    where.godownId = g.id
  }

  const stock = await db.currentStock.findMany({
    where,
    select: { itemId: true, godownId: true, orderId: true, pcs: true, rate: true },
  })

  // order + buyer maps (one query each; unlinked rows stay '—')
  const orderIds = [...new Set(stock.map((s) => s.orderId).filter(Boolean) as string[])]
  const orders = orderIds.length
    ? await db.order.findMany({
        where: { id: { in: orderIds } },
        select: { id: true, orderNo: true, buyer: { select: { name: true } } },
      })
    : []
  const orderByld = new Map(orders.map((o) => [o.id, o]))

  const groups = new Map<string, {
    orderId: string | null; orderNo: string; buyer: string
    styles: Set<string>; godowns: Set<string>; pcs: number; value: number
  }>()
  for (const s of stock) {
    const key = s.orderId ?? '—'
    const o = s.orderId ? orderByld.get(s.orderId) : undefined
    const g = groups.get(key) ?? {
      orderId: s.orderId ?? null,
      orderNo: o?.orderNo ?? '—',
      buyer: o?.buyer?.name ?? '—',
      styles: new Set<string>(), godowns: new Set<string>(), pcs: 0, value: 0,
    }
    g.styles.add(s.itemId)
    g.godowns.add(s.godownId)
    g.pcs += s.pcs
    g.value += s.pcs * s.rate
    groups.set(key, g)
  }

  let all: RegisterRow[] = [...groups.values()]
    .sort((a, b) => b.pcs - a.pcs)
    .map((g) => ({
      id: g.orderId ?? g.orderNo,
      href: g.orderId ? `/orders/${g.orderId}` : null,
      orderNo: g.orderNo,
      buyer: g.buyer,
      styles: g.styles.size,
      godowns: g.godowns.size,
      pcs: g.pcs,
      value: g.value,
    }))
  if (q.q) {
    const needle = q.q.toLowerCase()
    all = all.filter((r) => String(r.orderNo ?? '').toLowerCase().includes(needle))
  }

  const count = all.length
  const start = (q.page - 1) * q.limit
  const rows = all.slice(start, start + q.limit)

  const pcs = all.reduce((s, r) => s + Number(r.pcs ?? 0), 0)
  const value = all.reduce((s, r) => s + Number(r.value ?? 0), 0)
  return {
    rows,
    totals: [
      { label: 'Orders', value: count },
      { label: 'Pcs', value: pcs },
      { label: 'Value', value: Math.round(value) },
    ],
    summary: `${count} orders · ${pcs.toLocaleString('en-IN')} pcs · value ₹${Math.round(value).toLocaleString('en-IN')}`,
    count,
  }
}
