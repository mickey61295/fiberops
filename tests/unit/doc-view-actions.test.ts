/**
 * SPEC-M18 §4 Wave C tests — C1/C2: the doc-view Cancel/Void + Duplicate door.
 * (1) NEW_ROUTE_BY_SLUG integrity: every key is a real doc-config slug, every
 *     route is a LIVE_ROUTES member (a wrong route fails here, not on the
 *     operator's click), and the four cancelable families are mapped;
 * (2) cancel-action roundtrips through the REAL posting services (ADR-001):
 *     plan returns the service's own summary/sideEffects; commit performs the
 *     status transition; unknown slugs are rejected; the PO cancel guard
 *     (receipts received) and the program already-cancelled guard fire.
 * (3) the doc-screen view wiring pins (action row rendered with slug/status).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { db } from '@/lib/db'
import { NEW_ROUTE_BY_SLUG } from '@/lib/erp/new-routes'
import { DOC_CONFIGS, getDocConfig } from '@/lib/erp/doc-configs'
import { LIVE_ROUTES } from '@/lib/erp/menu-registry'
import { planCancelDocView, commitCancelDocView } from '@/lib/erp/cancel-action'

const TS = Date.now()
let partyId = ''
let buyerId = ''
let styleId = ''
let yarnId = ''
let godownId = ''
let orderId = ''
let poId = ''
let invoiceId = ''
let programId = ''
const ORDER_NO = `SO-WC-${TS}`
const PO_NO = `PO-WC-${TS}`
const PO_RCVD = `POR-WC-${TS}`
const INV_NO = `INV-WC-${TS}`
const PGM_NO = `PGM-WC-${TS}`
const PGM_CANCELLED = `PGMX-WC-${TS}`

describe('M18 Wave C: doc-view actions (SPEC-M18 §4-C1/C2)', () => {
  beforeAll(async () => {
    const party = await db.party.create({
      data: { code: `WCPY-${TS}`, name: `WC Party ${TS}`, city: 'Tirupur', partyType: 'supplier' },
    })
    partyId = party.id
    const buyer = await db.buyer.create({ data: { code: `WCBY-${TS}`, name: `WC Buyer ${TS}` } })
    buyerId = buyer.id
    const style = await db.style.create({ data: { styleNo: `WCST-${TS}` } })
    styleId = style.id
    // yarn needs a UOM (required relation) — reuse any existing, else mint one
    let uomId = (await db.uOM.findFirst({ select: { id: true } }))?.id
    if (!uomId) uomId = (await db.uOM.create({ data: { code: `WCUOM-${TS}`, name: `WC UOM ${TS}` } })).id
    const yarn = await db.yarn.create({ data: { code: `WCYN-${TS}`, count: '30S', uomId } })
    yarnId = yarn.id
    const godown = await db.godown.create({ data: { code: `WCGD-${TS}`, name: `WC Godown ${TS}` } })
    godownId = godown.id

    const order = await db.order.create({
      data: { orderNo: ORDER_NO, buyerId, styleId, finYear: 'FY26', status: 'open' },
    })
    orderId = order.id
    const po = await db.purchaseOrder.create({
      data: { poNo: PO_NO, poType: 'yarn', partyId, finYear: 'FY26', status: 'open', lines: { create: { itemType: 'yarn', itemId: yarnId, qty: 10, rate: 80, amount: 800 } } },
    })
    poId = po.id
    const poRcvd = await db.purchaseOrder.create({
      data: { poNo: PO_RCVD, poType: 'yarn', partyId, finYear: 'FY26', status: 'partial' },
    })
    // a received GRN against PO_RCVD so the receipts-guard fires
    await db.gRN.create({
      data: { grnNo: `GRN-WC-${TS}`, grnType: 'purchase', poId: poRcvd.id, partyId, godownId, finYear: 'FY26', totalQty: 5 },
    })
    const inv = await db.salesInvoice.create({
      data: { invoiceNo: INV_NO, partyId, finYear: 'FY26', status: 'issued', billAmount: 1000 },
    })
    invoiceId = inv.id
    const program = await db.program.create({
      data: { programNo: PGM_NO, orderId, stage: 'knitting', yarnId, requiredKgs: 10, status: 'open' },
    })
    programId = program.id
    await db.program.create({
      data: { programNo: PGM_CANCELLED, orderId, stage: 'knitting', yarnId, requiredKgs: 10, status: 'cancelled' },
    })
    void poId
  })

  afterAll(async () => {
    const cleanup = async (fn: () => Promise<unknown>) => { try { await fn() } catch { /* already gone */ } }
    await cleanup(() => db.gRNLine.deleteMany({ where: { grn: { grnNo: `GRN-WC-${TS}` } } }))
    await cleanup(() => db.gRN.deleteMany({ where: { grnNo: `GRN-WC-${TS}` } }))
    await cleanup(() => db.program.deleteMany({ where: { programNo: { in: [PGM_NO, PGM_CANCELLED] } } }))
    await cleanup(() => db.salesInvoice.deleteMany({ where: { id: invoiceId } }))
    // POLines FIRST — PO delete is FK-restricted while lines exist (Prisma
    // default Restrict on the required relation; the .catch would silently
    // leak the PO otherwise — the exact residue bug caught post-run)
    await cleanup(() => db.pOLine.deleteMany({ where: { po: { poNo: { in: [PO_NO, PO_RCVD] } } } }))
    await cleanup(() => db.purchaseOrder.deleteMany({ where: { poNo: { in: [PO_NO, PO_RCVD] } } }))
    await cleanup(() => db.order.deleteMany({ where: { id: orderId } }))
    await cleanup(() => db.yarn.deleteMany({ where: { id: yarnId } }))
    await cleanup(() => db.uOM.deleteMany({ where: { code: `WCUOM-${TS}` } })) // no-op when an existing UOM was reused
    await cleanup(() => db.style.deleteMany({ where: { id: styleId } }))
    await cleanup(() => db.buyer.deleteMany({ where: { id: buyerId } }))
    await cleanup(() => db.godown.deleteMany({ where: { id: godownId } }))
    await cleanup(() => db.party.deleteMany({ where: { id: partyId } }))
  })

  it('NEW_ROUTE_BY_SLUG: every key is a registered doc slug', () => {
    for (const slug of Object.keys(NEW_ROUTE_BY_SLUG)) {
      expect(getDocConfig(slug), `slug '${slug}' must resolve to a doc config`).toBeTruthy()
    }
  })

  it('NEW_ROUTE_BY_SLUG: every route is a LIVE route (click can never 404 by map drift)', () => {
    const live = new Set(LIVE_ROUTES)
    for (const [slug, route] of Object.entries(NEW_ROUTE_BY_SLUG)) {
      expect(live.has(route), `${slug} → ${route} must be in LIVE_ROUTES`).toBe(true)
    }
  })

  it('NEW_ROUTE_BY_SLUG covers every registered doc family (full parity with the registry)', () => {
    for (const cfg of DOC_CONFIGS) {
      expect(NEW_ROUTE_BY_SLUG[cfg.slug], `registry slug '${cfg.slug}' needs a Duplicate route`).toBeTruthy()
    }
  })

  it('the four cancelable families are mapped (order / purchase-order / invoice / program)', () => {
    expect(NEW_ROUTE_BY_SLUG.order).toBe('/orders/new')
    expect(NEW_ROUTE_BY_SLUG['purchase-order']).toBe('/procurement/po')
    expect(NEW_ROUTE_BY_SLUG.invoice).toBe('/accounts/invoice')
    expect(NEW_ROUTE_BY_SLUG.program).toBe('/programs/new')
  })

  it('planCancelDocView: unknown slug rejected; the four families plan via their real services', async () => {
    const bad = await planCancelDocView('despatch', 'DC-1')
    expect(bad.ok).toBe(false)

    const order = await planCancelDocView('order', ORDER_NO)
    expect(order.ok).toBe(true)
    if (order.ok) {
      expect(order.plan.summary).toContain('Cancel order')
      expect(order.plan.sideEffects.length).toBeGreaterThan(0)
    }

    const po = await planCancelDocView('purchase-order', PO_NO)
    expect(po.ok).toBe(true)

    const inv = await planCancelDocView('invoice', INV_NO)
    expect(inv.ok).toBe(true)
    if (inv.ok) expect(inv.plan.summary).toContain('Cancel invoice')

    const pgm = await planCancelDocView('program', PGM_NO)
    expect(pgm.ok).toBe(true)
  })

  it('guards fire through the view door: PO with receipts, already-cancelled program', async () => {
    const po = await planCancelDocView('purchase-order', PO_RCVD)
    expect(po.ok).toBe(false)
    if (!po.ok) expect(po.error).toContain('received')

    const pgm = await planCancelDocView('program', PGM_CANCELLED)
    expect(pgm.ok).toBe(false)
    if (!pgm.ok) expect(pgm.error).toContain('already cancelled')
  })

  it('commitCancelDocView commits the status transition (order: open → cancelled)', async () => {
    const res = await commitCancelDocView('order', ORDER_NO, 'test cancel from Wave C suite')
    expect(res.ok).toBe(true)
    const after = await db.order.findUnique({ where: { id: orderId } })
    expect(after?.status).toBe('cancelled')
    expect(after?.notes).toContain('test cancel from Wave C suite')
  })

  it('doc-screen view mode renders the action row (source pins)', () => {
    const src = readFileSync(join(process.cwd(), 'src/components/archetypes/doc-screen.tsx'), 'utf8')
    expect(src).toContain('<DocViewActions')
    expect(src).toContain('status={typeof initial?.status')
    expect(src).toContain("fo.duplicate.")
    expect(src).toContain('resource=last_rate')
    const actions = readFileSync(join(process.cwd(), 'src/components/erp/doc-view-actions.tsx'), 'utf8')
    expect(actions).toContain('planCancelDocView')
    expect(actions).toContain('commitCancelDocView')
    expect(actions).toContain("sessionStorage.setItem")
    expect(actions).toContain('CANCEL_HIDDEN_STATUS')
  })
})
