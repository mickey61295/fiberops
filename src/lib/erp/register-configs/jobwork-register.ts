import type { RegisterConfig } from './types'

/** /jobwork/register — SPEC-M4 §7 row 11 (FrmJobOrderList); M39 JWL: sent vs
 *  received per row + the honest status fleet (partial/accepted/billed all
 *  have writers now — HFX-09 retired BY JWL-06, not by deletion). */
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
        { value: 'partial', label: 'Partially received' },
        { value: 'received', label: 'Received' },
        { value: 'accepted', label: 'GAN accepted' },
        // JWL-06 (M39) — 'billed' RETURNS: bill_jobwork writes it (HFX-09's
        // removal is retired; every filter option now has a writer again).
        { value: 'billed', label: 'Billed' },
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
    { name: 'totalQty', label: 'Sent', align: 'right', format: 'qty' },
    { name: 'receivedQty', label: 'Received', align: 'right', format: 'qty' },
    { name: 'balance', label: 'At Party', align: 'right', format: 'qty' },
    { name: 'totalValue', label: 'Value', align: 'right', format: 'inr' },
    { name: 'status', label: 'Status', format: 'badge' },
  ],
  agentTools: ['list_jobworks'],
  askPrompt: 'List jobwork orders and balances',
  emptyMessage: 'No jobwork DCs for these filters.',
}
