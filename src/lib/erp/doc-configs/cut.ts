// SPEC-M3 §8 row 8 — Cutting Job Order (/cutting/job-order, item
// 'cutting-job-order', legacy FrmCuttingJobOrder ×4). Fields mirror
// CUT_ORDER_SCHEMA exactly. Chain step 8 of 15.
// Ledger: ready_to_cut_in pcs INTO G1 + auto-generated cut bundles.
import type { DocConfig } from './types'
import { CUT_ORDER_SCHEMA } from '../schemas/cut'
import { planCutOrder } from '../posting/cut'

export const cutConfig: DocConfig = {
  docType: 'cut',
  slug: 'cut',
  title: 'Cut Order',
  numberPrefix: 'CUT-',
  numberField: 'cutNo',
  chainStage: 8,
  schema: CUT_ORDER_SCHEMA,
  service: { plan: (input: unknown) => planCutOrder(input as Parameters<typeof planCutOrder>[0]) },
  headerFields: [
    { name: 'cutNo', label: 'Cut No', type: 'text', colSpan: 1 },
    { name: 'orderNo', label: 'Order No', type: 'text', required: true, colSpan: 1 },
    { name: 'fabricIssued', label: 'Fabric Issued (kgs)', type: 'number', required: true, colSpan: 1 },
    { name: 'totalPcs', label: 'Total Pcs', type: 'number', required: true, colSpan: 1 },
    { name: 'markerLength', label: 'Marker Length', type: 'number', colSpan: 1 },
    { name: 'noOfPlies', label: 'No. of Plies', type: 'number', colSpan: 1 },
    { name: 'efficiency', label: 'Efficiency (%)', type: 'number', colSpan: 1 },
    { name: 'cutDate', label: 'Cut Date', type: 'date', colSpan: 1 },
  ],
  listColumns: [
    { name: 'cutNo', label: 'Cut No' },
    { name: 'orderNo', label: 'Order' },
    { name: 'cutDate', label: 'Date' },
    { name: 'fabricIssued', label: 'Fabric (kgs)', align: 'right' },
    { name: 'totalPcs', label: 'Pcs', align: 'right' },
    { name: 'bundles', label: 'Bundles', align: 'right' },
    { name: 'efficiency', label: 'Eff %', align: 'right' },
    { name: 'status', label: 'Status' },
  ],
  recentCount: 20,
  agentTools: ['create_cut_order', 'list_cut_orders'],
}
