/**
 * Line-issue register service — SPEC-M19 §2 Wave B (legacy
 * FrmOrdBundIssToLineReg). The order/bundle issue-to-line day-book: one row
 * per LineIssue (issueNo, order, line, qty, style). Rows drill into the
 * issue view (W2). Read tool door: get_line_status (the line-side read) +
 * issue_to_line (the write).
 */
import { db } from '@/lib/db'
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'

export async function queryLineIssues(q: RegisterQuery): Promise<RegisterResult> {
  const where: any = {}
  if (q.from || q.to) {
    where.issueDate = {}
    if (q.from) where.issueDate.gte = q.from
    if (q.to) where.issueDate.lte = q.to
  }
  if (q.order) where.order = { orderNo: { contains: q.order } }
  if (q.status) where.status = q.status
  if (q.q) {
    where.OR = [
      { issueNo: { contains: q.q } },
      { order: { orderNo: { contains: q.q } } },
      { styleNo: { contains: q.q } },
      { line: { code: { contains: q.q } } },
    ]
  }

  const [issues, count] = await Promise.all([
    db.lineIssue.findMany({
      where,
      orderBy: { issueDate: 'desc' },
      take: q.limit,
      skip: (q.page - 1) * q.limit,
      include: { order: { include: { buyer: true } }, line: true },
    }),
    db.lineIssue.count({ where }),
  ])

  const rows: RegisterRow[] = issues.map((li) => ({
    id: li.id,
    href: `/production/issue/${li.id}`,
    issueNo: li.issueNo,
    issueDate: li.issueDate,
    orderNo: li.order.orderNo,
    buyer: li.order.buyer?.name ?? '—',
    line: li.line ? `${li.line.code} — ${li.line.name}` : '—',
    styleNo: li.styleNo ?? '—',
    qty: li.qty,
    status: li.status,
  }))

  const qty = rows.reduce((s, r) => s + (r.qty as number), 0)
  const lines = new Set(rows.map((r) => (r.line as string).split(' — ')[0])).size
  return {
    rows,
    totals: [
      { label: 'Issues', value: count },
      { label: 'Lines', value: lines },
      { label: 'Pcs issued', value: qty },
    ],
    summary: `${count} line issues · ${qty.toLocaleString('en-IN')} pcs issued to ${lines} line${lines === 1 ? '' : 's'}`,
    count,
  }
}
