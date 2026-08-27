// SPEC-M5 §7-B-11 — line transfer schema (Trs_LineTfr). TWO LineIssue rows in
// one transaction: OUT (negative qty) from the source line, IN (positive) to
// the target line — a WIP move between sewing lines, no godown stock effect.
import { z } from 'zod'

export const LINE_TRANSFER_SCHEMA = z.object({
  refNo: z.string().optional().describe('Shared LT-#### reference — auto-assigned when blank.'),
  orderNo: z.string(),
  fromLineCode: z.string(),
  toLineCode: z.string(),
  qty: z.number(),
  transferDate: z.string().optional(),
  notes: z.string().optional(),
})

export type LineTransferInput = z.infer<typeof LINE_TRANSFER_SCHEMA>
