/**
 * print-doc-map tests — SPEC-M17 §4-2: pin the doc-config→print bridge.
 * (1) every PRINT_DOC_BY_DOCTYPE value is a real PRINT_DOCS key;
 * (2) all 20 PRINT_DOCS families are reachable from some doc-config docType;
 * (3) every mapped docType exists in DOC_CONFIGS (no phantom entries).
 */
import { describe, it, expect } from 'vitest'
import { PRINT_DOC_BY_DOCTYPE } from '@/lib/erp/print/doc-type-map'
import { PRINT_DOCS, getPrintDocTypes } from '@/lib/erp/print'
import { DOC_CONFIGS } from '@/lib/erp/doc-configs'

describe('PRINT_DOC_BY_DOCTYPE (SPEC-M17 §2-D)', () => {
  it('maps exactly the 20 printable families', () => {
    expect(Object.keys(PRINT_DOC_BY_DOCTYPE).length).toBe(20)
    expect(getPrintDocTypes().length).toBe(20)
  })

  it('every map value is a real PRINT_DOCS key', () => {
    for (const [from, to] of Object.entries(PRINT_DOC_BY_DOCTYPE)) {
      expect(PRINT_DOCS[to], `${from} → ${to} must exist in PRINT_DOCS`).toBeDefined()
    }
  })

  it('every PRINT_DOCS family is reachable from some doc-config docType (no orphan print fetchers)', () => {
    const targets = new Set(Object.values(PRINT_DOC_BY_DOCTYPE))
    for (const p of getPrintDocTypes()) {
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
