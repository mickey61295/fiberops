/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * SPEC-M44 CST-03/CST-04 — the shared item WAC lookup (one valuation, three
 * consumers: the cost-sheet bom-line fallback, the est-vs-actual comparison,
 * the daily-P&L material leg).
 *
 * INV-02 (M42) made the CurrentStock bucket's `rate` THE single weighted
 * average cost of the item — postLedger blends it on every priced IN and the
 * golden test pins bucket == replay == register == closing == dashboard.
 * So "value a quantity of an item at WAC" is exactly "qty × the bucket rate".
 *
 * Determinism: the G1 (main store) bucket wins when present — the trading
 * stock is the valuation basis; a WIP/waste bucket rate would misprice.
 * Otherwise the first bucket in godown-code order. No cross-godown
 * averaging (a blended rate no screen shows would be unauditable).
 *
 * This module is deliberately NOT valuation.ts — that one is pure (db-free,
 * unit-tested arithmetic); this one reads the DB.
 */
import { db } from '@/lib/db'

/** The item's live bucket WAC rate (₹ per its primary uom).
 *  G1 bucket first, else any godown ordered by code; 0 when no bucket. */
export async function itemWacRate(itemType: string, itemId: string): Promise<number> {
  const g1 = await db.godown.findUnique({ where: { code: 'G1' } }).catch(() => null)
  if (g1) {
    const bucket = await db.currentStock.findFirst({
      where: { itemType, itemId, godownId: g1.id },
      orderBy: { id: 'asc' },
    })
    if (bucket) return bucket.rate || 0
  }
  const any = await db.currentStock.findFirst({
    where: { itemType, itemId },
    include: { godown: { select: { code: true } } },
    orderBy: { id: 'asc' },
  })
  return any?.rate || 0
}

/** Batched variant — one query for many items (the P&L material leg and the
 *  comparison avoid N+1 when an order's BOM has many lines). Returns a map
 *  itemId → rate with the SAME G1-first rule (G1 buckets shadow others). */
export async function itemWacRates(itemType: string, itemIds: string[]): Promise<Map<string, number>> {
  const ids = [...new Set(itemIds)].filter(Boolean)
  const out = new Map<string, number>()
  if (ids.length === 0) return out
  const buckets = await (db as any).currentStock.findMany({
    where: { itemType, itemId: { in: ids } },
    include: { godown: { select: { code: true } } },
  })
  // G1-first shadowing: godown code 'G1' wins; others by godown code asc
  const rank = (code: string) => (code === 'G1' ? 0 : 1)
  buckets.sort((a: any, b: any) => rank(a.godown?.code ?? '~') - rank(b.godown?.code ?? '~')
    || String(a.godown?.code ?? '~').localeCompare(String(b.godown?.code ?? '~')))
  for (const b of buckets) {
    const key = b.itemId as string
    if (!out.has(key)) out.set(key, (b.rate as number) || 0)
  }
  for (const id of ids) if (!out.has(id)) out.set(id, 0)
  return out
}
