/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M3 §5 row 9 — issue_to_line service. Logic extracted VERBATIM from
// tools.ts. Ledger effect: ready_to_cut_out pcs OUT of G1 (postLedger).
// Warns (never blocks) on negative G1 balance — legacy Fiberpro behaviour.

import { db } from '@/lib/db'
import { postLedger } from './ledger'
import { resolveDocNo } from '../numbering'
import type { DocPlanResult } from './types'
import type { LineIssueInput } from '../schemas/line-issue'

export async function planLineIssue(args: LineIssueInput): Promise<DocPlanResult> {
  const order = await db.order.findUnique({ where: { orderNo: args.orderNo } })
  if (!order) return { ok: false, error: `Order ${args.orderNo} not found` }
  const line = await db.line.findUnique({ where: { code: args.lineCode } })
  if (!line) return { ok: false, error: `Line ${args.lineCode} not found (create it with create_line)` }
  const g1 = await db.godown.findUnique({ where: { code: 'G1' } })
  if (!g1) return { ok: false, error: 'Godown G1 (Main) not found — create it with create_godown' }
  const issueNo = await resolveDocNo('lineIssue', 'issueNo', 'LI-', args.issueNo)
  const issueDate = dateOrIstToday(args.issueDate)

  // Warn (never block) if G1 pcs would go negative — legacy Fiberpro behaviour.
  const bucket = await db.currentStock.findFirst({ where: { itemType: 'pcs', itemId: order.id, godownId: g1.id, lotId: null, colourId: null, sizeId: null, deptId: null, orderId: null } })
  const onHand = bucket?.pcs || 0
  const warn = onHand < args.qty ? [`⚠ G1 pcs balance is ${onHand}; issuing ${args.qty} makes it negative (cut order not yet booked?)`] : []

  return {
    ok: true,
    text: `Proposed line issue ${issueNo}: ${args.qty} pcs of ${order.orderNo} to line ${line.code} (${line.name}).`,
    summary: `Issue to line ${issueNo} | order ${order.orderNo} | line ${line.code} | ${args.qty} pcs | ${issueDate.toISOString().slice(0, 10)}`,
    creates: [{ table: 'lineIssue', data: { issueNo, orderId: order.id, lineId: line.id, issueDate, qty: args.qty, styleNo: args.styleNo || null, notes: args.notes, status: 'issued' } }],
    sideEffects: [
      `StockLedger: ${args.qty} pcs OUT of G1 (ready_to_cut_out)`,
      `Line ${line.code} WIP increases`,
      ...warn,
    ],
    async commit() {
      return await db.$transaction(async (tx) => {
        const li = await tx.lineIssue.create({
          data: { issueNo, orderId: order.id, lineId: line.id, issueDate, qty: args.qty, styleNo: args.styleNo || null, notes: args.notes, status: 'issued' },
        })
        await postLedger(tx, {
          txnType: 'ready_to_cut_out', itemType: 'pcs', itemId: order.id,
          godownId: g1.id, deptId: line.deptId, orderId: order.id,
          docNo: issueNo, docDate: issueDate,
          out: { pcs: args.qty },
          notes: `Issued to line ${line.code}`,
        })
        return { id: li.id, issueNo: li.issueNo }
      })
    },
  }
}

// ───────── SPEC-M6 §7-D-1 (Wave D) — cutting-issue variant (§4 rule-2 wrapper) ─────────

import { STAGE_DEPT } from '../legacy-enums'
import { dateOrIstToday } from '@/lib/erp/dates'

/** frmCuttingIssue — Cutting Issue (/cutting/issue). Issue fabric rolls to the
 *  cutting table: a LineIssue whose LINE belongs to the Cutting department
 *  (dept fixed to Cutting — the wrapper VALIDATES line.deptId; the base
 *  planLineIssue + create_line_issue stay byte-identical. ERRATUM: the frozen
 *  mechanism said "create_line_issue, deptCode param" — no such param exists;
 *  the dept rides line.deptId and this door enforces it). */
export async function planCuttingIssue(args: LineIssueInput): Promise<DocPlanResult> {
  const line = await db.line.findUnique({ where: { code: args.lineCode } })
  if (!line) return { ok: false, error: `Line ${args.lineCode} not found (create it with create_line)` }
  const cutDept = await db.department.findUnique({ where: { code: STAGE_DEPT.cutting } })
  if (!cutDept) return { ok: false, error: `Cutting department ${STAGE_DEPT.cutting} not found` }
  if (line.deptId !== cutDept.id) {
    return { ok: false, error: `Line ${args.lineCode} does not belong to the Cutting department (${STAGE_DEPT.cutting}) — use /production/issue for sewing lines` }
  }
  return planLineIssue({
    ...args,
    notes: args.notes ? `Cutting issue (rolls): ${args.notes}` : 'Cutting issue (rolls)',
  })
}
