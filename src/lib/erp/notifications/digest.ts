/**
 * Daily notifications digest — SPEC-M9 §9 M13. Builds the three sections
 * from live data (read-only; the same rows the approval inbox / stock views
 * show): pending approvals with age, low-stock alerts (pcs buckets under the
 * notification.low_stock_pcs threshold + NEGATIVE material balances, always
 * worth a shout), and today's gate movement log. Flags gate SENDING
 * (notification.digest_enabled + webhook_url); this module only builds and,
 * when armed, POSTs — no external dependency beyond fetch.
 */
import { db } from '@/lib/db'
import { getFlag } from '@/lib/erp/flags'

export interface DigestApprovalRow {
  entity: string
  entityId: string
  step: number
  requestedBy: string
  createdAt: string
  ageDays: number
}

export interface DigestLowStockRow {
  itemType: string
  itemCode: string
  godown: string
  pcs: number | null
  kgs: number | null
}

export interface DigestGateRow {
  gateType: string
  entryNo: string
  refDocNo: string | null
  vehicleNo: string | null
  party: string | null
  gateDateTime: string
}

export interface Digest {
  generatedAt: string
  sections: {
    approvals: { rows: DigestApprovalRow[] }
    lowStock: { thresholdPcs: number; rows: DigestLowStockRow[] }
    gate: { rows: DigestGateRow[] }
  }
  text: string
}

const ENTITY_LABELS: Record<string, string> = {
  po: 'Purchase Order',
  grn: 'GRN',
  invoice: 'Invoice',
  cut_order: 'Cut Order',
  cost_sheet: 'Cost Sheet',
  debit: 'Debit Note',
  order: 'Order',
  program: 'Program',
  supplier_bill: 'Supplier Bill',
  budget: 'Budget',
}

export async function buildDigest(now = new Date()): Promise<Digest> {
  const thresholdPcs = Number(await getFlag('notification.low_stock_pcs')) || 0

  const [approvals, stock, gate] = await Promise.all([
    db.approval.findMany({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
      take: 100,
    }),
    db.currentStock.findMany({ take: 5000 }),
    db.gateEntry.findMany({
      where: { gateDateTime: { gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()) } },
      orderBy: { gateDateTime: 'desc' },
      take: 50,
    }),
  ])

  // resolve item codes for stock rows (PITFALLS #21 id-maps; pcs → styleNo)
  const byType: Record<string, Set<string>> = {}
  for (const s of stock) (byType[s.itemType] ??= new Set()).add(s.itemId)
  const codeMaps: Record<string, Map<string, string>> = {}
  for (const [t, ids] of Object.entries(byType)) {
    if (!ids.size) continue
    if (t === 'pcs') {
      const items = await db.style.findMany({ where: { id: { in: [...ids] } }, select: { id: true, styleNo: true } })
      codeMaps[t] = new Map(items.map((i) => [i.id, i.styleNo]))
    } else {
      const model = (db as any)[t]
      if (!model) continue
      const items = await model.findMany({ where: { id: { in: [...ids] } }, select: { id: true, code: true } })
      codeMaps[t] = new Map(items.map((i: { id: string; code: string }) => [i.id, i.code]))
    }
  }
  const godowns = await db.godown.findMany({ select: { id: true, code: true } })
  const godownById = new Map(godowns.map((g) => [g.id, g.code]))

  // low stock: pcs buckets under the threshold (when armed) + negative material balances (always)
  const lowStock: DigestLowStockRow[] = []
  for (const s of stock) {
    const code = codeMaps[s.itemType]?.get(s.itemId) ?? s.itemId
    const godown = godownById.get(s.godownId) ?? '—'
    if (s.itemType === 'pcs') {
      if (thresholdPcs > 0 && (s.pcs ?? 0) < thresholdPcs && (s.pcs ?? 0) >= 0) {
        lowStock.push({ itemType: s.itemType, itemCode: code, godown, pcs: s.pcs, kgs: null })
      }
    } else if ((s.kgs ?? 0) < 0) {
      lowStock.push({ itemType: s.itemType, itemCode: code, godown, pcs: null, kgs: s.kgs })
    }
  }

  const approvalRows: DigestApprovalRow[] = approvals.map((a) => ({
    entity: ENTITY_LABELS[a.entity] ?? a.entity,
    entityId: a.entityId,
    step: a.step,
    requestedBy: a.requestedBy,
    createdAt: a.createdAt.toISOString(),
    ageDays: Math.floor((now.getTime() - a.createdAt.getTime()) / 86400000),
  }))

  // gate parties are a PLAIN FK (PITFALLS #21 — no relation on GateEntry)
  const partyIds = new Set(gate.map((g) => g.partyId).filter(Boolean) as string[])
  const gateParties = partyIds.size
    ? await db.party.findMany({ where: { id: { in: [...partyIds] } }, select: { id: true, name: true } })
    : []
  const partyById = new Map(gateParties.map((p) => [p.id, p.name]))
  const gateRows: DigestGateRow[] = gate.map((g) => ({
    gateType: g.gateType,
    entryNo: g.entryNo,
    refDocNo: g.refDocNo ?? null,
    vehicleNo: g.vehicleNo ?? null,
    party: g.partyId ? partyById.get(g.partyId) ?? null : null,
    gateDateTime: g.gateDateTime.toISOString(),
  }))

  const lines: string[] = []
  lines.push(`FiberOps daily digest — ${now.toISOString().slice(0, 10)}`)
  lines.push('')
  lines.push(`Pending approvals: ${approvalRows.length}`)
  for (const a of approvalRows.slice(0, 10)) {
    lines.push(`  · ${a.entity} ${a.entityId} (step ${a.step}, by ${a.requestedBy}, ${a.ageDays}d old)`)
  }
  if (approvalRows.length > 10) lines.push(`  … and ${approvalRows.length - 10} more`)
  lines.push('')
  lines.push(`Low stock${thresholdPcs > 0 ? ` (pcs < ${thresholdPcs} or negative)` : ' (negative material balances)'}: ${lowStock.length}`)
  for (const r of lowStock.slice(0, 10)) {
    lines.push(`  · ${r.itemType} ${r.itemCode} @ ${r.godown}: ${r.pcs !== null ? `${r.pcs} pcs` : `${r.kgs} kgs`}`)
  }
  if (lowStock.length > 10) lines.push(`  … and ${lowStock.length - 10} more`)
  lines.push('')
  lines.push(`Gate movements today: ${gateRows.length}`)
  for (const g of gateRows.slice(0, 5)) {
    lines.push(`  · ${g.gateType.toUpperCase()} ${g.entryNo}${g.vehicleNo ? ` (${g.vehicleNo})` : ''}${g.refDocNo ? ` ref ${g.refDocNo}` : ''}${g.party ? ` — ${g.party}` : ''}`)
  }

  return {
    generatedAt: now.toISOString(),
    sections: {
      approvals: { rows: approvalRows },
      lowStock: { thresholdPcs, rows: lowStock },
      gate: { rows: gateRows },
    },
    text: lines.join('\n'),
  }
}

export interface DigestSendResult {
  ok: boolean
  sent: boolean
  reason?: string
  status?: number
}

/** Send the digest to the webhook — ONLY when flags arm it (M13 acceptance). */
export async function sendDigest(now = new Date()): Promise<DigestSendResult> {
  const enabled = await getFlag('notification.digest_enabled')
  const url = String(await getFlag('notification.webhook_url') ?? '').trim()
  if (!enabled) return { ok: false, sent: false, reason: 'notification.digest_enabled is off — arm it in Admin → Settings' }
  if (!url) return { ok: false, sent: false, reason: 'notification.webhook_url is empty — nowhere to send' }
  const digest = await buildDigest(now)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: digest.text, digest }),
    })
    return { ok: res.ok, sent: res.ok, status: res.status }
  } catch (e) {
    return { ok: false, sent: false, reason: e instanceof Error ? e.message : 'webhook fetch failed' }
  }
}
