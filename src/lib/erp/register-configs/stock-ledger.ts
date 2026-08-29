import type { RegisterConfig } from './types'

/** /inventory/ledger — SPEC-M4 §7 row 5 (FrmStockLedger, Vue_StkLedger). */
export const stockLedgerConfig: RegisterConfig = {
  slug: 'stock-ledger',
  title: 'Stock Ledger',
  description: 'Every stock movement — the source of truth — with per-uom in/out columns.',
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
    { name: 'txnType', label: 'Txn', format: 'badge' },
    { name: 'docNo', label: 'Doc No', mono: true },
    { name: 'itemCode', label: 'Item', mono: true },
    { name: 'itemType', label: 'Type' },
    { name: 'godown', label: 'Godown' },
    { name: 'party', label: 'Party' },
    { name: 'inKgs', label: 'In kgs', align: 'right', format: 'qty' },
    { name: 'outKgs', label: 'Out kgs', align: 'right', format: 'qty' },
    { name: 'inMtrs', label: 'In mtrs', align: 'right', format: 'qty' },
    { name: 'outMtrs', label: 'Out mtrs', align: 'right', format: 'qty' },
    { name: 'inPcs', label: 'In pcs', align: 'right', format: 'int' },
    { name: 'outPcs', label: 'Out pcs', align: 'right', format: 'int' },
    { name: 'rate', label: 'Rate', align: 'right', format: 'qty' },
  ],
  agentTools: ['get_stock_ledger'],
  askPrompt: 'Show me the stock ledger',
  emptyMessage: 'No ledger entries for these filters yet.',
  // SPEC-M19 §4 Wave D — counter-book grouped mode (audit §7-C)
  counterBook: { groupBy: 'docDate' },
}
