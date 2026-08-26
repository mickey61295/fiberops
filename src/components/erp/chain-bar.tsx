'use client'

/**
 * W1 chain mini-pipeline bar (SPEC-M3 §9.1) — renders on every DocScreen and
 * the Order Hub. 15 dots from the ONE chain definition (chain.ts, ADR-007):
 * stages done for THIS order render filled; the current stage is highlighted;
 * "Next →" is a Link (not JS state) via resolveStageUrl. On New-mode screens
 * without order context, the bar shows the stage position only.
 */
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { CHAIN, nextStage, resolveStageUrl, type ChainStateFlags } from '@/lib/erp/chain'

export interface ChainBarProps {
  /** computed flags for THIS order (omitted on New-mode screens) */
  state?: Partial<ChainStateFlags>
  /** 1..15 — the stage this screen represents (ring highlight) */
  currentStage?: number
  /** context for the Next → CTA url */
  ctx?: { orderNo?: string; poNo?: string; dcNo?: string; invoiceNo?: string; id?: string }
}

/**
 * Stages observed by the legacy has-computation (computeChainState tracks 9
 * flags; po/grn/jobworkOut/jobworkIn/rework/despatch are NOT observed — see
 * chain.ts behaviour note). Unobserved stages stay unfilled; the next-step
 * selection still skips over them via nextStage().
 */
export function ChainBar({ state, currentStage, ctx }: ChainBarProps) {
  const next = state ? nextStage(state) : null
  // stages 1..15, done = the flag for this stage's produces-key is true
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2.5">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1">
          {CHAIN.map((stage) => {
            const isDone = state ? !!state[stage.produces as keyof ChainStateFlags] : false
            const isCurrent = currentStage === stage.step
            const title = `${stage.step}. ${stage.name}`
            return (
              <span
                key={stage.step}
                title={title}
                aria-label={title}
                className={[
                  'inline-block h-2.5 w-2.5 rounded-full transition-colors',
                  isDone
                    ? 'bg-emerald-500'
                    : isCurrent
                      ? 'bg-white ring-2 ring-emerald-500'
                      : 'bg-slate-200',
                ].join(' ')}
              />
            )
          })}
        </div>
        <div className="text-[11px] text-slate-500 truncate max-w-[38ch]">
          {currentStage
            ? `Chain stage ${currentStage}/15 · ${CHAIN[currentStage - 1]?.name}`
            : '15-stage chain'}
        </div>
        <div className="flex-1" />
        {next && ctx && (
          <Link
            href={resolveStageUrl(next, ctx)}
            className="inline-flex items-center gap-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium px-2.5 py-1.5"
          >
            Next: {next.step}. {next.name.split(' (')[0]} <ArrowRight className="h-3 w-3" />
          </Link>
        )}
        {state && !next && (
          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium px-2.5 py-1.5">
            ✓ all 15 stages complete
          </span>
        )}
      </div>
    </div>
  )
}
