// SPEC-M3 §8 row 18 — Cost Sheet (/costing/cost-sheet, item 'cost-sheet',
// legacy FrmCostSheet). Fields mirror COST_SHEET_SCHEMA exactly. Chain step 14
// of 15. No document number — version auto-increments per order (ERRATUM 4
// pattern: no numberPrefix/numberField).
// SPEC-M44 CST-02 — the CALCULATOR door: lineFields (component/bom/manual
// lines — rates resolve server-side, the CC-#### library quotes); marginPct
// is computed on commit ((selling − cost)/selling); computeFromBom stays an
// agent-only hook (the AGENT_ONLY_HOOK_KEYS precedent — the form door uses
// the line editor).
import type { DocConfig } from './types'
import { COST_SHEET_SCHEMA } from '../schemas/cost-sheet'
import { planCostSheet } from '../posting/cost-sheet'

export const costSheetConfig: DocConfig = {
  docType: 'cost-sheet',
  slug: 'cost-sheet',
  title: 'Cost Sheet',
  chainStage: 14,
  schema: COST_SHEET_SCHEMA,
  service: { plan: (input: unknown) => planCostSheet(input as Parameters<typeof planCostSheet>[0]) },
  headerFields: [
    { name: 'orderNo', label: 'Order No', type: 'text', required: true, colSpan: 2 },
    { name: 'fabricCost', label: 'Fabric Cost (₹)', type: 'number', colSpan: 1 },
    { name: 'trimCost', label: 'Trim Cost (₹)', type: 'number', colSpan: 1 },
    { name: 'cmCost', label: 'CM / Labour (₹)', type: 'number', colSpan: 1 },
    { name: 'washingCost', label: 'Washing (₹)', type: 'number', colSpan: 1 },
    { name: 'packingCost', label: 'Packing (₹)', type: 'number', colSpan: 1 },
    { name: 'overheads', label: 'Overheads (₹)', type: 'number', colSpan: 1 },
    { name: 'commissionPct', label: 'Commission %', type: 'number', colSpan: 1 },
    { name: 'marginPct', label: 'Margin %', type: 'readonly', colSpan: 1 },
    { name: 'sellingPrice', label: 'Selling Price (₹)', type: 'number', colSpan: 2 },
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
    { name: 'version', label: 'Version' },
    { name: 'totalCost', label: 'Total Cost (₹)', align: 'right' },
    { name: 'sellingPrice', label: 'Selling (₹)', align: 'right' },
    { name: 'createdAt', label: 'Created' },
  ],
  recentCount: 20,
  agentTools: ['create_cost_sheet'],
}
