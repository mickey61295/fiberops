import type { MasterConfig } from './types'

// SPEC-M44 CST-01 — the cost component library (legacy FrmPreCostingCompMas).
// Cost-sheet heads QUOTE this library by code: type CC-0001 + qty on a cost
// sheet line and the rate resolves server-side. category maps onto the sheet
// heads (head inference when a line leaves head blank); rate is the money
// denominator; unit is DISPLAY text ("per kg", "per pc") — not a stock UOM FK.
// Rides the /masters hub (the HSN precedent — no menu item).
export const costComponentConfig: MasterConfig = {
  slug: 'cost-component', entity: 'costComponent', label: 'Cost Components', singular: 'Cost Component',
  delegate: 'costComponent', model: 'CostComponent', category: 'commercial',
  codeField: 'code', codePrefix: 'CC-', codePad: 4,
  titleField: 'name',
  searchFields: ['code', 'name', 'category'],
  defaultSort: { field: 'code', dir: 'asc' },
  listColumns: [
    { field: 'code', label: 'Code', mono: true },
    { field: 'name', label: 'Name' },
    { field: 'category', label: 'Category' },
    { field: 'unit', label: 'Unit' },
    { field: 'rate', label: 'Rate (₹)', numeric: true },
    { field: 'active', label: 'Active' },
  ],
  fields: [
    { name: 'code', label: 'Code', type: 'text', description: 'Optional — auto-assigned CC-#### if omitted' },
    { name: 'name', label: 'Name', type: 'text', required: true, description: 'e.g. Neck rib knitting, Carton packing, Sewing CM' },
    { name: 'category', label: 'Category', type: 'select', options: [
      { value: 'fabric', label: 'Fabric' },
      { value: 'trim', label: 'Trim' },
      { value: 'cm', label: 'CM / Labour' },
      { value: 'washing', label: 'Washing' },
      { value: 'packing', label: 'Packing' },
      { value: 'overhead', label: 'Overhead' },
      { value: 'other', label: 'Other' },
    ], defaultValue: 'other', description: 'The cost-sheet head this component quotes into' },
    { name: 'unit', label: 'Unit', type: 'text', description: 'Display text: per kg, per pc, per dozen…' },
    { name: 'rate', label: 'Rate (₹)', type: 'number', defaultValue: 0, description: 'The quoted rate (₹ per unit)' },
    { name: 'active', label: 'Active', type: 'checkbox', defaultValue: true, description: 'Inactive components are hidden from quoting' },
  ],
  createTool: 'create_cost_component', updateTool: 'update_cost_component', listTool: 'list_cost_components',
  legacyForms: ['FrmPreCostingCompMas'],
  notes: 'SPEC-M44 CST-01 — quoted by CostSheetLine (source=component); category drives head inference.',
}
