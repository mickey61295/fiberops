import type { MasterConfig } from './types'

// SPEC-M19 §3 Wave C (ADR-019) — legacy FrmStateMaster.
export const stateConfig: MasterConfig = {
  slug: 'state', entity: 'state', label: 'States', singular: 'State',
  delegate: 'state', model: 'State', category: 'admin',
  codeField: 'code', codePrefix: 'ST-', titleField: 'name',
  searchFields: ["code","name","gstCode"],
  defaultSort: { field: 'code', dir: 'asc' },
  listColumns: [
    {field: 'code',label: 'Code',mono: true},
    {field: 'name',label: 'Name'},
    {field: 'gstCode',label: 'GST code',mono: true},
  ],
  fields: [
    {name: 'code',label: 'Code',type: 'text',description: 'Optional — auto-assigned ST-#### if omitted'},
    {name: 'name',label: 'Name',type: 'text',required: true},
    {name: 'gstCode',label: 'GST code',type: 'text',description: 'First 2 digits of GSTIN (33 = Tamil Nadu)'},
  ],
  createTool: 'create_state', updateTool: 'update_state', listTool: 'list_states',
  legacyForms: ['FrmStateMaster'],
}
