'use client'

/**
 * SPEC-M60 FR-A6 — the admin's Clear-lockout button (the currently-locked
 * strip on /admin/login-audit): POST /api/auth/admin/clear-lockout → the
 * email's fail/locked ledger rows are deleted → refresh (the strip drops
 * the row; the register gains the lockout_clear audit line).
 */
import { useState } from 'react'
import { Loader2, Unlock } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function ClearLockoutButton({ email }: { email: string }) {
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  async function clear() {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/auth/admin/clear-lockout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const body = (await res.json().catch(() => ({}))) as { error?: string; cleared?: number }
      if (!res.ok) {
        toast.error(body.error ?? 'Could not clear the lockout')
        return
      }
      toast.success(`Lockout cleared for ${email} (${body.cleared ?? 0} ledger rows removed)`)
      router.refresh()
    } catch {
      toast.error('Network error — lockout NOT cleared')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className="h-6 px-2 text-xs"
      onClick={clear}
      disabled={busy}
      title="Delete this email's fail/locked ledger rows — the user can log in again immediately"
    >
      {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unlock className="h-3 w-3" />}
      Clear
    </Button>
  )
}
