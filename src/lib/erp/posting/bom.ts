/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M3 §5 row 2 — create_bom service. Logic extracted VERBATIM from tools.ts.
// BOM has NO standalone screen (SPEC-M3 §8): the Order Hub hosts the BOM card.

import { db } from '@/lib/db'
import type { DocPlanResult } from './types'
import type { BomInput } from '../schemas/bom'

export async function planBom(args: BomInput): Promise<DocPlanResult> {
  const style = await db.style.findUnique({ where: { styleNo: args.styleNo } })
  if (!style) return { ok: false, error: `Style ${args.styleNo} not found` }
  const resolved = await Promise.all(args.lines.map(async (l) => {
    let item: any
    if (l.itemType === 'yarn') item = await db.yarn.findUnique({ where: { code: l.itemCode } })
    else if (l.itemType === 'fabric') item = await db.fabric.findUnique({ where: { code: l.itemCode } })
    else if (l.itemType === 'accessory') item = await db.accessory.findUnique({ where: { code: l.itemCode } })
    if (!item) throw new Error(`${l.itemType} ${l.itemCode} not found`)
    return { ...l, itemId: item.id, uomId: item.uomId, rate: l.rate ?? item.rate }
  }))
  const totalCost = resolved.reduce((s, l) => s + l.qty * l.rate, 0)
  return {
    ok: true,
    text: `Proposed BOM for ${args.styleNo} — ${resolved.length} lines, total material cost ₹${totalCost}.`,
    summary: `Create BOM | style ${args.styleNo} | ${resolved.length} lines | total material ₹${totalCost}`,
    creates: resolved.map((l) => ({ table: 'bomLine', data: { styleId: style.id, itemType: l.itemType, itemId: l.itemId, qty: l.qty, uomId: l.uomId, rate: l.rate } })),
    sideEffects: ['Costing will pull from this BOM'],
    async commit() {
      await db.bomLine.createMany({ data: resolved.map((l) => ({ styleId: style.id, itemType: l.itemType, itemId: l.itemId, qty: l.qty, uomId: l.uomId, rate: l.rate })) })
      return { styleId: style.id, lines: resolved.length }
    },
  }
}
