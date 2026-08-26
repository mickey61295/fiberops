// SPEC-M3 §8 row 12 — Pcs Rejection (/pieces/rejection, item 'pcs-rejection',
// legacy FrmPcsRejection, PanelRej). Fields mirror REJECTION_SCHEMA exactly.
// Chain step 11 of 15 (shared with rework — the defects stage).
// Ledger: rejection_out pcs OUT of G2 for scrap/return_to_party; the 'rework'
// action is document-only (pieces stay in WIP).
import type { DocConfig } from './types'
import { REJECTION_SCHEMA } from '../schemas/rejection'
import { planRejection } from '../posting/rejection'

export const rejectionConfig: DocConfig = {
  docType: 'rejection',
  slug: 'rejection',
  title: 'Pcs Rejection',
  numberPrefix: 'REJ-',
  numberField: 'rejNo',
  chainStage: 11,
  schema: REJECTION_SCHEMA,
  service: { plan: (input: unknown) => planRejection(input as Parameters<typeof planRejection>[0]) },
  headerFields: [
    { name: 'rejNo', label: 'Rej No', type: 'text', colSpan: 1 },
    { name: 'orderNo', label: 'Order No', type: 'text', required: true, colSpan: 1 },
    { name: 'qty', label: 'Qty (pcs)', type: 'number', required: true, colSpan: 1 },
    { name: 'rejType', label: 'Rej Type', type: 'select', colSpan: 1, options: [
      { value: 'stitch_fault', label: 'Stitch fault' },
      { value: 'fabric_fault', label: 'Fabric fault' },
      { value: 'measurement_fault', label: 'Measurement fault' },
      { value: 'colour_mismatch', label: 'Colour mismatch' },
      { value: 'damage', label: 'Damage' },
      { value: 'other', label: 'Other' },
    ] },
    { name: 'action', label: 'Action', type: 'select', colSpan: 1, options: [
      { value: 'scrap', label: 'Scrap (G2 out)' },
      { value: 'return_to_party', label: 'Return to party (G2 out)' },
      { value: 'rework', label: 'Rework (WIP — no stock move)' },
    ] },
    { name: 'deptCode', label: 'Department', type: 'picker', picker: 'department', colSpan: 1 },
    { name: 'rejDate', label: 'Rej Date', type: 'date', colSpan: 1 },
    { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
  ],
  listColumns: [
    { name: 'rejNo', label: 'Rej No' },
    { name: 'orderNo', label: 'Order' },
    { name: 'qty', label: 'Qty (pcs)', align: 'right' },
    { name: 'rejType', label: 'Type' },
    { name: 'action', label: 'Action' },
    { name: 'rejDate', label: 'Date' },
  ],
  recentCount: 20,
  agentTools: ['post_rejection'],
}
