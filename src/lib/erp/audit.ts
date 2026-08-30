/**
 * Engine-level audit trail — SPEC-M9 §9 M15.
 *
 * THE ONE RULE: every committed plan leaves an AuditLog row, and the hook is
 * the SHARED EXECUTOR, not per-service discipline. All commit doors route
 * through `runCommit(plan, meta)`:
 *   - agent door: /api/agent/approve (every approved tool commit)
 *   - form doors: doc-actions.commitDocAction, masters/actions, the five
 *     lifecycle actions, the BOM action, cancel-action
 * A posting service cannot bypass the trail because it no longer owns the
 * commit invocation at the doors (its `commit()` is still the ONLY write
 * path — runCommit just runs it and records).
 *
 * Best-effort semantics: an audit failure must NEVER fail the commit it
 * records (try/catch swallow + console log). `payload` stores the plan's
 * after-image (creates/updates); before-images are not captured in v1 —
 * the registers remain the read-side history (ADR-002 ledger-as-truth).
 */
import { db } from '@/lib/db'

export interface AuditEntry {
  actorName: string
  actorSource: 'form' | 'agent' | 'system'
  action: string
  entity: string
  entityId?: string | null
  docNo?: string | null
  summary?: string | null
  payload?: unknown
}

/** Best-effort audit write — NEVER throws (an audit row must not fail a commit). */
export async function writeAudit(entry: AuditEntry): Promise<void> {
  try {
    await db.auditLog.create({
      data: {
        actorName: entry.actorName,
        actorSource: entry.actorSource,
        action: entry.action,
        entity: entry.entity,
        entityId: entry.entityId ?? null,
        docNo: entry.docNo ?? null,
        summary: entry.summary ?? null,
        payload: entry.payload === undefined ? null : JSON.stringify(entry.payload),
      },
    })
  } catch (e) {
    console.warn('[audit] write failed (commit already durable):', e instanceof Error ? e.message : e)
  }
}

/** Any plan shape carrying commit() + the serialized mutation list. `ok` is
 *  informational here — callers run runCommit only AFTER their own ok-check
 *  (MasterPlan's ok is a plain boolean, not a discriminated union). */
export interface AuditablePlan {
  ok?: boolean
  commit: () => Promise<any>
  summary: string
  creates?: { table: string; data: Record<string, unknown> }[]
  updates?: { table: string; id: string; data: Record<string, unknown> }[]
}

/** Doc-number-ish fields on committed rows, best-effort extracted. */
const DOC_NO_FIELDS = ['docNo', 'poNo', 'grnNo', 'invoiceNo', 'orderNo', 'cutNo', 'issueNo', 'dcNo', 'programNo', 'sampleNo', 'voucherNo', 'entryNo', 'bundleNo', 'code', 'styleNo', 'accountNo', 'rejNo', 'packNo', 'expenseNo', 'journalNo', 'key']

function extractDocNo(row: unknown): string | null {
  if (!row || typeof row !== 'object') return null
  const r = row as Record<string, unknown>
  for (const f of DOC_NO_FIELDS) {
    const v = r[f]
    if (typeof v === 'string' && v) return v
  }
  return null
}

/**
 * THE executor: run the plan's commit, then write the audit row. Returns
 * whatever commit() returned (the committed doc) — doors keep their shape.
 * `meta.action` defaults from the plan shape (updates-only → update, else
 * create); `meta.entity` defaults from the first create/update table.
 *
 * OPS-04 (Phase-6B Batch 1) — `meta.idempotencyKey` makes the commit
 * idempotent: the key row is INSERTED (its unique constraint is the lock)
 * BEFORE plan.commit() runs; replays return the stored result without
 * re-posting, and a failed commit deletes the row so a retry can attempt
 * again. Double-clicking Approve (or a form double-submit) posts exactly
 * once. The audit row is written only by the winning commit — replays are
 * silent by design (the replayed result IS the first commit's result).
 */
export async function runCommit<T = any>(
  plan: AuditablePlan,
  meta: {
    actorName: string
    actorSource: 'form' | 'agent' | 'system'
    action?: string
    entity?: string
    slug?: string
    idempotencyKey?: string
  },
): Promise<T> {
  const committed = await withIdempotency(meta, plan.commit)
  const result = committed as T
  const firstCreate = plan.creates?.[0]
  const firstUpdate = plan.updates?.[0]
  const entity = meta.entity ?? meta.slug ?? firstCreate?.table ?? firstUpdate?.table ?? 'unknown'
  const action = meta.action ?? (firstUpdate && !firstCreate ? 'update' : 'create')
  let entityId: string | null = null
  let docNo: string | null = null
  if (result && typeof result === 'object') {
    const r = result as Record<string, unknown>
    if (typeof r.id === 'string') entityId = r.id
    docNo = extractDocNo(result)
  }
  if (!entityId && firstUpdate) entityId = firstUpdate.id
  if (!docNo) docNo = extractDocNo(firstCreate?.data) ?? extractDocNo(firstUpdate?.data)

  await writeAudit({
    actorName: meta.actorName,
    actorSource: meta.actorSource,
    action,
    entity,
    entityId,
    docNo,
    summary: plan.summary,
    payload: { creates: plan.creates ?? [], updates: plan.updates ?? [] },
  })
  return result
}

/** OPS-04 — the insert-first idempotency lock around any commit closure. */
async function withIdempotency<T>(
  meta: { idempotencyKey?: string; actorName: string; actorSource: 'form' | 'agent' | 'system'; slug?: string },
  commit: () => Promise<T>,
): Promise<T> {
  const key = meta.idempotencyKey?.trim()
  if (!key) return await commit()

  const prior = await db.idempotencyKey.findUnique({ where: { key } })
  if (prior) {
    if (prior.actorName !== meta.actorName) {
      throw new Error('Idempotency key belongs to another user session — refusing to replay')
    }
    if (prior.status === 'done') {
      // Replay: return the ORIGINAL result instead of re-posting.
      return (prior.resultJson == null ? undefined : JSON.parse(prior.resultJson)) as T
    }
    throw new Error('A commit with this key is already in progress — retry in a moment')
  }

  try {
    await db.idempotencyKey.create({
      data: { key, door: meta.actorSource, actorName: meta.actorName, slug: meta.slug ?? null },
    })
  } catch {
    // P2002: a concurrent twin inserted the key between our find and create —
    // it owns this commit now.
    throw new Error('A commit with this key is already in progress — retry in a moment')
  }

  try {
    const result = await commit()
    await db.idempotencyKey.update({
      where: { key },
      data: { status: 'done', resultJson: result === undefined ? null : JSON.stringify(result) },
    })
    return result
  } catch (e) {
    // The commit failed — release the lock so the user can retry.
    await db.idempotencyKey.delete({ where: { key } }).catch(() => {})
    throw e
  }
}
