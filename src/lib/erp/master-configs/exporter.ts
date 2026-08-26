import type { MasterConfig } from './types'

// SPEC-M2 §3 row 4
export const exporterConfig: MasterConfig = {
  slug: 'exporter', entity: 'exporter', label: 'Exporters', singular: 'Exporter',
  delegate: 'exporter', model: 'Exporter', category: 'commercial',
  codeField: 'code', titleField: 'name',
  searchFields: ['code', 'name', 'iec', 'gstin'],
  defaultSort: { field: 'code', dir: 'asc' },
  listColumns: [
    { field: 'code', label: 'Code', mono: true },
    { field: 'name', label: 'Name' },
    { field: 'iec', label: 'IEC' },
    { field: 'gstin', label: 'GSTIN' },
  ],
  fields: [
    { name: 'code', label: 'Code', type: 'text', required: true, description: 'Exporter code' },
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'iec', label: 'IEC', type: 'text', description: 'Import Export Code' },
    { name: 'gstin', label: 'GSTIN', type: 'text' },
  ],
  createTool: 'create_exporter', updateTool: 'update_exporter', listTool: 'list_exporters',
  legacyForms: [],
}
