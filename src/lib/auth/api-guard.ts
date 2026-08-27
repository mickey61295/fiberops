/**
 * SPEC-M7 Wave B — API route guard. Node runtime ONLY (reuses the Node-only
 * getSessionUser from current-user.ts: cookies() + Prisma re-check, so a
 * deactivated/deleted user fails here too — the same two-layer rule the
 * (erp) layout applies for pages).
 *
 * Contract (SPEC-M7 §4 Wave B): every /api/erp, /api/agent, /api/agent/approve,
 * /api/upload and /api/seed handler calls this FIRST and returns
 * `guard.error` verbatim when the session is missing → 401 JSON
 * `{"error":"Authentication required"}`. /api/auth/* stays open (it IS the
 * login mechanism); middleware never matches /api (Wave A matcher rule), so
 * this helper is the ONLY API-side guard layer.
 */
import { getSessionUser, type SessionUser } from './current-user'

export type ApiGuard =
  | { user: SessionUser; error?: undefined }
  | { user?: undefined; error: Response }

export async function requireApiSession(): Promise<ApiGuard> {
  const user = await getSessionUser()
  if (!user) {
    return {
      error: Response.json({ error: 'Authentication required' }, { status: 401 }),
    }
  }
  return { user }
}
