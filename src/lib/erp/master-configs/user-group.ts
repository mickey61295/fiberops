import type { MasterConfig } from './types'

// SPEC-M6 §7-B-2 (ADR-016) — User groups master (legacy FrmUserGroupMas).
// rights is the menu-rights matrix payload (Json array of menu group ids;
// [] = all) — edited via /admin/menu-rights, kept out of the master form.
export const userGroupConfig: MasterConfig = {
  slug: 'user-group', entity: 'userGroup', label: 'User Groups', singular: 'User Group',
  delegate: 'userGroup', model: 'UserGroup', category: 'admin',
  codeField: 'name', titleField: 'name',
  searchFields: ['name'],
  defaultSort: { field: 'name', dir: 'asc' },
  listColumns: [
    { field: 'name', label: 'Group' },
  ],
  fields: [
    { name: 'name', label: 'Group Name', type: 'text', required: true, description: 'e.g. Admins, Merchandisers, Store — assign users via the Users tab; menu rights via Menu Rights' },
    { name: 'rights', label: 'Menu Rights', type: 'list', description: 'Menu group ids the group may see (array in tool, CSV in form; e.g. orders,production,inventory). EMPTY = all menus' },
  ],
  createTool: 'create_user_group', updateTool: 'update_user_group', listTool: 'list_user_groups',
  legacyForms: ['FrmUserGroupMas'],
  notes: 'rights is a list field (CSV in form, array in tool) — the /admin/menu-rights matrix and update_user_group share the SAME master-service door (ADR-001).',
}
