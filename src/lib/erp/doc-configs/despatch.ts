// SPEC-M3 §8 row 13 — Pcs DC Despatch (/pieces/despatch, item 'pcs-dc',
// legacy PcsDespatch ×4 variants). Fields mirror DESPATCH_SCHEMA exactly.
// Chain step 12 of 15. Ledger: sales_delivery pcs OUT of G2.
import type { DocConfig } from './types'
import { DESPATCH_SCHEMA } from '../schemas/despatch'
import { planPcsDespatch } from '../posting/despatch'

export const despatchConfig: DocConfig = {
  docType: 'despatch',
  slug: 'despatch',
  title: 'Pcs DC (Despatch)',
  numberPrefix: 'DC-',
  numberField: 'dcNo',
  chainStage: 12,
  schema: DESPATCH_SCHEMA,
  service: { plan: (input: unknown) => planPcsDespatch(input as Parameters<typeof planPcsDespatch>[0]) },
  headerFields: [
    { name: 'dcNo', label: 'DC No', type: 'text', colSpan: 1 },
    { name: 'mode', label: 'Mode', type: 'readonly', colSpan: 1 },
    { name: 'orderNo', label: 'Order No', type: 'text', required: true, colSpan: 1 },
    { name: 'totalPcs', label: 'Total Pcs', type: 'number', required: true, colSpan: 1 },
    { name: 'despatchDate', label: 'Despatch Date', type: 'date', colSpan: 1 },
    { name: 'vehicleNo', label: 'Vehicle No', type: 'text', colSpan: 1 },
    { name: 'courierName', label: 'Courier', type: 'text', colSpan: 1 },
  ],
  lineFields: [
    // service stores styleNo as a plain string (no FK) — picker emits styleNo
    { name: 'styleNo', label: 'Style', type: 'picker', picker: 'style', required: true },
    { name: 'colourName', label: 'Colour', type: 'picker', picker: 'colour', pickerValueField: 'name' },
    { name: 'sizeName', label: 'Size', type: 'picker', picker: 'size' },
    { name: 'qty', label: 'Qty (pcs)', type: 'number', required: true },
    { name: 'rate', label: 'Rate (₹)', type: 'number' },
  ],
  linesKey: 'lines',
  listColumns: [
    { name: 'dcNo', label: 'DC No' },
    { name: 'orderNo', label: 'Order' },
    { name: 'buyerName', label: 'Buyer' },
    { name: 'totalPcs', label: 'Pcs', align: 'right' },
    { name: 'despatchDate', label: 'Date' },
    { name: 'vehicleNo', label: 'Vehicle' },
    { name: 'status', label: 'Status' },
  ],
  recentCount: 20,
  agentTools: ['create_pcs_despatch', 'list_despatches'],
}
