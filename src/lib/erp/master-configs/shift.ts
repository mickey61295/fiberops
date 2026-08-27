import type { MasterConfig } from './types'

// SPEC-M5 §7-D-32 (ADR-015) — Shifts & Hours master (legacy frmHours /
// FrmHourlySetting1). Routed at /hr/shifts (NOT /masters/shift — §9: the
// hr hub card links it; the masters engine renders it either way).
export const shiftConfig: MasterConfig = {
  slug: 'shift',
  entity: 'shift',
  label: 'Shifts & Hours',
  singular: 'Shift',
  delegate: 'shift',
  model: 'Shift',
  category: 'org',
  codeField: 'code',
  codePrefix: 'SH',
  codePad: 2,
  titleField: 'name',
  searchFields: ['code', 'name', 'fromTime', 'toTime'],
  defaultSort: { field: 'code', dir: 'asc' },
  listColumns: [
    { field: 'code', label: 'Code', mono: true },
    { field: 'name', label: 'Name' },
    { field: 'fromTime', label: 'From' },
    { field: 'toTime', label: 'To' },
    { field: 'hours', label: 'Hours', numeric: true },
  ],
  fields: [
    { name: 'code', label: 'Code', type: 'text', description: 'Shift code (e.g. SH01, GENERAL, NIGHT)' },
    { name: 'name', label: 'Name', type: 'text', required: true, description: 'Shift name (e.g. General Shift, A Shift)' },
    { name: 'fromTime', label: 'From (HH:MM)', type: 'text', required: true, description: 'Start time 24h (e.g. 06:00)' },
    { name: 'toTime', label: 'To (HH:MM)', type: 'text', required: true, description: 'End time 24h (e.g. 14:00)' },
    { name: 'hours', label: 'Hours', type: 'number', defaultValue: 8, description: 'Shift length in hours (default 8)' },
  ],
  createTool: 'create_shift',
  updateTool: 'update_shift',
  listTool: 'list_shifts',
  legacyForms: ['frmHours', 'FrmHourlySetting1'],
  notes: 'Wave D MT item — masterCreateTool/masterUpdateTool factory entries (M2 pattern); the hours default 8 keeps frmHours semantics.',
}
