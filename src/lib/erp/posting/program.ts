/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M3 §5 row 3 — create_program service. Logic extracted VERBATIM from
// tools.ts (STAGE_DEPT now imported from legacy-enums.ts — ADR-012).
// Ledger effects: ProgBalanceYarn / ProgBalanceFabric projector rows (req+).

import { db } from '@/lib/db'
import { resolveDocNo } from '../numbering'
import { STAGE_DEPT } from '../legacy-enums'
import type { DocPlanResult } from './types'
import type { ProgramInput } from '../schemas/program'

export async function planProgram(args: ProgramInput): Promise<DocPlanResult> {
  const order = await db.order.findUnique({ where: { orderNo: args.orderNo } })
  if (!order) return { ok: false, error: `Order ${args.orderNo} not found` }
  const yarn = args.yarnCode ? await db.yarn.findUnique({ where: { code: args.yarnCode } }) : null
  if (args.yarnCode && !yarn) return { ok: false, error: `Yarn ${args.yarnCode} not found` }
  const fabric = args.fabricCode ? await db.fabric.findUnique({ where: { code: args.fabricCode } }) : null
  if (args.fabricCode && !fabric) return { ok: false, error: `Fabric ${args.fabricCode} not found` }
  const deptCode = args.deptCode || STAGE_DEPT[args.stage]
  const dept = deptCode ? await db.department.findUnique({ where: { code: deptCode } }) : null
  if (deptCode && !dept) return { ok: false, error: `Department ${deptCode} not found` }
  if (!args.requiredKgs && !args.requiredMtrs && !args.requiredPcs) {
    return { ok: false, error: 'Provide at least one of requiredKgs / requiredMtrs / requiredPcs.' }
  }
  const programNo = await resolveDocNo('program', 'programNo', 'PGM-', args.programNo)

  return {
    ok: true,
    text: `Proposed program ${programNo} for ${order.orderNo}: ${args.stage}${dept ? ' @' + dept.code : ''} — ${args.requiredKgs || 0} kg / ${args.requiredMtrs || 0} mtr / ${args.requiredPcs || 0} pcs.`,
    summary: `Create program ${programNo} | order ${order.orderNo} | stage ${args.stage}${dept ? ' @' + dept.code : ''} | req ${args.requiredKgs || 0}kg ${args.requiredMtrs || 0}mtr ${args.requiredPcs || 0}pcs | target ${args.targetDate || '-'} | item ${yarn?.code || fabric?.code || '-'}`,
    creates: [{ table: 'program', data: { programNo, orderId: order.id, stage: args.stage, deptId: dept?.id, yarnId: yarn?.id, fabricId: fabric?.id, requiredKgs: args.requiredKgs || 0, requiredMtrs: args.requiredMtrs || 0, requiredPcs: args.requiredPcs || 0, targetDate: args.targetDate ? new Date(args.targetDate) : null, notes: args.notes, status: 'open' } }],
    sideEffects: [
      yarn ? `ProgBalanceYarn.reqKgs +${args.requiredKgs || 0} kg (order ${order.orderNo})` : null,
      fabric ? `ProgBalanceFabric.reqKgs +${args.requiredKgs || 0} kg (order ${order.orderNo})` : null,
    ].filter((s): s is string => Boolean(s)),
    async commit() {
      return await db.$transaction(async (tx) => {
        const prog = await tx.program.create({
          data: { programNo, orderId: order.id, stage: args.stage, deptId: dept?.id, yarnId: yarn?.id, fabricId: fabric?.id, requiredKgs: args.requiredKgs || 0, requiredMtrs: args.requiredMtrs || 0, requiredPcs: args.requiredPcs || 0, targetDate: args.targetDate ? new Date(args.targetDate) : null, notes: args.notes, status: 'open' },
        })
        // Legacy projector rows: required quantities per order+dept+item.
        if (yarn && dept) {
          const existing = await tx.progBalanceYarn.findFirst({ where: { orderId: order.id, deptId: dept.id, countId: yarn.id } })
          if (existing) await tx.progBalanceYarn.update({ where: { id: existing.id }, data: { reqKgs: { increment: args.requiredKgs || 0 } } })
          else await tx.progBalanceYarn.create({ data: { orderId: order.id, deptId: dept.id, countId: yarn.id, reqKgs: args.requiredKgs || 0 } })
        }
        if (fabric && dept) {
          const existing = await tx.progBalanceFabric.findFirst({ where: { orderId: order.id, deptId: dept.id, fabricId: fabric.id } })
          if (existing) await tx.progBalanceFabric.update({ where: { id: existing.id }, data: { reqKgs: { increment: args.requiredKgs || 0 } } })
          else await tx.progBalanceFabric.create({ data: { orderId: order.id, deptId: dept.id, fabricId: fabric.id, reqKgs: args.requiredKgs || 0 } })
        }
        return { id: prog.id, programNo: prog.programNo }
      })
    },
  }
}
