/**
 * /accounts/day-book — the chronological GL voucher register (SPEC-M52
 * M-03). Every journal row, every voucherType, every status: a cancelled
 * voucher and its CN- contra sit together and net (the GL doctrine). Dr/Cr
 * columns carry the resolved CoA 'Name [code]'; null-FK legs render
 * UNLINKED. Same service as the get_day_book tool.
 */
import { getRegisterConfig } from '@/lib/erp/register-configs'
import { REGISTER_SERVICES } from '@/lib/erp/registers'
import { flattenSearchParams, parseRegisterQuery } from '@/lib/erp/registers/resolve'
import { RegisterScreen } from '@/components/archetypes/register-screen'

export const dynamic = 'force-dynamic'

export default async function DayBookPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const params = flattenSearchParams(sp)
  const config = getRegisterConfig('day-book')!
  const query = parseRegisterQuery(config, params)
  const result = await REGISTER_SERVICES['day-book'](query)
  const { page: _p, ...rest } = params
  return (
    <RegisterScreen
      config={config}
      result={result}
      route="/accounts/day-book"
      groupLabel="Accounts & GST"
      groupHref="/accounts"
      params={rest}
      page={query.page}
      limit={query.limit}
    />
  )
}
