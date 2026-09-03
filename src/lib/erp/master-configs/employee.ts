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
    { field: 'designation', label: 'Designation' }, // SPEC-M46 L-05
    { field: 'joiningDate', label: 'Joined' }, // SPEC-M46 L-05 — flattened display value
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
    // SPEC-M46 L-05 — payout + payslip fields (UAN/aadhaar are printed MASKED)
    { name: 'joiningDate', label: 'Joining date', type: 'date', description: 'ISO date — printed on the payslip' },
    { name: 'designation', label: 'Designation', type: 'text', description: 'e.g. Tailor, Line supervisor — printed on the payslip' },
    { name: 'phone', label: 'Phone', type: 'text', description: 'Contact number' },
    { name: 'bankName', label: 'Bank', type: 'text', description: 'Payout bank name (payslip pay-to block)' },
    { name: 'ifsc', label: 'IFSC', type: 'text', description: 'Payout bank IFSC' },
    { name: 'accountNo', label: 'Account no', type: 'text', description: 'Payout bank account number' },
    { name: 'upi', label: 'UPI', type: 'text', description: 'UPI id for quick payout' },
    { name: 'uan', label: 'UAN', type: 'text', description: 'Universal Account Number (PF) — stored as given, PRINTED MASKED on the payslip' },
    { name: 'aadhaar', label: 'Aadhaar', type: 'text', description: '12-digit id — stored as given, PRINTED MASKED (XXXX-XXXX-4839) on the payslip' },
    { name: 'active', label: 'Active', type: 'checkbox', defaultValue: true },
  ],
  createTool: 'create_employee', updateTool: 'update_employee', listTool: 'list_employees',
  legacyForms: ['FrmEmpmaster'],
}
