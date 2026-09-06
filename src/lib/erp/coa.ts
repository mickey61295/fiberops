/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M50 M-01 — the chart of accounts library.
//   COA_TREE   the seeded standard tree (19 rows, 2 levels, 5 types) — every
//              name the posting layer writes is here VERBATIM so the guard
//              (CA-04) always resolves: 'Cash/Bank', 'Production Wages',
//              'Staff Salaries', 'Wage Payable', 'PF/ESI/PT/LWF Payable'.
//   seedCoa    idempotent upsert-by-code (re-runs are no-ops) — called by
//              scripts/seed.ts, scripts/seed_coa.ts, and tests.
//   resolveAccountByRef / resolveAccountPair — exact name OR exact code,
//   never fuzzy: a near-miss is a miss (loud, not lucky).
//   partyControlName — the GL control for a party-name journal leg: the
//   partyId sub-ledger carries the real balance (M45); the FK is only the
//   classical grouping. Mode-aware cash/bank legs are M-02, NOT this batch.

import { db } from '@/lib/db'

export type AccountType = 'asset' | 'liability' | 'income' | 'expense' | 'equity'

export const ACCOUNT_TYPES: AccountType[] = ['asset', 'liability', 'income', 'expense', 'equity']

export interface CoaRow {
  code: string
  name: string
  type: AccountType
  parentCode?: string
}

/** SPEC-M50 §4 — the seeded tree. Codes are the stable key; names are the join. */
export const COA_TREE: CoaRow[] = [
  { code: '1000', name: 'Cash & Bank', type: 'asset' },
  { code: '1010', name: 'Cash/Bank', type: 'asset', parentCode: '1000' },
  { code: '1100', name: 'Current Assets', type: 'asset' },
  { code: '1110', name: 'Sundry Debtors', type: 'asset', parentCode: '1100' },
  { code: '2000', name: 'Current Liabilities', type: 'liability' },
  { code: '2100', name: 'Sundry Creditors', type: 'liability', parentCode: '2000' },
  { code: '2200', name: 'Wage Payable', type: 'liability', parentCode: '2000' },
  { code: '2210', name: 'PF Payable', type: 'liability', parentCode: '2000' },
  { code: '2220', name: 'ESI Payable', type: 'liability', parentCode: '2000' },
  { code: '2230', name: 'PT Payable', type: 'liability', parentCode: '2000' },
  { code: '2240', name: 'LWF Payable', type: 'liability', parentCode: '2000' },
  { code: '4000', name: 'Income', type: 'income' },
  { code: '4010', name: 'Sales', type: 'income', parentCode: '4000' },
  { code: '5000', name: 'Direct Expenses', type: 'expense' },
  { code: '5010', name: 'Production Wages', type: 'expense', parentCode: '5000' },
  { code: '5020', name: 'Freight', type: 'expense', parentCode: '5000' },
  { code: '5100', name: 'Indirect Expenses', type: 'expense' },
  { code: '5110', name: 'Staff Salaries', type: 'expense', parentCode: '5100' },
  { code: '9000', name: 'Suspense Account', type: 'equity' },
]

/** The GL control account for a party-type's journal legs (backfill + the
 * payment door). 'both' parties genuinely straddle debtors/creditors — the
 * honest temporary answer is Suspense + a report, not a silent guess. */
export function partyControlName(partyType: string | null | undefined): string {
  switch (partyType) {
    case 'customer': return 'Sundry Debtors'
    case 'supplier': return 'Sundry Creditors'
    case 'employee': return 'Wage Payable'
    default: return 'Suspense Account'
  }
}

/** Idempotent: upserts every COA_TREE row by code. Returns code → id. */
export async function seedCoa(client: any = db): Promise<Map<string, string>> {
  const ids = new Map<string, string>()
  // groups first (parents exist before children point at them)
  const ordered = [...COA_TREE].sort((a, b) => (a.parentCode ? 1 : 0) - (b.parentCode ? 1 : 0))
  for (const row of ordered) {
    const parentId = row.parentCode ? ids.get(row.parentCode) ?? null : null
    const acc = await client.account.upsert({
      where: { code: row.code },
      update: {}, // seeded rows never drift — a human edit to name/type is kept
      create: { code: row.code, name: row.name, type: row.type, parentId, active: true },
    })
    ids.set(row.code, acc.id)
  }
  return ids
}

export interface ResolvedAccount {
  id: string
  code: string
  name: string
  type: string
}

/** Exact NAME or exact CODE. Case-sensitive. Null on miss — the caller
 * decides loud (planJournal refuses) vs fallback (backfill → control/suspense). */
export async function resolveAccountByRef(ref: string, client: any = db): Promise<ResolvedAccount | null> {
  const t = ref?.trim()
  if (!t) return null
  const acc = await client.account.findFirst({
    where: { OR: [{ name: t }, { code: t }] },
    select: { id: true, code: true, name: true, type: true },
  })
  return acc ?? null
}

/** Resolve both legs for a voucher. Returns the pair + the misses (never
 * throws — the caller formats the refusal). */
export async function resolveAccountPair(
  debitRef: string,
  creditRef: string,
  client: any = db,
): Promise<{ debit: ResolvedAccount | null; credit: ResolvedAccount | null; missing: string[] }> {
  const [debit, credit] = await Promise.all([resolveAccountByRef(debitRef, client), resolveAccountByRef(creditRef, client)])
  const missing: string[] = []
  if (!debit) missing.push(debitRef)
  if (!credit) missing.push(creditRef)
  return { debit, credit, missing }
}

/** The refusal text for an unresolvable leg (CA-04 — loud, with the door). */
export function unlinkedAccountError(missing: string[]): string {
  return `Unknown account ${missing.length === 1 ? 'name' : 'names'}: ${missing.join(', ')} — a journal cannot save an unlinked account (SPEC-M50 M-01). Create it first (create_account, or /masters/account), or pass an existing account name/code (list_accounts shows the chart).`
}

/** Label helper for plan texts: 'Production Wages [5010]'. */
export function accountLabel(acc: ResolvedAccount | null, fallback: string): string {
  return acc ? `${acc.name} [${acc.code}]` : fallback
}

/** Backfill one journal leg (CA-03 order): exact name → party-type control →
 * Suspense. `suspense` and `control` are pre-resolved accounts (the script
 * passes them in; tests pass fixtures). Returns which rule won. */
export function backfillLegPlan(
  leg: string,
  exact: ResolvedAccount | null,
  partyControl: ResolvedAccount | null,
  suspense: ResolvedAccount,
): { account: ResolvedAccount; rule: 'exact-name' | 'party-control' | 'suspense' } {
  if (exact) return { account: exact, rule: 'exact-name' }
  if (partyControl) return { account: partyControl, rule: 'party-control' }
  return { account: suspense, rule: 'suspense' }
}

export interface BackfillReport {
  examined: number
  updated: number
  legs: { exactName: number; partyControl: number; suspense: number }
  suspenseReport: string[]
}

/** The lib twin of scripts/backfill_coa.ts (the standalone script mirrors
 * these rules — standalone node can't import the src aliases; tests pin BOTH:
 * this function's behavior on fixtures + the live/script result on the db).
 * Idempotent: rows already fully linked are skipped; strings never touched. */
export async function backfillJournalLinks(client: any = db): Promise<BackfillReport> {
  const accounts: ResolvedAccount[] = await client.account.findMany({ select: { id: true, code: true, name: true, type: true } })
  const byName = new Map(accounts.map((a) => [a.name, a]))
  const suspense = byName.get('Suspense Account')
  if (!suspense) throw new Error('CoA incomplete — no Suspense Account (seed it: scripts/seed_coa.ts)')

  const rows = await client.journal.findMany({
    select: { id: true, voucherNo: true, debitAccount: true, creditAccount: true, debitAccountId: true, creditAccountId: true, partyId: true },
    where: { OR: [{ debitAccountId: null }, { creditAccountId: null }] },
  })
  const partyIds = [...new Set(rows.map((r: any) => r.partyId).filter(Boolean))] as string[]
  const parties = partyIds.length ? await client.party.findMany({ where: { id: { in: partyIds } }, select: { id: true, name: true, partyType: true } }) : []
  const partyById = new Map<string, { id: string; name: string; partyType: string }>(parties.map((p: { id: string; name: string; partyType: string }) => [p.id, p]))

  const legs = { exactName: 0, partyControl: 0, suspense: 0 }
  const report: string[] = []

  const target = (leg: string, partyId: string | null, voucherNo: string): string => {
    const exact = byName.get(leg)
    const party: { id: string; name: string; partyType: string } | undefined = partyId ? partyById.get(partyId) : undefined
    const controlName = party && party.name === leg ? partyControlName(party.partyType) : null
    const control = controlName ? byName.get(controlName) ?? null : null
    const plan = backfillLegPlan(leg, exact ?? null, control, suspense)
    legs[plan.rule === 'exact-name' ? 'exactName' : plan.rule === 'party-control' ? 'partyControl' : 'suspense']++
    if (plan.rule === 'suspense') report.push(`${voucherNo}: leg "${leg}" → Suspense Account — re-map if you know better`)
    return plan.account.id
  }

  let updated = 0
  for (const j of rows) {
    const debit = j.debitAccountId ?? target(j.debitAccount, j.partyId, j.voucherNo)
    const credit = j.creditAccountId ?? target(j.creditAccount, j.partyId, j.voucherNo)
    if (debit !== j.debitAccountId || credit !== j.creditAccountId) {
      await client.journal.update({ where: { id: j.id }, data: { debitAccountId: debit, creditAccountId: credit } })
      updated++
    }
  }
  return { examined: rows.length, updated, legs, suspenseReport: report }
}
