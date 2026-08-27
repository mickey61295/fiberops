/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M5 §7-D-36 — Fabric / Acc Allotment (/programs/allotment, item
// 'fabric-acc-allotment'). The WRITE door over ProgBalance: bumps
// reqKgs/reqMtrs on the balance rows the program status register reads.
// create_allotment is the agent door. itemType select TYPES the itemCode
// picker (ERRATUM 6 header pickerFrom — yarn|fabric).
import type { DocConfig } from './types'
import { PROGRAM_ALLOTMENT_SCHEMA } from '../schemas/program-allotment'
import { planProgramAllotment } from '../posting/program-allotment'

export const programAllotmentConfig: DocConfig = {
  docType: 'program-allotment',
  slug: 'program-allotment',
  title: 'Fabric / Acc Allotment',
  numberPrefix: undefined,
  numberField: undefined,
  chainStage: 3, // program stage — the consumption plan rides the program (W1 highlight)
  schema: PROGRAM_ALLOTMENT_SCHEMA,
  service: { plan: (input: any) => planProgramAllotment(input) },
  headerFields: [
    { name: 'orderNo', label: 'Order No', type: 'text', required: true, colSpan: 1 },
    { name: 'deptCode', label: 'Department', type: 'picker', picker: 'department', required: true, colSpan: 1 },
    { name: 'itemType', label: 'Item Type', type: 'select', required: true, colSpan: 1, options: [
      { value: 'yarn', label: 'Yarn' },
      { value: 'fabric', label: 'Fabric' },
    ] },
    { name: 'itemCode', label: 'Item', type: 'picker', pickerFrom: 'itemType', required: true, colSpan: 1 },
    { name: 'colourName', label: 'Colour (fabric)', type: 'picker', picker: 'colour', pickerValueField: 'name', colSpan: 1 },
    { name: 'kgs', label: 'Kgs', type: 'number', colSpan: 1 },
    { name: 'mtrs', label: 'Mtrs (fabric)', type: 'number', colSpan: 1 },
    { name: 'notes', label: 'Notes', type: 'textarea', colSpan: 2 },
  ],
  listColumns: [
    { name: 'orderNo', label: 'Order' },
    { name: 'deptCode', label: 'Dept' },
    { name: 'itemType', label: 'Type' },
    { name: 'itemCode', label: 'Item' },
    { name: 'kgs', label: 'Kgs', align: 'right' },
    { name: 'mtrs', label: 'Mtrs', align: 'right' },
    { name: 'createdAt', label: 'Allotted' },
  ],
  recentCount: 20,
  agentTools: ['create_allotment', 'list_programs'],
}
