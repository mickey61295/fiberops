// SPEC-M5 §7-B-18 — variant schema for jobwork pcs returns (frmJobWorkPcsReturn).
// A GRN row with grnType='process_return' + pcs lines; StockLedger OUT of the
// pcs godown (default G2 — Finished Goods; overridable).
import { z } from 'zod'

export const JOBWORK_PCS_RETURN_SCHEMA = z.object({
  retNo: z.string().optional().describe('GRN no — auto-assigned GRN-#### (shared GRN space) when blank.'),
  partyCode: z.string().describe('Jobworker party code.'),
  orderNo: z.string(),
  qty: z.number().describe('Pcs returned to the jobworker.'),
  godownCode: z.string().optional().describe('Pcs godown the pieces leave — default G2 (Finished Goods).'),
  reason: z.string().optional(),
  retDate: z.string().optional(),
})

export type JobworkPcsReturnInput = z.infer<typeof JOBWORK_PCS_RETURN_SCHEMA>
