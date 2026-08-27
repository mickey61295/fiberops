/**
 * /accounts/party-ledger — Party Ledger (SPEC-M4 §7 row 14;
 * FrmPartyBalanceRegister). Per-party financial rollup with balances.
 */
import { getRegisterConfig } from '@/lib/erp/register-configs'
import { REGISTER_SERVICES } from '@/lib/erp/registers'
import { flattenSearchParams, parseRegisterQuery } from '@/lib/erp/registers/resolve'
import { RegisterScreen } from '@/components/archetypes/register-screen'

export const dynamic = 'force-dynamic'

export default async function PartyLedgerPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const params = flattenSearchParams(sp)
  const config = getRegisterConfig('party-ledger')!
  const query = parseRegisterQuery(config, params)
  const result = await REGISTER_SERVICES['party-ledger'](query)
  const { page: _p, ...rest } = params
  return (
    <RegisterScreen
      config={config}
      result={result}
      route="/accounts/party-ledger"
      groupLabel="Accounts & GST"
      groupHref="/accounts"
      params={rest}
      page={query.page}
      limit={query.limit}
    />
  )
}
