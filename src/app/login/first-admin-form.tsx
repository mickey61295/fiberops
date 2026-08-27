'use client'

/**
 * First-admin bootstrap form (SPEC-M7 §3) — shown while NO user has a password.
 * POST /api/auth/bootstrap sets the existing admin's password (pre-filled) or
 * creates the first admin, then signs in. The route self-locks (403) once any
 * password exists, so this form is single-use by construction.
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function FirstAdminForm({
  prefillEmail,
  prefillName,
}: {
  prefillEmail?: string
  prefillName?: string
}) {
  const router = useRouter()
  const [name, setName] = useState(prefillName ?? 'Administrator')
  const [email, setEmail] = useState(prefillEmail ?? 'admin@fiberpro.local')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setBusy(true)
    try {
      const res = await fetch('/api/auth/bootstrap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password }),
      })
      const data = (await res.json().catch(() => null)) as { error?: string } | null
      if (!res.ok) {
        setError(data?.error ?? 'Bootstrap failed')
        return
      }
      router.replace('/')
      router.refresh()
    } catch {
      setError('Network error — is the server running?')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="bg-white border border-slate-200 rounded-lg shadow-sm p-6 space-y-4"
    >
      {prefillEmail && (
        <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded px-3 py-2">
          Existing admin account found — this sets its password.
        </p>
      )}
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password (min 8 chars)</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
        />
      </div>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
      )}
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? 'Creating…' : 'Create admin & sign in'}
      </Button>
    </form>
  )
}
