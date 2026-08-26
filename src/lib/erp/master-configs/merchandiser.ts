import type { MasterConfig } from './types'

// SPEC-M2 §3 row 3
export const merchandiserConfig: MasterConfig = {
  slug: 'merchandiser', entity: 'merchandiser', label: 'Merchandisers', singular: 'Merchandiser',
  delegate: 'merchandiser', model: 'Merchandiser', category: 'commercial',
  codeField: 'name', titleField: 'name',
  searchFields: ['name', 'email', 'phone'],
  defaultSort: { field: 'name', dir: 'asc' },
  listColumns: [
    { field: 'name', label: 'Name' },
    { field: 'email', label: 'Email' },
    { field: 'phone', label: 'Phone' },
  ],
  fields: [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'email', label: 'Email', type: 'text' },
    { name: 'phone', label: 'Phone', type: 'text' },
  ],
  createTool: 'create_merchandiser', updateTool: 'update_merchandiser', listTool: 'list_merchandisers',
  legacyForms: [],
}
