/**
 * POST /api/auth/sessions/clear (SPEC-M60 FR-A8) — "sign out all devices"
 * on the profile: bump User.tokenVersion (every OTHER device's cookie dies
 * at its next request) and re-issue THIS session's cookie at the new
 * version (the button-presser stays signed in).
 */
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { requireApiSession } from '@/lib/auth/api-guard'
import { setLoginCookies } from '@/lib/auth/login-cookies'
import { clientIp, recordLoginAudit, userAgentOf } from '@/lib/auth/security'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  const guard = await requireApiSession()
  if (guard.error) return guard.error

  const updated = await db.user.update({
    where: { id: guard.user.id },
    data: { tokenVersion: { increment: 1 } },
    select: { id: true, role: true, tokenVersion: true, userGroupId: true },
  })
  const res = NextResponse.json({ ok: true, signedOutOtherDevices: true })
  await setLoginCookies(res, updated)
  await recordLoginAudit({
    userId: guard.user.id,
    email: guard.user.email,
    event: 'sessions_cleared',
    ip: clientIp(req),
    userAgent: userAgentOf(req),
    detail: 'sign out all devices (this session re-issued)',
  })
  return res
}
