import type { RegisterConfig } from './types'

/** /production/register — SPEC-M4 §7 row 10 (FrmProductionStatusReg family). */
export const productionStatusConfig: RegisterConfig = {
  slug: 'production-status',
  title: 'Production Status Register',
  description: 'Production per order × department — qty, rework split, jobwork column, wages.',
  filters: [
    { key: 'from', label: 'From', type: 'dateRange' },
    { key: 'to', label: 'To', type: 'dateRange' },
    { key: 'order', label: 'Order', type: 'order', placeholder: 'e.g. SO-1001' },
    { key: 'q', label: 'Dept', type: 'text', placeholder: 'dept code' },
  ],
  columns: [
    { name: 'orderNo', label: 'Order', mono: true },
    { name: 'buyer', label: 'Buyer' },
    { name: 'dept', label: 'Dept' },
    { name: 'qty', label: 'Qty', align: 'right', format: 'int' },
    { name: 'reworkQty', label: 'Rework', align: 'right', format: 'int' },
    { name: 'jobworkQty', label: 'Jobwork', align: 'right', format: 'qty' },
    { name: 'amount', label: 'Amount', align: 'right', format: 'inr' },
    { name: 'shiftWages', label: 'Shift wages', align: 'right', format: 'inr' },
  ],
  agentTools: ['get_production_status'],
  askPrompt: 'Show me production status per order and department',
  emptyMessage: 'No production entries for these filters.',
}
