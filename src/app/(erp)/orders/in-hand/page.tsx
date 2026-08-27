/**
 * /orders/in-hand — In-Hand Orders (SPEC-M4 §7 row 3; legacy ST_Ord_inHand).
 * Pending-to-produce/despatch per order; rows drill into the Order Hub (W2).
 */
import { getRegisterConfig } from '@/lib/erp/register-configs'
import { REGISTER_SERVICES } from '@/lib/erp/registers'
import { flattenSearchParams, parseRegisterQuery } from '@/lib/erp/registers/resolve'
import { RegisterScreen } from '@/components/archetypes/register-screen'

export const dynamic = 'force-dynamic'

export default async function InhandOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const params = flattenSearchParams(sp)
  const config = getRegisterConfig('inhand-orders')!
  const query = parseRegisterQuery(config, params)
  const result = await REGISTER_SERVICES['inhand-orders'](query)
  const { page: _p, ...rest } = params
  return (
    <RegisterScreen
      config={config}
      result={result}
      route="/orders/in-hand"
      groupLabel="Orders & Sales"
      groupHref="/orders"
      params={rest}
      page={query.page}
      limit={query.limit}
    />
  )
}
