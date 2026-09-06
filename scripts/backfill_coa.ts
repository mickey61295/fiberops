/* SPEC-M50 M-01 (CA-03) — one-time (idempotent) backfill: link every journal
 * row's GL legs to the chart of accounts. Per leg, in order:
 *   1. exact Account NAME match ('Cash/Bank', 'Production Wages', …);
 *   2. the leg EQUALS the row's party's name → the party-type control
 *      (customer → Sundry Debtors, supplier → Sundry Creditors,
 *       employee → Wage Payable, both/other → Suspense Account);
 *   3. otherwise Suspense Account — REPORTED below so a human can re-map.
 *
 * The free STRINGS are never rewritten (they are the voucher's detail/audit
 * text; the partyId sub-ledger carries the real balance — M45); only the
 * debitAccountId/creditAccountId links are stamped. Rows already fully
 * linked are skipped — re-runs are no-ops.
 *
 * Run:  node scripts/seed_coa.ts && node scripts/backfill_coa.ts
 */
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const accounts = await db.account.findMany({ select: { id: true, code: true, name: true } })
  const byName = new Map(accounts.map((a) => [a.name, a]))
  const byCode = new Map(accounts.map((a) => [a.code, a]))
  if (accounts.length === 0) {
    console.error('No accounts — run scripts/seed_coa.ts first')
    process.exit(1)
  }
  const suspense = byName.get('Suspense Account') ?? accounts[0]

  const rows = await db.journal.findMany({
    select: { id: true, voucherNo: true, debitAccount: true, creditAccount: true, debitAccountId: true, creditAccountId: true, partyId: true },
    where: { OR: [{ debitAccountId: null }, { creditAccountId: null }] },
  })
  const partyIds = [...new Set(rows.map((r) => r.partyId).filter(Boolean) as string[])]
  const parties = partyIds.length ? await db.party.findMany({ where: { id: { in: partyIds } }, select: { id: true, name: true, partyType: true } }) : []
  const partyById = new Map(parties.map((p) => [p.id, p]))

  let exactName = 0, partyControl = 0, suspenseHits = 0
  const suspenseReport: string[] = []

  const legTarget = (leg: string, partyId: string | null, voucherNo: string): string => {
    const exact = byName.get(leg)
    if (exact) { exactName++; return exact.id }
    const party = partyId ? partyById.get(partyId) : undefined
    if (party && party.name === leg) {
      const controlName =
        party.partyType === 'customer' ? 'Sundry Debtors' :
        party.partyType === 'supplier' ? 'Sundry Creditors' :
        party.partyType === 'employee' ? 'Wage Payable' : 'Suspense Account'
      const control = byName.get(controlName)
      if (control) { partyControl++; return control.id }
    }
    suspenseHits++
    suspenseReport.push(`${voucherNo}: leg "${leg}" → Suspense Account (${byCode.get(suspense.id)?.code}) — re-map at /masters/account if you know better`)
    return suspense.id
  }

  let changed = 0
  for (const j of rows) {
    const debit = j.debitAccountId ?? legTarget(j.debitAccount, j.partyId, j.voucherNo)
    const credit = j.creditAccountId ?? legTarget(j.creditAccount, j.partyId, j.voucherNo)
    if (debit !== j.debitAccountId || credit !== j.creditAccountId) {
      await db.journal.update({ where: { id: j.id }, data: { debitAccountId: debit, creditAccountId: credit } })
      changed++
    }
  }

  const total = await db.journal.count()
  const unlinked = await db.journal.count({ where: { OR: [{ debitAccountId: null }, { creditAccountId: null }] } })
  console.log(`✅ CoA backfill: ${rows.length} row(s) examined, ${changed} updated (${exactName} exact-name legs, ${partyControl} party-control legs, ${suspenseHits} suspense legs)`)
  console.log(`   Journal state: ${total} rows, ${unlinked} unlinked (0 = the CA-04 invariant holds)`)
  if (unlinked > 0) console.warn('   ⚠ rows still unlinked — inspect the db')
  for (const line of suspenseReport) console.log(`   · ${line}`)
}

main().catch((e) => { console.error(e); process.exit(1) }).finally(() => db.$disconnect())
