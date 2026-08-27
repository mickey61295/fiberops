/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M5 §7-B rows 8-10/13-14 — the ProductionEntry-family VARIANT configs
// (the §4 variant-doc pattern: configs wrap/point at the EXISTING posting
// wrappers in posting/production.ts, which delegate to planProductionEntry
// after injecting stage/dept defaults; zero engine changes, NO service forks).
//   finished-goods    (/pieces/finished-goods)  — legacy FrmFinishGoodsEntry:
//     finishing-stage (D5) production entry — the FG store intake door.
//   operation-entry   (/production/operations)  — legacy FrmOperationEntry /
//     Frm_SubProcess: sub-process entry keyed by bundleNo (D4 default).
//   bundle-barcode    (/production/bundles)     — legacy FrmBundle_ProductionEntry /
//     frmBarcodeReadingNew: scan a bundle no/barcode → prefilled entry.
//   panel-production  (/cutting/panel-production) — legacy frmProduction_CutPanel:
//     panel-dept (D3) production entries.
//   panel-excess      (/cutting/panel-excess)   — legacy FrmPanelExcessEntry:
//     excess panels vs plan — the EXCESS flag rides notes (§7-B-14).
// Views reuse /production/entry/[id] (a variant IS a ProductionEntry — the
// rework precedent, ERRATUM 4: bundleNo is the reference, no own doc number).
import type { DocConfig } from './types'
import {
  FINISHED_GOODS_SCHEMA,
  OPERATION_ENTRY_SCHEMA,
  SCAN_BUNDLE_SCHEMA,
} from '../schemas/production-variants'
import {
  planFinishedGoods,
  planOperationEntry,
  planScanBundle,
} from '../posting/production'

export const finishedGoodsConfig: DocConfig = {
  docType: 'finished-goods',
  slug: 'finished-goods',
  title: 'Finished Goods Entry',
  // §10 W1: stage-12 variant target (the despatch stage's FG intake door)
  chainStage: 12,
  schema: FINISHED_GOODS_SCHEMA,
  service: { plan: (input: unknown) => planFinishedGoods(input as Parameters<typeof planFinishedGoods>[0]) },
  headerFields: [
    { name: 'orderNo', label: 'Order No', type: 'text', required: true, colSpan: 1 },
    { name: 'deptCode', label: 'Department (D5 Finishing default)', type: 'picker', picker: 'department', colSpan: 1 },
    { name: 'prodDate', label: 'Entry Date', type: 'date', required: true, colSpan: 1 },
    { name: 'bundleNo', label: 'Bundle No', type: 'text', required: true, colSpan: 1 },
    { name: 'operatorCode', label: 'Operator', type: 'picker', picker: 'employee', required: true, colSpan: 1 },
    { name: 'qty', label: 'Qty (pcs)', type: 'number', required: true, colSpan: 1 },
    { name: 'rate', label: 'Rate (₹/pc)', type: 'number', required: true, colSpan: 1 },
    { name: 'styleNo', label: 'Style', type: 'picker', picker: 'style', colSpan: 1 },
    { name: 'colourName', label: 'Colour', type: 'picker', picker: 'colour', pickerValueField: 'name', colSpan: 1 },
    { name: 'sizeName', label: 'Size', type: 'picker', picker: 'size', colSpan: 1 },
    { name: 'lineId', label: 'Line', type: 'picker', picker: 'line', pickerValueField: 'id', colSpan: 2 },
  ],
  listColumns: [
    { name: 'orderNo', label: 'Order' },
    { name: 'deptName', label: 'Dept' },
    { name: 'prodDate', label: 'Date' },
    { name: 'bundleNo', label: 'Bundle' },
    { name: 'operatorName', label: 'Operator' },
    { name: 'qty', label: 'Qty', align: 'right' },
    { name: 'amount', label: 'Amount (₹)', align: 'right' },
  ],
  recentCount: 20,
  agentTools: ['post_finished_goods', 'suggest_next_step'],
}

export const operationEntryConfig: DocConfig = {
  docType: 'operation-entry',
  slug: 'operation-entry',
  title: 'Operation Entry',
  schema: OPERATION_ENTRY_SCHEMA,
  service: { plan: (input: unknown) => planOperationEntry(input as Parameters<typeof planOperationEntry>[0]) },
  headerFields: [
    { name: 'orderNo', label: 'Order No', type: 'text', required: true, colSpan: 1 },
    { name: 'deptCode', label: 'Department (D4 Sewing default)', type: 'picker', picker: 'department', colSpan: 1 },
    { name: 'bundleNo', label: 'Bundle No (sub-process key)', type: 'text', required: true, colSpan: 1 },
    { name: 'operatorCode', label: 'Operator', type: 'picker', picker: 'employee', required: true, colSpan: 1 },
    { name: 'prodDate', label: 'Prod Date', type: 'date', required: true, colSpan: 1 },
    { name: 'qty', label: 'Qty (pcs)', type: 'number', required: true, colSpan: 1 },
    { name: 'rate', label: 'Rate (₹/pc)', type: 'number', required: true, colSpan: 1 },
    { name: 'styleNo', label: 'Style', type: 'picker', picker: 'style', colSpan: 1 },
    { name: 'colourName', label: 'Colour', type: 'picker', picker: 'colour', pickerValueField: 'name', colSpan: 1 },
    { name: 'sizeName', label: 'Size', type: 'picker', picker: 'size', colSpan: 1 },
    { name: 'lineId', label: 'Line', type: 'picker', picker: 'line', pickerValueField: 'id', colSpan: 2 },
  ],
  listColumns: [
    { name: 'orderNo', label: 'Order' },
    { name: 'deptName', label: 'Dept' },
    { name: 'prodDate', label: 'Date' },
    { name: 'bundleNo', label: 'Bundle / Op' },
    { name: 'operatorName', label: 'Operator' },
    { name: 'qty', label: 'Qty', align: 'right' },
    { name: 'amount', label: 'Amount (₹)', align: 'right' },
  ],
  recentCount: 20,
  agentTools: ['post_operation_entry'],
}

export const bundleBarcodeConfig: DocConfig = {
  docType: 'bundle-barcode',
  slug: 'bundle-barcode',
  title: 'Bundle / Barcode Entry',
  schema: SCAN_BUNDLE_SCHEMA,
  service: { plan: (input: unknown) => planScanBundle(input as Parameters<typeof planScanBundle>[0]) },
  headerFields: [
    { name: 'bundleNo', label: 'Bundle No / Barcode (scan or paste)', type: 'text', required: true, colSpan: 2 },
    { name: 'operatorCode', label: 'Operator', type: 'picker', picker: 'employee', required: true, colSpan: 1 },
    { name: 'qty', label: 'Qty (bundle default)', type: 'number', colSpan: 1 },
    { name: 'rate', label: 'Rate (operator piece-rate default)', type: 'number', colSpan: 1 },
    { name: 'deptCode', label: 'Department (D4 default)', type: 'picker', picker: 'department', colSpan: 1 },
    { name: 'prodDate', label: 'Prod Date', type: 'date', colSpan: 1 },
  ],
  listColumns: [
    { name: 'orderNo', label: 'Order' },
    { name: 'bundleNo', label: 'Bundle' },
    { name: 'operatorName', label: 'Operator' },
    { name: 'deptName', label: 'Dept' },
    { name: 'prodDate', label: 'Date' },
    { name: 'qty', label: 'Qty', align: 'right' },
    { name: 'amount', label: 'Amount (₹)', align: 'right' },
  ],
  recentCount: 20,
  agentTools: ['scan_bundle'],
}

export const panelProductionConfig: DocConfig = {
  docType: 'panel-production',
  slug: 'panel-production',
  title: 'Panel Production',
  // deptCode rides the relaxed OPERATION_ENTRY_SCHEMA (optional — the wrapper
  // injects the D3 Cutting default; §7-B-13 "panel dept" variant)
  schema: OPERATION_ENTRY_SCHEMA,
  service: {
    plan: (input: any) =>
      planOperationEntry({
        ...input,
        deptCode: input?.deptCode ?? 'D3',
      } as Parameters<typeof planOperationEntry>[0]),
  },
  headerFields: [
    { name: 'orderNo', label: 'Order No', type: 'text', required: true, colSpan: 1 },
    { name: 'deptCode', label: 'Department (D3 Cutting default)', type: 'picker', picker: 'department', colSpan: 1 },
    { name: 'prodDate', label: 'Prod Date', type: 'date', required: true, colSpan: 1 },
    { name: 'bundleNo', label: 'Bundle / Panel Ref', type: 'text', required: true, colSpan: 1 },
    { name: 'operatorCode', label: 'Operator', type: 'picker', picker: 'employee', required: true, colSpan: 1 },
    { name: 'qty', label: 'Panel Qty', type: 'number', required: true, colSpan: 1 },
    { name: 'rate', label: 'Rate (₹/panel)', type: 'number', required: true, colSpan: 1 },
    { name: 'styleNo', label: 'Style', type: 'picker', picker: 'style', colSpan: 1 },
    { name: 'colourName', label: 'Colour', type: 'picker', picker: 'colour', pickerValueField: 'name', colSpan: 1 },
    { name: 'sizeName', label: 'Size', type: 'picker', picker: 'size', colSpan: 1 },
    { name: 'lineId', label: 'Line', type: 'picker', picker: 'line', pickerValueField: 'id', colSpan: 2 },
  ],
  listColumns: [
    { name: 'orderNo', label: 'Order' },
    { name: 'deptName', label: 'Dept' },
    { name: 'prodDate', label: 'Date' },
    { name: 'bundleNo', label: 'Bundle / Panel' },
    { name: 'operatorName', label: 'Operator' },
    { name: 'qty', label: 'Panels', align: 'right' },
    { name: 'amount', label: 'Amount (₹)', align: 'right' },
  ],
  recentCount: 20,
  agentTools: ['post_production_entry'],
}

export const panelExcessConfig: DocConfig = {
  docType: 'panel-excess',
  slug: 'panel-excess',
  title: 'Panel Excess Entry',
  // §7-B-14: the EXCESS flag rides the qty label + this dedicated variant
  // screen (FrmPanelExcessEntry family); deptCode relaxed + D3 default.
  schema: OPERATION_ENTRY_SCHEMA,
  service: {
    plan: (input: any) =>
      planOperationEntry({
        ...input,
        deptCode: input?.deptCode ?? 'D3',
      } as Parameters<typeof planOperationEntry>[0]),
  },
  headerFields: [
    { name: 'orderNo', label: 'Order No', type: 'text', required: true, colSpan: 1 },
    { name: 'deptCode', label: 'Department (D3 Cutting default)', type: 'picker', picker: 'department', colSpan: 1 },
    { name: 'prodDate', label: 'Prod Date', type: 'date', required: true, colSpan: 1 },
    { name: 'bundleNo', label: 'Bundle / Panel Ref', type: 'text', required: true, colSpan: 1 },
    { name: 'operatorCode', label: 'Operator', type: 'picker', picker: 'employee', required: true, colSpan: 1 },
    { name: 'qty', label: 'Excess Panel Qty (vs plan)', type: 'number', required: true, colSpan: 1 },
    { name: 'rate', label: 'Rate (₹/panel)', type: 'number', required: true, colSpan: 1 },
    { name: 'styleNo', label: 'Style', type: 'picker', picker: 'style', colSpan: 1 },
    { name: 'colourName', label: 'Colour', type: 'picker', picker: 'colour', pickerValueField: 'name', colSpan: 1 },
    { name: 'sizeName', label: 'Size', type: 'picker', picker: 'size', colSpan: 1 },
    { name: 'lineId', label: 'Line', type: 'picker', picker: 'line', pickerValueField: 'id', colSpan: 2 },
  ],
  listColumns: [
    { name: 'orderNo', label: 'Order' },
    { name: 'deptName', label: 'Dept' },
    { name: 'prodDate', label: 'Date' },
    { name: 'bundleNo', label: 'Bundle / Panel' },
    { name: 'operatorName', label: 'Operator' },
    { name: 'qty', label: 'Excess Panels', align: 'right' },
    { name: 'amount', label: 'Amount (₹)', align: 'right' },
  ],
  recentCount: 20,
  agentTools: ['post_production_entry'],
}

// ───────── SPEC-M6 §7-D-1 (Wave D) — line-output (manual tally) ─────────
import { LINE_OUTPUT_SCHEMA } from '../schemas/production-variants'
import { planLineOutput } from '../posting/production'

export const lineOutputConfig: DocConfig = {
  docType: 'line-output',
  slug: 'line-output',
  title: 'Line Output (manual tally)',
  schema: LINE_OUTPUT_SCHEMA,
  service: { plan: (input: any) => planLineOutput(input) },
  headerFields: [
    { name: 'orderNo', label: 'Order No', type: 'text', required: true, colSpan: 1 },
    { name: 'lineId', label: 'Line (tally sheet)', type: 'picker', picker: 'line', pickerValueField: 'id', required: true, colSpan: 1 },
    { name: 'deptCode', label: 'Department (D4 default)', type: 'picker', picker: 'department', colSpan: 1 },
    { name: 'prodDate', label: 'Prod Date', type: 'date', required: true, colSpan: 1 },
    { name: 'bundleNo', label: 'Bundle / Tally Ref', type: 'text', required: true, colSpan: 1 },
    { name: 'operatorCode', label: 'Operator', type: 'picker', picker: 'employee', required: true, colSpan: 1 },
    { name: 'qty', label: 'Qty (pcs)', type: 'number', required: true, colSpan: 1 },
    { name: 'rate', label: 'Rate (₹/pc)', type: 'number', required: true, colSpan: 1 },
    { name: 'styleNo', label: 'Style', type: 'picker', picker: 'style', colSpan: 1 },
    { name: 'colourName', label: 'Colour', type: 'picker', picker: 'colour', pickerValueField: 'name', colSpan: 1 },
    { name: 'sizeName', label: 'Size', type: 'picker', picker: 'size', colSpan: 1 },
  ],
  listColumns: [
    { name: 'orderNo', label: 'Order' },
    { name: 'lineName', label: 'Line' },
    { name: 'deptName', label: 'Dept' },
    { name: 'prodDate', label: 'Date' },
    { name: 'bundleNo', label: 'Tally Ref' },
    { name: 'operatorName', label: 'Operator' },
    { name: 'qty', label: 'Qty', align: 'right' },
    { name: 'amount', label: 'Amount (₹)', align: 'right' },
  ],
  recentCount: 20,
  agentTools: ['post_production_entry'],
}
