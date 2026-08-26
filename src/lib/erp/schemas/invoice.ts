// SPEC-M3 §6 — shared zod schema, VERBATIM from tools.ts create_sales_invoice.
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
  notes: z.string().optional(),
})

export type InvoiceInput = z.infer<typeof INVOICE_SCHEMA>
