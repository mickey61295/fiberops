/**
 * Cash-book register service — SPEC-M52 M-03 (Module M Batch 3): the
 * cash-family day-book with running balance. The family is CoA TOPOLOGY, not
 * code-prefix guessing: account 1010 (the Cash/Bank control) + its direct
 * children (the per-bank GL rows M51's bank legs post to) — a bank GL row
 * created elsewhere in the tree is the operator's CoA choice and stays where
 * they put it. Opening balance = the family net BEFORE `from`; closing =
 * opening + window net; the running balance walks date-then-createdAt order.
 * Every row counts regardless of status (THE GL DOCTRINE, §1) — a cancelled
 * receipt's CN- contra appears as the mirrored outflow that nets it.
 * `get_cash_book` (agent tool) delegates here — one service, both doors
 * (ADR-001).
 */
import { db } from '@/lib/db'
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'
import { journalWindowWhere } from './trial-balance'

const r2 = (n: number) => Math.round(n * 100) / 100

/** The cash family: the 1010 control + its direct children (per-bank rows). */
export async function cashFamilyIds(client: any = db): Promise<{ id: string; code: string; name: string }[]> {
  const control = await client.account.findFirst({
    where: { code: '1010' },
    select: { id: true, code: true, name: true },
  })
  if (!control) return []
  const children: { id: string; code: string; name: string }[] = await client.account.findMany({
    where: { parentId: control.id },
    select: { id: true, code: true, name: true },
    orderBy: { code: 'asc' },
  })
  return [control, ...children]
}

export async function queryCashBook(q: RegisterQuery): Promise<RegisterResult> {
  const family = await cashFamilyIds()
  if (!family.length) {
    return {
      rows: [],
      summary: 'Chart of accounts incomplete — the Cash/Bank control [1010] is missing. Seed it (scripts/seed_coa.ts) or create it (create_account / /masters/account).',
      count: 0,
    }
  }
  const familyIds = new Set(family.map((f) => f.id))

  // variant: 'all' (the whole family) or ONE family account's code
  let scopeIds = new Set(family.map((f) => f.id))
  let scopeLabel = 'Cash & Bank family (1010 + banks)'
  if (q.variant && q.variant !== 'all') {
    const one = family.find((f) => f.code === q.variant)
    if (!one) {
      return {
        rows: [],
        summary: `Account '${q.variant}' is not in the cash family (1010 or a bank row under it). Family: ${family.map((f) => f.code).join(', ')}.`,
        count: 0,
      }
    }
    scopeIds = new Set([one.id])
    scopeLabel = `${one.name} [${one.code}]`
  }

  // opening: the family net BEFORE `from` (the window discipline — a cash-book
  // without its opening is a list, not a book)
  let opening = 0
  if (q.from) {
    const prior = await db.journal.findMany({
      where: { date: { lt: q.from } },
      select: { amount: true, debitAccountId: true, creditAccountId: true },
    })
    for (const j of prior) {
      if (j.debitAccountId && scopeIds.has(j.debitAccountId)) opening += j.amount
      if (j.creditAccountId && scopeIds.has(j.creditAccountId)) opening -= j.amount
    }
  }

  // the window's family rows (every status — the doctrine)
  const where = journalWindowWhere(q.from, q.to)
  where.OR = [
    { debitAccountId: { in: [...scopeIds] } },
    { creditAccountId: { in: [...scopeIds] } },
  ]
  const journals = await db.journal.findMany({
    where,
    orderBy: [{ date: 'asc' }, { createdAt: 'asc' }],
    take: 2000,
    select: {
      id: true, voucherNo: true, voucherType: true, date: true,
      debitAccountId: true, creditAccountId: true,
      debitAccount: true, creditAccount: true,
      amount: true, narration: true, status: true,
    },
  })

  // the other leg's label (the counter-account) — one map for all accounts
  const accIds = [...new Set(journals.flatMap((j) => [j.debitAccountId, j.creditAccountId]).filter(Boolean))] as string[]
  const accounts = accIds.length
    ? await db.account.findMany({ where: { id: { in: accIds } }, select: { id: true, code: true, name: true } })
    : []
  const accById = new Map(accounts.map((a) => [a.id, a]))

  const rows: RegisterRow[] = []
  let running = opening
  let inflow = 0
  let outflow = 0
  for (const j of journals) {
    const inFamily = j.debitAccountId ? scopeIds.has(j.debitAccountId) : false
    const outFamily = j.creditAccountId ? scopeIds.has(j.creditAccountId) : false
    const amount = r2(j.amount)
    if (inFamily) { inflow += amount; running += amount }
    if (outFamily) { outflow += amount; running -= amount }
    // particulars = the leg OUTSIDE the family (both legs in-family = an
    // internal transfer — particulars says so honestly)
    const other = inFamily
      ? j.creditAccountId ? accById.get(j.creditAccountId) : null
      : j.debitAccountId ? accById.get(j.debitAccountId) : null
    const rawOther = inFamily ? j.creditAccount : j.debitAccount
    const particulars = inFamily && outFamily
      ? 'Internal cash/bank transfer'
      : other ? `${other.name} [${other.code}]` : `${rawOther} · UNLINKED`
    rows.push({
      id: j.id,
      href: `/accounts/journal/${j.voucherNo}`,
      date: j.date.toISOString().slice(0, 10),
      voucher: j.voucherNo,
      particulars,
      inflow: inFamily ? amount : 0,
      outflow: outFamily ? amount : 0,
      balance: r2(running),
      status: j.status,
    })
  }

  const start = (q.page - 1) * q.limit
  const pageRows = rows.slice(start, start + q.limit)
  const closing = r2(opening + inflow - outflow)
  const window = q.from || q.to
    ? `${q.from ? q.from.toISOString().slice(0, 10) : 'start'} → ${q.to ? q.to.toISOString().slice(0, 10) : 'now'}`
    : 'all time'

  return {
    rows: pageRows,
    totals: [
      { label: 'Opening ₹', value: Math.round(opening) },
      { label: 'Inflow ₹', value: Math.round(inflow) },
      { label: 'Outflow ₹', value: Math.round(outflow) },
      { label: 'Closing ₹', value: Math.round(closing) },
    ],
    summary: `${scopeLabel} (${window}) — opening ₹${Math.round(opening).toLocaleString('en-IN')} + in ₹${Math.round(inflow).toLocaleString('en-IN')} − out ₹${Math.round(outflow).toLocaleString('en-IN')} = closing ₹${Math.round(closing).toLocaleString('en-IN')} across ${journals.length} rows (every row counts — cancels net via their CN- contras).`,
    count: rows.length,
  }
}
