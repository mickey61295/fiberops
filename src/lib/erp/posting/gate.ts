/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M5 §7-D-27/28 — create_gate_entry / create_gate_pass service (ONE
// service, gateType picks the doc prefix: GE-#### in / GP-#### out). Legacy
// FrmGateEntry / FrmGatePass. Document-only — the gate log; partyCode
// resolves by code (free FK col).
// SPEC-M41 PRC-07 — refDocNo is VALIDATED against real doc numbers (blank
// allowed; mismatches refuse with a startsWith suggestion list).

import { db } from '@/lib/db'
import type { DocPlanResult } from './types'
import type { GateEntryInput } from '../schemas/gate'

// ── PRC-07 — the refDocNo resolver ──
// The gate log used to accept any free text (a wrong reference was silently
// untraceable). Now a provided ref must resolve against a known doc family
// (PO/GRN/DC/LAD/MDC/PDC/JW/SB/INV/GE/GP); mismatches refuse with a
// startsWith suggestion list (the jump.ts reflex). Blank stays allowed —
// gate rows legitimately carry no document.
const REF_FAMILIES: Array<{ model: string; field: string; label: string }> = [
  { model: 'purchaseOrder', field: 'poNo', label: 'PO' },
  { model: 'gRN', field: 'grnNo', label: 'GRN' },
  { model: 'order', field: 'orderNo', label: 'SO' },
  { model: 'pcsDespatch', field: 'dcNo', label: 'DC' },
  { model: 'jobworkOrder', field: 'dcNo', label: 'JW DC' },
  { model: 'supplierBill', field: 'billNo', label: 'SB' },
  { model: 'salesInvoice', field: 'invoiceNo', label: 'INV' },
  { model: 'gateEntry', field: 'entryNo', label: 'Gate' },
]

async function resolveRefDocNo(ref: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const trimmed = ref.trim()
  if (!trimmed) return { ok: true }
  for (const f of REF_FAMILIES) {
    const hit = await (db as any)[f.model].findUnique({ where: { [f.field]: trimmed } }).catch(() => null)
    if (hit) return { ok: true }
  }
  // Not a real document — gather startsWith suggestions (≤ 8, like jump.ts).
  const suggestions: string[] = []
  const probe = trimmed.slice(0, Math.max(3, Math.min(6, trimmed.length)))
  for (const f of REF_FAMILIES) {
    if (suggestions.length >= 8) break
    const rows = await (db as any)[f.model]
      .findMany({ where: { [f.field]: { startsWith: probe } }, select: { [f.field]: true }, take: 4 })
      .catch(() => [])
    for (const r of rows || []) {
      const v = (r as any)[f.field]
      if (v && !suggestions.includes(v)) suggestions.push(v)
    }
  }
  return {
    ok: false,
    error: `refDocNo '${trimmed}' does not match any document (checked PO/GRN/DC/LAD/MDC/PDC/JW/SB/INV/GE/GP families)${suggestions.length > 0 ? ` — did you mean: ${suggestions.slice(0, 8).join(', ')}?` : ''} (leave refDocNo blank if the movement has no document)`,
  }
}

export async function planGateEntry(args: GateEntryInput): Promise<DocPlanResult> {
  const gateType = (args.gateType?.trim() || 'in').toLowerCase()
  if (gateType !== 'in' && gateType !== 'out') {
    return { ok: false, error: `gateType must be in | out (got '${args.gateType}')` }
  }
  const status = args.status?.trim() || 'logged'
  if (status !== 'logged' && status !== 'cleared') {
    return { ok: false, error: `status must be logged | cleared (got '${status}')` }
  }
  // PRC-07 — the ref must be real (blank allowed).
  if (args.refDocNo?.trim()) {
    const refCheck = await resolveRefDocNo(args.refDocNo)
    if (!refCheck.ok) return { ok: false, error: refCheck.error }
  }

  let partyId: string | undefined
  if (args.partyCode?.trim()) {
    const party = await db.party.findUnique({ where: { code: args.partyCode.trim() } })
    if (!party) return { ok: false, error: `Party ${args.partyCode} not found` }
    partyId = party.id
  }

  const prefix = gateType === 'in' ? 'GE-' : 'GP-'
  const resolvedNo = await (async () => {
    const desired = args.entryNo?.trim()
    if (desired) {
      const exists = await db.gateEntry.findUnique({ where: { entryNo: desired } }).catch(() => null)
      if (!exists) return desired
    }
    const all = await db.gateEntry.findMany({ where: { entryNo: { startsWith: prefix } } })
    const used = new Set(all.map((g) => g.entryNo))
    let n = 1
    while (used.has(`${prefix}${String(n).padStart(4, '0')}`)) n++
    return `${prefix}${String(n).padStart(4, '0')}`
  })()

  return {
    ok: true,
    text: `Proposed gate ${gateType === 'in' ? 'entry' : 'pass'} ${resolvedNo}${args.vehicleNo ? ` (vehicle ${args.vehicleNo})` : ''}.`,
    summary: `Gate ${gateType === 'in' ? 'entry' : 'pass'} ${resolvedNo} | ${gateType.toUpperCase()} | vehicle ${args.vehicleNo || '-'} | ref ${args.refDocNo || '-'} | ${args.purpose || '-'}`,
    creates: [
      { table: 'gateEntry', data: { entryNo: resolvedNo, gateType, partyId, vehicleNo: args.vehicleNo, refDocNo: args.refDocNo, purpose: args.purpose, status } },
    ],
    sideEffects: [`Gate log row appears in /dispatch/${gateType === 'in' ? 'gate-entry' : 'gate-pass'}`],
    async commit() {
      const g = await db.gateEntry.create({
        data: {
          entryNo: resolvedNo, gateType, partyId,
          gateDateTime: args.gateDateTime ? new Date(args.gateDateTime) : new Date(),
          vehicleNo: args.vehicleNo, refDocNo: args.refDocNo, purpose: args.purpose, status,
        },
      })
      return { id: g.id, entryNo: g.entryNo }
    },
  }
}
