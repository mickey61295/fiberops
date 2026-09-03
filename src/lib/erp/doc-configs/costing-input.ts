// SPEC-M5 §7-B-19 — costing input VARIANT config (/costing/input, item
// 'costing-input', legacy Frm_CostingInput + multi-level daily variants).
// Pure variant over planCostSheet — "daily input = version bump semantics the
// service already has": every saved input creates the order's next cost-sheet
// version. Zero injection needed (§4 pure-config variant); the agent door is
// the existing create_cost_sheet.
// SPEC-M44 CST-02 — mirrors the cost-sheet lineFields (the same calculator
// service); marginPct readonly (computed on commit).
import type { DocConfig } from './types'
import { COST_SHEET_SCHEMA } from '../schemas/cost-sheet'
import { planCostSheet } from '../posting/cost-sheet'

export const costingInputConfig: DocConfig = {
  docType: 'costing-input',
  slug: 'costing-input',
  title: 'Costing Input (Daily)',
  chainStage: 14,
  schema: COST_SHEET_SCHEMA,
  service: { plan: (input: unknown) => planCostSheet(input as Parameters<typeof planCostSheet>[0]) },
  headerFields: [
    { name: 'orderNo', label: 'Order No', type: 'text', required: true, colSpan: 1 },
    { name: 'fabricCost', label: 'Fabric Cost (₹)', type: 'number', colSpan: 1 },
    { name: 'trimCost', label: 'Trim Cost (₹)', type: 'number', colSpan: 1 },
    { name: 'cmCost', label: 'CM / Labour (₹)', type: 'number', colSpan: 1 },
    { name: 'washingCost', label: 'Washing (₹)', type: 'number', colSpan: 1 },
    { name: 'packingCost', label: 'Packing (₹)', type: 'number', colSpan: 1 },
    { name: 'overheads', label: 'Overheads (₹)', type: 'number', colSpan: 1 },
    { name: 'commissionPct', label: 'Commission %', type: 'number', colSpan: 1 },
    { name: 'sellingPrice', label: 'Selling Price (₹)', type: 'number', colSpan: 1 },
    { name: 'marginPct', label: 'Margin %', type: 'readonly', colSpan: 1 },
  ],
  lineFields: [
    { name: 'head', label: 'Head', type: 'select', options: [
      { value: 'fabric', label: 'Fabric' }, { value: 'trim', label: 'Trim' }, { value: 'cm', label: 'CM/Labour' },
      { value: 'washing', label: 'Washing' }, { value: 'packing', label: 'Packing' }, { value: 'overheads', label: 'Overheads' },
    ] },
    { name: 'source', label: 'Source', type: 'select', options: [
      { value: 'bom', label: 'BOM' }, { value: 'component', label: 'Component' }, { value: 'manual', label: 'Manual' },
    ], required: true },
    { name: 'itemType', label: 'Item Type', type: 'select', options: [
      { value: 'yarn', label: 'Yarn' }, { value: 'fabric', label: 'Fabric' }, { value: 'accessory', label: 'Accessory' },
    ] },
    { name: 'itemCode', label: 'Item Code', type: 'text' },
    { name: 'componentCode', label: 'Component', type: 'text' },
    { name: 'qty', label: 'Qty', type: 'number' },
    { name: 'rate', label: 'Rate (₹)', type: 'number' },
    { name: 'amount', label: 'Amount (₹)', type: 'number' },
    { name: 'notes', label: 'Notes', type: 'text' },
  ],
  linesKey: 'lines',
  listColumns: [
    { name: 'orderNo', label: 'Order' },
    { name: 'version', label: 'Ver', align: 'right' },
    { name: 'totalCost', label: 'Total Cost (₹)', align: 'right' },
    { name: 'sellingPrice', label: 'Selling (₹)', align: 'right' },
    { name: 'marginPct', label: 'Margin %', align: 'right' },
    { name: 'createdAt', label: 'Input At' },
  ],
  recentCount: 20,
  agentTools: ['create_cost_sheet'],
}
