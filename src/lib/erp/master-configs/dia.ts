import type { MasterConfig } from './types'

// SPEC-M2 §3 row 10
export const diaConfig: MasterConfig = {
  slug: 'dia', entity: 'dia', label: 'Dias', singular: 'Dia',
  delegate: 'dia', model: 'Dia', category: 'product',
  codeField: 'value', titleField: 'value',
  searchFields: ['value'],
  defaultSort: { field: 'value', dir: 'asc' },
  listColumns: [
    { field: 'value', label: 'Value', mono: true },
  ],
  fields: [
    { name: 'value', label: 'Value', type: 'text', required: true, description: 'Machine diameter (e.g. "26", "30", "34")' },
  ],
  createTool: 'create_dia', updateTool: 'update_dia', listTool: 'list_dias',
  legacyForms: [],
}
