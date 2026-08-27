/**
 * Server-side current-user lookup (SPEC-M7 §3) — Node runtime ONLY (next/headers
 * + Prisma). Middleware NEVER imports this; it verifies the token edge-side with
 * verifySessionToken alone. This is the second layer: a token may be valid but
 * the user deleted/deactivated mid-session → null → layout redirects to /login.
 */
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { SESSION_COOKIE, verifySessionToken } from './session'

export type SessionUser = {
  id: string
  name: string
  email: string
  role: string
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const userId = await verifySessionToken(token)
  if (!userId) return null
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, role: true, active: true },
  })
  if (!user || !user.active) return null
  return { id: user.id, name: user.name, email: user.email, role: user.role }
}
