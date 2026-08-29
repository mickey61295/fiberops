import type { MasterConfig } from './types'

// SPEC-M19 §3 Wave C (ADR-019) — legacy FrmThreadTypeMaster.
export const threadTypeConfig: MasterConfig = {
  slug: 'thread-type', entity: 'threadType', label: 'Thread Types', singular: 'Thread Type',
  delegate: 'threadType', model: 'ThreadType', category: 'product',
  codeField: 'code', codePrefix: 'THR-', titleField: 'name',
  searchFields: ["code","name"],
  defaultSort: { field: 'code', dir: 'asc' },
  listColumns: [
    {field: 'code',label: 'Code',mono: true},
    {field: 'name',label: 'Name'},
  ],
  fields: [
    {name: 'code',label: 'Code',type: 'text',description: 'Optional — auto-assigned THR-#### if omitted'},
    {name: 'name',label: 'Name',type: 'text',required: true},
    {name: 'notes',label: 'Notes',type: 'textarea'},
  ],
  createTool: 'create_thread_type', updateTool: 'update_thread_type', listTool: 'list_thread_types',
  legacyForms: ['FrmThreadTypeMaster'],
}
