/**
 * JWL Batch 3 (Phase-6B, SPEC-M39) — the jobwork loop-closure tier:
 *   JWL-01  lines[] + per-line received/rejected/returned mirrors
 *   JWL-02  JW- out posts stock + a REAL itc04Line (header-only stays honest)
 *   JWL-03  cumulative partial-aware receipt (the totalQty-overwrite bug dies)
 *   JWL-04  DC return resolved + cumulative-guarded + DC status flips
 *   JWL-05  GAN is a real stock gate (G2 IN + G3 WIP clear, docKey-idempotent)
 *   JWL-06  bill_jobwork closes the money loop (billed + billedInvoiceNo)
 *   JWL-07  jobworker material statement register (out/in/loss/WIP/aging)
 *   JWL-08  G3 'Jobworker Yard' WIRED as the WIP-at-jobworker godown
 *   JWL-09  allotment linkage + checkProcessLoss verdicts on receipt
 *
 * Spec §15 loop-closure test #2: JW 100 kg out → receive 60 → receive 40 →
 * GAN accept → bill — sent 100 / received 100 / balance 0, stock round-trips,
 * status billed, invoice linked. Both doors share the services (ADR-001).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { db } from '@/lib/db'
import { runCommit } from '@/lib/erp/audit'
import { planJobworkOut, planJobworkIn } from '@/lib/erp/posting/jobwork'
import { planDcReturn } from '@/lib/erp/posting/grn'
import { planJobworkBill } from '@/lib/erp/posting/jobwork-bill'
import { planContractAllotment } from '@/lib/erp/posting/contract-allotment'
import { getTool } from '@/lib/agent/tools'
import { queryJobwork } from '@/lib/erp/registers/jobwork'
import { queryJobworkerStatement } from '@/lib/erp/registers/jobworker-statement'
import { jobworkRegisterConfig } from '@/lib/erp/register-configs/jobwork-register'

const TS = Date.now()
const PARTY = `M39-P-${TS}`
const YARN = `M39-Y-${TS}`
const godown = async (code: string) => db.godown.findUniqueOrThrow({ where: { code } })

let partyId = '', yarnId = '', g1Id = '', g2Id = '', g3Id = ''
let loopDcNo = '' // the loop-closure #2 DC
let loopPartyCode = ''

beforeAll(async () => {
  const uom = await db.uOM.findFirst()
  const p = await db.party.create({ data: { code: PARTY, name: `M39 Jobworker ${TS}`, partyType: 'jobworker' } })
  partyId = p.id
  const y = await db.yarn.create({ data: { code: YARN, count: '30s', uomId: uom!.id, rate: 320 } })
  yarnId = y.id
  g1Id = (await godown('G1')).id
  g2Id = (await godown('G2')).id
  g3Id = (await godown('G3')).id
  loopPartyCode = PARTY
})

afterAll(async () => {
  // surgical cleanup: the party's docs (JW-M39-* + its auto-AL rows), then
  // ledger, then masters
  const dcs = await db.jobworkOrder.findMany({ where: { jobworkerId: partyId } })
  for (const d of dcs) {
    await db.jobworkLine.deleteMany({ where: { jobworkOrderId: d.id } }).catch(() => {})
    await db.approval.deleteMany({ where: { entity: 'pcs_acceptance', entityId: d.id } }).catch(() => {})
  }
  const docNos = dcs.map((d) => d.dcNo)
  if (docNos.length) await db.stockLedger.deleteMany({ where: { docNo: { in: docNos } } }).catch(() => {})
  await db.stockLedger.deleteMany({ where: { docNo: { startsWith: `RTN-M39-${TS}` } } }).catch(() => {})
  await db.gRN.deleteMany({ where: { grnNo: { startsWith: `RTN-M39-${TS}` } } }).catch(() => {})
  await db.salesInvoice.deleteMany({ where: { invoiceNo: { startsWith: `INV-M39-${TS}` } } }).catch(() => {})
  await db.jobworkOrder.deleteMany({ where: { jobworkerId: partyId } }).catch(() => {})
  await db.currentStock.deleteMany({ where: { itemId: yarnId } }).catch(() => {})
  await db.auditLog.deleteMany({ where: { OR: [{ docNo: { startsWith: `JW-M39-${TS}` } }, { docNo: { startsWith: `INV-M39-${TS}` } }] } }).catch(() => {})
  await db.yarn.deleteMany({ where: { id: yarnId } }).catch(() => {})
  await db.party.deleteMany({ where: { id: partyId } }).catch(() => {})
  await db.$disconnect()
})

// ───────────────── Loop-closure test #2 (spec §15) ─────────────────

describe('JWL loop-closure #2 — JW 100 out → 60 + 40 received → GAN → bill', () => {
  it('step 1: JW- out WITH lines posts stock out of G1 + parks G3 WIP + writes the ITC-04 line (JWL-01/02/08)', async () => {
    const plan = await planJobworkOut({
      jobworkerCode: PARTY, processType: 'knitting',
      lines: [{ itemType: 'yarn', itemCode: YARN, qty: 100, rate: 320 }],
      dcNo: `JW-M39-${TS}-1`,
    })
    expect(plan.ok).toBe(true)
    const res = await runCommit(plan, { actorName: 'm39@test', actorSource: 'agent' })
    loopDcNo = res.dcNo

    const jw = await db.jobworkOrder.findUniqueOrThrow({ where: { dcNo: loopDcNo }, include: { lines: true } })
    expect(jw.totalQty).toBe(100)
    expect(jw.status).toBe('sent')
    expect(jw.lines).toHaveLength(1)
    expect(jw.lines[0].qty).toBe(100)
    expect(jw.lines[0].receivedQty).toBe(0)
    expect(jw.itc04Line).toContain('ITC04')
    expect(jw.itc04Line).toContain(loopDcNo)

    // ledger: G1 OUT + G3 IN (WIP parked), CurrentStock mirrors both
    const rows = await db.stockLedger.findMany({ where: { docNo: loopDcNo }, orderBy: { godownId: 'asc' } })
    expect(rows).toHaveLength(2)
    const g1Row = rows.find((r) => r.godownId === g1Id)!
    const g3Row = rows.find((r) => r.godownId === g3Id)!
    expect(g1Row.outKgs).toBe(100)
    expect(g1Row.txnType).toBe('process_delivery')
    expect(g1Row.partyId).toBe(partyId)
    expect(g3Row.inKgs).toBe(100) // JWL-08 — WIP at the jobworker is queryable
    const cs1 = await db.currentStock.findFirst({ where: { itemId: yarnId, godownId: g1Id } })
    const cs3 = await db.currentStock.findFirst({ where: { itemId: yarnId, godownId: g3Id } })
    expect(cs1?.kgs ?? 0).toBeLessThanOrEqual(0.001)
    expect(cs3?.kgs).toBe(100)
  })

  it('step 2: receive 60 — cumulative, partial, NO stock moves before GAN (JWL-03/05)', async () => {
    const plan = await planJobworkIn({ dcNo: loopDcNo, receivedQty: 60 })
    expect(plan.ok).toBe(true)
    await runCommit(plan, { actorName: 'm39@test', actorSource: 'agent' })

    const jw = await db.jobworkOrder.findUniqueOrThrow({ where: { dcNo: loopDcNo }, include: { lines: true } })
    expect(jw.status).toBe('partial')
    expect(jw.totalQty).toBe(100) // SENT truth preserved
    expect(jw.receivedQty).toBe(60)
    expect(jw.lines[0].receivedQty).toBe(60)
    // no stock moved yet (the GAN gate holds)
    const count = await db.stockLedger.count({ where: { docNo: loopDcNo } })
    expect(count).toBe(2) // still only the out legs
  })

  it('step 3: receive 40 → balance 0, status received (JWL-03 acceptance: 100/100/0)', async () => {
    const plan = await planJobworkIn({ dcNo: loopDcNo, receivedQty: 40 })
    expect(plan.ok).toBe(true)
    await runCommit(plan, { actorName: 'm39@test', actorSource: 'agent' })
    const jw = await db.jobworkOrder.findUniqueOrThrow({ where: { dcNo: loopDcNo } })
    expect(jw.receivedQty).toBe(100)
    expect(jw.status).toBe('received')
  })

  it('step 4: GAN acceptance posts INTO G2 + clears G3, flips accepted (JWL-05)', async () => {
    const tool = getTool('accept_jobwork_pcs')!
    const out = await tool.execute({ dcNo: loopDcNo }, { userId: 'm39', email: 'm39@test', name: 'M39 Test' })
    const plan = out.plan!
    expect(out.text).toContain('G2')
    expect(plan.sideEffects!.some((s: string) => s.includes('G2'))).toBe(true)
    // ToolResult separates the serializable plan from the commit closure —
    // runCommit takes both (the AuditablePlan shape)
    await runCommit({ ...plan, commit: out.commit! }, { actorName: 'm39@test', actorSource: 'agent' })

    const rows = await db.stockLedger.findMany({ where: { docNo: loopDcNo } })
    const g2In = rows.find((r) => r.godownId === g2Id && r.txnType === 'process_receipt')
    const g3Out = rows.find((r) => r.godownId === g3Id && r.outKgs > 0) // the CLEAR leg (the park leg is process_delivery IN)
    expect(g2In?.inKgs).toBe(100)
    expect(g3Out?.outKgs).toBe(100) // WIP cleared
    const cs2 = await db.currentStock.findFirst({ where: { itemId: yarnId, godownId: g2Id } })
    const cs3 = await db.currentStock.findFirst({ where: { itemId: yarnId, godownId: g3Id } })
    expect(cs2?.kgs).toBe(100)
    expect(cs3?.kgs).toBe(0) // round-trip: G3 back to zero
    const jw = await db.jobworkOrder.findUniqueOrThrow({ where: { dcNo: loopDcNo } })
    expect(jw.status).toBe('accepted')
    const ap = await db.approval.findFirst({ where: { entity: 'pcs_acceptance', entityId: jw.id } })
    expect(ap?.status).toBe('approved')

    // double-accept is impossible: the gate refuses + the docKey blocks
    const again = await tool.execute({ dcNo: loopDcNo }, { userId: 'm39', email: 'm39@test', name: 'M39 Test' })
    expect(again.text).toContain('already GAN-accepted')
  })

  it('step 5: bill_jobwork → ONE jobwork invoice, DCs flip billed (JWL-06)', async () => {
    const plan = await planJobworkBill({
      jobworkerCode: loopPartyCode,
      invoiceNo: `INV-M39-${TS}-1`,
      gstRate: 18,
    })
    expect(plan.ok).toBe(true)
    expect(plan.summary).toContain(loopDcNo)
    const res = await runCommit(plan, { actorName: 'm39@test', actorSource: 'agent' })
    expect(res.dcs).toContain(loopDcNo)

    const inv = await db.salesInvoice.findUniqueOrThrow({ where: { invoiceNo: res.invoiceNo } })
    expect(inv.billType).toBe('jobwork')
    expect(inv.taxableValue).toBe(100 * 320) // receivedQty × rate
    expect(inv.billAmount).toBeGreaterThan(inv.taxableValue) // GST on top
    const jw = await db.jobworkOrder.findUniqueOrThrow({ where: { dcNo: loopDcNo } })
    expect(jw.status).toBe('billed')
    expect(jw.billedInvoiceNo).toBe(res.invoiceNo)

    // second bill: nothing to bill (sent/partial counted honestly)
    const again = await planJobworkBill({ jobworkerCode: loopPartyCode })
    expect(again.ok).toBe(false)
    expect(again.error).toContain('Nothing to bill')
  })

  it('closure math: sent 100 / received 100 / balance 0 — the register agrees', async () => {
    const reg = await queryJobwork({ party: PARTY, limit: 50, page: 1 })
    const row = reg.rows.find((r) => r.dcNo === loopDcNo)!
    expect(row.totalQty).toBe(100)
    expect(row.receivedQty).toBe(100)
    expect(row.balance).toBe(0)
    expect(row.status).toBe('billed')
    // the filter that selects 'billed' finds it (HFX-09 retired properly)
    const billed = await queryJobwork({ status: 'billed', party: PARTY, limit: 50, page: 1 })
    expect(billed.rows.some((r) => r.dcNo === loopDcNo)).toBe(true)
  })
})

// ───────────────── JWL-02 — honest claims ─────────────────

describe('JWL-02 — header-only out stays document-only, sideEffects tell the truth', () => {
  it('header-only out creates NO stock rows and claims none', async () => {
    const plan = await planJobworkOut({
      jobworkerCode: PARTY, processType: 'washing', totalQty: 50, totalValue: 500,
      dcNo: `JW-M39-${TS}-2`,
    })
    expect(plan.ok).toBe(true)
    expect(plan.sideEffects).not.toContain('ITC-04 line generated')
    expect(plan.sideEffects.some((s) => s.includes('NO stock moves'))).toBe(true)
    await runCommit(plan, { actorName: 'm39@test', actorSource: 'agent' })
    const rows = await db.stockLedger.findMany({ where: { docNo: `JW-M39-${TS}-2` } })
    expect(rows).toHaveLength(0)
  })

  it('lines door sideEffects claim stock + ITC-04 + G3 (and deliver)', async () => {
    const src = readFileSync(join(process.cwd(), 'src/lib/erp/posting/jobwork.ts'), 'utf8')
    expect(src).toContain('ITC-04 line written')
    expect(src).toContain("WIP at jobworker")
    // the source no longer contains the M3 phantom claim
    expect(src).not.toContain("sideEffects: ['Material leaves main godown', 'Pending receipt at jobworker', 'ITC-04 line generated']")
  })
})

// ───────────────── JWL-03 — guards + rejection + process loss ─────────────────

describe('JWL-03 — receipt guards, rejectedQty, process loss', () => {
  it('over-receipt is rejected with the open balance', async () => {
    const bad = await planJobworkIn({ dcNo: loopDcNo, receivedQty: 10 })
    expect(bad.ok).toBe(false)
    expect(bad.error).toContain('Already received')
  })

  it('rejectedQty books as process loss and closes the balance (60 rec + 40 rej → received)', async () => {
    const plan = await planJobworkOut({
      jobworkerCode: PARTY, processType: 'dyeing',
      lines: [{ itemType: 'yarn', itemCode: YARN, qty: 100, rate: 100 }],
      dcNo: `JW-M39-${TS}-3`,
    })
    await runCommit(plan, { actorName: 'm39@test', actorSource: 'agent' })
    const r1 = await planJobworkIn({ dcNo: `JW-M39-${TS}-3`, receivedQty: 60 })
    expect(r1.ok).toBe(true)
    await runCommit(r1, { actorName: 'm39@test', actorSource: 'agent' })
    const mid = await db.jobworkOrder.findUniqueOrThrow({ where: { dcNo: `JW-M39-${TS}-3` } })
    expect(mid.status).toBe('partial')
    const r2 = await planJobworkIn({ dcNo: `JW-M39-${TS}-3`, receivedQty: 30, rejectedQty: 10 })
    expect(r2.ok).toBe(true)
    expect(r2.sideEffects.some((s) => s.includes('Rejected 10 booked as process loss'))).toBe(true)
    await runCommit(r2, { actorName: 'm39@test', actorSource: 'agent' })
    const end = await db.jobworkOrder.findUniqueOrThrow({ where: { dcNo: `JW-M39-${TS}-3` }, include: { lines: true } })
    expect(end.receivedQty).toBe(90)
    expect(end.rejectedQty).toBe(10)
    expect(end.status).toBe('received') // balance 0
    expect(end.lines[0].rejectedQty).toBe(10)
  })

  it('JWL-09: a dyeing DC over tolerance flags the loss verdict and prompts a rejection entry', async () => {
    // the registry default dyeinggamtper = 5% — a 50% loss must flag
    const plan = await planJobworkOut({
      jobworkerCode: PARTY, processType: 'dyeing',
      lines: [{ itemType: 'yarn', itemCode: YARN, qty: 100, rate: 10 }],
      dcNo: `JW-M39-${TS}-4`,
    })
    await runCommit(plan, { actorName: 'm39@test', actorSource: 'agent' })
    const r = await planJobworkIn({ dcNo: `JW-M39-${TS}-4`, receivedQty: 50, rejectedQty: 0 })
    expect(r.ok).toBe(true)
    // 50% loss vs a 5% limit → the warn verdict rides the plan
    expect(r.sideEffects.some((s) => s.includes('exceeds') || s.includes('investigate') || s.includes('rejection entry'))).toBe(true)
  })
})

// ───────────────── JWL-04 — validated DC return ─────────────────

describe('JWL-04 — DC return resolves, guards cumulatively, flips the DC', () => {
  it('a wrong DC number is an error (no free-text dcRef)', async () => {
    const bad = await planDcReturn({
      dcNo: 'MDC-DOES-NOT-EXIST-9999',
      lines: [{ itemType: 'yarn', itemCode: YARN, qty: 10 }],
    })
    expect(bad.ok).toBe(false)
    expect(bad.error).toContain('not found')
  })

  it('a line not on the DC is an error listing the DC lines', async () => {
    // an OPEN DC (sent) with lines — the closed loop DC would trip the
    // already-received guard first
    const open = await planJobworkOut({
      jobworkerCode: PARTY, processType: 'washing',
      lines: [{ itemType: 'yarn', itemCode: YARN, qty: 30, rate: 10 }],
      dcNo: `JW-M39-${TS}-7`,
    })
    expect(open.ok).toBe(true)
    await runCommit(open, { actorName: 'm39@test', actorSource: 'agent' })
    const bad = await planDcReturn({
      dcNo: `JW-M39-${TS}-7`,
      lines: [{ itemType: 'fabric', itemCode: 'NOPE-FAB', qty: 10 }],
    })
    expect(bad.ok).toBe(false)
    expect(bad.error).toContain('not on DC')
  })

  it('send 60 → return 40 (partial) → the 50 over-return is blocked by the cumulative guard → return 20 closes', async () => {
    // a fresh 60-kg DC to return against
    const out = await planJobworkOut({
      jobworkerCode: PARTY, processType: 'washing',
      lines: [{ itemType: 'yarn', itemCode: YARN, qty: 60, rate: 50 }],
      dcNo: `JW-M39-${TS}-5`,
    })
    await runCommit(out, { actorName: 'm39@test', actorSource: 'agent' })
    const ret1 = await planDcReturn({
      dcNo: `JW-M39-${TS}-5`,
      lines: [{ itemType: 'yarn', itemCode: YARN, qty: 40 }],
      grnNo: `RTN-M39-${TS}-1`,
    })
    expect(ret1.ok).toBe(true)
    expect(ret1.summary).toContain('DC → partial') // 40/60 returned
    // partyCode defaults to the DC party (JWL-04)
    expect(ret1.creates?.[0].data.docNo).toBe(`JW-M39-${TS}-5`)
    await runCommit(ret1, { actorName: 'm39@test', actorSource: 'agent' })

    const dc = await db.jobworkOrder.findUniqueOrThrow({ where: { dcNo: `JW-M39-${TS}-5` }, include: { lines: true } })
    expect(dc.returnedQty).toBe(40)
    expect(dc.status).toBe('partial')
    expect(dc.lines[0].returnedQty).toBe(40)

    // the RTN posted the mirror legs: G1 IN + G3 WIP OUT (JWL-08)
    const rtnRows = await db.stockLedger.findMany({ where: { docNo: `RTN-M39-${TS}-1` } })
    expect(rtnRows.find((r) => r.godownId === g1Id)?.inKgs).toBe(40)
    expect(rtnRows.find((r) => r.godownId === g3Id)?.outKgs).toBe(40)

    // cumulative guard: only 20 open, 50 must be refused (JWL-04)
    const ret2 = await planDcReturn({
      dcNo: `JW-M39-${TS}-5`,
      lines: [{ itemType: 'yarn', itemCode: YARN, qty: 50 }],
    })
    expect(ret2.ok).toBe(false)
    expect(ret2.error).toContain('exceeds')

    // the final 20 closes the DC (in-transaction status flip)
    const ret3 = await planDcReturn({
      dcNo: `JW-M39-${TS}-5`,
      lines: [{ itemType: 'yarn', itemCode: YARN, qty: 20 }],
      grnNo: `RTN-M39-${TS}-2`,
    })
    expect(ret3.ok).toBe(true)
    await runCommit(ret3, { actorName: 'm39@test', actorSource: 'agent' })
    const closed = await db.jobworkOrder.findUniqueOrThrow({ where: { dcNo: `JW-M39-${TS}-5` } })
    expect(closed.returnedQty).toBe(60)
    expect(closed.status).toBe('received') // fully returned flips the DC
  })
})

// ───────────────── JWL-07 — jobworker statement ─────────────────

describe('JWL-07 — the jobworker material statement aggregates out/in/loss/WIP', () => {
  it('the loop party: out = Σ G1 legs (100+100+100+60+30), in = GAN G2 100 + RTN G1 60, G3 mirror legs excluded', async () => {
    const res = await queryJobworkerStatement({ party: PARTY, limit: 50, page: 1 })
    const row = res.rows.find((r) => r.item === YARN)!
    // out (company-godown OUT legs): loop 100 + DC-3 100 + DC-4 100 + DC-5 60 + DC-7 30
    expect(row.outQty).toBe(390)
    // in (company-godown IN legs): loop GAN G2 100 + DC-5 RTN G1 60
    expect(row.inQty).toBe(160)
    expect(row.wip).toBe(230) // 390 − 160: material still at the jobworker
    expect(row.agingDays).toBeGreaterThanOrEqual(0)
    expect(res.totals?.find((t) => t.label === 'WIP at jobworkers')?.value).toBe(230)
  })

  it('the agent tool delegates to the same service (json rows carry WIP)', async () => {
    const tool = getTool('list_jobworker_statement')!
    const out = await tool.execute({ party: PARTY })
    const rows = out.json as any[]
    const row = rows.find((r: any) => r.item === YARN)
    expect(row.wip).toBe(230)
    expect(row.lossPct).toBeGreaterThanOrEqual(0)
  })
})

// ───────────────── JWL-09 — allotment linkage ─────────────────

describe('JWL-09 — the AL- contract → JW- DC chain is navigable', () => {
  it('issue a JW DC against the allotment: links + flips issued', async () => {
    const al = await planContractAllotment({
      jobworkerCode: PARTY, processType: 'dyeing', totalQty: 80,
    })
    expect(al.ok).toBe(true)
    const alRes = await runCommit(al, { actorName: 'm39@test', actorSource: 'agent' })
    expect(alRes.dcNo).toMatch(/^AL-\d{4}$/)

    // a non-existent allotment is rejected with guidance
    const bad = await planJobworkOut({
      jobworkerCode: PARTY, processType: 'dyeing',
      lines: [{ itemType: 'yarn', itemCode: YARN, qty: 80, rate: 10 }],
      allotmentNo: 'AL-9999',
    })
    expect(bad.ok).toBe(false)
    expect(bad.error).toContain('not found')

    const out = await planJobworkOut({
      jobworkerCode: PARTY, processType: 'dyeing',
      lines: [{ itemType: 'yarn', itemCode: YARN, qty: 80, rate: 10 }],
      allotmentNo: alRes.dcNo,
      dcNo: `JW-M39-${TS}-6`,
    })
    expect(out.ok).toBe(true)
    expect(out.summary).toContain('fulfills')
    await runCommit(out, { actorName: 'm39@test', actorSource: 'agent' })

    const dc = await db.jobworkOrder.findUniqueOrThrow({ where: { dcNo: `JW-M39-${TS}-6` } })
    const alRow = await db.jobworkOrder.findUniqueOrThrow({ where: { dcNo: alRes.dcNo } })
    expect(dc.allotmentId).toBe(alRow.id)
    expect(alRow.status).toBe('issued') // the contract flips
  })

  it('the doc view renders the allotment link (source contract)', () => {
    const src = readFileSync(join(process.cwd(), 'src/app/(erp)/jobwork/order/[id]/page.tsx'), 'utf8')
    expect(src).toContain('allotment')
    expect(src).toContain('fulfills contract')
    expect(src).toContain('sent vs received') // the JWL-01 lines table
  })
})

// ───────────────── register + config contracts ─────────────────

describe('M39 register/config contracts', () => {
  it('the register filter fleet is honest — every option has a writer', () => {
    const opts = jobworkRegisterConfig.filters.find((f) => f.key === 'status')!.options!.map((o) => o.value)
    expect(opts).toEqual(['sent', 'partial', 'received', 'accepted', 'billed'])
    const cols = jobworkRegisterConfig.columns.map((c) => c.name)
    expect(cols).toContain('receivedQty')
    expect(cols).toContain('balance')
  })

  it('the statement register is registered in both registries (slug bijection)', async () => {
    const { REGISTER_CONFIGS } = await import('@/lib/erp/register-configs')
    const { REGISTER_SERVICES } = await import('@/lib/erp/registers')
    expect(REGISTER_CONFIGS.some((c) => c.slug === 'jobworker-statement')).toBe(true)
    expect(typeof REGISTER_SERVICES['jobworker-statement']).toBe('function')
  })
})
