'use client'

/**
 * SPEC-M42 INV-01 — client form wrappers for the stock-take view page. The
 * server actions return LifecycleActionResult (ok/text), which a raw <form
 * action> can't render (React wants void | Promise<void>) — useActionState
 * bridges it (the LifecycleForm pattern minus the doc-no input: the take
 * number rides a hidden field). One component, two shapes on the page: the
 * advance banner and the count grid (children = the server-rendered table).
 */
import { useActionState } from 'react'
import { Loader2 } from 'lucide-react'
import type { LifecycleActionResult } from '@/components/erp/lifecycle-form'

export function StockTakeForm({
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
