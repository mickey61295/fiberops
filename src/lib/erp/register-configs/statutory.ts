import type { RegisterConfig } from './types'

/** /hr/statutory — SPEC-M47 L-03 (Module L Batch 3): the statutory register.
 *  One row per committed PayrollLine: PF/ESI/PT/LWF legs (employee + employer),
 *  deduction, net. `variant` = the head filter; the CSV twin is the challan
 *  data export (UAN/esiNo + wage bases + EE/ER legs). */
export const statutoryConfig: RegisterConfig = {
  slug: 'statutory',
  title: 'Statutory (PF / ESI / PT / LWF)',
  description: 'Per committed payroll line: statutory legs and deductions. Rates configurable at /admin/statutory; employee legs post at run commit (Dr Wage Payable / Cr head Payable); employer legs are register data. CSV = per-head challan data.',
  filters: [
    { key: 'variant', label: 'Head', type: 'select', options: [
      { value: 'pf', label: 'PF' },
      { value: 'esi', label: 'ESI' },
      { value: 'pt', label: 'PT' },
      { value: 'lwf', label: 'LWF' },
    ] },
    { key: 'q', label: 'Search', type: 'text', placeholder: 'employee / run no' },
    { key: 'from', label: 'From', type: 'dateRange' },
    { key: 'to', label: 'To', type: 'dateRange' },
  ],
  columns: [
    { name: 'run', label: 'Run', mono: true },
    { name: 'period', label: 'Period' },
    { name: 'employee', label: 'Employee' },
    { name: 'uan', label: 'UAN', mono: true },
    { name: 'esiNo', label: 'ESI No', mono: true },
    { name: 'gross', label: 'Gross ₹', align: 'right', format: 'inr' },
    { name: 'pfWages', label: 'PF Wages ₹', align: 'right', format: 'inr' },
    { name: 'pfEe', label: 'PF EE ₹', align: 'right', format: 'inr' },
    { name: 'pfEr', label: 'PF ER ₹', align: 'right', format: 'inr' },
    { name: 'esiEe', label: 'ESI EE ₹', align: 'right', format: 'inr' },
    { name: 'esiEr', label: 'ESI ER ₹', align: 'right', format: 'inr' },
    { name: 'pt', label: 'PT ₹', align: 'right', format: 'inr' },
    { name: 'lwfEe', label: 'LWF EE ₹', align: 'right', format: 'inr' },
    { name: 'deduction', label: 'Deduction ₹', align: 'right', format: 'inr' },
    { name: 'net', label: 'Net ₹', align: 'right', format: 'inr' },
  ],
  agentTools: ['get_statutory_register'],
  askPrompt: 'Show the statutory register',
  emptyMessage: 'No committed statutory lines yet — enable a head at /admin/statutory and run payroll; employee legs appear here after commit.',
}
