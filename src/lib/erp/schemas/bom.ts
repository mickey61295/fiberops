// SPEC-M3 §6 — shared zod schema, VERBATIM from tools.ts create_bom.
import { z } from 'zod'

export const BOM_SCHEMA = z.object({
  styleNo: z.string(),
  lines: z.array(z.object({
    itemType: z.string(),
    itemCode: z.string(),
    qty: z.number(),
    rate: z.number().optional(),
  })).min(1),
})

export type BomInput = z.infer<typeof BOM_SCHEMA>
