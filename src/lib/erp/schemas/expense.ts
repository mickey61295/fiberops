// SPEC-M5 §7-D-31 — shared zod schema for create_expense / the Expense
// DocScreen (/costing/expenses, legacy FrmExpenses). category='stylewise'
// requires orderNo; partyCode is the paid-to party.
// SPEC-M51 M-02 (DE-03): glAccount added — the GL debit leg (defaults by
// category: transport → Freight [5020], else Other Expenses [5120]); the
// credit leg is Sundry Creditors when a party is given (a real payable the
// record_payment door settles) else Cash/Bank.
// SPEC-M54 M-05 (EH-02): head added — the ExpenseHead name OR code; the
// head sets category + the default GL debit leg (explicit glAccount still
// wins; a stale head.glAccount falls back to the category default + a
// note — THE HEAD REFINES, NEVER BLOCKS).
import { z } from 'zod'

export const EXPENSE_SCHEMA = z.object({
  expNo: z.string().optional().describe('EXP-#### auto-assigned when omitted or colliding'),
  expDate: z.string().optional().describe('ISO date (default today)'),
  finYear: z.string().optional().describe('Defaults to the active financial year'),
  head: z.string().optional().describe('Expense head — exact ExpenseHead name or code (e.g. EXH-0001 or "Knitting Transport"); the head sets the category + the default GL debit account (create_expense_head / /masters/expense-head / list_expense_heads); wins over a directly-passed category'),
  category: z.string().optional().describe('fixed | stylewise | general | transport | other — required unless a head is given (the head overrides it)'),
  orderNo: z.string().optional().describe('Order no (stylewise expenses)'),
  partyCode: z.string().optional().describe('Paid-to party code'),
  amount: z.number().min(0),
  narration: z.string().optional(),
  status: z.string().optional().describe('recorded | settled (default recorded)'),
  glAccount: z.string().optional().describe('GL debit leg — exact Account name or code; precedence: this argument > the head\'s glAccount > the category default (transport → Freight [5020], else Other Expenses [5120]); credit leg = Sundry Creditors with a party, else Cash/Bank'),
})

export type ExpenseInput = z.infer<typeof EXPENSE_SCHEMA>
