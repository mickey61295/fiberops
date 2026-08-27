import type { MasterConfig } from './types'

// SPEC-M6 §2 row 36 / §7-D-2 (ADR-016) — Lab test parameters master.
// Routed at /quality/parameters (Wave D item, config lands with ADR-016 in B).
export const testParameterConfig: MasterConfig = {
  slug: 'test-parameter', entity: 'testParameter', label: 'Test Parameters', singular: 'Test Parameter',
  delegate: 'testParameter', model: 'TestParameter', category: 'admin',
  codeField: 'code', titleField: 'name',
  searchFields: ['code', 'name', 'stage'],
  defaultSort: { field: 'code', dir: 'asc' },
  listColumns: [
    { field: 'code', label: 'Code', mono: true },
    { field: 'name', label: 'Parameter' },
    { field: 'stage', label: 'Stage' },
    { field: 'method', label: 'Method' },
    { field: 'unit', label: 'Unit' },
  ],
  fields: [
    { name: 'code', label: 'Code', type: 'text', required: true, description: 'e.g. GSM, SHRINK, CF (colour fastness)' },
    { name: 'name', label: 'Parameter', type: 'text', required: true, description: 'e.g. Grams per Square Metre' },
    { name: 'stage', label: 'Stage', type: 'select', options: [
      { value: 'knit', label: 'Knitting' }, { value: 'dye', label: 'Dyeing' },
      { value: 'print', label: 'Printing' }, { value: 'sew', label: 'Stitching' },
      { value: 'final', label: 'Final' },
    ], description: 'Where in the chain this test applies' },
    { name: 'method', label: 'Method', type: 'text', description: 'Test method / standard (e.g. ISO 3801)' },
    { name: 'unit', label: 'Unit', type: 'select', options: [
      { value: 'gsm', label: 'gsm' }, { value: '%', label: '%' }, { value: 'mm', label: 'mm' },
    ], description: 'Result unit' },
  ],
  createTool: 'create_test_parameter', updateTool: 'update_test_parameter', listTool: 'list_test_parameters',
  legacyForms: ['FrmTestParam'],
  notes: 'Wave D MT item (#36) — config + factory tools land with ADR-016 (Wave B). Feeds LabTest.values.',
}
