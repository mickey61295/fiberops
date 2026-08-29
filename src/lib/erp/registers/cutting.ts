/**
 * Cutting register service — SPEC-M19 §2 Wave B (legacy FrmCutingReg).
 * The cut day-book: one row per CutOrder with bundle counts, order + style
 * context, fabric issued and output pcs. Bundles are the CutOrder's children
 * (ERRATUM: no CutLine model exists — schema says CutBundle).
 * Rows drill into the cutting job-order view (W2).
 */
import { db } from '@/lib/db'
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'

export async function queryCuttingRegister(q: RegisterQuery): Promise<RegisterResult> {
  const where: any = {}
  if (q.from || q.to) {
    where.cutDate = {}
    if (q.from) where.cutDate.gte = q.from
    if (q.to) where.cutDate.lte = q.to
  }
  if (q.order) where.order = { orderNo: { contains: q.order } }
  if (q.status) where.status = q.status
  if (q.q) where.OR = [{ cutNo: { contains: q.q } }, { order: { orderNo: { contains: q.q } } }]

  const [cuts, count] = await Promise.all([
    db.cutOrder.findMany({
      where,
      orderBy: { cutDate: 'desc' },
      take: q.limit,
      skip: (q.page - 1) * q.limit,
      include: { order: { include: { buyer: true, style: true } }, bundles: { select: { qty: true } } },
    }),
    db.cutOrder.count({ where }),
  ])

  const rows: RegisterRow[] = cuts.map((c) => ({
    id: c.id,
    href: `/cutting/job-order/${c.id}`,
    cutNo: c.cutNo,
    cutDate: c.cutDate,
    orderNo: c.order.orderNo,
    buyer: c.order.buyer?.name ?? '—',
    style: c.order.style?.styleNo ?? '—',
    fabricIssued: c.fabricIssued,
    totalPcs: c.totalPcs,
    bundles: c.bundles.length,
    bundlePcs: c.bundles.reduce((s, b) => s + b.qty, 0),
    status: c.status,
  }))

  const sum = (k: 'fabricIssued' | 'totalPcs' | 'bundlePcs') => rows.reduce((s, r) => s + (r[k] as number), 0)
  return {
    rows,
    totals: [
      { label: 'Cut orders', value: count },
      { label: 'Fabric issued kgs', value: Math.round(sum('fabricIssued') * 100) / 100 },
      { label: 'Cut pcs', value: sum('totalPcs') },
      { label: 'Bundle pcs', value: sum('bundlePcs') },
    ],
    summary: `${count} cut orders · ${sum('totalPcs').toLocaleString('en-IN')} pcs cut${q.status ? ` · status ${q.status}` : ''}`,
    count,
  }
}
