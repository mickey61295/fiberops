// SPEC-M3 §8 row 14 — Sales Invoice (/accounts/invoice, item 'sales-invoice',
// legacy Rpt_SalesInvoice family). Fields mirror INVOICE_SCHEMA exactly.
// Chain step 13 of 15. Header-only op: the service computes GST split + total.
import type { DocConfig } from './types'
import { INVOICE_SCHEMA } from '../schemas/invoice'
import { planInvoice } from '../posting/invoice'

export const invoiceConfig: DocConfig = {
  docType: 'invoice',
  slug: 'invoice',
  title: 'Sales Invoice',
  numberPrefix: 'INV-',
  numberField: 'invoiceNo',
  chainStage: 13,
  schema: INVOICE_SCHEMA,
  service: { plan: (input: unknown) => planInvoice(input as Parameters<typeof planInvoice>[0]) },
  headerFields: [
    { name: 'invoiceNo', label: 'Invoice No', type: 'text', colSpan: 1 },
    { name: 'orderNo', label: 'Order No', type: 'text', required: true, colSpan: 1 },
    { name: 'partyCode', label: 'Party', type: 'picker', picker: 'party', required: true, colSpan: 1 },
    { name: 'billType', label: 'Bill Type', type: 'select', required: true, colSpan: 1, options: [
      { value: 'sales', label: 'Sales' },
      { value: 'jobwork', label: 'Jobwork' },
      { value: 'yarn_sales', label: 'Yarn sales' },
      { value: 'fab_sales', label: 'Fabric sales' },
    ] },
    { name: 'totalQty', label: 'Total Qty', type: 'number', required: true, colSpan: 1 },
    { name: 'taxableValue', label: 'Taxable Value (₹)', type: 'number', required: true, colSpan: 1 },
    { name: 'gstRate', label: 'GST Rate %', type: 'number', required: true, colSpan: 1 },
    { name: 'gstType', label: 'GST Type', type: 'select', required: true, colSpan: 1, options: [
      { value: 'cgst_sgst', label: 'CGST + SGST (intra-state)' },
      { value: 'igst', label: 'IGST (inter-state)' },
    ] },
    { name: 'invoiceDate', label: 'Invoice Date', type: 'date', colSpan: 1 },
    // SPEC-M40 PAY-07 — the aging anchor: dueDate = invoiceDate + creditDays
    { name: 'creditDays', label: 'Credit days', type: 'number', colSpan: 1 },
    { name: 'dueDate', label: 'Due date (overrides credit days)', type: 'date', colSpan: 1 },
    { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
  ],
  listColumns: [
    { name: 'invoiceNo', label: 'Invoice No' },
    { name: 'partyName', label: 'Party' },
    { name: 'orderNo', label: 'Order' },
    { name: 'totalQty', label: 'Qty', align: 'right' },
    { name: 'billAmount', label: 'Bill Amount (₹)', align: 'right' },
    { name: 'status', label: 'Status' },
    { name: 'invoiceDate', label: 'Date' },
    { name: 'dueDate', label: 'Due' },
  ],
  recentCount: 20,
  agentTools: ['create_sales_invoice'],
}
