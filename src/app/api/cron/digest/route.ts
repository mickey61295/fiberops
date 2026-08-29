/**
 * /api/cron/digest — SPEC-M9 §9 M13.
 *   GET  → the digest JSON (preview; session OR ?secret= matching
 *          notification.cron_secret — the cron door)
 *   POST → send now (session only; flags gate the actual webhook POST)
 * No external dependency beyond fetch.
 */
import { requireApiSession } from '@/lib/auth/api-guard'
import { buildDigest, sendDigest } from '@/lib/erp/notifications/digest'
import { getFlag } from '@/lib/erp/flags'

export const dynamic = 'force-dynamic'

async function secretMatches(secretParam: string | null): Promise<boolean> {
  const configured = String(await getFlag('notification.cron_secret') ?? '').trim()
  if (!configured) return false // empty secret = session-only access (safe default)
  return secretParam === configured
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const secret = url.searchParams.get('secret')
  if (await secretMatches(secret)) {
    return Response.json(await buildDigest())
  }
  const guard = await requireApiSession()
  if (guard.error) return guard.error
  return Response.json(await buildDigest())
}

export async function POST(req: Request) {
  const guard = await requireApiSession()
  if (guard.error) return guard.error
  const result = await sendDigest()
  return Response.json(result, { status: result.ok ? 200 : 400 })
}
