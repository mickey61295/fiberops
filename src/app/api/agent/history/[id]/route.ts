/**
 * /api/agent/history/[id] (SPEC-M58 FR-3/FR-4) — one conversation:
 *   GET    → {session: {id, title, updatedAt}, messages: [{role, content, createdAt}]} ascending
 *   DELETE → removes the session (messages cascade)
 * Ownership: 404 unknown id, 403 another user's session — the caller's own
 * data only. requireApiSession → 401 JSON (the Wave B guard family).
 */
import { NextRequest, NextResponse } from 'next/server'
import { requireApiSession } from '@/lib/auth/api-guard'
import { getChatSession, deleteChatSession } from '@/lib/agent/history'

export const runtime = 'nodejs'

type Ctx = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, ctx: Ctx) {
  const guard = await requireApiSession()
  if (guard.error) return guard.error
  const { id } = await ctx.params
  const session = await getChatSession(guard.user.id, id)
  if (!session) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  return NextResponse.json({
    session: { id: session.id, title: session.title, updatedAt: session.updatedAt },
    messages: session.messages.map((m) => ({ role: m.role, content: m.content, createdAt: m.createdAt })),
  })
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  const guard = await requireApiSession()
  if (guard.error) return guard.error
  const { id } = await ctx.params
  const deleted = await deleteChatSession(guard.user.id, id)
  if (!deleted) return NextResponse.json({ error: 'Conversation not found' }, { status: 404 })
  return NextResponse.json({ ok: true, id })
}
