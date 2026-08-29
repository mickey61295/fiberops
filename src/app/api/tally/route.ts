/**
 * GET /api/tally?from=&to= — Tally JSON export (SPEC-M19 §4 Wave D, open
 * decision #3 resolved as "JSON adapter"). Session-guarded like the rest of
 * the API family; returns the import-shaped JSON as an attachment.
 */
import { requireApiSession } from '@/lib/auth/api-guard'
import { buildTallyExport } from '@/lib/erp/registers/tally'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const guard = await requireApiSession()
  if (guard.error) return guard.error
  try {
    const url = new URL(req.url)
    const toStr = url.searchParams.get('to')
    const fromStr = url.searchParams.get('from')
    const to = toStr ? new Date(toStr) : new Date()
    if (isNaN(to.getTime())) return Response.json({ error: 'Invalid "to" date' }, { status: 400 })
    const from = fromStr ? new Date(fromStr) : new Date(to.getTime() - 30 * 24 * 3600 * 1000)
    if (isNaN(from.getTime())) return Response.json({ error: 'Invalid "from" date' }, { status: 400 })
    if (from > to) return Response.json({ error: '"from" must precede "to"' }, { status: 400 })

    const payload = await buildTallyExport(from, to)
    return new Response(JSON.stringify(payload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="tally-${payload.fromDate}-to-${payload.toDate}.json"`,
      },
    })
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'tally export failed' }, { status: 500 })
  }
}
