/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M3 §5 row 8 — create_cut_order service. Logic extracted VERBATIM from
// tools.ts. Ledger effect: ready_to_cut_in pcs INTO G1 (via postLedger).

import { db } from '@/lib/db'
import { postLedger } from './ledger'
import type { DocPlanResult } from './types'
import type { CutOrderInput } from '../schemas/cut'

export async function planCutOrder(args: CutOrderInput): Promise<DocPlanResult> {
  const order = await db.order.findUnique({ where: { orderNo: args.orderNo } })
  if (!order) return { ok: false, error: `Order ${args.orderNo} not found` }

  // Resolve a free cut number
  const resolvedCutNo = await (async () => {
    const desired = args.cutNo?.trim()
    if (desired) {
      const exists = await db.cutOrder.findUnique({ where: { cutNo: desired } }).catch(() => null)
      if (!exists) return desired
    }
    const all = await db.cutOrder.findMany({ where: { cutNo: { startsWith: 'CUT-' } } })
    const used = new Set(all.map((c) => c.cutNo))
    let n = 1
    while (used.has(`CUT-${String(n).padStart(4, '0')}`)) n++
    return `CUT-${String(n).padStart(4, '0')}`
  })()

  return {
    ok: true,
    text: `Proposed cut order ${resolvedCutNo} for ${args.orderNo}, ${args.fabricIssued} kgs → ${args.totalPcs} pcs.`,
    summary: `Create cut order ${resolvedCutNo} | order ${args.orderNo} | fabric ${args.fabricIssued} kgs | ${args.totalPcs} pcs | efficiency ${args.efficiency || 'n/a'}%`,
    creates: [{ table: 'cutOrder', data: { cutNo: resolvedCutNo, orderId: order.id, cutDate: args.cutDate ? new Date(args.cutDate) : new Date(), fabricIssued: args.fabricIssued, totalPcs: args.totalPcs, markerLength: args.markerLength, noOfPlies: args.noOfPlies, efficiency: args.efficiency, status: 'planned' } }],
    sideEffects: ['Auto-generates cut bundles with barcodes if efficiency provided'],
    async commit() {
      return await db.$transaction(async (tx) => {
        const cut = await tx.cutOrder.create({
          data: { cutNo: resolvedCutNo, orderId: order.id, cutDate: args.cutDate ? new Date(args.cutDate) : new Date(), fabricIssued: args.fabricIssued, totalPcs: args.totalPcs, markerLength: args.markerLength, noOfPlies: args.noOfPlies, efficiency: args.efficiency, status: 'planned' },
        })
        // Auto-generate bundles
        const bundles = Math.ceil(args.totalPcs / 100)
        for (let i = 1; i <= bundles; i++) {
          await tx.cutBundle.create({
            data: {
              cutOrderId: cut.id, bundleNo: `${resolvedCutNo}/B${i}`,
              barcode: `*${resolvedCutNo.replace(/[^A-Z0-9]/gi, '')}B${String(i).padStart(3, '0')}*`,
              qty: Math.min(100, args.totalPcs - (i - 1) * 100),
              status: 'in_cutting',
            },
          })
        }
        // Industry chain: cut pieces enter G1 (Main) — ready_to_cut_in.
        const g1 = await tx.godown.findUnique({ where: { code: 'G1' } })
        if (g1) {
          await postLedger(tx, {
            txnType: 'ready_to_cut_in', itemType: 'pcs', itemId: order.id,
            godownId: g1.id, deptId: null, orderId: order.id,
            docNo: resolvedCutNo, docDate: args.cutDate ? new Date(args.cutDate) : new Date(),
            in: { pcs: args.totalPcs },
            notes: `Cut order ${resolvedCutNo} output`,
          })
        }
        return { id: cut.id, cutNo: cut.cutNo, bundlesCreated: bundles }
      })
    },
  }
}
