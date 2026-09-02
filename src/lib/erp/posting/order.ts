/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M3 §5 row 1 — create_order service. Logic extracted VERBATIM from
// tools.ts (Wave A: zero behaviour change; the industry-chain E2E must stay
// green untouched). The agent tool and the form action (Wave B) both call
// planOrder — ADR-001.
// SPEC-M43 PRG-01/02 (additive): buyerPoRef/orderType/deliveries[] pass
// through into the same commit; per-line styleNo resolves flag-gated
// (multi_style_orders, default OFF — §17-5 stays the owner's decision).

import { db } from '@/lib/db'
import type { DocPlanResult } from './types'
import type { OrderInput } from '../schemas/order'
import { dateOrIstToday } from '@/lib/erp/dates'
import { getFlag } from '@/lib/erp/flags'
// CHAT-09 (Phase-6B Batch 2) — fuzzy lookup rescue at the order seams: the
// old exact code/name match failed "lpp sa"/"lpp" dead; now case-insensitive
// resolution + "Did you mean" candidates so the model self-corrects.
import { resolveByNameOrCode, topCandidates, didYouMean } from '@/lib/erp/lookup'

const ORDER_TYPES = ['export', 'domestic', 'trading']

export async function planOrder(args: OrderInput): Promise<DocPlanResult> {
  // Accept either the buyer code (B-0001 / B001) or the buyer name ("LPP SA")
  // — case-insensitively, with contains fallback (CHAT-09)
  const buyer = (await db.buyer.findUnique({ where: { code: args.buyerCode } }))
    || (await resolveByNameOrCode<any>(db.buyer, args.buyerCode))
  if (!buyer) {
    const candidates = await topCandidates(db.buyer, args.buyerCode)
    return { ok: false, error: didYouMean('Buyer', args.buyerCode, candidates) + ' Use list_buyers first.' }
  }
  const style = (await db.style.findUnique({ where: { styleNo: args.styleNo } }))
    || (await resolveByNameOrCode<any>(db.style, args.styleNo, { codeField: 'styleNo', nameField: 'description' }))
  if (!style) {
    const candidates = await topCandidates(db.style, args.styleNo, { codeField: 'styleNo', nameField: 'description' })
    return { ok: false, error: didYouMean('Style', args.styleNo, candidates) + ' Use list_styles first.' }
  }

  // SPEC-M43 PRG-02 — multi-style orders, flag-gated. OFF (default) = the
  // legacy single-style behavior: a line style DIFFERING from the header
  // refuses with the flag named (the owner's §17-5 decision stays a real
  // decision; the agent self-corrects — split the order or ask for the flag).
  // Blank line style = header fallback in BOTH states (zero friction).
  let multiStyle = false
  const lineStyleNos = args.lines.map((l) => l.styleNo?.trim()).filter(Boolean)
  if (lineStyleNos.length) {
    multiStyle = await getFlag<boolean>('multi_style_orders')
    if (!multiStyle) {
      const differing = lineStyleNos.find((s) => s && s.toLowerCase() !== args.styleNo.toLowerCase())
      if (differing) {
        return {
          ok: false,
          error: `Multi-style orders are disabled (flag multi_style_orders is off): line style "${differing}" differs from the order style "${args.styleNo}". Create separate orders per style, or ask the admin to enable multi_style_orders.`,
        }
      }
    }
  }

  // Resolve per-line styles when the flag is armed (resolveByNameOrCode reflex)
  const lineStyles = new Map<string, any>()
  if (multiStyle) {
    for (const s of new Set(lineStyleNos.map((s) => s as string))) {
      const resolved = (await db.style.findUnique({ where: { styleNo: s } }))
        || (await resolveByNameOrCode<any>(db.style, s, { codeField: 'styleNo', nameField: 'description' }))
      if (!resolved) {
        const candidates = await topCandidates(db.style, s, { codeField: 'styleNo', nameField: 'description' })
        return { ok: false, error: didYouMean('Style', s, candidates) + ' Use list_styles first.' }
      }
      lineStyles.set(s.toLowerCase(), resolved)
    }
  }

  const orderType = args.orderType && ORDER_TYPES.includes(args.orderType) ? args.orderType : 'export'

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
    // PRG-02 — per-line style: blank → header style; flag-armed → resolved map
    const lineStyle = (l.styleNo?.trim() && lineStyles.get(l.styleNo.trim().toLowerCase())) || style
    return { colourId: colour?.id || '', sizeId: size?.id || '', qty: l.qty, rate: l.rate, styleId: lineStyle.id }
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

  // PRG-01 — the multi-shipment schedule (one order, many dates; never split)
  const deliveriesData = (args.deliveries ?? []).map((d, i) => ({
    seq: i + 1,
    qty: d.qty,
    date: new Date(d.date),
    notes: d.notes,
  }))

  // distinct per-line styleNos for the summary (header style when single)
  const styleNoById = new Map<string, string>([[style.id, style.styleNo]])
  for (const s of lineStyles.values()) styleNoById.set(s.id, s.styleNo)
  const styleList = multiStyle
    ? [...new Set(linesData.map((l) => styleNoById.get(l.styleId) ?? style.styleNo))]
    : [style.styleNo]
  const deliveryNote = deliveriesData.length
    ? ` | ${deliveriesData.length} shipment${deliveriesData.length > 1 ? 's' : ''}`
    : ''

  return {
    ok: true,
    text: `Proposed order ${resolvedOrderNo} for ${buyer.name}, style${styleList.length > 1 ? 's' : ''} ${styleList.join(', ')}, ${totalPcs} pcs, ₹${totalValue}.`,
    summary: `Create order ${resolvedOrderNo} for ${buyer.name} | style${styleList.length > 1 ? 's' : ''} ${styleList.join(', ')} | ${totalPcs} pcs | ₹${totalValue} | delivery ${args.deliveryDate}${deliveryNote}${args.buyerPoRef ? ` | buyer PO ${args.buyerPoRef}` : ''}`,
    creates: [
      { table: 'order', data: { orderNo: resolvedOrderNo, buyerId: buyer.id, styleId: style.id, orderDate: dateOrIstToday(args.orderDate), deliveryDate: new Date(args.deliveryDate), finYear, totalPcs, totalValue, status: 'open', notes: args.notes, buyerPoRef: args.buyerPoRef, orderType } },
      ...linesData.map((l) => ({ table: 'orderLine', data: { ...l, orderId: '<pending>' } })),
      ...deliveriesData.map((d) => ({ table: 'orderDelivery', data: { ...d, orderId: '<pending>' } })),
    ],
    sideEffects: [
      'Stock reservation will be calculated when fabric is issued',
      deliveriesData.length ? `OrderDelivery schedule: ${deliveriesData.length} shipment rows (seq 1..${deliveriesData.length})` : null,
    ].filter((s): s is string => Boolean(s)),
    async commit() {
      const created = await db.order.create({
        data: {
          orderNo: resolvedOrderNo, buyerId: buyer.id, styleId: style.id,
          orderDate: dateOrIstToday(args.orderDate),
          deliveryDate: new Date(args.deliveryDate),
          finYear, totalPcs, totalValue, status: 'open', notes: args.notes,
          buyerPoRef: args.buyerPoRef || null,
          orderType,
          lines: { create: linesData.map((l) => ({ ...l })) },
          deliveries: deliveriesData.length ? { create: deliveriesData } : undefined,
        },
      })
      return { id: created.id, orderNo: created.orderNo }
    },
  }
}
