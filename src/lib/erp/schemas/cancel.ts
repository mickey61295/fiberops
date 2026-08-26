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
