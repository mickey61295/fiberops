import type { RegisterConfig } from './types'

/** /inventory/io-history — SPEC-M4 §7 row 8 (FrmIoHistoryReg family). */
export const ioHistoryConfig: RegisterConfig = {
  slug: 'io-history',
  title: 'IO History',
  description: 'In/out history per item or party with a running balance (chronological).',
  filters: [
    { key: 'from', label: 'From', type: 'dateRange' },
    { key: 'to', label: 'To', type: 'dateRange' },
    {
      key: 'itemType',
      label: 'Item type',
      type: 'itemType',
      options: [
        { value: 'yarn', label: 'Yarn' },
        { value: 'fabric', label: 'Fabric' },
        { value: 'accessory', label: 'Accessory' },
        { value: 'pcs', label: 'Pcs' },
      ],
    },
    { key: 'q', label: 'Item / party', type: 'text', placeholder: 'item code or party' },
  ],
  columns: [
    { name: 'docDate', label: 'Date', format: 'date' },
    { name: 'txnType', label: 'Txn', format: 'badge' },
    { name: 'docNo', label: 'Doc No', mono: true },
    { name: 'itemCode', label: 'Item', mono: true },
    { name: 'godown', label: 'Godown' },
    { name: 'party', label: 'Party' },
    { name: 'inKgs', label: 'In kgs', align: 'right', format: 'qty' },
    { name: 'outKgs', label: 'Out kgs', align: 'right', format: 'qty' },
    { name: 'balKgs', label: 'Bal kgs', align: 'right', format: 'qty' },
    { name: 'inMtrs', label: 'In mtrs', align: 'right', format: 'qty' },
    { name: 'outMtrs', label: 'Out mtrs', align: 'right', format: 'qty' },
    { name: 'balMtrs', label: 'Bal mtrs', align: 'right', format: 'qty' },
    { name: 'inPcs', label: 'In pcs', align: 'right', format: 'int' },
    { name: 'outPcs', label: 'Out pcs', align: 'right', format: 'int' },
    { name: 'balPcs', label: 'Bal pcs', align: 'right', format: 'int' },
  ],
  agentTools: ['list_io_history'],
  askPrompt: 'Show me the in/out history for an item or party',
  emptyMessage: 'No movements for these filters.',
}
