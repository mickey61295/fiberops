import type { MasterConfig } from './types'

// SPEC-M19 §3 Wave C (ADR-019) — legacy FrmRange.
export const sizeRangeConfig: MasterConfig = {
  slug: 'size-range', entity: 'sizeRange', label: 'Size Ranges', singular: 'Size Range',
  delegate: 'sizeRange', model: 'SizeRange', category: 'product',
  codeField: 'code', codePrefix: 'RNG-', titleField: 'name',
  searchFields: ["code","name","sizes"],
  defaultSort: { field: 'code', dir: 'asc' },
  listColumns: [
    {field: 'code',label: 'Code',mono: true},
    {field: 'name',label: 'Name'},
    {field: 'rangeGroupName',label: 'Group',refEntity: 'range-group'},
    {field: 'sizes',label: 'Sizes'},
  ],
  fields: [
    {name: 'code',label: 'Code',type: 'text',description: 'Optional — auto-assigned RNG-#### if omitted'},
    {name: 'name',label: 'Name',type: 'text',required: true},
    {name: 'rangeGroupCode',label: 'Group',type: 'text',refEntity: 'range-group',description: 'Range group code (e.g. RG-0001) or name'},
    {name: 'sizes',label: 'Sizes',type: 'text',description: 'CSV of size names (e.g. 104,110,116)'},
  ],
  createTool: 'create_size_range', updateTool: 'update_size_range', listTool: 'list_size_ranges',
  legacyForms: ['FrmRange'],
}
