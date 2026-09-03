// SPEC-M3 §6 — shared zod schema, VERBATIM from tools.ts create_cost_sheet.
// SPEC-M44 CST-02 — the calculator door: `lines` (array of computed-cost
// lines addressed by componentCode / itemType+itemCode, the operator and
// agent language — cuids are invisible to both doors) and the agent-only
// hook `computeFromBom` (the GRN `reprocess` precedent — honoured by the
// service, never a form field; the form door's equivalent is typing
// source=bom lines). marginPct is now COMPUTED server-side when
// sellingPrice > 0 — the input is accepted (back-compat) but overridden.
import { z } from 'zod'

export const HEADS = ['fabric', 'trim', 'cm', 'washing', 'packing', 'overheads'] as const
export type CostHead = (typeof HEADS)[number]

/** component category → the sheet head it quotes into (CST-01 inference). */
export function headOfCategory(category: string): CostHead {
  switch (category) {
    case 'fabric': case 'trim': case 'cm': case 'washing': case 'packing': return category
    case 'overhead': default: return 'overheads'
  }
}
/** bom itemType → the sheet head (yarn|fabric → fabric, accessory → trim). */
export function headOfItemType(itemType: string): CostHead {
  return itemType === 'accessory' ? 'trim' : 'fabric'
}

export const COST_LINE_INPUT = z.object({
  head: z.enum(HEADS).optional().describe('Sheet head (inferred from source when blank: bom itemType / component category / default overheads)'),
  source: z.enum(['bom', 'component', 'manual']).describe('bom = BOM rate at WAC fallback; component = the CC-#### library quote; manual = typed amount or qty×rate'),
  itemType: z.enum(['yarn', 'fabric', 'accessory']).optional().describe('Item type (source=bom — resolves BomLine.rate)'),
  itemCode: z.string().optional().describe('Item code (source=bom — e.g. F-0001)'),
  componentCode: z.string().optional().describe('Cost component code (source=component — e.g. CC-0001)'),
  qty: z.number().nonnegative().optional().describe('Quantity (amount = qty × resolved rate when amount is blank)'),
  rate: z.number().nonnegative().optional().describe('Override rate (default: BomLine rate / component rate)'),
  amount: z.number().nonnegative().optional().describe('Explicit amount (overrides qty × rate)'),
  notes: z.string().optional(),
})

export const COST_SHEET_SCHEMA = z.object({
  orderNo: z.string(),
  fabricCost: z.number().optional(),
  trimCost: z.number().optional(),
  cmCost: z.number().optional(),
  washingCost: z.number().optional(),
  packingCost: z.number().optional(),
  overheads: z.number().optional(),
  commissionPct: z.number().optional(),
  marginPct: z.number().optional().describe('Legacy input — COMPUTED when sellingPrice > 0: (selling − cost)/selling × 100'),
  sellingPrice: z.number().optional(),
  // SPEC-M44 CST-02 — the calculator door
  computeFromBom: z.boolean().optional().describe('Agent-only hook (the GRN reprocess precedent): pre-seed lines from the order style BOM × order qty'),
  lines: z.array(COST_LINE_INPUT).optional().describe('Computed cost lines — head totals derive from these when present'),
})

export type CostSheetInput = z.infer<typeof COST_SHEET_SCHEMA>
export type CostLineInput = z.infer<typeof COST_LINE_INPUT>

/** One resolved line the calculator commits (internal shape). */
export interface ResolvedCostLine {
  head: CostHead
  source: 'bom' | 'component' | 'manual'
  componentId?: string | null
  itemType?: string | null
  itemId?: string | null
  qty: number
  rate: number
  amount: number
  notes?: string | null
}
