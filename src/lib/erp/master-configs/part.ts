import type { MasterConfig } from './types'

// SPEC-M2 §3 row 16 · NEW in M2 (no prior tool)
export const partConfig: MasterConfig = {
  slug: 'part', entity: 'part', label: 'Parts', singular: 'Part',
  delegate: 'part', model: 'Part', category: 'product',
  codeField: 'name', titleField: 'name',
  searchFields: ['name'],
  defaultSort: { field: 'name', dir: 'asc' },
  listColumns: [
    { field: 'name', label: 'Name' },
  ],
  fields: [
    { name: 'name', label: 'Name', type: 'text', required: true, description: 'Garment part (e.g. Front Panel, Sleeve, Collar)' },
  ],
  createTool: 'create_part', updateTool: 'update_part', listTool: 'list_parts',
  legacyForms: [],
}
