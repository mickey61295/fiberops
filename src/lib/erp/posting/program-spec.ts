/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M43 PRG-03 — the knitting-spec correction service (the legacy
// FrmProgCorr door): planProgramSpecCorrection updates the spec columns on
// the ProgBalanceFabric row behind a program. Plan/commit through runCommit
// stamps the AuditLog after-image — every correction is traceable. One
// service, both doors (ADR-001): correct_program_spec tool + the program
// view's spec form.

import { db } from '@/lib/db'
import type { DocPlanResult } from './types'
import type { ProgramSpecCorrectionInput } from '../schemas/program'

export async function planProgramSpecCorrection(args: ProgramSpecCorrectionInput): Promise<DocPlanResult> {
  const program = await db.program.findUnique({ where: { programNo: args.programNo }, include: { fabric: true, order: true } })
  if (!program) return { ok: false, error: `Program ${args.programNo} not found` }
  if (!program.fabricId || !program.fabric) {
    return { ok: false, error: `Program ${args.programNo} is not a fabric program — the knitting spec belongs to fabric programs only.` }
  }

  const colour = args.colourCode ? await db.colour.findUnique({ where: { code: args.colourCode } }) : null
  if (args.colourCode && !colour) return { ok: false, error: `Colour ${args.colourCode} not found` }
  const design = args.designCode ? await db.design.findUnique({ where: { code: args.designCode } }) : null
  if (args.designCode && !design) return { ok: false, error: `Design ${args.designCode} not found` }
  // Dia is keyed by VALUE (no code column)
  const dia = args.finDiaCode ? await db.dia.findUnique({ where: { value: args.finDiaCode } }) : null
  if (args.finDiaCode && !dia) return { ok: false, error: `Dia ${args.finDiaCode} not found (dia master is keyed by value, e.g. "30")` }

  if (!args.colourCode && !args.designCode && !args.finDiaCode && args.finGsm == null && !args.ll) {
    return { ok: false, error: 'Nothing to correct — pass at least one of colourCode / designCode / finDiaCode / finGsm / ll.' }
  }

  const row = await db.progBalanceFabric.findFirst({
    where: { orderId: program.orderId, fabricId: program.fabricId },
  })
  if (!row) {
    return {
      ok: false,
      error: `No ProgBalanceFabric row behind ${args.programNo} (order ${program.order?.orderNo ?? program.orderId} × fabric ${program.fabric.code}) — the row is created when the program is posted with a department; recreate the program or post an allotment first.`,
    }
  }

  const data: Record<string, any> = {}
  if (args.colourCode) data.colourId = colour?.id || null
  if (args.designCode) data.designId = design?.id || null
  if (args.finDiaCode) data.finDiaId = dia?.id || null
  if (args.finGsm != null) data.finGsm = args.finGsm
  if (args.ll) data.ll = args.ll

  const before = [
    row.colourId ? 'colour set' : 'colour —',
    row.designId ? 'design set' : 'design —',
    row.finDiaId ? 'dia set' : 'dia —',
    row.finGsm != null ? `${row.finGsm} GSM` : 'GSM —',
    row.ll ? `LL ${row.ll}` : 'LL —',
  ].join(' · ')

  return {
    ok: true,
    text: `Proposed spec correction on ${args.programNo}: ${Object.keys(data).join(', ')}.`,
    summary: `Correct knitting spec on ${args.programNo} | order ${program.order?.orderNo ?? program.orderId} | fabric ${program.fabric.code} | fields ${Object.keys(data).join(', ')} (was: ${before})`,
    updates: [{ table: 'progBalanceFabric', id: row.id, data }],
    sideEffects: [
      `ProgBalanceFabric ${row.id.slice(0, 8)} spec updated (${Object.keys(data).join(', ')}) — audit row stamped by runCommit`,
    ],
    async commit() {
      await db.progBalanceFabric.update({ where: { id: row.id }, data })
      return { programNo: program.programNo, fields: Object.keys(data) }
    },
  }
}
