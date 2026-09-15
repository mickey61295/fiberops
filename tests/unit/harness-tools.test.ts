/**
 * SPEC-M61 H2 — E-1 tool exposure (harness-tools).
 *
 * The manifest stopped sending all 275 schemas: tiering ships core +
 * screen family, list_tools is the discovery door, and the rollback lever
 * restores the old behavior wholesale. This suite pins:
 *  1. E-1.1 tier composition — core first (list_tools, the workflow reads,
 *     the five frequency-chosen reads), screen family via the menu item's
 *     own domains (the masters item pulls the GENERATED family), no path →
 *     core only;
 *  2. E-1.2 list_tools shape — ≤20 rows, BM25 hit for "merchandiser" →
 *     update_buyer, excludes itself, the frozen result-text head + count;
 *  3. E-1.3 determinism — the same screen yields the SAME array (prompt
 *     cache stability; screen switching is the only variable);
 *  4. E-1.5 the AGENT_TOOLS_FULL=1 rollback lever (env restored after);
 *  5. E-2.4(c) list_tools is in the core tier (the prompt contract test).
 */
import { describe, it, expect, afterEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { allTools, getTool, searchTools } from '@/lib/agent/tools'
import { CORE_TOOLS, selectTools, tieredTools } from '@/lib/agent/tool-tiers'
import { findItemByRoute, findItemById } from '@/lib/erp/menu-registry'

const read = (rel: string) => readFileSync(rel, 'utf8')

const names = (ts: { name: string }[]) => ts.map((t) => t.name)

afterEach(() => {
  // E-1.5 tests flip the env lever; the suite NEVER leaks it
  delete process.env.AGENT_TOOLS_FULL
})

describe('E-1.1 — tier composition', () => {
  it('the registry grew to 275 with list_tools (the H2 counter)', () => {
    expect(allTools.length).toBe(275)
    expect(getTool('list_tools')).toBeTruthy()
  })

  it('the core tier is the spec set (12) and contains list_tools (E-2.4c)', () => {
    expect(CORE_TOOLS).toHaveLength(12)
    expect(CORE_TOOLS).toContain('list_tools')
    for (const n of [
      'get_dashboard_kpis',
      'get_pending_approvals',
      'suggest_next_step',
      'list_documents',
      'extract_document',
      'render_report',
      // the five most-used reads by AgentTurn frequency
      'list_styles',
      'list_buyers',
      'list_colours',
      'list_sizes',
      'list_parties',
    ]) {
      expect(CORE_TOOLS, n).toContain(n)
    }
    // every core name resolves — a typo here would silently drop the door
    for (const n of CORE_TOOLS) expect(getTool(n), n).toBeTruthy()
  })

  it('no pathname → core only, sorted (a conversation outside a screen)', () => {
    const ts = tieredTools()
    expect(names(ts)).toEqual([...CORE_TOOLS].sort())
  })

  it('the masters screen pulls the GENERATED master family (menu-registry.ts:1340 replaced)', () => {
    const ts = tieredTools('/masters')
    const ns = names(ts)
    // core rides first, then the family
    expect(ns.slice(0, CORE_TOOLS.length)).toEqual([...CORE_TOOLS].sort())
    // the generated family: every master-config door + create_sizes
    for (const n of ['create_party', 'update_party', 'list_parties', 'create_buyer', 'update_buyer', 'list_buyers', 'create_thread_type', 'update_thread_type', 'list_thread_types', 'create_sizes']) {
      expect(ns, n).toContain(n)
    }
    // and NOT a whole unrelated domain (orders doors are tier-hidden here)
    expect(ns).not.toContain('create_order')
    expect(ns).not.toContain('create_purchase_order')
  })

  it('a doc route resolves through the registry dynamic pattern (order hub)', () => {
    const direct = tieredTools('/orders/register')
    const docRoute = tieredTools('/orders/SO-1001') // matches '/orders/[id]'
    expect(names(docRoute)).toContain('get_order')
    expect(names(direct)).toContain('create_order')
    expect(names(direct)).toContain('list_orders')
    // both orders-family screens; identical tier shape (core first)
    expect(names(docRoute).slice(0, CORE_TOOLS.length)).toEqual(
      names(direct).slice(0, CORE_TOOLS.length),
    )
  })

  it('the menu masters item claims the generated family truthfully (E-1.1 mandate)', () => {
    const item = findItemById('masters')!
    expect(item.agentTools).toContain('create_party')
    expect(item.agentTools).toContain('update_buyer')
    expect(item.agentTools).toContain('list_thread_types')
    expect(item.agentTools).toContain('create_sizes')
    // every claimed door is a REAL registry tool (no hand-maintained drift)
    for (const n of item.agentTools) expect(getTool(n), n).toBeTruthy()
  })
})

describe('E-1.2 — the list_tools meta-tool', () => {
  it('is a read-only meta-domain door (rights stay universal)', () => {
    const t = getTool('list_tools')!
    expect(t.isWrite).toBe(false)
    expect(t.domain).toBe('meta')
    expect(t.description.length).toBeGreaterThanOrEqual(40)
    // the honest-instruction description tells the model when to call it
    expect(t.description).toContain('BEFORE telling the operator a capability does not exist')
  })

  it('returns at most 20 rows and EXCLUDES itself', () => {
    const rows = searchTools('order')
    expect(rows.length).toBeGreaterThan(0)
    expect(rows.length).toBeLessThanOrEqual(20)
    expect(rows.map((r) => r.name)).not.toContain('list_tools')
    const browse = searchTools(undefined)
    expect(browse).toHaveLength(20)
    expect(browse.map((r) => r.name)).not.toContain('list_tools')
  })

  it('BM25 hit: "merchandiser" ranks update_buyer (the incident verb)', () => {
    const rows = searchTools('merchandiser')
    expect(rows.map((r) => r.name)).toContain('update_buyer')
    expect(rows.map((r) => r.name)).toContain('list_merchandisers')
  })

  it('the domain filter narrows the corpus before scoring', () => {
    const rows = searchTools('order', 'accounting')
    expect(rows.length).toBeGreaterThan(0)
    for (const r of rows) expect(r.domain).toBe('accounting')
    // and a domain-only browse is deterministic + bounded
    const browse = searchTools(undefined, 'masters')
    expect(browse.length).toBeLessThanOrEqual(20)
    for (const r of browse) expect(r.domain).toBe('masters')
  })

  it('the execute() result text carries the frozen head + a count (E-1.2)', async () => {
    const t = getTool('list_tools')!
    const res = await t.execute({ query: 'cheque bounce' })
    expect(res.text).toContain('These are all the tools for this')
    expect(res.text).toMatch(/\d+ of \d+ tools/)
    expect(res.text).toContain('post_cheque_bounce')
    expect(Array.isArray(res.json)).toBe(true)
    const rows = res.json as { name: string }[]
    expect(rows.length).toBeLessThanOrEqual(20)
  })

  it('a query with no match says so honestly (still no absence claim)', async () => {
    const t = getTool('list_tools')!
    const res = await t.execute({ query: 'zzzqxv nonexistent thing' })
    expect(res.text).toContain('no match')
    expect(res.json).toEqual([])
  })
})

describe('E-1.3 — deterministic per-screen sets', () => {
  it('the same screen yields the identical array, twice in a row', () => {
    expect(names(tieredTools('/masters'))).toEqual(names(tieredTools('/masters')))
    expect(names(tieredTools('/orders/register'))).toEqual(names(tieredTools('/orders/register')))
  })

  it('tiered arrays are ordered: core first, then screen tier, each sorted', () => {
    for (const path of ['/masters', '/orders', '/inventory/stock', '/accounts']) {
      const ns = names(tieredTools(path))
      const core = ns.slice(0, CORE_TOOLS.length)
      const screen = ns.slice(CORE_TOOLS.length)
      expect(core, path).toEqual([...core].sort())
      expect(screen, path).toEqual([...screen].sort())
      // no duplicates
      expect(new Set(ns).size, path).toBe(ns.length)
    }
  })

  it('route.ts composes tiering with rights narrowing (source contract)', () => {
    const route = read('src/app/api/agent/route.ts')
    expect(route).toContain('selectTools(pathname)')
    expect(route).toContain('.filter((t) => manifestVisible(t, allowed))')
  })
})

describe('E-1.5 — the AGENT_TOOLS_FULL=1 rollback lever', () => {
  it('unset → tiered (core + screen); set → ALL tools, registry order', () => {
    expect(names(selectTools('/masters')).length).toBeLessThan(allTools.length)
    process.env.AGENT_TOOLS_FULL = '1'
    const rolled = selectTools('/masters')
    expect(rolled).toEqual(allTools) // wholesale, bit-for-bit the pre-H2 behavior
  })

  it('the lever is documented for ops in .env.example', () => {
    expect(read('.env.example')).toContain('AGENT_TOOLS_FULL')
  })
})

describe('E-1.4 — hidden-tool miss telemetry (source contract)', () => {
  it('route.ts logs the list_tools probe + the next-call miss check', () => {
    const route = read('src/app/api/agent/route.ts')
    expect(route).toContain('[agent-tools] E-1.4 hidden-tool miss')
    expect(route).toContain('listToolsProbe')
  })
})

describe('E-13 — model badge truthfulness (source contract)', () => {
  it('the SSE start event carries the resolved model id', () => {
    const route = read('src/app/api/agent/route.ts')
    expect(route).toContain("type: 'start', promptVersion: PROMPT_VERSION, model: llm.model")
  })

  it('the panel renders the streamed model and has NO hardcoded model string', () => {
    const panel = read('src/components/agent/agent-panel.tsx')
    expect(panel).toContain('data-testid="model-badge"')
    expect(panel).toContain('setModelId(payload.model || null)')
    expect(panel).not.toContain('GLM-4.6')
  })
})
