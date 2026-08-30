/**
 * Stock bucket valuation — HFX-11 (Phase-6B Batch 0).
 *
 * One shared value function for EVERY screen that values a CurrentStock
 * bucket (dashboard stock_value tile + stock-register rows/totals). Before
 * this helper the two sites each rolled `(kgs + mtrs + pcs) * rate` inline —
 * dimensionally wrong for a mixed-uom bucket (kgs and pcs are different
 * physical quantities; summing them before × rate values kgs at a per-pc
 * rate and vice versa) and free to drift apart.
 *
 * The per-uom FORM (each uom column valued as its own qty × rate term, then
 * summed) keeps the math dimension-explicit: when per-uom rates arrive (the
 * WAC work, Batch 1+), only this function changes — no caller edits.
 *
 * bags are packaging (not valued stock) and pcs/kgs/mtrs carry the bucket's
 * single rate column; the unit test pins the mixed-uom bucket contract.
 */

export interface ValuableBucket {
  kgs: number
  mtrs: number
  pcs: number
  rate: number
}

/** Value one CurrentStock bucket: Σ per-uom (qty × rate). Never (kgs+mtrs+pcs) × rate. */
export function valueBucket(b: ValuableBucket): number {
  // per-uom terms summed SEPARATELY (dimension-explicit form) — see header
  const kgsValue = b.kgs * b.rate
  const mtrsValue = b.mtrs * b.rate
  const pcsValue = b.pcs * b.rate
  return kgsValue + mtrsValue + pcsValue
}
