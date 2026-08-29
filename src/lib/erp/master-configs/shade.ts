import type { MasterConfig } from './types'

// SPEC-M19 §3 Wave C (ADR-019) — legacy FrmShadeEntry.
export const shadeConfig: MasterConfig = {
  slug: 'shade', entity: 'shade', label: 'Shades', singular: 'Shade',
  delegate: 'shade', model: 'Shade', category: 'product',
  codeField: 'code', codePrefix: 'SHD-', titleField: 'name',
  searchFields: ["code","name"],
  defaultSort: { field: 'code', dir: 'asc' },
  listColumns: [
    {field: 'code',label: 'Code',mono: true},
    {field: 'name',label: 'Name'},
    {field: 'notes',label: 'Notes'},
  ],
  fields: [
    {name: 'code',label: 'Code',type: 'text',description: 'Optional — auto-assigned SHD-#### if omitted'},
    {name: 'name',label: 'Name',type: 'text',required: true},
    {name: 'notes',label: 'Notes',type: 'textarea',description: 'Dye depth / colour family (shade ≠ colour in dyeing)'},
  ],
  createTool: 'create_shade', updateTool: 'update_shade', listTool: 'list_shades',
  legacyForms: ['FrmShadeEntry'],
}
