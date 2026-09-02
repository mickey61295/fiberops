// SPEC-M3 §8 row 1 — the order DocScreen config (/orders/new, item
// 'order-sheet-new', legacy FrmOrderSheetNew ×4 variants).
// Fields mirror ORDER_SCHEMA (schemas/order.ts) EXACTLY — the same shared
// schema validates both doors (ADR-001). Chain step 1 of 15.
import type { DocConfig } from './types'
import { ORDER_SCHEMA } from '../schemas/order'
import { planOrder } from '../posting/order'

export const orderConfig: DocConfig = {
  docType: 'order',
  slug: 'order',
  title: 'Order Sheet',
  numberPrefix: 'SO-',
  numberField: 'orderNo',
  chainStage: 1,
  schema: ORDER_SCHEMA,
  // the generic action safeParses with the schema BEFORE calling plan, so the
  // unknown → OrderInput narrowing here is safe (same pattern as docTool)
  service: { plan: (input: unknown) => planOrder(input as Parameters<typeof planOrder>[0]) },
  headerFields: [
    // auto-assigned SO-#### when blank (service resolves, collision-safe)
    { name: 'orderNo', label: 'Order No', type: 'text', colSpan: 1 },
    { name: 'buyerCode', label: 'Buyer', type: 'picker', picker: 'buyer', required: true, colSpan: 1 },
    { name: 'styleNo', label: 'Style', type: 'picker', picker: 'style', required: true, colSpan: 1 },
    { name: 'orderDate', label: 'Order Date', type: 'date', colSpan: 1 },
    { name: 'deliveryDate', label: 'Delivery Date', type: 'date', required: true, colSpan: 1 },
    // SPEC-M43 PRG-01 — buyer PO first-class + the trade type
    { name: 'buyerPoRef', label: 'Buyer PO Ref', type: 'text', colSpan: 1 },
    {
      name: 'orderType', label: 'Order Type', type: 'select', colSpan: 1, options: [
        { value: 'export', label: 'Export' },
        { value: 'domestic', label: 'Domestic' },
        { value: 'trading', label: 'Trading' },
      ],
    },
    { name: 'finYear', label: 'Fin Year', type: 'text', colSpan: 1 },
    { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
  ],
  lineFields: [
    // service resolves by NAME (case-insensitive) — picker emits name (ERRATUM 1)
    { name: 'colourName', label: 'Colour', type: 'picker', picker: 'colour', pickerValueField: 'name', required: true },
    { name: 'sizeName', label: 'Size', type: 'picker', picker: 'size', pickerValueField: 'name', required: true },
    // SPEC-M43 PRG-02 — per-line style (multi-style needs the
    // multi_style_orders flag; blank = the header style)
    { name: 'styleNo', label: 'Style (multi)', type: 'picker', picker: 'style' },
    { name: 'qty', label: 'Qty (pcs)', type: 'number', required: true },
    { name: 'rate', label: 'Rate (₹/pc)', type: 'number', required: true },
  ],
  linesKey: 'lines',
  listColumns: [
    { name: 'orderNo', label: 'Order No' },
    { name: 'buyerName', label: 'Buyer' },
    { name: 'styleNo', label: 'Style' },
    { name: 'totalPcs', label: 'Pcs', align: 'right' },
    { name: 'totalValue', label: 'Value (₹)', align: 'right' },
    { name: 'deliveryDate', label: 'Delivery' },
    { name: 'status', label: 'Status' },
  ],
  recentCount: 20,
  agentTools: ['create_order', 'list_orders', 'get_order', 'suggest_next_step'],
}
