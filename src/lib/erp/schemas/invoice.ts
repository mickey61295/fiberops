// SPEC-M3 §6 — shared zod schema, VERBATIM from tools.ts create_sales_invoice.
// SPEC-M40 PAY-07: creditDays/dueDate — the aging anchor (dueDate falls back
// to invoiceDate + creditDays when absent).
import { z } from 'zod'

export const INVOICE_SCHEMA = z.object({
  invoiceNo: z.string().optional(),
  orderNo: z.string(),
  partyCode: z.string().describe('Customer party code'),
  billType: z.string(),
  totalQty: z.number(),
  taxableValue: z.number(),
  gstRate: z.number().describe('e.g. 5 for 5%'),
  gstType: z.string().describe('cgst_sgst | igst'),
  invoiceDate: z.string().optional(),
  creditDays: z.number().int().optional().describe('Credit terms — dueDate = invoiceDate + creditDays'),
  dueDate: z.string().optional().describe('Explicit due date (overrides creditDays)'),
  notes: z.string().optional(),
})

export type InvoiceInput = z.infer<typeof INVOICE_SCHEMA>
