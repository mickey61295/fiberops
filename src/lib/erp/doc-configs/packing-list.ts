/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M5 §7-D-29 — Packing List (/pieces/packing-list, item
// 'packing-list', legacy FrmPackingList family). PKL-#### docNo; carton
// line editor (W4 pickers for colour/size emit NAMES — ERRATUM 1); header
// totals auto-default to line sums in the service. W6 (§10): the [id] view
// shows the despatch recon (carton pcs vs despatched pcs).
import type { DocConfig } from './types'
import { PACKING_LIST_SCHEMA } from '../schemas/packing-list'
import { planPackingList } from '../posting/packing-list'

export const packingListConfig: DocConfig = {
  docType: 'packing-list',
  slug: 'packing-list',
  title: 'Packing List',
  numberPrefix: 'PKL-',
  numberField: 'packNo',
  chainStage: 12, // despatch stage — the carton manifest rides the DC (W1 highlight)
  schema: PACKING_LIST_SCHEMA,
  service: { plan: (input: any) => planPackingList(input) },
  headerFields: [
    { name: 'packNo', label: 'Pack No', type: 'text', colSpan: 1 },
    { name: 'despatchDcNo', label: 'Despatch DC', type: 'text', colSpan: 1 },
    { name: 'orderNo', label: 'Order No', type: 'text', colSpan: 1 },
    { name: 'buyerCode', label: 'Buyer', type: 'picker', picker: 'buyer', colSpan: 1 },
    { name: 'packDate', label: 'Pack Date', type: 'date', colSpan: 1 },
    { name: 'finYear', label: 'Fin Year', type: 'text', colSpan: 1 },
    { name: 'totalCartons', label: 'Total Cartons', type: 'number', colSpan: 1 },
    { name: 'totalPcs', label: 'Total Pcs', type: 'number', colSpan: 1 },
    { name: 'netKgs', label: 'Net Kgs', type: 'number', colSpan: 1 },
    { name: 'grossKgs', label: 'Gross Kgs', type: 'number', colSpan: 1 },
    { name: 'status', label: 'Status', type: 'select', colSpan: 1, options: [
      { value: 'draft', label: 'Draft' },
      { value: 'confirmed', label: 'Confirmed' },
    ] },
    { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
  ],
  lineFields: [
    { name: 'cartonNo', label: 'Carton No', type: 'text', required: true },
    { name: 'styleNo', label: 'Style', type: 'picker', picker: 'style', pickerValueField: 'styleNo', required: true },
    { name: 'colourName', label: 'Colour', type: 'picker', picker: 'colour', pickerValueField: 'name' },
    { name: 'sizeName', label: 'Size', type: 'picker', picker: 'size', pickerValueField: 'name' },
    { name: 'qty', label: 'Qty (pcs)', type: 'number', required: true },
    { name: 'netKgs', label: 'Net Kgs', type: 'number' },
  ],
  linesKey: 'lines',
  listColumns: [
    { name: 'packNo', label: 'Pack No' },
    { name: 'orderNo', label: 'Order' },
    { name: 'buyerName', label: 'Buyer' },
    { name: 'totalCartons', label: 'Cartons', align: 'right' },
    { name: 'totalPcs', label: 'Pcs', align: 'right' },
    { name: 'netKgs', label: 'Net Kgs', align: 'right' },
    { name: 'status', label: 'Status' },
    { name: 'packDate', label: 'Date' },
  ],
  recentCount: 20,
  agentTools: ['create_packing_list', 'list_despatches'],
}
