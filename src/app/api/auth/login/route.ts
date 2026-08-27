/**
 * POST /api/auth/login (SPEC-M7 §6) — verify email+password against the User
 * row (scrypt), stamp lastLoginAt, set the fo_session cookie. Timing-safe:
 * unknown email burns a dummy scrypt verify so response time does not reveal
 * user existence.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { burnDummyPassword, verifyPassword } from '@/lib/auth/password'
import { createSessionToken, SESSION_COOKIE, SESSION_TTL_SECONDS } from '@/lib/auth/session'

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
  const user = await db.user.findUnique({ where: { email } })

  if (!user) {
    await burnDummyPassword(parsed.data.password)
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }
  if (!user.active || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 })
  }

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
  const token = await createSessionToken(user.id)
  const res = NextResponse.json({
    ok: true,
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
  })
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
    secure: process.env.NODE_ENV === 'production',
  })
  return res
}
