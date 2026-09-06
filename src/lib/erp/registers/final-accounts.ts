/**
 * Final-accounts register service — SPEC-M52 M-03 (Module M Batch 3): the
 * minimal P&L + balance sheet on the M50/M51 substrate. Builds on
 * `accountActivity` (the trial-balance math — one derivation, both reports,
 * they must agree):
 *
 *   P&L  = Σ income netCr − Σ expense netDr          (variant 'pl')
 *   BS   = assets netDr  vs  liabilities + equity netCr + the P&L net as
 *          RETAINED EARNINGS for the window         (variant 'bs')
 *
 * The BS balance is STRUCTURAL given the TB identity (ΣDr == ΣCr ⇒
 * ΣA.netDr = ΣL.netCr + ΣE.netCr + ΣI.netCr − ΣX.netDr = Liab + Equity +
 * NetP&L) — the Δ assert can only be non-zero when the TB itself is off
 * (unlinked rows), and the summary says so loudly. Zero-activity accounts
 * stay off both statements (a statement lists balances, not the chart).
 * `get_final_accounts` (agent tool) delegates here — one service, both doors
 * (ADR-001).
 */
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'
import { accountActivity } from './trial-balance'

const r2 = (n: number) => Math.round(n * 100) / 100

/** P&L + BS in one service — `variant` picks the statement ('pl' | 'bs'). */
export async function queryFinalAccounts(q: RegisterQuery): Promise<RegisterResult> {
  const act = await accountActivity(q.from, q.to)
  const variant = q.variant === 'bs' ? 'bs' : 'pl'
  const window = q.from || q.to
    ? `${q.from ? q.from.toISOString().slice(0, 10) : 'start'} → ${q.to ? q.to.toISOString().slice(0, 10) : 'now'}`
    : 'all time'

  // the P&L legs (both variants need the net — the BS's retained-earnings line)
  const income = act.rows.filter((r) => r.type === 'income')
  const expense = act.rows.filter((r) => r.type === 'expense')
  const incomeTotal = r2(income.reduce((s, r) => s - r.net, 0)) // netCr (positive = earned)
  const expenseTotal = r2(expense.reduce((s, r) => s + r.net, 0)) // netDr (positive = spent)
  const netPnl = r2(incomeTotal - expenseTotal)

  if (variant === 'pl') {
    const rows: RegisterRow[] = [
      ...income.map((r) => ({ id: r.id, code: r.code, account: r.name, head: 'Income', amount: r2(-r.net) })),
      ...expense.map((r) => ({ id: r.id, code: r.code, account: r.name, head: 'Expense', amount: r2(r.net) })),
    ]
    const balancedNote = act.unlinked ? ` (${act.unlinked} unlinked journal row(s) excluded — run scripts/backfill_coa.ts)` : ''
    return {
      rows,
      totals: [
        { label: 'Income ₹', value: Math.round(incomeTotal) },
        { label: 'Expenses ₹', value: Math.round(expenseTotal) },
        { label: 'Net P&L ₹', value: Math.round(netPnl) },
      ],
      summary: `P&L ${window} — income ₹${Math.round(incomeTotal).toLocaleString('en-IN')} (income accounts) − expenses ₹${Math.round(expenseTotal).toLocaleString('en-IN')} (expense accounts) = NET ${netPnl >= 0 ? 'PROFIT' : 'LOSS'} ₹${Math.abs(Math.round(netPnl)).toLocaleString('en-IN')}${balancedNote}. Every journal row counts (all statuses — cancels net via contras).`,
      count: rows.length,
    }
  }

  // the balance sheet
  const assets = act.rows.filter((r) => r.type === 'asset')
  const liabilities = act.rows.filter((r) => r.type === 'liability')
  const equity = act.rows.filter((r) => r.type === 'equity')
  const assetsTotal = r2(assets.reduce((s, r) => s + r.net, 0)) // netDr
  const liabTotal = r2(liabilities.reduce((s, r) => s - r.net, 0)) // netCr
  const equityTotal = r2(equity.reduce((s, r) => s - r.net, 0)) // netCr
  const rightSide = r2(liabTotal + equityTotal + netPnl)
  const delta = r2(Math.abs(assetsTotal - rightSide))

  const rows: RegisterRow[] = [
    ...assets.map((r) => ({ id: r.id, code: r.code, account: r.name, head: 'Assets', amount: r2(r.net) })),
    ...liabilities.map((r) => ({ id: r.id, code: r.code, account: r.name, head: 'Liabilities', amount: r2(-r.net) })),
    ...equity.map((r) => ({ id: r.id, code: r.code, account: r.name, head: 'Equity', amount: r2(-r.net) })),
    { id: 'pnl', code: '—', account: `Retained earnings (P&L ${window})`, head: 'Equity', amount: netPnl },
  ]
  const ok = delta === 0 && act.unlinked === 0

  return {
    rows,
    totals: [
      { label: 'Assets ₹', value: Math.round(assetsTotal) },
      { label: 'Liabilities + Equity + P&L ₹', value: Math.round(rightSide) },
      { label: 'Δ ₹', value: Math.round(delta) },
    ],
    summary: `Balance sheet ${window} — assets ₹${Math.round(assetsTotal).toLocaleString('en-IN')} vs liabilities ₹${Math.round(liabTotal).toLocaleString('en-IN')} + equity ₹${Math.round(equityTotal).toLocaleString('en-IN')} + P&L ₹${Math.round(netPnl).toLocaleString('en-IN')}${ok ? ' — BALANCED (structural: Dr == Cr ⇒ the sheet closes)' : ` — Δ ₹${delta.toLocaleString('en-IN')}${act.unlinked ? ` + ${act.unlinked} UNLINKED row(s)` : ''} — INVESTIGATE`}.`,
    count: rows.length,
  }
}
