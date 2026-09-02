/**
 * SPEC-M5 §12-4 — approval kinds (Wave C):
 *   - kinds registry shape: 4 frozen kinds, labels, routes, refResolver drills
 *   - registry ↔ menu ↔ LIVE_ROUTES wiring: every kind screen is live and its
 *     menu item carries the kind's wrapper tool
 *   - posting-hook creation: godown transfer requiresAck leaves a pending row
 *     (and the flag-less transfer leaves none); reprocess:true and
 *     returnable:false likewise
 *   - the four wrapper tools: find-or-create + approve semantics, register
 *     billPass surfacing, idempotence
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getTool, allTools } from '@/lib/agent/tools'
import { db } from '@/lib/db'
import { LIVE_ROUTES, MENU_ITEMS, isLive } from '@/lib/erp/menu-registry'
import { APPROVAL_KINDS, APPROVAL_KIND_ENTITIES, findApprovalKind, approvalRefHref } from '@/lib/erp/approval-kinds'
import { planTransfer } from '@/lib/erp/posting/transfer'
import { planGrn } from '@/lib/erp/posting/grn'
import { planPcsDespatch } from '@/lib/erp/posting/despatch'
import { planSupplierBill } from '@/lib/erp/posting/supplier-bill' // SPEC-M40 PAY-03
import { REGISTER_SERVICES } from '@/lib/erp/registers'

const TS = Date.now()
const BUYER = 'B001'
const YARN = 'Y-30COT'
const SUPPLIER = 'SUP001'

const ordNo = `M5C-O-${TS}`
const styNo = `M5C-S-${TS}`
const poNo = `M5C-PO-${TS}`

async function agentDoor(toolName: string, args: Record<string, unknown>) {
  const tool = getTool(toolName)
  if (!tool) throw new Error(`tool ${toolName} not found`)
  const res = await tool.execute(args)
  if (!res.plan || !res.commit) throw new Error(`${toolName} agent door returned no plan: ${res.text}`)
  return res.commit()
}

describe('M5 Wave C — approval kinds registry (SPEC-M5 §12-4)', () => {
  it('kinds registry: 8 kinds (4 hook-raised + 4 manual-queue Wave D) with label/route/tool/refResolver', () => {
    expect(APPROVAL_KIND_ENTITIES).toEqual([
      'supplier_bill', 'godown_transfer', 'reprocess', 'non_return_dc',
      // SPEC-M6 §6 (Wave D) — the manual-queue kinds
      'grn_acceptance', 'cutting_ack', 'pcs_acceptance', 'lot',
    ])
    const bill = findApprovalKind('supplier_bill')!
    expect(bill.label).toBe('Bill Pass')
    expect(bill.route).toBe('/accounts/bill-pass')
    expect(bill.tool).toBe('create_bill_pass')
    // SPEC-M40 PAY-03 — the kind drills the SB-#### document, not the GRN
    expect(bill.refResolver('sb-id-1')).toBe('/accounts/bill/sb-id-1')
    expect(findApprovalKind('reprocess')!.refResolver('g')).toBe('/procurement/grn/g')
    expect(findApprovalKind('non_return_dc')!.refResolver('dc')).toBe('/pieces/despatch/dc')
    expect(findApprovalKind('godown_transfer')!.refResolver('GT-0001')).toBe('/inventory/io-history')
    // Wave D kinds: manual flag + frozen routes/tools/drills (SPEC-M6 §6)
    const gan = findApprovalKind('pcs_acceptance')!
    expect(gan.manual).toBe(true)
    expect(gan.route).toBe('/pieces/gan')
    expect(gan.tool).toBe('accept_jobwork_pcs')
    expect(gan.refResolver('jw-1')).toBe('/jobwork/order/jw-1')
    expect(findApprovalKind('grn_acceptance')!.refResolver('g')).toBe('/procurement/grn/g')
    expect(findApprovalKind('lot')!.refResolver('g')).toBe('/procurement/grn/g')
    expect(findApprovalKind('cutting_ack')!.refResolver('li')).toBe('/cutting/issue')
    // the Wave-C kinds carry NO manual flag (hook-raised)
    for (const e of ['supplier_bill', 'godown_transfer', 'reprocess', 'non_return_dc']) {
      expect(findApprovalKind(e)!.manual ?? false).toBe(false)
    }
    // unknown entities have no kind → null drill (never a crash)
    expect(findApprovalKind('po')).toBeUndefined()
    expect(approvalRefHref('po', 'x')).toBeNull()
  })

  it('registry ↔ menu ↔ LIVE_ROUTES wiring: every kind screen is live with its wrapper tool', () => {
    expect(allTools.length).toBe(250) // M45 L-01: +get_operator_statement // M43 PRG: +set_order_deliveries +correct_program_spec +propose_program_requirements // M42 INV: +create_stock_take +record_stock_counts +advance_stock_take // 189 + M19-C ×33
    for (const k of APPROVAL_KINDS) {
      expect(LIVE_ROUTES.has(k.route)).toBe(true)
      const item = MENU_ITEMS.find((m) => m.route === k.route)
      expect(item, `menu item for ${k.route}`).toBeTruthy()
      expect(isLive(item!)).toBe(true)
      expect(item!.agentTools).toContain(k.tool)
      const t = getTool(k.tool)
      expect(t, `tool ${k.tool} registered`).toBeTruthy()
      expect(t!.isWrite).toBe(true)
    }
  })

  it('inbox kind filter contract: kind === Approval.entity (the API filters on entity equality)', () => {
    // The API route builds where: { entity: kind } — the registry entities must
    // be exactly the strings the posting hooks write (asserted below via rows).
    for (const k of APPROVAL_KINDS) expect(typeof k.entity).toBe('string')
    expect(APPROVAL_KIND_ENTITIES).not.toContain('po') // PO approvals pre-date kinds; unfiltered in "All"
  })
})

describe('M5 Wave C — posting hooks + wrapper tools (SPEC-M5 §6/§12-4)', () => {
  let orderId = ''
  let poId = ''
  let grnId = ''
  let grnNo = ''
  let dcId = ''
  let dcNo = ''
  let supplierBillId = ''
  let supplierBillNo = ''
  const gtDocNos: string[] = []   // every GT-#### this suite creates (ledger pair cleanup)
  let snapYarnBuckets: any[] = []

  beforeAll(async () => {
    const buyer = await db.buyer.findUnique({ where: { code: BUYER } })
    const style = await db.style.create({ data: { styleNo: styNo, description: `M5C style ${TS}` } })
    const order = await db.order.create({
      data: {
        orderNo: ordNo, buyerId: buyer!.id, styleId: style.id,
        orderDate: new Date(), deliveryDate: new Date('2027-03-31'),
        finYear: '26-27', status: 'open', totalPcs: 10, totalValue: 1000,
      },
    })
    orderId = order.id
    const supplier = await db.party.findUnique({ where: { code: SUPPLIER } })
    const yarn = await db.yarn.findUnique({ where: { code: YARN } })
    const po = await db.purchaseOrder.create({
      data: {
        poNo, poType: 'yarn', partyId: supplier!.id, orderDate: new Date(),
        deliveryDate: new Date('2027-04-30'), finYear: '26-27', status: 'open',
        totalQty: 10, totalValue: 3200,
        lines: { create: [{ itemType: 'yarn', itemId: yarn!.id, qty: 10, rate: 320, amount: 3200, orderId }] },
      },
    })
    poId = po.id
    // snapshot yarn buckets (the hooks bump them; restore in afterAll)
    snapYarnBuckets = await db.currentStock.findMany({ where: { itemType: 'yarn', itemId: yarn!.id } })
  })

  it('transfer_stock requiresAck:true leaves a PENDING godown_transfer row (the §12-4 assertion)', async () => {
    const p = await planTransfer({ itemType: 'yarn', itemCode: YARN, fromGodownCode: 'G1', toGodownCode: 'G2', qty: 4, requiresAck: true })
    expect(p.ok).toBe(true)
    expect(p.creates!.some((c) => c.table === 'approval')).toBe(true)
    expect(p.sideEffects!.some((s) => s.includes('/dispatch/unit-transfer-ack'))).toBe(true)
    const res = await p.commit!()
    const gtAck = (res as any).docNo
    gtDocNos.push(gtAck)
    const ap = await db.approval.findFirst({ where: { entity: 'godown_transfer', entityId: gtAck } })
    expect(ap).toBeTruthy()
    expect(ap!.status).toBe('pending')
    expect(ap!.requestedBy).toBe('agent')
  })

  it('transfer WITHOUT the flag leaves NO approval row (pre-Wave-C behaviour unchanged)', async () => {
    const p = await planTransfer({ itemType: 'yarn', itemCode: YARN, fromGodownCode: 'G2', toGodownCode: 'G1', qty: 4 })
    expect(p.ok).toBe(true)
    expect(p.creates!.some((c) => c.table === 'approval')).toBe(false)
    const res = await p.commit!()
    const gtNoFlag = (res as any).docNo
    gtDocNos.push(gtNoFlag)
    const ap = await db.approval.findFirst({ where: { entity: 'godown_transfer', entityId: gtNoFlag } })
    expect(ap).toBeNull()
  })

  it('receive_grn reprocess:true leaves a PENDING reprocess row', async () => {
    const p = await planGrn({ poNo, godownCode: 'G1', receivedQty: 10, reprocess: true })
    expect(p.ok).toBe(true)
    expect(p.creates!.some((c) => c.table === 'approval')).toBe(true)
    const res = await p.commit!()
    grnId = (res as any).id
    grnNo = (res as any).grnNo
    const ap = await db.approval.findFirst({ where: { entity: 'reprocess', entityId: grnId } })
    expect(ap).toBeTruthy()
    expect(ap!.status).toBe('pending')
  })

  it('create_pcs_despatch returnable:false leaves a PENDING non_return_dc row', async () => {
    const p = await planPcsDespatch({ orderNo: ordNo, totalPcs: 10, vehicleNo: `M5C-V-${TS}`, returnable: false })
    expect(p.ok).toBe(true)
    expect(p.creates!.some((c) => c.table === 'approval')).toBe(true)
    const res = await p.commit!()
    dcId = (res as any).id
    dcNo = (res as any).dcNo
    const ap = await db.approval.findFirst({ where: { entity: 'non_return_dc', entityId: dcId } })
    expect(ap).toBeTruthy()
    expect(ap!.status).toBe('pending')
  })

  it('create_bill_pass (M40 PAY-03): the REAL gate — SB draft → passed, verdicts stored, register shows the bill', async () => {
    // the new PAY-03 door first: the SB-#### draft from the fixture's GRN
    const sbPlan = await planSupplierBill({ grnNo, gstRate: 5 })
    expect(sbPlan.ok).toBe(true)
    expect(sbPlan.creates!.some((c) => c.table === 'supplierBill')).toBe(true)
    const sb = (await sbPlan.commit!()) as any
    supplierBillId = sb.id
    supplierBillNo = sb.billNo
    expect(sb.status).toBe('draft')
    // the gate: draft → passed; verdicts re-derived + stored; approval row on the BILL
    const out = await agentDoor('create_bill_pass', { billNo: sb.billNo, comments: 'm40 gate test' })
    expect(out.status).toBe('approved')
    expect(out.billStatus).toBe('passed')
    expect(out.ref).toBe(sb.billNo)
    const ap = await db.approval.findFirst({ where: { entity: 'supplier_bill', entityId: sb.id } })
    expect(ap!.status).toBe('approved')
    expect(ap!.approvedBy).toBe('agent')
    const stored = await db.supplierBill.findUnique({ where: { id: sb.id } })
    expect(stored!.status).toBe('passed')
    expect(stored!.matchStatus).toBeTruthy() // verdicts stored (matched | variance)
    expect(stored!.matchVerdicts).toBeTruthy()
    // register surfaces the SB row with its lifecycle status
    const reg = await REGISTER_SERVICES['supplier-bills']({ limit: 100, page: 1 })
    const row = reg.rows.find((r) => r.billNo === sb.billNo)
    expect(row!.status).toBe('passed')
    // agent read door carries it too (additive json)
    const t = getTool('list_supplier_bills')!
    const res = await t.execute({})
    const jsonRow = (res.json as any[]).find((r) => r.billNo === sb.billNo)
    expect(jsonRow.status).toBe('passed')
  })

  it('create_bill_pass is idempotent: second run returns text only (no plan/commit)', async () => {
    const tool = getTool('create_bill_pass')!
    const res = await tool.execute({ billNo: supplierBillNo })
    expect(res.text).toContain('already passed')
    expect(res.plan).toBeUndefined()
  })

  it('acknowledge_unit_transfer: approves the pending requiresAck row', async () => {
    const gtAck = gtDocNos[0]
    const out = await agentDoor('acknowledge_unit_transfer', { docNo: gtAck })
    expect((out as any).status).toBe('approved')
    expect((out as any).ref).toBe(gtAck)
    const ap = await db.approval.findFirst({ where: { entity: 'godown_transfer', entityId: gtAck } })
    expect(ap!.status).toBe('approved')
  })

  it('acknowledge_unit_transfer ALSO creates the row when the transfer lacks one (§8 rule)', async () => {
    const p = await planTransfer({ itemType: 'yarn', itemCode: YARN, fromGodownCode: 'G1', toGodownCode: 'G2', qty: 1 })
    const res = await p.commit!()
    const bare = (res as any).docNo
    const out = await agentDoor('acknowledge_unit_transfer', { docNo: bare })
    expect((out as any).status).toBe('approved')
    const ap = await db.approval.findFirst({ where: { entity: 'godown_transfer', entityId: bare } })
    expect(ap!.status).toBe('approved')
  })

  it('approve_reprocess: approves the pending reprocess row', async () => {
    const out = await agentDoor('approve_reprocess', { grnNo })
    expect((out as any).status).toBe('approved')
    const ap = await db.approval.findFirst({ where: { entity: 'reprocess', entityId: grnId } })
    expect(ap!.status).toBe('approved')
  })

  it('approve_non_return_dc: approves the pending non-return row', async () => {
    const out = await agentDoor('approve_non_return_dc', { dcNo })
    expect((out as any).status).toBe('approved')
    const ap = await db.approval.findFirst({ where: { entity: 'non_return_dc', entityId: dcId } })
    expect(ap!.status).toBe('approved')
  })

  it('wrapper tools reject unknown documents with text-only results', async () => {
    for (const [tool, args] of [
      ['create_bill_pass', { billNo: 'SB-NOPE' }],
      ['acknowledge_unit_transfer', { docNo: 'GT-NOPE' }],
      ['approve_reprocess', { grnNo: 'GRN-NOPE' }],
      ['approve_non_return_dc', { dcNo: 'DC-NOPE' }],
    ] as Array<[string, Record<string, unknown>]>) {
      const res = await getTool(tool)!.execute(args)
      expect(res.text.toLowerCase()).toMatch(/(not found|no godown transfer)/)
      expect(res.plan).toBeUndefined()
    }
  })

  afterAll(async () => {
    const sw = (p: Promise<unknown>) => p.catch(() => {})
    // approvals raised by THIS suite only (scoped — never global wipes)
    await sw(db.approval.deleteMany({
      where: {
        OR: [
          { entity: 'godown_transfer', entityId: { in: gtDocNos.length ? gtDocNos : ['__none__'] } },
          { entity: 'supplier_bill', entityId: supplierBillId || '__none__' },
          { entity: 'reprocess', entityId: grnId || '__none__' },
          { entity: 'non_return_dc', entityId: dcId || '__none__' },
          { entity: 'po', entityId: poId || '__none__' },
        ],
      },
    }))
    // SPEC-M40 — the suite's supplier bill + any allocations on it
    await sw(db.paymentAllocation.deleteMany({ where: { billId: supplierBillId || '__none__' } }))
    await sw(db.supplierBill.deleteMany({ where: { id: supplierBillId || '__none__' } }))
    // GT pairs + GRN + DC ledger rows (scoped to this suite's doc numbers)
    await sw(db.stockLedger.deleteMany({ where: { docNo: { in: [...gtDocNos, grnNo, dcNo].filter(Boolean) } } }))
    await sw(db.stockLedger.deleteMany({ where: { orderId } }))
    // pcs buckets + yarn bucket restore (snapshot from beforeAll)
    await sw(db.currentStock.deleteMany({ where: { itemType: 'pcs', itemId: orderId } }))
    const yarn = await db.yarn.findUnique({ where: { code: YARN } })
    if (yarn) {
      await sw(db.currentStock.deleteMany({ where: { itemType: 'yarn', itemId: yarn.id } }))
      for (const b of snapYarnBuckets) {
        await sw(db.currentStock.create({ data: { itemType: b.itemType, itemId: b.itemId, godownId: b.godownId, lotId: b.lotId, colourId: b.colourId, sizeId: b.sizeId, deptId: b.deptId, orderId: b.orderId, kgs: b.kgs, mtrs: b.mtrs, pcs: b.pcs, rate: b.rate } }))
      }
    }
    if (dcId) {
      await sw(db.pcsDespatchLine.deleteMany({ where: { pcsDespatchId: dcId } }))
      await sw(db.pcsDespatch.deleteMany({ where: { id: dcId } }))
    }
    if (grnId) {
      await sw(db.gRNLine.deleteMany({ where: { grnId } }))
      await sw(db.gRN.deleteMany({ where: { id: grnId } }))
    }
    await sw(db.pOLine.deleteMany({ where: { poId } }))
    await sw(db.purchaseOrder.deleteMany({ where: { id: poId } }))
    await sw(db.order.deleteMany({ where: { id: orderId } }))
    await sw(db.style.deleteMany({ where: { styleNo: styNo } }))
  })
})
