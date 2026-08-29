/**
 * /inventory/stock/itemwise — itemwise-stock register (SPEC-M19 §1). RegisterScreen over the
 * REGISTER_SERVICES['itemwise-stock'] read path — the SAME service the config's
 * agentTools chip cites (read-side ADR-001 twin).
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
  const config = getRegisterConfig('itemwise-stock')!
  const query = parseRegisterQuery(config, params)
  const result = await REGISTER_SERVICES['itemwise-stock'](query)
  const { page: _p, ...rest } = params
  return (
    <RegisterScreen
      config={config}
      result={result}
      route="/inventory/stock/itemwise"
      groupLabel="Inventory & Warehouse"
      groupHref="/inventory"
      params={rest}
      page={query.page}
      limit={query.limit}
    />
  )
}
