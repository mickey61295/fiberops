/**
 * Operator Statement register service — SPEC-M45 L-01 (Module L Batch 1,
 * Phase-6B §12). THE wage reconciliation surface: per operator —
 *   earned = Σ ProductionEntry.amount  (prodDate window — piece-rate ground truth)
 *   paid   = Σ Payment direction-out to the 1:1 employee-party (payDate window)
 *   owed   = earned − paid
 * All-time by default (the "how much do I still owe operator X" question has
 * no natural window); from/to window BOTH legs independently on their own
 * date columns. The paid leg counts the same rows the party ledger counts, so
 * the statement and the ledger can never disagree (all out-payments to the
 * linked party — no mode/notes heuristics).
 * `get_operator_statement` (agent tool) delegates here — json shape frozen.
 */
import { db } from '@/lib/db'
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'

export async function queryOperatorStatement(q: RegisterQuery): Promise<RegisterResult> {
  const empWhere: any = {}
  if (q.q) {
    empWhere.OR = [
      { code: { contains: q.q } },
      { name: { contains: q.q } },
    ]
  }
  if (q.party) {
    const p = await db.party.findUnique({ where: { code: q.party } })
    if (!p) return { rows: [], summary: `Party ${q.party} not found`, count: 0 }
    empWhere.partyId = p.id
  }

  const employees = await db.employee.findMany({
    where: empWhere,
    include: { department: true, party: true },
    take: 2000,
  })
  if (employees.length === 0) return { rows: [], summary: 'No employees match.', count: 0 }
  const empById = new Map(employees.map((e) => [e.id, e]))

  // earned leg — piece-rate entries, windowed on prodDate
  const entryWhere: any = { operatorId: { in: employees.map((e) => e.id) } }
  if (q.from || q.to) {
    entryWhere.prodDate = {}
    if (q.from) entryWhere.prodDate.gte = q.from
    if (q.to) entryWhere.prodDate.lte = q.to
  }
  const entries = await db.productionEntry.findMany({
    where: entryWhere,
    select: { operatorId: true, amount: true, qty: true },
  })
  const earnedBy = new Map<string, { amount: number; qty: number; entries: number }>()
  for (const e of entries) {
    const k = e.operatorId ?? ''
    const a = earnedBy.get(k) ?? { amount: 0, qty: 0, entries: 0 }
    a.amount += e.amount
    a.qty += e.qty
    a.entries += 1
    earnedBy.set(k, a)
  }

  // paid leg — ALL out-payments to the linked employee-party, windowed on payDate
  const partyIds = employees.map((e) => e.partyId).filter((p): p is string => !!p)
  const payWhere: any = { partyId: { in: partyIds }, direction: 'out', status: 'active' }
  if (q.from || q.to) {
    payWhere.payDate = {}
    if (q.from) payWhere.payDate.gte = q.from
    if (q.to) payWhere.payDate.lte = q.to
  }
  const payments = partyIds.length
    ? await db.payment.findMany({ where: payWhere, select: { partyId: true, amount: true } })
    : []
  const paidBy = new Map<string, number>()
  for (const p of payments) paidBy.set(p.partyId, (paidBy.get(p.partyId) ?? 0) + p.amount)

  // rows: employees with ANY activity in scope (earned or paid) — silence the
  // never-worked-never-paid noise, keep owed-from-before visible
  type Row = {
    id: string; href: string | null; code: string; operator: string; dept: string; party: string
    entries: number; qty: number; earned: number; paid: number; owed: number
  }
  const all: Row[] = []
  for (const e of employees) {
    const earned = Math.round((earnedBy.get(e.id)?.amount ?? 0) * 100) / 100
    const paid = e.partyId ? Math.round((paidBy.get(e.partyId) ?? 0) * 100) / 100 : 0
    if (earnedBy.get(e.id)?.entries === undefined && paid === 0) continue // zero activity
    all.push({
      id: e.id,
      href: '/masters/employee',
      code: e.code,
      operator: e.name,
      dept: e.department?.code ?? '—',
      party: e.party?.code ?? '—',
      entries: earnedBy.get(e.id)?.entries ?? 0,
      qty: earnedBy.get(e.id)?.qty ?? 0,
      earned,
      paid,
      owed: Math.round((earned - paid) * 100) / 100,
    })
  }
  all.sort((a, b) => b.owed - a.owed || b.earned - a.earned)

  const count = all.length
  const start = (q.page - 1) * q.limit
  const rows: RegisterRow[] = all.slice(start, start + q.limit).map((r) => ({ ...r }))

  const earned = Math.round(all.reduce((s, r) => s + r.earned, 0) * 100) / 100
  const paid = Math.round(all.reduce((s, r) => s + r.paid, 0) * 100) / 100
  const owed = Math.round(all.reduce((s, r) => s + r.owed, 0) * 100) / 100
  const window = q.from || q.to
    ? ` (${q.from ? q.from.toISOString().slice(0, 10) : '…'} → ${q.to ? q.to.toISOString().slice(0, 10) : '…'})`
    : ' (all-time)'
  return {
    rows,
    totals: [
      { label: 'Operators', value: count },
      { label: 'Earned ₹', value: earned },
      { label: 'Paid ₹', value: paid },
      { label: 'Owed ₹', value: owed },
    ],
    summary: `${count} operators with wage activity${window} — earned ₹${earned.toLocaleString('en-IN')}, paid ₹${paid.toLocaleString('en-IN')}, owed ₹${owed.toLocaleString('en-IN')}`,
    count,
  }
}
