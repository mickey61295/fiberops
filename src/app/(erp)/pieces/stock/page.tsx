/**
 * /pieces/stock — Pcs Stock (SPEC-M4 §7 row 9; FrmPieceStock family).
 * Finished-goods stock per style × godown; order drill via the hub (W2).
 */
import { getRegisterConfig } from '@/lib/erp/register-configs'
import { REGISTER_SERVICES } from '@/lib/erp/registers'
import { flattenSearchParams, parseRegisterQuery } from '@/lib/erp/registers/resolve'
import { RegisterScreen } from '@/components/archetypes/register-screen'

export const dynamic = 'force-dynamic'

export default async function PcsStockPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const params = flattenSearchParams(sp)
  const config = getRegisterConfig('pcs-stock')!
  const query = parseRegisterQuery(config, params)
  const result = await REGISTER_SERVICES['pcs-stock'](query)
  const { page: _p, ...rest } = params
  return (
    <RegisterScreen
      config={config}
      result={result}
      route="/pieces/stock"
      groupLabel="Pieces (Finished Goods)"
      groupHref="/pieces/despatch"
      params={rest}
      page={query.page}
      limit={query.limit}
    />
  )
}
