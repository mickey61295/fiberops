// SPEC-M3 §6 — shared zod schema, VERBATIM from tools.ts create_pcs_despatch.
import { z } from 'zod'

export const DESPATCH_SCHEMA = z.object({
  dcNo: z.string().optional(),
  orderNo: z.string(),
  totalPcs: z.number(),
  vehicleNo: z.string().optional(),
  courierName: z.string().optional(),
  despatchDate: z.string().optional(),
  lines: z.array(z.object({
    styleNo: z.string(),
    colourName: z.string().optional(),
    sizeName: z.string().optional(),
    qty: z.number(),
    rate: z.number().optional(),
  })).optional(),
  // SPEC-M5 §6 (Wave C): returnable defaults to TRUE (legacy behaviour). When
  // explicitly false the commit ALSO leaves a pending non_return_dc Approval
  // (entityId = the DC id) — approved at /quality/non-return-dc
  // (approve_non_return_dc tool).
  returnable: z.boolean().optional().describe('Material will return (default true). Set false to raise a non-return DC approval'),
})

export type DespatchInput = z.infer<typeof DESPATCH_SCHEMA>
