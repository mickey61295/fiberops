// SPEC-M5 §7-D-33 — shared zod schema for the create_production_bill tool /
// the Production Bills DocScreen (/accounts/production-bills). Computes the
// period piece-rate bill from ProductionEntry (optionally per dept/operator)
// and posts a Journal (voucherType='journal', Dr Production Wages /
// Cr Wage Payable — same accounts as §7-B-20, per-operator granularity).
import { z } from 'zod'

export const PRODUCTION_BILL_SCHEMA = z.object({
  deptCode: z.string().optional().describe('Restrict the bill to one department'),
  operatorCode: z.string().optional().describe('Restrict the bill to one operator (per-operator granularity)'),
  from: z.string().optional().describe('Period start ISO date (default 30 days back)'),
  to: z.string().optional().describe('Period end ISO date (default today)'),
  narration: z.string().optional(),
})

export type ProductionBillInput = z.infer<typeof PRODUCTION_BILL_SCHEMA>
