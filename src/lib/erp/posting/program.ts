/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M3 §5 row 3 — create_program service. Logic extracted VERBATIM from
// tools.ts (STAGE_DEPT now imported from legacy-enums.ts — ADR-012).
// Ledger effects: ProgBalanceYarn / ProgBalanceFabric projector rows (req+).
// SPEC-M43 PRG-03 — the knitting specification (colour/design/dia/gsm/ll)
// now writes onto the ProgBalanceFabric row: legacy had a dedicated
// correction form; the columns existed with zero writers until now.

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

  // PRG-03 — resolve the spec masters (fabric programs carry the knitting spec)
  const colour = args.colourCode ? await db.colour.findUnique({ where: { code: args.colourCode } }) : null
  if (args.colourCode && !colour) return { ok: false, error: `Colour ${args.colourCode} not found` }
  const design = args.designCode ? await db.design.findUnique({ where: { code: args.designCode } }) : null
  if (args.designCode && !design) return { ok: false, error: `Design ${args.designCode} not found` }
  // Dia is keyed by VALUE (no code column)
  const dia = args.finDiaCode ? await db.dia.findUnique({ where: { value: args.finDiaCode } }) : null
  if (args.finDiaCode && !dia) return { ok: false, error: `Dia ${args.finDiaCode} not found (dia master is keyed by value, e.g. "30")` }
  const hasSpec = !!(args.colourCode || args.designCode || args.finDiaCode || args.finGsm || args.ll)
  if (hasSpec && !fabric) {
    return { ok: false, error: 'The knitting spec (colour/design/dia/gsm/ll) belongs to FABRIC programs — pass fabricCode too, or drop the spec fields.' }
  }

  const deptCode = args.deptCode || STAGE_DEPT[args.stage]
  const dept = deptCode ? await db.department.findUnique({ where: { code: deptCode } }) : null
  if (deptCode && !dept) return { ok: false, error: `Department ${deptCode} not found` }
  if (!args.requiredKgs && !args.requiredMtrs && !args.requiredPcs) {
    return { ok: false, error: 'Provide at least one of requiredKgs / requiredMtrs / requiredPcs.' }
  }
  const programNo = await resolveDocNo('program', 'programNo', 'PGM-', args.programNo)

  const specBits = [
    colour?.code, design?.code, dia?.value,
    args.finGsm ? `${args.finGsm} GSM` : null,
    args.ll ? `LL ${args.ll}` : null,
  ].filter(Boolean).join(' · ')

  return {
    ok: true,
    text: `Proposed program ${programNo} for ${order.orderNo}: ${args.stage}${dept ? ' @' + dept.code : ''} — ${args.requiredKgs || 0} kg / ${args.requiredMtrs || 0} mtr / ${args.requiredPcs || 0} pcs${specBits ? ` (${specBits})` : ''}.`,
    summary: `Create program ${programNo} | order ${order.orderNo} | stage ${args.stage}${dept ? ' @' + dept.code : ''} | req ${args.requiredKgs || 0}kg ${args.requiredMtrs || 0}mtr ${args.requiredPcs || 0}pcs | target ${args.targetDate || '-'} | item ${yarn?.code || fabric?.code || '-'}${specBits ? ` | spec ${specBits}` : ''}`,
    creates: [{ table: 'program', data: { programNo, orderId: order.id, stage: args.stage, deptId: dept?.id, yarnId: yarn?.id, fabricId: fabric?.id, requiredKgs: args.requiredKgs || 0, requiredMtrs: args.requiredMtrs || 0, requiredPcs: args.requiredPcs || 0, targetDate: args.targetDate ? new Date(args.targetDate) : null, notes: args.notes, status: 'open' } }],
    sideEffects: [
      yarn ? `ProgBalanceYarn.reqKgs +${args.requiredKgs || 0} kg (order ${order.orderNo})` : null,
      fabric ? `ProgBalanceFabric.reqKgs +${args.requiredKgs || 0} kg (order ${order.orderNo})` : null,
      fabric && hasSpec ? `ProgBalanceFabric spec written: ${specBits}` : null,
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
          // PRG-03 — the spec merges NON-BLANK inputs only (create fills what
          // is given; an existing spec is never clobbered by blank fields).
          const specData = {
            ...(args.colourCode ? { colourId: colour?.id || null } : {}),
            ...(args.designCode ? { designId: design?.id || null } : {}),
            ...(args.finDiaCode ? { finDiaId: dia?.id || null } : {}),
            ...(args.finGsm != null ? { finGsm: args.finGsm } : {}),
            ...(args.ll ? { ll: args.ll } : {}),
          }
          if (existing) await tx.progBalanceFabric.update({ where: { id: existing.id }, data: { reqKgs: { increment: args.requiredKgs || 0 }, ...specData } })
          else await tx.progBalanceFabric.create({ data: { orderId: order.id, deptId: dept.id, fabricId: fabric.id, reqKgs: args.requiredKgs || 0, ...specData } })
        }
        return { id: prog.id, programNo: prog.programNo }
      })
    },
  }
}
