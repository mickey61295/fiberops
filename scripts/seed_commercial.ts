/* eslint-disable no-console */
// Seed commercial masters (Phase 3): feature flags (registry defaults),
// HSN master with real garment-industry codes, and Department.prs values
// (legacy Mas_Dept.Prs — cumulative-rate engine discriminator).
// Idempotent: safe to re-run.

import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

// Legacy Mas_Dept.Prs semantics: 1=yarn base, 2=dyeing, 4=knitting, -4=yarn twist
const DEPT_PRS: Record<string, number> = {
  D1: 4, // Knitting
  D2: 2, // Dyeing
  // D3-D6: plain own-rate depts (null)
}

const HSN_CODES = [
  { code: '5205', description: 'Cotton yarn (spun), 85%+ cotton', gstRate: 5 },
  { code: '5206', description: 'Cotton yarn <85% cotton', gstRate: 12 },
  { code: '5208', description: 'Woven cotton fabric, 85%+ cotton, printed', gstRate: 5 },
  { code: '6001', description: 'Knitted/crocheted pile fabrics', gstRate: 12 },
  { code: '6004', description: 'Knitted fabrics, width >30cm, elastic', gstRate: 12 },
  { code: '6006', description: 'Other knitted or crocheted fabrics', gstRate: 5 },
  { code: '6109', description: 'T-shirts, singlets and other vests, knitted', gstRate: 5 },
  { code: '6110', description: 'Sweaters, pullovers, cardigans, knitted', gstRate: 5 },
  { code: '6111', description: 'Babies’ garments, knitted', gstRate: 5 },
  { code: '6114', description: 'Other garments, knitted or crocheted', gstRate: 5 },
  { code: '6115', description: 'Panty hose, socks, knitted', gstRate: 5 },
  { code: '6203', description: "Men's/boys' suits, trousers, woven", gstRate: 12 },
  { code: '6204', description: "Women's/girls' suits, dresses, woven", gstRate: 12 },
  { code: '5401', description: 'Sewing thread (synthetic filament)', gstRate: 12 },
  { code: '5407', description: 'Woven fabrics of synthetic filament', gstRate: 12 },
  { code: '5806', description: 'Narrow woven fabrics, labels', gstRate: 5 },
  { code: '6302', description: 'Bed linen, table linen, toilet linen', gstRate: 5 },
  { code: '8447', description: 'Knitting machines (capital goods)', gstRate: 18 },
]

async function main() {
  // 1) Flags — registry defaults are inserted by ensureFlags(); here we import
  //    the registry logic directly to avoid pulling in the Next.js module.
  const { FLAG_DEFS } = await import('../src/lib/erp/flags')
  const existingFlags = await db.flag.findMany({ select: { name: true } })
  const have = new Set(existingFlags.map((f) => f.name))
  const missingFlags = FLAG_DEFS.filter((f) => !have.has(f.name))
  if (missingFlags.length) {
    await db.flag.createMany({
      data: missingFlags.map((f) => ({
        name: f.name, value: f.value, valueType: f.valueType,
        category: f.category, defaultValue: f.value, description: f.description,
      })),
    })
    console.log(`Seeded ${missingFlags.length} flags`)
  } else {
    console.log('Flags already seeded (28)')
  }

  // 2) HSN master
  let hsnAdded = 0
  for (const h of HSN_CODES) {
    const exists = await db.hsnCode.findUnique({ where: { code: h.code } })
    if (!exists) {
      await db.hsnCode.create({ data: h })
      hsnAdded++
    }
  }
  console.log(`HSN master: ${hsnAdded} added, ${HSN_CODES.length - hsnAdded} already present`)

  // 3) Department.prs (cumulative-rate walk discriminator)
  let prsSet = 0
  for (const [code, prs] of Object.entries(DEPT_PRS)) {
    const dept = await db.department.findUnique({ where: { code } })
    if (dept && dept.prs !== prs) {
      await db.department.update({ where: { code }, data: { prs } })
      prsSet++
    }
  }
  console.log(`Department.prs: ${prsSet} updated (D1=4 knitting, D2=2 dyeing)`)

  // 4) Existing USD orders (LPP ingestion) — set currency so display fixes itself
  const orders = await db.order.findMany({ select: { id: true, orderNo: true, notes: true, currency: true } })
  let fixed = 0
  for (const o of orders) {
    if (o.currency === 'INR' && o.notes && /USD/i.test(o.notes)) {
      await db.order.update({ where: { id: o.id }, data: { currency: 'USD' } })
      fixed++
    }
  }
  console.log(`FCY fix: ${fixed} order(s) with USD notes now carry currency=USD`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
