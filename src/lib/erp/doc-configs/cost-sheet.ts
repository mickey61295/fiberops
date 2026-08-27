// SPEC-M3 §8 row 18 — Cost Sheet (/costing/cost-sheet, item 'cost-sheet',
// legacy FrmCostSheet). Fields mirror COST_SHEET_SCHEMA exactly. Chain step 14
// of 15. No document number — version auto-increments per order (ERRATUM 4
// pattern: no numberPrefix/numberField). Header-only op.
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
    { name: 'marginPct', label: 'Margin %', type: 'number', colSpan: 1 },
    { name: 'sellingPrice', label: 'Selling Price (₹)', type: 'number', colSpan: 2 },
  ],
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
