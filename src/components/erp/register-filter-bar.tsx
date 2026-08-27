'use client'

/**
 * Register filter bar — SPEC-M4 §6. Client component: renders the config's
 * declared filters and pushes shareable URL searchParams (KPI deep-links land
 * here for free). Party/godown inputs get an async datalist fed by the SAME
 * master_search read path the W4 pickers use — no new endpoint family.
 */
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FilterX, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { RegisterConfig } from '@/lib/erp/register-configs/types'

interface Props {
  config: RegisterConfig
  route: string
  params: Record<string, string>
}

export function RegisterFilterBar({ config, route, params }: Props) {
  const router = useRouter()
  const [draft, setDraft] = useState<Record<string, string>>(() => {
    const d: Record<string, string> = {}
    for (const f of config.filters) d[f.key] = params[f.key] ?? ''
    return d
  })
  const [listOptions, setListOptions] = useState<Record<string, { value: string; label: string }[]>>({})
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const push = (next: Record<string, string>) => {
    const sp = new URLSearchParams()
    for (const [k, v] of Object.entries(next)) if (v) sp.set(k, v)
    const qs = sp.toString()
    router.push(qs ? `${route}?${qs}` : route)
  }

  const set = (key: string, value: string, immediate = false) => {
    const next = { ...draft, [key]: value }
    setDraft(next)
    if (immediate) push(next)
  }

  // async datalist feed for party/godown text filters (master_search read path)
  const feedDatalist = (slug: string, key: string, q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const r = await fetch(`/api/erp?resource=master_search&slug=${encodeURIComponent(slug)}&q=${encodeURIComponent(q)}`)
        const j = await r.json()
        if (Array.isArray(j?.options)) setListOptions((prev) => ({ ...prev, [key]: j.options }))
      } catch {
        /* datalist is a progressive enhancement — ignore feed errors */
      }
    }, 250)
  }

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  const hasActive = config.filters.some((f) => params[f.key])

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-white p-3 shadow-sm">
      {config.filters.map((f) => {
        const id = `rf-${f.key}`
        if (f.type === 'dateRange') {
          return (
            <div key={f.key} className="space-y-1">
              <label htmlFor={id} className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">{f.label}</label>
              <Input
                id={id}
                type="date"
                className="h-9 w-[150px]"
                value={draft[f.key] ?? ''}
                onChange={(e) => set(f.key, e.target.value, true)}
              />
            </div>
          )
        }
        if (f.type === 'itemType' || f.type === 'status' || f.type === 'select') {
          return (
            <div key={f.key} className="space-y-1">
              <label htmlFor={id} className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">{f.label}</label>
              <select
                id={id}
                className="h-9 w-[150px] rounded-md border border-input bg-transparent px-3 text-sm shadow-sm"
                value={draft[f.key] ?? ''}
                onChange={(e) => set(f.key, e.target.value, true)}
              >
                <option value="">All</option>
                {(f.options ?? []).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          )
        }
        // text / party / godown — text input (party/godown get a datalist)
        const listSlug = f.type === 'party' ? 'party' : f.type === 'godown' ? 'godown' : null
        return (
          <div key={f.key} className="space-y-1">
            <label htmlFor={id} className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">{f.label}</label>
            <Input
              id={id}
              className="h-9 w-[170px]"
              placeholder={f.placeholder ?? ''}
              list={listSlug ? `${id}-list` : undefined}
              value={draft[f.key] ?? ''}
              onChange={(e) => {
                set(f.key, e.target.value)
                if (listSlug) feedDatalist(listSlug, f.key, e.target.value)
              }}
              onKeyDown={(e) => { if (e.key === 'Enter') push(draft) }}
              onBlur={() => {
                if (draft[f.key] !== (params[f.key] ?? '')) push(draft)
              }}
            />
            {listSlug && (
              <datalist id={`${id}-list`}>
                {(listOptions[f.key] ?? []).map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </datalist>
            )}
          </div>
        )
      })}
      <div className="flex items-center gap-2 pb-0.5">
        <Button size="sm" variant="outline" className="h-9" onClick={() => push({})} disabled={!hasActive && !Object.values(draft).some(Boolean)}>
          <FilterX className="h-3.5 w-3.5 mr-1" /> Clear
        </Button>
        <Button size="sm" variant="outline" className="h-9" onClick={() => push(draft)}>
          <Search className="h-3.5 w-3.5 mr-1" /> Apply
        </Button>
      </div>
    </div>
  )
}
