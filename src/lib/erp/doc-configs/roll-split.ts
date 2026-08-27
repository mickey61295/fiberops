/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M5 §7-D-34 — Roll Tracking / Split (/inventory/rolls, item
// 'roll-tracking'). RSP-#### docNo; rolls ≡ lots convention — the screen is
// the WRITE door over the Lot/stock world (the lots register is the read
// side). split_roll is the agent door. No doc-number field in the service
// input (docNo optional); the recent table lists recent splits by RSP docNo.
import type { DocConfig } from './types'
import { ROLL_SPLIT_SCHEMA } from '../schemas/roll-split'
import { planRollSplit } from '../posting/roll-split'

export const rollSplitConfig: DocConfig = {
  docType: 'roll-split',
  slug: 'roll-split',
  title: 'Roll Tracking / Split',
  numberPrefix: 'RSP-',
  numberField: 'docNo',
  chainStage: undefined,
  schema: ROLL_SPLIT_SCHEMA,
  service: { plan: (input: any) => planRollSplit(input) },
  headerFields: [
    { name: 'docNo', label: 'Split No', type: 'text', colSpan: 1 },
    { name: 'sourceLotNo', label: 'Source Lot / Roll', type: 'text', required: true, colSpan: 1 },
    { name: 'itemCode', label: 'Fabric', type: 'picker', picker: 'fabric', required: true, colSpan: 1 },
    { name: 'godownCode', label: 'Godown', type: 'picker', picker: 'godown', required: true, colSpan: 1 },
    { name: 'mtrs', label: 'Mtrs to Split', type: 'number', required: true, colSpan: 1 },
    { name: 'newLotNo', label: 'New Lot No (blank = auto)', type: 'text', colSpan: 1 },
    { name: 'splitDate', label: 'Split Date', type: 'date', colSpan: 1 },
    { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
  ],
  listColumns: [
    { name: 'docNo', label: 'Split No' },
    { name: 'sourceLotNo', label: 'Source Lot' },
    { name: 'newLotNo', label: 'New Lot' },
    { name: 'itemCode', label: 'Fabric' },
    { name: 'mtrs', label: 'Mtrs', align: 'right' },
    { name: 'docDate', label: 'Date' },
  ],
  recentCount: 20,
  agentTools: ['split_roll', 'list_lots'],
}
