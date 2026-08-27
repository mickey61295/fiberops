import type { RegisterConfig } from './types'

/** /procurement/rate-confirmation — SPEC-M5 §7-A-6 (Rpt*RateConfirm family). */
export const rateConfirmationConfig: RegisterConfig = {
  slug: 'rate-confirmation',
  title: 'Rate Confirmation',
  description: 'PO rate lines per supplier — confirm rates before GRN/billing.',
  filters: [
    { key: 'from', label: 'From', type: 'dateRange' },
    { key: 'to', label: 'To', type: 'dateRange' },
    { key: 'party', label: 'Party', type: 'party', placeholder: 'code or name' },
    { key: 'itemType', label: 'Item Type', type: 'itemType', options: [
      { value: 'yarn', label: 'Yarn' },
      { value: 'fabric', label: 'Fabric' },
      { value: 'accessory', label: 'Accessory' },
    ] },
  ],
  columns: [
    { name: 'poNo', label: 'PO No', mono: true },
    { name: 'party', label: 'Party' },
    { name: 'itemType', label: 'Type' },
    { name: 'itemCode', label: 'Item', mono: true },
    { name: 'qty', label: 'Qty', align: 'right', format: 'qty' },
    { name: 'rate', label: 'Rate (₹)', align: 'right', format: 'inr' },
    { name: 'amount', label: 'Amount (₹)', align: 'right', format: 'inr' },
    { name: 'orderDate', label: 'PO Date' },
    { name: 'status', label: 'Status' },
  ],
  agentTools: ['list_po_rates', 'get_purchase_order'],
  askPrompt: 'Show me PO rate lines pending confirmation',
  emptyMessage: 'No purchase order lines yet.',
}
