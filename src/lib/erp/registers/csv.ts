/**
 * CSV export builder + route factory — SPEC-M4 §6.
 * Pages CANNOT return Responses (Next.js rule — a page component must return
 * ReactNode; discovered the hard way in Wave A). Each register therefore gets
 * a sibling `<register>/csv/route.ts` (a different segment — no page/route
 * conflict) exporting `GET = makeCsvRouteHandler('<slug>')`.
 */
import type { RegisterConfig } from '@/lib/erp/register-configs/types'
import { getRegisterConfig } from '@/lib/erp/register-configs'
import { REGISTER_SERVICES } from './index'
import { flattenSearchParams, parseRegisterQuery } from './resolve'
import type { RegisterResult } from './types'

export function buildCsvResponse(config: RegisterConfig, result: RegisterResult): Response {
  const esc = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v)
    return /[",\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s
  }
  const lines = [config.columns.map((c) => esc(c.label)).join(',')]
  for (const r of result.rows) {
    lines.push(config.columns.map((c) => esc(r[c.name])).join(','))
  }
  const csv = lines.join('\n')
  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${config.slug}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}

/** Same filters as the screen (URL query string), same service, CSV body. */
export function makeCsvRouteHandler(slug: string) {
  return async function GET(req: Request): Promise<Response> {
    const config = getRegisterConfig(slug)
    const service = REGISTER_SERVICES[slug]
    if (!config || !service) return new Response(`Unknown register slug: ${slug}`, { status: 404 })
    const url = new URL(req.url)
    const params = flattenSearchParams(Object.fromEntries(url.searchParams.entries()))
    const query = parseRegisterQuery(config, { ...params, limit: params.limit ?? '500' })
    const result = await service(query)
    return buildCsvResponse(config, result)
  }
}
