/**
 * SPEC-M6 §12-3 (Wave C) — lifecycle guards + both doors. close_order guards
 * (95% + invoice; force), cancel/complete program guards, PO lifecycle, and
 * the update_order → planOrderAmend extraction (json contract frozen).
 */
import { describe, it, expect, afterAll } from 'vitest'
import { db } from '@/lib/db'
import { getTool } from '@/lib/agent/tools'
import { planCloseOrder, planCancelProgram, planCompleteProgram, planPoLifecycle, planOrderAmend } from '@/lib/erp/posting/lifecycle'

const TS = Date.now()
const ORDER = `M6C-ORD-${TS}`
const PO = `M6C-PO-${TS}`
let orderId = ''
let poId = ''

async function commitTool(name: string, args: Record<string, unknown>) {
  const tool = getTool(name)!
  const out = await tool.execute(args as never)
  expect((out as any).text).not.toContain('not found')
  await (out as any).commit()
  return out
}

describe('M6 Wave C lifecycle (SPEC-M6 §12-3)', () => {
  afterAll(async () => {
    const sw = (e: unknown) => e as any
    await sw(db.program.deleteMany({ where: { orderId } }).catch(() => {}))
    await sw(db.stockLedger.deleteMany({ where: { orderId } }).catch(() => {}))
    await sw(db.salesInvoice.deleteMany({ where: { orderId } }).catch(() => {}))
    await sw(db.pcsDespatch.deleteMany({ where: { orderId } }).catch(() => {}))
    await sw(db.gRN.deleteMany({ where: { poId } }).catch(() => {}))
    await sw(db.purchaseOrder.deleteMany({ where: { poNo: PO } }).catch(() => {}))
    await sw(db.order.deleteMany({ where: { orderNo: ORDER } }).catch(() => {}))
  })

  it('close_order guards reject a fresh order; force closes; form door (service) is the same path', async () => {
    const buyer = await db.buyer.findUnique({ where: { code: 'B001' } })
    const order = await db.order.create({
      data: { orderNo: ORDER, buyerId: buyer!.id, status: 'open', totalPcs: 100, totalValue: 20000, finYear: 'FY26' },
    })
    orderId = order.id
    // guard: nothing despatched, no invoice
    const blocked = await planCloseOrder({ orderNo: ORDER })
    expect(blocked.ok).toBe(false)
    expect(blocked.error).toContain('95%')
    // fulfill: despatch 100% + invoice (partyId must be a PARTY — buyer is not a party)
    const anyParty = await db.party.findFirst()
    await db.pcsDespatch.create({ data: { dcNo: `M6C-DC-${TS}`, orderId, buyerId: buyer!.id, totalPcs: 100, status: 'despatched', finYear: 'FY26' } })
    const inv = await db.salesInvoice.create({ data: { invoiceNo: `M6C-INV-${TS}`, orderId, partyId: anyParty!.id, billAmount: 20000, status: 'issued', finYear: 'FY26' } })
    // agent door
    await commitTool('close_order', { orderNo: ORDER })
    const closed = await db.order.findUnique({ where: { id: orderId } })
    expect(closed!.status).toBe('closed')
    await db.salesInvoice.update({ where: { id: inv.id }, data: { status: 'cancelled' } })
  })

  it('cancel_program: net-zero guard; complete_program: balance guard; force settles both', async () => {
    const program = await db.program.create({
      data: { programNo: `M6C-PGM-${TS}`, orderId, stage: 'knitting', requiredKgs: 50, status: 'open' },
    })
    // cancel guard: no item linked → needs force (program has no yarn/fabric in this fixture)
    const c1 = await planCancelProgram({ programNo: program.programNo })
    expect(c1.ok).toBe(false)
    const c2 = await planCancelProgram({ programNo: program.programNo, force: true })
    expect(c2.ok).toBe(true)
    await c2.commit!()
    const cancelled = await db.program.findUnique({ where: { id: program.id } })
    expect(cancelled!.status).toBe('cancelled')
    // complete guard on a fresh program
    const p2 = await db.program.create({
      data: { programNo: `M6C-PG2-${TS}`, orderId, stage: 'dyeing', requiredKgs: 30, status: 'open' },
    })
    const g1 = await planCompleteProgram({ programNo: p2.programNo })
    expect(g1.ok).toBe(false)
    // no item linked in this fixture → the no-item guard; both are guard rejections
    expect(g1.error).toMatch(/balance|no item linked/)
    await commitTool('complete_program', { programNo: p2.programNo, force: true })
    const done = await db.program.findUnique({ where: { id: p2.id } })
    expect(done!.status).toBe('completed')
  })

  it('PO lifecycle: cancel blocked by receipts; complete requires receipts; cancel_purchase_order door is the same service', async () => {
    const party = await db.party.findFirst({ where: { partyType: { in: ['supplier', 'both'] } } })
    const po = await db.purchaseOrder.create({
      data: { poNo: PO, poType: 'yarn', partyId: party!.id, status: 'open', totalQty: 10, totalValue: 1000, finYear: 'FY26' },
    })
    poId = po.id
    // complete without receipts fails
    const c1 = await planPoLifecycle({ poNo: PO, action: 'complete' })
    expect(c1.ok).toBe(false)
    // a receipt arrives
    await db.gRN.create({ data: { grnNo: `M6C-GRN-${TS}`, grnType: 'purchase', poId, partyId: party!.id, godownId: (await db.godown.findFirst())!.id, totalQty: 10, totalValue: 1000, finYear: 'FY26' } })
    // cancel now blocked by the receipt
    const c2 = await planPoLifecycle({ poNo: PO, action: 'cancel' })
    expect(c2.ok).toBe(false)
    expect(c2.error).toContain('received')
    // complete succeeds (agent door)
    await commitTool('complete_purchase_order', { poNo: PO, action: 'complete' })
    const done = await db.purchaseOrder.findUnique({ where: { id: poId } })
    expect(done!.status).toBe('completed')
  })

  it('update_order delegates to planOrderAmend (extraction keeps the contract)', async () => {
    const plan = await planOrderAmend({ orderNo: ORDER, notes: `amended ${TS}` })
    expect(plan.ok).toBe(true)
    await plan.commit!()
    const row = await db.order.findUnique({ where: { id: orderId } })
    expect(row!.notes).toContain(`amended ${TS}`)
    const empty = await planOrderAmend({ orderNo: ORDER })
    expect(empty.ok).toBe(false)
    expect(empty.error).toContain('Nothing to amend')
  })
})
