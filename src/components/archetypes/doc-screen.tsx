'use client'

/**
 * DocScreen archetype engine (SPEC-M3 §10).
 * One config-driven transaction screen in three modes: New (header grid →
 * pickers → line grid → totals → Save → REVIEW → Commit), View (read-only),
 * AI-prefill (Wave D). The save path goes through the SAME posting services
 * the agent tools call (ADR-001) — via the generic server actions
 * planDocAction/commitDocAction (lib/erp/doc-actions.ts).
 *
 * Draft preservation (§9.3): header + lines live in THIS component's state;
 * picker create-on-the-fly overlays (Sheets) never unmount it.
 */
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, Check, ChevronLeft, Loader2, Paperclip, Plus, Sparkles, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { ChainBar } from '@/components/erp/chain-bar'
import { DocPicker } from '@/components/erp/doc-picker'
import { useAgent } from '@/components/agent/agent-panel-provider'
import { planDocAction, commitDocAction, type DocPlanView } from '@/lib/erp/doc-actions'
import { CHAIN, nextStage, resolveStageUrl, type ChainStateFlags } from '@/lib/erp/chain'
import type { DocScreenConfig, DocField, DocLineField } from '@/lib/erp/doc-configs/types'

type Phase = 'edit' | 'review' | 'done'

export interface DocScreenProps {
  config: DocScreenConfig
  mode: 'new' | 'view'
  /** view mode: the doc record (flattened) */
  initial?: Record<string, unknown>
  /** view mode: doc number for the header */
  docNo?: string
  /** new mode: pre-filled header values (e.g. ?order=SO-1001 prefills orderNo) */
  prefill?: Record<string, string>
  /** view route pattern for links, e.g. '/orders/[id]' */
  viewRoutePattern?: string
  /** view mode: chain state for the bar */
  chainState?: Partial<ChainStateFlags>
  /** chain CTA context */
  chainCtx?: { orderNo?: string; poNo?: string; dcNo?: string; invoiceNo?: string; id?: string }
}

const emptyRow = (fields: DocLineField[]): Record<string, string> =>
  Object.fromEntries(fields.map((f) => [f.name, '']))

export function DocScreen({
  config, mode, initial, docNo, prefill, viewRoutePattern, chainState, chainCtx,
}: DocScreenProps) {
  const { openAgent } = useAgent()
  const [phase, setPhase] = useState<Phase>('edit')
  const [header, setHeader] = useState<Record<string, string>>(() => ({
    ...Object.fromEntries(config.headerFields.map((f) => [f.name, ''])),
    ...(prefill ?? {}),
  }))
  const [lines, setLines] = useState<Array<Record<string, string>>>(() =>
    config.lineFields ? [emptyRow(config.lineFields)] : [],
  )
  const [plan, setPlan] = useState<DocPlanView | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [committed, setCommitted] = useState<Record<string, unknown> | null>(null)

  const hasLineEditor = !!config.lineFields?.length
  const qtyField = config.lineFields?.find((f) => f.name === 'qty')
  const rateField = config.lineFields?.find((f) => f.name === 'rate')

  const totals = useMemo(() => {
    const qty = lines.reduce((s, l) => s + (Number(l.qty) || 0), 0)
    const value = lines.reduce((s, l) => s + (Number(l.qty) || 0) * (Number(l.rate) || 0), 0)
    return { qty, value }
  }, [lines])

  function setCell(rowIdx: number, name: string, value: string) {
    setLines((prev) => prev.map((row, i) => (i === rowIdx ? { ...row, [name]: value } : row)))
  }

  async function save() {
    if (busy) return
    setBusy(true)
    setErrors([])
    try {
      const res = await planDocAction(config.slug, { header, lines })
      if (res.ok) {
        setPlan(res.plan)
        setPhase('review')
      } else {
        setErrors(res.errors)
      }
    } catch (err: unknown) {
      setErrors([err instanceof Error ? err.message : String(err)])
    } finally {
      setBusy(false)
    }
  }

  async function commit() {
    if (busy || !plan) return
    setBusy(true)
    setErrors([])
    try {
      const res = await commitDocAction(config.slug, { header, lines })
      if (res.ok) {
        setCommitted(res.doc ?? {})
        setPhase('done')
        toast.success(plan.summary)
      } else {
        setErrors(res.errors)
      }
    } catch (err: unknown) {
      setErrors([err instanceof Error ? err.message : String(err)])
    } finally {
      setBusy(false)
    }
  }

  function resetForAnother() {
    setHeader({ ...Object.fromEntries(config.headerFields.map((f) => [f.name, ''])), ...(prefill ?? {}) })
    setLines(config.lineFields ? [emptyRow(config.lineFields)] : [])
    setPlan(null)
    setCommitted(null)
    setErrors([])
    setPhase('edit')
  }

  // post-commit "Next →": the stage AFTER this doc's stage (chain order).
  const nextAfterCommit = useMemo(() => {
    if (!config.chainStage || !committed) return null
    const next = CHAIN[config.chainStage] // step chainStage+1
    if (!next) return null
    const ctx = {
      id: (committed.id as string) || undefined,
      orderNo: (committed.orderNo as string) || chainCtx?.orderNo,
      poNo: (committed.poNo as string) || undefined,
      dcNo: (committed.dcNo as string) || undefined,
      invoiceNo: (committed.invoiceNo as string) || undefined,
    }
    return { next, url: resolveStageUrl(next, ctx) }
  }, [config.chainStage, committed, chainCtx?.orderNo])

  const viewUrl = committed?.id && viewRoutePattern ? viewRoutePattern.replace('[id]', String(committed.id)) : null

  // ------------------------------------------------------------------ VIEW
  if (mode === 'view') {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-lg font-semibold">
            {config.title}
            {docNo && <span className="ml-2 font-mono text-base text-slate-500">{docNo}</span>}
          </h1>
          <div className="flex gap-1">
            {config.agentTools.map((t) => (
              <Badge key={t} variant="outline" className="text-[10px] font-mono">{t}</Badge>
            ))}
          </div>
        </div>
        <ChainBar state={chainState} currentStage={config.chainStage} ctx={chainCtx} />
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            {config.headerFields.map((f) => (
              <div key={f.name} className={f.colSpan === 2 ? 'sm:col-span-2' : ''}>
                <div className="text-[11px] uppercase tracking-wide text-slate-400">{f.label}</div>
                <FieldValue field={f} value={initial?.[f.name]} />
              </div>
            ))}
          </div>
        </div>
        {hasLineEditor && Array.isArray(initial?.lines) && (
          <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-100 text-slate-700 text-xs uppercase">
                <tr>
                  {config.lineFields!.map((f) => (
                    <th key={f.name} className="text-left px-3 py-2 font-medium">{f.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(initial!.lines as Array<Record<string, unknown>>).map((row, i) => (
                  <tr key={i} className="border-t border-slate-100">
                    {config.lineFields!.map((f) => (
                      <td key={f.name} className="px-3 py-2">{row[f.name] === undefined || row[f.name] === null ? '—' : String(row[f.name])}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  // ------------------------------------------------------------------ NEW
  return (
    <div
      className="space-y-4"
      onKeyDown={(e) => {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
          e.preventDefault()
          if (phase === 'edit') save()
        }
      }}
    >
      {/* Header row */}
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-lg font-semibold">New {config.title}</h1>
        {config.numberPrefix && (
          <span className="text-xs text-slate-400 font-mono">
            {config.numberPrefix}#### auto if blank
          </span>
        )}
        <div className="flex-1" />
        <div className="flex gap-1">
          {config.agentTools.map((t) => (
            <Badge key={t} variant="outline" className="text-[10px] font-mono">{t}</Badge>
          ))}
        </div>
        <Button
          size="sm" variant="outline"
          onClick={() => openAgent(`Create a ${config.title.toLowerCase()} from the attached document — attach the buyer PO / invoice PDF with the paperclip, then ingest it and ask me for whatever details you still need.${header.orderNo ? ` The order is ${header.orderNo}.` : ''}`)}
          title="AI-prefill: attach a document in the panel; the agent proposes the doc for approval (SPEC-M3 §12)"
        >
          <Paperclip className="h-3.5 w-3.5 mr-1" /> Fill with AI
        </Button>
        <Button
          size="sm" variant="outline"
          onClick={() => openAgent(`Create a ${config.title.toLowerCase()} for me using the ${config.agentTools[0]} tool — ask me for whatever details you need`)}
          title="The other door to the same posting service"
        >
          <Sparkles className="h-3.5 w-3.5 mr-1" /> Ask agent
        </Button>
      </div>

      <ChainBar currentStage={config.chainStage} />

      {errors.length > 0 && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 space-y-1">
          {errors.map((e, i) => <div key={i}>{e}</div>)}
        </div>
      )}

      {phase === 'edit' && (
        <form
          onSubmit={(e) => { e.preventDefault(); save() }}
          className="space-y-4"
        >
          {/* Header card */}
          <div className="rounded-lg border border-slate-200 bg-white p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3.5">
              {config.headerFields.map((f) => (
                <div key={f.name} className={f.colSpan === 2 ? 'sm:col-span-2' : ''}>
                  {f.type === 'picker' && f.pickerFrom ? (
                    // ERRATUM 6 (Wave D): typed header picker — the master slug
                    // comes from a sibling header cell (itemCode ← itemType)
                    header[f.pickerFrom] ? (
                      <DocPicker
                        slug={header[f.pickerFrom]}
                        valueField={f.pickerValueField}
                        value={header[f.name] ?? ''}
                        onChange={(v) => setHeader((h) => ({ ...h, [f.name]: v }))}
                        label={f.label}
                        required={f.required}
                      />
                    ) : (
                      <>
                        <Label className="text-xs font-medium">
                          {f.label}
                          {f.required && <span className="text-red-500 ml-0.5">*</span>}
                        </Label>
                        <Input
                          className="mt-1 h-9 text-sm"
                          type="text"
                          value={header[f.name] ?? ''}
                          onChange={(e) => setHeader((h) => ({ ...h, [f.name]: e.target.value }))}
                          placeholder={`select ${f.pickerFrom.replace(/([A-Z])/g, ' $1').toLowerCase()} first`}
                          aria-label={f.label}
                        />
                      </>
                    )
                  ) : f.type === 'picker' ? (
                    <DocPicker
                      slug={f.picker!}
                      valueField={f.pickerValueField}
                      value={header[f.name] ?? ''}
                      onChange={(v) => setHeader((h) => ({ ...h, [f.name]: v }))}
                      label={f.label}
                      required={f.required}
                    />
                  ) : (
                    <>
                      <Label className="text-xs font-medium">
                        {f.label}
                        {f.required && <span className="text-red-500 ml-0.5">*</span>}
                      </Label>
                      {f.type === 'textarea' ? (
                        <Textarea
                          className="mt-1 text-sm"
                          rows={2}
                          value={header[f.name] ?? ''}
                          onChange={(e) => setHeader((h) => ({ ...h, [f.name]: e.target.value }))}
                          placeholder={f.name === 'orderNo' ? `${config.numberPrefix}#### (auto)` : undefined}
                        />
                      ) : f.type === 'select' ? (
                        <select
                          className="mt-1 h-9 w-full rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800 focus:border-emerald-500 focus:outline-none"
                          value={header[f.name] ?? ''}
                          onChange={(e) => setHeader((h) => ({ ...h, [f.name]: e.target.value }))}
                          aria-label={f.label}
                        >
                          <option value="">Select {f.label.toLowerCase()}…</option>
                          {(f.options ?? []).map((o) => (
                            <option key={o.value} value={o.value}>{o.label}</option>
                          ))}
                        </select>
                      ) : (
                        <Input
                          className="mt-1 h-9 text-sm"
                          type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : 'text'}
                          step={f.type === 'number' ? 'any' : undefined}
                          value={header[f.name] ?? ''}
                          onChange={(e) => setHeader((h) => ({ ...h, [f.name]: e.target.value }))}
                          placeholder={f.name === config.numberField && config.numberPrefix ? `${config.numberPrefix}#### (auto)` : undefined}
                        />
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Line grid editor */}
          {hasLineEditor && (
            <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-100 text-slate-700 text-xs uppercase">
                    <tr>
                      <th className="w-8 px-2 py-2" />
                      {config.lineFields!.map((f) => (
                        <th key={f.name} className={`px-3 py-2 font-medium ${f.type === 'number' ? 'text-right' : 'text-left'}`}>{f.label}</th>
                      ))}
                      {qtyField && rateField && <th className="px-3 py-2 font-medium text-right">Amount</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((row, i) => (
                      <tr key={i} className="border-t border-slate-100">
                        <td className="px-2 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => setLines((prev) => (prev.length > 1 ? prev.filter((_, j) => j !== i) : prev))}
                            className="text-slate-300 hover:text-red-500"
                            title={lines.length > 1 ? 'Remove row' : 'Keep at least one row — clear cells instead'}
                            aria-label="Remove row"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                        {config.lineFields!.map((f) => (
                          <td key={f.name} className="px-2 py-1.5">
                            {f.type === 'select' ? (
                              <select
                                className="h-8 w-full rounded-md border border-slate-200 bg-white px-1.5 text-sm"
                                value={row[f.name] ?? ''}
                                onChange={(e) => setCell(i, f.name, e.target.value)}
                                aria-label={f.label}
                              >
                                <option value=""></option>
                                {(f.options ?? []).map((o) => (
                                  <option key={o.value} value={o.value}>{o.label}</option>
                                ))}
                              </select>
                            ) : f.type === 'picker' && f.pickerFrom ? (
                              // ERRATUM 5 (Wave C): typed picker — the master slug
                              // comes from the sibling cell (PO itemCode ← itemType)
                              row[f.pickerFrom] ? (
                                <DocPicker
                                  inline
                                  slug={row[f.pickerFrom]}
                                  valueField={f.pickerValueField}
                                  value={row[f.name] ?? ''}
                                  onChange={(v) => setCell(i, f.name, v)}
                                  label={f.label}
                                  required={f.required}
                                  placeholder={f.label}
                                />
                              ) : (
                                <Input
                                  className="h-8 text-sm"
                                  type="text"
                                  value={row[f.name] ?? ''}
                                  onChange={(e) => setCell(i, f.name, e.target.value)}
                                  placeholder="type first"
                                  aria-label={f.label}
                                />
                              )
                            ) : f.type === 'picker' ? (
                              <DocPicker
                                inline
                                slug={f.picker!}
                                valueField={f.pickerValueField}
                                value={row[f.name] ?? ''}
                                onChange={(v) => setCell(i, f.name, v)}
                                label={f.label}
                                required={f.required}
                                placeholder={f.label}
                              />
                            ) : (
                              <Input
                                className="h-8 text-sm"
                                type={f.type === 'number' ? 'number' : 'text'}
                                step={f.type === 'number' ? 'any' : undefined}
                                value={row[f.name] ?? ''}
                                onChange={(e) => setCell(i, f.name, e.target.value)}
                                placeholder={f.type === 'number' ? '0' : undefined}
                                aria-label={f.label}
                              />
                            )}
                          </td>
                        ))}
                        {qtyField && rateField && (
                          <td className="px-3 py-1.5 text-right tabular-nums text-slate-600">
                            {((Number(row.qty) || 0) * (Number(row.rate) || 0)).toLocaleString('en-IN')}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t border-slate-200 bg-slate-50 text-xs font-medium text-slate-700">
                    <tr>
                      <td />
                      {config.lineFields!.map((f) => (
                        <td key={f.name} className={`px-3 py-2 ${f.type === 'number' ? 'text-right tabular-nums' : ''}`}>
                          {f.name === 'qty' ? `${totals.qty.toLocaleString('en-IN')} pcs` : ''}
                        </td>
                      ))}
                      {qtyField && rateField && (
                        <td className="px-3 py-2 text-right tabular-nums">
                          ₹{totals.value.toLocaleString('en-IN')}
                        </td>
                      )}
                    </tr>
                  </tfoot>
                </table>
              </div>
              <div className="border-t border-slate-100 px-3 py-2">
                <Button type="button" size="sm" variant="outline" onClick={() => setLines((prev) => [...prev, emptyRow(config.lineFields!)])}>
                  <Plus className="h-3.5 w-3.5 mr-1" /> Add row
                </Button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button type="submit" size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" disabled={busy}>
              {busy ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Planning…</> : 'Save & review plan'}
            </Button>
            <span className="text-[11px] text-slate-400">Ctrl+S · same service as the agent&apos;s {config.agentTools[0]}</span>
          </div>
        </form>
      )}

      {/* REVIEW step — the plan card, mirrored from the agent approval card */}
      {phase === 'review' && plan && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-3">
          <div className="text-[11px] font-semibold text-amber-900 uppercase tracking-wide">Review plan before commit</div>
          <div className="text-sm font-medium text-slate-900">{plan.summary}</div>
          <div className="text-xs text-slate-600">{plan.text}</div>
          {plan.creates && plan.creates.length > 0 && (
            <div className="text-xs text-slate-600">
              <span className="font-semibold">Creates:</span> {plan.creates.length} record(s) —{' '}
              {plan.creates.map((c) => c.table).join(', ')}
            </div>
          )}
          {plan.updates && plan.updates.length > 0 && (
            <div className="text-xs text-slate-600">
              <span className="font-semibold">Updates:</span> {plan.updates.length} record(s)
            </div>
          )}
          {plan.sideEffects.length > 0 && (
            <div className="text-xs text-slate-600">
              <span className="font-semibold">Side effects:</span>
              <ul className="list-disc list-inside">
                {plan.sideEffects.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            </div>
          )}
          <div className="flex gap-2 pt-1">
            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={commit} disabled={busy}>
              {busy ? <><Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" /> Committing…</> : <><Check className="h-3.5 w-3.5 mr-1" /> Approve & commit</>}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setPhase('edit')} disabled={busy}>
              <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Back to edit
            </Button>
          </div>
        </div>
      )}

      {/* DONE — post-commit CTAs (W1 Next →) */}
      {phase === 'done' && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-4 space-y-3">
          <div className="text-sm font-medium text-emerald-900 flex items-center gap-2">
            <Check className="h-4 w-4" /> {plan?.summary}
          </div>
          <div className="flex flex-wrap gap-2">
            {viewUrl && (
              <Link href={viewUrl} className="inline-flex items-center gap-1 rounded-md border border-emerald-300 bg-white px-2.5 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100">
                View document <ArrowRight className="h-3 w-3" />
              </Link>
            )}
            {nextAfterCommit && (
              <Link href={nextAfterCommit.url} className="inline-flex items-center gap-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-2.5 py-1.5">
                Next: {nextAfterCommit.next.step}. {nextAfterCommit.next.name.split(' (')[0]} <ArrowRight className="h-3 w-3" />
              </Link>
            )}
            <Button size="sm" variant="outline" onClick={resetForAnother}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Create another
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

/** View-mode field renderer — picker fields render as master links (§9.4). */
function FieldValue({ field, value }: { field: DocField | DocLineField; value: unknown }) {
  const str = value === null || value === undefined || value === '' ? '' : String(value)
  if (!str) return <div className="text-sm text-slate-300">—</div>
  if (field.type === 'select' && field.options?.length) {
    const opt = field.options.find((o) => o.value === str)
    if (opt) return <div className="text-sm text-slate-800">{opt.label}</div>
  }
  if (field.type === 'picker' && field.picker) {
    return (
      <Link href={`/masters/${field.picker}`} className="text-sm text-emerald-700 hover:underline">
        {str}
      </Link>
    )
  }
  return <div className="text-sm text-slate-800">{str}</div>
}
