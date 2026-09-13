/**
 * POST /api/auth/logout (SPEC-M7 §6 + SPEC-M60 FR-A7) — expire the
 * fo_session cookie AND write the logout audit row (the register's
 * "who left, when" line). Idempotent: no session → still 200, no audit row.
 */
import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth/session'
import { getSessionUser } from '@/lib/auth/current-user'
import { clientIp, recordLoginAudit, userAgentOf } from '@/lib/auth/security'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (user) {
    await recordLoginAudit({
      userId: user.id,
      email: user.email,
      event: 'logout',
      ip: clientIp(req),
      userAgent: userAgentOf(req),
    })
  }
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}
