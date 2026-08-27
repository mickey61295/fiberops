/**
 * Supplier Bill Register service — SPEC-M4 §5 row 13 (FrmSupplierBillReg).
 * GRN day-book with PO linkage (poId id-map — relation exists but PO lookup is
 * batched for the poNo column). q.status maps to grnType (frozen filter-key
 * set §4). Rows drill into /procurement/grn/[id] (W2).
 */
import { db } from '@/lib/db'
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'

export async function querySupplierBills(q: RegisterQuery): Promise<RegisterResult> {
  const where: any = {}
  if (q.status) where.grnType = q.status // status key rides grnType (config comment)
  if (q.party) {
    const p = await db.party.findUnique({ where: { code: q.party } })
    if (!p) return { rows: [], summary: `Party ${q.party} not found`, count: 0 }
    where.partyId = p.id
  }
  if (q.from || q.to) {
    where.grnDate = {}
    if (q.from) where.grnDate.gte = q.from
    if (q.to) where.grnDate.lte = q.to
  }

  const [grns, count] = await Promise.all([
    db.gRN.findMany({
      where,
      include: { party: true },
      orderBy: { grnDate: 'desc' },
      take: q.limit,
      skip: (q.page - 1) * q.limit,
    }),
    db.gRN.count({ where }),
  ])

  const poIds = [...new Set(grns.map((g) => g.poId).filter(Boolean) as string[])]
  const pos = poIds.length ? await db.purchaseOrder.findMany({ where: { id: { in: poIds } }, select: { id: true, poNo: true } }) : []
  const poMap = new Map(pos.map((p) => [p.id, p.poNo]))

  const rows: RegisterRow[] = grns.map((g) => ({
    id: g.id,
    href: `/procurement/grn/${g.id}`,
    grnNo: g.grnNo,
    grnType: g.grnType,
    party: g.party?.name ?? '—',
    poNo: g.poId ? poMap.get(g.poId) ?? null : null,
    grnDate: g.grnDate,
    totalQty: g.totalQty,
    totalValue: g.totalValue,
  }))

  const sum = (k: 'totalQty' | 'totalValue') => rows.reduce((s, r) => s + (r[k] as number), 0)
  return {
    rows,
    totals: [
      { label: 'GRNs', value: count },
      { label: 'Qty (page)', value: Math.round(sum('totalQty') * 100) / 100 },
      { label: 'Value (page)', value: Math.round(sum('totalValue')) },
    ],
    summary: `${count} supplier bills${q.status ? ` · type ${q.status}` : ''} · value ₹${Math.round(sum('totalValue')).toLocaleString('en-IN')} (page)`,
    count,
  }
}
