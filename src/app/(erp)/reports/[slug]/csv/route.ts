/** CSV export for every report (SPEC-M6 §4) — same service, same filters.
 *  One dynamic route covers the whole registry (per-slug routes would be 28
 *  copies; the makeCsvRouteHandler pattern generalizes cleanly). */
import { makeReportCsvRouteHandler } from '@/lib/erp/reports/report-csv'

export const dynamic = 'force-dynamic'

export async function GET(req: Request, ctx: { params: Promise<{ slug: string }> }): Promise<Response> {
  const { slug } = await ctx.params
  const handler = makeReportCsvRouteHandler(slug)
  return handler(req)
}
