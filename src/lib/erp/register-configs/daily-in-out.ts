import type { RegisterConfig } from './types'

/** /registers/daily-in-out — SPEC-M4 §7 row 1 (legacy frmDailyinout). */
export const dailyInOutConfig: RegisterConfig = {
  slug: 'daily-in-out',
  title: 'Daily In / Out',
  description: 'Day-book of every stock movement across godowns, with per-uom totals.',
  filters: [
    { key: 'from', label: 'From', type: 'dateRange' },
    { key: 'to', label: 'To', type: 'dateRange' },
    { key: 'godown', label: 'Godown', type: 'godown', placeholder: 'e.g. G1' },
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
  ],
  columns: [
    { name: 'docDate', label: 'Date', format: 'date' },
    { name: 'godown', label: 'Godown' },
    { name: 'txnType', label: 'Txn', format: 'badge' },
    { name: 'docNo', label: 'Doc No', mono: true },
    { name: 'itemCode', label: 'Item', mono: true },
    { name: 'party', label: 'Party' },
    { name: 'inKgs', label: 'In kgs', align: 'right', format: 'qty' },
    { name: 'outKgs', label: 'Out kgs', align: 'right', format: 'qty' },
    { name: 'inMtrs', label: 'In mtrs', align: 'right', format: 'qty' },
    { name: 'outMtrs', label: 'Out mtrs', align: 'right', format: 'qty' },
    { name: 'inPcs', label: 'In pcs', align: 'right', format: 'int' },
    { name: 'outPcs', label: 'Out pcs', align: 'right', format: 'int' },
  ],
  agentTools: ['get_daily_in_out'],
  askPrompt: 'Show me daily stock in/out',
  emptyMessage: 'No stock movements for these filters yet.',
  // SPEC-M19 §4 Wave D — counter-book grouped mode (audit §7-C)
  counterBook: { groupBy: 'docDate' },
}
