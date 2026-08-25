/* eslint-disable @typescript-eslint/no-explicit-any */
// ============== TOLERANCE SERVICE (LLD 03 §6 port) ==============
// Flag-driven deviation checks. Every write tool that has a quantity/date
// dimension calls the relevant check before proposing its plan; verdicts ride
// on the plan card (warn = amber chip, block = red chip, plan refused).
// Severity contract:
//   ok    — within tolerance (dev 0 stays silent, small dev reports "within")
//   warn  — beyond tolerance but an allow-flag permits (or soft checks)
//   block — beyond tolerance and no allow-flag; the tool refuses to propose

import { getFlags } from './flags'

export type Severity = 'ok' | 'warn' | 'block'

export interface Verdict {
  check: string // human-readable check name
  flag: string // primary flag driving the verdict
  severity: Severity
  value?: number // observed deviation % / days
  limit?: number // flag limit
  message: string
}

function pctDeviation(actual: number, base: number): number {
  if (!base) return 0
  return ((actual - base) / base) * 100
}

/** PO qty (+ optionally rate) vs budget (order+dept Budget rows). */
export async function checkPoVsBudget(input: {
  poQty?: number
  budgetQty?: number
  poValue?: number
  budgetValue?: number
  poRate?: number
  budgetRate?: number
}): Promise<Verdict[]> {
  const f = await getFlags(['po_bud', 'po_buddev', 'po_allowadd', 'po_budrt', 'po_budrtdev'])
  const out: Verdict[] = []
  if (f.po_bud && input.budgetQty != null && input.budgetQty > 0 && input.poQty != null) {
    const dev = pctDeviation(input.poQty, input.budgetQty)
    const limit = f.po_buddev as number
    if (Math.abs(dev) > limit) {
      out.push(f.po_allowadd
        ? { check: 'PO qty vs budget', flag: 'po_buddev', severity: 'warn', value: round(dev), limit, message: `PO qty deviates ${round(dev)}% from budget — allowed by po_allowadd but flagged for review` }
        : { check: 'PO qty vs budget', flag: 'po_buddev', severity: 'block', value: round(dev), limit, message: `PO qty deviates ${round(dev)}% from budget (limit ${limit}%) — raise the budget or set po_allowadd` })
    } else if (Math.abs(dev) > 0.01) {
      out.push({ check: 'PO qty vs budget', flag: 'po_buddev', severity: 'ok', value: round(dev), limit, message: `PO qty within tolerance: ${round(dev)}% vs budget (limit ${limit}%)` })
    }
  }
  if (f.po_budrt && input.budgetRate != null && input.budgetRate > 0 && input.poRate != null) {
    const dev = pctDeviation(input.poRate, input.budgetRate)
    const limit = f.po_budrtdev as number
    if (Math.abs(dev) > limit) {
      out.push({ check: 'PO rate vs budget rate', flag: 'po_budrtdev', severity: 'warn', value: round(dev), limit, message: `PO rate deviates ${round(dev)}% from budget rate (limit ${limit}%) — rate tolerances warn, never block (budrt_inhccw parity)` })
    } else if (Math.abs(dev) > 0.01) {
      out.push({ check: 'PO rate vs budget rate', flag: 'po_budrtdev', severity: 'ok', value: round(dev), limit, message: `PO rate within tolerance: ${round(dev)}% vs budget rate (limit ${limit}%)` })
    }
  }
  return out
}

/** GRN qty vs remaining PO/DC balance (grn_bal / grn_dev / grn_alladd). */
export async function checkGrnVsPo(balQty: number, grnQty: number): Promise<Verdict[]> {
  const f = await getFlags(['grn_bal', 'grn_dev', 'grn_alladd'])
  if (!f.grn_bal || balQty <= 0) return []
  const dev = pctDeviation(grnQty, balQty)
  const limit = f.grn_dev as number
  if (dev <= limit) {
    return [{ check: 'GRN vs PO balance', flag: 'grn_dev', severity: dev > 0 ? 'ok' : 'ok', value: round(dev), limit, message: `GRN ${round(dev)}% over PO balance (limit ${limit}%) — within tolerance` }]
  }
  return [f.grn_alladd
    ? { check: 'GRN vs PO balance', flag: 'grn_dev', severity: 'warn', value: round(dev), limit, message: `GRN exceeds PO balance by ${round(dev)}% (limit ${limit}%) — allowed by grn_alladd` }
    : { check: 'GRN vs PO balance', flag: 'grn_dev', severity: 'block', value: round(dev), limit, message: `GRN exceeds PO balance by ${round(dev)}% (limit ${limit}%) — split the receipt or set grn_alladd` }]
}

/** Issue (DC) shortage vs available stock (i_scheck / i_sdev). */
export async function checkIssueShortage(availableQty: number, issueQty: number): Promise<Verdict[]> {
  const f = await getFlags(['i_scheck', 'i_sdev'])
  if (!f.i_scheck || availableQty <= 0) return []
  const dev = pctDeviation(issueQty, availableQty)
  const limit = f.i_sdev as number
  if (dev <= limit) {
    return [{ check: 'Issue vs stock', flag: 'i_sdev', severity: 'ok', value: round(dev), limit, message: `Issue ${round(dev)}% over available stock (limit ${limit}%)` }]
  }
  return [{ check: 'Issue vs stock', flag: 'i_sdev', severity: 'block', value: round(dev), limit, message: `Issue exceeds available stock by ${round(dev)}% (limit ${limit}%) — stock is short for this issue` }]
}

/** Bill qty vs GRN/DC qty (bill_bcheck / bill_bcheckdev) — the bill leg of the 3-way match. */
export async function checkBillQty(billedQty: number, refQty: number, refLabel: string): Promise<Verdict[]> {
  const f = await getFlags(['bill_bcheck', 'bill_bcheckdev'])
  if (!f.bill_bcheck || refQty <= 0) return []
  const dev = pctDeviation(billedQty, refQty)
  const limit = f.bill_bcheckdev as number
  if (Math.abs(dev) <= limit) {
    return [{ check: `Bill vs ${refLabel}`, flag: 'bill_bcheckdev', severity: 'ok', value: round(dev), limit, message: `Billed qty ${round(dev)}% vs ${refLabel} (limit ${limit}%)` }]
  }
  return [{ check: `Bill vs ${refLabel}`, flag: 'bill_bcheckdev', severity: 'warn', value: round(dev), limit, message: `Billed qty deviates ${round(dev)}% from ${refLabel} (limit ${limit}%) — over-billing suspected, verify before pass` }]
}

/** Process loss on GRN vs DC (dyeinggamtper / knittinggamtper by dept prs). */
export async function checkProcessLoss(deptPrs: number | null, sentKgs: number, receivedKgs: number): Promise<Verdict[]> {
  if (!sentKgs || sentKgs <= 0 || deptPrs == null) return []
  const isDyeing = deptPrs === 2
  const isKnitting = deptPrs === 4 || deptPrs === -4
  if (!isDyeing && !isKnitting) return []
  const flag = isDyeing ? 'dyeinggamtper' : 'knittinggamtper'
  const f = await getFlags([flag])
  const limit = f[flag] as number
  const lossPct = ((sentKgs - receivedKgs) / sentKgs) * 100
  if (lossPct <= limit) {
    return [{ check: 'Process loss', flag, severity: 'ok', value: round(lossPct), limit, message: `Process loss ${round(lossPct)}% (limit ${limit}%)` }]
  }
  return [{ check: 'Process loss', flag, severity: 'warn', value: round(lossPct), limit, message: `Process loss ${round(lossPct)}% exceeds ${limit}% limit — investigate shade wastage / short receipt` }]
}

/** Back-dating limit (entrydatedev days). Soft: warns, never blocks. */
export async function checkEntryDate(docDate: Date, now: Date = new Date()): Promise<Verdict[]> {
  const f = await getFlags(['entrydatedev'])
  const limit = f.entrydatedev as number
  const days = Math.floor((now.getTime() - docDate.getTime()) / 86_400_000)
  if (days > limit) {
    return [{ check: 'Entry date back-dating', flag: 'entrydatedev', severity: 'warn', value: days, limit, message: `Document is back-dated ${days} days (limit ${limit}) — allowed but logged` }]
  }
  return []
}

/** 3-way match: PO qty vs GRN qty vs bill qty (BIL-008 + 4.4 skill). */
export interface MatchResult {
  verdicts: Verdict[]
  poQty?: number
  grnQty?: number
  billQty: number
  poRate?: number
  billRate?: number
  matched: boolean
}

export async function threeWayMatch(input: {
  poQty?: number
  grnQty?: number
  billQty: number
  poRate?: number
  billRate?: number
}): Promise<MatchResult> {
  const verdicts: Verdict[] = []
  if (input.poQty != null) {
    verdicts.push(...(await checkBillQty(input.billQty, input.poQty, 'PO qty')))
  }
  if (input.grnQty != null) {
    verdicts.push(...(await checkBillQty(input.billQty, input.grnQty, 'GRN qty')))
  }
  if (input.poRate != null && input.poRate > 0 && input.billRate != null) {
    const dev = pctDeviation(input.billRate, input.poRate)
    if (Math.abs(dev) > 5) {
      verdicts.push({ check: 'Bill rate vs PO rate', flag: 'bill_bcheckdev', severity: 'warn', value: round(dev), limit: 5, message: `Billed rate ${round(dev)}% off PO rate — verify rate confirmation` })
    }
  }
  const matched = verdicts.every((v) => v.severity === 'ok')
  return { verdicts, poQty: input.poQty, grnQty: input.grnQty, billQty: input.billQty, poRate: input.poRate, billRate: input.billRate, matched }
}

/** Highest severity across verdicts (for plan gating). */
export function worstSeverity(verdicts: Verdict[]): Severity {
  return verdicts.some((v) => v.severity === 'block') ? 'block' : verdicts.some((v) => v.severity === 'warn') ? 'warn' : 'ok'
}

/** Render verdicts as compact plan-card lines. */
export function verdictLines(verdicts: Verdict[]): string[] {
  const icon = { ok: '·', warn: '⚠', block: '✕' } as const
  return verdicts.map((v) => `${icon[v.severity]} ${v.message}`)
}

function round(n: number): number {
  return Math.round(n * 100) / 100
}
