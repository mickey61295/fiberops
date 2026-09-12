/**
 * GET /api/agent/history (SPEC-M58 FR-2) — the user's conversation list
 * (newest first, last 50): {sessions: [{id, title, updatedAt, createdAt,
 * messageCount}]}. requireApiSession → 401 JSON (the Wave B guard family).
 */
import { NextResponse } from 'next/server'
import { requireApiSession } from '@/lib/auth/api-guard'
import { listChatSessions } from '@/lib/agent/history'

export const runtime = 'nodejs'

export async function GET() {
  const guard = await requireApiSession()
  if (guard.error) return guard.error
  const sessions = await listChatSessions(guard.user.id)
  return NextResponse.json({
    sessions: sessions.map((s) => ({
      id: s.id,
      title: s.title,
      updatedAt: s.updatedAt,
      createdAt: s.createdAt,
      messageCount: s._count.messages,
    })),
  })
}
