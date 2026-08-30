// SPEC-M22 — keypad-operator mode: the PURE surface projection + the wiring
// contract. The component (keypad-mode.tsx) renders these as big touch
// targets; pages branch on ?mode=keypad. The keypad door calls the SAME
// planDocAction/commitDocAction server actions DocScreen uses (ADR-001).
import type { DocConfig } from './doc-configs/types'

/** A big-target keypad field (the projection of a DocConfig header field). */
export interface KeypadField {
  name: string
  label: string
  type: 'text' | 'number' | 'date' | 'select' | 'picker'
  options?: { value: string; label: string }[]
  /** master slug for the picker feed (/api/erp?resource=master_search) */
  picker?: string
  /** master record field the picker emits (DocPicker ERRATUM 1 default) */
  pickerValueField?: string
}

/**
 * Project a doc-config's headerFields to the stripped operator surface:
 * REQUIRED fields only (optional fields stay on the full DocScreen — the
 * operator surface is minimal by design), readonly fields dropped, the
 * auto-number field (config.numberField) dropped — the service assigns it.
 */
export function keypadFieldsFor(config: DocConfig): KeypadField[] {
  return config.headerFields
    .filter((f) => f.type !== 'readonly')
    .filter((f) => f.name !== config.numberField)
    .filter((f) => f.required)
    .map((f) => ({
      name: f.name,
      label: f.label,
      type: (f.type === 'picker' ? 'picker' : f.type) as KeypadField['type'],
      options: f.options,
      picker: f.picker,
      pickerValueField: f.pickerValueField,
    }))
}

/** The shipped keypad surfaces (slug → operator title + route). The wiring
 *  contract: each route's page branches on ?mode=keypad and renders
 *  KeypadMode with these fields. Header-only families + the M25 line-grid
 *  despatch surface (lineFields via keypadLinesFor). */
export const KEYPAD_SURFACES: Record<string, { route: string; title: string }> = {
  production: { route: '/production/entry', title: 'Production Tally' },
  cut: { route: '/cutting/job-order', title: 'Cut Order' },
  'waste-receipt': { route: '/inventory/waste-receipt', title: 'Waste Receipt' },
  despatch: { route: '/pieces/despatch', title: 'Pcs Despatch' },
}

/** SPEC-M25 — the line projection (the header discipline verbatim):
 * required-only, readonly/optional stay on the full DocScreen. */
export function keypadLinesFor(config: DocConfig): KeypadField[] {
  return (config.lineFields ?? [])
    .filter((f) => f.type !== 'readonly')
    .filter((f) => f.required)
    .map((f) => ({
      name: f.name,
      label: f.label,
      type: (f.type === 'picker' ? 'picker' : f.type) as KeypadField['type'],
      options: f.options,
      picker: f.picker,
      pickerValueField: f.pickerValueField,
    }))
}

/** SPEC-M25 — one operator DC is short; the full DocScreen handles bigger. */
export const KEYPAD_LINES_MAX = 20

/** Dates default to today (the M17 reflex convention), ISO local (en-CA). */
export function keypadDefaultFor(field: KeypadField): string {
  if (field.type === 'date') return new Date().toLocaleDateString('en-CA')
  return ''
}
