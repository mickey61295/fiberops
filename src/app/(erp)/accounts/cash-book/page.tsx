/**
 * /accounts/cash-book — the cash & bank family book (SPEC-M52 M-03): the
 * 1010 control + its per-bank GL children (CoA topology, not prefix
 * guessing). Opening balance → per-voucher inflow/outflow (the other
 * account as particulars) → running balance → closing; counter-book mode
 * groups by day. Cancels net via their CN- contras. Same service as the
 * get_cash_book tool.
 */
import { getRegisterConfig } from '@/lib/erp/register-configs'
import { REGISTER_SERVICES } from '@/lib/erp/registers'
import { flattenSearchParams, parseRegisterQuery } from '@/lib/erp/registers/resolve'
import { RegisterScreen } from '@/components/archetypes/register-screen'

export const dynamic = 'force-dynamic'

export default async function CashBookPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const params = flattenSearchParams(sp)
  const config = getRegisterConfig('cash-book')!
  const query = parseRegisterQuery(config, params)
  const result = await REGISTER_SERVICES['cash-book'](query)
  const { page: _p, ...rest } = params
  return (
    <RegisterScreen
      config={config}
      result={result}
      route="/accounts/cash-book"
      groupLabel="Accounts & GST"
      groupHref="/accounts"
      params={rest}
      page={query.page}
      limit={query.limit}
    />
  )
}
