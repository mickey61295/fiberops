import type { RegisterConfig } from './types'

/** /jobwork/register — SPEC-M4 §7 row 11 (FrmJobOrderList). */
export const jobworkRegisterConfig: RegisterConfig = {
  slug: 'jobwork-register',
  title: 'Job Order List / Balance',
  description: 'Jobwork DCs with issued/returned/at-party balances (party footer in totals).',
  filters: [
    {
      key: 'status',
      label: 'Status',
      type: 'status',
      options: [
        { value: 'sent', label: 'Sent (at party)' },
        { value: 'received', label: 'Received' },
        // HFX-09 (Phase-6B Batch 0) — 'billed' removed: no writer produces it
        // (JWL-06 will) — a filter must never select a state nothing reaches.
      ],
    },
    { key: 'party', label: 'Jobworker', type: 'party', placeholder: 'code or name' },
  ],
  columns: [
    { name: 'dcNo', label: 'DC No', mono: true },
    { name: 'jobworker', label: 'Jobworker' },
    { name: 'processType', label: 'Process' },
    { name: 'orderNo', label: 'Order', mono: true },
    { name: 'outDate', label: 'Out', format: 'date' },
    { name: 'expectedInDate', label: 'Expected in', format: 'date' },
    { name: 'receivedDate', label: 'Received', format: 'date' },
    { name: 'totalQty', label: 'Qty', align: 'right', format: 'qty' },
    { name: 'totalValue', label: 'Value', align: 'right', format: 'inr' },
    { name: 'status', label: 'Status', format: 'badge' },
  ],
  agentTools: ['list_jobworks'],
  askPrompt: 'List jobwork orders and balances',
  emptyMessage: 'No jobwork DCs for these filters.',
}
