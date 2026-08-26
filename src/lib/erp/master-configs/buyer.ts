import type { MasterConfig } from './types'

// SPEC-M2 §3 row 2 · legacy FRMBUYER, FrmMasBuyerDept
export const buyerConfig: MasterConfig = {
  slug: 'buyer', entity: 'buyer', label: 'Buyers', singular: 'Buyer',
  delegate: 'buyer', model: 'Buyer', category: 'commercial',
  codeField: 'code', codePrefix: 'B-', codePad: 4,
  titleField: 'name',
  searchFields: ['code', 'name', 'dept', 'merchandiser'],
  defaultSort: { field: 'code', dir: 'asc' },
  listColumns: [
    { field: 'code', label: 'Code', mono: true },
    { field: 'name', label: 'Name' },
    { field: 'dept', label: 'Dept' },
    { field: 'merchandiser', label: 'Merchandiser' },
  ],
  fields: [
    { name: 'name', label: 'Name', type: 'text', required: true, description: 'Buyer / brand department name' },
    { name: 'dept', label: 'Dept', type: 'text', description: 'Buyer department (e.g. Kids, Mens)' },
    { name: 'merchandiser', label: 'Merchandiser', type: 'text', description: 'Merchandiser name (free text)' },
  ],
  createTool: 'create_buyer', updateTool: 'update_buyer', listTool: 'list_buyers',
  legacyForms: ['FRMBUYER', 'FrmMasBuyerDept'],
}
