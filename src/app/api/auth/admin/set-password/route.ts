/**
 * POST /api/auth/admin/set-password (SPEC-M7 §4 Wave C) — the admin password
 * door for /admin/users: set (or replace) a user's password, or CLEAR it
 * (passwordHash → null = the user cannot log in until an admin sets one).
 *
 * Guards (in order):
 *   1. requireApiSession (Wave B) → 401 JSON when not logged in
 *   2. session user role === 'admin' → 403 otherwise (rights live in the GROUP
 *      matrix, but password administration is a ROLE door — an admin can
 *      always reach this, including to fix a broken rights setup: ADR-018)
 *   3. zod body: {userId, password?(min 8) | clear:true} — exactly one
 *   4. clear-own-password rejected (an admin would instantly log themselves
 *      out mid-session); setting/changing one's OWN password is allowed
 *
 * The first-run bootstrap route stays the ONLY self-serve password door and
 * it self-locks forever once any password exists — this route is the ongoing
 * admin-managed lifecycle (set at hire, reset on forget, clear on leave).
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireApiSession } from '@/lib/auth/api-guard'
import { hashPassword } from '@/lib/auth/password'

export const runtime = 'nodejs'

const BodySchema = z
  .object({
    userId: z.string().min(1),
    password: z.string().min(8).optional(),
    clear: z.boolean().optional(),
  })
  .refine((b) => (b.password ? !b.clear : b.clear === true), {
    message: 'provide either password (min 8 chars) or clear:true — not both',
  })

export async function POST(req: NextRequest) {
  const guard = await requireApiSession()
  if (guard.error) return guard.error
  if (guard.user.role !== 'admin') {
    return NextResponse.json({ error: 'Admin role required' }, { status: 403 })
  }

  const parsed = BodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'invalid body' },
      { status: 400 },
    )
  }
  const { userId, password, clear } = parsed.data

  const target = await db.user.findUnique({ where: { id: userId }, select: { id: true, email: true } })
  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 })
  }

  if (clear) {
    if (target.id === guard.user.id) {
      return NextResponse.json(
        { error: 'Cannot clear your own password — you would be locked out mid-session' },
        { status: 400 },
      )
    }
    await db.user.update({ where: { id: userId }, data: { passwordHash: null } })
    return NextResponse.json({ ok: true, user: target, passwordHash: null })
  }

  const passwordHash = await hashPassword(password!)
  await db.user.update({ where: { id: userId }, data: { passwordHash } })
  return NextResponse.json({ ok: true, user: target, passwordHash: 'set' })
}
