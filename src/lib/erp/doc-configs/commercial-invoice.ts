// SPEC-M5 §7-A-2 — Commercial Invoice (/orders/commercial-invoice, item
// 'commercial-invoice', legacy FrmCommericalInv_New/FrmInvComm). Export
// variant of the sales invoice: invoiceType='export' + ern. Own tool
// create_commercial_invoice → planExportInvoice (sibling of planInvoice).
import type { DocConfig } from './types'
import { COMMERCIAL_INVOICE_SCHEMA } from '../schemas/commercial-invoice'
import { planExportInvoice } from '../posting/invoice'

export const commercialInvoiceConfig: DocConfig = {
  docType: 'commercial-invoice',
  slug: 'commercial-invoice',
  title: 'Commercial Invoice',
  numberPrefix: 'INV-',
  numberField: 'invoiceNo',
  chainStage: 13,
  schema: COMMERCIAL_INVOICE_SCHEMA,
  service: { plan: (input: unknown) => planExportInvoice(input as Parameters<typeof planExportInvoice>[0]) },
  headerFields: [
    { name: 'invoiceNo', label: 'Invoice No', type: 'text', colSpan: 1 },
    { name: 'orderNo', label: 'Order No', type: 'text', required: true, colSpan: 1 },
    { name: 'partyCode', label: 'Export Party', type: 'picker', picker: 'party', required: true, colSpan: 1 },
    { name: 'billType', label: 'Bill Type', type: 'select', colSpan: 1, options: [
      { value: 'sales', label: 'Sales' },
      { value: 'jobwork', label: 'Jobwork' },
      { value: 'yarn_sales', label: 'Yarn sales' },
      { value: 'fab_sales', label: 'Fabric sales' },
    ] },
    { name: 'totalQty', label: 'Total Qty', type: 'number', required: true, colSpan: 1 },
    { name: 'taxableValue', label: 'Taxable Value (₹)', type: 'number', required: true, colSpan: 1 },
    { name: 'gstRate', label: 'GST Rate % (0 on exports)', type: 'number', required: true, colSpan: 1 },
    { name: 'gstType', label: 'GST Type', type: 'select', colSpan: 1, options: [
      { value: 'igst', label: 'IGST / zero-rated (default)' },
      { value: 'cgst_sgst', label: 'CGST + SGST' },
    ] },
    { name: 'ern', label: 'ERN (Export Report No)', type: 'text', colSpan: 1 },
    { name: 'invoiceDate', label: 'Invoice Date', type: 'date', colSpan: 1 },
    { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
  ],
  listColumns: [
    { name: 'invoiceNo', label: 'Invoice No' },
    { name: 'partyName', label: 'Export Party' },
    { name: 'orderNo', label: 'Order' },
    { name: 'totalQty', label: 'Qty', align: 'right' },
    { name: 'billAmount', label: 'Bill Amount (₹)', align: 'right' },
    { name: 'ern', label: 'ERN' },
    { name: 'invoiceDate', label: 'Date' },
  ],
  recentCount: 20,
  agentTools: ['create_commercial_invoice', 'list_invoices'],
}
