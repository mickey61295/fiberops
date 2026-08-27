/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M5 §7-D-36 — create_allotment service (Fabric/Acc Allotment,
// /programs/allotment). WRITE door over the ProgBalance tables: bumps
// reqKgs (+ reqMtrs for fabric) on ProgBalanceFabric / ProgBalanceYarn,
// creating the balance row when absent — the SAME find-first-or-create +
// increment pattern planProgram uses (posting/program.ts). The read side
// (program status register, M4) picks the balances up automatically.
// Accessory allotments are NOT tracked in ProgBalance (no table) — the
// service rejects them with the create_program-notes pointer.

import { db } from '@/lib/db'
import type { DocPlanResult } from './types'
import type { ProgramAllotmentInput } from '../schemas/program-allotment'

export async function planProgramAllotment(args: ProgramAllotmentInput): Promise<DocPlanResult> {
  const order = await db.order.findUnique({ where: { orderNo: args.orderNo.trim() } })
  if (!order) return { ok: false, error: `Order ${args.orderNo} not found` }
  const dept = await db.department.findUnique({ where: { code: args.deptCode.trim() } })
  if (!dept) return { ok: false, error: `Department ${args.deptCode} not found` }
  if (!args.kgs && !args.mtrs) {
    return { ok: false, error: 'An allotment needs kgs or mtrs (both zero given)' }
  }
  if (args.itemType !== 'yarn' && args.itemType !== 'fabric') {
    return { ok: false, error: 'ProgBalance tracks yarn | fabric only — accessory allotments ride create_program notes' }
  }
  if (args.mtrs && args.itemType !== 'fabric') {
    return { ok: false, error: 'mtrs applies to fabric allotments only' }
  }

  const isYarn = args.itemType === 'yarn'
  const item = isYarn
    ? await db.yarn.findUnique({ where: { code: args.itemCode.trim() } })
    : await db.fabric.findUnique({ where: { code: args.itemCode.trim() } })
  if (!item) return { ok: false, error: `${args.itemType} ${args.itemCode} not found` }

  let colourId: string | undefined
  if (!isYarn && args.colourName?.trim()) {
    const c = await db.colour.findUnique({ where: { name: args.colourName.trim() } })
    if (!c) return { ok: false, error: `Colour ${args.colourName} not found` }
    colourId = c.id
  }

  const kgs = args.kgs ?? 0
  const mtrs = args.mtrs ?? 0
  const table = isYarn ? 'progBalanceYarn' : 'progBalanceFabric'
  const where = isYarn
    ? { orderId: order.id, deptId: dept.id, countId: item.id }
    : { orderId: order.id, deptId: dept.id, fabricId: item.id, colourId: colourId ?? null }
  const existing = isYarn
    ? await db.progBalanceYarn.findFirst({ where: where as any })
    : await db.progBalanceFabric.findFirst({ where: where as any })

  const qtyText = [kgs ? `${kgs} kgs` : '', mtrs ? `${mtrs} mtrs` : ''].filter(Boolean).join(' + ')
  const itemCode = isYarn ? (item as any).code : (item as any).code

  return {
    ok: true,
    text: `Proposed allotment of ${qtyText} ${args.itemType} ${itemCode} to ${args.orderNo} @ ${args.deptCode}.`,
    summary: `Allot to program | ${args.orderNo} | ${args.deptCode} | ${args.itemType} ${itemCode} | ${qtyText}${existing ? ' (bumps existing balance row)' : ' (creates balance row)'}`,
    updates: existing
      ? [{ table, id: existing.id, data: { reqKgs: { increment: kgs }, ...(mtrs ? { reqMtrs: { increment: mtrs } } : {}) } }]
      : [
          {
            table,
            id: '<new>',
            data: isYarn
              ? { orderId: order.id, deptId: dept.id, countId: item.id, reqKgs: kgs }
              : { orderId: order.id, deptId: dept.id, fabricId: item.id, colourId: colourId ?? null, reqKgs: kgs, reqMtrs: mtrs },
          },
        ],
    sideEffects: [
      `Program status register balances shift (req + ${qtyText})`,
      'No stock moves — this is the consumption PLAN, not the issue',
    ],
    async commit() {
      return await db.$transaction(async (tx) => {
        if (isYarn) {
          if (existing) {
            await tx.progBalanceYarn.update({ where: { id: existing.id }, data: { reqKgs: { increment: kgs } } })
            return { id: existing.id, table: 'ProgBalanceYarn', reqKgs: existing.reqKgs + kgs }
          }
          const row = await tx.progBalanceYarn.create({ data: { orderId: order.id, deptId: dept.id, countId: item.id, reqKgs: kgs } })
          return { id: row.id, table: 'ProgBalanceYarn', reqKgs: row.reqKgs }
        }
        if (existing) {
          await tx.progBalanceFabric.update({ where: { id: existing.id }, data: { reqKgs: { increment: kgs }, reqMtrs: { increment: mtrs } } })
          return { id: existing.id, table: 'ProgBalanceFabric', reqKgs: existing.reqKgs + kgs, reqMtrs: (existing as any).reqMtrs + mtrs }
        }
        const row = await tx.progBalanceFabric.create({
          data: { orderId: order.id, deptId: dept.id, fabricId: item.id, colourId: colourId ?? null, reqKgs: kgs, reqMtrs: mtrs },
        })
        return { id: row.id, table: 'ProgBalanceFabric', reqKgs: row.reqKgs, reqMtrs: row.reqMtrs }
      })
    },
  }
}
