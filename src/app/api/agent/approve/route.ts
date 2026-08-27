/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from '@/lib/db'
import { getTool } from '@/lib/agent/tools'
import { requireApiSession } from '@/lib/auth/api-guard'

// Approval endpoint - client posts { toolName, args } and we execute commit()
// SPEC-M7 Wave B — guarded + the session user is the APPROVAL ACTOR:
//   - execute() receives the actor so approval commits stamp
//     Approval.approvedBy = the human's email (was hardcoded 'agent')
//   - AgentTurn rows for this user get approvedBy/approvedAt
export async function POST(req: Request) {
  const guard = await requireApiSession()
  if (guard.error) return guard.error
  const actor = { userId: guard.user.id, email: guard.user.email, name: guard.user.name }
  try {
    const { toolName, args } = await req.json()
    const t = getTool(toolName)
    if (!t) return Response.json({ error: 'Unknown tool' }, { status: 400 })
    if (!t.isWrite) return Response.json({ error: 'Tool is read-only' }, { status: 400 })

    // Re-execute to get the plan + commit fn
    const result = await t.execute(args, actor)
    if (!result.commit) return Response.json({ error: 'No commit function' }, { status: 500 })

    const committed = await result.commit()

    // Update latest agent turn for this user to mark approved (scoped to the
    // actor's turns — pre-M7B this marked EVERY pending turn globally)
    await db.agentTurn.updateMany({
      where: { approved: false, userId: actor.userId },
      data: { approved: true, approvedAt: new Date(), approvedBy: actor.email },
    })

    return Response.json({
      success: true,
      committed,
      summary: result.plan?.summary,
    })
  } catch (err: any) {
    console.error('[/api/agent/approve] error:', err)
    return Response.json({ error: err?.message || 'Internal error' }, { status: 500 })
  }
}
