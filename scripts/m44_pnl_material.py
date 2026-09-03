#!/usr/bin/env python3
"""SPEC-M44 CST-04 — the daily-unit-pnl material leg: queryDailyPnl gains the
period material total (material OUT legs at bucket WAC) + Net Margin formula
update + summary text. Python surgery (the Edit tool choked on the block)."""
import io

P = '/home/z/my-project/src/lib/erp/reports/chain-money-reports.ts'
s = io.open(P, encoding='utf-8').read()

# 1 — imports: getFlag (waste godown code) + itemWacRates + primaryUomOf
OLD_IMPORTS = """import type { RegisterQuery, RegisterResult, RegisterRow } from '../registers/types'
import { db } from '@/lib/db'
import { CHAIN_ORDER_INCLUDE, computeChainState, nextStage } from '../chain'"""
NEW_IMPORTS = """import type { RegisterQuery, RegisterResult, RegisterRow } from '../registers/types'
import { db } from '@/lib/db'
import { CHAIN_ORDER_INCLUDE, computeChainState, nextStage } from '../chain'
// SPEC-M44 CST-04 — the material leg: waste-godown code flag + the bucket-WAC
// lookup (itemWacRates) + primaryUomOf (yarn/fabric = kgs, accessory = pcs)
import { getFlag } from '../flags'
import { itemWacRates } from '../item-wac'
import { primaryUomOf } from '../valuation'"""
assert s.count(OLD_IMPORTS) == 1, 'imports anchor'
s = s.replace(OLD_IMPORTS, NEW_IMPORTS)

# 2 — the header comment: document the material leg
OLD_HDR = """// Expenses are PERIOD-level (no dept column — ERRATUM §13-1): they ride the
// totals band, not the per-dept rows.
// ---------------------------------------------------------------------------"""
NEW_HDR = """// Expenses are PERIOD-level (no dept column — ERRATUM §13-1): they ride the
// totals band, not the per-dept rows.
// SPEC-M44 CST-04 — the MATERIAL leg (period-level, the same honesty): Σ over
// material OUT legs (itemType yarn|fabric|accessory, txnType process_delivery
// | stock_adjustment_less — consumption: material issued to processing or
// lost to waste/variance; internal transfers and purchase returns are NOT
// consumption) of primary-uom qty × the item's bucket WAC (itemWacRates —
// NEVER the leg's own rate: JW legs carry the PROCESS charge, valuing
// material at the knitting rate would double-count conversion). Waste-godown
// legs are excluded (the M42 waste identity — scrap at waste_scrap_rate).
// Net Margin becomes produced − wages − expenses − material (the §11 formula
// — the P&L stops being wage-margin-only).
// ---------------------------------------------------------------------------
/** CST-04 — the period's material consumption value at bucket WAC. */
async function materialPeriodTotal(from?: Date, to?: Date): Promise<{ value: number; kgs: number; legs: number }> {
  const w: any = {
    itemType: { in: ['yarn', 'fabric', 'accessory'] },
    txnType: { in: ['process_delivery', 'stock_adjustment_less'] },
    OR: [{ outKgs: { gt: 0 } }, { outPcs: { gt: 0 } }, { outMtrs: { gt: 0 } }],
  }
  if (from || to) {
    w.docDate = {}
    if (from) w.docDate.gte = from
    if (to) w.docDate.lte = to
  }
  const legs = await db.stockLedger.findMany({ where: w, select: { itemType: true, itemId: true, godownId: true, outKgs: true, outPcs: true, outMtrs: true } })
  // exclude the waste godown legs (scrap identity — the OUT from the SOURCE
  // godown is already counted; a WASTE-store OUT would double-count scrap)
  const wasteCode = (await getFlag<string>('waste_godown_code')) || 'WASTE'
  const wasteGodown = await db.godown.findUnique({ where: { code: wasteCode } }).catch(() => null)
  const live = wasteGodown ? legs.filter((l) => l.godownId !== wasteGodown.id) : legs
  // batch the WAC rates per itemType
  const byType: Record<string, Set<string>> = {}
  for (const l of live) {
    byType[l.itemType] ??= new Set()
    byType[l.itemType].add(l.itemId)
  }
  const rates: Record<string, Map<string, number>> = {}
  for (const [t, ids] of Object.entries(byType)) {
    rates[t] = await itemWacRates(t, [...ids])
  }
  let value = 0
  let kgs = 0
  for (const l of live) {
    const primary = primaryUomOf(l.itemType)
    const qty = primary === 'kgs' ? l.outKgs : l.outPcs
    if (qty <= 0) continue
    value += qty * (rates[l.itemType]?.get(l.itemId) ?? 0)
    if (primary === 'kgs') kgs += qty
  }
  return { value, kgs, legs: live.length }
}"""
assert s.count(OLD_HDR) == 1, 'header anchor'
s = s.replace(OLD_HDR, NEW_HDR)

# 3 — the function body: fetch material, extend totals + summary
OLD_FETCH = """  const [entries, expenses] = await Promise.all([
    db.productionEntry.findMany({
      where: pWhere,
      include: {
        department: true,
        order: { select: { totalPcs: true, totalValue: true, currency: true, fxRate: true } },
      },
      take: 10000,
    }),
    db.expense.findMany({ where: { ...dateWhere(q, 'expDate') }, take: 10000 }),
  ])"""
NEW_FETCH = """  const [entries, expenses, material] = await Promise.all([
    db.productionEntry.findMany({
      where: pWhere,
      include: {
        department: true,
        order: { select: { totalPcs: true, totalValue: true, currency: true, fxRate: true } },
      },
      take: 10000,
    }),
    db.expense.findMany({ where: { ...dateWhere(q, 'expDate') }, take: 10000 }),
    // SPEC-M44 CST-04 — the material leg at bucket WAC
    materialPeriodTotal(q.from, q.to),
  ])"""
assert s.count(OLD_FETCH) == 1, 'fetch anchor'
s = s.replace(OLD_FETCH, NEW_FETCH)

OLD_TOTALS = """    totals: [
      { label: 'Produced Value', value: Math.round(producedTotal) },
      { label: 'Wages', value: Math.round(wagesTotal) },
      { label: 'Expenses (period)', value: Math.round(expensesTotal) },
      { label: 'Net Margin', value: Math.round(producedTotal - wagesTotal - expensesTotal) },
    ],
    summary: `${all.length} dept-days · produced ₹${Math.round(producedTotal).toLocaleString('en-IN')} − wages ₹${Math.round(wagesTotal).toLocaleString('en-IN')} − expenses ₹${Math.round(expensesTotal).toLocaleString('en-IN')}`,
    count: all.length,
  }
}"""
NEW_TOTALS = """    totals: [
      { label: 'Produced Value', value: Math.round(producedTotal) },
      { label: 'Wages', value: Math.round(wagesTotal) },
      { label: 'Expenses (period)', value: Math.round(expensesTotal) },
      { label: 'Material (period, WAC)', value: Math.round(material.value) },
      { label: 'Net Margin', value: Math.round(producedTotal - wagesTotal - expensesTotal - material.value) },
    ],
    summary: `${all.length} dept-days · produced ₹${Math.round(producedTotal).toLocaleString('en-IN')} − wages ₹${Math.round(wagesTotal).toLocaleString('en-IN')} − expenses ₹${Math.round(expensesTotal).toLocaleString('en-IN')} − material ₹${Math.round(material.value).toLocaleString('en-IN')} (WAC${material.kgs > 0 ? `, ${material.kgs.toLocaleString('en-IN')} kg` : ''})`,
    count: all.length,
  }
}"""
assert s.count(OLD_TOTALS) == 1, 'totals anchor'
s = s.replace(OLD_TOTALS, NEW_TOTALS)

io.open(P, 'w', encoding='utf-8').write(s)
print('queryDailyPnl material leg spliced OK')
