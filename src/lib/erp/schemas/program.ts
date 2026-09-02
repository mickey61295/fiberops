// SPEC-M3 §6 — shared zod schema, VERBATIM from tools.ts create_program.
// SPEC-M43 PRG-03 (additive, all optional): the five knitting-spec inputs —
// written onto the ProgBalanceFabric row (the legacy FrmProgCorr columns).
import { z } from 'zod'

export const PROGRAM_SCHEMA = z.object({
  programNo: z.string().optional(),
  orderNo: z.string(),
  stage: z.string().describe('knitting | dyeing | printing | embroidery | sewing | finishing | packing'),
  yarnCode: z.string().optional().describe('Yarn code (knitting programs — yarn to consume)'),
  fabricCode: z.string().optional().describe('Fabric code (dyeing programs — fabric to process)'),
  // SPEC-M43 PRG-03 — the knitting specification (fabric programs):
  colourCode: z.string().optional().describe('Colour code (fabric program spec)'),
  designCode: z.string().optional().describe('Design code (fabric program spec)'),
  finDiaCode: z.string().optional().describe('Finished dia code (fabric program spec)'),
  finGsm: z.number().optional().describe('Finished GSM (fabric program spec)'),
  ll: z.string().optional().describe('Loop length, e.g. "2.80" (fabric program spec)'),
  requiredKgs: z.number().optional(),
  requiredMtrs: z.number().optional(),
  requiredPcs: z.number().optional(),
  deptCode: z.string().optional(),
  targetDate: z.string().optional(),
  notes: z.string().optional(),
})

export type ProgramInput = z.infer<typeof PROGRAM_SCHEMA>

/** SPEC-M43 PRG-03 — the spec-correction service input (audit-stamped). */
export const PROGRAM_SPEC_CORRECTION_SCHEMA = z.object({
  programNo: z.string(),
  colourCode: z.string().optional(),
  designCode: z.string().optional(),
  finDiaCode: z.string().optional(),
  finGsm: z.number().optional(),
  ll: z.string().optional(),
})

export type ProgramSpecCorrectionInput = z.infer<typeof PROGRAM_SPEC_CORRECTION_SCHEMA>
