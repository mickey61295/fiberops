// SPEC-M5 §7-B-21 — variant schema for wage payments (FrmPaymentReg_Wages).
// Base PAYMENT_SCHEMA stays VERBATIM (the M3 record_payment contract); the
// variant relaxes ONLY direction (optional — the posting wrapper injects
// 'out'; wages are always paid OUT to employee parties) and drops the
// invoice/bill attach keys (SPEC-M40 PAY-02: wage payouts are always
// on-account — never invoice- or bill-allocating) and bankAccountNo
// (SPEC-M51 DE-01: the mode-aware bank leg is the record_payment door's
// feature — the wage door writes no bankAccountId; the parity test would
// demand a form field the service ignores — a liar field).
import { z } from 'zod'
import { PAYMENT_SCHEMA } from './payment'

export const WAGE_PAYMENT_SCHEMA = PAYMENT_SCHEMA.omit({
  invoiceNo: true,
  billNo: true,
  bankAccountNo: true,
}).extend({
  direction: z.string().optional(),
})

export type WagePaymentInput = z.infer<typeof WAGE_PAYMENT_SCHEMA>
