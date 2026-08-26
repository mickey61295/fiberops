import type { MasterConfig } from './types'

// SPEC-M2 §3 row 23 · legacy Frm_Mas_Holiday · NEW in M2 (no prior tool)
export const govtHolidayConfig: MasterConfig = {
  slug: 'govt-holiday', entity: 'govtHoliday', label: 'Govt Holidays', singular: 'Govt Holiday',
  delegate: 'govtHoliday', model: 'GovtHoliday', category: 'org',
  codeField: 'date', updateKeyField: 'date',
  titleField: 'name',
  searchFields: ['date', 'name'],
  defaultSort: { field: 'date', dir: 'desc' },
  listColumns: [
    { field: 'date', label: 'Date', mono: true },
    { field: 'name', label: 'Name' },
  ],
  fields: [
    { name: 'date', label: 'Date', type: 'date', required: true, description: 'ISO date of the holiday' },
    { name: 'name', label: 'Name', type: 'text', required: true, description: 'Holiday name (e.g. Pongal, Deepavali)' },
  ],
  createTool: 'create_govt_holiday', updateTool: 'update_govt_holiday', listTool: 'list_govt_holidays',
  legacyForms: ['Frm_Mas_Holiday'],
  notes: 'no unique key in schema — duplicate check is date+name pair',
}
