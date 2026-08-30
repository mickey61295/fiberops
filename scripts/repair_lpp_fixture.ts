/**
 * Repair the LPP PO regression fixture (Phase 0.4 / eval doc 1).
 *
 * WHY: the parallel-session db commit (a390a30) replaced db/custom.db with a
 * state where the 5 LPP orders (11135903/11136041/11136133/11111841/11136129)
 * survived with EXACT pcs + values (30,006 pcs · $31,506.30 — the PDF-verified
 * numbers) but lost the 696GJ style link (now STY-0001) and the USD currency
 * flag (now INR). This script restores the documented state: style 696GJ
 * re-created, orders re-pointed, currency=USD. Idempotent.
 *
 * Run: npx tsx scripts/repair_lpp_fixture.ts
 */
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const ORDER_NOS = ['11135903', '11136041', '11136133', '11111841', '11136129']

async function main() {
  // 1. the 696GJ style (find or create)
  let style = await db.style.findUnique({ where: { styleNo: '696GJ' } })
  if (!style) {
    style = await db.style.create({ data: { styleNo: '696GJ' } })
    console.log('created style 696GJ')
  } else {
    console.log('style 696GJ already present')
  }

  // 2. the LPP buyer (B-0001 — the static eval reads it)
  const buyer = await db.buyer.findFirst({ where: { name: { contains: 'LPP' } } })
  if (!buyer) {
    await db.buyer.create({ data: { code: 'B-0001', name: 'LPP SA' } })
    console.log('created LPP buyer')
  }

  // 3. re-point + re-flag the 5 orders (values/pcs are already correct)
  let fixed = 0
  for (const no of ORDER_NOS) {
    const o = await db.order.findUnique({ where: { orderNo: no } })
    if (!o) {
      console.log(`MISSING order ${no} — re-ingest via the agent (upload/PO_696GJ_revised 21-04-25-2.pdf)`)
      continue
    }
    if (o.styleId !== style.id || o.currency !== 'USD') {
      await db.order.update({
        where: { id: o.id },
        data: { styleId: style.id, currency: 'USD' },
      })
      fixed++
    }
  }
  console.log(`orders re-pointed to 696GJ + USD: ${fixed} (0 = already correct)`)

  // 4. verify the eval contract
  const orders = []
  for (const no of ORDER_NOS) orders.push(await db.order.findUnique({ where: { orderNo: no } }))
  const existing = orders.filter(Boolean)
  const totalPcs = existing.reduce((s, o) => s + o!.totalPcs, 0)
  const totalUsd = existing.reduce((s, o) => s + o!.totalValue, 0)
  const usd = existing.filter((o) => o!.currency === 'USD').length
  console.log(`verify: ${existing.length}/5 orders · ${totalPcs} pcs (want 30006) · $${totalUsd.toFixed(2)} (want 31506.30) · USD ${usd}/5`)
  const ok = existing.length === 5 && totalPcs === 30006 && Math.abs(totalUsd - 31506.3) < 0.01 && usd === 5
  console.log(ok ? 'LPP fixture RESTORED' : 'STILL DRIFTED — inspect manually')
  process.exit(ok ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
