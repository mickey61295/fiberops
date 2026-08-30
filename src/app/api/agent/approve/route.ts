/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from '@/lib/db'
import { getTool } from '@/lib/agent/tools'
import { requireApiSession } from '@/lib/auth/api-guard'
import { runCommit } from '@/lib/erp/audit'
import { docCta } from '@/lib/erp/doc-cta'

// Approval endpoint — the client posts { turnId, idempotencyKey } (CHAT-06)
// and we execute the STORED plan, or the legacy { toolName, args } pair.
// SPEC-M7 Wave B — guarded + the session user is the APPROVAL ACTOR:
//   - execute() receives the actor so approval commits stamp
//     Approval.approvedBy = the human's email (was hardcoded 'agent')
//   - AgentTurn rows for this user get approvedBy/approvedAt
// SPEC-M9 §9 M15 — the AGENT DOOR audit choke point: every approved tool
// commit routes through runCommit (the engine-level audit executor).
// OPS-04 (Phase-6B Batch 1) — the idempotency token is minted client-side per
// PENDING APPROVAL card (not per click): a double-clicked Approve replays the
// stored result instead of re-posting the plan.
//
// CHAT-06 (Phase-6B Batch 2, SPEC-M38 §2-2) — approve-by-id kills the TOCTOU:
//   OLD: the route re-executed the tool with client-held args and committed
//        whatever came back — if data drifted between display and click, the
//        committed plan ≠ the displayed plan, and `updateMany` marked ALL the
//        user's pending turns approved.
//   NEW: { turnId } loads the AgentTurn row (stored toolName + args + plan),
//        re-runs plan() and DEEP-COMPARES against the stored plan. Identical
//        → commit (the displayed plan is exactly what commits). Drift → 409
//        with the fresh plan so the operator re-reviews honestly. The turn
//        row is updated by id — only THAT turn is marked approved.
//   Commit closures are closures (unserializable) — re-planning + comparing
//   is the only way to "execute the stored plan" without serializing commits.
export async function POST(req: Request) {
  const guard = await requireApiSession()
  if (guard.error) return guard.error
  const actor = { userId: guard.user.id, email: guard.user.email, name: guard.user.name }
  try {
    const { toolName, args, idempotencyKey, turnId } = await req.json()

    // Replay check FIRST — a double-click must not even re-plan.
    if (typeof idempotencyKey === 'string' && idempotencyKey.trim()) {
      const prior = await db.idempotencyKey.findUnique({ where: { key: idempotencyKey.trim() } })
      if (prior?.status === 'done' && prior.resultJson != null) {
        if (prior.actorName !== actor.email) {
          return Response.json({ error: 'Idempotency key belongs to another session' }, { status: 409 })
        }
        const committed = JSON.parse(prior.resultJson)
        const docNo = committed?.orderNo ?? committed?.docNo ?? committed?.invoiceNo ?? committed?.poNo ?? committed?.voucherNo ?? committed?.dcNo ?? null
        return Response.json({ success: true, committed, docNo, cta: docCta(docNo), replayed: true })
      }
      if (prior?.status === 'pending') {
        return Response.json({ error: 'A commit with this key is already in progress — retry in a moment' }, { status: 409 })
      }
    }

    // Resolve the tool + args: stored turn first (CHAT-06), legacy pair second.
    let effectiveToolName = toolName
    let effectiveArgs = args
    let turn: { id: string; plan: string | null; toolCalls: string | null } | null = null
    if (typeof turnId === 'string' && turnId.trim()) {
      turn = await db.agentTurn.findUnique({ where: { id: turnId.trim() } })
      if (!turn) return Response.json({ error: 'Unknown turn — the conversation event expired. Ask the agent to re-plan.' }, { status: 404 })
      let storedCalls: any[] = []
      try {
        storedCalls = turn.toolCalls ? JSON.parse(turn.toolCalls) : []
      } catch {
        storedCalls = []
      }
      const stored = storedCalls.find((c: any) => c?.name && c?.isWrite)
      if (!stored) return Response.json({ error: 'The stored turn carries no write plan — re-plan and approve again.' }, { status: 400 })
      effectiveToolName = stored.name
      effectiveArgs = stored.args
    }

    const t = getTool(effectiveToolName)
    if (!t) return Response.json({ error: 'Unknown tool' }, { status: 400 })
    if (!t.isWrite) return Response.json({ error: 'Tool is read-only' }, { status: 400 })

    // Re-execute to get the plan + commit fn
    const result = await t.execute(effectiveArgs, actor)
    if (!result.commit) return Response.json({ error: result.error || 'No commit function — the plan did not validate. ' + (result.text || '') }, { status: 400 })

    // CHAT-06 drift guard: the fresh plan must equal the plan the operator
    // SAW. Any material difference (auto-number taken, references changed,
    // cross-midnight date default) → re-review, never a silent different commit.
    if (turn) {
      const drift = planDrift(turn.plan, result.plan)
      if (drift) {
        return Response.json(
          {
            error: `The plan changed since it was shown to you (${drift}) — nothing was committed. Review the new plan and approve again.`,
            drifted: true,
            plan: result.plan,
          },
          { status: 409 },
        )
      }
    }

    const committed = await runCommit(
      { ok: true, commit: result.commit, summary: result.plan?.summary ?? effectiveToolName, creates: result.plan?.creates, updates: result.plan?.updates },
      { actorName: actor.email, actorSource: 'agent', idempotencyKey },
    )

    // CHAT-06: mark ONLY this turn approved (the old updateMany marked every
    // pending turn of the user — a stale plan from an earlier message would
    // silently look approved in the audit).
    if (turn) {
      await db.agentTurn.update({
        where: { id: turn.id },
        data: { approved: true, approvedAt: new Date(), approvedBy: actor.email },
      })
    } else {
      await db.agentTurn.updateMany({
        where: { approved: false, userId: actor.userId },
        data: { approved: true, approvedAt: new Date(), approvedBy: actor.email },
      })
    }

    // CHAT-07: the CTA pair derived from the committed docNo — View opens the
    // doc, Print opens the print route; both resolve by docNo by design.
    const docNo =
      committed?.orderNo ?? committed?.docNo ?? committed?.invoiceNo ?? committed?.poNo ??
      committed?.voucherNo ?? committed?.dcNo ?? committed?.grnNo ?? committed?.cutNo ??
      committed?.programNo ?? committed?.noteNo ?? committed?.code ?? null

    return Response.json({
      success: true,
      committed,
      docNo,
      cta: docCta(docNo),
      summary: result.plan?.summary,
    })
  } catch (err: any) {
    console.error('[/api/agent/approve] error:', err)
    return Response.json({ error: err?.message || 'Internal error' }, { status: 500 })
  }
}

/** Deep-compare stored vs fresh plan; returns a drift reason or null. */
function planDrift(storedPlanJson: string | null | undefined, freshPlan: any): string | null {
  if (!storedPlanJson) return null // pre-CHAT-06 rows: no stored plan to compare
  let stored: any
  try {
    stored = JSON.parse(storedPlanJson)
  } catch {
    return null
  }
  if (!stored || typeof stored !== 'object') return null
  const norm = (p: any) =>
    JSON.stringify(
      {
        creates: (p?.creates ?? []).map((c: any) => ({ table: c.table, data: normalizeValues(c.data) })),
        updates: (p?.updates ?? []).map((u: any) => ({ table: u.table, id: u.id, data: normalizeValues(u.data) })),
      },
    )
  if (norm(stored) !== norm(freshPlan)) {
    // name the first difference for the operator
    const sC = (stored.creates ?? []).length
    const fC = (freshPlan?.creates ?? []).length
    if (sC !== fC) return `records changed: ${sC} shown vs ${fC} now`
    for (let i = 0; i < Math.min(sC, fC); i++) {
      const sd = JSON.stringify(normalizeValues((stored.creates ?? [])[i]?.data ?? {}))
      const fd = JSON.stringify(normalizeValues((freshPlan?.creates ?? [])[i]?.data ?? {}))
      if (sd !== fd) return `field values differ on record ${i + 1} (e.g. an auto-number was taken or a reference changed)`
    }
    return 'plan contents changed'
  }
  return null
}

/** Day-level normalization for the drift compare: Dates (live objects in the
 * fresh plan, ISO strings in the stored plan) collapse to YYYY-MM-DD so a
 * same-day re-plan never false-flags as drift; anything else passes through. */
function normalizeValues(data: any): any {
  if (data === null || typeof data !== 'object') return data
  if (Array.isArray(data)) return data.map(normalizeValues)
  const out: Record<string, any> = {}
  for (const [k, v] of Object.entries(data)) {
    if (v instanceof Date) out[k] = v.toISOString().slice(0, 10)
    else if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(v)) out[k] = v.slice(0, 10)
    else if (v && typeof v === 'object') out[k] = normalizeValues(v)
    else out[k] = v
  }
  return out
}
