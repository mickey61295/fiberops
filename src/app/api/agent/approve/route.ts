/* eslint-disable @typescript-eslint/no-explicit-any */
import { db } from '@/lib/db'
import { getTool } from '@/lib/agent/tools'

// Approval endpoint - client posts { toolName, args } and we execute commit()
export async function POST(req: Request) {
  try {
    const { toolName, args } = await req.json()
    const t = getTool(toolName)
    if (!t) return Response.json({ error: 'Unknown tool' }, { status: 400 })
    if (!t.isWrite) return Response.json({ error: 'Tool is read-only' }, { status: 400 })

    // Re-execute to get the plan + commit fn
    const result = await t.execute(args)
    if (!result.commit) return Response.json({ error: 'No commit function' }, { status: 500 })

    const committed = await result.commit()

    // Update latest agent turn for this prompt to mark approved
    await db.agentTurn.updateMany({
      where: { approved: false },
      data: { approved: true, approvedAt: new Date(), approvedBy: 'user' },
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
