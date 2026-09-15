/* SPEC-M61 E-1 (H2) — tool tiering: the manifest stops sending all 275
 * schemas (selection accuracy degrades past 30–50 tools; BFCL cliff,
 * Anthropic tool-search guidance — recall-first tiering with a discovery
 * fallback bounds the hidden-tool-miss risk, §7.14).
 *
 * Three tiers, deterministic order, core first (prompt-cache stability,
 * E-1.3 — the same screen yields the same array; screen switching is the
 * only variable):
 *
 *   1. CORE    (always)      — the discovery door + the workflow reads +
 *                             the five most-used reads by AgentTurn
 *                             frequency (518 rows, 2026-09-15:
 *                             list_styles/list_buyers/list_colours/
 *                             list_sizes/list_parties — the ingestion-phase
 *                             lookups dominate real usage).
 *   2. SCREEN  (per screen)  — the menu item's agentTools ∪ the DOMAIN
 *                             FAMILY: every tool sharing a domain with any
 *                             of the item's agentTools (self-derived, no
 *                             maintained group map — e.g. the masters item
 *                             pulls the whole generated master family).
 *   3. REST    (hidden)      — discoverable via list_tools (E-1.2); NOT
 *                             blocked at dispatch (a tool found through
 *                             list_tools MUST be executable — blocking it
 *                             would recreate the "I can't" dead end H2
 *                             exists to kill; rights still re-checked at
 *                             dispatch per E-10.3).
 *
 * E-1.5 rollback: AGENT_TOOLS_FULL=1 restores the all-tools manifest
 * wholesale for one deploy (ops lever, no code revert).
 */
import { allTools, type AgentTool } from './tools'
import { findItemByRoute, MENU_ITEMS } from '@/lib/erp/menu-registry'

/** E-1.1 core tier — always in the manifest (~10-14 tools). */
export const CORE_TOOLS: string[] = [
  // the discovery door (E-1.2) + workflow/document/report reads named by the spec
  'list_tools',
  'get_dashboard_kpis',
  'get_pending_approvals',
  'suggest_next_step',
  'list_documents',
  'extract_document',
  'render_report',
  // the five most-used reads by AgentTurn frequency (the spec's "initial set")
  'list_styles',
  'list_buyers',
  'list_colours',
  'list_sizes',
  'list_parties',
]

const byToolName = (a: AgentTool, b: AgentTool) => a.name.localeCompare(b.name)

/**
 * Resolve the screen's menu item — exact route, then the registry's
 * dynamic patterns ('/orders/[id]' matches '/orders/SO-1001'), then the
 * parent fallback (the panel's own two-step lookup).
 */
function screenItemFor(pathname?: string) {
  if (!pathname) return undefined
  const direct = findItemByRoute(pathname)
  if (direct) return direct
  // dynamic-pattern match: segment-by-segment, [param] absorbs one segment
  const segs = pathname.split('/').filter(Boolean)
  const patternMatch = MENU_ITEMS.find((i) => {
    const pat = i.route.split('/').filter(Boolean)
    if (pat.length !== segs.length) return false
    return pat.every((p, idx) => p.startsWith('[') || p === segs[idx])
  })
  if (patternMatch) return patternMatch
  const parent = pathname.slice(0, pathname.lastIndexOf('/'))
  return parent ? findItemByRoute(parent) : undefined
}

/**
 * E-1.1/E-1.3 — the tiered manifest for a screen: core tier (sorted) then
 * screen tier (item agentTools ∪ domain family, sorted), deduped. No
 * pathname → core only (conversations started outside a screen context).
 */
export function tieredTools(pathname?: string): AgentTool[] {
  const byName = new Map(allTools.map((t) => [t.name, t]))
  const core = CORE_TOOLS.map((n) => byName.get(n)).filter((t): t is AgentTool => !!t)

  const item = screenItemFor(pathname)
  const screenNames: string[] = item?.agentTools ?? []
  // the DOMAIN FAMILY: every tool sharing a domain with any of the item's
  // own tools (self-derived — the masters item pulls the whole family)
  const familyDomains = new Set(
    screenNames.map((n) => byName.get(n)?.domain).filter((d): d is string => !!d),
  )
  const family = allTools.filter(
    (t) => familyDomains.has(t.domain) && !CORE_TOOLS.includes(t.name),
  )
  const screenTier = [...screenNames.map((n) => byName.get(n)), ...family]
    .filter((t): t is AgentTool => !!t)
    // dedupe (agentTools ∩ family overlap), core already claimed
    .filter((t, i, arr) => arr.findIndex((x) => x?.name === t.name) === i && !CORE_TOOLS.includes(t.name))
    .sort(byToolName)

  return [...core.sort(byToolName), ...screenTier]
}

/**
 * E-1.5 — the rollback lever: AGENT_TOOLS_FULL=1 restores the all-tools
 * manifest wholesale (registry order, bit-for-bit the pre-H2 behavior) so
 * tiering can be disabled in production without a code revert.
 */
export function selectTools(pathname?: string): AgentTool[] {
  return process.env.AGENT_TOOLS_FULL === '1' ? allTools : tieredTools(pathname)
}
