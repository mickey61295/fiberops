/* eslint-disable @typescript-eslint/no-explicit-any */
// ============== CUMULATIVE RATE ENGINE v1 (LLD 03 §4.5, Tgr_StockRatePost parity) ==============
// Walks departments in Sno order and builds the ₹/kg cumulative rate:
//   prs=1  → yarn base (bill rate ?? process rate ?? master rate)
//   prs=2  → yarn + dyeing own rate
//   prs=4/-4 → knitting / yarn-twist own rate
//   else   → own rate + previous-Sno cumulative (scan backwards)
// v1 simplifications (decision C6 / risk R6 — straight-line dept walk):
//   - own rate per dept = actual postings (StockLedger rate×kgs for that
//     order+dept, i.e. what we really paid on process GRNs) ?? budget amount
//     per reqKgs ?? 0. Blended counts / FTY branches / dept-15 fabric-to-yarn
//     are deferred with TODO-ASSUMPTION tags.
//   - The known legacy defect (root trigger hardcodes ordid=2028/sno=4/
//     cnt=229/col=151 test-data filter in the FTY prev-rate query) is NOT
//     ported — we walk all rows generically.

import { db } from '@/lib/db'

export interface CumRateLeg {
  deptCode: string
  deptName: string
  prs: number | null
  sno: number
  ownRate: number // ₹/kg added at this dept
  cumRate: number // ₹/kg cumulative through this dept
  basis: 'yarn-bill' | 'yarn-master' | 'bom' | 'process-actual' | 'budget' | 'zero'
  qtyKgs: number // kgs of postings backing the own rate
  value: number // ownRate × qtyKgs
}

export interface CumRateResult {
  orderNo: string
  styleNo: string | null
  legs: CumRateLeg[]
  totalRatePerKg: number
  notes: string[]
}

/** Weighted-average rate paid per item type from the stock ledger for an order. */
async function ledgerRatePerKg(orderId: string, opts: { deptId?: string; itemType?: string } = {}): Promise<{ rate: number; kgs: number }> {
  const rows = await db.stockLedger.findMany({
    where: {
      orderId,
      ...(opts.deptId ? { deptId: opts.deptId } : {}),
      ...(opts.itemType ? { itemType: opts.itemType } : {}),
      inKgs: { gt: 0 },
    },
    select: { inKgs: true, rate: true },
  })
  const kgs = rows.reduce((s, r) => s + r.inKgs, 0)
  if (!kgs) return { rate: 0, kgs: 0 }
  const value = rows.reduce((s, r) => s + r.inKgs * (r.rate || 0), 0)
  return { rate: value / kgs, kgs }
}

/** Yarn base rate: actual yarn billings for the order ?? BOM ?? yarn master. */
async function yarnBaseRate(orderId: string, styleId: string | null): Promise<{ rate: number; basis: CumRateLeg['basis']; kgs: number }> {
  const actual = await ledgerRatePerKg(orderId, { itemType: 'yarn' })
  if (actual.rate > 0) return { rate: actual.rate, basis: 'yarn-bill', kgs: actual.kgs }
  if (styleId) {
    const bom = await db.bomLine.findMany({ where: { styleId, itemType: 'yarn' } })
    const qty = bom.reduce((s, b) => s + b.qty, 0)
    if (qty > 0) {
      const value = bom.reduce((s, b) => s + b.qty * b.rate, 0)
      return { rate: value / qty, basis: 'bom', kgs: qty }
    }
  }
  // master fallback: average of yarn master rates (weak, but never zero when masters exist)
  const yarns = await db.yarn.findMany({ take: 50 })
  if (yarns.length) {
    const avg = yarns.reduce((s, y) => s + y.rate, 0) / yarns.length
    return { rate: avg, basis: 'yarn-master', kgs: 0 }
  }
  return { rate: 0, basis: 'zero', kgs: 0 }
}

/**
 * Compute the cumulative rate per kg for an order.
 * Departments walk in orderSno; only prs-carrying depts (yarn/dyeing/knitting
 * chains) + depts with actual postings or budgets contribute legs.
 */
export async function computeCumulativeRate(orderNo: string): Promise<CumRateResult> {
  const order = await db.order.findUnique({
    where: { orderNo },
    include: { style: true },
  })
  if (!order) throw new Error(`Order ${orderNo} not found`)

  const notes: string[] = []
  const depts = await db.department.findMany({ orderBy: [{ orderSno: 'asc' }, { code: 'asc' }] })

  // Yarn base (Prs=1 leg)
  const base = await yarnBaseRate(order.id, order.styleId)
  const legs: CumRateLeg[] = []
  let cum = base.rate
  if (base.rate > 0) {
    legs.push({
      deptCode: 'YARN', deptName: 'Yarn base (Prs=1)', prs: 1, sno: 0,
      ownRate: base.rate, cumRate: cum, basis: base.basis, qtyKgs: base.kgs, value: base.rate * base.kgs,
    })
  } else {
    notes.push('No yarn base found (no yarn GRN/BOM/master rate) — cumulative rate starts at 0')
  }

  // Process dept walk
  for (const dept of depts) {
    const prs = dept.prs
    if (prs === 1) continue // yarn base already handled above
    const actual = await ledgerRatePerKg(order.id, { deptId: dept.id })
    let ownRate = actual.rate
    let basis: CumRateLeg['basis'] = 'process-actual'
    let qtyKgs = actual.kgs
    if (ownRate <= 0) {
      // budget fallback: Budget rows for order+dept
      const budget = await db.budget.findFirst({ where: { orderId: order.id, deptId: dept.id } })
      if (budget && budget.amount > 0 && actual.kgs > 0) {
        ownRate = budget.amount / actual.kgs
        basis = 'budget'
        qtyKgs = actual.kgs
      } else if (budget && budget.amount > 0) {
        // budget without kgs: contribution carried as 0/kg but noted
        ownRate = 0
        basis = 'budget'
        notes.push(`Dept ${dept.code} has budget ₹${budget.amount} but no kgs posted — own rate treated as 0/kg until process GRNs arrive`)
      } else {
        ownRate = 0
        basis = 'zero'
      }
    }
    if (ownRate <= 0 && basis === 'zero') continue // dept contributes nothing yet
    // TODO-ASSUMPTION (R6): legacy branches for blended counts (Prog_Ycns
    // consPer-weighted), YTwist wgtper, and dept-15 FABRIC-TO-YARN are
    // deferred; v1 adds own rate on top of the running cumulative.
    cum += ownRate
    legs.push({
      deptCode: dept.code, deptName: dept.name, prs, sno: dept.orderSno,
      ownRate, cumRate: cum, basis, qtyKgs, value: ownRate * qtyKgs,
    })
  }

  const totalRatePerKg = legs.length ? legs[legs.length - 1].cumRate : 0
  return { orderNo: order.orderNo, styleNo: order.style?.styleNo ?? null, legs, totalRatePerKg, notes }
}
