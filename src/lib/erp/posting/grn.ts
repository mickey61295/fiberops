/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M3 §5 row 5 — receive_grn service. Logic extracted from tools.ts
// (Wave A) with TWO documented bug fixes found by the doc-parity test — the
// legacy inline code was latently broken against the reconstructed 54-model
// schema (see FIX comments below). NOTE: this op does NOT use postLedger; it
// writes the StockLedger row + CurrentStock bucket inline (dept-keyed buckets
// when a deptCode is given — legacy behaviour preserved). Ledger: purchase_grn IN.
// SPEC-M5 §7-B-18 (Wave B) — sibling fn planJobworkPcsReturn: a process-return
// GRN (grnType='process_return', pcs lines) with StockLedger OUT of the pcs
// godown. planGrn and its receive_grn tool stay byte-identical (§4 rule 1).
// SPEC-M5 §6 (Wave C) — sanctioned amendment: GrnInput gains an OPTIONAL
// `reprocess` flag (default false). When true the commit ALSO leaves a pending
// reprocess Approval (entityId = the GRN id) inside the same transaction —
// approved at /quality/reprocess-approval (approve_reprocess tool). Default
// behaviour is byte-identical to pre-Wave-C (flag absent ⇒ no row).

import { db } from '@/lib/db'
import { postLedger } from './ledger'
import { resolveDocNo } from '../numbering'
import { getFlag } from '../flags'
import type { DocPlanResult } from './types'
import type { GrnInput, GrnLineInput } from '../schemas/grn'
import type { JobworkPcsReturnInput } from '../schemas/grn-variants'
import type { MultiProcessGrnInput, DcReturnInput } from '../schemas/grn-variants'
import { dateOrIstToday } from '@/lib/erp/dates'

export async function planGrn(args: GrnInput): Promise<DocPlanResult> {
  const po = await db.purchaseOrder.findUnique({
    where: { poNo: args.poNo }, include: { party: true, lines: true },
  })
  if (!po) return { ok: false, error: `PO ${args.poNo} not found` }
  const godown = await db.godown.findUnique({ where: { code: args.godownCode } })
  if (!godown) return { ok: false, error: `Godown ${args.godownCode} not found` }
  let dept: any = null
  if (args.deptCode) dept = await db.department.findUnique({ where: { code: args.deptCode } })
  // PRC-01 (Phase-6B Batch 5) — the HFX-01 multi-line refusal is RETIRED:
  // receipts now address PO lines individually (lines[]) or via the legacy
  // header qty (single-line POs only). Terminal-status guard stays (HFX-01b):
  // cancelled/completed POs accept no receipts (quote the status so the
  // operator sees WHY). 'received' stays receivable — legacy allows
  // over-delivery against a fully-received PO.
  if (po.status === 'cancelled' || po.status === 'completed') {
    return { ok: false, error: `PO ${args.poNo} is ${po.status} — receipts only post against open/partial/received POs` }
  }
  // PRC-04 — the PO approval gate is REAL when the po_appr flag is on: the
  // Approval row is actually read (create-PO auto-submits one; the gate's
  // sideEffects claim becomes true when armed).
  const poAppr = await getFlag('po_appr')
  if (poAppr) {
    const appr = await db.approval.findFirst({
      where: { entity: 'po', entityId: po.id, status: 'approved' },
    })
    if (!appr) {
      const pending = await db.approval.findFirst({ where: { entity: 'po', entityId: po.id, status: 'pending' } })
      return {
        ok: false,
        error: pending
          ? `PO ${args.poNo} is still PENDING approval — approve it first (/approvals or approve_po), then receive the GRN (po_appr gate)`
          : `PO ${args.poNo} has no approval row — raise and approve it before receiving (po_appr gate)`,
      }
    }
  }
  // ── PRC-01 line resolution ──
  // Two input paths: lines[] (multi-line door, itemCode addressing) or the
  // legacy header receivedQty (single-line POs). Both produce one resolved
  // receipt line per PO line; per-line receivedQty increments; PO status
  // derives from ALL-lines coverage math.
  // POLine carries itemType+itemId (NO itemCode column) — input lines are
  // addressed by itemCode, resolved to itemId via the item models first
  // (the planPurchaseOrder / PITFALLS #21 id-map convention).
  const ITEM_MODELS: Record<string, string> = { yarn: 'yarn', fabric: 'fabric', accessory: 'accessory' }
  const poCodeByLine = new Map<string, string>() // poLine.id → itemCode (for honest error text)
  for (const p of po.lines) {
    const model = ITEM_MODELS[p.itemType]
    const item = model ? await (db as any)[model].findUnique({ where: { id: p.itemId } }).catch(() => null) : null
    if (item) poCodeByLine.set(p.id, item.code ?? p.itemId)
  }
  const lineInputs: Array<{ poLine: any; qty: number; rate: number }> = []
  if (args.lines && args.lines.length > 0) {
    const seen = new Set<string>()
    for (const l of args.lines) {
      const key = `${l.itemType}:${l.itemCode}`
      if (seen.has(key)) {
        return { ok: false, error: `Duplicate receipt line ${l.itemType} ${l.itemCode} — combine the quantities into one line` }
      }
      seen.add(key)
      const model = ITEM_MODELS[l.itemType]
      const item = model ? await (db as any)[model].findUnique({ where: { code: l.itemCode } }) : null
      if (!item) return { ok: false, error: `${l.itemType} ${l.itemCode} not found` }
      const poLine = po.lines.find((p) => p.itemType === l.itemType && p.itemId === item.id)
      if (!poLine) {
        const lineList = po.lines.map((p) => `${p.itemType}/${poCodeByLine.get(p.id) ?? p.itemId}`).join(', ')
        return {
          ok: false,
          error: `PO ${args.poNo} has no ${l.itemType} line for ${l.itemCode} (its lines: ${lineList || 'none'})`,
        }
      }
      lineInputs.push({ poLine, qty: l.qty, rate: l.rate ?? poLine.rate })
    }
    if (args.receivedQty != null) {
      return { ok: false, error: 'Pass either receivedQty (single-line legacy) or lines[] — not both' }
    }
  } else if (args.receivedQty != null) {
    if (po.lines.length > 1) {
      const lineList = po.lines.map((p) => `${p.itemType}/${poCodeByLine.get(p.id) ?? p.itemId}`).join(', ')
      return {
        ok: false,
        error: `PO ${args.poNo} has ${po.lines.length} lines (${lineList}) — a header qty cannot say WHICH line was received; pass lines[] ({itemType, itemCode, qty} per PO line)`,
      }
    }
    const poLine = po.lines[0]
    if (!poLine) return { ok: false, error: `PO has no lines` }
    lineInputs.push({ poLine, qty: args.receivedQty, rate: poLine.rate })
  } else {
    return { ok: false, error: 'Provide receivedQty (single-line POs) or lines[] (multi-line door)' }
  }
  const actualQty = lineInputs.reduce((s, l) => s + l.qty, 0)
  const totalValue = lineInputs.reduce((s, l) => s + l.qty * l.rate, 0)
  const finYear = '26-27'

  // PRC-01 — PO status from ALL-lines coverage math (the header-qty
  // comparison retired): received when EVERY line is fully covered,
  // partial when any receipt landed, open when nothing has been received.
  const coverage = po.lines.map((p) => {
    const already = (p as any).receivedQty ?? 0
    const adding = lineInputs.filter((l) => l.poLine.id === p.id).reduce((s, l) => s + l.qty, 0)
    return already + adding
  })
  const fullyCovered = po.lines.length > 0 && po.lines.every((p, i) => coverage[i] >= p.qty)
  const anyReceived = coverage.some((c) => c > 0)
  const newStatus = fullyCovered ? 'received' : anyReceived ? 'partial' : 'open'

  // Resolve a free GRN number
  const resolvedGrnNo = await (async () => {
    const desired = args.grnNo?.trim()
    if (desired) {
      const exists = await db.gRN.findUnique({ where: { grnNo: desired } }).catch(() => null)
      if (!exists) return desired
    }
    const all = await db.gRN.findMany({ where: { grnNo: { startsWith: 'GRN-' } } })
    const used = new Set(all.map((g) => g.grnNo))
    let n = 1
    while (used.has(`GRN-${String(n).padStart(4, '0')}`)) n++
    return `GRN-${String(n).padStart(4, '0')}`
  })()

  const uomLabel = lineInputs[0]?.poLine.uomId || 'units'
  return {
    ok: true,
    text: `Proposed GRN ${resolvedGrnNo} against ${args.poNo}, ${lineInputs.length} line${lineInputs.length > 1 ? 's' : ''}, ${actualQty} units, ₹${totalValue}.`,
    summary: `Receive GRN ${resolvedGrnNo} against ${args.poNo} | ${lineInputs.length} line${lineInputs.length > 1 ? 's' : ''} | ${actualQty} ${uomLabel} | ₹${totalValue} | into ${godown.code} | PO → ${newStatus}`,
    creates: [
      { table: 'grn', data: { grnNo: resolvedGrnNo, grnType: 'purchase', poId: po.id, partyId: po.partyId, godownId: godown.id, deptId: dept?.id, grnDate: dateOrIstToday(args.grnDate), finYear, partyDcRef: args.partyDcRef, totalQty: actualQty, totalValue } },
      ...lineInputs.map((l) => ({ table: 'grnLine', data: { itemType: l.poLine.itemType, itemId: l.poLine.itemId, qty: l.qty, rate: l.rate, amount: l.qty * l.rate } })),
      ...lineInputs.map((l) => ({ table: 'stockLedger', data: { txnType: 'purchase_grn', itemType: l.poLine.itemType, itemId: l.poLine.itemId, godownId: godown.id, deptId: dept?.id, docNo: resolvedGrnNo, docDate: dateOrIstToday(args.grnDate), finYear, inKgs: l.poLine.itemType === 'fabric' || l.poLine.itemType === 'yarn' ? l.qty : 0, inPcs: l.poLine.itemType === 'accessory' ? l.qty : 0, rate: l.rate, partyId: po.partyId, refId: '<pending>' } })),
      ...lineInputs.map((l) => ({ table: 'currentStock', data: { itemType: l.poLine.itemType, itemId: l.poLine.itemId, godownId: godown.id, deptId: dept?.id, kgs: l.poLine.itemType === 'fabric' || l.poLine.itemType === 'yarn' ? l.qty : 0, pcs: l.poLine.itemType === 'accessory' ? l.qty : 0, rate: l.rate } })),
      ...(args.reprocess ? [{ table: 'approval', data: { entity: 'reprocess', entityId: '<pending>', step: 1, requestedBy: 'agent', status: 'pending' } }] : []),
    ],
    updates: [
      { table: 'purchaseOrder', id: po.id, data: { status: newStatus } },
      ...lineInputs.map((l) => ({ table: 'poLine', id: l.poLine.id, data: { receivedQty: { increment: l.qty } } })),
    ],
    sideEffects: [
      'Stock increases (one ledger IN row per receipt line)',
      `PO status → ${newStatus} (all-lines coverage math — PRC-01)`,
      'Party ledger will reflect this GRN',
      ...(poAppr ? ['po_appr gate checked the PO Approval row before accepting this receipt'] : []),
      ...(args.reprocess ? [`Pending reprocess approval for ${resolvedGrnNo} appears in /quality/reprocess-approval`] : []),
    ],
    async commit() {
      return await db.$transaction(async (tx) => {
        const grn = await tx.gRN.create({
          data: {
            grnNo: resolvedGrnNo, grnType: 'purchase', poId: po.id, partyId: po.partyId,
            godownId: godown.id, deptId: dept?.id, grnDate: dateOrIstToday(args.grnDate),
            finYear, partyDcRef: args.partyDcRef, totalQty: actualQty, totalValue,
            lines: { create: lineInputs.map((l) => ({ itemType: l.poLine.itemType, itemId: l.poLine.itemId, qty: l.qty, rate: l.rate, amount: l.qty * l.rate })) },
          },
        })
        for (const l of lineInputs) {
          await tx.stockLedger.create({
            data: {
              txnType: 'purchase_grn', itemType: l.poLine.itemType, itemId: l.poLine.itemId,
              godownId: godown.id, deptId: dept?.id, docNo: resolvedGrnNo,
              docDate: dateOrIstToday(args.grnDate),
              finYear, inKgs: l.poLine.itemType === 'fabric' || l.poLine.itemType === 'yarn' ? l.qty : 0,
              inPcs: l.poLine.itemType === 'accessory' ? l.qty : 0,
              rate: l.rate, partyId: po.partyId, refId: grn.id,
            },
          })
          // Upsert current stock (per receipt line)
          // FIX #2 (found by doc-parity test, M3 Wave A): the legacy inline code
          // keyed/created the bucket with `deptId: dept?.id || ''` — the '' value
          // violates the CurrentStock→Department FK on create, and the ''-keyed
          // unique lookup can never match the null-keyed buckets that actually
          // exist. receive_grn WITHOUT a deptCode has been hard-broken since
          // rollback #4's schema reconstruction. Nulls now match the ADR-004
          // bucket pattern when no dept is given; dept-keyed buckets (legacy
          // GRN-with-dept behaviour, cf. the seeded fabric bucket) are preserved.
          // FIX #3 (found by Wave D's bucket-count assertion, PITFALLS #18 lineage):
          // findUnique THROWS when the compound-unique key carries nulls (Prisma
          // rejects null in findUnique unique-input) — the .catch swallowed it and
          // EVERY GRN created a duplicate 50-kg bucket instead of incrementing
          // (46 junk rows had accumulated across test runs). findFirst with
          // explicit nulls matches fine (the bumpStock pattern in ledger.ts);
          // the update goes by row id so even pre-existing duplicates consolidate.
          const bucketKey = {
            itemType: l.poLine.itemType, itemId: l.poLine.itemId, godownId: godown.id,
            lotId: null, colourId: null, sizeId: null, deptId: dept?.id ?? null, orderId: null,
          }
          const existing = await tx.currentStock.findFirst({ where: bucketKey })
          if (existing) {
            await tx.currentStock.update({
              where: { id: existing.id },
              data: {
                kgs: { increment: l.poLine.itemType === 'fabric' || l.poLine.itemType === 'yarn' ? l.qty : 0 },
                pcs: { increment: l.poLine.itemType === 'accessory' ? l.qty : 0 },
              },
            })
          } else {
            await tx.currentStock.create({
              data: {
                itemType: l.poLine.itemType, itemId: l.poLine.itemId, godownId: godown.id,
                deptId: dept?.id ?? null,
                kgs: l.poLine.itemType === 'fabric' || l.poLine.itemType === 'yarn' ? l.qty : 0,
                pcs: l.poLine.itemType === 'accessory' ? l.qty : 0,
                rate: l.rate,
              },
            })
          }
          // PRC-01 — per-line receivedQty increment
          await tx.pOLine.update({
            where: { id: l.poLine.id },
            data: { receivedQty: { increment: l.qty } },
          })
        }
        // PRC-01 — PO status from all-lines math
        await tx.purchaseOrder.update({
          where: { id: po.id },
          data: { status: newStatus },
        })
        // SPEC-M5 §6 Wave C — leave the pending reprocess row in the SAME transaction.
        if (args.reprocess) {
          await tx.approval.create({
            data: { entity: 'reprocess', entityId: grn.id, step: 1, requestedBy: 'agent', status: 'pending' },
          })
        }
        return { id: grn.id, grnNo: grn.grnNo, lines: lineInputs.length, poStatus: newStatus, ...(args.reprocess ? { reprocessApproval: true } : {}) }
      })
    },
  }
}

// ───────────── SPEC-M5 §7-B-18 — jobwork pcs return (sibling, §4 rule 1) ─────────────

/** frmJobWorkPcsReturn — return pieces to a jobwork unit for rework. Creates
 *  a GRN row with grnType='process_return' + a pcs GRNLine, and posts the
 *  StockLedger OUT of the pcs godown (default G2 Finished Goods). Shares the
 *  GRN-#### number space (§4 rule 2: prefixes stay per-family). */
export async function planJobworkPcsReturn(args: JobworkPcsReturnInput): Promise<DocPlanResult> {
  const party = await db.party.findUnique({ where: { code: args.partyCode } })
  if (!party) return { ok: false, error: `Party ${args.partyCode} not found` }
  const order = await db.order.findUnique({ where: { orderNo: args.orderNo } })
  if (!order) return { ok: false, error: `Order ${args.orderNo} not found` }
  const godownCode = args.godownCode?.trim() || 'G2'
  const godown = await db.godown.findUnique({ where: { code: godownCode } })
  if (!godown) return { ok: false, error: `Godown ${godownCode} not found` }
  const retNo = await resolveDocNo('gRN', 'grnNo', 'GRN-', args.retNo)
  const retDate = dateOrIstToday(args.retDate)
  const notes = args.reason?.trim() || 'Return to jobwork for rework'

  return {
    ok: true,
    text: `Proposed jobwork pcs return ${retNo}: ${args.qty} pcs of ${order.orderNo} back to ${party.name}.`,
    summary: `Jobwork pcs return ${retNo} | order ${order.orderNo} | ${args.qty} pcs | to ${party.name} | out of ${godown.code} | ${notes}`,
    creates: [
      { table: 'grn', data: { grnNo: retNo, grnType: 'process_return', partyId: party.id, godownId: godown.id, grnDate: retDate, finYear: '26-27', totalQty: args.qty, totalValue: 0 } },
      { table: 'grnLine', data: { itemType: 'pcs', itemId: order.id, qty: args.qty, rate: 0, amount: 0 } },
      { table: 'stockLedger', data: { txnType: 'process_delivery', itemType: 'pcs', itemId: order.id, godownId: godown.id, docNo: retNo, docDate: retDate, outPcs: args.qty, partyId: party.id, notes } },
    ],
    sideEffects: [
      `StockLedger: ${args.qty} pcs OUT of ${godown.code} (process_delivery — back to jobworker)`,
      'Jobworker balance will reflect the return',
    ],
    async commit() {
      return await db.$transaction(async (tx) => {
        const grn = await tx.gRN.create({
          data: {
            grnNo: retNo, grnType: 'process_return', partyId: party.id, godownId: godown.id,
            grnDate: retDate, finYear: '26-27', totalQty: args.qty, totalValue: 0,
            lines: { create: { itemType: 'pcs', itemId: order.id, qty: args.qty, rate: 0, amount: 0 } },
          },
        })
        await postLedger(tx, {
          txnType: 'process_delivery', itemType: 'pcs', itemId: order.id,
          godownId: godown.id, orderId: order.id,
          docNo: retNo, docDate: retDate, partyId: party.id,
          out: { pcs: args.qty },
          notes: `Jobwork pcs return ${retNo} — ${notes}`,
        })
        return { id: grn.id, grnNo: grn.grnNo }
      })
    },
  }
}

// ───────── SPEC-M6 §7-D-1 (Wave D) — GRN-family variants (§4 rule-2 siblings) ─────────

/** frmPrsGRNMulti — Multi-Process GRN (/procurement/grn/multi-process).
 *  Returns components across MULTIPLE lines to a processor in ONE MP-#### GRN
 *  (grnType='process_return'); StockLedger process_delivery OUT per line —
 *  the jobwork-pcs-return direction (material goes BACK to the processor).
 *  Views reuse /procurement/grn/[id] (a return IS a GRN row). */
export async function planMultiProcessGrn(args: MultiProcessGrnInput): Promise<DocPlanResult> {
  const party = await db.party.findUnique({ where: { code: args.partyCode } })
  if (!party) return { ok: false, error: `Party ${args.partyCode} not found` }
  const godownCode = args.godownCode?.trim() || 'G1'
  const godown = await db.godown.findUnique({ where: { code: godownCode } })
  if (!godown) return { ok: false, error: `Godown ${godownCode} not found` }
  const lines = args.lines ?? []
  if (lines.length === 0) return { ok: false, error: 'At least one component line is required' }

  const ITEM_MODELS: Record<string, string> = { yarn: 'yarn', fabric: 'fabric', accessory: 'accessory' }
  const UOM: Record<string, string> = { yarn: 'kgs', fabric: 'kgs', accessory: 'pcs' }
  const resolved: Array<{ itemType: 'yarn' | 'fabric' | 'accessory'; itemId: string; code: string; qty: number; rate: number; uom: string }> = []
  for (const l of lines) {
    const model = ITEM_MODELS[l.itemType]
    const item = model ? await (db as any)[model].findUnique({ where: { code: l.itemCode } }) : null
    if (!item) return { ok: false, error: `${l.itemType} ${l.itemCode} not found` }
    resolved.push({ itemType: l.itemType, itemId: item.id, code: l.itemCode, qty: l.qty, rate: l.rate ?? 0, uom: UOM[l.itemType] })
  }

  const grnNo = await resolveDocNo('gRN', 'grnNo', 'MP-', args.grnNo)
  const grnDate = dateOrIstToday(args.grnDate)
  const totalQty = resolved.reduce((s, l) => s + l.qty, 0)
  const totalValue = resolved.reduce((s, l) => s + l.qty * l.rate, 0)
  const notes = args.notes?.trim() || `Multi-process return to ${party.name}`

  return {
    ok: true,
    text: `Proposed multi-process GRN ${grnNo}: ${resolved.length} component lines, ${totalQty} units back to ${party.name}.`,
    summary: `Multi-process GRN ${grnNo} | ${party.name} | ${resolved.length} lines | ${totalQty} units | out of ${godown.code} | ₹${totalValue}`,
    creates: [
      { table: 'grn', data: { grnNo, grnType: 'process_return', partyId: party.id, godownId: godown.id, grnDate, finYear: '26-27', partyDcRef: notes, totalQty, totalValue } },
      ...resolved.map((l) => ({ table: 'grnLine', data: { itemType: l.itemType, itemId: l.itemId, qty: l.qty, rate: l.rate, amount: l.qty * l.rate } })),
      ...resolved.map((l) => ({
        table: 'stockLedger',
        data: { txnType: 'process_delivery', itemType: l.itemType, itemId: l.itemId, godownId: godown.id, docNo: grnNo, docDate: grnDate, outKgs: l.uom === 'kgs' ? l.qty : 0, outPcs: l.uom === 'pcs' ? l.qty : 0, rate: l.rate, partyId: party.id, notes: `MP return ${l.code}` },
      })),
    ],
    sideEffects: [
      `StockLedger: ${resolved.length} process_delivery rows OUT of ${godown.code} (components back to the processor)`,
      'Party ledger will reflect the process return',
    ],
    async commit() {
      return await db.$transaction(async (tx) => {
        const grn = await tx.gRN.create({
          data: {
            grnNo, grnType: 'process_return', partyId: party.id, godownId: godown.id,
            grnDate, finYear: '26-27', partyDcRef: notes, totalQty, totalValue,
            lines: { create: resolved.map((l) => ({ itemType: l.itemType, itemId: l.itemId, qty: l.qty, rate: l.rate, amount: l.qty * l.rate })) },
          },
        })
        for (const l of resolved) {
          await postLedger(tx, {
            txnType: 'process_delivery', itemType: l.itemType, itemId: l.itemId,
            godownId: godown.id, docNo: grnNo, docDate: grnDate, partyId: party.id,
            out: l.uom === 'kgs' ? { kgs: l.qty } : { pcs: l.qty },
            rate: l.rate, notes: `MP return ${l.code} — ${notes}`,
          })
        }
        return { id: grn.id, grnNo: grn.grnNo, lines: resolved.length }
      })
    },
  }
}

/** FrmFabDel_Return / FrmAccDel_Return — DC Return (/dispatch/dc-return).
 *  Books material that went out on a DC back INTO stock: one RTN-#### GRN
 *  (grnType='process_return', partyDcRef = the DC no) with StockLedger
 *  process_receipt IN per line — the mirror of the DC's process_delivery OUT.
 *  M39 / JWL-04: the DC is RESOLVED (no free-text dcRef — a wrong number is an
 *  error, not a silently untraceable return); per-line guard
 *  qty ≤ sent − returned (cumulative, via JobworkLine.returnedQty + the header
 *  mirror for legacy line-less DCs); the DC status flips inside the commit
 *  (sent → partial → received); JW-#### DCs additionally clear their G3
 *  'Jobworker Yard' WIP leg (JWL-08). */
export async function planDcReturn(args: DcReturnInput): Promise<DocPlanResult> {
  const dcRef = args.dcNo.trim()
  const dc = await db.jobworkOrder.findUnique({ where: { dcNo: dcRef }, include: { lines: true, jobworker: true } })
  if (!dc) {
    return { ok: false, error: `DC ${dcRef} not found — a return must reference a real MDC-/PDC-/JW-#### document` }
  }
  // party: the DC's own party by default (JWL-04 — no mismatched free choice)
  const party = args.partyCode?.trim()
    ? await db.party.findUnique({ where: { code: args.partyCode.trim() } })
    : dc.jobworker
  if (!party) return { ok: false, error: `Party ${args.partyCode} not found` }
  if (party.id !== dc.jobworkerId) {
    return { ok: false, error: `Party ${party.code} is not the DC party (${dc.jobworker?.code ?? '—'}) — returns book against the DC's own party` }
  }
  const godownCode = args.godownCode?.trim() || 'G1'
  const godown = await db.godown.findUnique({ where: { code: godownCode } })
  if (!godown) return { ok: false, error: `Godown ${godownCode} not found` }
  const lines = args.lines ?? []
  if (lines.length === 0) return { ok: false, error: 'At least one line is required' }
  if (['received', 'accepted', 'billed'].includes(dc.status)) {
    return { ok: false, error: `DC ${dcRef} is already ${dc.status} — nothing further to return` }
  }

  const g3 = dcRef.startsWith('JW-') ? await db.godown.findUnique({ where: { code: 'G3' } }) : null // JWL-08 — clear WIP for JW DCs

  // JWL-04 — cumulative per-line guard: qty ≤ sent − returned
  const resolved: Array<{ itemType: 'yarn' | 'fabric' | 'accessory'; itemId: string; code: string; qty: number; rate: number; uom: string; dcLine: any }> = []
  for (const l of lines) {
    const dcLine = dc.lines.find((d) => d.itemCode === l.itemCode && d.itemType === l.itemType)
    if (dcLine) {
      const open = dcLine.qty - dcLine.returnedQty
      if (l.qty > open + 1e-9) {
        return { ok: false, error: `Line ${l.itemCode}: returning ${l.qty} exceeds the open qty ${Math.round(open * 100) / 100} (sent ${dcLine.qty}, already returned ${dcLine.returnedQty})` }
      }
      resolved.push({ itemType: l.itemType, itemId: dcLine.itemId, code: l.itemCode, qty: l.qty, rate: l.rate ?? dcLine.rate, uom: dcLine.uom, dcLine })
    } else if (dc.lines.length > 0) {
      return { ok: false, error: `Line ${l.itemType} ${l.itemCode} is not on DC ${dcRef} (its lines: ${dc.lines.map((d) => `${d.itemType}/${d.itemCode}`).join(', ')})` }
    } else {
      // legacy line-less DC — header-level guard only (the item still must exist)
      const models: Record<string, string> = { yarn: 'yarn', fabric: 'fabric', accessory: 'accessory' }
      const uoms: Record<string, string> = { yarn: 'kgs', fabric: 'kgs', accessory: 'pcs' }
      const model = models[l.itemType]
      const item = model ? await (db as any)[model].findUnique({ where: { code: l.itemCode } }) : null
      if (!item) return { ok: false, error: `${l.itemType} ${l.itemCode} not found` }
      resolved.push({ itemType: l.itemType, itemId: item.id, code: l.itemCode, qty: l.qty, rate: l.rate ?? 0, uom: uoms[l.itemType], dcLine: null })
    }
  }
  const headerOpen = dc.totalQty - dc.returnedQty
  const totalReturning = resolved.reduce((s, l) => s + l.qty, 0)
  if (totalReturning > headerOpen + 1e-9) {
    return { ok: false, error: `Return ${totalReturning} exceeds the DC open qty ${Math.round(headerOpen * 100) / 100} (sent ${dc.totalQty}, already returned ${dc.returnedQty})` }
  }

  const grnNo = await resolveDocNo('gRN', 'grnNo', 'RTN-', args.grnNo)
  const grnDate = dateOrIstToday(args.grnDate)
  const totalQty = resolved.reduce((s, l) => s + l.qty, 0)
  const totalValue = resolved.reduce((s, l) => s + l.qty * l.rate, 0)
  const notes = args.notes?.trim() || `Return against DC ${dcRef}`
  const newReturned = dc.returnedQty + totalQty
  const newStatus = newReturned >= dc.totalQty - 1e-9 ? 'received' : 'partial'

  return {
    ok: true,
    text: `Proposed DC return ${grnNo}: ${totalQty} units back from ${party.name} against ${dcRef} (${newReturned}/${dc.totalQty} returned).`,
    summary: `DC return ${grnNo} | against ${dcRef} | ${party.name} | ${resolved.length} lines | ${totalQty} units | into ${godown.code} | ₹${totalValue} | DC → ${newStatus}`,
    creates: [
      { table: 'grn', data: { grnNo, grnType: 'process_return', partyId: party.id, godownId: godown.id, grnDate, finYear: '26-27', docNo: dcRef, partyDcRef: notes, totalQty, totalValue } },
      ...resolved.map((l) => ({ table: 'grnLine', data: { itemType: l.itemType, itemId: l.itemId, qty: l.qty, rate: l.rate, amount: l.qty * l.rate } })),
      ...resolved.map((l) => ({
        table: 'stockLedger',
        data: { txnType: 'process_receipt', itemType: l.itemType, itemId: l.itemId, godownId: godown.id, docNo: grnNo, docDate: grnDate, inKgs: l.uom === 'kgs' ? l.qty : 0, inPcs: l.uom === 'pcs' ? l.qty : 0, rate: l.rate, partyId: party.id, notes: `RTN ${l.code} vs ${dcRef}` },
      })),
      ...(g3 ? resolved.map((l) => ({
        table: 'stockLedger',
        data: { txnType: 'process_receipt', itemType: l.itemType, itemId: l.itemId, godownId: g3.id, docNo: grnNo, docDate: grnDate, outKgs: l.uom === 'kgs' ? l.qty : 0, outPcs: l.uom === 'pcs' ? l.qty : 0, rate: l.rate, partyId: party.id, notes: `WIP cleared (G3) vs ${dcRef}` },
      })) : []),
    ],
    updates: [
      { table: 'jobworkOrder', id: dc.id, data: { returnedQty: newReturned, status: newStatus } },
      ...resolved.filter((l) => l.dcLine).map((l) => ({ table: 'jobworkLine', id: l.dcLine.id, data: { returnedQty: l.dcLine.returnedQty + l.qty } })),
    ],
    sideEffects: [
      `StockLedger: ${resolved.length} process_receipt rows INTO ${godown.code} (material back from the DC)`,
      ...(g3 ? [`G3 'Jobworker Yard' WIP −${totalQty} (the JW out leg's parked WIP clears)`] : []),
      `DC ${dcRef} → ${newStatus} (returned ${newReturned}/${dc.totalQty}, cumulative)`,
      'Party ledger will reflect the return',
    ],
    async commit() {
      return await db.$transaction(async (tx) => {
        const grn = await tx.gRN.create({
          data: {
            grnNo, grnType: 'process_return', partyId: party.id, godownId: godown.id,
            grnDate, finYear: '26-27', docNo: dcRef, partyDcRef: notes, totalQty, totalValue,
            lines: { create: resolved.map((l) => ({ itemType: l.itemType, itemId: l.itemId, qty: l.qty, rate: l.rate, amount: l.qty * l.rate })) },
          },
        })
        for (const l of resolved) {
          await postLedger(tx, {
            txnType: 'process_receipt', itemType: l.itemType, itemId: l.itemId,
            godownId: godown.id, docNo: grnNo, docDate: grnDate, partyId: party.id,
            in: l.uom === 'kgs' ? { kgs: l.qty } : { pcs: l.qty },
            rate: l.rate, notes: `DC return ${l.code} vs ${dcRef} — ${notes}`,
          })
          if (g3) {
            await postLedger(tx, {
              txnType: 'process_receipt', itemType: l.itemType, itemId: l.itemId,
              godownId: g3.id, docNo: grnNo, docDate: grnDate, partyId: party.id,
              out: l.uom === 'kgs' ? { kgs: l.qty } : { pcs: l.qty },
              rate: l.rate, notes: `WIP cleared (G3) vs ${dcRef} — ${l.code}`,
            })
          }
          if (l.dcLine) {
            await tx.jobworkLine.update({ where: { id: l.dcLine.id }, data: { returnedQty: l.dcLine.returnedQty + l.qty } })
          }
        }
        await tx.jobworkOrder.update({ where: { id: dc.id }, data: { returnedQty: newReturned, status: newStatus } })
        return { id: grn.id, grnNo: grn.grnNo, dcNo: dcRef, lines: resolved.length, dcStatus: newStatus }
      })
    },
  }
}
