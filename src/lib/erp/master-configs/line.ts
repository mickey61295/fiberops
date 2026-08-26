import type { MasterConfig } from './types'

// SPEC-M2 §3 row 22
export const lineConfig: MasterConfig = {
  slug: 'line', entity: 'line', label: 'Production Lines', singular: 'Line',
  delegate: 'line', model: 'Line', category: 'org',
  codeField: 'code', titleField: 'name',
  searchFields: ['code', 'name', 'deptName'],
  defaultSort: { field: 'code', dir: 'asc' },
  listColumns: [
    { field: 'code', label: 'Code', mono: true },
    { field: 'name', label: 'Name' },
    { field: 'deptName', label: 'Dept', refEntity: 'department' },
    { field: 'capacityPcsPerHour', label: 'Capacity pcs/hr', numeric: true },
  ],
  fields: [
    { name: 'code', label: 'Code', type: 'text', required: true, description: 'Line code (e.g. L1, L2)' },
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'deptCode', label: 'Department', type: 'text', refEntity: 'department', description: 'Dept code (e.g. D4 = sewing) or name' },
    { name: 'capacityPcsPerHour', label: 'Capacity pcs/hr', type: 'number', defaultValue: 0 },
  ],
  createTool: 'create_line', updateTool: 'update_line', listTool: 'list_lines',
  legacyForms: [],
}
