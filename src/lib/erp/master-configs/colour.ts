import type { MasterConfig } from './types'

// SPEC-M2 §3 row 7 · legacy FrmShadeEntry
export const colourConfig: MasterConfig = {
  slug: 'colour', entity: 'colour', label: 'Colours', singular: 'Colour',
  delegate: 'colour', model: 'Colour', category: 'product',
  codeField: 'code', titleField: 'name',
  searchFields: ['code', 'name'],
  defaultSort: { field: 'code', dir: 'asc' },
  listColumns: [
    { field: 'code', label: 'Code', mono: true },
    { field: 'name', label: 'Name' },
  ],
  fields: [
    { name: 'code', label: 'Code', type: 'text', required: true, description: 'Short code (e.g. RED, BLK, NAV)' },
    { name: 'name', label: 'Name', type: 'text', required: true, description: 'Colour name (e.g. Navy)' },
  ],
  createTool: 'create_colour', updateTool: 'update_colour', listTool: 'list_colours',
  legacyForms: ['FrmShadeEntry'],
}
