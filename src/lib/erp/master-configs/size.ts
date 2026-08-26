import type { MasterConfig } from './types'

// SPEC-M2 §3 row 8
export const sizeConfig: MasterConfig = {
  slug: 'size', entity: 'size', label: 'Sizes', singular: 'Size',
  delegate: 'size', model: 'Size', category: 'product',
  codeField: 'name', titleField: 'name',
  searchFields: ['name'],
  defaultSort: { field: 'sort', dir: 'asc' },
  listColumns: [
    { field: 'name', label: 'Name' },
    { field: 'sort', label: 'Sort', numeric: true },
  ],
  fields: [
    { name: 'name', label: 'Name', type: 'text', required: true, description: 'Size name (S, M, L, XL, 104, 110…)' },
    { name: 'sort', label: 'Sort order', type: 'number', defaultValue: 0 },
  ],
  createTool: 'create_size', updateTool: 'update_size', listTool: 'list_sizes',
  legacyForms: [],
}
