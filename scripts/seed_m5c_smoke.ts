/**
 * M5 Wave C route-smoke seed — 4 pending Approval rows (one per kind) so the
 * kind-filtered inbox views + the API kind filter have content to render.
 * Idempotent: wipes prior SMOKE-kind approvals first, never touches non-SMOKE
 * data. GRN/DC refs bind to real rows when present (nicer entityData), else
 * fall back to SMOKE placeholders.
 */
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()
const TAG = 'M5C-SMOKE'

async function main() {
  await db.approval.deleteMany({ where: { requestedBy: TAG } }).catch(() => {})

  const grn = await db.gRN.findFirst({ orderBy: { grnNo: 'asc' } })
  const dc = await db.pcsDespatch.findFirst({ orderBy: { dcNo: 'asc' } })

  const rows = [
    { entity: 'supplier_bill', entityId: grn?.id ?? `${TAG}-GRN` },
    { entity: 'godown_transfer', entityId: 'GT-SMOKE-1' },
    { entity: 'reprocess', entityId: grn?.id ?? `${TAG}-GRN` },
    { entity: 'non_return_dc', entityId: dc?.id ?? `${TAG}-DC` },
  ]
  for (const r of rows) {
    await db.approval.create({
      data: { entity: r.entity, entityId: r.entityId, step: 1, requestedBy: TAG, status: 'pending' },
    })
  }
  console.log(`seeded ${rows.length} pending kind approvals (requestedBy=${TAG})`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
