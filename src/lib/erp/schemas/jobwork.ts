// SPEC-M3 §6 — shared zod schemas, VERBATIM from tools.ts create_jobwork_order
// + receive_jobwork (one file per op family per the §5 inventory).
import { z } from 'zod'

export const JOBWORK_OUT_SCHEMA = z.object({
  dcNo: z.string().optional(),
  jobworkerCode: z.string(),
  processType: z.string(),
  totalQty: z.number(),
  totalValue: z.number().optional(),
  orderNo: z.string().optional(),
  expectedInDate: z.string().optional(),
  outDate: z.string().optional(),
})

export type JobworkOutInput = z.infer<typeof JOBWORK_OUT_SCHEMA>

export const JOBWORK_IN_SCHEMA = z.object({
  dcNo: z.string(),
  receivedDate: z.string().optional(),
  receivedQty: z.number().optional(),
})

export type JobworkInInput = z.infer<typeof JOBWORK_IN_SCHEMA>
