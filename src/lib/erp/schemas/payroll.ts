// SPEC-M46 L-02 — zod schemas for the payroll run (PR-####). Doors: the
// agent tools (create_payroll_run / commit_payroll_run) and the form actions
// on /hr/payroll. One mode per run; lines freeze at plan time.
// SPEC-M48 L-03 — +statutory (opt-in; when true the configured PF/ESI/PT/LWF
// rates are applied and FROZEN on the run).
// SPEC-M49 L-04 — +ot (opt-in, daily runs only; when true the configured
// overtime multiplier + standard hours are applied per present day and
// FROZEN on the run).
import { z } from 'zod'

export const PAYROLL_RUN_SCHEMA = z.object({
  mode: z.enum(['piece', 'daily']).describe('piece = Σ production-entry earnings; daily = attendance × dailyWage'),
  from: z.string().describe('ISO date — period start (inclusive)'),
  to: z.string().describe('ISO date — period end (inclusive)'),
  statutory: z.boolean().optional().describe('apply statutory PF/ESI/PT/LWF deductions per the configured rates (frozen on the run; default false = legacy net = earned − advances)'),
  ot: z.boolean().optional().describe('apply overtime on PRESENT days with hours beyond the per-day standard (linked shift hours, else the configured standard) at the configured multiplier — frozen on the run; daily runs only (default false = legacy earned = days × dailyWage)'),
  notes: z.string().optional().describe('Run notes'),
}).strict()
export type PayrollRunInput = z.infer<typeof PAYROLL_RUN_SCHEMA>

export const PAYROLL_RUN_COMMIT_SCHEMA = z.object({
  runNo: z.string().describe('PR-#### of the run'),
  notes: z.string().optional().describe('Notes appended at commit'),
}).strict()
export type PayrollRunCommitInput = z.infer<typeof PAYROLL_RUN_COMMIT_SCHEMA>
