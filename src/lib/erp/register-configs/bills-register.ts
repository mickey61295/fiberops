import type { RegisterConfig } from './types'

/** /accounts/bills-register — SPEC-M4 §7 row 12 (FrmBillsReg family). */
export const billsRegisterConfig: RegisterConfig = {
  slug: 'bills-register',
  title: 'Bills Register',
  description: 'Bills day-book: invoices, debit notes (deductions) and payments (collected).',
  filters: [
    { key: 'from', label: 'From', type: 'dateRange' },
    { key: 'to', label: 'To', type: 'dateRange' },
    { key: 'party', label: 'Party', type: 'party', placeholder: 'code or name' },
  ],
  columns: [
    { name: 'date', label: 'Date', format: 'date' },
    { name: 'docNo', label: 'Doc No', mono: true },
    { name: 'party', label: 'Party' },
    { name: 'docType', label: 'Type', format: 'badge' },
    { name: 'billAmount', label: 'Billed', align: 'right', format: 'inr' },
    { name: 'deduction', label: 'Deductions', align: 'right', format: 'inr' },
    { name: 'collected', label: 'Collected', align: 'right', format: 'inr' },
    { name: 'status', label: 'Status', format: 'badge' },
  ],
  agentTools: ['get_bills_register'],
  askPrompt: 'Show me the bills register with outstanding',
  emptyMessage: 'No bills for these filters.',
}
