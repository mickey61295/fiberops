// SPEC-M3 §8 rows 10-11 — Production Entry + Rework (/production/entry +
// /production/rework, items 'production-entry'/'rework', legacy
// FrmProductionEntry / RptPCSRejection-rework flow). Fields mirror
// PRODUCTION_ENTRY_SCHEMA / REWORK_SCHEMA exactly. Chain steps 10/11.
// Ledger: production_in pcs INTO G2 (good output); rework is document-only.
// NEITHER carries a doc number — bundleNo is the reference (ERRATUM 4), so
// numberPrefix/numberField are absent. lineId emits the line's db ID
// (pickerValueField 'id') because the service stores the FK directly.
import type { DocConfig } from './types'
import { PRODUCTION_ENTRY_SCHEMA, REWORK_SCHEMA } from '../schemas/production'
import { planProductionEntry, planReworkEntry } from '../posting/production'

export const productionConfig: DocConfig = {
  docType: 'production',
  slug: 'production',
  title: 'Production Entry',
  chainStage: 10,
  schema: PRODUCTION_ENTRY_SCHEMA,
  service: { plan: (input: unknown) => planProductionEntry(input as Parameters<typeof planProductionEntry>[0]) },
  headerFields: [
    { name: 'orderNo', label: 'Order No', type: 'text', required: true, colSpan: 1 },
    { name: 'deptCode', label: 'Department', type: 'picker', picker: 'department', required: true, colSpan: 1 },
    { name: 'prodDate', label: 'Prod Date', type: 'date', required: true, colSpan: 1 },
    { name: 'bundleNo', label: 'Bundle No', type: 'text', required: true, colSpan: 1 },
    { name: 'operatorCode', label: 'Operator', type: 'picker', picker: 'employee', required: true, colSpan: 1 },
    { name: 'qty', label: 'Qty (pcs)', type: 'number', required: true, colSpan: 1 },
    { name: 'rate', label: 'Rate (₹/pc)', type: 'number', required: true, colSpan: 1 },
    { name: 'styleNo', label: 'Style', type: 'picker', picker: 'style', colSpan: 1 },
    { name: 'colourName', label: 'Colour', type: 'picker', picker: 'colour', pickerValueField: 'name', colSpan: 1 },
    { name: 'sizeName', label: 'Size', type: 'picker', picker: 'size', colSpan: 1 },
    { name: 'lineId', label: 'Line', type: 'picker', picker: 'line', pickerValueField: 'id', colSpan: 2 },
  ],
  listColumns: [
    { name: 'orderNo', label: 'Order' },
    { name: 'deptName', label: 'Dept' },
    { name: 'prodDate', label: 'Date' },
    { name: 'bundleNo', label: 'Bundle' },
    { name: 'operatorName', label: 'Operator' },
    { name: 'qty', label: 'Qty', align: 'right' },
    { name: 'rate', label: 'Rate', align: 'right' },
    { name: 'amount', label: 'Amount (₹)', align: 'right' },
  ],
  recentCount: 20,
  agentTools: ['post_production_entry', 'suggest_next_step'],
}

export const reworkConfig: DocConfig = {
  docType: 'rework',
  slug: 'rework',
  title: 'Rework Entry',
  // viewed through /production/entry/[id] — a rework IS a ProductionEntry
  // (rework: true); no separate view route (documented in STATE).
  chainStage: 11,
  schema: REWORK_SCHEMA,
  service: { plan: (input: unknown) => planReworkEntry(input as Parameters<typeof planReworkEntry>[0]) },
  headerFields: [
    { name: 'orderNo', label: 'Order No', type: 'text', required: true, colSpan: 1 },
    { name: 'deptCode', label: 'Department', type: 'picker', picker: 'department', required: true, colSpan: 1 },
    { name: 'qty', label: 'Qty (pcs)', type: 'number', required: true, colSpan: 1 },
    { name: 'bundleNo', label: 'Bundle No', type: 'text', required: true, colSpan: 1 },
    { name: 'prodDate', label: 'Prod Date', type: 'date', colSpan: 1 },
    { name: 'operatorCode', label: 'Operator', type: 'picker', picker: 'employee', colSpan: 1 },
    { name: 'rate', label: 'Rate (₹/pc)', type: 'number', colSpan: 1 },
    { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
  ],
  listColumns: [
    { name: 'orderNo', label: 'Order' },
    { name: 'deptName', label: 'Dept' },
    { name: 'prodDate', label: 'Date' },
    { name: 'bundleNo', label: 'Bundle' },
    { name: 'operatorName', label: 'Operator' },
    { name: 'qty', label: 'Qty', align: 'right' },
    { name: 'amount', label: 'Amount (₹)', align: 'right' },
  ],
  recentCount: 20,
  agentTools: ['post_rework'],
}
