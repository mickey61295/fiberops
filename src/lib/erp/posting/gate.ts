/* eslint-disable @typescript-eslint/no-explicit-any */
// SPEC-M5 §7-D-27/28 — create_gate_entry / create_gate_pass service (ONE
// service, gateType picks the doc prefix: GE-#### in / GP-#### out). Legacy
// FrmGateEntry / FrmGatePass. Document-only — the gate log; partyCode
// resolves by code (free FK col). refDocNo is free text (DC/GRN/PO no).

import { db } from '@/lib/db'
import type { DocPlanResult } from './types'
import type { GateEntryInput } from '../schemas/gate'

export async function planGateEntry(args: GateEntryInput): Promise<DocPlanResult> {
  const gateType = (args.gateType?.trim() || 'in').toLowerCase()
  if (gateType !== 'in' && gateType !== 'out') {
    return { ok: false, error: `gateType must be in | out (got '${args.gateType}')` }
  }
  const status = args.status?.trim() || 'logged'
  if (status !== 'logged' && status !== 'cleared') {
    return { ok: false, error: `status must be logged | cleared (got '${status}')` }
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
