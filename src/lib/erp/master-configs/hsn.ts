import type { MasterConfig } from './types'

// SPEC-M6 §2 row 34 / §7-D-2 (ADR-016) — HSN + GST rates master.
// Routed at /accounts/hsn-gst (Wave D item, config lands with ADR-016 in B).
export const hsnConfig: MasterConfig = {
  slug: 'hsn', entity: 'hsn', label: 'HSN & GST Rates', singular: 'HSN Code',
  delegate: 'hsn', model: 'Hsn', category: 'admin',
  codeField: 'code', titleField: 'description',
  searchFields: ['code', 'description'],
  defaultSort: { field: 'code', dir: 'asc' },
  listColumns: [
    { field: 'code', label: 'HSN Code', mono: true },
    { field: 'description', label: 'Description' },
    { field: 'gstRate', label: 'GST %', numeric: true },
    { field: 'hsnType', label: 'Type' },
  ],
  fields: [
    { name: 'code', label: 'HSN Code', type: 'text', required: true, description: 'e.g. 61091000 (T-shirts, knitted)' },
    { name: 'description', label: 'Description', type: 'text', required: true, description: 'What the code covers' },
    { name: 'gstRate', label: 'GST Rate %', type: 'number', defaultValue: 5, description: 'e.g. 5, 12, 18' },
    { name: 'hsnType', label: 'Type', type: 'select', options: [
      { value: 'goods', label: 'Goods' }, { value: 'service', label: 'Service' },
    ], defaultValue: 'goods', description: 'Goods or service code' },
  ],
  createTool: 'create_hsn', updateTool: 'update_hsn', listTool: 'list_hsns',
  legacyForms: ['FrmHsnMaster'],
  notes: 'Wave D MT item (#34) — config + factory tools land with ADR-016 (Wave B) to avoid a second schema session.',
}
