/* eslint-disable no-console */
// Inspect & clean the DB after ingestion E2E tests.
const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient()

async function inspect() {
  const buyers = await db.buyer.findMany()
  console.log('BUYERS:', buyers.map((b) => `${b.code}=${b.name}`).join(', '))
  const parties = await db.party.findMany()
  console.log('PARTIES:', parties.map((p) => `${p.code}=${p.name}`).join(', '))
  const colours = await db.colour.findMany()
  console.log('COLOURS:', colours.map((c) => `${c.code}:${c.name}`).join(', '))
  const sizes = await db.size.findMany({ orderBy: { sort: 'asc' } })
  console.log('SIZES:', sizes.map((s) => s.name).join(', '))
  const accs = await db.accessory.findMany()
  console.log('ACCESSORIES:', accs.map((a) => `${a.code}=${a.name}`).join(', '))
  const styles = await db.style.findMany()
  console.log('STYLES:', styles.map((s) => `${s.styleNo}=${s.description}`).join(', '))
  const orders = await db.order.findMany({ include: { lines: true, buyer: true }, orderBy: { orderNo: 'asc' } })
  for (const o of orders) {
    console.log(
      `ORDER ${o.orderNo} | buyer=${o.buyer?.code} | finYear=${o.finYear} | orderDate=${o.orderDate?.toISOString().slice(0, 10)} | delivery=${o.deliveryDate?.toISOString().slice(0, 10)} | pcs=${o.totalPcs} | value=${o.totalValue} | lines=${o.lines.length}`,
    )
    if (o.orderNo.match(/^1\d{7}$/)) {
      for (const l of o.lines) {
        const col = await db.colour.findUnique({ where: { id: l.colourId || '' } }).catch(() => null)
        const sz = await db.size.findUnique({ where: { id: l.sizeId || '' } }).catch(() => null)
        console.log(`   line ${col?.name || '?'} / ${sz?.name || '?'} qty=${l.qty} rate=${l.rate}`)
      }
    }
  }
}

async function cleanup() {
  // 1. Remap order lines from colour "59X NAVY" to "Navy", then drop the dup colour
  const junkColour = await db.colour.findUnique({ where: { name: '59X NAVY' } })
  const navy = await db.colour.findUnique({ where: { name: 'Navy' } })
  if (junkColour && navy) {
    const res = await db.orderLine.updateMany({ where: { colourId: junkColour.id }, data: { colourId: navy.id } })
    console.log(`remapped ${res.count} order lines 59X NAVY -> Navy`)
    await db.colour.delete({ where: { id: junkColour.id } })
    console.log('deleted colour 59X NAVY')
  }
  // 2. Delete junk accessories created from buyer SKU indexes
  const junkAccs = await db.accessory.findMany({ where: { name: { startsWith: '696GJ-' } } })
  for (const a of junkAccs) {
    const refPo = await db.pOLine.count({ where: { itemType: 'accessory', itemId: a.id } })
    const refGrn = await db.gRNLine.count({ where: { itemType: 'accessory', itemId: a.id } })
    const refBom = await db.bomLine.count({ where: { itemType: 'accessory', itemId: a.id } })
    if (refPo + refGrn + refBom === 0) {
      await db.accessory.delete({ where: { id: a.id } })
      console.log(`deleted junk accessory ${a.code}=${a.name}`)
    } else {
      console.log(`KEEP accessory ${a.code} (referenced)`)
    }
  }
  // 3. Delete duplicate Baalaji Export parties (it's OUR company, not a real supplier)
  const dupParties = await db.party.findMany({ where: { name: { contains: 'Baalaji' } } })
  for (const p of dupParties) {
    const refs =
      (await db.order.count({ where: { partyId: p.id } })) +
      (await db.purchaseOrder.count({ where: { partyId: p.id } })) +
      (await db.salesInvoice.count({ where: { partyId: p.id } })) +
      (await db.gRN.count({ where: { partyId: p.id } })) +
      (await db.jobworkOrder.count({ where: { jobworkerId: p.id } })) +
      (await db.lot.count({ where: { partyId: p.id } }))
    if (refs === 0) {
      await db.party.delete({ where: { id: p.id } })
      console.log(`deleted party ${p.code}=${p.name}`)
    } else {
      console.log(`KEEP party ${p.code} (referenced by ${refs} docs)`)
    }
  }
  // 4. Delete duplicate LPP SA buyers (keep the one referenced by orders)
  const lppBuyers = await db.buyer.findMany({ where: { name: { contains: 'LPP' } } })
  for (const b of lppBuyers) {
    const refs = await db.order.count({ where: { buyerId: b.id } })
    if (refs === 0) {
      await db.buyer.delete({ where: { id: b.id } })
      console.log(`deleted unreferenced buyer ${b.code}=${b.name}`)
    } else {
      console.log(`KEEP buyer ${b.code} (${refs} orders)`)
    }
  }
}

async function main() {
  console.log('===== BEFORE =====')
  await inspect()
  console.log('\n===== CLEANUP =====')
  await cleanup()
  console.log('\n===== AFTER =====')
  await inspect()
  await db.$disconnect()
}

main().catch((e) => { console.error(e); process.exit(1) })
