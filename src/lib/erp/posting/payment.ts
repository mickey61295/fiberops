/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M3 §5 row 18 — record_payment service. Logic extracted VERBATIM from
// tools.ts. Writes Payment + companion receipt/payment Journal voucher.
// Voucher numbering RCP-/PMT-.
// SPEC-M5 §7-B-21 (Wave B) — sibling fn planWagePayment: pins direction='out'
// (wages are always paid out) + a wage narration default. Party/PartyLedger math
// picks wage payments up automatically (party-ledger read path unchanged).
//
// SPEC-M40 (Phase-6B Batch 4, PAY-01/02) — the allocation rewrite:
//   · PaymentAllocation rows are the ONE truth for settlement: the commit
//     derives invoice/bill status from Σ active allocations (the M3 single-shot
//     `amount >= billAmount - 0.01` flip is retired). Two receipts that together
//     cover the bill finally settle it.
//   · FIFO: with an explicit target the payment allocates to it (capped at the
//     outstanding); without one it walks the party's open invoices/bills
//     oldest-first. The unallocated remainder is a labeled on-account credit.
//   · Direction guard (PAY-02): out-payments attach SupplierBills (billNo),
//     in-payments attach SalesInvoices (invoiceNo); cross-direction tags are
//     rejected with guidance.

import { db } from '@/lib/db'
import { resolveDocNo, activeFinYear } from '../numbering'
import type { DocPlanResult } from './types'
import type { PaymentInput } from '../schemas/payment'
import type { WagePaymentInput } from '../schemas/payment-variants'
import { dateOrIstToday } from '@/lib/erp/dates'

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

interface AllocTarget {
  id: string
  ref: string
  amount: number
  outstanding: number
  kind: 'invoice' | 'bill'
}

/** Active-allocation sums for a set of invoices/bills (one batched query each). */
async function activeAllocSums(invoiceIds: string[], billIds: string[]): Promise<{ byInvoice: Map<string, number>; byBill: Map<string, number> }> {
  const byInvoice = new Map<string, number>()
  const byBill = new Map<string, number>()
  if (invoiceIds.length) {
    const rows = await db.paymentAllocation.findMany({ where: { invoiceId: { in: invoiceIds }, reversedAt: null }, select: { invoiceId: true, amount: true } })
    for (const r of rows) byInvoice.set(r.invoiceId!, (byInvoice.get(r.invoiceId!) ?? 0) + r.amount)
  }
  if (billIds.length) {
    const rows = await db.paymentAllocation.findMany({ where: { billId: { in: billIds }, reversedAt: null }, select: { billId: true, amount: true } })
    for (const r of rows) byBill.set(r.billId!, (byBill.get(r.billId!) ?? 0) + r.amount)
  }
  return { byInvoice, byBill }
}

/** PAY-01 — the party's open invoices (oldest-first) with outstanding amounts. */
async function fifoInvoiceTargets(partyId: string, explicit: { id: string; billAmount: number; invoiceNo: string } | null): Promise<AllocTarget[]> {
  if (explicit) {
    const { byInvoice } = await activeAllocSums([explicit.id], [])
    const outstanding = round2(explicit.billAmount - (byInvoice.get(explicit.id) ?? 0))
    return [{ id: explicit.id, ref: explicit.invoiceNo, amount: explicit.billAmount, outstanding, kind: 'invoice' }]
  }
  const open = await db.salesInvoice.findMany({
    where: { partyId, status: { in: ['issued', 'partial'] } },
    orderBy: [{ invoiceDate: 'asc' }, { invoiceNo: 'asc' }],
    take: 500,
  })
  if (!open.length) return []
  const { byInvoice } = await activeAllocSums(open.map((i) => i.id), [])
  return open
    .map((i) => ({ id: i.id, ref: i.invoiceNo, amount: i.billAmount, outstanding: round2(i.billAmount - (byInvoice.get(i.id) ?? 0)), kind: 'invoice' as const }))
    .filter((t) => t.outstanding > 0.005)
}

/** PAY-01 — the party's open (passed/partial) supplier bills, oldest-first. */
async function fifoBillTargets(partyId: string, explicit: { id: string; billAmount: number; billNo: string } | null): Promise<AllocTarget[]> {
  if (explicit) {
    const { byBill } = await activeAllocSums([], [explicit.id])
    const outstanding = round2(explicit.billAmount - (byBill.get(explicit.id) ?? 0))
    return [{ id: explicit.id, ref: explicit.billNo, amount: explicit.billAmount, outstanding, kind: 'bill' }]
  }
  const open = await db.supplierBill.findMany({
    where: { partyId, status: { in: ['passed', 'partial'] } },
    orderBy: [{ billDate: 'asc' }, { billNo: 'asc' }],
    take: 500,
  })
  if (!open.length) return []
  const { byBill } = await activeAllocSums([], open.map((b) => b.id))
  return open
    .map((b) => ({ id: b.id, ref: b.billNo, amount: b.billAmount, outstanding: round2(b.billAmount - (byBill.get(b.id) ?? 0)), kind: 'bill' as const }))
    .filter((t) => t.outstanding > 0.005)
}

/** Derive an invoice's status from Σ active allocations (PAY-01). */
async function recomputeInvoiceStatus(tx: any, invoiceId: string): Promise<string> {
  const inv = await tx.salesInvoice.findUnique({ where: { id: invoiceId } })
  if (!inv || inv.status === 'draft' || inv.status === 'cancelled') return inv?.status ?? ''
  const allocs = await tx.paymentAllocation.findMany({ where: { invoiceId, reversedAt: null }, select: { amount: true } })
  const sum = allocs.reduce((s: number, a: any) => s + a.amount, 0)
  const next = sum >= inv.billAmount - 0.01 ? 'paid' : sum > 0.005 ? 'partial' : 'issued'
  if (next !== inv.status) await tx.salesInvoice.update({ where: { id: invoiceId }, data: { status: next } })
  return next
}

/** Derive a supplier bill's status from Σ active allocations (PAY-01). */
async function recomputeBillStatus(tx: any, billId: string): Promise<string> {
  const bill = await tx.supplierBill.findUnique({ where: { id: billId } })
  if (!bill || bill.status === 'draft' || bill.status === 'cancelled') return bill?.status ?? ''
  const allocs = await tx.paymentAllocation.findMany({ where: { billId, reversedAt: null }, select: { amount: true } })
  const sum = allocs.reduce((s: number, a: any) => s + a.amount, 0)
  const next = sum >= bill.billAmount - 0.01 ? 'paid' : sum > 0.005 ? 'partial' : 'passed'
  if (next !== bill.status) await tx.supplierBill.update({ where: { id: billId }, data: { status: next } })
  return next
}

export async function planPayment(args: PaymentInput): Promise<DocPlanResult> {
  const party = await db.party.findUnique({ where: { code: args.partyCode } })
  if (!party) return { ok: false, error: `Party ${args.partyCode} not found` }
  const direction = args.direction === 'out' ? 'out' : 'in'
  const mode = args.mode || 'bank'
  const order = args.orderNo ? await db.order.findUnique({ where: { orderNo: args.orderNo } }) : null
  if (args.orderNo && !order) return { ok: false, error: `Order ${args.orderNo} not found` }
  const voucherNo = await resolveDocNo('payment', 'voucherNo', direction === 'in' ? 'RCP-' : 'PMT-', args.voucherNo)
  const payDate = dateOrIstToday(args.payDate)

  // ───────── PAY-02 — direction-correct invoice/bill links ─────────
  const invoice = args.invoiceNo ? await db.salesInvoice.findUnique({ where: { invoiceNo: args.invoiceNo } }) : null
  if (args.invoiceNo && !invoice) {
    const sb = await db.supplierBill.findUnique({ where: { billNo: args.invoiceNo } })
    if (sb && direction === 'out') {
      return { ok: false, error: `${args.invoiceNo} is a SUPPLIER BILL, not a sales invoice — out-payments attach bills via the billNo field. Re-enter with billNo: ${args.invoiceNo}` }
    }
    if (sb) {
      return { ok: false, error: `${args.invoiceNo} is a supplier bill — receipts (direction in) attach SALES invoices via invoiceNo, or leave empty for an on-account receipt` }
    }
    return { ok: false, error: `Invoice ${args.invoiceNo} not found` }
  }
  if (invoice && direction === 'out') {
    return {
      ok: false,
      error: `Out-payments attach supplier bills (billNo, SB-####) — ${invoice.invoiceNo} is a SALES invoice (a buyer's receivable). For a buyer refund use a debit note; to pay a supplier pass billNo or leave empty for on-account`,
    }
  }
  if (invoice && (invoice.status === 'draft' || invoice.status === 'cancelled')) {
    return { ok: false, error: `Invoice ${invoice.invoiceNo} is ${invoice.status} — only issued/partial invoices are collectable` }
  }
  if (invoice && invoice.partyId !== party.id) {
    return { ok: false, error: `Invoice ${invoice.invoiceNo} belongs to a different party — payment party is ${party.name}` }
  }
  const bill = args.billNo ? await db.supplierBill.findUnique({ where: { billNo: args.billNo } }) : null
  if (args.billNo && !bill) {
    const inv = await db.salesInvoice.findUnique({ where: { invoiceNo: args.billNo } })
    if (inv) {
      return { ok: false, error: `${args.billNo} is a SALES invoice — out-payments attach supplier bills (SB-####) via billNo. Receipts use invoiceNo` }
    }
    return { ok: false, error: `Supplier bill ${args.billNo} not found` }
  }
  if (bill && direction === 'in') {
    return { ok: false, error: `In-payments attach sales invoices (invoiceNo) — ${bill.billNo} is a supplier bill. Supplier refunds: an on-account out-payment or a debit note` }
  }
  if (bill && bill.status === 'draft') return { ok: false, error: `Supplier bill ${bill.billNo} is draft — pass it first (create_bill_pass), then pay` }
  if (bill && bill.status === 'cancelled') return { ok: false, error: `Supplier bill ${bill.billNo} is cancelled` }
  if (bill && bill.partyId !== party.id) {
    return { ok: false, error: `Supplier bill ${bill.billNo} belongs to a different party — payment party is ${party.name}` }
  }

  // ───────── PAY-01 — FIFO allocation across open invoices/bills ─────────
  const targets = direction === 'in'
    ? await fifoInvoiceTargets(party.id, invoice ? { id: invoice.id, billAmount: invoice.billAmount, invoiceNo: invoice.invoiceNo } : null)
    : await fifoBillTargets(party.id, bill ? { id: bill.id, billAmount: bill.billAmount, billNo: bill.billNo } : null)
  let remaining = args.amount
  const allocations: { invoiceId?: string; billId?: string; amount: number; ref: string }[] = []
  const statusUpdates: { table: string; id: string; data: Record<string, unknown> }[] = []
  for (const t of targets) {
    if (remaining <= 0.005) break
    const take = round2(Math.min(remaining, t.outstanding))
    if (take > 0.005) {
      const existing = round2(t.amount - t.outstanding)
      const newSum = round2(existing + take)
      const next = newSum >= t.amount - 0.01 ? 'paid' : 'partial'
      statusUpdates.push(t.kind === 'invoice'
        ? { table: 'salesInvoice', id: t.id, data: { status: next } }
        : { table: 'supplierBill', id: t.id, data: { status: next } })
      allocations.push(t.kind === 'invoice' ? { invoiceId: t.id, amount: take, ref: t.ref } : { billId: t.id, amount: take, ref: t.ref })
      remaining = round2(remaining - take)
    }
  }
  const allocated = round2(allocations.reduce((s, a) => s + a.amount, 0))
  const onAccount = round2(Math.max(0, args.amount - allocated))
  const allocatedLines = allocations.map((a) => `₹${a.amount} → ${a.ref}`)

  return {
    ok: true,
    text: `Proposed payment ${voucherNo}: ${direction === 'in' ? 'RECEIVE' : 'PAY'} ₹${args.amount} ${direction === 'in' ? 'from' : 'to'} ${party.name}${allocated > 0 ? ` — allocates ${allocatedLines.join(', ')}${onAccount > 0 ? `, ₹${onAccount} on-account` : ''}` : ' (on-account)'}.`,
    summary: `${direction === 'in' ? 'Receipt' : 'Payment'} ${voucherNo} | ${party.name} | ₹${args.amount} | ${mode}${allocated > 0 ? ` | allocates ₹${allocated}${onAccount > 0 ? ` + ₹${onAccount} on-account` : ''}` : ' | on-account'}${args.reference ? ` | ref ${args.reference}` : ''}`,
    creates: [
      { table: 'payment', data: { voucherNo, partyId: party.id, orderId: order?.id, invoiceId: invoice?.id, payDate, finYear: await activeFinYear(), direction, amount: args.amount, mode, reference: args.reference, notes: args.notes, status: 'active' } },
      ...allocations.map((a) => ({ table: 'paymentAllocation', data: { paymentId: '<payment>', invoiceId: a.invoiceId ?? null, billId: a.billId ?? null, amount: a.amount } })),
    ],
    updates: statusUpdates,
    sideEffects: [
      direction === 'in' ? 'Party receivable reduces' : 'Party payable reduces',
      'Journal voucher written (receipt/payment)',
      ...allocations.map((a) => `Allocation ₹${a.amount} → ${a.ref}${a.invoiceId ? ' (invoice status derives: partial/paid)' : ' (bill status derives: partial/paid)'}`),
      ...(onAccount > 0 ? [`₹${onAccount} stays ON-ACCOUNT (labeled party credit — PAY-01 overpayment rule)`] : []),
    ],
    async commit() {
      return await db.$transaction(async (tx) => {
        const pay = await tx.payment.create({
          data: { voucherNo, partyId: party.id, orderId: order?.id, invoiceId: invoice?.id, payDate, finYear: await activeFinYear(), direction, amount: args.amount, mode, reference: args.reference, notes: args.notes, status: 'active' },
        })
        await tx.journal.create({
          data: {
            voucherNo: `JV-${voucherNo}`,
            voucherType: direction === 'in' ? 'receipt' : 'payment',
            partyId: party.id,
            date: payDate,
            finYear: await activeFinYear(),
            debitAccount: direction === 'in' ? 'Cash/Bank' : party.name,
            creditAccount: direction === 'in' ? party.name : 'Cash/Bank',
            amount: args.amount,
            narration: `${direction === 'in' ? 'Collection' : 'Payment'} ${voucherNo}${invoice ? ' against ' + invoice.invoiceNo : ''}${bill ? ' against ' + bill.billNo : ''}${allocatedLines.length ? ' alloc: ' + allocatedLines.join(', ') : ''}${onAccount > 0 ? ` (+₹${onAccount} on-account)` : ''}${args.reference ? ' ref ' + args.reference : ''}`,
          },
        })
        const invoiceIds: string[] = []
        const billIds: string[] = []
        for (const a of allocations) {
          await tx.paymentAllocation.create({
            data: { paymentId: pay.id, invoiceId: a.invoiceId ?? null, billId: a.billId ?? null, amount: a.amount },
          })
          if (a.invoiceId) invoiceIds.push(a.invoiceId)
          if (a.billId) billIds.push(a.billId)
        }
        const statuses: Record<string, string> = {}
        for (const id of invoiceIds) statuses[`INV:${id}`] = await recomputeInvoiceStatus(tx, id)
        for (const id of billIds) statuses[`SB:${id}`] = await recomputeBillStatus(tx, id)
        return { id: pay.id, voucherNo: pay.voucherNo, allocated, onAccount, allocations, statuses }
      })
    },
  }
}

// ───────────── SPEC-M5 §7-B-21 — wage payment (sibling wrapper, §4 rule 1) ─────────────

/** FrmPaymentReg_Wages — pay wages to an employee party. Pins direction='out'
 *  and defaults the narration; everything else delegates to planPayment
 *  (PMT- voucher + companion payment Journal + party-ledger effects). */
export async function planWagePayment(args: WagePaymentInput): Promise<DocPlanResult> {
  return planPayment({
    ...args,
    direction: 'out',
    notes: args.notes?.trim() || 'Wage payment',
  } as Parameters<typeof planPayment>[0])
}
