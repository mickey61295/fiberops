import type { MasterConfig } from './types'

// SPEC-M2 §3 row 12
export const lotConfig: MasterConfig = {
  slug: 'lot', entity: 'lot', label: 'Lots', singular: 'Lot',
  delegate: 'lot', model: 'Lot', category: 'product',
  codeField: 'lotNo', codePrefix: 'LOT-', codePad: 4, updateKeyField: 'lotNo',
  titleField: 'lotNo',
  searchFields: ['lotNo', 'partyName'],
  defaultSort: { field: 'lotNo', dir: 'asc' },
  listColumns: [
    { field: 'lotNo', label: 'Lot No', mono: true },
    { field: 'partyName', label: 'Party', refEntity: 'party' },
  ],
  fields: [
    { name: 'lotNo', label: 'Lot No', type: 'text', description: 'Auto-assigned LOT-#### if omitted' },
    { name: 'partyCode', label: 'Party', type: 'text', refEntity: 'party', description: 'Party code or name (yarn supplier of the lot)' },
  ],
  createTool: 'create_lot', updateTool: 'update_lot', listTool: 'list_lots',
  legacyForms: [],
}
