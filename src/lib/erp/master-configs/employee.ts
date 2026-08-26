import type { MasterConfig } from './types'

// SPEC-M2 §3 row 21 · legacy FrmEmpmaster
export const employeeConfig: MasterConfig = {
  slug: 'employee', entity: 'employee', label: 'Employees', singular: 'Employee',
  delegate: 'employee', model: 'Employee', category: 'org',
  codeField: 'code', codePrefix: 'EMP-', codePad: 4,
  titleField: 'name',
  searchFields: ['code', 'name', 'deptName', 'role'],
  defaultSort: { field: 'code', dir: 'asc' },
  listColumns: [
    { field: 'code', label: 'Code', mono: true },
    { field: 'name', label: 'Name' },
    { field: 'deptName', label: 'Dept', refEntity: 'department' },
    { field: 'role', label: 'Role' },
    { field: 'pieceRate', label: 'Piece rate ₹', numeric: true },
    { field: 'dailyWage', label: 'Daily wage ₹', numeric: true },
    { field: 'active', label: 'Active' },
  ],
  fields: [
    { name: 'code', label: 'Code', type: 'text', description: 'Auto-assigned EMP-#### if omitted' },
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'deptCode', label: 'Department', type: 'text', refEntity: 'department', description: 'Dept code (e.g. D4) or name' },
    { name: 'role', label: 'Role', type: 'select',
      options: [
        { value: 'operator', label: 'Operator' },
        { value: 'supervisor', label: 'Supervisor' },
        { value: 'helper', label: 'Helper' },
        { value: 'staff', label: 'Staff' },
      ] },
    { name: 'pieceRate', label: 'Piece rate ₹', type: 'number', defaultValue: 0 },
    { name: 'dailyWage', label: 'Daily wage ₹', type: 'number', defaultValue: 0 },
    { name: 'active', label: 'Active', type: 'checkbox', defaultValue: true },
  ],
  createTool: 'create_employee', updateTool: 'update_employee', listTool: 'list_employees',
  legacyForms: ['FrmEmpmaster'],
}
