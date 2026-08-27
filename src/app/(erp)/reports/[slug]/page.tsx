/**
 * /reports/[slug] — the report runner (SPEC-M6 §4/§9). Dynamic slug page over
 * the report registry: unknown slug → 404 (the register-page recipe with the
 * report layer swapped in). ?copy= is a print-only param (W7) — parsed off
 * before the filter bar sees the params.
 */
import { notFound } from 'next/navigation'
import { getReportConfig } from '@/lib/erp/report-configs'
import { REPORT_SERVICES } from '@/lib/erp/reports'
import { flattenSearchParams, parseRegisterQuery } from '@/lib/erp/registers/resolve'
import { RegisterQuery } from '@/lib/erp/registers/types'
import { ReportScreen } from '@/components/archetypes/report-screen'
import { getPrintHeader } from '@/lib/erp/reports/report-csv'

export const dynamic = 'force-dynamic'

export default async function ReportRunnerPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { slug } = await params
  const config = getReportConfig(slug)
  if (!config) notFound()
  const service = REPORT_SERVICES[slug]
  if (!service) notFound()

  const sp = await searchParams
  const params2 = flattenSearchParams(sp)
  const { copy: _copy, page: _p, limit: _l, ...rest } = params2
  const query: RegisterQuery = parseRegisterQuery(config as never, params2)
  const result = await service(query)
  const printHeader = await getPrintHeader()

  return (
    <ReportScreen
      config={config}
      result={result}
      route={`/reports/${slug}`}
      params={{ ...config.defaultParams, ...rest }}
      page={query.page}
      limit={query.limit}
      printHeader={printHeader}
    />
  )
}
