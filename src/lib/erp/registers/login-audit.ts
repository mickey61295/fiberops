/**
 * Login-audit register service — SPEC-M60 FR-A7 (the /admin/login-audit
 * read side). Rows come from the auth doors (login/logout/lockout/password
 * family); this service only filters/sorts them — the audit-log pattern:
 * every column a plain primitive, variant select = event, q = the search.
 */
import { db } from '@/lib/db'
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'

export async function queryLoginAudit(q: RegisterQuery): Promise<RegisterResult> {
  const where: any = {}
  if (q.from || q.to) {
    where.at = {}
    if (q.from) where.at.gte = q.from
    if (q.to) where.at.lte = q.to
  }
  if (q.variant) where.event = q.variant // variant select = event (the audit-log mapping precedent)
  if (q.q) {
    where.OR = [
      { email: { contains: q.q } },
      { ip: { contains: q.q } },
      { detail: { contains: q.q } },
    ]
  }

  const [rowsRaw, count] = await Promise.all([
    db.loginAudit.findMany({
      where,
      orderBy: { at: 'desc' },
      take: q.limit,
      skip: (q.page - 1) * q.limit,
    }),
    db.loginAudit.count({ where }),
  ])

  const rows: RegisterRow[] = rowsRaw.map((a) => ({
    id: a.id,
    href: null, // the audit row IS the record
    createdAt: a.at,
    event: a.event,
    email: a.email,
    ip: a.ip,
    userAgent: a.userAgent,
    detail: a.detail ?? '—',
  }))

  const byEvent: Record<string, number> = {}
  for (const r of rowsRaw) byEvent[r.event] = (byEvent[r.event] ?? 0) + 1

  return {
    rows,
    totals: [
      { label: 'Entries', value: count },
      { label: 'Logins', value: byEvent['login'] ?? 0 },
      { label: 'Failures', value: byEvent['login_fail'] ?? 0 },
      { label: 'Locked', value: byEvent['login_locked'] ?? 0 },
    ],
    summary: `${count} auth events${q.variant ? ` · event ${q.variant}` : ''}`,
    count,
  }
}
