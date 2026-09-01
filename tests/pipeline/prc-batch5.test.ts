/**
 * PRC Batch 5 (Phase-6B, SPEC-M41) — the procurement & dispatch closure tier:
 *   PRC-01  multi-line GRN (lines[] per PO line; status = all-lines math; HFX-01 retired)
 *   PRC-02  PO amendment (planPoAmend — rate/qty revision with trail + guards)
 *   PRC-03  purchase return (PRN-####; rejectedQty cumulative guard; linked DN)
 *   PRC-04  PO approval gate real (po_appr flag reads the Approval row)
 *   PRC-05  DC lifecycle (LAD conversion + delivered; despatch day-book register)
 *   PRC-06  gendcdays wired (digest nonReturn section, returnable-days detection)
 *   PRC-07  gate refDocNo validated + clear door + register gatePass column
 *   PRC-08  logistics fields (schema → service → print)
 *   PRC-09  DEFERRED per §17-6 (recorded, no dead columns)
 *
 * Spec §15 loop-closure tests #1 (PO → GRN) + #5 (DC):
 *   #1  3-line PO → 2 GRNs covering all lines → per-line receivedQty exact, PO received
 *   #5  commit DC with colour/size → deliver → colour/size in print; deliveredAt stamped
 * Both doors share the services (ADR-001).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { db } from '@/lib/db'
import { planGrn } from '@/lib/erp/posting/grn'
import { planPurchaseOrder } from '@/lib/erp/posting/purchase-order'
import { planPoAmend, planDcTransition, planClearGateEntry } from '@/lib/erp/posting/lifecycle'
import { planPurchaseReturn } from '@/lib/erp/posting/purchase-return'
import { planPcsDespatch } from '@/lib/erp/posting/despatch'
import { planGateEntry } from '@/lib/erp/posting/gate'
import { setFlag, getFlag } from '@/lib/erp/flags'
import { buildDigest } from '@/lib/erp/notifications/digest'
import { fetchPcsDespatchPrint } from '@/lib/erp/print/fetchers-b'
import { getTool } from '@/lib/agent/tools'
import { REGISTER_SERVICES } from '@/lib/erp/registers'

const TS = Date.now()
const SUP = `M41-S-${TS}`           // supplier party
const BUYER_CODE = 'B001'
const STYLE = `M41-STY-${TS}`       // order style (pcs DC loop)
const ORDER = `M41-ORD-${TS}`
const YARN_A = `M41-YA-${TS}`       // loop-closure #1 PO items
const YARN_B = `M41-YB-${TS}`
const FAB_C = `M41-FC-${TS}`
const RET_YARN = `M41-YR-${TS}`     // PRC-03 return item
const COLOUR_NAME = `M41 Navy ${TS}`
const SIZE_NAME = `M41-104 ${TS}`

const ERP_DIR = join(process.cwd(), 'src/lib/erp')
const src = (p: string) => readFileSync(join(ERP_DIR, p), 'utf8')
const prismaSrc = readFileSync(join(process.cwd(), 'prisma/schema.prisma'), 'utf8')

let supId = '', styleId = '', orderId = '', colourId = '', sizeId = ''
let po1 = '', po1Id = ''            // loop-closure #1: the 3-line PO
let po2 = '', po2Id = ''            // PRC-02/03: the amendment + return PO
let po3 = ''                        // PRC-04: the approval-gate PO
let grn1 = '', grn1Id = ''          // loop-closure #1: GRN over lines 1+2
let grn2 = '', grn2Id = ''          // loop-closure #1: GRN over line 3
let grnR = '', grnRId = ''          // PRC-02/03: the single-line PO GRN (received 6)
let grnR2 = '', grnR2Id = ''        // PRC-03: the second GRN (received 6 more)
let grn4 = '', grn4Id = ''          // PRC-04: the gate-approved GRN
let prn = '', prnId = ''            // PRC-03: the return
let dnLinked = ''                   // PRC-03: the linked debit note
let dc5 = '', dc5Id = ''            // loop-closure #5: the delivered DC
let lad5 = '', lad5Id = ''          // PRC-05: the converted LAD
let gateOut = ''                    // PRC-07: the cleared gate pass
const grnLedgerIds: string[] = []   // every GRN id that wrote refId ledger rows

async function commit<T>(planOrPromise: any): Promise<T> {
  const plan = await planOrPromise
  if (!plan.ok) throw new Error(`plan failed: ${plan.error ?? JSON.stringify(plan).slice(0, 200)}`)
  return plan.commit!()
}

describe('PRC Batch 5 — SPEC-M41 procurement & dispatch closure', () => {
  beforeAll(async () => {
    const sup = await db.party.create({ data: { code: SUP, name: `M41 Supplier ${TS}`, partyType: 'supplier' } })
    supId = sup.id
    const buyer = await db.buyer.findUniqueOrThrow({ where: { code: BUYER_CODE } })
    const style = await db.style.create({ data: { styleNo: STYLE, description: `M41 ${TS}`, buyerId: buyer.id } })
    styleId = style.id
    const order = await db.order.create({ data: { orderNo: ORDER, buyerId: buyer.id, styleId, status: 'open', totalPcs: 100, totalValue: 1000, finYear: '26-27' } })
    orderId = order.id
    const uom = await db.uOM.findFirstOrThrow()
    await db.yarn.create({ data: { code: YARN_A, count: '30s', uomId: uom.id, rate: 100 } })
    await db.yarn.create({ data: { code: YARN_B, count: '40s', uomId: uom.id, rate: 120 } })
    await db.yarn.create({ data: { code: RET_YARN, count: '30s', uomId: uom.id, rate: 100 } })
    await db.fabric.create({ data: { code: FAB_C, width: 180, uomId: uom.id, rate: 200 } })
    const colour = await db.colour.create({ data: { name: COLOUR_NAME, code: `M41C-${TS}` } })
    const size = await db.size.create({ data: { name: SIZE_NAME } })
    colourId = colour.id; sizeId = size.id
  })

  afterAll(async () => {
    const sw = (p: unknown) => p
    // PRC-04: restore the flag default
    await sw(setFlag('po_appr', false).catch(() => {}))
    // gate rows
    await sw(db.gateEntry.deleteMany({ where: { refDocNo: dc5 } }).catch(() => {}))
    if (gateOut) await sw(db.gateEntry.deleteMany({ where: { entryNo: gateOut } }).catch(() => {}))
    // DCs + LAD: lines + docNo-keyed ledger (postLedger writes no refId)
    for (const dcId of [dc5Id, lad5Id].filter(Boolean)) {
      await sw(db.pcsDespatchLine.deleteMany({ where: { pcsDespatchId: dcId } }).catch(() => {}))
    }
    if (dc5 || lad5) await sw(db.stockLedger.deleteMany({ where: { docNo: { in: [dc5, lad5] } } }).catch(() => {}))
    await sw(db.pcsDespatch.deleteMany({ where: { orderId } }).catch(() => {}))
    // GRN ledger rows (refId = grn.id) + PRN docNo-keyed ledger (postLedger)
    for (const grnId of grnLedgerIds.filter(Boolean)) {
      await sw(db.stockLedger.deleteMany({ where: { refId: grnId } }).catch(() => {}))
      await sw(db.gRNLine.deleteMany({ where: { grnId } }).catch(() => {}))
      await sw(db.gRN.deleteMany({ where: { id: grnId } }).catch(() => {}))
    }
    if (prn) await sw(db.stockLedger.deleteMany({ where: { docNo: prn } }).catch(() => {}))
    if (dnLinked) await sw(db.debitNote.deleteMany({ where: { noteNo: dnLinked } }).catch(() => {}))
    // POs + lines + approvals
    for (const poNo of [po1, po2, po3].filter(Boolean)) {
      await sw(db.pOLine.deleteMany({ where: { po: { poNo } } }).catch(() => {}))
      await sw(db.purchaseOrder.deleteMany({ where: { poNo } }).catch(() => {}))
    }
    for (const poId of [po1Id, po2Id].filter(Boolean)) {
      await sw(db.approval.deleteMany({ where: { entity: 'po', entityId: poId } }).catch(() => {}))
    }
    // order + style + items + colour/size + party
    await sw(db.order.deleteMany({ where: { orderNo: ORDER } }).catch(() => {}))
    await sw(db.style.deleteMany({ where: { id: styleId } }).catch(() => {}))
    await sw(db.yarn.deleteMany({ where: { code: { in: [YARN_A, YARN_B, RET_YARN] } } }).catch(() => {}))
    await sw(db.fabric.deleteMany({ where: { code: FAB_C } }).catch(() => {}))
    await sw(db.colour.deleteMany({ where: { id: colourId } }).catch(() => {}))
    await sw(db.size.deleteMany({ where: { id: sizeId } }).catch(() => {}))
    await sw(db.party.deleteMany({ where: { id: supId } }).catch(() => {}))
  })

  // ───────────── loop-closure test #1 (spec §15 — PO → GRN) ─────────────

  it('#1 PRC-01: a 3-line PO is fully received across 2 GRNs — per-line exact, PO received (both doors)', async () => {
    // the 3-line PO (door 1 — the agent tool)
    const poTool = getTool('create_purchase_order')!
    const t = await poTool.execute({
      poType: 'general', partyCode: SUP, deliveryDate: '2026-09-20',
      lines: [
        { itemType: 'yarn', itemCode: YARN_A, qty: 10, rate: 100 },
        { itemType: 'yarn', itemCode: YARN_B, qty: 5, rate: 120 },
        { itemType: 'fabric', itemCode: FAB_C, qty: 8, rate: 200 },
      ],
    })
    expect(t.plan).toBeTruthy()
    const created = (await t.commit!()) as any
    po1 = created.poNo
    po1Id = created.id
    const po = await db.purchaseOrder.findUniqueOrThrow({ where: { poNo: po1 }, include: { lines: true } })
    expect(po.lines.length).toBe(3)
    expect(po.totalQty).toBe(23)
    expect(po.totalValue).toBe(10 * 100 + 5 * 120 + 8 * 200)

    // GRN #1 covers lines 1+2 (door 2 — the service)
    const g1 = await commit<any>(planGrn({
      poNo: po1, godownCode: 'G1',
      lines: [
        { itemType: 'yarn', itemCode: YARN_A, qty: 10 },
        { itemType: 'yarn', itemCode: YARN_B, qty: 3 },
      ],
    }))
    grn1 = g1.grnNo; grn1Id = g1.id; grnLedgerIds.push(g1.id)
    expect(g1.lines).toBe(2)
    expect(g1.poStatus).toBe('partial') // line 3 (fabric 0/8) not covered
    let mid = await db.purchaseOrder.findUniqueOrThrow({ where: { poNo: po1 }, include: { lines: true } })
    expect(mid.lines.find((l) => l.qty === 10)!.receivedQty).toBe(10)
    expect(mid.lines.find((l) => l.qty === 5)!.receivedQty).toBe(3)
    expect(mid.lines.find((l) => l.qty === 8)!.receivedQty).toBe(0)
    expect(mid.status).toBe('partial')

    // GRN #2 covers line 2's remainder + line 3 fully (door 1 — receive_grn tool, lines path)
    const grnTool = getTool('receive_grn')!
    const t2 = await grnTool.execute({
      poNo: po1, godownCode: 'G1',
      lines: [
        { itemType: 'yarn', itemCode: YARN_B, qty: 2 },
        { itemType: 'fabric', itemCode: FAB_C, qty: 8 },
      ],
    })
    expect(t2.plan).toBeTruthy()
    const g2 = (await t2.commit!()) as any
    grn2 = g2.grnNo; grn2Id = g2.id; grnLedgerIds.push(g2.id)
    expect(g2.poStatus).toBe('received') // every line covered

    const done = await db.purchaseOrder.findUniqueOrThrow({ where: { poNo: po1 }, include: { lines: true } })
    expect(done.status).toBe('received')
    expect(done.lines.every((l) => l.receivedQty >= l.qty)).toBe(true) // per-line exact
    // per-line ledger IN rows: 2 + 2 = 4 purchase_grn rows across the two GRNs
    const ledgerRows = await db.stockLedger.findMany({ where: { docNo: { in: [grn1, grn2] }, txnType: 'purchase_grn' } })
    expect(ledgerRows.length).toBe(4)
  })

  it('PRC-01 guards: duplicate line, unknown item, header qty on a multi-line PO, both-inputs', async () => {
    const dup = await planGrn({
      poNo: po1, godownCode: 'G1',
      lines: [
        { itemType: 'yarn', itemCode: YARN_A, qty: 1 },
        { itemType: 'yarn', itemCode: YARN_A, qty: 2 },
      ],
    })
    expect(dup.ok).toBe(false)
    expect(dup.error).toContain('Duplicate receipt line')

    const unknown = await planGrn({ poNo: po1, godownCode: 'G1', lines: [{ itemType: 'yarn', itemCode: 'NOPE-999', qty: 1 }] })
    expect(unknown.ok).toBe(false)
    expect(unknown.error).toContain('yarn NOPE-999 not found')

    const header = await planGrn({ poNo: po1, godownCode: 'G1', receivedQty: 5 })
    expect(header.ok).toBe(false)
    expect(header.error).toContain('pass lines[]')

    const both = await planGrn({ poNo: po1, godownCode: 'G1', receivedQty: 5, lines: [{ itemType: 'yarn', itemCode: YARN_A, qty: 5 }] })
    expect(both.ok).toBe(false)
    expect(both.error).toContain('not both')

    // the HFX-01 multi-line refusal is RETIRED (source contract)
    expect(src('posting/grn.ts')).not.toContain('multi-line receipts arrive with PRC-01')
  })

  it('PRC-01 legacy: single-line PO header path still works (byte-identical behavior)', async () => {
    const po = await commit<any>(planPurchaseOrder({
      poType: 'yarn', partyCode: SUP, deliveryDate: '2026-09-25',
      lines: [{ itemType: 'yarn', itemCode: RET_YARN, qty: 10, rate: 100 }],
    }))
    po2 = po.poNo; po2Id = po.id
    const g = await commit<any>(planGrn({ poNo: po2, godownCode: 'G1', receivedQty: 6 }))
    grnR = g.grnNo; grnRId = g.id; grnLedgerIds.push(g.id)
    const mid = await db.purchaseOrder.findUniqueOrThrow({ where: { poNo: po2 }, include: { lines: true } })
    expect(mid.status).toBe('partial')
    expect(mid.lines[0].receivedQty).toBe(6)
  })

  // ───────────── PRC-02 — PO amendment ─────────────

  it('PRC-02: rate + qty revision recomputes totals, appends the trail; qty below received refuses', async () => {
    const amend = await planPoAmend({
      poNo: po2,
      lines: [{ itemType: 'yarn', itemCode: RET_YARN, qty: 12, rate: 110 }],
      notes: 'supplier re-quoted',
    })
    expect(amend.ok).toBe(true)
    const a = await commit<any>(amend)
    expect(a.linesAmended).toBe(1)
    const po = await db.purchaseOrder.findUniqueOrThrow({ where: { poNo: po2 }, include: { lines: true } })
    expect(po.totalQty).toBe(12)
    expect(po.totalValue).toBe(12 * 110)
    expect(po.lines[0].qty).toBe(12)
    expect(po.lines[0].rate).toBe(110)
    expect(po.notes).toContain('[amended')
    expect(po.notes).toContain('qty 10 → 12')
    expect(po.notes).toContain('rate 100 → 110')

    // qty below the already-received 6 refuses
    const tooLow = await planPoAmend({ poNo: po2, lines: [{ itemType: 'yarn', itemCode: RET_YARN, qty: 5 }] })
    expect(tooLow.ok).toBe(false)
    expect(tooLow.error).toContain('below the already-received')

    // agent tool parity (door 1) — header-only amendment leaves totals untouched
    const before = await db.purchaseOrder.findUniqueOrThrow({ where: { poNo: po2 } })
    const tool = getTool('update_purchase_order')!
    const t = await tool.execute({ poNo: po2, notes: 'delivery pushed' })
    expect(t.plan).toBeTruthy()
    await t.commit!()
    const po2b = await db.purchaseOrder.findUniqueOrThrow({ where: { poNo: po2 } })
    expect(po2b.notes).toContain('delivery pushed')
    expect(po2b.totalQty).toBe(before.totalQty)
    expect(po2b.totalValue).toBe(before.totalValue)
  })

  it('PRC-02 guards: unknown line, nothing-to-amend, lifecycle statuses refused', async () => {
    const unknown = await planPoAmend({ poNo: po2, lines: [{ itemType: 'yarn', itemCode: 'NOPE-1', qty: 1 }] })
    expect(unknown.ok).toBe(false)
    expect(unknown.error).toContain('yarn NOPE-1 not found')
    const empty = await planPoAmend({ poNo: po2 })
    expect(empty.ok).toBe(false)
    expect(empty.error).toContain('Nothing to amend')
    const lifecycle = await planPoAmend({ poNo: po2, status: 'cancelled' })
    expect(lifecycle.ok).toBe(false)
    expect(lifecycle.error).toContain('lifecycle transition')
  })

  // ───────────── PRC-03 — purchase return ─────────────

  it('PRC-03: PRN- return guards per GRN line, posts ledger OUT, increments rejectedQty, links the DN', async () => {
    // receive the remaining 6 on a SECOND GRN → PO received (12/12 after the amendment)
    const g2 = await commit<any>(planGrn({ poNo: po2, godownCode: 'G1', receivedQty: 6 }))
    grnR2 = g2.grnNo; grnR2Id = g2.id; grnLedgerIds.push(g2.id)
    const po = await db.purchaseOrder.findUniqueOrThrow({ where: { poNo: po2 }, include: { lines: true } })
    expect(po.lines[0].receivedQty).toBe(12)
    expect(po.status).toBe('received')

    // over-return refuses with the GRN line's numbers (grnR received 6, returned 0)
    const over = await planPurchaseReturn({ grnNo: grnR, lines: [{ itemType: 'yarn', itemCode: RET_YARN, qty: 7 }] })
    expect(over.ok).toBe(false)
    expect(over.error).toContain('exceeds the returnable 6')
    expect(over.error).toContain('received 6')

    // the return: 3 units against grnR + linked debit note (door 1 — the agent tool)
    const tool = getTool('create_purchase_return')!
    const t = await tool.execute({
      grnNo: grnR, debitNote: true,
      lines: [{ itemType: 'yarn', itemCode: RET_YARN, qty: 3 }],
    })
    expect(t.plan).toBeTruthy()
    const r = (await t.commit!()) as any
    prn = r.grnNo; prnId = r.id
    expect(prn.startsWith('PRN-')).toBe(true)
    expect(r.debitNoteNo).toBeTruthy()
    dnLinked = r.debitNoteNo

    // PRN row on the GRN table, type purchase_return, against-GRN ref
    const prnRow = await db.gRN.findUniqueOrThrow({ where: { grnNo: prn } })
    expect(prnRow.grnType).toBe('purchase_return')
    expect(prnRow.docNo).toBe(grnR)
    expect(prnRow.partyId).toBe(supId)

    // ledger OUT + rejectedQty cumulative + PO untouched
    const outRows = await db.stockLedger.findMany({ where: { docNo: prn, txnType: 'purchase_return' } })
    expect(outRows.length).toBe(1)
    expect(outRows[0].outKgs).toBe(3)
    const grnLine = await db.gRNLine.findFirstOrThrow({ where: { grnId: grnRId } })
    expect(grnLine.rejectedQty).toBe(3)
    const poAfter = await db.purchaseOrder.findUniqueOrThrow({ where: { poNo: po2 } })
    expect(poAfter.totalQty).toBe(12) // untouched — goods WERE received

    // linked debit note (PAY-03 tie)
    const dn = await db.debitNote.findUniqueOrThrow({ where: { noteNo: dnLinked } })
    expect(dn.amount).toBe(3 * 100) // GRN line rate
    expect(dn.reason).toContain(prn)
    expect(dn.partyId).toBe(supId)

    // cumulative guard: another return of 4 exceeds the open 3 (received 6 − returned 3)
    const over2 = await planPurchaseReturn({ grnNo: grnR, lines: [{ itemType: 'yarn', itemCode: RET_YARN, qty: 4 }] })
    expect(over2.ok).toBe(false)
    expect(over2.error).toContain('already returned 3')

    // list tool parity
    const list = await getTool('list_purchase_returns')!.execute({})
    const json = (list as any).json as any[]
    expect(json.some((x) => x.prnNo === prn && x.againstGrn === grnR)).toBe(true)
  })

  // ───────────── PRC-04 — the PO approval gate ─────────────

  it('PRC-04: po_appr on → a PENDING approval refuses the GRN; approved posts; flag default off', async () => {
    expect(await getFlag('po_appr')).toBe(false) // registry default preserved
    const po = await commit<any>(planPurchaseOrder({
      poType: 'yarn', partyCode: SUP, deliveryDate: '2026-10-01',
      lines: [{ itemType: 'yarn', itemCode: YARN_A, qty: 4, rate: 100 }],
    }))
    po3 = po.poNo
    await setFlag('po_appr', true)
    try {
      // the auto-submitted approval is PENDING → refuse
      const refused = await planGrn({ poNo: po3, godownCode: 'G1', receivedQty: 4 })
      expect(refused.ok).toBe(false)
      expect(refused.error).toContain('PENDING approval')
      // approve it, then the GRN posts
      const appr = await db.approval.findFirstOrThrow({ where: { entity: 'po', entityId: po.id, status: 'pending' } })
      await db.approval.update({ where: { id: appr.id }, data: { status: 'approved' } })
      const ok = await commit<any>(planGrn({ poNo: po3, godownCode: 'G1', receivedQty: 4 }))
      grn4 = ok.grnNo; grn4Id = ok.id; grnLedgerIds.push(ok.id)
      expect(ok.poStatus).toBe('received')
    } finally {
      await setFlag('po_appr', false)
    }
  })

  // ───────────── loop-closure test #5 (spec §15 — DC) ─────────────

  it('#5 PRC-05: DC with colour/size → deliver → colour/size in print + deliveredAt stamped', async () => {
    // commit the DC with colour/size lines (door 2 — the service, logistics fields too)
    const d = await commit<any>(planPcsDespatch({
      orderNo: ORDER, totalPcs: 50,
      vehicleNo: 'TN33-TEST',
      lrNo: 'LR-99001', transporter: 'Sri Balaji Transports', freight: 1500, cartons: 5, grossWeightKg: 85.5,
      lines: [{ styleNo: STYLE, colourName: COLOUR_NAME, sizeName: SIZE_NAME, qty: 50, rate: 10 }],
    }))
    dc5 = d.dcNo; dc5Id = d.id
    expect(dc5.startsWith('DC-')).toBe(true)

    // deliver (door 1 — the deliver_dc tool)
    const tool = getTool('deliver_dc')!
    const t = await tool.execute({ dcNo: dc5, to: 'delivered', date: '2026-09-02' })
    expect(t.plan).toBeTruthy()
    await t.commit!()
    const row = await db.pcsDespatch.findUniqueOrThrow({ where: { dcNo: dc5 } })
    expect(row.status).toBe('delivered')
    expect(row.deliveredAt).toBeTruthy()
    expect(new Date(row.deliveredAt!).toISOString().slice(0, 10)).toBe('2026-09-02')

    // colour/size in view + print (loop-closure #5 acceptance)
    const full = await db.pcsDespatch.findUniqueOrThrow({ where: { dcNo: dc5 }, include: { lines: true } })
    expect(full.lines[0].colourId).toBe(colourId)
    expect(full.lines[0].sizeId).toBe(sizeId)
    const print = await fetchPcsDespatchPrint(dc5)
    expect(print).toBeTruthy()
    const flat = JSON.stringify(print)
    expect(flat).toContain(COLOUR_NAME)
    expect(flat).toContain(SIZE_NAME)
    // PRC-08 — the logistics block rides the print meta
    expect(flat).toContain('LR-99001')
    expect(flat).toContain('Sri Balaji Transports')
    expect(flat).toContain('1,500')
    expect(flat).toContain('85.5')

    // delivered is terminal + already-at-target refuses
    const again = await planDcTransition({ dcNo: dc5, to: 'delivered' })
    expect(again.ok).toBe(false)
    expect(again.error).toContain('already delivered')
    const back = await planDcTransition({ dcNo: dc5, to: 'despatched' })
    expect(back.ok).toBe(false)
    expect(back.error).toContain('terminal state')
  })

  it('PRC-05: the LAD conversion (loading → despatched; the LAD- number stays) + the day-book register', async () => {
    const l = await commit<any>(planPcsDespatch({
      orderNo: ORDER, totalPcs: 20, mode: 'loading', vehicleNo: 'TN33-LAD1',
      lines: [{ styleNo: STYLE, qty: 20, rate: 10 }],
    }))
    lad5 = l.dcNo; lad5Id = l.id
    expect(lad5.startsWith('LAD-')).toBe(true)
    let row = await db.pcsDespatch.findUniqueOrThrow({ where: { dcNo: lad5 } })
    expect(row.status).toBe('loading')

    const conv = await commit<any>(planDcTransition({ dcNo: lad5, to: 'despatched' }))
    expect(conv.status).toBe('despatched')
    row = await db.pcsDespatch.findUniqueOrThrow({ where: { dcNo: lad5 } })
    expect(row.dcNo).toBe(lad5) // the number stays (ledger docNo/docKey intact)
    expect(row.status).toBe('despatched')
    expect(row.deliveredAt).toBeNull()

    // the despatch day-book: both rows, gate-pass join, totals
    const reg = await REGISTER_SERVICES['despatch-register']({ limit: 100, page: 1, q: ORDER })
    const all = reg.rows as any[]
    expect(all.length).toBeGreaterThanOrEqual(2)
    expect(reg.totals.some((t) => t.label === 'Without gate pass (page)')).toBe(true)
    expect(reg.totals.find((t) => t.label === 'DCs')!.value).toBeGreaterThanOrEqual(2)
    for (const r of all) {
      expect(typeof r.ageDays).toBe('number')
      expect(r.gatePass ?? null).toBeNull() // no GP yet
    }
  })

  // ───────────── PRC-06 — gendcdays wired ─────────────

  it('PRC-06: the digest nonReturn section lists stale jobwork DCs by returnable-days (flag-gated)', async () => {
    const jwParty = await db.party.create({ data: { code: `M41-JW-${TS}`, name: `M41 Jobworker ${TS}`, partyType: 'supplier' } })
    const stale = new Date(Date.now() - 10 * 86400000)
    const dc = await db.jobworkOrder.create({
      data: {
        dcNo: `M41-JWDC-${TS}`, jobworkerId: jwParty.id, processType: 'knitting',
        outDate: stale, totalQty: 100, totalValue: 5000, status: 'sent',
      },
    })
    try {
      await setFlag('gendcdays', 5)
      const digest = await buildDigest()
      expect(digest.sections.nonReturn.gendcdays).toBe(5)
      const row = digest.sections.nonReturn.rows.find((r) => r.dcNo === dc.dcNo)
      expect(row).toBeTruthy()
      expect(row!.sent).toBe(100)
      expect(row!.outstanding).toBe(100)
      expect(row!.ageDays).toBeGreaterThanOrEqual(10)
      expect(digest.text).toContain('Non-return jobwork DCs')

      // fully returned → not a non-return
      await db.jobworkOrder.update({ where: { id: dc.id }, data: { returnedQty: 100 } })
      const d2 = await buildDigest()
      expect(d2.sections.nonReturn.rows.find((r) => r.dcNo === dc.dcNo)).toBeFalsy()

      // flag off → the section is silent
      await setFlag('gendcdays', 0)
      const d3 = await buildDigest()
      expect(d3.sections.nonReturn.rows).toEqual([])
      expect(d3.sections.nonReturn.gendcdays).toBe(0)
    } finally {
      await setFlag('gendcdays', 5) // registry default restored
      await db.jobworkOrder.deleteMany({ where: { id: dc.id } })
      await db.party.deleteMany({ where: { id: jwParty.id } })
    }
  })

  // ───────────── PRC-07 — gate link ─────────────

  it('PRC-07: refDocNo validated against real docs (suggestions on miss) + the clear door + gatePass join', async () => {
    // unknown ref refuses with suggestions
    const bad = await planGateEntry({ gateType: 'out', refDocNo: 'DC-999999', vehicleNo: 'TN33-X' })
    expect(bad.ok).toBe(false)
    expect(bad.error).toContain('does not match any document')

    // a real DC ref passes and the register join sees it
    const ge = await commit<any>(planGateEntry({ gateType: 'out', refDocNo: dc5, vehicleNo: 'TN33-GP1' }))
    gateOut = ge.entryNo
    expect(gateOut.startsWith('GP-')).toBe(true)
    const reg = await REGISTER_SERVICES['despatch-register']({ limit: 100, page: 1, q: dc5 })
    expect((reg.rows[0] as any).gatePass).toContain(gateOut)

    // clear door: logged → cleared; second clear refuses
    const clear = await commit<any>(planClearGateEntry({ entryNo: gateOut }))
    expect(clear.status).toBe('cleared')
    const again = await planClearGateEntry({ entryNo: gateOut })
    expect(again.ok).toBe(false)
    expect(again.error).toContain('append-only')

    // blank ref stays allowed (gate rows legitimately carry no document)
    const blank = await commit<any>(planGateEntry({ gateType: 'in', vehicleNo: 'TN33-GE2' }))
    await db.gateEntry.deleteMany({ where: { entryNo: blank.entryNo } })
  })

  // ───────────── PRC-08 — logistics fields ─────────────

  it('PRC-08: logistics fields round-trip through the service into the DB row', async () => {
    const row = await db.pcsDespatch.findUniqueOrThrow({ where: { dcNo: dc5 } })
    expect(row.lrNo).toBe('LR-99001')
    expect(row.transporter).toBe('Sri Balaji Transports')
    expect(row.freight).toBe(1500)
    expect(row.cartons).toBe(5)
    expect(row.grossWeightKg).toBe(85.5)
    // schema + config + print source contracts
    expect(prismaSrc).toContain('lrNo         String?')
    expect(src('doc-configs/despatch.ts')).toContain("name: 'lrNo'")
    expect(src('print/fetchers-b.ts')).toContain('LR / AWB')
  })

  // ───────────── PRC-09 — the deferral pin ─────────────

  it('PRC-09: DEFERRED per §17-6 — no DC→invoice bridge columns, the deferral recorded', async () => {
    expect(prismaSrc).not.toMatch(/despatchId\s+String\?\s+\/\/.*SalesInvoice/)
    expect(prismaSrc).not.toContain('despatchId      String?')
    const spec = readFileSync(join(process.cwd(), 'docs/CONTEXT/specs/SPEC-M41.md'), 'utf8')
    expect(spec).toContain('DEFERRED per §17-6')
    expect(spec).toContain('PRC-09')
  })
})
