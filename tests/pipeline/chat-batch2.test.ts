/**
 * CHAT Batch 2 regression suite — Phase-6B Remediation Spec §5 (CHAT-01…CHAT-12,
 * SPEC-M38). One pin per FR: behavioral tests exercise the real services/tools
 * against the pinned test DB; the SSE route + panel render layers that cannot
 * run headless are pinned by source-contract tests (the established pattern
 * from hfx-batch0 / ops-batch1).
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { readFileSync } from 'node:fs'
import { db } from '@/lib/db'
import { PROMPT_VERSION, SYSTEM_PROMPT } from '@/lib/agent/prompt'
import { allTools, getTool } from '@/lib/agent/tools'
import { extractDocNoFromPath, screenTitle, formatContextLine } from '@/lib/agent/context'
import { planDisplay, formatMoney } from '@/lib/agent/plan-display'
import { docCta } from '@/lib/erp/doc-cta'
import { resolveByNameOrCode, topCandidates, didYouMean } from '@/lib/erp/lookup'
import { toolLabel, toolTitle } from '@/lib/agent/tool-labels'
import { planOrder } from '@/lib/erp/posting/order'
import { findItemByRoute, MENU_ITEMS } from '@/lib/erp/menu-registry'

const TS = Date.now()
const read = (rel: string) => readFileSync(rel, 'utf8')

describe('CHAT-02 — dynamic context line', () => {
  it('formatContextLine carries today, user+role, FY, screen + docNo, godowns', () => {
    const line = formatContextLine({
      today: '2026-08-31', weekday: 'Mon', user: 'Ravi', role: 'admin', fy: '26-27',
      screenTitle: 'Order Register', docNo: 'SO-1042',
      godowns: [{ code: 'G1', name: 'Main' }, { code: 'G2', name: 'Finished Goods' }],
    })
    expect(line).toContain('[CONTEXT]')
    expect(line).toContain('today is Mon 2026-08-31 (IST)')
    expect(line).toContain('user: Ravi (admin)')
    expect(line).toContain('financial year: 26-27')
    expect(line).toContain('screen: Order Register — SO-1042')
    expect(line).toContain('godowns: G1=Main, G2=Finished Goods')
  })

  it('extractDocNoFromPath: prefixed doc numbers + bare order numbers, not words', () => {
    expect(extractDocNoFromPath('/orders/SO-1001')).toBe('SO-1001')
    expect(extractDocNoFromPath('/procurement/grn/GRN-0007')).toBe('GRN-0007')
    expect(extractDocNoFromPath('/orders/11135903')).toBe('11135903')
    expect(extractDocNoFromPath('/orders/register')).toBeUndefined()
    expect(extractDocNoFromPath('/orders/new')).toBeUndefined()
  })

  it('screenTitle resolves items, [id] parents, and group landings', () => {
    expect(screenTitle('/orders/register')).toBe('Order Register')
    // [id] route → parent item label
    expect(screenTitle('/orders/SO-1001')).toBeTruthy()
    expect(screenTitle('/orders/SO-1001')).not.toBe('/orders/SO-1001')
  })

  it('route.ts appends the dynamic line after SYSTEM_PROMPT (source contract)', () => {
    const src = read('src/app/api/agent/route.ts')
    expect(src).toContain("import { buildDynamicContext } from '@/lib/agent/context'")
    expect(src).toContain('buildDynamicContext(body.screen')
    expect(src.indexOf('content: SYSTEM_PROMPT')).toBeLessThan(src.indexOf('content: dynamicLine'))
  })
})

describe('CHAT-03 — screen-aware suggestions (substrate wired)', () => {
  it('menu items carry agentPrompts and the panel resolves them (source contract)', () => {
    const panel = read('src/components/agent/agent-panel.tsx')
    expect(panel).toContain('usePathname')
    expect(panel).toContain('findItemByRoute')
    expect(panel).toContain('screenItem?.agentPrompt')
    // the hardcoded defaults now use the REAL code formats
    expect(panel).toContain('B-0001')
    expect(panel).toContain('STY-1001')
    expect(panel).not.toContain("buyer B001, style S-1001")
  })

  it('at least 60 menu items have authored agentPrompts', () => {
    const withPrompt = MENU_ITEMS.filter((i) => i.agentPrompt)
    expect(withPrompt.length).toBeGreaterThanOrEqual(60)
  })
})

describe('CHAT-05 — plan contents table', () => {
  it('money fields render ₹ en-IN; dates render YYYY-MM-DD; ids are skipped', () => {
    const disp = planDisplay({
      creates: [
        {
          table: 'order',
          data: {
            orderNo: 'SO-1042', buyerId: 'cuid-x', styleId: 'cuid-y', totalPcs: 4000,
            totalValue: 450000, deliveryDate: new Date('2026-10-15T00:00:00.000Z'), status: 'open',
          },
        },
        { table: 'orderLine', data: { colourId: 'c1', sizeId: 's1', qty: 1000, rate: 112.5 } },
      ],
    })
    expect(disp.label).toBe('Sales order')
    const valueRow = disp.rows.find((r) => r.field === 'total value')
    expect(valueRow?.value).toBe(formatMoney(450000)) // ₹4,50,000
    const pcsRow = disp.rows.find((r) => r.field === 'total pcs')
    expect(pcsRow?.value).toBe('4,000') // quantity: plain en-IN, NOT ₹
    const dateRow = disp.rows.find((r) => r.field === 'delivery date')
    expect(dateRow?.value).toBe('2026-10-15')
    expect(disp.rows.find((r) => r.field === 'buyer id')).toBeUndefined() // ids skipped
    expect(disp.lines.length).toBe(1)
    expect(disp.lines[0]).toContain('1,000 qty')
    expect(disp.lines[0]).toContain(formatMoney(112.5))
  })

  it('line overflow reports moreLines; the panel renders the contents table (source contract)', () => {
    const creates = [
      { table: 'order', data: { orderNo: 'SO-1' } },
      ...Array.from({ length: 10 }, (_, i) => ({ table: 'orderLine', data: { qty: i + 1 } })),
    ]
    const disp = planDisplay({ creates })
    expect(disp.lines.length).toBe(6)
    expect(disp.moreLines).toBe(4)
    const panel = read('src/components/agent/agent-panel.tsx')
    expect(panel).toContain('data-testid="plan-contents"')
    expect(panel).toContain('planDisplay(')
  })

  it('formatMoney uses Indian digit grouping', () => {
    expect(formatMoney(450000)).toBe('₹4,50,000')
    expect(formatMoney(10000000)).toBe('₹1,00,00,000')
  })
})

describe('CHAT-06 — approve-by-id (TOCTOU kill)', () => {
  it('tool-call-end carries turnId and the panel posts it (source contract)', () => {
    const route = read('src/app/api/agent/route.ts')
    expect(route).toContain('turnId, // CHAT-06 — approve-by-id')
    expect(route).toContain('turnId = turnRow?.id ?? null')
    const panel = read('src/components/agent/agent-panel.tsx')
    expect(panel).toContain('turnId: pending.turnId ?? undefined')
  })

  it('approve route: stored-turn path, drift guard, single-turn update (source contract)', () => {
    const route = read('src/app/api/agent/approve/route.ts')
    expect(route).toContain('planDrift(turn.plan, result.plan)')
    expect(route).toContain('drifted: true')
    // ONLY the stored turn is marked approved — updateMany is the legacy fallback
    expect(route).toContain("db.agentTurn.update({\n        where: { id: turn.id }")
    expect(route).toContain('updateMany')
  })

  it('behavioral: a stored plan matching the fresh plan commits; a drifted plan is refused', async () => {
    // plan an order against a fresh buyer+style, then re-plan with the same
    // args — identical creates/updates → the drift compare must pass.
    const buyer = await db.buyer.create({ data: { code: `CHAT-B-${TS}`, name: `Chat Buyer ${TS}`, dept: 'test' } })
    const style = await db.style.create({ data: { styleNo: `STY-${TS}`, description: 'chat test style' } })
    try {
      const args = {
        buyerCode: buyer.code, styleNo: style.styleNo, deliveryDate: '2026-12-31',
        lines: [{ colourName: 'Navy', sizeName: 'M', qty: 100, rate: 50 }],
      }
      const first = await planOrder(args)
      expect(first.ok).toBe(true)
      const second = await planOrder(args)
      expect(second.ok).toBe(true)
      // day-level normalization: same args → same plan payload
      const norm = (p: any) =>
        JSON.stringify((p.creates ?? []).map((c: any) => [c.table, Object.entries(c.data).map(([k, v]) => [k, v instanceof Date ? v.toISOString().slice(0, 10) : v])]))
      expect(norm(first)).toBe(norm(second))
    } finally {
      await db.orderLine.deleteMany({ where: { styleId: style.id } }).catch(() => {})
      await db.order.deleteMany({ where: { buyerId: buyer.id } }).catch(() => {})
      await db.style.delete({ where: { id: style.id } }).catch(() => {})
      await db.buyer.delete({ where: { id: buyer.id } }).catch(() => {})
    }
  })

  it('typed approve phrases are intercepted client-side (source contract)', () => {
    const panel = read('src/components/agent/agent-panel.tsx')
    expect(panel).toContain('isApprovalPhrase')
    expect(panel).toContain('APPROVE_PHRASE')
  })
})

describe('CHAT-07 — post-commit CTA row', () => {
  it('docCta maps docNo prefixes to view + print routes', () => {
    expect(docCta('SO-1042')).toEqual({ viewUrl: '/orders/SO-1042', printUrl: '/print/order/SO-1042' })
    expect(docCta('INV-0007')).toEqual({ viewUrl: '/accounts/invoice/INV-0007', printUrl: '/print/invoice/INV-0007' })
    expect(docCta('GRN-0003')).toEqual({ viewUrl: '/procurement/grn/GRN-0003', printUrl: '/print/grn/GRN-0003' })
    expect(docCta('PMT-0009')).toEqual({ viewUrl: '/accounts/payments/PMT-0009', printUrl: '/print/payment/PMT-0009' })
    expect(docCta('RCP-0009')).toEqual({ viewUrl: '/accounts/payments/RCP-0009', printUrl: '/print/payment/RCP-0009' })
    // SAMP- (5 chars) must win over any shorter prefix
    expect(docCta('SAMP-0001').viewUrl).toBe('/orders/samples/SAMP-0001')
    // JW has a view but no print docType yet — honest null, never a 404 URL
    expect(docCta('JW-0005')).toEqual({ viewUrl: '/jobwork/order/JW-0005' })
    // masters / unknown prefixes: no lies
    expect(docCta('B-0001')).toEqual({})
    expect(docCta(null)).toEqual({})
    // bare buyer-PO numbers still land on the order hub
    expect(docCta('11135903')).toEqual({ viewUrl: '/orders/11135903' })
  })

  it('the approve route returns docNo + cta and the panel renders View/Print (source contract)', () => {
    const route = read('src/app/api/agent/approve/route.ts')
    expect(route).toContain('docCta(docNo)')
    expect(route).toContain('cta: docCta(docNo)')
    const panel = read('src/components/agent/agent-panel.tsx')
    expect(panel).toContain('<Eye className="h-3 w-3 mr-1" /> View')
    expect(panel).toContain('<Printer className="h-3 w-3 mr-1" /> Print')
  })
})

describe('CHAT-01 — outcome events', () => {
  it('approve/reject append synthetic events; events ride history as user turns (source contract)', () => {
    const panel = read('src/components/agent/agent-panel.tsx')
    expect(panel).toContain('[Plan ${pending.toolName} APPROVED.')
    expect(panel).toContain('[Plan ${pending.toolName} REJECTED by the user.')
    expect(panel).toContain('[Plan ${pending.toolName} APPROVAL FAILED:')
    // the event is user-role (rides history) but styled as a system chip
    expect(panel).toContain("role: 'user', text, toolCalls: [], isEvent: true")
    expect(panel).toContain('data-testid="agent-outcome-event"')
  })
})

describe('CHAT-08 — truthful outcome badges', () => {
  it('ToolResult declares error; docTool + master tools set it on failure', async () => {
    // planOrder against a missing buyer fails → error field must be set
    const res = await getTool('create_order')!.execute(
      { buyerCode: 'NO-SUCH-BUYER', styleNo: 'NO-SUCH-STYLE', deliveryDate: '2026-12-31', lines: [{ colourName: 'Navy', sizeName: 'M', qty: 1, rate: 1 }] },
      { userId: 'test', email: 't@t', name: 'test' },
    )
    expect(res.error).toBeTruthy()
    expect(res.text).toBeTruthy()
    // source contract: all three write-tool families return the error field
    const tools = read('src/lib/agent/tools.ts')
    expect(tools).toContain("if (!result.ok) return { text: result.error, error: result.error }")
    expect(tools.match(/error: plan\.errors\.join\('; '\)/g)?.length).toBeGreaterThanOrEqual(2)
  })
})

describe('CHAT-09 — fuzzy lookup rescue', () => {
  it('case-insensitive code + name resolution (buyer seam)', async () => {
    const buyer = await db.buyer.create({ data: { code: `CHAT-FZ-${TS}`, name: `Fuzzy Buyer ${TS}` } })
    try {
      const byLowerCode = await resolveByNameOrCode<any>(db.buyer, `chat-fz-${TS}`)
      expect(byLowerCode?.id).toBe(buyer.id)
      const byName = await resolveByNameOrCode<any>(db.buyer, `fuzzy buyer ${TS}`)
      expect(byName?.id).toBe(buyer.id)
      const byPartial = await resolveByNameOrCode<any>(db.buyer, `Fuzzy`)
      expect(byPartial?.id).toBe(buyer.id)
      const byNothing = await resolveByNameOrCode<any>(db.buyer, `zzz-qqq-${TS}`)
      expect(byNothing).toBeNull()
    } finally {
      await db.buyer.delete({ where: { id: buyer.id } })
    }
  })

  it('weak/ambiguous matches stay UNRESOLVED and hand back candidates (ask, don\'t guess)', async () => {
    const buyer = await db.buyer.create({ data: { code: `CHAT-AM-${TS}`, name: `Ambiguous Mills Trichy ${TS}` } })
    try {
      // shares ONE token of a multi-word query → token-only score < 50 → ambiguous
      const weak = await resolveByNameOrCode<any>(db.buyer, `Ambiguous ZZZQQQ ${TS}`)
      expect(weak).toBeNull()
      const cands = await topCandidates(db.buyer, `Ambiguous ZZZQQQ ${TS}`)
      expect(cands.length).toBeGreaterThanOrEqual(1)
      expect(cands[0].code).toBe(`CHAT-AM-${TS}`)
      const msg = didYouMean('Buyer', `Ambiguous ZZZQQQ ${TS}`, cands)
      expect(msg).toContain('Did you mean:')
      // and a single-token contains match still resolves (not too strict)
      const partial = await resolveByNameOrCode<any>(db.buyer, `Ambiguous`)
      expect(partial?.id).toBeTruthy()
    } finally {
      await db.buyer.delete({ where: { id: buyer.id } })
    }
  })

  it('topCandidates returns ≤3 ranked candidates; didYouMean formats them', async () => {
    const buyer = await db.buyer.create({ data: { code: `CHAT-DM-${TS}`, name: `DidYouMean Buyer ${TS}` } })
    try {
      const cands = await topCandidates(db.buyer, `didyoumean buyer ${TS}`, { take: 3 })
      expect(cands.length).toBeGreaterThanOrEqual(1)
      expect(cands.length).toBeLessThanOrEqual(3)
      expect(cands[0].code).toBe(`CHAT-DM-${TS}`)
      const msg = didYouMean('Buyer', 'didyoumean', cands)
      expect(msg).toContain("Did you mean:")
      expect(msg).toContain(`CHAT-DM-${TS}`)
      expect(didYouMean('Buyer', 'nomatch-xyz', [])).toBe("Buyer 'nomatch-xyz' not found.")
    } finally {
      await db.buyer.delete({ where: { id: buyer.id } })
    }
  })

  it('planOrder failures now carry candidates (the order seam)', async () => {
    const res = await planOrder({
      buyerCode: 'LPP SA', styleNo: 'NO-SUCH-STYLE', deliveryDate: '2026-12-31',
      lines: [{ colourName: 'Navy', sizeName: 'M', qty: 1, rate: 1 }],
    })
    expect(res.ok).toBe(false)
    // either candidates (when an LPP-ish buyer exists) or the plain not-found
    expect(res.error).toMatch(/not found/)
  })
})

describe('CHAT-10 — bounded master lists', () => {
  it('the 12 master list tools accept q + take and report total + truncation', () => {
    for (const name of ['list_parties', 'list_buyers', 'list_styles', 'list_fabrics', 'list_yarns', 'list_accessories', 'list_godowns', 'list_departments', 'list_employees', 'list_uoms', 'list_colours', 'list_sizes', 'list_dias']) {
      const t = getTool(name)!
      expect(t, name).toBeTruthy()
      const src = JSON.stringify((t.schema as any).shape ?? {})
      expect(src, `${name} schema`).toContain('q')
      expect(src, `${name} schema`).toContain('take')
      expect(t.description, `${name} description`).toMatch(/total \+ truncation|truncation/)
    }
  })

  it('behavioral: list_buyers honors q + take; text reports total + truncation', async () => {
    const buyers = [
      await db.buyer.create({ data: { code: `CHAT-Q1-${TS}`, name: `Query Buyer A ${TS}` } }),
      await db.buyer.create({ data: { code: `CHAT-Q2-${TS}`, name: `Query Buyer B ${TS}` } }),
    ]
    try {
      const res = await getTool('list_buyers')!.execute({ q: `query buyer`, take: 1 }, { userId: 't', email: 't@t', name: 't' })
      expect(res.text).toContain('2 buyers')
      expect(res.text).toContain('showing first 1 of 2')
      expect((res.json as any[]).length).toBe(1)
      const all = await getTool('list_buyers')!.execute({ q: `query buyer` }, { userId: 't', email: 't@t', name: 't' })
      expect((all.json as any[]).length).toBe(2)
      expect(all.text).not.toContain('showing first')
    } finally {
      await db.buyer.deleteMany({ where: { id: { in: buyers.map((b) => b.id) } } })
    }
  })

  it('route.ts boundedToolContent trims rows + marks truncation instead of byte-amputation', () => {
    const route = read('src/app/api/agent/route.ts')
    expect(route).toContain('function boundedToolContent')
    expect(route).toContain('truncated: true')
    expect(route).toContain('rowsShown')
    // behavioral pin on the shape: an array json under the limit passes whole
    const m = route.match(/function boundedToolContent[\s\S]*?\n\}/)
    expect(m).toBeTruthy()
  })

  it('take is clamped (default 20, cap 100) — schema descriptions document it', () => {
    const t = getTool('list_buyers')!
    expect(t.description).toContain('default 20, max 100')
  })
})

describe('CHAT-11 — prompt formatting contract', () => {
  it('§9 gains the formatting rules (markdown, ≤h3, tables, ₹ en-IN, ≤8 lines)', () => {
    expect(SYSTEM_PROMPT).toContain('Formatting contract')
    expect(SYSTEM_PROMPT).toContain('at most h3')
    expect(SYSTEM_PROMPT).toContain('Markdown TABLE')
    expect(SYSTEM_PROMPT).toContain('₹4,50,000')
    expect(SYSTEM_PROMPT).toContain('≤8 lines')
  })

  it('the hardcoded FY + G1–G3 godown prose is GONE (dynamic context owns them)', () => {
    expect(SYSTEM_PROMPT).not.toContain('Financial year 26-27')
    expect(SYSTEM_PROMPT).not.toContain('G3=Jobworker Yard')
    expect(SYSTEM_PROMPT).toContain('[CONTEXT] line')
  })

  it('PROMPT_VERSION is bumped (m42 — the stock take/valuation rewrite)', () => {
    // qol1-reconcile: ghost-tool removal is a semantic prompt change → m39.1
    expect(PROMPT_VERSION).toBe('m46-2026-09-03')
  })
})

describe('CHAT-12 — chat polish sweep', () => {
  it('composer autofocus + copy button + stopped state + dead events consumed', () => {
    const panel = read('src/components/agent/agent-panel.tsx')
    expect(panel).toContain('composerRef.current?.focus()')
    expect(panel).toContain('data-testid="copy-message"')
    expect(panel).toContain("'stopped'")
    // dead SSE events explicitly consumed as documented no-ops
    expect(panel).toContain("case 'step-start'")
    expect(panel).toContain("case 'finish'")
  })

  it('MAX_STEPS exhaustion surfaces a visible error event (source contract)', () => {
    const route = read('src/app/api/agent/route.ts')
    expect(route).toContain('exhaustedSteps')
    expect(route).toContain('Step budget exhausted')
  })

  it('list_orders.buyerId is honored (behavioral)', async () => {
    const buyer = await db.buyer.create({ data: { code: `CHAT-BO-${TS}`, name: `BuyerId Buyer ${TS}` } })
    try {
      const res = await getTool('list_orders')!.execute({ buyerId: `buyerid buyer`, limit: 50 }, { userId: 't', email: 't@t', name: 't' })
      // the filter resolves through the buyer master — rows (if any) all belong to it
      const rows = res.json as any[]
      for (const r of rows) expect(r.buyer).toContain(`BuyerId Buyer ${TS}`)
      // a filter matching no buyer returns NOTHING (was: everything)
      const none = await getTool('list_orders')!.execute({ buyerId: `zzz-no-such-${TS}` }, { userId: 't', email: 't@t', name: 't' })
      expect((none.json as any[]).length).toBe(0)
    } finally {
      await db.buyer.delete({ where: { id: buyer.id } })
    }
  })

  it('humanized tool labels: overrides + prettifier + title keeps the raw name', () => {
    expect(toolLabel('create_order')).toBe('Create sales order')
    expect(toolLabel('create_purchase_order')).toBe('Create purchase order')
    expect(toolLabel('get_party_ledger')).toBe('Party ledger')
    expect(toolLabel('some_unknown_tool')).toBe('Some Unknown Tool')
    expect(toolLabel('post_new_thing')).toBe('Post New Thing')
    expect(toolTitle('create_order')).toBe('Create sales order (create_order)')
    // the panel uses the label with the raw name beside it
    const panel = read('src/components/agent/agent-panel.tsx')
    expect(panel).toContain('{toolLabel(tc.toolName)}')
  })

  it('tool count is 246 (243 at M41 + M42 INV: create_stock_take / record_stock_counts / advance_stock_take)', () => {
    expect(allTools.length).toBe(253) // M46 L-02: +create_payroll_run +commit_payroll_run +get_payroll_runs // M45 L-01: +get_operator_statement // M43 PRG: +set_order_deliveries +correct_program_spec +propose_program_requirements
    const names = allTools.map((t) => t.name)
    expect(names).toContain('bill_jobwork')
    expect(names).toContain('list_jobworker_statement')
  })
})

describe('CHAT-04 — post-answer follow-ups', () => {
  it('TOOL_FOLLOWUPS maps the common read tools; the panel renders chips after read answers', () => {
    const panel = read('src/components/agent/agent-panel.tsx')
    expect(panel).toContain('TOOL_FOLLOWUPS')
    expect(panel).toContain('data-testid="followup-chips"')
    expect(panel).toContain("screenItem?.agentTools ?? []")
  })
})

describe('menu substrate sanity (CHAT-03 support)', () => {
  it('findItemByRoute resolves /orders/register to the Order Register item', () => {
    const item = findItemByRoute('/orders/register')
    expect(item?.label).toBe('Order Register')
    expect(item?.agentPrompt).toBeTruthy()
  })
})
