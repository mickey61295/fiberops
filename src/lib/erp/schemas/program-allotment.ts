// SPEC-M5 §7-D-36 — shared zod schema for the create_allotment tool / the
// Fabric/Acc Allotment DocScreen (/programs/allotment). WRITE door over the
// ProgBalance tables: bumps reqKgs/reqMtrs on ProgBalanceFabric (or
// ProgBalanceYarn when itemType is yarn), creating the row when absent —
// the read side (program status register, M4) picks the balances up.
// ProgBalance tracks yarn + fabric only (accessory allotments ride
// create_program notes — documented in the service error).
import { z } from 'zod'

export const PROGRAM_ALLOTMENT_SCHEMA = z.object({
  orderNo: z.string(),
  deptCode: z.string(),
  itemType: z.string().describe('yarn | fabric'),
  itemCode: z.string().describe('Yarn code / fabric code'),
  colourName: z.string().optional().describe('Fabric allotment colour'),
  kgs: z.number().min(0).optional().describe('Allotted kgs (bumps reqKgs)'),
  mtrs: z.number().min(0).optional().describe('Allotted mtrs — fabric only (bumps reqMtrs)'),
  notes: z.string().optional(),
})

export type ProgramAllotmentInput = z.infer<typeof PROGRAM_ALLOTMENT_SCHEMA>
