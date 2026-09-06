/**
 * Trial balance register service — SPEC-M52 M-03 (Module M Batch 3, Phase-6B
 * §13). THE GL DOCTRINE (§1): every journal row counts regardless of status —
 * the status flag is sub-ledger truth-ownership (DE-04: which screen nets
 * what), the CONTRA row is the GL's own reversal. So ΣDr == ΣCr is structural
 * (each row contributes its amount once to each side) and every cancel nets
 * to zero (payment-cancel keeps the original + CN-; journal/DN/expense-cancel
 * flip the original AND write the CN- mirror that compensates). Counting only
 * 'active' rows would UN-cancel the journal-cancel path — the mirror alone
 * would double-reverse: the exact bug class DE-04 fixed on the sub-ledger
 * side, refused here by never filtering.
 *
 * The unlinked honesty door: rows with a null FK (pre-M50-backfill residue —
 * zero on seeded dbs) are counted and REPORTED in the totals + summary, never
 * silently dropped. `accountActivity()` is the shared per-account math the
 * final-accounts (P&L/BS) service also builds on — one derivation, both
 * reports (they must agree).
 */
import { db } from '@/lib/db'
import type { Prisma } from '@prisma/client'
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'

export interface AccountActivityRow {
  id: string
  code: string
  name: string
  type: string
  dr: number
  cr: number
  /** Dr-positive net (dr − cr) — liabilities/income/equity are typically negative. */
  net: number
}

export interface AccountActivityResult {
  /** Accounts with any activity in the window (dr > 0 || cr > 0), code-sorted. */
  rows: AccountActivityRow[]
  totalDr: number
  totalCr: number
  /** Journal rows counted (all statuses — the doctrine). */
  journalCount: number
  /** Rows with a null FK (reported loudly; zero on a seeded db). */
  unlinked: number
  /** |totalDr − totalCr| at 2dp — 0 by construction when unlinked is 0. */
  delta: number
}

const r2 = (n: number) => Math.round(n * 100) / 100

/** The journal window filter (from = midnight, to = endOfUtcDay — the
 *  resolve.ts discipline; the caller passes parsed dates). */
export function journalWindowWhere(from?: Date, to?: Date): Prisma.JournalWhereInput {
  const where: Prisma.JournalWhereInput = {}
  if (from || to) {
    where.date = {}
    if (from) where.date.gte = from
    if (to) where.date.lte = to
  }
  return where
}

/** Per-account Dr/Cr sums over the window — THE core GL math (shared by the
 *  TB register + the final-accounts P&L/BS). Never filters status (§1). */
export async function accountActivity(from?: Date, to?: Date, client: any = db): Promise<AccountActivityResult> {
  const journals: { amount: number; debitAccountId: string | null; creditAccountId: string | null }[] =
    await client.journal.findMany({
      where: journalWindowWhere(from, to),
      select: { amount: true, debitAccountId: true, creditAccountId: true },
    })

  const acc = new Map<string, { dr: number; cr: number }>()
  let unlinked = 0
  for (const j of journals) {
    if (j.debitAccountId && j.creditAccountId) {
      const d = acc.get(j.debitAccountId) ?? { dr: 0, cr: 0 }
      d.dr += j.amount
      acc.set(j.debitAccountId, d)
      const c = acc.get(j.creditAccountId) ?? { dr: 0, cr: 0 }
      c.cr += j.amount
      acc.set(j.creditAccountId, c)
    } else {
      // a null FK row contributes to NEITHER side (excluded from both, so the
      // assert still holds) — but it is COUNTED and reported, never hidden
      unlinked++
    }
  }

  const accounts: { id: string; code: string; name: string; type: string }[] = acc.size
    ? await client.account.findMany({ where: { id: { in: [...acc.keys()] } }, select: { id: true, code: true, name: true, type: true } })
    : []
  const byId = new Map(accounts.map((a) => [a.id, a]))

  const rows: AccountActivityRow[] = []
  let totalDr = 0
  let totalCr = 0
  for (const [id, a] of acc) {
    const meta = byId.get(id)
    if (a.dr === 0 && a.cr === 0) continue
    rows.push({
      id,
      code: meta?.code ?? '????',
      name: meta?.name ?? '(account deleted)',
      type: meta?.type ?? '?',
      dr: r2(a.dr),
      cr: r2(a.cr),
      net: r2(a.dr - a.cr),
    })
    totalDr += a.dr
    totalCr += a.cr
  }
  rows.sort((a, b) => a.code.localeCompare(b.code))

  return {
    rows,
    totalDr: r2(totalDr),
    totalCr: r2(totalCr),
    journalCount: journals.length,
    unlinked,
    delta: r2(Math.abs(totalDr - totalCr)),
  }
}

/** `/accounts/trial-balance` + `get_trial_balance` (agent tool) — one service,
 *  both doors (ADR-001). The summary ASSERTS the balance: "balanced" is a
 *  claim the screen makes only when Δ is 0 (and says so loudly otherwise). */
export async function queryTrialBalance(q: RegisterQuery): Promise<RegisterResult> {
  const act = await accountActivity(q.from, q.to)
  const rows: RegisterRow[] = act.rows.map((r) => ({
    id: r.id,
    code: r.code,
    account: r.name,
    type: r.type,
    dr: r.dr,
    cr: r.cr,
    net: r.net,
    side: r.net >= 0 ? 'Dr' : 'Cr',
  }))
  const window = q.from || q.to
    ? `${q.from ? q.from.toISOString().slice(0, 10) : 'start'} → ${q.to ? q.to.toISOString().slice(0, 10) : 'now'}`
    : 'all time'
  const balanced = act.delta === 0 && act.unlinked === 0
  return {
    rows,
    totals: [
      { label: 'Rows', value: rows.length },
      { label: 'Debit ₹', value: Math.round(act.totalDr) },
      { label: 'Credit ₹', value: Math.round(act.totalCr) },
      { label: 'Unlinked', value: act.unlinked },
    ],
    summary: `${rows.length} accounts (${window}, ${act.journalCount} journal rows counted — every row, all statuses) — Debit ₹${Math.round(act.totalDr).toLocaleString('en-IN')} / Credit ₹${Math.round(act.totalCr).toLocaleString('en-IN')}${balanced ? ' — BALANCED (Dr == Cr asserted)' : ` — Δ ₹${act.delta.toLocaleString('en-IN')}${act.unlinked ? ` + ${act.unlinked} UNLINKED row(s) (null account FK — run scripts/backfill_coa.ts)` : ''} — INVESTIGATE`}`,
    count: rows.length,
  }
}
