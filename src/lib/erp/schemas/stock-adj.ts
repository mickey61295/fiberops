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

// SPEC-M6 §7-D-1 (Wave D) — opening-stock VARIANT (/inventory/opening-stock,
// legacy frmOpeningStock). The §4 recipe: the variant schema relaxes ONLY the
// keys the wrapper injects (action + reason); planOpeningStock resolves the
// OPN-#### docNo and fixes action='add' + reason='Opening stock' before
// delegating to planStockAdjustment (which stays VERBATIM).
export const OPENING_STOCK_SCHEMA = STOCK_ADJ_SCHEMA.extend({
  action: z.string().optional().describe('Fixed to add by the variant — no need to pass.'),
  reason: z.string().optional().describe('Fixed to "Opening stock" by the variant — no need to pass.'),
})

export type OpeningStockInput = z.infer<typeof OPENING_STOCK_SCHEMA>

// SPEC-M21 — waste-receipt VARIANT (/inventory/waste-receipt, legacy
// FrmWasteReceiptEntry; gap-audit disposition "stock-adj variant"). Same
// recipe as opening-stock: the wrapper fixes action='add' + composes the
// reason from the wasteClass; planStockAdjustment stays VERBATIM.
export const WASTE_RECEIPT_SCHEMA = STOCK_ADJ_SCHEMA.extend({
  action: z.string().optional().describe('Fixed to add by the variant — no need to pass.'),
  reason: z.string().optional().describe('Composed from wasteClass by the variant — no need to pass.'),
  wasteClass: z.string().describe('knitting | dyeing | cutting | packing | general (the waste SOURCE)'),
  notes: z.string().optional().describe('Free note appended to the composed reason'),
  godownCode: z.string().describe('Source godown (where the waste came FROM) — waste itself posts into the waste store (SPEC-M42 INV-05)'),
})

export type WasteReceiptInput = z.infer<typeof WASTE_RECEIPT_SCHEMA>
