/** /hr/wages — Production Wages register (SPEC-M5 §7-B-20, item
 *  'production-wages', legacy Frm_ProductionWages family). The "Generate wage
 *  bill" form posts a Journal through planJournal (Dr Production Wages /
 *  Cr Wage Payable — the same service the create_journal tool uses, ADR-001);
 *  the bill amount = this register's period total (the shared queryWages
 *  service is the ONE source). W6: budget-vs-actual deep-link when an order
 *  filter is active. W2: rows drill to the employee master. */
import { revalidatePath } from 'next/cache'
import { runCommit } from '@/lib/erp/audit'
import { getSessionUser } from '@/lib/auth/current-user'
import Link from 'next/link'
import { BadgeIndianRupee } from 'lucide-react'
import { db } from '@/lib/db'
import { getRegisterConfig } from '@/lib/erp/register-configs'
import { REGISTER_SERVICES } from '@/lib/erp/registers'
import { flattenSearchParams, parseRegisterQuery } from '@/lib/erp/registers/resolve'
import { planJournal } from '@/lib/erp/posting/journal'
import { RegisterScreen } from '@/components/archetypes/register-screen'
import { Button } from '@/components/ui/button'

export const dynamic = 'force-dynamic'

export default async function ProductionWagesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const sp = await searchParams
  const params = flattenSearchParams(sp)
  const config = getRegisterConfig('production-wages')!
  const query = parseRegisterQuery(config, params)
  const result = await REGISTER_SERVICES['production-wages'](query)
  const { page: _p, ...rest } = params

  // ── §7-B-20 "Generate wage bill": post a Journal for the filtered period ──
  async function generateWageBill(formData: FormData) {
    'use server'
    const fp: Record<string, string> = {}
    for (const k of ['from', 'to', 'order', 'q']) {
      const v = String(formData.get(k) || '')
      if (v) fp[k] = v
    }
    const cfg = getRegisterConfig('production-wages')!
    const q = parseRegisterQuery(cfg, fp)
    const res = await REGISTER_SERVICES['production-wages'](q)
    const wagesTotal = (res.totals ?? []).find((t) => t.label.startsWith('Wages'))?.value ?? 0
    const amount = Math.round(Number(wagesTotal))
    const period = [fp.from, fp.to].filter(Boolean).join(' → ') || 'all time'
    if (!amount) {
      revalidatePath('/hr/wages')
      return
    }
    const plan = await planJournal({
      voucherType: 'journal',
      debitAccount: 'Production Wages',
      creditAccount: 'Wage Payable',
      amount,
      partyCode: undefined,
      narration: `Wage bill ${period}${fp.order ? ` · order ${fp.order}` : ''}${fp.q ? ` · dept ${fp.q}` : ''} (${res.count} operators)`,
    })
    if (plan.ok) {
      const _user = await getSessionUser().catch(() => null)
      await runCommit(plan, { actorName: _user?.email ?? 'system', actorSource: _user ? 'form' : 'system', action: 'wage-bill', entity: 'journal' })
    }
    revalidatePath('/hr/wages')
    revalidatePath('/accounts/journal')
  }

  const wagesTotal = (result.totals ?? []).find((t) => t.label.startsWith('Wages'))?.value ?? 0

  return (
    <div className="space-y-4">
      <RegisterScreen
        config={config}
        result={result}
        route="/hr/wages"
        groupLabel="HR & Payroll"
        groupHref="/hr"
        params={rest}
        page={query.page}
        limit={query.limit}
      />
      <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-sm">
            <div className="font-medium">Generate wage bill for this period</div>
            <div className="text-xs text-slate-500">
              Posts a journal voucher — Dr <span className="font-mono">Production Wages</span> / Cr{' '}
              <span className="font-mono">Wage Payable</span> — for the filtered total{' '}
              <span className="font-semibold">₹{Math.round(Number(wagesTotal)).toLocaleString('en-IN')}</span>
              {' '}({result.count} operators). Pay it out on the Wage Payments screen.
            </div>
          </div>
          {/* the bill rides create_journal (§7-B-20) — same planJournal door */}
          <form action={generateWageBill}>
            {(['from', 'to', 'order', 'q'] as const).map((k) => (
              <input key={k} type="hidden" name={k} value={rest[k] ?? ''} />
            ))}
            <Button
              type="submit"
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              disabled={!wagesTotal}
            >
              <BadgeIndianRupee className="mr-1 h-3.5 w-3.5" /> Generate wage bill
            </Button>
          </form>
        </div>
        {rest.order && (
          <div className="mt-3 border-t border-slate-100 pt-3 text-sm">
            <Link
              href={`/costing/budget-vs-actual?order=${encodeURIComponent(rest.order)}`}
              className="text-emerald-700 hover:underline"
            >
              Budget vs Actual for {rest.order} →
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
