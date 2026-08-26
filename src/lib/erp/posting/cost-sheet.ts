/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M3 §5 row 17 — create_cost_sheet service. Logic extracted VERBATIM from
// tools.ts. Version auto-increments per order.

import { db } from '@/lib/db'
import type { DocPlanResult } from './types'
import type { CostSheetInput } from '../schemas/cost-sheet'

export async function planCostSheet(args: CostSheetInput): Promise<DocPlanResult> {
  const order = await db.order.findUnique({ where: { orderNo: args.orderNo } })
  if (!order) return { ok: false, error: `Order ${args.orderNo} not found` }
  const existing = await db.costSheet.findMany({ where: { orderId: order.id }, orderBy: { version: 'desc' } })
  const version = (existing[0]?.version || 0) + 1
  const totalCost = (args.fabricCost || 0) + (args.trimCost || 0) + (args.cmCost || 0) + (args.washingCost || 0) + (args.packingCost || 0) + (args.overheads || 0)
  return {
    ok: true,
    text: `Proposed cost sheet v${version} for ${order.orderNo} — total ₹${totalCost}, selling ₹${args.sellingPrice || 0}.`,
    summary: `Create cost sheet v${version} | order ${order.orderNo} | fabric ₹${args.fabricCost || 0} | trim ₹${args.trimCost || 0} | CM ₹${args.cmCost || 0} | wash ₹${args.washingCost || 0} | pack ₹${args.packingCost || 0} | OH ₹${args.overheads || 0} | comm ${args.commissionPct || 0}% | margin ${args.marginPct || 0}% | total ₹${totalCost} | sell ₹${args.sellingPrice || 0}`,
    creates: [{ table: 'costSheet', data: { orderId: order.id, version, fabricCost: args.fabricCost || 0, trimCost: args.trimCost || 0, cmCost: args.cmCost || 0, washingCost: args.washingCost || 0, packingCost: args.packingCost || 0, overheads: args.overheads || 0, commissionPct: args.commissionPct || 0, marginPct: args.marginPct || 0, totalCost, sellingPrice: args.sellingPrice || 0 } }],
    sideEffects: ['Margin % recalculated', 'Order totalValue may be revised'],
    async commit() {
      const cs = await db.costSheet.create({ data: { orderId: order.id, version, fabricCost: args.fabricCost || 0, trimCost: args.trimCost || 0, cmCost: args.cmCost || 0, washingCost: args.washingCost || 0, packingCost: args.packingCost || 0, overheads: args.overheads || 0, commissionPct: args.commissionPct || 0, marginPct: args.marginPct || 0, totalCost, sellingPrice: args.sellingPrice || 0 } })
      return { id: cs.id, version: cs.version }
    },
  }
}
