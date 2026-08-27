// SPEC-M5 §7-A-1 — shared zod schema for create_budget / the Budget DocScreen.
// Mirrors the Budget+BudgetLine models (orderId?, deptId?, finYear, amount,
// lines[] {workId?, amount, actualAmount?}). Budget carries NO doc number
// (ERRATUM 4 pattern — the created row id + orderNo identify it).
import { z } from 'zod'

export const BUDGET_SCHEMA = z.object({
  orderNo: z.string().optional().describe('Order the budget belongs to (optional for dept budgets)'),
  deptCode: z.string().optional().describe('Department for dept-level budgets'),
  finYear: z.string().optional().describe('Defaults to current 26-27'),
  amount: z.number().min(0).describe('Total budgeted amount'),
  lines: z.array(z.object({
    workId: z.string().optional().describe('Jobwork component id this line budgets'),
    amount: z.number().min(0),
    actualAmount: z.number().min(0).optional().describe('Known actuals (usually left to the register)'),
  })).min(1).describe('Budget lines (per work/component)'),
  notes: z.string().optional(),
})

export type BudgetInput = z.infer<typeof BUDGET_SCHEMA>
