/**
 * /production/register — Production Status Register (SPEC-M4 §7 row 10;
 * FrmProductionStatusReg family). The dashboard "Production Today" KPI tile
 * deep-links here with ?from=<today>&to=<today> (Wave C).
 */
import { getRegisterConfig } from '@/lib/erp/register-configs'
import { REGISTER_SERVICES } from '@/lib/erp/registers'
import { flattenSearchParams, parseRegisterQuery } from '@/lib/erp/registers/resolve'
import { RegisterScreen } from '@/components/archetypes/register-screen'

export const dynamic = 'force-dynamic'

export default async function ProductionStatusPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const params = flattenSearchParams(sp)
  const config = getRegisterConfig('production-status')!
  const query = parseRegisterQuery(config, params)
  const result = await REGISTER_SERVICES['production-status'](query)
  const { page: _p, ...rest } = params
  return (
    <RegisterScreen
      config={config}
      result={result}
      route="/production/register"
      groupLabel="Production & Shopfloor"
      groupHref="/production"
      params={rest}
      page={query.page}
      limit={query.limit}
    />
  )
}
