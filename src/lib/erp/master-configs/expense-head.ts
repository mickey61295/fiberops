import type { MasterConfig } from './types'

// SPEC-M54 M-05 (EH-01) — the expense HEAD master (legacy FrmMasExpenses
// port). Rides the M2 engine: auto CRUD at /masters/expense-head,
// create/update factory tools, list door. name is the natural key the
// expense door resolves (code OR name); glAccount is a PLAIN name-or-code
// preference — NOT an FK (the BankAccount.glAccountCode pattern): the
// expense door falls back to the category default + an honest note when
// the value is stale, never a refusal (THE HEAD REFINES, NEVER BLOCKS).
export const expenseHeadConfig: MasterConfig = {
  slug: 'expense-head', entity: 'expense-head', label: 'Expense Heads', singular: 'Expense Head',
  delegate: 'expenseHead', model: 'ExpenseHead', category: 'org',
  codeField: 'code', codePrefix: 'EXH-', titleField: 'name',
  searchFields: ['code', 'name', 'category', 'glAccount', 'active'],
  defaultSort: { field: 'name', dir: 'asc' },
  listColumns: [
    { field: 'code', label: 'Code', mono: true },
    { field: 'name', label: 'Head' },
    { field: 'category', label: 'Category' },
    { field: 'glAccount', label: 'GL Account' },
    { field: 'active', label: 'Active' },
  ],
  fields: [
    { name: 'code', label: 'Code', type: 'text', description: 'Optional — auto-assigned EXH-#### if omitted or taken' },
    { name: 'name', label: 'Head', type: 'text', required: true, description: 'The head name expenses are booked under (unique — create_expense resolves it by exact name or code)' },
    {
      name: 'category', label: 'Category', type: 'select', required: true, defaultValue: 'general',
      options: [
        { value: 'fixed', label: 'Fixed' },
        { value: 'stylewise', label: 'Stylewise (order-linked)' },
        { value: 'general', label: 'General' },
        { value: 'transport', label: 'Transport' },
        { value: 'other', label: 'Other' },
      ],
      description: 'The category expenses under this head store (stylewise requires the order on the expense door)',
    },
    { name: 'glAccount', label: 'GL Account', type: 'text', description: 'Optional — the default GL debit leg for expenses under this head (exact Account name or code, e.g. 5020 Freight). A stale value falls back to the category default (transport → Freight, else Other Expenses) with a note — never blocks' },
    { name: 'active', label: 'Active', type: 'checkbox', defaultValue: true, description: 'Inactive heads stay for history but refuse new expenses (reactivate to reuse)' },
  ],
  createTool: 'create_expense_head', updateTool: 'update_expense_head', listTool: 'list_expense_heads',
  legacyForms: ['FrmMasExpenses', 'FrmExpenseGroup'],
  notes: 'SPEC-M54 M-05 — the head sets the expense category + the default GL debit leg; the explicit glAccount argument still wins; unknown heads are refused on the expense door.',
}
