'use client'

/**
 * W4 picker with create-on-the-fly (SPEC-M3 §9.3).
 * Command-style searchable dropdown fed by `/api/erp?resource=master_search`
 * (the SAME listMasters read path). "+ New <Entity>" opens a create Sheet
 * reusing MasterFieldInput + saveMasterAction (the master-service door);
 * on save the picker selects the new record. The parent DocScreen's draft
 * state is NEVER touched by this overlay — create-on-the-fly cannot lose it.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronsUpDown, Loader2, Plus, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { saveMasterAction } from '@/app/(erp)/masters/actions'
import { MasterFieldInput } from '@/components/archetypes/master-table'
import { getMasterConfig } from '@/lib/erp/master-configs'

interface Option {
  value: string
  label: string
}

export interface DocPickerProps {
  /** master slug, e.g. 'buyer' | 'style' | 'colour' */
  slug: string
  /** master record field emitted on select (default: codeField ?? titleField) */
  valueField?: string
  value: string
  onChange: (value: string) => void
  label: string
  required?: boolean
  placeholder?: string
  /** compact line-grid variant (no label row) */
  inline?: boolean
  /** ERRATUM 7 (M5 Wave B) — server-side equality filter on the picker feed
   *  (e.g. wage payments pin the party picker to partyType=employee) */
  filter?: { field: string; value: string }
}

export function DocPicker({ slug, valueField, value, onChange, label, required, placeholder, inline, filter }: DocPickerProps) {
  const config = getMasterConfig(slug)
  const vField = valueField || config?.codeField || config?.titleField || 'code'
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [options, setOptions] = useState<Option[]>([])
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createErrors, setCreateErrors] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  // SPEC-M17 (picker focus-return): when the dropdown closes WITHOUT opening the
  // create sheet, focus returns to the trigger — keyboard flow never drops.
  const wasOpenRef = useRef(false)
  useEffect(() => {
    if (wasOpenRef.current && !open && !creating) triggerRef.current?.focus()
    wasOpenRef.current = open
  }, [open, creating])

  // debounced search against the shared read path
  useEffect(() => {
    if (!open) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        let url = `/api/erp?resource=master_search&slug=${encodeURIComponent(slug)}&valueField=${encodeURIComponent(vField)}&q=${encodeURIComponent(q)}`
        // ERRATUM 7 (M5 Wave B) — server-side equality filter (wage payments:
        // party picker pinned to employee parties)
        if (filter) url += `&filterField=${encodeURIComponent(filter.field)}&filterValue=${encodeURIComponent(filter.value)}`
        const res = await fetch(url)
        const data = await res.json()
        setOptions(Array.isArray(data.options) ? data.options : [])
      } catch {
        setOptions([])
      } finally {
        setLoading(false)
      }
    }, 220)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [open, q, slug, vField, filter?.field, filter?.value])

  // close dropdown on outside click
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const selectedLabel = useMemo(() => {
    if (!value) return ''
    const hit = options.find((o) => o.value === value)
    return hit ? hit.label.split(' — ')[0] : value
  }, [value, options])

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!config) return
    const fd = new FormData(e.currentTarget)
    setSubmitting(true)
    setCreateErrors([])
    try {
      const res = await saveMasterAction(config.slug, null, fd)
      if (res.ok) {
        // select the new record (code when auto-assigned, else the title field)
        const created = res.code || String(fd.get(config.titleField) || '')
        if (created) onChange(created)
        setCreating(false)
        setOpen(false)
      } else {
        setCreateErrors(res.errors)
      }
    } catch (err: unknown) {
      setCreateErrors([err instanceof Error ? err.message : String(err)])
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      {!inline && (
        <Label className="text-xs font-medium">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </Label>
      )}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => { setOpen((o) => !o); setQ('') }}
        className={`mt-1 flex w-full items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-2.5 ${inline ? 'h-8' : 'h-9'} text-left text-sm ${value ? 'text-slate-900' : 'text-slate-400'} hover:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-200`}
        aria-label={label}
      >
        <span className={`truncate ${inline ? 'text-xs' : ''}`}>
          {selectedLabel || placeholder || `Search ${label.toLowerCase()}…`}
        </span>
        <ChevronsUpDown className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-56 rounded-md border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-slate-100 px-2.5 py-2">
            <Search className="h-3.5 w-3.5 text-slate-400" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={`Search ${config?.label.toLowerCase() || slug}…`}
              className="w-full text-sm outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Escape') setOpen(false)
                if (e.key === 'Enter' && options.length > 0) {
                  e.preventDefault()
                  onChange(options[0].value)
                  setOpen(false)
                }
              }}
            />
            {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400" />}
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            {options.length === 0 && !loading && (
              <div className="px-3 py-3 text-xs text-slate-500">
                No match{q ? ` for “${q}”` : ''} — create it below.
              </div>
            )}
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false) }}
                className={`block w-full px-3 py-1.5 text-left text-xs hover:bg-emerald-50 ${o.value === value ? 'bg-emerald-50 font-medium text-emerald-800' : 'text-slate-700'}`}
              >
                {o.label}
              </button>
            ))}
          </div>
          {config && (
            <button
              type="button"
              onClick={() => { setCreating(true); setOpen(false); setCreateErrors([]) }}
              className="flex w-full items-center gap-1.5 border-t border-slate-100 px-3 py-2 text-left text-xs font-medium text-emerald-700 hover:bg-emerald-50"
            >
              <Plus className="h-3.5 w-3.5" /> New {config.singular}
            </button>
          )}
        </div>
      )}

      {/* create-on-the-fly — the SAME master-service door (ADR-001) */}
      <Sheet open={creating} onOpenChange={(o) => { if (!o) setCreating(false) }}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0">
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-slate-100">
            <SheetTitle className="text-base">New {config?.singular ?? slug}</SheetTitle>
            <SheetDescription className="text-xs">
              Created via the same service as the agent&apos;s {config?.createTool} tool. Your form draft is preserved.
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleCreate} className="px-5 py-4 space-y-3.5">
            {createErrors.length > 0 && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 space-y-1">
                {createErrors.map((e, i) => <div key={i}>{e}</div>)}
              </div>
            )}
            {config?.fields.map((f) => (
              <div key={f.name} className="space-y-1">
                <Label htmlFor={`dp-${f.name}`} className="text-xs font-medium">
                  {f.label}
                  {f.required && !config.codePrefix ? <span className="text-red-500 ml-0.5">*</span> : null}
                  {f.required && config.codePrefix && f.name === config.codeField ? (
                    <span className="text-slate-400 ml-1 font-normal">(auto if blank)</span>
                  ) : null}
                </Label>
                <MasterFieldInput field={f} id={`dp-${f.name}`} defaultValue={f.defaultValue ?? ''} />
                {f.refEntity && <p className="text-[11px] text-slate-400">Accepts code or name</p>}
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={submitting}>
                {submitting ? 'Creating…' : `Create ${config?.singular}`}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setCreating(false)} disabled={submitting}>
                Cancel
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
