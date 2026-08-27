/**
 * Bills Register service — SPEC-M4 §5 row 12 (FrmBillsReg family).
 * Day-book rows = invoices (+) debit notes (−, deductions col) + payments
 * (settle/collected col); totals: billed, deductions, collected, outstanding.
 * Invoice rows drill into /accounts/invoice/[id] (W2).
 */
import { db } from '@/lib/db'
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'

export async function queryBillsRegister(q: RegisterQuery): Promise<RegisterResult> {
  const where: any = {}
  if (q.party) {
    const p = await db.party.findUnique({ where: { code: q.party } })
    if (!p) return { rows: [], summary: `Party ${q.party} not found`, count: 0 }
    where.partyId = p.id
  }

  const [invoices, debitNotes, payments] = await Promise.all([
    db.salesInvoice.findMany({
      where,
      include: { party: true },
      orderBy: { invoiceDate: 'desc' },
      take: 1000,
    }),
    db.debitNote.findMany({
      where,
      include: { party: true },
      orderBy: { date: 'desc' },
      take: 1000,
    }),
    // payments settle invoices of the (filtered) parties — plain invoiceId FK
    db.payment.findMany({
      where,
      include: { party: true },
      orderBy: { payDate: 'desc' },
      take: 1000,
    }),
  ])

  const relevantPayments = payments

  // day-book merge (chronological desc)
  type Row = RegisterRow & { date: Date }
  const all: Row[] = []
  for (const i of invoices) {
    all.push({
      id: `inv:${i.id}`,
      href: `/accounts/invoice/${i.id}`,
      date: i.invoiceDate,
      docNo: i.invoiceNo,
      party: i.party?.name ?? '—',
      docType: 'invoice',
      billAmount: i.billAmount,
      deduction: 0,
      collected: 0,
      status: i.status,
    })
  }
  for (const d of debitNotes) {
    all.push({
      id: `dn:${d.id}`,
      href: null,
      date: d.date,
      docNo: d.noteNo,
      party: d.party?.name ?? '—',
      docType: 'debit_note',
      billAmount: 0,
      deduction: d.amount,
      collected: 0,
      status: d.status,
    })
  }
  for (const p of relevantPayments) {
    all.push({
      id: `pay:${p.id}`,
      href: null,
      date: p.payDate,
      docNo: p.voucherNo,
      party: p.party?.name ?? '—',
      docType: 'payment',
      billAmount: 0,
      deduction: 0,
      collected: p.direction === 'in' ? p.amount : 0,
      status: p.direction,
    })
  }

  const dateFilter = (d: Date) => {
    if (q.from && d < q.from) return false
    if (q.to && d > q.to) return false
    return true
  }
  const filtered = all.filter((r) => dateFilter(r.date)).sort((a, b) => b.date.getTime() - a.date.getTime())
  const count = filtered.length
  const rows: RegisterRow[] = filtered.slice((q.page - 1) * q.limit, (q.page - 1) * q.limit + q.limit)

  const billed = filtered.reduce((s, r) => s + (r.billAmount as number), 0)
  const deductions = filtered.reduce((s, r) => s + (r.deduction as number), 0)
  const collected = filtered.reduce((s, r) => s + (r.collected as number), 0)
  const outstanding = billed - deductions - collected

  return {
    rows,
    totals: [
      { label: 'Rows', value: count },
      { label: 'Billed', value: Math.round(billed) },
      { label: 'Deductions', value: Math.round(deductions) },
      { label: 'Collected', value: Math.round(collected) },
      { label: 'Outstanding', value: Math.round(outstanding) },
    ],
    summary: `${count} rows · billed ₹${Math.round(billed).toLocaleString('en-IN')} · outstanding ₹${Math.round(outstanding).toLocaleString('en-IN')}`,
    count,
  }
}
