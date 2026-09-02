// SPEC-M3 §6 — shared zod schemas. VERBATIM from tools.ts create_order
// (field names, optionality, .describe() strings copied exactly — the agent's
// tool-calling contract must not drift). Consumed by the agent tool schema
// AND the form server action (Wave B) via schema.safeParse.
// SPEC-M43 PRG-01/02 (additive, all optional — every existing caller
// byte-identical): buyerPoRef / orderType / deliveries[] on the header,
// styleNo on each line (multi-style, flag-gated at planOrder).
import { z } from 'zod'

export const ORDER_SCHEMA = z.object({
  orderNo: z.string().optional(),
  buyerCode: z.string(),
  styleNo: z.string(),
  orderDate: z.string().optional(),
  deliveryDate: z.string(),
  buyerPoRef: z.string().optional().describe('The buyer\'s own PO reference on our order (e.g. "696GJ") — stored first-class, shown on the register and print'),
  orderType: z.string().optional().describe('export | domestic | trading (defaults export)'),
  deliveries: z.array(z.object({
    qty: z.number().describe('Pieces in this shipment'),
    date: z.string().describe('Shipment date YYYY-MM-DD'),
    notes: z.string().optional(),
  })).optional().describe('Multi-shipment delivery schedule — one order, many dates (do NOT split the order)'),
  lines: z.array(z.object({
    colourName: z.string(),
    sizeName: z.string(),
    qty: z.number(),
    rate: z.number(),
    styleNo: z.string().optional().describe('Per-line style (multi-style orders — requires the multi_style_orders flag; blank = header style)'),
  })).min(1),
  notes: z.string().optional(),
  finYear: z.string().optional(),
})

export type OrderInput = z.infer<typeof ORDER_SCHEMA>

/** SPEC-M43 PRG-01 — the delivery-schedule service input (REPLACE semantics). */
export const ORDER_DELIVERIES_SCHEMA = z.object({
  orderNo: z.string(),
  deliveries: z.array(z.object({
    qty: z.number(),
    date: z.string(),
    notes: z.string().optional(),
  })).min(1),
})

export type OrderDeliveriesInput = z.infer<typeof ORDER_DELIVERIES_SCHEMA>
