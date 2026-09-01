// SPEC-M3 §6 — shared zod schemas, VERBATIM from tools.ts cancel_order /
// cancel_purchase_order / cancel_invoice (one file per the §5 inventory).
import { z } from 'zod'

export const CANCEL_ORDER_SCHEMA = z.object({
  orderNo: z.string(),
  reason: z.string().optional(),
})

export type CancelOrderInput = z.infer<typeof CANCEL_ORDER_SCHEMA>

export const CANCEL_PO_SCHEMA = z.object({
  poNo: z.string(),
  reason: z.string().optional(),
})

export type CancelPoInput = z.infer<typeof CANCEL_PO_SCHEMA>

export const CANCEL_INVOICE_SCHEMA = z.object({
  invoiceNo: z.string(),
  reason: z.string().optional(),
})

export type CancelInvoiceInput = z.infer<typeof CANCEL_INVOICE_SCHEMA>

// SPEC-M40 §1 PAY-06 — money-voucher cancel/reversal inputs (contra legs,
// audit-preserving: allocations flip reversedAt, journals get a CN- mirror).
export const CANCEL_PAYMENT_SCHEMA = z.object({
  voucherNo: z.string().describe('RCP-#### / PMT-####'),
  reason: z.string().optional(),
})
export type CancelPaymentInput = z.infer<typeof CANCEL_PAYMENT_SCHEMA>

export const CANCEL_JOURNAL_SCHEMA = z.object({
  voucherNo: z.string().describe('V-#### (standalone journals only — payment companions follow the payment door)'),
  reason: z.string().optional(),
})
export type CancelJournalInput = z.infer<typeof CANCEL_JOURNAL_SCHEMA>

export const CANCEL_DEBIT_NOTE_SCHEMA = z.object({
  noteNo: z.string().describe('DN-####'),
  reason: z.string().optional(),
})
export type CancelDebitNoteInput = z.infer<typeof CANCEL_DEBIT_NOTE_SCHEMA>

export const CANCEL_EXPENSE_SCHEMA = z.object({
  expNo: z.string().describe('EXP-####'),
  reason: z.string().optional(),
})
export type CancelExpenseInput = z.infer<typeof CANCEL_EXPENSE_SCHEMA>

export const CANCEL_BUDGET_SCHEMA = z.object({
  budgetId: z.string(),
  reason: z.string().optional(),
})
export type CancelBudgetInput = z.infer<typeof CANCEL_BUDGET_SCHEMA>
