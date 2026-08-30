/**
 * SPEC-M30 — legacy-forms alias hygiene (gap-audit §8-1).
 *
 * THE INVARIANT: every legacyForms ref in MENU_ITEMS is classified —
 * a real taxonomy form, an alias key, or an explicit non-form. Any new
 * unclassified ref fails test 1, forcing a deliberate classification
 * instead of silent fuzz.
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { MENU_ITEMS } from '@/lib/erp/menu-registry'
import {
  LEGACY_FORM_ALIASES,
  NON_FORM_LEGACY,
  canonicalLegacyForm,
  countableLegacyForms,
  searchableLegacyForms,
} from '@/lib/erp/legacy-aliases'

const ROOT = join(__dirname, '../..')
const TAXONOMY = JSON.parse(readFileSync(join(ROOT, 'docs/form-taxonomy.json'), 'utf8')) as {
  forms: { form: string; base?: string }[]
}
const TAX_FORMS = new Set<string>(TAXONOMY.forms.flatMap((f) => [f.form, ...(f.base ? [f.base] : [])]))

const ALL_REFS = (() => {
  const s = new Set<string>()
  for (const item of MENU_ITEMS) item.legacyForms.forEach((f) => s.add(f))
  return [...s]
})()

describe('M30 — the completeness invariant (nothing unclassified)', () => {
  it('every MENU_ITEMS legacyForm ref is a taxonomy form, an alias key, or a non-form', () => {
    const unclassified = ALL_REFS.filter(
      (f) => !TAX_FORMS.has(f) && !(f in LEGACY_FORM_ALIASES) && !NON_FORM_LEGACY.has(f),
    )
    expect(unclassified, `classify these refs in legacy-aliases.ts: ${unclassified.join(', ')}`).toEqual([])
  })

  it('every alias TARGET is a real taxonomy form (17+ verified names)', () => {
    const missing = Object.values(LEGACY_FORM_ALIASES).filter((t) => !TAX_FORMS.has(t))
    expect(missing, `alias targets not in taxonomy: ${missing.join(', ')}`).toEqual([])
  })

  it('every NON_FORM_LEGACY entry is genuinely absent from the taxonomy (else it belongs in aliases)', () => {
    const wrong = [...NON_FORM_LEGACY].filter((f) => TAX_FORMS.has(f))
    expect(wrong, `these ARE taxonomy forms — make them aliases or leave raw: ${wrong.join(', ')}`).toEqual([])
  })

  it('the alias map and the non-form set never collide (a ref can have ONE class)', () => {
    const collisions = Object.keys(LEGACY_FORM_ALIASES).filter((k) => NON_FORM_LEGACY.has(k))
    expect(collisions).toEqual([])
  })

  it('no alias value points back into alias keys (single-hop by construction)', () => {
    const chained = Object.entries(LEGACY_FORM_ALIASES).filter(([, v]) => v in LEGACY_FORM_ALIASES)
    expect(chained, `chain: ${JSON.stringify(chained)}`).toEqual([])
  })
})

describe('M30 — canonicalLegacyForm', () => {
  it('maps a rename to the real form (FrmOrderReg → FrmOrderRegister)', () => {
    expect(canonicalLegacyForm('FrmOrderReg')).toBe('FrmOrderRegister')
  })

  it('maps a SQL object to the form it served (ST_Ord_inHand → FrmTradingOrdersInHandReg)', () => {
    expect(canonicalLegacyForm('ST_Ord_inHand')).toBe('FrmTradingOrdersInHandReg')
    expect(canonicalLegacyForm('Sp_POBalnce')).toBe('FrmPartyBalanceRegister')
    expect(canonicalLegacyForm('Vue_StkLedger')).toBe('FrmStockLedger')
  })

  it('passes unknown refs and real forms through unchanged', () => {
    expect(canonicalLegacyForm('frmPcsDel')).toBe('frmPcsDel')
    expect(canonicalLegacyForm('SomethingNew')).toBe('SomethingNew')
  })

  it('is idempotent (canonical of canonical = canonical)', () => {
    for (const ref of ALL_REFS) {
      expect(canonicalLegacyForm(canonicalLegacyForm(ref))).toBe(canonicalLegacyForm(ref))
    }
  })
})

describe('M30 — countableLegacyForms (the parity-count source)', () => {
  it('drops non-form refs and canonicalizes renames', () => {
    expect(
      countableLegacyForms(['FrmOrderReg', 'RptClosingStock', 'FrmOrderRegister_Spl']),
    ).toEqual(['FrmOrderRegister', 'FrmOrderRegister_Spl'])
  })

  it('dedups a rename and its real form to ONE countable form', () => {
    expect(countableLegacyForms(['FrmOrderReg', 'FrmOrderRegister'])).toEqual(['FrmOrderRegister'])
  })

  it('drops ONLY non-forms from a fully-real list (count preserved)', () => {
    expect(countableLegacyForms(['frmPcsDel', 'FrmOrderRegister'])).toEqual(['FrmOrderRegister', 'frmPcsDel'])
  })

  it('across the whole registry: countable ≤ refs, and the count is honest (non-forms excluded)', () => {
    const totalRefs = ALL_REFS.length
    const countable = new Set(MENU_ITEMS.flatMap((i) => countableLegacyForms(i.legacyForms)))
    // 35 classified: 18 alias keys canonicalize, 17 non-forms drop
    expect(Object.keys(LEGACY_FORM_ALIASES).length).toBe(18)
    expect(NON_FORM_LEGACY.size).toBe(17)
    expect(countable.size).toBeLessThan(totalRefs)
  })
})

describe('M30 — searchableLegacyForms (the palette expansion)', () => {
  it('returns raw + canonical (both spellings searchable)', () => {
    expect(searchableLegacyForms(['FrmOrderReg'])).toEqual(['FrmOrderReg', 'FrmOrderRegister'])
  })

  it('keeps non-forms searchable (mnemonics, not coverage)', () => {
    expect(searchableLegacyForms(['RptClosingStock'])).toEqual(['RptClosingStock'])
  })

  it('dedups when raw IS canonical', () => {
    expect(searchableLegacyForms(['frmPcsDel'])).toEqual(['frmPcsDel'])
  })
})

describe('M30 — consumer source pins', () => {
  const read = (p: string) => readFileSync(join(ROOT, p), 'utf8')

  it('parityStats counts through countableLegacyForms (menu-registry)', () => {
    const src = read('src/lib/erp/menu-registry.ts')
    expect(src).toContain("import { countableLegacyForms } from './legacy-aliases'")
    expect(src).toContain('countableLegacyForms(i.legacyForms).forEach((f) => mapped.add(f))')
  })

  it('the parity page renders the honest count + the (+N dropped) hint', () => {
    const src = read('src/app/(erp)/parity/page.tsx')
    expect(src).toContain('countableLegacyForms(item.legacyForms)')
    expect(src).toContain('NON_FORM_LEGACY.has(f)')
  })

  it('the command palette joins searchableLegacyForms into the item value', () => {
    const src = read('src/components/erp/command-palette.tsx')
    expect(src).toContain("import { searchableLegacyForms } from '@/lib/erp/legacy-aliases'")
    expect(src).toContain('searchableLegacyForms(')
  })

  it('§8-2/3 header drifts fixed: ITEMS 132, bindings 16 + aggregates 12', () => {
    expect(read('src/lib/erp/menu-registry.ts')).toContain('ITEMS (132')
    const reports = read('src/lib/erp/reports/index.ts')
    expect(reports).toContain('28 entries: 16 BINDINGS')
    expect(reports).toContain('bindings (16)')
    expect(reports).toContain('new aggregates (12)')
    // the old stale split must be gone
    expect(reports).not.toContain('15 BINDINGS')
  })
})
