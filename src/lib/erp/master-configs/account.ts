import type { MasterConfig } from './types'

// SPEC-M50 M-01 — the chart of accounts master. Rides the M2 engine: auto
// CRUD pages at /masters/account, create/update factory tools, list door.
// parentCode is a SELF-FK (refEntity 'account' → parentId via the
// master-service OVERRIDES — the generic `${refEntity}Id` mapping cannot
// know a self-relation). Seeded rows carry the classic numeric codes
// ('1010' Cash/Bank …); user rows auto-code ACC-####.
export const accountConfig: MasterConfig = {
  slug: 'account', entity: 'account', label: 'Accounts (CoA)', singular: 'Account',
  delegate: 'account', model: 'Account', category: 'org',
  codeField: 'code', codePrefix: 'ACC-', titleField: 'name',
  searchFields: ['code', 'name', 'type', 'parentName', 'active'],
  defaultSort: { field: 'code', dir: 'asc' },
  listColumns: [
    { field: 'code', label: 'Code', mono: true },
    { field: 'name', label: 'Name' },
    { field: 'type', label: 'Type' },
    { field: 'parentName', label: 'Parent', refEntity: 'account' },
    { field: 'active', label: 'Active' },
  ],
  fields: [
    { name: 'code', label: 'Code', type: 'text', description: 'Optional — auto-assigned ACC-#### if omitted; the seeded standard tree uses numeric codes (1010 Cash/Bank, 5010 Production Wages …)' },
    { name: 'name', label: 'Name', type: 'text', required: true },
    {
      name: 'type', label: 'Type', type: 'select', required: true, defaultValue: 'expense',
      options: [
        { value: 'asset', label: 'Asset' },
        { value: 'liability', label: 'Liability' },
        { value: 'income', label: 'Income' },
        { value: 'expense', label: 'Expense' },
        { value: 'equity', label: 'Equity' },
      ],
      description: 'The classical 5-way split — trial-balance side derives from it (M-03)',
    },
    { name: 'parentCode', label: 'Parent', type: 'text', refEntity: 'account', description: 'Optional parent account code (e.g. 5000 Direct Expenses) or name — the tree is 2 levels in the seed' },
    { name: 'active', label: 'Active', type: 'checkbox', defaultValue: true, description: 'Inactive accounts stay for history but resolve off new vouchers' },
  ],
  createTool: 'create_account', updateTool: 'update_account', listTool: 'list_accounts',
  legacyForms: ['FrmAccountMaster'],
  notes: 'SPEC-M50 M-01 — journal legs resolve by exact name OR code; unknown legs are REFUSED (create them here first).',
}
