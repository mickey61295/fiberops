/**
 * /inventory/waste-percent — waste-% register (SPEC-M42 INV-05, the knitting
 * KPI). RegisterScreen over the REGISTER_SERVICES['waste-percent'] read path
 * — WST- kgs ÷ process-receipt kgs per item for the period.
 */
import { getRegisterConfig } from '@/lib/erp/register-configs'
import { REGISTER_SERVICES } from '@/lib/erp/registers'
import { flattenSearchParams, parseRegisterQuery } from '@/lib/erp/registers/resolve'
import { RegisterScreen } from '@/components/archetypes/register-screen'

export const dynamic = 'force-dynamic'

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const params = flattenSearchParams(sp)
  const config = getRegisterConfig('waste-percent')!
  const query = parseRegisterQuery(config, params)
  const result = await REGISTER_SERVICES['waste-percent'](query)
  const { page: _p, ...rest } = params
  return (
    <RegisterScreen
      config={config}
      result={result}
      route="/inventory/waste-percent"
      groupLabel="Inventory"
      groupHref="/inventory"
      params={rest}
      page={query.page}
      limit={query.limit}
    />
  )
}
