/**
 * M14 perf gate (SPEC-M9 §9 M14 acceptance): registers stay <300ms at 10k
 * rows; the tracker snapshot stays fast on the same data. Seeds 10,000
 * StockLedger rows (TS-tagged, one godown — cleanup is one deleteMany) and
 * times the REAL services (queryStockLedger + queryClosingStock +
 * getTrackerSnapshot), not raw Prisma calls.
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { db } from '@/lib/db'
import { queryStockLedger } from '../../src/lib/erp/registers/stock-ledger'
import { queryClosingStock } from '../../src/lib/erp/registers/closing-stock'
import { getTrackerSnapshot } from '../../src/lib/erp/tracker'

const TS = Date.now()
const GODOWN = `PERF-G-${TS}`
const ROWS = 10_000

let godownId = ''

describe('SPEC-M9 §9 M14 — perf acceptance at 10k rows', () => {
  beforeAll(async () => {
    const g = await db.godown.create({ data: { code: GODOWN, name: `Perf GD ${TS}` } })
    godownId = g.id
    const rows = Array.from({ length: ROWS }, (_, i) => ({
      txnType: i % 2 === 0 ? 'purchase_grn' : 'process_delivery',
      itemType: 'yarn',
      itemId: `PERF-YARN-${i % 50}`,
      godownId: g.id,
      docNo: `PERF-L${i}-${TS}`,
      docDate: new Date(Date.now() - i * 60000),
      finYear: 'FY26',
      inKgs: i % 2 === 0 ? 10 : 0,
      outKgs: i % 2 === 0 ? 0 : 10,
      rate: 100,
    }))
    for (let i = 0; i < rows.length; i += 2000) {
      await db.stockLedger.createMany({ data: rows.slice(i, i + 2000) })
    }
  })

  afterAll(async () => {
    await db.stockLedger.deleteMany({ where: { godownId } })
    await db.godown.deleteMany({ where: { id: godownId } })
  })

  it('the stock ledger register serves page 1 of 10k rows well under 300ms', async () => {
    const t = Date.now()
    const res = await queryStockLedger({ limit: 100, page: 1, godown: GODOWN })
    const ms = Date.now() - t
    expect(res.count).toBe(ROWS)
    expect(res.rows).toHaveLength(100)
    expect(ms, `queryStockLedger took ${ms}ms`).toBeLessThan(300)
  })

  it('page 2 (skip 100) is equally fast — pagination is server-side', async () => {
    const t = Date.now()
    const res = await queryStockLedger({ limit: 100, page: 2, godown: GODOWN })
    const ms = Date.now() - t
    expect(res.rows).toHaveLength(100)
    expect(ms, `queryStockLedger page 2 took ${ms}ms`).toBeLessThan(300)
  })

  it('the closing-stock register (take-guarded cumulative scan) stays under 300ms', async () => {
    const t = Date.now()
    const res = await queryClosingStock({ limit: 100, page: 1, godown: GODOWN })
    const ms = Date.now() - t
    expect(res.count).toBeGreaterThan(0)
    expect(ms, `queryClosingStock took ${ms}ms`).toBeLessThan(300)
  })

  it('the tracker snapshot (17 families + counts) stays well under 300ms', async () => {
    const t = Date.now()
    const snap = await getTrackerSnapshot()
    const ms = Date.now() - t
    expect(snap.generatedAt).toBeTruthy()
    expect(ms, `getTrackerSnapshot took ${ms}ms`).toBeLessThan(300)
  })
})
