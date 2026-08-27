import type { RegisterConfig } from './types'

/** /pieces/stock — SPEC-M4 §7 row 9 (FrmPieceStock family). */
export const pcsStockConfig: RegisterConfig = {
  slug: 'pcs-stock',
  title: 'Pcs Stock',
  description: 'Finished goods stock (pcs) per style × godown, incl. order linkage.',
  filters: [
    { key: 'godown', label: 'Godown', type: 'godown', placeholder: 'e.g. G2' },
    { key: 'q', label: 'Search', type: 'text', placeholder: 'style no' },
  ],
  columns: [
    { name: 'itemCode', label: 'Style', mono: true },
    { name: 'orderNo', label: 'Order', mono: true },
    { name: 'godown', label: 'Godown' },
    { name: 'pcs', label: 'Pcs', align: 'right', format: 'int' },
    { name: 'rate', label: 'Rate', align: 'right', format: 'qty' },
    { name: 'value', label: 'Value', align: 'right', format: 'inr' },
  ],
  agentTools: ['get_stock'],
  askPrompt: 'Show me finished goods (pcs) stock',
  emptyMessage: 'No pcs stock rows.',
}
