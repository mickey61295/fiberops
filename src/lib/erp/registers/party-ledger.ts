/**
 * Party Ledger register service — SPEC-M4 §5 row 14 (FrmPartyBalanceRegister).
 * Per party — billed (Σ SalesInvoice.billAmount), debit notes, journals,
 * received (Σ Payment direction=in), paid (Σ direction=out). Balance follows
 * the bills-register convention (§5 row 12): opening + billed − debit −
 * journals − received + paid (a receipt REDUCES what the party owes).
 * `get_party_ledger` (agent tool) delegates here — json shape frozen
 * (party{code,name,opening}, invoices, totalBilled, totalDebit, totalJournal,
 * recentInvoices[]) + additive poBalances[] (§5 row 4).
 */
import { db } from '@/lib/db'
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'

export interface PartyLedgerSummary {
  party: { id: string; code: string; name: string; opening: number }
  invoices: number
  totalBilled: number
  totalDebit: number
  totalJournal: number
  totalReceived: number
  totalPaid: number
  balance: number
  recentInvoices: { invoiceNo: string; date: Date; amount: number; status: string }[]
}

/** Single-party summary (shared by the register + the agent tool). */
export async function getPartyLedgerSummary(partyId: string): Promise<PartyLedgerSummary | null> {
  const party = await db.party.findUnique({ where: { id: partyId } })
  if (!party) return null
  const [invoices, journals, debitNotes, payments] = await Promise.all([
    db.salesInvoice.findMany({ where: { partyId } }),
    db.journal.findMany({ where: { partyId } }),
    db.debitNote.findMany({ where: { partyId } }),
    db.payment.findMany({ where: { partyId } }),
  ])
  const totalBilled = invoices.reduce((s, i) => s + i.billAmount, 0)
  const totalDebit = debitNotes.reduce((s, d) => s + d.amount, 0)
  const totalJournal = journals.reduce((s, j) => s + j.amount, 0)
  const totalReceived = payments.filter((p) => p.direction === 'in').reduce((s, p) => s + p.amount, 0)
  const totalPaid = payments.filter((p) => p.direction === 'out').reduce((s, p) => s + p.amount, 0)
  const balance = party.openingBalance + totalBilled - totalDebit - totalJournal - totalReceived + totalPaid
  return {
    party: { id: party.id, code: party.code, name: party.name, opening: party.openingBalance },
    invoices: invoices.length,
    totalBilled,
    totalDebit,
    totalJournal,
    totalReceived,
    totalPaid,
    balance,
    recentInvoices: invoices
      .sort((a, b) => b.invoiceDate.getTime() - a.invoiceDate.getTime())
      .slice(0, 5)
      .map((i) => ({ invoiceNo: i.invoiceNo, date: i.invoiceDate, amount: i.billAmount, status: i.status })),
  }
}

export async function queryPartyLedger(q: RegisterQuery): Promise<RegisterResult> {
  // candidate parties: those with any ledger activity
  const partyWhere: any = {}
  if (q.party) {
    const p = await db.party.findUnique({ where: { code: q.party } })
    if (!p) return { rows: [], summary: `Party ${q.party} not found`, count: 0 }
    partyWhere.id = p.id
  } else if (q.q) {
    partyWhere.OR = [{ code: { contains: q.q } }, { name: { contains: q.q } }]
  }

  const parties = await db.party.findMany({ where: partyWhere, orderBy: { name: 'asc' }, take: 500 })
  const partyIds = parties.map((p) => p.id)
  if (partyIds.length === 0) return { rows: [], summary: 'No parties match.', count: 0 }

  const [invoices, journals, debitNotes, payments] = await Promise.all([
    db.salesInvoice.findMany({ where: { partyId: { in: partyIds } }, select: { partyId: true, billAmount: true } }),
    db.journal.findMany({ where: { partyId: { in: partyIds } }, select: { partyId: true, amount: true } }),
    db.debitNote.findMany({ where: { partyId: { in: partyIds } }, select: { partyId: true, amount: true } }),
    db.payment.findMany({ where: { partyId: { in: partyIds } }, select: { partyId: true, amount: true, direction: true } }),
  ])

  const agg = new Map<string, { billed: number; debit: number; journals: number; received: number; paid: number }>()
  for (const i of invoices) {
    const a = (agg.get(i.partyId) ?? { billed: 0, debit: 0, journals: 0, received: 0, paid: 0 })
    a.billed += i.billAmount; agg.set(i.partyId, a)
  }
  for (const j of journals) {
    if (!j.partyId) continue
    const a = (agg.get(j.partyId) ?? { billed: 0, debit: 0, journals: 0, received: 0, paid: 0 })
    a.journals += j.amount; agg.set(j.partyId, a)
  }
  for (const d of debitNotes) {
    if (!d.partyId) continue
    const a = (agg.get(d.partyId) ?? { billed: 0, debit: 0, journals: 0, received: 0, paid: 0 })
    a.debit += d.amount; agg.set(d.partyId, a)
  }
  for (const p of payments) {
    const a = (agg.get(p.partyId) ?? { billed: 0, debit: 0, journals: 0, received: 0, paid: 0 })
    if (p.direction === 'in') a.received += p.amount
    else a.paid += p.amount
    agg.set(p.partyId, a)
  }

  const all: RegisterRow[] = parties
    .filter((p) => agg.has(p.id) || p.openingBalance !== 0)
    .map((p) => {
      const a = agg.get(p.id) ?? { billed: 0, debit: 0, journals: 0, received: 0, paid: 0 }
      return {
        id: p.id,
        href: null,
        code: p.code,
        party: p.name,
        opening: p.openingBalance,
        billed: a.billed,
        debit: a.debit,
        journals: a.journals,
        received: a.received,
        paid: a.paid,
        balance: p.openingBalance + a.billed - a.debit - a.journals - a.received + a.paid,
      }
    })
  all.sort((a, b) => Math.abs(b.balance as number) - Math.abs(a.balance as number))

  const count = all.length
  const rows = all.slice((q.page - 1) * q.limit, (q.page - 1) * q.limit + q.limit)
  const sum = (k: 'billed' | 'debit' | 'journals' | 'received' | 'paid' | 'balance') =>
    all.reduce((s, r) => s + (r[k] as number), 0)

  return {
    rows,
    totals: [
      { label: 'Parties', value: count },
      { label: 'Billed', value: Math.round(sum('billed')) },
      { label: 'Received', value: Math.round(sum('received')) },
      { label: 'Balance', value: Math.round(sum('balance')) },
    ],
    summary: `${count} parties with activity · net balance ₹${Math.round(sum('balance')).toLocaleString('en-IN')}`,
    count,
  }
}
