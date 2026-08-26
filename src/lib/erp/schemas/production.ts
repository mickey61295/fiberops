// SPEC-M3 §6 — shared zod schemas, VERBATIM from tools.ts post_production_entry
// + post_rework (both create ProductionEntry rows — one schema file, §5 row 10/11).
import { z } from 'zod'

export const PRODUCTION_ENTRY_SCHEMA = z.object({
  orderNo: z.string(),
  deptCode: z.string(),
  prodDate: z.string(),
  bundleNo: z.string(),
  operatorCode: z.string(),
  qty: z.number(),
  rate: z.number(),
  styleNo: z.string().optional(),
  colourName: z.string().optional(),
  sizeName: z.string().optional(),
  lineId: z.string().optional(),
})

export type ProductionEntryInput = z.infer<typeof PRODUCTION_ENTRY_SCHEMA>

export const REWORK_SCHEMA = z.object({
  orderNo: z.string(),
  deptCode: z.string(),
  qty: z.number(),
  bundleNo: z.string(),
  prodDate: z.string().optional(),
  operatorCode: z.string().optional(),
  rate: z.number().optional(),
  notes: z.string().optional(),
})

export type ReworkInput = z.infer<typeof REWORK_SCHEMA>
