'use client'

/**
 * PasswordAdmin — SPEC-M7 §4 Wave C card on /admin/users (users tab).
 * Admins set/replace or clear any user's password through
 * POST /api/auth/admin/set-password (the route re-checks the admin role —
 * this card is rendered only for admins but the guard is server-side).
 */
import { useState } from 'react'
import { KeyRound, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export type AdminUserRow = {
  id: string
  email: string
  name: string
  role: string
  active: boolean
  hasPassword: boolean
}

export function PasswordAdmin({ users, selfId }: { users: AdminUserRow[]; selfId: string }) {
  const [userId, setUserId] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState<'set' | 'clear' | null>(null)

  const selected = users.find((u) => u.id === userId)

  const call = async (body: Record<string, unknown>, mode: 'set' | 'clear') => {
    setBusy(mode)
    try {
      const res = await fetch('/api/auth/admin/set-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        toast.error(data.error || `Request failed (${res.status})`)
      } else {
        toast.success(
          mode === 'clear'
            ? `Password cleared — ${data.user.email} cannot log in until a new one is set`
            : `Password saved for ${data.user.email}`,
        )
        if (mode === 'set') setPassword('')
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Network error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="rounded-lg border bg-white p-4 shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-slate-500" />
        <h2 className="text-sm font-semibold text-slate-800">Password administration</h2>
        <span className="text-[11px] text-slate-400">admins only · SPEC-M7 Wave C</span>
      </div>
      <p className="text-xs text-slate-500">
        Set or reset a user&apos;s login password, or clear it to block login until a new one is
        set. The user&apos;s existing sessions keep working until their cookie expires — deactivate
        the user instead for an immediate lockout.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          aria-label="Select user"
          className="h-9 rounded-md border border-slate-300 bg-white px-2 text-sm min-w-[260px]"
        >
          <option value="">Select a user…</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.email} — {u.name}
              {u.id === selfId ? ' (you)' : ''} · {u.hasPassword ? 'password set' : 'no password'}
              {!u.active ? ' · INACTIVE' : ''}
            </option>
          ))}
        </select>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="New password (min 8 chars)"
          aria-label="New password"
          className="h-9 rounded-md border border-slate-300 px-2 text-sm w-56"
        />
        <Button
          size="sm"
          disabled={!userId || password.length < 8 || busy !== null}
          onClick={() => call({ userId, password }, 'set')}
        >
          {busy === 'set' ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <KeyRound className="h-3.5 w-3.5 mr-1" />}
          Set / reset
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={!userId || selected?.id === selfId || !selected?.hasPassword || busy !== null}
          title={
            selected?.id === selfId
              ? 'Cannot clear your own password'
              : selected && !selected.hasPassword
                ? 'No password set'
                : 'Clear passwordHash — user cannot log in until a new one is set'
          }
          onClick={() => call({ userId, clear: true }, 'clear')}
        >
          {busy === 'clear' ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Trash2 className="h-3.5 w-3.5 mr-1" />}
          Clear
        </Button>
      </div>
    </div>
  )
}
