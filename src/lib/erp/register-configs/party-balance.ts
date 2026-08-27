import type { RegisterConfig } from './types'

/** /procurement/party-balance — SPEC-M4 §7 row 4 (FrmPartyBlnc, Sp_POBalnce). */
export const partyBalanceConfig: RegisterConfig = {
  slug: 'party-balance',
  title: 'Party Balance',
  description: 'Party-wise PO balances: ordered vs received vs pending.',
  filters: [
    { key: 'party', label: 'Party', type: 'party', placeholder: 'code or name' },
    { key: 'q', label: 'Search', type: 'text', placeholder: 'party name' },
  ],
  columns: [
    { name: 'code', label: 'Code', mono: true },
    { name: 'party', label: 'Party' },
    { name: 'poCount', label: 'POs', align: 'right', format: 'int' },
    { name: 'orderedQty', label: 'Ordered qty', align: 'right', format: 'qty' },
    { name: 'receivedQty', label: 'Received qty', align: 'right', format: 'qty' },
    { name: 'pendingQty', label: 'Pending qty', align: 'right', format: 'qty' },
    { name: 'pendingValue', label: 'Pending value', align: 'right', format: 'inr' },
  ],
  agentTools: ['get_party_ledger'],
  askPrompt: 'Show me party balances and pending POs',
  emptyMessage: 'No purchase orders yet.',
}
