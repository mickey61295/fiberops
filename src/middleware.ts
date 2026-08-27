/**
 * Page guard (SPEC-M7 §3 + §4 Wave C) — EDGE runtime, zero db access.
 *
 * Layer 1 — session: verify the fo_session cookie cryptographically and
 * 307-redirect unauthenticated visitors to /login?next=<path>. APIs are
 * deliberately NOT matched (Wave B guards them in-route with 401 JSON).
 *
 * Layer 1b — menu rights (Wave C): when the signed fo_rights cookie is
 * present, map the pathname to its menu group (menu-registry
 * findGroupForPath) and 307-redirect to the first allowed landing when the
 * group is denied. Runs on every request (RSC fetches included), so it also
 * covers client-side navigation. A missing/expired/tampered fo_rights cookie
 * simply skips this pre-check: the (erp) layout re-derives rights FRESH from
 * the DB (layer 2), so the cookie can never grant anything — at worst it is
 * stale until the user's next login (ADR-018).
 *
 * The middleware also stamps x-pathname on the request headers so the layout
 * knows which route it is rendering for its fresh layer-2 check.
 */
import { NextRequest, NextResponse } from 'next/server'
import { SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session'
import {
  RIGHTS_COOKIE,
  verifyRightsToken,
  computeAllowedGroupIds,
  firstAllowedLandingRoute,
} from '@/lib/auth/rights'
import { MENU_GROUPS, findGroupForPath } from '@/lib/erp/menu-registry'

export const config = {
  // Everything except /api, /login, Next internals and dotted static assets.
  matcher: ['/((?!api|login|_next/static|_next/image|favicon\\.ico|.*\\..*).*)'],
}

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value
  const userId = await verifySessionToken(token)
  if (!userId) {
    const url = req.nextUrl.clone()
    url.pathname = '/login'
    url.search = `next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`
    return NextResponse.redirect(url)
  }

  // Wave C — edge rights pre-check over the signed fo_rights snapshot.
  const info = await verifyRightsToken(req.cookies.get(RIGHTS_COOKIE)?.value)
  if (info) {
    const allGroupIds = MENU_GROUPS.map((g) => g.id)
    const allowed = computeAllowedGroupIds({ role: info.role, rights: info.rights, allGroupIds })
    const group = findGroupForPath(req.nextUrl.pathname)
    if (group && !allowed.has(group.id)) {
      const url = req.nextUrl.clone()
      url.pathname = firstAllowedLandingRoute(allowed, MENU_GROUPS)
      url.search = ''
      return NextResponse.redirect(url)
    }
  }

  // Pass the pathname through for the layout's fresh layer-2 rights check.
  const headers = new Headers(req.headers)
  headers.set('x-pathname', req.nextUrl.pathname)
  return NextResponse.next({ request: { headers } })
}
