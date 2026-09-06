import type { RegisterConfig } from './types'

/** /hr/payroll — SPEC-M46 L-02 (Module L Batch 2): the payroll runs register.
 *  One row per run (PR-####): mode, period, lines, earned/advances/net,
 *  lifecycle (draft|committed). `variant` = the mode filter. */
export const payrollConfig: RegisterConfig = {
  slug: 'payroll',
  title: 'Payroll Runs',
  description: 'Per period (piece|daily): lines per employee — earned, advances, net; commit posts the wage journals with partyIds; payslips print per line.',
  filters: [
    { key: 'variant', label: 'Mode', type: 'select', options: [{ value: 'piece', label: 'Piece' }, { value: 'daily', label: 'Daily' }] },
    { key: 'status', label: 'Status', type: 'select', options: [{ value: 'draft', label: 'Draft' }, { value: 'committed', label: 'Committed' }] },
    { key: 'q', label: 'Search', type: 'text', placeholder: 'run no' },
  ],
  columns: [
    { name: 'runNo', label: 'Run', mono: true },
    { name: 'mode', label: 'Mode' },
    { name: 'period', label: 'Period' },
    { name: 'lines', label: 'Lines', align: 'right', format: 'int' },
    { name: 'earned', label: 'Earned ₹', align: 'right', format: 'inr' },
    { name: 'advances', label: 'Advances ₹', align: 'right', format: 'inr' },
    { name: 'net', label: 'Net ₹', align: 'right', format: 'inr' },
    { name: 'status', label: 'Status', format: 'badge' },
    { name: 'committed', label: 'Committed' },
  ],
  agentTools: ['get_payroll_runs'],
  askPrompt: 'Show the payroll runs',
  emptyMessage: 'No payroll runs yet — create one for a period with production entries (piece) or attendance (daily).',
}
