import type { MasterConfig } from './types'

// SPEC-M19 §3 Wave C (ADR-019) — legacy FrmRangeGrp.
export const rangeGroupConfig: MasterConfig = {
  slug: 'range-group', entity: 'rangeGroup', label: 'Range Groups', singular: 'Range Group',
  delegate: 'rangeGroup', model: 'RangeGroup', category: 'product',
  codeField: 'code', codePrefix: 'RG-', titleField: 'name',
  searchFields: ["code","name"],
  defaultSort: { field: 'code', dir: 'asc' },
  listColumns: [
    {field: 'code',label: 'Code',mono: true},
    {field: 'name',label: 'Name'},
  ],
  fields: [
    {name: 'code',label: 'Code',type: 'text',description: 'Optional — auto-assigned RG-#### if omitted'},
    {name: 'name',label: 'Name',type: 'text',required: true},
  ],
  createTool: 'create_range_group', updateTool: 'update_range_group', listTool: 'list_range_groups',
  legacyForms: ['FrmRangeGrp'],
}
