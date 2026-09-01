/**
 * SPEC-M21 → SPEC-M42 INV-05 — Waste Receipt: REWRITTEN from the stock-adj
 * variant into the waste IDENTITY. Waste posts into the WASTE godown (flag
 * waste_godown_code, auto-vivified) at the SCRAP rate (flag waste_scrap_rate),
 * never into the good godown at the good item's rate. The WST- docNo family +
 * the M21 reason composition stay byte-identical; godownCode is now the SOURCE
 * godown (validated, informational). This suite pins the M42 contract:
 * wasteClass validation, source validation, WST-#### numbering, the
 * waste-store ledger+bucket proof on commit, and the doc-config/tool
 * registration.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/lib/db'
import { planWasteReceipt, planStockAdjustment } from '@/lib/erp/posting/stock-adj'
import { DOC_CONFIGS } from '@/lib/erp/doc-configs'
import { getTool, allTools } from '@/lib/agent/tools'
import { setFlag } from '@/lib/erp/flags'

const TS = Date.now()
const GODOWN = `M21-G-${TS}`
const YARN = `M21-Y-${TS}`
const WASTE_STORE = 'WASTE' // the flag default

let godownId = '', yarnId = '', wstLedgerIds: string[] = []

describe('SPEC-M42 INV-05 — planWasteReceipt (the waste identity)', () => {
  beforeAll(async () => {
    const g = await db.godown.create({ data: { code: GODOWN, name: `M21 GD ${TS}` } })
    godownId = g.id
    // yarn needs a UOM — reuse the first existing one
    const uom = await db.uOM.findFirst()
    const y = await db.yarn.create({ data: { code: YARN, count: '30s', uomId: uom!.id, rate: 180 } })
    yarnId = y.id
  })

  afterAll(async () => {
    await db.stockLedger.deleteMany({ where: { id: { in: wstLedgerIds } } }).catch(() => {})
    await db.currentStock.deleteMany({ where: { itemType: 'yarn', itemId: yarnId } }).catch(() => {})
    await db.yarn.deleteMany({ where: { id: yarnId } }).catch(() => {})
    await db.godown.deleteMany({ where: { id: godownId } }).catch(() => {})
    await db.$disconnect()
  })

  it('rejects an unknown wasteClass (the frozen 5-class set)', async () => {
    const res = await planWasteReceipt({ godownCode: GODOWN, itemType: 'yarn', itemCode: YARN, qty: 10, wasteClass: 'nuclear' })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toContain('knitting')
  })

  it('source-godown / item / qty validation (godownCode = where the waste came FROM)', async () => {
    const badGodown = await planWasteReceipt({ godownCode: 'NOPE', itemType: 'yarn', itemCode: YARN, qty: 10, wasteClass: 'knitting' })
    expect(badGodown.ok).toBe(false)
    if (!badGodown.ok) expect(badGodown.error).toContain('Source godown NOPE')
    const badItem = await planWasteReceipt({ godownCode: GODOWN, itemType: 'yarn', itemCode: 'NOPE', qty: 10, wasteClass: 'knitting' })
    expect(badItem.ok).toBe(false)
    const badQty = await planWasteReceipt({ godownCode: GODOWN, itemType: 'yarn', itemCode: YARN, qty: 0, wasteClass: 'knitting' })
    expect(badQty.ok).toBe(false)
  })

  it('plan: WST-#### monotonic, M21 reason composition byte-identical, destination = the waste store', async () => {
    const p1 = await planWasteReceipt({ godownCode: GODOWN, itemType: 'yarn', itemCode: YARN, qty: 25, wasteClass: 'knitting', notes: 'dyelot tail' })
    expect(p1.ok).toBe(true)
    if (p1.ok) {
      const row = p1.creates?.[0]
      expect(row?.data.txnType).toBe('stock_adjustment_add') // the family identity — WST- + notes distinguish
      expect(row?.data.docNo).toMatch(/^WST-\d{4}$/)
      expect(row?.data.notes).toBe('Waste — knitting: dyelot tail')
      // INV-05: the destination is the waste store, NOT the source godown
      expect(row?.data.godownId).not.toBe(godownId)
    }
    const p2 = await planWasteReceipt({ godownCode: GODOWN, itemType: 'yarn', itemCode: YARN, qty: 5, wasteClass: 'cutting' })
    if (p2.ok) {
      expect(p2.creates?.[0]?.data.notes).toBe('Waste — cutting')
    }
  })

  it('commit lands the ledger row AND the WASTE-godown bucket (INV-05 core proof — good stock untouched)', async () => {
    const wasteStore = await db.godown.findUnique({ where: { code: WASTE_STORE } })
    expect(wasteStore).toBeTruthy() // auto-vivified by the first plan above
    const before = await db.currentStock.findFirst({ where: { itemType: 'yarn', itemId: yarnId, godownId: wasteStore!.id } })
    const beforeKgs = before?.kgs ?? 0
    const beforeSrc = await db.currentStock.findFirst({ where: { itemType: 'yarn', itemId: yarnId, godownId } })
    const beforeSrcKgs = beforeSrc?.kgs ?? 0

    const plan = await planWasteReceipt({ godownCode: GODOWN, itemType: 'yarn', itemCode: YARN, qty: 40, wasteClass: 'dyeing' })
    expect(plan.ok).toBe(true)
    if (!plan.ok) return
    const res = await plan.commit()
    expect(res.docNo).toMatch(/^WST-\d{4}$/)

    const ledger = await db.stockLedger.findFirst({
      where: { docNo: res.docNo, txnType: 'stock_adjustment_add' },
    })
    expect(ledger).toBeTruthy()
    expect(ledger!.notes).toBe('Waste — dyeing')
    expect(ledger!.inKgs).toBe(40)
    expect(ledger!.godownId).toBe(wasteStore!.id) // the waste identity — not the good godown
    expect(ledger!.rate).toBe(0) // scrap rate default 0 (unvalued until the operator sets one)
    wstLedgerIds.push(ledger!.id)

    const after = await db.currentStock.findFirst({ where: { itemType: 'yarn', itemId: yarnId, godownId: wasteStore!.id } })
    expect((after?.kgs ?? 0) - beforeKgs).toBe(40) // the waste store gains the kgs
    const afterSrc = await db.currentStock.findFirst({ where: { itemType: 'yarn', itemId: yarnId, godownId } })
    expect((afterSrc?.kgs ?? 0) - beforeSrcKgs).toBe(0) // the SOURCE (good) godown is untouched — INV-05's whole point
  })

  it('the doc family is registered with the receive_waste chip (form door + agent door, ADR-001)', () => {
    const cfg = DOC_CONFIGS.find((c) => c.slug === 'waste-receipt')
    expect(cfg).toBeTruthy()
    expect(cfg!.numberPrefix).toBe('WST-')
    expect(cfg!.agentTools).toEqual(['receive_waste'])
    const tool = getTool('receive_waste')
    expect(tool).toBeTruthy()
    expect(tool!.isWrite).toBe(true)
    expect(tool!.domain).toBe('inventory')
  })

  it('registry grew 224 → 246 (receive_waste + the M42 stock-take trio)', () => {
    expect(allTools.length).toBe(246) // M42 INV: +create_stock_take +record_stock_counts +advance_stock_take (M39 JWL: +bill_jobwork +list_jobworker_statement)
  })

  it('the base service + its tool stay untouched (the manual ADJ- door is separate from the waste door)', () => {
    // planStockAdjustment still exports and the post_stock_adjustment tool exists
    expect(typeof planStockAdjustment).toBe('function')
    expect(getTool('post_stock_adjustment')).toBeTruthy()
  })

  it('setFlag round-trips the waste flags (scrap rate drives waste valuation)', async () => {
    // setFlag is the admin door; a missing row simply means the default (getFlag is a pure read now)
    const v = await setFlag('waste_scrap_rate', 12)
    expect(v).toBe(12)
    const row = await db.appOption.findUnique({ where: { key: 'flag:waste_scrap_rate' } })
    expect(row?.value).toBe('12')
    await setFlag('waste_scrap_rate', 0) // restore the default for the other suites
  })
})
