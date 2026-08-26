import type { MasterConfig } from './types'

// SPEC-M2 §3 row 15 · legacy FrmAccDescMaster, FrmAccmaster
export const accessoryConfig: MasterConfig = {
  slug: 'accessory', entity: 'accessory', label: 'Accessories', singular: 'Accessory',
  delegate: 'accessory', model: 'Accessory', category: 'product',
  codeField: 'code', codePrefix: 'A-', codePad: 4,
  titleField: 'name',
  searchFields: ['code', 'name', 'category', 'uomName'],
  defaultSort: { field: 'code', dir: 'asc' },
  listColumns: [
    { field: 'code', label: 'Code', mono: true },
    { field: 'name', label: 'Name' },
    { field: 'category', label: 'Category' },
    { field: 'uomName', label: 'UOM', refEntity: 'uom' },
    { field: 'rate', label: 'Rate ₹', numeric: true },
  ],
  fields: [
    { name: 'code', label: 'Code', type: 'text', description: 'Auto-assigned A-#### if omitted' },
    { name: 'name', label: 'Name', type: 'text', required: true, description: 'e.g. Zipper 5cm, Main Label' },
    { name: 'category', label: 'Category', type: 'text', description: 'e.g. packing, sewing, trims' },
    { name: 'uomCode', label: 'UOM', type: 'text', required: true, refEntity: 'uom', description: 'UOM code (e.g. PCS) or name' },
    { name: 'rate', label: 'Rate ₹', type: 'number', defaultValue: 0 },
  ],
  createTool: 'create_accessory', updateTool: 'update_accessory', listTool: 'list_accessories',
  legacyForms: ['FrmAccDescMaster', 'FrmAccmaster'],
}
