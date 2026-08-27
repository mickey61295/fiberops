import type { RegisterConfig } from './types'

/** /inventory/register — SPEC-M4 §7 row 6 (FrmStockRegister ×4). */
export const stockRegisterConfig: RegisterConfig = {
  slug: 'stock-register',
  title: 'Stock Register',
  description: 'Current stock grouped: general (yarn/fabric/accessory), style-wise pcs, or pcs detail.',
  filters: [
    {
      key: 'variant',
      label: 'Register',
      type: 'select',
      options: [
        { value: 'general', label: 'General (items)' },
        { value: 'style', label: 'Style-wise (pcs)' },
        { value: 'pcs', label: 'Pcs detail' },
      ],
    },
    { key: 'godown', label: 'Godown', type: 'godown', placeholder: 'e.g. G1' },
    {
      key: 'itemType',
      label: 'Item type',
      type: 'itemType',
      options: [
        { value: 'yarn', label: 'Yarn' },
        { value: 'fabric', label: 'Fabric' },
        { value: 'accessory', label: 'Accessory' },
        { value: 'pcs', label: 'Pcs' },
      ],
    },
  ],
  columns: [
    { name: 'itemType', label: 'Type' },
    { name: 'itemCode', label: 'Item', mono: true },
    { name: 'orderNo', label: 'Order', mono: true },
    { name: 'godown', label: 'Godown' },
    { name: 'bags', label: 'Bags', align: 'right', format: 'qty' },
    { name: 'kgs', label: 'Kgs', align: 'right', format: 'qty' },
    { name: 'mtrs', label: 'Mtrs', align: 'right', format: 'qty' },
    { name: 'pcs', label: 'Pcs', align: 'right', format: 'int' },
    { name: 'value', label: 'Value', align: 'right', format: 'inr' },
  ],
  agentTools: ['get_stock_ledger'],
  askPrompt: 'Show me the stock register',
  emptyMessage: 'No stock rows for these filters.',
}
