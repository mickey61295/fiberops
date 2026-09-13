'use client'

/**
 * SPEC-M60 FR-A8 — "sign out all devices" on the profile: POST
 * /api/auth/sessions/clear bumps User.tokenVersion (every OTHER device's
 * cookie dies at its next request) and re-issues THIS session's cookie (the
 * button-presser stays signed in).
 */
import { useState } from 'react'
import { LogOut, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export function SignOutAllButton() {
  const [busy, setBusy] = useState(false)

  async function clear() {
    if (busy) return
    setBusy(true)
    try {
      const res = await fetch('/api/auth/sessions/clear', { method: 'POST' })
      const body = (await res.json().catch(() => ({}))) as { error?: string }
      if (!res.ok) {
        toast.error(body.error ?? 'Could not clear sessions')
        return
      }
      toast.success('Signed out on all other devices — this session stays signed in')
    } catch {
      toast.error('Network error — sessions NOT cleared')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={clear}
      disabled={busy}
      title="Revoke every other session — stolen or forgotten logins die at their next request"
    >
      {busy ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <LogOut className="h-3.5 w-3.5 mr-1" />}
      Sign out all devices
    </Button>
  )
}
