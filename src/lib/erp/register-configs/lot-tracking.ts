import type { RegisterConfig } from './types'

/** /inventory/lots — SPEC-M4 §7 row 7 (FrmLotRegister family). */
export const lotTrackingConfig: RegisterConfig = {
  slug: 'lot-tracking',
  title: 'Lot Tracking',
  description: 'Lot register: lots in, separated, consumed — with current stock rollup.',
  filters: [
    { key: 'party', label: 'Party', type: 'party', placeholder: 'code or name' },
    { key: 'q', label: 'Search', type: 'text', placeholder: 'lot no' },
  ],
  columns: [
    { name: 'lotNo', label: 'Lot', mono: true },
    { name: 'party', label: 'Party' },
    { name: 'kgs', label: 'Kgs', align: 'right', format: 'qty' },
    { name: 'mtrs', label: 'Mtrs', align: 'right', format: 'qty' },
    { name: 'pcs', label: 'Pcs', align: 'right', format: 'int' },
    { name: 'godowns', label: 'Godowns', align: 'right', format: 'int' },
  ],
  agentTools: ['list_lots'],
  askPrompt: 'List lots with their stock',
  emptyMessage: 'No lots recorded yet.',
}
