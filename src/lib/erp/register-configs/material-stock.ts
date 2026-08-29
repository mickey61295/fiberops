/**
 * SPEC-M19 §1-B/§1-C — the material-wise stock day-books (gap audit §1-A1,
 * "the biggest real gap": legacy operators lived in these) + the order-wise
 * pcs register. Pure data like every register config.
 *
 * The four day-books (yarn/fabric/accessory/general) ride the EXISTING
 * queryStockLedger service with `preset` itemType filters (SPEC-M19 §1-A) —
 * zero new query paths for them; itemwise/orderwise are small NEW aggregation
 * services over the SAME tables (read-side, ADR-001 compliant).
 *
 * Two-door principle: every screen cites its EXISTING agent read tool
 * (get_stock_ledger / get_stock) — the chat door for these day-books is the
 * same read path with an itemType argument. NO new tools.
 */
import type { RegisterConfig } from './types'

/** The shared ledger columns, minus the constant type column on scoped day-books. */
const ledgerColumns = (withType: boolean) => [
  ...(withType ? [{ name: 'itemType', label: 'Type' as const }] : []),
  { name: 'docDate', label: 'Date', format: 'date' as const },
  { name: 'txnType', label: 'Txn', format: 'badge' as const },
  { name: 'docNo', label: 'Doc No', mono: true },
  { name: 'itemCode', label: 'Item', mono: true },
  { name: 'godown', label: 'Godown' },
  { name: 'party', label: 'Party' },
  { name: 'inKgs', label: 'In kgs', align: 'right' as const, format: 'qty' as const },
  { name: 'outKgs', label: 'Out kgs', align: 'right' as const, format: 'qty' as const },
  { name: 'inMtrs', label: 'In mtrs', align: 'right' as const, format: 'qty' as const },
  { name: 'outMtrs', label: 'Out mtrs', align: 'right' as const, format: 'qty' as const },
  { name: 'inPcs', label: 'In pcs', align: 'right' as const, format: 'int' as const },
  { name: 'outPcs', label: 'Out pcs', align: 'right' as const, format: 'int' as const },
  { name: 'rate', label: 'Rate', align: 'right' as const, format: 'qty' as const },
]

const itemTypeOptions = [
  { value: 'yarn', label: 'Yarn' },
  { value: 'fabric', label: 'Fabric' },
  { value: 'accessory', label: 'Accessory' },
  { value: 'pcs', label: 'Pcs' },
]

/** /inventory/stock/yarn — legacy FrmYarnStockRegister (preset day-book). */
export const yarnStockConfig: RegisterConfig = {
  slug: 'yarn-stock',
  title: 'Yarn Stock Register',
  description: 'The yarn day-book — every yarn movement, in/out kgs by default.',
  filters: [
    { key: 'from', label: 'From', type: 'dateRange' },
    { key: 'to', label: 'To', type: 'dateRange' },
    { key: 'godown', label: 'Godown', type: 'godown', placeholder: 'e.g. G1' },
    { key: 'itemType', label: 'Item type', type: 'itemType', preset: 'yarn', options: itemTypeOptions },
  ],
  columns: ledgerColumns(false),
  agentTools: ['get_stock_ledger'],
  askPrompt: 'Show me the yarn stock register',
  emptyMessage: 'No yarn movements for these filters yet.',
}

/** /inventory/stock/fabric — legacy FrmFabricStockRegister (preset day-book). */
export const fabricStockConfig: RegisterConfig = {
  slug: 'fabric-stock',
  title: 'Fabric Stock Register',
  description: 'The fabric day-book — every fabric movement, in/out kgs and mtrs.',
  filters: [
    { key: 'from', label: 'From', type: 'dateRange' },
    { key: 'to', label: 'To', type: 'dateRange' },
    { key: 'godown', label: 'Godown', type: 'godown', placeholder: 'e.g. G1' },
    { key: 'itemType', label: 'Item type', type: 'itemType', preset: 'fabric', options: itemTypeOptions },
  ],
  columns: ledgerColumns(false),
  agentTools: ['get_stock_ledger'],
  askPrompt: 'Show me the fabric stock register',
  emptyMessage: 'No fabric movements for these filters yet.',
}

/** /inventory/stock/accessory — legacy FrmAccStockRegister (preset day-book). */
export const accStockConfig: RegisterConfig = {
  slug: 'acc-stock',
  title: 'Accessory Stock Register',
  description: 'The accessory day-book — trims, labels, packing material movements.',
  filters: [
    { key: 'from', label: 'From', type: 'dateRange' },
    { key: 'to', label: 'To', type: 'dateRange' },
    { key: 'godown', label: 'Godown', type: 'godown', placeholder: 'e.g. G1' },
    { key: 'itemType', label: 'Item type', type: 'itemType', preset: 'accessory', options: itemTypeOptions },
  ],
  columns: ledgerColumns(false),
  agentTools: ['get_stock_ledger'],
  askPrompt: 'Show me the accessory stock register',
  emptyMessage: 'No accessory movements for these filters yet.',
}

/** /inventory/stock/general — legacy FrmGeneralStockRegister (all-material day-book). */
export const generalStockConfig: RegisterConfig = {
  slug: 'general-stock',
  title: 'General Stock Register',
  description: 'The all-material day-book — yarn, fabric, accessory and pcs movements together.',
  filters: [
    { key: 'from', label: 'From', type: 'dateRange' },
    { key: 'to', label: 'To', type: 'dateRange' },
    { key: 'godown', label: 'Godown', type: 'godown', placeholder: 'e.g. G1' },
    { key: 'itemType', label: 'Item type', type: 'itemType', options: itemTypeOptions },
  ],
  columns: ledgerColumns(true),
  agentTools: ['get_stock_ledger'],
  askPrompt: 'Show me the general stock register',
  emptyMessage: 'No stock movements for these filters yet.',
}

/** /inventory/stock/itemwise — legacy FrmItemwiseStockRegister (per-item movement summary). */
export const itemwiseStockConfig: RegisterConfig = {
  slug: 'itemwise-stock',
  title: 'Itemwise Stock Register',
  description: 'Movements grouped per item for the period — in/out totals by uom, never mixed.',
  filters: [
    { key: 'from', label: 'From', type: 'dateRange' },
    { key: 'to', label: 'To', type: 'dateRange' },
    { key: 'godown', label: 'Godown', type: 'godown', placeholder: 'e.g. G1' },
    { key: 'itemType', label: 'Item type', type: 'itemType', options: itemTypeOptions },
    { key: 'q', label: 'Search', type: 'text', placeholder: 'item code' },
  ],
  columns: [
    { name: 'itemType', label: 'Type' },
    { name: 'itemCode', label: 'Item', mono: true },
    { name: 'txns', label: 'Txns', align: 'right', format: 'int' },
    { name: 'inBags', label: 'In bags', align: 'right', format: 'qty' },
    { name: 'outBags', label: 'Out bags', align: 'right', format: 'qty' },
    { name: 'inKgs', label: 'In kgs', align: 'right', format: 'qty' },
    { name: 'outKgs', label: 'Out kgs', align: 'right', format: 'qty' },
    { name: 'inMtrs', label: 'In mtrs', align: 'right', format: 'qty' },
    { name: 'outMtrs', label: 'Out mtrs', align: 'right', format: 'qty' },
    { name: 'inPcs', label: 'In pcs', align: 'right', format: 'int' },
    { name: 'outPcs', label: 'Out pcs', align: 'right', format: 'int' },
  ],
  agentTools: ['get_stock_ledger'],
  askPrompt: 'Show me itemwise stock movements for the period',
  emptyMessage: 'No movements for these filters yet.',
}

/** /pieces/orderwise — legacy FrmOrderwisePcsReg (pcs stock grouped by order). */
export const orderwisePcsConfig: RegisterConfig = {
  slug: 'orderwise-pcs',
  title: 'Orderwise Pcs Register',
  description: 'Finished-goods pcs grouped by order — styles, godowns, pcs and value per order.',
  filters: [
    { key: 'godown', label: 'Godown', type: 'godown', placeholder: 'e.g. G2' },
    { key: 'q', label: 'Search', type: 'text', placeholder: 'order no' },
  ],
  columns: [
    { name: 'orderNo', label: 'Order', mono: true },
    { name: 'buyer', label: 'Buyer' },
    { name: 'styles', label: 'Styles', align: 'right', format: 'int' },
    { name: 'godowns', label: 'Godowns', align: 'right', format: 'int' },
    { name: 'pcs', label: 'Pcs', align: 'right', format: 'int' },
    { name: 'value', label: 'Value', align: 'right', format: 'inr' },
  ],
  agentTools: ['get_stock'],
  askPrompt: 'Show me pcs stock grouped by order',
  emptyMessage: 'No pcs stock rows yet.',
}
