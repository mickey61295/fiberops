/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M5 §7-D-30 — Lab Test Entry (/quality/lab-tests, item
// 'lab-test-entry', legacy FrmLabTest family). LT-#### docNo; the itemCode
// picker is TYPED by the itemType cell (ERRATUM 6 header pickerFrom —
// yarn|fabric|accessory|style). The create_lab_test tool is the agent door.
import type { DocConfig } from './types'
import { LAB_TEST_SCHEMA } from '../schemas/lab-test'
import { planLabTest } from '../posting/lab-test'

export const labTestConfig: DocConfig = {
  docType: 'lab-test',
  slug: 'lab-test',
  title: 'Lab Test Entry',
  numberPrefix: 'LT-',
  numberField: 'testNo',
  chainStage: undefined,
  schema: LAB_TEST_SCHEMA,
  service: { plan: (input: any) => planLabTest(input) },
  headerFields: [
    { name: 'testNo', label: 'Test No', type: 'text', colSpan: 1 },
    { name: 'itemType', label: 'Item Type', type: 'select', required: true, colSpan: 1, options: [
      { value: 'yarn', label: 'Yarn' },
      { value: 'fabric', label: 'Fabric' },
      { value: 'accessory', label: 'Accessory' },
      { value: 'style', label: 'Pcs (style)' },
    ] },
    { name: 'itemCode', label: 'Item', type: 'picker', pickerFrom: 'itemType', required: true, colSpan: 1 },
    { name: 'lotNo', label: 'Lot No', type: 'text', colSpan: 1 },
    { name: 'orderNo', label: 'Order No', type: 'text', colSpan: 1 },
    { name: 'testType', label: 'Test Type', type: 'select', required: true, colSpan: 1, options: [
      { value: 'gsm', label: 'GSM' },
      { value: 'shrinkage', label: 'Shrinkage' },
      { value: 'colour_fastness', label: 'Colour Fastness' },
      { value: 'composition', label: 'Composition' },
      { value: 'other', label: 'Other' },
    ] },
    { name: 'result', label: 'Result', type: 'select', colSpan: 1, options: [
      { value: 'pending', label: 'Pending' },
      { value: 'pass', label: 'Pass' },
      { value: 'fail', label: 'Fail' },
      { value: 'conditional', label: 'Conditional' },
    ] },
    { name: 'testedOn', label: 'Tested On', type: 'date', colSpan: 1 },
    { name: 'testedBy', label: 'Tested By', type: 'text', colSpan: 1 },
    { name: 'values', label: 'Values (JSON)', type: 'textarea', colSpan: 2 },
    { name: 'remarks', label: 'Remarks', type: 'textarea', colSpan: 2 },
  ],
  listColumns: [
    { name: 'testNo', label: 'Test No' },
    { name: 'itemType', label: 'Type' },
    { name: 'itemCode', label: 'Item' },
    { name: 'testType', label: 'Test' },
    { name: 'result', label: 'Result' },
    { name: 'testedOn', label: 'Date' },
  ],
  recentCount: 20,
  agentTools: ['create_lab_test', 'list_lots'],
}
