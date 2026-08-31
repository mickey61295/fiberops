// SPEC-M3 §8 rows 6-7 — Jobwork out/in (/jobwork/order + /jobwork/receipt,
// items 'jobwork-order'/'jobwork-receipt', legacy FrmJobworkOrder family +
// FrmJobwrkRecv). M39 (Phase-6B Batch 3, JWL): the out door gains the
// MATERIAL lines matrix (stock posts + ITC-04 + G3 WIP), godownCode +
// allotmentNo; the in door gains rejectedQty (process-loss door).
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

const jwLineFields = [
  { name: 'itemType', label: 'Type', type: 'select' as const, options: [
    { value: 'yarn', label: 'Yarn' }, { value: 'fabric', label: 'Fabric' }, { value: 'accessory', label: 'Accessory' },
  ] },
  { name: 'itemCode', label: 'Item', type: 'picker' as const, pickerFrom: 'itemType' },
  { name: 'qty', label: 'Qty', type: 'number' as const, required: true },
  { name: 'rate', label: 'Rate (₹)', type: 'number' as const },
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
    { name: 'godownCode', label: 'From Godown (G1 default)', type: 'picker', picker: 'godown', colSpan: 1 },
    { name: 'allotmentNo', label: 'Allotment (AL-####)', type: 'text', colSpan: 1 },
    { name: 'totalQty', label: 'Qty (header-only door)', type: 'number', colSpan: 1 },
    { name: 'totalValue', label: 'Value (₹)', type: 'number', colSpan: 1 },
    { name: 'orderNo', label: 'Order No', type: 'text', colSpan: 1 },
    { name: 'outDate', label: 'Out Date', type: 'date', colSpan: 1 },
    { name: 'expectedInDate', label: 'Expected In', type: 'date', colSpan: 1 },
  ],
  lineFields: jwLineFields as any,
  linesKey: 'lines',
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
    { name: 'receivedQty', label: 'Received Qty (cumulative)', type: 'number', colSpan: 1 },
    { name: 'rejectedQty', label: 'Rejected Qty (process loss)', type: 'number', colSpan: 1 },
    { name: 'receivedDate', label: 'Received Date', type: 'date', colSpan: 1 },
  ],
  lineFields: [
    { name: 'itemCode', label: 'Item (on the DC)', type: 'text', required: true },
    { name: 'qty', label: 'Qty received', type: 'number', required: true },
    { name: 'rejectedQty', label: 'Rejected', type: 'number' },
  ] as any,
  linesKey: 'lines',
  listColumns: [
    { name: 'dcNo', label: 'DC No' },
    { name: 'processType', label: 'Process' },
    { name: 'jobworkerName', label: 'Jobworker' },
    { name: 'totalQty', label: 'Qty', align: 'right' },
    { name: 'outDate', label: 'Out' },
    { name: 'status', label: 'Status' },
  ],
  recentCount: 20,
  agentTools: ['receive_jobwork', 'accept_jobwork_pcs', 'list_jobworks'],
}
