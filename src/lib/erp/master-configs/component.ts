import type { MasterConfig } from './types'

// SPEC-M2 §3 row 17 · NEW in M2 (no prior tool)
export const componentConfig: MasterConfig = {
  slug: 'component', entity: 'component', label: 'Components', singular: 'Component',
  delegate: 'component', model: 'Component', category: 'product',
  codeField: 'name', titleField: 'name',
  searchFields: ['name'],
  defaultSort: { field: 'name', dir: 'asc' },
  listColumns: [
    { field: 'name', label: 'Name' },
  ],
  fields: [
    { name: 'name', label: 'Name', type: 'text', required: true, description: 'Component (e.g. Self Fabric, Contrast Panel)' },
  ],
  createTool: 'create_component', updateTool: 'update_component', listTool: 'list_components',
  legacyForms: [],
}
