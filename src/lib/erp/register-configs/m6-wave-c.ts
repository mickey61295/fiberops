/**
 * SPEC-M6 §7-C-2/3 — the two Wave C register configs (program-status +
 * current-stock). Pure data like every register config.
 */
import type { RegisterConfig } from './types'

export const programStatusConfig: RegisterConfig = {
  slug: 'program-status',
  title: 'Program Status',
  description: 'Program balances: required vs achieved per order — the operator\u2019s compass.',
  filters: [
    { key: 'order', label: 'Order', type: 'order', placeholder: 'SO-1001' },
    { key: 'status', label: 'Status', type: 'select', options: [
      { value: 'open', label: 'Open' }, { value: 'in_progress', label: 'In Progress' },
      { value: 'completed', label: 'Completed' }, { value: 'cancelled', label: 'Cancelled' },
    ] },
  ],
  columns: [
    { name: 'programNo', label: 'Program', mono: true },
    { name: 'orderNo', label: 'Order', mono: true },
    { name: 'buyer', label: 'Buyer' },
    { name: 'stage', label: 'Stage' },
    { name: 'dept', label: 'Dept' },
    { name: 'item', label: 'Item', mono: true },
    { name: 'requiredKgs', label: 'Required', align: 'right', format: 'qty' },
    // SPEC-M43 PRG-04 — the nine-column waterfall legs (read model, ADR-002):
    // PO'd (POLine sums) → DC'd (process_delivery out) → GRN'd
    // (process_receipt + purchase_grn in) → Finished (process_receipt only).
    { name: 'poKgs', label: "PO'd", align: 'right', format: 'qty' },
    { name: 'dcKgs', label: "DC'd", align: 'right', format: 'qty' },
    { name: 'grnKgs', label: "GRN'd", align: 'right', format: 'qty' },
    { name: 'finishedKgs', label: 'Finished', align: 'right', format: 'qty' },
    { name: 'actualKgs', label: 'Actual', align: 'right', format: 'qty' },
    { name: 'balanceKgs', label: 'Balance', align: 'right', format: 'qty' },
    { name: 'status', label: 'Status', format: 'badge' },
    { name: 'targetDate', label: 'Target', format: 'date' },
  ],
  agentTools: ['get_program_status'],
  askPrompt: 'Show me program status with balances',
  emptyMessage: 'No programs yet — create programs from an order first.',
}

export const currentStockConfig: RegisterConfig = {
  slug: 'current-stock',
  title: 'Current Stock',
  description: 'Live current stock by item and godown — yarn, fabric, accessories, pieces.',
  filters: [
    { key: 'itemType', label: 'Item Type', type: 'itemType', options: [
      { value: 'yarn', label: 'Yarn' }, { value: 'fabric', label: 'Fabric' },
      { value: 'accessory', label: 'Accessory' }, { value: 'pcs', label: 'Pcs' },
    ] },
    { key: 'godown', label: 'Godown', type: 'godown', placeholder: 'Godown code' },
  ],
  columns: [
    { name: 'itemType', label: 'Type' },
    { name: 'itemCode', label: 'Item', mono: true },
    { name: 'godown', label: 'Godown' },
    { name: 'bags', label: 'Bags', align: 'right', format: 'qty' },
    { name: 'kgs', label: 'Kgs', align: 'right', format: 'qty' },
    { name: 'mtrs', label: 'Mtrs', align: 'right', format: 'qty' },
    { name: 'pcs', label: 'Pcs', align: 'right', format: 'int' },
    { name: 'rate', label: 'Rate', align: 'right', format: 'qty' },
    { name: 'value', label: 'Value', align: 'right', format: 'inr' },
  ],
  agentTools: ['get_stock'],
  askPrompt: 'Show me current stock by item and godown',
  emptyMessage: 'No stock rows match the filters.',
}
