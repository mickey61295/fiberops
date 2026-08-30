/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M3 §5 row 1 — create_order service. Logic extracted VERBATIM from
// tools.ts (Wave A: zero behaviour change; the industry-chain E2E must stay
// green untouched). The agent tool and the form action (Wave B) both call
// planOrder — ADR-001.

import { db } from '@/lib/db'
import type { DocPlanResult } from './types'
import type { OrderInput } from '../schemas/order'
import { dateOrIstToday } from '@/lib/erp/dates'

export async function planOrder(args: OrderInput): Promise<DocPlanResult> {
  // Accept either the buyer code (B-0001 / B001) or the buyer name ("LPP SA")
  const buyer = (await db.buyer.findUnique({ where: { code: args.buyerCode } }))
    || (await db.buyer.findFirst({ where: { name: args.buyerCode } }))
  if (!buyer) return { ok: false, error: `Buyer ${args.buyerCode} not found (tried code and name). Use list_buyers first.` }
  const style = await db.style.findUnique({ where: { styleNo: args.styleNo } })
  if (!style) return { ok: false, error: `Style ${args.styleNo} not found. Use list_styles first.` }

  const totalPcs = args.lines.reduce((s, l) => s + l.qty, 0)
  const totalValue = args.lines.reduce((s, l) => s + l.qty * l.rate, 0)
  const finYear = args.finYear || '26-27'

  // Resolve colour/size ids (case-insensitive match — "NAVY" ≡ "Navy")
  const [allColours, allSizes] = await Promise.all([db.colour.findMany(), db.size.findMany()])
  const colourByName = new Map(allColours.map((c) => [c.name.toLowerCase(), c]))
  const sizeByName = new Map(allSizes.map((s) => [s.name.toLowerCase(), s]))
  const linesData = args.lines.map((l) => {
    const colour = colourByName.get(String(l.colourName).toLowerCase())
    const size = sizeByName.get(String(l.sizeName).toLowerCase())
    return { colourId: colour?.id || '', sizeId: size?.id || '', qty: l.qty, rate: l.rate }
  })

  // Resolve a free order number (auto-increment if not provided / collision)
  const resolvedOrderNo = await (async () => {
    const desired = args.orderNo?.trim()
    if (desired) {
      const exists = await db.order.findUnique({ where: { orderNo: desired } })
      if (!exists) return desired
    }
    // Find next free SO-####
    const all = await db.order.findMany({ where: { orderNo: { startsWith: 'SO-' } } })
    const used = new Set(all.map((o) => o.orderNo))
    let n = 1001
    while (used.has(`SO-${n}`)) n++
    return `SO-${n}`
  })()

  return {
    ok: true,
    text: `Proposed order ${resolvedOrderNo} for ${buyer.name}, style ${style.styleNo}, ${totalPcs} pcs, ₹${totalValue}.`,
    summary: `Create order ${resolvedOrderNo} for ${buyer.name} | style ${style.styleNo} | ${totalPcs} pcs | ₹${totalValue} | delivery ${args.deliveryDate}`,
    creates: [
      { table: 'order', data: { orderNo: resolvedOrderNo, buyerId: buyer.id, styleId: style.id, orderDate: dateOrIstToday(args.orderDate), deliveryDate: new Date(args.deliveryDate), finYear, totalPcs, totalValue, status: 'open', notes: args.notes } },
      ...linesData.map((l) => ({ table: 'orderLine', data: { ...l, styleId: style.id, orderId: '<pending>' } })),
    ],
    sideEffects: ['Stock reservation will be calculated when fabric is issued'],
    async commit() {
      const created = await db.order.create({
        data: {
          orderNo: resolvedOrderNo, buyerId: buyer.id, styleId: style.id,
          orderDate: dateOrIstToday(args.orderDate),
          deliveryDate: new Date(args.deliveryDate),
          finYear, totalPcs, totalValue, status: 'open', notes: args.notes,
          lines: { create: linesData.map((l) => ({ ...l, styleId: style.id })) },
        },
      })
      return { id: created.id, orderNo: created.orderNo }
    },
  }
}
