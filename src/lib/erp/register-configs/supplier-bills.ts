import type { RegisterConfig } from './types'

/** /accounts/supplier-bills — SPEC-M4 §7 row 13 (FrmSupplierBillReg).
 *  GRN-type select rides the frozen `status` key (§4 frozen key set); the
 *  service maps q.status → grnType (the register's natural "status" axis). */
export const supplierBillsConfig: RegisterConfig = {
  slug: 'supplier-bills',
  title: 'Supplier Bill Register',
  description: 'Supplier-wise bill register (GRN day-book with PO linkage).',
  filters: [
    { key: 'from', label: 'From', type: 'dateRange' },
    { key: 'to', label: 'To', type: 'dateRange' },
    { key: 'party', label: 'Supplier', type: 'party', placeholder: 'code or name' },
    {
      key: 'status',
      label: 'GRN type',
      type: 'select',
      options: [
        { value: 'purchase', label: 'Purchase' },
        { value: 'process', label: 'Process' },
        { value: 'direct_receipt', label: 'Direct receipt' },
        { value: 'process_return', label: 'Process return' },
        { value: 'sales_return', label: 'Sales return' },
      ],
    },
  ],
  columns: [
    { name: 'grnNo', label: 'GRN No', mono: true },
    { name: 'grnType', label: 'Type', format: 'badge' },
    { name: 'party', label: 'Supplier' },
    { name: 'poNo', label: 'PO No', mono: true },
    { name: 'grnDate', label: 'Date', format: 'date' },
    { name: 'totalQty', label: 'Qty', align: 'right', format: 'qty' },
    { name: 'totalValue', label: 'Value', align: 'right', format: 'inr' },
    // SPEC-M5 §6 Wave C — bill-pass state: 'Passed' when an approved
    // supplier_bill Approval exists for the GRN (create_bill_pass), 'Pending'
    // when one is pending, '—' when none has been raised.
    { name: 'billPass', label: 'Bill pass', format: 'badge' },
  ],
  agentTools: ['list_supplier_bills'],
  askPrompt: 'Show me the supplier bill register',
  emptyMessage: 'No GRNs for these filters.',
}
