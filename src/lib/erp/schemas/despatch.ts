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
})

export type DespatchInput = z.infer<typeof DESPATCH_SCHEMA>
