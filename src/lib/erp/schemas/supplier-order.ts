// SPEC-M5 §7-A-5 — variant schema for supplier orders. Base
// PURCHASE_ORDER_SCHEMA stays VERBATIM (M3 contract); the variant relaxes ONLY
// poType (optional — the config's service wrapper injects 'general', the
// legacy FrmSuppOrdSheet_Semi / general supplier-order semantics).
import { z } from 'zod'
import { PURCHASE_ORDER_SCHEMA } from './purchase-order'

export const SUPPLIER_ORDER_SCHEMA = PURCHASE_ORDER_SCHEMA.extend({
  poType: z.string().optional(),
})

export type SupplierOrderInput = z.infer<typeof SUPPLIER_ORDER_SCHEMA>
