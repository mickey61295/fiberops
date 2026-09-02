'use client'

/**
 * SPEC-M43 PRG-05 — client form for the proposal rows. The server action
 * returns LifecycleActionResult (ok/text) — useActionState bridges it (the
 * StockTakeForm pattern). One instance per row: hidden fields carry the
 * proposal row's context into createProgramFromProposalAction.
 */
import { useActionState } from 'react'
import { Loader2, Sparkles } from 'lucide-react'
import type { LifecycleActionResult } from '@/components/erp/lifecycle-form'

export function ProposalRowForm({
  action, orderNo, stage, itemCode, requiredKgs, disabled, proposalNote, testId,
}: {
  action: (fd: FormData) => Promise<LifecycleActionResult>
  orderNo: string
  stage: string
  itemCode: string
  requiredKgs: number
  disabled?: boolean
  proposalNote?: string
  testId?: string
}) {
  const [state, submit, pending] = useActionState(async (_prev: LifecycleActionResult | null, fd: FormData) => action(fd), null)
  if (disabled) {
    return (
      <span className="text-xs text-slate-400" title="Accessory/other BOM rows are informational — programs cover yarn and fabric">
        manual
      </span>
    )
  }
  return (
    <form action={submit} className="inline-flex items-center gap-2" data-testid={testId}>
      <input type="hidden" name="orderNo" value={orderNo} />
      <input type="hidden" name="stage" value={stage} />
      <input type="hidden" name="itemCode" value={itemCode} />
      <input type="hidden" name="requiredKgs" value={requiredKgs} />
      {proposalNote ? <input type="hidden" name="proposalNote" value={proposalNote} /> : null}
      <button
        type="submit"
        disabled={pending}
        title={`Create ${stage} program for ${itemCode} — ${requiredKgs} kgs`}
        className="inline-flex h-7 items-center gap-1 rounded-md bg-emerald-700 px-2.5 text-xs font-medium text-white hover:bg-emerald-600 disabled:opacity-60"
      >
        {pending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
        Create
      </button>
      {state && <span className={`text-xs ${state.ok ? 'text-emerald-700' : 'text-red-600'}`}>{state.text}</span>}
    </form>
  )
}
