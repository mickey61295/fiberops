import type { MasterConfig } from './types'

// SPEC-M2 §3 row 9 · legacy frmSizeGroup · ERRATUM 1: 'list' field type
export const sizeGroupConfig: MasterConfig = {
  slug: 'size-group', entity: 'sizeGroup', label: 'Size Groups', singular: 'Size Group',
  delegate: 'sizeGroup', model: 'SizeGroup', category: 'product',
  codeField: 'name', titleField: 'name',
  searchFields: ['name', 'sizes'],
  defaultSort: { field: 'name', dir: 'asc' },
  listColumns: [
    { field: 'name', label: 'Name' },
    { field: 'sizes', label: 'Sizes' },
  ],
  fields: [
    { name: 'name', label: 'Name', type: 'text', required: true, description: 'Group name (e.g. Adults EU, Kids XS-XL)' },
    { name: 'sizes', label: 'Sizes', type: 'list', required: true, description: 'Size names in sort order (CSV in form, array in tool)' },
  ],
  createTool: 'create_size_group', updateTool: 'update_size_group', listTool: 'list_size_groups',
  legacyForms: ['frmSizeGroup'],
  notes: 'sizes stored as CSV of resolved size ids (legacy create_size_group behavior)',
}
