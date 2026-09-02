'use client'

/**
 * SPEC-M43 PRG-03 — the knitting-spec editor (program view section). Shows the
 * LIVE spec on the ProgBalanceFabric row and posts corrections through the
 * planProgramSpecCorrection service (audit-stamped). Blank field = not
 * corrected (only passed fields change).
 */
import { useActionState } from 'react'
import { Loader2 } from 'lucide-react'
import type { LifecycleActionResult } from '@/components/erp/lifecycle-form'

export function ProgramSpecForm({
  action, programNo, programId, isFabric, current,
  testId,
}: {
  action: (fd: FormData) => Promise<LifecycleActionResult>
  programNo: string
  programId: string
  isFabric: boolean
  current: { colour: string; design: string; dia: string; gsm: string; ll: string }
  testId?: string
}) {
  const [state, submit, pending] = useActionState(async (_prev: LifecycleActionResult | null, fd: FormData) => action(fd), null)

  if (!isFabric) {
    return (
      <div className="px-4 py-3 text-xs text-slate-500">
        Yarn/knitting program — the knitting spec belongs to fabric programs (colour/design/dia/GSM/LL on the fabric balance).
      </div>
    )
  }

  const field = (name: string, label: string, value: string, type: 'text' | 'number' = 'text') => (
    <div>
      <label className="text-xs text-slate-500" htmlFor={`spec-${name}`}>{label}</label>
      <input
        id={`spec-${name}`} name={name} type={type} placeholder={value || '—'}
        className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
      />
    </div>
  )

  return (
    <form action={submit} className="space-y-4 px-4 py-4" data-testid={testId}>
      <input type="hidden" name="programNo" value={programNo} />
      <input type="hidden" name="programId" value={programId} />
      <div className="grid gap-3 sm:grid-cols-5">
        {field('colourCode', `Colour (now: ${current.colour || '—'})`, current.colour)}
        {field('designCode', `Design (now: ${current.design || '—'})`, current.design)}
        {field('finDiaCode', `Finish dia (now: ${current.dia || '—'})`, current.dia)}
        {field('finGsm', `Finish GSM (now: ${current.gsm || '—'})`, current.gsm, 'number')}
        {field('ll', `Loop length (now: ${current.ll || '—'})`, current.ll)}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit" disabled={pending}
          className="h-9 rounded-md bg-emerald-700 px-4 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
        >
          {pending ? <Loader2 className="mr-1 inline h-3.5 w-3.5 animate-spin" /> : null}
          {pending ? 'Correcting…' : 'Correct spec'}
        </button>
        <span className="text-xs text-slate-500">Only filled fields change — the correction is audit-logged.</span>
        {state && <span className={`text-xs ${state.ok ? 'text-emerald-700' : 'text-red-600'}`}>{state.text}</span>}
      </div>
    </form>
  )
}
