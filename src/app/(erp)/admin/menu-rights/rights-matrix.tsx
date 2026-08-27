'use client'

/**
 * RightsMatrix — SPEC-M6 §7-B-2. Client grid: rows = menu groups, cols = user
 * groups; checkbox toggles write UserGroup.rights (menu group ids) through
 * saveMenuRightsAction → planMasterUpdate (the update_user_group door).
 * [] = all menus (rendered as every box checked + the "All" chip).
 */
import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Loader2 } from 'lucide-react'
import { saveMenuRightsAction } from './actions'

interface Props {
  menuGroups: { id: string; label: string }[]
  userGroups: { name: string; rights: string[] }[]
}

export function RightsMatrix({ menuGroups, userGroups }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [state, setState] = useState<Record<string, string[]>>(
    Object.fromEntries(userGroups.map((g) => [g.name, g.rights])),
  )
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const toggle = async (groupName: string, menuId: string) => {
    setError(null)
    const current = state[groupName] ?? []
    const hasAll = current.length === 0 // [] = all
    // normalize: explicit set from "all" starts with every id
    let base = hasAll ? menuGroups.map((m) => m.id) : [...current]
    const next = base.includes(menuId) ? base.filter((x) => x !== menuId) : [...base, menuId]
    // every id on → collapse to [] (all) for cleanliness
    if (next.length === menuGroups.length) base = []
    const finalRights = next.length === menuGroups.length ? [] : next
    setState((s) => ({ ...s, [groupName]: finalRights }))
    setSaving(groupName + menuId)
    const res = await saveMenuRightsAction(groupName, finalRights)
    setSaving(null)
    if (!res.ok) {
      setError(res.errors.join('; '))
      setState((s) => ({ ...s, [groupName]: current }))
      return
    }
    startTransition(() => router.refresh())
  }

  if (userGroups.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center text-sm text-slate-400">
        No user groups yet — create one at{' '}
        <a href="/admin/users?tab=groups" className="text-emerald-700 hover:underline">/admin/users</a>.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">{error}</div>}
      <div className="overflow-x-auto rounded-lg border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50/80">
              <th className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-500">Menu Group</th>
              {userGroups.map((g) => (
                <th key={g.name} className="px-3 py-2.5 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  {g.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {menuGroups.map((m) => (
              <tr key={m.id} className="border-b last:border-0 hover:bg-slate-50/60">
                <td className="px-3 py-2 font-medium text-slate-800">{m.label}</td>
                {userGroups.map((g) => {
                  const rights = state[g.name] ?? []
                  const checked = rights.length === 0 || rights.includes(m.id)
                  const key = g.name + m.id
                  return (
                    <td key={key} className="px-3 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => toggle(g.name, m.id)}
                        aria-label={`${g.name} ${checked ? 'hide' : 'show'} ${m.label}`}
                        className={`inline-flex h-6 w-6 items-center justify-center rounded border transition-colors ${
                          checked ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300 text-transparent hover:border-emerald-400'
                        }`}
                      >
                        {saving === key ? <Loader2 className="h-3.5 w-3.5 animate-spin text-white" /> : <Check className="h-4 w-4" />}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="text-xs text-slate-500">
        A checked box means the group may see that menu group. <strong>All boxes checked = all menus</strong>{' '}
        (stored as the empty list). Saving writes through the same master-service the{' '}
        <code className="rounded bg-slate-100 px-1 font-mono text-[11px]">update_user_group</code> agent tool uses —
        form and agent cannot drift. Enforcement is live (SPEC-M7 Wave C): the sidebar filters + routes
        re-check rights fresh from the DB; the edge pre-filter cookie applies on the user&apos;s next login.
      </div>
      {pending && <div className="text-xs text-slate-400">refreshing…</div>}
    </div>
  )
}
