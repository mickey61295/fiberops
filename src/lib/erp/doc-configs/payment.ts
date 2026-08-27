// SPEC-M3 §8 row 16 — Payments & Receipts (/accounts/payments, item
// 'payments-receipts', legacy FrmPayment, FrmReceipt, FrmPaymentReg). Fields
// mirror PAYMENT_SCHEMA exactly. Chain step 15 of 15 (the collection stage);
// numberPrefix varies by direction (RCP- in / PMT- out) — the engine hint
// shows both. The service settles the invoice when fully collected.
import type { DocConfig } from './types'
import { PAYMENT_SCHEMA } from '../schemas/payment'
import { planPayment } from '../posting/payment'

export const paymentConfig: DocConfig = {
  docType: 'payment',
  slug: 'payment',
  title: 'Payment / Receipt',
  numberPrefix: 'RCP-/PMT-',
  numberField: 'voucherNo',
  chainStage: 15,
  schema: PAYMENT_SCHEMA,
  service: { plan: (input: unknown) => planPayment(input as Parameters<typeof planPayment>[0]) },
  headerFields: [
    { name: 'voucherNo', label: 'Voucher No', type: 'text', colSpan: 1 },
    { name: 'partyCode', label: 'Party', type: 'picker', picker: 'party', required: true, colSpan: 1 },
    { name: 'amount', label: 'Amount (₹)', type: 'number', required: true, colSpan: 1 },
    { name: 'direction', label: 'Direction', type: 'select', colSpan: 1, options: [
      { value: 'in', label: 'Receipt (in from buyer)' },
      { value: 'out', label: 'Payment (out to supplier)' },
    ] },
    { name: 'invoiceNo', label: 'Invoice No (settles when fully paid)', type: 'text', colSpan: 1 },
    { name: 'orderNo', label: 'Order No', type: 'text', colSpan: 1 },
    { name: 'mode', label: 'Mode', type: 'select', colSpan: 1, options: [
      { value: 'cash', label: 'Cash' },
      { value: 'bank', label: 'Bank' },
      { value: 'cheque', label: 'Cheque' },
      { value: 'upi', label: 'UPI' },
    ] },
    { name: 'reference', label: 'Reference (UTR / cheque no)', type: 'text', colSpan: 2 },
    { name: 'payDate', label: 'Pay Date', type: 'date', colSpan: 1 },
    { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
  ],
  listColumns: [
    { name: 'voucherNo', label: 'Voucher No' },
    { name: 'partyName', label: 'Party' },
    { name: 'direction', label: 'Dir' },
    { name: 'amount', label: 'Amount (₹)', align: 'right' },
    { name: 'mode', label: 'Mode' },
    { name: 'payDate', label: 'Date' },
  ],
  recentCount: 20,
  agentTools: ['record_payment'],
}
