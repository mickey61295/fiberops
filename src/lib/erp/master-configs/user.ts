import type { MasterConfig } from './types'

// SPEC-M6 §7-B-2 (ADR-016 + ERRATUM #1) — Users master (legacy FrmMasuser).
// AMENDS the existing Phase-1 User model (email unique ≡ login; userGroupId +
// active added additively). Routed at /admin/users (?tab=users).
export const userConfig: MasterConfig = {
  slug: 'user', entity: 'user', label: 'Users', singular: 'User',
  delegate: 'user', model: 'User', category: 'admin',
  codeField: 'email', titleField: 'name',
  searchFields: ['email', 'name', 'role'],
  defaultSort: { field: 'email', dir: 'asc' },
  listColumns: [
    { field: 'email', label: 'Login', mono: true },
    { field: 'name', label: 'Name' },
    { field: 'role', label: 'Role' },
    { field: 'userGroupName', label: 'Group', refEntity: 'user-group' },
    { field: 'active', label: 'Active' },
  ],
  fields: [
    { name: 'email', label: 'Login (email)', type: 'text', required: true, description: 'Login id — the unique email (e.g. ravi@fiberops.in)' },
    { name: 'name', label: 'Name', type: 'text', required: true, description: 'Full name' },
    { name: 'role', label: 'Role', type: 'select', options: [
      { value: 'admin', label: 'Admin' }, { value: 'merchandiser', label: 'Merchandiser' },
      { value: 'storekeeper', label: 'Storekeeper' }, { value: 'accountant', label: 'Accountant' },
      { value: 'production_mgr', label: 'Production Mgr' }, { value: 'hr', label: 'HR' },
      { value: 'cutting_mgr', label: 'Cutting Mgr' },
    ], defaultValue: 'admin', description: 'Functional role — admins bypass menu rights and may set passwords (ADR-018); menu visibility otherwise reads the GROUP rights' },
    { name: 'userGroup', label: 'User Group', type: 'text', refEntity: 'user-group', description: 'Group name (e.g. Admins, Store) — drives the menu-rights matrix' },
    { name: 'active', label: 'Active', type: 'checkbox', defaultValue: true, description: 'Inactive users cannot log in and are logged out on their next request (SPEC-M7)' },
  ],
  createTool: 'create_user', updateTool: 'update_user', listTool: 'list_users',
  legacyForms: ['FrmMasuser'],
  notes: 'ADR-016 ERRATUM #1: the Phase-1 User model amended (userGroupId + active), not duplicated. Login = email.',
}
