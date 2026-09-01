/**
 * Supplier Bill Register service — SPEC-M4 §5 row 13 (FrmSupplierBillReg),
 * REWRITTEN by SPEC-M40 PAY-03: rows are SupplierBill documents (SB-####), not
 * GRNs — the bill is now a real document with lines, tolerance verdicts, TDS
 * and a lifecycle (draft → passed → partial → paid). GRN/PO ride as columns
 * (plain-FK batch lookups — PITFALLS #21); status filter is the bill's own
 * fleet (every state has a writer). q.status keys the bill status directly.
 */
import { db } from '@/lib/db'
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'

export async function querySupplierBills(q: RegisterQuery): Promise<RegisterResult> {
  const where: any = {}
  if (q.status) where.status = q.status
  if (q.party) {
    const p = await db.party.findUnique({ where: { code: q.party } })
    if (!p) return { rows: [], summary: `Party ${q.party} not found`, count: 0 }
    where.partyId = p.id
  }
  if (q.from || q.to) {
    where.billDate = {}
    if (q.from) where.billDate.gte = q.from
    if (q.to) where.billDate.lte = q.to
  }

  const [bills, count] = await Promise.all([
    db.supplierBill.findMany({
      where,
      include: { lines: true },
      orderBy: { billDate: 'desc' },
      take: q.limit,
      skip: (q.page - 1) * q.limit,
    }),
    db.supplierBill.count({ where }),
  ])

  // batch lookups: party + GRN + PO (plain FKs — PITFALLS #21)
  const partyIds = [...new Set(bills.map((b) => b.partyId))]
  const parties = partyIds.length ? await db.party.findMany({ where: { id: { in: partyIds } }, select: { id: true, name: true } }) : []
  const partyMap = new Map(parties.map((p) => [p.id, p.name]))
  const grnIds = [...new Set(bills.map((b) => b.grnId).filter(Boolean) as string[])]
  const grns = grnIds.length ? await db.gRN.findMany({ where: { id: { in: grnIds } }, select: { id: true, grnNo: true } }) : []
  const grnMap = new Map(grns.map((g) => [g.id, g.grnNo]))
  const poIds = [...new Set(bills.map((b) => b.poId).filter(Boolean) as string[])]
  const pos = poIds.length ? await db.purchaseOrder.findMany({ where: { id: { in: poIds } }, select: { id: true, poNo: true } }) : []
  const poMap = new Map(pos.map((p) => [p.id, p.poNo]))

  const rows: RegisterRow[] = bills.map((b) => ({
    id: b.id,
    href: `/accounts/bill/${b.id}`,
    billNo: b.billNo,
    party: partyMap.get(b.partyId) ?? '—',
    grnNo: b.grnId ? grnMap.get(b.grnId) ?? null : null,
    poNo: b.poId ? poMap.get(b.poId) ?? null : null,
    billDate: b.billDate,
    taxableValue: b.taxableValue,
    gst: Math.round((b.cgstAmt + b.sgstAmt + b.igstAmt) * 100) / 100,
    billAmount: b.billAmount,
    tdsPercent: b.tdsPercent ?? 0,
    matchStatus: b.matchStatus ?? '—',
    status: b.status,
    lines: b.lines.length,
  }))

  const sum = (k: 'taxableValue' | 'billAmount') => rows.reduce((s, r) => s + (r[k] as number), 0)
  return {
    rows,
    totals: [
      { label: 'Bills', value: count },
      { label: 'Taxable (page)', value: Math.round(sum('taxableValue')) },
      { label: 'Bill value (page)', value: Math.round(sum('billAmount')) },
    ],
    summary: `${count} supplier bills${q.status ? ` · ${q.status}` : ''} · ₹${Math.round(sum('billAmount')).toLocaleString('en-IN')} (page)`,
    count,
  }
}
