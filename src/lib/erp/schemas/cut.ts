// SPEC-M3 §6 — shared zod schema, VERBATIM from tools.ts create_cut_order.
import { z } from 'zod'

export const CUT_ORDER_SCHEMA = z.object({
  cutNo: z.string().optional(),
  orderNo: z.string(),
  fabricIssued: z.number(),
  totalPcs: z.number(),
  markerLength: z.number().optional(),
  noOfPlies: z.number().optional(),
  efficiency: z.number().optional(),
  cutDate: z.string().optional(),
})

export type CutOrderInput = z.infer<typeof CUT_ORDER_SCHEMA>
