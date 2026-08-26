// SPEC-M3 §6 — shared zod schemas. VERBATIM from tools.ts create_order
// (field names, optionality, .describe() strings copied exactly — the agent's
// tool-calling contract must not drift). Consumed by the agent tool schema
// AND the form server action (Wave B) via schema.safeParse.
import { z } from 'zod'

export const ORDER_SCHEMA = z.object({
  orderNo: z.string().optional(),
  buyerCode: z.string(),
  styleNo: z.string(),
  orderDate: z.string().optional(),
  deliveryDate: z.string(),
  lines: z.array(z.object({
    colourName: z.string(),
    sizeName: z.string(),
    qty: z.number(),
    rate: z.number(),
  })).min(1),
  notes: z.string().optional(),
  finYear: z.string().optional(),
})

export type OrderInput = z.infer<typeof ORDER_SCHEMA>
