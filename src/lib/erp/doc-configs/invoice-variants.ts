/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M5 §7-A-3/4 — the invoice VARIANT configs (the §4 variant-doc pattern:
// config wraps the EXISTING service, injecting type defaults; zero engine
// changes, NO service forks, NO new tools — the agent door for both variants
// is the existing create_sales_invoice whose schema already carries billType).
//   local-invoice       (/accounts/invoice/local)  — legacy FrmLocalInvoice,
//     FrmLocalInvConfirm: domestic intra-state sales billing (CGST+SGST).
//     Variant defaults: billType='sales', gstType='cgst_sgst'. The recent list
//     narrows to domestic sales invoices with igstRate=0 (intra-state ≈ local).
//   piece-jobwork-invoice (/accounts/invoice/piece) — legacy frmPieceInv,
//     Rpt_JobwrkInvoice: piece-rate/jobwork billing. Variant default:
//     billType='jobwork'. Recent list narrows to billType='jobwork'.
import type { DocConfig } from './types'
import { LOCAL_INVOICE_SCHEMA, PIECE_JOBWORK_INVOICE_SCHEMA } from '../schemas/invoice-variants'
import { planInvoice } from '../posting/invoice'

export const localInvoiceConfig: DocConfig = {
  docType: 'local-invoice',
  slug: 'local-invoice',
  title: 'Local Invoice',
  numberPrefix: 'INV-',
  numberField: 'invoiceNo',
  chainStage: 13,
  schema: LOCAL_INVOICE_SCHEMA,
  service: {
    plan: (input: any) =>
      planInvoice({
        ...input,
        billType: 'sales',
        gstType: input?.gstType ?? 'cgst_sgst',
      } as Parameters<typeof planInvoice>[0]),
  },
  headerFields: [
    { name: 'invoiceNo', label: 'Invoice No', type: 'text', colSpan: 1 },
    { name: 'orderNo', label: 'Order No', type: 'text', required: true, colSpan: 1 },
    { name: 'partyCode', label: 'Local Party', type: 'picker', picker: 'party', required: true, colSpan: 1 },
    { name: 'billType', label: 'Bill Type', type: 'readonly', colSpan: 1 },
    { name: 'totalQty', label: 'Total Qty', type: 'number', required: true, colSpan: 1 },
    { name: 'taxableValue', label: 'Taxable Value (₹)', type: 'number', required: true, colSpan: 1 },
    { name: 'gstRate', label: 'GST Rate %', type: 'number', required: true, colSpan: 1 },
    { name: 'gstType', label: 'GST Type', type: 'select', colSpan: 1, options: [
      { value: 'cgst_sgst', label: 'CGST + SGST (local, intra-state — default)' },
      { value: 'igst', label: 'IGST (inter-state)' },
    ] },
    { name: 'invoiceDate', label: 'Invoice Date', type: 'date', colSpan: 1 },
    // SPEC-M40 PAY-07 — the aging anchor (schema keys inherited from INVOICE_SCHEMA)
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
  ],
  recentCount: 20,
  agentTools: ['create_sales_invoice', 'list_invoices'],
}

export const pieceJobworkInvoiceConfig: DocConfig = {
  docType: 'piece-jobwork-invoice',
  slug: 'piece-jobwork-invoice',
  title: 'Piece / Jobwork Invoice',
  numberPrefix: 'INV-',
  numberField: 'invoiceNo',
  chainStage: 13,
  schema: PIECE_JOBWORK_INVOICE_SCHEMA,
  service: {
    plan: (input: any) =>
      planInvoice({ ...input, billType: 'jobwork' } as Parameters<typeof planInvoice>[0]),
  },
  headerFields: [
    { name: 'invoiceNo', label: 'Invoice No', type: 'text', colSpan: 1 },
    { name: 'orderNo', label: 'Order No', type: 'text', required: true, colSpan: 1 },
    { name: 'partyCode', label: 'Jobworker / Party', type: 'picker', picker: 'party', required: true, colSpan: 1 },
    { name: 'billType', label: 'Bill Type', type: 'readonly', colSpan: 1 },
    { name: 'totalQty', label: 'Total Pcs', type: 'number', required: true, colSpan: 1 },
    { name: 'taxableValue', label: 'Taxable Value (₹)', type: 'number', required: true, colSpan: 1 },
    { name: 'gstRate', label: 'GST Rate %', type: 'number', required: true, colSpan: 1 },
    { name: 'gstType', label: 'GST Type', type: 'select', required: true, colSpan: 1, options: [
      { value: 'cgst_sgst', label: 'CGST + SGST (intra-state)' },
      { value: 'igst', label: 'IGST (inter-state)' },
    ] },
    { name: 'invoiceDate', label: 'Invoice Date', type: 'date', colSpan: 1 },
    // SPEC-M40 PAY-07 — the aging anchor (schema keys inherited from INVOICE_SCHEMA)
    { name: 'creditDays', label: 'Credit days', type: 'number', colSpan: 1 },
    { name: 'dueDate', label: 'Due date (overrides credit days)', type: 'date', colSpan: 1 },
    { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
  ],
  listColumns: [
    { name: 'invoiceNo', label: 'Invoice No' },
    { name: 'partyName', label: 'Party' },
    { name: 'orderNo', label: 'Order' },
    { name: 'totalQty', label: 'Pcs', align: 'right' },
    { name: 'billAmount', label: 'Bill Amount (₹)', align: 'right' },
    { name: 'status', label: 'Status' },
    { name: 'invoiceDate', label: 'Date' },
  ],
  recentCount: 20,
  agentTools: ['create_sales_invoice', 'list_invoices'],
}
