/**
 * Supplier pending register service — SPEC-M19 §2 Wave B (legacy
 * frmSupordPendReg). Per-PO ordered-vs-received: one row per PurchaseOrder
 * with pending > 0 by default (the chase list); a status filter widens to
 * any status. party-balance (M4) stays the per-PARTY rollup — different
 * grain, same math source (Σ POLine.qty/amount vs Σ GRN.totalQty/Value via
 * poId id-map — PITFALLS #21 plain FK).
 */
import { db } from '@/lib/db'
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'

export async function querySupplierPending(q: RegisterQuery): Promise<RegisterResult> {
  const where: any = { status: { not: 'cancelled' } }
  if (q.status) where.status = q.status
  if (q.party) {
    const p = await db.party.findUnique({ where: { code: q.party } })
    if (!p) return { rows: [], summary: `Party ${q.party} not found`, count: 0 }
    where.partyId = p.id
  } else if (q.q) {
    where.OR = [{ poNo: { contains: q.q } }, { party: { name: { contains: q.q } } }]
  }

  const pos = await db.purchaseOrder.findMany({
    where,
    include: { party: true, lines: true },
    orderBy: { orderDate: 'desc' },
    take: 2000, // aggregate guard — pending rollup stays exact at this scale
  })
  const grns = pos.length
    ? await db.gRN.findMany({
        where: { poId: { in: pos.map((p) => p.id) } },
        select: { poId: true, totalQty: true, totalValue: true },
      })
    : []
  const receivedByPo = new Map<string, { qty: number; value: number }>()
  for (const g of grns) {
    const acc = receivedByPo.get(g.poId!) ?? { qty: 0, value: 0 }
    acc.qty += g.totalQty
    acc.value += g.totalValue
    receivedByPo.set(g.poId!, acc)
  }

  let all = pos.map((po) => {
    const orderedQty = po.lines.reduce((s, l) => s + l.qty, 0)
    const orderedValue = po.lines.reduce((s, l) => s + l.amount, 0)
    const receivedQty = receivedByPo.get(po.id)?.qty ?? 0
    const receivedValue = receivedByPo.get(po.id)?.value ?? 0
    return {
      id: po.id,
      href: `/procurement/po/${po.id}`,
      poNo: po.poNo,
      poType: po.poType,
      party: po.party.name,
      orderDate: po.orderDate,
      deliveryDate: po.deliveryDate,
      orderedQty,
      receivedQty,
      pendingQty: Math.max(0, orderedQty - receivedQty),
      pendingValue: Math.max(0, orderedValue - receivedValue),
      status: po.status,
    }
  })
  // The chase list: pending > 0 unless a status filter widened the view.
  if (!q.status) all = all.filter((r) => r.pendingQty > 0 || r.pendingValue > 0)
  all.sort((a, b) => b.pendingValue - a.pendingValue || b.pendingQty - a.pendingQty)
  const count = all.length
  const rows: RegisterRow[] = all.slice((q.page - 1) * q.limit, (q.page - 1) * q.limit + q.limit)

  const sum = (k: 'pendingQty' | 'pendingValue') => all.reduce((s, r) => s + r[k], 0)
  return {
    rows,
    totals: [
      { label: 'POs pending', value: count },
      { label: 'Pending qty', value: sum('pendingQty') },
      { label: 'Pending value', value: Math.round(sum('pendingValue')) },
    ],
    summary: `${count} POs pending · ₹${Math.round(sum('pendingValue')).toLocaleString('en-IN')}`,
    count,
  }
}
