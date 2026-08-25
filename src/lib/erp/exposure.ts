/* eslint-disable @typescript-eslint/no-explicit-any */
// ============== PARTY EXPOSURE VIEWS (LLD PTY-001/002/003, PartyOutQry parity) ==============
// Three views, exactly as the LLD frames them:
//   absolute  — the document stack: open POs, unbilled GRNs, unpaid bills,
//               material sitting at the party (kgs), payments made
//   program   — the same exposure split per order (orderNo × style)
//   value     — material at party valued at the order's cumulative rate
//               (computed reads only — never stored duplicates, per LLD §R06)

import { db } from '@/lib/db'
import { computeCumulativeRate } from './cumrate'

export interface ProgramExposure {
  orderNo: string
  styleNo: string | null
  kgsAtParty: number
  valueAtCumRate: number
  cumRatePerKg: number
}

export interface PartyExposure {
  party: { code: string; name: string; partyType: string; state: string | null }
  // — absolute document stack (₹) —
  absolute: {
    openPoValue: number // committed: open PO lines (qty − received) × rate
    openPoCount: number
    unbilledGrnValue: number // GRN'd but not yet billed (GRN totalValue with no passed bill referencing it)
    billsPayable: number // bills received/passed but unpaid (netPayable outstanding)
    billsPaid: number
    paymentsMade: number
    receivables: number // customer side: invoices issued/unpaid
    debitNotes: number
    netPayableNow: number // billsPayable − paymentsMade − debitNotes
  }
  // — material at party (kgs domain) —
  material: {
    kgsAtParty: number
    valueAtCumRate: number
    oldestDcDate: Date | null
    dcAgingDays: number | null
  }
  program: ProgramExposure[]
  notes: string[]
}

/** Material at an outside party: Σ process-DC out kgs − Σ process-GRN in kgs, per order.
 *  Only process legs count — a purchase GRN is NEW material bought from the
 *  supplier, not a return of our material (legacy party-dwell semantics). */
async function kgsAtPartyByOrder(partyId: string): Promise<Map<string, { kgs: number; oldest: Date | null }>> {
  const rows = await db.stockLedger.findMany({
    where: {
      partyId,
      txnType: { in: ['process_delivery', 'process_receipt'] },
    },
    select: { orderId: true, outKgs: true, inKgs: true, docDate: true, txnType: true },
  })
  const byOrder = new Map<string, { kgs: number; oldest: Date | null }>()
  for (const r of rows) {
    const key = r.orderId || ''
    const cur = byOrder.get(key) || { kgs: 0, oldest: null }
    // out legs (material we sent out) increase dwell; in legs (returns) settle it
    const out = r.txnType === 'process_delivery' ? r.outKgs : 0
    const inn = r.txnType === 'process_receipt' ? r.inKgs : 0
    cur.kgs += out - inn
    if (out > 0 && (!cur.oldest || r.docDate < cur.oldest)) cur.oldest = r.docDate
    byOrder.set(key, cur)
  }
  return byOrder
}

export async function getPartyExposure(partyCode: string): Promise<PartyExposure> {
  const party = await db.party.findUnique({ where: { code: partyCode } })
  if (!party) throw new Error(`Party ${partyCode} not found`)

  const [pos, grns, bills, payments, invoices, debitNotes] = await Promise.all([
    db.purchaseOrder.findMany({ where: { partyId: party.id, status: { in: ['open', 'partial'] } }, include: { lines: true } }),
    db.gRN.findMany({ where: { partyId: party.id } }),
    db.bill.findMany({ where: { partyId: party.id } }),
    db.payment.findMany({ where: { partyId: party.id } }),
    db.salesInvoice.findMany({ where: { partyId: party.id } }),
    db.debitNote.findMany({ where: { partyId: party.id } }),
  ])

  // — absolute stack —
  const openPoValue = pos.reduce((s, p) => s + p.lines.reduce((t, l) => t + Math.max(0, l.qty - l.receivedQty) * l.rate, 0), 0)
  // unbilled GRN value: GRNs whose value is not covered by passed bills referencing them
  const billedRefNos = new Set(bills.map((b) => b.refNo).filter(Boolean))
  const unbilledGrnValue = grns
    .filter((g) => !billedRefNos.has(g.grnNo))
    .reduce((s, g) => s + g.totalValue, 0)
  const unpaidBills = bills.filter((b) => b.status === 'received' || b.status === 'passed')
  const billsPayable = unpaidBills.reduce((s, b) => s + b.netPayable, 0)
  const paymentsMade = payments.reduce((s, p) => s + p.amount, 0)
  const receivables = invoices.filter((i) => i.status === 'issued' || i.status === 'draft').reduce((s, i) => s + i.billAmount, 0)
  const dn = debitNotes.filter((d) => d.status === 'raised').reduce((s, d) => s + d.amount, 0)

  // — material at party + program view —
  const byOrder = await kgsAtPartyByOrder(party.id)
  const notes: string[] = []
  const program: ProgramExposure[] = []
  let kgsAtParty = 0
  let oldestDcDate: Date | null = null

  const orderIds = [...byOrder.keys()].filter(Boolean)
  const orders = orderIds.length
    ? await db.order.findMany({ where: { id: { in: orderIds } }, include: { style: true } })
    : []
  const orderById = new Map(orders.map((o) => [o.id, o]))

  for (const [orderId, info] of byOrder) {
    if (info.kgs <= 0.0001) continue // settled — nothing at party
    kgsAtParty += info.kgs
    if (info.oldest && (!oldestDcDate || info.oldest < oldestDcDate)) oldestDcDate = info.oldest
    const order = orderById.get(orderId)
    let cumRatePerKg = 0
    if (order) {
      try {
        const cum = await computeCumulativeRate(order.orderNo)
        cumRatePerKg = cum.totalRatePerKg
      } catch {
        notes.push(`Cumulative rate unavailable for ${order.orderNo} — value shown at 0`)
      }
    }
    program.push({
      orderNo: order?.orderNo ?? '(non-order stock)',
      styleNo: order?.style?.styleNo ?? null,
      kgsAtParty: round(info.kgs),
      valueAtCumRate: round(info.kgs * cumRatePerKg),
      cumRatePerKg: round(cumRatePerKg),
    })
  }

  const valueAtCumRate = program.reduce((s, p) => s + p.valueAtCumRate, 0)
  const dcAgingDays = oldestDcDate ? Math.floor((Date.now() - oldestDcDate.getTime()) / 86_400_000) : null

  return {
    party: { code: party.code, name: party.name, partyType: party.partyType, state: party.state },
    absolute: {
      openPoValue: round(openPoValue),
      openPoCount: pos.length,
      unbilledGrnValue: round(unbilledGrnValue),
      billsPayable: round(billsPayable),
      billsPaid: round(bills.filter((b) => b.status === 'paid').reduce((s, b) => s + b.netPayable, 0)),
      paymentsMade: round(paymentsMade),
      receivables: round(receivables),
      debitNotes: round(dn),
      netPayableNow: round(Math.max(0, billsPayable - paymentsMade - dn)),
    },
    material: {
      kgsAtParty: round(kgsAtParty),
      valueAtCumRate: round(valueAtCumRate),
      oldestDcDate,
      dcAgingDays,
    },
    program: program.sort((a, b) => b.valueAtCumRate - a.valueAtCumRate),
    notes,
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}
