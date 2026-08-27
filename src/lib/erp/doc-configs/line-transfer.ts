// SPEC-M5 §7-B-11 — line transfer DocConfig (/production/line-transfer, item
// 'line-transfer', legacy Trs_LineTfr). Fields mirror LINE_TRANSFER_SCHEMA
// exactly. LT-#### shared ref: the service writes TWO LineIssue rows (-O out /
// -I in) in one transaction — no godown stock moves (pieces stay in line WIP).
// Views: the recent list links each transfer's IN row → /production/issue/[id].
import type { DocConfig } from './types'
import { LINE_TRANSFER_SCHEMA } from '../schemas/line-transfer'
import { planLineTransfer } from '../posting/line-transfer'

export const lineTransferConfig: DocConfig = {
  docType: 'line-transfer',
  slug: 'line-transfer',
  title: 'Line Transfer',
  numberPrefix: 'LT-',
  numberField: 'refNo',
  chainStage: 9,
  schema: LINE_TRANSFER_SCHEMA,
  service: { plan: (input: unknown) => planLineTransfer(input as Parameters<typeof planLineTransfer>[0]) },
  headerFields: [
    { name: 'refNo', label: 'Transfer Ref', type: 'text', colSpan: 1 },
    { name: 'orderNo', label: 'Order No', type: 'text', required: true, colSpan: 1 },
    { name: 'fromLineCode', label: 'From Line', type: 'picker', picker: 'line', required: true, colSpan: 1 },
    { name: 'toLineCode', label: 'To Line', type: 'picker', picker: 'line', required: true, colSpan: 1 },
    { name: 'qty', label: 'Qty (pcs)', type: 'number', required: true, colSpan: 1 },
    { name: 'transferDate', label: 'Transfer Date', type: 'date', colSpan: 1 },
    { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
  ],
  listColumns: [
    { name: 'issueNo', label: 'Ref / Rows' },
    { name: 'orderNo', label: 'Order' },
    { name: 'fromLine', label: 'From' },
    { name: 'toLine', label: 'To' },
    { name: 'qty', label: 'Qty', align: 'right' },
    { name: 'issueDate', label: 'Date' },
  ],
  recentCount: 20,
  agentTools: ['transfer_line_stock'],
}
