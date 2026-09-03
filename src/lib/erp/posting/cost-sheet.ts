/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M3 §5 row 17 — create_cost_sheet service. Logic extracted VERBATIM from
// tools.ts. Version auto-increments per order.
//
// SPEC-M44 CST-02 — the CALCULATOR rewrite (Module K costing depth):
//   • lines[] with three sources (bom | component | manual) — rates resolve
//     server-side (BomLine.rate → bucket WAC fallback; the CC-#### library;
//     typed amount or qty × rate)
//   • head totals DERIVE from lines when a head has lines (the header floats
//     stay the no-lines legacy path — byte-identical, pinned by tests)
//   • perPc = totalCost / order.totalPcs; marginPct = (selling − cost)/selling
//     × 100 COMPUTED AND STORED — the "Margin % recalculated" sideEffects
//     claim finally becomes true
//   • computeFromBom (agent-only hook) pre-seeds lines from the order style's
//     BOM × order qty (BomLine.qty is per-garment — the PRG-05 semantics)

import { db } from '@/lib/db'
import { itemWacRate } from '../item-wac'
import type { DocPlanResult } from './types'
import type { CostSheetInput, CostLineInput, ResolvedCostLine, CostHead } from '../schemas/cost-sheet'
import { headOfCategory, headOfItemType } from '../schemas/cost-sheet'

const ITEM_MODELS: Record<string, string> = { yarn: 'yarn', fabric: 'fabric', accessory: 'accessory' }

/** Resolve one input line → {head, source, ids, qty, rate, amount}.
 *  Rates resolve server-side so both doors quote the same library. */
async function resolveLine(
  order: any,
  l: CostLineInput,
): Promise<{ ok: true; line: ResolvedCostLine } | { ok: false; error: string }> {
  const qty = l.qty ?? (l.source === 'component' ? 1 : 0)
  if (l.source === 'component') {
    if (!l.componentCode) return { ok: false, error: 'Component line needs componentCode (e.g. CC-0001)' }
    const comp = await db.costComponent.findUnique({ where: { code: l.componentCode } })
    if (!comp) return { ok: false, error: `Cost component ${l.componentCode} not found — create it first (create_cost_component or /masters/cost-component)` }
    if (comp.active === false) return { ok: false, error: `Cost component ${comp.code} (${comp.name}) is inactive — re-activate it or quote another` }
    const rate = l.rate ?? comp.rate
    const amount = l.amount ?? qty * rate
    return {
      ok: true,
      line: {
        head: l.head ?? headOfCategory(comp.category),
        source: 'component',
        componentId: comp.id,
        itemType: null, itemId: null,
        qty, rate, amount,
        notes: l.notes ?? null,
      },
    }
  }
  if (l.source === 'bom') {
    if (!l.itemType || !l.itemCode) return { ok: false, error: 'BOM line needs itemType (yarn|fabric|accessory) + itemCode' }
    const model = ITEM_MODELS[l.itemType]
    const item = model ? await (db as any)[model].findUnique({ where: { code: l.itemCode } }) : null
    if (!item) return { ok: false, error: `${l.itemType} ${l.itemCode} not found` }
    // the order's style BOM line for this item (rate source), if any
    const bomLine = await db.bomLine.findFirst({
      where: { styleId: order.styleId, itemType: l.itemType, itemId: item.id },
    })
    const rate = l.rate ?? bomLine?.rate ?? await itemWacRate(l.itemType, item.id)
    const amount = l.amount ?? qty * rate
    return {
      ok: true,
      line: {
        head: l.head ?? headOfItemType(l.itemType),
        source: 'bom',
        componentId: null,
        itemType: l.itemType, itemId: item.id,
        qty, rate, amount,
        notes: l.notes ?? null,
      },
    }
  }
  // manual
  const rate = l.rate ?? 0
  const amount = l.amount ?? qty * rate
  if (amount === 0 && l.amount === undefined) {
    return { ok: false, error: 'Manual line needs amount (or qty + rate)' }
  }
  return {
    ok: true,
    line: {
      head: l.head ?? 'overheads',
      source: 'manual',
      componentId: null, itemType: null, itemId: null,
      qty, rate, amount,
      notes: l.notes ?? null,
    },
  }
}

/** computeFromBom pre-seed: the order style's BOM × order qty, one line per
 *  BomLine (explicit input lines for the same item WIN — the seed skips them). */
async function seedFromBom(order: any, explicit: CostLineInput[]): Promise<{ ok: true; lines: ResolvedCostLine[] } | { ok: false; error: string }> {
  if (!order.styleId) return { ok: false, error: 'The order has no style — nothing to compute from BOM' }
  const bomLines = await db.bomLine.findMany({ where: { styleId: order.styleId } })
  if (bomLines.length === 0) {
    return { ok: false, error: 'The order style has no BOM — create it first (create_bom), or type the cost lines manually' }
  }
  const addressed = new Set(explicit.filter((l) => l.source === 'bom' && l.itemCode).map((l) => `${l.itemType}:${l.itemCode}`))
  const qty = order.totalPcs || 0
  const lines: ResolvedCostLine[] = []
  for (const b of bomLines) {
    const model = ITEM_MODELS[b.itemType]
    const item = model ? await (db as any)[model].findUnique({ where: { id: b.itemId } }).catch(() => null) : null
    const code = item?.code ?? b.itemId
    if (addressed.has(`${b.itemType}:${code}`)) continue // explicit line wins
    const rate = b.rate || await itemWacRate(b.itemType, b.itemId)
    lines.push({
      head: headOfItemType(b.itemType),
      source: 'bom',
      componentId: null,
      itemType: b.itemType, itemId: b.itemId,
      qty: b.qty * qty,
      rate,
      amount: b.qty * qty * rate,
      notes: null,
    })
  }
  return { ok: true, lines }
}

export async function planCostSheet(args: CostSheetInput): Promise<DocPlanResult> {
  const order = await db.order.findUnique({ where: { orderNo: args.orderNo } })
  if (!order) return { ok: false, error: `Order ${args.orderNo} not found` }
  const existing = await db.costSheet.findMany({ where: { orderId: order.id }, orderBy: { version: 'desc' } })
  const version = (existing[0]?.version || 0) + 1

  // ── line resolution (CST-02) ──
  let resolved: ResolvedCostLine[] = []
  const explicit = args.lines ?? []
  if (explicit.length > 0) {
    for (const l of explicit) {
      const r = await resolveLine(order, l)
      if (!r.ok) return { ok: false, error: r.error }
      resolved.push(r.line)
    }
  }
  if (args.computeFromBom) {
    const seed = await seedFromBom(order, explicit)
    if (!seed.ok) return { ok: false, error: seed.error }
    resolved = [...resolved, ...seed.lines]
  }

  // head totals: from lines where a head HAS lines; header input otherwise
  const headTotals: Record<CostHead, number> = {
    fabric: args.fabricCost || 0, trim: args.trimCost || 0, cm: args.cmCost || 0,
    washing: args.washingCost || 0, packing: args.packingCost || 0, overheads: args.overheads || 0,
  }
  const headHasLines = new Set<CostHead>()
  for (const l of resolved) {
    headTotals[l.head] = (headHasLines.has(l.head) ? headTotals[l.head] : 0) + l.amount
    headHasLines.add(l.head)
  }
  const totalCost = Object.values(headTotals).reduce((s, v) => s + v, 0)

  // the CALCULATOR: margin computed, never echoed (CST-02 §2-3)
  const sellingPrice = args.sellingPrice || 0
  const marginPct = sellingPrice > 0 ? Math.round(((sellingPrice - totalCost) / sellingPrice) * 10000) / 100 : 0
  const perPc = order.totalPcs > 0 ? Math.round((totalCost / order.totalPcs) * 100) / 100 : 0

  const headsSummary = resolved.length > 0
    ? ` | lines ${resolved.length} (${resolved.filter((l) => l.source === 'bom').length} bom / ${resolved.filter((l) => l.source === 'component').length} component / ${resolved.filter((l) => l.source === 'manual').length} manual)`
    : ''
  const creates = [{ table: 'costSheet', data: { orderId: order.id, version, fabricCost: headTotals.fabric, trimCost: headTotals.trim, cmCost: headTotals.cm, washingCost: headTotals.washing, packingCost: headTotals.packing, overheads: headTotals.overheads, commissionPct: args.commissionPct || 0, marginPct, totalCost, sellingPrice } }]

  return {
    ok: true,
    text: `Proposed cost sheet v${version} for ${order.orderNo} — total ₹${totalCost}, per-pc ₹${perPc}, selling ₹${sellingPrice}, margin ${marginPct}%${headsSummary}.`,
    summary: `Create cost sheet v${version} | order ${order.orderNo} | fabric ₹${headTotals.fabric} | trim ₹${headTotals.trim} | CM ₹${headTotals.cm} | wash ₹${headTotals.washing} | pack ₹${headTotals.packing} | OH ₹${headTotals.overheads} | comm ${args.commissionPct || 0}% | total ₹${totalCost} | per-pc ₹${perPc} | sell ₹${sellingPrice} | margin ${marginPct}%${headsSummary}`,
    creates: resolved.length > 0
      ? [...creates, { table: 'costSheetLine', data: { count: resolved.length } } as any]
      : creates,
    sideEffects: ['Margin % recalculated', 'Order totalValue may be revised'],
    async commit() {
      const cs = await db.costSheet.create({
        data: {
          orderId: order.id, version,
          fabricCost: headTotals.fabric, trimCost: headTotals.trim, cmCost: headTotals.cm,
          washingCost: headTotals.washing, packingCost: headTotals.packing, overheads: headTotals.overheads,
          commissionPct: args.commissionPct || 0, marginPct, totalCost, sellingPrice,
          lines: {
            create: resolved.map((l) => ({
              head: l.head, source: l.source, componentId: l.componentId ?? null,
              itemType: l.itemType ?? null, itemId: l.itemId ?? null,
              qty: l.qty, rate: l.rate, amount: l.amount, notes: l.notes ?? null,
            })),
          },
        },
      })
      return { id: cs.id, version: cs.version }
    },
  }
}
