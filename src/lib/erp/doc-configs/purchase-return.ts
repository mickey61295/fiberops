// SPEC-M41 PRC-03 — purchase return (/procurement/purchase-return, legacy
// FrmPurchaseReturn). PRN-#### on the GRN table (grnType='purchase_return');
// per-line rejectedQty guard; ledger OUT; optional linked debit note.
import type { DocConfig } from './types'
import { PURCHASE_RETURN_SCHEMA } from '../schemas/purchase-return'
import { planPurchaseReturn } from '../posting/purchase-return'

export const purchaseReturnConfig: DocConfig = {
  docType: 'purchase_return',
  slug: 'purchase-return',
  title: 'Purchase Return',
  numberPrefix: 'PRN-',
  numberField: 'grnNo',
  schema: PURCHASE_RETURN_SCHEMA,
  service: { plan: (input: unknown) => planPurchaseReturn(input as Parameters<typeof planPurchaseReturn>[0]) },
  headerFields: [
    { name: 'prnNo', label: 'PRN No', type: 'text', colSpan: 1 },
    { name: 'grnNo', label: 'Against GRN', type: 'text', required: true, colSpan: 1 },
    { name: 'prnDate', label: 'Return Date', type: 'date', colSpan: 1 },
    { name: 'godownCode', label: 'Godown (out)', type: 'picker', picker: 'godown', colSpan: 1 },
    { name: 'debitNote', label: 'Raise debit note', type: 'select', options: [{ value: 'false', label: 'No' }, { value: 'true', label: 'Yes' }], colSpan: 1 },
    { name: 'notes', label: 'Notes', type: 'text', colSpan: 2 },
  ],
  lineFields: [
    { name: 'itemType', label: 'Item Type', type: 'select', options: [{ value: 'yarn', label: 'Yarn' }, { value: 'fabric', label: 'Fabric' }, { value: 'accessory', label: 'Accessory' }], required: true },
    { name: 'itemCode', label: 'Item Code', type: 'text', required: true },
    { name: 'qty', label: 'Return Qty', type: 'number', required: true },
    { name: 'rate', label: 'Rate (₹)', type: 'number' },
  ],
  linesKey: 'lines',
  listColumns: [
    { name: 'grnNo', label: 'PRN No' },
    { name: 'docNo', label: 'Against GRN' },
    { name: 'partyName', label: 'Party' },
    { name: 'totalQty', label: 'Qty', align: 'right' },
    { name: 'totalValue', label: 'Value (₹)', align: 'right' },
    { name: 'grnDate', label: 'Date' },
  ],
  recentCount: 20,
  agentTools: ['create_purchase_return', 'list_purchase_returns'],
}
