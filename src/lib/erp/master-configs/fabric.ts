import type { MasterConfig } from './types'

// SPEC-M2 §3 row 14 · legacy FrmFabricmaster, FrmMasFabric
// ERRATUM 2: diaValue has refCreateOnFly (legacy create_fabric auto-creates Dia)
export const fabricConfig: MasterConfig = {
  slug: 'fabric', entity: 'fabric', label: 'Fabrics', singular: 'Fabric',
  delegate: 'fabric', model: 'Fabric', category: 'product',
  codeField: 'code', codePrefix: 'F-', codePad: 4,
  titleField: 'construction',
  searchFields: ['code', 'construction', 'diaValue', 'uomName'],
  defaultSort: { field: 'code', dir: 'asc' },
  listColumns: [
    { field: 'code', label: 'Code', mono: true },
    { field: 'construction', label: 'Construction' },
    { field: 'gsm', label: 'GSM', numeric: true },
    { field: 'width', label: 'Width', numeric: true },
    { field: 'diaValue', label: 'Dia', refEntity: 'dia' },
    { field: 'uomName', label: 'UOM', refEntity: 'uom' },
    { field: 'rate', label: 'Rate ₹', numeric: true },
  ],
  fields: [
    { name: 'code', label: 'Code', type: 'text', description: 'Auto-assigned F-#### if omitted' },
    { name: 'construction', label: 'Construction', type: 'text', description: 'e.g. Single Jersey, Rib 1x1' },
    { name: 'gsm', label: 'GSM', type: 'number' },
    { name: 'width', label: 'Width (inches)', type: 'number' },
    { name: 'diaValue', label: 'Dia', type: 'text', refEntity: 'dia', refCreateOnFly: true, description: 'Machine dia value (e.g. "26") — created if missing' },
    { name: 'uomCode', label: 'UOM', type: 'text', required: true, refEntity: 'uom', description: 'UOM code (e.g. KGS) or name' },
    { name: 'rate', label: 'Rate ₹', type: 'number', defaultValue: 0 },
  ],
  createTool: 'create_fabric', updateTool: 'update_fabric', listTool: 'list_fabrics',
  legacyForms: ['FrmFabricmaster', 'FrmMasFabric'],
}
