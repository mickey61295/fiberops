/* SPEC-M50 M-01 (CA-02) — seed the chart of accounts into db/custom.db
 * (the same 19-row tree scripts/seed.ts plants for fresh databases and
 * src/lib/erp/coa.ts COA_TREE owns — standalone scripts can't import the
 * src module's @/ aliases, so the tree is mirrored here; pinned by
 * tests/pipeline/accounts-m01.test.ts). Idempotent — safe to re-run:
 * upsert by code, update {} (a human edit to name/type is kept).
 *
 * Run:  node scripts/seed_coa.ts
 */
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

const COA: Array<[string, string, string, string | null]> = [
  ['1000', 'Cash & Bank', 'asset', null],
  ['1010', 'Cash/Bank', 'asset', '1000'],
  ['1100', 'Current Assets', 'asset', null],
  ['1110', 'Sundry Debtors', 'asset', '1100'],
  ['2000', 'Current Liabilities', 'liability', null],
  ['2100', 'Sundry Creditors', 'liability', '2000'],
  ['2200', 'Wage Payable', 'liability', '2000'],
  ['2210', 'PF Payable', 'liability', '2000'],
  ['2220', 'ESI Payable', 'liability', '2000'],
  ['2230', 'PT Payable', 'liability', '2000'],
  ['2240', 'LWF Payable', 'liability', '2000'],
  ['4000', 'Income', 'income', null],
  ['4010', 'Sales', 'income', '4000'],
  ['5000', 'Direct Expenses', 'expense', null],
  ['5010', 'Production Wages', 'expense', '5000'],
  ['5020', 'Freight', 'expense', '5000'],
  ['5100', 'Indirect Expenses', 'expense', null],
  ['5110', 'Staff Salaries', 'expense', '5100'],
  ['9000', 'Suspense Account', 'equity', null],
]

async function main() {
  const ids = new Map<string, string>()
  // groups first (parents exist before children point at them)
  for (const [code, name, type, parent] of [...COA].sort((a, b) => (a[3] ? 1 : 0) - (b[3] ? 1 : 0))) {
    const acc = await db.account.upsert({
      where: { code },
      update: {},
      create: { code, name, type, parentId: parent ? ids.get(parent) ?? null : null, active: true },
    })
    ids.set(code, acc.id)
  }
  const count = await db.account.count()
  console.log(`✅ CoA seeded: ${count} accounts (19-row standard tree; re-runs are no-ops)`)
  const journalUnlinked = await db.journal.count({ where: { OR: [{ debitAccountId: null }, { creditAccountId: null }] } })
  if (journalUnlinked > 0) {
    console.log(`   ${journalUnlinked} journal row(s) still unlinked — run scripts/backfill_coa.ts`)
  }
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
