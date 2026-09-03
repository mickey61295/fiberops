/**
 * CST Batch 8 (Phase-6B, SPEC-M44 — Module K costing depth):
 *   CST-01  the cost component library (master + tools + quoting)
 *   CST-02  the computed cost sheet (calculator: lines/BOM/library, per-pc,
 *           marginPct finally COMPUTED — the honest-claims retirement)
 *   CST-03  estimated vs actual (read service + get_order_cost + deltas)
 *   CST-04  the daily-unit-pnl material leg at bucket WAC
 *
 * Spec §11 acceptance: golden costing case (known BOM → known per-pc → known
 * margin) + the est-vs-actual walkthrough. The no-lines legacy path pinned
 * byte-identical (§2-2 back-compat).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { db } from '@/lib/db'
import { planCostSheet } from '@/lib/erp/posting/cost-sheet'
import { runCommit } from '@/lib/erp/audit'
import { orderCostActuals, costComparison } from '@/lib/erp/registers/cost-compare'
import { itemWacRate } from '@/lib/erp/item-wac'
import { queryDailyPnl } from '@/lib/erp/reports/chain-money-reports'
import { getTool, allTools } from '@/lib/agent/tools'
import { COST_SHEET_SCHEMA } from '@/lib/erp/schemas/cost-sheet'
import { COST_LINE_INPUT } from '@/lib/erp/schemas/cost-sheet'
import { PROMPT_VERSION } from '@/lib/agent/prompt'
import { MASTER_CONFIGS } from '@/lib/erp/master-configs'

const TS = Date.now()
const BUYER = `M44-B-${TS}`
const STYLE = `M44-STY-${TS}`
const FAB = `M44-F-${TS}`       // BOM fabric (0.2/garment @ ₹100)
const ACC = `M44-A-${TS}`       // BOM accessory (1/garment @ ₹5)
const YARN = `M44-Y-${TS}`      // the P&L material-leg item (bucket WAC 12)
const GODOWN = `M44-G-${TS}`    // fixture godown (P&L legs)
const ORDER_NO = `M44-SO-${TS}` // the golden-case order (100 pcs)
const ORDER2 = `M44-SO2-${TS}`  // the est-vs-actual walkthrough order
const TOMORROW = new Date(Date.now() + 86_400_000) // future window — the real
// DB carries no future-dated rows, so every aggregate in the window is OURS

const ERP_DIR = join(process.cwd(), 'src/lib/erp')
const src = (p: string) => readFileSync(join(ERP_DIR, p), 'utf8')

async function commit(planPromise: any): Promise<any> {
  const plan = await planPromise
  if (!plan.ok) throw new Error(`plan failed: ${plan.error ?? JSON.stringify(plan).slice(0, 300)}`)
  return plan.commit!()
}

/** tool.execute() results carry {text, plan, commit} — not the plan itself. */
async function toolCommit(resPromise: any): Promise<any> {
  const res = await resPromise
  if (res.error) throw new Error(`tool failed: ${res.error}`)
  if (!res.commit) throw new Error(`tool returned no commit: ${JSON.stringify(res).slice(0, 300)}`)
  return res.commit()
}

let buyerId = '', styleId = '', fabId = '', accId = '', yarnId = '', godownId = ''
let g1Id = '', wasteGodownId = '', wasteGodownCreated = false
let order1Id = '', order2Id = ''
let deptId = '', noBomStyleId = ''
const NOBOM_STYLE = `M44-NOBOM-${TS}`
const ORDER_NOBOM = `M44-SOB-${TS}`

describe('CST Batch 8 — SPEC-M44 Module K costing depth', () => {
  beforeAll(async () => {
    const uom = (await db.uOM.findFirst({ where: { code: 'KGS' } }))!
    const uomPcs = (await db.uOM.findFirst({ where: { code: 'PCS' } })) ?? uom
    buyerId = (await db.buyer.create({ data: { code: BUYER, name: `M44 Buyer ${TS}` } })).id
    styleId = (await db.style.create({ data: { styleNo: STYLE, description: `M44 golden style ${TS}` } })).id
    fabId = (await db.fabric.create({ data: { code: FAB, gsm: 180, width: 24, uomId: uom.id, rate: 100 } })).id
    accId = (await db.accessory.create({ data: { code: ACC, name: `M44 label ${TS}`, uomId: uomPcs.id, rate: 5 } })).id
    yarnId = (await db.yarn.create({ data: { code: YARN, count: '30s', uomId: uom.id, rate: 12 } })).id
    godownId = (await db.godown.create({ data: { code: GODOWN, name: `M44 fixture ${TS}` } })).id
    // the REAL main store + waste godown (shared rows — never deleted here)
    const g1 = await db.godown.findUnique({ where: { code: 'G1' } })
    g1Id = g1?.id ?? godownId
    const waste = await db.godown.findUnique({ where: { code: 'WASTE' } })
    if (waste) { wasteGodownId = waste.id } else {
      wasteGodownId = (await db.godown.create({ data: { code: 'WASTE', name: 'Waste store (M44 fixture)' } })).id
      wasteGodownCreated = true
    }
    const dept = await db.department.findFirst({})
    deptId = dept?.id ?? ''
    noBomStyleId = (await db.style.create({ data: { styleNo: NOBOM_STYLE, description: `M44 no-bom ${TS}` } })).id
    // the golden BOM: 0.2 fabric/garment @ 100 + 1 accessory/garment @ 5
    await db.bomLine.createMany({ data: [
      { styleId, itemType: 'fabric', itemId: fabId, qty: 0.2, uomId: uom.id, rate: 100 },
      { styleId, itemType: 'accessory', itemId: accId, qty: 1, uomId: uomPcs.id, rate: 5 },
    ] })
  })

  afterAll(async () => {
    // children first (PITFALLS #40)
    const myOrders = await db.order.findMany({ where: { orderNo: { startsWith: 'M44-' } }, select: { id: true } })
    const orderIds = myOrders.map((o) => o.id)
    if (orderIds.length > 0) {
      await db.costSheetLine.deleteMany({ where: { costSheet: { orderId: { in: orderIds } } } }).catch(() => {})
      await db.costSheet.deleteMany({ where: { orderId: { in: orderIds } } }).catch(() => {})
      await db.productionEntry.deleteMany({ where: { orderId: { in: orderIds } } }).catch(() => {})
      await db.cutOrder.deleteMany({ where: { orderId: { in: orderIds } } }).catch(() => {})
      await db.jobworkLine.deleteMany({ where: { jobwork: { orderId: { in: orderIds } } } }).catch(() => {})
      await db.jobworkOrder.deleteMany({ where: { orderId: { in: orderIds } } }).catch(() => {})
      await db.orderLine.deleteMany({ where: { orderId: { in: orderIds } } }).catch(() => {})
    }
    await db.order.deleteMany({ where: { orderNo: { startsWith: 'M44-' } } }).catch(() => {})
    await db.style.deleteMany({ where: { id: noBomStyleId } }).catch(() => {})
    // ledger legs + buckets (fixture-scoped: docNo M44-* / my item ids)
    await db.stockLedger.deleteMany({ where: { docNo: { startsWith: 'M44-' } } }).catch(() => {})
    await db.currentStock.deleteMany({ where: { AND: [{ itemType: 'yarn' }, { itemId: yarnId }] } }).catch(() => {})
    await db.currentStock.deleteMany({ where: { AND: [{ itemType: 'fabric' }, { itemId: fabId }] } }).catch(() => {})
    await db.costComponent.deleteMany({ where: { code: { startsWith: 'M44-CC' } } }).catch(() => {})
    await db.bomLine.deleteMany({ where: { styleId } }).catch(() => {})
    await db.style.deleteMany({ where: { id: styleId } }).catch(() => {})
    await db.fabric.deleteMany({ where: { id: fabId } }).catch(() => {})
    await db.accessory.deleteMany({ where: { id: accId } }).catch(() => {})
    await db.yarn.deleteMany({ where: { id: yarnId } }).catch(() => {})
    await db.godown.deleteMany({ where: { id: godownId } }).catch(() => {})
    if (wasteGodownCreated) await db.godown.deleteMany({ where: { id: wasteGodownId } }).catch(() => {})
    await db.buyer.deleteMany({ where: { id: buyerId } }).catch(() => {})
  })

  // ──────────────────────────────────────────────────────────────────────
  describe('CST-01 — the cost component library', () => {
    it('create_cost_component auto-codes CC-#### and the masters registry carries 42 configs', async () => {
      const tool = getTool('create_cost_component')!
      expect(tool).toBeTruthy()
      expect(tool.isWrite).toBe(true)
      const res = await tool.execute({ name: `M44 carton ${TS}`, category: 'packing', unit: 'per pc', rate: 3 })
      expect(res.text).toMatch(/CC-\d{4}/)
      const code = (res.plan!.creates![0].data as any).code
      expect(code).toMatch(/^CC-\d{4}$/)
      expect((res.plan!.creates![0].data as any).rate).toBe(3)
      expect(MASTER_CONFIGS.length).toBe(42) // 41 + cost-component
      expect(MASTER_CONFIGS.find((c) => c.slug === 'cost-component')?.legacyForms).toContain('FrmPreCostingCompMas')
    })

    it('update_cost_component + list_cost_components work (both doors: the master service)', async () => {
      const created = await toolCommit(getTool('create_cost_component')!.execute({ name: `M44 sewing ${TS}`, category: 'cm', rate: 22 }))
      const code = created.code
      const upd = getTool('update_cost_component')!
      const updRes = await upd.execute({ code, rate: 24 })
      expect(updRes.text).toMatch(/Update Cost Component/i)
      await updRes.commit()
      const row = await db.costComponent.findUnique({ where: { code } })
      expect(row?.rate).toBe(24)
      const list = getTool('list_cost_components')!
      const listRes = await list.execute({})
      expect(listRes.text).toMatch(/cost components/)
      expect(JSON.stringify(listRes.json)).toContain(code)
    })

    it('the master-config form contract: category select options + defaults', async () => {
      const cfg = MASTER_CONFIGS.find((c) => c.slug === 'cost-component')!
      const cat = cfg.fields.find((f) => f.name === 'category')!
      expect(cat.options!.map((o) => o.value)).toEqual(['fabric', 'trim', 'cm', 'washing', 'packing', 'overhead', 'other'])
      const active = cfg.fields.find((f) => f.name === 'active')!
      expect(active.type).toBe('checkbox')
      expect(active.defaultValue).toBe(true)
    })
  })

  // ──────────────────────────────────────────────────────────────────────
  describe('CST-02 — the computed cost sheet (golden case)', () => {
    it('the golden case: BOM×qty + component quote → known per-pc + known margin', async () => {
      // order 100 pcs of the golden style
      const order = await commit(planOrder100())
      order1Id = order.id
      // the component library quote: carton packing ₹3/pc
      const comp = await toolCommit(getTool('create_cost_component')!.execute({ name: `M44 carton ${TS}`, category: 'packing', unit: 'per pc', rate: 3 }))
      // calculator: computeFromBom + a component line (qty 100)
      const plan = await planCostSheet({
        orderNo: ORDER_NO,
        computeFromBom: true,
        lines: [{ source: 'component', componentCode: comp.code, qty: 100 }],
        sellingPrice: 3500,
      })
      expect(plan.ok).toBe(true)
      // hand-computed: fabric 0.2×100×100 = 2000; trim 1×100×5 = 500;
      // packing 100×3 = 300 → total 2800; perPc 28; margin (3500-2800)/3500 = 20%
      const data = (plan as any).creates[0].data
      expect(data.fabricCost).toBe(2000)
      expect(data.trimCost).toBe(500)
      expect(data.packingCost).toBe(300)
      expect(data.totalCost).toBe(2800)
      expect(data.marginPct).toBe(20)
      expect((plan as any).creates[1]?.data.count).toBe(3) // 2 bom + 1 component
      const cs = await plan.commit!()
      const stored = await db.costSheet.findUnique({ where: { id: cs.id }, include: { lines: true } })
      expect(stored!.lines.length).toBe(3)
      expect(stored!.lines.filter((l) => l.source === 'bom').length).toBe(2)
      expect(stored!.lines.filter((l) => l.source === 'component').length).toBe(1)
      expect(stored!.lines.find((l) => l.head === 'fabric')?.amount).toBe(2000)
      expect(stored!.lines.find((l) => l.head === 'packing')?.amount).toBe(300)
      expect(stored!.lines.find((l) => l.source === 'component')?.componentId).toBeTruthy()
    })

    it('per-pc derivation + honest margin: marginPct INPUT ignored, computed stored', async () => {
      const cs = await db.costSheet.findFirst({ where: { orderId: order1Id }, orderBy: { version: 'desc' } })
      expect(cs).toBeTruthy()
      expect(cs!.totalCost).toBe(2800)
      // per-pc lives in the plan text (28) — margin input never echoed
      const plan2 = await planCostSheet({ orderNo: ORDER_NO, fabricCost: 2800, sellingPrice: 3500, marginPct: 99 })
      expect((plan2 as any).creates[0].data.marginPct).toBe(20) // (3500-2800)/3500
      expect((plan2 as any).creates[0].data.marginPct).not.toBe(99)
      // the honest-claims retirement: the sideEffects string is now TRUE
      expect(plan2.sideEffects).toContain('Margin % recalculated')
      await plan2.commit!()
    })

    it('versioning auto-increments and lines cascade', async () => {
      const sheets = await db.costSheet.findMany({ where: { orderId: order1Id }, orderBy: { version: 'asc' } })
      expect(sheets.map((s) => s.version)).toEqual([1, 2])
      const v2 = sheets[1]
      await db.costSheet.delete({ where: { id: v2.id } }) // cascades lines
      const orphan = await db.costSheetLine.count({ where: { costSheetId: v2.id } })
      expect(orphan).toBe(0)
    })

    it('no-lines legacy path: header-only math byte-identical (back-compat)', async () => {
      const plan = await planCostSheet({
        orderNo: ORDER_NO,
        fabricCost: 1000, trimCost: 200, cmCost: 500, washingCost: 100, packingCost: 50, overheads: 150,
        sellingPrice: 2500,
      })
      const d = (plan as any).creates[0].data
      expect(d.totalCost).toBe(2000) // naive 6-head sum, unchanged
      expect(d.marginPct).toBe(20)
      expect((plan as any).creates.length).toBe(1) // no line rows
      expect(plan.summary).toContain('total ₹2000')
      await plan.commit!()
    })

    it('mixed heads: lines own their head, headers fill the rest', async () => {
      const plan = await planCostSheet({
        orderNo: ORDER_NO,
        lines: [{ source: 'bom', itemType: 'fabric', itemCode: FAB, qty: 100, rate: 100 }],
        cmCost: 700, sellingPrice: 5000,
      })
      const d = (plan as any).creates[0].data
      expect(d.fabricCost).toBe(10_000) // from the LINE
      expect(d.cmCost).toBe(700)        // from the HEADER
      expect(d.totalCost).toBe(10_700)
      expect(d.marginPct).toBeCloseTo(((5000 - 10700) / 5000) * 100, 0) // negative margin is honest
      await plan.commit!()
    })

    it('guards: unknown component, inactive component, bom without itemType, no BOM to seed', async () => {
      const unknown = await planCostSheet({ orderNo: ORDER_NO, lines: [{ source: 'component', componentCode: 'CC-9999', qty: 1 }] })
      expect(unknown.ok).toBe(false)
      expect(unknown.error).toMatch(/CC-9999 not found/)
      // inactive component refuses
      const comp = await toolCommit(getTool('create_cost_component')!.execute({ name: `M44 dead ${TS}`, category: 'other', rate: 1 }))
      await toolCommit(getTool('update_cost_component')!.execute({ code: comp.code, active: false }))
      const inactive = await planCostSheet({ orderNo: ORDER_NO, lines: [{ source: 'component', componentCode: comp.code, qty: 1 }] })
      expect(inactive.ok).toBe(false)
      expect(inactive.error).toMatch(/inactive/i)
      // bom line without itemType
      const noType = await planCostSheet({ orderNo: ORDER_NO, lines: [{ source: 'bom', itemCode: FAB, qty: 10 }] })
      expect(noType.ok).toBe(false)
      expect(noType.error).toMatch(/itemType/)
      // computeFromBom against a style with no BOM (the order must exist —
      // the refusal is about the BOM, not the order)
      const noBomOrder = await commit(planNoBomOrder())
      expect(noBomOrder.orderNo).toBe(ORDER_NOBOM)
      const seed = await planCostSheet({ orderNo: ORDER_NOBOM, computeFromBom: true })
      expect(seed.ok).toBe(false)
      expect(seed.error).toMatch(/no BOM/i)
      // explicit lines WIN over the seed for the same item
      const mixed = await planCostSheet({
        orderNo: ORDER_NO, computeFromBom: true,
        lines: [{ source: 'bom', itemType: 'fabric', itemCode: FAB, qty: 50, rate: 120 }],
      })
      expect(mixed.ok).toBe(true)
      const fabricLine = (mixed as any).creates.find((c: any) => c.table === 'costSheetLine')
      expect(fabricLine).toBeTruthy() // the seed ran (count includes it)
      const cs = await mixed.commit!()
      const stored = await db.costSheet.findUnique({ where: { id: cs.id }, include: { lines: true } })
      const fabricLines = stored!.lines.filter((l) => l.head === 'fabric' && l.source === 'bom' && l.qty === 50)
      expect(fabricLines.length).toBe(1) // the explicit line — NOT re-seeded
      expect(fabricLines[0].rate).toBe(120)
      // the seed did NOT add a second fabric line for the same item
      expect(stored!.lines.filter((l) => l.head === 'fabric' && l.qty === 20).length).toBe(0)
    })

    it('the shared schema + doc-config contract: lines[] + computeFromBom hook', () => {
      const shape: any = COST_SHEET_SCHEMA.shape
      expect(shape.computeFromBom).toBeTruthy()
      expect(shape.lines).toBeTruthy()
      const lineShape: any = (COST_LINE_INPUT as any).shape
      expect(Object.keys(lineShape).sort()).toEqual(['amount', 'componentCode', 'head', 'itemCode', 'itemType', 'notes', 'qty', 'rate', 'source'].sort())
      // both doc-configs expose the line editor (the form door)
      const costSheetCfg = src('doc-configs/cost-sheet.ts')
      expect(costSheetCfg).toContain("linesKey: 'lines'")
      expect(costSheetCfg).toContain("name: 'componentCode'")
      const costingInput = src('doc-configs/costing-input.ts')
      expect(costingInput).toContain("linesKey: 'lines'")
    })
  })

  // ──────────────────────────────────────────────────────────────────────
  describe('CST-03 — estimated vs actual', () => {
    it('the walkthrough: wages + cut + JW actuals vs the sheet, with deltas', async () => {
      // walkthrough order + estimate sheet
      const order = await commit(planOrder2())
      order2Id = order.id
      const sheet = await commit(planCostSheet({
        orderNo: ORDER2,
        fabricCost: 3000, cmCost: 900, washingCost: 1200,
        lines: [
          { source: 'bom', itemType: 'fabric', itemCode: FAB, qty: 25, rate: 110 },
        ],
        sellingPrice: 7000,
      }))
      // the fabric estimate is the LINE (25×110 = 2750), header ignored
      const stored = await db.costSheet.findUnique({ where: { id: sheet.id } })
      expect(stored!.fabricCost).toBe(2750)
      expect(stored!.cmCost).toBe(900)
      expect(stored!.washingCost).toBe(1200)

      // actuals: piece-rate production entries (rework EXCLUDED); dated +2d
      // so the CST-04 P&L window (+1d) stays isolated from this fixture
      const DAY2 = new Date(TOMORROW.getTime() + 86_400_000)
      await db.productionEntry.createMany({ data: [
        { orderId: order2Id, deptId, prodDate: DAY2, qty: 100, rate: 4.5, amount: 450 },
        { orderId: order2Id, deptId, prodDate: DAY2, qty: 100, rate: 4.5, amount: 450 },
        { orderId: order2Id, deptId, prodDate: DAY2, qty: 20, rate: 5, amount: 100, rework: true },
      ] })
      // cut: 25 kgs fabric issued (bucket WAC 110)
      await db.cutOrder.create({ data: { cutNo: `M44-CUT-${TS}`, orderId: order2Id, cutDate: TOMORROW, fabricIssued: 25, totalPcs: 100, status: 'cut' } })
      // JW: washing process billed 1000 + an accessory OUT line (trim at WAC 4)
      await db.jobworkOrder.create({ data: {
        dcNo: `M44-JW-${TS}`, jobworkerId: (await db.party.findFirst({}))!.id, processType: 'washing',
        outDate: TOMORROW, totalQty: 25, totalValue: 1000, orderId: order2Id, status: 'sent',
        lines: { create: [
          { itemType: 'accessory', itemId: accId, itemCode: ACC, uom: 'pcs', qty: 500, rate: 4 },
        ] },
      } })

      // the fabric bucket at G1: 25 kgs at WAC 110 (the itemWacRate source)
      await db.currentStock.create({ data: { itemType: 'fabric', itemId: fabId, godownId: g1Id, kgs: 25, rate: 110 } })
      // the accessory bucket: WAC 4
      await db.currentStock.create({ data: { itemType: 'accessory', itemId: accId, godownId: g1Id, pcs: 500, rate: 4 } })

      const actuals = await orderCostActuals(order2Id)
      expect(actuals.cm).toBe(900)           // 450 + 450, rework excluded
      expect(actuals.process).toBe(1000)     // the JW billing
      expect(actuals.cutFabricKgs).toBe(25)
      expect(actuals.fabric).toBe(25 * 110)  // cut kgs × BOM fabric WAC
      expect(actuals.jwOutTrimPcs).toBe(500)
      expect(actuals.trim).toBe(500 * 4)     // JW-out accessory pcs × WAC

      const cmp = await costComparison(order2Id)
      expect(cmp).toBeTruthy()
      expect(cmp!.sheet!.version).toBe(1)
      expect(cmp!.sheet!.heads.fabric).toBe(2750)
      // deltas: fabric est 2750 − act 2750 = 0; cm 900 − 900 = 0;
      // washing 1200 − 1000 = +200; trim 0 − 2000 = −2000
      const byHead = new Map(cmp!.deltas.map((d) => [d.head, d]))
      expect(byHead.get('fabric')!.delta).toBe(0)
      expect(byHead.get('cm')!.delta).toBe(0)
      expect(byHead.get('washing')!.delta).toBe(200)
      expect(byHead.get('trim')!.delta).toBe(-2000)
      // packing/overheads: '—' honestly (null actual)
      expect(byHead.get('packing')!.actual).toBeNull()
      expect(byHead.get('overheads')!.actual).toBeNull()
      expect(cmp!.producedPcs).toBe(200) // good entries only
    })

    it('the get_order_cost tool delegates to the same service (ADR-001)', async () => {
      const tool = getTool('get_order_cost')!
      expect(tool).toBeTruthy()
      expect(tool.domain).toBe('costing')
      expect(tool.isWrite).toBe(false)
      const res = await tool.execute({ orderNo: ORDER2 })
      expect(res.text).toContain(ORDER2)
      expect(res.text).toContain('CM / Labour')
      const json = res.json as any
      expect(json.deltas.length).toBe(6)
      expect(json.sheet.heads.cm).toBe(900)
      // unknown order → honest text
      const miss = await tool.execute({ orderNo: 'M44-NOPE' })
      expect(miss.text).toMatch(/not found/i)
    })

    it('the Order Hub section consumes the service (source contract)', () => {
      const page = readFileSync(join(process.cwd(), 'src/app/(erp)/orders/[id]/page.tsx'), 'utf8')
      expect(page).toContain("costComparison(order.id)")
      expect(page).toContain('data-testid="cost-compare"')
      expect(page).toContain('Estimated vs actual')
    })
  })

  // ──────────────────────────────────────────────────────────────────────
  describe('CST-04 — the daily P&L material leg at WAC', () => {
    it('material = Σ consumption OUT legs at bucket WAC; net margin gains the leg', async () => {
      // the yarn bucket: 100 kgs at WAC 12 (G1)
      await db.currentStock.create({ data: { itemType: 'yarn', itemId: yarnId, godownId: g1Id, kgs: 100, rate: 12 } })
      // consumption legs dated TOMORROW (the isolated future window):
      // 10 kgs to processing + 5 kgs lost to adjustment, at the FIXTURE godown
      await db.stockLedger.createMany({ data: [
        { txnType: 'process_delivery', itemType: 'yarn', itemId: yarnId, godownId: godownId, docNo: `M44-LEG1-${TS}`, docDate: TOMORROW, finYear: '26-27', outKgs: 10, rate: 8 },
        { txnType: 'stock_adjustment_less', itemType: 'yarn', itemId: yarnId, godownId: godownId, docNo: `M44-LEG2-${TS}`, docDate: TOMORROW, finYear: '26-27', outKgs: 5, rate: 0 },
        // NOT consumption (must be ignored):
        { txnType: 'godown_transfer_out', itemType: 'yarn', itemId: yarnId, godownId: godownId, docNo: `M44-LEG3-${TS}`, docDate: TOMORROW, finYear: '26-27', outKgs: 99, rate: 0 },
        { txnType: 'purchase_return', itemType: 'yarn', itemId: yarnId, godownId: godownId, docNo: `M44-LEG4-${TS}`, docDate: TOMORROW, finYear: '26-27', outKgs: 99, rate: 0 },
        // a WASTE-godown leg (the M42 scrap identity — excluded)
        { txnType: 'stock_adjustment_less', itemType: 'yarn', itemId: yarnId, godownId: wasteGodownId, docNo: `M44-LEG5-${TS}`, docDate: TOMORROW, finYear: '26-27', outKgs: 50, rate: 0 },
      ] })
      // one production entry in the window (wages 300, qty 100)
      await db.productionEntry.create({ data: { orderId: order1Id, deptId, prodDate: TOMORROW, qty: 100, rate: 3, amount: 300 } })
      // one expense in the window (200)
      await db.expense.create({ data: { expNo: `M44-EXP-${TS}`, expDate: TOMORROW, finYear: '26-27', amount: 200, category: 'other', narration: `M44 ${TS}` } })

      const q = { from: TOMORROW, to: new Date(TOMORROW.getTime() + 86_399_000), page: 1, limit: 50 }
      const result = await queryDailyPnl(q as any)
      // material = (10 + 5) × bucket WAC 12 = 180 — the leg rates (8 / 0) are
      // NEVER used (process legs carry the process charge, not material cost)
      const material = result.totals.find((t) => t.label === 'Material (period, WAC)')!
      expect(material).toBeTruthy()
      expect(material.value).toBe(180)
      // net margin = produced − wages − expenses − material (the §11 formula)
      const net = result.totals.find((t) => t.label === 'Net Margin')!
      const produced = result.totals.find((t) => t.label === 'Produced Value')!
      const wages = result.totals.find((t) => t.label === 'Wages')!
      const expenses = result.totals.find((t) => t.label === 'Expenses (period)')!
      expect(net.value).toBe(Math.round(produced.value - wages.value - expenses.value - material.value))
      expect(wages.value).toBe(300)
      expect(expenses.value).toBe(200)
      expect(result.summary).toContain('material')
      await db.expense.deleteMany({ where: { expNo: `M44-EXP-${TS}` } }).catch(() => {})
    })

    it('itemWacRate prefers the G1 bucket and returns 0 when none', async () => {
      const rate = await itemWacRate('yarn', yarnId)
      expect(rate).toBe(12)
      const none = await itemWacRate('yarn', 'nonexistent-id')
      expect(none).toBe(0)
    })
  })

  // ──────────────────────────────────────────────────────────────────────
  describe('the batch surface — tools, prompt, spec', () => {
    it('the new tools are registered: 253 = 249 at M43 + cost-component ×3 + get_order_cost', () => {
      expect(allTools.length).toBe(253) // M44 CST: +create/update/list_cost_component +get_order_cost
      expect(allTools.map((t) => t.name)).toContain('create_cost_component')
      expect(allTools.map((t) => t.name)).toContain('update_cost_component')
      expect(allTools.map((t) => t.name)).toContain('list_cost_components')
      expect(allTools.map((t) => t.name)).toContain('get_order_cost')
    })

    it('PROMPT_VERSION + the costing prompt section (M44)', () => {
      expect(PROMPT_VERSION).toBe('m44-2026-09-03')
      const prompt = src('../agent/prompt.ts')
      expect(prompt).toContain('create_cost_component')
      expect(prompt).toContain('get_order_cost')
      expect(prompt).toContain('computeFromBom')
    })

    it('source contracts: the new files exist; the P&L gained the material leg', () => {
      expect(existsSync(join(ERP_DIR, 'item-wac.ts'))).toBe(true)
      expect(existsSync(join(ERP_DIR, 'registers/cost-compare.ts'))).toBe(true)
      const pnl = src('../erp/reports/chain-money-reports.ts')
      expect(pnl).toContain('materialPeriodTotal')
      expect(pnl).toContain('Material (period, WAC)')
      // the master config registered
      expect(existsSync(join(ERP_DIR, 'master-configs/cost-component.ts'))).toBe(true)
      expect(MASTER_CONFIGS.find((c) => c.slug === 'cost-component')).toBeTruthy()
    })
  })
})

// fixture helpers — orders built through the REAL planOrder service
async function planOrder100() {
  const { planOrder } = await import('@/lib/erp/posting/order')
  return planOrder({
    orderNo: ORDER_NO, buyerCode: BUYER, styleNo: STYLE,
    orderDate: '2026-09-03', deliveryDate: '2026-10-01',
    lines: [{ colourName: 'Navy', sizeName: 'M', qty: 100, rate: 35 }],
    totalPcs: 100, totalValue: 3500,
  } as any)
}

async function planNoBomOrder() {
  const { planOrder } = await import('@/lib/erp/posting/order')
  return planOrder({
    orderNo: ORDER_NOBOM, buyerCode: BUYER, styleNo: NOBOM_STYLE,
    orderDate: '2026-09-03', deliveryDate: '2026-10-01',
    lines: [{ colourName: 'Navy', sizeName: 'M', qty: 10, rate: 35 }],
  } as any)
}

async function planOrder2() {
  const { planOrder } = await import('@/lib/erp/posting/order')
  return planOrder({
    orderNo: ORDER2, buyerCode: BUYER, styleNo: STYLE,
    orderDate: '2026-09-03', deliveryDate: '2026-10-01',
    lines: [{ colourName: 'Navy', sizeName: 'M', qty: 100, rate: 70 }],
    totalPcs: 100, totalValue: 7000,
  } as any)
}
