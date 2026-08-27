import type { RegisterConfig } from './types'

/** /hr/wages — SPEC-M5 §7-B-20 (Frm_ProductionWages family). Payroll view of
 *  piece-rate earnings; the page adds the "Generate wage bill" Journal button
 *  (Dr Production Wages / Cr Wage Payable) + the budget-vs-actual link (W6). */
export const productionWagesConfig: RegisterConfig = {
  slug: 'production-wages',
  title: 'Production Wages',
  description: 'Piece-rate earnings per operator — the wage bill source (qty × rate).',
  filters: [
    { key: 'from', label: 'From', type: 'dateRange' },
    { key: 'to', label: 'To', type: 'dateRange' },
    { key: 'order', label: 'Order', type: 'order', placeholder: 'e.g. SO-1001' },
    { key: 'q', label: 'Dept', type: 'text', placeholder: 'dept code' },
  ],
  columns: [
    { name: 'operator', label: 'Operator' },
    { name: 'code', label: 'Code', mono: true },
    { name: 'dept', label: 'Dept' },
    { name: 'orders', label: 'Orders', align: 'right', format: 'int' },
    { name: 'entries', label: 'Entries', align: 'right', format: 'int' },
    { name: 'qty', label: 'Qty', align: 'right', format: 'int' },
    { name: 'rate', label: 'Avg rate (₹)', align: 'right', format: 'inr' },
    { name: 'amount', label: 'Earned (₹)', align: 'right', format: 'inr' },
  ],
  // read-door chip only — the wage-bill journal door is the page's
  // "Generate wage bill" button (planJournal) + the menu item's create_journal
  agentTools: ['get_production_wages'],
  askPrompt: 'Show me production wages earned per operator',
  emptyMessage: 'No production entries in this period yet.',
}
