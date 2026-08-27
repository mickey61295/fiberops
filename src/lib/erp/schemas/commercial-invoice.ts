// SPEC-M5 §7-A-2 — shared zod schema for create_commercial_invoice / the
// Commercial Invoice DocScreen. Export variant of the sales invoice
// (SalesInvoice.invoiceType='export' + ern). gstRate is commonly 0 on exports
// (zero-rated supply) — the field stays so duty/cess can be keyed.
import { z } from 'zod'

export const COMMERCIAL_INVOICE_SCHEMA = z.object({
  invoiceNo: z.string().optional(),
  orderNo: z.string(),
  partyCode: z.string().describe('Exporter/overseas customer party code'),
  billType: z.string().optional().describe('Defaults to sales'),
  totalQty: z.number(),
  taxableValue: z.number(),
  gstRate: z.number().describe('Usually 0 on exports (zero-rated supply)'),
  gstType: z.string().optional().describe('Defaults to igst'),
  ern: z.string().optional().describe('Export Report Number'),
  invoiceDate: z.string().optional(),
  notes: z.string().optional(),
})

export type CommercialInvoiceInput = z.infer<typeof COMMERCIAL_INVOICE_SCHEMA>
