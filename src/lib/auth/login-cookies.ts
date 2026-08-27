/**
 * Login cookie setter (SPEC-M7 §4 Wave C) — Node runtime ONLY (Prisma read of
 * the user's group rights). Sets BOTH auth cookies on a login response:
 *   fo_session — the signed session token (Wave A)
 *   fo_rights  — the signed {role, rights} snapshot for the edge middleware's
 *                per-route pre-check (Wave C); the (erp) layout re-checks
 *                fresh from the DB, so this cookie is an optimization/pre-filter
 *                and its absence never grants anything.
 * Shared by /api/auth/login and /api/auth/bootstrap (one door, no drift).
 */
import type { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { createSessionToken, SESSION_COOKIE, SESSION_TTL_SECONDS } from './session'
import { signRightsToken, RIGHTS_COOKIE } from './rights'

export async function setLoginCookies(
  res: NextResponse,
  user: { id: string; role: string; userGroupId?: string | null },
): Promise<void> {
  const group = user.userGroupId
    ? await db.userGroup.findUnique({ where: { id: user.userGroupId }, select: { rights: true } })
    : null
  const rights = Array.isArray(group?.rights) ? (group!.rights as string[]) : []

  const token = await createSessionToken(user.id)
  const rightsToken = await signRightsToken(user.role, rights)
  const opts = {
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
    secure: process.env.NODE_ENV === 'production',
  }
  res.cookies.set(SESSION_COOKIE, token, opts)
  res.cookies.set(RIGHTS_COOKIE, rightsToken, opts)
}
