// SPEC-M3 §6 — shared zod schema, VERBATIM from tools.ts create_cost_sheet.
import { z } from 'zod'

export const COST_SHEET_SCHEMA = z.object({
  orderNo: z.string(),
  fabricCost: z.number().optional(),
  trimCost: z.number().optional(),
  cmCost: z.number().optional(),
  washingCost: z.number().optional(),
  packingCost: z.number().optional(),
  overheads: z.number().optional(),
  commissionPct: z.number().optional(),
  marginPct: z.number().optional(),
  sellingPrice: z.number().optional(),
})

export type CostSheetInput = z.infer<typeof COST_SHEET_SCHEMA>
