// SPEC-M3 §8 rows 6-7 — Jobwork out/in (/jobwork/order + /jobwork/receipt,
// items 'jobwork-order'/'jobwork-receipt', legacy FrmJobworkOrder family +
// FrmJobwrkRecv). Fields mirror JOBWORK_OUT_SCHEMA / JOBWORK_IN_SCHEMA exactly.
// Chain steps 6/7. Document-only today (process_delivery/receipt ledger moves
// are a Wave-D upgrade target — preserved service behaviour).
// jobwork-IN has NO number prefix: dcNo references the EXISTING DC (ERRATUM 4).
import type { DocConfig } from './types'
import { JOBWORK_OUT_SCHEMA, JOBWORK_IN_SCHEMA } from '../schemas/jobwork'
import { planJobworkOut, planJobworkIn } from '../posting/jobwork'

const PROCESS_OPTIONS = [
  { value: 'knitting', label: 'Knitting' },
  { value: 'dyeing', label: 'Dyeing' },
  { value: 'printing', label: 'Printing' },
  { value: 'embroidery', label: 'Embroidery' },
  { value: 'washing', label: 'Washing' },
  { value: 'bleaching', label: 'Bleaching' },
  { value: 'stitching', label: 'Stitching' },
  { value: 'finishing', label: 'Finishing' },
  { value: 'other', label: 'Other' },
]

export const jobworkOutConfig: DocConfig = {
  docType: 'jobwork-out',
  slug: 'jobwork-out',
  title: 'Jobwork DC (out)',
  numberPrefix: 'JW-',
  numberField: 'dcNo',
  chainStage: 6,
  schema: JOBWORK_OUT_SCHEMA,
  service: { plan: (input: unknown) => planJobworkOut(input as Parameters<typeof planJobworkOut>[0]) },
  headerFields: [
    { name: 'dcNo', label: 'DC No', type: 'text', colSpan: 1 },
    { name: 'jobworkerCode', label: 'Jobworker', type: 'picker', picker: 'party', required: true, colSpan: 1 },
    { name: 'processType', label: 'Process', type: 'select', required: true, colSpan: 1, options: PROCESS_OPTIONS },
    { name: 'totalQty', label: 'Qty', type: 'number', required: true, colSpan: 1 },
    { name: 'totalValue', label: 'Value (₹)', type: 'number', colSpan: 1 },
    { name: 'orderNo', label: 'Order No', type: 'text', colSpan: 1 },
    { name: 'outDate', label: 'Out Date', type: 'date', colSpan: 1 },
    { name: 'expectedInDate', label: 'Expected In', type: 'date', colSpan: 1 },
  ],
  listColumns: [
    { name: 'dcNo', label: 'DC No' },
    { name: 'processType', label: 'Process' },
    { name: 'jobworkerName', label: 'Jobworker' },
    { name: 'orderNo', label: 'Order' },
    { name: 'totalQty', label: 'Qty', align: 'right' },
    { name: 'totalValue', label: 'Value (₹)', align: 'right' },
    { name: 'status', label: 'Status' },
  ],
  recentCount: 20,
  agentTools: ['create_jobwork_order', 'list_jobworks'],
}

export const jobworkInConfig: DocConfig = {
  docType: 'jobwork-in',
  slug: 'jobwork-in',
  title: 'Jobwork Receipt (in)',
  // no numberPrefix/numberField — dcNo is an EXISTING DC number (ERRATUM 4)
  chainStage: 7,
  schema: JOBWORK_IN_SCHEMA,
  service: { plan: (input: unknown) => planJobworkIn(input as Parameters<typeof planJobworkIn>[0]) },
  headerFields: [
    { name: 'dcNo', label: 'Jobwork DC No', type: 'text', required: true, colSpan: 1 },
    { name: 'receivedQty', label: 'Received Qty', type: 'number', colSpan: 1 },
    { name: 'receivedDate', label: 'Received Date', type: 'date', colSpan: 1 },
  ],
  listColumns: [
    { name: 'dcNo', label: 'DC No' },
    { name: 'processType', label: 'Process' },
    { name: 'jobworkerName', label: 'Jobworker' },
    { name: 'totalQty', label: 'Qty', align: 'right' },
    { name: 'outDate', label: 'Out' },
    { name: 'status', label: 'Status' },
  ],
  recentCount: 20,
  agentTools: ['receive_jobwork', 'list_jobworks'],
}
