/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * M5 Wave D route-smoke fixtures (idempotent). Creates one row per new
 * family with FIXED doc numbers so the smoke's content checks always find
 * data, and prints row ids as KEY=value lines for the bash smoke to pick
 * up (view-route checks). Uses the SAME posting services as both doors
 * (ADR-001) — no raw db writes except the roll-split source bucket.
 */
import { db } from '../src/lib/db'
import { planSample } from '../src/lib/erp/posting/sample'
import { planGateEntry } from '../src/lib/erp/posting/gate'
import { planPackingList } from '../src/lib/erp/posting/packing-list'
import { planLabTest } from '../src/lib/erp/posting/lab-test'
import { planExpense } from '../src/lib/erp/posting/expense'
import { planRollSplit } from '../src/lib/erp/posting/roll-split'
import { planContractAllotment } from '../src/lib/erp/posting/contract-allotment'
import { planProductionBill } from '../src/lib/erp/posting/production-bill'

const BUYER = 'B001'
const PARTY = 'CUS001'
const FABRIC = 'F-SJ30'
const ordNo = 'SO-1001' // seed order

async function ensurePlan(p: Promise<any>) {
  const r = await p
  if (!r.ok) throw new Error(r.error)
  return r.commit()
}

async function main() {
  const buyer = await db.buyer.findUnique({ where: { code: BUYER } })
  const party = await db.party.findUnique({ where: { code: PARTY } })
  const order = await db.order.findUnique({ where: { orderNo: ordNo } })
  if (!buyer || !party || !order) throw new Error('seed masters missing (run scripts/seed.ts first)')

  // 1. sample (fixed no → idempotent)
  let sample = await db.sample.findUnique({ where: { sampleNo: 'SMP-M5D-1' } })
  if (!sample) {
    await ensurePlan(planSample({ sampleNo: 'SMP-M5D-1', buyerCode: BUYER, sampleType: 'proto', qty: 3, enquiryRef: ordNo, remarks: 'route-smoke fixture' }))
    sample = (await db.sample.findUnique({ where: { sampleNo: 'SMP-M5D-1' } }))!
  }
  console.log(`SAMPLE_ID=${sample.id}`)

  // 2. gate entry + pass
  for (const [no, gateType] of [['GE-M5D-1', 'in'], ['GP-M5D-1', 'out']] as const) {
    let gate = await db.gateEntry.findUnique({ where: { entryNo: no } })
    if (!gate) {
      await ensurePlan(planGateEntry({ entryNo: no, gateType, partyCode: PARTY, vehicleNo: 'TN33-M5D', refDocNo: ordNo, purpose: 'route-smoke fixture' }))
      gate = (await db.gateEntry.findUnique({ where: { entryNo: no } }))!
    }
    if (gateType === 'in') console.log(`GATE_ID=${gate.id}`)
    else console.log(`PASS_ID=${gate.id}`)
  }

  // 3. packing list + its despatch (fixed nos)
  let despatch = await db.pcsDespatch.findUnique({ where: { dcNo: 'DC-M5D-1' } })
  if (!despatch) {
    despatch = await db.pcsDespatch.create({
      data: { dcNo: 'DC-M5D-1', orderId: order.id, buyerId: buyer.id, despatchDate: new Date(), finYear: '26-27', totalPcs: 150, status: 'despatched' },
    })
  }
  let pack = await db.packingList.findUnique({ where: { packNo: 'PKL-M5D-1' } })
  if (!pack) {
    await ensurePlan(planPackingList({
      packNo: 'PKL-M5D-1', despatchDcNo: 'DC-M5D-1', orderNo: ordNo, buyerCode: BUYER,
      lines: [
        { cartonNo: 'CTN-01', styleNo: 'S-1001', colourName: 'Red', sizeName: 'M', qty: 80, netKgs: 12.5 },
        { cartonNo: 'CTN-02', styleNo: 'S-1001', colourName: 'Blue', sizeName: 'L', qty: 70, netKgs: 11.5 },
      ],
      notes: 'route-smoke fixture',
    }))
    pack = (await db.packingList.findUnique({ where: { packNo: 'PKL-M5D-1' } }))!
  }
  console.log(`PACK_ID=${pack.id}`)

  // 4. lab test
  let lab = await db.labTest.findUnique({ where: { testNo: 'LT-M5D-1' } })
  if (!lab) {
    await ensurePlan(planLabTest({ testNo: 'LT-M5D-1', itemType: 'fabric', itemCode: FABRIC, testType: 'gsm', result: 'pass', values: '{"gsm": 182}', remarks: 'route-smoke fixture' }))
    lab = (await db.labTest.findUnique({ where: { testNo: 'LT-M5D-1' } }))!
  }
  console.log(`LAB_ID=${lab.id}`)

  // 5. expense
  let expense = await db.expense.findUnique({ where: { expNo: 'EXP-M5D-1' } })
  if (!expense) {
    await ensurePlan(planExpense({ expNo: 'EXP-M5D-1', category: 'general', amount: 500, narration: 'route-smoke fixture' }))
    expense = (await db.expense.findUnique({ where: { expNo: 'EXP-M5D-1' } }))!
  }
  console.log(`EXPENSE_ID=${expense.id}`)

  // 6. roll split — source lot + bucket, then one split
  let lot = await db.lot.findUnique({ where: { lotNo: 'M5D-SMOKE-LOT' } })
  if (!lot) lot = await db.lot.create({ data: { lotNo: 'M5D-SMOKE-LOT' } })
  const fabric = await db.fabric.findUnique({ where: { code: FABRIC } })!
  const g1 = await db.godown.findUnique({ where: { code: 'G1' } })!
  let bucket = await db.currentStock.findFirst({ where: { itemType: 'fabric', itemId: fabric.id, godownId: g1.id, lotId: lot.id } })
  if (!bucket) {
    bucket = await db.currentStock.create({ data: { itemType: 'fabric', itemId: fabric.id, godownId: g1.id, lotId: lot.id, mtrs: 500, rate: 280 } })
  } else if (bucket.mtrs < 500) {
    await db.currentStock.update({ where: { id: bucket.id }, data: { mtrs: 500 } })
  }
  const rsp = await db.stockLedger.findFirst({ where: { docNo: 'RSP-M5D-1' } })
  if (!rsp) {
    await ensurePlan(planRollSplit({ docNo: 'RSP-M5D-1', sourceLotNo: 'M5D-SMOKE-LOT', itemCode: FABRIC, godownCode: 'G1', mtrs: 100, notes: 'route-smoke fixture' }))
  }

  // 7. contract allotment
  let allot = await db.jobworkOrder.findUnique({ where: { dcNo: 'AL-M5D-1' } })
  if (!allot) {
    await ensurePlan(planContractAllotment({ jobworkerCode: PARTY, processType: 'washing', totalQty: 50, orderNo: ordNo, notes: 'route-smoke fixture' }))
    allot = (await db.jobworkOrder.findUnique({ where: { dcNo: 'AL-M5D-1' } }))!
  }
  console.log(`ALLOT_ID=${allot.id}`)

  // 8. shift master (upsert by code)
  await db.shift.upsert({
    where: { code: 'GEN' },
    update: {},
    create: { code: 'GEN', name: 'General Shift', fromTime: '06:00', toTime: '14:00', hours: 8 },
  })

  // 9. production bill — deterministic future window so seeded entries can't
  // pollute the amount (STATE ground truth: ~100 entries sit in the last 30d)
  const bill = await db.journal.findFirst({ where: { narration: { contains: 'route-smoke production bill' } } })
  if (!bill) {
    const e = await db.productionEntry.create({
      data: { orderId: order.id, deptId: (await db.department.findUnique({ where: { code: 'D4' } }))!.id, prodDate: new Date('2027-07-05'), bundleNo: 'M5D-SMOKE-P1', qty: 25, rate: 4, amount: 100 },
    })
    await ensurePlan(planProductionBill({ from: '2027-07-01', to: '2027-07-31', narration: 'route-smoke production bill (1 entries · 25 pcs)' }))
    await db.productionEntry.delete({ where: { id: e.id } }).catch(() => {})
  }

  console.log('M5D smoke fixtures ready (idempotent)')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
