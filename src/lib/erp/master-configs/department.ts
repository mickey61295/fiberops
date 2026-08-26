import type { MasterConfig } from './types'

// SPEC-M2 §3 row 20 · legacy FrmDeptMasterNew, frmDeptGroup
export const departmentConfig: MasterConfig = {
  slug: 'department', entity: 'department', label: 'Departments', singular: 'Department',
  delegate: 'department', model: 'Department', category: 'org',
  codeField: 'code', codePrefix: 'D', codePad: 0,
  titleField: 'name',
  searchFields: ['code', 'name'],
  defaultSort: { field: 'orderSno', dir: 'asc' },
  listColumns: [
    { field: 'code', label: 'Code', mono: true },
    { field: 'name', label: 'Name' },
    { field: 'orderSno', label: 'Order', numeric: true },
    { field: 'isProcess', label: 'Process?' },
  ],
  fields: [
    { name: 'code', label: 'Code', type: 'text', description: 'Auto-assigned D#### if omitted' },
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'orderSno', label: 'Sort order', type: 'number', defaultValue: 0 },
    { name: 'isProcess', label: 'Is a process stage?', type: 'checkbox', defaultValue: false, description: 'true for knitting/dyeing/printing style process depts' },
  ],
  createTool: 'create_department', updateTool: 'update_department', listTool: 'list_departments',
  legacyForms: ['FrmDeptMasterNew', 'frmDeptGroup'],
}
