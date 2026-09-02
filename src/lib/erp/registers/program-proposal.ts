/**
 * SPEC-M43 PRG-05 — proposeProgramRequirements: the BOM × order-qty ×
 * wastage computation that replaces hand-typed program requirements.
 *
 * Read-only (no plan/commit — the operator adopts rows through planProgram,
 * the SAME service both doors per ADR-001). Wastage = the two LLD-07
 * requirement tolerance flags (boostupper — the FN_Add_BoostupPer parity —
 * and reserveper), consumed here at last. BOM is per STYLE: the honest
 * denominator for a multi-style order is the qty of THAT style's order
 * lines, not totalPcs.
 */
import { db } from '@/lib/db'
import { getFlags } from '@/lib/erp/flags'

export interface ProposalRow {
  itemType: string
  itemCode: string
  itemName: string
  stage: string // knitting for yarn, dyeing for fabric, '—' for accessory
  styleNo: string
  perPc: number // BOM qty per piece
  orderQty: number // pcs of this style on the order
  boostPct: number
  totalQty: number // perPc × orderQty × (1 + boost%)
  uom: string
  rate: number
  value: number
}

export interface ProgramProposal {
  orderNo: string
  styles: string[]
  totalPcs: number
  boostPct: number
  reservePct: number
  rows: ProposalRow[]
  notes: string[]
}

const round2 = (n: number) => Math.round(n * 100) / 100

export async function proposeProgramRequirements(orderNo: string): Promise<
  { ok: true; proposal: ProgramProposal } | { ok: false; error: string }
> {
  const order = await db.order.findUnique({
    where: { orderNo },
    include: {
      style: { include: { bomLines: true } },
      lines: { include: { style: { include: { bomLines: true } } } },
    },
  })
  if (!order) return { ok: false, error: `Order ${orderNo} not found` }

  // per-style order qty (multi-style aware: Σ qty of that style's lines)
  const styleQty = new Map<string, number>() // styleId → pcs
  const styleById = new Map<string, any>()
  for (const l of order.lines) {
    const sid = l.styleId || order.styleId
    if (!sid) continue
    styleQty.set(sid, (styleQty.get(sid) || 0) + l.qty)
    styleById.set(sid, l.style ?? order.style)
  }
  if (styleQty.size === 0 && order.styleId) {
    styleQty.set(order.styleId, order.totalPcs)
    styleById.set(order.styleId, order.style)
  }
  if (styleQty.size === 0) {
    return { ok: false, error: `Order ${orderNo} has no style to read a BOM from.` }
  }

  // BOM-missing check with actionable guidance (the chain teaches step 2)
  const missing: string[] = []
  for (const [sid, style] of styleById) {
    if (!style || !(style.bomLines?.length)) missing.push(style?.styleNo ?? sid)
  }
  if (missing.length === styleById.size) {
    return {
      ok: false,
      error: `No BOM on style ${missing.join(', ')} (order ${orderNo}) — create the BOM first (create_bom / the Order Hub BOM card), then propose again.`,
    }
  }

  const flags = await getFlags(['boostupper', 'reserveper'])
  const boostPct = Number(flags.boostupper ?? 0)
  const reservePct = Number(flags.reserveper ?? 0)
  const factor = 1 + (boostPct + reservePct) / 100

  // item code/name resolution (per-model select — the PITFALLS #45 reflex)
  // per-model display info (Yarn has count/blend, Fabric construction/gsm —
  // no name column; Accessory carries a name)
  const itemInfo = new Map<string, { code: string; name: string }>()
  for (const y of await db.yarn.findMany({ select: { id: true, code: true, count: true, blend: true } })) {
    itemInfo.set(y.id, { code: y.code, name: `${y.count}${y.blend ? ' ' + y.blend : ''}` })
  }
  for (const f of await db.fabric.findMany({ select: { id: true, code: true, construction: true, gsm: true } })) {
    itemInfo.set(f.id, { code: f.code, name: `${f.code}${f.construction ? ' ' + f.construction : ''}${f.gsm ? ' ' + f.gsm + 'gsm' : ''}` })
  }
  for (const a of await db.accessory.findMany({ select: { id: true, code: true, name: true } })) itemInfo.set(a.id, { code: a.code, name: a.name })
  const uoms = new Map<string, string>()
  for (const u of await db.uOM.findMany({ select: { id: true, name: true } })) uoms.set(u.id, u.name)

  const rows: ProposalRow[] = []
  const notes: string[] = []
  for (const [sid, qty] of styleQty) {
    const style = styleById.get(sid)
    for (const b of style?.bomLines ?? []) {
      const info = itemInfo.get(b.itemId)
      const totalQty = round2(b.qty * qty * factor)
      rows.push({
        itemType: b.itemType,
        itemCode: info?.code ?? b.itemId,
        itemName: info?.name ?? info?.code ?? b.itemId,
        stage: b.itemType === 'yarn' ? 'knitting' : b.itemType === 'fabric' ? 'dyeing' : '—',
        styleNo: style?.styleNo ?? sid,
        perPc: b.qty,
        orderQty: qty,
        boostPct: boostPct + reservePct,
        totalQty,
        uom: uoms.get(b.uomId ?? '') ?? 'kgs',
        rate: b.rate,
        value: round2(totalQty * b.rate),
      })
    }
  }
  // accessory/other rows: shown for planning; programs are yarn/fabric only
  if (rows.some((r) => r.stage === '—')) {
    notes.push('Accessory/other BOM rows are informational — programs cover yarn (knitting) and fabric (dyeing) stages; accessories are procured, not programmed.')
  }
  notes.push(`Wastage applied: +${round2(boostPct + reservePct)}% (boostupper ${boostPct}% + reserveper ${reservePct}%) — adjust the flags to change the proposal.`)

  return {
    ok: true,
    proposal: {
      orderNo: order.orderNo,
      styles: [...styleById.values()].map((s: any) => s?.styleNo).filter(Boolean),
      totalPcs: order.totalPcs,
      boostPct: round2(boostPct + reservePct),
      reservePct: round2(reservePct),
      rows,
      notes,
    },
  }
}
