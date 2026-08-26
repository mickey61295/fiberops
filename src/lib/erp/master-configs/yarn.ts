import type { MasterConfig } from './types'

// SPEC-M2 §3 row 13 · legacy FrmMill
export const yarnConfig: MasterConfig = {
  slug: 'yarn', entity: 'yarn', label: 'Yarns', singular: 'Yarn',
  delegate: 'yarn', model: 'Yarn', category: 'product',
  codeField: 'code', codePrefix: 'Y-', codePad: 4,
  titleField: 'count',
  searchFields: ['code', 'count', 'blend', 'uomName'],
  defaultSort: { field: 'code', dir: 'asc' },
  listColumns: [
    { field: 'code', label: 'Code', mono: true },
    { field: 'count', label: 'Count' },
    { field: 'blend', label: 'Blend' },
    { field: 'uomName', label: 'UOM', refEntity: 'uom' },
    { field: 'rate', label: 'Rate ₹', numeric: true },
  ],
  fields: [
    { name: 'code', label: 'Code', type: 'text', description: 'Auto-assigned Y-#### if omitted' },
    { name: 'count', label: 'Count', type: 'text', required: true, description: 'Yarn count (e.g. 30s, 40s)' },
    { name: 'blend', label: 'Blend', type: 'text', description: 'Fibre blend (e.g. 100% Cotton, CVC 60/40)' },
    { name: 'uomCode', label: 'UOM', type: 'text', required: true, refEntity: 'uom', description: 'UOM code (e.g. KGS) or name' },
    { name: 'rate', label: 'Rate ₹', type: 'number', defaultValue: 0 },
  ],
  createTool: 'create_yarn', updateTool: 'update_yarn', listTool: 'list_yarns',
  legacyForms: ['FrmMill'],
}
