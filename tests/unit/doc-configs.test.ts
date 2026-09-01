/**
 * SPEC-M3 §13 — doc-config contracts (per Wave B, configs = 1: order) plus
 * the form-door coercion path (FormData-shaped strings → shared zod schema).
 * The coercion test is the form-side complement of doc-parity: it proves the
 * form action feeds the EXACT same schema the agent door uses.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
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
  it('registry has the Wave D set + M5 Wave A + M5 Wave B (order + 11 chain + 7 accounts/inventory + 5 M5-A + 13 M5-B configs)', () => {
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
      'invoice',
      'debit-note',
      'supplier-bill', // SPEC-M40 PAY-03
      'purchase-return', // SPEC-M41 PRC-03
      'payment',
      'journal',
      'cost-sheet',
      'stock-adjustment',
      'godown-transfer',
      'budget',
      'commercial-invoice',
      'local-invoice',
      'piece-jobwork-invoice',
      'supplier-order',
      // M5 Wave B (SPEC-M5 §7-B)
      'finished-goods',
      'operation-entry',
      'bundle-barcode',
      'panel-production',
      'panel-excess',
      'panel-rej-rework',
      'fabric-rejection-return',
      'pcs-shortage',
      'panel-cutting',
      'line-transfer',
      'jobwork-pcs-return',
      'costing-input',
      'wage-payments',
      // M5 Wave D (SPEC-M5 §7-D — ADR-015 new models + write doors)
      'sample',
      'gate-entry',
      'gate-pass',
      'courier-dc',
      'loading',
      'packing-list',
      'lab-test',
      'expense',
      'roll-split',
      'contract-allotment',
      'program-allotment',
      'production-bill',
      // M6 Wave D (SPEC-M6 §7-D — process tail)
      'multi-process-grn',
      'dc-return',
      'dc-entry',
      'process-dc',
      'pcs-transfer',
      'ready-to-cut',
      'opening-stock',
      'waste-receipt',
      'cutting-issue',
      'cutting-production',
      'line-output',
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
        // ERRATUM 6 (Wave D): pickerFrom fields have a DYNAMIC slug (from the
        // sibling select's option values) — asserted by the dedicated
        // ERRATUM 6 test below; here only static pickers are checked.
        if (f.type === 'picker' && !f.pickerFrom) {
          expect(slugs.has(f.picker!), `${c.slug}.${f.name} → ${f.picker}`).toBe(true)
        }
      }
      for (const f of c.lineFields ?? []) {
        if (f.type === 'picker' && f.picker && !f.pickerFrom) {
          expect(slugs.has(f.picker), `${c.slug} line.${f.name} → ${f.picker}`).toBe(true)
        }
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
      invoice: '/accounts/invoice', 'cost-sheet': '/costing/cost-sheet', payment: '/accounts/payments',
    }
    for (const c of DOC_CONFIGS) {
      // Wave D: accounts/inventory ops OUTSIDE the order chain (debit-note,
      // journal, stock-adjustment, godown-transfer) carry NO chainStage.
      if (c.chainStage === undefined) continue
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
    // SPEC-M5 §6 (Wave C): agent-door-only HOOK FLAGS — optional booleans on the
    // base schemas (transfer requiresAck / grn reprocess / despatch returnable)
    // that make the posting services leave a pending Approval row. They are
    // deliberately NOT form fields (default false = pre-Wave-C behaviour; the
    // form door never sets them), so the mirror rule skips them.
    const AGENT_ONLY_HOOK_KEYS = new Set(['requiresAck', 'reprocess', 'returnable'])
    for (const c of DOC_CONFIGS) {
      const shape = (c.schema as unknown as { shape?: Record<string, unknown> }).shape
      if (!shape) throw new Error(`${c.slug} schema must be a zod object`)
      const headerNames = c.headerFields.map((f) => f.name)
      const lineNames = (c.lineFields ?? []).map((f) => f.name)
      const linesKey = c.linesKey ?? 'lines'
      for (const key of Object.keys(shape)) {
        if (AGENT_ONLY_HOOK_KEYS.has(key)) continue
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

  it('routes: the 7 Wave D screens are LIVE with page files (§8 rows 14-20)', () => {
    const waveD: { slug: string; route: string; view?: string }[] = [
      { slug: 'invoice', route: '/accounts/invoice', view: '/accounts/invoice/[id]' },
      { slug: 'debit-note', route: '/accounts/debit-note', view: '/accounts/debit-note/[id]' },
      { slug: 'payment', route: '/accounts/payments', view: '/accounts/payments/[id]' },
      { slug: 'journal', route: '/accounts/journal', view: '/accounts/journal/[id]' },
      { slug: 'cost-sheet', route: '/costing/cost-sheet', view: '/costing/cost-sheet/[id]' },
      { slug: 'stock-adjustment', route: '/inventory/adjustment' }, // ledger rows are the record — no [id] view
      { slug: 'godown-transfer', route: '/inventory/transfer' }, // ledger pair is the record — no [id] view
    ]
    for (const w of waveD) {
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

  it('ERRATUM 6 (Wave D): header pickerFrom targets are select option values of the sibling field', () => {
    // the typed header picker pattern: itemCode ← itemType (yarn|fabric|accessory)
    for (const slug of ['stock-adjustment', 'godown-transfer']) {
      const c = getDocConfig(slug)!
      const typed = c.headerFields.filter((f) => f.pickerFrom)
      expect(typed.length, `${slug} has a pickerFrom field`).toBeGreaterThan(0)
      for (const f of typed) {
        const sibling = c.headerFields.find((g) => g.name === f.pickerFrom)
        expect(sibling, `${slug}.${f.name}.pickerFrom → sibling ${f.pickerFrom}`).toBeTruthy()
        expect(sibling!.type, `${slug}: sibling ${f.pickerFrom} must be a select`).toBe('select')
        const opts = new Set((sibling!.options ?? []).map((o) => o.value))
        for (const itemSlug of ['yarn', 'fabric', 'accessory']) {
          expect(opts.has(itemSlug), `${slug}: sibling options must include master slug '${itemSlug}'`).toBe(true)
        }
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

    // M39 (JWL-03): the receipt is CUMULATIVE — sent (totalQty) stays the
    // immutable truth, receivedQty accumulates, a short receipt lands 'partial'
    const receipt = await commitDocAction('jobwork-in', {
      header: { dcNo: jwNo, receivedQty: '148', receivedDate: '2027-05-20' },
      lines: [],
    })
    expect(receipt.ok).toBe(true)
    const jw2 = await db.jobworkOrder.findUnique({ where: { dcNo: jwNo } })
    expect(jw2?.status).toBe('partial')
    expect(jw2?.totalQty).toBe(150) // SENT — never overwritten (the M3 bug is dead)
    expect(jw2?.receivedQty).toBe(148) // cumulative receipts
    expect(jw2?.receivedDate).toBeTruthy()
  })

  it('unknown Wave C slug returns the structured error (registry guard)', async () => {
    const bad = await planDocAction('productionn', { header: {}, lines: [] })
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(bad.errors[0]).toContain('Unknown document type')
  })
})

describe('form-door integration — Wave D accounts + inventory ops (ADR-001 through the generic actions)', () => {
  // covers the Wave D shapes: GST-computing op (invoice), invoice-settling op
  // (payment with companion JV), versioned op (cost-sheet), free voucher
  // (journal), and the two NEW ledger-only inventory ops through the form door
  // (their two-door parity is asserted in doc-parity tests 20-21).
  const stamp = Date.now()
  const orderNo = `WD-${stamp}`
  const invNo = `WDINV-${stamp}`
  const csStamp = `WD${stamp}`
  const vNo = `WDV-${stamp}`
  const dnNo = `WDDN-${stamp}`
  const adjNo = `WDADJ-${stamp}`
  const gtNo = `WDGT-${stamp}`
  const CUSTOMER = 'CUS001'
  const YARN = 'Y-30COT'
  let orderId: string | undefined
  let invoiceId: string | undefined
  let paymentId: string | undefined
  let costSheetId: string | undefined
  let journalId: string | undefined
  let debitNoteId: string | undefined
  let paymentVoucherNo = '' // auto-assigned (RCP-####) — captured for cleanup
  let yarnId = ''
  // pre-test yarn buckets (form-door inventory ops write here)
  let g1BucketBefore: { id: string; kgs: number } | null = null
  let g2BucketBefore: { id: string; kgs: number } | null = null

  beforeAll(async () => {
    const yarn = await db.yarn.findUnique({ where: { code: YARN } })
    if (!yarn) throw new Error(`seed yarn ${YARN} missing`)
    yarnId = yarn.id
    const [g1, g2] = await Promise.all([
      db.godown.findUnique({ where: { code: 'G1' } }),
      db.godown.findUnique({ where: { code: 'G2' } }),
    ])
    for (const [g, setter] of [
      [g1, (b: { id: string; kgs: number } | null) => { g1BucketBefore = b }],
      [g2, (b: { id: string; kgs: number } | null) => { g2BucketBefore = b }],
    ] as const) {
      const b = g
        ? await db.currentStock.findFirst({
            where: { itemType: 'yarn', itemId: yarnId, godownId: g.id, lotId: null, colourId: null, sizeId: null, deptId: null, orderId: null },
          })
        : null
      setter(b ? { id: b.id, kgs: b.kgs } : null)
    }
  })

  afterAll(async () => {
    const sw = (e: unknown) => e as any
    // FK-safe, best-effort, children first
    if (paymentId) await sw(db.payment.delete({ where: { id: paymentId } }).catch(() => {}))
    if (paymentVoucherNo) {
      await sw(db.journal.deleteMany({ where: { voucherNo: { in: [vNo, `JV-${paymentVoucherNo}`] } } }).catch(() => {}))
    } else {
      await sw(db.journal.deleteMany({ where: { voucherNo: vNo } }).catch(() => {}))
    }
    await sw(db.costSheet.deleteMany({ where: { orderId: orderId ?? 'none' } }).catch(() => {}))
    await sw(db.salesInvoice.deleteMany({ where: { invoiceNo: invNo } }).catch(() => {}))
    await sw(db.debitNote.deleteMany({ where: { noteNo: dnNo } }).catch(() => {}))
    await sw(db.stockLedger.deleteMany({ where: { docNo: { in: [adjNo, gtNo] } } }).catch(() => {}))
    await sw(db.orderLine.deleteMany({ where: { orderId: orderId ?? 'none' } }).catch(() => {}))
    await sw(db.order.deleteMany({ where: { id: orderId ?? 'none' } }).catch(() => {}))
    // yarn buckets: restore absolute pre-test state
    const [g1, g2] = await Promise.all([
      db.godown.findUnique({ where: { code: 'G1' } }),
      db.godown.findUnique({ where: { code: 'G2' } }),
    ])
    for (const [g, before] of [
      [g1, g1BucketBefore],
      [g2, g2BucketBefore],
    ] as const) {
      if (!g) continue
      if (before) {
        await sw(db.currentStock.update({ where: { id: before.id }, data: { kgs: before.kgs } }).catch(() => {}))
      } else {
        await sw(db.currentStock.deleteMany({ where: { itemType: 'yarn', itemId: yarnId, godownId: g.id } }).catch(() => {}))
      }
    }
    await db.$disconnect()
  })

  it('invoice: GST math through the form door (cgst_sgst split + billAmount)', async () => {
    const orderRes = await commitDocAction('order', {
      header: { orderNo, buyerCode: 'B001', styleNo: 'S-1001', deliveryDate: '2027-06-30' },
      lines: [{ colourName: 'Navy', sizeName: 'L', qty: '50', rate: '300' }],
    })
    expect(orderRes.ok).toBe(true)
    if (orderRes.ok) orderId = orderRes.doc?.id

    const payload: DocFormPayload = {
      header: {
        invoiceNo: invNo,
        orderNo,
        partyCode: CUSTOMER,
        billType: 'sales',          // select → string passthrough
        totalQty: '50',             // number coercion
        taxableValue: '15000',
        gstRate: '12',
        gstType: 'cgst_sgst',       // select
        invoiceDate: '2027-05-10',
        notes: '',
      },
      lines: [],
    }
    const plan = await planDocAction('invoice', payload)
    expect(plan.ok).toBe(true)
    if (plan.ok) expect(plan.plan.creates?.[0].table).toBe('salesInvoice')
    const commit = await commitDocAction('invoice', payload)
    expect(commit.ok).toBe(true)
    if (commit.ok) {
      invoiceId = commit.doc?.id
      expect(commit.doc?.invoiceNo).toBe(invNo)
      expect(commit.doc?.billAmount).toBe(16800) // 15000 + 12% GST
    }
    const inv = await db.salesInvoice.findUnique({ where: { invoiceNo: invNo } })
    expect(inv?.cgstRate).toBe(6)
    expect(inv?.sgstRate).toBe(6)
    expect(inv?.cgstAmt).toBe(900)
    expect(inv?.sgstAmt).toBe(900)
    expect(inv?.igstRate).toBe(0)
    expect(inv?.status).toBe('issued')
  })

  it('payment: full receipt against the invoice settles it via ALLOCATIONS (M40 PAY-01) + writes the companion JV', async () => {
    const res = await commitDocAction('payment', {
      header: {
        voucherNo: '',
        partyCode: CUSTOMER,
        amount: '16800',
        direction: 'in',
        invoiceNo: invNo,
        orderNo,
        mode: 'bank',
        reference: 'UTR-WD-TEST',
        payDate: '2027-05-12',
        notes: '',
      },
      lines: [],
    })
    expect(res.ok).toBe(true)
    if (res.ok) {
      paymentId = res.doc?.id
      paymentVoucherNo = String(res.doc?.voucherNo ?? '')
      // SPEC-M40 PAY-01 — settlement rides allocation rows (invoiceSettled retired)
      expect(res.doc?.allocated).toBe(16800)
      expect(res.doc?.onAccount).toBe(0)
    }
    const inv = await db.salesInvoice.findUnique({ where: { invoiceNo: invNo } })
    expect(inv?.status).toBe('paid')
    const pay = await db.payment.findFirst({ where: { invoiceId: inv?.id } })
    expect(pay?.direction).toBe('in')
    expect(pay?.amount).toBe(16800)
    expect(pay?.status).toBe('active')
    const alloc = await db.paymentAllocation.findFirst({ where: { invoiceId: inv?.id, reversedAt: null } })
    expect(alloc?.amount).toBe(16800)
    const jv = await db.journal.findUnique({ where: { voucherNo: `JV-${paymentVoucherNo}` } })
    expect(jv?.voucherType).toBe('receipt')
    expect(jv?.amount).toBe(16800)
  })

  it('cost-sheet: version auto-increments + totals computed (no doc number — ERRATUM 4)', async () => {
    const c = getDocConfig('cost-sheet')!
    expect(c.numberPrefix).toBeUndefined()
    expect(c.numberField).toBeUndefined()
    const res = await commitDocAction('cost-sheet', {
      header: {
        orderNo,
        fabricCost: '8000',
        trimCost: '1500',
        cmCost: '3000',
        washingCost: '',
        packingCost: '500',
        overheads: '1000',
        commissionPct: '2',
        marginPct: '15',
        sellingPrice: '18000',
      },
      lines: [],
    })
    expect(res.ok).toBe(true)
    if (res.ok) {
      costSheetId = res.doc?.id
      expect(res.doc?.version).toBe(1)
    }
    const cs = await db.costSheet.findUnique({ where: { id: costSheetId ?? 'none' } })
    expect(cs?.totalCost).toBe(14000)
    expect(cs?.sellingPrice).toBe(18000)
  })

  it('journal: voucher commits with party link', async () => {
    const res = await commitDocAction('journal', {
      header: {
        voucherNo: vNo,
        voucherType: 'journal',
        debitAccount: 'Freight Expense',
        creditAccount: 'Cash',
        amount: '2500.75',
        partyCode: CUSTOMER,
        narration: 'Wave D form-door test',
        date: '2027-05-15',
      },
      lines: [],
    })
    expect(res.ok).toBe(true)
    if (res.ok) journalId = res.doc?.id
    const j = await db.journal.findUnique({ where: { voucherNo: vNo } })
    expect(j?.amount).toBe(2500.75)
    expect(j?.partyId).toBeTruthy()
  })

  it('debit-note: bad party surfaces structured error; good party commits', async () => {
    const bad = await planDocAction('debit-note', {
      header: { noteNo: dnNo, noteType: 'pcs', partyCode: 'NOPE-404', amount: '500', reason: 'x' },
      lines: [],
    })
    expect(bad.ok).toBe(false)
    if (!bad.ok) expect(bad.errors.join(' ')).toContain('NOPE-404')

    const good = await commitDocAction('debit-note', {
      header: { noteNo: dnNo, noteType: 'pcs', partyCode: CUSTOMER, amount: '500', reason: 'quality claim', date: '2027-05-16' },
      lines: [],
    })
    expect(good.ok).toBe(true)
    if (good.ok) debitNoteId = good.doc?.id
    const dn = await db.debitNote.findUnique({ where: { noteNo: dnNo } })
    expect(dn?.status).toBe('raised')
  })

  it('stock-adjustment: form door → ledger row + CurrentStock bump (typed picker config)', async () => {
    const res = await commitDocAction('stock-adjustment', {
      header: {
        docNo: adjNo,
        godownCode: 'G1',
        itemType: 'yarn',          // select drives the itemCode pickerFrom slug
        itemCode: YARN,
        qty: '5',
        action: 'add',
        reason: 'form-door audit correction',
        adjDate: '2027-05-17',
      },
      lines: [],
    })
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.doc?.docNo).toBe(adjNo)
    const row = await db.stockLedger.findFirst({ where: { docNo: adjNo } })
    expect(row?.txnType).toBe('stock_adjustment_add')
    expect(row?.inKgs).toBe(5)
    const g1 = await db.godown.findUnique({ where: { code: 'G1' } })
    const bucket = await db.currentStock.findFirst({
      where: { itemType: 'yarn', itemId: yarnId, godownId: g1!.id, lotId: null, colourId: null, sizeId: null, deptId: null, orderId: null },
    })
    expect(bucket?.kgs).toBeCloseTo((g1BucketBefore?.kgs ?? 0) + 5, 5)
  })

  it('transfer: form door → out+in ledger pair sharing one docNo, net stock unchanged', async () => {
    const netBefore = (await db.currentStock.findMany({ where: { itemType: 'yarn', itemId: yarnId } }))
      .reduce((s, x) => s + x.kgs, 0)
    const res = await commitDocAction('godown-transfer', {
      header: {
        docNo: gtNo,
        itemType: 'yarn',
        itemCode: YARN,
        fromGodownCode: 'G1',
        toGodownCode: 'G2',
        qty: '3',
        notes: 'form-door rebalancing',
        transferDate: '2027-05-18',
      },
      lines: [],
    })
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.doc?.docNo).toBe(gtNo)
    const rows = await db.stockLedger.findMany({ where: { docNo: gtNo } })
    expect(rows).toHaveLength(2)
    const txnTypes = rows.map((r) => r.txnType).sort()
    expect(txnTypes).toEqual(['godown_transfer_in', 'godown_transfer_out'])
    const out = rows.find((r) => r.txnType === 'godown_transfer_out')!
    const inn = rows.find((r) => r.txnType === 'godown_transfer_in')!
    expect(out.outKgs).toBe(3)
    expect(inn.inKgs).toBe(3)
    const netAfter = (await db.currentStock.findMany({ where: { itemType: 'yarn', itemId: yarnId } }))
      .reduce((s, x) => s + x.kgs, 0)
    expect(netAfter).toBeCloseTo(netBefore, 5)
    // G2 gained the 3 kgs
    const g2 = await db.godown.findUnique({ where: { code: 'G2' } })
    const bucket2 = await db.currentStock.findFirst({
      where: { itemType: 'yarn', itemId: yarnId, godownId: g2!.id, lotId: null, colourId: null, sizeId: null, deptId: null, orderId: null },
    })
    expect(bucket2?.kgs).toBeCloseTo((g2BucketBefore?.kgs ?? 0) + 3, 5)
  })

  it('M5 Wave B: 13 variant configs → page files; family views reused; wage picker pinned to employee parties', () => {
    const waveB: Array<{ slug: string; route: string }> = [
      { slug: 'finished-goods', route: '/pieces/finished-goods' },
      { slug: 'operation-entry', route: '/production/operations' },
      { slug: 'bundle-barcode', route: '/production/bundles' },
      { slug: 'panel-production', route: '/cutting/panel-production' },
      { slug: 'panel-excess', route: '/cutting/panel-excess' },
      { slug: 'panel-rej-rework', route: '/cutting/panel-rework' },
      { slug: 'fabric-rejection-return', route: '/cutting/fab-rejection' },
      { slug: 'pcs-shortage', route: '/pieces/shortage' },
      { slug: 'panel-cutting', route: '/cutting/panel' },
      { slug: 'line-transfer', route: '/production/line-transfer' },
      { slug: 'jobwork-pcs-return', route: '/jobwork/pcs-return' },
      { slug: 'costing-input', route: '/costing/input' },
      { slug: 'wage-payments', route: '/hr/wage-payments' },
    ]
    for (const { slug, route } of waveB) {
      const cfg = getDocConfig(slug)!
      expect(cfg, slug).toBeTruthy()
      expect(fs.existsSync(path.join(ERP_DIR, route, 'page.tsx')), `${route} page`).toBe(true)
    }
    // the ProductionEntry-family variants carry NO own doc number (ERRATUM 4
    // precedent — bundleNo is the reference); the numbered families share space
    for (const slug of ['finished-goods', 'operation-entry', 'bundle-barcode', 'panel-production', 'panel-excess']) {
      const cfg = getDocConfig(slug)!
      expect(cfg.numberPrefix, `${slug} numberPrefix`).toBeUndefined()
    }
    expect(getDocConfig('panel-rej-rework')!.numberPrefix).toBe('REJ-')
    expect(getDocConfig('jobwork-pcs-return')!.numberPrefix).toBe('GRN-')
    expect(getDocConfig('line-transfer')!.numberPrefix).toBe('LT-')
    expect(getDocConfig('panel-cutting')!.numberPrefix).toBe('CUT-')
    // §10 W1: finished-goods is the stage-12 variant target
    expect(getDocConfig('finished-goods')!.chainStage).toBe(12)
    // ERRATUM 7: wage-payments party picker filtered to employee parties
    const partyField = getDocConfig('wage-payments')!.headerFields.find((f) => f.name === 'partyCode')!
    expect(partyField.pickerFilter).toEqual({ field: 'partyType', value: 'employee' })
    // every Wave B config names at least one agent tool door
    for (const { slug } of waveB) {
      expect(getDocConfig(slug)!.agentTools.length, `${slug} agentTools`).toBeGreaterThan(0)
    }
  })

  it('M5 Wave D: 10 new-model/write-door configs → page files; gate variants inject gateType; ERRATUM 4 numberless families', () => {
    const waveD: Array<{ slug: string; route: string; view?: string }> = [
      { slug: 'sample', route: '/orders/samples', view: '/orders/samples/[id]' },
      { slug: 'gate-entry', route: '/dispatch/gate-entry', view: '/dispatch/gate-entry/[id]' },
      { slug: 'gate-pass', route: '/dispatch/gate-pass', view: '/dispatch/gate-pass/[id]' },
      { slug: 'packing-list', route: '/pieces/packing-list', view: '/pieces/packing-list/[id]' },
      { slug: 'lab-test', route: '/quality/lab-tests', view: '/quality/lab-tests/[id]' },
      { slug: 'expense', route: '/costing/expenses', view: '/costing/expenses/[id]' },
      { slug: 'roll-split', route: '/inventory/rolls' },
      { slug: 'contract-allotment', route: '/jobwork/contract' },
      { slug: 'program-allotment', route: '/programs/allotment' },
      { slug: 'production-bill', route: '/accounts/production-bills' },
    ]
    for (const { slug, route, view } of waveD) {
      const cfg = getDocConfig(slug)!
      expect(cfg, slug).toBeTruthy()
      expect(fs.existsSync(path.join(ERP_DIR, route, 'page.tsx')), `${route} page`).toBe(true)
      if (view) expect(fs.existsSync(path.join(ERP_DIR, view, 'page.tsx')), `${view} view page`).toBe(true)
      expect(cfg.agentTools.length, `${slug} agentTools`).toBeGreaterThan(0)
    }
    // number prefixes on the numbered families (ADR-015 docNo conventions)
    const prefixes: Record<string, string> = {
      sample: 'SMP-', 'gate-entry': 'GE-', 'gate-pass': 'GP-', 'packing-list': 'PKL-',
      'lab-test': 'LT-', expense: 'EXP-', 'roll-split': 'RSP-',
    }
    for (const [slug, prefix] of Object.entries(prefixes)) {
      expect(getDocConfig(slug)!.numberPrefix, `${slug} numberPrefix`).toBe(prefix)
    }
    // ERRATUM 4 numberless families (system-assigned or none)
    for (const slug of ['contract-allotment', 'program-allotment', 'production-bill']) {
      expect(getDocConfig(slug)!.numberPrefix, `${slug} numberPrefix`).toBeUndefined()
      expect(getDocConfig(slug)!.numberField, `${slug} numberField`).toBeUndefined()
    }
    // the gate pair shares ONE schema + service; the variants inject gateType
    const ge = getDocConfig('gate-entry')!
    const gp = getDocConfig('gate-pass')!
    expect(ge.schema).toBe(gp.schema)
    expect(gp.title).toBe('Gate Pass')
    expect(ge.title).toBe('Gate Entry')
    // lab-test: the typed item picker (ERRATUM 6 — itemType cell drives the slug)
    const itemField = getDocConfig('lab-test')!.headerFields.find((f) => f.name === 'itemCode')!
    expect(itemField.pickerFrom).toBe('itemType')
    // packing-list: carton line editor + rides the despatch stage (12)
    const pl = getDocConfig('packing-list')!
    expect(pl.linesKey).toBe('lines')
    expect(pl.lineFields!.map((f) => f.name)).toContain('cartonNo')
    expect(pl.chainStage).toBe(12)
    // W1 stage alignment: contract-allotment precedes the jobwork DC (stage 6);
    // program-allotment rides the program stage (3)
    expect(getDocConfig('contract-allotment')!.chainStage).toBe(6)
    expect(getDocConfig('program-allotment')!.chainStage).toBe(3)
  })
})
