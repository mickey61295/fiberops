// SPEC-M3 §6 — shared zod schema, VERBATIM from tools.ts post_rejection.
import { z } from 'zod'

export const REJECTION_SCHEMA = z.object({
  rejNo: z.string().optional(),
  orderNo: z.string(),
  qty: z.number(),
  rejType: z.string().optional(),
  action: z.string().optional(),
  deptCode: z.string().optional(),
  rejDate: z.string().optional(),
  notes: z.string().optional(),
})

export type RejectionInput = z.infer<typeof REJECTION_SCHEMA>
