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
    { key: 'from', label: 'From', type: 'dateRange' },
    { key: 'to', label: 'To', type: 'dateRange' },
    { key: 'q', label: 'Search', type: 'text', placeholder: 'order no, buyer, style…' },
  ],
  columns: [
    { name: 'orderNo', label: 'Order No', mono: true },
    { name: 'buyer', label: 'Buyer' },
    { name: 'style', label: 'Style', mono: true },
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
