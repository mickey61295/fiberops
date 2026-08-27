import type { RegisterConfig } from './types'

/** /costing/piece-rate — SPEC-M5 §7-A-7 (RptPieceRateConfirm family). */
export const pieceRateConfirmationConfig: RegisterConfig = {
  slug: 'piece-rate-confirmation',
  title: 'Piece-Rate Confirmation',
  description: 'Piece rates earned per operator × order — confirm before wage billing.',
  filters: [
    { key: 'from', label: 'From', type: 'dateRange' },
    { key: 'to', label: 'To', type: 'dateRange' },
    { key: 'order', label: 'Order', type: 'order', placeholder: 'e.g. SO-1001' },
    { key: 'q', label: 'Dept', type: 'text', placeholder: 'dept code' },
  ],
  columns: [
    { name: 'operator', label: 'Operator' },
    { name: 'orderNo', label: 'Order', mono: true },
    { name: 'dept', label: 'Dept' },
    { name: 'qty', label: 'Qty', align: 'right', format: 'int' },
    { name: 'rate', label: 'Avg rate (₹)', align: 'right', format: 'inr' },
    { name: 'amount', label: 'Earned (₹)', align: 'right', format: 'inr' },
    { name: 'period', label: 'Since' },
  ],
  agentTools: ['list_piece_rates', 'get_production_status'],
  askPrompt: 'Show me piece rates earned by operator',
  emptyMessage: 'No production entries yet.',
}
