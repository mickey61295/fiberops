'use client'

/**
 * FlagsAdmin — SPEC-M11 C3. The editable board on /admin/settings:
 * registry flags grouped by category, per-flag effect note, modified-vs-
 * default badge, boolean switches (immediate POST) and number/string inputs
 * (explicit Save), reset-to-default per flag, and the read-only drift table
 * for flag:* rows outside the registry. Every write rides
 * POST /api/config → setFlag; the route re-checks the admin role.
 */
import { useState } from 'react'
import { Loader2, RotateCcw, Save, Settings2 } from 'lucide-react'
import { toast } from 'sonner'
import type { FlagDef } from '@/lib/erp/flags'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

type Values = Record<string, unknown>

const CATEGORY_ORDER: FlagDef['category'][] = ['tolerance', 'commercial', 'module', 'company', 'numbering']
const CATEGORY_LABELS: Record<FlagDef['category'], string> = {
  tolerance: 'Tolerances & Deviations',
  commercial: 'Commercial Switches',
  module: 'Module Behaviour',
  company: 'Company Config',
  numbering: 'Numbering',
}
const TYPE_CHIP: Record<FlagDef['valueType'], string> = {
  boolean: 'bool',
  number: 'num',
  string: 'str',
}

/** Coerce a registry default the same way flags.ts does on read. */
function typedDefault(def: FlagDef): string | number | boolean {
  if (def.valueType === 'number') return Number(def.value)
  if (def.valueType === 'boolean') return def.value === 'true'
  return def.value
}

const NUM_RE = /^-?\d+(\.\d+)?$/

export function FlagsAdmin({
  registry,
  values,
  unknown,
}: {
  registry: FlagDef[]
  values: Values
  unknown: { name: string; value: string }[]
}) {
  const [vals, setVals] = useState<Values>(values)
  const [busy, setBusy] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const write = async (def: FlagDef, value: string | number | boolean) => {
    setBusy(def.name)
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: def.name, value }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        toast.error(data.error || `Request failed (${res.status})`)
      } else {
        setVals((v) => ({ ...v, [def.name]: data.flag.value }))
        setDrafts((d) => {
          const next = { ...d }
          delete next[def.name]
          return next
        })
        toast.success(`${def.name} → ${String(data.flag.value)}`)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Network error')
    } finally {
      setBusy(null)
    }
  }

  const draftFor = (def: FlagDef): string =>
    drafts[def.name] ?? String(vals[def.name] ?? typedDefault(def))
  const dirty = (def: FlagDef): boolean =>
    def.valueType !== 'boolean' && drafts[def.name] !== undefined && drafts[def.name] !== String(vals[def.name] ?? '')
  const draftValid = (def: FlagDef): boolean =>
    def.valueType !== 'number' || NUM_RE.test(drafts[def.name] ?? '')
  const modified = (def: FlagDef): boolean =>
    String(vals[def.name]) !== String(typedDefault(def))

  return (
    <div className="space-y-5" data-testid="flags-admin">
      {CATEGORY_ORDER.map((cat) => {
        const defs = registry.filter((f) => f.category === cat)
        if (!defs.length) return null
        return (
          <Card key={cat} id={cat}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Settings2 className="h-3.5 w-3.5 text-slate-500" />
                {CATEGORY_LABELS[cat]}
                <span className="text-slate-400 font-normal">({defs.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {defs.map((def) => (
                <div
                  key={def.name}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1.5 rounded-md border border-slate-100 px-3 py-2 hover:bg-slate-50/70"
                  data-flag={def.name}
                >
                  <div className="min-w-[240px] flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-800">{def.name}</span>
                      <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">{TYPE_CHIP[def.valueType]}</Badge>
                      {modified(def) && (
                        <Badge className="text-[10px] px-1.5 py-0 h-4 bg-amber-100 text-amber-800 hover:bg-amber-100">
                          modified
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{def.description}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {def.valueType === 'boolean' ? (
                      busy === def.name ? (
                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                      ) : (
                        <Switch
                          checked={vals[def.name] === true}
                          onCheckedChange={(c) => write(def, c)}
                          aria-label={`Toggle ${def.name}`}
                        />
                      )
                    ) : (
                      <>
                        <input
                          value={draftFor(def)}
                          onChange={(e) =>
                            setDrafts((d) => ({ ...d, [def.name]: e.target.value }))
                          }
                          inputMode={def.valueType === 'number' ? 'decimal' : 'text'}
                          aria-label={`Value for ${def.name}`}
                          className={`h-8 w-28 rounded-md border px-2 font-mono text-sm ${
                            dirty(def) && !draftValid(def)
                              ? 'border-red-400 bg-red-50'
                              : 'border-slate-300 bg-white'
                          }`}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8"
                          disabled={!dirty(def) || !draftValid(def) || busy !== null}
                          onClick={() => write(def, drafts[def.name])}
                        >
                          {busy === def.name ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Save className="h-3.5 w-3.5" />
                          )}
                          Save
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8"
                      disabled={!modified(def) || busy !== null}
                      title={`Reset to registry default (${def.value})`}
                      onClick={() => write(def, typedDefault(def))}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )
      })}

      {unknown.length > 0 && (
        <Card id="unknown-flags">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-amber-800">
              Outside the registry ({unknown.length}) — read-only
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-slate-500 mb-2">
              These <span className="font-mono text-xs">flag:*</span> option rows exist in
              the database but are <b>not in the LLD-07 registry</b> — the engine ignores
              them on read, and <span className="font-mono text-xs">setFlag</span> rejects
              their names (drift-safe). Remove or rename them via Options &amp; Settings.
            </p>
            <div className="rounded-md border">
              <table className="w-full text-xs">
                <tbody>
                  {unknown.map((u) => (
                    <tr key={u.name} className="border-b last:border-0">
                      <td className="px-3 py-1.5 font-mono text-slate-700">flag:{u.name}</td>
                      <td className="px-3 py-1.5 font-mono text-slate-500">{u.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
