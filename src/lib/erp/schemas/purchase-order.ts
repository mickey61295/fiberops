// SPEC-M3 §6 — shared zod schema, VERBATIM from tools.ts create_purchase_order.
import { z } from 'zod'

export const PURCHASE_ORDER_SCHEMA = z.object({
  poNo: z.string().optional(),
  poType: z.string(),
  partyCode: z.string(),
  orderDate: z.string().optional(),
  deliveryDate: z.string(),
  lines: z.array(z.object({
    itemType: z.string(),
    itemCode: z.string(),
    qty: z.number(),
    rate: z.number(),
  })).min(1),
  notes: z.string().optional(),
})

export type PurchaseOrderInput = z.infer<typeof PURCHASE_ORDER_SCHEMA>
