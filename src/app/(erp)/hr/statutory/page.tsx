/**
 * /hr/statutory — the statutory remittance register (SPEC-M48 L-03). One row
 * per COMMITTED payroll run × head (PF/ESI/PT/LWF): employee share deducted,
 * employer share (cost), total, the authority party and its PENDING
 * remittance (party-ledger ground truth — loop-closure #4). The csv twin is
 * the challan data export. Same service as the get_statutory_register tool.
 */
import { getRegisterConfig } from '@/lib/erp/register-configs'
import { REGISTER_SERVICES } from '@/lib/erp/registers'
import { flattenSearchParams, parseRegisterQuery } from '@/lib/erp/registers/resolve'
import { RegisterScreen } from '@/components/archetypes/register-screen'

export const dynamic = 'force-dynamic'

export default async function StatutoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const params = flattenSearchParams(sp)
  const config = getRegisterConfig('statutory')!
  const query = parseRegisterQuery(config, params)
  const result = await REGISTER_SERVICES['statutory'](query)
  const { page: _p, ...rest } = params

  return (
    <RegisterScreen
      config={config}
      result={result}
      route="/hr/statutory"
      groupLabel="HR & Payroll"
      groupHref="/hr"
      params={rest}
      page={query.page}
      limit={query.limit}
    />
  )
}
