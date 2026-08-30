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
import { keypadFieldsFor, keypadDefaultFor, keypadLinesFor, KEYPAD_SURFACES } from '@/lib/erp/keypad'
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

  it('surfaces are header-only OR the M25 line-grid surface (despatch carries lineFields)', () => {
    const lineGridSlugs = new Set(['despatch']) // SPEC-M25 — the big line editor
    for (const slug of Object.keys(KEYPAD_SURFACES)) {
      const cfg = getDocConfig(slug)!
      if (lineGridSlugs.has(slug)) {
        expect((cfg.lineFields ?? []).length, `${slug} is the M25 line-grid surface`).toBeGreaterThan(0)
      } else {
        expect((cfg.lineFields ?? []).length, `${slug} must be header-only for the v1 keypad`).toBe(0)
      }
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

describe('SPEC-M25 — the line-grid keypad (pcs despatch)', () => {
  it('keypadLinesFor(despatch): required-only — styleNo picker + qty number', () => {
    const lines = keypadLinesFor(getDocConfig('despatch')!)
    expect(lines.map((f) => f.name)).toEqual(['styleNo', 'qty'])
    expect(lines[0].type).toBe('picker')
    expect(lines[0].picker).toBe('style')
    expect(lines[1].type).toBe('number')
    // optional colour/size/rate stay on the full DocScreen
    const names = lines.map((f) => f.name)
    expect(names).not.toContain('colourName')
    expect(names).not.toContain('sizeName')
    expect(names).not.toContain('rate')
  })

  it('despatch is in KEYPAD_SURFACES with the live /pieces/despatch route', () => {
    expect(KEYPAD_SURFACES.despatch).toEqual({ route: '/pieces/despatch', title: 'Pcs Despatch' })
    expect(LIVE_ROUTES.has('/pieces/despatch')).toBe(true)
  })

  it('the despatch page wires the keypad branch + lineFields + toggle (source pin)', () => {
    const page = readFileSync(join(ERP_DIR, 'pieces/despatch/page.tsx'), 'utf-8')
    expect(page).toContain("mode === 'keypad'")
    expect(page).toContain('KeypadMode')
    expect(page).toContain('keypadLinesFor(despatchConfig)')
    expect(page).toContain('mode=keypad')
  })

  it('KeypadMode carries the big line editor: ADD button, ≥1-line guard, lines in BOTH payloads', () => {
    const src = readFileSync(join(ERP_DIR, '../../components/erp/keypad-mode.tsx'), 'utf-8')
    expect(src).toContain('+ ADD LINE')
    expect(src).toContain('Add at least one line')
    expect(src).toContain('KEYPAD_LINES_MAX')
    // both doors carry { header, lines }
    expect(src).toContain('planDocAction(slug, { header: values, lines })')
    expect(src).toContain('commitDocAction(slug, { header: values, lines })')
    // nextEntry resets the lines too
    expect(src).toMatch(/nextEntry[\s\S]*setLines\(\[\]\)/)
  })
})

describe('SPEC-M25 §3 — the two-line commit round-trip (service level)', () => {
  it('commitDocAction(despatch, { header, lines }) lands the DC + both lines', async () => {
    const { PrismaClient } = await import('@prisma/client')
    const db = new PrismaClient()
    const ts = Date.now()
    try {
      const buyer = await db.buyer.create({ data: { code: `SM25-B-${ts}`, name: `Smoke Buyer ${ts}` } })
      const style = await db.style.create({ data: { styleNo: `SM25-S-${ts}`, buyerId: buyer.id } })
      const order = await db.order.create({
        data: { orderNo: `SM25-O-${ts}`, buyerId: buyer.id, styleId: style.id, orderDate: new Date(), finYear: '26-27', totalPcs: 5000 },
      })
      // finished-goods stock for the despatch to draw from (pcs bucket)
      const gd = await db.godown.create({ data: { code: `SM25-G-${ts}`, name: `Smoke GD ${ts}` } })
      await db.stockLedger.create({
        data: {
          docNo: `SM25-OPEN-${ts}`, docDate: new Date(), txnType: 'stock_adjustment_add', finYear: '26-27',
          itemType: 'pcs', itemId: style.id, godownId: gd.id,
          inPcs: 3000, rate: 100,
        },
      })
      await db.currentStock.create({
        data: { itemType: 'pcs', itemId: style.id, godownId: gd.id, pcs: 3000, rate: 100 },
      })

      const { commitDocAction } = await import('@/lib/erp/doc-actions')
      const res = await commitDocAction('despatch', {
        header: { orderNo: order.orderNo, totalPcs: '2' },
        lines: [
          { styleNo: style.styleNo, qty: '1' },
          { styleNo: style.styleNo, qty: '1' },
        ],
      })
      expect(res.ok).toBe(true)
      const dcNo = res.doc?.dcNo as string
      expect(dcNo).toMatch(/^DC-/)
      const dc = await db.pcsDespatch.findUnique({ where: { dcNo }, include: { lines: true } })
      expect(dc?.totalPcs).toBe(2)
      expect(dc?.lines.length).toBe(2)
      expect(dc?.lines.every((l: any) => l.qty === 1)).toBe(true)
    } finally {
      // children-first cleanup (PITFALLS #40)
      const dc = await db.pcsDespatch.findFirst({ where: { dcNo: { startsWith: 'DC-' } , order: { orderNo: { startsWith: 'SM25-O-' } } }, include: { lines: true } }).catch(() => null)
      if (dc) {
        await db.pcsDespatchLine.deleteMany({ where: { pcsDespatchId: dc.id } }).catch(() => {})
        await db.pcsDespatch.delete({ where: { id: dc.id } }).catch(() => {})
      }
      const style = await db.style.findFirst({ where: { styleNo: { startsWith: 'SM25-S-' } } })
      if (style) {
        await db.stockLedger.deleteMany({ where: { itemId: style.id } }).catch(() => {})
        await db.currentStock.deleteMany({ where: { itemId: style.id } }).catch(() => {})
      }
      await db.order.deleteMany({ where: { orderNo: { startsWith: 'SM25-O-' } } }).catch(() => {})
      await db.style.deleteMany({ where: { styleNo: { startsWith: 'SM25-S-' } } }).catch(() => {})
      await db.buyer.deleteMany({ where: { code: { startsWith: 'SM25-B-' } } }).catch(() => {})
      await db.godown.deleteMany({ where: { code: { startsWith: 'SM25-G-' } } }).catch(() => {})
      await db.$disconnect()
    }
  })
})
