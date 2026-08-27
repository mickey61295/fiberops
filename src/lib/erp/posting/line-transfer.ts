/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M5 §7-B-11 — line transfer service (legacy Trs_LineTfr). Moves WIP
// between sewing lines: TWO LineIssue rows in ONE transaction — an OUT row
// (negative qty) on the source line and an IN row (positive qty) on the
// target line — sharing the LT-#### reference in both issueNo and notes.
// Line WIP = Σ LineIssue.qty per line, so the pair nets to zero globally.
// NO godown StockLedger rows: the pieces are already out of G1 in line WIP
// (issue_to_line moved them); a transfer re-labels whose WIP it is.

import { db } from '@/lib/db'
import type { DocPlanResult } from './types'
import type { LineTransferInput } from '../schemas/line-transfer'

export async function planLineTransfer(args: LineTransferInput): Promise<DocPlanResult> {
  if (args.fromLineCode === args.toLineCode) {
    return { ok: false, error: 'Source and target line are the same — nothing to transfer' }
  }
  const order = await db.order.findUnique({ where: { orderNo: args.orderNo } })
  if (!order) return { ok: false, error: `Order ${args.orderNo} not found` }
  const fromLine = await db.line.findUnique({ where: { code: args.fromLineCode } })
  if (!fromLine) return { ok: false, error: `Line ${args.fromLineCode} not found` }
  const toLine = await db.line.findUnique({ where: { code: args.toLineCode } })
  if (!toLine) return { ok: false, error: `Line ${args.toLineCode} not found` }
  // LT-#### resolution: the stored rows carry -O/-I suffixes, so the scan must
  // strip them before checking whether a ref number is taken.
  const used = new Set(
    (await db.lineIssue.findMany({ where: { issueNo: { startsWith: 'LT-' } }, select: { issueNo: true } }))
      .map((r) => r.issueNo.replace(/-(O|I)$/, '')),
  )
  const desired = args.refNo?.trim()
  let ref = desired && !used.has(desired) ? desired : ''
  if (!ref) {
    let n = 1
    while (used.has(`LT-${String(n).padStart(4, '0')}`)) n++
    ref = `LT-${String(n).padStart(4, '0')}`
  }
  const transferDate = args.transferDate ? new Date(args.transferDate) : new Date()
  const note = args.notes?.trim() || ''

  return {
    ok: true,
    text: `Proposed line transfer ${ref}: ${args.qty} pcs of ${order.orderNo} from line ${fromLine.code} to line ${toLine.code}.`,
    summary: `Line transfer ${ref} | order ${order.orderNo} | ${args.qty} pcs | ${fromLine.code} → ${toLine.code} | ${transferDate.toISOString().slice(0, 10)}`,
    creates: [
      { table: 'lineIssue', data: { issueNo: `${ref}-O`, orderId: order.id, lineId: fromLine.id, issueDate: transferDate, qty: -args.qty, notes: `Line transfer ${ref} → ${toLine.code}${note ? ' · ' + note : ''}`, status: 'transferred' } },
      { table: 'lineIssue', data: { issueNo: `${ref}-I`, orderId: order.id, lineId: toLine.id, issueDate: transferDate, qty: args.qty, notes: `Line transfer ${ref} ← ${fromLine.code}${note ? ' · ' + note : ''}`, status: 'transferred' } },
    ],
    sideEffects: [
      `Line ${fromLine.code} WIP reduces by ${args.qty} pcs`,
      `Line ${toLine.code} WIP increases by ${args.qty} pcs`,
      'No godown stock moves — the pieces stay in line WIP',
    ],
    async commit() {
      return await db.$transaction(async (tx) => {
        const out = await tx.lineIssue.create({
          data: { issueNo: `${ref}-O`, orderId: order.id, lineId: fromLine.id, issueDate: transferDate, qty: -args.qty, notes: `Line transfer ${ref} → ${toLine.code}${note ? ' · ' + note : ''}`, status: 'transferred' },
        })
        const inn = await tx.lineIssue.create({
          data: { issueNo: `${ref}-I`, orderId: order.id, lineId: toLine.id, issueDate: transferDate, qty: args.qty, notes: `Line transfer ${ref} ← ${fromLine.code}${note ? ' · ' + note : ''}`, status: 'transferred' },
        })
        return { id: inn.id, ref, outIssueNo: out.issueNo, inIssueNo: inn.issueNo }
      })
    },
  }
}
