// SPEC-M3 §8 row 5 — GRN Entry (/procurement/grn, item 'grn-entry', legacy
// FrmGRN_Yarn/Fab/Acc, Woven_FabGRN). Fields mirror GRN_SCHEMA exactly — the
// op is header-only (single qty against the PO's first line; the service owns
// rate/lot/uom derivation). Chain step 5 of 15.
// Ledger: purchase_grn IN + CurrentStock bucket (dept-keyed when deptCode).
import type { DocConfig } from './types'
import { GRN_SCHEMA } from '../schemas/grn'
import { planGrn } from '../posting/grn'

export const grnConfig: DocConfig = {
  docType: 'grn',
  slug: 'grn',
  title: 'GRN (Goods Receipt)',
  numberPrefix: 'GRN-',
  numberField: 'grnNo',
  chainStage: 5,
  schema: GRN_SCHEMA,
  service: { plan: (input: unknown) => planGrn(input as Parameters<typeof planGrn>[0]) },
  headerFields: [
    { name: 'grnNo', label: 'GRN No', type: 'text', colSpan: 1 },
    { name: 'poNo', label: 'PO No', type: 'text', required: true, colSpan: 1 },
    { name: 'godownCode', label: 'Godown', type: 'picker', picker: 'godown', required: true, colSpan: 1 },
    { name: 'deptCode', label: 'Department', type: 'picker', picker: 'department', colSpan: 1 },
    { name: 'receivedQty', label: 'Received Qty', type: 'number', required: true, colSpan: 1 },
    { name: 'grnDate', label: 'GRN Date', type: 'date', colSpan: 1 },
    { name: 'partyDcRef', label: 'Party DC Ref', type: 'text', colSpan: 2 },
  ],
  listColumns: [
    { name: 'grnNo', label: 'GRN No' },
    { name: 'poNo', label: 'PO' },
    { name: 'partyName', label: 'Party' },
    { name: 'godownName', label: 'Godown' },
    { name: 'totalQty', label: 'Qty', align: 'right' },
    { name: 'totalValue', label: 'Value (₹)', align: 'right' },
    { name: 'grnDate', label: 'Date' },
  ],
  recentCount: 20,
  agentTools: ['receive_grn', 'suggest_next_step'],
}
