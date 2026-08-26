/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M3 §5 row 18 — record_payment service. Logic extracted VERBATIM from
// tools.ts. Writes Payment + companion receipt/payment Journal voucher; marks
// the invoice paid when fully collected. Voucher numbering RCP-/PMT-.

import { db } from '@/lib/db'
import { resolveDocNo } from '../numbering'
import type { DocPlanResult } from './types'
import type { PaymentInput } from '../schemas/payment'

export async function planPayment(args: PaymentInput): Promise<DocPlanResult> {
  const party = await db.party.findUnique({ where: { code: args.partyCode } })
  if (!party) return { ok: false, error: `Party ${args.partyCode} not found` }
  const direction = args.direction === 'out' ? 'out' : 'in'
  const invoice = args.invoiceNo ? await db.salesInvoice.findUnique({ where: { invoiceNo: args.invoiceNo } }) : null
  if (args.invoiceNo && !invoice) return { ok: false, error: `Invoice ${args.invoiceNo} not found` }
  const order = args.orderNo ? await db.order.findUnique({ where: { orderNo: args.orderNo } }) : null
  if (args.orderNo && !order) return { ok: false, error: `Order ${args.orderNo} not found` }
  const voucherNo = await resolveDocNo('payment', 'voucherNo', direction === 'in' ? 'RCP-' : 'PMT-', args.voucherNo)
  const payDate = args.payDate ? new Date(args.payDate) : new Date()
  const mode = args.mode || 'bank'
  const settlesInvoice = invoice && direction === 'in' && args.amount >= invoice.billAmount - 0.01

  return {
    ok: true,
    text: `Proposed payment ${voucherNo}: ${direction === 'in' ? 'RECEIVE' : 'PAY'} ₹${args.amount} ${direction === 'in' ? 'from' : 'to'} ${party.name}${invoice ? ' against invoice ' + invoice.invoiceNo : ''}.`,
    summary: `${direction === 'in' ? 'Receipt' : 'Payment'} ${voucherNo} | ${party.name} | ₹${args.amount} | ${mode}${invoice ? ' | invoice ' + invoice.invoiceNo + ' (₹' + invoice.billAmount + ')' : ''}${args.reference ? ' | ref ' + args.reference : ''}`,
    creates: [{ table: 'payment', data: { voucherNo, partyId: party.id, orderId: order?.id, invoiceId: invoice?.id, payDate, finYear: '26-27', direction, amount: args.amount, mode, reference: args.reference, notes: args.notes } }],
    updates: settlesInvoice ? [{ table: 'salesInvoice', id: invoice!.id, data: { status: 'paid' } }] : undefined,
    sideEffects: [
      direction === 'in' ? 'Party receivable reduces' : 'Party payable reduces',
      'Journal voucher written (receipt/payment)',
      settlesInvoice ? `Invoice ${invoice!.invoiceNo} marked paid` : null,
    ].filter((s): s is string => Boolean(s)),
    async commit() {
      return await db.$transaction(async (tx) => {
        const pay = await tx.payment.create({
          data: { voucherNo, partyId: party.id, orderId: order?.id, invoiceId: invoice?.id, payDate, finYear: '26-27', direction, amount: args.amount, mode, reference: args.reference, notes: args.notes },
        })
        await tx.journal.create({
          data: {
            voucherNo: `JV-${voucherNo}`,
            voucherType: direction === 'in' ? 'receipt' : 'payment',
            partyId: party.id,
            date: payDate,
            finYear: '26-27',
            debitAccount: direction === 'in' ? 'Cash/Bank' : party.name,
            creditAccount: direction === 'in' ? party.name : 'Cash/Bank',
            amount: args.amount,
            narration: `${direction === 'in' ? 'Collection' : 'Payment'} ${voucherNo}${invoice ? ' against ' + invoice.invoiceNo : ''}${args.reference ? ' ref ' + args.reference : ''}`,
          },
        })
        if (settlesInvoice) {
          await tx.salesInvoice.update({ where: { id: invoice!.id }, data: { status: 'paid' } })
        }
        return { id: pay.id, voucherNo: pay.voucherNo, invoiceSettled: settlesInvoice }
      })
    },
  }
}
