/* Quick DB state check for test planning. */
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

async function main() {
  const godowns = await db.godown.findMany({ select: { code: true, name: true } })
  const depts = await db.department.findMany({ select: { code: true, name: true } })
  const counts = {
    buyers: await db.buyer.count(),
    styles: await db.style.count(),
    employees: await db.employee.count(),
    lines: await db.line.count(),
    parties: await db.party.count(),
    uoms: await db.uOM.count(),
    yarns: await db.yarn.count(),
    colours: await db.colour.count(),
    sizes: await db.size.count(),
    orders: await db.order.count(),
    programs: await db.program.count(),
  }
  console.log(JSON.stringify({ godowns, depts, counts }, null, 2))
}

main().finally(() => db.$disconnect())
