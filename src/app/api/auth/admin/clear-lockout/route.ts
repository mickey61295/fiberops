/**
 * POST /api/auth/admin/clear-lockout (SPEC-M60 FR-A6) — the admin door that
 * unblocks a locked email NOW: delete the email's fail/locked rows from the
 * LoginAttempt ledger (the lockout math input). LoginAudit keeps the story
 * (a lockout_clear row records who cleared what). The set-password admin
 * door pattern: requireApiSession + role === 'admin'.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireApiSession } from '@/lib/auth/api-guard'
import { clientIp, recordLoginAudit, userAgentOf } from '@/lib/auth/security'

export const runtime = 'nodejs'

const BodySchema = z.object({ email: z.string().email() })

export async function POST(req: NextRequest) {
  const guard = await requireApiSession()
  if (guard.error) return guard.error
  if (guard.user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin role required' }, { status: 403 })
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'email is required' }, { status: 400 })
  }
  const email = parsed.data.email.toLowerCase().trim()

  const cleared = await db.loginAttempt.deleteMany({
    where: { email, outcome: { in: ['fail', 'locked'] } },
  })
  await recordLoginAudit({
    userId: guard.user.id,
    email,
    event: 'lockout_clear',
    ip: clientIp(req),
    userAgent: userAgentOf(req),
    detail: `${cleared.count} ledger rows removed by admin ${guard.user.email}`,
  })
  return NextResponse.json({ ok: true, email, cleared: cleared.count })
}
