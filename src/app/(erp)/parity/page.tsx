/**
 * Parity tracker page (SPEC-M1 §6): per-group breakdown of the menu registry —
 * item, archetype, phase, live status, legacy forms covered, agent tooling.
 * All numbers derive from src/lib/erp/menu-registry.ts.
 */
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MENU_GROUPS, itemsByGroup, isLive, getHref, parityStats } from '@/lib/erp/menu-registry'

const ARCH_LABELS: Record<string, string> = {
  DB: 'Dashboard', MT: 'Master', DS: 'Doc', RG: 'Register',
  IN: 'Inbox', RH: 'Report', ST: 'Settings', LT: 'Live',
}

export default function ParityPage() {
  const s = parityStats()
  return (
    <div className="max-w-5xl mx-auto space-y-4">
      {/* Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">FiberOps 2.0 Parity Tracker</CardTitle>
          <p className="text-sm text-slate-600">
            Menu parity vs legacy Fiberpro (321 forms · 491 reports). The tracker is the
            single scoreboard for milestones M1–M6.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Menu items live" value={`${s.liveItems}/${s.totalItems}`} accent />
            <Stat label="Modules live" value={`${s.liveGroups}/${s.totalGroups}`} accent />
            <Stat label="Legacy forms live" value={`${s.legacyLive}/${s.legacyMapped}`} />
            <Stat label="Legacy coverage" value={`${s.coveragePct}%`} accent />
          </div>
        </CardContent>
      </Card>

      {/* Per-group tables */}
      {MENU_GROUPS.map((group) => {
        const items = itemsByGroup(group.id)
        const live = items.filter(isLive).length
        return (
          <Card key={group.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base">{group.label}</CardTitle>
                <Badge variant={live > 0 ? 'default' : 'secondary'} className="text-xs">
                  {live}/{items.length} live
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-y border-slate-100 text-slate-500 text-left">
                      <th className="px-4 py-2 font-medium">Screen</th>
                      <th className="px-2 py-2 font-medium">Engine</th>
                      <th className="px-2 py-2 font-medium">Phase</th>
                      <th className="px-2 py-2 font-medium">Legacy</th>
                      <th className="px-2 py-2 font-medium">Agent tools</th>
                      <th className="px-4 py-2 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                        <td className="px-4 py-2">
                          <Link
                            // dynamic doc-view routes (e.g. /orders/[id]) have no
                            // listable index — link the module root instead
                            href={getHref(item).includes('[id]') ? getHref(item).split('/[id]')[0] : getHref(item)}
                            className="text-slate-800 hover:text-emerald-700 font-medium"
                          >
                            {item.label}
                          </Link>
                          <span className="block text-[10px] text-slate-400 font-mono">{item.route}</span>
                        </td>
                        <td className="px-2 py-2 text-slate-500">{ARCH_LABELS[item.arch] ?? item.arch}</td>
                        <td className="px-2 py-2 text-slate-500">{item.phase}</td>
                        <td className="px-2 py-2 text-slate-500 tabular-nums">{item.legacyForms.length}</td>
                        <td className="px-2 py-2">
                          {item.agentTools.length > 0 ? (
                            <span className="text-emerald-700 font-mono text-[10px]">
                              {item.agentTools.slice(0, 3).join(', ')}
                              {item.agentTools.length > 3 && ` +${item.agentTools.length - 3}`}
                            </span>
                          ) : item.pendingTools.length > 0 ? (
                            <span className="text-slate-400 font-mono text-[10px]">
                              {item.pendingTools.join(', ')} (planned)
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right">
                          <span
                            className={`inline-flex items-center gap-1.5 text-[11px] font-medium ${
                              isLive(item) ? 'text-emerald-600' : 'text-slate-400'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                isLive(item) ? 'bg-emerald-400' : 'bg-slate-300'
                              }`}
                            />
                            {isLive(item) ? 'Live' : `Coming ${item.phase}`}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50/50 p-3">
      <div className={`text-xl font-bold tabular-nums ${accent ? 'text-emerald-600' : 'text-slate-800'}`}>
        {value}
      </div>
      <div className="text-[11px] text-slate-500 mt-0.5">{label}</div>
    </div>
  )
}
