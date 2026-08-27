/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M5 §7-B-12 — panel-cutting VARIANT config (§4 pattern: pure variant
// over planCutOrder — the "panel type" rides the labels + this dedicated
// screen (frmAddPanelCutting); the CutOrder family numbers stay CUT-#### and
// the create_cut_order tool is the agent door. Views reuse
// /cutting/job-order/[id]. Zero engine changes, NO service fork.
import type { DocConfig } from './types'
import { CUT_ORDER_SCHEMA } from '../schemas/cut'
import { planCutOrder } from '../posting/cut'

export const panelCuttingConfig: DocConfig = {
  docType: 'panel-cutting',
  slug: 'panel-cutting',
  title: 'Panel Cutting / Add',
  numberPrefix: 'CUT-',
  numberField: 'cutNo',
  chainStage: 8,
  schema: CUT_ORDER_SCHEMA,
  service: { plan: (input: unknown) => planCutOrder(input as Parameters<typeof planCutOrder>[0]) },
  headerFields: [
    { name: 'cutNo', label: 'Cut No', type: 'text', colSpan: 1 },
    { name: 'orderNo', label: 'Order No', type: 'text', required: true, colSpan: 1 },
    { name: 'fabricIssued', label: 'Panel Fabric Issued (kgs)', type: 'number', required: true, colSpan: 1 },
    { name: 'totalPcs', label: 'Panel Pcs (of size set)', type: 'number', required: true, colSpan: 1 },
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
    { name: 'totalPcs', label: 'Panels', align: 'right' },
    { name: 'bundles', label: 'Bundles', align: 'right' },
    { name: 'status', label: 'Status' },
  ],
  recentCount: 20,
  agentTools: ['create_cut_order', 'list_cut_orders'],
}
