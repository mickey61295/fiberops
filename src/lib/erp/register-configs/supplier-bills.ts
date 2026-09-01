import type { RegisterConfig } from './types'

/** /accounts/supplier-bills — SPEC-M4 §7 row 13 (FrmSupplierBillReg), rewritten
 *  by SPEC-M40 PAY-03: the register lists SupplierBill documents (SB-####) with
 *  their own status fleet (draft → passed → partial → paid; cancelled — every
 *  state has a writer) + the 3-way match verdict badge. */
export const supplierBillsConfig: RegisterConfig = {
  slug: 'supplier-bills',
  title: 'Supplier Bill Register',
  description: 'Supplier bill documents (SB-####) — 3-way match, TDS, and the pass/payment lifecycle.',
  filters: [
    { key: 'from', label: 'From', type: 'dateRange' },
    { key: 'to', label: 'To', type: 'dateRange' },
    { key: 'party', label: 'Supplier', type: 'party', placeholder: 'code or name' },
    {
      key: 'status',
      label: 'Status',
      type: 'select',
      options: [
        { value: 'draft', label: 'Draft (awaiting pass)' },
        { value: 'passed', label: 'Passed (payable)' },
        { value: 'partial', label: 'Partly paid' },
        { value: 'paid', label: 'Paid' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
    },
  ],
  columns: [
    { name: 'billNo', label: 'Bill No', mono: true },
    { name: 'party', label: 'Supplier' },
    { name: 'grnNo', label: 'GRN No', mono: true },
    { name: 'poNo', label: 'PO No', mono: true },
    { name: 'billDate', label: 'Bill date', format: 'date' },
    { name: 'taxableValue', label: 'Taxable', align: 'right', format: 'inr' },
    { name: 'gst', label: 'GST', align: 'right', format: 'inr' },
    { name: 'billAmount', label: 'Bill ₹', align: 'right', format: 'inr' },
    { name: 'tdsPercent', label: 'TDS %', align: 'right' },
    // SPEC-M40 PAY-04 — the stored 3-way match verdict (null = not yet passed)
    { name: 'matchStatus', label: 'Match', format: 'badge' },
    { name: 'status', label: 'Status', format: 'badge' },
  ],
  agentTools: ['list_supplier_bills'],
  askPrompt: 'Show me the supplier bill register',
  emptyMessage: 'No supplier bills for these filters — create one from a purchase GRN (create_supplier_bill).',
}
