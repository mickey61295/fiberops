/**
 * Coming-soon screen (SPEC-M1 §7, plan P3 "no dead ends").
 * Server component. Two modes:
 *  - ITEM: what will live here, which agent tool already covers it, ask button.
 *  - GROUP: the module's items with live/coming dots.
 */
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Hammer, Sparkles, ArrowRight, Wrench, History } from 'lucide-react'
import { AskAgentButton } from '@/components/erp/ask-agent-button'
import {
  type MenuItem, type MenuGroup, isLive, getHref, itemsByGroup, parityStats,
} from '@/lib/erp/menu-registry'

const ARCH_LABELS: Record<string, string> = {
  DB: 'Dashboard', MT: 'Master table', DS: 'Document screen', RG: 'Register',
  IN: 'Approval inbox', RH: 'Report hub', ST: 'Settings',
}

export function ComingSoonItem({ item }: { item: MenuItem }) {
  const group = itemsByGroup // import used below
  void group
  const fallbackPrompt = `${item.label} — do this via chat`
  const prompt = item.agentPrompt ?? fallbackPrompt

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
              <Hammer className="h-3 w-3 mr-1" /> Coming in {item.phase}
            </Badge>
            <Badge variant="outline" className="text-slate-600">
              {ARCH_LABELS[item.arch] ?? item.arch} engine
            </Badge>
          </div>
          <CardTitle className="text-xl pt-2">{item.label}</CardTitle>
          <p className="text-sm text-slate-600 pt-1">{item.description}</p>
        </CardHeader>
        <CardContent className="space-y-5">
          {/* Agent door — P2/P3: the action may already be reachable via chat */}
          {item.agentTools.length > 0 ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50/60 p-4">
              <div className="flex items-center gap-2 text-emerald-800 font-medium text-sm mb-2">
                <Sparkles className="h-4 w-4" />
                Available NOW via the AI agent
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {item.agentTools.map((t) => (
                  <Badge key={t} variant="secondary" className="font-mono text-[11px]">
                    <Wrench className="h-3 w-3 mr-1" />
                    {t}
                  </Badge>
                ))}
              </div>
              <p className="text-xs text-emerald-900/70 mb-3">
                The form arrives in {item.phase}; the chat door already works.
              </p>
              <AskAgentButton prompt={prompt} />
            </div>
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              {item.pendingTools.length > 0 ? (
                <>
                  Agent tool <span className="font-mono text-xs bg-white border rounded px-1.5 py-0.5">{item.pendingTools.join(', ')}</span>{' '}
                  ships together with this screen in {item.phase} — one action, two doors.
                </>
              ) : (
                <>This screen lands in milestone {item.phase}.</>
              )}
            </div>
          )}

          {/* Future route */}
          <div className="text-xs text-slate-500 flex items-center gap-2">
            <span className="uppercase tracking-wide font-semibold">Future route</span>
            <code className="bg-slate-100 border border-slate-200 rounded px-2 py-0.5 font-mono">
              {item.route}
            </code>
          </div>

          {/* Legacy forms covered */}
          {item.legacyForms.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-slate-600 hover:text-slate-900 flex items-center gap-1.5">
                <History className="h-3.5 w-3.5" />
                Legacy Fiberpro forms covered ({item.legacyForms.length})
              </summary>
              <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-slate-500">
                {item.legacyForms.map((f) => (
                  <li key={f} className="font-mono bg-slate-50 border border-slate-100 rounded px-2 py-1">
                    {f}
                  </li>
                ))}
              </ul>
            </details>
          )}

          {item.notes && <p className="text-xs text-slate-400 italic">{item.notes}</p>}

          <div className="flex gap-2 pt-1">
            <Button asChild variant="outline" size="sm">
              <Link href="/parity">
                Track progress <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export function ComingSoonGroup({ group }: { group: MenuGroup }) {
  const items = itemsByGroup(group.id)
  const stats = parityStats()
  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
              <Hammer className="h-3 w-3 mr-1" /> Module in progress
            </Badge>
          </div>
          <CardTitle className="text-xl pt-2">{group.label}</CardTitle>
          <p className="text-sm text-slate-600 pt-1">{group.description}</p>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-600">
            The {group.label.toLowerCase()} module gets its screens across milestones. Its
            operations may already be reachable through the AI agent — check each item:
          </p>
          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg">
            {items.map((item) => (
              <Link
                key={item.id}
                // dynamic doc-view routes (e.g. /orders/[id]) have no listable
                // index — link the module root instead
                href={getHref(item).includes('[id]') ? getHref(item).split('/[id]')[0] : getHref(item)}
                className="flex items-center gap-3 px-3 py-2 hover:bg-slate-50 group"
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full shrink-0 ${isLive(item) ? 'bg-emerald-400' : 'bg-slate-300'}`}
                />
                <span className="flex-1 text-sm text-slate-700 group-hover:text-slate-900">
                  {item.label}
                </span>
                {item.agentTools.length > 0 && (
                  <Badge variant="secondary" className="text-[10px] font-normal text-emerald-700">
                    <Sparkles className="h-2.5 w-2.5 mr-1" />
                    agent: {item.agentTools[0]}
                  </Badge>
                )}
                <Badge variant="outline" className="text-[10px] font-normal text-slate-500">
                  {item.phase}
                </Badge>
              </Link>
            ))}
          </div>
          <p className="text-xs text-slate-400">
            Overall: {stats.liveItems}/{stats.totalItems} screens live · legacy coverage {stats.coveragePct}%
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
