/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M3 §5 row 13 — create_pcs_despatch service. Logic extracted VERBATIM
// from tools.ts. Ledger effect: sales_delivery pcs OUT of G2 (postLedger).

import { db } from '@/lib/db'
import { postLedger } from './ledger'
import type { DocPlanResult } from './types'
import type { DespatchInput } from '../schemas/despatch'

export async function planPcsDespatch(args: DespatchInput): Promise<DocPlanResult> {
  const order = await db.order.findUnique({ where: { orderNo: args.orderNo }, include: { buyer: true } })
  if (!order) return { ok: false, error: `Order ${args.orderNo} not found` }
  const finYear = '26-27'
  const resolvedDcNo = await (async () => {
    const desired = args.dcNo?.trim()
    if (desired) {
      const exists = await db.pcsDespatch.findUnique({ where: { dcNo: desired } }).catch(() => null)
      if (!exists) return desired
    }
    const all = await db.pcsDespatch.findMany({ where: { dcNo: { startsWith: 'DC-' } } })
    const used = new Set(all.map((d) => d.dcNo))
    let n = 1
    while (used.has(`DC-${String(n).padStart(4, '0')}`)) n++
    return `DC-${String(n).padStart(4, '0')}`
  })()
  const lines = args.lines || []
  return {
    ok: true,
    text: `Proposed despatch DC ${resolvedDcNo} for ${order.orderNo} — ${args.totalPcs} pcs.`,
    summary: `Create despatch DC ${resolvedDcNo} | order ${order.orderNo} | buyer ${order.buyer?.name || '-'} | ${args.totalPcs} pcs | vehicle ${args.vehicleNo || '-'} | courier ${args.courierName || '-'}`,
    creates: [
      { table: 'pcsDespatch', data: { dcNo: resolvedDcNo, orderId: order.id, buyerId: order.buyerId, despatchDate: args.despatchDate ? new Date(args.despatchDate) : new Date(), finYear, totalPcs: args.totalPcs, vehicleNo: args.vehicleNo, courierName: args.courierName, status: 'despatched' } },
      ...lines.map((l) => ({ table: 'pcsDespatchLine', data: { pcsDespatchId: '<pending>', styleNo: l.styleNo, qty: l.qty, rate: l.rate || 0 } })),
    ],
    sideEffects: ['Finished goods stock reduces', 'Order completion % increases'],
    async commit() {
      return await db.$transaction(async (tx) => {
        const d = await tx.pcsDespatch.create({
          data: {
            dcNo: resolvedDcNo, orderId: order.id, buyerId: order.buyerId,
            despatchDate: args.despatchDate ? new Date(args.despatchDate) : new Date(),
            finYear, totalPcs: args.totalPcs, vehicleNo: args.vehicleNo, courierName: args.courierName, status: 'despatched',
            lines: { create: lines.map((l) => ({ styleNo: l.styleNo, qty: l.qty, rate: l.rate || 0 })) },
          },
        })
        // Industry chain: despatched pcs leave G2 (Finished Goods) — sales_delivery.
        const g2 = await tx.godown.findUnique({ where: { code: 'G2' } })
        if (g2) {
          await postLedger(tx, {
            txnType: 'sales_delivery', itemType: 'pcs', itemId: order.id,
            godownId: g2.id, deptId: null, orderId: order.id,
            docNo: resolvedDcNo, docDate: args.despatchDate ? new Date(args.despatchDate) : new Date(),
            out: { pcs: args.totalPcs },
            notes: `Despatch DC ${resolvedDcNo} → ${order.buyer?.name || 'buyer'}`,
          })
        }
        return { id: d.id, dcNo: d.dcNo }
      })
    },
  }
}
