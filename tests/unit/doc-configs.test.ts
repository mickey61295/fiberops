/**
 * SPEC-M3 §13 — doc-config contracts (per Wave B, configs = 1: order) plus
 * the form-door coercion path (FormData-shaped strings → shared zod schema).
 * The coercion test is the form-side complement of doc-parity: it proves the
 * form action feeds the EXACT same schema the agent door uses.
 */
import { describe, it, expect, afterAll } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { z } from 'zod'
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
  it('registry has exactly the Wave C set (order + 11 chain configs)', () => {
    expect(DOC_CONFIGS.map((c) => c.slug)).toEqual([
      'order',
      'program',
      'purchase-order',
      'grn',
      'jobwork-out',
      'jobwork-in',
      'cut',
      'line-issue',
      'production',
      'rework',
      'rejection',
      'despatch',
    ])
  })

  it('every config: docType/slug/title present; service.plan is a function; schema is a zod type; number fields paired when present', () => {
    for (const c of DOC_CONFIGS) {
      expect(c.docType).toBeTruthy()
      expect(c.slug).toBeTruthy()
      expect(c.title).toBeTruthy()
      // ERRATUM 4 (Wave C): numberPrefix/numberField are optional, but when
      // one is present BOTH must be (the auto-number hint + placeholder pair)
      if (c.numberPrefix !== undefined || c.numberField !== undefined) {
        expect(c.numberPrefix, `${c.slug}.numberPrefix`).toBeTruthy()
        expect(c.numberField, `${c.slug}.numberField`).toBeTruthy()
        expect(c.headerFields.some((f) => f.name === c.numberField)).toBe(true)
      }
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

  it('every picker slug exists in the master-configs registry (incl. pickerFrom targets)', () => {
    const slugs = new Set(MASTER_CONFIGS.map((m) => m.slug))
    for (const c of DOC_CONFIGS) {
      for (const f of c.headerFields) {
        if (f.type === 'picker') expect(slugs.has(f.picker!), `${c.slug}.${f.name} → ${f.picker}`).toBe(true)
      }
      for (const f of c.lineFields ?? []) {
        if (f.type === 'picker' && f.picker) expect(slugs.has(f.picker), `${c.slug} line.${f.name} → ${f.picker}`).toBe(true)
      }
    }
  })

  it('every select field carries non-empty options; select line fields too', () => {
    for (const c of DOC_CONFIGS) {
      for (const f of c.headerFields) {
        if (f.type === 'select') {
          expect(f.options?.length ?? 0, `${c.slug}.${f.name} select options`).toBeGreaterThan(0)
        }
      }
      for (const f of c.lineFields ?? []) {
        if (f.type === 'select') {
          expect(f.options?.length ?? 0, `${c.slug} line.${f.name} select options`).toBeGreaterThan(0)
        }
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
    // Wave C: each PRIMARY config's stage matches its CHAIN row's formUrl.
    // (rework is stage 11's SECONDARY form — CHAIN[10] points at the rejection
    // screen, post_rejection being the stage's primary tool — so it is exempt.)
    const stageUrls: Record<string, string> = {
      order: '/orders/new', program: '/programs/new', 'purchase-order': '/procurement/po',
      grn: '/procurement/grn', 'jobwork-out': '/jobwork/order', 'jobwork-in': '/jobwork/receipt',
      cut: '/cutting/job-order', 'line-issue': '/production/issue', production: '/production/entry',
      rejection: '/pieces/rejection', despatch: '/pieces/despatch',
    }
    for (const c of DOC_CONFIGS) {
      const stage = CHAIN.find((s) => s.step === c.chainStage)
      expect(stage, `${c.slug} chainStage ${c.chainStage} in CHAIN`).toBeTruthy()
      if (stageUrls[c.slug]) {
        expect(stage!.formUrl, `${c.slug} stage url`).toBe(stageUrls[c.slug])
      }
    }
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

  it('EVERY config mirrors its shared schema keys exactly (Wave C — the rule generalised)', () => {
    for (const c of DOC_CONFIGS) {
      const shape = (c.schema as unknown as { shape?: Record<string, unknown> }).shape
      if (!shape) throw new Error(`${c.slug} schema must be a zod object`)
      const headerNames = c.headerFields.map((f) => f.name)
      const lineNames = (c.lineFields ?? []).map((f) => f.name)
      const linesKey = c.linesKey ?? 'lines'
      for (const key of Object.keys(shape)) {
        const isLines = key === linesKey && c.lineFields
        if (isLines) {
          // zod v4: unwrap ZodOptional chains (note — z.array() itself ALSO has
          // .unwrap() (→ element), so discriminate with instanceof, not duck-typing)
          let node: unknown = shape[key]
          if (node instanceof z.ZodOptional) node = node.unwrap()
          const lineShape = (node as { element?: { shape?: Record<string, unknown> } } | undefined)?.element?.shape
          expect(lineShape, `${c.slug} lines schema element shape`).toBeTruthy()
          for (const lk of Object.keys(lineShape ?? {})) {
            expect(lineNames, `${c.slug} line field for schema key '${lk}'`).toContain(lk)
          }
        } else {
          expect(headerNames, `${c.slug} header field for schema key '${key}'`).toContain(key)
        }
      }
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

  it('routes: the 11 Wave C screens are LIVE with page files (§8 rows 3-13)', () => {
    const waveC: { slug: string; route: string; view?: string }[] = [
      { slug: 'program', route: '/programs/new', view: '/programs/[id]' },
      { slug: 'purchase-order', route: '/procurement/po', view: '/procurement/po/[id]' },
      { slug: 'grn', route: '/procurement/grn', view: '/procurement/grn/[id]' },
      { slug: 'jobwork-out', route: '/jobwork/order', view: '/jobwork/order/[id]' },
      { slug: 'jobwork-in', route: '/jobwork/receipt' }, // update-only — no own view
      { slug: 'cut', route: '/cutting/job-order', view: '/cutting/job-order/[id]' },
      { slug: 'line-issue', route: '/production/issue', view: '/production/issue/[id]' },
      { slug: 'production', route: '/production/entry', view: '/production/entry/[id]' },
      { slug: 'rework', route: '/production/rework' }, // viewed via /production/entry/[id]
      { slug: 'rejection', route: '/pieces/rejection', view: '/pieces/rejection/[id]' },
      { slug: 'despatch', route: '/pieces/despatch', view: '/pieces/despatch/[id]' },
    ]
    for (const w of waveC) {
      expect(getDocConfig(w.slug), `config ${w.slug}`).toBeTruthy()
      expect(LIVE_ROUTES.has(w.route), w.route).toBe(true)
      expect(isLive(findItemByRoute(w.route)!), `item for ${w.route}`).toBe(true)
      expect(fs.existsSync(path.join(ERP_DIR, w.route, 'page.tsx')), `${w.route}/page.tsx`).toBe(true)
      if (w.view) {
        expect(LIVE_ROUTES.has(w.view), w.view).toBe(true)
        expect(fs.existsSync(path.join(ERP_DIR, w.view, 'page.tsx')), `${w.view}/page.tsx`).toBe(true)
      }
    }
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

describe('form-door integration — Wave C chain ops (ADR-001 through the generic actions)', () => {
  // covers the three NEW shapes Wave C adds beyond order: select-coercion
  // (program.stage), header-only op (program), update-only op (jobwork-in),
  // and service-error surfacing (grn against a missing PO).
  const stamp = Date.now()
  const orderNo = `WC-${stamp}`
  const jwNo = `WCJW-${stamp}`
  const progNo = `WCPGM-${stamp}`
  let orderId: string | undefined
  let programId: string | undefined
  let jwId: string | undefined

  afterAll(async () => {
    // surgical, FK-safe cleanup (no projector rows: no yarn/fabric on program)
    if (programId) await db.program.delete({ where: { id: programId } }).catch(() => {})
    if (jwId) await db.jobworkOrder.delete({ where: { id: jwId } }).catch(() => {})
    if (orderId) {
      await db.orderLine.deleteMany({ where: { orderId } })
      await db.order.delete({ where: { id: orderId } }).catch(() => {})
    }
    await db.$disconnect()
  })

  it('program: select+number coercion → shared schema → planProgram (review, then commit)', async () => {
    // order first (the program's parent) — through the SAME form door
    const orderRes = await commitDocAction('order', {
      header: { orderNo, buyerCode: 'B001', styleNo: 'S-1001', deliveryDate: '2027-06-30' },
      lines: [{ colourName: 'Red', sizeName: 'M', qty: '100', rate: '200' }],
    })
    expect(orderRes.ok).toBe(true)
    if (orderRes.ok) orderId = orderRes.doc?.id

    const payload: DocFormPayload = {
      header: {
        programNo: progNo,
        orderNo,
        stage: 'knitting',            // select → string passthrough
        requiredKgs: '40.5',          // number coercion '40.5' → 40.5
        requiredPcs: '',              // empty → dropped (optional)
        targetDate: '2027-05-01',
        yarnCode: '',                 // no item → no projector rows → clean cleanup
      },
      lines: [],
    }
    const plan = await planDocAction('program', payload)
    expect(plan.ok).toBe(true)
    if (plan.ok) {
      expect(plan.plan.summary).toContain(progNo)
      expect(plan.plan.summary).toContain('knitting')
      expect((plan.plan as unknown as { commit?: unknown }).commit).toBeUndefined()
    }
    const commit = await commitDocAction('program', payload)
    expect(commit.ok).toBe(true)
    if (commit.ok) programId = commit.doc?.id
    const program = await db.program.findUnique({ where: { programNo: progNo } })
    expect(program).toBeTruthy()
    expect(program!.requiredKgs).toBe(40.5)
    expect(program!.stage).toBe('knitting')
    expect(program!.status).toBe('open')
  })

  it('grn: service errors surface as structured errors (never throw)', async () => {
    const res = await planDocAction('grn', {
      header: { poNo: 'NOPE-404', godownCode: 'G1', receivedQty: '10' },
      lines: [],
    })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.errors.join(' ')).toContain('PO NOPE-404 not found')
  })

  it('jobwork out → in roundtrip: the update-only op through the form door', async () => {
    const out = await commitDocAction('jobwork-out', {
      header: {
        dcNo: jwNo,
        jobworkerCode: 'JW001',
        processType: 'dyeing',
        totalQty: '150',
        totalValue: '3000',
        orderNo,
      },
      lines: [],
    })
    expect(out.ok).toBe(true)
    if (out.ok) {
      jwId = out.doc?.id
      expect(out.doc?.dcNo).toBe(jwNo)
    }
    const jw1 = await db.jobworkOrder.findUnique({ where: { dcNo: jwNo } })
    expect(jw1?.status).toBe('sent')

    const receipt = await commitDocAction('jobwork-in', {
      header: { dcNo: jwNo, receivedQty: '148', receivedDate: '2027-05-20' },
      lines: [],
    })
    expect(receipt.ok).toBe(true)
    const jw2 = await db.jobworkOrder.findUnique({ where: { dcNo: jwNo } })
    expect(jw2?.status).toBe('received')
    expect(jw2?.totalQty).toBe(148)
    expect(jw2?.receivedDate).toBeTruthy()
  })

  it('unknown Wave C slug returns the structured error (registry guard)', async () => {
    const bad = await planDocAction('productionn', { header: {}, lines: [] })
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(bad.errors[0]).toContain('Unknown document type')
  })
})
