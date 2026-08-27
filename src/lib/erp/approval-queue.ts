'use server'

/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * SPEC-M6 §6 (Wave D) — the manual approval-queue server action.
 * The four legacy acceptance queues were human-stepped (unlike Wave C's
 * posting hooks): each IN screen's queue card button calls THIS action to
 * write the pending Approval row (entity = the kind, entityId = the doc id,
 * requestedBy = 'queue'). Idempotent: an existing row of ANY status is left
 * untouched — the accept door (proposeApprovalGate wrapper tool or the
 * /approvals inbox) then moves it to approved.
 */
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db'
import { findApprovalKind } from '@/lib/erp/approval-kinds'

export type SendToAcceptanceResult = { ok: true; created: boolean } | { ok: false; error: string }

export async function sendToAcceptanceAction(
  kindEntity: string,
  entityId: string,
): Promise<SendToAcceptanceResult> {
  const kind = findApprovalKind(kindEntity)
  if (!kind || !kind.manual) return { ok: false, error: `Unknown manual approval kind ${kindEntity}` }
  if (!entityId) return { ok: false, error: 'Missing document id' }
  try {
    const existing = await db.approval.findFirst({
      where: { entity: kindEntity, entityId },
      orderBy: { createdAt: 'desc' },
    })
    if (existing) return { ok: true, created: false }
    await db.approval.create({
      data: { entity: kindEntity, entityId, step: 1, requestedBy: 'queue', status: 'pending' },
    })
    // Guarded like doc-actions' SLUG_REVALIDATE: revalidation must never fail
    // the write that already succeeded (also keeps the action callable from
    // vitest, outside a Next request scope).
    try {
      revalidatePath(kind.route)
      revalidatePath('/approvals')
    } catch {
      /* outside a Next request scope (tests) — row already durable */
    }
    return { ok: true, created: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}
