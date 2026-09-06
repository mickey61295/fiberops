/**
 * Day-book register service — SPEC-M52 M-03 (Module M Batch 3): the
 * chronological GL voucher register — every journal row, every voucherType,
 * every status (THE GL DOCTRINE, §1: the status flag is sub-ledger
 * truth-ownership, the contra row IS the GL's reversal — a cancelled voucher
 * renders its badge and its CN- mirror sits right under it, the audit
 * visible, the net honest). Dr/Cr columns show the resolved CoA account
 * 'Name [code]'; a null-FK leg (pre-backfill residue) renders the raw string
 * with an UNLINKED marker — the honesty door, never a silent blank.
 * `get_day_book` (agent tool) delegates here — one service, both doors
 * (ADR-001).
 */
import { db } from '@/lib/db'
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'
import { journalWindowWhere } from './trial-balance'

const r2 = (n: number) => Math.round(n * 100) / 100

export async function queryDayBook(q: RegisterQuery): Promise<RegisterResult> {
  const where = journalWindowWhere(q.from, q.to)
  // variant = the voucherType filter (all | receipt | payment | journal |
  // contra | debit-note — the M51 companion types ride the same column)
  if (q.variant && q.variant !== 'all') where.voucherType = q.variant
  if (q.q) {
    where.OR = [
      { voucherNo: { contains: q.q } },
      { narration: { contains: q.q } },
      { debitAccount: { contains: q.q } },
      { creditAccount: { contains: q.q } },
    ]
  }

  const journals = await db.journal.findMany({
    where,
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    take: 2000,
    select: {
      id: true, voucherNo: true, voucherType: true, date: true,
      debitAccount: true, creditAccount: true, debitAccountId: true, creditAccountId: true,
      partyId: true, amount: true, narration: true, status: true,
    },
  })

  // account labels (one map for both legs) + party names
  const accIds = [...new Set(journals.flatMap((j) => [j.debitAccountId, j.creditAccountId]).filter(Boolean))] as string[]
  const accounts = accIds.length
    ? await db.account.findMany({ where: { id: { in: accIds } }, select: { id: true, code: true, name: true } })
    : []
  const accById = new Map(accounts.map((a) => [a.id, a]))
  const leg = (j: { debitAccountId: string | null; creditAccountId: string | null; debitAccount: string; creditAccount: string }, which: 'debit' | 'credit') => {
    const id = which === 'debit' ? j.debitAccountId : j.creditAccountId
    const raw = which === 'debit' ? j.debitAccount : j.creditAccount
    const a = id ? accById.get(id) : undefined
    return a ? `${a.name} [${a.code}]` : `${raw} · UNLINKED`
  }
  const partyIds = [...new Set(journals.map((j) => j.partyId).filter(Boolean))] as string[]
  const parties = partyIds.length
    ? await db.party.findMany({ where: { id: { in: partyIds } }, select: { id: true, name: true } })
    : []
  const partyById = new Map(parties.map((p) => [p.id, p.name]))

  const rows: RegisterRow[] = journals.map((j) => ({
    id: j.id,
    href: `/accounts/journal/${j.voucherNo}`, // the view resolves id OR voucherNo
    date: j.date.toISOString().slice(0, 10),
    voucher: j.voucherNo,
    type: j.voucherType,
    dr: leg(j, 'debit'),
    cr: leg(j, 'credit'),
    party: j.partyId ? partyById.get(j.partyId) ?? '—' : '',
    amount: r2(j.amount),
    narration: j.narration ?? '',
    status: j.status,
  }))

  // pagination over the chronological list (the full window stays summarized)
  const start = (q.page - 1) * q.limit
  const pageRows = rows.slice(start, start + q.limit)
  const total = r2(journals.reduce((s, j) => s + j.amount, 0))
  const window = q.from || q.to
    ? `${q.from ? q.from.toISOString().slice(0, 10) : 'start'} → ${q.to ? q.to.toISOString().slice(0, 10) : 'now'}`
    : 'all time'
  const cancelled = journals.filter((j) => j.status !== 'active').length

  return {
    rows: pageRows,
    totals: [
      { label: 'Vouchers', value: journals.length },
      { label: 'Amount ₹', value: Math.round(total) },
      { label: 'Cancelled', value: cancelled },
    ],
    summary: `${journals.length} journal rows (${window}${q.variant && q.variant !== 'all' ? `, type ${q.variant}` : ''}) — ₹${Math.round(total).toLocaleString('en-IN')}${cancelled ? ` (${cancelled} cancelled — their CN- contras sit in the same book and net them)` : ''}. Every row counts in the GL regardless of status (SPEC-M52 §1).`,
    count: journals.length,
  }
}
