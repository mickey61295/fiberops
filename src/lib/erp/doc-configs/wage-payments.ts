// SPEC-M5 §7-B-21 — wage payments VARIANT config (/hr/wage-payments, item
// 'wage-payments', legacy FrmPaymentReg_Wages). Variant over planWagePayment
// (posting/payment.ts sibling: pins direction='out' + wage narration default).
// ERRATUM 7: the party picker is filtered server-side to employee parties
// (pickerFilter partyType=employee — /api/erp master_search filterField).
// PMT- voucher + companion payment Journal + party-ledger effects come from
// the base service. Views reuse /accounts/payments/[id].
import type { DocConfig } from './types'
import { WAGE_PAYMENT_SCHEMA } from '../schemas/payment-variants'
import { planWagePayment } from '../posting/payment'

export const wagePaymentsConfig: DocConfig = {
  docType: 'wage-payments',
  slug: 'wage-payments',
  title: 'Wage Payments',
  numberPrefix: 'PMT-',
  numberField: 'voucherNo',
  chainStage: 15,
  schema: WAGE_PAYMENT_SCHEMA,
  service: { plan: (input: unknown) => planWagePayment(input as Parameters<typeof planWagePayment>[0]) },
  headerFields: [
    { name: 'voucherNo', label: 'Voucher No', type: 'text', colSpan: 1 },
    { name: 'partyCode', label: 'Employee (party)', type: 'picker', picker: 'party', required: true, colSpan: 1, pickerFilter: { field: 'partyType', value: 'employee' } },
    { name: 'amount', label: 'Amount (₹)', type: 'number', required: true, colSpan: 1 },
    { name: 'direction', label: 'Direction', type: 'readonly', colSpan: 1 },
    // HFX-06 (Phase-6B Batch 0) — rtgs | neft join the mode select (the schema
    // comment's contract: cash | bank | cheque | rtgs | neft | upi).
    { name: 'mode', label: 'Mode', type: 'select', colSpan: 1, options: [
      { value: 'cash', label: 'Cash' },
      { value: 'bank', label: 'Bank' },
      { value: 'cheque', label: 'Cheque' },
      { value: 'rtgs', label: 'RTGS' },
      { value: 'neft', label: 'NEFT' },
      { value: 'upi', label: 'UPI' },
    ] },
    { name: 'payDate', label: 'Pay Date', type: 'date', colSpan: 1 },
    { name: 'orderNo', label: 'Order No (optional)', type: 'text', colSpan: 1 },
    { name: 'reference', label: 'Reference (UTR / cheque no)', type: 'text', colSpan: 2 },
    { name: 'notes', label: 'Notes (period / week)', type: 'textarea', colSpan: 2 },
  ],
  listColumns: [
    { name: 'voucherNo', label: 'Voucher No' },
    { name: 'partyName', label: 'Employee' },
    { name: 'amount', label: 'Amount (₹)', align: 'right' },
    { name: 'mode', label: 'Mode' },
    { name: 'payDate', label: 'Date' },
  ],
  recentCount: 20,
  agentTools: ['pay_wages'],
}
