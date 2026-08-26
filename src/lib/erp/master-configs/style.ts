import type { MasterConfig } from './types'

// SPEC-M2 §3 row 6 · legacy FrmStyleMaster
export const styleConfig: MasterConfig = {
  slug: 'style', entity: 'style', label: 'Styles', singular: 'Style',
  delegate: 'style', model: 'Style', category: 'product',
  codeField: 'styleNo', codePrefix: 'STY-', codePad: 4,
  titleField: 'description',
  searchFields: ['styleNo', 'description', 'buyerName', 'category', 'hsn'],
  defaultSort: { field: 'styleNo', dir: 'asc' },
  listColumns: [
    { field: 'styleNo', label: 'Style No', mono: true },
    { field: 'description', label: 'Description' },
    { field: 'buyerName', label: 'Buyer', refEntity: 'buyer' },
    { field: 'category', label: 'Category' },
    { field: 'sam', label: 'SAM', numeric: true },
  ],
  fields: [
    { name: 'description', label: 'Description', type: 'text', required: true, description: 'Garment description (e.g. BOYS T-SHIRT)' },
    { name: 'buyerCode', label: 'Buyer', type: 'text', refEntity: 'buyer', description: 'Buyer code (B-0001) or buyer name' },
    { name: 'category', label: 'Category', type: 'select',
      options: [
        { value: 'knit', label: 'Knit' },
        { value: 'woven', label: 'Woven' },
        { value: 'other', label: 'Other' },
      ], description: 'knit | woven | other' },
    { name: 'sam', label: 'SAM (minutes)', type: 'number', description: 'Standard Allowed Minutes' },
    { name: 'hsn', label: 'HSN', type: 'text', description: 'HSN code for invoices' },
  ],
  createTool: 'create_style', updateTool: 'update_style', listTool: 'list_styles',
  legacyForms: ['FrmStyleMaster'],
}
