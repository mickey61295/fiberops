/**
 * Chat-history persistence + query services (SPEC-M58, ADR-026 Batch 1).
 *
 * DESIGN (ADR-026): AgentTurn stays the untouched approval/audit ledger —
 * these helpers own the user-facing conversation record. Every write is
 * best-effort by contract: the caller wraps them in .catch(() => null) so
 * a history failure NEVER kills or slows an agent turn (the AgentTurn
 * precedent). Reads are owner-scoped at the API layer.
 */
import { db } from '@/lib/db'

export const HISTORY_TITLE_MAX = 60

/** Derive the session title from its first user prompt. */
export function titleFromPrompt(prompt: string): string {
  const t = prompt.replace(/\s+/g, ' ').trim()
  if (!t) return '(no title)'
  return t.length > HISTORY_TITLE_MAX ? `${t.slice(0, HISTORY_TITLE_MAX - 1)}…` : t
}

/**
 * Persist one completed turn under a session. Creates the ChatSession on
 * first sight (title from the prompt), bumps updatedAt on re-use, and
 * appends one ChatMessage per text (the user prompt + each assistant text
 * of the turn, in order). Skipped silently when there is nothing to write
 * (no session id / no user text / no texts) — a pure no-op, never a throw
 * in the caller's hot path.
 */
export async function persistTurnHistory(
  sessionId: string | undefined | null,
  userId: string,
  userText: string,
  assistantTexts: string[],
): Promise<void> {
  if (!sessionId || !sessionId.trim()) return
  const prompt = userText.trim()
  const texts = assistantTexts.filter((t) => t && t.trim())
  if (!prompt && texts.length === 0) return

  const existing = await db.chatSession.findUnique({ where: { id: sessionId } })
  if (!existing) {
    await db.chatSession.create({
      data: { id: sessionId, userId, title: titleFromPrompt(prompt) },
    })
  } else if (existing.userId !== userId) {
    // Session ids are client-generated; a collision across users would
    // silently merge conversations — refuse instead (id is a cuid/uuid,
    // so this is defense-in-depth, never expected in practice).
    return
  }
  await db.chatSession.update({
    where: { id: sessionId },
    data: { updatedAt: new Date() },
  })

  const rows: { role: string; content: string }[] = []
  if (prompt) rows.push({ role: 'user', content: prompt })
  for (const t of texts) rows.push({ role: 'assistant', content: t })
  if (rows.length) {
    await db.chatMessage.createMany({ data: rows.map((r) => ({ ...r, sessionId })) })
  }
}

/** The user's sessions, newest first, capped. */
export async function listChatSessions(userId: string, cap = 50) {
  return db.chatSession.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    take: cap,
    select: {
      id: true,
      title: true,
      updatedAt: true,
      createdAt: true,
      _count: { select: { messages: true } },
    },
  })
}

/** One session with its messages ascending. null = unknown id. */
export async function getChatSession(userId: string, sessionId: string) {
  const session = await db.chatSession.findUnique({
    where: { id: sessionId },
    include: { messages: { orderBy: { createdAt: 'asc' } } },
  })
  if (!session || session.userId !== userId) return null
  return session
}

/** Delete one of the user's own sessions (messages cascade). */
export async function deleteChatSession(userId: string, sessionId: string) {
  const session = await db.chatSession.findUnique({ where: { id: sessionId } })
  if (!session || session.userId !== userId) return null
  await db.chatSession.delete({ where: { id: sessionId } })
  return session
}
