/* Quick verify: actor stamp on the grn_acceptance approval created via the
 * /api/agent/approve human door (M7 Wave B e2e check). */
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

async function main() {
  const rows = await db.approval.findMany({
    where: { entity: 'grn_acceptance' },
    orderBy: { createdAt: 'desc' },
    take: 3,
  })
  for (const r of rows) {
    console.log(`${r.entity} ${r.status} approvedBy=${r.approvedBy} requestedBy=${r.requestedBy} comments=${r.comments}`)
  }
}

main().finally(() => db.$disconnect())
