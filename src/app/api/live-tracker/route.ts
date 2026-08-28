/**
 * Live tracker snapshot endpoint (M9 Wave A): one GET → the full
 * LiveSnapshot JSON. This is BOTH the polling fallback for the client hook
 * and a handy ops probe (curl-able). Session-guarded per the M7-B rule
 * (requireApiSession — middleware never matches /api).
 */
import { requireApiSession } from '@/lib/auth/api-guard'
import { collectLiveSnapshot } from '@/lib/erp/live-snapshot'

export const dynamic = 'force-dynamic'

export async function GET() {
  const guard = await requireApiSession()
  if (guard.error) return guard.error
  try {
    const snapshot = await collectLiveSnapshot()
    return Response.json(snapshot, {
      headers: { 'Cache-Control': 'no-store' },
    })
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Snapshot failed' },
      { status: 500 },
    )
  }
}
