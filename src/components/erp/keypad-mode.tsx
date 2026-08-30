'use client'

/**
 * SPEC-M22 — the keypad-operator surface. Full-screen overlay (fixed inset-0
 * covers ALL shell chrome — zero CSS hacks against AppScreen), ONLY the
 * required header fields as big touch targets, the two-step save in keypad
 * form (big SAVE → plan review card → CONFIRM → success). Both steps call
 * the SAME planDocAction/commitDocAction server actions DocScreen uses —
 * the form door, the M15 audit door, ADR-001.
 *
 * SPEC-M25 — LINE-GRID support: an optional `lineFields` prop renders the
 * big line editor (one line at a time, ADD/✕, a ≥1-line guard) and the
 * payload carries { header, lines } through both doors.
 */
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { planDocAction, commitDocAction, type DocPlanView } from '@/lib/erp/doc-actions'
import type { KeypadField } from '@/lib/erp/keypad'
import { keypadDefaultFor, KEYPAD_LINES_MAX } from '@/lib/erp/keypad'

interface KeypadModeProps {
  slug: string
  title: string
  fields: KeypadField[]
  exitHref: string
  /** SPEC-M25 — the line schema; when present the overlay requires ≥1 line. */
  lineFields?: KeypadField[]
}

type Phase = 'fill' | 'review' | 'done'

interface PickerFeed {
  options: { value: string; label: string }[]
  loading: boolean
}

export function KeypadMode({ slug, title, fields, exitHref, lineFields }: KeypadModeProps) {
  const [phase, setPhase] = useState<Phase>('fill')
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.map((f) => [f.name, keypadDefaultFor(f)]))
  )
  // SPEC-M25 — the line editor state: committed lines + the in-flight draft.
  const [lines, setLines] = useState<Array<Record<string, string>>>([])
  const [draft, setDraft] = useState<Record<string, string>>(() =>
    Object.fromEntries((lineFields ?? []).map((f) => [f.name, keypadDefaultFor(f)]))
  )
  const [errors, setErrors] = useState<string[]>([])
  const [plan, setPlan] = useState<DocPlanView | null>(null)
  const [doc, setDoc] = useState<any>(null)
  const [busy, setBusy] = useState(false)

  // picker feeds (one per picker field, debounced against the shared read path)
  const [feeds, setFeeds] = useState<Record<string, PickerFeed>>({})
  const [pickerQ, setPickerQ] = useState<Record<string, string>>({})
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    const allPickerFields: Array<{ name: string; picker?: string }> = [
      ...fields,
      ...(lineFields ?? []).map((f) => ({ name: `line:${f.name}`, picker: f.picker })),
    ]
    for (const f of allPickerFields) {
      if (f.picker === undefined) continue
      const q = pickerQ[f.name] ?? ''
      if (timers.current[f.name]) clearTimeout(timers.current[f.name])
      timers.current[f.name] = setTimeout(async () => {
        setFeeds((prev) => ({ ...prev, [f.name]: { options: [], loading: true } }))
        try {
          const url = `/api/erp?resource=master_search&slug=${encodeURIComponent(f.picker!)}&q=${encodeURIComponent(q)}`
          const res = await fetch(url)
          const data = await res.json()
          setFeeds((prev) => ({
            ...prev,
            [f.name]: { options: Array.isArray(data.options) ? data.options.slice(0, 12) : [], loading: false },
          }))
        } catch {
          setFeeds((prev) => ({ ...prev, [f.name]: { options: [], loading: false } }))
        }
      }, 220)
    }
    return () => {
      for (const t of Object.values(timers.current)) clearTimeout(t)
    }
  }, [fields, lineFields, pickerQ])

  const set = (name: string, v: string) => setValues((prev) => ({ ...prev, [name]: v }))

  // SPEC-M25 — line editor helpers: add (required-complete only), remove, label.
  const addLine = () => {
    if (!lineFields) return
    const missing = lineFields.filter((f) => !(draft[f.name] ?? '').trim())
    if (missing.length > 0) {
      setErrors([`Line incomplete — ${missing.map((f) => f.label).join(', ')} required`])
      return
    }
    if (lines.length >= KEYPAD_LINES_MAX) {
      setErrors([`Line limit reached (${KEYPAD_LINES_MAX}) — use the full screen for bigger DCs`])
      return
    }
    setErrors([])
    setLines((prev) => [...prev, { ...draft }])
    setDraft(Object.fromEntries(lineFields.map((f) => [f.name, keypadDefaultFor(f)])))
  }
  const removeLine = (idx: number) => setLines((prev) => prev.filter((_, i) => i !== idx))
  const lineLabel = (l: Record<string, string>) =>
    [l.styleNo, l.colourName, l.sizeName, l.qty].filter(Boolean).join(' · ')

  const save = async () => {
    if (lineFields && lines.length === 0) {
      setErrors(['Add at least one line — use + ADD LINE below'])
      return
    }
    setBusy(true)
    setErrors([])
    try {
      const res = await planDocAction(slug, { header: values, lines })
      if (res.ok) {
        setPlan(res.plan)
        setPhase('review')
      } else {
        setErrors(res.errors)
      }
    } finally {
      setBusy(false)
    }
  }

  const confirm = async () => {
    setBusy(true)
    setErrors([])
    try {
      // The plan payload is re-derived server-side inside commitDocAction —
      // the SAME doc-actions door DocScreen uses (never trust client state).
      const res = await commitDocAction(slug, { header: values, lines })
      if (res.ok) {
        setDoc(res.doc)
        setPhase('done')
      } else {
        setErrors(res.errors)
      }
    } finally {
      setBusy(false)
    }
  }

  const nextEntry = () => {
    setValues(Object.fromEntries(fields.map((f) => [f.name, keypadDefaultFor(f)])))
    setLines([])
    setDraft(Object.fromEntries((lineFields ?? []).map((f) => [f.name, keypadDefaultFor(f)])))
    setPlan(null)
    setDoc(null)
    setErrors([])
    setPhase('fill')
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 text-white overflow-auto" data-testid="keypad-surface">
      <div className="max-w-2xl mx-auto p-5 space-y-4 pb-24">
        {/* header */}
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-emerald-400">Keypad mode</div>
            <h1 className="text-2xl font-bold">{title}</h1>
          </div>
          <a href={exitHref} className="text-sm text-slate-400 underline" data-testid="keypad-exit">Exit keypad</a>
        </div>

        {phase === 'fill' && (
          <div className="space-y-4" data-testid="keypad-fill">
            {fields.map((f) => (
              <div key={f.name} className="space-y-1.5">
                <label className="text-sm font-semibold text-slate-300">{f.label}</label>
                {f.type === 'select' ? (
                  <select
                    className="w-full h-14 rounded-lg bg-slate-900 border border-slate-700 px-4 text-lg"
                    value={values[f.name] ?? ''}
                    onChange={(e) => set(f.name, e.target.value)}
                  >
                    <option value="">— select —</option>
                    {(f.options ?? []).map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ) : f.type === 'picker' ? (
                  <div className="space-y-2">
                    <input
                      className="w-full h-14 rounded-lg bg-slate-900 border border-slate-700 px-4 text-lg"
                      placeholder={`Search ${f.label.toLowerCase()}…`}
                      value={pickerQ[f.name] ?? ''}
                      onChange={(e) => setPickerQ((p) => ({ ...p, [f.name]: e.target.value }))}
                    />
                    {values[f.name] && (
                      <div className="text-sm text-emerald-400">Selected: <span className="font-mono">{values[f.name]}</span></div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                      {(feeds[f.name]?.options ?? []).map((o) => (
                        <button
                          key={o.value}
                          type="button"
                          className="h-12 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-sm font-medium truncate px-3"
                          onClick={() => set(f.name, o.value)}
                        >
                          {o.label || o.value}
                        </button>
                      ))}
                      {feeds[f.name]?.loading && <div className="text-xs text-slate-500">Loading…</div>}
                      {!feeds[f.name]?.loading && (feeds[f.name]?.options ?? []).length === 0 && (
                        <div className="text-xs text-slate-500">Type to search.</div>
                      )}
                    </div>
                  </div>
                ) : (
                  <input
                    className="w-full h-14 rounded-lg bg-slate-900 border border-slate-700 px-4 text-lg"
                    type={f.type === 'date' ? 'date' : f.type === 'number' ? 'number' : 'text'}
                    inputMode={f.type === 'number' ? 'decimal' : undefined}
                    value={values[f.name] ?? ''}
                    onChange={(e) => set(f.name, e.target.value)}
                  />
                )}
              </div>
            ))}
            {phase === 'fill' && lineFields && lineFields.length > 0 && (
              <div className="space-y-3 pt-2" data-testid="keypad-lines">
                <div className="text-xs uppercase tracking-widest text-emerald-400">Lines ({lines.length})</div>
                {lines.map((l, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg bg-slate-900 border border-slate-700 px-4 h-14">
                    <div className="flex-1 text-lg font-medium truncate" data-testid={`keypad-line-${i}`}>{lineLabel(l)}</div>
                    <button
                      type="button"
                      className="h-10 w-10 rounded-lg bg-red-950 border border-red-800 text-red-300 text-lg font-bold"
                      onClick={() => removeLine(i)}
                      aria-label={`Remove line ${i + 1}`}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                <div className="rounded-xl bg-slate-900 border border-slate-700 p-3 space-y-2">
                  <div className="text-sm text-slate-400">Add a line</div>
                  {lineFields.map((f) => (
                    <div key={f.name} className="space-y-1">
                      <label className="text-xs font-semibold text-slate-400">{f.label}</label>
                      {f.type === 'picker' ? (
                        <div className="space-y-2">
                          <input
                            className="w-full h-14 rounded-lg bg-slate-900 border border-slate-700 px-4 text-lg"
                            placeholder={`Search ${f.label.toLowerCase()}…`}
                            value={pickerQ[`line:${f.name}`] ?? draft[f.name] ?? ''}
                            onChange={(e) => {
                              setPickerQ((p) => ({ ...p, [`line:${f.name}`]: e.target.value }))
                              setDraft((prev) => ({ ...prev, [f.name]: e.target.value }))
                            }}
                          />
                          <div className="grid grid-cols-2 gap-2">
                            {(feeds[`line:${f.name}`]?.options ?? []).map((o) => (
                              <button
                                key={o.value}
                                type="button"
                                className="h-12 rounded-lg bg-slate-800 border border-slate-700 hover:bg-slate-700 text-sm font-medium truncate px-3"
                                onClick={() => {
                                  setDraft((prev) => ({ ...prev, [f.name]: o.value }))
                                  setPickerQ((p) => ({ ...p, [`line:${f.name}`]: '' }))
                                }}
                              >
                                {o.label || o.value}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <input
                          className="w-full h-14 rounded-lg bg-slate-900 border border-slate-700 px-4 text-lg"
                          type={f.type === 'number' ? 'number' : 'text'}
                          inputMode={f.type === 'number' ? 'decimal' : undefined}
                          value={draft[f.name] ?? ''}
                          onChange={(e) => setDraft((prev) => ({ ...prev, [f.name]: e.target.value }))}
                        />
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    className="w-full h-14 rounded-xl bg-slate-700 hover:bg-slate-600 text-lg font-bold"
                    onClick={addLine}
                    data-testid="keypad-add-line"
                  >
                    + ADD LINE
                  </button>
                </div>
              </div>
            )}
            {errors.length > 0 && (
              <div className="rounded-lg bg-red-950 border border-red-800 p-3 text-red-200 text-base space-y-1" data-testid="keypad-errors">
                {errors.map((e, i) => <div key={i}>{e}</div>)}
              </div>
            )}
            <button
              type="button"
              className="w-full h-16 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xl font-bold"
              disabled={busy}
              onClick={save}
              data-testid="keypad-save"
            >
              {busy ? 'Checking…' : 'SAVE'}
            </button>
          </div>
        )}

        {phase === 'review' && plan && (
          <div className="space-y-4" data-testid="keypad-review">
            <div className="rounded-xl bg-slate-900 border border-slate-700 p-4 space-y-2">
              <div className="text-xs uppercase tracking-widest text-amber-400">Review before commit</div>
              <div className="text-lg font-semibold">{plan.summary}</div>
              {plan.sideEffects?.map((s, i) => <div key={i} className="text-sm text-slate-400">· {s}</div>)}
              {plan.creates?.length ? (
                <div className="text-sm text-slate-400">Creates {plan.creates.length} row(s){plan.updates?.length ? ` · updates ${plan.updates.length}` : ''}</div>
              ) : null}
            </div>
            {errors.length > 0 && (
              <div className="rounded-lg bg-red-950 border border-red-800 p-3 text-red-200 text-base" data-testid="keypad-errors">
                {errors.map((e, i) => <div key={i}>{e}</div>)}
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <button type="button" className="h-16 rounded-xl bg-slate-700 hover:bg-slate-600 text-lg font-bold" onClick={() => setPhase('fill')}>
                ◀ Back to edit
              </button>
              <button
                type="button"
                className="h-16 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xl font-bold"
                disabled={busy}
                onClick={confirm}
                data-testid="keypad-confirm"
              >
                {busy ? 'Committing…' : 'CONFIRM'}
              </button>
            </div>
          </div>
        )}

        {phase === 'done' && (
          <div className="space-y-4 text-center py-6" data-testid="keypad-done">
            <div className="text-5xl">✓</div>
            <div className="text-2xl font-bold">Committed</div>
            {doc?.docNo && <div className="text-3xl font-mono text-emerald-400">{doc.docNo}</div>}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button type="button" className="h-16 rounded-xl bg-slate-700 hover:bg-slate-600 text-lg font-bold" onClick={nextEntry}>
                Next entry
              </button>
              <a href={exitHref} className="h-16 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-lg font-bold flex items-center justify-center">
                Exit keypad
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
