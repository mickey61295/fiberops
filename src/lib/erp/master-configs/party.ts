import type { MasterConfig } from './types'

// SPEC-M2 §3 row 1 · legacy FrmPartyMaster, FrmPartyBlnc, FrmPartyBalanceRegister
export const partyConfig: MasterConfig = {
  slug: 'party', entity: 'party', label: 'Parties', singular: 'Party',
  delegate: 'party', model: 'Party', category: 'commercial',
  codeField: 'code', codePrefix: 'PRT-', codePad: 4,
  titleField: 'name',
  searchFields: ['code', 'name', 'partyType', 'gstin', 'city', 'state', 'phone'],
  defaultSort: { field: 'code', dir: 'asc' },
  listColumns: [
    { field: 'code', label: 'Code', mono: true },
    { field: 'name', label: 'Name' },
    { field: 'partyType', label: 'Type' },
    { field: 'gstin', label: 'GSTIN' },
    { field: 'city', label: 'City' },
    { field: 'state', label: 'State' },
  ],
  fields: [
    { name: 'name', label: 'Name', type: 'text', required: true, description: 'Full legal / trade name of the party' },
    { name: 'partyType', label: 'Type', type: 'select', required: true, defaultValue: 'supplier',
      options: [
        { value: 'supplier', label: 'Supplier' },
        { value: 'customer', label: 'Customer' },
        { value: 'both', label: 'Both' },
        // HFX-07 (Phase-6B Batch 0) — the wage-payment picker filters to
        // partyType='employee' (doc-configs/wage-payments.ts ERRATUM 7); the
        // master could never PRODUCE one, so the picker was permanently empty.
        { value: 'employee', label: 'Employee (wage payouts)' },
      ], description: 'supplier | customer | both | employee (wage payouts)' },
    { name: 'gstin', label: 'GSTIN', type: 'text', description: 'GST identification number (15 chars)' },
    { name: 'pan', label: 'PAN', type: 'text' },
    { name: 'address', label: 'Address', type: 'textarea' },
    { name: 'city', label: 'City', type: 'text' },
    { name: 'state', label: 'State', type: 'text' },
    { name: 'phone', label: 'Phone', type: 'text' },
    { name: 'email', label: 'Email', type: 'text' },
    { name: 'openingBalance', label: 'Opening balance (₹)', type: 'number', defaultValue: 0 },
  ],
  createTool: 'create_party', updateTool: 'update_party', listTool: 'list_parties',
  legacyForms: ['FrmPartyMaster', 'FrmPartyBlnc', 'FrmPartyBalanceRegister'],
}
