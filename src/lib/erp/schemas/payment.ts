// SPEC-M3 §6 — shared zod schema, VERBATIM from tools.ts record_payment.
// SPEC-M40 (PAY-02): billNo added — out-payments attach SupplierBills; the
// direction guard rejects cross-direction tags with guidance.
import { z } from 'zod'

export const PAYMENT_SCHEMA = z.object({
  voucherNo: z.string().optional(),
  partyCode: z.string(),
  amount: z.number(),
  direction: z.string().optional().describe('in = receipt from buyer (default) | out = payment to supplier'),
  invoiceNo: z.string().optional().describe('Sales invoice INV-#### — in-payments only; out-payments attach supplier bills via billNo'),
  billNo: z.string().optional().describe('Supplier bill SB-#### — out-payments only (must be passed)'),
  orderNo: z.string().optional(),
  mode: z.string().optional(),
  reference: z.string().optional(),
  payDate: z.string().optional(),
  notes: z.string().optional(),
})

export type PaymentInput = z.infer<typeof PAYMENT_SCHEMA>
