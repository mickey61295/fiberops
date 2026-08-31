/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from '@/lib/db'
import { getTool } from '@/lib/agent/tools'
import { requireApiSession } from '@/lib/auth/api-guard'
import { runCommit } from '@/lib/erp/audit'
import { normalizeArgs, parseWithCoercion } from '@/lib/agent/parse-with-coercion'

// Approval endpoint - client posts { toolName, args, approvalId } and we
// execute commit().
// SPEC-M7 Wave B — guarded + the session user is the APPROVAL ACTOR:
//   - execute() receives the actor so approval commits stamp
//     Approval.approvedBy = the human's email (was hardcoded 'agent')
//   - AgentTurn rows for this user get approvedBy/approvedAt
// SPEC-M9 §9 M15 — the AGENT DOOR audit choke point: every approved tool
// commit routes through runCommit (the engine-level audit executor).
// SPEC-M30 (QoL1 D-1 + D-3) — the two doors execute IDENTICAL inputs:
//   - args go through the SAME normalizeArgs → parseWithCoercion pipeline
//     the proposing loop used (a plan proposed with coerced args commits
//     with the SAME coerced args — the parse-with-coercion contract);
//   - approvalId is REQUIRED and verified against the persisted AgentTurn
//     row: unknown → 404, already-approved → 409 (idempotency), regenerated
//     plan differs from the persisted one → 409 plan_changed (the TOCTOU
//     guard — doc numbers can shift between proposal and approval);
//   - the approved-marking updateMany is SCOPED to the correlated row (the
//     pre-M30 bug flipped EVERY pending turn of the user).

function planShape(p: any) {
  return {
    summary: p?.summary ?? null,
    creates: p?.creates?.length ?? 0,
    updates: p?.updates?.length ?? 0,
    sideEffects: p?.sideEffects?.length ?? 0,
  }
}

function plansDiffer(persisted: any, regenerated: any): boolean {
  const a = planShape(persisted)
  const b = planShape(regenerated)
  return (
    a.summary !== b.summary ||
    a.creates !== b.creates ||
    a.updates !== b.updates ||
    a.sideEffects !== b.sideEffects
  )
}

export async function POST(req: Request) {
  const guard = await requireApiSession()
  if (guard.error) return guard.error
  const actor = { userId: guard.user.id, email: guard.user.email, name: guard.user.name }
  try {
    const { toolName, args, approvalId } = await req.json()
    const t = getTool(toolName)
    if (!t) return Response.json({ error: 'Unknown tool' }, { status: 400 })
    if (!t.isWrite) return Response.json({ error: 'Tool is read-only' }, { status: 400 })
    if (!approvalId || typeof approvalId !== 'string') {
      return Response.json(
        { error: 'approvalId required (SPEC-M30: the panel round-trips the proposing turn token)' },
        { status: 400 },
      )
    }

    // SPEC-M30 D-1: the SAME arg pipeline as the proposing loop — the plan
    // the user saw was built with coerced, zod-validated args; the commit
    // must execute the identical input.
    const normalized = normalizeArgs(args ?? {})
    const parsed = parseWithCoercion(t.schema, normalized)
    if (!parsed.ok) {
      const issues = (parsed.error?.issues || [])
        .map((i: any) => `${(i.path || []).join('.') || '(root)'}: ${i.message}`)
        .join('; ')
      return Response.json(
        { error: `Invalid arguments for ${toolName}: ${issues || parsed.error?.message || 'validation failed'}` },
        { status: 400 },
      )
    }

    // SPEC-M30 D-3: resolve + verify the correlated turn
    const turn = await db.agentTurn.findFirst({
      where: { approvalId, userId: actor.userId },
    })
    if (!turn) {
      return Response.json(
        { error: 'Unknown approval — the proposing turn was not found for this user' },
        { status: 404 },
      )
    }
    if (turn.approved) {
      return Response.json(
        { error: 'already_approved', detail: 'This plan was already approved and committed' },
        { status: 409 },
      )
    }

    // Re-execute to get the plan + commit fn
    const result = await t.execute(parsed.value, actor)
    if (!result.commit) return Response.json({ error: 'No commit function' }, { status: 500 })

    // TOCTOU guard: the regenerated plan must match the persisted one the
    // user actually SAW (summary carries the doc numbers; counts carry shape).
    const persistedPlan = turn.plan ? JSON.parse(turn.plan) : null
    if (!persistedPlan || plansDiffer(persistedPlan, result.plan)) {
      return Response.json(
        {
          error: 'plan_changed',
          detail:
            'The plan changed since you approved it (e.g. a document number shifted). ' +
            'Ask the agent to re-propose, then approve the fresh plan.',
          persisted: planShape(persistedPlan),
          regenerated: planShape(result.plan),
        },
        { status: 409 },
      )
    }

    const committed = await runCommit(
      { ok: true, commit: result.commit, summary: result.plan?.summary ?? toolName, creates: result.plan?.creates, updates: result.plan?.updates },
      { actorName: actor.email, actorSource: 'agent' },
    )

    // Mark ONLY the correlated turn approved (pre-M30 this flipped every
    // pending turn of the user)
    await db.agentTurn.updateMany({
      where: { approvalId, userId: actor.userId, approved: false },
      data: { approved: true, approvedAt: new Date(), approvedBy: actor.email },
    })

    return Response.json({
      success: true,
      committed,
      summary: result.plan?.summary,
      approvalId,
    })
  } catch (err: any) {
    console.error('[/api/agent/approve] error:', err)
    return Response.json({ error: err?.message || 'Internal error' }, { status: 500 })
  }
}
