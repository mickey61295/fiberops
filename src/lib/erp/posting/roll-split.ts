/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M5 §7-D-34 — split_roll service (Roll Tracking, /inventory/rolls).
// Rolls ≡ Lots convention (§7-D-34): a roll IS a Lot row; fabric mtrs live
// on CurrentStock buckets lot-keyed where the flow carried a lot, else the
// ADR-004 null-lot bucket. The split moves `mtrs` OUT of the source lot's
// fabric stock INTO a brand-new Lot: RSP-#### docNo, transfer_out +
// transfer_in StockLedger pair + bucket updates in ONE transaction
// (the stock-adjustment twin, §7-D-34). Net mtrs across the two lots stay
// ZERO-sum — the register math test asserts it.

import { db } from '@/lib/db'
import type { DocPlanResult } from './types'
import type { RollSplitInput } from '../schemas/roll-split'
import { docKeyViolation } from './ledger'
import { dateOrIstToday } from '@/lib/erp/dates'

/** RSP-#### from StockLedger docNos (docNo is NOT unique — count, don't resolveDocNo). */
async function nextRspNo(): Promise<string> {
  const all = await db.stockLedger.findMany({ where: { docNo: { startsWith: 'RSP-' } }, select: { docNo: true } })
  const used = new Set(all.map((r) => r.docNo))
  let n = 1
  while (used.has(`RSP-${String(n).padStart(4, '0')}`)) n++
  return `RSP-${String(n).padStart(4, '0')}`
}

/** Available mtrs for (fabric, godown, lot) — lot-keyed bucket + the null-lot
 *  fallback bucket (GRN posts stock without a lot when the PO didn't carry one). */
async function availableMtrs(itemId: string, godownId: string, lotId: string): Promise<number> {
  const buckets = await db.currentStock.findMany({
    where: { itemType: 'fabric', itemId, godownId, OR: [{ lotId }, { lotId: null }] },
  })
  return buckets.reduce((s, b) => s + b.mtrs, 0)
}

/** Decrement buckets by id, preferring the lot-keyed one when both exist.
 *  (Prisma can't sort nulls-last portably — sort in JS: lot-keyed first.) */
async function decrementBucket(tx: any, itemId: string, godownId: string, lotId: string, mtrs: number) {
  const buckets = await tx.currentStock.findMany({
    where: { itemType: 'fabric', itemId, godownId, OR: [{ lotId }, { lotId: null }] },
  })
  buckets.sort((a: any, b: any) => (a.lotId === null ? 1 : 0) - (b.lotId === null ? 1 : 0))
  let remaining = mtrs
  for (const b of buckets) {
    if (remaining <= 0) break
    const take = Math.min(remaining, b.mtrs)
    await tx.currentStock.update({ where: { id: b.id }, data: { mtrs: { decrement: take } } })
    remaining -= take
  }
  if (remaining > 0) throw new Error(`Insufficient mtrs in lot — short by ${remaining.toFixed(2)}`)
}

export async function planRollSplit(args: RollSplitInput): Promise<DocPlanResult> {
  const lot = await db.lot.findUnique({ where: { lotNo: args.sourceLotNo.trim() } })
  if (!lot) return { ok: false, error: `Lot ${args.sourceLotNo} not found` }
  const fabric = await db.fabric.findUnique({ where: { code: args.itemCode.trim() } })
  if (!fabric) return { ok: false, error: `Fabric ${args.itemCode} not found` }
  const godown = await db.godown.findUnique({ where: { code: args.godownCode.trim() } })
  if (!godown) return { ok: false, error: `Godown ${args.godownCode} not found` }

  const avail = await availableMtrs(fabric.id, godown.id, lot.id)
  if (avail < args.mtrs) {
    return { ok: false, error: `Lot ${args.sourceLotNo} holds only ${avail.toFixed(2)} mtrs of ${args.itemCode} at ${args.godownCode} (asked ${args.mtrs})` }
  }

  // New lot no: explicit, or <source>-R<n> child convention
  const newLotNo = await (async () => {
    const desired = args.newLotNo?.trim()
    if (desired) {
      const exists = await db.lot.findUnique({ where: { lotNo: desired } }).catch(() => null)
      if (!exists) return desired
    }
    let n = 1
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const candidate = `${lot.lotNo}-R${n}`
      const exists = await db.lot.findUnique({ where: { lotNo: candidate } }).catch(() => null)
      if (!exists) return candidate
      n++
    }
  })()

  const docNo = await nextRspNo()
  const docDate = dateOrIstToday(args.splitDate)
  const notes = args.notes ?? `Roll split from ${lot.lotNo}`

  return {
    ok: true,
    text: `Proposed roll split — ${args.mtrs} mtrs of ${args.itemCode} from lot ${lot.lotNo} into new lot ${newLotNo}.`,
    summary: `Split roll ${docNo} | lot ${lot.lotNo} → ${newLotNo} | ${args.mtrs} mtrs | fabric ${args.itemCode} | godown ${args.godownCode}`,
    creates: [
      { table: 'lot', data: { lotNo: newLotNo, partyId: lot.partyId } },
      { table: 'stockLedger', data: { txnType: 'transfer_out', itemType: 'fabric', itemId: fabric.id, lotId: lot.id, godownId: godown.id, docNo, docKey: docNo, docDate, outMtrs: args.mtrs, notes } },
      { table: 'stockLedger', data: { txnType: 'transfer_in', itemType: 'fabric', itemId: fabric.id, lotId: '<pending>', godownId: godown.id, docNo, docDate, inMtrs: args.mtrs, notes } },
    ],
    sideEffects: [
      `Lot ${lot.lotNo} loses ${args.mtrs} mtrs; new lot ${newLotNo} gains them (net zero)`,
      'Lot Tracking register (W2) shows the new roll immediately',
    ],
    async commit() {
      try {
        return await db.$transaction(async (tx) => {
          const newLot = await tx.lot.create({ data: { lotNo: newLotNo, partyId: lot.partyId } })
          await tx.stockLedger.create({
            data: {
              txnType: 'transfer_out', itemType: 'fabric', itemId: fabric.id, lotId: lot.id,
              godownId: godown.id, docNo, docKey: docNo, docDate, finYear: '26-27',
              outMtrs: args.mtrs, notes,
            },
          })
          await tx.stockLedger.create({
            data: {
              txnType: 'transfer_in', itemType: 'fabric', itemId: fabric.id, lotId: newLot.id,
              godownId: godown.id, docNo, docDate, finYear: '26-27',
              inMtrs: args.mtrs, notes,
            },
          })
          await decrementBucket(tx, fabric.id, godown.id, lot.id, args.mtrs)
          // IN leg: the new roll gets its own lot-keyed bucket
          await tx.currentStock.create({
            data: { itemType: 'fabric', itemId: fabric.id, godownId: godown.id, lotId: newLot.id, mtrs: args.mtrs, rate: fabric.rate ?? 0 },
          })
          return { id: newLot.id, docNo, newLotNo, sourceLotNo: lot.lotNo, mtrs: args.mtrs }
        })
      } catch (err) {
        throw docKeyViolation(err, docNo) ?? err
      }
    },
  }
}
