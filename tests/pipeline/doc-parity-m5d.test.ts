/**
 * SPEC-M5 §12-1 — M5 Wave D doc parity (the P2 guarantee). The new write
 * ops of Wave D must produce IDENTICAL rows through both doors:
 *   - create_sample         (agent tool vs planSample service)
 *   - create_gate_entry     (agent tool vs planGateEntry service, gateType in)
 *   - create_gate_pass      (agent tool vs planGateEntry service, gateType out)
 *   - create_packing_list   (agent tool vs planPackingList service)
 *   - create_lab_test       (agent tool vs planLabTest service)
 *   - create_expense        (agent tool vs planExpense service)
 *   - split_roll            (agent tool vs planRollSplit service — RSP pair)
 *   - allot_contract        (agent tool vs planContractAllotment service)
 *   - create_allotment      (agent tool vs planProgramAllotment service)
 *   - create_production_bill(agent tool vs planProductionBill service)
 * Plus §12-5 math pins: roll-split NET-ZERO lot mtrs; packing-list Σpcs =
 * despatch recon variance; production bill = Σ ProductionEntry.amount for
 * the period; the gate variant configs' gateType injection via the form door.
 * (create_shift/update_shift ride the master-parity loop — 25 configs.)
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getTool } from '@/lib/agent/tools'
import { db } from '@/lib/db'
import type { DocPlanResult } from '@/lib/erp/posting/types'
import { planSample } from '@/lib/erp/posting/sample'
import { planGateEntry } from '@/lib/erp/posting/gate'
import { planPackingList } from '@/lib/erp/posting/packing-list'
import { planLabTest } from '@/lib/erp/posting/lab-test'
import { planExpense } from '@/lib/erp/posting/expense'
import { planRollSplit } from '@/lib/erp/posting/roll-split'
import { planContractAllotment } from '@/lib/erp/posting/contract-allotment'
import { planProgramAllotment } from '@/lib/erp/posting/program-allotment'
import { planProductionBill } from '@/lib/erp/posting/production-bill'
import { commitDocAction } from '@/lib/erp/doc-actions'

const TS = Date.now()
const BUYER = 'B001'
const PARTY = 'CUS001'
const OPERATOR = 'E001'
const FABRIC = 'F-SJ30'

const styNo = `M5D-S-${TS}`
const ordNo = `M5D-O-${TS}`
const lotA = `M5D-LOT-A-${TS}`   // roll-split source lot
const lotB = `M5D-LOT-B-${TS}`   // explicit newLotNo target
// deterministic future window for the production bill (seed data pollutes
// the default last-30-days — STATE ground truth: 100 entries sit there)
const BILL_FROM = '2027-06-01'
const BILL_TO = '2027-06-30'

async function agentDoor(toolName: string, args: Record<string, unknown>) {
  const tool = getTool(toolName)
  if (!tool) throw new Error(`tool ${toolName} not found`)
  const res = await tool.execute(args)
  if (!res.plan || !res.commit) throw new Error(`${toolName} agent door returned no plan: ${res.text}`)
  return res.commit()
}

async function formDoor(plan: (input: any) => Promise<DocPlanResult>, args: Record<string, unknown>) {
  const p = await plan(args)
  if (!p.ok) throw new Error(`form door plan failed: ${p.error}`)
  return p.commit()
}

describe('M5 Wave D doc parity (SPEC-M5 §12-1, §12-5)', () => {
  let orderId = ''
  let styleId = ''
  let fabricId = ''
  let g1Id = ''
  let d4Id = ''
  let partyId = ''
  let despatchId = ''

  const sampleIds: string[] = []
  const gateIds: string[] = []
  const packIds: string[] = []
  const labIds: string[] = []
  const expIds: string[] = []
  const jwIds: string[] = []
  const journalIds: string[] = []
  const prodIds: string[] = []
  const newLotIds: string[] = []
  const pbfIds: string[] = []
  let fixtureLotId = ''
  let sourceBucketId = ''

  beforeAll(async () => {
    const buyer = await db.buyer.findUnique({ where: { code: BUYER } })
    const party = await db.party.findUnique({ where: { code: PARTY } })
    const g1 = await db.godown.findUnique({ where: { code: 'G1' } })
    const d4 = await db.department.findUnique({ where: { code: 'D4' } })
    const fabric = await db.fabric.findUnique({ where: { code: FABRIC } })
    partyId = party!.id
    g1Id = g1!.id
    d4Id = d4!.id
    fabricId = fabric!.id
    const style = await db.style.create({ data: { styleNo: styNo, description: `M5D style ${TS}` } })
    styleId = style.id
    const order = await db.order.create({
      data: {
        orderNo: ordNo, buyerId: buyer!.id, styleId: style.id,
        orderDate: new Date(), deliveryDate: new Date('2027-03-31'),
        finYear: '26-27', status: 'open', totalPcs: 1000, totalValue: 50000,
      },
    })
    orderId = order.id
    // roll-split source lot + a 500-mtr lot-keyed bucket at G1
    const lot = await db.lot.create({ data: { lotNo: lotA } })
    fixtureLotId = lot.id
    const bucket = await db.currentStock.create({
      data: { itemType: 'fabric', itemId: fabricId, godownId: g1Id, lotId: lot.id, mtrs: 500, rate: 280 },
    })
    sourceBucketId = bucket.id
    // despatch for the packing-list W6 recon
    const despatch = await db.pcsDespatch.create({
      data: { dcNo: `M5D-DC-${TS}`, orderId, buyerId: buyer!.id, despatchDate: new Date(), finYear: '26-27', totalPcs: 150, status: 'despatched' },
    })
    despatchId = despatch.id
    // production entries inside the deterministic bill window (2027-06)
    const e1 = await db.productionEntry.create({
      data: { orderId, deptId: d4Id, prodDate: new Date('2027-06-05'), bundleNo: `M5D-P1-${TS}`, qty: 100, rate: 4, amount: 400 },
    })
    const e2 = await db.productionEntry.create({
      data: { orderId, deptId: d4Id, prodDate: new Date('2027-06-10'), bundleNo: `M5D-P2-${TS}`, qty: 50, rate: 4, amount: 200 },
    })
    prodIds.push(e1.id, e2.id)
  })

  it('1. create_sample — both doors, buyer/style resolved, SMP-#### assigned', async () => {
    const base = { buyerCode: BUYER, styleCode: styNo, sampleType: 'proto', qty: 5, enquiryRef: ordNo, remarks: 'M5D parity' }
    const a = await agentDoor('create_sample', { ...base, sampleNo: `M5D-SMP-A-${TS}` })
    const b = await formDoor(planSample, { ...base, sampleNo: `M5D-SMP-B-${TS}` })
    sampleIds.push(a.id, b.id)
    const [rA, rB] = await Promise.all([
      db.sample.findUnique({ where: { id: a.id } }),
      db.sample.findUnique({ where: { id: b.id } }),
    ])
    expect(rA!.sampleNo).toBe(`M5D-SMP-A-${TS}`)
    expect(rB!.sampleNo).toBe(`M5D-SMP-B-${TS}`)
    for (const r of [rA, rB]) {
      expect(r!.sampleType).toBe('proto')
      expect(r!.qty).toBe(5)
      expect(r!.status).toBe('submitted')
      expect(r!.buyerId).toBeTruthy()
      expect(r!.styleId).toBe(styleId)
      expect(r!.enquiryRef).toBe(ordNo)
    }
    // agent-door auto-number when omitted
    const c = await agentDoor('create_sample', { sampleType: 'counter', qty: 2 })
    sampleIds.push(c.id)
    expect(c.sampleNo).toMatch(/^SMP-\d{4}$/)
  })

  it('2. create_gate_entry / create_gate_pass — both doors, GE/GP prefixes + gateType pinned', async () => {
    const base = { partyCode: PARTY, vehicleNo: 'TN33-9001', refDocNo: ordNo, purpose: 'M5D gate parity' }
    const a = await agentDoor('create_gate_entry', base)
    const b = await formDoor(planGateEntry, { ...base, gateType: 'in' })
    gateIds.push(a.id, b.id)
    const [rA, rB] = await Promise.all([
      db.gateEntry.findUnique({ where: { id: a.id } }),
      db.gateEntry.findUnique({ where: { id: b.id } }),
    ])
    expect(rA!.gateType).toBe('in')
    expect(rB!.gateType).toBe('in')
    expect(rA!.entryNo).toMatch(/^GE-\d{4}$/)
    expect(rB!.entryNo).toMatch(/^GE-\d{4}$/)
    expect(rA!.partyId).toBe(partyId)
    expect(rB!.vehicleNo).toBe('TN33-9001')

    const c = await agentDoor('create_gate_pass', { ...base, vehicleNo: 'TN33-9002' })
    const d = await formDoor(planGateEntry, { ...base, gateType: 'out', vehicleNo: 'TN33-9003' })
    gateIds.push(c.id, d.id)
    const [rC, rD] = await Promise.all([
      db.gateEntry.findUnique({ where: { id: c.id } }),
      db.gateEntry.findUnique({ where: { id: d.id } }),
    ])
    expect(rC!.gateType).toBe('out')
    expect(rD!.gateType).toBe('out')
    expect(rC!.entryNo).toMatch(/^GP-\d{4}$/)
    expect(rD!.entryNo).toMatch(/^GP-\d{4}$/)
  })

  it('3. create_packing_list — both doors, totals default to line sums; Σpcs feeds the W6 recon', async () => {
    const lines = [
      { cartonNo: 'CTN-01', styleNo: styNo, colourName: 'Red', sizeName: 'M', qty: 80, netKgs: 12.5 },
      { cartonNo: 'CTN-02', styleNo: styNo, colourName: 'Blue', sizeName: 'L', qty: 70, netKgs: 11.5 },
    ]
    const base = { despatchDcNo: `M5D-DC-${TS}`, orderNo: ordNo, buyerCode: BUYER, lines }
    const a = await agentDoor('create_packing_list', { ...base, packNo: `M5D-PKL-A-${TS}` })
    const b = await formDoor(planPackingList, { ...base, packNo: `M5D-PKL-B-${TS}` })
    packIds.push(a.id, b.id)
    const [rA, rB] = await Promise.all([
      db.packingList.findUnique({ where: { id: a.id }, include: { lines: true } }),
      db.packingList.findUnique({ where: { id: b.id }, include: { lines: true } }),
    ])
    for (const r of [rA, rB]) {
      expect(r!.totalPcs).toBe(150) // Σ line qty (header omitted)
      expect(r!.totalCartons).toBe(2) // distinct cartonNo
      expect(r!.netKgs).toBeCloseTo(24, 5)
      expect(r!.status).toBe('draft')
      expect(r!.despatchId).toBe(despatchId)
      expect(r!.lines).toHaveLength(2)
      expect(r!.lines[0].qty).toBe(80)
    }
    // §12-5 math: Σ carton pcs vs the despatch's totalPcs → variance 0
    const packed = rA!.lines.reduce((s, l) => s + l.qty, 0)
    const despatch = await db.pcsDespatch.findUnique({ where: { id: despatchId } })
    expect(packed - (despatch!.totalPcs ?? 0)).toBe(0)
  })

  it('4. create_lab_test — both doors, item resolved by kind (fabric F-SJ30)', async () => {
    const base = { itemType: 'fabric', itemCode: FABRIC, testType: 'gsm', result: 'pass', values: '{"gsm": 182}', remarks: 'M5D lab parity' }
    const a = await agentDoor('create_lab_test', { ...base, testNo: `M5D-LT-A-${TS}` })
    const b = await formDoor(planLabTest, base)
    labIds.push(a.id, b.id)
    const [rA, rB] = await Promise.all([
      db.labTest.findUnique({ where: { id: a.id } }),
      db.labTest.findUnique({ where: { id: b.id } }),
    ])
    for (const r of [rA, rB]) {
      expect(r!.itemType).toBe('fabric')
      expect(r!.itemId).toBe(fabricId)
      expect(r!.testType).toBe('gsm')
      expect(r!.result).toBe('pass')
    }
    expect(rA!.testNo).toBe(`M5D-LT-A-${TS}`)
    expect(rB!.testNo).toMatch(/^LT-\d{4}$/)
    // pcs alias resolves the Style master (the form's typed picker sends 'style')
    const c = await agentDoor('create_lab_test', { itemType: 'style', itemCode: styNo, testType: 'composition', result: 'conditional' })
    labIds.push(c.id)
    const rC = await db.labTest.findUnique({ where: { id: c.id } })
    expect(rC!.itemId).toBe(styleId)
  })

  it('5. create_expense — both doors; stylewise requires the order', async () => {
    const base = { category: 'stylewise', orderNo: ordNo, partyCode: PARTY, amount: 1250, narration: 'M5D expense parity' }
    const a = await agentDoor('create_expense', { ...base, expNo: `M5D-EXP-A-${TS}` })
    const b = await formDoor(planExpense, base)
    expIds.push(a.id, b.id)
    const [rA, rB] = await Promise.all([
      db.expense.findUnique({ where: { id: a.id } }),
      db.expense.findUnique({ where: { id: b.id } }),
    ])
    for (const r of [rA, rB]) {
      expect(r!.category).toBe('stylewise')
      expect(r!.orderId).toBe(orderId)
      expect(r!.partyId).toBe(partyId)
      expect(r!.amount).toBe(1250)
      expect(r!.status).toBe('recorded')
    }
    expect(rB!.expNo).toMatch(/^EXP-\d{4}$/)
    // stylewise without orderNo → structured error
    const bad = await planExpense({ category: 'stylewise', amount: 10 })
    expect(bad.ok).toBe(false)
    expect(bad.error).toContain('orderNo')
  })

  it('6. split_roll — both doors; RSP-#### pair; NET-ZERO lot mtrs (§12-5)', async () => {
    // agent door: auto child lot <source>-R1
    const a = await agentDoor('split_roll', { sourceLotNo: lotA, itemCode: FABRIC, godownCode: 'G1', mtrs: 200, notes: 'M5D split A' })
    // form door: explicit newLotNo
    const b = await formDoor(planRollSplit, { sourceLotNo: lotA, itemCode: FABRIC, godownCode: 'G1', mtrs: 100, newLotNo: lotB, notes: 'M5D split B' })
    newLotIds.push(a.id, b.id)
    expect(a.docNo).toMatch(/^RSP-\d{4}$/)
    expect(b.docNo).toMatch(/^RSP-\d{4}$/)
    expect(a.docNo).not.toBe(b.docNo)
    expect(a.newLotNo).toBe(`${lotA}-R1`)
    expect(b.newLotNo).toBe(lotB)

    // the ledger pair shares the docNo; in/out mtrs mirror
    for (const docNo of [a.docNo, b.docNo]) {
      const rows = await db.stockLedger.findMany({ where: { docNo }, orderBy: { txnType: 'asc' } })
      expect(rows).toHaveLength(2)
      const out = rows.find((r) => r.txnType === 'transfer_out')!
      const inn = rows.find((r) => r.txnType === 'transfer_in')!
      expect(out.lotId).toBe(fixtureLotId)
      expect(out.outMtrs).toBe(inn.inMtrs)
    }

    // §12-5 NET-ZERO: source lost 300, new lots hold 300
    const srcBucket = await db.currentStock.findUnique({ where: { id: sourceBucketId } })
    expect(srcBucket!.mtrs).toBe(200) // 500 - 200 - 100
    const newBuckets = await db.currentStock.findMany({ where: { lotId: { in: newLotIds }, itemType: 'fabric' } })
    expect(newBuckets.reduce((s, r) => s + r.mtrs, 0)).toBe(300)
    // insufficient mtrs → structured error
    const bad = await planRollSplit({ sourceLotNo: lotA, itemCode: FABRIC, godownCode: 'G1', mtrs: 9999 })
    expect(bad.ok).toBe(false)
    expect(bad.error).toContain('mtrs')
  })

  it('7. allot_contract — both doors; AL-#### + status allotted (pre-DC record)', async () => {
    const base = { jobworkerCode: PARTY, processType: 'washing', totalQty: 250, totalValue: 12000, orderNo: ordNo, notes: 'M5D allot parity' }
    const a = await agentDoor('allot_contract', base)
    const b = await formDoor(planContractAllotment, base)
    jwIds.push(a.id, b.id)
    const [rA, rB] = await Promise.all([
      db.jobworkOrder.findUnique({ where: { id: a.id } }),
      db.jobworkOrder.findUnique({ where: { id: b.id } }),
    ])
    for (const r of [rA, rB]) {
      expect(r!.dcNo).toMatch(/^AL-\d{4}$/)
      expect(r!.status).toBe('allotted')
      expect(r!.jobworkerId).toBe(partyId)
      expect(r!.orderId).toBe(orderId)
      expect(r!.totalQty).toBe(250)
    }
    // the real JW DC still works alongside (AL- never collides with JW-)
    const c = await agentDoor('create_jobwork_order', { jobworkerCode: PARTY, processType: 'dyeing', totalQty: 10 })
    jwIds.push(c.id)
    expect(c.dcNo).toMatch(/^JW-\d{4}$/)
  })

  it('8. create_allotment — both doors; ProgBalanceFabric row created with reqKgs/reqMtrs', async () => {
    const base = { orderNo: ordNo, deptCode: 'D4', itemType: 'fabric', itemCode: FABRIC, kgs: 300, mtrs: 450 }
    const a = await agentDoor('create_allotment', base)
    pbfIds.push(a.id)
    const row = await db.progBalanceFabric.findUnique({ where: { id: a.id } })
    expect(row!.reqKgs).toBe(300)
    expect(row!.reqMtrs).toBe(450)
    expect(row!.orderId).toBe(orderId)
    expect(row!.deptId).toBe(d4Id)
    expect(row!.fabricId).toBe(fabricId)
    // form door BUMPS the existing row (find-first-or-create pattern) — kgs
    // only; mtrs intentionally absent so reqMtrs must stay 450
    const b = await formDoor(planProgramAllotment, { orderNo: ordNo, deptCode: 'D4', itemType: 'fabric', itemCode: FABRIC, kgs: 100 })
    pbfIds.push(b.id)
    expect(b.id).toBe(a.id) // same row
    const bumped = await db.progBalanceFabric.findUnique({ where: { id: a.id } })
    expect(bumped!.reqKgs).toBe(400)
    expect(bumped!.reqMtrs).toBe(450) // mtrs not re-bumped
    // yarn door → ProgBalanceYarn
    const c = await agentDoor('create_allotment', { orderNo: ordNo, deptCode: 'D4', itemType: 'yarn', itemCode: 'Y-30COT', kgs: 50 })
    await db.progBalanceYarn.deleteMany({ where: { id: c.id } })
    // accessory → structured error (no ProgBalance table)
    const bad = await planProgramAllotment({ orderNo: ordNo, deptCode: 'D4', itemType: 'accessory', itemCode: 'A-BTN', kgs: 5 })
    expect(bad.ok).toBe(false)
    expect(bad.error).toContain('yarn | fabric')
  })

  it('9. create_production_bill — both doors; Journal Dr Production Wages = Σ period amounts (§12-5)', async () => {
    const base = { from: BILL_FROM, to: BILL_TO }
    const a = await agentDoor('create_production_bill', base)
    const b = await formDoor(planProductionBill, base)
    journalIds.push(a.id, b.id)
    const [rA, rB] = await Promise.all([
      db.journal.findUnique({ where: { id: a.id } }),
      db.journal.findUnique({ where: { id: b.id } }),
    ])
    for (const r of [rA, rB]) {
      expect(r!.voucherType).toBe('journal')
      expect(r!.debitAccount).toBe('Production Wages')
      expect(r!.creditAccount).toBe('Wage Payable')
      expect(r!.amount).toBe(600) // 400 + 200 from the two fixture entries
      expect(r!.narration).toContain('2 entries')
      expect(r!.narration).toContain('150 pcs')
    }
    // operator granularity: one entry (400) → its own bill
    const c = await agentDoor('create_production_bill', { from: BILL_FROM, to: BILL_TO, deptCode: 'D4' })
    journalIds.push(c.id)
    const rC = await db.journal.findUnique({ where: { id: c.id } })
    expect(rC!.amount).toBe(600) // both fixture entries are D4
    // empty period → structured error
    const bad = await planProductionBill({ from: '2030-01-01', to: '2030-01-31' })
    expect(bad.ok).toBe(false)
    expect(bad.error).toContain('No production entries')
  })

  it('10. form door: gate variant configs inject gateType (commitDocAction path)', async () => {
    // gate-entry config pins gateType=in; gate-pass pins out — the §4 rule-2
    // injection runs through the generic form action (schema + coerce + plan)
    const a = await commitDocAction('gate-entry', {
      partyCode: PARTY, vehicleNo: 'TN33-9100', purpose: 'M5D form-door entry',
    })
    expect(a.ok).toBe(true)
    // @ts-expect-error doc shape
    gateIds.push(a.doc.id)
    // @ts-expect-error doc shape
    const rA = await db.gateEntry.findUnique({ where: { id: a.doc.id } })
    expect(rA!.gateType).toBe('in')
    expect(rA!.entryNo).toMatch(/^GE-\d{4}$/)

    const b = await commitDocAction('gate-pass', {
      partyCode: PARTY, vehicleNo: 'TN33-9200', purpose: 'M5D form-door pass',
    })
    expect(b.ok).toBe(true)
    // @ts-expect-error doc shape
    gateIds.push(b.doc.id)
    // @ts-expect-error doc shape
    const rB = await db.gateEntry.findUnique({ where: { id: b.doc.id } })
    expect(rB!.gateType).toBe('out')
    expect(rB!.entryNo).toMatch(/^GP-\d{4}$/)
  })

  afterAll(async () => {
    const sw = (p: Promise<unknown>) => p.catch(() => {})
    await sw(db.journal.deleteMany({ where: { id: { in: journalIds } } }))
    await sw(db.progBalanceFabric.deleteMany({ where: { id: { in: pbfIds } } }))
    await sw(db.jobworkOrder.deleteMany({ where: { id: { in: jwIds } } }))
    // roll-split side effects: ledger pair + new-lot buckets + the new lots
    await sw(db.stockLedger.deleteMany({ where: { docNo: { startsWith: 'RSP-' }, lotId: { in: [fixtureLotId, ...newLotIds] } } }))
    await sw(db.currentStock.deleteMany({ where: { lotId: { in: [fixtureLotId, ...newLotIds] } } }))
    await sw(db.lot.deleteMany({ where: { id: { in: [fixtureLotId, ...newLotIds] } } }))
    await sw(db.expense.deleteMany({ where: { id: { in: expIds } } }))
    await sw(db.labTest.deleteMany({ where: { id: { in: labIds } } }))
    for (const pid of packIds) {
      await sw(db.packingListLine.deleteMany({ where: { packingListId: pid } }))
      await sw(db.packingList.deleteMany({ where: { id: pid } }))
    }
    await sw(db.gateEntry.deleteMany({ where: { id: { in: gateIds } } }))
    await sw(db.sample.deleteMany({ where: { id: { in: sampleIds } } }))
    await sw(db.productionEntry.deleteMany({ where: { id: { in: prodIds } } }))
    await sw(db.pcsDespatchLine.deleteMany({ where: { pcsDespatchId: despatchId } }))
    await sw(db.pcsDespatch.deleteMany({ where: { id: despatchId } }))
    await sw(db.order.deleteMany({ where: { id: orderId } }))
    await sw(db.style.deleteMany({ where: { id: styleId } }))
  })
})
