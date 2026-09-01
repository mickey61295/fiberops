/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M40 §1 PAY-03/PAY-04 — the supplier bill document + its pass gate.
// planSupplierBill: SB-#### draft from the GRN receipt (lines mirror GRN lines;
// one OPEN bill per GRN — re-billing means cancelling the first bill). The
// tolerance engine runs at CREATION and the verdicts are stored on the bill.
// planBillPass: the REAL bill-pass gate — the only door to status 'passed'
// (find-or-create supplier_bill Approval + verdicts re-derived; block
// severity refuses). Only passed/partial bills are payable (PAY-01/PAY-05).
//
// Honesty rules (§3-T2): process GRNs are jobwork (bill via bill_jobwork);
// sales returns are debit notes — neither is a supplier bill.

import { db } from '@/lib/db'
import { resolveDocNo, activeFinYear } from '../numbering'
import type { DocPlanResult } from './types'
import type { SupplierBillInput, BillPassInput } from '../schemas/supplier-bill'
import { dateOrIstToday } from '@/lib/erp/dates'
import { threeWayMatch, checkGrnVsPo, checkEntryDate, verdictLines, worstSeverity, type Verdict } from '../tolerance'
import { getFlags } from '../flags'

const BILLABLE_GRN_TYPES = ['purchase', 'direct_receipt']

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** Resolve item codes for GRN line ids (masters by itemType — PITFALLS #21 batch lookup). */
async function resolveItemCodes(lines: { itemType: string; itemId: string }[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  const byType = new Map<string, string[]>()
  for (const l of lines) {
    if (!MODEL_BY_ITEM_TYPE[l.itemType]) continue
    const arr = byType.get(l.itemType) ?? []
    arr.push(l.itemId)
    byType.set(l.itemType, arr)
  }
  for (const [itemType, ids] of byType) {
    const rows: any[] = await (db as any)[MODEL_BY_ITEM_TYPE[itemType]].findMany({ where: { id: { in: ids } }, select: { id: true, code: true } })
    for (const r of rows) out.set(`${itemType}:${r.id}`, r.code)
  }
  return out
}

const MODEL_BY_ITEM_TYPE: Record<string, string> = { yarn: 'yarn', fabric: 'fabric', accessory: 'accessory' }

export interface BillVerdictResult {
  verdicts: Verdict[]
  matchStatus: 'matched' | 'variance'
  variance: number
  lines: string[]
  worst: 'ok' | 'warn' | 'block'
}

/** PAY-04 — the shared verdict computation (creation + pass re-derivation). */
export async function computeBillVerdicts(input: {
  poQty?: number
  grnQty?: number
  billQty: number
  poRate?: number
  billRate?: number
  billDate: Date
}): Promise<BillVerdictResult> {
  const verdicts: Verdict[] = []
  verdicts.push(...(await threeWayMatch({
    poQty: input.poQty,
    grnQty: input.grnQty,
    billQty: input.billQty,
    poRate: input.poRate,
    billRate: input.billRate,
  })).verdicts)
  // grn_bal/grn_dev/grn_alladd — the GRN-vs-PO retrospective leg (bill time):
  // what was received vs what was ordered. A GRN over-receipt shows here too.
  if (input.poQty != null && input.poQty > 0 && input.grnQty != null) {
    verdicts.push(...(await checkGrnVsPo(input.poQty, input.grnQty)))
  }
  verdicts.push(...(await checkEntryDate(input.billDate)))
  const grnQty = input.grnQty ?? 0
  const variance = grnQty > 0 ? round2(((input.billQty - grnQty) / grnQty) * 100) : 0
  const matched = verdicts.every((v) => v.severity === 'ok')
  return {
    verdicts,
    matchStatus: matched ? 'matched' : 'variance',
    variance,
    lines: verdictLines(verdicts),
    worst: worstSeverity(verdicts),
  }
}

export async function planSupplierBill(args: SupplierBillInput): Promise<DocPlanResult> {
  const grn = await db.gRN.findUnique({ where: { grnNo: args.grnNo }, include: { lines: true } })
  if (!grn) return { ok: false, error: `GRN ${args.grnNo} not found` }
  if (!BILLABLE_GRN_TYPES.includes(grn.grnType)) {
    return {
      ok: false,
      error: `GRN ${grn.grnNo} is grnType '${grn.grnType}' — supplier bills cover purchase receipts. Process/jobwork receipts bill via bill_jobwork; sales returns are debit notes.`,
    }
  }
  // one OPEN bill per GRN (guard, not schema — PAY-03 §2.5)
  const existing = await db.supplierBill.findFirst({ where: { grnId: grn.id, status: { not: 'cancelled' } } })
  if (existing) {
    return { ok: false, error: `GRN ${grn.grnNo} already has supplier bill ${existing.billNo} (${existing.status}) — cancel it before re-billing` }
  }

  // lines: defaults = ALL GRN lines; overrides subset by itemCode
  const codeMap = await resolveItemCodes(grn.lines)
  const grnLines = grn.lines.map((l) => ({
    grnLineId: l.id, itemType: l.itemType, itemId: l.itemId,
    itemCode: codeMap.get(`${l.itemType}:${l.itemId}`) ?? '—',
    uomId: l.uomId, qty: l.qty, rate: l.rate,
  }))
  const overrides = args.lines ?? []
  for (const o of overrides) {
    if (!grnLines.some((l) => l.itemCode === o.itemCode)) {
      return { ok: false, error: `Line ${o.itemCode} is not on GRN ${grn.grnNo} — its items are: ${grnLines.map((l) => l.itemCode).join(', ')}` }
    }
  }
  const lines = grnLines.map((l) => {
    const o = overrides.find((x) => x.itemCode === l.itemCode)
    return o ? { ...l, qty: o.qty ?? l.qty, rate: o.rate ?? l.rate } : l
  }).map((l) => ({ ...l, amount: round2(l.qty * l.rate) }))

  const taxableValue = round2(lines.reduce((s, l) => s + l.amount, 0))
  const gstRate = args.gstRate ?? 18
  const isIgst = args.gstType === 'igst'
  const half = Math.round(((taxableValue * gstRate) / 100 / 2) * 100) / 100
  const cgstRate = isIgst ? 0 : gstRate
  const sgstRate = isIgst ? 0 : gstRate
  const igstRate = isIgst ? gstRate : 0
  const cgstAmt = isIgst ? 0 : half
  const sgstAmt = isIgst ? 0 : half
  const igstAmt = isIgst ? Math.round((taxableValue * gstRate / 100) * 100) / 100 : 0
  const billAmount = round2(taxableValue + cgstAmt + sgstAmt + igstAmt)

  // PAY-04 — tolerance engine (fresh flags; stored at commit)
  const po = grn.poId ? await db.purchaseOrder.findUnique({ where: { id: grn.poId }, include: { lines: true } }) : null
  const poQty = po ? po.lines.reduce((s, l) => s + l.qty, 0) : undefined
  const poRate = po && poQty ? po.lines.reduce((s, l) => s + l.amount, 0) / poQty : undefined
  const grnQty = grn.lines.length ? grn.lines.reduce((s, l) => s + l.qty, 0) : grn.totalQty
  const billQty = lines.reduce((s, l) => s + l.qty, 0)
  const billRate = billQty > 0 ? taxableValue / billQty : undefined
  const billDate = dateOrIstToday(args.billDate)
  const v = await computeBillVerdicts({ poQty, grnQty, billQty, poRate, billRate, billDate })

  // PAY-04 — TDS default from the flag (the flag finally has a consumer)
  const flags = await getFlags(['tds_default_percent'])
  const tdsPercent = args.tdsPercent ?? Number(flags.tds_default_percent ?? 0)
  const netPayable = round2(billAmount * (1 - tdsPercent / 100))

  const billNo = await resolveDocNo('supplierBill', 'billNo', 'SB-', args.billNo)
  const fy = await activeFinYear()
  const party = await db.party.findUnique({ where: { id: grn.partyId } })

  return {
    ok: true,
    text: `Proposed supplier bill ${billNo} from GRN ${grn.grnNo}: ₹${taxableValue} + GST ₹${round2(cgstAmt + sgstAmt + igstAmt)} = ₹${billAmount} (${v.matchStatus}).`,
    summary: `Supplier bill ${billNo} | ${party?.name ?? 'supplier'} | GRN ${grn.grnNo}${po ? ` | PO ${po.poNo}` : ''} | taxable ₹${taxableValue} | GST ${gstRate}% ${isIgst ? 'IGST' : 'CGST+SGST'} | bill ₹${billAmount} | TDS ${tdsPercent}% (net ₹${netPayable}) | status draft`,
    creates: [
      {
        table: 'supplierBill',
        data: {
          billNo, partyId: grn.partyId, grnId: grn.id, poId: grn.poId ?? null, billDate, finYear: fy,
          taxableValue, cgstRate, sgstRate, igstRate, cgstAmt, sgstAmt, igstAmt, roundOff: 0, billAmount,
          dueDate: args.dueDate ? dateOrIstToday(args.dueDate) : null, tdsPercent,
          status: 'draft', matchStatus: v.matchStatus, matchVariance: v.variance, matchVerdicts: JSON.stringify(v.verdicts),
          notes: args.notes,
          lines: { create: lines.map((l) => ({ grnLineId: l.grnLineId, itemType: l.itemType, itemId: l.itemId, itemCode: l.itemCode, uomId: l.uomId, qty: l.qty, rate: l.rate, amount: l.amount })) },
        },
      },
    ],
    sideEffects: [
      ...v.lines.map((l) => `Tolerance: ${l}`),
      `Status draft — NOT payable until passed (create_bill_pass / the Bill Pass queue)`,
      `TDS @${tdsPercent}% (tds_default_percent flag) — net payable ₹${netPayable}`,
      'AP picks the bill up only after the pass gate (PAY-05 honest payable)',
    ],
    async commit() {
      return await db.$transaction(async (tx) => {
        const bill = await tx.supplierBill.create({
          data: {
            billNo, partyId: grn.partyId, grnId: grn.id, poId: grn.poId ?? null, billDate, finYear: fy,
            taxableValue, cgstRate, sgstRate, igstRate, cgstAmt, sgstAmt, igstAmt, otherCharges: 0, roundOff: 0, billAmount,
            dueDate: args.dueDate ? dateOrIstToday(args.dueDate) : null, tdsPercent,
            status: 'draft', matchStatus: v.matchStatus, matchVariance: v.variance, matchVerdicts: JSON.stringify(v.verdicts),
            notes: args.notes,
            lines: { create: lines.map((l) => ({ grnLineId: l.grnLineId, itemType: l.itemType, itemId: l.itemId, itemCode: l.itemCode, uomId: l.uomId, qty: l.qty, rate: l.rate, amount: l.amount })) },
          },
          include: { lines: true },
        })
        return { id: bill.id, billNo: bill.billNo, status: bill.status, matchStatus: bill.matchStatus, billAmount: bill.billAmount }
      })
    },
  }
}

// ───────────── PAY-03 — the REAL bill-pass gate (draft → passed) ─────────────

export async function planBillPass(args: BillPassInput, actor?: { email?: string }): Promise<DocPlanResult> {
  const bill = await db.supplierBill.findUnique({ where: { billNo: args.billNo }, include: { lines: true } })
  if (!bill) return { ok: false, error: `Supplier bill ${args.billNo} not found (SB-#### — create one via create_supplier_bill)` }
  if (bill.status === 'cancelled') return { ok: false, error: `Supplier bill ${args.billNo} is cancelled` }
  if (bill.status !== 'draft') return { ok: false, error: `Supplier bill ${args.billNo} is already ${bill.status} — nothing to pass` }
  const party = await db.party.findUnique({ where: { id: bill.partyId } })
  const grn = bill.grnId ? await db.gRN.findUnique({ where: { id: bill.grnId }, include: { lines: true } }) : null

  // PAY-04 — verdicts re-derived at the gate (fresh flags; deterministic re-plan)
  const po = bill.poId ? await db.purchaseOrder.findUnique({ where: { id: bill.poId }, include: { lines: true } }) : null
  const poQty = po ? po.lines.reduce((s, l) => s + l.qty, 0) : undefined
  const poRate = po && poQty ? po.lines.reduce((s, l) => s + l.amount, 0) / poQty : undefined
  const grnQty = grn ? (grn.lines.length ? grn.lines.reduce((s, l) => s + l.qty, 0) : grn.totalQty) : undefined
  const billQty = bill.lines.reduce((s, l) => s + l.qty, 0)
  const billRate = billQty > 0 ? bill.taxableValue / billQty : undefined
  const v = await computeBillVerdicts({ poQty, grnQty, billQty, poRate, billRate, billDate: bill.billDate })
  if (v.worst === 'block') {
    return {
      ok: false,
      error: `Bill pass REFUSED — tolerance BLOCK: ${v.verdicts.filter((x) => x.severity === 'block').map((x) => x.message).join('; ')}. Fix the bill (cancel + re-enter with correct qty/rate) or adjust the admin tolerance flags.`,
    }
  }

  const existing = await db.approval.findFirst({ where: { entity: 'supplier_bill', entityId: bill.id }, orderBy: { createdAt: 'desc' } })
  if (existing?.status === 'rejected') {
    return { ok: false, error: `Bill pass for ${args.billNo} was rejected — re-enter the bill to re-open it` }
  }
  const willCreate = !existing
  const approvedBy = actor?.email ?? 'agent'
  const netPayable = round2(bill.billAmount * (1 - (bill.tdsPercent ?? 0) / 100))

  return {
    ok: true,
    text: `Proposed bill pass ${bill.billNo}: ₹${bill.billAmount} becomes payable (net ₹${netPayable} after TDS) — ${v.matchStatus}.`,
    summary: `Bill pass ${bill.billNo} | ${party?.name ?? 'supplier'}${grn ? ` | GRN ${grn.grnNo}` : ''}${po ? ` | PO ${po.poNo}` : ''} | ₹${bill.billAmount} | TDS ${bill.tdsPercent ?? 0}% (net ₹${netPayable}) | ${v.matchStatus} | status → passed`,
    creates: willCreate ? [{ table: 'approval', data: { entity: 'supplier_bill', entityId: bill.id, step: 1, requestedBy: 'agent', status: 'pending' } }] : undefined,
    updates: [
      { table: 'approval', id: existing?.id ?? '<new>', data: { status: 'approved', approvedBy, approvedAt: new Date(), comments: args.comments } },
      { table: 'supplierBill', id: bill.id, data: { status: 'passed', matchStatus: v.matchStatus, matchVariance: v.variance, matchVerdicts: JSON.stringify(v.verdicts) } },
    ],
    sideEffects: [
      ...v.lines.map((l) => `Tolerance: ${l}`),
      `${bill.billNo} becomes PAYABLE — AP (chain money) + out-payment allocation source`,
      `TDS @${bill.tdsPercent ?? 0}% — net payable ₹${netPayable} (PAY-04 flag consumer)`,
      'Approval audit trail records the pass decision',
    ],
    async commit() {
      return await db.$transaction(async (tx) => {
        let row = existing
        if (!row) {
          row = await tx.approval.create({ data: { entity: 'supplier_bill', entityId: bill.id, step: 1, requestedBy: 'agent', status: 'pending' } })
        }
        const updated = await tx.approval.update({
          where: { id: row.id },
          data: { status: 'approved', approvedBy, approvedAt: new Date(), comments: args.comments },
        })
        const passed = await tx.supplierBill.update({
          where: { id: bill.id },
          data: { status: 'passed', matchStatus: v.matchStatus, matchVariance: v.variance, matchVerdicts: JSON.stringify(v.verdicts) },
        })
        return { id: updated.id, entity: 'supplier_bill', entityId: bill.id, ref: bill.billNo, status: updated.status, billNo: passed.billNo, billStatus: passed.status, matchStatus: passed.matchStatus }
      })
    },
  }
}
