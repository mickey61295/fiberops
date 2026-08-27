/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M5 §7-B rows 15-17 — the RejectionEntry-family VARIANT configs (§4
// pattern: configs wrap planRejection injecting action/rejType; the base
// REJECTION_SCHEMA already carries both keys OPTIONAL — no schema forks, the
// post_rejection tool stays byte-identical, NO new tools per §7-B).
//   panel-rej-rework       (/cutting/panel-rework)  — frmPanelRej /
//     frmPanelDelRework: action='rework' (document-only — panels re-sewn).
//   fabric-rejection-return (/cutting/fab-rejection) — FrmCutting_FabRej:
//     action='return_to_party' + rejType='fabric' (stock OUT of G2).
//   pcs-shortage           (/pieces/shortage)       — frmPcsShort / frmShortage:
//     rejType='shortage' (missing pcs written off at despatch/packing).
// Views reuse /pieces/rejection/[id] (a variant IS a RejectionEntry).
import type { DocConfig } from './types'
import { REJECTION_SCHEMA } from '../schemas/rejection'
import { planRejection } from '../posting/rejection'

export const panelRejReworkConfig: DocConfig = {
  docType: 'panel-rej-rework',
  slug: 'panel-rej-rework',
  title: 'Panel Rejection / Rework',
  numberPrefix: 'REJ-',
  numberField: 'rejNo',
  chainStage: 11,
  schema: REJECTION_SCHEMA,
  service: {
    plan: (input: any) =>
      planRejection({ ...input, action: 'rework' } as Parameters<typeof planRejection>[0]),
  },
  headerFields: [
    { name: 'rejNo', label: 'Rej No', type: 'text', colSpan: 1 },
    { name: 'orderNo', label: 'Order No', type: 'text', required: true, colSpan: 1 },
    { name: 'deptCode', label: 'Department (D3 Cutting default)', type: 'picker', picker: 'department', colSpan: 1 },
    { name: 'qty', label: 'Rejected Panel Qty', type: 'number', required: true, colSpan: 1 },
    { name: 'rejType', label: 'Fault Type', type: 'select', colSpan: 1, options: [
      { value: 'stitch_fault', label: 'Stitch fault' },
      { value: 'size_fault', label: 'Size fault' },
      { value: 'fabric_fault', label: 'Fabric fault' },
      { value: 'shade_fault', label: 'Shade fault' },
      { value: 'damage', label: 'Damage' },
      { value: 'other', label: 'Other' },
    ] },
    { name: 'action', label: 'Action (rework — injected)', type: 'readonly', colSpan: 1 },
    { name: 'rejDate', label: 'Rej Date', type: 'date', colSpan: 1 },
    { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
  ],
  listColumns: [
    { name: 'rejNo', label: 'Rej No' },
    { name: 'orderNo', label: 'Order' },
    { name: 'deptName', label: 'Dept' },
    { name: 'qty', label: 'Qty', align: 'right' },
    { name: 'rejType', label: 'Fault' },
    { name: 'action', label: 'Action' },
    { name: 'rejDate', label: 'Date' },
  ],
  recentCount: 20,
  agentTools: ['post_rejection'],
}

export const fabricRejectionReturnConfig: DocConfig = {
  docType: 'fabric-rejection-return',
  slug: 'fabric-rejection-return',
  title: 'Fabric Rejection Return',
  numberPrefix: 'REJ-',
  numberField: 'rejNo',
  chainStage: 11,
  schema: REJECTION_SCHEMA,
  service: {
    plan: (input: any) =>
      planRejection({
        ...input,
        rejType: 'fabric',
        action: 'return_to_party',
      } as Parameters<typeof planRejection>[0]),
  },
  headerFields: [
    { name: 'rejNo', label: 'Rej No', type: 'text', colSpan: 1 },
    { name: 'orderNo', label: 'Order No', type: 'text', required: true, colSpan: 1 },
    { name: 'qty', label: 'Rejected Pcs (fabric)', type: 'number', required: true, colSpan: 1 },
    { name: 'deptCode', label: 'Department', type: 'picker', picker: 'department', colSpan: 1 },
    { name: 'rejType', label: 'Type (fabric — injected)', type: 'readonly', colSpan: 1 },
    { name: 'action', label: 'Action (return_to_party — injected)', type: 'readonly', colSpan: 1 },
    { name: 'rejDate', label: 'Rej Date', type: 'date', colSpan: 1 },
    { name: 'notes', label: 'Notes (party / DC ref)', type: 'textarea', colSpan: 2 },
  ],
  listColumns: [
    { name: 'rejNo', label: 'Rej No' },
    { name: 'orderNo', label: 'Order' },
    { name: 'qty', label: 'Qty', align: 'right' },
    { name: 'rejType', label: 'Type' },
    { name: 'action', label: 'Action' },
    { name: 'rejDate', label: 'Date' },
  ],
  recentCount: 20,
  agentTools: ['post_rejection'],
}

export const pcsShortageConfig: DocConfig = {
  docType: 'pcs-shortage',
  slug: 'pcs-shortage',
  title: 'Pcs Shortage',
  numberPrefix: 'REJ-',
  numberField: 'rejNo',
  schema: REJECTION_SCHEMA,
  service: {
    plan: (input: any) =>
      planRejection({ ...input, rejType: 'shortage' } as Parameters<typeof planRejection>[0]),
  },
  headerFields: [
    { name: 'rejNo', label: 'Shortage No', type: 'text', colSpan: 1 },
    { name: 'orderNo', label: 'Order No', type: 'text', required: true, colSpan: 1 },
    { name: 'qty', label: 'Shortage Qty (missing pcs)', type: 'number', required: true, colSpan: 1 },
    { name: 'deptCode', label: 'Department', type: 'picker', picker: 'department', colSpan: 1 },
    { name: 'rejType', label: 'Type (shortage — injected)', type: 'readonly', colSpan: 1 },
    { name: 'action', label: 'Action (scrap — write-off)', type: 'readonly', colSpan: 1 },
    { name: 'rejDate', label: 'Found Date', type: 'date', colSpan: 1 },
    { name: 'notes', label: 'Notes (where found / suspected cause)', type: 'textarea', colSpan: 2 },
  ],
  listColumns: [
    { name: 'rejNo', label: 'Shortage No' },
    { name: 'orderNo', label: 'Order' },
    { name: 'qty', label: 'Missing', align: 'right' },
    { name: 'rejType', label: 'Type' },
    { name: 'action', label: 'Action' },
    { name: 'rejDate', label: 'Date' },
  ],
  recentCount: 20,
  agentTools: ['post_rejection'],
}
