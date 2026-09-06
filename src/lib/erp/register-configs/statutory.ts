import type { RegisterConfig } from './types'

/** /hr/statutory — SPEC-M48 L-03 (Module L Batch 3): the statutory remittance
 *  register. One row per COMMITTED run × head (PF/ESI/PT/LWF): employee share
 *  (deducted), employer share (cost), total, the authority party and its
 *  PENDING remittance (party ledger ground truth). `variant` = the head
 *  filter; the csv twin is the challan data export. */
export const statutoryConfig: RegisterConfig = {
  slug: 'statutory',
  title: 'Statutory Register',
  description: 'Per committed run × head (PF/ESI/PT/LWF): employee share deducted, employer share (cost), total, authority party + pending remittance. The csv is the challan data export.',
  filters: [
    { key: 'variant', label: 'Head', type: 'select', options: [
      { value: 'pf', label: 'PF' }, { value: 'esi', label: 'ESI' }, { value: 'pt', label: 'PT' }, { value: 'lwf', label: 'LWF' },
    ] },
    { key: 'q', label: 'Search', type: 'text', placeholder: 'run no' },
  ],
  columns: [
    { name: 'runNo', label: 'Run', mono: true },
    { name: 'mode', label: 'Mode' },
    { name: 'period', label: 'Period' },
    { name: 'head', label: 'Head' },
    { name: 'employee', label: 'Employee ₹', align: 'right', format: 'inr' },
    { name: 'employer', label: 'Employer ₹', align: 'right', format: 'inr' },
    { name: 'total', label: 'Total ₹', align: 'right', format: 'inr' },
    { name: 'authority', label: 'Authority', mono: true },
    { name: 'pending', label: 'Pending remittance ₹', align: 'right', format: 'inr' },
    { name: 'committed', label: 'Committed' },
  ],
  agentTools: ['get_statutory_register'],
  askPrompt: 'Show the statutory register',
  emptyMessage: 'No committed statutory runs yet — create a payroll run with statutory ON, then commit it (draft runs post nothing).',
}
