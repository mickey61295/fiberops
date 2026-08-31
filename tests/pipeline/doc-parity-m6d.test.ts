/**
 * SPEC-M6 §12-3 (Wave D) — doc-parity for the process-tail variants + the
 * four manual-queue approval gates:
 *   - opening-stock × both doors (OPN-####, action add, reason 'Opening stock')
 *   - pcs-transfer (PT-#### godown_transfer pair, net zero across godowns)
 *   - ready-to-cut (RTC-#### ready_to_cut_out/-in; store bucket −, D3 pool +,
 *     total unchanged — the virtual dept is a dept-keyed bucket)
 *   - multi-process-grn (MP-#### + lines + process_delivery OUT per line)
 *   - dc-entry + process-dc through the ONE create_dc door (MDC-/PDC- spaces)
 *   - dc-return (RTN-#### + process_receipt IN per line)
 *   - cutting-issue (cutting line accepted; sewing line rejected by the door)
 *   - cutting-production + line-output (production variant entries)
 *   - accept wrappers ×4: find-or-create + approve + idempotent; the QUEUE
 *     action (sendToAcceptanceAction) raises the row the wrappers approve.
 * ERRATA (SPEC-M6 §13): MP/RTN/PT/cutting-issue ride the FORM door (their
 * frozen agentTools chips name adjacent tools that cannot emit the variant
 * rows — receive_grn is PO-based, transfer_stock rejects itemType 'pcs',
 * create_line_issue has no deptCode param). Parity = form door vs service.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/lib/db'
import { getTool } from '@/lib/agent/tools'
import { commitDocAction } from '@/lib/erp/doc-actions'
import { getDocConfig } from '@/lib/erp/doc-configs'
import { planPcsTransfer, planReadyToCut } from '@/lib/erp/posting/transfer'
import { planMultiProcessGrn, planDcReturn } from '@/lib/erp/posting/grn'
import { planCuttingIssue } from '@/lib/erp/posting/line-issue'
import { sendToAcceptanceAction } from '@/lib/erp/approval-queue'

const TS = Date.now()
const ORDER = `M6D-ORD-${TS}`
const PARTY = 'SUP001'
const YARN = 'Y-30COT'
const FABRIC = 'F-SJ30'
const CUT_LINE = `M6D-CL-${TS}`

let orderId = ''
let cutLineId = ''
let d3Id = ''
let g1Id = ''
let g2Id = ''
let yarnId = ''
let fabricId = ''

const createdGrnIds: string[] = []
const createdJwIds: string[] = []

async function agentDoor(toolName: string, args: Record<string, unknown>) {
  const tool = getTool(toolName)
  if (!tool) throw new Error(`tool ${toolName} not found`)
  const res = await tool.execute(args as never)
  if (!res.plan || !res.commit) throw new Error(`${toolName} agent door returned no plan: ${res.text}`)
  return res.commit()
}

describe('M6 Wave D doc-parity — inventory variants (SPEC-M6 §12-3)', () => {
  beforeAll(async () => {
    const [order, g1, g2, d3, yarn, fabric] = await Promise.all([
      db.order.create({ data: { orderNo: ORDER, buyerId: (await db.buyer.findUnique({ where: { code: 'B001' } }))!.id, status: 'open', totalPcs: 100, totalValue: 10000, finYear: 'FY26' } }),
      db.godown.findUnique({ where: { code: 'G1' } }),
      db.godown.findUnique({ where: { code: 'G2' } }),
      db.department.findUnique({ where: { code: 'D3' } }),
      db.yarn.findUnique({ where: { code: YARN } }),
      db.fabric.findUnique({ where: { code: FABRIC } }),
    ])
    orderId = order.id
    g1Id = g1!.id
    g2Id = g2!.id
    d3Id = d3!.id
    yarnId = yarn!.id
    fabricId = fabric!.id
    // a line in the CUTTING dept (the cutting-issue door requires it)
    const cutLine = await db.line.create({ data: { code: CUT_LINE, name: `Wave D cutting line ${TS}`, deptId: d3Id } })
    cutLineId = cutLine.id
  })

  it('opening-stock: form door and agent door (post_opening) write identical OPN-#### rows', async () => {
    // form door (DocFormPayload: header strings) — action/reason injected by the wrapper
    const formOut = await commitDocAction('opening-stock', {
      header: { godownCode: 'G1', itemType: 'yarn', itemCode: YARN, qty: '12' },
    })
    expect(formOut.ok).toBe(true)
    expect((formOut as any).doc.docNo.startsWith('OPN-')).toBe(true)
    // agent door
    const out = await agentDoor('post_opening', { godownCode: 'G1', itemType: 'yarn', itemCode: YARN, qty: 3 })
    expect((out as any).docNo.startsWith('OPN-')).toBe(true)
    // both rows: OPN- space, stock_adjustment_add, reason 'Opening stock'
    const rows = await db.stockLedger.findMany({ where: { docNo: { startsWith: 'OPN-' } } })
    const ours = rows.filter((r) => r.createdAt.getTime() > Date.now() - 60_000 && r.itemId === yarnId)
    expect(ours.length).toBe(2)
    for (const r of ours) {
      expect(r.txnType).toBe('stock_adjustment_add')
      expect(r.inKgs).toBeGreaterThan(0)
      expect(r.notes).toBe('Opening stock')
    }
    expect(ours.some((r) => r.inKgs === 12)).toBe(true)
    expect(ours.some((r) => r.inKgs === 3)).toBe(true)
  })

  it('opening-stock rejects a missing item (the base service guard rides through)', async () => {
    const plan = await getDocConfig('opening-stock')!.service.plan({ godownCode: 'G1', itemType: 'yarn', itemCode: 'NOPE', qty: 1 })
    expect(plan.ok).toBe(false)
    expect(plan.error).toContain('not found')
  })

  it('pcs-transfer: PT-#### godown_transfer pair, net zero across godowns (form door ≡ service)', async () => {
    // seed a G2 pcs bucket for the order
    await db.currentStock.create({ data: { itemType: 'pcs', itemId: orderId, godownId: g2Id, pcs: 50 } })
    // form door
    const formOut = await commitDocAction('pcs-transfer', {
      header: { orderNo: ORDER, fromGodownCode: 'G2', toGodownCode: 'G1', qty: '20' },
    })
    expect(formOut.ok).toBe(true)
    expect((formOut as any).doc.docNo.startsWith('PT-')).toBe(true)
    // service door (the parity assertion: identical semantics)
    const svc = await planPcsTransfer({ orderNo: ORDER, fromGodownCode: 'G2', toGodownCode: 'G1', qty: 5 })
    expect(svc.ok).toBe(true)
    await svc.commit!()
    // pairs: out of G2, into G1, same PT- docNo per pair
    const outs = await db.stockLedger.findMany({ where: { txnType: 'godown_transfer_out', itemType: 'pcs', itemId: orderId } })
    const ins = await db.stockLedger.findMany({ where: { txnType: 'godown_transfer_in', itemType: 'pcs', itemId: orderId } })
    expect(outs.length).toBe(2)
    expect(ins.length).toBe(2)
    for (const o of outs) {
      expect(o.docNo!.startsWith('PT-')).toBe(true)
      const pair = ins.find((i) => i.docNo === o.docNo)
      expect(pair, `PT pair for ${o.docNo}`).toBeTruthy()
      expect(pair!.inPcs).toBe(o.outPcs)
    }
    // net zero across godowns
    const outTotal = outs.reduce((s, r) => s + r.outPcs, 0)
    const inTotal = ins.reduce((s, r) => s + r.inPcs, 0)
    expect(outTotal).toBe(inTotal)
    // buckets: G2 50−25=25, G1 +25
    const g2Bucket = await db.currentStock.findFirst({ where: { itemType: 'pcs', itemId: orderId, godownId: g2Id } })
    const g1Bucket = await db.currentStock.findFirst({ where: { itemType: 'pcs', itemId: orderId, godownId: g1Id } })
    expect(g2Bucket!.pcs).toBe(25)
    expect(g1Bucket!.pcs).toBe(25)
  })

  it('ready-to-cut: RTC pair — store pool −, D3 pool +, total godown stock unchanged (both doors)', async () => {
    const before = await db.currentStock.findFirst({ where: { itemType: 'fabric', itemId: fabricId, godownId: g1Id, deptId: null } })
    // form door
    const formOut = await commitDocAction('ready-to-cut', {
      header: { itemCode: FABRIC, qty: '40', orderNo: ORDER },
    })
    expect(formOut.ok).toBe(true)
    expect((formOut as any).doc.docNo.startsWith('RTC-')).toBe(true)
    // agent door (the real tool)
    const out = await agentDoor('ready_to_cut', { itemType: 'fabric', itemCode: FABRIC, qty: 10, orderNo: ORDER })
    expect((out as any).docNo.startsWith('RTC-')).toBe(true)
    // ledger pair per door
    const outs = await db.stockLedger.findMany({ where: { txnType: 'ready_to_cut_out', itemType: 'fabric', itemId: fabricId } })
    const ins = await db.stockLedger.findMany({ where: { txnType: 'ready_to_cut_in', itemType: 'fabric', itemId: fabricId } })
    expect(outs.length).toBeGreaterThanOrEqual(2)
    expect(ins.length).toBeGreaterThanOrEqual(2)
    // the IN legs carry deptId = D3 (the virtual dept on the ledger row)
    for (const i of ins) expect(i.deptId).toBe(d3Id)
    // buckets: null-dept pool down by 50; D3-keyed pool up by 50
    const storePool = await db.currentStock.findFirst({ where: { itemType: 'fabric', itemId: fabricId, godownId: g1Id, deptId: null } })
    const cutPool = await db.currentStock.findFirst({ where: { itemType: 'fabric', itemId: fabricId, godownId: g1Id, deptId: d3Id } })
    const moved = 50
    expect((storePool?.kgs ?? 0)).toBe((before?.kgs ?? 0) - moved)
    expect(cutPool!.kgs).toBe(moved)
  })
})

describe('M6 Wave D doc-parity — GRN & DC variants (SPEC-M6 §12-3)', () => {
  it('multi-process-grn: MP-#### with N lines + N process_delivery OUT rows (form door ≡ service)', async () => {
    const payload = {
      header: { partyCode: PARTY, godownCode: 'G1' },
      lines: [
        { itemType: 'yarn', itemCode: YARN, qty: '4', rate: '180' },
        { itemType: 'fabric', itemCode: FABRIC, qty: '2', rate: '280' },
      ],
    }
    const formOut = await commitDocAction('multi-process-grn', payload)
    expect(formOut.ok).toBe(true)
    expect((formOut as any).doc.grnNo.startsWith('MP-')).toBe(true)
    const grnId = (formOut as any).doc.id
    createdGrnIds.push(grnId)
    // service door
    const svc = await planMultiProcessGrn({ partyCode: PARTY, godownCode: 'G1', lines: [{ itemType: 'yarn', itemCode: YARN, qty: 1 }] })
    expect(svc.ok).toBe(true)
    const svcRes = await svc.commit!()
    createdGrnIds.push(svcRes.id)
    // rows: GRN + 3 GRNLines total + process_delivery OUT per line
    const grn = await db.gRN.findUnique({ where: { id: grnId }, include: { lines: true } })
    expect(grn!.grnType).toBe('process_return')
    expect(grn!.lines.length).toBe(2)
    expect(grn!.totalQty).toBe(6)
    const ledger = await db.stockLedger.findMany({ where: { docNo: grn!.grnNo } })
    expect(ledger.length).toBe(2)
    for (const l of ledger) {
      expect(l.txnType).toBe('process_delivery')
      expect(l.outKgs).toBeGreaterThan(0)
    }
    // empty lines rejected
    const empty = await planMultiProcessGrn({ partyCode: PARTY, lines: [] })
    expect(empty.ok).toBe(false)
  })

  it('dc-entry + process-dc through the ONE create_dc door: MDC- single / PDC- multi', async () => {
    // single-material door (MDC)
    const mdc = await agentDoor('create_dc', { partyCode: PARTY, processType: 'dyeing', itemType: 'yarn', itemCode: YARN, qty: 8, rate: 180 })
    expect((mdc as any).dcNo.startsWith('MDC-')).toBe(true)
    createdJwIds.push((mdc as any).id)
    // multi-component door (PDC) — the form door for process-dc
    const pdcForm = await commitDocAction('process-dc', {
      header: { partyCode: PARTY, processType: 'washing' },
      lines: [
        { itemType: 'yarn', itemCode: YARN, qty: '3' },
        { itemType: 'fabric', itemCode: FABRIC, qty: '5', rate: '280' },
      ],
    })
    expect(pdcForm.ok).toBe(true)
    expect((pdcForm as any).doc.dcNo.startsWith('PDC-')).toBe(true)
    createdJwIds.push((pdcForm as any).doc.id)
    // the MDC JobworkOrder row + its ONE process_delivery OUT
    const jw = await db.jobworkOrder.findUnique({ where: { id: (mdc as any).id } })
    expect(jw!.status).toBe('sent')
    expect(jw!.totalQty).toBe(8)
    const mdcLedger = await db.stockLedger.findMany({ where: { docNo: (mdc as any).dcNo } })
    expect(mdcLedger.length).toBe(1)
    expect(mdcLedger[0].txnType).toBe('process_delivery')
    expect(mdcLedger[0].outKgs).toBe(8)
    // the PDC JobworkOrder row + its TWO process_delivery OUT rows
    const pdcJw = await db.jobworkOrder.findUnique({ where: { id: (pdcForm as any).doc.id } })
    expect(pdcJw!.totalQty).toBe(8)
    const pdcLedger = await db.stockLedger.findMany({ where: { docNo: (pdcForm as any).doc.dcNo } })
    expect(pdcLedger.length).toBe(2)
    // neither door may emit the despatch DC- space (§2 row 30)
    expect((mdc as any).dcNo.startsWith('DC-')).toBe(false)
    expect((pdcForm as any).doc.dcNo.startsWith('DC-')).toBe(false)
    // create_dc with neither shape rejected by the service
    const bare = await getTool('create_dc')!.execute({ partyCode: PARTY })
    expect((bare as any).text).toContain('Provide either')
    expect((bare as any).plan).toBeUndefined()
  })

  it('dc-return: RTN-#### against the MDC, process_receipt IN per line (form door ≡ service)', async () => {
    const mdcNo = (await db.jobworkOrder.findUnique({ where: { id: createdJwIds[0] } }))!.dcNo
    const formOut = await commitDocAction('dc-return', {
      header: { partyCode: PARTY, dcNo: mdcNo, godownCode: 'G1' },
      lines: [{ itemType: 'yarn', itemCode: YARN, qty: '8', rate: '180' }],
    })
    expect(formOut.ok).toBe(true)
    expect((formOut as any).doc.grnNo.startsWith('RTN-')).toBe(true)
    createdGrnIds.push((formOut as any).doc.id)
    // rows: GRN (process_return, docNo = the DC ref) + line + process_receipt IN
    const grn = await db.gRN.findUnique({ where: { id: (formOut as any).doc.id }, include: { lines: true } })
    expect(grn!.grnType).toBe('process_return')
    expect(grn!.docNo).toBe(mdcNo)
    expect(grn!.lines.length).toBe(1)
    const ledger = await db.stockLedger.findMany({ where: { docNo: grn!.grnNo } })
    expect(ledger.length).toBe(1)
    expect(ledger[0].txnType).toBe('process_receipt')
    expect(ledger[0].inKgs).toBe(8)
    // service door reject on a bad DC ref is not a thing (any DC string is
    // bookable as a reference — legacy behaviour); a bad PARTY is rejected
    const bad = await planDcReturn({ partyCode: 'NOPE', dcNo: mdcNo, lines: [{ itemType: 'yarn', itemCode: YARN, qty: 1 }] })
    expect(bad.ok).toBe(false)
  })
})

describe('M6 Wave D doc-parity — cutting & production variants (SPEC-M6 §12-3)', () => {
  it('cutting-issue: cutting line accepted, sewing line rejected (the dept guard)', async () => {
    // sewing line L1 (dept D4) → rejected
    const bad = await planCuttingIssue({ orderNo: ORDER, lineCode: 'L1', qty: 5 })
    expect(bad.ok).toBe(false)
    expect(bad.error).toContain('Cutting department')
    // cutting line → LineIssue via the form door
    const formOut = await commitDocAction('cutting-issue', {
      header: { orderNo: ORDER, lineCode: CUT_LINE, qty: '30' },
    })
    expect(formOut.ok).toBe(true)
    expect((formOut as any).doc.issueNo.startsWith('LI-')).toBe(true)
    const li = await db.lineIssue.findUnique({ where: { id: (formOut as any).doc.id }, include: { line: true } })
    expect(li!.line.deptId).toBe(d3Id)
    expect(li!.notes).toContain('Cutting issue (rolls)')
  })

  it('cutting-production + line-output: production variant entries (D3 / D4+lineId)', async () => {
    const cut = await commitDocAction('cutting-production', {
      header: { orderNo: ORDER, prodDate: '2026-08-27', bundleNo: `M6D-B1-${TS}`, operatorCode: 'E001', qty: '60', rate: '2' },
    })
    expect(cut.ok).toBe(true)
    const cutEntry = await db.productionEntry.findUnique({ where: { id: (cut as any).doc.id } })
    expect(cutEntry!.deptId).toBe(d3Id) // the D3 default injected
    expect(cutEntry!.qty).toBe(60)
    const tally = await commitDocAction('line-output', {
      header: { orderNo: ORDER, prodDate: '2026-08-27', bundleNo: `M6D-B2-${TS}`, operatorCode: 'E001', qty: '25', rate: '2', lineId: 'L1' },
    })
    expect(tally.ok).toBe(true)
    const tallyEntry = await db.productionEntry.findUnique({ where: { id: (tally as any).doc.id } })
    expect(tallyEntry!.lineId).toBe('L1') // the tally line rides the entry
    // lineId REQUIRED by the variant schema
    const noLine = await commitDocAction('line-output', {
      header: { orderNo: ORDER, prodDate: '2026-08-27', bundleNo: `M6D-B3-${TS}`, operatorCode: 'E001', qty: '1', rate: '2' },
    })
    expect(noLine.ok).toBe(false)
    expect((noLine as any).errors.join(' ')).toContain('lineId')
  })
})

describe('M6 Wave D — manual-queue approval gates (SPEC-M6 §6/§12-3)', () => {
  it('queue action raises the row; accept_grn finds-or-creates + approves; idempotent', async () => {
    // a plain GRN fixture for the acceptance queue
    const party = await db.party.findUnique({ where: { code: PARTY } })
    const grn = await db.gRN.create({
      data: { grnNo: `M6D-ACC-${TS}`, grnType: 'purchase', partyId: party!.id, godownId: g1Id, totalQty: 7, totalValue: 700, finYear: 'FY26' },
    })
    createdGrnIds.push(grn.id)
    // 1. queue action creates the pending row (manual — nothing auto-raised)
    const q1 = await sendToAcceptanceAction('grn_acceptance', grn.id)
    expect(q1.ok).toBe(true)
    expect(q1.created).toBe(true)
    // idempotent: second call leaves it
    const q2 = await sendToAcceptanceAction('grn_acceptance', grn.id)
    expect(q2.ok).toBe(true)
    expect(q2.created).toBe(false)
    const pending = await db.approval.findFirst({ where: { entity: 'grn_acceptance', entityId: grn.id } })
    expect(pending!.status).toBe('pending')
    expect(pending!.requestedBy).toBe('queue')
    // 2. accept tool approves it
    const out = await agentDoor('accept_grn', { grnNo: grn.grnNo, comments: 'wave-d test' })
    expect((out as any).status).toBe('approved')
    // 3. idempotent: second run is text-only
    const again = await getTool('accept_grn')!.execute({ grnNo: grn.grnNo })
    expect(again.text).toContain('already approved')
    expect(again.plan).toBeUndefined()
    // unknown doc → text-only
    const nope = await getTool('accept_grn')!.execute({ grnNo: 'GRN-NOPE' })
    expect(nope.text).toContain('not found')
  })

  it('acknowledge_cutting_issue: find-or-create on the cutting issue (no pre-row)', async () => {
    const li = await db.lineIssue.findFirst({ where: { lineId: cutLineId }, orderBy: { issueDate: 'desc' } })
    expect(li).toBeTruthy()
    const out = await agentDoor('acknowledge_cutting_issue', { issueNo: li!.issueNo })
    expect((out as any).status).toBe('approved')
    const ap = await db.approval.findFirst({ where: { entity: 'cutting_ack', entityId: li!.id } })
    expect(ap!.status).toBe('approved')
    // unknown issue
    const nope = await getTool('acknowledge_cutting_issue')!.execute({ issueNo: 'LI-NOPE' })
    expect(nope.text).toContain('not found')
  })

  it('accept_jobwork_pcs: find-or-create on a received jobwork DC (the GAN queue; M39: lines-bearing DC — stock posts)', async () => {
    const party = await db.party.findUnique({ where: { code: PARTY } })
    // M39 (JWL-05): the GAN gate posts stock per line — a header-only row has
    // nothing to post, so the fixture carries a material line now
    const jw = await db.jobworkOrder.create({
      data: {
        dcNo: `M6D-JW-${TS}`, jobworkerId: party!.id, processType: 'washing', totalQty: 10, status: 'received', receivedDate: new Date(), receivedQty: 10,
        lines: { create: [{ itemType: 'yarn', itemId: yarnId, itemCode: YARN, uom: 'kgs', qty: 10, rate: 10, receivedQty: 10 }] },
      },
    })
    createdJwIds.push(jw.id)
    const out = await agentDoor('accept_jobwork_pcs', { dcNo: jw.dcNo })
    expect((out as any).status).toBe('approved')
    expect((out as any).ref).toBe(jw.dcNo)
    expect((out as any).into).toBe('G2') // M39 — the real stock gate
    const ap = await db.approval.findFirst({ where: { entity: 'pcs_acceptance', entityId: jw.id } })
    expect(ap!.status).toBe('approved')
    // JWL-05: the acceptance posted the received qty INTO G2
    const g2Row = await db.stockLedger.findFirst({ where: { docNo: jw.dcNo, godownId: g2Id, txnType: 'process_receipt' } })
    expect(g2Row?.inKgs).toBe(10)
    const jwAfter = await db.jobworkOrder.findUnique({ where: { id: jw.id } })
    expect(jwAfter?.status).toBe('accepted')
  })

  it('approve_lot: find-or-create on a dye-dept fabric GRN (the lot queue)', async () => {
    const party = await db.party.findUnique({ where: { code: PARTY } })
    const d2 = await db.department.findUnique({ where: { code: 'D2' } })
    const grn = await db.gRN.create({
      data: {
        grnNo: `M6D-LOT-${TS}`, grnType: 'purchase', partyId: party!.id, godownId: g1Id, deptId: d2!.id,
        totalQty: 20, totalValue: 5600, finYear: 'FY26',
        lines: { create: [{ itemType: 'fabric', itemId: fabricId, qty: 20, rate: 280, amount: 5600 }] },
      },
    })
    createdGrnIds.push(grn.id)
    const out = await agentDoor('approve_lot', { grnNo: grn.grnNo })
    expect((out as any).status).toBe('approved')
    const ap = await db.approval.findFirst({ where: { entity: 'lot', entityId: grn.id } })
    expect(ap!.status).toBe('approved')
  })

  afterAll(async () => {
    const sw = (p: Promise<unknown>) => p.catch(() => {})
    // scoped cleanup: this suite's approvals, docs, ledger rows, buckets
    const docNos = [`M6D-ACC-${TS}`, `M6D-LOT-${TS}`, `M6D-JW-${TS}`]
    if (createdGrnIds.length) {
      await sw(db.approval.deleteMany({ where: { entityId: { in: createdGrnIds } } }))
      await sw(db.gRNLine.deleteMany({ where: { grnId: { in: createdGrnIds } } }))
      await sw(db.gRN.deleteMany({ where: { id: { in: createdGrnIds } } }))
    }
    if (createdJwIds.length) {
      await sw(db.approval.deleteMany({ where: { entityId: { in: createdJwIds } } }))
      await sw(db.jobworkLine.deleteMany({ where: { jobworkOrderId: { in: createdJwIds } } }))
      await sw(db.jobworkOrder.deleteMany({ where: { id: { in: createdJwIds } } }))
      // M39: the GAN legs (docNo = the JW dcNo) + the G2 bucket delta
      // (the MDC-/PDC- ledger rows are covered by the prefixes sweep below)
      await sw(db.stockLedger.deleteMany({ where: { docNo: `M6D-JW-${TS}` } }))
      await sw(db.currentStock.deleteMany({ where: { itemId: yarnId, godownId: g2Id } }))
    }
    // the variant doc-number spaces used by this run
    const prefixes = ['OPN-', 'PT-', 'RTC-', 'MP-', 'MDC-', 'PDC-', 'RTN-', 'LI-']
    for (const pfx of prefixes) {
      const rows = await db.stockLedger.findMany({ where: { docNo: { startsWith: pfx } }, select: { docNo: true, createdAt: true } })
      const recent = rows.filter((r) => r.createdAt.getTime() > Date.now() - 15 * 60_000).map((r) => r.docNo)
      if (recent.length) await sw(db.stockLedger.deleteMany({ where: { docNo: { in: recent } } }))
    }
    // cutting-ack approvals + this suite's line issues
    await sw(db.approval.deleteMany({ where: { entity: { in: ['grn_acceptance', 'cutting_ack', 'pcs_acceptance', 'lot'] }, comments: 'wave-d test' } }))
    await sw(db.approval.deleteMany({ where: { entity: 'cutting_ack', entityId: { in: (await db.lineIssue.findMany({ where: { lineId: cutLineId }, select: { id: true } })).map((l) => l.id) } } }))
    await sw(db.lineIssue.deleteMany({ where: { lineId: cutLineId } }))
    await sw(db.line.deleteMany({ where: { id: cutLineId } }))
    // this suite's production entries + pcs stock
    await sw(db.productionEntry.deleteMany({ where: { orderId } }))
    await sw(db.stockLedger.deleteMany({ where: { orderId } }))
    await sw(db.currentStock.deleteMany({ where: { itemType: 'pcs', itemId: orderId } }))
    // restore the yarn/fabric buckets this suite touched (delete the suite-created rows)
    await sw(db.currentStock.deleteMany({ where: { itemType: 'fabric', itemId: fabricId, deptId: d3Id } }))
    await sw(db.order.deleteMany({ where: { id: orderId } }))
    // stock_adjustment_add rows for the yarn bucket: remove the OPN additions' effect is
    // not reversible via ledger (they're real rows) — the rows are deleted above; the
    // CurrentStock buckets keep the deltas. Snapshot-restore them to pre-suite values.
    docNos.length // (keep lint quiet)
  })
})
