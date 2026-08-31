/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M3 §5 rows 6-7 — jobwork out/in services (logic extracted VERBATIM from
// tools.ts in Wave A). SPEC-M39 (Phase-6B Batch 3) — the jobwork loop closes:
//   JWL-01  JW- out creates JobworkLine rows (item, qty, uom, rate + cumulative
//           received/rejected/returned mirrors); the doc view + register show
//           sent vs received per line.
//   JWL-02  JW- out WITH lines posts process_delivery OUT of the issuing godown
//           (default G1) with partyId + writes a REAL itc04Line. Header-only
//           out stays document-only with HONEST sideEffects (no phantom claims).
//   JWL-03  planJobworkIn is cumulative (receivedQty += qty, NEVER overwrite —
//           the M3 bug destroyed sent-vs-received truth on first receipt),
//           partial-aware (sent → partial → received), over-receipt rejected
//           with the balance, rejectedQty supported.
//   JWL-08  G3 'Jobworker Yard' is WIRED as the WIP-at-jobworker godown: the
//           JW- out posts G1 OUT + G3 IN (partyId = jobworker); GAN acceptance
//           and DC returns post G3 OUT — WIP at the jobworker is queryable stock.
//   JWL-09  allotmentNo (AL-####) links the DC to its contract (allotmentId
//           plain FK) and flips the AL- row 'allotted' → 'issued';
//           checkProcessLoss is wired on receipt (dyeing/knitting tolerance) —
//           over-tolerance loss flags and prompts a rejection entry.

import { db } from '@/lib/db'
import { postLedger } from './ledger'
import { resolveDocNo } from '../numbering'
import type { DocPlanResult } from './types'
import type { JobworkOutInput, JobworkInInput } from '../schemas/jobwork'
import type { MaterialDcInput } from '../schemas/dispatch-variants'
import { dateOrIstToday, istDateStr } from '@/lib/erp/dates'
import { activeFinYear } from '../numbering'
import { checkProcessLoss } from '../tolerance'

const ITEM_MODELS: Record<string, string> = { yarn: 'yarn', fabric: 'fabric', accessory: 'accessory' }
const UOM: Record<string, string> = { yarn: 'kgs', fabric: 'kgs', accessory: 'pcs' }

/** JWL-09 — processType → legacy dept process code (tolerance.ts contract:
 *  dyeing = 2, knitting = 4/-4; other processes carry no loss flag). */
const PROCESS_LOSS_DEPT: Record<string, number> = { dyeing: 2, knitting: 4 }

type ResolvedLine = {
  itemType: 'yarn' | 'fabric' | 'accessory'
  itemId: string
  itemCode: string
  qty: number
  rate: number
  uom: string
}

async function resolveMaterialLine(l: { itemType: string; itemCode: string; qty: number; rate?: number }): Promise<ResolvedLine | { error: string }> {
  const model = ITEM_MODELS[l.itemType]
  const item = model ? await (db as any)[model].findUnique({ where: { code: l.itemCode } }) : null
  if (!item) return { error: `${l.itemType} ${l.itemCode} not found` }
  return { itemType: l.itemType as ResolvedLine['itemType'], itemId: item.id, itemCode: l.itemCode, qty: l.qty, rate: l.rate ?? 0, uom: UOM[l.itemType] }
}

export async function planJobworkOut(args: JobworkOutInput): Promise<DocPlanResult> {
  const party = await db.party.findUnique({ where: { code: args.jobworkerCode } })
  if (!party) return { ok: false, error: `Party ${args.jobworkerCode} not found` }
  let order: any = null
  if (args.orderNo) {
    order = await db.order.findUnique({ where: { orderNo: args.orderNo } })
    if (!order) return { ok: false, error: `Order ${args.orderNo} not found` }
  }

  // JWL-09 — the AL-#### contract this DC fulfills
  let allotment: any = null
  if (args.allotmentNo?.trim()) {
    allotment = await db.jobworkOrder.findUnique({ where: { dcNo: args.allotmentNo.trim() } })
    if (!allotment) return { ok: false, error: `Allotment ${args.allotmentNo} not found (expected an AL-#### contract)` }
    if (!allotment.dcNo.startsWith('AL-')) return { ok: false, error: `${allotment.dcNo} is not an allotment (AL-#### expected)` }
    if (allotment.status !== 'allotted') return { ok: false, error: `Allotment ${allotment.dcNo} is ${allotment.status} — only an 'allotted' contract can be issued` }
    if (allotment.jobworkerId !== party.id) {
      const alParty = await db.party.findUnique({ where: { id: allotment.jobworkerId } })
      return { ok: false, error: `Allotment ${allotment.dcNo} belongs to ${alParty?.code ?? 'another jobworker'} — issue the DC to the same party` }
    }
  }

  // JWL-01/02 — material lines: present → the stock-posting door
  const resolved: ResolvedLine[] = []
  for (const l of args.lines ?? []) {
    const r = await resolveMaterialLine(l)
    if ('error' in r) return { ok: false, error: r.error }
    resolved.push(r)
  }
  if (resolved.length === 0 && !(args.totalQty && args.totalQty > 0)) {
    return { ok: false, error: 'Provide either lines[] (material DC with stock posting) or totalQty (header-only DC)' }
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

  const totalQty = resolved.length > 0 ? resolved.reduce((s, l) => s + l.qty, 0) : args.totalQty ?? 0
  const totalValue = args.totalValue ?? (resolved.length > 0 ? resolved.reduce((s, l) => s + l.qty * l.rate, 0) : 0)
  const outDate = dateOrIstToday(args.outDate)

  const godownCode = args.godownCode?.trim() || 'G1'
  const godown = resolved.length > 0 ? await db.godown.findUnique({ where: { code: godownCode } }) : null
  if (resolved.length > 0 && !godown) return { ok: false, error: `Godown ${godownCode} not found` }
  const g3 = resolved.length > 0 ? await db.godown.findUnique({ where: { code: 'G3' } }) : null // JWL-08 — Jobworker Yard

  const fy = await activeFinYear()
  // JWL-02 — a REAL ITC-04 line (the register/report reads it; the claim retires)
  const itc04Line = resolved.length > 0
    ? `ITC04 ${fy} | ${resolvedDcNo} | ${party.name} | ${totalQty} ${resolved.every((l) => l.uom === 'pcs') ? 'pcs' : 'kgs'} out | ${istDateStr(outDate)}`
    : null

  const creates: any[] = [
    { table: 'jobworkOrder', data: { dcNo: resolvedDcNo, jobworkerId: party.id, processType: args.processType, totalQty, totalValue, orderId: order?.id ?? null, expectedInDate: args.expectedInDate ? new Date(args.expectedInDate) : null, outDate, status: 'sent', itc04Line, allotmentId: allotment?.id ?? null } },
    ...resolved.map((l) => ({ table: 'jobworkLine', data: { itemType: l.itemType, itemId: l.itemId, itemCode: l.itemCode, uom: l.uom, qty: l.qty, rate: l.rate } })),
    ...resolved.map((l) => ({
      table: 'stockLedger',
      data: { txnType: 'process_delivery', itemType: l.itemType, itemId: l.itemId, godownId: godown!.id, docNo: resolvedDcNo, docDate: outDate, outKgs: l.uom === 'kgs' ? l.qty : 0, outPcs: l.uom === 'pcs' ? l.qty : 0, rate: l.rate, partyId: party.id, notes: `JW out ${l.itemCode}` },
    })),
    ...(g3 && resolved.length > 0 ? resolved.map((l) => ({
      table: 'stockLedger',
      data: { txnType: 'process_delivery', itemType: l.itemType, itemId: l.itemId, godownId: g3.id, docNo: resolvedDcNo, docDate: outDate, inKgs: l.uom === 'kgs' ? l.qty : 0, inPcs: l.uom === 'pcs' ? l.qty : 0, rate: l.rate, partyId: party.id, notes: `WIP at jobworker ${party.name} (G3)` },
    })) : []),
  ]

  const sideEffects = resolved.length > 0
    ? [
        `StockLedger: ${resolved.length} process_delivery rows OUT of ${godown!.code} (material to ${party.name})`,
        ...(g3 ? [`G3 'Jobworker Yard' WIP +${totalQty} (queryable stock at the jobworker — JWL-08)`] : []),
        `ITC-04 line written: ${itc04Line}`,
        'Pending receipt at jobworker — receive via receive_jobwork (cumulative), then GAN-accept (accept_jobwork_pcs) to move stock into G2',
        ...(allotment ? [`Allotment ${allotment.dcNo} flips to 'issued'`] : []),
      ]
    : [
        'Header-only DC — NO stock moves (pass lines[] to post material out of a godown)',
        'Pending receipt at jobworker',
        ...(allotment ? [`Allotment ${allotment.dcNo} flips to 'issued'`] : []),
      ]

  return {
    ok: true,
    text: `Proposed jobwork DC ${resolvedDcNo} → ${party.name} (${args.processType}), ${totalQty} units${resolved.length > 0 ? `, ${resolved.length} line(s) out of ${godown!.code}` : ''}.`,
    summary: `Create jobwork DC ${resolvedDcNo} | ${party.name} | ${args.processType} | ${totalQty} units | ₹${totalValue} | expected in ${args.expectedInDate || '-'}${allotment ? ` | fulfills ${allotment.dcNo}` : ''}`,
    creates,
    updates: allotment ? [{ table: 'jobworkOrder', id: allotment.id, data: { status: 'issued' } }] : undefined,
    sideEffects,
    async commit() {
      return await db.$transaction(async (tx) => {
        const j = await tx.jobworkOrder.create({
          data: { dcNo: resolvedDcNo, jobworkerId: party.id, processType: args.processType, totalQty, totalValue, orderId: order?.id ?? null, expectedInDate: args.expectedInDate ? new Date(args.expectedInDate) : null, outDate, status: 'sent', itc04Line, allotmentId: allotment?.id ?? null, lines: { create: resolved.map((l) => ({ itemType: l.itemType, itemId: l.itemId, itemCode: l.itemCode, uom: l.uom, qty: l.qty, rate: l.rate })) } },
        })
        for (const l of resolved) {
          await postLedger(tx, {
            txnType: 'process_delivery', itemType: l.itemType, itemId: l.itemId,
            godownId: godown!.id, docNo: resolvedDcNo, docDate: outDate, partyId: party.id,
            out: l.uom === 'kgs' ? { kgs: l.qty } : { pcs: l.qty },
            rate: l.rate, notes: `JW out ${l.itemCode} — ${party.name}`,
          })
          if (g3) {
            await postLedger(tx, {
              txnType: 'process_delivery', itemType: l.itemType, itemId: l.itemId,
              godownId: g3.id, docNo: resolvedDcNo, docDate: outDate, partyId: party.id,
              in: l.uom === 'kgs' ? { kgs: l.qty } : { pcs: l.qty },
              rate: l.rate, notes: `WIP at jobworker ${party.name} (G3) — ${l.itemCode}`,
            })
          }
        }
        if (allotment) {
          await tx.jobworkOrder.update({ where: { id: allotment.id }, data: { status: 'issued' } })
        }
        return { id: j.id, dcNo: j.dcNo, lines: resolved.length }
      })
    },
  }
}

/** JWL-03 — cumulative, partial-aware receipt. receivedQty += qty (NEVER
 *  overwrite); status sent → partial → received; over-receipt rejected with
 *  the open balance; rejectedQty books as process loss (JWL-09 verdicts ride
 *  the plan when the process carries a loss flag). */
export async function planJobworkIn(args: JobworkInInput): Promise<DocPlanResult> {
  const jw = await db.jobworkOrder.findUnique({ where: { dcNo: args.dcNo }, include: { lines: true } })
  if (!jw) return { ok: false, error: `Jobwork DC ${args.dcNo} not found` }
  if (['received', 'accepted', 'billed'].includes(jw.status)) {
    return { ok: false, error: `Already received on ${jw.receivedDate ? istDateStr(new Date(jw.receivedDate)) : '-'} (status ${jw.status})` }
  }

  const sentTotal = jw.totalQty
  const openBalance = sentTotal - jw.receivedQty - jw.rejectedQty

  // Per-line distribution: explicit lines[] win; else the header qty spreads
  // across lines proportionally to sent qty (header-only DCs keep the header math).
  const lineReceipts: Array<{ line: any; qty: number; rejected: number }> = []
  if (jw.lines.length > 0 && args.lines?.length) {
    for (const r of args.lines) {
      const line = jw.lines.find((l) => l.itemCode === r.itemCode)
      if (!line) return { ok: false, error: `Line ${r.itemCode} is not on DC ${jw.dcNo} (lines: ${jw.lines.map((l) => l.itemCode).join(', ')})` }
      const open = line.qty - line.receivedQty - line.rejectedQty
      if (r.qty + (r.rejectedQty ?? 0) > open + 1e-9) {
        return { ok: false, error: `Line ${r.itemCode}: receiving ${r.qty + (r.rejectedQty ?? 0)} exceeds the open balance ${Math.round(open * 100) / 100} (sent ${line.qty}, received ${line.receivedQty}, rejected ${line.rejectedQty})` }
      }
      lineReceipts.push({ line, qty: r.qty, rejected: r.rejectedQty ?? 0 })
    }
    const covered = lineReceipts.reduce((s, r) => s + r.qty + r.rejected, 0)
    if (covered > openBalance + 1e-9) {
      return { ok: false, error: `Receipt ${covered} exceeds the DC open balance ${Math.round(openBalance * 100) / 100} (sent ${sentTotal}, received ${jw.receivedQty}, rejected ${jw.rejectedQty})` }
    }
  } else {
    const qty = args.receivedQty ?? Math.max(0, openBalance)
    const rejected = args.rejectedQty ?? 0
    if (qty + rejected > openBalance + 1e-9) {
      return { ok: false, error: `Receipt ${qty + rejected} exceeds the open balance ${Math.round(openBalance * 100) / 100} (sent ${sentTotal}, received ${jw.receivedQty}, rejected ${jw.rejectedQty})` }
    }
    if (jw.lines.length > 0) {
      // proportional spread across open lines
      let allocated = 0
      const openLines = jw.lines.filter((l) => l.qty - l.receivedQty - l.rejectedQty > 0)
      const openSum = openLines.reduce((s, l) => s + (l.qty - l.receivedQty - l.rejectedQty), 0)
      for (let i = 0; i < openLines.length; i++) {
        const l = openLines[i]
        const share = i === openLines.length - 1 ? qty + rejected - allocated : Math.round(((qty + rejected) * (l.qty - l.receivedQty - l.rejectedQty)) / openSum * 100) / 100
        allocated += share
        const rej = Math.min(share, Math.round((rejected * share) / (qty + rejected || 1) * 100) / 100)
        lineReceipts.push({ line: l, qty: share - rej, rejected: rej })
      }
    }
  }

  const headerQty = lineReceipts.length > 0 ? lineReceipts.reduce((s, r) => s + r.qty, 0) : (args.receivedQty ?? Math.max(0, openBalance))
  const headerRejected = lineReceipts.length > 0 ? lineReceipts.reduce((s, r) => s + r.rejected, 0) : (args.rejectedQty ?? 0)
  const newReceived = jw.receivedQty + headerQty
  const newRejected = jw.rejectedQty + headerRejected
  const balance = sentTotal - newReceived - newRejected
  const status = balance <= 1e-9 ? 'received' : newReceived + newRejected > 0 ? 'partial' : jw.status

  // JWL-09 — process-loss tolerance on the CUMULATIVE kgs (dyeing/knitting)
  const deptPrs = PROCESS_LOSS_DEPT[jw.processType.toLowerCase()] ?? null
  const sentKgs = jw.lines.length > 0 ? jw.lines.filter((l) => l.uom === 'kgs').reduce((s, l) => s + l.qty, 0) : sentTotal
  const receivedKgs = jw.lines.length > 0
    ? jw.lines.filter((l) => l.uom === 'kgs').reduce((s, l) => {
        const add = lineReceipts.find((r) => r.line.id === l.id)
        return s + l.receivedQty + (add ? add.qty : 0)
      }, 0)
    : newReceived
  const verdicts = deptPrs != null && sentKgs > 0 ? await checkProcessLoss(deptPrs, sentKgs, receivedKgs) : []
  const lossVerdict = verdicts.find((v) => v.severity === 'warn')

  const updatesData: any = {
    status,
    receivedDate: dateOrIstToday(args.receivedDate),
    receivedQty: newReceived,
    rejectedQty: newRejected,
    ...(lineReceipts.length > 0
      ? {}
      : {}),
  }
  const updates: any[] = [{ table: 'jobworkOrder', id: jw.id, data: updatesData }]
  for (const r of lineReceipts) {
    updates.push({ table: 'jobworkLine', id: r.line.id, data: { receivedQty: r.line.receivedQty + r.qty, rejectedQty: r.line.rejectedQty + r.rejected } })
  }

  const lossText = verdicts.length > 0
    ? ` · process loss ${verdicts[0].value}% (limit ${verdicts[0].limit}%)`
    : ''

  return {
    ok: true,
    text: `Proposed receipt of jobwork ${args.dcNo} — ${headerQty} units${headerRejected > 0 ? ` + ${headerRejected} rejected` : ''} (cumulative ${newReceived}/${sentTotal}${lossText}).`,
    summary: `Receive jobwork DC ${args.dcNo} | +${headerQty} good | +${headerRejected} rejected | cumulative ${newReceived}/${sentTotal} | balance ${Math.round(balance * 100) / 100} | status → ${status} | date ${args.receivedDate || 'today'}`,
    updates,
    sideEffects: [
      `Cumulative receipt ${newReceived}/${sentTotal} — balance ${Math.round(balance * 100) / 100} (JWL-03: receivedQty accumulates, never overwrites)`,
      headerRejected > 0 ? `Rejected ${headerRejected} booked as process loss (cumulative ${newRejected})` : 'No stock moves until GAN acceptance (accept_jobwork_pcs posts into G2)',
      ...(lossVerdict ? [`⚠ ${lossVerdict.message} — record the shortfall as a rejection entry (rejectedQty), not a silent short receipt`] : []),
    ],
    async commit() {
      await db.$transaction(async (tx) => {
        await tx.jobworkOrder.update({ where: { id: jw.id }, data: updatesData })
        for (const r of lineReceipts) {
          await tx.jobworkLine.update({
            where: { id: r.line.id },
            data: { receivedQty: r.line.receivedQty + r.qty, rejectedQty: r.line.rejectedQty + r.rejected },
          })
        }
      })
      return { id: jw.id, dcNo: jw.dcNo, status, balance: Math.round(balance * 100) / 100 }
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
 *  CurrentStock −). M39 (JWL-01/04): the DC also writes JobworkLine rows so
 *  the RTN return door guards every door uniformly. */
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

  const resolved: ResolvedLine[] = []
  for (const l of rawLines) {
    const r = await resolveMaterialLine(l)
    if ('error' in r) return { ok: false, error: r.error }
    resolved.push(r)
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
      ...resolved.map((l) => ({ table: 'jobworkLine', data: { itemType: l.itemType, itemId: l.itemId, itemCode: l.itemCode, uom: l.uom, qty: l.qty, rate: l.rate } })),
      ...resolved.map((l) => ({
        table: 'stockLedger',
        data: { txnType: 'process_delivery', itemType: l.itemType, itemId: l.itemId, godownId: godown.id, docNo: dcNo, docDate: dcDate, outKgs: l.uom === 'kgs' ? l.qty : 0, outPcs: l.uom === 'pcs' ? l.qty : 0, rate: l.rate, partyId: party.id, notes: `${l.itemCode} — ${notes}` },
      })),
    ],
    sideEffects: [
      `StockLedger: ${resolved.length} process_delivery rows OUT of ${godown.code} (material to ${party.name})`,
      'Pending receipt at the party — return via DC Return (RTN-####), validated against this DC',
      'Party ledger will reflect the delivery',
    ],
    async commit() {
      return await db.$transaction(async (tx) => {
        const j = await tx.jobworkOrder.create({
          data: {
            dcNo, jobworkerId: party.id, processType, totalQty, totalValue, outDate: dcDate, status: 'sent',
            lines: { create: resolved.map((l) => ({ itemType: l.itemType, itemId: l.itemId, itemCode: l.itemCode, uom: l.uom, qty: l.qty, rate: l.rate })) },
          },
        })
        for (const l of resolved) {
          await postLedger(tx, {
            txnType: 'process_delivery', itemType: l.itemType, itemId: l.itemId,
            godownId: godown.id, docNo: dcNo, docDate: dcDate, partyId: party.id,
            out: l.uom === 'kgs' ? { kgs: l.qty } : { pcs: l.qty },
            rate: l.rate, notes: `${l.itemCode} — ${notes}`,
          })
        }
        return { id: j.id, dcNo: j.dcNo, lines: resolved.length }
      })
    },
  }
}
