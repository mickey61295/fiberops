// SPEC-M3 §6 — shared zod schema, VERBATIM from tools.ts receive_grn.
import { z } from 'zod'

export const GRN_SCHEMA = z.object({
  grnNo: z.string().optional(),
  poNo: z.string(),
  godownCode: z.string(),
  partyDcRef: z.string().optional(),
  deptCode: z.string().optional(),
  receivedQty: z.number().describe('Qty received (uses PO rate).'),
  grnDate: z.string().optional(),
})

export type GrnInput = z.infer<typeof GRN_SCHEMA>
