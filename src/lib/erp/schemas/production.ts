// SPEC-M3 §6 — shared zod schemas, VERBATIM from tools.ts post_production_entry
// + post_rework (both create ProductionEntry rows — one schema file, §5 row 10/11).
// SPEC-M55 (L-06): + shiftCode attribution on the base entry + the wage-only
// SHIFT_WAGES_SCHEMA (the legacy post_shift_wages port).
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
  // SPEC-M55 (L-06) — the ADR-019-A attribution: which shift the entry rode
  // under (resolves by code; unknown shift = LOUD refusal, never a silent drop).
  shiftCode: z.string().optional(),
})

export type ProductionEntryInput = z.infer<typeof PRODUCTION_ENTRY_SCHEMA>

// SPEC-M55 (L-06) — the wage-only door: shift-level wage cost BEYOND piece
// rate (fixed shift staff, shift incentives), booked against the order as a
// qty-0 / amount-0 / shiftWages=X ProductionEntry row.
export const SHIFT_WAGES_SCHEMA = z.object({
  orderNo: z.string(),
  deptCode: z.string(),
  shiftCode: z.string(),
  prodDate: z.string(),
  amount: z.number().positive(),
  notes: z.string().optional(),
})

export type ShiftWagesInput = z.infer<typeof SHIFT_WAGES_SCHEMA>

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
