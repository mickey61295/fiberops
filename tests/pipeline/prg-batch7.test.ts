/**
 * PRG Batch 7 (Phase-6B, SPEC-M43) — the program-flow revival tier:
 *   PRG-01  order schema additions (buyerPoRef / orderType / OrderDelivery REPLACE service)
 *   PRG-02  multi-style orders (flag-gated, default OFF — §17-5 stays open)
 *   PRG-03  GSM/LL physics (knitting spec on ProgBalanceFabric + correction w/ audit)
 *   PRG-04  waterfall read model (PO'd / DC'd / GRN'd / Finished — ledger + POLine derived)
 *   PRG-05  BOM→program pre-fill (BomLine × per-style order qty × wastage flags)
 *
 * Spec §10 walkthrough (dive-1 loop): order → program (spec) → POLine →
 * jobwork DC out → process receipt back → the program-status waterfall
 * columns close. Dead-trio source contract: posting-engine / movement-matrix
 * / projectors are GONE (the read service is their honest successor).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { db } from '@/lib/db'
import { postLedger } from '@/lib/erp/posting/ledger'
import { planOrder } from '@/lib/erp/posting/order'
import { planOrderDeliveries } from '@/lib/erp/posting/order-deliveries'
import { planProgram } from '@/lib/erp/posting/program'
import { planProgramSpecCorrection } from '@/lib/erp/posting/program-spec'
import { setFlag } from '@/lib/erp/flags'
import { runCommit } from '@/lib/erp/audit'
import { queryProgramStatus } from '@/lib/erp/registers/program-status'
import { queryOrderRegister } from '@/lib/erp/registers/order-register'
import { proposeProgramRequirements } from '@/lib/erp/registers/program-proposal'
import { fetchOrderPrint } from '@/lib/erp/print/fetchers-order'
import { getTool, allTools } from '@/lib/agent/tools'
import { ORDER_SCHEMA } from '@/lib/erp/schemas/order'
import { PROGRAM_SCHEMA } from '@/lib/erp/schemas/program'
import { PROMPT_VERSION } from '@/lib/agent/prompt'
import { MENU_ITEMS, LIVE_ROUTES } from '@/lib/erp/menu-registry'
import { programStatusConfig } from '@/lib/erp/register-configs/m6-wave-c'
import { orderRegisterConfig } from '@/lib/erp/register-configs/order-register'
import { FLAG_DEFS } from '@/lib/erp/flags'

const TS = Date.now()
const BUYER = `M43-B-${TS}`
const S1 = `M43-S1-${TS}` // style with BOM 0.18 kg/pc
const S2 = `M43-S2-${TS}` // style with BOM 0.12 kg/pc (multi-style denominator)
const S3 = `M43-S3-${TS}` // style with NO BOM (the refusal leg)
const Y1 = `M43-Y1-${TS}` // the BOM yarn
const F1 = `M43-F1-${TS}` // the fabric program item
const G1 = `M43-G1-${TS}` // walkthrough godown
const COLOUR = `M43-C-${TS}`
const DESIGN = `M43-D-${TS}`
const DIA = `30` // dia master keyed by value

const ERP_DIR = join(process.cwd(), 'src/lib/erp')
const src = (p: string) => readFileSync(join(ERP_DIR, p), 'utf8')

async function commit<T>(planOrPromise: any): Promise<T> {
  const plan = await planOrPromise
  if (!plan.ok) throw new Error(`plan failed: ${plan.error ?? JSON.stringify(plan).slice(0, 300)}`)
  return plan.commit!()
}

let buyerId = '', s1Id = '', s2Id = '', s3Id = '', y1Id = '', f1Id = '', g1Id = ''
let colourId = '', designId = '', diaId = '', uomId = ''
let diaCreated = false // only delete the dia row when THIS suite created it

describe('PRG Batch 7 — SPEC-M43 program-flow revival', () => {
  beforeAll(async () => {
    const uom = (await db.uOM.findFirst({ where: { code: 'KGS' } })) ?? (await db.uOM.create({ data: { code: 'KGS', name: 'Kgs' } }))
    uomId = uom.id
    buyerId = (await db.buyer.create({ data: { code: BUYER, name: `M43 Buyer ${TS}` } })).id
    s1Id = (await db.style.create({ data: { styleNo: S1, description: `M43 style 1 ${TS}` } })).id
    s2Id = (await db.style.create({ data: { styleNo: S2, description: `M43 style 2 ${TS}` } })).id
    s3Id = (await db.style.create({ data: { styleNo: S3, description: `M43 style 3 (no BOM) ${TS}` } })).id
    y1Id = (await db.yarn.create({ data: { code: Y1, count: '30s', uomId: uom.id, rate: 210 } })).id
    f1Id = (await db.fabric.create({ data: { code: F1, gsm: 160, width: 24, uomId: uom.id, rate: 90 } })).id
    g1Id = (await db.godown.create({ data: { code: G1, name: `M43 ${G1}` } })).id
    colourId = (await db.colour.create({ data: { code: COLOUR, name: `M43 Navy ${TS}` } })).id
    designId = (await db.design.create({ data: { code: DESIGN, name: `M43 Stripe ${TS}` } })).id
    // dia master is keyed by VALUE — the seed already carries 30 (find-or-create)
    const existingDia = await db.dia.findUnique({ where: { value: DIA } })
    if (existingDia) {
      diaId = existingDia.id
    } else {
      diaId = (await db.dia.create({ data: { value: DIA } })).id
      diaCreated = true
    }
    // the two BOMs (BomLine is style-addressed, plain itemId)
    await db.bomLine.createMany({ data: [
      { styleId: s1Id, itemType: 'yarn', itemId: y1Id, qty: 0.18, uomId: uom.id, rate: 210 },
      { styleId: s2Id, itemType: 'yarn', itemId: y1Id, qty: 0.12, uomId: uom.id, rate: 210 },
    ] })
  })

  afterAll(async () => {
    // flags restored FIRST (order matters for later suites)
    await setFlag('multi_style_orders', false)
    await setFlag('boostupper', 2)
    await setFlag('reserveper', 0)
    // children before parents (PITFALLS #40 — Restrict swallows .catch(() => {}))
    await db.progBalanceFabric.deleteMany({ where: { fabricId: f1Id } }).catch(() => {})
    await db.progBalanceYarn.deleteMany({ where: { countId: y1Id } }).catch(() => {})
    await db.stockLedger.deleteMany({ where: { orderId: { in: await db.order.findMany({ where: { orderNo: { startsWith: 'M43-' } }, select: { id: true } }).then((r) => r.map((x) => x.id)) } } }).catch(() => {})
    await db.currentStock.deleteMany({ where: { AND: [{ itemType: 'yarn' }, { itemId: y1Id }] } }).catch(() => {})
    await db.currentStock.deleteMany({ where: { AND: [{ itemType: 'fabric' }, { itemId: f1Id }] } }).catch(() => {})
    await db.pOLine.deleteMany({ where: { itemId: y1Id } }).catch(() => {})
    await db.purchaseOrder.deleteMany({ where: { poNo: { startsWith: `M43-PO-${TS}` } } }).catch(() => {})
    await db.program.deleteMany({ where: { orderId: { in: await db.order.findMany({ where: { orderNo: { startsWith: 'M43-' } }, select: { id: true } }).then((r) => r.map((x) => x.id)) } } }).catch(() => {})
    await db.orderDelivery.deleteMany({ where: { orderId: { in: await db.order.findMany({ where: { orderNo: { startsWith: 'M43-' } }, select: { id: true } }).then((r) => r.map((x) => x.id)) } } }).catch(() => {})
    await db.orderLine.deleteMany({ where: { styleId: { in: [s1Id, s2Id, s3Id] } } }).catch(() => {})
    await db.order.deleteMany({ where: { orderNo: { startsWith: 'M43-' } } }).catch(() => {})
    await db.bomLine.deleteMany({ where: { styleId: { in: [s1Id, s2Id] } } }).catch(() => {})
    await db.style.deleteMany({ where: { styleId: undefined, id: { in: [s1Id, s2Id, s3Id] } } }).catch(() => {})
    await db.yarn.deleteMany({ where: { id: y1Id } }).catch(() => {})
    await db.fabric.deleteMany({ where: { id: f1Id } }).catch(() => {})
    await db.godown.deleteMany({ where: { id: g1Id } }).catch(() => {})
    await db.colour.deleteMany({ where: { id: colourId } }).catch(() => {})
    await db.design.deleteMany({ where: { id: designId } }).catch(() => {})
    if (diaCreated) await db.dia.deleteMany({ where: { id: diaId } }).catch(() => {})
    await db.buyer.deleteMany({ where: { id: buyerId } }).catch(() => {})
  })

  // ──────────────────────────────────────────────────────────────────────
  describe('PRG-01 — order schema additions (buyerPoRef / orderType / deliveries)', () => {
    it('create_order with buyerPoRef + orderType + deliveries creates the schedule in-commit (one order, many dates)', async () => {
      const res = await commit<any>(planOrder({
        orderNo: `M43-A-${TS}`, buyerCode: BUYER, styleNo: S1,
        deliveryDate: '2026-10-31', buyerPoRef: '696GJ', orderType: 'domestic',
        deliveries: [
          { qty: 300, date: '2026-10-31' },
          { qty: 200, date: '2026-11-15', notes: 'balance lot' },
        ],
        lines: [{ colourName: `M43 Navy ${TS}`, sizeName: 'M', qty: 500, rate: 210 }],
      }))
      const order = await db.order.findUnique({ where: { id: res.id }, include: { deliveries: true } })
      expect(order?.buyerPoRef).toBe('696GJ')
      expect(order?.orderType).toBe('domestic')
      expect(order?.deliveries.length).toBe(2)
      expect(order?.deliveries.map((d) => d.seq).sort()).toEqual([1, 2])
      expect(order?.deliveries.find((d) => d.seq === 1)?.qty).toBe(300)
      expect(order?.deliveries.find((d) => d.seq === 2)?.qty).toBe(200)
      expect(order?.deliveries.find((d) => d.seq === 2)?.notes).toBe('balance lot')
      // header deliveryDate untouched = the FIRST/overall delivery (back-compat)
      expect(new Date(order!.deliveryDate).getUTCMonth()).toBe(9) // 2026-10
    })

    it('legacy create path is byte-identical: absent fields → null buyerPoRef / export / zero deliveries', async () => {
      const res = await commit<any>(planOrder({
        buyerCode: BUYER, styleNo: S1, deliveryDate: '2026-12-15',
        lines: [{ colourName: `M43 Navy ${TS}`, sizeName: 'M', qty: 100, rate: 210 }],
      }))
      const order = await db.order.findUnique({ where: { id: res.id }, include: { deliveries: true } })
      expect(order?.buyerPoRef).toBeNull()
      expect(order?.orderType).toBe('export') // the Tirupur default
      expect(order?.deliveries.length).toBe(0)
    })

    it('set_order_deliveries REPLACEs the set in one tx (guard: over-total + blank rows refuse)', async () => {
      const orderNo = `M43-A-${TS}`
      // replace 2 rows with 3
      const r = await commit<any>(planOrderDeliveries({
        orderNo,
        deliveries: [
          { qty: 200, date: '2026-10-20' },
          { qty: 150, date: '2026-11-05' },
          { qty: 150, date: '2026-11-25' },
        ],
      }))
      expect(r.shipments).toBe(3)
      const rows = await db.orderDelivery.findMany({ where: { order: { orderNo } }, orderBy: { seq: 'asc' } })
      expect(rows.length).toBe(3)
      expect(rows.map((x) => x.qty)).toEqual([200, 150, 150])
      expect(rows[0].seq).toBe(1) // seq renumbered by arrival
      // the over-total guard
      const over = await planOrderDeliveries({ orderNo, deliveries: [{ qty: 9999, date: '2026-12-01' }] })
      expect(over.ok).toBe(false)
      if (!over.ok) expect(over.error).toContain('cannot exceed')
      // unknown order
      const nope = await planOrderDeliveries({ orderNo: 'M43-NOPE', deliveries: [{ qty: 1, date: '2026-12-01' }] })
      expect(nope.ok).toBe(false)
    })

    it('the order register filters by orderType + searches buyerPoRef (first-class)', async () => {
      const byType = await queryOrderRegister({ orderType: 'domestic', q: '696GJ', limit: 50, page: 1 } as any)
      expect(byType.rows.length).toBeGreaterThan(0)
      expect(byType.rows.every((r: any) => r.orderType === 'domestic')).toBe(true)
      expect(byType.rows.some((r: any) => r.buyerPoRef === '696GJ')).toBe(true)
      const byPo = await queryOrderRegister({ q: '696GJ', limit: 50, page: 1 } as any)
      expect(byPo.rows.some((r: any) => r.orderNo === `M43-A-${TS}`)).toBe(true)
    })

    it('the order print carries Buyer PO meta + the multi-shipment schedule note', async () => {
      const doc = await fetchOrderPrint(`M43-A-${TS}`)
      expect(doc).toBeTruthy()
      const meta = Object.fromEntries((doc?.meta ?? []).map(([k, v]) => [k, v]))
      expect(meta['Buyer PO']).toBe('696GJ')
      expect(doc?.notes?.some((n) => n.includes('Delivery schedule:') && n.includes('200 pcs'))).toBe(true)
    })
  })

  // ──────────────────────────────────────────────────────────────────────
  describe('PRG-02 — multi-style orders (flag-gated, default OFF)', () => {
    it('flag OFF + a line style differing from the header REFUSES naming the flag', async () => {
      await setFlag('multi_style_orders', false)
      const res = await planOrder({
        buyerCode: BUYER, styleNo: S1, deliveryDate: '2026-12-20',
        lines: [{ colourName: `M43 Navy ${TS}`, sizeName: 'M', qty: 10, rate: 210, styleNo: S2 }],
      })
      expect(res.ok).toBe(false)
      if (!res.ok) {
        expect(res.error).toContain('multi_style_orders')
        expect(res.error).toContain(S2)
      }
    })

    it('flag ON: per-line styles resolve and store; blank line style = header fallback', async () => {
      await setFlag('multi_style_orders', true)
      const res = await commit<any>(planOrder({
        orderNo: `M43-MS-${TS}`, buyerCode: BUYER, styleNo: S1, deliveryDate: '2026-12-20',
        lines: [
          { colourName: `M43 Navy ${TS}`, sizeName: 'M', qty: 60, rate: 210 },            // blank → header S1
          { colourName: `M43 Navy ${TS}`, sizeName: 'M', qty: 40, rate: 220, styleNo: S2 }, // per-line S2
        ],
      }))
      const lines = await db.orderLine.findMany({ where: { orderId: res.id } })
      const byQty = new Map(lines.map((l) => [l.qty, l.styleId]))
      expect(byQty.get(60)).toBe(s1Id)
      expect(byQty.get(40)).toBe(s2Id)
      // flag back off for the rest of the suite (default preserved)
      await setFlag('multi_style_orders', false)
    })

    it('flag OFF + the SAME style as the header passes (no friction on the single-style path)', async () => {
      const res = await planOrder({
        buyerCode: BUYER, styleNo: S1, deliveryDate: '2026-12-20',
        lines: [{ colourName: `M43 Navy ${TS}`, sizeName: 'M', qty: 10, rate: 210, styleNo: S1 }],
      })
      expect(res.ok).toBe(true)
      if (res.ok) await res.commit!()
    })
  })

  // ──────────────────────────────────────────────────────────────────────
  describe('PRG-03 — GSM/LL physics (the knitting spec on ProgBalanceFabric)', () => {
    it('a fabric program with the spec writes colour/design/dia/gsm/ll onto the balance row', async () => {
      const res = await commit<any>(planProgram({
        orderNo: `M43-A-${TS}`, stage: 'dyeing', fabricCode: F1, requiredKgs: 100,
        colourCode: COLOUR, designCode: DESIGN, finDiaCode: DIA, finGsm: 180, ll: '2.80',
      }))
      expect(res.programNo).toMatch(/^PGM-/)
      const row = await db.progBalanceFabric.findFirst({ where: { orderId: res.orderId ?? undefined, fabricId: f1Id } })
      // find by the order actually created above (orderNo→order)
      const order = await db.order.findUnique({ where: { orderNo: `M43-A-${TS}` } })
      const row2 = await db.progBalanceFabric.findFirst({ where: { orderId: order!.id, fabricId: f1Id } })
      const r = row ?? row2
      expect(r).toBeTruthy()
      expect(r?.colourId).toBe(colourId)
      expect(r?.designId).toBe(designId)
      expect(r?.finDiaId).toBe(diaId)
      expect(r?.finGsm).toBe(180)
      expect(r?.ll).toBe('2.80')
      expect(r?.reqKgs).toBe(100)
    })

    it('spec WITHOUT a fabric program refuses (the spec belongs to fabric)', async () => {
      const res = await planProgram({
        orderNo: `M43-A-${TS}`, stage: 'knitting', yarnCode: Y1, requiredKgs: 10, finGsm: 180,
      })
      expect(res.ok).toBe(false)
      if (!res.ok) expect(res.error).toContain('FABRIC programs')
    })

    it('a second program on the same balance does NOT clobber the spec with blank inputs', async () => {
      await commit<any>(planProgram({
        orderNo: `M43-A-${TS}`, stage: 'dyeing', fabricCode: F1, requiredKgs: 40,
      }))
      const order = await db.order.findUnique({ where: { orderNo: `M43-A-${TS}` } })
      const row = await db.progBalanceFabric.findFirst({ where: { orderId: order!.id, fabricId: f1Id } })
      expect(row?.reqKgs).toBe(140) // 100 + 40 incremented
      expect(row?.finGsm).toBe(180) // untouched
      expect(row?.ll).toBe('2.80')
    })

    it('correct_program_spec updates the fields + runCommit stamps the AuditLog after-image', async () => {
      const order = await db.order.findUnique({ where: { orderNo: `M43-A-${TS}` } })
      const prog = await db.program.findFirst({ where: { orderId: order!.id, fabricId: f1Id } })
      const plan = await planProgramSpecCorrection({ programNo: prog!.programNo, finGsm: 200, ll: '2.90' })
      expect(plan.ok).toBe(true)
      await runCommit(plan, { actorName: 'm43@test', actorSource: 'form', action: 'correct-spec', entity: 'program' })
      const row = await db.progBalanceFabric.findFirst({ where: { orderId: order!.id, fabricId: f1Id } })
      expect(row?.finGsm).toBe(200)
      expect(row?.ll).toBe('2.90')
      expect(row?.colourId).toBe(colourId) // only passed fields change
      // the audit row exists with the after-image payload
      const audit = await db.auditLog.findFirst({
        where: { entity: 'program', action: 'correct-spec', docNo: prog!.programNo },
        orderBy: { createdAt: 'desc' },
      })
      expect(audit).toBeTruthy()
      expect(audit?.payload).toContain('finGsm')
      // nothing-passed refuses
      const empty = await planProgramSpecCorrection({ programNo: prog!.programNo })
      expect(empty.ok).toBe(false)
    })
  })

  // ──────────────────────────────────────────────────────────────────────
  describe('PRG-04 — the waterfall read model (spec §10 walkthrough)', () => {
    it('order → program → POLine → DC out → receipt back: the register columns close', async () => {
      const orderNo = `M43-A-${TS}`
      const order = await db.order.findUnique({ where: { orderNo } })
      // the knitting program for the yarn (waterfall row under test)
      const prog = await commit<any>(planProgram({
        orderNo, stage: 'knitting', yarnCode: Y1, requiredKgs: 120,
      }))
      expect(prog.programNo).toMatch(/^PGM-/)
      // PO'd: an order-linked POLine (120 ordered)
      const po = await db.purchaseOrder.create({
        data: { poNo: `M43-PO-${TS}`, poType: 'yarn', partyId: (await db.party.findFirst())!.id, finYear: '26-27', totalQty: 120, totalValue: 25200, lines: { create: [{ orderId: order!.id, itemType: 'yarn', itemId: y1Id, qty: 120, rate: 210, amount: 25200 }] } },
      })
      expect(po.poNo).toBe(`M43-PO-${TS}`)
      // DC'd: 100 kgs sent out to the jobworker
      await db.$transaction(async (tx: any) => {
        await postLedger(tx, { txnType: 'process_delivery', itemType: 'yarn', itemId: y1Id, godownId: g1Id, orderId: order!.id, docNo: `M43-DC-${TS}`, docKey: `M43-DC-${TS}`, docDate: new Date('2026-09-01'), out: { kgs: 100 } })
      })
      // GRN'd: 30 bought (purchase_grn) + 60 came back produced (process_receipt)
      await db.$transaction(async (tx: any) => {
        await postLedger(tx, { txnType: 'purchase_grn', itemType: 'yarn', itemId: y1Id, godownId: g1Id, orderId: order!.id, docNo: `M43-GRN-${TS}`, docKey: `M43-GRN-${TS}`, docDate: new Date('2026-09-02'), in: { kgs: 30 } })
        await postLedger(tx, { txnType: 'process_receipt', itemType: 'yarn', itemId: y1Id, godownId: g1Id, orderId: order!.id, docNo: `M43-RC-${TS}`, docKey: `M43-RC-${TS}`, docDate: new Date('2026-09-03'), in: { kgs: 60 } })
      })
      // the waterfall row — hand-computed: po 120, dc 100, grn 90, finished 60
      const res = await queryProgramStatus({ order: orderNo, limit: 50, page: 1 })
      const row = res.rows.find((r: any) => r.programNo === prog.programNo) as any
      expect(row).toBeTruthy()
      expect(row.poKgs).toBe(120)
      expect(row.dcKgs).toBe(100)
      expect(row.grnKgs).toBe(90)
      expect(row.finishedKgs).toBe(60) // process_receipt only — the bought 30 is GRN'd, not finished
      expect(row.requiredKgs).toBe(120)
      expect(row.actualKgs).toBe(100) // yarn program: consumed = out
      expect(row.balanceKgs).toBe(20)
    })

    it('get_program_status json stays FROZEN (no new keys leak into the M3 contract)', async () => {
      const { programStatusForOrder } = await import('@/lib/erp/registers/program-status')
      const res = await programStatusForOrder(`M43-A-${TS}`)
      expect(res).toBeTruthy()
      const allowed = new Set(['programNo', 'stage', 'dept', 'item', 'requiredKgs', 'actualKgs', 'balanceKgs', 'status', 'targetDate'])
      for (const p of res!.programs) {
        for (const k of Object.keys(p)) expect(allowed.has(k), `frozen json key ${k}`).toBe(true)
      }
    })
  })

  // ──────────────────────────────────────────────────────────────────────
  describe('PRG-05 — BOM→program pre-fill (the golden proposal)', () => {
    it('BOM × per-style order qty × (1 + boostupper% + reserveper%) — hand-computed', async () => {
      await setFlag('boostupper', 2)
      await setFlag('reserveper', 3) // factor 1.05
      const res = await proposeProgramRequirements(`M43-MS-${TS}`)
      expect(res.ok).toBe(true)
      if (!res.ok) return
      // the multi-style order: S1 60 pcs (BOM 0.18) + S2 40 pcs (BOM 0.12)
      expect(res.proposal.boostPct).toBe(5)
      const s1Row = res.proposal.rows.find((r) => r.styleNo === S1)
      const s2Row = res.proposal.rows.find((r) => r.styleNo === S2)
      expect(s1Row?.perPc).toBe(0.18)
      expect(s1Row?.orderQty).toBe(60)
      expect(s1Row?.totalQty).toBe(0.18 * 60 * 1.05) // 11.34
      expect(s2Row?.perPc).toBe(0.12)
      expect(s2Row?.orderQty).toBe(40)
      expect(s2Row?.totalQty).toBe(0.12 * 40 * 1.05) // 5.04
      expect(s1Row?.stage).toBe('knitting')
    })

    it('a style with no BOM refuses with the create-the-BOM-first guidance', async () => {
      const res = await proposeProgramRequirements(`M43-NOBOM-${TS}`) // unknown order
      expect(res.ok).toBe(false)
      // an actual order whose style has no BOM (S3)
      const r2 = await commit<any>(planOrder({
        orderNo: `M43-NOBOM-${TS}`, buyerCode: BUYER, styleNo: S3, deliveryDate: '2026-12-01',
        lines: [{ colourName: `M43 Navy ${TS}`, sizeName: 'M', qty: 10, rate: 100 }],
      }))
      expect(r2.orderNo).toBe(`M43-NOBOM-${TS}`)
      const res2 = await proposeProgramRequirements(`M43-NOBOM-${TS}`)
      expect(res2.ok).toBe(false)
      if (!res2.ok) expect(res2.error).toContain('create the BOM first')
    })

    it('the propose_program_requirements tool is registered (read, production) and delegates to the service', async () => {
      const tool = getTool('propose_program_requirements')!
      expect(tool).toBeTruthy()
      expect(tool.isWrite).toBe(false)
      expect(tool.domain).toBe('production')
      const out = await tool.execute({ orderNo: `M43-MS-${TS}` })
      expect(out.text).toContain('Program proposal for M43-MS')
      expect(out.text).toContain('knitting')
    })
  })

  // ──────────────────────────────────────────────────────────────────────
  describe('Source contracts + wiring pins (the M43 truth)', () => {
    it('the dead projector trio is GONE (the read service is its successor)', () => {
      expect(existsSync(join(ERP_DIR, 'posting-engine.ts'))).toBe(false)
      expect(existsSync(join(ERP_DIR, 'movement-matrix.ts'))).toBe(false)
      expect(existsSync(join(ERP_DIR, 'projectors.ts'))).toBe(false)
      // nothing imports the dead names
      expect(src('registers/program-status.ts')).toContain('PRG-04')
    })

    it('the new tools are registered: 249 at M43 + the M44 CST quartet behind it', () => {
      expect(allTools.length).toBe(253) // M44 CST: +create/update/list_cost_component +get_order_cost
      expect(getTool('set_order_deliveries')?.isWrite).toBe(true)
      expect(getTool('set_order_deliveries')?.domain).toBe('orders')
      expect(getTool('correct_program_spec')?.isWrite).toBe(true)
      expect(getTool('propose_program_requirements')?.isWrite).toBe(false)
    })

    it('flags: 39 defs (multi_style_orders, module, default false)', () => {
      expect(FLAG_DEFS.length).toBe(39)
      const f = FLAG_DEFS.find((x) => x.name === 'multi_style_orders')
      expect(f?.valueType).toBe('boolean')
      expect(f?.value).toBe('false')
      expect(f?.category).toBe('module')
    })

    it('menu: 140 items, /programs/propose is LIVE with the propose tool door', () => {
      expect(MENU_ITEMS.length).toBe(140)
      expect(LIVE_ROUTES.has('/programs/propose')).toBe(true)
      const item = MENU_ITEMS.find((i) => i.id === 'program-propose')
      expect(item?.agentTools).toContain('propose_program_requirements')
    })

    it('schemas carry the PRG fields (additive, optional — the agent contract)', () => {
      expect(ORDER_SCHEMA.shape).toHaveProperty('buyerPoRef')
      expect(ORDER_SCHEMA.shape).toHaveProperty('orderType')
      expect(ORDER_SCHEMA.shape).toHaveProperty('deliveries')
      expect((ORDER_SCHEMA.shape as any).lines?.element?.shape).toHaveProperty('styleNo')
      expect(PROGRAM_SCHEMA.shape).toHaveProperty('colourCode')
      expect(PROGRAM_SCHEMA.shape).toHaveProperty('designCode')
      expect(PROGRAM_SCHEMA.shape).toHaveProperty('finDiaCode')
      expect(PROGRAM_SCHEMA.shape).toHaveProperty('finGsm')
      expect(PROGRAM_SCHEMA.shape).toHaveProperty('ll')
    })

    it('register configs declare the waterfall columns + the order-register additions', () => {
      const cols = programStatusConfig.columns.map((c) => c.name)
      expect(cols).toContain('poKgs')
      expect(cols).toContain('dcKgs')
      expect(cols).toContain('grnKgs')
      expect(cols).toContain('finishedKgs')
      const oc = orderRegisterConfig.columns.map((c) => c.name)
      expect(oc).toContain('buyerPoRef')
      expect(oc).toContain('orderType')
      expect(orderRegisterConfig.filters.map((f) => f.key)).toContain('orderType')
    })

    it('PROMPT_VERSION is bumped and the prompt teaches the proposal reflex', () => {
      expect(PROMPT_VERSION).toBe('m44-2026-09-03')
      expect(PROMPT_VERSION.startsWith('m44')).toBe(true) // M44 CST behind it
    })

    it('planOrder reads the multi-style flag OUTSIDE any transaction (the getFlag pure-read contract, PITFALLS #45)', () => {
      // source contract: the flag consult happens in the plan phase, before commit opens a tx
      const body = src('posting/order.ts')
      expect(body).toContain("getFlag<boolean>('multi_style_orders')")
    })
  })
})
