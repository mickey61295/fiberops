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

/** SPEC-M42 INV-02 — the bucket's PRIMARY uom (the movement-matrix isKgsItem
 *  rule, given its shared home here): the single bucket rate is a kgs rate for
 *  yarn/fabric and a pcs rate for accessory/pcs, so WAC blends weight by THIS
 *  qty. bumpStock's in-branch and the closing-stock replay both use it — the
 *  golden test pins that they agree bit-exactly. */
export function primaryUomOf(itemType: string): 'kgs' | 'pcs' {
  return itemType === 'yarn' || itemType === 'fabric' ? 'kgs' : 'pcs'
}

/** The per-uom qty of a movement/bucket under its primary uom. */
export function primaryQtyOf(itemType: string, q: { kgs?: number | null; pcs?: number | null }): number {
  return primaryUomOf(itemType) === 'kgs' ? (q.kgs ?? 0) : (q.pcs ?? 0)
}

/** SPEC-M42 INV-02 — one moving weighted-average step, shared by bumpStock
 *  (post time) and the closing-stock replay (as-of-date) so both sides run the
 *  IDENTICAL arithmetic sequence:
 *    rate' = (max(0, oldQty)·oldRate + inQty·inRate) / (max(0, oldQty) + inQty)
 *  Negative on-hand never weights (a bucket already overdrawn contributes no
 *  valuation mass); inQty <= 0 or inRate <= 0 leaves the rate untouched (WAC
 *  convention: outs and unpriced ins never reprice); a zero denominator falls
 *  back to the in-rate. Returns the rate the bucket must carry after the in. */
export function wacStep(oldQty: number, oldRate: number, inQty: number, inRate: number): number {
  if (!(inQty > 0) || !(inRate > 0)) return oldRate
  const base = Math.max(0, oldQty)
  const denom = base + inQty
  if (denom <= 0) return inRate
  return (base * oldRate + inQty * inRate) / denom
}
