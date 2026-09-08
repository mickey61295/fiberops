// SPEC-M3 §6 — shared zod schema, VERBATIM from tools.ts record_payment.
// SPEC-M40 (PAY-02): billNo added — out-payments attach SupplierBills; the
// direction guard rejects cross-direction tags with guidance.
// SPEC-M51 M-02 (DE-01): bankAccountNo added — with a bank-ish mode it
// resolves the GL cash leg to that bank's own account (via its glAccountCode
// link); mode 'cash' ignores it (noted in the plan text, never silent).
// SPEC-M56 PAY-08 (PDC-02): chequeDate added — the cheque's own (post-)
// date, meaningful with mode='cheque' (future dates are PDCs; the register
// ages off it). A date on a non-cheque mode is NAMED as ignored in the plan
// side effects (the honest-nag pattern, never a refusal).
import { z } from 'zod'

export const PAYMENT_SCHEMA = z.object({
  voucherNo: z.string().optional(),
  partyCode: z.string(),
  amount: z.number(),
  direction: z.string().optional().describe('in = receipt from buyer (default) | out = payment to supplier'),
  invoiceNo: z.string().optional().describe('Sales invoice INV-#### — in-payments only; out-payments attach supplier bills via billNo'),
  billNo: z.string().optional().describe('Supplier bill SB-#### — out-payments only (must be passed)'),
  orderNo: z.string().optional(),
  mode: z.string().optional().describe('cash | bank | cheque | rtgs | neft | upi — cash posts to the Cash/Bank control; bank modes post to the linked bank account GL ledger when bankAccountNo is given'),
  bankAccountNo: z.string().optional().describe('BankAccount accountNo — with a bank mode, the GL leg becomes that bank\'s linked account (its glAccountCode); unlinked banks fall back to Cash/Bank with a note'),
  reference: z.string().optional(),
  payDate: z.string().optional(),
  chequeDate: z.string().optional().describe('Cheque date (ISO) — the cheque\'s own (post-)date; meaningful with mode=cheque (future = PDC, the /accounts/pdc register ages off it); ignored on other modes (named in the plan)'),
  notes: z.string().optional(),
})

export type PaymentInput = z.infer<typeof PAYMENT_SCHEMA>
