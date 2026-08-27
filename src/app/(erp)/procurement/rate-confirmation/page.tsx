/** /procurement/rate-confirmation — Rate Confirmation register (SPEC-M5 §7-A-6). */
import { getRegisterConfig } from '@/lib/erp/register-configs'
import { REGISTER_SERVICES } from '@/lib/erp/registers'
import { flattenSearchParams, parseRegisterQuery } from '@/lib/erp/registers/resolve'
import { RegisterScreen } from '@/components/archetypes/register-screen'

export const dynamic = 'force-dynamic'

export default async function RateConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const params = flattenSearchParams(sp)
  const config = getRegisterConfig('rate-confirmation')!
  const query = parseRegisterQuery(config, params)
  const result = await REGISTER_SERVICES['rate-confirmation'](query)
  const { page: _p, ...rest } = params
  return (
    <RegisterScreen
      config={config}
      result={result}
      route="/procurement/rate-confirmation"
      groupLabel="Procurement"
      groupHref="/procurement"
      params={rest}
      page={query.page}
      limit={query.limit}
    />
  )
}
