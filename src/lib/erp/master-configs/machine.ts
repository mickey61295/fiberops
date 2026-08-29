import type { MasterConfig } from './types'

// SPEC-M19 §3 Wave C (ADR-019) — legacy FrmMachineMaster.
export const machineConfig: MasterConfig = {
  slug: 'machine', entity: 'machine', label: 'Machines', singular: 'Machine',
  delegate: 'machine', model: 'Machine', category: 'org',
  codeField: 'code', codePrefix: 'MCH-', titleField: 'name',
  searchFields: ["code","name","machineCategoryName"],
  defaultSort: { field: 'code', dir: 'asc' },
  listColumns: [
    {field: 'code',label: 'Code',mono: true},
    {field: 'name',label: 'Name'},
    {field: 'machineCategoryName',label: 'Category',refEntity: 'machine-category'},
    {field: 'capacityPcsPerHour',label: 'Capacity pcs/hr',numeric: true},
  ],
  fields: [
    {name: 'code',label: 'Code',type: 'text',description: 'Optional — auto-assigned MCH-#### if omitted'},
    {name: 'name',label: 'Name',type: 'text',required: true},
    {name: 'machineCategoryCode',label: 'Category',type: 'text',refEntity: 'machine-category',description: 'Machine category code (e.g. MC-0001) or name'},
    {name: 'capacityPcsPerHour',label: 'Capacity pcs/hr',type: 'number',defaultValue: 0},
    {name: 'notes',label: 'Notes',type: 'textarea'},
  ],
  createTool: 'create_machine', updateTool: 'update_machine', listTool: 'list_machines',
  legacyForms: ['FrmMachineMaster'],
}
