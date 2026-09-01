/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Lifecycle services — SPEC-M6 §7-C-5/6 (Wave C). Thin status transitions
 * with guards, sharing the plan/commit DocPlanResult contract so the screens
 * (thin DocScreens) and the docTools (close_order, cancel_program,
 * complete_program, complete_purchase_order, amend) are the SAME door
 * (ADR-001). Guards per spec:
 *  - close_order: despatch Σ ≥ 95% of totalPcs AND an invoice exists
 *  - cancel_program: ledger net-zero for the program item (or force)
 *  - complete_program: balance ≤ 0 (or force) — settles status only
 *  - complete_purchase_order: received qty > 0 → status received (HFX-10 —
 *    the PO_STATUS enum has no 'completed'; 'received' is the terminal value)
 *  - planOrderAmend: the update_order inline logic extracted (§7-C-5)
 */
import { db } from '@/lib/db'
import type { DocPlanResult } from './types'

export interface CloseOrderInput {
  orderNo: string
  force?: boolean
  notes?: string
}

export async function planCloseOrder(args: CloseOrderInput): Promise<DocPlanResult> {
  const order = await db.order.findUnique({
    where: { orderNo: args.orderNo },
    include: { salesInvoices: true },
  })
  if (!order) return { ok: false, error: `Order ${args.orderNo} not found` }
  if (order.status === 'closed') return { ok: false, error: `Order ${order.orderNo} is already closed` }
  if (order.status === 'cancelled') return { ok: false, error: `Order ${order.orderNo} is cancelled — cannot close` }
  const despatches = await db.pcsDespatch.findMany({ where: { orderId: order.id } })
  const despatched = despatches.reduce((s, d) => s + d.totalPcs, 0)
  const shippedPct = order.totalPcs > 0 ? despatched / order.totalPcs : 1
  const hasInvoice = order.salesInvoices.length > 0
  if (!args.force && (shippedPct < 0.95 || !hasInvoice)) {
    return {
      ok: false,
      error: `Guards failed for ${order.orderNo}: despatched ${Math.round(shippedPct * 100)}% (needs ≥ 95%)${hasInvoice ? '' : ' and NO invoice exists'} — pass force to override`,
    }
  }
  return {
    ok: true,
    text: `Proposed CLOSE of order ${order.orderNo} (despatched ${despatched}/${order.totalPcs} pcs).`,
    summary: `Close order ${order.orderNo} | despatched ${despatched}/${order.totalPcs} pcs | invoices ${order.salesInvoices.length}${args.force ? ' | FORCED' : ''}`,
    updates: [{ table: 'order', id: order.id, data: { status: 'closed' } }],
    sideEffects: ['Order blocks further entries (posting services reject closed orders)'],
    async commit() {
      await db.order.update({
        where: { id: order.id },
        data: { status: 'closed', notes: args.notes ? `${order.notes ? order.notes + ' | ' : ''}${args.notes}` : order.notes },
      })
      return { id: order.id, orderNo: order.orderNo }
    },
  }
}

export interface ProgramLifecycleInput {
  programNo: string
  force?: boolean
  notes?: string
}

export async function planCancelProgram(args: ProgramLifecycleInput): Promise<DocPlanResult> {
  const program = await db.program.findUnique({ where: { programNo: args.programNo } })
  if (!program) return { ok: false, error: `Program ${args.programNo} not found` }
  if (program.status === 'cancelled') return { ok: false, error: `Program ${program.programNo} is already cancelled` }
  if (program.status === 'complete') return { ok: false, error: `Program ${program.programNo} is complete — cannot cancel` }
  // ledger net-zero guard: the program's item net movement must be zero
  // (everything consumed came back in) unless forced
  if (!args.force) {
    const itemKey = program.yarnId ? 'yarn' : 'fabric'
    const itemId = program.yarnId ?? program.fabricId
    if (!itemId) return { ok: false, error: `Program ${program.programNo} has no item linked — pass force to cancel anyway` }
    const ledger = await db.stockLedger.findMany({ where: { itemType: itemKey, itemId, orderId: program.orderId } })
    const netKgs = ledger.reduce((s, r) => s + r.inKgs - r.outKgs, 0)
    if (Math.abs(netKgs) > 0.01) {
      return { ok: false, error: `Program ${program.programNo} has a non-zero ledger balance (${netKgs.toFixed(2)} kgs) — settle stock first or pass force` }
    }
  }
  return {
    ok: true,
    text: `Proposed CANCEL of program ${program.programNo}.`,
    summary: `Cancel program ${program.programNo} | status ${program.status} → cancelled${args.force ? ' | FORCED' : ''}`,
    updates: [{ table: 'program', id: program.id, data: { status: 'cancelled' } }],
    sideEffects: ['Program stops appearing in balances; ledger rows stay (audit)'],
    async commit() {
      await db.program.update({ where: { id: program.id }, data: { status: 'cancelled' } })
      return { id: program.id, programNo: program.programNo }
    },
  }
}

export async function planCompleteProgram(args: ProgramLifecycleInput): Promise<DocPlanResult> {
  const program = await db.program.findUnique({ where: { programNo: args.programNo } })
  if (!program) return { ok: false, error: `Program ${args.programNo} not found` }
  if (program.status === 'complete') return { ok: false, error: `Program ${program.programNo} is already complete` }
  if (program.status === 'cancelled') return { ok: false, error: `Program ${program.programNo} is cancelled — cannot complete` }
  // balance guard: actual achieved ≥ required (ledger-derived, the
  // program-status math) unless forced
  if (!args.force) {
    const itemKey = program.yarnId ? 'yarn' : 'fabric'
    const itemId = program.yarnId ?? program.fabricId
    if (!itemId) return { ok: false, error: `Program ${program.programNo} has no item linked — pass force to complete anyway` }
    const ledger = await db.stockLedger.findMany({ where: { itemType: itemKey, itemId, orderId: program.orderId } })
    const actual = program.yarnId
      ? ledger.reduce((s, r) => s + r.outKgs, 0)
      : ledger.reduce((s, r) => s + r.inKgs, 0)
    if (actual + 0.01 < program.requiredKgs) {
      return { ok: false, error: `Program ${program.programNo} balance ${(program.requiredKgs - actual).toFixed(2)} kgs remains (achieved ${actual.toFixed(2)}/${program.requiredKgs}) — pass force to settle anyway` }
    }
  }
  return {
    ok: true,
    text: `Proposed COMPLETE of program ${program.programNo}.`,
    summary: `Complete program ${program.programNo} | status ${program.status} → completed${args.force ? ' | FORCED' : ''}`,
    updates: [{ table: 'program', id: program.id, data: { status: 'completed' } }],
    sideEffects: ['Program settles — balances stop projecting it'],
    async commit() {
      await db.program.update({ where: { id: program.id }, data: { status: 'completed' } })
      return { id: program.id, programNo: program.programNo }
    },
  }
}

export interface PoLifecycleInput {
  poNo: string
  action: 'cancel' | 'complete'
  reason?: string
}

export async function planPoLifecycle(args: PoLifecycleInput): Promise<DocPlanResult> {
  const po = await db.purchaseOrder.findUnique({ where: { poNo: args.poNo }, include: { grns: true } })
  if (!po) return { ok: false, error: `PO ${args.poNo} not found` }
  if (args.action === 'cancel') {
    if (po.status === 'cancelled') return { ok: false, error: `PO ${po.poNo} is already cancelled` }
    const received = po.grns.reduce((s, g) => s + g.totalQty, 0)
    if (received > 0) {
      return { ok: false, error: `PO ${po.poNo} has ${received} qty received against it — cancel the receipts first (accounting-aware)` }
    }
    // same service the cancel_purchase_order tool uses (no fork — ADR-001)
    const { planCancelPo } = await import('./cancel')
    return planCancelPo({ poNo: args.poNo, reason: args.reason })
  }
  // complete — HFX-10 (Phase-6B Batch 0): the terminal value is 'received'
  // (PO_STATUS = open | partial | received | cancelled — there IS no
  // 'completed'). The old code wrote 'completed' — a value outside the enum,
  // invisible to every status filter. Transitions produce only enum values.
  if (po.status === 'received') return { ok: false, error: `PO ${po.poNo} is already fully received (completed)` }
  const received = po.grns.reduce((s, g) => s + g.totalQty, 0)
  if (received <= 0) return { ok: false, error: `PO ${po.poNo} has no receipts — receive a GRN against it first` }
  return {
    ok: true,
    text: `Proposed COMPLETE of PO ${po.poNo} (received ${received} qty).`,
    summary: `Complete PO ${po.poNo} | received ${received}/${po.totalQty} qty | status ${po.status} → received`,
    updates: [{ table: 'purchaseOrder', id: po.id, data: { status: 'received' } }],
    sideEffects: ['PO settles in party balances'],
    async commit() {
      await db.purchaseOrder.update({ where: { id: po.id }, data: { status: 'received' } })
      return { id: po.id, poNo: po.poNo }
    },
  }
}

export interface OrderAmendInput {
  orderNo: string
  deliveryDate?: string
  status?: string
  notes?: string
  totalPcs?: number
}

/** The update_order inline logic extracted (SPEC-M6 §7-C-5); the tool keeps
 *  its frozen json contract and delegates here. */
export async function planOrderAmend(args: OrderAmendInput): Promise<DocPlanResult> {
  const order = await db.order.findUnique({ where: { orderNo: args.orderNo } })
  if (!order) return { ok: false, error: `Order ${args.orderNo} not found` }
  const patch: any = {}
  if (args.deliveryDate) patch.deliveryDate = new Date(args.deliveryDate)
  if (args.status) patch.status = args.status
  if (args.notes !== undefined) patch.notes = args.notes
  if (args.totalPcs !== undefined && args.totalPcs > 0) patch.totalPcs = args.totalPcs
  if (Object.keys(patch).length === 0) {
    return { ok: false, error: 'Nothing to amend — provide deliveryDate, status, notes or totalPcs' }
  }
  return {
    ok: true,
    text: `Proposed amendment to order ${order.orderNo}.`,
    summary: `Amend order ${order.orderNo} | fields: ${Object.keys(patch).join(', ')}`,
    updates: [{ table: 'order', id: order.id, data: patch }],
    sideEffects: ['Order master updated (history = updatedAt + notes)'],
    async commit() {
      await db.order.update({ where: { id: order.id }, data: patch })
      return { id: order.id, orderNo: order.orderNo }
    },
  }
}

// ───────────── SPEC-M41 (Phase-6B Batch 5, PRC-02/05/07) ─────────────

export interface PoAmendInput {
  poNo: string
  deliveryDate?: string
  status?: string
  notes?: string
  lines?: Array<{ itemType: 'yarn' | 'fabric' | 'accessory'; itemCode: string; qty?: number; rate?: number }>
}

/** PRC-02 — PO amendment (the planOrderAmend precedent, with line revisions):
 *  deliveryDate / status / notes / per-line qty+rate patches. totalQty and
 *  totalValue recompute from the amended lines; the trail appends to notes;
 *  a qty reduction below the already-received qty is refused (the receipt
 *  is a fact — cancel the PO or return via PRN instead); cancelled /
 *  completed POs refuse (their doors are the lifecycle/cancel services). */
export async function planPoAmend(args: PoAmendInput): Promise<DocPlanResult> {
  const po = await db.purchaseOrder.findUnique({ where: { poNo: args.poNo }, include: { lines: true } })
  if (!po) return { ok: false, error: `PO ${args.poNo} not found` }
  if (po.status === 'cancelled') return { ok: false, error: `PO ${args.poNo} is cancelled — amend the replacement PO instead` }
  if (po.status === 'completed') return { ok: false, error: `PO ${po.poNo} is completed — history is frozen (receive-then-return via PRN- if goods are wrong)` }

  const patch: any = {}
  if (args.deliveryDate) patch.deliveryDate = new Date(args.deliveryDate)
  if (args.status) {
    if (args.status === 'cancelled' || args.status === 'completed') {
      return { ok: false, error: `status '${args.status}' is a lifecycle transition, not an amendment — use complete_purchase_order / the PO cancel door` }
    }
    patch.status = args.status
  }
  const notesTrail: string[] = []
  if (args.notes) notesTrail.push(args.notes)

  // Line revisions — matched by itemType+itemId (the input's itemCode is
  // resolved through the item models first — POLine has NO itemCode column,
  // PITFALLS #21 convention; PRC-01 addressing).
  const ITEM_MODELS: Record<string, string> = { yarn: 'yarn', fabric: 'fabric', accessory: 'accessory' }
  const poCodeByLine = new Map<string, string>()
  for (const p of po.lines) {
    const model = ITEM_MODELS[p.itemType]
    const item = model ? await (db as any)[model].findUnique({ where: { id: p.itemId } }).catch(() => null) : null
    if (item) poCodeByLine.set(p.id, item.code ?? p.itemId)
  }
  const linePatches: Array<{ poLine: any; data: any }> = []
  const lineUpdates: Array<{ table: string; id: string; data: any }> = []
  if (args.lines && args.lines.length > 0) {
    const seen = new Set<string>()
    for (const l of args.lines) {
      const key = `${l.itemType}:${l.itemCode}`
      if (seen.has(key)) return { ok: false, error: `Duplicate amendment line ${l.itemType} ${l.itemCode} — combine into one revision` }
      seen.add(key)
      const model = ITEM_MODELS[l.itemType]
      const item = model ? await (db as any)[model].findUnique({ where: { code: l.itemCode } }) : null
      if (!item) return { ok: false, error: `${l.itemType} ${l.itemCode} not found` }
      const poLine = po.lines.find((p) => p.itemType === l.itemType && p.itemId === item.id)
      if (!poLine) {
        const lineList = po.lines.map((p) => `${p.itemType}/${poCodeByLine.get(p.id) ?? p.itemId}`).join(', ')
        return { ok: false, error: `PO ${po.poNo} has no ${l.itemType} line for ${l.itemCode} (its lines: ${lineList || 'none'})` }
      }
      const data: any = {}
      if (l.qty != null) {
        if (l.qty <= 0) return { ok: false, error: `Line ${l.itemCode}: amended qty must be positive` }
        if (l.qty < poLine.receivedQty - 1e-9) {
          return { ok: false, error: `Line ${l.itemCode}: amended qty ${l.qty} is below the already-received ${poLine.receivedQty} — receive-then-return via PRN- instead of amending below reality` }
        }
        data.qty = l.qty
        data.amount = l.qty * (l.rate ?? poLine.rate)
      }
      if (l.rate != null) {
        if (l.rate < 0) return { ok: false, error: `Line ${l.itemCode}: amended rate cannot be negative` }
        data.rate = l.rate
        if (l.qty == null) data.amount = poLine.qty * l.rate
        else data.amount = l.qty * l.rate
      }
      if (Object.keys(data).length === 0) return { ok: false, error: `Line ${l.itemCode}: nothing to amend — pass qty and/or rate` }
      notesTrail.push(`amended ${l.itemType}/${l.itemCode}: ${[l.qty != null ? `qty ${poLine.qty} → ${l.qty}` : null, l.rate != null ? `rate ${poLine.rate} → ${l.rate}` : null].filter(Boolean).join(', ')}`)
      linePatches.push({ poLine, data })
      lineUpdates.push({ table: 'poLine', id: poLine.id, data })
    }
  }

  // Recompute totals over amended lines (only when lines actually moved — a
  // header-only amendment leaves totals untouched).
  if (lineUpdates.length > 0) {
    const amendedLines = po.lines.map((p) => {
      const patchLine = linePatches.find((lp) => lp.poLine.id === p.id)
      return patchLine ? { ...p, ...patchLine.data } : p
    })
    const newTotalQty = amendedLines.reduce((s, l) => s + l.qty, 0)
    const newTotalValue = amendedLines.reduce((s, l) => s + l.qty * l.rate, 0)
    patch.totalQty = newTotalQty
    patch.totalValue = newTotalValue
  }
  if (notesTrail.length > 0) {
    const stamp = new Date().toISOString().slice(0, 10)
    patch.notes = `${po.notes ? po.notes + ' | ' : ''}[amended ${stamp}] ${notesTrail.join('; ')}`
  }
  if (Object.keys(patch).length === 0 && lineUpdates.length === 0) {
    return { ok: false, error: 'Nothing to amend — provide deliveryDate, status, notes or lines[]' }
  }
  const newTotalsQty = patch.totalQty ?? po.totalQty
  const newTotalsValue = patch.totalValue ?? po.totalValue

  return {
    ok: true,
    text: `Proposed amendment to PO ${po.poNo}${lineUpdates.length > 0 ? ` (${lineUpdates.length} line revision${lineUpdates.length > 1 ? 's' : ''})` : ''} — totals ${newTotalsQty} units / ₹${newTotalsValue}.`,
    summary: `Amend PO ${po.poNo} | fields: ${[args.deliveryDate ? 'deliveryDate' : null, args.status ? 'status' : null, args.notes ? 'notes' : null, lineUpdates.length > 0 ? `lines ×${lineUpdates.length}` : null].filter(Boolean).join(', ')} | totals ${newTotalsQty} / ₹${newTotalsValue}`,
    updates: [
      { table: 'purchaseOrder', id: po.id, data: patch },
      ...lineUpdates,
    ],
    sideEffects: [
      'PO master updated (history = the appended [amended …] notes trail + runCommit audit row)',
      `${newTotalsQty} units / ₹${newTotalsValue} become the new PO truth`,
      'Already-received quantities are immutable (qty amendments refuse to go below them)',
    ],
    async commit() {
      await db.$transaction(async (tx) => {
        const { lines: _lines, ...headerPatch } = patch
        await tx.purchaseOrder.update({ where: { id: po.id }, data: headerPatch })
        for (const lu of lineUpdates) {
          await (tx as any).pOLine.update({ where: { id: lu.id }, data: lu.data })
        }
      })
      return { id: po.id, poNo: po.poNo, linesAmended: lineUpdates.length }
    },
  }
}

export interface DcTransitionInput {
  dcNo: string
  to: 'despatched' | 'delivered'
  date?: string
  notes?: string
}

/** PRC-05 — the DC/LAD lifecycle door (ADR-001: one service, both doors):
 *  - `to: 'despatched'` = the LAD CONVERSION (loading → actually shipped;
 *    the LAD- number stays as the permanent document identity — the ledger
 *    docNo/docKey chain is untouchable, OPS-05);
 *  - `to: 'delivered'` = the buyer-side terminal state (stamps deliveredAt).
 *  Guards: delivered is terminal; already-at-target refuses; cancelled
 *  refuses. Document-only — the stock left at despatch time already. */
export async function planDcTransition(args: DcTransitionInput): Promise<DocPlanResult> {
  const dc = await db.pcsDespatch.findUnique({ where: { dcNo: args.dcNo } })
  if (!dc) return { ok: false, error: `DC ${args.dcNo} not found — despatch day-book at /dispatch/register` }
  const at = args.date ? new Date(args.date) : new Date()
  const patch: any = { status: args.to }
  if (args.to === 'delivered') patch.deliveredAt = at
  if (dc.status === args.to) {
    return { ok: false, error: `DC ${args.dcNo} is already ${args.to}${args.to === 'delivered' ? ` (deliveredAt ${dc.deliveredAt ? new Date(dc.deliveredAt).toISOString().slice(0, 10) : '—'})` : ''}` }
  }
  if (dc.status === 'delivered') {
    return { ok: false, error: `DC ${args.dcNo} is delivered — the terminal state (no transitions back; cancel/reverse doors do not exist for delivered goods)` }
  }
  if (dc.status === 'draft') {
    return { ok: false, error: `DC ${args.dcNo} is still a draft — commit it first (the despatch door)` }
  }
  const label = args.to === 'despatched' ? 'CONVERT (loading challan → live despatch)' : 'DELIVER'
  return {
    ok: true,
    text: `Proposed ${label} for DC ${args.dcNo} (${dc.status} → ${args.to}).`,
    summary: `${label} DC ${args.dcNo} | ${dc.status} → ${args.to}${args.to === 'delivered' ? ` | deliveredAt ${at.toISOString().slice(0, 10)}` : ''} | ${dc.totalPcs} pcs`,
    updates: [{ table: 'pcsDespatch', id: dc.id, data: patch }],
    sideEffects: [
      args.to === 'despatched'
        ? 'The loading challan becomes a live despatch (the LAD- number stays — permanent document identity, ledger docNo intact)'
        : `Buyer-side delivery recorded (deliveredAt ${at.toISOString().slice(0, 10)}) — the despatch aging stops`,
      'No stock effect — goods left stock at despatch commit time',
    ],
    async commit() {
      await db.pcsDespatch.update({ where: { id: dc.id }, data: patch })
      return { id: dc.id, dcNo: dc.dcNo, status: args.to, ...(args.to === 'delivered' ? { deliveredAt: at } : {}) }
    },
  }
}

export interface GateClearInput {
  entryNo: string
  notes?: string
}

/** PRC-07 — the gate clear door: logged → cleared (the vehicle left / the
 *  entry settled). Clearing again refuses; a cleared row never re-logs (the
 *  gate log is append-only by discipline). */
export async function planClearGateEntry(args: GateClearInput): Promise<DocPlanResult> {
  const ge = await db.gateEntry.findUnique({ where: { entryNo: args.entryNo } })
  if (!ge) return { ok: false, error: `Gate ${args.entryNo} not found` }
  if (ge.status === 'cleared') return { ok: false, error: `Gate ${args.entryNo} is already cleared — the log is append-only (log a fresh entry for a new movement)` }
  return {
    ok: true,
    text: `Proposed CLEAR of gate ${args.entryNo} (${ge.gateType.toUpperCase()}${ge.refDocNo ? `, ref ${ge.refDocNo}` : ''}).`,
    summary: `Clear gate ${args.entryNo} | ${ge.gateType.toUpperCase()} | ref ${ge.refDocNo || '—'} | vehicle ${ge.vehicleNo || '—'}`,
    updates: [{ table: 'gateEntry', id: ge.id, data: { status: 'cleared' } }],
    sideEffects: ['Gate log row flips logged → cleared (the log itself is append-only)'],
    async commit() {
      await db.gateEntry.update({ where: { id: ge.id }, data: { status: 'cleared' } })
      return { id: ge.id, entryNo: ge.entryNo, status: 'cleared' }
    },
  }
}
