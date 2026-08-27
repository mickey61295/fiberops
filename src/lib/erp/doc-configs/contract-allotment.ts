/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M5 §7-D-35 — Contract Allotment (/jobwork/contract, item
// 'contract-allotment'). AL-#### placeholder dcNo; JobworkOrder with
// status='allotted' — NO material leaves (the §7-D-35 pre-DC record).
// allot_contract is the agent door; the JW-#### DC is issued later via
// create_jobwork_order.
import type { DocConfig } from './types'
import { CONTRACT_ALLOTMENT_SCHEMA } from '../schemas/contract-allotment'
import { planContractAllotment } from '../posting/contract-allotment'

export const contractAllotmentConfig: DocConfig = {
  docType: 'contract-allotment',
  slug: 'contract-allotment',
  title: 'Contract Allotment',
  // ERRATUM 4 pattern: the AL-#### placeholder is SYSTEM-assigned (no input
  // field — the schema has no dcNo), so no numberPrefix/numberField pair.
  numberPrefix: undefined,
  numberField: undefined,
  chainStage: 6, // jobwork-DC-out stage — the allotment precedes the DC (W1 highlight)
  schema: CONTRACT_ALLOTMENT_SCHEMA,
  service: { plan: (input: any) => planContractAllotment(input) },
  headerFields: [
    { name: 'jobworkerCode', label: 'Jobworker', type: 'picker', picker: 'party', required: true, colSpan: 1 },
    { name: 'processType', label: 'Process', type: 'select', required: true, colSpan: 1, options: [
      { value: 'washing', label: 'Washing' },
      { value: 'dyeing', label: 'Dyeing' },
      { value: 'printing', label: 'Printing' },
      { value: 'embroidery', label: 'Embroidery' },
    ] },
    { name: 'totalQty', label: 'Qty', type: 'number', required: true, colSpan: 1 },
    { name: 'totalValue', label: 'Contract Value (₹)', type: 'number', colSpan: 1 },
    { name: 'orderNo', label: 'Order No', type: 'text', colSpan: 1 },
    { name: 'expectedInDate', label: 'Expected In', type: 'date', colSpan: 1 },
    { name: 'allotDate', label: 'Allot Date', type: 'date', colSpan: 1 },
    { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
  ],
  listColumns: [
    { name: 'dcNo', label: 'Allotment' },
    { name: 'jobworkerName', label: 'Jobworker' },
    { name: 'processType', label: 'Process' },
    { name: 'totalQty', label: 'Qty', align: 'right' },
    { name: 'totalValue', label: 'Value (₹)', align: 'right' },
    { name: 'status', label: 'Status' },
    { name: 'outDate', label: 'Allotted On' },
  ],
  recentCount: 20,
  agentTools: ['allot_contract', 'list_jobworks'],
}
