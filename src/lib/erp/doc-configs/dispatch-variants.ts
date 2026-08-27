/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M6 §7-B-3/4 — Courier DC (/dispatch/courier) and Loading
// (/dispatch/loading; legacy FrmCourierDC / FrmLoading). §4 rule-2 VARIANTS
// over planPcsDespatch injecting mode: 'courier' (courierName required,
// DC- space) / 'loading' (LAD-#### space, status starts 'loading'; ledger
// posts identically — a loading challan IS a despatch at the gate).
import type { DocConfig, DocField } from './types'
import { DESPATCH_SCHEMA } from '../schemas/despatch'
import { planPcsDespatch } from '../posting/despatch'

const sharedLineFields = [
  { name: 'styleNo', label: 'Style', type: 'picker', picker: 'style', required: true },
  { name: 'colourName', label: 'Colour', type: 'picker', picker: 'colour', pickerValueField: 'name' },
  { name: 'sizeName', label: 'Size', type: 'picker', picker: 'size' },
  { name: 'qty', label: 'Qty (pcs)', type: 'number', required: true },
  { name: 'rate', label: 'Rate (₹)', type: 'number' },
] as const

export const courierDcConfig: DocConfig = {
  docType: 'courier-dc',
  slug: 'courier-dc',
  title: 'Courier DC',
  numberPrefix: 'DC-',
  numberField: 'dcNo',
  chainStage: 12,
  schema: DESPATCH_SCHEMA,
  service: {
    plan: (input: any) => planPcsDespatch({ ...input, mode: 'courier' }),
  },
  headerFields: [
    { name: 'dcNo', label: 'DC No', type: 'text', colSpan: 1 },
    { name: 'mode', label: 'Mode', type: 'readonly', colSpan: 1 },
    { name: 'orderNo', label: 'Order No', type: 'text', required: true, colSpan: 1 },
    { name: 'totalPcs', label: 'Total Pcs', type: 'number', required: true, colSpan: 1 },
    { name: 'despatchDate', label: 'Despatch Date', type: 'date', colSpan: 1 },
    { name: 'courierName', label: 'Courier', type: 'text', required: true, colSpan: 1 },
    { name: 'vehicleNo', label: 'Vehicle (optional)', type: 'text', colSpan: 1 },
  ],
  lineFields: [...sharedLineFields] as any,
  linesKey: 'lines',
  listColumns: [
    { name: 'dcNo', label: 'DC No' },
    { name: 'orderNo', label: 'Order' },
    { name: 'courierName', label: 'Courier' },
    { name: 'totalPcs', label: 'Pcs', align: 'right' },
    { name: 'despatchDate', label: 'Date' },
    { name: 'status', label: 'Status' },
  ],
  recentCount: 20,
  agentTools: ['create_courier_dc'],
}

export const loadingConfig: DocConfig = {
  docType: 'loading',
  slug: 'loading',
  title: 'Loading Challan',
  numberPrefix: 'LAD-',
  numberField: 'dcNo',
  chainStage: 12,
  schema: DESPATCH_SCHEMA,
  service: {
    plan: (input: any) => planPcsDespatch({ ...input, mode: 'loading' }),
  },
  headerFields: [
    { name: 'dcNo', label: 'Challan No', type: 'text', colSpan: 1 },
    { name: 'mode', label: 'Mode', type: 'readonly', colSpan: 1 },
    { name: 'orderNo', label: 'Order No', type: 'text', required: true, colSpan: 1 },
    { name: 'totalPcs', label: 'Total Pcs', type: 'number', required: true, colSpan: 1 },
    { name: 'despatchDate', label: 'Loading Date', type: 'date', colSpan: 1 },
    { name: 'vehicleNo', label: 'Vehicle No', type: 'text', required: true, colSpan: 1 },
    { name: 'courierName', label: 'Courier (optional)', type: 'text', colSpan: 1 },
  ],
  lineFields: [...sharedLineFields] as any,
  linesKey: 'lines',
  listColumns: [
    { name: 'dcNo', label: 'Challan' },
    { name: 'orderNo', label: 'Order' },
    { name: 'vehicleNo', label: 'Vehicle' },
    { name: 'totalPcs', label: 'Pcs', align: 'right' },
    { name: 'despatchDate', label: 'Date' },
    { name: 'status', label: 'Status' },
  ],
  recentCount: 20,
  agentTools: ['create_loading_challan'],
}

// ───────── SPEC-M6 §7-D-1 (Wave D) — the material-DC variants (MDC / PDC) ─────────
import { DC_ENTRY_SCHEMA, PROCESS_DC_SCHEMA } from '../schemas/dispatch-variants'
import { planMaterialDc } from '../posting/jobwork'

const dcLineFields = [
  { name: 'itemType', label: 'Type', type: 'select' as const, options: [
    { value: 'yarn', label: 'Yarn' }, { value: 'fabric', label: 'Fabric' }, { value: 'accessory', label: 'Accessory' },
  ] },
  { name: 'itemCode', label: 'Item', type: 'picker' as const, pickerFrom: 'itemType' },
  { name: 'qty', label: 'Qty', type: 'number' as const, required: true },
  { name: 'rate', label: 'Rate (₹)', type: 'number' as const },
]

export const dcEntryConfig: DocConfig = {
  docType: 'dc-entry',
  slug: 'dc-entry',
  title: 'Material DC (Fabric / Yarn / Acc / Gen)',
  numberPrefix: 'MDC-',
  numberField: 'dcNo',
  schema: DC_ENTRY_SCHEMA,
  service: { plan: (input: any) => planMaterialDc(input) },
  headerFields: [
    { name: 'dcNo', label: 'DC No', type: 'text', colSpan: 1 },
    { name: 'partyCode', label: 'Party (any)', type: 'picker', picker: 'party', required: true, colSpan: 1 },
    { name: 'processType', label: 'Process (washing/dyeing/printing…)', type: 'text', colSpan: 1 },
    { name: 'itemType', label: 'Material', type: 'select', options: [
      { value: 'fabric', label: 'Fabric' }, { value: 'yarn', label: 'Yarn' }, { value: 'accessory', label: 'Accessory' },
    ], required: true, colSpan: 1 },
    { name: 'itemCode', label: 'Item', type: 'picker', pickerFrom: 'itemType', required: true, colSpan: 1 },
    { name: 'qty', label: 'Qty Out', type: 'number', required: true, colSpan: 1 },
    { name: 'rate', label: 'Rate (₹)', type: 'number', colSpan: 1 },
    { name: 'godownCode', label: 'From Godown (G1 default)', type: 'picker', picker: 'godown', colSpan: 1 },
    { name: 'dcDate', label: 'DC Date', type: 'date', colSpan: 1 },
    { name: 'vehicleNo', label: 'Vehicle No', type: 'text', colSpan: 1 },
    { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
  ],
  listColumns: [
    { name: 'dcNo', label: 'DC No' },
    { name: 'partyName', label: 'Party' },
    { name: 'processType', label: 'Process' },
    { name: 'totalQty', label: 'Qty', align: 'right' },
    { name: 'outDate', label: 'Date' },
    { name: 'status', label: 'Status' },
  ],
  recentCount: 20,
  agentTools: ['create_dc'],
}

export const processDcConfig: DocConfig = {
  docType: 'process-dc',
  slug: 'process-dc',
  title: 'Process DC (multi-component)',
  numberPrefix: 'PDC-',
  numberField: 'dcNo',
  schema: PROCESS_DC_SCHEMA,
  service: { plan: (input: any) => planMaterialDc(input) },
  headerFields: [
    { name: 'dcNo', label: 'DC No', type: 'text', colSpan: 1 },
    { name: 'partyCode', label: 'Party (any)', type: 'picker', picker: 'party', required: true, colSpan: 1 },
    { name: 'processType', label: 'Process (washing/dyeing/printing…)', type: 'text', required: true, colSpan: 1 },
    { name: 'godownCode', label: 'From Godown (G1 default)', type: 'picker', picker: 'godown', colSpan: 1 },
    { name: 'dcDate', label: 'DC Date', type: 'date', colSpan: 1 },
    { name: 'vehicleNo', label: 'Vehicle No', type: 'text', colSpan: 1 },
    { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
  ],
  lineFields: dcLineFields as any,
  linesKey: 'lines',
  listColumns: [
    { name: 'dcNo', label: 'DC No' },
    { name: 'partyName', label: 'Party' },
    { name: 'processType', label: 'Process' },
    { name: 'totalQty', label: 'Qty', align: 'right' },
    { name: 'outDate', label: 'Date' },
    { name: 'status', label: 'Status' },
  ],
  recentCount: 20,
  agentTools: ['create_dc'],
}
