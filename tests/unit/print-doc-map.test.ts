/**
 * print-doc-map tests — SPEC-M17 §4-2 (updated SPEC-M18 §2-A1, SPEC-M33):
 * pin the doc-config→print bridge.
 * (1) every PRINT_DOC_BY_DOCTYPE value is a real PRINT_DOCS key;
 * (2) every PRINT_DOCS family is reachable — via a doc-config docType OR a
 *     documented non-config door (SPEC-M33's bundle-label/-labels print from
 *     the cut-order VIEW link + the get_bundle agent tool — labels OF a cut
 *     order, not a doc family of their own);
 * (3) every mapped docType exists in DOC_CONFIGS (no phantom entries).
 */
import { describe, it, expect } from 'vitest'
import { PRINT_DOC_BY_DOCTYPE } from '@/lib/erp/print/doc-type-map'
import { PRINT_DOCS, getPrintDocTypes } from '@/lib/erp/print'
import { DOC_CONFIGS } from '@/lib/erp/doc-configs'

/** SPEC-M33 — print families whose door is NOT a doc-config docType. */
const NON_CONFIG_DOORS = new Set(['bundle-labels', 'bundle-label', 'stock-take', 'payslip']) // M42: the count sheet rides the /inventory/stock-take/[id] view + DocPrintLink; M46: the payslip rides the /hr/payroll/[id] view + DocPrintLink + get_payroll_runs (not a doc-config family)

describe('PRINT_DOC_BY_DOCTYPE (SPEC-M17 §2-D, SPEC-M18 §2-A1)', () => {
  it('maps exactly the 21 printable families (M18 added order; M33 labels + M42 stock-take + M46 payslip ride other doors)', () => {
    expect(Object.keys(PRINT_DOC_BY_DOCTYPE).length).toBe(21)
    expect(getPrintDocTypes().length).toBe(25) // 21 + SPEC-M33 bundle-labels/bundle-label + M42 stock-take + M46 payslip
    expect(PRINT_DOC_BY_DOCTYPE.order).toBe('order')
  })

  it('every map value is a real PRINT_DOCS key', () => {
    for (const [from, to] of Object.entries(PRINT_DOC_BY_DOCTYPE)) {
      expect(PRINT_DOCS[to], `${from} → ${to} must exist in PRINT_DOCS`).toBeDefined()
    }
  })

  it('every PRINT_DOCS family is reachable (no orphan print fetchers)', () => {
    const targets = new Set(Object.values(PRINT_DOC_BY_DOCTYPE))
    for (const p of getPrintDocTypes()) {
      if (NON_CONFIG_DOORS.has(p)) continue // documented: cut-order view link + get_bundle tool
      expect(targets.has(p), `print docType '${p}' has no doc-config door`).toBe(true)
    }
  })

  it('every mapped docType exists in DOC_CONFIGS (no phantoms)', () => {
    const known = new Set(DOC_CONFIGS.map((c) => c.docType))
    for (const from of Object.keys(PRINT_DOC_BY_DOCTYPE)) {
      expect(known.has(from), `docType '${from}' not found in DOC_CONFIGS`).toBe(true)
    }
  })
})
