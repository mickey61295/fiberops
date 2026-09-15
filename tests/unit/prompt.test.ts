import { describe, it, expect } from 'vitest'
import { PROMPT_VERSION, SYSTEM_PROMPT } from '@/lib/agent/prompt'
import { allTools } from '@/lib/agent/tools'

/* SPEC-M10 §2-C5 — the versioned prompt contract.
 *
 * These pins exist so that ANY future prompt edit is a conscious, versioned
 * act: if a change breaks one of these assertions, bump PROMPT_VERSION and
 * run the full routing eval (node scripts/eval_routing.mjs). */

const DOMAIN_MAP_HEADERS = [
  'Orders', 'Procurement', 'Inventory & stock', 'Cutting', 'Production',
  'Jobwork', 'Despatch', 'Accounting', 'Costing', 'Quality', 'HR & wages',
  'Masters', 'Workflow & approvals', 'Documents & ingestion',
  'Reports & registers', 'Meta & live pulse',
]

describe('SPEC-M10 — the versioned agent system prompt', () => {
  it('PROMPT_VERSION follows the m<milestone>.<rev>-YYYY-MM-DD scheme', () => {
    expect(PROMPT_VERSION).toMatch(/^m\d{2}(\.\d+)?-\d{4}-\d{2}-\d{2}$/)
  })

  it('the domain map covers all 16 domains (§2-C1)', () => {
    for (const h of DOMAIN_MAP_HEADERS) {
      expect(SYSTEM_PROMPT).toContain(`**${h}**`)
    }
    // the map section itself exists between the section markers
    expect(SYSTEM_PROMPT).toContain('## 1. Domain map')
  })

  it('carries ≥ 8 few-shot routing examples (§2-C1, capped by rule)', () => {
    const section = SYSTEM_PROMPT.split('## 3. Routing few-shots')[1]?.split('## 4.')[0] ?? ''
    const shots = section.match(/^\d+\..*→.*$/gm) ?? []
    expect(shots.length).toBeGreaterThanOrEqual(8)
    expect(shots.length).toBeLessThanOrEqual(8) // SPEC-M10 §3: hard cap 8
  })

  it('the four known confusion pairs each name BOTH tools', () => {
    // pair A: buyer PO vs supplier PO
    expect(SYSTEM_PROMPT).toContain('create_order')
    expect(SYSTEM_PROMPT).toContain('create_purchase_order')
    // pair B: GRN receive vs accept
    expect(SYSTEM_PROMPT).toContain('receive_grn')
    expect(SYSTEM_PROMPT).toContain('accept_grn')
    // pair C: payment vs journal
    expect(SYSTEM_PROMPT).toContain('record_payment')
    expect(SYSTEM_PROMPT).toContain('create_journal')
    // pair D: godown transfer vs despatch out
    expect(SYSTEM_PROMPT).toContain('transfer_stock')
    expect(SYSTEM_PROMPT).toContain('create_pcs_despatch')
  })

  it('preserves the ingestion protocol (two-phase + direction rule)', () => {
    expect(SYSTEM_PROMPT).toContain('PHASE 1')
    expect(SYSTEM_PROMPT).toContain('PHASE 2')
    expect(SYSTEM_PROMPT).toContain('DIRECTION RULE')
  })

  it('preserves the 15-stage chain + next-step guidance', () => {
    expect(SYSTEM_PROMPT).toContain('15 canonical stages')
    expect(SYSTEM_PROMPT).toContain('suggest_next_step')
    expect(SYSTEM_PROMPT).toContain('Payment collection')
    // the canonical stage numbering must reach 15
    expect(SYSTEM_PROMPT).toContain('15. **Payment collection**')
  })

  it('preserves the number auto-assignment rule', () => {
    expect(SYSTEM_PROMPT).toContain('DO NOT pass the code/number field')
  })

  it('preserves the never-say-use-the-UI rule (the M2 regression guard)', () => {
    const lower = SYSTEM_PROMPT.toLowerCase()
    expect(lower).toContain('never tell them "this can\'t be done through chat"')
    expect(lower).toContain('use the erp ui directly')
  })
})

describe('SPEC-M10 §2-C3 — tool description floor', () => {
  it('every registered tool description is concrete (≥ 40 chars)', () => {
    expect(allTools.length).toBe(275) // M47 MERGE: 253 (M44 CST +create/update/list_cost_component +get_order_cost) + M45 L-01 +get_operator_statement + M46 L-02 +create/commit_payroll_run +get_payroll_runs + M48 L-03 +get_statutory_register
    const short = allTools.filter((t) => t.description.length < 40)
    expect(short.map((t) => `${t.name} (${t.description.length})`)).toEqual([])
  })

  it('the audited list tools gained routing cues (spot pins)', () => {
    const buyers = allTools.find((t) => t.name === 'list_buyers')!
    expect(buyers.description).toContain('resolve a buyer name to its code')
    const ledger = allTools.find((t) => t.name === 'get_party_ledger')!
    expect(ledger.description).toContain('PRT-####')
  })
})

describe('SPEC-M61 E-2 — the capability protocol and prompt/description contract', () => {
  it('E-2.1: the never-claim-absence rule is pinned verbatim (safety rule 5)', () => {
    expect(SYSTEM_PROMPT).toContain(
      '**Never tell the operator that a capability does not exist.**',
    )
    expect(SYSTEM_PROMPT).toContain(
      'A plan costs nothing until approved, so proposing is always safer than refusing',
    )
    expect(SYSTEM_PROMPT).toContain(
      'If a capability is genuinely absent (e.g. delete), say so in one sentence and offer the nearest real alternative — never pretend the action was performed.',
    )
  })

  it('E-2.1: honest plan failures rule 6 (taken codes / duplicate warnings relayed plainly)', () => {
    expect(SYSTEM_PROMPT).toContain('**Plans are drafts, and drafts can fail honestly.**')
    expect(SYSTEM_PROMPT).toContain('Never silently work around a refusal.')
  })

  it('E-2.4(a): no create_* description anywhere says "or taken"', () => {
    for (const t of allTools) {
      expect(t.description.includes('or taken'), `${t.name} still says "or taken"`).toBe(false)
    }
  })

  it('E-2.4(b): every master updateTool appears in the registry AND the prompt names the family', () => {
    // the prompt's masters enumeration (§1 Masters) carries the generic
    // create/update/list sentence; every config's tools resolve in-register
    expect(SYSTEM_PROMPT).toContain(
      'Masters** — every create_<entity> / update_<entity> / list_<entity> tool',
    )
    expect(SYSTEM_PROMPT).toContain('UPDATING any existing master via its update_<entity> tool')
    // registry resolution for the incident entity's full family
    for (const name of ['create_buyer', 'update_buyer', 'list_buyers']) {
      expect(allTools.find((t) => t.name === name), name).toBeTruthy()
    }
  })

  it('E-2.6: PROMPT_VERSION moved to the m61 line', () => {
    expect(PROMPT_VERSION).toMatch(/^m61(\.\d+)?-/)
  })

  it('E-2.1 (H2): rule 5 now names list_tools — the check-before-claiming door', () => {
    expect(SYSTEM_PROMPT).toContain(
      'if you cannot see a tool, call list_tools before answering',
    )
  })

  it('E-2.2 (H2): the bulk rule is pinned verbatim (heuristic 8)', () => {
    expect(SYSTEM_PROMPT).toContain(
      '"For each", "all", "every" are ONE instruction: batch the independent calls in a single step, then summarize them as one packet awaiting approval.',
    )
  })

  it('E-2.3 (H2): the honesty rule is pinned (absence is not proof)', () => {
    expect(SYSTEM_PROMPT).toContain(
      'Absence of a tool in your current list is not proof it does not exist — check before claiming',
    )
  })

  it('E-2.6 (H2): the version carries the H2 rev', () => {
    expect(PROMPT_VERSION).toBe('m61.2-2026-09-15')
  })
})
