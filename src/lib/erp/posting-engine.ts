/* eslint-disable @typescript-eslint/no-explicit-any */
// ============== POSTING ENGINE (LLD 03 §3 port) ==============
// The ONLY module allowed to write StockLedger / CurrentStock / (Phase 2:
// PcsStock). Every document action — agent tool, API route, reversal — must
// build a Movement[] (movement-matrix.ts) and hand it to apply(), which runs
// everything inside ONE database transaction:
//
//   validate → insert doc rows (caller) → movements → apply → projectors → commit
//
// G1 gate: a mid-failure must leave ZERO partial stock/ledger rows — enforced
// by wrapping the caller's document writes AND the stock writes in the same
// Prisma interactive transaction.

import { db } from '@/lib/db'
import type { Movement } from './enums'
import { projectProgramBalances } from './projectors'

export interface PostingResult {
  ledgerRows: number       // StockLedger entries written
  stockRows: number        // CurrentStock rows upserted
  balanceRows: number      // ProgBalance rows recomputed (projectors)
  warnings: string[]       // e.g. negative-stock warnings (legacy: warn-not-block)
}

function yfItemType(m: Movement): string {
  if (m.itemType) return m.itemType
  // Legacy fallback: kgs quantities imply yarn/fabric; pcs imply accessory/pcs.
  if (m.qty.kgs || m.qty.bags) return 'fabric'
  return 'pcs'
}

/**
 * Apply a movement set inside the caller's transaction (or open one).
 * `tx` may be a Prisma transaction client; if omitted a new transaction is
 * opened and committed here.
 */
export async function apply(
  movements: Movement[],
  opts?: { tx?: any; rate?: number },
): Promise<PostingResult> {
  const result: PostingResult = { ledgerRows: 0, stockRows: 0, balanceRows: 0, warnings: [] }
  const run = async (tx: any) => {
    for (const m of movements) {
      if (!m.godownId && m.ledger !== 'PCS') {
        throw new Error(`Movement ${m.txnType} missing godownId`)
      }
      // Signed quantities
      const s = m.sign
      const inKgs = (m.qty.kgs || 0) * s
      const inPcs = (m.qty.pcs || 0) * s
      const inMtrs = (m.qty.mtrs || 0) * s
      const inBags = (m.qty.bags || 0) * s

      // 1. StockLedger journal row (always, both directions)
      await tx.stockLedger.create({
        data: {
          txnType: m.txnType,
          itemType: yfItemType(m),
          itemId: m.itemId || '',
          lotId: m.lotId || null,
          colourId: m.colourId || null,
          sizeId: m.sizeId || null,
          godownId: m.godownId || null,
          deptId: m.deptId || null,
          orderId: m.orderId || null,
          docNo: m.docNo || null,
          docDate: new Date(),
          finYear: '26-27',
          inKgs: Math.max(inKgs, 0) || (inKgs > 0 ? inKgs : 0),
          outKgs: inKgs < 0 ? -inKgs : 0,
          inMtrs: Math.max(inMtrs, 0),
          outMtrs: inMtrs < 0 ? -inMtrs : 0,
          inPcs: Math.max(inPcs, 0),
          outPcs: inPcs < 0 ? -inPcs : 0,
          inBags: Math.max(inBags, 0),
          outBags: inBags < 0 ? -inBags : 0,
          rate: opts?.rate ?? 0,
          partyId: m.partyId || null,
          refId: m.refId || null,
          notes: m.notes || null,
        },
      })
      result.ledgerRows++

      // 2. CurrentStock upsert (skip pure-journal PCS rows without item/godown)
      if (m.itemId || (m.ledger === 'PCS' && m.godownId)) {
        // NOTE: the schema's compound unique includes nullable FK columns
        // (colourId/sizeId/deptId) — on SQLite, NULLs make unique-index rows
        // distinct AND '' would violate FK constraints. So we match with an
        // explicit NULL-consistent filter and update by row id.
        const match = {
          itemType: yfItemType(m),
          itemId: m.itemId || '',
          godownId: m.godownId,
          lotId: m.lotId || null,
          colourId: m.colourId || null,
          sizeId: m.sizeId || null,
          deptId: m.deptId || null,
          orderId: m.orderId || null,
        }
        const existing = await tx.currentStock.findFirst({ where: match }).catch(() => null)
        const delta = {
          kgs: inKgs,
          pcs: inPcs,
          mtrs: inMtrs,
          bags: inBags,
        }
        if (existing) {
          const updated: any = {}
          if (delta.kgs) updated.kgs = { increment: delta.kgs }
          if (delta.pcs) updated.pcs = { increment: delta.pcs }
          if (delta.mtrs) updated.mtrs = { increment: delta.mtrs }
          if (delta.bags) updated.bags = { increment: delta.bags }
          if (Object.keys(updated).length > 0) {
            await tx.currentStock.update({ where: { id: existing.id }, data: updated })
            // Negative-stock warning (legacy behavior: warn-not-block on G rows)
            const kgs2 = (existing.kgs || 0) + delta.kgs
            const pcs2 = (existing.pcs || 0) + delta.pcs
            if (kgs2 < -0.001 || pcs2 < -0.001) {
              result.warnings.push(
                `${m.txnType} ${m.docNo || ''}: negative stock ${kgs2 < 0 ? `${kgs2.toFixed(2)} kgs` : ''}${pcs2 < 0 ? ` ${pcs2} pcs` : ''} at godown ${m.godownId}`,
              )
            }
          }
          result.stockRows++
        } else {
          if (inKgs < 0 || inPcs < 0 || inMtrs < 0 || inBags < 0) {
            result.warnings.push(
              `${m.txnType} ${m.docNo || ''}: issue of ${Math.abs(inKgs || inPcs)} against empty stock row at godown ${m.godownId} (negative row created)`,
            )
          }
          await tx.currentStock.create({
            data: {
              itemType: yfItemType(m),
              itemId: m.itemId || '',
              godownId: m.godownId,
              lotId: m.lotId || null,
              colourId: m.colourId || null,
              sizeId: m.sizeId || null,
              deptId: m.deptId || null,
              orderId: m.orderId || null,
              kgs: Math.max(inKgs, 0),
              pcs: Math.max(inPcs, 0),
              mtrs: Math.max(inMtrs, 0),
              bags: Math.max(inBags, 0),
              rate: opts?.rate ?? 0,
            },
          })
          result.stockRows++
        }
      }
      // 2b. PCS ledger — stage-pipeline buckets (Phase 2). PcsStock rows are
      // keyed (order, styleNo, lot, stage, colour, size, goodFlag, rejType,
      // line, party); the same NULL-consistent matching rule as above applies.
      if (m.ledger === 'PCS' && m.orderId && m.styleNo) {
        const stageBucket = (m as any).stageId || m.stageId
        const pcsMatch = {
          orderId: m.orderId,
          styleNo: m.styleNo,
          lotId: m.lotId || null,
          stageId: stageBucket || '',
          colourId: m.colourId || null,
          sizeId: m.sizeId || null,
          goodFlag: m.goodFlag || 'G',
          rejectionTypeId: m.rejectionTypeId || null,
          lineId: m.lineId || null,
          partyId: m.partyId || null,
        }
        const existingPcs = await tx.pcsStock.findFirst({ where: pcsMatch }).catch(() => null)
        const deltaPcs = (m.qty.pcs || 0) * s
        if (existingPcs) {
          const data: any = { qty: { increment: deltaPcs } }
          // production qty only ever counts net-good flow into a bucket
          if (deltaPcs > 0) data.prodQty = { increment: deltaPcs }
          await tx.pcsStock.update({ where: { id: existingPcs.id }, data })
          if (existingPcs.qty + deltaPcs < 0) {
            result.warnings.push(
              `${m.txnType} ${m.docNo || ''}: PcsStock bucket ${stageBucket} would go negative (${existingPcs.qty + deltaPcs}) for order ${m.orderId}`,
            )
          }
          result.stockRows++
        } else if (deltaPcs > 0) {
          await tx.pcsStock.create({
            data: { ...pcsMatch, qty: deltaPcs, prodQty: deltaPcs },
          })
          result.stockRows++
        } else if (deltaPcs < 0) {
          result.warnings.push(
            `${m.txnType} ${m.docNo || ''}: issue of ${-deltaPcs} pcs against empty bucket ${stageBucket} (order ${m.orderId}) — skipped`,
          )
        }
      }
    }
    // 3. Balance projectors — recompute ProgBalance rows for touched
    // order×item keys so program balances are never stale (LLD 03 §5).
    try {
      const proj = await projectProgramBalances(
        tx,
        movements.map((m) => ({ orderId: m.orderId, itemId: m.itemId })),
      )
      result.balanceRows = proj.rows
    } catch (err: any) {
      // Projector failure must not abort the posting — log and continue.
      result.warnings.push(`projector skipped: ${err?.message || err}`)
    }
    return result
  }

  if (opts?.tx) {
    return run(opts.tx)
  }
  return db.$transaction(run)
}

/**
 * Compensating reversal (LLD 03 §3 delete rule): rebuild the movement set
 * with inverted signs and re-apply. Callers fetch their original movements
 * (or rebuild them from the document) and pass through here.
 */
export async function applyReversal(
  movements: Movement[],
  reversalDocNo: string,
  opts?: { tx?: any; rate?: number },
): Promise<PostingResult> {
  const inverted = movements.map((m) => ({
    ...m,
    sign: (m.sign === 1 ? -1 : 1) as 1 | -1,
    // Reversal rows carry the REVERSAL doc no so the ledger keeps original
    // and compensating rows distinguishable (audit + projector net math).
    docNo: reversalDocNo,
    refId: m.refId,
    notes: `REVERSAL of ${m.docNo || m.txnType} via ${reversalDocNo}${m.notes ? ` | ${m.notes}` : ''}`,
  }))
  return apply(inverted, opts)
}
