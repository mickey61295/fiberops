/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M5 §7-D-29 — create_packing_list service. PackingList + PackingLine
// (ADR-015) — PKL-#### auto docNo; header totals default to line sums
// (totalPcs = Σ qty, totalCartons = distinct cartonNo, netKgs = Σ netKgs).
// despatchDcNo/orderNo/buyerCode resolve to free FK cols (PITFALLS #21).
// Document-only — W6 (§10) shows the despatch recon on the view.

import { db } from '@/lib/db'
import { activeFinYear } from '../numbering'
import type { DocPlanResult } from './types'
import type { PackingListInput } from '../schemas/packing-list'
import { dateOrIstToday } from '@/lib/erp/dates'

export async function planPackingList(args: PackingListInput): Promise<DocPlanResult> {
  const finYear = args.finYear?.trim() || await activeFinYear()
  const status = args.status?.trim() || 'draft'
  if (status !== 'draft' && status !== 'confirmed') {
    return { ok: false, error: `status must be draft | confirmed (got '${status}')` }
  }

  let despatchId: string | undefined
  if (args.despatchDcNo?.trim()) {
    const d = await db.pcsDespatch.findUnique({ where: { dcNo: args.despatchDcNo.trim() } })
    if (!d) return { ok: false, error: `Despatch DC ${args.despatchDcNo} not found` }
    despatchId = d.id
  }
  let orderId: string | undefined
  if (args.orderNo?.trim()) {
    const o = await db.order.findUnique({ where: { orderNo: args.orderNo.trim() } })
    if (!o) return { ok: false, error: `Order ${args.orderNo} not found` }
    orderId = o.id
  }
  let buyerId: string | undefined
  if (args.buyerCode?.trim()) {
    const b = await db.buyer.findUnique({ where: { code: args.buyerCode.trim() } })
    if (!b) return { ok: false, error: `Buyer ${args.buyerCode} not found` }
    buyerId = b.id
  }

  // colour/size resolve by NAME (the picker convention — ERRATUM 4)
  const colourIds = new Map<string, string>()
  const sizeIds = new Map<string, string>()
  for (const l of args.lines) {
    if (l.colourName?.trim() && !colourIds.has(l.colourName.trim())) {
      const c = await db.colour.findUnique({ where: { name: l.colourName.trim() } })
      if (!c) return { ok: false, error: `Colour ${l.colourName} not found` }
      colourIds.set(l.colourName.trim(), c.id)
    }
    if (l.sizeName?.trim() && !sizeIds.has(l.sizeName.trim())) {
      const s = await db.size.findUnique({ where: { name: l.sizeName.trim() } })
      if (!s) return { ok: false, error: `Size ${l.sizeName} not found` }
      sizeIds.set(l.sizeName.trim(), s.id)
    }
  }

  const totalPcs = args.totalPcs ?? args.lines.reduce((s, l) => s + l.qty, 0)
  const totalCartons = args.totalCartons ?? new Set(args.lines.map((l) => l.cartonNo)).size
  const netKgs = args.netKgs ?? args.lines.reduce((s, l) => s + (l.netKgs ?? 0), 0)

  const resolvedNo = await (async () => {
    const desired = args.packNo?.trim()
    if (desired) {
      const exists = await db.packingList.findUnique({ where: { packNo: desired } }).catch(() => null)
      if (!exists) return desired
    }
    const all = await db.packingList.findMany({ where: { packNo: { startsWith: 'PKL-' } } })
    const used = new Set(all.map((p) => p.packNo))
    let n = 1
    while (used.has(`PKL-${String(n).padStart(4, '0')}`)) n++
    return `PKL-${String(n).padStart(4, '0')}`
  })()

  return {
    ok: true,
    text: `Proposed packing list ${resolvedNo} — ${totalCartons} cartons, ${totalPcs} pcs.`,
    summary: `Create packing list ${resolvedNo} | ${totalCartons} cartons | ${totalPcs} pcs | ${netKgs.toFixed(2)} net kgs${args.despatchDcNo ? ` | DC ${args.despatchDcNo}` : ''}`,
    creates: [
      { table: 'packingList', data: { packNo: resolvedNo, despatchId, orderId, buyerId, finYear, totalCartons, totalPcs, netKgs, grossKgs: args.grossKgs ?? 0, status, notes: args.notes, lines: args.lines.length } },
      ...args.lines.map((l) => ({ table: 'packingListLine', data: { packingListId: '<pending>', cartonNo: l.cartonNo, styleNo: l.styleNo, qty: l.qty, netKgs: l.netKgs ?? 0 } })),
    ],
    sideEffects: [
      'Packing list appears in /pieces/packing-list',
      ...(despatchId ? ['Despatch recon (carton pcs vs despatched pcs) shows on the view'] : []),
    ],
    async commit() {
      const p = await db.packingList.create({
        data: {
          packNo: resolvedNo, despatchId, orderId, buyerId,
          packDate: dateOrIstToday(args.packDate),
          finYear, totalCartons, totalPcs, netKgs, grossKgs: args.grossKgs ?? 0,
          status, notes: args.notes,
          lines: {
            create: args.lines.map((l) => ({
              cartonNo: l.cartonNo, styleNo: l.styleNo,
              colourId: l.colourName?.trim() ? colourIds.get(l.colourName.trim()) : undefined,
              sizeId: l.sizeName?.trim() ? sizeIds.get(l.sizeName.trim()) : undefined,
              qty: l.qty, netKgs: l.netKgs ?? 0,
            })),
          },
        },
        include: { lines: true },
      })
      return { id: p.id, packNo: p.packNo, totalPcs: p.totalPcs, cartons: p.totalCartons }
    },
  }
}
