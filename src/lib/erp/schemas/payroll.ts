// SPEC-M46 L-02 — zod schemas for the payroll run (PR-####). Doors: the
// agent tools (create_payroll_run / commit_payroll_run) and the form actions
// on /hr/payroll. One mode per run; lines freeze at plan time.
import { z } from 'zod'

export const PAYROLL_RUN_SCHEMA = z.object({
  mode: z.enum(['piece', 'daily']).describe('piece = Σ production-entry earnings; daily = attendance × dailyWage'),
  from: z.string().describe('ISO date — period start (inclusive)'),
  to: z.string().describe('ISO date — period end (inclusive)'),
  notes: z.string().optional().describe('Run notes'),
}).strict()
export type PayrollRunInput = z.infer<typeof PAYROLL_RUN_SCHEMA>

export const PAYROLL_RUN_COMMIT_SCHEMA = z.object({
  runNo: z.string().describe('PR-#### of the run'),
  notes: z.string().optional().describe('Notes appended at commit'),
}).strict()
export type PayrollRunCommitInput = z.infer<typeof PAYROLL_RUN_COMMIT_SCHEMA>
