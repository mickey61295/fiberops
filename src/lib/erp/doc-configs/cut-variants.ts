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

// ───────── SPEC-M6 §7-D-1 (Wave D) — cutting-issue + cutting-production ─────────
/* eslint-disable @typescript-eslint/no-explicit-any */
import { LINE_ISSUE_SCHEMA } from '../schemas/line-issue'
import { OPERATION_ENTRY_SCHEMA } from '../schemas/production-variants'
import { planCuttingIssue } from '../posting/line-issue'
import { planOperationEntry } from '../posting/production'

export const cuttingIssueConfig: DocConfig = {
  docType: 'cutting-issue',
  slug: 'cutting-issue',
  title: 'Cutting Issue',
  numberPrefix: 'LI-',
  numberField: 'issueNo',
  chainStage: 4,
  schema: LINE_ISSUE_SCHEMA,
  service: { plan: (input: any) => planCuttingIssue(input) },
  headerFields: [
    { name: 'issueNo', label: 'Issue No', type: 'text', colSpan: 1 },
    { name: 'orderNo', label: 'Order No', type: 'text', required: true, colSpan: 1 },
    { name: 'lineCode', label: 'Cutting Line (D3)', type: 'picker', picker: 'line', required: true, colSpan: 1 },
    { name: 'qty', label: 'Rolls / Pcs', type: 'number', required: true, colSpan: 1 },
    { name: 'issueDate', label: 'Issue Date', type: 'date', colSpan: 1 },
    { name: 'styleNo', label: 'Style', type: 'picker', picker: 'style', colSpan: 1 },
    { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
  ],
  listColumns: [
    { name: 'issueNo', label: 'Issue No' },
    { name: 'orderNo', label: 'Order' },
    { name: 'lineCode', label: 'Line' },
    { name: 'qty', label: 'Rolls', align: 'right' },
    { name: 'issueDate', label: 'Date' },
    { name: 'status', label: 'Status' },
  ],
  recentCount: 20,
  // Frozen mechanism row 22: agent door = create_line_issue (ERRATUM: no
  // deptCode param exists — the dept rides line.deptId; this form door
  // enforces the cutting dept).
  agentTools: ['create_line_issue'],
}

export const cuttingProductionConfig: DocConfig = {
  docType: 'cutting-production',
  slug: 'cutting-production',
  title: 'Cutting Production',
  // §2 row 24: chainStage 4 (the cutting-dept output door)
  chainStage: 4,
  schema: OPERATION_ENTRY_SCHEMA,
  service: {
    plan: (input: any) =>
      planOperationEntry({
        ...input,
        deptCode: input?.deptCode ?? 'D3',
      } as Parameters<typeof planOperationEntry>[0]),
  },
  headerFields: [
    { name: 'orderNo', label: 'Order No', type: 'text', required: true, colSpan: 1 },
    { name: 'deptCode', label: 'Department (D3 Cutting default)', type: 'picker', picker: 'department', colSpan: 1 },
    { name: 'prodDate', label: 'Prod Date', type: 'date', required: true, colSpan: 1 },
    { name: 'bundleNo', label: 'Bundle / Panel Ref', type: 'text', required: true, colSpan: 1 },
    { name: 'operatorCode', label: 'Operator', type: 'picker', picker: 'employee', required: true, colSpan: 1 },
    { name: 'qty', label: 'Cut Pcs', type: 'number', required: true, colSpan: 1 },
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
    { name: 'qty', label: 'Cut Pcs', align: 'right' },
    { name: 'amount', label: 'Amount (₹)', align: 'right' },
  ],
  recentCount: 20,
  agentTools: ['post_production_entry'],
}
