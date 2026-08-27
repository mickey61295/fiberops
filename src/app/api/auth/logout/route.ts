/**
 * POST /api/auth/logout (SPEC-M7 §6) — expire the fo_session cookie.
 */
import { NextResponse } from 'next/server'
import { SESSION_COOKIE } from '@/lib/auth/session'

export const runtime = 'nodejs'

export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}
