/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M3 §5 rows 19-21 — cancel services (order / PO / invoice). Logic
// extracted VERBATIM from tools.ts. NOTE: the CURRENT tools have NO downstream
// guard (the spec's "guard: no downstream docs" is a Wave-B doc-view upgrade);
// behaviour preserved exactly.
//
// SPEC-M40 (Phase-6B Batch 4, PAY-06) — money-voucher cancel/reversal:
//   · planCancelInvoice gains guards (live IRN, active allocations, legacy-paid)
//   · planCancelPayment / planCancelJournal write CONTRA legs (CN-#### mirror
//     vouchers, accounts swapped) — audit-preserving: no row is deleted;
//     payment allocations flip reversedAt and invoice/bill statuses re-derive
//   · planCancelDebitNote / planCancelExpense / planCancelBudget are honest
//     status flips with guards (settled/actuals block)

import { db } from '@/lib/db'
import type { DocPlanResult } from './types'
import type { CancelOrderInput, CancelPoInput, CancelInvoiceInput } from '../schemas/cancel'
import type { CancelPaymentInput, CancelJournalInput, CancelDebitNoteInput, CancelExpenseInput, CancelBudgetInput } from '../schemas/cancel'

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Derive an invoice's status from Σ active allocations (PAY-01/PAY-06 shared). */
async function recomputeInvoiceStatus(tx: any, invoiceId: string): Promise<string> {
  const inv = await tx.salesInvoice.findUnique({ where: { id: invoiceId } })
  if (!inv || inv.status === 'draft' || inv.status === 'cancelled') return inv?.status ?? ''
  const allocs = await tx.paymentAllocation.findMany({ where: { invoiceId, reversedAt: null }, select: { amount: true } })
  const sum = allocs.reduce((s: number, a: any) => s + a.amount, 0)
  const next = sum >= inv.billAmount - 0.01 ? 'paid' : sum > 0.005 ? 'partial' : 'issued'
  if (next !== inv.status) await tx.salesInvoice.update({ where: { id: invoiceId }, data: { status: next } })
  return next
}

/** Derive a supplier bill's status from Σ active allocations. */
async function recomputeBillStatus(tx: any, billId: string): Promise<string> {
  const bill = await tx.supplierBill.findUnique({ where: { id: billId } })
  if (!bill || bill.status === 'draft' || bill.status === 'cancelled') return bill?.status ?? ''
  const allocs = await tx.paymentAllocation.findMany({ where: { billId, reversedAt: null }, select: { amount: true } })
  const sum = allocs.reduce((s: number, a: any) => s + a.amount, 0)
  const next = sum >= bill.billAmount - 0.01 ? 'paid' : sum > 0.005 ? 'partial' : 'passed'
  if (next !== bill.status) await tx.supplierBill.update({ where: { id: billId }, data: { status: next } })
  return next
}

export async function planCancelOrder(args: CancelOrderInput): Promise<DocPlanResult> {
  const order = await db.order.findUnique({ where: { orderNo: args.orderNo } })
  if (!order) return { ok: false, error: `Order ${args.orderNo} not found` }
  return {
    ok: true,
    text: `Proposed cancellation of ${args.orderNo}.`,
    summary: `Cancel order ${args.orderNo} (was ${order.status}) | reason: ${args.reason || 'not specified'}`,
    updates: [{ table: 'order', id: order.id, data: { status: 'cancelled', notes: args.reason } }],
    sideEffects: ['POs linked to this order remain open', 'Production entries are not deleted'],
    async commit() {
      await db.order.update({ where: { id: order.id }, data: { status: 'cancelled', notes: args.reason } })
      return { id: order.id, status: 'cancelled' }
    },
  }
}

export async function planCancelPo(args: CancelPoInput): Promise<DocPlanResult> {
  const po = await db.purchaseOrder.findUnique({ where: { poNo: args.poNo } })
  if (!po) return { ok: false, error: `PO ${args.poNo} not found` }
  return {
    ok: true,
    text: `Proposed cancellation of ${args.poNo}.`,
    summary: `Cancel PO ${args.poNo} (was ${po.status}) | reason: ${args.reason || 'not specified'}`,
    updates: [{ table: 'purchaseOrder', id: po.id, data: { status: 'cancelled', notes: args.reason } }],
    sideEffects: ['No GRNs can be received against this PO', 'Linked order PO balance is reopened'],
    async commit() {
      await db.purchaseOrder.update({ where: { id: po.id }, data: { status: 'cancelled', notes: args.reason } })
      return { id: po.id, status: 'cancelled' }
    },
  }
}

export async function planCancelInvoice(args: CancelInvoiceInput): Promise<DocPlanResult> {
  const inv = await db.salesInvoice.findUnique({ where: { invoiceNo: args.invoiceNo } })
  if (!inv) return { ok: false, error: `Invoice ${args.invoiceNo} not found` }
  if (inv.status === 'cancelled') return { ok: false, error: `Invoice ${args.invoiceNo} is already cancelled` }
  // PAY-06 — live IRN guard: an e-invoice with a live IRN must cancel the IRN
  // first (the 24h window door), never the invoice directly.
  if (inv.irn && !inv.irnCancelledAt) {
    return { ok: false, error: `Invoice ${args.invoiceNo} carries a LIVE IRN ${inv.irn} — cancel the IRN first (the e-invoice 24h window), then cancel the invoice` }
  }
  // PAY-06 — allocation guard: payments settled this invoice; reverse them at
  // their own door (cancel_payment) before the invoice can go.
  const allocs = await db.paymentAllocation.findMany({ where: { invoiceId: inv.id, reversedAt: null } })
  const allocated = round2(allocs.reduce((s, a) => s + a.amount, 0))
  if (allocated > 0) {
    const payRows = allocs.length ? await db.payment.findMany({ where: { id: { in: allocs.map((a) => a.paymentId) } }, select: { voucherNo: true } }) : []
    const vouchers = payRows.map((p) => p.voucherNo).join(', ')
    return { ok: false, error: `Invoice ${args.invoiceNo} has ₹${allocated} settled via payment allocations${vouchers ? ` (${vouchers})` : ''} — cancel those payments first (they reverse via contra legs), then cancel the invoice` }
  }
  if (inv.status === 'paid') {
    return { ok: false, error: `Invoice ${args.invoiceNo} is marked paid by a legacy settle (pre-allocation flip, no rows to reverse) — record the reversal as a debit note instead` }
  }
  return {
    ok: true,
    text: `Proposed cancellation of ${args.invoiceNo}.`,
    summary: `Cancel invoice ${args.invoiceNo} (was ${inv.status}) | reason: ${args.reason || 'not specified'}`,
    updates: [{ table: 'salesInvoice', id: inv.id, data: { status: 'cancelled' } }],
    sideEffects: ['Party AR reduces', 'GST liability reverses'],
    async commit() {
      await db.salesInvoice.update({ where: { id: inv.id }, data: { status: 'cancelled' } })
      return { id: inv.id, status: 'cancelled' }
    },
  }
}

// ───────────── SPEC-M40 PAY-06 — money-voucher cancel/reversal ─────────────

export async function planCancelPayment(args: CancelPaymentInput): Promise<DocPlanResult> {
  const pay = await db.payment.findUnique({ where: { voucherNo: args.voucherNo } })
  if (!pay) return { ok: false, error: `Payment ${args.voucherNo} not found` }
  if (pay.status !== 'active') return { ok: false, error: `Payment ${args.voucherNo} is already cancelled` }
  const contraNo = `CN-${pay.voucherNo}`
  const contraExists = await db.journal.findUnique({ where: { voucherNo: contraNo } })
  if (contraExists) return { ok: false, error: `Contra ${contraNo} already exists — ${args.voucherNo} is already reversed` }
  const allocs = await db.paymentAllocation.findMany({ where: { paymentId: pay.id, reversedAt: null } })
  const allocated = round2(allocs.reduce((s, a) => s + a.amount, 0))
  const invoiceIds = [...new Set(allocs.map((a) => a.invoiceId).filter(Boolean) as string[])]
  const billIds = [...new Set(allocs.map((a) => a.billId).filter(Boolean) as string[])]
  const journal = await db.journal.findUnique({ where: { voucherNo: `JV-${pay.voucherNo}` } })
  // contra legs: the original's accounts swapped (journal absent = legacy row —
  // derive from direction exactly the way the payment door writes them)
  const party = await db.party.findUnique({ where: { id: pay.partyId } })
  const contraDebitAccount = journal ? journal.creditAccount : pay.direction === 'in' ? (party?.name ?? 'Party') : 'Cash/Bank'
  const contraCreditAccount = journal ? journal.debitAccount : pay.direction === 'in' ? 'Cash/Bank' : (party?.name ?? 'Party')

  return {
    ok: true,
    text: `Proposed cancellation of payment ${args.voucherNo} (₹${pay.amount}${allocated > 0 ? `, ₹${allocated} allocated` : ''}) — contra ${contraNo} mirrors the legs.`,
    summary: `Cancel payment ${args.voucherNo} | ${party?.name ?? 'party'} | ₹${pay.amount} ${pay.direction === 'in' ? 'receipt' : 'payment'}${allocated > 0 ? ` | reverses ₹${allocated} of allocations` : ' | no allocations (pure on-account)'}`,
    creates: [
      {
        table: 'journal',
        data: {
          voucherNo: contraNo, voucherType: 'contra', partyId: pay.partyId, date: new Date(), finYear: pay.finYear,
          debitAccount: contraDebitAccount, creditAccount: contraCreditAccount, amount: pay.amount,
          narration: `Contra: cancel ${pay.voucherNo}${args.reason ? ' — ' + args.reason : ''}`,
        },
      },
    ],
    updates: [
      { table: 'payment', id: pay.id, data: { status: 'cancelled', cancelledAt: new Date() } },
      { table: 'paymentAllocation', id: '<allocs>', data: { reversedAt: new Date() } },
      ...invoiceIds.map((id) => ({ table: 'salesInvoice', id, data: { status: 're-derives (issued/partial)' } })),
      ...billIds.map((id) => ({ table: 'supplierBill', id, data: { status: 're-derives (passed/partial)' } })),
    ],
    sideEffects: [
      `Contra journal ${contraNo} mirrors the original legs (audit preserved — nothing is deleted)`,
      ...(allocated > 0 ? [`₹${allocated} of allocations reverse — invoice/bill statuses re-derive from Σ active allocations`] : []),
      ...(invoiceIds.length || billIds.length ? ['Party ledger AR/AP re-opens for the affected documents'] : []),
      ...(journal ? [`Companion journal ${journal.voucherNo} stays (its contra ${contraNo} is the reversal)`] : []),
    ],
    async commit() {
      return await db.$transaction(async (tx) => {
        await tx.payment.update({ where: { id: pay.id }, data: { status: 'cancelled', cancelledAt: new Date() } })
        await tx.journal.create({
          data: {
            voucherNo: contraNo, voucherType: 'contra', partyId: pay.partyId, date: new Date(), finYear: pay.finYear,
            debitAccount: contraDebitAccount, creditAccount: contraCreditAccount, amount: pay.amount,
            narration: `Contra: cancel ${pay.voucherNo}${args.reason ? ' — ' + args.reason : ''}`,
          },
        })
        if (allocs.length) {
          await tx.paymentAllocation.updateMany({ where: { id: { in: allocs.map((a) => a.id) } }, data: { reversedAt: new Date() } })
        }
        const statuses: Record<string, string> = {}
        for (const id of invoiceIds) statuses[`INV:${id}`] = await recomputeInvoiceStatus(tx, id)
        for (const id of billIds) statuses[`SB:${id}`] = await recomputeBillStatus(tx, id)
        return { id: pay.id, voucherNo: pay.voucherNo, status: 'cancelled', contra: contraNo, reversed: allocated, statuses }
      })
    },
  }
}

export async function planCancelJournal(args: CancelJournalInput): Promise<DocPlanResult> {
  const journal = await db.journal.findUnique({ where: { voucherNo: args.voucherNo } })
  if (!journal) return { ok: false, error: `Journal ${args.voucherNo} not found` }
  if (journal.status !== 'active') return { ok: false, error: `Journal ${args.voucherNo} is already cancelled` }
  if (journal.voucherNo.startsWith('JV-')) {
    return { ok: false, error: `${journal.voucherNo} is a payment's companion voucher — cancel the PAYMENT (cancel_payment with its RCP-/PMT- number) and the companion follows via its contra` }
  }
  if (journal.voucherNo.startsWith('CN-')) {
    return { ok: false, error: `${journal.voucherNo} is a CONTRA (reversal) voucher — system row, not cancellable` }
  }
  const mirrorNo = `CN-${journal.voucherNo}`
  const mirrorExists = await db.journal.findUnique({ where: { voucherNo: mirrorNo } })
  if (mirrorExists) return { ok: false, error: `Contra ${mirrorNo} already exists — ${args.voucherNo} is already reversed` }

  return {
    ok: true,
    text: `Proposed cancellation of journal ${args.voucherNo} (₹${journal.amount}) — mirror ${mirrorNo} swaps the legs.`,
    summary: `Cancel journal ${args.voucherNo} | ${journal.debitAccount} Dr / ${journal.creditAccount} Cr | ₹${journal.amount} | mirror ${mirrorNo}`,
    creates: [
      {
        table: 'journal',
        data: {
          voucherNo: mirrorNo, voucherType: 'contra', partyId: journal.partyId, date: new Date(), finYear: journal.finYear,
          debitAccount: journal.creditAccount, creditAccount: journal.debitAccount, amount: journal.amount,
          narration: `Contra: cancel ${journal.voucherNo}${args.reason ? ' — ' + args.reason : ''}`,
        },
      },
    ],
    updates: [{ table: 'journal', id: journal.id, data: { status: 'cancelled' } }],
    sideEffects: [
      `Mirror journal ${mirrorNo} swaps debit/credit (audit preserved — both rows stay)`,
      'Party ledger effect of the original reverses via the mirror',
    ],
    async commit() {
      return await db.$transaction(async (tx) => {
        await tx.journal.update({ where: { id: journal.id }, data: { status: 'cancelled' } })
        const mirror = await tx.journal.create({
          data: {
            voucherNo: mirrorNo, voucherType: 'contra', partyId: journal.partyId, date: new Date(), finYear: journal.finYear,
            debitAccount: journal.creditAccount, creditAccount: journal.debitAccount, amount: journal.amount,
            narration: `Contra: cancel ${journal.voucherNo}${args.reason ? ' — ' + args.reason : ''}`,
          },
        })
        return { id: journal.id, voucherNo: journal.voucherNo, status: 'cancelled', mirror: mirror.voucherNo }
      })
    },
  }
}

export async function planCancelDebitNote(args: CancelDebitNoteInput): Promise<DocPlanResult> {
  const note = await db.debitNote.findUnique({ where: { noteNo: args.noteNo } })
  if (!note) return { ok: false, error: `Debit note ${args.noteNo} not found` }
  if (note.status === 'cancelled') return { ok: false, error: `Debit note ${args.noteNo} is already cancelled` }
  return {
    ok: true,
    text: `Proposed cancellation of debit note ${args.noteNo} (₹${note.amount}).`,
    summary: `Cancel debit note ${args.noteNo} | ${note.noteType} | ₹${note.amount} | reason: ${args.reason || 'not specified'}`,
    updates: [{ table: 'debitNote', id: note.id, data: { status: 'cancelled' } }],
    sideEffects: ['Party AR/AP effect of the note reverses (the note itself posts no ledger legs — honest claim)', 'The original row stays for audit'],
    async commit() {
      await db.debitNote.update({ where: { id: note.id }, data: { status: 'cancelled', reason: args.reason ?? note.reason } })
      return { id: note.id, status: 'cancelled' }
    },
  }
}

export async function planCancelExpense(args: CancelExpenseInput): Promise<DocPlanResult> {
  const exp = await db.expense.findUnique({ where: { expNo: args.expNo } })
  if (!exp) return { ok: false, error: `Expense ${args.expNo} not found` }
  if (exp.status === 'cancelled') return { ok: false, error: `Expense ${args.expNo} is already cancelled` }
  if (exp.status === 'settled') return { ok: false, error: `Expense ${args.expNo} is settled — reversal is a journal entry, not a cancel` }
  return {
    ok: true,
    text: `Proposed cancellation of expense ${args.expNo} (₹${exp.amount}).`,
    summary: `Cancel expense ${args.expNo} | ${exp.category} | ₹${exp.amount} | reason: ${args.reason || 'not specified'}`,
    updates: [{ table: 'expense', id: exp.id, data: { status: 'cancelled' } }],
    sideEffects: ['Expense leaves the cost reports (cancelled rows are excluded)', 'The original row stays for audit'],
    async commit() {
      await db.expense.update({ where: { id: exp.id }, data: { status: 'cancelled', narration: `${exp.narration ?? ''}${args.reason ? ' | cancelled: ' + args.reason : ''}`.trim() || null } })
      return { id: exp.id, status: 'cancelled' }
    },
  }
}

export async function planCancelBudget(args: CancelBudgetInput): Promise<DocPlanResult> {
  const budget = await db.budget.findUnique({ where: { id: args.budgetId }, include: { BudgetLine: true } })
  if (!budget) return { ok: false, error: `Budget ${args.budgetId} not found` }
  if (budget.status !== 'active') return { ok: false, error: `Budget is already ${budget.status}` }
  const actuals = round2(budget.BudgetLine.reduce((s, l) => s + l.actualAmount, 0))
  if (actuals > 0) {
    return { ok: false, error: `Budget has ₹${actuals} of recorded actuals against its lines — a budget with consumed lines cannot be cancelled (revise the amounts instead)` }
  }
  const label = budget.orderId ? `order budget (${budget.orderId})` : budget.deptId ? `dept budget (${budget.deptId})` : `budget ${budget.id}`
  return {
    ok: true,
    text: `Proposed cancellation of the ${label} (₹${budget.amount}, ${budget.finYear}).`,
    summary: `Cancel ${label} | ₹${budget.amount} | ${budget.finYear} | reason: ${args.reason || 'not specified'}`,
    updates: [{ table: 'budget', id: budget.id, data: { status: 'cancelled' } }],
    sideEffects: ['PO-vs-budget tolerance checks stop guarding this budget (zero lines enforced)', 'The original row stays for audit'],
    async commit() {
      await db.budget.update({ where: { id: budget.id }, data: { status: 'cancelled' } })
      return { id: budget.id, status: 'cancelled' }
    },
  }
}
