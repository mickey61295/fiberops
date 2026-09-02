// SPEC-M3 §8 row 3 — Program Entry (/programs/new, item 'program-entry',
// legacy FrmProgNew/FrmProgEntry). Fields mirror PROGRAM_SCHEMA exactly.
// Chain step 3 of 15. Ledger: ProgBalanceYarn/Fabric projector rows.
import type { DocConfig } from './types'
import { PROGRAM_SCHEMA } from '../schemas/program'
import { planProgram } from '../posting/program'

export const programConfig: DocConfig = {
  docType: 'program',
  slug: 'program',
  title: 'Program',
  numberPrefix: 'PGM-',
  numberField: 'programNo',
  chainStage: 3,
  schema: PROGRAM_SCHEMA,
  service: { plan: (input: unknown) => planProgram(input as Parameters<typeof planProgram>[0]) },
  headerFields: [
    { name: 'programNo', label: 'Program No', type: 'text', colSpan: 1 },
    { name: 'orderNo', label: 'Order No', type: 'text', required: true, colSpan: 1 },
    // the 7 stages from the schema .describe() string (service maps → dept via STAGE_DEPT)
    { name: 'stage', label: 'Stage', type: 'select', required: true, colSpan: 1, options: [
      { value: 'knitting', label: 'Knitting' },
      { value: 'dyeing', label: 'Dyeing' },
      { value: 'printing', label: 'Printing' },
      { value: 'embroidery', label: 'Embroidery' },
      { value: 'sewing', label: 'Sewing' },
      { value: 'finishing', label: 'Finishing' },
      { value: 'packing', label: 'Packing' },
    ] },
    { name: 'yarnCode', label: 'Yarn (knitting)', type: 'picker', picker: 'yarn', colSpan: 1 },
    { name: 'fabricCode', label: 'Fabric (dyeing)', type: 'picker', picker: 'fabric', colSpan: 1 },
    // SPEC-M43 PRG-03 — the knitting specification (fabric programs):
    // written onto the ProgBalanceFabric row; correction door on the view page.
    { name: 'colourCode', label: 'Colour (spec)', type: 'picker', picker: 'colour', colSpan: 1 },
    { name: 'designCode', label: 'Design (spec)', type: 'picker', picker: 'design', colSpan: 1 },
    { name: 'finDiaCode', label: 'Finish Dia (spec)', type: 'picker', picker: 'dia', pickerValueField: 'value', colSpan: 1 },
    { name: 'finGsm', label: 'Finish GSM (spec)', type: 'number', colSpan: 1 },
    { name: 'll', label: 'Loop Length (spec)', type: 'text', colSpan: 1 },
    { name: 'requiredKgs', label: 'Required (kgs)', type: 'number', colSpan: 1 },
    { name: 'requiredMtrs', label: 'Required (mtrs)', type: 'number', colSpan: 1 },
    { name: 'requiredPcs', label: 'Required (pcs)', type: 'number', colSpan: 1 },
    { name: 'deptCode', label: 'Department', type: 'picker', picker: 'department', colSpan: 1 },
    { name: 'targetDate', label: 'Target Date', type: 'date', colSpan: 1 },
    { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
  ],
  listColumns: [
    { name: 'programNo', label: 'Program' },
    { name: 'orderNo', label: 'Order' },
    { name: 'stage', label: 'Stage' },
    { name: 'requiredKgs', label: 'Req kgs', align: 'right' },
    { name: 'requiredMtrs', label: 'Req mtrs', align: 'right' },
    { name: 'requiredPcs', label: 'Req pcs', align: 'right' },
    { name: 'targetDate', label: 'Target' },
    { name: 'status', label: 'Status' },
  ],
  recentCount: 20,
  agentTools: ['create_program', 'get_program_status', 'propose_program_requirements', 'suggest_next_step'],
}
