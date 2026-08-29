import type { MasterConfig } from './types'

// SPEC-M19 §3 Wave C (ADR-019) — legacy FrmCountGroup.
export const countGroupConfig: MasterConfig = {
  slug: 'count-group', entity: 'countGroup', label: 'Count Groups', singular: 'Count Group',
  delegate: 'countGroup', model: 'CountGroup', category: 'product',
  codeField: 'code', codePrefix: 'CG-', titleField: 'name',
  searchFields: ["code","name"],
  defaultSort: { field: 'code', dir: 'asc' },
  listColumns: [
    {field: 'code',label: 'Code',mono: true},
    {field: 'name',label: 'Name'},
  ],
  fields: [
    {name: 'code',label: 'Code',type: 'text',description: 'Optional — auto-assigned CG-#### if omitted'},
    {name: 'name',label: 'Name',type: 'text',required: true},
    {name: 'notes',label: 'Notes',type: 'textarea',description: 'Yarn counts in this group (e.g. 30s–40s single jersey)'},
  ],
  createTool: 'create_count_group', updateTool: 'update_count_group', listTool: 'list_count_groups',
  legacyForms: ['FrmCountGroup'],
}
