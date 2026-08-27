// SPEC-M3 §8 row 19 — Stock Adjustment (/inventory/adjustment, item
// 'stock-adjustment', legacy FabStockAdj, YarnStockAdj, AccStockAdj,
// frmStockAdjustment). Fields mirror STOCK_ADJ_SCHEMA exactly (the NEW Wave D
// tool). ERRATUM 6 (Wave D): itemCode's picker slug comes from the itemType
// header cell (yarn|fabric|accessory) — header pickerFrom.
// Ledger: stock_adjustment_add / stock_adjustment_less.
import type { DocConfig } from './types'
import { STOCK_ADJ_SCHEMA } from '../schemas/stock-adj'
import { planStockAdjustment } from '../posting/stock-adj'

export const stockAdjustmentConfig: DocConfig = {
  docType: 'stock-adjustment',
  slug: 'stock-adjustment',
  title: 'Stock Adjustment',
  numberPrefix: 'ADJ-',
  numberField: 'docNo',
  schema: STOCK_ADJ_SCHEMA,
  service: { plan: (input: unknown) => planStockAdjustment(input as Parameters<typeof planStockAdjustment>[0]) },
  headerFields: [
    { name: 'docNo', label: 'Adj No', type: 'text', colSpan: 1 },
    { name: 'godownCode', label: 'Godown', type: 'picker', picker: 'godown', required: true, colSpan: 1 },
    { name: 'itemType', label: 'Item Type', type: 'select', required: true, colSpan: 1, options: [
      { value: 'yarn', label: 'Yarn (kgs)' },
      { value: 'fabric', label: 'Fabric (kgs)' },
      { value: 'accessory', label: 'Accessory (pcs)' },
    ] },
    { name: 'itemCode', label: 'Item', type: 'picker', pickerFrom: 'itemType', required: true, colSpan: 1 },
    { name: 'qty', label: 'Qty (kgs / pcs)', type: 'number', required: true, colSpan: 1 },
    { name: 'action', label: 'Action', type: 'select', required: true, colSpan: 1, options: [
      { value: 'add', label: 'Add to stock' },
      { value: 'less', label: 'Reduce stock' },
    ] },
    { name: 'adjDate', label: 'Adj Date', type: 'date', colSpan: 1 },
    { name: 'reason', label: 'Reason (shrinkage, audit correction…)', type: 'text', required: true, colSpan: 2 },
  ],
  listColumns: [
    { name: 'docNo', label: 'Adj No' },
    { name: 'itemType', label: 'Type' },
    { name: 'itemCode', label: 'Item' },
    { name: 'godownName', label: 'Godown' },
    { name: 'qty', label: 'Qty', align: 'right' },
    { name: 'reason', label: 'Reason' },
    { name: 'docDate', label: 'Date' },
  ],
  recentCount: 20,
  agentTools: ['post_stock_adjustment'],
}
