// SPEC-M3 §6 — shared zod schema, VERBATIM from tools.ts create_program.
import { z } from 'zod'

export const PROGRAM_SCHEMA = z.object({
  programNo: z.string().optional(),
  orderNo: z.string(),
  stage: z.string().describe('knitting | dyeing | printing | embroidery | sewing | finishing | packing'),
  yarnCode: z.string().optional().describe('Yarn code (knitting programs — yarn to consume)'),
  fabricCode: z.string().optional().describe('Fabric code (dyeing programs — fabric to process)'),
  requiredKgs: z.number().optional(),
  requiredMtrs: z.number().optional(),
  requiredPcs: z.number().optional(),
  deptCode: z.string().optional(),
  targetDate: z.string().optional(),
  notes: z.string().optional(),
})

export type ProgramInput = z.infer<typeof PROGRAM_SCHEMA>
