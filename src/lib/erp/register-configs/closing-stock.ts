/**
 * SPEC-M19 §4 Wave D — closing-stock as-of register. Pure data. The service is
 * a NEW cumulative aggregation (registers/closing-stock.ts); the chip cites
 * the EXISTING get_stock_ledger read tool (same source table, two-door).
 */
import type { RegisterConfig } from './types'

export const closingStockConfig: RegisterConfig = {
  slug: 'closing-stock',
  title: 'Closing Stock (as-of)',
  description: 'Period-end stock statement — cumulative in/out to the as-of date, per item and godown, with valuation.',
  filters: [
    { key: 'to', label: 'As of', type: 'dateRange' }, // cumulative: no From (by design)
    { key: 'godown', label: 'Godown', type: 'godown', placeholder: 'e.g. G1' },
    { key: 'itemType', label: 'Item type', type: 'itemType', options: [
      { value: 'yarn', label: 'Yarn' },
      { value: 'fabric', label: 'Fabric' },
      { value: 'accessory', label: 'Accessory' },
      { value: 'pcs', label: 'Pcs' },
    ] },
    { key: 'q', label: 'Search', type: 'text', placeholder: 'item code' },
  ],
  columns: [
    { name: 'itemType', label: 'Type' },
    { name: 'itemCode', label: 'Item', mono: true },
    { name: 'godown', label: 'Godown' },
    { name: 'bags', label: 'Bags', align: 'right', format: 'qty' },
    { name: 'kgs', label: 'Kgs', align: 'right', format: 'qty' },
    { name: 'mtrs', label: 'Mtrs', align: 'right', format: 'qty' },
    { name: 'pcs', label: 'Pcs', align: 'right', format: 'int' },
    { name: 'rate', label: 'Rate', align: 'right', format: 'qty' },
    { name: 'value', label: 'Value', align: 'right', format: 'inr' },
  ],
  agentTools: ['get_stock_ledger'],
  askPrompt: 'Show me closing stock as of a date',
  emptyMessage: 'No stock rows up to this date.',
}
