// Verify approvals data + API response shape fix (entity string + entityData object)
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

async function main() {
const pending = await db.approval.findMany({ where: { status: 'pending' } })
console.log('pending approvals:', pending.length)
for (const a of pending) {
  console.log(' -', a.entity, a.entityId.slice(0, 8), 'by', a.requestedBy, '@', a.createdAt.toISOString())
}

// Simulate the fixed enrichment from /api/erp?resource=approvals
const enriched = await Promise.all(pending.map(async (a) => {
  let entityData = null
  if (a.entity === 'po') {
    entityData = await db.purchaseOrder.findUnique({
      where: { id: a.entityId }, include: { party: true, lines: true },
    })
  }
  return { ...a, entityData }
}))
for (const e of enriched) {
  const entityIsString = typeof e.entity === 'string'
  const dataOk = e.entity === 'po' ? !!e.entityData?.poNo : e.entityData === null
  console.log(`entity=${JSON.stringify(e.entity)} (string=${entityIsString}) entityData.poNo=${e.entityData?.poNo ?? 'null'} OK=${entityIsString && dataOk}`)
}
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
