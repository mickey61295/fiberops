/** /hr/shift-wages — Shift Wages register (SPEC-M55 L-06, the legacy
 *  `FrmProdShiftWagesReg` port). Read surface: the shift-day wage bill —
 *  piece earnings (Σ amount) + posted shift wages (Σ shiftWages — the M55
 *  wage-only door). The WRITE doors live elsewhere by design: the agent's
 *  post_shift_wages (the shift-end bill) and the shiftCode attribution on
 *  production entries; the wage journal rides the payroll / wage-bill
 *  flow. Entries without a shift land in the honest `unassigned` bucket. */
import { getRegisterConfig } from '@/lib/erp/register-configs'
import { REGISTER_SERVICES } from '@/lib/erp/registers'
import { flattenSearchParams, parseRegisterQuery } from '@/lib/erp/registers/resolve'
import { RegisterScreen } from '@/components/archetypes/register-screen'

export const dynamic = 'force-dynamic'

export default async function ShiftWagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const params = flattenSearchParams(sp)
  const config = getRegisterConfig('shift-wages')!
  const query = parseRegisterQuery(config, params)
  const result = await REGISTER_SERVICES['shift-wages'](query)
  const { page: _p, ...rest } = params

  return (
    <div className="space-y-4">
      <RegisterScreen
        config={config}
        result={result}
        route="/hr/shift-wages"
        groupLabel="HR & Payroll"
        groupHref="/hr"
        params={rest}
        page={query.page}
        limit={query.limit}
      />
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-sm">
          <div className="font-medium">How to read this register</div>
          <div className="mt-1 text-xs leading-5 text-slate-600">
            <span className="font-medium">Piece wages</span> = the operators&apos; piece-rate
            earnings for that shift-day (qty × rate — the same ground truth as the
            operator register and piece payroll).{' '}
            <span className="font-medium">Shift wages</span> = the shift-level wage cost
            posted through <span className="font-mono">post_shift_wages</span> (fixed
            shift staff / incentives — wage cost <em>beyond</em> piece rate). The{' '}
            <span className="font-medium">total bill</span> is their sum; budget-vs-actual
            counts piece wages inside production cost and shift wages as a separate
            addend, so nothing double-counts. Rows marked{' '}
            <span className="font-mono">unassigned</span> carry entries posted without a
            shift — nothing is ever assigned a shift it didn&apos;t declare.
          </div>
        </div>
      </div>
    </div>
  )
}
