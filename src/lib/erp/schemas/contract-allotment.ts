// SPEC-M5 §7-D-35 — shared zod schema for the allot_contract tool / the
// Contract Allotment DocScreen (/jobwork/contract). JobworkOrder recorded
// with status='allotted' BEFORE material leaves — dcNo gets an AL-####
// placeholder prefix; the real JW-#### DC is issued later (create_jobwork
// / receive flips status per §7-D-35).
import { z } from 'zod'

export const CONTRACT_ALLOTMENT_SCHEMA = z.object({
  jobworkerCode: z.string().describe('Jobworker party code'),
  processType: z.string().describe('washing | dyeing | printing | embroidery'),
  totalQty: z.number().positive(),
  totalValue: z.number().optional().describe('Contracted value (₹)'),
  orderNo: z.string().optional(),
  expectedInDate: z.string().optional(),
  allotDate: z.string().optional().describe('ISO date (default today)'),
  notes: z.string().optional(),
})

export type ContractAllotmentInput = z.infer<typeof CONTRACT_ALLOTMENT_SCHEMA>
