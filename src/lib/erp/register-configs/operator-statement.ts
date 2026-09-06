import type { RegisterConfig } from './types'

/** /hr/operator-statement — SPEC-M45 L-01 (Module L Batch 1): the wage
 *  reconciliation statement. Per operator: earned (piece-rate entries),
 *  paid (wage payments to the 1:1 employee-party), owed = earned − paid.
 *  All-time by default; from/to window both legs on their own dates. */
export const operatorStatementConfig: RegisterConfig = {
  slug: 'operator-statement',
  title: 'Operator Statement',
  description: 'Per operator: earned (piece-rate entries) − paid (wage payments to the employee-party) = owed.',
  filters: [
    { key: 'q', label: 'Search', type: 'text', placeholder: 'operator code or name' },
    { key: 'party', label: 'Employee party', type: 'party', placeholder: 'party code' },
    { key: 'from', label: 'From', type: 'dateRange' },
    { key: 'to', label: 'To', type: 'dateRange' },
  ],
  columns: [
    { name: 'code', label: 'Code', mono: true },
    { name: 'operator', label: 'Operator' },
    { name: 'dept', label: 'Dept' },
    { name: 'party', label: 'Party', mono: true },
    { name: 'entries', label: 'Entries', align: 'right', format: 'qty' },
    { name: 'qty', label: 'Qty (pcs)', align: 'right', format: 'qty' },
    { name: 'earned', label: 'Earned ₹', align: 'right', format: 'inr' },
    { name: 'paid', label: 'Paid ₹', align: 'right', format: 'inr' },
    { name: 'owed', label: 'Owed ₹', align: 'right', format: 'inr' },
  ],
  agentTools: ['get_operator_statement'],
  askPrompt: 'Show the operator wage statement',
  emptyMessage: 'No wage activity for these filters (operators with no entries and no payments stay silent).',
}
