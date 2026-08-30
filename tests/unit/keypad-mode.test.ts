/**
 * SPEC-M22 — keypad-operator mode: the pure field projection (required-only,
 * docNo + readonly dropped, pickers carried, dates default today), the
 * KEYPAD_SURFACES wiring contract (real slugs, live routes, pages carrying
 * the keypad branch — the M17 readFileSync source-pin precedent), and the
 * commit payload shape (header only, lines []).
 */
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { keypadFieldsFor, keypadDefaultFor, KEYPAD_SURFACES } from '@/lib/erp/keypad'
import { getDocConfig, DOC_CONFIGS } from '@/lib/erp/doc-configs'
import { LIVE_ROUTES } from '@/lib/erp/menu-registry'

const ERP_DIR = join(__dirname, '../../src/app/(erp)')

describe('SPEC-M22 §2 — keypadFieldsFor (the pure projection)', () => {
  it('production entry: required-only, auto cutNo/PgNo dropped, pickers carried', () => {
    const cfg = getDocConfig('production')!
    const fields = keypadFieldsFor(cfg)
    const names = fields.map((f) => f.name)
    expect(names).toContain('orderNo')
    expect(names).toContain('deptCode')
    expect(names).toContain('qty')
    expect(names).toContain('rate')
    // optional fields stay on the full DocScreen — the operator surface is minimal
    expect(names).not.toContain('styleNo')
    expect(names).not.toContain('lineId')
    const dept = fields.find((f) => f.name === 'deptCode')!
    expect(dept.type).toBe('picker')
    expect(dept.picker).toBe('department')
  })

  it('cut order: fabricIssued + totalPcs required; cutNo (auto number) dropped', () => {
    const fields = keypadFieldsFor(getDocConfig('cut')!)
    const names = fields.map((f) => f.name)
    expect(names).toContain('orderNo')
    expect(names).toContain('fabricIssued')
    expect(names).toContain('totalPcs')
    expect(names).not.toContain('cutNo')
    expect(names).not.toContain('markerLength') // optional — full screen only
  })

  it('waste receipt: wasteClass select carries its options; docNo dropped', () => {
    const fields = keypadFieldsFor(getDocConfig('waste-receipt')!)
    const names = fields.map((f) => f.name)
    expect(names).toEqual(['godownCode', 'itemType', 'itemCode', 'qty', 'wasteClass'])
    const cls = fields.find((f) => f.name === 'wasteClass')!
    expect(cls.type).toBe('select')
    expect(cls.options?.map((o) => o.value)).toEqual(['knitting', 'dyeing', 'cutting', 'packing', 'general'])
  })

  it('readonly fields never reach the keypad (opening-stock action/reason precedent)', () => {
    const fields = keypadFieldsFor(getDocConfig('opening-stock')!)
    expect(fields.map((f) => f.name)).not.toContain('action')
    expect(fields.map((f) => f.name)).not.toContain('reason')
  })

  it('every projection lands on a renderable keypad type', () => {
    for (const cfg of DOC_CONFIGS) {
      for (const f of keypadFieldsFor(cfg)) {
        expect(['text', 'number', 'date', 'select', 'picker']).toContain(f.type)
      }
    }
  })

  it('dates default today (the M17 reflex convention), others blank', () => {
    expect(keypadDefaultFor({ name: 'prodDate', label: 'Date', type: 'date' })).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(keypadDefaultFor({ name: 'qty', label: 'Qty', type: 'number' })).toBe('')
  })
})

describe('SPEC-M22 §2 — KEYPAD_SURFACES wiring contract', () => {
  it('every surface is a REAL doc-config slug with a LIVE route and an existing page', () => {
    for (const [slug, surf] of Object.entries(KEYPAD_SURFACES)) {
      expect(getDocConfig(slug), `${slug} is a real doc-config`).toBeTruthy()
      expect(LIVE_ROUTES.has(surf.route), `${surf.route} is live`).toBe(true)
      const page = readFileSync(join(ERP_DIR, surf.route.replace(/^\//, ''), 'page.tsx'), 'utf-8')
      expect(page, `${slug} page carries the keypad branch`).toContain("mode === 'keypad'")
      expect(page, `${slug} page renders KeypadMode`).toContain('KeypadMode')
      expect(page, `${slug} page carries the toggle link`).toContain('mode=keypad')
    }
  })

  it('the shipped surfaces are header-only families (no lineFields — line keypad deferred)', () => {
    for (const slug of Object.keys(KEYPAD_SURFACES)) {
      const cfg = getDocConfig(slug)!
      expect((cfg.lineFields ?? []).length, `${slug} must be header-only for the v1 keypad`).toBe(0)
    }
  })

  it('the keypad door rides the shared doc-actions (ADR-001 source pin)', () => {
    const src = readFileSync(join(ERP_DIR, '../../components/erp/keypad-mode.tsx'), 'utf-8')
    expect(src).toContain('planDocAction')
    expect(src).toContain('commitDocAction')
    // the two-step save survives in keypad form
    expect(src).toContain('CONFIRM')
  })
})
