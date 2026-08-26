/**
 * SPEC-M3 §13 — doc-config contracts (per Wave B, configs = 1: order) plus
 * the form-door coercion path (FormData-shaped strings → shared zod schema).
 * The coercion test is the form-side complement of doc-parity: it proves the
 * form action feeds the EXACT same schema the agent door uses.
 */
import { describe, it, expect, afterAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { DOC_CONFIGS, getDocConfig, toScreenConfig } from '../../src/lib/erp/doc-configs'
import { coerceDocInput, type DocFormPayload } from '../../src/lib/erp/doc-configs/coerce'
import { planDocAction, commitDocAction } from '../../src/lib/erp/doc-actions'
import { MASTER_CONFIGS } from '../../src/lib/erp/master-configs'
import { LIVE_ROUTES, findItemByRoute, isLive } from '../../src/lib/erp/menu-registry'
import { CHAIN, resolveStageUrl, stageFormUrl } from '../../src/lib/erp/chain'
import { ORDER_SCHEMA } from '../../src/lib/erp/schemas/order'
import { db } from '../../src/lib/db'

const ERP_DIR = path.resolve(__dirname, '../../src/app/(erp)')

describe('doc-configs — SPEC-M3 §7 contracts', () => {
  it('registry has exactly the Wave B set (order)', () => {
    expect(DOC_CONFIGS.map((c) => c.slug)).toEqual(['order'])
  })

  it('every config: docType/slug/title/numberPrefix/numberField present; service.plan is a function; schema is a zod type', () => {
    for (const c of DOC_CONFIGS) {
      expect(c.docType).toBeTruthy()
      expect(c.slug).toBeTruthy()
      expect(c.title).toBeTruthy()
      expect(c.numberPrefix).toBeTruthy()
      expect(c.numberField).toBeTruthy()
      expect(typeof c.service.plan).toBe('function')
      expect(typeof (c.schema as { safeParse: unknown }).safeParse).toBe('function')
      expect(Array.isArray(c.headerFields)).toBe(true)
      expect(c.headerFields.length).toBeGreaterThan(0)
      expect(Array.isArray(c.listColumns)).toBe(true)
      expect(c.agentTools.length).toBeGreaterThan(0)
    }
  })

  it('every header/line field has name, label and a known type', () => {
    const TYPES = ['text', 'number', 'date', 'select', 'picker', 'textarea', 'readonly']
    for (const c of DOC_CONFIGS) {
      for (const f of c.headerFields) {
        expect(f.name, `${c.slug}.${f.name}`).toBeTruthy()
        expect(f.label, `${c.slug}.${f.name}`).toBeTruthy()
        expect(TYPES).toContain(f.type)
      }
      for (const f of c.lineFields ?? []) {
        expect(f.name, `${c.slug} line.${f.name}`).toBeTruthy()
        expect(f.label, `${c.slug} line.${f.name}`).toBeTruthy()
        expect(TYPES).toContain(f.type)
      }
    }
  })

  it('every picker slug exists in the master-configs registry', () => {
    const slugs = new Set(MASTER_CONFIGS.map((m) => m.slug))
    for (const c of DOC_CONFIGS) {
      for (const f of c.headerFields) {
        if (f.type === 'picker') expect(slugs.has(f.picker!), `${c.slug}.${f.name} → ${f.picker}`).toBe(true)
      }
      for (const f of c.lineFields ?? []) {
        if (f.type === 'picker') expect(slugs.has(f.picker!), `${c.slug} line.${f.name} → ${f.picker}`).toBe(true)
      }
    }
  })

  it('chainStage within 1..15 and matches CHAIN formUrl expectations', () => {
    for (const c of DOC_CONFIGS) {
      if (c.chainStage !== undefined) {
        expect(c.chainStage).toBeGreaterThanOrEqual(1)
        expect(c.chainStage).toBeLessThanOrEqual(15)
      }
    }
    const order = getDocConfig('order')!
    expect(order.chainStage).toBe(1)
    expect(CHAIN[0].formUrl).toBe('/orders/new') // stage 1 → the order DocScreen
  })

  it('order config fields mirror ORDER_SCHEMA keys exactly (the shared-schema rule)', () => {
    const order = getDocConfig('order')!
    const schemaKeys = Object.keys(ORDER_SCHEMA.shape)
    const headerNames = order.headerFields.map((f) => f.name)
    for (const k of schemaKeys) {
      if (k === 'lines') continue
      expect(headerNames, `header field for schema key '${k}'`).toContain(k)
    }
    const lineNames = (order.lineFields ?? []).map((f) => f.name)
    for (const k of Object.keys(ORDER_SCHEMA.shape.lines.element.shape)) {
      expect(lineNames, `line field for schema key '${k}'`).toContain(k)
    }
  })

  it('toScreenConfig strips service+schema (RSC-serializable subset)', () => {
    const ui = toScreenConfig(getDocConfig('order')!)
    expect((ui as Record<string, unknown>).service).toBeUndefined()
    expect((ui as Record<string, unknown>).schema).toBeUndefined()
    expect(ui.slug).toBe('order')
    expect(ui.headerFields.length).toBeGreaterThan(0)
  })

  it('routes: order-sheet-new + order-hub are LIVE with page files on disk', () => {
    expect(LIVE_ROUTES.has('/orders/new')).toBe(true)
    expect(LIVE_ROUTES.has('/orders/[id]')).toBe(true)
    expect(isLive(findItemByRoute('/orders/new')!)).toBe(true)
    expect(isLive(findItemByRoute('/orders/[id]')!)).toBe(true)
    expect(fs.existsSync(path.join(ERP_DIR, 'orders/new/page.tsx'))).toBe(true)
    expect(fs.existsSync(path.join(ERP_DIR, 'orders/[id]/page.tsx'))).toBe(true)
  })
})

describe('doc-configs coercion — the form door feeds the SAME schema', () => {
  const order = getDocConfig('order')!

  it('coerces string form state → ORDER_SCHEMA-valid input (numbers, dropped empties)', () => {
    const payload: DocFormPayload = {
      header: {
        orderNo: '',
        buyerCode: 'B001',
        styleNo: 'S-1001',
        orderDate: '2026-08-01',
        deliveryDate: '2026-10-15',
        finYear: '',
        notes: '  ', // whitespace-only → dropped
      },
      lines: [
        { colourName: 'Red', sizeName: 'M', qty: '1000', rate: '350' },
        { colourName: 'Blue', sizeName: 'L', qty: '1500', rate: '350' },
      ],
    }
    const coerced = coerceDocInput(order.headerFields, payload, order.linesKey, order.lineFields)
    const parsed = ORDER_SCHEMA.safeParse(coerced)
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.buyerCode).toBe('B001')
      expect(parsed.data.orderNo).toBeUndefined() // empty → auto SO-####
      expect(parsed.data.finYear).toBeUndefined()
      expect(parsed.data.notes).toBeUndefined()
      expect(parsed.data.lines).toHaveLength(2)
      expect(parsed.data.lines[0].qty).toBe(1000) // number, not '1000'
      expect(parsed.data.lines[1].rate).toBe(350)
    }
  })

  it('drops fully-empty line rows (accidental blank row must not fail as Required)', () => {
    const payload: DocFormPayload = {
      header: { buyerCode: 'B001', styleNo: 'S-1001', deliveryDate: '2026-10-15' },
      lines: [
        { colourName: 'Red', sizeName: 'M', qty: '100', rate: '350' },
        { colourName: '', sizeName: '', qty: '', rate: '' }, // accidental blank row
      ],
    }
    const coerced = coerceDocInput(order.headerFields, payload, order.linesKey, order.lineFields)
    const parsed = ORDER_SCHEMA.safeParse(coerced)
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.data.lines).toHaveLength(1)
  })

  it('missing required fields are reported by the shared schema (not silently sent)', () => {
    const payload: DocFormPayload = {
      header: { buyerCode: 'B001' }, // no styleNo, no deliveryDate, no lines
      lines: [],
    }
    const coerced = coerceDocInput(order.headerFields, payload, order.linesKey, order.lineFields)
    const parsed = ORDER_SCHEMA.safeParse(coerced)
    expect(parsed.success).toBe(false)
    if (!parsed.success) {
      const paths = parsed.error.issues.map((i) => i.path.join('.'))
      expect(paths).toContain('styleNo')
      expect(paths).toContain('deliveryDate')
      expect(paths.some((p) => p.startsWith('lines'))).toBe(true)
    }
  })

  it('non-numeric qty is surfaced by zod (never silently coerced)', () => {
    const payload: DocFormPayload = {
      header: { buyerCode: 'B001', styleNo: 'S-1001', deliveryDate: '2026-10-15' },
      lines: [{ colourName: 'Red', sizeName: 'M', qty: 'abc', rate: '350' }],
    }
    const coerced = coerceDocInput(order.headerFields, payload, order.linesKey, order.lineFields)
    const parsed = ORDER_SCHEMA.safeParse(coerced)
    expect(parsed.success).toBe(false)
  })
})

describe('form-door integration — the Wave B action composition (ADR-001)', () => {
  const stamp = Date.now()
  const orderNo = `WB-${stamp}`
  let createdId: string | undefined

  afterAll(async () => {
    // surgical cleanup (FK-safe: order only — the doc-parity pattern)
    if (createdId) {
      await db.orderLine.deleteMany({ where: { orderId: createdId } })
      await db.order.delete({ where: { id: createdId } }).catch(() => {})
    }
    await db.$disconnect()
  })

  it('planDocAction returns a serializable plan (commit fn stripped)', async () => {
    const payload: DocFormPayload = {
      header: {
        orderNo,
        buyerCode: 'B001',
        styleNo: 'S-1001',
        deliveryDate: '2026-11-30',
        notes: 'Wave B form-door integration test',
      },
      lines: [
        { colourName: 'Red', sizeName: 'M', qty: '10', rate: '100' },
        { colourName: 'Blue', sizeName: 'L', qty: '20', rate: '100' },
      ],
    }
    const res = await planDocAction('order', payload)
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.plan.summary).toContain(orderNo)
      expect(res.plan.creates?.length).toBe(3) // order + 2 lines
      expect((res.plan as unknown as { commit?: unknown }).commit).toBeUndefined()
    }
  })

  it('commitDocAction commits through the same service and returns the doc', async () => {
    const payload: DocFormPayload = {
      header: {
        orderNo,
        buyerCode: 'B001',
        styleNo: 'S-1001',
        deliveryDate: '2026-11-30',
        notes: 'Wave B form-door integration test',
      },
      lines: [
        { colourName: 'Red', sizeName: 'M', qty: '10', rate: '100' },
        { colourName: 'Blue', sizeName: 'L', qty: '20', rate: '100' },
      ],
    }
    const res = await commitDocAction('order', payload)
    expect(res.ok).toBe(true)
    if (res.ok) {
      createdId = res.doc?.id
      expect(res.doc?.orderNo).toBe(orderNo)
    }
    // durable: committed rows are in the db (order + lines, totals computed)
    const order = await db.order.findUnique({ where: { orderNo }, include: { lines: true } })
    expect(order).toBeTruthy()
    expect(order!.lines).toHaveLength(2)
    expect(order!.totalPcs).toBe(30)
    expect(order!.totalValue).toBe(3000)
  })

  it('unknown slug and bad input return structured errors (never throw)', async () => {
    const bad = await planDocAction('nope', { header: {}, lines: [] })
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(bad.errors[0]).toContain('Unknown document type')
    const invalid = await commitDocAction('order', { header: { buyerCode: 'B001' }, lines: [] })
    expect(invalid.ok).toBe(false)
  })
})

describe('chain url resolution — resolveStageUrl (Wave B, additive)', () => {
  it('substitutes a known id into /orders/[id]#bom and keeps the param before the hash', () => {
    const bom = CHAIN[1]
    expect(bom.formUrl).toBe('/orders/[id]#bom')
    expect(resolveStageUrl(bom, { id: 'abc123', orderNo: 'SO-1001' })).toBe('/orders/abc123?order=SO-1001#bom')
  })

  it('without an id, falls back to the frozen stageFormUrl behaviour', () => {
    const bom = CHAIN[1]
    expect(resolveStageUrl(bom, { orderNo: 'SO-1001' })).toBe(stageFormUrl(bom, { orderNo: 'SO-1001' }))
    expect(stageFormUrl(bom, { orderNo: 'SO-1001' })).toBe('/orders?order=SO-1001')
  })

  it('plain form routes keep the context param', () => {
    const program = CHAIN[2]
    expect(resolveStageUrl(program, { orderNo: 'SO-1001' })).toBe('/programs/new?order=SO-1001')
  })
})
