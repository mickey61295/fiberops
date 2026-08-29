import type { MasterConfig } from './types'

// SPEC-M19 §3 Wave C (ADR-019) — legacy FrmMachineCategory.
export const machineCategoryConfig: MasterConfig = {
  slug: 'machine-category', entity: 'machineCategory', label: 'Machine Categories', singular: 'Machine Category',
  delegate: 'machineCategory', model: 'MachineCategory', category: 'org',
  codeField: 'code', codePrefix: 'MC-', titleField: 'name',
  searchFields: ["code","name"],
  defaultSort: { field: 'code', dir: 'asc' },
  listColumns: [
    {field: 'code',label: 'Code',mono: true},
    {field: 'name',label: 'Name'},
  ],
  fields: [
    {name: 'code',label: 'Code',type: 'text',description: 'Optional — auto-assigned MC-#### if omitted'},
    {name: 'name',label: 'Name',type: 'text',required: true},
  ],
  createTool: 'create_machine_category', updateTool: 'update_machine_category', listTool: 'list_machine_categories',
  legacyForms: ['FrmMachineCategory'],
}
