/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M6 §7-D-1 (Wave D) — the inventory VARIANT configs.
//   opening-stock (/inventory/opening-stock) — OPN-#### space, action='add'
//     fixed, reason='Opening stock' (planOpeningStock wraps the VERBATIM
//     planStockAdjustment — the §4 recipe verbatim).
import type { DocConfig } from './types'
import { OPENING_STOCK_SCHEMA, WASTE_RECEIPT_SCHEMA } from '../schemas/stock-adj'
import { planOpeningStock, planWasteReceipt } from '../posting/stock-adj'

export const openingStockConfig: DocConfig = {
  docType: 'opening-stock',
  slug: 'opening-stock',
  title: 'Opening Stock',
  numberPrefix: 'OPN-',
  numberField: 'docNo',
  schema: OPENING_STOCK_SCHEMA,
  service: { plan: (input: any) => planOpeningStock(input) },
  headerFields: [
    { name: 'docNo', label: 'OPN No', type: 'text', colSpan: 1 },
    { name: 'godownCode', label: 'Godown', type: 'picker', picker: 'godown', required: true, colSpan: 1 },
    { name: 'itemType', label: 'Material', type: 'select', options: [
      { value: 'yarn', label: 'Yarn' }, { value: 'fabric', label: 'Fabric' }, { value: 'accessory', label: 'Accessory' },
    ], required: true, colSpan: 1 },
    { name: 'itemCode', label: 'Item', type: 'picker', pickerFrom: 'itemType', required: true, colSpan: 1 },
    { name: 'qty', label: 'Qty (kgs / pcs)', type: 'number', required: true, colSpan: 1 },
    { name: 'adjDate', label: 'As-on Date', type: 'date', colSpan: 1 },
    { name: 'action', label: 'Action', type: 'readonly', colSpan: 1 },
    { name: 'reason', label: 'Reason', type: 'readonly', colSpan: 2 },
  ],
  listColumns: [
    { name: 'docNo', label: 'OPN No' },
    { name: 'itemType', label: 'Type' },
    { name: 'itemCode', label: 'Item' },
    { name: 'godownName', label: 'Godown' },
    { name: 'qty', label: 'Qty', align: 'right' },
    { name: 'docDate', label: 'Date' },
  ],
  recentCount: 20,
  agentTools: ['post_opening'],
}

// SPEC-M21 — Waste Receipt (/inventory/waste-receipt, legacy
// FrmWasteReceiptEntry). stock-adj VARIANT: WST-#### space, action='add'
// fixed, reason composed `Waste — <class>` (the wrapper injects). NO [id]
// view — the StockLedger rows ARE the record (the stock-adjustment
// deviation pattern).
export const wasteReceiptConfig: DocConfig = {
  docType: 'waste-receipt',
  slug: 'waste-receipt',
  title: 'Waste Receipt',
  numberPrefix: 'WST-',
  numberField: 'docNo',
  schema: WASTE_RECEIPT_SCHEMA,
  service: { plan: (input: any) => planWasteReceipt(input) },
  headerFields: [
    { name: 'docNo', label: 'WST No', type: 'text', colSpan: 1 },
    { name: 'godownCode', label: 'Godown', type: 'picker', picker: 'godown', required: true, colSpan: 1 },
    { name: 'itemType', label: 'Material', type: 'select', options: [
      { value: 'yarn', label: 'Yarn' }, { value: 'fabric', label: 'Fabric' }, { value: 'accessory', label: 'Accessory' },
    ], required: true, colSpan: 1 },
    { name: 'itemCode', label: 'Item', type: 'picker', pickerFrom: 'itemType', required: true, colSpan: 1 },
    { name: 'qty', label: 'Qty (kgs / pcs)', type: 'number', required: true, colSpan: 1 },
    { name: 'wasteClass', label: 'Waste class', type: 'select', required: true, colSpan: 1, options: [
      { value: 'knitting', label: 'Knitting waste' },
      { value: 'dyeing', label: 'Dyeing waste' },
      { value: 'cutting', label: 'Cutting waste (chindi)' },
      { value: 'packing', label: 'Packing waste' },
      { value: 'general', label: 'General scrap' },
    ] },
    { name: 'adjDate', label: 'Receipt Date', type: 'date', colSpan: 1 },
    { name: 'notes', label: 'Notes (appended to reason)', type: 'text', colSpan: 2 },
    { name: 'action', label: 'Action', type: 'readonly', colSpan: 1 },
    { name: 'reason', label: 'Reason', type: 'readonly', colSpan: 2 },
  ],
  listColumns: [
    { name: 'docNo', label: 'WST No' },
    { name: 'itemType', label: 'Type' },
    { name: 'itemCode', label: 'Item' },
    { name: 'godownName', label: 'Godown' },
    { name: 'qty', label: 'Qty', align: 'right' },
    { name: 'wasteClass', label: 'Waste class' },
    { name: 'docDate', label: 'Date' },
  ],
  recentCount: 20,
  agentTools: ['receive_waste'],
}
