/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M3 §5 row 4 — create_purchase_order service. Logic extracted VERBATIM
// from tools.ts. No ledger effect; commit auto-submits an Approval row.

import { db } from '@/lib/db'
import type { DocPlanResult } from './types'
import type { PurchaseOrderInput } from '../schemas/purchase-order'
import { dateOrIstToday } from '@/lib/erp/dates'

export async function planPurchaseOrder(args: PurchaseOrderInput): Promise<DocPlanResult> {
  const party = await db.party.findUnique({ where: { code: args.partyCode } })
  if (!party) return { ok: false, error: `Party ${args.partyCode} not found` }

  const totalQty = args.lines.reduce((s, l) => s + l.qty, 0)
  const totalValue = args.lines.reduce((s, l) => s + l.qty * l.rate, 0)
  const finYear = '26-27'

  // Resolve item ids
  const linesResolved = await Promise.all(args.lines.map(async (l) => {
    let item: any
    if (l.itemType === 'yarn') item = await db.yarn.findUnique({ where: { code: l.itemCode } })
    else if (l.itemType === 'fabric') item = await db.fabric.findUnique({ where: { code: l.itemCode } })
    else if (l.itemType === 'accessory') item = await db.accessory.findUnique({ where: { code: l.itemCode } })
    if (!item) throw new Error(`${l.itemType} ${l.itemCode} not found`)
    return { ...l, itemId: item.id, uomId: item.uomId, amount: l.qty * l.rate }
  }))

  // Resolve a free PO number
  const prefix = args.poType === 'yarn' ? 'PO-Y-' : args.poType === 'fabric' ? 'PO-F-' : args.poType === 'accessory' ? 'PO-A-' : 'PO-G-'
  const resolvedPoNo = await (async () => {
    const desired = args.poNo?.trim()
    if (desired) {
      const exists = await db.purchaseOrder.findUnique({ where: { poNo: desired } })
      if (!exists) return desired
    }
    const all = await db.purchaseOrder.findMany({ where: { poNo: { startsWith: prefix } } })
    const used = new Set(all.map((p) => p.poNo))
    let n = 1
    while (used.has(`${prefix}${String(n).padStart(3, '0')}`)) n++
    return `${prefix}${String(n).padStart(3, '0')}`
  })()

  return {
    ok: true,
    text: `Proposed PO ${resolvedPoNo} (${args.poType}) to ${party.name}, ${totalQty} units, ₹${totalValue}.`,
    summary: `Create PO ${resolvedPoNo} | ${args.poType} | ${party.name} | ${totalQty} units | ₹${totalValue} | delivery ${args.deliveryDate}`,
    creates: [
      { table: 'purchaseOrder', data: { poNo: resolvedPoNo, poType: args.poType, partyId: party.id, orderDate: dateOrIstToday(args.orderDate), deliveryDate: new Date(args.deliveryDate), finYear, totalQty, totalValue, status: 'open', notes: args.notes } },
      ...linesResolved.map((l) => ({ table: 'poLine', data: { ...l, poId: '<pending>' } })),
    ],
    sideEffects: ['Auto-submits for approval workflow; status=open until approved'],
    async commit() {
      const created = await db.purchaseOrder.create({
        data: {
          poNo: resolvedPoNo, poType: args.poType, partyId: party.id,
          orderDate: dateOrIstToday(args.orderDate),
          deliveryDate: new Date(args.deliveryDate),
          finYear, totalQty, totalValue, status: 'open', notes: args.notes,
          // FIX (found by tests/pipeline/doc-parity.test.ts, M3 Wave A): the
          // legacy inline tool passed `itemCode` into the nested pOLine create —
          // not a POLine column in the reconstructed 54-model schema →
          // PrismaClientValidationError. Pre-existing latent bug (no test had
          // exercised PO creation since rollback #4). itemCode stays in the
          // PLAN creates[] (approval card display) but not in the db payload.
          lines: { create: linesResolved.map(({ itemCode: _itemCode, ...l }) => l) },
        },
      })
      // auto-submit for approval
      await db.approval.create({
        data: { entity: 'po', entityId: created.id, step: 1, requestedBy: 'agent', status: 'pending' },
      })
      return { id: created.id, poNo: created.poNo }
    },
  }
}
