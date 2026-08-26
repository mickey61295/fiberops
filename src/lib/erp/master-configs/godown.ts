import type { MasterConfig } from './types'

// SPEC-M2 §3 row 19 · legacy FrmGodownMaster
export const godownConfig: MasterConfig = {
  slug: 'godown', entity: 'godown', label: 'Godowns', singular: 'Godown',
  delegate: 'godown', model: 'Godown', category: 'org',
  codeField: 'code', codePrefix: 'G', codePad: 0,
  titleField: 'name',
  searchFields: ['code', 'name', 'location'],
  defaultSort: { field: 'code', dir: 'asc' },
  listColumns: [
    { field: 'code', label: 'Code', mono: true },
    { field: 'name', label: 'Name' },
    { field: 'location', label: 'Location' },
  ],
  fields: [
    { name: 'code', label: 'Code', type: 'text', description: 'Auto-assigned G#### if omitted' },
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'location', label: 'Location', type: 'text' },
  ],
  createTool: 'create_godown', updateTool: 'update_godown', listTool: 'list_godowns',
  legacyForms: ['FrmGodownMaster'],
}
