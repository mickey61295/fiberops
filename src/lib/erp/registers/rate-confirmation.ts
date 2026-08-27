/**
 * Rate Confirmation register service — SPEC-M5 §7-A-6 (RptYarnRateConfirm,
 * RptFabRateConfirm, RptAccRateConfirm family). POLine day-book joined to PO +
 * Party; item codes via the shared buildItemCodeMaps (PITFALLS #27). Rows
 * drill into the PO view (W2). The `list_po_rates` agent tool delegates here.
 */
import { db } from '@/lib/db'
import { buildItemCodeMaps } from './resolve'
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'

export async function queryRateConfirmation(q: RegisterQuery): Promise<RegisterResult> {
  const where: any = {}
  // party + date filters both live on the PO relation — merge into one object
  const poWhere: any = {}
  if (q.party) {
    const p = await db.party.findUnique({ where: { code: q.party } })
    if (!p) return { rows: [], summary: `Party ${q.party} not found`, count: 0 }
    poWhere.partyId = p.id
  }
  if (q.from || q.to) {
    if (q.from) poWhere.orderDate = { ...(poWhere.orderDate ?? {}), gte: q.from }
    if (q.to) poWhere.orderDate = { ...(poWhere.orderDate ?? {}), lte: q.to }
  }
  if (Object.keys(poWhere).length > 0) where.po = poWhere
  if (q.itemType) where.itemType = q.itemType

  const [lines, count] = await Promise.all([
    db.pOLine.findMany({
      where,
      include: { po: { include: { party: true } } },
      orderBy: [{ po: { orderDate: 'desc' } }, { id: 'asc' }],
      take: q.limit,
      skip: (q.page - 1) * q.limit,
    }),
    db.pOLine.count({ where }),
  ])

  // item codes via the shared per-type maps (never inline lookups — #27)
  const byType: Record<string, Set<string>> = { yarn: new Set(), fabric: new Set(), accessory: new Set() }
  for (const l of lines) byType[l.itemType]?.add(l.itemId)
  const codeMaps = await buildItemCodeMaps(byType)

  const rows: RegisterRow[] = lines.map((l) => ({
    id: l.id,
    href: `/procurement/po/${l.poId}`,
    poNo: l.po?.poNo ?? null,
    party: l.po?.party?.name ?? null,
    itemType: l.itemType,
    itemCode: codeMaps[l.itemType]?.get(l.itemId) ?? l.itemId,
    qty: l.qty,
    rate: l.rate,
    amount: l.amount,
    orderDate: l.po?.orderDate ? new Date(l.po.orderDate).toISOString().slice(0, 10) : null,
    status: l.po?.status ?? null,
  }))

  const qty = rows.reduce((s, r) => s + (r.qty as number), 0)
  const value = rows.reduce((s, r) => s + (r.amount as number), 0)
  return {
    rows,
    totals: [
      { label: 'Lines', value: count },
      { label: 'Qty', value: qty },
      { label: 'Value (₹)', value: value },
    ],
    summary: `${count} PO rate lines${q.itemType ? ` (${q.itemType})` : ''} · ₹${value.toLocaleString('en-IN')}`,
    count,
  }
}
