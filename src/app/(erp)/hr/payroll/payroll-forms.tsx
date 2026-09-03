'use client'
/**
 * SPEC-M46 L-02 — client form wrappers for the payroll pages (the
 * SPEC-M42 StockTakeForm pattern): server actions return
 * LifecycleActionResult which raw <form action> can't render — useActionState
 * bridges it. Two shapes: the create door (mode + period + notes) on the
 * register home, and the commit banner on the run view (runNo hidden).
 */
import { useActionState } from 'react'
import { Loader2 } from 'lucide-react'
import type { LifecycleActionResult } from '@/components/erp/lifecycle-form'

export function PayrollForm({
  action, children, submitLabel, className, footerClassName, submitClassName, hint, testId,
}: {
  action: (fd: FormData) => Promise<LifecycleActionResult>
  children: React.ReactNode
  submitLabel: string
  className?: string
  footerClassName?: string
  submitClassName?: string
  hint?: string
  testId?: string
}) {
  const [state, submit, pending] = useActionState(async (_prev: LifecycleActionResult | null, fd: FormData) => action(fd), null)
  return (
    <form action={submit} className={className} data-testid={testId}>
      {children}
      <div className={footerClassName ?? 'flex items-center gap-3 border-t p-3'}>
        <button
          type="submit"
          disabled={pending}
          className={submitClassName ?? 'h-9 rounded-md bg-emerald-700 px-4 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-60'}
        >
          {pending ? <Loader2 className="inline h-3.5 w-3.5 animate-spin" /> : null}
          <span className="ml-1">{pending ? 'Working…' : submitLabel}</span>
        </button>
        {state && <span className={`text-xs ${state.ok ? 'text-emerald-700' : 'text-red-600'}`}>{state.text}</span>}
        {!state && hint && <span className="text-xs text-slate-400">{hint}</span>}
      </div>
    </form>
  )
}
