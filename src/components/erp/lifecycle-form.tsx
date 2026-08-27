'use client'

/**
 * LifecycleForm — SPEC-M6 §7-C-6. Shared client form for the thin lifecycle
 * screens (close / cancel / complete / amend): doc-no input + per-screen
 * extra fields (children) + result line. The action passed in is a server
 * action that calls the SAME posting service the agent tool delegates to.
 */
import { useActionState } from 'react'
import { Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export interface LifecycleActionResult {
  ok: boolean
  text: string
}

export function LifecycleForm({
  action,
  label,
  docLabel,
  docPlaceholder,
  children,
  submitLabel,
}: {
  action: (fd: FormData) => Promise<LifecycleActionResult>
  label: string
  docLabel: string
  docPlaceholder?: string
  children?: React.ReactNode
  submitLabel: string
}) {
  const [state, submit, pending] = useActionState(async (_prev: LifecycleActionResult | null, fd: FormData) => action(fd), null)
  return (
    <form action={submit} className="space-y-3 rounded-lg border bg-white p-4 shadow-sm">
      <div className="text-sm font-semibold text-slate-700">{label}</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="text-xs text-slate-500">{docLabel}</label>
          <Input name="docNo" placeholder={docPlaceholder} required />
        </div>
        {children}
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : null}
          {submitLabel}
        </Button>
        {state && (
          <span className={`text-xs ${state.ok ? 'text-emerald-700' : 'text-red-600'}`}>{state.text}</span>
        )}
      </div>
    </form>
  )
}
