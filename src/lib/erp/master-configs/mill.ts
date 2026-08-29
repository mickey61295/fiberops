import type { MasterConfig } from './types'

// SPEC-M19 §3 Wave C (ADR-019) — legacy FrmMill.
export const millConfig: MasterConfig = {
  slug: 'mill', entity: 'mill', label: 'Mills', singular: 'Mill',
  delegate: 'mill', model: 'Mill', category: 'commercial',
  codeField: 'code', codePrefix: 'MIL-', titleField: 'name',
  searchFields: ["code","name","city","gstin"],
  defaultSort: { field: 'code', dir: 'asc' },
  listColumns: [
    {field: 'code',label: 'Code',mono: true},
    {field: 'name',label: 'Name'},
    {field: 'city',label: 'City'},
    {field: 'gstin',label: 'GSTIN',mono: true},
  ],
  fields: [
    {name: 'code',label: 'Code',type: 'text',description: 'Optional — auto-assigned MIL-#### if omitted'},
    {name: 'name',label: 'Name',type: 'text',required: true},
    {name: 'city',label: 'City',type: 'text'},
    {name: 'gstin',label: 'GSTIN',type: 'text'},
    {name: 'notes',label: 'Notes',type: 'textarea'},
  ],
  createTool: 'create_mill', updateTool: 'update_mill', listTool: 'list_mills',
  legacyForms: ['FrmMill'],
}
