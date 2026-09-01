import type { RegisterConfig } from './types'

/** /dispatch/register — SPEC-M41 PRC-05 (the despatch day-book + aging). */
export const despatchRegisterConfig: RegisterConfig = {
  slug: 'despatch-register',
  title: 'Despatch Register',
  description: 'Despatch day-book — DC & LAD rows with aging and the gate-pass join (PRC-05/07).',
  filters: [
    {
      key: 'status',
      label: 'Status',
      type: 'status',
      options: [
        { value: 'loading', label: 'Loading (LAD)' },
        { value: 'despatched', label: 'Despatched' },
        { value: 'delivered', label: 'Delivered' },
      ],
    },
    { key: 'from', label: 'From', type: 'dateRange' },
    { key: 'to', label: 'To', type: 'dateRange' },
    { key: 'q', label: 'Search', type: 'text', placeholder: 'dc no, order, buyer, vehicle…' },
  ],
  columns: [
    { name: 'dcNo', label: 'DC No', mono: true },
    { name: 'orderNo', label: 'Order', mono: true },
    { name: 'buyer', label: 'Buyer' },
    { name: 'totalPcs', label: 'Pcs', align: 'right', format: 'int' },
    { name: 'despatchDate', label: 'Despatched', format: 'date' },
    { name: 'vehicleNo', label: 'Vehicle / Courier' },
    { name: 'status', label: 'Status', format: 'badge' },
    { name: 'ageDays', label: 'Age (d)', align: 'right', format: 'int' },
    { name: 'gatePass', label: 'Gate Pass', mono: true },
  ],
  agentTools: ['list_despatches'],
  askPrompt: 'Show me the despatch register',
  emptyMessage: 'No despatch documents match these filters.',
}
