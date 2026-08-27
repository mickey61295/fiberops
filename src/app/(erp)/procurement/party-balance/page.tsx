/**
 * /procurement/party-balance — Party Balance (SPEC-M4 §7 row 4; FrmPartyBlnc,
 * Sp_POBalnce). The dashboard "Pending POs" KPI tile deep-links here (Wave C).
 */
import { getRegisterConfig } from '@/lib/erp/register-configs'
import { REGISTER_SERVICES } from '@/lib/erp/registers'
import { flattenSearchParams, parseRegisterQuery } from '@/lib/erp/registers/resolve'
import { RegisterScreen } from '@/components/archetypes/register-screen'

export const dynamic = 'force-dynamic'

export default async function PartyBalancePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const params = flattenSearchParams(sp)
  const config = getRegisterConfig('party-balance')!
  const query = parseRegisterQuery(config, params)
  const result = await REGISTER_SERVICES['party-balance'](query)
  const { page: _p, ...rest } = params
  return (
    <RegisterScreen
      config={config}
      result={result}
      route="/procurement/party-balance"
      groupLabel="Procurement"
      groupHref="/procurement"
      params={rest}
      page={query.page}
      limit={query.limit}
    />
  )
}
