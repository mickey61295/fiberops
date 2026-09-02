/**
 * INV Batch 6 (Phase-6B, SPEC-M42) — the stock take & valuation unification tier:
 *   INV-01  stock take cycle (ST-#### open→counting→draft→committed; variance ADJs)
 *   INV-02  ONE WAC valuation (bumpStock moving average == closing-stock replay == register)
 *   INV-03  no silent truncation (groupBy aggregates + batched unbounded replay)
 *   INV-04  negative-stock guard (block_negative_stock flag at postLedger)
 *   INV-05  waste as an identity (waste godown + scrap rate + the waste-% KPI register)
 *   INV-06  ledger ↔ CurrentStock drift (compareStockDrift + MIS card + digest section)
 *   INV-07  opening stock FY window gate (opn_fy_gate + opn_fy_window_days)
 *   INV-08  hot-path indexes (schema pins) + source contracts
 *
 * Spec §15 loop-closure #6 (physical reality ↔ ledger):
 *   seed stock → ST- created → short counts recorded → committed → ADJ- legs
 *   reference the ST- → CurrentStock equals the counts → closing-stock agrees.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { db } from '@/lib/db'
import { postLedger } from '@/lib/erp/posting/ledger'
import { planStockTake, planStockTakeCount, planStockTakeAdvance } from '@/lib/erp/posting/stock-take'
import { planWasteReceipt, planOpeningStock } from '@/lib/erp/posting/stock-adj'
import { setFlag } from '@/lib/erp/flags'
import { queryClosingStock } from '@/lib/erp/registers/closing-stock'
import { queryCurrentStock } from '@/lib/erp/registers/current-stock'
import { queryItemwiseStock } from '@/lib/erp/registers/itemwise-stock'
import { queryWastePercent } from '@/lib/erp/registers/waste-percent'
import { compareStockDrift } from '@/lib/erp/registers/recon'
import { buildDigest } from '@/lib/erp/notifications/digest'
import { fetchStockTakePrint } from '@/lib/erp/print/fetchers-b'
import { getDashboardSnapshot } from '@/lib/erp/dashboard'
import { getTool, allTools } from '@/lib/agent/tools'
import { wacStep } from '@/lib/erp/valuation'

const TS = Date.now()
const G1 = `M42-G1-${TS}`           // loop-closure #6 godown
const Y1 = `M42-Y1-${TS}`           // loop-closure #6 yarn
const F1 = `M42-F1-${TS}`           // loop-closure #6 fabric (multi-uom bucket)
const G2 = `M42-G2-${TS}`           // golden WAC godown
const Y2 = `M42-Y2-${TS}`           // golden WAC yarn
const G3 = `M42-G3-${TS}`           // 5201-row completeness godown
const Y3 = `M42-Y3-${TS}`           // 5201-row yarn
const G4 = `M42-G4-${TS}`           // negative-guard godown
const Y4 = `M42-Y4-${TS}`           // negative-guard yarn
const G5 = `M42-G5-${TS}`           // waste-% godown (process receipts)
const Y5 = `M42-Y5-${TS}`           // waste-% yarn (with receipts)
const Y5B = `M42-Y5B-${TS}`         // waste-% yarn (zero receipts → % = '—')
const G6 = `M42-G6-${TS}`           // drift godown
const Y6 = `M42-Y6-${TS}`           // drift yarn
const G7 = `M42-G7-${TS}`           // OPN gate godown
const Y7 = `M42-Y7-${TS}`           // OPN gate yarn
const G7B = `M42-G7B-${TS}`         // OPN gate leg 2 (window widened)
const Y7B = `M42-Y7B-${TS}`         // OPN gate leg 2 yarn

const ERP_DIR = join(process.cwd(), 'src/lib/erp')
const src = (p: string) => readFileSync(join(ERP_DIR, p), 'utf8')
const prismaSrc = readFileSync(join(process.cwd(), 'prisma/schema.prisma'), 'utf8')

const allGodowns = [G1, G2, G3, G4, G5, G6, G7, G7B]
const allYarns = [Y1, Y2, Y3, Y4, Y5, Y5B, Y6, Y7, Y7B]
let g1Id = '', g2Id = '', g3Id = '', g4Id = '', g5Id = '', g6Id = '', g7Id = '', g7bId = ''
let y1Id = '', y2Id = '', y3Id = '', y4Id = '', y5Id = '', y5bId = '', y6Id = '', y7Id = '', y7bId = ''
let f1Id = ''

async function commit<T>(planOrPromise: any): Promise<T> {
  const plan = await planOrPromise
  if (!plan.ok) throw new Error(`plan failed: ${plan.error ?? JSON.stringify(plan).slice(0, 300)}`)
  return plan.commit!()
}

describe('INV Batch 6 — SPEC-M42 stock take & valuation unification', () => {
  beforeAll(async () => {
    const uom = (await db.uOM.findFirst({ where: { code: 'KGS' } })) ?? (await db.uOM.create({ data: { code: 'KGS', name: 'Kgs' } }))
    const mkGodown = async (code: string) => (await db.godown.create({ data: { code, name: `M42 ${code}` } })).id
    ;[g1Id, g2Id, g3Id, g4Id, g5Id, g6Id, g7Id, g7bId] = await Promise.all(allGodowns.map(mkGodown))
    const mkYarn = async (code: string) => (await db.yarn.create({ data: { code, count: '30s', uomId: uom.id, rate: 0 } })).id
    ;[y1Id, y2Id, y3Id, y4Id, y5Id, y5bId, y6Id, y7Id, y7bId] = await Promise.all(allYarns.map(mkYarn))
    const f = await db.fabric.create({ data: { code: F1, gsm: 180, width: 24, uomId: uom.id, rate: 0 } })
    f1Id = f.id
  })

  afterAll(async () => {
    // flags restored first (order matters for later suites)
    await setFlag('block_negative_stock', false)
    await setFlag('opn_fy_gate', false)
    await setFlag('opn_fy_window_days', 30)
    const godownIds = [g1Id, g2Id, g3Id, g4Id, g5Id, g6Id, g7Id, g7bId]
    const yarnIds = [y1Id, y2Id, y3Id, y4Id, y5Id, y5bId, y6Id, y7Id, y7bId]
    await db.stockTake.deleteMany({ where: { godownId: { in: godownIds } } }).catch(() => {}) // lines cascade
    await db.stockLedger.deleteMany({ where: { godownId: { in: godownIds } } }).catch(() => {})
    await db.stockLedger.deleteMany({ where: { AND: [{ docNo: { startsWith: 'WST-' } }, { itemId: { in: yarnIds } }] } }).catch(() => {}) // waste lands in the WASTE store
    await db.currentStock.deleteMany({ where: { OR: [
      { AND: [{ itemType: 'yarn' }, { itemId: { in: yarnIds } }] },
      { AND: [{ itemType: 'fabric' }, { itemId: f1Id }] },
    ] } }).catch(() => {})
    await db.fabric.deleteMany({ where: { id: f1Id } }).catch(() => {})
    await db.yarn.deleteMany({ where: { id: { in: yarnIds } } }).catch(() => {})
    await db.godown.deleteMany({ where: { id: { in: godownIds } } }).catch(() => {})
    await db.$disconnect()
  })

  // ─────────────────────────────────────────────────────────────
  // INV-01 — the stock take cycle (loop-closure #6)
  // ─────────────────────────────────────────────────────────────
  describe('INV-01 — stock take cycle (loop-closure #6: physical reality ↔ ledger)', () => {
    let stNo = ''

    it('seeds: 100 kgs yarn @10 + 80 kgs / 60 mtrs fabric @20 into the godown', async () => {
      await db.$transaction(async (tx) => {
        await postLedger(tx, { txnType: 'opening', itemType: 'yarn', itemId: y1Id, godownId: g1Id, docNo: `M42-SEED-Y-${TS}`, docDate: new Date('2026-08-01'), rate: 10, in: { kgs: 100 } })
        await postLedger(tx, { txnType: 'opening', itemType: 'fabric', itemId: f1Id, godownId: g1Id, docNo: `M42-SEED-F-${TS}`, docDate: new Date('2026-08-01'), rate: 20, in: { kgs: 80, mtrs: 60 } })
      })
      const y = await db.currentStock.findFirst({ where: { itemType: 'yarn', itemId: y1Id, godownId: g1Id } })
      const f = await db.currentStock.findFirst({ where: { itemType: 'fabric', itemId: f1Id, godownId: g1Id } })
      expect(y?.kgs).toBe(100)
      expect(f?.kgs).toBe(80)
      expect(f?.mtrs).toBe(60)
    })

    it('create guards: unknown godown + empty godown refuse with guidance', async () => {
      const bad = await planStockTake({ godownCode: 'NOPE-M42' })
      expect(bad.ok).toBe(false)
      if (!bad.ok) expect(bad.error).toContain('not found')
      const empty = await db.godown.create({ data: { code: `M42-EMPTY-${TS}`, name: 'empty' } })
      const none = await planStockTake({ godownCode: `M42-EMPTY-${TS}` })
      expect(none.ok).toBe(false)
      if (!none.ok) expect(none.error).toContain('something to count')
      await db.godown.deleteMany({ where: { id: empty.id } })
    })

    it('create: snapshots every live bucket of the godown (all four uoms, status open)', async () => {
      const plan = await planStockTake({ godownCode: G1, notes: 'M42 cycle count' })
      expect(plan.ok).toBe(true)
      if (!plan.ok) return
      const takeRow = plan.creates?.find((c: any) => c.table === 'stockTake')
      expect(takeRow?.data.takeNo).toMatch(/^ST-\d{4}$/)
      expect(takeRow?.data.status).toBe('open')
      const lines = plan.creates?.filter((c: any) => c.table === 'stockTakeLine') ?? []
      expect(lines).toHaveLength(2) // yarn + fabric buckets
      const fab = lines.find((l: any) => l.data.itemType === 'fabric')
      expect(fab?.data.systemKgs).toBe(80)
      expect(fab?.data.systemMtrs).toBe(60)
      const res = await plan.commit()
      stNo = (res as any).takeNo
      expect(stNo).toMatch(/^ST-\d{4}$/)
    })

    it('count guards: unknown item, duplicate line, empty values, and state (draft/committed) refuse', async () => {
      const badItem = await planStockTakeCount({ takeNo: stNo, lines: [{ itemType: 'yarn', itemCode: 'NOPE-M42', kgs: 1 }] })
      expect(badItem.ok).toBe(false)
      if (!badItem.ok) expect(badItem.error).toContain('no yarn line')
      const dup = await planStockTakeCount({ takeNo: stNo, lines: [
        { itemType: 'yarn', itemCode: Y1, kgs: 1 },
        { itemType: 'yarn', itemCode: Y1, kgs: 2 },
      ] })
      expect(dup.ok).toBe(false)
      if (!dup.ok) expect(dup.error).toContain('Duplicate')
      const empty = await planStockTakeCount({ takeNo: stNo, lines: [{ itemType: 'yarn', itemCode: Y1 }] })
      expect(empty.ok).toBe(false)
    })

    it('count: physical reality onto the sheet — yarn 93 (short 7), fabric 80 kgs / 55 mtrs (short 5 mtrs)', async () => {
      const res = await commit(planStockTakeCount({ takeNo: stNo, lines: [
        { itemType: 'yarn', itemCode: Y1, kgs: 93 },
        { itemType: 'fabric', itemCode: F1, kgs: 80, mtrs: 55 },
      ] }))
      expect((res as any).lines).toBe(2)
      const line = await db.stockTakeLine.findFirst({ where: { take: { takeNo: stNo }, itemType: 'yarn' } })
      expect(line?.countedKgs).toBe(93)
    })

    it('advance guard: state graph is one legal step at a time (open → draft refuses)', async () => {
      const skip = await planStockTakeAdvance({ takeNo: stNo, to: 'draft' })
      expect(skip.ok).toBe(false)
      if (!skip.ok) expect(skip.error).toContain("only legal next step is 'counting'")
      await commit(planStockTakeAdvance({ takeNo: stNo, to: 'counting' }))
      const take = await db.stockTake.findUnique({ where: { takeNo: stNo } })
      expect(take?.status).toBe('counting')
    })

    it('advance to draft: every system-non-zero uom must be counted', async () => {
      // zero out the fabric mtrs count → draft refuses naming the missing uom
      await db.stockTakeLine.updateMany({ where: { take: { takeNo: stNo }, itemType: 'fabric' }, data: { countedMtrs: null } })
      const incomplete = await planStockTakeAdvance({ takeNo: stNo, to: 'draft' })
      expect(incomplete.ok).toBe(false)
      if (!incomplete.ok) expect(incomplete.error).toContain('mtrs')
      // restore the count → draft freezes
      await commit(planStockTakeCount({ takeNo: stNo, lines: [{ itemType: 'fabric', itemCode: F1, mtrs: 55 }] }))
      await commit(planStockTakeAdvance({ takeNo: stNo, to: 'draft' }))
      const take = await db.stockTake.findUnique({ where: { takeNo: stNo } })
      expect(take?.status).toBe('draft')
    })

    it('count on a DRAFT take refuses (counts are frozen)', async () => {
      const frozen = await planStockTakeCount({ takeNo: stNo, lines: [{ itemType: 'yarn', itemCode: Y1, kgs: 90 }] })
      expect(frozen.ok).toBe(false)
      if (!frozen.ok) expect(frozen.error).toContain('DRAFT')
    })

    it('COMMIT: posts one ADJ- per non-zero variance, stamps committedAt, terminal — CurrentStock == the counts', async () => {
      const adjBefore = await db.stockLedger.count({ where: { godownId: g1Id, txnType: 'stock_adjustment_less' } })
      const res = await commit(planStockTakeAdvance({ takeNo: stNo, to: 'committed' }))
      expect((res as any).legs).toBe(2) // yarn kgs −7, fabric mtrs −5

      const take = await db.stockTake.findUnique({ where: { takeNo: stNo } })
      expect(take?.status).toBe('committed')
      expect(take?.committedAt).toBeTruthy()

      const adjAfter = await db.stockLedger.count({ where: { godownId: g1Id, txnType: 'stock_adjustment_less' } })
      expect(adjAfter - adjBefore).toBe(2)
      const adjRows = await db.stockLedger.findMany({ where: { godownId: g1Id, txnType: 'stock_adjustment_less' } })
      const yarnAdj = adjRows.find((r) => r.itemId === y1Id)
      const fabAdj = adjRows.find((r) => r.itemId === f1Id)
      expect(yarnAdj?.outKgs).toBe(7)
      expect(yarnAdj?.notes).toContain(`Stock take ${stNo}`) // the ADJ references the ST-
      expect(yarnAdj?.docNo).toMatch(/^ADJ-\d{4}$/)
      expect(fabAdj?.outMtrs).toBe(5)

      // the correction reprices nothing: the ADJ legs carry the bucket's WAC rate
      expect(yarnAdj?.rate).toBe(10)
      expect(fabAdj?.rate).toBe(20)

      // CurrentStock equals the COUNTS (the whole point of the cycle)
      const y = await db.currentStock.findFirst({ where: { itemType: 'yarn', itemId: y1Id, godownId: g1Id } })
      const f = await db.currentStock.findFirst({ where: { itemType: 'fabric', itemId: f1Id, godownId: g1Id } })
      expect(y?.kgs).toBe(93)
      expect(f?.kgs).toBe(80)
      expect(f?.mtrs).toBe(55)
    })

    it('closing-stock AGREES with the counted quantities (ledger truth == cache truth)', async () => {
      const res = await queryClosingStock({ limit: 10, page: 1, godown: G1 })
      const yarnRow = res.rows.find((r: any) => r.itemCode === Y1) as any
      const fabRow = res.rows.find((r: any) => r.itemCode === F1) as any
      expect(yarnRow?.kgs).toBeCloseTo(93, 6)
      expect(fabRow?.kgs).toBeCloseTo(80, 6)
      expect(fabRow?.mtrs).toBeCloseTo(55, 6)
    })

    it('terminal guards: advance + count on a committed take both refuse', async () => {
      const again = await planStockTakeAdvance({ takeNo: stNo, to: 'counting' })
      expect(again.ok).toBe(false)
      if (!again.ok) expect(again.error).toContain('COMMITTED')
      const cnt = await planStockTakeCount({ takeNo: stNo, lines: [{ itemType: 'yarn', itemCode: Y1, kgs: 90 }] })
      expect(cnt.ok).toBe(false)
    })

    it('the count-sheet print resolves the take (both doors, ADR-001: the tools delegate to the SAME services)', async () => {
      const doc = await fetchStockTakePrint(stNo)
      expect(doc).toBeTruthy()
      expect(doc?.title).toContain('COUNT SHEET')
      expect(doc?.docNo).toBe(stNo)
      expect(doc?.lines?.rows?.length).toBe(2)
      // the sheet resolves REAL item codes (per-model select — not raw cuids)
      const flat = (doc?.lines?.rows ?? []).map((r) => String(r[0])).join(' ')
      expect(flat).toContain(Y1)
      expect(flat).toContain(F1)
      // the agent tools exist and are write tools in the inventory domain
      for (const name of ['create_stock_take', 'record_stock_counts', 'advance_stock_take']) {
        const t = getTool(name)
        expect(t, name).toBeTruthy()
        expect(t!.isWrite).toBe(true)
        expect(t!.domain).toBe('inventory')
      }
      const toolsSrc = readFileSync(join(process.cwd(), 'src/lib/agent/tools.ts'), 'utf8')
      expect(toolsSrc).toContain('planStockTake')
      expect(toolsSrc).toContain('planStockTakeAdvance')
    })
  })

  // ─────────────────────────────────────────────────────────────
  // INV-02 — ONE WAC valuation (the golden test)
  // ─────────────────────────────────────────────────────────────
  describe('INV-02 — one WAC valuation: bucket == replay == register == dashboard', () => {
    it('the moving average: in 100@10 → out 30 (rate holds) → in 50@12 blends to 1300/120', async () => {
      await db.$transaction(async (tx) => {
        await postLedger(tx, { txnType: 'purchase_grn', itemType: 'yarn', itemId: y2Id, godownId: g2Id, docNo: `M42-WAC1-${TS}`, docDate: new Date('2026-08-10'), rate: 10, in: { kgs: 100 } })
      })
      let b = await db.currentStock.findFirst({ where: { itemType: 'yarn', itemId: y2Id, godownId: g2Id } })
      expect(b?.kgs).toBe(100)
      expect(b?.rate).toBeCloseTo(10, 9)

      await db.$transaction(async (tx) => {
        await postLedger(tx, { txnType: 'process_delivery', itemType: 'yarn', itemId: y2Id, godownId: g2Id, docNo: `M42-WAC2-${TS}`, docDate: new Date('2026-08-11'), out: { kgs: 30 } })
      })
      b = await db.currentStock.findFirst({ where: { itemType: 'yarn', itemId: y2Id, godownId: g2Id } })
      expect(b?.kgs).toBe(70)
      expect(b?.rate).toBeCloseTo(10, 9) // OUTS NEVER REPRICE (WAC convention)

      await db.$transaction(async (tx) => {
        await postLedger(tx, { txnType: 'purchase_grn', itemType: 'yarn', itemId: y2Id, godownId: g2Id, docNo: `M42-WAC3-${TS}`, docDate: new Date('2026-08-12'), rate: 12, in: { kgs: 50 } })
      })
      b = await db.currentStock.findFirst({ where: { itemType: 'yarn', itemId: y2Id, godownId: g2Id } })
      expect(b?.kgs).toBe(120)
      // the hand-computed WAC: (70·10 + 50·12) / (70 + 50) — and wacStep agrees with itself
      expect(b?.rate).toBeCloseTo(1300 / 120, 9)
      expect(b?.rate).toBeCloseTo(wacStep(70, 10, 50, 12), 9)
    })

    it('GOLDEN: current-stock register Value == closing-stock (as-of now) Value == hand-computed 1300', async () => {
      const reg = await queryCurrentStock({ godown: G2 })
      const regValue = Number(reg.totals?.find((t) => t.label === 'Value')?.value ?? 0)
      expect(regValue).toBe(1300) // 120 kgs × 1300/120 — valueBucket per-uom

      const closing = await queryClosingStock({ limit: 10, page: 1, godown: G2 })
      const row = closing.rows[0] as any
      expect(row.itemCode).toBe(Y2)
      expect(row.rate).toBeCloseTo(1300 / 120, 9) // the replay reproduces the bucket rate bit-exactly
      expect(row.value).toBeCloseTo(1300, 6)
      const closingValue = Number(closing.totals?.find((t) => t.label === 'Value')?.value ?? 0)
      expect(closingValue).toBe(1300)
      expect(regValue).toBe(closingValue) // THE golden equality
    })

    it('GOLDEN (dashboard leg): the stock_value tile == inrL over the same bucket math', async () => {
      const snap = await getDashboardSnapshot('admin')
      const tile = snap.tiles?.find((t: any) => t.id === 'stock_value')
      expect(tile).toBeTruthy()
      // replicate the tile's own rule on the register's whole-DB Value total
      const reg = await queryCurrentStock({ limit: 1, page: 1 })
      const total = Number(reg.totals?.find((t) => t.label === 'Value')?.value ?? 0)
      const expected = total >= 10000000 ? `₹${(total / 10000000).toFixed(1)}Cr` : `₹${(total / 100000).toFixed(1)}L`
      expect(tile?.value).toBe(expected) // the dashboard values the SAME buckets with the SAME valueBucket
      // source contract: the dashboard consumes the shared valuation (HFX-11/M42)
      const dashSrc = readFileSync(join(process.cwd(), 'src/lib/erp/dashboard.ts'), 'utf8')
      expect(dashSrc).toContain('valueBucket')
    })
  })

  // ─────────────────────────────────────────────────────────────
  // INV-03 — no silent truncation (5,201 rows, complete at any count)
  // ─────────────────────────────────────────────────────────────
  describe('INV-03 — a 5,201-row single-item ledger yields a COMPLETE statement', () => {
    const ROWS = 5201 // one more than the old take:5000 cap

    it('seeds 5,201 one-kg rows (the oldest would have been silently dropped before)', async () => {
      const rows = Array.from({ length: ROWS }, (_, i) => ({
        txnType: 'purchase_grn',
        itemType: 'yarn',
        itemId: y3Id,
        godownId: g3Id,
        docNo: `M42-BIG-${i}-${TS}`,
        docDate: new Date(Date.UTC(2026, 0, 1, 0, Math.floor(i / 1440), i % 1440)), // strictly ascending
        finYear: '26-27',
        inKgs: 1,
        rate: 0,
      }))
      for (let i = 0; i < rows.length; i += 2000) {
        await db.stockLedger.createMany({ data: rows.slice(i, i + 2000) })
      }
      expect(await db.stockLedger.count({ where: { godownId: g3Id } })).toBe(ROWS)
    })

    it('closing-stock counts ALL 5,201 kgs (the old desc+take:5000 dropped the opening balance)', async () => {
      const t = Date.now()
      const res = await queryClosingStock({ limit: 10, page: 1, godown: G3 })
      const ms = Date.now() - t
      expect(res.count).toBe(1)
      expect((res.rows[0] as any).kgs).toBeCloseTo(ROWS, 6) // NOT 5,000
      expect(ms, `queryClosingStock@5201 took ${ms}ms`).toBeLessThan(300) // the M14 budget holds
    })

    it('itemwise-stock counts ALL 5,201 txns (a true groupBy _count aggregate)', async () => {
      const res = await queryItemwiseStock({ limit: 100, page: 1, q: Y3 })
      const row = res.rows.find((r: any) => r.itemCode === Y3) as any
      expect(row).toBeTruthy()
      expect(row.txns).toBe(ROWS) // NOT 5,000
      expect(row.inKgs).toBeCloseTo(ROWS, 6) // the itemwise row speaks in/out legs, not net kgs
    })

    it('source contracts: the caps are GONE — groupBy + the unbounded batched replay', () => {
      const closing = src('registers/closing-stock.ts')
      expect(closing).not.toContain('take: 5000')
      expect(closing).toContain('groupBy')
      expect(closing).toContain('REPLAY_BATCH')
      expect(closing).toContain('for (let skip') // the unbounded batched loop
      expect(closing).not.toContain('orderBy: { docDate: \'desc\' }') // the newest-kept/oldest-dropped scan is dead
      const itemwise = src('registers/itemwise-stock.ts')
      expect(itemwise).not.toContain('take: 5000')
      expect(itemwise).toContain('groupBy')
    })
  })

  // ─────────────────────────────────────────────────────────────
  // INV-04 — the negative-stock guard (flag-gated at postLedger)
  // ─────────────────────────────────────────────────────────────
  describe('INV-04 — block_negative_stock: the postLedger overdraft guard', () => {
    it('seeds 50 kgs and REFUSES an over-issue with the actionable error when the flag is on', async () => {
      await db.$transaction(async (tx) => {
        await postLedger(tx, { txnType: 'opening', itemType: 'yarn', itemId: y4Id, godownId: g4Id, docNo: `M42-NEG-${TS}`, docDate: new Date('2026-08-20'), rate: 10, in: { kgs: 50 } })
      })
      await setFlag('block_negative_stock', true)

      await expect(db.$transaction(async (tx) => {
        await postLedger(tx, { txnType: 'process_delivery', itemType: 'yarn', itemId: y4Id, godownId: g4Id, docNo: `M42-NEGX-${TS}`, docDate: new Date('2026-08-21'), out: { kgs: 80 } })
      })).rejects.toThrow(/Blocked: process_delivery.*on hand 50\.00, moving 80\.00/s)

      // the ledger row was never written (the guard runs FIRST, inside the tx)
      expect(await db.stockLedger.count({ where: { docNo: `M42-NEGX-${TS}` } })).toBe(0)
      const b = await db.currentStock.findFirst({ where: { itemType: 'yarn', itemId: y4Id, godownId: g4Id } })
      expect(b?.kgs).toBe(50) // untouched
    })

    it('the boundary is exact: issuing exactly the on-hand posts (lands at 0.00)', async () => {
      await db.$transaction(async (tx) => {
        await postLedger(tx, { txnType: 'process_delivery', itemType: 'yarn', itemId: y4Id, godownId: g4Id, docNo: `M42-NEG0-${TS}`, docDate: new Date('2026-08-22'), out: { kgs: 50 } })
      })
      const b = await db.currentStock.findFirst({ where: { itemType: 'yarn', itemId: y4Id, godownId: g4Id } })
      expect(b?.kgs).toBeCloseTo(0, 9)
    })

    it('the service door inherits the guard (planStockAdjustment less > on-hand fails at commit)', async () => {
      const { planStockAdjustment } = await import('@/lib/erp/posting/stock-adj')
      const plan = await planStockAdjustment({ godownCode: G4, itemType: 'yarn', itemCode: Y4, qty: 30, action: 'less', reason: 'M42 guard matrix' })
      expect(plan.ok).toBe(true) // validation is at commit — the guard is the choke point
      await expect(plan.commit!()).rejects.toThrow(/Blocked/)
    })

    it('flag OFF (legacy default): the same over-issue posts — warn-but-never-block preserved', async () => {
      await setFlag('block_negative_stock', false)
      // back to 50 first
      await db.stockLedger.deleteMany({ where: { docNo: `M42-NEG0-${TS}` } })
      await db.currentStock.updateMany({ where: { itemType: 'yarn', itemId: y4Id, godownId: g4Id }, data: { kgs: 50 } })
      await db.$transaction(async (tx) => {
        await postLedger(tx, { txnType: 'process_delivery', itemType: 'yarn', itemId: y4Id, godownId: g4Id, docNo: `M42-NEGL-${TS}`, docDate: new Date('2026-08-23'), out: { kgs: 80 } })
      })
      const b = await db.currentStock.findFirst({ where: { itemType: 'yarn', itemId: y4Id, godownId: g4Id } })
      expect(b?.kgs).toBeCloseTo(-30, 9) // legacy negative stock — allowed
    })

    it('source contract: the guard sits in postLedger BEFORE the ledger write (the choke point)', () => {
      const ledger = src('posting/ledger.ts')
      expect(ledger).toContain('await assertNoOverdraft(tx, m)')
      expect(ledger.indexOf('assertNoOverdraft(tx, m)')).toBeLessThan(ledger.indexOf('tx.stockLedger.create'))
      expect(ledger).toContain('block_negative_stock')
    })
  })

  // ─────────────────────────────────────────────────────────────
  // INV-05 — waste as an identity + the waste-% KPI register
  // ─────────────────────────────────────────────────────────────
  describe('INV-05 — waste-% register: WST- kgs ÷ process_receipt kgs (the knitting KPI)', () => {
    it('seeds 200 kgs of process receipts + 5 kgs waste (and 3 kgs on a zero-receipt item)', async () => {
      await db.$transaction(async (tx) => {
        await postLedger(tx, { txnType: 'process_receipt', itemType: 'yarn', itemId: y5Id, godownId: g5Id, docNo: `M42-PR-${TS}`, docDate: new Date('2026-08-25'), rate: 15, in: { kgs: 200 } })
      })
      const w1 = await commit(planWasteReceipt({ godownCode: G5, itemType: 'yarn', itemCode: Y5, qty: 5, wasteClass: 'knitting', notes: 'M42 KPI' }))
      expect((w1 as any).docNo).toMatch(/^WST-\d{4}$/)
      await commit(planWasteReceipt({ godownCode: G5, itemType: 'yarn', itemCode: Y5B, qty: 3, wasteClass: 'dyeing' }))
    })

    it('the register computes the KPI per item, with zero-division guarded', async () => {
      const res = await queryWastePercent({ limit: 100, page: 1 })
      const row = res.rows.find((r: any) => r.itemCode === Y5) as any
      expect(row).toBeTruthy()
      expect(row.wasteKgs).toBe(5)
      expect(row.receiptsKgs).toBe(200)
      expect(row.wastePct).toBe(2.5) // 5 / 200 × 100
      const zeroRow = res.rows.find((r: any) => r.itemCode === Y5B) as any
      expect(zeroRow).toBeTruthy()
      expect(zeroRow.wastePct).toBe('—') // zero receipts — never a divide-by-zero
      const total = res.totals?.find((t) => t.label === 'Waste %')?.value
      expect(total).toBe(4) // (5+3) / 200 — the aggregate reads the same math
    })

    it('source contracts: the WST- family numerator, the process_receipt denominator, the waste godown', () => {
      const waste = src('registers/waste-percent.ts')
      expect(waste).toContain("startsWith: 'WST-'")
      expect(waste).toContain("txnType: 'process_receipt'")
      const adj = src('posting/stock-adj.ts')
      expect(adj).toContain('waste_godown_code')
      expect(adj).toContain('waste_scrap_rate')
      expect(adj).toContain('Waste store (scrap)') // auto-vivified
    })
  })

  // ─────────────────────────────────────────────────────────────
  // INV-06 — ledger ↔ CurrentStock drift (compare + MIS card + digest)
  // ─────────────────────────────────────────────────────────────
  describe('INV-06 — ledger ↔ cache drift: silent when clean, named vectors when split', () => {
    it('clean baseline: no drift vector for the fixture bucket', async () => {
      await db.$transaction(async (tx) => {
        await postLedger(tx, { txnType: 'opening', itemType: 'yarn', itemId: y6Id, godownId: g6Id, docNo: `M42-DFT-${TS}`, docDate: new Date('2026-08-28'), rate: 8, in: { kgs: 20 } })
      })
      const drift = await compareStockDrift()
      const mine = drift.filter((d) => d.itemCode === Y6)
      expect(mine).toEqual([]) // the append-only truth and the cache agree
    })

    it('a hand-corrupted bucket surfaces BOTH sides of the vector (compare + digest, |delta|-ranked)', async () => {
      await db.currentStock.updateMany({ where: { itemType: 'yarn', itemId: y6Id, godownId: g6Id }, data: { kgs: 20000 } }) // direct write — a split larger than any legacy drift
      const drift = await compareStockDrift()
      const mine = drift.find((d) => d.itemCode === Y6) // the drift vector names the bucket
      expect(mine).toBeTruthy()
      expect(mine!.godown).toBe(G6)
      expect(mine!.uom).toBe('kgs')
      expect(mine!.ledgerQty).toBe(20)
      expect(mine!.cacheQty).toBe(20000)
      expect(mine!.delta).toBe(-19980)

      const digest = await buildDigest()
      // the digest section ranks by |delta| DESC and caps at 25 — a split this
      // large is always at the head of the list
      const digestRow = digest.sections.stockDrift.rows.find((r) => r.itemCode === Y6)
      expect(digestRow).toBeTruthy()
      expect(digestRow!.ledgerQty).toBe(20)
      expect(digestRow!.cacheQty).toBe(20000)
      expect(digest.sections.stockDrift.rows.length).toBeLessThanOrEqual(25)

      await db.currentStock.updateMany({ where: { itemType: 'yarn', itemId: y6Id, godownId: g6Id }, data: { kgs: 20 } }) // restore
      const after = await compareStockDrift()
      expect(after.filter((d) => d.itemCode === Y6)).toEqual([]) // clean again
    })

    it('source contracts: the MIS card + the digest section consume the one pure compare', () => {
      const mis = readFileSync(join(process.cwd(), 'src/app/(erp)/reports/mis/page.tsx'), 'utf8')
      expect(mis).toContain('compareStockDrift')
      expect(mis).toContain('stock-drift-recon') // the card is silent when clean (rendered only when non-empty)
      const digest = src('notifications/digest.ts')
      expect(digest).toContain('stockDrift')
      expect(digest).toContain('compareStockDrift()')
    })
  })

  // ─────────────────────────────────────────────────────────────
  // INV-07 — opening stock gated to the FY-start window
  // ─────────────────────────────────────────────────────────────
  describe('INV-07 — opn_fy_gate: the opening-stock FY window', () => {
    it('gate OFF (legacy default): planOpeningStock posts', async () => {
      const plan = await planOpeningStock({ godownCode: G7, itemType: 'yarn', itemCode: Y7, qty: 10 })
      expect(plan.ok).toBe(true)
      const res = await commit(plan)
      expect((res as any).docNo).toMatch(/^OPN-\d{4}$/)
    })

    it('gate ON + today outside the window: refuses naming the FY and the window', async () => {
      await setFlag('opn_fy_gate', true)
      // the active FY is 26-27 starting 2026-04-01 (default 30-day window — today is far past)
      const plan = await planOpeningStock({ godownCode: G7, itemType: 'yarn', itemCode: Y7, qty: 5 })
      expect(plan.ok).toBe(false)
      if (!plan.ok) {
        expect(plan.error).toContain('26-27')
        expect(plan.error).toMatch(/2026-04-01.*2026-05-01/) // the window is named
        expect(plan.error).toContain('outside')
      }
    })

    it('gate ON + the window widened to 400 days: today is INSIDE → posts', async () => {
      await setFlag('opn_fy_window_days', 400)
      const plan = await planOpeningStock({ godownCode: G7B, itemType: 'yarn', itemCode: Y7B, qty: 4 })
      expect(plan.ok).toBe(true)
      await commit(plan)
      await setFlag('opn_fy_window_days', 30)
      await setFlag('opn_fy_gate', false)
    })
  })

  // ─────────────────────────────────────────────────────────────
  // INV-08 + registry pins — hot-path indexes, numbering, routes, print
  // ─────────────────────────────────────────────────────────────
  describe('INV-08 — hot-path indexes + the wiring pins', () => {
    it('schema pins: the three StockLedger @@index entries exist (EXPLAIN-plan equivalent)', () => {
      const start = prismaSrc.indexOf('model StockLedger')
      const end = prismaSrc.indexOf('model ', start + 10) // the next model block
      const block = prismaSrc.slice(start, end > start ? end : start + 2000)
      expect(block).toContain('@@index([itemType, itemId])')
      expect(block).toContain('@@index([godownId])')
      expect(block).toContain('@@index([txnType])')
    })

    it('the indexes are LIVE in the database (not just schema text)', async () => {
      const names = await (db as any).$queryRawUnsafe(`SELECT name FROM sqlite_master WHERE type='index' AND tbl_name='StockLedger'`)
      const list = (names as Array<{ name: string }>).map((r) => r.name)
      expect(list).toContain('StockLedger_itemType_itemId_idx')
      expect(list).toContain('StockLedger_godownId_idx')
      expect(list).toContain('StockLedger_txnType_idx')
    })

    it('numbering: the stock_take sequence (ST-####) is registered', () => {
      const numbering = src('numbering.ts')
      expect(numbering).toContain("stock_take:")
      expect(numbering).toContain("template: 'ST-####'")
    })

    it('routes: the two M42 screens are live + the csv twin exists on disk', () => {
      const menu = src('menu-registry.ts')
      expect(menu).toContain("'/inventory/stock-take'")
      expect(menu).toContain("'/inventory/waste-percent'")
      const csvPath = join(process.cwd(), 'src/app/(erp)/inventory/waste-percent/csv/route.ts')
      expect(readFileSync(csvPath, 'utf8')).toContain("makeCsvRouteHandler('waste-percent')")
    })

    it('print: the count-sheet docType is wired into PRINT_DOCS', () => {
      const printIndex = src('print/index.ts')
      expect(printIndex).toContain("'stock-take': fetchStockTakePrint")
    })

    it('flags registry: the five M42 flags + the getFlag pure-read (deadlock regression pin)', () => {
      const flags = src('flags.ts')
      for (const name of ['block_negative_stock', 'waste_godown_code', 'waste_scrap_rate', 'opn_fy_gate', 'opn_fy_window_days']) {
        expect(flags).toContain(`name: '${name}'`)
      }
      // getFlag must NOT seed (ensureFlags writes on the global connection —
      // inside an open transaction that deadlocks the WAL single writer)
      const getFlagBody = flags.slice(flags.indexOf('export async function getFlag<T'), flags.indexOf('export async function setFlag'))
      expect(getFlagBody).not.toContain('ensureFlags')
    })

    it('tool registry: 246 tools (243 at M41 + the stock-take trio)', () => {
      expect(allTools.length).toBe(249) // M43 PRG: +set_order_deliveries +correct_program_spec +propose_program_requirements
      const names = allTools.map((t) => t.name)
      expect(names).toContain('create_stock_take')
      expect(names).toContain('record_stock_counts')
      expect(names).toContain('advance_stock_take')
    })
  })
})
