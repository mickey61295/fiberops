// SPEC-M3 §8 row 4 — Purchase Order (/procurement/po, item 'purchase-order',
// legacy FrmPO_Yarn/Fab/Acc/Gen family). Fields mirror PURCHASE_ORDER_SCHEMA
// exactly. Chain step 4 of 15. No ledger effect; commit auto-submits Approval.
// The itemCode line picker is TYPED (ERRATUM 5): its master slug comes from the
// row's itemType cell — the legacy per-type PO forms unified into one screen.
import type { DocConfig } from './types'
import { PURCHASE_ORDER_SCHEMA } from '../schemas/purchase-order'
import { planPurchaseOrder } from '../posting/purchase-order'

export const purchaseOrderConfig: DocConfig = {
  docType: 'purchase-order',
  slug: 'purchase-order',
  title: 'Purchase Order',
  numberPrefix: 'PO-',
  numberField: 'poNo',
  chainStage: 4,
  schema: PURCHASE_ORDER_SCHEMA,
  service: { plan: (input: unknown) => planPurchaseOrder(input as Parameters<typeof planPurchaseOrder>[0]) },
  headerFields: [
    { name: 'poNo', label: 'PO No', type: 'text', colSpan: 1 },
    { name: 'poType', label: 'PO Type', type: 'select', required: true, colSpan: 1, options: [
      { value: 'yarn', label: 'Yarn' },
      { value: 'fabric', label: 'Fabric' },
      { value: 'accessory', label: 'Accessory' },
      { value: 'general', label: 'General' },
    ] },
    { name: 'partyCode', label: 'Supplier (party)', type: 'picker', picker: 'party', required: true, colSpan: 1 },
    { name: 'orderDate', label: 'Order Date', type: 'date', colSpan: 1 },
    { name: 'deliveryDate', label: 'Delivery Date', type: 'date', required: true, colSpan: 1 },
    { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
  ],
  lineFields: [
    { name: 'itemType', label: 'Item Type', type: 'select', required: true, options: [
      { value: 'yarn', label: 'Yarn' },
      { value: 'fabric', label: 'Fabric' },
      { value: 'accessory', label: 'Accessory' },
    ] },
    // typed picker: slug ← the itemType cell (yarn | fabric | accessory)
    { name: 'itemCode', label: 'Item', type: 'picker', pickerFrom: 'itemType', required: true },
    { name: 'qty', label: 'Qty', type: 'number', required: true },
    { name: 'rate', label: 'Rate (₹)', type: 'number', required: true },
  ],
  linesKey: 'lines',
  listColumns: [
    { name: 'poNo', label: 'PO No' },
    { name: 'poType', label: 'Type' },
    { name: 'partyName', label: 'Party' },
    { name: 'totalQty', label: 'Qty', align: 'right' },
    { name: 'totalValue', label: 'Value (₹)', align: 'right' },
    { name: 'deliveryDate', label: 'Delivery' },
    { name: 'status', label: 'Status' },
  ],
  recentCount: 20,
  agentTools: ['create_purchase_order', 'list_purchase_orders', 'get_purchase_order'],
}
