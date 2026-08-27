// SPEC-M5 §7-A-1 — Budget (/costing/budget, item 'budget', legacy frmBudget,
// frmBudgetNew_JobWork, frmPreBudgetProdPlan). Fields mirror BUDGET_SCHEMA
// exactly. No doc number (ERRATUM 4 pattern); orderNo+finYear identify rows.
// The budget-vs-actual register (M4) reads the same rows — this is the WRITE door.
import type { DocConfig } from './types'
import { BUDGET_SCHEMA } from '../schemas/budget'
import { planBudget } from '../posting/budget'

export const budgetConfig: DocConfig = {
  docType: 'budget',
  slug: 'budget',
  title: 'Budget',
  numberPrefix: undefined,
  numberField: undefined,
  chainStage: undefined,
  schema: BUDGET_SCHEMA,
  service: { plan: (input: unknown) => planBudget(input as Parameters<typeof planBudget>[0]) },
  headerFields: [
    { name: 'orderNo', label: 'Order No', type: 'text', colSpan: 1 },
    { name: 'deptCode', label: 'Department', type: 'text', colSpan: 1 },
    { name: 'finYear', label: 'Fin Year', type: 'text', colSpan: 1 },
    { name: 'amount', label: 'Total Budget (₹)', type: 'number', required: true, colSpan: 1 },
    { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
  ],
  lineFields: [
    { name: 'workId', label: 'Work / Component', type: 'text' },
    { name: 'amount', label: 'Budgeted (₹)', type: 'number', required: true },
    { name: 'actualAmount', label: 'Actual (₹)', type: 'number' },
  ],
  linesKey: 'lines',
  listColumns: [
    { name: 'orderNo', label: 'Order' },
    { name: 'deptName', label: 'Department' },
    { name: 'finYear', label: 'Fin Year' },
    { name: 'amount', label: 'Budgeted (₹)', align: 'right' },
    { name: 'lineCount', label: 'Lines', align: 'right' },
    { name: 'createdAt', label: 'Created' },
  ],
  recentCount: 20,
  agentTools: ['create_budget', 'get_budget_vs_actual'],
}
