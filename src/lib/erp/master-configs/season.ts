import type { MasterConfig } from './types'

// SPEC-M2 §3 row 5
export const seasonConfig: MasterConfig = {
  slug: 'season', entity: 'season', label: 'Seasons', singular: 'Season',
  delegate: 'season', model: 'Season', category: 'commercial',
  codeField: 'code', titleField: 'name',
  searchFields: ['code', 'name'],
  defaultSort: { field: 'code', dir: 'asc' },
  listColumns: [
    { field: 'code', label: 'Code', mono: true },
    { field: 'name', label: 'Name' },
    { field: 'startDate', label: 'Start' },
    { field: 'endDate', label: 'End' },
  ],
  fields: [
    { name: 'code', label: 'Code', type: 'text', required: true, description: 'Season code (e.g. SS25, AW25)' },
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'startDate', label: 'Start date', type: 'date', description: 'ISO date' },
    { name: 'endDate', label: 'End date', type: 'date', description: 'ISO date' },
  ],
  createTool: 'create_season', updateTool: 'update_season', listTool: 'list_seasons',
  legacyForms: [],
}
