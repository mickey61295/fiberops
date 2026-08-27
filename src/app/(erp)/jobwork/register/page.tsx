/**
 * /jobwork/register — Job Order List / Balance (SPEC-M4 §7 row 11; FrmJobOrderList).
 * DC day-book with at-party footer; rows drill into the jobwork view (W2).
 */
import { getRegisterConfig } from '@/lib/erp/register-configs'
import { REGISTER_SERVICES } from '@/lib/erp/registers'
import { flattenSearchParams, parseRegisterQuery } from '@/lib/erp/registers/resolve'
import { RegisterScreen } from '@/components/archetypes/register-screen'

export const dynamic = 'force-dynamic'

export default async function JobworkRegisterPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const params = flattenSearchParams(sp)
  const config = getRegisterConfig('jobwork-register')!
  const query = parseRegisterQuery(config, params)
  const result = await REGISTER_SERVICES['jobwork-register'](query)
  const { page: _p, ...rest } = params
  return (
    <RegisterScreen
      config={config}
      result={result}
      route="/jobwork/register"
      groupLabel="Job Work"
      groupHref="/jobwork/order"
      params={rest}
      page={query.page}
      limit={query.limit}
    />
  )
}
