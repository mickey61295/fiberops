// Flaky-test investigation: inspect db/test.db residue right after a failing run.
// Read-only diagnostics — no writes.
const { PrismaClient } = require('@prisma/client')
const db = new PrismaClient({ datasources: { db: { url: 'file:' + process.cwd() + '/db/test.db' } } })

async function main() {
  const exps = await db.expense.findMany({ select: { expNo: true, status: true, category: true, partyId: true, headId: true, createdAt: true }, orderBy: { expNo: 'asc' } })
  console.log('== Expense rows:', exps.length)
  for (const e of exps) console.log('  ', e.expNo, '|', e.status, '|', e.category, '| head:', e.headId ?? '-', '| created:', e.createdAt?.toISOString())

  const jvs = await db.journal.findMany({ where: { OR: [{ voucherNo: { startsWith: 'JV-EXP-' } }, { voucherNo: { startsWith: 'CN-JV-EXP-' } }] }, select: { voucherNo: true, status: true, partyId: true, debitAccount: true, creditAccount: true, createdAt: true }, orderBy: { voucherNo: 'asc' } })
  console.log('== JV-EXP-*/CN-JV-EXP-* journals:', jvs.length)
  for (const j of jvs) console.log('  ', j.voucherNo, '|', j.status, '| Dr', j.debitAccount, '/ Cr', j.creditAccount, '| created:', j.createdAt?.toISOString())

  const heads = await db.expenseHead.findMany({ select: { code: true, name: true, category: true, glAccount: true, active: true } })
  console.log('== ExpenseHead rows:', heads.length)
  for (const h of heads) console.log('  ', h.code, '|', h.name, '|', h.category, '| gl:', h.glAccount ?? '-', '| active:', h.active)

  const parties = await db.party.count()
  const orders = await db.order.count({ where: { orderNo: { startsWith: 'M54R-' } } })
  console.log('== Party rows total:', parties, '| M54R orders left:', orders)

  // the exact m05 residue-hygiene queries from the test's beforeAll
  const m54exp = await db.expense.count({ where: { expNo: { startsWith: 'EXP-M54' } } })
  const m54jv = await db.journal.count({ where: { voucherNo: { in: ['JV-EXP-M54A', 'JV-EXP-M54B', 'JV-EXP-M54C', 'JV-EXP-M54D'] } } })
  console.log('== EXP-M54* expenses left:', m54exp, '| exact-name JV leftovers:', m54jv)

  // any journal whose voucherNo matches the m05 auto-number space
  const auto = await db.journal.findMany({ where: { voucherNo: { startsWith: 'JV-EXP-' } } })
  console.log('== journals matching JV-EXP- prefix (auto companion space):', auto.length)

  const accounts = await db.account.count()
  console.log('== Account rows total:', accounts)
  const finYears = await db.finYear.findMany({ select: { code: true, active: true } })
  console.log('== FinYears:', JSON.stringify(finYears))
}

main().then(() => db.$disconnect()).catch((e) => { console.error('INSPECT ERROR:', e.message); process.exit(1) })
