import type { MasterConfig } from './types'

// SPEC-M2 §3 row 24 · legacy frmFcymaster · renders at /masters/fin-year AND /admin/company
export const finYearConfig: MasterConfig = {
  slug: 'fin-year', entity: 'finYear', label: 'Financial Years', singular: 'Fin Year',
  delegate: 'finYear', model: 'FinYear', category: 'admin',
  codeField: 'code', titleField: 'name',
  searchFields: ['code', 'name'],
  defaultSort: { field: 'code', dir: 'desc' },
  listColumns: [
    { field: 'code', label: 'Code', mono: true },
    { field: 'name', label: 'Name' },
    { field: 'start', label: 'Start' },
    { field: 'end', label: 'End' },
    { field: 'active', label: 'Active' },
  ],
  fields: [
    { name: 'code', label: 'Code', type: 'text', required: true, description: 'e.g. 24-25, 25-26' },
    { name: 'name', label: 'Name', type: 'text', required: true, description: 'e.g. FY 2024-25' },
    { name: 'start', label: 'Start date', type: 'date', required: true, description: 'ISO date' },
    { name: 'end', label: 'End date', type: 'date', required: true, description: 'ISO date' },
    { name: 'active', label: 'Active (current FY)', type: 'checkbox', defaultValue: false, description: 'Set true to make this the current posting year — deactivates others' },
  ],
  createTool: 'create_fin_year', updateTool: 'update_fin_year', listTool: 'list_fin_years',
  legacyForms: ['frmFcymaster'],
  notes: 'service invariant: setting active=true deactivates all other years (SPEC-M2 §6.8)',
}
