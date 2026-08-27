/**
 * Approval Audit Trail register service — SPEC-M4 §5 row 16.
 * Approval rows (who approved what, when) + AgentTurn count in the summary.
 * Rows drill into the entity view when live (po → /procurement/po/[id] via
 * resolveDocRef on entityId — id-first lookup). `get_approval_audit` (agent
 * tool) delegates here.
 */
import { db } from '@/lib/db'
import type { RegisterQuery, RegisterResult, RegisterRow } from './types'
import { resolveDocRef, type DocFamily } from './resolve'

/** Approval.entity → doc family for drill-down (entityId is the row id). */
const ENTITY_FAMILY: Record<string, DocFamily> = {
  po: 'po',
  grn: 'grn',
  invoice: 'invoice',
  cut_order: 'cut',
  cost_sheet: 'order', // cost sheet lives on the Order Hub
  debit: 'invoice', // debit notes ride the invoice family view
}

export async function queryApprovalAudit(q: RegisterQuery): Promise<RegisterResult> {
  const where: any = {}
  if (q.status) where.status = q.status
  if (q.from || q.to) {
    where.createdAt = {}
    if (q.from) where.createdAt.gte = q.from
    if (q.to) where.createdAt.lte = q.to
  }

  const [approvals, count, agentTurns] = await Promise.all([
    db.approval.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: q.limit,
      skip: (q.page - 1) * q.limit,
    }),
    db.approval.count({ where }),
    db.agentTurn.count(),
  ])

  // W2 drill: entityId → live entity view (batched per family)
  const families = new Set(approvals.map((a) => ENTITY_FAMILY[a.entity]).filter(Boolean) as DocFamily[])
  const hrefByFamilyRef = new Map<string, string | null>()
  for (const family of families) {
    const refs = [...new Set(approvals.filter((a) => ENTITY_FAMILY[a.entity] === family).map((a) => a.entityId))]
    const hrefs = await Promise.all(refs.map((r) => resolveDocRef(family, r)))
    refs.forEach((r, i) => hrefByFamilyRef.set(`${family}:${r}`, hrefs[i]))
  }

  const rows: RegisterRow[] = approvals.map((a) => {
    const family = ENTITY_FAMILY[a.entity]
    const href = family ? hrefByFamilyRef.get(`${family}:${a.entityId}`) ?? null : null
    return {
      id: a.id,
      href,
      createdAt: a.createdAt,
      entity: a.entity,
      entityId: a.entityId.slice(0, 12),
      step: a.step,
      requestedBy: a.requestedBy,
      approvedBy: a.approvedBy ?? '—',
      approvedAt: a.approvedAt,
      status: a.status,
      comments: a.comments ?? '—',
    }
  })

  const approved = rows.filter((r) => r.status === 'approved').length
  const rejected = rows.filter((r) => r.status === 'rejected').length

  return {
    rows,
    totals: [
      { label: 'Approvals', value: count },
      { label: 'Approved (page)', value: approved },
      { label: 'Rejected (page)', value: rejected },
      { label: 'Agent turns', value: agentTurns },
    ],
    summary: `${count} approvals${q.status ? ` · ${q.status}` : ''} · ${agentTurns} agent turns logged`,
    count,
  }
}
