'use client'

/**
 * MasterTable archetype engine (SPEC-M2 §8.1).
 * One config-driven CRUD screen per master entity: grid + client search +
 * CSV export + create/edit slide-over. The save path goes through the SAME
 * master-service the agent tools call (ADR-001) — via the server action
 * `saveMasterAction`.
 */
import { useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Download, Pencil, Plus, Search, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { useAgent } from '@/components/agent/agent-panel-provider'
import { saveMasterAction } from '@/app/(erp)/masters/actions'
import type { MasterConfig, MasterRow } from '@/lib/erp/master-configs/types'

type EditState = { mode: 'new' } | { mode: 'edit'; row: MasterRow } | null

export function MasterTable({ config, rows }: { config: MasterConfig; rows: MasterRow[] }) {
  const router = useRouter()
  const { openAgent } = useAgent()
  const [search, setSearch] = useState('')
  const [editing, setEditing] = useState<EditState>(null)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<string[]>([])
  const searchRef = useRef<HTMLInputElement>(null)

  const filtered = useMemo(() => {
    if (!search.trim()) return rows
    const q = search.trim().toLowerCase()
    return rows.filter((r) => config.searchFields.some((f) => String(r[f] ?? '').toLowerCase().includes(q)))
  }, [rows, search, config])

  function exportCsv() {
    const cols = config.listColumns
    const esc = (v: unknown) => {
      const s = v === null || v === undefined ? '' : String(v)
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }
    const head = cols.map((c) => esc(c.label)).join(',')
    const body = filtered.map((r) => cols.map((c) => esc(r[c.field])).join(',')).join('\n')
    const blob = new Blob([head + '\n' + body + '\n'], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${config.slug}-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!editing) return
    const form = e.currentTarget
    const fd = new FormData(form)
    setSubmitting(true)
    setErrors([])
    try {
      const id = editing.mode === 'edit' ? editing.row.id : null
      const res = await saveMasterAction(config.slug, id, fd)
      if (res.ok) {
        setEditing(null)
        router.refresh()
      } else {
        setErrors(res.errors)
      }
    } catch (err: unknown) {
      setErrors([err instanceof Error ? err.message : String(err)])
    } finally {
      setSubmitting(false)
    }
  }

  const defaultValues = useMemo(() => {
    const v: Record<string, string> = {}
    for (const f of config.fields) {
      if (f.defaultValue !== undefined) v[f.name] = String(f.defaultValue)
      else if (f.type === 'checkbox') v[f.name] = 'false'
    }
    return v
  }, [config])

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            ref={searchRef}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={`Search ${config.label.toLowerCase()}… (press /)`}
            className="pl-8 h-9"
            onKeyDown={(e) => { if (e.key === 'Escape') setSearch('') }}
          />
        </div>
        <Button
          size="sm" variant="outline" onClick={() => searchRef.current?.focus()}
          className="hidden md:inline-flex text-xs text-slate-500" tabIndex={-1}
        >
          /
        </Button>
        <Button
          size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white"
          onClick={() => { setEditing({ mode: 'new' }); setErrors([]) }}
        >
          <Plus className="h-3.5 w-3.5 mr-1" /> New {config.singular}
        </Button>
        <Button size="sm" variant="outline" onClick={exportCsv} title="Export filtered rows to CSV">
          <Download className="h-3.5 w-3.5 mr-1" /> CSV
        </Button>
        <Button
          size="sm" variant="outline"
          onClick={() => openAgent(`Show me ${config.label} — list them and help me create or update one`)}
          title="Open the agent panel (the other door to the same data)"
        >
          <Sparkles className="h-3.5 w-3.5 mr-1" /> Ask agent
        </Button>
      </div>

      {/* Grid */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="overflow-x-auto max-h-[65vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 text-slate-700 text-xs uppercase sticky top-0 z-10">
              <tr>
                {config.listColumns.map((c) => (
                  <th key={c.field} className={`text-left px-3 py-2 font-medium ${c.numeric ? 'text-right' : ''}`}>
                    {c.label}
                  </th>
                ))}
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr
                  key={row.id}
                  className="border-t border-slate-100 hover:bg-slate-50 cursor-pointer"
                  onClick={() => { setEditing({ mode: 'edit', row }); setErrors([]) }}
                >
                  {config.listColumns.map((c) => (
                    <td
                      key={c.field}
                      className={`px-3 py-2 ${c.mono ? 'font-mono text-xs' : ''} ${c.numeric ? 'text-right tabular-nums' : ''} ${row[c.field] === null || row[c.field] === undefined || row[c.field] === '' ? 'text-slate-300' : ''}`}
                    >
                      {row[c.field] === null || row[c.field] === undefined || row[c.field] === ''
                        ? '—'
                        : typeof row[c.field] === 'boolean'
                          ? (row[c.field] ? 'Yes' : 'No')
                          : String(row[c.field])}
                    </td>
                  ))}
                  <td className="px-2 py-2 text-slate-300">
                    <Pencil className="h-3.5 w-3.5" />
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={config.listColumns.length + 1} className="px-3 py-8 text-center text-slate-500 text-sm">
                    No {config.label.toLowerCase()} {search ? 'match your search' : 'yet'} —{' '}
                    <button className="text-emerald-700 underline" onClick={() => { setEditing({ mode: 'new' }); setErrors([]) }}>
                      create the first one
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="border-t border-slate-100 bg-slate-50 px-3 py-1.5 text-xs text-slate-500">
          {filtered.length} of {rows.length} {config.label.toLowerCase().replace(/s$/, '')}
          {config.codePrefix ? ` · codes auto-assigned ${config.codePrefix}####` : ''} · same data as the agent&apos;s{' '}
          <span className="font-mono">{config.listTool}</span>
        </div>
      </div>

      {/* Create / Edit slide-over */}
      <Sheet open={editing !== null} onOpenChange={(o) => { if (!o) setEditing(null) }}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto p-0">
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-slate-100">
            <SheetTitle className="text-base">
              {editing?.mode === 'new' ? `New ${config.singular}` : `Edit ${config.singular}`}
              {editing?.mode === 'edit' && config.codeField ? (
                <span className="ml-2 font-mono text-xs text-slate-400">{String(editing.row[config.codeField] ?? '')}</span>
              ) : null}
            </SheetTitle>
            <SheetDescription className="text-xs">
              {editing?.mode === 'new'
                ? `Saved via the same service as the agent's ${config.createTool} tool.`
                : `Saved via the same service as the agent's ${config.updateTool} tool.`}
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="px-5 py-4 space-y-3.5">
            {errors.length > 0 && (
              <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 space-y-1">
                {errors.map((e, i) => <div key={i}>{e}</div>)}
              </div>
            )}
            {config.fields.map((f) => (
              <div key={f.name} className="space-y-1">
                <Label htmlFor={`mf-${f.name}`} className="text-xs font-medium">
                  {f.label}
                  {f.required && !config.codePrefix ? <span className="text-red-500 ml-0.5">*</span> : null}
                  {f.required && config.codePrefix && f.name === config.codeField ? (
                    <span className="text-slate-400 ml-1 font-normal">(auto if blank)</span>
                  ) : null}
                </Label>
                <MasterFieldInput
                  field={f}
                  id={`mf-${f.name}`}
                  defaultValue={editing?.mode === 'edit' ? editing.row[f.name] : defaultValues[f.name]}
                />
                {f.refEntity && (
                  <p className="text-[11px] text-slate-400">Accepts code or name</p>
                )}
              </div>
            ))}
            <div className="flex gap-2 pt-2">
              <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={submitting}>
                {submitting ? 'Saving…' : editing?.mode === 'new' ? `Create ${config.singular}` : 'Save changes'}
              </Button>
              <Button type="button" size="sm" variant="outline" onClick={() => setEditing(null)} disabled={submitting}>
                Cancel
              </Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}

/** Exported for the W4 doc-picker create-on-the-fly Sheet (SPEC-M3 §9.3) —
 *  same field renderer, same saveMasterAction → same service (ADR-001). */
export function MasterFieldInput({
  field,
  id,
  defaultValue,
}: {
  field: MasterConfig['fields'][number]
  id: string
  defaultValue: unknown
}) {
  const str = defaultValue === null || defaultValue === undefined ? '' : String(defaultValue)

  if (field.type === 'checkbox') {
    return (
      <label className="flex items-center gap-2 text-sm py-1" htmlFor={id}>
        <Checkbox id={id} name={field.name} defaultChecked={str === 'true'} />
        <span className="text-slate-600 text-xs">{field.description || field.label}</span>
      </label>
    )
  }
  if (field.type === 'select') {
    return (
      <Select name={field.name} defaultValue={str || undefined}>
        <SelectTrigger id={id} className="h-9">
          <SelectValue placeholder={`Select ${field.label.toLowerCase()}…`} />
        </SelectTrigger>
        <SelectContent>
          {(field.options || []).map((o) => (
            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }
  if (field.type === 'textarea') {
    return <Textarea id={id} name={field.name} defaultValue={str} rows={2} placeholder={field.placeholder} />
  }
  const inputType = field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'
  return (
    <Input
      id={id}
      name={field.name}
      type={inputType}
      step={field.type === 'number' ? 'any' : undefined}
      defaultValue={field.type === 'date' && str ? str.slice(0, 10) : str}
      placeholder={field.placeholder || (field.refEntity ? 'code or name' : undefined)}
      className="h-9"
    />
  )
}
