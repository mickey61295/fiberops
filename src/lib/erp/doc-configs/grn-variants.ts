// SPEC-M5 §7-B-18 — jobwork pcs return DocConfig (/jobwork/pcs-return, item
// 'jobwork-pcs-return', legacy frmJobWorkPcsReturn). Fields mirror
// JOBWORK_PCS_RETURN_SCHEMA exactly. GRN row (grnType='process_return') +
// StockLedger OUT of the pcs godown — views reuse /procurement/grn/[id]
// (a return IS a GRN row; §4 rule 2 keeps the shared GRN-#### space).
import type { DocConfig } from './types'
import { JOBWORK_PCS_RETURN_SCHEMA } from '../schemas/grn-variants'
import { planJobworkPcsReturn } from '../posting/grn'

export const jobworkPcsReturnConfig: DocConfig = {
  docType: 'jobwork-pcs-return',
  slug: 'jobwork-pcs-return',
  title: 'Jobwork Pcs Return',
  numberPrefix: 'GRN-',
  numberField: 'retNo',
  schema: JOBWORK_PCS_RETURN_SCHEMA,
  service: { plan: (input: unknown) => planJobworkPcsReturn(input as Parameters<typeof planJobworkPcsReturn>[0]) },
  headerFields: [
    { name: 'retNo', label: 'Return GRN No', type: 'text', colSpan: 1 },
    { name: 'partyCode', label: 'Jobworker', type: 'picker', picker: 'party', required: true, colSpan: 1 },
    { name: 'orderNo', label: 'Order No', type: 'text', required: true, colSpan: 1 },
    { name: 'qty', label: 'Returned Pcs', type: 'number', required: true, colSpan: 1 },
    { name: 'godownCode', label: 'From Godown (G2 default)', type: 'picker', picker: 'godown', colSpan: 1 },
    { name: 'retDate', label: 'Return Date', type: 'date', colSpan: 1 },
    { name: 'reason', label: 'Reason (rework / damage / …)', type: 'textarea', colSpan: 2 },
  ],
  listColumns: [
    { name: 'grnNo', label: 'Return No' },
    { name: 'partyName', label: 'Jobworker' },
    { name: 'totalQty', label: 'Pcs', align: 'right' },
    { name: 'grnType', label: 'Type' },
    { name: 'grnDate', label: 'Date' },
  ],
  recentCount: 20,
  agentTools: ['return_jobwork_pcs'],
}

// ───────── SPEC-M6 §7-D-1 (Wave D) — the two GRN-family variants ─────────
/* eslint-disable @typescript-eslint/no-explicit-any */
import { MULTI_PROCESS_GRN_SCHEMA, DC_RETURN_SCHEMA } from '../schemas/grn-variants'
import { planMultiProcessGrn, planDcReturn } from '../posting/grn'

const variantLineFields = [
  { name: 'itemType', label: 'Type', type: 'select' as const, options: [
    { value: 'yarn', label: 'Yarn' }, { value: 'fabric', label: 'Fabric' }, { value: 'accessory', label: 'Accessory' },
  ] },
  { name: 'itemCode', label: 'Item', type: 'picker' as const, pickerFrom: 'itemType' },
  { name: 'qty', label: 'Qty', type: 'number' as const, required: true },
  { name: 'rate', label: 'Rate (₹)', type: 'number' as const },
]

export const multiProcessGrnConfig: DocConfig = {
  docType: 'multi-process-grn',
  slug: 'multi-process-grn',
  title: 'Multi-Process GRN',
  numberPrefix: 'MP-',
  numberField: 'grnNo',
  schema: MULTI_PROCESS_GRN_SCHEMA,
  service: { plan: (input: unknown) => planMultiProcessGrn(input as Parameters<typeof planMultiProcessGrn>[0]) },
  headerFields: [
    { name: 'grnNo', label: 'GRN No', type: 'text', colSpan: 1 },
    { name: 'partyCode', label: 'Processor (party)', type: 'picker', picker: 'party', required: true, colSpan: 1 },
    { name: 'godownCode', label: 'From Godown (G1 default)', type: 'picker', picker: 'godown', colSpan: 1 },
    { name: 'grnDate', label: 'GRN Date', type: 'date', colSpan: 1 },
    { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
  ],
  lineFields: variantLineFields as any,
  linesKey: 'lines',
  listColumns: [
    { name: 'grnNo', label: 'GRN No' },
    { name: 'partyName', label: 'Processor' },
    { name: 'totalQty', label: 'Qty', align: 'right' },
    { name: 'totalValue', label: 'Value (₹)', align: 'right' },
    { name: 'grnType', label: 'Type' },
    { name: 'grnDate', label: 'Date' },
  ],
  recentCount: 20,
  // Frozen mechanism row 19: the agent door named on the screen is
  // receive_grn (ERRATUM: it cannot emit MP- rows — PO-based single-line; the
  // form door below is the MP path).
  agentTools: ['receive_grn'],
}

export const dcReturnConfig: DocConfig = {
  docType: 'dc-return',
  slug: 'dc-return',
  title: 'DC Return',
  numberPrefix: 'RTN-',
  numberField: 'grnNo',
  schema: DC_RETURN_SCHEMA,
  service: { plan: (input: unknown) => planDcReturn(input as Parameters<typeof planDcReturn>[0]) },
  headerFields: [
    { name: 'grnNo', label: 'Return No', type: 'text', colSpan: 1 },
    { name: 'partyCode', label: 'Party (returns from)', type: 'picker', picker: 'party', required: true, colSpan: 1 },
    { name: 'dcNo', label: 'Against DC No', type: 'text', required: true, colSpan: 1 },
    { name: 'godownCode', label: 'Into Godown (G1 default)', type: 'picker', picker: 'godown', colSpan: 1 },
    { name: 'grnDate', label: 'Return Date', type: 'date', colSpan: 1 },
    { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
  ],
  lineFields: variantLineFields as any,
  linesKey: 'lines',
  listColumns: [
    { name: 'grnNo', label: 'Return No' },
    { name: 'docNo', label: 'Against DC' },
    { name: 'partyName', label: 'Party' },
    { name: 'totalQty', label: 'Qty', align: 'right' },
    { name: 'grnDate', label: 'Date' },
  ],
  recentCount: 20,
  // Frozen mechanism row 32: agent door named = receive_grn (ERRATUM: the RTN
  // path is the form door below; receive_grn cannot reference a DC).
  agentTools: ['receive_grn'],
}
