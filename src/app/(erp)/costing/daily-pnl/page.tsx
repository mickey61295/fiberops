/**
 * /costing/daily-pnl — Daily Unit P&L (SPEC-M6 §2 row 4). Own route rendering
 * the ReportScreen for slug 'daily-unit-pnl' (same mechanism, menu item lives
 * in the costing group — §4 rule b).
 */
import { notFound } from 'next/navigation'
import { getReportConfig } from '@/lib/erp/report-configs'
import { REPORT_SERVICES } from '@/lib/erp/reports'
import { flattenSearchParams, parseRegisterQuery } from '@/lib/erp/registers/resolve'
import { RegisterQuery } from '@/lib/erp/registers/types'
import { ReportScreen } from '@/components/archetypes/report-screen'
import { getPrintHeader } from '@/lib/erp/reports/report-csv'

export const dynamic = 'force-dynamic'

export default async function DailyPnlPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const config = getReportConfig('daily-unit-pnl')
  if (!config) notFound()
  const service = REPORT_SERVICES['daily-unit-pnl']!

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
      route="/costing/daily-pnl"
      params={rest}
      page={query.page}
      limit={query.limit}
      printHeader={printHeader}
    />
  )
}
