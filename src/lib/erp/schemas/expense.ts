// SPEC-M5 §7-D-31 — shared zod schema for create_expense / the Expense
// DocScreen (/costing/expenses, legacy FrmExpenses). category='stylewise'
// requires orderNo; partyCode is the paid-to party.
// SPEC-M51 M-02 (DE-03): glAccount added — the GL debit leg (defaults by
// category: transport → Freight [5020], else Other Expenses [5120]); the
// credit leg is Sundry Creditors when a party is given (a real payable the
// record_payment door settles) else Cash/Bank.
import { z } from 'zod'

export const EXPENSE_SCHEMA = z.object({
  expNo: z.string().optional().describe('EXP-#### auto-assigned when omitted or colliding'),
  expDate: z.string().optional().describe('ISO date (default today)'),
  finYear: z.string().optional().describe('Defaults to the active financial year'),
  category: z.string().describe('fixed | stylewise | general | transport | other'),
  orderNo: z.string().optional().describe('Order no (stylewise expenses)'),
  partyCode: z.string().optional().describe('Paid-to party code'),
  amount: z.number().min(0),
  narration: z.string().optional(),
  status: z.string().optional().describe('recorded | settled (default recorded)'),
  glAccount: z.string().optional().describe('GL debit leg — exact Account name or code (default: transport → Freight [5020], other categories → Other Expenses [5120]); credit leg = Sundry Creditors with a party, else Cash/Bank'),
})

export type ExpenseInput = z.infer<typeof EXPENSE_SCHEMA>
