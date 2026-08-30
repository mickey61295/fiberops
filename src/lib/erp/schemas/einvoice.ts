// SPEC-M23 — shared zod schema for generate_einvoice_irn (the mock
// e-invoice handshake over an ISSUED SalesInvoice).
import { z } from 'zod'

export const EINVOICE_SCHEMA = z.object({
  invoiceNo: z.string().describe('The ISSUED invoice number, e.g. INV-0042'),
})

export type EInvoiceInput = z.infer<typeof EINVOICE_SCHEMA>
