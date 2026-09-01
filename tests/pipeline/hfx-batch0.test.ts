/**
 * HFX Batch 0 regression suite — Phase-6B Remediation Spec §3 (HFX-01…HFX-19).
 * One pin per hotfix, each tied to the cited file:line evidence. Behavioral
 * tests exercise the REAL posting services / register services against the
 * pinned test DB (HFX-13); transport/UI-layer fixes that cannot run headless
 * (streaming route, panel render) are pinned by source-contract tests — the
 * established static-check pattern (eval --static / digest pins).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { db } from '@/lib/db'
import { planGrn } from '@/lib/erp/posting/grn'
import { planPcsDespatch } from '@/lib/erp/posting/despatch'
import { planJournal } from '@/lib/erp/posting/journal'
import { planPayment } from '@/lib/erp/posting/payment'
import { planPoLifecycle } from '@/lib/erp/posting/lifecycle'
import { getPartyLedgerSummary, queryPartyLedger } from '@/lib/erp/registers/party-ledger'
import { queryBillsRegister } from '@/lib/erp/registers/bills'
import { invoiceRecon } from '@/lib/erp/registers/recon'
import { queryOutstandingSummary } from '@/lib/erp/reports/chain-money-reports'
import { queryDailyPnl } from '@/lib/erp/reports/chain-money-reports'
import { getOrderBudgetActual } from '@/lib/erp/registers/budget'
import { valueBucket } from '@/lib/erp/valuation'
import { appendDelta, mergeNarration } from '@/lib/agent/narration'
import { JOBWORK_STATUS, PO_STATUS } from '@/lib/erp/enums'
import { partyConfig } from '@/lib/erp/master-configs/party'
import { paymentConfig } from '@/lib/erp/doc-configs/payment'
import { wagePaymentsConfig } from '@/lib/erp/doc-configs/wage-payments'
import { jobworkRegisterConfig } from '@/lib/erp/register-configs/jobwork-register'

const TS = Date.now()
const PARTY = `HFXP-${TS}`
const GODOWN = `HFXG-${TS}`
const PO_MULTI = `HFX-PO-M-${TS}`
const PO_CANCEL = `HFX-PO-X-${TS}`
const PO_LIFE = `HFX-PO-L-${TS}`
const ORDER = `HFX-ORD-${TS}`
const DC = `HFX-DC-${TS}`
const INV_LIVE = `HFX-INV-A-${TS}`
const INV_DEAD = `HFX-INV-B-${TS}`
const RCP_ONACCOUNT = `HFX-RCP-OA-${TS}`
const PMT_OUT_TAGGED = `HFX-PMT-OUT-${TS}`
const JV = `HFX-JV-${TS}`

/** cwd-relative source read (the doc-parity pattern — vitest cwd is the repo root). */
const read = (rel: string) => readFileSync(rel, 'utf8')

describe('HFX Batch 0 — correctness one-liners', () => {
  let partyId = ''
  let godownId = ''
  let orderId = ''
  let invoiceId = ''
  let styleId = ''

  beforeAll(async () => {
    const party = await db.party.create({ data: { code: PARTY, name: `HFX Party ${TS}`, partyType: 'both', openingBalance: 0 } })
    partyId = party.id
    const godown = await db.godown.create({ data: { code: GODOWN, name: `HFX Godown ${TS}` } })
    godownId = godown.id
    const buyer = await db.buyer.findUnique({ where: { code: 'B001' } })
    if (!buyer) throw new Error('seed buyer B001 missing')
    const style = await db.style.create({ data: { styleNo: `HFXS-${TS}`, description: `HFX style ${TS}`, buyerId: buyer.id } })
    styleId = style.id
    const order = await db.order.create({
      data: { orderNo: ORDER, buyerId: buyer.id, styleId, status: 'open', totalPcs: 100, totalValue: 20000, finYear: 'FY26' },
    })
    orderId = order.id

    // HFX-01 fixtures: a 2-line PO (the corruption case) + a cancelled PO
    const poMulti = await db.purchaseOrder.create({
      data: { poNo: PO_MULTI, poType: 'yarn', partyId, status: 'open', totalQty: 20, totalValue: 3000, finYear: 'FY26' },
    })
    await db.pOLine.createMany({
      data: [
        { poId: poMulti.id, itemType: 'yarn', itemId: `HFXY-${TS}`, qty: 10, rate: 100, amount: 1000 },
        { poId: poMulti.id, itemType: 'yarn', itemId: `HFXY2-${TS}`, qty: 10, rate: 200, amount: 2000 },
      ],
    })
    const poCancel = await db.purchaseOrder.create({
      data: { poNo: PO_CANCEL, poType: 'yarn', partyId, status: 'cancelled', totalQty: 10, totalValue: 1000, finYear: 'FY26' },
    })
    await db.pOLine.create({ data: { poId: poCancel.id, itemType: 'yarn', itemId: `HFXY-${TS}`, qty: 10, rate: 100, amount: 1000 } })

    // HFX-10 fixture: open PO with a receipt (so 'complete' is legal)
    const poLife = await db.purchaseOrder.create({
      data: { poNo: PO_LIFE, poType: 'yarn', partyId, status: 'partial', totalQty: 10, totalValue: 1000, finYear: 'FY26' },
    })
    await db.pOLine.create({ data: { poId: poLife.id, itemType: 'yarn', itemId: `HFXY-${TS}`, qty: 10, rate: 100, amount: 1000 } })
    await db.gRN.create({
      data: { grnNo: `HFX-GRN-${TS}`, grnType: 'purchase', poId: poLife.id, partyId, godownId, totalQty: 6, totalValue: 600, finYear: 'FY26' },
    })

    // HFX-03/04/05 fixtures: live invoice + cancelled invoice + payments
    const invLive = await db.salesInvoice.create({
      data: { invoiceNo: INV_LIVE, orderId, partyId, invoiceDate: new Date(), billAmount: 5000, totalQty: 50, status: 'issued', finYear: 'FY26' },
    })
    invoiceId = invLive.id
    await db.salesInvoice.create({
      data: { invoiceNo: INV_DEAD, orderId, partyId, invoiceDate: new Date(), billAmount: 7777, totalQty: 50, status: 'cancelled', finYear: 'FY26' },
    })
    // on-account receipt (direction in, NO invoiceId) — HFX-05
    await db.payment.create({
      data: { voucherNo: RCP_ONACCOUNT, partyId, direction: 'in', amount: 1000, payDate: new Date(), finYear: 'FY26' },
    })
    // out-payment WRONGLY tagged with the sales invoice — HFX-04
    await db.payment.create({
      data: { voucherNo: PMT_OUT_TAGGED, partyId, direction: 'out', amount: 500, invoiceId, payDate: new Date(), finYear: 'FY26' },
    })
  })

  afterAll(async () => {
    // surgical cleanup (the register-services pattern)
    await db.payment.deleteMany({ where: { partyId } })
    await db.salesInvoice.deleteMany({ where: { partyId } })
    await db.gRN.deleteMany({ where: { partyId } })
    await db.pOLine.deleteMany({ where: { po: { partyId } } })
    await db.purchaseOrder.deleteMany({ where: { partyId } })
    await db.pcsDespatch.deleteMany({ where: { orderId } })
    await db.order.deleteMany({ where: { id: orderId } })
    await db.style.deleteMany({ where: { id: styleId } })
    await db.godown.deleteMany({ where: { id: godownId } })
    await db.party.deleteMany({ where: { id: partyId } })
  })

  // ---- HFX-01: GRN guard (AMENDED at M41/PRC-01 — the multi-line refusal
  // is RETIRED: multi-line POs are now receivable via lines[]; the header-qty
  // path refuses with the WHICH-LINE guidance; the terminal-status guard
  // (HFX-01b) stays verbatim) ----
  it('HFX-01 (M41): a header qty on a multi-line PO names the ambiguity; a cancelled PO quotes the status', async () => {
    const multi = await planGrn({ poNo: PO_MULTI, godownCode: GODOWN, receivedQty: 5 })
    expect(multi.ok).toBe(false)
    expect(multi.error).toContain('2 lines')
    expect(multi.error).toContain('pass lines[]')

    const dead = await planGrn({ poNo: PO_CANCEL, godownCode: GODOWN, receivedQty: 5 })
    expect(dead.ok).toBe(false)
    expect(dead.error).toContain('cancelled')
  })

  // ---- HFX-02: DC line colour & size persist ----
  it('HFX-02: planPcsDespatch commits colourId/sizeId on PcsDespatchLine', async () => {
    const colour = await db.colour.create({ data: { name: `HFX Red ${TS}`, code: `HFXC-${TS}` } })
    const size = await db.size.create({ data: { name: `HFX M ${TS}`, sort: 901 } })
    try {
      const plan = await planPcsDespatch({
        orderNo: ORDER,
        totalPcs: 10,
        dcNo: DC,
        lines: [{ styleNo: `HFXS-${TS}`, colourName: colour.name, sizeName: size.name, qty: 10, rate: 5 }],
      })
      expect(plan.ok).toBe(true)
      const committed: any = await plan.commit!()
      const line = await db.pcsDespatchLine.findFirst({ where: { pcsDespatchId: committed.id } })
      expect(line).toBeTruthy()
      expect(line!.colourId).toBe(colour.id) // persisted, not dropped
      expect(line!.sizeId).toBe(size.id)
    } finally {
      await db.pcsDespatchLine.deleteMany({ where: { pcsDespatch: { dcNo: DC } } })
      await db.pcsDespatch.deleteMany({ where: { dcNo: DC } })
      await db.colour.deleteMany({ where: { id: colour.id } })
      await db.size.deleteMany({ where: { id: size.id } })
    }
  })

  // ---- HFX-03: cancelled docs excluded from party ledger + bills register ----
  it('HFX-03: a cancelled invoice leaves every money screen (ledger billed excludes it; bills totals exclude it)', async () => {
    const summary = await getPartyLedgerSummary(partyId)
    expect(summary).toBeTruthy()
    expect(summary!.totalBilled).toBe(5000) // 5000 live — the cancelled 7777 is OUT
    const ledger = await queryPartyLedger({ party: PARTY, limit: 50, page: 1 } as never)
    const lrow = ledger.rows.find((r) => r.party === `HFX Party ${TS}`)
    expect(lrow).toBeTruthy()
    expect(lrow!.billed).toBe(5000)

    const bills = await queryBillsRegister({ party: PARTY, limit: 100, page: 1 } as never)
    expect(bills.rows.some((r) => r.docNo === INV_DEAD)).toBe(false) // row gone
    expect(bills.rows.some((r) => r.docNo === INV_LIVE)).toBe(true) // live stays
    const billed = bills.totals?.find((t) => t.label === 'Billed')?.value
    expect(billed).toBe(5000) // totals exclude the cancelled bill
  })

  // ---- HFX-04: payment direction filters ----
  it('HFX-04: an out-payment tagged with the invoice does NOT reduce AR (recon + outstanding)', async () => {
    const recon = await invoiceRecon(invoiceId)
    expect(recon).toBeTruthy()
    expect(recon!.balance).toBe(5000) // 5000 − 0 collected (the 500 out-payment never settles AR)

    const out = await queryOutstandingSummary({ party: PARTY, limit: 50, page: 1 } as never)
    const ar = out.rows.find((r) => r.type === 'AR')
    expect(ar).toBeTruthy()
    // settled = the 1000 on-account receipt ONLY (HFX-05). If the 500 tagged
    // OUT-payment still counted (the HFX-04 bug), settled would be 1500.
    expect(ar!.settled).toBe(1000)
  })

  // ---- HFX-05: on-account receipts consumed ----
  it('HFX-05: the on-account 1000 receipt reduces the party AR outstanding to 4000', async () => {
    const out = await queryOutstandingSummary({ party: PARTY, limit: 50, page: 1 } as never)
    const ar = out.rows.find((r) => r.type === 'AR')
    expect(ar).toBeTruthy()
    expect(ar!.outstanding).toBe(4000) // 5000 billed − 1000 on-account
    expect(ar!.settled).toBe(1000)
    // aging buckets sum to the outstanding (FIFO application)
    expect((ar!.b0 as number) + (ar!.b1 as number) + (ar!.b2 as number) + (ar!.b3 as number)).toBe(4000)
  })

  // ---- HFX-06: payment modes rtgs/neft ----
  it('HFX-06: mode selects offer cash|bank|cheque|rtgs|neft|upi and an rtgs payment commits', async () => {
    const modes = (cfg: typeof paymentConfig) =>
      cfg.headerFields.find((f) => f.name === 'mode')!.options!.map((o) => o.value)
    expect(modes(paymentConfig)).toEqual(['cash', 'bank', 'cheque', 'rtgs', 'neft', 'upi'])
    expect(modes(wagePaymentsConfig)).toEqual(['cash', 'bank', 'cheque', 'rtgs', 'neft', 'upi'])

    const plan = await planPayment({ partyCode: PARTY, amount: 250, direction: 'out', mode: 'rtgs', voucherNo: `HFX-PMT-RTGS-${TS}` })
    expect(plan.ok).toBe(true)
    const committed: any = await plan.commit!()
    const pay = await db.payment.findUnique({ where: { id: committed.id } })
    expect(pay!.mode).toBe('rtgs') // commits as given
    await db.journal.deleteMany({ where: { partyId } })
    await db.payment.deleteMany({ where: { id: committed.id } })
  })

  // ---- HFX-07: wage-payment party picker alignment ----
  it('HFX-07: the Party master can produce partyType=employee (the wage-picker filter)', async () => {
    const opts = partyConfig.fields.find((f) => f.name === 'partyType')!.options!.map((o) => o.value)
    expect(opts).toContain('employee')
    // and the wage-payment picker filter targets exactly that value
    const picker = wagePaymentsConfig.headerFields.find((f) => f.name === 'partyCode')!
    expect(picker.pickerFilter).toEqual({ field: 'partyType', value: 'employee' })
  })

  // ---- HFX-08: journal sideEffects honest ----
  it('HFX-08: planJournal claims only true side effects (no cash/bank lie)', async () => {
    const plan = await planJournal({
      voucherType: 'journal',
      debitAccount: 'Sundry Debtors',
      creditAccount: 'Sales',
      amount: 100,
      partyCode: PARTY,
      voucherNo: JV,
      narration: 'HFX-08 fixture',
    })
    expect(plan.ok).toBe(true)
    expect(plan.sideEffects).not.toContain('Cash/bank balance updated')
    expect(plan.sideEffects).toContain('Party ledger reflects this voucher')
    await db.journal.deleteMany({ where: { voucherNo: JV } })
  })

  // ---- HFX-09: kill the 'billed' ghost ----
  // M39 (JWL-06) RETIRES this hotfix: bill_jobwork now writes 'billed', so the
  // filter option + enum state return — every filter option has a writer again.
  it('HFX-09 (retired by JWL-06): billed is a REAL state — the filter selects it, the enum lists it, a writer exists', () => {
    const statusFilter = jobworkRegisterConfig.filters.find((f) => f.key === 'status')!
    const values = statusFilter.options!.map((o) => o.value)
    expect(values).toContain('billed') // written by bill_jobwork (JWL-06)
    expect(JOBWORK_STATUS).toContain('billed') // the enum agrees
    // and the writer is real: the posting module exports planJobworkBill
    // (source-contract pin — the headless layer is covered in jwl-batch3)
    const src = readFileSync(join(process.cwd(), 'src/lib/erp/posting/jobwork-bill.ts'), 'utf8')
    expect(src).toContain("status: 'billed'")
    expect(src).toContain('billedInvoiceNo')
  })

  // ---- HFX-10: PO status enum drift ----
  it('HFX-10: completing a PO writes received — a PO_STATUS enum value, never completed', async () => {
    const plan = await planPoLifecycle({ poNo: PO_LIFE, action: 'complete' })
    expect(plan.ok).toBe(true)
    expect(plan.updates![0].data).toEqual({ status: 'received' })
    expect(plan.summary).toContain('→ received')
    expect(PO_STATUS).not.toContain('completed') // the enum contract itself
    await plan.commit!()
    const po = await db.purchaseOrder.findUnique({ where: { poNo: PO_LIFE } })
    expect(po!.status).toBe('received')
    expect(PO_STATUS).toContain(po!.status as never) // live value IS in the enum
  })

  // ---- HFX-11: valuation uom-mixing ----
  it('HFX-11: valueBucket values each uom as its own qty×rate term (mixed bucket: 320, dimension-explicit)', () => {
    const mixed = valueBucket({ kgs: 100, mtrs: 50, pcs: 10, rate: 2 })
    // per-uom form: 100×2 + 50×2 + 10×2 — NOT a unit-mismatch; pinned so the
    // WAC work (per-uom rates) changes valueBucket alone
    expect(mixed).toBe(320)
    expect(valueBucket({ kgs: 0, mtrs: 0, pcs: 0, rate: 9 })).toBe(0)
    expect(valueBucket({ kgs: 5, mtrs: 0, pcs: 0, rate: 3.5 })).toBeCloseTo(17.5, 9)
    // the shared helper is what the screens call (source pins)
    const dash = read('src/lib/erp/dashboard.ts')
    expect(dash).toContain('valueBucket(st)')
    const stockReg = read('src/lib/erp/registers/stock-register.ts')
    expect(stockReg).toContain('valueBucket(s)')
    expect(dash).not.toContain('(st.kgs + st.mtrs + st.pcs) * st.rate')
    expect(stockReg).not.toContain('qty * s.rate')
  })

  // ---- HFX-12: shiftWages readers → amount ----
  it('HFX-12: daily-pnl wages and margin are non-zero for a day with production; budget wage field reads Σ amount', async () => {
    const dept = await db.department.create({ data: { code: `HFXD-${TS}`, name: `HFX Dept ${TS}` } })
    try {
      // qty 10 @ piece rate 12 → amount 120 (the wage posted). Order contract
      // rate 20000/100 = 200 → produced 2000, margin 1880 — both non-zero.
      await db.productionEntry.create({
        data: { orderId, deptId: dept.id, qty: 10, rate: 12, amount: 120, prodDate: new Date('2024-03-15') },
      })
      const pnl = await queryDailyPnl({ from: new Date('2024-03-01'), to: new Date('2024-03-31'), limit: 50, page: 1 } as never)
      const row = pnl.rows.find((r: any) => r.dept === dept.code)
      expect(row).toBeTruthy()
      expect(row!.wages).toBe(120) // the piece-rate wage actually posted
      expect(row!.produced).toBe(2000) // qty × contract rate
      expect(row!.margin).toBe(1880) // non-zero — the spread
      expect(row!.wages).not.toBe(0)
      expect(row!.margin).not.toBe(0)

      const budget = await getOrderBudgetActual(orderId)
      expect(budget).toBeTruthy()
      expect(budget!.shiftWages).toBe(120) // reads amount — the dead column is out
      expect(budget!.actual).toBe(budget!.poValue + 120) // no double-count of the wage
    } finally {
      await db.productionEntry.deleteMany({ where: { orderId, deptId: dept.id } })
      await db.department.deleteMany({ where: { id: dept.id } })
    }
  })

  // ---- HFX-13: vitest pinned off the production DB ----
  it('HFX-13: this run connects to db/test.db — never db/custom.db', async () => {
    expect(process.env.DATABASE_URL).toContain('test.db')
    expect(process.env.DATABASE_URL).not.toContain('custom.db')
    const rows = (await db.$queryRawUnsafe('PRAGMA database_list')) as { name: string; file: string }[]
    const main = rows.find((r) => r.name === 'main')
    expect(main).toBeTruthy()
    expect(main!.file).toContain('test.db')
    expect(main!.file).not.toContain('custom.db')
  })
})

describe('HFX Batch 0 — agent render stack (source-contract pins)', () => {
  const route = read('src/app/api/agent/route.ts')
  const panel = read('src/components/agent/agent-panel.tsx')
  const sheet = read('src/components/ui/sheet.tsx')

  // ---- HFX-14: real streaming, newline fidelity ----
  it('HFX-14: route streams for real — stream:true, no stream:false, no /.{1,4}/g chunker', () => {
    expect(route).toContain('stream: true')
    expect(route).not.toContain('stream: false')
    // the fake chunker whose `.` never matched \n (newline deletion in transport)
    expect(route).not.toMatch(/\.\{1,4\}/g)
    expect(route).toContain('newline-faithful passthrough')
  })

  // ---- HFX-15: markdown + GFM rendering ----
  it('HFX-15: assistant text renders via react-markdown + remark-gfm (no raw-text render)', () => {
    expect(panel).toContain("import ReactMarkdown from 'react-markdown'")
    expect(panel).toContain("import remarkGfm from 'remark-gfm'")
    expect(panel).toContain('<ReactMarkdown remarkPlugins={[remarkGfm]}>')
    expect(panel).not.toMatch(/text-sm text-slate-800 whitespace-pre-wrap">\{m\.text\}/)
  })

  // ---- HFX-16: narration not overwritten ----
  it('HFX-16: narration segments keyed per text id merge in order (pure helpers + panel wiring)', () => {
    const segments = new Map<string, string>()
    appendDelta(segments, 'text-1', 'Let me check stock…')
    appendDelta(segments, 'text-2', 'Here is what I found.')
    expect(mergeNarration(segments)).toBe('Let me check stock…\n\nHere is what I found.')
    // the panel uses the helpers (no currentTextBuffer replace-on-delta)
    expect(panel).toContain('appendDelta(segments')
    expect(panel).toContain('mergeNarration(segments)')
    expect(panel).not.toContain('currentTextBuffer')
  })

  // ---- HFX-17: auto-scroll works ----
  it('HFX-17: the scroll effect targets the Radix Viewport, not the content div', () => {
    expect(panel).toContain('scroll-area-viewport')
    expect(panel).toContain('target.scrollTop = target.scrollHeight')
  })

  // ---- HFX-18: non-OK responses surface inline ----
  it('HFX-18: res.ok is checked and errors render an inline chip with Retry', () => {
    expect(panel).toContain('if (!res.ok) {')
    expect(panel).toContain('data-testid="agent-stream-error"')
    expect(panel).toContain('Retry')
  })

  // ---- HFX-19: one close control ----
  it('HFX-19: exactly one close affordance — the sheet primitive X, not a panel twin', () => {
    expect(sheet).toContain('SheetPrimitive.Close') // the universal X stays
    // the panel's own header X button is gone (the old duplicate)
    expect(panel).not.toMatch(/<Button[^>]*onClick=\{\(\) => onOpenChange\(false\)\}\s*>\s*<X className="h-4 w-4" \/>/)
    // and exactly ONE <X icon button remains in the header region... the chip
    // dismiss + reject buttons use X at other sizes — pin the header twin by
    // its exact className signature:
    expect(panel).not.toContain('<X className="h-4 w-4" />')
  })
})
