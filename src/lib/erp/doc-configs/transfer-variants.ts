/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M6 §7-D-1 (Wave D) — the transfer-family VARIANT configs.
//   pcs-transfer (/pieces/transfer) — PT-#### pcs godown transfer per order
//     (planPcsTransfer sibling: pcs buckets key itemId = the ORDER id).
//   ready-to-cut (/cutting/ready-to-cut) — RTC-#### move into the virtual
//     Cutting dept pool (planReadyToCut: ready_to_cut_out/-in pair; PITFALLS #12).
import type { DocConfig } from './types'
import { PCS_TRANSFER_SCHEMA, READY_TO_CUT_SCHEMA } from '../schemas/transfer-variants'
import { planPcsTransfer, planReadyToCut } from '../posting/transfer'

export const pcsTransferConfig: DocConfig = {
  docType: 'pcs-transfer',
  slug: 'pcs-transfer',
  title: 'Pcs Transfer',
  numberPrefix: 'PT-',
  numberField: 'docNo',
  schema: PCS_TRANSFER_SCHEMA,
  service: { plan: (input: any) => planPcsTransfer(input) },
  headerFields: [
    { name: 'docNo', label: 'PT No', type: 'text', colSpan: 1 },
    { name: 'orderNo', label: 'Order No', type: 'text', required: true, colSpan: 1 },
    { name: 'fromGodownCode', label: 'From Godown', type: 'picker', picker: 'godown', required: true, colSpan: 1 },
    { name: 'toGodownCode', label: 'To Godown', type: 'picker', picker: 'godown', required: true, colSpan: 1 },
    { name: 'qty', label: 'Pcs', type: 'number', required: true, colSpan: 1 },
    { name: 'transferDate', label: 'Transfer Date', type: 'date', colSpan: 1 },
    { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
  ],
  listColumns: [
    { name: 'docNo', label: 'PT No' },
    { name: 'orderNo', label: 'Order' },
    { name: 'from', label: 'From' },
    { name: 'to', label: 'To' },
    { name: 'qty', label: 'Pcs', align: 'right' },
    { name: 'docDate', label: 'Date' },
  ],
  recentCount: 20,
  // Frozen mechanism row 28: agent door named = transfer_stock (ERRATUM: the
  // base service rejects itemType 'pcs' — pcs stock keys on the ORDER; the
  // form door below is the PT path).
  agentTools: ['transfer_stock'],
}

export const readyToCutConfig: DocConfig = {
  docType: 'ready-to-cut',
  slug: 'ready-to-cut',
  title: 'Ready to Cut',
  numberPrefix: 'RTC-',
  numberField: 'docNo',
  schema: READY_TO_CUT_SCHEMA,
  service: { plan: (input: any) => planReadyToCut(input) },
  headerFields: [
    { name: 'docNo', label: 'RTC No', type: 'text', colSpan: 1 },
    { name: 'itemType', label: 'Material', type: 'select', options: [
      { value: 'fabric', label: 'Fabric (default)' }, { value: 'yarn', label: 'Yarn' },
    ], colSpan: 1 },
    { name: 'itemCode', label: 'Item', type: 'picker', pickerFrom: 'itemType', required: true, colSpan: 1 },
    { name: 'qty', label: 'Kgs into cutting pool', type: 'number', required: true, colSpan: 1 },
    { name: 'orderNo', label: 'Order No (program flag)', type: 'text', colSpan: 1 },
    { name: 'fromGodownCode', label: 'Store (G1 default)', type: 'picker', picker: 'godown', colSpan: 1 },
    { name: 'transferDate', label: 'Date', type: 'date', colSpan: 1 },
    { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
  ],
  listColumns: [
    { name: 'docNo', label: 'RTC No' },
    { name: 'itemCode', label: 'Item' },
    { name: 'qty', label: 'Kgs', align: 'right' },
    { name: 'dept', label: 'Pool' },
    { name: 'docDate', label: 'Date' },
  ],
  recentCount: 20,
  agentTools: ['ready_to_cut'],
}
