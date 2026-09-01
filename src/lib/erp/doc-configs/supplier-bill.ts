// SPEC-M40 §1 PAY-03 — Supplier Bill (/accounts/bill, item 'supplier-bill',
// SB-####). Form door → planSupplierBill — the same service as the
// create_supplier_bill agent tool (ADR-001). Lines default to the GRN's own
// lines; overrides subset the billed qty/rate (the 3-way match flags the
// delta). Draft until the pass gate (create_bill_pass / the Bill Pass queue).
import type { DocConfig } from './types'
import { SUPPLIER_BILL_SCHEMA } from '../schemas/supplier-bill'
import { planSupplierBill } from '../posting/supplier-bill'

export const supplierBillConfig: DocConfig = {
  docType: 'supplier-bill',
  slug: 'supplier-bill',
  title: 'Supplier Bill',
  numberPrefix: 'SB-',
  numberField: 'billNo',
  schema: SUPPLIER_BILL_SCHEMA,
  service: { plan: (input: unknown) => planSupplierBill(input as Parameters<typeof planSupplierBill>[0]) },
  headerFields: [
    { name: 'billNo', label: 'Bill No', type: 'text', colSpan: 1 },
    { name: 'grnNo', label: 'GRN No', type: 'text', required: true, colSpan: 1 },
    { name: 'billDate', label: 'Bill date', type: 'date', colSpan: 1 },
    { name: 'gstRate', label: 'GST %', type: 'number', colSpan: 1 },
    { name: 'gstType', label: 'GST type', type: 'select', colSpan: 1, options: [
      { value: 'cgst_sgst', label: 'CGST+SGST (intra-state)' },
      { value: 'igst', label: 'IGST (inter-state)' },
    ] },
    { name: 'dueDate', label: 'Due date', type: 'date', colSpan: 1 },
    { name: 'tdsPercent', label: 'TDS %', type: 'number', colSpan: 1 },
    { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
  ],
  lineFields: [
    { name: 'itemCode', label: 'Item', type: 'text', required: true },
    { name: 'qty', label: 'Qty', type: 'number' },
    { name: 'rate', label: 'Rate', type: 'number' },
  ],
  listColumns: [
    { name: 'billNo', label: 'Bill No' },
    { name: 'partyName', label: 'Supplier' },
    { name: 'grnNo', label: 'GRN No' },
    { name: 'billDate', label: 'Bill date' },
    { name: 'billAmount', label: 'Bill ₹', align: 'right' },
    { name: 'matchStatus', label: 'Match' },
    { name: 'status', label: 'Status' },
  ],
  recentCount: 20,
  agentTools: ['create_supplier_bill', 'create_bill_pass'],
}
