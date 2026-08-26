/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M3 §5 rows 10-11 — production entry + rework services. Logic extracted
// VERBATIM from tools.ts. Ledger effects: production_in pcs INTO G2 (good
// output only — rework entries are document-only, no stock move).

import { db } from '@/lib/db'
import { postLedger } from './ledger'
import type { DocPlanResult } from './types'
import type { ProductionEntryInput, ReworkInput } from '../schemas/production'

export async function planProductionEntry(args: ProductionEntryInput): Promise<DocPlanResult> {
  const order = await db.order.findUnique({ where: { orderNo: args.orderNo } })
  if (!order) return { ok: false, error: `Order ${args.orderNo} not found` }
  const dept = await db.department.findUnique({ where: { code: args.deptCode } })
  if (!dept) return { ok: false, error: `Dept ${args.deptCode} not found` }
  const operator = await db.employee.findUnique({ where: { code: args.operatorCode } })
  if (!operator) return { ok: false, error: `Operator ${args.operatorCode} not found` }
  const amount = args.qty * args.rate
  return {
    ok: true,
    text: `Proposed production entry: ${args.qty} pcs by ${operator.name} on bundle ${args.bundleNo}, ₹${amount}.`,
    summary: `Post production | order ${args.orderNo} | dept ${dept.code} | ${args.qty} pcs | bundle ${args.bundleNo} | operator ${operator.name} | ₹${amount}`,
    creates: [{ table: 'productionEntry', data: { orderId: order.id, deptId: dept.id, prodDate: new Date(args.prodDate), bundleNo: args.bundleNo, operatorId: operator.id, styleNo: args.styleNo || order.styleId, qty: args.qty, rate: args.rate, amount, lineId: args.lineId } }],
    sideEffects: ['WIP increases', 'Operator piece-rate earnings increase'],
    async commit() {
      return await db.$transaction(async (tx) => {
        const e = await tx.productionEntry.create({
          data: {
            orderId: order.id, deptId: dept.id, prodDate: new Date(args.prodDate),
            bundleNo: args.bundleNo, operatorId: operator.id, styleNo: args.styleNo,
            qty: args.qty, rate: args.rate, amount, lineId: args.lineId,
          },
        })
        // Industry chain: good output enters G2 (Finished Goods) — production_in.
        // Rework entries do NOT move stock (pieces are re-sewn in WIP).
        const g2 = await tx.godown.findUnique({ where: { code: 'G2' } })
        if (g2) {
          await postLedger(tx, {
            txnType: 'production_in', itemType: 'pcs', itemId: order.id,
            godownId: g2.id, deptId: dept.id, orderId: order.id,
            docNo: args.bundleNo, docDate: new Date(args.prodDate),
            in: { pcs: args.qty },
            notes: `Production ${dept.code} bundle ${args.bundleNo}`,
          })
        }
        return { id: e.id }
      })
    },
  }
}

export async function planReworkEntry(args: ReworkInput): Promise<DocPlanResult> {
  const order = await db.order.findUnique({ where: { orderNo: args.orderNo } })
  if (!order) return { ok: false, error: `Order ${args.orderNo} not found` }
  const dept = await db.department.findUnique({ where: { code: args.deptCode } })
  if (!dept) return { ok: false, error: `Dept ${args.deptCode} not found` }
  const operator = args.operatorCode ? await db.employee.findUnique({ where: { code: args.operatorCode } }) : null
  if (args.operatorCode && !operator) return { ok: false, error: `Operator ${args.operatorCode} not found` }
  const prodDate = args.prodDate ? new Date(args.prodDate) : new Date()
  const rate = args.rate || 0
  const amount = args.qty * rate

  return {
    ok: true,
    text: `Proposed rework entry: ${args.qty} pcs of ${order.orderNo} re-processed @ ${dept.code}.`,
    summary: `Rework | order ${order.orderNo} | dept ${dept.code} | ${args.qty} pcs | bundle ${args.bundleNo}${operator ? ' | operator ' + operator.name : ''} | ₹${amount}`,
    creates: [{ table: 'productionEntry', data: { orderId: order.id, deptId: dept.id, prodDate, bundleNo: args.bundleNo, operatorId: operator?.id, qty: args.qty, rate, amount, rework: true, styleNo: order.styleId } }],
    sideEffects: ['Rework tracked separately from first-pass output', 'Piece-rate earnings accrue to the operator'],
    async commit() {
      const e = await db.productionEntry.create({
        data: { orderId: order.id, deptId: dept.id, prodDate, bundleNo: args.bundleNo, operatorId: operator?.id, qty: args.qty, rate, amount, rework: true },
      })
      return { id: e.id }
    },
  }
}
