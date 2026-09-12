/**
 * PATCH /api/auth/profile (SPEC-M57 FR-2) — the self-service profile door:
 * every logged-in user can update their OWN display name. Guards (in
 * order):
 *   1. requireApiSession → 401 JSON when not logged in
 *   2. zod body {name: trimmed 2–60 chars}
 *
 * The session cookie signs id/email/role — NOT the name — so no token
 * re-issue is needed; the (erp) layout re-reads the row every render and
 * the topbar chip updates on router.refresh(). Email/role changes stay
 * admin-only at /admin/users (this door is deliberately narrow).
 */
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireApiSession } from '@/lib/auth/api-guard'

export const runtime = 'nodejs'

const BodySchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(60, 'Name must be at most 60 characters'),
})

export async function PATCH(req: NextRequest) {
  const guard = await requireApiSession()
  if (guard.error) return guard.error

  const parsed = BodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'name (2–60 chars) required' },
      { status: 400 },
    )
  }

  const user = await db.user.update({
    where: { id: guard.user.id },
    data: { name: parsed.data.name },
    select: { name: true },
  })
  return NextResponse.json({ ok: true, name: user.name })
}
