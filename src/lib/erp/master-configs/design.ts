import type { MasterConfig } from './types'

// SPEC-M2 §3 row 18 · legacy FrmDesignEntry · NEW tools in M2
export const designConfig: MasterConfig = {
  slug: 'design', entity: 'design', label: 'Designs', singular: 'Design',
  delegate: 'design', model: 'Design', category: 'product',
  codeField: 'code', titleField: 'name',
  searchFields: ['code', 'name'],
  defaultSort: { field: 'code', dir: 'asc' },
  listColumns: [
    { field: 'code', label: 'Code', mono: true },
    { field: 'name', label: 'Name' },
  ],
  fields: [
    { name: 'code', label: 'Code', type: 'text', required: true },
    { name: 'name', label: 'Name', type: 'text', required: true },
  ],
  createTool: 'create_design', updateTool: 'update_design', listTool: 'list_designs',
  legacyForms: ['FrmDesignEntry'],
}
