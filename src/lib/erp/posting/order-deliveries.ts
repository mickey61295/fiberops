/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M43 PRG-01 — the delivery-schedule service: planOrderDeliveries with
// REPLACE semantics (delete-all + re-create in ONE transaction). One service,
// both doors (ADR-001): the set_order_deliveries agent tool and the Order Hub
// delivery section both ride it. Audit: runCommit stamps the after-image.

import { db } from '@/lib/db'
import type { DocPlanResult } from './types'
import type { OrderDeliveriesInput } from '../schemas/order'

export async function planOrderDeliveries(args: OrderDeliveriesInput): Promise<DocPlanResult> {
  const order = await db.order.findUnique({ where: { orderNo: args.orderNo }, include: { deliveries: true } })
  if (!order) return { ok: false, error: `Order ${args.orderNo} not found` }
  if (order.status === 'cancelled') {
    return { ok: false, error: `Order ${args.orderNo} is cancelled — the delivery schedule is frozen.` }
  }

  const totalQty = args.deliveries.reduce((s, d) => s + d.qty, 0)
  if (totalQty > order.totalPcs) {
    return {
      ok: false,
      error: `Delivery schedule totals ${totalQty} pcs but the order is ${order.totalPcs} pcs — the schedule cannot exceed the order qty; reduce it or amend the order.`,
    }
  }
  for (const d of args.deliveries) {
    if (!d.qty || d.qty <= 0) return { ok: false, error: `Every shipment needs a positive qty (got ${d.qty}).` }
    if (Number.isNaN(new Date(d.date).getTime())) return { ok: false, error: `Invalid shipment date: ${d.date} (use YYYY-MM-DD).` }
  }

  const rows = args.deliveries.map((d, i) => ({ seq: i + 1, qty: d.qty, date: new Date(d.date), notes: d.notes || null }))
  const from = order.deliveries.length
  const dates = rows.map((r) => `${r.qty} pcs @ ${r.date.toISOString().slice(0, 10)}`)

  return {
    ok: true,
    text: `Proposed delivery schedule for ${order.orderNo}: ${rows.length} shipment${rows.length > 1 ? 's' : ''} (${totalQty} pcs of ${order.totalPcs}).`,
    summary: `Set ${rows.length} delivery shipments on ${order.orderNo} | ${dates.join(' + ')} (replaces ${from} existing row${from === 1 ? '' : 's'})`,
    updates: [{ table: 'orderDelivery', id: order.id, data: { rows } }],
    sideEffects: [
      `OrderDelivery rows for ${order.orderNo}: REPLACE set (was ${from}, now ${rows.length})`,
      'Header deliveryDate is NOT touched (it stays the first/overall delivery)',
    ],
    async commit() {
      await db.$transaction(async (tx) => {
        await tx.orderDelivery.deleteMany({ where: { orderId: order.id } })
        await tx.orderDelivery.createMany({ data: rows.map((r) => ({ ...r, orderId: order.id })) })
      })
      return { orderNo: order.orderNo, shipments: rows.length }
    },
  }
}
