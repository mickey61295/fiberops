/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M3 §11 — transfer_stock service (NEW tool, Wave D).
// item + fromGodown + toGodown + qty → ONE transaction writing the ledger PAIR
// godown_transfer_out (from-godown) + godown_transfer_in (to-godown), both
// sharing one GT-#### doc number, each bumping its own CurrentStock bucket via
// postLedger (ADR-004 bucket rule). Net effect on total stock: zero.

import { db } from '@/lib/db'
import { postLedger } from './ledger'
import type { DocPlanResult } from './types'
import type { TransferInput } from '../schemas/transfer'

const ITEM_MODELS: Record<string, string> = { yarn: 'yarn', fabric: 'fabric', accessory: 'accessory' }
const UOM: Record<string, string> = { yarn: 'kgs', fabric: 'kgs', accessory: 'pcs' }

/** GT-#### from StockLedger docNos (StockLedger.docNo is NOT unique — count, don't resolveDocNo). */
async function nextTransferNo(): Promise<string> {
  const all = await db.stockLedger.findMany({ where: { docNo: { startsWith: 'GT-' } }, select: { docNo: true } })
  const used = new Set(all.map((r) => r.docNo))
  let n = 1
  while (used.has(`GT-${String(n).padStart(4, '0')}`)) n++
  return `GT-${String(n).padStart(4, '0')}`
}

export async function planTransfer(args: TransferInput): Promise<DocPlanResult> {
  if (!ITEM_MODELS[args.itemType]) return { ok: false, error: `itemType must be yarn | fabric | accessory (got '${args.itemType}')` }
  const item = await (db as any)[ITEM_MODELS[args.itemType]].findUnique({ where: { code: args.itemCode } })
  if (!item) return { ok: false, error: `${args.itemType} ${args.itemCode} not found` }
  const fromGodown = await db.godown.findUnique({ where: { code: args.fromGodownCode } })
  if (!fromGodown) return { ok: false, error: `From-godown ${args.fromGodownCode} not found` }
  const toGodown = await db.godown.findUnique({ where: { code: args.toGodownCode } })
  if (!toGodown) return { ok: false, error: `To-godown ${args.toGodownCode} not found` }
  if (fromGodown.id === toGodown.id) return { ok: false, error: 'From- and to-godown must differ' }
  if (args.qty <= 0) return { ok: false, error: 'qty must be a positive number' }

  const uom = UOM[args.itemType]
  const docNo = args.docNo?.trim() || (await nextTransferNo())
  const docDate = args.transferDate ? new Date(args.transferDate) : new Date()
  const notes = args.notes ?? `Transfer ${args.itemCode} ${args.qty} ${uom} ${fromGodown.code} → ${toGodown.code}`

  return {
    ok: true,
    text: `Proposed transfer of ${args.qty} ${uom} of ${args.itemCode}: ${fromGodown.code} → ${toGodown.code}.`,
    summary: `Godown transfer ${docNo} | ${args.itemType} ${args.itemCode} | ${args.qty} ${uom} | ${fromGodown.code} → ${toGodown.code}`,
    creates: [
      { table: 'stockLedger', data: { txnType: 'godown_transfer_out', itemType: args.itemType, itemId: item.id, godownId: fromGodown.id, docNo, docDate, outKgs: uom === 'kgs' ? args.qty : 0, outPcs: uom === 'pcs' ? args.qty : 0, rate: item.rate, notes } },
      { table: 'stockLedger', data: { txnType: 'godown_transfer_in', itemType: args.itemType, itemId: item.id, godownId: toGodown.id, docNo, docDate, inKgs: uom === 'kgs' ? args.qty : 0, inPcs: uom === 'pcs' ? args.qty : 0, rate: item.rate, notes } },
    ],
    sideEffects: [
      `${fromGodown.code} current stock decreases by ${args.qty} ${uom}`,
      `${toGodown.code} current stock increases by ${args.qty} ${uom}`,
      'Total stock across godowns is unchanged (net zero)',
    ],
    async commit() {
      return await db.$transaction(async (tx) => {
        const outId = await postLedger(tx, {
          txnType: 'godown_transfer_out', itemType: args.itemType, itemId: item.id,
          godownId: fromGodown.id, docNo, docDate, rate: item.rate, notes,
          out: uom === 'kgs' ? { kgs: args.qty } : { pcs: args.qty },
        })
        const inId = await postLedger(tx, {
          txnType: 'godown_transfer_in', itemType: args.itemType, itemId: item.id,
          godownId: toGodown.id, docNo, docDate, rate: item.rate, notes,
          in: uom === 'kgs' ? { kgs: args.qty } : { pcs: args.qty },
        })
        return { id: inId, outLedgerId: outId, docNo, fromGodown: fromGodown.code, toGodown: toGodown.code }
      })
    },
  }
}
