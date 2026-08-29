/**
 * Supplier history register service — SPEC-M19 §2 Wave B (legacy
 * FrmSuppOrderHistoryReg). Per-party period rollup: POs, ordered vs received
 * qty, pending value, GRN count and LAST RECEIPT date — the full-period
 * supplier performance view (all statuses incl. received/closed POs), vs
 * party-balance's pending-chase. Date window filters the POs; receipts ride
 * the same poId id-map (PITFALLS #21).
 */
import { db } from '@/lib/db'
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'

export async function querySupplierHistory(q: RegisterQuery): Promise<RegisterResult> {
  const where: any = { status: { not: 'cancelled' } }
  if (q.from || q.to) {
    where.orderDate = {}
    if (q.from) where.orderDate.gte = q.from
    if (q.to) where.orderDate.lte = q.to
  }
  if (q.party) {
    const p = await db.party.findUnique({ where: { code: q.party } })
    if (!p) return { rows: [], summary: `Party ${q.party} not found`, count: 0 }
    where.partyId = p.id
  } else if (q.q) {
    where.party = { name: { contains: q.q } }
  }

  const pos = await db.purchaseOrder.findMany({
    where,
    include: { party: true, lines: true },
    orderBy: { orderDate: 'desc' },
    take: 4000, // aggregate guard
  })
  const grns = pos.length
    ? await db.gRN.findMany({
        where: { poId: { in: pos.map((p) => p.id) } },
        select: { poId: true, grnDate: true, totalQty: true, totalValue: true },
        orderBy: { grnDate: 'desc' },
      })
    : []
  const byPo = new Map<string, { qty: number; value: number; grns: number; last: Date | null }>()
  for (const g of grns) {
    const acc = byPo.get(g.poId!) ?? { qty: 0, value: 0, grns: 0, last: null }
    acc.qty += g.totalQty
    acc.value += g.totalValue
    acc.grns += 1
    if (!acc.last || g.grnDate > acc.last) acc.last = g.grnDate
    byPo.set(g.poId!, acc)
  }

  const byParty = new Map<
    string,
    { code: string; name: string; poCount: number; orderedQty: number; receivedQty: number; pendingValue: number; grnCount: number; lastReceipt: Date | null }
  >()
  for (const po of pos) {
    const acc = byParty.get(po.partyId) ?? {
      code: po.party.code, name: po.party.name, poCount: 0, orderedQty: 0,
      receivedQty: 0, pendingValue: 0, grnCount: 0, lastReceipt: null,
    }
    acc.poCount += 1
    acc.orderedQty += po.lines.reduce((s, l) => s + l.qty, 0)
    const orderedValue = po.lines.reduce((s, l) => s + l.amount, 0)
    const r = byPo.get(po.id)
    acc.receivedQty += r?.qty ?? 0
    acc.pendingValue += Math.max(0, orderedValue - (r?.value ?? 0))
    acc.grnCount += r?.grns ?? 0
    if (r?.last && (!acc.lastReceipt || r.last > acc.lastReceipt)) acc.lastReceipt = r.last
    byParty.set(po.partyId, acc)
  }

  const all = [...byParty.entries()].map(([id, a]) => ({
    id,
    href: '/masters/party', // M2 masters are table views (party-balance precedent)
    party: a.name,
    poCount: a.poCount,
    orderedQty: a.orderedQty,
    receivedQty: a.receivedQty,
    pendingValue: Math.round(a.pendingValue),
    grns: a.grnCount,
    lastReceipt: a.lastReceipt,
  }))
  all.sort((a, b) => b.poCount - a.poCount)
  const count = all.length
  const rows: RegisterRow[] = all.slice((q.page - 1) * q.limit, (q.page - 1) * q.limit + q.limit)

  const sum = (k: 'orderedQty' | 'receivedQty' | 'pendingValue') => all.reduce((s, r) => s + r[k], 0)
  return {
    rows,
    totals: [
      { label: 'Suppliers', value: count },
      { label: 'POs', value: pos.length },
      { label: 'Ordered qty', value: sum('orderedQty') },
      { label: 'Received qty', value: sum('receivedQty') },
      { label: 'Pending value', value: sum('pendingValue') },
    ],
    summary: `${count} suppliers · ${pos.length} POs · ₹${sum('pendingValue').toLocaleString('en-IN')} still pending`,
    count,
  }
}
