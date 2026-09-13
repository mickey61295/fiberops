/**
 * POST /api/auth/login (SPEC-M7 §6 + SPEC-M60 FR-A6/A7) — verify
 * email+password against the User row (scrypt), stamp lastLoginAt, set the
 * fo_session cookie. Timing-safe: unknown email burns a dummy scrypt verify
 * so response time does not reveal user existence.
 *
 * M60: the lockout is honored HERE, before credential verification — after
 * LOCKOUT.attempts failed logins on one email within LOCKOUT.windowMinutes,
 * the email is locked LOCKOUT.lockMinutes (even the CORRECT password is
 * refused while locked). Attempts while locked record outcome 'locked'
 * (audited, never extending the fixed window). Every outcome writes a
 * LoginAttempt row (the lockout ledger) + a LoginAudit row (the register).
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { burnDummyPassword, verifyPassword } from '@/lib/auth/password'
import { setLoginCookies } from '@/lib/auth/login-cookies'
import {
  assessLockout,
  clientIp,
  recentFailAttempts,
  recordAttempt,
  recordLoginAudit,
  userAgentOf,
} from '@/lib/auth/security'

export const runtime = 'nodejs'

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const parsed = LoginSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json({ error: 'email and password are required' }, { status: 400 })
  }
  const email = parsed.data.email.toLowerCase().trim()
  const ip = clientIp(req)
  const userAgent = userAgentOf(req)

  // FR-A6 — the lockout check precedes credential verification (SPEC-M60 §2).
  const fails = await recentFailAttempts(email)
  const lock = assessLockout(fails, new Date())
  if (lock.locked) {
    const minutesLeft = Math.max(1, Math.ceil(lock.remainingMs / 60000))
    await recordAttempt({ email, userId: null, ip, userAgent, outcome: 'locked' })
    await recordLoginAudit({
      userId: null,
      email,
      event: 'login_locked',
      ip,
      userAgent,
      detail: `refused — locked ${minutesLeft} min left`,
    })
    return NextResponse.json(
      { error: `Too many failed attempts — this account is locked for ${minutesLeft} more minute${minutesLeft === 1 ? '' : 's'}` },
      { status: 429 },
    )
  }

  const user = await db.user.findUnique({ where: { email } })

  if (!user) {
    await burnDummyPassword(parsed.data.password)
    await recordAttempt({ email, userId: null, ip, userAgent, outcome: 'fail' })
    await recordLoginAudit({ userId: null, email, event: 'login_fail', ip, userAgent, detail: 'unknown email' })
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }
  if (!user.active || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    await recordAttempt({ email, userId: user.id, ip, userAgent, outcome: 'fail' })
    await recordLoginAudit({ userId: user.id, email, event: 'login_fail', ip, userAgent, detail: user.active ? 'bad password' : 'inactive user' })
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  const updated = await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
    select: { id: true, name: true, email: true, role: true, tokenVersion: true, userGroupId: true },
  })
  await recordAttempt({ email, userId: user.id, ip, userAgent, outcome: 'success' })
  await recordLoginAudit({ userId: user.id, email, event: 'login', ip, userAgent })
  const res = NextResponse.json({
    ok: true,
    user: { id: updated.id, name: updated.name, email: updated.email, role: updated.role },
  })
  await setLoginCookies(res, updated) // fo_session + fo_rights (SPEC-M7 Wave C; M60: token carries tv)
  return res
}
