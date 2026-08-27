/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M5 §7-D-27/28 — Gate Entry / Gate Pass (/dispatch/gate-entry,
// /dispatch/gate-pass; legacy FrmGateEntry / FrmGatePass). ONE model +
// ONE service (planGateEntry); the two configs are §4 rule-2 VARIANTS
// injecting gateType ('in' → GE-#### / 'out' → GP-####). The status select
// is shared; the injected gateType stays a readonly hint (mirror rule).
import type { DocConfig, DocField } from './types'
import { GATE_ENTRY_SCHEMA } from '../schemas/gate'
import { planGateEntry } from '../posting/gate'

const sharedFields: DocField[] = [
  { name: 'entryNo', label: 'Entry No', type: 'text', colSpan: 1 },
  { name: 'gateType', label: 'Gate', type: 'readonly', colSpan: 1 },
  { name: 'gateDateTime', label: 'Date & Time', type: 'text', colSpan: 1, required: false },
  { name: 'partyCode', label: 'Party', type: 'picker', picker: 'party', colSpan: 1 },
  { name: 'vehicleNo', label: 'Vehicle No', type: 'text', colSpan: 1 },
  { name: 'refDocNo', label: 'Ref Doc (DC/GRN/PO)', type: 'text', colSpan: 1 },
  { name: 'status', label: 'Status', type: 'select', colSpan: 1, options: [
    { value: 'logged', label: 'Logged' },
    { value: 'cleared', label: 'Cleared' },
  ] },
  { name: 'purpose', label: 'Purpose', type: 'textarea', colSpan: 2 },
]

export const gateEntryConfig: DocConfig = {
  docType: 'gate-entry',
  slug: 'gate-entry',
  title: 'Gate Entry',
  numberPrefix: 'GE-',
  numberField: 'entryNo',
  chainStage: undefined,
  schema: GATE_ENTRY_SCHEMA,
  service: {
    plan: (input: any) => planGateEntry({ ...input, gateType: 'in' }),
  },
  headerFields: sharedFields,
  listColumns: [
    { name: 'entryNo', label: 'Entry No' },
    { name: 'vehicleNo', label: 'Vehicle' },
    { name: 'partyName', label: 'Party' },
    { name: 'refDocNo', label: 'Ref Doc' },
    { name: 'status', label: 'Status' },
    { name: 'gateDateTime', label: 'When' },
  ],
  recentCount: 20,
  agentTools: ['create_gate_entry'],
}

export const gatePassConfig: DocConfig = {
  docType: 'gate-pass',
  slug: 'gate-pass',
  title: 'Gate Pass',
  numberPrefix: 'GP-',
  numberField: 'entryNo',
  chainStage: undefined,
  schema: GATE_ENTRY_SCHEMA,
  service: {
    plan: (input: any) => planGateEntry({ ...input, gateType: 'out' }),
  },
  headerFields: sharedFields,
  listColumns: [
    { name: 'entryNo', label: 'Pass No' },
    { name: 'vehicleNo', label: 'Vehicle' },
    { name: 'partyName', label: 'Party' },
    { name: 'refDocNo', label: 'Ref Doc' },
    { name: 'status', label: 'Status' },
    { name: 'gateDateTime', label: 'When' },
  ],
  recentCount: 20,
  agentTools: ['create_gate_pass'],
}
