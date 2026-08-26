/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M3 §5 row 12 — post_rejection service. Logic extracted VERBATIM from
// tools.ts. Ledger effect: rejection_out pcs OUT of G2 for scrap/return_to_party
// actions; rework action is document-only.

import { db } from '@/lib/db'
import { postLedger } from './ledger'
import { resolveDocNo } from '../numbering'
import type { DocPlanResult } from './types'
import type { RejectionInput } from '../schemas/rejection'

export async function planRejection(args: RejectionInput): Promise<DocPlanResult> {
  const order = await db.order.findUnique({ where: { orderNo: args.orderNo } })
  if (!order) return { ok: false, error: `Order ${args.orderNo} not found` }
  const dept = args.deptCode ? await db.department.findUnique({ where: { code: args.deptCode } }) : null
  if (args.deptCode && !dept) return { ok: false, error: `Department ${args.deptCode} not found` }
  const rejNo = await resolveDocNo('rejectionEntry', 'rejNo', 'REJ-', args.rejNo)
  const rejDate = args.rejDate ? new Date(args.rejDate) : new Date()
  const action = args.action || 'scrap'
  const rejType = args.rejType || 'stitch_fault'
  const movesStock = action === 'scrap' || action === 'return_to_party'

  return {
    ok: true,
    text: `Proposed rejection ${rejNo}: ${args.qty} pcs of ${order.orderNo} — ${rejType}, action ${action}.`,
    summary: `Rejection ${rejNo} | order ${order.orderNo} | ${args.qty} pcs | type ${rejType} | action ${action}${dept ? ' @' + dept.code : ''}`,
    creates: [{ table: 'rejectionEntry', data: { rejNo, orderId: order.id, deptId: dept?.id, rejDate, qty: args.qty, rejType, action, notes: args.notes } }],
    sideEffects: movesStock
      ? [`StockLedger: ${args.qty} pcs OUT of G2 Finished Goods (rejection_out)`]
      : ['Document only — pieces stay in WIP for re-sewing (post_production_entry with rework)'],
    async commit() {
      return await db.$transaction(async (tx) => {
        const rej = await tx.rejectionEntry.create({
          data: { rejNo, orderId: order.id, deptId: dept?.id, rejDate, qty: args.qty, rejType, action, notes: args.notes },
        })
        if (movesStock) {
          const g2 = await tx.godown.findUnique({ where: { code: 'G2' } })
          if (g2) {
            await postLedger(tx, {
              txnType: 'rejection_out', itemType: 'pcs', itemId: order.id,
              godownId: g2.id, deptId: dept?.id ?? null, orderId: order.id,
              docNo: rejNo, docDate: rejDate,
              out: { pcs: args.qty },
              notes: `QA rejection (${rejType}) → ${action}`,
            })
          }
        }
        return { id: rej.id, rejNo: rej.rejNo }
      })
    },
  }
}
