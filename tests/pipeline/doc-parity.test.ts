/**
 * Document form↔agent parity — SPEC-M3 §13 (the P2 guarantee at transaction
 * scale). For each of the 18 ledger/doc ops (3 cancels + create_sizes excluded
 * per spec): the agent door (tool execute → plan → commit) and the form door
 * (posting service plan → commit — exactly what the form server action calls in
 * Wave B) must produce IDENTICAL doc rows and StockLedger effects.
 *
 * Variant A runs every op through the AGENT tools; variant B runs the same ops
 * through the SERVICES ONLY (the form-door industry-chain companion — proves
 * the whole 15-stage chain without the agent loop). The two chains are then
 * compared stage by stage, and their StockLedger signatures must match exactly.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getTool } from '@/lib/agent/tools'
import { db } from '@/lib/db'
import type { DocPlanResult } from '@/lib/erp/posting/types'
import { planOrder } from '@/lib/erp/posting/order'
import { planBom } from '@/lib/erp/posting/bom'
import { planProgram } from '@/lib/erp/posting/program'
import { planPurchaseOrder } from '@/lib/erp/posting/purchase-order'
import { planGrn } from '@/lib/erp/posting/grn'
import { planJobworkOut, planJobworkIn } from '@/lib/erp/posting/jobwork'
import { planCutOrder } from '@/lib/erp/posting/cut'
import { planLineIssue } from '@/lib/erp/posting/line-issue'
import { planProductionEntry, planReworkEntry } from '@/lib/erp/posting/production'
import { planRejection } from '@/lib/erp/posting/rejection'
import { planPcsDespatch } from '@/lib/erp/posting/despatch'
import { planInvoice } from '@/lib/erp/posting/invoice'
import { planDebitNote } from '@/lib/erp/posting/debit-note'
import { planJournal } from '@/lib/erp/posting/journal'
import { planCostSheet } from '@/lib/erp/posting/cost-sheet'
import { planPayment } from '@/lib/erp/posting/payment'
import { planStockAdjustment } from '@/lib/erp/posting/stock-adj'
import { planTransfer } from '@/lib/erp/posting/transfer'

const TS = Date.now()
const BUYER = 'B001'
const YARN = 'Y-30COT'
const SUPPLIER = 'SUP001'
const JOBWORKER = 'JW001'
const CUSTOMER = 'CUS001'
const OPERATOR = 'E001'

// variant-tagged identifiers (explicit doc numbers keep cleanup surgical)
const ordA = `PRT-A-${TS}`
const ordB = `PRT-B-${TS}`
const styA = `PRT-SA-${TS}`
const styB = `PRT-SB-${TS}`
const poA = `POT-A-${TS}`
const poB = `POT-B-${TS}`
const grnA = `GRN-A-${TS}`
const grnB = `GRN-B-${TS}`
const jwA = `JW-A-${TS}`
const jwB = `JW-B-${TS}`
const cutA = `CUT-A-${TS}`
const cutB = `CUT-B-${TS}`
const dcA = `DC-A-${TS}`
const dcB = `DC-B-${TS}`
const invA = `INV-A-${TS}`
const invB = `INV-B-${TS}`
const dnA = `DN-A-${TS}`
const dnB = `DN-B-${TS}`
const vA = `V-A-${TS}`
const vB = `V-B-${TS}`
const rcpA = `RCP-A-${TS}`
const rcpB = `RCP-B-${TS}`
const adjA = `ADJ-A-${TS}`
const adjB = `ADJ-B-${TS}`
const gtA = `GT-A-${TS}`
const gtB = `GT-B-${TS}`

// ─────────────── door runners ───────────────

/** Agent door: exactly what /api/agent + /api/agent/approve do. */
async function agentDoor(toolName: string, args: Record<string, unknown>) {
  const tool = getTool(toolName)
  if (!tool) throw new Error(`tool ${toolName} not found`)
  const res = await tool.execute(args)
  if (!res.plan || !res.commit) throw new Error(`${toolName} agent door returned no plan: ${res.text}`)
  const committed = await res.commit()
  return { summary: res.plan.summary, committed }
}

/** Form door: exactly what the Wave B server action will call. */
async function formDoor(plan: (input: any) => Promise<DocPlanResult>, args: Record<string, unknown>, toolName: string) {
  const p = await plan(args)
  if (!p.ok) throw new Error(`${toolName} form door plan failed: ${p.error}`)
  const committed = await p.commit()
  return { summary: p.summary, committed }
}

/** Run one op through both doors (variant A args → agent, variant B args → form). */
async function runBoth(
  toolName: string,
  plan: (input: any) => Promise<DocPlanResult>,
  inputA: Record<string, unknown>,
  inputB: Record<string, unknown>,
) {
  const a = await agentDoor(toolName, inputA)
  const b = await formDoor(plan, inputB, toolName)
  return { a, b }
}

/** StockLedger effect signature for an order: txnType + qty legs, order-insensitive. */
async function ledgerSig(orderId: string) {
  const rows = await db.stockLedger.findMany({ where: { orderId } })
  return rows
    .map((r) => `${r.txnType}|inPcs=${r.inPcs}|outPcs=${r.outPcs}|inKgs=${r.inKgs}|outKgs=${r.outKgs}`)
    .sort()
}

function pick<T extends object>(row: T, keys: string[]) {
  const out: Record<string, unknown> = {}
  for (const k of keys) out[k] = (row as any)[k]
  return out
}

describe('doc form↔agent parity (SPEC-M3 §13)', () => {
  let orderIdA = ''
  let orderIdB = ''
  let styleIdA = ''
  let styleIdB = ''
  let yarnId = ''
  // pre-test state of the yarn G1 bucket (receive_grn writes deptId:'' buckets)
  let yarnBucketBefore: { id: string; kgs: number; existed: boolean } | null = null
  // pre-test state of the yarn G2 bucket (Wave D transfer tests write here)
  let yarnBucketG2Before: { id: string; kgs: number } | null = null

  beforeAll(async () => {
    // fresh styles per variant so BOM lines and order lines are test-owned
    const [sA, sB] = await Promise.all([
      db.style.create({ data: { styleNo: styA, description: `PRT style A ${TS}` } }),
      db.style.create({ data: { styleNo: styB, description: `PRT style B ${TS}` } }),
    ])
    styleIdA = sA.id
    styleIdB = sB.id
    const yarn = await db.yarn.findUnique({ where: { code: YARN } })
    if (!yarn) throw new Error(`seed yarn ${YARN} missing`)
    yarnId = yarn.id
    const g1 = await db.godown.findUnique({ where: { code: 'G1' } })
    // capture ANY pre-existing yarn bucket at G1 (both deptId patterns)
    const bucket = await db.currentStock.findFirst({
      where: { itemType: 'yarn', itemId: yarnId, godownId: g1!.id, lotId: null, colourId: null, sizeId: null, orderId: null },
    })
    if (bucket) yarnBucketBefore = { id: bucket.id, kgs: bucket.kgs, existed: true }
    const g2 = await db.godown.findUnique({ where: { code: 'G2' } })
    const bucket2 = g2
      ? await db.currentStock.findFirst({
          where: { itemType: 'yarn', itemId: yarnId, godownId: g2.id, lotId: null, colourId: null, sizeId: null, orderId: null },
        })
      : null
    if (bucket2) yarnBucketG2Before = { id: bucket2.id, kgs: bucket2.kgs }
  })

  it('1. create_order — both doors, identical order header + lines', async () => {
    const lines = [{ colourName: 'Black', sizeName: 'M', qty: 100, rate: 200 }]
    const { a, b } = await runBoth('create_order', planOrder,
      { orderNo: ordA, buyerCode: BUYER, styleNo: styA, deliveryDate: '2027-03-31', lines },
      { orderNo: ordB, buyerCode: BUYER, styleNo: styB, deliveryDate: '2027-03-31', lines })
    expect(a.committed.orderNo).toBe(ordA)
    expect(b.committed.orderNo).toBe(ordB)
    const [oA, oB] = await Promise.all([
      db.order.findUnique({ where: { orderNo: ordA }, include: { lines: true } }),
      db.order.findUnique({ where: { orderNo: ordB }, include: { lines: true } }),
    ])
    expect(oA).toBeTruthy(); expect(oB).toBeTruthy()
    orderIdA = oA!.id; orderIdB = oB!.id
    expect(pick(oA!, ['totalPcs', 'totalValue', 'status', 'finYear']))
      .toEqual(pick(oB!, ['totalPcs', 'totalValue', 'status', 'finYear']))
    expect(pick(oA!, ['totalPcs', 'totalValue', 'status'])).toEqual({ totalPcs: 100, totalValue: 20000, status: 'open' })
    expect(oA!.lines).toHaveLength(1); expect(oB!.lines).toHaveLength(1)
    expect(pick(oA!.lines[0], ['qty', 'rate', 'colourId', 'sizeId']))
      .toEqual(pick(oB!.lines[0], ['qty', 'rate', 'colourId', 'sizeId']))
    expect(oA!.lines[0].styleId).toBe(styleIdA)
    expect(oB!.lines[0].styleId).toBe(styleIdB)
  })

  it('2. create_bom — both doors, identical BOM lines', async () => {
    const bomLines = [{ itemType: 'yarn', itemCode: YARN, qty: 25, rate: 320 }]
    const { a, b } = await runBoth('create_bom', planBom,
      { styleNo: styA, lines: bomLines },
      { styleNo: styB, lines: bomLines })
    expect(a.committed.lines).toBe(1)
    expect(b.committed.lines).toBe(1)
    const [lA, lB] = await Promise.all([
      db.bomLine.findMany({ where: { styleId: styleIdA } }),
      db.bomLine.findMany({ where: { styleId: styleIdB } }),
    ])
    expect(lA).toHaveLength(1); expect(lB).toHaveLength(1)
    expect(pick(lA[0], ['itemType', 'itemId', 'qty', 'uomId', 'rate']))
      .toEqual(pick(lB[0], ['itemType', 'itemId', 'qty', 'uomId', 'rate']))
    expect(lA[0].itemId).toBe(yarnId)
  })

  it('3. create_program — both doors, identical program + projector row', async () => {
    const { a, b } = await runBoth('create_program', planProgram,
      { orderNo: ordA, stage: 'knitting', yarnCode: YARN, requiredKgs: 25 },
      { orderNo: ordB, stage: 'knitting', yarnCode: YARN, requiredKgs: 25 })
    expect(String(a.committed.programNo)).toMatch(/^PGM-/)
    expect(String(b.committed.programNo)).toMatch(/^PGM-/)
    const [pA, pB] = await Promise.all([
      db.program.findMany({ where: { orderId: orderIdA } }),
      db.program.findMany({ where: { orderId: orderIdB } }),
    ])
    expect(pA).toHaveLength(1); expect(pB).toHaveLength(1)
    expect(pick(pA[0], ['stage', 'yarnId', 'requiredKgs', 'requiredMtrs', 'requiredPcs', 'status']))
      .toEqual(pick(pB[0], ['stage', 'yarnId', 'requiredKgs', 'requiredMtrs', 'requiredPcs', 'status']))
    // STAGE_DEPT mapping: knitting → D1 on both doors
    expect(pA[0].deptId).toBe(pB[0].deptId)
    const [pbA, pbB] = await Promise.all([
      db.progBalanceYarn.findFirst({ where: { orderId: orderIdA } }),
      db.progBalanceYarn.findFirst({ where: { orderId: orderIdB } }),
    ])
    expect(pbA?.reqKgs).toBe(25)
    expect(pbB?.reqKgs).toBe(25)
  })

  it('4. create_purchase_order — both doors, identical PO + auto-approval', async () => {
    const lines = [{ itemType: 'yarn', itemCode: YARN, qty: 50, rate: 320 }]
    const { a, b } = await runBoth('create_purchase_order', planPurchaseOrder,
      { poNo: poA, poType: 'yarn', partyCode: SUPPLIER, deliveryDate: '2027-02-28', lines },
      { poNo: poB, poType: 'yarn', partyCode: SUPPLIER, deliveryDate: '2027-02-28', lines })
    expect(a.committed.poNo).toBe(poA)
    expect(b.committed.poNo).toBe(poB)
    const [poARow, poBRow] = await Promise.all([
      db.purchaseOrder.findUnique({ where: { poNo: poA }, include: { lines: true } }),
      db.purchaseOrder.findUnique({ where: { poNo: poB }, include: { lines: true } }),
    ])
    expect(pick(poARow!, ['poType', 'totalQty', 'totalValue', 'status']))
      .toEqual(pick(poBRow!, ['poType', 'totalQty', 'totalValue', 'status']))
    expect(poARow!.status).toBe('open')
    expect(pick(poARow!.lines[0], ['itemType', 'itemId', 'qty', 'rate', 'amount', 'uomId']))
      .toEqual(pick(poBRow!.lines[0], ['itemType', 'itemId', 'qty', 'rate', 'amount', 'uomId']))
    const [apA, apB] = await Promise.all([
      db.approval.findFirst({ where: { entity: 'po', entityId: poARow!.id } }),
      db.approval.findFirst({ where: { entity: 'po', entityId: poBRow!.id } }),
    ])
    expect(apA?.status).toBe('pending')
    expect(apB?.status).toBe('pending')
  })

  it('5. receive_grn — both doors, identical GRN + purchase_grn ledger + PO flip', async () => {
    const { a, b } = await runBoth('receive_grn', planGrn,
      { grnNo: grnA, poNo: poA, godownCode: 'G1', receivedQty: 50 },
      { grnNo: grnB, poNo: poB, godownCode: 'G1', receivedQty: 50 })
    expect(a.committed.grnNo).toBe(grnA)
    expect(b.committed.grnNo).toBe(grnB)
    const [gA, gB] = await Promise.all([
      db.gRN.findUnique({ where: { grnNo: grnA }, include: { lines: true } }),
      db.gRN.findUnique({ where: { grnNo: grnB }, include: { lines: true } }),
    ])
    expect(pick(gA!, ['grnType', 'totalQty', 'totalValue'])).toEqual(pick(gB!, ['grnType', 'totalQty', 'totalValue']))
    expect(pick(gA!.lines[0], ['itemType', 'itemId', 'qty', 'rate', 'amount']))
      .toEqual(pick(gB!.lines[0], ['itemType', 'itemId', 'qty', 'rate', 'amount']))
    // ledger: purchase_grn 50 kgs IN at G1 on both doors
    for (const grnNo of [grnA, grnB]) {
      const row = await db.stockLedger.findFirst({ where: { docNo: grnNo, txnType: 'purchase_grn' } })
      expect(row).toBeTruthy()
      expect(row!.inKgs).toBe(50)
      expect(row!.outKgs).toBe(0)
    }
    // PO flips to received + poLine.receivedQty on both doors
    const [poARow, poBRow] = await Promise.all([
      db.purchaseOrder.findUnique({ where: { poNo: poA }, include: { lines: true } }),
      db.purchaseOrder.findUnique({ where: { poNo: poB }, include: { lines: true } }),
    ])
    expect(poARow!.status).toBe('received'); expect(poBRow!.status).toBe('received')
    expect(poARow!.lines[0].receivedQty).toBe(50)
    expect(poBRow!.lines[0].receivedQty).toBe(50)
    // FIX #3 regression guard (grn.ts): both doors must increment the SAME
    // null-dims yarn-G1 bucket — the old findUnique-with-nulls path threw,
    // was swallowed, and created a DUPLICATE 50-kg bucket per GRN.
    const g1 = await db.godown.findUnique({ where: { code: 'G1' } })
    const yarnBuckets = await db.currentStock.findMany({
      where: { itemType: 'yarn', itemId: yarnId, godownId: g1!.id, lotId: null, colourId: null, sizeId: null, deptId: null, orderId: null },
    })
    expect(yarnBuckets).toHaveLength(1)
    expect(yarnBuckets[0].kgs).toBeCloseTo((yarnBucketBefore?.kgs ?? 0) + 100, 5) // +50 per door
  })

  it('6. create_jobwork_order — both doors, identical jobwork DC', async () => {
    const { a, b } = await runBoth('create_jobwork_order', planJobworkOut,
      { dcNo: jwA, jobworkerCode: JOBWORKER, processType: 'washing', totalQty: 200, totalValue: 4000, orderNo: ordA },
      { dcNo: jwB, jobworkerCode: JOBWORKER, processType: 'washing', totalQty: 200, totalValue: 4000, orderNo: ordB })
    expect(a.committed.dcNo).toBe(jwA)
    expect(b.committed.dcNo).toBe(jwB)
    const [jA, jB] = await Promise.all([
      db.jobworkOrder.findUnique({ where: { dcNo: jwA } }),
      db.jobworkOrder.findUnique({ where: { dcNo: jwB } }),
    ])
    expect(pick(jA!, ['processType', 'totalQty', 'totalValue', 'status']))
      .toEqual(pick(jB!, ['processType', 'totalQty', 'totalValue', 'status']))
    expect(jA!.status).toBe('sent')
    expect(jA!.orderId).toBe(orderIdA)
    expect(jB!.orderId).toBe(orderIdB)
  })

  it('7. receive_jobwork — both doors, identical receipt state', async () => {
    const { a, b } = await runBoth('receive_jobwork', planJobworkIn,
      { dcNo: jwA, receivedQty: 200 },
      { dcNo: jwB, receivedQty: 200 })
    expect(a.committed.dcNo).toBe(jwA)
    expect(b.committed.dcNo).toBe(jwB)
    const [jA, jB] = await Promise.all([
      db.jobworkOrder.findUnique({ where: { dcNo: jwA } }),
      db.jobworkOrder.findUnique({ where: { dcNo: jwB } }),
    ])
    expect(pick(jA!, ['status', 'totalQty'])).toEqual(pick(jB!, ['status', 'totalQty']))
    expect(jA!.status).toBe('received')
    expect(jA!.receivedDate).toBeTruthy()
  })

  it('8. create_cut_order — both doors, identical cut + bundles + ready_to_cut_in', async () => {
    const { a, b } = await runBoth('create_cut_order', planCutOrder,
      { cutNo: cutA, orderNo: ordA, fabricIssued: 25, totalPcs: 100, efficiency: 90 },
      { cutNo: cutB, orderNo: ordB, fabricIssued: 25, totalPcs: 100, efficiency: 90 })
    expect(a.committed.cutNo).toBe(cutA)
    expect(b.committed.cutNo).toBe(cutB)
    expect(a.committed.bundlesCreated).toBe(1)
    expect(b.committed.bundlesCreated).toBe(1)
    const [cA, cB] = await Promise.all([
      db.cutOrder.findUnique({ where: { cutNo: cutA }, include: { bundles: true } }),
      db.cutOrder.findUnique({ where: { cutNo: cutB }, include: { bundles: true } }),
    ])
    expect(pick(cA!, ['fabricIssued', 'totalPcs', 'status', 'efficiency']))
      .toEqual(pick(cB!, ['fabricIssued', 'totalPcs', 'status', 'efficiency']))
    expect(cA!.bundles).toHaveLength(1); expect(cB!.bundles).toHaveLength(1)
    // barcodes embed the stripped cutNo (variant-tagged) + bundle seq — same shape
    expect(cA!.bundles[0].barcode).toMatch(/^\*CUTA\d+B001\*$/)
    expect(cB!.bundles[0].barcode).toMatch(/^\*CUTB\d+B001\*$/)
    expect(cA!.bundles[0].qty).toBe(cB!.bundles[0].qty)
    for (const orderId of [orderIdA, orderIdB]) {
      const row = await db.stockLedger.findFirst({ where: { orderId, txnType: 'ready_to_cut_in' } })
      expect(row?.inPcs).toBe(100)
    }
  })

  it('9. issue_to_line — both doors, identical line issue + ready_to_cut_out', async () => {
    const { a, b } = await runBoth('issue_to_line', planLineIssue,
      { orderNo: ordA, lineCode: 'L1', qty: 100 },
      { orderNo: ordB, lineCode: 'L1', qty: 100 })
    expect(String(a.committed.issueNo)).toMatch(/^LI-/)
    expect(String(b.committed.issueNo)).toMatch(/^LI-/)
    const [liA, liB] = await Promise.all([
      db.lineIssue.findFirst({ where: { orderId: orderIdA } }),
      db.lineIssue.findFirst({ where: { orderId: orderIdB } }),
    ])
    expect(pick(liA!, ['qty', 'status'])).toEqual(pick(liB!, ['qty', 'status']))
    expect(liA!.lineId).toBe(liB!.lineId)
    for (const orderId of [orderIdA, orderIdB]) {
      const row = await db.stockLedger.findFirst({ where: { orderId, txnType: 'ready_to_cut_out' } })
      expect(row?.outPcs).toBe(100)
    }
  })

  it('10. post_production_entry — both doors, identical entry + production_in', async () => {
    const { a, b } = await runBoth('post_production_entry', planProductionEntry,
      { orderNo: ordA, deptCode: 'D4', prodDate: '2027-03-10', bundleNo: 'PB1', operatorCode: OPERATOR, qty: 95, rate: 12 },
      { orderNo: ordB, deptCode: 'D4', prodDate: '2027-03-10', bundleNo: 'PB1', operatorCode: OPERATOR, qty: 95, rate: 12 })
    expect(a.committed.id).toBeTruthy()
    expect(b.committed.id).toBeTruthy()
    const [eA, eB] = await Promise.all([
      db.productionEntry.findFirst({ where: { orderId: orderIdA, rework: false } }),
      db.productionEntry.findFirst({ where: { orderId: orderIdB, rework: false } }),
    ])
    expect(pick(eA!, ['bundleNo', 'qty', 'rate', 'amount', 'rework']))
      .toEqual(pick(eB!, ['bundleNo', 'qty', 'rate', 'amount', 'rework']))
    expect(eA!.amount).toBe(1140)
    for (const orderId of [orderIdA, orderIdB]) {
      const row = await db.stockLedger.findFirst({ where: { orderId, txnType: 'production_in' } })
      expect(row?.inPcs).toBe(95)
    }
  })

  it('11. post_rework — both doors, identical rework entry, document-only', async () => {
    const { a, b } = await runBoth('post_rework', planReworkEntry,
      { orderNo: ordA, deptCode: 'D4', qty: 5, bundleNo: 'RW1', operatorCode: OPERATOR, rate: 8 },
      { orderNo: ordB, deptCode: 'D4', qty: 5, bundleNo: 'RW1', operatorCode: OPERATOR, rate: 8 })
    expect(a.committed.id).toBeTruthy()
    expect(b.committed.id).toBeTruthy()
    const [rA, rB] = await Promise.all([
      db.productionEntry.findFirst({ where: { orderId: orderIdA, rework: true } }),
      db.productionEntry.findFirst({ where: { orderId: orderIdB, rework: true } }),
    ])
    expect(pick(rA!, ['bundleNo', 'qty', 'rate', 'amount', 'rework']))
      .toEqual(pick(rB!, ['bundleNo', 'qty', 'rate', 'amount', 'rework']))
    // no extra ledger rows from rework on either door
    expect(await db.stockLedger.count({ where: { orderId: orderIdA, docNo: 'RW1' } })).toBe(0)
    expect(await db.stockLedger.count({ where: { orderId: orderIdB, docNo: 'RW1' } })).toBe(0)
  })

  it('12. post_rejection — both doors, identical rejection + rejection_out', async () => {
    const { a, b } = await runBoth('post_rejection', planRejection,
      { orderNo: ordA, qty: 3, rejType: 'stitch_fault', action: 'scrap', deptCode: 'D4' },
      { orderNo: ordB, qty: 3, rejType: 'stitch_fault', action: 'scrap', deptCode: 'D4' })
    expect(String(a.committed.rejNo)).toMatch(/^REJ-/)
    expect(String(b.committed.rejNo)).toMatch(/^REJ-/)
    const [rA, rB] = await Promise.all([
      db.rejectionEntry.findFirst({ where: { orderId: orderIdA } }),
      db.rejectionEntry.findFirst({ where: { orderId: orderIdB } }),
    ])
    expect(pick(rA!, ['qty', 'rejType', 'action'])).toEqual(pick(rB!, ['qty', 'rejType', 'action']))
    for (const orderId of [orderIdA, orderIdB]) {
      const row = await db.stockLedger.findFirst({ where: { orderId, txnType: 'rejection_out' } })
      expect(row?.outPcs).toBe(3)
    }
  })

  it('13. create_pcs_despatch — both doors, identical DC + sales_delivery', async () => {
    const { a, b } = await runBoth('create_pcs_despatch', planPcsDespatch,
      { dcNo: dcA, orderNo: ordA, totalPcs: 92, vehicleNo: 'TN33PRT1', lines: [{ styleNo: styA, qty: 92, rate: 200 }] },
      { dcNo: dcB, orderNo: ordB, totalPcs: 92, vehicleNo: 'TN33PRT1', lines: [{ styleNo: styB, qty: 92, rate: 200 }] })
    expect(a.committed.dcNo).toBe(dcA)
    expect(b.committed.dcNo).toBe(dcB)
    const [dA, dB] = await Promise.all([
      db.pcsDespatch.findUnique({ where: { dcNo: dcA }, include: { lines: true } }),
      db.pcsDespatch.findUnique({ where: { dcNo: dcB }, include: { lines: true } }),
    ])
    expect(pick(dA!, ['totalPcs', 'vehicleNo', 'status'])).toEqual(pick(dB!, ['totalPcs', 'vehicleNo', 'status']))
    expect(dA!.lines).toHaveLength(1); expect(dB!.lines).toHaveLength(1)
    expect(dA!.lines[0].qty).toBe(92); expect(dB!.lines[0].qty).toBe(92)
    for (const orderId of [orderIdA, orderIdB]) {
      const row = await db.stockLedger.findFirst({ where: { orderId, txnType: 'sales_delivery' } })
      expect(row?.outPcs).toBe(92)
    }
  })

  it('14. create_sales_invoice — both doors, identical GST math', async () => {
    const base = { partyCode: CUSTOMER, billType: 'sales', totalQty: 92, taxableValue: 18400, gstRate: 5, gstType: 'cgst_sgst' }
    const { a, b } = await runBoth('create_sales_invoice', planInvoice,
      { invoiceNo: invA, orderNo: ordA, ...base },
      { invoiceNo: invB, orderNo: ordB, ...base })
    expect(a.committed.invoiceNo).toBe(invA)
    expect(b.committed.invoiceNo).toBe(invB)
    const [iA, iB] = await Promise.all([
      db.salesInvoice.findUnique({ where: { invoiceNo: invA } }),
      db.salesInvoice.findUnique({ where: { invoiceNo: invB } }),
    ])
    expect(pick(iA!, ['billType', 'totalQty', 'taxableValue', 'cgstRate', 'sgstRate', 'igstRate', 'cgstAmt', 'sgstAmt', 'igstAmt', 'billAmount', 'status']))
      .toEqual(pick(iB!, ['billType', 'totalQty', 'taxableValue', 'cgstRate', 'sgstRate', 'igstRate', 'cgstAmt', 'sgstAmt', 'igstAmt', 'billAmount', 'status']))
    expect(iA!.billAmount).toBe(19320)
    expect(iA!.status).toBe('issued')
  })

  it('15. create_debit_note — both doors, identical note', async () => {
    const base = { noteType: 'pcs', partyCode: CUSTOMER, amount: 500, reason: 'shortage' }
    const { a, b } = await runBoth('create_debit_note', planDebitNote,
      { noteNo: dnA, ...base }, { noteNo: dnB, ...base })
    expect(a.committed.noteNo).toBe(dnA)
    expect(b.committed.noteNo).toBe(dnB)
    const [nA, nB] = await Promise.all([
      db.debitNote.findUnique({ where: { noteNo: dnA } }),
      db.debitNote.findUnique({ where: { noteNo: dnB } }),
    ])
    expect(pick(nA!, ['noteType', 'amount', 'reason', 'status'])).toEqual(pick(nB!, ['noteType', 'amount', 'reason', 'status']))
  })

  it('16. create_journal — both doors, identical voucher', async () => {
    const base = { voucherType: 'journal', debitAccount: 'Freight', creditAccount: 'Cash', amount: 250, partyCode: SUPPLIER }
    const { a, b } = await runBoth('create_journal', planJournal,
      { voucherNo: vA, ...base }, { voucherNo: vB, ...base })
    expect(a.committed.voucherNo).toBe(vA)
    expect(b.committed.voucherNo).toBe(vB)
    const [jA, jB] = await Promise.all([
      db.journal.findUnique({ where: { voucherNo: vA } }),
      db.journal.findUnique({ where: { voucherNo: vB } }),
    ])
    expect(pick(jA!, ['voucherType', 'debitAccount', 'creditAccount', 'amount']))
      .toEqual(pick(jB!, ['voucherType', 'debitAccount', 'creditAccount', 'amount']))
  })

  it('17. create_cost_sheet — both doors, identical version + totals', async () => {
    const base = { fabricCost: 8000, trimCost: 1200, cmCost: 1140, washingCost: 500, packingCost: 400, overheads: 600, sellingPrice: 18400 }
    const { a, b } = await runBoth('create_cost_sheet', planCostSheet,
      { orderNo: ordA, ...base }, { orderNo: ordB, ...base })
    expect(a.committed.version).toBe(1)
    expect(b.committed.version).toBe(1)
    const [cA, cB] = await Promise.all([
      db.costSheet.findFirst({ where: { orderId: orderIdA } }),
      db.costSheet.findFirst({ where: { orderId: orderIdB } }),
    ])
    expect(pick(cA!, ['version', 'fabricCost', 'trimCost', 'cmCost', 'washingCost', 'packingCost', 'overheads', 'totalCost', 'sellingPrice']))
      .toEqual(pick(cB!, ['version', 'fabricCost', 'trimCost', 'cmCost', 'washingCost', 'packingCost', 'overheads', 'totalCost', 'sellingPrice']))
    expect(cA!.totalCost).toBe(11840)
  })

  it('18. record_payment — both doors, identical payment + JV + invoice settled', async () => {
    const [iA, iB] = await Promise.all([
      db.salesInvoice.findUnique({ where: { invoiceNo: invA } }),
      db.salesInvoice.findUnique({ where: { invoiceNo: invB } }),
    ])
    const base = { partyCode: CUSTOMER, amount: iA!.billAmount, direction: 'in', mode: 'bank', reference: 'UTR-PRT' }
    const { a, b } = await runBoth('record_payment', planPayment,
      { voucherNo: rcpA, orderNo: ordA, invoiceNo: invA, ...base },
      { voucherNo: rcpB, orderNo: ordB, invoiceNo: invB, ...base })
    expect(a.committed.voucherNo).toBe(rcpA)
    expect(b.committed.voucherNo).toBe(rcpB)
    expect(a.committed.invoiceSettled).toBe(true)
    expect(b.committed.invoiceSettled).toBe(true)
    const [pA, pB] = await Promise.all([
      db.payment.findUnique({ where: { voucherNo: rcpA } }),
      db.payment.findUnique({ where: { voucherNo: rcpB } }),
    ])
    expect(pick(pA!, ['direction', 'amount', 'mode', 'reference']))
      .toEqual(pick(pB!, ['direction', 'amount', 'mode', 'reference']))
    // companion JV written on both doors
    for (const v of [`JV-${rcpA}`, `JV-${rcpB}`]) {
      const jv = await db.journal.findUnique({ where: { voucherNo: v } })
      expect(jv?.voucherType).toBe('receipt')
      expect(jv?.amount).toBe(19320)
    }
    // invoice flipped to paid on both doors
    expect((await db.salesInvoice.findUnique({ where: { invoiceNo: invA } }))?.status).toBe('paid')
    expect((await db.salesInvoice.findUnique({ where: { invoiceNo: invB } }))?.status).toBe('paid')
  })

  it('19. FULL-CHAIN ledger parity — agent door and form door produce identical StockLedger effects', async () => {
    const sigA = await ledgerSig(orderIdA)
    const sigB = await ledgerSig(orderIdB)
    expect(sigA).toEqual(sigB)
    // the known 5 chain effects, in the signature itself
    const expected = [
      'production_in|inPcs=95|outPcs=0|inKgs=0|outKgs=0',
      'ready_to_cut_in|inPcs=100|outPcs=0|inKgs=0|outKgs=0',
      'ready_to_cut_out|inPcs=0|outPcs=100|inKgs=0|outKgs=0',
      'rejection_out|inPcs=0|outPcs=3|inKgs=0|outKgs=0',
      'sales_delivery|inPcs=0|outPcs=92|inKgs=0|outKgs=0',
    ].sort()
    expect(sigA).toEqual(expected)
    // and the buckets net to zero on both doors (G1 and G2 pcs)
    for (const orderId of [orderIdA, orderIdB]) {
      const buckets = await db.currentStock.findMany({ where: { itemType: 'pcs', itemId: orderId } })
      const net = buckets.reduce((s, b) => s + b.pcs, 0)
      expect(net).toBe(0)
    }
  })

  it('20. post_stock_adjustment (Wave D) — both doors, identical adjustment ledger row', async () => {
    // capture the null-dims G1 yarn bucket right before this test (delta-based —
    // robust regardless of what earlier chain tests left in it)
    const g1pre = await db.godown.findUnique({ where: { code: 'G1' } })
    const preBucket = await db.currentStock.findFirst({
      where: { itemType: 'yarn', itemId: yarnId, godownId: g1pre!.id, lotId: null, colourId: null, sizeId: null, deptId: null, orderId: null },
    })
    const preKgs = preBucket?.kgs ?? 0
    const base = { godownCode: 'G1', itemType: 'yarn', itemCode: YARN, qty: 12.5, action: 'add', reason: 'parity audit found short' }
    const { a, b } = await runBoth('post_stock_adjustment', planStockAdjustment,
      { docNo: adjA, ...base },
      { docNo: adjB, ...base })
    expect(a.committed.docNo).toBe(adjA)
    expect(b.committed.docNo).toBe(adjB)
    const [rA, rB] = await Promise.all([
      db.stockLedger.findFirst({ where: { docNo: adjA } }),
      db.stockLedger.findFirst({ where: { docNo: adjB } }),
    ])
    expect(rA).toBeTruthy(); expect(rB).toBeTruthy()
    expect(pick(rA!, ['txnType', 'itemType', 'itemId', 'godownId', 'inKgs', 'outKgs', 'inPcs', 'outPcs', 'rate', 'notes']))
      .toEqual(pick(rB!, ['txnType', 'itemType', 'itemId', 'godownId', 'inKgs', 'outKgs', 'inPcs', 'outPcs', 'rate', 'notes']))
    expect(rA!.txnType).toBe('stock_adjustment_add')
    expect(rA!.inKgs).toBe(12.5)
    expect(rA!.outKgs).toBe(0)
    // both doors bumped the SAME CurrentStock bucket (ADR-004 null-dims key): +12.5 each
    const buckets = await db.currentStock.findMany({
      where: { itemType: 'yarn', itemId: yarnId, godownId: g1pre!.id, lotId: null, colourId: null, sizeId: null, deptId: null, orderId: null },
    })
    expect(buckets).toHaveLength(1)
    expect(buckets[0].kgs).toBeCloseTo(preKgs + 25, 5)
  })

  it('21. transfer_stock (Wave D) — both doors, identical out+in ledger PAIR sharing one docNo', async () => {
    // net stock across ALL yarn buckets right before this test (transfers net zero)
    const netBefore = (await db.currentStock.findMany({ where: { itemType: 'yarn', itemId: yarnId } }))
      .reduce((s, x) => s + x.kgs, 0)
    const base = { itemType: 'yarn', itemCode: YARN, fromGodownCode: 'G1', toGodownCode: 'G2', qty: 8 }
    const { a, b } = await runBoth('transfer_stock', planTransfer,
      { docNo: gtA, ...base },
      { docNo: gtB, ...base })
    expect(a.committed.docNo).toBe(gtA)
    expect(b.committed.docNo).toBe(gtB)
    const [g1, g2] = await Promise.all([
      db.godown.findUnique({ where: { code: 'G1' } }),
      db.godown.findUnique({ where: { code: 'G2' } }),
    ])
    for (const gt of [gtA, gtB]) {
      const rows = await db.stockLedger.findMany({ where: { docNo: gt } })
      expect(rows).toHaveLength(2)
      const out = rows.find((r) => r.txnType === 'godown_transfer_out')!
      const inn = rows.find((r) => r.txnType === 'godown_transfer_in')!
      expect(out.godownId).toBe(g1!.id)
      expect(out.outKgs).toBe(8)
      expect(out.inKgs).toBe(0)
      expect(inn.godownId).toBe(g2!.id)
      expect(inn.inKgs).toBe(8)
      expect(inn.outKgs).toBe(0)
      // the pair is field-identical between doors except godownId/qty direction
      expect(pick(out, ['itemType', 'itemId', 'rate'])).toEqual(pick(inn, ['itemType', 'itemId', 'rate']))
    }
    // cross-door comparison on the OUT legs
    const [outA, outB] = await Promise.all([
      db.stockLedger.findFirst({ where: { docNo: gtA, txnType: 'godown_transfer_out' } }),
      db.stockLedger.findFirst({ where: { docNo: gtB, txnType: 'godown_transfer_out' } }),
    ])
    expect(pick(outA!, ['itemType', 'itemId', 'godownId', 'outKgs', 'inKgs', 'rate']))
      .toEqual(pick(outB!, ['itemType', 'itemId', 'godownId', 'outKgs', 'inKgs', 'rate']))
    // net stock across godowns unchanged by the transfers (each pair nets zero)
    const netAfter = (await db.currentStock.findMany({ where: { itemType: 'yarn', itemId: yarnId } }))
      .reduce((s, x) => s + x.kgs, 0)
    expect(netAfter).toBeCloseTo(netBefore, 5)
  })

  afterAll(async () => {
    const orderIds = [orderIdA, orderIdB].filter(Boolean)
    const sw = (e: unknown) => e as any
    // children first, FK-safe order, every delete best-effort
    await sw(db.payment.deleteMany({ where: { voucherNo: { in: [rcpA, rcpB] } } }).catch(() => {}))
    await sw(db.journal.deleteMany({ where: { voucherNo: { in: [vA, vB, `JV-${rcpA}`, `JV-${rcpB}`] } } }).catch(() => {}))
    await sw(db.costSheet.deleteMany({ where: { orderId: { in: orderIds } } }).catch(() => {}))
    await sw(db.salesInvoice.deleteMany({ where: { invoiceNo: { in: [invA, invB] } } }).catch(() => {}))
    await sw(db.debitNote.deleteMany({ where: { noteNo: { in: [dnA, dnB] } } }).catch(() => {}))
    const despatches = await db.pcsDespatch.findMany({ where: { orderId: { in: orderIds } } })
    if (despatches.length) {
      await sw(db.pcsDespatchLine.deleteMany({ where: { pcsDespatchId: { in: despatches.map((d) => d.id) } } }).catch(() => {}))
      await sw(db.pcsDespatch.deleteMany({ where: { id: { in: despatches.map((d) => d.id) } } }).catch(() => {}))
    }
    await sw(db.rejectionEntry.deleteMany({ where: { orderId: { in: orderIds } } }).catch(() => {}))
    await sw(db.productionEntry.deleteMany({ where: { orderId: { in: orderIds } } }).catch(() => {}))
    await sw(db.lineIssue.deleteMany({ where: { orderId: { in: orderIds } } }).catch(() => {}))
    const cuts = await db.cutOrder.findMany({ where: { orderId: { in: orderIds } } })
    if (cuts.length) {
      await sw(db.cutBundle.deleteMany({ where: { cutOrderId: { in: cuts.map((c) => c.id) } } }).catch(() => {}))
      await sw(db.cutOrder.deleteMany({ where: { id: { in: cuts.map((c) => c.id) } } }).catch(() => {}))
    }
    await sw(db.jobworkOrder.deleteMany({ where: { dcNo: { in: [jwA, jwB] } } }).catch(() => {}))
    await sw(db.stockLedger.deleteMany({ where: { orderId: { in: orderIds } } }).catch(() => {}))
    await sw(db.stockLedger.deleteMany({ where: { docNo: { in: [grnA, grnB] } } }).catch(() => {}))
    // Wave D ledger rows (stock-adj + transfer pairs)
    await sw(db.stockLedger.deleteMany({ where: { docNo: { in: [adjA, adjB, gtA, gtB] } } }).catch(() => {}))
    const grns = await db.gRN.findMany({ where: { grnNo: { in: [grnA, grnB] } } })
    if (grns.length) {
      await sw(db.gRNLine.deleteMany({ where: { grnId: { in: grns.map((g) => g.id) } } }).catch(() => {}))
      await sw(db.gRN.deleteMany({ where: { id: { in: grns.map((g) => g.id) } } }).catch(() => {}))
    }
    const pos = await db.purchaseOrder.findMany({ where: { poNo: { in: [poA, poB] } } })
    if (pos.length) {
      const poIds = pos.map((p) => p.id)
      await sw(db.approval.deleteMany({ where: { entityId: { in: poIds } } }).catch(() => {}))
      await sw(db.pOLine.deleteMany({ where: { poId: { in: poIds } } }).catch(() => {}))
      await sw(db.purchaseOrder.deleteMany({ where: { id: { in: poIds } } }).catch(() => {}))
    }
    await sw(db.progBalanceYarn.deleteMany({ where: { orderId: { in: orderIds } } }).catch(() => {}))
    await sw(db.progBalanceFabric.deleteMany({ where: { orderId: { in: orderIds } } }).catch(() => {}))
    await sw(db.program.deleteMany({ where: { orderId: { in: orderIds } } }).catch(() => {}))
    await sw(db.orderLine.deleteMany({ where: { orderId: { in: orderIds } } }).catch(() => {}))
    await sw(db.order.deleteMany({ where: { id: { in: orderIds } } }).catch(() => {}))
    // pcs stock buckets created by the test
    await sw(db.currentStock.deleteMany({ where: { itemType: 'pcs', itemId: { in: orderIds } } }).catch(() => {}))
    // yarn G1 bucket: wipe ALL test-written buckets, then recreate the exact
    // pre-test row if one existed (the old update-only restore left junk rows
    // behind whenever the before-state bucket coexisted with duplicates)
    const g1 = await db.godown.findUnique({ where: { code: 'G1' } })
    if (g1) {
      await sw(db.currentStock.deleteMany({
        where: { itemType: 'yarn', itemId: yarnId, godownId: g1.id },
      }).catch(() => {}))
      if (yarnBucketBefore?.existed) {
        await sw(db.currentStock.create({
          data: { itemType: 'yarn', itemId: yarnId, godownId: g1.id, kgs: yarnBucketBefore.kgs },
        }).catch(() => {}))
      }
    }
    // yarn G2 bucket: Wave D transfers wrote here — wipe + recreate pre-test state
    const g2restore = await db.godown.findUnique({ where: { code: 'G2' } })
    if (g2restore) {
      await sw(db.currentStock.deleteMany({
        where: { itemType: 'yarn', itemId: yarnId, godownId: g2restore.id },
      }).catch(() => {}))
      if (yarnBucketG2Before) {
        await sw(db.currentStock.create({
          data: { itemType: 'yarn', itemId: yarnId, godownId: g2restore.id, kgs: yarnBucketG2Before.kgs },
        }).catch(() => {}))
      }
    }
    // BOM lines + styles (test-owned)
    await sw(db.bomLine.deleteMany({ where: { styleId: { in: [styleIdA, styleIdB].filter(Boolean) } } }).catch(() => {}))
    await sw(db.style.deleteMany({ where: { id: { in: [styleIdA, styleIdB].filter(Boolean) } } }).catch(() => {}))
  })
})
