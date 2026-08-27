// SPEC-M3 §8 row 20 — Godown Transfer + Ack (/inventory/transfer, item
// 'godown-transfer', legacy FrmStkTransfer, FrmChangeGodown, FrmGoDownAck,
// FrmGodownTransferAck). Fields mirror TRANSFER_SCHEMA exactly (the NEW Wave D
// tool). ERRATUM 6 (Wave D): itemCode's picker slug comes from the itemType
// header cell. Ledger: godown_transfer_out + godown_transfer_in (one pair,
// one GT-#### doc no). No [id] view — the ledger rows ARE the record (recent
// table lists transfers with both legs).
import type { DocConfig } from './types'
import { TRANSFER_SCHEMA } from '../schemas/transfer'
import { planTransfer } from '../posting/transfer'

export const godownTransferConfig: DocConfig = {
  docType: 'godown-transfer',
  slug: 'godown-transfer',
  title: 'Godown Transfer',
  numberPrefix: 'GT-',
  numberField: 'docNo',
  schema: TRANSFER_SCHEMA,
  service: { plan: (input: unknown) => planTransfer(input as Parameters<typeof planTransfer>[0]) },
  headerFields: [
    { name: 'docNo', label: 'Transfer No', type: 'text', colSpan: 1 },
    { name: 'itemType', label: 'Item Type', type: 'select', required: true, colSpan: 1, options: [
      { value: 'yarn', label: 'Yarn (kgs)' },
      { value: 'fabric', label: 'Fabric (kgs)' },
      { value: 'accessory', label: 'Accessory (pcs)' },
    ] },
    { name: 'itemCode', label: 'Item', type: 'picker', pickerFrom: 'itemType', required: true, colSpan: 1 },
    { name: 'qty', label: 'Qty (kgs / pcs)', type: 'number', required: true, colSpan: 1 },
    { name: 'fromGodownCode', label: 'From Godown', type: 'picker', picker: 'godown', required: true, colSpan: 1 },
    { name: 'toGodownCode', label: 'To Godown', type: 'picker', picker: 'godown', required: true, colSpan: 1 },
    { name: 'transferDate', label: 'Transfer Date', type: 'date', colSpan: 1 },
    { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
  ],
  listColumns: [
    { name: 'docNo', label: 'Transfer No' },
    { name: 'itemType', label: 'Type' },
    { name: 'itemCode', label: 'Item' },
    { name: 'route', label: 'From → To' },
    { name: 'qty', label: 'Qty', align: 'right' },
    { name: 'docDate', label: 'Date' },
  ],
  recentCount: 20,
  agentTools: ['transfer_stock'],
}
