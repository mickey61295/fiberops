/** /accounts/pdc — PDC / Cheques in Hand register (SPEC-M56 PAY-08, §17-3
 *  ADR-020). Read surface: the cheques-in-the-field lens — issued + active
 *  cheque-mode payments, aging off the cheque's own date (PDC = post-dated
 *  at issue). The TRANSITION doors live elsewhere by design: the agent's
 *  post_cheque_clear (the bank's physical confirmation — a stamp, no
 *  journal) and post_cheque_bounce (the M40 CN- cancel machinery + the
 *  'bounced' stamp — allocations reverse, statuses re-derive). Pre-M56
 *  cheque rows never appear: their journey was untracked, and this register
 *  never fabricates history. */
import { getRegisterConfig } from '@/lib/erp/register-configs'
import { REGISTER_SERVICES } from '@/lib/erp/registers'
import { flattenSearchParams, parseRegisterQuery } from '@/lib/erp/registers/resolve'
import { RegisterScreen } from '@/components/archetypes/register-screen'

export const dynamic = 'force-dynamic'

export default async function PdcPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const params = flattenSearchParams(sp)
  const config = getRegisterConfig('pdc')!
  const query = parseRegisterQuery(config, params)
  const result = await REGISTER_SERVICES['pdc'](query)
  const { page: _p, ...rest } = params

  return (
    <div className="space-y-4">
      <RegisterScreen
        config={config}
        result={result}
        route="/accounts/pdc"
        groupLabel="Accounts"
        groupHref="/accounts"
        params={rest}
        page={query.page}
        limit={query.limit}
      />
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm">
          <div className="font-medium">How to read this register</div>
          <div className="mt-1 text-xs leading-5 text-slate-600">
            Every row is a <span className="font-medium">cheque still out in the field</span>:
            issued at its payment voucher, not yet cleared or bounced.{' '}
            <span className="font-medium">Cheque Date</span> is the cheque&apos;s own
            (post-)date; a <span className="font-medium">PDC</span> row was post-dated at
            issue (cheque date after the voucher date), a{' '}
            <span className="font-medium">cheque</span> row was current-dated.{' '}
            <span className="font-medium">Due</span> ages off the cheque date —{' '}
            <span className="font-mono">OVERDUE</span> rows are past their date and still
            unresolved (the risk lens). The GL bank leg posted at voucher time (the M51
            doctrine), so amounts here are already in the books; clearing is a physical
            confirmation (<span className="font-mono">post_cheque_clear</span> — a stamp,
            no journal) and a bounce reverses everything (
            <span className="font-mono">post_cheque_bounce</span> — a CN- contra, allocations
            reversed, invoice/bill statuses re-derived). Both transitions remove the row.
          </div>
        </div>
      </div>
    </div>
  )
}
