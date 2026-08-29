/**
 * Audit-log register service — SPEC-M9 §9 M15 (the admin viewer's read side).
 * Rows come from the engine-level runCommit executor; this service only
 * filters/sorts them. Every column is a plain primitive (the M1
 * objects-as-React-child rule).
 */
import { db } from '@/lib/db'
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'

export async function queryAuditLog(q: RegisterQuery): Promise<RegisterResult> {
  const where: any = {}
  if (q.from || q.to) {
    where.createdAt = {}
    if (q.from) where.createdAt.gte = q.from
    if (q.to) where.createdAt.lte = q.to
  }
  if (q.variant) where.actorSource = q.variant // variant select = actorSource
  if (q.status) where.entity = q.status // status select = entity (the frozen key set has no 'entity')
  if (q.q) {
    where.OR = [
      { actorName: { contains: q.q } },
      { docNo: { contains: q.q } },
      { summary: { contains: q.q } },
      { entityId: { contains: q.q } },
    ]
  }

  const [rowsRaw, count] = await Promise.all([
    db.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: q.limit,
      skip: (q.page - 1) * q.limit,
    }),
    db.auditLog.count({ where }),
  ])

  const rows: RegisterRow[] = rowsRaw.map((a) => ({
    id: a.id,
    href: null, // the audit row IS the record — payload is the detail
    createdAt: a.createdAt,
    source: a.actorSource,
    actor: a.actorName,
    action: a.action,
    entity: a.entity,
    docNo: a.docNo ?? '—',
    summary: a.summary ?? '—',
  }))

  const bySource = { form: 0, agent: 0, system: 0 }
  for (const r of rowsRaw) {
    if (r.actorSource in bySource) (bySource as any)[r.actorSource] += 1
  }

  return {
    rows,
    totals: [
      { label: 'Entries', value: count },
      { label: 'Form', value: bySource.form },
      { label: 'Agent', value: bySource.agent },
      { label: 'System', value: bySource.system },
    ],
    summary: `${count} audit entries${q.variant ? ` · source ${q.variant}` : ''}${q.status ? ` · entity ${q.status}` : ''}`,
    count,
  }
}
