/**
 * GET /api/auth/session (SPEC-M7 §6) — the current user (or null). Used by the
 * smoke script and any client that needs the session identity.
 */
import { NextResponse } from 'next/server'
import { getSessionUser } from '@/lib/auth/current-user'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const user = await getSessionUser()
  return NextResponse.json({ user })
}
