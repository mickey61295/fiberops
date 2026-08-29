/**
 * M14 perf probe — seeds 10k StockLedger rows + measures the register feed
 * queries against them (SPEC-M9 §9 M14 acceptance: registers <300ms at 10k
 * rows; tracker snapshot fast). One-shot diagnostic; the real gate is
 * tests/perf/registers-perf.test.ts.
 */
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()
const TS = Date.now()

async function main() {
  const g = await db.godown.create({ data: { code: `PERF-G-${TS}`, name: `Perf GD ${TS}` } })
  const rows = Array.from({ length: 10000 }, (_, i) => ({
    txnType: i % 2 === 0 ? 'purchase_grn' : 'process_delivery',
    itemType: 'yarn',
    itemId: `PERF-YARN-${i % 50}`,
    godownId: g.id,
    docNo: `PERF-L${i}-${TS}`,
    docDate: new Date(Date.now() - i * 60000), // spread over ~7 days, DESC-ish
    finYear: 'FY26',
    inKgs: i % 2 === 0 ? 10 : 0,
    outKgs: i % 2 === 0 ? 0 : 10,
    rate: 100,
  }))
  const t0 = Date.now()
  await db.stockLedger.createMany({ data: rows })
  console.log(`seeded 10000 rows in ${Date.now() - t0}ms`)

  // stock ledger page 1
  let t = Date.now()
  const page1 = await db.stockLedger.findMany({ where: { godownId: g.id }, orderBy: { docDate: 'desc' }, take: 100 })
  console.log(`ledger page1 (100 of 10k): ${Date.now() - t}ms -> ${page1.length} rows`)

  // count
  t = Date.now()
  const count = await db.stockLedger.count({ where: { godownId: g.id } })
  console.log(`count: ${Date.now() - t}ms -> ${count}`)

  // createdAt desc (tracker feed pattern)
  t = Date.now()
  const feed = await db.stockLedger.findMany({ orderBy: { createdAt: 'desc' }, take: 10 })
  console.log(`createdAt feed top10: ${Date.now() - t}ms -> ${feed.length}`)

  // today count (tracker board pattern, createdAt >= start of day)
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  t = Date.now()
  const today = await db.stockLedger.count({ where: { createdAt: { gte: start } } })
  console.log(`createdAt>=today count: ${Date.now() - t}ms -> ${today}`)

  // docDate range scan (day-book filter)
  t = Date.now()
  const ranged = await db.stockLedger.findMany({
    where: { godownId: g.id, docDate: { gte: new Date(Date.now() - 86400000), lte: new Date() } },
    orderBy: { docDate: 'desc' }, take: 100,
  })
  console.log(`docDate range page: ${Date.now() - t}ms -> ${ranged.length}`)

  await db.stockLedger.deleteMany({ where: { godownId: g.id } })
  await db.godown.delete({ where: { id: g.id } })
  console.log('cleanup done')
}

main().finally(() => db.$disconnect())
