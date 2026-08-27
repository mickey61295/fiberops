import type { MasterConfig } from './types'

// SPEC-M6 §7-B-2 (ADR-016) — App options (legacy frmOptions/FrmOptionsPrint).
// key unique; the app READS print.companyName/address/gstin (report + doc
// print headers via getPrintHeader) and default.godownCode (picker seed).
export const appOptionConfig: MasterConfig = {
  slug: 'app-option', entity: 'appOption', label: 'Options & Settings', singular: 'Option',
  delegate: 'appOption', model: 'AppOption', category: 'admin',
  codeField: 'key', titleField: 'label',
  searchFields: ['key', 'label', 'value', 'group'],
  defaultSort: { field: 'key', dir: 'asc' },
  listColumns: [
    { field: 'key', label: 'Key', mono: true },
    { field: 'label', label: 'Label' },
    { field: 'value', label: 'Value' },
    { field: 'group', label: 'Group' },
  ],
  fields: [
    { name: 'key', label: 'Key', type: 'text', required: true, description: 'Dot key — print.companyName | print.address | print.gstin | default.godownCode | app.currency' },
    { name: 'label', label: 'Label', type: 'text', required: true, description: 'Human label (e.g. Company Name)' },
    { name: 'value', label: 'Value', type: 'text', required: true, description: 'The option value' },
    { name: 'group', label: 'Group', type: 'select', options: [
      { value: 'print', label: 'Print' }, { value: 'defaults', label: 'Defaults' },
      { value: 'general', label: 'General' },
    ], defaultValue: 'general', description: 'Options group (print headers | defaults | general)' },
  ],
  createTool: 'create_app_option', updateTool: 'update_app_option', listTool: 'list_app_options',
  legacyForms: ['frmOptions', 'FrmOptionsPrint'],
  notes: 'Read by getPrintHeader() (report-csv.ts) and pickers; group=print keys render on every print header.',
}
