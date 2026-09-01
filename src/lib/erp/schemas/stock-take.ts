// SPEC-M42 INV-01 — zod schemas for the stock take cycle (ST-####).
// Three doors share these: the agent tools (create_stock_take /
// record_stock_counts / advance_stock_take) and the form actions on
// /inventory/stock-take. Lines address items by (itemType, itemCode) —
// StockTakeLine carries itemId only (PITFALLS #44: no itemCode column).
import { z } from 'zod'

export const STOCK_TAKE_SCHEMA = z.object({
  godownCode: z.string().describe('Godown to count (code)'),
  itemType: z.string().optional().describe('Optional filter: yarn | fabric | accessory | pcs — default: every bucket in the godown'),
  notes: z.string().optional().describe('Reason / instructions for this count'),
  takeDate: z.string().optional().describe('ISO date of the count sheet (default today)'),
})
export type StockTakeInput = z.infer<typeof STOCK_TAKE_SCHEMA>

export const STOCK_COUNT_SCHEMA = z.object({
  takeNo: z.string().describe('ST-#### of the take'),
  lines: z.array(z.object({
    itemType: z.string(),
    itemCode: z.string(),
    kgs: z.number().min(0).optional(),
    mtrs: z.number().min(0).optional(),
    pcs: z.number().min(0).optional(),
    bags: z.number().min(0).optional(),
  })).min(1).describe('Physical counts — only the uoms you pass are recorded'),
}).strict()
export type StockCountInput = z.infer<typeof STOCK_COUNT_SCHEMA>

export const STOCK_TAKE_ADVANCE_SCHEMA = z.object({
  takeNo: z.string().describe('ST-#### of the take'),
  to: z.string().describe('counting | draft | committed'),
  notes: z.string().optional(),
}).strict()
export type StockTakeAdvanceInput = z.infer<typeof STOCK_TAKE_ADVANCE_SCHEMA>
