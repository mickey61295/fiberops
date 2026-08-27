/**
 * Page guard (SPEC-M7 §3) — EDGE runtime, zero db access: verify the session
 * cookie cryptographically and 307-redirect unauthenticated visitors to
 * /login?next=<path>. APIs are deliberately NOT matched in Wave A (SPEC-M7 §2:
 * Wave B adds 401 JSON + cookie fixtures for the cookie-less test suites).
 */
import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session'

export const config = {
  // Everything except /api, /login, Next internals and dotted static assets.
  matcher: ['/((?!api|login|_next/static|_next/image|favicon\\.ico|.*\\..*).*)'],
}

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  const userId = await verifySessionToken(token)
  if (userId) return NextResponse.next()

  const url = req.nextUrl.clone()
  url.pathname = '/login'
  url.search = `next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`
  return NextResponse.redirect(url)
}
