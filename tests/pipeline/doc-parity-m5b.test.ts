/**
 * SPEC-M5 §12-1 — M5 Wave B doc parity (the P2 guarantee). The six NEW write
 * ops of Wave B must produce IDENTICAL rows through both doors:
 *   - post_finished_goods   (agent tool vs planFinishedGoods service)
 *   - post_operation_entry  (agent tool vs planOperationEntry service)
 *   - scan_bundle           (agent tool vs planScanBundle service)
 *   - transfer_line_stock   (agent tool vs planLineTransfer service)
 *   - return_jobwork_pcs    (agent tool vs planJobworkPcsReturn service)
 *   - pay_wages             (agent tool vs planWagePayment service)
 * Plus: the RejectionEntry VARIANT configs' injection (panel-rej-rework →
 * action rework; fabric-rejection-return → fabric + return_to_party;
 * pcs-shortage → rejType shortage) — the form-door side of §4.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { getTool } from '@/lib/agent/tools'
import { db } from '@/lib/db'
import type { DocPlanResult } from '@/lib/erp/posting/types'
import { planFinishedGoods, planOperationEntry, planScanBundle } from '@/lib/erp/posting/production'
import { planLineTransfer } from '@/lib/erp/posting/line-transfer'
import { planJobworkPcsReturn } from '@/lib/erp/posting/grn'
import { planWagePayment } from '@/lib/erp/posting/payment'
import { planJournal } from '@/lib/erp/posting/journal'
import { commitDocAction } from '@/lib/erp/doc-actions'
import { REGISTER_SERVICES } from '@/lib/erp/registers'

const TS = Date.now()
const BUYER = 'B001'
const OPERATOR = 'E001'

const ordNo = `M5B-O-${TS}`
const styNo = `M5B-S-${TS}`
const line2 = `M5B-L2-${TS}`          // second sewing line (L1 exists in seed)
const empParty = `M5B-EMP-${TS}`      // employee-type party (wage payment)
const bundleKey = `M5B-BUNDLE-${TS}`  // cut bundle for scan tests

const rejPanel = `M5B-RJ-P-${TS}`     // panel-rej-rework form-door commit
const rejFab = `M5B-RJ-F-${TS}`       // fabric-rejection-return form-door commit
const rejShort = `M5B-RJ-S-${TS}`     // pcs-shortage form-door commit

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

function pick<T extends object>(row: T, keys: string[]) {
  const out: Record<string, unknown> = {}
  for (const k of keys) out[k] = (row as any)[k]
  return out
}

describe('M5 Wave B doc parity (SPEC-M5 §12-1)', () => {
  let orderId = ''
  let line1Id = ''
  let line2Id = ''
  let bundleId = ''
  let cutOrderId = ''
  let empPartyId = ''
  let godownG2Id = ''
  const prodIds: string[] = []
  const lineIssueIds: string[] = []
  const grnIds: string[] = []
  const paymentIds: string[] = []
  const journalIds: string[] = []
  const rejIds: string[] = []

  beforeAll(async () => {
    const buyer = await db.buyer.findUnique({ where: { code: BUYER } })
    const style = await db.style.create({ data: { styleNo: styNo, description: `M5B style ${TS}` } })
    const order = await db.order.create({
      data: {
        orderNo: ordNo, buyerId: buyer!.id, styleId: style.id,
        orderDate: new Date(), deliveryDate: new Date('2027-03-31'),
        finYear: '26-27', status: 'open', totalPcs: 1000, totalValue: 50000,
      },
    })
    orderId = order.id
    // sewing lines: L1 (seed) + a dedicated L2
    const l1 = await db.line.findUnique({ where: { code: 'L1' } })
    line1Id = l1!.id
    const l2 = await db.line.create({ data: { code: line2, name: `M5B Transfer Line ${TS}` } })
    line2Id = l2.id
    // cut order + bundle (scan_bundle fixture)
    const cut = await db.cutOrder.create({
      data: {
        cutNo: `M5B-CUT-${TS}`, orderId, cutDate: new Date(),
        fabricIssued: 50, totalPcs: 400, status: 'planned',
      },
    })
    cutOrderId = cut.id
    const bundle = await db.cutBundle.create({
      data: { cutOrderId: cut.id, bundleNo: bundleKey, barcode: `*${bundleKey.replace(/[^A-Z0-9]/gi, '')}*`, qty: 120, status: 'in_cutting' },
    })
    bundleId = bundle.id
    // employee-type party (wage payment door)
    const party = await db.party.create({ data: { code: empParty, name: `M5B Operator Party ${TS}`, partyType: 'employee' } })
    empPartyId = party.id
    const g2 = await db.godown.findUnique({ where: { code: 'G2' } })
    godownG2Id = g2!.id
  })

  it('1. post_finished_goods — both doors, dept D5 injected', async () => {
    const base = { orderNo: ordNo, prodDate: '2026-08-27', bundleNo: `M5B-FG-A-${TS}`, operatorCode: OPERATOR, qty: 100, rate: 4 }
    const a = await agentDoor('post_finished_goods', base)
    const b = await formDoor(planFinishedGoods, { ...base, bundleNo: `M5B-FG-B-${TS}` })
    prodIds.push(a.id, b.id)
    const [rA, rB] = await Promise.all([
      db.productionEntry.findUnique({ where: { id: a.id }, include: { department: true } }),
      db.productionEntry.findUnique({ where: { id: b.id }, include: { department: true } }),
    ])
    expect(rA!.department?.code).toBe('D5') // the variant default injected
    expect(rB!.department?.code).toBe('D5')
    expect(pick(rA!, ['qty', 'rate', 'amount', 'rework'])).toEqual(pick(rB!, ['qty', 'rate', 'amount', 'rework']))
    expect(rA!.amount).toBe(400)
  })

  it('2. post_operation_entry — both doors, dept D4 injected', async () => {
    const base = { orderNo: ordNo, prodDate: '2026-08-27', bundleNo: `M5B-OP-A-${TS}`, operatorCode: OPERATOR, qty: 60, rate: 5 }
    const a = await agentDoor('post_operation_entry', base)
    const b = await formDoor(planOperationEntry, { ...base, bundleNo: `M5B-OP-B-${TS}` })
    prodIds.push(a.id, b.id)
    const [rA, rB] = await Promise.all([
      db.productionEntry.findUnique({ where: { id: a.id }, include: { department: true } }),
      db.productionEntry.findUnique({ where: { id: b.id }, include: { department: true } }),
    ])
    expect(rA!.department?.code).toBe('D4')
    expect(rB!.department?.code).toBe('D4')
    expect(rA!.amount).toBe(300)
  })

  it('3. scan_bundle — both doors; bundle lookup by no AND barcode; qty/rate defaults', async () => {
    const operator = await db.employee.findUnique({ where: { code: OPERATOR } })
    // by bundleNo (agent door) — qty+rate defaulted from bundle/operator master
    const a = await agentDoor('scan_bundle', { bundleNo: bundleKey, operatorCode: OPERATOR })
    prodIds.push(a.id)
    const rA = await db.productionEntry.findUnique({ where: { id: a.id }, include: { department: true, order: true } })
    expect(rA!.qty).toBe(120) // bundle qty default
    expect(rA!.rate).toBe(operator!.pieceRate) // operator piece-rate default
    expect(rA!.department?.code).toBe('D4')
    expect(rA!.order?.orderNo).toBe(ordNo)
    expect(rA!.bundleNo).toBe(bundleKey)
    // by BARCODE (form door) with explicit qty/rate
    const barcode = `*${bundleKey.replace(/[^A-Z0-9]/gi, '')}*`
    const b = await formDoor(planScanBundle, { bundleNo: barcode, operatorCode: OPERATOR, qty: 100, rate: 3 })
    prodIds.push(b.id)
    const rB = await db.productionEntry.findUnique({ where: { id: b.id } })
    expect(rB!.bundleNo).toBe(bundleKey) // barcode matched the SAME bundle
    expect(rB!.qty).toBe(100)
    expect(rB!.rate).toBe(3)
    // unknown bundle → structured error
    const miss = await planScanBundle({ bundleNo: 'NOPE-BUNDLE', operatorCode: OPERATOR })
    expect(miss.ok).toBe(false)
  })

  it('4. transfer_line_stock — both doors, -O/-I pair with ±qty and shared LT- ref', async () => {
    const a = await agentDoor('transfer_line_stock', { orderNo: ordNo, fromLineCode: 'L1', toLineCode: line2, qty: 50 })
    const b = await formDoor(planLineTransfer, { orderNo: ordNo, fromLineCode: 'L1', toLineCode: line2, qty: 30 })
    const [rowsA, rowsB] = await Promise.all([
      db.lineIssue.findMany({ where: { issueNo: { in: [`${a.ref}-O`, `${a.ref}-I`] } } }),
      db.lineIssue.findMany({ where: { issueNo: { in: [`${b.ref}-O`, `${b.ref}-I`] } } }),
    ])
    expect(rowsA).toHaveLength(2)
    expect(rowsB).toHaveLength(2)
    lineIssueIds.push(...rowsA.map((r) => r.id), ...rowsB.map((r) => r.id))
    const pairOf = (rows: typeof rowsA, qty: number) => {
      const out = rows.find((r) => r.issueNo.endsWith('-O'))!
      const inn = rows.find((r) => r.issueNo.endsWith('-I'))!
      return { out, inn, qty }
    }
    const pA = pairOf(rowsA, 50)
    const pB = pairOf(rowsB, 30)
    for (const p of [pA, pB]) {
      expect(p.out.qty).toBe(-p.qty)
      expect(p.inn.qty).toBe(p.qty)
      expect(p.out.lineId).toBe(line1Id)
      expect(p.inn.lineId).toBe(line2Id)
      expect(p.out.status).toBe('transferred')
      expect(p.inn.notes).toContain('Line transfer')
    }
    // same-line guard
    const same = await planLineTransfer({ orderNo: ordNo, fromLineCode: 'L1', toLineCode: 'L1', qty: 5 } as any)
    expect(same.ok).toBe(false)
  })

  it('5. return_jobwork_pcs — both doors, process_return GRN + ledger OUT of G2', async () => {
    const a = await agentDoor('return_jobwork_pcs', { partyCode: 'JW001', orderNo: ordNo, qty: 25, reason: 'stitch rework' })
    const b = await formDoor(planJobworkPcsReturn, { partyCode: 'JW001', orderNo: ordNo, qty: 15, retNo: `M5B-RET-${TS}` })
    grnIds.push(a.id, b.id)
    const [gA, gB] = await Promise.all([
      db.gRN.findUnique({ where: { id: a.id }, include: { lines: true } }),
      db.gRN.findUnique({ where: { grnNo: `M5B-RET-${TS}` } }),
    ])
    expect(gA!.grnType).toBe('process_return')
    expect(gA!.totalQty).toBe(25)
    expect(gA!.lines[0].itemType).toBe('pcs')
    expect(gB!.grnType).toBe('process_return')
    // ledger OUT of G2 (process_delivery)
    const ledger = await db.stockLedger.findMany({
      where: { txnType: 'process_delivery', itemType: 'pcs', docNo: { in: [gA!.grnNo, gB!.grnNo] } },
    })
    expect(ledger).toHaveLength(2)
    expect(ledger.every((l) => l.godownId === godownG2Id && l.outPcs > 0)).toBe(true)
    expect(ledger.reduce((s, l) => s + l.outPcs, 0)).toBe(40)
  })

  it('6. pay_wages — both doors, direction out + JV companion + party-ledger pickup', async () => {
    const a = await agentDoor('pay_wages', { partyCode: empParty, amount: 1200, mode: 'cash' })
    const b = await formDoor(planWagePayment, { partyCode: empParty, amount: 800 })
    paymentIds.push(a.id, b.id)
    const [pA, pB] = await Promise.all([
      db.payment.findUnique({ where: { id: a.id } }),
      db.payment.findUnique({ where: { id: b.id }, include: { party: true } }),
    ])
    expect(pA!.direction).toBe('out') // the variant pin
    expect(pB!.direction).toBe('out')
    expect(pB!.party.partyType).toBe('employee')
    expect(pB!.notes).toBe('Wage payment') // narration default
    // companion payment journals
    const jvs = await db.journal.findMany({ where: { partyId: empPartyId, voucherType: 'payment' } })
    expect(jvs.length).toBeGreaterThanOrEqual(2)
    journalIds.push(...jvs.map((j) => j.id))
    // §7-B-21: party-ledger math picks wage payments up automatically
    const ledger = await REGISTER_SERVICES['party-ledger']({ party: empParty, limit: 10, page: 1 })
    const row = ledger.rows.find((r) => r.code === empParty)
    expect(row).toBeTruthy()
    expect(Number(row!.paid)).toBe(2000)
  })

  it('7. panel-rej-rework variant: form door injects action=rework (document-only)', async () => {
    const res = await commitDocAction('panel-rej-rework', {
      header: { rejNo: rejPanel, orderNo: ordNo, qty: '12', rejType: 'stitch_fault' },
    })
    expect(res.ok).toBe(true)
    rejIds.push((res.doc as any).id)
    const rej = await db.rejectionEntry.findUnique({ where: { rejNo: rejPanel } })
    expect(rej!.action).toBe('rework')
    expect(rej!.rejType).toBe('stitch_fault')
    // document-only: no rejection_out ledger row for rework
    const ledger = await db.stockLedger.findMany({ where: { docNo: rejPanel } })
    expect(ledger).toHaveLength(0)
  })

  it('8. fabric-rejection-return variant: form door injects fabric + return_to_party (stock OUT)', async () => {
    const res = await commitDocAction('fabric-rejection-return', {
      header: { rejNo: rejFab, orderNo: ordNo, qty: '8' },
    })
    expect(res.ok).toBe(true)
    rejIds.push((res.doc as any).id)
    const rej = await db.rejectionEntry.findUnique({ where: { rejNo: rejFab } })
    expect(rej!.rejType).toBe('fabric')
    expect(rej!.action).toBe('return_to_party')
    const ledger = await db.stockLedger.findMany({ where: { docNo: rejFab, txnType: 'rejection_out' } })
    expect(ledger).toHaveLength(1)
    expect(ledger[0].outPcs).toBe(8)
  })

  it('9. pcs-shortage variant: form door injects rejType=shortage', async () => {
    const res = await commitDocAction('pcs-shortage', {
      header: { rejNo: rejShort, orderNo: ordNo, qty: '3', notes: 'missing at packing' },
    })
    expect(res.ok).toBe(true)
    rejIds.push((res.doc as any).id)
    const rej = await db.rejectionEntry.findUnique({ where: { rejNo: rejShort } })
    expect(rej!.rejType).toBe('shortage')
    // default action is scrap → stock written off OUT of G2
    const ledger = await db.stockLedger.findMany({ where: { docNo: rejShort, txnType: 'rejection_out' } })
    expect(ledger).toHaveLength(1)
  })

  it('10. variant configs delegate to the base services (no forks — §4 rule 1 source pin)', async () => {
    const fs = await import('node:fs')
    const prodSrc = fs.readFileSync('src/lib/erp/doc-configs/production-variants.ts', 'utf8')
    expect(prodSrc).toContain('planProductionEntry')
    expect(prodSrc).toContain('planScanBundle')
    const rejSrc = fs.readFileSync('src/lib/erp/doc-configs/rejection-variants.ts', 'utf8')
    expect(rejSrc).toContain('planRejection')
    const cutSrc = fs.readFileSync('src/lib/erp/doc-configs/cut-variants.ts', 'utf8')
    expect(cutSrc).toContain('planCutOrder')
    const wageSrc = fs.readFileSync('src/lib/erp/doc-configs/wage-payments.ts', 'utf8')
    expect(wageSrc).toContain('planWagePayment')
    const costSrc = fs.readFileSync('src/lib/erp/doc-configs/costing-input.ts', 'utf8')
    expect(costSrc).toContain('planCostSheet')
    // posting wrappers delegate to the base fns
    const postingProd = fs.readFileSync('src/lib/erp/posting/production.ts', 'utf8')
    expect(postingProd).toContain('return planProductionEntry({')
    const postingPay = fs.readFileSync('src/lib/erp/posting/payment.ts', 'utf8')
    expect(postingPay).toContain('return planPayment({')
  })

  it('11. wage bill journal (§7-B-20): planJournal Dr Production Wages / Cr Wage Payable for the period total', async () => {
    // the /hr/wages "Generate wage bill" button runs exactly this math
    const wages = await REGISTER_SERVICES['production-wages']({ order: ordNo, limit: 100, page: 1 })
    const total = Math.round(Number((wages.totals ?? []).find((t) => t.label.startsWith('Wages'))?.value ?? 0))
    expect(total).toBeGreaterThan(0)
    const plan = await planJournal({
      voucherType: 'journal',
      debitAccount: 'Production Wages',
      creditAccount: 'Wage Payable',
      amount: total,
      narration: `Wage bill ${ordNo} (${wages.count} operators)`,
    })
    expect(plan.ok).toBe(true)
    const committed = await plan.commit()
    journalIds.push((committed as any).id)
    const jv = await db.journal.findUnique({ where: { id: (committed as any).id } })
    expect(jv!.debitAccount).toBe('Production Wages')
    expect(jv!.creditAccount).toBe('Wage Payable')
    expect(jv!.amount).toBe(total)
  })

  afterAll(async () => {
    const sw = (p: Promise<unknown>) => p.catch(() => {})
    await sw(db.journal.deleteMany({ where: { id: { in: journalIds } } }))
    await sw(db.payment.deleteMany({ where: { id: { in: paymentIds } } }))
    await sw(db.stockLedger.deleteMany({ where: { docNo: { in: [`M5B-RET-${TS}`, rejFab, rejShort] } } }))
    await sw(db.rejectionEntry.deleteMany({ where: { id: { in: rejIds } } }))
    for (const gid of grnIds) {
      await sw(db.gRNLine.deleteMany({ where: { grnId: gid } }))
      await sw(db.gRN.deleteMany({ where: { id: gid } }))
    }
    await sw(db.lineIssue.deleteMany({ where: { id: { in: lineIssueIds } } }))
    // stock side-effects of the fixture (G2 production_in + returns + rejections)
    await sw(db.stockLedger.deleteMany({ where: { itemId: orderId } }))
    await sw(db.currentStock.deleteMany({ where: { itemId: orderId } }))
    await sw(db.productionEntry.deleteMany({ where: { id: { in: prodIds } } }))
    await sw(db.cutBundle.deleteMany({ where: { id: bundleId } }))
    await sw(db.cutOrder.deleteMany({ where: { id: cutOrderId } }))
    await sw(db.line.deleteMany({ where: { id: line2Id } }))
    await sw(db.party.deleteMany({ where: { id: empPartyId } }))
    await sw(db.order.deleteMany({ where: { id: orderId } }))
    await sw(db.style.deleteMany({ where: { styleNo: styNo } }))
  })
})
