/**
 * Party Balance register service — SPEC-M4 §5 row 4 (FrmPartyBlnc, Sp_POBalnce).
 * Per party — Σ POLine.qty (ordered) − Σ GRN.totalQty (received, via GRN.poId)
 * = pending; value likewise (pendingValue uses POLine.amount). Only parties
 * with at least one non-cancelled PO appear. `get_party_ledger`'s poBalances[]
 * json extension reads getPartyPoBalances (same math, single party).
 */
import { db } from '@/lib/db'
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'

export interface PartyPoBalance {
  poNo: string
  poType: string
  status: string
  orderedQty: number
  receivedQty: number
  pendingQty: number
  pendingValue: number
}

/** Per-PO balances for one party (shared by the register + the agent tool). */
export async function getPartyPoBalances(partyId: string): Promise<PartyPoBalance[]> {
  const pos = await db.purchaseOrder.findMany({
    where: { partyId, status: { not: 'cancelled' } },
    include: { lines: true },
    orderBy: { orderDate: 'desc' },
  })
  if (pos.length === 0) return []
  const grns = await db.gRN.findMany({
    where: { poId: { in: pos.map((p) => p.id) } },
    select: { poId: true, totalQty: true, totalValue: true },
  })
  const receivedByPo = new Map<string, { qty: number; value: number }>()
  for (const g of grns) {
    const acc = receivedByPo.get(g.poId!) ?? { qty: 0, value: 0 }
    acc.qty += g.totalQty
    acc.value += g.totalValue
    receivedByPo.set(g.poId!, acc)
  }
  return pos.map((p) => {
    const orderedQty = p.lines.reduce((s, l) => s + l.qty, 0)
    const orderedValue = p.lines.reduce((s, l) => s + l.amount, 0)
    const receivedQty = receivedByPo.get(p.id)?.qty ?? 0
    const receivedValue = receivedByPo.get(p.id)?.value ?? 0
    return {
      poNo: p.poNo,
      poType: p.poType,
      status: p.status,
      orderedQty,
      receivedQty,
      pendingQty: Math.max(0, orderedQty - receivedQty),
      pendingValue: Math.max(0, orderedValue - receivedValue),
    }
  })
}

export async function queryPartyBalance(q: RegisterQuery): Promise<RegisterResult> {
  const where: any = { status: { not: 'cancelled' } }
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
    take: 2000, // aggregate guard — party rollup stays exact at this scale
  })
  const grns = await db.gRN.findMany({
    where: pos.length ? { poId: { in: pos.map((p) => p.id) } } : {},
    select: { poId: true, totalQty: true, totalValue: true },
  })
  const receivedByPo = new Map<string, { qty: number; value: number }>()
  for (const g of grns) {
    const acc = receivedByPo.get(g.poId!) ?? { qty: 0, value: 0 }
    acc.qty += g.totalQty
    acc.value += g.totalValue
    receivedByPo.set(g.poId!, acc)
  }

  // roll up per party
  const byParty = new Map<string, { code: string; name: string; poCount: number; orderedQty: number; receivedQty: number; pendingValue: number }>()
  for (const po of pos) {
    const acc = byParty.get(po.partyId) ?? {
      code: po.party.code, name: po.party.name, poCount: 0,
      orderedQty: 0, receivedQty: 0, pendingValue: 0,
    }
    const orderedQty = po.lines.reduce((s, l) => s + l.qty, 0)
    const orderedValue = po.lines.reduce((s, l) => s + l.amount, 0)
    const receivedQty = receivedByPo.get(po.id)?.qty ?? 0
    const receivedValue = receivedByPo.get(po.id)?.value ?? 0
    acc.poCount += 1
    acc.orderedQty += orderedQty
    acc.receivedQty += receivedQty
    acc.pendingValue += Math.max(0, orderedValue - receivedValue)
    byParty.set(po.partyId, acc)
  }

  const all = [...byParty.entries()].map(([id, a]) => ({
    id,
    // M2 masters are table views (no per-record page) — drill to the party
    // master list; never a dead /masters/party/<id> href (W2 acceptance #4).
    href: '/masters/party',
    code: a.code,
    party: a.name,
    poCount: a.poCount,
    orderedQty: a.orderedQty,
    receivedQty: a.receivedQty,
    pendingQty: Math.max(0, a.orderedQty - a.receivedQty),
    pendingValue: a.pendingValue,
  }))
  all.sort((a, b) => b.pendingValue - a.pendingValue)
  const count = all.length
  const rows: RegisterRow[] = all.slice((q.page - 1) * q.limit, (q.page - 1) * q.limit + q.limit)

  const sum = (k: 'orderedQty' | 'receivedQty' | 'pendingQty' | 'pendingValue') =>
    all.reduce((s, r) => s + r[k], 0)

  return {
    rows,
    totals: [
      { label: 'Parties', value: count },
      { label: 'POs', value: pos.length },
      { label: 'Ordered qty', value: sum('orderedQty') },
      { label: 'Pending qty', value: sum('pendingQty') },
      { label: 'Pending value', value: Math.round(sum('pendingValue')) },
    ],
    summary: `${count} parties · pending value ₹${Math.round(sum('pendingValue')).toLocaleString('en-IN')}`,
    count,
  }
}
