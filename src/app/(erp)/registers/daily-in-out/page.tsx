/**
 * /registers/daily-in-out — Daily In/Out register (SPEC-M4 §7 row 1, item
 * 'daily-in-out'; legacy frmDailyinout). RegisterScreen over queryDailyInOut
 * — the SAME read path the NEW get_daily_in_out tool calls (two doors, one
 * service).
 */
import { getRegisterConfig } from '@/lib/erp/register-configs'
import { REGISTER_SERVICES } from '@/lib/erp/registers'
import { flattenSearchParams, parseRegisterQuery } from '@/lib/erp/registers/resolve'
import { RegisterScreen } from '@/components/archetypes/register-screen'

export const dynamic = 'force-dynamic'

export default async function DailyInOutPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const params = flattenSearchParams(sp)
  const config = getRegisterConfig('daily-in-out')!
  const query = parseRegisterQuery(config, params)
  const result = await REGISTER_SERVICES['daily-in-out'](query)
  const { page: _p, ...rest } = params
  return (
    <RegisterScreen
      config={config}
      result={result}
      route="/registers/daily-in-out"
      groupLabel="Home"
      groupHref="/"
      params={rest}
      page={query.page}
      limit={query.limit}
    />
  )
}
