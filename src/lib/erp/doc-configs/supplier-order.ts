/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M5 §7-A-5 — Supplier Orders (/procurement/supplier-orders, item
// 'supplier-orders', legacy FrmSuppOrdSheet_Semi, FrmSuppProdSequence,
// FrmSuppTechDataSheet). The §4 variant-doc pattern over the PO family:
// the config wraps planPurchaseOrder injecting poType='general' (supplier
// order sheets for semi-finished/general goods); PO-#### number space shared.
// Own tool create_supplier_order so chat can say "supplier order" — it calls
// the SAME service (ADR-001; the parity test pins both doors).
import type { DocConfig } from './types'
import { SUPPLIER_ORDER_SCHEMA } from '../schemas/supplier-order'
import { planPurchaseOrder } from '../posting/purchase-order'
import { planSupplierOrder } from '../posting/supplier-order'

export const supplierOrderConfig: DocConfig = {
  docType: 'supplier-order',
  slug: 'supplier-order',
  title: 'Supplier Order',
  numberPrefix: 'PO-',
  numberField: 'poNo',
  chainStage: 4,
  schema: SUPPLIER_ORDER_SCHEMA,
  service: { plan: (input: any) => planSupplierOrder(input) },
  headerFields: [
    { name: 'poNo', label: 'Order No', type: 'text', colSpan: 1 },
    { name: 'poType', label: 'Type', type: 'readonly', colSpan: 1 },
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
    { name: 'itemCode', label: 'Item', type: 'picker', pickerFrom: 'itemType', required: true },
    { name: 'qty', label: 'Qty', type: 'number', required: true },
    { name: 'rate', label: 'Rate (₹)', type: 'number', required: true },
  ],
  linesKey: 'lines',
  listColumns: [
    { name: 'poNo', label: 'Order No' },
    { name: 'poType', label: 'Type' },
    { name: 'partyName', label: 'Supplier' },
    { name: 'totalQty', label: 'Qty', align: 'right' },
    { name: 'totalValue', label: 'Value (₹)', align: 'right' },
    { name: 'deliveryDate', label: 'Delivery' },
    { name: 'status', label: 'Status' },
  ],
  recentCount: 20,
  agentTools: ['create_supplier_order', 'list_purchase_orders'],
}
