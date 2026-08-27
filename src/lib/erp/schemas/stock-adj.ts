// SPEC-M3 §11 — shared zod schema for the NEW post_stock_adjustment tool
// (Wave D). Mirrors the legacy inline adjust_stock field contract (godown +
// itemType/item + add/less qty + reason) but posts through postLedger with the
// ADR-004 null-dims bucket rule (the inline tool's ''-string buckets are its
// own legacy semantics and stay untouched).
import { z } from 'zod'

export const STOCK_ADJ_SCHEMA = z.object({
  docNo: z.string().optional(),
  godownCode: z.string(),
  itemType: z.string().describe('yarn | fabric | accessory'),
  itemCode: z.string(),
  qty: z.number().describe('Quantity to adjust (positive number; kgs for yarn/fabric, pcs for accessory)'),
  action: z.string().describe('add | less'),
  reason: z.string(),
  adjDate: z.string().optional(),
})

export type StockAdjInput = z.infer<typeof STOCK_ADJ_SCHEMA>
