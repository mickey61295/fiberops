/**
 * /inventory/closing-stock — closing-stock register (SPEC-M19 §4 Wave D).
 * RegisterScreen over the REGISTER_SERVICES['closing-stock'] read path.
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
  const config = getRegisterConfig('closing-stock')!
  const query = parseRegisterQuery(config, params)
  const result = await REGISTER_SERVICES['closing-stock'](query)
  const { page: _p, ...rest } = params
  return (
    <RegisterScreen
      config={config}
      result={result}
      route="/inventory/closing-stock"
      groupLabel="Inventory & Warehouse"
      groupHref="/inventory"
      params={rest}
      page={query.page}
      limit={query.limit}
    />
  )
}
