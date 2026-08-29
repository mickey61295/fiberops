/**
 * Counter-book grouped register mode — SPEC-M19 §4 Wave D (audit §7-C).
 * Tirupur accountants keep handwritten day-books with date-break subtotals;
 * this pure helper groups a register result's rows into sections (ascending),
 * each with a subtotal row over the numeric columns, plus optional cumulative
 * running-balance columns from balancePairs (in−out running). PURE — zero db,
 * trivially testable; RegisterScreen renders its output server-side.
 */

export interface CounterBookBalancePair {
  in: string
  out: string
  label: string
}

export interface CounterBookSection {
  /** section key (the groupBy field's rendered value, e.g. '2026-08-14') */
  key: string
  rows: Record<string, unknown>[]
  /** per-column numeric subtotals for this section */
  subtotal: Record<string, number>
  /** cumulative in−out per balancePair label, up to AND INCLUDING this section */
  running: Record<string, number>
}

/** Column names worth subtotaling: numeric, right-aligned, non-date, non-rate. */
export function counterBookColumns(columns: { name: string; align?: string; format?: string }[]): string[] {
  return columns
    .filter((c) => c.align === 'right' && c.format !== 'date' && c.name !== 'rate')
    .map((c) => c.name)
}

/**
 * Group rows into ascending sections with subtotals + running balances.
 * Rows arrive date-DESC from the services (day-book paging); the counter book
 * is CHRONOLOGICAL — sections are reversed to ASC before running totals.
 */
export function groupCounterBook(
  rows: Record<string, unknown>[],
  columns: { name: string; align?: string; format?: string }[],
  groupBy: string,
  balancePairs: CounterBookBalancePair[] = [],
): CounterBookSection[] {
  const numericCols = counterBookColumns(columns)
  const byKey = new Map<string, Record<string, unknown>[]>()
  for (const r of rows) {
    const k = String(r[groupBy] ?? '—')
    const list = byKey.get(k)
    if (list) list.push(r)
    else byKey.set(k, [r])
  }
  // sections ascending (the counter book is chronological)
  const keys = [...byKey.keys()].sort()

  const sections: CounterBookSection[] = []
  const running: Record<string, number> = {}
  for (const label of balancePairs) running[label.label] = 0
  for (const k of keys) {
    const subtotal: Record<string, number> = {}
    for (const c of numericCols) subtotal[c] = 0
    for (const r of byKey.get(k)!) {
      for (const c of numericCols) subtotal[c] += Number(r[c] ?? 0) || 0
    }
    for (const p of balancePairs) {
      running[p.label] += (subtotal[p.in] ?? 0) - (subtotal[p.out] ?? 0)
    }
    sections.push({
      key: k,
      rows: byKey.get(k)!,
      subtotal,
      running: { ...running },
    })
  }
  return sections
}
