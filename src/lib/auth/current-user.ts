/**
 * Server-side current-user lookup (SPEC-M7 §3 + §4 Wave C) — Node runtime ONLY
 * (next/headers + Prisma). Middleware NEVER imports this; it verifies the token
 * edge-side with verifySessionToken alone. This is the second layer: a token may
 * be valid but the user deleted/deactivated mid-session → null → layout
 * redirects to /login.
 *
 * Wave C: the lookup also carries the user's UserGroup.rights snapshot (null =
 * no group assigned) so callers can enforce menu rights FRESH from the DB —
 * the (erp) layout filters the NavSidebar and re-checks the current route
 * with it; the edge middleware's fo_rights cookie is only a pre-filter.
 */
import { cookies } from 'next/headers'
import { db } from '@/lib/db'
import { SESSION_COOKIE, verifySessionToken } from './session'

export type SessionUser = {
  id: string
  name: string
  email: string
  role: string
  /** Group rights snapshot (menu group ids; [] = all). null = no group
   *  assigned → full access (ADR-018 back-compat rule). */
  rights: string[] | null
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  const userId = await verifySessionToken(token)
  if (!userId) return null
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
      userGroup: { select: { rights: true } },
    },
  })
  if (!user || !user.active) return null
  const rights = Array.isArray(user.userGroup?.rights) ? (user.userGroup!.rights as string[]) : null
  return { id: user.id, name: user.name, email: user.email, role: user.role, rights }
}
