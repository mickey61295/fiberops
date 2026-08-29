'use client'

/**
 * SPEC-M18 §4-C4 — self-service change password (legacy FrmChangePassword).
 * Topbar key-icon → dialog (current / new / confirm) → POST
 * /api/auth/change-password (verify-old → set-new). The session stays valid —
 * the signed cookie carries id/email/role, not the password hash.
 */
import { useState } from 'react'
import { KeyRound, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ChangePasswordButton() {
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')

  function reset() {
    setCurrent(''); setNext(''); setConfirm('')
  }

  async function submit() {
    if (busy) return
    if (!current || next.length < 8) {
      toast.error('Current password + a new password of at least 8 characters are required')
      return
    }
    if (next !== confirm) {
      toast.error('New password and confirmation do not match')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      })
      const body = (await res.json().catch(() => ({}))) as { error?: string; email?: string }
      if (!res.ok) {
        toast.error(body.error ?? 'Could not change the password')
        return
      }
      toast.success(`Password changed for ${body.email ?? 'your account'} — use it at the next login`)
      setOpen(false)
      reset()
    } catch {
      toast.error('Network error — password NOT changed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        title="Change my password"
        onClick={() => { reset(); setOpen(true) }}
      >
        <KeyRound className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={(o) => !busy && setOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change my password</DialogTitle>
            <DialogDescription>
              Verify your current password, then set a new one (min 8 characters). Your session stays signed in.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="cp-current" className="text-xs font-medium">Current password</Label>
              <Input id="cp-current" type="password" className="mt-1 h-9 text-sm" autoComplete="current-password"
                value={current} onChange={(e) => setCurrent(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="cp-next" className="text-xs font-medium">New password</Label>
              <Input id="cp-next" type="password" className="mt-1 h-9 text-sm" autoComplete="new-password"
                value={next} onChange={(e) => setNext(e.target.value)} placeholder="min 8 characters" />
            </div>
            <div>
              <Label htmlFor="cp-confirm" className="text-xs font-medium">Confirm new password</Label>
              <Input id="cp-confirm" type="password" className="mt-1 h-9 text-sm" autoComplete="new-password"
                value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
            <Button size="sm" onClick={submit} disabled={busy}
              className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700">
              {busy ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <KeyRound className="h-3.5 w-3.5 mr-1" />}
              Change password
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
