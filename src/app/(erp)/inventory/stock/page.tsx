/**
 * /inventory/stock — Current Stock register (SPEC-M6 §2 row 12; the
 * stock-view item). RegisterScreen over queryCurrentStock (the shared
 * fetchCurrentStock read path — same as get_stock).
 */
import { getRegisterConfig } from '@/lib/erp/register-configs'
import { REGISTER_SERVICES } from '@/lib/erp/registers'
import { flattenSearchParams, parseRegisterQuery } from '@/lib/erp/registers/resolve'
import { RegisterScreen } from '@/components/archetypes/register-screen'

export const dynamic = 'force-dynamic'

export default async function CurrentStockPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const params = flattenSearchParams(sp)
  const config = getRegisterConfig('current-stock')!
  const query = parseRegisterQuery(config, params)
  const result = await REGISTER_SERVICES['current-stock'](query)
  const { page: _p, ...rest } = params
  return (
    <RegisterScreen
      config={config}
      result={result}
      route="/inventory/stock"
      groupLabel="Inventory & Warehouse"
      groupHref="/inventory"
      params={rest}
      page={query.page}
      limit={query.limit}
    />
  )
}
