/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * SPEC-M44 CST-03 — estimated vs actual per order (Module K costing depth).
 *
 * A pure READ service (the ADR-002 reflex — no stored "actual" columns, no
 * trigger writes): the actuals recompute on read from the documents that
 * already carry them:
 *   • cm        = Σ ProductionEntry.amount, order-scoped, rework EXCLUDED
 *                 (the rework entry's cost sits in the good bundle it made —
 *                 counting both double-pays)
 *   • process   = Σ JobworkOrder.totalValue, order-scoped (the washing /
 *                 dyeing / printing billing — the JW bill ties it to money)
 *   • fabric    = Σ CutOrder.fabricIssued × fabricWAC + the order's JW-out
 *                 fabric legs × WAC (material that left the store)
 *   • trim      = the order's JW-out accessory legs × WAC
 * WAC = the item's live bucket rate (itemWacRate — G1 first, deterministic;
 * NEVER the ledger leg rate: JW legs carry the PROCESS charge, valuing
 * material at the knitting rate would double-count conversion).
 *
 * Heads with nothing derivable (packing, overheads) return null — the UI
 * shows '—' honestly, never 0-pretending.
 *
 * Consumers: the Order Hub "Cost & Margin — est vs actual" FamilySection +
 * the get_order_cost agent tool (one service, both doors — ADR-001).
 */
import { db } from '@/lib/db'
import { itemWacRates } from '../item-wac'
import type { CostHead } from '../schemas/cost-sheet'

export interface ActualHead {
  head: CostHead
  label: string
  /** null = nothing derivable — '—' (honest), never a fake 0 */
  actual: number | null
  sourceNote: string
}

export interface CostComparison {
  orderNo: string
  orderId: string
  /** the LATEST cost sheet (estimate) — null when none exists */
  sheet: {
    version: number
    id: string
    heads: Record<CostHead, number>
    totalCost: number
    sellingPrice: number
    marginPct: number
    perPc: number
    hasLines: boolean
  } | null
  actuals: ActualHead[]
  /** per-head delta = estimated − actual (null where either side missing) */
  deltas: Array<{ head: CostHead; label: string; estimated: number | null; actual: number | null; delta: number | null }>
  producedPcs: number
  totalPcs: number
}

const HEAD_LABELS: Record<CostHead, string> = {
  fabric: 'Fabric', trim: 'Trim', cm: 'CM / Labour', washing: 'Washing / Process', packing: 'Packing', overheads: 'Overheads',
}

/** The order's ACTUAL cost legs (independent of any cost sheet). */
export async function orderCostActuals(orderId: string): Promise<{
  cm: number
  process: number
  fabric: number
  trim: number
  jwOutFabricKgs: number
  jwOutTrimPcs: number
  cutFabricKgs: number
}> {
  const [entries, jws, cuts] = await Promise.all([
    db.productionEntry.findMany({ where: { orderId, rework: false }, select: { amount: true } }),
    db.jobworkOrder.findMany({
      where: { orderId, status: { not: 'cancelled' } },
      select: { dcNo: true, totalValue: true, lines: { select: { itemType: true, itemId: true, uom: true, qty: true } } },
    }),
    db.cutOrder.findMany({ where: { orderId, status: { not: 'cancelled' } }, select: { fabricIssued: true } }),
  ])

  const cm = entries.reduce((s, e) => s + e.amount, 0)
  const process = jws.reduce((s, j) => s + j.totalValue, 0)
  const cutFabricKgs = cuts.reduce((s, c) => s + (c.fabricIssued || 0), 0)

  // JW-out material legs per item (kgs-family uoms → weight, else pcs)
  const fabricKgsByItem = new Map<string, { itemType: string; kgs: number }>()
  const trimPcsByItem = new Map<string, number>()
  for (const j of jws) {
    for (const l of j.lines) {
      if (l.itemType !== 'yarn' && l.itemType !== 'fabric' && l.itemType !== 'accessory') continue
      const isKgsFamily = (l.itemType === 'yarn' || l.itemType === 'fabric') && l.uom !== 'pcs'
      if (isKgsFamily) {
        const prev = fabricKgsByItem.get(l.itemId)
        fabricKgsByItem.set(l.itemId, { itemType: l.itemType, kgs: (prev?.kgs ?? 0) + l.qty })
      } else {
        trimPcsByItem.set(l.itemId, (trimPcsByItem.get(l.itemId) ?? 0) + l.qty)
      }
    }
  }

  // WAC per item (batched — one map per itemType, ids never mix)
  const trimIds = [...trimPcsByItem.keys()]
  const yarnIds = [...fabricKgsByItem.entries()].filter(([, v]) => v.itemType === 'yarn').map(([id]) => id)
  const jwFabricIds = [...fabricKgsByItem.entries()].filter(([, v]) => v.itemType === 'fabric').map(([id]) => id)
  const bomFabricIds = await styleBomItemIds('fabric', orderId)
  const fabricWac = await itemWacRates('fabric', [...jwFabricIds, ...bomFabricIds])
  const trimWac = await itemWacRates('accessory', trimIds)
  const yarnWac = await itemWacRates('yarn', yarnIds)

  // value the cut fabric at the style's BOM fabric WAC (first BOM fabric —
  // the common single-fabric case)
  const cutRate = bomFabricIds.map((id) => fabricWac.get(id) ?? 0).find((r) => r > 0) ?? 0

  let fabric = cutFabricKgs * cutRate
  let jwOutFabricKgs = 0
  for (const [itemId, { itemType, kgs }] of fabricKgsByItem) {
    const rate = itemType === 'yarn' ? (yarnWac.get(itemId) ?? 0) : (fabricWac.get(itemId) ?? 0)
    fabric += kgs * rate
    jwOutFabricKgs += kgs
  }
  let trim = 0
  let jwOutTrimPcs = 0
  for (const [itemId, pcs] of trimPcsByItem) {
    trim += pcs * (trimWac.get(itemId) ?? 0)
    jwOutTrimPcs += pcs
  }

  return { cm, process, fabric, trim, jwOutFabricKgs, jwOutTrimPcs, cutFabricKgs }
}

/** The order style's BOM item ids for one itemType (fabric actuals valuation). */
async function styleBomItemIds(itemType: string, orderId: string): Promise<string[]> {
  const order = await db.order.findUnique({ where: { id: orderId }, select: { styleId: true } })
  if (!order?.styleId) return []
  const bom = await db.bomLine.findMany({ where: { styleId: order.styleId, itemType }, select: { itemId: true } })
  return bom.map((b) => b.itemId)
}

/** The full estimate-vs-actual comparison (latest sheet vs derived actuals). */
export async function costComparison(orderId: string): Promise<CostComparison | null> {
  const order = await db.order.findUnique({
    where: { id: orderId },
    select: { id: true, orderNo: true, totalPcs: true, status: true },
  })
  if (!order) return null

  const [latest, actual, producedAgg] = await Promise.all([
    db.costSheet.findFirst({
      where: { orderId },
      orderBy: { version: 'desc' },
      include: { lines: { select: { id: true } } },
    }),
    orderCostActuals(orderId),
    db.productionEntry.aggregate({ where: { orderId, rework: false }, _sum: { qty: true } }),
  ])

  const sheet = latest
    ? {
        version: latest.version,
        id: latest.id,
        heads: {
          fabric: latest.fabricCost, trim: latest.trimCost, cm: latest.cmCost,
          washing: latest.washingCost, packing: latest.packingCost, overheads: latest.overheads,
        } as Record<CostHead, number>,
        totalCost: latest.totalCost,
        sellingPrice: latest.sellingPrice,
        marginPct: latest.marginPct,
        perPc: order.totalPcs > 0 ? latest.totalCost / order.totalPcs : 0,
        hasLines: latest.lines.length > 0,
      }
    : null

  // actual heads: washing head carries the JW process billing (the Tirupur
  // washing/dyeing charge); cm carries piece-rate labour; fabric/trim at WAC.
  const actualHeads: ActualHead[] = [
    {
      head: 'fabric', label: HEAD_LABELS.fabric, actual: actual.cutFabricKgs > 0 || actual.jwOutFabricKgs > 0 ? actual.fabric : null,
      sourceNote: actual.cutFabricKgs > 0 || actual.jwOutFabricKgs > 0
        ? `cut ${actual.cutFabricKgs.toLocaleString('en-IN')} kg + JW-out ${actual.jwOutFabricKgs.toLocaleString('en-IN')} kg at WAC`
        : 'no material consumption recorded',
    },
    {
      head: 'trim', label: HEAD_LABELS.trim, actual: actual.jwOutTrimPcs > 0 ? actual.trim : null,
      sourceNote: actual.jwOutTrimPcs > 0 ? `JW-out ${actual.jwOutTrimPcs.toLocaleString('en-IN')} pcs at WAC` : 'no accessory consumption recorded',
    },
    {
      head: 'cm', label: HEAD_LABELS.cm, actual: actual.cm,
      sourceNote: 'Σ production entry amounts (piece-rate labour, rework excluded)',
    },
    {
      head: 'washing', label: HEAD_LABELS.washing, actual: actual.process,
      sourceNote: actual.process > 0 ? 'Σ jobwork billing (washing/dyeing/printing)' : 'no order-linked jobwork billed',
    },
    { head: 'packing', label: HEAD_LABELS.packing, actual: null, sourceNote: 'not derivable — packing costs ride expenses' },
    { head: 'overheads', label: HEAD_LABELS.overheads, actual: null, sourceNote: 'not derivable — overheads ride expenses/budgets' },
  ]

  const deltas = actualHeads.map((a) => {
    const estimated = sheet ? sheet.heads[a.head] : null
    return {
      head: a.head, label: a.label,
      estimated,
      actual: a.actual,
      delta: estimated != null && a.actual != null ? estimated - a.actual : null,
    }
  })

  return {
    orderNo: order.orderNo,
    orderId: order.id,
    sheet,
    actuals: actualHeads,
    deltas,
    producedPcs: producedAgg._sum.qty ?? 0,
    totalPcs: order.totalPcs,
  }
}
