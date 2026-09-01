import type { RegisterConfig } from './types'

/** /inventory/waste-percent — SPEC-M42 INV-05: the waste-% KPI register.
 * WST- kgs ÷ process-receipt kgs per item for the period (the knitting KPI
 * legacy computed on no screen). */
export const wastePercentConfig: RegisterConfig = {
  slug: 'waste-percent',
  title: 'Waste % Register',
  description: 'Waste (WST-) kgs against production receipts per item — the knitting waste KPI.',
  filters: [
    { key: 'from', label: 'From', type: 'dateRange' },
    { key: 'to', label: 'To', type: 'dateRange' },
    {
      key: 'itemType',
      label: 'Item type',
      type: 'select',
      options: [
        { value: 'yarn', label: 'Yarn' },
        { value: 'fabric', label: 'Fabric' },
        { value: 'accessory', label: 'Accessory' },
        { value: 'pcs', label: 'Pieces' },
      ],
    },
  ],
  columns: [
    { name: 'itemCode', label: 'Item', mono: true },
    { name: 'itemType', label: 'Type' },
    { name: 'wasteKgs', label: 'Waste kgs', align: 'right', format: 'qty' },
    { name: 'wastePcs', label: 'Waste pcs', align: 'right', format: 'qty' },
    { name: 'receiptsKgs', label: 'Receipts kgs', align: 'right', format: 'qty' },
    { name: 'wastePct', label: 'Waste %', align: 'right' },
  ],
  agentTools: ['get_stock_ledger'], // the WST- family lives in the ledger (the closing-stock precedent — a ledger-derived register)
  askPrompt: 'Show me the waste percent register',
  emptyMessage: 'No waste receipts (WST-) in this period — record one at Inventory → Waste Receipt.',
}
