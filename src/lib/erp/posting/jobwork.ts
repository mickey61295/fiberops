/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M3 §5 rows 6-7 — jobwork out/in services. Logic extracted VERBATIM from
// tools.ts. Ledger effects: process_delivery OUT (Wave D upgrade target),
// process_receipt IN — the CURRENT tools are document-only (jobworkOrder row,
// no stock movement); preserved exactly.

import { db } from '@/lib/db'
import { postLedger } from './ledger'
import { resolveDocNo } from '../numbering'
import type { DocPlanResult } from './types'
import type { JobworkOutInput, JobworkInInput } from '../schemas/jobwork'
import type { MaterialDcInput } from '../schemas/dispatch-variants'
import { dateOrIstToday } from '@/lib/erp/dates'

export async function planJobworkOut(args: JobworkOutInput): Promise<DocPlanResult> {
  const party = await db.party.findUnique({ where: { code: args.jobworkerCode } })
  if (!party) return { ok: false, error: `Party ${args.jobworkerCode} not found` }
  let order: any = null
  if (args.orderNo) {
    order = await db.order.findUnique({ where: { orderNo: args.orderNo } })
    if (!order) return { ok: false, error: `Order ${args.orderNo} not found` }
  }
  const resolvedDcNo = await (async () => {
    const desired = args.dcNo?.trim()
    if (desired) {
      const exists = await db.jobworkOrder.findUnique({ where: { dcNo: desired } }).catch(() => null)
      if (!exists) return desired
    }
    const all = await db.jobworkOrder.findMany({ where: { dcNo: { startsWith: 'JW-' } } })
    const used = new Set(all.map((j) => j.dcNo))
    let n = 1
    while (used.has(`JW-${String(n).padStart(4, '0')}`)) n++
    return `JW-${String(n).padStart(4, '0')}`
  })()
  const totalValue = args.totalValue ?? 0
  return {
    ok: true,
    text: `Proposed jobwork DC ${resolvedDcNo} → ${party.name} (${args.processType}), ${args.totalQty} units, ₹${totalValue}.`,
    summary: `Create jobwork DC ${resolvedDcNo} | ${party.name} | ${args.processType} | ${args.totalQty} units | ₹${totalValue} | expected in ${args.expectedInDate || '-'}`,
    creates: [{ table: 'jobworkOrder', data: { dcNo: resolvedDcNo, jobworkerId: party.id, processType: args.processType, totalQty: args.totalQty, totalValue, orderId: order?.id, expectedInDate: args.expectedInDate ? new Date(args.expectedInDate) : null, outDate: dateOrIstToday(args.outDate), status: 'sent' } }],
    sideEffects: ['Material leaves main godown', 'Pending receipt at jobworker', 'ITC-04 line generated'],
    async commit() {
      const j = await db.jobworkOrder.create({ data: { dcNo: resolvedDcNo, jobworkerId: party.id, processType: args.processType, totalQty: args.totalQty, totalValue, orderId: order?.id, expectedInDate: args.expectedInDate ? new Date(args.expectedInDate) : null, outDate: dateOrIstToday(args.outDate), status: 'sent' } })
      return { id: j.id, dcNo: j.dcNo }
    },
  }
}

export async function planJobworkIn(args: JobworkInInput): Promise<DocPlanResult> {
  const jw = await db.jobworkOrder.findUnique({ where: { dcNo: args.dcNo } })
  if (!jw) return { ok: false, error: `Jobwork DC ${args.dcNo} not found` }
  if (jw.status === 'received') return { ok: false, error: `Already received on ${jw.receivedDate}` }
  return {
    ok: true,
    text: `Proposed receipt of jobwork ${args.dcNo} — ${args.receivedQty || jw.totalQty} units.`,
    summary: `Receive jobwork DC ${args.dcNo} | qty ${args.receivedQty || jw.totalQty} | date ${args.receivedDate || 'today'}`,
    updates: [{ table: 'jobworkOrder', id: jw.id, data: { status: 'received', receivedDate: dateOrIstToday(args.receivedDate), totalQty: args.receivedQty ?? jw.totalQty } }],
    sideEffects: ['Material back in main godown', 'Jobwork cost booked'],
    async commit() {
      await db.jobworkOrder.update({ where: { id: jw.id }, data: { status: 'received', receivedDate: dateOrIstToday(args.receivedDate), totalQty: args.receivedQty ?? jw.totalQty } })
      return { id: jw.id, dcNo: jw.dcNo }
    },
  }
}

// ───────── SPEC-M6 §7-D-1 (Wave D) — material DCs (§4 rule-2 sibling) ─────────

/** FrmFabDel / FrmAccDel / FrmGenDC / FrmYarnDel + frmPrsDelMulti — the
 *  generalized material DC serving BOTH Wave D doors:
 *    dc-entry   (MDC-####): single material line via itemType/itemCode/qty
 *    process-dc (PDC-####): multi-component lines[] (process delivery challan)
 *  ONE create_dc tool feeds both. Creates the JobworkOrder row (the DC
 *  document — party ANY type, processType optional default 'general') and
 *  posts StockLedger process_delivery OUT per line (legacy DC TrType 1 (P) →
 *  CurrentStock −). planJobworkOut/In stay VERBATIM (§4 rule 1). */
export async function planMaterialDc(args: MaterialDcInput): Promise<DocPlanResult> {
  const party = await db.party.findUnique({ where: { code: args.partyCode } })
  if (!party) return { ok: false, error: `Party ${args.partyCode} not found` }
  const godownCode = args.godownCode?.trim() || 'G1'
  const godown = await db.godown.findUnique({ where: { code: godownCode } })
  if (!godown) return { ok: false, error: `Godown ${godownCode} not found` }

  // lines[] present → the PDC (multi-component) door; else the single-material MDC door
  const rawLines = args.lines?.length
    ? args.lines
    : args.itemType && args.itemCode && args.qty
      ? [{ itemType: args.itemType, itemCode: args.itemCode, qty: args.qty, rate: args.rate }]
      : []
  if (rawLines.length === 0) {
    return { ok: false, error: 'Provide either lines[] (multi-component DC) or itemType + itemCode + qty (single material)' }
  }

  const ITEM_MODELS: Record<string, string> = { yarn: 'yarn', fabric: 'fabric', accessory: 'accessory' }
  const UOM: Record<string, string> = { yarn: 'kgs', fabric: 'kgs', accessory: 'pcs' }
  const resolved: Array<{ itemType: 'yarn' | 'fabric' | 'accessory'; itemId: string; code: string; qty: number; rate: number; uom: string }> = []
  for (const l of rawLines) {
    const model = ITEM_MODELS[l.itemType]
    const item = model ? await (db as any)[model].findUnique({ where: { code: l.itemCode } }) : null
    if (!item) return { ok: false, error: `${l.itemType} ${l.itemCode} not found` }
    resolved.push({ itemType: l.itemType, itemId: item.id, code: l.itemCode, qty: l.qty, rate: l.rate ?? 0, uom: UOM[l.itemType] })
  }

  const isMulti = (args.lines?.length ?? 0) > 0
  const dcNo = await resolveDocNo('jobworkOrder', 'dcNo', isMulti ? 'PDC-' : 'MDC-', args.dcNo)
  const dcDate = dateOrIstToday(args.dcDate)
  const processType = args.processType?.trim() || 'general'
  const totalQty = resolved.reduce((s, l) => s + l.qty, 0)
  const totalValue = resolved.reduce((s, l) => s + l.qty * l.rate, 0)
  const notes = args.notes?.trim() || `${isMulti ? 'Multi-component' : 'Material'} DC to ${party.name}`

  return {
    ok: true,
    text: `Proposed material DC ${dcNo} → ${party.name} (${processType}), ${resolved.length} line(s), ${totalQty} units out of ${godown.code}.`,
    summary: `Material DC ${dcNo} | ${party.name} | ${processType} | ${resolved.length} line(s) | ${totalQty} units | out of ${godown.code} | ₹${totalValue}`,
    creates: [
      { table: 'jobworkOrder', data: { dcNo, jobworkerId: party.id, processType, totalQty, totalValue, outDate: dcDate, status: 'sent' } },
      ...resolved.map((l) => ({
        table: 'stockLedger',
        data: { txnType: 'process_delivery', itemType: l.itemType, itemId: l.itemId, godownId: godown.id, docNo: dcNo, docDate: dcDate, outKgs: l.uom === 'kgs' ? l.qty : 0, outPcs: l.uom === 'pcs' ? l.qty : 0, rate: l.rate, partyId: party.id, notes: `${l.code} — ${notes}` },
      })),
    ],
    sideEffects: [
      `StockLedger: ${resolved.length} process_delivery rows OUT of ${godown.code} (material to ${party.name})`,
      'Pending receipt at the party (ITC-04 line generated)',
      'Party ledger will reflect the delivery',
    ],
    async commit() {
      return await db.$transaction(async (tx) => {
        const j = await tx.jobworkOrder.create({
          data: { dcNo, jobworkerId: party.id, processType, totalQty, totalValue, outDate: dcDate, status: 'sent' },
        })
        for (const l of resolved) {
          await postLedger(tx, {
            txnType: 'process_delivery', itemType: l.itemType, itemId: l.itemId,
            godownId: godown.id, docNo: dcNo, docDate: dcDate, partyId: party.id,
            out: l.uom === 'kgs' ? { kgs: l.qty } : { pcs: l.qty },
            rate: l.rate, notes: `${l.code} — ${notes}`,
          })
        }
        return { id: j.id, dcNo: j.dcNo, lines: resolved.length }
      })
    },
  }
}
