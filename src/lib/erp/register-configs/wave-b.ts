/**
 * SPEC-M19 §2 Wave B — cutting & issue day-books + the supplier registers.
 * Pure data like every register config. All five cite EXISTING agent read
 * tools (two-door proof) — ZERO new tools.
 */
import type { RegisterConfig } from './types'

const cutStatusOptions = [
  { value: 'planned', label: 'Planned' },
  { value: 'cut', label: 'Cut' },
  { value: 'acknowledged', label: 'Acknowledged' },
]

/** /cutting/register — legacy FrmCutingReg (the cut day-book). */
export const cuttingRegisterConfig: RegisterConfig = {
  slug: 'cutting-register',
  title: 'Cutting Register',
  description: 'The cut day-book — every cutting job order with bundle counts, fabric issued and output pcs.',
  filters: [
    { key: 'from', label: 'From', type: 'dateRange' },
    { key: 'to', label: 'To', type: 'dateRange' },
    { key: 'order', label: 'Order', type: 'order', placeholder: 'e.g. 11135903' },
    { key: 'status', label: 'Status', type: 'status', options: cutStatusOptions },
    { key: 'q', label: 'Search', type: 'text', placeholder: 'cut no / order no' },
  ],
  columns: [
    { name: 'cutNo', label: 'Cut No', mono: true },
    { name: 'cutDate', label: 'Date', format: 'date' },
    { name: 'orderNo', label: 'Order', mono: true },
    { name: 'buyer', label: 'Buyer' },
    { name: 'style', label: 'Style', mono: true },
    { name: 'fabricIssued', label: 'Fabric kgs', align: 'right', format: 'qty' },
    { name: 'totalPcs', label: 'Cut pcs', align: 'right', format: 'int' },
    { name: 'bundles', label: 'Bundles', align: 'right', format: 'int' },
    { name: 'bundlePcs', label: 'Bundle pcs', align: 'right', format: 'int' },
    { name: 'status', label: 'Status', format: 'badge' },
  ],
  agentTools: ['list_cut_orders'],
  askPrompt: 'Show me the cutting register',
  emptyMessage: 'No cutting job orders for these filters yet.',
}

/** /production/issue/register — legacy FrmOrdBundIssToLineReg. */
export const lineIssueRegisterConfig: RegisterConfig = {
  slug: 'line-issue-register',
  title: 'Issue to Line Register',
  description: 'Order/bundle issues to sewing lines — the issue-to-line day-book.',
  filters: [
    { key: 'from', label: 'From', type: 'dateRange' },
    { key: 'to', label: 'To', type: 'dateRange' },
    { key: 'order', label: 'Order', type: 'order', placeholder: 'e.g. 11135903' },
    { key: 'q', label: 'Search', type: 'text', placeholder: 'issue no / style / line' },
  ],
  columns: [
    { name: 'issueNo', label: 'Issue No', mono: true },
    { name: 'issueDate', label: 'Date', format: 'date' },
    { name: 'orderNo', label: 'Order', mono: true },
    { name: 'buyer', label: 'Buyer' },
    { name: 'line', label: 'Line' },
    { name: 'styleNo', label: 'Style', mono: true },
    { name: 'qty', label: 'Pcs', align: 'right', format: 'int' },
    { name: 'status', label: 'Status', format: 'badge' },
  ],
  agentTools: ['get_line_status'], // read-door chip; issue_to_line is the write door (not a chip)
  askPrompt: 'Show me issues to lines',
  emptyMessage: 'No line issues for these filters yet.',
}

const poStatusOptions = [
  { value: 'open', label: 'Open' },
  { value: 'partial', label: 'Partial' },
  { value: 'received', label: 'Received' },
  { value: 'cancelled', label: 'Cancelled' },
]

/** /procurement/supplier-pending — legacy frmSupordPendReg (per-PO chase list). */
export const supplierPendingConfig: RegisterConfig = {
  slug: 'supplier-pending',
  title: 'Supplier Pending Orders',
  description: 'Per-PO ordered vs received — the pending purchase chase list (pending > 0 by default).',
  filters: [
    { key: 'party', label: 'Party', type: 'party', placeholder: 'e.g. PRT-0001' },
    { key: 'status', label: 'Status', type: 'status', options: poStatusOptions },
    { key: 'q', label: 'Search', type: 'text', placeholder: 'PO no / party name' },
  ],
  columns: [
    { name: 'poNo', label: 'PO No', mono: true },
    { name: 'poType', label: 'Type' },
    { name: 'party', label: 'Supplier' },
    { name: 'orderDate', label: 'Ordered', format: 'date' },
    { name: 'deliveryDate', label: 'Delivery', format: 'date' },
    { name: 'orderedQty', label: 'Ordered', align: 'right', format: 'qty' },
    { name: 'receivedQty', label: 'Received', align: 'right', format: 'qty' },
    { name: 'pendingQty', label: 'Pending qty', align: 'right', format: 'qty' },
    { name: 'pendingValue', label: 'Pending value', align: 'right', format: 'inr' },
    { name: 'status', label: 'Status', format: 'badge' },
  ],
  agentTools: ['list_purchase_orders', 'get_party_ledger'],
  askPrompt: 'Show me pending supplier orders',
  emptyMessage: 'Nothing pending — every PO fully received.',
}

/** /procurement/po/register — legacy FrmSupplierOrderRegister (the PO day-book). */
export const poRegisterConfig: RegisterConfig = {
  slug: 'po-register',
  title: 'PO Register',
  description: 'The supplier PO day-book — every purchase order with type, party, dates and value.',
  filters: [
    { key: 'variant', label: 'PO type', type: 'select', options: [
      { value: 'yarn', label: 'Yarn' },
      { value: 'fabric', label: 'Fabric' },
      { value: 'accessory', label: 'Accessory' },
      { value: 'general', label: 'General (supplier orders)' },
    ] },
    { key: 'from', label: 'From', type: 'dateRange' },
    { key: 'to', label: 'To', type: 'dateRange' },
    { key: 'party', label: 'Party', type: 'party', placeholder: 'e.g. PRT-0001' },
    { key: 'status', label: 'Status', type: 'status', options: poStatusOptions },
    { key: 'q', label: 'Search', type: 'text', placeholder: 'PO no / party name' },
  ],
  columns: [
    { name: 'poNo', label: 'PO No', mono: true },
    { name: 'poType', label: 'Type' },
    { name: 'party', label: 'Supplier' },
    { name: 'orderDate', label: 'Ordered', format: 'date' },
    { name: 'deliveryDate', label: 'Delivery', format: 'date' },
    { name: 'totalQty', label: 'Qty', align: 'right', format: 'qty' },
    { name: 'totalValue', label: 'Value', align: 'right', format: 'inr' },
    { name: 'status', label: 'Status', format: 'badge' },
  ],
  agentTools: ['list_purchase_orders'],
  askPrompt: 'Show me the PO register',
  emptyMessage: 'No purchase orders for these filters yet.',
}

/** /procurement/supplier-history — legacy FrmSuppOrderHistoryReg. */
export const supplierHistoryConfig: RegisterConfig = {
  slug: 'supplier-history',
  title: 'Supplier Order History',
  description: 'Per-supplier period rollup — POs, ordered vs received, pending value and last receipt date.',
  filters: [
    { key: 'from', label: 'From', type: 'dateRange' },
    { key: 'to', label: 'To', type: 'dateRange' },
    { key: 'party', label: 'Party', type: 'party', placeholder: 'e.g. PRT-0001' },
    { key: 'q', label: 'Search', type: 'text', placeholder: 'party name' },
  ],
  columns: [
    { name: 'party', label: 'Supplier' },
    { name: 'poCount', label: 'POs', align: 'right', format: 'int' },
    { name: 'orderedQty', label: 'Ordered', align: 'right', format: 'qty' },
    { name: 'receivedQty', label: 'Received', align: 'right', format: 'qty' },
    { name: 'grns', label: 'GRNs', align: 'right', format: 'int' },
    { name: 'lastReceipt', label: 'Last receipt', format: 'date' },
    { name: 'pendingValue', label: 'Pending value', align: 'right', format: 'inr' },
  ],
  agentTools: ['get_party_ledger'],
  askPrompt: 'Show me supplier order history',
  emptyMessage: 'No supplier activity for this period.',
}
