/**
 * POST /api/auth/bootstrap (SPEC-M7 §6) — FIRST-RUN door: allowed only while NO
 * user has a passwordHash. Sets the password on the existing admin (pre-filled
 * email, typically admin@fiberpro.local from the M6-B master) or creates a new
 * admin user; then logs the bootstrap admin in. Once any password exists this
 * route is permanently closed (403) — password changes live in /admin/users
 * (Wave C) or via scripts/seed_admin.ts by an operator.
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth/password'
import { createSessionToken, SESSION_COOKIE, SESSION_TTL_SECONDS } from '@/lib/auth/session'

export const runtime = 'nodejs'

const BootstrapSchema = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  password: z.string().min(8),
})

export async function POST(req: NextRequest) {
  const anyPassword = await db.user.findFirst({
    where: { passwordHash: { not: null } },
    select: { id: true },
  })
  if (anyPassword) {
    return NextResponse.json(
      { error: 'Bootstrap is closed — an administrator password already exists' },
      { status: 403 },
    )
  }

  const parsed = BootstrapSchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'password must be at least 8 characters; email (optional) must be valid' },
      { status: 400 },
    )
  }

  const email = (parsed.data.email ?? 'admin@fiberpro.local').toLowerCase().trim()
  const passwordHash = await hashPassword(parsed.data.password)
  const existing = await db.user.findUnique({ where: { email } })

  const user = existing
    ? await db.user.update({
        where: { id: existing.id },
        data: { passwordHash, active: true, lastLoginAt: new Date() },
      })
    : await db.user.create({
        data: {
          email,
          name: parsed.data.name ?? 'Administrator',
          role: 'admin',
          passwordHash,
          lastLoginAt: new Date(),
        },
      })

  const token = await createSessionToken(user.id)
  const res = NextResponse.json({
    ok: true,
    bootstrap: true,
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
