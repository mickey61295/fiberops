/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M5 §7-A-5 — create_supplier_order service. Thin variant wrapper over
// planPurchaseOrder: injects poType='general' when absent (supplier order
// sheets — legacy FrmSuppOrdSheet_Semi semantics), then delegates VERBATIM.
// planPurchaseOrder and its create_purchase_order tool stay byte-identical.

import type { DocPlanResult } from './types'
import { planPurchaseOrder } from './purchase-order'
import type { SupplierOrderInput } from '../schemas/supplier-order'

export async function planSupplierOrder(args: SupplierOrderInput): Promise<DocPlanResult> {
  return planPurchaseOrder({
    ...args,
    poType: args.poType?.trim() || 'general',
  } as Parameters<typeof planPurchaseOrder>[0])
}
