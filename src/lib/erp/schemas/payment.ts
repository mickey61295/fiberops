// SPEC-M3 §6 — shared zod schema, VERBATIM from tools.ts record_payment.
import { z } from 'zod'

export const PAYMENT_SCHEMA = z.object({
  voucherNo: z.string().optional(),
  partyCode: z.string(),
  amount: z.number(),
  direction: z.string().optional().describe('in = receipt from buyer (default) | out = payment to supplier'),
  invoiceNo: z.string().optional(),
  orderNo: z.string().optional(),
  mode: z.string().optional(),
  reference: z.string().optional(),
  payDate: z.string().optional(),
  notes: z.string().optional(),
})

export type PaymentInput = z.infer<typeof PAYMENT_SCHEMA>
