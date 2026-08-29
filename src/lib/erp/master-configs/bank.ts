import type { MasterConfig } from './types'

// SPEC-M19 §3 Wave C (ADR-019) — legacy FrmBankMaster / FrmMasBank.
export const bankConfig: MasterConfig = {
  slug: 'bank', entity: 'bank', label: 'Banks', singular: 'Bank',
  delegate: 'bank', model: 'Bank', category: 'commercial',
  codeField: 'code', codePrefix: 'BK-', titleField: 'name',
  searchFields: ['code', 'name'],
  defaultSort: { field: 'code', dir: 'asc' },
  listColumns: [
    { field: 'code', label: 'Code', mono: true },
    { field: 'name', label: 'Name' },
  ],
  fields: [
    { name: 'code', label: 'Code', type: 'text', description: 'Optional — auto-assigned BK-#### if omitted' },
    { name: 'name', label: 'Name', type: 'text', required: true },
  ],
  createTool: 'create_bank', updateTool: 'update_bank', listTool: 'list_banks',
  legacyForms: ['FrmBankMaster', 'FrmMasBank'],
}
