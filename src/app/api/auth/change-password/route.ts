/**
 * POST /api/auth/change-password (SPEC-M18 §4-C4) — the self-service password
 * door (legacy FrmChangePassword). Every logged-in user can change their OWN
 * password: verify current → hash new → update. The admin-managed lifecycle
 * (set/clear anyone's) stays admin-only at /api/auth/admin/set-password.
 *
 * Guards (in order):
 *   1. requireApiSession → 401 JSON when not logged in
 *   2. zod body {currentPassword (min 1), newPassword (min 8)}
 *   3. verifyPassword(current, stored) → 401 'Current password is incorrect'
 *      (also covers passwordHash == null — such users bootstrap via admin)
 *
 * The session cookie stays valid (it signs user id/email/role, not the hash).
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireApiSession } from '@/lib/auth/api-guard'
import { hashPassword, verifyPassword } from '@/lib/auth/password'

export const runtime = 'nodejs'

const BodySchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
})

export async function POST(req: NextRequest) {
  const guard = await requireApiSession()
  if (guard.error) return guard.error

  const parsed = BodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'currentPassword and newPassword (min 8 chars) required' },
      { status: 400 },
    )
  }
  const { currentPassword, newPassword } = parsed.data

  const user = await db.user.findUnique({
    where: { id: guard.user.id },
    select: { id: true, email: true, passwordHash: true },
  })
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  const ok = await verifyPassword(currentPassword, user.passwordHash)
  if (!ok) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 401 })
  }
  if (currentPassword === newPassword) {
    return NextResponse.json({ error: 'New password must differ from the current one' }, { status: 400 })
  }

  const passwordHash = await hashPassword(newPassword)
  await db.user.update({ where: { id: user.id }, data: { passwordHash } })
  return NextResponse.json({ ok: true, email: user.email, passwordHash: 'set' })
}
