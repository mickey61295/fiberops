import type { MasterConfig } from './types'

// SPEC-M2 §3 row 11 · legacy FrmCountGroup
export const uomConfig: MasterConfig = {
  slug: 'uom', entity: 'uom', label: 'Units of Measure', singular: 'UOM',
  delegate: 'uOM', model: 'UOM', category: 'product',
  codeField: 'code', titleField: 'name',
  searchFields: ['code', 'name'],
  defaultSort: { field: 'code', dir: 'asc' },
  listColumns: [
    { field: 'code', label: 'Code', mono: true },
    { field: 'name', label: 'Name' },
  ],
  fields: [
    { name: 'code', label: 'Code', type: 'text', required: true, description: 'UOM code (KGS, MTR, PCS, BAG)' },
    { name: 'name', label: 'Name', type: 'text', required: true, description: 'Full name (Kilogram, Metre…)' },
  ],
  createTool: 'create_uom', updateTool: 'update_uom', listTool: 'list_uoms',
  legacyForms: ['FrmCountGroup'],
}
