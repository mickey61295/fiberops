/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M41 PRC-03 — purchase return / GRN rejection (frmPurchaseReturn).
// PRN-#### lives ON the GRN table (grnType='purchase_return' — the RTN-/MP-
// family precedent; one receipt-side table, five types). Each line guards
// qty ≤ GRNLine.received − GRNLine.rejectedQty (cumulative); stock posts OUT
// of the godown (purchase_return txnType — postLedger, bucket bumps);
// GrnLine.rejectedQty increments; the PO is UNTOUCHED (goods WERE received —
// supplier-pending reads bills, not GRNs; the SB tolerance verdicts re-derive
// from GRN lines when billed). The optional linked DebitNote (amount = the
// return value, reason carries the PRN — ties PAY-03) rides the same commit.

import { db } from '@/lib/db'
import { postLedger } from './ledger'
import { resolveDocNo } from '../numbering'
import type { DocPlanResult } from './types'
import type { PurchaseReturnInput } from '../schemas/purchase-return'
import { dateOrIstToday } from '@/lib/erp/dates'

const ITEM_MODELS: Record<string, string> = { yarn: 'yarn', fabric: 'fabric', accessory: 'accessory' }
const UOM: Record<string, string> = { yarn: 'kgs', fabric: 'kgs', accessory: 'pcs' }

export async function planPurchaseReturn(args: PurchaseReturnInput): Promise<DocPlanResult> {
  const grn = await db.gRN.findUnique({
    where: { grnNo: args.grnNo },
    include: { lines: true, party: true, godown: true },
  })
  if (!grn) return { ok: false, error: `GRN ${args.grnNo} not found` }
  if (grn.grnType !== 'purchase') {
    return { ok: false, error: `GRN ${args.grnNo} is grnType '${grn.grnType}' — purchase returns ride PURCHASE GRNs (process returns have their own doors: RTN- for DC returns, MP- for multi-process)` }
  }
  const godown = args.godownCode?.trim()
    ? await db.godown.findUnique({ where: { code: args.godownCode.trim() } })
    : grn.godown
  if (!godown) return { ok: false, error: `Godown ${args.godownCode} not found` }

  // Resolve + guard each return line against its GRN line. GrnLine carries
  // itemType+itemId (no itemCode column) — the input's itemCode is resolved
  // through the item models first; the error text maps ids back to codes.
  const codeByItemId = new Map<string, string>()
  for (const g of grn.lines) {
    const model = ITEM_MODELS[g.itemType]
    const item = model ? await (db as any)[model].findUnique({ where: { id: g.itemId } }).catch(() => null) : null
    if (item) codeByItemId.set(g.itemId, item.code ?? g.itemId)
  }
  const resolved: Array<{ grnLine: any; itemType: string; itemId: string; code: string; qty: number; rate: number; uom: string }> = []
  const seen = new Set<string>()
  for (const l of args.lines) {
    const key = `${l.itemType}:${l.itemCode}`
    if (seen.has(key)) return { ok: false, error: `Duplicate return line ${l.itemType} ${l.itemCode} — combine the quantities into one line` }
    seen.add(key)
    const model = ITEM_MODELS[l.itemType]
    const item = model ? await (db as any)[model].findUnique({ where: { code: l.itemCode } }) : null
    const grnLine = grn.lines.find((g) => g.itemType === l.itemType && g.itemId === item?.id)
    if (!grnLine || !item) {
      const lineList = grn.lines.map((g) => `${g.itemType}/${codeByItemId.get(g.itemId) ?? g.itemId}`).join(', ')
      return {
        ok: false,
        error: `GRN ${args.grnNo} has no ${l.itemType} line for ${l.itemCode} (its lines: ${lineList || 'none'})`,
      }
    }
    const open = grnLine.qty - (grnLine.rejectedQty ?? 0)
    if (l.qty > open + 1e-9) {
      return {
        ok: false,
        error: `Line ${l.itemCode}: returning ${l.qty} exceeds the returnable ${Math.round(open * 100) / 100} (received ${grnLine.qty}, already returned ${grnLine.rejectedQty ?? 0})`,
      }
    }
    resolved.push({ grnLine, itemType: l.itemType, itemId: item.id, code: l.itemCode, qty: l.qty, rate: l.rate ?? grnLine.rate, uom: grnLine.uomId || UOM[l.itemType] })
  }

  const prnNo = await resolveDocNo('gRN', 'grnNo', 'PRN-', args.prnNo)
  const prnDate = dateOrIstToday(args.prnDate)
  const totalQty = resolved.reduce((s, l) => s + l.qty, 0)
  const totalValue = resolved.reduce((s, l) => s + l.qty * l.rate, 0)
  const notes = args.notes?.trim() || `Purchase return against ${args.grnNo}`
  const finYear = grn.finYear || '26-27'

  // Optional linked debit note (PAY-03 tie): DN- on the DebitNote table.
  const dnNo = args.debitNote ? await resolveDocNo('debitNote', 'noteNo', 'DN-', undefined) : null

  return {
    ok: true,
    text: `Proposed purchase return ${prnNo} against ${args.grnNo}: ${resolved.length} line${resolved.length > 1 ? 's' : ''}, ${totalQty} units, ₹${totalValue}${dnNo ? ` + debit note ${dnNo}` : ''}.`,
    summary: `Purchase return ${prnNo} | against ${args.grnNo} | ${grn.party?.name || '—'} | ${resolved.length} lines | ${totalQty} units | out of ${godown.code} | ₹${totalValue}${dnNo ? ` | DN ${dnNo}` : ''}`,
    creates: [
      { table: 'grn', data: { grnNo: prnNo, grnType: 'purchase_return', poId: grn.poId, partyId: grn.partyId, godownId: godown.id, grnDate: prnDate, finYear, docNo: args.grnNo, partyDcRef: notes, totalQty, totalValue } },
      ...resolved.map((l) => ({ table: 'grnLine', data: { itemType: l.itemType, itemId: l.itemId, qty: l.qty, rate: l.rate, amount: l.qty * l.rate } })),
      ...resolved.map((l) => ({
        table: 'stockLedger',
        data: { txnType: 'purchase_return', itemType: l.itemType, itemId: l.itemId, godownId: godown.id, docNo: prnNo, docDate: prnDate, outKgs: l.uom === 'kgs' ? l.qty : 0, outPcs: l.uom === 'pcs' ? l.qty : 0, rate: l.rate, partyId: grn.partyId, notes: `PRN ${l.code} vs ${args.grnNo}` },
      })),
      ...(dnNo ? [{ table: 'debitNote', data: { noteNo: dnNo, noteType: 'acc', partyId: grn.partyId, date: prnDate, finYear, amount: totalValue, reason: `Purchase return ${prnNo} against ${args.grnNo}`, status: 'raised' } }] : []),
    ],
    updates: [
      ...resolved.map((l) => ({ table: 'grnLine', id: l.grnLine.id, data: { rejectedQty: l.grnLine.rejectedQty + l.qty } })),
    ],
    sideEffects: [
      `StockLedger: ${resolved.length} purchase_return rows OUT of ${godown.code} (stock decreases)`,
      `GRN ${args.grnNo} lines gain rejectedQty (returnable shrinks cumulatively)`,
      'PO untouched — supplier-pending reads BILLS, not GRNs (PAY-05); the SB 3-way verdicts re-derive at bill time',
      ...(dnNo ? [`Debit note ${dnNo} raised for ₹${totalValue} against ${grn.party?.name || 'the supplier'} (PAY-03 tie)`] : []),
    ],
    async commit() {
      return await db.$transaction(async (tx) => {
        const prn = await tx.gRN.create({
          data: {
            grnNo: prnNo, grnType: 'purchase_return', poId: grn.poId, partyId: grn.partyId,
            godownId: godown.id, grnDate: prnDate, finYear,
            docNo: args.grnNo, partyDcRef: notes, totalQty, totalValue,
            lines: { create: resolved.map((l) => ({ itemType: l.itemType, itemId: l.itemId, qty: l.qty, rate: l.rate, amount: l.qty * l.rate })) },
          },
        })
        for (const l of resolved) {
          await postLedger(tx, {
            txnType: 'purchase_return', itemType: l.itemType, itemId: l.itemId,
            godownId: godown.id, docNo: prnNo, docDate: prnDate, partyId: grn.partyId,
            out: l.uom === 'kgs' ? { kgs: l.qty } : { pcs: l.qty },
            rate: l.rate, notes: `Purchase return ${l.code} vs ${args.grnNo} — ${notes}`,
          })
          await (tx as any).gRNLine.update({
            where: { id: l.grnLine.id },
            data: { rejectedQty: l.grnLine.rejectedQty + l.qty },
          })
        }
        let noteNo: string | null = null
        if (dnNo) {
          const dn = await tx.debitNote.create({
            data: {
              noteNo: dnNo, noteType: 'acc', partyId: grn.partyId,
              date: prnDate, finYear, amount: totalValue,
              reason: `Purchase return ${prnNo} against ${args.grnNo}`, status: 'raised',
            },
          })
          noteNo = dn.noteNo
        }
        return { id: prn.id, grnNo: prn.grnNo, lines: resolved.length, ...(noteNo ? { debitNoteNo: noteNo } : {}) }
      })
    },
  }
}
