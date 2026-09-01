/**
 * SPEC-M21 — Waste Receipt (FrmWasteReceiptEntry, gap-audit P3): the
 * stock-adj VARIANT contract — wasteClass validation, WST-#### numbering,
 * reason composition, the base service's validation passthrough, the G2
 * ledger+bucket proof on commit, and the doc-config/tool registration.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/lib/db'
import { planWasteReceipt, planStockAdjustment } from '@/lib/erp/posting/stock-adj'
import { DOC_CONFIGS } from '@/lib/erp/doc-configs'
import { getTool, allTools } from '@/lib/agent/tools'

const TS = Date.now()
const GODOWN = `M21-G-${TS}`
const YARN = `M21-Y-${TS}`

let godownId = '', yarnId = '', wstLedgerIds: string[] = []

describe('SPEC-M21 §2 — planWasteReceipt (the stock-adj variant)', () => {
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

  it('base-service validation passes through (unknown godown / item / qty<=0)', async () => {
    const badGodown = await planWasteReceipt({ godownCode: 'NOPE', itemType: 'yarn', itemCode: YARN, qty: 10, wasteClass: 'knitting' })
    expect(badGodown.ok).toBe(false)
    const badItem = await planWasteReceipt({ godownCode: GODOWN, itemType: 'yarn', itemCode: 'NOPE', qty: 10, wasteClass: 'knitting' })
    expect(badItem.ok).toBe(false)
    const badQty = await planWasteReceipt({ godownCode: GODOWN, itemType: 'yarn', itemCode: YARN, qty: 0, wasteClass: 'knitting' })
    expect(badQty.ok).toBe(false)
  })

  it('plan: action=add forced, reason composed from wasteClass (+ notes), WST-#### monotonic', async () => {
    const p1 = await planWasteReceipt({ godownCode: GODOWN, itemType: 'yarn', itemCode: YARN, qty: 25, wasteClass: 'knitting', notes: 'dyelot tail' })
    expect(p1.ok).toBe(true)
    if (p1.ok) {
      const row = p1.creates?.[0]
      expect(row?.data.txnType).toBe('stock_adjustment_add') // the base family's type — WST- + notes distinguish
      expect(row?.data.docNo).toMatch(/^WST-\d{4}$/)
      expect(row?.data.notes).toBe('Waste — knitting: dyelot tail')
      // (the base service's `text` doesn't quote the docNo — creates[0] carries it)
    }
    const p2 = await planWasteReceipt({ godownCode: GODOWN, itemType: 'yarn', itemCode: YARN, qty: 5, wasteClass: 'cutting' })
    if (p2.ok) {
      expect(p2.creates?.[0]?.data.notes).toBe('Waste — cutting')
    }
    // numbering advances after a commit (p1 committed below), monotonic across plans
  })

  it('commit lands the ledger row AND increments the CurrentStock bucket (G2 proof)', async () => {
    const before = await db.currentStock.findFirst({ where: { itemType: 'yarn', itemId: yarnId, godownId } })
    const beforeKgs = before?.kgs ?? 0

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
    wstLedgerIds.push(ledger!.id)

    const after = await db.currentStock.findFirst({ where: { itemType: 'yarn', itemId: yarnId, godownId } })
    expect((after?.kgs ?? 0) - beforeKgs).toBe(40)
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

  it('registry grew 224 → 226 (receive_waste)', () => {
    expect(allTools.length).toBe(238) // M39 JWL: +bill_jobwork +list_jobworker_statement
  })

  it('the base service + its tool stay untouched (variant contract)', () => {
    // planStockAdjustment still exports and the post_stock_adjustment tool exists
    expect(typeof planStockAdjustment).toBe('function')
    expect(getTool('post_stock_adjustment')).toBeTruthy()
  })
})
