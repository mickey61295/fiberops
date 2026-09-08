'use client'

/**
 * StatutoryAdmin — SPEC-M47 L-03. The rates board on /admin/statutory: one
 * card per head (PF/ESI/PT/LWF) — enabled toggle + rate/threshold inputs
 * with per-field effect notes, a modified-vs-default badge, and a per-card
 * Save (server action → setStatutory, registry drift-safe). Rates are read
 * by payroll PLAN time and frozen onto the run's lines — a save never
 * moves an already-drafted run.
 */
import { useState } from 'react'
import { Loader2, Save } from 'lucide-react'
import { toast } from 'sonner'
import type { StatDef } from '@/lib/erp/statutory'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { updateStatutoryAction } from './actions'

type Values = Record<string, unknown>

const HEAD_LABELS: Record<StatDef['category'], { label: string; note: string }> = {
  pf: { label: 'Provident Fund (PF)', note: 'Applies to employees with a UAN. Employee share is deducted from net; employer share + EPS/EDLI/admin are register data.' },
  esi: { label: 'Employee State Insurance (ESI)', note: 'Applies when a line\u2019s gross is within the wage threshold. IP number lives on the employee master (esiNo).' },
  pt: { label: 'Professional Tax (PT)', note: 'Single monthly slab: line earned above the threshold ⇒ monthly amount × months in the run window.' },
  lwf: { label: 'Labour Welfare Fund (LWF)', note: 'Flat per month on every earning line (employee deducted, employer register data).' },
}
const HEAD_ORDER: StatDef['category'][] = ['pf', 'esi', 'pt', 'lwf']

export function StatutoryAdmin({ registry, values }: { registry: StatDef[]; values: Values }) {
  const [vals, setVals] = useState<Values>(values)
  const [busy, setBusy] = useState<string | null>(null)

  const save = async (head: StatDef['category']) => {
    setBusy(head)
    const fd = new FormData()
    fd.set('__head', head)
    for (const def of registry.filter((d) => d.category === head)) {
      const v = vals[def.name]
      if (def.valueType === 'boolean') fd.set(def.name, v === true || v === 'true' ? 'true' : 'false')
      else fd.set(def.name, String(v ?? ''))
    }
    const res = await updateStatutoryAction(fd)
    setBusy(null)
    if (res.ok) toast.success(res.text)
    else toast.error(res.text)
  }

  return (
    <div className="space-y-4">
      {HEAD_ORDER.map((head) => {
        const defs = registry.filter((d) => d.category === head)
        const enabled = !!(vals[`${head}.enabled`] === true || vals[`${head}.enabled`] === 'true')
        return (
          <Card key={head} className={enabled ? '' : 'opacity-90'}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-sm">
                    {HEAD_LABELS[head].label}
                    <Badge variant={enabled ? 'default' : 'secondary'} className="text-[10px]">
                      {enabled ? 'armed' : 'off'}
                    </Badge>
                  </CardTitle>
                  <p className="mt-1 text-xs text-slate-500">{HEAD_LABELS[head].note}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={enabled}
                    onCheckedChange={(c) => setVals((v) => ({ ...v, [`${head}.enabled`]: c }))}
                    aria-label={`${head} enabled`}
                  />
                  <span className="text-xs text-slate-500">enabled</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {defs.filter((d) => !d.name.endsWith('.enabled')).map((def) => {
                const current = vals[def.name]
                const modified = String(current ?? '') !== def.value
                return (
                  <div key={def.name} className="space-y-1">
                    <label className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                      {def.name.slice(head.length + 1)}
                      {modified ? <Badge variant="outline" className="text-[10px]">modified</Badge> : null}
                    </label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={String(current ?? '')}
                      onChange={(e) => setVals((v) => ({ ...v, [def.name]: e.target.value }))}
                      className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                    />
                    <p className="text-[11px] leading-tight text-slate-400">{def.description}</p>
                  </div>
                )
              })}
              <div className="flex items-end justify-end sm:col-span-2 lg:col-span-4">
                <Button size="sm" onClick={() => save(head)} disabled={busy === head}>
                  {busy === head ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Save className="mr-1.5 h-3.5 w-3.5" />}
                  Save {head.toUpperCase()}
                </Button>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
