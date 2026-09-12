'use client'

/**
 * SPEC-M57 FR-2 — the profile page's edit-name form: controlled input →
 * PATCH /api/auth/profile → toast + router.refresh() (the layout re-reads
 * the row, so the topbar chip picks the new name up on the same render).
 * Email/role are admin-owned (see the route header) — not editable here.
 */
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function ProfileNameForm({ initialName }: { initialName: string }) {
  const router = useRouter()
  const [name, setName] = useState(initialName)
  const [busy, setBusy] = useState(false)
  const trimmed = name.trim()
  const dirty = trimmed !== initialName && trimmed.length >= 2 && trimmed.length <= 60

  async function save() {
    if (busy || !dirty) return
    setBusy(true)
    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: trimmed }),
      })
      const body = (await res.json().catch(() => ({}))) as { ok?: boolean; name?: string; error?: string }
      if (!res.ok || !body.ok) {
        toast.error(body.error ?? 'Could not save the name')
        return
      }
      toast.success(`Saved — you are now "${body.name}"`)
      router.refresh()
    } catch {
      toast.error('Network error — name NOT saved')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-end gap-2">
      <div className="flex-1">
        <Label htmlFor="profile-name" className="text-xs font-medium">Display name</Label>
        <Input
          id="profile-name"
          className="mt-1 h-9 text-sm"
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') save() }}
        />
      </div>
      <Button size="sm" onClick={save} disabled={busy || !dirty}
        className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700">
        {busy ? <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> : <Save className="h-3.5 w-3.5 mr-1" />}
        Save
      </Button>
    </div>
  )
}
