/* eslint-disable @typescript-eslint/no-explicit-any */
// ============== BALANCE PROJECTORS (LLD 03 §5 port, v1) ==============
// Legacy rebuilt ST_ProgBalance_{Yarn|Fabric} from triggers after every
// DC/GRN. Our equivalent: recompute program-balance rows from StockLedger
// after each posting, inside the same transaction, so the tables are never
// stale again (they were dead weight in our schema until now).
//
// Ported formula (LLD 03 §5 / legacy Vue_Reqd_Vs_Finish):
//   reqBalanceKgs = reqKgs − (grnKgs + transInKgs − transOutKgs − returnKgs)
// with DcKgs tracked alongside so "sent out vs received back" per
// order × dept × item is always queryable.

import { db } from '@/lib/db'

type Tx = any

/** Recompute ProgBalance rows for the order×item keys touched by a posting. */
export async function projectProgramBalances(
  tx: Tx,
  keys: Array<{ orderId?: string; itemId?: string }>,
): Promise<{ rows: number }> {
  // Collect distinct order/item pairs (skip empty = non-order stock)
  const pairs = new Map<string, { orderId: string; itemId: string }>()
  for (const k of keys) {
    if (k.orderId && k.itemId) {
      pairs.set(`${k.orderId}|${k.itemId}`, { orderId: k.orderId, itemId: k.itemId })
    }
  }
  if (pairs.size === 0) return { rows: 0 }

  let rows = 0
  for (const { orderId, itemId } of pairs.values()) {
    // Item type decides which balance table owns the row (yarn vs fabric).
    const yarn = await tx.yarn.findUnique({ where: { id: itemId } }).catch(() => null)
    const isYarn = !!yarn

    // Aggregate the ledger for this order×item using NET quantities
    // (inKgs − outKgs) so compensating reversals decrement balances.
    const ledger = await tx.stockLedger.findMany({
      where: { orderId, itemId },
    })
    let dcKgs = 0, grnKgs = 0, transIn = 0, transOut = 0, ret = 0
    for (const l of ledger) {
      const net = (l.inKgs || 0) - (l.outKgs || 0)
      switch (l.txnType) {
        case 'process_delivery': dcKgs -= net; break          // net out
        case 'process_receipt':
        case 'purchase_grn':    grnKgs += net; break          // net in
        case 'transfer_in':     transIn += net; break
        case 'transfer_out':    transOut -= net; break        // net out
        case 'sales_return':    ret += net; break
        default: break
      }
    }

    if (isYarn) {
      const existing = await tx.progBalanceYarn.findFirst({ where: { orderId, countId: itemId, deptId: '' } }).catch(() => null)
      const data = {
        orderId, countId: itemId, deptId: '',
        dcKgs, grnKgs, transInKgs: transIn, transOutKgs: transOut, returnKgs: ret,
        reqBalanceKgs: -(grnKgs + transIn - transOut - ret), // no req yet → negative of net received
      }
      if (existing) {
        await tx.progBalanceYarn.update({ where: { id: existing.id }, data })
      } else {
        await tx.progBalanceYarn.create({ data })
      }
      rows++
    } else {
      const existing = await tx.progBalanceFabric.findFirst({ where: { orderId, fabricId: itemId, deptId: '' } }).catch(() => null)
      const data = {
        orderId, fabricId: itemId, deptId: '',
        dcKgs, grnKgs, transInKgs: transIn, transOutKgs: transOut, returnKgs: ret,
        reqBalanceKgs: -(grnKgs + transIn - transOut - ret),
      }
      if (existing) {
        await tx.progBalanceFabric.update({ where: { id: existing.id }, data })
      } else {
        await tx.progBalanceFabric.create({ data })
      }
      rows++
    }
  }
  return { rows }
}
