/**
 * GET /api/tracker — the Live Operations Tracker feed (SPEC-M9 §3).
 *
 * The ONE HTTP door over getTrackerSnapshot. Session-guarded like the rest of
 * the guarded family (SPEC-M7 Wave B): no session → 401 JSON (the browser
 * client polls same-origin with the fo_session cookie; scripts use the cookie
 * fixture). Optional ?feedLimit=1..40 (default 30; out-of-range → 400 — the
 * cap keeps a runaway client from asking for an unbounded feed).
 */
import { getTrackerSnapshot, FEED_LIMIT_MAX } from '@/lib/erp/tracker'
import { requireApiSession } from '@/lib/auth/api-guard'

export async function GET(req: Request) {
  const guard = await requireApiSession()
  if (guard.error) return guard.error
  try {
    const url = new URL(req.url)
    const rawLimit = url.searchParams.get('feedLimit')
    let feedLimit: number | undefined
    if (rawLimit !== null) {
      const n = Number(rawLimit)
      if (!Number.isInteger(n) || n < 1 || n > FEED_LIMIT_MAX) {
        return Response.json({ error: `feedLimit must be an integer 1..${FEED_LIMIT_MAX}` }, { status: 400 })
      }
      feedLimit = n
    }
    const snapshot = await getTrackerSnapshot({ feedLimit })
    return Response.json(snapshot, { headers: { 'Cache-Control': 'no-store' } })
  } catch (e) {
    return Response.json({ error: 'tracker failed', detail: String(e) }, { status: 500 })
  }
}
