// SPEC-M23 — shared zod schema for generate_einvoice_irn (the mock
// e-invoice handshake over an ISSUED SalesInvoice).
import { z } from 'zod'

export const EINVOICE_SCHEMA = z.object({
  invoiceNo: z.string().describe('The ISSUED invoice number, e.g. INV-0042'),
})

export type EInvoiceInput = z.infer<typeof EINVOICE_SCHEMA>

/** SPEC-M26 — cancel the live IRN (the real govt workflow: within 24h of
 *  generation, reason from the portal's enum). */
export const EINVOICE_CANCEL_SCHEMA = z.object({
  invoiceNo: z.string().describe('The invoice number whose live IRN should be cancelled'),
  reason: z
    .enum(['typo', 'wrong_entry', 'order_cancelled', 'delivery_cancelled', 'others'])
    .describe('The govt cancellation reason (typo | wrong_entry | order_cancelled | delivery_cancelled | others)'),
})

export type EInvoiceCancelInput = z.infer<typeof EINVOICE_CANCEL_SCHEMA>
