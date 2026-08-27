// SPEC-M5 §7-D-31 — shared zod schema for create_expense / the Expense
// DocScreen (/costing/expenses, legacy FrmExpenses). category='stylewise'
// requires orderNo; partyCode is the paid-to party.
import { z } from 'zod'

export const EXPENSE_SCHEMA = z.object({
  expNo: z.string().optional().describe('EXP-#### auto-assigned when omitted or colliding'),
  expDate: z.string().optional().describe('ISO date (default today)'),
  finYear: z.string().optional().describe('Defaults to current 26-27'),
  category: z.string().describe('fixed | stylewise | general | transport | other'),
  orderNo: z.string().optional().describe('Order no (stylewise expenses)'),
  partyCode: z.string().optional().describe('Paid-to party code'),
  amount: z.number().min(0),
  narration: z.string().optional(),
  status: z.string().optional().describe('recorded | settled (default recorded)'),
})

export type ExpenseInput = z.infer<typeof EXPENSE_SCHEMA>
