import type { RegisterConfig } from './types'

/** /costing/budget-vs-actual — SPEC-M4 §7 row 15 (FrmBudgetAndActualComp).
 *  SPEC-M54 M-05 (EH-03): the actual now includes expenses. */
export const budgetVsActualConfig: RegisterConfig = {
  slug: 'budget-vs-actual',
  title: 'Budget vs Actual',
  description: 'Per order: budgeted (cost sheets) vs actual (PO + production + expenses + shift wages).',
  filters: [
    { key: 'order', label: 'Order', type: 'order', placeholder: 'e.g. SO-1001' },
  ],
  columns: [
    { name: 'orderNo', label: 'Order', mono: true },
    { name: 'buyer', label: 'Buyer' },
    { name: 'budgeted', label: 'Budgeted', align: 'right', format: 'inr' },
    { name: 'poValue', label: 'PO value', align: 'right', format: 'inr' },
    { name: 'prodCost', label: 'Production', align: 'right', format: 'inr' },
    { name: 'expense', label: 'Expenses', align: 'right', format: 'inr' },
    { name: 'actual', label: 'Actual', align: 'right', format: 'inr' },
    { name: 'variance', label: 'Variance', align: 'right', format: 'inr' },
  ],
  agentTools: ['get_budget_vs_actual'],
  askPrompt: 'Show me budget vs actual by order',
  emptyMessage: 'No budget/actual data yet.',
}
