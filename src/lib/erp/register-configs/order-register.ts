import type { RegisterConfig } from './types'

/** /orders/register — SPEC-M4 §7 row 2 (FrmOrderReg family). */
export const orderRegisterConfig: RegisterConfig = {
  slug: 'order-register',
  title: 'Order Register',
  description: 'Filterable order day-book with totals — every row opens the Order Hub.',
  filters: [
    {
      key: 'status',
      label: 'Status',
      type: 'status',
      options: [
        { value: 'open', label: 'Open' },
        { value: 'in_progress', label: 'In progress' },
        { value: 'completed', label: 'Completed' },
        { value: 'cancelled', label: 'Cancelled' },
      ],
    },
    // SPEC-M43 PRG-01 — the trade-type filter
    {
      key: 'orderType',
      label: 'Type',
      type: 'select',
      options: [
        { value: 'export', label: 'Export' },
        { value: 'domestic', label: 'Domestic' },
        { value: 'trading', label: 'Trading' },
      ],
    },
    { key: 'from', label: 'From', type: 'dateRange' },
    { key: 'to', label: 'To', type: 'dateRange' },
    { key: 'q', label: 'Search', type: 'text', placeholder: 'order no, buyer, style, buyer PO…' },
  ],
  columns: [
    { name: 'orderNo', label: 'Order No', mono: true },
    { name: 'buyer', label: 'Buyer' },
    { name: 'style', label: 'Style', mono: true },
    { name: 'buyerPoRef', label: 'Buyer PO', mono: true },
    { name: 'orderType', label: 'Type' },
    { name: 'orderDate', label: 'Ordered', format: 'date' },
    { name: 'deliveryDate', label: 'Delivery', format: 'date' },
    { name: 'totalPcs', label: 'Pcs', align: 'right', format: 'int' },
    { name: 'totalValue', label: 'Value', align: 'right', format: 'inr' },
    { name: 'status', label: 'Status', format: 'badge' },
  ],
  agentTools: ['list_orders'],
  askPrompt: 'Show me the order register',
  emptyMessage: 'No orders match these filters.',
}
