/**
 * /inventory/ledger — Stock Ledger register (SPEC-M4 §7 row 5, item
 * 'stock-ledger'; legacy FrmStockLedger / Vue_StkLedger). RegisterScreen over
 * the queryStockLedger service — the SAME read path the get_stock_ledger
 * agent tool delegates to (read-side ADR-001 twin).
 */
import { getRegisterConfig } from '@/lib/erp/register-configs'
import { REGISTER_SERVICES } from '@/lib/erp/registers'
import { flattenSearchParams, parseRegisterQuery } from '@/lib/erp/registers/resolve'
import { RegisterScreen } from '@/components/archetypes/register-screen'

export const dynamic = 'force-dynamic'

export default async function StockLedgerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const params = flattenSearchParams(sp)
  const config = getRegisterConfig('stock-ledger')!
  const query = parseRegisterQuery(config, params)
  const result = await REGISTER_SERVICES['stock-ledger'](query)
  const { page: _p, ...rest } = params
  return (
    <RegisterScreen
      config={config}
      result={result}
      route="/inventory/ledger"
      groupLabel="Inventory & Warehouse"
      groupHref="/inventory"
      params={rest}
      page={query.page}
      limit={query.limit}
    />
  )
}
